import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type ShutterPart = BufferGeometry;

function tintPart(geometry: ShutterPart, rgb: readonly [number, number, number]): ShutterPart {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const shift = 0.98 + (index % 4) * 0.006;
    colors[index * 3] = rgb[0] * shift;
    colors[index * 3 + 1] = rgb[1] * shift;
    colors[index * 3 + 2] = rgb[2] * shift;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

function boxPart(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  tint: readonly [number, number, number],
  rollRad = 0,
): ShutterPart {
  const geometry = new BoxGeometry(width, height, depth);
  if (rollRad !== 0) geometry.rotateZ(rollRad);
  geometry.translate(x, y, z);
  return tintPart(geometry, tint);
}

function pinPart(x: number, y: number, z: number, iron: readonly [number, number, number]): ShutterPart {
  const geometry = new CylinderGeometry(0.018, 0.016, 0.05, 8, 1, false);
  geometry.rotateX(Math.PI * 0.5);
  geometry.translate(x, y, z);
  return tintPart(geometry, iron);
}

/**
 * Normalized service shutter/door used by both authored dressing and legacy
 * prop placements. It includes its own seated backer, board shadows, battens,
 * restrained hardware, and a threshold whose bottom remains exactly at -0.5.
 */
export function createShutterGeometry(): BufferGeometry {
  const darkWood = [0.38, 0.33, 0.27] as const;
  const wood = [0.78, 0.72, 0.6] as const;
  const lightWood = [0.91, 0.85, 0.72] as const;
  const edgeWood = [0.64, 0.57, 0.47] as const;
  const iron = [0.2, 0.23, 0.24] as const;
  const parts: ShutterPart[] = [boxPart(0.98, 1, 0.11, 0, 0, -0.025, darkWood)];

  const plankCount = 6;
  const faceWidth = 0.9;
  const gap = 0.012;
  const plankWidth = (faceWidth - gap * (plankCount - 1)) / plankCount;
  for (let index = 0; index < plankCount; index += 1) {
    const x = -faceWidth * 0.5 + plankWidth * 0.5 + index * (plankWidth + gap);
    const tint = index % 2 === 0 ? wood : lightWood;
    parts.push(boxPart(plankWidth, 0.91, 0.055, x, 0, 0.06, tint));
  }

  for (const x of [-0.455, 0.455]) parts.push(boxPart(0.07, 0.94, 0.075, x, 0, 0.105, edgeWood));
  for (const y of [-0.44, 0.04, 0.42]) parts.push(boxPart(0.88, 0.072, 0.075, 0, y, 0.11, y === 0.04 ? lightWood : edgeWood));
  parts.push(boxPart(0.07, 0.76, 0.065, 0, 0, 0.135, edgeWood, -0.61));

  // Hinge straps and their pins are centered on the battens so every visible
  // metal part has an obvious structural job.
  for (const y of [-0.3, 0.3]) {
    parts.push(boxPart(0.34, 0.045, 0.04, -0.27, y, 0.17, iron));
    parts.push(pinPart(-0.445, y, 0.19, iron));
  }
  parts.push(boxPart(0.075, 0.19, 0.045, 0.29, -0.01, 0.175, iron));
  parts.push(pinPart(0.29, -0.01, 0.205, iron));

  // The threshold extends forward, but not below grade or beyond the authored
  // width. Its rear edge overlaps the seated backer to eliminate a light seam.
  parts.push(boxPart(0.98, 0.04, 0.42, 0, -0.48, 0.13, edgeWood));
  parts.push(boxPart(0.91, 0.025, 0.06, 0, -0.452, 0.17, lightWood));

  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("[map-props] failed to merge service shutter geometry");
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
