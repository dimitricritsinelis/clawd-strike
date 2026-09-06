import { createHash } from "node:crypto";

const WAIVER_KINDS = new Set([
  "canopy-opening",
  "decoration-opening",
  "fixture-axis",
  "fixture-buffer",
  "hard-overlap",
  "opening-service",
]);
const LEGACY_STATUS = "legacy-migrated";
const APPROVED_STATUS = "approved";

// The one-time migration is closed. Keep this per-record allowlist in exact
// lockstep with the authoritative registry, deleting both entries together as
// conflicts are resolved. A per-record hash lets isolated tests exercise a
// subset without letting production authority omit and later resurrect a
// retained waiver.
const RETAINABLE_LEGACY_WAIVER_HASHES = Object.freeze({
  "CW-CCAEF9D05D21": "b96f5f6f38826042ba728b38e04d7285f5b13bedd58a93580558c31d19171790",
  "CW-1AD31D32494E": "e2ad749745f025baa9b822b26418170b1380b8b02302747ec98cc9a8ef4bdc2f",
  "CW-D82E53BBDABD": "17e9988869943604dd475e620fd30189174761dce5b3d8956477369f0d45681f",
  "CW-D8602E151B6B": "e821797bdd6a3c9510f05ef92287e608a8cd8ec7d7b3d9a6e2a04624f11cb40a",
  "CW-7599CB836F04": "68a4798495c507c9fc4f044b04261c1a8efdf59690c85e807ff38766e801b5c3",
  "CW-13333D7BED23": "e4b4002c353ae1adc2ac3ca886c6105e0df58b2db9c299a6abaf456470417278",
  "CW-A0FABA3DAE26": "88de4cebc06a8413320d64468b3f105d54d8a93b902ecdb595231a33f1f4858f",
  "CW-216C7CBF937B": "80a17b75aef5575a40605ba050af4bb032de3569b484bc326951bc5870c13ab1",
  "CW-F70D65F7D790": "6d2a404ef5f2b992405c8b127acc6bd6ca464303424c2ab09a02bde03199a12d",
});

function fail(message) {
  throw new Error(`[composition-waivers] ${message}`);
}

function rejectUnexpectedKeys(raw, allowedKeys, label) {
  const unexpectedKeys = Object.keys(raw).filter((key) => !allowedKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    fail(`${label} has unsupported fields: ${unexpectedKeys.sort().join(", ")}`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireStringList(value, label) {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some((entry) => typeof entry !== "string" || entry.length === 0)
    || new Set(value).size !== value.length
  ) {
    fail(`${label} must contain unique non-empty strings`);
  }
  return [...value].sort();
}

function requireIsoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label} must use YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} must be a real calendar date`);
  }
  return value;
}

function normalizeMatch(kind, raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(`${label} must be an object`);
  }
  switch (kind) {
    case "canopy-opening":
      rejectUnexpectedKeys(raw, ["anchorId", "openingIds"], label);
      return {
        anchorId: requireString(raw.anchorId, `${label}.anchorId`),
        openingIds: requireStringList(raw.openingIds, `${label}.openingIds`),
      };
    case "hard-overlap":
    case "fixture-buffer": {
      rejectUnexpectedKeys(raw, ["placementIds"], label);
      const placementIds = requireStringList(raw.placementIds, `${label}.placementIds`);
      if (placementIds.length !== 2) fail(`${label}.placementIds must contain exactly two ids`);
      return { placementIds };
    }
    case "opening-service":
    case "decoration-opening":
    case "fixture-axis":
      rejectUnexpectedKeys(raw, ["placementId", "openingId"], label);
      return {
        placementId: requireString(raw.placementId, `${label}.placementId`),
        openingId: requireString(raw.openingId, `${label}.openingId`),
      };
    default:
      fail(`${label} has unsupported kind '${kind}'`);
  }
}

export function compositionWaiverSignature(kind, match) {
  return `${kind}|${Object.entries(match)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`)
    .join("|")}`;
}

export function compositionWaiverId(signature) {
  return `CW-${createHash("sha256").update(signature).digest("hex").slice(0, 12).toUpperCase()}`;
}

function normalizeApproval(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(`${label} must be an object`);
  }
  const status = requireString(raw.status, `${label}.status`);
  if (status === LEGACY_STATUS) {
    rejectUnexpectedKeys(raw, ["status", "legacyRef"], `${label} for '${LEGACY_STATUS}'`);
    return {
      status,
      legacyRef: requireString(raw.legacyRef, `${label}.legacyRef`),
    };
  }
  if (status === APPROVED_STATUS) {
    const approval = {
      status,
      approver: requireString(raw.approver, `${label}.approver`),
      ticket: requireString(raw.ticket, `${label}.ticket`),
    };
    rejectUnexpectedKeys(raw, ["status", "approver", "ticket"], `${label} for '${APPROVED_STATUS}'`);
    return approval;
  }
  fail(`${label}.status must be '${LEGACY_STATUS}' or '${APPROVED_STATUS}'`);
}

/**
 * RFC-8785-style property ordering for the JSON-shaped waiver projection.
 * Objects are recursively key-sorted; arrays retain their semantic order
 * (set-like match arrays are sorted during normalization). This makes hashes
 * independent of source key order and object-construction refactors.
 */
function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string") fail("legacy waiver hash contains a non-JSON value");
    return serialized;
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function assertRetainableLegacyWaiver(waiver, label) {
  const expectedHash = RETAINABLE_LEGACY_WAIVER_HASHES[waiver.id];
  const actualHash = createHash("sha256").update(canonicalJson(waiver)).digest("hex");
  if (!expectedHash || actualHash !== expectedHash) {
    fail(
      `${label} must match an immutable retained legacy waiver; new or changed waivers require `
      + `'${APPROVED_STATUS}' status with an approver and ticket`,
    );
  }
}

function waiverEvidence(waiver) {
  return {
    waiverId: waiver.id,
    reasonCode: waiver.reasonCode,
    approvalStatus: waiver.approval.status,
    ...(waiver.approval.legacyRef ? { legacyRef: waiver.approval.legacyRef } : {}),
    ...(waiver.approval.approver ? { approver: waiver.approval.approver } : {}),
    ...(waiver.approval.ticket ? { ticket: waiver.approval.ticket } : {}),
    ...(waiver.expiresOn ? { expiresOn: waiver.expiresOn } : {}),
  };
}

export function normalizeCompositionWaiverRegistry(raw, options = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("registry must be an object");
  }
  rejectUnexpectedKeys(raw, ["schemaVersion", "waivers"], "registry");
  if (raw.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (!Array.isArray(raw.waivers)) fail("waivers must be an array");
  const today = requireIsoDate(
    options.today ?? new Date().toISOString().slice(0, 10),
    "options.today",
  );

  const ids = new Set();
  const signatures = new Set();
  const waivers = raw.waivers.map((entry, index) => {
    const label = `waivers[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`${label} must be an object`);
    }
    rejectUnexpectedKeys(
      entry,
      ["id", "kind", "signature", "match", "reasonCode", "rationale", "approval", "expiresOn"],
      label,
    );
    const id = requireString(entry.id, `${label}.id`);
    if (!/^CW-[A-F0-9]{12}$/.test(id)) fail(`${label}.id must match CW-XXXXXXXXXXXX`);
    if (ids.has(id)) fail(`duplicate waiver id '${id}'`);
    ids.add(id);

    const kind = requireString(entry.kind, `${label}.kind`);
    if (!WAIVER_KINDS.has(kind)) fail(`${label}.kind '${kind}' is unsupported`);
    const match = normalizeMatch(kind, entry.match, `${label}.match`);
    const signature = compositionWaiverSignature(kind, match);
    if (entry.signature !== signature) {
      fail(`${label}.signature must exactly match '${signature}'`);
    }
    const expectedId = compositionWaiverId(signature);
    if (id !== expectedId) {
      fail(`${label}.id must be the deterministic signature id '${expectedId}'`);
    }
    if (signatures.has(signature)) fail(`duplicate waiver signature '${signature}'`);
    signatures.add(signature);

    const expiresOn = entry.expiresOn;
    if (typeof expiresOn !== "undefined") requireIsoDate(expiresOn, `${label}.expiresOn`);
    if (expiresOn && expiresOn < today) {
      fail(`${label}.expiresOn '${expiresOn}' has expired (today '${today}')`);
    }
    const waiver = {
      id,
      kind,
      signature,
      match,
      reasonCode: requireString(entry.reasonCode, `${label}.reasonCode`),
      rationale: requireString(entry.rationale, `${label}.rationale`),
      approval: normalizeApproval(entry.approval, `${label}.approval`),
      ...(expiresOn ? { expiresOn } : {}),
    };
    if (waiver.approval.status === LEGACY_STATUS) {
      assertRetainableLegacyWaiver(waiver, label);
    }
    return waiver;
  }).sort((left, right) => left.signature.localeCompare(right.signature));

  // Isolated unit fixtures may opt into a subset explicitly. Authoritative
  // generators use the default and therefore cannot leave dormant hashes that
  // would permit a resolved waiver to be resurrected later.
  if (options.allowLegacySubset !== true) {
    const authoritativeLegacyIds = waivers
      .filter((waiver) => waiver.approval.status === LEGACY_STATUS)
      .map((waiver) => waiver.id)
      .sort();
    const retainedLegacyIds = Object.keys(RETAINABLE_LEGACY_WAIVER_HASHES).sort();
    const idsMatch = authoritativeLegacyIds.length === retainedLegacyIds.length
      && authoritativeLegacyIds.every((id, index) => id === retainedLegacyIds[index]);
    if (!idsMatch) {
      const missing = retainedLegacyIds.filter((id) => !authoritativeLegacyIds.includes(id));
      const unexpected = authoritativeLegacyIds.filter((id) => !retainedLegacyIds.includes(id));
      fail(
        "authoritative legacy waiver ids must exactly match the retained allowlist"
        + `${missing.length > 0 ? `; missing: ${missing.join(", ")}` : ""}`
        + `${unexpected.length > 0 ? `; unexpected: ${unexpected.join(", ")}` : ""}`,
      );
    }
  }

  const byKind = Object.fromEntries([...WAIVER_KINDS].map((kind) => [kind, []]));
  for (const waiver of waivers) {
    byKind[waiver.kind].push({
      ...waiver.match,
      waiver: waiverEvidence(waiver),
    });
  }
  return {
    schemaVersion: 1,
    waivers,
    byKind,
  };
}

export function emptyCompositionWaiverRegistry() {
  return {
    schemaVersion: 1,
    waivers: [],
    byKind: Object.fromEntries([...WAIVER_KINDS].map((kind) => [kind, []])),
  };
}
