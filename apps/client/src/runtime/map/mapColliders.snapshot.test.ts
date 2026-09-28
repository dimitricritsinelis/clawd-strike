// Gameplay-authority snapshot for the shipped Bazaar map.
//
// Builds, from the committed public map (public/maps/bazaar-map/map_spec.json),
// everything Game.rebuildWorld() hands to the physics world and the spawners:
//   - world colliders: buildBlockout() (boundary walls, perimeter cage) plus
//     buildProps() (anchor-pass shop colliders and the compiled-dressing cover
//     fitted to the prop GLB geometry), exactly as Game concatenates them;
//   - the playable boundary and traversal surfaces WorldColliders receives;
//   - player spawn poses (Game.selectSpawnPose) and the initial enemy spawn
//     placements (EnemyManager.spawn) for spawns A and B.
// Numbers are rounded to 1e-4 m (1e-4 rad for yaw) and rows sorted, then
// compared with mapColliders.snapshot.json.
//
// Headless gaps. Node has no WebGL, image decoding or canvas, so:
//   - prop GLBs load through the real PropModelLibrary with every
//     props/models.json entry (the desktop boot), but images are not decoded;
//   - buildBlockout runs with blockout floors/walls and no door models, as the
//     mobile boot does, and also without the facade library. Its collider
//     producers read only the spec, but a future collider that depends on a
//     render input would not be seen here. Compare with the live list from
//     window.__qa_gameplay_authority_state() in a browser boot when in doubt;
//   - enemy visuals use the capsule fallback (render only).
//
// Regenerate after an intentional gameplay change, and review the JSON diff:
//   UPDATE_COLLIDER_SNAPSHOT=1 pnpm --filter @clawd-strike/client exec tsx --test src/runtime/map/mapColliders.snapshot.test.ts
import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { Scene } from "three";
import { EnemyManager } from "../enemies/EnemyManager";
import { setEnemyVisualModelStreamingEnabled } from "../enemies/EnemyVisual";
import { Game } from "../game/Game";
import { PropModelLibrary } from "../render/models/PropModelLibrary";
import { WorldColliders } from "../sim/collision/WorldColliders";
import { resolveRuntimeSeed } from "../utils/Rng";
import { buildBlockout } from "./buildBlockout";
import { buildProps } from "./buildProps";
import { parseAnchorsSpec, parseBlockoutSpec } from "./types";

const PUBLIC_DIR = new URL("../../../public/", import.meta.url);
const SNAPSHOT_URL = new URL("./mapColliders.snapshot.json", import.meta.url);
const ORIGIN = "http://map-colliders.test/";

// Just enough browser surface for the runtime loaders: fetch serves public/,
// images "decode" to 1x1 and canvases draw nothing.
const noop: any = new Proxy(function () {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? undefined : noop),
  apply: () => noop,
  set: () => true,
});
const stubElement = () => ({ style: {}, addEventListener() {}, removeEventListener() {}, getContext: () => noop });
Object.assign(globalThis, {
  window: { location: { href: ORIGIN } },
  location: { href: ORIGIN },
  self: globalThis,
  document: { createElement: stubElement, createElementNS: stubElement },
  createImageBitmap: async () => ({ width: 1, height: 1, close() {} }),
  ProgressEvent: class extends Event {
    constructor(type: string, init: object) {
      super(type);
      Object.assign(this, init);
    }
  },
  fetch: async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("blob:")) return new Response(await resolveObjectURL(url)?.arrayBuffer());
    if (!url.startsWith(ORIGIN)) throw new Error(`unexpected fetch ${url}`);
    return new Response(await readFile(new URL(decodeURIComponent(new URL(url).pathname.slice(1)), PUBLIC_DIR)));
  },
});
setEnemyVisualModelStreamingEnabled(false);

type Snapshot = Record<string, unknown[]>;

function round(value: unknown): unknown {
  if (typeof value === "number") {
    const rounded = Math.round(value * 1e4) / 1e4;
    return Object.is(rounded, -0) ? 0 : rounded;
  }
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, round(entry)]));
  }
  return value;
}

const byKey = (key: (row: any) => string) => (left: unknown, right: unknown): number => {
  const a = key(left);
  const b = key(right);
  return a < b ? -1 : a > b ? 1 : 0;
};

// One row per line keeps the JSON diff reviewable.
function serialize(snapshot: Snapshot): string {
  const sections = Object.entries(snapshot).map(([name, rows]) => (
    `  ${JSON.stringify(name)}: [\n${rows.map((row) => `    ${JSON.stringify(row)}`).join(",\n")}\n  ]`
  ));
  return `{\n${sections.join(",\n")}\n}\n`;
}

async function buildSnapshot(): Promise<Snapshot> {
  const raw: unknown = JSON.parse(await readFile(new URL("maps/bazaar-map/map_spec.json", PUBLIC_DIR), "utf8"));
  const blockout = parseBlockoutSpec(raw);
  const anchors = parseAnchorsSpec(raw);
  const propModels = await PropModelLibrary.load("/assets/models/environment/bazaar/props/models.json");

  const builtBlockout = buildBlockout(blockout, {
    highVis: false,
    seed: resolveRuntimeSeed(blockout.mapId, null),
    floorMode: "blockout",
    wallMode: "blockout",
    floorQuality: "1k",
    lightingPreset: "golden",
    floorMaterials: null,
    wallMaterials: null,
    anchors,
    wallDetails: { enabled: true, densityScale: null },
    doorModels: null,
    facadeModels: null,
  });
  const builtProps = buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: null,
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels,
    highVis: false,
  });
  const colliders = [...builtBlockout.colliders, ...builtProps.colliders];
  const traversalSurfaces = blockout.traversalSurfaces ?? [];
  const world = new WorldColliders(colliders, blockout.playable_boundary, traversalSurfaces);

  const playerSpawns: unknown[] = [];
  const enemySpawns: unknown[] = [];
  for (const spawn of ["A", "B"] as const) {
    const pose = Game.prototype["selectSpawnPose"](blockout, spawn);
    playerSpawns.push({ spawn, ...pose });
    const enemies = new EnemyManager(new Scene());
    enemies.setTacticalContext(blockout, anchors);
    enemies.spawn(world, { mode: "initial", playerPos: { x: pose.x, y: pose.y, z: pose.z }, playerSpawnId: spawn });
    for (const enemy of enemies.getDebugSnapshot().enemies) {
      enemySpawns.push({ playerSpawn: spawn, id: enemy.id, ...enemy.position });
    }
  }

  return round({
    playableBoundary: [blockout.playable_boundary],
    colliders: colliders
      .map(({ id, kind, min, max }) => ({ id, kind, min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] }))
      .sort(byKey((row) => `${row.id}\u0000${row.kind}`)),
    traversalSurfaces: [...traversalSurfaces].sort(byKey((row) => row.id)),
    playerSpawns,
    enemySpawns: enemySpawns.sort(byKey((row) => `${row.playerSpawn}\u0000${row.id}`)),
  }) as Snapshot;
}

test("world colliders, traversal surfaces and spawns match the committed snapshot", async (t) => {
  const actual = await buildSnapshot();
  if (process.env.UPDATE_COLLIDER_SNAPSHOT === "1") {
    await writeFile(SNAPSHOT_URL, serialize(actual));
    t.diagnostic(`wrote ${SNAPSHOT_URL.pathname}`);
    return;
  }
  const expected = JSON.parse(await readFile(SNAPSHOT_URL, "utf8")) as Snapshot;
  assert.deepEqual(Object.keys(actual), Object.keys(expected));
  for (const section of Object.keys(expected)) {
    const actualRows = actual[section]!.map((row) => JSON.stringify(row));
    const expectedRows = expected[section]!.map((row) => JSON.stringify(row));
    const message = `${section} changed; if intentional, regenerate with UPDATE_COLLIDER_SNAPSHOT=1 (see header)`;
    assert.deepEqual(
      {
        removed: expectedRows.filter((row) => !actualRows.includes(row)),
        added: actualRows.filter((row) => !expectedRows.includes(row)),
      },
      { removed: [], added: [] },
      message,
    );
    assert.deepEqual(actualRows, expectedRows, message);
  }
});
