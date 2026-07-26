import { createHash } from "node:crypto";

const WAIVER_KINDS = new Set([
  "canopy-opening",
  "decoration-opening",
  "fenestration",
  "fixture-axis",
  "fixture-buffer",
  "hard-overlap",
  "opening-service",
  "wall-budget",
]);
const LEGACY_STATUS = "legacy-migrated";
const APPROVED_STATUS = "approved";
const SEALED_LEGACY_MIGRATION = Object.freeze({
  id: "visual-overhaul-roadmap-archive-2026-07-25",
  recordCount: 28,
  recordsSha256: "6d9301a5598ff678dadfebdb238b68f38615b8939573ef44189fd48ea8716edd",
});

function fail(message) {
  throw new Error(`[composition-waivers] ${message}`);
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
      return {
        anchorId: requireString(raw.anchorId, `${label}.anchorId`),
        openingIds: requireStringList(raw.openingIds, `${label}.openingIds`),
      };
    case "hard-overlap":
    case "fixture-buffer": {
      const placementIds = requireStringList(raw.placementIds, `${label}.placementIds`);
      if (placementIds.length !== 2) fail(`${label}.placementIds must contain exactly two ids`);
      return { placementIds };
    }
    case "opening-service":
    case "decoration-opening":
    case "fixture-axis":
      return {
        placementId: requireString(raw.placementId, `${label}.placementId`),
        openingId: requireString(raw.openingId, `${label}.openingId`),
      };
    case "fenestration":
    case "wall-budget":
      return {
        frontageId: requireString(raw.frontageId, `${label}.frontageId`),
        violationIds: requireStringList(raw.violationIds, `${label}.violationIds`),
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
    return {
      status,
      legacyRef: requireString(raw.legacyRef, `${label}.legacyRef`),
    };
  }
  if (status === APPROVED_STATUS) {
    return {
      status,
      approver: requireString(raw.approver, `${label}.approver`),
      ticket: requireString(raw.ticket, `${label}.ticket`),
    };
  }
  fail(`${label}.status must be '${LEGACY_STATUS}' or '${APPROVED_STATUS}'`);
}

function stableLegacyRecordsHash(waivers) {
  const legacyRecords = waivers.filter((waiver) => waiver.approval.status === LEGACY_STATUS);
  return createHash("sha256").update(JSON.stringify(legacyRecords)).digest("hex");
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
    return {
      id,
      kind,
      signature,
      match,
      reasonCode: requireString(entry.reasonCode, `${label}.reasonCode`),
      rationale: requireString(entry.rationale, `${label}.rationale`),
      approval: normalizeApproval(entry.approval, `${label}.approval`),
      ...(expiresOn ? { expiresOn } : {}),
    };
  }).sort((left, right) => left.signature.localeCompare(right.signature));

  const legacyMigration = raw.legacyMigration;
  if (!legacyMigration || typeof legacyMigration !== "object" || Array.isArray(legacyMigration)) {
    fail("legacyMigration must seal the one-time legacy import");
  }
  if (legacyMigration.closed !== true) fail("legacyMigration.closed must be true");
  requireString(legacyMigration.id, "legacyMigration.id");
  const legacyRecords = waivers.filter((waiver) => waiver.approval.status === LEGACY_STATUS);
  if (legacyRecords.length > 0) {
    if (
      legacyMigration.id !== SEALED_LEGACY_MIGRATION.id
      || legacyMigration.recordCount !== SEALED_LEGACY_MIGRATION.recordCount
      || legacyMigration.recordsSha256 !== SEALED_LEGACY_MIGRATION.recordsSha256
    ) {
      fail("legacyMigration must match the immutable 28-record migration seal");
    }
  }
  if (legacyMigration.recordCount !== legacyRecords.length) {
    fail(`legacyMigration.recordCount must equal ${legacyRecords.length}`);
  }
  const legacyHash = stableLegacyRecordsHash(waivers);
  if (legacyMigration.recordsSha256 !== legacyHash) {
    fail("legacyMigration.recordsSha256 does not match the sealed legacy records");
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
