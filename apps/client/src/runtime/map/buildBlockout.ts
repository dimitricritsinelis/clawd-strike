import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { FloorMaterialLibrary } from "../render/materials/FloorMaterialLibrary";
import type { WallMaterialLibrary, WallTextureQuality } from "../render/materials/WallMaterialLibrary";
import type {
  RuntimeAnchorsSpec,
  RuntimeBlockoutSpec,
  RuntimeBlockoutZone,
  RuntimeRampTraversalSurface,
  RuntimeRect,
  RuntimeTraversalSurface,
} from "./types";
import type { RuntimeColliderAabb } from "../sim/collision/WorldColliders";
import { TraversalSurfaceResolver } from "../sim/TraversalSurfaceResolver";
import { resolveBlockoutPalette } from "../render/BlockoutMaterials";
import type { RuntimeFloorMode, RuntimeFloorQuality, RuntimeLightingPreset, RuntimeWallMode } from "../utils/UrlParams";
import { buildPbrFloors } from "./buildPbrFloors";
import { buildFloorWearDecals } from "./floorWearDecals";
import { buildSandAccumulation } from "./buildSandAccumulation";
import { buildWallBaseDebris } from "./buildWallBaseDebris";
import { buildPbrWalls } from "./buildPbrWalls";
import { buildWallDetailMeshes } from "./wallDetailKit";
import { buildWallDetailPlacements, type WallDetailPlacementStats } from "./wallDetailPlacer";
import { buildDoorModels } from "./buildDoorModels";
import { buildFacadeModels, buildSectionModels } from "./buildFacadeModels";
import { buildDecorativePalms } from "./buildDecorativePalms";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";
import { buildV3Architecture, type V3ArchitectureBuildResult } from "./v3Architecture";
import { planV3VisualWallSegments } from "./v3VisualWallSegments";
import { applyWallShaderTweaks } from "../render/materials/applyWallShaderTweaks";
import { resolveWallShaderProfile } from "./wallShaderProfiles";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";

const WALKABLE_ZONE_TYPES = new Set([
  "spawn_plaza",
  "main_lane_segment",
  "side_hall",
  "cut",
  "connector",
]);

const STALL_STRIP_ZONE_TYPE = "stall_strip";
const CLEAR_TRAVEL_ZONE_TYPE = "clear_travel_zone";

const BASE_FLOOR_THICKNESS_M = 0.06;
const OVERLAY_FLOOR_THICKNESS_M = 0.02;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type BackgroundMassingProfile = "party" | "terrace" | "rearStep" | "tower";

export type BackgroundShellPlacement = {
  shellIndex: number;
  side: "south" | "north" | "west" | "east" | "corner";
  ring: number;
  slotIndex: number;
  clusterIndex: number;
  clusterMemberIndex: number;
  clusterSize: number;
  alongAxis: "x" | "z";
  profile: BackgroundMassingProfile;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  ox: number;
  oz: number;
  waterTank: boolean;
  minaret: boolean;
};

const BACKGROUND_CLUSTER_PARTITIONS: Readonly<Record<number, readonly number[]>> = {
  4: [2, 2],
  5: [2, 3],
  6: [3, 3],
  7: [2, 3, 2],
  8: [3, 2, 3],
  9: [3, 3, 3],
};

const BACKGROUND_PROFILE_CYCLE: readonly BackgroundMassingProfile[] = [
  "party",
  "terrace",
  "rearStep",
  "tower",
];

const BACKGROUND_PROFILE_HEIGHT_M: Readonly<Record<BackgroundMassingProfile, number>> = {
  party: 9.5,
  terrace: 11.15,
  rearStep: 8.35,
  tower: 13.45,
};

const BACKGROUND_PROFILE_DEPTH_SCALE: Readonly<Record<BackgroundMassingProfile, number>> = {
  party: 1.08,
  terrace: 0.94,
  rearStep: 1.14,
  tower: 0.8,
};

const BACKGROUND_RING_BASE_DEPTH_M = [6.9, 7.1, 6.9, 7.1] as const;
const BACKGROUND_RING_GAP_M = 0.18;

function resolveBackgroundRingInnerOffsetM(ring: number): number {
  let offsetM = 0.36;
  for (let index = 0; index < ring; index += 1) {
    offsetM += BACKGROUND_RING_BASE_DEPTH_M[index]! * BACKGROUND_PROFILE_DEPTH_SCALE.rearStep;
    offsetM += BACKGROUND_RING_GAP_M;
  }
  return offsetM;
}

export function resolveBackgroundShellPlacements(boundary: RuntimeRect): BackgroundShellPlacement[] {
  const placements: BackgroundShellPlacement[] = [];
  const pushEdge = (
    side: "south" | "north" | "west" | "east",
    slots: number,
    ring: number,
  ): void => {
    const horizontal = side === "south" || side === "north";
    const span = horizontal ? boundary.w : boundary.h;
    const outward = side === "south" || side === "west" ? -1 : 1;
    const sideOrdinal = side === "south" ? 0 : side === "north" ? 1 : side === "west" ? 2 : 3;
    const partition = BACKGROUND_CLUSTER_PARTITIONS[slots];
    if (!partition) throw new Error(`[background-shells] unsupported edge slot count '${slots}'`);
    const alleyWidthM = 0.72 + ring * 0.1;
    const usableSpanM = span - alleyWidthM * (partition.length - 1);
    const clusterWeights = partition.map((_count, clusterIndex) => (
      [1.08, 0.9, 1.03, 0.96][(clusterIndex + ring + sideOrdinal) % 4]!
    ));
    const clusterWeightTotal = clusterWeights.reduce((sum, weight) => sum + weight, 0);
    let edgeCursorM = 0;
    let edgeMemberIndex = 0;
    for (let clusterIndex = 0; clusterIndex < partition.length; clusterIndex += 1) {
      const memberCount = partition[clusterIndex]!;
      const clusterSpanM = usableSpanM * clusterWeights[clusterIndex]! / clusterWeightTotal;
      const memberWeights = memberCount === 2
        ? (clusterIndex + ring + sideOrdinal) % 2 === 0 ? [1.18, 0.82] : [0.88, 1.12]
        : (clusterIndex + ring + sideOrdinal) % 2 === 0 ? [0.82, 1.28, 0.9] : [1.16, 0.76, 1.08];
      const memberWeightTotal = memberWeights.reduce((sum, weight) => sum + weight, 0);
      let clusterCursorM = edgeCursorM;
      for (let clusterMemberIndex = 0; clusterMemberIndex < memberCount; clusterMemberIndex += 1) {
        const alongSpanM = clusterSpanM * memberWeights[clusterMemberIndex]! / memberWeightTotal;
        const alongCenterM = clusterCursorM + alongSpanM * 0.5;
        const profile = BACKGROUND_PROFILE_CYCLE[
          (edgeMemberIndex + ring * 2 + sideOrdinal + clusterIndex) % BACKGROUND_PROFILE_CYCLE.length
        ]!;
        const baseDepthM = BACKGROUND_RING_BASE_DEPTH_M[ring]!;
        const shellDepthM = baseDepthM * BACKGROUND_PROFILE_DEPTH_SCALE[profile];
        const ringCenterOffsetM = shellDepthM * 0.5 + resolveBackgroundRingInnerOffsetM(ring);
        const minaret = ring === 0 && ((side === "north" && edgeMemberIndex === slots - 1)
          || (side === "east" && edgeMemberIndex === slots - 2)
          || (side === "south" && edgeMemberIndex === 1));
        const heightJitterM = ((edgeMemberIndex + clusterIndex + sideOrdinal) % 3 - 1) * 0.52;
        const alongNudgeM = ((edgeMemberIndex + ring) % 3 - 1) * Math.min(0.32, alongSpanM * 0.07);
        const inwardNudgeM = 0.28 + (profile === "terrace" ? 0.16 : profile === "tower" ? -0.06 : 0.06);
        placements.push({
          shellIndex: placements.length,
          side,
          ring,
          slotIndex: edgeMemberIndex,
          clusterIndex,
          clusterMemberIndex,
          clusterSize: memberCount,
          alongAxis: horizontal ? "x" : "z",
          profile,
          x: horizontal
            ? boundary.x + alongCenterM
            : (
              side === "west"
                ? boundary.x - ringCenterOffsetM
                : boundary.x + boundary.w + ringCenterOffsetM
            ),
          z: horizontal
            ? (
              side === "south"
                ? boundary.y - ringCenterOffsetM
                : boundary.y + boundary.h + ringCenterOffsetM
            )
            : boundary.y + alongCenterM,
          w: horizontal ? alongSpanM : shellDepthM,
          d: horizontal ? shellDepthM : alongSpanM,
          h: Math.max(6.2, BACKGROUND_PROFILE_HEIGHT_M[profile] - ring * 1.02 + heightJitterM),
          ox: horizontal ? alongNudgeM : -outward * inwardNudgeM,
          oz: horizontal ? -outward * inwardNudgeM : alongNudgeM,
          waterTank: !minaret && ring <= 1 && (edgeMemberIndex + ring + clusterIndex) % 4 === 1,
          minaret,
        });
        clusterCursorM += alongSpanM;
        edgeMemberIndex += 1;
      }
      edgeCursorM += clusterSpanM + alleyWidthM;
    }
  };

  // Four staggered, parameterized belts replace the single perimeter strip.
  // Their changing bay counts and outward height falloff read as a setback
  // old-city district from the fixed topdown and as layered skyline at lane
  // ends, while regular gaps keep the horizon from becoming an opaque wall.
  for (let ring = 0; ring < 4; ring += 1) {
    pushEdge("south", 4 + ring, ring);
    pushEdge("north", 4 + ring, ring);
    pushEdge("west", 6 + ring, ring);
    pushEdge("east", 6 + ring, ring);
    const shellDepthM = BACKGROUND_RING_BASE_DEPTH_M[ring]!;
    const cornerSizeM = shellDepthM * (ring % 2 === 0 ? 1.16 : 0.92);
    const ringCenterOffsetM = cornerSizeM * 0.5 + resolveBackgroundRingInnerOffsetM(ring);
    const corners = [
      { x: boundary.x - ringCenterOffsetM, z: boundary.y - ringCenterOffsetM },
      { x: boundary.x + boundary.w + ringCenterOffsetM, z: boundary.y - ringCenterOffsetM },
      { x: boundary.x - ringCenterOffsetM, z: boundary.y + boundary.h + ringCenterOffsetM },
      { x: boundary.x + boundary.w + ringCenterOffsetM, z: boundary.y + boundary.h + ringCenterOffsetM },
    ] as const;
    for (let cornerIndex = 0; cornerIndex < corners.length; cornerIndex += 1) {
      const corner = corners[cornerIndex]!;
      const profile = BACKGROUND_PROFILE_CYCLE[(ring + cornerIndex * 2 + 2) % BACKGROUND_PROFILE_CYCLE.length]!;
      placements.push({
        shellIndex: placements.length,
        side: "corner",
        ring,
        slotIndex: cornerIndex,
        clusterIndex: cornerIndex,
        clusterMemberIndex: 0,
        clusterSize: 1,
        alongAxis: cornerIndex % 2 === 0 ? "x" : "z",
        profile,
        x: corner.x,
        z: corner.z,
        w: cornerSizeM,
        d: cornerSizeM,
        h: Math.max(6.2, BACKGROUND_PROFILE_HEIGHT_M[profile] - ring * 1.04 + (cornerIndex % 2 === 0 ? 0.38 : -0.34)),
        ox: cornerIndex % 2 === 0 ? 0.38 : -0.38,
        oz: cornerIndex < 2 ? 0.38 : -0.38,
        waterTank: ring <= 1 && cornerIndex === (ring % 2),
        minaret: false,
      });
    }
  }
  return placements;
}

export type BackgroundMassingPlan = {
  lowerH: number;
  crown: {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    baseY: number;
    topY: number;
  };
};

/**
 * Resolves the bearing lower block and one genuinely profile-specific crown.
 * Keeping two structural volumes per bay holds the merged triangle budget flat;
 * the map-wide variety comes from footprint, seating and height rather than a
 * new layer of token roof props.
 */
export function resolveBackgroundMassingPlan(shell: BackgroundShellPlacement): BackgroundMassingPlan {
  const profile = {
    party: { lowerRatio: 0.58, alongScale: 0.96, outwardScale: 0.94 },
    terrace: { lowerRatio: 0.55, alongScale: 0.58, outwardScale: 0.84 },
    rearStep: { lowerRatio: 0.72, alongScale: 0.86, outwardScale: 0.56 },
    tower: { lowerRatio: 0.48, alongScale: 0.5, outwardScale: 0.58 },
  }[shell.profile];
  const lowerH = shell.h * profile.lowerRatio;
  const alongSizeM = shell.alongAxis === "x" ? shell.w : shell.d;
  const outwardSizeM = shell.alongAxis === "x" ? shell.d : shell.w;
  const crownAlongM = alongSizeM * profile.alongScale;
  const crownOutwardM = outwardSizeM * profile.outwardScale;
  const phase = (shell.slotIndex + shell.clusterIndex + shell.ring) % 2 === 0 ? -1 : 1;
  const outwardX = shell.side === "west" ? -1 : shell.side === "east" ? 1 : 0;
  const outwardZ = shell.side === "south" ? -1 : shell.side === "north" ? 1 : 0;
  const alongOffsetM = shell.profile === "terrace"
    ? phase * (alongSizeM - crownAlongM) * 0.42
    : shell.profile === "tower"
      ? phase * (alongSizeM - crownAlongM) * 0.12
      : 0;
  const rearOffsetM = shell.profile === "rearStep"
    ? (outwardSizeM - crownOutwardM) * 0.42
    : 0;
  const crownH = shell.h - lowerH;
  const desiredCrownX = shell.x + shell.ox + (shell.alongAxis === "x" ? alongOffsetM : outwardX * rearOffsetM);
  const desiredCrownZ = shell.z + shell.oz + (shell.alongAxis === "z" ? alongOffsetM : outwardZ * rearOffsetM);
  const crownW = shell.alongAxis === "x" ? crownAlongM : crownOutwardM;
  const crownD = shell.alongAxis === "x" ? crownOutwardM : crownAlongM;
  const crownX = clamp(
    desiredCrownX,
    shell.x - (shell.w - crownW) * 0.5,
    shell.x + (shell.w - crownW) * 0.5,
  );
  const crownZ = clamp(
    desiredCrownZ,
    shell.z - (shell.d - crownD) * 0.5,
    shell.z + (shell.d - crownD) * 0.5,
  );
  return {
    lowerH,
    crown: {
      x: crownX,
      z: crownZ,
      w: crownW,
      d: crownD,
      h: crownH,
      baseY: lowerH,
      topY: shell.h,
    },
  };
}

export function resolveBackgroundCourseFootprint(
  shell: BackgroundShellPlacement,
  overhangM: number,
): { x: number; z: number; w: number; d: number } {
  const startOverhangM = shell.clusterMemberIndex === 0 ? overhangM : 0;
  const endOverhangM = shell.clusterMemberIndex === shell.clusterSize - 1 ? overhangM : 0;
  if (shell.alongAxis === "x") {
    return {
      x: shell.x + (endOverhangM - startOverhangM) * 0.5,
      z: shell.z,
      w: shell.w + startOverhangM + endOverhangM,
      d: shell.d + overhangM * 2,
    };
  }
  return {
    x: shell.x,
    z: shell.z + (endOverhangM - startOverhangM) * 0.5,
    w: shell.w + overhangM * 2,
    d: shell.d + startOverhangM + endOverhangM,
  };
}

function scaleCylinderUvs(geometry: CylinderGeometry, uScale: number, vScale: number): CylinderGeometry {
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * uScale, uv.getY(index) * vScale);
  }
  uv.needsUpdate = true;
  geometry.setAttribute("uv2", uv.clone());
  return geometry;
}

function createBackgroundMinarets(
  placements: readonly BackgroundShellPlacement[],
  wallMaterial: MeshLambertMaterial | MeshStandardMaterial,
  trimMaterial: MeshLambertMaterial | MeshStandardMaterial,
  tileSizeM = 1.8,
): Group {
  const root = new Group();
  root.name = "background-minaret-landmarks";
  const landmarkPlacements = placements.filter((placement) => placement.minaret);
  const parts = [
    { kind: "plinth", geometry: scaleCylinderUvs(new CylinderGeometry(0.86, 0.94, 0.48, 8), 3.0 / tileSizeM, 0.48 / tileSizeM), material: trimMaterial, offsetY: 0.24, dimensions: { x: 1.88, y: 0.48, z: 1.88 } },
    { kind: "shaft", geometry: scaleCylinderUvs(new CylinderGeometry(0.52, 0.66, 4.4, 8), 3.8 / tileSizeM, 4.4 / tileSizeM), material: wallMaterial, offsetY: 2.68, dimensions: { x: 1.32, y: 4.4, z: 1.32 } },
    { kind: "balcony", geometry: scaleCylinderUvs(new CylinderGeometry(0.86, 0.86, 0.28, 12), 5.4 / tileSizeM, 0.28 / tileSizeM), material: trimMaterial, offsetY: 4.48, dimensions: { x: 1.72, y: 0.28, z: 1.72 } },
    { kind: "crown", geometry: scaleCylinderUvs(new CylinderGeometry(0.32, 0.5, 1.05, 8), 2.6 / tileSizeM, 1.05 / tileSizeM), material: wallMaterial, offsetY: 5.145, dimensions: { x: 1, y: 1.05, z: 1 } },
    { kind: "spire", geometry: scaleCylinderUvs(new CylinderGeometry(0, 0.4, 1.25, 8), 2.5 / tileSizeM, 1.25 / tileSizeM), material: trimMaterial, offsetY: 6.295, dimensions: { x: 0.8, y: 1.25, z: 0.8 } },
  ] as const;
  const dummy = new Object3D();
  for (const part of parts) {
    const mesh = new InstancedMesh(part.geometry, part.material, landmarkPlacements.length);
    const instanceQa = [];
    for (let index = 0; index < landmarkPlacements.length; index += 1) {
      const shell = landmarkPlacements[index]!;
      const { crown } = resolveBackgroundMassingPlan(shell);
      const roofTopY = crown.topY + 0.16;
      dummy.position.set(crown.x, roofTopY + part.offsetY, crown.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      instanceQa.push({
        placementId: `BACKGROUND_MINARET_${index + 1}:${part.kind}`,
        moduleId: "background_minaret_landmark",
        semanticClass: "background_skyline_landmark",
        representation: "module",
        materialMode: wallMaterial instanceof MeshStandardMaterial ? "pbr" : "reduced",
        dimensions: part.dimensions,
        groundingGapM: 0,
        backingPlacementId: `BACKGROUND_SHELL_${shell.shellIndex + 1}:roof-deck`,
        structurallyBacked: true,
        shadowMode: "none",
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.name = `background-minaret-${part.kind}`;
    mesh.userData.visualQaInstances = instanceQa;
    root.add(mesh);
  }
  return root;
}

function createBackgroundShells(boundary: RuntimeRect): Group {
  const root = new Group();
  root.name = "map-background-shells";
  const baseGeometry = new BoxGeometry(1, 1, 1);
  const upperGeometry = new BoxGeometry(1, 1, 1);
  const baseMaterial = new MeshLambertMaterial({ color: 0xb9ae9d });
  const upperMaterial = new MeshLambertMaterial({ color: 0xc9bfb2 });
  const roofMaterial = new MeshLambertMaterial({ color: 0x9a8d7f });
  const utilityMaterial = new MeshLambertMaterial({ color: 0x737b7d });
  const placements = resolveBackgroundShellPlacements(boundary);
  const baseMesh = new InstancedMesh(baseGeometry, baseMaterial, placements.length);
  const upperMesh = new InstancedMesh(upperGeometry, upperMaterial, placements.length);
  const roofMesh = new InstancedMesh(new BoxGeometry(1, 1, 1), roofMaterial, placements.length);
  const tankPlacements = placements.filter((placement) => placement.waterTank);
  const tankMesh = new InstancedMesh(new CylinderGeometry(0.5, 0.5, 1, 12), utilityMaterial, tankPlacements.length);
  const dummy = new Object3D();
  for (let index = 0; index < placements.length; index += 1) {
    const shell = placements[index]!;
    const { lowerH, crown } = resolveBackgroundMassingPlan(shell);
    dummy.position.set(shell.x, lowerH * 0.5, shell.z);
    dummy.scale.set(shell.w, lowerH, shell.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    baseMesh.setMatrixAt(index, dummy.matrix);

    dummy.position.set(crown.x, crown.baseY + crown.h * 0.5, crown.z);
    dummy.scale.set(crown.w, crown.h, crown.d);
    dummy.updateMatrix();
    upperMesh.setMatrixAt(index, dummy.matrix);

    dummy.position.set(crown.x, crown.topY + 0.16, crown.z);
    dummy.scale.set(crown.w + 0.16, 0.32, crown.d + 0.16);
    dummy.updateMatrix();
    roofMesh.setMatrixAt(index, dummy.matrix);

  }

  for (let index = 0; index < tankPlacements.length; index += 1) {
    const shell = tankPlacements[index]!;
    const { crown } = resolveBackgroundMassingPlan(shell);
    dummy.position.set(crown.x - crown.w * 0.12, crown.topY + 0.78, crown.z);
    dummy.scale.set(1.1, 1.24, 1.1);
    dummy.updateMatrix();
    tankMesh.setMatrixAt(index, dummy.matrix);
  }

  const shellMeshes = [baseMesh, upperMesh, roofMesh, tankMesh];
  const shellKinds = ["base", "setback", "parapet", "water_tank"];
  for (let index = 0; index < shellMeshes.length; index += 1) {
    const mesh = shellMeshes[index]!;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.name = `background-shell-${shellKinds[index]}`;
    mesh.userData.visualQa = {
      moduleId: `background_${shellKinds[index]}`,
      semanticClass: "background_shell",
      representation: "module",
      materialMode: "reduced",
      shadowMode: "none",
    };
    root.add(mesh);
  }
  root.add(createBackgroundMinarets(placements, upperMaterial, roofMaterial));
  return root;
}

function createWorldTiledBoxGeometry(
  widthM: number,
  heightM: number,
  depthM: number,
  tileSizeM: number,
): BoxGeometry {
  const geometry = new BoxGeometry(widthM, heightM, depthM);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < position.count; index += 1) {
    const nx = Math.abs(normal.getX(index));
    const ny = Math.abs(normal.getY(index));
    if (nx > 0.5) {
      uv.setXY(index, position.getZ(index) / tileSizeM, position.getY(index) / tileSizeM);
    } else if (ny > 0.5) {
      uv.setXY(index, position.getX(index) / tileSizeM, position.getZ(index) / tileSizeM);
    } else {
      uv.setXY(index, position.getX(index) / tileSizeM, position.getY(index) / tileSizeM);
    }
  }
  uv.needsUpdate = true;
  geometry.setAttribute("uv2", uv.clone());
  return geometry;
}

function createPbrBackgroundShells(
  boundary: RuntimeRect,
  wallMaterials: WallMaterialLibrary,
  quality: WallTextureQuality,
): Group {
  const distantTileScale = 1.65;
  const root = new Group();
  root.name = "map-background-shells";
  const placements = resolveBackgroundShellPlacements(boundary);
  const lowerPalette = [
    "ph_aged_plaster_ochre",
    "ph_whitewashed_brick_warm",
    "ph_beige_wall_002",
    "ph_lime_plaster_sun",
  ] as const;
  const upperPalette = [
    "ph_whitewashed_brick_dusty",
    "ph_plastered_wall",
    "ph_whitewashed_brick_cool",
    "ph_beige_wall_001",
  ] as const;
  const roofPalette = [
    "ph_worn_plaster_sun",
    "ph_worn_plaster_ochre",
    "ph_aged_plaster_ochre",
    "ph_lime_plaster_sun",
  ] as const;
  const materialCache = new Map<string, MeshStandardMaterial>();
  const shellBatches = new Map<string, {
    geometries: BoxGeometry[];
    instances: Array<{
      placementId: string;
      moduleId: string;
      semanticClass: string;
      representation: string;
      materialMode: string;
      materialId: string;
      uvProjection: string;
      shadowMode: string;
      groundingGapM: number;
      dimensions: { x: number; y: number; z: number };
    }>;
  }>();
  const materialFor = (materialId: string): MeshStandardMaterial => {
    const cached = materialCache.get(materialId);
    if (cached) return cached;
    const material = wallMaterials.createStandardMaterial(materialId, quality);
    material.userData.materialId = materialId;
    materialCache.set(materialId, material);
    return material;
  };
  const addBox = (
    shellIndex: number,
    kind: string,
    materialId: string,
    size: { x: number; y: number; z: number },
    position: { x: number; y: number; z: number },
  ): void => {
    const geometry = createWorldTiledBoxGeometry(
      size.x,
      size.y,
      size.z,
      wallMaterials.getTileSizeM(materialId) * distantTileScale,
    );
    geometry.translate(position.x, position.y, position.z);
    const instance = {
      placementId: `BACKGROUND_SHELL_${shellIndex + 1}:${kind}`,
      moduleId: `background_${kind}`,
      semanticClass: "background_shell",
      representation: "module",
      materialMode: "pbr",
      materialId,
      uvProjection: "world",
      shadowMode: "receive",
      groundingGapM: 0,
      dimensions: { ...size },
    };
    const batch = shellBatches.get(materialId);
    if (batch) {
      batch.geometries.push(geometry);
      batch.instances.push(instance);
    } else {
      shellBatches.set(materialId, {
        geometries: [geometry],
        instances: [instance],
      });
    }
  };

  for (let index = 0; index < placements.length; index += 1) {
    const shell = placements[index]!;
    const { lowerH, crown } = resolveBackgroundMassingPlan(shell);
    const sidePaletteOffset = shell.side === "north" ? 1 : shell.side === "west" ? 2 : shell.side === "east" ? 3 : 0;
    const clusterPaletteIndex = shell.ring * 5 + shell.clusterIndex + sidePaletteOffset;
    const lowerMaterialId = lowerPalette[clusterPaletteIndex % lowerPalette.length]!;
    const upperMaterialId = upperPalette[clusterPaletteIndex % upperPalette.length]!;
    addBox(index, "base", lowerMaterialId, { x: shell.w, y: lowerH, z: shell.d }, {
      x: shell.x,
      y: lowerH * 0.5,
      z: shell.z,
    });
    // The setback formerly exposed the lower box's tinted top face as a thin
    // floating plane at long axial cameras (green at Rug Gate, gray/brown at
    // North Court). A full-footprint masonry transition course turns that raw
    // face into a supported story ledge with a readable fascia.
    const setbackCourse = resolveBackgroundCourseFootprint(shell, 0.07);
    addBox(index, "setback-course", "ph_sandstone_blocks_06", {
      x: setbackCourse.w,
      y: 0.3,
      z: setbackCourse.d,
    }, {
      x: setbackCourse.x,
      y: lowerH - 0.03,
      z: setbackCourse.z,
    });
    const baseCourse = resolveBackgroundCourseFootprint(shell, 0.06);
    addBox(index, "base-course", "ph_sandstone_blocks_06", {
      x: baseCourse.w,
      y: 0.42,
      z: baseCourse.d,
    }, {
      x: baseCourse.x,
      y: 0.21,
      z: baseCourse.z,
    });
    const terminalSides: Array<-1 | 1> = shell.clusterSize === 1
      ? [-1, 1]
      : [
        ...(shell.clusterMemberIndex === 0 ? [-1 as const] : []),
        ...(shell.clusterMemberIndex === shell.clusterSize - 1 ? [1 as const] : []),
      ];
    for (const side of terminalSides) {
      const alongX = shell.alongAxis === "x";
      addBox(index, `base-terminal-quoin-${side}`, "ph_sandstone_blocks_06", {
        x: alongX ? 0.3 : shell.w + 0.12,
        y: lowerH,
        z: alongX ? shell.d + 0.12 : 0.3,
      }, {
        x: alongX ? shell.x + side * (shell.w * 0.5 - 0.15) : shell.x,
        y: lowerH * 0.5,
        z: alongX ? shell.z : shell.z + side * (shell.d * 0.5 - 0.15),
      });
    }
    addBox(index, "setback", upperMaterialId, {
      x: crown.w,
      y: crown.h,
      z: crown.d,
    }, {
      x: crown.x,
      y: crown.baseY + crown.h * 0.5,
      z: crown.z,
    });
    for (const side of terminalSides) {
      const alongX = shell.alongAxis === "x";
      addBox(index, `setback-terminal-quoin-${side}`, "ph_sandstone_blocks_06", {
        x: alongX ? 0.24 : crown.w + 0.1,
        y: crown.h,
        z: alongX ? crown.d + 0.1 : 0.24,
      }, {
        x: alongX ? crown.x + side * (crown.w * 0.5 - 0.12) : crown.x,
        y: crown.baseY + crown.h * 0.5,
        z: alongX ? crown.z : crown.z + side * (crown.d * 0.5 - 0.12),
      });
    }
    const roofWidthM = crown.w + 0.16;
    const roofDepthM = crown.d + 0.16;
    const roofCenterX = crown.x;
    const roofCenterZ = crown.z;
    const roofMaterialId = roofPalette[clusterPaletteIndex % roofPalette.length]!;
    const roofDeckHeightM = 0.16;
    const parapetThicknessM = 0.2;
    const parapetHeightM = {
      party: 0.34,
      terrace: 0.46,
      rearStep: 0.39,
      tower: 0.54,
    }[shell.profile] + (shell.clusterIndex % 2) * 0.04;
    const copingHeightM = 0.12;
    const roofDeckTopY = crown.topY + roofDeckHeightM;
    const parapetCenterY = roofDeckTopY + parapetHeightM * 0.5;
    const copingCenterY = roofDeckTopY + parapetHeightM + copingHeightM * 0.5;
    addBox(index, "roof-deck", roofMaterialId, {
      x: roofWidthM,
      y: roofDeckHeightM,
      z: roofDepthM,
    }, {
      x: roofCenterX,
      y: crown.topY + roofDeckHeightM * 0.5,
      z: roofCenterZ,
    });
    for (const side of [-1, 1] as const) {
      addBox(index, `parapet-long-${side}`, upperMaterialId, {
        x: roofWidthM,
        y: parapetHeightM,
        z: parapetThicknessM,
      }, {
        x: roofCenterX,
        y: parapetCenterY,
        z: roofCenterZ + side * (roofDepthM * 0.5 - parapetThicknessM * 0.5),
      });
      addBox(index, `parapet-short-${side}`, upperMaterialId, {
        x: parapetThicknessM,
        y: parapetHeightM,
        z: Math.max(0.2, roofDepthM - parapetThicknessM * 2),
      }, {
        x: roofCenterX + side * (roofWidthM * 0.5 - parapetThicknessM * 0.5),
        y: parapetCenterY,
        z: roofCenterZ,
      });
      addBox(index, `parapet-long-coping-${side}`, "ph_sandstone_blocks_06", {
        x: roofWidthM + 0.08,
        y: copingHeightM,
        z: parapetThicknessM + 0.08,
      }, {
        x: roofCenterX,
        y: copingCenterY,
        z: roofCenterZ + side * (roofDepthM * 0.5 - parapetThicknessM * 0.5),
      });
      addBox(index, `parapet-short-coping-${side}`, "ph_sandstone_blocks_06", {
        x: parapetThicknessM + 0.08,
        y: copingHeightM,
        z: Math.max(0.2, roofDepthM - (parapetThicknessM + 0.08) * 2),
      }, {
        x: roofCenterX + side * (roofWidthM * 0.5 - parapetThicknessM * 0.5),
        y: copingCenterY,
        z: roofCenterZ,
      });
    }

  }
  for (const [materialId, batch] of shellBatches) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (!geometry) {
      throw new Error(`[background-shells] failed to merge '${materialId}' geometry batch`);
    }
    for (const sourceGeometry of batch.geometries) sourceGeometry.dispose();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, materialFor(materialId));
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.name = `background-shell-batch-${materialId}`;
    mesh.userData.visualQa = {
      placementId: `BACKGROUND_SHELL_BATCH:${materialId}`,
      moduleId: "background_shell_batch",
      semanticClass: "background_shell",
      representation: "module",
      materialMode: "pbr",
      materialId,
      uvProjection: "world",
      shadowMode: "receive",
    };
    mesh.userData.visualQaInstances = batch.instances;
    root.add(mesh);
  }
  const tankMaterialId = "ph_whitewashed_brick_cool";
  const tankPlacements = placements.filter((placement) => placement.waterTank);
  const tank = new InstancedMesh(
    scaleCylinderUvs(
      new CylinderGeometry(0.55, 0.55, 1.24, 12),
      3.46 / wallMaterials.getTileSizeM(tankMaterialId),
      1.24 / wallMaterials.getTileSizeM(tankMaterialId),
    ),
    materialFor(tankMaterialId),
    tankPlacements.length,
  );
  const tankDummy = new Object3D();
  tank.userData.visualQaInstances = tankPlacements.map((shell, index) => {
    const { crown } = resolveBackgroundMassingPlan(shell);
    tankDummy.position.set(crown.x - crown.w * 0.12, crown.topY + 0.78, crown.z);
    tankDummy.rotation.set(0, 0, 0);
    tankDummy.scale.set(1, 1, 1);
    tankDummy.updateMatrix();
    tank.setMatrixAt(index, tankDummy.matrix);
    return {
      placementId: `BACKGROUND_SHELL_${shell.shellIndex + 1}:water_tank`,
      moduleId: "background_water_tank",
      semanticClass: "background_shell_utility",
      representation: "module",
      materialMode: "pbr",
      materialId: tankMaterialId,
      dimensions: { x: 1.1, y: 1.24, z: 1.1 },
      groundingGapM: 0,
      backingPlacementId: `BACKGROUND_SHELL_${shell.shellIndex + 1}:roof-deck`,
      structurallyBacked: true,
      shadowMode: "none",
    };
  });
  tank.instanceMatrix.needsUpdate = true;
  tank.castShadow = false;
  tank.receiveShadow = false;
  tank.frustumCulled = true;
  tank.computeBoundingBox();
  tank.computeBoundingSphere();
  tank.name = "background-shell-water_tanks";
  root.add(tank);
  root.add(createBackgroundMinarets(
    placements,
    materialFor("ph_aged_plaster_ochre"),
    materialFor("ph_sandstone_blocks_06"),
    wallMaterials.getTileSizeM("ph_aged_plaster_ochre"),
  ));
  return root;
}

function createNonWalkableInfill(
  boundary: RuntimeRect,
  traversalSurfaces: readonly RuntimeTraversalSurface[],
): InstancedMesh | null {
  const clampX = (value: number) => Math.max(boundary.x, Math.min(boundary.x + boundary.w, value));
  const clampZ = (value: number) => Math.max(boundary.y, Math.min(boundary.y + boundary.h, value));
  const xCuts = [...new Set([
    boundary.x,
    boundary.x + boundary.w,
    ...traversalSurfaces.flatMap((surface) => [clampX(surface.rect.x), clampX(surface.rect.x + surface.rect.w)]),
  ])].sort((left, right) => left - right);
  const zCuts = [...new Set([
    boundary.y,
    boundary.y + boundary.h,
    ...traversalSurfaces.flatMap((surface) => [clampZ(surface.rect.y), clampZ(surface.rect.y + surface.rect.h)]),
  ])].sort((left, right) => left - right);
  const cells: RuntimeRect[] = [];
  for (let xIndex = 0; xIndex < xCuts.length - 1; xIndex += 1) {
    const x0 = xCuts[xIndex]!;
    const x1 = xCuts[xIndex + 1]!;
    if (x1 - x0 < 0.01) continue;
    for (let zIndex = 0; zIndex < zCuts.length - 1; zIndex += 1) {
      const z0 = zCuts[zIndex]!;
      const z1 = zCuts[zIndex + 1]!;
      if (z1 - z0 < 0.01) continue;
      const centerX = (x0 + x1) * 0.5;
      const centerZ = (z0 + z1) * 0.5;
      const walkable = traversalSurfaces.some((surface) => (
        centerX >= surface.rect.x
        && centerX <= surface.rect.x + surface.rect.w
        && centerZ >= surface.rect.y
        && centerZ <= surface.rect.y + surface.rect.h
      ));
      if (!walkable) cells.push({ x: x0, y: z0, w: x1 - x0, h: z1 - z0 });
    }
  }
  if (cells.length === 0) return null;
  const mesh = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: 0x806d5a, roughness: 1, metalness: 0 }),
    cells.length,
  );
  const dummy = new Object3D();
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!;
    dummy.position.set(cell.x + cell.w * 0.5, -0.16, cell.y + cell.h * 0.5);
    dummy.scale.set(cell.w, 0.12, cell.h);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = "v3-nonwalkable-infill";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.userData.visualQa = {
    moduleId: "nonwalkable_infill",
    semanticClass: "sealed_background_ground",
    representation: "module",
    materialMode: "pbr",
    shadowMode: "receive_only",
  };
  mesh.userData.cellCount = cells.length;
  return mesh;
}

function createSurroundTerrain(
  boundary: RuntimeRect,
  floorTopY: number,
  floorMaterials: FloorMaterialLibrary | null,
): Mesh<PlaneGeometry, MeshLambertMaterial | MeshStandardMaterial> {
  // SHOT_01 sees roughly 79 m horizontally from the 95 m topdown camera.
  // A 64 m surround keeps that fixed review frame on authored old-city ground
  // instead of exposing the renderer clear color beyond the former 18 m pad.
  const marginM = 64;
  const widthM = boundary.w + marginM * 2;
  const depthM = boundary.h + marginM * 2;
  const geometry = new PlaneGeometry(widthM, depthM, 20, 24);
  geometry.rotateX(-Math.PI * 0.5);
  const position = geometry.getAttribute("position");
  const colors: number[] = [];
  const baseSand = new Color(0xa38f6b);
  const vertexTone = new Color();
  for (let index = 0; index < position.count; index += 1) {
    const localX = position.getX(index);
    const localZ = position.getZ(index);
    const outsideM = Math.max(
      Math.abs(localX) - boundary.w * 0.5,
      Math.abs(localZ) - boundary.h * 0.5,
      0,
    );
    const terrainBlend = Math.min(1, Math.max(0, (outsideM - 2) / 38));
    const broadVariation = (
      Math.sin(localX * 0.055)
      + Math.cos(localZ * 0.043)
      + Math.sin((localX + localZ) * 0.026)
    ) / 3;
    const riseM = terrainBlend * (0.12 + broadVariation * 0.08);
    position.setY(index, riseM);
    vertexTone.copy(baseSand).multiplyScalar(0.88 + broadVariation * 0.16);
    colors.push(vertexTone.r, vertexTone.g, vertexTone.b);
  }
  position.needsUpdate = true;
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = floorMaterials
    ? new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      vertexColors: true,
    })
    : new MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  material.name = "map-surround-terrain-low-frequency-sand";
  if (material instanceof MeshStandardMaterial) {
    material.userData.materialId = "procedural_low_frequency_sand";
  }

  const mesh = new Mesh(geometry, material);
  mesh.name = "map-surround-terrain";
  mesh.position.set(
    boundary.x + boundary.w * 0.5,
    floorTopY - 0.19,
    boundary.y + boundary.h * 0.5,
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.userData.visualQa = {
    moduleId: "bounded_old_city_surround",
    semanticClass: "sealed_background_ground",
    representation: "module",
    materialMode: floorMaterials ? "pbr" : "reduced",
    shadowMode: "receive_only",
  };
  return mesh;
}

function createCourtPavingBorders(
  spec: RuntimeBlockoutSpec,
  floorTopY: number,
  floorMaterials: FloorMaterialLibrary | null,
  quality: RuntimeFloorQuality,
): Mesh | null {
  const courtZones = spec.zones.filter((zone) => (
    /COURT|COURTYARD/.test(zone.id)
    && zone.rect.w * zone.rect.h >= 180
  ));
  if (courtZones.length === 0) return null;

  const materialId = "cobblestone_pavement";
  const tileSizeM = floorMaterials?.getTileSizeM(materialId) ?? 2.2;
  const borderWidthM = 0.22;
  const edgeInsetM = 0.42;
  const borderHeightM = 0.022;
  const geometries: BoxGeometry[] = [];
  for (const zone of courtZones) {
    const surface = spec.traversalSurfaces?.find((entry) => entry.zoneId === zone.id);
    const elevationM = surface?.kind === "flat" ? surface.elevationM : floorTopY;
    const innerWidthM = zone.rect.w - edgeInsetM * 2;
    const innerDepthM = zone.rect.h - edgeInsetM * 2;
    if (innerWidthM <= borderWidthM * 2 || innerDepthM <= borderWidthM * 2) continue;
    const centerX = zone.rect.x + zone.rect.w * 0.5;
    const centerZ = zone.rect.y + zone.rect.h * 0.5;
    const centerY = elevationM + borderHeightM * 0.5 + 0.008;
    const courses = [
      {
        widthM: innerWidthM,
        depthM: borderWidthM,
        x: centerX,
        z: zone.rect.y + edgeInsetM,
      },
      {
        widthM: innerWidthM,
        depthM: borderWidthM,
        x: centerX,
        z: zone.rect.y + zone.rect.h - edgeInsetM,
      },
      {
        widthM: borderWidthM,
        depthM: innerDepthM - borderWidthM * 2,
        x: zone.rect.x + edgeInsetM,
        z: centerZ,
      },
      {
        widthM: borderWidthM,
        depthM: innerDepthM - borderWidthM * 2,
        x: zone.rect.x + zone.rect.w - edgeInsetM,
        z: centerZ,
      },
    ];
    for (const course of courses) {
      const geometry = createWorldTiledBoxGeometry(
        course.widthM,
        borderHeightM,
        course.depthM,
        tileSizeM,
      );
      geometry.translate(course.x, centerY, course.z);
      geometries.push(geometry);
    }
  }
  if (geometries.length === 0) return null;
  const geometry = mergeGeometries(geometries, false);
  for (const source of geometries) source.dispose();
  if (!geometry) {
    throw new Error("[court-paving-borders] failed to merge world-tiled border courses");
  }

  const material = floorMaterials
    ? floorMaterials.createStandardMaterial(materialId, quality)
    : new MeshLambertMaterial({ color: 0x8f877b });
  material.name = "court-paving-border-course";
  if (material instanceof MeshStandardMaterial) {
    material.color.setHex(0x9f968a);
    material.roughness = 0.96;
    material.metalness = 0;
    material.userData.materialId = materialId;
  }
  const mesh = new Mesh(geometry, material);
  mesh.name = "court-paving-border-courses";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.userData.visualQa = {
    moduleId: "court_paving_border_course",
    semanticClass: "architectural_floor_transition",
    representation: "module",
    materialMode: floorMaterials ? "pbr" : "reduced",
    shadowMode: "receive_only",
  };
  return mesh;
}

function createDyersProcessStain(
  anchors: RuntimeAnchorsSpec | null,
  floorTopY: number,
  floorMaterials: FloorMaterialLibrary | null,
  quality: RuntimeFloorQuality,
): Mesh | null {
  const workAnchor = anchors?.anchors.find((anchor) => anchor.id === "L3R0_NORTH_DYERS_BAY_01");
  if (!workAnchor) return null;

  const geometries: CircleGeometry[] = [];
  const marks = [
    { x: -0.48, z: -0.42, radiusX: 0.72, radiusZ: 0.42, rotation: -0.18 },
    { x: 0.22, z: 0.08, radiusX: 0.46, radiusZ: 0.28, rotation: 0.34 },
    { x: 0.55, z: -0.72, radiusX: 0.28, radiusZ: 0.18, rotation: -0.42 },
  ] as const;
  for (const mark of marks) {
    const geometry = new CircleGeometry(1, 14);
    geometry.rotateX(-Math.PI * 0.5);
    geometry.rotateY(mark.rotation);
    geometry.scale(mark.radiusX, 1, mark.radiusZ);
    geometry.translate(
      workAnchor.pos.x + mark.x,
      floorTopY + 0.012,
      workAnchor.pos.y + mark.z,
    );
    geometries.push(geometry);
  }
  const geometry = mergeGeometries(geometries, false);
  for (const source of geometries) source.dispose();
  if (!geometry) throw new Error("[dyers-process-stain] failed to merge pigment marks");

  const material = floorMaterials
    ? floorMaterials.createStandardMaterial("red_sandstone_pavement", quality)
    : new MeshLambertMaterial({ color: 0x3f4967 });
  material.name = "dyers-workshop-pigment-stain";
  if (material instanceof MeshStandardMaterial) {
    material.color.setHex(0x46526f);
    material.roughness = 1;
    material.metalness = 0;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
    material.userData.materialId = "red_sandstone_pavement";
  }
  const mesh = new Mesh(geometry, material);
  mesh.name = "dyers-workshop-pigment-stain";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.userData.visualQa = {
    moduleId: "dyers_workshop_pigment_stain",
    semanticClass: "district_process_floor_wear",
    representation: "module",
    materialMode: floorMaterials ? "pbr" : "reduced",
    shadowMode: "receive_only",
  };
  return mesh;
}

function resolveWallTextureQuality(floorQuality: RuntimeFloorQuality): WallTextureQuality {
  if (floorQuality === "1k") return "1k";
  return "2k";
}

export type BoundarySegment = {
  orientation: "vertical" | "horizontal";
  coord: number;
  start: number;
  end: number;
  outward: -1 | 1;
};

export type BlockoutBuildResult = {
  root: Group;
  colliders: RuntimeColliderAabb[];
  wallDetailStats: WallDetailPlacementStats;
};

export type BlockoutWallDetailOptions = {
  enabled: boolean;
  densityScale: number | null;
};

export type BlockoutBuildOptions = {
  highVis: boolean;
  seed: number;
  floorMode: RuntimeFloorMode;
  wallMode: RuntimeWallMode;
  floorQuality: RuntimeFloorQuality;
  lightingPreset: RuntimeLightingPreset;
  floorMaterials: FloorMaterialLibrary | null;
  wallMaterials: WallMaterialLibrary | null;
  anchors: RuntimeAnchorsSpec | null;
  wallDetails: BlockoutWallDetailOptions;
  doorModels: PropModelLibrary | null;
  /** Authored facade GLBs referenced by frontages' facadeModelId. */
  facadeModels?: PropModelLibrary | null;
};

export function usesV3AuthoredVisualWallOwnership(
  formatVersion: string | undefined,
  wallMode: RuntimeWallMode,
  wallDetailStyle: string,
): boolean {
  return wallMode === "pbr"
    && wallDetailStyle === "bazaar"
    && /^3(?:\.|$)/.test(formatVersion ?? "");
}

function rectContainsPoint(rect: RuntimeRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function collectAxisCoordinates(rects: RuntimeRect[], boundary: RuntimeRect): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([boundary.x, boundary.x + boundary.w]);
  const ys = new Set<number>([boundary.y, boundary.y + boundary.h]);

  for (const rect of rects) {
    xs.add(rect.x);
    xs.add(rect.x + rect.w);
    ys.add(rect.y);
    ys.add(rect.y + rect.h);
  }

  return {
    xs: [...xs].sort((a, b) => a - b),
    ys: [...ys].sort((a, b) => a - b),
  };
}

function buildInsideGrid(walkableRects: RuntimeRect[], xs: number[], ys: number[]): boolean[][] {
  const rows = ys.length - 1;
  const cols = xs.length - 1;
  const inside: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  for (let yIndex = 0; yIndex < rows; yIndex += 1) {
    for (let xIndex = 0; xIndex < cols; xIndex += 1) {
      const centerX = (xs[xIndex]! + xs[xIndex + 1]!) * 0.5;
      const centerY = (ys[yIndex]! + ys[yIndex + 1]!) * 0.5;
      inside[yIndex]![xIndex] = walkableRects.some((rect) => rectContainsPoint(rect, centerX, centerY));
    }
  }

  return inside;
}

function extractBoundarySegments(inside: boolean[][], xs: number[], ys: number[]): BoundarySegment[] {
  const rows = inside.length;
  const cols = inside[0]?.length ?? 0;
  const segments: BoundarySegment[] = [];

  const isInside = (xIndex: number, yIndex: number): boolean => {
    if (xIndex < 0 || yIndex < 0 || xIndex >= cols || yIndex >= rows) return false;
    return inside[yIndex]?.[xIndex] ?? false;
  };

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

function mergeBoundarySegments(segments: BoundarySegment[]): BoundarySegment[] {
  const EPS = 1e-6;
  const sorted = [...segments].sort((a, b) => {
    if (a.orientation !== b.orientation) return a.orientation.localeCompare(b.orientation);
    if (a.coord !== b.coord) return a.coord - b.coord;
    if (a.outward !== b.outward) return a.outward - b.outward;
    return a.start - b.start;
  });

  const merged: BoundarySegment[] = [];
  for (const segment of sorted) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.orientation === segment.orientation &&
      Math.abs(previous.coord - segment.coord) < EPS &&
      previous.outward === segment.outward &&
      Math.abs(previous.end - segment.start) < EPS
    ) {
      previous.end = segment.end;
      continue;
    }
    merged.push({ ...segment });
  }

  return merged;
}

const SURFACE_EDGE_EPSILON_M = 1e-5;
const RAMP_WALL_MAX_SLICE_M = 1;
const VISUAL_SUPPORT_MIN_SPAN_M = 0.45;
const VISUAL_SUPPORT_MAX_SPAN_M = 1.25;
const VISUAL_SUPPORT_MIN_DEPTH_M = 0.55;
const VISUAL_SUPPORT_MAX_DEPTH_M = 32;
const VISUAL_SUPPORT_CAP_HEIGHT_M = 0.24;
const VISUAL_SUPPORT_CAP_OUTSET_M = 0.08;
const VISUAL_SUPPORT_CURB_HEIGHT_M = 0.28;
const VISUAL_SUPPORT_CURB_DEPTH_M = 0.22;
const V3_BOUNDARY_COPING_HEIGHT_M = 0.32;
const V3_BOUNDARY_COPING_OUTSET_M = 0.12;
const V3_BOUNDARY_COPING_MIN_RUN_M = 5.5;
const V3_BOUNDARY_COPING_FIREWALL_MIN_HEIGHT_M = 7;
const V3_BOUNDARY_BASE_HEIGHT_M = 0.48;
const V3_BOUNDARY_BASE_OUTSET_M = 0.08;
const V3_BOUNDARY_TERMINAL_RETURN_DEPTH_M = 0.04;
const V3_BOUNDARY_CORNER_JUNCTION_WIDTH_M = 0.39;
const V3_BOUNDARY_CORNICE_FASCIA_HEIGHT_M = 0.48;
const V3_BOUNDARY_CORNICE_FASCIA_DEPTH_M = 0.08;
// These locked-layout boundary runs are fully covered by authored Spawn-B
// frontage contact courses. Emitting both owners creates the audited stacked
// white streaks; the collision walls remain unchanged.
const V3_ARCHITECTURE_OWNED_BASE_SOURCE_LABELS = new Set([34, 36, 79, 103]);

export function splitBoundarySegmentsAtTraversalSurfaceEdges(
  segments: readonly BoundarySegment[],
  surfaces: readonly RuntimeTraversalSurface[],
): BoundarySegment[] {
  if (surfaces.length === 0) return segments.map((segment) => ({ ...segment }));

  return segments.flatMap((segment) => {
    const cuts = new Set<number>([segment.start, segment.end]);
    for (const surface of surfaces) {
      const rect = surface.rect;
      const isSurfaceEdge = segment.orientation === "vertical"
        ? Math.abs(segment.coord - rect.x) <= SURFACE_EDGE_EPSILON_M
          || Math.abs(segment.coord - (rect.x + rect.w)) <= SURFACE_EDGE_EPSILON_M
        : Math.abs(segment.coord - rect.y) <= SURFACE_EDGE_EPSILON_M
          || Math.abs(segment.coord - (rect.y + rect.h)) <= SURFACE_EDGE_EPSILON_M;
      if (!isSurfaceEdge) continue;

      const surfaceStart = segment.orientation === "vertical" ? rect.y : rect.x;
      const surfaceEnd = segment.orientation === "vertical" ? rect.y + rect.h : rect.x + rect.w;
      const overlapStart = Math.max(segment.start, surfaceStart);
      const overlapEnd = Math.min(segment.end, surfaceEnd);
      if (overlapEnd - overlapStart <= SURFACE_EDGE_EPSILON_M) continue;
      cuts.add(overlapStart);
      cuts.add(overlapEnd);

      const rampRunsAlongSegment = surface.kind === "ramp"
        && ((segment.orientation === "vertical" && surface.axis === "y")
          || (segment.orientation === "horizontal" && surface.axis === "x"));
      if (!rampRunsAlongSegment) continue;
      const stepCount = surface.visualStyle === "stairs" && typeof surface.stepCount === "number"
        ? surface.stepCount
        : Math.max(1, Math.ceil((surfaceEnd - surfaceStart) / RAMP_WALL_MAX_SLICE_M));
      for (let index = 1; index < stepCount; index += 1) {
        const cut = surfaceStart + ((surfaceEnd - surfaceStart) * index) / stepCount;
        if (cut > overlapStart + SURFACE_EDGE_EPSILON_M && cut < overlapEnd - SURFACE_EDGE_EPSILON_M) {
          cuts.add(cut);
        }
      }
    }

    const sortedCuts = [...cuts]
      .filter((cut) => cut >= segment.start - SURFACE_EDGE_EPSILON_M && cut <= segment.end + SURFACE_EDGE_EPSILON_M)
      .sort((left, right) => left - right);
    const split: BoundarySegment[] = [];
    for (let index = 0; index < sortedCuts.length - 1; index += 1) {
      const start = sortedCuts[index]!;
      const end = sortedCuts[index + 1]!;
      if (end - start <= SURFACE_EDGE_EPSILON_M) continue;
      split.push({ ...segment, start, end });
    }
    return split;
  });
}

export function deriveBlockoutWallSegments(spec: RuntimeBlockoutSpec): BoundarySegment[] {
  const walkableRects = spec.zones
    .filter((zone) => WALKABLE_ZONE_TYPES.has(zone.type))
    .map((zone) => zone.rect);
  const axes = collectAxisCoordinates(walkableRects, spec.playable_boundary);
  const inside = buildInsideGrid(walkableRects, axes.xs, axes.ys);
  return splitBoundarySegmentsAtTraversalSurfaceEdges(
    mergeBoundarySegments([
      ...extractBoundarySegments(inside, axes.xs, axes.ys),
      ...spec.exterior_wall_patches,
    ]),
    spec.traversalSurfaces ?? [],
  );
}

export type V3BoundarySupportReturn = {
  id: string;
  sourceSegmentIndex: number;
  capSourceIndices: [number, number];
  sideSourceIndices: [number[], number[]];
  pocketRect: RuntimeRect;
  sourceZoneId: string;
  renderZone: RuntimeBlockoutZone;
  /**
   * Inward faces for the complete sealed slot. The corresponding outward
   * collision faces remain the authoritative player-visible walls.
   */
  renderSegments: BoundarySegment[];
  /** Parent collision segment for every renderSegments entry. */
  renderSourceIndices: number[];
  depthAxis: "x" | "y";
};

function collectContinuousSideChain(
  segments: readonly BoundarySegment[],
  cap: BoundarySegment,
  endpointCoord: number,
  expectedOutward: -1 | 1,
): number[] {
  const perpendicularOrientation = cap.orientation === "horizontal" ? "vertical" : "horizontal";
  const candidates = segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => (
      segment.orientation === perpendicularOrientation
      && Math.abs(segment.coord - endpointCoord) <= SURFACE_EDGE_EPSILON_M
      && segment.outward === expectedOutward
    ));
  const chain: number[] = [];
  let cursor = cap.coord;
  const used = new Set<number>();

  while (true) {
    const candidate = candidates
      .filter(({ segment, index }) => (
        !used.has(index)
        && (cap.outward > 0
          ? segment.start <= cursor + SURFACE_EDGE_EPSILON_M
            && segment.end > cursor + SURFACE_EDGE_EPSILON_M
          : segment.start < cursor - SURFACE_EDGE_EPSILON_M
            && segment.end >= cursor - SURFACE_EDGE_EPSILON_M)
      ))
      .sort((left, right) => (
        cap.outward > 0
          ? right.segment.end - left.segment.end
          : left.segment.start - right.segment.start
      ))[0];
    if (!candidate) break;
    used.add(candidate.index);
    chain.push(candidate.index);
    cursor = cap.outward > 0 ? candidate.segment.end : candidate.segment.start;
  }

  return chain;
}

function chainReach(
  segments: readonly BoundarySegment[],
  chain: readonly number[],
  direction: -1 | 1,
  fallback: number,
): number {
  if (chain.length === 0) return fallback;
  return direction > 0
    ? Math.max(...chain.map((index) => segments[index]!.end))
    : Math.min(...chain.map((index) => segments[index]!.start));
}

function segmentOverlapsDepthRange(
  segment: BoundarySegment,
  minDepth: number,
  maxDepth: number,
): boolean {
  return segment.end > minDepth + SURFACE_EDGE_EPSILON_M
    && segment.start < maxDepth - SURFACE_EDGE_EPSILON_M;
}

function findSmallestWalkableZoneAtPoint(
  zones: readonly RuntimeBlockoutZone[],
  x: number,
  z: number,
): RuntimeBlockoutZone | null {
  let match: RuntimeBlockoutZone | null = null;
  let matchArea = Number.POSITIVE_INFINITY;
  for (const zone of zones) {
    if (!WALKABLE_ZONE_TYPES.has(zone.type) || !rectContainsPoint(zone.rect, x, z)) continue;
    const area = zone.rect.w * zone.rect.h;
    if (area < matchArea) {
      match = zone;
      matchArea = area;
    }
  }
  return match;
}

/**
 * Detect narrow, fully sealed non-walkable slots whose end cap otherwise reads
 * as a freestanding one-face blade. A valid plan must prove two opposing caps
 * and continuous side-wall coverage for the complete slot. It then adds only
 * inward render faces and coping inside that already sealed volume; the source
 * segment list and collider authority remain untouched.
 */
export function planV3BoundarySupportReturns(
  segments: readonly BoundarySegment[],
  zones: readonly RuntimeBlockoutZone[],
): V3BoundarySupportReturn[] {
  const plans: V3BoundarySupportReturn[] = [];
  for (let sourceSegmentIndex = 0; sourceSegmentIndex < segments.length; sourceSegmentIndex += 1) {
    const cap = segments[sourceSegmentIndex]!;
    const spanM = cap.end - cap.start;
    if (spanM < VISUAL_SUPPORT_MIN_SPAN_M || spanM > VISUAL_SUPPORT_MAX_SPAN_M) continue;

    const firstSideChain = collectContinuousSideChain(segments, cap, cap.start, 1);
    const secondSideChain = collectContinuousSideChain(segments, cap, cap.end, -1);
    if (firstSideChain.length === 0 || secondSideChain.length === 0) continue;
    const firstReach = chainReach(segments, firstSideChain, cap.outward, cap.coord);
    const secondReach = chainReach(segments, secondSideChain, cap.outward, cap.coord);
    const commonReach = cap.outward > 0
      ? Math.min(firstReach, secondReach)
      : Math.max(firstReach, secondReach);

    const oppositeCandidates = segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment, index }) => (
        index !== sourceSegmentIndex
        && segment.orientation === cap.orientation
        && segment.outward === -cap.outward
        && Math.abs(segment.start - cap.start) <= SURFACE_EDGE_EPSILON_M
        && Math.abs(segment.end - cap.end) <= SURFACE_EDGE_EPSILON_M
        && (cap.outward > 0
          ? segment.coord > cap.coord + VISUAL_SUPPORT_MIN_DEPTH_M
            && segment.coord <= commonReach + SURFACE_EDGE_EPSILON_M
          : segment.coord < cap.coord - VISUAL_SUPPORT_MIN_DEPTH_M
            && segment.coord >= commonReach - SURFACE_EDGE_EPSILON_M)
      ))
      .sort((left, right) => Math.abs(left.segment.coord - cap.coord) - Math.abs(right.segment.coord - cap.coord));
    const opposite = oppositeCandidates[0];
    if (!opposite || sourceSegmentIndex > opposite.index) continue;

    const depthM = Math.abs(opposite.segment.coord - cap.coord);
    if (depthM < VISUAL_SUPPORT_MIN_DEPTH_M || depthM > VISUAL_SUPPORT_MAX_DEPTH_M) continue;
    const minDepth = Math.min(cap.coord, opposite.segment.coord);
    const maxDepth = Math.max(cap.coord, opposite.segment.coord);
    const clippedFirstChain = firstSideChain.filter((index) => (
      segmentOverlapsDepthRange(segments[index]!, minDepth, maxDepth)
    ));
    const clippedSecondChain = secondSideChain.filter((index) => (
      segmentOverlapsDepthRange(segments[index]!, minDepth, maxDepth)
    ));

    const axisMid = (cap.start + cap.end) * 0.5;
    const depthMid = (cap.coord + opposite.segment.coord) * 0.5;
    const pocketProbeX = cap.orientation === "horizontal" ? axisMid : depthMid;
    const pocketProbeZ = cap.orientation === "horizontal" ? depthMid : axisMid;
    if (findSmallestWalkableZoneAtPoint(zones, pocketProbeX, pocketProbeZ)) continue;

    const sourceProbeX = cap.orientation === "horizontal"
      ? axisMid
      : cap.coord - cap.outward * 0.08;
    const sourceProbeZ = cap.orientation === "horizontal"
      ? cap.coord - cap.outward * 0.08
      : axisMid;
    const sourceZone = findSmallestWalkableZoneAtPoint(zones, sourceProbeX, sourceProbeZ);
    if (!sourceZone) continue;

    const pocketRect: RuntimeRect = cap.orientation === "horizontal"
      ? {
          x: cap.start,
          y: minDepth,
          w: spanM,
          h: depthM,
        }
      : {
          x: minDepth,
          y: cap.start,
          w: depthM,
          h: spanM,
        };

    const lowCapIndex = cap.coord < opposite.segment.coord ? sourceSegmentIndex : opposite.index;
    const highCapIndex = cap.coord < opposite.segment.coord ? opposite.index : sourceSegmentIndex;
    const lowFirstChain = [...clippedFirstChain].sort((left, right) => (
      segments[left]!.start - segments[right]!.start
    ));
    const lowSecondChain = [...clippedSecondChain].sort((left, right) => (
      segments[left]!.start - segments[right]!.start
    ));
    const renderSourceIndices = [
      lowCapIndex,
      ...lowFirstChain,
      ...lowSecondChain,
      highCapIndex,
    ];
    const renderSegments = renderSourceIndices.map((index) => ({
      ...segments[index]!,
      outward: (-segments[index]!.outward) as -1 | 1,
    }));
    const id = `v3-boundary-support-${sourceSegmentIndex + 1}`;
    plans.push({
      id,
      sourceSegmentIndex,
      capSourceIndices: [lowCapIndex, highCapIndex],
      sideSourceIndices: [lowFirstChain, lowSecondChain],
      pocketRect,
      sourceZoneId: sourceZone.id,
      renderZone: {
        id: `${id}-render-zone`,
        type: "side_hall",
        rect: pocketRect,
        label: `${sourceZone.label} structural spine`,
        notes: "Render-only inward closure and coping inside an existing sealed boundary slot.",
        ...(sourceZone.districtId ? { districtId: sourceZone.districtId } : {}),
        ...(sourceZone.macroLane ? { macroLane: sourceZone.macroLane } : {}),
        facadeProfileId: "service_storage",
      },
      renderSegments,
      renderSourceIndices,
      depthAxis: cap.orientation === "horizontal" ? "y" : "x",
    });
  }
  return plans;
}

export type V3BoundarySupportCapSlice = {
  rect: RuntimeRect;
  topY: number;
};

export type V3BoundarySupportEndCap = {
  sourceSegmentIndex: number;
  segment: BoundarySegment;
  renderZone: RuntimeBlockoutZone;
};

function pointInsideSegmentZone(segment: BoundarySegment, along: number): { x: number; z: number } {
  return segment.orientation === "vertical"
    ? { x: segment.coord - segment.outward * 0.08, z: along }
    : { x: along, z: segment.coord - segment.outward * 0.08 };
}

/**
 * Repaint each visible slot end with the material grammar of its adjoining
 * longitudinal wall. Geometry remains the exact authoritative cap plane.
 */
export function planV3BoundarySupportEndCaps(
  plans: readonly V3BoundarySupportReturn[],
  segments: readonly BoundarySegment[],
  zones: readonly RuntimeBlockoutZone[],
): V3BoundarySupportEndCap[] {
  const results: V3BoundarySupportEndCap[] = [];
  for (const plan of plans) {
    for (let capOrdinal = 0; capOrdinal < plan.capSourceIndices.length; capOrdinal += 1) {
      const sourceSegmentIndex = plan.capSourceIndices[capOrdinal]!;
      const segment = segments[sourceSegmentIndex]!;
      const sideChain = plan.sideSourceIndices[0];
      const sideSourceIndex = capOrdinal === 0 ? sideChain[0] : sideChain.at(-1);
      if (typeof sideSourceIndex !== "number") continue;
      const sideSegment = segments[sideSourceIndex]!;
      const sideProbe = pointInsideSegmentZone(sideSegment, (sideSegment.start + sideSegment.end) * 0.5);
      const adjoiningZone = findSmallestWalkableZoneAtPoint(zones, sideProbe.x, sideProbe.z);
      if (!adjoiningZone) continue;
      const probeDepthM = 0.2;
      const rect: RuntimeRect = segment.orientation === "horizontal"
        ? {
            x: segment.start,
            y: segment.outward > 0 ? segment.coord - probeDepthM : segment.coord,
            w: segment.end - segment.start,
            h: probeDepthM,
          }
        : {
            x: segment.outward > 0 ? segment.coord - probeDepthM : segment.coord,
            y: segment.start,
            w: probeDepthM,
            h: segment.end - segment.start,
          };
      results.push({
        sourceSegmentIndex,
        segment: { ...segment },
        renderZone: {
          ...adjoiningZone,
          rect,
          label: `${adjoiningZone.label} structural end return`,
          notes: "Material-continuous render face on the authoritative boundary cap plane.",
        },
      });
    }
  }
  return results;
}

/**
 * Roof coping may overhang the two longitudinal retaining walls by 8 cm, but
 * never projects past either authoritative end-cap plane.
 */
export function resolveV3BoundarySupportCapFootprint(
  plan: V3BoundarySupportReturn,
  slice: V3BoundarySupportCapSlice,
): RuntimeRect {
  const pocketEndX = plan.pocketRect.x + plan.pocketRect.w;
  const pocketEndZ = plan.pocketRect.y + plan.pocketRect.h;
  if (plan.depthAxis === "y") {
    return {
      x: slice.rect.x - VISUAL_SUPPORT_CAP_OUTSET_M,
      y: Math.max(plan.pocketRect.y, slice.rect.y - VISUAL_SUPPORT_CAP_OUTSET_M),
      w: slice.rect.w + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
      h: Math.min(pocketEndZ, slice.rect.y + slice.rect.h + VISUAL_SUPPORT_CAP_OUTSET_M)
        - Math.max(plan.pocketRect.y, slice.rect.y - VISUAL_SUPPORT_CAP_OUTSET_M),
    };
  }
  return {
    x: Math.max(plan.pocketRect.x, slice.rect.x - VISUAL_SUPPORT_CAP_OUTSET_M),
    y: slice.rect.y - VISUAL_SUPPORT_CAP_OUTSET_M,
    w: Math.min(pocketEndX, slice.rect.x + slice.rect.w + VISUAL_SUPPORT_CAP_OUTSET_M)
      - Math.max(plan.pocketRect.x, slice.rect.x - VISUAL_SUPPORT_CAP_OUTSET_M),
    h: slice.rect.h + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
  };
}

export type V3BoundarySupportPierModule = {
  sourceSegmentIndex: number;
  role:
    | "closed_infill"
    | "footing_block"
    | "grounded_plinth"
    | "left_return_lip"
    | "right_return_lip"
    | "left_quoin"
    | "right_quoin"
    | "supported_cap";
  materialRole: "limestone";
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

/**
 * Dress the visible end cap as one closed limestone pier. Structural courses
 * stay inside the wall collider AABB; the grounded footing may project by at
 * most 6 cm along the wall span. One material and face plane keep the center
 * from reading as a contrasting repair panel, niche, or fake door.
 */
export function planV3BoundarySupportPierModules(
  plans: readonly V3BoundarySupportReturn[],
  segments: readonly BoundarySegment[],
  segmentHeights: readonly number[],
  segmentBaseYs: readonly number[],
  wallThicknessM: number,
): V3BoundarySupportPierModule[] {
  const modules: V3BoundarySupportPierModule[] = [];
  for (const plan of plans) {
    const sourceSegmentIndex = plan.capSourceIndices[0];
    const segment = segments[sourceSegmentIndex]!;
    const baseY = segmentBaseYs[sourceSegmentIndex] ?? 0;
    const topY = baseY + (segmentHeights[sourceSegmentIndex] ?? 0);
    const spanM = segment.end - segment.start;
    const plinthHeightM = Math.min(0.52, (topY - baseY) * 0.14);
    const capHeightM = Math.min(0.32, (topY - baseY) * 0.09);
    const quoinWidthM = Math.min(0.18, spanM * 0.18);
    const depthA = segment.coord;
    const depthB = segment.coord + segment.outward * wallThicknessM;
    const makeBounds = (
      alongStart: number,
      alongEnd: number,
      minY: number,
      maxY: number,
    ): Pick<V3BoundarySupportPierModule, "min" | "max"> => {
      const minDepth = Math.min(depthA, depthB);
      const maxDepth = Math.max(depthA, depthB);
      return segment.orientation === "horizontal"
        ? {
            min: { x: alongStart, y: minY, z: minDepth },
            max: { x: alongEnd, y: maxY, z: maxDepth },
          }
        : {
            min: { x: minDepth, y: minY, z: alongStart },
            max: { x: maxDepth, y: maxY, z: alongEnd },
          };
    };
    const add = (
      role: V3BoundarySupportPierModule["role"],
      materialRole: V3BoundarySupportPierModule["materialRole"],
      alongStart: number,
      alongEnd: number,
      minY: number,
      maxY: number,
    ): void => {
      modules.push({
        sourceSegmentIndex,
        role,
        materialRole,
        ...makeBounds(alongStart, alongEnd, minY, maxY),
      });
    };
    const footingHeightM = Math.min(0.26, plinthHeightM * 0.58);
    const footingLedgeM = Math.min(0.06, spanM * 0.045);
    add(
      "footing_block",
      "limestone",
      segment.start - footingLedgeM,
      segment.end + footingLedgeM,
      baseY,
      baseY + footingHeightM,
    );
    add(
      "grounded_plinth",
      "limestone",
      segment.start,
      segment.end,
      baseY + footingHeightM,
      baseY + plinthHeightM,
    );
    add(
      "left_return_lip",
      "limestone",
      segment.start,
      segment.start + quoinWidthM,
      baseY + footingHeightM,
      baseY + plinthHeightM + 0.18,
    );
    add(
      "right_return_lip",
      "limestone",
      segment.end - quoinWidthM,
      segment.end,
      baseY + footingHeightM,
      baseY + plinthHeightM + 0.18,
    );
    add(
      "left_quoin",
      "limestone",
      segment.start,
      segment.start + quoinWidthM,
      baseY + plinthHeightM,
      topY - capHeightM,
    );
    add(
      "right_quoin",
      "limestone",
      segment.end - quoinWidthM,
      segment.end,
      baseY + plinthHeightM,
      topY - capHeightM,
    );
    add("supported_cap", "limestone", segment.start, segment.end, topY - capHeightM, topY);
    add(
      "closed_infill",
      "limestone",
      segment.start + quoinWidthM,
      segment.end - quoinWidthM,
      baseY + plinthHeightM,
      topY - capHeightM,
    );
  }
  return modules;
}

/**
 * Roof/coping slices never exceed the lower of the two authoritative side-wall
 * tops. The end slices also respect their collision cap, so no tall collider is
 * concealed behind a shorter freestanding render blade.
 */
export function planV3BoundarySupportCapSlices(
  plan: V3BoundarySupportReturn,
  segments: readonly BoundarySegment[],
  segmentHeights: readonly number[],
  segmentBaseYs: readonly number[],
): V3BoundarySupportCapSlice[] {
  const depthStart = plan.depthAxis === "y" ? plan.pocketRect.y : plan.pocketRect.x;
  const depthEnd = plan.depthAxis === "y"
    ? plan.pocketRect.y + plan.pocketRect.h
    : plan.pocketRect.x + plan.pocketRect.w;
  const cuts = [...new Set([
    depthStart,
    depthEnd,
    ...plan.sideSourceIndices.flatMap((chain) => chain.flatMap((index) => {
      const segment = segments[index]!;
      return [Math.max(depthStart, segment.start), Math.min(depthEnd, segment.end)];
    })),
  ])]
    .filter((value) => value >= depthStart - SURFACE_EDGE_EPSILON_M && value <= depthEnd + SURFACE_EDGE_EPSILON_M)
    .sort((left, right) => left - right);

  const segmentTop = (index: number): number => (
    (segmentBaseYs[index] ?? 0) + (segmentHeights[index] ?? 0)
  );
  const slices: V3BoundarySupportCapSlice[] = [];
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const start = cuts[index]!;
    const end = cuts[index + 1]!;
    if (end - start <= SURFACE_EDGE_EPSILON_M) continue;
    const midpoint = (start + end) * 0.5;
    const sideIndices = plan.sideSourceIndices.map((chain) => chain.find((sourceIndex) => {
      const segment = segments[sourceIndex]!;
      return midpoint >= segment.start - SURFACE_EDGE_EPSILON_M
        && midpoint <= segment.end + SURFACE_EDGE_EPSILON_M;
    }));
    if (typeof sideIndices[0] !== "number" || typeof sideIndices[1] !== "number") {
      throw new Error(`[v3 boundary support] ${plan.id} lost continuous side coverage at ${midpoint}`);
    }
    const topCandidates = [segmentTop(sideIndices[0]), segmentTop(sideIndices[1])];
    if (index === 0) topCandidates.push(segmentTop(plan.capSourceIndices[0]));
    if (index === cuts.length - 2) topCandidates.push(segmentTop(plan.capSourceIndices[1]));
    const topY = Math.min(...topCandidates);
    if (!Number.isFinite(topY)) {
      throw new Error(`[v3 boundary support] ${plan.id} emitted a non-finite coping elevation`);
    }
    slices.push({
      rect: plan.depthAxis === "y"
        ? { x: plan.pocketRect.x, y: start, w: plan.pocketRect.w, h: end - start }
        : { x: start, y: plan.pocketRect.y, w: end - start, h: plan.pocketRect.h },
      topY,
    });
  }
  return slices;
}

export type V3BoundaryRetainingCurb = {
  sourceSegmentIndex: number;
  rect: RuntimeRect;
  baseY: number;
  heightM: number;
};

/** Visual-only curb footprints remain wholly inside the existing wall AABB. */
export function planV3BoundaryRetainingCurbs(
  plans: readonly V3BoundarySupportReturn[],
  segments: readonly BoundarySegment[],
  surfaces: readonly RuntimeTraversalSurface[],
  wallThicknessM: number,
): V3BoundaryRetainingCurb[] {
  if (plans.length === 0 || surfaces.length === 0) return [];
  const resolver = new TraversalSurfaceResolver(surfaces);
  const curbDepthM = Math.min(VISUAL_SUPPORT_CURB_DEPTH_M, wallThicknessM);
  const curbs: V3BoundaryRetainingCurb[] = [];
  const seen = new Set<string>();

  for (const plan of plans) {
    for (const sourceSegmentIndex of plan.sideSourceIndices.flat()) {
      const segment = segments[sourceSegmentIndex]!;
      for (const surface of surfaces) {
        if (surface.kind !== "ramp") continue;
        const edgeMatches = segment.orientation === "vertical"
          ? Math.abs(segment.coord - surface.rect.x) <= SURFACE_EDGE_EPSILON_M
            || Math.abs(segment.coord - (surface.rect.x + surface.rect.w)) <= SURFACE_EDGE_EPSILON_M
          : Math.abs(segment.coord - surface.rect.y) <= SURFACE_EDGE_EPSILON_M
            || Math.abs(segment.coord - (surface.rect.y + surface.rect.h)) <= SURFACE_EDGE_EPSILON_M;
        if (!edgeMatches) continue;
        const surfaceStart = segment.orientation === "vertical" ? surface.rect.y : surface.rect.x;
        const surfaceEnd = segment.orientation === "vertical"
          ? surface.rect.y + surface.rect.h
          : surface.rect.x + surface.rect.w;
        const overlapStart = Math.max(segment.start, surfaceStart);
        const overlapEnd = Math.min(segment.end, surfaceEnd);
        if (overlapEnd - overlapStart <= SURFACE_EDGE_EPSILON_M) continue;
        const midpoint = (overlapStart + overlapEnd) * 0.5;
        const sampleX = segment.orientation === "vertical"
          ? segment.coord - segment.outward * 0.02
          : midpoint;
        const sampleZ = segment.orientation === "horizontal"
          ? segment.coord - segment.outward * 0.02
          : midpoint;
        const baseY = resolver.sample(sampleX, sampleZ)?.elevationM;
        if (typeof baseY !== "number" || !Number.isFinite(baseY)) continue;
        const rect: RuntimeRect = segment.orientation === "vertical"
          ? {
              x: segment.outward > 0 ? segment.coord : segment.coord - curbDepthM,
              y: overlapStart,
              w: curbDepthM,
              h: overlapEnd - overlapStart,
            }
          : {
              x: overlapStart,
              y: segment.outward > 0 ? segment.coord : segment.coord - curbDepthM,
              w: overlapEnd - overlapStart,
              h: curbDepthM,
            };
        const key = `${sourceSegmentIndex}:${overlapStart}:${overlapEnd}`;
        if (seen.has(key)) continue;
        seen.add(key);
        curbs.push({
          sourceSegmentIndex,
          rect,
          baseY,
          heightM: VISUAL_SUPPORT_CURB_HEIGHT_M,
        });
      }
    }
  }
  return curbs;
}

export type SegmentElevationEnvelope = {
  minY: number;
  maxY: number;
};

export function resolveSegmentElevationEnvelopes(
  segments: readonly BoundarySegment[],
  surfaces: readonly RuntimeTraversalSurface[],
  fallbackY: number,
): SegmentElevationEnvelope[] {
  if (surfaces.length === 0) return segments.map(() => ({ minY: fallbackY, maxY: fallbackY }));
  const resolver = new TraversalSurfaceResolver(surfaces);
  return segments.map((segment) => {
    const inwardProbeM = 0.08;
    const insetAlongM = Math.min(0.002, Math.max(0, (segment.end - segment.start) * 0.1));
    const alongSamples = [
      segment.start + insetAlongM,
      (segment.start + segment.end) * 0.5,
      segment.end - insetAlongM,
    ];
    const elevations = alongSamples.map((along) => {
      const x = segment.orientation === "vertical"
        ? segment.coord - segment.outward * inwardProbeM
        : along;
      const z = segment.orientation === "horizontal"
        ? segment.coord - segment.outward * inwardProbeM
        : along;
      return resolver.sample(x, z)?.elevationM ?? fallbackY;
    });
    return { minY: Math.min(...elevations), maxY: Math.max(...elevations) };
  });
}

function createFloorInstances(
  rects: RuntimeRect[],
  material: MeshLambertMaterial,
  thicknessM: number,
  topY: number,
): InstancedMesh<BoxGeometry, MeshLambertMaterial> | null {
  if (rects.length === 0) return null;

  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, material, rects.length);
  mesh.frustumCulled = false;

  const dummy = new Object3D();
  const centerY = topY - thicknessM * 0.5;

  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i]!;
    dummy.position.set(rect.x + rect.w * 0.5, centerY, rect.y + rect.h * 0.5);
    dummy.scale.set(rect.w, thicknessM, rect.h);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createTraversalFloorGroup(
  zones: readonly RuntimeBlockoutZone[],
  surfaces: readonly RuntimeTraversalSurface[],
  material: MeshLambertMaterial,
  thicknessM: number,
  fallbackTopY: number,
  topOffsetM = 0,
): Group | null {
  if (zones.length === 0) return null;

  const root = new Group();
  const geometry = new BoxGeometry(1, 1, 1);
  const surfacesById = new Map(surfaces.map((surface) => [surface.id, surface]));

  for (const zone of zones) {
    const surface = zone.surfaceId ? surfacesById.get(zone.surfaceId) : undefined;
    const rect = zone.rect;
    const mesh = new Mesh(geometry, material);
    mesh.name = `surface-floor-${zone.id}`;
    mesh.receiveShadow = topOffsetM <= 0;
    mesh.castShadow = false;

    if (!surface || surface.kind === "flat") {
      const topY = (surface?.elevationM ?? fallbackTopY) + topOffsetM;
      mesh.position.set(
        rect.x + rect.w * 0.5,
        topY - thicknessM * 0.5,
        rect.y + rect.h * 0.5,
      );
      mesh.scale.set(rect.w, thicknessM, rect.h);
    } else {
      const delta = surface.endElevationM - surface.startElevationM;
      const horizontalLength = surface.axis === "x" ? rect.w : rect.h;
      const slopedLength = Math.hypot(horizontalLength, delta);
      mesh.position.set(
        rect.x + rect.w * 0.5,
        (surface.startElevationM + surface.endElevationM) * 0.5 + topOffsetM - thicknessM * 0.5,
        rect.y + rect.h * 0.5,
      );
      if (surface.axis === "x") {
        mesh.rotation.z = Math.atan2(delta, horizontalLength);
        mesh.scale.set(slopedLength, thicknessM, rect.h);
      } else {
        mesh.rotation.x = -Math.atan2(delta, horizontalLength);
        mesh.scale.set(rect.w, thicknessM, slopedLength);
      }
    }
    root.add(mesh);
  }

  return root.children.length > 0 ? root : null;
}

function createVisualStairTreads(
  surfaces: readonly RuntimeTraversalSurface[],
  material: MeshLambertMaterial,
): InstancedMesh<BoxGeometry, MeshLambertMaterial> | null {
  const stairSurfaces = surfaces.filter(
    (surface): surface is RuntimeRampTraversalSurface => (
      surface.kind === "ramp" && surface.visualStyle === "stairs"
    ),
  );
  const totalSteps = stairSurfaces.reduce((sum, surface) => sum + (surface.stepCount ?? 10), 0);
  if (totalSteps === 0) return null;

  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, material, totalSteps);
  mesh.name = "map-visual-stair-treads";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const dummy = new Object3D();
  const treadThicknessM = 0.06;
  let instanceIndex = 0;

  for (const surface of stairSurfaces) {
    if (surface.kind !== "ramp") continue;
    const stepCount = surface.stepCount ?? 10;
    const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
    const stepLength = axisLength / stepCount;
    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const t0 = stepIndex / stepCount;
      const t1 = (stepIndex + 1) / stepCount;
      const elevation0 = surface.startElevationM
        + (surface.endElevationM - surface.startElevationM) * t0;
      const elevation1 = surface.startElevationM
        + (surface.endElevationM - surface.startElevationM) * t1;
      const stepRiseM = Math.abs(elevation1 - elevation0);
      // Use the higher edge as the tread top in both traversal directions and
      // extend the visual box through the full riser. The former fixed 6 cm
      // slab left dark open bands on the authored 14 cm descent steps even
      // though movement correctly used the underlying analytic ramp.
      const topY = Math.max(elevation0, elevation1) + 0.025;
      const visualStepHeightM = stepRiseM + treadThicknessM;
      const x = surface.axis === "x"
        ? surface.rect.x + axisLength * (t0 + t1) * 0.5
        : surface.rect.x + surface.rect.w * 0.5;
      const z = surface.axis === "y"
        ? surface.rect.y + axisLength * (t0 + t1) * 0.5
        : surface.rect.y + surface.rect.h * 0.5;
      dummy.position.set(x, topY - visualStepHeightM * 0.5, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(
        surface.axis === "x" ? stepLength + 0.025 : surface.rect.w,
        visualStepHeightM,
        surface.axis === "y" ? stepLength + 0.025 : surface.rect.h,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(instanceIndex, dummy.matrix);
      instanceIndex += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createWallInstances(
  segments: BoundarySegment[],
  material: MeshLambertMaterial,
  wallHeightM: number,
  wallThicknessM: number,
  floorTopY: number,
  segmentHeights?: readonly number[],
  segmentBaseYs?: readonly number[],
): InstancedMesh<BoxGeometry, MeshLambertMaterial> | null {
  if (segments.length === 0) return null;

  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, material, segments.length);
  mesh.frustumCulled = false;

  const dummy = new Object3D();

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    const lengthM = segment.end - segment.start;
    const segHeight = segmentHeights?.[i] ?? wallHeightM;
    const centerY = (segmentBaseYs?.[i] ?? floorTopY) + segHeight * 0.5;

    let centerX = 0;
    let centerZ = 0;
    let sizeX = 0;
    let sizeZ = 0;

    if (segment.orientation === "vertical") {
      centerX = segment.coord + segment.outward * (wallThicknessM * 0.5);
      centerZ = (segment.start + segment.end) * 0.5;
      sizeX = wallThicknessM;
      sizeZ = lengthM;
    } else {
      centerX = (segment.start + segment.end) * 0.5;
      centerZ = segment.coord + segment.outward * (wallThicknessM * 0.5);
      sizeX = lengthM;
      sizeZ = wallThicknessM;
    }

    dummy.position.set(centerX, centerY, centerZ);
    dummy.scale.set(sizeX, segHeight, sizeZ);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function appendWallSegmentColliders(
  segments: BoundarySegment[],
  wallHeightM: number,
  wallThicknessM: number,
  floorTopY: number,
  colliders: RuntimeColliderAabb[],
  segmentHeights?: readonly number[],
  segmentBaseYs?: readonly number[],
): void {
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    const segmentHeightM = segmentHeights?.[i] ?? wallHeightM;
    const segmentBaseY = segmentBaseYs?.[i] ?? floorTopY;
    const centerY = segmentBaseY + segmentHeightM * 0.5;
    const lengthM = segment.end - segment.start;
    let centerX = 0;
    let centerZ = 0;
    let sizeX = 0;
    let sizeZ = 0;

    if (segment.orientation === "vertical") {
      centerX = segment.coord + segment.outward * (wallThicknessM * 0.5);
      centerZ = (segment.start + segment.end) * 0.5;
      sizeX = wallThicknessM;
      sizeZ = lengthM;
    } else {
      centerX = (segment.start + segment.end) * 0.5;
      centerZ = segment.coord + segment.outward * (wallThicknessM * 0.5);
      sizeX = lengthM;
      sizeZ = wallThicknessM;
    }

    colliders.push({
      id: `wall-${i + 1}`,
      kind: "wall",
      min: {
        x: centerX - sizeX * 0.5,
        y: centerY - segmentHeightM * 0.5,
        z: centerZ - sizeZ * 0.5,
      },
      max: {
        x: centerX + sizeX * 0.5,
        y: centerY + segmentHeightM * 0.5,
        z: centerZ + sizeZ * 0.5,
      },
    });
  }
}

type V3BoundaryFinishBox = {
  placementId: string;
  semanticClass:
    | "structural_wall_coping"
    | "structural_wall_cornice_fascia"
    | "structural_wall_base_course"
    | "structural_wall_terminal_return"
    | "structural_wall_corner_junction";
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  face?: { widthM: number; heightM: number; yawRad: number };
};

type V3BoundaryFinishRun = {
  segment: BoundarySegment;
  baseY: number;
  topY: number;
  sourceIndices: number[];
};

function mergeV3BoundaryFinishRuns(
  segments: readonly BoundarySegment[],
  segmentHeights: readonly number[],
  segmentBaseYs: readonly number[],
): V3BoundaryFinishRun[] {
  const candidates = segments.map((segment, index) => ({
    segment: { ...segment },
    baseY: segmentBaseYs[index]!,
    topY: segmentBaseYs[index]! + segmentHeights[index]!,
    sourceIndices: [index],
  })).sort((left, right) => (
    left.segment.orientation.localeCompare(right.segment.orientation)
    || left.segment.coord - right.segment.coord
    || left.segment.outward - right.segment.outward
    || left.baseY - right.baseY
    || left.topY - right.topY
    || left.segment.start - right.segment.start
  ));
  const runs: V3BoundaryFinishRun[] = [];
  for (const candidate of candidates) {
    const previous = runs[runs.length - 1];
    if (
      previous
      && previous.segment.orientation === candidate.segment.orientation
      && previous.segment.outward === candidate.segment.outward
      && Math.abs(previous.segment.coord - candidate.segment.coord) <= SURFACE_EDGE_EPSILON_M
      && Math.abs(previous.segment.end - candidate.segment.start) <= SURFACE_EDGE_EPSILON_M
      && Math.abs(previous.baseY - candidate.baseY) <= SURFACE_EDGE_EPSILON_M
      && Math.abs(previous.topY - candidate.topY) <= SURFACE_EDGE_EPSILON_M
    ) {
      previous.segment.end = candidate.segment.end;
      previous.sourceIndices.push(...candidate.sourceIndices);
      continue;
    }
    runs.push(candidate);
  }
  return runs;
}

function createV3BoundaryFinishTrim(
  segments: readonly BoundarySegment[],
  segmentHeights: readonly number[],
  segmentBaseYs: readonly number[],
  wallThicknessM: number,
  material: MeshStandardMaterial,
  seed: number,
): Group | null {
  if (segments.length === 0) return null;
  const copings: V3BoundaryFinishBox[] = [];
  const corniceFascias: V3BoundaryFinishBox[] = [];
  const bases: V3BoundaryFinishBox[] = [];
  const endpointGroups = new Map<string, Array<{
    orientation: BoundarySegment["orientation"];
    outward: BoundarySegment["outward"];
    baseY: number;
    topY: number;
    x: number;
    z: number;
  }>>();
  const endpointKey = (x: number, z: number): string => `${x.toFixed(4)}:${z.toFixed(4)}`;

  const runs = mergeV3BoundaryFinishRuns(segments, segmentHeights, segmentBaseYs);
  for (const run of runs) {
    const { segment, baseY, topY } = run;
    const sourceLabel = run.sourceIndices.length === 1
      ? `${run.sourceIndices[0]! + 1}`
      : `${run.sourceIndices[0]! + 1}-${run.sourceIndices.at(-1)! + 1}`;
    const lengthM = segment.end - segment.start;
    const wallCenterOffsetM = segment.outward * wallThicknessM * 0.5;
    const horizontal = segment.orientation === "horizontal";
    const centerX = horizontal ? (segment.start + segment.end) * 0.5 : segment.coord + wallCenterOffsetM;
    const centerZ = horizontal ? segment.coord + wallCenterOffsetM : (segment.start + segment.end) * 0.5;
    const inwardFaceYawRad = horizontal
      ? (segment.outward < 0 ? 0 : Math.PI)
      : (segment.outward < 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
    const alongScaleM = lengthM + V3_BOUNDARY_COPING_OUTSET_M * 2;
    const crossScaleM = wallThicknessM + V3_BOUNDARY_COPING_OUTSET_M * 2;
    // Short, low visual fragments usually terminate behind an authored facade
    // or portal. Capping those independently exposes a floating sliver above
    // the occluding mass. Tall firewall fragments remain skyline architecture
    // even when short, so they own the same continuous cap as long runs.
    if (
      lengthM >= V3_BOUNDARY_COPING_MIN_RUN_M
      || topY - baseY >= V3_BOUNDARY_COPING_FIREWALL_MIN_HEIGHT_M
    ) {
      copings.push({
        placementId: `V3_BOUNDARY_FINISH:${sourceLabel}:coping`,
        semanticClass: "structural_wall_coping",
        position: { x: centerX, y: topY + V3_BOUNDARY_COPING_HEIGHT_M * 0.5, z: centerZ },
        scale: horizontal
          ? { x: alongScaleM, y: V3_BOUNDARY_COPING_HEIGHT_M, z: crossScaleM }
          : { x: crossScaleM, y: V3_BOUNDARY_COPING_HEIGHT_M, z: alongScaleM },
      });
      const inwardFaceOffsetM = -segment.outward * V3_BOUNDARY_CORNICE_FASCIA_DEPTH_M * 0.42;
      corniceFascias.push({
        placementId: `V3_BOUNDARY_FINISH:${sourceLabel}:cornice-fascia`,
        semanticClass: "structural_wall_cornice_fascia",
        position: horizontal
          ? {
              x: (segment.start + segment.end) * 0.5,
              y: topY - V3_BOUNDARY_CORNICE_FASCIA_HEIGHT_M * 0.5,
              z: segment.coord + inwardFaceOffsetM,
            }
          : {
              x: segment.coord + inwardFaceOffsetM,
              y: topY - V3_BOUNDARY_CORNICE_FASCIA_HEIGHT_M * 0.5,
              z: (segment.start + segment.end) * 0.5,
            },
        scale: horizontal
          ? {
              x: lengthM,
              y: V3_BOUNDARY_CORNICE_FASCIA_HEIGHT_M,
              z: V3_BOUNDARY_CORNICE_FASCIA_DEPTH_M,
            }
          : {
              x: V3_BOUNDARY_CORNICE_FASCIA_DEPTH_M,
              y: V3_BOUNDARY_CORNICE_FASCIA_HEIGHT_M,
              z: lengthM,
            },
        face: {
          widthM: lengthM,
          heightM: V3_BOUNDARY_CORNICE_FASCIA_HEIGHT_M,
          yawRad: inwardFaceYawRad,
        },
      });
    }
    const architectureOwnsBase = run.sourceIndices.some((sourceIndex) => (
      V3_ARCHITECTURE_OWNED_BASE_SOURCE_LABELS.has(sourceIndex + 1)
    ));
    if (!architectureOwnsBase) {
      bases.push({
        placementId: `V3_BOUNDARY_FINISH:${sourceLabel}:base`,
        semanticClass: "structural_wall_base_course",
        position: horizontal
          ? {
              x: (segment.start + segment.end) * 0.5,
              y: baseY + V3_BOUNDARY_BASE_HEIGHT_M * 0.5,
              z: segment.coord - segment.outward * 0.006,
            }
          : {
              x: segment.coord - segment.outward * 0.006,
              y: baseY + V3_BOUNDARY_BASE_HEIGHT_M * 0.5,
              z: (segment.start + segment.end) * 0.5,
            },
        scale: horizontal
          ? {
              x: lengthM + V3_BOUNDARY_BASE_OUTSET_M * 2,
              y: V3_BOUNDARY_BASE_HEIGHT_M,
              z: wallThicknessM + V3_BOUNDARY_BASE_OUTSET_M * 2,
            }
          : {
              x: wallThicknessM + V3_BOUNDARY_BASE_OUTSET_M * 2,
              y: V3_BOUNDARY_BASE_HEIGHT_M,
              z: lengthM + V3_BOUNDARY_BASE_OUTSET_M * 2,
            },
        face: {
          widthM: lengthM + V3_BOUNDARY_BASE_OUTSET_M * 2,
          heightM: V3_BOUNDARY_BASE_HEIGHT_M,
          yawRad: inwardFaceYawRad,
        },
      });
    }

    const endpoints = horizontal
      ? [{ x: segment.start, z: segment.coord }, { x: segment.end, z: segment.coord }]
      : [{ x: segment.coord, z: segment.start }, { x: segment.coord, z: segment.end }];
    for (const endpoint of endpoints) {
      const key = endpointKey(endpoint.x, endpoint.z);
      const group = endpointGroups.get(key);
      const entry = {
        orientation: segment.orientation,
        outward: segment.outward,
        baseY,
        topY,
        ...endpoint,
      };
      if (group) group.push(entry);
      else endpointGroups.set(key, [entry]);
    }
  }

  // A true wall terminal needs a thin return across the wall thickness. The
  // earlier full-height square "quoin" at every corner projected past the wall
  // plane and became the raw vertical fins visible above the Rug Gate and
  // Covered Souk roofs. Perpendicular walls already close constructed corners;
  // collinear split points likewise need no extra volume.
  const terminalReturns: V3BoundaryFinishBox[] = [];
  const cornerJunctions: V3BoundaryFinishBox[] = [];
  for (const [key, endpoints] of endpointGroups) {
    const orientations = new Set(endpoints.map((endpoint) => endpoint.orientation));
    if (endpoints.length > 1 && orientations.size === 2) {
      const baseY = Math.min(...endpoints.map((endpoint) => endpoint.baseY));
      const topY = Math.min(...endpoints.map((endpoint) => endpoint.topY));
      if (topY - baseY >= V3_BOUNDARY_BASE_HEIGHT_M) {
        const endpoint = endpoints[0]!;
        const junctionBottomY = baseY + V3_BOUNDARY_BASE_HEIGHT_M;
        cornerJunctions.push({
          placementId: `V3_BOUNDARY_FINISH:${key}:corner-junction`,
          semanticClass: "structural_wall_corner_junction",
          position: {
            x: endpoint.x,
            y: (junctionBottomY + topY) * 0.5,
            z: endpoint.z,
          },
          scale: {
            x: V3_BOUNDARY_CORNER_JUNCTION_WIDTH_M,
            y: topY - junctionBottomY,
            z: V3_BOUNDARY_CORNER_JUNCTION_WIDTH_M,
          },
        });
      }
      continue;
    }
    if (endpoints.length !== 1) continue;
    const endpoint = endpoints[0]!;
    const { baseY, topY } = endpoint;
    if (topY - baseY < V3_BOUNDARY_BASE_HEIGHT_M) continue;
    const cappedTopY = topY + V3_BOUNDARY_COPING_HEIGHT_M;
    const returnBottomY = baseY + V3_BOUNDARY_BASE_HEIGHT_M;
    const horizontal = endpoint.orientation === "horizontal";
    terminalReturns.push({
      placementId: `V3_BOUNDARY_FINISH:${key}:terminal-return`,
      semanticClass: "structural_wall_terminal_return",
      position: {
        x: endpoint.x + (horizontal ? 0 : endpoint.outward * wallThicknessM * 0.5),
        y: (returnBottomY + cappedTopY) * 0.5,
        z: endpoint.z + (horizontal ? endpoint.outward * wallThicknessM * 0.5 : 0),
      },
      scale: horizontal
        ? {
            x: V3_BOUNDARY_TERMINAL_RETURN_DEPTH_M,
            y: cappedTopY - returnBottomY,
            z: wallThicknessM + V3_BOUNDARY_COPING_OUTSET_M * 2,
          }
        : {
            x: wallThicknessM + V3_BOUNDARY_COPING_OUTSET_M * 2,
            y: cappedTopY - returnBottomY,
            z: V3_BOUNDARY_TERMINAL_RETURN_DEPTH_M,
          },
    });
  }

  const root = new Group();
  root.name = "map-pbr-boundary-finish-trim";
  const addBatch = (
    name: string,
    boxes: readonly V3BoundaryFinishBox[],
    castShadow: boolean,
  ): void => {
    if (boxes.length === 0) return;
    // These finish courses total only a few thousand triangles across the
    // entire map. Splitting them into spatial chunks produced dozens of tiny
    // draws whose CPU cost outweighed the negligible off-camera geometry.
    // Keep face and volume geometry separate, but merge each compatible class
    // globally so the boundary finish remains a small fixed draw budget.
    const chunks = new Map<"face" | "volume", V3BoundaryFinishBox[]>();
    for (const box of boxes) {
      const key = box.face ? "face" : "volume";
      const chunk = chunks.get(key);
      if (chunk) chunk.push(box);
      else chunks.set(key, [box]);
    }
    for (const [geometryClass, chunkBoxes] of chunks) {
      const faceBatch = chunkBoxes.every((box) => box.face !== undefined);
      const mesh = new InstancedMesh(
        faceBatch ? new PlaneGeometry(1, 1) : new BoxGeometry(1, 1, 1),
        material,
        chunkBoxes.length,
      );
      const dummy = new Object3D();
      // Repeated members are cut from the same quarry but not the same block.
      // Without per-instance tone every pier and coping in a run rendered as
      // one continuous extruded ribbon; a narrow seeded band breaks that while
      // staying inside the material's own value range.
      const toneRng = new DeterministicRng(deriveSubSeed(seed, `boundary-finish-tone:${name}:${geometryClass}`));
      const tone = new Color();
      for (let index = 0; index < chunkBoxes.length; index += 1) {
        const box = chunkBoxes[index]!;
        dummy.position.set(box.position.x, box.position.y, box.position.z);
        if (box.face) {
          dummy.scale.set(box.face.widthM, box.face.heightM, 1);
          dummy.rotation.set(0, box.face.yawRad, 0);
        } else {
          dummy.scale.set(box.scale.x, box.scale.y, box.scale.z);
          dummy.rotation.set(0, 0, 0);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        const value = 0.94 + toneRng.next() * 0.12;
        const warmth = (toneRng.next() - 0.5) * 0.03;
        tone.setRGB(value * (1 + warmth), value, value * (1 - warmth));
        mesh.setColorAt(index, tone);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.name = `map-pbr-boundary-${name}-${geometryClass}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      mesh.userData.visualQa = {
        moduleId: `boundary_${name}`,
        semanticClass: "structural_boundary_finish",
        representation: "module",
        materialMode: "pbr",
        shadowMode: castShadow ? "cast_receive" : "receive_only",
      };
      mesh.userData.visualQaInstances = chunkBoxes.map((box) => ({
        placementId: box.placementId,
        moduleId: `boundary_${name}`,
        semanticClass: box.semanticClass,
        representation: "module",
        materialMode: "pbr",
        dimensions: box.scale,
        groundingGapM: 0,
        structurallyBacked: true,
        shadowMode: castShadow ? "cast_receive" : "receive_only",
      }));
      root.add(mesh);
    }
  };
  addBatch("copings", copings, false);
  addBatch("cornice-fascias", corniceFascias, false);
  addBatch("base-courses", bases, false);
  addBatch("terminal-returns", terminalReturns, false);
  addBatch("corner-junctions", cornerJunctions, false);
  return root.children.length > 0 ? root : null;
}

export function buildBlockout(spec: RuntimeBlockoutSpec, options: BlockoutBuildOptions): BlockoutBuildResult {
  const root = new Group();
  root.name = "map-blockout";
  const palette = resolveBlockoutPalette(options.highVis);
  const wallTextureQuality = resolveWallTextureQuality(options.floorQuality);
  const isV3 = /^3(?:\.|$)/.test(spec.formatVersion ?? "");

  const walkableZones = spec.zones.filter((zone) => WALKABLE_ZONE_TYPES.has(zone.type));
  const stallZones = spec.zones.filter((zone) => zone.type === STALL_STRIP_ZONE_TYPE);
  const clearZones = spec.zones.filter((zone) => zone.type === CLEAR_TRAVEL_ZONE_TYPE);
  const walkableRects = walkableZones.map((zone) => zone.rect);
  const stallRects = stallZones.map((zone) => zone.rect);
  const clearRects = clearZones.map((zone) => zone.rect);
  const traversalSurfaces = spec.traversalSurfaces ?? [];
  const wallSegments = deriveBlockoutWallSegments(spec);
  const wallThicknessM = Math.max(0.05, spec.defaults.wall_thickness);

  const floorTopY = spec.defaults.floor_height;
  const segmentElevationEnvelopes = resolveSegmentElevationEnvelopes(
    wallSegments,
    traversalSurfaces,
    floorTopY,
  );
  const segmentBaseYs = segmentElevationEnvelopes.map((envelope) => envelope.minY);
  if (options.floorMode === "pbr" && options.floorMaterials) {
    const pbrFloors = buildPbrFloors(spec, {
      seed: options.seed,
      quality: options.floorQuality,
      manifest: options.floorMaterials,
      patchSizeM: 2,
      floorTopY,
    });
    root.add(pbrFloors);

    const floorWearDecals = buildFloorWearDecals(spec, options.seed, floorTopY);
    if (floorWearDecals) root.add(floorWearDecals);

    if (options.lightingPreset === "golden") {
      const sandAccumulation = buildSandAccumulation({
        wallSegments,
        seed: options.seed,
        floorTopY,
        manifest: options.floorMaterials,
        quality: options.floorQuality,
      });
      root.add(sandAccumulation);

      const wallBaseDebris = buildWallBaseDebris({
        wallSegments,
        seed: options.seed,
        floorTopY,
        manifest: options.floorMaterials,
        quality: options.floorQuality,
      });
      root.add(wallBaseDebris);
    }
  } else {
    const walkableFloor = traversalSurfaces.length > 0
      ? createTraversalFloorGroup(
          walkableZones,
          traversalSurfaces,
          new MeshLambertMaterial({ color: palette.floorBase }),
          BASE_FLOOR_THICKNESS_M,
          floorTopY,
        )
      : createFloorInstances(
          walkableRects,
          new MeshLambertMaterial({ color: palette.floorBase }),
          BASE_FLOOR_THICKNESS_M,
          floorTopY,
        );
    const stallOverlay = traversalSurfaces.length > 0
      ? createTraversalFloorGroup(
          stallZones,
          traversalSurfaces,
          new MeshLambertMaterial({ color: palette.floorStallOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY,
          0.02,
        )
      : createFloorInstances(
          stallRects,
          new MeshLambertMaterial({ color: palette.floorStallOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY + 0.02,
        );
    const clearOverlay = traversalSurfaces.length > 0
      ? createTraversalFloorGroup(
          clearZones,
          traversalSurfaces,
          new MeshLambertMaterial({ color: palette.floorClearOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY,
          0.03,
        )
      : createFloorInstances(
          clearRects,
          new MeshLambertMaterial({ color: palette.floorClearOverlay }),
          OVERLAY_FLOOR_THICKNESS_M,
          floorTopY + 0.03,
        );
    if (walkableFloor) walkableFloor.receiveShadow = true;
    if (stallOverlay) stallOverlay.receiveShadow = false;
    if (clearOverlay) clearOverlay.receiveShadow = false;

    if (walkableFloor) root.add(walkableFloor);
    if (stallOverlay) root.add(stallOverlay);
    if (clearOverlay) root.add(clearOverlay);
  }
  const courtPavingBorders = createCourtPavingBorders(
    spec,
    floorTopY,
    options.floorMaterials,
    options.floorQuality,
  );
  if (courtPavingBorders) root.add(courtPavingBorders);
  const dyersProcessStain = createDyersProcessStain(
    options.anchors,
    floorTopY,
    options.floorMaterials,
    options.floorQuality,
  );
  if (dyersProcessStain) root.add(dyersProcessStain);

  // Final PBR floors own their authored, world-scaled stair treads. The legacy
  // tan Lambert boxes are retained only for explicit blockout/fallback mode.
  const visualStairs = options.floorMode === "pbr" && options.floorMaterials
    ? null
    : createVisualStairTreads(
        traversalSurfaces,
        new MeshLambertMaterial({ color: 0xb79a6b }),
      );
  if (visualStairs) root.add(visualStairs);

  const colliders: RuntimeColliderAabb[] = [];

  // Run wall detail placements first — they compute per-segment heights
  // that the wall geometry builder needs for varied building silhouettes.
  const wallDetailDensityScale = typeof options.wallDetails.densityScale === "number"
    ? options.wallDetails.densityScale
    : 1;
  const useV3AuthoredVisualWallOwnership = isV3
    && options.wallMaterials !== null
    && usesV3AuthoredVisualWallOwnership(
      spec.formatVersion,
      options.wallMode,
      spec.wall_details.style,
    );
  // Validate render ownership before building any cutout massing. A malformed
  // frontage must fail atomically instead of exposing the collision wall or a
  // half-built recess during the same frame.
  const v3VisualWallPlan = useV3AuthoredVisualWallOwnership
    ? planV3VisualWallSegments({
        segments: wallSegments,
        zones: spec.zones,
        placements: spec.architecturePlacements ?? [],
        playableBoundary: spec.playable_boundary,
      })
    : null;
  const wallDetailPlacements = isV3
    ? buildV3Architecture({
        placements: spec.architecturePlacements ?? [],
        massingProfiles: spec.massingProfiles ?? [],
        facadeProfiles: spec.facadeProfiles ?? [],
        segments: wallSegments,
        zones: spec.zones,
        traversalSurfaces,
        wallHeightM: spec.defaults.wall_height,
        fortifiedDoorModelAvailable: Boolean(options.doorModels),
        experimentalVisualCutoutMassing: useV3AuthoredVisualWallOwnership,
        // Bays whose recess already houses an authored merchant stall.
        stallSeatedPlacementIds: new Set(
          (options.anchors?.anchors ?? [])
            .filter((anchor) => anchor.type === "shopfront_anchor" && anchor.servedBayId && anchor.frontageId)
            .map((anchor) => `ARCH_${anchor.frontageId}_${anchor.servedBayId}`),
        ),
        sectionOwnedFaces: new Set((spec.sectionModels ?? []).flatMap((section) => section.faces.map((face) => `${section.zoneId}:${face}`))),
      })
    : buildWallDetailPlacements({
        segments: wallSegments,
        zones: spec.zones,
        anchors: options.anchors,
        facadeOverrides: spec.wall_details.facadeOverrides,
        moduleRegistry: spec.wall_details.moduleRegistry,
        compositionLayoutOverrides: spec.wall_details.compositionLayoutOverrides,
        doorLayoutOverrides: spec.wall_details.doorLayoutOverrides,
        windowLayoutOverrides: spec.wall_details.windowLayoutOverrides,
        balconyLayoutOverrides: spec.wall_details.balconyLayoutOverrides,
        seed: options.seed,
        wallHeightM: spec.defaults.wall_height,
        wallThicknessM,
        enabled: spec.wall_details.enabled && options.wallDetails.enabled,
        profile: options.wallMode === "pbr" ? "pbr" : "blockout",
        detailSeed: typeof spec.wall_details.seed === "number" ? spec.wall_details.seed : null,
        density: clamp(spec.wall_details.density * wallDetailDensityScale, 0, 1.25),
        maxProtrusionM: spec.wall_details.maxProtrusion,
        segmentBaseYs,
      });

  const segmentHeights = wallDetailPlacements.segmentHeights.map((heightM, index) => (
    heightM + (segmentElevationEnvelopes[index]!.maxY - segmentElevationEnvelopes[index]!.minY)
  ));
  appendWallSegmentColliders(
    wallSegments,
    spec.defaults.wall_height,
    wallThicknessM,
    floorTopY,
    colliders,
    segmentHeights,
    segmentBaseYs,
  );

  if (options.wallMode === "pbr" && options.wallMaterials) {
    // Collision remains authoritative and uses the untouched wallSegments
    // above. In final v3 PBR, compiler-authored massing owns its validated
    // lane-facing surface, so only the uncovered parent-wall remainders render.
    const visualWallPlan = v3VisualWallPlan ?? {
          segments: wallSegments.map((segment) => ({ ...segment })),
          sourceSegmentIndices: wallSegments.map((_, index) => index),
          architectureOwnedFrontages: [],
        };
    const supportPlans = isV3 ? planV3BoundarySupportReturns(wallSegments, spec.zones) : [];
    const supportEndCaps = planV3BoundarySupportEndCaps(supportPlans, wallSegments, spec.zones);
    const repaintedEndCapIndices = new Set(supportEndCaps.map((entry) => entry.sourceSegmentIndex));
    const primaryVisualEntries = visualWallPlan.segments
      .map((segment, index) => ({
        segment,
        sourceIndex: visualWallPlan.sourceSegmentIndices[index]!,
      }))
      .filter((entry) => !repaintedEndCapIndices.has(entry.sourceIndex));
    const visualSegmentHeights = primaryVisualEntries.map(({ sourceIndex }) => (
      segmentHeights[sourceIndex]!
    ));
    const visualSegmentBaseYs = primaryVisualEntries.map(({ sourceIndex }) => (
      segmentBaseYs[sourceIndex]!
    ));
    const primaryVisualSegments = primaryVisualEntries.map((entry) => entry.segment);
    const primaryVisualSourceIndices = primaryVisualEntries.map((entry) => entry.sourceIndex);
    const pbrWalls = buildPbrWalls({
      ...(spec.formatVersion ? { formatVersion: spec.formatVersion } : {}),
      segments: primaryVisualSegments,
      sourceSegments: wallSegments,
      segmentSourceIndices: primaryVisualSourceIndices,
      zones: spec.zones,
      frontages: spec.frontages ?? [],
      facadeProfiles: spec.facadeProfiles ?? [],
      seed: options.seed,
      quality: wallTextureQuality,
      manifest: options.wallMaterials,
      wallHeightM: spec.defaults.wall_height,
      floorTopY,
      segmentHeights: visualSegmentHeights,
      segmentBaseYs: visualSegmentBaseYs,
    });
    if (isV3) {
      // Boundary segments are collision-backed wall volumes even when a camera
      // sees them obliquely from the nominally outward side. Rendering their
      // material on both faces prevents a valid wall from disappearing while
      // its coping remains visible as an unsupported beam.
      pbrWalls.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.side = DoubleSide;
          material.needsUpdate = true;
        }
      });
    }
    pbrWalls.userData.v3ArchitectureOwnedFrontages = visualWallPlan.architectureOwnedFrontages;
    root.add(pbrWalls);

    if (isV3) {
      const boundaryFinishMaterialId = "ph_stone_trim_sandstone";
      const boundaryFinishMaterial = options.wallMaterials.createStandardMaterial(
        boundaryFinishMaterialId,
        wallTextureQuality,
      );
      boundaryFinishMaterial.userData.materialId = boundaryFinishMaterialId;
      // The finish family is instanced from unit boxes at wildly different
      // scales — a 92 m coping run and a 0.39 x 6.5 m corner pier share one
      // geometry. Without world projection each instance stretched a single
      // 2 m tile across its own box, which squeezed the coursing into vertical
      // streaks on every tall thin member and read as pale straw planking on
      // the piers, gate corners and portal posts. Project in world meters so
      // one course is one course everywhere.
      boundaryFinishMaterial.userData.wallUvProjection = "world";
      applyWallShaderTweaks(boundaryFinishMaterial, {
        albedoBoost:
          typeof boundaryFinishMaterial.userData.wallAlbedoBoost === "number"
          && Number.isFinite(boundaryFinishMaterial.userData.wallAlbedoBoost)
            ? boundaryFinishMaterial.userData.wallAlbedoBoost
            : 1,
        tileSizeM: options.wallMaterials.getTileSizeM(boundaryFinishMaterialId),
        uvOffset: { x: 0, y: 0 },
        floorTopY,
        ...resolveWallShaderProfile(boundaryFinishMaterialId, "detail"),
      });
      const boundaryFinish = createV3BoundaryFinishTrim(
        primaryVisualSegments,
        visualSegmentHeights,
        visualSegmentBaseYs,
        wallThicknessM,
        boundaryFinishMaterial,
        options.seed,
      );
      if (boundaryFinish) root.add(boundaryFinish);
    }

    const customPierSourceIndices = new Set(supportPlans.map((plan) => plan.capSourceIndices[0]));
    const standardEndCaps = supportEndCaps.filter((entry) => !customPierSourceIndices.has(entry.sourceSegmentIndex));
    if (standardEndCaps.length > 0) {
      const endCapWalls = buildPbrWalls({
        ...(spec.formatVersion ? { formatVersion: spec.formatVersion } : {}),
        segments: standardEndCaps.map((entry) => entry.segment),
        sourceSegments: wallSegments,
        segmentSourceIndices: standardEndCaps.map((entry) => entry.sourceSegmentIndex),
        zones: standardEndCaps.map((entry) => entry.renderZone),
        frontages: spec.frontages ?? [],
        facadeProfiles: spec.facadeProfiles ?? [],
        seed: options.seed,
        quality: wallTextureQuality,
        manifest: options.wallMaterials,
        wallHeightM: spec.defaults.wall_height,
        floorTopY,
        segmentHeights: standardEndCaps.map((entry) => segmentHeights[entry.sourceSegmentIndex]!),
        segmentBaseYs: standardEndCaps.map((entry) => segmentBaseYs[entry.sourceSegmentIndex]!),
      });
      endCapWalls.name = "map-pbr-boundary-support-end-caps";
      endCapWalls.userData.sourceSegmentIndices = standardEndCaps.map((entry) => entry.sourceSegmentIndex);
      endCapWalls.userData.adjoiningZoneIds = standardEndCaps.map((entry) => entry.renderZone.id);
      root.add(endCapWalls);
    }

    if (supportPlans.length > 0) {
      const supportSegments = supportPlans.flatMap((plan) => plan.renderSegments);
      const supportSegmentHeights = supportPlans.flatMap((plan) => (
        plan.renderSourceIndices.map((sourceIndex) => segmentHeights[sourceIndex]!)
      ));
      const supportSegmentBaseYs = supportPlans.flatMap((plan) => (
        plan.renderSourceIndices.map((sourceIndex) => segmentBaseYs[sourceIndex]!)
      ));
      const supportWalls = buildPbrWalls({
        ...(spec.formatVersion ? { formatVersion: spec.formatVersion } : {}),
        segments: supportSegments,
        zones: supportPlans.map((plan) => plan.renderZone),
        frontages: spec.frontages ?? [],
        facadeProfiles: spec.facadeProfiles ?? [],
        seed: options.seed,
        quality: wallTextureQuality,
        manifest: options.wallMaterials,
        wallHeightM: spec.defaults.wall_height,
        floorTopY,
        segmentHeights: supportSegmentHeights,
        segmentBaseYs: supportSegmentBaseYs,
      });
      supportWalls.name = "map-pbr-boundary-support-spines";
      supportWalls.userData.visualShellClosures = supportPlans.map((plan) => ({
        id: plan.id,
        sourceSegmentIndex: plan.sourceSegmentIndex,
        capSourceIndices: plan.capSourceIndices,
        sideSourceIndices: plan.sideSourceIndices,
        sourceZoneId: plan.sourceZoneId,
        pocketRect: plan.pocketRect,
        renderSourceIndices: plan.renderSourceIndices,
      }));
      root.add(supportWalls);

      const supportWallMesh = supportWalls.children.find((child): child is Mesh => child instanceof Mesh);
      if (supportWallMesh) {
        const pierModules = planV3BoundarySupportPierModules(
          supportPlans,
          wallSegments,
          segmentHeights,
          segmentBaseYs,
          wallThicknessM,
        );
        if (pierModules.length > 0) {
          const pierMesh = new InstancedMesh(
            new BoxGeometry(1, 1, 1),
            supportWallMesh.material,
            pierModules.length,
          );
          const dummy = new Object3D();
          for (let index = 0; index < pierModules.length; index += 1) {
            const module = pierModules[index]!;
            dummy.position.set(
              (module.min.x + module.max.x) * 0.5,
              (module.min.y + module.max.y) * 0.5,
              (module.min.z + module.max.z) * 0.5,
            );
            dummy.scale.set(
              module.max.x - module.min.x,
              module.max.y - module.min.y,
              module.max.z - module.min.z,
            );
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            pierMesh.setMatrixAt(index, dummy.matrix);
          }
          pierMesh.instanceMatrix.needsUpdate = true;
          pierMesh.name = "map-pbr-boundary-support-solid-limestone-pier";
          pierMesh.castShadow = true;
          pierMesh.receiveShadow = true;
          pierMesh.frustumCulled = true;
          pierMesh.computeBoundingBox();
          pierMesh.computeBoundingSphere();
          pierMesh.userData.visualQa = {
            moduleId: "boundary_support_solid_limestone_pier",
            semanticClass: "structural_closed_pier",
            representation: "module",
            materialMode: "pbr",
            shadowMode: "cast",
          };
          pierMesh.userData.materialRole = "limestone";
          pierMesh.userData.modules = pierModules.map((module) => ({
            sourceSegmentIndex: module.sourceSegmentIndex,
            role: module.role,
            min: module.min,
            max: module.max,
          }));
          supportWalls.add(pierMesh);
        }

        const capSlicesByPlan = supportPlans.map((plan) => ({
          plan,
          slices: planV3BoundarySupportCapSlices(
            plan,
            wallSegments,
            segmentHeights,
            segmentBaseYs,
          ),
        }));
        const capBoxes: Array<{ rect: RuntimeRect; minY: number; maxY: number }> = [];
        let riserCount = 0;
        for (const { plan, slices } of capSlicesByPlan) {
          for (const slice of slices) {
            capBoxes.push({
              rect: resolveV3BoundarySupportCapFootprint(plan, slice),
              minY: slice.topY,
              maxY: slice.topY + VISUAL_SUPPORT_CAP_HEIGHT_M,
            });
          }
          for (let index = 1; index < slices.length; index += 1) {
            const previous = slices[index - 1]!;
            const current = slices[index]!;
            if (Math.abs(previous.topY - current.topY) <= SURFACE_EDGE_EPSILON_M) continue;
            const boundaryCoord = plan.depthAxis === "y"
              ? previous.rect.y + previous.rect.h
              : previous.rect.x + previous.rect.w;
            capBoxes.push({
              rect: plan.depthAxis === "y"
                ? {
                    x: plan.pocketRect.x - VISUAL_SUPPORT_CAP_OUTSET_M,
                    y: boundaryCoord - VISUAL_SUPPORT_CAP_HEIGHT_M * 0.5,
                    w: plan.pocketRect.w + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
                    h: VISUAL_SUPPORT_CAP_HEIGHT_M,
                  }
                : {
                    x: boundaryCoord - VISUAL_SUPPORT_CAP_HEIGHT_M * 0.5,
                    y: plan.pocketRect.y - VISUAL_SUPPORT_CAP_OUTSET_M,
                    w: VISUAL_SUPPORT_CAP_HEIGHT_M,
                    h: plan.pocketRect.h + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
                  },
              minY: Math.min(previous.topY, current.topY),
              maxY: Math.max(previous.topY, current.topY) + VISUAL_SUPPORT_CAP_HEIGHT_M,
            });
            riserCount += 1;
          }
        }
        const capMesh = new InstancedMesh(
          new BoxGeometry(1, 1, 1),
          supportWallMesh.material,
          capBoxes.length,
        );
        const dummy = new Object3D();
        for (let index = 0; index < capBoxes.length; index += 1) {
          const box = capBoxes[index]!;
          dummy.position.set(
            box.rect.x + box.rect.w * 0.5,
            (box.minY + box.maxY) * 0.5,
            box.rect.y + box.rect.h * 0.5,
          );
          dummy.scale.set(
            box.rect.w,
            box.maxY - box.minY,
            box.rect.h,
          );
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          capMesh.setMatrixAt(index, dummy.matrix);
        }
        capMesh.instanceMatrix.needsUpdate = true;
        capMesh.name = "map-pbr-boundary-support-caps";
        capMesh.castShadow = true;
        capMesh.receiveShadow = true;
        capMesh.frustumCulled = true;
        capMesh.computeBoundingBox();
        capMesh.computeBoundingSphere();
        capMesh.userData.visualQa = {
          moduleId: "boundary_support_coping",
          semanticClass: "structural_retaining_cap",
          representation: "module",
          materialMode: "pbr",
          shadowMode: "cast",
        };
        capMesh.userData.capSliceCount = capSlicesByPlan.reduce((sum, entry) => sum + entry.slices.length, 0);
        capMesh.userData.riserCount = riserCount;
        supportWalls.add(capMesh);

        const supportEndCapSourceIndices = new Set(supportPlans.flatMap((plan) => plan.capSourceIndices));
        const copingSourceIndices = [...new Set(supportPlans.flatMap((plan) => plan.renderSourceIndices))]
          .filter((sourceIndex) => !supportEndCapSourceIndices.has(sourceIndex));
        const copingMesh = new InstancedMesh(
          new BoxGeometry(1, 1, 1),
          supportWallMesh.material,
          copingSourceIndices.length,
        );
        for (let index = 0; index < copingSourceIndices.length; index += 1) {
          const sourceIndex = copingSourceIndices[index]!;
          const segment = wallSegments[sourceIndex]!;
          const topY = segmentBaseYs[sourceIndex]! + segmentHeights[sourceIndex]!;
          const lengthM = segment.end - segment.start;
          if (segment.orientation === "vertical") {
            dummy.position.set(
              segment.coord + segment.outward * wallThicknessM * 0.5,
              topY + VISUAL_SUPPORT_CAP_HEIGHT_M * 0.5,
              (segment.start + segment.end) * 0.5,
            );
            dummy.scale.set(
              wallThicknessM + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
              VISUAL_SUPPORT_CAP_HEIGHT_M,
              lengthM + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
            );
          } else {
            dummy.position.set(
              (segment.start + segment.end) * 0.5,
              topY + VISUAL_SUPPORT_CAP_HEIGHT_M * 0.5,
              segment.coord + segment.outward * wallThicknessM * 0.5,
            );
            dummy.scale.set(
              lengthM + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
              VISUAL_SUPPORT_CAP_HEIGHT_M,
              wallThicknessM + VISUAL_SUPPORT_CAP_OUTSET_M * 2,
            );
          }
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          copingMesh.setMatrixAt(index, dummy.matrix);
        }
        copingMesh.instanceMatrix.needsUpdate = true;
        copingMesh.name = "map-pbr-boundary-support-perimeter-coping";
        copingMesh.castShadow = true;
        copingMesh.receiveShadow = true;
        copingMesh.frustumCulled = true;
        copingMesh.computeBoundingBox();
        copingMesh.computeBoundingSphere();
        copingMesh.userData.visualQa = {
          moduleId: "boundary_support_perimeter_coping",
          semanticClass: "structural_retaining_cap",
          representation: "module",
          materialMode: "pbr",
          shadowMode: "cast",
        };
        copingMesh.userData.sourceSegmentIndices = copingSourceIndices;
        supportWalls.add(copingMesh);

        const retainingCurbs = planV3BoundaryRetainingCurbs(
          supportPlans,
          wallSegments,
          traversalSurfaces,
          wallThicknessM,
        );
        if (retainingCurbs.length > 0) {
          const curbMesh = new InstancedMesh(
            new BoxGeometry(1, 1, 1),
            supportWallMesh.material,
            retainingCurbs.length,
          );
          for (let index = 0; index < retainingCurbs.length; index += 1) {
            const curb = retainingCurbs[index]!;
            dummy.position.set(
              curb.rect.x + curb.rect.w * 0.5,
              curb.baseY + curb.heightM * 0.5,
              curb.rect.y + curb.rect.h * 0.5,
            );
            dummy.scale.set(curb.rect.w, curb.heightM, curb.rect.h);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            curbMesh.setMatrixAt(index, dummy.matrix);
          }
          curbMesh.instanceMatrix.needsUpdate = true;
          curbMesh.name = "map-pbr-boundary-support-ramp-curbs";
          curbMesh.castShadow = true;
          curbMesh.receiveShadow = true;
          curbMesh.frustumCulled = true;
          curbMesh.computeBoundingBox();
          curbMesh.computeBoundingSphere();
          curbMesh.userData.visualQa = {
            moduleId: "boundary_support_ramp_curb",
            semanticClass: "structural_retaining_curb",
            representation: "module",
            materialMode: "pbr",
            shadowMode: "cast",
          };
          curbMesh.userData.sourceSegmentIndices = retainingCurbs.map((curb) => curb.sourceSegmentIndex);
          supportWalls.add(curbMesh);
        }
      }
    }
  } else {
    const wallInstances = createWallInstances(
      wallSegments,
      new MeshLambertMaterial({ color: palette.wall }),
      spec.defaults.wall_height,
      wallThicknessM,
      floorTopY,
      segmentHeights,
      segmentBaseYs,
    );
    if (wallInstances) {
      wallInstances.castShadow = true;
      wallInstances.receiveShadow = false;
      root.add(wallInstances);
    }
  }

  if (wallDetailPlacements.instances.length > 0) {
    const detailRoot = buildWallDetailMeshes(wallDetailPlacements.instances, {
      highVis: options.highVis,
      wallMode: options.wallMode,
      wallMaterials: options.wallMaterials,
      quality: wallTextureQuality,
      seed: options.seed,
    });
    root.add(detailRoot);

    if (options.doorModels && wallDetailPlacements.doorModelPlacements.length > 0) {
      const doorRoot = buildDoorModels(
        wallDetailPlacements.doorModelPlacements,
        options.doorModels,
        wallThicknessM,
        options.wallMaterials,
        wallTextureQuality,
        options.seed,
      );
      root.add(doorRoot);
    }
  }

  const facadeModelPlacements = isV3 ? (wallDetailPlacements as V3ArchitectureBuildResult).facadeModelPlacements : [];
  const packBinding = { wallMaterials: options.wallMaterials, quality: wallTextureQuality, seed: options.seed };
  if (options.facadeModels && facadeModelPlacements.length > 0) {
    root.add(buildFacadeModels(facadeModelPlacements, options.facadeModels, packBinding));
  }
  if (options.facadeModels && spec.sectionModels?.length) {
    root.add(buildSectionModels(spec.sectionModels, options.facadeModels, packBinding));
  }

  const decorativePalms = buildDecorativePalms(options.anchors, options.seed, wallTextureQuality);
  if (decorativePalms) {
    root.add(decorativePalms);
  }

  root.add(
    options.wallMode === "pbr" && options.wallMaterials
      ? createPbrBackgroundShells(spec.playable_boundary, options.wallMaterials, wallTextureQuality)
      : createBackgroundShells(spec.playable_boundary),
  );
  root.add(createSurroundTerrain(
    spec.playable_boundary,
    floorTopY,
    options.floorMaterials,
  ));
  if (String(spec.formatVersion).startsWith("3")) {
    const nonWalkableInfill = createNonWalkableInfill(spec.playable_boundary, traversalSurfaces);
    if (nonWalkableInfill) root.add(nonWalkableInfill);
  }

  if (traversalSurfaces.length === 0) {
    colliders.push({
      id: "floor-slab",
      kind: "floor_slab",
      min: {
        x: spec.playable_boundary.x,
        y: -1,
        z: spec.playable_boundary.y,
      },
      max: {
        x: spec.playable_boundary.x + spec.playable_boundary.w,
        y: 0,
        z: spec.playable_boundary.y + spec.playable_boundary.h,
      },
    });
  }

  // ── Perimeter cage walls — hard backstop so enemies/players can't escape the map ──
  {
    const CAGE_T = 0.5;   // thickness in metres
    const maxReachableElevationM = traversalSurfaces.reduce((max, surface) => {
      const surfaceMax = surface.kind === "flat"
        ? surface.elevationM
        : Math.max(surface.startElevationM, surface.endElevationM);
      return Math.max(max, surfaceMax);
    }, 0);
    const CAGE_H = maxReachableElevationM + Math.max(4.0, spec.defaults.wall_height);
    const pbX = spec.playable_boundary.x;
    const pbZ = spec.playable_boundary.y;  // spec stores Z-axis extent in .y
    const pbW = spec.playable_boundary.w;
    const pbD = spec.playable_boundary.h;  // spec stores depth (Z-size) in .h
    colliders.push(
      // South wall
      { id: "cage-S", kind: "wall", min: { x: pbX - CAGE_T, y: 0, z: pbZ - CAGE_T }, max: { x: pbX + pbW + CAGE_T, y: CAGE_H, z: pbZ } },
      // North wall
      { id: "cage-N", kind: "wall", min: { x: pbX - CAGE_T, y: 0, z: pbZ + pbD }, max: { x: pbX + pbW + CAGE_T, y: CAGE_H, z: pbZ + pbD + CAGE_T } },
      // West wall
      { id: "cage-W", kind: "wall", min: { x: pbX - CAGE_T, y: 0, z: pbZ }, max: { x: pbX, y: CAGE_H, z: pbZ + pbD } },
      // East wall
      { id: "cage-E", kind: "wall", min: { x: pbX + pbW, y: 0, z: pbZ }, max: { x: pbX + pbW + CAGE_T, y: CAGE_H, z: pbZ + pbD } },
    );
  }

  return { root, colliders, wallDetailStats: wallDetailPlacements.stats };
}
