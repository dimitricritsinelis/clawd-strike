import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  forceKillChild,
  normalizeChildExitCode,
  parseChildTimeout,
  waitForChildLifecycle,
} from "./lib/childLifecycle.mjs";
import { startQaServer } from "./lib/qaServer.mjs";

export { normalizeChildExitCode };

export const DEFAULT_PLAYWRIGHT_QA_TIMEOUT_MS = 20 * 60_000;

export async function runPlaywrightQa(args, options = {}) {
  const {
    childTimeoutMs = parseChildTimeout(
      process.env.PLAYWRIGHT_QA_TIMEOUT_MS,
      DEFAULT_PLAYWRIGHT_QA_TIMEOUT_MS,
      "PLAYWRIGHT_QA_TIMEOUT_MS",
    ),
    killGraceMs = parseChildTimeout(
      process.env.QA_CHILD_KILL_GRACE_MS,
      5_000,
      "QA_CHILD_KILL_GRACE_MS",
    ),
    spawnImpl = spawn,
    startServer = startQaServer,
    signalEmitter = process,
    serverOptions = {},
  } = options;
  const server = await startServer(serverOptions);
  let child = null;

  try {
    const {
      ALLOW_EXTERNAL_QA_SERVER: _ignoredExternalOptIn,
      BASE_URL: _ignoredBaseUrl,
      PW_BASE_URL: _ignoredPwBaseUrl,
      QA_BASE_URL: _ignoredQaBaseUrl,
      QA_EXTERNAL_RUN_TOKEN: _ignoredExternalRunToken,
      ...parentEnv
    } = process.env;
    child = spawnImpl("pnpm", ["exec", "playwright", ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...parentEnv,
        PW_BASE_URL: server.baseUrl,
        QA_SERVER_RUN_TOKEN: server.runToken ?? "",
        QA_SERVER_FINGERPRINT: JSON.stringify(server.fingerprint ?? null),
      },
    });
    const result = await waitForChildLifecycle(child, {
      timeoutMs: childTimeoutMs,
      killGraceMs,
      signalEmitter,
    });
    if (result.timedOut) {
      console.error(
        `[playwright-qa] timed out after ${childTimeoutMs}ms; terminated the Playwright process`,
      );
      return 1;
    }
    return result.forwardedSignal ? 1 : normalizeChildExitCode(result.code, result.signal);
  } finally {
    forceKillChild(child);
    await server.close();
  }
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = await runPlaywrightQa(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    return 1;
  });
}
