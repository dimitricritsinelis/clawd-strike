import type { BufferGeometry, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import type { WallMaterialLibrary, WallTextureQuality } from "../../render/materials/WallMaterialLibrary";
import type { RuntimeWallMode } from "../../utils/UrlParams";

export type WallDetailMeshId =
  | "plinth_strip"
  | "cornice_strip"
  | "string_course_strip"
  | "corner_pier"
  | "vertical_edge_trim"
  | "pilaster"
  | "recessed_panel_frame_h"
  | "recessed_panel_frame_v"
  | "recessed_panel_back"
  | "door_jamb"
  | "door_lintel"
  | "door_arch_lintel"
  | "door_void"
  | "door_void_arch"
  | "door_panel_timber"
  | "door_panel_shop"
  | "door_panel_storage"
  | "door_panel_fortified"
  | "shop_recess_back"
  | "shop_recess_timber_back"
  | "shop_counter"
  | "merchant_goods_pot"
  | "merchant_goods_basket"
  | "merchant_goods_folded_textile"
  | "arch_recess_back"
  | "arch_pointed_frame"
  | "arch_spandrel"
  | "niche_recess_back"
  | "sign_bracket"
  | "awning_bracket"
  | "cable_segment"
  | "window_shutter"
  | "window_recess_dark"
  | "window_recess_timber"
  | "window_screen"
  | "window_screen_bar"
  | "window_pointed_arch_void"
  | "window_pointed_arch_glass"
  | "window_pointed_arch_frame"
  | "spawn_window_pointed_arch_void"
  | "spawn_window_pointed_arch_glass"
  | "spawn_window_pointed_arch_frame"
  | "hero_window_pointed_arch_void"
  | "hero_window_pointed_arch_glass"
  | "hero_window_pointed_arch_frame"
  | "spawn_hero_window_pointed_arch_void"
  | "spawn_hero_window_pointed_arch_glass"
  | "spawn_hero_window_pointed_arch_frame"
  | "spawn_hero_pediment"
  | "spawn_hero_corbel"
  | "window_glass"
  | "balcony_slab"
  | "balcony_parapet"
  | "balcony_railing"
  | "balcony_end_cap"
  | "balcony_bracket"
  | "facade_wall_shell"
  | "facade_shell_open_front"
  | "facade_wall_infill"
  | "facade_boundary_chamfer"
  | "awning_cloth"
  | "awning_valance"
  | "awning_pole"
  | "tile_accent"
  | "roof_slab";

export type WallDetailInstance = {
  /** Stable compiled placement id used by internal visual QA. */
  placementId?: string;
  /** Stable compiled facade module id used by internal visual QA. */
  moduleId?: string;
  /** Semantic class used by internal visual QA; never exposed publicly. */
  semanticClass?: string;
  meshId: WallDetailMeshId;
  position: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
  /** Semantic envelope used by visual QA when the rendered mesh is only one
   * surface of a deeper assembled module (for example a shop recess back). */
  visualQaDimensions?: {
    x: number;
    y: number;
    z: number;
  };
  /** Stable massing placement that geometrically backs a thin facade face. */
  backingPlacementId?: string;
  /** True only when the backing volume covers this instance's full span. */
  structurallyBacked?: boolean;
  /** Real facade-edge prism profile. Its XZ cut is bucketed by authored world
   * dimensions so non-uniform instance scaling cannot distort the angle. */
  boundaryChamfer?: {
    exposedEnds: "none" | "left" | "right" | "both";
    runM: number;
    topBevel?: {
      heightM: number;
      depthM: number;
    };
  };
  yawRad: number;
  pitchRad?: number;
  rollRad?: number;
  /** Forces the manifest material path that projects texture coordinates in world meters. */
  uvProjection?: "world";
  wallMaterialId: string | null;
  trimMaterialId: string | null;
  detailMaterialId?: string | null;
  /** Optional deterministic multiplier tint for manifest-backed detail roles. */
  detailTintHex?: number;
};

export type BuildWallDetailMeshesOptions = {
  highVis: boolean;
  wallMode: RuntimeWallMode;
  wallMaterials: WallMaterialLibrary | null;
  quality: WallTextureQuality;
  seed: number;
};

export type DetailTemplate = {
  geometry: BufferGeometry;
  material: MeshStandardMaterial | MeshPhysicalMaterial;
};

export type DetailBucket = {
  meshId: WallDetailMeshId;
  geometryVariantKey: string;
  materialId: string | null;
  materialSource: "manifest" | "template" | "mesh-template";
  uvProjection: "world" | "default";
  materialRole: DetailMaterialRole | null;
  instances: WallDetailInstance[];
};

export type DetailMaterialRole =
  | "timber"
  | "shadowed-timber"
  | "painted-wood"
  | "stone-trim"
  | "plaster-trim"
  | "iron"
  | "cloth"
  | "glass";

export type DetailMaterialRoleSpec = {
  materialId: string;
  tintHex: number;
  roughness?: number;
  metalness?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
};

/** One material grammar for every reusable facade-detail template. The source
 * material always comes from the loaded wall pack, so role fallbacks retain
 * authored albedo/normal/ARM maps and world-meter projection. */
export const DETAIL_MATERIAL_ROLES: Readonly<Record<DetailMaterialRole, DetailMaterialRoleSpec>> = {
  timber: {
    materialId: "ph_rough_pine_door",
    tintHex: 0xa87950,
    roughness: 0.84,
    metalness: 0.01,
  },
  "shadowed-timber": {
    materialId: "ph_rough_pine_door",
    tintHex: 0xb3825c,
    roughness: 0.88,
    metalness: 0.01,
  },
  // Untinted painted-wood instances (window frames, sills, joinery pushed
  // without an authored tint) take this value directly, so it has to sit in a
  // painted-timber band rather than the near-white it reads as in sunlight.
  "painted-wood": { materialId: "ph_worn_planks", tintHex: 0x7f9a8d, roughness: 0.8, metalness: 0.01 },
  "stone-trim": { materialId: "ph_stone_trim_sandstone", tintHex: 0xd0b58c, roughness: 0.86, metalness: 0.01 },
  "plaster-trim": { materialId: "ph_trim_sanded_01", tintHex: 0xd8c29d, roughness: 0.9, metalness: 0 },
  // Facade ironwork is painted and oxidised, so it keeps a diffuse response.
  // At high metalness it loses diffuse entirely and can only return the
  // low-intensity sky probe, which reads as a black cutout in shade and blows
  // the small bolt caps out to white where the sun does catch them.
  iron: {
    materialId: "ph_rusty_metal_02",
    tintHex: 0x6d6154,
    roughness: 0.79,
    metalness: 0.2,
  },
  cloth: { materialId: "ph_plastered_wall", tintHex: 0xa96743, roughness: 0.96, metalness: 0 },
  glass: { materialId: "ph_whitewashed_brick_cool", tintHex: 0x71858b, roughness: 0.2, metalness: 0 },
};

export const DETAIL_MATERIAL_ROLE_BY_MESH: Partial<Record<WallDetailMeshId, DetailMaterialRole>> = {
  plinth_strip: "stone-trim",
  cornice_strip: "stone-trim",
  string_course_strip: "plaster-trim",
  corner_pier: "stone-trim",
  vertical_edge_trim: "plaster-trim",
  pilaster: "stone-trim",
  recessed_panel_frame_h: "plaster-trim",
  recessed_panel_frame_v: "plaster-trim",
  door_jamb: "stone-trim",
  door_lintel: "stone-trim",
  door_arch_lintel: "stone-trim",
  door_panel_timber: "timber",
  door_panel_shop: "timber",
  door_panel_storage: "shadowed-timber",
  door_panel_fortified: "shadowed-timber",
  shop_counter: "timber",
  balcony_slab: "stone-trim",
  balcony_parapet: "stone-trim",
  balcony_end_cap: "stone-trim",
  balcony_bracket: "stone-trim",
  balcony_railing: "iron",
  sign_bracket: "iron",
  awning_bracket: "iron",
  awning_pole: "iron",
  cable_segment: "iron",
  window_shutter: "painted-wood",
  window_recess_timber: "shadowed-timber",
  shop_recess_timber_back: "shadowed-timber",
  merchant_goods_pot: "stone-trim",
  merchant_goods_basket: "timber",
  merchant_goods_folded_textile: "cloth",
  window_screen: "timber",
  window_screen_bar: "timber",
};

export const NON_SHADOW_DETAIL_IDS = new Set<WallDetailMeshId>([
  "plinth_strip",
  "cornice_strip",
  "string_course_strip",
  "vertical_edge_trim",
  "recessed_panel_frame_h",
  "recessed_panel_frame_v",
  "sign_bracket",
  "awning_bracket",
  "cable_segment",
  "window_shutter",
  "window_recess_dark",
  "window_recess_timber",
  "window_screen",
  "window_screen_bar",
  "tile_accent",
  "shop_recess_back",
  "shop_recess_timber_back",
  "arch_recess_back",
  "niche_recess_back",
  "window_pointed_arch_frame",
  "spawn_window_pointed_arch_frame",
  "hero_window_pointed_arch_frame",
  "spawn_hero_window_pointed_arch_frame",
]);

export type DetailStabilityClass = "default" | "surface-trim";

export function isStainedGlassMaterialId(materialId: string | null): boolean {
  return materialId === "tm_stained_glass_bright"
    || materialId === "tm_stained_glass_dim"
    || materialId === "tm_stained_glass_hero";
}

export const HEAVY_TRIM_MESH_IDS = new Set<WallDetailMeshId>([
  "plinth_strip",
  "cornice_strip",
  "corner_pier",
  "pilaster",
  "recessed_panel_back",
  "balcony_slab",
  "balcony_parapet",
  "balcony_end_cap",
  "balcony_bracket",
  "window_pointed_arch_frame",
  "spawn_window_pointed_arch_frame",
  "hero_window_pointed_arch_frame",
  "spawn_hero_window_pointed_arch_frame",
  "spawn_hero_pediment",
  "spawn_hero_corbel",
  "arch_pointed_frame",
  "arch_spandrel",
  "facade_wall_shell",
  "facade_shell_open_front",
  "facade_wall_infill",
  "facade_boundary_chamfer",
]);

export const LIGHT_TRIM_MESH_IDS = new Set<WallDetailMeshId>([
  "string_course_strip",
  "vertical_edge_trim",
]);

export const SURFACE_TRIM_MESH_IDS = new Set<WallDetailMeshId>([
  "plinth_strip",
  "cornice_strip",
  "string_course_strip",
  "vertical_edge_trim",
  "corner_pier",
  "pilaster",
  "recessed_panel_frame_h",
  "recessed_panel_frame_v",
  "door_jamb",
  "door_lintel",
  "door_arch_lintel",
  "window_pointed_arch_frame",
  "spawn_window_pointed_arch_frame",
  "hero_window_pointed_arch_frame",
  "spawn_hero_window_pointed_arch_frame",
  "spawn_hero_pediment",
  "spawn_hero_corbel",
  "arch_pointed_frame",
  "arch_spandrel",
]);

export const WALL_DETAIL_RENDER_ORDER = 10;
export const WINDOW_GLASS_RENDER_ORDER = 11;

export function inheritsWallSurface(meshId: WallDetailMeshId): boolean {
  return HEAVY_TRIM_MESH_IDS.has(meshId) || LIGHT_TRIM_MESH_IDS.has(meshId);
}

export function resolveDetailStabilityClass(meshId: WallDetailMeshId): DetailStabilityClass {
  return SURFACE_TRIM_MESH_IDS.has(meshId) ? "surface-trim" : "default";
}
