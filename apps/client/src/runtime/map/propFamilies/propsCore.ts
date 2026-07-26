import {
  BoxGeometry,
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
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
  pitchRad?: number;
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
  stripeColors: readonly [number, number] | null;
  textureUrl: string | null;
  normalTextureUrl: string | null;
  armTextureUrl: string | null;
  textureRepeat: readonly [number, number];
  textureGenerator: "painted-wood-sign-a" | "painted-wood-sign-b" | "painted-wood-sign-c" | "glazed-fountain-tile" | "prop-ground-contact" | null;
  materialId: string | null;
  materialStyle: "standard" | "water";
  roughness: number;
  metalness: number;
  normalScale: number;
  albedoBoost: number;
  emissiveIntensity: number;
  vertexColors: boolean;
  instances: InstanceSpec[];
};

export type PropPlacement = {
  id: string;
  anchorId: string;
  kind: PropPlacementKind;
  transform: InstanceSpec;
  colliderDims: { x: number; y: number; z: number } | null;
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
    textureGenerator?: "painted-wood-sign-a" | "painted-wood-sign-b" | "painted-wood-sign-c" | "glazed-fountain-tile" | "prop-ground-contact";
    materialId?: string;
    materialStyle?: "standard" | "water";
    roughness?: number;
    metalness?: number;
    normalScale?: number;
    albedoBoost?: number;
    emissiveIntensity?: number;
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
    stripeColors: null,
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
    emissiveIntensity: render.emissiveIntensity ?? 0,
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

export function applyGeometryTint(
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createSolidTexture(color: readonly [number, number, number, number]): DataTexture {
  const texture = new DataTexture(new Uint8Array(color), 1, 1, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export function loadTiledTexture(
  url: string,
  repeat: readonly [number, number],
  role: "color" | "normal" | "arm" = "color",
) {
  const texture = typeof document === "undefined"
    ? role === "normal"
      ? createSolidTexture([128, 128, 255, 255])
      : role === "arm"
        ? createSolidTexture([255, 242, 0, 255])
        : createStripedTexture([0xc8b892, 0xdfd2b8])
    : new TextureLoader().load(url);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.name = url;
  if (role === "color") texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createStripedTexture(colors: readonly [number, number]): DataTexture {
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

export function createPaintedWoodSignTexture(variant: "a" | "b" | "c"): DataTexture {
  const width = 192;
  const height = 72;
  const data = new Uint8Array(width * height * 4);

  // These are painted merchant emblems, not faux writing. Keeping the motif
  // symmetric and heraldic makes it readable at combat distance without
  // suggesting a language that the low-resolution procedural texture cannot
  // represent faithfully.
  const field = variant === "a" ? [112, 55, 34] : variant === "b" ? [39, 96, 85] : [73, 61, 103];
  const exposedWood = variant === "a" ? [78, 45, 28] : variant === "b" ? [65, 51, 35] : [66, 49, 43];
  const frame = variant === "a" ? [194, 143, 78] : variant === "b" ? [191, 151, 91] : [201, 158, 87];
  const emblem = variant === "a" ? [232, 203, 140] : variant === "b" ? [226, 198, 132] : [235, 205, 137];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const v = (y + 0.5) / height;
      const grain = Math.sin(u * 91 + Math.sin(v * 11) * 1.7) * 3.2
        + Math.sin(u * 23 + v * 8) * 1.8;
      let red = field[0]! + grain;
      let green = field[1]! + grain * 0.72;
      let blue = field[2]! + grain * 0.48;

      const outerFrame = u < 0.032 || u > 0.968 || v < 0.075 || v > 0.925;
      const innerFrame = (
        ((u > 0.055 && u < 0.068) || (u > 0.932 && u < 0.945)) && v > 0.12 && v < 0.88
      ) || (
        ((v > 0.12 && v < 0.145) || (v > 0.855 && v < 0.88)) && u > 0.055 && u < 0.945
      );
      if (outerFrame || innerFrame) {
        const frameShade = outerFrame ? 0.78 : 1;
        red = frame[0]! * frameShade;
        green = frame[1]! * frameShade;
        blue = frame[2]! * frameShade;
      } else {
        const medallionX = (u - 0.5) / 0.085;
        const medallionY = (v - 0.5) / 0.255;
        const medallionRadius = Math.hypot(medallionX, medallionY);
        const medallionAngle = Math.atan2(medallionY, medallionX);
        const pointCount = variant === "a" ? 8 : variant === "b" ? 6 : 10;
        const starRadius = 0.56 + Math.cos(medallionAngle * pointCount) * 0.15;
        const medallionRing = Math.abs(medallionRadius - 0.91) < 0.1;
        const medallionCore = medallionRadius < starRadius;
        const leftDiamond = Math.abs(u - 0.25) / 0.035 + Math.abs(v - 0.5) / 0.12 < 1;
        const rightDiamond = Math.abs(u - 0.75) / 0.035 + Math.abs(v - 0.5) / 0.12 < 1;
        const horizontalRule = Math.abs(v - 0.5) < 0.018
          && ((u > 0.29 && u < 0.39) || (u > 0.61 && u < 0.71));
        const paintedMotif = medallionRing || medallionCore || leftDiamond || rightDiamond || horizontalRule;
        if (paintedMotif) {
          red = emblem[0]!;
          green = emblem[1]!;
          blue = emblem[2]!;
        } else {
          const wearSignal = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const wear = wearSignal - Math.floor(wearSignal);
          if (wear > 0.992 || (Math.abs(v - 0.31) < 0.008 && u > 0.15 && u < 0.22)) {
            red = red * 0.52 + exposedWood[0]! * 0.48;
            green = green * 0.52 + exposedWood[1]! * 0.48;
            blue = blue * 0.52 + exposedWood[2]! * 0.48;
          }
        }
      }

      // Weathering is coherent at board scale rather than pixel speckle: sun
      // bleaching rolls down from the upper edge, paint feathers away around
      // the perimeter, and one broad scrape exposes the timber substrate.
      const edgeDistance = Math.min(u, 1 - u, v, 1 - v);
      const edgeBreakup = 0.72 + Math.sin(Math.min(u, 1 - u) * 41 + v * 17) * 0.16;
      const edgeWear = clamp((0.085 - edgeDistance) / 0.085, 0, 1) * edgeBreakup;
      const sunFade = clamp((0.68 - v) / 0.68, 0, 1)
        * (0.045 + Math.sin(u * 8.5 + v * 3.2) * 0.012);
      const scrapeCenterU = variant === "a" ? 0.17 : variant === "b" ? 0.82 : 0.14;
      const scrapeU = (u - scrapeCenterU) / 0.12;
      const scrapeV = (v - 0.72) / 0.095;
      const scrape = clamp(1 - Math.hypot(scrapeU, scrapeV), 0, 1)
        * (0.48 + Math.sin(u * 37 + v * 29) * 0.18);
      const exposedAmount = clamp(edgeWear * 0.46 + scrape * 0.32, 0, 0.56);
      red = red * (1 - exposedAmount) + exposedWood[0]! * exposedAmount;
      green = green * (1 - exposedAmount) + exposedWood[1]! * exposedAmount;
      blue = blue * (1 - exposedAmount) + exposedWood[2]! * exposedAmount;
      const fadedLuma = red * 0.34 + green * 0.48 + blue * 0.18;
      red = red * (1 - sunFade) + fadedLuma * sunFade;
      green = green * (1 - sunFade) + fadedLuma * sunFade;
      blue = blue * (1 - sunFade) + fadedLuma * sunFade;

      const offset = (y * width + x) * 4;
      data[offset] = clamp(Math.round(red), 0, 255);
      data[offset + 1] = clamp(Math.round(green), 0, 255);
      data[offset + 2] = clamp(Math.round(blue), 0, 255);
      data[offset + 3] = 0xff;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
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
