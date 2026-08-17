import assert from "node:assert/strict";
import test from "node:test";
import {
  CROUCH_EYE_HEIGHT_M,
  CROUCH_HEIGHT_M,
  PLAYER_EYE_HEIGHT_M,
  PLAYER_HEIGHT_M,
  PlayerController,
} from "./PlayerController";
import { WorldColliders } from "./collision/WorldColliders";
import { ENEMY_EYE_HEIGHT_M } from "../enemies/EnemyController";

const PLAYABLE_BOUNDARY = { x: -100, y: -100, w: 200, h: 200 };
const IDLE_INPUT = { forward: 0, right: 0, crouchHeld: false, jumpPressed: false };

/**
 * Regression: enemies aimed at a hardcoded ENEMY_EYE_HEIGHT_M above the
 * target's feet. A crouching player's collision box only reaches
 * CROUCH_HEIGHT_M, so every shot passed over their head and crouching was a
 * total immunity to enemy fire at close range. The aim point must sit inside
 * the target's box in BOTH stances.
 */
test("the enemy aim point lands inside the player's box while standing", () => {
  const aimHeight = Math.min(PLAYER_EYE_HEIGHT_M, ENEMY_EYE_HEIGHT_M);
  assert.ok(aimHeight > 0 && aimHeight < PLAYER_HEIGHT_M, `aim ${aimHeight} outside standing box`);
});

test("the enemy aim point lands inside the player's box while crouched", () => {
  const aimHeight = Math.min(CROUCH_EYE_HEIGHT_M, ENEMY_EYE_HEIGHT_M);
  assert.ok(
    aimHeight < CROUCH_HEIGHT_M,
    `aim ${aimHeight} is at or above the crouched box top ${CROUCH_HEIGHT_M} — crouch would be immune`,
  );
});

test("the old fixed aim height would have missed a crouching player entirely", () => {
  // Documents the defect this guards against: the previous constant aim point
  // sat above the crouched collision box.
  assert.ok(
    ENEMY_EYE_HEIGHT_M > CROUCH_HEIGHT_M,
    "if this ever stops being true the regression guard above is meaningless",
  );
});

/**
 * Regression: bounds clamping only constrained X/Z. With no floor collider and
 * no traversal surface under a spot, the player fell forever — no death, no
 * respawn, a permanently soft-locked run.
 */
test("falling out of the world returns the player to solid ground", () => {
  const world = new WorldColliders([], PLAYABLE_BOUNDARY);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(4, 0, 7);

  assert.equal(player.getOutOfWorldRecoveryCount(), 0);

  // No colliders and no surfaces anywhere: this is a pure fall.
  for (let i = 0; i < 400; i += 1) {
    player.step(1 / 60, IDLE_INPUT, 0);
  }

  const position = player.getPosition();
  assert.equal(
    player.getOutOfWorldRecoveryCount() > 0,
    true,
    "the player fell out of the world and was never recovered",
  );
  assert.ok(Number.isFinite(position.y), `y became non-finite: ${position.y}`);
  assert.ok(position.y > -25, `player is still below the world at y=${position.y}`);
  assert.equal(position.x, 4);
  assert.equal(position.z, 7);
});

test("a player standing on solid ground is never teleported", () => {
  const world = new WorldColliders(
    [
      {
        id: "floor",
        kind: "floor_slab",
        min: { x: -20, y: -1, z: -20 },
        max: { x: 20, y: 0, z: 20 },
      },
    ],
    PLAYABLE_BOUNDARY,
  );
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 0, 3);

  for (let i = 0; i < 240; i += 1) {
    player.step(1 / 60, IDLE_INPUT, 0);
  }

  assert.equal(player.getOutOfWorldRecoveryCount(), 0, "solid ground must not trigger recovery");
  assert.ok(player.getPosition().y > -1, "player should be resting on the slab");
});

test("a zero-delta pause step cannot change player stance or motion", () => {
  const world = new WorldColliders(
    [
      {
        id: "floor",
        kind: "floor_slab",
        min: { x: -20, y: -1, z: -20 },
        max: { x: 20, y: 0, z: 20 },
      },
    ],
    PLAYABLE_BOUNDARY,
  );
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 0, 3);
  player.step(1 / 60, IDLE_INPUT, 0);

  const before = {
    position: { ...player.getPosition() },
    velocity: { ...player.getVelocity() },
    height: player.getCurrentHeight(),
    eyeHeight: player.getCurrentEyeHeight(),
    grounded: player.getGrounded(),
    speedMps: player.getHorizontalSpeedMps(),
  };

  player.step(0, {
    forward: 1,
    right: 1,
    crouchHeld: true,
    jumpPressed: true,
  }, Math.PI);

  assert.deepEqual({
    position: { ...player.getPosition() },
    velocity: { ...player.getVelocity() },
    height: player.getCurrentHeight(),
    eyeHeight: player.getCurrentEyeHeight(),
    grounded: player.getGrounded(),
    speedMps: player.getHorizontalSpeedMps(),
  }, before);
});
