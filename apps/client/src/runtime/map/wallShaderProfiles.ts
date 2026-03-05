import type { WallShaderTweakOptions } from "../render/materials/applyWallShaderTweaks";

export type WallShaderSurfaceKind = "wall" | "detail";

const HERO_PLASTER_IDS = new Set([
  "ph_whitewashed_brick_warm",
  "ph_whitewashed_brick_dusty",
]);

export function resolveWallShaderProfile(
  materialId: string,
  surfaceKind: WallShaderSurfaceKind,
): Partial<WallShaderTweakOptions> {
  if (!HERO_PLASTER_IDS.has(materialId)) {
    return {};
  }

  return {
    macroColorAmplitude: surfaceKind === "wall" ? 0.06 : 0.05,
    macroRoughnessAmplitude: surfaceKind === "wall" ? 0.07 : 0.05,
    macroFrequency: surfaceKind === "wall" ? 0.11 : 0.12,
    topBleachAmount: 0.05,
    topBleachStartY: 2.6,
    topBleachHeightM: 3.2,
    topBleachColor: "#f4ead8",
    dustColor: "#d8c3a0",
    dustColorAmount: 0.08,
    dirtEnabled: true,
    dirtHeightM: 1.45,
    dirtDarken: 0.12,
    dirtRoughnessBoost: 0.16,
    ...(surfaceKind === "detail"
      ? {
          contactDarkenAmount: 0.1,
          contactDarkenDepth: 0.16,
          useLocalCoords: true,
        }
      : {}),
  };
}
