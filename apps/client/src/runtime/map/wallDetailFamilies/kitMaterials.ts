import { MeshStandardMaterial } from "three";
import { BLOCKOUT_PALETTE } from "../../render/BlockoutMaterials";
import type {
  WallMaterialLibrary,
  WallTextureQuality,
} from "../../render/materials/WallMaterialLibrary";
import { applyWallShaderTweaks } from "../../render/materials/applyWallShaderTweaks";
import { DeterministicRng, deriveSubSeed } from "../../utils/Rng";

type MaterialShader = Parameters<NonNullable<MeshStandardMaterial["onBeforeCompile"]>>[0];

export type KitPbrMaterialOptions = {
  wallMaterials: WallMaterialLibrary;
  quality: WallTextureQuality;
  seed: number;
};

type KitMappedMaterialRecipe = {
  materialId: string;
  tintHex: number;
  roughness: number;
  metalness: number;
  albedoBoost?: number;
  macroColorAmplitude?: number;
  macroRoughnessAmplitude?: number;
  dirtEnabled?: boolean;
  dirtDarken?: number;
};

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
function createMappedKitMaterial(
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
  material.vertexColors = false;

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
    dirtRoughnessBoost: 0.1,
  });
  material.userData.kitPbrMaterialId = recipe.materialId;
  material.userData.wallUvProjection = "world";
  return material;
}

/**
 * Adds world-space limewash and ground wear on top of the manifest PBR maps of
 * a plastered wall shell.
 */
export function applyKitPlasterFinish(material: MeshStandardMaterial): void {
  material.vertexColors = true;
  const previousOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: MaterialShader, renderer): void => {
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
  // Must mirror three's own worldpos_vertex, batching branch included. The
  // compiled map builds enough wall-detail instances to render through
  // BatchedMesh, and without this branch vKitWorldPos collapsed to unit-box
  // local coordinates — so every world-space term keyed off it (plaster
  // aggregate, mottle, fleck, the timber macro grain) went near-constant
  // across the whole map. That silently defeated several rounds of
  // procedural-detail work: a large grime change measured 0.6/255 map-wide
  // and read as "wrong mesh targeted" when the varying was simply wrong.
  vec4 kitWp = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    kitWp = batchingMatrix * kitWp;
  #endif
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

    // Installed PBR maps own plaster detail. World-space wear must remain
    // continuous across neighbouring shells.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
// kit-merchant-plaster-finish
vec2 kitPlasterPlane = vec2(vKitWorldPos.x + vKitWorldPos.z, vKitWorldPos.y);
float kitLimewash = kitValueNoise(kitPlasterPlane * 0.82 + vec2(-5.2, 9.6));
float kitGroundWear = (1.0 - smoothstep(0.05, 0.65, vKitWorldPos.y))
  * (0.65 + 0.35 * kitValueNoise(kitPlasterPlane * 7.0));
diffuseColor.rgb *= 0.94 + (kitLimewash - 0.5) * 0.12;
diffuseColor.rgb *= 1.0 - kitGroundWear * 0.18;
`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + kitGroundWear * 0.08, 0.44, 1.0);`,
    );
  };

  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = (): string => `${previousProgramCacheKey()}|kit-finish:merchant-plaster:v10`;
  material.needsUpdate = true;
}

function applyRoofDustShader(material: MeshStandardMaterial): void {
  const previousOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: MaterialShader, renderer): void => {
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

export function createWallDetailMaterialBank(pbrOptions?: KitPbrMaterialOptions) {
  const mapped = (
    recipe: KitMappedMaterialRecipe,
    fallback: MeshStandardMaterial,
  ): MeshStandardMaterial => (
    pbrOptions ? createMappedKitMaterial(pbrOptions, recipe) : fallback
  );

  const stonePrimary = mapped({
    materialId: "ph_painted_plaster_warm",
    tintHex: 0xc2b49f,
    roughness: 0.92,
    metalness: 0,
    albedoBoost: 1.06,
    macroColorAmplitude: 0.025,
    macroRoughnessAmplitude: 0.035,
    dirtEnabled: true,
    dirtDarken: 0.18,
  }, new MeshStandardMaterial({
    color: BLOCKOUT_PALETTE.wall,
    roughness: 0.88,
    metalness: 0.03,
  }));
  const stoneTrim = mapped({
    materialId: "ph_stone_trim_sandstone",
    tintHex: 0xbeb09a,
    roughness: 0.86,
    metalness: 0.01,
    macroColorAmplitude: 0.03,
  }, new MeshStandardMaterial({
    color: BLOCKOUT_PALETTE.serviceDoor,
    roughness: 0.84,
    metalness: 0.03,
  }));
  const roofBitumen = mapped({
    materialId: "ph_beige_wall_002",
    tintHex: 0x49423c,
    roughness: 0.94,
    metalness: 0,
    albedoBoost: 1.05,
    macroColorAmplitude: 0.045,
    macroRoughnessAmplitude: 0.04,
  }, new MeshStandardMaterial({
    color: 0x3a3530,
    roughness: 0.92,
    metalness: 0,
  }));
  applyRoofDustShader(roofBitumen);
  return { stonePrimary, stoneTrim, roofBitumen };
}
