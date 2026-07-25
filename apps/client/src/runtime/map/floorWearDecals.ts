import {
  DataTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";
import type { RuntimeBlockoutSpec } from "./types";

const WEAR_ZONE_TYPES = new Set(["spawn_plaza", "main_lane_segment", "side_hall"]);
const MIN_ZONE_AREA_M2 = 68;
const DECAL_LIFT_M = 0.014;

export type FloorWearDecalPlan = {
  zoneId: string;
  x: number;
  z: number;
  widthM: number;
  lengthM: number;
  yawRad: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

function createFloorWearTexture(): DataTexture {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const nx = (u - 0.5) / 0.49;
      const ny = (v - 0.5) / 0.43;
      const radial = Math.hypot(nx, ny);
      const broadMask = 1 - smoothstep(0.54, 1, radial);
      const laneBreakup = 0.72
        + Math.sin(u * 22 + Math.sin(v * 9) * 1.6) * 0.11
        + Math.sin(v * 35 - u * 7) * 0.07;
      const scuff = smoothstep(
        0.34,
        0.7,
        0.5 + Math.sin(u * 31 + v * 13) * 0.24 + Math.sin(v * 17) * 0.12,
      );
      const alpha = clamp(broadMask * laneBreakup * (0.13 + scuff * 0.11), 0, 0.24);
      const offset = (y * size + x) * 4;
      data[offset] = 116;
      data[offset + 1] = 98;
      data[offset + 2] = 76;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.name = "floor-foot-traffic-wear-mask";
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function planFloorWearDecals(
  spec: RuntimeBlockoutSpec,
  seed: number,
): FloorWearDecalPlan[] {
  const plans: FloorWearDecalPlan[] = [];
  const rngRoot = new DeterministicRng(deriveSubSeed(seed, "l3-4w-floor-wear"));

  for (const zone of spec.zones) {
    if (!WEAR_ZONE_TYPES.has(zone.type)) continue;
    const areaM2 = zone.rect.w * zone.rect.h;
    if (areaM2 < MIN_ZONE_AREA_M2) continue;

    const longAlongX = zone.rect.w >= zone.rect.h;
    const longSpan = longAlongX ? zone.rect.w : zone.rect.h;
    const shortSpan = longAlongX ? zone.rect.h : zone.rect.w;
    const zoneRng = rngRoot.fork(zone.id);
    const densityBudget = zone.type === "main_lane_segment" && longSpan >= 16 ? 2 : 1;

    for (let index = 0; index < densityBudget; index += 1) {
      const alongT = densityBudget === 1
        ? zoneRng.range(0.42, 0.58)
        : 0.34 + index * 0.32 + zoneRng.range(-0.045, 0.045);
      const crossOffsetM = zoneRng.range(-shortSpan * 0.09, shortSpan * 0.09);
      const centerX = zone.rect.x + zone.rect.w * 0.5;
      const centerZ = zone.rect.y + zone.rect.h * 0.5;
      const alongOffsetM = (alongT - 0.5) * longSpan;
      plans.push({
        zoneId: zone.id,
        x: centerX + (longAlongX ? alongOffsetM : crossOffsetM),
        z: centerZ + (longAlongX ? crossOffsetM : alongOffsetM),
        widthM: clamp(shortSpan * zoneRng.range(0.15, 0.22), 0.9, 1.8),
        lengthM: clamp(longSpan * zoneRng.range(0.2, 0.3), 2.6, 5.4),
        yawRad: (longAlongX ? Math.PI * 0.5 : 0) + zoneRng.range(-0.055, 0.055),
      });
    }
  }

  return plans;
}

export function buildFloorWearDecals(
  spec: RuntimeBlockoutSpec,
  seed: number,
  floorTopY: number,
): Mesh | null {
  const plans = planFloorWearDecals(spec, seed);
  if (plans.length === 0) return null;

  const geometries: PlaneGeometry[] = [];
  for (const plan of plans) {
    const geometry = new PlaneGeometry(plan.widthM, plan.lengthM, 1, 1);
    geometry.rotateX(-Math.PI * 0.5);
    geometry.rotateY(plan.yawRad);
    geometry.translate(plan.x, floorTopY + DECAL_LIFT_M, plan.z);
    geometries.push(geometry);
  }
  const geometry = mergeGeometries(geometries, false);
  for (const source of geometries) source.dispose();
  if (!geometry) throw new Error("[floor-wear-decals] failed to merge wear quads");

  const material = new MeshStandardMaterial({
    name: "floor-foot-traffic-wear",
    map: createFloorWearTexture(),
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;

  const mesh = new Mesh(geometry, material);
  mesh.name = "map-floor-foot-traffic-wear";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = 1;
  mesh.userData.visualQa = {
    moduleId: "floor_foot_traffic_wear",
    semanticClass: "floor_wear_decal",
    representation: "module",
    materialMode: "pbr",
    shadowMode: "receive_only",
    placementCount: plans.length,
    zoneIds: [...new Set(plans.map((plan) => plan.zoneId))],
  };
  return mesh;
}
