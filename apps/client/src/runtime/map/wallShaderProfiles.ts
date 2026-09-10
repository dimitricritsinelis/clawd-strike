import type { WallShaderTweakOptions } from "../render/materials/applyWallShaderTweaks";

export type WallShaderSurfaceKind = "wall" | "detail" | "balcony";

// Numerical overrides from BZ-04 materialRuntimeContract. Legacy profiles remain independent.
const BZ04_PROFILES: Record<string, Partial<WallShaderTweakOptions>> = {
  "ph_bz04_painted_plaster_warm": {
    "macroColorAmplitude": 0.025,
    "macroRoughnessAmplitude": 0.04,
    "macroFrequency": 0.12,
    "topBleachAmount": 0,
    "topBleachStartY": 2.5,
    "topBleachHeightM": 3.0,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.35,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.1,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_beige_wall_002": {
    "macroColorAmplitude": 0.022,
    "macroRoughnessAmplitude": 0.035,
    "macroFrequency": 0.12,
    "topBleachAmount": 0,
    "topBleachStartY": 2.5,
    "topBleachHeightM": 3.0,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.32,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.09,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_plastered_wall": {
    "macroColorAmplitude": 0.02,
    "macroRoughnessAmplitude": 0.032,
    "macroFrequency": 0.12,
    "topBleachAmount": 0,
    "topBleachStartY": 2.8,
    "topBleachHeightM": 2.6,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.3,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.08,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_aged_plaster_ochre": {
    "macroColorAmplitude": 0.024,
    "macroRoughnessAmplitude": 0.038,
    "macroFrequency": 0.12,
    "topBleachAmount": 0,
    "topBleachStartY": 2.5,
    "topBleachHeightM": 2.8,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.35,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.1,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_red_plaster_weathered": {
    "macroColorAmplitude": 0.022,
    "macroRoughnessAmplitude": 0.035,
    "macroFrequency": 0.12,
    "topBleachAmount": 0,
    "topBleachStartY": 2.7,
    "topBleachHeightM": 2.5,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.3,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.08,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_whitewashed_brick_warm": {
    "macroColorAmplitude": 0.022,
    "macroRoughnessAmplitude": 0.035,
    "macroFrequency": 0.1,
    "topBleachAmount": 0,
    "topBleachStartY": 2.4,
    "topBleachHeightM": 3.2,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.32,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.09,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_whitewashed_brick_cool": {
    "macroColorAmplitude": 0.018,
    "macroRoughnessAmplitude": 0.03,
    "macroFrequency": 0.12,
    "topBleachAmount": 0,
    "topBleachStartY": 2.8,
    "topBleachHeightM": 2.4,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.28,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.07,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_sandstone_blocks_05": {
    "macroColorAmplitude": 0.025,
    "macroRoughnessAmplitude": 0.035,
    "macroFrequency": 0.09,
    "topBleachAmount": 0,
    "topBleachStartY": 2.8,
    "topBleachHeightM": 2.2,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.35,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.11,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_sandstone_blocks_06": {
    "macroColorAmplitude": 0.026,
    "macroRoughnessAmplitude": 0.038,
    "macroFrequency": 0.09,
    "topBleachAmount": 0,
    "topBleachStartY": 2.8,
    "topBleachHeightM": 2.2,
    "dustColorAmount": 0,
    "dirtEnabled": false,
    "dirtHeightM": 0.35,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.12,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0
  },
  "ph_bz04_stone_trim_sandstone": {
    "macroColorAmplitude": 0.0,
    "macroRoughnessAmplitude": 0.0,
    "macroFrequency": 0.0,
    "dirtEnabled": false,
    "dustColorAmount": 0,
    "dirtHeightM": 0.0,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "topBleachAmount": 0
  },
  "ph_bz04_stone_trim_white": {
    "macroColorAmplitude": 0.0,
    "macroRoughnessAmplitude": 0.0,
    "macroFrequency": 0.0,
    "dirtEnabled": false,
    "dustColorAmount": 0,
    "dirtHeightM": 0.0,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "topBleachAmount": 0
  },
  "ph_bz04_trim_sanded_01": {
    "macroColorAmplitude": 0.0,
    "macroRoughnessAmplitude": 0.0,
    "macroFrequency": 0.0,
    "dirtEnabled": false,
    "dustColorAmount": 0,
    "dirtHeightM": 0.0,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "topBleachAmount": 0
  },
  "ph_bz04_worn_plaster_ochre": {
    "macroColorAmplitude": 0.01,
    "macroRoughnessAmplitude": 0.015,
    "macroFrequency": 0.14,
    "dirtEnabled": false,
    "dustColorAmount": 0,
    "dirtHeightM": 0.0,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "topBleachAmount": 0
  },
  "ph_bz04_hessian_230": {
    "macroColorAmplitude": 0.0,
    "macroRoughnessAmplitude": 0.0,
    "macroFrequency": 0.0,
    "dirtEnabled": false,
    "dustColorAmount": 0,
    "dirtHeightM": 0.0,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "topBleachAmount": 0
  },
  "ph_bz04_fabric_leather_02": {
    "macroColorAmplitude": 0.0,
    "macroRoughnessAmplitude": 0.0,
    "macroFrequency": 0.0,
    "dirtEnabled": false,
    "dustColorAmount": 0,
    "dirtHeightM": 0.0,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0.0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "topBleachAmount": 0
  },
  "ph_bz04_rough_pine_door": {
    "macroColorAmplitude": 0,
    "macroRoughnessAmplitude": 0,
    "macroFrequency": 0.12,
    "dirtEnabled": false,
    "dirtHeightM": 0.18,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0,
    "dustColorAmount": 0,
    "topBleachAmount": 0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "contactDarkenAmount": 0
  },
  "ph_bz04_weathered_brown_planks": {
    "macroColorAmplitude": 0,
    "macroRoughnessAmplitude": 0,
    "macroFrequency": 0.12,
    "dirtEnabled": false,
    "dirtHeightM": 0.18,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0,
    "dustColorAmount": 0,
    "topBleachAmount": 0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "contactDarkenAmount": 0
  },
  "ph_bz04_worn_planks": {
    "macroColorAmplitude": 0,
    "macroRoughnessAmplitude": 0,
    "macroFrequency": 0.12,
    "dirtEnabled": false,
    "dirtHeightM": 0.18,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0,
    "dustColorAmount": 0,
    "topBleachAmount": 0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "contactDarkenAmount": 0
  },
  "ph_bz04_dark_wood": {
    "macroColorAmplitude": 0,
    "macroRoughnessAmplitude": 0,
    "macroFrequency": 0.12,
    "dirtEnabled": false,
    "dirtHeightM": 0.18,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0,
    "dustColorAmount": 0,
    "topBleachAmount": 0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "contactDarkenAmount": 0
  },
  "ph_bz04_rusty_metal_02": {
    "macroColorAmplitude": 0,
    "macroRoughnessAmplitude": 0,
    "macroFrequency": 0.12,
    "dirtEnabled": false,
    "dirtHeightM": 0.18,
    "dirtDarken": 0,
    "dirtRoughnessBoost": 0,
    "dustColorAmount": 0,
    "topBleachAmount": 0,
    "localizedWearEnabled": false,
    "wearStreakStrength": 0,
    "wearChipStrength": 0,
    "wearRepairStrength": 0,
    "wearRoughnessBoost": 0,
    "contactDarkenAmount": 0
  }
};

const TIMBER_IDS = new Set([
  "ph_rough_pine_door",
]);

const BRICK_MASONRY_IDS = new Set([
  "ph_brick_4_desert",
  "ph_sandstone_blocks_04",
  "ph_sandstone_blocks_05",
  "ph_sandstone_blocks_06",
  "ph_exterior_wall_cladding",
  "ph_worn_brick_wall",
  "ph_medieval_blocks_03",
  "ph_rough_block_wall",
  "ph_stone_brick_wall_001",
]);

const SUN_WASHED_PLASTER_IDS = new Set([
  "ph_whitewashed_brick_warm",
  "ph_whitewashed_brick_dusty",
  "ph_lime_plaster_sun",
]);

const AGED_PLASTER_IDS = new Set([
  "ph_whitewashed_brick",
  "ph_whitewashed_brick_cool",
  "ph_aged_plaster_ochre",
  "ph_plastered_wall",
  "ph_beige_wall_002",
  // The merchant frontages are surfaced in this plaster, and without a profile
  // it fell through to the generic defaults: no streaks, chips, repair patches
  // or dust, so the largest surface on the street carried only a broad blotch
  // pattern and read unfinished at two metres.
  "ph_painted_plaster_warm",
]);

const SOFT_TRIM_IDS = new Set([
  "ph_trim_sanded_01",
  "ph_stone_trim_sandstone",
  "ph_band_lime_soft",
  "ph_band_beige_001",
  "ph_band_beige_002",
  "ph_band_plastered",
  "ph_stone_trim_white",
]);

const AUTHORED_WALL_SURFACE_IDS = new Set([
  ...BRICK_MASONRY_IDS,
  ...SUN_WASHED_PLASTER_IDS,
  ...AGED_PLASTER_IDS,
]);

export function resolveWallShaderProfile(
  materialId: string,
  surfaceKind: WallShaderSurfaceKind,
): Partial<WallShaderTweakOptions> {
  if (BZ04_PROFILES[materialId]) return BZ04_PROFILES[materialId]!;
  if (TIMBER_IDS.has(materialId)) {
    return {
      macroColorAmplitude: surfaceKind === "wall" ? 0.025 : 0.018,
      macroRoughnessAmplitude: surfaceKind === "wall" ? 0.035 : 0.025,
      macroFrequency: 0.2,
      dustColor: "#805b39",
      dustColorAmount: surfaceKind === "wall" ? 0.025 : 0.015,
      dirtEnabled: true,
      dirtHeightM: surfaceKind === "wall" ? 0.55 : 0.38,
      dirtDarken: surfaceKind === "wall" ? 0.06 : 0.045,
      dirtRoughnessBoost: 0.05,
      ...(surfaceKind !== "wall"
        ? {
            contactDarkenAmount: surfaceKind === "balcony" ? 0.08 : 0.06,
            contactDarkenDepth: surfaceKind === "balcony" ? 0.14 : 0.1,
            useLocalCoords: true,
          }
        : {}),
    };
  }

  if (BRICK_MASONRY_IDS.has(materialId)) {
    return {
      macroColorAmplitude: surfaceKind === "wall" ? 0.03 : 0.025,
      macroRoughnessAmplitude: surfaceKind === "wall" ? 0.04 : 0.03,
      macroFrequency: surfaceKind === "wall" ? 0.09 : 0.11,
      topBleachAmount: surfaceKind === "balcony" ? 0.015 : 0.025,
      topBleachStartY: surfaceKind === "wall" ? 2.6 : 0.45,
      topBleachHeightM: surfaceKind === "wall" ? 2.4 : 0.7,
      topBleachColor: "#efe0c6",
      dustColor: "#c9ad82",
      dustColorAmount: surfaceKind === "balcony" ? 0.045 : 0.09,
      dirtEnabled: true,
      dirtHeightM: surfaceKind === "balcony" ? 0.5 : 1.25,
      dirtDarken: surfaceKind === "balcony" ? 0.09 : 0.18,
      dirtRoughnessBoost: surfaceKind === "balcony" ? 0.1 : 0.17,
      ...(surfaceKind !== "wall"
        ? {
            contactDarkenAmount: surfaceKind === "balcony" ? 0.16 : 0.14,
            contactDarkenDepth: surfaceKind === "balcony" ? 0.22 : 0.18,
            useLocalCoords: true,
          }
        : {}),
    };
  }

  if (SUN_WASHED_PLASTER_IDS.has(materialId)) {
    return {
      macroColorAmplitude: surfaceKind === "wall" ? 0.025 : 0.02,
      macroRoughnessAmplitude: surfaceKind === "wall" ? 0.04 : 0.03,
      macroFrequency: surfaceKind === "wall" ? 0.1 : 0.12,
      topBleachAmount: surfaceKind === "balcony" ? 0.03 : 0.06,
      topBleachStartY: surfaceKind === "wall" ? 2.2 : 0.35,
      topBleachHeightM: surfaceKind === "wall" ? 3.8 : 0.9,
      topBleachColor: "#f2e7d4",
      dustColor: "#d8c3a0",
      dustColorAmount: surfaceKind === "balcony" ? 0.05 : 0.08,
      dirtEnabled: true,
      dirtHeightM: surfaceKind === "balcony" ? 0.55 : 1.45,
      dirtDarken: surfaceKind === "balcony" ? 0.08 : 0.17,
      dirtRoughnessBoost: surfaceKind === "balcony" ? 0.1 : 0.16,
      localizedWearEnabled: surfaceKind === "wall",
      wearStreakStrength: surfaceKind === "wall" ? 0.1 : 0,
      wearChipStrength: surfaceKind === "wall" ? 0.1 : 0,
      wearRepairStrength: surfaceKind === "wall" ? 0.13 : 0,
      wearRoughnessBoost: surfaceKind === "wall" ? 0.12 : 0,
      wearSubstrateColor: "#9a6843",
      wearRepairColor: "#c7ad86",
      ...(surfaceKind !== "wall"
        ? {
            contactDarkenAmount: surfaceKind === "balcony" ? 0.14 : 0.1,
            contactDarkenDepth: surfaceKind === "balcony" ? 0.22 : 0.16,
            useLocalCoords: true,
          }
        : {}),
    };
  }

  if (AGED_PLASTER_IDS.has(materialId)) {
    return {
      macroColorAmplitude: surfaceKind === "wall" ? 0.025 : 0.02,
      macroRoughnessAmplitude: surfaceKind === "wall" ? 0.04 : 0.03,
      macroFrequency: surfaceKind === "wall" ? 0.12 : 0.14,
      topBleachAmount: 0.03,
      topBleachStartY: surfaceKind === "wall" ? 2.5 : 0.4,
      topBleachHeightM: surfaceKind === "wall" ? 3.0 : 0.8,
      topBleachColor: "#efe1cb",
      dustColor: "#cfb18b",
      dustColorAmount: surfaceKind === "balcony" ? 0.04 : 0.09,
      dirtEnabled: true,
      dirtHeightM: surfaceKind === "balcony" ? 0.5 : 1.25,
      dirtDarken: surfaceKind === "balcony" ? 0.06 : 0.18,
      dirtRoughnessBoost: surfaceKind === "balcony" ? 0.08 : 0.13,
      localizedWearEnabled: surfaceKind === "wall",
      wearStreakStrength: surfaceKind === "wall" ? 0.13 : 0,
      wearChipStrength: surfaceKind === "wall" ? 0.14 : 0,
      wearRepairStrength: surfaceKind === "wall" ? 0.16 : 0,
      wearRoughnessBoost: surfaceKind === "wall" ? 0.15 : 0,
      wearSubstrateColor: "#8d5c3b",
      wearRepairColor: "#b99b72",
      ...(surfaceKind !== "wall"
        ? {
            contactDarkenAmount: surfaceKind === "balcony" ? 0.12 : 0.08,
            contactDarkenDepth: surfaceKind === "balcony" ? 0.2 : 0.14,
            useLocalCoords: true,
          }
        : {}),
    };
  }

  if (SOFT_TRIM_IDS.has(materialId)) {
    return {
      macroColorAmplitude: surfaceKind === "balcony" ? 0.03 : 0.025,
      macroRoughnessAmplitude: surfaceKind === "balcony" ? 0.04 : 0.03,
      macroFrequency: 0.15,
      dustColor: "#d6c19e",
      dustColorAmount: surfaceKind === "balcony" ? 0.035 : 0.025,
      dirtEnabled: true,
      dirtHeightM: surfaceKind === "balcony" ? 0.45 : 0.7,
      dirtDarken: surfaceKind === "balcony" ? 0.05 : 0.035,
      dirtRoughnessBoost: 0.08,
      ...(surfaceKind !== "wall"
        ? {
            contactDarkenAmount: surfaceKind === "balcony" ? 0.1 : 0.06,
            contactDarkenDepth: surfaceKind === "balcony" ? 0.16 : 0.1,
            useLocalCoords: true,
          }
        : {}),
    };
  }

  return {};
}

/**
 * A shipped section or facade GLB can contain both its wall face and joinery.
 * Give its registered masonry and plaster the same weathering as runtime walls;
 * timber and trim remain finish details.
 */
export function resolveAuthoredWallShaderProfile(materialId: string): Partial<WallShaderTweakOptions> {
  return resolveWallShaderProfile(
    materialId,
    AUTHORED_WALL_SURFACE_IDS.has(materialId) ? "wall" : "detail",
  );
}
