import path from "node:path";
import {
  DEFAULT_BASE_URL,
  attachConsoleRecorder,
  buildRuntimeUrl,
  ensureDir,
  launchBrowser,
  parseBaseUrl,
  parseBooleanEnv,
  readRuntimeState,
  writeJson,
  waitForRuntimeReady,
  advanceRuntime,
} from "./lib/runtimePlaywright.mjs";

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function roundMetric(value) {
  return Math.round(value * 1000) / 1000;
}

function assertNear(actual, expected, label, epsilon = 0.001) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const BASE_URL = parseBaseUrl(process.env.BASE_URL ?? DEFAULT_BASE_URL);
const HEADLESS = parseBooleanEnv(process.env.HEADLESS, true);
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.OUTPUT_DIR ?? `../../artifacts/playwright/headshot-kill-perf/${timestampId()}`,
);
const KILL_FEEDBACK_BUDGET_MS = Math.max(0.1, Number(process.env.KILL_FEEDBACK_BUDGET_MS ?? 4));
const FRAME_SPIKE_LIMIT_MS = Math.max(0.1, Number(process.env.FRAME_SPIKE_LIMIT_MS ?? 8));
const FRAME_STEP_MS = 1000 / 60;

await ensureDir(OUTPUT_DIR);

const { browser, context, page } = await launchBrowser({ headless: HEADLESS });
const consoleRecorder = attachConsoleRecorder(page);

async function sampleFrame(label) {
  const startedAt = performance.now();
  await advanceRuntime(page, FRAME_STEP_MS);
  const durationMs = performance.now() - startedAt;
  const state = await readRuntimeState(page);
  return {
    label,
    durationMs: roundMetric(durationMs),
    perfMsPerFrame: roundMetric(state.perf.msPerFrame),
    score: roundMetric(state.score.current),
    lastCombatFeedbackMs: roundMetric(state.perf.lastCombatFeedbackMs),
    lastKillFeedbackMs: roundMetric(state.perf.lastKillFeedbackMs),
    combatFeedbackQueue: state.perf.combatFeedbackQueue,
  };
}

async function sampleFrames(labelPrefix, count) {
  const frames = [];
  for (let index = 0; index < count; index += 1) {
    frames.push(await sampleFrame(`${labelPrefix}-${index}`));
  }
  return frames;
}

async function emitCombatFeedback(payload) {
  await page.evaluate((nextPayload) => {
    if (typeof window.__debug_emit_combat_feedback !== "function") {
      throw new Error("__debug_emit_combat_feedback is unavailable");
    }
    window.__debug_emit_combat_feedback(nextPayload);
  }, payload);
}

const summary = {
  baseUrl: BASE_URL,
  headless: HEADLESS,
  outputDir: OUTPUT_DIR,
  killFeedbackBudgetMs: KILL_FEEDBACK_BUDGET_MS,
  frameSpikeLimitMs: FRAME_SPIKE_LIMIT_MS,
  startedAt: new Date().toISOString(),
  checks: {},
};

try {
  await page.goto(
    buildRuntimeUrl(BASE_URL, {
      autostart: "human",
      extraSearchParams: {
        debug: 1,
        perf: 1,
        god: 1,
      },
    }),
    { waitUntil: "domcontentloaded" },
  );
  await waitForRuntimeReady(page);

  const initialState = await readRuntimeState(page);
  if (initialState.render.webgl !== true) {
    throw new Error("Headshot perf smoke requires WebGL");
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, "runtime-start.png") });

  const initialScore = Number(initialState.score.current);
  await emitCombatFeedback({ isHeadshot: false, didKill: false, damage: 25, enemyName: "BodyDummy" });
  const bodyHitFrames = await sampleFrames("body-hit", 3);
  const bodyHitState = await readRuntimeState(page);
  assertNear(Number(bodyHitState.score.current), initialScore, "Body-hit score delta");

  const bodyKillStartScore = Number(bodyHitState.score.current);
  await emitCombatFeedback({ isHeadshot: false, didKill: true, damage: 25, enemyName: "BodyKill" });
  const bodyKillFrames = await sampleFrames("body-kill", 4);
  const bodyKillState = await readRuntimeState(page);
  assertNear(Number(bodyKillState.score.current) - bodyKillStartScore, 10, "Body-kill score delta");

  const headshotStartScore = Number(bodyKillState.score.current);
  const preFrames = await sampleFrames("headshot-pre", 10);
  await emitCombatFeedback({ isHeadshot: true, didKill: true, damage: 100, enemyName: "HeadshotDummy" });
  const postFrames = await sampleFrames("headshot-post", 10);
  const headshotState = await readRuntimeState(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "headshot-kill.png") });

  assertNear(Number(headshotState.score.current) - headshotStartScore, 12.5, "Headshot-kill score delta");

  const preAverageDuration = average(preFrames.map((frame) => frame.durationMs));
  const postMaxDuration = Math.max(...postFrames.map((frame) => frame.durationMs));
  const spikeDeltaMs = roundMetric(postMaxDuration - preAverageDuration);
  const maxKillFeedbackMs = Math.max(...postFrames.map((frame) => frame.lastKillFeedbackMs));
  if (maxKillFeedbackMs > KILL_FEEDBACK_BUDGET_MS) {
    throw new Error(
      `Headshot kill feedback exceeded budget: ${maxKillFeedbackMs}ms > ${KILL_FEEDBACK_BUDGET_MS}ms`,
    );
  }
  if (spikeDeltaMs > FRAME_SPIKE_LIMIT_MS) {
    throw new Error(`Headshot frame spike exceeded limit: ${spikeDeltaMs}ms > ${FRAME_SPIKE_LIMIT_MS}ms`);
  }

  const repeatedStartScore = Number(headshotState.score.current);
  const repeatedHeadshots = [];
  for (let index = 0; index < 2; index += 1) {
    const beforeState = await readRuntimeState(page);
    const beforeScore = Number(beforeState.score.current);
    await emitCombatFeedback({
      isHeadshot: true,
      didKill: true,
      damage: 100,
      enemyName: `RepeatHeadshot${index + 1}`,
    });
    const frames = await sampleFrames(`repeat-headshot-${index + 1}`, 4);
    const afterState = await readRuntimeState(page);
    assertNear(Number(afterState.score.current) - beforeScore, 12.5, `Repeated headshot ${index + 1} score delta`);
    repeatedHeadshots.push({
      index: index + 1,
      frames,
      scoreAfter: roundMetric(Number(afterState.score.current)),
      maxKillFeedbackMs: Math.max(...frames.map((frame) => frame.lastKillFeedbackMs)),
    });
  }
  const repeatedFinalState = await readRuntimeState(page);
  assertNear(Number(repeatedFinalState.score.current) - repeatedStartScore, 25, "Repeated headshot total delta");

  if (consoleRecorder.counts().errorCount > 0) {
    throw new Error(`Console/page errors observed: ${consoleRecorder.counts().errorCount}`);
  }

  summary.finishedAt = new Date().toISOString();
  summary.checks = {
    bodyHit: {
      frames: bodyHitFrames,
      scoreAfter: roundMetric(Number(bodyHitState.score.current)),
    },
    bodyKill: {
      frames: bodyKillFrames,
      scoreAfter: roundMetric(Number(bodyKillState.score.current)),
    },
    headshotKill: {
      preFrames,
      postFrames,
      scoreAfter: roundMetric(Number(headshotState.score.current)),
      preAverageDuration: roundMetric(preAverageDuration),
      postMaxDuration: roundMetric(postMaxDuration),
      spikeDeltaMs,
      maxKillFeedbackMs: roundMetric(maxKillFeedbackMs),
    },
    repeatedHeadshots,
    finalScore: roundMetric(Number(repeatedFinalState.score.current)),
  };

  await writeJson(path.join(OUTPUT_DIR, "summary.json"), summary);
  await writeJson(path.join(OUTPUT_DIR, "console.json"), {
    events: consoleRecorder.snapshot(),
    counts: consoleRecorder.counts(),
  });
  console.log(
    `[headshot-kill-perf] pass | spike=${summary.checks.headshotKill.spikeDeltaMs}ms | ` +
      `killFeedback=${summary.checks.headshotKill.maxKillFeedbackMs}ms | output=${OUTPUT_DIR}`,
  );
} catch (error) {
  summary.finishedAt = new Date().toISOString();
  summary.failed = true;
  summary.failure = error instanceof Error ? error.message : String(error);
  await writeJson(path.join(OUTPUT_DIR, "summary.json"), summary);
  await writeJson(path.join(OUTPUT_DIR, "console.json"), {
    events: consoleRecorder.snapshot(),
    counts: consoleRecorder.counts(),
  });
  throw error;
} finally {
  await context.close();
  await browser.close();
}
