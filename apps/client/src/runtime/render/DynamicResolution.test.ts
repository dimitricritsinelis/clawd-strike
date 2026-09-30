import assert from "node:assert/strict";
import test from "node:test";
import { DynamicResolution } from "./DynamicResolution";

/** Feeds `seconds` of frames at a fixed interval; returns the ratio after each change. */
function run(controller: DynamicResolution, clock: { now: number }, intervalMs: number | ((ratio: number) => number), seconds: number): number[] {
  const changes: number[] = [];
  const end = clock.now + seconds * 1000;
  while (clock.now < end) {
    const interval = typeof intervalMs === "number" ? intervalMs : intervalMs(controller.pixelRatio);
    clock.now += interval;
    if (controller.sample(interval, clock.now)) changes.push(controller.pixelRatio);
  }
  return changes;
}

test("hardware that holds 60 fps never leaves full resolution", () => {
  const controller = new DynamicResolution({ maxPixelRatio: 2, minPixelRatio: 1.1 });
  const clock = { now: 0 };
  assert.deepEqual(run(controller, clock, 16.7, 60), []);
  assert.equal(controller.pixelRatio, 2);
});

test("a GPU-bound frame steps down until it holds, never below the floor", () => {
  const controller = new DynamicResolution({ maxPixelRatio: 2, minPixelRatio: 1.1 });
  const clock = { now: 0 };
  // Frame cost scales with pixel count: 30 ms at 2x, 16.9 ms at 1.5x.
  run(controller, clock, (ratio) => 30 * (ratio / 2) ** 2, 20);
  assert.equal(controller.pixelRatio, 1.5);
  const slowest = new DynamicResolution({ maxPixelRatio: 2, minPixelRatio: 1.1 });
  run(slowest, { now: 0 }, (ratio) => 200 * (ratio / 2) ** 2, 60);
  assert.equal(slowest.pixelRatio, 1.1);
  assert.deepEqual(slowest.levels, [2, 1.75, 1.5, 1.25, 1.1]);
});

test("a CPU-bound frame keeps full resolution", () => {
  const controller = new DynamicResolution({ maxPixelRatio: 2, minPixelRatio: 1.1 });
  const clock = { now: 0 };
  run(controller, clock, 25, 30);
  assert.equal(controller.pixelRatio, 2, "fewer pixels did not help, so the step is undone");
});

test("resolution recovers once the load drops, and failed probes back off", () => {
  const controller = new DynamicResolution({ maxPixelRatio: 2, minPixelRatio: 1.1 });
  const clock = { now: 0 };
  run(controller, clock, (ratio) => 30 * (ratio / 2) ** 2, 20);
  assert.ok(controller.pixelRatio < 2);
  // Heavy load persists: probes up fail and are retried progressively later.
  const probes = run(controller, clock, (ratio) => 30 * (ratio / 2) ** 2, 60).filter((ratio) => ratio === 1.75);
  assert.ok(probes.length > 0 && probes.length <= 5, `probes ${probes.length}`);
  // Load drops: full resolution returns.
  run(controller, clock, 10, 120);
  assert.equal(controller.pixelRatio, 2);
});
