import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { buildProps } from "./buildProps";
import { buildWallDetailPlacements } from "./wallDetailPlacer";
import { parseAnchorsSpec, parseBlockoutSpec, type RuntimeBlockoutZone, type RuntimeRect } from "./types";
import {
  resolveFacadeFaceForSegment,
  resolveFacadeStyleForSegment,
  resolveWallPlaneOverride,
  type FacadeFace,
  type FacadeSegmentFrame,
} from "./wallMaterialAssignment";

const WALKABLE_ZONE_TYPES = new Set([
  "spawn_plaza",
  "main_lane_segment",
  "side_hall",
  "cut",
  "connector",
]);

const DETAIL_ZONE_TYPES = new Set(WALKABLE_ZONE_TYPES);

type Segment = {
  orientation: "vertical" | "horizontal";
  coord: number;
  start: number;
  end: number;
  outward: -1 | 1;
};

type SegmentFrame = FacadeSegmentFrame & {
  lengthM: number;
  tangentX: number;
  tangentZ: number;
};

type SegmentMeta = {
  segment: Segment;
  frame: SegmentFrame;
  zone: RuntimeBlockoutZone | null;
  face: FacadeFace;
  ordinal: number | null;
};

type AuditContext = {
  metas: SegmentMeta[];
  placements: ReturnType<typeof buildWallDetailPlacements>;
};

function zone(id: string, type: string): RuntimeBlockoutZone {
  return {
    id,
    type,
    rect: { x: 10, y: 10, w: 12, h: 16 },
    label: id,
    notes: "semantic facade test fixture",
  };
}

function frameForFace(target: RuntimeBlockoutZone, face: FacadeFace): FacadeSegmentFrame {
  const centerX = target.rect.x + target.rect.w * 0.5;
  const centerZ = target.rect.y + target.rect.h * 0.5;
  switch (face) {
    case "west":
      return { centerX: target.rect.x, centerZ, inwardX: 1, inwardZ: 0 };
    case "east":
      return { centerX: target.rect.x + target.rect.w, centerZ, inwardX: -1, inwardZ: 0 };
    case "south":
      return { centerX, centerZ: target.rect.y, inwardX: 0, inwardZ: 1 };
    case "north":
      return { centerX, centerZ: target.rect.y + target.rect.h, inwardX: 0, inwardZ: -1 };
  }
}

function segmentForFace(target: RuntimeBlockoutZone, face: FacadeFace): Segment {
  switch (face) {
    case "west":
      return { orientation: "vertical", coord: target.rect.x, start: target.rect.y, end: target.rect.y + target.rect.h, outward: -1 };
    case "east":
      return { orientation: "vertical", coord: target.rect.x + target.rect.w, start: target.rect.y, end: target.rect.y + target.rect.h, outward: 1 };
    case "south":
      return { orientation: "horizontal", coord: target.rect.y, start: target.rect.x, end: target.rect.x + target.rect.w, outward: -1 };
    case "north":
      return { orientation: "horizontal", coord: target.rect.y + target.rect.h, start: target.rect.x, end: target.rect.x + target.rect.w, outward: 1 };
  }
}

function buildFixturePlacements(target: RuntimeBlockoutZone, face: FacadeFace) {
  return buildWallDetailPlacements({
    segments: [segmentForFace(target, face)],
    zones: [target],
    anchors: null,
    facadeOverrides: [],
    moduleRegistry: { windowModules: [], doorModules: [], heroBayModules: [] },
    compositionLayoutOverrides: [],
    doorLayoutOverrides: [],
    windowLayoutOverrides: [],
    balconyLayoutOverrides: [],
    seed: 7,
    wallHeightM: 7,
    wallThicknessM: 0.35,
    enabled: true,
    profile: "pbr",
    detailSeed: null,
    density: 0.72,
    maxProtrusionM: 0.3,
  });
}

function rectContainsPoint(rect: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function collectAxisCoordinates(
  rects: Array<{ x: number; y: number; w: number; h: number }>,
  boundary: { x: number; y: number; w: number; h: number },
): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([boundary.x, boundary.x + boundary.w]);
  const ys = new Set<number>([boundary.y, boundary.y + boundary.h]);
  for (const rect of rects) {
    xs.add(rect.x);
    xs.add(rect.x + rect.w);
    ys.add(rect.y);
    ys.add(rect.y + rect.h);
  }
  return {
    xs: [...xs].sort((left, right) => left - right),
    ys: [...ys].sort((left, right) => left - right),
  };
}

function buildInsideGrid(
  walkableRects: Array<{ x: number; y: number; w: number; h: number }>,
  xs: number[],
  ys: number[],
): boolean[][] {
  const rows = ys.length - 1;
  const cols = xs.length - 1;
  const inside = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  for (let yIndex = 0; yIndex < rows; yIndex += 1) {
    for (let xIndex = 0; xIndex < cols; xIndex += 1) {
      const centerX = (xs[xIndex]! + xs[xIndex + 1]!) * 0.5;
      const centerY = (ys[yIndex]! + ys[yIndex + 1]!) * 0.5;
      inside[yIndex]![xIndex] = walkableRects.some((rect) => rectContainsPoint(rect, centerX, centerY));
    }
  }
  return inside;
}

function extractBoundarySegments(inside: boolean[][], xs: number[], ys: number[]): Segment[] {
  const rows = inside.length;
  const cols = inside[0]?.length ?? 0;
  const segments: Segment[] = [];
  const isInside = (xIndex: number, yIndex: number): boolean => (
    xIndex >= 0
    && yIndex >= 0
    && xIndex < cols
    && yIndex < rows
    && (inside[yIndex]?.[xIndex] ?? false)
  );

  for (let yIndex = 0; yIndex < rows; yIndex += 1) {
    for (let xIndex = 0; xIndex < cols; xIndex += 1) {
      if (!inside[yIndex]?.[xIndex]) continue;
      const x0 = xs[xIndex]!;
      const x1 = xs[xIndex + 1]!;
      const y0 = ys[yIndex]!;
      const y1 = ys[yIndex + 1]!;
      if (!isInside(xIndex - 1, yIndex)) {
        segments.push({ orientation: "vertical", coord: x0, start: y0, end: y1, outward: -1 });
      }
      if (!isInside(xIndex + 1, yIndex)) {
        segments.push({ orientation: "vertical", coord: x1, start: y0, end: y1, outward: 1 });
      }
      if (!isInside(xIndex, yIndex - 1)) {
        segments.push({ orientation: "horizontal", coord: y0, start: x0, end: x1, outward: -1 });
      }
      if (!isInside(xIndex, yIndex + 1)) {
        segments.push({ orientation: "horizontal", coord: y1, start: x0, end: x1, outward: 1 });
      }
    }
  }
  return segments;
}

function mergeBoundarySegments(segments: Segment[]): Segment[] {
  const sorted = [...segments].sort((left, right) => (
    left.orientation.localeCompare(right.orientation)
    || left.coord - right.coord
    || left.outward - right.outward
    || left.start - right.start
  ));
  const merged: Segment[] = [];
  for (const segment of sorted) {
    const previous = merged[merged.length - 1];
    if (
      previous
      && previous.orientation === segment.orientation
      && Math.abs(previous.coord - segment.coord) < 1e-6
      && previous.outward === segment.outward
      && Math.abs(previous.end - segment.start) < 1e-6
    ) {
      previous.end = segment.end;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function toSegmentFrame(segment: Segment): SegmentFrame {
  if (segment.orientation === "vertical") {
    return {
      lengthM: segment.end - segment.start,
      centerX: segment.coord,
      centerZ: (segment.start + segment.end) * 0.5,
      tangentX: 0,
      tangentZ: 1,
      inwardX: -segment.outward,
      inwardZ: 0,
    };
  }
  return {
    lengthM: segment.end - segment.start,
    centerX: (segment.start + segment.end) * 0.5,
    centerZ: segment.coord,
    tangentX: 1,
    tangentZ: 0,
    inwardX: 0,
    inwardZ: -segment.outward,
  };
}

function resolveSegmentZone(frame: SegmentFrame, zones: RuntimeBlockoutZone[]): RuntimeBlockoutZone | null {
  const probeX = frame.centerX + frame.inwardX * 0.1;
  const probeZ = frame.centerZ + frame.inwardZ * 0.1;
  return zones
    .filter((candidate) => DETAIL_ZONE_TYPES.has(candidate.type))
    .filter((candidate) => rectContainsPoint(candidate.rect, probeX, probeZ))
    .sort((left, right) => left.rect.w * left.rect.h - right.rect.w * right.rect.h)[0] ?? null;
}

function project(frame: SegmentFrame, position: { x: number; y: number; z: number }) {
  const dx = position.x - frame.centerX;
  const dz = position.z - frame.centerZ;
  return {
    alongS: dx * frame.tangentX + dz * frame.tangentZ,
    inwardN: dx * frame.inwardX + dz * frame.inwardZ,
  };
}

async function buildAuditContext(): Promise<AuditContext> {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const spec = parseBlockoutSpec(raw, specUrl.pathname);
  const walkableRects = spec.zones
    .filter((candidate) => WALKABLE_ZONE_TYPES.has(candidate.type))
    .map((candidate) => candidate.rect);
  const { xs, ys } = collectAxisCoordinates(walkableRects, spec.playable_boundary);
  const segments = mergeBoundarySegments(extractBoundarySegments(buildInsideGrid(walkableRects, xs, ys), xs, ys));
  const metas: SegmentMeta[] = segments.map((segment) => {
    const frame = toSegmentFrame(segment);
    const resolvedZone = resolveSegmentZone(frame, spec.zones);
    return {
      segment,
      frame,
      zone: resolvedZone,
      face: resolveFacadeFaceForSegment(resolvedZone, frame),
      ordinal: null,
    };
  });

  const groups = new Map<string, SegmentMeta[]>();
  for (const meta of metas) {
    if (!meta.zone) continue;
    const key = `${meta.zone.id}:${meta.face}`;
    const list = groups.get(key) ?? [];
    list.push(meta);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((left, right) => left.segment.start - right.segment.start);
    list.forEach((meta, index) => {
      meta.ordinal = index + 1;
    });
  }

  return {
    metas,
    placements: buildWallDetailPlacements({
      segments,
      zones: spec.zones,
      anchors: null,
      facadeOverrides: spec.wall_details.facadeOverrides,
      moduleRegistry: spec.wall_details.moduleRegistry,
      compositionLayoutOverrides: spec.wall_details.compositionLayoutOverrides,
      doorLayoutOverrides: spec.wall_details.doorLayoutOverrides,
      windowLayoutOverrides: spec.wall_details.windowLayoutOverrides,
      balconyLayoutOverrides: spec.wall_details.balconyLayoutOverrides,
      seed: 1,
      wallHeightM: spec.defaults.wall_height,
      wallThicknessM: spec.defaults.wall_thickness,
      enabled: spec.wall_details.enabled,
      profile: "pbr",
      detailSeed: null,
      density: spec.wall_details.density,
      maxProtrusionM: spec.wall_details.maxProtrusion,
    }),
  };
}

function findSegmentMeta(
  metas: SegmentMeta[],
  position: { x: number; y: number; z: number },
  maxNormalDistance = 0.55,
): SegmentMeta | null {
  return metas
    .map((meta) => ({ meta, local: project(meta.frame, position) }))
    .filter(({ meta, local }) => (
      Math.abs(local.alongS) <= meta.frame.lengthM * 0.5 + 0.25
      && Math.abs(local.inwardN) <= maxNormalDistance
    ))
    .sort((left, right) => Math.abs(left.local.inwardN) - Math.abs(right.local.inwardN))[0]?.meta ?? null;
}

function isOpeningMesh(meshId: string): boolean {
  return meshId.includes("window") || meshId.includes("door");
}

function colliderOverlapsRect(
  collider: { min: { x: number; z: number }; max: { x: number; z: number } },
  rect: RuntimeRect,
): boolean {
  return !(
    collider.max.x <= rect.x
    || collider.min.x >= rect.x + rect.w
    || collider.max.z <= rect.y
    || collider.min.z >= rect.y + rect.h
  );
}

test("keeps legacy v2 materials isolated while v3 uses the authored facade-family palette", () => {
  const m1 = zone("BZ_M1", "main_lane_segment");
  const m2 = zone("BZ_M2_JOG", "main_lane_segment");
  const m3 = zone("BZ_M3", "main_lane_segment");
  const styles = [
    resolveFacadeStyleForSegment(m1, frameForFace(m1, "west")),
    resolveFacadeStyleForSegment(m1, frameForFace(m1, "east")),
    resolveFacadeStyleForSegment(m2, frameForFace(m2, "west")),
    resolveFacadeStyleForSegment(m2, frameForFace(m2, "east")),
    resolveFacadeStyleForSegment(m3, frameForFace(m3, "west")),
    resolveFacadeStyleForSegment(m3, frameForFace(m3, "east")),
  ];

  assert.deepEqual(new Set(styles.map((style) => style.family)), new Set(["merchant", "residential", "service"]));
  assert.ok(new Set(styles.map((style) => style.materials.wall)).size >= 4, "main-lane wall palette collapsed");
  assert.ok(styles.every((style) => style.materials.wall !== "ph_brick_4_desert"));
  assert.equal(styles.filter((style) => style.trimTier === "hero").length, 1, "hero treatment should stay exceptional");

  const connector = zone("CONN_TEST", "connector");
  const cut = zone("CUT_TEST", "cut");
  assert.equal(resolveFacadeStyleForSegment(connector, frameForFace(connector, "north")).materials.wall, "ph_whitewashed_brick_cool");
  assert.equal(resolveFacadeStyleForSegment(cut, frameForFace(cut, "north")).materials.wall, "ph_beige_wall_002");

  const spawnA = zone("SPAWN_A_COURTYARD", "spawn_plaza");
  const spawnB = zone("SPAWN_B_GATE_PLAZA", "spawn_plaza");
  assert.notEqual(resolveFacadeStyleForSegment(spawnA, frameForFace(spawnA, "north")).materials.wall, "ph_brick_4_desert");
  assert.equal(resolveFacadeStyleForSegment(spawnB, frameForFace(spawnB, "north")).materials.wall, "ph_brick_4_desert");
  assert.notEqual(resolveFacadeStyleForSegment(spawnB, frameForFace(spawnB, "south")).materials.wall, "ph_brick_4_desert");
  assert.equal(resolveWallPlaneOverride(spawnB, "north", 1)?.kind, "spawn_b_reference_shell");

  const profiledFixtures = [
    { profile: "active_merchant", family: "merchant" },
    { profile: "quiet_residential", family: "residential" },
    { profile: "covered_arcade", family: "merchant" },
    { profile: "service_storage", family: "service" },
    { profile: "hero_courtyard", family: "merchant" },
  ] as const;
  const v3WallMaterials = new Set<string>();
  for (const fixture of profiledFixtures) {
    const profiledZone = {
      ...zone(`V3_${fixture.profile.toUpperCase()}`, "main_lane_segment"),
      facadeProfileId: fixture.profile,
    };
    const style = resolveFacadeStyleForSegment(profiledZone, frameForFace(profiledZone, "west"));
    v3WallMaterials.add(style.materials.wall);
    assert.equal(style.family, fixture.family, `${fixture.profile} ignored its semantic family`);
    assert.match(style.materials.wall, /^ph_/, `${fixture.profile} left the manifest-backed PBR material family`);
  }
  assert.ok(v3WallMaterials.size >= 4, "v3 facade families collapsed back to one wall material");
  assert.ok(
    [...v3WallMaterials].every((id) => id !== "ph_brick_4_desert"),
    "the legacy red-brick fallback leaked into a v3 facade profile",
  );
});

test("v3 spawn courtyards keep the exterior perimeter sealed while dressing inward faces", () => {
  const spawn = {
    ...zone("BZ_SPAWN_A", "spawn_plaza"),
    facadeProfileId: "hero_courtyard",
  };
  const exterior = buildFixturePlacements(spawn, "south");
  const inward = buildFixturePlacements(spawn, "north");

  assert.ok(exterior.instances.every((instance) => !isOpeningMesh(instance.meshId)), "Spawn A exterior gained fake openings");
  assert.equal(exterior.doorModelPlacements.length, 0, "Spawn A exterior gained a door");
  assert.ok(inward.instances.some((instance) => isOpeningMesh(instance.meshId)), "Spawn A inward courtyard lost its lived-in facade");
});

test("v3 facade profiles resolve stable low, mid, and tall mass classes", () => {
  const resolveHeight = (id: string, facadeProfileId: string): number => {
    const target = {
      ...zone(id, "main_lane_segment"),
      facadeProfileId,
    };
    return buildFixturePlacements(target, "west").segmentHeights[0]!;
  };

  assert.equal(resolveHeight("BZ_W_SERVICE_SOUTH", "service_storage"), 4.5);
  assert.equal(resolveHeight("BZ_E_NORTH_COURT", "quiet_residential"), 7);
  assert.equal(resolveHeight("BZ_E_COVERED_SOUK", "covered_arcade"), 7);
  assert.equal(resolveHeight("BZ_FOUNTAIN_COURT", "hero_courtyard"), 9.5);

  const merchantHeight = resolveHeight("BZ_SPICE_STREET", "active_merchant");
  assert.ok(merchantHeight === 7 || merchantHeight === 9.5);
  assert.equal(resolveHeight("BZ_SPICE_STREET", "active_merchant"), merchantHeight, "merchant massing is nondeterministic");
});

test("main-lane details use semantic windows and preserve material variety", async () => {
  const context = await buildAuditContext();
  const mainDetails = context.placements.instances.filter((instance) => (
    findSegmentMeta(context.metas, instance.position)?.zone?.type === "main_lane_segment"
  ));
  const mainOpenings = mainDetails.filter((instance) => isOpeningMesh(instance.meshId));

  assert.ok(mainOpenings.length > 0, "main lane lost its inhabited facade openings");
  assert.ok(
    mainOpenings.some((instance) => instance.meshId === "window_glass"),
    "main lane did not use the semantic recessed-window facade kit",
  );
  assert.ok(
    mainOpenings.some((instance) => instance.meshId === "window_shutter"),
    "main lane lost its shuttered merchant treatment",
  );
  assert.ok(
    mainOpenings.every((instance) => instance.meshId !== "spawn_window_pointed_arch_frame"),
    "main lane fell back to the Spawn B standardized window module",
  );

  const materialIds = new Set(
    mainDetails.map((instance) => instance.wallMaterialId).filter((materialId): materialId is string => materialId != null),
  );
  assert.ok(materialIds.size >= 2, "main-lane wall material families collapsed into one surface");
  assert.ok([...materialIds].every((materialId) => materialId.startsWith("ph_")));
  assert.ok(!materialIds.has("ph_brick_4_desert"), "canonical red brick leaked back into the main lane");
});

test("sealed connectors, cuts, side halls, and service faces do not advertise fake openings", async () => {
  const context = await buildAuditContext();
  const serviceMetas = context.metas.filter((meta) => (
    meta.zone?.type === "connector"
    || meta.zone?.type === "cut"
    || meta.zone?.type === "side_hall"
    || (meta.zone?.id === "BZ_M2_JOG" && meta.face === "west")
  ));
  assert.ok(serviceMetas.length > 0, "service facade fixtures are missing");

  for (const instance of context.placements.instances) {
    if (!isOpeningMesh(instance.meshId)) continue;
    const meta = findSegmentMeta(serviceMetas, instance.position, 0.35);
    assert.equal(meta, null, `${meta?.zone?.id ?? "service face"} contains a fake ${instance.meshId} opening`);
  }
  for (const placement of context.placements.doorModelPlacements) {
    const meta = findSegmentMeta(serviceMetas, placement.wallSurfacePos, 0.2);
    assert.equal(meta, null, `${meta?.zone?.id ?? "service face"} contains a fake interactive-looking door`);
  }
});

test("stained glass remains a rare spawn-landmark accent", async () => {
  const context = await buildAuditContext();
  const glass = context.placements.instances.filter((instance) => instance.meshId.includes("glass"));
  const stained = glass.filter((instance) => instance.detailMaterialId?.startsWith("tm_stained_glass"));
  const ordinary = glass.filter((instance) => !instance.detailMaterialId?.startsWith("tm_stained_glass"));

  assert.ok(stained.length > 0, "landmark stained glass is missing");
  assert.ok(ordinary.length > 0, "all glazing became landmark stained glass");
  assert.ok(stained.length < glass.length, "stained glass is no longer an accent");

  for (const instance of stained) {
    const meta = findSegmentMeta(context.metas, instance.position);
    assert.equal(meta?.zone?.type, "spawn_plaza", `stained glass leaked into ${meta?.zone?.id ?? "an unknown facade"}`);
  }
});

test("procedural bazaar props remain deterministic, culled, and clear-zone safe without model assets", async () => {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  const anchors = parseAnchorsSpec(raw, specUrl.pathname);
  const options = {
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propChaos: { profile: "high" as const, jitter: 0.7, cluster: 0.85, density: 1 },
    propVisuals: "blockout" as const,
    propModels: null,
    highVis: false,
  };
  const first = buildProps(options);
  const second = buildProps(options);

  assert.deepEqual(first.stats, second.stats);
  assert.deepEqual(first.colliders, second.colliders);
  assert.ok(first.stats.collidersPlaced > 0, "procedural dressing produced no gameplay cover");

  const clearRects = blockout.zones
    .filter((candidate) => candidate.type === "clear_travel_zone")
    .map((candidate) => candidate.rect);
  for (const candidate of blockout.zones) {
    if (typeof candidate.clearWidthM !== "number") continue;
    if (candidate.type === "connector" || candidate.type === "cut") {
      clearRects.push(candidate.rect);
      continue;
    }
    const width = Math.min(candidate.rect.w, candidate.clearWidthM);
    clearRects.push({
      x: candidate.rect.x + (candidate.rect.w - width) * 0.5,
      y: candidate.rect.y,
      w: width,
      h: candidate.rect.h,
    });
  }
  for (const collider of first.colliders) {
    assert.ok(
      clearRects.every((rect) => !colliderOverlapsRect(collider, rect)),
      `${collider.id} intrudes into an authored clear-travel zone`,
    );
  }
  const terraceCover = first.colliders.find((collider) => collider.id.startsWith("COVER_TEA_01"));
  assert.ok(terraceCover, "tea terrace gameplay cover is missing");
  assert.ok(terraceCover.min.y >= 1.39, "tea terrace cover sank below its authored 1.4m surface");

  const blockoutGroup = first.root.getObjectByName("map-props-blockout");
  assert.ok(blockoutGroup, "procedural prop group is missing");
  const batchNames = new Set(blockoutGroup!.children.map((child) => child.name));
  assert.ok(batchNames.has("prop-shopfront"), "market stalls are missing");
  assert.ok(batchNames.has("prop-canopy") || batchNames.has("prop-canopy-teal"), "cloth canopies are missing");
  assert.equal(
    batchNames.has("prop-threshold-rug"),
    false,
    "the removed unsupported route textile returned to the fallback prop layer",
  );
  assert.ok(batchNames.has("prop-landmark-cart"), "Caravan Court cart landmark is missing");
  assert.ok(
    [...batchNames].some((name) => name.startsWith("prop-stall-filler-")),
    "crate, sack, and pottery filler clusters are missing",
  );

  for (const child of blockoutGroup!.children) {
    const batch = child as typeof child & {
      frustumCulled?: boolean;
      boundingSphere?: unknown;
      computeBoundingSphere?: () => void;
    };
    if (!batch.computeBoundingSphere) continue;
    assert.equal(batch.frustumCulled, true, `${child.name} disabled frustum culling`);
    assert.ok(batch.boundingSphere, `${child.name} lacks a computed instanced bound`);
  }

  const shopfront = blockoutGroup!.getObjectByName("prop-shopfront") as typeof blockoutGroup & {
    geometry?: { attributes?: { position?: { count: number } } };
  };
  assert.ok((shopfront.geometry?.attributes?.position?.count ?? 0) > 24, "shopfront fallback regressed to a plain cube");
});
