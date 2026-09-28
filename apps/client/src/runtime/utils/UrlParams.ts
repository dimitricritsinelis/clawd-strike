import { sanitizeValidatedPlayerName } from "../../../../shared/playerName";

const DEFAULT_MAP_ID = "bazaar-map";
const DEFAULT_FLOOR_QUALITY = "1k";

export type RuntimeSpawnId = "A" | "B";
export type RuntimeControlMode = "human" | "agent";
export type RuntimeFloorMode = "blockout" | "pbr";
export type RuntimeWallMode = "blockout" | "pbr";
export type RuntimeFloorQuality = "1k" | "2k" | "4k";
/**
 * Desktop graphics tier. "high" (default) renders at native resolution up to
 * 2x, loads 2k surface textures and enables GTAO in live play; "standard"
 * keeps the earlier 1.1x / 1k / AO-off-in-play budget for weaker machines.
 * Mobile is capped separately by bootstrap regardless of tier.
 */
export type RuntimeQualityTier = "high" | "standard";

export type RuntimeUrlParams = {
  mapId: string;
  controlMode: RuntimeControlMode;
  playerName: string | null;
  shot: string | null;
  spawn: RuntimeSpawnId;
  debug: boolean;
  perf: boolean;
  vm: boolean;
  seed: number | null;
  floorMode: RuntimeFloorMode;
  wallMode: RuntimeWallMode;
  floorQuality: RuntimeFloorQuality;
  unlimitedHealth: boolean;
  /**
   * Whether the god-mode flag was named in the URL at all, and what it said.
   * null when absent. Localhost human runs force unlimited health on as a dev
   * convenience; without this an explicit ?god=0 could not turn it back off,
   * which made it impossible to playtest enemy damage locally.
   */
  unlimitedHealthExplicit: boolean | null;
  ao: boolean;
  quality: RuntimeQualityTier;
};

function parseBooleanFlag(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function parseBooleanFlagWithDefault(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return parseBooleanFlag(value);
}

function parseSeed(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[-+]?\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parseFloorMode(value: string | null): RuntimeFloorMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "blockout") return "blockout";
  return "pbr";
}

function parseWallMode(value: string | null): RuntimeWallMode {
  return value?.trim().toLowerCase() === "blockout" ? "blockout" : "pbr";
}

function parseFloorQuality(value: string | null): RuntimeFloorQuality {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "1k" || normalized === "2k" || normalized === "4k") {
    return normalized;
  }
  return DEFAULT_FLOOR_QUALITY;
}

function getParam(params: URLSearchParams, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null) return value;
  }
  return null;
}

function parseControlMode(modeValue: string | null, autostartValue: string | null): RuntimeControlMode {
  const mode = modeValue?.trim().toLowerCase();
  if (mode === "human" || mode === "agent") {
    return mode;
  }

  const autostart = autostartValue?.trim().toLowerCase();
  if (autostart === "agent") {
    return "agent";
  }
  return "human";
}

function parseQualityTier(value: string | null): RuntimeQualityTier {
  return value?.trim().toLowerCase() === "standard" ? "standard" : "high";
}

export function resolveQualityTier(search: string): RuntimeQualityTier {
  return parseQualityTier(getParam(new URLSearchParams(search), "quality", "gfx"));
}

/** Desktop pixel-ratio cap for a tier; the renderer still clamps to the device DPR. */
export function resolveDesktopMaxPixelRatio(search: string): number {
  return resolveQualityTier(search) === "high" ? 2.0 : 1.1;
}

/**
 * Dynamic resolution (render/DynamicResolution.ts) guards 60 fps in live
 * high-tier play. Review shots, QA and agent runs keep a fixed resolution so
 * their frames stay comparable. `dynres=0|1` overrides.
 */
export function resolveDynamicResolution(search: string): boolean {
  const params = new URLSearchParams(search);
  const explicit = getParam(params, "dynres");
  if (explicit !== null) return parseBooleanFlag(explicit);
  if (resolveQualityTier(search) !== "high") return false;
  if (getParam(params, "shot") !== null || params.get("qa") === "1" || params.has("qaProfile")) return false;
  return parseControlMode(getParam(params, "mode"), getParam(params, "autostart")) === "human";
}

export function parseRuntimeUrlParams(search: string): RuntimeUrlParams {
  const params = new URLSearchParams(search);
  const rawMapId = getParam(params, "map");
  const rawControlMode = getParam(params, "mode");
  const rawAutostart = getParam(params, "autostart");
  const rawPlayerName = getParam(params, "name");
  const rawShot = getParam(params, "shot");
  const rawSpawn = getParam(params, "spawn");
  const rawDebug = getParam(params, "debug");
  const rawPerf = getParam(params, "perf");
  const rawVm = getParam(params, "vm");
  const rawSeed = getParam(params, "seed");
  const rawFloors = getParam(params, "floors");
  const rawWalls = getParam(params, "walls");
  const rawFloorRes = getParam(params, "floorRes");
  const rawUnlimitedHealth = getParam(params, "unlimitedHealth", "god");
  const rawAo = getParam(params, "ao");

  const mapId = rawMapId && rawMapId.trim().length > 0 ? rawMapId.trim() : DEFAULT_MAP_ID;
  const controlMode = parseControlMode(rawControlMode, rawAutostart);
  const playerName = sanitizeValidatedPlayerName(rawPlayerName);
  const shot = rawShot && rawShot.trim().length > 0 ? rawShot.trim() : null;
  const spawn = rawSpawn?.trim().toUpperCase() === "B" ? "B" : "A";
  const debug = parseBooleanFlag(rawDebug);
  const perf = parseBooleanFlag(rawPerf);
  const vm = parseBooleanFlagWithDefault(rawVm, true);
  const seed = parseSeed(rawSeed);
  const floorMode = parseFloorMode(rawFloors);
  const wallMode = parseWallMode(rawWalls);
  const quality = parseQualityTier(getParam(params, "quality", "gfx"));
  const floorQuality = rawFloorRes === null && quality === "high" ? "2k" : parseFloorQuality(rawFloorRes);
  const unlimitedHealth = parseBooleanFlag(rawUnlimitedHealth);
  const unlimitedHealthExplicit = rawUnlimitedHealth === null ? null : unlimitedHealth;
  // GTAO is on for authored shots and for live play in the high tier. It reads
  // the beauty pass's depth and runs on the CSS-pixel grid (SceneDepthGtaoPass),
  // about 6 ms at 2x DPR on an M3 Pro. The standard tier opts in via ?ao=1, and
  // performance gates that need an AO-free frame pass ?ao=0 explicitly.
  const ao = parseBooleanFlagWithDefault(rawAo, shot !== null || quality === "high");

  return {
    mapId,
    controlMode,
    playerName,
    shot,
    spawn,
    debug,
    perf,
    vm,
    seed,
    floorMode,
    wallMode,
    floorQuality,
    unlimitedHealth,
    unlimitedHealthExplicit,
    ao,
    quality,
  };
}
