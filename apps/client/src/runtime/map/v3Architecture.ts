import type { BoundarySegment } from "./buildBlockout";
import { bz04SectionVisualSegments, type Bz04BoundaryCoverage } from "./bz04Trial";
import { designToWorldVec3, designYawDegToWorldYawRad } from "./coordinateTransforms";
import type { RuntimeBlockoutZone, RuntimeTraversalSurface } from "./types";
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
   * Noninteractive façade bays are compiled as false. The cutout massing
   * checks refuse a true connector, because a closed backing volume behind it
   * would contradict the connector's gameplay collision.
   */
  collisionOpening: boolean;
};

export type V3ArchitecturePlacement = V3ArchitectureMassingPlacement | V3ArchitectureModulePlacement;

export type BuildV3ArchitectureOptions = {
  bz04BoundaryCoverage?: readonly Bz04BoundaryCoverage[];
  placements: readonly V3ArchitecturePlacement[];
  massingProfiles: readonly V3MassingProfile[];
  facadeProfiles: readonly V3FacadeProfile[];
  segments: readonly BoundarySegment[];
  zones: readonly RuntimeBlockoutZone[];
  traversalSurfaces: readonly RuntimeTraversalSurface[];
  wallHeightM: number;
  /**
   * Also run the checks authored PBR wall ownership relies on: every facade
   * aperture fits its massing face, recesses leave a positive backing depth,
   * the yaw faces the frontage, no collision opening is closed off, and
   * boundary infill keeps its corner and return widths.
   */
  validateCutoutMassing?: boolean;
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
  segmentHeights: number[];
  stats: WallDetailPlacementStats;
};

const MIN_DIMENSION_M = 0.02;
// Flat elevated paving is rendered by buildPbrFloors at the authoritative
// traversal elevation. A closed retaining box must stop just below that plane;
// sharing its exact height creates full-footprint coplanar z-fighting across
// Tea Terrace. The PBR edge fascia hides this visual-only recess.
const ELEVATION_FOUNDATION_TOP_CLEARANCE_M = 0.02;
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

function resolveFacadeModuleOffset(
  placement: V3ArchitectureMassingPlacement,
  module: V3ArchitectureModulePlacement,
): number {
  const center = designToWorldVec3(placement.center);
  const moduleCenter = designToWorldVec3(module.center);
  const tangent = faceTangent(placement.face);
  return (moduleCenter.x - center.x) * tangent.x + (moduleCenter.z - center.z) * tangent.z;
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
    yawRad: number;
    pitchRad?: number;
    rollRad?: number;
    wallMaterialId?: string;
    trimMaterialId?: string;
  },
): void {
  requirePositiveDimensions(placement.placementId, {
    width: placement.scale.x,
    depth: placement.scale.z,
    height: placement.scale.y,
  });
  instances.push({
    placementId: placement.placementId,
    moduleId: placement.moduleId,
    semanticClass: placement.semanticClass,
    meshId: placement.meshId,
    position: placement.position,
    scale: placement.scale,
    yawRad: placement.yawRad,
    ...(typeof placement.pitchRad === "number" ? { pitchRad: placement.pitchRad } : {}),
    ...(typeof placement.rollRad === "number" ? { rollRad: placement.rollRad } : {}),
    wallMaterialId: placement.wallMaterialId ?? null,
    trimMaterialId: placement.trimMaterialId ?? null,
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

const FACADE_FIT_EPSILON_M = 0.001;
const FACADE_BACKING_RECESS_M = 0.62;
const FACADE_RECESS_BACKING_CLEARANCE_M = 0.12;
const FACADE_MIN_CORNER_MASS_WIDTH_M = 0.62;
// Boundary infill keeps this clearance behind the structural arris at each
// outer end, so a coplanar return cannot z-fight with the collision wall.
const SEGMENTED_SHELL_RETURN_CLEARANCE_M = 0.02;
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
 * building volume. One stable placement owns the shared closed volume, which
 * must keep a positive depth between both faces' recesses.
 */
type MassingShellOwnership = {
  owners: ReadonlySet<string>;
  sharedBackingDepthByOwner: ReadonlyMap<string, number>;
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
  const sharedBackingDepthByOwner = new Map<string, number>();
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
      // owns the shared backing volume.
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
      sharedBackingDepthByOwner.set(left.id, depthM);
      owners.delete(right.id);
    }
  }
  return { owners, sharedBackingDepthByOwner };
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

/**
 * Checks for a massing whose frontage has visual apertures under authored PBR
 * wall ownership. Section GLBs render the facade; these checks keep its
 * compiled apertures, recesses and boundary infill physically consistent.
 */
function checkCutoutMassing(
  placement: V3ArchitectureMassingPlacement,
  frontageModules: readonly V3ArchitectureModulePlacement[],
  shellOwnership: MassingShellOwnership,
): void {
  const apertures = collectFacadeApertures(placement, frontageModules);
  const backingRecessM = resolveFacadeBackingRecessM(frontageModules, placement.sizeM.depth);
  if (apertures.length === 0) return;

  assertFrontageOrientation(placement, designYawDegToWorldYawRad(placement.yawDeg));
  const collisionOpening = frontageModules.find((module) => module.collisionOpening);
  if (collisionOpening) {
    fail(
      `massing '${placement.id}' cannot place a closed backing volume behind collision opening '${collisionOpening.id}'`,
    );
  }
  if (shellOwnership.owners.has(placement.id)) {
    const backingDepthM = shellOwnership.sharedBackingDepthByOwner.get(placement.id)
      ?? placement.sizeM.depth - backingRecessM;
    if (backingDepthM < MIN_DIMENSION_M) {
      fail(
        `massing '${placement.id}' depth ${placement.sizeM.depth} leaves no positive backing behind ${backingRecessM}m recess`,
      );
    }
  }

  const infillRects = buildFacadeInfillRects(placement, apertures);
  const facadeLeftM = -placement.sizeM.width * 0.5;
  const facadeRightM = placement.sizeM.width * 0.5;
  const facadeTopY = designToWorldVec3(placement.center).y + placement.sizeM.height * 0.5;
  const skylineMassingRects = infillRects.filter((rectangle) => (
    Math.abs(rectangle.topY - facadeTopY) <= FACADE_FIT_EPSILON_M
  ));
  for (const [index, rectangle] of infillRects.entries()) {
    const sourceWidthM = rectangle.rightM - rectangle.leftM;
    const touchesLeftSide = Math.abs(rectangle.leftM - facadeLeftM) <= FACADE_FIT_EPSILON_M;
    const touchesRightSide = Math.abs(rectangle.rightM - facadeRightM) <= FACADE_FIT_EPSILON_M;
    const touchesSkyline = Math.abs(rectangle.topY - facadeTopY) <= FACADE_FIT_EPSILON_M;
    // A narrow outer strip is only valid below a full-width upper mass; on the
    // skyline it would read as a detached fin.
    const isNarrowEdge = (touchesLeftSide || touchesRightSide)
      && !touchesSkyline
      && sourceWidthM < FACADE_MIN_CORNER_MASS_WIDTH_M - FACADE_FIT_EPSILON_M;
    if (isNarrowEdge && !skylineMassingRects.some((skyline) => (
      skyline.leftM <= rectangle.leftM + FACADE_FIT_EPSILON_M
      && skyline.rightM >= rectangle.rightM - FACADE_FIT_EPSILON_M
      && skyline.rightM - skyline.leftM >= FACADE_MIN_CORNER_MASS_WIDTH_M - FACADE_FIT_EPSILON_M
    ))) {
      fail(
        `massing '${placement.id}' boundary infill ${index + 1} has only ${sourceWidthM.toFixed(3)}m tangent width; `
        + `a skyline-visible corner requires at least ${FACADE_MIN_CORNER_MASS_WIDTH_M.toFixed(2)}m`,
      );
    }
    const clearedLeftM = rectangle.leftM + (touchesLeftSide ? SEGMENTED_SHELL_RETURN_CLEARANCE_M : 0);
    const clearedRightM = rectangle.rightM - (touchesRightSide ? SEGMENTED_SHELL_RETURN_CLEARANCE_M : 0);
    if (clearedRightM - clearedLeftM < MIN_DIMENSION_M) {
      fail(`massing '${placement.id}' boundary infill ${index + 1} cannot fit shared-shell return clearance`);
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
  const shellOwnership = options.validateCutoutMassing === true
    ? resolveMassingShellOwnership(options.placements, modulesByFrontage)
    : null;
  pushElevationFoundations(options.traversalSurfaces, instances, options.bz04BoundaryCoverage ?? []);
  pushRugGateWestWallCoping(options.zones, options.placements, instances);
  for (const placement of [...options.placements].sort((left, right) => left.id.localeCompare(right.id))) {
    if (ids.has(placement.id)) fail(`duplicate placement id '${placement.id}'`);
    ids.add(placement.id);
    if (placement.kind === "facade_module") {
      validateFacadeModule(placement, facadeProfiles);
      continue;
    }
    requirePbrMassingSlots("massing", placement.id, placement.materialSlots);
    if (!massingProfiles.has(placement.massingProfileId)) {
      fail(`massing '${placement.id}' references unknown profile '${placement.massingProfileId}'`);
    }
    if (!facadeProfiles.has(placement.profileId)) {
      fail(`massing '${placement.id}' references unknown facade profile '${placement.profileId}'`);
    }
    requirePositiveDimensions(placement.id, placement.sizeM);
    if (shellOwnership) {
      checkCutoutMassing(placement, modulesByFrontage.get(placement.frontageId) ?? [], shellOwnership);
    }
    // Spice Street West has no roof of its own; every other roof setback must
    // leave a footprint.
    if (placement.id !== "ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING") {
      const roofInsetM = placement.roof.setbackM;
      if (placement.sizeM.width - roofInsetM * 2 < 0.5 || placement.sizeM.depth - roofInsetM * 2 < 0.5) {
        fail(`massing '${placement.id}' roof setback consumes the roof footprint`);
      }
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
