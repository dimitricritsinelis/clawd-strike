import assert from "node:assert/strict";
import test from "node:test";
import { CROUCH_HEIGHT_M, PLAYER_HEIGHT_M, PlayerController } from "./PlayerController";
import { EnemyController, ENEMY_TIER_PROFILES, type EnemyDirective } from "../enemies/EnemyController";
import { createLineOfSightScratch, hasLineOfSight } from "../enemies/enemyLineOfSight";
import { TraversalSurfaceResolver, type TraversalSurfaceLike } from "./TraversalSurfaceResolver";
import { WorldColliders } from "./collision/WorldColliders";
import { raycastFirstHit, type RaycastAabbHit } from "./collision/raycastAabb";
import { Vector3 } from "three";

const boundary = { x: 0, y: 0, w: 12, h: 14 };

const terraceSurfaces: TraversalSurfaceLike[] = [
  { id: "ground", zoneId: "GROUND", kind: "flat", rect: { x: 0, y: 0, w: 4, h: 4 }, elevationM: 0 },
  {
    id: "ramp",
    zoneId: "RAMP",
    kind: "ramp",
    rect: { x: 0, y: 4, w: 4, h: 4 },
    axis: "y",
    startElevationM: 0,
    endElevationM: 1.4,
  },
  { id: "terrace", zoneId: "TERRACE", kind: "flat", rect: { x: 0, y: 8, w: 4, h: 4 }, elevationM: 1.4 },
];

test("samples flat and linear ramp elevations deterministically", () => {
  const resolver = new TraversalSurfaceResolver(terraceSurfaces);
  assert.equal(resolver.sample(2, 2)?.elevationM, 0);
  assert.ok(Math.abs((resolver.sample(2, 6)?.elevationM ?? 0) - 0.7) < 1e-6);
  assert.equal(resolver.sample(2, 10)?.elevationM, 1.4);
  assert.equal(resolver.maxElevationM, 1.4);
});

test("raycasts against the authored ramp plane", () => {
  const resolver = new TraversalSurfaceResolver(terraceSurfaces);
  const hit = resolver.raycast({ x: 2, y: 5, z: 6 }, { x: 0, y: -1, z: 0 }, 10);
  assert.ok(hit);
  assert.equal(hit.surfaceId, "ramp");
  assert.ok(Math.abs(hit.point.y - 0.7) < 1e-6);
  assert.ok(Math.abs(hit.distance - 4.3) < 1e-6);
});

test("player follows a ramp and reaches the raised terrace", () => {
  const world = new WorldColliders([], boundary, terraceSurfaces);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 0, 2);

  for (let frame = 0; frame < 100; frame += 1) {
    player.step(1 / 60, { forward: 1, right: 0, crouchHeld: false, jumpPressed: false }, Math.PI);
  }

  assert.ok(player.getPosition().z > 8);
  assert.ok(Math.abs(player.getPosition().y - 1.4) < 0.01);
  assert.equal(player.getGrounded(), true);
});

test("player cannot auto-step onto an unsupported 1.4m ledge", () => {
  const surfaces: TraversalSurfaceLike[] = [
    { id: "low", zoneId: "LOW", kind: "flat", rect: { x: 0, y: 0, w: 4, h: 4 }, elevationM: 0 },
    { id: "high", zoneId: "HIGH", kind: "flat", rect: { x: 0, y: 4, w: 4, h: 4 }, elevationM: 1.4 },
  ];
  const world = new WorldColliders([], boundary, surfaces);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 0, 2);

  for (let frame = 0; frame < 90; frame += 1) {
    player.step(1 / 60, { forward: 1, right: 0, crouchHeld: false, jumpPressed: false }, Math.PI);
  }

  assert.ok(player.getPosition().z <= 4.01);
  assert.ok(Math.abs(player.getPosition().y) < 0.01);
});

test("world raycasts hit an elevated traversal floor before lower geometry", () => {
  const world = new WorldColliders([], boundary, terraceSurfaces);
  const hit: RaycastAabbHit = {
    distance: 0,
    point: new Vector3(),
    normal: new Vector3(),
    colliderId: "",
    colliderKind: "wall",
  };

  assert.equal(
    raycastFirstHit(world, new Vector3(2, 5, 10), new Vector3(0, -1, 0), 10, hit),
    true,
  );
  assert.equal(hit.colliderId, "terrace");
  assert.equal(hit.colliderKind, "traversal_surface");
  assert.ok(Math.abs(hit.point.y - 1.4) < 1e-6);
});

function simulatePlayer(frameDt: number): { x: number; y: number; z: number } {
  const world = new WorldColliders([], boundary, terraceSurfaces);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 0, 2);
  const frames = Math.round((5 / 3) / frameDt);
  for (let frame = 0; frame < frames; frame += 1) {
    player.step(frameDt, { forward: 1, right: 0, crouchHeld: false, jumpPressed: false }, Math.PI);
  }
  return { ...player.getPosition() };
}

test("surface traversal is equivalent at 30 and 60 fps", () => {
  const at30 = simulatePlayer(1 / 30);
  const at60 = simulatePlayer(1 / 60);
  assert.ok(Math.hypot(at30.x - at60.x, at30.y - at60.y, at30.z - at60.z) < 1e-5);
  assert.ok(Math.abs(at30.y - 1.4) < 0.01);
});

test("enemy grounding follows the same ramp and terrace surfaces", () => {
  const world = new WorldColliders([], boundary, terraceSurfaces);
  const enemy = new EnemyController("enemy-test", "Test", 2, 2, 1234);
  const directive: EnemyDirective = {
    role: "rifler",
    state: "ROTATE",
    tier: 0,
    tierProfile: ENEMY_TIER_PROFILES[0]!,
    assignedNodeId: null,
    targetNodeId: "terrace",
    movePoint: { x: 2, z: 10 },
    holdPoint: null,
    focusPoint: null,
    peekOffsetM: 0,
    allowFire: false,
    aggressive: false,
    hasDirectSight: false,
    directiveAgeS: 0,
    debugReason: "surface traversal test",
  };

  for (let frame = 0; frame < 180; frame += 1) {
    enemy.step(1 / 60, directive, [], world, [enemy.getAabb()], () => {});
  }

  assert.ok(enemy.getPosition().z > 8);
  assert.ok(Math.abs(enemy.getPosition().y - 1.4) < 0.01);
});

test("player remains crouched until full standing headroom is available", () => {
  const world = new WorldColliders(
    [
      {
        id: "low-canopy",
        kind: "prop",
        min: { x: 1, y: 1.45, z: 1 },
        max: { x: 3.2, y: 1.7, z: 3 },
      },
    ],
    boundary,
    terraceSurfaces,
  );
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 0, 2);

  player.step(1 / 60, { forward: 0, right: 0, crouchHeld: true, jumpPressed: false }, 0);
  assert.equal(player.getCurrentHeight(), CROUCH_HEIGHT_M);
  player.step(1 / 60, { forward: 0, right: 0, crouchHeld: false, jumpPressed: false }, 0);
  assert.equal(player.getCurrentHeight(), CROUCH_HEIGHT_M);

  for (let frame = 0; frame < 90; frame += 1) {
    player.step(1 / 60, { forward: 0, right: 1, crouchHeld: false, jumpPressed: false }, 0);
  }
  assert.ok(player.getPosition().x > 3.5);
  assert.equal(player.getCurrentHeight(), PLAYER_HEIGHT_M);
});

test("player jump remains ballistic and lands back on the raised terrace", () => {
  const world = new WorldColliders([], boundary, terraceSurfaces);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 1.4, 10);

  let apexY = player.getPosition().y;
  let observedAirborne = false;
  for (let frame = 0; frame < 120; frame += 1) {
    player.step(
      1 / 60,
      { forward: 0, right: 0, crouchHeld: false, jumpPressed: frame === 0 },
      0,
    );
    apexY = Math.max(apexY, player.getPosition().y);
    observedAirborne ||= !player.getGrounded();
  }

  assert.equal(observedAirborne, true);
  assert.ok(apexY > 2.35, `expected a ballistic apex above 2.35m, got ${apexY}`);
  assert.equal(player.getGrounded(), true);
  assert.ok(Math.abs(player.getPosition().y - 1.4) < 0.01);
});

test("player falls from a raised edge and lands on the authored lower surface", () => {
  const dropSurfaces: TraversalSurfaceLike[] = [
    { id: "upper", zoneId: "UPPER", kind: "flat", rect: { x: 0, y: 0, w: 4, h: 4 }, elevationM: 1.4 },
    { id: "lower", zoneId: "LOWER", kind: "flat", rect: { x: 0, y: 4, w: 4, h: 8 }, elevationM: 0 },
  ];
  const world = new WorldColliders([], boundary, dropSurfaces);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(2, 1.4, 3.4);

  let minimumY = player.getPosition().y;
  let observedAirborne = false;
  let landedOnLower = false;
  for (let frame = 0; frame < 90; frame += 1) {
    player.step(1 / 60, { forward: 1, right: 0, crouchHeld: false, jumpPressed: false }, Math.PI);
    minimumY = Math.min(minimumY, player.getPosition().y);
    observedAirborne ||= !player.getGrounded();
    if (observedAirborne && player.getGrounded() && Math.abs(player.getPosition().y) < 0.01) {
      landedOnLower = true;
      break;
    }
  }

  assert.equal(landedOnLower, true);
  assert.ok(player.getPosition().z > 4);
  assert.ok(minimumY >= -0.01, `player tunneled below the lower floor: ${minimumY}`);
  assert.equal(player.getGrounded(), true);
  assert.ok(Math.abs(player.getPosition().y) < 0.01);
});

test("high-speed movement cannot tunnel through an unsupported raised edge", () => {
  const ledgeSurfaces: TraversalSurfaceLike[] = [
    { id: "low", zoneId: "LOW", kind: "flat", rect: { x: 0, y: 0, w: 4, h: 4 }, elevationM: 0 },
    { id: "high", zoneId: "HIGH", kind: "flat", rect: { x: 0, y: 4, w: 4, h: 4 }, elevationM: 1.4 },
  ];
  const world = new WorldColliders([], boundary, ledgeSurfaces);
  const player = new PlayerController(48);
  player.setWorld(world);
  player.setSpawn(2, 0, 2);

  for (let frame = 0; frame < 12; frame += 1) {
    player.step(1 / 20, { forward: 1, right: 0, crouchHeld: false, jumpPressed: false }, Math.PI);
  }

  assert.ok(player.getPosition().z <= 4.01, `player tunneled onto the ledge at z=${player.getPosition().z}`);
  assert.ok(Math.abs(player.getPosition().y) < 0.01);
});

test("vertical line of sight is blocked by a raised traversal surface", () => {
  const raisedOnly: TraversalSurfaceLike[] = [
    { id: "raised-floor", zoneId: "RAISED", kind: "flat", rect: { x: 0, y: 0, w: 4, h: 4 }, elevationM: 1.4 },
  ];
  const world = new WorldColliders([], boundary, raisedOnly);
  const scratch = createLineOfSightScratch();

  assert.equal(
    hasLineOfSight(
      { x: 2, y: 0, z: 2 },
      0.2,
      { x: 2, y: 2.8, z: 2 },
      0.2,
      world,
      [],
      scratch,
    ),
    false,
  );
  assert.equal(
    hasLineOfSight(
      { x: 1, y: 1.4, z: 2 },
      1.5,
      { x: 3, y: 1.4, z: 2 },
      1.5,
      world,
      [],
      scratch,
    ),
    true,
  );
});

test("elevated bullet ray ordering selects the nearest surface or collider", () => {
  const hit: RaycastAabbHit = {
    distance: 0,
    point: new Vector3(),
    normal: new Vector3(),
    colliderId: "",
    colliderKind: "wall",
  };
  const lowerGeometryWorld = new WorldColliders(
    [{ id: "lower-slab", kind: "floor_slab", min: { x: 0, y: -0.2, z: 8 }, max: { x: 4, y: 0, z: 12 } }],
    boundary,
    terraceSurfaces,
  );
  assert.equal(
    raycastFirstHit(lowerGeometryWorld, new Vector3(2, 5, 10), new Vector3(0, -1, 0), 10, hit),
    true,
  );
  assert.equal(hit.colliderId, "terrace");
  assert.ok(Math.abs(hit.distance - 3.6) < 1e-6);

  const overheadWorld = new WorldColliders(
    [{ id: "overhead", kind: "wall", min: { x: 0, y: 2, z: 8 }, max: { x: 4, y: 2.2, z: 12 } }],
    boundary,
    terraceSurfaces,
  );
  assert.equal(
    raycastFirstHit(overheadWorld, new Vector3(2, 5, 10), new Vector3(0, -1, 0), 10, hit),
    true,
  );
  assert.equal(hit.colliderId, "overhead");
  assert.ok(Math.abs(hit.distance - 2.8) < 1e-6);
});
