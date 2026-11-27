import path from "node:path";
import { authorizeDeploymentBrowser } from "./lib/deploymentProtection.mjs";
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_BASE_URL,
  attachConsoleRecorder,
  ensureDir,
  evaluateRuntimeState,
  getDocumentedAgentApiStatus,
  gotoAgentRuntimeViaUi,
  launchBrowser,
  parseBaseUrl,
  parseBooleanEnv,
  trimAgentName,
  withTimeout,
  writeJson,
} from "./lib/runtimePlaywright.mjs";

const baseUrl = parseBaseUrl(process.env.BASE_URL ?? DEFAULT_BASE_URL);
const origin = new URL(baseUrl).origin;
const skillsUrl = new URL(process.env.SKILLS_URL ?? "/skills.md", baseUrl).href;
const outputDir = path.resolve(process.env.OUTPUT_DIR
  ?? `../../artifacts/playwright/no-context-agent-smoke/${new Date().toISOString().replace(/[:.]/g, "-")}`);
const { browser, context, page } = await launchBrowser({
  headless: parseBooleanEnv(process.env.HEADLESS, true),
  viewport: process.env.CI || process.env.PW_SOFTWARE_RENDERING === "1" ? { width: 640, height: 400 } : undefined,
});
const recorder = attachConsoleRecorder(page);
const apiResponses = [];
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.origin === origin && url.pathname.startsWith("/api/")) {
    apiResponses.push(request.response().then((response) =>
      response && response.status() >= 400 ? `${request.method()} ${url.pathname}: HTTP ${response.status()}` : null));
  }
});

let phase = "authenticate";
try {
  await authorizeDeploymentBrowser(context, baseUrl, skillsUrl);
  phase = "public guide";
  const guide = await page.goto(skillsUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  if (!guide?.ok()) throw new Error(`Public guide returned HTTP ${guide?.status() ?? "unknown"}`);
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const snippet of [
    '[data-testid="agent-mode"]', '[data-testid="play"]', '[data-testid="agent-name"]',
    '[data-testid="play-again"]', "agent_observe", "agent_apply_action", "render_game_to_text", "contract mismatch",
  ]) {
    if (!text.includes(snippet)) throw new Error(`Public guide is missing ${snippet}`);
  }

  phase = "start game";
  const state = await gotoAgentRuntimeViaUi(page, {
    baseUrl,
    agentName: trimAgentName(process.env.AGENT_NAME, DEFAULT_AGENT_NAME),
  });
  const api = await getDocumentedAgentApiStatus(page);
  if (!api.agentObserve || !api.agentApplyAction || !api.advanceTime || !api.renderGameToText) {
    throw new Error("A documented public agent API is missing");
  }
  if (state.mode !== "runtime" || !state.runtimeReady || state.gameplay?.alive !== true
    || state.gameplay.gameOverVisible !== false) {
    throw new Error("The player is not alive in the ready game");
  }
  const magazine = state.ammo?.mag;
  if (!Number.isInteger(magazine) || magazine <= 0 || !Number.isInteger(state.ammo.reserve) || state.ammo.reserve < 0) {
    throw new Error("Invalid starting ammunition");
  }

  phase = "fire";
  try {
    await evaluateRuntimeState(page, () => window.agent_apply_action({ fire: true }));
    await page.waitForFunction((initial) => {
      const { ammo, gameplay } = JSON.parse(window.agent_observe());
      return gameplay?.alive === true && Number.isInteger(ammo?.mag) && ammo.mag >= 0 && ammo.mag < initial;
    }, magazine, { timeout: 9_000 });
  } finally {
    await evaluateRuntimeState(page, () => window.agent_apply_action({ fire: false }));
  }

  phase = "browser and API checks";
  const failures = (await withTimeout(() => Promise.all(apiResponses), 9_000, "Gameplay API requests")).filter(Boolean);
  if (failures.length) throw new Error(failures.join(", "));
  const { errorCount } = recorder.counts();
  if (errorCount) throw new Error(`Observed ${errorCount} browser errors`);
  console.log("[smoke:public] pass | game ready, firing consumed ammunition");
} catch (error) {
  await ensureDir(outputDir);
  const message = error instanceof Error ? error.message : String(error);
  await writeJson(path.join(outputDir, "summary.json"), { failed: true, phase, failure: message });
  await writeJson(path.join(outputDir, "console.json"), { counts: recorder.counts(), events: recorder.snapshot().slice(-30) });
  await page.screenshot({ path: path.join(outputDir, "failure.png"), timeout: 5_000 }).catch(() => {});
  console.error(`[smoke:public] failed during ${phase} | ${message} | output=${outputDir}`);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
