import type { RuntimeAnchor, RuntimeAnchorsSpec, RuntimeBlockoutSpec, RuntimeBlockoutZone } from "../map/types";
import { designYawDegToWorldYawRad } from "../map/coordinateTransforms";

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

function resolveExposureYawRad(zone: RuntimeBlockoutZone, anchor: RuntimeAnchor | null): number {
  if (anchor && typeof anchor.yawDeg === "number") {
    return designYawDegToWorldYawRad(anchor.yawDeg);
  }

  const center = zoneCenter(zone);
  const targetX = 25;
  const targetZ = 41;
  return Math.atan2(targetX - center.x, targetZ - center.z);
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

export function buildTacticalGraph(
  blockout: RuntimeBlockoutSpec,
  anchorsSpec: RuntimeAnchorsSpec | null,
): TacticalGraph {
  const zoneById = new Map(blockout.zones.map((zone) => [zone.id, zone]));
  const zoneAdjacency = new Map<string, string[]>();

  for (const zone of blockout.zones) {
    if (!ZONE_TYPES.has(zone.type)) continue;
    const neighbors: string[] = [];
    for (const other of blockout.zones) {
      if (zone.id === other.id || !ZONE_TYPES.has(other.type)) continue;
      if (zonesTouch(zone, other)) {
        neighbors.push(other.id);
      }
    }
    neighbors.sort((a, b) => a.localeCompare(b));
    zoneAdjacency.set(zone.id, neighbors);
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
      z: center.z,
      coverScore: scores.coverScore,
      flankScore: scores.flankScore,
      exposureYawRad: resolveExposureYawRad(zone, null),
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
    const node = createNode({
      id: `anchor:${anchor.id}`,
      zoneId: zone.id,
      lane: laneFromZone(zone),
      nodeType,
      x: anchor.pos.x,
      z: anchor.pos.y,
      coverScore: scores.coverScore,
      flankScore: scores.flankScore,
      exposureYawRad: resolveExposureYawRad(zone, anchor),
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

      const { aPoint, bPoint } = resolveTransitionPoints(zone, neighbor);
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
  };
}

export function findZoneForPoint(
  graph: TacticalGraph | null,
  x: number,
  z: number,
): RuntimeBlockoutZone | null {
  if (!graph) return null;

  let bestMatch: RuntimeBlockoutZone | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const zone of graph.zoneById.values()) {
    if (!pointInRect(zone, x, z)) continue;
    const area = zone.rect.w * zone.rect.h;
    if (area < bestArea) {
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

  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  const prev = new Map<string, string | null>([[startNodeId, null]]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = graph.nodeById.get(currentId);
    if (!current) continue;

    for (const neighborId of current.adjacency) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      prev.set(neighborId, currentId);
      if (neighborId === goalNodeId) {
        const path = [goalNodeId];
        let cursor: string | null = currentId;
        while (cursor) {
          path.push(cursor);
          cursor = prev.get(cursor) ?? null;
        }
        path.reverse();
        return path;
      }
      queue.push(neighborId);
    }
  }

  return [startNodeId];
}
