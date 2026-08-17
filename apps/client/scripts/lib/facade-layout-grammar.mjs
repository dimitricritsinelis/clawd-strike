const EDGE_MARGIN_M = 0.6;
const MIN_BAY_GAP_M = 0.42;
const EPSILON = 1e-6;
const MIN_AWNING_TO_UPPER_SILL_BAND_M = 0.5;
const AWNING_TOP_ABOVE_GROUND_HEAD_M = 0.48;
// Authored composition: a "held" corner keeps at least this much solid wall
// between an opening and the frontage end; a "pilaster" corner needs a column
// module whose near edge sits within this distance of the end.
const HELD_CORNER_PIER_M = 1.2;
const PILASTER_CORNER_REACH_M = 0.9;
const MIRROR_TOLERANCE_M = 0.03;
const COMPOSITION_NOTE_MAX = 240;
export const FACADE_LAYOUT_SOURCES = Object.freeze(["generated", "authored"]);
export const AUTHORED_CORNER_TREATMENTS = Object.freeze(["held", "pilaster", "open"]);
const OPENING_KINDS = new Set(["door", "shop_recess", "arch"]);
const FACADE_FACES = ["north", "south", "east", "west"];
const FRONTAGE_EXEMPTION_REASONS = new Set([
  "open_traversal_face",
  "short_wall_return",
  "sealed_perimeter",
  "architectural_cut_edge",
  "retaining_wall",
  "system_articulated_boundary",
]);

function fail(message) {
  throw new Error(`[facade-layout] ${message}`);
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function validateFrontageCoverage({ zones, frontages, exemptions }) {
  if (!Array.isArray(zones) || zones.length === 0) {
    fail("Frontage coverage requires at least one walkable zone");
  }
  if (!Array.isArray(frontages)) {
    fail("Frontage coverage requires a frontage array");
  }
  if (!Array.isArray(exemptions)) {
    fail("Frontage coverage requires an explicit frontage_exemptions array");
  }

  const zoneIds = new Set(zones.map((zone) => zone?.id));
  const frontageFaceKeys = new Set();
  for (const frontage of frontages) {
    const key = `${frontage.zoneId}:${frontage.face}`;
    frontageFaceKeys.add(key);
  }

  const exemptionFaceKeys = new Set();
  const normalizedExemptions = exemptions.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`frontage_exemptions[${index}] must be an object`);
    }
    if (typeof entry.zoneId !== "string" || !zoneIds.has(entry.zoneId)) {
      fail(`frontage_exemptions[${index}] references unknown zone '${String(entry.zoneId)}'`);
    }
    if (!FACADE_FACES.includes(entry.face)) {
      fail(`frontage_exemptions[${index}].face must be one of ${FACADE_FACES.join("/")}`);
    }
    if (!FRONTAGE_EXEMPTION_REASONS.has(entry.reason)) {
      fail(
        `frontage_exemptions[${index}].reason must be one of `
        + [...FRONTAGE_EXEMPTION_REASONS].join("/"),
      );
    }
    if (typeof entry.note !== "string" || entry.note.trim().length === 0) {
      fail(`frontage_exemptions[${index}].note must explain the measured exemption`);
    }
    const key = `${entry.zoneId}:${entry.face}`;
    if (exemptionFaceKeys.has(key)) {
      fail(`Duplicate frontage exemption for '${key}'`);
    }
    if (frontageFaceKeys.has(key)) {
      fail(`Zone face '${key}' cannot carry both a frontage and an exemption`);
    }
    exemptionFaceKeys.add(key);
    return {
      zoneId: entry.zoneId,
      face: entry.face,
      reason: entry.reason,
      note: entry.note.trim(),
    };
  });

  const missingFaceKeys = [];
  for (const zone of zones) {
    for (const face of FACADE_FACES) {
      const key = `${zone.id}:${face}`;
      if (!frontageFaceKeys.has(key) && !exemptionFaceKeys.has(key)) {
        missingFaceKeys.push(key);
      }
    }
  }
  if (missingFaceKeys.length > 0) {
    fail(`Walkable zone faces lack frontage or exemption records: ${missingFaceKeys.join(", ")}`);
  }

  return {
    totalFaceCount: zones.length * FACADE_FACES.length,
    frontageFaceCount: frontageFaceKeys.size,
    exemptionFaceCount: exemptionFaceKeys.size,
    exemptions: normalizedExemptions.sort((left, right) => (
      left.zoneId.localeCompare(right.zoneId) || left.face.localeCompare(right.face)
    )),
  };
}

function chooseFittingModule(moduleById, allowedModuleIds, candidates, maxWidthM, frontageId) {
  for (const moduleId of candidates) {
    if (!allowedModuleIds.has(moduleId)) continue;
    const module = moduleById.get(moduleId);
    if (module && module.dimensionsM.width <= maxWidthM + EPSILON) return module;
  }
  fail(`Frontage '${frontageId}' has no grammar module that fits ${maxWidthM.toFixed(2)}m between edge margins`);
}

function maxColumnCount(lengthM, moduleWidthM) {
  const usableM = lengthM - EDGE_MARGIN_M * 2;
  return Math.max(1, Math.floor((usableM + MIN_BAY_GAP_M) / (moduleWidthM + MIN_BAY_GAP_M)));
}

function centeredColumns(lengthM, moduleWidthM, count) {
  const firstCenterM = EDGE_MARGIN_M + moduleWidthM * 0.5;
  const lastCenterM = lengthM - EDGE_MARGIN_M - moduleWidthM * 0.5;
  if (count <= 1) return [0.5];
  return Array.from({ length: count }, (_, index) => (
    (firstCenterM + ((lastCenterM - firstCenterM) * index) / (count - 1)) / lengthM
  ));
}

function columnsClearEdgeMargin(columns, lengthM, moduleWidthM) {
  return columns.every((along) => {
    const centerM = along * lengthM;
    return centerM - moduleWidthM * 0.5 >= EDGE_MARGIN_M - EPSILON
      && centerM + moduleWidthM * 0.5 <= lengthM - EDGE_MARGIN_M + EPSILON;
  });
}

function resolveStoryCount(heightM) {
  if (heightM >= 8.4) return 3;
  if (heightM >= 5.4) return 2;
  return 1;
}

function resolveGroundCandidates(family, lengthM) {
  switch (family) {
    case "active_merchant":
      return lengthM >= 3.6
        ? ["shop_recess_market", "door_shop_timber", "pilaster_facade"]
        : ["door_shop_timber", "pilaster_facade"];
    case "quiet_residential":
      return [
        "door_residential_timber",
        "timber_coverage_closure",
        "blind_niche",
        "pilaster_facade",
      ];
    case "service_storage":
      return ["door_storage_heavy", "blind_niche", "pilaster_facade"];
    case "covered_arcade":
      return ["arch_arcade", "shop_recess_market", "door_shop_timber", "pilaster_facade"];
    case "hero_courtyard":
      return lengthM >= 5.3
        ? ["arch_hero_courtyard", "door_residential_timber", "blind_niche", "pilaster_facade"]
        : ["door_residential_timber", "blind_niche", "pilaster_facade"];
    default:
      return ["blind_niche", "pilaster_facade"];
  }
}

function resolveUpperCandidates(family, accentModuleId) {
  if (accentModuleId) return [accentModuleId];
  switch (family) {
    case "active_merchant": return ["window_shuttered", "window_screened"];
    case "quiet_residential": return ["window_screened", "window_dark_recess"];
    case "service_storage": return ["vent_service", "blind_niche"];
    case "covered_arcade": return ["window_screened", "blind_niche"];
    case "hero_courtyard": return ["window_dark_recess", "window_screened"];
    default: return ["blind_niche"];
  }
}

function targetGroundCount(family, rhythm, lengthM, capacity, variation) {
  const spacingM = family === "quiet_residential" && rhythm === "residential_dense"
    ? 4.2
    : family === "active_merchant" || family === "covered_arcade"
    ? 4.1
    : family === "service_storage"
      ? 4.8
      : 5.2;
  const minimumArticulation = Math.max(1, Math.ceil(lengthM / 6));
  const rhythmicCount = Math.max(1, Math.round(lengthM / spacingM));
  const variedCount = rhythmicCount + (capacity > rhythmicCount && variation % 3 === 0 ? 1 : 0);
  return Math.min(capacity, Math.max(minimumArticulation, variedCount));
}

function groundModuleForColumn({ family, primaryModule, allowedModuleIds, moduleById, index, variation }) {
  if (
    primaryModule.id === "blind_niche"
    && allowedModuleIds.has("pilaster_niche_coverage")
    && index > 0
  ) {
    return moduleById.get("pilaster_niche_coverage") ?? primaryModule;
  }
  const alternateId = primaryModule.id === "timber_coverage_closure"
    ? "pilaster_coverage"
    : family === "active_merchant"
    ? "door_shop_timber"
    : family === "quiet_residential" || family === "service_storage"
      ? "blind_niche"
      : family === "covered_arcade"
        ? "column_arcade"
        : undefined;
  if (
    !alternateId
    || !allowedModuleIds.has(alternateId)
    || index === 0
    || (family === "covered_arcade" && primaryModule.id !== "arch_arcade")
    || (index + variation) % 3 !== 1
  ) return primaryModule;
  return moduleById.get(alternateId) ?? primaryModule;
}

function groundBaseForSharedHead(module, groundHeadM) {
  if (module.kind === "door" || module.kind === "shop_recess" || module.kind === "arch" || module.kind === "column") {
    return 0;
  }
  return Math.max(0, groundHeadM - module.dimensionsM.height);
}

function familyUpperSillM(family, storyIndex) {
  if (family === "covered_arcade") return storyIndex === 1 ? 4.15 : 6.45;
  if (family === "hero_courtyard") return storyIndex === 1 ? 5.15 : 7.35;
  return storyIndex === 1 ? 3.68 : 6.25;
}

function signBand(groundHeadM, upperSillDatumsM, heightM) {
  const signBandBottomM = groundHeadM + 0.12;
  const signBandTopM = Math.min(
    upperSillDatumsM[0] ? upperSillDatumsM[0] - 0.12 : heightM - 0.35,
    groundHeadM + 0.72,
  );
  return { signBandBottomM, signBandTopM };
}

function requireAuthoredString(value, label, { max = 120, pattern } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${label} must be a non-empty string`);
  if (value.length > max) fail(`${label} must be ${max} characters or fewer`);
  if (pattern && !pattern.test(value)) fail(`${label} '${value}' must match ${pattern}`);
  return value;
}

/**
 * Authored composition. Unlike the generated grammar, opening positions are a
 * design decision: every bay hangs on a named column, mirrored pairs are
 * declared and checked about the composition axis, the corner treatment is
 * declared and checked, and one sentence states the ordering idea. The result
 * still passes the same physical validator as generated layouts (edge margins,
 * shared ground head, no overlaps, parapet clearance, sign band).
 */
export function generateAuthoredFacadeLayout({
  frontageId,
  lengthM,
  heightM,
  family,
  profileModuleIds,
  moduleById,
  intent,
}) {
  if (!(lengthM > EDGE_MARGIN_M * 2)) {
    fail(`Frontage '${frontageId}' is too short for the 0.6m grammar edge margins`);
  }
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
    fail(`Frontage '${frontageId}' authored layoutIntent must be an object`);
  }
  const allowedKeys = new Set([
    "mode", "composition", "axisAlong", "cornerTreatment", "columns", "bays", "groundHeadM", "upperSillDatumsM",
  ]);
  for (const key of Object.keys(intent)) {
    if (!allowedKeys.has(key)) fail(`Frontage '${frontageId}' authored layoutIntent has unsupported field '${key}'`);
  }
  const composition = requireAuthoredString(intent.composition, `Frontage '${frontageId}' layoutIntent.composition`, {
    max: COMPOSITION_NOTE_MAX,
  }).trim();
  if (!/[.!?]$/.test(composition)) {
    fail(`Frontage '${frontageId}' layoutIntent.composition must be one complete sentence stating the ordering idea`);
  }
  const axisAlong = typeof intent.axisAlong === "undefined" ? 0.5 : intent.axisAlong;
  if (typeof axisAlong !== "number" || !(axisAlong > 0 && axisAlong < 1)) {
    fail(`Frontage '${frontageId}' layoutIntent.axisAlong must be a number strictly between 0 and 1`);
  }
  if (!AUTHORED_CORNER_TREATMENTS.includes(intent.cornerTreatment)) {
    fail(
      `Frontage '${frontageId}' layoutIntent.cornerTreatment must be one of ${AUTHORED_CORNER_TREATMENTS.join(", ")}`,
    );
  }
  if (!Array.isArray(intent.columns) || intent.columns.length === 0) {
    fail(`Frontage '${frontageId}' authored layout requires a non-empty columns array`);
  }
  const columnById = new Map();
  for (const [index, column] of intent.columns.entries()) {
    if (!column || typeof column !== "object" || Array.isArray(column)) {
      fail(`Frontage '${frontageId}' columns[${index}] must be an object`);
    }
    const id = requireAuthoredString(column.id, `Frontage '${frontageId}' columns[${index}].id`, {
      max: 32,
      pattern: /^[A-Z][A-Z0-9_]*$/,
    });
    if (columnById.has(id)) fail(`Frontage '${frontageId}' repeats column id '${id}'`);
    if (typeof column.along !== "number" || !(column.along >= 0 && column.along <= 1)) {
      fail(`Frontage '${frontageId}' column '${id}' along must be a number between 0 and 1`);
    }
    if (typeof column.mirrorOf !== "undefined") {
      requireAuthoredString(column.mirrorOf, `Frontage '${frontageId}' column '${id}' mirrorOf`, { max: 32 });
    }
    columnById.set(id, { id, along: column.along, mirrorOf: column.mirrorOf });
  }
  for (const column of columnById.values()) {
    if (typeof column.mirrorOf === "undefined") continue;
    const target = columnById.get(column.mirrorOf);
    if (!target) fail(`Frontage '${frontageId}' column '${column.id}' mirrors unknown column '${column.mirrorOf}'`);
    if (target.id === column.id) fail(`Frontage '${frontageId}' column '${column.id}' cannot mirror itself`);
    if (typeof target.mirrorOf !== "undefined" && target.mirrorOf !== column.id) {
      fail(`Frontage '${frontageId}' columns '${column.id}' and '${target.id}' declare inconsistent mirrors`);
    }
    const offsetM = (column.along - axisAlong) * lengthM;
    const targetOffsetM = (target.along - axisAlong) * lengthM;
    if (Math.abs(offsetM + targetOffsetM) > MIRROR_TOLERANCE_M) {
      fail(
        `Frontage '${frontageId}' column '${column.id}' is not mirrored about axis ${axisAlong.toFixed(3)} `
        + `by '${target.id}' (${offsetM.toFixed(2)}m vs ${targetOffsetM.toFixed(2)}m)`,
      );
    }
  }

  const allowedModuleIds = new Set(profileModuleIds);
  const storyCount = resolveStoryCount(heightM);
  if (!Array.isArray(intent.bays) || intent.bays.length === 0) {
    fail(`Frontage '${frontageId}' authored layout requires a non-empty bays array`);
  }
  const authoredBays = intent.bays.map((bay, index) => {
    if (!bay || typeof bay !== "object" || Array.isArray(bay)) {
      fail(`Frontage '${frontageId}' bays[${index}] must be an object`);
    }
    const id = requireAuthoredString(bay.id, `Frontage '${frontageId}' bays[${index}].id`, {
      max: 48,
      pattern: /^[A-Z][A-Z0-9_]*$/,
    });
    const moduleId = requireAuthoredString(bay.moduleId, `Frontage '${frontageId}' bay '${id}' moduleId`, { max: 64 });
    const module = moduleById.get(moduleId);
    if (!module) fail(`Frontage '${frontageId}' bay '${id}' references unknown module '${moduleId}'`);
    if (!allowedModuleIds.has(moduleId)) {
      fail(`Frontage '${frontageId}' bay '${id}' uses module '${moduleId}' outside its facade profile`);
    }
    const columnId = requireAuthoredString(bay.columnId, `Frontage '${frontageId}' bay '${id}' columnId`, { max: 32 });
    const column = columnById.get(columnId);
    if (!column) fail(`Frontage '${frontageId}' bay '${id}' hangs on unknown column '${columnId}'`);
    const story = typeof bay.story === "undefined" ? 0 : bay.story;
    if (!Number.isInteger(story) || story < 0) fail(`Frontage '${frontageId}' bay '${id}' story must be a non-negative integer`);
    if (story >= storyCount) {
      fail(`Frontage '${frontageId}' bay '${id}' story ${story} exceeds the ${storyCount}-story massing (${heightM.toFixed(2)}m)`);
    }
    return { id, module, column, story };
  });
  const seenBayIds = new Set();
  const seenColumnStory = new Set();
  for (const bay of authoredBays) {
    if (seenBayIds.has(bay.id)) fail(`Frontage '${frontageId}' repeats bay id '${bay.id}'`);
    seenBayIds.add(bay.id);
    const key = `${bay.column.id}:${bay.story}`;
    if (seenColumnStory.has(key)) {
      fail(`Frontage '${frontageId}' column '${bay.column.id}' hosts two bays on story ${bay.story}`);
    }
    seenColumnStory.add(key);
  }
  const groundBays = authoredBays.filter((bay) => bay.story === 0);
  if (groundBays.length === 0) fail(`Frontage '${frontageId}' authored layout has no ground-story bays`);
  const groundOpenings = groundBays.filter((bay) => OPENING_KINDS.has(bay.module.kind));
  const tallest = (bays) => Math.max(...bays.map((bay) => bay.module.dimensionsM.height));
  const groundHeadM = typeof intent.groundHeadM === "undefined"
    ? (groundOpenings.length > 0 ? tallest(groundOpenings) : tallest(groundBays))
    : intent.groundHeadM;
  if (typeof groundHeadM !== "number" || !(groundHeadM > 0)) {
    fail(`Frontage '${frontageId}' layoutIntent.groundHeadM must be a positive number`);
  }
  for (const bay of groundBays) {
    if (bay.module.dimensionsM.height > groundHeadM + EPSILON) {
      fail(
        `Frontage '${frontageId}' bay '${bay.id}' (${bay.module.dimensionsM.height.toFixed(2)}m) exceeds the shared ground head `
        + `${groundHeadM.toFixed(2)}m; use a shorter module, raise groundHeadM, or move it to an upper story`,
      );
    }
  }

  const upperSillDatumsM = [];
  const usedStories = [...new Set(authoredBays.map((bay) => bay.story).filter((story) => story > 0))].sort();
  const declaredSills = intent.upperSillDatumsM;
  if (typeof declaredSills !== "undefined") {
    if (!Array.isArray(declaredSills) || declaredSills.some((value) => typeof value !== "number" || !(value > 0))) {
      fail(`Frontage '${frontageId}' layoutIntent.upperSillDatumsM must be an array of positive numbers`);
    }
  }
  const sillForStory = new Map();
  for (let storyIndex = 1; storyIndex < storyCount; storyIndex += 1) {
    const sillM = declaredSills?.[storyIndex - 1] ?? familyUpperSillM(family, storyIndex);
    sillForStory.set(storyIndex, sillM);
  }
  for (const story of usedStories) {
    const sillM = sillForStory.get(story);
    const rowBays = authoredBays.filter((bay) => bay.story === story);
    for (const bay of rowBays) {
      if (sillM + bay.module.dimensionsM.height > heightM - 0.55 + EPSILON) {
        fail(
          `Frontage '${frontageId}' bay '${bay.id}' on story ${story} (sill ${sillM.toFixed(2)}m) does not fit under the `
          + `${heightM.toFixed(2)}m parapet`,
        );
      }
    }
    upperSillDatumsM.push(sillM);
  }

  // Corner treatment is a declared design decision, checked numerically.
  const endDistances = (bay) => {
    const centerM = bay.column.along * lengthM;
    const halfW = bay.module.dimensionsM.width * 0.5;
    return { fromStart: centerM - halfW, fromEnd: lengthM - (centerM + halfW) };
  };
  if (intent.cornerTreatment === "held") {
    for (const bay of groundOpenings) {
      const { fromStart, fromEnd } = endDistances(bay);
      if (fromStart < HELD_CORNER_PIER_M - EPSILON || fromEnd < HELD_CORNER_PIER_M - EPSILON) {
        fail(
          `Frontage '${frontageId}' opening '${bay.id}' sits ${Math.min(fromStart, fromEnd).toFixed(2)}m from a corner; `
          + `a held corner keeps at least ${HELD_CORNER_PIER_M.toFixed(2)}m of pier, or declare cornerTreatment 'pilaster'/'open'`,
        );
      }
    }
  } else if (intent.cornerTreatment === "pilaster") {
    const columns = groundBays.filter((bay) => bay.module.kind === "column");
    const nearStart = columns.some((bay) => endDistances(bay).fromStart <= PILASTER_CORNER_REACH_M + EPSILON);
    const nearEnd = columns.some((bay) => endDistances(bay).fromEnd <= PILASTER_CORNER_REACH_M + EPSILON);
    if (!nearStart || !nearEnd) {
      fail(
        `Frontage '${frontageId}' declares pilaster corners but lacks a column module within `
        + `${PILASTER_CORNER_REACH_M.toFixed(2)}m of ${!nearStart && !nearEnd ? "both ends" : !nearStart ? "its start" : "its end"}`,
      );
    }
  }

  const bays = authoredBays.map((bay) => {
    const sillM = bay.story === 0 ? null : sillForStory.get(bay.story);
    return {
      id: bay.id,
      moduleId: bay.module.id,
      along: bay.column.along,
      baseElevationM: bay.story === 0 ? groundBaseForSharedHead(bay.module, groundHeadM) : sillM,
      datumId: bay.story === 0 ? `GROUND_HEAD_${groundHeadM.toFixed(2)}` : `STORY_${bay.story}_SILL_${sillM.toFixed(2)}`,
      columnId: bay.column.id,
      layoutSource: "authored",
    };
  }).sort((left, right) => left.along - right.along || left.baseElevationM - right.baseElevationM || left.id.localeCompare(right.id));

  const layout = {
    source: "authored",
    rhythm: "authored",
    composition,
    axisAlong,
    cornerTreatment: intent.cornerTreatment,
    storyCount,
    edgeMarginM: EDGE_MARGIN_M,
    groundHeadM,
    upperSillDatumsM,
    ...signBand(groundHeadM, upperSillDatumsM, heightM),
  };
  validateFacadeLayout({ frontageId, lengthM, heightM, family, bays, layout, moduleById });
  return { bays, layout };
}

export function generateFacadeLayout({
  frontageId,
  lengthM,
  heightM,
  family,
  rhythm,
  profileModuleIds,
  moduleById,
  accentModuleId,
}) {
  if (!(lengthM > EDGE_MARGIN_M * 2)) {
    fail(`Frontage '${frontageId}' is too short for the 0.6m grammar edge margins`);
  }
  const allowedModuleIds = new Set(profileModuleIds);
  const maxModuleWidthM = lengthM - EDGE_MARGIN_M * 2;
  const variation = stableHash(`${frontageId}:${rhythm}`);
  const groundModule = chooseFittingModule(
    moduleById,
    allowedModuleIds,
    resolveGroundCandidates(family, lengthM),
    maxModuleWidthM,
    frontageId,
  );
  const groundCapacity = maxColumnCount(lengthM, groundModule.dimensionsM.width);
  const groundCount = targetGroundCount(family, rhythm, lengthM, groundCapacity, variation);
  const groundColumns = centeredColumns(lengthM, groundModule.dimensionsM.width, groundCount);
  const groundHeadM = groundModule.dimensionsM.height;
  const bays = groundColumns.map((along, index) => {
    const module = groundModuleForColumn({
      family,
      primaryModule: groundModule,
      allowedModuleIds,
      moduleById,
      index,
      variation,
    });
    return {
      id: `GROUND_${String(index + 1).padStart(2, "0")}`,
      moduleId: module.id,
      along,
      baseElevationM: groundBaseForSharedHead(module, groundHeadM),
      datumId: `GROUND_HEAD_${groundHeadM.toFixed(2)}`,
      columnId: `COLUMN_${String(index + 1).padStart(2, "0")}`,
      layoutSource: "generated",
    };
  });

  const storyCount = resolveStoryCount(heightM);
  const upperSillDatumsM = [];
  if (storyCount > 1) {
    const upperModule = chooseFittingModule(
      moduleById,
      allowedModuleIds,
      resolveUpperCandidates(family, accentModuleId),
      maxModuleWidthM,
      frontageId,
    );
    const upperCapacity = maxColumnCount(lengthM, upperModule.dimensionsM.width);
    const preferredUpperCount = accentModuleId
      ? 1
      : Math.max(groundCount, Math.ceil(lengthM / 4.6));
    const upperCount = Math.min(upperCapacity, preferredUpperCount);
    // Each row's spacing is derived from its own module width, so a ground row
    // of 2.40m bays and an upper row of 1.60m windows produce different series
    // even at equal counts and coincide only at the centre of the wall. The
    // upper row must sit over the bays below it, so inherit the ground columns
    // whenever the counts match and the narrower upper module still clears the
    // edge margin.
    const upperColumns = upperCount === groundCount
      && columnsClearEdgeMargin(groundColumns, lengthM, upperModule.dimensionsM.width)
      ? groundColumns
      : centeredColumns(lengthM, upperModule.dimensionsM.width, upperCount);
    for (let storyIndex = 1; storyIndex < storyCount; storyIndex += 1) {
      const sillM = familyUpperSillM(family, storyIndex);
      if (sillM + upperModule.dimensionsM.height > heightM - 0.55 + EPSILON) continue;
      upperSillDatumsM.push(sillM);
      for (let columnIndex = 0; columnIndex < upperColumns.length; columnIndex += 1) {
        bays.push({
          id: `STORY_${storyIndex}_WINDOW_${String(columnIndex + 1).padStart(2, "0")}`,
          moduleId: upperModule.id,
          along: upperColumns[columnIndex],
          baseElevationM: sillM,
          datumId: `STORY_${storyIndex}_SILL_${sillM.toFixed(2)}`,
          columnId: `UPPER_COLUMN_${String(columnIndex + 1).padStart(2, "0")}`,
          layoutSource: "generated",
        });
      }
    }
  }

  const layout = {
    source: "generated",
    rhythm,
    storyCount,
    edgeMarginM: EDGE_MARGIN_M,
    groundHeadM,
    upperSillDatumsM,
    ...signBand(groundHeadM, upperSillDatumsM, heightM),
  };
  validateFacadeLayout({ frontageId, lengthM, heightM, family, bays, layout, moduleById });
  return { bays, layout };
}

export function validateFacadeLayout({ frontageId, lengthM, heightM, family, bays, layout, moduleById }) {
  if (!Array.isArray(bays) || bays.length === 0) fail(`Frontage '${frontageId}' is blank`);
  const groundArticulation = bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_")).length;
  if (groundArticulation < Math.ceil(lengthM / 6)) {
    fail(`Frontage '${frontageId}' is under-articulated for its ${lengthM.toFixed(2)}m span`);
  }
  const intervals = [];
  const rowDatum = new Map();
  for (const bay of bays) {
    const module = moduleById.get(bay.moduleId);
    if (!module) fail(`Frontage '${frontageId}' bay '${bay.id}' references an unknown module`);
    if (!bay.datumId || !bay.columnId || !FACADE_LAYOUT_SOURCES.includes(bay.layoutSource)) {
      fail(`Frontage '${frontageId}' bay '${bay.id}' lacks a named generated/authored datum/column`);
    }
    if (bay.baseElevationM > 0 && module.kind === "door") {
      fail(`Frontage '${frontageId}' bay '${bay.id}' places an upper-story door without a balcony`);
    }
    if (module.kind === "shop_recess" && family !== "active_merchant" && family !== "covered_arcade") {
      fail(`Frontage '${frontageId}' bay '${bay.id}' puts a merchant bay on '${family}'`);
    }
    if ((module.kind === "door" || module.kind === "shop_recess" || module.kind === "arch") && bay.baseElevationM === 0) {
      if (Math.abs(bay.baseElevationM) > EPSILON) fail(`Frontage '${frontageId}' bay '${bay.id}' threshold is not at grade`);
    }
    const centerM = bay.along * lengthM;
    const leftM = centerM - module.dimensionsM.width * 0.5;
    const rightM = centerM + module.dimensionsM.width * 0.5;
    if (leftM < EDGE_MARGIN_M - EPSILON || rightM > lengthM - EDGE_MARGIN_M + EPSILON) {
      fail(`Frontage '${frontageId}' bay '${bay.id}' violates the 0.6m edge margin`);
    }
    const topM = bay.baseElevationM + module.dimensionsM.height;
    if (bay.datumId.startsWith("GROUND_HEAD_") && Math.abs(topM - layout.groundHeadM) > EPSILON) {
      fail(`Frontage '${frontageId}' bay '${bay.id}' misses shared ground head ${layout.groundHeadM.toFixed(2)}m`);
    }
    if (topM > heightM - 0.35 + EPSILON) fail(`Frontage '${frontageId}' bay '${bay.id}' crowds the parapet`);
    const datumPositionM = bay.datumId.startsWith("GROUND_HEAD_") ? topM : bay.baseElevationM;
    const datumBase = rowDatum.get(bay.datumId);
    if (typeof datumBase === "number" && Math.abs(datumBase - datumPositionM) > EPSILON) {
      fail(`Frontage '${frontageId}' datum '${bay.datumId}' is not aligned`);
    }
    rowDatum.set(bay.datumId, datumPositionM);
    const interval = { leftM, rightM, bottomM: bay.baseElevationM, topM, id: bay.id };
    for (const prior of intervals) {
      const overlapsX = interval.leftM < prior.rightM - EPSILON && interval.rightM > prior.leftM + EPSILON;
      const overlapsY = interval.bottomM < prior.topM - EPSILON && interval.topM > prior.bottomM + EPSILON;
      if (overlapsX && overlapsY) fail(`Frontage '${frontageId}' bays '${prior.id}' and '${bay.id}' overlap`);
    }
    intervals.push(interval);
  }
  if (!(layout.signBandTopM > layout.signBandBottomM)) {
    fail(`Frontage '${frontageId}' has no valid sign/awning band between ground head and upper sill`);
  }
  if (
    family === "active_merchant"
    &&
    layout.upperSillDatumsM.length > 0
    && layout.upperSillDatumsM[0] - (layout.groundHeadM + AWNING_TOP_ABOVE_GROUND_HEAD_M)
      < MIN_AWNING_TO_UPPER_SILL_BAND_M - EPSILON
  ) {
    fail(
      `Frontage '${frontageId}' leaves less than ${MIN_AWNING_TO_UPPER_SILL_BAND_M.toFixed(2)}m `
      + "between the awning top and first upper-story sill",
    );
  }
}

export function expectedSignWidthM(openingWidthM) {
  return Math.min(2.2, Math.max(1.25, openingWidthM * 1.2));
}

export function validateFixtureCenterlines({ frontage, anchors, moduleById }) {
  const groundBayById = new Map(
    frontage.bays.filter((bay) => bay.datumId.startsWith("GROUND_HEAD_")).map((bay) => [bay.id, bay]),
  );
  for (const anchor of anchors) {
    if (anchor.frontageId !== frontage.id) continue;
    if (
      anchor.type !== "signage_anchor"
      && anchor.type !== "shopfront_anchor"
      && anchor.type !== "dressing_anchor"
      && anchor.type !== "lantern_anchor"
    ) continue;
    if (!anchor.servedBayId) fail(`Fixture '${anchor.id}' must declare servedBayId`);
    const bay = groundBayById.get(anchor.servedBayId);
    if (!bay) fail(`Fixture '${anchor.id}' serves unknown ground bay '${anchor.servedBayId}'`);
    if (Math.abs(anchor.along - bay.along) > EPSILON) {
      fail(`Fixture '${anchor.id}' is not centered on served bay '${anchor.servedBayId}'`);
    }
    if (anchor.type === "signage_anchor") {
      if (
        anchor.vertical_offset_m < frontage.layout.signBandBottomM - EPSILON
        || anchor.vertical_offset_m > frontage.layout.signBandTopM + EPSILON
      ) {
        fail(`Sign '${anchor.id}' is outside frontage '${frontage.id}' sign datum band`);
      }
    }
    const module = moduleById.get(bay.moduleId);
    if (!module) fail(`Fixture '${anchor.id}' served bay module is missing`);
    if (anchor.type === "signage_anchor") {
      const expectedWidth = expectedSignWidthM(module.dimensionsM.width);
      if (Math.abs(anchor.width_m - expectedWidth) > EPSILON) {
        fail(
          `Sign '${anchor.id}' width ${anchor.width_m.toFixed(2)}m must derive from served opening `
          + `'${anchor.servedBayId}' as ${expectedWidth.toFixed(2)}m`,
        );
      }
    }
    if (anchor.type === "shopfront_anchor" && !["shop_recess", "door", "arch"].includes(module.kind)) {
      fail(`Shopfront '${anchor.id}' cannot serve non-opening module '${module.id}'`);
    }
  }
}
