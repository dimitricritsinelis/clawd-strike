import { BufferGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, TorusGeometry } from "three";
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

// Instance tints and the real wood albedo still multiply these values. Keep the
// brightest rail below the old near-white multiplier: under shade that lift
// compressed the PBR grain into one tan value. This three-stop warm range
// preserves grain while separating exposed, weathered, and recessed timber.
const timberLight = [1.28, 1.04, 0.72] as const;
const timberMid = [0.9, 0.68, 0.44] as const;
const timberDark = [0.5, 0.34, 0.21] as const;
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

function frontPeg(x: number, y: number): BufferGeometry {
  const peg = new CylinderGeometry(0.012, 0.012, 0.055, 8);
  peg.rotateX(Math.PI * 0.5);
  peg.translate(x, y, -0.421);
  return tintGeometry(peg, timberDark);
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
  const openingHalfWidth = profile.underCounterOpening * 0.5;
  const parts: BufferGeometry[] = [];

  // Four continuous posts seat the canopy frame directly onto the ground.
  for (const sideX of [-1, 1] as const) {
    for (const sideZ of [-1, 1] as const) {
      parts.push(tintGeometry(
        boxPart(0.068, 0.94, 0.068, sideX * 0.46, 0, sideZ * 0.38),
        sideZ < 0 ? timberLight : timberMid,
      ));
      parts.push(tintGeometry(
        boxPart(0.105, 0.035, 0.105, sideX * 0.46, -0.47, sideZ * 0.38),
        timberDark,
      ));
    }
  }

  // A complete top ring supports the cloth; the lower side rails prevent the
  // familiar four-floating-post silhouette of placeholder market stalls.
  parts.push(tintGeometry(boxPart(0.98, 0.055, 0.075, 0, 0.45, 0.38), timberMid));
  parts.push(tintGeometry(boxPart(0.98, 0.055, 0.075, 0, 0.45, -0.38), timberLight));
  for (const sideX of [-1, 1] as const) {
    parts.push(tintGeometry(boxPart(0.075, 0.055, 0.82, sideX * 0.46, 0.45, 0), timberMid));
    parts.push(tintGeometry(boxPart(0.058, 0.055, 0.72, sideX * 0.46, -0.38, 0), timberDark));
  }

  // Counter slab, front nosing, rear curb, and visible shelf brackets read as
  // one serviceable assembly even when the stocked models are culled by LOD.
  parts.push(tintGeometry(
    boxPart(0.92, 0.055, profile.counterDepth, 0, profile.counterY, 0.04),
    [1.34, 1.1, 0.76],
  ));
  parts.push(tintGeometry(
    boxPart(0.94, 0.075, 0.055, 0, profile.counterY - 0.025, counterFrontZ),
    timberLight,
  ));
  parts.push(tintGeometry(
    boxPart(0.9, 0.065, 0.045, 0, profile.counterY + 0.015, 0.39),
    timberMid,
  ));
  for (const sideX of [-1, 1] as const) {
    parts.push(tintGeometry(angledBoxPart(
      0.042,
      0.2,
      0.06,
      sideX * 0.34,
      profile.counterY - 0.105,
      counterFrontZ + 0.035,
      sideX * 0.62,
    ), timberLight));
  }

  // The back apron gives stock a calm dark field. The framed, open front bays
  // keep the counter legible and leave the authored under-counter goods clear.
  parts.push(tintGeometry(boxPart(0.92, 0.25, 0.055, 0, -0.29, 0.37), timberMid));
  parts.push(tintGeometry(boxPart(0.82, 0.035, 0.62, 0, -0.4, 0.02), timberDark));
  parts.push(tintGeometry(boxPart(0.84, 0.05, 0.055, 0, -0.435, counterFrontZ), timberDark));
  for (const sideX of [-1, 1] as const) {
    const stileX = sideX * (openingHalfWidth + (0.42 - openingHalfWidth) * 0.5);
    parts.push(tintGeometry(
      boxPart(0.055, 0.25, 0.055, stileX, -0.3, counterFrontZ),
      timberMid,
    ));
    parts.push(tintGeometry(angledBoxPart(
      0.036,
      0.24,
      0.04,
      sideX * 0.37,
      -0.31,
      counterFrontZ - 0.01,
      sideX * 0.42,
    ), timberLight));
  }

  // A shallow upper display ledge plus front knee braces completes the retail
  // read while preserving the broad, player-readable opening below the roof.
  parts.push(tintGeometry(boxPart(0.78, 0.045, 0.25, 0, 0.04, 0.29), timberMid));
  parts.push(tintGeometry(boxPart(0.82, 0.055, 0.07, 0, -0.18, 0.39), timberDark));
  for (const sideX of [-1, 1] as const) {
    parts.push(tintGeometry(angledBoxPart(
      0.045,
      profile.braceDrop,
      0.06,
      sideX * 0.37,
      0.32,
      -0.405,
      sideX * 0.72,
    ), timberLight));
    parts.push(frontPeg(sideX * 0.46, 0.43));
    parts.push(frontPeg(sideX * 0.46, profile.counterY - 0.02));
    parts.push(frontPeg(sideX * 0.34, -0.43));
  }

  // A restrained canonical stock cluster survives model LOD/culling and makes
  // both the counter and under-counter bay read as merchandising, not empty
  // carpentry. It stays inside the existing unit envelope and leaves the front
  // service opening clear.
  parts.push(...potteryPart(-0.19, profile.counterY + 0.115, -0.02, 0.92));
  parts.push(...potteryPart(0.02, profile.counterY + 0.1, 0, 0.72));
  parts.push(...settledSackPart(0.27, -0.34, -0.04));

  return mergeProceduralGeometry(parts);
}

export function createMarketStallSlattedBackGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const [index, y] of [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4].entries()) {
    parts.push(tintGeometry(
      boxPart(0.94, 0.125, 0.22, 0, y, index % 2 === 0 ? -0.015 : 0.015),
      index % 2 === 0 ? timberMid : [1.05, 0.82, 0.53],
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

export function createMarketStallCanopyGeometry(
  ridgeSag = 0.055,
  frontDrop = 0.13,
): BufferGeometry {
  const cloth = new PlaneGeometry(1, 1, 12, 10);
  cloth.rotateX(-Math.PI * 0.5);
  const positions = cloth.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const frontSlope = -frontDrop * (0.5 - z);
    const centerSag = -ridgeSag * (1 - Math.min(1, Math.abs(x) * 2) ** 2);
    const battenSag = -0.012 * Math.sin((x + 0.5) * Math.PI) ** 2;
    const ripple = Math.sin((z + 0.5) * Math.PI * 5) * 0.009;
    positions.setY(index, frontSlope + centerSag + battenSag + ripple);
  }
  positions.needsUpdate = true;
  cloth.computeVertexNormals();
  applyGeometryTint(cloth, [1.12, 1.02, 0.9]);
  const frontHem = tintGeometry(boxPart(1, 0.035, 0.045, 0, -frontDrop - 0.01, -0.49), [1.2, 0.92, 0.62]);
  const rearHem = tintGeometry(boxPart(1, 0.03, 0.04, 0, -0.006, 0.49), [0.88, 0.68, 0.46]);
  const leftHem = tintGeometry(boxPart(0.035, 0.026, 0.96, -0.49, -frontDrop * 0.5, 0), [0.96, 0.72, 0.48]);
  const rightHem = tintGeometry(boxPart(0.035, 0.026, 0.96, 0.49, -frontDrop * 0.5, 0), [1.18, 0.9, 0.6]);
  const centerReinforcement = tintGeometry(boxPart(0.026, 0.018, 0.94, 0, -frontDrop * 0.5 - ridgeSag, 0), [0.82, 0.62, 0.42]);
  return mergeProceduralGeometry([
    cloth,
    frontHem,
    rearHem,
    leftHem,
    rightHem,
    centerReinforcement,
  ]);
}
