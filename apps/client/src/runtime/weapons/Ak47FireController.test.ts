import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { Ak47FireController, type Ak47ShotEvent } from "./Ak47FireController";
import { WorldColliders } from "../sim/collision/WorldColliders";

const PLAYABLE_BOUNDARY = { x: -100, y: -100, w: 200, h: 200 };

function emptyWorld(): WorldColliders {
  return new WorldColliders([], PLAYABLE_BOUNDARY);
}

function walledWorld(): WorldColliders {
  return new WorldColliders(
    [
      {
        id: "wall_front",
        kind: "wall",
        min: { x: -10, y: 0, z: -12 },
        max: { x: 10, y: 6, z: -10 },
      },
    ],
    PLAYABLE_BOUNDARY,
  );
}

function fireOneShot(world: WorldColliders, forward: Vector3): Ak47ShotEvent[] {
  const controller = new Ak47FireController({ seed: 7 });
  const shots: Ak47ShotEvent[] = [];
  controller.update(
    {
      deltaSeconds: 1 / 60,
      fireHeld: true,
      shotBudget: 1,
      origin: new Vector3(0, 1.7, 0),
      forward,
      grounded: true,
      speedMps: 0,
      world,
    },
    (shot) => shots.push(shot),
  );
  return shots;
}

// Regression: enemy hit registration re-raycasts the shot from the shot event.
// If a bullet that reaches open sky reports no usable ray, every enemy standing
// in front of open sky (on a roof, up a ramp, anywhere the aim ray escapes the
// map) becomes immune to that shot.
test("a shot that hits no world geometry still reports a usable bullet ray", () => {
  const shots = fireOneShot(emptyWorld(), new Vector3(0, 0, -1));

  assert.equal(shots.length, 1);
  const shot = shots[0]!;
  assert.equal(shot.hit, false);
  assert.equal(shot.hitPoint, undefined);
  assert.ok(
    Number.isFinite(shot.travelDistance) && shot.travelDistance > 0,
    "a missed shot must still travel its full range so enemies along it can be hit",
  );
  const dirLength = Math.hypot(shot.direction.x, shot.direction.y, shot.direction.z);
  assert.ok(Math.abs(dirLength - 1) < 1e-6, "shot direction must be a unit vector");
});

test("a shot that hits world geometry reports the hit distance as its travel distance", () => {
  const shots = fireOneShot(walledWorld(), new Vector3(0, 0, -1));

  assert.equal(shots.length, 1);
  const shot = shots[0]!;
  assert.equal(shot.hit, true);
  assert.ok(shot.hitPoint, "a world hit must report a hit point");
  const hitPoint = shot.hitPoint!;
  const origin = { x: 0, y: 1.7, z: 0 };
  const actualDistance = Math.hypot(
    hitPoint.x - origin.x,
    hitPoint.y - origin.y,
    hitPoint.z - origin.z,
  );
  assert.ok(
    Math.abs(shot.travelDistance - actualDistance) < 1e-3,
    `travelDistance ${shot.travelDistance} should match the hit point distance ${actualDistance}`,
  );
});

// Regression: the reported direction must be the bullet's own spread-applied ray,
// not raw camera forward. If consumers re-raycast with camera forward instead,
// spread and bloom stop affecting enemy hit registration entirely and the weapon
// becomes pinpoint-accurate against enemies regardless of spray.
test("reported shot direction tracks the spread ray, not raw camera forward", () => {
  const controller = new Ak47FireController({ seed: 11 });
  const forward = new Vector3(0, 0, -1);
  const shots: Ak47ShotEvent[] = [];
  const world = emptyWorld();

  // Hold fire long enough to build bloom across a burst.
  for (let frame = 0; frame < 60; frame += 1) {
    controller.update(
      {
        deltaSeconds: 1 / 60,
        fireHeld: true,
        origin: new Vector3(0, 1.7, 0),
        forward,
        grounded: true,
        speedMps: 0,
        world,
      },
      (shot) => shots.push(shot),
    );
  }

  assert.ok(shots.length > 4, `expected a burst of shots, got ${shots.length}`);
  for (const shot of shots) {
    const dirLength = Math.hypot(shot.direction.x, shot.direction.y, shot.direction.z);
    assert.ok(Math.abs(dirLength - 1) < 1e-6, "every shot direction must be a unit vector");
  }
  const deviated = shots.some(
    (shot) =>
      Math.abs(shot.direction.x - forward.x) > 1e-9
      || Math.abs(shot.direction.y - forward.y) > 1e-9
      || Math.abs(shot.direction.z - forward.z) > 1e-9,
  );
  assert.ok(deviated, "spread must make at least one shot deviate from camera forward");
});
