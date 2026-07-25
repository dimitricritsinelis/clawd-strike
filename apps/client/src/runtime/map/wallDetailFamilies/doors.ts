import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type PaneledDoorVariant = "residential" | "shop" | "storage" | "fortified";

type DoorPart = BufferGeometry;

function tintPart(geometry: DoorPart, rgb: readonly [number, number, number]): DoorPart {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    // A very small, deterministic per-vertex shift breaks perfectly flat
    // procedural faces while preserving the authored timber tint.
    const grain = 0.975 + (index % 5) * 0.006;
    colors[index * 3] = rgb[0] * grain;
    colors[index * 3 + 1] = rgb[1] * grain;
    colors[index * 3 + 2] = rgb[2] * grain;
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
): DoorPart {
  const part = new BoxGeometry(width, height, depth);
  if (rollRad !== 0) part.rotateZ(rollRad);
  part.translate(x, y, z);
  return tintPart(part, tint);
}

function studPart(
  radius: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  tint: readonly [number, number, number],
): DoorPart {
  const part = new CylinderGeometry(radius, radius * 0.84, depth, 8, 1, false);
  part.rotateX(Math.PI * 0.5);
  part.translate(x, y, z);
  return tintPart(part, tint);
}

function mergeDoorParts(parts: DoorPart[], label: string): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error(`[wall-detail-kit] failed to merge ${label}`);
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function createDoorVoidArchGeometry(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0);
  shape.absarc(0, 0, 0.5, 0, Math.PI, false);
  shape.lineTo(-0.5, -0.5);

  const geometry = new ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geometry.rotateY(Math.PI * 0.5);
  geometry.translate(-0.5, 0, 0);
  return geometry;
}

/**
 * A constructed leaf in normalized opening space. The rear slab reaches the
 * full authored envelope so the placement-level frame overlap cannot reveal a
 * light halo. Raised boards stop short of that envelope and expose the dark
 * backing only in narrow, believable tongue-and-groove shadow lines.
 */
export function createPaneledDoorGeometry(variant: PaneledDoorVariant): BufferGeometry {
  const timberDark = [0.7, 0.58, 0.43] as const;
  const timberBase = [0.9, 0.82, 0.68] as const;
  const timberLight = [0.98, 0.9, 0.75] as const;
  const timberEdge = [0.79, 0.68, 0.53] as const;
  const iron = [0.22, 0.24, 0.24] as const;
  const parts: DoorPart[] = [
    // This continuous seated backer is deliberate: it is the anti-halo layer.
    boxPart(1, 1, 0.12, 0, 0, -0.025, timberDark),
  ];

  const plankCount = variant === "fortified" ? 7 : variant === "shop" ? 6 : 5;
  const faceWidth = 0.91;
  const gap = variant === "fortified" ? 0.009 : 0.012;
  const plankWidth = (faceWidth - gap * (plankCount - 1)) / plankCount;
  const plankHeight = variant === "storage" || variant === "fortified" ? 0.92 : 0.9;
  for (let index = 0; index < plankCount; index += 1) {
    const x = -faceWidth * 0.5 + plankWidth * 0.5 + index * (plankWidth + gap);
    const tint = index % 3 === 0 ? timberBase : index % 3 === 1 ? timberLight : timberEdge;
    parts.push(boxPart(plankWidth, plankHeight, 0.055, x, 0, 0.06, tint));
    // Slim beads make each board edge read without the bright, detached strips
    // that previously resembled unseated leaves.
    if (index < plankCount - 1) {
      parts.push(boxPart(0.009, plankHeight * 0.97, 0.025, x + plankWidth * 0.5 + gap * 0.5, 0, 0.092, timberDark));
    }
  }

  // The perimeter is inset from the anti-halo backer, leaving a consistent
  // reveal instead of a coplanar timber edge against the masonry frame.
  for (const x of [-0.455, 0.455]) {
    parts.push(boxPart(0.072, 0.94, 0.072, x, 0, 0.1, timberEdge));
  }
  for (const y of [-0.455, 0.455]) {
    parts.push(boxPart(0.91, 0.072, 0.072, 0, y, 0.1, y > 0 ? timberLight : timberEdge));
  }

  const railHeights = variant === "residential"
    ? [-0.29, 0.29]
    : variant === "shop"
      ? [-0.3, 0.32]
      : variant === "storage"
        ? [-0.34, 0.02, 0.36]
        : [-0.37, -0.12, 0.14, 0.39];
  for (const [index, y] of railHeights.entries()) {
    const width = variant === "residential" ? 0.75 : variant === "fortified" ? 0.86 : 0.8;
    parts.push(boxPart(width, variant === "fortified" ? 0.075 : 0.065, 0.06, 0, y, 0.115, index % 2 === 0 ? timberLight : timberEdge));
  }

  if (variant === "residential") {
    // A restrained center muntin gives the domestic leaf a pair of tall inset
    // panels; the exterior frame supplies the shared facade datum.
    parts.push(boxPart(0.05, 0.72, 0.052, 0, 0, 0.122, timberLight));
  } else if (variant === "shop") {
    // Merchant doors use a durable lower kick board and a narrow meeting bead.
    parts.push(boxPart(0.82, 0.1, 0.068, 0, -0.4, 0.125, timberEdge));
    parts.push(boxPart(0.038, 0.84, 0.052, 0, 0, 0.126, timberLight));
  } else if (variant === "storage") {
    // Storage leaves are visibly workmanlike, with a single structurally
    // plausible diagonal brace landing between the lower and upper rails.
    parts.push(boxPart(0.075, 0.76, 0.064, 0, 0.01, 0.132, timberEdge, -0.63));
  } else {
    for (const direction of [-1, 1]) {
      parts.push(boxPart(0.07, 0.82, 0.065, 0, 0, 0.135, timberEdge, direction * 0.59));
    }
    // The central seam and low-contrast forged studs keep the fortified leaf
    // readable as a double gate without turning it into combat-distance noise.
    parts.push(boxPart(0.045, 0.9, 0.04, 0, 0, 0.15, iron));
    for (const x of [-0.35, -0.18, 0.18, 0.35]) {
      for (const y of [-0.37, 0.37]) parts.push(studPart(0.018, 0.045, x, y, 0.17, iron));
    }
  }

  if (variant !== "fortified") {
    // Aged forged hardware is part of the reusable leaf, not an independent
    // bright decoration. It stays inside the existing depth envelope and its
    // dark vertex role receives subdued metal response in kitMaterials.
    const latchX = variant === "shop" ? 0.29 : 0.3;
    const latchY = variant === "storage" ? 0.03 : -0.015;
    parts.push(boxPart(0.15, 0.028, 0.032, latchX - 0.055, latchY, 0.156, iron));
    parts.push(studPart(0.022, 0.032, latchX, latchY, 0.166, iron));
  }

  return mergeDoorParts(parts, `door panel (${variant})`);
}
