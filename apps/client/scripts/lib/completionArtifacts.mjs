import path from "node:path";
import { writeFile } from "node:fs/promises";
import { BAZAAR_PERFORMANCE_BUDGET } from "./performanceAcceptance.mjs";
import { writeJson } from "./runtimePlaywright.mjs";

export function renderPerformanceSummary(performance) {
  const budget = performance?.budget ?? BAZAAR_PERFORMANCE_BUDGET;
  return [
    `- Status: ${performance?.passed ? "PASS" : "FAIL"}`,
    `- Desktop ${budget.viewport.width}x${budget.viewport.height}: draws=${performance?.desktop?.drawCalls ?? "n/a"} (target <=${budget.targetDrawCalls}, max ${budget.maxDrawCalls}), triangles=${performance?.desktop?.triangles ?? "n/a"} (max ${budget.maxTriangles}), median=${performance?.desktop?.medianFps?.toFixed?.(1) ?? "n/a"} fps / ${performance?.desktop?.medianFrameMs?.toFixed?.(2) ?? "n/a"}ms (max ${budget.maxDesktopFrameMs}ms)`,
    `- Mobile reduced-detail: draws=${performance?.mobile?.drawCalls ?? "n/a"} (max ${budget.maxMobileDrawCalls}), triangles=${performance?.mobile?.triangles ?? "n/a"} (max ${budget.maxMobileTriangles}), median=${performance?.mobile?.medianFps?.toFixed?.(1) ?? "n/a"} fps (minimum ${budget.minMobileFps})`,
    `- Boot ready: ${performance?.desktop?.bootReadyMs?.toFixed?.(1) ?? "n/a"}ms; baseline comparison=${performance?.comparisons?.bootTime?.status ?? "not-run"}`,
    `- Frame baseline comparison: ${performance?.comparisons?.frameTime?.status ?? "not-run"}`,
  ];
}

export function renderCompletionReview(summary) {
  const lines = [
    "# Autonomous Completion Review",
    "",
    `- Automated status: ${summary.automatedPassed ? "PASS" : "FAIL"}`,
    `- Release status: ${summary.releaseReady ? "READY" : "HUMAN REVIEW REQUIRED"}`,
    `- Failed: ${summary.failed === true}`,
    `- Current/failed stage: ${summary.failedStage ?? summary.currentStage ?? "none"}`,
    `- Reviewed at: ${summary.finishedAt ?? summary.updatedAt ?? summary.startedAt}`,
    `- Base URL: ${summary.baseUrl ?? "not-started"}`,
    `- Map ID: ${summary.mapId}`,
    `- Headless: ${summary.headless}`,
    `- Output: ${summary.outputDir}`,
    "",
    "## Functional Routes",
  ];

  for (const route of summary.functional?.routes ?? []) {
    lines.push(
      `- ${route.passed ? "PASS" : "FAIL"} \`${route.routeId}\` distance=${route.distanceM?.toFixed?.(2) ?? "n/a"}m zone=${route.endZoneId ?? "unknown"} consoleErrors=${route.console?.errorCount ?? 0}`,
    );
    for (const finding of route.findings ?? []) lines.push(`  - [${finding.severity}] ${finding.message}`);
    if (route.artifacts) {
      lines.push(`  - start: ${route.artifacts.startImage}`);
      lines.push(`  - final: ${route.artifacts.finalImage}`);
    }
  }

  lines.push("", "## Visual Review");
  for (const shot of summary.visual?.shots ?? []) {
    lines.push(
      `- ${shot.passed ? "PASS" : "FAIL"} \`${shot.shotId}\` score=${shot.score} zone=${shot.zoneId ?? "unknown"} landmarks=${shot.visibleLandmarks?.join(", ") || "none"}`,
    );
    lines.push(`  - image: ${shot.imagePath}`);
    if ((shot.reviewFocus?.length ?? 0) > 0) lines.push(`  - reviewFocus: ${shot.reviewFocus.join(" | ")}`);
    if ((shot.mustShow?.length ?? 0) > 0) lines.push(`  - mustShow: ${shot.mustShow.join(" | ")}`);
    for (const finding of shot.findings ?? []) lines.push(`  - [${finding.severity}] ${finding.message}`);
  }

  lines.push("", "## Performance Acceptance", ...renderPerformanceSummary(summary.performance));
  for (const finding of summary.performance?.findings ?? []) {
    lines.push(`  - [${finding.severity}] ${finding.message}`);
  }

  lines.push(
    "",
    "## Aggregate",
    `- Functional pass: ${summary.functional?.aggregate?.passed ?? false}`,
    `- Visual pass: ${summary.visual?.aggregate?.passed ?? false}`,
    `- Performance pass: ${summary.performance?.passed ?? false}`,
    `- Failing routes: ${summary.functional?.aggregate?.failingRoutes?.join(", ") || "none"}`,
    `- Failing shots: ${summary.visual?.aggregate?.failingShots?.join(", ") || "none"}`,
    "",
    "## Human Visual Approval",
    `- Status: ${summary.humanReview?.status ?? "NOT_APPROVED"}`,
    `- Authority: ${summary.humanReview?.approvalAuthority ?? "human"}`,
    `- Automated approval allowed: ${summary.humanReview?.automatedApprovalAllowed === true}`,
    `- Minimum category score: ${summary.humanReview?.minimumCategoryScore ?? 4}/5`,
  );
  for (const category of summary.humanReview?.categories ?? []) {
    lines.push(`- ${category.label}: ${category.score ?? "pending"}/5`);
  }
  for (const error of summary.humanReview?.errors ?? []) lines.push(`- [error] ${error}`);
  if (summary.failure) lines.push("", "## Harness Failure", `- ${summary.failure}`);
  lines.push("", "Automated QA records regressions but cannot approve this map. Explicit human signoff remains mandatory.");

  return `${lines.join("\n")}\n`;
}

export async function persistCompletionArtifacts(summary, options) {
  const { outputDir, stableDir } = options;
  summary.updatedAt = new Date().toISOString();
  const markdown = renderCompletionReview(summary);
  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "review.md"), markdown);
  if (stableDir) {
    await writeJson(path.join(stableDir, "latest-summary.json"), summary);
    await writeFile(path.join(stableDir, "latest-review.md"), markdown);
  }
}
