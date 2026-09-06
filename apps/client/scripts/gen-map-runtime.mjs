import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateAuthoredFacadeLayout,
  generateFacadeLayout,
  validateFrontageCoverage,
  validateFixtureCenterlines,
} from "./lib/facade-layout-grammar.mjs";
import {
  normalizeCompositionRules,
  validateCompositionRules,
} from "./lib/composition-validators.mjs";
import {
  emptyCompositionWaiverRegistry,
  normalizeCompositionWaiverRegistry,
} from "./lib/composition-waivers.mjs";

const MAP_ID = "bazaar-map";
const DEFAULT_COMPARE_SHOT_ID = "SHOT_02_SPAWN_A_TO_BAZAAR";
const KNOWN_ZONE_TYPES = new Set([
  "clear_travel_zone",
  "connector",
  "cut",
  "main_lane_segment",
  "side_hall",
  "spawn_plaza",
  "stall_strip",
]);
const KNOWN_ANCHOR_TYPES = new Set([
  "cloth_canopy_span",
  "cover_cluster",
  "decorative_palm",
  "hero_landmark",
  "landmark",
  "lantern_anchor",
  "open_node",
  "service_door_anchor",
  "shopfront_anchor",
  "window_anchor",
  "signage_anchor",
  "spawn_cover",
]);
const MACRO_LANES = new Set(["west", "main", "east"]);
const FACADE_FACES = new Set(["north", "south", "east", "west"]);
const DRESSING_CLASSIFICATIONS = new Set(["gameplay_cover", "soft_visual", "overhead"]);
const ASSET_COLLISION_CLASSES = new Set(["none", "soft", "hard", "overhead"]);
const ASSET_SHADOW_POLICIES = new Set(["cast_receive", "receive_only", "none"]);
const ASSET_SEMANTIC_CLASSES = new Set([
  "architecture",
  "container",
  "cover",
  "furniture",
  "foliage",
  "landmark",
  "lighting",
  "overhead",
  "signage",
  "textile",
]);
const ASSET_RUNTIME_MODES = new Set(["model", "procedural"]);
const ASSET_PIVOTS = new Set(["base_center"]);
const ASSET_AXES = new Set(["+x", "-x", "+y", "-y", "+z", "-z"]);
const MASSING_ROOF_STYLES = new Set(["flat_parapet", "setback_flat"]);
const FACADE_FAMILIES = new Set([
  "active_merchant",
  "quiet_residential",
  "service_storage",
  "covered_arcade",
  "hero_courtyard",
]);
const FACADE_MODULE_KINDS = new Set([
  "shop_recess",
  "door",
  "window",
  "vent",
  "arch",
  "column",
  "blind_niche",
]);
const FACADE_OPENING_TYPES = new Set(["none", "recess", "door_void", "window_void", "arch_void"]);
const FACADE_LAYOUT_RHYTHMS = new Set(["merchant", "residential", "residential_dense", "service", "arcade", "hero"]);
const FACADE_MATERIAL_SLOTS = new Set(["wall", "trim", "roof", "timber", "metal", "accent"]);
const V3_WALL_MATERIAL_IDS = new Set([
  "ph_sandstone_blocks_04",
  "ph_sandstone_blocks_05",
  "ph_sandstone_blocks_06",
  "ph_whitewashed_brick",
  "ph_whitewashed_brick_cool",
  "ph_whitewashed_brick_warm",
  "ph_whitewashed_brick_dusty",
  "ph_lime_plaster_sun",
  "ph_aged_plaster_ochre",
  "ph_painted_plaster_warm",
  "ph_worn_plaster_sun",
  "ph_worn_plaster_ochre",
  "ph_plastered_wall",
  "ph_beige_wall_001",
  "ph_beige_wall_002",
]);
// Roofs are a distinct exposed construction class. Keeping their authored
// slot inside this restrained worn-plaster pair preserves the v3 palette while
// allowing world-scaled rolled-mud response instead of stretching each wall
// family across large horizontal slabs.
const V3_ROOF_MATERIAL_IDS = new Set([
  "ph_worn_plaster_sun",
  "ph_worn_plaster_ochre",
]);
const V3_TRIM_MATERIAL_IDS = new Set([
  "ph_trim_sanded_01",
  "ph_stone_trim_sandstone",
  "ph_stone_trim_white",
  "ph_band_lime_soft",
  "ph_band_beige_001",
  "ph_band_beige_002",
  "ph_band_plastered",
]);
const APPROVED_CC0_HOSTS = new Set([
  "polyhaven.com",
  "www.polyhaven.com",
  "ambientcg.com",
  "www.ambientcg.com",
  "3dmodelscc0.itch.io",
]);
const MAX_AUTHORED_GRADE_DEG = 30;
const RECT_EPSILON = 1e-6;
const SCALE_EPSILON = 1e-9;
const MAP_POLISH_PLAYER_EYE_HEIGHT_M = 1.7;
const MAP_POLISH_CAMERA_POSITION_TOLERANCE_M = 0.02;
const MAP_POLISH_CAMERA_YAW_TOLERANCE_DEG = 0.35;

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const repoRoot = path.resolve(scriptDir, "../../..");

// Source-of-truth inputs from the design packet.
const mapSpecPath = path.join(repoRoot, "docs/map-design/specs/map_spec.json");
const mapSpecSchemaPath = path.join(repoRoot, "docs/map-design/specs/map_spec_schema.json");
const compositionWaiversPath = path.join(
  repoRoot,
  "docs/map-design/specs/composition_waivers.json",
);
const designShotsPath = path.join(repoRoot, "docs/map-design/shots.json");
const runtimeDir = path.join(repoRoot, "apps/client/public/maps", MAP_ID);

const mapSpecOutPath = path.join(runtimeDir, "map_spec.json");
const shotsOutPath = path.join(runtimeDir, "shots.json");
const generatorPath = "apps/client/scripts/gen-map-runtime.mjs";

function fail(message) {
  throw new Error(`[gen:maps] ${message}`);
}

function asNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
}

function optionalNumber(value, label) {
  if (value === null || typeof value === "undefined" || value === "") {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number when provided`);
  }
  return value;
}

function optionalBoolean(value, label) {
  if (value === null || typeof value === "undefined" || value === "") {
    return undefined;
  }
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean when provided`);
  }
  return value;
}

function ensurePositive(value, label) {
  if (value <= 0) {
    fail(`${label} must be > 0`);
  }
}

function ensureString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value, label) {
  if (typeof value === "undefined") {
    return undefined;
  }
  return ensureString(value, label);
}

function requireArrayWhenPresent(container, key, label = key) {
  if (typeof container?.[key] === "undefined") {
    return undefined;
  }
  if (!Array.isArray(container[key])) {
    fail(`${label} must be an array when provided`);
  }
  return container[key];
}

function normalizeRect(rect, label) {
  if (!rect || typeof rect !== "object") {
    fail(`${label} is missing`);
  }

  const normalized = {
    x: asNumber(rect.x, `${label}.x`),
    y: asNumber(rect.y, `${label}.y`),
    w: asNumber(rect.w, `${label}.w`),
    h: asNumber(rect.h, `${label}.h`),
  };

  ensurePositive(normalized.w, `${label}.w`);
  ensurePositive(normalized.h, `${label}.h`);
  return normalized;
}

function normalizeDimensions(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const normalized = {
    width: asNumber(value.width, `${label}.width`),
    depth: asNumber(value.depth, `${label}.depth`),
    height: asNumber(value.height, `${label}.height`),
  };
  for (const [axis, amount] of Object.entries(normalized)) ensurePositive(amount, `${label}.${axis}`);
  return normalized;
}

function normalizeScale(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const normalized = {
    x: asNumber(value.x, `${label}.x`),
    y: asNumber(value.y, `${label}.y`),
    z: asNumber(value.z, `${label}.z`),
  };
  for (const [axis, amount] of Object.entries(normalized)) {
    ensurePositive(amount, `${label}.${axis}`);
    if (amount < 0.75 - SCALE_EPSILON || amount > 1.25 + SCALE_EPSILON) {
      fail(`${label}.${axis} must remain within the authored 0.75-1.25 production tolerance`);
    }
  }
  return normalized;
}

function normalizeOffset(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return {
    x: asNumber(value.x, `${label}.x`),
    y: asNumber(value.y, `${label}.y`),
    z: asNumber(value.z, `${label}.z`),
  };
}

function isV3FormatVersion(version) {
  return typeof version === "string" && /^3(?:\.|$)/u.test(version);
}

function inRect2D(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function rectContainsRect(outer, inner) {
  return (
    inner.x >= outer.x - RECT_EPSILON &&
    inner.y >= outer.y - RECT_EPSILON &&
    inner.x + inner.w <= outer.x + outer.w + RECT_EPSILON &&
    inner.y + inner.h <= outer.y + outer.h + RECT_EPSILON
  );
}

function rectsTouchOrOverlap(a, b) {
  return !(
    a.x + a.w < b.x - RECT_EPSILON
    || b.x + b.w < a.x - RECT_EPSILON
    || a.y + a.h < b.y - RECT_EPSILON
    || b.y + b.h < a.y - RECT_EPSILON
  );
}

function sortedById(items) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function sha256File(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, serializeJson(value), "utf8");
  console.log(`[gen:maps] wrote ${path.relative(repoRoot, filePath)}`);
}

async function assertGeneratedFile(filePath, value) {
  let actual;
  try {
    actual = await readFile(filePath, "utf8");
  } catch {
    fail(`Generated output is missing: ${path.relative(repoRoot, filePath)}. Run pnpm gen:maps.`);
  }
  if (actual !== serializeJson(value)) {
    fail(`Generated output is stale: ${path.relative(repoRoot, filePath)}. Run pnpm gen:maps.`);
  }
  console.log(`[gen:maps] verified ${path.relative(repoRoot, filePath)}`);
}

function generatedFrom(sourcePath, sourceSha256) {
  return {
    schemaVersion: 1,
    path: path.relative(repoRoot, sourcePath).split(path.sep).join("/"),
    sha256: sourceSha256,
    generator: generatorPath,
  };
}

function resolveLocalSchemaRef(rootSchema, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) {
    fail(`Unsupported map schema reference '${String(ref)}'`);
  }
  let resolved = rootSchema;
  for (const rawPart of ref.slice(2).split("/")) {
    const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!resolved || typeof resolved !== "object" || !(part in resolved)) {
      fail(`Map schema reference '${ref}' does not resolve`);
    }
    resolved = resolved[part];
  }
  return resolved;
}

function collectJsonSchemaErrors(value, schema, rootSchema, valuePath) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return [`${valuePath}: invalid schema node`];
  }

  const errors = [];
  if (typeof schema.$ref !== "undefined") {
    errors.push(...collectJsonSchemaErrors(value, resolveLocalSchemaRef(rootSchema, schema.$ref), rootSchema, valuePath));
  }

  if (Array.isArray(schema.oneOf)) {
    const branchErrors = schema.oneOf.map((branch) => collectJsonSchemaErrors(value, branch, rootSchema, valuePath));
    const matchCount = branchErrors.filter((branch) => branch.length === 0).length;
    if (matchCount !== 1) {
      const detail = branchErrors
        .map((branch, index) => `branch ${index + 1}: ${branch[0] ?? "matched"}`)
        .join("; ");
      errors.push(`${valuePath}: expected exactly one schema variant (${detail})`);
    }
  }

  const expectedType = schema.type;
  let typeMatches = true;
  if (expectedType === "object") {
    typeMatches = Boolean(value) && typeof value === "object" && !Array.isArray(value);
  } else if (expectedType === "array") {
    typeMatches = Array.isArray(value);
  } else if (expectedType === "string") {
    typeMatches = typeof value === "string";
  } else if (expectedType === "number") {
    typeMatches = typeof value === "number" && Number.isFinite(value);
  } else if (expectedType === "integer") {
    typeMatches = typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
  } else if (expectedType === "boolean") {
    typeMatches = typeof value === "boolean";
  }
  if (!typeMatches) {
    errors.push(`${valuePath}: expected ${expectedType}`);
    return errors;
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${valuePath}: expected constant ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => candidate === value)) {
    errors.push(`${valuePath}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}`);
  }

  if (typeof value === "string" && typeof schema.minLength === "number" && value.length < schema.minLength) {
    errors.push(`${valuePath}: expected at least ${schema.minLength} characters`);
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push(`${valuePath}: expected >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push(`${valuePath}: expected <= ${schema.maximum}`);
    }
    if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) {
      errors.push(`${valuePath}: expected > ${schema.exclusiveMinimum}`);
    }
    if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) {
      errors.push(`${valuePath}: expected < ${schema.exclusiveMaximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${valuePath}: expected at least ${schema.minItems} items`);
    }
    if (schema.uniqueItems === true) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) {
        errors.push(`${valuePath}: expected unique items`);
      }
    }
    if (schema.items && typeof schema.items === "object") {
      value.forEach((item, index) => {
        errors.push(...collectJsonSchemaErrors(item, schema.items, rootSchema, `${valuePath}[${index}]`));
      });
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) {
      errors.push(`${valuePath}: expected at least ${schema.minProperties} properties`);
    }
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) {
          errors.push(`${valuePath}.${key}: required property is missing`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        errors.push(...collectJsonSchemaErrors(value[key], childSchema, rootSchema, `${valuePath}.${key}`));
      }
    }
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(properties, key)) continue;
      if (schema.additionalProperties === false) {
        errors.push(`${valuePath}.${key}: additional property is not allowed`);
      } else if (
        schema.additionalProperties
        && typeof schema.additionalProperties === "object"
        && !Array.isArray(schema.additionalProperties)
      ) {
        errors.push(...collectJsonSchemaErrors(
          value[key],
          schema.additionalProperties,
          rootSchema,
          `${valuePath}.${key}`,
        ));
      }
    }
    if (schema.dependentRequired && typeof schema.dependentRequired === "object") {
      for (const [key, dependencies] of Object.entries(schema.dependentRequired)) {
        if (!Object.hasOwn(value, key) || !Array.isArray(dependencies)) continue;
        for (const dependency of dependencies) {
          if (!Object.hasOwn(value, dependency)) {
            errors.push(`${valuePath}.${dependency}: required when ${key} is present`);
          }
        }
      }
    }
  }

  return errors;
}

export function validateMapSpecAgainstSchema(mapSpec, schema) {
  const errors = collectJsonSchemaErrors(mapSpec, schema, schema, "$map");
  if (errors.length > 0) {
    fail(`map_spec.json failed schema validation:\n- ${errors.join("\n- ")}`);
  }
}

function deriveZones(spec) {
  const zones = spec?.zones;
  if (!Array.isArray(zones) || zones.length === 0) {
    fail("spec.zones must be a non-empty array");
  }

  const allowedZoneTypes =
    Array.isArray(spec?.metadata?.zone_types) && spec.metadata.zone_types.length > 0
      ? new Set(spec.metadata.zone_types)
      : KNOWN_ZONE_TYPES;

  const seenIds = new Set();
  const derived = zones.map((zone, index) => {
    if (!zone || typeof zone !== "object") {
      fail(`zones[${index}] must be an object`);
    }

    const id = ensureString(zone.id, `zones[${index}].id`);
    const type = ensureString(zone.type, `zones[${index}].type`);
    if (!allowedZoneTypes.has(type)) {
      fail(`Unknown zone type '${type}' at zone '${id}'`);
    }
    if (seenIds.has(id)) {
      fail(`Duplicate zone id '${id}'`);
    }
    seenIds.add(id);

    const rect = normalizeRect(zone.rect, `zones[${index}].rect`);
    const surfaceId = optionalString(zone.surfaceId, `zones[${index}].surfaceId`);
    const districtId = optionalString(zone.districtId, `zones[${index}].districtId`);
    const macroLane = optionalString(zone.macroLane, `zones[${index}].macroLane`);
    if (macroLane && !MACRO_LANES.has(macroLane)) {
      fail(`zones[${index}].macroLane must be one of west/main/east`);
    }
    const floorMaterialId = optionalString(zone.floorMaterialId, `zones[${index}].floorMaterialId`);
    const facadeProfileId = optionalString(zone.facadeProfileId, `zones[${index}].facadeProfileId`);
    // An authored section GLB owns every visible face of this zone; the kit keeps
    // wall mass, roofs and collision. Mounted at the rect's south-west corner.
    const sectionModelId = optionalString(zone.sectionModelId, `zones[${index}].sectionModelId`);
    if (sectionModelId && !getRuntimeModelCatalog().has(sectionModelId)) {
      fail(`Zone '${id}' sectionModelId '${sectionModelId}' is not registered in a bazaar model manifest (facades/models.json)`);
    }
    const sectionFaces = Array.isArray(zone.sectionFaces)
      ? zone.sectionFaces.map((face, faceIndex) => {
        const value = ensureString(face, `zones[${index}].sectionFaces[${faceIndex}]`);
        if (!["north", "south", "east", "west"].includes(value)) fail(`zones[${index}].sectionFaces[${faceIndex}] must be north/south/east/west`);
        return value;
      })
      : undefined;
    if (sectionFaces && !sectionModelId) fail(`zones[${index}].sectionFaces requires sectionModelId`);
    const clearWidthM = optionalNumber(zone.clearWidthM, `zones[${index}].clearWidthM`);
    if (typeof clearWidthM !== "undefined") {
      ensurePositive(clearWidthM, `zones[${index}].clearWidthM`);
      const availableCrossSectionM = type === "connector" || type === "cut"
        ? Math.max(rect.w, rect.h)
        : Math.min(rect.w, rect.h);
      if (clearWidthM > availableCrossSectionM) {
        fail(`zones[${index}].clearWidthM must fit inside the authored passage cross-section`);
      }
    }
    return {
      id,
      type,
      rect,
      label: typeof zone.label === "string" ? zone.label : "",
      notes: typeof zone.notes === "string" ? zone.notes : "",
      ...(surfaceId ? { surfaceId } : {}),
      ...(districtId ? { districtId } : {}),
      ...(macroLane ? { macroLane } : {}),
      ...(floorMaterialId ? { floorMaterialId } : {}),
      ...(facadeProfileId ? { facadeProfileId } : {}),
      ...(sectionModelId ? { sectionModelId } : {}),
      ...(sectionFaces ? { sectionFaces } : {}),
      ...(typeof clearWidthM !== "undefined" ? { clearWidthM } : {}),
    };
  });

  return {
    zoneIds: seenIds,
    zones: sortedById(derived),
  };
}

function validateExactObjectKeys(value, allowedKeys, label) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(`${label}.${key} is not an allowed property`);
    }
  }
}

function validateSurveyCameraPoint(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  validateExactObjectKeys(value, new Set(["x", "y", "z"]), label);
  asNumber(value.x, `${label}.x`);
  asNumber(value.y, `${label}.y`);
  asNumber(value.z, `${label}.z`);
}

function validateSurveyCamera(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  validateExactObjectKeys(
    value,
    new Set(["designPosition", "designLookAt", "playerPosition", "yawDeg", "pitchDeg", "fovDeg"]),
    label,
  );
  validateSurveyCameraPoint(value.designPosition, `${label}.designPosition`);
  validateSurveyCameraPoint(value.designLookAt, `${label}.designLookAt`);
  validateSurveyCameraPoint(value.playerPosition, `${label}.playerPosition`);
  const yawDeg = asNumber(value.yawDeg, `${label}.yawDeg`);
  if (typeof value.pitchDeg !== "undefined") {
    const pitchDeg = asNumber(value.pitchDeg, `${label}.pitchDeg`);
    if (pitchDeg <= -90 || pitchDeg >= 90) {
      fail(`${label}.pitchDeg must be > -90 and < 90`);
    }
  }
  const fovDeg = asNumber(value.fovDeg, `${label}.fovDeg`);
  if (fovDeg <= 0 || fovDeg >= 180) {
    fail(`${label}.fovDeg must be > 0 and < 180`);
  }
  const playerEyePosition = {
    x: value.playerPosition.x,
    y: value.playerPosition.z,
    z: value.playerPosition.y + MAP_POLISH_PLAYER_EYE_HEIGHT_M,
  };
  if (Math.hypot(
    playerEyePosition.x - value.designPosition.x,
    playerEyePosition.y - value.designPosition.y,
    playerEyePosition.z - value.designPosition.z,
  ) > MAP_POLISH_CAMERA_POSITION_TOLERANCE_M) {
    fail(`${label}.designPosition must be the 1.7m player-eye position for playerPosition`);
  }
  const lookDx = value.designLookAt.x - value.designPosition.x;
  const lookDy = value.designLookAt.y - value.designPosition.y;
  const horizontalLookDistance = Math.hypot(
    lookDx,
    lookDy,
  );
  if (horizontalLookDistance <= RECT_EPSILON) {
    fail(`${label}.designLookAt must differ from designPosition in the horizontal plane`);
  }
  const expectedYawDeg = Math.atan2(-lookDx, -lookDy) * (180 / Math.PI);
  let yawDeltaDeg = Math.abs(yawDeg - expectedYawDeg) % 360;
  if (yawDeltaDeg > 180) yawDeltaDeg = 360 - yawDeltaDeg;
  if (yawDeltaDeg > MAP_POLISH_CAMERA_YAW_TOLERANCE_DEG) {
    fail(`${label}.yawDeg must align with designPosition and designLookAt`);
  }
}

function validateMapPolishSurveyCameraOverrides(spec, zoneIds) {
  const overrides = spec?.map_polish_survey_camera_overrides;
  if (typeof overrides === "undefined") return;
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    fail("map_polish_survey_camera_overrides must be an object when provided");
  }
  const entries = Object.entries(overrides);
  if (entries.length === 0) {
    fail("map_polish_survey_camera_overrides must contain at least one zone override");
  }

  const seenZoneIds = new Set();
  for (const [rawZoneId, views] of entries) {
    const zoneId = ensureString(rawZoneId, "map_polish_survey_camera_overrides zone id");
    if (seenZoneIds.has(zoneId)) {
      fail(`Duplicate map polish survey camera override for zone '${zoneId}'`);
    }
    seenZoneIds.add(zoneId);
    if (rawZoneId !== zoneId) {
      fail(`map_polish_survey_camera_overrides zone id '${rawZoneId}' must not contain surrounding whitespace`);
    }
    if (!zoneIds.has(zoneId)) {
      fail(`Unknown map polish survey camera override zone '${zoneId}'`);
    }
    if (!views || typeof views !== "object" || Array.isArray(views)) {
      fail(`map_polish_survey_camera_overrides.${zoneId} must be an object`);
    }
    const viewEntries = Object.entries(views);
    if (viewEntries.length === 0) {
      fail(`map_polish_survey_camera_overrides.${zoneId} must define at least one view override`);
    }
    // Survey views are an ordered derived list (primary, context, elev:*,
    // cross-a/b, upper); overrides may target any deterministic view id.
    for (const [viewName, camera] of viewEntries) {
      if (!/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(viewName)) {
        fail(`map_polish_survey_camera_overrides.${zoneId} view id '${viewName}' is invalid`);
      }
      validateSurveyCamera(
        camera,
        `map_polish_survey_camera_overrides.${zoneId}.${viewName}`,
      );
    }
  }
}

function sampleSurfaceElevation(surface, x, y) {
  if (!surface) return 0;
  if (surface.kind === "flat") return surface.elevationM;
  const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
  const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const axisCoord = surface.axis === "x" ? x : y;
  const t = Math.max(0, Math.min(1, (axisCoord - axisStart) / Math.max(axisLength, RECT_EPSILON)));
  return surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t;
}

function resolveFrontageAnchorPoint(frontage, zone, along, insetM) {
  const frontageStart = frontage.start ?? 0;
  const frontageEnd = frontage.end ?? 1;
  const t = frontageStart + (frontageEnd - frontageStart) * along;
  if (frontage.face === "west") {
    return { x: zone.rect.x + insetM, y: zone.rect.y + zone.rect.h * t, yawDeg: 90 };
  }
  if (frontage.face === "east") {
    return { x: zone.rect.x + zone.rect.w - insetM, y: zone.rect.y + zone.rect.h * t, yawDeg: 270 };
  }
  if (frontage.face === "south") {
    return { x: zone.rect.x + zone.rect.w * t, y: zone.rect.y + insetM, yawDeg: 0 };
  }
  return { x: zone.rect.x + zone.rect.w * t, y: zone.rect.y + zone.rect.h - insetM, yawDeg: 180 };
}

function deriveAnchors(spec, zoneIds, zoneById, frontages, traversalSurfaces) {
  const anchors = spec?.anchors;
  if (!Array.isArray(anchors)) {
    fail("spec.anchors must be an array");
  }

  const allowedAnchorTypes =
    Array.isArray(spec?.metadata?.anchor_types) && spec.metadata.anchor_types.length > 0
      ? new Set(spec.metadata.anchor_types)
      : KNOWN_ANCHOR_TYPES;

  const seenIds = new Set();
  const derived = anchors.map((anchor, index) => {
    if (!anchor || typeof anchor !== "object") {
      fail(`anchors[${index}] must be an object`);
    }

    const id = ensureString(anchor.id, `anchors[${index}].id`);
    const type = ensureString(anchor.type, `anchors[${index}].type`);
    if (!allowedAnchorTypes.has(type)) {
      fail(`Unknown anchor type '${type}' at anchor '${id}'`);
    }
    if (seenIds.has(id)) {
      fail(`Duplicate anchor id '${id}'`);
    }
    seenIds.add(id);

    const zone = ensureString(anchor.zone, `anchors[${index}].zone`);
    if (!zoneIds.has(zone)) {
      fail(`Anchor '${id}' references unknown zone '${zone}'`);
    }

    const frontageId = optionalString(anchor.frontageId, `anchors[${index}].frontageId`);
    const frontage = frontageId ? (frontages ?? []).find((entry) => entry.id === frontageId) : undefined;
    if (frontageId && !frontage) {
      fail(`Anchor '${id}' references unknown frontage '${frontageId}'`);
    }
    if (frontage && frontage.zoneId !== zone) {
      fail(`Anchor '${id}' frontage '${frontage.id}' belongs to another zone`);
    }

    let x;
    let y;
    let z;
    let defaultYawDeg;
    if (frontage) {
      const along = asNumber(anchor.along, `anchors[${index}].along`);
      if (along < 0 || along > 1) fail(`anchors[${index}].along must be between 0 and 1`);
      const insetM = optionalNumber(anchor.inset_m, `anchors[${index}].inset_m`) ?? 0;
      if (insetM < 0) fail(`anchors[${index}].inset_m must be >= 0`);
      const point = resolveFrontageAnchorPoint(frontage, zoneById.get(zone), along, insetM);
      x = point.x;
      y = point.y;
      defaultYawDeg = point.yawDeg;
      const surface = traversalSurfaces?.find((entry) => entry.zoneId === zone);
      z = sampleSurfaceElevation(surface, x, y)
        + (optionalNumber(anchor.vertical_offset_m, `anchors[${index}].vertical_offset_m`) ?? 0);
    } else {
      x = asNumber(anchor.x, `anchors[${index}].x`);
      y = asNumber(anchor.y, `anchors[${index}].y`);
      z = asNumber(anchor.z, `anchors[${index}].z`);
    }
    if (!inRect2D(x, y, zoneById.get(zone).rect)) {
      fail(`Anchor '${id}' must fit inside zone '${zone}'`);
    }
    const yawDeg = optionalNumber(anchor.yaw_deg, `anchors[${index}].yaw_deg`) ?? defaultYawDeg;

    const endFrontageId = optionalString(anchor.end_frontage_id, `anchors[${index}].end_frontage_id`);
    const endFrontage = endFrontageId ? (frontages ?? []).find((entry) => entry.id === endFrontageId) : undefined;
    if (endFrontageId && !endFrontage) {
      fail(`Anchor '${id}' references unknown end frontage '${endFrontageId}'`);
    }
    let endX = optionalNumber(anchor.end_x, `anchors[${index}].end_x`);
    let endY = optionalNumber(anchor.end_y, `anchors[${index}].end_y`);
    let endZ = optionalNumber(anchor.end_z, `anchors[${index}].end_z`);
    if (endFrontage) {
      const endAlong = asNumber(anchor.end_along, `anchors[${index}].end_along`);
      if (endAlong < 0 || endAlong > 1) fail(`anchors[${index}].end_along must be between 0 and 1`);
      const endInsetM = optionalNumber(anchor.end_inset_m, `anchors[${index}].end_inset_m`) ?? 0;
      if (endInsetM < 0) fail(`anchors[${index}].end_inset_m must be >= 0`);
      const endZone = zoneById.get(endFrontage.zoneId);
      const point = resolveFrontageAnchorPoint(endFrontage, endZone, endAlong, endInsetM);
      endX = point.x;
      endY = point.y;
      if (!inRect2D(endX, endY, endZone.rect)) {
        fail(`Anchor '${id}' end frontage point must fit inside zone '${endFrontage.zoneId}'`);
      }
      const surface = traversalSurfaces?.find((entry) => entry.zoneId === endFrontage.zoneId);
      endZ = sampleSurfaceElevation(surface, endX, endY)
        + (optionalNumber(anchor.end_vertical_offset_m, `anchors[${index}].end_vertical_offset_m`) ?? 0);
    }
    const hasAnyEndPos = typeof endX !== "undefined" || typeof endY !== "undefined" || typeof endZ !== "undefined";
    if (hasAnyEndPos && (typeof endX === "undefined" || typeof endY === "undefined" || typeof endZ === "undefined")) {
      fail(`Anchor '${id}' must provide all of end_x/end_y/end_z or none`);
    }

    const widthM = optionalNumber(anchor.width_m, `anchors[${index}].width_m`);
    const heightM = optionalNumber(anchor.height_m, `anchors[${index}].height_m`);
    if (typeof widthM !== "undefined") ensurePositive(widthM, `anchors[${index}].width_m`);
    if (typeof heightM !== "undefined") ensurePositive(heightM, `anchors[${index}].height_m`);

    const normalized = {
      id,
      type,
      zone,
      pos: { x, y, z },
      ...(typeof yawDeg !== "undefined" ? { yawDeg } : {}),
      ...(hasAnyEndPos ? { endPos: { x: endX, y: endY, z: endZ } } : {}),
      ...(typeof widthM !== "undefined" ? { widthM } : {}),
      ...(typeof heightM !== "undefined" ? { heightM } : {}),
      ...(frontage ? {
        frontageId: frontage.id,
        along: asNumber(anchor.along, `anchors[${index}].along`),
        ...(typeof anchor.servedBayId === "string" ? { servedBayId: anchor.servedBayId } : {}),
      } : {}),
      ...(endFrontage ? {
        endFrontageId: endFrontage.id,
        endAlong: asNumber(anchor.end_along, `anchors[${index}].end_along`),
      } : {}),
      ...(typeof anchor.notes === "string" && anchor.notes.length > 0 ? { notes: anchor.notes } : {}),
    };

    return normalized;
  });

  return sortedById(derived);
}

function deriveDistricts(spec) {
  const source = requireArrayWhenPresent(spec, "districts");
  if (typeof source === "undefined") {
    return undefined;
  }

  const seenIds = new Set();
  const districts = source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`districts[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `districts[${index}].id`);
    if (seenIds.has(id)) {
      fail(`Duplicate district id '${id}'`);
    }
    seenIds.add(id);
    return {
      id,
      label: ensureString(entry.label, `districts[${index}].label`),
      ...(typeof entry.notes !== "undefined"
        ? { notes: ensureString(entry.notes, `districts[${index}].notes`) }
        : {}),
    };
  });
  return sortedById(districts);
}

function deriveTraversalSurfaces(spec, zoneById) {
  const source = requireArrayWhenPresent(spec, "traversal_surfaces");
  if (typeof source === "undefined") {
    return undefined;
  }

  const seenIds = new Set();
  const surfaces = source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`traversal_surfaces[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `traversal_surfaces[${index}].id`);
    if (seenIds.has(id)) {
      fail(`Duplicate traversal surface id '${id}'`);
    }
    seenIds.add(id);

    const zoneId = ensureString(entry.zoneId, `traversal_surfaces[${index}].zoneId`);
    const zone = zoneById.get(zoneId);
    if (!zone) {
      fail(`Traversal surface '${id}' references unknown zone '${zoneId}'`);
    }
    const rect = normalizeRect(entry.rect, `traversal_surfaces[${index}].rect`);
    if (!rectContainsRect(zone.rect, rect)) {
      fail(`Traversal surface '${id}' must fit inside zone '${zoneId}'`);
    }

    const kind = ensureString(entry.kind, `traversal_surfaces[${index}].kind`);
    if (kind === "flat") {
      return {
        id,
        zoneId,
        kind,
        rect,
        elevationM: asNumber(entry.elevationM, `traversal_surfaces[${index}].elevationM`),
      };
    }
    if (kind !== "ramp") {
      fail(`traversal_surfaces[${index}].kind must be 'flat' or 'ramp'`);
    }

    const axis = ensureString(entry.axis, `traversal_surfaces[${index}].axis`);
    if (axis !== "x" && axis !== "y") {
      fail(`traversal_surfaces[${index}].axis must be 'x' or 'y'`);
    }
    const startElevationM = asNumber(
      entry.startElevationM,
      `traversal_surfaces[${index}].startElevationM`,
    );
    const endElevationM = asNumber(entry.endElevationM, `traversal_surfaces[${index}].endElevationM`);
    if (startElevationM === endElevationM) {
      fail(`Ramp traversal surface '${id}' must change elevation`);
    }
    const runM = axis === "x" ? rect.w : rect.h;
    const gradeDeg = Math.atan(Math.abs(endElevationM - startElevationM) / runM) * (180 / Math.PI);
    if (gradeDeg > MAX_AUTHORED_GRADE_DEG + RECT_EPSILON) {
      fail(
        `Ramp traversal surface '${id}' grade ${gradeDeg.toFixed(2)}deg exceeds ${MAX_AUTHORED_GRADE_DEG}deg`,
      );
    }
    const visualStyle = optionalString(entry.visual_style, `traversal_surfaces[${index}].visual_style`);
    if (visualStyle && visualStyle !== "ramp" && visualStyle !== "stairs") {
      fail(`traversal_surfaces[${index}].visual_style must be 'ramp' or 'stairs'`);
    }
    const stepCount = optionalNumber(entry.step_count, `traversal_surfaces[${index}].step_count`);
    if (typeof stepCount !== "undefined" && (!Number.isInteger(stepCount) || stepCount < 1 || stepCount > 64)) {
      fail(`traversal_surfaces[${index}].step_count must be an integer from 1 through 64`);
    }
    if ((visualStyle === "stairs") !== (typeof stepCount !== "undefined")) {
      fail(`Traversal surface '${id}' must pair visual_style 'stairs' with step_count`);
    }
    return {
      id,
      zoneId,
      kind,
      rect,
      axis,
      startElevationM,
      endElevationM,
      ...(visualStyle ? { visualStyle } : {}),
      ...(typeof stepCount !== "undefined" ? { stepCount } : {}),
    };
  });
  return sortedById(surfaces);
}

function deriveTacticalLanes(spec, zoneIds) {
  const source = requireArrayWhenPresent(spec, "tactical_lanes");
  if (typeof source === "undefined") {
    return undefined;
  }

  const seenIds = new Set();
  const lanes = source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`tactical_lanes[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `tactical_lanes[${index}].id`);
    if (!MACRO_LANES.has(id)) {
      fail(`tactical_lanes[${index}].id must be one of west/main/east`);
    }
    if (seenIds.has(id)) {
      fail(`Duplicate tactical lane id '${id}'`);
    }
    seenIds.add(id);
    if (!Array.isArray(entry.zoneIds) || entry.zoneIds.length === 0) {
      fail(`tactical_lanes[${index}].zoneIds must be a non-empty array`);
    }
    const seenZoneIds = new Set();
    const laneZoneIds = entry.zoneIds.map((value, zoneIndex) => {
      const zoneId = ensureString(value, `tactical_lanes[${index}].zoneIds[${zoneIndex}]`);
      if (!zoneIds.has(zoneId)) {
        fail(`Tactical lane '${id}' references unknown zone '${zoneId}'`);
      }
      if (seenZoneIds.has(zoneId)) {
        fail(`Tactical lane '${id}' repeats zone '${zoneId}'`);
      }
      seenZoneIds.add(zoneId);
      return zoneId;
    });
    const cost = optionalNumber(entry.cost, `tactical_lanes[${index}].cost`);
    if (typeof cost !== "undefined") ensurePositive(cost, `tactical_lanes[${index}].cost`);
    return {
      id,
      label: ensureString(entry.label, `tactical_lanes[${index}].label`),
      zoneIds: laneZoneIds,
      ...(typeof cost !== "undefined" ? { cost } : {}),
    };
  });
  return sortedById(lanes);
}

function deriveExplicitConnectivity(spec, zoneIds, surfaceById) {
  const source = requireArrayWhenPresent(spec, "explicit_connectivity");
  if (typeof source === "undefined") {
    return undefined;
  }

  const seenEdges = new Set();
  return source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`explicit_connectivity[${index}] must be an object`);
    }
    const fromZoneId = ensureString(entry.fromZoneId, `explicit_connectivity[${index}].fromZoneId`);
    const toZoneId = ensureString(entry.toZoneId, `explicit_connectivity[${index}].toZoneId`);
    if (!zoneIds.has(fromZoneId)) {
      fail(`explicit_connectivity[${index}].fromZoneId '${fromZoneId}' is unknown`);
    }
    if (!zoneIds.has(toZoneId)) {
      fail(`explicit_connectivity[${index}].toZoneId '${toZoneId}' is unknown`);
    }
    if (fromZoneId === toZoneId) {
      fail(`explicit_connectivity[${index}] cannot connect zone '${fromZoneId}' to itself`);
    }
    const transitionSurfaceId = optionalString(
      entry.transitionSurfaceId,
      `explicit_connectivity[${index}].transitionSurfaceId`,
    );
    if (transitionSurfaceId) {
      const surface = surfaceById.get(transitionSurfaceId);
      if (!surface) {
        fail(`explicit_connectivity[${index}] references unknown surface '${transitionSurfaceId}'`);
      }
      if (surface.zoneId !== fromZoneId && surface.zoneId !== toZoneId) {
        fail(`Transition surface '${transitionSurfaceId}' must belong to one endpoint zone`);
      }
    }
    const cost = optionalNumber(entry.cost, `explicit_connectivity[${index}].cost`);
    if (typeof cost !== "undefined") ensurePositive(cost, `explicit_connectivity[${index}].cost`);
    const edgeKey = `${fromZoneId}\u0000${toZoneId}\u0000${transitionSurfaceId ?? ""}`;
    if (seenEdges.has(edgeKey)) {
      fail(`Duplicate explicit connectivity edge '${fromZoneId}' -> '${toZoneId}'`);
    }
    seenEdges.add(edgeKey);
    return {
      fromZoneId,
      toZoneId,
      ...(transitionSurfaceId ? { transitionSurfaceId } : {}),
      ...(typeof cost !== "undefined" ? { cost } : {}),
    };
  });
}

function validateConnectedTopology(zones, explicitConnectivity) {
  if (typeof explicitConnectivity === "undefined") return;
  if (explicitConnectivity.length === 0) fail("explicit_connectivity must connect the authored topology");
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const adjacency = new Map(zones.map((zone) => [zone.id, new Set()]));
  for (const edge of explicitConnectivity) {
    const from = zoneById.get(edge.fromZoneId);
    const to = zoneById.get(edge.toZoneId);
    if (!rectsTouchOrOverlap(from.rect, to.rect)) {
      fail(`Explicit connectivity edge '${from.id}' -> '${to.id}' joins zones without a physical opening`);
    }
    adjacency.get(from.id).add(to.id);
    adjacency.get(to.id).add(from.id);
  }
  const visited = new Set();
  const pending = [zones[0].id];
  while (pending.length > 0) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const neighbor of adjacency.get(id)) if (!visited.has(neighbor)) pending.push(neighbor);
  }
  if (visited.size !== zones.length) {
    const missing = zones.filter((zone) => !visited.has(zone.id)).map((zone) => zone.id).sort();
    fail(`Explicit connectivity leaves zones disconnected: ${missing.join(", ")}`);
  }
}

function validateSealedPerimeter(formatVersion, boundary, patches) {
  if (!String(formatVersion ?? "").startsWith("3")) return;
  const sides = [
    { name: "south", orientation: "horizontal", coord: boundary.y, outward: -1, start: boundary.x, end: boundary.x + boundary.w },
    { name: "north", orientation: "horizontal", coord: boundary.y + boundary.h, outward: 1, start: boundary.x, end: boundary.x + boundary.w },
    { name: "west", orientation: "vertical", coord: boundary.x, outward: -1, start: boundary.y, end: boundary.y + boundary.h },
    { name: "east", orientation: "vertical", coord: boundary.x + boundary.w, outward: 1, start: boundary.y, end: boundary.y + boundary.h },
  ];
  for (const side of sides) {
    const intervals = patches
      .filter((patch) => patch.orientation === side.orientation && Math.abs(patch.coord - side.coord) <= RECT_EPSILON && patch.outward === side.outward)
      .map((patch) => ({ start: Math.max(side.start, patch.start), end: Math.min(side.end, patch.end) }))
      .filter((interval) => interval.end > interval.start + RECT_EPSILON)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    let cursor = side.start;
    for (const interval of intervals) {
      if (interval.start > cursor + RECT_EPSILON) break;
      cursor = Math.max(cursor, interval.end);
    }
    if (cursor < side.end - RECT_EPSILON) {
      fail(`V3 exterior_wall_patches must seal the complete ${side.name} perimeter`);
    }
  }
  for (const patch of patches) {
    const onBoundary = sides.some((side) => patch.orientation === side.orientation && Math.abs(patch.coord - side.coord) <= RECT_EPSILON && patch.outward === side.outward);
    if (!onBoundary) fail("V3 exterior_wall_patches may only describe outward-facing playable-boundary walls");
  }
}

function deriveAuthoredSpawns(spec, zoneById, surfaceById) {
  const source = requireArrayWhenPresent(spec, "authored_spawns");
  if (typeof source === "undefined") {
    return undefined;
  }

  const seenIds = new Set();
  const spawns = source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`authored_spawns[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `authored_spawns[${index}].id`);
    if (seenIds.has(id)) {
      fail(`Duplicate authored spawn id '${id}'`);
    }
    seenIds.add(id);
    const kind = ensureString(entry.kind, `authored_spawns[${index}].kind`);
    if (kind !== "player" && kind !== "enemy") {
      fail(`authored_spawns[${index}].kind must be 'player' or 'enemy'`);
    }
    const zoneId = ensureString(entry.zoneId, `authored_spawns[${index}].zoneId`);
    const zone = zoneById.get(zoneId);
    if (!zone) {
      fail(`Authored spawn '${id}' references unknown zone '${zoneId}'`);
    }
    const surfaceId = ensureString(entry.surfaceId, `authored_spawns[${index}].surfaceId`);
    const surface = surfaceById.get(surfaceId);
    if (!surface) {
      fail(`Authored spawn '${id}' references unknown surface '${surfaceId}'`);
    }
    if (surface.zoneId !== zoneId) {
      fail(`Authored spawn '${id}' zone and surface must belong together`);
    }
    const x = asNumber(entry.x, `authored_spawns[${index}].x`);
    const y = asNumber(entry.y, `authored_spawns[${index}].y`);
    if (!inRect2D(x, y, zone.rect) || !inRect2D(x, y, surface.rect)) {
      fail(`Authored spawn '${id}' must lie inside its zone and traversal surface`);
    }
    const yawDeg = asNumber(entry.yawDeg, `authored_spawns[${index}].yawDeg`);
    if (yawDeg < 0 || yawDeg >= 360) {
      fail(`authored_spawns[${index}].yawDeg must be >= 0 and < 360`);
    }
    return { id, kind, zoneId, surfaceId, x, y, yawDeg };
  });
  return sortedById(spawns);
}

function requireV3Array(spec, key, formatVersion) {
  const source = requireArrayWhenPresent(spec, key);
  if (isV3FormatVersion(formatVersion) && (!source || source.length === 0)) {
    fail(`V3 map spec requires a non-empty '${key}' array`);
  }
  return source;
}

let runtimeModelCatalogCache;

function getRuntimeModelCatalog() {
  if (runtimeModelCatalogCache) return runtimeModelCatalogCache;
  const manifestEntries = [
    {
      filePath: path.join(repoRoot, "apps/client/public/assets/models/environment/bazaar/props/models.json"),
      publicBase: "/assets/models/environment/bazaar/props",
    },
    {
      filePath: path.join(repoRoot, "apps/client/public/assets/models/environment/bazaar/doors/models.json"),
      publicBase: "/assets/models/environment/bazaar/doors",
    },
    {
      filePath: path.join(repoRoot, "apps/client/public/assets/models/environment/bazaar/facades/models.json"),
      publicBase: "/assets/models/environment/bazaar/facades",
    },
  ];
  const catalog = new Map();
  for (const manifest of manifestEntries) {
    if (!existsSync(manifest.filePath)) continue;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(manifest.filePath, "utf8"));
    } catch (error) {
      fail(`Invalid model manifest ${manifest.filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    for (const model of parsed.models ?? []) {
      const id = ensureString(model.id, `${manifest.filePath}.models[].id`);
      const relativeUri = ensureString(model.url, `${manifest.filePath}.models[].url`);
      if (catalog.has(id)) fail(`Duplicate runtime model id '${id}' across bazaar model manifests`);
      catalog.set(id, path.posix.join(manifest.publicBase, relativeUri));
      // Authored GLBs name their pack materials; the runtime preloads exactly these.
      runtimeModelMaterialIds.set(id, Array.isArray(model.materialIds) ? model.materialIds.map(String) : []);
    }
  }
  runtimeModelCatalogCache = catalog;
  return catalog;
}
const runtimeModelMaterialIds = new Map();

function deriveMassingProfiles(spec, formatVersion) {
  const source = requireV3Array(spec, "massing_profiles", formatVersion);
  if (typeof source === "undefined") return undefined;
  const seenIds = new Set();
  return sortedById(source.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`massing_profiles[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `massing_profiles[${index}].id`);
    if (seenIds.has(id)) fail(`Duplicate massing profile id '${id}'`);
    seenIds.add(id);
    const heightM = asNumber(entry.heightM, `massing_profiles[${index}].heightM`);
    const depthM = asNumber(entry.depthM, `massing_profiles[${index}].depthM`);
    const roofStyle = ensureString(entry.roofStyle, `massing_profiles[${index}].roofStyle`);
    const roofSetbackM = asNumber(entry.roofSetbackM, `massing_profiles[${index}].roofSetbackM`);
    const parapetHeightM = asNumber(entry.parapetHeightM, `massing_profiles[${index}].parapetHeightM`);
    const upperStorySetbackM = asNumber(entry.upperStorySetbackM, `massing_profiles[${index}].upperStorySetbackM`);
    ensurePositive(heightM, `massing_profiles[${index}].heightM`);
    ensurePositive(depthM, `massing_profiles[${index}].depthM`);
    if (!MASSING_ROOF_STYLES.has(roofStyle)) fail(`Massing profile '${id}' has unsupported roofStyle '${roofStyle}'`);
    if (roofSetbackM < 0 || roofSetbackM * 2 >= depthM) fail(`Massing profile '${id}' roofSetbackM must fit its depth`);
    ensurePositive(parapetHeightM, `massing_profiles[${index}].parapetHeightM`);
    if (upperStorySetbackM < 0 || upperStorySetbackM * 2 >= depthM) {
      fail(`Massing profile '${id}' upperStorySetbackM must fit its depth`);
    }
    return {
      id,
      label: ensureString(entry.label, `massing_profiles[${index}].label`),
      heightM,
      depthM,
      roofStyle,
      roofSetbackM,
      parapetHeightM,
      upperStorySetbackM,
    };
  }));
}

function deriveFacadeModules(spec, formatVersion, assetById) {
  const source = requireV3Array(spec, "facade_modules", formatVersion);
  if (typeof source === "undefined") return undefined;
  const seenIds = new Set();
  return sortedById(source.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`facade_modules[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `facade_modules[${index}].id`);
    if (seenIds.has(id)) fail(`Duplicate facade module id '${id}'`);
    seenIds.add(id);
    const kind = ensureString(entry.kind, `facade_modules[${index}].kind`);
    if (!FACADE_MODULE_KINDS.has(kind)) fail(`Facade module '${id}' has unsupported kind '${kind}'`);
    const openingType = ensureString(entry.openingType, `facade_modules[${index}].openingType`);
    if (!FACADE_OPENING_TYPES.has(openingType)) fail(`Facade module '${id}' has unsupported openingType '${openingType}'`);
    const materialSlot = ensureString(entry.materialSlot, `facade_modules[${index}].materialSlot`);
    if (!FACADE_MATERIAL_SLOTS.has(materialSlot)) fail(`Facade module '${id}' has unsupported materialSlot '${materialSlot}'`);
    const collisionOpening = optionalBoolean(entry.collisionOpening, `facade_modules[${index}].collisionOpening`);
    if (collisionOpening !== false) fail(`Facade module '${id}' must explicitly set collisionOpening=false for noninteractive facades`);
    const assetId = optionalString(entry.assetId, `facade_modules[${index}].assetId`);
    if (assetId && !assetById?.has(assetId)) fail(`Facade module '${id}' references unknown asset '${assetId}'`);
    if (kind === "column" && openingType !== "none") fail(`Facade column '${id}' cannot declare an opening`);
    if (kind === "arch" && openingType !== "arch_void") fail(`Facade arch '${id}' must use openingType 'arch_void'`);
    return {
      id,
      label: ensureString(entry.label, `facade_modules[${index}].label`),
      kind,
      openingType,
      dimensionsM: normalizeDimensions(entry.dimensionsM, `facade_modules[${index}].dimensionsM`),
      materialSlot,
      collisionOpening: false,
      ...(assetId ? { assetId } : {}),
    };
  }));
}

function deriveFacadeProfiles(spec, formatVersion, massingById, moduleById) {
  const source = requireV3Array(spec, "facade_profiles", formatVersion);
  if (typeof source === "undefined") return undefined;
  const seenIds = new Set();
  return sortedById(source.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`facade_profiles[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `facade_profiles[${index}].id`);
    if (seenIds.has(id)) fail(`Duplicate facade profile id '${id}'`);
    seenIds.add(id);
    const family = ensureString(entry.family, `facade_profiles[${index}].family`);
    if (!FACADE_FAMILIES.has(family)) fail(`Facade profile '${id}' has unsupported family '${family}'`);
    const massingProfileId = ensureString(entry.massingProfileId, `facade_profiles[${index}].massingProfileId`);
    if (!massingById?.has(massingProfileId)) fail(`Facade profile '${id}' references unknown massing profile '${massingProfileId}'`);
    const materialSlots = entry.materialSlots;
    if (!materialSlots || typeof materialSlots !== "object" || Array.isArray(materialSlots)) {
      fail(`facade_profiles[${index}].materialSlots must be an object`);
    }
    const compiledMaterialSlots = {};
    for (const slot of FACADE_MATERIAL_SLOTS) {
      compiledMaterialSlots[slot] = ensureString(materialSlots[slot], `facade_profiles[${index}].materialSlots.${slot}`);
    }
    if (isV3FormatVersion(formatVersion)) {
      if (!V3_WALL_MATERIAL_IDS.has(compiledMaterialSlots.wall)) {
        fail(`Facade profile '${id}' wall material '${compiledMaterialSlots.wall}' is outside the v3 wall-family palette`);
      }
      if (
        compiledMaterialSlots.roof !== compiledMaterialSlots.wall
        && !V3_ROOF_MATERIAL_IDS.has(compiledMaterialSlots.roof)
      ) {
        fail(`Facade profile '${id}' roof material '${compiledMaterialSlots.roof}' is outside the v3 roof-family palette`);
      }
      if (!V3_TRIM_MATERIAL_IDS.has(compiledMaterialSlots.trim)) {
        fail(`Facade profile '${id}' trim material '${compiledMaterialSlots.trim}' is outside the v3 trim palette`);
      }
    }
    if (!Array.isArray(entry.moduleIds) || entry.moduleIds.length === 0) {
      fail(`facade_profiles[${index}].moduleIds must be a non-empty array`);
    }
    const moduleIds = entry.moduleIds.map((value, moduleIndex) => {
      const moduleId = ensureString(value, `facade_profiles[${index}].moduleIds[${moduleIndex}]`);
      if (!moduleById?.has(moduleId)) fail(`Facade profile '${id}' references unknown module '${moduleId}'`);
      return moduleId;
    });
    if (new Set(moduleIds).size !== moduleIds.length) fail(`Facade profile '${id}' repeats a module id`);
    return {
      id,
      label: ensureString(entry.label, `facade_profiles[${index}].label`),
      family,
      massingProfileId,
      materialSlots: compiledMaterialSlots,
      moduleIds,
    };
  }));
}

function deriveFrontages(spec, zoneIds, zoneById, districtIds, formatVersion, massingById, profileById, moduleById) {
  const source = requireArrayWhenPresent(spec, "frontages");
  if (typeof source === "undefined") {
    if (isV3FormatVersion(formatVersion)) fail("V3 map spec requires frontages");
    return undefined;
  }

  const seenIds = new Set();
  const frontages = source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`frontages[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `frontages[${index}].id`);
    if (seenIds.has(id)) {
      fail(`Duplicate frontage id '${id}'`);
    }
    seenIds.add(id);
    const zoneId = ensureString(entry.zoneId, `frontages[${index}].zoneId`);
    if (!zoneIds.has(zoneId)) {
      fail(`Frontage '${id}' references unknown zone '${zoneId}'`);
    }
    const face = ensureString(entry.face, `frontages[${index}].face`);
    if (!FACADE_FACES.has(face)) {
      fail(`frontages[${index}].face must be one of north/south/east/west`);
    }
    const start = optionalNumber(entry.start, `frontages[${index}].start`);
    const end = optionalNumber(entry.end, `frontages[${index}].end`);
    if ((typeof start === "undefined") !== (typeof end === "undefined")) {
      fail(`Frontage '${id}' must provide both start and end, or neither`);
    }
    if (typeof start !== "undefined" && typeof end !== "undefined") {
      if (start < 0 || end > 1 || start >= end) {
        fail(`Frontage '${id}' start/end must satisfy 0 <= start < end <= 1`);
      }
    }
    const districtId = optionalString(entry.districtId, `frontages[${index}].districtId`);
    if (districtId && !districtIds.has(districtId)) {
      fail(`Frontage '${id}' references unknown district '${districtId}'`);
    }
    const facadeProfileId = optionalString(entry.facadeProfileId, `frontages[${index}].facadeProfileId`);
    if (isV3FormatVersion(formatVersion) && !facadeProfileId) fail(`V3 frontage '${id}' requires facadeProfileId`);
    const profile = facadeProfileId ? profileById?.get(facadeProfileId) : undefined;
    if (facadeProfileId && !profile) fail(`Frontage '${id}' references unknown facade profile '${facadeProfileId}'`);
    const massingProfileId = optionalString(entry.massingProfileId, `frontages[${index}].massingProfileId`)
      ?? profile?.massingProfileId;
    if (isV3FormatVersion(formatVersion) && !massingProfileId) fail(`V3 frontage '${id}' requires massingProfileId`);
    if (massingProfileId && !massingById?.has(massingProfileId)) {
      fail(`Frontage '${id}' references unknown massing profile '${massingProfileId}'`);
    }
    // An authored facade GLB owns this frontage's street face; the runtime keeps
    // the massing and drops the kit's face modules. It must be a registered model.
    const facadeModelId = optionalString(entry.facadeModelId, `frontages[${index}].facadeModelId`);
    if (facadeModelId && !getRuntimeModelCatalog().has(facadeModelId)) {
      fail(`Frontage '${id}' facadeModelId '${facadeModelId}' is not registered in a bazaar model manifest (facades/models.json)`);
    }
    let bays;
    let layout;
    const layoutIntent = entry.layoutIntent;
    if (isV3FormatVersion(formatVersion)) {
      if (!layoutIntent || typeof layoutIntent !== "object" || Array.isArray(layoutIntent)) {
        fail(`V3 frontage '${id}' requires layoutIntent`);
      }
      const mode = ensureString(layoutIntent.mode, `frontages[${index}].layoutIntent.mode`);
      if (mode !== "generated" && mode !== "authored") {
        fail(`Frontage '${id}' layoutIntent.mode must be 'generated' or 'authored'`);
      }
      if (typeof entry.bays !== "undefined") {
        fail(`V3 frontage '${id}' cannot carry top-level bays; authored bays belong inside layoutIntent`);
      }
      const zone = zoneById.get(zoneId);
      const massing = massingById.get(massingProfileId);
      const frontageLengthM = (face === "west" || face === "east" ? zone.rect.h : zone.rect.w)
        * ((end ?? 1) - (start ?? 0));
      if (mode === "authored") {
        // Composition is a design decision: named columns, declared mirrors and
        // corner treatment, one ordering sentence. Same physical validator as generated.
        const authored = generateAuthoredFacadeLayout({
          frontageId: id,
          lengthM: frontageLengthM,
          heightM: massing.heightM,
          family: profile.family,
          profileModuleIds: profile.moduleIds,
          moduleById,
          intent: layoutIntent,
        });
        bays = authored.bays;
        layout = authored.layout;
      } else {
        const rhythm = ensureString(layoutIntent.rhythm, `frontages[${index}].layoutIntent.rhythm`);
        if (!FACADE_LAYOUT_RHYTHMS.has(rhythm)) fail(`Frontage '${id}' has unsupported layout rhythm '${rhythm}'`);
        const accentModuleId = optionalString(
          layoutIntent.accentModuleId,
          `frontages[${index}].layoutIntent.accentModuleId`,
        );
        if (accentModuleId && (!moduleById?.has(accentModuleId) || !profile?.moduleIds.includes(accentModuleId))) {
          fail(`Frontage '${id}' accent module '${accentModuleId}' is outside profile '${profile?.id}'`);
        }
        const generated = generateFacadeLayout({
          frontageId: id,
          lengthM: frontageLengthM,
          heightM: massing.heightM,
          family: profile.family,
          rhythm,
          profileModuleIds: profile.moduleIds,
          moduleById,
          accentModuleId,
        });
        bays = generated.bays;
        layout = generated.layout;
      }
    } else if (typeof entry.bays !== "undefined") {
      if (!Array.isArray(entry.bays) || entry.bays.length === 0) fail(`Frontage '${id}' bays must be a non-empty array`);
      const seenBayIds = new Set();
      bays = entry.bays.map((bay, bayIndex) => {
        if (!bay || typeof bay !== "object" || Array.isArray(bay)) fail(`Frontage '${id}' bay ${bayIndex} must be an object`);
        const bayId = ensureString(bay.id, `frontages[${index}].bays[${bayIndex}].id`);
        if (seenBayIds.has(bayId)) fail(`Frontage '${id}' repeats bay id '${bayId}'`);
        seenBayIds.add(bayId);
        const moduleId = ensureString(bay.moduleId, `frontages[${index}].bays[${bayIndex}].moduleId`);
        const module = moduleById?.get(moduleId);
        if (!module) fail(`Frontage '${id}' bay '${bayId}' references unknown module '${moduleId}'`);
        if (profile && !profile.moduleIds.includes(moduleId)) {
          fail(`Frontage '${id}' bay '${bayId}' uses module '${moduleId}' outside facade profile '${profile.id}'`);
        }
        const along = asNumber(bay.along, `frontages[${index}].bays[${bayIndex}].along`);
        if (along < 0 || along > 1) fail(`Frontage '${id}' bay '${bayId}' along must be between 0 and 1`);
        const baseElevationM = asNumber(bay.baseElevationM, `frontages[${index}].bays[${bayIndex}].baseElevationM`);
        if (baseElevationM < 0) fail(`Frontage '${id}' bay '${bayId}' baseElevationM must be >= 0`);
        return { id: bayId, moduleId, along, baseElevationM };
      }).sort((a, b) => a.along - b.along || a.id.localeCompare(b.id));
    }
    if (isV3FormatVersion(formatVersion) && (!bays || bays.length === 0)) {
      fail(`V3 frontage '${id}' requires generated or authored bays`);
    }
    return {
      id,
      zoneId,
      face,
      ...(typeof start !== "undefined" ? { start, end } : {}),
      ...(districtId ? { districtId } : {}),
      ...(facadeProfileId ? { facadeProfileId } : {}),
      ...(massingProfileId ? { massingProfileId } : {}),
      ...(facadeModelId ? { facadeModelId } : {}),
      ...(bays ? { bays } : {}),
      ...(layout ? { layout } : {}),
    };
  });
  return sortedById(frontages);
}

function frontageGrammarLine(frontage, zone) {
  const start = frontage.start ?? 0;
  const end = frontage.end ?? 1;
  if (frontage.face === "west" || frontage.face === "east") {
    return {
      orientation: "vertical",
      coord: frontage.face === "west" ? zone.rect.x : zone.rect.x + zone.rect.w,
      start: zone.rect.y + zone.rect.h * start,
      end: zone.rect.y + zone.rect.h * end,
    };
  }
  return {
    orientation: "horizontal",
    coord: frontage.face === "south" ? zone.rect.y : zone.rect.y + zone.rect.h,
    start: zone.rect.x + zone.rect.w * start,
    end: zone.rect.x + zone.rect.w * end,
  };
}

function intervalGap(left, right) {
  return Math.max(0, Math.max(left.start, right.start) - Math.min(left.end, right.end));
}

function linesAreAdjacent(left, right) {
  if (left.orientation === right.orientation) {
    return Math.abs(left.coord - right.coord) <= 0.01 && intervalGap(left, right) <= 6;
  }
  const vertical = left.orientation === "vertical" ? left : right;
  const horizontal = left.orientation === "horizontal" ? left : right;
  const xGap = vertical.coord < horizontal.start
    ? horizontal.start - vertical.coord
    : vertical.coord > horizontal.end
      ? vertical.coord - horizontal.end
      : 0;
  const yGap = horizontal.coord < vertical.start
    ? vertical.start - horizontal.coord
    : horizontal.coord > vertical.end
      ? horizontal.coord - vertical.end
      : 0;
  return Math.hypot(xGap, yGap) <= 0.75;
}

function validateAdjacentFrontageMaterialIdentity(frontages, zoneById, profileById) {
  const records = (frontages ?? []).map((frontage) => {
    const zone = zoneById.get(frontage.zoneId);
    const profile = profileById.get(frontage.facadeProfileId);
    if (!zone || !profile) return null;
    return { frontage, line: frontageGrammarLine(frontage, zone), wall: profile.materialSlots.wall };
  }).filter(Boolean);

  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      if (!linesAreAdjacent(left.line, right.line) || left.wall !== right.wall) continue;
      fail(
        `Adjacent frontages '${left.frontage.id}' and '${right.frontage.id}' share wall material+tint '${left.wall}'`,
      );
    }
  }
}

function deriveAssetRegistry(spec, formatVersion) {
  const source = requireV3Array(spec, "asset_registry", formatVersion);
  if (typeof source === "undefined") return undefined;

  const seenIds = new Set();
  return sortedById(source.map((entry, index) => {
    if (!entry || typeof entry !== "object") fail(`asset_registry[${index}] must be an object`);
    const id = ensureString(entry.id, `asset_registry[${index}].id`);
    if (seenIds.has(id)) fail(`Duplicate asset registry id '${id}'`);
    seenIds.add(id);
    const sourceRecord = entry.source;
    if (!sourceRecord || typeof sourceRecord !== "object" || Array.isArray(sourceRecord)) {
      fail(`asset_registry[${index}].source must be an object`);
    }
    const sourceKind = ensureString(sourceRecord.kind, `asset_registry[${index}].source.kind`);
    if (sourceKind !== "project_original" && sourceKind !== "external_cc0") {
      fail(`asset_registry[${index}].source.kind must be project_original or external_cc0`);
    }
    const sourceUri = ensureString(sourceRecord.uri, `asset_registry[${index}].source.uri`);
    const license = ensureString(entry.license, `asset_registry[${index}].license`);
    if (sourceKind === "project_original" && license !== "Project-Original") {
      fail(`Asset '${id}' project_original source must use Project-Original license`);
    }
    if (sourceKind === "project_original" && !sourceUri.startsWith("repo://")) {
      fail(`Asset '${id}' project_original source must use a repo:// URI`);
    }
    if (sourceKind === "external_cc0") {
      if (license !== "CC0-1.0") fail(`Asset '${id}' external_cc0 source must use CC0-1.0 license`);
      let host;
      try { host = new URL(sourceUri).hostname.toLowerCase(); } catch { fail(`Asset '${id}' external_cc0 source must use an absolute URL`); }
      if (!APPROVED_CC0_HOSTS.has(host)) fail(`Asset '${id}' external source host '${host}' is not approved`);
    }
    const dimensionsM = normalizeDimensions(entry.dimensionsM, `asset_registry[${index}].dimensionsM`);
    const collisionClass = ensureString(entry.collisionClass, `asset_registry[${index}].collisionClass`);
    if (!ASSET_COLLISION_CLASSES.has(collisionClass)) fail(`Asset '${id}' has unsupported collisionClass '${collisionClass}'`);
    const shadowPolicy = ensureString(entry.shadowPolicy, `asset_registry[${index}].shadowPolicy`);
    if (!ASSET_SHADOW_POLICIES.has(shadowPolicy)) fail(`Asset '${id}' has unsupported shadowPolicy '${shadowPolicy}'`);
    const lodEligible = optionalBoolean(entry.lodEligible, `asset_registry[${index}].lodEligible`);
    if (typeof lodEligible === "undefined") fail(`asset_registry[${index}].lodEligible is required`);
    const semanticClass = optionalString(entry.semanticClass, `asset_registry[${index}].semanticClass`);
    if (isV3FormatVersion(formatVersion) && !semanticClass) fail(`Asset '${id}' requires semanticClass in v3`);
    if (semanticClass && !ASSET_SEMANTIC_CLASSES.has(semanticClass)) {
      fail(`Asset '${id}' has unsupported semanticClass '${semanticClass}'`);
    }
    const runtimeRecord = entry.runtime;
    if (isV3FormatVersion(formatVersion) && (!runtimeRecord || typeof runtimeRecord !== "object" || Array.isArray(runtimeRecord))) {
      fail(`Asset '${id}' requires runtime metadata in v3`);
    }
    let runtime;
    if (runtimeRecord && typeof runtimeRecord === "object" && !Array.isArray(runtimeRecord)) {
      const mode = ensureString(runtimeRecord.mode, `asset_registry[${index}].runtime.mode`);
      const runtimeId = ensureString(runtimeRecord.id, `asset_registry[${index}].runtime.id`);
      if (!ASSET_RUNTIME_MODES.has(mode)) fail(`Asset '${id}' has unsupported runtime mode '${mode}'`);
      const uri = optionalString(runtimeRecord.uri, `asset_registry[${index}].runtime.uri`);
      if (mode === "model" && !uri) fail(`Model asset '${id}' requires runtime.uri`);
      if (mode === "procedural" && uri) fail(`Procedural asset '${id}' cannot declare runtime.uri`);
      if (uri) {
        if (!uri.startsWith("/assets/")) fail(`Asset '${id}' runtime.uri must be rooted under /assets/`);
        const localPath = path.join(repoRoot, "apps/client/public", uri.slice(1));
        if (!existsSync(localPath)) fail(`Asset '${id}' runtime.uri does not exist: ${uri}`);
        const catalogUri = getRuntimeModelCatalog().get(runtimeId);
        if (!catalogUri) fail(`Asset '${id}' runtime model id '${runtimeId}' is not registered in a bazaar model manifest`);
        if (catalogUri !== uri) fail(`Asset '${id}' runtime model '${runtimeId}' resolves to '${catalogUri}', not '${uri}'`);
      }
      runtime = { mode, id: runtimeId, ...(uri ? { uri } : {}) };
    }
    const transformRecord = entry.transform;
    if (isV3FormatVersion(formatVersion) && (!transformRecord || typeof transformRecord !== "object" || Array.isArray(transformRecord))) {
      fail(`Asset '${id}' requires transform metadata in v3`);
    }
    let transform;
    if (transformRecord && typeof transformRecord === "object" && !Array.isArray(transformRecord)) {
      const pivot = ensureString(transformRecord.pivot, `asset_registry[${index}].transform.pivot`);
      const upAxis = ensureString(transformRecord.upAxis, `asset_registry[${index}].transform.upAxis`);
      const forwardAxis = ensureString(transformRecord.forwardAxis, `asset_registry[${index}].transform.forwardAxis`);
      if (!ASSET_PIVOTS.has(pivot)) fail(`Asset '${id}' has unsupported pivot '${pivot}'`);
      if (!ASSET_AXES.has(upAxis)) fail(`Asset '${id}' has unsupported upAxis '${upAxis}'`);
      if (!ASSET_AXES.has(forwardAxis)) fail(`Asset '${id}' has unsupported forwardAxis '${forwardAxis}'`);
      if (upAxis.slice(1) === forwardAxis.slice(1)) fail(`Asset '${id}' upAxis and forwardAxis must use different axes`);
      transform = {
        pivot,
        upAxis,
        forwardAxis,
        authoredScale: normalizeScale(transformRecord.authoredScale, `asset_registry[${index}].transform.authoredScale`),
      };
    }
    return {
      id,
      label: ensureString(entry.label, `asset_registry[${index}].label`),
      source: { kind: sourceKind, uri: sourceUri },
      license,
      dimensionsM,
      collisionClass,
      shadowPolicy,
      lodEligible,
      ...(semanticClass ? { semanticClass } : {}),
      ...(runtime ? { runtime } : {}),
      ...(transform ? { transform } : {}),
    };
  }));
}

function deriveDressingClusters(spec, zoneById, surfaceById, districtIds, anchorById, assetById) {
  const source = requireArrayWhenPresent(spec, "dressing_clusters");
  if (typeof source === "undefined") {
    return undefined;
  }

  const seenIds = new Set();
  const clusters = source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`dressing_clusters[${index}] must be an object`);
    }
    const id = ensureString(entry.id, `dressing_clusters[${index}].id`);
    if (seenIds.has(id)) {
      fail(`Duplicate dressing cluster id '${id}'`);
    }
    seenIds.add(id);
    const zoneId = ensureString(entry.zoneId, `dressing_clusters[${index}].zoneId`);
    const zone = zoneById.get(zoneId);
    if (!zone) {
      fail(`Dressing cluster '${id}' references unknown zone '${zoneId}'`);
    }
    const surfaceId = optionalString(entry.surfaceId, `dressing_clusters[${index}].surfaceId`);
    if (surfaceId) {
      const surface = surfaceById.get(surfaceId);
      if (!surface) {
        fail(`Dressing cluster '${id}' references unknown surface '${surfaceId}'`);
      }
      if (surface.zoneId !== zoneId) {
        fail(`Dressing cluster '${id}' zone and surface must belong together`);
      }
    }
    const districtId = optionalString(entry.districtId, `dressing_clusters[${index}].districtId`);
    if (districtId && !districtIds.has(districtId)) {
      fail(`Dressing cluster '${id}' references unknown district '${districtId}'`);
    }
    const classification = ensureString(entry.classification, `dressing_clusters[${index}].classification`);
    if (!DRESSING_CLASSIFICATIONS.has(classification)) {
      fail(
        `dressing_clusters[${index}].classification must be gameplay_cover, soft_visual, or overhead`,
      );
    }
    let anchors;
    if (typeof entry.anchors !== "undefined") {
      if (!Array.isArray(entry.anchors)) {
        fail(`dressing_clusters[${index}].anchors must be an array when provided`);
      }
      const seenAnchorIds = new Set();
      anchors = entry.anchors.map((value, anchorIndex) => {
        const anchorId = ensureString(value, `dressing_clusters[${index}].anchors[${anchorIndex}]`);
        const anchor = anchorById.get(anchorId);
        if (!anchor) {
          fail(`Dressing cluster '${id}' references unknown anchor '${anchorId}'`);
        }
        if (anchor.zone !== zoneId) {
          fail(`Dressing cluster '${id}' anchor '${anchorId}' belongs to another zone`);
        }
        if (seenAnchorIds.has(anchorId)) {
          fail(`Dressing cluster '${id}' repeats anchor '${anchorId}'`);
        }
        seenAnchorIds.add(anchorId);
        return anchorId;
      });
    }
    let assetIds;
    if (typeof entry.assetIds !== "undefined") {
      if (!Array.isArray(entry.assetIds) || entry.assetIds.length === 0) {
        fail(`dressing_clusters[${index}].assetIds must be a non-empty array when provided`);
      }
      const seenAssetIds = new Set();
      assetIds = entry.assetIds.map((value, assetIndex) => {
        const assetId = ensureString(value, `dressing_clusters[${index}].assetIds[${assetIndex}]`);
        if (!assetById?.has(assetId)) fail(`Dressing cluster '${id}' references unknown asset '${assetId}'`);
        if (seenAssetIds.has(assetId)) fail(`Dressing cluster '${id}' repeats asset '${assetId}'`);
        seenAssetIds.add(assetId);
        return assetId;
      });
      const assets = assetIds.map((assetId) => assetById.get(assetId));
      if (classification === "gameplay_cover" && !assets.some((asset) => asset.collisionClass === "hard")) {
        fail(`Gameplay-cover dressing cluster '${id}' must reference at least one hard-collision asset`);
      }
      if (classification === "overhead" && assets.some((asset) => asset.collisionClass !== "overhead" && asset.collisionClass !== "none")) {
        fail(`Overhead dressing cluster '${id}' may only reference overhead or non-colliding assets`);
      }
      if (classification === "soft_visual" && assets.some((asset) => asset.collisionClass === "hard")) {
        fail(`Soft-visual dressing cluster '${id}' cannot reference hard-collision assets`);
      }
    } else if (assetById && assetById.size > 0) {
      fail(`Dressing cluster '${id}' must declare assetIds when asset_registry is present`);
    }
    return {
      id,
      zoneId,
      ...(surfaceId ? { surfaceId } : {}),
      ...(districtId ? { districtId } : {}),
      classification,
      ...(anchors ? { anchors } : {}),
      ...(assetIds ? { assetIds } : {}),
    };
  });
  return sortedById(clusters);
}

function resolveSurfaceElevationAt(surface, x, y) {
  if (!surface || surface.kind === "flat") return surface?.elevationM ?? 0;
  const span = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const coordinate = surface.axis === "x" ? x - surface.rect.x : y - surface.rect.y;
  const along = coordinate / span;
  return surface.startElevationM + (surface.endElevationM - surface.startElevationM) * along;
}

function frontagePoint(zone, frontage, along, outwardOffsetM = 0) {
  const start = frontage.start ?? 0;
  const end = frontage.end ?? 1;
  const t = start + (end - start) * along;
  if (frontage.face === "west") return { x: zone.rect.x - outwardOffsetM, y: zone.rect.y + zone.rect.h * t };
  if (frontage.face === "east") return { x: zone.rect.x + zone.rect.w + outwardOffsetM, y: zone.rect.y + zone.rect.h * t };
  if (frontage.face === "south") return { x: zone.rect.x + zone.rect.w * t, y: zone.rect.y - outwardOffsetM };
  return { x: zone.rect.x + zone.rect.w * t, y: zone.rect.y + zone.rect.h + outwardOffsetM };
}

function inwardYawDeg(face) {
  if (face === "west") return 90;
  if (face === "east") return 270;
  if (face === "south") return 0;
  return 180;
}

function deriveArchitecturePlacements(frontages, zoneById, surfaceById, massingById, profileById, moduleById) {
  if (typeof frontages === "undefined") return undefined;
  const placements = [];
  for (const frontage of frontages) {
    const zone = zoneById.get(frontage.zoneId);
    const profile = profileById?.get(frontage.facadeProfileId);
    const massing = massingById?.get(frontage.massingProfileId);
    if (!zone || !profile || !massing) continue;
    const surface = zone.surfaceId ? surfaceById.get(zone.surfaceId) : undefined;
    const frontageLengthM = (frontage.face === "west" || frontage.face === "east" ? zone.rect.h : zone.rect.w)
      * ((frontage.end ?? 1) - (frontage.start ?? 0));
    const center2d = frontagePoint(zone, frontage, 0.5, massing.depthM * 0.5);
    const baseElevationM = resolveSurfaceElevationAt(surface, center2d.x, center2d.y);
    const yawDeg = inwardYawDeg(frontage.face);
    placements.push({
      id: `ARCH_${frontage.id}_MASSING`,
      kind: "massing",
      frontageId: frontage.id,
      zoneId: frontage.zoneId,
      ...(frontage.districtId ? { districtId: frontage.districtId } : {}),
      face: frontage.face,
      profileId: profile.id,
      massingProfileId: massing.id,
      ...(frontage.facadeModelId ? { facadeModelId: frontage.facadeModelId } : {}),
      center: { x: center2d.x, y: center2d.y, z: baseElevationM + massing.heightM * 0.5 },
      sizeM: { width: frontageLengthM, depth: massing.depthM, height: massing.heightM },
      yawDeg,
      materialSlots: { ...profile.materialSlots },
      roof: {
        style: massing.roofStyle,
        setbackM: massing.roofSetbackM,
        parapetHeightM: massing.parapetHeightM,
        upperStorySetbackM: massing.upperStorySetbackM,
        elevationM: baseElevationM + massing.heightM,
      },
    });

    const bayIntervals = [];
    for (const bay of frontage.bays ?? []) {
      const module = moduleById.get(bay.moduleId);
      const bayCenterM = bay.along * frontageLengthM;
      const interval = {
        start: bayCenterM - module.dimensionsM.width * 0.5,
        end: bayCenterM + module.dimensionsM.width * 0.5,
        bottom: bay.baseElevationM,
        top: bay.baseElevationM + module.dimensionsM.height,
        id: bay.id,
      };
      if (interval.start < -RECT_EPSILON || interval.end > frontageLengthM + RECT_EPSILON) {
        fail(`Frontage '${frontage.id}' bay '${bay.id}' does not fit its authored frontage span`);
      }
      for (const prior of bayIntervals) {
        const overlapsHorizontally = interval.start < prior.end - RECT_EPSILON && interval.end > prior.start + RECT_EPSILON;
        const overlapsVertically = interval.bottom < prior.top - RECT_EPSILON && interval.top > prior.bottom + RECT_EPSILON;
        if (overlapsHorizontally && overlapsVertically) {
          fail(`Frontage '${frontage.id}' bays '${prior.id}' and '${bay.id}' overlap`);
        }
      }
      bayIntervals.push(interval);
      const point = frontagePoint(zone, frontage, bay.along, -module.dimensionsM.depth * 0.5);
      const groundElevationM = resolveSurfaceElevationAt(surface, point.x, point.y);
      placements.push({
        id: `ARCH_${frontage.id}_${bay.id}`,
        kind: "facade_module",
        frontageId: frontage.id,
        zoneId: frontage.zoneId,
        ...(frontage.districtId ? { districtId: frontage.districtId } : {}),
        face: frontage.face,
        profileId: profile.id,
        moduleId: module.id,
        moduleKind: module.kind,
        openingType: module.openingType,
        datumId: bay.datumId,
        columnId: bay.columnId,
        layoutSource: bay.layoutSource,
        center: {
          x: point.x,
          y: point.y,
          z: groundElevationM + bay.baseElevationM + module.dimensionsM.height * 0.5,
        },
        sizeM: { ...module.dimensionsM },
        yawDeg,
        materialSlot: module.materialSlot,
        collisionOpening: false,
        ...(module.assetId ? { assetId: module.assetId } : {}),
      });
    }
  }
  return sortedById(placements);
}

function deriveDressingPlacements(spec, formatVersion, clusters, anchorById, assetById) {
  const source = requireV3Array(spec, "dressing_placements", formatVersion);
  if (typeof source === "undefined") return undefined;
  const clusterById = new Map((clusters ?? []).map((cluster) => [cluster.id, cluster]));
  const seenTemplateIds = new Set();
  const coveredAssetsByCluster = new Map();
  const coveredAnchorsByCluster = new Map();
  const placements = [];
  for (const [index, entry] of source.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail(`dressing_placements[${index}] must be an object`);
    const id = ensureString(entry.id, `dressing_placements[${index}].id`);
    if (seenTemplateIds.has(id)) fail(`Duplicate dressing placement template id '${id}'`);
    seenTemplateIds.add(id);
    const clusterId = ensureString(entry.clusterId, `dressing_placements[${index}].clusterId`);
    const cluster = clusterById.get(clusterId);
    if (!cluster) fail(`Dressing placement '${id}' references unknown cluster '${clusterId}'`);
    const assetId = ensureString(entry.assetId, `dressing_placements[${index}].assetId`);
    const asset = assetById?.get(assetId);
    if (!asset) fail(`Dressing placement '${id}' references unknown asset '${assetId}'`);
    if (!cluster.assetIds?.includes(assetId)) fail(`Dressing placement '${id}' uses asset '${assetId}' outside cluster '${clusterId}'`);
    if (!Array.isArray(entry.anchorIds) || entry.anchorIds.length === 0) fail(`Dressing placement '${id}' requires anchorIds`);
    const anchorIds = entry.anchorIds.map((value, anchorIndex) => ensureString(value, `dressing_placements[${index}].anchorIds[${anchorIndex}]`));
    if (new Set(anchorIds).size !== anchorIds.length) fail(`Dressing placement '${id}' repeats an anchor id`);
    const offsetM = normalizeOffset(entry.offsetM, `dressing_placements[${index}].offsetM`);
    const scale = normalizeScale(entry.scale, `dressing_placements[${index}].scale`);
    const yawOffsetDeg = asNumber(entry.yawOffsetDeg, `dressing_placements[${index}].yawOffsetDeg`);
    const usedAssets = coveredAssetsByCluster.get(clusterId) ?? new Set();
    const usedAnchors = coveredAnchorsByCluster.get(clusterId) ?? new Set();
    usedAssets.add(assetId);
    coveredAssetsByCluster.set(clusterId, usedAssets);
    for (const anchorId of anchorIds) {
      const anchor = anchorById.get(anchorId);
      if (!anchor) fail(`Dressing placement '${id}' references unknown anchor '${anchorId}'`);
      if (!cluster.anchors?.includes(anchorId)) fail(`Dressing placement '${id}' uses anchor '${anchorId}' outside cluster '${clusterId}'`);
      usedAnchors.add(anchorId);
      const authoredScale = asset.transform?.authoredScale ?? { x: 1, y: 1, z: 1 };
      const finalScale = {
        x: authoredScale.x * scale.x,
        y: authoredScale.y * scale.y,
        z: authoredScale.z * scale.z,
      };
      let position = {
        x: anchor.pos.x + offsetM.x,
        y: anchor.pos.y + offsetM.y,
        z: anchor.pos.z + offsetM.z,
      };
      let yawDeg = (anchor.yawDeg ?? 0) + yawOffsetDeg;
      let dimensionsM = {
        width: asset.dimensionsM.width * finalScale.x,
        depth: asset.dimensionsM.depth * finalScale.y,
        height: asset.dimensionsM.height * finalScale.z,
      };
      let spanSeats;
      if (anchor.type === "signage_anchor") {
        if (typeof anchor.widthM !== "number") fail(`Signage anchor '${anchor.id}' requires an authored widthM`);
        if (Math.abs(finalScale.x - 1) > SCALE_EPSILON) {
          fail(`Sign placement '${id}' cannot rescale its opening-derived width`);
        }
        dimensionsM = {
          width: anchor.widthM,
          depth: asset.dimensionsM.depth * finalScale.y,
          height: asset.dimensionsM.height * finalScale.z,
        };
      }
      if (anchor.type === "cloth_canopy_span") {
        if (!anchor.endPos) fail(`Cloth canopy anchor '${anchor.id}' requires an authored endPos`);
        if (typeof anchor.widthM !== "number") fail(`Cloth canopy anchor '${anchor.id}' requires an authored widthM`);
        if (Math.abs(finalScale.x - 1) > SCALE_EPSILON || Math.abs(finalScale.y - 1) > SCALE_EPSILON) {
          fail(`Cloth canopy placement '${id}' cannot rescale its authored width/span`);
        }
        const deltaX = anchor.endPos.x - anchor.pos.x;
        const deltaY = anchor.endPos.y - anchor.pos.y;
        const horizontalSpanM = Math.hypot(deltaX, deltaY);
        if (!Number.isFinite(horizontalSpanM) || horizontalSpanM <= RECT_EPSILON) {
          fail(`Cloth canopy anchor '${anchor.id}' must define a non-zero horizontal span`);
        }
        const derivedYawDeg = Math.atan2(deltaX, deltaY) * 180 / Math.PI;
        if (!Number.isFinite(derivedYawDeg)) fail(`Cloth canopy anchor '${anchor.id}' produced an invalid yaw`);
        position = {
          x: (anchor.pos.x + anchor.endPos.x) * 0.5 + offsetM.x,
          y: (anchor.pos.y + anchor.endPos.y) * 0.5 + offsetM.y,
          z: (anchor.pos.z + anchor.endPos.z) * 0.5 + offsetM.z,
        };
        spanSeats = {
          start: {
            x: anchor.pos.x + offsetM.x,
            y: anchor.pos.y + offsetM.y,
            z: anchor.pos.z + offsetM.z,
          },
          end: {
            x: anchor.endPos.x + offsetM.x,
            y: anchor.endPos.y + offsetM.y,
            z: anchor.endPos.z + offsetM.z,
          },
        };
        yawDeg = derivedYawDeg + yawOffsetDeg;
        dimensionsM = {
          width: anchor.widthM,
          depth: horizontalSpanM,
          height: asset.dimensionsM.height * finalScale.z,
        };
      }
      placements.push({
        id: `${id}_${anchorId}`,
        clusterId,
        assetId,
        anchorId,
        zoneId: cluster.zoneId,
        ...(cluster.districtId ? { districtId: cluster.districtId } : {}),
        classification: cluster.classification,
        position,
        yawDeg,
        ...(spanSeats ? { spanSeats } : {}),
        scale: finalScale,
        dimensionsM,
        collisionClass: asset.collisionClass,
        shadowPolicy: asset.shadowPolicy,
        lodEligible: asset.lodEligible,
        semanticClass: asset.semanticClass,
        runtime: asset.runtime,
      });
    }
    coveredAnchorsByCluster.set(clusterId, usedAnchors);
  }
  for (const cluster of clusters ?? []) {
    const missingAssets = (cluster.assetIds ?? []).filter((assetId) => !coveredAssetsByCluster.get(cluster.id)?.has(assetId));
    if (missingAssets.length > 0) fail(`Dressing cluster '${cluster.id}' has unrendered assets: ${missingAssets.join(", ")}`);
    const missingAnchors = (cluster.anchors ?? []).filter((anchorId) => !coveredAnchorsByCluster.get(cluster.id)?.has(anchorId));
    if (missingAnchors.length > 0) fail(`Dressing cluster '${cluster.id}' has unrendered anchors: ${missingAnchors.join(", ")}`);
  }
  return sortedById(placements);
}

function validateZoneV3References(zones, districts, surfaces, tacticalLanes) {
  const districtIds = new Set((districts ?? []).map((district) => district.id));
  const surfaceById = new Map((surfaces ?? []).map((surface) => [surface.id, surface]));
  const laneById = new Map((tacticalLanes ?? []).map((lane) => [lane.id, lane]));
  for (const zone of zones) {
    if (zone.districtId && !districtIds.has(zone.districtId)) {
      fail(`Zone '${zone.id}' references unknown district '${zone.districtId}'`);
    }
    if (zone.surfaceId) {
      const surface = surfaceById.get(zone.surfaceId);
      if (!surface) {
        fail(`Zone '${zone.id}' references unknown traversal surface '${zone.surfaceId}'`);
      }
      if (surface.zoneId !== zone.id) {
        fail(`Zone '${zone.id}' references a traversal surface owned by '${surface.zoneId}'`);
      }
    }
    if (zone.macroLane && tacticalLanes) {
      const lane = laneById.get(zone.macroLane);
      if (!lane) {
        fail(`Zone '${zone.id}' references unknown tactical lane '${zone.macroLane}'`);
      }
      if (!lane.zoneIds.includes(zone.id)) {
        fail(`Tactical lane '${zone.macroLane}' must list zone '${zone.id}'`);
      }
    }
  }
}

function deriveMapCenter(spec, playableBoundary) {
  if (typeof spec?.map_center === "undefined") {
    return undefined;
  }
  if (!spec.map_center || typeof spec.map_center !== "object" || Array.isArray(spec.map_center)) {
    fail("map_center must be an object when provided");
  }
  const mapCenter = {
    x: asNumber(spec.map_center.x, "map_center.x"),
    y: asNumber(spec.map_center.y, "map_center.y"),
  };
  if (!inRect2D(mapCenter.x, mapCenter.y, playableBoundary)) {
    fail("map_center must lie inside global_dimensions.playable_boundary");
  }
  return mapCenter;
}

function deriveExteriorWallPatches(spec) {
  const source = requireArrayWhenPresent(spec, "exterior_wall_patches");
  if (typeof source === "undefined") {
    return [];
  }
  const seen = new Set();
  return source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`exterior_wall_patches[${index}] must be an object`);
    }
    const orientation = ensureString(entry.orientation, `exterior_wall_patches[${index}].orientation`);
    if (orientation !== "vertical" && orientation !== "horizontal") {
      fail(`exterior_wall_patches[${index}].orientation must be 'vertical' or 'horizontal'`);
    }
    const outward = asNumber(entry.outward, `exterior_wall_patches[${index}].outward`);
    if (outward !== -1 && outward !== 1) {
      fail(`exterior_wall_patches[${index}].outward must be -1 or 1`);
    }
    const coord = asNumber(entry.coord, `exterior_wall_patches[${index}].coord`);
    const start = asNumber(entry.start, `exterior_wall_patches[${index}].start`);
    const end = asNumber(entry.end, `exterior_wall_patches[${index}].end`);
    if (start >= end) {
      fail(`exterior_wall_patches[${index}].start must be less than end`);
    }
    const key = `${orientation}\u0000${coord}\u0000${start}\u0000${end}\u0000${outward}`;
    if (seen.has(key)) {
      fail(`Duplicate exterior wall patch at index ${index}`);
    }
    seen.add(key);
    return { orientation, coord, start, end, outward };
  });
}

function warnAnchorsInClearZones(anchors, zones) {
  const clearTravelZones = zones.filter((zone) => zone.type === "clear_travel_zone");
  for (const anchor of anchors) {
    for (const zone of clearTravelZones) {
      if (inRect2D(anchor.pos.x, anchor.pos.y, zone.rect)) {
        console.warn(
          `[gen:maps] warning: anchor '${anchor.id}' (${anchor.type}) lies inside clear_travel_zone '${zone.id}'`,
        );
      }
    }
  }
}

function deriveBlockoutSpec(spec, zones) {
  const globalDimensions = spec?.global_dimensions;
  if (!globalDimensions || typeof globalDimensions !== "object") {
    fail("spec.global_dimensions is missing");
  }

  const playableBoundary = normalizeRect(globalDimensions.playable_boundary, "global_dimensions.playable_boundary");
  const wallHeight = asNumber(globalDimensions.wall_height_default, "global_dimensions.wall_height_default");
  const wallThickness = optionalNumber(globalDimensions.wall_thickness_default, "global_dimensions.wall_thickness_default");
  const ceilingHeight = asNumber(globalDimensions.ceiling_height_default, "global_dimensions.ceiling_height_default");
  const floorHeight = asNumber(globalDimensions.floor_height_default, "global_dimensions.floor_height_default");

  ensurePositive(wallHeight, "global_dimensions.wall_height_default");
  if (typeof wallThickness !== "undefined") ensurePositive(wallThickness, "global_dimensions.wall_thickness_default");
  ensurePositive(ceilingHeight, "global_dimensions.ceiling_height_default");

  const constraints = spec?.constraints;
  if (!constraints || typeof constraints !== "object") {
    fail("spec.constraints is missing");
  }

  const minMainLane = asNumber(constraints.min_path_width_main_lane, "constraints.min_path_width_main_lane");
  const minSideHalls = asNumber(constraints.min_path_width_side_halls, "constraints.min_path_width_side_halls");
  ensurePositive(minMainLane, "constraints.min_path_width_main_lane");
  ensurePositive(minSideHalls, "constraints.min_path_width_side_halls");

  const wallDetailsRaw = spec?.wall_details;
  if (wallDetailsRaw && typeof wallDetailsRaw !== "object") {
    fail("spec.wall_details must be an object when provided");
  }
  const wallDetailsStyle =
    wallDetailsRaw && typeof wallDetailsRaw.style !== "undefined"
      ? ensureString(wallDetailsRaw.style, "wall_details.style")
      : "bazaar";
  if (wallDetailsStyle !== "bazaar") {
    fail("wall_details.style must be 'bazaar' when provided");
  }

  const wallDetailDensity =
    wallDetailsRaw && typeof wallDetailsRaw.density !== "undefined"
      ? asNumber(wallDetailsRaw.density, "wall_details.density")
      : 0.48;
  const wallDetailMaxProtrusion =
    wallDetailsRaw && typeof wallDetailsRaw.maxProtrusion !== "undefined"
      ? asNumber(wallDetailsRaw.maxProtrusion, "wall_details.maxProtrusion")
      : 0.15;
  const wallDetailSeed =
    wallDetailsRaw && typeof wallDetailsRaw.seed !== "undefined"
      ? asNumber(wallDetailsRaw.seed, "wall_details.seed")
      : undefined;
  const wallDetailEnabled =
    wallDetailsRaw && typeof wallDetailsRaw.enabled !== "undefined"
      ? optionalBoolean(wallDetailsRaw.enabled, "wall_details.enabled")
      : undefined;
  if (wallDetailDensity < 0 || wallDetailDensity > 1.25) {
    fail("wall_details.density must be >= 0 and <= 1.25");
  }
  ensurePositive(wallDetailMaxProtrusion, "wall_details.maxProtrusion");
  if (typeof wallDetailSeed !== "undefined" && !Number.isInteger(wallDetailSeed)) {
    fail("wall_details.seed must be an integer when provided");
  }
  const facadeOverrides =
    wallDetailsRaw && typeof wallDetailsRaw.facade_overrides !== "undefined"
      ? (() => {
          if (!Array.isArray(wallDetailsRaw.facade_overrides)) {
            fail("wall_details.facade_overrides must be an array when provided");
          }

          return wallDetailsRaw.facade_overrides.map((override, index) => {
            if (!override || typeof override !== "object") {
              fail(`wall_details.facade_overrides[${index}] must be an object`);
            }

            const zoneId = ensureString(override.zoneId, `wall_details.facade_overrides[${index}].zoneId`);
            if (!zones.some((zone) => zone.id === zoneId)) {
              fail(`wall_details.facade_overrides[${index}].zoneId '${zoneId}' does not match a known zone`);
            }

            const face = ensureString(override.face, `wall_details.facade_overrides[${index}].face`);
            if (!["north", "south", "east", "west"].includes(face)) {
              fail(`wall_details.facade_overrides[${index}].face must be one of north/south/east/west`);
            }

            const preset = ensureString(override.preset, `wall_details.facade_overrides[${index}].preset`);
            if (
              ![
                "merchant_rhythm",
                "merchant_hero_stack",
                "residential_quiet",
                "residential_balcony_stack",
                "spawn_courtyard_landmark",
                "spawn_gate_brick_backdrop",
                "service_blank",
              ].includes(preset)
            ) {
              fail(`wall_details.facade_overrides[${index}].preset '${preset}' is not supported`);
            }

            return { zoneId, face, preset };
          });
        })()
      : [];
  const moduleRegistry =
    wallDetailsRaw && typeof wallDetailsRaw.module_registry !== "undefined"
      ? (() => {
          if (!wallDetailsRaw.module_registry || typeof wallDetailsRaw.module_registry !== "object") {
            fail("wall_details.module_registry must be an object when provided");
          }

          const registry = wallDetailsRaw.module_registry;
          const windowModules =
            typeof registry.window_modules === "undefined"
              ? []
              : (() => {
                  if (!Array.isArray(registry.window_modules)) {
                    fail("wall_details.module_registry.window_modules must be an array when provided");
                  }
                  return registry.window_modules.map((module, index) => {
                    if (!module || typeof module !== "object") {
                      fail(`wall_details.module_registry.window_modules[${index}] must be an object`);
                    }
                    const headShape = ensureString(
                      module.headShape,
                      `wall_details.module_registry.window_modules[${index}].headShape`,
                    );
                    if (headShape !== "pointed_arch") {
                      fail(`wall_details.module_registry.window_modules[${index}].headShape must be 'pointed_arch'`);
                    }
                    const glassStyle = ensureString(
                      module.glassStyle,
                      `wall_details.module_registry.window_modules[${index}].glassStyle`,
                    );
                    if (!["stained_glass_bright", "stained_glass_dim"].includes(glassStyle)) {
                      fail(`wall_details.module_registry.window_modules[${index}].glassStyle must be supported`);
                    }
                    return {
                      id: ensureString(module.id, `wall_details.module_registry.window_modules[${index}].id`),
                      headShape,
                      glassStyle,
                      apertureWidthM: asNumber(
                        module.apertureWidthM,
                        `wall_details.module_registry.window_modules[${index}].apertureWidthM`,
                      ),
                      apertureHeightM: asNumber(
                        module.apertureHeightM,
                        `wall_details.module_registry.window_modules[${index}].apertureHeightM`,
                      ),
                      frameWidthM: asNumber(
                        module.frameWidthM,
                        `wall_details.module_registry.window_modules[${index}].frameWidthM`,
                      ),
                      frameHeightM: asNumber(
                        module.frameHeightM,
                        `wall_details.module_registry.window_modules[${index}].frameHeightM`,
                      ),
                      frameDepthM: asNumber(
                        module.frameDepthM,
                        `wall_details.module_registry.window_modules[${index}].frameDepthM`,
                      ),
                      voidInsetM: asNumber(
                        module.voidInsetM,
                        `wall_details.module_registry.window_modules[${index}].voidInsetM`,
                      ),
                      glassInsetM: asNumber(
                        module.glassInsetM,
                        `wall_details.module_registry.window_modules[${index}].glassInsetM`,
                      ),
                      sillWidthM: asNumber(
                        module.sillWidthM,
                        `wall_details.module_registry.window_modules[${index}].sillWidthM`,
                      ),
                      sillHeightM: asNumber(
                        module.sillHeightM,
                        `wall_details.module_registry.window_modules[${index}].sillHeightM`,
                      ),
                      sillDepthM: asNumber(
                        module.sillDepthM,
                        `wall_details.module_registry.window_modules[${index}].sillDepthM`,
                      ),
                      apronWidthM: asNumber(
                        module.apronWidthM,
                        `wall_details.module_registry.window_modules[${index}].apronWidthM`,
                      ),
                      apronHeightM: asNumber(
                        module.apronHeightM,
                        `wall_details.module_registry.window_modules[${index}].apronHeightM`,
                      ),
                      apronDepthM: asNumber(
                        module.apronDepthM,
                        `wall_details.module_registry.window_modules[${index}].apronDepthM`,
                      ),
                      apronOffsetBelowSillM: asNumber(
                        module.apronOffsetBelowSillM,
                        `wall_details.module_registry.window_modules[${index}].apronOffsetBelowSillM`,
                      ),
                    };
                  });
                })();
          const doorModules =
            typeof registry.door_modules === "undefined"
              ? []
              : (() => {
                  if (!Array.isArray(registry.door_modules)) {
                    fail("wall_details.module_registry.door_modules must be an array when provided");
                  }
                  return registry.door_modules.map((module, index) => {
                    if (!module || typeof module !== "object") {
                      fail(`wall_details.module_registry.door_modules[${index}] must be an object`);
                    }
                    const coverShape = ensureString(
                      module.coverShape,
                      `wall_details.module_registry.door_modules[${index}].coverShape`,
                    );
                    if (!["arched", "rect"].includes(coverShape)) {
                      fail(`wall_details.module_registry.door_modules[${index}].coverShape must be supported`);
                    }
                    return {
                      id: ensureString(module.id, `wall_details.module_registry.door_modules[${index}].id`),
                      modelId: ensureString(module.modelId, `wall_details.module_registry.door_modules[${index}].modelId`),
                      coverShape,
                      doorWidthM: asNumber(
                        module.doorWidthM,
                        `wall_details.module_registry.door_modules[${index}].doorWidthM`,
                      ),
                      doorHeightM: asNumber(
                        module.doorHeightM,
                        `wall_details.module_registry.door_modules[${index}].doorHeightM`,
                      ),
                      coverWidthM: asNumber(
                        module.coverWidthM,
                        `wall_details.module_registry.door_modules[${index}].coverWidthM`,
                      ),
                      coverHeightM: asNumber(
                        module.coverHeightM,
                        `wall_details.module_registry.door_modules[${index}].coverHeightM`,
                      ),
                      coverCenterYOffsetM: asNumber(
                        module.coverCenterYOffsetM,
                        `wall_details.module_registry.door_modules[${index}].coverCenterYOffsetM`,
                      ),
                      trimThicknessM: asNumber(
                        module.trimThicknessM,
                        `wall_details.module_registry.door_modules[${index}].trimThicknessM`,
                      ),
                      revealWidthM: asNumber(
                        module.revealWidthM,
                        `wall_details.module_registry.door_modules[${index}].revealWidthM`,
                      ),
                      surroundDepthM: asNumber(
                        module.surroundDepthM,
                        `wall_details.module_registry.door_modules[${index}].surroundDepthM`,
                      ),
                      voidInsetM: asNumber(
                        module.voidInsetM,
                        `wall_details.module_registry.door_modules[${index}].voidInsetM`,
                      ),
                      voidDepthM: asNumber(
                        module.voidDepthM,
                        `wall_details.module_registry.door_modules[${index}].voidDepthM`,
                      ),
                    };
                  });
                })();
          const heroBayModules =
            typeof registry.hero_bay_modules === "undefined"
              ? []
              : (() => {
                  if (!Array.isArray(registry.hero_bay_modules)) {
                    fail("wall_details.module_registry.hero_bay_modules must be an array when provided");
                  }
                  return registry.hero_bay_modules.map((module, index) => {
                    if (!module || typeof module !== "object") {
                      fail(`wall_details.module_registry.hero_bay_modules[${index}] must be an object`);
                    }
                    const glassStyle = ensureString(
                      module.glassStyle,
                      `wall_details.module_registry.hero_bay_modules[${index}].glassStyle`,
                    );
                    if (!["stained_glass_bright", "stained_glass_dim"].includes(glassStyle)) {
                      fail(`wall_details.module_registry.hero_bay_modules[${index}].glassStyle must be supported`);
                    }
                    const corbelCount = asNumber(
                      module.corbelCount,
                      `wall_details.module_registry.hero_bay_modules[${index}].corbelCount`,
                    );
                    if (!Number.isInteger(corbelCount) || corbelCount <= 0) {
                      fail(`wall_details.module_registry.hero_bay_modules[${index}].corbelCount must be an integer > 0`);
                    }
                    const pedimentLayerCount = asNumber(
                      module.pedimentLayerCount,
                      `wall_details.module_registry.hero_bay_modules[${index}].pedimentLayerCount`,
                    );
                    if (!Number.isInteger(pedimentLayerCount) || pedimentLayerCount <= 0) {
                      fail(`wall_details.module_registry.hero_bay_modules[${index}].pedimentLayerCount must be an integer > 0`);
                    }
                    return {
                      id: ensureString(module.id, `wall_details.module_registry.hero_bay_modules[${index}].id`),
                      glassStyle,
                      openingWidthM: asNumber(
                        module.openingWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].openingWidthM`,
                      ),
                      openingHeightM: asNumber(
                        module.openingHeightM,
                        `wall_details.module_registry.hero_bay_modules[${index}].openingHeightM`,
                      ),
                      openingSillY: asNumber(
                        module.openingSillY,
                        `wall_details.module_registry.hero_bay_modules[${index}].openingSillY`,
                      ),
                      surroundWidthM: asNumber(
                        module.surroundWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].surroundWidthM`,
                      ),
                      surroundHeightM: asNumber(
                        module.surroundHeightM,
                        `wall_details.module_registry.hero_bay_modules[${index}].surroundHeightM`,
                      ),
                      surroundBottomY: asNumber(
                        module.surroundBottomY,
                        `wall_details.module_registry.hero_bay_modules[${index}].surroundBottomY`,
                      ),
                      frameDepthM: asNumber(
                        module.frameDepthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].frameDepthM`,
                      ),
                      voidInsetM: asNumber(
                        module.voidInsetM,
                        `wall_details.module_registry.hero_bay_modules[${index}].voidInsetM`,
                      ),
                      glassInsetM: asNumber(
                        module.glassInsetM,
                        `wall_details.module_registry.hero_bay_modules[${index}].glassInsetM`,
                      ),
                      pilasterWidthM: asNumber(
                        module.pilasterWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pilasterWidthM`,
                      ),
                      pilasterDepthM: asNumber(
                        module.pilasterDepthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pilasterDepthM`,
                      ),
                      pilasterHeightM: asNumber(
                        module.pilasterHeightM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pilasterHeightM`,
                      ),
                      pilasterBottomY: asNumber(
                        module.pilasterBottomY,
                        `wall_details.module_registry.hero_bay_modules[${index}].pilasterBottomY`,
                      ),
                      entablatureWidthM: asNumber(
                        module.entablatureWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureWidthM`,
                      ),
                      entablatureDepthM: asNumber(
                        module.entablatureDepthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureDepthM`,
                      ),
                      entablatureThicknessM: asNumber(
                        module.entablatureThicknessM,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureThicknessM`,
                      ),
                      entablatureCenterY: asNumber(
                        module.entablatureCenterY,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureCenterY`,
                      ),
                      entablatureCapWidthM: asNumber(
                        module.entablatureCapWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureCapWidthM`,
                      ),
                      entablatureCapDepthM: asNumber(
                        module.entablatureCapDepthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureCapDepthM`,
                      ),
                      entablatureCapThicknessM: asNumber(
                        module.entablatureCapThicknessM,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureCapThicknessM`,
                      ),
                      entablatureCapCenterY: asNumber(
                        module.entablatureCapCenterY,
                        `wall_details.module_registry.hero_bay_modules[${index}].entablatureCapCenterY`,
                      ),
                      corbelWidthM: asNumber(
                        module.corbelWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].corbelWidthM`,
                      ),
                      corbelDepthM: asNumber(
                        module.corbelDepthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].corbelDepthM`,
                      ),
                      corbelHeightM: asNumber(
                        module.corbelHeightM,
                        `wall_details.module_registry.hero_bay_modules[${index}].corbelHeightM`,
                      ),
                      corbelCenterY: asNumber(
                        module.corbelCenterY,
                        `wall_details.module_registry.hero_bay_modules[${index}].corbelCenterY`,
                      ),
                      corbelCount,
                      corbelSpreadM: asNumber(
                        module.corbelSpreadM,
                        `wall_details.module_registry.hero_bay_modules[${index}].corbelSpreadM`,
                      ),
                      pedimentBaseWidthM: asNumber(
                        module.pedimentBaseWidthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pedimentBaseWidthM`,
                      ),
                      pedimentDepthM: asNumber(
                        module.pedimentDepthM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pedimentDepthM`,
                      ),
                      pedimentLayerHeightM: asNumber(
                        module.pedimentLayerHeightM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pedimentLayerHeightM`,
                      ),
                      pedimentLayerCount,
                      pedimentWidthStepM: asNumber(
                        module.pedimentWidthStepM,
                        `wall_details.module_registry.hero_bay_modules[${index}].pedimentWidthStepM`,
                      ),
                      pedimentBottomY: asNumber(
                        module.pedimentBottomY,
                        `wall_details.module_registry.hero_bay_modules[${index}].pedimentBottomY`,
                      ),
                    };
                  });
                })();

          return {
            window_modules: windowModules,
            door_modules: doorModules,
            hero_bay_modules: heroBayModules,
          };
        })()
      : {
          window_modules: [],
          door_modules: [],
          hero_bay_modules: [],
        };
  const doorLayoutOverrides =
    wallDetailsRaw && typeof wallDetailsRaw.door_layout_overrides !== "undefined"
      ? (() => {
          if (!Array.isArray(wallDetailsRaw.door_layout_overrides)) {
            fail("wall_details.door_layout_overrides must be an array when provided");
          }

          return wallDetailsRaw.door_layout_overrides.map((override, index) => {
            if (!override || typeof override !== "object") {
              fail(`wall_details.door_layout_overrides[${index}] must be an object`);
            }

            const zoneId = ensureString(override.zoneId, `wall_details.door_layout_overrides[${index}].zoneId`);
            if (!zones.some((zone) => zone.id === zoneId)) {
              fail(`wall_details.door_layout_overrides[${index}].zoneId '${zoneId}' does not match a known zone`);
            }

            const face = ensureString(override.face, `wall_details.door_layout_overrides[${index}].face`);
            if (!["north", "south", "east", "west"].includes(face)) {
              fail(`wall_details.door_layout_overrides[${index}].face must be one of north/south/east/west`);
            }

            const segmentOrdinal = asNumber(
              override.segmentOrdinal,
              `wall_details.door_layout_overrides[${index}].segmentOrdinal`,
            );
            if (!Number.isInteger(segmentOrdinal) || segmentOrdinal <= 0) {
              fail(`wall_details.door_layout_overrides[${index}].segmentOrdinal must be an integer > 0`);
            }

            if (!Array.isArray(override.doors) || override.doors.length === 0) {
              fail(`wall_details.door_layout_overrides[${index}].doors must be a non-empty array`);
            }

            const doors = override.doors.map((door, doorIndex) => {
              if (!door || typeof door !== "object") {
                fail(`wall_details.door_layout_overrides[${index}].doors[${doorIndex}] must be an object`);
              }

              return {
                centerS: asNumber(
                  door.centerS,
                  `wall_details.door_layout_overrides[${index}].doors[${doorIndex}].centerS`,
                ),
              };
            });

            let styleSource;
            if (typeof override.styleSource !== "undefined") {
              if (!override.styleSource || typeof override.styleSource !== "object") {
                fail(`wall_details.door_layout_overrides[${index}].styleSource must be an object when provided`);
              }
              const sourceZoneId = ensureString(
                override.styleSource.zoneId,
                `wall_details.door_layout_overrides[${index}].styleSource.zoneId`,
              );
              if (!zones.some((zone) => zone.id === sourceZoneId)) {
                fail(
                  `wall_details.door_layout_overrides[${index}].styleSource.zoneId '${sourceZoneId}' does not match a known zone`,
                );
              }
              const sourceFace = ensureString(
                override.styleSource.face,
                `wall_details.door_layout_overrides[${index}].styleSource.face`,
              );
              if (!["north", "south", "east", "west"].includes(sourceFace)) {
                fail(`wall_details.door_layout_overrides[${index}].styleSource.face must be one of north/south/east/west`);
              }
              const sourceSegmentOrdinal = asNumber(
                override.styleSource.segmentOrdinal,
                `wall_details.door_layout_overrides[${index}].styleSource.segmentOrdinal`,
              );
              if (!Number.isInteger(sourceSegmentOrdinal) || sourceSegmentOrdinal <= 0) {
                fail(`wall_details.door_layout_overrides[${index}].styleSource.segmentOrdinal must be an integer > 0`);
              }
              styleSource = {
                zoneId: sourceZoneId,
                face: sourceFace,
                segmentOrdinal: sourceSegmentOrdinal,
              };
            }

            return {
              zoneId,
              face,
              segmentOrdinal,
              doors,
              ...(styleSource ? { styleSource } : {}),
            };
          });
        })()
      : [];
  const windowLayoutOverrides =
    wallDetailsRaw && typeof wallDetailsRaw.window_layout_overrides !== "undefined"
      ? (() => {
          if (!Array.isArray(wallDetailsRaw.window_layout_overrides)) {
            fail("wall_details.window_layout_overrides must be an array when provided");
          }

          return wallDetailsRaw.window_layout_overrides.map((override, index) => {
            if (!override || typeof override !== "object") {
              fail(`wall_details.window_layout_overrides[${index}] must be an object`);
            }

            const zoneId = ensureString(override.zoneId, `wall_details.window_layout_overrides[${index}].zoneId`);
            if (!zones.some((zone) => zone.id === zoneId)) {
              fail(`wall_details.window_layout_overrides[${index}].zoneId '${zoneId}' does not match a known zone`);
            }

            const face = ensureString(override.face, `wall_details.window_layout_overrides[${index}].face`);
            if (!["north", "south", "east", "west"].includes(face)) {
              fail(`wall_details.window_layout_overrides[${index}].face must be one of north/south/east/west`);
            }

            const segmentOrdinal = asNumber(
              override.segmentOrdinal,
              `wall_details.window_layout_overrides[${index}].segmentOrdinal`,
            );
            if (!Number.isInteger(segmentOrdinal) || segmentOrdinal <= 0) {
              fail(`wall_details.window_layout_overrides[${index}].segmentOrdinal must be an integer > 0`);
            }

            if (!Array.isArray(override.windows) || override.windows.length === 0) {
              fail(`wall_details.window_layout_overrides[${index}].windows must be a non-empty array`);
            }

            const windows = override.windows.map((window, windowIndex) => {
              if (!window || typeof window !== "object") {
                fail(`wall_details.window_layout_overrides[${index}].windows[${windowIndex}] must be an object`);
              }

              const headShape = ensureString(
                window.headShape,
                `wall_details.window_layout_overrides[${index}].windows[${windowIndex}].headShape`,
              );
              if (!["rect", "pointed_arch"].includes(headShape)) {
                fail(`wall_details.window_layout_overrides[${index}].windows[${windowIndex}].headShape is not supported`);
              }

              const glassStyle = ensureString(
                window.glassStyle,
                `wall_details.window_layout_overrides[${index}].windows[${windowIndex}].glassStyle`,
              );
              if (!["stained_glass_bright", "stained_glass_dim"].includes(glassStyle)) {
                fail(`wall_details.window_layout_overrides[${index}].windows[${windowIndex}].glassStyle is not supported`);
              }

              const width = asNumber(
                window.width,
                `wall_details.window_layout_overrides[${index}].windows[${windowIndex}].width`,
              );
              const height = asNumber(
                window.height,
                `wall_details.window_layout_overrides[${index}].windows[${windowIndex}].height`,
              );
              if (width <= 0 || height <= 0) {
                fail(`wall_details.window_layout_overrides[${index}].windows[${windowIndex}] dimensions must be > 0`);
              }

              return {
                centerS: asNumber(
                  window.centerS,
                  `wall_details.window_layout_overrides[${index}].windows[${windowIndex}].centerS`,
                ),
                sillY: asNumber(
                  window.sillY,
                  `wall_details.window_layout_overrides[${index}].windows[${windowIndex}].sillY`,
                ),
                width,
                height,
                headShape,
                glassStyle,
              };
            });

            return {
              zoneId,
              face,
              segmentOrdinal,
              windows,
            };
          });
        })()
      : [];
  const balconyLayoutOverrides =
    wallDetailsRaw && typeof wallDetailsRaw.balcony_layout_overrides !== "undefined"
      ? (() => {
          if (!Array.isArray(wallDetailsRaw.balcony_layout_overrides)) {
            fail("wall_details.balcony_layout_overrides must be an array when provided");
          }

          return wallDetailsRaw.balcony_layout_overrides.map((override, index) => {
            if (!override || typeof override !== "object") {
              fail(`wall_details.balcony_layout_overrides[${index}] must be an object`);
            }

            const zoneId = ensureString(override.zoneId, `wall_details.balcony_layout_overrides[${index}].zoneId`);
            if (!zones.some((zone) => zone.id === zoneId)) {
              fail(`wall_details.balcony_layout_overrides[${index}].zoneId '${zoneId}' does not match a known zone`);
            }

            const face = ensureString(override.face, `wall_details.balcony_layout_overrides[${index}].face`);
            if (!["north", "south", "east", "west"].includes(face)) {
              fail(`wall_details.balcony_layout_overrides[${index}].face must be one of north/south/east/west`);
            }

            const segmentOrdinal = asNumber(
              override.segmentOrdinal,
              `wall_details.balcony_layout_overrides[${index}].segmentOrdinal`,
            );
            if (!Number.isInteger(segmentOrdinal) || segmentOrdinal <= 0) {
              fail(`wall_details.balcony_layout_overrides[${index}].segmentOrdinal must be an integer > 0`);
            }

            if (!Array.isArray(override.balconies) || override.balconies.length === 0) {
              fail(`wall_details.balcony_layout_overrides[${index}].balconies must be a non-empty array`);
            }

            const balconies = override.balconies.map((balcony, balconyIndex) => {
              if (!balcony || typeof balcony !== "object") {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}] must be an object`);
              }

              const storyIndex = asNumber(
                balcony.storyIndex,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].storyIndex`,
              );
              if (!Number.isInteger(storyIndex) || storyIndex < 1) {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].storyIndex must be an integer >= 1`);
              }

              const spanBays = asNumber(
                balcony.spanBays,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].spanBays`,
              );
              if (!Number.isInteger(spanBays) || spanBays <= 0) {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].spanBays must be an integer > 0`);
              }

              if (!balcony.opening || typeof balcony.opening !== "object") {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening must be an object`);
              }

              const headShape = ensureString(
                balcony.opening.headShape,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.headShape`,
              );
              if (headShape !== "pointed_arch") {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.headShape must be 'pointed_arch'`);
              }

              const width = asNumber(
                balcony.opening.width,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.width`,
              );
              const height = asNumber(
                balcony.opening.height,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.height`,
              );
              const depthM = asNumber(
                balcony.depthM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].depthM`,
              );
              const parapetHeightM = asNumber(
                balcony.parapetHeightM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].parapetHeightM`,
              );
              const openingSurroundWidthM = asNumber(
                balcony.openingSurroundWidthM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].openingSurroundWidthM`,
              );
              const openingSurroundHeightM = asNumber(
                balcony.openingSurroundHeightM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].openingSurroundHeightM`,
              );
              const openingSurroundBottomOffsetM = asNumber(
                balcony.openingSurroundBottomOffsetM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].openingSurroundBottomOffsetM`,
              );
              const roofBreakWidthM = asNumber(
                balcony.roofBreakWidthM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakWidthM`,
              );
              const roofBreakBottomOffsetM = asNumber(
                balcony.roofBreakBottomOffsetM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakBottomOffsetM`,
              );
              const roofBreakHeightM = asNumber(
                balcony.roofBreakHeightM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakHeightM`,
              );
              const roofBreakCapHeightM = asNumber(
                balcony.roofBreakCapHeightM,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakCapHeightM`,
              );
              if (
                width <= 0
                || height <= 0
                || depthM <= 0
                || parapetHeightM <= 0
                || openingSurroundWidthM <= 0
                || openingSurroundHeightM <= 0
                || roofBreakWidthM <= 0
                || roofBreakHeightM < 0
                || roofBreakCapHeightM < 0
              ) {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}] dimensions must be valid (roof-break heights may be 0; all other widths/heights must be > 0)`);
              }
              const glassStyle = ensureString(
                balcony.opening.glassStyle,
                `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.glassStyle`,
              );
              if (!["stained_glass_bright", "stained_glass_dim"].includes(glassStyle)) {
                fail(`wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.glassStyle must be supported`);
              }

              return {
                centerS: asNumber(
                  balcony.centerS,
                  `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].centerS`,
                ),
                storyIndex,
                spanBays,
                depthM,
                parapetHeightM,
                openingSurroundWidthM,
                openingSurroundHeightM,
                openingSurroundBottomOffsetM,
                roofBreakWidthM,
                roofBreakBottomOffsetM,
                roofBreakHeightM,
                roofBreakCapHeightM,
                opening: {
                  width,
                  height,
                  sillOffsetM: asNumber(
                    balcony.opening.sillOffsetM,
                    `wall_details.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.sillOffsetM`,
                  ),
                  headShape,
                  glassStyle,
                },
              };
            });

            return {
              zoneId,
              face,
              segmentOrdinal,
              balconies,
            };
          });
        })()
      : [];
  const compositionLayoutOverrides =
    wallDetailsRaw && typeof wallDetailsRaw.composition_layout_overrides !== "undefined"
      ? (() => {
          if (!Array.isArray(wallDetailsRaw.composition_layout_overrides)) {
            fail("wall_details.composition_layout_overrides must be an array when provided");
          }

          const windowModuleIds = new Set(moduleRegistry.window_modules.map((module) => module.id));
          const doorModuleIds = new Set(moduleRegistry.door_modules.map((module) => module.id));
          const heroBayModuleIds = new Set(moduleRegistry.hero_bay_modules.map((module) => module.id));

          return wallDetailsRaw.composition_layout_overrides.map((override, index) => {
            if (!override || typeof override !== "object") {
              fail(`wall_details.composition_layout_overrides[${index}] must be an object`);
            }

            const zoneId = ensureString(override.zoneId, `wall_details.composition_layout_overrides[${index}].zoneId`);
            if (!zones.some((zone) => zone.id === zoneId)) {
              fail(`wall_details.composition_layout_overrides[${index}].zoneId '${zoneId}' does not match a known zone`);
            }

            const face = ensureString(override.face, `wall_details.composition_layout_overrides[${index}].face`);
            if (!["north", "south", "east", "west"].includes(face)) {
              fail(`wall_details.composition_layout_overrides[${index}].face must be one of north/south/east/west`);
            }

            const segmentOrdinal = asNumber(
              override.segmentOrdinal,
              `wall_details.composition_layout_overrides[${index}].segmentOrdinal`,
            );
            if (!Number.isInteger(segmentOrdinal) || segmentOrdinal <= 0) {
              fail(`wall_details.composition_layout_overrides[${index}].segmentOrdinal must be an integer > 0`);
            }

            const kind = ensureString(override.kind, `wall_details.composition_layout_overrides[${index}].kind`);
            if (!["spawn_b_front_courtyard", "spawn_b_side_courtyard"].includes(kind)) {
              fail(`wall_details.composition_layout_overrides[${index}].kind must be a supported composition kind`);
            }

            const windowModuleId = ensureString(
              override.windowModuleId,
              `wall_details.composition_layout_overrides[${index}].windowModuleId`,
            );
            if (!windowModuleIds.has(windowModuleId)) {
              fail(`wall_details.composition_layout_overrides[${index}].windowModuleId '${windowModuleId}' is unknown`);
            }

            const doorModuleId = ensureString(
              override.doorModuleId,
              `wall_details.composition_layout_overrides[${index}].doorModuleId`,
            );
            if (!doorModuleIds.has(doorModuleId)) {
              fail(`wall_details.composition_layout_overrides[${index}].doorModuleId '${doorModuleId}' is unknown`);
            }

            const heroBayModuleId =
              typeof override.heroBayModuleId === "undefined"
                ? undefined
                : ensureString(
                    override.heroBayModuleId,
                    `wall_details.composition_layout_overrides[${index}].heroBayModuleId`,
                  );
            if (kind === "spawn_b_front_courtyard" && !heroBayModuleId) {
              fail(`wall_details.composition_layout_overrides[${index}].heroBayModuleId is required for front Spawn B compositions`);
            }
            if (heroBayModuleId && !heroBayModuleIds.has(heroBayModuleId)) {
              fail(`wall_details.composition_layout_overrides[${index}].heroBayModuleId '${heroBayModuleId}' is unknown`);
            }

            return {
              zoneId,
              face,
              segmentOrdinal,
              kind,
              windowModuleId,
              doorModuleId,
              ...(heroBayModuleId ? { heroBayModuleId } : {}),
              lowerWindowSillY: asNumber(
                override.lowerWindowSillY,
                `wall_details.composition_layout_overrides[${index}].lowerWindowSillY`,
              ),
              upperWindowSillY: asNumber(
                override.upperWindowSillY,
                `wall_details.composition_layout_overrides[${index}].upperWindowSillY`,
              ),
            };
          });
        })()
      : [];

  return {
    mapId: MAP_ID,
    playable_boundary: playableBoundary,
    defaults: {
      wall_height: wallHeight,
      wall_thickness: wallThickness ?? 0.25,
      ceiling_height: ceilingHeight,
      floor_height: floorHeight,
    },
    wall_details: {
      enabled: typeof wallDetailEnabled === "boolean" ? wallDetailEnabled : true,
      style: wallDetailsStyle,
      density: wallDetailDensity,
      maxProtrusion: wallDetailMaxProtrusion,
      facade_overrides: facadeOverrides,
      module_registry: moduleRegistry,
      composition_layout_overrides: compositionLayoutOverrides,
      door_layout_overrides: doorLayoutOverrides,
      window_layout_overrides: windowLayoutOverrides,
      balcony_layout_overrides: balconyLayoutOverrides,
      ...(typeof wallDetailSeed === "number" ? { seed: wallDetailSeed } : {}),
    },
    zones,
    exterior_wall_patches: deriveExteriorWallPatches(spec),
    constraints: {
      min_path_width_main_lane: minMainLane,
      min_path_width_side_halls: minSideHalls,
    },
  };
}

export function deriveShotsRuntime(designShotsDoc) {
  const sourceShots = Array.isArray(designShotsDoc?.shots) ? designShotsDoc.shots : [];
  if (sourceShots.length === 0) {
    fail("docs/map-design/shots.json must contain a non-empty 'shots' array");
  }

  const shots = sourceShots.map((shot) => JSON.parse(JSON.stringify(shot)));
  const seenIds = new Set();
  for (const [index, shot] of shots.entries()) {
    const id = ensureString(shot?.id, `shots[${index}].id`);
    if (seenIds.has(id)) fail(`Duplicate authored shot id '${id}'`);
    seenIds.add(id);
  }

  const metadata =
    designShotsDoc?.metadata && typeof designShotsDoc.metadata === "object"
      ? { ...designShotsDoc.metadata }
      : {};

  const requestedCompareShotId = typeof metadata.compareShotId === "string"
    ? metadata.compareShotId
    : DEFAULT_COMPARE_SHOT_ID;
  if (!seenIds.has(requestedCompareShotId)) {
    fail(`Authored shots require exact compare shot '${requestedCompareShotId}'`);
  }

  return {
    metadata: {
      ...metadata,
      mapId: MAP_ID,
      shotCount: shots.length,
    },
    aliases: {
      compare: requestedCompareShotId,
    },
    shots,
  };
}

export function compileMapSpec(
  mapSpec,
  compositionWaivers = emptyCompositionWaiverRegistry(),
) {
  if (!mapSpec || typeof mapSpec !== "object" || Array.isArray(mapSpec)) {
    fail("map spec must be an object");
  }

  const formatVersion =
    typeof mapSpec.metadata?.version === "undefined"
      ? undefined
      : ensureString(mapSpec.metadata.version, "metadata.version");
  const { zoneIds, zones } = deriveZones(mapSpec);
  validateMapPolishSurveyCameraOverrides(mapSpec, zoneIds);
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const districts = deriveDistricts(mapSpec);
  const districtIds = new Set((districts ?? []).map((district) => district.id));
  const traversalSurfaces = deriveTraversalSurfaces(mapSpec, zoneById);
  const surfaceById = new Map((traversalSurfaces ?? []).map((surface) => [surface.id, surface]));
  const tacticalLanes = deriveTacticalLanes(mapSpec, zoneIds);
  validateZoneV3References(zones, districts, traversalSurfaces, tacticalLanes);
  const explicitConnectivity = deriveExplicitConnectivity(mapSpec, zoneIds, surfaceById);
  validateConnectedTopology(zones, explicitConnectivity);
  const authoredSpawns = deriveAuthoredSpawns(mapSpec, zoneById, surfaceById);
  const assetRegistry = deriveAssetRegistry(mapSpec, formatVersion);
  const assetById = new Map((assetRegistry ?? []).map((asset) => [asset.id, asset]));
  const massingProfiles = deriveMassingProfiles(mapSpec, formatVersion);
  const massingById = new Map((massingProfiles ?? []).map((profile) => [profile.id, profile]));
  const facadeModules = deriveFacadeModules(mapSpec, formatVersion, assetById);
  const moduleById = new Map((facadeModules ?? []).map((module) => [module.id, module]));
  const facadeProfiles = deriveFacadeProfiles(mapSpec, formatVersion, massingById, moduleById);
  const profileById = new Map((facadeProfiles ?? []).map((profile) => [profile.id, profile]));
  const frontages = deriveFrontages(
    mapSpec,
    zoneIds,
    zoneById,
    districtIds,
    formatVersion,
    massingById,
    profileById,
    moduleById,
  );
  let frontageCoverage;
  if (isV3FormatVersion(formatVersion)) {
    frontageCoverage = validateFrontageCoverage({
      zones,
      frontages,
      exemptions: mapSpec.frontage_exemptions,
    });
    validateAdjacentFrontageMaterialIdentity(frontages, zoneById, profileById);
    for (const frontage of frontages ?? []) {
      validateFixtureCenterlines({
        frontage,
        anchors: mapSpec.anchors ?? [],
        moduleById,
      });
    }
  }
  const anchors = deriveAnchors(mapSpec, zoneIds, zoneById, frontages, traversalSurfaces);
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  warnAnchorsInClearZones(anchors, zones);
  const dressingClusters = deriveDressingClusters(
    mapSpec,
    zoneById,
    surfaceById,
    districtIds,
    anchorById,
    assetById,
  );
  const architecturePlacements = deriveArchitecturePlacements(
    frontages,
    zoneById,
    surfaceById,
    massingById,
    profileById,
    moduleById,
  );
  const dressingPlacements = deriveDressingPlacements(
    mapSpec,
    formatVersion,
    dressingClusters,
    anchorById,
    assetById,
  );
  if (isV3FormatVersion(formatVersion)) {
    const compositionRules = normalizeCompositionRules(
      mapSpec.composition_rules,
      compositionWaivers,
    );
    validateCompositionRules({
      zones,
      frontages,
      anchors,
      architecturePlacements,
      dressingPlacements,
      rules: compositionRules,
    });
  }

  if (isV3FormatVersion(formatVersion)) {
    const referencedAssets = new Set([
      ...(dressingPlacements ?? []).map((placement) => placement.assetId),
      ...(facadeModules ?? []).flatMap((module) => module.assetId ? [module.assetId] : []),
    ]);
    const unusedAssets = (assetRegistry ?? []).filter((asset) => !referencedAssets.has(asset.id)).map((asset) => asset.id);
    if (unusedAssets.length > 0) fail(`V3 asset registry contains unrendered assets: ${unusedAssets.join(", ")}`);
  }

  // Zone section models: origin at the rect's south-west corner on the zone's floor.
  const sectionModels = zones.filter((zone) => zone.sectionModelId).map((zone) => {
    const surface = zone.surfaceId ? surfaceById.get(zone.surfaceId) : undefined;
    const elevationM = resolveSurfaceElevationAt(surface, zone.rect.x + zone.rect.w * 0.5, zone.rect.y + zone.rect.h * 0.5);
    getRuntimeModelCatalog();
    return {
      zoneId: zone.id,
      modelId: zone.sectionModelId,
      origin: { x: zone.rect.x, y: zone.rect.y, z: elevationM },
      sizeM: { width: zone.rect.w, depth: zone.rect.h },
      faces: zone.sectionFaces ?? ["north", "south", "east", "west"],
      materialIds: runtimeModelMaterialIds.get(zone.sectionModelId) ?? [],
    };
  });
  const blockoutSpec = deriveBlockoutSpec(mapSpec, zones);
  const mapCenter = deriveMapCenter(mapSpec, blockoutSpec.playable_boundary);
  validateSealedPerimeter(formatVersion, blockoutSpec.playable_boundary, blockoutSpec.exterior_wall_patches);

  return {
    ...blockoutSpec,
    ...(formatVersion ? { formatVersion } : {}),
    ...(mapCenter ? { mapCenter } : {}),
    ...(districts ? { districts } : {}),
    ...(traversalSurfaces ? { traversalSurfaces } : {}),
    ...(tacticalLanes ? { tacticalLanes } : {}),
    ...(explicitConnectivity ? { explicitConnectivity } : {}),
    ...(authoredSpawns ? { authoredSpawns } : {}),
    ...(frontages ? { frontages } : {}),
    ...(frontageCoverage ? { frontageCoverage } : {}),
    ...(assetRegistry ? { assetRegistry } : {}),
    ...(massingProfiles ? { massingProfiles } : {}),
    ...(facadeModules ? { facadeModules } : {}),
    ...(facadeProfiles ? { facadeProfiles } : {}),
    ...(architecturePlacements ? { architecturePlacements } : {}),
    ...(sectionModels.length ? { sectionModels } : {}),
    ...(dressingClusters ? { dressingClusters } : {}),
    ...(dressingPlacements ? { dressingPlacements } : {}),
    anchors,
  };
}

async function main() {
  const [mapSpec, mapSpecSchema, compositionWaiversDocument, designShots] = await Promise.all([
    readJson(mapSpecPath),
    readJson(mapSpecSchemaPath),
    readJson(compositionWaiversPath),
    readJson(designShotsPath),
  ]);
  const [mapSpecSha256, designShotsSha256] = await Promise.all([
    sha256File(mapSpecPath),
    sha256File(designShotsPath),
  ]);
  validateMapSpecAgainstSchema(mapSpec, mapSpecSchema);
  const compositionWaivers = normalizeCompositionWaiverRegistry(compositionWaiversDocument);
  const mapSpecRuntime = {
    generatedFrom: generatedFrom(mapSpecPath, mapSpecSha256),
    ...compileMapSpec(mapSpec, compositionWaivers),
  };
  const shotsRuntime = deriveShotsRuntime(designShots);
  shotsRuntime.metadata.generatedFrom = generatedFrom(designShotsPath, designShotsSha256);

  if (process.argv.includes("--check")) {
    await Promise.all([
      assertGeneratedFile(mapSpecOutPath, mapSpecRuntime),
      assertGeneratedFile(shotsOutPath, shotsRuntime),
    ]);
  } else {
    await mkdir(runtimeDir, { recursive: true });
    await writeJson(mapSpecOutPath, mapSpecRuntime);
    await writeJson(shotsOutPath, shotsRuntime);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptFile) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
