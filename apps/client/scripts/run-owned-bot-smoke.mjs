import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  forceKillChild,
  normalizeChildExitCode,
  parseChildTimeout,
  waitForChildLifecycle,
} from "./lib/childLifecycle.mjs";
import { startQaServer } from "./lib/qaServer.mjs";

export const DEFAULT_BOT_SMOKE_TIMEOUT_MS = 15 * 60_000;

const CLIENT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOT_SMOKE_SCRIPT = fileURLToPath(
  new URL("./bot-intelligence-smoke.mjs", import.meta.url),
);

export { normalizeChildExitCode };

function assertOwnedServerIdentity(server) {
  if (server?.owned !== true) {
    throw new Error("[bot:smoke:owned] server lifecycle did not return an owned server");
  }
  if (typeof server.baseUrl !== "string" || server.baseUrl.length === 0) {
    throw new Error("[bot:smoke:owned] owned server is missing its base URL");
  }
  if (typeof server.runToken !== "string" || server.runToken.length === 0) {
    throw new Error("[bot:smoke:owned] owned server is missing its run token");
  }
  if (!server.fingerprint || typeof server.fingerprint !== "object") {
    throw new Error("[bot:smoke:owned] owned server is missing its source fingerprint");
  }
}

export async function runOwnedBotSmoke(options = {}) {
  const {
    childTimeoutMs = parseChildTimeout(
      process.env.BOT_SMOKE_TIMEOUT_MS,
      DEFAULT_BOT_SMOKE_TIMEOUT_MS,
      "[bot:smoke:owned] BOT_SMOKE_TIMEOUT_MS",
    ),
    killGraceMs = parseChildTimeout(
      process.env.QA_CHILD_KILL_GRACE_MS,
      5_000,
      "[bot:smoke:owned] QA_CHILD_KILL_GRACE_MS",
    ),
    signalEmitter = process,
    spawnImpl = spawn,
    startServer = startQaServer,
  } = options;

  const server = await startServer({
    allowExternal: false,
    baseUrlOverride: null,
    profile: "bot-smoke",
    root: CLIENT_ROOT,
  });
  let child = null;

  try {
    assertOwnedServerIdentity(server);
    const {
      ALLOW_EXTERNAL_QA_SERVER: _ignoredExternalOptIn,
      BASE_URL: _ignoredBaseUrl,
      QA_BASE_URL: _ignoredQaBaseUrl,
      QA_SERVER_FINGERPRINT: _ignoredFingerprint,
      QA_SERVER_RUN_TOKEN: _ignoredRunToken,
      ...parentEnv
    } = process.env;
    child = spawnImpl(process.execPath, [BOT_SMOKE_SCRIPT], {
      cwd: CLIENT_ROOT,
      stdio: "inherit",
      env: {
        ...parentEnv,
        BASE_URL: server.baseUrl,
        QA_SERVER_FINGERPRINT: JSON.stringify(server.fingerprint),
        QA_SERVER_RUN_TOKEN: server.runToken,
      },
    });

    const result = await waitForChildLifecycle(child, {
      timeoutMs: childTimeoutMs,
      killGraceMs,
      signalEmitter,
    });

    if (result.timedOut) {
      console.error(
        `[bot:smoke:owned] timed out after ${childTimeoutMs}ms; terminated the bot smoke process`,
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
  process.exitCode = await runOwnedBotSmoke().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    return 1;
  });
}
