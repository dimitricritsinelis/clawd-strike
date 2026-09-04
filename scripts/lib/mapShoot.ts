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
  const walls = deriveWallFaces(spec, zone).filter((wall) => wall.lengthM >= ELEV_MIN_FACE_LENGTH_M);
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
  const collidingAssetIds = new Set(
    registry
      // "overhead" assets get no gameplay collider at runtime (buildProps rejects any under 2.2 m clearance), so they are render-only here.
      .filter((entry) => isRecord(entry) && entry.collisionClass !== "none" && entry.collisionClass !== "overhead")
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

