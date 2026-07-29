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
  // The joint web and grain below need enough texels to survive on a lane-scale
  // quad; at 96 they alias back into the low-frequency blob they replace.
  const size = 256;
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
      // Feet polish a narrow track down the middle of the patch and push the
      // loose grit out to its shoulders, so the core has to read darker than
      // the broad mask alone would make it.
      const trackCore = 1 - smoothstep(0.1, 0.62, Math.abs(nx));
      // Grime collects in the joints between paving stones and wears off their
      // crowns. Without this the mask is a pure low-frequency blob that crosses
      // stone faces mid-stone and reads as a smudge on the lens.
      const stoneField = Math.sin(u * Math.PI * 7.3 + Math.sin(v * Math.PI * 5.1) * 1.7)
        * Math.sin(v * Math.PI * 6.7 - Math.sin(u * Math.PI * 4.3) * 1.3);
      const jointMask = 0.5 + 0.5 * smoothstep(0.62, 0.03, Math.abs(stoneField));
      const grain = 0.85 + 0.15 * Math.sin(u * Math.PI * 61 + v * Math.PI * 47);
      const alpha = clamp(
        broadMask * laneBreakup * jointMask * grain * (0.3 + scuff * 0.22 + trackCore * 0.32),
        0,
        0.6,
      );
      const offset = (y * size + x) * 4;
      data[offset] = Math.round(112 - trackCore * 18);
      data[offset + 1] = Math.round(95 - trackCore * 15);
      data[offset + 2] = Math.round(74 - trackCore * 12);
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
    // A long lane earns a chain of overlapping patches rather than two isolated
    // smudges: foot traffic wears one continuous desire-line down a street, and
    // a gap in that line reads as fresh paving nobody has ever walked on.
    const densityBudget = zone.type === "main_lane_segment" && longSpan >= 16 ? 4 : 1;

    for (let index = 0; index < densityBudget; index += 1) {
      const alongT = densityBudget === 1
        ? zoneRng.range(0.42, 0.58)
        : 0.19 + index * (0.62 / (densityBudget - 1)) + zoneRng.range(-0.035, 0.035);
      // The line wanders, but it stays near the middle of the walked width.
      const crossOffsetM = zoneRng.range(-shortSpan * 0.07, shortSpan * 0.07);
      const centerX = zone.rect.x + zone.rect.w * 0.5;
      const centerZ = zone.rect.y + zone.rect.h * 0.5;
      const alongOffsetM = (alongT - 0.5) * longSpan;
      plans.push({
        zoneId: zone.id,
        x: centerX + (longAlongX ? alongOffsetM : crossOffsetM),
        z: centerZ + (longAlongX ? crossOffsetM : alongOffsetM),
        widthM: clamp(shortSpan * zoneRng.range(0.26, 0.38), 1.5, 3.4),
        lengthM: clamp(longSpan * zoneRng.range(0.26, 0.38), 4, 8.5),
        yawRad: (longAlongX ? Math.PI * 0.5 : 0) + zoneRng.range(-0.055, 0.055),
      });
    }

    if (densityBudget === 1) continue;

    // A zone boundary is the busiest strip of floor on the route: every player
    // crossing between two districts walks it. Planning wear per zone leaves
    // exactly that strip clean, so the threshold between two districts ends up
    // the freshest paving on the map.
    //
    // These patches straddle all four edges rather than only the ends of the
    // longer side. A court is very nearly square, so "the longer side" is a
    // coin flip that has nothing to do with which way the route runs through
    // it — picking it sends the wear to the two edges a player never crosses.
    // An edge that turns out to be a wall rather than a junction still gets
    // walked along, so the patch is never wrong, only less earned.
    const thresholdRng = zoneRng.fork("district-thresholds");
    for (const axisAlongX of [true, false] as const) {
      const edgeSpan = axisAlongX ? zone.rect.w : zone.rect.h;
      const crossSpan = axisAlongX ? zone.rect.h : zone.rect.w;
      for (const endSign of [-1, 1] as const) {
        const alongOffsetM = endSign * edgeSpan * 0.5;
        const crossOffsetM = thresholdRng.range(-crossSpan * 0.05, crossSpan * 0.05);
        const centerX = zone.rect.x + zone.rect.w * 0.5;
        const centerZ = zone.rect.y + zone.rect.h * 0.5;
        plans.push({
          zoneId: zone.id,
          x: centerX + (axisAlongX ? alongOffsetM : crossOffsetM),
          z: centerZ + (axisAlongX ? crossOffsetM : alongOffsetM),
          widthM: clamp(crossSpan * thresholdRng.range(0.3, 0.42), 1.8, 3.8),
          lengthM: clamp(edgeSpan * thresholdRng.range(0.16, 0.24), 2.6, 5.5),
          yawRad: (axisAlongX ? Math.PI * 0.5 : 0) + thresholdRng.range(-0.04, 0.04),
        });
      }
    }

    // Sweepings and wind-blown grit bank against the frontages, where nobody
    // walks. The wall-base sand band is authored against the wall plane and is
    // hidden behind projecting shopfronts, so the lane needs its own edge
    // condition drawn on the floor itself or the paving reads freshly swept.
    const edgeRng = zoneRng.fork("frontage-edges");
    const edgeCount = 3;
    for (const edgeSide of [-1, 1] as const) {
      for (let index = 0; index < edgeCount; index += 1) {
        const alongT = 0.2 + index * (0.6 / (edgeCount - 1)) + edgeRng.range(-0.05, 0.05);
        const alongOffsetM = (alongT - 0.5) * longSpan;
        const crossOffsetM = edgeSide * (shortSpan * 0.5 - edgeRng.range(0.85, 1.35));
        const centerX = zone.rect.x + zone.rect.w * 0.5;
        const centerZ = zone.rect.y + zone.rect.h * 0.5;
        plans.push({
          zoneId: zone.id,
          x: centerX + (longAlongX ? alongOffsetM : crossOffsetM),
          z: centerZ + (longAlongX ? crossOffsetM : alongOffsetM),
          widthM: clamp(shortSpan * edgeRng.range(0.14, 0.2), 1.1, 2.2),
          lengthM: clamp(longSpan * edgeRng.range(0.3, 0.42), 4.5, 9.5),
          yawRad: (longAlongX ? Math.PI * 0.5 : 0) + edgeRng.range(-0.04, 0.04),
        });
      }
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
