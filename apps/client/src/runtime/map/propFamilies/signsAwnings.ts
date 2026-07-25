import { BoxGeometry, BufferGeometry, CylinderGeometry, PlaneGeometry, TorusGeometry } from "three";
import { applyGeometryTint, boxPart, mergeProceduralGeometry, tintGeometry } from "./propsCore";

export interface SignFrameGeometryOptions {
  frameWidth?: number;
  frameHeight?: number;
  railWidth?: number;
  panelDepth?: number;
}

export const CANOPY_SPAN_STATIONS = [-0.5, -1 / 6, 1 / 6, 0.5] as const;

/** A normalized, opening-sized sign assembly. Callers scale the unit frame to
 * the served opening; every rail, panel return, and fastener derives from that
 * same frame instead of being free-placed. */
export function createSignFrameGeometry(options: SignFrameGeometryOptions = {}): BufferGeometry {
  const frameWidth = options.frameWidth ?? 1.08;
  const frameHeight = options.frameHeight ?? 1.08;
  const railWidth = options.railWidth ?? 0.08;
  const panelDepth = options.panelDepth ?? 0.075;
  const halfWidth = frameWidth * 0.5;
  const halfHeight = frameHeight * 0.5;
  const panelWidth = frameWidth - railWidth * 2.25;
  const panelHeight = frameHeight - railWidth * 2.25;
  const parts: BufferGeometry[] = [];

  const panel = boxPart(panelWidth, panelHeight, panelDepth, 0, 0, -0.026);
  applyGeometryTint(panel, [0.42, 0.72, 0.64]);
  parts.push(panel);

  const innerTop = halfHeight - railWidth * 0.5;
  const innerSide = halfWidth - railWidth * 0.5;
  parts.push(
    tintGeometry(boxPart(frameWidth, railWidth, 0.16, 0, -innerTop, 0), [0.72, 0.48, 0.27]),
    tintGeometry(boxPart(frameWidth, railWidth, 0.16, 0, innerTop, 0), [0.78, 0.53, 0.3]),
    tintGeometry(boxPart(railWidth, panelHeight, 0.16, -innerSide, 0, 0), [0.68, 0.44, 0.24]),
    tintGeometry(boxPart(railWidth, panelHeight, 0.16, innerSide, 0, 0), [0.76, 0.5, 0.28]),
  );

  // A narrow inset bead makes the panel read as seated joinery rather than a
  // painted plane, and the four pegs justify the frame at player-eye distance.
  const bead = railWidth * 0.18;
  const beadDepth = panelDepth + 0.03;
  parts.push(
    tintGeometry(boxPart(panelWidth + bead, bead, beadDepth, 0, -panelHeight * 0.5, 0.025), [0.86, 0.63, 0.34]),
    tintGeometry(boxPart(panelWidth + bead, bead, beadDepth, 0, panelHeight * 0.5, 0.025), [0.86, 0.63, 0.34]),
    tintGeometry(boxPart(bead, panelHeight, beadDepth, -panelWidth * 0.5, 0, 0.025), [0.8, 0.56, 0.3]),
    tintGeometry(boxPart(bead, panelHeight, beadDepth, panelWidth * 0.5, 0, 0.025), [0.8, 0.56, 0.3]),
  );
  for (const x of [-innerSide, innerSide]) {
    for (const y of [-innerTop, innerTop]) {
      const peg = new CylinderGeometry(railWidth * 0.13, railWidth * 0.13, 0.14, 8, 1, false);
      peg.rotateX(Math.PI * 0.5);
      peg.translate(x, y, 0.006);
      applyGeometryTint(peg, [0.28, 0.2, 0.13]);
      parts.push(peg);
    }
  }
  return mergeProceduralGeometry(parts);
}

export function createSignRigGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const x = side * 0.36;
    const wallPlate = boxPart(0.16, 0.14, 0.09, x, 1.025, -0.105);
    applyGeometryTint(wallPlate, [0.32, 0.24, 0.16]);
    parts.push(wallPlate);
    for (const boltY of [0.985, 1.065]) {
      const bolt = new CylinderGeometry(0.022, 0.022, 0.105, 8, 1, false);
      bolt.rotateX(Math.PI * 0.5);
      bolt.translate(x, boltY, -0.045);
      applyGeometryTint(bolt, [0.2, 0.16, 0.12]);
      parts.push(bolt);
    }
    const rod = new CylinderGeometry(0.032, 0.032, 0.3, 10, 1, false);
    rod.translate(x, 0.78, -0.02);
    applyGeometryTint(rod, [0.31, 0.23, 0.15]);
    parts.push(rod);
    const lowerRing = new TorusGeometry(0.13, 0.032, 6, 14);
    lowerRing.translate(x, 0.57, 0);
    applyGeometryTint(lowerRing, [0.27, 0.2, 0.14]);
    parts.push(lowerRing);
    const upperRing = new TorusGeometry(0.11, 0.028, 6, 14);
    upperRing.rotateY(Math.PI * 0.5);
    upperRing.translate(x, 0.94, -0.02);
    applyGeometryTint(upperRing, [0.3, 0.22, 0.15]);
    parts.push(upperRing);
    const arm = new CylinderGeometry(0.026, 0.026, 0.24, 8, 1, false);
    arm.rotateX(Math.PI * 0.5);
    arm.translate(x, 1.04, 0.01);
    applyGeometryTint(arm, [0.34, 0.25, 0.16]);
    parts.push(arm);
  }
  const crown = new TorusGeometry(0.16, 0.024, 6, 16, Math.PI);
  crown.rotateZ(Math.PI);
  crown.translate(0, 1, 0);
  applyGeometryTint(crown, [0.3, 0.22, 0.14]);
  parts.push(crown);
  return mergeProceduralGeometry(parts);
}

export function createClothGeometry(): BufferGeometry {
  // One station table owns both panel extents and the support grid. Adjacent
  // bays meet exactly at the reinforced hems, so no duplicate sliver or open
  // sky gap can survive when an authored span scales to street width.
  const panelLength = 1 / 3;
  const panelCenters = CANOPY_SPAN_STATIONS.slice(0, -1).map(
    (station, index) => (station + CANOPY_SPAN_STATIONS[index + 1]!) * 0.5,
  );
  const panelSags = [1.28, 1.5, 1.18] as const;
  const panelLifts = [0.02, -0.035, 0.015] as const;
  const panelTints = [
    [1, 0.95, 0.87],
    [0.91, 0.98, 0.93],
    [0.98, 0.9, 0.84],
  ] as const;
  const parts: BufferGeometry[] = [];

  for (let panelIndex = 0; panelIndex < panelCenters.length; panelIndex += 1) {
    const panel = new PlaneGeometry(1, panelLength, 8, 5);
    panel.rotateX(-Math.PI * 0.5);
    const positions = panel.attributes.position;
    if (positions) {
      for (let index = 0; index < positions.count; index += 1) {
        const across = Math.min(1, Math.abs(positions.getX(index)) * 2);
        const along = positions.getZ(index) / panelLength + 0.5;
        const acrossTension = 1 - across * across;
        const centerTension = Math.sin(along * Math.PI);
        const sharedEdgeSag = 0.12 * acrossTension;
        const shallowRipple = Math.sin(along * Math.PI * 2 + panelIndex * 0.65)
          * 0.025
          * acrossTension
          * centerTension;
        positions.setY(
          index,
          panelLifts[panelIndex]! * centerTension
            - sharedEdgeSag
            - panelSags[panelIndex]! * acrossTension * centerTension * 0.72
            - shallowRipple,
        );
      }
      positions.needsUpdate = true;
    }
    panel.translate(0, 0, panelCenters[panelIndex]!);
    panel.computeVertexNormals();
    applyGeometryTint(panel, panelTints[panelIndex]!);
    parts.push(panel);

    const hemY = panelLifts[panelIndex]! - 0.035;
    // Reinforced longitudinal seams communicate how each bay is sewn without
    // widening the authored canopy envelope.
    for (const seamX of [-0.25, 0, 0.25]) {
      const seam = boxPart(0.012, 0.018, panelLength, seamX, hemY - 0.01, panelCenters[panelIndex]!);
      applyGeometryTint(seam, [0.68, 0.5, 0.34]);
      parts.push(seam);
    }

    const leftHem = boxPart(0.014, 0.1, panelLength, -0.493, hemY, panelCenters[panelIndex]!);
    const rightHem = boxPart(0.014, 0.1, panelLength, 0.493, hemY, panelCenters[panelIndex]!);
    applyGeometryTint(leftHem, panelTints[panelIndex]!);
    applyGeometryTint(rightHem, panelTints[panelIndex]!);
    parts.push(leftHem, rightHem);
  }

  // Exactly one hem occupies each authored station. Internal stations are no
  // longer doubled by the two adjacent panels, and their shared profile is the
  // same profile used by both panel edges.
  for (const [stationIndex, station] of CANOPY_SPAN_STATIONS.entries()) {
    const hem = new PlaneGeometry(1, 0.024, 8, 1);
    hem.rotateX(-Math.PI * 0.5);
    const hemPositions = hem.attributes.position;
    if (hemPositions) {
      for (let index = 0; index < hemPositions.count; index += 1) {
        const across = Math.min(1, Math.abs(hemPositions.getX(index)) * 2);
        hemPositions.setY(index, -0.12 * (1 - across * across) - 0.018);
      }
      hemPositions.needsUpdate = true;
    }
    hem.translate(0, 0, station);
    hem.computeVertexNormals();
    applyGeometryTint(hem, panelTints[Math.min(panelTints.length - 1, Math.max(0, stationIndex - 1))]!);
    parts.push(hem);
    const hemUnderside = hem.clone();
    hemUnderside.translate(0, -0.055, 0);
    parts.push(hemUnderside);
  }

  return mergeProceduralGeometry(parts);
}

/** Reusable hanging edge for spanning canopies: scalloped, slightly warped,
 * double-sided cloth with a reinforced top hem and finished corner tabs. */
export function createCanopyScallopedValanceGeometry(): BufferGeometry {
  const panel = new PlaneGeometry(1, 0.24, 16, 2);
  const positions = panel.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const originalY = positions.getY(index);
    if (originalY < -0.04) {
      const scallop = 0.045 * (0.5 + 0.5 * Math.cos((x + 0.5) * Math.PI * 8));
      positions.setY(index, -0.075 - scallop);
    }
    positions.setZ(index, Math.sin((x + 0.5) * Math.PI * 3) * 0.018);
  }
  positions.needsUpdate = true;
  panel.computeVertexNormals();
  applyGeometryTint(panel, [1, 0.95, 0.88]);

  const topHem = tintGeometry(boxPart(1, 0.035, 0.055, 0, 0.105, 0), [0.92, 0.82, 0.7]);
  const leftTab = tintGeometry(boxPart(0.045, 0.2, 0.065, -0.477, -0.005, 0), [0.9, 0.8, 0.68]);
  const rightTab = tintGeometry(boxPart(0.045, 0.2, 0.065, 0.477, -0.005, 0), [0.9, 0.8, 0.68]);
  const lowerCord = tintGeometry(boxPart(0.94, 0.018, 0.04, 0, -0.079, 0), [0.72, 0.52, 0.34]);
  return mergeProceduralGeometry([panel, topHem, lowerCord, leftTab, rightTab]);
}

export function createUnitRopeGeometry(axis: "x" | "y" | "z"): BufferGeometry {
  const rope = new CylinderGeometry(0.5, 0.5, 1, 6, 1, false);
  if (axis === "x") rope.rotateZ(Math.PI * 0.5);
  else if (axis === "z") rope.rotateX(Math.PI * 0.5);
  rope.computeVertexNormals();
  return rope;
}

export function createCanopyFixtureGeometry(): BufferGeometry {
  const ring = new TorusGeometry(0.09, 0.016, 6, 12);
  ring.rotateY(Math.PI * 0.5);
  ring.translate(0.455, 0.07, 0);
  const brace = new BoxGeometry(0.38, 0.035, 0.045);
  brace.rotateZ(-0.64);
  brace.translate(0.19, -0.035, 0);
  const arm = boxPart(0.46, 0.04, 0.05, 0.23, 0.07, 0);
  const lowerKnuckle = new CylinderGeometry(0.045, 0.045, 0.055, 8);
  lowerKnuckle.rotateZ(Math.PI * 0.5);
  lowerKnuckle.translate(0.055, -0.11, 0);
  const upperKnuckle = new CylinderGeometry(0.045, 0.045, 0.055, 8);
  upperKnuckle.rotateZ(Math.PI * 0.5);
  upperKnuckle.translate(0.055, 0.07, 0);
  return mergeProceduralGeometry([
    boxPart(0.055, 0.32, 0.18, 0.0275, 0, 0),
    boxPart(0.025, 0.065, 0.065, 0.061, 0.125, -0.055),
    boxPart(0.025, 0.065, 0.065, 0.061, 0.125, 0.055),
    boxPart(0.025, 0.065, 0.065, 0.061, -0.125, -0.055),
    boxPart(0.025, 0.065, 0.065, 0.061, -0.125, 0.055),
    ring,
    brace,
    arm,
    lowerKnuckle,
    upperKnuckle,
  ]);
}

/**
 * Normalized wall trestle for a full-street cloth span. The opening-derived
 * ledger and paired knee braces share one axis, so a wide canopy has a
 * camera-readable timber load path without adding gameplay collision.
 */
export function createCanopyTrestleGeometry(): BufferGeometry {
  const ledger = tintGeometry(boxPart(1, 0.12, 0.16, 0, 0.18, 0), [0.72, 0.5, 0.3]);
  const parts: BufferGeometry[] = [ledger];
  for (const side of [-1, 1] as const) {
    const wallPlate = boxPart(0.13, 0.46, 0.12, side * 0.42, -0.08, -0.015);
    const brace = boxPart(0.58, 0.075, 0.11, 0, 0, 0);
    brace.rotateZ(side * -0.62);
    brace.translate(side * 0.25, -0.045, 0.035);
    const peg = new CylinderGeometry(0.035, 0.035, 0.18, 8, 1, false);
    peg.rotateX(Math.PI * 0.5);
    peg.translate(side * 0.42, 0.18, 0.055);
    parts.push(
      tintGeometry(wallPlate, [0.62, 0.42, 0.25]),
      tintGeometry(brace, [0.68, 0.46, 0.27]),
      tintGeometry(peg, [0.24, 0.2, 0.16]),
    );
  }
  return mergeProceduralGeometry(parts);
}
