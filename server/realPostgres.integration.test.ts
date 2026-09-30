import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import type { GameplayProfileIdentity } from "../apps/shared/gameplayProfile.js";

const explicitTestUrl = process.env.TEST_POSTGRES_URL;
if (process.env.REQUIRE_TEST_POSTGRES === "1" && !explicitTestUrl) {
  throw new Error("Set TEST_POSTGRES_URL to an isolated local clawdstrike_test database before running test:postgres.");
}

function isolatedTestUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch {
    throw new Error("TEST_POSTGRES_URL must be a local PostgreSQL test URL.");
  }
  const keys = [...url.searchParams.keys()];
  const socket = url.searchParams.get("host");
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !/^clawdstrike_test(?:_[a-z0-9_]+)?$/.test(decodeURIComponent(url.pathname.slice(1)))
    || keys.some((key) => !["host", "port", "sslmode"].includes(key))
    || new Set(keys).size !== keys.length
    || (socket !== null && !socket.startsWith("/"))
  ) throw new Error("TEST_POSTGRES_URL must target a loopback or Unix-socket clawdstrike_test database; remote and unknown targets are refused.");
  return url;
}

test("PostgreSQL integration refuses remote, production, and ambiguous targets", () => {
  for (const value of [
    "postgres://user:fixture@db.example/clawdstrike_test",
    "postgres://user:fixture@localhost/production",
    "postgres://user:fixture@localhost/clawdstrike_test?host=db.example",
    "postgres://user:fixture@localhost/clawdstrike_test?host=/tmp&host=db.example",
    "postgres://user:fixture@localhost/clawdstrike_test?service=production",
  ]) assert.throws(() => isolatedTestUrl(value), /refused/);
  assert.equal(isolatedTestUrl("postgres://user@127.0.0.1/clawdstrike_test").hostname, "127.0.0.1");
  assert.equal(isolatedTestUrl("postgres://user@localhost/clawdstrike_test?host=/tmp").searchParams.get("host"), "/tmp");
});


test("real PostgreSQL store concurrency, constraints, and connection recovery", {
  skip: explicitTestUrl ? false : "TEST_POSTGRES_URL is not set",
  timeout: 60_000,
}, async (t) => {
  const baseUrl = isolatedTestUrl(explicitTestUrl!);
  const database = `clawdstrike_test_${process.pid}_${Date.now()}`;
  const admin = new Pool({ connectionString: baseUrl.toString(), max: 1 });
  try {
    // Each run owns a new database. Keep it for diagnosis until its disposable
    // server is retired; never truncate another run's evidence.
    await admin.query(`CREATE DATABASE ${database}`);
  } finally { await admin.end(); }
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  process.env.NODE_ENV = "test";
  process.env.POSTGRES_WRITE_URL = url.toString();
  process.env.POSTGRES_READ_URL = url.toString();
  process.env.PRIVACY_HASH_SECRET = randomBytes(32).toString("hex");
  process.env.STATS_ADMIN_TOKEN = randomBytes(32).toString("hex");

  const { createPostgresSharedChampionStore, validateSharedChampionConstraints } = await import("./highScoreStoreImpl.js");
  const { getPool } = await import("./store/connection.js");
  const { GAMEPLAY_PROFILE_IDENTITIES } = await import("../apps/shared/gameplayProfile.js");
  const { deriveSharedChampionBoardKey } = await import("../apps/shared/highScore.js");
  const { sha256Hex, fingerprintClientIp } = await import("./highScoreSecurity.js");
  const { handleSharedChampionRunStartRequest, handleSharedChampionRunFinishRequest } = await import("./highScoreRunApi.js");
  const store = createPostgresSharedChampionStore();
  const control = new Pool({ connectionString: url.toString(), max: 2 });
  const human = GAMEPLAY_PROFILE_IDENTITIES["desktop-human"];
  const agent = GAMEPLAY_PROFILE_IDENTITIES["desktop-agent"];
  const summary = (kills = 1) => ({
    survivalTimeS: 10, kills, headshots: 0, headshotsPerWave: [0],
    shotsFired: kills, shotsHit: kills, accuracy: 100, finalScore: kills * 5,
    deathCause: "enemy-fire" as const,
  });
  const request = (path: string, body: unknown, ip = "192.0.2.1") => new Request(`http://integration.test${path}`, {
    method: "POST",
    headers: { origin: "http://integration.test", "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  const issue = async (name: string, identity: GameplayProfileIdentity = human, expiresAt = new Date(Date.now() + 60_000)) => {
    const tokenHash = sha256Hex(randomBytes(32).toString("hex"));
    await store.issueRunToken({
      runId: randomUUID(), tokenHash, playerName: name,
      controlMode: identity.profileId === "desktop-agent" ? "agent" : "human",
      mapId: "bazaar-map", profileIdentity: identity, expiresAt,
      clientIpFingerprint: null, userAgentFingerprint: null,
    });
    return tokenHash;
  };
  const claim = (tokenHash: string) => store.consumeRunToken({ tokenHash, clientIpFingerprint: null, userAgentFingerprint: null });
  try {
    await t.test("schema initializes and token claims have one concurrent winner", async () => {
      assert.equal(await store.getChampion(human), null);
      const tokenHash = await issue("Atomic Claim");
      const claims = await Promise.all(Array.from({ length: 16 }, () => claim(tokenHash)));
      assert.equal(claims.filter((result) => result.status === "consumed").length, 1);
      assert.equal(claims.filter((result) => result.status === "used").length, 15);
      assert.equal((await claim(await issue("Expired", human, new Date(Date.now() - 1000)))).status, "expired");
    });
    await t.test("API rate reservations enforce the final shared slot under concurrency", async () => {
      const ip = "192.0.2.9";
      const body = { playerName: "Rate Probe", controlMode: "human", mapId: "bazaar-map", ...human };
      const key = `run-start:${fingerprintClientIp(request("/api/run/start", body, ip))}`;
      for (let count = 0; count < 29; count++) assert.equal(await store.consumeRateLimit(key, { windowMs: 60_000, maxRequests: 30 }), true);
      const responses = await Promise.all(Array.from({ length: 10 }, () => handleSharedChampionRunStartRequest(request("/api/run/start", body, ip), store)));
      assert.equal(responses.filter((response) => response.status === 200).length, 1);
      assert.equal(responses.filter((response) => response.status === 429).length, 9);
      await control.query("UPDATE champion_submissions_log SET submitted_at=NOW()-INTERVAL '2 minutes' WHERE client_ip_fingerprint=$1", [key]);
      assert.equal(await store.consumeRateLimit(key, { windowMs: 60_000, maxRequests: 30 }), true);
    });
    await t.test("different rate-limit keys are not globally serialized", async () => {
      const blocker = await control.connect();
      await blocker.query("BEGIN");
      await blocker.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0));", ["blocked-key"]);
      const blocked = store.consumeRateLimit("blocked-key", { windowMs: 60_000, maxRequests: 1 });
      try {
        assert.equal(await store.consumeRateLimit("independent-key", { windowMs: 60_000, maxRequests: 1 }), true);
      } finally { await blocker.query("COMMIT"); blocker.release(); }
      assert.equal(await blocked, true);
    });
    await t.test("competing first-board writes return the committed winner and retain strict greater-than", async () => {
      const records = await Promise.all(Array.from({ length: 8 }, async (_, index) => (await claim(await issue(`Race ${index}`))).record!));
      const blocker = await control.connect();
      await blocker.query("BEGIN");
      await blocker.query("LOCK TABLE shared_champion_runs IN ACCESS EXCLUSIVE MODE");
      const writes = Promise.all(records.map((record, index) => store.finalizeValidatedRun({
        tokenRecord: record, summary: summary(8 - index), score: (8 - index) * 5, elapsedMs: 10_000,
        clientIpFingerprint: null, userAgentFingerprint: null,
      })));
      try {
        // Keep the winning transaction open while competitors take snapshots.
        await new Promise((resolve) => setTimeout(resolve, 100));
      } finally { await blocker.query("COMMIT"); blocker.release(); }
      const results = await writes;
      assert.ok(results.every((result) => result.champion !== null));
      const champion = await store.getChampion(human);
      assert.equal(champion?.score, 40);
      const equalRecord = (await claim(await issue("Equal Score"))).record!;
      const equal = await store.finalizeValidatedRun({ tokenRecord: equalRecord, summary: summary(8), score: 40, elapsedMs: 10_000, clientIpFingerprint: null, userAgentFingerprint: null });
      assert.equal(equal.updated, false);
      assert.equal(equal.champion?.holderName, champion?.holderName);
      await assert.rejects(store.finalizeValidatedRun({ tokenRecord: equalRecord, summary: summary(9), score: 45, elapsedMs: 10_000, clientIpFingerprint: null, userAgentFingerprint: null }), { code: "23505" });
      assert.equal((await store.getChampion(human))?.score, 40, "failed run insert must roll back its score promotion");
      assert.equal(await store.getChampion(agent), null);
    });
    await t.test("validated API finish persists and replay is rejected", async () => {
      const started = await handleSharedChampionRunStartRequest(request("/api/run/start", { playerName: "API Agent", controlMode: "agent", mapId: "bazaar-map", ...agent }), store);
      assert.equal(started.status, 200);
      const issued = await started.json() as { runToken: string };
      await control.query("UPDATE shared_champion_run_tokens SET issued_at=NOW()-INTERVAL '20 seconds' WHERE token_hash=$1", [sha256Hex(issued.runToken)]);
      const finish = () => handleSharedChampionRunFinishRequest(request("/api/run/finish", { runToken: issued.runToken, summary: summary(), ...agent }), store);
      assert.equal((await finish()).status, 200);
      assert.equal((await finish()).status, 409);
      assert.equal((await store.getChampion(agent))?.score, 5);
      assert.equal((await store.getChampion(human))?.score, 40);
    });
    await t.test("real constraints reject invalid data", async () => {
      const validated = await validateSharedChampionConstraints({ connectionString: url.toString() });
      assert.equal(validated.validatedConstraints.length, 4);
      await assert.rejects(control.query("UPDATE shared_champion_scores SET holder_name='bad/name' WHERE board_key=$1", [deriveSharedChampionBoardKey(human)]), { code: "23514" });
      await assert.rejects(control.query("UPDATE shared_champion_scores SET score=-1 WHERE board_key=$1", [deriveSharedChampionBoardKey(human)]), { code: "23514" });
    });
    await t.test("lost idle connections reconnect without crashing or logging credentials", async () => {
      const warnings: string[] = [];
      const warn = console.warn;
      console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(" "));
      try {
        for (const kind of ["read", "write"] as const) {
          const pool = getPool(kind);
          const client = await pool.connect();
          const pid = (await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
          client.release();
          const countBefore = pool.totalCount;
          await control.query("SELECT pg_terminate_backend($1)", [pid]);
          for (let attempt = 0; attempt < 50 && pool.totalCount >= countBefore; attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
          assert.ok(pool.totalCount < countBefore, "the terminated idle client must be discarded");
          assert.equal((await pool.query("SELECT 1 AS connected")).rows[0].connected, 1);
        }
        assert.equal((await store.getChampion(human))?.score, 40);
        assert.equal(warnings.length, 2);
        assert.ok(warnings.every((warning) => !warning.includes("postgres:") && !warning.includes("postgresql:")));
        if (url.password) assert.ok(warnings.every((warning) => !warning.includes(decodeURIComponent(url.password))));
      } finally { console.warn = warn; }
    });
    t.diagnostic(`Retained disposable database: ${database}`);
  } finally { await Promise.all([getPool("read").end(), getPool("write").end(), control.end()]); }
});
