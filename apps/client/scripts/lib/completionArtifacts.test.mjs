import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { BAZAAR_PERFORMANCE_BUDGET } from "./performanceAcceptance.mjs";
import {
  persistCompletionArtifacts,
  renderPerformanceSummary,
} from "./completionArtifacts.mjs";

test("persists a partial summary and review before a gate is complete", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "clawd-completion-summary-"));
  const summary = {
    mapId: "bazaar-map",
    outputDir,
    startedAt: new Date().toISOString(),
    currentStage: "route:spawn-a-main",
    failed: false,
    functional: { routes: [{ routeId: "spawn-a-main", passed: true, findings: [] }] },
    visual: { shots: [] },
    performance: null,
  };
  await persistCompletionArtifacts(summary, { outputDir });
  const persisted = JSON.parse(await readFile(path.join(outputDir, "summary.json"), "utf8"));
  const review = await readFile(path.join(outputDir, "review.md"), "utf8");
  assert.equal(persisted.functional.routes.length, 1);
  assert.match(review, /spawn-a-main/);
  assert.match(review, /Performance Acceptance/);
});

test("performance report renders every ceiling from the shared budget source", () => {
  const report = renderPerformanceSummary(null).join("\n");
  const budget = BAZAAR_PERFORMANCE_BUDGET;
  assert.match(report, new RegExp(`max ${budget.maxDrawCalls}`));
  assert.match(report, new RegExp(`max ${budget.maxTriangles}`));
  assert.match(report, new RegExp(`max ${budget.maxDesktopFrameMs}ms`));
  assert.match(report, new RegExp(`max ${budget.maxMobileDrawCalls}`));
  assert.match(report, new RegExp(`max ${budget.maxMobileTriangles}`));
  assert.match(report, new RegExp(`minimum ${budget.minMobileFps}`));
  assert.doesNotMatch(report, /max 1200/);
  assert.doesNotMatch(report, /max 1600000/);
});
