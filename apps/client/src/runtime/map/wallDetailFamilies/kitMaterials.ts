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
  | "recess-plaster"
  | "timber-door"
  | "timber-window"
  | "timber-screen"
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
  // A frontage terminal pier is the same plastered masonry as the wall shells
  // it abuts, and projects 0.26 m in front of them, so it is one of the most
  // visible surfaces on the elevation. Without a finish it rendered the raw
  // manifest albedo and nothing else — measured high-frequency detail 2.45
  // against 6.15-7.09 on the sandstone beside it and 6.40 in the target — which
  // read as a bare grey slab standing against textured stone. Gated on the
  // plaster material ids so masonry piers that carry a stone trim source are
  // left alone.
  const isPlasterSource = materialId === "ph_painted_plaster_warm"
    || materialId === "ph_plastered_wall"
    || materialId === "ph_beige_wall_002";
  if (meshId === "corner_pier" && isPlasterSource) {
    return "merchant-plaster";
  }
  switch (meshId) {
    case "facade_shell_open_front":
    case "facade_wall_shell":
    case "facade_wall_infill":
    // A merchant bay's back lining is a plastered interior wall seen through an
    // open front at player height. Left without a finish it renders as a bare
    // tinted gradient — the largest placeholder-reading surface on the frontage
    // — while the plaster it abuts carries full aggregate and grime.
    // A recessed wall panel is a facade feature, not an interior: it keeps the
    // wall's own plaster so it does not sink to interior value at player height.
    case "recessed_panel_back":
      return "merchant-plaster";
    case "shop_recess_back":
    case "niche_recess_back":
    // An arcade bay behind an arch is as deep as a shop recess and reads under
    // the same cloth shade, so it takes the same interior value. Without a
    // finish it rendered the raw exterior albedo and lifted the bay back to
    // sunlit-wall value, which flattened the arcade into a row of bright panels.
    case "arch_recess_back":
      return "recess-plaster";
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
  // Security bars are ironwork even when an authored profile hands them a
  // timber source id. Sharing the shutter finish made the grilles read as a
  // painted lattice in the same hue as the frame around them.
  if (meshId === "window_screen" || meshId === "window_screen_bar") {
    return "timber-screen";
  }
  if (meshId === "window_shutter" || meshId === "window_recess_timber") {
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
    || finish === "timber-screen"
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

    if (finish === "merchant-plaster" || finish === "recess-plaster") {
      // A recess reads as an interior only if it keeps its value below the
      // sunlit wall around it. It still needs aggregate and grime so it is not
      // a flat card, but the sun-bleached fleck and mottle that sell an
      // exterior wall would lift it straight back out of shadow.
      const isRecess = finish === "recess-plaster";
      const paleFleckMix = isRecess ? "0.04" : "0.27";
      const warmMottleMix = isRecess ? "0.05" : "0.13";
      const coolMottleMix = isRecess ? "0.14" : "0.10";
      const grimeMix = isRecess ? "0.58" : "0.43";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// kit-${finish}-finish
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
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.69, 0.48, 0.28), kitWarmMottle * ${warmMottleMix});
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.38, 0.31), kitCoolMottle * ${coolMottleMix});
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.68, 0.49), kitPaleFleck * ${paleFleckMix});
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
diffuseColor.rgb = mix(diffuseColor.rgb, kitGrimeColor, kitGrime * ${grimeMix});
${isRecess ? `
// Interior backing for a merchant bay that is 1.35 m deep. At 0.62 the back
// plane rendered at luma 63 against a target of 32, so a genuinely deep shop
// still read as a shallow lit panel and gave the pier nothing to stand against.
// This multiplier reaches only shop_recess_back and niche_recess_back.
//
// Headroom check before lowering further: crushed black inside the bays
// measured 1.2-9.7% of pixels against 37-49% in the target, and bay highlight
// p95 is unchanged by this term — it darkens the recessed ambient floor, not
// the stock, so shelving and goods keep their read.
diffuseColor.rgb *= 0.34;` : `
// Close range needs damage, not just tone. Rendered plaster carries chipped
// arrises exposing a warmer render coat, fine craze lines, and a splash band
// where the wall meets the pavement; without them the largest surface on the
// street is a smooth value gradient and reads unfinished at two metres.
float kitChipField = kitValueNoise(kitPlasterPlane * 12.5 + vec2(-3.9, 7.4));
float kitChipFine = kitValueNoise(kitPlasterPlane * 46.0 + vec2(11.2, -5.6));
float kitChip = smoothstep(0.74, 0.93, kitChipField * 0.68 + kitChipFine * 0.32);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.38, 0.24), kitChip * 0.42);
// Craze lines are hairline shrinkage cracks, so they have to be isotropic. At
// 62:26 the horizontal frequency was 2.4x the vertical one, which turned every
// tall plaster shell - the Spawn-B corner towers, the Rug Gate flanks, the
// Textile Arcade panels - into a field of vertical streaks that read as bleached
// plywood at any range. Matching the two frequencies keeps the damage and
// removes the grain; the strength comes down because isotropic noise covers far
// more of the surface than a striped field did at the same amplitude.
float kitCraze = smoothstep(0.80, 0.97, kitValueNoise(vec2(
  (vKitWorldPos.x + vKitWorldPos.z) * 44.0,
  vKitWorldPos.y * 44.0
) + vec2(-6.3, 2.2)));
diffuseColor.rgb *= 1.0 - kitCraze * 0.09;
float kitSplash = (1.0 - smoothstep(0.0, 0.55, vKitWorldPos.y))
  * smoothstep(0.42, 0.78, kitValueNoise(kitPlasterPlane * 17.0 + vec2(5.5, -9.1)));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.31, 0.24, 0.16), kitSplash * 0.30);`}`,
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
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.37, 0.275), kitRubbedEdge * 0.22);
// Struts, brackets and hinges are small, high-frequency shapes read against a
// lit wall. Left at the bright rusty-metal albedo they turn into pale sticks
// with blown bolt caps that draw more attention than the openings they carry.
diffuseColor.rgb = mix(
  vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))),
  diffuseColor.rgb,
  0.62
);
diffuseColor.rgb *= 0.45;`,
      );
    } else {
      const wearStrength = finish === "timber-door" ? "0.34" : "0.29";
      const hasHardwareMask = finish !== "timber-surface";
      // The shutter tier's wear and lift colours were green-grey, and between
      // them they are mixed over roughly 40% of the surface — enough to drag an
      // authored warm-brown shutter (saturation 0.50) down to a measured 0.20
      // and read as chalky mauve. The target's shutters are deep warm timber at
      // saturation 0.42-0.51, and they are the one element in the frame that
      // renders BRIGHTER than the target while everything else renders darker.
      // Weathered timber greys toward its own brown, not toward sage.
      // Grilles are weathered timber too, not neutral iron. Left grey they
      // measured hue 12-13 degrees at saturation 0.20 against the target's
      // 26-28 degrees at 0.47-0.54 — cool, milky and washed out where the
      // target reads as dark warm wood behind the reveal.
      const wearColor = finish === "timber-screen"
        ? "vec3(0.46, 0.34, 0.22)"
        : finish === "timber-door" || finish === "timber-surface"
          ? "vec3(0.71, 0.52, 0.34)"
          : "vec3(0.66, 0.48, 0.31)";
      const familyLiftColor = finish === "timber-screen"
        ? "vec3(0.30, 0.21, 0.13)"
        : finish === "timber-door" || finish === "timber-surface"
          ? "vec3(0.53, 0.37, 0.23)"
          : "vec3(0.46, 0.32, 0.20)";
      const familyLiftAmount = finish === "timber-door"
        ? "0.18"
        : finish === "timber-screen"
          ? "0.55"
          : finish === "timber-surface"
            ? "0.14"
            : "0.15";
      // The authored tints and the manifest albedo boost were both set while
      // this family rendered black, so together they now sit a full stop above
      // the plaster around them. Settle the joinery back under the wall so the
      // facade keeps its wall > joinery > opening value ordering in shade, and
      // separate it into three tiers so the frontage is not one flat hue:
      // structural posts and lintels sit darkest, painted shutters and leaves
      // hold the warm mid-tone, and grilles drop to dark iron.
      // Measured against the target frontage, the joinery value ordering runs
      // the opposite way round to the one this family previously encoded. The
      // target's window surrounds are the BRIGHT element (~123 luma, warm) and
      // its shutter leaves and lattices are the dark ones (~61 and ~34) — sunlit
      // frames around deep shadowed openings. The old tiers had that inverted:
      // frames crushed to 0.17 and shutter leaves left at full 1.0.
      // Every value below was set while this family carried 7-9x the plaster's
      // environment response, so a large part of each member's light arrived as
      // reflection rather than albedo and these scales were pulled down to
      // compensate. With that film removed the same scales crushed the family:
      // measured against sunlit stone in the same frame, shopfront timber came
      // out at 0.32 of wall luminance against the target's 0.44, lattice
      // internal contrast fell to 10 against the target's 39, and a whole shelf
      // run collapsed into one dark mass with a 20-value spread against 86.
      // Raised to restore the target's ratios, keeping the tier ordering that
      // separates sunlit surround from shutter leaf from shadowed lattice.
      // Second raise, measured in CIELAB against the target's own members: at
      // the first pass lit timber sat at L* 19-22 against the target's 31 and
      // shaded shopfront joinery went effectively black, so the family read as
      // dark plastic instead of wood. These land the lit faces near the target
      // and keep shaded members off the floor.
      // These tier values are LEFT AS THEY WERE while the environment response
      // was cut, and that pairing is the one a blind review preferred on all
      // three cameras. Three later sweeps that raised them to chase the target's
      // measured luminance were all restored: at target value this family's own
      // red bias reads as copper, and desaturating it there reads as mauve. The
      // residual gap — shaded timber sitting well under the target's value — is
      // the map-wide shade deficit, which belongs to the light-model card.
      const familyValueScale = finish === "timber-door"
        ? "0.85"
        // Lattices sit deepest in shadow behind the reveal, but not so deep that
        // the opening they fill stops reading as one. At 0.10 the screens, grilles
        // and closures behind every reveal on the map crushed to black, and the
        // "black-void openings" the light-model card names are these surfaces —
        // not missing interior geometry. 0.20 is the value that showed depth
        // without the tier going copper when the whole family was swept.
        : finish === "timber-screen"
          ? "0.20"
          // Shutter leaves are dark weathered timber in SHADE, not fresh paint in
          // sun: measured against the limestone beside them the target's leaves
          // sit at 57% of wall luminance.
          : finish === "timber-window"
            ? "0.26"
            // Frames, jambs, lintels and ledgers are the sunlit surround.
            : "0.45";
      // The target's timber is WARM and strongly chromatic — saturation 0.41
      // to 0.53 across shutters, frames and lattices. Desaturating toward
      // neutral grey moves away from it, so the family keeps its chroma and
      // separates on value instead.
      // Shutters keep their full chroma. Measured at 0.20 against the target's
      // 0.42-0.51, this family is already far too neutral to be pulled further
      // toward luminance grey.
      // Above 1.0 this extrapolates away from luminance rather than mixing
      // toward it, raising chroma instead of reducing it. The shutter and
      // lattice tiers need that: measured against the target they carry 0.38
      // and 0.25 saturation against 0.54 and 0.52 — roughly 55-70% of the
      // target across every warm element on the facade except the newly warmed
      // frames, which now read as isolated warm objects on a grey-mauve wall.
      // This is not an exposure problem; the value histograms already match.
      // Extrapolating chroma away from luminance was chasing a saturation
      // measurement, and it overshot: at 1.70 and 1.40 the shutters, frames and
      // lattices came out copper-pink under sun — hue and chroma of oxidised
      // metal, not the dry matte brown of the target's weathered timber, which
      // is chromatic but nowhere near this saturated. Values at or just below
      // 1.0 keep the authored warmth without manufacturing any.
      const familyChromaScale = finish === "timber-screen"
        // Held under 1.0 with the value lift: extrapolated chroma on a small,
        // now-brighter batten is what turns a lattice copper-orange.
        ? "0.86"
        : finish === "timber-window"
          ? "1.0"
          : "0.88";
      // Only the two tiers measured with a red bias are rotated; the door and
      // surface tiers already sit in the target's hue band.
      //
      // Raised alongside the chroma extrapolation above. Pushing chroma away
      // from luminance amplifies whatever hue bias the surface already has, so
      // the same lift that held these tiers at 25 and 15 degrees let them fall
      // to 22 and 7 once chroma rose. The rotation has to scale with it.
      // Scaled back with the chroma extrapolation above: the rotation existed to
      // counter the red bias that extrapolation itself amplified.
      // The hue rotation is NOT interchangeable with the chroma scale, and
      // cutting both together was the mistake that produced a mauve facade at
      // target saturation: this family's albedo carries a red bias (measured hue
      // 13-14 against the target's 26-29), so desaturating it without rotating
      // lands on desaturated red, which is mauve. Lifting green against red
      // rotates toward orange-brown at constant luminance and chroma.
      const familyGreenLift = finish === "timber-screen"
        ? "1.05"
        : finish === "timber-window"
          ? "1.03"
          : "1.0";
      // Cutting blue HERE does nothing: measured, a 0.78 multiplier on the
      // lattice tier left the bars byte-identical at RGB (71,43,38). The two
      // additive terms below run after this stage, and on a tier scaled to 0.10
      // they are larger than the surface value itself, so they restore whatever
      // blue is removed. Colour on the darkest tiers is set by those constants,
      // not by anything multiplicative applied before them.
      const familyBlueCut = "1.0";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// kit-${finish}-finish
float kitVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitVertexValue)" : "0.0"};
// Every face of a unit-box trim piece sits at |x| or |y| == 0.5, so an edge
// mask built from max() saturates across the whole face and turns the paint-
// loss and wear lifts into a flat repaint. Requiring proximity on both axes
// keeps the lift on the corners and arrises that actually rub.
float kitOuterEdge = smoothstep(0.30, 0.50, min(abs(vKitLocalPos.x), abs(vKitLocalPos.y)));
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
  vec3(0.33, 0.305, 0.255),
  vec3(0.44, 0.21, 0.09),
  kitHardwareOxide * 0.66
);
diffuseColor.rgb = mix(diffuseColor.rgb, kitHardwareColor, kitHardwareMask * 0.82);`,
      );
      // The family value and chroma hierarchy has to run AFTER the instance
      // tint, not before it. Three applies per-instance colour in
      // <color_fragment>, which follows <map_fragment>, so clamping here
      // previously only ever touched the texture: an authored 0xb77f58 window
      // grille came through at full saturation with the 0.30 chroma scale
      // silently bypassed, which is why the lattices read as coral plastic
      // instead of dark ironwork. Applying the hierarchy downstream of the
      // tint makes the authored colours land inside the intended
      // wall > joinery > opening ordering.
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
// kit-${finish}-hierarchy
float kitTierVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitTierHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitTierVertexValue)" : "0.0"};
diffuseColor.rgb *= mix(${familyValueScale}, 0.82, kitTierHardwareMask);
// Clamped because this scale runs above 1.0 on the shutter and lattice tiers,
// which extrapolates away from luminance and can drive a channel negative on
// an already near-neutral pixel.
diffuseColor.rgb = clamp(
  mix(
    vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))),
    diffuseColor.rgb,
    ${familyChromaScale}
  ),
  0.0,
  1.0
);
// Hue correction toward orange-brown. The shutter and lattice tiers render at
// 10-20 degrees where the target's weathered timber sits at 26-29 — a red bias
// the authored tints do not have (they start near 23) and which the wear and
// lift colours cannot pull back, since those already sit at 28-30 and are only
// mixed over part of the surface. Lifting green against red rotates the hue
// without touching luminance or chroma, so the warmth is recovered without
// paying for it in value the way raising saturation would.
diffuseColor.g *= ${familyGreenLift};
diffuseColor.b *= ${familyBlueCut};
// A shaded street still gets warm bounce off the sunlit paving. Without a
// floor the darkest tier crushes into the window voids behind it and the
// frame profile disappears; this keeps the joinery readable against black.
// Keep this ADDITIVE and unscaled. Two alternatives were measured and both
// lost: a lift proportional to the pixel's own colour shrinks to nothing on the
// darkest members and let the cold sky fill (0xDDEBF2) turn the lattices and
// shutters galvanised blue-grey; scaling it by the tier's value scale instead
// recovered only 0.02 saturation while pushing the shutter-to-wall luminance
// ratio from 81% to 75% against a target of 82%. The residual chroma loss on
// dark joinery is untinted specular, not this term.
// Blue pulled down from 0.0105. On the darkest tiers this constant exceeds the
// surface's own value, so its colour IS the member's colour — and at a
// green-over-blue gap of only 0.003 it was holding the lattice bars at hue 8
// where the target reads 25. Orange-brown is green above blue; widening that
// gap here is the only place it can be widened, because every multiplicative
// stage runs before this addition and gets restored by it.
diffuseColor.rgb += vec3(0.016, 0.0135, 0.0062) * (1.0 - kitTierHardwareMask);
// Tight warm arris catch. Flooring roughness correctly removed a broad, white,
// near-neutral sheen that was making this joinery read galvanised, but it took
// the board and slat definition with it: high-pass detail fell 25-40% on the
// shutter panels and lattice bars, entirely at the highlight end, and the
// lattice stopped reading as battens standing proud of the opening. What
// belongs there is not the broad specular that was killed but a narrow warm
// highlight on the arrises themselves, so the edges catch light as timber does
// without the flat sheen returning across the faces.
// Halved alongside the chroma pull-back. At 0.058 red the arris catch was the
// brightest, most saturated thing on every member and, repeated on every frame
// and batten in the closeup, it read as a copper rim rather than light caught on
// an edge. It still separates the boards; it no longer colours them.
diffuseColor.rgb += vec3(0.030, 0.023, 0.015)
  * kitOuterEdge
  * (1.0 - kitTierHardwareMask);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float kitRoughVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitRoughHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitRoughVertexValue)" : "0.0"};
float kitRoughOuterEdge = smoothstep(0.30, 0.50, min(abs(vKitLocalPos.x), abs(vKitLocalPos.y)));
roughnessFactor = mix(roughnessFactor + kitRoughOuterEdge * 0.055, 0.43, kitRoughHardwareMask);
// Weathered, unfinished timber in shade is very nearly a pure diffuse surface.
// Left glossier, its specular lobe is white — a dielectric reflects the sky
// uncoloured — so it is added on top of the diffuse colour and drags the
// surface toward neutral. That is why four successive albedo-side levers
// (tint, wear colour, chroma scale, role tint) all failed to lift this
// joinery's chroma: the term diluting it was never in the albedo.
roughnessFactor = mix(max(roughnessFactor, 0.97), roughnessFactor, kitRoughHardwareMask);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
float kitMetalVertexValue = dot(vColor.rgb, vec3(0.333333));
float kitMetalHardwareMask = ${hasHardwareMask ? "1.0 - smoothstep(0.27, 0.40, kitMetalVertexValue)" : "0.0"};
// Hinges and straps on a bazaar facade are painted or oxidised, not polished.
// Full metal here has no diffuse and only a low-intensity sky probe to
// reflect, which renders hardware as a black hole punched through the wood.
metalnessFactor = mix(metalnessFactor, 0.26, kitMetalHardwareMask);`,
      );
    }
  };

  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = (): string => `${previousProgramCacheKey()}|kit-finish:${finish}:v10`;
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
  // No transmission on cloth: any transmissive material forces three to
  // re-render the entire opaque scene into a separate target every frame,
  // and the sun-through-cloth read at 0.08-0.1 transmission is too subtle
  // to justify that.
  const awningCloth = new MeshPhysicalMaterial({
    color: 0xffffff,
    map: stripedClothMap,
    roughness: 0.94,
    metalness: 0,
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
