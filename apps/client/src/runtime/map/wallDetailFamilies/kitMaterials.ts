import {
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { resolveBlockoutPalette } from "../../render/BlockoutMaterials";
import type {
  WallMaterialLibrary,
  WallTextureQuality,
} from "../../render/materials/WallMaterialLibrary";
import { applyWallShaderTweaks } from "../../render/materials/applyWallShaderTweaks";
import { applyWindowGlassShaderTweaks } from "../../render/materials/applyWindowGlassShaderTweaks";
import { DeterministicRng, deriveSubSeed } from "../../utils/Rng";
import { BAZAAR_STRIPED_CLOTH_TEXTURE_URL } from "../propFamilies/propsCore";
import { loadTemplateTexture } from "./windows";
import type { WallDetailMeshId } from "./kitCore";

type RoofMaterialShader = Parameters<NonNullable<MeshStandardMaterial["onBeforeCompile"]>>[0];

export type KitPbrMaterialOptions = {
  wallMaterials: WallMaterialLibrary;
  quality: WallTextureQuality;
  seed: number;
};

export type KitMappedMaterialRecipe = {
  materialId: string;
  tintHex: number;
  roughness: number;
  metalness: number;
  albedoBoost?: number;
  macroColorAmplitude?: number;
  macroRoughnessAmplitude?: number;
  vertexColors?: boolean;
  emissiveHex?: number;
  emissiveIntensity?: number;
  dirtEnabled?: boolean;
  dirtDarken?: number;
  dirtRoughnessBoost?: number;
};

export type KitMaterialFinish =
  | "merchant-plaster"
  | "timber-door"
  | "timber-window"
  | "timber-surface"
  | "aged-metal";

function resolveKitMaterialUvOffset(
  seed: number,
  materialId: string,
  tintHex: number,
): { x: number; y: number } {
  const rng = new DeterministicRng(
    deriveSubSeed(seed, `kit-material:${materialId}:${tintHex.toString(16)}`),
  );
  return {
    x: rng.next() * 8,
    y: rng.next() * 8,
  };
}

/**
 * Creates one shared, manifest-backed kit material. All mapped surfaces keep
 * world-meter UVs so instanced/non-uniformly-scaled kit geometry cannot
 * stretch a 0..1 texture across an entire facade bay.
 */
export function createMappedKitMaterial(
  options: KitPbrMaterialOptions,
  recipe: KitMappedMaterialRecipe,
): MeshStandardMaterial {
  const material = options.wallMaterials.createStandardMaterial(
    recipe.materialId,
    options.quality,
  );
  material.color.setHex(recipe.tintHex);
  material.roughness = recipe.roughness;
  material.metalness = recipe.metalness;
  material.vertexColors = recipe.vertexColors === true;
  if (recipe.emissiveHex !== undefined) {
    material.emissive.setHex(recipe.emissiveHex);
    material.emissiveIntensity = recipe.emissiveIntensity ?? 1;
    material.emissiveMap = material.map;
  }

  const manifestAlbedoBoost =
    typeof material.userData.wallAlbedoBoost === "number"
    && Number.isFinite(material.userData.wallAlbedoBoost)
      ? material.userData.wallAlbedoBoost
      : 1;
  applyWallShaderTweaks(material, {
    albedoBoost: recipe.albedoBoost ?? manifestAlbedoBoost,
    macroColorAmplitude: recipe.macroColorAmplitude ?? 0.035,
    macroRoughnessAmplitude: recipe.macroRoughnessAmplitude ?? 0.025,
    macroFrequency: 0.2,
    macroSeed: deriveSubSeed(
      options.seed,
      `kit-macro:${recipe.materialId}:${recipe.tintHex.toString(16)}`,
    ),
    tileSizeM: options.wallMaterials.getTileSizeM(recipe.materialId),
    uvOffset: resolveKitMaterialUvOffset(options.seed, recipe.materialId, recipe.tintHex),
    dirtEnabled: recipe.dirtEnabled === true,
    floorTopY: 0,
    dirtHeightM: 1.4,
    dirtDarken: recipe.dirtDarken ?? 0.14,
    dirtRoughnessBoost: recipe.dirtRoughnessBoost ?? 0.1,
  });
  material.userData.kitPbrMaterialId = recipe.materialId;
  material.userData.wallUvProjection = "world";
  return material;
}

export function resolveKitMaterialFinish(
  meshId: WallDetailMeshId,
  materialId?: string | null,
): KitMaterialFinish | null {
  if (materialId === "ph_rusty_metal_02") {
    return "aged-metal";
  }
  switch (meshId) {
    case "facade_shell_open_front":
    case "facade_wall_shell":
    case "facade_wall_infill":
      return "merchant-plaster";
    default:
      break;
  }
  if (materialId !== "ph_rough_pine_door" && materialId !== "ph_worn_planks") {
    return null;
  }
  if (
    meshId === "door_panel_timber"
    || meshId === "door_panel_shop"
    || meshId === "door_panel_storage"
    || meshId === "door_panel_fortified"
  ) {
    return "timber-door";
  }
  if (
    meshId === "window_shutter"
    || meshId === "window_recess_timber"
    || meshId === "window_screen"
    || meshId === "window_screen_bar"
  ) {
    return "timber-window";
  }
  return "timber-surface";
}

/**
 * Adds family-specific response on top of the manifest PBR maps. Vertex color
 * is deliberately reserved for authored wear/material roles in these merged
 * kit geometries; the albedo, normal and ARM maps remain world projected by
 * the wall material pipeline.
 */
export function applyKitMaterialFinish(
  material: MeshStandardMaterial,
  finish: KitMaterialFinish,
): void {
  material.vertexColors = true;
  if (
    finish === "timber-door"
    || finish === "timber-window"
    || finish === "timber-surface"
  ) {
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
    material.emissiveMap = null;
  }
  const previousOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: RoofMaterialShader, renderer): void => {
    previousOnBeforeCompile.call(material, shader, renderer);

    if (!shader.vertexShader.includes("varying vec3 vKitLocalPos;")) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vKitLocalPos;
varying vec3 vKitWorldPos;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vKitLocalPos = position;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
{
  vec4 kitWp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    kitWp = instanceMatrix * kitWp;
  #endif
  kitWp = modelMatrix * kitWp;
  vKitWorldPos = kitWp.xyz;
}`,
      );
    }

    if (!shader.fragmentShader.includes("float kitValueNoise")) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vKitLocalPos;
varying vec3 vKitWorldPos;

float kitHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float kitValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = kitHash12(i);
  float b = kitHash12(i + vec2(1.0, 0.0));
  float c = kitHash12(i + vec2(0.0, 1.0));
  float d = kitHash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,
      );
    }

    if (finish === "merchant-plaster") {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// kit-merchant-plaster-finish
vec2 kitPlasterPlane = vec2(vKitWorldPos.x + vKitWorldPos.z, vKitWorldPos.y);
float kitBroadAggregate = kitValueNoise(kitPlasterPlane * 0.82 + vec2(-5.2, 9.6));
float kitAggregate = kitValueNoise(kitPlasterPlane * 5.8 + vec2(2.7, -1.4));
float kitFineAggregate = kitValueNoise(vec2(
  (vKitWorldPos.z - vKitWorldPos.x) * 17.0,
  vKitWorldPos.y * 18.5
) + vec2(7.3, -4.1));
float kitMicroAggregate = kitValueNoise(kitPlasterPlane * 39.0 + vec2(-12.4, 6.8));
float kitAggregateTone =
  0.89
  + (kitBroadAggregate - 0.5) * 0.16
  + (kitAggregate - 0.5) * 0.23
  + (kitFineAggregate - 0.5) * 0.12;
diffuseColor.rgb *= kitAggregateTone;

// Small limestone/ochre inclusions replace the former broad circular blotches.
float kitWarmMottle = smoothstep(0.54, 0.82, kitAggregate);
float kitCoolMottle = smoothstep(0.55, 0.84, 1.0 - kitBroadAggregate);
float kitPaleFleck = smoothstep(0.68, 0.91, kitFineAggregate)
  * smoothstep(0.51, 0.78, kitMicroAggregate);
float kitDarkFleck = smoothstep(0.68, 0.92, 1.0 - kitMicroAggregate)
  * smoothstep(0.42, 0.69, kitAggregate);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.69, 0.48, 0.28), kitWarmMottle * 0.13);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.38, 0.31), kitCoolMottle * 0.10);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.68, 0.49), kitPaleFleck * 0.27);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.37, 0.245, 0.135), kitDarkFleck * 0.19);

// Dirt is tied to plausible collection points: base, reveals/corners, and the
// narrow lintel/canopy line. High-frequency breakup prevents a painted stripe.
float kitGrimeBreakup = 0.56 + kitValueNoise(kitPlasterPlane * 8.4 + vec2(4.1, 3.7)) * 0.44;
float kitBaseGrime = (1.0 - smoothstep(-0.50, -0.12, vKitLocalPos.y)) * kitGrimeBreakup;
float kitRevealGrime = smoothstep(0.34, 0.50, abs(vKitLocalPos.x))
  * (0.48 + kitFineAggregate * 0.52);
float kitLintelBand = 1.0 - smoothstep(0.09, 0.20, abs(vKitLocalPos.y - 0.32));
float kitLintelGrime = kitLintelBand
  * (0.54 + kitAggregate * 0.46);
float kitCornerGrime = kitBaseGrime * kitRevealGrime;
float kitDrip = smoothstep(0.64, 0.9, kitValueNoise(vec2(
  (vKitWorldPos.x + vKitWorldPos.z) * 6.4,
  2.1
))) * smoothstep(-0.08, 0.36, vKitLocalPos.y) * (1.0 - smoothstep(0.36, 0.48, vKitLocalPos.y));
float kitGrime = clamp(
  kitBaseGrime * 0.68
  + kitRevealGrime * 0.48
  + kitLintelGrime * 0.42
  + kitCornerGrime * 0.64
  + kitDrip * 0.24,
  0.0,
  1.0
);
vec3 kitGrimeColor = mix(
  vec3(0.34, 0.235, 0.13),
  vec3(0.22, 0.16, 0.10),
  kitBaseGrime
);
diffuseColor.rgb = mix(diffuseColor.rgb, kitGrimeColor, kitGrime * 0.43);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float kitPlasterRoughNoise = kitValueNoise(vec2(vKitWorldPos.x + vKitWorldPos.z, vKitWorldPos.y) * 8.0);
float kitPlasterBaseR = 1.0 - smoothstep(-0.50, -0.22, vKitLocalPos.y);
float kitPlasterEdgeR = smoothstep(0.38, 0.50, abs(vKitLocalPos.x));
roughnessFactor = clamp(roughnessFactor + (kitPlasterRoughNoise - 0.5) * 0.20 + max(kitPlasterBaseR, kitPlasterEdgeR) * 0.13, 0.44, 1.0);`,
      );
    } else if (finish === "aged-metal") {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// kit-aged-metal-albedo-finish
vec2 kitMetalPlane = vec2(vKitWorldPos.x + vKitWorldPos.z, vKitWorldPos.y);
float kitMetalAge = kitValueNoise(kitMetalPlane * 7.2 + vec2(5.7, -3.4));
float kitMetalFine = kitValueNoise(kitMetalPlane * 21.0 + vec2(-8.2, 4.9));
float kitOxideMask = smoothstep(0.45, 0.78, kitMetalAge)
  * (0.58 + kitMetalFine * 0.42);
float kitRubbedEdge = smoothstep(0.41, 0.50, max(abs(vKitLocalPos.x), abs(vKitLocalPos.y)))
  * smoothstep(0.45, 0.78, kitMetalFine);
float kitVerdigrisMask = smoothstep(0.62, 0.9, kitMetalFine)
  * (1.0 - kitOxideMask * 0.45);
diffuseColor.rgb *= 0.94 + (kitMetalFine - 0.5) * 0.16;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.39, 0.175, 0.065), kitOxideMask * 0.48);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.29, 0.31, 0.255), kitVerdigrisMask * 0.18);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.37, 0.275), kitRubbedEdge * 0.22);`,
      );
    } else {
      const wearStrength = finish === "timber-door" ? "0.34" : "0.29";
      const hasHardwareMask = finish !== "timber-surface";
      const wearColor = finish === "timber-door" || finish === "timber-surface"
        ? "vec3(0.71, 0.52, 0.34)"
        : "vec3(0.55, 0.64, 0.50)";
      const familyLiftColor = finish === "timber-door" || finish === "timber-surface"
        ? "vec3(0.53, 0.37, 0.23)"
        : "vec3(0.36, 0.50, 0.40)";
      const familyLiftAmount = finish === "timber-door"
        ? "0.18"
        : finish === "timber-surface"
          ? "0.14"
          : "0.15";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// kit-${finish}-finish
float kitVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitVertexValue)" : "0.0"};
float kitOuterEdge = smoothstep(0.38, 0.50, max(abs(vKitLocalPos.x), abs(vKitLocalPos.y)));
vec2 kitTimberPlane = vec2(vKitWorldPos.x + vKitWorldPos.z, vKitWorldPos.y);
float kitWearNoise = kitValueNoise(kitTimberPlane * 7.5);
float kitLongGrain = kitValueNoise(vec2(
  (vKitWorldPos.x + vKitWorldPos.z) * 24.0,
  vKitWorldPos.y * 0.72
) + vec2(3.4, -6.2));
float kitFineGrain = kitValueNoise(vec2(
  (vKitWorldPos.x + vKitWorldPos.z) * 49.0,
  vKitWorldPos.y * 1.35
) + vec2(-9.7, 2.8));
float kitGrainTone = 0.91 + kitLongGrain * 0.13 + (kitFineGrain - 0.5) * 0.08;
float kitPaintLoss = smoothstep(
  0.54,
  0.84,
  kitWearNoise * 0.58 + kitFineGrain * 0.22 + kitOuterEdge * 0.34
) * (1.0 - kitHardwareMask);
float kitWearMask = kitOuterEdge * (0.58 + kitWearNoise * 0.42) * (1.0 - kitHardwareMask);
float kitLowerGrime = (1.0 - smoothstep(-0.50, -0.22, vKitLocalPos.y))
  * (0.52 + kitWearNoise * 0.48)
  * (1.0 - kitHardwareMask);
diffuseColor.rgb *= mix(1.0, kitGrainTone, 1.0 - kitHardwareMask);
diffuseColor.rgb = mix(diffuseColor.rgb, ${familyLiftColor}, ${familyLiftAmount} * (1.0 - kitHardwareMask));
diffuseColor.rgb = mix(diffuseColor.rgb, ${wearColor}, kitPaintLoss * ${wearStrength});
diffuseColor.rgb = mix(diffuseColor.rgb, ${wearColor}, kitWearMask * (${wearStrength} + 0.06));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.205, 0.15, 0.095), kitLowerGrime * 0.24);
float kitHardwareOxide = smoothstep(0.45, 0.78, kitValueNoise(kitTimberPlane * 18.0 + vec2(6.1, -2.6)));
vec3 kitHardwareColor = mix(
  vec3(0.23, 0.215, 0.18),
  vec3(0.39, 0.17, 0.065),
  kitHardwareOxide * 0.66
);
diffuseColor.rgb = mix(diffuseColor.rgb, kitHardwareColor, kitHardwareMask * 0.82);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float kitRoughVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitRoughHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitRoughVertexValue)" : "0.0"};
float kitRoughOuterEdge = smoothstep(0.38, 0.50, max(abs(vKitLocalPos.x), abs(vKitLocalPos.y)));
roughnessFactor = mix(roughnessFactor + kitRoughOuterEdge * 0.055, 0.43, kitRoughHardwareMask);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
float kitMetalVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitMetalHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitMetalVertexValue)" : "0.0"};
metalnessFactor = mix(metalnessFactor, 0.72, kitMetalHardwareMask);`,
      );
    }
  };

  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = (): string => `${previousProgramCacheKey()}|kit-finish:${finish}:v7`;
  material.needsUpdate = true;
}

function applyRoofDustShader(material: MeshStandardMaterial): void {
  const previousOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: RoofMaterialShader, renderer): void => {
    previousOnBeforeCompile.call(material, shader, renderer);

    if (!shader.vertexShader.includes("varying vec3 vRoofWorldPos;")) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vRoofWorldPos;
varying vec3 vRoofWorldNormal;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
{
  vec4 roofWp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    roofWp = instanceMatrix * roofWp;
  #endif
  roofWp = modelMatrix * roofWp;
  vRoofWorldPos = roofWp.xyz;
}
vec3 roofObjN = normal;
#ifdef USE_INSTANCING
roofObjN = mat3(instanceMatrix) * roofObjN;
#endif
vRoofWorldNormal = normalize(mat3(modelMatrix) * roofObjN);`,
      );
    }

    if (!shader.fragmentShader.includes("varying vec3 vRoofWorldPos;")) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vRoofWorldPos;
varying vec3 vRoofWorldNormal;

float roofHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float roofValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = roofHash12(i);
  float b = roofHash12(i + vec2(1.0, 0.0));
  float c = roofHash12(i + vec2(0.0, 1.0));
  float d = roofHash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,
      );
    }

    if (!shader.fragmentShader.includes("// roof-dust-applied")) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// roof-dust-applied
{
  float upFacing = clamp(vRoofWorldNormal.y, 0.0, 1.0);
  float dustNoise = roofValueNoise(vRoofWorldPos.xz * 0.22);
  float dustNoise2 = roofValueNoise(vRoofWorldPos.xz * 0.08 + vec2(17.3, -9.1));
  float dustMask = upFacing * mix(dustNoise, dustNoise2, 0.4);
  dustMask = smoothstep(0.15, 0.65, dustMask);
  vec3 dustColor = vec3(0.85, 0.78, 0.65);
  diffuseColor.rgb = mix(diffuseColor.rgb, dustColor, dustMask * 0.55);
}`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
{
  float roofUpFacing = clamp(vRoofWorldNormal.y, 0.0, 1.0);
  roughnessFactor = clamp(roughnessFactor + roofUpFacing * 0.05, 0.04, 1.0);
}`,
      );
    }
  };

  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = (): string => `${previousProgramCacheKey()}|roof-dust`;
  material.needsUpdate = true;
}

export function createWallDetailMaterialBank(
  highVis: boolean,
  pbrOptions?: KitPbrMaterialOptions,
) {
  const palette = resolveBlockoutPalette(highVis);
  const mapped = (
    recipe: KitMappedMaterialRecipe,
    fallback: MeshStandardMaterial,
  ): MeshStandardMaterial => (
    pbrOptions ? createMappedKitMaterial(pbrOptions, recipe) : fallback
  );

  const stonePrimary = mapped({
    materialId: "ph_painted_plaster_warm",
    tintHex: highVis ? 0xd8cbb7 : 0xc2b49f,
    roughness: 0.92,
    metalness: 0,
    albedoBoost: highVis ? 1.12 : 1.06,
    macroColorAmplitude: 0.025,
    macroRoughnessAmplitude: 0.035,
    dirtEnabled: true,
    dirtDarken: 0.18,
  }, new MeshStandardMaterial({
    color: palette.wall,
    roughness: 0.88,
    metalness: 0.03,
  }));
  const stoneTrim = mapped({
    materialId: "ph_stone_trim_sandstone",
    tintHex: highVis ? 0xd4c7b3 : 0xbeb09a,
    roughness: 0.86,
    metalness: 0.01,
    macroColorAmplitude: 0.03,
  }, new MeshStandardMaterial({
    color: palette.serviceDoor,
    roughness: 0.84,
    metalness: 0.03,
  }));
  const stoneRecess = mapped({
    materialId: "ph_beige_wall_002",
    tintHex: highVis ? 0xbeb19e : 0xa49784,
    roughness: 0.93,
    metalness: 0,
    albedoBoost: highVis ? 1.08 : 1.02,
    macroColorAmplitude: 0.025,
    macroRoughnessAmplitude: 0.035,
    dirtEnabled: true,
    dirtDarken: 0.2,
  }, new MeshStandardMaterial({
    color: palette.filler,
    roughness: 0.9,
    metalness: 0.01,
  }));
  const bracketMetal = mapped({
    materialId: "ph_rusty_metal_02",
    tintHex: highVis ? 0x77756b : 0x5e5c54,
    roughness: 0.62,
    metalness: 0.56,
    albedoBoost: highVis ? 1.22 : 1.1,
    macroColorAmplitude: 0.02,
    macroRoughnessAmplitude: 0.035,
  }, new MeshStandardMaterial({
    color: 0x656c73,
    roughness: 0.58,
    metalness: 0.42,
  }));
  const cableMetal = mapped({
    materialId: "ph_rusty_metal_02",
    tintHex: highVis ? 0x55554f : 0x42423e,
    roughness: 0.68,
    metalness: 0.48,
    albedoBoost: highVis ? 1.15 : 1.05,
    macroColorAmplitude: 0.015,
    macroRoughnessAmplitude: 0.03,
  }, new MeshStandardMaterial({
    color: 0x444b52,
    roughness: 0.64,
    metalness: 0.34,
  }));
  const frameTrim = mapped({
    materialId: "ph_trim_sanded_01",
    tintHex: highVis ? 0xd3c5b0 : 0xb9aa94,
    roughness: 0.84,
    metalness: 0.01,
    albedoBoost: highVis ? 1.16 : 1.08,
    macroColorAmplitude: 0.025,
    dirtEnabled: true,
    dirtDarken: 0.13,
  }, new MeshStandardMaterial({
    color: highVis ? 0xc1b29d : 0xa59682,
    roughness: 0.76,
    metalness: 0.04,
  }));
  const woodShutter = mapped({
    materialId: "ph_worn_planks",
    tintHex: highVis ? 0x96b8a5 : 0x769080,
    roughness: 0.79,
    metalness: 0,
    albedoBoost: highVis ? 1.76 : 1.58,
    macroColorAmplitude: 0.02,
    macroRoughnessAmplitude: 0.025,
    vertexColors: true,
  }, new MeshStandardMaterial({
    color: highVis ? 0x6c8d78 : 0x556f60,
    roughness: 0.8,
    metalness: 0.02,
    vertexColors: true,
  }));
  const weatheredTimber = mapped({
    materialId: "ph_rough_pine_door",
    tintHex: highVis ? 0xb58e68 : 0x9d7755,
    roughness: 0.85,
    metalness: 0.01,
    albedoBoost: highVis ? 1.55 : 1.42,
    macroColorAmplitude: 0.02,
    macroRoughnessAmplitude: 0.025,
    vertexColors: true,
  }, new MeshStandardMaterial({
    color: highVis ? 0xaa805a : 0x8f6848,
    roughness: 0.86,
    metalness: 0.01,
    vertexColors: true,
  }));
  const shopTimber = pbrOptions
    ? createMappedKitMaterial(pbrOptions, {
      materialId: "ph_rough_pine_door",
      tintHex: highVis ? 0xa87d58 : 0x906747,
      roughness: 0.86,
      metalness: 0.01,
      albedoBoost: highVis ? 1.5 : 1.38,
      macroColorAmplitude: 0.02,
      macroRoughnessAmplitude: 0.025,
    })
    : weatheredTimber.clone();
  if (!pbrOptions) shopTimber.color.setHex(highVis ? 0x9d724e : 0x855f41);
  // Counter boxes intentionally remain uniform; only the constructed door
  // leaf consumes vertex tones from its merged plank geometry.
  shopTimber.vertexColors = false;
  const shopDoorTimber = pbrOptions
    ? createMappedKitMaterial(pbrOptions, {
      materialId: "ph_rough_pine_door",
      tintHex: highVis ? 0xb1835e : 0x996c49,
      roughness: 0.84,
      metalness: 0.01,
      albedoBoost: highVis ? 1.54 : 1.42,
      macroColorAmplitude: 0.02,
      macroRoughnessAmplitude: 0.025,
      vertexColors: true,
    })
    : shopTimber.clone();
  shopDoorTimber.vertexColors = true;
  const storageTimber = pbrOptions
    ? createMappedKitMaterial(pbrOptions, {
      materialId: "ph_rough_pine_door",
      tintHex: highVis ? 0x907a63 : 0x79634f,
      roughness: 0.89,
      metalness: 0.01,
      albedoBoost: highVis ? 1.48 : 1.36,
      macroColorAmplitude: 0.018,
      macroRoughnessAmplitude: 0.03,
      vertexColors: true,
    })
    : weatheredTimber.clone();
  if (!pbrOptions) storageTimber.color.setHex(highVis ? 0x78634f : 0x65513f);
  const fortifiedTimber = pbrOptions
    ? createMappedKitMaterial(pbrOptions, {
      materialId: "ph_rough_pine_door",
      tintHex: highVis ? 0x806b56 : 0x6d5947,
      roughness: 0.9,
      metalness: 0.01,
      albedoBoost: highVis ? 1.44 : 1.32,
      macroColorAmplitude: 0.018,
      macroRoughnessAmplitude: 0.03,
      vertexColors: true,
    })
    : weatheredTimber.clone();
  if (!pbrOptions) fortifiedTimber.color.setHex(highVis ? 0x6e5945 : 0x5a4737);
  const warmRecess = mapped({
    materialId: "ph_plastered_wall",
    tintHex: highVis ? 0x887968 : 0x6b5f52,
    roughness: 0.94,
    metalness: 0,
    albedoBoost: highVis ? 1.16 : 1.04,
    macroColorAmplitude: 0.025,
    macroRoughnessAmplitude: 0.05,
    dirtEnabled: true,
    dirtDarken: 0.1,
  }, new MeshStandardMaterial({
    color: highVis ? 0x887968 : 0x6b5f52,
    roughness: 0.94,
    metalness: 0,
  }));
  const shadedArchInterior = mapped({
    materialId: "ph_beige_wall_002",
    tintHex: highVis ? 0x4f4b45 : 0x3d3a35,
    roughness: 0.96,
    metalness: 0,
    albedoBoost: highVis ? 0.98 : 0.9,
    macroColorAmplitude: 0.025,
  }, new MeshStandardMaterial({
    color: highVis ? 0x4f4b45 : 0x3d3a35,
    roughness: 0.96,
    metalness: 0,
  }));
  const nicheRecess = mapped({
    materialId: "ph_worn_plaster_ochre",
    tintHex: highVis ? 0x856b50 : 0x66503b,
    roughness: 0.96,
    metalness: 0,
    albedoBoost: highVis ? 1.2 : 1.08,
    macroColorAmplitude: 0.05,
  }, new MeshStandardMaterial({
    color: highVis ? 0x6d5945 : 0x514131,
    roughness: 0.96,
    metalness: 0,
  }));
  const darkScreen = mapped({
    materialId: "ph_rusty_metal_02",
    tintHex: highVis ? 0x555956 : 0x404440,
    roughness: 0.68,
    metalness: 0.48,
    albedoBoost: highVis ? 1.08 : 0.98,
    macroColorAmplitude: 0.018,
    macroRoughnessAmplitude: 0.03,
  }, new MeshStandardMaterial({
    color: highVis ? 0x4d514f : 0x373b39,
    roughness: 0.72,
    metalness: 0.2,
  }));
  const stripedClothMap = loadTemplateTexture(BAZAAR_STRIPED_CLOTH_TEXTURE_URL, SRGBColorSpace);
  stripedClothMap.wrapS = RepeatWrapping;
  stripedClothMap.wrapT = RepeatWrapping;
  stripedClothMap.repeat.set(2, 1);
  const awningCloth = new MeshPhysicalMaterial({
    color: 0xffffff,
    map: stripedClothMap,
    roughness: 0.94,
    metalness: 0,
    transmission: highVis ? 0.1 : 0.08,
    thickness: 0.035,
    ior: 1.35,
    attenuationColor: 0xd8c8af,
    attenuationDistance: 0.55,
    envMapIntensity: 0.72,
    side: DoubleSide,
  });
  const tileBlue = mapped({
    materialId: "ph_painted_plaster_warm",
    tintHex: highVis ? 0x40928f : 0x317574,
    roughness: 0.62,
    metalness: 0.01,
    albedoBoost: highVis ? 1.36 : 1.2,
    macroColorAmplitude: 0.025,
    macroRoughnessAmplitude: 0.025,
  }, new MeshStandardMaterial({
    color: highVis ? 0x2f7777 : 0x255f61,
    roughness: 0.52,
    metalness: 0.02,
  }));
  const windowGlass = new MeshPhysicalMaterial({
    color: highVis ? 0x344047 : 0x28343a,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.24,
    ior: 1.5,
    specularIntensity: 0.35,
    specularColor: 0x9ca7ab,
  });
  applyWindowGlassShaderTweaks(windowGlass, { highVis });

  const roofBitumen = mapped({
    materialId: "ph_beige_wall_002",
    tintHex: highVis ? 0x5d554d : 0x49423c,
    roughness: 0.94,
    metalness: 0,
    albedoBoost: highVis ? 1.15 : 1.05,
    macroColorAmplitude: 0.045,
    macroRoughnessAmplitude: 0.04,
  }, new MeshStandardMaterial({
    color: highVis ? 0x4a4540 : 0x3a3530,
    roughness: 0.92,
    metalness: 0,
  }));
  applyRoofDustShader(roofBitumen);
  return { stonePrimary, stoneTrim, stoneRecess, bracketMetal, cableMetal, frameTrim, woodShutter, weatheredTimber, shopTimber, shopDoorTimber, storageTimber, fortifiedTimber, warmRecess, shadedArchInterior, nicheRecess, darkScreen, awningCloth, tileBlue, windowGlass, roofBitumen };
}
