import type {
  RuntimeAnchor,
  RuntimeAnchorsSpec,
  RuntimeBlockoutSpec,
  RuntimeBlockoutZone,
  RuntimeExplicitConnectivityEdge,
  RuntimeTraversalSurface,
} from "../map/types";
import { designYawDegToWorldYawRad } from "../map/coordinateTransforms";
import { TraversalSurfaceResolver } from "../sim/TraversalSurfaceResolver";

export type TacticalLane = "west" | "main" | "east";

export type TacticalNodeType =
  | "zone_center"
  | "spawn_cover"
  | "cover_cluster"
  | "open_node"
  | "connector_entry"
  | "hall_entry"
  | "breach"
  | "pre_peek";

export type TacticalNode = {
  id: string;
  zoneId: string;
  lane: TacticalLane;
  nodeType: TacticalNodeType;
  x: number;
  y: number;
  z: number;
  coverScore: number;
  flankScore: number;
  exposureYawRad: number;
  adjacency: string[];
  tags: string[];
};

export type TacticalGraph = {
  nodes: TacticalNode[];
  nodeById: Map<string, TacticalNode>;
  zoneNodes: Map<string, TacticalNode[]>;
  zoneCenterNodeIds: Map<string, string>;
  zoneAdjacency: Map<string, string[]>;
  zoneById: Map<string, RuntimeBlockoutZone>;
  surfaceResolver: TraversalSurfaceResolver;
  edgeCosts: Map<string, number>;
};

const ZONE_TYPES = new Set([
  "spawn_plaza",
  "main_lane_segment",
  "side_hall",
  "connector",
  "cut",
]);

const ANCHOR_TYPES = new Set(["spawn_cover", "cover_cluster", "open_node"]);

type MutableNode = Omit<TacticalNode, "adjacency"> & { adjacency: Set<string> };

const COVER_ANCHOR_STANDOFF_M: Record<"spawn_cover" | "cover_cluster", number> = {
  spawn_cover: 1.5,
  cover_cluster: 1.2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function zoneCenter(zone: RuntimeBlockoutZone): { x: number; z: number } {
  return {
    x: zone.rect.x + zone.rect.w * 0.5,
    z: zone.rect.y + zone.rect.h * 0.5,
  };
}

function laneFromRect(rect: RuntimeBlockoutZone["rect"]): TacticalLane {
  const centerX = rect.x + rect.w * 0.5;
  if (centerX <= 14.5) return "west";
  if (centerX >= 35.5) return "east";
  return "main";
}

function laneFromZone(zone: RuntimeBlockoutZone): TacticalLane {
  if (zone.macroLane === "west" || zone.macroLane === "main" || zone.macroLane === "east") {
    return zone.macroLane;
  }
  if (zone.id.includes("_W") || zone.id.startsWith("SH_W")) return "west";
  if (zone.id.includes("_E") || zone.id.startsWith("SH_E")) return "east";
  return laneFromRect(zone.rect);
}

function overlaps(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin) >= -0.25;
}

function zonesTouch(a: RuntimeBlockoutZone, b: RuntimeBlockoutZone): boolean {
  const aMinX = a.rect.x;
  const aMaxX = a.rect.x + a.rect.w;
  const aMinZ = a.rect.y;
  const aMaxZ = a.rect.y + a.rect.h;
  const bMinX = b.rect.x;
  const bMaxX = b.rect.x + b.rect.w;
  const bMinZ = b.rect.y;
  const bMaxZ = b.rect.y + b.rect.h;

  const verticalGap = Math.max(0, Math.max(aMinZ - bMaxZ, bMinZ - aMaxZ));
  const horizontalGap = Math.max(0, Math.max(aMinX - bMaxX, bMinX - aMaxX));

  const touchVertically = verticalGap <= 0.5 && overlaps(aMinX, aMaxX, bMinX, bMaxX);
  const touchHorizontally = horizontalGap <= 0.5 && overlaps(aMinZ, aMaxZ, bMinZ, bMaxZ);
  const intersects = verticalGap === 0 && horizontalGap === 0;

  return touchVertically || touchHorizontally || intersects;
}

function pointInRect(zone: RuntimeBlockoutZone, x: number, z: number): boolean {
  return x >= zone.rect.x && x <= zone.rect.x + zone.rect.w && z >= zone.rect.y && z <= zone.rect.y + zone.rect.h;
}

function scoreZoneCenter(zone: RuntimeBlockoutZone): Pick<TacticalNode, "coverScore" | "flankScore"> {
  switch (zone.type) {
    case "spawn_plaza":
      return { coverScore: 0.74, flankScore: 0.18 };
    case "connector":
      return { coverScore: 0.58, flankScore: 0.64 };
    case "cut":
      return { coverScore: 0.36, flankScore: 0.9 };
    case "side_hall":
      return { coverScore: 0.68, flankScore: 0.86 };
    case "main_lane_segment":
      return { coverScore: 0.46, flankScore: 0.42 };
    default:
      return { coverScore: 0.4, flankScore: 0.3 };
  }
}

function scoreAnchor(anchor: RuntimeAnchor): Pick<TacticalNode, "coverScore" | "flankScore"> {
  switch (anchor.type) {
    case "spawn_cover":
      return { coverScore: 0.95, flankScore: 0.16 };
    case "cover_cluster":
      return { coverScore: 0.84, flankScore: 0.62 };
    case "open_node":
      return { coverScore: 0.22, flankScore: 0.94 };
    default:
      return { coverScore: 0.5, flankScore: 0.5 };
  }
}

function scoreDerivedNode(
  zone: RuntimeBlockoutZone,
  neighbor: RuntimeBlockoutZone,
  nodeType: TacticalNodeType,
): Pick<TacticalNode, "coverScore" | "flankScore"> {
  const zoneScore = scoreZoneCenter(zone);
  const neighborScore = scoreZoneCenter(neighbor);
  switch (nodeType) {
    case "connector_entry":
      return {
        coverScore: clamp(zoneScore.coverScore * 0.95 + 0.08, 0, 1),
        flankScore: clamp(Math.max(zoneScore.flankScore, neighborScore.flankScore) * 0.9 + 0.06, 0, 1),
      };
    case "hall_entry":
      return {
        coverScore: clamp(zoneScore.coverScore * 0.9 + 0.05, 0, 1),
        flankScore: clamp(zoneScore.flankScore * 0.95 + 0.08, 0, 1),
      };
    case "breach":
      return {
        coverScore: clamp(zoneScore.coverScore * 0.7, 0, 1),
        flankScore: clamp(zoneScore.flankScore * 1.08 + 0.12, 0, 1),
      };
    case "pre_peek":
    default:
      return {
        coverScore: clamp(zoneScore.coverScore * 0.88 + 0.04, 0, 1),
        flankScore: clamp(zoneScore.flankScore * 0.92 + 0.07, 0, 1),
      };
  }
}

function resolveDerivedNodeType(zone: RuntimeBlockoutZone): TacticalNodeType {
  if (zone.type === "connector") return "connector_entry";
  if (zone.type === "side_hall") return "hall_entry";
  if (zone.type === "cut") return "breach";
  return "pre_peek";
}

function resolveExposureYawRad(
  zone: RuntimeBlockoutZone,
  anchor: RuntimeAnchor | null,
  mapCenter: { x: number; y: number },
): number {
  if (anchor && typeof anchor.yawDeg === "number") {
    return designYawDegToWorldYawRad(anchor.yawDeg);
  }

  const center = zoneCenter(zone);
  const targetX = mapCenter.x;
  const targetZ = mapCenter.y;
  return Math.atan2(targetX - center.x, targetZ - center.z);
}

function surfaceYForZone(
  resolver: TraversalSurfaceResolver,
  zone: RuntimeBlockoutZone,
  x: number,
  z: number,
  fallbackY = 0,
): number {
  const exact = resolver.surfaces.find((surface) => surface.id === zone.surfaceId);
  if (exact) {
    const exactResolver = new TraversalSurfaceResolver([exact]);
    return exactResolver.sample(x, z)?.elevationM ?? fallbackY;
  }
  return resolver.sample(x, z, fallbackY)?.elevationM ?? fallbackY;
}

function nodeEdgeKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function anchorToNodeType(anchor: RuntimeAnchor): TacticalNodeType | null {
  if (anchor.type === "spawn_cover") return "spawn_cover";
  if (anchor.type === "cover_cluster") return "cover_cluster";
  if (anchor.type === "open_node") return "open_node";
  return null;
}

function createNode(payload: Omit<MutableNode, "adjacency">): MutableNode {
  return {
    ...payload,
    coverScore: clamp(payload.coverScore, 0, 1),
    flankScore: clamp(payload.flankScore, 0, 1),
    adjacency: new Set<string>(),
  };
}

function resolveEdgeInset(zone: RuntimeBlockoutZone): number {
  switch (zone.type) {
    case "spawn_plaza":
      return 2.6;
    case "main_lane_segment":
      return 2.1;
    case "side_hall":
      return 1.7;
    case "connector":
      return 1.1;
    case "cut":
      return 1.0;
    default:
      return 1.4;
  }
}

function clampPointToZoneInterior(
  zone: RuntimeBlockoutZone,
  point: { x: number; z: number },
  inset: number,
): { x: number; z: number } {
  return {
    x: clamp(point.x, zone.rect.x + inset, zone.rect.x + zone.rect.w - inset),
    z: clamp(point.z, zone.rect.y + inset, zone.rect.y + zone.rect.h - inset),
  };
}

function resolveAnchorStandPoint(
  zone: RuntimeBlockoutZone,
  anchor: RuntimeAnchor,
): { x: number; z: number } {
  const nodeType = anchorToNodeType(anchor);
  if (nodeType !== "spawn_cover" && nodeType !== "cover_cluster") {
    return {
      x: anchor.pos.x,
      z: anchor.pos.y,
    };
  }

  const center = zoneCenter(zone);
  const rawX = anchor.pos.x;
  const rawZ = anchor.pos.y;
  const toCenterX = center.x - rawX;
  const toCenterZ = center.z - rawZ;
  const length = Math.hypot(toCenterX, toCenterZ);
  const dirX = length > 0.0001 ? toCenterX / length : 0;
  const dirZ = length > 0.0001 ? toCenterZ / length : 1;
  const inset = resolveEdgeInset(zone);
  const standOffM = COVER_ANCHOR_STANDOFF_M[nodeType];

  return clampPointToZoneInterior(
    zone,
    {
      x: rawX + dirX * standOffM,
      z: rawZ + dirZ * standOffM,
    },
    inset,
  );
}

function resolveTransitionPoints(
  a: RuntimeBlockoutZone,
  b: RuntimeBlockoutZone,
): { aPoint: { x: number; z: number }; bPoint: { x: number; z: number } } {
  const aCenter = zoneCenter(a);
  const bCenter = zoneCenter(b);
  const aInset = resolveEdgeInset(a);
  const bInset = resolveEdgeInset(b);

  const verticalGap = Math.max(0, Math.max(a.rect.y - (b.rect.y + b.rect.h), b.rect.y - (a.rect.y + a.rect.h)));
  const horizontalGap = Math.max(0, Math.max(a.rect.x - (b.rect.x + b.rect.w), b.rect.x - (a.rect.x + a.rect.w)));

  if (verticalGap <= 0.5 && overlaps(a.rect.x, a.rect.x + a.rect.w, b.rect.x, b.rect.x + b.rect.w)) {
    const overlapMinX = Math.max(a.rect.x, b.rect.x);
    const overlapMaxX = Math.min(a.rect.x + a.rect.w, b.rect.x + b.rect.w);
    const bridgeX = (overlapMinX + overlapMaxX) * 0.5;
    const aSouthEdge = a.rect.y + a.rect.h <= b.rect.y + b.rect.h;
    if (aSouthEdge && a.rect.y + a.rect.h <= b.rect.y + 0.5) {
      return {
        aPoint: { x: bridgeX, z: a.rect.y + a.rect.h - aInset },
        bPoint: { x: bridgeX, z: b.rect.y + bInset },
      };
    }
    if (b.rect.y + b.rect.h <= a.rect.y + 0.5) {
      return {
        aPoint: { x: bridgeX, z: a.rect.y + aInset },
        bPoint: { x: bridgeX, z: b.rect.y + b.rect.h - bInset },
      };
    }
  }

  if (horizontalGap <= 0.5 && overlaps(a.rect.y, a.rect.y + a.rect.h, b.rect.y, b.rect.y + b.rect.h)) {
    const overlapMinZ = Math.max(a.rect.y, b.rect.y);
    const overlapMaxZ = Math.min(a.rect.y + a.rect.h, b.rect.y + b.rect.h);
    const bridgeZ = (overlapMinZ + overlapMaxZ) * 0.5;
    if (a.rect.x + a.rect.w <= b.rect.x + 0.5) {
      return {
        aPoint: { x: a.rect.x + a.rect.w - aInset, z: bridgeZ },
        bPoint: { x: b.rect.x + bInset, z: bridgeZ },
      };
    }
    if (b.rect.x + b.rect.w <= a.rect.x + 0.5) {
      return {
        aPoint: { x: a.rect.x + aInset, z: bridgeZ },
        bPoint: { x: b.rect.x + b.rect.w - bInset, z: bridgeZ },
      };
    }
  }

  return {
    aPoint: clampPointToZoneInterior(a, {
      x: aCenter.x + clamp(bCenter.x - aCenter.x, -resolveEdgeInset(a), resolveEdgeInset(a)),
      z: aCenter.z + clamp(bCenter.z - aCenter.z, -resolveEdgeInset(a), resolveEdgeInset(a)),
    }, aInset),
    bPoint: clampPointToZoneInterior(b, {
      x: bCenter.x + clamp(aCenter.x - bCenter.x, -resolveEdgeInset(b), resolveEdgeInset(b)),
      z: bCenter.z + clamp(aCenter.z - bCenter.z, -resolveEdgeInset(b), resolveEdgeInset(b)),
    }, bInset),
  };
}

function resolveAuthoredTransition(
  edge: RuntimeExplicitConnectivityEdge | undefined,
  a: RuntimeBlockoutZone,
  b: RuntimeBlockoutZone,
  surfacesById: ReadonlyMap<string, RuntimeTraversalSurface>,
): { point: { x: number; z: number }; elevationM: number } | null {
  if (!edge?.transitionSurfaceId) return null;
  const surface = surfacesById.get(edge.transitionSurfaceId);
  if (!surface) return null;

  const surfaceZone = surface.zoneId === a.id ? a : surface.zoneId === b.id ? b : null;
  if (!surfaceZone) return null;
  const otherZone = surfaceZone.id === a.id ? b : a;
  const otherCenter = zoneCenter(otherZone);
  const point = {
    x: clamp(otherCenter.x, surface.rect.x, surface.rect.x + surface.rect.w),
    z: clamp(otherCenter.z, surface.rect.y, surface.rect.y + surface.rect.h),
  };
  const resolver = new TraversalSurfaceResolver([surface]);
  const sample = resolver.sample(point.x, point.z);
  if (!sample) return null;
  return { point, elevationM: sample.elevationM };
}

export function buildTacticalGraph(
  blockout: RuntimeBlockoutSpec,
  anchorsSpec: RuntimeAnchorsSpec | null,
): TacticalGraph {
  const zoneById = new Map(blockout.zones.map((zone) => [zone.id, zone]));
  const zoneAdjacency = new Map<string, string[]>();
  const surfaceResolver = new TraversalSurfaceResolver(blockout.traversalSurfaces ?? []);
  const surfacesById = new Map((blockout.traversalSurfaces ?? []).map((surface) => [surface.id, surface]));
  const mapCenter = blockout.mapCenter ?? {
    x: blockout.playable_boundary.x + blockout.playable_boundary.w * 0.5,
    y: blockout.playable_boundary.y + blockout.playable_boundary.h * 0.5,
  };
  const explicitEdges = blockout.explicitConnectivity ?? [];

  for (const zone of blockout.zones) {
    if (!ZONE_TYPES.has(zone.type)) continue;
    const neighbors = new Set<string>();
    if (explicitEdges.length > 0) {
      for (const edge of explicitEdges) {
        if (edge.fromZoneId === zone.id) neighbors.add(edge.toZoneId);
        if (edge.toZoneId === zone.id) neighbors.add(edge.fromZoneId);
      }
    } else {
      for (const other of blockout.zones) {
        if (zone.id === other.id || !ZONE_TYPES.has(other.type)) continue;
        if (zonesTouch(zone, other)) {
          neighbors.add(other.id);
        }
      }
    }
    zoneAdjacency.set(zone.id, [...neighbors].sort((a, b) => a.localeCompare(b)));
  }

  const nodes: MutableNode[] = [];
  const zoneNodes = new Map<string, MutableNode[]>();
  const zoneCenterNodeIds = new Map<string, string>();

  for (const zone of blockout.zones) {
    if (!ZONE_TYPES.has(zone.type)) continue;
    const center = zoneCenter(zone);
    const scores = scoreZoneCenter(zone);
    const node = createNode({
      id: `zone:${zone.id}`,
      zoneId: zone.id,
      lane: laneFromZone(zone),
      nodeType: "zone_center",
      x: center.x,
      y: surfaceYForZone(surfaceResolver, zone, center.x, center.z),
      z: center.z,
      coverScore: scores.coverScore,
      flankScore: scores.flankScore,
      exposureYawRad: resolveExposureYawRad(zone, null, mapCenter),
      tags: [zone.type, "zone-center"],
    });
    nodes.push(node);
    zoneNodes.set(zone.id, [node]);
    zoneCenterNodeIds.set(zone.id, node.id);
  }

  for (const anchor of anchorsSpec?.anchors ?? []) {
    if (!ANCHOR_TYPES.has(anchor.type)) continue;
    const zone = zoneById.get(anchor.zone);
    if (!zone || !ZONE_TYPES.has(zone.type)) continue;
    const nodeType = anchorToNodeType(anchor);
    if (!nodeType) continue;
    const scores = scoreAnchor(anchor);
    const anchorPoint = resolveAnchorStandPoint(zone, anchor);
    const node = createNode({
      id: `anchor:${anchor.id}`,
      zoneId: zone.id,
      lane: laneFromZone(zone),
      nodeType,
      x: anchorPoint.x,
      y: surfaceYForZone(surfaceResolver, zone, anchorPoint.x, anchorPoint.z, anchor.pos.z),
      z: anchorPoint.z,
      coverScore: scores.coverScore,
      flankScore: scores.flankScore,
      exposureYawRad: resolveExposureYawRad(zone, anchor, mapCenter),
      tags: [anchor.type, zone.type],
    });
    nodes.push(node);
    const zoneList = zoneNodes.get(zone.id);
    if (zoneList) {
      zoneList.push(node);
    } else {
      zoneNodes.set(zone.id, [node]);
    }
  }

  for (const [zoneId, neighborIds] of zoneAdjacency.entries()) {
    for (const neighborId of neighborIds) {
      if (zoneId >= neighborId) continue;
      const zone = zoneById.get(zoneId);
      const neighbor = zoneById.get(neighborId);
      if (!zone || !neighbor) continue;

      const explicitEdge = explicitEdges.find((edge) => (
        (edge.fromZoneId === zone.id && edge.toZoneId === neighbor.id)
        || (edge.fromZoneId === neighbor.id && edge.toZoneId === zone.id)
      ));
      const authoredTransition = resolveAuthoredTransition(explicitEdge, zone, neighbor, surfacesById);
      const inferredTransition = authoredTransition ? null : resolveTransitionPoints(zone, neighbor);
      const aPoint = authoredTransition?.point ?? inferredTransition!.aPoint;
      const bPoint = authoredTransition?.point ?? inferredTransition!.bPoint;
      const aElevationM = authoredTransition?.elevationM
        ?? surfaceYForZone(surfaceResolver, zone, aPoint.x, aPoint.z);
      const bElevationM = authoredTransition?.elevationM
        ?? surfaceYForZone(surfaceResolver, neighbor, bPoint.x, bPoint.z);
      const zoneNodeType = resolveDerivedNodeType(zone);
      const neighborNodeType = resolveDerivedNodeType(neighbor);
      const zoneScores = scoreDerivedNode(zone, neighbor, zoneNodeType);
      const neighborScores = scoreDerivedNode(neighbor, zone, neighborNodeType);

      const zoneNode = createNode({
        id: `edge:${zone.id}->${neighbor.id}`,
        zoneId: zone.id,
        lane: laneFromZone(zone),
        nodeType: zoneNodeType,
        x: aPoint.x,
        y: aElevationM,
        z: aPoint.z,
        coverScore: zoneScores.coverScore,
        flankScore: zoneScores.flankScore,
        exposureYawRad: Math.atan2(bPoint.x - aPoint.x, bPoint.z - aPoint.z),
        tags: [zone.type, neighbor.type, "entry-node", zoneNodeType],
      });
      const neighborNode = createNode({
        id: `edge:${neighbor.id}->${zone.id}`,
        zoneId: neighbor.id,
        lane: laneFromZone(neighbor),
        nodeType: neighborNodeType,
        x: bPoint.x,
        y: bElevationM,
        z: bPoint.z,
        coverScore: neighborScores.coverScore,
        flankScore: neighborScores.flankScore,
        exposureYawRad: Math.atan2(aPoint.x - bPoint.x, aPoint.z - bPoint.z),
        tags: [neighbor.type, zone.type, "entry-node", neighborNodeType],
      });

      zoneNode.adjacency.add(neighborNode.id);
      neighborNode.adjacency.add(zoneNode.id);
      nodes.push(zoneNode, neighborNode);
      zoneNodes.get(zone.id)?.push(zoneNode);
      zoneNodes.get(neighbor.id)?.push(neighborNode);
    }
  }

  for (const [zoneId, entries] of zoneNodes.entries()) {
    const centerId = zoneCenterNodeIds.get(zoneId);
    if (!centerId) continue;
    for (const entry of entries) {
      if (entry.id === centerId) continue;
      entry.adjacency.add(centerId);
      const centerNode = entries.find((candidate) => candidate.id === centerId);
      centerNode?.adjacency.add(entry.id);
    }
  }

  for (const [zoneId, neighborIds] of zoneAdjacency.entries()) {
    const zoneCenterId = zoneCenterNodeIds.get(zoneId);
    if (!zoneCenterId) continue;
    const zoneCenterNode = nodes.find((node) => node.id === zoneCenterId);
    if (!zoneCenterNode) continue;

    for (const neighborId of neighborIds) {
      const neighborCenterId = zoneCenterNodeIds.get(neighborId);
      if (!neighborCenterId) continue;
      zoneCenterNode.adjacency.add(neighborCenterId);
      const neighborCenterNode = nodes.find((node) => node.id === neighborCenterId);
      neighborCenterNode?.adjacency.add(zoneCenterId);
    }
  }

  const finalizedNodes = nodes
    .map<TacticalNode>((node) => ({
      ...node,
      adjacency: Array.from(node.adjacency).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const nodeById = new Map(finalizedNodes.map((node) => [node.id, node]));
  const explicitZoneCosts = new Map<string, number>();
  for (const edge of explicitEdges) {
    explicitZoneCosts.set(nodeEdgeKey(edge.fromZoneId, edge.toZoneId), Math.max(0.01, edge.cost ?? 1));
  }
  const edgeCosts = new Map<string, number>();
  for (const node of finalizedNodes) {
    for (const neighborId of node.adjacency) {
      const neighbor = nodeById.get(neighborId);
      if (!neighbor) continue;
      const authoredCost = node.zoneId === neighbor.zoneId
        ? null
        : explicitZoneCosts.get(nodeEdgeKey(node.zoneId, neighbor.zoneId)) ?? null;
      edgeCosts.set(
        nodeEdgeKey(node.id, neighbor.id),
        authoredCost ?? Math.max(0.01, Math.hypot(node.x - neighbor.x, node.y - neighbor.y, node.z - neighbor.z)),
      );
    }
  }
  const finalizedZoneNodes = new Map<string, TacticalNode[]>();
  for (const [zoneId, entries] of zoneNodes.entries()) {
    finalizedZoneNodes.set(
      zoneId,
      entries
        .map((entry) => nodeById.get(entry.id))
        .filter((entry): entry is TacticalNode => Boolean(entry))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  return {
    nodes: finalizedNodes,
    nodeById,
    zoneNodes: finalizedZoneNodes,
    zoneCenterNodeIds,
    zoneAdjacency,
    zoneById,
    surfaceResolver,
    edgeCosts,
  };
}

export function findZoneForPoint(
  graph: TacticalGraph | null,
  x: number,
  z: number,
  y?: number,
): RuntimeBlockoutZone | null {
  if (!graph) return null;

  let bestMatch: RuntimeBlockoutZone | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  let bestVerticalDelta = Number.POSITIVE_INFINITY;
  for (const zone of graph.zoneById.values()) {
    if (!ZONE_TYPES.has(zone.type)) continue;
    if (!pointInRect(zone, x, z)) continue;
    const area = zone.rect.w * zone.rect.h;
    const verticalDelta = typeof y === "number"
      ? Math.abs(surfaceYForZone(graph.surfaceResolver, zone, x, z) - y)
      : 0;
    if (
      verticalDelta < bestVerticalDelta - 0.05
      || (Math.abs(verticalDelta - bestVerticalDelta) <= 0.05 && area < bestArea)
    ) {
      bestVerticalDelta = verticalDelta;
      bestArea = area;
      bestMatch = zone;
    }
  }

  return bestMatch;
}

export function findNearestTacticalNode(
  graph: TacticalGraph | null,
  x: number,
  z: number,
  predicate?: (node: TacticalNode) => boolean,
): TacticalNode | null {
  if (!graph) return null;
  let best: TacticalNode | null = null;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const node of graph.nodes) {
    if (predicate && !predicate(node)) continue;
    const dx = node.x - x;
    const dz = node.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = node;
    }
  }

  return best;
}

export function findTacticalPath(
  graph: TacticalGraph | null,
  startNodeId: string | null,
  goalNodeId: string | null,
): string[] {
  if (!graph || !startNodeId || !goalNodeId) return [];
  if (startNodeId === goalNodeId) return [startNodeId];

  const unvisited = new Set<string>(graph.nodes.map((node) => node.id));
  const distance = new Map<string, number>([[startNodeId, 0]]);
  const prev = new Map<string, string | null>([[startNodeId, null]]);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const candidateId of unvisited) {
      const candidateDistance = distance.get(candidateId) ?? Number.POSITIVE_INFINITY;
      if (candidateDistance < currentDistance) {
        currentId = candidateId;
        currentDistance = candidateDistance;
      }
    }
    if (!currentId || !Number.isFinite(currentDistance)) break;
    unvisited.delete(currentId);
    if (currentId === goalNodeId) break;
    const current = graph.nodeById.get(currentId);
    if (!current) continue;

    for (const neighborId of current.adjacency) {
      if (!unvisited.has(neighborId)) continue;
      const candidateDistance = currentDistance
        + (graph.edgeCosts.get(nodeEdgeKey(currentId, neighborId)) ?? 1);
      if (candidateDistance < (distance.get(neighborId) ?? Number.POSITIVE_INFINITY)) {
        distance.set(neighborId, candidateDistance);
        prev.set(neighborId, currentId);
      }
    }
  }

  if (prev.has(goalNodeId)) {
    const path = [goalNodeId];
    let cursor = prev.get(goalNodeId) ?? null;
    while (cursor) {
      path.push(cursor);
      cursor = prev.get(cursor) ?? null;
    }
    path.reverse();
    return path;
  }

  return [startNodeId];
}
