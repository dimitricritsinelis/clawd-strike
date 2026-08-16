import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  TorusGeometry,
} from "three";
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

/**
 * Y scale every caller applies to the unit cloth: `ASSET_CLOTH_CANOPY`'s
 * authored `dimensionsM.height`. The unit sheet is otherwise dimensionless, so
 * every vertical figure below is authored in metres and converted through this
 * one constant instead of being tuned blind in unit space.
 */
export const CLOTH_CANOPY_UNIT_HEIGHT_M = 0.18;
/** Representative authored cloth width. Only cord and batten sections use it. */
const CLOTH_CANOPY_NOMINAL_WIDTH_M = 3.7;
/** Mid-span dip of the carrying cords below their two wall seats. */
export const CLOTH_CANOPY_SPAN_SAG_M = 0.54;
/** Cloth droop between battens, measured on the lane centreline. */
const CLOTH_CANOPY_BATTEN_SAG_M = 0.15;
/** Extra droop of the free cloth outboard of the carrying cords. */
const CLOTH_CANOPY_FLAP_DROP_M = 0.19;
/** Hanging scalloped valance below each long free edge. */
const CLOTH_CANOPY_VALANCE_DROP_M = 0.32;
/** Where the two carrying cords sit inboard of the free edges. */
const CLOTH_CANOPY_CORD_U = 0.415;
const CLOTH_CANOPY_CORD_RADIUS_M = 0.032;
const CLOTH_CANOPY_BATTEN_DEPTH_M = 0.085;
const CLOTH_CANOPY_BATTEN_THICKNESS_M = 0.055;
/** Representative authored span, used only for batten section thickness. */
const CLOTH_CANOPY_NOMINAL_SPAN_M = 11;

const CLOTH_PANEL_SAG_FACTORS = [1.06, 1.24, 0.95] as const;
const CLOTH_PANEL_TINTS = [
  [1, 0.95, 0.87],
  [0.91, 0.98, 0.93],
  [0.98, 0.9, 0.84],
] as const;
const CLOTH_U_DIVISIONS = 14;
const CLOTH_PANEL_V_DIVISIONS = 9;

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
const toUnitY = (metres: number): number => metres / CLOTH_CANOPY_UNIT_HEIGHT_M;

/**
 * Dip of the carrying cords, in metres below their wall seats, at a normalized
 * position across the span. Shared so the wall trestles, lashings and any
 * mid-span batten placed in world space land on the same curve the cloth uses.
 */
export function clothCanopySpanDropM(spanFraction: number): number {
  const t = Math.min(1, Math.abs(spanFraction) * 2);
  return CLOTH_CANOPY_SPAN_SAG_M * (1 - t * t);
}

function clothPanelIndex(v: number): number {
  for (let index = 0; index < CANOPY_SPAN_STATIONS.length - 1; index += 1) {
    if (v <= CANOPY_SPAN_STATIONS[index + 1]!) return index;
  }
  return CANOPY_SPAN_STATIONS.length - 2;
}

/** Height of the hung sheet, in unit space, at a point on the (lane, span) grid. */
function clothSurfaceUnitY(u: number, v: number): number {
  const panelIndex = clothPanelIndex(v);
  const panelStart = CANOPY_SPAN_STATIONS[panelIndex]!;
  const panelEnd = CANOPY_SPAN_STATIONS[panelIndex + 1]!;
  const t = clampUnit((v - panelStart) / Math.max(1e-6, panelEnd - panelStart));
  const battenPhase = Math.sin(t * Math.PI);
  const inboard = Math.min(1, Math.abs(u) / CLOTH_CANOPY_CORD_U);
  const betweenCords = 1 - inboard * inboard;
  const flap = Math.max(0, (Math.abs(u) - CLOTH_CANOPY_CORD_U) / (0.5 - CLOTH_CANOPY_CORD_U));
  // The sheet is lashed flat across its full width where it meets each wall
  // seat, so the free-edge flap fades out before the trestle.
  const endFade = clampUnit((0.5 - Math.abs(v)) / 0.07);
  const weave = 0.014 * Math.sin(u * Math.PI * 3 + v * Math.PI * 6.5) * betweenCords * battenPhase;
  const dropM = clothCanopySpanDropM(v)
    + CLOTH_CANOPY_BATTEN_SAG_M * CLOTH_PANEL_SAG_FACTORS[panelIndex]! * betweenCords * battenPhase
    + CLOTH_CANOPY_FLAP_DROP_M * Math.pow(flap, 1.4) * endFade
    + weave;
  return -toUnitY(dropM);
}

/** Span samples that always land exactly on every authored station. */
function clothSpanSamples(divisionsPerPanel = CLOTH_PANEL_V_DIVISIONS): number[] {
  const samples: number[] = [CANOPY_SPAN_STATIONS[0]!];
  for (let panel = 0; panel < CANOPY_SPAN_STATIONS.length - 1; panel += 1) {
    const start = CANOPY_SPAN_STATIONS[panel]!;
    const end = CANOPY_SPAN_STATIONS[panel + 1]!;
    for (let step = 1; step <= divisionsPerPanel; step += 1) {
      samples.push(start + (end - start) * (step / divisionsPerPanel));
    }
  }
  return samples;
}

/** Indexed grid over an authored (u, v) lattice with per-vertex tint and UVs. */
function buildClothSurface(
  uSamples: readonly number[],
  vSamples: readonly number[],
  height: (u: number, v: number) => number,
  tint: (u: number, v: number) => readonly [number, number, number],
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let vIndex = 0; vIndex < vSamples.length; vIndex += 1) {
    const v = vSamples[vIndex]!;
    for (let uIndex = 0; uIndex < uSamples.length; uIndex += 1) {
      const u = uSamples[uIndex]!;
      positions.push(u, height(u, v), v);
      uvs.push(u + 0.5, v + 0.5);
      colors.push(...tint(u, v));
    }
  }
  for (let vIndex = 0; vIndex < vSamples.length - 1; vIndex += 1) {
    for (let uIndex = 0; uIndex < uSamples.length - 1; uIndex += 1) {
      const a = vIndex * uSamples.length + uIndex;
      const b = a + 1;
      const c = a + uSamples.length;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Collapses a part's UVs onto one texel so shared-batch timber and cordage do
 * not pick up the cloth's stripe pattern. */
function flattenUv(geometry: BufferGeometry, u: number, v: number): BufferGeometry {
  const positions = geometry.getAttribute("position");
  const uvs = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    uvs[index * 2] = u;
    uvs[index * 2 + 1] = v;
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  return geometry;
}

/**
 * A cloth span hung between two wall seats: the two carrying cords dip on a
 * shared catenary, the sheet droops again between its battens, and the free
 * edges roll off into a scalloped valance instead of ending on a hard plate
 * edge. Every strand of the assembly is sampled from one surface function, so
 * the cords, seams, battens and valance cannot drift off the cloth they carry.
 */
export function createClothGeometry(): BufferGeometry {
  const uSamples = Array.from(
    { length: CLOTH_U_DIVISIONS + 1 },
    (_unused, index) => -0.5 + index / CLOTH_U_DIVISIONS,
  );
  // The cords and the free edges must be exact rows, and the short run of cloth
  // outboard of each cord needs its own rows or the edge fold reads as a crease.
  for (const forced of [-0.5, -CLOTH_CANOPY_CORD_U, CLOTH_CANOPY_CORD_U, 0.5]) {
    if (!uSamples.some((sample) => Math.abs(sample - forced) < 1e-6)) uSamples.push(forced);
  }
  for (const outboard of [0.44, 0.462, 0.481, 0.493]) {
    uSamples.push(-outboard, outboard);
  }
  uSamples.sort((left, right) => left - right);
  const vSamples = clothSpanSamples();
  const panelTint = (_u: number, v: number): readonly [number, number, number] =>
    CLOTH_PANEL_TINTS[clothPanelIndex(v)]!;

  const parts: BufferGeometry[] = [
    buildClothSurface(uSamples, vSamples, clothSurfaceUnitY, panelTint),
  ];

  // Free-edge valance. It grows out of the sheet edge, so it inherits the
  // catenary and never reads as a separate strip pinned to a flat plate.
  const skirtSamples = clothSpanSamples(CLOTH_PANEL_V_DIVISIONS * 3);
  for (const edgeSide of [-1, 1] as const) {
    const edgeU = edgeSide * 0.5;
    const skirt = buildClothSurface(
      [0, 0.42, 1],
      skirtSamples,
      (rowFraction, v) => {
        const scallop = 0.62 + 0.38 * Math.cos(v * Math.PI * 9 + (edgeSide < 0 ? 0.7 : 0));
        const endFade = clampUnit((0.5 - Math.abs(v)) / 0.05);
        // The skirt leaves the sheet on a curve rather than a knife fold, so the
        // hem reads as cloth turning over its cord instead of a cut polygon.
        const drop = CLOTH_CANOPY_VALANCE_DROP_M * scallop * endFade * Math.pow(rowFraction, 1.35);
        return clothSurfaceUnitY(edgeU, v) - toUnitY(drop);
      },
      panelTint,
    );
    // The skirt is authored in a (row, v) lattice; move it out onto the edge and
    // let its stripes march along the span the way the wall-end valance does.
    const skirtPositions = skirt.getAttribute("position");
    const skirtUvs = skirt.getAttribute("uv");
    for (let index = 0; index < skirtPositions.count; index += 1) {
      const row = skirtPositions.getX(index);
      const bowOut = 0.016 * Math.sin(row * Math.PI * 0.85);
      skirtPositions.setX(index, edgeU + edgeSide * bowOut);
      skirtUvs.setXY(index, (skirtPositions.getZ(index) + 0.5) * 4, row);
    }
    skirtPositions.needsUpdate = true;
    skirtUvs.needsUpdate = true;
    skirt.computeVertexNormals();
    parts.push(skirt);
  }

  // Two carrying cords and three sewn seams ride the sheet they belong to.
  const cordHalfX = CLOTH_CANOPY_CORD_RADIUS_M / CLOTH_CANOPY_NOMINAL_WIDTH_M;
  const cordHalfY = toUnitY(CLOTH_CANOPY_CORD_RADIUS_M);
  for (const cordSide of [-1, 1] as const) {
    const cordU = cordSide * CLOTH_CANOPY_CORD_U;
    const cord = buildClothSurface(
      [-1, 0, 1, 2],
      vSamples,
      (corner, v) => clothSurfaceUnitY(cordU, v)
        + cordHalfY * (corner === -1 || corner === 2 ? 0.35 : 1.55),
      () => [0.62, 0.44, 0.28] as const,
    );
    const cordPositions = cord.getAttribute("position");
    for (let index = 0; index < cordPositions.count; index += 1) {
      const corner = cordPositions.getX(index);
      cordPositions.setX(index, cordU + (corner === -1 || corner === 0 ? -cordHalfX : cordHalfX));
    }
    cordPositions.needsUpdate = true;
    cord.computeVertexNormals();
    parts.push(flattenUv(cord, 0.5, 0.5));
  }
  for (const seamU of [-0.22, 0, 0.22]) {
    const seam = buildClothSurface(
      [-1, 1],
      vSamples,
      (_corner, v) => clothSurfaceUnitY(seamU, v) - toUnitY(0.012),
      () => [0.72, 0.56, 0.4] as const,
    );
    const seamPositions = seam.getAttribute("position");
    for (let index = 0; index < seamPositions.count; index += 1) {
      seamPositions.setX(index, seamU + seamPositions.getX(index) * 0.006);
    }
    seamPositions.needsUpdate = true;
    seam.computeVertexNormals();
    parts.push(flattenUv(seam, 0.5, 0.5));
  }

  // Mid-span battens. They stop at the cords because that is what carries them,
  // and they sit proud of the cloth so the load path reads from the lane.
  const battenHalfZ = CLOTH_CANOPY_BATTEN_DEPTH_M / CLOTH_CANOPY_NOMINAL_SPAN_M * 0.5;
  const battenHeight = toUnitY(CLOTH_CANOPY_BATTEN_THICKNESS_M);
  for (const station of CANOPY_SPAN_STATIONS.slice(1, -1)) {
    const battenY = clothSurfaceUnitY(0, station) + battenHeight * 0.5;
    const batten = boxPart(
      (CLOTH_CANOPY_CORD_U + 0.045) * 2,
      battenHeight,
      battenHalfZ * 2,
      0,
      battenY,
      station,
    );
    applyGeometryTint(batten, [0.66, 0.47, 0.29]);
    parts.push(flattenUv(batten, 0.5, 0.5));
    for (const cordSide of [-1, 1] as const) {
      const lashing = boxPart(
        cordHalfX * 3.4,
        battenHeight * 1.9,
        battenHalfZ * 3.2,
        cordSide * CLOTH_CANOPY_CORD_U,
        battenY,
        station,
      );
      applyGeometryTint(lashing, [0.5, 0.36, 0.24]);
      parts.push(flattenUv(lashing, 0.5, 0.5));
    }
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
