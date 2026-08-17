import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export const MAP_POLISH_SCHEMA_VERSION = 1;
export const DEFAULT_STATE_PATH = "docs/map-design/map-polish-state.json";
export const DEFAULT_ARTIFACTS_PATH = "artifacts/map-polish";
export const SURVEY_BATCH_SIZE = 7;
export const MAX_DEFECTS = 2;
export const MAX_REJECTED_TACTICS = 2;
export const EFFECTIVE_MEAN_DELTA_THRESHOLD = 0.001;
export const EFFECTIVE_CHANGED_PIXEL_THRESHOLD = 0.002;
const MAP_POLISH_PLAYER_EYE_HEIGHT_M = 1.7;
const MAP_POLISH_CAMERA_POSITION_TOLERANCE_M = 0.02;
const MAP_POLISH_CAMERA_YAW_TOLERANCE_DEG = 0.35;
export const DESIGN_REVIEW_LENS = Object.freeze([
  "Intent and hierarchy: establish one readable purpose, hero, supporting rhythm, and quiet visual rest before adding detail.",
  "Ordered bones, lived-in layers: architecture follows datums, alignment, repetition, and purposeful symmetry; later occupation adds bounded irregularity with a reason.",
  "Plausibility and causality: construction, supports, access, use, clustering, materials, wear, repair, gravity, climate, and maintenance must make sense.",
  "Scale, sequence, and restraint: review macro to micro—massing and reveal, facade and assembly, then craft—while preserving human scale and gameplay readability.",
] as const);

export type Rating = "unrated" | "red" | "yellow" | "green";
export type RunMode = "real" | "manual" | "mock";
export type TaskRisk = "pure" | "shared" | "route-adjacent";
export type ViewName = "primary" | "context";

type JsonRecord = Record<string, unknown>;

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MapZone = {
  id: string;
  type: string;
  label: string;
  rect: Rect;
  surfaceId?: string;
  districtId?: string;
  macroLane?: string;
  clearWidthM?: number;
};

export type TraversalSurface = {
  id: string;
  zoneId: string;
  kind: "flat" | "ramp";
  rect: Rect;
  elevationM?: number;
  axis?: "x" | "y";
  startElevationM?: number;
  endElevationM?: number;
};

export type ConnectivityEdge = {
  fromZoneId: string;
  toZoneId: string;
};

export type MapSpec = JsonRecord & {
  zones: MapZone[];
  traversal_surfaces?: TraversalSurface[];
  explicit_connectivity?: ConnectivityEdge[];
  map_polish_survey_camera_overrides?: Record<string, Partial<Record<ViewName, CameraPose>>>;
};

export type CameraPose = {
  designPosition: { x: number; y: number; z: number };
  designLookAt: { x: number; y: number; z: number };
  playerPosition: { x: number; y: number; z: number };
  yawDeg: number;
  fovDeg: number;
};

export type ReviewUnitDefinition = {
  id: string;
  zoneIds: string[];
  label: string;
  zoneType: string;
  macroLane: string | null;
  views: Record<ViewName, CameraPose>;
};

export type UnitEvidence = {
  primary: string | null;
  context: string | null;
};

export type LastAttemptedPass = {
  pass: number;
  attempts: number;
  accepted: boolean;
};

export type ReviewUnitState = {
  id: string;
  zoneIds: string[];
  rating: Rating;
  confidence: number;
  defects: string[];
  evidence: UnitEvidence;
  lastAttemptedPass: LastAttemptedPass | null;
  acceptedChanges: number;
  rejectedTactics: string[];
  deferredReason?: string;
  nextAction?: string;
};

export type ActiveTaskStatus =
  | "awaiting-writer"
  | "awaiting-review"
  | "awaiting-human"
  | "blocked";

export type ActiveTask = {
  id: string;
  unitId: string;
  status: ActiveTaskStatus;
  startCommit: string;
  artifactDir: string;
  workOrder: string;
  objective: string;
  attempt: number;
  risk: TaskRisk;
  touchedFiles: string[];
  greenRegressionUnitId?: string;
  proposedOutcome?: "accept" | "reject" | "defer";
  blindAfterLabel?: "A" | "B";
  movementConfirmationRequired?: boolean;
  artifactEvidenceHash?: string;
};

export type MapPolishState = {
  schemaVersion: number;
  mapAuthorityHash: string;
  surveyedAuthorityHash: string | null;
  sourceFingerprint: string | null;
  pass: number;
  surveyRequired: boolean;
  milestone: {
    acceptedAtLastRun: number;
    required: boolean;
    full: boolean;
  };
  activeTask: ActiveTask | null;
  units: ReviewUnitState[];
};

export type SurveyRating = {
  unitId: string;
  rating: Exclude<Rating, "unrated">;
  confidence: number;
  defects: string[];
};

export type ImagePairInput = {
  before: {
    width: number;
    height: number;
    sha256: string;
    skyOnly?: boolean;
    corrupt?: boolean;
    camera?: RuntimeCamera | null;
    zoneId?: string | null;
    runtimeErrors?: number;
  };
  after: {
    width: number;
    height: number;
    sha256: string;
    skyOnly?: boolean;
    corrupt?: boolean;
    camera?: RuntimeCamera | null;
    zoneId?: string | null;
    runtimeErrors?: number;
  };
  meanAbsoluteDelta: number;
  changedPixelRatio: number;
  expectedZoneId: string;
  relevantSourceChanged: boolean;
};

export type RuntimeCamera = {
  pos: { x: number; y: number; z: number };
  yawDeg: number;
  pitchDeg: number;
  fovDeg: number;
};

export type ImageValidation = {
  valid: boolean;
  reasons: string[];
};

export type ReviewerResult = {
  preferred: "A" | "B" | "tie";
  designPreferred: "A" | "B" | "tie";
  objectiveMetBy: "A" | "B" | "both" | "neither";
  blockingDefectIn: "A" | "B" | "both" | "neither";
  /** Absolute placement judgment for the preferred version; "arbitrary" defers instead of accepting. */
  compositionLogic: "legible" | "arbitrary" | "unclear";
  confidence: number;
  reason: string;
};

export type WorkOrderInput = {
  unit: ReviewUnitState;
  definition: ReviewUnitDefinition;
  primaryScreenshot: string;
  contextScreenshot: string;
  conceptImage?: string;
  /** Plan crop of the unit's zone (compiled layout with facade modules), when available. */
  planImage?: string;
  /** Path to the generated site brief (frontages, bays, exemptions, neighbours, authored-mode schema). */
  siteBriefPath?: string;
  /** Bones-level defect: the work order demands a composition brief before any edit. */
  compositionRequired?: boolean;
  objective: string;
  risk: TaskRisk;
  ownershipPaths: string[];
  permittedPaths: string[];
  checks: string[];
  priorRejectedTactic?: string;
  sharedCause?: string;
  sharedEvidence?: Array<{
    unitId: string;
    defect: string;
    primaryScreenshot: string;
  }>;
};

const RATING_PRIORITY: Readonly<Record<Rating, number>> = Object.freeze({
  unrated: 0,
  red: 1,
  yellow: 2,
  green: 3,
});

const PROTECTED_TOP_LEVEL_KEYS = Object.freeze([
  "global_dimensions",
  "traversal_surfaces",
  "tactical_lanes",
  "explicit_connectivity",
  "authored_spawns",
  "constraints",
  "composition_rules",
  "lanes",
  "connectivity",
]);

const PROTECTED_FILE_PATTERNS = Object.freeze([
  /^apps\/client\/src\/runtime\/sim\//,
  /^apps\/client\/src\/runtime\/enemies\/TacticalGraph(?:\.test)?\.ts$/,
  /^apps\/client\/src\/runtime\/enemies\/enemyLineOfSight\.ts$/,
  /^apps\/client\/src\/runtime\/game\/Game\.ts$/,
  /^apps\/client\/src\/runtime\/bootstrap\.ts$/,
  /^apps\/client\/src\/global\.d\.ts$/,
  /^apps\/client\/scripts\/map-polish-capture\.mjs$/,
  /^scripts\/(?:map-polish\.ts|lib\/mapPolish\.ts)$/,
  /^\.claude\/skills\/map-polish\/SKILL\.md$/,
]);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: unknown, maxLength: number): string {
  if (!nonEmptyString(value)) return "";
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  const prefix = normalized.slice(0, maxLength - 1);
  const boundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, boundary >= Math.floor(maxLength * 0.65) ? boundary : maxLength - 1).trimEnd()}…`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, places = 4): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function stableUnitId(zoneId: string): string {
  return `unit-${zoneId.toLowerCase().replace(/_/g, "-")}`;
}

function centerOf(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function normalizedDirection(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) return null;
  return { x: dx / length, y: dy / length };
}

function elevationAt(surface: TraversalSurface | undefined, point: { x: number; y: number }): number {
  if (!surface) return 0;
  if (surface.kind === "flat") return surface.elevationM ?? 0;
  const axis = surface.axis ?? "y";
  const span = axis === "x" ? surface.rect.w : surface.rect.h;
  const offset = axis === "x" ? point.x - surface.rect.x : point.y - surface.rect.y;
  const ratio = span <= 0 ? 0 : clamp01(offset / span);
  const start = surface.startElevationM ?? 0;
  const end = surface.endElevationM ?? start;
  return start + (end - start) * ratio;
}

function makeCamera(
  zone: MapZone,
  surface: TraversalSurface | undefined,
  direction: { x: number; y: number },
  reverse: boolean,
): CameraPose {
  const center = centerOf(zone.rect);
  const sign = reverse ? 1 : -1;
  const margin = Math.min(1.25, Math.max(0.25, Math.min(zone.rect.w, zone.rect.h) * 0.12));
  const maxDistanceX = Math.max(0, zone.rect.w / 2 - margin);
  const maxDistanceY = Math.max(0, zone.rect.h / 2 - margin);
  const directionalLimit = Math.min(
    Math.abs(direction.x) <= 1e-6 ? Number.POSITIVE_INFINITY : maxDistanceX / Math.abs(direction.x),
    Math.abs(direction.y) <= 1e-6 ? Number.POSITIVE_INFINITY : maxDistanceY / Math.abs(direction.y),
  );
  const desiredDistance = Math.max(0.2, Math.min(2, Math.min(zone.rect.w, zone.rect.h) * 0.22));
  const cameraDistance = Math.max(0, Math.min(desiredDistance, directionalLimit));
  const position2d = {
    x: center.x + direction.x * cameraDistance * sign,
    y: center.y + direction.y * cameraDistance * sign,
  };
  const lookDistance = Math.max(2, Math.min(6, Math.max(zone.rect.w, zone.rect.h) * 0.45));
  const lookAt2d = {
    x: center.x - direction.x * lookDistance * sign,
    y: center.y - direction.y * lookDistance * sign,
  };
  const floor = elevationAt(surface, position2d);
  const targetFloor = elevationAt(surface, {
    x: Math.max(zone.rect.x, Math.min(zone.rect.x + zone.rect.w, lookAt2d.x)),
    y: Math.max(zone.rect.y, Math.min(zone.rect.y + zone.rect.h, lookAt2d.y)),
  });
  const worldDx = lookAt2d.x - position2d.x;
  const worldDz = lookAt2d.y - position2d.y;
  const yawDeg = Math.atan2(-worldDx, -worldDz) * (180 / Math.PI);
  return {
    designPosition: { x: round(position2d.x), y: round(position2d.y), z: round(floor + 1.7) },
    designLookAt: { x: round(lookAt2d.x), y: round(lookAt2d.y), z: round(targetFloor + 1.65) },
    playerPosition: { x: round(position2d.x), y: round(floor), z: round(position2d.y) },
    yawDeg: round(yawDeg),
    fovDeg: 75,
  };
}

function directionForZone(spec: MapSpec, zone: MapZone, zonesById: Map<string, MapZone>): { x: number; y: number } {
  const edges = [...(Array.isArray(spec.explicit_connectivity) ? spec.explicit_connectivity : [])]
    .sort((left, right) => (
      `${left.fromZoneId}:${left.toZoneId}`.localeCompare(`${right.fromZoneId}:${right.toZoneId}`)
    ));
  const incoming = edges.find((edge) => edge.toZoneId === zone.id);
  const outgoing = edges.find((edge) => edge.fromZoneId === zone.id);
  const center = centerOf(zone.rect);
  const incomingCenter = incoming ? zonesById.get(incoming.fromZoneId) : undefined;
  const outgoingCenter = outgoing ? zonesById.get(outgoing.toZoneId) : undefined;
  const candidates = [
    incomingCenter && outgoingCenter
      ? normalizedDirection(centerOf(incomingCenter.rect), centerOf(outgoingCenter.rect))
      : null,
    outgoingCenter ? normalizedDirection(center, centerOf(outgoingCenter.rect)) : null,
    incomingCenter ? normalizedDirection(centerOf(incomingCenter.rect), center) : null,
    zone.rect.h >= zone.rect.w ? { x: 0, y: 1 } : { x: 1, y: 0 },
  ];
  return candidates.find((candidate): candidate is { x: number; y: number } => candidate !== null) ?? { x: 0, y: 1 };
}

export function validateMapSpec(value: unknown): MapSpec {
  if (!isRecord(value) || !Array.isArray(value.zones) || value.zones.length === 0) {
    throw new Error("map_spec.json must contain a non-empty zones array");
  }
  const ids = new Set<string>();
  for (const [index, rawZone] of value.zones.entries()) {
    if (!isRecord(rawZone) || !nonEmptyString(rawZone.id) || !nonEmptyString(rawZone.type)) {
      throw new Error(`zones[${index}] must contain string id and type`);
    }
    if (!nonEmptyString(rawZone.label) || !isRecord(rawZone.rect)) {
      throw new Error(`zones[${index}] must contain label and rect`);
    }
    if ([rawZone.rect.x, rawZone.rect.y, rawZone.rect.w, rawZone.rect.h].some((entry) => !finiteNumber(entry))) {
      throw new Error(`zones[${index}].rect must contain finite x, y, w, h`);
    }
    if ((rawZone.rect.w as number) <= 0 || (rawZone.rect.h as number) <= 0) {
      throw new Error(`zones[${index}].rect dimensions must be positive`);
    }
    const zoneId = rawZone.id.trim();
    if (rawZone.id !== zoneId) {
      throw new Error(`zones[${index}].id must not contain surrounding whitespace`);
    }
    if (ids.has(zoneId)) throw new Error(`duplicate authored zone '${zoneId}'`);
    ids.add(zoneId);
  }

  const overrides = value.map_polish_survey_camera_overrides;
  if (typeof overrides !== "undefined") {
    validateSurveyCameraOverrides(overrides, ids);
  }
  return value as MapSpec;
}

function validateExactKeys(value: JsonRecord, allowedKeys: ReadonlySet<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new Error(`${label}.${key} is not an allowed property`);
  }
}

function validateCameraPoint(value: unknown, label: string): asserts value is CameraPose["designPosition"] {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  validateExactKeys(value, new Set(["x", "y", "z"]), label);
  if (![value.x, value.y, value.z].every(finiteNumber)) {
    throw new Error(`${label} must contain finite x, y, z`);
  }
}

function validateSurveyCamera(value: unknown, label: string): asserts value is CameraPose {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  validateExactKeys(
    value,
    new Set(["designPosition", "designLookAt", "playerPosition", "yawDeg", "fovDeg"]),
    label,
  );
  validateCameraPoint(value.designPosition, `${label}.designPosition`);
  validateCameraPoint(value.designLookAt, `${label}.designLookAt`);
  validateCameraPoint(value.playerPosition, `${label}.playerPosition`);
  if (!finiteNumber(value.yawDeg)) throw new Error(`${label}.yawDeg must be finite`);
  if (!finiteNumber(value.fovDeg) || value.fovDeg <= 0 || value.fovDeg >= 180) {
    throw new Error(`${label}.fovDeg must be finite, > 0, and < 180`);
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
    throw new Error(`${label}.designPosition must be the 1.7m player-eye position for playerPosition`);
  }
  const lookDx = value.designLookAt.x - value.designPosition.x;
  const lookDy = value.designLookAt.y - value.designPosition.y;
  if (Math.hypot(lookDx, lookDy) <= 1e-6) {
    throw new Error(`${label}.designLookAt must differ from designPosition in the horizontal plane`);
  }
  const expectedYawDeg = Math.atan2(-lookDx, -lookDy) * (180 / Math.PI);
  let yawDeltaDeg = Math.abs(value.yawDeg - expectedYawDeg) % 360;
  if (yawDeltaDeg > 180) yawDeltaDeg = 360 - yawDeltaDeg;
  if (yawDeltaDeg > MAP_POLISH_CAMERA_YAW_TOLERANCE_DEG) {
    throw new Error(`${label}.yawDeg must align with designPosition and designLookAt`);
  }
}

function validateSurveyCameraOverrides(value: unknown, zoneIds: ReadonlySet<string>): void {
  if (!isRecord(value)) {
    throw new Error("map_polish_survey_camera_overrides must be an object when provided");
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new Error("map_polish_survey_camera_overrides must contain at least one zone override");
  }

  const seenZoneIds = new Set<string>();
  for (const [rawZoneId, views] of entries) {
    const zoneId = rawZoneId.trim();
    if (seenZoneIds.has(zoneId)) {
      throw new Error(`duplicate map polish survey camera override for zone '${zoneId}'`);
    }
    seenZoneIds.add(zoneId);
    if (!nonEmptyString(rawZoneId) || rawZoneId !== zoneId) {
      throw new Error(`map_polish_survey_camera_overrides zone id '${rawZoneId}' must be non-empty without surrounding whitespace`);
    }
    if (!zoneIds.has(zoneId)) {
      throw new Error(`unknown map polish survey camera override zone '${zoneId}'`);
    }
    if (!isRecord(views)) {
      throw new Error(`map_polish_survey_camera_overrides.${zoneId} must be an object`);
    }
    validateExactKeys(
      views,
      new Set<ViewName>(["primary", "context"]),
      `map_polish_survey_camera_overrides.${zoneId}`,
    );
    const viewEntries = Object.entries(views);
    if (viewEntries.length === 0) {
      throw new Error(`map_polish_survey_camera_overrides.${zoneId} must define primary or context`);
    }
    for (const [viewName, camera] of viewEntries) {
      validateSurveyCamera(
        camera,
        `map_polish_survey_camera_overrides.${zoneId}.${viewName}`,
      );
    }
  }
}

export function deriveReviewUnits(specInput: MapSpec): ReviewUnitDefinition[] {
  const spec = validateMapSpec(specInput);
  const zones = [...spec.zones].sort((left, right) => left.id.localeCompare(right.id));
  const zonesById = new Map(zones.map((zone) => [zone.id, zone]));
  const surfacesByZone = new Map(
    (spec.traversal_surfaces ?? []).map((surface) => [surface.zoneId, surface]),
  );
  return zones.map((zone) => {
    const direction = directionForZone(spec, zone, zonesById);
    const surface = surfacesByZone.get(zone.id);
    const generated = {
      primary: makeCamera(zone, surface, direction, false),
      context: makeCamera(zone, surface, direction, true),
    };
    const override = spec.map_polish_survey_camera_overrides?.[zone.id];
    return {
      id: stableUnitId(zone.id),
      zoneIds: [zone.id],
      label: zone.label,
      zoneType: zone.type,
      macroLane: zone.macroLane ?? null,
      views: {
        primary: override?.primary ?? generated.primary,
        context: override?.context ?? generated.context,
      },
    };
  });
}

export function hashMapAuthority(source: string | Buffer): string {
  return createHash("sha256").update(source).digest("hex");
}

function canonicalSurveyCamera(camera: CameraPose): CameraPose {
  const point = (value: CameraPose["designPosition"]) => ({
    x: value.x,
    y: value.y,
    z: value.z,
  });
  return {
    designPosition: point(camera.designPosition),
    designLookAt: point(camera.designLookAt),
    playerPosition: point(camera.playerPosition),
    yawDeg: camera.yawDeg,
    fovDeg: camera.fovDeg,
  };
}

function canonicalSurveyCameraOverrides(
  overrides: MapSpec["map_polish_survey_camera_overrides"],
): Record<string, Partial<Record<ViewName, CameraPose>>> | null {
  if (!overrides) return null;
  return Object.fromEntries(
    Object.entries(overrides)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([zoneId, views]) => [zoneId, {
        ...(views.primary ? { primary: canonicalSurveyCamera(views.primary) } : {}),
        ...(views.context ? { context: canonicalSurveyCamera(views.context) } : {}),
      }]),
  );
}

function canonicalRect(rect: Rect): Rect {
  return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}

function canonicalTraversalSurface(surface: TraversalSurface): JsonRecord {
  const raw = surface as unknown as JsonRecord;
  return {
    id: surface.id,
    zoneId: surface.zoneId,
    kind: surface.kind,
    rect: canonicalRect(surface.rect),
    ...(Object.hasOwn(raw, "elevationM") ? { elevationM: raw.elevationM } : {}),
    ...(Object.hasOwn(raw, "axis") ? { axis: raw.axis } : {}),
    ...(Object.hasOwn(raw, "startElevationM") ? { startElevationM: raw.startElevationM } : {}),
    ...(Object.hasOwn(raw, "endElevationM") ? { endElevationM: raw.endElevationM } : {}),
    ...(Object.hasOwn(raw, "visual_style") ? { visual_style: raw.visual_style } : {}),
    ...(Object.hasOwn(raw, "step_count") ? { step_count: raw.step_count } : {}),
  };
}

function canonicalConnectivityEdge(edge: ConnectivityEdge): JsonRecord {
  const raw = edge as unknown as JsonRecord;
  return {
    fromZoneId: edge.fromZoneId,
    toZoneId: edge.toZoneId,
    ...(Object.hasOwn(raw, "transitionSurfaceId")
      ? { transitionSurfaceId: raw.transitionSurfaceId }
      : {}),
    ...(Object.hasOwn(raw, "cost") ? { cost: raw.cost } : {}),
  };
}

export function hashSurveyAuthority(specInput: MapSpec): string {
  const spec = validateMapSpec(specInput);
  const cameraAuthority = {
    zones: [...spec.zones].sort((left, right) => left.id.localeCompare(right.id)).map((zone) => ({
      id: zone.id,
      type: zone.type,
      label: zone.label,
      rect: canonicalRect(zone.rect),
      surfaceId: zone.surfaceId ?? null,
      districtId: zone.districtId ?? null,
      macroLane: zone.macroLane ?? null,
    })),
    traversalSurfaces: [...(spec.traversal_surfaces ?? [])]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((surface) => canonicalTraversalSurface(surface)),
    explicitConnectivity: [...(spec.explicit_connectivity ?? [])]
      .sort((left, right) => `${left.fromZoneId}:${left.toZoneId}`.localeCompare(`${right.fromZoneId}:${right.toZoneId}`))
      .map((edge) => canonicalConnectivityEdge(edge)),
    overrides: canonicalSurveyCameraOverrides(spec.map_polish_survey_camera_overrides),
  };
  return hashMapAuthority(JSON.stringify(cameraAuthority));
}

function blankUnit(definition: ReviewUnitDefinition): ReviewUnitState {
  return {
    id: definition.id,
    zoneIds: [...definition.zoneIds],
    rating: "unrated",
    confidence: 0,
    defects: [],
    evidence: { primary: null, context: null },
    lastAttemptedPass: null,
    acceptedChanges: 0,
    rejectedTactics: [],
  };
}

export function createInitialState(spec: MapSpec, mapAuthorityHash: string): MapPolishState {
  return {
    schemaVersion: MAP_POLISH_SCHEMA_VERSION,
    mapAuthorityHash,
    surveyedAuthorityHash: null,
    sourceFingerprint: null,
    pass: 0,
    surveyRequired: true,
    milestone: { acceptedAtLastRun: 0, required: false, full: false },
    activeTask: null,
    units: deriveReviewUnits(spec).map(blankUnit),
  };
}

function parseAttempt(value: unknown, label: string, errors: string[]): LastAttemptedPass | null {
  if (value === null) return null;
  if (!isRecord(value)) {
    errors.push(`${label} must be null or an object`);
    return null;
  }
  if (!Number.isInteger(value.pass) || (value.pass as number) < 1) errors.push(`${label}.pass must be a positive integer`);
  if (!Number.isInteger(value.attempts) || (value.attempts as number) < 1 || (value.attempts as number) > 2) {
    errors.push(`${label}.attempts must be 1 or 2`);
  }
  if (typeof value.accepted !== "boolean") errors.push(`${label}.accepted must be boolean`);
  return {
    pass: Number(value.pass),
    attempts: Number(value.attempts),
    accepted: value.accepted === true,
  };
}

function parseEvidence(value: unknown, label: string, errors: string[]): UnitEvidence {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return { primary: null, context: null };
  }
  const parsePath = (candidate: unknown, pathLabel: string): string | null => {
    if (candidate === null) return null;
    if (!nonEmptyString(candidate)) {
      errors.push(`${pathLabel} must be null or a non-empty string`);
      return null;
    }
    return candidate;
  };
  return {
    primary: parsePath(value.primary, `${label}.primary`),
    context: parsePath(value.context, `${label}.context`),
  };
}

function parseActiveTask(value: unknown, errors: string[]): ActiveTask | null {
  if (value === null) return null;
  if (!isRecord(value)) {
    errors.push("activeTask must be null or an object");
    return null;
  }
  const statuses: ActiveTaskStatus[] = ["awaiting-writer", "awaiting-review", "awaiting-human", "blocked"];
  const risks: TaskRisk[] = ["pure", "shared", "route-adjacent"];
  for (const key of ["id", "unitId", "startCommit", "artifactDir", "workOrder", "objective"] as const) {
    if (!nonEmptyString(value[key])) errors.push(`activeTask.${key} must be a non-empty string`);
  }
  if (!statuses.includes(value.status as ActiveTaskStatus)) errors.push("activeTask.status is invalid");
  if (!risks.includes(value.risk as TaskRisk)) errors.push("activeTask.risk is invalid");
  if (!Number.isInteger(value.attempt) || (value.attempt as number) < 1 || (value.attempt as number) > 2) {
    errors.push("activeTask.attempt must be 1 or 2");
  }
  const touchedFiles = Array.isArray(value.touchedFiles)
    ? value.touchedFiles.filter(nonEmptyString).slice(0, 32)
    : [];
  if (!Array.isArray(value.touchedFiles) || touchedFiles.length !== value.touchedFiles.length) {
    errors.push("activeTask.touchedFiles must contain at most 32 non-empty strings");
  }
  const proposed = value.proposedOutcome;
  if (proposed !== undefined && !["accept", "reject", "defer"].includes(String(proposed))) {
    errors.push("activeTask.proposedOutcome is invalid");
  }
  const blindAfterLabel = value.blindAfterLabel;
  if (blindAfterLabel !== undefined && blindAfterLabel !== "A" && blindAfterLabel !== "B") {
    errors.push("activeTask.blindAfterLabel is invalid");
  }
  if (value.movementConfirmationRequired !== undefined && typeof value.movementConfirmationRequired !== "boolean") {
    errors.push("activeTask.movementConfirmationRequired must be boolean when present");
  }
  if (
    value.artifactEvidenceHash !== undefined
    && (typeof value.artifactEvidenceHash !== "string" || !/^[0-9a-f]{64}$/.test(value.artifactEvidenceHash))
  ) {
    errors.push("activeTask.artifactEvidenceHash must be a SHA-256 hash when present");
  }
  return {
    id: String(value.id),
    unitId: String(value.unitId),
    status: value.status as ActiveTaskStatus,
    startCommit: String(value.startCommit),
    artifactDir: String(value.artifactDir),
    workOrder: String(value.workOrder),
    objective: normalizeText(value.objective, 260),
    attempt: Number(value.attempt),
    risk: value.risk as TaskRisk,
    touchedFiles,
    ...(nonEmptyString(value.greenRegressionUnitId)
      ? { greenRegressionUnitId: value.greenRegressionUnitId }
      : {}),
    ...(proposed === "accept" || proposed === "reject" || proposed === "defer"
      ? { proposedOutcome: proposed }
      : {}),
    ...(blindAfterLabel === "A" || blindAfterLabel === "B" ? { blindAfterLabel } : {}),
    ...(value.movementConfirmationRequired === true ? { movementConfirmationRequired: true } : {}),
    ...(typeof value.artifactEvidenceHash === "string" && /^[0-9a-f]{64}$/.test(value.artifactEvidenceHash)
      ? { artifactEvidenceHash: value.artifactEvidenceHash }
      : {}),
  };
}

export function validateState(value: unknown): MapPolishState {
  const errors: string[] = [];
  if (!isRecord(value)) throw new Error("map polish state must be an object");
  if (value.schemaVersion !== MAP_POLISH_SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${MAP_POLISH_SCHEMA_VERSION}`);
  }
  if (!nonEmptyString(value.mapAuthorityHash)) errors.push("mapAuthorityHash must be a non-empty string");
  if (value.surveyedAuthorityHash !== null && !nonEmptyString(value.surveyedAuthorityHash)) {
    errors.push("surveyedAuthorityHash must be null or a non-empty string");
  }
  if (value.sourceFingerprint !== null && !nonEmptyString(value.sourceFingerprint)) {
    errors.push("sourceFingerprint must be null or a non-empty string");
  }
  if (!Number.isInteger(value.pass) || (value.pass as number) < 0) errors.push("pass must be a non-negative integer");
  if (typeof value.surveyRequired !== "boolean") errors.push("surveyRequired must be boolean");
  if (value.surveyRequired === false && value.sourceFingerprint === null) {
    errors.push("sourceFingerprint is required after survey completion");
  }
  if (!isRecord(value.milestone)) {
    errors.push("milestone must be an object");
  } else {
    if (!Number.isInteger(value.milestone.acceptedAtLastRun) || (value.milestone.acceptedAtLastRun as number) < 0) {
      errors.push("milestone.acceptedAtLastRun must be a non-negative integer");
    }
    if (typeof value.milestone.required !== "boolean") errors.push("milestone.required must be boolean");
    if (typeof value.milestone.full !== "boolean") errors.push("milestone.full must be boolean");
  }
  const activeTask = parseActiveTask(value.activeTask, errors);
  if (!Array.isArray(value.units)) errors.push("units must be an array");
  const unitIds = new Set<string>();
  const units: ReviewUnitState[] = [];
  for (const [index, raw] of (Array.isArray(value.units) ? value.units : []).entries()) {
    const label = `units[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (!nonEmptyString(raw.id)) errors.push(`${label}.id must be a non-empty string`);
    if (nonEmptyString(raw.id) && unitIds.has(raw.id)) errors.push(`duplicate unit id '${raw.id}'`);
    if (nonEmptyString(raw.id)) unitIds.add(raw.id);
    const rawZoneIds = Array.isArray(raw.zoneIds) ? raw.zoneIds : [];
    const zoneIds = rawZoneIds.filter(nonEmptyString);
    if (zoneIds.length === 0 || zoneIds.length !== rawZoneIds.length) {
      errors.push(`${label}.zoneIds must contain non-empty strings`);
    }
    if (!(Object.keys(RATING_PRIORITY) as Rating[]).includes(raw.rating as Rating)) {
      errors.push(`${label}.rating is invalid`);
    }
    if (!finiteNumber(raw.confidence) || raw.confidence < 0 || raw.confidence > 1) {
      errors.push(`${label}.confidence must be between 0 and 1`);
    }
    const rawDefects = Array.isArray(raw.defects) ? raw.defects : [];
    const defects = rawDefects.filter(nonEmptyString);
    if (defects.length > MAX_DEFECTS || defects.length !== rawDefects.length) {
      errors.push(`${label}.defects must contain at most ${MAX_DEFECTS} strings`);
    }
    const rawRejectedTactics = Array.isArray(raw.rejectedTactics) ? raw.rejectedTactics : [];
    const rejectedTactics = rawRejectedTactics.filter(nonEmptyString);
    if (rejectedTactics.length > MAX_REJECTED_TACTICS || rejectedTactics.length !== rawRejectedTactics.length) {
      errors.push(`${label}.rejectedTactics must contain at most ${MAX_REJECTED_TACTICS} strings`);
    }
    if (!Number.isInteger(raw.acceptedChanges) || (raw.acceptedChanges as number) < 0) {
      errors.push(`${label}.acceptedChanges must be a non-negative integer`);
    }
    if (raw.deferredReason !== undefined && !nonEmptyString(raw.deferredReason)) {
      errors.push(`${label}.deferredReason must be a non-empty string when present`);
    }
    if (raw.nextAction !== undefined && !nonEmptyString(raw.nextAction)) {
      errors.push(`${label}.nextAction must be a non-empty string when present`);
    }
    units.push({
      id: String(raw.id),
      zoneIds,
      rating: raw.rating as Rating,
      confidence: Number(raw.confidence),
      defects: defects.slice(0, MAX_DEFECTS),
      evidence: parseEvidence(raw.evidence, `${label}.evidence`, errors),
      lastAttemptedPass: parseAttempt(raw.lastAttemptedPass, `${label}.lastAttemptedPass`, errors),
      acceptedChanges: Number(raw.acceptedChanges),
      rejectedTactics: rejectedTactics.slice(0, MAX_REJECTED_TACTICS),
      ...(nonEmptyString(raw.deferredReason) ? { deferredReason: raw.deferredReason } : {}),
      ...(nonEmptyString(raw.nextAction) ? { nextAction: raw.nextAction } : {}),
    });
  }
  if (activeTask && !unitIds.has(activeTask.unitId)) errors.push("activeTask references an unknown unit");
  if (errors.length > 0) throw new Error(`invalid map polish state: ${errors.join(" | ")}`);
  return {
    schemaVersion: MAP_POLISH_SCHEMA_VERSION,
    mapAuthorityHash: String(value.mapAuthorityHash),
    surveyedAuthorityHash: value.surveyedAuthorityHash === null ? null : String(value.surveyedAuthorityHash),
    sourceFingerprint: value.sourceFingerprint === null ? null : String(value.sourceFingerprint),
    pass: Number(value.pass),
    surveyRequired: value.surveyRequired === true,
    milestone: {
      acceptedAtLastRun: Number((value.milestone as JsonRecord).acceptedAtLastRun),
      required: (value.milestone as JsonRecord).required === true,
      full: (value.milestone as JsonRecord).full === true,
    },
    activeTask,
    units: units.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function pruneState(stateInput: MapPolishState): MapPolishState {
  const state = structuredClone(stateInput);
  state.units = state.units
    .map((unit) => ({
      id: unit.id,
      zoneIds: [...new Set(unit.zoneIds)].sort(),
      rating: unit.rating,
      confidence: round(clamp01(unit.confidence), 3),
      defects: unit.defects.map((entry) => normalizeText(entry, 180)).filter(Boolean).slice(0, MAX_DEFECTS),
      evidence: {
        primary: unit.evidence.primary,
        context: unit.evidence.context,
      },
      lastAttemptedPass: unit.lastAttemptedPass
        ? {
            pass: unit.lastAttemptedPass.pass,
            attempts: Math.min(2, unit.lastAttemptedPass.attempts),
            accepted: unit.lastAttemptedPass.accepted,
          }
        : null,
      acceptedChanges: Math.max(0, Math.floor(unit.acceptedChanges)),
      rejectedTactics: unit.rejectedTactics
        .map((entry) => normalizeText(entry, 180))
        .filter(Boolean)
        .slice(-MAX_REJECTED_TACTICS),
      ...(normalizeText(unit.deferredReason, 220)
        ? { deferredReason: normalizeText(unit.deferredReason, 220) }
        : {}),
      ...(normalizeText(unit.nextAction, 220)
        ? { nextAction: normalizeText(unit.nextAction, 220) }
        : {}),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (state.activeTask) {
    state.activeTask.touchedFiles = [...new Set(state.activeTask.touchedFiles)].sort().slice(0, 32);
  }
  return validateState(state);
}

export function syncStateWithSpec(
  stateInput: MapPolishState,
  spec: MapSpec,
  mapAuthorityHash: string,
): MapPolishState {
  const state = pruneState(stateInput);
  // A candidate may itself have changed survey authority. Preserve its recovery
  // record against the starting authority until it is explicitly accepted or
  // restored; silently resynchronizing here would orphan the candidate patch.
  if (state.activeTask && state.mapAuthorityHash !== mapAuthorityHash) return state;
  const definitions = deriveReviewUnits(spec);
  const previous = new Map(state.units.map((unit) => [unit.id, unit]));
  const units = definitions.map((definition) => {
    const existing = previous.get(definition.id);
    if (!existing) return blankUnit(definition);
    return { ...existing, zoneIds: [...definition.zoneIds] };
  });
  const authorityChanged = state.mapAuthorityHash !== mapAuthorityHash;
  return pruneState({
    ...state,
    mapAuthorityHash,
    surveyedAuthorityHash: authorityChanged ? null : state.surveyedAuthorityHash,
    surveyRequired: authorityChanged || state.surveyRequired,
    activeTask: authorityChanged ? null : state.activeTask,
    units: units.map((unit) => {
      if (!authorityChanged) return unit;
      const reset: ReviewUnitState = {
        ...unit,
        rating: "unrated",
        confidence: 0,
        defects: [],
        evidence: { primary: null, context: null },
      };
      delete reset.deferredReason;
      return reset;
    }),
  });
}

export function syncStateWithSourceFingerprint(
  stateInput: MapPolishState,
  sourceFingerprint: string,
): MapPolishState {
  if (!nonEmptyString(sourceFingerprint)) throw new Error("source fingerprint must be a non-empty string");
  const state = pruneState(stateInput);
  if (
    state.sourceFingerprint === null
    || state.sourceFingerprint === sourceFingerprint
    || state.activeTask
  ) {
    return state;
  }
  return pruneState({
    ...state,
    surveyedAuthorityHash: null,
    surveyRequired: true,
    units: state.units.map((unit) => {
      const reset: ReviewUnitState = {
        ...unit,
        rating: "unrated",
        confidence: 0,
        defects: [],
        evidence: { primary: null, context: null },
      };
      delete reset.deferredReason;
      return reset;
    }),
  });
}

export function buildSurveyBatches<T>(units: readonly T[], batchSize = SURVEY_BATCH_SIZE): T[][] {
  if (!Number.isInteger(batchSize) || batchSize < 6 || batchSize > 8) {
    throw new Error("survey batch size must be between 6 and 8");
  }
  if (units.length === 0) return [];
  const batchCount = Math.max(1, Math.ceil(units.length / batchSize));
  const baseSize = Math.floor(units.length / batchCount);
  const largerBatchCount = units.length % batchCount;
  const batches: T[][] = [];
  let offset = 0;
  for (let index = 0; index < batchCount; index += 1) {
    const size = baseSize + (index < largerBatchCount ? 1 : 0);
    batches.push(units.slice(offset, offset + size));
    offset += size;
  }
  return batches;
}

export function applyRatings(
  stateInput: MapPolishState,
  ratings: readonly SurveyRating[],
  surveyedAuthorityHash: string,
  sourceFingerprint: string,
  evidenceByUnit: ReadonlyMap<string, UnitEvidence> = new Map(),
): MapPolishState {
  if (!nonEmptyString(sourceFingerprint)) throw new Error("source fingerprint must be a non-empty string");
  const state = pruneState(stateInput);
  const ratingById = new Map(ratings.map((rating) => [rating.unitId, rating]));
  const missing = state.units.filter((unit) => !ratingById.has(unit.id)).map((unit) => unit.id);
  const unknown = ratings.filter((rating) => !state.units.some((unit) => unit.id === rating.unitId)).map((rating) => rating.unitId);
  if (missing.length > 0 || unknown.length > 0 || ratingById.size !== ratings.length) {
    throw new Error(`survey ratings must cover every unit exactly once | missing=${missing.join(",") || "none"} | unknown=${unknown.join(",") || "none"}`);
  }
  const priorHadRed = state.units.some((unit) => unit.rating === "red");
  const nextPass = state.pass + 1;
  const units = state.units.map((unit) => {
    const rating = ratingById.get(unit.id);
    if (!rating || !["red", "yellow", "green"].includes(rating.rating)) {
      throw new Error(`invalid survey rating for '${unit.id}'`);
    }
    if (!finiteNumber(rating.confidence) || rating.confidence < 0 || rating.confidence > 1) {
      throw new Error(`survey confidence for '${unit.id}' must be between 0 and 1`);
    }
    if (
      !Array.isArray(rating.defects)
      || rating.defects.length > MAX_DEFECTS
      || rating.defects.some((defect) => !nonEmptyString(defect))
      || (rating.rating !== "green" && rating.defects.length === 0)
    ) {
      throw new Error(`survey defects for '${unit.id}' must contain ${rating.rating === "green" ? "zero to two" : "one or two"} visible defects`);
    }
    const evidence = evidenceByUnit.get(unit.id) ?? unit.evidence;
    const nextUnit: ReviewUnitState = {
      ...unit,
      rating: rating.rating,
      confidence: clamp01(rating.confidence),
      defects: rating.defects.map((defect) => normalizeText(defect, 180)).slice(0, MAX_DEFECTS),
      evidence,
    };
    delete nextUnit.deferredReason;
    return nextUnit;
  });
  const redEliminated = priorHadRed && !units.some((unit) => unit.rating === "red");
  const ownerReviewReady = !units.some((unit) => unit.rating === "red" || unit.rating === "yellow");
  return pruneState({
    ...state,
    surveyedAuthorityHash,
    sourceFingerprint,
    pass: nextPass,
    surveyRequired: false,
    activeTask: null,
    milestone: {
      ...state.milestone,
      required: state.milestone.required || redEliminated || ownerReviewReady,
      full: state.milestone.full || redEliminated || ownerReviewReady,
    },
    units,
  });
}

function attemptedPass(unit: ReviewUnitState): number {
  return unit.lastAttemptedPass?.pass ?? -1;
}

function eligibleInPass(unit: ReviewUnitState, pass: number): boolean {
  const attempt = unit.lastAttemptedPass;
  if (!attempt || attempt.pass !== pass) return true;
  if (attempt.accepted || attempt.attempts >= 2) return false;
  return unit.deferredReason === undefined && nonEmptyString(unit.nextAction);
}

export function selectNextUnit(
  stateInput: MapPolishState,
  options: { allowGreen?: boolean } = {},
): ReviewUnitState | null {
  const state = pruneState(stateInput);
  if (state.surveyRequired || state.surveyedAuthorityHash !== state.mapAuthorityHash) return null;
  const eligible = state.units.filter((unit) => eligibleInPass(unit, state.pass));
  const candidatePool = options.allowGreen === true
    ? eligible
    : eligible.filter((unit) => unit.rating !== "green");
  return [...candidatePool].sort((left, right) => {
    const ratingDelta = RATING_PRIORITY[left.rating] - RATING_PRIORITY[right.rating];
    if (ratingDelta !== 0) return ratingDelta;
    const attemptedDelta = attemptedPass(left) - attemptedPass(right);
    if (attemptedDelta !== 0) return attemptedDelta;
    const acceptedDelta = left.acceptedChanges - right.acceptedChanges;
    if (acceptedDelta !== 0) return acceptedDelta;
    return left.id.localeCompare(right.id);
  })[0] ?? null;
}

export function mockSurveyRatings(units: readonly ReviewUnitState[]): SurveyRating[] {
  const ratings: Array<Exclude<Rating, "unrated">> = ["red", "yellow", "green"];
  return [...units].sort((left, right) => left.id.localeCompare(right.id)).map((unit) => {
    const bucket = createHash("sha256").update(unit.id).digest()[0] ?? 0;
    const rating = ratings[bucket % ratings.length] ?? "yellow";
    return {
      unitId: unit.id,
      rating,
      confidence: 0.8,
      defects: rating === "green" ? [] : [`[intent-hierarchy] Mock-visible ${rating} defect for workflow validation.`],
    };
  });
}

function cameraDrift(before: RuntimeCamera, after: RuntimeCamera): string[] {
  const reasons: string[] = [];
  const positionDelta = Math.hypot(
    after.pos.x - before.pos.x,
    after.pos.y - before.pos.y,
    after.pos.z - before.pos.z,
  );
  const angleDelta = (left: number, right: number): number => {
    let delta = Math.abs(left - right) % 360;
    if (delta > 180) delta = 360 - delta;
    return delta;
  };
  if (positionDelta > 0.02) reasons.push(`camera position drifted by ${positionDelta.toFixed(4)}m`);
  if (angleDelta(after.yawDeg, before.yawDeg) > 0.25) reasons.push("camera yaw drifted");
  if (Math.abs(after.pitchDeg - before.pitchDeg) > 0.25) reasons.push("camera pitch drifted");
  if (Math.abs(after.fovDeg - before.fovDeg) > 0.05) reasons.push("camera FOV drifted");
  return reasons;
}

export function validateImagePair(input: ImagePairInput): ImageValidation {
  const reasons: string[] = [];
  if (input.before.corrupt || input.after.corrupt) reasons.push("capture is corrupt");
  if (input.before.width !== input.after.width || input.before.height !== input.after.height) {
    reasons.push("image dimensions differ");
  }
  if (input.before.sha256 === input.after.sha256) reasons.push("primary images are identical");
  if (
    input.meanAbsoluteDelta < EFFECTIVE_MEAN_DELTA_THRESHOLD
    && input.changedPixelRatio < EFFECTIVE_CHANGED_PIXEL_THRESHOLD
  ) {
    reasons.push("primary images are effectively unchanged");
  }
  if (input.before.skyOnly || input.after.skyOnly) reasons.push("capture is sky-only");
  if ((input.before.runtimeErrors ?? 0) > 0 || (input.after.runtimeErrors ?? 0) > 0) {
    reasons.push("runtime errors invalidate the comparison");
  }
  if (input.before.zoneId !== input.expectedZoneId || input.after.zoneId !== input.expectedZoneId) {
    reasons.push("wrong review unit was captured");
  }
  if (!input.before.camera || !input.after.camera) {
    reasons.push("camera evidence is missing");
  } else {
    reasons.push(...cameraDrift(input.before.camera, input.after.camera));
  }
  if (!input.relevantSourceChanged) reasons.push("no relevant source file changed");
  return { valid: reasons.length === 0, reasons };
}

export async function validateImageComparison(
  input: ImagePairInput,
  reviewer: () => Promise<ReviewerResult>,
): Promise<{ validation: ImageValidation; review: ReviewerResult | null }> {
  const validation = validateImagePair(input);
  if (!validation.valid) return { validation, review: null };
  return { validation, review: await reviewer() };
}

function hasProjectedContent(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : isRecord(value) && Object.keys(value).length > 0;
}

/**
 * Projects only the named (protected) fields out of a nested structure. Empty
 * containers are pruned at every level: a nested array or object that carries
 * no protected field must not leak its shape or length into the projection,
 * otherwise a purely visual edit (for example an authored facade layout that
 * adds `columns`/`bays` arrays) reads as a protected-authority change.
 */
function projectNamedFields(value: unknown, names: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => projectNamedFields(entry, names))
      .filter((entry) => hasProjectedContent(entry));
  }
  if (!isRecord(value)) return undefined;
  const projected: JsonRecord = {};
  for (const [key, entry] of Object.entries(value)) {
    if (names.has(key)) {
      projected[key] = entry;
      continue;
    }
    const child = projectNamedFields(entry, names);
    if (hasProjectedContent(child)) projected[key] = child;
  }
  return projected;
}

export function protectedDomainProjection(specInput: MapSpec): JsonRecord {
  const spec = validateMapSpec(specInput);
  const projection: JsonRecord = {};
  for (const key of PROTECTED_TOP_LEVEL_KEYS) projection[key] = spec[key] ?? null;
  projection.zones = spec.zones.map((zone) => ({
    id: zone.id,
    type: zone.type,
    rect: zone.rect,
    surfaceId: zone.surfaceId ?? null,
    districtId: zone.districtId ?? null,
    macroLane: zone.macroLane ?? null,
    clearWidthM: zone.clearWidthM ?? null,
  }));
  const dimensionalNames = new Set([
    "doorWidthM",
    "doorHeightM",
    "openingWidthM",
    "openingHeightM",
    "collisionOpening",
  ]);
  projection.wallDoorwayDimensions = projectNamedFields(spec.wall_details ?? null, dimensionalNames);
  projection.frontageCollisionOpenings = projectNamedFields(spec.frontages ?? null, dimensionalNames);
  projection.facadeModuleOpenings = (Array.isArray(spec.facade_modules) ? spec.facade_modules : [])
    .filter((entry) => isRecord(entry) && (entry.openingType !== undefined || entry.collisionOpening !== undefined))
    .map((entry) => ({
      id: entry.id,
      openingType: entry.openingType,
      dimensionsM: entry.dimensionsM,
      collisionOpening: entry.collisionOpening,
    }));
  const registry = Array.isArray(spec.asset_registry) ? spec.asset_registry : [];
  const collidingAssetIds = new Set(
    registry
      .filter((entry) => isRecord(entry) && entry.collisionClass !== "none")
      .map((entry) => String((entry as JsonRecord).id)),
  );
  projection.collidingAssetAuthority = registry
    .filter((entry) => isRecord(entry) && collidingAssetIds.has(String(entry.id)))
    .map((entry) => ({
      id: entry.id,
      collisionClass: entry.collisionClass,
      dimensionsM: entry.dimensionsM,
      runtimeId: isRecord(entry.runtime) ? entry.runtime.id : null,
    }));
  const placements = Array.isArray(spec.dressing_placements) ? spec.dressing_placements : [];
  projection.collidingDressingPlacements = placements
    .filter((entry) => isRecord(entry) && collidingAssetIds.has(String(entry.assetId)))
    .map((entry) => ({
      id: entry.id,
      assetId: entry.assetId,
      anchorIds: entry.anchorIds,
      offsetM: entry.offsetM,
      scale: entry.scale,
      yawOffsetDeg: entry.yawOffsetDeg,
    }));
  const anchors = Array.isArray(spec.anchors) ? spec.anchors : [];
  projection.gameplayCoverAnchors = anchors
    .filter((entry) => isRecord(entry) && ["cover_cluster", "spawn_cover"].includes(String(entry.type)))
    .map((entry) => entry);
  return projection;
}

export function detectProtectedChanges(
  baseSpec: MapSpec,
  currentSpec: MapSpec,
  touchedFiles: readonly string[],
): string[] {
  const reasons = touchedFiles
    .filter((file) => PROTECTED_FILE_PATTERNS.some((pattern) => pattern.test(file)))
    .map((file) => `protected gameplay file changed: ${file}`);
  const base = JSON.stringify(protectedDomainProjection(baseSpec));
  const current = JSON.stringify(protectedDomainProjection(currentSpec));
  if (base !== current) reasons.push("protected map authority changed");
  return reasons;
}

export function isRelevantMapSource(file: string): boolean {
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)) return false;
  return file === "docs/map-design/specs/map_spec.json"
    || /^apps\/client\/src\/runtime\/(map|render)\//.test(file)
    || /^apps\/client\/src\/runtime\/(bootstrap|game\/Game)\.ts$/.test(file)
    || /^apps\/client\/public\/assets\/(models|textures)\//.test(file)
    // Facade composition grammar and its generator decide where every opening
    // sits; they are map-visual sources reachable by shared composition tasks.
    || file === "apps/client/scripts/lib/facade-layout-grammar.mjs"
    || file === "apps/client/scripts/gen-map-runtime.mjs";
}

export function modeUsesExternalModel(mode: RunMode): boolean {
  return mode === "real";
}

/** Bones-level Red defects: the unit needs composing (openings placed, frontage layout authored), not polishing. */
export function compositionRequiredForUnit(unit: ReviewUnitState): boolean {
  if (unit.rating !== "red") return false;
  const text = unit.defects.join(" ");
  return /\[(?:intent-hierarchy|order-and-variation)\]/.test(text)
    && /blank|bare|featureless|blockout|unarticulated|no readable|without a readable|no (?:focal|hero|purpose)|dead end|arbitrary|random|corner|hug|jammed|symmetr|align|axis|no legible|placeholder|massing/i.test(text);
}

export function inferTaskRisk(unit: ReviewUnitState): TaskRisk {
  const text = unit.defects.join(" ").toLowerCase();
  if (/\b(shared|shader|material family|facade emitter|renderer)\b/.test(text)) return "shared";
  // Composing a frontage changes frontage geometry (openings, recesses, arches);
  // the workflow validates that with one focused traversal, so suggest it up front
  // instead of letting a pure attempt be rejected after the writer call.
  if (compositionRequiredForUnit(unit)) return "route-adjacent";
  const routeSubject = "(?:lane|path|passage|route|circulation|connector|doorway|opening)";
  const routeProblem = "(?:crowd(?:s|ed)?|narrow(?:s|ed)?|pinch(?:es|ed)?|block(?:s|ed|ing)?|obstruct(?:s|ed|ion)?|protrud(?:es|ed|ing)?)";
  if (
    /\b(placement|clearance|collision|route geometry|walking envelope|walkable envelope|path width)\b/.test(text)
    || new RegExp(`\\b${routeProblem}\\b.*\\b${routeSubject}\\b|\\b${routeSubject}\\b.*\\b${routeProblem}\\b`).test(text)
    || /\b(?:crate|barrel|stall|prop|geometry)\b.*\b(?:misplaced|floating|in the way)\b|\b(?:misplaced|floating)\b.*\b(?:crate|barrel|stall|prop|geometry)\b/.test(text)
    || new RegExp(`\\b(?:crate|barrel|stall|prop|geometry)\\b.*\\b(?:sits|stands|lies)\\b.*\\b${routeSubject}\\b`).test(text)
    || /\b(?:canopy|awning|cloth)\b.*\b(?:too low|low over|blocks? headroom)\b/.test(text)
  ) {
    return "route-adjacent";
  }
  return "pure";
}

export function requiredChecks(risk: TaskRisk, unit: ReviewUnitDefinition): string[] {
  const checks = [
    "Protected-domain diff check",
    "pnpm --filter @clawd-strike/client typecheck",
    "Exact same-camera recapture",
    "Runtime console-error check",
    "Image-pair validity check",
    "One short blind Codex comparison",
  ];
  if (risk === "shared") {
    checks.push("One focused shared-mechanism test", "One Green regression view");
  }
  if (risk === "route-adjacent") {
    checks.push(
      "Existing relevant clearance validation",
      `Focused props-on route: ${focusedRouteForUnit(unit)}`,
      "Passing focused agent traversal is movement-clearance evidence",
    );
  }
  return checks;
}

export function focusedRouteForUnit(unit: ReviewUnitDefinition): string {
  const zone = unit.zoneIds[0] ?? "";
  if (zone.includes("WEST_MID")) return "west-mid-main-to-west";
  if (zone.includes("EAST_MID")) return "east-mid-east-to-main";
  if (zone.includes("WEST_UPPER")) return "west-upper-main-to-west";
  if (zone.includes("EAST_UPPER")) return "east-upper-main-to-east";
  if (zone.startsWith("TEA_")) return "terrace-ramp-to-stairs";
  if (unit.macroLane === "west") return "west-a-to-b";
  if (unit.macroLane === "east") return "east-a-to-b";
  return "main-a-to-b";
}

export function conceptAllowed(unit: ReviewUnitState): boolean {
  if (unit.rating !== "red") return false;
  const text = unit.defects.join(" ").toLowerCase();
  if (/\b(uv|normal|shader|grounding|emitter ownership|misplaced geometry|material correction)\b/.test(text)) {
    return false;
  }
  return true;
}

type SpecFrontage = JsonRecord & {
  id: string;
  zoneId: string;
  face: string;
  start?: number;
  end?: number;
  facadeProfileId?: string;
  massingProfileId?: string;
  layoutIntent?: JsonRecord;
};

function specList<T extends JsonRecord>(spec: MapSpec, key: string): T[] {
  const value = spec[key];
  return Array.isArray(value) ? value.filter((entry): entry is T => isRecord(entry)) : [];
}

function frontageLengthM(frontage: SpecFrontage, zone: MapZone): number {
  const span = (frontage.end ?? 1) - (frontage.start ?? 0);
  return (frontage.face === "west" || frontage.face === "east" ? zone.rect.h : zone.rect.w) * span;
}

function metres(value: number): string {
  return `${value.toFixed(2)}m`;
}

/**
 * The site brief is the plan-level information a designer works from and a
 * player-eye screenshot cannot give: which walls belong to the unit, what each
 * currently carries and where, which faces are sealed and why, what the unit
 * connects to, and how a composed (authored) frontage is written. It is a
 * separate file so the work order stays short.
 */
export function buildSiteBrief(spec: MapSpec, definition: ReviewUnitDefinition, unit: ReviewUnitState): string {
  const zoneById = new Map(spec.zones.map((zone) => [zone.id, zone]));
  const frontages = specList<SpecFrontage>(spec, "frontages");
  const exemptions = specList<JsonRecord & { zoneId: string; face: string; reason: string; note?: string }>(spec, "frontage_exemptions");
  const profiles = new Map(specList<JsonRecord & { id: string; family?: string; moduleIds?: string[] }>(spec, "facade_profiles").map((profile) => [profile.id, profile]));
  const massings = new Map(specList<JsonRecord & { id: string; heightM?: number; depthM?: number }>(spec, "massing_profiles").map((massing) => [massing.id, massing]));
  const modules = specList<JsonRecord & { id: string; kind?: string; dimensionsM?: { width?: number; height?: number } }>(spec, "facade_modules");
  const edges = Array.isArray(spec.explicit_connectivity) ? spec.explicit_connectivity : [];
  const lines: string[] = [
    `# Site brief: ${definition.id}`,
    "",
    "Plan-level facts for composing this unit. Distances along a frontage are measured from its start (west/east faces: from the south end; north/south faces: from the west end). +y is north.",
    "",
  ];
  for (const zoneId of definition.zoneIds) {
    const zone = zoneById.get(zoneId);
    if (!zone) continue;
    lines.push(
      `## Zone ${zone.id} — ${zone.label}`,
      `- type ${zone.type}${zone.districtId ? `, district ${zone.districtId}` : ""}${zone.macroLane ? `, macro lane ${zone.macroLane}` : ""}${typeof zone.clearWidthM === "number" ? `, clear width ${metres(zone.clearWidthM)}` : ""}`,
      `- rect x ${zone.rect.x} y ${zone.rect.y} w ${zone.rect.w} h ${zone.rect.h} (centre ${(zone.rect.x + zone.rect.w / 2).toFixed(2)}, ${(zone.rect.y + zone.rect.h / 2).toFixed(2)})`,
    );
    const connected = edges
      .filter((edge) => edge.fromZoneId === zone.id || edge.toZoneId === zone.id)
      .map((edge) => (edge.fromZoneId === zone.id ? `→ ${edge.toZoneId}` : `← ${edge.fromZoneId}`));
    if (connected.length > 0) lines.push(`- connects ${[...new Set(connected)].join(", ")}`);
    const zoneFrontages = frontages.filter((frontage) => frontage.zoneId === zone.id);
    const zoneExemptions = exemptions.filter((exemption) => exemption.zoneId === zone.id);
    lines.push("", "### Frontages (walls this unit can compose)");
    if (zoneFrontages.length === 0) lines.push("- none authored: every face is exempt (see below); adding a frontage is a massing decision for the owner");
    for (const frontage of zoneFrontages) {
      const profile = frontage.facadeProfileId ? profiles.get(frontage.facadeProfileId) : undefined;
      const massing = frontage.massingProfileId ? massings.get(frontage.massingProfileId) : undefined;
      const intent = isRecord(frontage.layoutIntent) ? frontage.layoutIntent : {};
      const lengthM = frontageLengthM(frontage, zone);
      lines.push(
        `- ${frontage.id}: ${frontage.face} face, span ${(frontage.start ?? 0).toFixed(3)}–${(frontage.end ?? 1).toFixed(3)} = ${metres(lengthM)}, `
        + `profile ${frontage.facadeProfileId ?? "?"}${profile?.family ? ` (${profile.family})` : ""}, massing ${frontage.massingProfileId ?? "?"}`
        + `${typeof massing?.heightM === "number" ? ` ${metres(massing.heightM)} high` : ""}${typeof massing?.depthM === "number" ? ` ${metres(massing.depthM)} deep` : ""}`,
      );
      if (intent.mode === "authored") {
        lines.push(`  - layout: authored — ${String(intent.composition ?? "")}`);
        const bays = Array.isArray(intent.bays) ? intent.bays.filter(isRecord) : [];
        const columns = new Map((Array.isArray(intent.columns) ? intent.columns.filter(isRecord) : []).map((column) => [String(column.id), column]));
        for (const bay of bays) {
          const column = columns.get(String(bay.columnId));
          const along = typeof column?.along === "number" ? column.along : Number.NaN;
          lines.push(`  - bay ${String(bay.id)}: ${String(bay.moduleId)} on column ${String(bay.columnId)}${Number.isFinite(along) ? ` @ ${along.toFixed(3)} (${metres(along * lengthM)})` : ""}${typeof bay.story === "number" && bay.story > 0 ? `, story ${bay.story}` : ""}`);
        }
      } else {
        lines.push(`  - layout: generated (rhythm ${String(intent.rhythm ?? "?")}) — the grammar spreads modules evenly between 0.6m edge margins; switch to mode "authored" to place openings deliberately`);
        if (profile?.moduleIds) lines.push(`  - profile modules available: ${profile.moduleIds.join(", ")}`);
      }
    }
    if (zoneExemptions.length > 0) {
      lines.push("", "### Exempt faces (no frontage; blank unless dressed)");
      for (const exemption of zoneExemptions) {
        lines.push(`- ${exemption.face}: ${exemption.reason}${exemption.note ? ` — ${normalizeText(exemption.note, 140)}` : ""}`);
      }
    }
    // Alignment references: frontages of directly connected zones.
    const neighbourIds = [...new Set(edges
      .filter((edge) => edge.fromZoneId === zone.id || edge.toZoneId === zone.id)
      .map((edge) => (edge.fromZoneId === zone.id ? edge.toZoneId : edge.fromZoneId)))];
    const neighbourFrontages = frontages.filter((frontage) => neighbourIds.includes(frontage.zoneId));
    if (neighbourFrontages.length > 0) {
      lines.push("", "### Neighbouring frontages (alignment references)");
      for (const frontage of neighbourFrontages) {
        const intent = isRecord(frontage.layoutIntent) ? frontage.layoutIntent : {};
        lines.push(`- ${frontage.id} (${frontage.zoneId} ${frontage.face}): profile ${frontage.facadeProfileId ?? "?"}, layout ${String(intent.mode ?? "?")}`);
      }
    }
    lines.push("");
  }
  if (unit.defects.length > 0) {
    lines.push("## Current defects", ...unit.defects.map((defect) => `- ${defect}`), "");
  }
  const openingModules = modules
    .filter((module) => module.kind === "door" || module.kind === "shop_recess" || module.kind === "arch")
    .map((module) => `${module.id} (${module.kind}, ${metres(module.dimensionsM?.width ?? 0)} wide)`);
  lines.push(
    "## Composing a frontage (authored mode)",
    "Set the frontage's `layoutIntent` to authored form. Every bay hangs on a named column; mirrored pairs are declared and checked about `axisAlong` (default 0.5); `cornerTreatment` is `held` (no opening within 1.2m of a corner), `pilaster` (a column module within 0.9m of each end), or `open` (declared exception). `composition` is one sentence stating the ordering idea. The same physical validator as generated layouts still applies: 0.6m edge margins, one shared ground head, no overlaps, at least ceil(length/6) ground bays, parapet clearance.",
    "```json",
    "\"layoutIntent\": {",
    "  \"mode\": \"authored\",",
    "  \"composition\": \"Storage door on the lane axis facing the north entrance; mirrored blind niches; corners held as solid piers.\",",
    "  \"cornerTreatment\": \"held\",",
    "  \"columns\": [ { \"id\": \"AXIS\", \"along\": 0.5 }, { \"id\": \"L1\", \"along\": 0.28, \"mirrorOf\": \"R1\" }, { \"id\": \"R1\", \"along\": 0.72 } ],",
    "  \"bays\": [",
    "    { \"id\": \"GROUND_DOOR\", \"moduleId\": \"door_storage_heavy\", \"columnId\": \"AXIS\" },",
    "    { \"id\": \"GROUND_NICHE_L\", \"moduleId\": \"blind_niche\", \"columnId\": \"L1\" },",
    "    { \"id\": \"GROUND_NICHE_R\", \"moduleId\": \"blind_niche\", \"columnId\": \"R1\" },",
    "    { \"id\": \"STORY_1_WINDOW_L\", \"moduleId\": \"window_screened\", \"columnId\": \"L1\", \"story\": 1 }",
    "  ]",
    "}",
    "```",
    `Opening modules: ${openingModules.join("; ")}. Modules must belong to the frontage's facade profile.`,
    "",
  );
  return `${lines.join("\n")}\n`;
}

export function buildWorkOrder(input: WorkOrderInput): string {
  if (input.unit.defects.length === 0) throw new Error("a work order requires at least one visible defect");
  if (input.conceptImage && !conceptAllowed(input.unit)) {
    throw new Error("concept images are allowed only for Red direction/composition/identity/density problems");
  }
  const lines = [
    "# Codex map-polish work order",
    "",
    `Review unit: ${input.unit.id}`,
    `Zones: ${input.definition.zoneIds.join(", ")}`,
    `Primary screenshot: ${input.primaryScreenshot}`,
    `Context screenshot: ${input.contextScreenshot}`,
    ...(input.planImage ? [`Plan crop (compiled layout, north up, unit outlined): ${input.planImage}`] : []),
    ...(input.siteBriefPath ? [`Site brief (frontages, current bays, exempt faces, neighbours, authored-mode schema): ${input.siteBriefPath}`] : []),
    ...(input.conceptImage ? [`Advisory concept image: ${input.conceptImage}`] : []),
    "",
    `Objective: ${normalizeText(input.objective, 260)}`,
    `Task risk: ${input.risk}`,
    "",
    "Visible defects:",
    ...input.unit.defects.slice(0, MAX_DEFECTS).map((defect) => `- ${normalizeText(defect, 180)}`),
    ...(input.compositionRequired
      ? [
          "",
          "Composition brief (required before editing; the defect is bones-level, so this unit needs composing, not polishing):",
          "- From the plan and site brief, state the place's purpose, where players enter and look, the primary axis, and what each wall faces.",
          "- Decide where openings belong and why (on the axis, paired, held from corners, aligned to the opposite wall or entrance). Prefer authored layoutIntent for a frontage whose openings the player reads.",
          "- A profile, material, or rhythm swap alone does not resolve an intent or order defect; a wall without a door still needs a legible reason and articulation.",
          "- Put that reasoning in designRationale.",
        ]
      : []),
    ...(input.sharedCause
      ? [
          "",
          `Shared cause: ${normalizeText(input.sharedCause, 180)}`,
          "Corroborating weak evidence:",
          ...(input.sharedEvidence ?? []).slice(0, 2).map((entry) => (
            `- ${entry.unitId}: ${normalizeText(entry.defect, 160)} (${entry.primaryScreenshot})`
          )),
        ]
      : []),
    "",
    "Design review lens (judgment questions, not numeric style quotas):",
    ...DESIGN_REVIEW_LENS.map((criterion) => `- ${criterion}`),
    "",
    "Ownership trace:",
    ...input.ownershipPaths.slice(0, 6).map((file) => `- ${file}`),
    "",
    "Permitted source surfaces (hard boundary):",
    ...input.permittedPaths.slice(0, 6).map((file) => `- ${file}`),
    "- Do not run generators or validation commands; the workflow regenerates map/layout evidence and runs the required checks after your edit.",
    "- If the objective cannot be completed inside these source surfaces and task risk, return a concise blocker without editing.",
    "",
    "Protected gameplay constraints:",
    "- Do not change collision authority, spawns, route topology, traversal surfaces, gameplay cover, doorway dimensions, major sightlines, or tactical connectivity.",
    "- Keep the player walking envelope and opening clearances unchanged.",
    "",
    "Minimum required checks (the workflow runs these after your edit; do not duplicate them unless needed to diagnose your change):",
    ...input.checks.map((check) => `- ${check}`),
    "",
    "Definition of success:",
    "- The one objective is visibly improved in the exact primary/context recapture, with no relevant regression or protected-domain change.",
    "- Architectural order, causal variation, physical plausibility, hierarchy, and human-scale readability are preserved or improved.",
    ...(input.priorRejectedTactic
      ? ["", `Prior rejected tactic (do not repeat): ${normalizeText(input.priorRejectedTactic, 180)}`]
      : []),
    "",
    "Before editing, state the place's purpose, ordered architectural scaffold, and plausible cause of each exception; return it as designRationale. Optimize the whole primary/context pair, not one hero camera.",
    "",
    "Inspect only the relevant ownership surfaces, make one bounded implementation attempt, and stop.",
  ];
  const result = `${lines.join("\n")}\n`;
  const words = result.trim().split(/\s+/).length;
  if (words > 560) throw new Error(`work order exceeds 560 words (${words})`);
  return result;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const target = path.resolve(filePath);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

export async function readStateFile(filePath: string): Promise<MapPolishState> {
  return validateState(JSON.parse(await readFile(filePath, "utf8")) as unknown);
}

export async function writeStateFile(filePath: string, state: MapPolishState): Promise<void> {
  await writeJsonAtomic(filePath, pruneState(state));
}

async function gitOutput(repoRoot: string, args: readonly string[]): Promise<string> {
  const result = await execFile("git", ["-C", repoRoot, ...args], { maxBuffer: 20 * 1024 * 1024 });
  return result.stdout;
}

export async function currentCommit(repoRoot: string): Promise<string> {
  return (await gitOutput(repoRoot, ["rev-parse", "HEAD"])).trim();
}

export async function currentBranch(repoRoot: string): Promise<string> {
  return (await gitOutput(repoRoot, ["branch", "--show-current"])).trim();
}

export async function collectTouchedFiles(repoRoot: string): Promise<string[]> {
  const [tracked, staged, untracked] = await Promise.all([
    gitOutput(repoRoot, ["diff", "--name-only", "--no-renames", "-z"]),
    gitOutput(repoRoot, ["diff", "--cached", "--name-only", "--no-renames", "-z"]),
    gitOutput(repoRoot, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  return [...new Set(`${tracked}${staged}${untracked}`.split("\0").filter(Boolean))].sort();
}

export async function assertAutomaticWorktree(
  repoRoot: string,
  allowedDirtyFiles: readonly string[] = [],
): Promise<{ branch: string; commit: string }> {
  const [branch, commit, touched] = await Promise.all([
    currentBranch(repoRoot),
    currentCommit(repoRoot),
    collectTouchedFiles(repoRoot),
  ]);
  if (!branch || branch === "main" || branch === "master") {
    throw new Error("automatic mode requires a checked-out dedicated working branch (not main/master)");
  }
  const allowed = new Set(allowedDirtyFiles);
  const unrelated = touched.filter((file) => !allowed.has(file));
  if (unrelated.length > 0) {
    throw new Error(`automatic mode refuses unrelated uncommitted changes: ${unrelated.join(", ")}`);
  }
  return { branch, commit };
}

async function fileAtCommit(repoRoot: string, commit: string, file: string): Promise<Buffer | null> {
  try {
    const result = await execFile("git", ["-C", repoRoot, "show", `${commit}:${file}`], {
      encoding: "buffer",
      maxBuffer: 100 * 1024 * 1024,
    });
    return result.stdout;
  } catch {
    return null;
  }
}

export async function restoreCandidateFiles(options: {
  repoRoot: string;
  startCommit: string;
  touchedFiles: readonly string[];
}): Promise<void> {
  const unique = [...new Set(options.touchedFiles)].sort();
  for (const file of unique) {
    if (path.isAbsolute(file) || file.split(/[\\/]/).includes("..")) {
      throw new Error(`unsafe candidate path '${file}'`);
    }
    const target = path.resolve(options.repoRoot, file);
    const relative = path.relative(path.resolve(options.repoRoot), target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`candidate path escapes repo: ${file}`);
    const original = await fileAtCommit(options.repoRoot, options.startCommit, file);
    const cached = (await gitOutput(options.repoRoot, ["ls-files", "--cached", "-z", "--", file])).length > 0;
    if (original === null) {
      if (await pathExists(target)) await rm(target, { force: true, recursive: true });
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.map-polish-restore-${process.pid}`;
      await writeFile(temporary, original);
      await rename(temporary, target);
    }
    // Normalize only this candidate path in the index as well, so a writer-side
    // `git add` cannot leave a rejected change staged.
    if (original !== null || cached) {
      await execFile("git", ["-C", options.repoRoot, "add", "-A", "--", file]);
    }
  }
}

export async function captureCandidatePatch(options: {
  repoRoot: string;
  startCommit: string;
  touchedFiles: readonly string[];
  outputPath: string;
}): Promise<void> {
  const tracked: string[] = [];
  const untracked: string[] = [];
  for (const file of [...new Set(options.touchedFiles)].sort()) {
    if (await fileAtCommit(options.repoRoot, options.startCommit, file)) tracked.push(file);
    else untracked.push(file);
  }
  let patch = "";
  if (tracked.length > 0) {
    patch += await gitOutput(options.repoRoot, ["diff", "--binary", "--no-ext-diff", options.startCommit, "--", ...tracked]);
  }
  for (const file of untracked) {
    const absolute = path.join(options.repoRoot, file);
    if (!(await pathExists(absolute))) continue;
    const details = await stat(absolute);
    if (!details.isFile()) continue;
    try {
      const result = await execFile("git", ["diff", "--binary", "--no-index", "--", "/dev/null", file], {
        cwd: options.repoRoot,
        maxBuffer: 100 * 1024 * 1024,
      });
      patch += result.stdout;
    } catch (error) {
      const diff = error as { code?: number; stdout?: string | Buffer };
      if (diff.code !== 1 || diff.stdout === undefined) throw error;
      patch += Buffer.isBuffer(diff.stdout) ? diff.stdout.toString("utf8") : diff.stdout;
    }
  }
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, patch, "utf8");
}

export async function cleanupRejectedArtifacts(artifactDir: string, keepDebug: boolean): Promise<void> {
  const resolved = path.resolve(artifactDir);
  if (!resolved.includes(`${path.sep}artifacts${path.sep}`) && !resolved.includes(`${path.sep}tmp${path.sep}`)) {
    throw new Error(`refusing to clean non-artifact directory '${resolved}'`);
  }
  if (keepDebug) {
    const removeTraces = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
        const candidate = path.join(directory, entry.name);
        if (entry.isDirectory()) await removeTraces(candidate);
        else if (entry.name === "trace.zip") await rm(candidate, { force: true });
      }
    };
    await removeTraces(resolved);
    const activeRoot = path.dirname(resolved);
    if (path.basename(activeRoot) === "active" && await pathExists(resolved)) {
      const debugRoot = path.join(path.dirname(activeRoot), "debug");
      const destination = path.join(debugRoot, path.basename(resolved));
      await mkdir(debugRoot, { recursive: true });
      await rm(destination, { recursive: true, force: true });
      await rename(resolved, destination);
    }
    return;
  }
  await rm(resolved, { recursive: true, force: true });
}

export function totalAcceptedChanges(state: MapPolishState): number {
  return state.units.reduce((sum, unit) => sum + unit.acceptedChanges, 0);
}

export function updateOutcome(
  stateInput: MapPolishState,
  options: {
    unitId: string;
    outcome: "accept" | "reject" | "defer";
    rejectedTactic?: string;
    deferredReason?: string;
    nextAction?: string;
    remainingDefect?: string;
    shared?: boolean;
  },
): MapPolishState {
  const state = pruneState(stateInput);
  const target = state.units.find((unit) => unit.id === options.unitId);
  if (!target) throw new Error(`unknown review unit '${options.unitId}'`);
  const prior = target.lastAttemptedPass?.pass === state.pass ? target.lastAttemptedPass : null;
  const attempts = Math.min(2, (prior?.attempts ?? 0) + 1);
  target.lastAttemptedPass = {
    pass: state.pass,
    attempts,
    accepted: options.outcome === "accept",
  };
  if (options.outcome === "accept") {
    target.acceptedChanges += 1;
    delete target.deferredReason;
    if (options.remainingDefect) target.nextAction = normalizeText(options.remainingDefect, 220);
  } else {
    if (options.rejectedTactic) {
      target.rejectedTactics = [...target.rejectedTactics, options.rejectedTactic].slice(-MAX_REJECTED_TACTICS);
    }
    const materiallyDifferent = nonEmptyString(options.nextAction) && nonEmptyString(options.deferredReason) === false;
    if (attempts >= 2 || options.outcome === "defer" || !materiallyDifferent) {
      target.deferredReason = normalizeText(
        options.deferredReason ?? (attempts >= 2 ? "Two attempts failed in this pass." : "No materially different hypothesis yet."),
        220,
      );
    } else {
      delete target.deferredReason;
    }
    const nextAction = normalizeText(options.nextAction, 220);
    if (nextAction) target.nextAction = nextAction;
  }
  const redUnits = state.units.filter((unit) => unit.rating === "red");
  const allRedsAttempted = redUnits.every((unit) => unit.lastAttemptedPass?.pass === state.pass);
  const redRetryPending = redUnits.some((unit) => (
    unit.lastAttemptedPass?.pass === state.pass
    && unit.lastAttemptedPass.accepted === false
    && unit.lastAttemptedPass.attempts < 2
    && unit.deferredReason === undefined
    && nonEmptyString(unit.nextAction)
  ));
  const totalAfter = totalAcceptedChanges(state);
  const weakUnitEligible = state.units.some((unit) => (
    (unit.rating === "red" || unit.rating === "yellow") && eligibleInPass(unit, state.pass)
  ));
  state.surveyRequired = redUnits.length > 0 && allRedsAttempted && !redRetryPending;
  state.milestone.required = state.milestone.required
    || (options.shared === true && options.outcome === "accept")
    || totalAfter - state.milestone.acceptedAtLastRun >= 5
    || state.surveyRequired
    || !weakUnitEligible;
  state.milestone.full = state.milestone.full
    || (options.shared === true && options.outcome === "accept")
    || state.surveyRequired
    || !weakUnitEligible;
  state.activeTask = null;
  return pruneState(state);
}

export async function readMapSpecFile(filePath: string): Promise<{ source: string; hash: string; spec: MapSpec }> {
  const source = await readFile(filePath, "utf8");
  const spec = validateMapSpec(JSON.parse(source) as unknown);
  return {
    source,
    hash: hashSurveyAuthority(spec),
    spec,
  };
}
