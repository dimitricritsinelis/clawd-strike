import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBazaarPerformance, sampleRenderedFrameCadence, summarizePerformanceSamples } from "./performanceAcceptance.mjs";

test("summarizes worst geometry and median timing samples", () => {
  assert.deepEqual(summarizePerformanceSamples([
    { frameIntervalMs: 20, perf: { drawCalls: 400, triangles: 900_000, fps: 9000, msPerFrame: 0.1, cpuFrameMedianMs: 16 }, boot: { readyAtMs: 800 } },
    { frameIntervalMs: 25, perf: { drawCalls: 410, triangles: 910_000, fps: 9000, msPerFrame: 0.1, cpuFrameMedianMs: 20 }, boot: { readyAtMs: 800 } },
  ]), { sampleCount: 2, drawCalls: 410, triangles: 910_000, medianFps: 45, medianFrameIntervalMs: 22.5, fpsMeasurement: "rendered-requestAnimationFrame-cadence", medianFrameMs: 18, bootReadyMs: 800 });
});

test("prefers the CPU frame meter over the vsync-pinned rAF interval", () => {
  const summary = summarizePerformanceSamples([
    { perf: { drawCalls: 400, triangles: 900_000, fps: 60, msPerFrame: 16.67, cpuFrameMedianMs: 7.5 }, boot: { readyAtMs: 800 } },
    { perf: { drawCalls: 410, triangles: 910_000, fps: 60, msPerFrame: 16.67, cpuFrameMedianMs: 8.5 }, boot: { readyAtMs: 800 } },
  ]);
  assert.equal(summary.medianFrameMs, 8);
});

test("enforces geometry, mobile FPS, and supplied 10% baselines", () => {
  const result = evaluateBazaarPerformance({
    desktop: { drawCalls: 1_501, triangles: 2_200_001, medianFrameMs: 13, bootReadyMs: 1200 },
    mobile: { drawCalls: 501, triangles: 1_300_001, medianFps: 29, medianFrameMs: 12, bootReadyMs: 1200 },
    baseline: { frameMs: 10, bootMs: 1000 },
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.findings.filter(({ severity }) => severity === "error").map(({ code }) => code), [
    "draw-call-ceiling", "triangle-ceiling", "mobile-fps-floor", "mobile-draw-call-ceiling", "mobile-triangle-ceiling", "desktop-frame-time-ceiling", "frame-time-regression", "boot-time-regression", "mobile-frame-time-regression", "mobile-boot-time-regression",
  ]);
});

test("enforces committed frame and boot baselines when overrides are absent", () => {
  const result = evaluateBazaarPerformance({
    desktop: { drawCalls: 449, triangles: 1_000_000, medianFrameMs: 14, bootReadyMs: 900 },
    mobile: { drawCalls: 399, triangles: 900_000, medianFps: 30, medianFrameMs: 14, bootReadyMs: 900 },
  });
  assert.equal(result.passed, false);
  assert.equal(result.findings.some(({ code }) => code === "desktop-frame-time-ceiling"), true);
  assert.equal(result.comparisons.frameTime.status, "pass");
  assert.equal(result.comparisons.bootTime.status, "pass");
  assert.equal(result.comparisons.mobileFrameTime.status, "pass");
  assert.equal(result.comparisons.mobileBootTime.status, "pass");
});


test("rendered rAF samples measure display intervals rather than synthetic runtime FPS", async () => {
  const previous = globalThis.window;
  const timestamps = [100, 140, 180, 220];
  let callbacks = 0;
  let renders = 0;
  globalThis.window = {
    requestAnimationFrame: (callback) => queueMicrotask(() => callback(timestamps[callbacks++])),
    __qa_render_frame: () => { renders += 1; },
    __qa_performance_state: () => ({
      perf: { drawCalls: 400, triangles: 900_000, fps: 10_000, msPerFrame: 0.1, cpuFrameMedianMs: 2 },
      boot: { readyAtMs: 800 },
    }),
  };
  try {
    const states = await sampleRenderedFrameCadence(3);
    assert.equal(renders, 3);
    assert.equal(callbacks, 4);
    assert.deepEqual(states.map((state) => state.frameIntervalMs), [40, 40, 40]);
    const summary = summarizePerformanceSamples(states);
    assert.equal(summary.medianFps, 25);
    assert.equal(summary.medianFrameIntervalMs, 40);
    assert.equal(summary.medianFrameMs, 2, "CPU submission time remains a separate measurement");
    const result = evaluateBazaarPerformance({ desktop: summary, mobile: summary });
    assert.ok(result.findings.some((finding) => finding.code === "mobile-fps-floor"));
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test("legacy FPS alone cannot satisfy measured frame cadence", () => {
  const summary = summarizePerformanceSamples([{ perf: { fps: 10_000, msPerFrame: 0.1, cpuFrameMedianMs: 1 } }]);
  assert.equal(summary.medianFps, null);
  assert.equal(summary.medianFrameIntervalMs, null);
});


test("the simulation clock cannot stand in for measured CPU submission time", () => {
  const summary = summarizePerformanceSamples([{ frameIntervalMs: 16.67, perf: { msPerFrame: 0.1 } }]);
  assert.equal(summary.medianFrameMs, null);
});
