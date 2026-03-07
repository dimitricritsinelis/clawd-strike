import { Vector3 } from "three";
import { rayVsAabb } from "../sim/collision/rayVsAabb";
import { raycastFirstHit, type RaycastAabbHit } from "../sim/collision/raycastAabb";
import type { WorldColliders } from "../sim/collision/WorldColliders";

export type LineOfSightAabb = {
  id: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export type LineOfSightScratch = {
  origin: Vector3;
  dir: Vector3;
  hit: RaycastAabbHit;
};

export function createLineOfSightScratch(): LineOfSightScratch {
  return {
    origin: new Vector3(),
    dir: new Vector3(),
    hit: {
      distance: 0,
      point: new Vector3(),
      normal: new Vector3(),
      colliderId: "",
      colliderKind: "wall",
    },
  };
}

export function hasLineOfSight(
  sourcePos: { x: number; y: number; z: number },
  sourceEyeHeightM: number,
  targetPos: { x: number; y: number; z: number },
  targetEyeHeightM: number,
  world: WorldColliders,
  blockers: readonly LineOfSightAabb[],
  scratch: LineOfSightScratch,
  ignoreBlockerIdA?: string,
  ignoreBlockerIdB?: string,
): boolean {
  const eyeX = sourcePos.x;
  const eyeY = sourcePos.y + sourceEyeHeightM;
  const eyeZ = sourcePos.z;

  const targetEyeX = targetPos.x;
  const targetEyeY = targetPos.y + targetEyeHeightM;
  const targetEyeZ = targetPos.z;

  const dx = targetEyeX - eyeX;
  const dy = targetEyeY - eyeY;
  const dz = targetEyeZ - eyeZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.01) return true;

  const maxDist = Math.max(0, dist - 0.1);
  if (maxDist <= 0) return true;

  const invDist = 1 / dist;
  const ndx = dx * invDist;
  const ndy = dy * invDist;
  const ndz = dz * invDist;

  for (const blocker of blockers) {
    if (blocker.id === ignoreBlockerIdA || blocker.id === ignoreBlockerIdB) continue;
    const hitDistance = rayVsAabb(eyeX, eyeY, eyeZ, ndx, ndy, ndz, maxDist, blocker);
    if (hitDistance < maxDist) return false;
  }

  scratch.origin.set(eyeX, eyeY, eyeZ);
  scratch.dir.set(ndx, ndy, ndz);
  return !raycastFirstHit(world, scratch.origin, scratch.dir, maxDist, scratch.hit);
}
