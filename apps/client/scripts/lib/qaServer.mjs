import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { createServer as createViteServer } from "vite";

const execFileAsync = promisify(execFile);

export const QA_READY_PATH = "/__qa/ready";
export const QA_READINESS_SCHEMA_VERSION = 1;
export const DEFAULT_SERVER_READY_TIMEOUT_MS = 60_000;
export const EXTERNAL_QA_OPT_IN_ENV = "ALLOW_EXTERNAL_QA_SERVER";
export const EXTERNAL_QA_RUN_TOKEN_ENV = "QA_EXTERNAL_RUN_TOKEN";
export const GENERATED_PROVENANCE_SCHEMA_VERSION = 1;
export const QA_GENERATOR_IDENTITY = "apps/client/scripts/gen-map-runtime.mjs";

const FINGERPRINT_FILES = Object.freeze({
  sourceMap: "docs/map-design/specs/map_spec.json",
  sourceShots: "docs/map-design/shots.json",
  generatedMap: "apps/client/public/maps/bazaar-map/map_spec.json",
  generatedShots: "apps/client/public/maps/bazaar-map/shots.json",
  runtimeBootstrap: "apps/client/src/runtime/bootstrap.ts",
  qaHarness: "apps/client/scripts/lib/runtimePlaywright.mjs",
  viteConfig: "apps/client/vite.config.ts",
});

function parseBoolean(value) {
  return value === "1" || value?.toLowerCase() === "true";
}

function nonEmptyToken(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`[qa-server] unsupported BASE_URL/QA_BASE_URL protocol '${url.protocol}'`);
  }
  return url.toString();
}

export function resolveQaBaseUrlOverride(environment = process.env) {
  return environment.BASE_URL ?? environment.QA_BASE_URL;
}

async function gitValue(root, args, fallback = null) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch {
    return fallback;
  }
}

async function gitRaw(root, args, fallback = "") {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return fallback;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function collectDirtyWorktreeFingerprint(workspaceRoot) {
  const [status, trackedChanges, untrackedFiles] = await Promise.all([
    gitRaw(workspaceRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    gitRaw(workspaceRoot, ["diff", "--name-only", "-z", "HEAD", "--"]),
    gitRaw(workspaceRoot, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  const paths = [...new Set(
    `${trackedChanges}${untrackedFiles}`
      .split("\0")
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));
  const contentHash = createHash("sha256");
  for (const relativePath of paths) {
    contentHash.update(`${Buffer.byteLength(relativePath)}:`);
    contentHash.update(relativePath);
    contentHash.update("\0");
    try {
      const contents = await readFile(path.join(workspaceRoot, relativePath));
      contentHash.update(`${contents.byteLength}:`);
      contentHash.update(contents);
    } catch (error) {
      contentHash.update(`missing:${error instanceof Error ? error.code ?? error.message : String(error)}`);
    }
    contentHash.update("\0");
  }
  return {
    dirty: status.length > 0,
    statusSha256: sha256(status),
    contentSha256: contentHash.digest("hex"),
    dirtyFileCount: paths.length,
  };
}

async function hashFile(workspaceRoot, relativePath) {
  try {
    const data = await readFile(path.join(workspaceRoot, relativePath));
    const result = {
      path: relativePath,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    };
    if (relativePath.startsWith("apps/client/public/maps/")) {
      try {
        const parsed = JSON.parse(data.toString("utf8"));
        result.generatedFrom = parsed.generatedFrom ?? parsed.metadata?.generatedFrom ?? null;
      } catch {
        result.generatedFrom = null;
      }
    }
    return result;
  } catch (error) {
    return {
      path: relativePath,
      sha256: null,
      bytes: null,
      missing: true,
      error: error instanceof Error ? error.code ?? error.message : String(error),
    };
  }
}

export async function collectQaFingerprint(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const workspaceRoot = await gitValue(root, ["rev-parse", "--show-toplevel"], root);
  const [branch, commit, worktree, ...files] = await Promise.all([
    gitValue(workspaceRoot, ["branch", "--show-current"], null),
    gitValue(workspaceRoot, ["rev-parse", "HEAD"], null),
    collectDirtyWorktreeFingerprint(workspaceRoot),
    ...Object.values(FINGERPRINT_FILES).map((relativePath) => hashFile(workspaceRoot, relativePath)),
  ]);
  return {
    profile: options.profile
      ?? process.env.QA_PROFILE
      ?? process.env.BAZAAR_TRAVERSAL_PROFILE
      ?? "qa",
    git: {
      branch,
      commit,
      ...worktree,
    },
    files: Object.fromEntries(
      Object.keys(FINGERPRINT_FILES).map((key, index) => [key, files[index]]),
    ),
  };
}

function validateQaFingerprintIdentity(fingerprint) {
  const errors = [];
  if (!fingerprint || typeof fingerprint !== "object") {
    return ["fingerprint must be an object"];
  }
  if (typeof fingerprint.profile !== "string" || fingerprint.profile.trim().length === 0) {
    errors.push("fingerprint.profile must be a non-empty string");
  }
  const git = fingerprint.git;
  if (!git || typeof git !== "object") {
    errors.push("fingerprint.git must be an object");
    return errors;
  }
  if (git.branch !== null && typeof git.branch !== "string") {
    errors.push("fingerprint.git.branch must be a string or null");
  }
  if (typeof git.commit !== "string" || git.commit.length === 0) {
    errors.push("fingerprint.git.commit must be a non-empty string");
  }
  if (typeof git.dirty !== "boolean") {
    errors.push("fingerprint.git.dirty must be a boolean");
  }
  for (const field of ["statusSha256", "contentSha256"]) {
    if (typeof git[field] !== "string" || !/^[a-f0-9]{64}$/.test(git[field])) {
      errors.push(`fingerprint.git.${field} must be a SHA-256`);
    }
  }
  if (!Number.isInteger(git.dirtyFileCount) || git.dirtyFileCount < 0) {
    errors.push("fingerprint.git.dirtyFileCount must be a non-negative integer");
  }
  return errors;
}

export function validateGeneratedSourceFingerprint(fingerprint) {
  const errors = [];
  if (!fingerprint || typeof fingerprint !== "object") {
    return { passed: false, errors: ["fingerprint must be an object"] };
  }
  const files = fingerprint.files;
  if (!files || typeof files !== "object") {
    return { passed: false, errors: ["fingerprint.files must be an object"] };
  }
  for (const [sourceKey, generatedKey, expectedSourcePath] of [
    ["sourceMap", "generatedMap", FINGERPRINT_FILES.sourceMap],
    ["sourceShots", "generatedShots", FINGERPRINT_FILES.sourceShots],
  ]) {
    const source = files[sourceKey];
    const generated = files[generatedKey];
    const label = generatedKey === "generatedMap" ? "generated map" : "generated shots";
    if (!source || source.path !== expectedSourcePath || !source.sha256) {
      errors.push(`${sourceKey} must include path '${expectedSourcePath}' and a SHA-256`);
      continue;
    }
    if (!generated || !generated.sha256) {
      errors.push(`${generatedKey} must include an output SHA-256`);
      continue;
    }
    const metadata = generated.generatedFrom;
    if (!metadata || typeof metadata !== "object") {
      errors.push(`${label} must include generatedFrom metadata`);
      continue;
    }
    if (metadata.schemaVersion !== GENERATED_PROVENANCE_SCHEMA_VERSION) {
      errors.push(`${label} generatedFrom.schemaVersion must equal ${GENERATED_PROVENANCE_SCHEMA_VERSION}`);
    }
    if (metadata.path !== expectedSourcePath) {
      errors.push(`${label} generatedFrom.path must equal '${expectedSourcePath}'`);
    }
    if (metadata.sha256 !== source.sha256) {
      errors.push(`${label} source SHA-256 does not match '${expectedSourcePath}'`);
    }
    if (metadata.generator !== QA_GENERATOR_IDENTITY) {
      errors.push(`${label} generator identity is invalid`);
    }
  }
  return { passed: errors.length === 0, errors };
}

export function assertGeneratedSourceFingerprint(fingerprint) {
  const validation = validateGeneratedSourceFingerprint(fingerprint);
  if (!validation.passed) {
    throw new Error(
      `[qa-server] generated provenance is stale or invalid | ${validation.errors.join(" | ")} | Run pnpm gen:maps.`,
    );
  }
  return fingerprint;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function validateQaReadiness(payload, expectations = {}) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return { passed: false, errors: ["readiness response must be an object"] };
  }
  if (payload.ready !== true) errors.push("ready must be true");
  if (payload.schemaVersion !== QA_READINESS_SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${QA_READINESS_SCHEMA_VERSION}`);
  }
  errors.push(...validateQaFingerprintIdentity(payload.fingerprint));
  if (expectations.expectedRunToken && payload.runToken !== expectations.expectedRunToken) {
    errors.push("run token does not identify the owned QA server");
  }
  if (
    expectations.expectedFingerprint
    && stableJson(payload.fingerprint) !== stableJson(expectations.expectedFingerprint)
  ) {
    errors.push("branch/source/generated fingerprint does not match this QA invocation");
  }
  const generatedValidation = validateGeneratedSourceFingerprint(payload.fingerprint);
  if (!generatedValidation.passed) {
    errors.push(...generatedValidation.errors.map((error) => `generated provenance: ${error}`));
  }
  return { passed: errors.length === 0, errors };
}

function qaReadinessPlugin(identity) {
  return {
    name: "clawd-strike-qa-readiness",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== QA_READY_PATH) {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader("cache-control", "no-store");
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({
          ready: true,
          schemaVersion: QA_READINESS_SCHEMA_VERSION,
          pid: process.pid,
          timestamp: Date.now(),
          ...identity,
        }));
      });
    },
  };
}

async function findAvailableLocalPort() {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("[qa-server] failed to reserve a dynamic TCP port"));
        return;
      }
      const port = address.port;
      probe.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

export async function waitForQaServer(baseUrl, options = {}) {
  const {
    timeoutMs = DEFAULT_SERVER_READY_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    pollMs = 100,
    expectedRunToken = null,
    expectedFingerprint = null,
  } = options;
  const readinessUrl = new URL(QA_READY_PATH, normalizeBaseUrl(baseUrl)).toString();
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(readinessUrl, {
        signal: AbortSignal.timeout(Math.min(2_000, timeoutMs)),
        cache: "no-store",
      });
      if (response.ok) {
        const payload = await response.json();
        const validation = validateQaReadiness(payload, {
          expectedRunToken,
          expectedFingerprint,
        });
        if (validation.passed) return payload;
        const identityError = new Error(
          `[qa-server] readiness identity mismatch | ${validation.errors.join(" | ")}`,
        );
        identityError.code = "QA_IDENTITY_MISMATCH";
        throw identityError;
      } else {
        lastError = new Error(`${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error?.code === "QA_IDENTITY_MISMATCH") throw error;
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(
    `[qa-server] readiness timed out after ${timeoutMs}ms | url=${readinessUrl} | last=${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export async function startQaServer(options = {}) {
  const {
    baseUrlOverride = resolveQaBaseUrlOverride(),
    allowExternal = parseBoolean(process.env[EXTERNAL_QA_OPT_IN_ENV]),
    externalRunToken = process.env[EXTERNAL_QA_RUN_TOKEN_ENV],
    root = process.cwd(),
    createServer = createViteServer,
    waitForServer = waitForQaServer,
    readyTimeoutMs = DEFAULT_SERVER_READY_TIMEOUT_MS,
    fingerprint = null,
    runToken = randomUUID(),
    profile = undefined,
  } = options;
  const expectedFingerprint = fingerprint ?? await collectQaFingerprint({ root, profile });

  if (baseUrlOverride) {
    if (!allowExternal) {
      throw new Error(
        `[qa-server] BASE_URL/QA_BASE_URL override requires ${EXTERNAL_QA_OPT_IN_ENV}=1; owned isolated servers are the default`,
      );
    }
    if (!nonEmptyToken(externalRunToken)) {
      throw new Error(
        `[qa-server] external QA servers require an explicit ${EXTERNAL_QA_RUN_TOKEN_ENV} that matches readiness`,
      );
    }
    assertGeneratedSourceFingerprint(expectedFingerprint);
    const baseUrl = normalizeBaseUrl(baseUrlOverride);
    const readiness = await waitForServer(baseUrl, {
      timeoutMs: readyTimeoutMs,
      expectedRunToken: externalRunToken,
      expectedFingerprint,
    });
    return {
      baseUrl,
      owned: false,
      readiness,
      fingerprint: expectedFingerprint,
      runToken: externalRunToken,
      async close() {},
    };
  }

  assertGeneratedSourceFingerprint(expectedFingerprint);
  process.env.VERCEL_ENV ??= "production";
  process.env.SESSION_SECRET ??= "clawd-strike-playwright-session-secret-32chars";
  process.env.SHARED_CHAMPION_ADMIN_TOKEN ??= "clawd-strike-playwright-shared-champion-admin-token";
  process.env.STATS_ADMIN_TOKEN ??= "clawd-strike-dev-stats-admin-token";
  process.env.PRIVACY_HASH_SECRET ??= "clawd-strike-playwright-privacy-secret-32chars";

  let server = null;
  try {
    const port = await findAvailableLocalPort();
    const previousPort = process.env.PORT;
    process.env.PORT = String(port);
    try {
      server = await createServer({
        root,
        logLevel: "warn",
        plugins: [qaReadinessPlugin({
          runToken,
          profile: expectedFingerprint.profile,
          fingerprint: expectedFingerprint,
        })],
        server: {
          host: "127.0.0.1",
          port,
          strictPort: true,
          hmr: false,
          watch: null,
        },
      });
    } finally {
      if (previousPort === undefined) delete process.env.PORT;
      else process.env.PORT = previousPort;
    }
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") {
      throw new Error("[qa-server] Vite did not expose a TCP listen address");
    }
    const baseUrl = `http://127.0.0.1:${address.port}/`;
    const readiness = await waitForServer(baseUrl, {
      timeoutMs: readyTimeoutMs,
      expectedRunToken: runToken,
      expectedFingerprint,
    });
    let closed = false;
    return {
      baseUrl,
      owned: true,
      readiness,
      fingerprint: expectedFingerprint,
      runToken,
      async close() {
        if (closed) return;
        closed = true;
        await server.close();
      },
    };
  } catch (error) {
    await server?.close().catch(() => {});
    throw error;
  }
}

export async function withQaServer(callback, options = {}) {
  const {
    startServer = startQaServer,
    ...serverOptions
  } = options;
  const server = await startServer(serverOptions);
  try {
    return await callback(server);
  } finally {
    await server.close();
  }
}
