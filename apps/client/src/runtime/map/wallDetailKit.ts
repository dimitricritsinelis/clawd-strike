import {
  BatchedMesh,
  BufferGeometry,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { applyWallShaderTweaks } from "../render/materials/applyWallShaderTweaks";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";
import { resolveWallShaderProfile } from "./wallShaderProfiles";
import {
  createSaggingAwningGeometry,
  createScallopedValanceGeometry,
  createAttachmentBracketGeometry,
} from "./wallDetailFamilies/awningsFixtures";
import {
  createOpenBottomArchRecessGeometry,
  createOpenBottomPointedArchFrameGeometry,
  createArchSpandrelGeometry,
} from "./wallDetailFamilies/arches";
import { createDoorVoidArchGeometry, createPaneledDoorGeometry } from "./wallDetailFamilies/doors";
import {
  createFacadeBoundaryChamferGeometry,
  createFacadeWallShellGeometry,
  createOpenFrontFacadeShellGeometry,
  createTwoSidedFacadePlaneGeometry,
} from "./wallDetailFamilies/facadeShells";
import { createMerchantPotGeometry, createMerchantBasketGeometry, createFoldedTextileGeometry } from "./wallDetailFamilies/merchantGoods";
import { createShopTimberBackGeometry } from "./wallDetailFamilies/shops";
import { createMoldedTrimGeometry } from "./wallDetailFamilies/structuralTrims";
import {
  applyKitMaterialFinish,
  createMappedKitMaterial,
  createWallDetailMaterialBank,
  resolveKitMaterialFinish,
  type KitMappedMaterialRecipe,
  type KitPbrMaterialOptions,
} from "./wallDetailFamilies/kitMaterials";
import {
  createHeroPointedArchFrameGeometry,
  createHeroPointedArchPanelGeometry,
  createLouveredShutterGeometry,
  createInsetWindowRecessGeometry,
  createPointedArchFrameGeometry,
  createPointedArchPanelGeometry,
  createSpawnHeroCorbelGeometry,
  createSpawnHeroPedimentGeometry,
  createSpawnHeroPointedArchFrameGeometry,
  createSpawnHeroPointedArchPanelGeometry,
  createSpawnPointedArchFrameGeometry,
  createSpawnPointedArchPanelGeometry,
  createStainedGlassMaterial,
  createTimberWindowRecessGeometry,
} from "./wallDetailFamilies/windows";

import {
  DETAIL_MATERIAL_ROLES,
  DETAIL_MATERIAL_ROLE_BY_MESH,
  NON_SHADOW_DETAIL_IDS,
  WALL_DETAIL_RENDER_ORDER,
  WINDOW_GLASS_RENDER_ORDER,
  inheritsWallSurface,
  isStainedGlassMaterialId,
  resolveDetailStabilityClass,
  type BuildWallDetailMeshesOptions,
  type DetailBucket,
  type DetailMaterialRole,
  type DetailStabilityClass,
  type DetailTemplate,
  type WallDetailInstance,
  type WallDetailMeshId,
} from "./wallDetailFamilies/kitCore";
export {
  DETAIL_MATERIAL_ROLES,
  type BuildWallDetailMeshesOptions,
  type DetailMaterialRole,
  type WallDetailInstance,
  type WallDetailMeshId,
} from "./wallDetailFamilies/kitCore";

type TemplateMaterialOverrideId =
  | "tm_balcony_wood_dark"
  | "tm_balcony_painted_metal"
  | "tm_stained_glass_bright"
  | "tm_stained_glass_dim"
  | "tm_stained_glass_hero"
  | "tm_window_interior_merchant"
  | "tm_window_interior_residential"
  | "tm_window_interior_hero"
  | "tm_shop_interior_lining"
  | "tm_shop_interior_shadow"
  | "tm_arch_interior_warm"
  | "tm_arch_screen_dark"
  | "tm_arch_door_timber"
  | "tm_arch_spandrel_lime_plaster"
  | "tm_arch_spandrel_ochre_plaster"
  | "tm_service_interior";

function resolveKitPbrOptions(
  options: BuildWallDetailMeshesOptions,
): KitPbrMaterialOptions | undefined {
  if (options.wallMode !== "pbr" || !options.wallMaterials) return undefined;
  return {
    wallMaterials: options.wallMaterials,
    quality: options.quality,
    seed: options.seed,
  };
}

function createTemplates(
  options: BuildWallDetailMeshesOptions,
): Record<WallDetailMeshId, DetailTemplate> {
  const pbrOptions = resolveKitPbrOptions(options);
  const {
    stonePrimary,
    stoneTrim,
    stoneRecess,
    bracketMetal,
    cableMetal,
    frameTrim,
    woodShutter,
    weatheredTimber,
    shopTimber,
    shopDoorTimber,
    storageTimber,
    fortifiedTimber,
    warmRecess,
    shadedArchInterior,
    nicheRecess,
    darkScreen,
    awningCloth,
    tileBlue,
    windowGlass,
    roofBitumen,
  } = createWallDetailMaterialBank(options.highVis, pbrOptions);

  return {
    plinth_strip: {
      geometry: createMoldedTrimGeometry("plinth"),
      material: stoneTrim,
    },
    cornice_strip: {
      geometry: createMoldedTrimGeometry("cornice"),
      material: stoneTrim,
    },
    string_course_strip: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneTrim,
    },
    corner_pier: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stonePrimary,
    },
    vertical_edge_trim: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneTrim,
    },
    pilaster: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stonePrimary,
    },
    recessed_panel_frame_h: {
      geometry: new BoxGeometry(1, 1, 1),
      material: frameTrim,
    },
    recessed_panel_frame_v: {
      geometry: new BoxGeometry(1, 1, 1),
      material: frameTrim,
    },
    recessed_panel_back: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneRecess,
    },
    door_jamb: {
      geometry: new BoxGeometry(1, 1, 1),
      material: frameTrim,
    },
    door_lintel: {
      geometry: new BoxGeometry(1, 1, 1),
      material: frameTrim,
    },
    door_arch_lintel: {
      geometry: new CylinderGeometry(0.5, 0.5, 1, 14, 1, false, 0, Math.PI),
      material: frameTrim,
    },
    // Opening voids carry a warm interior value rather than the cool near-black
    // they shared before. Nothing behind these is lit, so at 0x2c3138 they
    // resolved to pure black rectangles in a sunlit frontage — a hole, not a
    // room. The value is dim enough to stay well under the wall it sits in.
    door_void: {
      geometry: new BoxGeometry(1, 1, 1),
      material: new MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.95, metalness: 0.0 }),
    },
    door_void_arch: {
      geometry: createDoorVoidArchGeometry(),
      material: new MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.95, metalness: 0.0 }),
    },
    door_panel_timber: {
      geometry: createPaneledDoorGeometry("residential"),
      material: weatheredTimber,
    },
    door_panel_shop: {
      geometry: createPaneledDoorGeometry("shop"),
      material: shopDoorTimber,
    },
    door_panel_storage: {
      geometry: createPaneledDoorGeometry("storage"),
      material: storageTimber,
    },
    door_panel_fortified: {
      geometry: createPaneledDoorGeometry("fortified"),
      material: fortifiedTimber,
    },
    shop_recess_back: {
      geometry: new BoxGeometry(1, 1, 1),
      material: warmRecess,
    },
    shop_recess_timber_back: {
      geometry: createShopTimberBackGeometry(),
      material: shopTimber,
    },
    shop_counter: {
      geometry: new BoxGeometry(1, 1, 1),
      material: shopTimber,
    },
    merchant_goods_pot: {
      geometry: createMerchantPotGeometry(),
      material: stoneTrim,
    },
    merchant_goods_basket: {
      geometry: createMerchantBasketGeometry(),
      material: weatheredTimber,
    },
    merchant_goods_folded_textile: {
      geometry: createFoldedTextileGeometry(),
      material: awningCloth,
    },
    arch_recess_back: {
      geometry: createOpenBottomArchRecessGeometry(),
      material: shadedArchInterior,
    },
    arch_pointed_frame: {
      geometry: createOpenBottomPointedArchFrameGeometry(),
      material: frameTrim,
    },
    arch_spandrel: {
      geometry: createArchSpandrelGeometry(),
      material: stonePrimary,
    },
    niche_recess_back: {
      geometry: new BoxGeometry(1, 1, 1),
      material: nicheRecess,
    },
    sign_bracket: {
      geometry: new BoxGeometry(1, 1, 1),
      material: bracketMetal,
    },
    awning_bracket: {
      geometry: createAttachmentBracketGeometry(),
      material: bracketMetal,
    },
    cable_segment: {
      geometry: new CylinderGeometry(0.5, 0.5, 1, 10, 1, true),
      material: cableMetal,
    },
    window_shutter: {
      geometry: createLouveredShutterGeometry(),
      material: woodShutter,
    },
    window_recess_dark: {
      geometry: createInsetWindowRecessGeometry(),
      material: new MeshStandardMaterial({
        // A window reveal is a lit room behind a grille, not a black slot. The
        // old value was cool and near-black, so every screened window on the map
        // punched a hole in its frontage instead of showing depth behind it.
        color: options.highVis ? 0x565046 : 0x4b453c,
        roughness: 0.96,
        metalness: 0.0,
      }),
    },
    window_recess_timber: {
      geometry: createTimberWindowRecessGeometry(),
      material: weatheredTimber,
    },
    window_screen: {
      geometry: new BoxGeometry(1, 1, 1),
      material: darkScreen,
    },
    window_screen_bar: {
      geometry: new BoxGeometry(1, 1, 1),
      material: darkScreen,
    },
    window_pointed_arch_void: {
      geometry: createPointedArchPanelGeometry(),
      material: new MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.96, metalness: 0.0 }),
    },
    window_pointed_arch_glass: {
      geometry: createPointedArchPanelGeometry(),
      material: createStainedGlassMaterial("bright"),
    },
    window_pointed_arch_frame: {
      geometry: createPointedArchFrameGeometry(),
      material: frameTrim,
    },
    spawn_window_pointed_arch_void: {
      geometry: createSpawnPointedArchPanelGeometry(),
      material: new MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.96, metalness: 0.0 }),
    },
    spawn_window_pointed_arch_glass: {
      geometry: createSpawnPointedArchPanelGeometry(),
      material: createStainedGlassMaterial("bright"),
    },
    spawn_window_pointed_arch_frame: {
      geometry: createSpawnPointedArchFrameGeometry(),
      material: frameTrim,
    },
    hero_window_pointed_arch_void: {
      geometry: createHeroPointedArchPanelGeometry(),
      material: new MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.96, metalness: 0.0 }),
    },
    hero_window_pointed_arch_glass: {
      geometry: createHeroPointedArchPanelGeometry(),
      material: createStainedGlassMaterial("bright"),
    },
    hero_window_pointed_arch_frame: {
      geometry: createHeroPointedArchFrameGeometry(),
      material: frameTrim,
    },
    spawn_hero_window_pointed_arch_void: {
      geometry: createSpawnHeroPointedArchPanelGeometry(),
      material: new MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.96, metalness: 0.0 }),
    },
    spawn_hero_window_pointed_arch_glass: {
      geometry: createSpawnHeroPointedArchPanelGeometry(),
      material: createStainedGlassMaterial("bright"),
    },
    spawn_hero_window_pointed_arch_frame: {
      geometry: createSpawnHeroPointedArchFrameGeometry(),
      material: frameTrim,
    },
    spawn_hero_pediment: {
      geometry: createSpawnHeroPedimentGeometry(),
      material: stoneTrim,
    },
    spawn_hero_corbel: {
      geometry: createSpawnHeroCorbelGeometry(),
      material: stoneTrim,
    },
    window_glass: {
      geometry: new BoxGeometry(1, 1, 1),
      material: windowGlass,
    },
    balcony_slab: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneTrim,
    },
    balcony_parapet: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneTrim,
    },
    balcony_railing: {
      geometry: new BoxGeometry(1, 1, 1),
      material: bracketMetal,
    },
    balcony_end_cap: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneTrim,
    },
    balcony_bracket: {
      geometry: new BoxGeometry(1, 1, 1),
      material: stoneTrim,
    },
    facade_wall_shell: {
      geometry: createFacadeWallShellGeometry(),
      material: stonePrimary,
    },
    facade_shell_open_front: {
      geometry: createOpenFrontFacadeShellGeometry(),
      material: stonePrimary,
    },
    facade_wall_infill: {
      geometry: createTwoSidedFacadePlaneGeometry(),
      material: stonePrimary,
    },
    facade_boundary_chamfer: {
      // Runtime buckets replace this safe profile with the exact authored
      // width/depth variant before instancing.
      geometry: createFacadeBoundaryChamferGeometry(2, 2, 0.62, {
        exposedEnds: "both",
        runM: 0.62,
      }),
      material: stonePrimary,
    },
    awning_cloth: {
      geometry: createSaggingAwningGeometry(),
      material: awningCloth,
    },
    awning_valance: {
      geometry: createScallopedValanceGeometry(),
      material: awningCloth,
    },
    awning_pole: {
      geometry: new CylinderGeometry(0.5, 0.5, 1, 10, 1, false),
      material: bracketMetal,
    },
    tile_accent: {
      geometry: new BoxGeometry(1, 1, 1),
      material: tileBlue,
    },
    roof_slab: {
      geometry: new BoxGeometry(1, 1, 1),
      material: roofBitumen,
    },
  };
}

function createTemplateMaterialOverrides(
  options: BuildWallDetailMeshesOptions,
): Record<TemplateMaterialOverrideId, MeshStandardMaterial | MeshPhysicalMaterial> {
  const highVis = options.highVis;
  const pbrOptions = resolveKitPbrOptions(options);
  const mapped = (
    recipe: KitMappedMaterialRecipe,
    fallback: MeshStandardMaterial,
  ): MeshStandardMaterial => (
    pbrOptions ? createMappedKitMaterial(pbrOptions, recipe) : fallback
  );
  // Recess interiors are seen through open bays and window grilles at player
  // height. Their tints are LIT interior values, not shadow values: the recess
  // finish already multiplies them by 0.34 to hold a bay under the sunlit wall
  // around it, and the previous tints — one of them 0x151713 — went through that
  // multiplier to essentially zero. Every shop opening and doorway on the map
  // rendered as a pure black rectangle punched in a bright frontage, which reads
  // as a hole rather than a room. These values are what a room lit only by its
  // own doorway actually reflects; the darkness still comes from the multiplier
  // and the recess depth, not from the albedo. Mapped alone they still resolve to one flat dim value across the
  // whole panel, which reads as a dark card pasted behind the bars instead of
  // a room; the plaster finish gives them aggregate, mottle and corner grime
  // at the same value.
  const mappedInterior = (
    recipe: KitMappedMaterialRecipe,
    fallback: MeshStandardMaterial,
  ): MeshStandardMaterial => {
    const material = mapped(recipe, fallback);
    applyKitMaterialFinish(material, "recess-plaster");
    return material;
  };
  return {
    tm_balcony_wood_dark: mapped({
      materialId: "ph_rough_pine_door",
      tintHex: highVis ? 0xb1885a : 0x946b45,
      roughness: 0.8,
      metalness: 0.02,
      albedoBoost: highVis ? 1.72 : 1.54,
      macroColorAmplitude: 0.02,
    }, new MeshStandardMaterial({
      color: highVis ? 0xb1885a : 0x946b45,
      roughness: 0.8,
      metalness: 0.02,
    })),
    tm_balcony_painted_metal: mapped({
      materialId: "ph_rusty_metal_02",
      tintHex: highVis ? 0x85837a : 0x69675f,
      roughness: 0.6,
      metalness: 0.52,
      albedoBoost: highVis ? 1.2 : 1.08,
      macroColorAmplitude: 0.018,
    }, new MeshStandardMaterial({
      color: highVis ? 0x7d868d : 0x626a72,
      roughness: 0.56,
      metalness: 0.4,
    })),
    tm_stained_glass_bright: createStainedGlassMaterial("bright"),
    tm_stained_glass_dim: createStainedGlassMaterial("dim"),
    tm_stained_glass_hero: createStainedGlassMaterial("hero"),
    tm_window_interior_merchant: mappedInterior({
      materialId: "ph_plastered_wall",
      tintHex: highVis ? 0x8a7a66 : 0x7a6b58,
      roughness: 0.94,
      metalness: 0,
      albedoBoost: highVis ? 1.0 : 0.92,
      macroColorAmplitude: 0.025,
    }, new MeshStandardMaterial({
      color: highVis ? 0x62574c : 0x554d45,
      roughness: 0.94,
      metalness: 0,
    })),
    tm_window_interior_residential: mappedInterior({
      materialId: "ph_beige_wall_002",
      tintHex: highVis ? 0x585349 : 0x4a463c,
      roughness: 0.96,
      metalness: 0,
      albedoBoost: highVis ? 0.98 : 0.9,
      macroColorAmplitude: 0.025,
    }, new MeshStandardMaterial({
      color: highVis ? 0x454846 : 0x343735,
      roughness: 0.96,
      metalness: 0,
    })),
    tm_window_interior_hero: mappedInterior({
      materialId: "ph_beige_wall_002",
      tintHex: highVis ? 0x6a706d : 0x5a5f5c,
      roughness: 0.94,
      metalness: 0,
      albedoBoost: highVis ? 0.98 : 0.9,
      macroColorAmplitude: 0.025,
    }, new MeshStandardMaterial({
      color: highVis ? 0x3f4849 : 0x303839,
      roughness: 0.94,
      metalness: 0,
    })),
    tm_shop_interior_lining: mappedInterior({
      materialId: "ph_plastered_wall",
      tintHex: highVis ? 0x7d6a52 : 0x6b5a45,
      roughness: 0.93,
      metalness: 0,
      albedoBoost: highVis ? 1.04 : 0.94,
      macroColorAmplitude: 0.025,
      dirtEnabled: true,
      dirtDarken: 0.16,
    }, new MeshStandardMaterial({
      color: highVis ? 0x62584e : 0x494139,
      roughness: 0.93,
      metalness: 0,
    })),
    tm_shop_interior_shadow: mappedInterior({
      materialId: "ph_beige_wall_002",
      tintHex: highVis ? 0x665e52 : 0x574f45,
      roughness: 0.97,
      metalness: 0,
      albedoBoost: highVis ? 0.96 : 0.88,
      macroColorAmplitude: 0.025,
    }, new MeshStandardMaterial({
      color: highVis ? 0x3f3c38 : 0x302e2a,
      roughness: 0.97,
      metalness: 0,
    })),
    tm_arch_interior_warm: mappedInterior({
      materialId: "ph_plastered_wall",
      tintHex: highVis ? 0x847969 : 0x6e6355,
      roughness: 0.96,
      metalness: 0,
      albedoBoost: highVis ? 1.0 : 0.91,
      macroColorAmplitude: 0.025,
    }, new MeshStandardMaterial({
      color: highVis ? 0x575149 : 0x423d37,
      roughness: 0.96,
      metalness: 0,
    })),
    tm_arch_screen_dark: mapped({
      materialId: "ph_rusty_metal_02",
      tintHex: highVis ? 0x584638 : 0x423127,
      roughness: 0.68,
      metalness: 0.48,
      albedoBoost: highVis ? 1.16 : 1.04,
      macroColorAmplitude: 0.018,
    }, new MeshStandardMaterial({
      color: highVis ? 0x4c3424 : 0x362319,
      roughness: 0.88,
      metalness: 0.01,
    })),
    tm_arch_door_timber: mapped({
      materialId: "ph_rough_pine_door",
      tintHex: highVis ? 0x875b3d : 0x684329,
      roughness: 0.88,
      metalness: 0.01,
      albedoBoost: highVis ? 1.72 : 1.54,
      macroColorAmplitude: 0.02,
    }, new MeshStandardMaterial({
      color: highVis ? 0x765036 : 0x593922,
      roughness: 0.88,
      metalness: 0.01,
    })),
    tm_arch_spandrel_lime_plaster: mapped({
      materialId: "ph_worn_plaster_sun",
      tintHex: highVis ? 0xd6cbb6 : 0xaaa397,
      roughness: 0.94,
      metalness: 0,
      albedoBoost: highVis ? 1.38 : 1.24,
      macroColorAmplitude: 0.055,
      dirtEnabled: true,
      dirtDarken: 0.12,
    }, new MeshStandardMaterial({
      color: highVis ? 0xc2b8a4 : 0x918b7f,
      roughness: 0.96,
      metalness: 0,
    })),
    tm_arch_spandrel_ochre_plaster: mapped({
      materialId: "ph_worn_plaster_ochre",
      tintHex: highVis ? 0xd2b589 : 0xac916c,
      roughness: 0.94,
      metalness: 0,
      albedoBoost: highVis ? 1.34 : 1.2,
      macroColorAmplitude: 0.055,
      dirtEnabled: true,
      dirtDarken: 0.14,
    }, new MeshStandardMaterial({
      color: highVis ? 0xc5a97f : 0xa28761,
      roughness: 0.96,
      metalness: 0,
    })),
    tm_service_interior: mappedInterior({
      materialId: "ph_beige_wall_002",
      tintHex: highVis ? 0x5f5a52 : 0x4e4941,
      roughness: 0.97,
      metalness: 0,
      albedoBoost: highVis ? 0.95 : 0.87,
      macroColorAmplitude: 0.025,
    }, new MeshStandardMaterial({
      color: highVis ? 0x3d3a35 : 0x2f2c29,
      roughness: 0.97,
      metalness: 0,
    })),
  };
}

function resolveMaterialUvOffset(seed: number, materialId: string): { x: number; y: number } {
  const offsetSeed = deriveSubSeed(seed, `wall-uvoffset:${materialId}`);
  const offsetRng = new DeterministicRng(offsetSeed);
  return {
    x: offsetRng.int(0, 4),
    y: offsetRng.int(0, 4),
  };
}

function resolveGeometryVariantKey(instance: WallDetailInstance): string {
  if (instance.meshId !== "facade_boundary_chamfer") {
    if (instance.boundaryChamfer) {
      throw new Error(
        `[wall-detail-kit] '${instance.placementId ?? instance.meshId}' declares a chamfer on non-chamfer geometry`,
      );
    }
    return "default";
  }
  const spec = instance.boundaryChamfer;
  if (!spec) {
    throw new Error(
      `[wall-detail-kit] '${instance.placementId ?? instance.meshId}' is missing its boundary chamfer profile`,
    );
  }
  // Exact authored numbers form deterministic aspect-ratio buckets. Avoid a
  // rounded category key: two widths that differ in source must never silently
  // share a cut ratio.
  return [
    spec.exposedEnds,
    instance.scale.x,
    instance.scale.y,
    instance.scale.z,
    spec.runM,
    spec.topBevel?.heightM ?? "square-top",
    spec.topBevel?.depthM ?? "square-top",
  ].join(":");
}

/**
 * Kit finishes turn `vertexColors` on for every material they touch, and the
 * batched/instanced paths carry each instance's authored tint in the vertex
 * color channel. A geometry with no `color` attribute therefore samples the
 * WebGL default generic attribute — black — which multiplies both the PBR
 * albedo and the authored tint down to zero and leaves only dielectric
 * specular. That is what turns whole families of plain box trim (jambs,
 * lintels, counters, awning poles and brackets) into a flat near-black
 * silhouette. Seeding an explicit white attribute makes the tint path a
 * no-op multiply for authored geometry and restores the material read for
 * everything else.
 */
function ensureVertexColorAttribute(geometry: BufferGeometry): BufferGeometry {
  if (geometry.hasAttribute("color")) return geometry;
  const vertexCount = geometry.getAttribute("position").count;
  geometry.setAttribute("color", new Float32BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3));
  return geometry;
}

const FACADE_WALL_SURFACE_IDS = new Set<WallDetailMeshId>([
  "facade_wall_shell",
  "facade_shell_open_front",
  "facade_wall_infill",
]);

/** These meshes are the building's wall planes, not trim on top of one. The
 * wall shader profiles gate streaks, chips and repair patches on the "wall"
 * surface kind, so classifying the frontage as detail left the largest surface
 * in every camera with only broad mottle and no close-range finish. */
function resolveWallShaderSurfaceKind(
  meshId: WallDetailMeshId,
  isBalconySurface: boolean,
): "wall" | "detail" | "balcony" {
  if (isBalconySurface) return "balcony";
  return FACADE_WALL_SURFACE_IDS.has(meshId) ? "wall" : "detail";
}

function resolveBucketGeometry(
  template: DetailTemplate,
  instance: WallDetailInstance,
): BufferGeometry {
  if (instance.meshId !== "facade_boundary_chamfer") return ensureVertexColorAttribute(template.geometry);
  const spec = instance.boundaryChamfer;
  if (!spec) {
    throw new Error(
      `[wall-detail-kit] '${instance.placementId ?? instance.meshId}' is missing its boundary chamfer profile`,
    );
  }
  return ensureVertexColorAttribute(
    createFacadeBoundaryChamferGeometry(instance.scale.x, instance.scale.y, instance.scale.z, spec),
  );
}

function buildBlockoutDetailMeshes(
  instances: readonly WallDetailInstance[],
  templates: Record<WallDetailMeshId, DetailTemplate>,
  root: Group,
): void {
  const grouped = new Map<string, {
    meshId: WallDetailMeshId;
    geometryVariantKey: string;
    instances: WallDetailInstance[];
  }>();
  for (const instance of instances) {
    const geometryVariantKey = resolveGeometryVariantKey(instance);
    const key = `${instance.meshId}|${geometryVariantKey}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.instances.push(instance);
    } else {
      grouped.set(key, {
        meshId: instance.meshId,
        geometryVariantKey,
        instances: [instance],
      });
    }
  }

  const dummy = new Object3D();
  for (const bucket of grouped.values()) {
    const template = templates[bucket.meshId];
    const geometry = resolveBucketGeometry(template, bucket.instances[0]!);
    const mesh = new InstancedMesh(geometry, template.material, bucket.instances.length);
    mesh.name = `wall-detail-${bucket.meshId}-${bucket.geometryVariantKey}`;
    const isGlassMesh =
      bucket.meshId === "window_pointed_arch_glass"
      || bucket.meshId === "spawn_window_pointed_arch_glass"
      || bucket.meshId === "hero_window_pointed_arch_glass"
      || bucket.meshId === "spawn_hero_window_pointed_arch_glass";
    mesh.castShadow = !isGlassMesh && !NON_SHADOW_DETAIL_IDS.has(bucket.meshId);
    // Wall detail receives shadow, like every other system in the scene
    // (buildPbrWalls, buildPbrFloors, the prop batches). Leaving it off meant
    // every massing shell and relief module was lit as if nothing occluded it.
    //
    // Every other system in the scene receives shadow (buildPbrWalls,
    // buildPbrFloors, the prop batches); the frontage kit is the sole exception,
    // so every massing shell and relief module is lit as if nothing occludes it.
    // That is why this map holds only 6.9% of pixels below luminance 60 on the
    // Spawn-A approach where its target holds 29.1%, and why raising the key,
    // cutting the fill and moving shadow bias in both directions were all
    // measured no-ops — none of them touch surfaces that never sample the map.
    //
    // Enabling it was tried and measured. It improves the west-frontage
    // elevation clearly (MAE 28.67 vs 29.47, bay interiors 48 -> 39 against a
    // target of 29, relative contrast 0.458 -> 0.468) and costs only 0.3 ms of
    // desktop frame time. But on the Spawn-A approach it blankets the whole
    // west frontage plane to luminance 71 where the target has it SUNLIT at
    // 148, with a hard shadow edge only at x~130. The dimming is binary ~0.47x
    // with no penumbra and every boundary on a mesh edge, and raising bias to
    // 0.05 did not move it — so those planes are resolving as genuinely
    // occluded, not self-shadowing.
    //
    // Re-enable once that is understood: find what the shadow map thinks is
    // occluding that plane. The exit-west return kit standing ~1 m proud of the
    // y=14 wall plane is the prime suspect.
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.renderOrder = isGlassMesh ? WINDOW_GLASS_RENDER_ORDER : WALL_DETAIL_RENDER_ORDER;
    attachVisualQaMetadata(mesh, bucket.instances, bucket.meshId, "blockout");

    for (let index = 0; index < bucket.instances.length; index += 1) {
      const instance = bucket.instances[index]!;
      dummy.position.set(instance.position.x, instance.position.y, instance.position.z);
      dummy.rotation.set(instance.pitchRad ?? 0, instance.yawRad, instance.rollRad ?? 0);
      dummy.scale.set(instance.scale.x, instance.scale.y, instance.scale.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }
}

function resolveSemanticClass(meshId: WallDetailMeshId): string {
  if (meshId.startsWith("door_")) return "door";
  if (meshId.startsWith("window_")) return "window";
  if (meshId.startsWith("awning_")) return "awning";
  if (meshId.startsWith("shop_")) return "shopfront";
  if (meshId === "arch_recess_back") return "architectural_recess";
  if (meshId === "arch_spandrel") return "architectural_spandrel";
  if (meshId === "niche_recess_back") return "blind_niche";
  if (meshId === "facade_wall_shell") return "massing";
  if (meshId === "facade_shell_open_front") return "segmented_massing";
  if (meshId === "facade_wall_infill") return "facade_wall_infill";
  if (meshId === "facade_boundary_chamfer") return "facade_wall_infill";
  if (meshId === "roof_slab") return "roof";
  if (meshId.includes("parapet")) return "parapet";
  if (meshId === "tile_accent") return "architectural_accent";
  return "facade_module";
}

function attachVisualQaMetadata(
  mesh: InstancedMesh,
  instances: readonly WallDetailInstance[],
  meshId: WallDetailMeshId,
  materialMode: "blockout" | "pbr",
): void {
  const shadowMode = mesh.castShadow ? "cast" : mesh.receiveShadow ? "receive" : "none";
  mesh.userData.visualQa = {
    moduleId: meshId,
    semanticClass: resolveSemanticClass(meshId),
    representation: "module",
    materialMode,
    shadowMode,
  };
  mesh.userData.visualQaInstances = instances.map((instance, index) => ({
    placementId: instance.placementId ?? `${mesh.name || meshId}:${index}`,
    moduleId: instance.moduleId ?? meshId,
    semanticClass: instance.semanticClass ?? resolveSemanticClass(meshId),
    representation: "module",
    materialMode,
    groundedGapM: 0,
    dimensions: instance.visualQaDimensions ?? {
      x: instance.scale.x,
      y: instance.scale.y,
      z: instance.scale.z,
    },
    uvProjection: instance.uvProjection ?? "default",
    ...(instance.backingPlacementId ? { backingPlacementId: instance.backingPlacementId } : {}),
    ...(instance.structurallyBacked ? { structurallyBacked: true } : {}),
    ...(instance.boundaryChamfer ? { boundaryChamfer: { ...instance.boundaryChamfer } } : {}),
    shadowMode,
  }));
}

function buildPbrDetailMeshes(
  instances: readonly WallDetailInstance[],
  templates: Record<WallDetailMeshId, DetailTemplate>,
  root: Group,
  options: BuildWallDetailMeshesOptions,
): void {
  const wallMaterials = options.wallMaterials;
  if (!wallMaterials) return;

  const materialIds = wallMaterials.getMaterialIds();
  if (materialIds.length === 0) return;
  const fallbackMaterialId = materialIds[0]!;
  const availableMaterialIds = new Set(materialIds);
  const templateMaterialOverrides = createTemplateMaterialOverrides(options);
  const availableTemplateMaterialIds = new Set<string>(Object.keys(templateMaterialOverrides));

  const grouped = new Map<string, DetailBucket>();
  for (const instance of instances) {
    const shouldInheritWallSurface = inheritsWallSurface(instance.meshId);
    const preferred = instance.detailMaterialId ?? (instance.trimMaterialId ?? instance.wallMaterialId);
    const defaultMaterialRole = DETAIL_MATERIAL_ROLE_BY_MESH[instance.meshId] ?? null;
    const materialRole: DetailMaterialRole | null = preferred === "ph_rough_pine_door"
      ? defaultMaterialRole === "painted-wood" || defaultMaterialRole === "shadowed-timber"
        ? defaultMaterialRole
        : "timber"
      : preferred === "ph_worn_planks"
        ? "painted-wood"
        : preferred === "ph_rusty_metal_02"
          ? "iron"
          : defaultMaterialRole;
    const roleSpec = materialRole ? DETAIL_MATERIAL_ROLES[materialRole] : null;
    // Painted shutters and iron fixtures own their PBR source. Older authored
    // profiles often pass the rough-pine or stone fallback ids; retaining
    // those ids would keep the right tint while sampling the wrong material.
    const roleOwnsMaterialSource = (
      materialRole === "painted-wood" || materialRole === "iron"
    ) && Boolean(roleSpec && availableMaterialIds.has(roleSpec.materialId));

    let materialSource: DetailBucket["materialSource"] = "mesh-template";
    let resolvedMaterialId: string | null = null;
    if (preferred && availableMaterialIds.has(preferred) && !roleOwnsMaterialSource) {
      materialSource = "manifest";
      resolvedMaterialId = preferred;
    } else if (preferred && availableTemplateMaterialIds.has(preferred) && !roleOwnsMaterialSource) {
      materialSource = "template";
      resolvedMaterialId = preferred;
    } else if (roleSpec && availableMaterialIds.has(roleSpec.materialId)) {
      materialSource = "manifest";
      resolvedMaterialId = roleSpec.materialId;
    } else if (shouldInheritWallSurface) {
      materialSource = "manifest";
      resolvedMaterialId = fallbackMaterialId;
    }

    const uvProjection = materialRole && materialSource === "manifest"
      ? "world"
      : (instance.uvProjection ?? "default");
    if (uvProjection === "world" && materialSource !== "manifest") {
      throw new Error(
        `[wall-detail-kit] '${instance.placementId ?? instance.meshId}' requires a manifest material for world-scale UV projection`,
      );
    }
    const geometryVariantKey = resolveGeometryVariantKey(instance);
    const key = `${instance.meshId}|${geometryVariantKey}|${materialSource}|${resolvedMaterialId ?? "template"}|${materialRole ?? "authored"}|${uvProjection}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.instances.push(instance);
      continue;
    }
    grouped.set(key, {
      meshId: instance.meshId,
      geometryVariantKey,
      materialId: resolvedMaterialId,
      materialSource,
      uvProjection,
      materialRole,
      instances: [instance],
    });
  }

  const surfaceMaterialCache = new Map<string, MeshStandardMaterial>();
  const getSurfaceMaterial = (
    materialId: string,
    surfaceKind: "wall" | "detail" | "balcony",
    stabilityClass: DetailStabilityClass,
    materialRole: DetailMaterialRole | null,
    meshId: WallDetailMeshId,
  ): MeshStandardMaterial => {
    const kitFinish = resolveKitMaterialFinish(meshId, materialId);
    const cacheKey = `${materialId}|${surfaceKind}|${stabilityClass}|${materialRole ?? "authored"}|${kitFinish ?? "base"}`;
    const cached = surfaceMaterialCache.get(cacheKey);
    if (cached) return cached;

    const material = wallMaterials.createStandardMaterial(materialId, options.quality);
    material.userData.wallDetailPbrMaterialId = materialId;
    if (materialRole) {
      const role = DETAIL_MATERIAL_ROLES[materialRole];
      material.color.setHex(role.tintHex);
      if (role.roughness !== undefined) material.roughness = role.roughness;
      if (role.metalness !== undefined) material.metalness = role.metalness;
      material.userData.detailMaterialRole = materialRole;
    }
    const albedoBoost =
      typeof material.userData.wallAlbedoBoost === "number" && Number.isFinite(material.userData.wallAlbedoBoost)
        ? material.userData.wallAlbedoBoost
        : 1;
    // Timber is CAPPED here, not floored. The soft-saturation boost is
    // f(x,b) = xb / (1 + (b-1)x), which at b=2 lifts a 0.10 albedo to 0.18
    // while pulling 0.90 down to 0.95 — it compresses the whole range toward
    // white. Flooring timber at 2.16 therefore erased the plank texture's own
    // grain contrast and chroma and rendered every shelf, post and counter as
    // the same pale pink film, which no amount of tinting or tiling downstream
    // could put back. Ironwork keeps its floor: it is genuinely dark and small,
    // and needs the lift to stay readable.
    const resolvedAlbedoBoost = materialId === "ph_rough_pine_door"
      ? Math.min(1.18, albedoBoost)
      : materialId === "ph_worn_planks"
        ? Math.min(1.12, albedoBoost)
        : materialId === "ph_rusty_metal_02"
          ? Math.max(1.3, albedoBoost)
          : albedoBoost;
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
    material.emissiveMap = null;
    // Facade ironwork is drawn at member scale — a strut is ~85 mm across and a
    // bracket smaller still. Sampling the shared one-metre metal tile leaves
    // each of them showing a single near-uniform patch, so they read as
    // untextured primitives at two metres however they are valued. Give the
    // role a member-scale texel density instead.
    // Timber joinery has exactly the same problem the iron factor was written
    // for, and it covers far more of the frontage. A window grille bar is
    // 52-65 mm across and a frame jamb 140 mm, but they sample the shared
    // 1.4 m plank tile, so each member shows one near-constant patch of
    // albedo and normal — no grain, no board joint, no edge relief. They read
    // as painted plastic sticks at two metres however they are tinted. Scale
    // texel density to the member, keyed off the finish because that is what
    // already distinguishes a 52 mm bar from a 700 mm shutter leaf.
    // Member-scale texel density, same reasoning as the `iron` factor above:
    // a 52 mm grille bar sampling the shared 1.4 m plank tile shows one
    // near-constant patch of albedo and normal. Keyed off the finish because
    // that is what distinguishes a 52 mm bar from a 700 mm shutter leaf.
    //
    // These values are a measured floor, not a starting point — do not push
    // them lower. At 0.13 for `timber-window` the leaves lost detail rather
    // than gaining it (high-frequency detail 3.0% -> 2.4%) and saturation
    // collapsed to 0.01, because tiling far below screen texel density just
    // resolves to the flat mip average.
    const kitFinishTileScale = kitFinish === "timber-screen"
      ? 0.1
      : kitFinish === "timber-surface"
        ? 0.14
        : kitFinish === "timber-window"
          ? 0.45
          : kitFinish === "timber-door"
            ? 0.55
            : 1;
    const tileSizeM = materialRole === "iron"
      ? wallMaterials.getTileSizeM(materialId) * 0.12
      : wallMaterials.getTileSizeM(materialId) * kitFinishTileScale;
    const uvOffset = resolveMaterialUvOffset(options.seed, materialId);
    applyWallShaderTweaks(material, {
      albedoBoost: resolvedAlbedoBoost,
      macroColorAmplitude: 0.08,
      macroRoughnessAmplitude: 0.05,
      macroFrequency: 0.18,
      macroSeed: deriveSubSeed(options.seed, `wall-macro:${materialId}`),
      tileSizeM,
      uvOffset,
      dirtEnabled: true,
      floorTopY: 0,
      dirtHeightM: 1.5,
      dirtDarken: 0.22,
      dirtRoughnessBoost: 0.12,
      ...resolveWallShaderProfile(materialId, surfaceKind),
    });
    if (kitFinish) applyKitMaterialFinish(material, kitFinish);
    if (stabilityClass === "surface-trim") {
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -1;
      material.needsUpdate = true;
    }
    surfaceMaterialCache.set(cacheKey, material);
    return material;
  };

  const dummy = new Object3D();
  const tintColor = new Color();
  const instanceColor = new Color();
  // Repeated timber members are cut from different boards. Without this, a run
  // of shutters, posts or shelves shares one albedo exactly and the assembly
  // reads as extruded rather than built. Seeded off the placement id so the
  // variation is stable and reproducible, and kept narrow enough that no member
  // leaves its tier's value band.
  const applyTimberMemberVariation = (
    color: Color,
    meshId: WallDetailMeshId,
    materialId: string | null,
    placementId: string,
  ): void => {
    const finish = resolveKitMaterialFinish(meshId, materialId);
    if (
      finish !== "timber-door"
      && finish !== "timber-window"
      && finish !== "timber-screen"
      && finish !== "timber-surface"
    ) {
      return;
    }
    const rng = new DeterministicRng(deriveSubSeed(options.seed, `kit-timber-member:${placementId}`));
    const value = 0.88 + rng.next() * 0.24;
    const warmth = (rng.next() - 0.5) * 0.06;
    color.setRGB(
      color.r * value * (1 + warmth),
      color.g * value,
      color.b * value * (1 - warmth),
    );
  };
  // Large compiled maps contain many distinct detail geometries but far fewer
  // compatible material/shadow states. BatchedMesh preserves the individual
  // transforms and per-instance colors while issuing one draw per compatible
  // group, instead of one InstancedMesh draw for every geometry variant. Keep
  // the small-fixture path below for focused tests and isolated module builds.
  const shouldBatchCompiledMap = grouped.size >= 64 && instances.length >= 1_024;
  if (shouldBatchCompiledMap) {
    type PreparedDetailBucket = {
      bucket: DetailBucket;
      geometry: BufferGeometry;
      material: MeshStandardMaterial | MeshPhysicalMaterial;
      castShadow: boolean;
      renderOrder: number;
      attributeSignature: string;
    };
    const prepared: PreparedDetailBucket[] = [];
    for (const bucket of grouped.values()) {
      const template = templates[bucket.meshId];
      const isBalconySurface = bucket.meshId.startsWith("balcony_");
      const stabilityClass = resolveDetailStabilityClass(bucket.meshId);
      const material =
        bucket.materialSource === "manifest" && bucket.materialId
          ? getSurfaceMaterial(
              bucket.materialId,
              resolveWallShaderSurfaceKind(bucket.meshId, isBalconySurface),
              stabilityClass,
              bucket.materialRole,
              bucket.meshId,
            )
          : bucket.materialSource === "template" && bucket.materialId
            ? templateMaterialOverrides[bucket.materialId as TemplateMaterialOverrideId]
            : template.material;
      if (bucket.uvProjection === "world") material.userData.wallUvProjection = "world";
      const geometry = resolveBucketGeometry(template, bucket.instances[0]!);
      const attributeSignature = [
        geometry.index ? "indexed" : "nonindexed",
        ...Object.entries(geometry.attributes)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`),
      ].join("|");
      prepared.push({
        bucket,
        geometry,
        material,
        castShadow: !isStainedGlassMaterialId(bucket.materialId) && !NON_SHADOW_DETAIL_IDS.has(bucket.meshId),
        renderOrder: bucket.meshId === "window_pointed_arch_glass" || isStainedGlassMaterialId(bucket.materialId)
          ? WINDOW_GLASS_RENDER_ORDER
          : WALL_DETAIL_RENDER_ORDER,
        attributeSignature,
      });
    }

    const batchGroups = new Map<string, PreparedDetailBucket[]>();
    for (const entry of prepared) {
      const key = [
        entry.material.uuid,
        entry.castShadow ? "cast" : "no-cast",
        entry.renderOrder,
        entry.bucket.uvProjection,
        entry.attributeSignature,
      ].join("|");
      const existing = batchGroups.get(key);
      if (existing) existing.push(entry);
      else batchGroups.set(key, [entry]);
    }

    let batchIndex = 0;
    for (const entries of batchGroups.values()) {
      const material = entries[0]!.material;
      const uniqueGeometries = new Map<string, BufferGeometry>();
      let maxInstanceCount = 0;
      for (const entry of entries) {
        uniqueGeometries.set(entry.geometry.uuid, entry.geometry);
        maxInstanceCount += entry.bucket.instances.length;
      }
      let maxVertexCount = 0;
      let maxIndexCount = 0;
      for (const geometry of uniqueGeometries.values()) {
        maxVertexCount += geometry.getAttribute("position").count;
        maxIndexCount += geometry.index?.count ?? geometry.getAttribute("position").count;
      }
      const mesh = new BatchedMesh(
        Math.max(1, maxInstanceCount),
        Math.max(1, maxVertexCount),
        Math.max(1, maxIndexCount),
        material,
      );
      mesh.name = `wall-detail-batched-${batchIndex++}-${entries[0]!.bucket.materialId ?? "template"}`;
      mesh.castShadow = entries[0]!.castShadow;
      mesh.receiveShadow = true;
      mesh.renderOrder = entries[0]!.renderOrder;
      mesh.frustumCulled = true;
      mesh.perObjectFrustumCulled = true;
      mesh.sortObjects = material.transparent;
      const geometryIds = new Map<string, number>();
      const visualQaInstances: Array<Record<string, unknown>> = [];
      for (const entry of entries) {
        let geometryId = geometryIds.get(entry.geometry.uuid);
        if (typeof geometryId !== "number") {
          geometryId = mesh.addGeometry(entry.geometry);
          geometryIds.set(entry.geometry.uuid, geometryId);
        }
        const shadowMode = mesh.castShadow ? "cast" : mesh.receiveShadow ? "receive" : "none";
        for (const instance of entry.bucket.instances) {
          const instanceId = mesh.addInstance(geometryId);
          dummy.position.set(instance.position.x, instance.position.y, instance.position.z);
          dummy.rotation.set(instance.pitchRad ?? 0, instance.yawRad, instance.rollRad ?? 0);
          dummy.scale.set(instance.scale.x, instance.scale.y, instance.scale.z);
          dummy.updateMatrix();
          mesh.setMatrixAt(instanceId, dummy.matrix);
          if (typeof instance.detailTintHex === "number") {
            tintColor.setHex(instance.detailTintHex);
            instanceColor.setRGB(
              material.color.r > 1e-5 ? tintColor.r / material.color.r : tintColor.r,
              material.color.g > 1e-5 ? tintColor.g / material.color.g : tintColor.g,
              material.color.b > 1e-5 ? tintColor.b / material.color.b : tintColor.b,
            );
          } else {
            instanceColor.setRGB(1, 1, 1);
          }
          applyTimberMemberVariation(
            instanceColor,
            entry.bucket.meshId,
            entry.bucket.materialId,
            instance.placementId ?? `${entry.bucket.meshId}:${instanceId}`,
          );
          mesh.setColorAt(instanceId, instanceColor);
          visualQaInstances.push({
            placementId: instance.placementId ?? `${mesh.name}:${instanceId}`,
            moduleId: instance.moduleId ?? entry.bucket.meshId,
            semanticClass: instance.semanticClass ?? resolveSemanticClass(entry.bucket.meshId),
            representation: "module",
            materialMode: "pbr",
            groundedGapM: 0,
            dimensions: instance.visualQaDimensions ?? {
              x: instance.scale.x,
              y: instance.scale.y,
              z: instance.scale.z,
            },
            uvProjection: instance.uvProjection ?? "default",
            ...(instance.backingPlacementId ? { backingPlacementId: instance.backingPlacementId } : {}),
            ...(instance.structurallyBacked ? { structurallyBacked: true } : {}),
            ...(instance.boundaryChamfer ? { boundaryChamfer: { ...instance.boundaryChamfer } } : {}),
            shadowMode,
          });
        }
      }
      mesh.userData.visualQa = {
        moduleId: "batched_wall_detail",
        semanticClass: "facade_module",
        representation: "module",
        materialMode: "pbr",
        shadowMode: mesh.castShadow ? "cast" : "none",
        uvProjection: entries[0]!.bucket.uvProjection,
      };
      mesh.userData.visualQaInstances = visualQaInstances;
      mesh.userData.batchedGeometryCount = geometryIds.size;
      mesh.userData.batchedInstanceCount = maxInstanceCount;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      root.add(mesh);
    }
    return;
  }

  for (const bucket of grouped.values()) {
    const template = templates[bucket.meshId];
    const isBalconySurface = bucket.meshId.startsWith("balcony_");
    const stabilityClass = resolveDetailStabilityClass(bucket.meshId);
    const material =
      bucket.materialSource === "manifest" && bucket.materialId
        ? getSurfaceMaterial(
            bucket.materialId,
            resolveWallShaderSurfaceKind(bucket.meshId, isBalconySurface),
            stabilityClass,
            bucket.materialRole,
            bucket.meshId,
          )
        : bucket.materialSource === "template" && bucket.materialId
          ? templateMaterialOverrides[bucket.materialId as TemplateMaterialOverrideId]
          : template.material;
    if (bucket.uvProjection === "world") {
      // Manifest surfaces run through applyWallShaderTweaks, whose vertex
      // projection derives UVs from world position. One material-level offset
      // is therefore shared by every infill rectangle instead of restarting
      // the texture at each instance's local 0..1 box coordinates.
      material.userData.wallUvProjection = "world";
    }
    const geometry = resolveBucketGeometry(template, bucket.instances[0]!);
    const mesh = new InstancedMesh(geometry, material, bucket.instances.length);
    mesh.name = bucket.materialId
      ? `wall-detail-${bucket.meshId}-${bucket.geometryVariantKey}-${bucket.materialSource}-${bucket.materialId}`
      : `wall-detail-${bucket.meshId}-${bucket.geometryVariantKey}-template`;
    mesh.castShadow = !isStainedGlassMaterialId(bucket.materialId) && !NON_SHADOW_DETAIL_IDS.has(bucket.meshId);
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.renderOrder = bucket.meshId === "window_pointed_arch_glass" || isStainedGlassMaterialId(bucket.materialId)
      ? WINDOW_GLASS_RENDER_ORDER
      : WALL_DETAIL_RENDER_ORDER;
    attachVisualQaMetadata(mesh, bucket.instances, bucket.meshId, "pbr");
    mesh.userData.visualQa.uvProjection = bucket.uvProjection;

    for (let index = 0; index < bucket.instances.length; index += 1) {
      const instance = bucket.instances[index]!;
      dummy.position.set(instance.position.x, instance.position.y, instance.position.z);
      dummy.rotation.set(instance.pitchRad ?? 0, instance.yawRad, instance.rollRad ?? 0);
      dummy.scale.set(instance.scale.x, instance.scale.y, instance.scale.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (typeof instance.detailTintHex === "number") {
        tintColor.setHex(instance.detailTintHex);
        instanceColor.setRGB(
          material.color.r > 1e-5 ? tintColor.r / material.color.r : tintColor.r,
          material.color.g > 1e-5 ? tintColor.g / material.color.g : tintColor.g,
          material.color.b > 1e-5 ? tintColor.b / material.color.b : tintColor.b,
        );
      } else {
        instanceColor.setRGB(1, 1, 1);
      }
      applyTimberMemberVariation(
        instanceColor,
        bucket.meshId,
        bucket.materialId,
        instance.placementId ?? `${bucket.meshId}:${index}`,
      );
      mesh.setColorAt(index, instanceColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
  }
}

export function buildWallDetailMeshes(
  instances: readonly WallDetailInstance[],
  options: BuildWallDetailMeshesOptions,
): Group {
  const root = new Group();
  root.name = "map-wall-details";
  if (instances.length === 0) {
    return root;
  }

  const templates = createTemplates(options);
  if (options.wallMode !== "pbr" || !options.wallMaterials) {
    buildBlockoutDetailMeshes(instances, templates, root);
    return root;
  }

  buildPbrDetailMeshes(instances, templates, root, options);
  return root;
}
