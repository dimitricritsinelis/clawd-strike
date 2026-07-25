import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  auditRenderedIntersections,
  baselinePointerFromSummary,
  cellExitCode,
  createBlindMapping,
  createContactSheet,
  parseCellConfiguration,
  readBaselinePointer,
  withCellQaResources,
  writeBaselinePointer,
} from "./mapCellQa.mjs";

const shotsSpec = {
  shots: [
    { id: "SHOT_A" },
    { id: "SHOT_B" },
  ],
};

function validCell(overrides = {}) {
  return {
    id: "cell-a",
    label: "Cell A",
    shotIds: ["SHOT_A", "SHOT_B"],
    references: [{ path: "ref.png", role: "lighting" }],
    hardChecks: ["hard"],
    performanceBudget: { source: "shared" },
    lockedSystems: ["layout"],
    requiredSemanticChecks: ["intersections"],
    requiredQaTags: ["required"],
    forbiddenArtifactTags: ["placeholder"],
    audit: {
      placementPrefixes: ["CELL_"],
      routeClearanceVolumes: [],
      assemblyContacts: [],
    },
    optionalTargetedTests: [],
    ...overrides,
  };
}

test("cell configuration parsing rejects unknown cells and unknown authored shot ids", () => {
  const payload = { schemaVersion: 1, cells: [validCell()] };
  assert.equal(parseCellConfiguration(payload, shotsSpec, "cell-a").shotIds.length, 2);
  assert.throws(() => parseCellConfiguration(payload, shotsSpec, "missing"), /unknown cell 'missing'/);
  assert.throws(
    () => parseCellConfiguration({
      schemaVersion: 1,
      cells: [validCell({ shotIds: ["SHOT_UNKNOWN"] })],
    }, shotsSpec, "cell-a"),
    /unknown shot ids: SHOT_UNKNOWN/,
  );
});

test("baseline pointer rejects failed runs and retains only complete successful artifacts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "clawd-cell-baseline-"));
  const imagePath = path.join(root, "capture.png");
  const statePath = path.join(root, "state.json");
  await writeFile(imagePath, "image");
  await writeFile(statePath, "{}");
  const summary = {
    schemaVersion: 1,
    cellId: "cell-a",
    mode: "baseline",
    passed: true,
    failed: false,
    outputDir: root,
    shotIds: ["SHOT_A"],
    shots: [{ shotId: "SHOT_A", imagePath, statePath }],
    sourceState: { git: { branch: "dev", commit: "abc" } },
  };
  assert.throws(
    () => baselinePointerFromSummary({ ...summary, passed: false, failed: true }),
    /incomplete or failed baseline/,
  );
  const pointerPath = path.join(root, "baseline.json");
  await writeFile(path.join(root, "summary.json"), `${JSON.stringify(summary)}\n`);
  await writeBaselinePointer(pointerPath, summary);
  const retained = await readBaselinePointer(pointerPath, "cell-a");
  assert.equal(retained.pointer.artifactDir, root);
  assert.equal(retained.summary.cellId, "cell-a");
});

test("blind A/B mapping randomizes roles without exposing a preferred side", () => {
  const mapping = createBlindMapping(["SHOT_A", "SHOT_B"], () => Buffer.from([0, 1]));
  assert.deepEqual(mapping, {
    SHOT_A: { A: "baseline", B: "candidate" },
    SHOT_B: { A: "candidate", B: "baseline" },
  });
});

test("contact-sheet generation creates a readable PNG artifact", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "clawd-cell-sheet-"));
  const red = path.join(root, "red.png");
  const blue = path.join(root, "blue.png");
  await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).png().toFile(red);
  await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toFile(blue);
  const outputPath = path.join(root, "sheet.png");
  const result = await createContactSheet([
    { imagePath: red, label: "A" },
    { imagePath: blue, label: "B" },
  ], outputPath, { columns: 2, tileWidth: 40, tileHeight: 30, labelHeight: 12 });
  assert.equal(result.entries, 2);
  const metadata = await sharp(await readFile(outputPath)).metadata();
  assert.equal(metadata.width, 80);
  assert.equal(metadata.height, 42);
});

test("rendered intersection fixtures report exact ids, semantic classes, overlap, and shots", () => {
  const cell = validCell({
    shotIds: ["SHOT_A"],
    audit: {
      placementPrefixes: ["CELL_"],
      routeClearanceVolumes: [],
      doorServiceDepthM: 0.2,
      assemblyContacts: [],
    },
  });
  const result = auditRenderedIntersections({
    SHOT_A: {
      placements: [
        {
          placementId: "CELL_CANOPY",
          moduleId: "bazaar_cloth_canopy",
          semanticClass: "overhead",
          bounds: { min: { x: 0, y: 1, z: 0 }, max: { x: 2, y: 2, z: 2 } },
        },
        {
          placementId: "CELL_WINDOW",
          moduleId: "window_shuttered",
          semanticClass: "dark_window_recess",
          bounds: { min: { x: 1, y: 1.5, z: 1 }, max: { x: 3, y: 3, z: 3 } },
        },
      ],
    },
  }, cell);
  assert.equal(result.passed, false);
  const finding = result.findings.find((entry) => entry.check === "canopy-versus-opening");
  assert.equal(finding.placementA.placementId, "CELL_CANOPY");
  assert.equal(finding.placementB.semanticClass, "dark_window_recess");
  assert.ok(finding.overlapM.volumeM3 > 0);
  assert.deepEqual(finding.relevantShotIds, ["SHOT_A"]);
  assert.equal(finding.disposition, "blocking");
});

test("intentional contacts require an exact support/backing relationship or exact allowlist", () => {
  const cell = validCell({
    shotIds: ["SHOT_A"],
    audit: {
      placementPrefixes: ["CELL_"],
      routeClearanceVolumes: [],
      assemblyContacts: [],
    },
  });
  const result = auditRenderedIntersections({
    SHOT_A: {
      placements: [
        {
          placementId: "CELL_A",
          moduleId: "crate",
          semanticClass: "cover",
          supportPlacementId: "CELL_B",
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
        },
        {
          placementId: "CELL_B",
          moduleId: "table",
          semanticClass: "furniture",
          bounds: { min: { x: 0.2, y: 0.2, z: 0.2 }, max: { x: 1.2, y: 1.2, z: 1.2 } },
        },
      ],
    },
  }, cell);
  assert.equal(result.passed, true);
  assert.equal(result.findings[0].disposition, "intentional");
});

test("hard failures produce a nonzero exit code", () => {
  assert.equal(cellExitCode({ passed: true, failed: false }), 0);
  assert.equal(cellExitCode({ passed: false, failed: true }), 1);
});

test("cell resource ownership always closes browser and server", async () => {
  const closed = [];
  const resources = {
    startServer: async () => ({ async close() { closed.push("server"); } }),
    launchBrowser: async () => ({ async close() { closed.push("browser"); } }),
    closeBrowser: async ({ browser }) => browser.close(),
  };
  await assert.rejects(
    withCellQaResources(resources, async () => {
      throw new Error("expected failure");
    }),
    /expected failure/,
  );
  assert.deepEqual(closed, ["browser", "server"]);
});
