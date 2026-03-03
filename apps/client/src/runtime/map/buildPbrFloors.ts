import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from "three";
import type { FloorMaterialLibrary, FloorTextureQuality } from "../render/materials/FloorMaterialLibrary";
import { applyFloorShaderTweaks } from "../render/materials/applyFloorShaderTweaks";
import { deriveSubSeed } from "../utils/Rng";
import { resolveFloorMaterialIdForZone } from "./floorMaterialAssignment";
import type { RuntimeBlockoutSpec, RuntimeRect } from "./types";

const INCLUDED_ZONE_TYPES = new Set([
  "spawn_plaza",
  "main_lane_segment",
  "side_hall",
  "cut",
  "connector",
]);

export type FloorMaterialId =
  | "large_sandstone_blocks_01"
  | "grey_tiles"
  | "cobblestone_pavement"
  | "cobblestone_color"
  | "sand_01";

const UV_QUARTER_TURNS: 0 | 1 | 2 | 3 = 0;
const UV_OFFSET_U = 0;
const UV_OFFSET_V = 0;

// Width (metres) of the dithering band on each side of a zone boundary.
// Cells whose centre falls within this distance of a zone edge are stochastically
// assigned to either the current zone's material or the neighbour's, producing an
// organic interleave rather than a hard seam.
const TRANSITION_BAND_M = 1.5;

type MaterialBatch = {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
};

type BuildPbrFloorsOptions = {
  seed: number;
  quality: FloorTextureQuality;
  manifest: FloorMaterialLibrary;
  patchSizeM: number;
  floorTopY: number;
};

const MATERIAL_ORDER: FloorMaterialId[] = [
  "large_sandstone_blocks_01",
  "grey_tiles",
  "cobblestone_pavement",
  "cobblestone_color",
  "sand_01",
];

const FLOOR_MACRO_SETTINGS: Record<
  FloorMaterialId,
  { colorAmplitude: number; roughnessAmplitude: number; frequency: number }
> = {
  large_sandstone_blocks_01: {
    colorAmplitude: 0.04,
    roughnessAmplitude: 0.035,
    frequency: 0.035,
  },
  grey_tiles: {
    colorAmplitude: 0.03,
    roughnessAmplitude: 0.025,
    frequency: 0.045,
  },
  cobblestone_pavement: {
    colorAmplitude: 0.04,
    roughnessAmplitude: 0.03,
    frequency: 0.04,
  },
  cobblestone_color: {
    colorAmplitude: 0.035,
    roughnessAmplitude: 0.03,
    frequency: 0.04,
  },
  sand_01: {
    colorAmplitude: 0.06,
    roughnessAmplitude: 0.05,
    frequency: 0.025,
  },
};

// Returns the smallest included zone containing (x, z), or null if none.
function findFloorZoneAtPoint(
  x: number,
  z: number,
  zones: ReadonlyArray<{ readonly id: string; readonly rect: RuntimeRect }>,
): { readonly id: string } | null {
  let winner: { readonly id: string } | null = null;
  let winnerArea = Number.POSITIVE_INFINITY;
  for (const zone of zones) {
    const r = zone.rect;
    if (x < r.x || x > r.x + r.w || z < r.y || z > r.y + r.h) continue;
    const area = r.w * r.h;
    if (area < winnerArea) {
      winnerArea = area;
      winner = zone;
    }
  }
  return winner;
}

// Fast deterministic hash of a cell coordinate pair + seed → float in [0, 1).
// Uses a multiply-xorshift mix; no string allocation per cell.
function cellDitherHash(cellX: number, cellZ: number, seed: number): number {
  let h = ((seed ^ (cellX * 0x9e3779b9)) >>> 0);
  h = ((h ^ (cellZ * 0x6b43a9b5)) >>> 0);
  h = ((h ^ (h >>> 16)) * 0x45d9f3b) >>> 0;
  h = ((h ^ (h >>> 16)) * 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0x100000000;
}

function getBatch(map: Map<FloorMaterialId, MaterialBatch>, materialId: FloorMaterialId): MaterialBatch {
  const existing = map.get(materialId);
  if (existing) return existing;
  const next: MaterialBatch = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    vertexCount: 0,
  };
  map.set(materialId, next);
  return next;
}

function rotateUv(u: number, v: number, quarterTurns: 0 | 1 | 2 | 3): { u: number; v: number } {
  if (quarterTurns === 1) {
    return { u: -v, v: u };
  }
  if (quarterTurns === 2) {
    return { u: -u, v: -v };
  }
  if (quarterTurns === 3) {
    return { u: v, v: -u };
  }
  return { u, v };
}

function pushVertex(batch: MaterialBatch, x: number, y: number, z: number, u: number, v: number): void {
  batch.positions.push(x, y, z);
  batch.normals.push(0, 1, 0);
  batch.uvs.push(u, v);
}

function appendPatchQuad(
  batch: MaterialBatch,
  rect: RuntimeRect,
  y: number,
  tileSizeM: number,
  quarterTurns: 0 | 1 | 2 | 3,
  offsetU: number,
  offsetV: number,
): void {
  const x0 = rect.x;
  const x1 = rect.x + rect.w;
  const z0 = rect.y;
  const z1 = rect.y + rect.h;
  const invTile = 1 / tileSizeM;
  const baseIndex = batch.vertexCount;

  const sampleUv = (x: number, z: number): { u: number; v: number } => {
    const baseU = x * invTile;
    const baseV = z * invTile;
    const rotated = rotateUv(baseU, baseV, quarterTurns);
    return {
      u: rotated.u + offsetU,
      v: rotated.v + offsetV,
    };
  };

  const uv0 = sampleUv(x0, z0);
  const uv1 = sampleUv(x1, z0);
  const uv2 = sampleUv(x1, z1);
  const uv3 = sampleUv(x0, z1);

  pushVertex(batch, x0, y, z0, uv0.u, uv0.v);
  pushVertex(batch, x1, y, z0, uv1.u, uv1.v);
  pushVertex(batch, x1, y, z1, uv2.u, uv2.v);
  pushVertex(batch, x0, y, z1, uv3.u, uv3.v);

  batch.indices.push(
    baseIndex,
    baseIndex + 2,
    baseIndex + 1,
    baseIndex,
    baseIndex + 3,
    baseIndex + 2,
  );

  batch.vertexCount += 4;
}

function intersectRect(a: RuntimeRect, b: RuntimeRect): RuntimeRect | null {
  const minX = Math.max(a.x, b.x);
  const maxX = Math.min(a.x + a.w, b.x + b.w);
  const minZ = Math.max(a.y, b.y);
  const maxZ = Math.min(a.y + a.h, b.y + b.h);
  const width = maxX - minX;
  const height = maxZ - minZ;
  if (width <= 1e-6 || height <= 1e-6) return null;
  return {
    x: minX,
    y: minZ,
    w: width,
    h: height,
  };
}

function finalizeGeometry(batch: MaterialBatch): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(batch.positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(batch.normals, 3));

  const uv = new Float32BufferAttribute(batch.uvs, 2);
  geometry.setAttribute("uv", uv);
  geometry.setAttribute("uv2", new Float32BufferAttribute([...batch.uvs], 2));

  geometry.setIndex(batch.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function warnOnIncludedZoneOverlaps(spec: RuntimeBlockoutSpec, epsilonAreaM2 = 1e-4): void {
  const includedZones = spec.zones.filter((zone) => INCLUDED_ZONE_TYPES.has(zone.type));
  const overlaps: string[] = [];

  for (let i = 0; i < includedZones.length; i += 1) {
    const a = includedZones[i]!;
    for (let j = i + 1; j < includedZones.length; j += 1) {
      const b = includedZones[j]!;
      const overlap = intersectRect(a.rect, b.rect);
      if (!overlap) continue;
      const overlapAreaM2 = overlap.w * overlap.h;
      if (overlapAreaM2 <= epsilonAreaM2) continue;
      overlaps.push(`${a.id} (${a.type}) <-> ${b.id} (${b.type}): ${overlapAreaM2.toFixed(3)}m^2`);
    }
  }

  if (overlaps.length > 0) {
    console.warn(
      `[buildPbrFloors] Overlapping included floor zones detected (${overlaps.length}): ${overlaps.join(" | ")}`,
    );
  }
}

export function buildPbrFloors(spec: RuntimeBlockoutSpec, opts: BuildPbrFloorsOptions): Group {
  const root = new Group();
  root.name = "map-pbr-floors";

  warnOnIncludedZoneOverlaps(spec);

  const batches = new Map<FloorMaterialId, MaterialBatch>();
  const patchSizeM = Math.max(0.25, opts.patchSizeM);
  const gridOriginX = spec.playable_boundary.x;
  const gridOriginZ = spec.playable_boundary.y;

  // Pre-filter once; reused by boundary neighbour lookups.
  const includedZones = spec.zones.filter((z) => INCLUDED_ZONE_TYPES.has(z.type));

  for (const zone of includedZones) {
    const materialId = resolveFloorMaterialIdForZone(zone.id);
    const tileSizeM = opts.manifest.getTileSizeM(materialId);
    const rect = zone.rect;
    const cellXStart = Math.floor((rect.x - gridOriginX) / patchSizeM);
    const cellXEnd = Math.ceil((rect.x + rect.w - gridOriginX) / patchSizeM) - 1;
    const cellZStart = Math.floor((rect.y - gridOriginZ) / patchSizeM);
    const cellZEnd = Math.ceil((rect.y + rect.h - gridOriginZ) / patchSizeM) - 1;

    for (let cellZ = cellZStart; cellZ <= cellZEnd; cellZ += 1) {
      for (let cellX = cellXStart; cellX <= cellXEnd; cellX += 1) {
        const cellRect: RuntimeRect = {
          x: gridOriginX + cellX * patchSizeM,
          y: gridOriginZ + cellZ * patchSizeM,
          w: patchSizeM,
          h: patchSizeM,
        };
        const patchRect = intersectRect(rect, cellRect);
        if (!patchRect) continue;

        // ── Boundary dithering ──────────────────────────────────────────────
        // Distance from cell centre to the nearest edge of this zone's AABB.
        const cellCenterX = gridOriginX + (cellX + 0.5) * patchSizeM;
        const cellCenterZ = gridOriginZ + (cellZ + 0.5) * patchSizeM;
        const distLeft   = cellCenterX - rect.x;
        const distRight  = (rect.x + rect.w) - cellCenterX;
        const distTop    = cellCenterZ - rect.y;
        const distBottom = (rect.y + rect.h) - cellCenterZ;
        const distToEdge = Math.min(distLeft, distRight, distTop, distBottom);

        let activeMaterialId: FloorMaterialId = materialId;
        let activeTileSizeM = tileSizeM;

        if (distToEdge < TRANSITION_BAND_M) {
          // Probe just past the nearest edge to find the neighbouring zone.
          const probeStep = 0.02;
          let probeX = cellCenterX;
          let probeZ = cellCenterZ;
          if      (distToEdge === distLeft)   probeX = rect.x - probeStep;
          else if (distToEdge === distRight)  probeX = rect.x + rect.w + probeStep;
          else if (distToEdge === distTop)    probeZ = rect.y - probeStep;
          else                                probeZ = rect.y + rect.h + probeStep;

          const neighbor = findFloorZoneAtPoint(probeX, probeZ, includedZones);
          if (neighbor !== null && neighbor.id !== zone.id) {
            const neighborMat = resolveFloorMaterialIdForZone(neighbor.id);
            if (neighborMat !== materialId) {
              // weight → 0 at zone edge (fully neighbour), 1 at full band (own material).
              const weight = distToEdge / TRANSITION_BAND_M;
              if (cellDitherHash(cellX, cellZ, opts.seed) > weight) {
                activeMaterialId = neighborMat;
                activeTileSizeM = opts.manifest.getTileSizeM(neighborMat);
              }
            }
          }
        }
        // ───────────────────────────────────────────────────────────────────

        appendPatchQuad(
          getBatch(batches, activeMaterialId),
          patchRect,
          opts.floorTopY,
          activeTileSizeM,
          UV_QUARTER_TURNS,
          UV_OFFSET_U,
          UV_OFFSET_V,
        );
      }
    }
  }

  for (const materialId of MATERIAL_ORDER) {
    const batch = batches.get(materialId);
    if (!batch || batch.vertexCount === 0) continue;

    const geometry = finalizeGeometry(batch);
    const material = opts.manifest.createStandardMaterial(materialId, opts.quality);
    material.name = `floor-${materialId}-${opts.quality}`;
    const albedoBoost =
      typeof material.userData.floorAlbedoBoost === "number" && Number.isFinite(material.userData.floorAlbedoBoost)
        ? material.userData.floorAlbedoBoost
        : 1;
    const albedoGamma =
      typeof material.userData.floorAlbedoGamma === "number" && Number.isFinite(material.userData.floorAlbedoGamma)
        ? material.userData.floorAlbedoGamma
        : 1;
    const dustStrength =
      typeof material.userData.floorDustStrength === "number" && Number.isFinite(material.userData.floorDustStrength)
        ? material.userData.floorDustStrength
        : 0;
    const macro = FLOOR_MACRO_SETTINGS[materialId];
    applyFloorShaderTweaks(material, {
      albedoBoost,
      albedoGamma,
      dustStrength,
      macroColorAmplitude: macro.colorAmplitude,
      macroRoughnessAmplitude: macro.roughnessAmplitude,
      macroFrequency: macro.frequency,
      macroSeed: deriveSubSeed(opts.seed, `floor-macro:${materialId}`),
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = `floor-${materialId}`;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  return root;
}
