import { randomBytes } from "node:crypto";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BAZAAR_PERFORMANCE_BUDGET, summarizePerformanceSamples } from "./performanceAcceptance.mjs";
import { ensureDir, writeJson } from "./runtimePlaywright.mjs";

export const CELL_SCHEMA_VERSION = 1;
export const CELL_SUMMARY_SCHEMA_VERSION = 1;
export const BASELINE_POINTER_SCHEMA_VERSION = 1;
export const NO_CHANGE_IMAGE_DRIFT = Object.freeze({
  meanAbsLuminanceDiff: 0.002,
  changedPixelRatio: 0.002,
});

function fail(message) {
  throw new Error(`[qa:cell] ${message}`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertStringArray(value, label, options = {}) {
  const { minimum = 1 } = options;
  if (!Array.isArray(value) || value.length < minimum || value.some((entry) => !nonEmpty(entry))) {
    fail(`${label} must contain at least ${minimum} non-empty string${minimum === 1 ? "" : "s"}`);
  }
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
}

export function parseCellArgs(argv) {
  const result = { cellId: "", mode: "capture" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    // `pnpm qa:cell -- ...` forwards its argument separator through the
    // workspace-filter script on some pnpm versions.
    if (key === "--") continue;
    if (key === "--baseline" || key === "--compare") {
      if (result.mode !== "capture") fail("--baseline and --compare are mutually exclusive");
      result.mode = key.slice(2);
      continue;
    }
    if (key !== "--cell") fail(`unknown argument '${key}'`);
    const value = argv[index + 1];
    if (!nonEmpty(value) || value.startsWith("--")) fail("--cell requires a cell id");
    result.cellId = value.trim();
    index += 1;
  }
  if (!result.cellId) {
    fail("usage: pnpm qa:cell -- --cell <cell-id> [--baseline|--compare]");
  }
  return result;
}

export function parseCellConfiguration(payload, shotsSpec, cellId) {
  if (!isRecord(payload) || payload.schemaVersion !== CELL_SCHEMA_VERSION || !Array.isArray(payload.cells)) {
    fail(`cells.json must use schemaVersion ${CELL_SCHEMA_VERSION} and contain cells[]`);
  }
  const duplicates = payload.cells
    .map((cell) => cell?.id)
    .filter((id, index, ids) => nonEmpty(id) && ids.indexOf(id) !== index);
  if (duplicates.length > 0) fail(`duplicate cell ids: ${[...new Set(duplicates)].join(", ")}`);
  const cell = payload.cells.find((candidate) => candidate?.id === cellId);
  if (!cell) fail(`unknown cell '${cellId}'`);

  assertStringArray(cell.shotIds, `cell '${cellId}' shotIds`, { minimum: 1 });
  assertStringArray(cell.hardChecks, `cell '${cellId}' hardChecks`);
  assertStringArray(cell.lockedSystems, `cell '${cellId}' lockedSystems`);
  assertStringArray(cell.requiredSemanticChecks, `cell '${cellId}' requiredSemanticChecks`);
  assertStringArray(cell.requiredQaTags, `cell '${cellId}' requiredQaTags`);
  assertStringArray(cell.forbiddenArtifactTags, `cell '${cellId}' forbiddenArtifactTags`);
  if (!Array.isArray(cell.references) || cell.references.length === 0) {
    fail(`cell '${cellId}' references must be non-empty`);
  }
  for (const [index, reference] of cell.references.entries()) {
    if (!isRecord(reference) || !nonEmpty(reference.path) || !nonEmpty(reference.role)) {
      fail(`cell '${cellId}' references[${index}] must include path and role`);
    }
  }
  if (!isRecord(cell.performanceBudget) || !nonEmpty(cell.performanceBudget.source)) {
    fail(`cell '${cellId}' performanceBudget must name the shared source`);
  }
  const authoredShotIds = new Set((shotsSpec?.shots ?? []).map((shot) => shot?.id).filter(nonEmpty));
  const unknownShotIds = cell.shotIds.filter((shotId) => !authoredShotIds.has(shotId));
  if (unknownShotIds.length > 0) {
    fail(`cell '${cellId}' references unknown shot ids: ${unknownShotIds.join(", ")}`);
  }
  return structuredClone(cell);
}

export async function loadCellConfiguration({ cellsPath, shotsPath, cellId }) {
  const [cells, shots] = await Promise.all([
    readFile(cellsPath, "utf8").then(JSON.parse),
    readFile(shotsPath, "utf8").then(JSON.parse),
  ]);
  return { cell: parseCellConfiguration(cells, shots, cellId), shotsSpec: shots };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function createContactSheet(entries, outputPath, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) fail("contact sheet requires at least one image");
  const columns = Math.max(1, Math.min(options.columns ?? 2, entries.length));
  const tileWidth = options.tileWidth ?? 720;
  const tileHeight = options.tileHeight ?? 450;
  const labelHeight = options.labelHeight ?? 42;
  const rows = Math.ceil(entries.length / columns);
  const width = columns * tileWidth;
  const height = rows * (tileHeight + labelHeight);
  const composites = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const left = (index % columns) * tileWidth;
    const top = Math.floor(index / columns) * (tileHeight + labelHeight);
    const image = await sharp(entry.imagePath)
      .resize(tileWidth, tileHeight, { fit: "contain", background: "#11151b" })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">`
      + `<rect width="100%" height="100%" fill="#11151b"/>`
      + `<text x="18" y="28" font-family="Arial, sans-serif" font-size="18" fill="#f4f5f7">${xmlEscape(entry.label)}</text>`
      + "</svg>",
    );
    composites.push({ input: image, left, top });
    composites.push({ input: label, left, top: top + tileHeight });
  }

  await ensureDir(path.dirname(outputPath));
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#11151b",
    },
  }).composite(composites).png().toFile(outputPath);
  return { outputPath, width, height, entries: entries.length };
}

export function createBlindMapping(shotIds, randomBytesImpl = randomBytes) {
  assertStringArray(shotIds, "blind mapping shotIds");
  const bytes = randomBytesImpl(shotIds.length);
  return Object.fromEntries(shotIds.map((shotId, index) => {
    const baselineIsA = bytes[index] % 2 === 0;
    return [shotId, {
      A: baselineIsA ? "baseline" : "candidate",
      B: baselineIsA ? "candidate" : "baseline",
    }];
  }));
}

function overlapValues(left, right) {
  const x = Math.min(left.max.x, right.max.x) - Math.max(left.min.x, right.min.x);
  const y = Math.min(left.max.y, right.max.y) - Math.max(left.min.y, right.min.y);
  const z = Math.min(left.max.z, right.max.z) - Math.max(left.min.z, right.min.z);
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    z: Math.max(0, z),
    volumeM3: x > 0 && y > 0 && z > 0 ? x * y * z : 0,
  };
}

function hasBlockingOverlap(overlap) {
  return overlap.x > 0.005 && overlap.y > 0.005 && overlap.z > 0.005;
}

function pairKey(left, right) {
  return [left, right].sort().join("\u0000");
}

function semanticMatches(record, pattern) {
  return pattern.test(`${record.semanticClass} ${record.moduleId ?? ""}`.toLowerCase());
}

function serviceVolumeFor(opening, depthM) {
  return {
    placementId: `${opening.placementId}:service-volume`,
    semanticClass: "door_service_volume",
    moduleId: "derived_from_rendered_door_bounds",
    bounds: {
      min: {
        x: opening.bounds.min.x - depthM,
        y: opening.bounds.min.y,
        z: opening.bounds.min.z - depthM,
      },
      max: {
        x: opening.bounds.max.x + depthM,
        y: opening.bounds.max.y,
        z: opening.bounds.max.z + depthM,
      },
    },
    shotIds: opening.shotIds,
  };
}

export function auditRenderedIntersections(geometryByShot, cell) {
  const records = new Map();
  for (const [shotId, state] of Object.entries(geometryByShot ?? {})) {
    for (const raw of state?.placements ?? []) {
      if (!nonEmpty(raw?.placementId) || !nonEmpty(raw?.semanticClass) || !isRecord(raw?.bounds)) continue;
      const existing = records.get(raw.placementId);
      if (existing) {
        existing.shotIds.add(shotId);
      } else {
        records.set(raw.placementId, { ...raw, shotIds: new Set([shotId]) });
      }
    }
  }

  const prefixes = cell.audit?.placementPrefixes ?? [];
  const inCell = (record) => prefixes.some((prefix) => record.placementId.startsWith(prefix));
  const cellRecords = [...records.values()].filter(inCell);
  const openings = cellRecords.filter((record) => semanticMatches(
    record,
    /(ordinary_door|door_shop|door_void|dark_window_recess|window_shuttered|window_void|active_merchant_bay|shop_recess)/,
  ));
  const doors = openings.filter((record) => semanticMatches(record, /(ordinary_door|door_shop|door_void)/));
  const canopies = cellRecords.filter((record) => semanticMatches(record, /(^| )(overhead|cloth_canopy|bazaar_cloth_canopy)( |$)/));
  const signs = cellRecords.filter((record) => semanticMatches(record, /(sign|awning)/));
  const dressing = cellRecords.filter((record) => (
    record.placementId.startsWith("PLACE_")
    && !canopies.includes(record)
    && !semanticMatches(record, /(canopy_support|wall_ring)/)
  ));
  const topLevel = cellRecords.filter((record) => !record.placementId.includes(":"));
  const routeVolumes = (cell.audit?.routeClearanceVolumes ?? []).map((record) => ({
    ...record,
    moduleId: "authored_route_clearance",
    shotIds: new Set(cell.shotIds),
  }));
  const serviceVolumes = doors.map((door) => serviceVolumeFor(
    door,
    Number(cell.audit?.doorServiceDepthM ?? 0.9),
  ));
  const exactAssemblyContacts = new Map((cell.audit?.assemblyContacts ?? []).map((entry) => [
    pairKey(entry.a, entry.b),
    entry,
  ]));
  const findings = [];
  const seen = new Set();

  const inspect = (kind, left, right) => {
    const overlap = overlapValues(left.bounds, right.bounds);
    if (!hasBlockingOverlap(overlap)) return;
    const key = `${kind}\u0000${pairKey(left.placementId, right.placementId)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const exact = exactAssemblyContacts.get(pairKey(left.placementId, right.placementId));
    const authoredRelation = (
      left.supportPlacementId === right.placementId
      || right.supportPlacementId === left.placementId
      || left.backingPlacementId === right.placementId
      || right.backingPlacementId === left.placementId
    );
    const disposition = exact ? "exempted" : authoredRelation ? "intentional" : "blocking";
    findings.push({
      check: kind,
      placementA: {
        placementId: left.placementId,
        semanticClass: left.semanticClass,
      },
      placementB: {
        placementId: right.placementId,
        semanticClass: right.semanticClass,
      },
      overlapM: overlap,
      relevantShotIds: [...new Set([
        ...left.shotIds,
        ...right.shotIds,
      ])].sort(),
      disposition,
      intentional: disposition === "intentional",
      exempted: disposition === "exempted",
      blocking: disposition === "blocking",
      authority: exact?.reason ?? (authoredRelation ? "exact support/backing placement relationship" : null),
    });
  };

  for (const canopy of canopies) for (const opening of openings) inspect("canopy-versus-opening", canopy, opening);
  for (const sign of signs) for (const opening of openings) inspect("sign-or-awning-versus-opening", sign, opening);
  for (const decoration of dressing) {
    for (const service of serviceVolumes) inspect("decoration-versus-door-service-volume", decoration, service);
    for (const route of routeVolumes) inspect("dressing-versus-route-clearance-volume", decoration, route);
  }
  for (let leftIndex = 0; leftIndex < topLevel.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < topLevel.length; rightIndex += 1) {
      inspect("unrelated-visual-assets-intersecting", topLevel[leftIndex], topLevel[rightIndex]);
    }
  }

  const grounded = cellRecords.filter((record) => semanticMatches(
    record,
    /(^| )(architecture|container|cover|foliage|furniture|landmark)( |$)/,
  ));
  for (const record of grounded) {
    const gap = Number(record.groundingGapM ?? 0);
    if (gap <= 0.03 && record.structurallyBacked !== false) continue;
    findings.push({
      check: "unsupported-or-ungrounded-placement",
      placementA: { placementId: record.placementId, semanticClass: record.semanticClass },
      placementB: { placementId: "EXPECTED_SUPPORT", semanticClass: "support_surface_or_authored_backing" },
      overlapM: { x: 0, y: 0, z: 0, volumeM3: 0, groundingGapM: gap },
      relevantShotIds: [...record.shotIds].sort(),
      disposition: "blocking",
      intentional: false,
      exempted: false,
      blocking: true,
      authority: record.structurallyBacked === false ? "structurallyBacked=false" : "grounding gap exceeds 0.03m",
    });
  }

  const blockingFindings = findings.filter((finding) => finding.blocking);
  return {
    passed: blockingFindings.length === 0,
    placementCount: cellRecords.length,
    findingCount: findings.length,
    blockingCount: blockingFindings.length,
    findings,
  };
}

export function evaluateCellPerformance(states) {
  const desktop = summarizePerformanceSamples(states);
  const budget = BAZAAR_PERFORMANCE_BUDGET;
  const findings = [];
  if (desktop.drawCalls <= 0 || desktop.drawCalls > budget.maxDrawCalls) {
    findings.push(`draw calls ${desktop.drawCalls} must be within 1..${budget.maxDrawCalls}`);
  }
  if (desktop.triangles <= 0 || desktop.triangles > budget.maxTriangles) {
    findings.push(`triangles ${desktop.triangles} must be within 1..${budget.maxTriangles}`);
  }
  if (!Number.isFinite(desktop.medianFrameMs) || desktop.medianFrameMs > budget.maxDesktopFrameMs) {
    findings.push(`CPU frame time ${desktop.medianFrameMs ?? "missing"}ms exceeds ${budget.maxDesktopFrameMs}ms`);
  }
  if (!Number.isFinite(desktop.bootReadyMs) || desktop.bootReadyMs >= 10_000) {
    findings.push(`boot-ready time ${desktop.bootReadyMs ?? "missing"}ms must be below 10000ms`);
  }
  return { passed: findings.length === 0, budget, desktop, findings };
}

export function evaluateCellTags(captures, cell) {
  const observed = new Set();
  const forbidden = new Set();
  for (const capture of captures) {
    for (const asset of capture.state?.render?.visibleAssets ?? []) {
      for (const value of [asset.placementId, asset.assetId, asset.moduleId]) {
        if (nonEmpty(value)) observed.add(value);
      }
    }
    for (const tag of capture.state?.render?.artifactTags ?? []) forbidden.add(tag);
  }
  const missingRequired = cell.requiredQaTags.filter((tag) => !observed.has(tag));
  const observedForbidden = cell.forbiddenArtifactTags.filter((tag) => forbidden.has(tag));
  return {
    passed: missingRequired.length === 0 && observedForbidden.length === 0,
    required: cell.requiredQaTags,
    observed: [...observed].sort(),
    missingRequired,
    forbidden: cell.forbiddenArtifactTags,
    observedForbidden,
  };
}

export function baselinePointerFromSummary(summary) {
  if (
    summary?.schemaVersion !== CELL_SUMMARY_SCHEMA_VERSION
    || summary?.mode !== "baseline"
    || summary?.passed !== true
    || summary?.failed === true
    || summary?.shots?.length !== summary?.shotIds?.length
  ) {
    fail("refusing to retain an incomplete or failed baseline");
  }
  return {
    schemaVersion: BASELINE_POINTER_SCHEMA_VERSION,
    cellId: summary.cellId,
    artifactDir: summary.outputDir,
    summaryPath: path.join(summary.outputDir, "summary.json"),
    retainedAt: new Date().toISOString(),
    branch: summary.sourceState?.git?.branch ?? null,
    commit: summary.sourceState?.git?.commit ?? null,
    sourceState: summary.sourceState,
  };
}

export async function writeBaselinePointer(pointerPath, summary) {
  const pointer = baselinePointerFromSummary(summary);
  await ensureDir(path.dirname(pointerPath));
  const temporaryPath = `${pointerPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(pointer, null, 2)}\n`);
  await rename(temporaryPath, pointerPath);
  return pointer;
}

export async function readBaselinePointer(pointerPath, expectedCellId) {
  let pointer;
  try {
    pointer = JSON.parse(await readFile(pointerPath, "utf8"));
  } catch (error) {
    fail(`retained baseline pointer is unavailable at ${pointerPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (
    pointer?.schemaVersion !== BASELINE_POINTER_SCHEMA_VERSION
    || pointer?.cellId !== expectedCellId
    || !nonEmpty(pointer?.artifactDir)
    || !nonEmpty(pointer?.summaryPath)
  ) {
    fail(`retained baseline pointer for '${expectedCellId}' is invalid`);
  }
  const summary = JSON.parse(await readFile(pointer.summaryPath, "utf8"));
  baselinePointerFromSummary(summary);
  await Promise.all(summary.shots.map(async (shot) => {
    await access(shot.imagePath);
    await access(shot.statePath);
  }));
  return { pointer, summary };
}

export function renderCellReview(summary) {
  const lines = [
    `# Production Cell Review: ${summary.cellId}`,
    "",
    `- Automated hard-check status: ${summary.passed ? "PASS" : "FAIL"}`,
    "- Human visual approval: NOT_APPROVED",
    `- Mode: ${summary.mode}`,
    `- Output: ${summary.outputDir}`,
    `- Current/failed stage: ${summary.failedStage ?? summary.currentStage ?? "none"}`,
    `- Shots: ${summary.shots?.filter((shot) => shot.passed).length ?? 0}/${summary.shotIds?.length ?? 0}`,
    `- Console: ${summary.console?.passed ? "PASS" : "FAIL"}`,
    `- Cameras: ${summary.cameras?.passed ? "PASS" : "FAIL"}`,
    `- Required QA tags: ${summary.qaTags?.passed ? "PASS" : "FAIL"}`,
    `- Forbidden artifact tags: ${(summary.qaTags?.observedForbidden?.length ?? 0) === 0 ? "PASS" : "FAIL"}`,
    `- Rendered intersection audit: ${summary.intersections?.passed ? "PASS" : "FAIL"}`,
    `- Performance: ${summary.performance?.passed ? "PASS" : "FAIL"}`,
  ];
  if (summary.comparison) {
    lines.push(
      "",
      "## Deterministic comparison",
      `- Status: ${summary.comparison.passed ? "PASS" : "FAIL"}`,
      `- Baseline: ${summary.comparison.baselineArtifactDir}`,
      `- Blind sheets: ${summary.comparison.blindSheetDir}`,
      "- A/B mapping is stored separately under the hidden artifact directory.",
    );
  }
  lines.push("", "## Hard checks");
  for (const check of summary.hardChecks ?? []) lines.push(`- ${check}`);
  if ((summary.intersections?.findings?.length ?? 0) > 0) {
    lines.push("", "## Geometry findings");
    for (const finding of summary.intersections.findings) {
      lines.push(
        `- ${finding.disposition.toUpperCase()} ${finding.check}: ${finding.placementA.placementId} ↔ ${finding.placementB.placementId}`,
      );
    }
  }
  if (summary.failure) lines.push("", "## Harness failure", `- ${summary.failure}`);
  lines.push(
    "",
    "This workflow records deterministic evidence and hard failures. It never makes an aesthetic approval decision.",
  );
  return `${lines.join("\n")}\n`;
}

export async function persistCellArtifacts(summary) {
  summary.updatedAt = new Date().toISOString();
  await ensureDir(summary.outputDir);
  await writeJson(path.join(summary.outputDir, "summary.json"), summary);
  await writeFile(path.join(summary.outputDir, "review.md"), renderCellReview(summary));
}

export function cellExitCode(summary) {
  return summary?.passed === true && summary?.failed !== true ? 0 : 1;
}

export async function withCellQaResources(options, callback) {
  const server = await options.startServer();
  let browser = null;
  try {
    browser = await options.launchBrowser();
    return await callback({ server, browser });
  } finally {
    await options.closeBrowser({ browser }).catch(() => {});
    await server.close();
  }
}
