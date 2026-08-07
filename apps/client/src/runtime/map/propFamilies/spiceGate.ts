import { BufferGeometry, Float32BufferAttribute } from "three";
import {
  angledBoxPart,
  boxPart,
  mergeProceduralGeometry,
  tintGeometry,
} from "./propsCore";

/**
 * Spice Gate: the lane-spanning masonry portal that terminates Spawn A and
 * opens Spice Street.
 *
 * The kit is authored in metres and normalized into the unit cube that the
 * dressing instancer scales. Its front elevation (-Z) is the spawn-facing hero
 * face; +Z looks back down the market.
 *
 * Traversal safety: every solid element below {@link CORBEL_BOTTOM_Y_M} stays
 * outside ±{@link CLEAR_HALF_M}, which is the authored 12 m walkable throat.
 * The corbels, arch, spandrel, and bridge storey occupy only the air above
 * that clearance, and the asset carries no collision, so route width,
 * grounding, projectile paths, and player sightlines are untouched.
 */
export const SPICE_GATE_REFERENCE_WIDTH_M = 12.8;
export const SPICE_GATE_REFERENCE_HEIGHT_M = 9.1;
export const SPICE_GATE_REFERENCE_DEPTH_M = 1.9;

/** Half-width of the protected walkable throat (world x 21 m .. 33 m). */
export const CLEAR_HALF_M = 6;
const HALF_W_M = SPICE_GATE_REFERENCE_WIDTH_M * 0.5;
const HALF_D_M = SPICE_GATE_REFERENCE_DEPTH_M * 0.5;

/** Outer face plane: piers, voussoirs, cornice, and copings sit here. */
const FACE_Z_M = HALF_D_M;
/** Recessed wall field, giving the ring and trim 0.12 m of real relief. */
const FIELD_Z_M = HALF_D_M - 0.12;

/**
 * Corbelled haunches step inboard from the responds so the arch springs from a
 * visible bracket instead of spanning the raw 12 m mouth. Their soffit is at
 * 4.2 m: more than twice standing height, and non-colliding.
 */
const CORBEL_BOTTOM_Y_M = 4.05;
const SPRING_Y_M = 4.62;
const ARCH_HALF_SPAN_M = 4.2;
const ARCH_RISE_M = 2.3;
const RING_THICKNESS_M = 0.52;

/**
 * Three-centred (basket-handle) arch.
 *
 * A wide, low opening cannot use a two-centred pointed arch: with a rise
 * smaller than the half-span, both arcs peak at the haunches and dip at the
 * centre, so the crown reads as a heart-shaped notch instead of a keystone. A
 * basket handle solves it properly — tight arcs at the haunches for a vertical
 * springing, one long arc across the crown so the apex really is the highest
 * point, and tangent continuity at the junction so there is no visible kink.
 */
const HAUNCH_RADIUS_M = 1.6;
const HAUNCH_CENTER_X_M = ARCH_HALF_SPAN_M - HAUNCH_RADIUS_M;
/** Haunch sweep, solved for tangency with the crown arc. */
const HAUNCH_SWEEP_RAD = (() => {
  let lo = 0.01;
  let hi = Math.PI * 0.5 - 0.01;
  for (let step = 0; step < 200; step += 1) {
    const mid = (lo + hi) * 0.5;
    const k = HAUNCH_CENTER_X_M / Math.cos(mid);
    if (k * (1 - Math.sin(mid)) - (ARCH_RISE_M - HAUNCH_RADIUS_M) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
})();
const CROWN_RADIUS_M =
  HAUNCH_CENTER_X_M / Math.cos(HAUNCH_SWEEP_RAD) + HAUNCH_RADIUS_M;
/** Crown arc centre, measured from the springing line. */
const CROWN_CENTER_Y_M =
  SPRING_Y_M + (HAUNCH_RADIUS_M - CROWN_RADIUS_M) * Math.sin(HAUNCH_SWEEP_RAD);
const JUNCTION_X_M = HAUNCH_CENTER_X_M + HAUNCH_RADIUS_M * Math.cos(HAUNCH_SWEEP_RAD);
const CROWN_SWEEP_RAD = Math.asin(JUNCTION_X_M / CROWN_RADIUS_M);
const HAUNCH_ARC_LENGTH_M = HAUNCH_RADIUS_M * HAUNCH_SWEEP_RAD;
const CROWN_ARC_LENGTH_M = CROWN_RADIUS_M * CROWN_SWEEP_RAD;
const HALF_ARC_LENGTH_M = HAUNCH_ARC_LENGTH_M + CROWN_ARC_LENGTH_M;
/** Outermost x the ring reaches, where it lands on the corbel. */
const ARCH_OUTER_REACH_M = ARCH_HALF_SPAN_M + RING_THICKNESS_M;

type ArchSample = {
  x: number;
  y: number;
  /** Outward radial unit vector, used to offset the ring off the intrados. */
  normalX: number;
  normalY: number;
  /** Direction of travel from springing toward the crown. */
  tangentRad: number;
};

/**
 * Sample the right-hand half-arch by arc length, `t` running 0 at the springing
 * to 1 at the apex. Laying voussoirs on this keeps every stone a true radial
 * wedge across both arcs.
 */
function sampleArch(t: number): ArchSample {
  const s = t * HALF_ARC_LENGTH_M;
  if (s <= HAUNCH_ARC_LENGTH_M) {
    const theta = s / HAUNCH_RADIUS_M;
    return {
      x: HAUNCH_CENTER_X_M + HAUNCH_RADIUS_M * Math.cos(theta),
      y: SPRING_Y_M + HAUNCH_RADIUS_M * Math.sin(theta),
      normalX: Math.cos(theta),
      normalY: Math.sin(theta),
      tangentRad: Math.PI * 0.5 + theta,
    };
  }
  const psi = CROWN_SWEEP_RAD - (s - HAUNCH_ARC_LENGTH_M) / CROWN_RADIUS_M;
  return {
    x: CROWN_RADIUS_M * Math.sin(psi),
    y: CROWN_CENTER_Y_M + CROWN_RADIUS_M * Math.cos(psi),
    normalX: Math.sin(psi),
    normalY: Math.cos(psi),
    tangentRad: Math.PI - psi,
  };
}

// The basket handle's extrados peaks at the crown (7.44 m) and falls away
// monotonically, so the horizontal bands sit clear of the ring everywhere and
// the whole storey can come back down by 0.3 m.
const SPANDREL_TOP_M = 7.9;
const STRING_COURSE_TOP_M = 8.06;
const CORNICE_TOP_M = 8.34;
const PARAPET_TOP_M = 8.7;
const COPING_TOP_M = 8.8;
const ACCENT_TOP_M = 9.04;

const PIER_INNER_X_M = CLEAR_HALF_M;
const PIER_PLINTH_TOP_M = 0.62;

/** Voussoirs per half-arch, sized to ~0.46 m stones along the ring. */
const VOUSSOIRS_PER_HALF = 12;
/** Fine columns let the wall field follow the extrados and open real voids. */
const FIELD_COLUMN_COUNT = 64;

/**
 * One bay per flank: a blind niche carrying a shuttered opening above it. The
 * pointed arch occupies the whole centre of the elevation, so the only honest
 * place for openings is the haunch wall outboard of the extrados.
 */
const BAY_CENTER_X_M = 5.36;
const WINDOW_SILL_Y_M = 6.4;
const WINDOW_HEIGHT_M = 0.95;
const WINDOW_HALF_WIDTH_M = 0.33;
const WINDOW_CENTERS_X_M = [BAY_CENTER_X_M] as const;
const WINDOW_REVEAL_Z_M = 0.42;
/** Wall-lamp bracket height on the blank haunch wall below each bay window. */
const BRACKET_Y_M = 5.5;

type Tone = readonly [number, number, number];

// Tones are multipliers on the batch's district tint (ph_sandstone_blocks_05,
// #dfc69a). Keeping the field near 1.0 puts the gate in the same warm ochre
// family as the flanking courtyard pylons instead of reading as a cool grey
// module snapped onto them.
// Lit values deepened. These sat at 1.00-1.18 — authored as if every face were
// in sun — while the kit's own shade values below are authored properly dark.
// On the Spawn-A approach that made the gate the brightest large mass in frame
// rather than the dark frame the composition needs.
// Warm-biased at the same luminance. Deepening these uniformly got the gate's
// VALUE right but took its chroma with it — measured saturation fell to 0.318
// against the target's 0.518, and its red-to-blue ratio to 1.51 where the
// target's gate sits at 1.83, matching the sandstone walls beyond it. Dark
// sandstone in shade is warm brown, not neutral grey, so the red-blue spread
// is widened here rather than the overall level being raised again.
const STONE_FIELD: Tone = [0.67, 0.6, 0.5];
const STONE_FIELD_ALT: Tone = [0.6, 0.53, 0.44];
const STONE_PIER: Tone = [0.71, 0.64, 0.54];
const STONE_PIER_ALT: Tone = [0.58, 0.51, 0.42];
const STONE_TRIM: Tone = [0.77, 0.69, 0.58];
const STONE_KEYSTONE: Tone = [0.82, 0.73, 0.61];
/** Shaded masonry: undersides, reveals, and the arch barrel. */
const STONE_SOFFIT: Tone = [0.3, 0.27, 0.23];
const STONE_SOFFIT_ALT: Tone = [0.37, 0.33, 0.28];
const STONE_SOFFIT_EDGE: Tone = [0.48, 0.43, 0.36];
/** Fake contact occlusion under projecting trim and in wall-to-wall crevices. */
const STONE_UNDERSHADE: Tone = [0.36, 0.32, 0.27];
const STONE_CREVICE: Tone = [0.24, 0.21, 0.18];
const STONE_CREVICE_SOFT: Tone = [0.52, 0.47, 0.41];
const STONE_SHADED: Tone = [0.66, 0.6, 0.52];
const STONE_THRESHOLD: Tone = [0.6, 0.57, 0.53];
const STONE_THRESHOLD_WORN: Tone = [0.47, 0.44, 0.4];
const SAND_DRIFT: Tone = [0.98, 0.92, 0.78];
const RUBBLE: Tone = [0.78, 0.72, 0.62];
const TABLET_GROUND: Tone = [0.36, 0.46, 0.47];

const TIMBER_BEAM: Tone = [0.5, 0.37, 0.25];
const TIMBER_BEAM_END: Tone = [0.34, 0.25, 0.17];
const TIMBER_SHUTTER: Tone = [0.24, 0.44, 0.44];
const TIMBER_SHUTTER_EDGE: Tone = [0.15, 0.29, 0.3];
const IRON_DARK: Tone = [0.16, 0.15, 0.13];
const LANTERN_GLASS: Tone = [0.98, 0.79, 0.44];
const PENNANT_WARM: Tone = [0.86, 0.34, 0.19];
const PENNANT_PALE: Tone = [0.92, 0.78, 0.5];

const VOID_DARK: Tone = [0.035, 0.032, 0.028];

/**
 * Height of the arch boundary at `x`, offset `radialOffset` outward from the
 * intrados. Evaluated piecewise: the haunch arc governs outboard of the
 * junction, the crown arc inboard of it, and the two are taken as a max in the
 * overlap so the ring's outer edge never opens a seam.
 */
function archBoundaryY(x: number, radialOffset: number): number {
  const absX = Math.abs(x);
  let best = Number.NEGATIVE_INFINITY;

  const haunchRadius = HAUNCH_RADIUS_M + radialOffset;
  const haunchOffset = absX - HAUNCH_CENTER_X_M;
  const haunchInside = haunchRadius * haunchRadius - haunchOffset * haunchOffset;
  if (absX >= JUNCTION_X_M - 0.001 && haunchInside > 0) {
    best = Math.max(best, SPRING_Y_M + Math.sqrt(haunchInside));
  }

  const crownRadius = CROWN_RADIUS_M + radialOffset;
  const crownInside = crownRadius * crownRadius - absX * absX;
  if (crownInside > 0) {
    best = Math.max(best, CROWN_CENTER_Y_M + Math.sqrt(crownInside));
  }

  return best === Number.NEGATIVE_INFINITY ? SPRING_Y_M : Math.max(best, SPRING_Y_M);
}

/** Underside of the arch: the surface that forms the soffit tunnel. */
function intradosY(x: number): number {
  return archBoundaryY(x, 0);
}

/** Back of the voussoir ring, where the spandrel wall starts. */
function extradosY(x: number): number {
  return archBoundaryY(x, RING_THICKNESS_M);
}

function isInsideWindow(x: number): boolean {
  return WINDOW_CENTERS_X_M.some(
    (center) => Math.abs(Math.abs(x) - center) < WINDOW_HALF_WIDTH_M,
  );
}

/**
 * Replace per-box 0..1 UVs with a box-projected mapping in metres.
 *
 * Every part of this kit is authored at true size, so projecting from metre
 * positions makes one texture tile cover `tileSizeM` of real wall no matter how
 * large or small the piece is. Without this, a 0.07 m hinge and a 2 m wall
 * column would each stretch a whole tile across their own face and the gate
 * would read at the wrong material scale. Must run before {@link normalize}
 * rescales the geometry out of metre space.
 */
function applyWorldBoxUv(geometry: BufferGeometry, tileSizeM: number): BufferGeometry {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = new Float32Array(position.count * 2);
  const inv = 1 / tileSizeM;
  for (let index = 0; index < position.count; index += 1) {
    const absX = Math.abs(normal.getX(index));
    const absY = Math.abs(normal.getY(index));
    const absZ = Math.abs(normal.getZ(index));
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    let u: number;
    let v: number;
    if (absY >= absX && absY >= absZ) {
      u = x;
      v = z;
    } else if (absX >= absZ) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[index * 2] = u * inv;
    uv[index * 2 + 1] = v * inv;
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

function normalize(geometry: BufferGeometry): BufferGeometry {
  // Author in metres with y measured from the paving, then recentre into the
  // unit cube the instancer scales by (width, height, depth).
  geometry.translate(0, -SPICE_GATE_REFERENCE_HEIGHT_M * 0.5, 0);
  geometry.scale(
    1 / SPICE_GATE_REFERENCE_WIDTH_M,
    1 / SPICE_GATE_REFERENCE_HEIGHT_M,
    1 / SPICE_GATE_REFERENCE_DEPTH_M,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function box(
  parts: BufferGeometry[],
  tone: Tone,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): void {
  if (width <= 0 || height <= 0 || depth <= 0) return;
  parts.push(tintGeometry(boxPart(width, height, depth, x, y, z), tone));
}

function angledBox(
  parts: BufferGeometry[],
  tone: Tone,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rollRad: number,
): void {
  parts.push(tintGeometry(angledBoxPart(width, height, depth, x, y, z, rollRad), tone));
}

/** Thin dark band tucked under a projecting element to fake contact occlusion. */
function pushUndershade(
  parts: BufferGeometry[],
  width: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): void {
  box(parts, STONE_UNDERSHADE, width, 0.05, depth, x, y, z);
}

/**
 * Both abutment responds, from paving to corbel. They wrap the solid corner
 * nubs outside the throat, so the span reads as carried rather than floating.
 * The innermost plane is exactly the authored wall line at ±CLEAR_HALF_M.
 */
function pushResponds(parts: BufferGeometry[]): void {
  for (const side of [-1, 1] as const) {
    const outerX = side * HALF_W_M;
    const innerX = side * PIER_INNER_X_M;
    const fullWidth = HALF_W_M - PIER_INNER_X_M;
    const fullCenterX = (outerX + innerX) * 0.5;
    // The shaft is inset 0.06 m from the wall line so plinth, quoins, and
    // corbel can project without ever reaching into the lane.
    const shaftWidth = fullWidth - 0.06;
    const shaftCenterX = fullCenterX + side * 0.03;

    box(parts, STONE_PIER_ALT, fullWidth, PIER_PLINTH_TOP_M, HALF_D_M * 2,
      fullCenterX, PIER_PLINTH_TOP_M * 0.5, 0);
    box(parts, STONE_TRIM, fullWidth, 0.09, HALF_D_M * 2 - 0.04,
      fullCenterX, PIER_PLINTH_TOP_M + 0.045, 0);

    box(parts, STONE_PIER, shaftWidth, CORBEL_BOTTOM_Y_M - PIER_PLINTH_TOP_M - 0.09,
      HALF_D_M * 2 - 0.12,
      shaftCenterX, (PIER_PLINTH_TOP_M + 0.09 + CORBEL_BOTTOM_Y_M) * 0.5, 0);

    // Quoin courses at ~0.62 m, matching the flanking facade coursing instead
    // of the megalithic block scale of the old corner piers.
    for (const [index, y] of [1.05, 1.67, 2.29, 2.91, 3.53].entries()) {
      box(parts, index % 2 === 0 ? STONE_PIER : STONE_PIER_ALT,
        fullWidth, 0.12, HALF_D_M * 2, fullCenterX, y, 0);
    }

    // Contact wear: a low drift of blown sand and two settled stones tuck the
    // respond into the paving instead of guillotining into it.
    box(parts, SAND_DRIFT, 1.05, 0.16, HALF_D_M * 2 - 0.1,
      innerX - side * 0.34, 0.08, 0);
    box(parts, SAND_DRIFT, 0.68, 0.09, HALF_D_M * 2 + 0.3,
      innerX - side * 0.2, 0.045, 0);
    box(parts, RUBBLE, 0.22, 0.13, 0.19, innerX - side * 0.52, 0.065, -0.42);
    box(parts, RUBBLE, 0.16, 0.1, 0.15, innerX - side * 0.31, 0.05, 0.55);
    box(parts, RUBBLE, 0.13, 0.08, 0.12, innerX - side * 0.72, 0.04, -0.86);
    // Two boards left leaning against the respond, and a broken kerb stone.
    for (const [index, board] of [
      { offset: 0.24, width: 0.09, height: 0.28, lean: 0.22, z: -0.62 },
      { offset: 0.4, width: 0.07, height: 0.22, lean: 0.3, z: -0.5 },
    ].entries()) {
      parts.push(tintGeometry(
        angledBoxPart(board.width, board.height, 0.035,
          innerX - side * board.offset, board.height * 0.42, board.z,
          side * (board.lean + index * 0.05)),
        index === 0 ? TIMBER_BEAM : TIMBER_BEAM_END,
      ));
    }
    box(parts, STONE_THRESHOLD_WORN, 0.34, 0.11, 0.26,
      innerX - side * 0.62, 0.055, 0.24);
  }
}

/**
 * Full-height quoin returns and a crevice shadow at each end of the gate.
 *
 * Without these the gate wall butts flat against the courtyard pylon and dies
 * in a raw vertical seam with no return, no interlock, and no occlusion — the
 * single clearest tell that the span was snapped on rather than built into the
 * wall it lands against.
 */
function pushEndReturns(parts: BufferGeometry[]): void {
  const fullWidth = HALF_W_M - PIER_INNER_X_M;
  for (const side of [-1, 1] as const) {
    const outerX = side * HALF_W_M;
    const innerX = side * PIER_INNER_X_M;
    const fullCenterX = (outerX + innerX) * 0.5;

    // Alternating quoins from paving to cornice: every other course pulls back
    // so the corner visibly toothes into the neighbouring masonry.
    const courseHeight = 0.62;
    for (let index = 0; ; index += 1) {
      const y0 = index * courseHeight;
      if (y0 >= CORNICE_TOP_M) break;
      const y1 = Math.min(CORNICE_TOP_M, y0 + courseHeight);
      const short = index % 2 === 1;
      const width = short ? fullWidth * 0.62 : fullWidth;
      box(parts, short ? STONE_PIER_ALT : STONE_PIER,
        width, (y1 - y0) - 0.03, HALF_D_M * 2 + (short ? -0.05 : 0.01),
        outerX - side * width * 0.5, (y0 + y1) * 0.5 - 0.015, 0);
    }

    // Crevice occlusion in the joint itself, plus a soft falloff band inboard.
    // This is the contact shading a baked pass would give the corner.
    box(parts, STONE_CREVICE, 0.05, CORNICE_TOP_M, HALF_D_M * 2 + 0.03,
      innerX - side * 0.02, CORNICE_TOP_M * 0.5, 0);
    for (const faceSign of [-1, 1] as const) {
      box(parts, STONE_CREVICE, 0.1, CORNICE_TOP_M, 0.04,
        innerX - side * 0.05, CORNICE_TOP_M * 0.5, faceSign * (FACE_Z_M + 0.02));
      box(parts, STONE_CREVICE_SOFT, 0.26, CORNICE_TOP_M, 0.03,
        innerX - side * 0.23, CORNICE_TOP_M * 0.5, faceSign * (FACE_Z_M + 0.015));
    }

    // Terminal pilaster capping the elevation so the cornice returns onto a
    // finished corner instead of ending in a paper edge.
    box(parts, STONE_TRIM, fullWidth + 0.1, 0.16, HALF_D_M * 2 + 0.04,
      fullCenterX - side * 0.05, CORNICE_TOP_M - 0.08, 0);
    pushUndershade(parts, fullWidth + 0.08, HALF_D_M * 2 + 0.02,
      fullCenterX - side * 0.05, CORNICE_TOP_M - 0.18, 0);

    // Ground-line darkening where the gate meets the paving.
    box(parts, STONE_CREVICE_SOFT, fullWidth + 0.5, 0.14, HALF_D_M * 2 + 0.05,
      fullCenterX - side * 0.25, 0.07, 0);
  }
}

/**
 * Four-course corbelled haunch per side. Each course cantilevers further
 * inboard than the one below it, so the bracket has a legible load path back
 * into the respond, and the arch gains a real springing point 1.8 m inboard of
 * the wall line.
 */
function pushCorbels(parts: BufferGeometry[]): void {
  const step = (CLEAR_HALF_M - ARCH_HALF_SPAN_M) / 4;
  const courseHeight = (SPRING_Y_M - CORBEL_BOTTOM_Y_M) / 4;
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 4; index += 1) {
      const innerX = CLEAR_HALF_M - step * (index + 1);
      const y0 = CORBEL_BOTTOM_Y_M + courseHeight * index;
      const y1 = y0 + courseHeight;
      const width = HALF_W_M - innerX;
      const centerX = side * (innerX + width * 0.5);
      box(parts, index % 2 === 0 ? STONE_TRIM : STONE_PIER,
        width, y1 - y0, HALF_D_M * 2,
        centerX, (y0 + y1) * 0.5, 0);
      // Each step's exposed soffit gets its own occlusion band.
      pushUndershade(parts, width - 0.02, HALF_D_M * 2 - 0.02,
        centerX, y0 + 0.02, 0);
    }
  }
}

/**
 * Basket-handle arch ring: a full-depth structural barrel plus proud voussoir
 * rings on both elevations. The barrel is what puts a deep dark value into this
 * camera; the rings give it readable ~0.44 m masonry.
 */
function pushArchRing(parts: BufferGeometry[]): void {
  // Voussoirs are struck radially and stepped by arc length, so every stone is
  // a true wedge across both the haunch and crown arcs and none pokes through
  // the extrados.
  const stoneArc = HALF_ARC_LENGTH_M / VOUSSOIRS_PER_HALF;
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < VOUSSOIRS_PER_HALF; index += 1) {
      const sample = sampleArch((index + 0.5) / VOUSSOIRS_PER_HALF);
      const ringOffset = RING_THICKNESS_M * 0.5;
      const centerX = side * (sample.x + sample.normalX * ringOffset);
      const centerY = sample.y + sample.normalY * ringOffset;
      // Local +X follows the tangent, local +Y the radius.
      const rollRad = side > 0 ? sample.tangentRad : Math.PI - sample.tangentRad;
      const radialUnitX = side * sample.normalX;
      const radialUnitY = sample.normalY;

      // Structural barrel: spans the full gate depth and forms the soffit. Kept
      // deliberately dark so the 1.9 m tunnel reads as shade, not as a flat
      // ring. Alternating tone per stone keeps the soffit coursed rather than
      // reading as one smooth ribbon under the arch.
      angledBox(parts, index % 2 === 0 ? STONE_SOFFIT : STONE_SOFFIT_ALT,
        stoneArc * 1.06, RING_THICKNESS_M * 1.04, FIELD_Z_M * 2,
        centerX, centerY, 0, rollRad);

      // Recessed transverse joint carrying the voussoir divisions through the
      // soffit, so the barrel is visibly built from the same stones as the ring.
      const joint = sampleArch(index / VOUSSOIRS_PER_HALF);
      angledBox(parts, VOID_DARK, 0.035, RING_THICKNESS_M * 0.8, FIELD_Z_M * 2 - 0.05,
        side * (joint.x + joint.normalX * ringOffset),
        joint.y + joint.normalY * ringOffset,
        0, side > 0 ? joint.tangentRad : Math.PI - joint.tangentRad);

      // A slightly lighter lip at each mouth keeps the barrel from reading as a
      // black hole and shows the soffit actually turning the corner.
      const lipOffset = RING_THICKNESS_M * 0.16;
      for (const faceSign of [-1, 1] as const) {
        angledBox(parts, STONE_SOFFIT_EDGE, stoneArc * 1.02, RING_THICKNESS_M * 0.3, 0.14,
          side * (sample.x + sample.normalX * lipOffset),
          sample.y + sample.normalY * lipOffset,
          faceSign * (FIELD_Z_M - 0.07), rollRad);
      }

      // Proud voussoirs on both elevations, alternating tone and reach.
      for (const faceSign of [-1, 1] as const) {
        const long = index % 2 === 0;
        const height = RING_THICKNESS_M * (long ? 1 : 0.86);
        const offset = long ? 0 : RING_THICKNESS_M * 0.06;
        angledBox(parts, long ? STONE_TRIM : STONE_FIELD_ALT,
          stoneArc * 0.9, height, 0.26,
          centerX - radialUnitX * offset, centerY - radialUnitY * offset,
          faceSign * (FACE_Z_M - 0.13), rollRad);
      }
    }
  }

  // Keystone, seated on the crown. Its underside sits exactly on the
  // intrados so it closes the joint where the two arcs meet instead of hanging
  // below the soffit as a loose block.
  // A crown arc this long lays its stones nearly tangent, so without a wide
  // block breaking the extrados upward the head reads as a flat lintel wearing
  // an arch-shaped skin. The keystone has to be the widest stone in the ring
  // and has to project past the extrados into the spandrel.
  const keystoneHeight = RING_THICKNESS_M * 1.62;
  const keystoneCenterY = intradosY(0) + 0.04 + keystoneHeight * 0.5;
  // Full-depth seating stone first, so the cusp is closed from inside the
  // tunnel as well as on both elevations.
  box(parts, STONE_SOFFIT_ALT, 0.5, keystoneHeight, FIELD_Z_M * 2,
    0, keystoneCenterY, 0);
  for (const faceSign of [-1, 1] as const) {
    const z = faceSign * (FACE_Z_M - 0.17);
    box(parts, STONE_KEYSTONE, 0.66, keystoneHeight, 0.34, 0, keystoneCenterY, z);
    // Chamfered cap and a shadow under the projecting shoulders.
    box(parts, STONE_TRIM, 0.78, 0.09, 0.3,
      0, keystoneCenterY + keystoneHeight * 0.5 - 0.045, z);
    pushUndershade(parts, 0.7, 0.3, 0, intradosY(0) + 0.02, z);
    box(parts, STONE_TRIM, 0.5, 0.12, 0.26,
      0, keystoneCenterY + keystoneHeight * 0.5 + 0.06, z);
  }

  // Impost band carried a short way onto the spandrel, tying arch to corbel.
  for (const side of [-1, 1] as const) {
    for (const faceSign of [-1, 1] as const) {
      const z = faceSign * (FACE_Z_M - 0.09);
      box(parts, STONE_TRIM, 1.5, 0.15, 0.2,
        side * (ARCH_OUTER_REACH_M + 0.3), SPRING_Y_M + 0.06, z);
      pushUndershade(parts, 1.5, 0.18, side * (ARCH_OUTER_REACH_M + 0.3), SPRING_Y_M - 0.03, z);
    }
  }
}

/**
 * The masonry field from the springing to the string course, built as fine
 * columns so it follows the extrados exactly and can open real window voids
 * instead of burying them inside solid stone.
 */
function pushWallField(parts: BufferGeometry[]): void {
  const step = (HALF_W_M * 2) / FIELD_COLUMN_COUNT;
  const windowHeadY = WINDOW_SILL_Y_M + WINDOW_HEIGHT_M;
  for (let index = 0; index < FIELD_COLUMN_COUNT; index += 1) {
    const centerX = -HALF_W_M + step * (index + 0.5);
    const baseY = Math.abs(centerX) >= ARCH_OUTER_REACH_M
      ? SPRING_Y_M
      : extradosY(centerX) - 0.06;
    if (baseY >= SPANDREL_TOP_M) continue;
    const tone = index % 3 === 0 ? STONE_FIELD_ALT : STONE_FIELD;

    // The window is a true hole through the full 1.66 m thickness, so the
    // neighbouring columns become its jambs.
    if (isInsideWindow(centerX) && windowHeadY < SPANDREL_TOP_M) {
      box(parts, tone, step, Math.max(0, WINDOW_SILL_Y_M - baseY), FIELD_Z_M * 2,
        centerX, (baseY + WINDOW_SILL_Y_M) * 0.5, 0);
      box(parts, tone, step, SPANDREL_TOP_M - windowHeadY, FIELD_Z_M * 2,
        centerX, (windowHeadY + SPANDREL_TOP_M) * 0.5, 0);
    } else {
      box(parts, tone, step, SPANDREL_TOP_M - baseY, FIELD_Z_M * 2,
        centerX, (baseY + SPANDREL_TOP_M) * 0.5, 0);
    }

    // Grade the two courses immediately above the ring darker: the extrados
    // shelf is where a real arch collects its deepest dirt and shade.
    if (Math.abs(centerX) < ARCH_OUTER_REACH_M) {
      for (const faceSign of [-1, 1] as const) {
        box(parts, STONE_SHADED, step, 0.3, 0.05,
          centerX, baseY + 0.15, faceSign * (FIELD_Z_M + 0.02));
      }
    }

    // Coursing lines are drawn per column and clipped to the wall that exists
    // there. Running them as one full-width bar left a paper-thin band floating
    // straight across the open arch void.
    for (const courseY of [6.6, 7.6]) {
      if (courseY <= baseY + 0.1 || courseY >= SPANDREL_TOP_M - 0.1) continue;
      if (isInsideWindow(centerX) && courseY > WINDOW_SILL_Y_M && courseY < windowHeadY) {
        continue;
      }
      for (const faceSign of [-1, 1] as const) {
        box(parts, STONE_SHADED, step, 0.08, 0.06,
          centerX, courseY, faceSign * (FIELD_Z_M + 0.02));
      }
    }
  }
}

/**
 * Four small openings in the bridge storey: stone surrounds, projecting sills,
 * and 0.42 m reveals. They give the span an inhabited read and put genuine
 * dark values into the upper half of the elevation.
 */
function pushWindowStone(parts: BufferGeometry[]): void {
  const width = WINDOW_HALF_WIDTH_M * 2;
  const centerY = WINDOW_SILL_Y_M + WINDOW_HEIGHT_M * 0.5;
  const headY = WINDOW_SILL_Y_M + WINDOW_HEIGHT_M;
  for (const side of [-1, 1] as const) {
    for (const centerAbsX of WINDOW_CENTERS_X_M) {
      const x = side * centerAbsX;
      // Shaded reveal returns just inside the mouth: the jamb, head, and sill
      // faces of a 1.66 m thick wall never catch the same light as the
      // elevation, and this is what makes the opening read as depth.
      for (const jambSide of [-1, 1] as const) {
        box(parts, STONE_SOFFIT_EDGE, 0.04, WINDOW_HEIGHT_M, WINDOW_REVEAL_Z_M,
          x + jambSide * (WINDOW_HALF_WIDTH_M - 0.02), centerY,
          -FIELD_Z_M + WINDOW_REVEAL_Z_M * 0.5);
      }
      // Sun catches the head of a deep reveal; leaving it as dark as the jambs
      // collapsed the whole opening into an unreadable black rectangle.
      box(parts, STONE_SHADED, WINDOW_HALF_WIDTH_M * 2, 0.05, WINDOW_REVEAL_Z_M,
        x, headY - 0.025, -FIELD_Z_M + WINDOW_REVEAL_Z_M * 0.5);
      box(parts, STONE_TRIM, WINDOW_HALF_WIDTH_M * 2, 0.04, 0.1,
        x, headY - 0.02, -FIELD_Z_M + 0.05);
      box(parts, STONE_SHADED, WINDOW_HALF_WIDTH_M * 2, 0.04, WINDOW_REVEAL_Z_M,
        x, WINDOW_SILL_Y_M + 0.02, -FIELD_Z_M + WINDOW_REVEAL_Z_M * 0.5);

      for (const faceSign of [-1, 1] as const) {
        const z = faceSign * (FIELD_Z_M + 0.04);
        for (const jambSide of [-1, 1] as const) {
          box(parts, STONE_TRIM, 0.16, WINDOW_HEIGHT_M + 0.3, 0.14,
            x + jambSide * (WINDOW_HALF_WIDTH_M + 0.08), centerY + 0.02, z);
        }
        box(parts, STONE_TRIM, width + 0.48, 0.17, 0.14, x, headY + 0.085, z);
        pushUndershade(parts, width + 0.4, 0.16, x, headY - 0.005, z);
        box(parts, STONE_SHADED, width + 0.66, 0.09, 0.08, x, headY + 0.23, z);
        // Projecting sill with a drip course under it.
        box(parts, STONE_TRIM, width + 0.54, 0.13, 0.24,
          x, WINDOW_SILL_Y_M - 0.065, faceSign * (FIELD_Z_M + 0.09));
        pushUndershade(parts, width + 0.5, 0.22, x, WINDOW_SILL_Y_M - 0.145,
          faceSign * (FIELD_Z_M + 0.08));
      }
    }
  }
}

/**
 * Wall-lamp corbel on the blank haunch wall below each bay window.
 *
 * The bay is only 1.3 m wide between the arch extrados and the corner pier, so
 * a second opening there crowded the ring and read as an unframed slot. A
 * bracket with a visible corbel stone gives the wall an element at a smaller
 * scale, adds a warm accent, and keeps a legible load path into the masonry.
 */
function pushBayBrackets(parts: BufferGeometry[]): void {
  for (const side of [-1, 1] as const) {
    const x = side * BAY_CENTER_X_M;
    // Corbel stone stepping out of the wall face.
    box(parts, STONE_TRIM, 0.42, 0.16, 0.2, x, BRACKET_Y_M, -(FIELD_Z_M + 0.09));
    box(parts, STONE_FIELD_ALT, 0.3, 0.12, 0.12, x, BRACKET_Y_M - 0.13, -(FIELD_Z_M + 0.05));
    pushUndershade(parts, 0.44, 0.22, x, BRACKET_Y_M - 0.09, -(FIELD_Z_M + 0.08));
    // A shallow blind panel above it grades the otherwise bare haunch wall.
    box(parts, STONE_SHADED, 0.62, 0.5, 0.04, x, BRACKET_Y_M + 0.48, -(FIELD_Z_M + 0.01));
    for (const jambSide of [-1, 1] as const) {
      box(parts, STONE_TRIM, 0.1, 0.62, 0.08,
        x + jambSide * 0.36, BRACKET_Y_M + 0.48, -(FIELD_Z_M + 0.03));
    }
    box(parts, STONE_TRIM, 0.82, 0.1, 0.08, x, BRACKET_Y_M + 0.79, -(FIELD_Z_M + 0.03));
  }
}

/**
 * String course, projecting timber joist ends, cornice, and a pierced roof
 * screen. This is the silhouette that closes the sky hole above the exit and
 * lifts the low east frontage up to the taller west block.
 */
function pushCrown(parts: BufferGeometry[]): void {
  box(parts, STONE_TRIM, SPICE_GATE_REFERENCE_WIDTH_M,
    STRING_COURSE_TOP_M - SPANDREL_TOP_M, (FIELD_Z_M + 0.07) * 2,
    0, (SPANDREL_TOP_M + STRING_COURSE_TOP_M) * 0.5, 0);
  for (const faceSign of [-1, 1] as const) {
    pushUndershade(parts, SPICE_GATE_REFERENCE_WIDTH_M, 0.14,
      0, SPANDREL_TOP_M - 0.005, faceSign * (FIELD_Z_M + 0.06));
  }

  box(parts, STONE_PIER, SPICE_GATE_REFERENCE_WIDTH_M,
    CORNICE_TOP_M - STRING_COURSE_TOP_M, HALF_D_M * 2,
    0, (STRING_COURSE_TOP_M + CORNICE_TOP_M) * 0.5, 0);
  // Recessed panels of deliberately uneven width relieve what was otherwise a
  // 12.8 m unbroken sheet of one stone texture above the joist course.
  {
    const panelY = (STRING_COURSE_TOP_M + CORNICE_TOP_M) * 0.5;
    const panelHeight = (CORNICE_TOP_M - STRING_COURSE_TOP_M) * 0.52;
    const panels = [
      { x: -5.0, width: 1.5 },
      { x: -3.1, width: 1.9 },
      { x: -0.9, width: 1.9 },
      { x: 1.3, width: 1.6 },
      { x: 3.3, width: 2.1 },
      { x: 5.2, width: 1.4 },
    ] as const;
    for (const panel of panels) {
      for (const faceSign of [-1, 1] as const) {
        const z = faceSign * (HALF_D_M - 0.05);
        box(parts, STONE_UNDERSHADE, panel.width, panelHeight, 0.06, panel.x, panelY, z);
        box(parts, STONE_FIELD_ALT, panel.width - 0.1, panelHeight - 0.07, 0.04,
          panel.x, panelY, faceSign * (HALF_D_M - 0.09));
      }
    }
  }
  for (const faceSign of [-1, 1] as const) {
    pushUndershade(parts, SPICE_GATE_REFERENCE_WIDTH_M, 0.18,
      0, STRING_COURSE_TOP_M - 0.005, faceSign * (HALF_D_M - 0.02));
    box(parts, STONE_TRIM, SPICE_GATE_REFERENCE_WIDTH_M, 0.07, 0.1,
      0, CORNICE_TOP_M - 0.05, faceSign * (HALF_D_M - 0.03));
  }

  // Pierced roof screen: a lattice of small square voids, built as gapped
  // columns. Reads as a terrace screen instead of a castle battlement.
  const screenDepth = HALF_D_M * 2 - 0.4;
  const screenBottom = CORNICE_TOP_M;
  const pierceBottom = screenBottom + 0.12;
  const pierceTop = PARAPET_TOP_M - 0.1;
  const bays = 16;
  const bayWidth = (SPICE_GATE_REFERENCE_WIDTH_M - 0.5) / bays;
  const screenLeft = -(SPICE_GATE_REFERENCE_WIDTH_M - 0.5) * 0.5;
  box(parts, STONE_FIELD, SPICE_GATE_REFERENCE_WIDTH_M, 0.12, screenDepth,
    0, screenBottom + 0.06, 0);
  box(parts, STONE_FIELD, SPICE_GATE_REFERENCE_WIDTH_M, PARAPET_TOP_M - pierceTop, screenDepth,
    0, (pierceTop + PARAPET_TOP_M) * 0.5, 0);
  for (let index = 0; index <= bays; index += 1) {
    const x = screenLeft + bayWidth * index;
    box(parts, index % 2 === 0 ? STONE_PIER : STONE_FIELD_ALT,
      bayWidth * 0.42, pierceTop - pierceBottom, screenDepth,
      x, (pierceBottom + pierceTop) * 0.5, 0);
  }
  // Outer returns close the screen against the responds.
  for (const side of [-1, 1] as const) {
    box(parts, STONE_PIER, 0.34, PARAPET_TOP_M - screenBottom, screenDepth,
      side * (HALF_W_M - 0.17), (screenBottom + PARAPET_TOP_M) * 0.5, 0);
  }

  box(parts, STONE_TRIM, SPICE_GATE_REFERENCE_WIDTH_M, COPING_TOP_M - PARAPET_TOP_M,
    screenDepth + 0.22, 0, (PARAPET_TOP_M + COPING_TOP_M) * 0.5, 0);

  // Roof accents at deliberately uneven heights and spacings so the skyline is
  // not a ruled line. A leaning pole and a small stack finish the terrace.
  const accents = [
    { x: -5.4, height: 0.2, width: 0.86 },
    { x: -3.1, height: 0.1, width: 0.62 },
    { x: -0.5, height: 0.26, width: 1.02 },
    { x: 2.7, height: 0.13, width: 0.7 },
    { x: 5.1, height: 0.22, width: 0.92 },
  ] as const;
  for (const [index, accent] of accents.entries()) {
    box(parts, index % 2 === 0 ? STONE_PIER : STONE_FIELD,
      accent.width, accent.height, screenDepth - 0.04,
      accent.x, COPING_TOP_M + accent.height * 0.5, 0);
    box(parts, STONE_TRIM, accent.width + 0.08, 0.05, screenDepth,
      accent.x, COPING_TOP_M + accent.height + 0.025, 0);
  }
  // A roof stack breaks the terrace silhouette off-centre. Its cap defines the
  // top of the authored envelope.
  const stackHeight = ACCENT_TOP_M - 0.06 - COPING_TOP_M;
  box(parts, STONE_FIELD_ALT, 0.5, stackHeight, 0.5,
    3.9, COPING_TOP_M + stackHeight * 0.5, 0.1);
  box(parts, STONE_TRIM, 0.6, 0.06, 0.6, 3.9, ACCENT_TOP_M - 0.03, 0.1);
}

/**
 * Inscription frieze over the crown. Gives the centre of the composition a
 * focal detail and the only non-stone hue on the gate.
 */
function pushInscriptionFrieze(parts: BufferGeometry[]): void {
  // Carried on the string course. Anywhere lower and it would float across the
  // open arch, and the spandrel beside the crown is occupied by the ring.
  const y = (SPANDREL_TOP_M + STRING_COURSE_TOP_M) * 0.5;
  for (const faceSign of [-1, 1] as const) {
    const z = faceSign * (FIELD_Z_M + 0.05);
    box(parts, STONE_TRIM, 3.6, 0.15, 0.12, 0, y, z + faceSign * 0.04);
    box(parts, TABLET_GROUND, 3.3, 0.09, 0.06, 0, y, z + faceSign * 0.09);
    for (const offset of [-1.26, -0.76, -0.26, 0.26, 0.76, 1.26]) {
      box(parts, STONE_TRIM, 0.12, 0.055, 0.03, offset, y, z + faceSign * 0.11);
    }
    pushUndershade(parts, 3.6, 0.14, 0, y - 0.09, z + faceSign * 0.04);
  }
}

/**
 * Threshold sill under the gate.
 *
 * The previous version was a single pale plane butting the cobbles on a dead
 * straight seam with no edge thickness, which read as a decal rather than laid
 * stone. This one is a darker sill field bounded by two chamfered kerbs, with a
 * contact-occlusion band hugging the whole span and heavier grime in the tread
 * path. It stays under 0.09 m and carries no collision, so it never becomes a
 * step players can feel.
 */
function pushThreshold(parts: BufferGeometry[]): void {
  const width = SPICE_GATE_REFERENCE_WIDTH_M;
  const sillDepth = HALF_D_M * 2 - 0.34;

  // Contact occlusion across the whole gate line, widest at the mouth.
  box(parts, STONE_CREVICE, width, 0.012, HALF_D_M * 2 + 0.5, 0, 0.006, 0);
  box(parts, STONE_CREVICE_SOFT, width, 0.014, HALF_D_M * 2 + 1.1, 0, 0.007, 0);

  // Sand fillet banked against both pier feet. Wall bases in a desert market
  // never meet the paving on a clean line.
  for (const side of [-1, 1] as const) {
    for (const [index, fillet] of [
      { reach: 1.5, height: 0.1 },
      { reach: 0.95, height: 0.16 },
      { reach: 0.5, height: 0.22 },
    ].entries()) {
      box(parts, index === 2 ? SAND_DRIFT : RUBBLE,
        fillet.reach, fillet.height, HALF_D_M * 2 + 0.7 - index * 0.2,
        side * (CLEAR_HALF_M - fillet.reach * 0.5 + 0.05), fillet.height * 0.5, 0);
    }
  }

  // Sill field: coursed, distinctly darker and greyer than the courtyard cobble.
  const bayCount = 9;
  const bayWidth = width / bayCount;
  for (let index = 0; index < bayCount; index += 1) {
    const x = -width * 0.5 + bayWidth * (index + 0.5);
    box(parts, index % 2 === 0 ? STONE_THRESHOLD : STONE_THRESHOLD_WORN,
      bayWidth - 0.03, 0.035, sillDepth, x, 0.0175, 0);
  }

  // Two kerbs with a real chamfer, so the sill has visible edge thickness where
  // it meets the paving instead of dying in a razor line.
  for (const faceSign of [-1, 1] as const) {
    const kerbZ = faceSign * (HALF_D_M - 0.11);
    box(parts, STONE_THRESHOLD_WORN, width, 0.075, 0.22, 0, 0.0375, kerbZ);
    box(parts, STONE_TRIM, width, 0.02, 0.16, 0, 0.085, kerbZ);
    // Hard shadow line under the projecting kerb lip.
    box(parts, STONE_CREVICE, width, 0.05, 0.05,
      0, 0.025, kerbZ + faceSign * 0.135);
    box(parts, STONE_CREVICE, width, 0.016, 0.24,
      0, 0.008, kerbZ + faceSign * 0.24);
  }

  // Tread path: grime and wear where players actually funnel through the arch.
  box(parts, STONE_CREVICE_SOFT, 5.2, 0.04, sillDepth - 0.06, 0, 0.02, 0);
  box(parts, STONE_THRESHOLD_WORN, 3.1, 0.042, sillDepth - 0.12, -0.3, 0.021, 0);
}

/**
 * Pennant line strung across the arch below the crown.
 *
 * The taller pointed head opened a wide blank sky slot in the middle of the
 * primary camera. A rope tied into the soffit at both haunches fills that dead
 * air with market identity and reads as an attached, tensioned element rather
 * than a floating card.
 */
function pushPennantLine(parts: BufferGeometry[]): void {
  const anchorX = 3;
  const anchorY = intradosY(anchorX) - 0.22;
  // Shallow sag on purpose: a deeper curve drops the rope close enough to the
  // market awning behind it that the two silhouettes fuse at wider aspects.
  const crownY = anchorY - 0.42;
  const z = -0.34;
  const count = 15;
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const x = -anchorX + anchorX * 2 * t;
    // Catenary-ish sag between the two soffit anchors.
    // Catenary sag between the two soffit eyelets.
    const ropeY = anchorY + (crownY - anchorY) * Math.sin(Math.PI * t);
    const nextT = (index + 1) / (count - 1);
    const nextX = -anchorX + anchorX * 2 * nextT;
    const nextY = anchorY + (crownY - anchorY) * Math.sin(Math.PI * nextT);
    if (index < count - 1) {
      const dx = nextX - x;
      const dy = nextY - ropeY;
      angledBox(parts, IRON_DARK, Math.hypot(dx, dy), 0.035, 0.035,
        x + dx * 0.5, ropeY + dy * 0.5, z, Math.atan2(dy, dx));
    }
    if (index === 0 || index === count - 1) {
      // Iron ring bolted into the soffit at each end of the run.
      box(parts, IRON_DARK, 0.07, 0.16, 0.07, x, ropeY + 0.08, z);
      box(parts, IRON_DARK, 0.12, 0.06, 0.12, x, ropeY + 0.17, z);
      // Whipped knot and a short tail below the eyelet.
      box(parts, TIMBER_BEAM_END, 0.07, 0.09, 0.07, x, ropeY - 0.02, z);
      box(parts, IRON_DARK, 0.03, 0.17, 0.03,
        x + (index === 0 ? 0.04 : -0.04), ropeY - 0.13, z);
      continue;
    }
    // Two pennants are missing from the run, and no two neighbours share a
    // width, drop, or tone: a perfectly even array reads as a stamp.
    if (index === 4 || index === 10) continue;
    const drop = 0.26 + ((index * 7) % 5) * 0.055;
    const flagWidth = 0.2 + ((index * 3) % 4) * 0.035;
    const tone = index % 4 === 0
      ? TIMBER_SHUTTER
      : index % 4 === 1
        ? PENNANT_WARM
        : index % 4 === 2 ? PENNANT_PALE : TIMBER_SHUTTER_EDGE;
    // Alternate pennants hang slightly off the rope's plane so the run has
    // thickness rather than reading as one flat card.
    const skew = ((index % 3) - 1) * 0.03;
    box(parts, tone, flagWidth, drop, 0.018, x, ropeY - drop * 0.5 - 0.02, z + skew);
    box(parts, IRON_DARK, flagWidth + 0.03, 0.03, 0.026, x, ropeY - 0.02, z + skew);
  }
}

export function createSpiceGateStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushThreshold(parts);
  pushResponds(parts);
  pushEndReturns(parts);
  pushCorbels(parts);
  pushArchRing(parts);
  pushWallField(parts);
  pushBayBrackets(parts);
  pushWindowStone(parts);
  pushInscriptionFrieze(parts);
  pushCrown(parts);
  // ph_sandstone_blocks_05 is authored at a 2.0 m tile, matching the flanking
  // facade walls.
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/** Teal shutters, iron fixings, joist ends, and the two soffit lanterns. */
export function createSpiceGateFixtureGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const centerY = WINDOW_SILL_Y_M + WINDOW_HEIGHT_M * 0.5;

  // The four openings are deliberately not clones: each gets its own closure
  // state so the bridge storey reads as lived in rather than array-copied.
  for (const side of [-1, 1] as const) {
    for (const [index, centerAbsX] of WINDOW_CENTERS_X_M.entries()) {
      const x = side * centerAbsX;
      const variant = (side === -1 ? 0 : 2) + index;
      for (const faceSign of [-1, 1] as const) {
        const z = faceSign * (FIELD_Z_M - 0.06);

        if (variant === 1) {
          // One opening is boarded across with salvaged planks.
          for (const [plankIndex, plankY] of [-0.26, 0, 0.26].entries()) {
            box(parts, plankIndex === 1 ? TIMBER_SHUTTER_EDGE : TIMBER_BEAM,
              WINDOW_HALF_WIDTH_M * 2 + 0.06, 0.19 + plankIndex * 0.012, 0.05,
              x, centerY + plankY, z);
          }
          continue;
        }

        const ajar = variant === 0 || variant === 3;
        for (const leaf of [-1, 1] as const) {
          const swing = ajar && leaf === 1 ? 0.1 : 0;
          const leafWidth = WINDOW_HALF_WIDTH_M - 0.02 - swing * 0.6;
          box(parts, TIMBER_SHUTTER, leafWidth, WINDOW_HEIGHT_M - 0.06, 0.05,
            x + leaf * (WINDOW_HALF_WIDTH_M * 0.5), centerY,
            z - faceSign * swing * 0.6);
          for (const railY of [-0.24, 0.24]) {
            box(parts, TIMBER_SHUTTER_EDGE, leafWidth, 0.06, 0.065,
              x + leaf * (WINDOW_HALF_WIDTH_M * 0.5), centerY + railY,
              z - faceSign * swing * 0.6);
          }
        }
        // Hinge pintles carry the leaves back into the stone jamb.
        for (const hingeY of [-0.24, 0.24]) {
          for (const hingeSide of [-1, 1] as const) {
            box(parts, IRON_DARK, 0.08, 0.05, 0.1,
              x + hingeSide * (WINDOW_HALF_WIDTH_M - 0.02), centerY + hingeY,
              z + faceSign * 0.06);
          }
        }
        // One sill carries a laundry pole hooked across the reveal.
        if (variant === 2 && faceSign === -1) {
          box(parts, IRON_DARK, WINDOW_HALF_WIDTH_M * 2 + 0.12, 0.04, 0.04,
            x, WINDOW_SILL_Y_M + WINDOW_HEIGHT_M - 0.12, z - 0.18);
          for (const [clothIndex, clothX] of [-0.16, 0.02, 0.18].entries()) {
            box(parts, clothIndex === 1 ? TIMBER_SHUTTER : TIMBER_SHUTTER_EDGE,
              0.13, 0.3 + clothIndex * 0.05, 0.02,
              x + clothX, WINDOW_SILL_Y_M + WINDOW_HEIGHT_M - 0.3 - clothIndex * 0.025,
              z - 0.19);
          }
        }
      }
    }
  }

  // Projecting joist ends under the string course: the regional roof-structure
  // tell, and a row of small cast shadows across a long flat band. Projection,
  // tone, sag, and one missing beam vary by index so the row reads as built
  // rather than as an array modifier run once.
  const joistCount = 15;
  const joistSpan = SPICE_GATE_REFERENCE_WIDTH_M - 1.2;
  for (let index = 0; index < joistCount; index += 1) {
    // A rotted-out beam leaves a socket instead of a joist.
    if (index === 4) continue;
    const x = -joistSpan * 0.5 + (joistSpan * index) / (joistCount - 1);
    const reach = 0.28 + ((index * 7) % 5) * 0.028;
    const drop = ((index * 5) % 3) * 0.018;
    const thickness = 0.15 + ((index * 3) % 4) * 0.012;
    const weathered = index % 3 === 0;
    for (const faceSign of [-1, 1] as const) {
      box(parts, weathered ? TIMBER_BEAM_END : TIMBER_BEAM,
        thickness, 0.19, reach,
        x, SPANDREL_TOP_M - 0.16 - drop,
        faceSign * (FIELD_Z_M + reach * 0.35));
      box(parts, TIMBER_BEAM_END, thickness + 0.01, 0.2, 0.05,
        x, SPANDREL_TOP_M - 0.16 - drop,
        faceSign * (FIELD_Z_M + reach * 0.7 + 0.04));
    }
  }

  // Two lanterns hung from the arch soffit. They sit far above head height and
  // never leave the gate's depth envelope.
  for (const side of [-1, 1] as const) {
    const x = side * 2.6;
    const dropTop = intradosY(x) - 0.02;
    // Long chains: the taller pointed head lifted the soffit, and short drops
    // pushed the lanterns out of the player-eye framing entirely.
    const bodyTop = dropTop - 1.32;
    box(parts, IRON_DARK, 0.07, 0.1, 0.07, x, dropTop - 0.05, 0);
    box(parts, IRON_DARK, 0.035, 1.26, 0.035, x, dropTop - 0.67, 0);
    box(parts, IRON_DARK, 0.3, 0.06, 0.3, x, bodyTop, 0);
    box(parts, LANTERN_GLASS, 0.22, 0.3, 0.22, x, bodyTop - 0.18, 0);
    for (const cornerX of [-1, 1] as const) {
      for (const cornerZ of [-1, 1] as const) {
        box(parts, IRON_DARK, 0.035, 0.32, 0.035,
          x + cornerX * 0.11, bodyTop - 0.17, cornerZ * 0.11);
      }
    }
    box(parts, IRON_DARK, 0.26, 0.05, 0.26, x, bodyTop - 0.35, 0);
  }

  // Wall lamps on the bay corbels. The corbel stones were already built into
  // the haunch wall but carried nothing, so each flank had a bracket that
  // stopped halfway through its own assembly - the reference hangs an iron lamp
  // off exactly this stone. The arm reaches out from the corbel top, the hanger
  // drops from its ring, and the body sits well above head height inside the
  // gate's existing depth envelope.
  for (const side of [-1, 1] as const) {
    const x = side * BAY_CENTER_X_M;
    const armZ = -(FIELD_Z_M + 0.09);
    const armReachM = 0.34;
    const armTipZ = armZ - armReachM;
    // Horizontal arm off the corbel, with a diagonal stay back to the wall.
    box(parts, IRON_DARK, 0.06, 0.06, armReachM + 0.1, x, BRACKET_Y_M + 0.13,
      (armZ + armTipZ) * 0.5);
    box(parts, IRON_DARK, 0.05, 0.05, 0.05, x, BRACKET_Y_M + 0.13, armTipZ);
    // Knee brace under the arm, stepped back to the wall face.
    box(parts, IRON_DARK, 0.045, 0.16, 0.17, x, BRACKET_Y_M + 0.02,
      armZ - armReachM * 0.28);
    box(parts, IRON_DARK, 0.045, 0.1, 0.1, x, BRACKET_Y_M - 0.05, armZ - 0.06);
    // Hanger dropping to the lamp head.
    const headY = BRACKET_Y_M - 0.24;
    box(parts, IRON_DARK, 0.03, 0.3, 0.03, x, BRACKET_Y_M - 0.02, armTipZ);
    box(parts, IRON_DARK, 0.24, 0.05, 0.24, x, headY, armTipZ);
    box(parts, LANTERN_GLASS, 0.17, 0.26, 0.17, x, headY - 0.16, armTipZ);
    for (const cornerX of [-1, 1] as const) {
      for (const cornerZ of [-1, 1] as const) {
        box(parts, IRON_DARK, 0.03, 0.28, 0.03,
          x + cornerX * 0.085, headY - 0.15, armTipZ + cornerZ * 0.085);
      }
    }
    box(parts, IRON_DARK, 0.2, 0.045, 0.2, x, headY - 0.31, armTipZ);
    box(parts, IRON_DARK, 0.05, 0.08, 0.05, x, headY - 0.37, armTipZ);
  }

  // One hung textile on the west haunch wall. The reference breaks these long
  // blank stone flanks with a single large cloth rather than repeating trim, and
  // hanging it on only one side keeps the exit from reading as a mirrored pair.
  // It is carried on a visible iron pole with two rings, and stops well above
  // the corbel so it never crosses the bay window or the arch ring.
  {
    const bannerX = -(BAY_CENTER_X_M + 1.02);
    const bannerZ = -(FIELD_Z_M + 0.05);
    const poleY = 5.02;
    const bannerHalfW = 0.52;
    box(parts, IRON_DARK, bannerHalfW * 2 + 0.3, 0.055, 0.055, bannerX, poleY, bannerZ - 0.06);
    for (const ringSide of [-1, 1] as const) {
      box(parts, IRON_DARK, 0.05, 0.16, 0.05,
        bannerX + ringSide * (bannerHalfW + 0.11), poleY - 0.06, bannerZ - 0.03);
    }
    box(parts, PENNANT_WARM, bannerHalfW * 2, 1.52, 0.035,
      bannerX, poleY - 0.82, bannerZ - 0.06);
    // Woven bands and a fringed hem, so the cloth has an edge instead of
    // stopping mid-air.
    for (const [bandIndex, bandY] of [-0.22, 0.24, 0.7].entries()) {
      box(parts, bandIndex === 1 ? PENNANT_PALE : TIMBER_SHUTTER_EDGE,
        bannerHalfW * 2 - 0.06, 0.12, 0.045,
        bannerX, poleY - 0.82 - bandY, bannerZ - 0.065);
    }
    for (let fringe = 0; fringe < 7; fringe += 1) {
      box(parts, PENNANT_PALE, 0.055, 0.13, 0.03,
        bannerX - bannerHalfW + 0.09 + fringe * ((bannerHalfW * 2 - 0.18) / 6),
        poleY - 1.64, bannerZ - 0.06);
    }
  }

  pushPennantLine(parts);

  // ph_rough_pine_door is authored at a 2.0 m tile, which lands the shutter
  // boards at a believable plank width.
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/**
 * Unlit interior behind the four window reveals. It starts behind the shutter
 * leaves and runs to the back of the wall, so the openings read as rooms
 * rather than as painted-on panels.
 */
export function createSpiceGateVoidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const centerY = WINDOW_SILL_Y_M + WINDOW_HEIGHT_M * 0.5;
  const backZ0 = -FIELD_Z_M + WINDOW_REVEAL_Z_M + 0.06;
  const depth = FIELD_Z_M - backZ0;
  for (const side of [-1, 1] as const) {
    for (const centerAbsX of WINDOW_CENTERS_X_M) {
      box(parts, VOID_DARK, WINDOW_HALF_WIDTH_M * 2 + 0.04, WINDOW_HEIGHT_M + 0.04,
        depth, side * centerAbsX, centerY, backZ0 + depth * 0.5);
    }
  }
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}
