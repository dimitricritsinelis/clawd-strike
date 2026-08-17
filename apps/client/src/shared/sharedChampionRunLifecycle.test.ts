import assert from "node:assert/strict";
import test from "node:test";

import { validateSharedChampionRunSummary } from "../../../shared/highScore.js";
import {
  SharedChampionRunLifecycle,
  createSharedChampionRunSummary,
} from "./sharedChampionRunLifecycle.js";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

test("counts competitive active time only after the matching session is ready", async () => {
  const lifecycle = new SharedChampionRunLifecycle<{ token: string }>();
  const start = deferred<{ token: string } | null>();
  lifecycle.begin(() => start.promise);

  lifecycle.beginActiveFrame(2);
  lifecycle.recordShotFired();
  lifecycle.recordKill(true);
  lifecycle.endActiveFrame();
  assert.equal(lifecycle.getIsCurrentSessionReady(), false);
  start.resolve({ token: "run-1" });
  await start.promise;
  await Promise.resolve();
  assert.equal(lifecycle.getIsCurrentSessionReady(), true);

  lifecycle.beginActiveFrame(1.25);
  for (let killIndex = 0; killIndex < 11; killIndex += 1) {
    lifecycle.recordShotFired();
    lifecycle.recordShotHit();
    lifecycle.recordKill(killIndex === 0 || killIndex === 10);
  }
  lifecycle.endActiveFrame();
  const completion = lifecycle.complete();
  assert.ok(completion);
  assert.equal(completion.activeTimeS, 1.25);
  assert.deepEqual(completion.telemetry, {
    kills: 11,
    headshots: 2,
    headshotsPerWave: [1, 1],
    shotsFired: 11,
    shotsHit: 11,
  });
  const summary = createSharedChampionRunSummary(completion, "enemy-fire");
  assert.deepEqual(summary, {
    survivalTimeS: 1.3,
    kills: 11,
    headshots: 2,
    headshotsPerWave: [1, 1],
    shotsFired: 11,
    shotsHit: 11,
    accuracy: 100,
    finalScore: 69,
    deathCause: "enemy-fire",
  });
  assert.equal(validateSharedChampionRunSummary(summary, 2_000).ok, true);
  assert.deepEqual(await completion.sessionPromise, { token: "run-1" });
  assert.equal(lifecycle.complete(), null, "one episode can only complete once");
});

test("a completed episode keeps its own pending start promise across restart", async () => {
  const lifecycle = new SharedChampionRunLifecycle<{ token: string }>();
  const firstStart = deferred<{ token: string } | null>();
  const secondStart = deferred<{ token: string } | null>();
  const firstGeneration = lifecycle.begin(() => firstStart.promise);
  const firstCompletion = lifecycle.complete();
  assert.ok(firstCompletion);
  assert.equal(firstCompletion.activeTimeS, 0, "pre-session play is never reported as competitive time");
  assert.equal(firstCompletion.telemetry.kills, 0, "pre-session events are excluded with their time");
  assert.equal(
    validateSharedChampionRunSummary(
      createSharedChampionRunSummary(firstCompletion, "enemy-fire"),
      0,
    ).ok,
    true,
    "the 0.1s protocol floor keeps a fast completed episode structurally valid",
  );

  const secondGeneration = lifecycle.begin(() => secondStart.promise);
  assert.notEqual(secondGeneration, firstGeneration);
  firstStart.resolve({ token: "old-run" });
  assert.deepEqual(await firstCompletion.sessionPromise, { token: "old-run" });
  assert.equal(lifecycle.getCurrentGeneration(), secondGeneration);
  assert.equal(lifecycle.getIsCurrentSessionReady(), false);

  secondStart.resolve({ token: "new-run" });
  await secondStart.promise;
  await Promise.resolve();
  assert.equal(lifecycle.getIsCurrentSessionReady(), true);
});

test("a superseded unfinished episode and a failed start both abandon cleanly", async () => {
  const lifecycle = new SharedChampionRunLifecycle<{ token: string }>();
  const supersededStart = deferred<{ token: string } | null>();
  lifecycle.begin(() => supersededStart.promise);
  lifecycle.begin(async () => {
    throw new Error("session unavailable");
  });

  supersededStart.resolve({ token: "must-not-attach" });
  await supersededStart.promise;
  await Promise.resolve();
  assert.equal(lifecycle.getIsCurrentSessionReady(), false);

  const failedCompletion = lifecycle.complete();
  assert.ok(failedCompletion);
  assert.equal(await failedCompletion.sessionPromise, null);
});
