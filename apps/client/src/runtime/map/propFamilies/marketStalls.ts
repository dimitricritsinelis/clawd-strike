import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, PlaneGeometry, SphereGeometry, TorusGeometry } from "three";
import {
  angledBoxPart,
  applyGeometryTint,
  boxPart,
  mergeProceduralGeometry,
  tintGeometry,
} from "./propsCore";

type MarketStallProfile = {
  counterY: number;
  counterDepth: number;
  underCounterOpening: number;
  braceDrop: number;
};

const DEFAULT_STALL_PROFILE: MarketStallProfile = {
  counterY: -0.15,
  counterDepth: 0.7,
  underCounterOpening: 0.46,
  braceDrop: 0.31,
};

// Frame datums in normalized stall units (y -0.5..0.5). The canopy geometry
// reads the same values so its cloth lands on the rails.
export const FRONT_POST_TOP = 0.4;
export const REAR_POST_TOP = 0.5;
export const FRONT_RAIL_Y = FRONT_POST_TOP - 0.03;
export const REAR_RAIL_Y = REAR_POST_TOP - 0.03;

// Instance tints and the real wood albedo still multiply these values. The
// albedo is already a warm oak, so these stops are near-neutral luminance steps:
// stacking a warm vertex tint on a warm instance tint on a warm texture is what
// turned the old frame saturated red. Light is sun-bleached top surfaces, mid is
// exposed carpentry, dark is recessed or ground-contact timber.
const timberLight = [1.16, 1.12, 1.05] as const;
const timberMid = [0.94, 0.9, 0.86] as const;
const timberDark = [0.64, 0.61, 0.58] as const;
const terracotta = [0.82, 0.34, 0.18] as const;
const wovenOchre = [0.92, 0.58, 0.2] as const;

function potteryPart(x: number, y: number, z: number, scale = 1): BufferGeometry[] {
  const body = new CylinderGeometry(0.07 * scale, 0.09 * scale, 0.12 * scale, 8);
  body.translate(x, y, z);
  const neck = new CylinderGeometry(0.035 * scale, 0.05 * scale, 0.055 * scale, 8);
  neck.translate(x, y + 0.0875 * scale, z);
  const lip = new TorusGeometry(0.038 * scale, 0.009 * scale, 4, 8);
  lip.rotateX(Math.PI * 0.5);
  lip.translate(x, y + 0.115 * scale, z);
  return [body, neck, lip].map((part) => tintGeometry(part, terracotta));
}

function settledSackPart(x: number, y: number, z: number): BufferGeometry[] {
  const sack = new SphereGeometry(0.1, 8, 5);
  sack.scale(1, 0.72, 0.82);
  sack.translate(x, y, z);
  const tie = new TorusGeometry(0.035, 0.008, 4, 8);
  tie.rotateX(Math.PI * 0.5);
  tie.translate(x, y + 0.075, z);
  return [tintGeometry(sack, wovenOchre), tintGeometry(tie, timberDark)];
}

/**
 * Canonical, normalized stall carpentry. The six authored variants scale and
 * tint this assembly at the instance level, so every silhouette retains the
 * same complete construction without adding a placement or a draw call.
 */
export function createMarketStallGeometry(
  profile: MarketStallProfile = DEFAULT_STALL_PROFILE,
): BufferGeometry {
  const counterFrontZ = -profile.counterDepth * 0.5;
  const parts: BufferGeometry[] = [];

  // Four posts seat the frame on the ground. The rear pair stands taller than
  // the front pair so the cloth pitches toward the lane and sheds; the frame
  // spans -0.47..0.5 so the ridge stays inside the placement height.
  for (const sideX of [-1, 1] as const) {
    for (const sideZ of [-1, 1] as const) {
      const top = sideZ < 0 ? FRONT_POST_TOP : REAR_POST_TOP;
      parts.push(tintGeometry(
        boxPart(0.08, top + 0.47, 0.08, sideX * 0.46, (top - 0.47) * 0.5, sideZ * 0.38),
        sideZ < 0 ? timberLight : timberMid,
      ));
      parts.push(tintGeometry(
        boxPart(0.12, 0.035, 0.12, sideX * 0.46, -0.47, sideZ * 0.38),
        timberDark,
      ));
    }
  }

  // Top ring: level front and rear rails at their post heights, raked side
  // rails between them, lower side rails so the posts never read as floating.
  parts.push(tintGeometry(boxPart(1, 0.06, 0.08, 0, FRONT_RAIL_Y, -0.38), timberLight));
  parts.push(tintGeometry(boxPart(1, 0.06, 0.08, 0, REAR_RAIL_Y, 0.38), timberMid));
  const rakeRad = Math.atan2(REAR_RAIL_Y - FRONT_RAIL_Y, 0.76);
  for (const sideX of [-1, 1] as const) {
    const rail = new BoxGeometry(0.08, 0.06, 0.76 / Math.cos(rakeRad) + 0.04);
    rail.rotateX(-rakeRad);
    rail.translate(sideX * 0.46, (FRONT_RAIL_Y + REAR_RAIL_Y) * 0.5, 0);
    parts.push(tintGeometry(rail, timberMid));
    parts.push(tintGeometry(boxPart(0.06, 0.055, 0.72, sideX * 0.46, -0.38, 0), timberDark));
  }

  // Counter: a thick slab with a front nosing and rear curb, carried on a
  // boarded front apron that gives the stall a solid face to the lane. The
  // sides stay open below the counter so stored goods read from oblique views.
  parts.push(tintGeometry(
    boxPart(0.94, 0.07, profile.counterDepth, 0, profile.counterY, 0.04),
    [1.2, 1.16, 1.08],
  ));
  parts.push(tintGeometry(
    boxPart(0.96, 0.09, 0.06, 0, profile.counterY - 0.02, counterFrontZ),
    timberLight,
  ));
  parts.push(tintGeometry(
    boxPart(0.9, 0.065, 0.045, 0, profile.counterY + 0.02, 0.39),
    timberMid,
  ));
  const apronTop = profile.counterY - 0.065;
  const apronBottom = -0.435;
  const apronHeight = apronTop - apronBottom;
  const boardCount = 6;
  const boardWidth = 0.9 / boardCount;
  for (let board = 0; board < boardCount; board += 1) {
    const x = -0.45 + boardWidth * (board + 0.5);
    parts.push(tintGeometry(
      boxPart(boardWidth - 0.006, apronHeight, 0.03, x, (apronTop + apronBottom) * 0.5, counterFrontZ + 0.02 + (board % 2) * 0.008),
      board % 3 === 0 ? timberLight : board % 3 === 1 ? timberMid : [1.04, 1, 0.95],
    ));
  }
  parts.push(tintGeometry(boxPart(0.94, 0.05, 0.06, 0, apronBottom - 0.01, counterFrontZ), timberDark));
  for (const sideX of [-1, 1] as const) {
    parts.push(tintGeometry(
      boxPart(0.05, apronHeight, 0.05, sideX * 0.455, (apronTop + apronBottom) * 0.5, counterFrontZ + 0.01),
      timberMid,
    ));
  }

  // Rear apron and shelf board under the counter give stock a calm dark field.
  parts.push(tintGeometry(boxPart(0.92, 0.25, 0.055, 0, -0.29, 0.37), timberMid));
  parts.push(tintGeometry(boxPart(0.84, 0.035, 0.66, 0, -0.4, 0.02), timberDark));

  // Upper display ledge behind the counter, and knee braces from the front
  // posts to the front rail so the cloth load has a visible path to ground.
  parts.push(tintGeometry(boxPart(0.78, 0.045, 0.25, 0, 0.04, 0.29), timberMid));
  parts.push(tintGeometry(boxPart(0.82, 0.055, 0.07, 0, -0.18, 0.39), timberDark));
  for (const sideX of [-1, 1] as const) {
    parts.push(tintGeometry(angledBoxPart(
      0.045,
      profile.braceDrop,
      0.06,
      sideX * 0.37,
      FRONT_RAIL_Y - 0.14,
      -0.405,
      sideX * 0.72,
    ), timberLight));
  }

  // A restrained canonical stock cluster survives model LOD/culling and makes
  // the counter read as merchandising, not empty carpentry.
  parts.push(...potteryPart(-0.19, profile.counterY + 0.125, -0.02, 0.92));
  parts.push(...potteryPart(0.02, profile.counterY + 0.11, 0, 0.72));
  parts.push(...settledSackPart(0.27, -0.34, -0.04));

  return mergeProceduralGeometry(parts);
}

export function createMarketStallSlattedBackGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const [index, y] of [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4].entries()) {
    parts.push(tintGeometry(
      boxPart(0.94, 0.125, 0.22, 0, y, index % 2 === 0 ? -0.015 : 0.015),
      index % 2 === 0 ? timberMid : [1.02, 0.98, 0.93],
    ));
  }
  for (const x of [-0.42, 0.42]) {
    parts.push(tintGeometry(boxPart(0.08, 0.96, 0.34, x, 0, 0.02), timberDark));
  }
  parts.push(tintGeometry(boxPart(0.055, 0.9, 0.31, 0, 0, 0.015), timberDark));
  parts.push(tintGeometry(boxPart(0.9, 0.055, 0.34, 0, 0.46, 0.02), timberLight));
  parts.push(tintGeometry(boxPart(0.9, 0.055, 0.34, 0, -0.46, 0.02), timberDark));
  return mergeProceduralGeometry(parts);
}

/**
 * Pitched cloth cover in the same normalized units as the frame (instance it
 * with sy = stall height, origin at the rear ridge). It slopes from the rear
 * rail down onto the front rail, sags between the rails, droops past them,
 * and carries a scalloped skirt on the front and both sides.
 */
export function createMarketStallCanopyGeometry(
  midSag = 0.03,
  skirtDrop = 0.06,
): BufferGeometry {
  // Ridge sits 0.01 above the rear rail; the slope meets the front rail top.
  const pitch = (REAR_RAIL_Y - FRONT_RAIL_Y) / 0.76;
  const surfaceY = (x: number, z: number): number => {
    const slope = -pitch * (0.5 - z);
    const betweenRails = Math.max(0, 1 - (z / 0.38) ** 2);
    const sag = -midSag * (1 - Math.min(1, Math.abs(x) * 2) ** 2) * betweenRails;
    const droop = -0.02 * Math.max(0, (Math.abs(z) - 0.38) / 0.12) ** 1.5;
    return slope + sag + droop;
  };
  const scallop = (along: number, count: number): number =>
    0.014 * (0.5 - 0.5 * Math.cos((along + 0.5) * Math.PI * 2 * count));
  const clothTint = [1.06, 1.02, 0.96] as const;
  const hemTint = [0.66, 0.6, 0.56] as const;

  const cloth = new PlaneGeometry(1, 1, 12, 8);
  cloth.rotateX(-Math.PI * 0.5);
  const clothPositions = cloth.getAttribute("position");
  for (let index = 0; index < clothPositions.count; index += 1) {
    const x = clothPositions.getX(index);
    const z = clothPositions.getZ(index);
    clothPositions.setY(index, surfaceY(x, z) + Math.sin((x + 0.5) * Math.PI * 6) * 0.003);
  }
  clothPositions.needsUpdate = true;
  cloth.computeVertexNormals();
  applyGeometryTint(cloth, clothTint);

  // Skirts hang from the cloth edge; the bottom row is a dyed hem band.
  const skirt = (side: "front" | "left" | "right"): BufferGeometry => {
    const panel = new PlaneGeometry(1, skirtDrop, side === "front" ? 16 : 10, 2);
    const positions = panel.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index += 1) {
      const along = positions.getX(index);
      const row = positions.getY(index);
      const x = side === "front" ? along : side === "left" ? -0.5 : 0.5;
      const z = side === "front" ? -0.5 : along;
      const top = surfaceY(x, z);
      const isHem = row < -skirtDrop * 0.4;
      const y = isHem ? top - skirtDrop + scallop(along, side === "front" ? 7 : 5) : top + row + skirtDrop * 0.5;
      positions.setX(index, x);
      positions.setY(index, y);
      positions.setZ(index, z);
      const tint = isHem ? hemTint : clothTint;
      colors[index * 3] = tint[0];
      colors[index * 3 + 1] = tint[1];
      colors[index * 3 + 2] = tint[2];
    }
    positions.needsUpdate = true;
    panel.setAttribute("color", new Float32BufferAttribute(colors, 3));
    panel.computeVertexNormals();
    return panel;
  };

  const rearHem = tintGeometry(boxPart(1, 0.014, 0.02, 0, surfaceY(0, 0.5) - 0.006, 0.49), hemTint);
  return mergeProceduralGeometry([cloth, skirt("front"), skirt("left"), skirt("right"), rearHem]);
}
