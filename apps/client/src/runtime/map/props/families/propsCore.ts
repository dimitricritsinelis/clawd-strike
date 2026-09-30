import { clamp } from "../../../utils/math";
import {
  BoxGeometry,
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const BAZAAR_STRIPED_CLOTH_TEXTURE_URL = "/assets/textures/environment/bazaar/textiles/project_original/canopy_stripe_albedo_v1.jpg";

export type InstanceSpec = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  yawRad: number;
  tintHex?: number;
  visualQa?: {
    placementId: string;
    anchorId: string;
    assetId: string;
    moduleId: string;
    semanticClass: string;
    representation: "module";
    materialMode: "pbr";
    groundedGapM: number;
    dimensions: { x: number; y: number; z: number };
    shadowMode: "cast_receive" | "cast_only" | "receive_only" | "none";
  };
};

export type PropPlacementKind =
  | "shopfront"
  | "signage"
  | "cover"
  | "spawnCover"
  | "serviceDoor"
  | "thresholdRug"
  | "canopy"
  | "heroPillar"
  | "heroLintel"
  | "landmarkWell"
  | "fountainStone"
  | "fountainTile"
  | "fountainWater"
  | "landmarkCart"
  | "lantern"
  | "produce"
  | "filler";

export type InstanceBatch = {
  id: string;
  color: number;
  kind: PropPlacementKind;
  createGeometry: () => BufferGeometry;
  castShadow: boolean;
  receiveShadow: boolean;
  doubleSided: boolean;
  textureUrl: string | null;
  normalTextureUrl: string | null;
  armTextureUrl: string | null;
  textureRepeat: readonly [number, number];
  textureGenerator: "glazed-fountain-tile" | "prop-ground-contact" | null;
  materialId: string | null;
  materialStyle: "standard" | "water";
  roughness: number;
  metalness: number;
  normalScale: number;
  albedoBoost: number;
  vertexColors: boolean;
  instances: InstanceSpec[];
};

export function createBatch(
  id: string,
  color: number,
  kind: PropPlacementKind,
  createGeometry: () => BufferGeometry,
  render: {
    castShadow?: boolean;
    receiveShadow?: boolean;
    doubleSided?: boolean;
    textureUrl?: string;
    normalTextureUrl?: string;
    armTextureUrl?: string;
    textureRepeat?: readonly [number, number];
    textureGenerator?: "glazed-fountain-tile" | "prop-ground-contact";
    materialId?: string;
    materialStyle?: "standard" | "water";
    roughness?: number;
    metalness?: number;
    normalScale?: number;
    albedoBoost?: number;
    vertexColors?: boolean;
  } = {},
): InstanceBatch {
  return {
    id,
    color,
    kind,
    createGeometry,
    castShadow: render.castShadow ?? false,
    receiveShadow: render.receiveShadow ?? true,
    doubleSided: render.doubleSided ?? false,
    textureUrl: render.textureUrl ?? null,
    normalTextureUrl: render.normalTextureUrl ?? null,
    armTextureUrl: render.armTextureUrl ?? null,
    textureRepeat: render.textureRepeat ?? [1, 1],
    textureGenerator: render.textureGenerator ?? null,
    materialId: render.materialId ?? null,
    materialStyle: render.materialStyle ?? "standard",
    roughness: render.roughness ?? 0.78,
    metalness: render.metalness ?? 0,
    normalScale: render.normalScale ?? 1,
    albedoBoost: render.albedoBoost ?? 1,
    vertexColors: render.vertexColors ?? false,
    instances: [],
  };
}

export function mergeProceduralGeometry(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) {
    part.dispose();
  }
  if (!merged) {
    throw new Error("[map-props] failed to merge procedural geometry");
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function boxPart(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): BoxGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(x, y, z);
  return geometry;
}

export function angledBoxPart(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rollRad: number,
): BoxGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.rotateZ(rollRad);
  geometry.translate(x, y, z);
  return geometry;
}

function applyGeometryTint(
  geometry: BufferGeometry,
  tint: readonly [number, number, number],
): void {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    colors[index * 3] = tint[0];
    colors[index * 3 + 1] = tint[1];
    colors[index * 3 + 2] = tint[2];
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

export function tintGeometry<T extends BufferGeometry>(
  geometry: T,
  tint: readonly [number, number, number],
): T {
  applyGeometryTint(geometry, tint);
  return geometry;
}

function createSolidTexture(color: readonly [number, number, number, number]): DataTexture {
  const texture = new DataTexture(new Uint8Array(color), 1, 1, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

// Many prop batches tile the same image with different repeat vectors. Cache
// the first Texture per (role, url) and hand out clones: clones share the
// underlying image Source, so each file is fetched, decoded, and uploaded to
// the GPU once instead of once per batch, while repeat stays per-batch.
const tiledTextureCache = new Map<string, Texture>();

export function loadTiledTexture(
  url: string,
  repeat: readonly [number, number],
  role: "color" | "normal" | "arm" = "color",
) {
  const cacheKey = `${role}:${url}`;
  const cached = tiledTextureCache.get(cacheKey);
  let texture: Texture;
  if (cached) {
    texture = cached.clone();
  } else {
    texture = typeof document === "undefined"
      ? role === "normal"
        ? createSolidTexture([128, 128, 255, 255])
        : role === "arm"
          ? createSolidTexture([255, 242, 0, 255])
          : createStripedTexture([0xc8b892, 0xdfd2b8])
      : new TextureLoader().load(url);
    tiledTextureCache.set(cacheKey, texture);
  }
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.name = url;
  if (role === "color") texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createStripedTexture(colors: readonly [number, number]): DataTexture {
  const width = 8;
  const height = 8;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = colors[Math.floor(x / 2) % 2]!;
      const offset = (y * width + x) * 4;
      data[offset] = (color >> 16) & 0xff;
      data[offset + 1] = (color >> 8) & 0xff;
      data[offset + 2] = color & 0xff;
      data[offset + 3] = 0xff;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createGlazedFountainTileTexture(): DataTexture {
  const width = 96;
  const height = 96;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const broadMottle = Math.sin(x * 0.21 + y * 0.08) * 9 + Math.cos(y * 0.27 - x * 0.05) * 7;
      const fineGlaze = ((x * 37 + y * 61 + x * y * 3) % 19) - 9;
      const pooledEdge = Math.min(x, y, width - 1 - x, height - 1 - y) < 3 ? -12 : 0;
      data[offset] = clamp(Math.round(92 + broadMottle + fineGlaze * 0.35 + pooledEdge), 0, 255);
      data[offset + 1] = clamp(Math.round(177 + broadMottle * 1.25 + fineGlaze * 0.7 + pooledEdge), 0, 255);
      data[offset + 2] = clamp(Math.round(184 + broadMottle * 1.35 + fineGlaze * 0.85 + pooledEdge), 0, 255);
      data[offset + 3] = 0xff;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
