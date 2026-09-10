import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  deriveBlockoutWallSegments,
  resolveSegmentElevationEnvelopes,
  type BoundarySegment,
} from "../../../apps/client/src/runtime/map/buildBlockout";
import { buildV3Architecture } from "../../../apps/client/src/runtime/map/v3Architecture";
import { planV3VisualWallSegments } from "../../../apps/client/src/runtime/map/v3VisualWallSegments";
import { parseBlockoutSpec } from "../../../apps/client/src/runtime/map/types";

type Face = "north" | "south" | "east" | "west";
type RawRecord = Record<string, unknown>;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const designSpecPath = resolve(root, "docs/map-design/specs/map_spec.json");
const runtimeSpecPath = resolve(root, "apps/client/public/maps/bazaar-map/map_spec.json");
const destination = process.argv[2];
if (!destination) throw new Error("Usage: pnpm exec tsx docs/map-design/construction/survey.ts <output.json>; never overwrite the frozen coverage baseline");
const outputPath = resolve(destination);
if (outputPath === resolve(root, "docs/map-design/construction/coverage.json")) throw new Error("Write a separate survey and compare; the issue baseline is frozen.");
const EPS = 1e-6;

const designRaw = JSON.parse(await readFile(designSpecPath, "utf8")) as RawRecord;
const raw = JSON.parse(await readFile(runtimeSpecPath, "utf8")) as RawRecord;
const spec = parseBlockoutSpec(raw, runtimeSpecPath);
const segments = deriveBlockoutWallSegments(spec);
const boundaryOnlySegments = deriveBlockoutWallSegments({ ...spec, exterior_wall_patches: [] });
const envelopes = resolveSegmentElevationEnvelopes(
  segments,
  spec.traversalSurfaces ?? [],
  spec.defaults.floor_height,
);
const architecture = buildV3Architecture({
  placements: spec.architecturePlacements ?? [],
  massingProfiles: spec.massingProfiles ?? [],
  facadeProfiles: spec.facadeProfiles ?? [],
  segments,
  zones: spec.zones,
  traversalSurfaces: spec.traversalSurfaces ?? [],
  wallHeightM: spec.defaults.wall_height,
  fortifiedDoorModelAvailable: false,
});
const visualPlan = planV3VisualWallSegments({
  segments,
  zones: spec.zones,
  placements: spec.architecturePlacements ?? [],
  playableBoundary: spec.playable_boundary,
});

type Interval = { start: number; end: number };

function round(value: number): number {
  return Number(value.toFixed(6));
}

function overlap(left: Interval, right: Interval): Interval | null {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  return end - start > EPS ? { start, end } : null;
}

function samePlane(left: BoundarySegment, right: BoundarySegment): boolean {
  return left.orientation === right.orientation
    && left.outward === right.outward
    && Math.abs(left.coord - right.coord) <= EPS;
}

function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((interval) => interval.end - interval.start > EPS)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const result: Interval[] = [];
  for (const interval of sorted) {
    const previous = result[result.length - 1];
    if (previous && interval.start <= previous.end + EPS) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      result.push({ ...interval });
    }
  }
  return result;
}

function subtract(source: Interval, covered: Interval[]): Interval[] {
  const result: Interval[] = [];
  let cursor = source.start;
  for (const interval of normalize(covered)) {
    if (interval.end <= cursor + EPS) continue;
    if (interval.start >= source.end - EPS) break;
    if (interval.start > cursor + EPS) result.push({ start: cursor, end: Math.min(interval.start, source.end) });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < source.end - EPS) result.push({ start: cursor, end: source.end });
  return result;
}

function faceProjection(zone: { rect: { x: number; y: number; w: number; h: number } }, face: Face): BoundarySegment {
  switch (face) {
    case "west": return { orientation: "vertical", coord: zone.rect.x, outward: -1, start: zone.rect.y, end: zone.rect.y + zone.rect.h };
    case "east": return { orientation: "vertical", coord: zone.rect.x + zone.rect.w, outward: 1, start: zone.rect.y, end: zone.rect.y + zone.rect.h };
    case "south": return { orientation: "horizontal", coord: zone.rect.y, outward: -1, start: zone.rect.x, end: zone.rect.x + zone.rect.w };
    case "north": return { orientation: "horizontal", coord: zone.rect.y + zone.rect.h, outward: 1, start: zone.rect.x, end: zone.rect.x + zone.rect.w };
  }
}

function pointOnFace(projection: BoundarySegment, along: number): { x: number; y: number } {
  return projection.orientation === "vertical"
    ? { x: projection.coord, y: along }
    : { x: along, y: projection.coord };
}

function surfaceElevationAt(surface: NonNullable<typeof spec.traversalSurfaces>[number], x: number, y: number): number {
  if (surface.kind === "flat") return surface.elevationM;
  const start = surface.axis === "x" ? surface.rect.x : surface.rect.y;
  const length = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const coordinate = surface.axis === "x" ? x : y;
  return surface.startElevationM + (surface.endElevationM - surface.startElevationM) * ((coordinate - start) / length);
}

function floorDescriptor(zoneId: string, projection: BoundarySegment): RawRecord {
  const surface = spec.traversalSurfaces?.find((candidate) => candidate.zoneId === zoneId);
  if (!surface) return { source: "defaults.floor_height", elevationM: spec.defaults.floor_height };
  const startPoint = pointOnFace(projection, projection.start);
  const endPoint = pointOnFace(projection, projection.end);
  if (surface.kind === "flat") return {
    surfaceId: surface.id,
    kind: "flat",
    elevationM: surface.elevationM,
  };
  const runM = surface.axis === "x" ? surface.rect.w : surface.rect.h;
  const riseM = surface.endElevationM - surface.startElevationM;
  return {
    surfaceId: surface.id,
    kind: "ramp",
    visualStyle: surface.visualStyle,
    stepCount: surface.stepCount ?? null,
    axis: surface.axis,
    startElevationM: surface.startElevationM,
    endElevationM: surface.endElevationM,
    gradeRisePerM: round(riseM / runM),
    gradeDegrees: round(Math.atan(Math.abs(riseM) / runM) * 180 / Math.PI),
    faceIntervalElevationM: {
      atIntervalStart: round(surfaceElevationAt(surface, startPoint.x, startPoint.y)),
      atIntervalEnd: round(surfaceElevationAt(surface, endPoint.x, endPoint.y)),
    },
  };
}

function overlapsRect(rect: { x: number; y: number; w: number; h: number }, projection: BoundarySegment, interval: Interval): boolean {
  const probe = 0.01;
  const x = projection.orientation === "vertical"
    ? projection.coord + projection.outward * probe
    : (interval.start + interval.end) * 0.5;
  const y = projection.orientation === "horizontal"
    ? projection.coord + projection.outward * probe
    : (interval.start + interval.end) * 0.5;
  return x > rect.x + EPS && x < rect.x + rect.w - EPS && y > rect.y + EPS && y < rect.y + rect.h - EPS;
}

function rawArray(source: RawRecord, name: string): RawRecord[] {
  const value = source[name];
  return Array.isArray(value) ? value as RawRecord[] : [];
}

const rawFrontages = rawArray(raw, "frontages");
const rawExemptions = rawArray(designRaw, "frontage_exemptions");
const rawPatches = rawArray(raw, "exterior_wall_patches");
const rawArchitecture = rawArray(raw, "architecturePlacements");

function isPatchSource(segment: BoundarySegment): string[] {
  const baseDerived = boundaryOnlySegments.some((candidate) => samePlane(candidate, segment)
    && overlap(candidate, segment) !== null);
  const matchingPatches = rawPatches.flatMap((patch, index) => {
    if (patch.orientation !== segment.orientation || patch.outward !== segment.outward || patch.coord !== segment.coord) return [];
    const patchInterval = { start: Number(patch.start), end: Number(patch.end) };
    return overlap(patchInterval, segment) ? [`exterior_wall_patches[${index}]`] : [];
  });
  return [
    ...(baseDerived ? ["deriveBlockoutWallSegments:walkable_union_boundary"] : []),
    ...matchingPatches,
    "buildBlockout:appendWallSegmentColliders",
  ];
}

function frontageCoverage(zoneId: string, face: Face, projection: BoundarySegment): RawRecord[] {
  return rawFrontages
    .filter((frontage) => frontage.zoneId === zoneId && frontage.face === face)
    .map((frontage) => ({
      id: frontage.id,
      interval: {
        start: round(projection.start + (projection.end - projection.start) * Number(frontage.start)),
        end: round(projection.start + (projection.end - projection.start) * Number(frontage.end)),
      },
      authoredFraction: { start: frontage.start, end: frontage.end },
      buildingId: frontage.buildingId ?? null,
      facadeProfileId: frontage.facadeProfileId ?? null,
      massingProfileId: frontage.massingProfileId ?? null,
    }));
}

function exemptions(zoneId: string, face: Face): RawRecord[] {
  return rawExemptions
    .filter((entry) => entry.zoneId === zoneId && entry.face === face)
    .map((entry) => ({ reason: entry.reason, note: entry.note }));
}

function renderMassingEnvelopes(zoneId: string, face: Face, projection: BoundarySegment): RawRecord[] {
  return rawArchitecture
    .filter((placement) => placement.kind === "massing" && placement.zoneId === zoneId && placement.face === face)
    .flatMap((placement) => {
      const center = placement.center as RawRecord;
      const size = placement.sizeM as RawRecord;
      const roof = placement.roof as RawRecord;
      const width = Number(size.width);
      // Runtime architecture placements retain design coordinates: x east,
      // y north, z up. Do not apply designToWorldVec3 here.
      const along = projection.orientation === "vertical" ? Number(center.y) : Number(center.x);
      const interval = { start: along - width / 2, end: along + width / 2 };
      if (!overlap(interval, projection)) return [];
      return [{
        id: placement.id,
        frontageId: placement.frontageId,
        interval: { start: round(interval.start), end: round(interval.end) },
        wallBodyTopM: round(Number(center.z) + Number(size.height) / 2),
        roofElevationM: roof.elevationM,
        parapetTopM: round(Number(roof.elevationM) + Number(roof.parapetHeightM)),
      }];
    });
}

function makeFace(zone: typeof spec.zones[number], face: Face): RawRecord {
  const projection = faceProjection(zone, face);
  const faceInterval = { start: projection.start, end: projection.end };
  const faceMassings = renderMassingEnvelopes(zone.id, face, projection);
  const matching = segments
    .map((segment, segmentIndex) => ({ segment, segmentIndex }))
    .flatMap(({ segment, segmentIndex }) => {
      if (!samePlane(segment, projection)) return [];
      const interval = overlap(segment, faceInterval);
      return interval ? [{ segment, segmentIndex, interval }] : [];
    });
  const wallRuns = matching.map(({ segment, segmentIndex, interval }) => {
    const envelope = envelopes[segmentIndex]!;
    const structuralHeightM = architecture.segmentHeights[segmentIndex]!;
    const wallHeightM = structuralHeightM + envelope.maxY - envelope.minY;
    const residualVisualIntervals = visualPlan.segments
      .map((candidate, visualIndex) => ({ candidate, sourceSegmentIndex: visualPlan.sourceSegmentIndices[visualIndex]! }))
      .filter((entry) => entry.sourceSegmentIndex === segmentIndex)
      .flatMap((entry) => {
        const visualInterval = overlap(entry.candidate, interval);
        return visualInterval ? [{ start: round(visualInterval.start), end: round(visualInterval.end) }] : [];
      });
    const ownership = visualPlan.architectureOwnedFrontages
      .filter((owner) => samePlane(owner, segment))
      .flatMap((owner) => {
        const ownedInterval = overlap(owner, interval);
        if (!ownedInterval) return [];
        const massing = faceMassings.find((entry) => entry.id === owner.placementId);
        return [{ owner, interval: ownedInterval, massing }];
      });
    const ownershipEnvelopes = ownership.map(({ owner, interval: ownedInterval, massing }) => ({
      placementId: owner.placementId,
      frontageId: owner.frontageId,
      interval: { start: round(ownedInterval.start), end: round(ownedInterval.end) },
      ...(massing ? {
        colliderAboveWallBodyM: round(Math.max(0, envelope.minY + wallHeightM - Number(massing.wallBodyTopM))),
        colliderAboveParapetM: round(Math.max(0, envelope.minY + wallHeightM - Number(massing.parapetTopM))),
      } : {}),
    }));
    return {
      id: `COLLIDER_WALL_${String(segmentIndex + 1).padStart(3, "0")}`,
      interval: { start: round(interval.start), end: round(interval.end) },
      absoluteEndpoints: {
        start: pointOnFace(projection, round(interval.start)),
        end: pointOnFace(projection, round(interval.end)),
      },
      producerHooks: isPatchSource(segment),
      colliderEnvelopeM: {
        baseElevationM: round(envelope.minY),
        floorEnvelopeMaxM: round(envelope.maxY),
        structuralHeightM: round(structuralHeightM),
        colliderHeightM: round(wallHeightM),
        colliderTopM: round(envelope.minY + wallHeightM),
      },
      renderEnvelopeM: {
        collisionBackedWallTopM: round(envelope.minY + wallHeightM),
        residualRuntimeWallIntervals: residualVisualIntervals,
        residualBoundaryCopingTopM: residualVisualIntervals.length > 0 ? round(envelope.minY + wallHeightM + 0.32) : null,
        architectureOwnedIntervals: ownershipEnvelopes,
        source: "planV3VisualWallSegments preserves residual PBR wall intervals and subtracts architecture-owned intervals only for rendering. buildBlockout V3_BOUNDARY_COPING_HEIGHT_M applies to residual boundary wall finish.",
      },
    };
  });
  const openings = subtract(faceInterval, matching.map(({ interval }) => interval)).map((interval) => {
    const adjoiningZoneIds = spec.zones
      .filter((candidate) => candidate.id !== zone.id && overlapsRect(candidate.rect, projection, interval))
      .map((candidate) => candidate.id);
    return {
      interval: { start: round(interval.start), end: round(interval.end) },
      absoluteEndpoints: {
        start: pointOnFace(projection, round(interval.start)),
        end: pointOnFace(projection, round(interval.end)),
      },
      adjoiningZoneIds,
      immutable: adjoiningZoneIds.length > 0,
      immutableReason: adjoiningZoneIds.length > 0
        ? "Walkable-union adjacency has no collider on this interval; preserve traversal opening."
        : "No collider derived on this zone face interval; verify as an unoccupied exterior opening before building into it.",
    };
  });
  const solidCoverageIntervals = normalize(matching.map(({ interval }) => interval)).map((coverage) => ({
    interval: { start: round(coverage.start), end: round(coverage.end) },
    colliderIds: matching
      .filter(({ interval }) => overlap(interval, coverage) !== null)
      .map(({ segmentIndex }) => `COLLIDER_WALL_${String(segmentIndex + 1).padStart(3, "0")}`),
  }));
  const faceExemptions = exemptions(zone.id, face);
  return {
    face,
    coordinateConvention: projection.orientation === "vertical"
      ? "interval is absolute design y (north), with fixed design x"
      : "interval is absolute design x (east), with fixed design y",
    wallPlane: {
      orientation: projection.orientation,
      fixedCoordinate: round(projection.coord),
      outward: projection.outward,
      interval: { start: round(projection.start), end: round(projection.end) },
      absoluteEndpoints: {
        start: pointOnFace(projection, round(projection.start)),
        end: pointOnFace(projection, round(projection.end)),
      },
    },
    floor: floorDescriptor(zone.id, projection),
    visualAcceptance: faceExemptions.length === 0 ? "requires_visual_acceptance" : "frontage_exempted",
    exemptions: faceExemptions,
    registeredFrontages: frontageCoverage(zone.id, face, projection),
    structuralRenderMassings: faceMassings,
    solidCollisionCoverageIntervals: solidCoverageIntervals,
    solidCollisionWallRuns: wallRuns,
    immutableOpeningRuns: openings,
  };
}

const anchors = rawArray(raw, "anchors");
const clusters = rawArray(raw, "dressingClusters");
const placements = spec.dressingPlacements ?? [];
const anchorById = new Map(anchors.map((anchor) => [String(anchor.id), anchor]));
const placementsByCluster = new Map<string, typeof placements>();
for (const placement of placements) {
  const values = placementsByCluster.get(placement.clusterId) ?? [];
  values.push(placement);
  placementsByCluster.set(placement.clusterId, values);
}

function anchorSummary(anchorId: string): RawRecord {
  const anchor = anchorById.get(anchorId) ?? {};
  return {
    id: anchorId,
    type: anchor.type ?? "missing_from_anchors",
    zone: anchor.zone ?? null,
    frontageId: anchor.frontageId ?? null,
    servedBayId: anchor.servedBayId ?? null,
    x: anchor.x ?? null,
    y: anchor.y ?? null,
    z: anchor.z ?? null,
    notes: anchor.notes ?? null,
  };
}

const dressingInventory = clusters.map((cluster) => {
  const classification = String(cluster.classification);
  const clusterPlacements = placementsByCluster.get(String(cluster.id)) ?? [];
  const protectedCluster = classification === "gameplay_cover";
  return {
    id: cluster.id,
    zoneId: cluster.zoneId,
    classification,
    disposition: protectedCluster ? "protected_gameplay_cluster" : "render_only_candidate_inventory",
    assetIds: cluster.assetIds ?? [],
    anchors: (Array.isArray(cluster.anchors) ? cluster.anchors : []).map((id) => anchorSummary(String(id))),
    compiledPlacementIds: clusterPlacements.map((placement) => placement.id),
    collisionClasses: [...new Set(clusterPlacements.map((placement) => placement.collisionClass))],
    protectedReason: protectedCluster
      ? "Cluster classification is gameplay_cover; retain its cover anchors and collision-bearing placements."
      : "Cluster classification is soft_visual or overhead; inventory only, with no replacement proposed.",
  };
});

const inventory = {
  schemaVersion: 1,
  generatedFrom: {
    runtimeSpecPath: "apps/client/public/maps/bazaar-map/map_spec.json",
    designSpecPath: "docs/map-design/specs/map_spec.json",
    mapVersion: (designRaw.metadata as RawRecord | undefined)?.version ?? null,
    generatedAt: new Date().toISOString(),
    coordinateSystem: (designRaw.metadata as RawRecord | undefined)?.coordinate_system ?? null,
  },
  authority: {
    collisionTopology: [
      "apps/client/src/runtime/map/buildBlockout.ts#deriveBlockoutWallSegments",
      "apps/client/src/runtime/map/buildBlockout.ts#appendWallSegmentColliders",
      "apps/client/src/runtime/map/buildBlockout.ts#resolveSegmentElevationEnvelopes",
    ],
    heightSource: "apps/client/src/runtime/map/v3Architecture.ts#buildV3Architecture derives each segment height from its resolved zone facade profile and massing profile; buildBlockout then turns that value into gameplay wall colliders.",
    visualOwnership: "apps/client/src/runtime/map/v3VisualWallSegments.ts#planV3VisualWallSegments subtracts only render ownership. It never changes the source collision wall list.",
    acceptanceRule: "No frontage exemption is treated as requiring visual acceptance. Existing frontages are recorded as registry coverage only, never used to derive collision spans.",
  },
  limitations: [
    "Solid runs are exact to the current runtime collider derivation. They are not mesh or in-game collision captures.",
    "Collider height is gameplay-active even though its source is the current facade/massing profile. Preserve the listed collider envelope unless a separately authorized gameplay change updates and validates it.",
    "renderEnvelopeM reports the collision-backed wall and standard residual coping only. Individual façade GLBs, section models, roofs, skylines, awnings, and dressing can exceed it; structuralRenderMassings lists the source-profile roof/parapet envelope where a massing owns this face.",
    "An opening with no adjoining walkable zone is flagged for exterior review rather than assumed safe to fill.",
    "Dressing dispositions use the compiled runtime placement inventory and cluster classifications. They do not assess visual quality or propose replacements.",
  ],
  summary: {
    zoneCount: spec.zones.length,
    faceCount: spec.zones.length * 4,
    derivedColliderSegmentCount: segments.length,
    dressedClusterCount: clusters.length,
    protectedGameplayClusterCount: dressingInventory.filter((entry) => entry.disposition === "protected_gameplay_cluster").length,
    renderOnlyCandidateClusterCount: dressingInventory.filter((entry) => entry.disposition === "render_only_candidate_inventory").length,
  },
  zones: spec.zones.map((zone) => ({
    id: zone.id,
    type: zone.type,
    rect: zone.rect,
    surfaceId: zone.surfaceId ?? null,
    faces: (["north", "east", "south", "west"] as Face[]).map((face) => makeFace(zone, face)),
  })),
  dressingDispositionInventory: dressingInventory,
};

await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`${outputPath}\n${JSON.stringify(inventory.summary)}`);
