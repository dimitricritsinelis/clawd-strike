// Deterministic review units + player-eye camera poses for the Bazaar map, and
// the protected-gameplay projection of map_spec.json. Driven by scripts/map-shoot.ts.
import { createHash } from "node:crypto";

export const EFFECTIVE_MEAN_DELTA_THRESHOLD = 0.001;
export const EFFECTIVE_CHANGED_PIXEL_THRESHOLD = 0.002;
const MAP_POLISH_PLAYER_EYE_HEIGHT_M = 1.7;
const MAP_POLISH_CAMERA_POSITION_TOLERANCE_M = 0.02;
const MAP_POLISH_CAMERA_YAW_TOLERANCE_DEG = 0.35;
// Player-eye survey optics: 75° vertical FOV at the 1440×900 review viewport.
const SURVEY_VERTICAL_HALF_ANGLE_DEG = 37.5;
const SURVEY_VIEWPORT_ASPECT = 1440 / 900;
const SURVEY_HORIZONTAL_HALF_ANGLE_DEG =
  (Math.atan(Math.tan((SURVEY_VERTICAL_HALF_ANGLE_DEG * Math.PI) / 180) * SURVEY_VIEWPORT_ASPECT) * 180) / Math.PI;
// Elevation-view pose rules (ruleset v2).
const ELEV_WALL_CLEARANCE_M = 0.6;
const ELEV_MIN_STANDOFF_M = 2.5;
const ELEV_STANDOFF_HEIGHT_FACTOR = 1.3;
const ELEV_SEGMENT_WIDTH_FACTOR = 0.8;
const ELEV_MIN_FACE_LENGTH_M = 3;
const FULL_HEIGHT_FRAME_FRACTION = 0.8;
const CROSS_VIEW_ASPECT_MAX = 1.6;
const UPPER_VIEW_PITCH_DEG = 20;
const UPPER_VIEW_WALL_MIN_HEIGHT_M = 7;
const UPPER_VIEW_WALL_MAX_DISTANCE_M = 9;
const DEFAULT_WALL_HEIGHT_M = 7;
const OPEN_FACE_REASON = "open_traversal_face";
// Coverage sampling and thresholds (survey gate; see DEC-024).
const SURVEY_VIEW_CAP = 10;
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
const VIEW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;

export type WallFaceName = "west" | "east" | "north" | "south";

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
  map_polish_survey_camera_overrides?: Record<string, Record<string, CameraPose>>;
};

export type CameraPose = {
  designPosition: { x: number; y: number; z: number };
  designLookAt: { x: number; y: number; z: number };
  playerPosition: { x: number; y: number; z: number };
  yawDeg: number;
  /** Look elevation in degrees, positive up; absent means 0 (level). */
  pitchDeg?: number;
  fovDeg: number;
};

export type ReviewUnitView = {
  id: string;
  camera: CameraPose;
};

export type ReviewUnitDefinition = {
  id: string;
  zoneIds: string[];
  label: string;
  zoneType: string;
  macroLane: string | null;
  /** Ordered named views; primary and context are always the first two. */
  views: ReviewUnitView[];
};

/** Current evidence/baseline image per view id; primary and context always present. */
export type WallFaceDescriptor = {
  zoneId: string;
  face: WallFaceName;
  kind: "frontage" | "exemption";
  frontageId: string | null;
  /** Wall run in map coordinates; along +y for west/east faces, +x for north/south. */
  start: { x: number; y: number };
  end: { x: number; y: number };
  lengthM: number;
  heightM: number;
  /** Unit normal pointing into the zone. */
  inwardNormal: { x: number; y: number };
};


const PROTECTED_TOP_LEVEL_KEYS = Object.freeze([
  "global_dimensions",
  "map_center",
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
  /^apps\/client\/src\/runtime\/(?:combat|tuning)\//,
  /^apps\/client\/src\/runtime\/enemies\/TacticalGraph(?:\.test)?\.ts$/,
  /^apps\/client\/src\/runtime\/enemies\/enemyLineOfSight\.ts$/,
  /^apps\/client\/src\/runtime\/game\/Game\.ts$/,
  /^apps\/client\/src\/runtime\/bootstrap\.ts$/,
  /^apps\/client\/src\/global\.d\.ts$/,
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

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function yawTowards(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return round(radToDeg(Math.atan2(-(to.x - from.x), -(to.y - from.y))));
}

function cameraAt(
  surface: TraversalSurface | undefined,
  position: { x: number; y: number },
  target: { x: number; y: number },
  pitchDeg: number,
): CameraPose {
  const floor = elevationAt(surface, position);
  const eye = floor + MAP_POLISH_PLAYER_EYE_HEIGHT_M;
  const distance = Math.hypot(target.x - position.x, target.y - position.y);
  const lookZ = eye + distance * Math.tan(degToRad(pitchDeg));
  return {
    designPosition: { x: round(position.x), y: round(position.y), z: round(eye) },
    designLookAt: { x: round(target.x), y: round(target.y), z: round(lookZ) },
    playerPosition: { x: round(position.x), y: round(floor), z: round(position.y) },
    yawDeg: yawTowards(position, target),
    ...(pitchDeg !== 0 ? { pitchDeg: round(pitchDeg, 2) } : {}),
    fovDeg: 75,
  };
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

const WALL_FACES: readonly WallFaceName[] = Object.freeze(["west", "east", "north", "south"] as const);

function wallHeightDefault(spec: MapSpec): number {
  const global = spec.global_dimensions;
  const value = isRecord(global) ? global.wall_height_default : undefined;
  return finiteNumber(value) && value > 0 ? value : DEFAULT_WALL_HEIGHT_M;
}

function faceGeometry(zone: MapZone, face: WallFaceName, startFraction: number, endFraction: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
  inwardNormal: { x: number; y: number };
} {
  const rect = zone.rect;
  // Distances along a frontage: west/east faces run from the south end (+y),
  // north/south faces from the west end (+x); +y is north.
  if (face === "west" || face === "east") {
    const x = face === "west" ? rect.x : rect.x + rect.w;
    return {
      start: { x, y: rect.y + startFraction * rect.h },
      end: { x, y: rect.y + endFraction * rect.h },
      inwardNormal: { x: face === "west" ? 1 : -1, y: 0 },
    };
  }
  const y = face === "south" ? rect.y : rect.y + rect.h;
  return {
    start: { x: rect.x + startFraction * rect.w, y },
    end: { x: rect.x + endFraction * rect.w, y },
    inwardNormal: { x: 0, y: face === "south" ? 1 : -1 },
  };
}

/**
 * Every wall face of a zone that review evidence must show: authored frontages
 * with their massing height, plus exempt faces (they are walls the player sees
 * even when nothing composes them). Only `open_traversal_face` is skipped — it
 * is not a wall.
 */
export function deriveWallFaces(spec: MapSpec, zone: MapZone): WallFaceDescriptor[] {
  const defaultHeight = wallHeightDefault(spec);
  const massings = new Map(
    (Array.isArray(spec.massing_profiles) ? spec.massing_profiles : [])
      .filter(isRecord)
      .map((massing) => [String(massing.id), massing]),
  );
  const faces: WallFaceDescriptor[] = [];
  for (const frontage of (Array.isArray(spec.frontages) ? spec.frontages : []).filter(isRecord)) {
    if (frontage.zoneId !== zone.id || !WALL_FACES.includes(frontage.face as WallFaceName)) continue;
    const face = frontage.face as WallFaceName;
    const startFraction = finiteNumber(frontage.start) ? frontage.start : 0;
    const endFraction = finiteNumber(frontage.end) ? frontage.end : 1;
    const geometry = faceGeometry(zone, face, startFraction, endFraction);
    const massing = massings.get(String(frontage.massingProfileId));
    const heightM = finiteNumber(massing?.heightM) && (massing?.heightM as number) > 0
      ? massing?.heightM as number
      : defaultHeight;
    faces.push({
      zoneId: zone.id,
      face,
      kind: "frontage",
      frontageId: String(frontage.id),
      start: geometry.start,
      end: geometry.end,
      lengthM: Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y),
      heightM,
      inwardNormal: geometry.inwardNormal,
    });
  }
  for (const exemption of (Array.isArray(spec.frontage_exemptions) ? spec.frontage_exemptions : []).filter(isRecord)) {
    if (exemption.zoneId !== zone.id || !WALL_FACES.includes(exemption.face as WallFaceName)) continue;
    if (exemption.reason === OPEN_FACE_REASON) continue;
    const face = exemption.face as WallFaceName;
    const geometry = faceGeometry(zone, face, 0, 1);
    faces.push({
      zoneId: zone.id,
      face,
      kind: "exemption",
      frontageId: null,
      start: geometry.start,
      end: geometry.end,
      lengthM: Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y),
      heightM: defaultHeight,
      inwardNormal: geometry.inwardNormal,
    });
  }
  return faces.sort((left, right) => (
    (left.frontageId ?? `zzz:${left.face}`).localeCompare(right.frontageId ?? `zzz:${right.face}`)
  ));
}

function insetClamp(zone: MapZone, point: { x: number; y: number }): { x: number; y: number } {
  const rect = zone.rect;
  const clampAxis = (value: number, low: number, high: number): number => (
    low > high ? (low + high) / 2 : Math.max(low, Math.min(high, value))
  );
  return {
    x: clampAxis(point.x, rect.x + ELEV_WALL_CLEARANCE_M, rect.x + rect.w - ELEV_WALL_CLEARANCE_M),
    y: clampAxis(point.y, rect.y + ELEV_WALL_CLEARANCE_M, rect.y + rect.h - ELEV_WALL_CLEARANCE_M),
  };
}

function elevationStandoff(zone: MapZone, face: WallFaceDescriptor): number {
  const depth = face.face === "west" || face.face === "east" ? zone.rect.w : zone.rect.h;
  const ideal = Math.max(ELEV_MIN_STANDOFF_M, ELEV_STANDOFF_HEIGHT_FACTOR * (face.heightM - MAP_POLISH_PLAYER_EYE_HEIGHT_M));
  return Math.max(ELEV_WALL_CLEARANCE_M, Math.min(depth - ELEV_WALL_CLEARANCE_M, ideal));
}

function elevationPitchDeg(standoffM: number, heightM: number): number {
  const visibleTop = MAP_POLISH_PLAYER_EYE_HEIGHT_M
    + standoffM * Math.tan(degToRad(SURVEY_VERTICAL_HALF_ANGLE_DEG));
  if (visibleTop >= heightM) return 0;
  // Tilt so the wall top sits at ~90% of frame height: top-of-frame is
  // pitch+37.5°, the 90% line is pitch+30°.
  const wallTopAngle = radToDeg(Math.atan((heightM - MAP_POLISH_PLAYER_EYE_HEIGHT_M) / standoffM));
  return Math.min(60, Math.max(0, wallTopAngle - SURVEY_VERTICAL_HALF_ANGLE_DEG * FULL_HEIGHT_FRAME_FRACTION));
}

function elevationSegmentCount(lengthM: number, standoffM: number, widthFactor: number): number {
  const visibleWidth = 2 * standoffM * Math.tan(degToRad(SURVEY_HORIZONTAL_HALF_ANGLE_DEG));
  return Math.max(1, Math.ceil(lengthM / Math.max(1e-6, widthFactor * visibleWidth)));
}

function elevationViewsForFace(
  zone: MapZone,
  surface: TraversalSurface | undefined,
  face: WallFaceDescriptor,
  widthFactor: number,
): ReviewUnitView[] {
  const standoff = elevationStandoff(zone, face);
  const pitch = elevationPitchDeg(standoff, face.heightM);
  const segments = elevationSegmentCount(face.lengthM, standoff, widthFactor);
  const baseId = face.frontageId ? `elev:${face.frontageId}` : `elev:${face.face}`;
  const views: ReviewUnitView[] = [];
  for (let index = 0; index < segments; index += 1) {
    const fraction = (index + 0.5) / segments;
    const wallPoint = {
      x: face.start.x + (face.end.x - face.start.x) * fraction,
      y: face.start.y + (face.end.y - face.start.y) * fraction,
    };
    const position = insetClamp(zone, {
      x: wallPoint.x + face.inwardNormal.x * standoff,
      y: wallPoint.y + face.inwardNormal.y * standoff,
    });
    views.push({
      id: segments === 1 ? baseId : `${baseId}:${index + 1}`,
      camera: cameraAt(surface, position, wallPoint, pitch),
    });
  }
  return views;
}

function upperViewForZone(
  zone: MapZone,
  surface: TraversalSurface | undefined,
  direction: { x: number; y: number },
  walls: readonly WallFaceDescriptor[],
): ReviewUnitView | null {
  const center = insetClamp(zone, centerOf(zone.rect));
  const tallWithinReach = walls.some((wall) => {
    if (wall.heightM < UPPER_VIEW_WALL_MIN_HEIGHT_M) return false;
    const perpendicular = wall.face === "west" || wall.face === "east"
      ? Math.abs(center.x - wall.start.x)
      : Math.abs(center.y - wall.start.y);
    return perpendicular <= UPPER_VIEW_WALL_MAX_DISTANCE_M;
  });
  if (!tallWithinReach) return null;
  const lookDistance = Math.max(2, Math.min(6, Math.max(zone.rect.w, zone.rect.h) * 0.45));
  const target = {
    x: center.x + direction.x * lookDistance,
    y: center.y + direction.y * lookDistance,
  };
  return { id: "upper", camera: cameraAt(surface, center, target, UPPER_VIEW_PITCH_DEG) };
}

function deriveUnitViews(
  spec: MapSpec,
  zone: MapZone,
  surface: TraversalSurface | undefined,
  direction: { x: number; y: number },
): ReviewUnitView[] {
  const base: ReviewUnitView[] = [
    { id: "primary", camera: makeCamera(zone, surface, direction, false) },
    { id: "context", camera: makeCamera(zone, surface, direction, true) },
  ];
  const walls = deriveWallFaces(spec, zone).filter((wall) => wall.frontageId !== null || wall.lengthM >= ELEV_MIN_FACE_LENGTH_M);
  const aspect = Math.max(zone.rect.w, zone.rect.h) / Math.min(zone.rect.w, zone.rect.h);
  const cross: ReviewUnitView[] = aspect <= CROSS_VIEW_ASPECT_MAX
    ? [
        { id: "cross-a", camera: makeCamera(zone, surface, { x: -direction.y, y: direction.x }, false) },
        { id: "cross-b", camera: makeCamera(zone, surface, { x: -direction.y, y: direction.x }, true) },
      ]
    : [];
  const upper = upperViewForZone(zone, surface, direction, walls);
  // Wider segment budgets trade thumbnail framing for view count; escalate
  // deterministically before dropping the supplementary views.
  for (const widthFactor of [ELEV_SEGMENT_WIDTH_FACTOR, 1.0, 1.2, 1.4]) {
    const elev = walls.flatMap((wall) => elevationViewsForFace(zone, surface, wall, widthFactor));
    const views = [...base, ...elev, ...cross, ...(upper ? [upper] : [])];
    if (views.length <= SURVEY_VIEW_CAP) return views;
  }
  const elev = walls.flatMap((wall) => elevationViewsForFace(zone, surface, wall, 1.4));
  const withCross = [...base, ...elev, ...cross];
  if (withCross.length <= SURVEY_VIEW_CAP) return withCross;
  return [...base, ...elev];
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
    new Set(["designPosition", "designLookAt", "playerPosition", "yawDeg", "pitchDeg", "fovDeg"]),
    label,
  );
  validateCameraPoint(value.designPosition, `${label}.designPosition`);
  validateCameraPoint(value.designLookAt, `${label}.designLookAt`);
  validateCameraPoint(value.playerPosition, `${label}.playerPosition`);
  if (!finiteNumber(value.yawDeg)) throw new Error(`${label}.yawDeg must be finite`);
  if (value.pitchDeg !== undefined && (!finiteNumber(value.pitchDeg) || value.pitchDeg <= -90 || value.pitchDeg >= 90)) {
    throw new Error(`${label}.pitchDeg must be finite and between -90 and 90 when present`);
  }
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
    const viewEntries = Object.entries(views);
    if (viewEntries.length === 0) {
      throw new Error(`map_polish_survey_camera_overrides.${zoneId} must define at least one view override`);
    }
    for (const [viewId, camera] of viewEntries) {
      if (!VIEW_ID_PATTERN.test(viewId)) {
        throw new Error(`map_polish_survey_camera_overrides.${zoneId} view id '${viewId}' is invalid`);
      }
      validateSurveyCamera(
        camera,
        `map_polish_survey_camera_overrides.${zoneId}.${viewId}`,
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
    const override = spec.map_polish_survey_camera_overrides?.[zone.id];
    const views = deriveUnitViews(spec, zone, surface, direction).map((view) => ({
      id: view.id,
      camera: override?.[view.id] ?? view.camera,
    }));
    return {
      id: stableUnitId(zone.id),
      zoneIds: [zone.id],
      label: zone.label,
      zoneType: zone.type,
      macroLane: zone.macroLane ?? null,
      views,
    };
  });
}

export function hashMapAuthority(source: string | Buffer): string {
  return createHash("sha256").update(source).digest("hex");
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
  const clusters = (Array.isArray(spec.dressing_clusters) ? spec.dressing_clusters : []).filter(isRecord);
  const gameplayClusters = clusters.filter((entry) => entry.classification === "gameplay_cover");
  const gameplayAssetIds = new Set(gameplayClusters.flatMap((entry) => Array.isArray(entry.assetIds) ? entry.assetIds : []));
  const gameplayClusterIds = new Set(gameplayClusters.map((entry) => entry.id));
  projection.gameplayDressingClusters = gameplayClusters.map(({ id, zoneId, surfaceId, anchors, assetIds }) => ({
    id, zoneId, surfaceId, anchors, assetIds,
  }));
  const collidingAssetIds = new Set(
    registry
      // Compiled visual placements do not create colliders. Preserve gameplay-cover
      // dimensions, but allow soft_visual/overhead dressing to be composed freely.
      // Actual legacy-anchor and builder colliders are also compared by paired shoots.
      .filter((entry) => isRecord(entry) && gameplayAssetIds.has(String(entry.id)))
      .map((entry) => String((entry as JsonRecord).id)),
  );
  projection.collidingAssetAuthority = registry
    .filter((entry) => isRecord(entry) && collidingAssetIds.has(String(entry.id)))
    .map((entry) => ({
      id: entry.id,
      collisionClass: entry.collisionClass,
      dimensionsM: entry.dimensionsM,
      runtimeId: isRecord(entry.runtime) ? entry.runtime.id : null,
      transform: entry.transform,
    }));
  const placements = Array.isArray(spec.dressing_placements) ? spec.dressing_placements : [];
  projection.collidingDressingPlacements = placements
    .filter((entry) => isRecord(entry) && gameplayClusterIds.has(entry.clusterId))
    .map((entry) => ({
      id: entry.id,
      assetId: entry.assetId,
      clusterId: entry.clusterId,
      anchorIds: entry.anchorIds,
      offsetM: entry.offsetM,
      scale: entry.scale,
      yawOffsetDeg: entry.yawOffsetDeg,
    }));
  const anchors = Array.isArray(spec.anchors) ? spec.anchors : [];
  const classificationByAnchor = new Map(clusters.flatMap((entry) =>
    (Array.isArray(entry.anchors) ? entry.anchors : []).map((id) => [String(id), entry.classification] as const)));
  projection.gameplayAnchors = anchors.filter(isRecord)
    .filter((entry) => {
      // open_node affects the tactical graph; landmark's fountain collider ignores
      // cluster classification. Shop/hero anchors otherwise honor visual classes.
      if (["cover_cluster", "spawn_cover", "open_node", "landmark"].includes(String(entry.type))) return true;
      const classification = classificationByAnchor.get(String(entry.id));
      return ["shopfront_anchor", "hero_landmark"].includes(String(entry.type))
        && classification !== "soft_visual" && classification !== "overhead";
    })
    .map(({ notes: _notes, ...authority }) => authority);
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
  const base = protectedDomainProjection(baseSpec);
  const current = protectedDomainProjection(currentSpec);
  for (const key of Object.keys(base)) {
    if (JSON.stringify(base[key]) !== JSON.stringify(current[key])) reasons.push(`protected map authority changed: ${key}`);
  }
  return reasons;
}

export type CaptureEvidence = {
  valid: boolean;
  synthetic: boolean;
  protectedAuthorityHash: string;
  units: Array<{ id: string; views: Record<string, { valid: boolean }> }>;
};

export type FramePerformance = {
  drawCalls: number;
  triangles: number;
  medianFrameMs: number | null;
  measurement?: string;
};

export function hasFrameMeasurement(perf?: FramePerformance): perf is FramePerformance & { medianFrameMs: number } {
  return Boolean(perf && perf.measurement === "per-view-qa-frame"
    && [perf.drawCalls, perf.triangles, perf.medianFrameMs].every((value) =>
      typeof value === "number" && Number.isFinite(value) && value > 0));
}

/** Evidence checks are independent of the aesthetic decision to keep an edit. */
export function captureEvidenceErrors(current: CaptureEvidence, before?: CaptureEvidence): string[] {
  const reasons: string[] = [];
  for (const [label, capture] of [["current", current], ["before", before]] as const) {
    if (!capture) continue;
    if (capture.valid !== true || capture.synthetic !== false || !capture.protectedAuthorityHash
      || !capture.units.length || capture.units.some((unit) => !Object.keys(unit.views).length
        || Object.values(unit.views).some((view) => view.valid !== true))) {
      reasons.push(`${label} capture is invalid, synthetic, empty, or missing runtime collider evidence`);
    }
  }
  if (before) {
    if (current.protectedAuthorityHash !== before.protectedAuthorityHash) reasons.push("runtime colliders changed since before capture");
    const viewIds = (capture: CaptureEvidence) => capture.units.flatMap((unit) =>
      Object.keys(unit.views).map((view) => `${unit.id}/${view}`)).sort();
    if (JSON.stringify(viewIds(current)) !== JSON.stringify(viewIds(before))) reasons.push("before/after view sets differ");
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Authored placement guard. Free render-only GLBs (`authored_placements`) have
// no colliders, so any part the player could reach must hug a wall or sit
// overhead, and a base near the ground must touch it. The rule text is in
// .claude/skills/map-polish/SKILL.md step 4; map:check enforces it.
// ---------------------------------------------------------------------------
export const RELIEF_MAX_HEIGHT_M = 2.2;
export const WALL_BAND_M = 0.35;
const FLOAT_MAX_M = 0.5;
const CONTACT_TOLERANCE_M = 0.05;
const SINK_TOLERANCE_M = 0.1;
const SAMPLE_STEP_M = 0.1;
const EPSILON_M = 1e-6;

export type Bounds3 = { min: [number, number, number]; max: [number, number, number] };
export type AuthoredPlacement = {
  id: string;
  modelId: string;
  position: { x: number; y: number; z: number };
  yawDeg?: number;
  role?: string;
};
export type WallSegment = { orientation: "vertical" | "horizontal"; coord: number; start: number; end: number };

type Mat4 = number[]; // glTF column-major 4x4
type Vec3 = [number, number, number];
const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) out[col * 4 + row]! += a[k * 4 + row]! * b[col * 4 + k]!;
    }
  }
  return out;
}
function nodeMatrix(node: { matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }): Mat4 {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.map(Number);
  const [tx = 0, ty = 0, tz = 0] = node.translation ?? [];
  const [qx = 0, qy = 0, qz = 0, qw = 1] = node.rotation ?? [];
  const [sx = 1, sy = 1, sz = 1] = node.scale ?? [];
  const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return [
    m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
    m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
    m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
  ];
}
function extend(bounds: Bounds3 | null, p: Vec3): Bounds3 {
  if (!bounds) return { min: [p[0], p[1], p[2]], max: [p[0], p[1], p[2]] };
  for (let i = 0; i < 3; i += 1) {
    bounds.min[i] = Math.min(bounds.min[i]!, p[i]!);
    bounds.max[i] = Math.max(bounds.max[i]!, p[i]!);
  }
  return bounds;
}
function corners(b: Bounds3): Vec3[] {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]]);
}

/** Bounds of every POSITION accessor in a GLB with node transforms applied, in the file's own Y-up metres. Null when the file has no geometry. */
export function glbBounds(bytes: Buffer): Bounds3 | null {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error("GLB has no JSON chunk");
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")) as {
    nodes?: { children?: number[]; mesh?: number; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
    scenes?: { nodes?: number[] }[];
    scene?: number;
    meshes?: { primitives?: { attributes?: { POSITION?: number } }[] }[];
    accessors?: { min?: number[]; max?: number[] }[];
  };
  const nodes = gltf.nodes ?? [];
  const children = new Set(nodes.flatMap((node) => node.children ?? []));
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? nodes.map((_, index) => index).filter((index) => !children.has(index));
  let bounds: Bounds3 | null = null;
  const visit = (index: number, parent: Mat4, depth: number): void => {
    const node = nodes[index];
    if (!node || depth > 64) return;
    const world = multiply(parent, nodeMatrix(node));
    const mesh = typeof node.mesh === "number" ? gltf.meshes?.[node.mesh] : undefined;
    for (const primitive of mesh?.primitives ?? []) {
      const position = primitive.attributes?.POSITION;
      const accessor = typeof position === "number" ? gltf.accessors?.[position] : undefined;
      if (!accessor?.min || !accessor?.max || accessor.min.length < 3 || accessor.max.length < 3) continue;
      const local: Bounds3 = { min: [accessor.min[0]!, accessor.min[1]!, accessor.min[2]!], max: [accessor.max[0]!, accessor.max[1]!, accessor.max[2]!] };
      for (const corner of corners(local)) bounds = extend(bounds, transformPoint(world, corner));
    }
    for (const child of node.children ?? []) visit(child, world, depth + 1);
  };
  for (const root of roots) visit(root, IDENTITY, 0);
  return bounds;
}

/** Conservative bounds per rendered triangle, with node transforms applied.
 * Disconnected geometry must not turn the empty space between parts into solid cover.
 * Unsupported buffers fail closed; accessor min/max alone is not geometry evidence.
 */
export function glbTriangleBounds(bytes: Buffer, onVertex?: (vertex: Vec3) => void): Bounds3[] {
  if (bytes.length < 28 || bytes.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  const length = bytes.readUInt32LE(12);
  const g = JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
  if (bytes.readUInt32LE(20 + length + 4) !== 0x004e4942) throw new Error("GLB has no binary geometry chunk");
  const binary = bytes.subarray(28 + length);
  const read = (index: number, width: number): number[][] => {
    const a = g.accessors?.[index], v = g.bufferViews?.[a?.bufferView];
    if (!a || !v || a.sparse || a.normalized || v.extensions?.EXT_meshopt_compression || (width===3 && a.componentType!==5126) || (v.buffer ?? 0) !== 0) throw new Error("unsupported GLB geometry accessor");
    const size = ({5121:1,5123:2,5125:4,5126:4} as Record<number,number>)[a.componentType];
    if (!size || a.type !== (width === 3 ? "VEC3" : "SCALAR")) throw new Error("unsupported GLB geometry component");
    const stride = v.byteStride ?? width * size, offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    if (!Number.isInteger(a.count) || a.count < 0 || stride < width*size || offset < 0
      || offset + Math.max(0,a.count-1)*stride + (a.count ? width*size : 0) > binary.length) throw new Error("GLB geometry accessor outside binary buffer");
    return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>{
      const at=offset+i*stride+j*size;
      const value=a.componentType===5126?binary.readFloatLE(at):size===4?binary.readUInt32LE(at):size===2?binary.readUInt16LE(at):binary.readUInt8(at);
      if(!Number.isFinite(value))throw new Error("non-finite GLB geometry");
      return value;
    }));
  };
  const nodes=g.nodes??[], children=new Set<number>(nodes.flatMap((n: {children?:number[]})=>n.children??[]));
  const roots=g.scenes?.[g.scene??0]?.nodes??nodes.map((_:unknown,i:number)=>i).filter((i:number)=>!children.has(i));
  const result:Bounds3[]=[];
  const visit=(index:number,parent:Mat4,ancestors:Set<number>):void=>{
    if(ancestors.has(index)||ancestors.size>64||!nodes[index])throw new Error("invalid GLB node hierarchy");
    const node=nodes[index], world=multiply(parent,nodeMatrix(node));
    if(!world.every(Number.isFinite))throw new Error("non-finite GLB node transform");
    for(const p of g.meshes?.[node.mesh]?.primitives??[]){
      if((p.mode??4)!==4 || p.extensions?.KHR_draco_mesh_compression)throw new Error("unsupported GLB triangle encoding");
      const vertices=read(p.attributes.POSITION,3).map(v=>transformPoint(world,v as Vec3));
      const indices=p.indices===undefined?vertices.map((_:Vec3,i:number)=>i):read(p.indices,1).map(v=>v[0]!);
      if(indices.length%3)throw new Error("incomplete GLB triangle");
      for(let i=0;i<indices.length;i+=3){
        let bounds:Bounds3|null=null;
        for(const id of indices.slice(i,i+3)){
          if(!Number.isInteger(id)||!vertices[id])throw new Error("GLB triangle index outside vertices");
          bounds=extend(bounds,vertices[id]!);
          onVertex?.(vertices[id]!);
        }
        result.push(bounds!);
      }
    }
    for(const child of node.children??[])visit(child,world,new Set([...ancestors,index]));
  };
  for(const root of roots)visit(root,IDENTITY,new Set());
  return result;
}

/**
 * Placement bounds in design metres (x east, y north, z up), mirroring
 * buildAuthoredPlacements: world x = x, world y = z, world z = y, and the
 * model turns about the up axis by (yawDeg + 180) degrees.
 */
function placementDesignPoint([gx, gy, gz]: Vec3, placement: AuthoredPlacement): Vec3 {
  const theta = ((placement.yawDeg ?? 0) + 180) * Math.PI / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [placement.position.x + gx * cos + gz * sin,
    placement.position.y - gx * sin + gz * cos, placement.position.z + gy];
}

export function placementDesignBounds(local: Bounds3, placement: AuthoredPlacement): Bounds3 {
  let bounds: Bounds3 | null = null;
  for (const point of corners(local)) bounds = extend(bounds, placementDesignPoint(point, placement));
  return bounds!;
}

/** Boundary of the union of walkable rects: where the blockout stands a wall. A shared edge between two rects is an opening, not a wall. */
export function walkableBoundarySegments(rects: readonly Rect[]): WallSegment[] {
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
  const inside = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = (xs[i]! + xs[i + 1]!) / 2;
    const cy = (ys[j]! + ys[j + 1]!) / 2;
    return rects.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h);
  };
  const segments: WallSegment[] = [];
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      if (inside(i - 1, j) !== inside(i, j)) segments.push({ orientation: "vertical", coord: xs[i]!, start: ys[j]!, end: ys[j + 1]! });
    }
  }
  for (let j = 0; j < ys.length; j += 1) {
    for (let i = 0; i < xs.length - 1; i += 1) {
      if (inside(i, j - 1) !== inside(i, j)) segments.push({ orientation: "horizontal", coord: ys[j]!, start: xs[i]!, end: xs[i + 1]! });
    }
  }
  return segments;
}
function distanceToSegment(x: number, y: number, s: WallSegment): number {
  const [along, across] = s.orientation === "vertical" ? [y, x] : [x, y];
  return Math.hypot(across - s.coord, along - Math.min(Math.max(along, s.start), s.end));
}
function insideAny(rects: readonly Rect[], x: number, y: number): boolean {
  return rects.some((r) => x >= r.x - EPSILON_M && x <= r.x + r.w + EPSILON_M && y >= r.y - EPSILON_M && y <= r.y + r.h + EPSILON_M);
}
function groundAt(surfaces: readonly TraversalSurface[], x: number, y: number): { surface: TraversalSurface; elevationM: number } | null {
  const surface = surfaces.find((s) => insideAny([s.rect], x, y));
  if (!surface) return null;
  if (surface.kind === "ramp" && surface.axis) {
    const t = surface.axis === "x" ? (x - surface.rect.x) / surface.rect.w : (y - surface.rect.y) / surface.rect.h;
    const start = surface.startElevationM ?? 0;
    const end = surface.endElevationM ?? start;
    return { surface, elevationM: start + (end - start) * Math.min(1, Math.max(0, t)) };
  }
  return { surface, elevationM: surface.elevationM ?? 0 };
}
function samples(lo: number, hi: number): number[] {
  const out = [lo];
  for (let v = lo + SAMPLE_STEP_M; v < hi; v += SAMPLE_STEP_M) out.push(v);
  if (hi > lo) out.push(hi);
  return out;
}

/**
 * Reasons an authored placement breaks the render-only envelope: geometry
 * below RELIEF_MAX_HEIGHT_M must stay within WALL_BAND_M of a wall (the player
 * walks through anything else), and a base near the ground must touch it.
 */
export function authoredPlacementReasons(
  spec: MapSpec,
  boundsOf: (modelId: string) => Bounds3 | null,
  rects: readonly Rect[] = (spec.traversal_surfaces ?? []).map((s) => s.rect),
  segments: readonly WallSegment[] = walkableBoundarySegments(rects),
  geometryBoundsOf?: (modelId: string) => readonly Bounds3[],
  geometryVerticesOf?: (modelId: string) => readonly Vec3[],
): string[] {
  const reasons: string[] = [];
  const surfaces = spec.traversal_surfaces ?? [];
  for (const placement of (spec.authored_placements as AuthoredPlacement[] | undefined) ?? []) {
    const local = boundsOf(placement.modelId);
    if (!local) continue;
    const box = placementDesignBounds(local, placement);
    const label = `placement ${placement.id} (${placement.modelId})`;
    const vertices = geometryVerticesOf?.(placement.modelId);
    // Compare each actual vertex to the floor at that same coordinate. A
    // sloped base's global minimum does not lie at the bounding-box centre.
    const points: Vec3[] = vertices?.length ? vertices.map(v => placementDesignPoint(v, placement))
      : [[(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, box.min[2]]];
    let contact = { point: points[0]!, ground: groundAt(surfaces, points[0]![0], points[0]![1]), lift: Infinity };
    for (const point of points) {
      const ground = groundAt(surfaces, point[0], point[1]);
      const lift = point[2] - (ground?.elevationM ?? 0);
      if (lift < contact.lift) contact = { point, ground, lift };
    }
    const [cx, cy] = contact.point;
    const { ground, lift } = contact;
    const groundM = ground?.elevationM ?? 0;
    const where = `at x ${cx.toFixed(2)} y ${cy.toFixed(2)}`;
    const on = ground ? `${ground.surface.id} at ${groundM.toFixed(2)} m` : "no traversal surface, ground taken as 0 m";
    if (lift > CONTACT_TOLERANCE_M && lift <= FLOAT_MAX_M) {
      reasons.push(`${label} floats ${lift.toFixed(2)} m above the ground ${where} (${on}); author the origin at the base and set position.z to the surface elevation`);
    }
    if (lift < -SINK_TOLERANCE_M) reasons.push(`${label} sinks ${(-lift).toFixed(2)} m into the ground ${where} (${on})`);
    let worst: { x: number; y: number; distance: number } | null = null;
    const parts = geometryBoundsOf ? geometryBoundsOf(placement.modelId).map(b=>placementDesignBounds(b,placement)) : [box];
    for (const part of parts) {
      for (const rect of rects) {
        const x0=Math.max(part.min[0],rect.x), x1=Math.min(part.max[0],rect.x+rect.w);
        const y0=Math.max(part.min[1],rect.y), y1=Math.min(part.max[1],rect.y+rect.h);
        if(x0>x1 || y0>y1)continue;
        const highestGround=Math.max(...[[x0,y0],[x1,y1],[x0,y1],[x1,y0]].map(([x,y])=>groundAt(surfaces,x!,y!)?.elevationM??0));
        if(part.min[2]>=highestGround+RELIEF_MAX_HEIGHT_M)continue;
        for (const x of samples(x0,x1)) for (const y of samples(y0,y1)) {
          const distance=segments.reduce((best,s)=>Math.min(best,distanceToSegment(x,y,s)),Infinity);
          if(distance>WALL_BAND_M && (!worst||distance>worst.distance))worst={x,y,distance};
        }
      }
    }
    if (worst) {
      reasons.push(`${label} has geometry below ${RELIEF_MAX_HEIGHT_M} m standing ${worst.distance.toFixed(2)} m from the nearest wall at x ${worst.x.toFixed(2)} y ${worst.y.toFixed(2)}; render-only props stay within ${WALL_BAND_M} m of a wall or above ${RELIEF_MAX_HEIGHT_M} m, anything else needs a collider through the spec`);
    }
  }
  return reasons;
}
