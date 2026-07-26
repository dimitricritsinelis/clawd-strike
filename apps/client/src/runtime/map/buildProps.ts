import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  SphereGeometry,
  Shape,
  TorusGeometry,
  Vector3,
} from "three";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import type { RuntimeColliderAabb } from "../sim/collision/WorldColliders";
import { resolveBlockoutPalette } from "../render/BlockoutMaterials";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";
import { DeterministicRng, resolveRuntimeSeed } from "../utils/Rng";
import { TraversalSurfaceResolver } from "../sim/TraversalSurfaceResolver";
import type { RuntimePropChaosOptions, RuntimePropProfile, RuntimePropVisualMode } from "../utils/UrlParams";
import { designToWorldVec3, designYawDegToWorldYawRad, type WorldVec3 } from "./coordinateTransforms";
import type {
  RuntimeAnchor,
  RuntimeAnchorsSpec,
  RuntimeBlockoutSpec,
  RuntimeDressingPlacement,
  RuntimeRect,
} from "./types";
import { createShutterGeometry } from "./propFamilies/doorsShutters";
import { createLanternGeometry } from "./propFamilies/lanternsFixtures";
import { createCartGeometry, createNormalizedCartGeometry } from "./propFamilies/carts";
import { createCoverCrateGeometry, createCoverTarpGeometry } from "./propFamilies/coverDressing";
import {
  createBarrelGeometry,
  createCrateGeometry,
  createMerchantBalanceGeometry,
  createPotteryGeometry,
  createSackGeometry,
  createShallowSpiceBasketGeometry,
  createSpiceMoundGeometry,
} from "./propFamilies/goods";
import {
  FOUNTAIN_REFERENCE_DIAMETER_M,
  FOUNTAIN_STONE_MATERIAL_ID,
  FOUNTAIN_VISUAL_HEIGHT_M,
  FOUNTAIN_WATER_MATERIAL_INPUTS,
  createCourtPlanterFoliageGeometry,
  createCourtPlanterSoilGeometry,
  createCourtPlanterStoneGeometry,
  createFountainBronzeGeometry,
  createFountainCourtAccentGeometry,
  createFountainDetailGeometry,
  createFountainRippleNormalTexture,
  createFountainWaterGeometry,
  createModularFountainStoneGeometry,
  createModularFountainTileGeometry,
} from "./propFamilies/fountain";
import {
  createHeroGateDressingFrameGeometry,
  createHeroGateDressingTextileGeometry,
} from "./propFamilies/gateDressing";
import {
  createDyersWorkstationDrainGeometry,
  createDyersWorkstationIndigoGeometry,
  createDyersWorkstationIndigoBasinGeometry,
  createDyersWorkstationMadderGeometry,
  createDyersWorkstationMadderBasinGeometry,
  createDyersWorkstationStoneGeometry,
  createDyersWorkstationTextileGeometry,
  createDyersWorkstationTimberGeometry,
  createDyersWorkstationWetApronGeometry,
} from "./propFamilies/dyersWorkstation";
import { createTeaServiceGeometry, createTeaVesselsGeometry } from "./propFamilies/teaService";
import {
  createMarketStallCanopyGeometry,
  createMarketStallGeometry,
  createMarketStallSlattedBackGeometry,
} from "./propFamilies/marketStalls";
import {
  BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
  angledBoxPart,
  boxPart,
  createBatch,
  createGlazedFountainTileTexture,
  createPaintedWoodSignTexture,
  createStripedTexture,
  loadTiledTexture,
  mergeProceduralGeometry,
  tintGeometry,
  type InstanceBatch,
  type InstanceSpec,
  type PropPlacement,
  type PropPlacementKind,
} from "./propFamilies/propsCore";
import {
  CANOPY_SPAN_STATIONS,
  createCanopyFixtureGeometry,
  createCanopyScallopedValanceGeometry,
  createCanopyTrestleGeometry,
  createClothGeometry,
  createSignFrameGeometry,
  createSignRigGeometry,
  createUnitRopeGeometry,
} from "./propFamilies/signsAwnings";
import {
  createDrapePanelGeometry,
  createDyersWorkshopTextileGeometry,
  createGroundRugGeometry,
  createHangingTextileGeometry,
  createLaundryBundleGeometry,
  createLaundryClipGeometry,
  createLaundryClothGeometry,
  createLaundryLanternGeometry,
  createLaundryLineGeometry,
} from "./propFamilies/textilesWallArt";

const CLEAR_ZONE_EPSILON = 0.0001;
const BOUNDS_EPSILON = 0.0001;
const GAP_RULE_MIN_PASSAGE_M = 1.7;
const STALL_FILLER_EDGE_PADDING_M = 0.28;
const DEG_TO_RAD = designYawDegToWorldYawRad(1);
export { BAZAAR_STRIPED_CLOTH_TEXTURE_URL } from "./propFamilies/propsCore";

function stablePlacementVariantSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const PROFILE_DEFAULTS: Record<RuntimePropProfile, { jitter: number; cluster: number; density: number; decorativeDropout: number }> = {
  subtle: { jitter: 0.34, cluster: 0.56, density: 0.44, decorativeDropout: 0.22 },
  medium: { jitter: 0.62, cluster: 0.74, density: 0.78, decorativeDropout: 0.1 },
  high: { jitter: 0.88, cluster: 0.9, density: 0.9, decorativeDropout: 0.12 },
};

type ResolvedChaos = {
  profile: RuntimePropProfile;
  jitter: number;
  cluster: number;
  density: number;
  decorativeDropout: number;
};

type LineRhythmPoint = {
  anchor: RuntimeAnchor;
  base: WorldVec3;
  along: number;
};

type AnchorLineGroup = {
  key: string;
  points: LineRhythmPoint[];
};

export type PropsBuildStats = {
  seed: number;
  profile: RuntimePropProfile;
  jitter: number;
  cluster: number;
  density: number;
  totalAnchors: number;
  candidatesTotal: number;
  collidersPlaced: number;
  rejectedClearZone: number;
  rejectedBounds: number;
  rejectedGapRule: number;
  visualOnlyLandmarks: number;
  stallFillersPlaced: number;
};

export type PropsBuildResult = {
  root: Group;
  colliders: RuntimeColliderAabb[];
  stats: PropsBuildStats;
  renderedLandmarkAnchorIds: string[];
  renderedAnchorIds: string[];
  renderedPlacements: RenderedPropPlacement[];
};

export type RenderedPropPlacement = {
  placementId: string;
  anchorId: string;
  assetId: string;
  moduleId: string;
  semanticClass: string;
  representation: "model" | "module" | "procedural-proxy" | "placeholder";
  materialMode: "pbr" | "standard" | "unlit" | "debug";
  center: { x: number; y: number; z: number };
  dimensionsM: { width: number; depth: number; height: number };
  groundingGapM: number;
  shadowMode: "cast_receive" | "cast_only" | "receive_only" | "none";
};

export type BuildPropsOptions = {
  mapId: string;
  blockout: RuntimeBlockoutSpec;
  anchors: RuntimeAnchorsSpec;
  seedOverride: number | null;
  propChaos: RuntimePropChaosOptions;
  propVisuals: RuntimePropVisualMode;
  propModels: PropModelLibrary | null;
  highVis: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toWorldPosition(anchor: RuntimeAnchor): WorldVec3 {
  return designToWorldVec3(anchor.pos);
}

function yawDegToRad(yawDeg: number | undefined): number {
  return designYawDegToWorldYawRad(yawDeg);
}

function overlapsRect2d(collider: RuntimeColliderAabb, rect: RuntimeRect): boolean {
  const minX = collider.min.x + CLEAR_ZONE_EPSILON;
  const maxX = collider.max.x - CLEAR_ZONE_EPSILON;
  const minZ = collider.min.z + CLEAR_ZONE_EPSILON;
  const maxZ = collider.max.z - CLEAR_ZONE_EPSILON;

  if (maxX <= rect.x || minX >= rect.x + rect.w) return false;
  if (maxZ <= rect.y || minZ >= rect.y + rect.h) return false;
  return true;
}

function pointInRect2d(x: number, z: number, rect: RuntimeRect): boolean {
  return x >= rect.x && x <= rect.x + rect.w && z >= rect.y && z <= rect.y + rect.h;
}

function isLandmarkAnchorType(type: string): boolean {
  const normalized = type.toLowerCase();
  return normalized === "landmark" || normalized === "hero_landmark";
}

function overlapLength(minA: number, maxA: number, minB: number, maxB: number): number {
  return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
}

function createColliderFromOrientedBox(
  id: string,
  center: WorldVec3,
  size: { x: number; y: number; z: number },
  yawRad: number,
): RuntimeColliderAabb {
  const halfY = size.y * 0.5;
  const absCos = Math.abs(Math.cos(yawRad));
  const absSin = Math.abs(Math.sin(yawRad));
  const halfX = absCos * size.x * 0.5 + absSin * size.z * 0.5;
  const halfZ = absSin * size.x * 0.5 + absCos * size.z * 0.5;

  return {
    id,
    kind: "prop",
    min: {
      x: center.x - halfX,
      y: center.y - halfY,
      z: center.z - halfZ,
    },
    max: {
      x: center.x + halfX,
      y: center.y + halfY,
      z: center.z + halfZ,
    },
  };
}

function createPointedGateRingGeometry(
  outerHalfWidth: number,
  innerHalfWidth: number,
  outerShoulderY: number,
  innerShoulderY: number,
  outerApexY: number,
  innerApexY: number,
  lowerY: number,
  depth: number,
  z: number,
): BufferGeometry {
  const ring = new Shape();
  ring.moveTo(-outerHalfWidth, lowerY);
  ring.lineTo(-outerHalfWidth, outerShoulderY);
  ring.lineTo(-outerHalfWidth * 0.92, outerShoulderY + (outerApexY - outerShoulderY) * 0.18);
  ring.lineTo(-outerHalfWidth * 0.7, outerShoulderY + (outerApexY - outerShoulderY) * 0.45);
  ring.lineTo(-outerHalfWidth * 0.4, outerShoulderY + (outerApexY - outerShoulderY) * 0.72);
  ring.lineTo(0, outerApexY);
  ring.lineTo(outerHalfWidth * 0.4, outerShoulderY + (outerApexY - outerShoulderY) * 0.72);
  ring.lineTo(outerHalfWidth * 0.7, outerShoulderY + (outerApexY - outerShoulderY) * 0.45);
  ring.lineTo(outerHalfWidth * 0.92, outerShoulderY + (outerApexY - outerShoulderY) * 0.18);
  ring.lineTo(outerHalfWidth, outerShoulderY);
  ring.lineTo(outerHalfWidth, lowerY);
  // Trace the inner arch in reverse as part of the same open-bottom polygon.
  // A traditional Shape hole needs a thin bridge along its lower edge, which
  // became the implausible cross-lane bar visible in player-height shots.
  ring.lineTo(innerHalfWidth, lowerY);
  ring.lineTo(innerHalfWidth, innerShoulderY);
  ring.lineTo(innerHalfWidth * 0.92, innerShoulderY + (innerApexY - innerShoulderY) * 0.18);
  ring.lineTo(innerHalfWidth * 0.7, innerShoulderY + (innerApexY - innerShoulderY) * 0.45);
  ring.lineTo(innerHalfWidth * 0.4, innerShoulderY + (innerApexY - innerShoulderY) * 0.72);
  ring.lineTo(0, innerApexY);
  ring.lineTo(-innerHalfWidth * 0.4, innerShoulderY + (innerApexY - innerShoulderY) * 0.72);
  ring.lineTo(-innerHalfWidth * 0.7, innerShoulderY + (innerApexY - innerShoulderY) * 0.45);
  ring.lineTo(-innerHalfWidth * 0.92, innerShoulderY + (innerApexY - innerShoulderY) * 0.18);
  ring.lineTo(-innerHalfWidth, innerShoulderY);
  ring.lineTo(-innerHalfWidth, lowerY);
  ring.closePath();

  const geometry = new ExtrudeGeometry(ring, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, z - depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function createNonIndexedBoxPart(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): BufferGeometry {
  const indexed = boxPart(width, height, depth, x, y, z);
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  return geometry;
}

function createNonIndexedAngledBoxPart(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rollRad: number,
): BufferGeometry {
  const indexed = angledBoxPart(width, height, depth, x, y, z, rollRad);
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  return geometry;
}

function createHeroGateCrownGeometry(): BufferGeometry {
  // The outer gable and the sealed threshold now share one bearing seam.
  // At the authored 13 m x 7 m envelope, this 0.25 half-opening resolves to
  // 6.5 m: the exact outer width of the 5.7 m portal plus its 0.7 m frame.
  // Its shoulder/apex also land on the frame's normalized profile, removing
  // the former unrelated 11 m opening nested around a small warehouse door.
  const mainRing = createPointedGateRingGeometry(0.5, 0.25, 0.035, -0.02, 0.49, 0.265, -0.03, 1, 0);
  const frontTrim = createPointedGateRingGeometry(0.478, 0.257, 0.055, -0.015, 0.465, 0.275, -0.018, 0.08, -0.46);
  const rearTrim = createPointedGateRingGeometry(0.478, 0.257, 0.055, -0.015, 0.465, 0.275, -0.018, 0.08, 0.46);

  // One seated keystone masks the mirrored UV join. The former scattered
  // spring/course blocks and deep-face teal tiles projected beyond the gable
  // as unsupported roof fins.
  const frontKeystone = createNonIndexedBoxPart(0.075, 0.105, 0.09, 0, 0, 0);
  frontKeystone.rotateZ(Math.PI * 0.25);
  frontKeystone.translate(0, 0.425, -0.49);
  const rearKeystone = frontKeystone.clone();
  rearKeystone.translate(0, 0, 0.98);

  // The canonical crown owns the complete raking edge. Keeping these pieces
  // on the same normalized pointed profile prevents a second architecture
  // datum from producing an offset triangle or a detached shoulder slab.
  const slopeAngleRad = Math.atan2(0.49 - 0.035, 0.5);
  const slopeLength = Math.hypot(0.468, 0.426);
  // Face-seated bargeboards replace the former full-depth raking boxes. Those
  // boxes exposed broad top planes from the reverse camera and looked like a
  // duplicate triangular roof penetrating the brick pediment.
  const rakingCopings: BufferGeometry[] = [];
  const shoulderCopings: BufferGeometry[] = [];
  for (const z of [-0.44, 0.44]) {
    rakingCopings.push(
      createNonIndexedAngledBoxPart(slopeLength, 0.03, 0.12, -0.246, 0.265, z, slopeAngleRad),
      createNonIndexedAngledBoxPart(slopeLength, 0.03, 0.12, 0.246, 0.265, z, -slopeAngleRad),
    );
    shoulderCopings.push(
      createNonIndexedBoxPart(0.15, 0.04, 0.12, -0.415, 0.052, z),
      createNonIndexedBoxPart(0.15, 0.04, 0.12, 0.415, 0.052, z),
    );
  }
  const leftArris = createNonIndexedBoxPart(0.028, 0.31, 1, -0.482, 0.19, 0);
  const rightArris = createNonIndexedBoxPart(0.028, 0.31, 1, 0.482, 0.19, 0);

  // Shallow inset tablets occupy only the masonry remaining outside/above the
  // pointed opening. They give the deep pediment a front/rear finish without
  // spanning the void or exceeding the exact authored depth envelope.
  const pedimentReliefs: BufferGeometry[] = [];
  for (const z of [-0.486, 0.486]) {
    for (const side of [-1, 1] as const) {
      pedimentReliefs.push(tintGeometry(
        createNonIndexedBoxPart(0.115, 0.07, 0.024, side * 0.36, 0.205, z),
        side === -1 ? [0.72, 0.58, 0.4] : [0.62, 0.48, 0.34],
      ));
    }
    // The former broad teal tablet sat proud of the raking roof edge and read
    // as a disconnected green plane from the authored Rug Gate camera. Keep
    // the relief on the masonry slopes themselves instead of spanning the
    // pediment with an unrelated floating plaque.
    for (const side of [-1, 1] as const) {
      const nestedSlope = createNonIndexedAngledBoxPart(
        0.3,
        0.024,
        0.024,
        side * 0.145,
        0.39,
        z,
        side === -1 ? 0.56 : -0.56,
      );
      pedimentReliefs.push(tintGeometry(nestedSlope, [0.72, 0.55, 0.34]));
    }
  }

  return mergeProceduralGeometry([
    tintGeometry(mainRing, [0.92, 0.86, 0.74]),
    tintGeometry(frontTrim, [1, 0.93, 0.8]),
    tintGeometry(rearTrim, [1, 0.93, 0.8]),
    tintGeometry(frontKeystone, [0.76, 0.67, 0.54]),
    tintGeometry(rearKeystone, [0.76, 0.67, 0.54]),
    ...rakingCopings.map((geometry) => tintGeometry(geometry, [0.84, 0.76, 0.62])),
    ...shoulderCopings.map((geometry) => tintGeometry(geometry, [0.7, 0.61, 0.47])),
    tintGeometry(leftArris, [0.7, 0.61, 0.47]),
    tintGeometry(rightArris, [0.7, 0.61, 0.47]),
    ...pedimentReliefs,
  ]);
}

function createHeroGatePillarGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    tintGeometry(boxPart(1, 0.08, 1, 0, -0.46, 0), [0.48, 0.37, 0.25]),
    tintGeometry(boxPart(0.94, 0.16, 0.96, 0, -0.34, 0), [0.58, 0.45, 0.3]),
    tintGeometry(boxPart(0.84, 0.68, 0.88, 0, 0.02, 0), [0.65, 0.51, 0.34]),
    tintGeometry(boxPart(0.92, 0.07, 0.96, 0, 0.365, 0), [0.73, 0.59, 0.41]),
    tintGeometry(boxPart(1, 0.1, 1, 0, 0.45, 0), [0.8, 0.67, 0.48]),
  ];
  for (const [index, y] of [-0.21, -0.02, 0.17].entries()) {
    parts.push(tintGeometry(
      boxPart(index % 2 === 0 ? 0.94 : 0.88, 0.035, 0.97, 0, y, 0),
      index % 2 === 0 ? [0.75, 0.61, 0.42] : [0.55, 0.42, 0.28],
    ));
  }
  parts.push(tintGeometry(boxPart(0.9, 0.035, 0.99, 0, 0.265, 0), [0.07, 0.25, 0.29]));

  return mergeProceduralGeometry(parts);
}

function createHeroGateInnerFrameGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    tintGeometry(
      createPointedGateRingGeometry(0.5, 0.405, 0.08, 0.13, 0.5, 0.4, -0.5, 1, 0),
      [0.82, 0.7, 0.52],
    ),
    tintGeometry(
      createPointedGateRingGeometry(0.405, 0.37, 0.13, 0.15, 0.4, 0.365, -0.5, 0.78, 0.08),
      [0.5, 0.39, 0.28],
    ),
  ];
  const revealZ = -0.47;
  const outerRight = [
    { x: 0.5, y: 0.08 },
    { x: 0.46, y: 0.1556 },
    { x: 0.35, y: 0.269 },
    { x: 0.2, y: 0.3824 },
    { x: 0, y: 0.5 },
  ] as const;
  const innerRight = [
    { x: 0.405, y: 0.13 },
    { x: 0.3726, y: 0.1786 },
    { x: 0.2835, y: 0.2515 },
    { x: 0.162, y: 0.3244 },
    { x: 0, y: 0.4 },
  ] as const;
  const lerpPoint = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    t: number,
  ): { x: number; y: number } => ({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  });

  // Course the two jambs from the paving datum to the shared spring line.
  // The blocks remain inside the normalized arch envelope and project only
  // into the existing reveal depth, so the authored portal stays fully open.
  for (const side of [-1, 1] as const) {
    for (const [courseIndex, y] of [-0.41, -0.29, -0.17, -0.05].entries()) {
      const frontCourse = createNonIndexedBoxPart(0.105, 0.1, 0.075, side * 0.452, y, revealZ);
      const rearCourse = frontCourse.clone();
      rearCourse.translate(0, 0, 0.94);
      const courseTint = courseIndex % 2 === 0 ? [0.92, 0.8, 0.6] as const : [0.72, 0.58, 0.4] as const;
      parts.push(tintGeometry(frontCourse, courseTint), tintGeometry(rearCourse, courseTint));
    }

    // True wedge polygons follow each segment of the pointed intrados and
    // extrados. A small interpolation gap exposes the darker backing ring as
    // mortar, so these read as radial voussoirs instead of applied chevrons.
    for (let courseIndex = 0; courseIndex < outerRight.length - 1; courseIndex += 1) {
      for (let subdivision = 0; subdivision < 2; subdivision += 1) {
        const segmentStart = subdivision * 0.5;
        const segmentEnd = segmentStart + 0.5;
        const outerStart = lerpPoint(
          outerRight[courseIndex]!,
          outerRight[courseIndex + 1]!,
          segmentStart + 0.025,
        );
        const outerEnd = lerpPoint(
          outerRight[courseIndex]!,
          outerRight[courseIndex + 1]!,
          segmentEnd - 0.025,
        );
        const innerStart = lerpPoint(
          innerRight[courseIndex]!,
          innerRight[courseIndex + 1]!,
          segmentStart + 0.025,
        );
        const innerEnd = lerpPoint(
          innerRight[courseIndex]!,
          innerRight[courseIndex + 1]!,
          segmentEnd - 0.025,
        );
        const wedge = new Shape();
        wedge.moveTo(side * outerStart.x, outerStart.y);
        wedge.lineTo(side * outerEnd.x, outerEnd.y);
        wedge.lineTo(side * innerEnd.x, innerEnd.y);
        wedge.lineTo(side * innerStart.x, innerStart.y);
        wedge.closePath();
        const geometry = new ExtrudeGeometry(wedge, {
          depth: 0.085,
          bevelEnabled: false,
          curveSegments: 1,
          steps: 1,
        });
        geometry.translate(0, 0, revealZ - 0.0425);
        geometry.computeVertexNormals();
        const rearGeometry = geometry.clone();
        rearGeometry.translate(0, 0, 0.94);
        const wedgeTint = (courseIndex * 2 + subdivision) % 2 === 0
          ? [0.96, 0.84, 0.64] as const
          : [0.74, 0.59, 0.41] as const;
        parts.push(tintGeometry(
          geometry,
          wedgeTint,
        ), tintGeometry(rearGeometry, wedgeTint));
      }
    }

    // Plinth and capital derive from the same jamb axis; neither bridges the
    // opening, and both retain a deliberate gap from the paving centerline.
    parts.push(tintGeometry(
      createNonIndexedBoxPart(0.22, 0.12, 0.16, side * 0.452, -0.44, revealZ),
      [0.58, 0.44, 0.3],
    ));
    parts.push(tintGeometry(
      createNonIndexedBoxPart(0.27, 0.035, 0.18, side * 0.452, -0.482, revealZ),
      [0.48, 0.36, 0.25],
    ));
    parts.push(tintGeometry(
      createNonIndexedBoxPart(0.23, 0.1, 0.16, side * 0.452, 0.095, revealZ),
      [0.88, 0.72, 0.5],
    ));
  }

  return mergeProceduralGeometry(parts);
}

function pushInstance(
  batch: InstanceBatch,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  yawRad: number,
): void {
  batch.instances.push({ x, y, z, sx, sy, sz, yawRad });
}

function resolveChaos(input: RuntimePropChaosOptions): ResolvedChaos {
  const defaults = PROFILE_DEFAULTS[input.profile];
  const jitter = clamp(input.jitter ?? defaults.jitter, 0, 1);
  const cluster = clamp(input.cluster ?? defaults.cluster, 0, 1);
  const density = clamp(input.density ?? defaults.density, 0, 1);
  const decorativeDropout = clamp(defaults.decorativeDropout * (1.2 - density * 0.75), 0.02, 0.55);

  return {
    profile: input.profile,
    jitter,
    cluster,
    density,
    decorativeDropout,
  };
}

function pickWeightedCount(rng: DeterministicRng, soloWeight: number, duoWeight: number, trioWeight: number): 1 | 2 | 3 {
  const total = soloWeight + duoWeight + trioWeight;
  if (total <= 0) return 1;
  const roll = rng.range(0, total);
  if (roll < soloWeight) return 1;
  if (roll < soloWeight + duoWeight) return 2;
  return 3;
}

function shouldDropDecorative(rng: DeterministicRng, chaos: ResolvedChaos, bonusKeep = 0): boolean {
  const chance = clamp(chaos.decorativeDropout - bonusKeep, 0, 0.8);
  return rng.next() < chance;
}

function createRunMask(count: number, chaos: ResolvedChaos, rng: DeterministicRng): boolean[] {
  if (count <= 0) return [];

  const targetFill = clamp(0.46 + 0.36 * chaos.density, 0.35, 0.84);
  const desiredFilled = clamp(Math.round(targetFill * count), 0, count);
  const fillMax = 1 + Math.round(1 + 3 * chaos.cluster);
  const gapMax = 1 + Math.round(2 + 6 * chaos.cluster);
  const mask = Array.from({ length: count }, () => false);

  let cursor = 0;
  let filled = 0;
  let runIsFill = rng.next() < targetFill;

  while (cursor < count) {
    const remaining = count - cursor;
    const remainingFillNeeded = desiredFilled - filled;

    if (remainingFillNeeded <= 0) {
      runIsFill = false;
    } else if (remainingFillNeeded >= remaining) {
      runIsFill = true;
    } else {
      const adaptiveFill = clamp(remainingFillNeeded / remaining, 0.05, 0.95);
      const noisyFill = clamp(
        adaptiveFill + rng.range(-0.28, 0.28) * (1 - chaos.cluster * 0.45),
        0.05,
        0.95,
      );
      runIsFill = rng.next() < noisyFill;
    }

    const runMax = runIsFill ? fillMax : gapMax;
    const runLength = Math.min(remaining, rng.int(1, runMax + 1));
    if (runIsFill) {
      for (let i = 0; i < runLength; i += 1) {
        mask[cursor + i] = true;
      }
      filled += runLength;
    }

    cursor += runLength;
    if (rng.next() < 0.8) {
      runIsFill = !runIsFill;
    }
  }

  if (filled === desiredFilled) {
    return mask;
  }

  const adjustRng = rng.fork("adjust");
  const order = Array.from({ length: count }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = adjustRng.int(0, i + 1);
    const temp = order[i]!;
    order[i] = order[j]!;
    order[j] = temp;
  }

  if (filled < desiredFilled) {
    for (const index of order) {
      if (mask[index]) continue;
      mask[index] = true;
      filled += 1;
      if (filled >= desiredFilled) break;
    }
  } else {
    for (const index of order) {
      if (!mask[index]) continue;
      mask[index] = false;
      filled -= 1;
      if (filled <= desiredFilled) break;
    }
  }

  return mask;
}

function buildAnchorLineGroups(
  anchors: RuntimeAnchor[],
  typeTag: "shopfront_anchor" | "signage_anchor",
): AnchorLineGroup[] {
  const pointsByGroup = new Map<string, LineRhythmPoint[]>();

  for (const anchor of anchors) {
    const base = toWorldPosition(anchor);
    const yawDeg = Math.round(anchor.yawDeg ?? 0);
    const yawRad = yawDegToRad(anchor.yawDeg);
    const tangentX = Math.cos(yawRad);
    const tangentZ = -Math.sin(yawRad);
    const along = base.x * tangentX + base.z * tangentZ;
    const groupKey = `${anchor.zone}|${typeTag}|${yawDeg}`;
    const points = pointsByGroup.get(groupKey);

    const point: LineRhythmPoint = {
      anchor,
      base,
      along,
    };
    if (points) {
      points.push(point);
    } else {
      pointsByGroup.set(groupKey, [point]);
    }
  }

  const sortedGroupKeys = [...pointsByGroup.keys()].sort((a, b) => a.localeCompare(b));
  const groups: AnchorLineGroup[] = [];
  for (const groupKey of sortedGroupKeys) {
    const points = pointsByGroup.get(groupKey)!;
    points.sort((a, b) => {
      if (a.along !== b.along) return a.along - b.along;
      return a.anchor.id.localeCompare(b.anchor.id);
    });
    groups.push({
      key: groupKey,
      points,
    });
  }

  return groups;
}

function buildLinePresenceMask(
  groups: AnchorLineGroup[],
  chaos: ResolvedChaos,
  rngRoot: DeterministicRng,
): Set<string> {
  const visible = new Set<string>();

  for (const group of groups) {
    const groupRng = rngRoot.fork(group.key);
    const points = group.points;
    const mask = createRunMask(points.length, chaos, groupRng);
    for (let i = 0; i < points.length; i += 1) {
      if (!mask[i]) continue;
      visible.add(points[i]!.anchor.id);
    }
  }

  return visible;
}

function sampleClusteredGroupTs(rng: DeterministicRng, count: number, cluster: number): number[] {
  if (count <= 0) return [];
  const centerCount = count === 1 ? 1 : (rng.next() < 0.62 + cluster * 0.28 ? 1 : 2);
  const centers: number[] = [];

  for (let i = 0; i < centerCount; i += 1) {
    let center = rng.range(0.12, 0.88);
    if (centerCount === 2 && i === 1 && Math.abs(center - centers[0]!) < 0.22) {
      center = clamp(center + (center < 0.5 ? 0.22 : -0.22), 0.12, 0.88);
    }
    centers.push(center);
  }

  const spread = clamp(0.34 - cluster * 0.22, 0.08, 0.34);
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const center = centers[rng.int(0, centers.length)]!;
    const t = clamp(center + rng.range(-spread, spread), 0.08, 0.92);
    values.push(t);
  }

  values.sort((a, b) => a - b);
  return values;
}

const HANGING_KINDS = new Set<PropPlacementKind>([
  "canopy",
  "serviceDoor",
  "signage",
  "heroLintel",
  "lantern",
]);

const WALL_OFFSET_KINDS = new Set<PropPlacementKind>([
  "serviceDoor",
  "signage",
  "lantern",
  "heroLintel",
]);

const TOP_ALIGN_KINDS = new Set<PropPlacementKind>([
  "canopy",
  "serviceDoor",
  "signage",
]);

const MODEL_POOLS_BY_KIND: Record<PropPlacementKind, readonly string[]> = {
  shopfront: ["pp_market_stand"],
  canopy: ["pp_curtains_double"],
  serviceDoor: ["pp_curtains_double"],
  thresholdRug: ["pp_rug", "pp_round_rug", "pp_rug_rectangle"],
  signage: ["pp_rug_rectangle"],
  cover: ["ph_wooden_crate_02", "ph_Barrel_02"],
  spawnCover: ["ph_wooden_crate_02", "ph_Barrel_02"],
  filler: [
    "pp_bags",
    "pp_bag_open",
    "pp_fruit_crate",
    "ph_ceramic_pot",
    "ph_jug_01",
    "ph_wicker_basket_02",
  ],
  heroPillar: [],
  heroLintel: [],
  landmarkWell: [],
  fountainStone: [],
  fountainTile: [],
  fountainWater: [],
  landmarkCart: [],
  lantern: ["ph_wooden_lantern_01"],
  produce: [],
};

const MODEL_BACKED_FINAL_KINDS = new Set<PropPlacementKind>([
  "cover",
  "spawnCover",
  "filler",
  "lantern",
]);

const FINAL_HIDDEN_PROXY_KINDS = new Set<PropPlacementKind>([
  "produce",
  "landmarkCart",
]);

const RUG_MODEL_IDS = new Set<string>([
  "pp_rug",
  "pp_round_rug",
  "pp_rug_rectangle",
]);

function chooseDeterministicModelId(
  placement: PropPlacement,
  propModels: PropModelLibrary,
  rngRoot: DeterministicRng,
): string | null {
  const rng = rngRoot.fork(`${placement.id}:${placement.anchorId}:${placement.kind}`);
  let pool = MODEL_POOLS_BY_KIND[placement.kind];

  if (placement.kind === "canopy") {
    // Skip tiny canopy spans; they read as thin artifacts from distance.
    if (placement.transform.sx < 2.4) {
      return null;
    }
  } else if (placement.kind === "filler") {
    const footprint = Math.max(placement.transform.sx, placement.transform.sz);
    if (footprint >= 1.0) {
      pool = ["ph_wooden_crate_02", "pp_fruit_crate", "pp_bags"];
    } else {
      pool = ["ph_wicker_basket_02", "ph_ceramic_pot", "ph_jug_01", "pp_bag_open"];
    }
  }

  const available = pool.filter((modelId) => propModels.hasModel(modelId));
  if (available.length === 0) {
    return null;
  }
  if (available.length === 1) {
    return available[0]!;
  }
  const index = rng.int(0, available.length);
  return available[index]!;
}

function computeUniformScaleFromAxes(
  target: { x: number; y: number; z: number },
  bboxSize: Vector3,
  axes: readonly ("x" | "y" | "z")[],
): number {
  const sx = target.x / Math.max(0.0001, bboxSize.x);
  const sy = target.y / Math.max(0.0001, bboxSize.y);
  const sz = target.z / Math.max(0.0001, bboxSize.z);
  const values = {
    x: sx,
    y: sy,
    z: sz,
  };
  let out = Number.POSITIVE_INFINITY;
  for (const axis of axes) {
    out = Math.min(out, values[axis]);
  }
  if (!Number.isFinite(out)) {
    return 1;
  }
  return clamp(out, 0.25, 8);
}

function computeKindAwareScale(
  kind: PropPlacementKind,
  target: { x: number; y: number; z: number },
  bboxSize: Vector3,
): number {
  if (kind === "shopfront") {
    const base = computeUniformScaleFromAxes(target, bboxSize, ["x", "y"]) * 1.16;
    const depthCap = computeUniformScaleFromAxes(target, bboxSize, ["z"]) * 18;
    return clamp(Math.min(base, depthCap), 0.55, 8);
  }
  if (kind === "serviceDoor") {
    const base = computeUniformScaleFromAxes(target, bboxSize, ["x", "y"]) * 1.08;
    const depthCap = computeUniformScaleFromAxes(target, bboxSize, ["z"]) * 8;
    return clamp(Math.min(base, depthCap), 0.4, 8);
  }
  if (kind === "canopy") {
    const stretched = computeUniformScaleFromAxes(target, bboxSize, ["x", "z"]) * 0.36;
    return clamp(stretched, 0.35, 2.2);
  }
  if (kind === "signage") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "y"]) * 1.16, 0.25, 8);
  }
  if (kind === "thresholdRug") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "z"]) * 1.16, 0.25, 8);
  }
  if (kind === "cover" || kind === "spawnCover") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "y", "z"]) * 1.16, 0.25, 8);
  }
  if (kind === "filler") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "y", "z"]) * 0.96, 0.2, 4);
  }
  if (kind === "heroPillar") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "y"]) * 1.18, 0.25, 8);
  }
  if (kind === "heroLintel") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "z"]) * 1.22, 0.25, 8);
  }
  if (kind === "landmarkWell") {
    return clamp(computeUniformScaleFromAxes(target, bboxSize, ["x", "y", "z"]) * 1.12, 0.25, 8);
  }
  return computeUniformScaleFromAxes(target, bboxSize, ["x", "y", "z"]);
}

function applyKindOrientation(model: Group, kind: PropPlacementKind): void {
  if (kind === "signage") {
    model.rotation.x = -(Math.PI * 0.5);
    return;
  }
  if (kind === "canopy") {
    model.rotation.x = -(Math.PI * 0.5);
    return;
  }
  if (kind === "heroLintel") {
    model.rotation.x = -(Math.PI * 0.5);
  }
}

function applyRenderStabilityTweaks(
  model: Group,
  kind: PropPlacementKind,
  modelId: string,
): void {
  const isRugLike = RUG_MODEL_IDS.has(modelId) || kind === "thresholdRug";
  const isHanging = HANGING_KINDS.has(kind);

  model.traverse((node) => {
    const mesh = node as {
      isMesh?: boolean;
      castShadow?: boolean;
      receiveShadow?: boolean;
      frustumCulled?: boolean;
      material?: unknown;
    };
    if (!mesh.isMesh) return;

    mesh.frustumCulled = true;

    if (isRugLike || isHanging || kind === "filler") {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || typeof material !== "object") continue;
      const stableMaterial = material as {
        transparent?: boolean;
        depthWrite?: boolean;
        side?: number;
        polygonOffset?: boolean;
        polygonOffsetFactor?: number;
        polygonOffsetUnits?: number;
        needsUpdate?: boolean;
      };

      if (isRugLike) {
        stableMaterial.polygonOffset = true;
        stableMaterial.polygonOffsetFactor = -1;
        stableMaterial.polygonOffsetUnits = -1;
      }

      if (isHanging && stableMaterial.transparent === true) {
        stableMaterial.depthWrite = false;
      }

      if (kind === "canopy") {
        stableMaterial.side = DoubleSide;
      }

      stableMaterial.needsUpdate = true;
    }
  });
}

function applyShadowPolicy(
  model: Group,
  policy: RuntimeDressingPlacement["shadowPolicy"],
): void {
  const castShadow = policy === "cast_receive";
  const receiveShadow = policy === "cast_receive" || policy === "receive_only";
  model.traverse((node) => {
    const mesh = node as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
    if (!mesh.isMesh) return;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
  });
}

function resolveWallOffsetRange(kind: PropPlacementKind): { min: number; max: number } {
  if (kind === "signage" || kind === "serviceDoor") {
    return { min: 0.12, max: 0.2 };
  }
  if (kind === "canopy") {
    return { min: 0.08, max: 0.16 };
  }
  if (kind === "heroLintel") {
    return { min: 0.05, max: 0.1 };
  }
  return { min: 0.06, max: 0.12 };
}

function resolveForwardPlacementOffset(placement: PropPlacement): number {
  const depth = placement.colliderDims?.z ?? placement.transform.sz;
  if (placement.kind === "shopfront") {
    return Math.max(0.24, depth * 0.62);
  }
  if (placement.kind === "serviceDoor") {
    return 0.12;
  }
  if (placement.kind === "signage") {
    return 0.08;
  }
  return 0;
}

/**
 * A batch that declares `vertexColors` gets its per-instance tint through the
 * vertex color channel. Procedural geometry that never authored a `color`
 * attribute then samples the WebGL default — black — which multiplies both the
 * texture and the authored tint to zero. That is what renders the cover-goods
 * tarp as an untextured black wedge instead of striped cloth.
 */
function ensureBatchVertexColors(geometry: BufferGeometry, vertexColors: boolean): BufferGeometry {
  if (!vertexColors || geometry.hasAttribute("color")) return geometry;
  const vertexCount = geometry.getAttribute("position").count;
  geometry.setAttribute("color", new Float32BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3));
  return geometry;
}

function buildDressedGroup(
  placements: PropPlacement[],
  propModels: PropModelLibrary,
  seed: number,
): Group | null {
  if (placements.length === 0) return null;

  const dressedGroup = new Group();
  dressedGroup.name = "map-props-dressed";
  const rngRoot = new DeterministicRng(seed).fork("dressed-props");
  const bbox = new Box3();

  for (const placement of placements) {
    const modelId = chooseDeterministicModelId(placement, propModels, rngRoot);
    if (!modelId) continue;

    const model = propModels.instantiate(modelId);
    applyKindOrientation(model, placement.kind);
    applyRenderStabilityTweaks(model, placement.kind, modelId);
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    const orientedSize = bbox.getSize(new Vector3());

    const target = {
      x: placement.transform.sx,
      y: placement.transform.sy,
      z: placement.transform.sz,
    };

    if (placement.kind === "canopy") {
      const scaleX = clamp(target.x / Math.max(0.0001, orientedSize.x), 0.05, 20);
      const scaleY = clamp(target.y / Math.max(0.0001, orientedSize.y), 0.05, 20);
      const scaleZ = clamp(target.z / Math.max(0.0001, orientedSize.z), 0.05, 20);
      model.scale.set(
        model.scale.x * scaleX,
        model.scale.y * scaleY,
        model.scale.z * scaleZ,
      );
    } else {
      const fitScale = computeKindAwareScale(placement.kind, target, orientedSize);
      model.scale.multiplyScalar(fitScale);
    }

    model.updateMatrixWorld(true);
    bbox.setFromObject(model);

    const centerX = (bbox.min.x + bbox.max.x) * 0.5;
    const centerZ = (bbox.min.z + bbox.max.z) * 0.5;
    model.position.x -= centerX;
    model.position.z -= centerZ;

    if (TOP_ALIGN_KINDS.has(placement.kind)) {
      const topY = placement.transform.y + placement.transform.sy * 0.5;
      model.position.y += topY - bbox.max.y;
    } else {
      const baseY = placement.transform.y - placement.transform.sy * 0.5;
      model.position.y += baseY - bbox.min.y;
    }
    if (RUG_MODEL_IDS.has(modelId) && !HANGING_KINDS.has(placement.kind)) {
      model.position.y += 0.02;
    }

    const placementRoot = new Group();
    placementRoot.name = `prop-dressed-${placement.id}`;
    placementRoot.position.set(
      placement.transform.x,
      0,
      placement.transform.z,
    );
    placementRoot.rotation.set(0, placement.transform.yawRad, 0);

    const forwardOffset = resolveForwardPlacementOffset(placement);
    if (forwardOffset > 0) {
      placementRoot.position.x += -Math.sin(placement.transform.yawRad) * forwardOffset;
      placementRoot.position.z += -Math.cos(placement.transform.yawRad) * forwardOffset;
    }

    if (WALL_OFFSET_KINDS.has(placement.kind)) {
      const offsetRng = rngRoot.fork(`wall-offset:${placement.id}`);
      const offsetRange = resolveWallOffsetRange(placement.kind);
      const wallOffset = offsetRng.range(offsetRange.min, offsetRange.max);
      placementRoot.position.x += -Math.sin(placement.transform.yawRad) * wallOffset;
      placementRoot.position.z += -Math.cos(placement.transform.yawRad) * wallOffset;
    }

    placementRoot.add(model);
    dressedGroup.add(placementRoot);
  }

  return dressedGroup.children.length > 0 ? dressedGroup : null;
}

type CompiledDressingBuild = {
  root: Group;
  renderedPlacements: RenderedPropPlacement[];
};

function instanceSharedStaticModelMeshes(
  root: Group,
  renderedPlacements: readonly RenderedPropPlacement[],
): void {
  const buckets = new Map<string, Mesh[]>();
  const canonicalPlacementByMesh = new WeakMap<Mesh, RenderedPropPlacement>();
  const preexistingInstancedPlacementIds = new Set<string>();
  root.traverse((object) => {
    const instances = object.userData.visualQaInstances;
    if (!Array.isArray(instances)) return;
    for (const instance of instances) {
      if (instance && typeof instance.placementId === "string") {
        preexistingInstancedPlacementIds.add(instance.placementId);
      }
    }
  });
  const renderedPlacementById = new Map(
    renderedPlacements
      .filter((placement) => (
        placement.representation === "model"
        && !preexistingInstancedPlacementIds.has(placement.placementId)
      ))
      .map((placement) => [placement.placementId, placement]),
  );
  const isShareableMesh = (object: Object3D): object is Mesh => {
    if (!(object instanceof Mesh) || object instanceof InstancedMesh) return false;
    if ((object as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh) return false;
    if (Array.isArray(object.material)) return false;
    const morphAttributes = object.geometry.morphAttributes;
    return !Object.values(morphAttributes).some((attributes) => Array.isArray(attributes) && attributes.length > 0);
  };

  root.traverse((object) => {
    if (!object.name.startsWith("v3-dressing-")) return;
    const placement = renderedPlacementById.get(object.name.slice("v3-dressing-".length));
    if (!placement) return;
    let canonicalMesh: Mesh | null = null;
    object.traverse((child) => {
      if (!canonicalMesh && isShareableMesh(child)) canonicalMesh = child;
    });
    if (canonicalMesh) canonicalPlacementByMesh.set(canonicalMesh, placement);
  });
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!isShareableMesh(object)) return;
    const material = object.material;
    if (Array.isArray(material)) return;
    if (material.transparent && material.side === DoubleSide) {
      material.forceSinglePass = true;
      material.needsUpdate = true;
    }
    const key = [
      object.geometry.uuid,
      material.uuid,
      object.castShadow ? "cast" : "no-cast",
      object.receiveShadow ? "receive" : "no-receive",
      object.renderOrder,
    ].join("|");
    const bucket = buckets.get(key);
    if (bucket) bucket.push(object);
    else buckets.set(key, [object]);
  });

  const rootInverse = new Matrix4().copy(root.matrixWorld).invert();
  const localMatrix = new Matrix4();
  const simplifyModifier = new SimplifyModifier();
  const simplifiedGeometryCache = new Map<string, BufferGeometry>();
  const resolveRepeatedPropGeometry = (mesh: Mesh): BufferGeometry => {
    const name = mesh.name.toLowerCase();
    const keepRatio = name.includes("wicker_basket_02_base")
      ? 0.32
      : name.includes("wicker_basket_02_lid")
        ? 0.34
        : name.includes("wooden_crate_01")
          ? 0.45
          : name === "cube001"
            ? 0.5
            : name.includes("brass_pot_01") || name.includes("ceramic_pot")
              ? 0.72
              : name.includes("wine_barrel_01")
                ? 0.45
                : 1;
    if (keepRatio >= 1) return mesh.geometry;
    const cached = simplifiedGeometryCache.get(mesh.geometry.uuid);
    if (cached) return cached;
    const positions = mesh.geometry.getAttribute("position");
    const removeCount = Math.max(0, Math.floor(positions.count * (1 - keepRatio)));
    if (removeCount < 8) return mesh.geometry;
    const simplified = simplifyModifier.modify(mesh.geometry.clone(), removeCount);
    simplified.userData.sourceGeometryUuid = mesh.geometry.uuid;
    simplified.userData.lodKeepRatio = keepRatio;
    simplifiedGeometryCache.set(mesh.geometry.uuid, simplified);
    return simplified;
  };
  let batchIndex = 0;
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0]!;
    if (Array.isArray(first.material)) continue;
    const batch = new InstancedMesh(resolveRepeatedPropGeometry(first), first.material, meshes.length);
    batch.name = `v3-shared-model-batch-${batchIndex++}-${first.name || "mesh"}`;
    const meshName = first.name.toLowerCase();
    const usesPrimaryGroundingShadow = !(
      meshName.includes("wicker_basket_02_lid")
      || meshName.includes("ceramic_pot")
      || meshName.includes("wooden_lantern_01_handle")
      || meshName.includes("painted_wooden_stool")
      || meshName === "cube001"
      || meshName === "cube004"
    );
    batch.castShadow = first.castShadow && usesPrimaryGroundingShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    batch.frustumCulled = true;
    batch.userData.materialId = first.userData.materialId;
    const visualQaInstances = meshes.map((mesh) => {
      const placement = canonicalPlacementByMesh.get(mesh);
      if (!placement) return null;
      return {
        placementId: placement.placementId,
        anchorId: placement.anchorId,
        assetId: placement.assetId,
        moduleId: placement.moduleId,
        semanticClass: placement.semanticClass,
        representation: placement.representation,
        materialMode: placement.materialMode,
        groundingGapM: placement.groundingGapM,
        dimensions: {
          x: placement.dimensionsM.width,
          y: placement.dimensionsM.height,
          z: placement.dimensionsM.depth,
        },
        shadowMode: placement.shadowMode,
      };
    });
    if (visualQaInstances.some(Boolean)) batch.userData.visualQaInstances = visualQaInstances;
    for (let index = 0; index < meshes.length; index += 1) {
      const mesh = meshes[index]!;
      localMatrix.multiplyMatrices(rootInverse, mesh.matrixWorld);
      batch.setMatrixAt(index, localMatrix);
      mesh.parent?.remove(mesh);
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox();
    batch.computeBoundingSphere();
    root.add(batch);
  }

  const pruneEmptyGroups = (parent: Object3D): void => {
    for (const child of [...parent.children]) {
      pruneEmptyGroups(child);
      if (child instanceof Group && child.children.length === 0) parent.remove(child);
    }
  };
  pruneEmptyGroups(root);
}

/**
 * Objects resting on the pavement have no ambient occlusion of their own: the
 * sun is high, so a shaded cluster casts almost nothing, and every crate, pot
 * and rug meets the flagstones on a hard unshaded seam that reads as a decal
 * pasted onto the ground. A soft radial occlusion quad under each grounded
 * dressing footprint supplies the contact the lighting rig cannot.
 */
function createGroundContactTexture(): DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size - 0.5;
      const ny = (y + 0.5) / size - 0.5;
      const radial = Math.min(1, Math.hypot(nx, ny) / 0.5);
      // Hold the occlusion across the footprint and release it over the outer
      // third, so the darkening still reads where an object actually meets the
      // ground instead of fading out before it clears the object's silhouette.
      const t = Math.max(0, Math.min(1, (1 - radial) / 0.42));
      const core = t * t * (3 - 2 * t);
      const alpha = Math.max(0, Math.min(0.54, core * 0.54));
      const offset = (y * size + x) * 4;
      data[offset] = 34;
      data[offset + 1] = 27;
      data[offset + 2] = 20;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.name = "prop-ground-contact-occlusion";
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createGroundContactGeometry(): BufferGeometry {
  const geometry = new PlaneGeometry(1, 1, 1, 1);
  geometry.rotateX(-Math.PI * 0.5);
  return geometry;
}

function buildCompiledDressing(
  options: BuildPropsOptions,
  placements: readonly RuntimeDressingPlacement[],
): CompiledDressingBuild {
  const root = new Group();
  root.name = "map-props-v3-compiled";
  const renderedPlacements: RenderedPropPlacement[] = [];
  const anchorTypeById = new Map(options.anchors.anchors.map((anchor) => [anchor.id, anchor.type.toLowerCase()]));
  const batches = {
    signBoardA: createBatch("v3-sign-board-handpainted-a", 0xffffff, "signage", () => new BoxGeometry(1, 1, 1), {
      castShadow: true,
      roughness: 0.82,
      textureGenerator: "painted-wood-sign-a",
    }),
    signBoardB: createBatch("v3-sign-board-handpainted-b", 0xffffff, "signage", () => new BoxGeometry(1, 1, 1), {
      castShadow: true,
      roughness: 0.84,
      textureGenerator: "painted-wood-sign-b",
    }),
    signBoardC: createBatch("v3-sign-board-handpainted-c", 0xffffff, "signage", () => new BoxGeometry(1, 1, 1), {
      castShadow: true,
      roughness: 0.8,
      textureGenerator: "painted-wood-sign-c",
    }),
    signFrame: createBatch("v3-sign-frame", 0x2d2118, "signage", createSignFrameGeometry, {
      castShadow: false,
      roughness: 0.86,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [1.8, 1.2],
      materialId: "ph_rough_pine_door",
    }),
    signRig: createBatch("v3-sign-forged-rod-ring-rig", 0x51483f, "signage", createSignRigGeometry, {
      castShadow: false,
      roughness: 0.54,
      metalness: 0.48,
    }),
    laundryRope: createBatch("v3-overhead-laundry-rope", 0x8f7555, "canopy", createLaundryLineGeometry, {
      castShadow: true,
      roughness: 0.96,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [7.5, 0.45],
      materialId: "ph_rough_pine_door",
      normalScale: 0.28,
    }),
    laundryLanterns: createBatch("v3-overhead-laundry-lanterns", 0xffffff, "canopy", createLaundryLanternGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_arm_1k.jpg",
      textureRepeat: [0.7, 0.9],
      materialId: "ph_rusty_metal_02",
      roughness: 0.68,
      metalness: 0.34,
      normalScale: 0.38,
      vertexColors: true,
    }),
    laundryBundles: createBatch("v3-overhead-laundry-bundles", 0xffffff, "canopy", createLaundryBundleGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.8, 0.9],
      roughness: 0.98,
      normalScale: 0.2,
      albedoBoost: 1.08,
      vertexColors: true,
    }),
    laundryDropRopes: createBatch("v3-overhead-laundry-drop-ropes", 0x8f7555, "canopy", () => createUnitRopeGeometry("y"), {
      castShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [0.35, 2.4],
      materialId: "ph_rough_pine_door",
      roughness: 0.96,
      normalScale: 0.28,
    }),
    laundryClothA: createBatch("v3-overhead-laundry-cloth-a", 0xffffff, "canopy", () => createLaundryClothGeometry(0), {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.85, 0.85],
      roughness: 0.98,
      albedoBoost: 1.2,
      vertexColors: true,
    }),
    laundryClothB: createBatch("v3-overhead-laundry-cloth-b", 0xffffff, "canopy", () => createLaundryClothGeometry(1), {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [0.7, 0.72],
      roughness: 0.98,
      albedoBoost: 1.2,
      vertexColors: true,
    }),
    laundryClothDyers: createBatch("v3-overhead-laundry-cloth-dyers", 0xffffff, "canopy", () => createLaundryClothGeometry(2), {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.72, 0.8],
      roughness: 0.98,
      albedoBoost: 1.08,
      vertexColors: true,
    }),
    laundryClipsA: createBatch("v3-overhead-laundry-clips-a", 0xffffff, "canopy", () => createLaundryClipGeometry(0), {
      castShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [0.6, 0.6],
      roughness: 0.9,
      normalScale: 0.3,
    }),
    laundryClipsB: createBatch("v3-overhead-laundry-clips-b", 0xffffff, "canopy", () => createLaundryClipGeometry(1), {
      castShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [0.6, 0.6],
      roughness: 0.9,
      normalScale: 0.3,
    }),
    laundryClipsDyers: createBatch("v3-overhead-laundry-clips-dyers", 0xffffff, "canopy", () => createLaundryClipGeometry(2), {
      castShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [0.6, 0.6],
      roughness: 0.9,
      normalScale: 0.3,
    }),
    canopy: createBatch("v3-canopy-cloth", 0xffffff, "canopy", createClothGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/canopy_stripe_albedo_v1.jpg",
      textureRepeat: [0.75, 1],
      roughness: 0.97,
      vertexColors: true,
    }),
    canopyValance: createBatch("v3-canopy-scalloped-valance", 0xffffff, "canopy", createCanopyScallopedValanceGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/canopy_stripe_albedo_v1.jpg",
      textureRepeat: [0.75, 0.32],
      roughness: 0.97,
      vertexColors: true,
    }),
    canopyEdgeRopes: createBatch("v3-canopy-edge-ropes", 0x96734d, "canopy", () => createUnitRopeGeometry("z"), {
      castShadow: false,
      roughness: 0.93,
    }),
    canopyCrossRopes: createBatch("v3-canopy-cross-ropes", 0x96734d, "canopy", () => createUnitRopeGeometry("x"), {
      castShadow: false,
      roughness: 0.93,
    }),
    canopyHangRopes: createBatch("v3-canopy-hang-ropes", 0x96734d, "canopy", () => createUnitRopeGeometry("y"), {
      castShadow: false,
      roughness: 0.93,
    }),
    canopyFixtures: createBatch("v3-canopy-rings-brackets", 0x6b5943, "canopy", createCanopyFixtureGeometry, {
      castShadow: false,
      roughness: 0.7,
      metalness: 0.2,
    }),
    canopyTrestles: createBatch("v3-canopy-wall-trestles", 0xffffff, "shopfront", createCanopyTrestleGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [2.2, 0.9],
      materialId: "ph_rough_pine_door",
      roughness: 0.88,
      normalScale: 0.36,
      vertexColors: true,
    }),
    stallStructure: createBatch("v3-market-stall-timber-structure", 0xffffff, "shopfront", createMarketStallGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_arm_1k.jpg",
      textureRepeat: [2.2, 2.2],
      materialId: "ph_wooden_table_02",
      roughness: 0.9,
      normalScale: 0.35,
      vertexColors: true,
    }),
    stallBackboard: createBatch("v3-market-stall-slatted-back", 0xffffff, "shopfront", createMarketStallSlattedBackGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_arm_1k.jpg",
      textureRepeat: [1.8, 1.8],
      materialId: "ph_wooden_table_02",
      roughness: 0.92,
      normalScale: 0.32,
      vertexColors: true,
    }),
    stallShelf: createBatch("v3-market-stall-display-shelves", 0xffffff, "shopfront", () => new BoxGeometry(1, 1, 1), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_arm_1k.jpg",
      textureRepeat: [1.5, 1.5],
      materialId: "ph_wooden_table_02",
      roughness: 0.88,
      normalScale: 0.34,
    }),
    stallHeader: createBatch("v3-market-stall-served-header", 0xffffff, "shopfront", () => new BoxGeometry(1, 1, 1), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [1.25, 0.8],
      materialId: "ph_rough_pine_door",
      roughness: 0.84,
      normalScale: 0.38,
      albedoBoost: 1.35,
    }),
    stallCanopy: createBatch("v3-market-stall-cloth-canopy", 0xffffff, "canopy", createMarketStallCanopyGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.75, 1],
      roughness: 0.97,
      vertexColors: true,
    }),
    stallValance: createBatch("v3-market-stall-scalloped-valance", 0xffffff, "canopy", createCanopyScallopedValanceGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.75, 0.32],
      roughness: 0.97,
      vertexColors: true,
    }),
    stallRug: createBatch("v3-market-stall-ground-rug", 0xffffff, "thresholdRug", () => createGroundRugGeometry(1), {
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [1.15, 1.05],
      roughness: 0.98,
    }),
    dyersWorkstationStone: createBatch("v3-dyers-workstation-stone-apron", 0xffffff, "filler", createDyersWorkstationStoneGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [2.2, 1.7],
      materialId: "ph_white_sandstone_blocks_02",
      roughness: 0.88,
      normalScale: 0.6,
    }),
    dyersWorkstationIndigoBasin: createBatch("v3-dyers-workstation-indigo-basin-shell", 0xffffff, "filler", createDyersWorkstationIndigoBasinGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [1.6, 1.4],
      materialId: "ph_white_sandstone_blocks_02_dyed_indigo",
      roughness: 0.72,
      normalScale: 0.56,
    }),
    dyersWorkstationMadderBasin: createBatch("v3-dyers-workstation-madder-basin-shell", 0xffffff, "filler", createDyersWorkstationMadderBasinGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [1.6, 1.4],
      materialId: "ph_white_sandstone_blocks_02_dyed_madder",
      roughness: 0.74,
      normalScale: 0.56,
    }),
    dyersWorkstationTimber: createBatch("v3-dyers-workstation-drying-rack", 0xffffff, "filler", createDyersWorkstationTimberGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [1.8, 1.5],
      materialId: "ph_rough_pine_door",
      roughness: 0.9,
      normalScale: 0.36,
    }),
    dyersWorkstationTextile: createBatch("v3-dyers-workstation-drying-textiles", 0xffffff, "filler", createDyersWorkstationTextileGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [0.8, 0.9],
      roughness: 0.97,
      albedoBoost: 1.12,
      vertexColors: true,
    }),
    dyersWorkstationIndigo: createBatch("v3-dyers-workstation-indigo-bath", 0x244e67, "filler", createDyersWorkstationIndigoGeometry, {
      receiveShadow: true,
      roughness: 0.2,
      metalness: 0.02,
    }),
    dyersWorkstationMadder: createBatch("v3-dyers-workstation-madder-bath", 0x8b3a35, "filler", createDyersWorkstationMadderGeometry, {
      receiveShadow: true,
      roughness: 0.24,
      metalness: 0.02,
    }),
    dyersWorkstationDrain: createBatch("v3-dyers-workstation-drainage-tools", 0xffffff, "filler", createDyersWorkstationDrainGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_arm_1k.jpg",
      textureRepeat: [1.4, 1.4],
      materialId: "ph_rusty_metal_02",
      roughness: 0.68,
      metalness: 0.42,
      normalScale: 0.48,
    }),
    dyersWorkstationWetApron: createBatch("v3-dyers-workstation-wet-contact-apron", 0xffffff, "filler", createDyersWorkstationWetApronGeometry, {
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [1.2, 1.2],
      materialId: "ph_white_sandstone_blocks_02_wet_dye",
      roughness: 0.38,
      normalScale: 0.34,
      albedoBoost: 0.78,
      vertexColors: true,
    }),
    groundContact: createBatch("v3-prop-ground-contact", 0xffffff, "thresholdRug", createGroundContactGeometry, {
      castShadow: false,
      receiveShadow: false,
      roughness: 1,
      metalness: 0,
      albedoBoost: 1,
      textureGenerator: "prop-ground-contact",
    }),
    groundRug: createBatch("v3-main-lane-ground-rugs", 0xffffff, "thresholdRug", () => createGroundRugGeometry(0), {
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [1.05, 1.35],
      roughness: 0.98,
      albedoBoost: 1.45,
    }),
    marketCart: createBatch("v3-main-lane-market-carts", 0xffffff, "shopfront", createNormalizedCartGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [1.4, 1.4],
      materialId: "ph_rough_pine_door",
      roughness: 0.9,
      normalScale: 0.35,
      albedoBoost: 1.7,
      emissiveIntensity: 0.32,
      vertexColors: true,
    }),
    coverTarp: createBatch("v3-cover-goods-draped-tarp", 0xffffff, "thresholdRug", createCoverTarpGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.72, 0.72],
      roughness: 0.97,
      albedoBoost: 1.05,
      emissiveIntensity: 0,
      vertexColors: true,
    }),
    coverCrateHorizontal: createBatch("v3-cover-crate-horizontal-slat", 0xffffff, "filler", () => createCoverCrateGeometry(0), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [1.6, 1.35],
      materialId: "ph_rough_pine_door",
      roughness: 0.9,
      normalScale: 0.34,
      albedoBoost: 1.03,
      emissiveIntensity: 0,
      vertexColors: true,
    }),
    coverCratePainted: createBatch("v3-cover-crate-painted-vertical-slat", 0xffffff, "filler", () => createCoverCrateGeometry(1), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_arm_1k.jpg",
      textureRepeat: [1.1, 1.65],
      materialId: "ph_wooden_crate_02",
      roughness: 0.84,
      normalScale: 0.38,
      albedoBoost: 1.04,
      emissiveIntensity: 0,
      vertexColors: true,
    }),
    coverCrateBraced: createBatch("v3-cover-crate-diagonal-braced", 0xffffff, "filler", () => createCoverCrateGeometry(2), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_arm_1k.jpg",
      textureRepeat: [1.45, 1.2],
      materialId: "ph_wooden_crate_01",
      roughness: 0.94,
      normalScale: 0.3,
      albedoBoost: 1.02,
      emissiveIntensity: 0,
      vertexColors: true,
    }),
    stallHangingTextile: createBatch("v3-market-stall-hanging-goods", 0xffffff, "thresholdRug", () => createHangingTextileGeometry(2), {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [0.7, 1.25],
      roughness: 0.97,
      vertexColors: true,
    }),
    dyersWorkshopTextiles: createBatch("v3-dyers-workshop-textile-bolts", 0xffffff, "thresholdRug", createDyersWorkshopTextileGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [0.72, 0.9],
      roughness: 0.96,
      albedoBoost: 1.18,
      vertexColors: true,
    }),
    stallHangerCord: createBatch("v3-market-stall-hanger-cords", 0x74583b, "canopy", () => new CylinderGeometry(0.5, 0.5, 1, 6), {
      castShadow: false,
      roughness: 0.94,
    }),
    stallTieRing: createBatch("v3-market-stall-canopy-tie-rings", 0x6b5943, "canopy", () => new TorusGeometry(0.5, 0.12, 6, 12), {
      castShadow: false,
      roughness: 0.72,
      metalness: 0.18,
    }),
    spiceBaskets: createBatch("v3-spice-shallow-baskets", 0x8b5c32, "filler", createShallowSpiceBasketGeometry, {
      castShadow: false,
      roughness: 0.92,
    }),
    spiceMoundGold: createBatch("v3-spice-mound-gold", 0xb97826, "filler", createSpiceMoundGeometry, {
      castShadow: false,
      roughness: 1,
    }),
    spiceMoundRust: createBatch("v3-spice-mound-rust", 0x8f3c24, "filler", createSpiceMoundGeometry, {
      castShadow: false,
      roughness: 1,
    }),
    spiceMoundOchre: createBatch("v3-spice-mound-ochre", 0xc89a42, "filler", createSpiceMoundGeometry, {
      castShadow: false,
      roughness: 1,
    }),
    spiceBalance: createBatch("v3-spice-merchant-balance", 0x66503a, "filler", createMerchantBalanceGeometry, {
      castShadow: true,
      roughness: 0.58,
      metalness: 0.22,
    }),
    fountainStone: createBatch("v3-fountain-modular-stone", 0xd0bd9c, "fountainStone", createModularFountainStoneGeometry, {
      castShadow: true,
      receiveShadow: true,
      materialId: FOUNTAIN_STONE_MATERIAL_ID,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [3.1, 2.7],
      roughness: 0.9,
      normalScale: 0.68,
      albedoBoost: 0.88,
      emissiveIntensity: 0.015,
      vertexColors: true,
    }),
    fountainTile: createBatch("v3-fountain-glazed-tile-segments", 0xffffff, "fountainTile", createModularFountainTileGeometry, {
      receiveShadow: true,
      textureGenerator: "glazed-fountain-tile",
      roughness: 0.24,
      albedoBoost: 1,
      emissiveIntensity: 0.01,
      vertexColors: true,
      doubleSided: true,
    }),
    fountainDetails: createBatch("v3-fountain-damp-contact", 0xc8beaa, "fountainStone", createFountainDetailGeometry, {
      castShadow: false,
      receiveShadow: true,
      roughness: 0.58,
      metalness: 0,
      vertexColors: true,
    }),
    fountainWater: createBatch("v3-fountain-shallow-water", 0x2f7476, "fountainWater", createFountainWaterGeometry, {
      receiveShadow: true,
      materialStyle: "water",
      roughness: 0.12,
      metalness: 0.02,
      emissiveIntensity: 0,
    }),
    fountainBronze: createBatch("v3-fountain-bronze-spouts", 0x8f6332, "fountainTile", createFountainBronzeGeometry, {
      castShadow: true,
      roughness: 0.34,
      metalness: 0.68,
    }),
    fountainCourtAccent: createBatch("v3-fountain-court-tile-apron", 0xb89a6b, "thresholdRug", createFountainCourtAccentGeometry, {
      receiveShadow: true,
      roughness: 0.86,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [2.8, 2.8],
      normalScale: 0.52,
      albedoBoost: 0.82,
      vertexColors: true,
    }),
    courtPlanterStone: createBatch("v3-fountain-court-planter-stone", 0xb9a27b, "filler", createCourtPlanterStoneGeometry, {
      castShadow: true,
      receiveShadow: true,
      materialId: FOUNTAIN_STONE_MATERIAL_ID,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_plaster_02/white_plaster_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_plaster_02/white_plaster_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_plaster_02/white_plaster_02_arm_1k.jpg",
      textureRepeat: [1.35, 1.35],
      roughness: 0.9,
      normalScale: 0.35,
      albedoBoost: 0.88,
    }),
    courtPlanterSoil: createBatch("v3-fountain-court-planter-soil", 0x493526, "filler", createCourtPlanterSoilGeometry, {
      receiveShadow: true,
      roughness: 1,
    }),
    courtPlanterFoliage: createBatch("v3-fountain-court-planter-foliage", 0x42613c, "filler", createCourtPlanterFoliageGeometry, {
      castShadow: true,
      roughness: 0.92,
    }),
    hangingTextile: createBatch("v3-hanging-textile", 0xffffff, "thresholdRug", () => createDrapePanelGeometry(3), {
      castShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [0.9, 1.15],
      roughness: 0.97,
      vertexColors: true,
    }),
    heroPillar: createBatch("v3-rug-gate-pillars", 0xffffff, "heroPillar", createHeroGatePillarGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg",
      textureRepeat: [2.2, 3.8],
      roughness: 0.9,
      normalScale: 0.42,
      albedoBoost: 0.9,
      vertexColors: true,
      doubleSided: true,
    }),
    heroCrown: createBatch("v3-rug-gate-crown", 0xffffff, "heroLintel", createHeroGateCrownGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg",
      textureRepeat: [9, 4.6],
      roughness: 0.89,
      normalScale: 0.62,
      albedoBoost: 0.78,
      vertexColors: true,
    }),
    heroGateCoolTextile: createBatch("v3-rug-gate-cool-textile-kit", 0xffffff, "thresholdRug", () => (
      createHeroGateDressingTextileGeometry("cool-tall")
    ), {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [2.2, 2.4],
      roughness: 0.86,
      albedoBoost: 1.38,
      vertexColors: true,
    }),
    heroGateCoolFrame: createBatch("v3-rug-gate-cool-timber-kit", 0xffffff, "thresholdRug", () => (
      createHeroGateDressingFrameGeometry("cool-tall")
    ), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      materialId: "ph_rough_pine_door",
      textureRepeat: [2.1, 3.1],
      roughness: 0.82,
      normalScale: 0.52,
      albedoBoost: 1.18,
      vertexColors: true,
    }),
    heroGateWarmTextile: createBatch("v3-rug-gate-warm-textile-kit", 0xffffff, "thresholdRug", () => (
      createHeroGateDressingTextileGeometry("warm-low")
    ), {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [2.45, 2.15],
      roughness: 0.84,
      albedoBoost: 1.42,
      vertexColors: true,
    }),
    heroGateWarmFrame: createBatch("v3-rug-gate-warm-timber-kit", 0xffffff, "thresholdRug", () => (
      createHeroGateDressingFrameGeometry("warm-low")
    ), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      materialId: "ph_rough_pine_door",
      textureRepeat: [2.4, 2.7],
      roughness: 0.8,
      normalScale: 0.48,
      albedoBoost: 1.2,
      vertexColors: true,
    }),
    heroInnerFrame: createBatch("v3-rug-gate-inner-frame", 0xffffff, "heroLintel", createHeroGateInnerFrameGeometry, {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg",
      textureRepeat: [3.4, 3.8],
      roughness: 0.89,
      normalScale: 0.52,
      albedoBoost: 1.28,
      vertexColors: true,
    }),
    teaService: createBatch("v3-tea-service", 0x65452e, "shopfront", createTeaServiceGeometry, { castShadow: true, roughness: 0.76 }),
    teaVessels: createBatch("v3-tea-service-vessels", 0xb78c55, "shopfront", createTeaVesselsGeometry, {
      castShadow: true,
      roughness: 0.34,
      metalness: 0.42,
    }),
    serviceDoor: createBatch("v3-service-door", 0x425a50, "serviceDoor", createShutterGeometry, { castShadow: true, roughness: 0.73 }),
    spawnCover: createBatch("v3-spawn-cover", 0x765034, "spawnCover", createCrateGeometry, { castShadow: true, roughness: 0.78 }),
  };

  const compiledBatches = Object.values(batches);
  const bbox = new Box3();

  const record = (
    placement: RuntimeDressingPlacement,
    representation: RenderedPropPlacement["representation"],
    center: { x: number; y: number; z: number },
  ): void => {
    renderedPlacements.push({
      placementId: placement.id,
      anchorId: placement.anchorId,
      assetId: placement.assetId,
      moduleId: placement.runtime.id,
      semanticClass: placement.semanticClass,
      representation,
      materialMode: "pbr",
      center,
      dimensionsM: placement.dimensionsM,
      groundingGapM: 0,
      shadowMode: placement.shadowPolicy,
    });
  };

  const pushLocalInstance = (
    batch: InstanceBatch,
    origin: WorldVec3,
    yawRad: number,
    local: { x: number; y: number; z: number; yaw?: number; tintHex?: number; visualQa?: InstanceSpec["visualQa"] },
    size: { x: number; y: number; z: number },
    spanPitchRad = 0,
    orientationPitchRad = spanPitchRad,
  ): void => {
    const cos = Math.cos(yawRad);
    const sin = Math.sin(yawRad);
    const pitchCos = Math.cos(spanPitchRad);
    const pitchSin = Math.sin(spanPitchRad);
    const pitchedY = local.y * pitchCos - local.z * pitchSin;
    const pitchedZ = local.y * pitchSin + local.z * pitchCos;
    const instance: InstanceSpec = {
      x: origin.x + local.x * cos + pitchedZ * sin,
      y: origin.y + pitchedY,
      z: origin.z - local.x * sin + pitchedZ * cos,
      sx: size.x,
      sy: size.y,
      sz: size.z,
      yawRad: yawRad + (local.yaw ?? 0),
    };
    if (orientationPitchRad !== 0) instance.pitchRad = orientationPitchRad;
    if (local.tintHex !== undefined) instance.tintHex = local.tintHex;
    if (local.visualQa) instance.visualQa = local.visualQa;
    batch.instances.push(instance);
  };

  const addPrefabModel = (
    parent: Group,
    modelId: string,
    local: { x: number; y: number; z: number; yaw: number },
    target: { x: number; y: number; z: number },
    shadowPolicy: RuntimeDressingPlacement["shadowPolicy"],
    tintHex?: number,
  ): Group => {
    if (!options.propModels?.hasModel(modelId)) {
      throw new Error(`[map-props] compiled prefab requires CC0 model '${modelId}'`);
    }
    const model = options.propModels.instantiate(modelId);
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    const naturalSize = bbox.getSize(new Vector3());
    model.scale.set(
      target.x / Math.max(0.001, naturalSize.x),
      target.y / Math.max(0.001, naturalSize.y),
      target.z / Math.max(0.001, naturalSize.z),
    );
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    model.position.x -= (bbox.min.x + bbox.max.x) * 0.5;
    model.position.z -= (bbox.min.z + bbox.max.z) * 0.5;
    model.position.y -= bbox.min.y;
    if (typeof tintHex === "number") {
      const tint = new Color(tintHex);
      model.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
        const tintedMaterials = sourceMaterials.map((sourceMaterial) => {
          const material = sourceMaterial.clone();
          if (material instanceof MeshStandardMaterial) {
            material.color.copy(tint).multiplyScalar(1.32);
            material.emissive.set(0x000000);
            material.emissiveIntensity = 0;
          }
          return material;
        });
        child.material = Array.isArray(child.material) ? tintedMaterials : tintedMaterials[0]!;
      });
    }
    applyRenderStabilityTweaks(model, "filler", modelId);
    applyShadowPolicy(model, shadowPolicy);
    const itemRoot = new Group();
    itemRoot.name = `market-stall-goods-${modelId}`;
    itemRoot.position.set(local.x, local.y, local.z);
    itemRoot.rotation.y = local.yaw;
    itemRoot.add(model);
    parent.add(itemRoot);
    return itemRoot;
  };

  const deterministicOrdinals = (runtimeId: string): ReadonlyMap<string, number> => new Map(
    placements
      .filter((placement) => placement.runtime.id === runtimeId)
      .map((placement) => placement.id)
      .sort((left, right) => left.localeCompare(right))
      .map((placementId, index) => [placementId, index]),
  );
  // Asset-family ordinals are deterministic from the authored placement set.
  // Unlike a small hash bucket, they cannot collapse adjacent same-family
  // placements back onto one readable silhouette within the same compiled map.
  const stallOrdinalById = deterministicOrdinals("bazaar_market_stall");
  const signOrdinalById = deterministicOrdinals("bazaar_signboard");

  for (const placement of placements) {
    const world = designToWorldVec3(placement.position);
    const yawRad = designYawDegToWorldYawRad(placement.yawDeg);
    const { width, depth, height } = placement.dimensionsM;
    const anchorType = anchorTypeById.get(placement.anchorId) ?? "";
  const centeredAtAnchor = anchorType === "signage_anchor"
      || anchorType === "lantern_anchor"
      || anchorType === "cloth_canopy_span";
    const center = {
      x: world.x,
      y: centeredAtAnchor ? world.y : world.y + height * 0.5,
      z: world.z,
    };

    // Ground-resting dressing gets a contact-occlusion footprint. Overhead and
    // wall-mounted placements are excluded: they have nothing to sit on.
    if (!centeredAtAnchor && placement.classification !== "overhead") {
      const footprintM = Math.max(width, depth);
      if (footprintM >= 0.34) {
        batches.groundContact.instances.push({
          x: world.x,
          y: world.y + 0.012,
          z: world.z,
          yawRad,
          sx: width * 1.6,
          sy: 1,
          sz: depth * 1.6,
        });
      }
    }

    if (placement.runtime.id === "bazaar_cover_goods") {
      const placementRoot = new Group();
      placementRoot.name = `v3-dressing-${placement.id}`;
      placementRoot.position.set(world.x, world.y, world.z);
      placementRoot.rotation.y = yawRad;
      const coverUnit = stablePlacementVariantSeed(`${placement.id}:cover-layout`);
      const coverVariant = Math.min(2, Math.floor(coverUnit * 3));
      const mirror = coverVariant === 1 ? -1 : 1;
      const crateSpecs = [
        { x: mirror * -width * (0.22 + coverVariant * 0.025), y: 0, z: depth * (coverVariant === 2 ? -0.04 : 0.02), yaw: mirror * (0.035 + coverVariant * 0.035), width: width * (0.52 - coverVariant * 0.025), height: height * (0.38 + coverVariant * 0.018), depth: depth * 0.8, tintHex: [0xa99b88, 0x91aa9e, 0xb79a7c][coverVariant]! },
        // Tucked inboard and back of the sack it used to pass through. The
        // sack is the cluster's authored cover volume, so the crate moves
        // rather than the sack.
        { x: mirror * width * (0.24 + coverVariant * 0.02), y: 0, z: -depth * (0.36 - coverVariant * 0.03), yaw: mirror * (0.18 - coverVariant * 0.035), width: width * (0.26 + coverVariant * 0.016), height: height * (0.22 + coverVariant * 0.016), depth: depth * (0.44 + coverVariant * 0.04), tintHex: [0xd4bb91, 0xb9c9bd, 0xd0a77f][coverVariant]! },
        { x: mirror * width * (coverVariant === 2 ? 0.18 : -0.03), y: height * (0.39 + coverVariant * 0.018), z: depth * (coverVariant === 1 ? -0.08 : -0.02), yaw: mirror * (0.09 + coverVariant * 0.055), width: width * (0.36 + coverVariant * 0.025), height: height * (0.22 - coverVariant * 0.012), depth: depth * (0.52 - coverVariant * 0.035), tintHex: [0xb7d1c5, 0xc6a783, 0x9fb8ae][coverVariant]! },
      ];
      const crateBatches = [batches.coverCrateBraced, batches.coverCrateHorizontal, batches.coverCratePainted] as const;
      for (const [crateIndex, spec] of crateSpecs.entries()) {
        const crateBatch = crateBatches[(crateIndex + coverVariant) % crateBatches.length]!;
        pushLocalInstance(
          crateBatch,
          world,
          yawRad,
          {
            x: spec.x,
            y: spec.y + spec.height * 0.5,
            z: spec.z,
            yaw: spec.yaw,
            tintHex: spec.tintHex,
            ...(crateIndex === 0 ? {
              visualQa: {
                placementId: placement.id,
                anchorId: placement.anchorId,
                assetId: placement.assetId,
                moduleId: placement.runtime.id,
                semanticClass: placement.semanticClass,
                representation: "module" as const,
                materialMode: "pbr" as const,
                groundedGapM: 0,
                dimensions: { x: width, y: height, z: depth },
                shadowMode: placement.shadowPolicy,
              },
            } : {}),
          },
          { x: spec.width, y: spec.height, z: spec.depth },
        );
      }
      for (const sack of [
        {
          x: mirror * width * (0.4 + coverVariant * 0.025),
          z: -depth * (0.24 - coverVariant * 0.045),
          yaw: mirror * (-0.12 - coverVariant * 0.06),
          scale: 0.29 + coverVariant * 0.025,
        },
      ]) {
        addPrefabModel(
          placementRoot,
          "cc0_spice_sack",
          { x: sack.x, y: 0, z: sack.z, yaw: sack.yaw },
          { x: width * sack.scale, y: height * sack.scale * 1.15, z: depth * sack.scale * 1.9 },
          placement.shadowPolicy,
        );
      }
      const tarpCenterX = mirror * -width * (0.1 + coverVariant * 0.025);
      const tarpCenterY = height * (0.54 + coverVariant * 0.025);
      const tarpCenterZ = -depth * (0.02 + coverVariant * 0.025);
      pushLocalInstance(
        batches.coverTarp,
        world,
        yawRad,
        {
          x: tarpCenterX,
          y: tarpCenterY,
          z: tarpCenterZ,
          yaw: mirror * (0.035 + coverVariant * 0.045),
          tintHex: [0xd88f62, 0x78aaa0, 0xc6a04e][coverVariant]!,
        },
        { x: width * 0.39, y: height * 0.32, z: depth * 0.55 },
      );
      for (const side of [-1, 1] as const) {
        const tieX = tarpCenterX + side * width * 0.13;
        pushLocalInstance(
          batches.canopyEdgeRopes,
          world,
          yawRad,
          { x: tieX, y: tarpCenterY + height * 0.08, z: tarpCenterZ },
          { x: 0.014, y: 0.014, z: depth * 0.39 },
        );
      }
      root.add(placementRoot);
      record(placement, "model", center);
      continue;
    }

    if (placement.runtime.id === "bazaar_spawn_cover") {
      const crateModelId = "ph_wooden_crate_01";
      if (!options.propModels?.hasModel(crateModelId)) {
        throw new Error(`[map-props] CC0 spawn-cover crate is unavailable for placement '${placement.id}'`);
      }
      const placementRoot = new Group();
      placementRoot.name = `v3-spawn-cover-prefab-${placement.id}`;
      placementRoot.position.set(world.x, world.y, world.z);
      placementRoot.rotation.y = yawRad;
      const variant = [...placement.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
      const crateSpecs = [
        { width: width * 0.43, depth: depth * 0.88, height: height * 0.46, x: -width * 0.255, y: 0, z: depth * 0.035, yaw: variant === 0 ? -0.05 : 0.045 },
        { width: width * 0.43, depth: depth * 0.88, height: height * 0.46, x: width * 0.255, y: 0, z: -depth * 0.025, yaw: variant === 0 ? 0.045 : -0.05 },
        { width: width * 0.43, depth: depth * 0.82, height: height * 0.46, x: -width * 0.255, y: height * 0.52, z: -depth * 0.045, yaw: variant === 0 ? 0.065 : -0.06 },
        { width: width * 0.43, depth: depth * 0.82, height: height * 0.46, x: width * 0.255, y: height * 0.52, z: depth * 0.045, yaw: variant === 0 ? -0.06 : 0.065 },
      ];
      for (let index = 0; index < crateSpecs.length; index += 1) {
        const spec = crateSpecs[index]!;
        const model = options.propModels.instantiate(crateModelId);
        model.updateMatrixWorld(true);
        bbox.setFromObject(model);
        const naturalSize = bbox.getSize(new Vector3());
        model.scale.set(
          spec.width / Math.max(0.001, naturalSize.x),
          spec.height / Math.max(0.001, naturalSize.y),
          spec.depth / Math.max(0.001, naturalSize.z),
        );
        model.updateMatrixWorld(true);
        bbox.setFromObject(model);
        model.position.x -= (bbox.min.x + bbox.max.x) * 0.5;
        model.position.z -= (bbox.min.z + bbox.max.z) * 0.5;
        model.position.y -= bbox.min.y;
        applyRenderStabilityTweaks(model, "cover", crateModelId);
        applyShadowPolicy(model, placement.shadowPolicy);
        const crateRoot = new Group();
        crateRoot.name = `spawn-cover-crate-${index + 1}`;
        crateRoot.position.set(spec.x, spec.y, spec.z);
        crateRoot.rotation.y = spec.yaw;
        crateRoot.add(model);
        placementRoot.add(crateRoot);
      }
      root.add(placementRoot);
      record(placement, "model", center);
      continue;
    }

    if (placement.runtime.mode === "model") {
      if (!options.propModels?.hasModel(placement.runtime.id)) {
        throw new Error(`[map-props] final asset '${placement.runtime.id}' is not loaded for placement '${placement.id}'`);
      }
      const model = options.propModels.instantiate(placement.runtime.id);
      model.scale.set(placement.scale.x, placement.scale.z, placement.scale.y);
      model.updateMatrixWorld(true);
      bbox.setFromObject(model);
      model.position.x -= (bbox.min.x + bbox.max.x) * 0.5;
      model.position.z -= (bbox.min.z + bbox.max.z) * 0.5;
      model.position.y -= centeredAtAnchor
        ? (bbox.min.y + bbox.max.y) * 0.5
        : bbox.min.y;
      applyRenderStabilityTweaks(model, placement.semanticClass === "lighting" ? "lantern" : "filler", placement.runtime.id);
      applyShadowPolicy(model, placement.shadowPolicy);
      const placementRoot = new Group();
      placementRoot.name = `v3-dressing-${placement.id}`;
      placementRoot.position.set(world.x, centeredAtAnchor ? world.y : world.y, world.z);
      placementRoot.rotation.y = yawRad;
      placementRoot.add(model);
      root.add(placementRoot);
      record(placement, "model", center);
      continue;
    }

    const spanPitchRad = placement.spanSeats
      ? -Math.atan2(
          placement.spanSeats.end.z - placement.spanSeats.start.z,
          Math.max(0.001, depth),
        )
      : 0;
    const transform: InstanceSpec = {
      x: center.x,
      y: center.y,
      z: center.z,
      sx: width,
      sy: height,
      sz: depth,
      yawRad,
      ...(spanPitchRad !== 0 ? { pitchRad: spanPitchRad } : {}),
    };
    let rendered = true;
    switch (placement.runtime.id) {
      case "bazaar_market_stall": {
        const variant = (stallOrdinalById.get(placement.id) ?? 0) % 6;
        const isDyersWorkshop = placement.id.includes("L3R0_NORTH");
        const canopyTints = [0xd88455, 0x67a294, 0xb97454, 0xd3a24f, 0x7f8f67, 0xa9666e] as const;
        const textileTints = [0xf0b064, 0x7bc3bc, 0xc47b63, 0xe3bd70, 0xa9b37b, 0xc98991] as const;
        const timberTints = [0xb98761, 0x8f765f, 0xa66f50, 0x927f68, 0xaa805b, 0x8e6d59] as const;
        const canopyTintHex = isDyersWorkshop ? 0x3f7880 : canopyTints[variant]!;
        const textileTintHex = isDyersWorkshop ? 0xd59a35 : textileTints[variant]!;
        const timberTintHex = timberTints[variant]!;
        const structureWidthFactors = [0.94, 1, 0.9, 0.97, 0.92, 1.02] as const;
        const canopyWidthFactors = [1.08, 1.15, 1.03, 1.12, 1.06, 1.17] as const;
        const canopyDepthFactors = [1.03, 0.92, 1.09, 0.86, 0.96, 1.06] as const;
        const headerWidthFactors = [0.66, 0.82, 0.58, 0.74, 0.62, 0.87] as const;
        const headerHeightFactors = [0.075, 0.095, 0.115, 0.085, 0.105, 0.07] as const;
        // Authored shopfront yaw points toward the facade; project the stall
        // into the served bay's lane side so its canopy and goods are visible
        // and nothing is buried behind the wall plane.
        const forwardM = -depth * 0.52;
        const counterTopM = height * [0.35, 0.38, 0.365, 0.395, 0.34, 0.385][variant]!;
        pushLocalInstance(
          batches.stallStructure,
          world,
          yawRad,
          {
            x: 0,
            y: height * 0.5,
            z: forwardM,
            tintHex: timberTintHex,
            visualQa: {
              placementId: placement.id,
              anchorId: placement.anchorId,
              assetId: placement.assetId,
              moduleId: placement.runtime.id,
              semanticClass: placement.semanticClass,
              representation: "module",
              materialMode: "pbr",
              groundedGapM: 0,
              dimensions: { x: width, y: height, z: depth },
              shadowMode: "cast_receive",
            },
          },
          { x: width * structureWidthFactors[variant]!, y: height, z: depth },
        );
        pushLocalInstance(
          batches.stallBackboard,
          world,
          yawRad,
          { x: 0, y: height * 0.58, z: forwardM + depth * 0.36, tintHex: timberTintHex },
          { x: width * 0.78, y: height * 0.46, z: 0.065 },
        );
        const shelfCount = variant % 3 === 2 ? 1 : 2;
        for (let shelfIndex = 0; shelfIndex < shelfCount; shelfIndex += 1) {
          const shelfY = height * (0.47 + shelfIndex * 0.16);
          pushLocalInstance(
            batches.stallShelf,
            world,
            yawRad,
            {
              x: 0,
              y: shelfY,
              z: forwardM + depth * 0.28,
              tintHex: timberTintHex,
            },
            {
              x: width * (0.68 + (variant % 3) * 0.035),
              y: 0.055,
              z: depth * 0.24,
            },
          );
          const shelfStockXs = shelfIndex === 0
            ? variant % 2 === 0 ? [-0.24, 0.04, 0.29] : [-0.3, -0.02, 0.25]
            : variant % 2 === 0 ? [-0.18, 0.2] : [-0.24, 0.16];
          for (const [stockIndex, normalizedX] of shelfStockXs.entries()) {
            pushLocalInstance(
              batches.spiceBaskets,
              world,
              yawRad,
              {
                x: normalizedX * width,
                y: shelfY + 0.115 + stockIndex * 0.008,
                z: forwardM + depth * 0.255,
                yaw: (stockIndex - 1) * 0.045,
              },
              {
                x: width * (stockIndex % 2 === 0 ? 0.18 : 0.15),
                y: 0.19 + (variant % 2) * 0.025,
                z: depth * 0.18,
              },
            );
          }
        }
        pushLocalInstance(
          batches.stallHeader,
          world,
          yawRad,
          {
            x: 0,
            y: height * (0.79 + (variant % 2) * 0.025),
            z: forwardM - depth * 0.405,
            tintHex: timberTintHex,
          },
          {
            x: width * headerWidthFactors[variant]!,
            y: height * headerHeightFactors[variant]!,
            z: 0.09,
          },
        );
        pushLocalInstance(
          batches.stallCanopy,
          world,
          yawRad,
          { x: 0, y: height - 0.06, z: forwardM, tintHex: canopyTintHex },
          { x: width * canopyWidthFactors[variant]!, y: 0.62, z: depth * canopyDepthFactors[variant]! },
        );
        pushLocalInstance(
          batches.stallValance,
          world,
          yawRad,
          { x: 0, y: height - 0.24, z: forwardM - depth * 0.49, tintHex: canopyTintHex },
          { x: width * (canopyWidthFactors[variant]! - 0.02), y: [1, 0.78, 1.18, 0.9, 1.08, 0.84][variant]!, z: 0.045 },
        );
        for (const seamFraction of [-0.3, 0, 0.3]) {
          pushLocalInstance(
            batches.canopyCrossRopes,
            world,
            yawRad,
            { x: 0, y: height - 0.105, z: forwardM + depth * seamFraction },
            { x: width * 1.04, y: 0.016, z: 0.016 },
          );
        }
        for (const side of [-1, 1] as const) {
          pushLocalInstance(
            batches.stallTieRing,
            world,
            yawRad,
            { x: side * width * 0.5, y: height - 0.16, z: forwardM - depth * 0.48 },
            { x: 0.13, y: 0.13, z: 0.055 },
          );
        }
        pushLocalInstance(
          batches.stallRug,
          world,
          yawRad,
          {
            x: [-0.06, 0.07, -0.11, 0.04, 0.1, -0.03][variant]!,
            y: 0.018,
            z: forwardM + [0.05, 0.02, 0.08, 0.04, 0.09, 0.01][variant]!,
            yaw: [-0.035, 0.045, -0.075, 0.085, 0.025, -0.095][variant]!,
            tintHex: textileTintHex,
          },
          { x: width * [1.08, 1.02, 1.12, 1.05, 0.98, 1.1][variant]!, y: 0.036, z: depth * [1.12, 1.06, 1.16, 1.02, 1.1, 1.14][variant]! },
        );

        const hangingX = (variant % 2 === 0 ? -1 : 1) * width * (0.28 + (variant % 3) * 0.035);
        const hangingBottomM = height * 0.61;
        const hangingBasketHeightM = 0.28;
        const cordBottomM = hangingBottomM + hangingBasketHeightM;
        const cordTopM = height - 0.14;
        for (const side of [-1, 1] as const) {
          pushLocalInstance(
            batches.stallHangerCord,
            world,
            yawRad,
            {
              x: hangingX + side * 0.09,
              y: (cordBottomM + cordTopM) * 0.5,
              z: forwardM - depth * 0.32,
            },
            { x: 0.018, y: cordTopM - cordBottomM, z: 0.018 },
          );
        }
        pushLocalInstance(
          batches.stallHangingTextile,
          world,
          yawRad,
          {
            x: 0,
            y: height * 0.63,
            z: forwardM - depth * 0.39,
            yaw: variant === 0 ? 0.035 : -0.04,
            tintHex: textileTintHex,
          },
          { x: width * 0.19, y: height * (variant === 0 ? 0.34 : 0.28), z: 0.035 },
        );
        if (isDyersWorkshop) {
          pushLocalInstance(
            batches.dyersWorkshopTextiles,
            world,
            yawRad,
            {
              x: 0,
              y: height * 0.64,
              z: forwardM - depth * 0.435,
            },
            { x: width * 0.72, y: height * 0.74, z: depth * 0.18 },
          );
        }

        const goodsRoot = new Group();
        goodsRoot.name = `v3-market-stall-prefab-${placement.id}`;
        goodsRoot.position.set(world.x, world.y, world.z);
        goodsRoot.rotation.y = yawRad;
        const crateX = variant === 0 ? -width * 0.25 : width * 0.23;
        addPrefabModel(
          goodsRoot,
          "ph_wooden_crate_01",
          { x: crateX, y: 0.035, z: forwardM - depth * 0.05, yaw: variant === 0 ? -0.06 : 0.07 },
          { x: width * 0.3, y: 0.36, z: depth * 0.38 },
          placement.shadowPolicy,
        );
        addPrefabModel(
          goodsRoot,
          "ph_wicker_basket_02",
          { x: -crateX * 0.9, y: 0.035, z: forwardM - depth * 0.02, yaw: variant === 0 ? 0.08 : -0.08 },
          { x: 0.38, y: 0.27, z: 0.38 },
          placement.shadowPolicy,
        );
        const secondHangingX = -hangingX * 0.82;
        const secondHangingBottomM = height * 0.54;
        const secondCordBottomM = secondHangingBottomM + 0.25;
        for (const side of [-1, 1] as const) {
          pushLocalInstance(
            batches.stallHangerCord,
            world,
            yawRad,
            {
              x: secondHangingX + side * 0.075,
              y: (secondCordBottomM + cordTopM) * 0.5,
              z: forwardM - depth * 0.3,
            },
            { x: 0.016, y: cordTopM - secondCordBottomM, z: 0.016 },
          );
        }
        addPrefabModel(
          goodsRoot,
          "ph_wicker_basket_02",
          { x: secondHangingX, y: secondHangingBottomM, z: forwardM - depth * 0.3, yaw: variant === 0 ? 0.06 : -0.05 },
          { x: 0.32, y: 0.25, z: 0.32 },
          placement.shadowPolicy,
        );
        addPrefabModel(
          goodsRoot,
          "cc0_spice_sack",
          { x: 0, y: 0.035, z: forwardM + depth * 0.02, yaw: variant === 0 ? 0.04 : -0.05 },
          { x: 0.4, y: 0.43, z: 0.4 },
          placement.shadowPolicy,
        );
        addPrefabModel(
          goodsRoot,
          "ph_wicker_basket_02",
          { x: hangingX, y: hangingBottomM, z: forwardM - depth * 0.32, yaw: variant === 0 ? -0.05 : 0.06 },
          { x: 0.36, y: hangingBasketHeightM, z: 0.36 },
          placement.shadowPolicy,
        );
        addPrefabModel(
          goodsRoot,
          variant === 0 ? "ph_brass_pot_01" : "ph_ceramic_pot",
          { x: width * 0.19, y: counterTopM + 0.035, z: forwardM - depth * 0.06, yaw: variant === 0 ? 0.08 : -0.05 },
          { x: 0.32, y: 0.3, z: 0.32 },
          placement.shadowPolicy,
        );
        addPrefabModel(
          goodsRoot,
          variant === 0 ? "ph_ceramic_pot" : "ph_brass_pot_01",
          { x: -width * 0.18, y: counterTopM + 0.035, z: forwardM - depth * 0.11, yaw: variant === 0 ? -0.04 : 0.07 },
          { x: 0.29, y: 0.26, z: 0.29 },
          placement.shadowPolicy,
        );
        for (const [index, basketX] of [-width * 0.34, width * 0.34].entries()) {
          const basketDepthM = depth * 0.22;
          pushLocalInstance(
            batches.spiceBaskets,
            world,
            yawRad,
            { x: basketX, y: counterTopM + 0.11, z: forwardM - depth * 0.14, yaw: index === 0 ? -0.05 : 0.06 },
            { x: width * 0.22, y: 0.17, z: basketDepthM },
          );
          pushLocalInstance(
            index === 0 ? batches.spiceMoundGold : batches.spiceMoundRust,
            world,
            yawRad,
            { x: basketX, y: counterTopM + 0.21, z: forwardM - depth * 0.14, yaw: index === 0 ? -0.05 : 0.06 },
            { x: width * 0.16, y: 0.045, z: basketDepthM * 0.72 },
          );
        }
        root.add(goodsRoot);
        break;
      }
      case "bazaar_signboard": {
        const variantOrdinal = signOrdinalById.get(placement.id) ?? 0;
        const variant = variantOrdinal % 3;
        const signTints = [0xffd6ad, 0xc7ddd2, 0xe7bd93] as const;
        const proportionVariant = Math.floor(variantOrdinal / 3) % 3;
        const signTransform = {
          ...transform,
          // The board remains centered on its served opening; only the field
          // proportion changes so neighboring signs do not clone silhouettes.
          sx: transform.sx * (proportionVariant === 0 ? 0.88 : proportionVariant === 1 ? 0.95 : 1),
          sy: transform.sy * (proportionVariant === 0 ? 1.08 : proportionVariant === 1 ? 0.94 : 1),
        };
        [batches.signBoardA, batches.signBoardB, batches.signBoardC][variant]!.instances.push({
          ...signTransform,
          tintHex: signTints[Math.floor(variantOrdinal / 9) % signTints.length]!,
        });
        batches.signFrame.instances.push(signTransform);
        batches.signRig.instances.push(signTransform);
        break;
      }
      case "bazaar_laundry_line": {
        const variantSeed = [...placement.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
        const isDyersBatch = placement.id.includes("L3R0_NORTH_DYERS_LINE");
        const qa = {
          placementId: placement.id,
          anchorId: placement.anchorId,
          assetId: placement.assetId,
          moduleId: placement.runtime.id,
          semanticClass: placement.semanticClass,
          representation: "module" as const,
          materialMode: "pbr" as const,
          groundedGapM: 0,
          dimensions: { x: width, y: height, z: depth },
          shadowMode: placement.shadowPolicy,
        };
        // The rope and cloth are one authored module. Only the cloth-led batch
        // owns the module-level QA record so the rope is not counted as a
        // second visual representation of the same placement.
        const spanSagM = Math.min(0.48, Math.max(0.38, depth * 0.045));
        const catenaryTransform = {
          ...transform,
          // The normalized geometry owns a 0.34-unit sag. Scaling only the
          // vertical axis from the authored span length produces a real
          // 0.38–0.48 m drop instead of tying sag to the 0.85 m asset label.
          sy: spanSagM / 0.34,
        };
        batches.laundryRope.instances.push(catenaryTransform);
        const laundryVariant = isDyersBatch ? 2 : variantSeed % 2 === 0 ? 0 : 1;
        const clothBatch = laundryVariant === 2
          ? batches.laundryClothDyers
          : laundryVariant === 0
            ? batches.laundryClothA
            : batches.laundryClothB;
        clothBatch.instances.push({
          ...catenaryTransform,
          ...(isDyersBatch
            ? {}
            : { tintHex: variantSeed % 3 === 0 ? 0xf1c39e : variantSeed % 3 === 1 ? 0xb9d7cc : 0xe0b696 }),
          visualQa: qa,
        });
        const clipsBatch = laundryVariant === 2
          ? batches.laundryClipsDyers
          : laundryVariant === 0
            ? batches.laundryClipsA
            : batches.laundryClipsB;
        clipsBatch.instances.push(catenaryTransform);
        const bundleAlong = variantSeed % 2 === 0 ? 0.08 : -0.1;
        const bundleNormalized = Math.max(-0.5, Math.min(0.5, bundleAlong));
        const bundleSagM = spanSagM * (1 - (bundleNormalized * 2) ** 2);
        const bundleHeightM = 0.5 + (variantSeed % 3) * 0.045;
        pushLocalInstance(
          batches.laundryBundles,
          world,
          yawRad,
          {
            x: width * (variantSeed % 2 === 0 ? -0.16 : 0.14),
            y: -bundleSagM - bundleHeightM * 0.48,
            z: depth * bundleNormalized,
            yaw: variantSeed % 2 === 0 ? -0.08 : 0.07,
            tintHex: variantSeed % 3 === 0 ? 0xd68c5b : variantSeed % 3 === 1 ? 0x6f9f91 : 0xd1a147,
          },
          {
            x: 0.2 + (variantSeed % 2) * 0.025,
            y: bundleHeightM,
            z: 0.82 + (variantSeed % 3) * 0.08,
          },
          spanPitchRad,
          0,
        );
        const lanternAlong = variantSeed % 2 === 0 ? -0.16 : 0.18;
        const normalizedAlong = Math.max(-0.5, Math.min(0.5, lanternAlong));
        const lanternSagM = spanSagM * (1 - (normalizedAlong * 2) ** 2);
        const lanternHeightM = 0.34 + (variantSeed % 2) * 0.045;
        const lanternDropM = 0.2 + (variantSeed % 3) * 0.035;
        const isSpiceAttachmentCloseupLine = placement.id.includes("B6_LAUNDRY_SPICE_01");
        if (!isSpiceAttachmentCloseupLine) {
          pushLocalInstance(
            batches.laundryDropRopes,
            world,
            yawRad,
            {
              x: width * (variantSeed % 3 === 0 ? -0.18 : 0.16),
              y: -lanternSagM - lanternDropM * 0.5,
              z: depth * normalizedAlong,
            },
            { x: 0.014, y: lanternDropM, z: 0.014 },
            spanPitchRad,
            0,
          );
          pushLocalInstance(
            batches.laundryLanterns,
            world,
            yawRad,
            {
              x: width * (variantSeed % 3 === 0 ? -0.18 : 0.16),
              y: -lanternSagM - lanternDropM - lanternHeightM * 0.5,
              z: depth * normalizedAlong,
              yaw: (variantSeed % 5) * 0.09 - 0.18,
            },
            {
              x: 0.2 + (variantSeed % 3) * 0.025,
              y: lanternHeightM,
              z: 0.2 + ((variantSeed + 1) % 3) * 0.02,
            },
            spanPitchRad,
            0,
          );
        }
        for (const edgeSide of [-1, 1] as const) {
          const supportDropM = Math.max(0.34, Math.min(0.62, height * 0.42));
          pushLocalInstance(
            batches.canopyHangRopes,
            world,
            yawRad,
            {
              x: 0,
              y: supportDropM * 0.5,
              z: edgeSide * depth * 0.485,
            },
            { x: 0.018, y: supportDropM, z: 0.018 },
            spanPitchRad,
            0,
          );
          // The rope is authored to the exact seat-to-seat span, so its cut end
          // sits in open air in front of whatever trim stands proud of the wall
          // plane. Cap that terminal with the eye it should be tied to, and
          // keep the ring on the rope line rather than a support-drop above it.
          pushLocalInstance(
            batches.canopyFixtures,
            world,
            yawRad,
            {
              x: 0,
              y: 0.02,
              z: edgeSide * depth * 0.5,
              yaw: edgeSide === -1 ? -Math.PI * 0.5 : Math.PI * 0.5,
              visualQa: {
                placementId: `${placement.id}:laundry-line-eye:${edgeSide === -1 ? "near" : "far"}`,
                anchorId: placement.anchorId,
                assetId: placement.assetId,
                moduleId: "laundry_wall_ring",
                semanticClass: "laundry_line_support",
                representation: "module",
                materialMode: "pbr",
                groundedGapM: 0,
                dimensions: { x: 0.3, y: 0.3, z: 0.18 },
                shadowMode: "cast_only",
              },
            },
            { x: 0.5, y: 0.5, z: 0.5 },
            spanPitchRad,
            0,
          );
          pushLocalInstance(
            batches.canopyFixtures,
            world,
            yawRad,
            {
              x: 0,
              y: supportDropM,
              z: edgeSide * depth * 0.485,
              yaw: edgeSide === -1 ? -Math.PI * 0.5 : Math.PI * 0.5,
              visualQa: {
                placementId: `${placement.id}:laundry-wall-ring:${edgeSide === -1 ? "near" : "far"}`,
                anchorId: placement.anchorId,
                assetId: placement.assetId,
                moduleId: "laundry_wall_ring",
                semanticClass: "laundry_line_support",
                representation: "module",
                materialMode: "pbr",
                groundedGapM: 0,
                dimensions: { x: 0.3, y: 0.3, z: 0.18 },
                shadowMode: "cast_only",
              },
            },
            { x: 0.58, y: 0.58, z: 0.58 },
            spanPitchRad,
            0,
          );
        }
        break;
      }
      case "bazaar_dyers_workstation": {
        const variantSeed = stablePlacementVariantSeed(placement.id);
        const variant = variantSeed % 5;
        const widthFactors = [1, 0.96, 0.985, 0.97, 0.995] as const;
        const depthFactors = [0.96, 1, 0.98, 0.99, 0.97] as const;
        const stoneTints = [0xbfae91, 0xd2c5ae, 0xc8b799, 0xb8ab95, 0xcfbea2] as const;
        const timberTints = [0xa2764f, 0x8c674a, 0x966e4e, 0x84634b, 0xa07858] as const;
        const textileTints = [0xd6b078, 0xcaa06c, 0xb8a776, 0xd19b72, 0xbfae80] as const;
        const indigoTints = [0x21475e, 0x315b70, 0x285167, 0x294a63, 0x35566b] as const;
        const madderTints = [0x93443a, 0x763b43, 0x86403f, 0x8c4b43, 0x7e3d3b] as const;
        const moduleTransform = {
          ...transform,
          sx: transform.sx * widthFactors[variant]!,
          sz: transform.sz * depthFactors[variant]!,
        };
        const qa = {
          placementId: placement.id,
          anchorId: placement.anchorId,
          assetId: placement.assetId,
          moduleId: placement.runtime.id,
          semanticClass: placement.semanticClass,
          representation: "module" as const,
          materialMode: "pbr" as const,
          groundedGapM: 0,
          dimensions: {
            x: width * widthFactors[variant]!,
            y: height,
            z: depth * depthFactors[variant]!,
          },
          shadowMode: placement.shadowPolicy,
        };
        batches.dyersWorkstationStone.instances.push({
          ...moduleTransform,
          tintHex: stoneTints[variant]!,
        });
        batches.dyersWorkstationIndigoBasin.instances.push({
          ...moduleTransform,
          tintHex: indigoTints[variant]!,
          visualQa: qa,
        });
        batches.dyersWorkstationMadderBasin.instances.push({
          ...moduleTransform,
          tintHex: madderTints[variant]!,
        });
        batches.dyersWorkstationTimber.instances.push({
          ...moduleTransform,
          tintHex: timberTints[variant]!,
        });
        batches.dyersWorkstationTextile.instances.push({
          ...moduleTransform,
          tintHex: textileTints[variant]!,
        });
        batches.dyersWorkstationIndigo.instances.push({
          ...moduleTransform,
          tintHex: indigoTints[variant]!,
        });
        batches.dyersWorkstationMadder.instances.push({
          ...moduleTransform,
          tintHex: madderTints[variant]!,
        });
        batches.dyersWorkstationDrain.instances.push(moduleTransform);
        batches.dyersWorkstationWetApron.instances.push(moduleTransform);
        break;
      }
      case "bazaar_cloth_canopy":
        {
        const canopySeed = [...placement.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
        const canopyTints = [0xffcfad, 0xbfd8cc, 0xe4b5a0, 0xd7c598] as const;
        const canopyTintHex = placement.id.includes("DYERS")
          ? 0x76a99e
          : canopyTints[canopySeed % canopyTints.length]!;
        batches.canopy.instances.push({
          ...transform,
          tintHex: canopyTintHex,
          visualQa: {
            placementId: placement.id,
            anchorId: placement.anchorId,
            assetId: placement.assetId,
            moduleId: placement.runtime.id,
            semanticClass: placement.semanticClass,
            representation: "module",
            materialMode: "pbr",
            groundedGapM: 0,
            dimensions: { x: width, y: height, z: depth },
            shadowMode: "cast_receive",
          },
        });
        for (const edgeSide of [-1, 1] as const) {
          pushLocalInstance(
            batches.canopyValance,
            world,
            yawRad,
            {
              x: 0,
              y: -Math.max(0.1, height * 0.16),
              z: edgeSide * depth * 0.485,
              yaw: edgeSide === -1 ? Math.PI : 0,
              tintHex: canopyTintHex,
            },
            { x: width * 0.97, y: 1, z: 1 },
            spanPitchRad,
            0,
          );
        }
        for (const side of [-1, 1] as const) {
          pushLocalInstance(
            batches.canopyEdgeRopes,
            world,
            yawRad,
            { x: side * width * 0.46, y: height * 0.08, z: 0 },
            { x: 0.026, y: 0.026, z: depth * 0.92 },
            spanPitchRad,
          );
        }
        for (const station of CANOPY_SPAN_STATIONS) {
          pushLocalInstance(
            batches.canopyCrossRopes,
            world,
            yawRad,
            { x: 0, y: height * 0.08, z: depth * station * 0.97 },
            { x: width, y: 0.026, z: 0.026 },
            spanPitchRad,
          );
        }
        for (const wallSide of [-1, 1] as const) {
          const fixtureZ = wallSide * (depth * 0.5 - 0.025);
          const suspensionRiseM = Math.max(0.34, Math.min(0.58, height * 0.46));
          pushLocalInstance(
            batches.canopyTrestles,
            world,
            yawRad,
            {
              x: 0,
              y: suspensionRiseM - 0.06,
              z: fixtureZ,
              yaw: wallSide === -1 ? Math.PI : 0,
              tintHex: placement.id.includes("DYERS") ? 0x8a6b4f : 0x9a7655,
            },
            { x: width * 0.92, y: 0.72, z: 0.18 },
            spanPitchRad,
            0,
          );
          for (const edgeSide of [-1, 1] as const) {
            const clothEdgeZ = wallSide * depth * 0.46;
            pushLocalInstance(
              batches.canopyEdgeRopes,
              world,
              yawRad,
              {
                x: edgeSide * width * 0.46,
                y: height * 0.045,
                z: (clothEdgeZ + fixtureZ) * 0.5,
              },
              { x: 0.026, y: 0.026, z: Math.abs(fixtureZ - clothEdgeZ) },
              spanPitchRad,
            );
            pushLocalInstance(
              batches.canopyHangRopes,
              world,
              yawRad,
              {
                x: edgeSide * width * 0.46,
                y: suspensionRiseM * 0.5,
                z: fixtureZ,
              },
              { x: 0.03, y: suspensionRiseM, z: 0.03 },
              spanPitchRad,
              0,
            );
            pushLocalInstance(
              batches.canopyFixtures,
              world,
              yawRad,
              {
                x: edgeSide * width * 0.46,
                y: suspensionRiseM,
                z: wallSide * (depth * 0.5 - 0.025),
                yaw: wallSide === -1 ? -Math.PI * 0.5 : Math.PI * 0.5,
                visualQa: {
                  placementId: `${placement.id}:wall-ring:${wallSide === -1 ? "near" : "far"}:${edgeSide === -1 ? "left" : "right"}`,
                  anchorId: placement.anchorId,
                  assetId: placement.assetId,
                  moduleId: "canopy_wall_ring",
                  semanticClass: "canopy_support",
                  representation: "module",
                  materialMode: "pbr",
                  groundedGapM: 0,
                  dimensions: { x: 0.52, y: 0.34, z: 0.18 },
                  shadowMode: "cast_only",
                },
              },
              { x: 1, y: 1, z: 1 },
              spanPitchRad,
              0,
            );
          }
        }
        break;
        }
      case "bazaar_cover_goods":
        // Model-backed above so final mode always reports the actual CC0 crate asset.
        rendered = false;
        break;
      case "bazaar_ground_rug": {
        const rugSeed = stablePlacementVariantSeed(placement.id);
        const rugTints = [0xffb783, 0x73b7b0, 0xd5a56f, 0xb66d58, 0x8eb47c] as const;
        const rugAspect = [0.9, 0.96, 1, 1.06, 1.12][(rugSeed >>> 5) % 5]!;
        batches.groundRug.instances.push({
          ...transform,
          y: world.y + 0.0175,
          sx: transform.sx * rugAspect,
          sy: 0.035,
          sz: transform.sz / Math.sqrt(rugAspect),
          tintHex: rugTints[rugSeed % rugTints.length]!,
        });
        break;
      }
      case "bazaar_market_cart": {
        const cartSeed = stablePlacementVariantSeed(placement.id);
        const cartTints = [0xd7b08a, 0xb98a63, 0x9a765a, 0xc39a72] as const;
        const proportion = [
          { x: 0.94, y: 1.08, z: 1.02 },
          { x: 1.04, y: 0.92, z: 0.97 },
          { x: 0.98, y: 1, z: 1.05 },
        ][(cartSeed >>> 6) % 3]!;
        batches.marketCart.instances.push({
          ...transform,
          sx: transform.sx * proportion.x,
          sy: transform.sy * proportion.y,
          sz: transform.sz * proportion.z,
          tintHex: cartTints[cartSeed % cartTints.length]!,
        });
        break;
      }
      case "bazaar_spice_goods": {
        const moduleHeight = Math.min(height, 0.62);
        const basketSpecs = [
          { x: width * 0.19, z: -depth * 0.12, size: width * 0.22, yaw: -0.06, mound: batches.spiceMoundGold },
          { x: width * 0.38, z: depth * 0.08, size: width * 0.2, yaw: 0.08, mound: batches.spiceMoundRust },
          { x: width * 0.2, z: depth * 0.28, size: width * 0.17, yaw: 0.03, mound: batches.spiceMoundOchre },
        ];
        for (const [basketIndex, basket] of basketSpecs.entries()) {
          const basketHeight = Math.min(moduleHeight * 0.25, 0.16);
          const basketDepth = Math.min(depth * 0.42, basket.size);
          pushLocalInstance(
            batches.spiceBaskets,
            world,
            yawRad,
            {
              x: basket.x,
              y: basketHeight * 0.5,
              z: basket.z,
              yaw: basket.yaw,
              ...(basketIndex === 0
                ? {
                  visualQa: {
                    placementId: placement.id,
                    anchorId: placement.anchorId,
                    assetId: placement.assetId,
                    moduleId: placement.runtime.id,
                    semanticClass: placement.semanticClass,
                    representation: "module" as const,
                    materialMode: "pbr" as const,
                    groundedGapM: 0,
                    dimensions: { x: width, y: height, z: depth },
                    shadowMode: "cast_receive" as const,
                  },
                }
                : {}),
            },
            { x: basket.size, y: basketHeight, z: basketDepth },
          );
          pushLocalInstance(
            basket.mound,
            world,
            yawRad,
            { x: basket.x, y: basketHeight * 0.58 + 0.038, z: basket.z, yaw: basket.yaw },
            { x: basket.size * 0.72, y: 0.035, z: basketDepth * 0.72 },
          );
        }
        pushLocalInstance(
          batches.spiceBalance,
          world,
          yawRad,
          { x: -width * 0.36, y: moduleHeight * 0.34, z: -depth * 0.18, yaw: 0.04 },
          { x: width * 0.27, y: moduleHeight * 0.68, z: depth * 0.35 },
        );
        break;
      }
      case "bazaar_fountain_octagonal": {
        const footprintScaleX = width / FOUNTAIN_REFERENCE_DIAMETER_M;
        const footprintScaleZ = depth / FOUNTAIN_REFERENCE_DIAMETER_M;
        const parts = [
          batches.fountainStone,
          batches.fountainTile,
          batches.fountainDetails,
          batches.fountainWater,
          batches.fountainBronze,
          batches.fountainCourtAccent,
        ];
        for (const batch of parts) {
          const instance: InstanceSpec = {
            x: world.x,
            y: world.y,
            z: world.z,
            sx: footprintScaleX,
            sy: 1,
            sz: footprintScaleZ,
            yawRad,
          };
          // The stone assembly owns placement telemetry so one authoritative
          // module represents the full four-material landmark in scene QA.
          if (batch === batches.fountainStone) {
            instance.visualQa = {
              placementId: placement.id,
              anchorId: placement.anchorId,
              assetId: placement.assetId,
              moduleId: placement.runtime.id,
              semanticClass: placement.semanticClass,
              representation: "module",
              materialMode: "pbr",
              groundedGapM: 0,
              dimensions: { x: width, y: FOUNTAIN_VISUAL_HEIGHT_M, z: depth },
              shadowMode: "cast_receive",
            };
          }
          batch.instances.push(instance);
        }
        break;
      }
      case "bazaar_court_planter": {
        batches.courtPlanterStone.instances.push({
          ...transform,
          visualQa: {
            placementId: placement.id,
            anchorId: placement.anchorId,
            assetId: placement.assetId,
            moduleId: placement.runtime.id,
            semanticClass: placement.semanticClass,
            representation: "module",
            materialMode: "pbr",
            groundedGapM: 0,
            dimensions: { x: width, y: height, z: depth },
            shadowMode: "cast_receive",
          },
        });
        batches.courtPlanterSoil.instances.push(transform);
        batches.courtPlanterFoliage.instances.push(transform);
        break;
      }
      case "bazaar_hanging_textiles":
        batches.hangingTextile.instances.push(transform);
        break;
      case "bazaar_rug_gate_arch": {
        // Span the full Rug Gate lane and bury the two narrow returns in the
        // authored side walls. The old seven-metre freestanding frame read as
        // an event prop and left non-colliding piers in the traversable floor.
        const pillarWidth = Math.min(0.24, width * 0.02);
        const openingHalf = (width - pillarWidth * 2) * 0.5;
        const pillarHeight = height * 0.54;
        const tangentX = Math.cos(yawRad);
        const tangentZ = -Math.sin(yawRad);
        for (const side of [-1, 1] as const) {
          const pillarTransform = {
            x: world.x + tangentX * side * (openingHalf + pillarWidth * 0.5),
            y: world.y + pillarHeight * 0.5,
            z: world.z + tangentZ * side * (openingHalf + pillarWidth * 0.5),
            sx: pillarWidth,
            sy: pillarHeight,
            sz: depth,
            yawRad,
          };
          batches.heroPillar.instances.push(pillarTransform);
        }
        // L2.10's complete gate-dressing family is authored in normalized gate
        // space: three grounded masses per flank (threshold kilim, rug cradle,
        // supported hanging rack), four material batches, and two deliberately
        // asymmetric variants. Its inner/outer datums preserve the centered
        // 6.0 m route plus 0.15 m visual buffer and 0.5 m return clearance.
        const gateDressingTransform = {
          x: world.x,
          y: world.y,
          z: world.z,
          sx: width,
          sy: height,
          sz: depth,
          yawRad,
        };
        batches.heroGateCoolTextile.instances.push(gateDressingTransform);
        batches.heroGateCoolFrame.instances.push(gateDressingTransform);
        batches.heroGateWarmTextile.instances.push(gateDressingTransform);
        batches.heroGateWarmFrame.instances.push(gateDressingTransform);
        batches.heroCrown.instances.push({
          x: world.x,
          y: world.y + height * 0.5,
          z: world.z,
          sx: width,
          sy: height,
          // Relief blocks extend 3% beyond the normalized ring faces; keep the
          // finished trim, not just the base extrusion, inside authored depth.
          sz: depth * 0.93,
          yawRad,
        });
        // The open portal and its finished inner frame derive from the same
        // 13 m gate bay. No recess, door leaf, grille, or other visual closure
        // is allowed inside this already-traversable opening.
        const recessWidth = Math.min(width * 0.44, 5.7);
        const recessHeight = Math.min(height * 0.71, 4.82);
        batches.heroInnerFrame.instances.push({
          x: world.x + Math.sin(yawRad) * depth * 0.08,
          y: world.y + (recessHeight + 0.8) * 0.5,
          z: world.z + Math.cos(yawRad) * depth * 0.08,
          sx: recessWidth + 1.3,
          sy: recessHeight + 0.8,
          sz: depth * 0.5,
          yawRad,
        });
        break;
      }
      case "bazaar_tea_service":
        batches.teaService.instances.push(transform);
        batches.teaVessels.instances.push(transform);
        break;
      case "bazaar_service_door":
        batches.serviceDoor.instances.push(transform);
        break;
      case "bazaar_spawn_cover":
        batches.spawnCover.instances.push(transform);
        break;
      case "bazaar_date_palm":
        // The dedicated instanced palm renderer owns this module's geometry.
        // Keep the authoritative placement record so QA verifies the actual palm.
        break;
      default:
        rendered = false;
        break;
    }
    if (rendered) record(placement, "module", center);
  }

  const dummy = new Object3D();
  for (const batch of compiledBatches) {
    if (batch.instances.length === 0) continue;
    const geometry = ensureBatchVertexColors(batch.createGeometry(), batch.vertexColors);
    const textureMap = batch.textureUrl
      ? loadTiledTexture(batch.textureUrl, batch.textureRepeat)
      : batch.textureGenerator === "painted-wood-sign-a"
        ? createPaintedWoodSignTexture("a")
        : batch.textureGenerator === "painted-wood-sign-b"
          ? createPaintedWoodSignTexture("b")
          : batch.textureGenerator === "painted-wood-sign-c"
            ? createPaintedWoodSignTexture("c")
          : batch.textureGenerator === "glazed-fountain-tile"
            ? createGlazedFountainTileTexture()
          : batch.textureGenerator === "prop-ground-contact"
            ? createGroundContactTexture()
            : null;
    const normalMap = batch.normalTextureUrl
      ? loadTiledTexture(batch.normalTextureUrl, batch.textureRepeat, "normal")
      : null;
    const armMap = batch.armTextureUrl
      ? loadTiledTexture(batch.armTextureUrl, batch.textureRepeat, "arm")
      : null;
    if (armMap && geometry.getAttribute("uv")) {
      const uv = geometry.getAttribute("uv");
      if (!geometry.getAttribute("uv1")) geometry.setAttribute("uv1", uv.clone());
      if (!geometry.getAttribute("uv2")) geometry.setAttribute("uv2", uv.clone());
    }
    const material = batch.materialStyle === "water"
      ? new MeshPhysicalMaterial({
        color: FOUNTAIN_WATER_MATERIAL_INPUTS.color,
        emissive: 0x000000,
        emissiveIntensity: FOUNTAIN_WATER_MATERIAL_INPUTS.emissiveIntensity,
        roughness: FOUNTAIN_WATER_MATERIAL_INPUTS.roughness,
        metalness: FOUNTAIN_WATER_MATERIAL_INPUTS.metalness,
        transmission: FOUNTAIN_WATER_MATERIAL_INPUTS.transmission,
        transparent: true,
        opacity: FOUNTAIN_WATER_MATERIAL_INPUTS.opacity,
        depthWrite: false,
        clearcoat: FOUNTAIN_WATER_MATERIAL_INPUTS.clearcoat,
        clearcoatRoughness: FOUNTAIN_WATER_MATERIAL_INPUTS.clearcoatRoughness,
        ior: FOUNTAIN_WATER_MATERIAL_INPUTS.ior,
        reflectivity: FOUNTAIN_WATER_MATERIAL_INPUTS.reflectivity,
        thickness: FOUNTAIN_WATER_MATERIAL_INPUTS.thickness,
        attenuationColor: FOUNTAIN_WATER_MATERIAL_INPUTS.attenuationColor,
        attenuationDistance: FOUNTAIN_WATER_MATERIAL_INPUTS.attenuationDistance,
        envMapIntensity: FOUNTAIN_WATER_MATERIAL_INPUTS.envMapIntensity,
        specularIntensity: FOUNTAIN_WATER_MATERIAL_INPUTS.specularIntensity,
        specularColor: FOUNTAIN_WATER_MATERIAL_INPUTS.specularColor,
        normalMap: createFountainRippleNormalTexture(),
      })
      : batch.kind === "canopy" && textureMap
        ? new MeshPhysicalMaterial({
          color: batch.color,
          map: textureMap,
          normalMap,
          aoMap: armMap,
          roughnessMap: armMap,
          roughness: batch.roughness,
          metalness: 0,
          transmission: 0.08,
          thickness: 0.035,
          ior: 1.35,
          attenuationColor: 0xd8c8af,
          attenuationDistance: 0.55,
          envMapIntensity: 0.72,
          vertexColors: batch.vertexColors,
        })
      : new MeshStandardMaterial({
        color: batch.color,
        map: textureMap,
        emissive: batch.emissiveIntensity > 0 ? batch.color : 0x000000,
        emissiveMap: batch.emissiveIntensity > 0 ? textureMap : null,
        emissiveIntensity: batch.emissiveIntensity,
        normalMap,
        aoMap: armMap,
        roughnessMap: armMap,
        roughness: batch.roughness,
        metalness: batch.metalness,
        vertexColors: batch.vertexColors,
      });
    if (material instanceof MeshStandardMaterial && normalMap) {
      material.normalScale.set(batch.normalScale, batch.normalScale);
    }
    if (batch.materialStyle === "water" && material instanceof MeshPhysicalMaterial) {
      material.normalScale.set(
        FOUNTAIN_WATER_MATERIAL_INPUTS.normalScale,
        FOUNTAIN_WATER_MATERIAL_INPUTS.normalScale,
      );
      const baseOnBeforeCompile = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        baseOnBeforeCompile.call(material, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          `
            float fountainFresnel = pow(
              1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0),
              3.0
            );
            outgoingLight += vec3(0.34, 0.56, 0.58)
              * fountainFresnel
              * ${FOUNTAIN_WATER_MATERIAL_INPUTS.fresnelStrength.toFixed(2)};
            diffuseColor.a = mix(
              diffuseColor.a,
              min(0.52, diffuseColor.a + 0.18),
              fountainFresnel
            );
            #include <opaque_fragment>
          `,
        );
      };
      material.customProgramCacheKey = () => "fountain-water-fresnel-v1";
      material.userData.fountainWaterShader = {
        response: "view-dependent-fresnel",
        fresnelStrength: FOUNTAIN_WATER_MATERIAL_INPUTS.fresnelStrength,
        rippleNormal: "procedural-scrolling",
      };
    }
    if (batch.textureGenerator === "prop-ground-contact" && material instanceof MeshStandardMaterial) {
      material.transparent = true;
      material.depthWrite = false;
      material.alphaTest = 0.004;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -3;
      material.needsUpdate = true;
    }
    if (material instanceof MeshStandardMaterial && batch.albedoBoost !== 1) {
      material.color.multiplyScalar(batch.albedoBoost);
    }
    if (material instanceof MeshStandardMaterial && armMap) {
      material.aoMapIntensity = 0.28;
    }
    material.userData.materialId = batch.materialId;
    material.userData.textureSet = {
      albedo: batch.textureUrl,
      normal: batch.normalTextureUrl,
      arm: batch.armTextureUrl,
    };
    if (batch.doubleSided) material.side = DoubleSide;
    const mesh = new InstancedMesh(geometry, material, batch.instances.length);
    mesh.name = batch.id;
    mesh.userData.materialId = batch.materialId;
    if (batch.materialStyle === "water" && material instanceof MeshPhysicalMaterial && material.normalMap) {
      let rippleFrame = 0;
      const rippleNormal = material.normalMap;
      mesh.onBeforeRender = () => {
        rippleFrame += 1;
        rippleNormal.offset.x = (
          rippleFrame * FOUNTAIN_WATER_MATERIAL_INPUTS.rippleScrollPerFrame.x
        ) % 1;
        rippleNormal.offset.y = (
          rippleFrame * FOUNTAIN_WATER_MATERIAL_INPUTS.rippleScrollPerFrame.y
        ) % 1;
      };
      mesh.userData.fountainWaterAnimation = {
        clock: "render-frame",
        scrollPerFrame: FOUNTAIN_WATER_MATERIAL_INPUTS.rippleScrollPerFrame,
      };
    }
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    for (let index = 0; index < batch.instances.length; index += 1) {
      const instance = batch.instances[index]!;
      dummy.position.set(instance.x, instance.y, instance.z);
      dummy.rotation.set(instance.pitchRad ?? 0, instance.yawRad, 0);
      dummy.scale.set(instance.sx, instance.sy, instance.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (typeof instance.tintHex === "number") mesh.setColorAt(index, new Color(instance.tintHex));
    }
    if (batch.instances.some((instance) => instance.visualQa)) {
      mesh.userData.visualQaInstances = batch.instances.map((instance) => instance.visualQa ?? null);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
    root.add(mesh);
  }

  instanceSharedStaticModelMeshes(root, renderedPlacements);

  return { root, renderedPlacements };
}

export function buildProps(options: BuildPropsOptions): PropsBuildResult {
  const root = new Group();
  root.name = "map-props";
  const usesCompiledV3Dressing = options.propVisuals === "bazaar"
    && String(options.blockout.formatVersion).startsWith("3")
    && (options.blockout.dressingPlacements?.length ?? 0) > 0;

  const seed = resolveRuntimeSeed(options.mapId, options.seedOverride);
  const chaos = options.propVisuals === "bazaar"
    ? { profile: "subtle" as const, jitter: 0, cluster: 0, density: 1, decorativeDropout: 0 }
    : resolveChaos(options.propChaos);
  const rngRoot = new DeterministicRng(seed);
  const palette = resolveBlockoutPalette(options.highVis);

  const explicitClearTravelRects = options.blockout.zones
    .filter((zone) => zone.type === "clear_travel_zone")
    .map((zone) => zone.rect);
  const derivedClearTravelRects = options.blockout.zones
    .filter((zone) => typeof zone.clearWidthM === "number")
    .map((zone): RuntimeRect => {
      if (zone.type === "connector" || zone.type === "cut") return zone.rect;
      const clearWidthM = Math.min(zone.rect.w, zone.clearWidthM!);
      return {
        x: zone.rect.x + (zone.rect.w - clearWidthM) * 0.5,
        y: zone.rect.y,
        w: clearWidthM,
        h: zone.rect.h,
      };
    });
  const clearTravelRects = [...explicitClearTravelRects, ...derivedClearTravelRects];
  const stallStripRects = options.blockout.zones
    .filter((zone) => zone.type === "stall_strip")
    .map((zone) => zone.rect);
  const narrowPassageRects = options.blockout.zones
    .filter((zone) => zone.type === "cut" || zone.type === "connector")
    .map((zone) => zone.rect);

  const boundary = options.blockout.playable_boundary;
  const boundaryCenterX = boundary.x + boundary.w * 0.5;
  const boundaryCenterZ = boundary.y + boundary.h * 0.5;

  const resolveColor = (highVisColor: number, naturalColor: number): number => (
    options.highVis ? highVisColor : naturalColor
  );
  const batches = {
    shopfront: createBatch(
      "prop-shopfront",
      resolveColor(palette.shopfront, 0x76513a),
      "shopfront",
      createMarketStallGeometry,
      { castShadow: true },
    ),
    signage: createBatch("prop-signage", resolveColor(palette.signage, 0x5d4935), "signage", () => new BoxGeometry(1, 1, 1), { castShadow: true, receiveShadow: true }),
    signageFrame: createBatch("prop-signage-frame", resolveColor(palette.shopfront, 0x34261f), "signage", createSignFrameGeometry, { castShadow: true, receiveShadow: true }),
    cover: createBatch("prop-cover", resolveColor(palette.cover, 0x8a623e), "cover", createCrateGeometry, { castShadow: true }),
    coverBarrel: createBatch("prop-cover-barrel", resolveColor(palette.cover, 0x675044), "cover", createBarrelGeometry, { castShadow: true }),
    spawnCover: createBatch("prop-spawn-cover", resolveColor(palette.spawnCover, 0x956c43), "spawnCover", createCrateGeometry, { castShadow: true }),
    spawnCoverBarrel: createBatch("prop-spawn-cover-barrel", resolveColor(palette.spawnCover, 0x6f5444), "spawnCover", createBarrelGeometry, { castShadow: true }),
    serviceDoor: createBatch("prop-service-door", resolveColor(palette.serviceDoor, 0x425a50), "serviceDoor", createShutterGeometry, { castShadow: true }),
    thresholdRug: createBatch("prop-threshold-rug", 0xffffff, "thresholdRug", () => new BoxGeometry(1, 1, 1), {
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
    }),
    canopy: createBatch("prop-canopy", 0xffffff, "canopy", createClothGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/canopy_stripe_albedo_v1.jpg",
      textureRepeat: [2, 1],
    }),
    canopyTeal: createBatch("prop-canopy-teal", 0xffffff, "canopy", createClothGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/canopy_stripe_albedo_v1.jpg",
      textureRepeat: [2, 1],
    }),
    heroPillar: createBatch("prop-hero-pillar", resolveColor(palette.heroPillar, 0xa98b67), "heroPillar", () => new BoxGeometry(1, 1, 1), { castShadow: true }),
    heroLintel: createBatch("prop-hero-lintel", resolveColor(palette.heroLintel, 0xb49a78), "heroLintel", createHeroGateCrownGeometry, { castShadow: true }),
    landmarkWell: createBatch("prop-landmark-well", palette.landmarkWell, "landmarkWell", () => new CylinderGeometry(0.5, 0.62, 1, 14), { castShadow: true }),
    fountainStone: createBatch("prop-fountain-stone", resolveColor(palette.landmarkWell, 0xa98c68), "fountainStone", () => new CylinderGeometry(0.5, 0.5, 1, 8), { castShadow: true }),
    fountainTile: createBatch("prop-fountain-tile", resolveColor(palette.signage, 0x315f66), "fountainTile", () => new CylinderGeometry(0.5, 0.5, 1, 8), { receiveShadow: true }),
    fountainWater: createBatch("prop-fountain-water", resolveColor(palette.signage, 0x497f88), "fountainWater", () => new CylinderGeometry(0.5, 0.5, 1, 24), { receiveShadow: true }),
    landmarkCart: createBatch("prop-landmark-cart", resolveColor(palette.shopfront, 0x745036), "landmarkCart", createCartGeometry, { castShadow: true }),
    lantern: createBatch("prop-lantern", resolveColor(palette.signage, 0xc98a3d), "lantern", createLanternGeometry, { castShadow: false, receiveShadow: false }),
    produceOrange: createBatch("prop-produce-orange", 0xd9792f, "produce", () => new SphereGeometry(0.5, 8, 6), { castShadow: false, receiveShadow: false }),
    produceRed: createBatch("prop-produce-red", 0xa94531, "produce", () => new SphereGeometry(0.5, 8, 6), { castShadow: false, receiveShadow: false }),
    produceGreen: createBatch("prop-produce-green", 0x6f823e, "produce", () => new SphereGeometry(0.5, 8, 6), { castShadow: false, receiveShadow: false }),
    filler: createBatch("prop-stall-filler-crate", resolveColor(palette.filler, 0x956b43), "filler", createCrateGeometry),
    fillerSack: createBatch("prop-stall-filler-sack", resolveColor(palette.filler, 0xb99a6c), "filler", createSackGeometry),
    fillerPottery: createBatch("prop-stall-filler-pottery", resolveColor(palette.filler, 0xa65d3d), "filler", createPotteryGeometry),
  };

  const stats: PropsBuildStats = {
    seed,
    profile: chaos.profile,
    jitter: chaos.jitter,
    cluster: chaos.cluster,
    density: chaos.density,
    totalAnchors: options.anchors.anchors.length,
    candidatesTotal: 0,
    collidersPlaced: 0,
    rejectedClearZone: 0,
    rejectedBounds: 0,
    rejectedGapRule: 0,
    visualOnlyLandmarks: 0,
    stallFillersPlaced: 0,
  };

  const colliders: RuntimeColliderAabb[] = [];
  const placements: PropPlacement[] = [];
  const classificationByAnchorId = new Map<string, string>();
  for (const cluster of options.blockout.dressingClusters ?? []) {
    for (const anchorId of cluster.anchors ?? []) {
      classificationByAnchorId.set(anchorId, cluster.classification);
    }
  }
  const surfaceResolver = new TraversalSurfaceResolver(options.blockout.traversalSurfaces ?? []);
  let placementSequence = 0;

  function nextPlacementId(anchorId: string, kind: PropPlacementKind): string {
    const id = `${anchorId}-${kind}-${placementSequence}`;
    placementSequence += 1;
    return id;
  }

  function recordPlacement(
    anchorId: string,
    kind: PropPlacementKind,
    transform: InstanceSpec,
    colliderDims: { x: number; y: number; z: number } | null,
    explicitId?: string,
  ): void {
    placements.push({
      id: explicitId ?? nextPlacementId(anchorId, kind),
      anchorId,
      kind,
      transform,
      colliderDims,
    });
  }

  function rejectReason(collider: RuntimeColliderAabb): "clear" | "bounds" | "gap" | null {
    for (const rect of clearTravelRects) {
      if (overlapsRect2d(collider, rect)) {
        return "clear";
      }
    }

    const minX = boundary.x + BOUNDS_EPSILON;
    const maxX = boundary.x + boundary.w - BOUNDS_EPSILON;
    const minZ = boundary.y + BOUNDS_EPSILON;
    const maxZ = boundary.y + boundary.h - BOUNDS_EPSILON;
    if (collider.min.x < minX || collider.max.x > maxX || collider.min.z < minZ || collider.max.z > maxZ) {
      return "bounds";
    }

    for (const rect of narrowPassageRects) {
      if (!overlapsRect2d(collider, rect)) {
        continue;
      }

      const overlapX = overlapLength(collider.min.x, collider.max.x, rect.x, rect.x + rect.w);
      const overlapZ = overlapLength(collider.min.z, collider.max.z, rect.y, rect.y + rect.h);
      if (overlapX <= 0 || overlapZ <= 0) {
        continue;
      }

      const narrowAlongX = rect.w <= rect.h;
      const occupiedAcross = narrowAlongX ? overlapX : overlapZ;
      const availableAcross = (narrowAlongX ? rect.w : rect.h) - occupiedAcross;
      if (availableAcross < GAP_RULE_MIN_PASSAGE_M) {
        return "gap";
      }
    }

    return null;
  }

  function registerRejection(reason: "clear" | "bounds" | "gap"): void {
    if (reason === "clear") {
      stats.rejectedClearZone += 1;
    } else if (reason === "bounds") {
      stats.rejectedBounds += 1;
    } else {
      stats.rejectedGapRule += 1;
    }
  }

  function placeCollidingBox(
    anchorId: string,
    suffix: string,
    batch: InstanceBatch,
    center: WorldVec3,
    size: { x: number; y: number; z: number },
    yawRad: number,
  ): void {
    const colliderId = `${anchorId}-${suffix}`;
    const collider = createColliderFromOrientedBox(colliderId, center, size, yawRad);
    stats.candidatesTotal += 1;

    const reason = rejectReason(collider);
    if (reason) {
      registerRejection(reason);
      return;
    }

    const classification = classificationByAnchorId.get(anchorId);
    if (classification === "overhead") {
      const floorY = surfaceResolver.sample(center.x, center.z, center.y)?.elevationM ?? 0;
      if (collider.min.y - floorY < 2.2) {
        registerRejection("gap");
        return;
      }
    }

    pushInstance(batch, center.x, center.y, center.z, size.x, size.y, size.z, yawRad);
    const gameplayCollider = classification === "soft_visual" || classification === "overhead"
      ? null
      : { x: size.x, y: size.y, z: size.z };
    recordPlacement(
      anchorId,
      batch.kind,
      { x: center.x, y: center.y, z: center.z, sx: size.x, sy: size.y, sz: size.z, yawRad },
      gameplayCollider,
      colliderId,
    );
    if (gameplayCollider) {
      colliders.push(collider);
      stats.collidersPlaced += 1;
    }
  }

  function placeOverheadVisual(
    anchorId: string,
    batch: InstanceBatch,
    center: WorldVec3,
    size: { x: number; y: number; z: number },
    yawRad: number,
  ): void {
    const visualBounds = createColliderFromOrientedBox(`${anchorId}-overhead-bounds`, center, size, yawRad);
    stats.candidatesTotal += 1;
    if (
      visualBounds.min.x < boundary.x + BOUNDS_EPSILON
      || visualBounds.max.x > boundary.x + boundary.w - BOUNDS_EPSILON
      || visualBounds.min.z < boundary.y + BOUNDS_EPSILON
      || visualBounds.max.z > boundary.y + boundary.h - BOUNDS_EPSILON
    ) {
      registerRejection("bounds");
      return;
    }
    const floorY = surfaceResolver.sample(center.x, center.z, center.y)?.elevationM ?? 0;
    if (visualBounds.min.y - floorY < 2.2) {
      registerRejection("gap");
      return;
    }
    pushInstance(batch, center.x, center.y, center.z, size.x, size.y, size.z, yawRad);
    recordPlacement(
      anchorId,
      batch.kind,
      { x: center.x, y: center.y, z: center.z, sx: size.x, sy: size.y, sz: size.z, yawRad },
      null,
      visualBounds.id,
    );
  }

  const streamByType = {
    shopfront: rngRoot.fork("shopfront"),
    signage: rngRoot.fork("signage"),
    cover: rngRoot.fork("cover"),
    spawnCover: rngRoot.fork("spawn-cover"),
    serviceDoor: rngRoot.fork("service-door"),
    canopy: rngRoot.fork("canopy"),
    hero: rngRoot.fork("hero"),
    landmark: rngRoot.fork("landmark"),
    filler: rngRoot.fork("filler"),
  };

  const sortedAnchors = [...options.anchors.anchors].sort((a, b) => a.id.localeCompare(b.id));

  // Build open-node exclusion list — intentional market gap zones.
  // widthM on an open_node encodes the exclusion radius in design space.
  type OpenNodeCircle = { x: number; z: number; radiusSq: number };
  const openNodeCircles: OpenNodeCircle[] = sortedAnchors
    .filter((a) => a.type.toLowerCase() === "open_node")
    .map((a) => {
      const w = toWorldPosition(a);
      const r = a.widthM ?? 2.5;
      return { x: w.x, z: w.z, radiusSq: r * r };
    });

  function isNearOpenNode(x: number, z: number): boolean {
    for (const circle of openNodeCircles) {
      const dx = x - circle.x;
      const dz = z - circle.z;
      if (dx * dx + dz * dz < circle.radiusSq) return true;
    }
    return false;
  }

  const shopfrontLines = buildAnchorLineGroups(
    sortedAnchors.filter((anchor) => anchor.type.toLowerCase() === "shopfront_anchor"),
    "shopfront_anchor",
  );
  const signageLines = buildAnchorLineGroups(
    sortedAnchors.filter((anchor) => anchor.type.toLowerCase() === "signage_anchor"),
    "signage_anchor",
  );

  const shopfrontLineSpan = new Map<string, number>();
  for (const line of shopfrontLines) {
    const points = line.points;
    for (let i = 0; i < points.length; i += 1) {
      const current = points[i]!;
      const prevGap = i > 0 ? Math.abs(current.along - points[i - 1]!.along) : 0;
      const nextGap = i < points.length - 1 ? Math.abs(points[i + 1]!.along - current.along) : 0;
      const averageGap = prevGap > 0 && nextGap > 0
        ? (prevGap + nextGap) * 0.5
        : Math.max(prevGap, nextGap, 1.35);
      shopfrontLineSpan.set(current.anchor.id, clamp(averageGap, 0.95, 3.2));
    }
  }

  const shopfrontVisibility = options.propVisuals === "bazaar"
    ? new Set(sortedAnchors.filter((anchor) => anchor.type.toLowerCase() === "shopfront_anchor").map((anchor) => anchor.id))
    : buildLinePresenceMask(shopfrontLines, chaos, rngRoot.fork("rhythm-shopfront"));
  const signageVisibility = options.propVisuals === "bazaar"
    ? new Set(sortedAnchors.filter((anchor) => anchor.type.toLowerCase() === "signage_anchor").map((anchor) => anchor.id))
    : buildLinePresenceMask(signageLines, chaos, rngRoot.fork("rhythm-signage"));

  for (const anchor of sortedAnchors) {
    const type = anchor.type.toLowerCase();
    const base = toWorldPosition(anchor);
    const baseYaw = yawDegToRad(anchor.yawDeg);

    if (type === "open_node") {
      // Open nodes define intentional market gaps. No geometry placed.
      continue;
    }

    if (type === "shopfront_anchor") {
      if (!shopfrontVisibility.has(anchor.id)) {
        continue;
      }

      const rng = streamByType.shopfront.fork(anchor.id);
      const extraGapChance = clamp(0.32 - chaos.density * 0.22 + (1 - chaos.cluster) * 0.08, 0.08, 0.34);
      if (rng.next() < extraGapChance) {
        continue;
      }

      const forwardX = -Math.sin(baseYaw);
      const forwardZ = -Math.cos(baseYaw);
      const tangentX = Math.cos(baseYaw);
      const tangentZ = -Math.sin(baseYaw);
      const lineSpan = shopfrontLineSpan.get(anchor.id) ?? 1.4;

      const alongJitter = (rng.next() - 0.5) * 2 * (0.5 + 0.75 * chaos.jitter + 0.5 * chaos.cluster);
      const inwardJitter = (rng.next() - 0.5) * 2 * (0.01 + 0.05 * chaos.jitter);
      const yawJitter = (rng.next() - 0.5) * 2 * (4 + 8 * chaos.jitter) * DEG_TO_RAD;

      // Use anchor.widthM as the authoritative stall width (±20% jitter) when provided.
      // Fall back to neighbor-gap heuristic for anchors without an explicit width.
      const baseWidth = anchor.widthM ?? lineSpan;
      const widthJitter = anchor.widthM
        ? rng.range(0.82, 1.18)
        : rng.range(0.42, 1.75) * (0.82 + chaos.cluster * 0.52);

      const baseHeight = anchor.heightM ?? (2.2 + rng.range(-0.5, 0.95) * (0.65 + chaos.jitter * 0.75));

      const size = {
        x: clamp(baseWidth * widthJitter, 0.55, 3.45),
        y: clamp(baseHeight, 1.75, 3.8),
        z: clamp(0.28 + rng.range(-0.08, 0.18) * (0.55 + chaos.jitter * 0.8), 0.2, 0.62),
      };
      const center = {
        x: base.x + tangentX * alongJitter + forwardX * inwardJitter,
        y: Math.max(0, base.y) + size.y * 0.5,
        z: base.z + tangentZ * alongJitter + forwardZ * inwardJitter,
      };

      placeCollidingBox(anchor.id, "shop", batches.shopfront, center, size, baseYaw + yawJitter);
      continue;
    }

    if (type === "signage_anchor") {
      if (!signageVisibility.has(anchor.id)) {
        continue;
      }

      const rng = streamByType.signage.fork(anchor.id);
      if (shouldDropDecorative(rng, chaos, -0.16)) {
        continue;
      }

      const tangentX = Math.cos(baseYaw);
      const tangentZ = -Math.sin(baseYaw);
      const forwardX = -Math.sin(baseYaw);
      const forwardZ = -Math.cos(baseYaw);

      const size = {
        x: clamp(0.58 + rng.range(0.15, 0.72) * (0.55 + chaos.density), 0.55, 1.55),
        y: clamp(0.28 + rng.range(0.08, 0.34) * (0.55 + chaos.jitter * 0.75), 0.28, 0.72),
        z: 0.08 + rng.range(0.02, 0.05),
      };

      const alongJitter = rng.range(-0.72, 0.72) * (0.4 + chaos.cluster * 1.08);
      const inwardJitter = rng.range(-0.48, 0.48) * (0.3 + chaos.jitter * 1.1);
      const center = {
        x: base.x + tangentX * alongJitter + forwardX * inwardJitter,
        y: Math.max(2.45, base.y + rng.range(-0.35, 1.05) * (0.65 + chaos.jitter * 0.85)),
        z: base.z + tangentZ * alongJitter + forwardZ * inwardJitter,
      };
      const yaw = baseYaw + rng.range(-1, 1) * (12 + 28 * chaos.jitter) * DEG_TO_RAD;

      pushInstance(batches.signage, center.x, center.y, center.z, size.x, size.y, size.z, yaw);
      pushInstance(batches.signageFrame, center.x, center.y, center.z, size.x, size.y, size.z, yaw);
      recordPlacement(
        anchor.id,
        batches.signage.kind,
        { x: center.x, y: center.y, z: center.z, sx: size.x, sy: size.y, sz: size.z, yawRad: yaw },
        null,
      );
      continue;
    }

    if (type === "cover_cluster") {
      const rng = streamByType.cover.fork(anchor.id);
      const count = pickWeightedCount(
        rng,
        1.1 - chaos.cluster * 0.55,
        1.0,
        0.25 + chaos.cluster * 1.35,
      );
      const clusterRadius = 0.28 + chaos.cluster * 0.75;

      for (let i = 0; i < count; i += 1) {
        const pieceSeed = rng.fork(`piece-${i}`);
        const angle = pieceSeed.range(0, Math.PI * 2);
        const radius = pieceSeed.range(0.18, clusterRadius);
        const size = {
          x: anchor.widthM
            ? clamp(anchor.widthM * pieceSeed.range(0.48, 0.68), 0.72, 1.6)
            : pieceSeed.range(0.72, 1.34),
          y: anchor.heightM ?? pieceSeed.range(1.04, 1.32),
          z: pieceSeed.range(0.62, 1.18),
        };

        const center = {
          x: base.x + Math.cos(angle) * radius,
          y: base.y + size.y * 0.5,
          z: base.z + Math.sin(angle) * radius,
        };
        const yaw = baseYaw + pieceSeed.range(-1, 1) * (10 + 28 * chaos.jitter) * DEG_TO_RAD;
        const coverBatch = pieceSeed.fork("form").next() < 0.34 ? batches.coverBarrel : batches.cover;
        placeCollidingBox(anchor.id, `cover-${i + 1}`, coverBatch, center, size, yaw);
      }

      const accentRng = rng.fork("soft-accent");
      const accentSize = {
        x: accentRng.range(0.42, 0.66),
        y: accentRng.range(0.5, 0.82),
        z: accentRng.range(0.42, 0.66),
      };
      const accentAngle = accentRng.range(0, Math.PI * 2);
      const accentCenter = {
        x: base.x + Math.cos(accentAngle) * (clusterRadius + 0.28),
        y: base.y + accentSize.y * 0.5,
        z: base.z + Math.sin(accentAngle) * (clusterRadius + 0.28),
      };
      const accentYaw = accentRng.range(-Math.PI, Math.PI);
      const accentBounds = createColliderFromOrientedBox(
        `${anchor.id}-soft-accent-bounds`,
        accentCenter,
        accentSize,
        accentYaw,
      );
      if (!rejectReason(accentBounds)) {
        const accentBatch = accentRng.next() < 0.5 ? batches.fillerSack : batches.fillerPottery;
        pushInstance(
          accentBatch,
          accentCenter.x,
          accentCenter.y,
          accentCenter.z,
          accentSize.x,
          accentSize.y,
          accentSize.z,
          accentYaw,
        );
        recordPlacement(
          anchor.id,
          accentBatch.kind,
          {
            x: accentCenter.x,
            y: accentCenter.y,
            z: accentCenter.z,
            sx: accentSize.x,
            sy: accentSize.y,
            sz: accentSize.z,
            yawRad: accentYaw,
          },
          null,
          `${anchor.id}-soft-accent`,
        );
        const produceBatches = [batches.produceOrange, batches.produceRed, batches.produceGreen] as const;
        for (let produceIndex = 0; produceIndex < 6; produceIndex += 1) {
          const produceRng = accentRng.fork(`produce-${produceIndex}`);
          const angle = (produceIndex / 6) * Math.PI * 2 + produceRng.range(-0.18, 0.18);
          const radius = produceRng.range(0.16, 0.38);
          const diameter = produceRng.range(0.14, 0.23);
          const produceBatch = produceBatches[produceIndex % produceBatches.length]!;
          const transform = {
            x: accentCenter.x + Math.cos(angle) * radius,
            y: base.y + diameter * 0.5,
            z: accentCenter.z + Math.sin(angle) * radius,
            sx: diameter,
            sy: diameter,
            sz: diameter,
            yawRad: produceRng.range(-Math.PI, Math.PI),
          };
          pushInstance(produceBatch, transform.x, transform.y, transform.z, transform.sx, transform.sy, transform.sz, transform.yawRad);
          recordPlacement(anchor.id, produceBatch.kind, transform, null, `${anchor.id}-produce-${produceIndex}`);
        }
      }
      continue;
    }

    if (type === "spawn_cover") {
      const rng = streamByType.spawnCover.fork(anchor.id);
      const count = rng.next() < 0.55 + chaos.cluster * 0.25 ? 2 : 1;
      const spread = 0.35 + 0.55 * chaos.cluster;

      for (let i = 0; i < count; i += 1) {
        const pieceRng = rng.fork(`piece-${i}`);
        const angle = pieceRng.range(0, Math.PI * 2);
        const radius = count === 1 ? 0 : pieceRng.range(0.2, spread);
        const size = {
          x: anchor.widthM
            ? clamp(anchor.widthM / count * pieceRng.range(0.84, 1.08), 1.0, 2.2)
            : pieceRng.range(1.2, 1.9),
          y: anchor.heightM ?? pieceRng.range(1.0, 1.25),
          z: pieceRng.range(0.68, 1.15),
        };
        const center = {
          x: base.x + Math.cos(angle) * radius,
          y: base.y + size.y * 0.5,
          z: base.z + Math.sin(angle) * radius,
        };
        const yaw = baseYaw + pieceRng.range(-1, 1) * (9 + 18 * chaos.jitter) * DEG_TO_RAD;
        const coverBatch = pieceRng.fork("form").next() < 0.28 ? batches.spawnCoverBarrel : batches.spawnCover;
        placeCollidingBox(anchor.id, `spawn-cover-${i + 1}`, coverBatch, center, size, yaw);
      }
      continue;
    }

    if (type === "service_door_anchor") {
      const rng = streamByType.serviceDoor.fork(anchor.id);
      if (shouldDropDecorative(rng, chaos, 0.08)) {
        continue;
      }

      const size = {
        x: 0.86 + rng.range(-0.05, 0.05) * chaos.jitter,
        y: 2.2 + rng.range(-0.12, 0.12) * chaos.jitter,
        z: 0.12,
      };
      const center = {
        x: base.x + rng.range(-0.08, 0.08) * chaos.jitter,
        y: base.y + size.y * 0.5,
        z: base.z + rng.range(-0.2, 0.2) * chaos.jitter,
      };
      const yaw = baseYaw + rng.range(-1, 1) * (2 + 4 * chaos.jitter) * DEG_TO_RAD;
      pushInstance(batches.serviceDoor, center.x, center.y, center.z, size.x, size.y, size.z, yaw);
      recordPlacement(
        anchor.id,
        batches.serviceDoor.kind,
        { x: center.x, y: center.y, z: center.z, sx: size.x, sy: size.y, sz: size.z, yawRad: yaw },
        null,
      );

      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rugSize = {
        x: clamp(size.x * 1.35, 0.95, 1.5),
        y: 0.06,
        z: clamp(0.92 + rng.range(-0.1, 0.18), 0.72, 1.35),
      };
      const rugTransform = {
        x: center.x + forwardX * 0.44,
        y: base.y + rugSize.y * 0.5,
        z: center.z + forwardZ * 0.44,
        sx: rugSize.x,
        sy: rugSize.y,
        sz: rugSize.z,
        yawRad: yaw,
      };
      pushInstance(
        batches.thresholdRug,
        rugTransform.x,
        rugTransform.y,
        rugTransform.z,
        rugTransform.sx,
        rugTransform.sy,
        rugTransform.sz,
        rugTransform.yawRad,
      );
      recordPlacement(
        anchor.id,
        "thresholdRug",
        rugTransform,
        null,
        `${anchor.id}-threshold-rug`,
      );
      continue;
    }

    if (type === "cloth_canopy_span") {
      const rng = streamByType.canopy.fork(anchor.id);
      if (shouldDropDecorative(rng, chaos, 0.02)) {
        continue;
      }

      if (anchor.endPos) {
        const end = {
          x: anchor.endPos.x,
          y: anchor.endPos.z,
          z: anchor.endPos.y,
        };
        const dx = end.x - base.x;
        const dz = end.z - base.z;
        const length = Math.max(0.25, Math.hypot(dx, dz));
        const yaw = Math.atan2(dz, dx) + rng.range(-1, 1) * (2 + 5 * chaos.jitter) * DEG_TO_RAD;
        const center = {
          x: (base.x + end.x) * 0.5 + rng.range(-0.18, 0.18) * chaos.jitter,
          y: Math.max(2.65, (base.y + end.y) * 0.5 - rng.range(0.1, 0.28) * (0.4 + chaos.cluster)),
          z: (base.z + end.z) * 0.5 + rng.range(-0.18, 0.18) * chaos.jitter,
        };
        const size = {
          x: length,
          y: 0.22 + rng.range(0, 0.08),
          z: clamp((anchor.widthM ?? 2.8) * (0.9 + rng.range(0, 0.12) * chaos.density), 1.8, 4.8),
        };
        const canopyBatch = rng.fork("cloth-color").next() < 0.34 ? batches.canopyTeal : batches.canopy;
        placeOverheadVisual(anchor.id, canopyBatch, center, size, yaw);
      } else {
        const size = {
          x: clamp(anchor.widthM ?? 2.6, 1.8, 8),
          y: 0.12,
          z: 0.75 + rng.range(-0.1, 0.16) * chaos.jitter,
        };
        const center = {
          x: base.x + rng.range(-0.2, 0.2) * chaos.jitter,
          y: Math.max(3.2, base.y - rng.range(0.05, 0.2) * (0.4 + chaos.cluster)),
          z: base.z + rng.range(-0.2, 0.2) * chaos.jitter,
        };
        const canopyBatch = rng.fork("cloth-color").next() < 0.34 ? batches.canopyTeal : batches.canopy;
        placeOverheadVisual(anchor.id, canopyBatch, center, size, baseYaw);
      }
      continue;
    }

    if (type === "lantern_anchor") {
      const rng = streamByType.signage.fork(anchor.id);
      const size = {
        x: clamp(anchor.widthM ?? 0.42, 0.28, 0.7),
        y: clamp(anchor.heightM ?? 0.72, 0.48, 1.1),
        z: clamp(anchor.widthM ?? 0.42, 0.28, 0.7),
      };
      const center = {
        x: base.x,
        y: base.y + rng.range(-0.04, 0.04),
        z: base.z,
      };
      pushInstance(batches.lantern, center.x, center.y, center.z, size.x, size.y, size.z, baseYaw);
      recordPlacement(anchor.id, batches.lantern.kind, {
        x: center.x,
        y: center.y,
        z: center.z,
        sx: size.x,
        sy: size.y,
        sz: size.z,
        yawRad: baseYaw,
      }, null);
      continue;
    }

    if (type === "hero_landmark") {
      const rng = streamByType.hero.fork(anchor.id);
      if (anchor.id === "LMK_HERO_ARCH_01" || anchor.id === "LMK_RUG_GATE_01") {
        const yaw = baseYaw + rng.range(-1, 1) * 1.2 * DEG_TO_RAD;
        const openingWidth = 9.0;
        const openingHalf = openingWidth * 0.5;
        const clearance = Math.max(6.0, anchor.heightM ?? 6.2);
        const surroundDepth = clamp(1.2 + rng.range(-0.08, 0.08), 1.0, 1.5);
        const jambThickness = clamp(1.08 + rng.range(-0.08, 0.1), 0.95, 1.3);
        const pierHeight = clearance + 1.35;
        const lateralOffset = openingHalf + jambThickness * 0.5;
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const buttressWidth = clamp(jambThickness * 1.55, 1.4, 1.95);

        const leftPillarCenter = {
          x: base.x - rightX * lateralOffset,
          y: base.y + pierHeight * 0.5,
          z: base.z - rightZ * lateralOffset,
        };
        const rightPillarCenter = {
          x: base.x + rightX * lateralOffset,
          y: base.y + pierHeight * 0.5,
          z: base.z + rightZ * lateralOffset,
        };
        const pillarSize = {
          x: jambThickness,
          y: pierHeight,
          z: surroundDepth,
        };

        // Keep hero-portal collision simple: only the two primary masonry jamb masses.
        placeCollidingBox(anchor.id, "pillar-l", batches.heroPillar, leftPillarCenter, pillarSize, yaw);
        placeCollidingBox(anchor.id, "pillar-r", batches.heroPillar, rightPillarCenter, pillarSize, yaw);

        const buttressDepth = clamp(surroundDepth * 0.74, 0.72, 1.2);
        const buttressHeight = pierHeight + 0.35;
        const buttressOffset = openingHalf + buttressWidth * 0.5 + 0.15;
        for (const side of [-1, 1] as const) {
          const centerX = base.x + rightX * (side * buttressOffset) - forwardX * 0.16;
          const centerZ = base.z + rightZ * (side * buttressOffset) - forwardZ * 0.16;
          const placementId = `${anchor.id}-buttress-${side < 0 ? "l" : "r"}`;
          pushInstance(
            batches.heroPillar,
            centerX,
            base.y + buttressHeight * 0.5,
            centerZ,
            buttressWidth,
            buttressHeight,
            buttressDepth,
            yaw,
          );
          recordPlacement(
            anchor.id,
            batches.heroPillar.kind,
            {
              x: centerX,
              y: base.y + buttressHeight * 0.5,
              z: centerZ,
              sx: buttressWidth,
              sy: buttressHeight,
              sz: buttressDepth,
              yawRad: yaw,
            },
            null,
            placementId,
          );
        }

        const ringBandHeight = clamp(0.34 + rng.range(-0.04, 0.06), 0.28, 0.44);
        const ringDepth = clamp(0.82 + rng.range(-0.06, 0.08), 0.72, 1.02);
        const tunnelDepth = clamp(surroundDepth * 0.92, 0.9, 1.35);
        const archLevels = 10;

        for (let level = 0; level < archLevels; level += 1) {
          const t = level / (archLevels - 1);
          const yOffset = openingHalf * t;
          const span = 2 * Math.sqrt(Math.max(0, openingHalf * openingHalf - yOffset * yOffset));
          if (span < 0.9) continue;

          const y = base.y + clearance + yOffset + ringBandHeight * 0.5;
          const levelWidth = span + jambThickness * 2 + ringDepth * 0.2;
          const rearWidth = Math.max(0.8, levelWidth * 0.95);
          const frontOffset = tunnelDepth * 0.5 - ringDepth * 0.5;
          const rearOffset = -(tunnelDepth * 0.5 - ringDepth * 0.5);

          pushInstance(
            batches.heroLintel,
            base.x + forwardX * frontOffset,
            y,
            base.z + forwardZ * frontOffset,
            levelWidth,
            ringBandHeight,
            ringDepth,
            yaw,
          );
          recordPlacement(
            anchor.id,
            batches.heroLintel.kind,
            {
              x: base.x + forwardX * frontOffset,
              y,
              z: base.z + forwardZ * frontOffset,
              sx: levelWidth,
              sy: ringBandHeight,
              sz: ringDepth,
              yawRad: yaw,
            },
            null,
            `${anchor.id}-arch-front-${level}`,
          );

          pushInstance(
            batches.heroLintel,
            base.x + forwardX * rearOffset,
            y,
            base.z + forwardZ * rearOffset,
            rearWidth,
            ringBandHeight,
            ringDepth,
            yaw,
          );
          recordPlacement(
            anchor.id,
            batches.heroLintel.kind,
            {
              x: base.x + forwardX * rearOffset,
              y,
              z: base.z + forwardZ * rearOffset,
              sx: rearWidth,
              sy: ringBandHeight,
              sz: ringDepth,
              yawRad: yaw,
            },
            null,
            `${anchor.id}-arch-rear-${level}`,
          );
        }
      } else {
        const structuralJitter = 0.06 + 0.1 * chaos.jitter;
        const yaw = baseYaw + rng.range(-1, 1) * 2.2 * DEG_TO_RAD;

        const pillarSize = {
          x: 0.8 + rng.range(-0.03, 0.03) * chaos.jitter,
          y: 4.8 + rng.range(-0.1, 0.12) * chaos.jitter,
          z: 0.8 + rng.range(-0.03, 0.03) * chaos.jitter,
        };
        const lintelSize = {
          x: 8,
          y: 3,
          z: 0.9,
        };
        const clearHalf = 3.0;
        const lateralOffset = clearHalf + pillarSize.x * 0.5;
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);

        const leftPillarCenter = {
          x: base.x - rightX * lateralOffset + rng.range(-structuralJitter, structuralJitter),
          y: base.y + pillarSize.y * 0.5,
          z: base.z - rightZ * lateralOffset + rng.range(-structuralJitter, structuralJitter),
        };
        const rightPillarCenter = {
          x: base.x + rightX * lateralOffset + rng.range(-structuralJitter, structuralJitter),
          y: base.y + pillarSize.y * 0.5,
          z: base.z + rightZ * lateralOffset + rng.range(-structuralJitter, structuralJitter),
        };

        placeCollidingBox(anchor.id, "pillar-l", batches.heroPillar, leftPillarCenter, pillarSize, yaw);
        placeCollidingBox(anchor.id, "pillar-r", batches.heroPillar, rightPillarCenter, pillarSize, yaw);

        const lintelCenter = {
          x: base.x,
          y: base.y + 3.3,
          z: base.z,
        };
        pushInstance(
          batches.heroLintel,
          lintelCenter.x,
          lintelCenter.y,
          lintelCenter.z,
          lintelSize.x,
          lintelSize.y,
          lintelSize.z,
          yaw,
        );
        recordPlacement(
          anchor.id,
          batches.heroLintel.kind,
          {
            x: lintelCenter.x,
            y: lintelCenter.y,
            z: lintelCenter.z,
            sx: lintelSize.x,
            sy: lintelSize.y,
            sz: lintelSize.z,
            yawRad: yaw,
          },
          null,
        );
      }
      continue;
    }

    if (type === "landmark") {
      const rng = streamByType.landmark.fork(anchor.id);
      if (!anchor.id.includes("FOUNTAIN")) {
        if (anchor.id.includes("CARAVAN")) {
          const yaw = baseYaw + rng.range(-0.12, 0.12);
          const transform = {
            x: base.x,
            y: base.y + 0.72,
            z: base.z,
            sx: 1.35,
            sy: 1.35,
            sz: 1.35,
            yawRad: yaw,
          };
          pushInstance(batches.landmarkCart, transform.x, transform.y, transform.z, transform.sx, transform.sy, transform.sz, yaw);
          recordPlacement(anchor.id, batches.landmarkCart.kind, transform, null);
        } else if (anchor.id.includes("TEXTILE") || anchor.id.includes("RUG_GATE")) {
          const transform = {
            x: base.x,
            y: base.y + 1.55,
            z: base.z,
            sx: 1.7,
            sy: 2.4,
            sz: 0.1,
            yawRad: baseYaw,
          };
          pushInstance(batches.signage, transform.x, transform.y, transform.z, transform.sx, transform.sy, transform.sz, transform.yawRad);
          recordPlacement(anchor.id, batches.signage.kind, transform, null);
        } else if (anchor.id.includes("NORTH")) {
          const transform = {
            x: base.x,
            y: base.y + 1.25,
            z: base.z,
            sx: 1.25,
            sy: 1.8,
            sz: 1,
            yawRad: baseYaw,
          };
          pushInstance(batches.shopfront, transform.x, transform.y, transform.z, transform.sx, transform.sy, transform.sz, transform.yawRad);
          recordPlacement(anchor.id, batches.shopfront.kind, transform, null);
        } else {
          for (let pieceIndex = 0; pieceIndex < 3; pieceIndex += 1) {
            const pieceRng = rng.fork(`district-piece-${pieceIndex}`);
            const angle = (pieceIndex / 3) * Math.PI * 2 + pieceRng.range(-0.2, 0.2);
            const size = pieceRng.range(0.55, 0.82);
            const batch = pieceIndex === 1 ? batches.fillerSack : batches.fillerPottery;
            const transform = {
              x: base.x + Math.cos(angle) * 0.52,
              y: base.y + size * 0.5,
              z: base.z + Math.sin(angle) * 0.52,
              sx: size,
              sy: size,
              sz: size,
              yawRad: pieceRng.range(-Math.PI, Math.PI),
            };
            pushInstance(batch, transform.x, transform.y, transform.z, transform.sx, transform.sy, transform.sz, transform.yawRad);
            recordPlacement(anchor.id, batch.kind, transform, null, `${anchor.id}-district-piece-${pieceIndex}`);
          }
        }
        stats.visualOnlyLandmarks += 1;
        continue;
      }

      const size = {
        x: 1.8,
        y: 1.1 + rng.range(0, 0.2),
        z: 1.8,
      };
      const center = {
        x: base.x + rng.range(-0.06, 0.06) * chaos.jitter,
        y: base.y + size.y * 0.5,
        z: base.z + rng.range(-0.06, 0.06) * chaos.jitter,
      };
      const inClearZone = clearTravelRects.some((rect) => pointInRect2d(center.x, center.z, rect));

      const landmarkYaw = rng.range(0, Math.PI);
      const fountainParts = [
        { batch: batches.fountainStone, y: base.y + 0.10, sx: 2.45, sy: 0.20, sz: 2.45 },
        { batch: batches.fountainStone, y: base.y + 0.27, sx: 2.18, sy: 0.28, sz: 2.18 },
        { batch: batches.fountainTile, y: base.y + 0.43, sx: 1.92, sy: 0.12, sz: 1.92 },
        { batch: batches.fountainWater, y: base.y + 0.505, sx: 1.68, sy: 0.035, sz: 1.68 },
        { batch: batches.fountainStone, y: base.y + 0.70, sx: 0.38, sy: 0.42, sz: 0.38 },
        { batch: batches.fountainTile, y: base.y + 0.93, sx: 0.74, sy: 0.10, sz: 0.74 },
        { batch: batches.fountainWater, y: base.y + 0.995, sx: 0.60, sy: 0.025, sz: 0.60 },
      ];
      for (const [partIndex, part] of fountainParts.entries()) {
        pushInstance(part.batch, center.x, part.y, center.z, part.sx, part.sy, part.sz, landmarkYaw);
        recordPlacement(anchor.id, part.batch.kind, {
          x: center.x,
          y: part.y,
          z: center.z,
          sx: part.sx,
          sy: part.sy,
          sz: part.sz,
          yawRad: landmarkYaw,
        }, null, `${anchor.id}-fountain-part-${partIndex}`);
      }

      if (inClearZone) {
        stats.visualOnlyLandmarks += 1;
      } else {
        const fountainCollider = createColliderFromOrientedBox(`${anchor.id}-fountain-collider`, center, size, 0);
        stats.candidatesTotal += 1;
        const fountainRejection = rejectReason(fountainCollider);
        if (fountainRejection) {
          registerRejection(fountainRejection);
        } else {
          colliders.push(fountainCollider);
          stats.collidersPlaced += 1;
        }
      }
      continue;
    }
  }

  // Side hall strips (x < 10 or x > 40) use larger, wall-aligned filler groups.
  // Main lane strips use the original small scattered pieces.
  const SIDE_HALL_X_MAX = 10.0;
  const SIDE_HALL_X_MIN = 40.0;

  for (const strip of stallStripRects) {
    const rng = streamByType.filler.fork(`${strip.x}:${strip.y}:${strip.w}:${strip.h}`);
    const isLongitudinal = strip.h >= strip.w;
    const stripCenterX = strip.x + strip.w * 0.5;
    const isSideHall = stripCenterX < SIDE_HALL_X_MAX || stripCenterX > SIDE_HALL_X_MIN;

    const stripDropoutChance = clamp(0.45 - chaos.density * 0.3 + (1 - chaos.cluster) * 0.07, 0.14, 0.5);
    if (rng.next() < stripDropoutChance) {
      continue;
    }

    const groupCountBase = 1 + Math.round(chaos.density * 0.9);
    const groupVariance = rng.int(0, 2 + Math.round(chaos.cluster * 1.4));
    const groupCount = clamp(groupCountBase + groupVariance - 1, 1, 3);
    const groupTs = sampleClusteredGroupTs(rng.fork("group-ts"), groupCount, chaos.cluster);

    for (let g = 0; g < groupTs.length; g += 1) {
      const groupRng = rng.fork(`group-${g}`);
      const pieces = pickWeightedCount(
        groupRng,
        1.15 - chaos.cluster * 0.38,
        0.72 + chaos.cluster * 0.55,
        0.08 + chaos.cluster * 0.55,
      );

      for (let p = 0; p < pieces; p += 1) {
        if (shouldDropDecorative(groupRng.fork(`drop-${p}`), chaos, 0.03)) {
          continue;
        }

        const pieceRng = groupRng.fork(`piece-${p}`);

        // Side hall fillers: larger crate/barrel groups, wall-aligned.
        const size = isSideHall
          ? {
              x: pieceRng.range(1.2, 2.1),
              y: pieceRng.range(0.7, 1.4),
              z: pieceRng.range(1.0, 1.45),
            }
          : {
              x: pieceRng.range(0.55, 1.15),
              y: pieceRng.range(0.45, 1.25),
              z: pieceRng.range(0.55, 1.15),
            };

        let centerX = strip.x + strip.w * 0.5;
        let centerZ = strip.y + strip.h * 0.5;

        // Side hall fillers hug the outer wall (within 0.4m of wall face).
        const sideOffset = isSideHall
          ? pieceRng.range(-0.15, 0.15) * chaos.jitter
          : pieceRng.range(-0.45, 0.45) * (0.2 + chaos.jitter * 0.7);
        const alongOffset = pieceRng.range(-1.05, 1.05) * (0.2 + (1 - chaos.cluster) * 0.58);

        if (isLongitudinal) {
          const outerX = stripCenterX < boundaryCenterX
            ? strip.x + STALL_FILLER_EDGE_PADDING_M
            : strip.x + strip.w - STALL_FILLER_EDGE_PADDING_M;
          centerX = outerX + sideOffset;
          centerZ = clamp(
            strip.y + strip.h * groupTs[g]! + alongOffset,
            strip.y + 0.45,
            strip.y + strip.h - 0.45,
          );
        } else {
          const outerZ = strip.y + strip.h * 0.5 < boundaryCenterZ
            ? strip.y + STALL_FILLER_EDGE_PADDING_M
            : strip.y + strip.h - STALL_FILLER_EDGE_PADDING_M;
          centerX = clamp(
            strip.x + strip.w * groupTs[g]! + alongOffset,
            strip.x + 0.45,
            strip.x + strip.w - 0.45,
          );
          centerZ = outerZ + sideOffset;
        }

        // Skip filler placement in open node exclusion zones.
        if (isNearOpenNode(centerX, centerZ)) {
          continue;
        }
        if (clearTravelRects.some((rect) => pointInRect2d(centerX, centerZ, rect))) {
          continue;
        }

        const fillerYaw = pieceRng.range(-1, 1) * (7 + chaos.jitter * 20) * DEG_TO_RAD;
        const visualBounds = createColliderFromOrientedBox(
          `stall-strip-visual-${strip.x.toFixed(2)}-${strip.y.toFixed(2)}-${g}-${p}`,
          { x: centerX, y: size.y * 0.5, z: centerZ },
          size,
          fillerYaw,
        );
        if (rejectReason(visualBounds)) {
          continue;
        }
        const formRoll = pieceRng.fork("form").next();
        const fillerBatch = formRoll < 0.34
          ? batches.fillerSack
          : formRoll < 0.62
            ? batches.fillerPottery
            : batches.filler;
        pushInstance(
          fillerBatch,
          centerX,
          size.y * 0.5,
          centerZ,
          size.x,
          size.y,
          size.z,
          fillerYaw,
        );
        recordPlacement(
          `stall-strip-${strip.x.toFixed(2)}-${strip.y.toFixed(2)}-${g}-${p}`,
          fillerBatch.kind,
          {
            x: centerX,
            y: size.y * 0.5,
            z: centerZ,
            sx: size.x,
            sy: size.y,
            sz: size.z,
            yawRad: fillerYaw,
          },
          null,
        );
        stats.stallFillersPlaced += 1;
      }
    }
  }

  const instanceDummy = new Object3D();
  const blockoutGroup = new Group();
  blockoutGroup.name = "map-props-blockout";
  root.add(blockoutGroup);
  const orderedBatches = [
    batches.shopfront,
    batches.signage,
    batches.signageFrame,
    batches.cover,
    batches.coverBarrel,
    batches.spawnCover,
    batches.spawnCoverBarrel,
    batches.serviceDoor,
    batches.thresholdRug,
    batches.canopy,
    batches.canopyTeal,
    batches.heroPillar,
    batches.heroLintel,
    batches.landmarkWell,
    batches.fountainStone,
    batches.fountainTile,
    batches.fountainWater,
    batches.landmarkCart,
    batches.lantern,
    batches.produceOrange,
    batches.produceRed,
    batches.produceGreen,
    batches.filler,
    batches.fillerSack,
    batches.fillerPottery,
  ];

  for (const batch of orderedBatches) {
    if (usesCompiledV3Dressing) break;
    if (batch.instances.length === 0) {
      continue;
    }
    if (
      options.propVisuals === "bazaar"
      && FINAL_HIDDEN_PROXY_KINDS.has(batch.kind)
    ) {
      continue;
    }
    if (
      options.propVisuals === "bazaar"
      && options.propModels
      && MODEL_BACKED_FINAL_KINDS.has(batch.kind)
      && MODEL_POOLS_BY_KIND[batch.kind].some((modelId) => options.propModels!.hasModel(modelId))
    ) {
      continue;
    }

    const geometry = batch.createGeometry();
    const textureMap = batch.textureUrl
      ? loadTiledTexture(batch.textureUrl, batch.textureRepeat)
      : batch.stripeColors
        ? createStripedTexture(batch.stripeColors)
        : null;
    const material = new MeshLambertMaterial({
      color: textureMap ? 0xffffff : batch.color,
      map: textureMap,
    });
    if (batch.doubleSided) {
      material.side = DoubleSide;
    }
    const mesh = new InstancedMesh(geometry, material, batch.instances.length);
    mesh.name = batch.id;
    mesh.receiveShadow = batch.receiveShadow;
    mesh.castShadow = batch.castShadow;

    for (let i = 0; i < batch.instances.length; i += 1) {
      const instance = batch.instances[i]!;
      instanceDummy.position.set(instance.x, instance.y, instance.z);
      instanceDummy.rotation.set(instance.pitchRad ?? 0, instance.yawRad, 0);
      instanceDummy.scale.set(instance.sx, instance.sy, instance.sz);
      instanceDummy.updateMatrix();
      mesh.setMatrixAt(i, instanceDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
    blockoutGroup.add(mesh);
  }

  if (!usesCompiledV3Dressing && options.propVisuals === "bazaar" && options.propModels) {
    const dressedGroup = buildDressedGroup(placements, options.propModels, seed);
    if (dressedGroup) {
      root.add(dressedGroup);
      blockoutGroup.visible = true;
      dressedGroup.visible = true;
    }
  }

  const compiledDressing = usesCompiledV3Dressing
    ? buildCompiledDressing(options, options.blockout.dressingPlacements ?? [])
    : null;
  if (compiledDressing) {
    root.clear();
    root.add(compiledDressing.root);
  }
  const renderedPlacements = compiledDressing?.renderedPlacements ?? [];
  const renderedAnchorIds = compiledDressing
    ? [...new Set(renderedPlacements.map((placement) => placement.anchorId))].sort()
    : [...new Set(placements.map((placement) => placement.anchorId))].sort();

  return {
    root,
    colliders,
    stats,
    renderedLandmarkAnchorIds: options.anchors.anchors
      .filter((anchor) => isLandmarkAnchorType(anchor.type) && renderedAnchorIds.includes(anchor.id))
      .map((anchor) => anchor.id)
      .sort(),
    renderedAnchorIds,
    renderedPlacements,
  };
}
