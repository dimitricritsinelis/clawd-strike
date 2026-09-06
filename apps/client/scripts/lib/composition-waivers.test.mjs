import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  compositionWaiverId,
  compositionWaiverSignature,
  normalizeCompositionWaiverRegistry,
} from "./composition-waivers.mjs";
import { validateMapSpecAgainstSchema } from "../gen-map-runtime.mjs";

function registryDocument(waivers) {
  return {
    schemaVersion: 1,
    waivers,
  };
}

function normalizeTestRegistry(document, options = {}) {
  return normalizeCompositionWaiverRegistry(document, {
    allowLegacySubset: true,
    ...options,
  });
}

function reverseObjectKeyOrder(value) {
  if (Array.isArray(value)) return value.map((entry) => reverseObjectKeyOrder(entry));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, entry]) => [key, reverseObjectKeyOrder(entry)]),
  );
}

function approvedWaiver(overrides = {}) {
  const kind = "opening-service";
  const match = {
    placementId: "PLACE_TEST",
    openingId: "OPENING_TEST",
  };
  const signature = compositionWaiverSignature(kind, match);
  return {
    id: compositionWaiverId(signature),
    kind,
    signature,
    match,
    reasonCode: "measured-conflict",
    rationale: "Approved exact test conflict.",
    approval: {
      status: "approved",
      approver: "map-owner",
      ticket: "MAP-123",
    },
    ...overrides,
  };
}

test("authoritative legacy ids exactly match the allowlist while isolated subsets remain testable", async () => {
  const raw = JSON.parse(await readFile(
    new URL("../../../../docs/map-design/specs/composition_waivers.json", import.meta.url),
    "utf8",
  ));
  const registry = normalizeCompositionWaiverRegistry(raw);
  assert.ok(registry.waivers.length > 0);
  assert.equal(registry.waivers.every((waiver) => waiver.approval.status === "legacy-migrated"), true);
  assert.throws(
    () => normalizeCompositionWaiverRegistry({
      ...raw,
      waivers: raw.waivers.slice(1),
    }),
    /authoritative legacy waiver ids must exactly match the retained allowlist/,
  );
  const reduced = normalizeTestRegistry({
    ...raw,
    waivers: raw.waivers.slice(1),
  });
  assert.equal(reduced.waivers.length, registry.waivers.length - 1);
  assert.equal(normalizeTestRegistry({ ...raw, waivers: [] }).waivers.length, 0);
});

test("legacy-migrated waivers must remain exact members of the closed migration", async () => {
  const raw = JSON.parse(await readFile(
    new URL("../../../../docs/map-design/specs/composition_waivers.json", import.meta.url),
    "utf8",
  ));
  const [legacyWaiver] = raw.waivers;

  assert.throws(
    () => normalizeTestRegistry(registryDocument([{
      ...legacyWaiver,
      rationale: `${legacyWaiver.rationale} Mutated after migration.`,
    }])),
    /immutable retained legacy waiver/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([{
      ...legacyWaiver,
      approval: { ...legacyWaiver.approval, legacyRef: "ARBITRARY-REF" },
    }])),
    /immutable retained legacy waiver/,
  );
});

test("normalizer and schema reject ignored or cross-shape fields", async () => {
  const raw = JSON.parse(await readFile(
    new URL("../../../../docs/map-design/specs/composition_waivers.json", import.meta.url),
    "utf8",
  ));
  const schema = JSON.parse(await readFile(
    new URL("../../../../docs/map-design/specs/composition_waivers.schema.json", import.meta.url),
    "utf8",
  ));
  const canopy = raw.waivers.find((waiver) => waiver.kind === "canopy-opening");
  assert.ok(canopy);

  const crossShapeMatch = structuredClone(raw);
  const crossShapeCanopy = crossShapeMatch.waivers.find((waiver) => waiver.id === canopy.id);
  assert.ok(crossShapeCanopy);
  crossShapeCanopy.match.placementId = "IGNORED_BUT_SCHEMA_KNOWN";
  assert.throws(
    () => normalizeTestRegistry(crossShapeMatch),
    /match has unsupported fields: placementId/,
  );
  assert.throws(
    () => validateMapSpecAgainstSchema(crossShapeMatch, schema),
    /expected exactly one schema variant|placementId: additional property is not allowed/,
  );

  const rootExtra = { ...raw, unexpected: true };
  assert.throws(
    () => normalizeTestRegistry(rootExtra),
    /registry has unsupported fields: unexpected/,
  );

  const waiverExtra = structuredClone(raw);
  waiverExtra.waivers[0].unexpected = true;
  assert.throws(
    () => normalizeTestRegistry(waiverExtra),
    /waivers\[0\] has unsupported fields: unexpected/,
  );
});

test("legacy hashes use canonical object-key order", async () => {
  const raw = JSON.parse(await readFile(
    new URL("../../../../docs/map-design/specs/composition_waivers.json", import.meta.url),
    "utf8",
  ));
  const reordered = {
    schemaVersion: 1,
    waivers: raw.waivers.map((waiver) => reverseObjectKeyOrder(waiver)),
  };
  assert.deepEqual(
    normalizeCompositionWaiverRegistry(reordered),
    normalizeCompositionWaiverRegistry(raw),
  );
});

test("new waivers require an exact signature plus approver and ticket", () => {
  const waiver = approvedWaiver();
  const registry = normalizeTestRegistry(registryDocument([waiver]));
  assert.deepEqual(registry.byKind["opening-service"], [{
    placementId: "PLACE_TEST",
    openingId: "OPENING_TEST",
    waiver: {
      waiverId: waiver.id,
      reasonCode: waiver.reasonCode,
      approvalStatus: "approved",
      approver: "map-owner",
      ticket: "MAP-123",
    },
  }]);

  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      signature: "opening-service|placementId=WRONG|openingId=OPENING_TEST",
    })])),
    /signature must exactly match/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      approval: { status: "approved", approver: "", ticket: "MAP-123" },
    })])),
    /approver must be a non-empty string/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      approval: { status: "approved", approver: "map-owner", ticket: "" },
    })])),
    /ticket must be a non-empty string/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      id: "CW-111111111111",
    })])),
    /deterministic signature id/,
  );
});

test("arbitrary legacy references and statuses cannot bypass approval evidence", () => {
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      approval: { status: "legacy-migrated", legacyRef: "ARBITRARY-REF" },
    })])),
    /new or changed waivers require 'approved' status with an approver and ticket/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      approval: { status: "approved", legacyRef: "ARBITRARY-REF" },
    })])),
    /approver must be a non-empty string/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      approval: { status: "self-approved", legacyRef: "ARBITRARY-REF" },
    })])),
    /status must be 'legacy-migrated' or 'approved'/,
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([approvedWaiver({
      approval: {
        status: "approved",
        approver: "map-owner",
        ticket: "MAP-123",
        legacyRef: "ARBITRARY-REF",
      },
    })])),
    /for 'approved' has unsupported fields: legacyRef/,
  );
});

test("expired waivers fail closed while a waiver remains valid through its expiry date", () => {
  const waiver = approvedWaiver({ expiresOn: "2026-08-01" });
  assert.equal(
    normalizeTestRegistry(registryDocument([waiver]), { today: "2026-08-01" })
      .waivers[0].expiresOn,
    "2026-08-01",
  );
  assert.throws(
    () => normalizeTestRegistry(registryDocument([waiver]), { today: "2026-08-02" }),
    /has expired/,
  );
  assert.throws(
    () => normalizeTestRegistry(
      registryDocument([approvedWaiver({ expiresOn: "2026-02-30" })]),
      { today: "2026-01-01" },
    ),
    /real calendar date/,
  );
});

test("duplicate exact conflict signatures are rejected", () => {
  const first = approvedWaiver();
  const second = { ...approvedWaiver() };
  assert.throws(
    () => normalizeTestRegistry(registryDocument([first, second])),
    /duplicate waiver id/,
  );
});
