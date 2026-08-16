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
  // Wall-detail placement uses negative local Z for the playable/exterior
  // face. Keeping the construction-depth notation positive makes the joinery
  // layering below readable, but the actual part has to be seated on that
  // exterior side. The old positive translation put every board, rail and
  // fitting behind the continuous anti-halo backer, so cameras saw only the
  // backer's flat rear face while separately placed facade rails remained.
  part.translate(x, y, -z);
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
  part.translate(x, y, -z);
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
 * A constructed leaf in normalized opening space.
 *
 * The joinery layers are deliberately spread across the depth envelope rather
 * than stacked near one plane. At the previous offsets the frame stood only
 * 5.6 mm proud of the boards in world terms, so nothing self-shadowed and the
 * whole family read as a printed panel however its tones were set; the same
 * parts at roughly double the separation read as ledged and braced joinery. The rear slab reaches the
 * full authored envelope so the placement-level frame overlap cannot reveal a
 * light halo. Raised boards stop short of that envelope and expose the dark
 * backing only in narrow, believable tongue-and-groove shadow lines.
 */
export function createPaneledDoorGeometry(variant: PaneledDoorVariant): BufferGeometry {
  // The board tones were within 0.10 of each other, which at the leaf's own
  // albedo left every plank the same value: the whole family rendered as one
  // featureless slab with a single light stripe where the muntin sits. Widening
  // the spread is what makes a leaf read as boards rather than a panel, and it
  // costs nothing — these are vertex colours on geometry that already exists.
  const timberDark = [0.46, 0.37, 0.27] as const;
  const timberBase = [0.86, 0.76, 0.6] as const;
  const timberLight = [1.0, 0.92, 0.76] as const;
  const timberEdge = [0.68, 0.56, 0.42] as const;
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
    // Boards stand proud of the anti-halo backer by about 6 mm in world terms, not
    // the 2 mm they were left at: below that the board faces are effectively
    // coplanar with the backer, nothing self-shadows, and the leaf falls back to
    // whatever the shared plank texture happens to show at its own tile scale.
    parts.push(boxPart(plankWidth, plankHeight, 0.075, x, 0, 0.052, tint));
    // Slim beads make each board edge read without the bright, detached strips
    // that previously resembled unseated leaves.
    if (index < plankCount - 1) {
      parts.push(boxPart(0.009, plankHeight * 0.97, 0.03, x + plankWidth * 0.5 + gap * 0.5, 0, 0.095, timberDark));
    }
  }

  // The perimeter is inset from the anti-halo backer, leaving a consistent
  // reveal instead of a coplanar timber edge against the masonry frame.
  for (const x of [-0.455, 0.455]) {
    parts.push(boxPart(0.072, 0.94, 0.09, x, 0, 0.115, timberEdge));
  }
  for (const y of [-0.455, 0.455]) {
    parts.push(boxPart(0.91, 0.072, 0.09, 0, y, 0.115, y > 0 ? timberLight : timberEdge));
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
    parts.push(boxPart(width, variant === "fortified" ? 0.075 : 0.065, 0.07, 0, y, 0.14, index % 2 === 0 ? timberLight : timberEdge));
  }

  if (variant === "residential") {
    // A restrained center muntin gives the domestic leaf a pair of tall inset
    // panels; the exterior frame supplies the shared facade datum.
    parts.push(boxPart(0.05, 0.72, 0.06, 0, 0, 0.152, timberLight));
  } else if (variant === "shop") {
    // Merchant doors use a durable lower kick board and a narrow meeting bead.
    parts.push(boxPart(0.82, 0.1, 0.075, 0, -0.4, 0.155, timberEdge));
    parts.push(boxPart(0.038, 0.84, 0.058, 0, 0, 0.157, timberLight));
  } else if (variant === "storage") {
    // Storage leaves are visibly workmanlike, with a single structurally
    // plausible diagonal brace landing between the lower and upper rails.
    parts.push(boxPart(0.075, 0.76, 0.072, 0, 0.01, 0.158, timberEdge, -0.63));
  } else {
    for (const direction of [-1, 1]) {
      parts.push(boxPart(0.07, 0.82, 0.072, 0, 0, 0.158, timberEdge, direction * 0.59));
    }
    // The central seam and low-contrast forged studs keep the fortified leaf
    // readable as a double gate without turning it into combat-distance noise.
    parts.push(boxPart(0.045, 0.9, 0.045, 0, 0, 0.172, iron));
    for (const x of [-0.35, -0.18, 0.18, 0.35]) {
      for (const y of [-0.37, 0.37]) parts.push(studPart(0.018, 0.045, x, y, 0.182, iron));
    }
  }

  if (variant !== "fortified") {
    // Aged forged hardware is part of the reusable leaf, not an independent
    // bright decoration. It stays inside the existing depth envelope and its
    // dark vertex role receives subdued metal response in kitMaterials.
    const latchX = variant === "shop" ? 0.29 : 0.3;
    const latchY = variant === "storage" ? 0.03 : -0.015;
    parts.push(boxPart(0.15, 0.028, 0.032, latchX - 0.055, latchY, 0.178, iron));
    parts.push(studPart(0.022, 0.032, latchX, latchY, 0.188, iron));
    // Strap hinges. A latch on its own says "panel with a handle"; the straps
    // are what say "hung leaf", and they are the one piece of hardware readable
    // at lane distance because they cross the whole board run. Their pintles sit
    // on the hanging stile so the load path reads correctly.
    //
    // Boxes, not cylinders, and two parts per strap rather than three: the first
    // version used 8-segment `studPart` pintles and stalled the runtime's first
    // frame — SHOT_13 froze at frameCounter 16 and failed camera verification.
    // This family instances across every frontage in the map, so its per-leaf
    // part count is the one that matters.
    for (const y of variant === "storage" ? [-0.3, 0.3] : [-0.27, 0.27]) {
      parts.push(boxPart(0.44, 0.042, 0.03, -0.22, y, 0.172, iron));
      parts.push(boxPart(0.062, 0.075, 0.04, -0.442, y, 0.178, iron));
    }
  }

  return mergeDoorParts(parts, `door panel (${variant})`);
}
