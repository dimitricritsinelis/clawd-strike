import { BufferGeometry, Float32BufferAttribute } from "three";
import { angledBoxPart, boxPart, tintGeometry } from "./propsCore";

/**
 * Shared authoring primitives and palette for the authored boundary kits that
 * re-face the map's sealed perimeter runs.
 *
 * A blockout perimeter wall renders as one flat plane with one material. Where
 * that plane is something a player actually looks at, a kit stands a built
 * elevation in front of it. Those kits differ in vocabulary — a city gate is
 * not a row of house backs — but they must agree on scale, palette, texture
 * projection and, above all, on the clearance envelope, or the map ends up with
 * several unrelated ways of meeting the same wall.
 *
 * ## Frame
 *
 * Kits are authored in metres, with `y` measured from the paving and `z`
 * measured **outward from the wall plane into the playable space**, then
 * normalized into the unit cube the dressing instancer scales by (width,
 * height, depth). A part authored at `z = 0.4` therefore renders 0.4 m in front
 * of the wall it faces.
 *
 * ## The clearance envelope
 *
 * These kits are render-only and add no collision, so the wall behind them
 * remains the collision plane. A player's AABB is
 * {@link PLAYER_HALF_WIDTH_M} half-wide, which means their camera reaches
 * {@link PLAYER_HALF_WIDTH_M} from the wall and no closer, and anything
 * standing proud of the wall below head height would be walked through.
 *
 * So: below {@link FREE_PROJECTION_Y_M} nothing may reach past
 * {@link LOW_PROJECTION_MAX_M}, and depth at that height must come from
 * recesses cut *back* toward the wall. Above it, projection is free. Ground
 * dressing is exempt only while it stays under
 * {@link GROUND_DRESSING_MAX_Y_M}, low enough to pass beneath the camera.
 */

/** Player AABB half-width; the closest their camera gets to the wall plane. */
export const PLAYER_HALF_WIDTH_M = 0.3;
/** Height above which projections can no longer be reached by a jumping camera. */
export const FREE_PROJECTION_Y_M = 2.45;
/** Projection ceiling below {@link FREE_PROJECTION_Y_M}. */
export const LOW_PROJECTION_MAX_M = PLAYER_HALF_WIDTH_M - 0.02;
/** Ground dressing may project freely while it stays below the camera. */
export const GROUND_DRESSING_MAX_Y_M = 0.46;

/**
 * The courtyard order.
 *
 * Every wall around a courtyard has to be set out from one system or the place
 * reads as a pile of unrelated elevations. A Levantine mason does not decorate
 * a wall evenly: they establish a bay module, run a few datum lines the whole
 * length of the street, leave the ground storey largely solid, and then spend
 * the entire ornament budget in one place — the portal. Wall as calm ground,
 * ornament as concentrated figure.
 *
 * These constants are that system. Any kit facing this courtyard sets its
 * openings on {@link BAY_MODULE_M} centres, lands its horizontals on the datums
 * below, and carries at most one repeating order on its field. Devices are
 * spent, not sprinkled: a wall gets a blind arcade *or* a gallery, not both.
 */
export const BAY_MODULE_M = 2.4;
export const PIER_WIDTH_M = 0.6;
/** Clear width of a bay between piers. */
export const BAY_CLEAR_M = BAY_MODULE_M - PIER_WIDTH_M;

/** Shared horizontal datums, in metres from the paving. */
export const DATUM_PLINTH_TOP_M = 0.72;
export const DATUM_STRING_BOTTOM_M = FREE_PROJECTION_Y_M;
export const DATUM_STRING_TOP_M = 2.9;
export const DATUM_SILL_M = 4.3;
export const DATUM_IMPOST_M = 5.4;

/**
 * Bay centres for a run of `widthM`, laid out symmetrically about its middle on
 * whole modules. Returns an empty list when the run is too short to carry a
 * bay, which is the correct answer: a short return should stay blank rather
 * than take a squeezed opening.
 */
export function bayCenters(widthM: number, marginM = PIER_WIDTH_M): number[] {
  const usable = widthM - marginM * 2;
  const count = Math.floor((usable + PIER_WIDTH_M) / BAY_MODULE_M);
  if (count < 1) return [];
  const span = count * BAY_MODULE_M - PIER_WIDTH_M;
  const start = -span * 0.5 + BAY_CLEAR_M * 0.5;
  return Array.from({ length: count }, (_, index) => start + index * BAY_MODULE_M);
}

export type Tone = readonly [number, number, number];

// Tones multiply the batch tint (ph_sandstone_blocks_05, #dfc69a). Two masonry
// families keep a long elevation from reading as one sheet of the same value: a
// cooler grey ashlar for working walls, and a warm lime plaster for the parts
// that are meant to be prestige.
export const STONE_FIELD: Tone = [0.94, 0.95, 0.97];
export const STONE_FIELD_ALT: Tone = [0.82, 0.83, 0.85];
export const STONE_PIER: Tone = [1.02, 1.02, 1.03];
export const STONE_PIER_ALT: Tone = [0.79, 0.79, 0.81];
export const STONE_TRIM: Tone = [1.24, 1.23, 1.21];
export const STONE_KEYSTONE: Tone = [1.34, 1.3, 1.22];

// Shade values. These boundaries face away from the sun, so the renderer gives
// their faces almost no raking light and every corbel and hood casts nearly
// nothing. The darks have to be authored: an arch barrel sitting at four-fifths
// of the wall's value is a scribed band, not an opening.
export const STONE_SOFFIT: Tone = [0.12, 0.115, 0.115];
export const STONE_SOFFIT_EDGE: Tone = [0.3, 0.29, 0.28];
export const STONE_UNDERSHADE: Tone = [0.19, 0.18, 0.18];
export const STONE_CREVICE: Tone = [0.12, 0.11, 0.11];
export const STONE_CREVICE_SOFT: Tone = [0.38, 0.36, 0.35];
export const STONE_RECESS: Tone = [0.48, 0.45, 0.42];
export const STONE_RECESS_DEEP: Tone = [0.26, 0.25, 0.25];

export const STONE_THRESHOLD: Tone = [1.14, 1.11, 1.04];
export const STONE_THRESHOLD_WORN: Tone = [0.9, 0.87, 0.82];
export const STONE_WHITEWASH: Tone = [1.26, 1.25, 1.22];
export const SAND_DRIFT: Tone = [1.18, 1.1, 0.9];
export const RUBBLE: Tone = [0.82, 0.79, 0.72];
export const WATER_DARK: Tone = [0.26, 0.34, 0.36];

/** Warm lime plaster, set against the cooler ashlar of a working wall. */
export const PLASTER_FIELD: Tone = [1.2, 1.12, 0.98];
export const PLASTER_FIELD_ALT: Tone = [1.08, 1, 0.86];
export const PLASTER_SHADED: Tone = [0.7, 0.64, 0.55];

/** Aged ochre plaster: the Dyers district's wall material. */
export const OCHRE_FIELD: Tone = [1.16, 0.94, 0.66];
export const OCHRE_FIELD_ALT: Tone = [1.02, 0.81, 0.56];
export const OCHRE_SHADED: Tone = [0.64, 0.51, 0.36];
export const BRICK_INFILL: Tone = [0.86, 0.62, 0.46];
export const BRICK_INFILL_ALT: Tone = [0.72, 0.5, 0.37];
export const SOOT_DARK: Tone = [0.22, 0.2, 0.19];

// Dye colours. These are the first saturated accents in the A spawn courtyard;
// everything else there is sandstone, plaster and timber, so they carry the
// whole colour story of the edge.
//
// They are authored dark *and* impure. The cloth batch has a white base under
// full desert sun, so a near-pure hue comes back as primary-colour bunting —
// carnival flags, not a dye yard. Cloth that has been dyed, wrung out and left
// in this sun keeps a lot of cross-channel content, so every tone here carries
// its off-channels well up off zero and lands as a dusty version of itself.
export const DYE_INDIGO: Tone = [0.22, 0.27, 0.44];
export const DYE_INDIGO_DEEP: Tone = [0.12, 0.15, 0.26];
export const DYE_MADDER: Tone = [0.52, 0.26, 0.2];
export const DYE_MADDER_DEEP: Tone = [0.3, 0.15, 0.12];
export const DYE_SAFFRON: Tone = [0.68, 0.52, 0.24];
export const DYE_TEAL: Tone = [0.18, 0.32, 0.31];

// The courtyard paving is the brightest value in these cameras, so an apron
// laid against a wall is deliberately darker and warmer than it.
export const APRON_FLAG: Tone = [0.66, 0.62, 0.56];
export const APRON_WORN: Tone = [0.54, 0.51, 0.47];
export const APRON_PATCH: Tone = [0.86, 0.82, 0.74];
export const APRON_POLISHED: Tone = [0.78, 0.74, 0.68];

export const TIMBER_GATE: Tone = [0.62, 0.45, 0.29];
export const TIMBER_GATE_ALT: Tone = [0.5, 0.36, 0.23];
export const TIMBER_GATE_EDGE: Tone = [0.31, 0.22, 0.14];
export const TIMBER_LATTICE: Tone = [0.56, 0.41, 0.26];
export const TIMBER_ROOF: Tone = [0.44, 0.32, 0.2];
export const IRON_DARK: Tone = [0.16, 0.15, 0.13];
export const IRON_RUST: Tone = [0.3, 0.18, 0.11];
export const LANTERN_GLASS: Tone = [0.98, 0.79, 0.44];
// Cloth reads against sunlit ashlar, so it has to sit near the wall's own value
// or it turns into a black hole at elevation distance.
export const CLOTH_FADED: Tone = [1.06, 0.52, 0.35];
export const CLOTH_PALE: Tone = [1.24, 1.1, 0.82];
export const SHUTTER_TEAL: Tone = [0.34, 0.6, 0.58];
export const SHUTTER_TEAL_EDGE: Tone = [0.2, 0.38, 0.38];

export const VOID_DARK: Tone = [0.035, 0.032, 0.028];

/**
 * Replace per-box 0..1 UVs with a box-projected mapping in metres, so one
 * texture tile always covers `tileSizeM` of real surface regardless of the
 * part's size. Without it a 0.07 m hinge and a 2 m wall column would each
 * stretch a whole tile across their own face. Must run before the geometry
 * leaves metre space.
 */
export function applyWorldBoxUv(geometry: BufferGeometry, tileSizeM: number): BufferGeometry {
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

/**
 * Author a slab by the planes it occupies rather than by centre and size.
 * Every element of these kits is defined as "from this z out to that z", and
 * stating it that way is what keeps the clearance rule checkable by eye.
 */
export function slab(
  parts: BufferGeometry[],
  tone: Tone,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): void {
  if (x1 <= x0 || y1 <= y0 || z1 <= z0) return;
  parts.push(tintGeometry(
    boxPart(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5),
    tone,
  ));
}

export function box(
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

export function angledBox(
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

/**
 * Graded shade tucked under a projecting element: a near-black contact line at
 * the junction, then a softer falloff below it. Two steps rather than one,
 * because that is what a baked pass gives and what a single flat band does not.
 */
export function pushUndershade(
  parts: BufferGeometry[],
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
): void {
  slab(parts, STONE_UNDERSHADE, x0, x1, y, y + 0.06, z0, z1);
  slab(parts, STONE_CREVICE_SOFT, x0, x1, y - 0.13, y, z0, z1 - (z1 - z0) * 0.12);
}

export type Opening = {
  x0: number;
  x1: number;
  sillY: number;
  /** Height of the opening head at `x`. */
  headY: (x: number) => number;
  /** Plane the opening's back sits on. */
  floorZ: number;
  floorTone: Tone;
};

/**
 * Build a wall field as vertical columns, leaving an arched opening out of the
 * masonry rather than burying it behind a solid slab.
 *
 * A recess only reads if the wall in front of it genuinely is not there. Doing
 * this by columns also lets a curved head come out as a real curve instead of a
 * stair of rectangles, at whatever resolution the opening's width deserves.
 */
export function pushArchedField(
  parts: BufferGeometry[],
  tone: Tone,
  x0: number,
  x1: number,
  yBottom: number,
  yTop: number,
  zBack: number,
  zFront: number,
  opening: Opening | null,
  columnCount = 32,
): void {
  if (!opening || opening.x1 <= x0 || opening.x0 >= x1) {
    slab(parts, tone, x0, x1, yBottom, yTop, zBack, zFront);
    return;
  }
  slab(parts, tone, x0, opening.x0, yBottom, yTop, zBack, zFront);
  slab(parts, tone, opening.x1, x1, yBottom, yTop, zBack, zFront);
  const span = opening.x1 - opening.x0;
  for (let index = 0; index < columnCount; index += 1) {
    const cx0 = opening.x0 + (span * index) / columnCount;
    const cx1 = opening.x0 + (span * (index + 1)) / columnCount;
    const head = opening.headY((cx0 + cx1) * 0.5);
    // Masonry below the sill and above the head.
    slab(parts, tone, cx0, cx1, yBottom, Math.min(yTop, opening.sillY), zBack, zFront);
    slab(parts, tone, cx0, cx1, Math.max(yBottom, head), yTop, zBack, zFront);
    // The recess floor, and the darkened arris where it meets the field face.
    slab(parts, opening.floorTone, cx0, cx1, opening.sillY, head,
      opening.floorZ, opening.floorZ + 0.02);
    slab(parts, STONE_SOFFIT_EDGE, cx0, cx1, head - 0.07, head, opening.floorZ, zFront);
    // Soffit under the head: the returning face that makes the recess read as
    // cut into the wall rather than scribed onto it.
    slab(parts, STONE_SOFFIT, cx0, cx1, head - 0.05, head, opening.floorZ + 0.02, zFront);
  }
  // Side reveals. Without these the recess has a floor and a head but no
  // returning jambs, and every opening reads as a painted panel no matter how
  // dark its back is.
  const revealDepth = zFront - opening.floorZ;
  if (revealDepth > 0.04) {
    for (const [rx0, rx1, lit] of [
      [opening.x0, opening.x0 + revealDepth * 0.5, false],
      [opening.x1 - revealDepth * 0.5, opening.x1, true],
    ] as const) {
      const headAt = opening.headY((rx0 + rx1) * 0.5);
      // One jamb takes the sun and one stays in shade, which is what gives a
      // recess its direction instead of a symmetric dark outline.
      slab(parts, lit ? STONE_SOFFIT_EDGE : STONE_SOFFIT, rx0, rx1, opening.sillY, headAt,
        opening.floorZ + 0.02, zFront - 0.005);
    }
  }
}

/**
 * Height of a blind arch described by its own springing and apex. A quarter
 * circle in the normalized half-width keeps a vertical tangent at the springing
 * and a point at the crown, at whatever proportion the bay happens to be.
 */
export function blindArchY(
  x: number,
  centerX: number,
  halfWidth: number,
  springY: number,
  apexY: number,
): number {
  const t = Math.min(1, Math.abs(x - centerX) / halfWidth);
  return springY + (apexY - springY) * Math.sqrt(Math.max(0, 1 - t * t));
}
