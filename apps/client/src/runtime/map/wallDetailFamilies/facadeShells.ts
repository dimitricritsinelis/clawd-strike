import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { WallDetailInstance } from "./kitCore";

function applyFacadeWearColors(geometry: BufferGeometry): void {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const baseMask = Math.max(0, Math.min(1, (-0.18 - y) / 0.32));
    const revealMask = Math.max(0, Math.min(1, (Math.abs(x) - 0.36) / 0.14));
    const grime = Math.min(1, baseMask * 0.48 + revealMask * 0.2 + baseMask * revealMask * 0.38);
    colors[index * 3] = 1 - grime * 0.11;
    colors[index * 3 + 1] = 1 - grime * 0.16;
    colors[index * 3 + 2] = 1 - grime * 0.22;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

export function createFacadeWallShellGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(1, 1, 1);
  applyFacadeWearColors(geometry);
  return geometry;
}

export function createOpenFrontFacadeShellGeometry(): BufferGeometry {
  const parts = [
    new BoxGeometry(1, 0.08, 1),
    new BoxGeometry(1, 0.08, 1),
    new BoxGeometry(0.08, 0.84, 1),
    new BoxGeometry(0.08, 0.84, 1),
    new BoxGeometry(0.84, 0.84, 0.08),
  ];
  parts[0]!.translate(0, 0.46, 0);
  parts[1]!.translate(0, -0.46, 0);
  parts[2]!.translate(-0.46, 0, 0);
  parts[3]!.translate(0.46, 0, 0);
  parts[4]!.translate(0, 0, 0.46);
  for (const part of parts) applyFacadeWearColors(part);
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("[wall-detail-kit] failed to merge open facade shell");
  return merged;
}

export function createTwoSidedFacadePlaneGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
    0.5, 0.5, 0,
    -0.5, 0.5, 0,
    -0.5, -0.5, 0,
    -0.5, 0.5, 0,
    0.5, 0.5, 0,
    0.5, -0.5, 0,
  ], 3));
  geometry.setAttribute("normal", new Float32BufferAttribute([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
  ], 3));
  geometry.setAttribute("uv", new Float32BufferAttribute([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 0, 1, 1, 1, 1, 0,
  ], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  applyFacadeWearColors(geometry);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createFacadeBoundaryChamferGeometry(
  widthM: number,
  heightM: number,
  depthM: number,
  spec: NonNullable<WallDetailInstance["boundaryChamfer"]>,
): BufferGeometry {
  const geometry = new BoxGeometry(1, 1, 1, 1, 1, spec.topBevel ? 2 : 1).toNonIndexed();
  const positions = geometry.getAttribute("position");
  const sourceNormals = geometry.getAttribute("normal");
  const inset = Math.min(0.98, spec.runM / Math.max(widthM, 1e-6));
  const bevelHeight = spec.topBevel?.heightM ?? 0;
  const bevelDepth = spec.topBevel?.depthM ?? 0;
  const normalizedBevelHeight = bevelHeight / Math.max(heightM, 1e-6);
  const normalizedBevelDepth = bevelDepth / Math.max(depthM, 1e-6);
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const depthProgress = Math.max(0, Math.min(1, z + 0.5));
    if ((spec.exposedEnds === "left" || spec.exposedEnds === "both") && x < 0) {
      positions.setX(index, x + inset * depthProgress);
    }
    if ((spec.exposedEnds === "right" || spec.exposedEnds === "both") && x > 0) {
      positions.setX(index, x - inset * depthProgress);
    }
    if (spec.topBevel && positions.getY(index) > 0.49) {
      if (z < -0.49) {
        positions.setY(index, 0.5 - normalizedBevelHeight);
      } else if (sourceNormals.getY(index) > 0.99 && Math.abs(z) <= 1e-5) {
        positions.setZ(index, -0.5 + normalizedBevelDepth);
      }
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.userData.boundaryChamfer = {
    exposedEnds: spec.exposedEnds,
    runM: spec.runM,
    widthM,
    heightM,
    depthM,
    angleDeg: Math.atan2(depthM, Math.max(spec.runM, 1e-6)) * 180 / Math.PI,
    ...(spec.topBevel ? {
      topBevel: {
        ...spec.topBevel,
        angleDeg: Math.atan2(spec.topBevel.depthM, Math.max(spec.topBevel.heightM, 1e-6)) * 180 / Math.PI,
      },
    } : {}),
  };
  return geometry;
}
