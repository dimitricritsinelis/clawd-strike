import assert from "node:assert/strict";
import test from "node:test";

import { handleSharedChampionRunFinishRequest } from "./highScoreRunApi.js";
import {
  MAX_HEADSHOTS_PER_WAVE_ENTRIES,
  normalizeSharedChampionRunSummary,
} from "../apps/shared/highScore.js";
import type { SharedChampionAuditEvent, SharedChampionStore } from "./highScoreStore.js";

function validSummary() {
  return {
    survivalTimeS: 1,
    kills: 1,
    headshots: 0,
    headshotsPerWave: [0],
    shotsFired: 1,
    shotsHit: 1,
    accuracy: 100,
    finalScore: 5,
    deathCause: "enemy-fire" as const,
  };
}

/** Records every DB-touching call so tests can assert on unauthenticated writes. */
function createRecordingStore(): {
  store: SharedChampionStore;
  auditEvents: SharedChampionAuditEvent[];
  championReads: number;
} {
  const auditEvents: SharedChampionAuditEvent[] = [];
  const counters = { championReads: 0 };
  const store = {
    async getChampion() {
      counters.championReads += 1;
      return null;
    },
    async submitCandidate() {
      throw new Error("unexpected submitCandidate");
    },
    async isRateLimited() {
      return false;
    },
    async logSubmission() {},
    async issueRunToken() {
      throw new Error("unexpected issueRunToken");
    },
    async finalizeRun() {
      throw new Error("unexpected finalizeRun");
    },
    async recordAuditEvent(event: SharedChampionAuditEvent) {
      auditEvents.push(event);
    },
  } as unknown as SharedChampionStore;
  return {
    store,
    auditEvents,
    get championReads() {
      return counters.championReads;
    },
  };
}

function runFinishRequest(headers: Record<string, string>, body: unknown): Request {
  return new Request("https://example.test/api/run/finish", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// Regression: transport-level rejections are unauthenticated and fully
// attacker-controlled. Writing an audit row for each one turned a request flood
// into an unbounded write flood against Postgres.
test("a cross-origin run-finish rejection writes no audit row", async () => {
  const recording = createRecordingStore();

  const response = await handleSharedChampionRunFinishRequest(
    runFinishRequest(
      {
        "content-type": "application/json; charset=utf-8",
        origin: "https://attacker.test",
        "user-agent": "flood",
      },
      { runToken: "t", summary: validSummary() },
    ),
    recording.store,
  );

  assert.equal(response.status, 403);
  assert.deepEqual(recording.auditEvents, [], "pre-auth rejections must not write to the database");
});

test("a wrong-content-type run-finish rejection writes no audit row", async () => {
  const recording = createRecordingStore();

  const response = await handleSharedChampionRunFinishRequest(
    runFinishRequest(
      { "content-type": "text/plain", origin: "https://example.test" },
      { runToken: "t", summary: validSummary() },
    ),
    recording.store,
  );

  assert.equal(response.status, 415);
  assert.deepEqual(recording.auditEvents, []);
});

// Regression: /api/run/finish had no size limit, so an oversized body was
// buffered and its summary stored verbatim as JSONB.
test("an oversized run-finish body is rejected before any store access", async () => {
  const recording = createRecordingStore();

  const request = new Request("https://example.test/api/run/finish", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      origin: "https://example.test",
      "content-length": String(1024 * 1024),
    },
    body: JSON.stringify({ runToken: "t", summary: validSummary() }),
  });

  const response = await handleSharedChampionRunFinishRequest(request, recording.store);

  assert.equal(response.status, 413);
  assert.deepEqual(recording.auditEvents, []);
  assert.equal(recording.championReads, 0, "an oversized body must not reach the database at all");
});

// Regression: headshotsPerWave was copied element-by-element with no length
// cap, so a client could post a multi-megabyte array straight into JSONB.
test("an over-long headshotsPerWave array is rejected outright", () => {
  const oversized = {
    ...validSummary(),
    headshotsPerWave: new Array(MAX_HEADSHOTS_PER_WAVE_ENTRIES + 1).fill(1),
  };
  assert.equal(normalizeSharedChampionRunSummary(oversized), null);
});

test("a headshotsPerWave array at the cap is still accepted", () => {
  const atCap = {
    ...validSummary(),
    headshotsPerWave: new Array(MAX_HEADSHOTS_PER_WAVE_ENTRIES).fill(1),
  };
  const normalized = normalizeSharedChampionRunSummary(atCap);
  assert.ok(normalized, "a run exactly at the cap must still normalize");
  assert.equal(normalized.headshotsPerWave.length, MAX_HEADSHOTS_PER_WAVE_ENTRIES);
});

test("a normal run summary still normalizes unchanged", () => {
  const normalized = normalizeSharedChampionRunSummary(validSummary());
  assert.ok(normalized);
  assert.deepEqual(normalized.headshotsPerWave, [0]);
  assert.equal(normalized.kills, 1);
});
