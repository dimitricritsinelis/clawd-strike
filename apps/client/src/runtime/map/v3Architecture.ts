import type { BoundarySegment } from "./buildBlockout";
import { designToWorldVec3, designYawDegToWorldYawRad } from "./coordinateTransforms";
import type { RuntimeBlockoutZone, RuntimeTraversalSurface } from "./types";
import { CASTLE_DOOR_ID, type DoorModelPlacement } from "./buildDoorModels";
import type { WallDetailInstance, WallDetailMeshId } from "./wallDetailKit";

type FacadeFace = "north" | "south" | "east" | "west";
type MaterialSlot = "wall" | "trim" | "roof" | "timber" | "metal" | "accent";

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
  layoutSource: "generated";
  center: { x: number; y: number; z: number };
  sizeM: { width: number; depth: number; height: number };
  yawDeg: number;
  materialSlot: MaterialSlot;
  /**
   * Noninteractive façade bays are compiled as false. Keeping the renderer
   * tolerant of a true connector is intentional: the massing cutout remains,
   * while this visual layer emits no leaf, backing, frame, or threshold that
   * could contradict the connector's gameplay collision.
   */
  collisionOpening: boolean;
};

export type V3ArchitecturePlacement = V3ArchitectureMassingPlacement | V3ArchitectureModulePlacement;

export type BuildV3ArchitectureOptions = {
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
   * Bays that already have a merchant stall seated in them. A bay serves one
   * function: where a stall occupies the recess, the bay must not also render
   * its own counter, shelving, display posts and shutters, or the frontage
   * reads as two competing shops stacked in one opening.
   */
  stallSeatedPlacementIds?: ReadonlySet<string>;
};

export type V3ArchitectureBuildResult = {
  instances: WallDetailInstance[];
  doorModelPlacements: DoorModelPlacement[];
  segmentHeights: number[];
  stats: {
    enabled: boolean;
    seed: number;
    density: number;
    segmentCount: number;
    segmentsDecorated: number;
    instanceCount: number;
  };
};

const MIN_DIMENSION_M = 0.02;
// Merchant joinery must resolve through the loaded rough-pine PBR family even
// when an older facade profile still names the flat balcony template. Keeping
// this at the reusable architecture seam lets per-opening tints and UV offsets
// actually separate neighboring shops.
const MERCHANT_TIMBER_MATERIAL_ID = "ph_worn_planks";
// Retained for reference: the awning support assembly formerly ran on this
// metal base. Its struts and end fixings are timber in the target, so they now
// take MERCHANT_TIMBER_MATERIAL_ID and nothing else here needed a metal source.
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
const FRAME_WIDTH_M = 0.13;
const FRAME_DEPTH_M = 0.11;
const PANEL_DEPTH_M = 0.055;
const SHOP_RECESS_MIN_DEPTH_M = 1;
const SHOP_RECESS_MAX_DEPTH_M = 2;
const SHOP_RECESS_LEGACY_MIN_DEPTH_M = 0.5;
const SHOP_RECESS_LEGACY_MAX_DEPTH_M = 0.68;
const SHOP_RECESS_LEGACY_DEPTH_M = 0.6;
const SHOP_RECESS_EXTRA_DEPTH_M = 0.12;
const SHOP_SURROUND_WIDTH_M = 0.15;
const SHOP_SURROUND_DEPTH_M = 0.56;
const AWNING_DEPTH_M = 0.78;
const AWNING_PITCH_RAD = -0.1;
const AWNING_VALANCE_HEIGHT_M = 0.15;
// Validated B.PL14 construction override: the southern Spice-west merchant bay
// sits beside the frontage approach return. Its generic deep canopy projects the near
// brace past the served opening and reads as an orphan fixture from SHOT_13.
// Keep the complete two-ended support kit, but use a shallow rain hood that
// stays within the terminal bay's return clearance.
const SHALLOW_TERMINAL_AWNING_IDS = new Set([
  "ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_01",
]);
const ELEVATION_FOUNDATION_SLICES = 10;
const ELEVATION_FOUNDATION_MATERIAL_ID = "ph_sandstone_blocks_05";
const RAMP_RETAINING_CHEEK_WIDTH_M = 0.24;
const RAMP_RETAINING_CAP_HEIGHT_M = 0.14;
const RAMP_RETAINING_CAP_RISE_M = 0.08;
const RUG_GATE_ZONE_ID = "RUG_GATE";
const RUG_GATE_BACKDROP_ZONE_ID = "SPAWN_B_COURTYARD";
// The sealed perimeter reads as a low market frontage; stepped grounded shells
// beyond it carry the remaining height instead of one warehouse-scale sheet.
const RUG_GATE_BACKDROP_HEIGHT_M = 5.4;
const RUG_GATE_BACKDROP_MARGIN_M = 0.2;
const RUG_GATE_BACKDROP_ARCH_HEIGHT_M = 4.35;
const RUG_GATE_BACKDROP_UPPER_DEPTH_M = 2.8;
const RUG_GATE_WEST_COPING_HEIGHT_M = 0.18;
const RUG_GATE_WEST_COPING_WIDTH_M = 0.38;
const RUG_GATE_HERO_RECESS_FROM_NORTH_M = 1.7;
const RUG_GATE_HERO_FRONT_DEPTH_M = 0.46;
const RUG_GATE_GABLE_TRIM_HEIGHT_M = 0.28;
const RUG_GATE_INNER_FRAME_MAX_WIDTH_M = 6.4;
const RUG_GATE_INNER_FRAME_PIER_CENTER_RATIO = 0.4525;
const RUG_GATE_INNER_PIER_PLINTH_WIDTH_M = 0.86;
const RUG_GATE_INNER_PIER_PLINTH_HEIGHT_M = 0.28;
const RUG_GATE_INNER_PIER_PLINTH_DEPTH_M = 0.72;

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
  active_merchant: [0xe0d3b6, 0xc9b28f, 0xd7cdbe, 0xbcae96, 0xdccdaa, 0xcfc8bd],
  quiet_residential: [0xe4ddd0, 0xcbb99b, 0xd8d3ca, 0xbfae94, 0xdcd4c2, 0xc6bfb4],
  service_storage: [0xc7bda8, 0xb3a288, 0xaea79b, 0xd0c1a2, 0xb8b2a8, 0xd4ccbb],
  covered_arcade: [0xcdbfa6, 0xb9ac97, 0xd6cdbd, 0xb0a793, 0xdbcfb4, 0xc0bab0],
  hero_courtyard: [0xdccdb0, 0xc9b697, 0xe4ddd2, 0xbcae9a, 0xd6c8ac, 0xd0cac1],
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
    ? 0xc2b69f
    : 0xc7bda9;
  const trimTintHex = scaleHexColor(
    trimBase,
    0.9 + stableUnitInterval(`${placement.id}:building-trim`) * 0.18,
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
      scale: { x: placement.sizeM.width, y: placement.sizeM.height, z: placement.sizeM.depth },
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

  // Reusable render-only contact course: seats facade shells on paving while
  // leaving collision, cover, and traversal geometry unchanged.
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
    const infillDepthM = isFullDepthBoundaryMassing
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
      meshId: isBoundaryMasonry
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
 * when present, the first upper sill. Quiet residential facades without an
 * authored upper opening receive shallow blind screens on the SAME generated
 * column centerlines as their ground bays. This is render-only relief: the
 * backing shell and every gameplay envelope remain untouched.
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

  // Active and service facades use the same opening-derived story datum as a
  // building identity seam. Adjacent buildings keep their own trim material
  // and deterministic tint rather than visually merging into one long shell.

  if (profile.family !== "quiet_residential" || upperModules.length > 0) return;
  const blindSillY = courseY + courseHeightM * 0.5 + 0.24;
  const blindHeadLimitY = facadeTopY - 0.42;
  const maximumBlindHeightM = blindHeadLimitY - blindSillY;
  if (maximumBlindHeightM < 0.62) return;

  for (const [index, ground] of groundModules.entries()) {
    const variation = stableUnitInterval(`${placement.id}:${ground.module.columnId}:blind-screen`);
    const blindWidthM = Math.min(1.02, Math.max(0.76, ground.module.sizeM.width * (0.8 + variation * 0.1)));
    const blindHeightM = Math.min(maximumBlindHeightM, 0.9 + variation * 0.22);
    const blindCenterY = blindSillY + blindHeightM * 0.5;
    const frameWidthM = 0.085;
    const reliefDepthM = 0.055;
    const timberTint = scaleHexColor(0x8c6244, 0.82 + variation * 0.3);
    const id = `${placement.id}:blind-upper:${ground.module.columnId}`;

    pushInstance(instances, {
      placementId: `${id}:recess`,
      moduleId: "quiet_residential_served_blind_screen",
      semanticClass: "quiet_residential_upper_blind_recess",
      meshId: "window_recess_timber",
      position: offsetPosition(
        { ...center, y: blindCenterY },
        placement.face,
        ground.alongM,
        placement.sizeM.depth * 0.5 + reliefDepthM * 0.25,
      ),
      scale: { x: blindWidthM, y: blindHeightM, z: reliefDepthM },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: scaleHexColor(timberTint, 0.66),
      uvProjection: "world",
    });

    for (const side of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `${id}:jamb:${side}`,
        moduleId: "quiet_residential_served_blind_screen",
        semanticClass: "quiet_residential_upper_blind_frame",
        meshId: "door_jamb",
        position: offsetPosition(
          { ...center, y: blindCenterY },
          placement.face,
          ground.alongM + side * (blindWidthM * 0.5 + frameWidthM * 0.5),
          placement.sizeM.depth * 0.5 + reliefDepthM,
        ),
        scale: { x: frameWidthM, y: blindHeightM + frameWidthM * 2, z: 0.085 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        uvProjection: "world",
      });
    }
    for (const [edge, y] of [
      ["sill", blindSillY - frameWidthM * 0.5],
      ["head", blindSillY + blindHeightM + frameWidthM * 0.5],
    ] as const) {
      pushInstance(instances, {
        placementId: `${id}:${edge}`,
        moduleId: "quiet_residential_served_blind_screen",
        semanticClass: "quiet_residential_upper_blind_frame",
        meshId: "door_lintel",
        position: offsetPosition(
          { ...center, y },
          placement.face,
          ground.alongM,
          placement.sizeM.depth * 0.5 + reliefDepthM,
        ),
        scale: { x: blindWidthM + frameWidthM * 2, y: frameWidthM, z: 0.085 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        trimMaterialId: placement.materialSlots.trim,
        uvProjection: "world",
      });
    }

    const screenBarCount = 2 + Math.floor(variation * 3);
    for (let barIndex = 0; barIndex < screenBarCount; barIndex += 1) {
      const normalized = screenBarCount === 1 ? 0 : barIndex / (screenBarCount - 1) - 0.5;
      pushInstance(instances, {
        placementId: `${id}:screen-bar:${barIndex + 1}`,
        moduleId: "quiet_residential_served_blind_screen",
        semanticClass: "quiet_residential_varied_upper_closure",
        meshId: "window_screen_bar",
        position: offsetPosition(
          { ...center, y: blindCenterY },
          placement.face,
          ground.alongM + normalized * blindWidthM * 0.62,
          placement.sizeM.depth * 0.5 + reliefDepthM + 0.012,
        ),
        scale: { x: 0.045, y: blindHeightM - 0.12, z: 0.052 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad,
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: timberTint,
        uvProjection: "world",
      });
    }
    pushInstance(instances, {
      placementId: `${id}:screen-rail`,
      moduleId: "quiet_residential_served_blind_screen",
      semanticClass: "quiet_residential_varied_upper_closure",
      meshId: "window_screen_bar",
      position: offsetPosition(
        { ...center, y: blindCenterY + (variation - 0.5) * blindHeightM * 0.28 },
        placement.face,
        ground.alongM,
        placement.sizeM.depth * 0.5 + reliefDepthM + 0.012,
      ),
      scale: { x: blindWidthM - 0.12, y: 0.045, z: 0.052 },
      backingPlacementId,
      structurallyBacked: true,
      yawRad,
      detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: timberTint,
      uvProjection: "world",
    });

    // Break the five-bay copy read with seeded shuttered closures while all
    // frames remain aligned on their shared story sill/head datums.
    if ((index + Math.floor(variation * 5)) % 3 === 0) {
      const shutterSide: -1 | 1 = variation < 0.5 ? -1 : 1;
      pushInstance(instances, {
        placementId: `${id}:shutter`,
        moduleId: "quiet_residential_served_blind_screen",
        semanticClass: "quiet_residential_varied_upper_closure",
        meshId: "window_shutter",
        position: offsetPosition(
          { ...center, y: blindCenterY },
          placement.face,
          ground.alongM + shutterSide * blindWidthM * 0.23,
          placement.sizeM.depth * 0.5 + reliefDepthM + 0.022,
        ),
        scale: { x: blindWidthM * 0.46, y: blindHeightM - 0.1, z: 0.055 },
        backingPlacementId,
        structurallyBacked: true,
        yawRad: yawRad + shutterSide * (0.05 + variation * 0.12),
        detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: scaleHexColor(timberTint, 0.88),
        uvProjection: "world",
      });
    }
  }
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
    pushInstance(instances, {
      placementId: `${placement.id}:return:${side}:contact-course`,
      moduleId: "covered_arcade_return_contact_course",
      semanticClass: "covered_arcade_return_grounding",
      meshId: "plinth_strip",
      position: localToWorld(
        side * (placement.sizeM.width * 0.5 + 0.06),
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
  if (!hasFacadeCutouts) {
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
  if (profile.family === "active_merchant" && !hasFacadeCutouts) {
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
  } else if (profile.family === "quiet_residential" && !hasFacadeCutouts) {
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
    pushInstance(instances, {
      placementId: `${placement.id}:roofline-cornice`,
      moduleId: `${profile.family}_roofline_cornice`,
      semanticClass: `${profile.family}_roofline`,
      meshId: "plinth_strip",
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
  if (structureStyle) {
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

  const roofInsetM = placement.roof.setbackM;
  const roofWidth = placement.sizeM.width - roofInsetM * 2;
  const roofDepth = placement.sizeM.depth - roofInsetM * 2;
  if (roofWidth < 0.5 || roofDepth < 0.5) {
    fail(`massing '${placement.id}' roof setback consumes the roof footprint`);
  }
  const roofCenter = {
    x: shellCenter.x,
    y: placement.roof.elevationM + ROOF_THICKNESS_M * 0.5,
    z: shellCenter.z,
  };
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

  if (placement.roof.style === "setback_flat" && placement.roof.upperStorySetbackM >= 0.5) {
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
    && profile.family !== "hero_courtyard";
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
}

function resolveSlotMaterial(
  placement: V3ArchitectureModulePlacement,
  profiles: ReadonlyMap<string, V3FacadeProfile>,
): { profile: V3FacadeProfile; materialId: string } {
  const profile = profiles.get(placement.profileId)
    ?? fail(`placement '${placement.id}' references unknown facade profile '${placement.profileId}'`);
  const materialId = profile.materialSlots[placement.materialSlot];
  if (!materialId) {
    fail(`placement '${placement.id}' resolves an empty '${placement.materialSlot}' material slot`);
  }
  return { profile, materialId };
}

function resolveExperimentalRevealDepthM(
  placement: V3ArchitectureModulePlacement,
  family: V3FacadeProfile["family"],
): number {
  switch (placement.moduleKind) {
    case "shop_recess": return resolveAuthoredShopRecessDepthM(placement);
    case "door":
      if (placement.moduleId.includes("fortified")) return 0.32;
      if (family === "service_storage") return 0.24;
      if (family === "hero_courtyard") return 0.26;
      return family === "active_merchant" ? 0.22 : 0.2;
    case "window":
      if (family === "hero_courtyard") return 0.5;
      return family === "active_merchant" ? 0.46 : 0.42;
    case "arch": return placement.moduleId.includes("hero") ? 0.58 : 0.46;
    case "vent": return 0.25;
    case "blind_niche": return 0.26;
    case "column": return 0.25;
  }
}

function pushFrame(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  trimMaterialId: string,
  semanticClass: string,
  options: {
    widthM?: number;
    depthM?: number;
    inwardM?: number;
    tintHex?: number;
  } = {},
): void {
  const frameWidthM = options.widthM ?? FRAME_WIDTH_M;
  const frameDepthM = options.depthM ?? FRAME_DEPTH_M;
  const inwardM = options.inwardM ?? 0.045;
  const halfW = placement.sizeM.width * 0.5;
  const halfH = placement.sizeM.height * 0.5;
  for (const side of [-1, 1] as const) {
    pushInstance(instances, {
      placementId: `${placement.id}:jamb:${side}`,
      moduleId: placement.moduleId,
      semanticClass,
      meshId: "door_jamb",
      position: offsetPosition(center, placement.face, side * (halfW + frameWidthM * 0.5), inwardM),
      scale: { x: frameWidthM, y: placement.sizeM.height + frameWidthM, z: frameDepthM },
      yawRad,
      trimMaterialId,
      ...(options.tintHex !== undefined ? { detailTintHex: options.tintHex } : {}),
    });
  }
  pushInstance(instances, {
    placementId: `${placement.id}:lintel`,
    moduleId: placement.moduleId,
    semanticClass,
    meshId: "door_lintel",
    position: offsetPosition(center, placement.face, 0, inwardM, halfH + frameWidthM * 0.5),
    scale: { x: placement.sizeM.width + frameWidthM * 2, y: frameWidthM, z: frameDepthM },
    yawRad,
    trimMaterialId,
    ...(options.tintHex !== undefined ? { detailTintHex: options.tintHex } : {}),
  });
}

function pushSupportedAwning(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  timberMaterialId: string,
): void {
  // Awnings derive from the served opening and retain a small drip edge, but
  // must not merge into the next bay's canopy at gameplay distance.
  const canopyY = center.y + placement.sizeM.height * 0.5 + 0.14;
  const awningVariant = stableUnitInterval(`${placement.id}:awning-variation`);
  // Rug Gate's opposing threshold frontages are an authored landmark seam:
  // both hoods remain centered on and sized from their served openings, while
  // their frontage role establishes a deep east shade and a shallower stepped
  // west rhythm. Seeded variation remains within each frontage so the two west
  // bays cannot collapse into an identical repeat.
  const rugGateThresholdSide = placement.zoneId === RUG_GATE_ZONE_ID
    ? placement.frontageId === "FRONTAGE_RUG_GATE_EAST"
      ? "east"
      : placement.frontageId === "FRONTAGE_RUG_GATE_WEST"
        ? "west"
        : null
    : null;
  const width = (placement.sizeM.width + 0.12) * (0.97 + awningVariant * 0.07);
  const awningDepthM = SHALLOW_TERMINAL_AWNING_IDS.has(placement.id)
    ? 0.46
    : rugGateThresholdSide === "east"
      ? AWNING_DEPTH_M * (1.16 + awningVariant * 0.05)
      : rugGateThresholdSide === "west"
        ? AWNING_DEPTH_M * (0.7 + awningVariant * 0.1)
    : AWNING_DEPTH_M * (0.9 + awningVariant * 0.18);
  const awningTintHex = rugGateThresholdSide === "east"
    ? 0x739089
    : rugGateThresholdSide === "west"
      ? awningVariant < 0.4 ? 0xa9765f : 0xb19361
      : awningVariant < 0.34
        ? 0xa9765f
        : awningVariant < 0.67
          ? 0xb19361
          : 0x739089;
  // The diagonal struts and their end fixings are TIMBER, not steel. Carried on
  // the iron source they took the metal role's high environment intensity and
  // reflected the sky as pale blue-grey cylinders — the brightest, coolest
  // objects on a warm shaded frontage — so the assembly read as galvanised pipe
  // hung off the wall and its end brackets were too faint to register as
  // terminations at all. The target carries these as dark weathered timber
  // braces landing on a visible bracket, which is what makes the load path
  // legible.
  // Where a brace crosses a shaded bay its lower half loses silhouette against
  // the shop interior behind it. Warming the albedo to recover that was tried
  // (0x6a5340 / 0x5d4835) and measured as noise — edge energy 6.41 -> 6.55 on
  // one brace and 5.55 -> 5.51 on another. The lower contrast is inherent to
  // timber being darker than the steel it replaced, and matches the target's
  // own low-contrast braces; recovering it needs a lit top arris, not a warmer
  // body.
  const strutMaterialId = timberMaterialId;
  const strutTintHex = awningVariant < 0.5 ? 0x574433 : 0x4b3a2b;
  pushInstance(instances, {
    placementId: `${placement.id}:awning-ledger`,
    moduleId: "awning_wall_ledger",
    semanticClass: "canopy_attachment_ledger",
    meshId: "shop_counter",
    position: offsetPosition({ ...center, y: canopyY - 0.04 }, placement.face, 0, 0.075),
    scale: { x: width, y: 0.09, z: 0.12 },
    yawRad,
    trimMaterialId: timberMaterialId,
    detailTintHex: awningVariant < 0.5 ? 0xb88962 : 0x789989,
  });
  const canopyCenter = offsetPosition({ ...center, y: canopyY }, placement.face, 0, awningDepthM * 0.48);
  pushInstance(instances, {
    placementId: `${placement.id}:awning`,
    moduleId: "awning_supported",
    semanticClass: "canopy_attachment",
    meshId: "awning_cloth",
    position: canopyCenter,
    scale: { x: width, y: 1, z: awningDepthM },
    yawRad,
    pitchRad: AWNING_PITCH_RAD,
    detailTintHex: awningTintHex,
  });
  pushInstance(instances, {
    placementId: `${placement.id}:awning-valance`,
    moduleId: "awning_supported",
    semanticClass: "canopy_valance",
    meshId: "awning_valance",
    position: offsetPosition(
      { ...center, y: canopyY - AWNING_VALANCE_HEIGHT_M * 0.5 - 0.045 },
      placement.face,
      0,
      awningDepthM * 0.95,
    ),
    scale: {
      x: width,
      y: AWNING_VALANCE_HEIGHT_M * (
        rugGateThresholdSide === "east"
          ? 1.48
          : rugGateThresholdSide === "west"
            ? 0.68 + awningVariant * 0.24
            : 0.78 + awningVariant * 0.5
      ),
      z: 0.035,
    },
    yawRad,
    detailTintHex: awningTintHex,
  });
  for (const side of [-1, 1] as const) {
    const wallAnchorInwardM = 0.045;
    // The socket has to land on the awning frame it carries. Sitting 160 mm
    // below the slab and 90% of the way to the drip edge, the strut ran past
    // the awning's visible edge and stopped in open air with no tie.
    const edgeSocketInwardM = awningDepthM * 0.76;
    const wallAnchorY = canopyY - 0.52;
    const edgeSocketY = canopyY - 0.055;
    const supportDepthM = edgeSocketInwardM - wallAnchorInwardM;
    const supportRiseM = edgeSocketY - wallAnchorY;
    const supportLengthM = Math.hypot(supportDepthM, supportRiseM);
    const poleCenter = offsetPosition(
      { ...center, y: (wallAnchorY + edgeSocketY) * 0.5 },
      placement.face,
      side * (width * 0.5 - 0.12),
      (wallAnchorInwardM + edgeSocketInwardM) * 0.5,
    );
    pushInstance(instances, {
      placementId: `${placement.id}:awning-pole:${side}`,
      moduleId: "awning_support_pole",
      semanticClass: "canopy_support",
      meshId: "awning_pole",
      position: poleCenter,
      scale: { x: 0.085, y: supportLengthM, z: 0.085 },
      yawRad,
      pitchRad: -Math.atan2(supportDepthM, supportRiseM),
      detailMaterialId: strutMaterialId,
      detailTintHex: strutTintHex,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:awning-bracket:${side}`,
      moduleId: "awning_attachment_bracket",
      semanticClass: "canopy_attachment_bracket",
      meshId: "awning_bracket",
      position: offsetPosition(
        { ...center, y: wallAnchorY },
        placement.face,
        side * (width * 0.5 - 0.12),
        wallAnchorInwardM,
      ),
      scale: { x: 0.21, y: 0.28, z: 0.18 },
      yawRad,
      detailMaterialId: strutMaterialId,
      detailTintHex: strutTintHex,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:awning-edge-socket:${side}`,
      moduleId: "awning_attachment_bracket",
      semanticClass: "canopy_edge_socket",
      meshId: "awning_bracket",
      position: offsetPosition(
        { ...center, y: edgeSocketY },
        placement.face,
        side * (width * 0.5 - 0.1),
        edgeSocketInwardM,
      ),
      scale: { x: 0.17, y: 0.2, z: 0.16 },
      yawRad,
      detailMaterialId: strutMaterialId,
      detailTintHex: strutTintHex,
    });
  }
}

function pushDoor(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  doorModelPlacements: DoorModelPlacement[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  frameMaterialId: string,
  family: V3FacadeProfile["family"],
  fortifiedDoorModelAvailable: boolean,
  experimentalVisualCutouts: boolean,
): void {
  const lowerId = placement.moduleId.toLowerCase();
  const fortified = lowerId.includes("fortified") || lowerId.includes("castle_gate");
  const revealDepthM = experimentalVisualCutouts
    ? resolveExperimentalRevealDepthM(placement, family)
    : 0;
  // Door leaves sit immediately behind the trim plane. The reveal construction
  // remains visible on the jambs/head, but cannot expose a black cutout moat.
  //
  // Do not try to recess the leaf to give the doorway depth. faceInward points
  // into the building, so 0.12 seats it deeper - and that was measured as a
  // clear regression: the doorway went from mean luminance 84 to 97 against a
  // target of 49, std/mean fell 0.300 -> 0.202 against a target of 0.832, and
  // the count of distinct dark code values collapsed from 10 to 2. The leaf did
  // not move into shadow, it disappeared behind solid wall and left the lit
  // masonry face showing.
  //
  // What that proves: there is NO opening cut in the wall here. The reveal
  // jambs, head and leaf are all built at negative inward, i.e. they project
  // outward as an applied surround on unbroken masonry. The door is a decal
  // with mouldings, which is also why the doorway ignored every lighting change
  // made this session - at 40 mm proud of the wall nothing can ever occlude it.
  // Giving these openings real depth means cutting actual voids in the massing
  // and lining them, not repositioning the leaf.
  const doorPlaneInwardM = experimentalVisualCutouts ? -0.04 : 0.045;
  if (experimentalVisualCutouts) {
    const revealJambWidthM = family === "hero_courtyard" ? 0.11 : 0.085;
    for (const side of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `${placement.id}:reveal-jamb:${side}`,
        moduleId: placement.moduleId,
        semanticClass: `${family}_door_reveal`,
        meshId: "door_jamb",
        position: offsetPosition(
          center,
          placement.face,
          side * (placement.sizeM.width * 0.5 - revealJambWidthM * 0.5),
          -revealDepthM * 0.5,
        ),
        scale: { x: revealJambWidthM, y: placement.sizeM.height, z: revealDepthM },
        yawRad,
        trimMaterialId: frameMaterialId,
      });
    }
    pushInstance(instances, {
      placementId: `${placement.id}:reveal-head`,
      moduleId: placement.moduleId,
      semanticClass: `${family}_door_reveal`,
      meshId: "door_lintel",
      position: offsetPosition(
        center,
        placement.face,
        0,
        -revealDepthM * 0.5,
        placement.sizeM.height * 0.5 - revealJambWidthM * 0.5,
      ),
      scale: { x: placement.sizeM.width, y: revealJambWidthM, z: revealDepthM },
      yawRad,
      trimMaterialId: frameMaterialId,
    });
  }
  if (fortified && fortifiedDoorModelAvailable) {
    const inward = faceInward(placement.face);
    doorModelPlacements.push({
      wallSurfacePos: center,
      doorW: placement.sizeM.width,
      doorH: placement.sizeM.height,
      yawRad: placement.face === "west" || placement.face === "east" ? 0 : Math.PI * 0.5,
      outwardX: inward.x,
      outwardZ: inward.z,
      modelId: CASTLE_DOOR_ID,
      trimMaterialId: frameMaterialId,
      trimThicknessM: 0.22,
      surroundDepthM: 0.2,
      coverShape: "arched",
      coverWidthM: placement.sizeM.width + 0.12,
      coverHeightM: placement.sizeM.height + 0.08,
    });
    return;
  }
  const meshId: WallDetailMeshId = fortified
    ? "door_panel_fortified"
    : lowerId.includes("shop")
      ? "door_panel_shop"
      : lowerId.includes("storage") || lowerId.includes("service")
        ? "door_panel_storage"
        : "door_panel_timber";
  // Seat the leaf behind the full frame overlap while keeping its threshold at
  // grade. A flush-size leaf exposes a light sliver wherever the cutout and
  // frame rasterize on adjacent planes.
  const leafSeatOverlapM = 0.07;
  const doorVariant = stableUnitInterval(`${placement.id}:door-variant`);
  // Darkened from 0x7a563f / 0x675b4d / 0x806a47. Because the leaf is an applied
  // panel on unbroken wall rather than a leaf inside a void (see the note on
  // doorPlaneInwardM), it catches the same light as the masonry around it and
  // read as a pale rectangle: the primary camera measured that doorway at mean
  // luminance 84 where the target reads 49. A real door mouth is the darkest
  // thing on a sunlit frontage, so until the openings are actually cut the leaf
  // has to carry that value in its albedo instead of getting it from occlusion.
  const doorTintHex = doorVariant < 0.34
    ? 0x3f2c20
    : doorVariant < 0.67
      ? 0x352f27
      : 0x423624;
  pushInstance(instances, {
    placementId: placement.id,
    moduleId: placement.moduleId,
    semanticClass: fortified ? "fortified_gate" : "ordinary_door",
    meshId,
    position: offsetPosition(
      { ...center, y: center.y + leafSeatOverlapM * 0.5 },
      placement.face,
      0,
      doorPlaneInwardM,
    ),
    scale: {
      x: placement.sizeM.width + leafSeatOverlapM * 2,
      y: placement.sizeM.height + leafSeatOverlapM,
      z: 0.14,
    },
    yawRad,
    detailMaterialId: "ph_rough_pine_door",
    detailTintHex: doorTintHex,
  });
  const frameDimensions = experimentalVisualCutouts
    ? family === "active_merchant"
      ? { widthM: 0.17, depthM: 0.16, inwardM: 0.025 }
      : family === "service_storage"
        ? { widthM: 0.19, depthM: 0.16, inwardM: 0.02 }
        : { widthM: 0.145, depthM: 0.14, inwardM: 0.02 }
    : family === "active_merchant"
      ? { widthM: 0.17, depthM: 0.18, inwardM: 0.085 }
      : family === "service_storage"
        ? { widthM: 0.19, depthM: 0.17, inwardM: 0.075 }
        : { widthM: 0.145, depthM: 0.14, inwardM: 0.065 };
  pushFrame(
    placement,
    instances,
    center,
    yawRad,
    frameMaterialId,
    fortified ? "fortified_gate" : `${family}_door_frame`,
    { ...frameDimensions, tintHex: doorTintHex },
  );

  // A lighter inset frame sits proud of the alternating plank leaf. These
  // connected rails read as joinery at gameplay distance, unlike isolated
  // decorative bars, and reuse the existing timber frame batches.
  const quietDoor = family === "quiet_residential";
  const joineryInwardM = experimentalVisualCutouts
    ? doorPlaneInwardM + (quietDoor ? 0.075 : 0.085)
    : quietDoor ? 0.125 : 0.145;
  const hingeInwardM = experimentalVisualCutouts ? doorPlaneInwardM + 0.12 : 0.185;
  const hingePinInwardM = experimentalVisualCutouts ? doorPlaneInwardM + 0.14 : 0.205;
  const handleBackplateInwardM = experimentalVisualCutouts ? doorPlaneInwardM + 0.12 : 0.185;
  const handleInwardM = experimentalVisualCutouts ? doorPlaneInwardM + 0.15 : 0.215;
  const strapInwardM = experimentalVisualCutouts ? doorPlaneInwardM + 0.08 : 0.095;
  for (const along of [-0.31, 0.31]) {
    pushInstance(instances, {
      placementId: `${placement.id}:door-joinery-v:${along}`,
      moduleId: placement.moduleId,
      semanticClass: `${family}_door_joinery`,
      meshId: "door_jamb",
      position: offsetPosition(center, placement.face, along * placement.sizeM.width, joineryInwardM),
      scale: {
        x: quietDoor ? 0.06 : 0.075,
        y: placement.sizeM.height * (quietDoor ? 0.72 : 0.78),
        z: quietDoor ? 0.05 : 0.065,
      },
      yawRad,
      trimMaterialId: frameMaterialId,
    });
  }
  const joineryRails = quietDoor
    ? [-0.28, 0.28]
    : doorVariant < 0.5
      ? [-0.32, 0.02, 0.34]
      : [-0.25, 0.25];
  for (const vertical of joineryRails) {
    pushInstance(instances, {
      placementId: `${placement.id}:door-joinery-h:${vertical}`,
      moduleId: placement.moduleId,
      semanticClass: `${family}_door_joinery`,
      meshId: "door_lintel",
      position: offsetPosition(
        center,
        placement.face,
        0,
        joineryInwardM,
        vertical * placement.sizeM.height,
      ),
      scale: {
        x: placement.sizeM.width * (quietDoor ? 0.62 : 0.68),
        y: quietDoor ? 0.06 : 0.075,
        z: quietDoor ? 0.05 : 0.065,
      },
      yawRad,
      trimMaterialId: frameMaterialId,
    });
  }

  const hingeSide = doorVariant < 0.5 ? -1 : 1;
  const handleSide = -hingeSide;
  const hingeOffsets = family === "service_storage" ? [-0.32, 0, 0.32] : [-0.29, 0.29];
  for (const normalizedOffset of hingeOffsets) {
    pushInstance(instances, {
      placementId: `${placement.id}:hinge:${normalizedOffset}`,
      moduleId: placement.moduleId,
      semanticClass: `${family}_door_hinge`,
      meshId: "sign_bracket",
      position: offsetPosition(
        center,
        placement.face,
        hingeSide * placement.sizeM.width * 0.39,
        hingeInwardM,
        placement.sizeM.height * normalizedOffset,
      ),
      scale: {
        x: family === "service_storage" ? 0.36 : quietDoor ? 0.22 : 0.29,
        y: family === "service_storage" ? 0.075 : quietDoor ? 0.05 : 0.065,
        z: quietDoor ? 0.045 : 0.055,
      },
      yawRad,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:hinge-pin:${normalizedOffset}`,
      moduleId: placement.moduleId,
      semanticClass: `${family}_door_hinge_pin`,
      meshId: "awning_pole",
      position: offsetPosition(
        center,
        placement.face,
        hingeSide * placement.sizeM.width * 0.43,
        hingePinInwardM,
        placement.sizeM.height * normalizedOffset,
      ),
      scale: { x: quietDoor ? 0.022 : 0.026, y: quietDoor ? 0.11 : 0.14, z: quietDoor ? 0.022 : 0.026 },
      yawRad,
    });
  }
  pushInstance(instances, {
    placementId: `${placement.id}:handle-backplate`,
    moduleId: placement.moduleId,
    semanticClass: `${family}_door_handle_backplate`,
    meshId: "sign_bracket",
    position: offsetPosition(
      center,
      placement.face,
      handleSide * placement.sizeM.width * 0.28,
      handleBackplateInwardM,
      0.03,
    ),
    scale: { x: quietDoor ? 0.07 : 0.09, y: quietDoor ? 0.21 : 0.28, z: quietDoor ? 0.035 : 0.045 },
    yawRad,
  });
  for (const side of [-1, 1] as const) {
    for (const vertical of [-0.3, 0, 0.3]) {
      pushInstance(instances, {
        placementId: `${placement.id}:stud:${side}:${vertical}`,
        moduleId: placement.moduleId,
        semanticClass: `${family}_door_stud`,
        meshId: "sign_bracket",
        position: offsetPosition(
          center,
          placement.face,
          side * placement.sizeM.width * 0.34,
          handleBackplateInwardM,
          vertical * placement.sizeM.height,
        ),
        scale: { x: 0.045, y: 0.045, z: 0.035 },
        yawRad,
      });
    }
  }
  pushInstance(instances, {
    placementId: `${placement.id}:handle`,
    moduleId: placement.moduleId,
    semanticClass: `${family}_door_handle`,
    meshId: "awning_pole",
    position: offsetPosition(
      center,
      placement.face,
      handleSide * placement.sizeM.width * 0.28,
      handleInwardM,
      0.03,
    ),
    scale: {
      x: quietDoor ? 0.032 : 0.04,
      y: family === "service_storage" ? 0.29 : quietDoor ? 0.18 : 0.23,
      z: quietDoor ? 0.032 : 0.04,
    },
    yawRad,
  });
  if (family === "service_storage") {
    for (const normalizedOffset of [-0.25, 0.25]) {
      pushInstance(instances, {
        placementId: `${placement.id}:strap:${normalizedOffset}`,
        moduleId: placement.moduleId,
        semanticClass: "service_storage_door_strap",
        meshId: "sign_bracket",
        position: offsetPosition(
          center,
          placement.face,
          -placement.sizeM.width * 0.05,
          strapInwardM,
          placement.sizeM.height * normalizedOffset,
        ),
        scale: { x: placement.sizeM.width * 0.78, y: 0.06, z: 0.04 },
        yawRad,
      });
    }
  }
  pushInstance(instances, {
    placementId: `${placement.id}:threshold`,
    moduleId: placement.moduleId,
    semanticClass: "door_threshold",
    meshId: "door_lintel",
    position: offsetPosition(
      center,
      placement.face,
      0,
      experimentalVisualCutouts ? -revealDepthM * 0.5 : 0.1,
      -placement.sizeM.height * 0.5 - 0.045,
    ),
    scale: experimentalVisualCutouts
      ? { x: placement.sizeM.width + 0.12, y: 0.09, z: revealDepthM + 0.08 }
      : { x: placement.sizeM.width + 0.28, y: 0.09, z: 0.24 },
    yawRad,
    trimMaterialId: frameMaterialId,
  });
  // A laid threshold apron in front of the sill. Every opening met the paving
  // on a single 90 mm lip that is itself half-buried, so a door read as cut
  // into the wall at lane level with no transition, and the wall/floor junction
  // collapsed into one dark line — the exact junction the grounding closeup
  // exists to inspect. These openings sit at lane level for traversal, so the
  // reference's stepped stoop cannot rise here; what it also shows, and what
  // does fit, is a band of purpose-laid threshold stone running out from the
  // jambs with a worn nosing at its outer edge. Total rise is 90 mm, no more
  // than the sill it replaces, so grounding and the clear opening are unchanged.
  const apronDepthM = 0.66;
  const apronWidthM = placement.sizeM.width + 0.5;
  const apronFloorY = -placement.sizeM.height * 0.5;
  pushInstance(instances, {
    placementId: `${placement.id}:threshold-apron`,
    moduleId: placement.moduleId,
    semanticClass: "door_threshold_apron",
    meshId: "door_lintel",
    position: offsetPosition(
      center,
      placement.face,
      0,
      apronDepthM * 0.5 - 0.08,
      apronFloorY + 0.035,
    ),
    scale: { x: apronWidthM, y: 0.07, z: apronDepthM },
    yawRad,
    trimMaterialId: "ph_stone_trim_sandstone",
    detailTintHex: 0xb8a68a,
    uvProjection: "world",
  });
  pushInstance(instances, {
    placementId: `${placement.id}:threshold-apron-nosing`,
    moduleId: placement.moduleId,
    semanticClass: "door_threshold_apron_nosing",
    meshId: "door_lintel",
    position: offsetPosition(
      center,
      placement.face,
      0,
      apronDepthM - 0.11,
      apronFloorY + 0.045,
    ),
    scale: { x: apronWidthM + 0.1, y: 0.09, z: 0.11 },
    yawRad,
    trimMaterialId: "ph_stone_trim_sandstone",
    detailTintHex: 0xb8a68a,
    uvProjection: "world",
  });
  for (const side of [-1, 1] as const) {
    pushInstance(instances, {
      placementId: `${placement.id}:threshold-apron-return:${side}`,
      moduleId: placement.moduleId,
      semanticClass: "door_threshold_apron_return",
      meshId: "door_lintel",
      position: offsetPosition(
        center,
        placement.face,
        side * apronWidthM * 0.5,
        apronDepthM * 0.5 - 0.08,
        apronFloorY + 0.045,
      ),
      scale: { x: 0.1, y: 0.09, z: apronDepthM },
      yawRad,
      trimMaterialId: "ph_stone_trim_sandstone",
    detailTintHex: 0xb8a68a,
      uvProjection: "world",
    });
  }
  if (!fortified && family === "active_merchant" && lowerId.includes("shop")) {
    // Closed shop doors are commercial storage bays, not dead frontage. A
    // low side plinth and its generic stock derive from the served opening but
    // stay outside the full door-leaf clear strip; the supported hood remains
    // centered on the same lintel/column datum. Stable per-opening variation
    // changes stock side, plinth width, and tint.
    const bottomY = center.y - placement.sizeM.height * 0.5;
    const marketUnit = stableUnitInterval(`${placement.id}:closed-shop-display`);
    const displayHeightM = 0.42 + marketUnit * 0.14;
    const displayWidthM = 0.46 + marketUnit * 0.08;
    const stockSide = marketUnit < 0.5 ? -1 : 1;
    const displayAlongM = stockSide * (
      placement.sizeM.width * 0.5
      + displayWidthM * 0.5
      + 0.12
    );
    // A doorside stock plinth is a built stone block, not a painted timber
    // slab. Reading it as sandstone gives it real texel detail at the two
    // metres this camera inspects it from, and separates it from the joinery
    // family that surrounds it.
    const displayTintHex = marketUnit < 0.34
      ? 0xc9b48d
      : marketUnit < 0.67
        ? 0xbfae90
        : 0xcbb896;
    pushInstance(instances, {
      placementId: `${placement.id}:closed-shop-display`,
      moduleId: "active_merchant_closed_shop_display",
      semanticClass: "active_merchant_generic_door_display",
      meshId: "shop_counter",
      position: offsetPosition(
        { ...center, y: bottomY + displayHeightM * 0.5 },
        placement.face,
        displayAlongM,
        0.1,
      ),
      scale: { x: displayWidthM, y: displayHeightM, z: 0.34 },
      yawRad,
      trimMaterialId: "ph_stone_trim_sandstone",
      detailTintHex: displayTintHex,
      uvProjection: "world",
    });
    // A capping course reads the block as masonry and gives the stock a
    // finished surface to sit on instead of a bare slab top.
    pushInstance(instances, {
      placementId: `${placement.id}:closed-shop-display-cap`,
      moduleId: "active_merchant_closed_shop_display",
      semanticClass: "active_merchant_generic_door_display",
      meshId: "door_lintel",
      position: offsetPosition(
        { ...center, y: bottomY + displayHeightM + 0.03 },
        placement.face,
        displayAlongM,
        0.095,
      ),
      scale: { x: displayWidthM + 0.07, y: 0.06, z: 0.38 },
      yawRad,
      trimMaterialId: "ph_stone_trim_sandstone",
      detailTintHex: displayTintHex,
      uvProjection: "world",
    });
    const stockMeshId = marketUnit < 0.5
      ? "merchant_goods_basket" as const
      : "merchant_goods_pot" as const;
    const stockSize = stockMeshId === "merchant_goods_basket"
      ? { x: 0.34, y: 0.3, z: 0.34 }
      : { x: 0.3, y: 0.4, z: 0.3 };
    pushInstance(instances, {
      placementId: `${placement.id}:closed-shop-stock`,
      moduleId: "active_merchant_closed_shop_display",
      semanticClass: "active_merchant_generic_door_stock",
      meshId: stockMeshId,
      position: offsetPosition(
        { ...center, y: bottomY + displayHeightM + 0.06 + stockSize.y * 0.5 },
        placement.face,
        displayAlongM,
        0.06,
      ),
      scale: stockSize,
      yawRad: yawRad + stockSide * (0.04 + marketUnit * 0.04),
      trimMaterialId: stockMeshId === "merchant_goods_basket"
        ? MERCHANT_TIMBER_MATERIAL_ID
        : frameMaterialId,
      detailTintHex: stockMeshId === "merchant_goods_basket"
        ? displayTintHex
        : marketUnit < 0.75 ? 0x75978c : 0xb37c5d,
      uvProjection: "world",
    });
    pushSupportedAwning(
      placement,
      instances,
      center,
      yawRad,
      MERCHANT_TIMBER_MATERIAL_ID,
    );
  } else if (!fortified && family === "service_storage" && lowerId.includes("storage")) {
    // Court-edge storage doors become shallow loading/display bays. All mass
    // stays within the closed opening width and is derived from its threshold,
    // so the clear court center and gameplay envelope remain untouched.
    const bottomY = center.y - placement.sizeM.height * 0.5;
    const storageUnit = stableUnitInterval(`${placement.id}:storage-apron`);
    const apronWidthM = placement.sizeM.width * (0.7 + storageUnit * 0.12);
    const apronHeightM = 0.16 + storageUnit * 0.05;
    const timberTintHex = storageUnit < 0.34
      ? 0x8f684c
      : storageUnit < 0.67
        ? 0x65877c
        : 0x9b8059;
    pushInstance(instances, {
      placementId: `${placement.id}:storage-loading-apron`,
      moduleId: "service_storage_served_loading_bay",
      semanticClass: "service_storage_generic_loading_apron",
      meshId: "shop_counter",
      position: offsetPosition(
        { ...center, y: bottomY + apronHeightM * 0.5 },
        placement.face,
        0,
        0.17,
      ),
      scale: { x: apronWidthM, y: apronHeightM, z: 0.46 },
      yawRad,
      trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: timberTintHex,
      uvProjection: "world",
    });
    const storageSizes = storageUnit < 0.5
      ? [
        { along: -0.23, x: 0.46, y: 0.42, z: 0.4 },
        { along: 0.22, x: 0.38, y: 0.58, z: 0.36 },
      ]
      : [
        { along: -0.2, x: 0.38, y: 0.54, z: 0.36 },
        { along: 0.25, x: 0.5, y: 0.38, z: 0.42 },
      ];
    for (const [index, storage] of storageSizes.entries()) {
      pushInstance(instances, {
        placementId: `${placement.id}:storage-load:${index + 1}`,
        moduleId: "service_storage_served_loading_bay",
        semanticClass: "service_storage_generic_loading_stock",
        meshId: index === 0 ? "merchant_goods_basket" : "shop_counter",
        position: offsetPosition(
          { ...center, y: bottomY + apronHeightM + 0.025 + storage.y * 0.5 },
          placement.face,
          storage.along * apronWidthM,
          0.13,
        ),
        scale: { x: storage.x, y: storage.y, z: storage.z },
        yawRad: yawRad + (index === 0 ? -0.045 : 0.035) * (0.8 + storageUnit * 0.4),
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: index === 0
          ? scaleHexColor(timberTintHex, 1.04)
          : scaleHexColor(timberTintHex, 0.84),
        uvProjection: "world",
      });
    }
    pushSupportedAwning(
      placement,
      instances,
      center,
      yawRad,
      MERCHANT_TIMBER_MATERIAL_ID,
    );
  }
  if (fortified) {
    pushInstance(instances, {
      placementId: `${placement.id}:center-strap`,
      moduleId: placement.moduleId,
      semanticClass: "fortified_gate",
      meshId: "window_screen",
      position: offsetPosition(
        center,
        placement.face,
        0,
        experimentalVisualCutouts ? doorPlaneInwardM + 0.075 : 0.072,
      ),
      scale: { x: 0.055, y: placement.sizeM.height * 0.9, z: 0.035 },
      yawRad,
    });
  }
}

function pushWindow(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  profile: V3FacadeProfile,
  experimentalVisualCutouts: boolean,
): void {
  const frameMaterialId = profile.family === "active_merchant"
    ? MERCHANT_TIMBER_MATERIAL_ID
    : profile.materialSlots.trim;
  const landmarkGlass = placement.moduleId.toLowerCase().includes("landmark_stained");
  if (landmarkGlass) {
    const revealDepthM = experimentalVisualCutouts
      ? resolveExperimentalRevealDepthM(placement, profile.family)
      : 0;
    if (experimentalVisualCutouts) {
      pushInstance(instances, {
        placementId: `${placement.id}:landmark-reveal`,
        moduleId: placement.moduleId,
        semanticClass: "landmark_window_reveal",
        meshId: "window_recess_dark",
        position: offsetPosition(center, placement.face, 0, -revealDepthM * 0.48),
        scale: { x: placement.sizeM.width * 0.95, y: placement.sizeM.height * 0.94, z: revealDepthM },
        yawRad,
        detailMaterialId: "tm_window_interior_hero",
      });
      pushInstance(instances, {
        placementId: `${placement.id}:landmark-spandrel`,
        moduleId: placement.moduleId,
        semanticClass: "landmark_window_spandrel",
        meshId: "arch_spandrel",
        position: offsetPosition(center, placement.face, 0, -0.025),
        scale: { x: placement.sizeM.width, y: placement.sizeM.height, z: 0.1 },
        yawRad,
        wallMaterialId: profile.materialSlots.wall,
      });
    }
    pushInstance(instances, {
      placementId: placement.id,
      moduleId: placement.moduleId,
      semanticClass: "landmark_window",
      meshId: "window_pointed_arch_glass",
      position: offsetPosition(
        center,
        placement.face,
        0,
        experimentalVisualCutouts ? -revealDepthM + 0.065 : 0.045,
      ),
      scale: { x: PANEL_DEPTH_M, y: placement.sizeM.height, z: placement.sizeM.width },
      yawRad,
      // Landmark glazing is authored by the facade profile; hard-coding the
      // dim fallback bypassed the hero glass slot and made this panel read as
      // a flat green foliage patch in SHOT_03.
      detailMaterialId: profile.materialSlots.accent,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:frame`,
      moduleId: placement.moduleId,
      semanticClass: "landmark_window",
      meshId: "window_pointed_arch_frame",
      position: offsetPosition(center, placement.face, 0, experimentalVisualCutouts ? 0.018 : 0.075),
      scale: { x: FRAME_DEPTH_M, y: placement.sizeM.height + FRAME_WIDTH_M, z: placement.sizeM.width + FRAME_WIDTH_M },
      yawRad,
      trimMaterialId: frameMaterialId,
    });
    return;
  }

  const recessDepthM = experimentalVisualCutouts
    ? resolveExperimentalRevealDepthM(placement, profile.family)
    : Math.min(0.3, Math.max(0.18, placement.sizeM.depth));
  const interiorMaterialId = profile.family === "active_merchant"
    ? "tm_window_interior_merchant"
    : profile.family === "hero_courtyard"
      ? "tm_window_interior_hero"
      : "tm_window_interior_residential";
  // Openings terminate in a shaded, physically lit recess. The former
  // merchant-only timber slabs carried pale/cyan authored tints and read as
  // self-lit cards behind the grille in daylight.
  const recessBackInwardM = experimentalVisualCutouts ? -recessDepthM + 0.03 : recessDepthM * 0.48;
  pushInstance(instances, {
    placementId: placement.id,
    moduleId: placement.moduleId,
    semanticClass: "dark_window_recess",
    meshId: "window_recess_dark",
    position: offsetPosition(
      center,
      placement.face,
      0,
      recessBackInwardM,
    ),
    scale: {
      x: placement.sizeM.width * 0.98,
      y: placement.sizeM.height * 0.96,
      z: experimentalVisualCutouts ? 0.06 : recessDepthM,
    },
    ...(experimentalVisualCutouts
      ? { visualQaDimensions: { x: placement.sizeM.width, y: placement.sizeM.height, z: recessDepthM } }
      : {}),
    yawRad,
    detailMaterialId: interiorMaterialId,
  });
  if (experimentalVisualCutouts) {
    for (const side of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `${placement.id}:recess-return:${side}`,
        moduleId: placement.moduleId,
        semanticClass: "window_recess_return",
        meshId: "window_recess_dark",
        position: offsetPosition(
          center,
          placement.face,
          side * placement.sizeM.width * 0.49,
          -recessDepthM * 0.5,
        ),
        scale: { x: recessDepthM, y: placement.sizeM.height * 0.96, z: 0.05 },
        yawRad: yawRad + Math.PI * 0.5,
        detailMaterialId: interiorMaterialId,
      });
    }
    pushInstance(instances, {
      placementId: `${placement.id}:recess-head`,
      moduleId: placement.moduleId,
      semanticClass: "window_recess_head",
      meshId: "shop_recess_back",
      position: offsetPosition(
        { ...center, y: center.y + placement.sizeM.height * 0.48 },
        placement.face,
        0,
        -recessDepthM * 0.5,
      ),
      scale: { x: placement.sizeM.width * 0.98, y: 0.055, z: recessDepthM },
      yawRad,
      detailMaterialId: interiorMaterialId,
    });
  }
  // Merchant window frames need an explicit tint. Untinted they inherit only
  // the `painted-wood` role colour, which the `timber-surface` tier's much
  // brighter lift and wear constants overwrite long before the tier's own
  // value and chroma stage runs — so the jambs, mullions and sills across the
  // whole upper storey render as pale near-neutral channels (saturation 0.10,
  // hue 33) against a target of saturation 0.50 at hue 28, and read as
  // galvanised steel rather than the timber surround they are. A per-instance
  // tint is applied at <color_fragment>, downstream of those mixes, so it is
  // the only lever that reaches them. Gated to the merchant family: the same
  // frame call serves courtyard and arcade windows that resolve to stone trim
  // with no kit finish, where a tint would land at full strength.
  // Authored ~10 degrees warmer than the intended result: this pipeline shifts
  // warm tones red on the way out (the same bias measured on the shutter and
  // lattice tiers), so a 28-degree tint rendered at 18. At 38 it lands near the
  // target's 30.
  //
  // Value trimmed 10%: measured on the five verified jamb columns the frames
  // rendered at V 0.44 against the target's 0.40, and at 1.87x the shutter
  // value where the target runs 1.65x — bright enough that the eye lands on the
  // surrounds before the sunlit masonry. Only 10%: the frames are barely over,
  // and a deeper pull would drop them well under the target.
  const MERCHANT_FRAME_TINT_HEX = 0xd8b478;
  const usesMerchantFrameTint = profile.family === "active_merchant";
  pushFrame(
    placement,
    instances,
    center,
    yawRad,
    frameMaterialId,
    `${profile.family}_window_frame`,
    experimentalVisualCutouts
      ? profile.family === "active_merchant"
        ? { widthM: 0.14, depthM: 0.18, inwardM: 0.02, tintHex: MERCHANT_FRAME_TINT_HEX }
        : profile.family === "hero_courtyard"
          ? { widthM: 0.14, depthM: 0.18, inwardM: 0.02 }
          : { widthM: 0.14, depthM: 0.18, inwardM: 0.015 }
      : profile.family === "active_merchant"
        ? { widthM: 0.14, depthM: 0.24, inwardM: 0.11, tintHex: MERCHANT_FRAME_TINT_HEX }
        : profile.family === "hero_courtyard"
          ? { widthM: 0.14, depthM: 0.22, inwardM: 0.1 }
          : { widthM: 0.14, depthM: 0.2, inwardM: 0.085 },
  );
  pushInstance(instances, {
    placementId: `${placement.id}:sill`,
    moduleId: placement.moduleId,
    semanticClass: "window_sill",
    meshId: "door_lintel",
    position: offsetPosition(
      center,
      placement.face,
      0,
      experimentalVisualCutouts ? -recessDepthM * 0.5 : 0.07,
      -placement.sizeM.height * 0.5 - FRAME_WIDTH_M * 0.4,
    ),
    scale: experimentalVisualCutouts
      ? {
        x: placement.sizeM.width + FRAME_WIDTH_M * 1.2,
        y: FRAME_WIDTH_M * 0.7,
        z: recessDepthM + 0.06,
      }
      : {
        x: placement.sizeM.width + FRAME_WIDTH_M * 2.3,
        y: FRAME_WIDTH_M * 0.7,
        z: FRAME_DEPTH_M * 1.35,
      },
    yawRad,
    trimMaterialId: frameMaterialId,
    // The sill is part of the same frame assembly; left untinted it stays pale
    // while the jambs and lintel above it warm, which reads worse than either.
    ...(usesMerchantFrameTint ? { detailTintHex: MERCHANT_FRAME_TINT_HEX } : {}),
  });
  const openingBottomY = center.y - placement.sizeM.height * 0.5;
  if (profile.family === "covered_arcade" && openingBottomY <= 0.75) {
    // Ground-floor covered-souk windows double as served merchant apertures.
    // The counter, shelf and stock all derive from this opening's centerline,
    // width, sill and reveal depth; upper windows remain pure closures.
    const marketVariant = stableUnitInterval(`${placement.id}:arcade-market-sill`);
    const counterHeightM = 0.5 + marketVariant * 0.12;
    const counterWidthM = placement.sizeM.width * (0.72 + marketVariant * 0.14);
    const timberTintHex = marketVariant < 0.34
      ? 0xa97653
      : marketVariant < 0.67
        ? 0x6f9384
        : 0x9b835d;
    pushInstance(instances, {
      placementId: `${placement.id}:arcade-counter-front`,
      moduleId: "covered_arcade_served_market_sill",
      semanticClass: "covered_arcade_generic_merchant_counter",
      meshId: "shop_counter",
      position: offsetPosition(
        { ...center, y: openingBottomY + counterHeightM * 0.5 },
        placement.face,
        0,
        0.1,
      ),
      scale: { x: counterWidthM, y: counterHeightM, z: 0.18 },
      yawRad,
      trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: timberTintHex,
    });
    pushInstance(instances, {
      placementId: `${placement.id}:arcade-counter-top`,
      moduleId: "covered_arcade_served_market_sill",
      semanticClass: "covered_arcade_generic_merchant_counter",
      meshId: "shop_counter",
      position: offsetPosition(
        { ...center, y: openingBottomY + counterHeightM + 0.05 },
        placement.face,
        0,
        0.06,
      ),
      scale: { x: counterWidthM + 0.16, y: 0.1, z: 0.4 },
      yawRad,
      trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: timberTintHex,
    });
    const shelfElevationM = Math.min(
      openingBottomY + placement.sizeM.height * 0.72,
      openingBottomY + counterHeightM + 0.72,
    );
    pushInstance(instances, {
      placementId: `${placement.id}:arcade-display-shelf`,
      moduleId: "covered_arcade_served_market_sill",
      semanticClass: "covered_arcade_generic_merchant_shelf",
      meshId: "shop_counter",
      position: offsetPosition(
        { ...center, y: shelfElevationM },
        placement.face,
        0,
        -recessDepthM + 0.12,
      ),
      scale: { x: placement.sizeM.width * (0.58 + marketVariant * 0.16), y: 0.07, z: 0.24 },
      yawRad,
      trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
      detailTintHex: timberTintHex,
    });
    const stock = marketVariant < 0.5
      ? [
        { x: -0.24, meshId: "merchant_goods_basket" as const, scale: { x: 0.34, y: 0.32, z: 0.32 } },
        { x: 0.22, meshId: "merchant_goods_pot" as const, scale: { x: 0.3, y: 0.38, z: 0.3 } },
      ]
      : [
        { x: -0.2, meshId: "merchant_goods_pot" as const, scale: { x: 0.32, y: 0.4, z: 0.32 } },
        { x: 0.25, meshId: "merchant_goods_basket" as const, scale: { x: 0.36, y: 0.3, z: 0.34 } },
      ];
    for (const [index, item] of stock.entries()) {
      pushInstance(instances, {
        placementId: `${placement.id}:arcade-generic-stock:${index + 1}`,
        moduleId: "covered_arcade_served_market_sill",
        semanticClass: "covered_arcade_generic_merchant_stock",
        meshId: item.meshId,
        position: offsetPosition(
          { ...center, y: openingBottomY + counterHeightM + 0.1 + item.scale.y * 0.5 },
          placement.face,
          item.x * placement.sizeM.width,
          0.025,
        ),
        scale: item.scale,
        yawRad: yawRad + (index === 0 ? -0.04 : 0.05),
        trimMaterialId: item.meshId === "merchant_goods_pot"
          ? profile.materialSlots.trim
          : MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: item.meshId === "merchant_goods_pot"
          ? marketVariant < 0.5 ? 0x77958a : 0xb27d5e
          : timberTintHex,
        uvProjection: "world",
      });
    }
    // The continuous souk roof establishes the lane, while every occupied
    // ground bay also receives its own opening-derived rain hood. The helper
    // sizes and centers the ledger, cloth, valance, braces and edge sockets
    // from this exact aperture, preserving datum alignment within the facade
    // while its stable placement seed varies the neighboring shop identity.
    pushSupportedAwning(
      placement,
      instances,
      center,
      yawRad,
      MERCHANT_TIMBER_MATERIAL_ID,
    );
  }
  const moduleId = placement.moduleId.toLowerCase();
  const screened = moduleId.includes("screen");
  const screenMaterialId = placement.id === "ARCH_FRONTAGE_SPICE_STREET_WEST_SCREEN_01"
    ? "tm_arch_screen_dark"
    : profile.family === "active_merchant"
      ? MERCHANT_TIMBER_MATERIAL_ID
      : profile.materialSlots.timber;
  // Grilles serve the opening frame, so seat them just behind its facade plane.
  // Placing them at the rear of the recess buried the verticals behind the
  // paneled timber back while a few horizontal fragments leaked through its
  // relief gaps as a detached pale sub-frame (SHOT_14).
  const screenInwardM = experimentalVisualCutouts
    ? placement.id === "ARCH_FRONTAGE_SPICE_STREET_WEST_SCREEN_01"
      // Validated construction override: this close-up grille sits in front of
      // its paneled recess; the generic rear-seat remains until B1 regenerates
      // the map-wide opening grammar and can retire authored exceptions.
      ? 0
      : -recessDepthM + 0.055
    : undefined;
  if (profile.family === "active_merchant" || profile.family === "covered_arcade") {
    // Main-lane upper openings share their story datum and now share one
    // reusable mashrabiya construction. The denser lattice varies only with
    // the opening dimensions/material selected by the facade grammar.
    pushMashrabiyaScreen(
      placement,
      instances,
      center,
      yawRad,
      screenMaterialId,
      screenInwardM,
    );
    if (!moduleId.includes("shutter")) return;
  } else if (screened) {
    pushScreenBars(placement, instances, center, yawRad, 3, 2, screenMaterialId, screenInwardM);
    return;
  } else if (!moduleId.includes("shutter")) {
    pushScreenBars(placement, instances, center, yawRad, 3, 2, screenMaterialId, screenInwardM);
    return;
  } else {
    pushScreenBars(placement, instances, center, yawRad, 2, 2, profile.materialSlots.timber, screenInwardM);
  }
  const shutterVariant = stableUnitInterval(`${placement.id}:shutter-variant`);
  for (const side of [-1, 1] as const) {
    const sideUnit = stableUnitInterval(`${placement.id}:shutter-side:${side}`);
    // Leaf width is set off the opening, not off the bay. At the old 0.39-0.49
    // factor a pair of leaves spanned wider than the pier between two adjacent
    // upper openings, so on the main-lane elevations the two bays' shutters met
    // and the masonry pier disappeared entirely: the whole upper storey read as
    // a timber wall with holes punched in it rather than masonry with shutters.
    // At 0.30-0.36 each leaf still covers its own reveal when swung to, and the
    // pier reads between bays the way the reference elevation does.
    // Leaf width is set off the opening, not off the bay. At the old 0.39-0.49
    // factor a pair of leaves spanned wider than the pier between two adjacent
    // upper openings, so on the main-lane elevations the two bays' shutters met
    // and the masonry pier disappeared entirely: the whole upper storey read as
    // a timber wall with holes punched in it rather than masonry with shutters.
    // At 0.36-0.42 each leaf still covers most of its own reveal when swung to,
    // and the pier reads between bays the way the reference elevation does.
    const shutterW = Math.max(0.16, placement.sizeM.width * (0.36 + sideUnit * 0.06));
    const shutterAngleRad = 0.08 + sideUnit * 0.5;
    // The middle variant was a saturated teal (0x699889). Raising the joinery
    // chroma to reach the target's warm timber amplified it well past anything
    // in the target: the balcony grille drifted from hue 29 to 41 at saturation
    // 0.31 where the target reads hue 23 at 0.17 — a desaturated blue-grey, not
    // a green. Kept as the cool member of the series so the run still varies,
    // but at a chroma the extrapolation cannot turn green.
    //
    // Darkening this series toward walnut (0x6f4d36/0x5d5348/0x6a5738) was
    // tried and reverted: the same extrapolation that punishes added chroma
    // also amplifies it as value drops, and the leaves came back crimson. The
    // leaf's own vertex range in createLouveredShutterGeometry is the lever
    // that works here; this tint is not.
    const shutterBaseHex = shutterVariant < 0.34
      ? 0xb77f5b
      : shutterVariant < 0.67
        ? 0x867d7c
        : 0xa79061;
    const shutterTintHex = scaleHexColor(shutterBaseHex, 0.96 + sideUnit * 0.16);
    pushInstance(instances, {
      placementId: `${placement.id}:shutter:${side}`,
      moduleId: "window_shuttered_dark",
      semanticClass: "window_shutter",
      meshId: "window_shutter",
      position: offsetPosition(
        center,
        placement.face,
        side * (placement.sizeM.width * 0.5 + shutterW * (0.44 + sideUnit * 0.06)),
        0.04,
      ),
      scale: { x: shutterW, y: placement.sizeM.height, z: 0.1 },
      yawRad: yawRad + side * shutterAngleRad,
      detailMaterialId: "ph_rough_pine_door",
      detailTintHex: shutterTintHex,
    });
    for (const vertical of [-0.3, 0.3]) {
      pushInstance(instances, {
        placementId: `${placement.id}:shutter-hinge:${side}:${vertical}`,
        moduleId: "window_shuttered_dark",
        semanticClass: "window_shutter_hinge",
        meshId: "sign_bracket",
        position: offsetPosition(
          center,
          placement.face,
          side * (placement.sizeM.width * 0.51),
          0.125,
          placement.sizeM.height * vertical,
        ),
        scale: { x: 0.16, y: 0.045, z: 0.045 },
        yawRad,
        // Dark warm iron, to match the target's window hardware. These carried
        // no tint at all, which was an omission rather than a decision.
        //
        // The tint alone only partly lands: measured on a clip at (284,279) it
        // moved 187 -> 175 where the albedo ratio predicts roughly half that
        // value. These are `sign_bracket` on the `iron` role, and their rendered
        // brightness is dominated by environment reflection plus specular,
        // neither of which an albedo tint scales.
        //
        // That diagnosis has now been acted on rather than left standing:
        // DETAIL_METAL_ENVIRONMENT_INTENSITY went 0.72 -> 0.20 in Game.ts, which
        // took this hardware from luminance 71 at a red-to-blue ratio of 0.96
        // (a pale blue tab) to 33 at 1.15 (dark warm iron, sitting below the
        // timber it is bolted to at 41), with the timber itself unmoved. Do not
        // reach for the tint here again.
        detailTintHex: 0x3a3128,
      });
    }
  }
}

function pushScreenBars(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  verticalCount: number,
  horizontalCount: number,
  materialId?: string,
  inwardM = 0.084,
  detailTintHex?: number,
): void {
  for (let index = 0; index < verticalCount; index += 1) {
    const along = verticalCount === 1
      ? 0
      : -placement.sizeM.width * 0.34 + placement.sizeM.width * 0.68 * (index / (verticalCount - 1));
    pushInstance(instances, {
      placementId: `${placement.id}:screen-v:${index + 1}`,
      moduleId: placement.moduleId,
      semanticClass: "window_screen",
      meshId: "window_screen_bar",
      position: offsetPosition(center, placement.face, along, inwardM),
      scale: { x: 0.065, y: placement.sizeM.height * 0.84, z: 0.052 },
      yawRad,
      ...(materialId ? { trimMaterialId: materialId } : {}),
      ...(detailTintHex !== undefined ? { detailTintHex } : {}),
    });
  }
  for (let index = 0; index < horizontalCount; index += 1) {
    const vertical = horizontalCount === 1
      ? 0
      : -placement.sizeM.height * 0.26 + placement.sizeM.height * 0.52 * (index / (horizontalCount - 1));
    pushInstance(instances, {
      placementId: `${placement.id}:screen-h:${index + 1}`,
      moduleId: placement.moduleId,
      semanticClass: "window_screen",
      meshId: "window_screen_bar",
      position: offsetPosition(center, placement.face, 0, inwardM + 0.002, vertical),
      scale: { x: placement.sizeM.width * 0.82, y: 0.065, z: 0.052 },
      yawRad,
      ...(materialId ? { trimMaterialId: materialId } : {}),
      ...(detailTintHex !== undefined ? { detailTintHex } : {}),
    });
  }
}

function pushMashrabiyaScreen(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  materialId: string,
  inwardM: number | undefined,
): void {
  const screenInwardM = inwardM ?? 0.084;
  const densityUnit = stableUnitInterval(`${placement.id}:mashrabiya-density`);
  const railUnit = stableUnitInterval(`${placement.id}:mashrabiya-rail-density`);
  const verticalCount = 4 + Math.floor(densityUnit * 3);
  const horizontalCount = 3 + Math.floor(railUnit * 3);
  // Same correction as the shutter series: the teal middle variant survives as
  // the cool member, desaturated so the joinery chroma lift cannot drive it to
  // green against a target that has no teal on this frontage.
  const timberBaseHex = densityUnit < 0.34
    ? 0xb77f58
    : densityUnit < 0.67
      ? 0x827a79
      : 0xa88d61;
  const timberTintHex = scaleHexColor(timberBaseHex, 0.96 + densityUnit * 0.18);
  pushScreenBars(
    placement,
    instances,
    center,
    yawRad,
    verticalCount,
    horizontalCount,
    materialId,
    screenInwardM,
    timberTintHex,
  );

  const latticeWidthM = placement.sizeM.width * 0.72;
  const latticeHeightM = placement.sizeM.height * 0.7;
  const diagonalLengthM = Math.hypot(latticeWidthM, latticeHeightM);
  const diagonalAngleRad = Math.atan2(latticeWidthM, latticeHeightM);
  const motifUnit = stableUnitInterval(`${placement.id}:mashrabiya-motif`);
  const motifDirections: readonly (-1 | 1)[] = motifUnit < 0.34
    ? [-1]
    : motifUnit < 0.68
      ? [1]
      : [-1, 1];
  for (const direction of motifDirections) {
    pushInstance(instances, {
      placementId: `${placement.id}:mashrabiya-diagonal:${direction}`,
      moduleId: placement.moduleId,
      semanticClass: "upper_story_mashrabiya_lattice",
      meshId: "window_screen_bar",
      position: offsetPosition(center, placement.face, 0, screenInwardM + 0.006),
      scale: { x: 0.052, y: diagonalLengthM, z: 0.056 },
      yawRad,
      rollRad: direction * diagonalAngleRad,
      trimMaterialId: materialId,
      detailTintHex: timberTintHex,
    });
  }
}

function pushSimpleModule(
  placement: V3ArchitectureModulePlacement,
  instances: WallDetailInstance[],
  center: { x: number; y: number; z: number },
  yawRad: number,
  materialId: string,
  wallMaterialId: string,
  trimMaterialId: string,
  experimentalVisualCutouts: boolean,
): void {
  switch (placement.moduleKind) {
    case "vent": {
      const revealDepthM = experimentalVisualCutouts
        ? resolveExperimentalRevealDepthM(placement, "service_storage")
        : 0.18;
      pushInstance(instances, {
        placementId: placement.id,
        moduleId: placement.moduleId,
        semanticClass: "service_vent",
        meshId: "window_recess_dark",
        position: offsetPosition(
          center,
          placement.face,
          0,
          experimentalVisualCutouts ? -revealDepthM * 0.48 : 0.09,
        ),
        scale: { x: placement.sizeM.width * 0.92, y: placement.sizeM.height * 0.86, z: revealDepthM },
        yawRad,
        detailMaterialId: "tm_service_interior",
      });
      pushScreenBars(
        placement,
        instances,
        center,
        yawRad,
        0,
        3,
        materialId,
        experimentalVisualCutouts ? -revealDepthM + 0.055 : undefined,
      );
      return;
    }
    case "column":
      if (placement.moduleId === "timber_coverage_closure") {
        const bottomY = center.y - placement.sizeM.height * 0.5;
        const leafInwardM = experimentalVisualCutouts ? -0.035 : 0.035;
        pushInstance(instances, {
          placementId: `${placement.id}:sealed-gate-leaf`,
          moduleId: "timber_coverage_closure",
          semanticClass: "grammar_served_planked_gate_leaf",
          meshId: "door_panel_storage",
          position: offsetPosition(
            { ...center, y: center.y + 0.035 },
            placement.face,
            0,
            leafInwardM,
          ),
          scale: {
            x: Math.max(0.42, placement.sizeM.width - 0.12),
            y: placement.sizeM.height - 0.1,
            z: 0.12,
          },
          yawRad,
          detailMaterialId: "ph_rough_pine_door",
          detailTintHex: 0x78573f,
          uvProjection: "world",
        });
        pushFrame(
          placement,
          instances,
          center,
          yawRad,
          trimMaterialId,
          "grammar_served_gate_surround",
          { widthM: 0.15, depthM: 0.18, inwardM: 0.02 },
        );
        pushInstance(instances, {
          placementId: `${placement.id}:sealed-gate-center-stile`,
          moduleId: "timber_coverage_closure",
          semanticClass: "grammar_served_gate_joinery",
          meshId: "door_jamb",
          position: offsetPosition(center, placement.face, 0, leafInwardM + 0.075),
          scale: { x: 0.075, y: placement.sizeM.height * 0.84, z: 0.055 },
          yawRad,
          trimMaterialId: "ph_rough_pine_door",
          detailTintHex: 0x9a7656,
          uvProjection: "world",
        });
        pushInstance(instances, {
          placementId: `${placement.id}:sealed-gate-threshold`,
          moduleId: "timber_coverage_closure",
          semanticClass: "grammar_served_gate_threshold",
          meshId: "door_lintel",
          position: offsetPosition(
            { ...center, y: bottomY + 0.065 },
            placement.face,
            0,
            -0.02,
          ),
          scale: { x: placement.sizeM.width + 0.22, y: 0.13, z: 0.28 },
          yawRad,
          trimMaterialId,
          uvProjection: "world",
        });
        return;
      }
      {
        const bottomY = center.y - placement.sizeM.height * 0.5;
        const capitalHeightM = 0.16;
        const baseHeightM = 0.2;
        pushInstance(instances, {
          placementId: `${placement.id}:column-base`,
          moduleId: placement.moduleId,
          semanticClass: "arcade_column_base",
          meshId: "corner_pier",
          position: { ...center, y: bottomY + baseHeightM * 0.5 },
          scale: {
            x: placement.sizeM.width + 0.18,
            y: baseHeightM,
            z: placement.sizeM.depth + 0.18,
          },
          yawRad,
          trimMaterialId,
        });
        pushInstance(instances, {
          placementId: `${placement.id}:column-capital`,
          moduleId: placement.moduleId,
          semanticClass: "arcade_column_capital",
          meshId: "corner_pier",
          position: { ...center, y: center.y + placement.sizeM.height * 0.5 - capitalHeightM * 0.5 },
          scale: {
            x: placement.sizeM.width + 0.22,
            y: capitalHeightM,
            z: placement.sizeM.depth + 0.22,
          },
          yawRad,
          trimMaterialId,
        });
        const shaftHeightM = Math.max(
          MIN_DIMENSION_M,
          placement.sizeM.height - baseHeightM - capitalHeightM,
        );
        pushInstance(instances, {
          placementId: placement.id,
          moduleId: placement.moduleId,
          semanticClass: "arcade_column",
          meshId: "corner_pier",
          position: {
            ...center,
            y: bottomY + baseHeightM + shaftHeightM * 0.5,
          },
          scale: { x: placement.sizeM.width, y: shaftHeightM, z: placement.sizeM.depth },
          yawRad,
          trimMaterialId,
        });
      }
      return;
    case "blind_niche": {
      const revealDepthM = experimentalVisualCutouts
        ? resolveExperimentalRevealDepthM(placement, "quiet_residential")
        : 0;
      const bottomY = center.y - placement.sizeM.height * 0.5;
      const readsAsDoor = bottomY <= 0.28 && placement.sizeM.height >= 1.5;
      pushInstance(instances, {
        placementId: placement.id,
        moduleId: placement.moduleId,
        semanticClass: "blind_niche",
        meshId: "niche_recess_back",
        position: offsetPosition(
          center,
          placement.face,
          0,
          experimentalVisualCutouts ? -revealDepthM + 0.03 : 0.012,
        ),
        scale: { x: placement.sizeM.width, y: placement.sizeM.height, z: 0.035 },
        yawRad,
        ...(readsAsDoor
          ? {
            detailMaterialId: "ph_rough_pine_door",
            detailTintHex: 0x72523d,
            uvProjection: "world" as const,
          }
          : {}),
      });
      if (experimentalVisualCutouts) {
        for (const side of [-1, 1] as const) {
          pushInstance(instances, {
            placementId: `${placement.id}:niche-return:${side}`,
            moduleId: placement.moduleId,
            semanticClass: "blind_niche_masonry_return",
            meshId: "door_jamb",
            position: offsetPosition(
              center,
              placement.face,
              side * (placement.sizeM.width * 0.5 - 0.035),
              -revealDepthM * 0.5,
            ),
            scale: { x: 0.07, y: placement.sizeM.height, z: revealDepthM },
            yawRad,
            wallMaterialId,
          });
        }
        pushInstance(instances, {
          placementId: `${placement.id}:niche-head-return`,
          moduleId: placement.moduleId,
          semanticClass: "blind_niche_masonry_return",
          meshId: "door_lintel",
          position: offsetPosition(
            center,
            placement.face,
            0,
            -revealDepthM * 0.5,
            placement.sizeM.height * 0.5 - 0.035,
          ),
          scale: { x: placement.sizeM.width, y: 0.07, z: revealDepthM },
          yawRad,
          wallMaterialId,
        });
      }
      pushFrame(
        placement,
        instances,
        center,
        yawRad,
        trimMaterialId,
        readsAsDoor ? "closed_door_frame" : "blind_niche",
        experimentalVisualCutouts
          ? { widthM: 0.14, depthM: 0.15, inwardM: 0.02 }
          : {},
      );
      if (readsAsDoor) {
        const leafInwardM = experimentalVisualCutouts ? -revealDepthM + 0.065 : 0.025;
        pushInstance(instances, {
          placementId: `${placement.id}:closed-door-leaf`,
          moduleId: "blind_niche_closed_door",
          semanticClass: "closed_planked_door_leaf",
          meshId: "door_panel_timber",
          position: offsetPosition(
            { ...center, y: center.y + 0.035 },
            placement.face,
            0,
            leafInwardM,
          ),
          scale: {
            x: placement.sizeM.width - 0.08,
            y: placement.sizeM.height - 0.02,
            z: 0.12,
          },
          yawRad,
          detailMaterialId: "ph_rough_pine_door",
          detailTintHex: 0x78563e,
          uvProjection: "world",
        });
        pushInstance(instances, {
          placementId: `${placement.id}:closed-door-center-stile`,
          moduleId: "blind_niche_closed_door",
          semanticClass: "closed_planked_door_joinery",
          meshId: "door_jamb",
          position: offsetPosition(center, placement.face, 0, leafInwardM + 0.075),
          scale: { x: 0.07, y: placement.sizeM.height * 0.86, z: 0.055 },
          yawRad,
          trimMaterialId: "ph_rough_pine_door",
          detailTintHex: 0x9a7656,
          uvProjection: "world",
        });
      }
      pushInstance(instances, {
        placementId: `${placement.id}:niche-sill`,
        moduleId: placement.moduleId,
        semanticClass: "niche_sill",
        meshId: "door_lintel",
        position: offsetPosition(
          center,
          placement.face,
          0,
          experimentalVisualCutouts ? -revealDepthM * 0.5 : 0.075,
          -placement.sizeM.height * 0.5 - 0.05,
        ),
        scale: experimentalVisualCutouts
          ? { x: placement.sizeM.width + 0.08, y: 0.1, z: revealDepthM + 0.06 }
          : { x: placement.sizeM.width + 0.3, y: 0.1, z: 0.2 },
        yawRad,
        trimMaterialId,
      });
      return;
    }
    case "arch":
      {
        const isHeroArch = placement.moduleId.includes("hero");
        const archVariant = stableUnitInterval(placement.id);
        const revealDepthM = experimentalVisualCutouts
          ? resolveExperimentalRevealDepthM(placement, isHeroArch ? "hero_courtyard" : "covered_arcade")
          : isHeroArch
            ? Math.min(0.46, Math.max(0.4, placement.sizeM.depth * 0.88))
            : Math.min(0.4, Math.max(0.34, placement.sizeM.depth * (0.82 + archVariant * 0.1)));
        const bottomY = center.y - placement.sizeM.height * 0.5;
        // Non-hero arcade arches retain a noninteractive screened backing.
        // The Rug Gate hero arch is an already-traversable portal and must stay
        // visually empty so the Spawn-B court and distant backdrop read through.
        if (!isHeroArch) {
          pushInstance(instances, {
            placementId: placement.id,
            moduleId: placement.moduleId,
            semanticClass: "screened_arch_interior",
            meshId: "arch_recess_back",
            position: offsetPosition(
              {
                ...center,
                y: center.y - placement.sizeM.height * (experimentalVisualCutouts ? 0.015 : 0.09),
              },
              placement.face,
              0,
              -revealDepthM + 0.04,
            ),
            scale: {
              x: placement.sizeM.width * (experimentalVisualCutouts ? 0.84 : 0.66),
              y: placement.sizeM.height * (experimentalVisualCutouts ? 0.88 : 0.82),
              z: 0.06,
            },
            visualQaDimensions: {
              x: placement.sizeM.width * (experimentalVisualCutouts ? 0.84 : 0.66),
              y: placement.sizeM.height * (experimentalVisualCutouts ? 0.88 : 0.82),
              z: revealDepthM,
            },
            yawRad,
            detailMaterialId: "ph_rough_pine_door",
            // The screen is the back of a shaded shop, not a sunlit board. At
            // its old tone the pine grain read as a bright straw panel filling
            // the whole bay, which flattened the arcade into a row of boarded
            // apertures; darkening it puts the stock racked in front of it in
            // relief instead.
            detailTintHex: 0x4a3225,
            uvProjection: "world",
          });
        }
        const jambHeightM = placement.sizeM.height * 0.55;
        for (const side of [-1, 1] as const) {
          pushInstance(instances, {
            placementId: `${placement.id}:reveal-return:${side}`,
            moduleId: placement.moduleId,
            semanticClass: isHeroArch ? "hero_arch_masonry_return" : "arcade_arch_masonry_return",
            meshId: "door_jamb",
            position: offsetPosition(
              { ...center, y: bottomY + jambHeightM * 0.5 },
              placement.face,
              side * placement.sizeM.width * 0.35,
              -revealDepthM * 0.5 + 0.04,
            ),
            scale: {
              x: isHeroArch ? 0.2 : 0.16,
              y: jambHeightM,
              z: revealDepthM + 0.12,
            },
            yawRad,
            wallMaterialId,
          });
          for (const [kind, heightM, y] of [
            ["base", isHeroArch ? 0.24 : 0.2, bottomY + (isHeroArch ? 0.12 : 0.1)],
            [
              "capital",
              isHeroArch ? 0.2 : 0.16,
              bottomY + jambHeightM - (isHeroArch ? 0.1 : 0.08),
            ],
          ] as const) {
            pushInstance(instances, {
              placementId: `${placement.id}:reveal-${kind}:${side}`,
              moduleId: placement.moduleId,
              semanticClass: isHeroArch ? `hero_arch_column_${kind}` : `arcade_arch_column_${kind}`,
              meshId: "corner_pier",
              position: offsetPosition(
                { ...center, y },
                placement.face,
                side * placement.sizeM.width * 0.35,
                -revealDepthM * 0.5 + 0.04,
              ),
              scale: {
                x: isHeroArch ? 0.34 : 0.28,
                y: heightM,
                z: revealDepthM + 0.18,
              },
              yawRad,
              wallMaterialId,
            });
          }
        }
        pushInstance(instances, {
          placementId: `${placement.id}:threshold`,
          moduleId: placement.moduleId,
          semanticClass: isHeroArch ? "open_arch_threshold" : "screened_arch_threshold",
          meshId: "door_lintel",
          position: offsetPosition(
            { ...center, y: bottomY + 0.07 },
            placement.face,
            0,
            -revealDepthM * 0.5 + 0.05,
          ),
          scale: {
            x: placement.sizeM.width * 0.72,
            y: 0.14,
            z: revealDepthM + 0.14,
          },
          yawRad,
          trimMaterialId: "ph_stone_trim_sandstone",
          uvProjection: "world",
        });
        if (experimentalVisualCutouts) {
          pushInstance(instances, {
            placementId: `${placement.id}:arch-spandrel`,
            moduleId: placement.moduleId,
            semanticClass: isHeroArch ? "hero_arch_spandrel" : "arcade_arch_spandrel",
            meshId: "arch_spandrel",
            position: offsetPosition(center, placement.face, 0, -0.025),
            scale: { x: placement.sizeM.width, y: placement.sizeM.height, z: 0.12 },
            yawRad,
            wallMaterialId,
            detailMaterialId: wallMaterialId,
            uvProjection: "world",
          });
        }
        pushInstance(instances, {
          placementId: `${placement.id}:arch-frame`,
          moduleId: placement.moduleId,
          semanticClass: isHeroArch ? "hero_courtyard_arch" : "arcade_arch",
          meshId: "arch_pointed_frame",
          position: offsetPosition(
            center,
            placement.face,
            0,
            experimentalVisualCutouts ? 0.018 : isHeroArch ? 0.08 : 0.065,
          ),
          scale: {
            x: placement.sizeM.width,
            y: placement.sizeM.height,
            z: isHeroArch ? 0.25 : 0.18 + archVariant * 0.04,
          },
          yawRad,
          detailMaterialId: "ph_stone_trim_sandstone",
          uvProjection: "world",
        });

        if (!isHeroArch) {
          const marketVariant = stableUnitInterval(`${placement.id}:arcade-kiosk`);
          const counterHeightM = 0.52 + marketVariant * 0.14;
          const counterWidthM = placement.sizeM.width * (0.62 + marketVariant * 0.14);
          const timberTintHex = marketVariant < 0.34
            ? 0xa87552
            : marketVariant < 0.67
              ? 0x6d9182
              : 0x9d845c;
          // A non-hero arcade arch is a sealed, served market kiosk. The
          // counter and its generic stock derive from the arch's threshold,
          // centerline, reveal and clear width; the screen remains behind it.
          pushInstance(instances, {
            placementId: `${placement.id}:arcade-kiosk-counter`,
            moduleId: "covered_arcade_served_kiosk",
            semanticClass: "covered_arcade_generic_merchant_counter",
            meshId: "shop_counter",
            position: offsetPosition(
              { ...center, y: bottomY + counterHeightM * 0.5 + 0.08 },
              placement.face,
              0,
              0.07,
            ),
            scale: { x: counterWidthM, y: counterHeightM, z: 0.18 },
            yawRad,
            trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
            detailTintHex: timberTintHex,
          });
          pushInstance(instances, {
            placementId: `${placement.id}:arcade-kiosk-counter-top`,
            moduleId: "covered_arcade_served_kiosk",
            semanticClass: "covered_arcade_generic_merchant_counter",
            meshId: "shop_counter",
            position: offsetPosition(
              { ...center, y: bottomY + counterHeightM + 0.13 },
              placement.face,
              0,
              0.035,
            ),
            scale: { x: counterWidthM + 0.18, y: 0.1, z: 0.42 },
            yawRad,
            trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
            detailTintHex: timberTintHex,
          });
          const kioskStock = marketVariant < 0.5
            ? [
              { along: -0.22, meshId: "merchant_goods_basket" as const, size: { x: 0.4, y: 0.32, z: 0.38 } },
              { along: 0.23, meshId: "merchant_goods_pot" as const, size: { x: 0.34, y: 0.43, z: 0.34 } },
            ]
            : [
              { along: -0.26, meshId: "merchant_goods_pot" as const, size: { x: 0.36, y: 0.46, z: 0.36 } },
              { along: 0.02, meshId: "merchant_goods_basket" as const, size: { x: 0.34, y: 0.28, z: 0.33 } },
              { along: 0.28, meshId: "merchant_goods_basket" as const, size: { x: 0.38, y: 0.31, z: 0.36 } },
            ];
          for (const [index, stock] of kioskStock.entries()) {
            pushInstance(instances, {
              placementId: `${placement.id}:arcade-kiosk-stock:${index + 1}`,
              moduleId: "covered_arcade_served_kiosk",
              semanticClass: "covered_arcade_generic_merchant_stock",
              meshId: stock.meshId,
              position: offsetPosition(
                { ...center, y: bottomY + counterHeightM + 0.18 + stock.size.y * 0.5 },
                placement.face,
                stock.along * placement.sizeM.width,
                0.005,
              ),
              scale: stock.size,
              yawRad: yawRad + (index - 0.5) * 0.055,
              trimMaterialId: stock.meshId === "merchant_goods_pot"
                ? trimMaterialId
                : MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: stock.meshId === "merchant_goods_pot"
                ? marketVariant < 0.5 ? 0x73958a : 0xb17b5b
                : timberTintHex,
              uvProjection: "world",
            });
          }
          // Racked textile stock inside the reveal. The arcade's whole identity
          // is rugs, and behind the counter these bays showed nothing but their
          // timber screen, whose plank grain read as a boarded-up straw panel
          // rather than a shop. Two shelves of rolled bolts standing on end give
          // the bay depth, colour and a reason to exist; everything stays inside
          // the reveal so the lane envelope is untouched.
          const rugTints = [0x8f3f2f, 0x3a4b55, 0xa8662f, 0x74404c, 0x8f7a3c] as const;
          const shelfWidthM = placement.sizeM.width * 0.68;
          const shelfDepthM = Math.max(0.16, revealDepthM * 0.52);
          const rackInwardM = -revealDepthM * 0.34;
          const rackTopLimitY = bottomY + placement.sizeM.height * 0.76;
          for (let shelf = 0; shelf < 2; shelf += 1) {
            const shelfY = bottomY + counterHeightM + 0.34 + shelf * 0.62;
            if (shelfY + 0.5 > rackTopLimitY) break;
            pushInstance(instances, {
              placementId: `${placement.id}:textile-shelf:${shelf}`,
              moduleId: "covered_arcade_served_kiosk",
              semanticClass: "covered_arcade_textile_shelf",
              meshId: "shop_counter",
              position: offsetPosition(
                { ...center, y: shelfY },
                placement.face,
                0,
                rackInwardM,
              ),
              scale: { x: shelfWidthM, y: 0.07, z: shelfDepthM },
              yawRad,
              trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: scaleHexColor(timberTintHex, 0.86),
              uvProjection: "world",
            });
            const rollCount = 4;
            for (let roll = 0; roll < rollCount; roll += 1) {
              const rollAlongM = shelfWidthM * (-0.36 + (roll * 0.72) / (rollCount - 1));
              const rollHeightM = 0.4 + ((roll + shelf) % 3) * 0.055;
              pushInstance(instances, {
                placementId: `${placement.id}:textile-roll:${shelf}:${roll}`,
                moduleId: "covered_arcade_served_kiosk",
                semanticClass: "covered_arcade_textile_roll",
                meshId: "cable_segment",
                position: offsetPosition(
                  { ...center, y: shelfY + 0.035 + rollHeightM * 0.5 },
                  placement.face,
                  rollAlongM,
                  rackInwardM,
                ),
                scale: { x: 0.15, y: rollHeightM, z: 0.15 },
                yawRad,
                trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
                detailTintHex: rugTints[(roll * 2 + shelf * 3) % rugTints.length]!,
                uvProjection: "world",
              });
            }
          }
          // One hung display panel down the inner jamb, so the bay has a large
          // woven field as well as stock. Held to one side of the centreline and
          // inside the reveal, clear of the counter and the arch ring.
          {
            const panelSide = marketVariant < 0.5 ? -1 : 1;
            const panelHeightM = Math.min(1.5, placement.sizeM.height * 0.44);
            pushInstance(instances, {
              placementId: `${placement.id}:textile-hung-panel`,
              moduleId: "covered_arcade_served_kiosk",
              semanticClass: "covered_arcade_textile_hung_panel",
              meshId: "shop_counter",
              position: offsetPosition(
                {
                  ...center,
                  y: bottomY + placement.sizeM.height * 0.72 - panelHeightM * 0.5,
                },
                placement.face,
                panelSide * placement.sizeM.width * 0.31,
                rackInwardM - 0.03,
              ),
              scale: { x: placement.sizeM.width * 0.26, y: panelHeightM, z: 0.05 },
              yawRad,
              trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: rugTints[marketVariant < 0.5 ? 0 : 3]!,
              uvProjection: "world",
            });
            pushInstance(instances, {
              placementId: `${placement.id}:textile-hung-rail`,
              moduleId: "covered_arcade_served_kiosk",
              semanticClass: "covered_arcade_textile_hung_panel",
              meshId: "window_screen_bar",
              position: offsetPosition(
                { ...center, y: bottomY + placement.sizeM.height * 0.72 + 0.03 },
                placement.face,
                panelSide * placement.sizeM.width * 0.31,
                rackInwardM - 0.03,
              ),
              scale: { x: placement.sizeM.width * 0.3, y: 0.05, z: 0.05 },
              yawRad,
              detailMaterialId: "tm_arch_screen_dark",
            });
          }
          pushSupportedAwning(
            placement,
            instances,
            center,
            yawRad,
            MERCHANT_TIMBER_MATERIAL_ID,
          );
          const grilleWidthM = placement.sizeM.width * 0.78;
          const grilleHeightM = placement.sizeM.height * 0.72;
          const grilleCenterY = bottomY + placement.sizeM.height * 0.39;
          const grilleInwardM = -revealDepthM * 0.42;
          for (const normalized of [-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48]) {
            pushInstance(instances, {
              placementId: `${placement.id}:grille-post:${normalized}`,
              moduleId: placement.moduleId,
              semanticClass: "arcade_arch_complete_grille",
              meshId: "window_screen_bar",
              position: offsetPosition(
                { ...center, y: grilleCenterY },
                placement.face,
                normalized * grilleWidthM,
                grilleInwardM,
              ),
              scale: { x: 0.052, y: grilleHeightM, z: 0.052 },
              yawRad,
              detailMaterialId: "tm_arch_screen_dark",
            });
          }
          for (const normalized of [-0.45, -0.225, 0, 0.225, 0.45]) {
            pushInstance(instances, {
              placementId: `${placement.id}:grille-rail:${normalized}`,
              moduleId: placement.moduleId,
              semanticClass: "arcade_arch_complete_grille",
              meshId: "window_screen_bar",
              position: offsetPosition(
                { ...center, y: grilleCenterY + normalized * grilleHeightM },
                placement.face,
                0,
                grilleInwardM + 0.004,
              ),
              scale: { x: grilleWidthM, y: 0.055, z: 0.052 },
              yawRad,
              detailMaterialId: "tm_arch_screen_dark",
            });
          }
        }
        if (isHeroArch) {
          pushInstance(instances, {
            placementId: `${placement.id}:hero-keystone-accent`,
            moduleId: placement.moduleId,
            semanticClass: "hero_arch_accent",
            meshId: "tile_accent",
            position: offsetPosition(
              { ...center, y: center.y + placement.sizeM.height * 0.44 },
              placement.face,
              0,
              0.17,
            ),
            scale: { x: 0.38, y: 0.24, z: 0.1 },
            yawRad,
          });
        }
      }
      return;
    case "shop_recess":
    case "door":
    case "window":
      fail(`internal routing error for '${placement.id}'`);
  }
}

function pushFacadeModule(
  placement: V3ArchitectureModulePlacement,
  profiles: ReadonlyMap<string, V3FacadeProfile>,
  instances: WallDetailInstance[],
  doorModelPlacements: DoorModelPlacement[],
  fortifiedDoorModelAvailable: boolean,
  experimentalVisualCutouts: boolean,
  stallSeated: boolean,
): void {
  // Connector collision is owned by the compiled traversal/collision layer.
  // Its façade aperture is already removed by pushMassingVisualShell; emitting
  // any visual module here would falsely advertise a closed route.
  if (placement.collisionOpening) return;
  requirePositiveDimensions(placement.id, placement.sizeM);
  const { profile, materialId } = resolveSlotMaterial(placement, profiles);
  if (!profile.moduleIds.includes(placement.moduleId)) {
    fail(`placement '${placement.id}' uses module '${placement.moduleId}' outside profile '${profile.id}'`);
  }
  const compiledCenter = designToWorldVec3(placement.center);
  // Compiler centers facade-module volumes with their back face on the wall.
  // Openings are rendered from the wall surface so their authored depth reads
  // as a reveal rather than a solid box intruding into the playable route.
  const wallCenter = offsetPosition(compiledCenter, placement.face, 0, -placement.sizeM.depth * 0.5);
  const center = placement.moduleKind === "column" ? compiledCenter : wallCenter;
  const yawRad = designYawDegToWorldYawRad(placement.yawDeg);
  switch (placement.moduleKind) {
    case "shop_recess": {
      const recessDepthM = experimentalVisualCutouts
        ? resolveExperimentalRevealDepthM(placement, profile.family)
        : Math.min(
          SHOP_RECESS_LEGACY_MAX_DEPTH_M,
          Math.max(
            SHOP_RECESS_LEGACY_MIN_DEPTH_M,
            SHOP_SURROUND_DEPTH_M,
            placement.sizeM.depth + SHOP_RECESS_EXTRA_DEPTH_M,
          ),
        );
      const backPlaneInwardM = experimentalVisualCutouts ? -recessDepthM + 0.025 : 0.025;
      const interiorMidInwardM = experimentalVisualCutouts ? -recessDepthM * 0.5 : recessDepthM * 0.48;
      const surroundInwardM = experimentalVisualCutouts ? 0.02 : recessDepthM * 0.48;
      const surroundDepthM = experimentalVisualCutouts ? 0.16 : recessDepthM;
      const sillInwardM = experimentalVisualCutouts ? -0.02 : recessDepthM * 0.48;
      const sillDepthM = experimentalVisualCutouts ? 0.26 : recessDepthM;
      // Pull the stock wall forward from the rear plane so goods remain
      // legible from the lane while the floor/returns still expose the full
      // authored room depth behind the facade.
      const rearFixtureInwardM = experimentalVisualCutouts
        ? -Math.max(0.72, recessDepthM * 0.68)
        : 0.14;
      const baySemantic = profile.family === "active_merchant"
        ? "active_merchant_bay"
        : "arcade_merchant_bay";
      const halfW = placement.sizeM.width * 0.5;
      const halfH = placement.sizeM.height * 0.5;
      const bottomY = center.y - halfH;
      const interiorWidthM = placement.sizeM.width * 0.9;
      const interiorHeightM = placement.sizeM.height * 0.88;
      const shopVariant = stableUnitInterval(`${placement.id}:shop-variant`);
      const shopBackBaseHex = shopVariant < 0.34
        ? 0xb48867
        : shopVariant < 0.67
          ? 0x769988
          : 0xb09663;
      const shopKitBaseHex = shopVariant < 0.34
        ? 0xc49366
        : shopVariant < 0.67
          ? 0x79a48f
          : 0xb6a06e;
      // Everything this bay contains — counter, shelving, uprights, stock and
      // display frontage — stands 1.35 m inside a shaded room, not out on the
      // street, and has to be valued that way. Measured against the target this
      // was the real gap: successive darkening of the recess LINING moved the
      // bay's dark half (5th percentile 26 -> 24, 25th 37 -> 32) while its
      // bright half did not move at all (75th 87 -> 87, 95th 152 -> 151)
      // against target percentiles of 57 and 102. The lining was never what
      // held the bay light; its contents were, and they carried exterior
      // values.
      const INTERIOR_SHADE = 0.62;
      // Continuous value variation keeps two neighboring bays from collapsing
      // to identical material+tint even when they land in the same palette.
      const shopBackTintHex = scaleHexColor(shopBackBaseHex, 0.88 + shopVariant * 0.2);
      const shopKitTintHex = scaleHexColor(
        shopKitBaseHex,
        (0.9 + shopVariant * 0.17) * INTERIOR_SHADE,
      );
      pushInstance(instances, {
        placementId: placement.id,
        moduleId: placement.moduleId,
        semanticClass: baySemantic,
        meshId: experimentalVisualCutouts ? "shop_recess_back" : "shop_recess_timber_back",
        position: offsetPosition(center, placement.face, 0, backPlaneInwardM),
        scale: { x: interiorWidthM, y: interiorHeightM, z: 0.06 },
        visualQaDimensions: { x: interiorWidthM, y: interiorHeightM, z: recessDepthM },
        yawRad,
        ...(experimentalVisualCutouts ? { wallMaterialId: profile.materialSlots.wall } : {}),
        detailTintHex: shopBackTintHex,
        uvProjection: "world",
      });
      for (const side of [-1, 1] as const) {
        pushInstance(instances, {
          placementId: `${placement.id}:interior-return:${side}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_interior_return",
          meshId: experimentalVisualCutouts ? "shop_recess_back" : "shop_recess_timber_back",
          position: offsetPosition(
            center,
            placement.face,
            side * interiorWidthM * 0.5,
            interiorMidInwardM,
          ),
          scale: { x: recessDepthM, y: interiorHeightM, z: 0.055 },
          yawRad: yawRad + Math.PI * 0.5,
          ...(experimentalVisualCutouts ? { wallMaterialId: profile.materialSlots.wall } : {}),
          // The returns run perpendicular to the frontage, so unlike the back
          // plane they catch raking light: sharing one tint put them at luma
          // 105 against the back plane's 63, making the inside of a 1.35 m deep
          // shop BRIGHTER than the pier beside it. They need their own darker
          // value — scaling the shared recess multiplier instead would drag the
          // back plane to near-black and flatten the interior.
          detailTintHex: scaleHexColor(shopBackTintHex, 0.52),
          uvProjection: "world",
        });
      }
      pushInstance(instances, {
        placementId: `${placement.id}:interior-ceiling`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_interior_ceiling",
        meshId: "shop_recess_back",
        position: offsetPosition(
          { ...center, y: center.y + interiorHeightM * 0.5 },
          placement.face,
          0,
          interiorMidInwardM,
        ),
        scale: { x: interiorWidthM, y: 0.06, z: recessDepthM },
        yawRad,
        detailMaterialId: "tm_shop_interior_lining",
      });
      pushInstance(instances, {
        placementId: `${placement.id}:interior-floor`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_interior_floor",
        meshId: "shop_recess_back",
        position: offsetPosition(
          { ...center, y: bottomY + 0.04 },
          placement.face,
          0,
          interiorMidInwardM,
        ),
        scale: { x: interiorWidthM, y: 0.08, z: recessDepthM },
        yawRad,
        detailMaterialId: "tm_shop_interior_lining",
      });
      if (experimentalVisualCutouts) {
        pushInstance(instances, {
          placementId: `${placement.id}:interior-hanging-textile`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_interior_hanging_goods",
          meshId: "awning_cloth",
          position: offsetPosition(
            { ...center, y: bottomY + 1.62 },
            placement.face,
            0,
            -recessDepthM + 0.075,
          ),
          scale: {
            x: 0.68 + shopVariant * 0.14,
            y: 0.07,
            z: 0.78 + shopVariant * 0.12,
          },
          yawRad,
          pitchRad: Math.PI * 0.5,
          detailTintHex: shopVariant < 0.34
            ? 0xb27b4f
            : shopVariant < 0.67
              ? 0x668b82
              : 0x9e6962,
        });
      }
      for (const side of [-1, 1] as const) {
        pushInstance(instances, {
          placementId: `${placement.id}:timber-surround:${side}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_timber_surround",
          meshId: "door_jamb",
          position: offsetPosition(
            center,
            placement.face,
            side * (halfW + SHOP_SURROUND_WIDTH_M * 0.5),
            surroundInwardM,
          ),
          scale: {
            x: SHOP_SURROUND_WIDTH_M,
            y: placement.sizeM.height + SHOP_SURROUND_WIDTH_M,
            z: surroundDepthM,
          },
          yawRad,
          trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopKitTintHex,
        });
      }
      pushInstance(instances, {
        placementId: `${placement.id}:timber-surround:header`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_timber_surround",
        meshId: "door_lintel",
        position: offsetPosition(
          center,
          placement.face,
          0,
          surroundInwardM,
          halfH + SHOP_SURROUND_WIDTH_M * 0.5,
        ),
        scale: {
          x: placement.sizeM.width + SHOP_SURROUND_WIDTH_M * 2,
          y: SHOP_SURROUND_WIDTH_M,
          z: surroundDepthM,
        },
        yawRad,
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: shopKitTintHex,
      });

      pushInstance(instances, {
        placementId: `${placement.id}:portal-sill`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_timber_portal_sill",
        meshId: "door_lintel",
        position: offsetPosition(
          { ...center, y: bottomY + 0.065 },
          placement.face,
          0,
          sillInwardM,
        ),
        scale: {
          x: placement.sizeM.width + SHOP_SURROUND_WIDTH_M * 2,
          y: 0.13,
          z: sillDepthM,
        },
        yawRad,
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: shopKitTintHex,
      });
      pushInstance(instances, {
        placementId: `${placement.id}:stone-threshold-joint`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_stone_threshold_joint",
        meshId: "door_lintel",
        position: offsetPosition(
          { ...center, y: bottomY + 0.035 },
          placement.face,
          0,
          -0.015,
        ),
        scale: {
          x: placement.sizeM.width + SHOP_SURROUND_WIDTH_M * 2.35,
          y: 0.07,
          z: 0.24,
        },
        yawRad,
        trimMaterialId: "ph_stone_trim_sandstone",
        uvProjection: "world",
      });
      for (const side of [-1, 1] as const) {
        pushInstance(instances, {
          placementId: `${placement.id}:portal-foot-plate:${side}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_portal_foot_plate",
          meshId: "awning_bracket",
          position: offsetPosition(
            { ...center, y: bottomY + 0.12 },
            placement.face,
            side * (halfW + SHOP_SURROUND_WIDTH_M * 0.5),
            0.07,
          ),
          scale: { x: 0.18, y: 0.24, z: 0.12 },
          yawRad,
        });
      }
      const counterHeightM = experimentalVisualCutouts
        ? shopVariant < 0.34
          ? 0.5
          : shopVariant < 0.67
            ? 0.56
            : 0.62
        : shopVariant < 0.34
          ? 0.62
          : shopVariant < 0.67
            ? 0.75
          : 0.86;
      const counterWidthFactor = experimentalVisualCutouts
        ? 0.7 + shopVariant * 0.12
        : 0.8 + shopVariant * 0.1;
      // A bay serves one function. Where a stall is seated in this recess the
      // bay is the stall's alcove, so it must not also render its own counter,
      // shelving, display posts, stock and shutters competing with it.
      if (!stallSeated) {
      pushInstance(instances, {
        placementId: `${placement.id}:counter-front`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_counter",
        meshId: "shop_counter",
        position: offsetPosition(
          { ...center, y: bottomY + counterHeightM * 0.5 },
          placement.face,
          0,
          experimentalVisualCutouts ? -0.045 : 0.38,
        ),
        scale: {
          x: placement.sizeM.width * counterWidthFactor,
          y: counterHeightM,
          z: 0.17,
        },
        yawRad,
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: shopKitTintHex,
      });
      const counterJoineryOffsets = shopVariant < 0.5 ? [-0.62, 0, 0.62] : [-0.48, 0.48];
      for (const along of counterJoineryOffsets) {
        pushInstance(instances, {
          placementId: `${placement.id}:counter-plank:${along}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_counter_joinery",
          meshId: "door_jamb",
          position: offsetPosition(
            { ...center, y: bottomY + counterHeightM * 0.5 },
            placement.face,
            along,
            experimentalVisualCutouts ? 0.055 : 0.505,
          ),
          scale: { x: 0.075, y: counterHeightM * 0.82, z: 0.07 },
          yawRad,
          trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopKitTintHex,
        });
      }
      pushInstance(instances, {
        placementId: `${placement.id}:counter-bottom-rail`,
        moduleId: placement.moduleId,
        semanticClass: "merchant_counter_joinery",
        meshId: "door_lintel",
        position: offsetPosition(
          { ...center, y: bottomY + 0.085 },
          placement.face,
          0,
          experimentalVisualCutouts ? 0.055 : 0.505,
        ),
        scale: { x: placement.sizeM.width * 0.86, y: 0.08, z: 0.07 },
        yawRad,
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: shopKitTintHex,
      });
      pushInstance(instances, {
        placementId: `${placement.id}:counter-top`,
        moduleId: placement.moduleId,
        semanticClass: experimentalVisualCutouts ? baySemantic : "merchant_counter",
        meshId: "shop_counter",
        position: offsetPosition(
          { ...center, y: bottomY + counterHeightM + 0.05 },
          placement.face,
          0,
          experimentalVisualCutouts ? -0.08 : 0.35,
        ),
        scale: {
          x: placement.sizeM.width * (0.9 + shopVariant * 0.08),
          y: 0.1,
          z: experimentalVisualCutouts ? 0.3 : 0.48,
        },
        yawRad,
        trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
        detailTintHex: shopKitTintHex,
        ...(experimentalVisualCutouts
          ? { visualQaDimensions: { x: interiorWidthM, y: interiorHeightM, z: recessDepthM } }
          : {}),
      });
      const foregroundStock = shopVariant < 0.34
        ? [
          { along: -0.28, meshId: "merchant_goods_basket" as const, size: { x: 0.42, y: 0.34, z: 0.38 } },
          { along: 0.18, meshId: "merchant_goods_pot" as const, size: { x: 0.34, y: 0.43, z: 0.34 } },
        ]
        : shopVariant < 0.67
          ? [
            { along: -0.2, meshId: "merchant_goods_pot" as const, size: { x: 0.36, y: 0.46, z: 0.36 } },
            { along: 0.27, meshId: "merchant_goods_basket" as const, size: { x: 0.44, y: 0.32, z: 0.4 } },
          ]
          : [
            { along: -0.3, meshId: "merchant_goods_basket" as const, size: { x: 0.4, y: 0.3, z: 0.36 } },
            { along: 0.02, meshId: "merchant_goods_pot" as const, size: { x: 0.32, y: 0.4, z: 0.32 } },
            { along: 0.31, meshId: "merchant_goods_basket" as const, size: { x: 0.34, y: 0.27, z: 0.33 } },
          ];
      for (const [index, stock] of foregroundStock.entries()) {
        pushInstance(instances, {
          placementId: `${placement.id}:counter-stock:${index + 1}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_generic_counter_stock",
          meshId: stock.meshId,
          position: offsetPosition(
            { ...center, y: bottomY + counterHeightM + 0.1 + stock.size.y * 0.5 },
            placement.face,
            stock.along * placement.sizeM.width,
            experimentalVisualCutouts ? -0.07 : 0.31,
          ),
          scale: stock.size,
          yawRad: yawRad + (index - 0.5) * 0.055,
          trimMaterialId: stock.meshId === "merchant_goods_pot"
            ? profile.materialSlots.trim
            : MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: stock.meshId === "merchant_goods_pot"
            ? shopVariant < 0.5 ? 0x74958b : 0xb27b5c
            : shopKitTintHex,
          uvProjection: "world",
        });
      }
      }
      // The alcove still stocks the stall it houses: shelving and stored goods
      // stay so the bay reads as an occupied merchant space rather than an
      // empty void behind the stall.
      const shelfElevationsM = (experimentalVisualCutouts ? [1.18, 1.72] : [1.16, 1.72])
        .filter((elevationM) => elevationM < placement.sizeM.height - 0.3);
      for (const [index, shelfElevationM] of shelfElevationsM.entries()) {
        pushInstance(instances, {
          placementId: `${placement.id}:interior-shelf:${index + 1}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_interior_shelf",
          meshId: "shop_counter",
          position: offsetPosition(
            { ...center, y: bottomY + shelfElevationM },
            placement.face,
            0,
            rearFixtureInwardM,
          ),
          scale: { x: placement.sizeM.width * (0.62 + shopVariant * 0.12), y: 0.065, z: 0.25 },
          yawRad,
          trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopKitTintHex,
        });
      }
      if (experimentalVisualCutouts) {
        const stockLayouts: Array<{
          alongM: number;
          shelfM: number;
          widthM: number;
          heightM: number;
          depthM: number;
          meshId: "merchant_goods_pot" | "merchant_goods_basket" | "merchant_goods_folded_textile";
          materialKind: "stone" | "timber" | "cloth";
        }> = shopVariant < 0.5
          ? [
            { alongM: -0.52, shelfM: 1.18, widthM: 0.42, heightM: 0.38, depthM: 0.38, meshId: "merchant_goods_basket", materialKind: "timber" },
            { alongM: -0.05, shelfM: 1.18, widthM: 0.42, heightM: 0.25, depthM: 0.34, meshId: "merchant_goods_folded_textile", materialKind: "cloth" },
            { alongM: 0.5, shelfM: 1.18, widthM: 0.4, heightM: 0.46, depthM: 0.4, meshId: "merchant_goods_pot", materialKind: "stone" },
            { alongM: -0.3, shelfM: 1.72, widthM: 0.34, heightM: 0.4, depthM: 0.34, meshId: "merchant_goods_pot", materialKind: "stone" },
            { alongM: 0.28, shelfM: 1.72, widthM: 0.46, heightM: 0.32, depthM: 0.4, meshId: "merchant_goods_basket", materialKind: "timber" },
          ]
          : [
            { alongM: -0.48, shelfM: 1.18, widthM: 0.46, heightM: 0.27, depthM: 0.36, meshId: "merchant_goods_folded_textile", materialKind: "cloth" },
            { alongM: 0.02, shelfM: 1.18, widthM: 0.44, heightM: 0.34, depthM: 0.4, meshId: "merchant_goods_basket", materialKind: "timber" },
            { alongM: 0.48, shelfM: 1.18, widthM: 0.38, heightM: 0.44, depthM: 0.38, meshId: "merchant_goods_pot", materialKind: "stone" },
            { alongM: -0.34, shelfM: 1.72, widthM: 0.42, heightM: 0.3, depthM: 0.36, meshId: "merchant_goods_basket", materialKind: "timber" },
            { alongM: 0.3, shelfM: 1.72, widthM: 0.44, heightM: 0.26, depthM: 0.36, meshId: "merchant_goods_folded_textile", materialKind: "cloth" },
          ];
        for (const [index, stock] of stockLayouts.entries()) {
          pushInstance(instances, {
            placementId: `${placement.id}:interior-stock:${index + 1}`,
            moduleId: placement.moduleId,
            semanticClass: "merchant_interior_stock",
            meshId: stock.meshId,
            position: offsetPosition(
              { ...center, y: bottomY + stock.shelfM + 0.033 + stock.heightM * 0.5 },
              placement.face,
              stock.alongM,
              rearFixtureInwardM + 0.02,
            ),
            scale: { x: stock.widthM, y: stock.heightM, z: stock.depthM },
            yawRad: yawRad + (index - 1) * 0.035,
            // Stock sits on the shelves, deepest in the room, so it takes the
            // same interior shading as the joinery around it. Left at its
            // authored exterior values it was the brightest thing in the bay
            // and single-handedly held the opening's upper percentiles up.
            ...(stock.materialKind === "cloth"
              ? {
                detailTintHex: scaleHexColor(
                  index % 2 === 0 ? 0xb9835e : 0x6f9188,
                  INTERIOR_SHADE,
                ),
              }
              : {
                trimMaterialId: stock.materialKind === "stone"
                  ? profile.materialSlots.trim
                  : MERCHANT_TIMBER_MATERIAL_ID,
                detailTintHex: stock.materialKind === "stone"
                  ? scaleHexColor(index % 2 === 0 ? 0xa66f4d : 0x668b83, INTERIOR_SHADE)
                  : shopKitTintHex,
                uvProjection: "world" as const,
              }),
          });
        }
      }
      const shelfUprightHeightM = Math.max(0.45, placement.sizeM.height - counterHeightM - 0.48);
      const shelfSupportOffsets = shopVariant < 0.5 ? [-0.34, 0.34] : [-0.28, 0, 0.28];
      for (const normalizedOffset of shelfSupportOffsets) {
        pushInstance(instances, {
          placementId: `${placement.id}:interior-shelf-upright:${normalizedOffset}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_interior_shelf_support",
          meshId: "door_jamb",
          position: offsetPosition(
            { ...center, y: bottomY + counterHeightM + shelfUprightHeightM * 0.5 },
            placement.face,
            normalizedOffset * placement.sizeM.width,
            experimentalVisualCutouts ? rearFixtureInwardM + 0.02 : 0.16,
          ),
          scale: { x: 0.055, y: shelfUprightHeightM, z: 0.06 },
          yawRad,
          trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopKitTintHex,
        });
      }
      // Stock spilling out of the shop and onto the pier beside it. Every
      // merchant bay stopped dead at its own opening: all the goods lived
      // behind the counter or on interior shelving, so the lane read as a row
      // of holes in a clean wall instead of a working market street. The
      // reference elevation's defining feature is the unbroken band of
      // amphorae, crates, sacks and baskets standing against the wall between
      // one shopfront and the next, and that band is what was missing.
      //
      // The whole group is measured outward from the opening edge and capped
      // at 0.8 m along the wall and 0.46 m off its face — inside the reach the
      // counter front already occupies — so it dresses the wall base without
      // touching the walking envelope or narrowing the lane.
      const streetStockSide: -1 | 1 = stableUnitInterval(`${placement.id}:street-stock-side`) < 0.5
        ? -1
        : 1;
      const streetStockUnit = stableUnitInterval(`${placement.id}:street-stock`);
      const streetStockEdgeM = placement.sizeM.width * 0.5 + 0.12;
      const streetStock: Array<{
        outM: number;
        inwardM: number;
        baseM: number;
        meshId: "shop_counter" | "merchant_goods_pot" | "merchant_goods_basket" | "merchant_goods_folded_textile";
        size: { x: number; y: number; z: number };
        kind: "timber" | "stone" | "cloth";
      }> = [
        // A low timber stand keeps the tall jars off wet paving, and reads as
        // the reason they are standing in a row rather than scattered.
        { outM: 0.34, inwardM: 0.26, baseM: 0, meshId: "shop_counter", size: { x: 0.66, y: 0.13, z: 0.44 }, kind: "timber" },
        { outM: 0.2, inwardM: 0.24, baseM: 0.13, meshId: "merchant_goods_pot", size: { x: 0.3, y: 0.44 + streetStockUnit * 0.06, z: 0.3 }, kind: "stone" },
        { outM: 0.47, inwardM: 0.3, baseM: 0.13, meshId: "merchant_goods_pot", size: { x: 0.25, y: 0.33, z: 0.25 }, kind: "stone" },
        // Crates stacked against the pier, with folded stock weighted on top.
        { outM: 0.68, inwardM: 0.24, baseM: 0, meshId: "shop_counter", size: { x: 0.4, y: 0.34, z: 0.38 }, kind: "timber" },
        { outM: 0.65, inwardM: 0.2, baseM: 0.34, meshId: "shop_counter", size: { x: 0.34, y: 0.26, z: 0.32 }, kind: "timber" },
        { outM: 0.66, inwardM: 0.19, baseM: 0.6, meshId: "merchant_goods_folded_textile", size: { x: 0.3, y: 0.14, z: 0.28 }, kind: "cloth" },
        // One basket tucked into the opening's outside corner ties the group
        // back to the shopfront it belongs to.
        { outM: 0.04, inwardM: 0.34, baseM: 0, meshId: "merchant_goods_basket", size: { x: 0.34, y: 0.28, z: 0.32 }, kind: "timber" },
      ];
      for (const [index, stock] of streetStock.entries()) {
        pushInstance(instances, {
          placementId: `${placement.id}:street-stock:${index + 1}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_generic_street_stock",
          meshId: stock.meshId,
          position: offsetPosition(
            { ...center, y: bottomY + stock.baseM + stock.size.y * 0.5 },
            placement.face,
            streetStockSide * (streetStockEdgeM + stock.outM),
            stock.inwardM,
          ),
          scale: stock.size,
          yawRad: yawRad + (index % 3 - 1) * (0.04 + streetStockUnit * 0.05),
          ...(stock.kind === "cloth"
            ? { detailTintHex: streetStockUnit < 0.5 ? 0xb9835e : 0x6f9188 }
            : {
              trimMaterialId: stock.kind === "stone"
                ? profile.materialSlots.trim
                : MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: stock.kind === "stone"
                ? (index % 2 === 0 ? 0xa66f4d : 0x8d7a5a)
                : shopKitTintHex,
              uvProjection: "world" as const,
            }),
        });
      }
      // The display frontage is the shopfront the stall replaces, so it stays
      // suppressed where a stall is seated in the bay.
      if (!stallSeated) {
      const displayPostBottomM = counterHeightM + 0.12;
      const displayHeaderM = placement.sizeM.height - 0.28;
      const displayPostHeightM = displayHeaderM - displayPostBottomM;
      const displayPostOffsets = shopVariant < 0.5 ? [-0.68, 0.68] : [-0.54, 0.54];
      for (const along of displayPostOffsets) {
        pushInstance(instances, {
          placementId: `${placement.id}:display-post:${along}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_display_frame",
          meshId: "door_jamb",
          position: offsetPosition(
            { ...center, y: bottomY + displayPostBottomM + displayPostHeightM * 0.5 },
            placement.face,
            along,
            experimentalVisualCutouts ? -0.025 : 0.4,
          ),
          scale: { x: 0.085, y: displayPostHeightM, z: 0.1 },
          yawRad,
          trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopKitTintHex,
        });
      }
      const displayRailHeightsM = experimentalVisualCutouts ? [displayHeaderM] : [1.5, displayHeaderM];
      for (const displayHeightM of displayRailHeightsM) {
        pushInstance(instances, {
          placementId: `${placement.id}:display-rail:${displayHeightM}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_display_frame",
          meshId: "door_lintel",
          position: offsetPosition(
            { ...center, y: bottomY + displayHeightM },
            placement.face,
            0,
            experimentalVisualCutouts ? -0.025 : 0.4,
          ),
          scale: { x: placement.sizeM.width * (0.62 + shopVariant * 0.1), y: 0.075, z: 0.12 },
          yawRad,
          trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopKitTintHex,
        });
      }
      const shutterHeightM = Math.max(1.05, placement.sizeM.height - counterHeightM - 0.7);
      const shutterState = stableUnitInterval(`${placement.id}:shop-shutter-state`);
      const shopShutterTintHex = shopVariant < 0.34
        ? 0xa57150
        : shopVariant < 0.67
          ? 0x638f80
          : 0x9d8657;
      for (const side of [-1, 1] as const) {
        const shopShutterAngleRad = shutterState < 0.33
          ? side === -1 ? 0.18 : 0.58
          : shutterState < 0.67
            ? side === -1 ? 0.54 : 0.22
            : 0.34 + side * 0.04;
        const variedShutterAngleRad = shopShutterAngleRad + shutterState * 0.055;
        const shutterWidthM = shutterState < 0.33
          ? side === -1 ? 0.46 : 0.58
          : shutterState < 0.67
            ? side === -1 ? 0.58 : 0.45
            : 0.52;
        const variedShutterWidthM = shutterWidthM * (0.96 + shutterState * 0.07);
        pushInstance(instances, {
          placementId: `${placement.id}:shop-shutter:${side}`,
          moduleId: placement.moduleId,
          semanticClass: "merchant_louvered_shutter",
          meshId: "window_shutter",
          position: offsetPosition(
            { ...center, y: bottomY + counterHeightM + 0.1 + shutterHeightM * 0.5 },
            placement.face,
            side * (halfW + 0.31),
            experimentalVisualCutouts ? 0.04 : 0.3,
          ),
          scale: { x: variedShutterWidthM, y: shutterHeightM, z: 0.1 },
          yawRad: yawRad + side * variedShutterAngleRad,
          detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: shopShutterTintHex,
        });
      }
      }
      pushSupportedAwning(
        placement,
        instances,
        center,
        yawRad,
        MERCHANT_TIMBER_MATERIAL_ID,
      );
      return;
    }
    case "door":
      pushDoor(
        placement,
        instances,
        doorModelPlacements,
        center,
        yawRad,
        profile.family === "active_merchant"
          ? MERCHANT_TIMBER_MATERIAL_ID
          : profile.family === "quiet_residential"
            ? profile.materialSlots.timber
            : profile.materialSlots.trim,
        profile.family,
        fortifiedDoorModelAvailable,
        experimentalVisualCutouts,
      );
      return;
    case "window":
      pushWindow(placement, instances, center, yawRad, profile, experimentalVisualCutouts);
      return;
    default:
      pushSimpleModule(
        placement,
        instances,
        center,
        yawRad,
        materialId,
        profile.materialSlots.wall,
        profile.materialSlots.trim,
        experimentalVisualCutouts,
      );
  }
}

function pointInRect(zone: RuntimeBlockoutZone, x: number, z: number): boolean {
  return x >= zone.rect.x && x <= zone.rect.x + zone.rect.w
    && z >= zone.rect.y && z <= zone.rect.y + zone.rect.h;
}

function pushElevationFoundations(
  surfaces: readonly RuntimeTraversalSurface[],
  instances: WallDetailInstance[],
): void {
  for (const surface of surfaces) {
    if (surface.kind === "flat") {
      if (surface.elevationM <= MIN_DIMENSION_M) continue;
      pushInstance(instances, {
        placementId: `ELEVATION_FOUNDATION:${surface.id}`,
        moduleId: "elevation_foundation",
        semanticClass: "terrace_retaining_mass",
        meshId: "facade_wall_shell",
        position: {
          x: surface.rect.x + surface.rect.w * 0.5,
          y: surface.elevationM * 0.5,
          z: surface.rect.y + surface.rect.h * 0.5,
        },
        scale: {
          x: surface.rect.w,
          y: surface.elevationM,
          z: surface.rect.h,
        },
        yawRad: 0,
        wallMaterialId: ELEVATION_FOUNDATION_MATERIAL_ID,
      });
      continue;
    }

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
      pushInstance(instances, {
        placementId: `ELEVATION_FOUNDATION:${surface.id}:${index + 1}`,
        moduleId: "elevation_foundation",
        semanticClass: "ramp_foundation",
        meshId: "facade_wall_shell",
        position: { x, y: height * 0.5, z },
        scale: surface.axis === "x"
          ? { x: width + 0.01, y: height, z: depth - RAMP_RETAINING_CHEEK_WIDTH_M * 2 }
          : { x: width - RAMP_RETAINING_CHEEK_WIDTH_M * 2, y: height, z: depth + 0.01 },
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
        pushInstance(instances, {
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
        });
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
      pushInstance(instances, {
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
      });
    }
  }
}

/**
 * The lane-spanning Rug Gate is authored from the RUG_GATE facade bay, while
 * the sealed wall visible through it sits at Spawn B's north perimeter. Keep
 * this render-only closure on those two grammar datums: the gate bay supplies
 * its centered width and the courtyard supplies the grounded perimeter plane.
 * It deliberately does not alter segmentHeights, massing, or collision.
 */
function pushRugGateCrownBackdrop(
  zones: readonly RuntimeBlockoutZone[],
  placements: readonly V3ArchitecturePlacement[],
  instances: WallDetailInstance[],
): void {
  const gateZone = zones.find((zone) => zone.id === RUG_GATE_ZONE_ID);
  const backdropZone = zones.find((zone) => zone.id === RUG_GATE_BACKDROP_ZONE_ID);
  if (!gateZone || !backdropZone) return;

  const rugMassing = placements.find(
    (placement): placement is V3ArchitectureMassingPlacement => (
      placement.kind === "massing" && placement.zoneId === RUG_GATE_ZONE_ID
    ),
  );
  if (!rugMassing) return;

  const widthM = gateZone.rect.w + RUG_GATE_BACKDROP_MARGIN_M * 2;
  const centerX = gateZone.rect.x + gateZone.rect.w * 0.5;
  const northPerimeterZ = backdropZone.rect.y + backdropZone.rect.h;
  // Three overlapping, grounded facade planes replace the former single flat
  // terminal card. Their centers stay beyond the sealed z92 perimeter, while
  // shallow render-only depths bring the dressed faces just in front of the
  // collision-backed wall. Widths, offsets, and heights derive from the gate
  // span, producing lateral framing and warm depth separation without opening
  // the boundary or placing anything in the playable portal.
  const vistaPlanes = [
    {
      suffix: "west",
      x: centerX - widthM * 0.34,
      z: northPerimeterZ + 0.1,
      width: widthM * 0.34,
      height: RUG_GATE_BACKDROP_HEIGHT_M + 0.35,
      depth: 0.24,
      wallMaterialId: "ph_worn_plaster_ochre",
    },
    {
      suffix: "mid-return",
      x: centerX - widthM * 0.13,
      z: northPerimeterZ + 0.24,
      width: widthM * 0.09,
      height: RUG_GATE_BACKDROP_HEIGHT_M - 1.7,
      depth: 0.62,
      wallMaterialId: "ph_sandstone_blocks_06",
    },
    {
      suffix: "east",
      x: centerX + widthM * 0.34,
      z: northPerimeterZ + 0.13,
      width: widthM * 0.34,
      height: RUG_GATE_BACKDROP_HEIGHT_M + 0.8,
      depth: 0.28,
      wallMaterialId: "ph_worn_plaster_sun",
    },
  ] as const;
  for (const plane of vistaPlanes) {
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:vista-plane:${plane.suffix}`,
      moduleId: "rug_gate_out_of_bounds_market_vista",
      semanticClass: "out_of_bounds_grounded_vista_plane",
      meshId: "facade_wall_shell",
      position: { x: plane.x, y: plane.height * 0.5, z: plane.z },
      scale: { x: plane.width, y: plane.height, z: plane.depth },
      yawRad: 0,
      wallMaterialId: plane.wallMaterialId,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:vista-plinth:${plane.suffix}`,
      moduleId: "rug_gate_out_of_bounds_market_vista",
      semanticClass: "out_of_bounds_grounded_vista_plinth",
      meshId: "plinth_strip",
      position: { x: plane.x, y: 0.12, z: northPerimeterZ + 0.025 },
      scale: { x: plane.width + 0.12, y: 0.24, z: 0.18 },
      yawRad: 0,
      trimMaterialId: "ph_stone_trim_sandstone",
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:vista-coping:${plane.suffix}`,
      moduleId: "rug_gate_out_of_bounds_market_vista",
      semanticClass: "out_of_bounds_market_vista_coping",
      meshId: "roof_slab",
      position: { x: plane.x, y: plane.height + 0.1, z: plane.z },
      scale: { x: plane.width + 0.2, y: 0.2, z: plane.depth + 0.18 },
      yawRad: 0,
      trimMaterialId: "ph_stone_trim_sandstone",
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:vista-course:${plane.suffix}`,
      moduleId: "rug_gate_out_of_bounds_market_vista",
      semanticClass: "out_of_bounds_market_vista_story_course",
      meshId: "plinth_strip",
      position: { x: plane.x, y: plane.height * 0.63, z: northPerimeterZ + 0.02 },
      scale: { x: plane.width, y: 0.16, z: 0.16 },
      yawRad: 0,
      trimMaterialId: "ph_stone_trim_sandstone",
      uvProjection: "world",
    });
  }

  // The centered passage sits on the nearest of the out-of-bounds planes.
  // Its dark back and frame faces are pulled a few centimeters in front of the
  // sealed render wall, preserving collision while reading as the next market
  // arch instead of the former pale kiosk card.
  const nestedArchCenterX = centerX + widthM * 0.055;
  const nestedArchWidthM = Math.min(3.2, widthM * 0.27);
  pushInstance(instances, {
    placementId: "ARCH_RUG_GATE_CROWN_BACKDROP:arcade-shadow",
    moduleId: "rug_gate_grounded_crown_backdrop",
    semanticClass: "sealed_backdrop_arcade_shadow",
    meshId: "shop_recess_back",
    position: {
      x: nestedArchCenterX,
      y: RUG_GATE_BACKDROP_ARCH_HEIGHT_M * 0.35,
      z: northPerimeterZ + 0.085,
    },
    scale: { x: nestedArchWidthM * 0.78, y: RUG_GATE_BACKDROP_ARCH_HEIGHT_M * 0.7, z: 0.19 },
    yawRad: 0,
    detailMaterialId: "tm_shop_interior_shadow",
  });
  pushInstance(instances, {
    placementId: "ARCH_RUG_GATE_CROWN_BACKDROP:arcade-frame",
    moduleId: "rug_gate_grounded_crown_backdrop",
    semanticClass: "sealed_backdrop_pointed_arcade",
    meshId: "arch_pointed_frame",
    position: {
      x: nestedArchCenterX,
      y: RUG_GATE_BACKDROP_ARCH_HEIGHT_M * 0.42,
      z: northPerimeterZ + 0.02,
    },
    scale: { x: nestedArchWidthM, y: RUG_GATE_BACKDROP_ARCH_HEIGHT_M * 0.78, z: 0.2 },
    yawRad: 0,
    detailMaterialId: "ph_stone_trim_sandstone",
    uvProjection: "world",
  });
  for (const side of [-1, 1] as const) {
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:arcade-pier:${side}`,
      moduleId: "rug_gate_grounded_crown_backdrop",
      semanticClass: "sealed_backdrop_arcade_pier",
      meshId: "corner_pier",
      position: {
        x: nestedArchCenterX + side * nestedArchWidthM * 0.39,
        y: RUG_GATE_BACKDROP_ARCH_HEIGHT_M * 0.22,
        z: northPerimeterZ + 0.015,
      },
      scale: { x: 0.28, y: RUG_GATE_BACKDROP_ARCH_HEIGHT_M * 0.44, z: 0.28 },
      yawRad: 0,
      wallMaterialId: "ph_sandstone_blocks_05",
    });
  }
  pushInstance(instances, {
    placementId: "ARCH_RUG_GATE_CROWN_BACKDROP:arcade-threshold",
    moduleId: "rug_gate_grounded_crown_backdrop",
    semanticClass: "sealed_backdrop_arcade_threshold",
    meshId: "plinth_strip",
    position: { x: nestedArchCenterX, y: 0.08, z: northPerimeterZ + 0.018 },
    scale: { x: nestedArchWidthM + 0.32, y: 0.16, z: 0.24 },
    yawRad: 0,
    trimMaterialId: "ph_stone_trim_sandstone",
    uvProjection: "world",
  });

  // Two subordinate closed doors give the side planes a market function and
  // keep the composition laterally framed. A recessed back remains behind the
  // modeled leaves, but the route view never terminates in unresponsive black
  // cards: jambs, lintels, thresholds, and joinery own the silhouette.
  for (const side of [-1, 1] as const) {
    const doorCenterX = centerX + side * widthM * 0.3;
    const doorWidthM = 1.55;
    const doorHeightM = 2.65;
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:side-recess:${side}`,
      moduleId: "rug_gate_out_of_bounds_market_vista",
      semanticClass: "out_of_bounds_market_shop_recess",
      meshId: "arch_recess_back",
      position: {
        x: doorCenterX,
        y: 1.48,
        z: northPerimeterZ + 0.03,
      },
      scale: { x: doorWidthM, y: doorHeightM, z: 0.12 },
      yawRad: 0,
      detailMaterialId: "tm_shop_interior_shadow",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:side-door-leaf:${side}`,
      moduleId: "rug_gate_out_of_bounds_closed_door",
      semanticClass: "sealed_backdrop_planked_door_leaf",
      meshId: "door_panel_storage",
      position: { x: doorCenterX, y: 1.43, z: northPerimeterZ - 0.025 },
      scale: { x: doorWidthM - 0.18, y: doorHeightM - 0.22, z: 0.11 },
      yawRad: 0,
      detailMaterialId: "ph_rough_pine_door",
      detailTintHex: side === -1 ? 0x846047 : 0x765741,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:side-door-stile:${side}`,
      moduleId: "rug_gate_out_of_bounds_closed_door",
      semanticClass: "sealed_backdrop_door_joinery",
      meshId: "door_jamb",
      position: { x: doorCenterX, y: 1.43, z: northPerimeterZ - 0.095 },
      scale: { x: 0.075, y: doorHeightM - 0.35, z: 0.07 },
      yawRad: 0,
      trimMaterialId: "ph_rough_pine_door",
      detailTintHex: 0x9b7655,
      uvProjection: "world",
    });
    for (const jambSide of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:side-door-jamb:${side}:${jambSide}`,
        moduleId: "rug_gate_out_of_bounds_closed_door",
        semanticClass: "sealed_backdrop_door_surround",
        meshId: "door_jamb",
        position: {
          x: doorCenterX + jambSide * (doorWidthM * 0.5 + 0.075),
          y: 1.48,
          z: northPerimeterZ - 0.08,
        },
        scale: { x: 0.15, y: doorHeightM + 0.2, z: 0.16 },
        yawRad: 0,
        trimMaterialId: "ph_stone_trim_sandstone",
        uvProjection: "world",
      });
    }
    for (const [role, y] of [["threshold", 0.09], ["lintel", doorHeightM + 0.24]] as const) {
      pushInstance(instances, {
        placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:side-door-${role}:${side}`,
        moduleId: "rug_gate_out_of_bounds_closed_door",
        semanticClass: role === "threshold"
          ? "sealed_backdrop_door_threshold"
          : "sealed_backdrop_door_surround",
        meshId: "door_lintel",
        position: { x: doorCenterX, y, z: northPerimeterZ - 0.08 },
        scale: { x: doorWidthM + 0.28, y: role === "threshold" ? 0.18 : 0.2, z: 0.2 },
        yawRad: 0,
        trimMaterialId: "ph_stone_trim_sandstone",
        uvProjection: "world",
      });
    }
  }

  // A centered upper mass and two asymmetric side masses are fully out of
  // bounds and grounded at y=0. Their front faces step behind the sealed wall,
  // giving the through-arch vista real parallax and a layered roofline.
  const backdropMasses = [
    {
      suffix: "center",
      x: centerX,
      width: widthM * 0.48,
      height: 9.2,
      depth: RUG_GATE_BACKDROP_UPPER_DEPTH_M,
      z: northPerimeterZ + 3.1,
      wallMaterialId: "ph_sandstone_blocks_06",
    },
    {
      suffix: "west",
      x: centerX - widthM * 0.37,
      width: widthM * 0.25,
      height: 7.1,
      depth: 2.4,
      z: northPerimeterZ + 1.9,
      wallMaterialId: "ph_worn_plaster_ochre",
    },
    {
      suffix: "east",
      x: centerX + widthM * 0.37,
      width: widthM * 0.25,
      height: 7.7,
      depth: 2.2,
      z: northPerimeterZ + 2.5,
      wallMaterialId: "ph_worn_plaster_sun",
    },
  ] as const;
  for (const mass of backdropMasses) {
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:upper-mass:${mass.suffix}`,
      moduleId: "rug_gate_out_of_bounds_market_mass",
      semanticClass: "out_of_bounds_grounded_market_mass",
      meshId: "facade_wall_shell",
      position: {
        x: mass.x,
        y: mass.height * 0.5,
        z: mass.z,
      },
      scale: { x: mass.width, y: mass.height, z: mass.depth },
      yawRad: 0,
      wallMaterialId: mass.wallMaterialId,
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_CROWN_BACKDROP:upper-coping:${mass.suffix}`,
      moduleId: "rug_gate_out_of_bounds_market_mass",
      semanticClass: "out_of_bounds_market_coping",
      meshId: "roof_slab",
      position: {
        x: mass.x,
        y: mass.height + 0.08,
        z: mass.z,
      },
      scale: { x: mass.width + 0.18, y: 0.16, z: mass.depth + 0.18 },
      yawRad: 0,
      trimMaterialId: "ph_stone_trim_sandstone",
      uvProjection: "world",
    });
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

/**
 * Tie the procedural Rug Gate landmark into the authored wall system without
 * introducing a second gable profile. The canonical crown owns the raking
 * bargeboards and apex; this seam supplies only backed wall returns, return
 * copings, terminal quoins, and grounded inner-pier plinths. The landmark
 * footprint and collision stay untouched.
 */
function pushRugGateStructuralFinish(
  zones: readonly RuntimeBlockoutZone[],
  placements: readonly V3ArchitecturePlacement[],
  instances: WallDetailInstance[],
): void {
  const gateZone = zones.find((zone) => zone.id === RUG_GATE_ZONE_ID);
  const gateMassings = placements.filter(
    (placement): placement is V3ArchitectureMassingPlacement => (
      placement.kind === "massing" && placement.zoneId === RUG_GATE_ZONE_ID
    ),
  );
  const materialOwner = gateMassings.find((placement) => placement.face === "west")
    ?? gateMassings[0];
  if (!gateZone || !materialOwner) return;

  const centerX = gateZone.rect.x + gateZone.rect.w * 0.5;
  const centerZ = gateZone.rect.y + gateZone.rect.h - RUG_GATE_HERO_RECESS_FROM_NORTH_M;
  const halfSpanM = gateZone.rect.w * 0.5;
  const roofDatumM = Math.max(...gateMassings.map((placement) => placement.roof.elevationM));
  const apexY = roofDatumM - 0.2;
  const shoulderY = Math.min(
    apexY - 0.8,
    Math.max(RUG_GATE_BACKDROP_ARCH_HEIGHT_M, roofDatumM * 0.62),
  );
  const frontZ = centerZ - RUG_GATE_HERO_FRONT_DEPTH_M;
  const trimMaterialId = materialOwner.materialSlots.trim;
  const innerFrameWidthM = Math.min(
    RUG_GATE_INNER_FRAME_MAX_WIDTH_M,
    gateZone.rect.w * 0.5,
  );
  const innerPierCenterOffsetM = innerFrameWidthM * RUG_GATE_INNER_FRAME_PIER_CENTER_RATIO;

  for (const side of [-1, 1] as const) {
    const returnDepthM = gateZone.rect.y + gateZone.rect.h - centerZ;
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_STRUCTURAL_FINISH:wall-return:${side}`,
      moduleId: "rug_gate_constructed_eave_junction",
      semanticClass: "hero_gate_backed_wall_return",
      meshId: "facade_wall_shell",
      position: {
        x: centerX + side * (halfSpanM - 0.16),
        y: shoulderY * 0.5,
        z: centerZ + returnDepthM * 0.5,
      },
      scale: { x: 0.38, y: shoulderY, z: returnDepthM },
      yawRad: 0,
      wallMaterialId: materialOwner.materialSlots.wall,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_STRUCTURAL_FINISH:wall-return-coping:${side}`,
      moduleId: "rug_gate_constructed_eave_junction",
      semanticClass: "hero_gate_wall_return_coping",
      meshId: "roof_slab",
      position: {
        x: centerX + side * (halfSpanM - 0.16),
        y: shoulderY + RUG_GATE_GABLE_TRIM_HEIGHT_M * 0.5,
        z: centerZ + returnDepthM * 0.5,
      },
      scale: { x: 0.58, y: RUG_GATE_GABLE_TRIM_HEIGHT_M, z: returnDepthM + 0.18 },
      yawRad: 0,
      detailMaterialId: trimMaterialId,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_STRUCTURAL_FINISH:terminal-quoin:${side}`,
      moduleId: "rug_gate_constructed_eave_junction",
      semanticClass: "hero_gate_backed_terminal_quoin",
      meshId: "corner_pier",
      position: {
        x: centerX + side * (halfSpanM - 0.16),
        y: shoulderY * 0.5,
        z: frontZ + 0.02,
      },
      scale: { x: 0.38, y: shoulderY, z: 0.44 },
      yawRad: 0,
      wallMaterialId: materialOwner.materialSlots.wall,
      trimMaterialId,
      uvProjection: "world",
    });
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_STRUCTURAL_FINISH:inner-pier-plinth:${side}`,
      moduleId: "rug_gate_constructed_pier_foundation",
      semanticClass: "hero_gate_inner_pier_plinth",
      meshId: "plinth_strip",
      position: {
        x: centerX + side * innerPierCenterOffsetM,
        y: RUG_GATE_INNER_PIER_PLINTH_HEIGHT_M * 0.5,
        z: frontZ - 0.04,
      },
      scale: {
        x: RUG_GATE_INNER_PIER_PLINTH_WIDTH_M,
        y: RUG_GATE_INNER_PIER_PLINTH_HEIGHT_M,
        z: RUG_GATE_INNER_PIER_PLINTH_DEPTH_M,
      },
      yawRad: 0,
      detailMaterialId: "ph_stone_trim_sandstone",
      uvProjection: "world",
    });
  }

  // Gable tympanum: the solid masonry field between the arch head and the
  // apex. The crown supplies raking bargeboards and a pitched roof, but the
  // gable END was never closed, so from the approach camera the hero landmark
  // showed the underside of its own roof slabs — a chevron of pale planes with
  // the sealed backdrop wall visible through the gap where the reference has
  // a metre of carved stone. It is the largest missing mass on the route.
  //
  // Built as stepped courses rather than one triangle so the rake reads as
  // laid masonry, carried on a string course and finished with a restrained
  // blue inlay band, which is this gate's authored identity accent. It sits in
  // front of the roof plane and entirely above the arch head, so the portal
  // throat, its soffit and the route sightline through it are untouched.
  const gableBaseY = shoulderY + 0.55;
  const gableCourses = 13;
  const gableCourseHeight = Math.max(0.16, (apexY - gableBaseY) / gableCourses);
  for (let course = 0; course < gableCourses; course += 1) {
    const y0 = gableBaseY + course * gableCourseHeight;
    const taper = 1 - course / gableCourses;
    const courseHalfWidth = Math.max(0.26, halfSpanM * (0.06 + 0.88 * taper));
    pushInstance(instances, {
      placementId: `ARCH_RUG_GATE_STRUCTURAL_FINISH:gable-course:${course}`,
      moduleId: "rug_gate_constructed_gable_tympanum",
      semanticClass: "hero_gate_gable_tympanum",
      meshId: "facade_wall_shell",
      position: { x: centerX, y: y0 + gableCourseHeight * 0.5, z: frontZ + 0.06 },
      scale: { x: courseHalfWidth * 2, y: gableCourseHeight, z: 0.34 },
      yawRad: 0,
      wallMaterialId: materialOwner.materialSlots.wall,
      uvProjection: "world",
    });
    // Raking cornice: one trim block per course end, stepping up the slope.
    for (const side of [-1, 1] as const) {
      pushInstance(instances, {
        placementId: `ARCH_RUG_GATE_STRUCTURAL_FINISH:gable-rake:${course}:${side}`,
        moduleId: "rug_gate_constructed_gable_tympanum",
        semanticClass: "hero_gate_gable_raking_cornice",
        meshId: "plinth_strip",
        position: {
          x: centerX + side * (courseHalfWidth + 0.08),
          y: y0 + gableCourseHeight * 0.5,
          z: frontZ + 0.02,
        },
        scale: { x: 0.22, y: gableCourseHeight, z: 0.46 },
        yawRad: 0,
        trimMaterialId,
        uvProjection: "world",
      });
    }
  }
  pushInstance(instances, {
    placementId: "ARCH_RUG_GATE_STRUCTURAL_FINISH:gable-string-course",
    moduleId: "rug_gate_constructed_gable_tympanum",
    semanticClass: "hero_gate_gable_string_course",
    meshId: "plinth_strip",
    position: { x: centerX, y: gableBaseY - 0.11, z: frontZ - 0.02 },
    scale: { x: halfSpanM * 1.9, y: 0.22, z: 0.5 },
    yawRad: 0,
    trimMaterialId,
    uvProjection: "world",
  });
  pushInstance(instances, {
    placementId: "ARCH_RUG_GATE_STRUCTURAL_FINISH:gable-inlay-band",
    moduleId: "rug_gate_constructed_gable_tympanum",
    semanticClass: "hero_gate_gable_inlay_band",
    meshId: "plinth_strip",
    position: { x: centerX, y: gableBaseY + 0.07, z: frontZ - 0.06 },
    scale: { x: halfSpanM * 1.84, y: 0.16, z: 0.42 },
    yawRad: 0,
    trimMaterialId,
    // Restrained glazed blue, the one non-stone hue the reference gives this
    // gate. Kept to a single narrow band so it reads as inlay, not paint.
    detailTintHex: 0x2f6d84,
    uvProjection: "world",
  });
}

type BoundaryFacadeEdge = "north" | "east" | "west";

/**
 * A small number of core-shot walls are real collision boundary segments,
 * rather than facade massings, so the normal frontage compiler cannot cut or
 * decorate them. These named seams remain fully closed: each visual bay is a
 * shallow, collision-neutral relief derived from the exact surviving segment
 * span, the owning zone's facade profile, and shared ground/upper-story
 * datums. Segment splitting therefore preserves every authored connector.
 */
function pushCoreBoundaryFacadeGrammar(
  segments: readonly BoundarySegment[],
  zones: readonly RuntimeBlockoutZone[],
  placements: readonly V3ArchitecturePlacement[],
  facadeProfiles: ReadonlyMap<string, V3FacadeProfile>,
  massingProfiles: ReadonlyMap<string, V3MassingProfile>,
  instances: WallDetailInstance[],
): void {
  const targets: readonly {
    id: string;
    zoneId: string;
    edge: BoundaryFacadeEdge;
    wallMaterialId?: string;
    spanEndAtMassingSouthEdgeId?: string;
    alignToMerchantReturnDatums?: boolean;
  }[] = [
    // Validated B.PL30 seam: this surviving collision wall sits in front of
    // the Spice-west massing return. Its visible span is derived exactly from
    // the zone start to that massing's south edge; only collision-neutral
    // relief is added on the playable side of the unchanged wall.
    {
      id: "SPICE_STREET_WEST_TERMINAL",
      zoneId: "SPICE_STREET",
      edge: "west",
      spanEndAtMassingSouthEdgeId: "ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING",
      alignToMerchantReturnDatums: true,
    },
    { id: "COVERED_SOUK_NORTH", zoneId: "COVERED_SOUK", edge: "north" },
    { id: "DYERS_DOGLEG_EAST", zoneId: "DYERS_DOGLEG", edge: "east" },
    // Named material-identity override: the opposing Dogleg wall is a
    // separate building face and must not duplicate the east building's
    // whitewashed-brick material+tint in the same frame.
    {
      id: "DYERS_DOGLEG_WEST",
      zoneId: "DYERS_DOGLEG",
      edge: "west",
      wallMaterialId: "ph_beige_wall_002",
    },
  ];

  for (const target of targets) {
    const zone = zones.find((candidate) => candidate.id === target.zoneId);
    const profile = zone?.facadeProfileId ? facadeProfiles.get(zone.facadeProfileId) : null;
    if (!zone || !profile) continue;
    const storyHeightM = massingProfiles.get(profile.massingProfileId)?.heightM ?? 7;
    const face: FacadeFace = target.edge;
    const yawRad = target.edge === "north"
      ? Math.PI
      : target.edge === "east"
        ? Math.PI * 0.5
        : Math.PI * 1.5;
    const boundaryCoord = target.edge === "north"
      ? zone.rect.y + zone.rect.h
      : target.edge === "east"
        ? zone.rect.x + zone.rect.w
        : zone.rect.x;
    const zoneStart = target.edge === "north" ? zone.rect.x : zone.rect.y;
    let zoneEnd = zoneStart + (target.edge === "north" ? zone.rect.w : zone.rect.h);
    if (target.spanEndAtMassingSouthEdgeId) {
      const terminalMassing = placements.find((placement): placement is V3ArchitectureMassingPlacement => (
        placement.kind === "massing" && placement.id === target.spanEndAtMassingSouthEdgeId
      ));
      if (!terminalMassing) continue;
      const massingSouthEdge = terminalMassing.center.y - terminalMassing.sizeM.width * 0.5;
      zoneEnd = Math.min(zoneEnd, massingSouthEdge);
    }
    const matchingSegments = segments.filter((segment) => (
      segment.orientation === (target.edge === "north" ? "horizontal" : "vertical")
      && Math.abs(segment.coord - boundaryCoord) <= FACADE_FIT_EPSILON_M
      && segment.end > zoneStart + FACADE_FIT_EPSILON_M
      && segment.start < zoneEnd - FACADE_FIT_EPSILON_M
    ));

    for (const [segmentIndex, segment] of matchingSegments.entries()) {
      const start = Math.max(zoneStart, segment.start);
      const end = Math.min(zoneEnd, segment.end);
      const lengthM = end - start;
      if (lengthM < (target.alignToMerchantReturnDatums ? 0.9 : 2.1)) continue;
      const centerAlong = (start + end) * 0.5;
      const center = target.edge === "north"
        ? { x: centerAlong, y: 0, z: boundaryCoord }
        : { x: boundaryCoord, y: 0, z: centerAlong };
      const edgeMarginM = Math.min(0.68, lengthM * 0.14);
      const usableLengthM = lengthM - edgeMarginM * 2;
      const bayCount = Math.max(1, Math.min(5, Math.floor(usableLengthM / 1.72)));
      const bayPitchM = usableLengthM / bayCount;
      const bayWidthM = Math.min(1.16, bayPitchM * (target.alignToMerchantReturnDatums ? 0.76 : 0.62));
      const frameWidthM = 0.1;
      const recessDepthM = 0.05;
      const lowerSillM = 0.52;
      const lowerHeadM = target.alignToMerchantReturnDatums ? 2.38 : 2.75;
      const lowerHeightM = lowerHeadM - lowerSillM;
      const upperSillM = target.alignToMerchantReturnDatums ? 3.62 : 4.15;
      const upperHeightM = target.alignToMerchantReturnDatums ? 1.36 : 1.32;
      const timberTint = scaleHexColor(
        0x8d6447,
        0.86 + stableUnitInterval(`${target.id}:${segmentIndex}:timber`) * 0.24,
      );
      const prefix = `ARCH_${target.id}_BOUNDARY_${segmentIndex + 1}`;
      const wallMaterialId = target.wallMaterialId ?? profile.materialSlots.wall;

      pushInstance(instances, {
        placementId: `${prefix}:material-identity-plane`,
        moduleId: "boundary_facade_material_identity",
        semanticClass: "grammar_served_boundary_wall_identity",
        meshId: "facade_wall_infill",
        position: offsetPosition({ ...center, y: storyHeightM * 0.5 }, face, 0, 0.026),
        scale: { x: lengthM, y: storyHeightM, z: 0.025 },
        yawRad,
        wallMaterialId,
        detailMaterialId: wallMaterialId,
        uvProjection: "world",
      });

      pushInstance(instances, {
        placementId: `${prefix}:contact-course`,
        moduleId: "boundary_facade_contact_course",
        semanticClass: "grammar_served_boundary_grounding",
        meshId: "plinth_strip",
        position: offsetPosition({ ...center, y: 0.18 }, face, 0, 0.06),
        scale: { x: lengthM, y: 0.36, z: 0.13 },
        yawRad,
        trimMaterialId: profile.materialSlots.trim,
        uvProjection: "world",
      });
      if (storyHeightM >= 6.2) {
        pushInstance(instances, {
          placementId: `${prefix}:story-string-course`,
          moduleId: "boundary_facade_story_datum",
          semanticClass: "grammar_served_boundary_story_datum",
          meshId: "string_course_strip",
          position: offsetPosition({ ...center, y: target.alignToMerchantReturnDatums ? 3.12 : 3.52 }, face, 0, 0.055),
          scale: { x: lengthM - 0.14, y: 0.1, z: 0.12 },
          yawRad,
          trimMaterialId: profile.materialSlots.trim,
          uvProjection: "world",
        });
      }

      if (target.alignToMerchantReturnDatums) {
        const arrisWidthM = Math.min(0.11, lengthM * 0.08);
        const arrisInsetM = Math.min(0.15, lengthM * 0.11);
        for (const terminal of [-1, 1] as const) {
          pushInstance(instances, {
            placementId: `${prefix}:terminal-arris:${terminal}`,
            moduleId: "boundary_facade_terminal_arris",
            semanticClass: "grammar_served_boundary_terminal_arris",
            meshId: "recessed_panel_frame_v",
            position: offsetPosition(
              { ...center, y: 2.83 },
              face,
              terminal * (lengthM * 0.5 - arrisInsetM - arrisWidthM * 0.5),
              0.075,
            ),
            scale: { x: arrisWidthM, y: 4.7, z: 0.1 },
            yawRad,
            trimMaterialId: profile.materialSlots.trim,
            uvProjection: "world",
          });
        }
      }

      const pushBoundaryBay = (
        bayIndex: number,
        alongM: number,
        sillM: number,
        heightM: number,
        story: "ground" | "upper",
      ): void => {
        const bayPrefix = `${prefix}:${story}:${bayIndex + 1}`;
        const isDyersWestGate = (
          story === "ground"
          && target.id === "DYERS_DOGLEG_WEST"
          && bayIndex === bayCount - 1
        );
        const resolvedSillM = isDyersWestGate ? 0.22 : sillM;
        const resolvedHeightM = isDyersWestGate ? Math.max(4.8, storyHeightM - 0.68) : heightM;
        const centerY = resolvedSillM + resolvedHeightM * 0.5;
        pushInstance(instances, {
          placementId: `${bayPrefix}:recess`,
          moduleId: isDyersWestGate ? "boundary_facade_two_story_blind_gate" : "boundary_facade_relief_bay",
          semanticClass: isDyersWestGate
            ? "grammar_served_boundary_two_story_gate_recess"
            : story === "ground"
            ? "grammar_served_boundary_blind_niche"
            : "grammar_served_boundary_upper_screen",
          meshId: isDyersWestGate
            ? "arch_recess_back"
            : story === "ground"
              ? "niche_recess_back"
              : "window_recess_timber",
          position: offsetPosition({ ...center, y: centerY }, face, alongM, 0.045),
          scale: { x: bayWidthM, y: resolvedHeightM, z: recessDepthM },
          yawRad,
          detailMaterialId: story === "ground" ? wallMaterialId : MERCHANT_TIMBER_MATERIAL_ID,
          detailTintHex: story === "ground" ? scaleHexColor(0x89694f, 0.8) : timberTint,
          uvProjection: "world",
        });
        for (const side of isDyersWestGate ? [] : [-1, 1] as const) {
          pushInstance(instances, {
            placementId: `${bayPrefix}:jamb:${side}`,
            moduleId: "boundary_facade_relief_bay",
            semanticClass: "grammar_served_boundary_frame",
            meshId: "door_jamb",
            position: offsetPosition(
              { ...center, y: centerY },
              face,
              alongM + side * (bayWidthM * 0.5 + frameWidthM * 0.5),
              0.075,
            ),
            scale: { x: frameWidthM, y: resolvedHeightM + frameWidthM, z: 0.11 },
            yawRad,
            trimMaterialId: profile.materialSlots.trim,
            uvProjection: "world",
          });
        }
        for (const [edge, edgeY] of isDyersWestGate
          ? []
          : [
              ["sill", resolvedSillM - frameWidthM * 0.5],
              ["head", resolvedSillM + resolvedHeightM + frameWidthM * 0.5],
            ] as const) {
          pushInstance(instances, {
            placementId: `${bayPrefix}:${edge}`,
            moduleId: "boundary_facade_relief_bay",
            semanticClass: "grammar_served_boundary_frame",
            meshId: "door_lintel",
            position: offsetPosition({ ...center, y: edgeY }, face, alongM, 0.075),
            scale: { x: bayWidthM + frameWidthM * 2, y: frameWidthM, z: 0.11 },
            yawRad,
            trimMaterialId: profile.materialSlots.trim,
            uvProjection: "world",
          });
        }
        if (story === "ground") {
          if (isDyersWestGate) {
            pushInstance(instances, {
              placementId: `${bayPrefix}:pointed-surround`,
              moduleId: "boundary_facade_two_story_blind_gate",
              semanticClass: "grammar_served_boundary_gate_stone_surround",
              meshId: "arch_pointed_frame",
              position: offsetPosition(
                { ...center, y: centerY + resolvedHeightM * 0.015 },
                face,
                alongM,
                0.11,
              ),
              scale: {
                x: bayWidthM + frameWidthM * 2.8,
                y: resolvedHeightM + frameWidthM * 1.5,
                z: 0.2,
              },
              yawRad,
              trimMaterialId: profile.materialSlots.trim,
              uvProjection: "world",
            });
            pushInstance(instances, {
              placementId: `${bayPrefix}:planked-gate`,
              moduleId: "boundary_facade_planked_gate",
              semanticClass: "grammar_served_boundary_gate_leaf",
              meshId: "door_panel_storage",
              position: offsetPosition(
                { ...center, y: centerY },
                face,
                alongM,
                0.095,
              ),
              scale: { x: bayWidthM - 0.18, y: resolvedHeightM - 0.34, z: 0.12 },
              yawRad,
              detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: scaleHexColor(timberTint, 0.94),
              uvProjection: "world",
            });
            pushInstance(instances, {
              placementId: `${bayPrefix}:gate-center-stile`,
              moduleId: "boundary_facade_planked_gate",
              semanticClass: "grammar_served_boundary_gate_joinery",
              meshId: "door_jamb",
              position: offsetPosition({ ...center, y: centerY }, face, alongM, 0.16),
              scale: { x: 0.085, y: resolvedHeightM - 0.5, z: 0.07 },
              yawRad,
              trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: scaleHexColor(timberTint, 1.12),
              uvProjection: "world",
            });
            pushInstance(instances, {
              placementId: `${bayPrefix}:gate-threshold`,
              moduleId: "boundary_facade_two_story_blind_gate",
              semanticClass: "grammar_served_boundary_gate_threshold",
              meshId: "door_lintel",
              position: offsetPosition(
                { ...center, y: resolvedSillM + 0.08 },
                face,
                alongM,
                0.13,
              ),
              scale: { x: bayWidthM + 0.32, y: 0.16, z: 0.24 },
              yawRad,
              trimMaterialId: profile.materialSlots.trim,
              uvProjection: "world",
            });
          } else {
            const leftUnit = stableUnitInterval(`${bayPrefix}:left-shutter`);
            const rightUnit = stableUnitInterval(`${bayPrefix}:right-shutter`);
            for (const [shutterSide, unit] of [[-1, leftUnit], [1, rightUnit]] as const) {
              const shutterWidthM = bayWidthM * (0.38 + unit * 0.1);
              const shutterAngleRad = 0.06 + unit * 0.58;
              pushInstance(instances, {
                placementId: `${bayPrefix}:shutter:${shutterSide}`,
                moduleId: "boundary_facade_varied_shutter",
                semanticClass: "grammar_served_boundary_varied_closure",
                meshId: "window_shutter",
                position: offsetPosition(
                  { ...center, y: centerY },
                  face,
                  alongM + shutterSide * bayWidthM * (0.25 + unit * 0.04),
                  0.095,
                ),
                scale: { x: shutterWidthM, y: heightM - 0.14, z: 0.075 },
                yawRad: yawRad + shutterSide * shutterAngleRad,
                detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
                detailTintHex: scaleHexColor(timberTint, 0.88 + unit * 0.2),
                uvProjection: "world",
              });
            }
          }
          if (profile.family === "covered_arcade") {
            // Structural boundary walls cannot own authored openings, but
            // their closed relief bays still need to function as merchant
            // frontages. Counter height derives from the shared sill datum;
            // width and all stock positions derive from the exact bay span.
            const marketUnit = stableUnitInterval(`${bayPrefix}:served-market`);
            const counterHeightM = sillM + 0.16;
            const counterWidthM = bayWidthM * (0.68 + marketUnit * 0.14);
            const counterTintHex = marketUnit < 0.34
              ? 0x9f714f
              : marketUnit < 0.67
                ? 0x668f83
                : 0xa38a5c;
            pushInstance(instances, {
              placementId: `${bayPrefix}:market-counter-front`,
              moduleId: "boundary_facade_served_market",
              semanticClass: "grammar_served_boundary_merchant_counter",
              meshId: "shop_counter",
              position: offsetPosition(
                { ...center, y: counterHeightM * 0.5 },
                face,
                alongM,
                0.12,
              ),
              scale: { x: counterWidthM, y: counterHeightM, z: 0.2 },
              yawRad,
              trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: counterTintHex,
              uvProjection: "world",
            });
            pushInstance(instances, {
              placementId: `${bayPrefix}:market-counter-top`,
              moduleId: "boundary_facade_served_market",
              semanticClass: "grammar_served_boundary_merchant_counter",
              meshId: "shop_counter",
              position: offsetPosition(
                { ...center, y: counterHeightM + 0.055 },
                face,
                alongM,
                0.09,
              ),
              scale: { x: counterWidthM + 0.12, y: 0.11, z: 0.42 },
              yawRad,
              trimMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: counterTintHex,
              uvProjection: "world",
            });
            const stockMeshId = marketUnit < 0.5
              ? "merchant_goods_basket" as const
              : "merchant_goods_pot" as const;
            const stockSize = stockMeshId === "merchant_goods_basket"
              ? { x: 0.34, y: 0.3, z: 0.34 }
              : { x: 0.3, y: 0.4, z: 0.3 };
            const stockSide = marketUnit < 0.5 ? -1 : 1;
            pushInstance(instances, {
              placementId: `${bayPrefix}:market-stock`,
              moduleId: "boundary_facade_served_market",
              semanticClass: "grammar_served_boundary_merchant_stock",
              meshId: stockMeshId,
              position: offsetPosition(
                { ...center, y: counterHeightM + 0.11 + stockSize.y * 0.5 },
                face,
                alongM + stockSide * counterWidthM * 0.22,
                0.04,
              ),
              scale: stockSize,
              yawRad: yawRad + stockSide * (0.035 + marketUnit * 0.035),
              trimMaterialId: stockMeshId === "merchant_goods_basket"
                ? MERCHANT_TIMBER_MATERIAL_ID
                : profile.materialSlots.trim,
              detailTintHex: stockMeshId === "merchant_goods_basket"
                ? counterTintHex
                : marketUnit < 0.75 ? 0x73958a : 0xb17b5b,
              uvProjection: "world",
            });

            const openingCenter = offsetPosition(
              { ...center, y: centerY },
              face,
              alongM,
              0,
            );
            const servedOpening: V3ArchitectureModulePlacement = {
              id: `${bayPrefix}:served-opening`,
              kind: "facade_module",
              frontageId: `BOUNDARY_${target.id}`,
              zoneId: target.zoneId,
              face,
              profileId: profile.id,
              moduleId: "boundary_served_market",
              moduleKind: "window",
              openingType: "recess",
              datumId: `${prefix}:ground-datum`,
              columnId: `${prefix}:bay:${bayIndex + 1}`,
              layoutSource: "generated",
              center: { x: openingCenter.x, y: openingCenter.z, z: openingCenter.y },
              sizeM: { width: bayWidthM, depth: recessDepthM, height: heightM },
              yawDeg: yawRad * 180 / Math.PI,
              materialSlot: "timber",
              collisionOpening: false,
            };
            pushSupportedAwning(
              servedOpening,
              instances,
              openingCenter,
              yawRad,
              MERCHANT_TIMBER_MATERIAL_ID,
            );
          }
        } else {
          const screenUnit = stableUnitInterval(`${bayPrefix}:screen-density`);
          const barCount = 2 + Math.floor(screenUnit * 4);
          for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
            const normalized = barCount === 1 ? 0 : barIndex / (barCount - 1) - 0.5;
            pushInstance(instances, {
              placementId: `${bayPrefix}:screen:${barIndex + 1}`,
              moduleId: "boundary_facade_upper_screen",
              semanticClass: "grammar_served_boundary_timber_screen",
              meshId: "window_screen_bar",
              position: offsetPosition(
                { ...center, y: centerY },
                face,
                alongM + normalized * bayWidthM * 0.62,
                0.09,
              ),
              scale: { x: 0.052, y: heightM - 0.08, z: 0.06 },
              yawRad,
              detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
              detailTintHex: timberTint,
              uvProjection: "world",
            });
          }
          pushInstance(instances, {
            placementId: `${bayPrefix}:screen-rail`,
            moduleId: "boundary_facade_upper_screen",
            semanticClass: "grammar_served_boundary_timber_screen",
            meshId: "window_screen_bar",
            position: offsetPosition(
              { ...center, y: centerY + (screenUnit - 0.5) * heightM * 0.3 },
              face,
              alongM,
              0.09,
            ),
            scale: { x: bayWidthM - 0.1, y: 0.052, z: 0.06 },
            yawRad,
            detailMaterialId: MERCHANT_TIMBER_MATERIAL_ID,
            detailTintHex: timberTint,
            uvProjection: "world",
          });
        }
      };

      for (let bayIndex = 0; bayIndex < bayCount; bayIndex += 1) {
        const alongM = -usableLengthM * 0.5 + bayPitchM * (bayIndex + 0.5);
        pushBoundaryBay(bayIndex, alongM, lowerSillM, lowerHeightM, "ground");
        const gateOwnsTwoStories = target.id === "DYERS_DOGLEG_WEST" && bayIndex === bayCount - 1;
        if (!gateOwnsTwoStories && storyHeightM >= upperSillM + upperHeightM + 0.5) {
          pushBoundaryBay(bayIndex, alongM, upperSillM, upperHeightM, "upper");
        }
      }
    }
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
  pushElevationFoundations(options.traversalSurfaces, instances);
  pushRugGateCrownBackdrop(options.zones, options.placements, instances);
  pushRugGateWestWallCoping(options.zones, options.placements, instances);
  pushRugGateStructuralFinish(options.zones, options.placements, instances);
  pushCoreBoundaryFacadeGrammar(
    options.segments,
    options.zones,
    options.placements,
    facadeProfiles,
    massingProfiles,
    instances,
  );
  for (const placement of [...options.placements].sort((left, right) => left.id.localeCompare(right.id))) {
    if (ids.has(placement.id)) fail(`duplicate placement id '${placement.id}'`);
    ids.add(placement.id);
    if (placement.kind === "massing") {
      requirePbrMassingSlots("massing", placement.id, placement.materialSlots);
      if (!massingProfiles.has(placement.massingProfileId)) {
        fail(`massing '${placement.id}' references unknown profile '${placement.massingProfileId}'`);
      }
      const facadeProfile = facadeProfiles.get(placement.profileId)
        ?? fail(`massing '${placement.id}' references unknown facade profile '${placement.profileId}'`);
      const frontageModules = modulesByFrontage.get(placement.frontageId) ?? [];
      const hasVisualCutouts = frontageModules.some(createsVisualFacadeCutout);
      pushMassing(
        placement,
        instances,
        facadeProfile,
        frontageModules,
        experimentalVisualCutoutMassing,
        !experimentalVisualCutoutMassing || !hasVisualCutouts || shellOwnership.owners.has(placement.id),
        shellOwnership.sharedBackingByOwner.get(placement.id) ?? null,
        shellOwnership.backingOwnerByMassing.get(placement.id) ?? placement.id,
      );
    } else {
      pushFacadeModule(
        placement,
        facadeProfiles,
        instances,
        doorModelPlacements,
        options.fortifiedDoorModelAvailable,
        experimentalVisualCutoutMassing,
        options.stallSeatedPlacementIds?.has(placement.id) ?? false,
      );
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
