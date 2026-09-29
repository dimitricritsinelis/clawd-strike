import { PerspectiveCamera, Raycaster, Vector3, type Object3D } from "three";
import { designToWorldVec3 } from "../map/world/coordinateTransforms";
import type { RuntimeAnchor, RuntimeBlockoutSpec } from "../map/spec/types";
import type { RuntimeTextState } from "./runtimeState";

const PLAYER_ZONE_TYPES = new Set(["spawn_plaza", "main_lane_segment", "side_hall", "connector", "cut"]);

export function findCurrentZone(
  spec: RuntimeBlockoutSpec | null,
  x: number,
  y: number,
  z: number,
): { id: string; type: string; label: string } | null {
  if (!spec) return null;

  let bestMatch: { id: string; type: string; label: string; area: number; verticalDelta: number } | null = null;
  const surfacesById = new Map((spec.traversalSurfaces ?? []).map((surface) => [surface.id, surface]));
  for (const zone of spec.zones) {
    if (!PLAYER_ZONE_TYPES.has(zone.type)) continue;
    const insideX = x >= zone.rect.x && x <= zone.rect.x + zone.rect.w;
    const insideZ = z >= zone.rect.y && z <= zone.rect.y + zone.rect.h;
    if (!insideX || !insideZ) continue;

    const area = zone.rect.w * zone.rect.h;
    const surface = zone.surfaceId ? surfacesById.get(zone.surfaceId) : undefined;
    let surfaceY = spec.defaults.floor_height;
    if (surface?.kind === "flat") {
      surfaceY = surface.elevationM;
    } else if (surface?.kind === "ramp") {
      const axisStart = surface.axis === "x" ? surface.rect.x : surface.rect.y;
      const axisLength = surface.axis === "x" ? surface.rect.w : surface.rect.h;
      const axisCoord = surface.axis === "x" ? x : z;
      const t = Math.max(0, Math.min(1, (axisCoord - axisStart) / Math.max(axisLength, 1e-6)));
      surfaceY = surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t;
    }
    const verticalDelta = Math.abs(y - surfaceY);
    if (
      !bestMatch
      || verticalDelta < bestMatch.verticalDelta - 0.05
      || (Math.abs(verticalDelta - bestMatch.verticalDelta) <= 0.05 && area < bestMatch.area)
    ) {
      bestMatch = {
        id: zone.id,
        type: zone.type,
        label: zone.label,
        area,
        verticalDelta,
      };
    }
  }

  if (!bestMatch) return null;
  return {
    id: bestMatch.id,
    type: bestMatch.type,
    label: bestMatch.label,
  };
}

function isLandmarkAnchor(anchor: RuntimeAnchor): boolean {
  const normalized = anchor.type.toLowerCase();
  return normalized === "landmark" || normalized === "hero_landmark";
}

export function collectLandmarkState(
  anchors: readonly RuntimeAnchor[] | null,
  visibleAnchorIds: ReadonlySet<string>,
  camera: PerspectiveCamera,
  viewportWidth: number,
  viewportHeight: number,
): RuntimeTextState["landmarks"] {
  if (!anchors || anchors.length === 0) {
    return {
      visible: [],
      nearest: null,
    };
  }

  const scratch = new Vector3();
  const visible: RuntimeTextState["landmarks"]["visible"] = [];
  let nearest: RuntimeTextState["landmarks"]["nearest"] = null;

  for (const anchor of anchors) {
    if (!isLandmarkAnchor(anchor)) continue;
    if (!visibleAnchorIds.has(anchor.id)) continue;

    const world = designToWorldVec3(anchor.pos);
    world.y += Math.max(0.3, (anchor.heightM ?? 1) * 0.5);
    const dx = world.x - camera.position.x;
    const dy = world.y - camera.position.y;
    const dz = world.z - camera.position.z;
    const distanceM = Math.hypot(dx, dy, dz);

    if (!nearest || distanceM < nearest.distanceM) {
      nearest = {
        id: anchor.id,
        type: anchor.type,
        zone: anchor.zone,
        distanceM,
      };
    }

    scratch.set(world.x, world.y, world.z).project(camera);
    const inClipSpace = scratch.z >= -1 && scratch.z <= 1;
    const inViewport = Math.abs(scratch.x) <= 1 && Math.abs(scratch.y) <= 1;
    if (!inClipSpace || !inViewport) continue;

    visible.push({
      id: anchor.id,
      type: anchor.type,
      zone: anchor.zone,
      distanceM,
      screenX: ((scratch.x + 1) * 0.5) * viewportWidth,
      screenY: ((1 - scratch.y) * 0.5) * viewportHeight,
    });
  }

  visible.sort((a, b) => a.distanceM - b.distanceM || a.id.localeCompare(b.id));

  return {
    visible: visible.slice(0, 6),
    nearest,
  };
}

export function collectVisibleAnchorIds(
  anchors: readonly RuntimeAnchor[] | null,
  renderedAnchorIds: readonly string[],
  sceneRoot: Object3D,
  camera: PerspectiveCamera,
): Set<string> {
  const visible = new Set<string>();
  if (!anchors || anchors.length === 0) return visible;
  const rendered = new Set(renderedAnchorIds);
  const target = new Vector3();
  const projected = new Vector3();
  const direction = new Vector3();
  const raycaster = new Raycaster();
  raycaster.camera = camera;
  for (const anchor of anchors) {
    if (!rendered.has(anchor.id)) continue;
    const world = designToWorldVec3(anchor.pos);
    target.set(world.x, world.y + Math.max(0.3, (anchor.heightM ?? 1) * 0.5), world.z);
    projected.copy(target).project(camera);
    if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue;
    const distanceM = target.distanceTo(camera.position);
    const targetRadiusM = Math.max(0.55, (anchor.widthM ?? 0) * 0.5, (anchor.heightM ?? 0) * 0.5);
    direction.copy(target).sub(camera.position).normalize();
    raycaster.set(camera.position, direction);
    raycaster.near = 0.05;
    raycaster.far = distanceM + targetRadiusM;
    const firstHit = raycaster.intersectObject(sceneRoot, true)[0];
    if (!firstHit || firstHit.distance >= distanceM - targetRadiusM) visible.add(anchor.id);
  }
  return visible;
}
