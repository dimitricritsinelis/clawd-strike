import type { BoundarySegment } from "./buildBlockout";
import { bz04ReceiverFragments, bz04SectionVisualSegments, type Bz04BoundaryCoverage } from "./bz04Trial";
import { designToWorldVec3, designYawDegToWorldYawRad } from "./coordinateTransforms";
import type { RuntimeBlockoutZone, RuntimeTraversalSurface } from "./types";
import type { DoorModelPlacement } from "./buildDoorModels";
import type { WallDetailInstance, WallDetailMeshId } from "./wallDetailKit";

type FacadeFace = "north" | "south" | "east" | "west";
type MaterialSlot = "wall" | "trim" | "roof" | "timber" | "metal" | "accent";

const CENTRAL_SCREEN_BAYS = new Set([
  "ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_01",
  "ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_03",
  "ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_04",
  "ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_S",
  "ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_N",
  "ARCH_FRONTAGE_COVERED_SOUK_WEST_STORY_1_WINDOW_01",
  "ARCH_FRONTAGE_COVERED_SOUK_WEST_STORY_1_WINDOW_02",
  "ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_STORY_1_WINDOW_01",
  "ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_STORY_1_WINDOW_01",
]);

const AUTHORED_SHUTTER_BAYS = new Set([
  "ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_01",
  ...[1, 2, 3, 4, 5].map((i) => `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_0${i}`),
  ...[1, 2].map((i) => `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_0${i}`),
]);

const DORMANT_FACADE_BAYS = new Set([
  "ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_STORY_1_WINDOW_01",
  "ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_STORY_2_WINDOW_01",
  "ARCH_FRONTAGE_SPAWN_A_NORTH_WEST_GROUND_01",
  "ARCH_FRONTAGE_SPAWN_A_NORTH_EAST_GROUND_01",
]);
function isDormantFacadeModule(module: V3ArchitectureModulePlacement): boolean {
  return (module.frontageId === "FRONTAGE_SERVICE_NORTH_EAST_SPINE_S" && module.moduleKind === "vent")
    || DORMANT_FACADE_BAYS.has(module.id);
}

export type V3ArchitectureMaterialSlots = Record<MaterialSlot, string>;

export type V3MassingProfile = {
  id: string;
  label: string;
  heightM: number;
  depthM: number;
  roofStyle: "flat_parapet" | "setback_flat";
  roofSetbackM: number;
  parapetHeightM: number;
  upperStorySetbackM: number;
};

export type V3FacadeProfile = {
  id: string;
  label: string;
  family: "active_merchant" | "quiet_residential" | "service_storage" | "covered_arcade" | "hero_courtyard";
  massingProfileId: string;
  materialSlots: V3ArchitectureMaterialSlots;
  moduleIds: string[];
};

export type V3ArchitectureMassingPlacement = {
  id: string;
  kind: "massing";
  frontageId: string;
  zoneId: string;
  districtId?: string;
  face: FacadeFace;
  profileId: string;
  massingProfileId: string;
  center: { x: number; y: number; z: number };
  sizeM: { width: number; depth: number; height: number };
  yawDeg: number;
  materialSlots: V3ArchitectureMaterialSlots;
  roof: {
    style: "flat_parapet" | "setback_flat";
    setbackM: number;
    parapetHeightM: number;
    upperStorySetbackM: number;
    elevationM: number;
  };
  /**
   * Registered facade GLB that owns this frontage's street face. The kit still
   * renders the wall mass, roof edge and roof and keeps collision; it drops its
   * face modules and face accessories so the authored asset is the facade.
   */
  facadeModelId?: string;
};

export type V3ArchitectureModulePlacement = {
  id: string;
  kind: "facade_module";
  frontageId: string;
  zoneId: string;
  districtId?: string;
  face: FacadeFace;
  profileId: string;
  moduleId: string;
  moduleKind: "shop_recess" | "door" | "window" | "vent" | "arch" | "column" | "blind_niche";
  openingType: "none" | "recess" | "door_void" | "window_void" | "arch_void";
  datumId: string;
  columnId: string;
  layoutSource: "generated" | "authored";
  center: { x: number; y: number; z: number };
  sizeM: { width: number; depth: number; height: number };
  yawDeg: number;
  materialSlot: MaterialSlot;
  /**
   * Noninteractive façade bays are compiled as false. A true connector keeps
   * its massing cutout, and the cutout shell refuses to close it with a
   * backing volume that could contradict the connector's gameplay collision.
   */
  collisionOpening: boolean;
};

export type V3ArchitecturePlacement = V3ArchitectureMassingPlacement | V3ArchitectureModulePlacement;

export type BuildV3ArchitectureOptions = {
  bz04Courtyard?: boolean;
  bz04SectionOwnedFaces?: ReadonlySet<string>;
  bz04BoundaryCoverage?: readonly Bz04BoundaryCoverage[];
  bz04ReplacedRoofMassings?: ReadonlySet<string>;
  placements: readonly V3ArchitecturePlacement[];
  massingProfiles: readonly V3MassingProfile[];
  facadeProfiles: readonly V3FacadeProfile[];
  segments: readonly BoundarySegment[];
  zones: readonly RuntimeBlockoutZone[];
  traversalSurfaces: readonly RuntimeTraversalSurface[];
  wallHeightM: number;
  fortifiedDoorModelAvailable: boolean;
  /**
   * Visual-only facade segmentation and inset modules. The caller must keep
   * this disabled until its base-wall ownership pass proves that authored
   * massing does not span connector openings; collision remains independent.
   */
  experimentalVisualCutoutMassing?: boolean;
  /**
   * Zone faces (`${zoneId}:${face}`) owned by an authored section GLB. Their kit
   * face accessories are skipped; wall mass, roofs, collision and every other
   * face's kit details stay.
   */
  sectionOwnedFaces?: ReadonlySet<string>;
};

export type FacadeModelPlacement = {
  placementId: string;
  frontageId: string;
  modelId: string;
  /** World-space bottom-center of the street-facing wall plane. */
  base: { x: number; y: number; z: number };
  /** Unit vector from the wall plane toward the street. */
  inward: { x: number; z: number };
  widthM: number;
  heightM: number;
};

export type WallDetailPlacementStats = {
  enabled: boolean;
  seed: number;
  density: number;
  segmentCount: number;
  segmentsDecorated: number;
  instanceCount: number;
};

export type V3ArchitectureBuildResult = {
  instances: WallDetailInstance[];
  doorModelPlacements: DoorModelPlacement[];
  facadeModelPlacements: FacadeModelPlacement[];
  segmentHeights: number[];
  stats: WallDetailPlacementStats;
};

const MIN_DIMENSION_M = 0.02;
// Flat elevated paving is rendered by buildPbrFloors at the authoritative
// traversal elevation. A closed retaining box must stop just below that plane;
// sharing its exact height creates full-footprint coplanar z-fighting across
// Tea Terrace. The PBR edge fascia hides this visual-only recess.
const ELEVATION_FOUNDATION_TOP_CLEARANCE_M = 0.02;
// Merchant joinery must resolve through the loaded rough-pine PBR family even
// when an older facade profile still names the flat balcony template. Keeping
// this at the reusable architecture seam lets per-opening tints and UV offsets
// actually separate neighboring shops.
const MERCHANT_TIMBER_MATERIAL_ID = "ph_worn_planks";
// A visible masonry roof edge needs enough depth to read as a supported slab
// from player height. The former 18 cm wafer disappeared at the North Court
// camera and exposed the shell/roof junction as a razor line.
const ROOF_THICKNESS_M = 0.26;
const WALL_TOP_COPING_HEIGHT_M = 0.14;
const WALL_TOP_COPING_OVERHANG_M = 0.12;
const SKYLINE_EDGE_COPING_HEIGHT_M = 0.12;
const PARAPET_THICKNESS_M = 0.22;
const PARAPET_COPING_HEIGHT_M = 0.18;
const PARAPET_COPING_OVERHANG_M = 0.07;
const SHOP_RECESS_MIN_DEPTH_M = 1;
const SHOP_RECESS_MAX_DEPTH_M = 2;
const SHOP_RECESS_LEGACY_DEPTH_M = 0.6;
const ELEVATION_FOUNDATION_SLICES = 10;
const ELEVATION_FOUNDATION_MATERIAL_ID = "ph_sandstone_blocks_05";
const RAMP_RETAINING_CHEEK_WIDTH_M = 0.24;
const RAMP_RETAINING_CAP_HEIGHT_M = 0.14;
const RAMP_RETAINING_CAP_RISE_M = 0.08;
const RUG_GATE_ZONE_ID = "RUG_GATE";
const RUG_GATE_WEST_COPING_HEIGHT_M = 0.18;
const RUG_GATE_WEST_COPING_WIDTH_M = 0.38;

type FacadeStructureStyle = {
  edgePierWidthM: number;
  projectionM: number;
  edgePierMaxHeightM: number;
  parapetCapHeightM: number;
};

function fail(message: string): never {
  throw new Error(`[v3-architecture] ${message}`);
}

function requirePbrMassingSlots(
  ownerKind: "facade profile" | "massing",
  ownerId: string,
  slots: V3ArchitectureMaterialSlots,
): void {
  for (const slot of ["wall", "roof"] as const) {
    if (!slots[slot].startsWith("ph_")) {
      fail(`${ownerKind} '${ownerId}' must resolve its visible '${slot}' surface to a PBR wall material`);
    }
  }
}

function requirePositiveDimensions(
  placementId: string,
  size: { width: number; depth: number; height: number },
): void {
  for (const [key, value] of Object.entries(size)) {
    if (!Number.isFinite(value) || value < MIN_DIMENSION_M) {
      fail(`placement '${placementId}' has invalid ${key}=${String(value)}`);
    }
  }
}

function faceInward(face: FacadeFace): { x: number; z: number } {
  switch (face) {
    case "west": return { x: 1, z: 0 };
    case "east": return { x: -1, z: 0 };
    case "south": return { x: 0, z: 1 };
    case "north": return { x: 0, z: -1 };
  }
}

function faceTangent(face: FacadeFace): { x: number; z: number } {
  return face === "west" || face === "east"
    ? { x: 0, z: 1 }
    : { x: 1, z: 0 };
}

function offsetPosition(
  position: { x: number; y: number; z: number },
  face: FacadeFace,
  alongM: number,
  inwardM: number,
  verticalM = 0,
): { x: number; y: number; z: number } {
  const inward = faceInward(face);
  const tangent = faceTangent(face);
  return {
    x: position.x + tangent.x * alongM + inward.x * inwardM,
    y: position.y + verticalM,
    z: position.z + tangent.z * alongM + inward.z * inwardM,
  };
}

function resolveFacadeStructureStyle(
  family: V3FacadeProfile["family"],
): FacadeStructureStyle | null {
  switch (family) {
    case "active_merchant":
      return {
        edgePierWidthM: 0.34,
        projectionM: 0.26,
        edgePierMaxHeightM: 3.5,
        parapetCapHeightM: 0.18,
      };
    case "quiet_residential":
      return null;
    case "hero_courtyard":
      return {
        edgePierWidthM: 0.52,
        projectionM: 0.44,
        edgePierMaxHeightM: 9.5,
        parapetCapHeightM: 0.28,
      };
    case "service_storage":
    case "covered_arcade":
      return null;
  }
}

function resolveFacadeModuleOffset(
  placement: V3ArchitectureMassingPlacement,
  module: V3ArchitectureModulePlacement,
): number {
  const center = designToWorldVec3(placement.center);
  const moduleCenter = designToWorldVec3(module.center);
  const tangent = faceTangent(placement.face);
  return (moduleCenter.x - center.x) * tangent.x + (moduleCenter.z - center.z) * tangent.z;
}

function stableUnitInterval(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function scaleHexColor(hex: number, scale: number): number {
  const channel = (shift: number): number => Math.max(0, Math.min(255, Math.round(((hex >> shift) & 0xff) * scale)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

type BuildingMaterialIdentity = {
  wallTintHex: number;
  trimTintHex: number;
  timberTintHex: number;
  roofTintHex: number;
};

/**
 * Per-building wall tints.
 *
 * Each palette spans saturation as well as value, so neighbouring buildings
 * differ in the mix their render was made from, not merely in exposure. The
 * previous sets varied almost entirely in value — quiet_residential spanned a
 * single point of saturation across all six entries — so a street of them
 * resolved into one continuous painted surface with pilasters on it, where the
 * daylight references break hard at every party wall. Every entry stays inside
 * the sand/ochre register; the spread is between neighbours, not away from the
 * palette.
 */
const BUILDING_WALL_TINTS: Readonly<Record<V3FacadeProfile["family"], readonly number[]>> = {
  active_merchant: [0xfff6e5, 0xffefd8, 0xfaecd8, 0xf6e5ce, 0xfff2dd, 0xf8ead5],
  quiet_residential: [0xfff8ea, 0xfff1dc, 0xfaf0e2, 0xf4e5d1, 0xfff5e5, 0xf8eddf],
  service_storage: [0xf9edd9, 0xf4e2c9, 0xf0e5d4, 0xffefd6, 0xf4e9da, 0xfff1df],
  covered_arcade: [0xf8ecd8, 0xf3e4d1, 0xfdf0dd, 0xf0e0ca, 0xfff0d8, 0xf7ead8],
  hero_courtyard: [0xfff2dc, 0xf8e7cc, 0xfff6e4, 0xf3e2cd, 0xfceed7, 0xf9eddd],
};

/**
 * Per-building identity is deterministic from the massing id, never from an
 * individual opening. That keeps alignment/material response coherent within
 * one facade while adjacent massings receive a distinct material+tint key.
 * The continuous brightness component prevents two palette-family neighbors
 * from collapsing back to an identical rendered tint.
 */
function resolveBuildingMaterialIdentity(
  placement: V3ArchitectureMassingPlacement,
  family: V3FacadeProfile["family"],
): BuildingMaterialIdentity {
  const palette = BUILDING_WALL_TINTS[family];
  const paletteUnit = stableUnitInterval(`${placement.id}:building-palette`);
  const paletteIndex = Math.min(palette.length - 1, Math.floor(paletteUnit * palette.length));
  const brightness = 0.92 + stableUnitInterval(`${placement.id}:building-brightness`) * 0.16;
  const wallTintHex = scaleHexColor(palette[paletteIndex]!, brightness);
  const trimBase = family === "active_merchant" || family === "covered_arcade"
    ? 0xfff5e3
    : 0xf9efdf;
  const trimTintHex = scaleHexColor(
    trimBase,
    0.96 + stableUnitInterval(`${placement.id}:building-trim`) * 0.08,
  );
  const timberTintHex = scaleHexColor(
    0xa98563,
    0.96 + stableUnitInterval(`${placement.id}:building-timber`) * 0.16,
  );
  const roofPalette = [0x89765f, 0xa48b68, 0x756b60, 0xb09a77, 0x806d59, 0x9a866c] as const;
  const roofIndex = Math.min(
    roofPalette.length - 1,
    Math.floor(stableUnitInterval(`${placement.id}:roof-palette`) * roofPalette.length),
  );
  const roofTintHex = scaleHexColor(
    roofPalette[roofIndex]!,
    0.94 + stableUnitInterval(`${placement.id}:roof-brightness`) * 0.12,
  );
  return { wallTintHex, trimTintHex, timberTintHex, roofTintHex };
}

function pushInstance(
  instances: WallDetailInstance[],
  placement: {
    placementId: string;
    moduleId: string;
    semanticClass: string;
    meshId: WallDetailMeshId;
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    visualQaDimensions?: { x: number; y: number; z: number };
    backingPlacementId?: string;
    structurallyBacked?: boolean;
    boundaryChamfer?: {
      exposedEnds: "none" | "left" | "right" | "both";
      runM: number;
      topBevel?: {
        heightM: number;
        depthM: number;
      };
    };
    yawRad: number;
    wallMaterialId?: string | null;
    trimMaterialId?: string | null;
    detailMaterialId?: string | null;
    detailTintHex?: number;
    uvProjection?: "world";
    pitchRad?: number;
    rollRad?: number;
  },
): void {
  if (placement.placementId.startsWith("ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING:")
    && /wall-top-coping$|skyline-coping$/.test(placement.placementId)) return;
  requirePositiveDimensions(placement.placementId, {
    width: placement.scale.x,
    depth: placement.scale.z,
    height: placement.scale.y,
  });
  const semanticSurfaceProjection = placement.uvProjection
    ?? (
      placement.meshId === "roof_slab"
      && placement.detailMaterialId?.startsWith("ph_")
        ? "world"
        : undefined
    );
  instances.push({
    placementId: placement.placementId,
    moduleId: placement.moduleId,
    semanticClass: placement.semanticClass,
    meshId: placement.meshId,
    position: placement.position,
    scale: placement.scale,
    ...(placement.visualQaDimensions ? { visualQaDimensions: placement.visualQaDimensions } : {}),
    ...(placement.backingPlacementId ? { backingPlacementId: placement.backingPlacementId } : {}),
    ...(placement.structurallyBacked ? { structurallyBacked: true } : {}),
    ...(placement.boundaryChamfer ? { boundaryChamfer: { ...placement.boundaryChamfer } } : {}),
    yawRad: placement.yawRad,
    ...(typeof placement.pitchRad === "number" ? { pitchRad: placement.pitchRad } : {}),
    ...(typeof placement.rollRad === "number" ? { rollRad: placement.rollRad } : {}),
    ...(semanticSurfaceProjection ? { uvProjection: semanticSurfaceProjection } : {}),
    wallMaterialId: placement.wallMaterialId ?? null,
    trimMaterialId: placement.trimMaterialId ?? null,
    ...(typeof placement.detailMaterialId !== "undefined"
      ? { detailMaterialId: placement.detailMaterialId }
      : {}),
    ...(typeof placement.detailTintHex === "number" ? { detailTintHex: placement.detailTintHex } : {}),
  });
}

type FacadeAperture = {
  placementId: string;
  leftM: number;
  rightM: number;
  bottomY: number;
  topY: number;
};

type FacadeInfillRect = {
  leftM: number;
  rightM: number;
  bottomY: number;
  topY: number;
};

const FACADE_INFILL_FACE_DEPTH_M = 0.02;
const FACADE_FIT_EPSILON_M = 0.001;
const FACADE_BACKING_RECESS_M = 0.62;
const FACADE_RECESS_BACKING_CLEARANCE_M = 0.12;
const FACADE_MIN_CORNER_MASS_WIDTH_M = 0.62;
// Segmented render-only boxes used to terminate exactly on the structural wall
// at each tangent end. Their backing and boundary-infill returns stacked on the
// collision-wall face, producing visible z-fighting (SHOT_07) and unstable
// duplicate-caster bands across paving (SHOT_03). Keep the authored facade span
// unchanged, but recess only those hidden return faces behind the structural
// arris by a tiny deterministic clearance.
const SEGMENTED_SHELL_RETURN_CLEARANCE_M = 0.02;
const FACADE_SKYLINE_BEVEL_HEIGHT_M = 0.25;
const FACADE_DIVIDER_DEPTH_M = 0.48;
const SHARED_MASSING_OVERLAP_RATIO = 0.85;

function createsVisualFacadeCutout(module: V3ArchitectureModulePlacement): boolean {
  if (isDormantFacadeModule(module) || module.moduleId === "inspection_panel") return false;
  return module.moduleKind !== "column";
}

function resolveAuthoredShopRecessDepthM(module: V3ArchitectureModulePlacement): number {
  // Runtime placements inherit the module-spec depth. Older synthetic fixtures
  // predate deep interiors and retain their shallow deterministic fallback.
  if (module.sizeM.depth < SHOP_RECESS_MIN_DEPTH_M) return SHOP_RECESS_LEGACY_DEPTH_M;
  return Math.min(SHOP_RECESS_MAX_DEPTH_M, module.sizeM.depth);
}

function resolveFacadeBackingRecessM(
  modules: readonly V3ArchitectureModulePlacement[],
  massingDepthM: number,
): number {
  const deepestAuthoredShopM = modules
    .filter((module) => module.moduleKind === "shop_recess")
    .filter((module) => module.sizeM.depth >= SHOP_RECESS_MIN_DEPTH_M)
    .reduce((deepestM, module) => Math.max(deepestM, resolveAuthoredShopRecessDepthM(module)), 0);
  const requiredM = Math.max(
    FACADE_BACKING_RECESS_M,
    deepestAuthoredShopM > 0
      ? deepestAuthoredShopM + FACADE_RECESS_BACKING_CLEARANCE_M
      : 0,
  );
  if (requiredM > massingDepthM - MIN_DIMENSION_M) {
    fail(
      `massing depth ${massingDepthM} cannot back a ${deepestAuthoredShopM}m shop recess with `
      + `${FACADE_RECESS_BACKING_CLEARANCE_M}m construction clearance`,
    );
  }
  return requiredM;
}

type MassingFootprint = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function resolveMassingFootprint(placement: V3ArchitectureMassingPlacement): MassingFootprint {
  const tangentWidthM = placement.sizeM.width;
  const normalDepthM = placement.sizeM.depth;
  const normalRunsAlongX = placement.face === "west" || placement.face === "east";
  const widthX = normalRunsAlongX ? normalDepthM : tangentWidthM;
  const widthY = normalRunsAlongX ? tangentWidthM : normalDepthM;
  return {
    minX: placement.center.x - widthX * 0.5,
    maxX: placement.center.x + widthX * 0.5,
    minY: placement.center.y - widthY * 0.5,
    maxY: placement.center.y + widthY * 0.5,
  };
}

function facesOppose(left: FacadeFace, right: FacadeFace): boolean {
  return (left === "west" && right === "east")
    || (left === "east" && right === "west")
    || (left === "north" && right === "south")
    || (left === "south" && right === "north");
}

function footprintOverlapRatio(left: MassingFootprint, right: MassingFootprint): number {
  const overlapX = Math.max(0, Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX));
  const overlapY = Math.max(0, Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY));
  const leftArea = (left.maxX - left.minX) * (left.maxY - left.minY);
  const rightArea = (right.maxX - right.minX) * (right.maxY - right.minY);
  return overlapX * overlapY / Math.min(leftArea, rightArea);
}

/**
 * Opposing frontages may intentionally describe the two faces of one authored
 * building volume. Rendering a complete return/back/roof shell for both made
 * their nearly coincident end walls read as tall sky fins. Keep both authored
 * facade faces, but assign the shared closed volume to one stable placement.
 */
type SharedBackingVolume = {
  centerInwardM: number;
  depthM: number;
};

type MassingShellOwnership = {
  owners: ReadonlySet<string>;
  sharedBackingByOwner: ReadonlyMap<string, SharedBackingVolume>;
  backingOwnerByMassing: ReadonlyMap<string, string>;
};

function resolveMassingShellOwnership(
  placements: readonly V3ArchitecturePlacement[],
  modulesByFrontage: ReadonlyMap<string, readonly V3ArchitectureModulePlacement[]>,
): MassingShellOwnership {
  const massings = placements
    .filter((placement): placement is V3ArchitectureMassingPlacement => placement.kind === "massing")
    .filter((placement) => (
      modulesByFrontage.get(placement.frontageId)?.some(createsVisualFacadeCutout) === true
    ))
    .sort((left, right) => left.id.localeCompare(right.id));
  const owners = new Set(massings.map((placement) => placement.id));
  const sharedBackingByOwner = new Map<string, SharedBackingVolume>();
  const backingOwnerByMassing = new Map(massings.map((placement) => [placement.id, placement.id]));
  for (let leftIndex = 0; leftIndex < massings.length; leftIndex += 1) {
    const left = massings[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < massings.length; rightIndex += 1) {
      const right = massings[rightIndex]!;
      if (!facesOppose(left.face, right.face)) continue;
      if (Math.abs(left.center.z - right.center.z) > 0.08) continue;
      if (Math.abs(left.sizeM.height - right.sizeM.height) > 0.08) continue;
      if (
        footprintOverlapRatio(resolveMassingFootprint(left), resolveMassingFootprint(right))
        < SHARED_MASSING_OVERLAP_RATIO
      ) continue;
      // The input is sorted, so the lexicographically first id deterministically
      // owns the shared backing volume, roof, and parapet.
      const leftCenter = designToWorldVec3(left.center);
      const rightCenter = designToWorldVec3(right.center);
      const leftInward = faceInward(left.face);
      const rightInward = faceInward(right.face);
      const opposingAlignment = leftInward.x * rightInward.x + leftInward.z * rightInward.z;
      if (opposingAlignment > -0.999) {
        fail(`shared massings '${left.id}' and '${right.id}' do not have opposing facade normals`);
      }
      const rightFront = offsetPosition(rightCenter, right.face, 0, right.sizeM.depth * 0.5);
      const rightFrontInLeftSpace = (rightFront.x - leftCenter.x) * leftInward.x
        + (rightFront.z - leftCenter.z) * leftInward.z;
      const leftBackingRecessM = resolveFacadeBackingRecessM(
        modulesByFrontage.get(left.frontageId) ?? [],
        left.sizeM.depth,
      );
      const rightBackingRecessM = resolveFacadeBackingRecessM(
        modulesByFrontage.get(right.frontageId) ?? [],
        right.sizeM.depth,
      );
      const leftBackingFaceM = left.sizeM.depth * 0.5 - leftBackingRecessM;
      const rightBackingFaceM = rightFrontInLeftSpace + rightBackingRecessM;
      const depthM = leftBackingFaceM - rightBackingFaceM;
      if (depthM < MIN_DIMENSION_M) {
        fail(`shared massings '${left.id}' and '${right.id}' have no positive backing volume depth`);
      }
      sharedBackingByOwner.set(left.id, {
        centerInwardM: (leftBackingFaceM + rightBackingFaceM) * 0.5,
        depthM,
      });
      backingOwnerByMassing.set(right.id, left.id);
      owners.delete(right.id);
    }
  }
  return { owners, sharedBackingByOwner, backingOwnerByMassing };
}

function assertFrontageOrientation(
  placement: V3ArchitectureMassingPlacement,
  yawRad: number,
): void {
  const inward = faceInward(placement.face);
  // Authored façade forward is local -Z after design yaw conversion.
  const localFrontWorld = { x: -Math.sin(yawRad), z: -Math.cos(yawRad) };
  const alignment = inward.x * localFrontWorld.x + inward.z * localFrontWorld.z;
  if (alignment < 0.999) {
    fail(`massing '${placement.id}' yaw does not orient its removable face toward '${placement.face}'`);
  }
}

function collectFacadeApertures(
  placement: V3ArchitectureMassingPlacement,
  modules: readonly V3ArchitectureModulePlacement[],
): FacadeAperture[] {
  const center = designToWorldVec3(placement.center);
  const facadeLeftM = -placement.sizeM.width * 0.5;
  const facadeRightM = placement.sizeM.width * 0.5;
  const facadeBottomY = center.y - placement.sizeM.height * 0.5;
  const facadeTopY = center.y + placement.sizeM.height * 0.5;
  return modules
    .filter(createsVisualFacadeCutout)
    .map((module) => {
      if (module.frontageId !== placement.frontageId || module.face !== placement.face) {
        fail(`module '${module.id}' does not belong to massing '${placement.id}' frontage face`);
      }
      const moduleCenter = designToWorldVec3(module.center);
      const alongM = resolveFacadeModuleOffset(placement, module);
      const aperture: FacadeAperture = {
        placementId: module.id,
        leftM: alongM - module.sizeM.width * 0.5,
        rightM: alongM + module.sizeM.width * 0.5,
        bottomY: moduleCenter.y - module.sizeM.height * 0.5,
        topY: moduleCenter.y + module.sizeM.height * 0.5,
      };
      if (CENTRAL_SCREEN_BAYS.has(module.id) || AUTHORED_SHUTTER_BAYS.has(module.id)) {
        // The structural bay remains the stable binding. Its complete SC-C
        // frame seats on a masonry rebate around the smaller inner opening.
        const sill = moduleCenter.y - module.sizeM.height * .5;
        const halfInnerWidth = AUTHORED_SHUTTER_BAYS.has(module.id) ? module.sizeM.width * .5 - .12 : .38;
        aperture.leftM = alongM - halfInnerWidth;
        aperture.rightM = alongM + halfInnerWidth;
        aperture.bottomY = sill + .12;
        aperture.topY = sill + module.sizeM.height - .12;
      }
      if (
        aperture.leftM < facadeLeftM - FACADE_FIT_EPSILON_M
        || aperture.rightM > facadeRightM + FACADE_FIT_EPSILON_M
        || aperture.bottomY < facadeBottomY - FACADE_FIT_EPSILON_M
        || aperture.topY > facadeTopY + FACADE_FIT_EPSILON_M
      ) {
        fail(`module '${module.id}' cutout does not fit massing '${placement.id}' face`);
      }
      return aperture;
    })
    .sort((left, right) => (
      left.leftM - right.leftM
      || left.bottomY - right.bottomY
      || left.placementId.localeCompare(right.placementId)
    ));
}

function buildFacadeInfillRects(
  placement: V3ArchitectureMassingPlacement,
  apertures: readonly FacadeAperture[],
): FacadeInfillRect[] {
  const center = designToWorldVec3(placement.center);
  const facadeLeftM = -placement.sizeM.width * 0.5;
  const facadeRightM = placement.sizeM.width * 0.5;
  const facadeBottomY = center.y - placement.sizeM.height * 0.5;
  const facadeTopY = center.y + placement.sizeM.height * 0.5;
  const rawHorizontalCuts = [
    facadeLeftM,
    ...apertures.flatMap((aperture) => [aperture.leftM, aperture.rightM]),
    facadeRightM,
  ].sort((left, right) => left - right);
  const horizontalCuts: number[] = [];
  for (const cut of rawHorizontalCuts) {
    const previous = horizontalCuts[horizontalCuts.length - 1];
    if (typeof previous !== "number" || Math.abs(previous - cut) > FACADE_FIT_EPSILON_M) {
      horizontalCuts.push(cut);
    }
  }
  const rawVerticalCuts = [
    facadeBottomY,
    ...apertures.flatMap((aperture) => [aperture.bottomY, aperture.topY]),
    facadeTopY,
  ].sort((bottom, top) => bottom - top);
  const verticalCuts: number[] = [];
  for (const cut of rawVerticalCuts) {
    const previous = verticalCuts[verticalCuts.length - 1];
    if (typeof previous !== "number" || Math.abs(previous - cut) > FACADE_FIT_EPSILON_M) {
      verticalCuts.push(cut);
    }
  }

  const rectangles: FacadeInfillRect[] = [];
  for (let verticalIndex = 0; verticalIndex < verticalCuts.length - 1; verticalIndex += 1) {
    const bottomY = verticalCuts[verticalIndex]!;
    const topY = verticalCuts[verticalIndex + 1]!;
    if (topY - bottomY < MIN_DIMENSION_M) continue;
    const midpointY = (bottomY + topY) * 0.5;
    let extendable: FacadeInfillRect | null = null;
    for (let horizontalIndex = 0; horizontalIndex < horizontalCuts.length - 1; horizontalIndex += 1) {
      const leftM = horizontalCuts[horizontalIndex]!;
      const rightM = horizontalCuts[horizontalIndex + 1]!;
      if (rightM - leftM < MIN_DIMENSION_M) continue;
      const midpointM = (leftM + rightM) * 0.5;
      const blocked = apertures.some((aperture) => (
        midpointM > aperture.leftM
        && midpointM < aperture.rightM
        && midpointY > aperture.bottomY
        && midpointY < aperture.topY
      ));
      if (blocked) {
        extendable = null;
        continue;
      }
      if (extendable && Math.abs(extendable.rightM - leftM) <= FACADE_FIT_EPSILON_M) {
        extendable.rightM = rightM;
      } else {
        extendable = { leftM, rightM, bottomY, topY };
        rectangles.push(extendable);
      }
    }
  }
  return rectangles.sort((left, right) => left.leftM - right.leftM || left.bottomY - right.bottomY);
}

function pushMassingVisualShell(
  placement: V3ArchitectureMassingPlacement,
  frontageModules: readonly V3ArchitectureModulePlacement[],
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  shellCenter: { x: number; y: number; z: number },
  yawRad: number,
  ownsSharedShell: boolean,
  sharedBacking: SharedBackingVolume | null,
  backingPlacementId: string,
  identity: BuildingMaterialIdentity,
  faceOwnedByModel: boolean,
): void {
  const apertures = collectFacadeApertures(placement, frontageModules);
  const backingRecessM = resolveFacadeBackingRecessM(frontageModules, placement.sizeM.depth);
  if (apertures.length === 0) {
    pushInstance(instances, {
      placementId: placement.id,
      moduleId: placement.massingProfileId,
      semanticClass: "closed_massing",
      meshId: "facade_wall_shell",
      position: shellCenter,
      // Keep the same return clearance as segmented backing when a GLB
      // replaces its apertures, avoiding coplanar neighboring side walls.
      scale: {
        x: placement.sizeM.width - (placement.facadeModelId ? SEGMENTED_SHELL_RETURN_CLEARANCE_M * 2 : 0),
        y: placement.sizeM.height,
        z: placement.sizeM.depth,
      },
      visualQaDimensions: { x: placement.sizeM.width, y: placement.sizeM.height, z: placement.sizeM.depth },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      trimMaterialId: null,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
    return;
  }

  assertFrontageOrientation(placement, yawRad);
  const collisionOpening = frontageModules.find((module) => module.collisionOpening);
  if (collisionOpening) {
    fail(
      `massing '${placement.id}' cannot place a closed backing volume behind collision opening '${collisionOpening.id}'`,
    );
  }
  if (ownsSharedShell) {
    const backing = sharedBacking ?? {
      centerInwardM: -backingRecessM * 0.5,
      depthM: placement.sizeM.depth - backingRecessM,
    };
    if (backing.depthM < MIN_DIMENSION_M) {
      fail(
        `massing '${placement.id}' depth ${placement.sizeM.depth} leaves no positive backing behind ${backingRecessM}m recess`,
      );
    }
    pushInstance(instances, {
      placementId: placement.id,
      moduleId: placement.massingProfileId,
      semanticClass: "segmented_massing_backing_volume",
      meshId: "facade_wall_shell",
      position: offsetPosition(center, placement.face, 0, backing.centerInwardM),
      scale: {
        x: placement.sizeM.width - SEGMENTED_SHELL_RETURN_CLEARANCE_M * 2,
        y: placement.sizeM.height,
        z: backing.depthM,
      },
      visualQaDimensions: {
        x: placement.sizeM.width,
        y: placement.sizeM.height,
        z: backing.depthM,
      },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      trimMaterialId: null,
      detailMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
  }

  // Reusable render-only contact course: seats kit facade shells on paving
  // while leaving collision, cover, and traversal geometry unchanged. The
  // authored GLB owns the visible face and its grounding detail.
  if (!faceOwnedByModel) {
    pushInstance(instances, {
      placementId: `${placement.id}:facade-plinth`,
      moduleId: `${placement.profileId}_grounding_plinth`,
      semanticClass: "facade_grounding_plinth",
      meshId: "plinth_strip",
      position: offsetPosition(
        { ...center, y: center.y - placement.sizeM.height * 0.5 + 0.12 },
        placement.face,
        0,
        placement.sizeM.depth * 0.5 + 0.025,
      ),
      scale: { x: placement.sizeM.width + 0.04, y: 0.24, z: 0.16 },
      yawRad,
      trimMaterialId: "ph_stone_trim_sandstone",
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
  }

  const infillRects = buildFacadeInfillRects(placement, apertures);
  const facadeLeftM = -placement.sizeM.width * 0.5;
  const facadeRightM = placement.sizeM.width * 0.5;
  const facadeTopY = center.y + placement.sizeM.height * 0.5;
  const skylineMassingRects = infillRects.filter((rectangle) => (
    Math.abs(rectangle.topY - facadeTopY) <= FACADE_FIT_EPSILON_M
  ));

  for (const [index, rectangle] of infillRects.entries()) {
    const sourceWidthM = rectangle.rightM - rectangle.leftM;
    const heightM = rectangle.topY - rectangle.bottomY;
    const touchesLeftSide = Math.abs(rectangle.leftM - facadeLeftM) <= FACADE_FIT_EPSILON_M;
    const touchesRightSide = Math.abs(rectangle.rightM - facadeRightM) <= FACADE_FIT_EPSILON_M;
    const touchesOuterSide = touchesLeftSide || touchesRightSide;
    const touchesSkyline = Math.abs(rectangle.topY - facadeTopY) <= FACADE_FIT_EPSILON_M;
    const isBoundaryMasonry = touchesOuterSide || touchesSkyline;
    const isFullDepthBoundaryMassing = touchesSkyline
      || (touchesOuterSide && sourceWidthM >= FACADE_MIN_CORNER_MASS_WIDTH_M - FACADE_FIT_EPSILON_M);
    const isNarrowEdgeFallback = touchesOuterSide && !isFullDepthBoundaryMassing;
    if (isNarrowEdgeFallback) {
      const hasFullDepthSkylineCover = skylineMassingRects.some((skyline) => (
        skyline.leftM <= rectangle.leftM + FACADE_FIT_EPSILON_M
        && skyline.rightM >= rectangle.rightM - FACADE_FIT_EPSILON_M
        && skyline.rightM - skyline.leftM >= FACADE_MIN_CORNER_MASS_WIDTH_M - FACADE_FIT_EPSILON_M
      ));
      if (touchesSkyline || !hasFullDepthSkylineCover) {
        fail(
          `massing '${placement.id}' boundary infill ${index + 1} has only ${sourceWidthM.toFixed(3)}m tangent width; `
          + `a skyline-visible corner requires at least ${FACADE_MIN_CORNER_MASS_WIDTH_M.toFixed(2)}m`,
        );
      }
    }
    const isMasonryDivider = !isBoundaryMasonry && sourceWidthM <= 0.45 && heightM >= 1.8;
    // A thin front tessellation remains useful around interior apertures. A
    // roofline or outer corner is different: it must be real building mass,
    // extending from the authored facade plane through the complete massing
    // depth. This removes the 62 cm cavity card and its separate 24 cm return.
    // Edge-tight authored bays retain their exact (never clamped) clear strip
    // only below a full-depth upper volume, where it cannot become skyline.
    // Paired public faces need solid window rebates all the way to their
    // shared core, without invading the opposite face's recesses.
    const infillDepthM = sharedBacking || !ownsSharedShell
      ? backingRecessM
      : isFullDepthBoundaryMassing
        ? placement.sizeM.depth
      : isNarrowEdgeFallback
        ? backingRecessM
      : isMasonryDivider
        ? FACADE_DIVIDER_DEPTH_M
        : FACADE_INFILL_FACE_DEPTH_M;
    const renderedLeftM = rectangle.leftM
      + (isBoundaryMasonry && touchesLeftSide
        ? SEGMENTED_SHELL_RETURN_CLEARANCE_M
        : 0);
    const renderedRightM = rectangle.rightM
      - (isBoundaryMasonry && touchesRightSide
        ? SEGMENTED_SHELL_RETURN_CLEARANCE_M
        : 0);
    const widthM = renderedRightM - renderedLeftM;
    if (widthM < MIN_DIMENSION_M) {
      fail(`massing '${placement.id}' boundary infill ${index + 1} cannot fit shared-shell return clearance`);
    }
    pushInstance(instances, {
      placementId: `${placement.id}:facade-infill:${index + 1}`,
      moduleId: isFullDepthBoundaryMassing
        ? `${placement.profileId}_full_depth_boundary_massing`
        : isNarrowEdgeFallback
          ? `${placement.profileId}_recess_edge_fallback`
        : isMasonryDivider
          ? `${placement.profileId}_masonry_divider`
          : `${placement.profileId}_segmented_facade`,
      semanticClass: isMasonryDivider ? "facade_masonry_divider" : "facade_wall_infill",
      meshId: sharedBacking || !ownsSharedShell || isBoundaryMasonry
        ? "facade_wall_shell"
        : isMasonryDivider
          ? "facade_wall_shell"
          : "facade_wall_infill",
      position: offsetPosition(
        { ...center, y: (rectangle.bottomY + rectangle.topY) * 0.5 },
        placement.face,
        (renderedLeftM + renderedRightM) * 0.5,
        placement.sizeM.depth * 0.5 - infillDepthM * 0.5,
      ),
      scale: {
        x: widthM,
        y: heightM,
        z: infillDepthM,
      },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      detailMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
    if (touchesSkyline && placement.zoneId !== RUG_GATE_ZONE_ID) {
      const copingHeightM = SKYLINE_EDGE_COPING_HEIGHT_M;
      const copingBaseY = rectangle.topY
        + (ownsSharedShell ? WALL_TOP_COPING_HEIGHT_M : 0);
      const copingDepthM = placement.sizeM.depth + WALL_TOP_COPING_OVERHANG_M * 2;
      pushInstance(instances, {
        placementId: `${placement.id}:facade-infill:${index + 1}:skyline-coping`,
        moduleId: "frontage_skyline_band_coping",
        semanticClass: "massing_skyline_edge_coping",
        meshId: "roof_slab",
        position: offsetPosition(
          { ...center, y: copingBaseY + SKYLINE_EDGE_COPING_HEIGHT_M * 0.5 },
          placement.face,
          (rectangle.leftM + rectangle.rightM) * 0.5,
          0,
        ),
        scale: {
          x: widthM + WALL_TOP_COPING_OVERHANG_M * 2,
          y: copingHeightM,
          z: copingDepthM,
        },
        visualQaDimensions: {
          x: widthM + WALL_TOP_COPING_OVERHANG_M * 2,
          y: copingHeightM,
          z: copingDepthM,
        },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        detailMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
      });
    }
  }
}

function pushMerchantUpperScreen(
  placement: V3ArchitectureMassingPlacement,
  modules: readonly V3ArchitectureModulePlacement[],
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  bottomY: number,
  timberMaterialId: string,
  timberTintHex: number,
): void {
  const shopOffsets = modules
    .filter((module) => module.moduleKind === "shop_recess")
    .map((module) => resolveFacadeModuleOffset(placement, module));
  const candidates = modules
    .filter((module) => module.moduleKind === "window")
    .map((module) => {
      const moduleCenter = designToWorldVec3(module.center);
      const lowerY = moduleCenter.y - module.sizeM.height * 0.5;
      const alongM = resolveFacadeModuleOffset(placement, module);
      const shopDistanceM = shopOffsets.length > 0
        ? Math.min(...shopOffsets.map((shopOffset) => Math.abs(shopOffset - alongM)))
        : 0;
      return { module, moduleCenter, lowerY, alongM, shopDistanceM };
    })
    .filter((candidate) => candidate.lowerY - bottomY >= 2.8)
    .sort((left, right) => left.shopDistanceM - right.shopDistanceM || right.lowerY - left.lowerY);
  const candidate = candidates[0];
  if (!candidate) return;

  const slabHeightM = 0.1;
  const slabY = candidate.lowerY - 0.1;
  if (slabY - slabHeightM * 0.5 < bottomY + 2.7) return;
  const widthM = Math.min(1.65, candidate.module.sizeM.width + 0.42);
  const projectionM = 0.44;
  const facadeDepthM = placement.sizeM.depth * 0.5;
  pushInstance(instances, {
    placementId: `${placement.id}:upper-screen-slab`,
    moduleId: "active_merchant_upper_screen",
    semanticClass: "active_merchant_upper_screen_slab",
    meshId: "balcony_slab",
    position: offsetPosition(
      { ...center, y: slabY },
      placement.face,
      candidate.alongM,
      facadeDepthM + projectionM * 0.5,
    ),
    scale: { x: widthM, y: slabHeightM, z: projectionM },
    yawRad,
    detailMaterialId: timberMaterialId,
    detailTintHex: timberTintHex,
  });

  const railHeightM = 0.14;
  pushInstance(instances, {
    placementId: `${placement.id}:upper-screen-front-rail`,
    moduleId: "active_merchant_upper_screen",
    semanticClass: "active_merchant_upper_screen_rail",
    meshId: "balcony_parapet",
    position: offsetPosition(
      { ...center, y: slabY + railHeightM * 0.5 + 0.06 },
      placement.face,
      candidate.alongM,
      facadeDepthM + projectionM - 0.035,
    ),
    scale: { x: widthM - 0.08, y: railHeightM, z: 0.07 },
    yawRad,
    detailMaterialId: timberMaterialId,
    detailTintHex: timberTintHex,
  });
  for (const side of [-1, 1] as const) {
    pushInstance(instances, {
      placementId: `${placement.id}:upper-screen-end:${side}`,
      moduleId: "active_merchant_upper_screen",
      semanticClass: "active_merchant_upper_screen_return",
      meshId: "balcony_end_cap",
      position: offsetPosition(
        { ...center, y: slabY + railHeightM * 0.5 + 0.06 },
        placement.face,
        candidate.alongM + side * (widthM * 0.5 - 0.04),
        facadeDepthM + projectionM * 0.5,
      ),
      scale: { x: 0.055, y: railHeightM, z: projectionM - 0.08 },
      yawRad,
      detailMaterialId: timberMaterialId,
      detailTintHex: timberTintHex,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:upper-screen-bracket:${side}`,
      moduleId: "active_merchant_upper_screen",
      semanticClass: "active_merchant_upper_screen_support",
      meshId: "balcony_bracket",
      // Kept short so the corbel stays clear of the sign/awning band below it;
      // a corbel that reaches the signboard reads as being carried by it.
      position: offsetPosition(
        { ...center, y: slabY - 0.15 },
        placement.face,
        candidate.alongM + side * widthM * 0.31,
        facadeDepthM + projectionM * 0.35,
      ),
      scale: { x: 0.085, y: 0.18, z: 0.3 },
      yawRad,
      detailMaterialId: timberMaterialId,
      detailTintHex: timberTintHex,
    });
  }

  const screenBottomY = slabY + railHeightM + 0.08;
  const screenTopY = Math.min(
    candidate.moduleCenter.y + candidate.module.sizeM.height * 0.5 + 0.1,
    center.y + placement.sizeM.height * 0.5 - 0.28,
  );
  const screenHeightM = screenTopY - screenBottomY;
  if (screenHeightM < 0.45) return;
  for (const normalized of [-0.42, 0, 0.42]) {
    pushInstance(instances, {
      placementId: `${placement.id}:upper-screen-post:${normalized}`,
      moduleId: "active_merchant_upper_screen",
      semanticClass: "active_merchant_upper_timber_screen",
      meshId: "door_jamb",
      position: offsetPosition(
        { ...center, y: screenBottomY + screenHeightM * 0.5 },
        placement.face,
        candidate.alongM + normalized * (widthM - 0.18),
        facadeDepthM + projectionM - 0.03,
      ),
      scale: { x: 0.045, y: screenHeightM, z: 0.055 },
      yawRad,
      trimMaterialId: timberMaterialId,
      detailTintHex: timberTintHex,
    });
  }
  for (const y of [screenBottomY, screenTopY]) {
    pushInstance(instances, {
      placementId: `${placement.id}:upper-screen-header:${y}`,
      moduleId: "active_merchant_upper_screen",
      semanticClass: "active_merchant_upper_timber_screen",
      meshId: "door_lintel",
      position: offsetPosition(
        { ...center, y },
        placement.face,
        candidate.alongM,
        facadeDepthM + projectionM - 0.03,
      ),
      scale: { x: widthM - 0.08, y: 0.06, z: 0.07 },
      yawRad,
      trimMaterialId: timberMaterialId,
      detailTintHex: timberTintHex,
    });
  }
}

/**
 * Carries the generated facade datums onto otherwise uninterrupted wall
 * planes. The transition course is derived from the shared ground head and,
 * when present, the first upper sill. It never adds an upper opening: upper
 * bays come only from compiled STORY_ placements, so a frontage without them
 * keeps a blank upper wall. This is render-only relief: the backing shell and
 * every gameplay envelope remain untouched.
 */
/**
 * Merchant elevation order: base course, bay piers, opening head beams, and
 * projecting upper sills.
 *
 * Without these the frontage is a single flat plane with holes cut in it — no
 * load path, nothing for the awnings and signs to cast onto, and no physical
 * reason for the wall base to collect dirt. Every element here is derived from
 * the authored bay centrelines, so the existing rhythm and its deliberate
 * slight irregularity are preserved rather than regularised into a grid.
 *
 * Render-only: all of it projects from the facade face into the zone, well
 * inside the massing's authored depth, and none of it touches collision.
 */
function pushMerchantElevationOrder(
  placement: V3ArchitectureMassingPlacement,
  modules: readonly V3ArchitectureModulePlacement[],
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  center: { x: number; y: number; z: number },
  yawRad: number,
  backingPlacementId: string,
): void {
  if (profile.family !== "active_merchant") return;
  if (placement.sizeM.width < 3) return;

  const identity = resolveBuildingMaterialIdentity(placement, profile.family);
  const bottomY = center.y - placement.sizeM.height * 0.5;
  const faceInwardM = placement.sizeM.depth * 0.5;
  const halfWidthM = placement.sizeM.width * 0.5;

  const resolveModules = (prefix: string) => modules
    .filter((module) => module.datumId.startsWith(prefix) && createsVisualFacadeCutout(module))
    .map((module) => {
      const moduleCenter = designToWorldVec3(module.center);
      const alongM = resolveFacadeModuleOffset(placement, module);
      return {
        module,
        alongM,
        leftM: alongM - module.sizeM.width * 0.5,
        rightM: alongM + module.sizeM.width * 0.5,
        centerY: moduleCenter.y,
      };
    })
    .sort((left, right) => left.alongM - right.alongM);

  const groundModules = resolveModules("GROUND_");
  const upperModules = resolveModules("STORY_");
  if (groundModules.length === 0) return;

  const shadowTint = scaleHexColor(identity.wallTintHex, 0.34);

  // 1. Continuous base course. It runs the full frontage so the wall lands on
  // something instead of being sliced off by the paving.
  const plinthHeightM = 0.46;
  const plinthProjectionM = 0.11;
  pushInstance(instances, {
    placementId: `${placement.id}:merchant-base-course`,
    moduleId: "active_merchant_base_course",
    semanticClass: "active_merchant_base_course",
    meshId: "plinth_strip",
    position: offsetPosition(
      { ...center, y: bottomY + plinthHeightM * 0.5 },
      placement.face,
      0,
      faceInwardM + plinthProjectionM * 0.5,
    ),
    scale: { x: placement.sizeM.width, y: plinthHeightM, z: plinthProjectionM },
    backingPlacementId,
    structurallyBacked: true,
    yawRad,
    trimMaterialId: placement.materialSlots.trim,
    detailTintHex: scaleHexColor(identity.trimTintHex, 0.92),
    uvProjection: "world",
  });
  // Grime line where the base course meets the paving. This band sits in open
  // daylight, unlike the reveals `shadowTint` was mixed for, so it takes a
  // soiled-trim tone instead: at recess darkness it reads as a black bar ruled
  // along the foot of every frontage rather than as dirt. It is also kept
  // nearly flush with the base course, because a strip that stands proud reads
  // as an applied moulding and casts its own second hard edge.
  const contactGrimeTint = scaleHexColor(identity.trimTintHex, 0.62);
  pushInstance(instances, {
    placementId: `${placement.id}:merchant-base-contact`,
    moduleId: "active_merchant_base_course",
    semanticClass: "active_merchant_base_contact",
    meshId: "string_course_strip",
    position: offsetPosition(
      { ...center, y: bottomY + 0.045 },
      placement.face,
      0,
      faceInwardM + plinthProjectionM - 0.012,
    ),
    scale: { x: placement.sizeM.width, y: 0.09, z: 0.05 },
    backingPlacementId,
    structurallyBacked: true,
    yawRad,
    trimMaterialId: placement.materialSlots.trim,
    detailTintHex: contactGrimeTint,
    uvProjection: "world",
  });

  // 2. Bay piers, one per gap between adjacent ground openings, plus the two
  // ends. They run from the base course to the story datum so the elevation
  // finally has verticals carrying the load.
  const sharedHeadY = Math.max(
    ...groundModules.map((entry) => entry.centerY + entry.module.sizeM.height * 0.5),
  );
  const pierTopY = upperModules.length > 0
    ? Math.min(...upperModules.map((entry) => entry.centerY - entry.module.sizeM.height * 0.5)) - 0.18
    : sharedHeadY + 0.6;
  const pierBottomY = bottomY + plinthHeightM;
  if (pierTopY - pierBottomY > 0.8) {
    const gaps: { centerM: number; widthM: number }[] = [];
    let cursorM = -halfWidthM;
    for (const ground of groundModules) {
      gaps.push({ centerM: (cursorM + ground.leftM) * 0.5, widthM: ground.leftM - cursorM });
      cursorM = ground.rightM;
    }
    gaps.push({ centerM: (cursorM + halfWidthM) * 0.5, widthM: halfWidthM - cursorM });

    for (const [index, gap] of gaps.entries()) {
      // Leave a visible margin of plaster either side so the pier reads as
      // masonry standing proud between infill panels, not as the whole gap
      // being filled with stone.
      //
      // Emitting a pier in the narrow 0.48 m gap between two ADJACENT bays was
      // tried (proportional margin, 0.24 m floor) and measured WORSE than
      // leaving the gap bare: continuity breaks down the pier strip went 6 -> 10
      // against the target's 5, and the strip darkened from 81 to 77 against a
      // target of 89. Scaling the flanking arrises with the gap did not recover
      // it either. A 0.29 m pier at this camera is too slight to read as a mass
      // and only adds vertical noise; the gap needs a different treatment, not a
      // thinner version of the wide-gap pier.
      const pierWidthM = Math.min(0.68, gap.widthM - 0.36);
      if (pierWidthM < 0.34) continue;
      // 0.11 m keeps the pier face inside the zone the authored sill goods
      // occupy; at 0.14 m the stone cut across a jar standing at the door.
      const projectionM = 0.11;
      // Coursed stone piers against plaster infill panels. Building the pier
      // from the same smooth plaster as the field made it invisible: with no
      // cast shadow on this east-facing wall, only a material change gives the
      // load path anything to read against.
      pushInstance(instances, {
        placementId: `${placement.id}:merchant-pier:${index}`,
        moduleId: "active_merchant_bay_pier",
        semanticClass: "active_merchant_bay_pier",
        meshId: "pilaster",
        position: offsetPosition(
          { ...center, y: (pierBottomY + pierTopY) * 0.5 },
          placement.face,
          gap.centerM,
          faceInwardM + projectionM * 0.5,
        ),
        scale: { x: pierWidthM, y: pierTopY - pierBottomY, z: projectionM },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        // The pier is the frontage's load path and has to read as the BRIGHT
        // mass the bays are cut out of. Measured against the target, the
        // pier-to-bay luminance ratio here was 0.92 — piers fractionally
        // DARKER than the openings they flank — where the target reads 3.81.
        // The alternating factor is kept so the bay series does not flatten
        // into one continuous band of stone.
        detailTintHex: scaleHexColor(identity.trimTintHex, index % 2 === 0 ? 1.3 : 1.19),
        uvProjection: "world",
      });
      // Recess shadow down both arrises. Nothing else on this elevation defines
      // a plane change, so the pier needs its own contact occlusion.
      for (const side of [-1, 1] as const) {
        pushInstance(instances, {
          placementId: `${placement.id}:merchant-pier-arris:${index}:${side}`,
          moduleId: "active_merchant_bay_pier",
          semanticClass: "active_merchant_bay_pier_arris",
          meshId: "string_course_strip",
          position: offsetPosition(
            { ...center, y: (pierBottomY + pierTopY) * 0.5 },
            placement.face,
            gap.centerM + side * (pierWidthM * 0.5 + 0.045),
            faceInwardM + 0.015,
          ),
          scale: { x: 0.09, y: pierTopY - pierBottomY, z: 0.03 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          trimMaterialId: placement.materialSlots.trim,
          detailTintHex: shadowTint,
          uvProjection: "world",
        });
      }
      // Capital under the story datum, and its shadow.
      pushInstance(instances, {
        placementId: `${placement.id}:merchant-pier-cap:${index}`,
        moduleId: "active_merchant_bay_pier",
        semanticClass: "active_merchant_bay_pier_cap",
        meshId: "string_course_strip",
        position: offsetPosition(
          { ...center, y: pierTopY - 0.07 },
          placement.face,
          gap.centerM,
          faceInwardM + projectionM * 0.5 + 0.03,
        ),
        scale: { x: pierWidthM + 0.14, y: 0.14, z: projectionM + 0.06 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
        uvProjection: "world",
      });
      pushInstance(instances, {
        placementId: `${placement.id}:merchant-pier-cap-shade:${index}`,
        moduleId: "active_merchant_bay_pier",
        semanticClass: "active_merchant_bay_pier_shade",
        meshId: "string_course_strip",
        position: offsetPosition(
          { ...center, y: pierTopY - 0.17 },
          placement.face,
          gap.centerM,
          faceInwardM + projectionM * 0.5 + 0.01,
        ),
        scale: { x: pierWidthM + 0.1, y: 0.07, z: projectionM + 0.02 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        detailTintHex: shadowTint,
        uvProjection: "world",
      });
    }
  }

  // 3. Masonry that acknowledges its openings: quoined jambs up both sides of
  // every ground opening, and a flat-arch relieving course over the narrow
  // ones. Real masonry always tells you where a hole was made; a single tiled
  // ashlar sheet running past the door reads as wallpaper.
  for (const ground of groundModules) {
    const openingBottomY = ground.centerY - ground.module.sizeM.height * 0.5;
    const openingTopY = ground.centerY + ground.module.sizeM.height * 0.5;
    const quoinCourseM = 0.38;
    const quoinCount = Math.max(2, Math.floor((openingTopY - openingBottomY) / quoinCourseM));
    for (const side of [-1, 1] as const) {
      const jambM = side < 0 ? ground.leftM : ground.rightM;
      for (let course = 0; course < quoinCount; course += 1) {
        const long = course % 2 === 0;
        const quoinWidthM = long ? 0.34 : 0.22;
        const courseY = openingBottomY + quoinCourseM * (course + 0.5);
        if (courseY + quoinCourseM * 0.5 > openingTopY) break;
        pushInstance(instances, {
          placementId: `${placement.id}:merchant-jamb:${ground.module.columnId}:${side}:${course}`,
          moduleId: "active_merchant_opening_quoin",
          semanticClass: "active_merchant_opening_quoin",
          meshId: "pilaster",
          position: offsetPosition(
            { ...center, y: courseY },
            placement.face,
            jambM + side * quoinWidthM * 0.5,
            faceInwardM + (long ? 0.06 : 0.035),
          ),
          scale: {
            x: quoinWidthM,
            y: quoinCourseM - 0.035,
            z: long ? 0.12 : 0.07,
          },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          trimMaterialId: placement.materialSlots.trim,
          detailTintHex: scaleHexColor(identity.trimTintHex, long ? 1.22 : 1.12),
          uvProjection: "world",
        });
        // Arris shadow on the outer edge of each long quoin.
        if (!long) continue;
        pushInstance(instances, {
          placementId: `${placement.id}:merchant-jamb-arris:${ground.module.columnId}:${side}:${course}`,
          moduleId: "active_merchant_opening_quoin",
          semanticClass: "active_merchant_opening_quoin_arris",
          meshId: "string_course_strip",
          position: offsetPosition(
            { ...center, y: courseY },
            placement.face,
            jambM + side * (quoinWidthM + 0.035),
            faceInwardM + 0.03,
          ),
          scale: { x: 0.06, y: quoinCourseM - 0.035, z: 0.05 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          trimMaterialId: placement.materialSlots.trim,
          detailTintHex: shadowTint,
          uvProjection: "world",
        });
      }
    }
    // Flat-arch relieving course over the narrow openings, where a stone head
    // would actually be needed to carry the wall above.
    if (ground.module.sizeM.width <= 1.6) {
      const voussoirCount = 5;
      const archWidthM = ground.module.sizeM.width + 0.5;
      for (let index = 0; index < voussoirCount; index += 1) {
        const t = (index + 0.5) / voussoirCount - 0.5;
        pushInstance(instances, {
          placementId: `${placement.id}:merchant-flat-arch:${ground.module.columnId}:${index}`,
          moduleId: "active_merchant_opening_quoin",
          semanticClass: "active_merchant_relieving_course",
          meshId: "pilaster",
          position: offsetPosition(
            { ...center, y: openingTopY + 0.19 },
            placement.face,
            ground.alongM + t * archWidthM,
            faceInwardM + 0.055,
          ),
          scale: {
            x: archWidthM / voussoirCount - 0.03,
            y: 0.34,
            z: 0.11,
          },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          // The centre stone is the widest and lightest so the head reads.
          trimMaterialId: placement.materialSlots.trim,
          detailTintHex: scaleHexColor(
            identity.trimTintHex,
            index === (voussoirCount - 1) / 2 ? 1.3 : index % 2 === 0 ? 1.2 : 1.1,
          ),
          uvProjection: "world",
        });
      }
    }
  }

  // 4. One timber head beam per ground opening, all on a shared soffit datum so
  // the run reads as a single spanning structure rather than per-bay trim.
  for (const ground of groundModules) {
    const beamHeightM = 0.24;
    const beamY = sharedHeadY + beamHeightM * 0.5 + 0.02;
    if (beamY + beamHeightM * 0.5 > pierTopY) continue;
    pushInstance(instances, {
      placementId: `${placement.id}:merchant-head-beam:${ground.module.columnId}`,
      moduleId: "active_merchant_head_beam",
      semanticClass: "active_merchant_head_beam",
      meshId: "door_lintel",
      position: offsetPosition(
        { ...center, y: beamY },
        placement.face,
        ground.alongM,
        faceInwardM + 0.09,
      ),
      scale: { x: ground.module.sizeM.width + 0.42, y: beamHeightM, z: 0.26 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: scaleHexColor(identity.timberTintHex, 0.9),
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:merchant-head-shade:${ground.module.columnId}`,
      moduleId: "active_merchant_head_beam",
      semanticClass: "active_merchant_head_shade",
      meshId: "string_course_strip",
      position: offsetPosition(
        { ...center, y: beamY - beamHeightM * 0.5 - 0.035 },
        placement.face,
        ground.alongM,
        faceInwardM + 0.06,
      ),
      scale: { x: ground.module.sizeM.width + 0.34, y: 0.07, z: 0.2 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: shadowTint,
      uvProjection: "world",
    });
  }

  // 5. Projecting sill with a drip and a weather stain under each upper window.
  for (const upper of upperModules) {
    const sillY = upper.centerY - upper.module.sizeM.height * 0.5;
    pushInstance(instances, {
      placementId: `${placement.id}:merchant-upper-sill:${upper.module.columnId}`,
      moduleId: "active_merchant_upper_sill",
      semanticClass: "active_merchant_upper_sill",
      meshId: "string_course_strip",
      position: offsetPosition(
        { ...center, y: sillY - 0.09 },
        placement.face,
        upper.alongM,
        faceInwardM + 0.08,
      ),
      scale: { x: upper.module.sizeM.width + 0.5, y: 0.15, z: 0.22 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:merchant-upper-drip:${upper.module.columnId}`,
      moduleId: "active_merchant_upper_sill",
      semanticClass: "active_merchant_upper_drip",
      meshId: "string_course_strip",
      position: offsetPosition(
        { ...center, y: sillY - 0.2 },
        placement.face,
        upper.alongM,
        faceInwardM + 0.04,
      ),
      scale: { x: upper.module.sizeM.width + 0.4, y: 0.08, z: 0.13 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: shadowTint,
      uvProjection: "world",
    });
    // Weather staining washed down the wall from each sill end.
    for (const side of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `${placement.id}:merchant-upper-stain:${upper.module.columnId}:${side}`,
        moduleId: "active_merchant_upper_sill",
        semanticClass: "active_merchant_upper_stain",
        meshId: "string_course_strip",
        position: offsetPosition(
          { ...center, y: sillY - 0.62 },
          placement.face,
          upper.alongM + side * (upper.module.sizeM.width * 0.5 + 0.16),
          faceInwardM + 0.012,
        ),
        scale: { x: 0.17, y: 0.78, z: 0.02 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        detailTintHex: scaleHexColor(identity.wallTintHex, 0.66),
        uvProjection: "world",
      });
    }
  }

  // 6. Canopy carrying course at the wall head. The street's cloth spans are
  // hung at the top of this elevation, and until now their ropes ended against
  // bare plaster, so the whole shade system read as unsupported. A continuous
  // timber ledger with projecting joist ends and iron tie plates gives every
  // span something built to land on, and it sits above the upper window heads
  // so no attachment crosses an opening.
  const massingTopY = center.y + placement.sizeM.height * 0.5;
  const wallHeadY = upperModules.length > 0
    ? Math.max(...upperModules.map((entry) => entry.centerY + entry.module.sizeM.height * 0.5))
    : sharedHeadY;
  const ledgerHeightM = 0.28;
  const ledgerY = wallHeadY + 0.34 + ledgerHeightM * 0.5;
  if (ledgerY + ledgerHeightM * 0.5 <= massingTopY - 0.16) {
    const ledgerProjectionM = 0.3;
    pushInstance(instances, {
      placementId: `${placement.id}:canopy-ledger`,
      moduleId: "active_merchant_canopy_ledger",
      semanticClass: "active_merchant_canopy_ledger",
      meshId: "door_lintel",
      position: offsetPosition(
        { ...center, y: ledgerY },
        placement.face,
        0,
        faceInwardM + ledgerProjectionM * 0.5,
      ),
      scale: { x: placement.sizeM.width, y: ledgerHeightM, z: ledgerProjectionM },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: scaleHexColor(identity.timberTintHex, 0.86),
      uvProjection: "world",
    });
    // Soffit shade so the ledger sits proud of the wall instead of reading as a
    // painted band.
    pushInstance(instances, {
      placementId: `${placement.id}:canopy-ledger-shade`,
      moduleId: "active_merchant_canopy_ledger",
      semanticClass: "active_merchant_canopy_ledger_shade",
      meshId: "string_course_strip",
      position: offsetPosition(
        { ...center, y: ledgerY - ledgerHeightM * 0.5 - 0.045 },
        placement.face,
        0,
        faceInwardM + 0.05,
      ),
      scale: { x: placement.sizeM.width, y: 0.09, z: 0.08 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: shadowTint,
      uvProjection: "world",
    });
    const joistCount = Math.max(2, Math.round(placement.sizeM.width / 1.15));
    const joistPitchM = placement.sizeM.width / joistCount;
    for (let index = 0; index < joistCount; index += 1) {
      const joistAlongM = -halfWidthM + joistPitchM * (index + 0.5);
      pushInstance(instances, {
        placementId: `${placement.id}:canopy-joist:${index}`,
        moduleId: "active_merchant_canopy_ledger",
        semanticClass: "active_merchant_canopy_joist",
        meshId: "pilaster",
        position: offsetPosition(
          { ...center, y: ledgerY - ledgerHeightM * 0.5 - 0.11 },
          placement.face,
          joistAlongM,
          faceInwardM + 0.29,
        ),
        scale: { x: 0.17, y: 0.22, z: 0.58 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: scaleHexColor(
          identity.timberTintHex,
          index % 2 === 0 ? 0.94 : 0.8,
        ),
        uvProjection: "world",
      });
      // Iron tie plate on every second joist, where a span cable would be
      // shackled to the head.
      if (index % 2 !== 0) continue;
      pushInstance(instances, {
        placementId: `${placement.id}:canopy-tie-plate:${index}`,
        moduleId: "active_merchant_canopy_ledger",
        semanticClass: "active_merchant_canopy_tie_plate",
        meshId: "sign_bracket",
        position: offsetPosition(
          { ...center, y: ledgerY + ledgerHeightM * 0.5 - 0.06 },
          placement.face,
          joistAlongM,
          faceInwardM + ledgerProjectionM + 0.03,
        ),
        scale: { x: 0.11, y: 0.16, z: 0.07 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
      });
    }
  }
}

function pushFacadeStoryDatumGrammar(
  placement: V3ArchitectureMassingPlacement,
  modules: readonly V3ArchitectureModulePlacement[],
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  center: { x: number; y: number; z: number },
  yawRad: number,
  backingPlacementId: string,
): void {
  if (
    profile.family !== "quiet_residential"
    && profile.family !== "covered_arcade"
    && profile.family !== "active_merchant"
    && profile.family !== "service_storage"
  ) return;
  const groundModules = modules
    .filter((module) => module.datumId.startsWith("GROUND_") && createsVisualFacadeCutout(module))
    .map((module) => {
      const moduleCenter = designToWorldVec3(module.center);
      return {
        module,
        alongM: resolveFacadeModuleOffset(placement, module),
        headY: moduleCenter.y + module.sizeM.height * 0.5,
      };
    })
    .sort((left, right) => left.alongM - right.alongM);
  if (groundModules.length === 0) return;

  const upperModules = modules
    .filter((module) => module.datumId.startsWith("STORY_") && createsVisualFacadeCutout(module))
    .map((module) => {
      const moduleCenter = designToWorldVec3(module.center);
      return {
        module,
        sillY: moduleCenter.y - module.sizeM.height * 0.5,
      };
    });
  const facadeTopY = center.y + placement.sizeM.height * 0.5;
  const sharedGroundHeadY = Math.max(...groundModules.map((entry) => entry.headY));
  const firstUpperSillY = upperModules.length > 0
    ? Math.min(...upperModules.map((entry) => entry.sillY))
    : null;
  const availableTransitionM = (firstUpperSillY ?? facadeTopY - 0.42) - sharedGroundHeadY;
  if (availableTransitionM < 0.24 || placement.sizeM.width < 1.2) return;

  const courseHeightM = profile.family === "active_merchant"
    ? 0.17
    : profile.family === "service_storage"
      ? 0.16
      : profile.family === "covered_arcade"
        ? 0.15
        : 0.12;
  const courseY = firstUpperSillY === null
    ? sharedGroundHeadY + Math.min(0.3, availableTransitionM * 0.26)
    : sharedGroundHeadY + availableTransitionM * 0.5;
  const edgeMarginM = Math.min(0.42, Math.max(0.18, placement.sizeM.width * 0.035));
  const identity = resolveBuildingMaterialIdentity(placement, profile.family);
  const courseTint = scaleHexColor(
    identity.trimTintHex,
    0.9 + stableUnitInterval(`${placement.id}:story-course`) * 0.16,
  );
  pushInstance(instances, {
    placementId: `${placement.id}:story-transition-course`,
    moduleId: `${profile.family}_served_story_datum`,
    semanticClass: `${profile.family}_story_transition_course`,
    meshId: "string_course_strip",
    position: offsetPosition(
      { ...center, y: courseY },
      placement.face,
      0,
      placement.sizeM.depth * 0.5 + 0.055,
    ),
    scale: {
      x: placement.sizeM.width - edgeMarginM * 2,
      y: courseHeightM,
      z: 0.12,
    },
    backingPlacementId,
    structurallyBacked: true,
    yawRad,
    trimMaterialId: placement.materialSlots.trim,
    detailTintHex: courseTint,
    uvProjection: "world",
  });
}

function pushServiceStorageBackGrammar(
  placement: V3ArchitectureMassingPlacement,
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  center: { x: number; y: number; z: number },
  yawRad: number,
  backingPlacementId: string,
  identity: BuildingMaterialIdentity,
): void {
  const bottomY = center.y - placement.sizeM.height * 0.5;
  const storyCourseY = bottomY + 3.12;
  if (profile.family === "service_storage") {
    // The Dyers service frontage is viewed from its structural rear in the
    // axial Spawn-A camera. Treat that whole rear face as one named wall-span
    // override, with equal bays and the same story datums as the short
    // returns. This closes the 17m blank plane without inventing a connector.
    const backEdgeMarginM = Math.min(0.72, Math.max(0.54, placement.sizeM.width * 0.04));
    const backUsableM = placement.sizeM.width - backEdgeMarginM * 2;
    const backBayCount = Math.min(4, Math.max(2, Math.round(backUsableM / 3.8)));
    const backPitchM = backUsableM / backBayCount;
    const backBayWidthM = Math.min(1.42, backPitchM * 0.48);
    const backInwardM = -placement.sizeM.depth * 0.5 - 0.055;
    const backId = `${placement.id}:structural-back-span`;
    pushInstance(instances, {
      placementId: `${backId}:contact-course`,
      moduleId: "service_storage_structural_back_span",
      semanticClass: "service_storage_back_grounding",
      meshId: "plinth_strip",
      position: offsetPosition({ ...center, y: bottomY + 0.18 }, placement.face, 0, backInwardM),
      scale: { x: placement.sizeM.width, y: 0.36, z: 0.13 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${backId}:story-course`,
      moduleId: "service_storage_structural_back_span",
      semanticClass: "service_storage_back_story_datum",
      meshId: "string_course_strip",
      position: offsetPosition({ ...center, y: storyCourseY }, placement.face, 0, backInwardM - 0.01),
      scale: { x: backUsableM, y: 0.15, z: 0.13 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    for (let bayIndex = 0; bayIndex < backBayCount; bayIndex += 1) {
      const alongM = -backUsableM * 0.5 + backPitchM * (bayIndex + 0.5);
      const id = `${backId}:bay:${bayIndex + 1}`;
      const unit = stableUnitInterval(`${id}:closure`);
      const groundSillY = bottomY + 0.52;
      const groundHeightM = 1.86;
      const groundCenterY = groundSillY + groundHeightM * 0.5;
      pushInstance(instances, {
        placementId: `${id}:ground-panel`,
        moduleId: "service_storage_structural_back_span",
        semanticClass: "service_storage_back_structural_blind_bay",
        meshId: "recessed_panel_back",
        position: offsetPosition({ ...center, y: groundCenterY }, placement.face, alongM, backInwardM - 0.02),
        scale: { x: backBayWidthM, y: groundHeightM, z: 0.055 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        detailMaterialId: placement.materialSlots.wall,
        detailTintHex: scaleHexColor(identity.wallTintHex, 0.78 + unit * 0.1),
        uvProjection: "world",
      });
      for (const xSide of [-1, 1] as const) {
        pushInstance(instances, {
          placementId: `${id}:ground-jamb:${xSide}`,
          moduleId: "service_storage_structural_back_span",
          semanticClass: "service_storage_back_structural_frame",
          meshId: "recessed_panel_frame_v",
          position: offsetPosition(
            { ...center, y: groundCenterY },
            placement.face,
            alongM + xSide * (backBayWidthM * 0.5 + 0.05),
            backInwardM - 0.055,
          ),
          scale: { x: 0.1, y: groundHeightM + 0.2, z: 0.08 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          detailMaterialId: placement.materialSlots.trim,
          detailTintHex: identity.trimTintHex,
          uvProjection: "world",
        });
      }
      for (const [edge, edgeY] of [["sill", groundSillY], ["head", groundSillY + groundHeightM]] as const) {
        pushInstance(instances, {
          placementId: `${id}:ground-${edge}`,
          moduleId: "service_storage_structural_back_span",
          semanticClass: "service_storage_back_structural_frame",
          meshId: "recessed_panel_frame_h",
          position: offsetPosition({ ...center, y: edgeY }, placement.face, alongM, backInwardM - 0.055),
          scale: { x: backBayWidthM + 0.2, y: 0.1, z: 0.08 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          detailMaterialId: placement.materialSlots.trim,
          detailTintHex: identity.trimTintHex,
          uvProjection: "world",
        });
      }

      const upperSillY = bottomY + 3.62;
      const upperHeightM = Math.min(1.34, bottomY + placement.sizeM.height - 0.48 - upperSillY);
      if (upperHeightM < 0.68) continue;
      const upperCenterY = upperSillY + upperHeightM * 0.5;
      pushInstance(instances, {
        placementId: `${id}:upper-recess`,
        moduleId: "service_storage_structural_back_span",
        semanticClass: "service_storage_back_upper_blind_recess",
        meshId: "window_recess_timber",
        position: offsetPosition({ ...center, y: upperCenterY }, placement.face, alongM, backInwardM - 0.02),
        scale: { x: backBayWidthM * 0.78, y: upperHeightM, z: 0.055 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: scaleHexColor(identity.timberTintHex, 0.7),
        uvProjection: "world",
      });
      const barCount = 3 + (bayIndex % 3);
      for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
        const normalized = barIndex / (barCount - 1) - 0.5;
        pushInstance(instances, {
          placementId: `${id}:upper-bar:${barIndex + 1}`,
          moduleId: "service_storage_structural_back_span",
          semanticClass: "service_storage_back_upper_screen",
          meshId: "window_screen_bar",
          position: offsetPosition(
            { ...center, y: upperCenterY },
            placement.face,
            alongM + normalized * backBayWidthM * 0.55,
            backInwardM - 0.058,
          ),
          scale: { x: 0.052, y: upperHeightM - 0.1, z: 0.055 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad,
          detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: identity.timberTintHex,
          uvProjection: "world",
        });
      }
      pushInstance(instances, {
        placementId: `${id}:upper-rail`,
        moduleId: "service_storage_structural_back_span",
        semanticClass: "service_storage_back_upper_screen",
        meshId: "window_screen_bar",
        position: offsetPosition(
          { ...center, y: upperCenterY + (unit - 0.5) * upperHeightM * 0.22 },
          placement.face,
          alongM,
          backInwardM - 0.06,
        ),
        scale: { x: backBayWidthM * 0.72, y: 0.052, z: 0.055 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: identity.timberTintHex,
        uvProjection: "world",
      });
    }
  }
}

/**
 * Covered-souk cameras see the short returns of each merchant massing almost
 * as often as the served frontage. Treat those returns as proper facades:
 * their bays are divided from the authored depth, every lower niche shares a
 * ground-story head, and upper screens share the same 4.15m sill datum used by
 * generated frontage windows. This is render-only relief on the existing
 * shell; it never changes the massing, traversal, or collision envelope.
 */
function pushCoveredArcadeReturnGrammar(
  placement: V3ArchitectureMassingPlacement,
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  center: { x: number; y: number; z: number },
  yawRad: number,
  backingPlacementId: string,
  identity: BuildingMaterialIdentity,
): void {
  if (profile.family !== "covered_arcade") return;

  const bottomY = center.y - placement.sizeM.height * 0.5;
  const edgeMarginM = 0.52;
  const usableDepthM = placement.sizeM.depth - edgeMarginM * 2;
  const bayCount = usableDepthM >= 3.05 ? 2 : 1;
  const bayPitchM = usableDepthM / bayCount;
  const bayWidthM = Math.min(1.18, bayPitchM * 0.66);
  const projectionM = 0.055;
  const frameWidthM = 0.11;
  const lowerSillM = 0.5;
  const lowerHeadM = 2.82;
  const lowerHeightM = lowerHeadM - lowerSillM;
  const upperSillM = 4.15;
  const upperHeightM = 1.35;
  const returnYawRad = yawRad + Math.PI * 0.5;
  const localToWorld = (localX: number, localZ: number, y: number): { x: number; y: number; z: number } => ({
    x: center.x + Math.cos(yawRad) * localX + Math.sin(yawRad) * localZ,
    y,
    z: center.z - Math.sin(yawRad) * localX + Math.cos(yawRad) * localZ,
  });

  const pushReturnFrame = (
    side: -1 | 1,
    bayIndex: number,
    bayCenterM: number,
    sillM: number,
    openingHeightM: number,
    story: "ground" | "upper",
  ): void => {
    const openingCenterY = bottomY + sillM + openingHeightM * 0.5;
    const localX = side * (placement.sizeM.width * 0.5 + projectionM * 0.5);
    const id = `${placement.id}:return:${side}:${story}:${bayIndex + 1}`;
    const timberTint = scaleHexColor(
      0x8f6545,
      0.84 + stableUnitInterval(`${id}:timber`) * 0.28,
    );

    pushInstance(instances, {
      placementId: `${id}:recess`,
      moduleId: "covered_arcade_return_bay",
      semanticClass: story === "ground" ? "covered_arcade_return_blind_niche" : "covered_arcade_return_screen",
      meshId: story === "ground" ? "niche_recess_back" : "window_recess_timber",
      position: localToWorld(localX, bayCenterM, openingCenterY),
      scale: { x: bayWidthM, y: openingHeightM, z: projectionM },
      backingPlacementId,
      structurallyBacked: true,
      yawRad: returnYawRad,
      detailMaterialId: story === "ground" ? placement.materialSlots.wall : MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: story === "ground" ? scaleHexColor(identity.wallTintHex, 0.78) : timberTint,
      uvProjection: "world",
    });

    for (const jambSide of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `${id}:jamb:${jambSide}`,
        moduleId: "covered_arcade_return_bay",
        semanticClass: "covered_arcade_return_datum_frame",
        meshId: "door_jamb",
        position: localToWorld(
          side * (placement.sizeM.width * 0.5 + projectionM),
          bayCenterM + jambSide * (bayWidthM * 0.5 + frameWidthM * 0.5),
          openingCenterY,
        ),
        scale: { x: frameWidthM, y: openingHeightM + frameWidthM, z: 0.11 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        trimMaterialId: placement.materialSlots.trim,
        uvProjection: "world",
      });
    }
    for (const [edge, edgeY] of [
      ["sill", bottomY + sillM - frameWidthM * 0.5],
      ["head", bottomY + sillM + openingHeightM + frameWidthM * 0.5],
    ] as const) {
      pushInstance(instances, {
        placementId: `${id}:${edge}`,
        moduleId: "covered_arcade_return_bay",
        semanticClass: "covered_arcade_return_datum_frame",
        meshId: "door_lintel",
        position: localToWorld(
          side * (placement.sizeM.width * 0.5 + projectionM),
          bayCenterM,
          edgeY,
        ),
        scale: { x: bayWidthM + frameWidthM * 2, y: frameWidthM, z: 0.11 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        trimMaterialId: placement.materialSlots.trim,
        uvProjection: "world",
      });
    }

    if (story === "ground") {
      const leftUnit = stableUnitInterval(`${id}:left-shutter`);
      const rightUnit = stableUnitInterval(`${id}:right-shutter`);
      for (const [shutterSide, unit] of [[-1, leftUnit], [1, rightUnit]] as const) {
        const shutterWidthM = bayWidthM * (0.39 + unit * 0.08);
        const shutterAngleRad = 0.07 + unit * 0.54;
        pushInstance(instances, {
          placementId: `${id}:shutter:${shutterSide}`,
          moduleId: "covered_arcade_return_shutter",
          semanticClass: "covered_arcade_return_varied_closure",
          meshId: "window_shutter",
          position: localToWorld(
            side * (placement.sizeM.width * 0.5 + projectionM + 0.025),
            bayCenterM + shutterSide * bayWidthM * (0.255 + unit * 0.035),
            openingCenterY,
          ),
          scale: { x: shutterWidthM, y: openingHeightM - 0.14, z: 0.075 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad: returnYawRad + shutterSide * shutterAngleRad,
          detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: scaleHexColor(timberTint, 0.9 + unit * 0.18),
          uvProjection: "world",
        });
      }

      // The lower return bay is also a served generic merchant aperture.
      // Keep the occupation tied to the same bay center, sill, clear width,
      // and facade projection as its frame so the short return cannot read as
      // an arbitrary blank frontage. Category-specific goods remain owned by
      // the district cards; this baseline is reusable storage/display mass.
      const marketUnit = stableUnitInterval(`${id}:return-market`);
      const counterHeightM = 0.48 + marketUnit * 0.12;
      const counterWidthM = bayWidthM * (0.76 + marketUnit * 0.1);
      const counterBottomY = bottomY + sillM;
      const marketProjectionM = placement.sizeM.width * 0.5 + projectionM + 0.07;
      const marketTintHex = marketUnit < 0.34
        ? 0xa87552
        : marketUnit < 0.67
          ? 0x718f82
          : 0x9c845d;
      pushInstance(instances, {
        placementId: `${id}:market-counter-front`,
        moduleId: "covered_arcade_return_served_market",
        semanticClass: "covered_arcade_return_generic_merchant_counter",
        meshId: "shop_counter",
        position: localToWorld(
          side * marketProjectionM,
          bayCenterM,
          counterBottomY + counterHeightM * 0.5,
        ),
        scale: { x: counterWidthM, y: counterHeightM, z: 0.18 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: marketTintHex,
        uvProjection: "world",
      });
      pushInstance(instances, {
        placementId: `${id}:market-counter-top`,
        moduleId: "covered_arcade_return_served_market",
        semanticClass: "covered_arcade_return_generic_merchant_counter",
        meshId: "shop_counter",
        position: localToWorld(
          side * (marketProjectionM + 0.025),
          bayCenterM,
          counterBottomY + counterHeightM + 0.05,
        ),
        scale: { x: counterWidthM + 0.14, y: 0.1, z: 0.38 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: marketTintHex,
        uvProjection: "world",
      });
      const stock = marketUnit < 0.5
        ? [
          { along: -0.22, meshId: "merchant_goods_basket" as const, scale: { x: 0.32, y: 0.29, z: 0.3 } },
          { along: 0.22, meshId: "merchant_goods_pot" as const, scale: { x: 0.29, y: 0.38, z: 0.29 } },
        ]
        : [
          { along: -0.2, meshId: "merchant_goods_pot" as const, scale: { x: 0.3, y: 0.39, z: 0.3 } },
          { along: 0.23, meshId: "merchant_goods_basket" as const, scale: { x: 0.34, y: 0.28, z: 0.32 } },
        ];
      for (const [stockIndex, item] of stock.entries()) {
        pushInstance(instances, {
          placementId: `${id}:market-stock:${stockIndex + 1}`,
          moduleId: "covered_arcade_return_served_market",
          semanticClass: "covered_arcade_return_generic_merchant_stock",
          meshId: item.meshId,
          position: localToWorld(
            side * (marketProjectionM + 0.045),
            bayCenterM + item.along * bayWidthM,
            counterBottomY + counterHeightM + 0.1 + item.scale.y * 0.5,
          ),
          scale: item.scale,
          backingPlacementId,
          structurallyBacked: true,
          yawRad: returnYawRad + (stockIndex === 0 ? -0.04 : 0.05),
          detailMaterialId: item.meshId === "merchant_goods_pot"
            ? placement.materialSlots.trim
            : MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: item.meshId === "merchant_goods_pot"
            ? marketUnit < 0.5 ? 0x759489 : 0xb17d5c
            : marketTintHex,
          uvProjection: "world",
        });
      }
    } else {
      const screenUnit = stableUnitInterval(`${id}:screen-density`);
      const barCount = 2 + Math.floor(screenUnit * 4);
      for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
        const normalized = barCount === 1 ? 0 : barIndex / (barCount - 1) - 0.5;
        const alongM = bayCenterM + normalized * bayWidthM * 0.62;
        pushInstance(instances, {
          placementId: `${id}:screen-bar:${barIndex + 1}`,
          moduleId: "covered_arcade_return_screen",
          semanticClass: "covered_arcade_return_timber_screen",
          meshId: "window_screen_bar",
          position: localToWorld(
            side * (placement.sizeM.width * 0.5 + projectionM + 0.015),
            alongM,
            openingCenterY,
          ),
          scale: { x: 0.055, y: openingHeightM - 0.1, z: 0.06 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad: returnYawRad,
          detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: timberTint,
          uvProjection: "world",
        });
      }
      pushInstance(instances, {
        placementId: `${id}:screen-rail`,
        moduleId: "covered_arcade_return_screen",
        semanticClass: "covered_arcade_return_timber_screen",
        meshId: "window_screen_bar",
        position: localToWorld(
          side * (placement.sizeM.width * 0.5 + projectionM + 0.015),
          bayCenterM,
          openingCenterY + (screenUnit - 0.5) * openingHeightM * 0.28,
        ),
        scale: { x: bayWidthM - 0.1, y: 0.052, z: 0.06 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: timberTint,
        uvProjection: "world",
      });
    }
  };

  for (const side of [-1, 1] as const) {
    const facesMidLink = (placement.id === "ARCH_FRONTAGE_COVERED_SOUK_WEST_MASSING" && side === 1)
      || (placement.id === "ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_MASSING" && side === -1);
    pushInstance(instances, {
      placementId: `${placement.id}:return:${side}:contact-course`,
      moduleId: "covered_arcade_return_contact_course",
      semanticClass: "covered_arcade_return_grounding",
      meshId: "plinth_strip",
      position: localToWorld(
        side * (placement.sizeM.width * 0.5 + (facesMidLink ? -.065 : .06)),
        0,
        bottomY + 0.18,
      ),
      scale: { x: placement.sizeM.depth, y: 0.36, z: 0.13 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad: returnYawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });

    if (facesMidLink) continue;
    for (let bayIndex = 0; bayIndex < bayCount; bayIndex += 1) {
      const bayCenterM = -usableDepthM * 0.5 + bayPitchM * (bayIndex + 0.5);
      pushReturnFrame(side, bayIndex, bayCenterM, lowerSillM, lowerHeightM, "ground");
      if (placement.sizeM.height >= upperSillM + upperHeightM + 0.55) {
        pushReturnFrame(side, bayIndex, bayCenterM, upperSillM, upperHeightM, "upper");
      }
    }
  }
}

/**
 * Merchant/residential massing returns are often the largest planes in the
 * axial bazaar cameras. Give those authored side faces a proper story/bay
 * grammar instead of free relief: shared sill/head datums, equal bay pitch,
 * bounded edge margins, and one material identity for the complete building.
 * These are blind render-only panels/screens on the existing shell, never
 * traversal openings or collider changes.
 */
function pushMerchantResidentialReturnGrammar(
  placement: V3ArchitectureMassingPlacement,
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  center: { x: number; y: number; z: number },
  yawRad: number,
  backingPlacementId: string,
  identity: BuildingMaterialIdentity,
): void {
  if (
    profile.family !== "active_merchant"
    && profile.family !== "quiet_residential"
    && profile.family !== "service_storage"
  ) return;

  const bottomY = center.y - placement.sizeM.height * 0.5;
  // Fit the return from its two terminal arrises inward. The former 10%-deep
  // margin left a visible half-bay at 4.8 m merchant returns because two broad
  // panels sat mostly behind the neighboring fortress. A bounded corner
  // clearance, one derived arris, and a 1.75 m maximum pitch keep the shared
  // datums legible all the way to the edge without crowding either corner.
  const terminalClearanceM = Math.min(0.22, Math.max(0.14, placement.sizeM.depth * 0.035));
  const terminalArrisWidthM = Math.min(0.12, Math.max(0.09, placement.sizeM.depth * 0.022));
  const edgeMarginM = terminalClearanceM + terminalArrisWidthM + Math.min(0.08, placement.sizeM.depth * 0.015);
  const usableDepthM = placement.sizeM.depth - edgeMarginM * 2;
  if (usableDepthM < 0.78) {
    const returnYawRad = yawRad + Math.PI * 0.5;
    const faceProjectionM = placement.sizeM.width * 0.5 + 0.055;
    const localToWorld = (
      localX: number,
      localZ: number,
      y: number,
    ): { x: number; y: number; z: number } => ({
      x: center.x + Math.cos(yawRad) * localX + Math.sin(yawRad) * localZ,
      y,
      z: center.z - Math.sin(yawRad) * localX + Math.cos(yawRad) * localZ,
    });
    for (const side of [-1, 1] as const) {
      const sideId = `${placement.id}:shallow-return:${side}`;
      pushInstance(instances, {
        placementId: `${sideId}:contact-course`,
        moduleId: `${profile.family}_shallow_return_finish`,
        semanticClass: `${profile.family}_shallow_return_grounding`,
        meshId: "plinth_strip",
        position: localToWorld(side * (faceProjectionM + 0.015), 0, bottomY + 0.17),
        scale: { x: placement.sizeM.depth, y: 0.34, z: 0.13 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
        uvProjection: "world",
      });
      pushInstance(instances, {
        placementId: `${sideId}:terminal-arris`,
        moduleId: `${profile.family}_shallow_return_finish`,
        semanticClass: `${profile.family}_shallow_return_terminal_arris`,
        meshId: "recessed_panel_frame_v",
        position: localToWorld(
          side * (faceProjectionM + 0.045),
          0,
          bottomY + Math.min(2.55, placement.sizeM.height * 0.5),
        ),
        scale: {
          x: Math.min(0.12, placement.sizeM.depth * 0.18),
          y: Math.min(4.6, placement.sizeM.height - 0.72),
          z: 0.09,
        },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
        uvProjection: "world",
      });
    }
    return;
  }
  const bayCount = Math.min(4, Math.max(1, Math.ceil(usableDepthM / 1.75)));
  const bayPitchM = usableDepthM / bayCount;
  const bayWidthM = Math.min(1.24, bayPitchM * 0.66);
  const storyCourseSpanM = placement.sizeM.depth - terminalClearanceM * 2;
  const returnYawRad = yawRad + Math.PI * 0.5;
  const faceProjectionM = placement.sizeM.width * 0.5 + 0.055;
  const storyCourseY = bottomY + 3.12;
  const localToWorld = (localX: number, localZ: number, y: number): { x: number; y: number; z: number } => ({
    x: center.x + Math.cos(yawRad) * localX + Math.sin(yawRad) * localZ,
    y,
    z: center.z - Math.sin(yawRad) * localX + Math.cos(yawRad) * localZ,
  });

  for (const side of [-1, 1] as const) {
    const sideId = `${placement.id}:identity-return:${side}`;
    pushInstance(instances, {
      placementId: `${sideId}:contact-course`,
      moduleId: `${profile.family}_return_story_grammar`,
      semanticClass: `${profile.family}_return_grounding`,
      meshId: "plinth_strip",
      position: localToWorld(side * (faceProjectionM + 0.015), 0, bottomY + 0.17),
      scale: { x: placement.sizeM.depth, y: 0.34, z: 0.13 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad: returnYawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    if (placement.sizeM.height >= 3.55) {
      pushInstance(instances, {
        placementId: `${sideId}:story-course`,
        moduleId: `${profile.family}_return_story_grammar`,
        semanticClass: `${profile.family}_return_story_datum`,
        meshId: "string_course_strip",
      position: localToWorld(side * (faceProjectionM + 0.02), 0, storyCourseY),
        scale: { x: storyCourseSpanM, y: 0.14, z: 0.12 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
        uvProjection: "world",
      });
    }

    for (const terminal of [-1, 1] as const) {
      const arrisBottomY = bottomY + 0.48;
      const arrisTopY = Math.min(bottomY + placement.sizeM.height - 0.44, bottomY + 5.18);
      pushInstance(instances, {
        placementId: `${sideId}:terminal-arris:${terminal}`,
        moduleId: `${profile.family}_return_story_grammar`,
        semanticClass: `${profile.family}_return_terminal_arris`,
        meshId: "recessed_panel_frame_v",
        position: localToWorld(
          side * (faceProjectionM + 0.045),
          terminal * (placement.sizeM.depth * 0.5 - terminalClearanceM - terminalArrisWidthM * 0.5),
          (arrisBottomY + arrisTopY) * 0.5,
        ),
        scale: { x: terminalArrisWidthM, y: arrisTopY - arrisBottomY, z: 0.085 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
        uvProjection: "world",
      });
    }

    for (let bayIndex = 0; bayIndex < bayCount; bayIndex += 1) {
      const bayCenterM = -usableDepthM * 0.5 + bayPitchM * (bayIndex + 0.5);
      const id = `${sideId}:bay:${bayIndex + 1}`;
      const unit = stableUnitInterval(`${id}:proportion`);
      const returnBayOrdinal = (side === -1 ? 0 : bayCount) + bayIndex;
      const frameWidthM = 0.09 + unit * 0.018;
      const groundSillY = bottomY + 0.52;
      const groundHeightM = 1.86;
      const groundCenterY = groundSillY + groundHeightM * 0.5;

      if (profile.family === "active_merchant" || profile.family === "service_storage") {
        const lowerModuleId = profile.family === "active_merchant"
          ? "active_merchant_return_blind_bay"
          : "service_storage_return_blind_bay";
        const lowerSemantic = profile.family === "active_merchant"
          ? "active_merchant_return_structural_blind_bay"
          : "service_storage_return_structural_blind_bay";
        const frameSemantic = profile.family === "active_merchant"
          ? "active_merchant_return_structural_frame"
          : "service_storage_return_structural_frame";
        pushInstance(instances, {
          placementId: `${id}:ground-panel`,
          moduleId: lowerModuleId,
          semanticClass: lowerSemantic,
          meshId: "recessed_panel_back",
          position: localToWorld(side * (faceProjectionM + 0.012), bayCenterM, groundCenterY),
          scale: { x: bayWidthM, y: groundHeightM, z: 0.055 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad: returnYawRad,
          detailMaterialId: placement.materialSlots.wall,
          detailTintHex: scaleHexColor(identity.wallTintHex, 0.8 + returnBayOrdinal * 0.025 + unit * 0.006),
          uvProjection: "world",
        });
        for (const xSide of [-1, 1] as const) {
          pushInstance(instances, {
            placementId: `${id}:ground-jamb:${xSide}`,
            moduleId: lowerModuleId,
            semanticClass: frameSemantic,
            meshId: "recessed_panel_frame_v",
            position: localToWorld(
              side * (faceProjectionM + 0.045),
              bayCenterM + xSide * (bayWidthM * 0.5 + frameWidthM * 0.5),
              groundCenterY,
            ),
            scale: { x: frameWidthM, y: groundHeightM + frameWidthM * 2, z: 0.08 },
            backingPlacementId,
            structurallyBacked: true,
            yawRad: returnYawRad,
            detailMaterialId: placement.materialSlots.trim,
            detailTintHex: identity.trimTintHex,
            uvProjection: "world",
          });
        }
        for (const [edge, edgeY] of [["sill", groundSillY], ["head", groundSillY + groundHeightM]] as const) {
          pushInstance(instances, {
            placementId: `${id}:ground-${edge}`,
            moduleId: lowerModuleId,
            semanticClass: frameSemantic,
            meshId: "recessed_panel_frame_h",
            position: localToWorld(side * (faceProjectionM + 0.045), bayCenterM, edgeY),
            scale: { x: bayWidthM + frameWidthM * 2, y: frameWidthM, z: 0.08 },
            backingPlacementId,
            structurallyBacked: true,
            yawRad: returnYawRad,
            detailMaterialId: placement.materialSlots.trim,
            detailTintHex: identity.trimTintHex,
            uvProjection: "world",
          });
        }
      }

      const upperSillY = bottomY + 3.62;
      const upperHeightM = Math.min(1.36, bottomY + placement.sizeM.height - 0.48 - upperSillY);
      if (upperHeightM < 0.68) continue;
      const upperCenterY = upperSillY + upperHeightM * 0.5;
      const upperWidthM = bayWidthM * (0.78 + unit * 0.1);
      pushInstance(instances, {
        placementId: `${id}:upper-recess`,
        moduleId: `${profile.family}_return_blind_screen`,
        semanticClass: `${profile.family}_return_upper_blind_recess`,
        meshId: "window_recess_timber",
        position: localToWorld(side * (faceProjectionM + 0.012), bayCenterM, upperCenterY),
        scale: { x: upperWidthM, y: upperHeightM, z: 0.055 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: scaleHexColor(identity.timberTintHex, 0.72),
        uvProjection: "world",
      });
      const barCount = 3 + Math.floor(unit * 3);
      for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
        const normalized = barCount === 1 ? 0 : barIndex / (barCount - 1) - 0.5;
        pushInstance(instances, {
          placementId: `${id}:upper-bar:${barIndex + 1}`,
          moduleId: `${profile.family}_return_blind_screen`,
          semanticClass: `${profile.family}_return_upper_screen`,
          meshId: "window_screen_bar",
          position: localToWorld(
            side * (faceProjectionM + 0.05),
            bayCenterM + normalized * upperWidthM * 0.72,
            upperCenterY,
          ),
          scale: { x: 0.052, y: upperHeightM - 0.1, z: 0.055 },
          backingPlacementId,
          structurallyBacked: true,
          yawRad: returnYawRad,
          detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: identity.timberTintHex,
          uvProjection: "world",
        });
      }
      pushInstance(instances, {
        placementId: `${id}:upper-rail`,
        moduleId: `${profile.family}_return_blind_screen`,
        semanticClass: `${profile.family}_return_upper_screen`,
        meshId: "window_screen_bar",
        position: localToWorld(
          side * (faceProjectionM + 0.052),
          bayCenterM,
          upperCenterY + (unit - 0.5) * upperHeightM * 0.22,
        ),
        scale: { x: upperWidthM - 0.08, y: 0.052, z: 0.055 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: identity.timberTintHex,
        uvProjection: "world",
      });
    }
  }
}

function pushHeroCourtyardReturnFinish(
  placement: V3ArchitectureMassingPlacement,
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  center: { x: number; y: number; z: number },
  yawRad: number,
  backingPlacementId: string,
  identity: BuildingMaterialIdentity,
): void {
  if (profile.family !== "hero_courtyard" || placement.sizeM.depth < 0.5) return;
  const bottomY = center.y - placement.sizeM.height * 0.5;
  const returnYawRad = yawRad + Math.PI * 0.5;
  const faceProjectionM = placement.sizeM.width * 0.5 + 0.055;
  const arrisWidthM = Math.min(0.14, Math.max(0.1, placement.sizeM.depth * 0.025));
  const terminalInsetM = Math.min(0.18, placement.sizeM.depth * 0.08);
  const arrisBottomY = bottomY + 0.42;
  const arrisTopY = bottomY + placement.sizeM.height - 0.36;
  const storyCourseY = Math.min(arrisTopY - 0.3, bottomY + 3.28);
  const localToWorld = (
    localX: number,
    localZ: number,
    y: number,
  ): { x: number; y: number; z: number } => ({
    x: center.x + Math.cos(yawRad) * localX + Math.sin(yawRad) * localZ,
    y,
    z: center.z - Math.sin(yawRad) * localX + Math.cos(yawRad) * localZ,
  });

  for (const side of [-1, 1] as const) {
    const sideId = `${placement.id}:hero-return:${side}`;
    pushInstance(instances, {
      placementId: `${sideId}:contact-course`,
      moduleId: "hero_courtyard_return_finish",
      semanticClass: "hero_courtyard_return_grounding",
      meshId: "plinth_strip",
      position: localToWorld(side * (faceProjectionM + 0.015), 0, bottomY + 0.18),
      scale: { x: placement.sizeM.depth, y: 0.36, z: 0.14 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad: returnYawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${sideId}:story-course`,
      moduleId: "hero_courtyard_return_finish",
      semanticClass: "hero_courtyard_return_story_datum",
      meshId: "string_course_strip",
      position: localToWorld(side * (faceProjectionM + 0.02), 0, storyCourseY),
      scale: { x: Math.max(0.3, placement.sizeM.depth - terminalInsetM * 2), y: 0.15, z: 0.13 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad: returnYawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    for (const terminal of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `${sideId}:terminal-arris:${terminal}`,
        moduleId: "hero_courtyard_return_finish",
        semanticClass: "hero_courtyard_return_terminal_arris",
        meshId: "recessed_panel_frame_v",
        position: localToWorld(
          side * (faceProjectionM + 0.045),
          terminal * (placement.sizeM.depth * 0.5 - terminalInsetM - arrisWidthM * 0.5),
          (arrisBottomY + arrisTopY) * 0.5,
        ),
        scale: { x: arrisWidthM, y: arrisTopY - arrisBottomY, z: 0.09 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: returnYawRad,
        detailMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
        uvProjection: "world",
      });
    }
  }
}

function pushMassing(
  placement: V3ArchitectureMassingPlacement,
  instances: WallDetailInstance[],
  profile: V3FacadeProfile,
  frontageModules: readonly V3ArchitectureModulePlacement[],
  experimentalVisualCutoutMassing: boolean,
  ownsSharedShell: boolean,
  sharedBacking: SharedBackingVolume | null,
  backingPlacementId: string,
  higherRoofOwner: V3ArchitectureMassingPlacement | null = null,
  faceOwnedByModel = Boolean(placement.facadeModelId),
): void {
  requirePositiveDimensions(placement.id, placement.sizeM);
  const center = designToWorldVec3(placement.center);
  const yawRad = designYawDegToWorldYawRad(placement.yawDeg);
  const inward = faceInward(placement.face);
  const shellCenter = {
    x: center.x - inward.x * 0.02,
    y: center.y,
    z: center.z - inward.z * 0.02,
  };
  const identity = resolveBuildingMaterialIdentity(placement, profile.family);
  // An authored facade or section GLB owns the face: keep the shell, roof edge
  // and roof, skip the kit's base band, apron, repair patches and corner piers.
  if (experimentalVisualCutoutMassing) {
    pushMassingVisualShell(
      placement,
      frontageModules,
      instances,
      center,
      shellCenter,
      yawRad,
      ownsSharedShell,
      sharedBacking,
      backingPlacementId,
      identity,
      faceOwnedByModel,
    );
  } else {
    pushInstance(instances, {
      placementId: placement.id,
      moduleId: placement.massingProfileId,
      semanticClass: "closed_massing",
      meshId: "facade_wall_shell",
      position: shellCenter,
      scale: { x: placement.sizeM.width, y: placement.sizeM.height, z: placement.sizeM.depth },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      trimMaterialId: null,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
  }

  // A deliberate masonry contact band keeps closed building shells from
  // reading as texture-mapped boxes floating directly on the traversal floor.
  // Height varies by facade family, reinforcing district grammar while the
  // authored footprint and collision remain unchanged.
  const baseBandHeightM = profile.family === "service_storage"
    ? 0.46
    : profile.family === "active_merchant"
      ? 0.34
      : profile.family === "quiet_residential"
        ? 0.26
        : 0.38;
  const baseBandDepthM = profile.family === "service_storage" ? 0.16 : 0.12;
  const hasFacadeCutouts = experimentalVisualCutoutMassing
    && frontageModules.some(createsVisualFacadeCutout);
  if (!hasFacadeCutouts && !faceOwnedByModel) {
    pushInstance(instances, {
      placementId: `${placement.id}:wall-base`,
      moduleId: `${profile.family}_wall_base`,
      semanticClass: `${profile.family}_wall_base_contact`,
      meshId: "plinth_strip",
      position: {
        x: center.x + inward.x * (placement.sizeM.depth * 0.5 + baseBandDepthM * 0.42),
        y: center.y - placement.sizeM.height * 0.5 + baseBandHeightM * 0.5,
        z: center.z + inward.z * (placement.sizeM.depth * 0.5 + baseBandDepthM * 0.42),
      },
      scale: { x: placement.sizeM.width, y: baseBandHeightM, z: baseBandDepthM },
      yawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
    });
  }

  const bottomY = center.y - placement.sizeM.height * 0.5;
  const facadeSurfaceOffsetM = placement.sizeM.depth * 0.5 + 0.035;
  const structureStyle = resolveFacadeStructureStyle(profile.family);
  const isSpawnBSouthTower = placement.id.startsWith("ARCH_FRONTAGE_SPAWN_B_SOUTH_");
  if (profile.family === "active_merchant" && !hasFacadeCutouts && !faceOwnedByModel) {
    pushInstance(instances, {
      placementId: `${placement.id}:merchant-base-apron`,
      moduleId: "active_merchant_base_apron",
      semanticClass: "active_merchant_localized_base",
      meshId: "plinth_strip",
      position: offsetPosition(
        { ...center, y: bottomY + 0.22 },
        placement.face,
        -placement.sizeM.width * 0.22,
        facadeSurfaceOffsetM,
      ),
      scale: { x: Math.min(3.2, placement.sizeM.width * 0.26), y: 0.44, z: 0.15 },
      yawRad,
      trimMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
    });
  } else if (profile.family === "quiet_residential" && !hasFacadeCutouts && !faceOwnedByModel) {
    const repairPatches = [
      { alongM: -placement.sizeM.width * 0.04, yM: 0.68, widthM: 1.05, heightM: 0.42, rollRad: 0.025 },
      { alongM: placement.sizeM.width * 0.36, yM: 1.62, widthM: 0.72, heightM: 0.56, rollRad: -0.035 },
    ];
    for (const [index, patch] of repairPatches.entries()) {
      pushInstance(instances, {
        placementId: `${placement.id}:repair-patch:${index + 1}`,
        moduleId: "quiet_residential_repair_patch",
        semanticClass: "residential_plaster_repair",
        meshId: "facade_wall_shell",
        position: offsetPosition(
          { ...center, y: bottomY + patch.yM },
          placement.face,
          patch.alongM,
          placement.sizeM.depth * 0.5 + 0.018,
        ),
        scale: { x: patch.widthM, y: patch.heightM, z: 0.035 },
        yawRad,
        rollRad: patch.rollRad,
        wallMaterialId: placement.materialSlots.wall,
        detailTintHex: scaleHexColor(identity.wallTintHex, 0.92),
        uvProjection: "world",
      });
    }
    // The paired Spawn-B tower doors already own a threshold and one complete
    // wall-base course. A second localized repair in that same narrow bay made
    // three coplanar white streaks at the exact audit camera.
    if (!isSpawnBSouthTower) {
      pushInstance(instances, {
        placementId: `${placement.id}:residential-base-repair`,
        moduleId: "quiet_residential_base_repair",
        semanticClass: "residential_localized_base_repair",
        meshId: "plinth_strip",
        position: offsetPosition(
          { ...center, y: bottomY + 0.18 },
          placement.face,
          placement.sizeM.width * 0.28,
          facadeSurfaceOffsetM + 0.015,
        ),
        scale: { x: Math.min(1.55, placement.sizeM.width * 0.15), y: 0.36, z: 0.15 },
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        detailTintHex: identity.trimTintHex,
      });
    }
  }

  const corniceHeightM = profile.family === "active_merchant" ? 0.18 : 0.12;
  if (!hasFacadeCutouts) {
    // Quiet residential rooflines are simple masonry courses. Reusing the
    // three-part molded plinth here produced bright parallel rails across long
    // service frontages, which read as metal flashing instead of wall finish.
    const rooflineMeshId = profile.family === "quiet_residential"
      ? "facade_wall_shell"
      : "plinth_strip";
    pushInstance(instances, {
      placementId: `${placement.id}:roofline-cornice`,
      moduleId: `${profile.family}_roofline_cornice`,
      semanticClass: `${profile.family}_roofline`,
      meshId: rooflineMeshId,
      position: offsetPosition(
        { ...center, y: center.y + placement.sizeM.height * 0.5 - corniceHeightM * 0.5 },
        placement.face,
        0,
        facadeSurfaceOffsetM,
      ),
      scale: {
        x: placement.sizeM.width,
        y: corniceHeightM,
        z: profile.family === "active_merchant" ? 0.2 : 0.14,
      },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
  }

  // Only true frontage corners receive vertical masonry. Authored openings
  // provide the internal rhythm; repeating full-height bay strips made the
  // bazaar read like an institutional concrete frame.
  if (structureStyle && !faceOwnedByModel) {
    const structureBottomY = bottomY + baseBandHeightM * 0.52;
    const structureTopY = center.y + placement.sizeM.height * 0.5 - (
      hasFacadeCutouts ? FACADE_SKYLINE_BEVEL_HEIGHT_M : corniceHeightM
    );
    const structureHeightM = Math.min(
      structureTopY - structureBottomY,
      structureStyle.edgePierMaxHeightM,
    );
    const structureMaterialId = placement.materialSlots.wall;
    const edgeOffsets = [
      -placement.sizeM.width * 0.5 + structureStyle.edgePierWidthM * 0.5,
      placement.sizeM.width * 0.5 - structureStyle.edgePierWidthM * 0.5,
    ];

    for (const [index, alongM] of edgeOffsets.entries()) {
      pushInstance(instances, {
        placementId: `${placement.id}:facade-edge-support:${index + 1}`,
        moduleId: `${profile.family}_facade_structure`,
        semanticClass: `${profile.family}_facade_edge_support`,
        meshId: "corner_pier",
        position: offsetPosition(
          { ...center, y: structureBottomY + structureHeightM * 0.5 },
          placement.face,
          alongM,
          placement.sizeM.depth * 0.5 + structureStyle.projectionM * 0.42,
        ),
        scale: {
          x: structureStyle.edgePierWidthM,
          y: structureHeightM,
          z: structureStyle.projectionM,
        },
        yawRad,
        wallMaterialId: structureMaterialId,
        detailTintHex: scaleHexColor(identity.wallTintHex, index === 0 ? 0.94 : 1.02),
        uvProjection: "world",
      });
      // Cap the stack. Where these piers run past the roofline they were bare
      // shafts with a cut-off top, so the paired Spawn-B frontages read as four
      // free-standing posts rather than as two buildings. A corbelled cornice, a
      // coping and a short pierced screen head turn each one into a finished roof
      // stack that belongs to the facade it stands on.
      if (structureHeightM < 2.6) continue;
      const stackTopY = structureBottomY + structureHeightM;
      const capWidthM = structureStyle.edgePierWidthM + 0.2;
      const capDepthM = structureStyle.projectionM + 0.13;
      for (const [kind, meshId, widthM, heightM, depthM, y] of [
        ["screen-head", "recessed_panel_back" as const, structureStyle.edgePierWidthM - 0.14,
          0.34, structureStyle.projectionM + 0.02, stackTopY - 0.52],
        ["cornice", "cornice_strip" as const, capWidthM, 0.15, capDepthM, stackTopY - 0.17],
        ["coping", "string_course_strip" as const, capWidthM + 0.09, 0.1,
          capDepthM + 0.05, stackTopY - 0.05],
      ] as const) {
        pushInstance(instances, {
          placementId: `${placement.id}:facade-edge-stack-${kind}:${index + 1}`,
          moduleId: `${profile.family}_facade_structure`,
          semanticClass: `${profile.family}_facade_edge_stack_head`,
          meshId,
          position: offsetPosition(
            { ...center, y },
            placement.face,
            alongM,
            placement.sizeM.depth * 0.5 + structureStyle.projectionM * 0.42,
          ),
          scale: { x: widthM, y: heightM, z: depthM },
          yawRad,
          ...(kind === "screen-head"
            ? { detailMaterialId: "tm_arch_screen_dark" }
            : {
              trimMaterialId: placement.materialSlots.trim,
              detailTintHex: scaleHexColor(identity.trimTintHex, kind === "coping" ? 1.06 : 0.96),
              uvProjection: "world" as const,
            }),
        });
      }
      // Corbels carrying the cornice out over the shaft.
      for (const corbelSide of [-1, 1] as const) {
        pushInstance(instances, {
          placementId: `${placement.id}:facade-edge-stack-corbel:${index + 1}:${corbelSide}`,
          moduleId: `${profile.family}_facade_structure`,
          semanticClass: `${profile.family}_facade_edge_stack_head`,
          meshId: "pilaster",
          position: offsetPosition(
            { ...center, y: stackTopY - 0.32 },
            placement.face,
            alongM + corbelSide * (structureStyle.edgePierWidthM * 0.5 - 0.06),
            placement.sizeM.depth * 0.5 + structureStyle.projectionM * 0.42 + 0.04,
          ),
          scale: { x: 0.11, y: 0.16, z: structureStyle.projectionM + 0.06 },
          yawRad,
          trimMaterialId: placement.materialSlots.trim,
          detailTintHex: scaleHexColor(identity.trimTintHex, 0.88),
          uvProjection: "world",
        });
      }
    }
  }

  if (profile.family === "active_merchant") {
    pushMerchantUpperScreen(
      placement,
      frontageModules,
      instances,
      center,
      yawRad,
      bottomY,
      MERCHANT_TIMBER_MATERIAL_ID,
      identity.timberTintHex,
    );
  }

  if (hasFacadeCutouts) {
    pushFacadeStoryDatumGrammar(
      placement,
      frontageModules,
      instances,
      profile,
      center,
      yawRad,
      backingPlacementId,
    );
    pushMerchantElevationOrder(
      placement,
      frontageModules,
      instances,
      profile,
      center,
      yawRad,
      backingPlacementId,
    );
  }

  // An overlapping opposite frontage still owns and renders its authored
  // facade modules, cornice, and edge rhythm. The stable shared-shell owner is
  // solely responsible for the common roof/parapet mass, avoiding duplicate
  // sky silhouettes and coincident roof slabs.
  if (experimentalVisualCutoutMassing && !ownsSharedShell) return;

  pushCoveredArcadeReturnGrammar(
    placement,
    instances,
    profile,
    center,
    yawRad,
    backingPlacementId,
    identity,
  );
  if (experimentalVisualCutoutMassing) {
    pushMerchantResidentialReturnGrammar(
      placement,
      instances,
      profile,
      center,
      yawRad,
      backingPlacementId,
      identity,
    );
    pushHeroCourtyardReturnFinish(
      placement,
      instances,
      profile,
      center,
      yawRad,
      backingPlacementId,
      identity,
    );
    pushServiceStorageBackGrammar(
      placement,
      instances,
      profile,
      center,
      yawRad,
      backingPlacementId,
      identity,
    );
  }

  if (hasFacadeCutouts && placement.zoneId !== RUG_GATE_ZONE_ID) {
    const authoredWallTopY = center.y + placement.sizeM.height * 0.5;
    pushInstance(instances, {
      placementId: `${placement.id}:wall-top-coping`,
      moduleId: "full_footprint_wall_top_coping",
      semanticClass: "massing_perimeter_coping",
      meshId: "roof_slab",
      position: {
        x: center.x,
        y: authoredWallTopY + WALL_TOP_COPING_HEIGHT_M * 0.5,
        z: center.z,
      },
      scale: {
        x: placement.sizeM.width + WALL_TOP_COPING_OVERHANG_M * 2,
        y: WALL_TOP_COPING_HEIGHT_M,
        z: placement.sizeM.depth + WALL_TOP_COPING_OVERHANG_M * 2,
      },
      visualQaDimensions: {
        x: placement.sizeM.width + WALL_TOP_COPING_OVERHANG_M * 2,
        y: WALL_TOP_COPING_HEIGHT_M,
        z: placement.sizeM.depth + WALL_TOP_COPING_OVERHANG_M * 2,
      },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
    });
  }

  if (placement.id === "ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING") return;
  const roofInsetM = placement.roof.setbackM;
  let roofWidth = placement.sizeM.width - roofInsetM * 2;
  const roofDepth = placement.sizeM.depth - roofInsetM * 2;
  if (roofWidth < 0.5 || roofDepth < 0.5) {
    fail(`massing '${placement.id}' roof setback consumes the roof footprint`);
  }
  const roofCenter = {
    x: shellCenter.x,
    y: placement.roof.elevationM + ROOF_THICKNESS_M * 0.5,
    z: shellCenter.z,
  };
  const sharedRoofStart = higherRoofOwner ? higherRoofOwner.center.y - higherRoofOwner.sizeM.width * .5 : null;
  if (sharedRoofStart !== null) {
    const south = roofCenter.z - roofWidth * .5;
    roofWidth = sharedRoofStart - south;
    roofCenter.z = (south + sharedRoofStart) * .5;
  }
  const roofLocalToWorld = (
    localX: number,
    localZ: number,
    y: number,
  ): { x: number; y: number; z: number } => ({
    x: roofCenter.x + Math.cos(yawRad) * localX + Math.sin(yawRad) * localZ,
    y,
    z: roofCenter.z - Math.sin(yawRad) * localX + Math.cos(yawRad) * localZ,
  });
  pushInstance(instances, {
    placementId: `${placement.id}:roof`,
    moduleId: "roof_authored",
    semanticClass: "supported_roof",
    meshId: "roof_slab",
    position: roofCenter,
    scale: { x: roofWidth, y: ROOF_THICKNESS_M, z: roofDepth },
    yawRad,
    detailMaterialId: placement.materialSlots.roof,
    detailTintHex: identity.roofTintHex,
  });

  // Tea's bound east-face section replaces the former partial upper room.
  // The runtime keeps its measured shared slab and parapet, but must not leave
  // the legacy bulkhead and seeded heads above that 9.59 m cap.
  const sectionOwnsTeaRoof = faceOwnedByModel && placement.zoneId === "TEA_TERRACE";
  if (!sectionOwnsTeaRoof && !higherRoofOwner && placement.roof.style === "setback_flat" && placement.roof.upperStorySetbackM >= 0.5) {
    const bulkheadWidthM = profile.family === "active_merchant"
      ? Math.min(4.2, roofWidth * 0.42)
      : profile.family === "hero_courtyard"
        ? Math.min(4.6, roofWidth * 0.4)
        : Math.min(2.8, roofWidth * 0.3);
    const bulkheadDepthM = profile.family === "active_merchant"
      ? Math.min(2.15, roofDepth * 0.5)
      : Math.min(2.25, roofDepth * 0.48);
    const bulkheadHeightM = profile.family === "hero_courtyard"
      ? 1.5
      : profile.family === "active_merchant"
        ? 1.35
        : 0.95;
    const bulkheadCenter = roofLocalToWorld(
      -roofWidth * 0.18,
      -roofDepth * 0.17,
      placement.roof.elevationM + ROOF_THICKNESS_M + bulkheadHeightM * 0.5,
    );
    pushInstance(instances, {
      placementId: `${placement.id}:roof-bulkhead`,
      moduleId: "setback_roof_bulkhead",
      semanticClass: "partial_upper_roof_mass",
      meshId: "facade_wall_shell",
      position: bulkheadCenter,
      scale: { x: bulkheadWidthM, y: bulkheadHeightM, z: bulkheadDepthM },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:roof-bulkhead-cap`,
      moduleId: "setback_roof_bulkhead_cap",
      semanticClass: "supported_roof",
      meshId: "roof_slab",
      position: {
        ...bulkheadCenter,
        y: placement.roof.elevationM + ROOF_THICKNESS_M + bulkheadHeightM + ROOF_THICKNESS_M * 0.5,
      },
      scale: { x: bulkheadWidthM + 0.12, y: ROOF_THICKNESS_M, z: bulkheadDepthM + 0.12 },
      yawRad,
      detailMaterialId: placement.materialSlots.roof,
      detailTintHex: identity.roofTintHex,
    });
  }

  const silhouetteUnit = stableUnitInterval(placement.id);
  const skylineStyle = profile.family === "active_merchant"
    ? { widthM: 1.8, depthM: 1.45, heightM: 3.2 }
    : profile.family === "quiet_residential"
      ? { widthM: 2.25, depthM: 1.7, heightM: 2.55 }
      : profile.family === "hero_courtyard"
        ? { widthM: 1.9, depthM: 1.55, heightM: 3.65 }
        : profile.family === "service_storage"
          ? { widthM: 1.35, depthM: 1.15, heightM: 2.65 }
          : { widthM: 2.05, depthM: 1.6, heightM: 2.5 };
  const skylineWidthM = Math.max(0.24, Math.min(skylineStyle.widthM, roofWidth - 0.24));
  const skylineDepthM = Math.max(0.24, Math.min(skylineStyle.depthM, roofDepth - 0.24));
  const skylineTravelM = Math.max(0, roofWidth - skylineWidthM - 0.45);
  const skylineCenter = roofLocalToWorld(
    (silhouetteUnit - 0.5) * skylineTravelM * 0.72,
    roofDepth * (silhouetteUnit > 0.5 ? 0.12 : -0.08),
    placement.roof.elevationM + ROOF_THICKNESS_M + skylineStyle.heightM * 0.5,
  );
  // Rug Gate is itself the roofline landmark. Independent seeded rooftop
  // heads on its flanking massings were mostly occluded by the gable, leaving
  // only raw fins and a disconnected green cap visible above the eave. The
  // zone-level landmark seam therefore owns this silhouette as one system.
  const landmarkOwnsRoofSilhouette = placement.zoneId === RUG_GATE_ZONE_ID;
  const emitsSeededRoofSilhouette = !landmarkOwnsRoofSilhouette
    && placement.id !== "ARCH_FRONTAGE_COVERED_SOUK_EAST_MASSING"
    && placement.id !== "ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_MASSING"
    && placement.id !== "ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_MASSING"
    && placement.id !== "ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_MASSING"
    && placement.id !== "ARCH_FRONTAGE_SPICE_STREET_EAST_MASSING"
    && profile.family !== "hero_courtyard"
    && !sectionOwnsTeaRoof;
  if (emitsSeededRoofSilhouette) {
    pushInstance(instances, {
      placementId: `${placement.id}:roof-silhouette-head`,
      moduleId: `${profile.family}_roof_silhouette`,
      semanticClass: `${profile.family}_roof_silhouette_mass`,
      meshId: "facade_wall_shell",
      position: skylineCenter,
      scale: { x: skylineWidthM, y: skylineStyle.heightM, z: skylineDepthM },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:roof-silhouette-cap`,
      moduleId: `${profile.family}_roof_silhouette`,
      semanticClass: "supported_roof",
      meshId: "roof_slab",
      position: {
        ...skylineCenter,
        y: placement.roof.elevationM + ROOF_THICKNESS_M + skylineStyle.heightM + ROOF_THICKNESS_M * 0.4,
      },
      scale: { x: skylineWidthM + 0.1, y: ROOF_THICKNESS_M * 0.8, z: skylineDepthM + 0.1 },
      yawRad,
      detailMaterialId: placement.materialSlots.roof,
      detailTintHex: identity.roofTintHex,
    });
  }
  if (emitsSeededRoofSilhouette && roofWidth >= 2.6 && roofDepth >= 1.8) {
    const rearHeightM = skylineStyle.heightM * (0.68 + stableUnitInterval(`${placement.id}:rear-tier`) * 0.2);
    const rearWidthM = Math.min(roofWidth * 0.32, skylineWidthM * 1.18);
    const rearDepthM = Math.min(roofDepth * 0.38, skylineDepthM * 0.92);
    const rearCenter = roofLocalToWorld(
      -(silhouetteUnit - 0.5) * skylineTravelM * 0.48,
      roofDepth * (silhouetteUnit > 0.5 ? -0.2 : 0.2),
      placement.roof.elevationM + ROOF_THICKNESS_M + rearHeightM * 0.5,
    );
    pushInstance(instances, {
      placementId: `${placement.id}:roof-silhouette-rear-tier`,
      moduleId: `${profile.family}_roof_silhouette_tier`,
      semanticClass: `${profile.family}_layered_roof_mass`,
      meshId: "facade_wall_shell",
      position: rearCenter,
      scale: { x: rearWidthM, y: rearHeightM, z: rearDepthM },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:roof-silhouette-rear-cap`,
      moduleId: `${profile.family}_roof_silhouette_tier`,
      semanticClass: "supported_roof",
      meshId: "roof_slab",
      position: { ...rearCenter, y: placement.roof.elevationM + ROOF_THICKNESS_M + rearHeightM + ROOF_THICKNESS_M * 0.4 },
      scale: { x: rearWidthM + 0.1, y: ROOF_THICKNESS_M * 0.8, z: rearDepthM + 0.1 },
      yawRad,
      detailMaterialId: placement.materialSlots.roof,
      detailTintHex: identity.roofTintHex,
    });
  }

  const rooftopServiceUnit = stableUnitInterval(`${placement.id}:rooftop-service`);
  const serviceDensityAllows = profile.family === "active_merchant"
    || profile.family === "covered_arcade"
    || rooftopServiceUnit >= (profile.family === "quiet_residential" ? 0.42 : 0.58);
  if (
    placement.roof.style === "flat_parapet"
    && !landmarkOwnsRoofSilhouette
    && serviceDensityAllows
    && roofWidth >= 3.4
    && roofDepth >= 2.6
  ) {
    // Keep rooftop service equipment inside the complete parapet and on the
    // side opposite the seeded skyline head. This is a reusable, deterministic
    // roof grammar rather than free-placed topdown clutter.
    const serviceLocalX = (0.5 - silhouetteUnit) * Math.max(0.7, roofWidth * 0.32);
    const serviceLocalZ = (silhouetteUnit >= 0.5 ? -1 : 1) * Math.min(roofDepth * 0.25, 1.15);
    const roofSurfaceY = placement.roof.elevationM + ROOF_THICKNESS_M;
    const padWidthM = Math.min(1.35, Math.max(0.9, roofWidth * 0.14));
    const padDepthM = Math.min(1.05, Math.max(0.72, roofDepth * 0.18));
    const ventHeightM = 0.48 + rooftopServiceUnit * 0.28;
    const padCenter = roofLocalToWorld(serviceLocalX, serviceLocalZ, roofSurfaceY + 0.06);
    pushInstance(instances, {
      placementId: `${placement.id}:roof-service-pad`,
      moduleId: "seeded_rooftop_service_cluster",
      semanticClass: "grounded_rooftop_service_pad",
      meshId: "roof_slab",
      position: padCenter,
      scale: { x: padWidthM, y: 0.12, z: padDepthM },
      yawRad,
      detailMaterialId: placement.materialSlots.roof,
      detailTintHex: scaleHexColor(identity.wallTintHex, 0.72),
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:roof-service-vent`,
      moduleId: "seeded_rooftop_service_cluster",
      semanticClass: "roof_vent_shaft",
      meshId: "facade_wall_shell",
      position: {
        ...padCenter,
        y: roofSurfaceY + 0.12 + ventHeightM * 0.5,
      },
      scale: { x: padWidthM * 0.46, y: ventHeightM, z: padDepthM * 0.5 },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      detailTintHex: identity.wallTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:roof-service-vent-cap`,
      moduleId: "seeded_rooftop_service_cluster",
      semanticClass: "roof_vent_cap",
      meshId: "roof_slab",
      position: {
        ...padCenter,
        y: roofSurfaceY + 0.12 + ventHeightM + 0.045,
      },
      scale: { x: padWidthM * 0.56, y: 0.09, z: padDepthM * 0.62 },
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    const exhaustHeightM = 0.74 + stableUnitInterval(`${placement.id}:roof-exhaust`) * 0.42;
    const exhaustCenter = roofLocalToWorld(
      serviceLocalX + padWidthM * 0.72,
      serviceLocalZ - padDepthM * 0.12,
      roofSurfaceY + exhaustHeightM * 0.5,
    );
    pushInstance(instances, {
      placementId: `${placement.id}:roof-service-exhaust`,
      moduleId: "seeded_rooftop_service_cluster",
      semanticClass: "roof_exhaust_stack",
      meshId: "awning_pole",
      position: exhaustCenter,
      scale: { x: 0.12, y: exhaustHeightM, z: 0.12 },
      yawRad,
      detailMaterialId: "ph_rusty_metal_02",
      detailTintHex: 0x8b765f,
      uvProjection: "world",
    });
  }

  const ownsSpawnBShallowSkylineFixture = (
    placement.id === "ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_MASSING"
    || placement.id === "ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_MASSING"
  );
  if (
    ownsSpawnBShallowSkylineFixture
    && roofWidth >= 2.2
    && roofDepth >= 0.7
  ) {
    // SHOT_12's dominant flanking roofs are only 0.96 m deep, so the ordinary
    // service cluster cannot physically fit. A narrow exhaust stack is the
    // authored shallow-roof grammar: it seats on the roof edge opposite the
    // skyline head and stays fully inside the complete parapet.
    const fixtureSide = silhouetteUnit >= 0.5 ? -1 : 1;
    const fixtureLocalX = fixtureSide * Math.max(0.62, roofWidth * 0.38);
    const fixtureLocalZ = 0;
    const roofSurfaceY = placement.roof.elevationM + ROOF_THICKNESS_M;
    const stackHeightM = 1.02 + stableUnitInterval(`${placement.id}:shallow-stack`) * 0.34;
    const padCenter = roofLocalToWorld(
      fixtureLocalX,
      fixtureLocalZ,
      roofSurfaceY + 0.05,
    );
    pushInstance(instances, {
      placementId: `${placement.id}:shallow-roof-stack-pad`,
      moduleId: "shallow_roof_skyline_fixture",
      semanticClass: "grounded_rooftop_service_pad",
      meshId: "roof_slab",
      position: padCenter,
      scale: { x: 0.38, y: 0.1, z: Math.min(0.42, roofDepth * 0.46) },
      yawRad,
      detailMaterialId: placement.materialSlots.roof,
      detailTintHex: scaleHexColor(identity.wallTintHex, 0.74),
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:shallow-roof-stack`,
      moduleId: "shallow_roof_skyline_fixture",
      semanticClass: "roof_exhaust_stack",
      meshId: "awning_pole",
      position: {
        ...padCenter,
        y: roofSurfaceY + 0.1 + stackHeightM * 0.5,
      },
      scale: { x: 0.14, y: stackHeightM, z: 0.14 },
      yawRad,
      detailMaterialId: "ph_rusty_metal_02",
      detailTintHex: 0x89745e,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:shallow-roof-stack-cap`,
      moduleId: "shallow_roof_skyline_fixture",
      semanticClass: "roof_exhaust_cap",
      meshId: "roof_slab",
      position: {
        ...padCenter,
        y: roofSurfaceY + 0.1 + stackHeightM + 0.055,
      },
      scale: { x: 0.26, y: 0.11, z: 0.26 },
      yawRad,
      detailMaterialId: "ph_rusty_metal_02",
      detailTintHex: 0x786853,
      uvProjection: "world",
    });
  }

  const parapetH = placement.roof.parapetHeightM;
  if (parapetH <= 0 || landmarkOwnsRoofSilhouette) return;
  // The authored parapet datum is continuous around the complete roof. The
  // previous experimental path collapsed it to a 28 cm curb, then restored
  // height only at isolated corners and facade accents; that produced the
  // tooth-like skyline L1.4 is explicitly removing.
  const parapetWallHeightM = parapetH;
  const parapetThicknessM = PARAPET_THICKNESS_M;
  const parapetY = placement.roof.elevationM + ROOF_THICKNESS_M + parapetWallHeightM * 0.5;
  const parapetTopY = placement.roof.elevationM + ROOF_THICKNESS_M + parapetWallHeightM;
  const longZ = roofDepth * 0.5 - parapetThicknessM * 0.5;
  const shortX = roofWidth * 0.5 - parapetThicknessM * 0.5;
  for (const side of [-1, 1] as const) {
    pushInstance(instances, {
      placementId: `${placement.id}:parapet-long:${side}`,
      moduleId: "parapet_authored",
      semanticClass: "roof_parapet",
      meshId: "balcony_parapet",
      position: roofLocalToWorld(0, side * longZ, parapetY),
      // Stop the long runs at the inner faces of the short returns. The short
      // runs own each corner, eliminating overlapping box ends and the
      // sawtooth sky wedge they produced at oblique cameras.
      scale: {
        x: Math.max(MIN_DIMENSION_M, roofWidth - parapetThicknessM * 2),
        y: parapetWallHeightM,
        z: parapetThicknessM,
      },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      trimMaterialId: null,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:parapet-short:${side}`,
      moduleId: "parapet_authored",
      semanticClass: "roof_parapet",
      meshId: "balcony_parapet",
      position: roofLocalToWorld(side * shortX, 0, parapetY),
      scale: { x: parapetThicknessM, y: parapetWallHeightM, z: roofDepth },
      yawRad,
      wallMaterialId: placement.materialSlots.wall,
      trimMaterialId: null,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:parapet-long-coping:${side}`,
      moduleId: "parapet_authored_coping",
      semanticClass: "roof_parapet_coping",
      meshId: "roof_slab",
      position: roofLocalToWorld(0, side * longZ, parapetTopY + PARAPET_COPING_HEIGHT_M * 0.5),
      scale: {
        x: roofWidth,
        y: PARAPET_COPING_HEIGHT_M,
        z: parapetThicknessM + PARAPET_COPING_OVERHANG_M * 2,
      },
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `${placement.id}:parapet-short-coping:${side}`,
      moduleId: "parapet_authored_coping",
      semanticClass: "roof_parapet_coping",
      meshId: "roof_slab",
      position: roofLocalToWorld(side * shortX, 0, parapetTopY + PARAPET_COPING_HEIGHT_M * 0.5),
      scale: {
        x: parapetThicknessM + PARAPET_COPING_OVERHANG_M * 2,
        y: PARAPET_COPING_HEIGHT_M,
        z: roofDepth + PARAPET_COPING_OVERHANG_M * 2,
      },
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
  }

  if (structureStyle) {
    const capOffsets = [
      -roofWidth * 0.5 + structureStyle.edgePierWidthM * 0.5,
      roofWidth * 0.5 - structureStyle.edgePierWidthM * 0.5,
    ];
    for (const [index, alongM] of capOffsets.entries()) {
      pushInstance(instances, {
        placementId: `${placement.id}:front-parapet-pier:${index + 1}`,
        moduleId: `${profile.family}_facade_structure`,
        semanticClass: `${profile.family}_parapet_pier`,
        meshId: "balcony_parapet",
        position: roofLocalToWorld(
          alongM,
          -longZ - 0.01,
          parapetY,
        ),
        scale: {
          x: structureStyle.edgePierWidthM,
          y: parapetWallHeightM,
          z: parapetThicknessM + 0.025,
        },
        yawRad,
        wallMaterialId: placement.materialSlots.wall,
        trimMaterialId: null,
        detailTintHex: identity.wallTintHex,
        uvProjection: "world",
      });
    }
  }

  const rooflineAccent = profile.family === "active_merchant"
    ? { widthM: Math.min(2.4, roofWidth * 0.26), heightM: 0.32, alongM: (silhouetteUnit - 0.5) * roofWidth * 0.38 }
    : profile.family === "quiet_residential"
      ? { widthM: Math.min(1.35, roofWidth * 0.16), heightM: 0.18, alongM: (silhouetteUnit - 0.5) * roofWidth * 0.42 }
      : profile.family === "hero_courtyard"
        ? { widthM: Math.min(3, roofWidth * 0.3), heightM: 0.42, alongM: (silhouetteUnit - 0.5) * roofWidth * 0.3 }
        : null;
  // A zone-level landmark owns its complete roof silhouette. Suppressing the
  // ordinary seeded accent here prevents an otherwise valid parapet insert
  // from surviving the gable occlusion as a disconnected colored plane.
  if (rooflineAccent && !landmarkOwnsRoofSilhouette) {
    pushInstance(instances, {
      placementId: `${placement.id}:front-parapet-accent`,
      moduleId: `${profile.family}_front_parapet_accent`,
      semanticClass: `${profile.family}_parapet_silhouette`,
      meshId: "balcony_parapet",
      position: roofLocalToWorld(
        rooflineAccent.alongM,
        -longZ - 0.01,
        parapetTopY - rooflineAccent.heightM * 0.5,
      ),
      scale: {
        x: rooflineAccent.widthM,
        y: rooflineAccent.heightM,
        z: parapetThicknessM + 0.02,
      },
      yawRad,
      detailMaterialId: placement.materialSlots.trim,
      detailTintHex: identity.trimTintHex,
      uvProjection: "world",
    });
  }
  if (higherRoofOwner && sharedRoofStart !== null) {
    for (const item of instances) {
      if (!item.placementId?.startsWith(placement.id + ":") || !/wall-top-coping$|skyline-coping$/.test(item.placementId)) continue;
      const south = item.position.z - item.scale.x * .5;
      item.scale.x = sharedRoofStart - south;
      item.position.z = (south + sharedRoofStart) * .5;
    }
    const east = placement.center.x + placement.sizeM.depth * .5;
    const west = higherRoofOwner.center.x + higherRoofOwner.sizeM.depth * .5;
    const north = Math.min(placement.center.y + placement.sizeM.width * .5, higherRoofOwner.center.y + higherRoofOwner.sizeM.width * .5);
    const rise = higherRoofOwner.roof.elevationM - placement.roof.elevationM;
    if (east > west && north > sharedRoofStart && rise > 0) {
      pushInstance(instances, { placementId: `${placement.id}:shared-roof-riser`, moduleId: "textile_shared_roof_junction",
        semanticClass: "shared_roof_wall_junction", meshId: "facade_wall_shell",
        position: { x: (east + west) * .5, y: placement.roof.elevationM + rise * .5, z: (north + sharedRoofStart) * .5 },
        scale: { x: north - sharedRoofStart, y: rise, z: east - west }, yawRad,
        wallMaterialId: placement.materialSlots.wall, backingPlacementId, structurallyBacked: true, uvProjection: "world" });
      pushInstance(instances, { placementId: `${placement.id}:shared-roof-edge-cap`, moduleId: "textile_shared_roof_junction",
        semanticClass: "shared_roof_edge_junction", meshId: "roof_slab",
        position: { x: (east + west + .12) * .5, y: higherRoofOwner.roof.elevationM + .13, z: (north + sharedRoofStart) * .5 },
        scale: { x: north - sharedRoofStart, y: .26, z: east - west + .12 }, yawRad,
        detailMaterialId: placement.materialSlots.roof, backingPlacementId, structurallyBacked: true });
    }
  }

}

function pointInRect(zone: RuntimeBlockoutZone, x: number, z: number): boolean {
  return x >= zone.rect.x && x <= zone.rect.x + zone.rect.w
    && z >= zone.rect.y && z <= zone.rect.y + zone.rect.h;
}

function pushElevationFoundations(
  surfaces: readonly RuntimeTraversalSurface[],
  instances: WallDetailInstance[],
  coverage: readonly Bz04BoundaryCoverage[],
): void {
  for (const surface of surfaces) {
    if (surface.kind === "flat") {
      if (surface.elevationM <= MIN_DIMENSION_M) continue;
      const foundationHeightM = Math.max(
        MIN_DIMENSION_M,
        surface.elevationM - ELEVATION_FOUNDATION_TOP_CLEARANCE_M,
      );
      pushInstance(instances, {
        placementId: `ELEVATION_FOUNDATION:${surface.id}`,
        moduleId: "elevation_foundation",
        semanticClass: "terrace_retaining_mass",
        meshId: "facade_wall_shell",
        position: {
          x: surface.rect.x + surface.rect.w * 0.5,
          y: foundationHeightM * 0.5,
          z: surface.rect.y + surface.rect.h * 0.5,
        },
        scale: {
          x: surface.rect.w,
          y: foundationHeightM,
          z: surface.rect.h,
        },
        yawRad: 0,
        wallMaterialId: ELEVATION_FOUNDATION_MATERIAL_ID,
      });
      continue;
    }

    const pushTrim = (instance: Parameters<typeof pushInstance>[1], side: number, nominalSpan?: [number,number]): void => {
      const alongX = surface.axis === "x";
      const axis = alongX ? "x" : "z";
      const angle = alongX ? (instance.rollRad ?? 0) : -(instance.pitchRad ?? 0);
      const cosine = Math.cos(angle);
      const projectedLength = instance.scale[axis] * cosine;
      const center = instance.position[axis];
      const edge = {orientation:alongX ? "horizontal" as const : "vertical" as const,
        coord:alongX ? surface.rect.y+(side<0 ? 0 : surface.rect.h) : surface.rect.x+(side<0 ? 0 : surface.rect.w),
        start:center-projectedLength/2,end:center+projectedLength/2,outward:side<0 ? -1 as const : 1 as const};
      // The cheek's 5 mm slice-overlap lips belong to that same slice. When
      // its whole in-ramp span is owned, retire those lips with the cheek.
      if (!bz04SectionVisualSegments({...edge,start:nominalSpan?.[0] ?? edge.start,end:nominalSpan?.[1] ?? edge.end},coverage).length) return;
      const remaining = bz04SectionVisualSegments(edge,coverage);
      if (remaining.length===1 && remaining[0]!.start===edge.start && remaining[0]!.end===edge.end) {
        pushInstance(instances,instance);return;
      }
      for (const [index,part] of remaining.entries()) {
        const midpoint=(part.start+part.end)/2;
        // Keep the original tilted cap plane and cross-section while cutting
        // only its owned along-edge span. Foundation bodies remain separate.
        pushInstance(instances,{...instance,placementId:`${instance.placementId}:receiver-remainder-${index}`,
          position:{...instance.position,[axis]:midpoint,y:instance.position.y+(midpoint-center)*Math.tan(angle)},
          scale:{...instance.scale,[axis]:(part.end-part.start)/cosine}});
      }
    };
    const crossWidthM = surface.axis === "x" ? surface.rect.h : surface.rect.w;
    if (crossWidthM <= RAMP_RETAINING_CHEEK_WIDTH_M * 2 + MIN_DIMENSION_M) {
      fail(`surface '${surface.id}' is too narrow for retaining cheeks`);
    }
    for (let index = 0; index < ELEVATION_FOUNDATION_SLICES; index += 1) {
      const t0 = index / ELEVATION_FOUNDATION_SLICES;
      const t1 = (index + 1) / ELEVATION_FOUNDATION_SLICES;
      const elevation0 = surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t0;
      const elevation1 = surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t1;
      const height = Math.min(elevation0, elevation1);
      if (height <= MIN_DIMENSION_M) continue;
      const width = surface.axis === "x" ? surface.rect.w / ELEVATION_FOUNDATION_SLICES : surface.rect.w;
      const depth = surface.axis === "y" ? surface.rect.h / ELEVATION_FOUNDATION_SLICES : surface.rect.h;
      const x = surface.axis === "x"
        ? surface.rect.x + surface.rect.w * (t0 + t1) * 0.5
        : surface.rect.x + surface.rect.w * 0.5;
      const z = surface.axis === "y"
        ? surface.rect.y + surface.rect.h * (t0 + t1) * 0.5
        : surface.rect.y + surface.rect.h * 0.5;
      const foundationHeight = height - ELEVATION_FOUNDATION_TOP_CLEARANCE_M;
      if (foundationHeight >= MIN_DIMENSION_M) pushInstance(instances, {
        placementId: `ELEVATION_FOUNDATION:${surface.id}:${index + 1}`,
        moduleId: "elevation_foundation",
        semanticClass: "ramp_foundation",
        meshId: "facade_wall_shell",
        position: { x, y: foundationHeight * 0.5, z },
        scale: surface.axis === "x"
          ? { x: width + 0.01, y: foundationHeight, z: depth - RAMP_RETAINING_CHEEK_WIDTH_M * 2 }
          : { x: width - RAMP_RETAINING_CHEEK_WIDTH_M * 2, y: foundationHeight, z: depth + 0.01 },
        yawRad: 0,
        wallMaterialId: ELEVATION_FOUNDATION_MATERIAL_ID,
      });

      for (const side of [-1, 1] as const) {
        const cheekX = surface.axis === "y"
          ? surface.rect.x + (side < 0
            ? RAMP_RETAINING_CHEEK_WIDTH_M * 0.5
            : surface.rect.w - RAMP_RETAINING_CHEEK_WIDTH_M * 0.5)
          : x;
        const cheekZ = surface.axis === "x"
          ? surface.rect.y + (side < 0
            ? RAMP_RETAINING_CHEEK_WIDTH_M * 0.5
            : surface.rect.h - RAMP_RETAINING_CHEEK_WIDTH_M * 0.5)
          : z;
        pushTrim({
          placementId: `ELEVATION_FOUNDATION:${surface.id}:cheek:${side}:${index + 1}`,
          moduleId: "elevation_retaining_cheek",
          semanticClass: "ramp_retaining_cheek",
          meshId: "facade_wall_shell",
          position: { x: cheekX, y: height * 0.5, z: cheekZ },
          scale: surface.axis === "x"
            ? { x: width + 0.01, y: height, z: RAMP_RETAINING_CHEEK_WIDTH_M + 0.01 }
            : { x: RAMP_RETAINING_CHEEK_WIDTH_M + 0.01, y: height, z: depth + 0.01 },
          yawRad: 0,
          wallMaterialId: ELEVATION_FOUNDATION_MATERIAL_ID,
        }, side, surface.axis === "x"
          ? [surface.rect.x+surface.rect.w*t0,surface.rect.x+surface.rect.w*t1]
          : [surface.rect.y+surface.rect.h*t0,surface.rect.y+surface.rect.h*t1]);
      }
    }

    const elevationDeltaM = surface.endElevationM - surface.startElevationM;
    const runLengthM = surface.axis === "x" ? surface.rect.w : surface.rect.h;
    const capPitchRad = surface.axis === "y" ? -Math.atan2(elevationDeltaM, runLengthM) : 0;
    const capRollRad = surface.axis === "x" ? Math.atan2(elevationDeltaM, runLengthM) : 0;
    for (const side of [-1, 1] as const) {
      const capX = surface.axis === "y"
        ? surface.rect.x + (side < 0
          ? RAMP_RETAINING_CHEEK_WIDTH_M * 0.5
          : surface.rect.w - RAMP_RETAINING_CHEEK_WIDTH_M * 0.5)
        : surface.rect.x + surface.rect.w * 0.5;
      const capZ = surface.axis === "x"
        ? surface.rect.y + (side < 0
          ? RAMP_RETAINING_CHEEK_WIDTH_M * 0.5
          : surface.rect.h - RAMP_RETAINING_CHEEK_WIDTH_M * 0.5)
        : surface.rect.y + surface.rect.h * 0.5;
      pushTrim({
        placementId: `ELEVATION_FOUNDATION:${surface.id}:cap:${side}`,
        moduleId: "elevation_retaining_cap",
        semanticClass: "ramp_retaining_cap",
        meshId: "plinth_strip",
        position: {
          x: capX,
          y: (surface.startElevationM + surface.endElevationM) * 0.5 + RAMP_RETAINING_CAP_RISE_M,
          z: capZ,
        },
        scale: surface.axis === "x"
          ? { x: surface.rect.w, y: RAMP_RETAINING_CAP_HEIGHT_M, z: RAMP_RETAINING_CHEEK_WIDTH_M }
          : { x: RAMP_RETAINING_CHEEK_WIDTH_M, y: RAMP_RETAINING_CAP_HEIGHT_M, z: surface.rect.h },
        yawRad: 0,
        ...(capPitchRad !== 0 ? { pitchRad: capPitchRad } : {}),
        ...(capRollRad !== 0 ? { rollRad: capRollRad } : {}),
        trimMaterialId: ELEVATION_FOUNDATION_MATERIAL_ID,
      }, side);
    }
  }
}

/**
 * Finish the exposed top of the existing west boundary wall north of the Rug
 * Gate merchant frontage. This span is a connector-side structural wall and
 * cannot be claimed by a facade massing; the coping is therefore render-only,
 * derives its start from the compiled frontage end, and leaves the collider,
 * connector, traversal, and segment height untouched.
 */
function pushRugGateWestWallCoping(
  zones: readonly RuntimeBlockoutZone[],
  placements: readonly V3ArchitecturePlacement[],
  instances: WallDetailInstance[],
): void {
  const gateZone = zones.find((zone) => zone.id === RUG_GATE_ZONE_ID);
  const westMassing = placements.find(
    (placement): placement is V3ArchitectureMassingPlacement => (
      placement.kind === "massing"
      && placement.zoneId === RUG_GATE_ZONE_ID
      && placement.face === "west"
    ),
  );
  if (!gateZone || !westMassing) return;

  const frontageEndZ = westMassing.center.y + westMassing.sizeM.width * 0.5;
  const connectorCutEndZ = zones
    .filter((zone) => (
      zone.type === "cut"
      && Math.abs(zone.rect.x + zone.rect.w - gateZone.rect.x) <= FACADE_FIT_EPSILON_M
      && zone.rect.y < gateZone.rect.y + gateZone.rect.h
      && zone.rect.y + zone.rect.h > gateZone.rect.y
    ))
    .reduce((endZ, zone) => Math.max(endZ, zone.rect.y + zone.rect.h), frontageEndZ);
  const copingStartZ = Math.max(frontageEndZ, connectorCutEndZ);
  const northWallEndZ = gateZone.rect.y + gateZone.rect.h;
  const copingLengthM = northWallEndZ - copingStartZ;
  if (copingLengthM <= MIN_DIMENSION_M) return;
  pushInstance(instances, {
    placementId: "ARCH_RUG_GATE_WEST_NORTH_WALL_COPING",
    moduleId: "rug_gate_connector_wall_mitred_coping",
    semanticClass: "structural_wall_top_coping",
    meshId: "roof_slab",
    position: {
      x: gateZone.rect.x,
      y: westMassing.roof.elevationM + RUG_GATE_WEST_COPING_HEIGHT_M * 0.5,
      z: copingStartZ + copingLengthM * 0.5,
    },
    scale: {
      x: RUG_GATE_WEST_COPING_WIDTH_M,
      y: RUG_GATE_WEST_COPING_HEIGHT_M,
      z: copingLengthM,
    },
    yawRad: 0,
    trimMaterialId: "ph_stone_trim_sandstone",
  });
}

/** Spec checks for a facade module placement: size, profile, material slot and module membership. */
function validateFacadeModule(
  placement: V3ArchitectureModulePlacement,
  profiles: ReadonlyMap<string, V3FacadeProfile>,
): void {
  requirePositiveDimensions(placement.id, placement.sizeM);
  const profile = profiles.get(placement.profileId)
    ?? fail(`placement '${placement.id}' references unknown facade profile '${placement.profileId}'`);
  if (!profile.materialSlots[placement.materialSlot]) {
    fail(`placement '${placement.id}' resolves an empty '${placement.materialSlot}' material slot`);
  }
  if (!profile.moduleIds.includes(placement.moduleId)) {
    fail(`placement '${placement.id}' uses module '${placement.moduleId}' outside profile '${profile.id}'`);
  }
}

function resolveSegmentZone(
  segment: BoundarySegment,
  zones: readonly RuntimeBlockoutZone[],
): RuntimeBlockoutZone | null {
  const centerX = segment.orientation === "vertical" ? segment.coord : (segment.start + segment.end) * 0.5;
  const centerZ = segment.orientation === "horizontal" ? segment.coord : (segment.start + segment.end) * 0.5;
  const inwardX = segment.orientation === "vertical" ? -segment.outward : 0;
  const inwardZ = segment.orientation === "horizontal" ? -segment.outward : 0;
  const probeX = centerX + inwardX * 0.1;
  const probeZ = centerZ + inwardZ * 0.1;
  return zones
    .filter((zone) => pointInRect(zone, probeX, probeZ))
    .sort((left, right) => left.rect.w * left.rect.h - right.rect.w * right.rect.h)[0] ?? null;
}

export function buildV3Architecture(options: BuildV3ArchitectureOptions): V3ArchitectureBuildResult {
  if (options.placements.length === 0) {
    fail("format v3 requires compiled architecture placements");
  }
  const ids = new Set<string>();
  const massingProfiles = new Map(options.massingProfiles.map((profile) => [profile.id, profile]));
  const facadeProfiles = new Map(options.facadeProfiles.map((profile) => [profile.id, profile]));
  for (const profile of options.facadeProfiles) {
    requirePbrMassingSlots("facade profile", profile.id, profile.materialSlots);
    if (!massingProfiles.has(profile.massingProfileId)) {
      fail(`facade profile '${profile.id}' references unknown massing profile '${profile.massingProfileId}'`);
    }
  }
  const instances: WallDetailInstance[] = [];
  const doorModelPlacements: DoorModelPlacement[] = [];
  const facadeModelPlacements: FacadeModelPlacement[] = [];
  // A face owned by an authored GLB keeps its modules as aperture, recess-depth
  // and shared-shell inputs.
  const sectionOwnedFaces = options.sectionOwnedFaces ?? new Set<string>();
  const receiverCoverageByFrontage = new Map<string, Bz04BoundaryCoverage[]>();
  const receiverOwnedFrontages = new Set(options.placements.flatMap(placement => {
    if (placement.kind !== "massing") return [];
    const zone = options.zones.find(zone => zone.id === placement.zoneId);
    if (!zone) return [];
    const horizontal = placement.face === "north" || placement.face === "south";
    const center = horizontal ? placement.center.x : placement.center.y;
    const coord = placement.face === "north" ? zone.rect.y + zone.rect.h : placement.face === "south" ? zone.rect.y
      : placement.face === "east" ? zone.rect.x + zone.rect.w : zone.rect.x;
    const coverage = (options.bz04BoundaryCoverage ?? []).filter(span => span.orientation === (horizontal ? "horizontal" : "vertical")
      && Math.abs(span.coord-coord) <= .001 && span.start < center+placement.sizeM.width/2 && span.end > center-placement.sizeM.width/2);
    receiverCoverageByFrontage.set(placement.frontageId, coverage);
    const remaining = bz04SectionVisualSegments({orientation:horizontal ? "horizontal" : "vertical",coord,
      start:center-placement.sizeM.width/2,end:center+placement.sizeM.width/2,outward:1},coverage);
    return remaining.length === 0 ? [placement.frontageId] : [];
  }));
  const ownedBySection = (placement: { zoneId: string; face: FacadeFace; frontageId: string }) => sectionOwnedFaces.has(`${placement.zoneId}:${placement.face}`) || receiverOwnedFrontages.has(placement.frontageId);
  const modulesByFrontage = new Map<string, V3ArchitectureModulePlacement[]>();
  for (const placement of options.placements) {
    if (placement.kind !== "facade_module") continue;
    const frontageModules = modulesByFrontage.get(placement.frontageId);
    if (frontageModules) {
      frontageModules.push(placement);
    } else {
      modulesByFrontage.set(placement.frontageId, [placement]);
    }
  }
  const experimentalVisualCutoutMassing = options.experimentalVisualCutoutMassing === true;
  const shellOwnership = experimentalVisualCutoutMassing
    ? resolveMassingShellOwnership(options.placements, modulesByFrontage)
    : {
        owners: new Set<string>(),
        sharedBackingByOwner: new Map<string, SharedBackingVolume>(),
        backingOwnerByMassing: new Map<string, string>(),
      };
  pushElevationFoundations(options.traversalSurfaces, instances, options.bz04BoundaryCoverage ?? []);
  pushRugGateWestWallCoping(options.zones, options.placements, instances);
  for (const placement of [...options.placements].sort((left, right) => left.id.localeCompare(right.id))) {
    if (ids.has(placement.id)) fail(`duplicate placement id '${placement.id}'`);
    ids.add(placement.id);
    // Facade modules render nothing of their own; pushMassing reads them as
    // aperture and recess inputs.
    if (placement.kind === "facade_module") {
      validateFacadeModule(placement, facadeProfiles);
      continue;
    }
    if (options.bz04Courtyard && placement.zoneId === "SPAWN_B_COURTYARD") continue;
    const completeSection = options.bz04SectionOwnedFaces?.has(`${placement.zoneId}:${placement.face}`) || receiverOwnedFrontages.has(placement.frontageId);
    const firstInstance = instances.length;
    requirePbrMassingSlots("massing", placement.id, placement.materialSlots);
    if (!massingProfiles.has(placement.massingProfileId)) {
      fail(`massing '${placement.id}' references unknown profile '${placement.massingProfileId}'`);
    }
    const facadeProfile = facadeProfiles.get(placement.profileId)
      ?? fail(`massing '${placement.id}' references unknown facade profile '${placement.profileId}'`);
    const frontageModules = modulesByFrontage.get(placement.frontageId) ?? [];
    const hasVisualCutouts = frontageModules.some(createsVisualFacadeCutout);
    const replacedRoof = options.bz04ReplacedRoofMassings?.has(placement.id);
    const massingInstances: WallDetailInstance[] = completeSection || replacedRoof ? [] : instances;
    pushMassing(
      placement,
      massingInstances,
      facadeProfile,
      frontageModules,
      experimentalVisualCutoutMassing,
      !experimentalVisualCutoutMassing || !hasVisualCutouts || shellOwnership.owners.has(placement.id),
      shellOwnership.sharedBackingByOwner.get(placement.id) ?? null,
      shellOwnership.backingOwnerByMassing.get(placement.id) ?? placement.id,
      placement.id === "ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_MASSING"
        ? options.placements.find((p): p is V3ArchitectureMassingPlacement => p.kind === "massing" && p.id === "ARCH_FRONTAGE_TEA_TERRACE_EAST_MASSING") ?? null
        : null,
      Boolean(placement.facadeModelId) || ownedBySection(placement),
    );
    // Retain the legacy roof until its supported bundle replaces its footprint.
    if (completeSection) {
      // A fully replaced supporting footprint also retires its old projecting
      // roof trim; leaving its outside lip would cut across the new windows.
      if (!replacedRoof) {
        instances.push(...massingInstances.filter(instance => /roof_slab|roof_parapet|roof_coping|roof_finish/.test(instance.meshId+":"+(instance.semanticClass??""))));
      }
      continue;
    }
    if (replacedRoof) {
      instances.push(...massingInstances.filter(instance => !/roof_slab|roof_parapet|roof_coping|roof_finish/.test(instance.meshId+":"+(instance.semanticClass??""))));
    }
    if (placement.facadeModelId) {
      const center = designToWorldVec3(placement.center);
      const inward = faceInward(placement.face);
      facadeModelPlacements.push({
        placementId: placement.id,
        frontageId: placement.frontageId,
        modelId: placement.facadeModelId,
        base: {
          x: center.x + inward.x * placement.sizeM.depth * 0.5,
          y: center.y - placement.sizeM.height * 0.5,
          z: center.z + inward.z * placement.sizeM.depth * 0.5,
        },
        inward,
        widthM: placement.sizeM.width,
        heightM: placement.sizeM.height,
      });
    }
    const receiverCoverage = receiverCoverageByFrontage.get(placement.frontageId) ?? [];
    if (receiverCoverage.length) {
      const emitted = instances.splice(firstInstance);
      instances.push(...emitted.flatMap(instance => bz04ReceiverFragments(instance, receiverCoverage)));
    }
  }

  const segmentHeights = options.segments.map((segment) => {
    const zone = resolveSegmentZone(segment, options.zones);
    if (!zone?.facadeProfileId) return options.wallHeightM;
    const facade = facadeProfiles.get(zone.facadeProfileId);
    if (!facade) return options.wallHeightM;
    return massingProfiles.get(facade.massingProfileId)?.heightM ?? options.wallHeightM;
  });
  return {
    instances,
    doorModelPlacements,
    facadeModelPlacements,
    segmentHeights,
    stats: {
      enabled: true,
      seed: 0,
      density: 1,
      segmentCount: options.segments.length,
      segmentsDecorated: new Set(options.placements.map((placement) => placement.frontageId)).size,
      instanceCount: instances.length,
    },
  };
}
