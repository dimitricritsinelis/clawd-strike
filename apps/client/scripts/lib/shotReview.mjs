import {
  DEFAULT_SHOT_CAMERA_TOLERANCE,
  evaluateRuntimeShotCameraPose,
} from "./runtimePlaywright.mjs";

const EMPTY_FRAME_EDGE_ENERGY = 0.003;
const SKY_ONLY_ESTIMATE = 0.92;
const DEFAULT_MAX_GROUNDING_GAP_M = 0.03;
const DIMENSION_KEYS = ["width", "depth", "height"];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function normalizeTag(value) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function firstDefined(...values) {
  return values.find((value) => typeof value !== "undefined");
}

function parseTagList(value, label, errors) {
  if (typeof value === "undefined") return [];
  const raw = typeof value === "string" ? [value] : value;
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    errors.push(`${label} must be a string or non-empty string array`);
    return [];
  }
  return [...new Set(raw.map(normalizeTag))];
}

function parseModeList(value, label, errors) {
  if (typeof value === "undefined") return undefined;
  const raw = typeof value === "string" ? [value] : value;
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    errors.push(`${label} must be a string or non-empty string array`);
    return undefined;
  }
  return [...new Set(raw.map((entry) => entry.trim().toLowerCase()))];
}

function parseTolerance(value, errors) {
  if (typeof value === "undefined") return { ...DEFAULT_SHOT_CAMERA_TOLERANCE };
  if (!isRecord(value)) {
    errors.push("cameraTolerance must be an object");
    return { ...DEFAULT_SHOT_CAMERA_TOLERANCE };
  }

  const tolerance = { ...DEFAULT_SHOT_CAMERA_TOLERANCE };
  for (const key of ["positionM", "angleDeg", "fovDeg"]) {
    if (typeof value[key] === "undefined") continue;
    if (typeof value[key] !== "number" || !Number.isFinite(value[key]) || value[key] < 0) {
      errors.push(`cameraTolerance.${key} must be a finite number >= 0`);
      continue;
    }
    tolerance[key] = value[key];
  }
  return tolerance;
}

function parseCoverageRange(value, label, errors, ratio = true) {
  if (typeof value === "undefined") return null;
  let min;
  let max;
  if (Array.isArray(value) && value.length === 2) {
    [min, max] = value;
  } else if (isRecord(value)) {
    min = value.min;
    max = value.max;
  } else {
    errors.push(`${label} must be a { min, max } object or [min, max] tuple`);
    return null;
  }

  const parsed = {};
  for (const [key, candidate] of [["min", min], ["max", max]]) {
    if (typeof candidate === "undefined") continue;
    if (
      typeof candidate !== "number" ||
      !Number.isFinite(candidate) ||
      candidate < 0 ||
      (ratio && candidate > 1)
    ) {
      errors.push(`${label}.${key} must be a finite ${ratio ? "0..1 ratio" : "non-negative number"}`);
      continue;
    }
    parsed[key] = candidate;
  }
  if (typeof parsed.min === "number" && typeof parsed.max === "number" && parsed.min > parsed.max) {
    errors.push(`${label}.min must be <= ${label}.max`);
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

function setExplicitRangeBound(ranges, metric, bound, value, label, errors, ratio = true) {
  if (typeof value === "undefined") return;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (ratio && value > 1)
  ) {
    errors.push(`${label} must be a finite ${ratio ? "0..1 ratio" : "non-negative number"}`);
    return;
  }
  ranges[metric] = { ...(ranges[metric] ?? {}), [bound]: value };
}

function parseScreenCoverage(value, errors) {
  if (typeof value === "undefined") return {};
  if (!isRecord(value)) {
    errors.push("screenCoverage must be an object");
    return {};
  }

  const ranges = {};
  const definitions = [
    ["skyRatio", true],
    ["nonSkyRatio", true],
    ["detailRatio", true],
    ["upperDetailRatio", true],
    ["visibleLandmarks", false],
  ];
  for (const [metric, ratio] of definitions) {
    const range = parseCoverageRange(value[metric], `screenCoverage.${metric}`, errors, ratio);
    if (range) ranges[metric] = range;
  }

  setExplicitRangeBound(ranges, "skyRatio", "min", value.minSkyRatio, "screenCoverage.minSkyRatio", errors);
  setExplicitRangeBound(ranges, "skyRatio", "max", value.maxSkyRatio, "screenCoverage.maxSkyRatio", errors);
  setExplicitRangeBound(ranges, "nonSkyRatio", "min", firstDefined(value.minNonSkyRatio, value.minSceneCoverage), "screenCoverage.minNonSkyRatio", errors);
  setExplicitRangeBound(ranges, "nonSkyRatio", "max", value.maxNonSkyRatio, "screenCoverage.maxNonSkyRatio", errors);
  setExplicitRangeBound(ranges, "detailRatio", "min", firstDefined(value.minDetailRatio, value.minDetailCoverageRatio), "screenCoverage.minDetailRatio", errors);
  setExplicitRangeBound(ranges, "detailRatio", "max", firstDefined(value.maxDetailRatio, value.maxDetailCoverageRatio), "screenCoverage.maxDetailRatio", errors);
  setExplicitRangeBound(ranges, "upperDetailRatio", "min", value.minUpperDetailRatio, "screenCoverage.minUpperDetailRatio", errors);
  setExplicitRangeBound(ranges, "upperDetailRatio", "max", value.maxUpperDetailRatio, "screenCoverage.maxUpperDetailRatio", errors);
  setExplicitRangeBound(ranges, "visibleLandmarks", "min", firstDefined(value.minVisibleLandmarks, value.minLandmarkCount), "screenCoverage.minVisibleLandmarks", errors, false);
  setExplicitRangeBound(ranges, "visibleLandmarks", "max", firstDefined(value.maxVisibleLandmarks, value.maxLandmarkCount), "screenCoverage.maxVisibleLandmarks", errors, false);
  return ranges;
}

function parseOptionalString(value, label, errors) {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string`);
    return undefined;
  }
  return value.trim();
}

function parseDimensionRanges(value, label, errors) {
  if (typeof value === "undefined") return {};
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return {};
  }
  const ranges = {};
  for (const key of DIMENSION_KEYS) {
    const range = parseCoverageRange(value[key], `${label}.${key}`, errors, false);
    if (range) ranges[key] = range;
  }
  return ranges;
}

function parseRequiredVisibleAssets(value, errors) {
  if (typeof value === "undefined") return [];
  if (!Array.isArray(value)) {
    errors.push("visualTelemetry.requiredVisibleAssets must be an array");
    return [];
  }

  return value.map((raw, index) => {
    const label = `visualTelemetry.requiredVisibleAssets[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${label} must be an object`);
      return null;
    }
    const placementId = parseOptionalString(raw.placementId, `${label}.placementId`, errors);
    const assetId = parseOptionalString(raw.assetId, `${label}.assetId`, errors);
    const moduleId = parseOptionalString(raw.moduleId, `${label}.moduleId`, errors);
    const semanticClass = parseOptionalString(raw.semanticClass, `${label}.semanticClass`, errors);
    if (!placementId && !assetId && !moduleId) {
      errors.push(`${label} must identify a placementId, assetId, or moduleId`);
    }
    const maxGroundingGapM = firstDefined(raw.maxGroundingGapM, raw.groundingRequired === true
      ? DEFAULT_MAX_GROUNDING_GAP_M
      : undefined);
    if (
      typeof maxGroundingGapM !== "undefined" &&
      (typeof maxGroundingGapM !== "number" || !Number.isFinite(maxGroundingGapM) || maxGroundingGapM < 0)
    ) {
      errors.push(`${label}.maxGroundingGapM must be a finite number >= 0`);
    }
    return {
      ...(placementId ? { placementId } : {}),
      ...(assetId ? { assetId } : {}),
      ...(moduleId ? { moduleId } : {}),
      ...(semanticClass ? { semanticClass: normalizeTag(semanticClass) } : {}),
      representations: parseModeList(raw.representations, `${label}.representations`, errors),
      materialModes: parseModeList(raw.materialModes, `${label}.materialModes`, errors),
      shadowModes: parseModeList(raw.shadowModes, `${label}.shadowModes`, errors),
      ...(typeof maxGroundingGapM === "number" && Number.isFinite(maxGroundingGapM)
        ? { maxGroundingGapM }
        : {}),
      screenAreaRatio: parseCoverageRange(raw.screenAreaRatio, `${label}.screenAreaRatio`, errors),
      dimensionsM: parseDimensionRanges(raw.dimensionsM, `${label}.dimensionsM`, errors),
    };
  }).filter(Boolean);
}

function parseVisualTelemetry(value, errors) {
  if (typeof value === "undefined") return {
    required: false,
    requiredVisibleAssets: [],
    forbiddenRepresentations: [],
    forbiddenArtifactTags: [],
  };
  if (!isRecord(value)) {
    errors.push("visualTelemetry must be an object");
    return {
      required: false,
      requiredVisibleAssets: [],
      forbiddenRepresentations: [],
      forbiddenArtifactTags: [],
    };
  }
  if (typeof value.required !== "undefined" && typeof value.required !== "boolean") {
    errors.push("visualTelemetry.required must be a boolean");
  }
  return {
    required: value.required === true,
    requiredVisibleAssets: parseRequiredVisibleAssets(value.requiredVisibleAssets, errors),
    forbiddenRepresentations: parseModeList(
      value.forbiddenRepresentations,
      "visualTelemetry.forbiddenRepresentations",
      errors,
    ) ?? [],
    forbiddenArtifactTags: parseTagList(
      value.forbiddenArtifactTags,
      "visualTelemetry.forbiddenArtifactTags",
      errors,
    ),
  };
}

export function resolveShotDefinition(shotsSpec, shotId) {
  const shot = Array.isArray(shotsSpec?.shots)
    ? shotsSpec.shots.find((candidate) => candidate?.id === shotId)
    : null;
  if (!isRecord(shot)) {
    throw new Error(`[shot-inventory] unknown authored shot id '${shotId}'`);
  }
  const defaults = isRecord(shotsSpec?.metadata?.acceptanceDefaults)
    ? shotsSpec.metadata.acceptanceDefaults
    : {};
  const acceptance = isRecord(shot.acceptance) ? shot.acceptance : {};
  const defaultTelemetry = isRecord(defaults.visualTelemetry) ? defaults.visualTelemetry : {};
  const shotTelemetry = isRecord(acceptance.visualTelemetry) ? acceptance.visualTelemetry : {};
  return {
    ...shot,
    acceptance: {
      ...defaults,
      ...acceptance,
      expectedAssetModes: {
        ...(isRecord(defaults.expectedAssetModes) ? defaults.expectedAssetModes : {}),
        ...(isRecord(acceptance.expectedAssetModes) ? acceptance.expectedAssetModes : {}),
      },
      screenCoverage: {
        ...(isRecord(defaults.screenCoverage) ? defaults.screenCoverage : {}),
        ...(isRecord(acceptance.screenCoverage) ? acceptance.screenCoverage : {}),
      },
      cameraTolerance: {
        ...(isRecord(defaults.cameraTolerance) ? defaults.cameraTolerance : {}),
        ...(isRecord(acceptance.cameraTolerance) ? acceptance.cameraTolerance : {}),
      },
      visualTelemetry: {
        ...defaultTelemetry,
        ...shotTelemetry,
        forbiddenRepresentations: [
          ...(Array.isArray(defaultTelemetry.forbiddenRepresentations) ? defaultTelemetry.forbiddenRepresentations : []),
          ...(Array.isArray(shotTelemetry.forbiddenRepresentations) ? shotTelemetry.forbiddenRepresentations : []),
        ],
        forbiddenArtifactTags: [
          ...(Array.isArray(defaultTelemetry.forbiddenArtifactTags) ? defaultTelemetry.forbiddenArtifactTags : []),
          ...(Array.isArray(shotTelemetry.forbiddenArtifactTags) ? shotTelemetry.forbiddenArtifactTags : []),
        ],
      },
    },
  };
}

export function parseHumanReviewPolicy(shotsSpec) {
  const raw = shotsSpec?.metadata?.humanReviewPolicy;
  const errors = [];
  if (!isRecord(raw)) {
    return {
      status: "NOT_APPROVED",
      approvalAuthority: "human",
      automatedApprovalAllowed: false,
      minimumCategoryScore: 4,
      categories: [],
      approved: false,
      complete: false,
      errors: ["metadata.humanReviewPolicy is required"],
    };
  }
  const status = typeof raw.status === "string" ? raw.status : "NOT_APPROVED";
  const approvalAuthority = raw.approvalAuthority === "human" ? "human" : raw.approvalAuthority;
  const automatedApprovalAllowed = raw.automatedApprovalAllowed === true;
  const minimumCategoryScore = typeof raw.minimumCategoryScore === "number" && Number.isFinite(raw.minimumCategoryScore)
    ? raw.minimumCategoryScore
    : 4;
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((category) => ({
        id: typeof category?.id === "string" ? category.id : null,
        label: typeof category?.label === "string" ? category.label : null,
        description: typeof category?.description === "string" ? category.description : null,
        score: typeof category?.score === "number" && Number.isFinite(category.score) ? category.score : null,
      }))
    : [];
  if (approvalAuthority !== "human") errors.push("humanReviewPolicy.approvalAuthority must be 'human'");
  if (!["NOT_APPROVED", "APPROVED"].includes(status)) {
    errors.push("humanReviewPolicy.status must be NOT_APPROVED or APPROVED");
  }
  if (raw.automatedApprovalAllowed !== false || automatedApprovalAllowed) {
    errors.push("humanReviewPolicy.automatedApprovalAllowed must be explicitly false");
  }
  if (minimumCategoryScore < 1 || minimumCategoryScore > 5) {
    errors.push("humanReviewPolicy.minimumCategoryScore must be between 1 and 5");
  }
  if (categories.length === 0 || categories.some((category) => !category.id || !category.label)) {
    errors.push("humanReviewPolicy.categories must contain labeled rubric categories");
  }
  const complete = categories.length > 0 && categories.every((category) => typeof category.score === "number");
  const approved = (
    status === "APPROVED" &&
    approvalAuthority === "human" &&
    !automatedApprovalAllowed &&
    complete &&
    categories.every((category) => category.score >= minimumCategoryScore) &&
    errors.length === 0
  );
  return {
    status,
    approvalAuthority,
    automatedApprovalAllowed,
    minimumCategoryScore,
    categories,
    approved,
    complete,
    errors,
  };
}

export function parseShotAcceptance(shotDefinition) {
  const shot = isRecord(shotDefinition) ? shotDefinition : {};
  const nested = isRecord(shot.acceptance)
    ? shot.acceptance
    : isRecord(shot.reviewAcceptance)
      ? shot.reviewAcceptance
      : {};
  const errors = [];
  const expectedModesRaw = firstDefined(
    nested.expectedAssetModes,
    nested.assetModes,
    shot.expectedAssetModes,
    shot.assetModes,
  );
  let expectedAssetModes = {};
  if (typeof expectedModesRaw !== "undefined") {
    if (!isRecord(expectedModesRaw)) {
      errors.push("expectedAssetModes must be an object");
    } else {
      expectedAssetModes = {
        floor: parseModeList(firstDefined(expectedModesRaw.floor, expectedModesRaw.floors), "expectedAssetModes.floor", errors),
        wall: parseModeList(firstDefined(expectedModesRaw.wall, expectedModesRaw.walls), "expectedAssetModes.wall", errors),
        props: parseModeList(firstDefined(expectedModesRaw.props, expectedModesRaw.prop, expectedModesRaw.propVisuals), "expectedAssetModes.props", errors),
      };
      expectedAssetModes = Object.fromEntries(
        Object.entries(expectedAssetModes).filter(([, modes]) => Array.isArray(modes) && modes.length > 0),
      );
    }
  }

  return {
    requiredSceneTags: parseTagList(
      firstDefined(nested.requiredSceneTags, nested.requiredTags, shot.requiredSceneTags, shot.requiredTags),
      "requiredSceneTags",
      errors,
    ),
    forbiddenSceneTags: parseTagList(
      firstDefined(nested.forbiddenSceneTags, nested.forbiddenTags, shot.forbiddenSceneTags, shot.forbiddenTags),
      "forbiddenSceneTags",
      errors,
    ),
    expectedAssetModes,
    screenCoverage: parseScreenCoverage(
      firstDefined(nested.screenCoverage, nested.coverage, shot.screenCoverage, shot.coverage),
      errors,
    ),
    cameraTolerance: parseTolerance(
      firstDefined(nested.cameraTolerance, nested.cameraTolerances, shot.cameraTolerance, shot.cameraTolerances),
      errors,
    ),
    expectedCameraZoneId: parseOptionalString(
      firstDefined(nested.expectedCameraZoneId, shot.expectedCameraZoneId),
      "expectedCameraZoneId",
      errors,
    ),
    visualTelemetry: parseVisualTelemetry(
      firstDefined(nested.visualTelemetry, shot.visualTelemetry),
      errors,
    ),
    errors,
  };
}

function addObservedTag(tags, value) {
  if (typeof value === "string" && value.trim().length > 0) {
    tags.add(normalizeTag(value));
  }
}

export function collectObservedSceneTags(state) {
  const tags = new Set();
  const explicitTagLists = [
    state?.review?.visibleSceneTags,
    state?.render?.visibleSceneTags,
    state?.scene?.visibleTags,
    state?.scene?.tags,
  ];
  for (const list of explicitTagLists) {
    if (!Array.isArray(list)) continue;
    for (const tag of list) addObservedTag(tags, tag);
  }

  for (const landmark of state?.landmarks?.visible ?? []) {
    addObservedTag(tags, landmark?.id);
    addObservedTag(tags, landmark?.type);
    addObservedTag(tags, landmark?.zone);
    addObservedTag(tags, landmark?.label);
    if (Array.isArray(landmark?.tags)) {
      for (const tag of landmark.tags) addObservedTag(tags, tag);
    }
  }
  return [...tags].sort();
}

function resolveActualAssetModes(state) {
  return {
    floor: state?.assets?.floor?.activeMode ?? null,
    wall: state?.assets?.wall?.activeMode ?? null,
    props: state?.assets?.props?.activeVisualMode ?? null,
  };
}

function deriveScreenCoverage(capture, metrics, state) {
  const detailRatio = typeof capture?.coverage?.detailRatio === "number"
    ? capture.coverage.detailRatio
    : clamp01((metrics?.edgeEnergy ?? 0) / 0.04);
  const upperDetailRatio = typeof capture?.coverage?.upperDetailRatio === "number"
    ? capture.coverage.upperDetailRatio
    : detailRatio;
  const measuredSkyRatio = typeof capture?.coverage?.skyRatio === "number"
    ? capture.coverage.skyRatio
    : typeof capture?.coverage?.estimatedSkyRatio === "number"
      ? capture.coverage.estimatedSkyRatio
      : null;
  const pitchDeg = state?.view?.camera?.pitchDeg ?? 0;
  const visualSkyOnly = Boolean(capture?.coverage?.skyOnly) || (
    typeof measuredSkyRatio === "number" && measuredSkyRatio >= SKY_ONLY_ESTIMATE
  );
  const skyOnly = visualSkyOnly && (
    pitchDeg > 35 ||
    (metrics?.brightPixelRatio ?? 0) > 0.72 ||
    (metrics?.contrast ?? 1) < 0.05
  );
  return {
    method: capture?.coverage?.method ?? "image-metrics-fallback-v1",
    detailRatio,
    upperDetailRatio,
    skyRatio: measuredSkyRatio,
    nonSkyRatio: typeof measuredSkyRatio === "number" ? 1 - measuredSkyRatio : null,
    visibleLandmarks: state?.landmarks?.visible?.length ?? 0,
    skyOnly,
  };
}

function pushFinding(findings, severity, code, message) {
  findings.push({ severity, code, message });
}

function applyCoverageAcceptance(findings, ranges, actual) {
  for (const [metric, range] of Object.entries(ranges)) {
    const value = actual[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      pushFinding(findings, "error", "coverage-metric-missing", `Required screen coverage metric '${metric}' is unavailable.`);
      continue;
    }
    if (typeof range.min === "number" && value < range.min) {
      pushFinding(findings, "error", "coverage-below-min", `${metric} ${value.toFixed(3)} is below required minimum ${range.min.toFixed(3)}.`);
    }
    if (typeof range.max === "number" && value > range.max) {
      pushFinding(findings, "error", "coverage-above-max", `${metric} ${value.toFixed(3)} exceeds required maximum ${range.max.toFixed(3)}.`);
    }
  }
}

function normalizedVisibleAssets(state) {
  const raw = firstDefined(state?.render?.visibleAssets, state?.review?.visibleAssets);
  if (!Array.isArray(raw)) return null;
  return raw.map((asset) => ({
    ...asset,
    semanticClass: typeof asset?.semanticClass === "string" ? normalizeTag(asset.semanticClass) : asset?.semanticClass,
    representation: typeof asset?.representation === "string" ? asset.representation.toLowerCase() : asset?.representation,
    materialMode: typeof asset?.materialMode === "string" ? asset.materialMode.toLowerCase() : asset?.materialMode,
    shadowMode: typeof asset?.shadowMode === "string" ? asset.shadowMode.toLowerCase() : asset?.shadowMode,
  }));
}

function visibleAssetTelemetryErrors(asset, index) {
  const errors = [];
  const label = `render.visibleAssets[${index}]`;
  if (!isRecord(asset)) return [`${label} must be an object`];
  if (typeof asset.placementId !== "string" || asset.placementId.trim().length === 0) {
    errors.push(`${label}.placementId must be a non-empty string`);
  }
  if (
    (typeof asset.assetId !== "string" || asset.assetId.trim().length === 0) &&
    (typeof asset.moduleId !== "string" || asset.moduleId.trim().length === 0)
  ) {
    errors.push(`${label} must identify assetId or moduleId`);
  }
  for (const key of ["semanticClass", "representation", "materialMode", "shadowMode"]) {
    if (typeof asset[key] !== "string" || asset[key].trim().length === 0) {
      errors.push(`${label}.${key} must be a non-empty string`);
    }
  }
  if (asset.occluded !== false) errors.push(`${label}.occluded must be false for a visible asset`);
  if (typeof asset.groundingGapM !== "number" || !Number.isFinite(asset.groundingGapM) || asset.groundingGapM < 0) {
    errors.push(`${label}.groundingGapM must be a finite number >= 0`);
  }
  if (typeof asset.screenAreaRatio !== "number" || !Number.isFinite(asset.screenAreaRatio) || asset.screenAreaRatio < 0 || asset.screenAreaRatio > 1) {
    errors.push(`${label}.screenAreaRatio must be a finite 0..1 ratio`);
  }
  if (!isRecord(asset.dimensionsM)) {
    errors.push(`${label}.dimensionsM must be an object`);
  } else {
    for (const key of DIMENSION_KEYS) {
      if (typeof asset.dimensionsM[key] !== "number" || !Number.isFinite(asset.dimensionsM[key]) || asset.dimensionsM[key] <= 0) {
        errors.push(`${label}.dimensionsM.${key} must be a finite number > 0`);
      }
    }
  }
  return errors;
}

function criterionIdentityLabel(criterion) {
  return criterion.placementId ?? criterion.assetId ?? criterion.moduleId ?? "<unknown>";
}

function matchesRequiredIdentity(asset, criterion) {
  if (criterion.placementId && asset.placementId !== criterion.placementId) return false;
  if (criterion.assetId && asset.assetId !== criterion.assetId) return false;
  if (criterion.moduleId && asset.moduleId !== criterion.moduleId) return false;
  if (criterion.semanticClass && asset.semanticClass !== criterion.semanticClass) return false;
  return true;
}

function requiredAssetConstraintViolations(asset, criterion) {
  const violations = [];
  const label = criterionIdentityLabel(criterion);
  const checkAllowed = (allowed, actual, code, field) => {
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(actual)) {
      violations.push({ code, message: `${label} ${field} '${actual ?? "missing"}' is not allowed (${allowed.join(" | ")}).` });
    }
  };
  checkAllowed(criterion.representations, asset.representation, "required-asset-representation-mismatch", "representation");
  checkAllowed(criterion.materialModes, asset.materialMode, "required-asset-material-mismatch", "material mode");
  checkAllowed(criterion.shadowModes, asset.shadowMode, "required-asset-shadow-mismatch", "shadow mode");
  if (
    typeof criterion.maxGroundingGapM === "number" &&
    asset.groundingGapM > criterion.maxGroundingGapM
  ) {
    violations.push({
      code: "required-asset-grounding-gap",
      message: `${label} grounding gap ${asset.groundingGapM.toFixed(3)}m exceeds ${criterion.maxGroundingGapM.toFixed(3)}m.`,
    });
  }
  if (criterion.screenAreaRatio) {
    if (typeof criterion.screenAreaRatio.min === "number" && asset.screenAreaRatio < criterion.screenAreaRatio.min) {
      violations.push({
        code: "required-asset-screen-area",
        message: `${label} screen area ${asset.screenAreaRatio.toFixed(4)} is below ${criterion.screenAreaRatio.min.toFixed(4)}.`,
      });
    }
    if (typeof criterion.screenAreaRatio.max === "number" && asset.screenAreaRatio > criterion.screenAreaRatio.max) {
      violations.push({
        code: "required-asset-screen-area",
        message: `${label} screen area ${asset.screenAreaRatio.toFixed(4)} exceeds ${criterion.screenAreaRatio.max.toFixed(4)}.`,
      });
    }
  }
  for (const [dimension, range] of Object.entries(criterion.dimensionsM ?? {})) {
    const actual = asset.dimensionsM?.[dimension];
    if (typeof range.min === "number" && actual < range.min) {
      violations.push({
        code: "required-asset-dimensions",
        message: `${label} ${dimension} ${actual.toFixed(3)}m is below ${range.min.toFixed(3)}m.`,
      });
    }
    if (typeof range.max === "number" && actual > range.max) {
      violations.push({
        code: "required-asset-dimensions",
        message: `${label} ${dimension} ${actual.toFixed(3)}m exceeds ${range.max.toFixed(3)}m.`,
      });
    }
  }
  return violations;
}

function applyVisualTelemetryAcceptance(findings, state, telemetry) {
  if (!telemetry.required && telemetry.requiredVisibleAssets.length === 0 && telemetry.forbiddenRepresentations.length === 0 && telemetry.forbiddenArtifactTags.length === 0) {
    return;
  }
  const assets = normalizedVisibleAssets(state);
  const artifactTagsRaw = state?.render?.artifactTags;
  if (!assets) {
    pushFinding(findings, "error", "visual-telemetry-missing", "render.visibleAssets telemetry is required for this shot.");
    return;
  }
  if (!Array.isArray(artifactTagsRaw)) {
    pushFinding(findings, "error", "artifact-telemetry-missing", "render.artifactTags telemetry is required for this shot.");
  }

  assets.forEach((asset, index) => {
    const telemetryErrors = visibleAssetTelemetryErrors(asset, index);
    if (telemetryErrors.length > 0) {
      pushFinding(findings, "error", "visible-asset-telemetry-invalid", telemetryErrors.join(" | "));
    }
  });

  const placements = new Map();
  for (const asset of assets) {
    const entries = placements.get(asset.placementId) ?? [];
    entries.push(asset);
    placements.set(asset.placementId, entries);
    if (telemetry.forbiddenRepresentations.includes(asset.representation)) {
      pushFinding(
        findings,
        "error",
        "forbidden-representation-visible",
        `${asset.placementId} rendered forbidden representation '${asset.representation}'.`,
      );
    }
  }
  for (const [placementId, entries] of placements) {
    if (entries.length > 1) {
      pushFinding(
        findings,
        "error",
        "duplicate-representation",
        `${placementId} rendered ${entries.length} representations in the same frame.`,
      );
    }
  }

  const artifactTags = Array.isArray(artifactTagsRaw)
    ? artifactTagsRaw.filter((tag) => typeof tag === "string").map(normalizeTag)
    : [];
  const forbiddenArtifacts = telemetry.forbiddenArtifactTags.filter((tag) => artifactTags.includes(tag));
  if (forbiddenArtifacts.length > 0) {
    pushFinding(
      findings,
      "error",
      "forbidden-artifact-visible",
      `Forbidden visual artifacts reported: ${forbiddenArtifacts.join(", ")}.`,
    );
  }

  for (const criterion of telemetry.requiredVisibleAssets) {
    const candidates = assets.filter((asset) => matchesRequiredIdentity(asset, criterion));
    if (candidates.length === 0) {
      pushFinding(
        findings,
        "error",
        "required-visible-asset-missing",
        `Required rendered asset/module '${criterionIdentityLabel(criterion)}' is not visible and unoccluded.`,
      );
      continue;
    }
    const evaluated = candidates
      .map((asset) => requiredAssetConstraintViolations(asset, criterion))
      .sort((left, right) => left.length - right.length);
    if (evaluated[0].length === 0) continue;
    for (const violation of evaluated[0]) {
      pushFinding(findings, "error", violation.code, violation.message);
    }
  }
}

export function collectShotFindings({ state, metrics, consoleCounts, shotDefinition, capture }) {
  const findings = [];
  const acceptance = parseShotAcceptance(shotDefinition);
  const observedTags = collectObservedSceneTags(state);
  const observedTagSet = new Set(observedTags);
  const actualAssetModes = resolveActualAssetModes(state);
  const screenCoverage = deriveScreenCoverage(capture, metrics, state);
  const camera = evaluateRuntimeShotCameraPose(state, acceptance.cameraTolerance);

  for (const error of acceptance.errors) {
    pushFinding(findings, "error", "invalid-acceptance", error);
  }
  if (capture?.shotId && state?.shot?.id !== capture.shotId) {
    pushFinding(findings, "error", "shot-id-mismatch", `Requested '${capture.shotId}' but runtime reported '${state?.shot?.id ?? "none"}'.`);
  }
  if (!camera.matches) {
    pushFinding(findings, "error", "camera-mismatch", camera.reason);
  }
  if (acceptance.expectedCameraZoneId) {
    if (typeof state?.shot?.cameraZoneId !== "string") {
      pushFinding(findings, "error", "camera-zone-missing", "Runtime did not report shot.cameraZoneId.");
    } else if (state.shot.cameraZoneId !== acceptance.expectedCameraZoneId) {
      pushFinding(
        findings,
        "error",
        "camera-zone-mismatch",
        `Authored camera is in '${state.shot.cameraZoneId}', expected '${acceptance.expectedCameraZoneId}'.`,
      );
    }
  }
  if (capture?.beauty && state?.weapon?.visible === true) {
    pushFinding(findings, "error", "beauty-viewmodel-visible", "Beauty capture rendered the weapon viewmodel.");
  }
  if (metrics.meanLuminance < 0.16) {
    pushFinding(findings, "warn", "dark-frame", "Frame is very dark; landmarking or albedo contrast may be too weak.");
  }
  if (metrics.contrast < 0.09) {
    pushFinding(findings, "warn", "low-contrast", "Frame contrast is low; forms may read as flat from this shot.");
  }
  if (screenCoverage.skyOnly) {
    pushFinding(findings, "error", "sky-only-frame", "Frame appears to contain only sky or an equivalently empty upward view.");
  } else if (metrics.edgeEnergy < EMPTY_FRAME_EDGE_ENERGY && metrics.contrast < 0.05) {
    pushFinding(findings, "error", "empty-frame", "Frame has too little structure to verify the authored scene.");
  } else if (metrics.edgeEnergy < 0.006) {
    pushFinding(findings, "warn", "low-detail-energy", "Frame detail energy is low; the composition may be overly empty or floor-dominant.");
  }
  if ((state.landmarks?.visible?.length ?? 0) === 0 && (state.render?.visibleSceneTags?.length ?? 0) === 0) {
    pushFinding(findings, "warn", "no-semantic-assets", "No rendered semantic anchors are visible in-frame.");
  }
  if ((state.render?.warnings?.length ?? 0) > 0) {
    pushFinding(findings, "error", "runtime-warnings", `Runtime warnings present: ${state.render.warnings.join(" | ")}`);
  }
  if ((consoleCounts?.errorCount ?? 0) > 0) {
    pushFinding(findings, "error", "console-errors", `Console/page errors present: ${consoleCounts.errorCount}`);
  }
  if ((consoleCounts?.warningCount ?? 0) > 0) {
    pushFinding(findings, "error", "console-warnings", `Console warnings present: ${consoleCounts.warningCount}`);
  }
  if (state.assets?.wall?.requestedMode === "pbr" && state.assets?.wall?.activeMode !== "pbr") {
    pushFinding(findings, "error", "wall-fallback", "Wall materials fell back from requested PBR mode.");
  }
  if (state.assets?.floor?.requestedMode === "pbr" && state.assets?.floor?.activeMode !== "pbr") {
    pushFinding(findings, "error", "floor-fallback", "Floor materials fell back from requested PBR mode.");
  }

  const missingTags = acceptance.requiredSceneTags.filter((tag) => !observedTagSet.has(tag));
  if (missingTags.length > 0) {
    pushFinding(findings, "error", "required-scene-tags-missing", `Required visible scene tags missing: ${missingTags.join(", ")}.`);
  }
  const forbiddenTags = acceptance.forbiddenSceneTags.filter((tag) => observedTagSet.has(tag));
  if (forbiddenTags.length > 0) {
    pushFinding(findings, "error", "forbidden-scene-tags-visible", `Forbidden scene tags visible: ${forbiddenTags.join(", ")}.`);
  }
  for (const [asset, expectedModes] of Object.entries(acceptance.expectedAssetModes)) {
    const actualMode = actualAssetModes[asset];
    if (!expectedModes.includes(String(actualMode).toLowerCase())) {
      pushFinding(
        findings,
        "error",
        "asset-mode-mismatch",
        `${asset} asset mode '${actualMode ?? "missing"}' does not match expected ${expectedModes.join(" | ")}.`,
      );
    }
  }
  applyCoverageAcceptance(findings, acceptance.screenCoverage, screenCoverage);
  applyVisualTelemetryAcceptance(findings, state, acceptance.visualTelemetry);

  return findings;
}

export function scoreShotReview(findings) {
  let score = 100;
  for (const finding of findings) {
    score -= finding.severity === "error" ? 35 : 10;
  }
  return Math.max(0, score);
}

export function summarizeCapturedShot(capture, metrics, consoleCounts, options = {}) {
  const state = capture.state;
  const minScore = Number.isFinite(options.minScore) ? options.minScore : 80;
  const shotDefinition = isRecord(options.shotDefinition) ? options.shotDefinition : null;
  const acceptance = parseShotAcceptance(shotDefinition);
  const camera = evaluateRuntimeShotCameraPose(state, acceptance.cameraTolerance);
  const screenCoverage = deriveScreenCoverage(capture, metrics, state);
  const observedSceneTags = collectObservedSceneTags(state);
  const findings = collectShotFindings({ state, metrics, consoleCounts, shotDefinition, capture });
  const score = scoreShotReview(findings);
  const passed = score >= minScore && findings.every((finding) => finding.severity !== "error");

  return {
    shotId: capture.shotId,
    imagePath: capture.imagePath,
    statePath: capture.statePath,
    consolePath: capture.consolePath,
    beauty: capture.beauty === true,
    metrics,
    screenCoverage,
    camera,
    zoneId: state.shot?.cameraZoneId ?? null,
    visibleLandmarks: state.landmarks?.visible?.map((entry) => entry.id) ?? [],
    observedSceneTags,
    assetModes: resolveActualAssetModes(state),
    console: consoleCounts,
    acceptance,
    reviewFocus: Array.isArray(shotDefinition?.reviewFocus) ? shotDefinition.reviewFocus : [],
    mustShow: Array.isArray(shotDefinition?.mustShow) ? shotDefinition.mustShow : [],
    findings,
    score,
    passed,
  };
}

function angleDeltaDeg(a, b) {
  let delta = Math.abs(a - b) % 360;
  if (delta > 180) delta = 360 - delta;
  return delta;
}

export function compareCapturedShotPair(input) {
  const {
    shotId,
    shotDefinition,
    beforeCapture,
    afterCapture,
    beforeMetrics,
    afterMetrics,
    diff,
    beforeConsole = { errorCount: 0, warningCount: 0, total: 0 },
    afterConsole = { errorCount: 0, warningCount: 0, total: 0 },
    minScore = 80,
  } = input;
  if (!isRecord(shotDefinition) || shotDefinition.id !== shotId) {
    throw new Error(`[shot-pair] '${shotId}' must resolve to one authored shot definition`);
  }
  const beforeShotId = beforeCapture?.state?.shot?.id;
  const afterShotId = afterCapture?.state?.shot?.id;
  if (beforeShotId !== shotId || afterShotId !== shotId) {
    throw new Error(
      `[shot-pair] state shot mismatch (expected=${shotId}; before=${beforeShotId ?? "missing"}; after=${afterShotId ?? "missing"})`,
    );
  }

  const before = summarizeCapturedShot(beforeCapture, beforeMetrics, beforeConsole, {
    minScore,
    shotDefinition,
  });
  const after = summarizeCapturedShot(afterCapture, afterMetrics, afterConsole, {
    minScore,
    shotDefinition,
  });
  const findings = [];
  if (!before.camera.matches) {
    pushFinding(findings, "error", "before-camera-invalid", before.camera.reason ?? "Before camera does not match its authored pose.");
  }
  if (!after.camera.matches) {
    pushFinding(findings, "error", "after-camera-invalid", after.camera.reason ?? "After camera does not match its authored pose.");
  }
  if (beforeMetrics.hash === afterMetrics.hash) {
    pushFinding(findings, "error", "identical-images", "Before and after images are identical.");
  }

  const beforeCamera = before.camera.actual;
  const afterCamera = after.camera.actual;
  const tolerance = after.acceptance.cameraTolerance;
  const cameraDelta = beforeCamera?.pos && afterCamera?.pos
    ? {
        positionM: Math.hypot(
          beforeCamera.pos.x - afterCamera.pos.x,
          beforeCamera.pos.y - afterCamera.pos.y,
          beforeCamera.pos.z - afterCamera.pos.z,
        ),
        yawDeg: angleDeltaDeg(beforeCamera.yawDeg, afterCamera.yawDeg),
        pitchDeg: Math.abs(beforeCamera.pitchDeg - afterCamera.pitchDeg),
        fovDeg: Math.abs(beforeCamera.fovDeg - afterCamera.fovDeg),
      }
    : null;
  if (
    !cameraDelta
    || cameraDelta.positionM > tolerance.positionM
    || cameraDelta.yawDeg > tolerance.angleDeg
    || cameraDelta.pitchDeg > tolerance.angleDeg
    || cameraDelta.fovDeg > tolerance.fovDeg
  ) {
    pushFinding(
      findings,
      "error",
      "camera-drift",
      cameraDelta
        ? `Before/after camera drift exceeds authored tolerance (position=${cameraDelta.positionM.toFixed(4)}m, yaw=${cameraDelta.yawDeg.toFixed(3)}deg, pitch=${cameraDelta.pitchDeg.toFixed(3)}deg, fov=${cameraDelta.fovDeg.toFixed(3)}deg).`
        : "Before/after camera metadata is unavailable.",
    );
  }
  for (const finding of after.findings) findings.push(finding);

  return {
    shotId,
    passed: findings.every((finding) => finding.severity !== "error"),
    cameraTolerance: tolerance,
    cameraDelta,
    images: {
      before: beforeMetrics,
      after: afterMetrics,
      diff,
    },
    console: {
      before: beforeConsole,
      after: afterConsole,
    },
    before,
    after,
    findings,
  };
}

function camerasMatch(left, right) {
  const a = left?.camera?.actual;
  const b = right?.camera?.actual;
  if (!a?.pos || !b?.pos) return false;
  return (
    Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z) <= 0.05 &&
    angleDeltaDeg(a.yawDeg, b.yawDeg) <= 0.25 &&
    Math.abs(a.pitchDeg - b.pitchDeg) <= 0.25 &&
    Math.abs(a.fovDeg - b.fovDeg) <= 0.05
  );
}

export function aggregateShotReviews(shots, options = {}) {
  const minScore = Number.isFinite(options.minScore) ? options.minScore : 80;
  const severityCounts = { error: 0, warn: 0 };
  const failingShots = new Set();
  const shotsWithFindings = new Set();
  const aggregateFindings = [];
  const duplicateImages = [];
  const duplicateViewpoints = [];
  const expectedShotIds = Array.isArray(options.expectedShotIds) ? options.expectedShotIds : null;

  for (const shot of shots) {
    if (shot.findings.length > 0) shotsWithFindings.add(shot.shotId);
    if (!shot.passed) failingShots.add(shot.shotId);
    for (const finding of shot.findings) {
      if (finding.severity === "error") severityCounts.error += 1;
      if (finding.severity === "warn") severityCounts.warn += 1;
    }
  }

  if (expectedShotIds) {
    const capturedIds = shots.map((shot) => shot.shotId);
    const missing = expectedShotIds.filter((shotId) => !capturedIds.includes(shotId));
    const unexpected = capturedIds.filter((shotId) => !expectedShotIds.includes(shotId));
    const duplicateCapturedIds = [...new Set(capturedIds.filter((shotId, index) => capturedIds.indexOf(shotId) !== index))];
    const orderMatches = capturedIds.length === expectedShotIds.length && capturedIds.every(
      (shotId, index) => shotId === expectedShotIds[index],
    );
    if (missing.length > 0 || unexpected.length > 0 || duplicateCapturedIds.length > 0 || !orderMatches) {
      const shotIds = [...new Set([
        ...missing,
        ...unexpected,
        ...duplicateCapturedIds,
        ...(!orderMatches ? capturedIds : []),
      ])];
      aggregateFindings.push({
        severity: "error",
        code: "captured-shot-inventory-mismatch",
        shotIds,
        message: `Captured shot inventory differs from authored order (missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}; duplicates=${duplicateCapturedIds.join(",") || "none"}).`,
      });
      for (const shotId of shotIds) failingShots.add(shotId);
    }
  }

  for (let leftIndex = 0; leftIndex < shots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < shots.length; rightIndex += 1) {
      const left = shots[leftIndex];
      const right = shots[rightIndex];
      const shotIds = [left.shotId, right.shotId];
      if (left.metrics?.hash && left.metrics.hash === right.metrics?.hash) {
        duplicateImages.push(shotIds);
        aggregateFindings.push({
          severity: "error",
          code: "duplicate-image",
          shotIds,
          message: `${left.shotId} and ${right.shotId} produced identical images.`,
        });
      }
      if (camerasMatch(left, right)) {
        duplicateViewpoints.push(shotIds);
        aggregateFindings.push({
          severity: "error",
          code: "duplicate-viewpoint",
          shotIds,
          message: `${left.shotId} and ${right.shotId} used the same live camera viewpoint.`,
        });
      }
    }
  }

  for (const finding of aggregateFindings) {
    severityCounts[finding.severity] += 1;
    for (const shotId of finding.shotIds) {
      failingShots.add(shotId);
      shotsWithFindings.add(shotId);
    }
  }

  return {
    minScore,
    passed: failingShots.size === 0,
    totalShots: shots.length,
    totalFindings: severityCounts.error + severityCounts.warn,
    severityCounts,
    shotsWithFindings: [...shotsWithFindings],
    failingShots: [...failingShots],
    duplicateImages,
    duplicateViewpoints,
    expectedShotIds,
    aggregateFindings,
  };
}
