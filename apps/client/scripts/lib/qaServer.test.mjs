import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  EXTERNAL_QA_RUN_TOKEN_ENV,
  QA_GENERATOR_IDENTITY,
  QA_READINESS_SCHEMA_VERSION,
  collectDirtyWorktreeFingerprint,
  resolveQaBaseUrlOverride,
  startQaServer,
  validateGeneratedSourceFingerprint,
  validateQaReadiness,
  waitForQaServer,
  withQaServer,
} from "./qaServer.mjs";

const execFileAsync = promisify(execFile);
const sourceHash = "a".repeat(64);
const generatedHash = "b".repeat(64);
const fingerprint = {
  profile: "qa",
  git: {
    branch: "dev",
    commit: "abc",
    dirty: true,
    statusSha256: "c".repeat(64),
    contentSha256: "d".repeat(64),
    dirtyFileCount: 4,
  },
  files: {
    sourceMap: {
      path: "docs/map-design/specs/map_spec.json",
      sha256: sourceHash,
      bytes: 100,
    },
    generatedMap: {
      path: "apps/client/public/maps/bazaar-map/map_spec.json",
      sha256: generatedHash,
      bytes: 200,
      generatedFrom: {
        schemaVersion: 1,
        path: "docs/map-design/specs/map_spec.json",
        sha256: sourceHash,
        generator: QA_GENERATOR_IDENTITY,
      },
    },
    sourceShots: {
      path: "docs/map-design/shots.json",
      sha256: sourceHash,
      bytes: 100,
    },
    generatedShots: {
      path: "apps/client/public/maps/bazaar-map/shots.json",
      sha256: generatedHash,
      bytes: 200,
      generatedFrom: {
        schemaVersion: 1,
        path: "docs/map-design/shots.json",
        sha256: sourceHash,
        generator: QA_GENERATOR_IDENTITY,
      },
    },
  },
};

test("readiness requires the owned run token and exact source/generated fingerprint", () => {
  const valid = {
    ready: true,
    schemaVersion: QA_READINESS_SCHEMA_VERSION,
    runToken: "owned-run",
    fingerprint,
  };
  assert.equal(validateQaReadiness(valid, {
    expectedRunToken: "owned-run",
    expectedFingerprint: fingerprint,
  }).passed, true);
  assert.match(
    validateQaReadiness(valid, {
      expectedRunToken: "stale-run",
      expectedFingerprint: fingerprint,
    }).errors.join(" | "),
    /run token/,
  );
  assert.match(
    validateQaReadiness(valid, {
      expectedRunToken: "owned-run",
      expectedFingerprint: { ...fingerprint, profile: "blockout" },
    }).errors.join(" | "),
    /fingerprint/,
  );
  const changedWorktree = structuredClone(fingerprint);
  changedWorktree.git.contentSha256 = "e".repeat(64);
  assert.match(
    validateQaReadiness(valid, {
      expectedRunToken: "owned-run",
      expectedFingerprint: changedWorktree,
    }).errors.join(" | "),
    /fingerprint/,
  );
});

test("dirty worktree fingerprint changes when dirty file content changes", async () => {
  const repo = await mkdtemp(path.join(os.tmpdir(), "clawd-qa-fingerprint-"));
  try {
    await execFileAsync("git", ["init", "-q"], { cwd: repo });
    await writeFile(path.join(repo, "tracked.txt"), "committed\n");
    await execFileAsync("git", ["add", "tracked.txt"], { cwd: repo });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.name=QA Test",
        "-c",
        "user.email=qa@example.invalid",
        "commit",
        "-qm",
        "fixture",
      ],
      { cwd: repo },
    );

    const clean = await collectDirtyWorktreeFingerprint(repo);
    assert.equal(clean.dirty, false);
    assert.equal(clean.dirtyFileCount, 0);

    await writeFile(path.join(repo, "tracked.txt"), "first dirty value\n");
    const first = await collectDirtyWorktreeFingerprint(repo);
    await writeFile(path.join(repo, "tracked.txt"), "second dirty value\n");
    const second = await collectDirtyWorktreeFingerprint(repo);
    assert.equal(first.dirty, true);
    assert.equal(first.dirtyFileCount, 1);
    assert.equal(first.statusSha256, second.statusSha256);
    assert.notEqual(first.contentSha256, second.contentSha256);

    await writeFile(path.join(repo, "untracked.txt"), "untracked\n");
    const withUntracked = await collectDirtyWorktreeFingerprint(repo);
    assert.equal(withUntracked.dirtyFileCount, 2);
    assert.notEqual(withUntracked.statusSha256, second.statusSha256);
    assert.notEqual(withUntracked.contentSha256, second.contentSha256);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("BASE_URL is an explicit external override with QA_BASE_URL as fallback", () => {
  assert.equal(resolveQaBaseUrlOverride({
    BASE_URL: "http://explicit.example/",
  }), "http://explicit.example/");
  assert.equal(resolveQaBaseUrlOverride({
    QA_BASE_URL: "http://fallback.example/",
  }), "http://fallback.example/");
});

test("external QA servers accept an explicit BASE_URL-compatible override only with opt-in", async () => {
  await assert.rejects(
    startQaServer({
      baseUrlOverride: "http://127.0.0.1:43210/",
      allowExternal: false,
      fingerprint,
    }),
    /BASE_URL\/QA_BASE_URL override requires ALLOW_EXTERNAL_QA_SERVER=1/,
  );
  await assert.rejects(
    startQaServer({
      baseUrlOverride: "http://127.0.0.1:43210/",
      allowExternal: true,
      externalRunToken: "",
      fingerprint,
    }),
    new RegExp(EXTERNAL_QA_RUN_TOKEN_ENV),
  );
});

test("external QA opt-in verifies the caller-supplied run token", async () => {
  let receivedOptions = null;
  const result = await startQaServer({
    baseUrlOverride: "http://127.0.0.1:43210/",
    allowExternal: true,
    externalRunToken: "explicit-external-run",
    fingerprint,
    waitForServer: async (_baseUrl, options) => {
      receivedOptions = options;
      return {
        ready: true,
        schemaVersion: QA_READINESS_SCHEMA_VERSION,
        runToken: "explicit-external-run",
        fingerprint,
      };
    },
  });
  assert.equal(receivedOptions.expectedRunToken, "explicit-external-run");
  assert.deepEqual(receivedOptions.expectedFingerprint, fingerprint);
  assert.equal(result.runToken, "explicit-external-run");
  assert.equal(result.owned, false);
});

test("generated provenance must identify the current source hashes before browser startup", () => {
  assert.equal(validateGeneratedSourceFingerprint(fingerprint).passed, true);
  const stale = structuredClone(fingerprint);
  stale.files.generatedMap.generatedFrom.sha256 = "c".repeat(64);
  assert.match(
    validateGeneratedSourceFingerprint(stale).errors.join(" | "),
    /source SHA-256 does not match/,
  );
  const wrongGenerator = structuredClone(fingerprint);
  wrongGenerator.files.generatedShots.generatedFrom.generator = "other-generator.mjs";
  assert.match(
    validateGeneratedSourceFingerprint(wrongGenerator).errors.join(" | "),
    /generator identity/,
  );
});

test("server identity mismatch fails immediately instead of polling a stale server", async () => {
  let calls = 0;
  await assert.rejects(
    waitForQaServer("http://127.0.0.1:43210/", {
      expectedRunToken: "current-run",
      expectedFingerprint: fingerprint,
      timeoutMs: 10_000,
      fetchImpl: async () => {
        calls += 1;
        return {
          ok: true,
          async json() {
            return {
              ready: true,
              schemaVersion: QA_READINESS_SCHEMA_VERSION,
              runToken: "stale-run",
              fingerprint,
            };
          },
        };
      },
    }),
    /identity mismatch.*run token/,
  );
  assert.equal(calls, 1);
});

test("withQaServer closes its owned server after success", async () => {
  let closed = 0;
  const result = await withQaServer(async ({ baseUrl }) => baseUrl, {
    startServer: async () => ({
      baseUrl: "http://127.0.0.1:43210/",
      owned: true,
      async close() {
        closed += 1;
      },
    }),
  });
  assert.equal(result, "http://127.0.0.1:43210/");
  assert.equal(closed, 1);
});

test("withQaServer always closes its owned server when the callback fails", async () => {
  let closed = 0;
  const startServer = async () => ({
    baseUrl: "http://127.0.0.1:43210/",
    owned: true,
    async close() {
      closed += 1;
    },
  });

  await assert.rejects(
    withQaServer(async () => {
      throw new Error("expected callback failure");
    }, { startServer }),
    /expected callback failure/,
  );
  assert.equal(closed, 1);
});
