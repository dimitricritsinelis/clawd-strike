import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  NoColorSpace,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  Texture,
  TextureLoader,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { RuntimeAnchor, RuntimeAnchorsSpec } from "./types";
import { designToWorldVec3, designYawDegToWorldYawRad } from "./coordinateTransforms";
import { DeterministicRng } from "../utils/Rng";

type PalmTextureQuality = "1k" | "2k";
type FrondVariantId = "full" | "juvenile" | "torn" | "partial";

type PalmTextureSet = {
  albedo: string;
  normal: string;
  arm: string;
};

type PalmTextureVariants = {
  "1k": PalmTextureSet;
  "2k"?: PalmTextureSet;
};

type FrondGeometryProfile = {
  widthM: number;
  lengthM: number;
  archDepthM: number;
  tipScale: number;
  taperStrength: number;
  droopFactor: number;
};

type FrondVariantConfig = {
  id: FrondVariantId;
  textures: Record<PalmTextureQuality, PalmTextureSet>;
  geometry: FrondGeometryProfile;
  hueRange: readonly [number, number];
  saturationRange: readonly [number, number];
  lightnessRange: readonly [number, number];
};

type FrondLayerConfig = {
  id: "outer" | "mid" | "inner";
  count: number | readonly [number, number];
  variantPool: readonly FrondVariantId[];
  pitchRange: readonly [number, number];
  twistRange: readonly [number, number];
  radialOffsetRange: readonly [number, number];
  heightOffsetRange: readonly [number, number];
  widthScaleRange: readonly [number, number];
  lengthScaleRange: readonly [number, number];
  bendScaleRange: readonly [number, number];
  yawJitterRad: number;
};

const BARK_TEXTURES: PalmTextureVariants = {
  "1k": {
    albedo: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_diff_1k.jpg",
    normal: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_nor_gl_1k.jpg",
    arm: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_arm_1k.jpg",
  },
  "2k": {
    albedo: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_diff_2k.jpg",
    normal: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_nor_gl_2k.jpg",
    arm: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_arm_2k.jpg",
  },
};

const PROJECT_FROND_TEXTURE = "/assets/textures/environment/bazaar/foliage/palms/palm_frond_project_original/palm_frond_diff.png";
const PROJECT_FROND_TEXTURES: Record<PalmTextureQuality, PalmTextureSet> = {
  "1k": {
    albedo: PROJECT_FROND_TEXTURE,
    normal: "/assets/textures/environment/bazaar/foliage/palms/palm_bark/palm_bark_nor_gl_1k.jpg",
    arm: "/assets/textures/environment/bazaar/foliage/palms/palm_bark/palm_bark_arm_1k.jpg",
  },
  "2k": {
    albedo: PROJECT_FROND_TEXTURE,
    normal: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_nor_gl_2k.jpg",
    arm: "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_arm_2k.jpg",
  },
};

const PLANTER_STONE_TEXTURES: PalmTextureVariants = {
  "1k": {
    albedo: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
    normal: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
    arm: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
  },
  "2k": {
    albedo: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_2k.jpg",
    normal: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_2k.jpg",
    arm: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_2k.jpg",
  },
};

const FROND_VARIANTS: Record<FrondVariantId, FrondVariantConfig> = {
  full: {
    id: "full",
    textures: PROJECT_FROND_TEXTURES,
    geometry: {
      widthM: 1.02,
      lengthM: 2.55,
      archDepthM: 0.42,
      tipScale: 0.12,
      taperStrength: 0.7,
      droopFactor: 1.45,
    },
    hueRange: [-0.010, 0.006],
    saturationRange: [-0.04, 0.03],
    lightnessRange: [-0.02, 0.02],
  },
  juvenile: {
    id: "juvenile",
    textures: PROJECT_FROND_TEXTURES,
    geometry: {
      widthM: 0.72,
      lengthM: 2.05,
      archDepthM: 0.28,
      tipScale: 0.08,
      taperStrength: 0.82,
      droopFactor: 1.0,
    },
    hueRange: [-0.016, 0.004],
    saturationRange: [-0.02, 0.04],
    lightnessRange: [0.0, 0.05],
  },
  torn: {
    id: "torn",
    textures: PROJECT_FROND_TEXTURES,
    geometry: {
      widthM: 0.88,
      lengthM: 2.34,
      archDepthM: 0.38,
      tipScale: 0.1,
      taperStrength: 0.76,
      droopFactor: 1.5,
    },
    hueRange: [-0.018, 0.0],
    saturationRange: [-0.08, 0.02],
    lightnessRange: [-0.04, 0.01],
  },
  partial: {
    id: "partial",
    textures: PROJECT_FROND_TEXTURES,
    geometry: {
      widthM: 0.74,
      lengthM: 1.94,
      archDepthM: 0.32,
      tipScale: 0.09,
      taperStrength: 0.8,
      droopFactor: 1.35,
    },
    hueRange: [-0.02, -0.004],
    saturationRange: [-0.1, 0.0],
    lightnessRange: [-0.05, -0.01],
  },
};

const FROND_LAYERS: readonly FrondLayerConfig[] = [
  {
    id: "outer",
    count: 14,
    variantPool: ["full", "full", "torn", "partial", "full", "torn", "full", "partial"],
    pitchRange: [-1.78, -1.5],
    twistRange: [-0.3, 0.3],
    radialOffsetRange: [0.12, 0.24],
    heightOffsetRange: [-0.12, 0.02],
    widthScaleRange: [1.0, 1.16],
    lengthScaleRange: [0.94, 1.08],
    bendScaleRange: [0.9, 1.14],
    yawJitterRad: 0.11,
  },
  {
    id: "mid",
    count: 12,
    variantPool: ["full", "juvenile", "torn", "juvenile", "full", "partial"],
    pitchRange: [-1.5, -1.18],
    twistRange: [-0.24, 0.24],
    radialOffsetRange: [0.06, 0.16],
    heightOffsetRange: [0.0, 0.16],
    widthScaleRange: [0.98, 1.12],
    lengthScaleRange: [0.88, 1.02],
    bendScaleRange: [0.86, 1.04],
    yawJitterRad: 0.16,
  },
  {
    id: "inner",
    count: 10,
    variantPool: ["juvenile", "juvenile", "partial", "juvenile", "full"],
    pitchRange: [-1.05, -0.55],
    twistRange: [-0.18, 0.18],
    radialOffsetRange: [0.0, 0.06],
    heightOffsetRange: [0.12, 0.3],
    widthScaleRange: [0.9, 1.08],
    lengthScaleRange: [0.72, 0.92],
    bendScaleRange: [0.58, 0.84],
    yawJitterRad: 0.2,
  },
];

type PalmInstance = {
  matrix: Matrix4;
  color?: Color;
};

type FrondInstance = PalmInstance & {
  color: Color;
};

type PalmBatches = {
  planterFoot: PalmInstance[];
  planterBody: PalmInstance[];
  planterRim: PalmInstance[];
  planterSoil: PalmInstance[];
  trunks: PalmInstance[];
  trunkCollars: PalmInstance[];
  crownCores: PalmInstance[];
  fronds: Record<FrondVariantId, FrondInstance[]>;
};

const PLANTER_TRUNK_BASE_M = 0.52;
const textureLoader = new TextureLoader();
const textureCache = new Map<string, Texture>();
const trunkMaterialCache = new Map<PalmTextureQuality, MeshStandardMaterial>();
const frondMaterialCache = new Map<PalmTextureQuality, MeshStandardMaterial>();
const planterBodyMaterialCache = new Map<PalmTextureQuality, MeshStandardMaterial>();
const planterCopingMaterialCache = new Map<PalmTextureQuality, MeshStandardMaterial>();
let planterSoilMaterial: MeshStandardMaterial | null = null;
let crownCoreMaterial: MeshStandardMaterial | null = null;

const frondGeometryCache = new Map<FrondVariantId, BufferGeometry>();
let trunkGeometryCache: CylinderGeometry | null = null;
let trunkCollarGeometryCache: CylinderGeometry | null = null;
let planterFootGeometryCache: CylinderGeometry | null = null;
let planterBodyGeometryCache: CylinderGeometry | null = null;
let planterRimGeometryCache: BufferGeometry | null = null;
let planterSoilGeometryCache: CylinderGeometry | null = null;
let crownCoreGeometryCache: SphereGeometry | null = null;

function loadTexture(
  url: string,
  colorSpace: Texture["colorSpace"],
  repeat: Vector2 | null,
): Texture {
  const cacheKey = `${url}|${colorSpace}|${repeat ? `${repeat.x}:${repeat.y}` : "none"}`;
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Unit tests exercise the complete batching contract without a DOM image loader.
  const texture = typeof document === "undefined" ? new Texture() : textureLoader.load(url);
  texture.name = url;
  texture.colorSpace = colorSpace;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.copy(repeat);
  }
  texture.anisotropy = 4;
  textureCache.set(cacheKey, texture);
  return texture;
}

function resolveTextureVariant(variants: PalmTextureVariants, quality: PalmTextureQuality): PalmTextureSet {
  return variants[quality] ?? variants["1k"];
}

function getTrunkMaterial(quality: PalmTextureQuality): MeshStandardMaterial {
  const cached = trunkMaterialCache.get(quality);
  if (cached) {
    return cached;
  }

  // Keep a single, light bark set so courtyard shade cannot turn the trunk into a black pole.
  const textures = resolveTextureVariant(BARK_TEXTURES, quality);
  const repeat = new Vector2(1.35, 5.8);
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    map: loadTexture(textures.albedo, SRGBColorSpace, repeat),
    normalMap: loadTexture(textures.normal, NoColorSpace, repeat),
    normalScale: new Vector2(0.54, 0.54),
    roughnessMap: loadTexture(textures.arm, NoColorSpace, repeat),
    metalnessMap: loadTexture(textures.arm, NoColorSpace, repeat),
    roughness: 0.92,
    metalness: 0,
    emissive: 0x2b1b10,
    emissiveIntensity: 0.17,
  });
  trunkMaterialCache.set(quality, material);
  return material;
}

function getFrondMaterial(quality: PalmTextureQuality): MeshStandardMaterial {
  const cached = frondMaterialCache.get(quality);
  if (cached) {
    return cached;
  }

  const textures = PROJECT_FROND_TEXTURES[quality];
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    map: loadTexture(textures.albedo, SRGBColorSpace, null),
    normalMap: loadTexture(textures.normal, NoColorSpace, null),
    normalScale: new Vector2(0.38, 0.38),
    roughnessMap: loadTexture(textures.arm, NoColorSpace, null),
    metalnessMap: loadTexture(textures.arm, NoColorSpace, null),
    roughness: 0.9,
    metalness: 0,
    emissive: 0x10260d,
    emissiveIntensity: 0.13,
    side: DoubleSide,
    shadowSide: DoubleSide,
    alphaTest: 0.24,
    dithering: true,
  });
  frondMaterialCache.set(quality, material);
  return material;
}

function getPlanterBodyMaterial(quality: PalmTextureQuality): MeshStandardMaterial {
  const cached = planterBodyMaterialCache.get(quality);
  if (cached) {
    return cached;
  }

  const textures = resolveTextureVariant(PLANTER_STONE_TEXTURES, quality);
  const repeat = new Vector2(2.2, 1.35);
  const material = new MeshStandardMaterial({
    color: 0xc6a87c,
    map: loadTexture(textures.albedo, SRGBColorSpace, repeat),
    normalMap: loadTexture(textures.normal, NoColorSpace, repeat),
    normalScale: new Vector2(0.34, 0.34),
    roughnessMap: loadTexture(textures.arm, NoColorSpace, repeat),
    metalnessMap: loadTexture(textures.arm, NoColorSpace, repeat),
    roughness: 0.92,
    metalness: 0,
  });
  planterBodyMaterialCache.set(quality, material);
  return material;
}

function getPlanterCopingMaterial(quality: PalmTextureQuality): MeshStandardMaterial {
  const cached = planterCopingMaterialCache.get(quality);
  if (cached) {
    return cached;
  }

  const textures = resolveTextureVariant(PLANTER_STONE_TEXTURES, quality);
  const repeat = new Vector2(2.8, 0.7);
  const material = new MeshStandardMaterial({
    color: 0xe0c695,
    map: loadTexture(textures.albedo, SRGBColorSpace, repeat),
    normalMap: loadTexture(textures.normal, NoColorSpace, repeat),
    normalScale: new Vector2(0.3, 0.3),
    roughnessMap: loadTexture(textures.arm, NoColorSpace, repeat),
    metalnessMap: loadTexture(textures.arm, NoColorSpace, repeat),
    roughness: 0.88,
    metalness: 0,
  });
  planterCopingMaterialCache.set(quality, material);
  return material;
}

function getPlanterSoilMaterial(): MeshStandardMaterial {
  if (!planterSoilMaterial) {
    planterSoilMaterial = new MeshStandardMaterial({ color: 0x4d3526, roughness: 1.0, metalness: 0.0 });
  }
  return planterSoilMaterial;
}

function getCrownCoreMaterial(): MeshStandardMaterial {
  if (!crownCoreMaterial) {
    crownCoreMaterial = new MeshStandardMaterial({
      color: 0x77663c,
      roughness: 0.96,
      metalness: 0,
      emissive: 0x19210c,
      emissiveIntensity: 0.04,
    });
  }
  return crownCoreMaterial;
}

function createFrondGeometry(profile: FrondGeometryProfile): BufferGeometry {
  const primary = new PlaneGeometry(profile.widthM, profile.lengthM, 4, 10);
  primary.translate(0, profile.lengthM * 0.5, 0);

  const positions = primary.attributes.position;
  if (!positions) {
    return primary;
  }
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const t = Math.max(0, Math.min(1, y / profile.lengthM));
    const taper = Math.max(profile.tipScale, 1 - t * profile.taperStrength);
    const bend = Math.sin(Math.pow(t, 0.92) * Math.PI) * profile.archDepthM;
    const droop = t * t * profile.archDepthM * profile.droopFactor;
    const cup = (x / (profile.widthM * 0.5)) * Math.sin(t * Math.PI) * 0.035;
    positions.setX(index, x * taper);
    positions.setZ(index, bend - droop + cup);
  }
  positions.needsUpdate = true;
  primary.computeVertexNormals();

  // A shallow crossed card keeps the textured rachis visible from player-eye
  // angles without multiplying draw calls or turning the crown into flat stars.
  const secondary = primary.clone();
  primary.rotateY(-0.14);
  secondary.rotateY(0.14);
  const crossed = mergeGeometries([primary, secondary], false);
  primary.dispose();
  secondary.dispose();
  if (!crossed) {
    throw new Error("[decorative-palms] failed to merge crossed frond geometry");
  }
  crossed.computeBoundingBox();
  crossed.computeBoundingSphere();
  return crossed;
}

function getFrondGeometry(variantId: FrondVariantId): BufferGeometry {
  const cached = frondGeometryCache.get(variantId);
  if (cached) {
    return cached;
  }
  const geometry = createFrondGeometry(FROND_VARIANTS[variantId].geometry);
  frondGeometryCache.set(variantId, geometry);
  return geometry;
}

function getTrunkGeometry(): CylinderGeometry {
  if (trunkGeometryCache) {
    return trunkGeometryCache;
  }
  const geometry = new CylinderGeometry(0.67, 1, 1, 12, 14, false);
  const positions = geometry.attributes.position;
  if (!positions) {
    trunkGeometryCache = geometry;
    return geometry;
  }
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const t = y + 0.5;
    const angle = Math.atan2(z, x);
    const irregularity = 1
      + Math.sin(t * Math.PI * 13 + angle * 3) * 0.026
      + Math.sin(t * Math.PI * 5 - angle * 2) * 0.014;
    positions.setX(index, x * irregularity);
    positions.setZ(index, z * irregularity);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  trunkGeometryCache = geometry;
  return geometry;
}

function getTrunkCollarGeometry(): CylinderGeometry {
  trunkCollarGeometryCache ??= new CylinderGeometry(1.04, 1.12, 0.075, 12, 1, true);
  return trunkCollarGeometryCache;
}

function getPlanterFootGeometry(): CylinderGeometry {
  planterFootGeometryCache ??= new CylinderGeometry(0.47, 0.5, 0.1, 8, 1, false);
  return planterFootGeometryCache;
}

function getPlanterBodyGeometry(): CylinderGeometry {
  planterBodyGeometryCache ??= new CylinderGeometry(0.43, 0.47, 0.4, 8, 2, false);
  return planterBodyGeometryCache;
}

function getPlanterRimGeometry(): BufferGeometry {
  if (!planterRimGeometryCache) {
    const ring = new TorusGeometry(0.43, 0.06, 4, 8);
    ring.rotateX(Math.PI * 0.5);
    ring.computeVertexNormals();
    ring.computeBoundingBox();
    ring.computeBoundingSphere();
    planterRimGeometryCache = ring;
  }
  return planterRimGeometryCache;
}

function getPlanterSoilGeometry(): CylinderGeometry {
  planterSoilGeometryCache ??= new CylinderGeometry(0.405, 0.405, 0.055, 16, 1, false);
  return planterSoilGeometryCache;
}

function getCrownCoreGeometry(): SphereGeometry {
  crownCoreGeometryCache ??= new SphereGeometry(0.3, 12, 8);
  return crownCoreGeometryCache;
}

function resolveLayerCount(layer: FrondLayerConfig, rng: DeterministicRng): number {
  if (typeof layer.count === "number") {
    return layer.count;
  }
  return rng.int(layer.count[0], layer.count[1] + 1);
}

function createFrondColor(variantId: FrondVariantId, rng: DeterministicRng): Color {
  const spec = FROND_VARIANTS[variantId];
  return new Color(0xe3e4c8).offsetHSL(
    rng.range(spec.hueRange[0], spec.hueRange[1]),
    rng.range(spec.saturationRange[0], spec.saturationRange[1]),
    rng.range(spec.lightnessRange[0], spec.lightnessRange[1]),
  );
}

function makeBatches(): PalmBatches {
  return {
    planterFoot: [],
    planterBody: [],
    planterRim: [],
    planterSoil: [],
    trunks: [],
    trunkCollars: [],
    crownCores: [],
    fronds: { full: [], juvenile: [], torn: [], partial: [] },
  };
}

function matrixOf(node: Object3D): Matrix4 {
  return node.matrixWorld.clone();
}

function collectPalm(anchor: RuntimeAnchor, seed: number, batches: PalmBatches): void {
  const rng = new DeterministicRng(seed).fork(anchor.id);
  const worldPos = designToWorldVec3(anchor.pos);
  const palmRoot = new Object3D();
  palmRoot.position.set(worldPos.x, Math.max(0, worldPos.y), worldPos.z);
  palmRoot.rotation.y = designYawDegToWorldYawRad(anchor.yawDeg);

  const planterSize = anchor.widthM ?? 1.58;
  const foot = new Object3D();
  foot.position.y = 0.05;
  foot.scale.set(planterSize, 1, planterSize);
  palmRoot.add(foot);

  const body = new Object3D();
  body.position.y = 0.27;
  body.scale.set(planterSize, 1, planterSize);
  palmRoot.add(body);

  const rim = new Object3D();
  rim.position.y = 0.46;
  rim.scale.set(planterSize, 1, planterSize);
  palmRoot.add(rim);

  const soil = new Object3D();
  soil.position.y = 0.475;
  soil.scale.set(planterSize, 1, planterSize);
  palmRoot.add(soil);

  const totalHeight = anchor.heightM ?? 6.8;
  const trunkHeight = Math.max(4.35, totalHeight - 2.65);
  const trunkRadius = rng.range(0.29, 0.325);
  const trunkColor = new Color(0xe0b784).offsetHSL(
    rng.range(-0.012, 0.012),
    rng.range(-0.04, 0.035),
    rng.range(-0.025, 0.025),
  );

  const trunkPivot = new Object3D();
  trunkPivot.position.y = PLANTER_TRUNK_BASE_M;
  trunkPivot.rotation.x = rng.range(-0.018, 0.018);
  trunkPivot.rotation.z = rng.range(-0.022, 0.022);
  palmRoot.add(trunkPivot);

  const trunk = new Object3D();
  trunk.position.y = trunkHeight * 0.5;
  trunk.rotation.y = rng.range(-0.1, 0.1);
  trunk.scale.set(trunkRadius, trunkHeight, trunkRadius);
  trunkPivot.add(trunk);

  const collarCount = Math.max(7, Math.floor(trunkHeight / 0.62));
  const collars: Object3D[] = [];
  for (let index = 0; index < collarCount; index += 1) {
    const collarRng = rng.fork(`collar:${index}`);
    const t = Math.max(0.04, Math.min(0.96, (index + 0.52) / collarCount + collarRng.range(-0.018, 0.018)));
    const collar = new Object3D();
    collar.position.y = trunkHeight * t;
    collar.rotation.y = collarRng.range(-0.28, 0.28);
    const taperedRadius = trunkRadius * (1 - t * 0.31);
    const irregularScale = collarRng.range(0.94, 1.04);
    collar.scale.set(taperedRadius * irregularScale, collarRng.range(0.72, 1.08), taperedRadius / irregularScale);
    trunkPivot.add(collar);
    collars.push(collar);
  }

  const crownRoot = new Object3D();
  crownRoot.position.y = trunkHeight;
  crownRoot.rotation.y = rng.range(0, Math.PI * 2);
  trunkPivot.add(crownRoot);

  const crownCore = new Object3D();
  crownCore.position.y = 0.06;
  crownCore.scale.set(1.0, 1.18, 1.0);
  crownRoot.add(crownCore);

  const frondNodes: Array<{ node: Object3D; variantId: FrondVariantId; color: Color }> = [];
  const crownRng = rng.fork("crown");
  for (const layer of FROND_LAYERS) {
    const layerRng = crownRng.fork(`layer:${layer.id}`);
    const count = resolveLayerCount(layer, layerRng);
    for (let index = 0; index < count; index += 1) {
      const frondRng = layerRng.fork(`frond:${index}`);
      const variantId = layer.variantPool[frondRng.int(0, layer.variantPool.length)] ?? "full";
      const pivot = new Object3D();
      pivot.rotation.y = (index / count) * Math.PI * 2
        + frondRng.range(-layer.yawJitterRad, layer.yawJitterRad);
      pivot.position.y = frondRng.range(layer.heightOffsetRange[0], layer.heightOffsetRange[1]);
      crownRoot.add(pivot);

      const frond = new Object3D();
      frond.rotation.order = "XYZ";
      frond.rotation.x = frondRng.range(layer.pitchRange[0], layer.pitchRange[1]);
      // Roll each broad textured leaf around its rachis so the crown keeps
      // visual volume from any player-eye direction instead of going edge-on.
      frond.rotation.y = frondRng.range(-0.62, 0.62);
      frond.rotation.z = frondRng.range(layer.twistRange[0], layer.twistRange[1]);
      frond.position.z = frondRng.range(layer.radialOffsetRange[0], layer.radialOffsetRange[1]);
      frond.scale.set(
        frondRng.range(layer.widthScaleRange[0], layer.widthScaleRange[1]),
        frondRng.range(layer.lengthScaleRange[0], layer.lengthScaleRange[1]),
        frondRng.range(layer.bendScaleRange[0], layer.bendScaleRange[1]),
      );
      pivot.add(frond);
      frondNodes.push({ node: frond, variantId, color: createFrondColor(variantId, frondRng) });
    }
  }

  palmRoot.updateMatrixWorld(true);
  batches.planterFoot.push({ matrix: matrixOf(foot) });
  batches.planterBody.push({ matrix: matrixOf(body) });
  batches.planterRim.push({ matrix: matrixOf(rim) });
  batches.planterSoil.push({ matrix: matrixOf(soil) });
  batches.trunks.push({ matrix: matrixOf(trunk), color: trunkColor });
  for (const collar of collars) {
    batches.trunkCollars.push({ matrix: matrixOf(collar), color: trunkColor.clone().multiplyScalar(0.82) });
  }
  batches.crownCores.push({ matrix: matrixOf(crownCore) });
  for (const frond of frondNodes) {
    batches.fronds[frond.variantId].push({ matrix: matrixOf(frond.node), color: frond.color });
  }
}

function addInstancedBatch(
  root: Group,
  name: string,
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  instances: PalmInstance[],
  options: { castShadow: boolean; receiveShadow: boolean; semanticClass: string },
): void {
  if (instances.length === 0) {
    return;
  }
  const mesh = new InstancedMesh(geometry, material, instances.length);
  mesh.name = name;
  mesh.castShadow = options.castShadow;
  mesh.receiveShadow = options.receiveShadow;
  mesh.frustumCulled = true;
  mesh.userData.semanticClass = options.semanticClass;
  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index]!;
    mesh.setMatrixAt(index, instance.matrix);
    if (instance.color) {
      mesh.setColorAt(index, instance.color);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  root.add(mesh);
}

function triangleCount(geometry: BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
}

export function buildDecorativePalms(
  anchors: RuntimeAnchorsSpec | null,
  seed: number,
  quality: PalmTextureQuality,
): Group | null {
  if (!anchors) {
    return null;
  }

  const palmAnchors = anchors.anchors
    .filter((anchor) => anchor.type.toLowerCase() === "decorative_palm")
    .sort((left, right) => left.id.localeCompare(right.id));
  if (palmAnchors.length === 0) {
    return null;
  }

  const batches = makeBatches();
  for (const anchor of palmAnchors) {
    collectPalm(anchor, seed, batches);
  }

  const root = new Group();
  root.name = "decorative-palms";
  root.userData.anchorIds = palmAnchors.map((anchor) => anchor.id);
  const planterBodyMaterial = getPlanterBodyMaterial(quality);
  const planterCopingMaterial = getPlanterCopingMaterial(quality);
  addInstancedBatch(root, "decorative-palms-planter-foot", getPlanterFootGeometry(), planterBodyMaterial, batches.planterFoot, {
    castShadow: true,
    receiveShadow: true,
    semanticClass: "planter_base",
  });
  addInstancedBatch(root, "decorative-palms-planter-body", getPlanterBodyGeometry(), planterBodyMaterial, batches.planterBody, {
    castShadow: true,
    receiveShadow: true,
    semanticClass: "planter_body",
  });
  addInstancedBatch(root, "decorative-palms-planter-rim", getPlanterRimGeometry(), planterCopingMaterial, batches.planterRim, {
    castShadow: true,
    receiveShadow: true,
    semanticClass: "planter_rim",
  });
  addInstancedBatch(root, "decorative-palms-planter-soil", getPlanterSoilGeometry(), getPlanterSoilMaterial(), batches.planterSoil, {
    castShadow: false,
    receiveShadow: true,
    semanticClass: "planter_soil",
  });
  addInstancedBatch(root, "decorative-palms-trunks", getTrunkGeometry(), getTrunkMaterial(quality), batches.trunks, {
    castShadow: true,
    receiveShadow: true,
    semanticClass: "palm_trunk",
  });
  addInstancedBatch(root, "decorative-palms-trunk-collars", getTrunkCollarGeometry(), getTrunkMaterial(quality), batches.trunkCollars, {
    castShadow: true,
    receiveShadow: true,
    semanticClass: "palm_trunk_collar",
  });
  addInstancedBatch(root, "decorative-palms-crown-cores", getCrownCoreGeometry(), getCrownCoreMaterial(), batches.crownCores, {
    castShadow: true,
    receiveShadow: true,
    semanticClass: "palm_crown_core",
  });
  for (const variantId of Object.keys(batches.fronds) as FrondVariantId[]) {
    addInstancedBatch(
      root,
      `decorative-palms-fronds-${variantId}`,
      getFrondGeometry(variantId),
      getFrondMaterial(quality),
      batches.fronds[variantId],
      { castShadow: true, receiveShadow: false, semanticClass: "palm_frond" },
    );
  }

  let renderedTriangles = 0;
  for (const child of root.children) {
    if (child instanceof InstancedMesh) {
      renderedTriangles += triangleCount(child.geometry) * child.count;
    }
  }
  root.userData.renderStats = {
    palmCount: palmAnchors.length,
    drawBatches: root.children.length,
    renderedTriangles,
    frondCount: Object.values(batches.fronds).reduce((total, instances) => total + instances.length, 0),
    collarCount: batches.trunkCollars.length,
  };
  return root;
}
