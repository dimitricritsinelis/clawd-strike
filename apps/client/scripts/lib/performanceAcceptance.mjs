export const BAZAAR_PERFORMANCE_BUDGET = Object.freeze({
  viewport: Object.freeze({ width: 1440, height: 900 }),
  maxDrawCalls: 1_500,
  targetDrawCalls: 900,
  maxTriangles: 2_200_000,
  maxDesktopFrameMs: 12.5,
  maxMobileDrawCalls: 500,
  maxMobileTriangles: 1_300_000,
  minMobileFps: 30,
  baselineToleranceRatio: 0.10,
  baselineFrameMs: 16.67,
  baselineBootMs: 9_090,
});

function finiteValues(values) {
  return values.filter((value) => typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function median(values) {
  const sorted = [...finiteValues(values)].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function summarizePerformanceSamples(states) {
  const perf = states.map((state) => state?.perf ?? {});
  const boot = states.map((state) => state?.boot?.readyAtMs);
  return {
    sampleCount: states.length,
    drawCalls: Math.max(...finiteValues(perf.map((value) => value.drawCalls)), 0),
    triangles: Math.max(...finiteValues(perf.map((value) => value.triangles)), 0),
    medianFps: median(perf.map((value) => value.fps)),
    // The runtime's rAF-derived `msPerFrame` is vsync-pinned in browser QA.
    // Prefer the rolling CPU step/render meter when present, while retaining
    // the legacy field as a compatibility fallback for older captures.
    medianFrameMs: median(perf.map((value) => value.cpuFrameMedianMs ?? value.msPerFrame)),
    bootReadyMs: median(boot),
  };
}

function comparison(measured, baseline, toleranceRatio) {
  if (!Number.isFinite(measured) || !Number.isFinite(baseline) || baseline <= 0) {
    return { status: "not-measured", measured: measured ?? null, baseline: baseline ?? null };
  }
  const ceiling = baseline * (1 + toleranceRatio);
  return { status: measured <= ceiling ? "pass" : "fail", measured, baseline, ceiling };
}

export function evaluateBazaarPerformance({ desktop, mobile, baseline = {} }) {
  const budget = BAZAAR_PERFORMANCE_BUDGET;
  const findings = [];
  const add = (severity, code, message) => findings.push({ severity, code, message });

  if (desktop.drawCalls <= 0 || desktop.triangles <= 0) {
    add("error", "desktop-render-telemetry-missing", "Desktop render telemetry did not report positive draw-call and triangle counts.");
  } else {
    if (desktop.drawCalls > budget.maxDrawCalls) add("error", "draw-call-ceiling", `Desktop shot used ${desktop.drawCalls} draws (maximum ${budget.maxDrawCalls}).`);
    else if (desktop.drawCalls > budget.targetDrawCalls) add("info", "draw-call-target", `Desktop shot passes the ceiling at ${desktop.drawCalls} draws; optimization target is ${budget.targetDrawCalls}.`);
    if (desktop.triangles > budget.maxTriangles) add("error", "triangle-ceiling", `Desktop shot used ${desktop.triangles} triangles (maximum ${budget.maxTriangles}).`);
  }

  if (!Number.isFinite(mobile.medianFps) || mobile.medianFps <= 0) {
    add("error", "mobile-fps-missing", "Mobile reduced-detail telemetry did not report a positive FPS measurement.");
  } else if (mobile.medianFps < budget.minMobileFps) {
    add("error", "mobile-fps-floor", `Mobile reduced-detail median was ${mobile.medianFps.toFixed(1)} fps (minimum ${budget.minMobileFps}).`);
  }
  if (mobile.drawCalls <= 0 || mobile.triangles <= 0) {
    add("error", "mobile-render-telemetry-missing", "Mobile reduced-detail telemetry did not report positive draw-call and triangle counts.");
  } else {
    if (mobile.drawCalls > budget.maxMobileDrawCalls) add("error", "mobile-draw-call-ceiling", `Mobile shot used ${mobile.drawCalls} draws (maximum ${budget.maxMobileDrawCalls}).`);
    if (mobile.triangles > budget.maxMobileTriangles) add("error", "mobile-triangle-ceiling", `Mobile shot used ${mobile.triangles} triangles (maximum ${budget.maxMobileTriangles}).`);
  }

  const frameTime = comparison(desktop.medianFrameMs, baseline.frameMs ?? budget.baselineFrameMs, budget.baselineToleranceRatio);
  const bootTime = comparison(desktop.bootReadyMs, baseline.bootMs ?? budget.baselineBootMs, budget.baselineToleranceRatio);
  const mobileFrameTime = comparison(mobile.medianFrameMs, baseline.frameMs ?? budget.baselineFrameMs, budget.baselineToleranceRatio);
  const mobileBootTime = comparison(mobile.bootReadyMs, baseline.bootMs ?? budget.baselineBootMs, budget.baselineToleranceRatio);
  if (!Number.isFinite(desktop.medianFrameMs)) add("error", "desktop-frame-time-telemetry-missing", "Desktop CPU frame-time telemetry was unavailable.");
  else if (desktop.medianFrameMs > budget.maxDesktopFrameMs) add("error", "desktop-frame-time-ceiling", `Desktop CPU median frame time ${desktop.medianFrameMs.toFixed(2)}ms exceeds the ${budget.maxDesktopFrameMs.toFixed(1)}ms ceiling.`);
  if (frameTime.status === "fail") add("error", "frame-time-regression", `Desktop median frame time ${frameTime.measured.toFixed(2)}ms exceeds the 10% baseline ceiling ${frameTime.ceiling.toFixed(2)}ms.`);
  if (bootTime.status === "fail") add("error", "boot-time-regression", `Desktop boot-ready time ${bootTime.measured.toFixed(1)}ms exceeds the 10% baseline ceiling ${bootTime.ceiling.toFixed(1)}ms.`);
  if (mobileFrameTime.status === "fail") add("error", "mobile-frame-time-regression", `Mobile median frame time ${mobileFrameTime.measured.toFixed(2)}ms exceeds the 10% baseline ceiling ${mobileFrameTime.ceiling.toFixed(2)}ms.`);
  if (mobileBootTime.status === "fail") add("error", "mobile-boot-time-regression", `Mobile boot-ready time ${mobileBootTime.measured.toFixed(1)}ms exceeds the 10% baseline ceiling ${mobileBootTime.ceiling.toFixed(1)}ms.`);
  if (frameTime.status === "not-measured") add("error", "frame-time-telemetry-missing", "Desktop frame-time telemetry was unavailable.");
  if (bootTime.status === "not-measured") add("error", "boot-time-telemetry-missing", "Desktop boot-time telemetry was unavailable.");
  if (mobileFrameTime.status === "not-measured") add("error", "mobile-frame-time-telemetry-missing", "Mobile frame-time telemetry was unavailable.");
  if (mobileBootTime.status === "not-measured") add("error", "mobile-boot-time-telemetry-missing", "Mobile boot-time telemetry was unavailable.");

  return {
    passed: findings.every((finding) => finding.severity !== "error"),
    budget,
    desktop,
    mobile,
    comparisons: { frameTime, bootTime, mobileFrameTime, mobileBootTime },
    findings,
  };
}
