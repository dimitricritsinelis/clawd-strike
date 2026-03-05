export const DEFAULT_WALL_MATERIAL_ID = "ph_whitewashed_brick";

export type WallMaterialCombo = {
  wall: string;
  trimHeavy: string;
  trimLight: string;
};

// ── Main lane combos (each lane segment has a distinct palette) ─────────

const COMBO_MAIN_1: WallMaterialCombo = {
  wall: "ph_whitewashed_brick_dusty",
  trimHeavy: "ph_sandstone_blocks_05",
  trimLight: "ph_whitewashed_brick_dusty",
};

const COMBO_MAIN_2: WallMaterialCombo = {
  wall: "ph_beige_wall_002",
  trimHeavy: "ph_stone_trim_white",
  trimLight: "ph_beige_wall_002",
};

const COMBO_MAIN_3: WallMaterialCombo = {
  wall: "ph_whitewashed_brick_dusty",
  trimHeavy: "ph_sandstone_blocks_05",
  trimLight: "ph_whitewashed_brick_dusty",
};

// ── Plaster-dominant combos for secondary zones ─────────────────────────

const COMBO_WHITEWASH: WallMaterialCombo = {
  wall: "ph_whitewashed_brick",
  trimHeavy: "ph_sandstone_blocks_05",
  trimLight: "ph_whitewashed_brick",
};

const COMBO_CONNECTOR: WallMaterialCombo = {
  wall: "ph_whitewashed_brick_cool",
  trimHeavy: "ph_sandstone_blocks_04",
  trimLight: "ph_whitewashed_brick_cool",
};

const COMBO_CUT_MID: WallMaterialCombo = {
  wall: "ph_beige_wall_002",
  trimHeavy: "ph_sandstone_blocks_06",
  trimLight: "ph_beige_wall_002",
};

const COMBO_CUT_NORTH: WallMaterialCombo = {
  wall: "ph_whitewashed_brick",
  trimHeavy: "ph_sandstone_blocks_04",
  trimLight: "ph_whitewashed_brick",
};

// ── Zone → combo mapping ────────────────────────────────────────────────

export const WALL_COMBO_BY_ZONE_ID: Record<string, WallMaterialCombo> = {
  // Main lane
  BZ_M1: COMBO_MAIN_1,
  BZ_M2_JOG: COMBO_MAIN_2,
  BZ_M3: COMBO_MAIN_3,
  // Spawns — warm plaster walls, sandstone trim at base + corners
  SPAWN_A_COURTYARD: { wall: "ph_whitewashed_brick_warm", trimHeavy: "ph_sandstone_blocks_05", trimLight: "ph_whitewashed_brick_warm" },
  SPAWN_B_GATE_PLAZA: { wall: "ph_whitewashed_brick_warm", trimHeavy: "ph_sandstone_blocks_05", trimLight: "ph_whitewashed_brick_warm" },
  // Side halls
  SH_E: COMBO_WHITEWASH,
  SH_W: COMBO_WHITEWASH,
  // Connectors
  CONN_NE: COMBO_CONNECTOR,
  CONN_NW: COMBO_CONNECTOR,
  CONN_SE: COMBO_CONNECTOR,
  CONN_SW: COMBO_CONNECTOR,
  // Cuts
  CUT_E_MID: COMBO_CUT_MID,
  CUT_W_MID: COMBO_CUT_MID,
  CUT_E_NORTH: COMBO_CUT_NORTH,
  CUT_W_NORTH: COMBO_CUT_NORTH,
};

export function resolveWallComboForZone(zoneId: string | null): WallMaterialCombo | null {
  if (!zoneId) return null;
  return WALL_COMBO_BY_ZONE_ID[zoneId] ?? null;
}

// ── Zone → wall material (used by buildPbrWalls for wall surfaces) ──────

export const WALL_MATERIAL_BY_ZONE_ID: Record<string, string> = {
  BZ_M1: "ph_whitewashed_brick_dusty",
  BZ_M2_JOG: "ph_beige_wall_002",
  BZ_M3: "ph_whitewashed_brick_dusty",
  SPAWN_A_COURTYARD: "ph_whitewashed_brick_warm",
  SPAWN_B_GATE_PLAZA: "ph_whitewashed_brick_warm",
  SH_E: "ph_whitewashed_brick",
  SH_W: "ph_whitewashed_brick",
  CONN_NE: "ph_whitewashed_brick_cool",
  CONN_NW: "ph_whitewashed_brick_cool",
  CONN_SE: "ph_whitewashed_brick_cool",
  CONN_SW: "ph_whitewashed_brick_cool",
  CUT_E_MID: "ph_beige_wall_002",
  CUT_W_MID: "ph_beige_wall_002",
  CUT_E_NORTH: "ph_whitewashed_brick",
  CUT_W_NORTH: "ph_whitewashed_brick",
};

export function resolveWallMaterialIdForZone(zoneId: string | null): string {
  if (!zoneId) return DEFAULT_WALL_MATERIAL_ID;
  return WALL_MATERIAL_BY_ZONE_ID[zoneId] ?? DEFAULT_WALL_MATERIAL_ID;
}
