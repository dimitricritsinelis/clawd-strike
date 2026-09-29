import assert from "node:assert/strict";
import test from "node:test";
import { recordAssignedSearchProgress } from "./botSearchProgress.mjs";

const state = (x, targetNodeId = "search-goal", goalX = 10) => ({
  bots: { enemies: [{ id: "bot", position: { x, z: 0 }, targetNodeId, holdPoint: { x: goalX, z: 0 } }] },
});

test("search progress measures movement toward the same assigned goal", () => {
  const progress = {};
  recordAssignedSearchProgress(progress, state(0), state(3));
  recordAssignedSearchProgress(progress, state(3), state(7));
  assert.deepEqual(progress.bot, { distanceClosedM: 7, samples: 2 });
});

test("a stationary bot cannot earn progress by changing goals", () => {
  const progress = {};
  recordAssignedSearchProgress(progress, state(0), state(0, "nearer-goal", 1));
  recordAssignedSearchProgress(progress, state(0, "nearer-goal", 1), state(0, "nearer-goal", 1));
  assert.deepEqual(progress.bot, { distanceClosedM: 0, samples: 1 });
});

test("backtracking cancels progress instead of rewarding waypoint oscillation", () => {
  const progress = {};
  for (let i = 0; i < 10; i++) {
    recordAssignedSearchProgress(progress, state(0), state(1));
    recordAssignedSearchProgress(progress, state(1), state(0));
  }
  assert.deepEqual(progress.bot, { distanceClosedM: 0, samples: 20 });
});
