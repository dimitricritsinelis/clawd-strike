import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  compositionWaiverId,
  compositionWaiverSignature,
  normalizeCompositionWaiverRegistry,
} from "./composition-waivers.mjs";

function seal(waivers) {
  const legacy = waivers
    .filter((entry) => entry.approval.status === "legacy-migrated")
    .sort((left, right) => left.signature.localeCompare(right.signature));
  return {
    schemaVersion: 1,
    legacyMigration: {
      id: "test-migration",
      closed: true,
      recordCount: legacy.length,
      recordsSha256: createHash("sha256").update(JSON.stringify(legacy)).digest("hex"),
    },
    waivers,
  };
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

test("the sealed legacy registry contains exactly the migrated 28 conflicts", async () => {
  const raw = JSON.parse(await readFile(
    new URL("../../../../docs/map-design/specs/composition_waivers.json", import.meta.url),
    "utf8",
  ));
  const registry = normalizeCompositionWaiverRegistry(raw);
  assert.equal(registry.waivers.length, 28);
  assert.equal(
    registry.waivers.every((waiver) => waiver.approval.status === "legacy-migrated"),
    true,
  );
  assert.equal(registry.byKind["canopy-opening"].length, 4);
  assert.equal(registry.byKind["opening-service"].length, 4);
  assert.equal(registry.byKind["decoration-opening"].length, 3);
  assert.equal(registry.byKind.fenestration.length, 13);
  assert.equal(registry.byKind["wall-budget"].length, 3);
  assert.equal(registry.byKind["hard-overlap"].length, 1);
});

test("new waivers require an exact signature plus approver and ticket", () => {
  const waiver = approvedWaiver();
  const registry = normalizeCompositionWaiverRegistry(seal([waiver]));
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
    () => normalizeCompositionWaiverRegistry(seal([approvedWaiver({
      signature: "opening-service|placementId=WRONG|openingId=OPENING_TEST",
    })])),
    /signature must exactly match/,
  );
  assert.throws(
    () => normalizeCompositionWaiverRegistry(seal([approvedWaiver({
      approval: { status: "approved", approver: "", ticket: "MAP-123" },
    })])),
    /approver must be a non-empty string/,
  );
  assert.throws(
    () => normalizeCompositionWaiverRegistry(seal([approvedWaiver({
      id: "CW-111111111111",
    })])),
    /deterministic signature id/,
  );
});

test("expired waivers fail closed while a waiver remains valid through its expiry date", () => {
  const waiver = approvedWaiver({ expiresOn: "2026-08-01" });
  assert.equal(
    normalizeCompositionWaiverRegistry(seal([waiver]), { today: "2026-08-01" })
      .waivers[0].expiresOn,
    "2026-08-01",
  );
  assert.throws(
    () => normalizeCompositionWaiverRegistry(seal([waiver]), { today: "2026-08-02" }),
    /has expired/,
  );
  assert.throws(
    () => normalizeCompositionWaiverRegistry(
      seal([approvedWaiver({ expiresOn: "2026-02-30" })]),
      { today: "2026-01-01" },
    ),
    /real calendar date/,
  );
});

test("the one-time legacy migration seal rejects changed or newly resealed legacy records", () => {
  const raw = seal([{
    ...approvedWaiver(),
    approval: { status: "legacy-migrated", legacyRef: "L3.7" },
  }]);
  assert.throws(
    () => normalizeCompositionWaiverRegistry(raw),
    /immutable 28-record migration seal/,
  );
});

test("duplicate exact conflict signatures are rejected", () => {
  const first = approvedWaiver();
  const second = { ...approvedWaiver() };
  assert.throws(
    () => normalizeCompositionWaiverRegistry(seal([first, second])),
    /duplicate waiver id/,
  );
});
