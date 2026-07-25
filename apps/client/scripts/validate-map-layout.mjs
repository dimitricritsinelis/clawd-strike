import { spawn } from "node:child_process";
import { assertGeneratedMapsFresh } from "./lib/generatedMapCheck.mjs";
import { startQaServer } from "./lib/qaServer.mjs";

async function runStep(label, command, args, extraEnv = {}) {
  console.log(`[validate:map-layout] ${label}`);
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  const [code, signal] = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (...result) => resolve(result));
  });
  if (code !== 0) {
    throw new Error(`${label} failed (${signal ? `signal ${signal}` : `exit ${code}`})`);
  }
}

let server = null;
try {
  console.log("[validate:map-layout] verify generated runtime map is current");
  await assertGeneratedMapsFresh();
  server = await startQaServer({ profile: "blockout" });
  console.log(`[validate:map-layout] isolated Vite server ready at ${server.baseUrl}`);
  await runStep(
    "run 12/12 authored traversal routes (blockout profile)",
    "pnpm",
    ["exec", "playwright", "test", "playwright/bazaar-v3-traversal.spec.ts", "--workers=1"],
    {
      PW_BASE_URL: server.baseUrl,
      BAZAAR_TRAVERSAL_PROFILE: "blockout",
      BAZAAR_TRAVERSAL_SCOPE: "canonical",
    },
  );
  await runStep(
    "run bot smoke",
    process.execPath,
    ["scripts/bot-intelligence-smoke.mjs"],
    { BASE_URL: server.baseUrl },
  );
  console.log("[validate:map-layout] PASS | generated=1 routes=12/12 profile=blockout botSmoke=pass");
} finally {
  await server?.close();
}
