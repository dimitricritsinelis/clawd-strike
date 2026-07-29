import type { BufferGeometry } from "three";
import { mergeProceduralGeometry } from "./propsCore";
import {
  APRON_FLAG,
  APRON_PATCH,
  APRON_WORN,
  CLOTH_FADED,
  CLOTH_PALE,
  DYE_MADDER,
  DYE_SAFFRON,
  DATUM_STRING_BOTTOM_M,
  DATUM_SILL_M,
  FREE_PROJECTION_Y_M,
  GROUND_DRESSING_MAX_Y_M,
  IRON_DARK,
  IRON_RUST,
  LOW_PROJECTION_MAX_M,
  PLASTER_FIELD,
  RUBBLE,
  SAND_DRIFT,
  SHUTTER_TEAL,
  SHUTTER_TEAL_EDGE,
  STONE_CREVICE,
  STONE_CREVICE_SOFT,
  STONE_FIELD,
  STONE_PIER,
  STONE_PIER_ALT,
  STONE_RECESS,
  STONE_RECESS_DEEP,
  STONE_TRIM,
  STONE_WHITEWASH,
  TIMBER_GATE,
  TIMBER_GATE_ALT,
  TIMBER_GATE_EDGE,
  TIMBER_LATTICE,
  TIMBER_ROOF,
  VOID_DARK,
  angledBox,
  applyWorldBoxUv,
  blindArchY,
  box,
  pushArchedField,
  pushUndershade,
  slab,
} from "./boundaryKit";

/**
 * The two wall returns that frame the A spawn courtyard's main exit.
 *
 * The exit itself is the Spice Gate, and it is finished. What flanks it is not:
 * two shallow relief panels in cool grey plaster, one shuttered window each,
 * flat-topped at 4.9 m, meeting the gate's warm sandstone in an abrupt seam and
 * the paving in a bare line. They are the last unbuilt thing in the first view
 * a player ever gets of this map.
 *
 * ## Why a kit rather than better frontages
 *
 * These returns *are* frontage-generated, so the obvious fix is to give them a
 * taller massing and a merchant facade profile. That path is closed: both
 * frontages are covered by sealed `legacy-migrated` fenestration waivers
 * recording that they have zero ground openings, and the waiver set is
 * immutable while any of it remains. Giving them real openings makes those
 * waivers stale, which fails the build. So the returns keep their authored
 * layout and this kit re-faces them, exactly as the other three sides of the
 * courtyard are re-faced.
 *
 * ## Identity
 *
 * Merchant frontage. The gate opens onto a market street, and these returns are
 * the first two shopfronts of it — which also gives the courtyard's fourth side
 * its own vocabulary against the rear gate, the west house backs and the east
 * dye works, and hands the player something to read on the way out rather than
 * on the way back.
 *
 * ## Frame
 *
 * Authored in the shared boundary-kit frame (see `./boundaryKit`): metres, `y`
 * from the paving, `z` outward from the wall plane. These walls face **south**
 * into the courtyard, so both runs are instanced at design yaw 180, which maps
 * local +Z to design south and local +X to design east.
 *
 * Render-only, and bound by the shared clearance envelope: below
 * {@link FREE_PROJECTION_Y_M} nothing passes {@link LOW_PROJECTION_MAX_M}, the
 * shop recesses are cut back toward the wall rather than built out from it, and
 * ground dressing stays under {@link GROUND_DRESSING_MAX_Y_M}.
 */

const Z_BACK_M = -0.3;
const DEPTH_M = 2;
const Z_CENTER_M = Z_BACK_M + DEPTH_M * 0.5;

const PLINTH_Z_M = LOW_PROJECTION_MAX_M;
const LOWER_FIELD_Z_M = 0.2;
const LOWER_PIER_Z_M = LOW_PROJECTION_MAX_M;
const UPPER_FIELD_Z_M = 0.52;
const UPPER_PIER_Z_M = 0.62;
const UPPER_RECESS_Z_M = 0.3;
/** Shop recesses bottom out just proud of the wall face at z = 0. */
const RECESS_FLOOR_Z_M = 0.04;

const PLINTH_TOP_M = 0.62;
const STRING_BOTTOM_M = DATUM_STRING_BOTTOM_M;
const STRING_TOP_M = 2.86;

export const SPAWN_A_EXIT_RETURN_HEIGHT_M = 7.6;
export const SPAWN_A_EXIT_RETURN_DEPTH_M = DEPTH_M;
/**
 * Stopped clear of the Spice Gate's abutments, which reach x 20.6 and x 33.4.
 * At the full 4 m and 6 m these runs overlapped the portal's own masonry and
 * the coplanar faces combed into z-fighting down both junctions.
 */
export const SPAWN_A_EXIT_WEST_WIDTH_M = 3.5;
export const SPAWN_A_EXIT_EAST_WIDTH_M = 5.5;

type Bay = { center: number; halfWidth: number; kind: "shop" | "door" };
type Window = { x: number; halfWidth: number; sill: number; head: number };
type ReturnConfig = {
  widthM: number;
  eavesY: number;
  parapetY: number;
  field: typeof STONE_FIELD;
  bays: readonly Bay[];
  windows: readonly Window[];
  /** Which end quoin turns into the gate rather than into a courtyard corner. */
  gateSide: -1 | 1;
};

/**
 * The two runs are given different widths, bay counts, storey heights and wall
 * tones on purpose: they flank a symmetrical gate, and mirroring them would
 * turn the exit into a pair of bookends rather than a street beginning.
 */
const WEST_RETURN: ReturnConfig = {
  widthM: SPAWN_A_EXIT_WEST_WIDTH_M,
  eavesY: 6.6,
  parapetY: 7.35,
  field: PLASTER_FIELD,
  bays: [{ center: 0.35, halfWidth: 1.05, kind: "shop" }],
  windows: [
    { x: -0.75, halfWidth: 0.44, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3 },
    { x: 0.9, halfWidth: 0.44, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3 },
  ],
  gateSide: 1,
};
const EAST_RETURN: ReturnConfig = {
  widthM: SPAWN_A_EXIT_EAST_WIDTH_M,
  eavesY: 6.15,
  parapetY: 6.85,
  field: STONE_FIELD,
  bays: [
    { center: -1.5, halfWidth: 1.15, kind: "shop" },
    { center: 1.35, halfWidth: 0.6, kind: "door" },
  ],
  windows: [
    { x: -2.05, halfWidth: 0.44, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3 },
    { x: -0.35, halfWidth: 0.44, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3 },
    { x: 1.75, halfWidth: 0.44, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3 },
  ],
  gateSide: -1,
};

function normalize(geometry: BufferGeometry, widthM: number): BufferGeometry {
  geometry.translate(0, -SPAWN_A_EXIT_RETURN_HEIGHT_M * 0.5, -Z_CENTER_M);
  geometry.scale(1 / widthM, 1 / SPAWN_A_EXIT_RETURN_HEIGHT_M, 1 / DEPTH_M);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Head height of a shop recess or a door opening. */
function bayHeadY(bay: Bay): number {
  return bay.kind === "shop" ? 2.62 : 2.34;
}

function pushReturnStone(parts: BufferGeometry[], config: ReturnConfig): void {
  const half = config.widthM * 0.5;

  // Plinth, broken by every ground bay so the shopfronts sit at grade the way
  // a shopfront has to.
  const plinthRuns: Array<[number, number]> = [];
  let cursor = -half;
  for (const bay of config.bays) {
    plinthRuns.push([cursor, bay.center - bay.halfWidth]);
    cursor = bay.center + bay.halfWidth;
  }
  plinthRuns.push([cursor, half]);
  for (const [x0, x1] of plinthRuns) {
    slab(parts, STONE_PIER_ALT, x0, x1, 0, 0.24, Z_BACK_M, PLINTH_Z_M);
    slab(parts, STONE_PIER, x0, x1, 0.24, PLINTH_TOP_M - 0.09, Z_BACK_M, PLINTH_Z_M - 0.05);
    slab(parts, STONE_TRIM, x0, x1, PLINTH_TOP_M - 0.09, PLINTH_TOP_M, Z_BACK_M, PLINTH_Z_M);
    pushUndershade(parts, x0, x1, PLINTH_TOP_M - 0.14, LOWER_FIELD_Z_M, PLINTH_Z_M);
    slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.13, PLINTH_Z_M - 0.02, PLINTH_Z_M + 0.16);
    slab(parts, STONE_CREVICE, x0, x1, 0, 0.05, PLINTH_Z_M + 0.16, PLINTH_Z_M + 0.38);
  }

  // Lower storey with the bays cut out of it.
  let fieldCursor = -half;
  for (const bay of config.bays) {
    slab(parts, config.field, fieldCursor, bay.center - bay.halfWidth - 0.14,
      PLINTH_TOP_M, STRING_BOTTOM_M, Z_BACK_M, LOWER_FIELD_Z_M);
    pushArchedField(parts, config.field, bay.center - bay.halfWidth - 0.14,
      bay.center + bay.halfWidth + 0.14, 0, STRING_BOTTOM_M, Z_BACK_M, LOWER_FIELD_Z_M, {
        x0: bay.center - bay.halfWidth,
        x1: bay.center + bay.halfWidth,
        sillY: 0,
        headY: (x) => blindArchY(x, bay.center, bay.halfWidth,
          bayHeadY(bay) - 0.36, bayHeadY(bay)),
        floorZ: RECESS_FLOOR_Z_M,
        // The back of a shopfront is a lit room, not a soffit. Using the deep
        // soffit tone here turned every bay into a flat black hole and buried
        // the counter and stock that make it read as a shop at all.
        floorTone: STONE_RECESS,
      }, 20);
    // Timber lintel and a stone threshold, so the opening is framed top and
    // bottom rather than just being absent wall.
    slab(parts, TIMBER_ROOF, bay.center - bay.halfWidth - 0.2, bay.center + bay.halfWidth + 0.2,
      bayHeadY(bay), bayHeadY(bay) + 0.2, Z_BACK_M, LOWER_PIER_Z_M + 0.03);
    pushUndershade(parts, bay.center - bay.halfWidth - 0.2, bay.center + bay.halfWidth + 0.2,
      bayHeadY(bay) - 0.05, LOWER_FIELD_Z_M, LOWER_PIER_Z_M + 0.03);
    slab(parts, STONE_TRIM, bay.center - bay.halfWidth - 0.1, bay.center + bay.halfWidth + 0.1,
      0, 0.12, RECESS_FLOOR_Z_M, PLINTH_Z_M + 0.55);
    // Jamb pilasters flanking the bay.
    for (const side of [-1, 1] as const) {
      const jx = bay.center + side * (bay.halfWidth + 0.07);
      slab(parts, STONE_PIER, jx - 0.07, jx + 0.07, 0, bayHeadY(bay) + 0.2,
        Z_BACK_M, LOWER_PIER_Z_M);
    }
    // Shop counter across the sill of a trading bay: the thing that makes it a
    // shopfront instead of a hole. It sits inside the recess, so it is behind
    // the wall plane and cannot be walked through.
    if (bay.kind === "shop") {
      slab(parts, STONE_PIER, bay.center - bay.halfWidth + 0.05, bay.center + bay.halfWidth - 0.05,
        0.12, 0.92, RECESS_FLOOR_Z_M + 0.02, RECESS_FLOOR_Z_M + 0.16);
      slab(parts, STONE_TRIM, bay.center - bay.halfWidth + 0.02, bay.center + bay.halfWidth - 0.02,
        0.92, 1.04, RECESS_FLOOR_Z_M, LOWER_FIELD_Z_M + 0.02);
      // Limewashed back wall above the counter: the bay needs an interior value
      // for the goods in front of it to read against.
      slab(parts, STONE_WHITEWASH, bay.center - bay.halfWidth + 0.06,
        bay.center + bay.halfWidth - 0.06, 1.04, bayHeadY(bay) - 0.12,
        RECESS_FLOOR_Z_M + 0.02, RECESS_FLOOR_Z_M + 0.035);
      pushUndershade(parts, bay.center - bay.halfWidth, bay.center + bay.halfWidth, 0.12,
        RECESS_FLOOR_Z_M, LOWER_FIELD_Z_M - 0.02);
    }
    fieldCursor = bay.center + bay.halfWidth + 0.14;
  }
  slab(parts, config.field, fieldCursor, half, PLINTH_TOP_M, STRING_BOTTOM_M,
    Z_BACK_M, LOWER_FIELD_Z_M);

  // Corbelled string course: the courtyard's shared device for stepping the
  // upper storey out past the height a player can reach.
  const spacing = 1.1;
  const corbels = Math.max(1, Math.floor(config.widthM / spacing));
  for (let index = 0; index <= corbels; index += 1) {
    const x = -half + 0.25 + index * spacing;
    if (x > half - 0.25) break;
    const reach = LOWER_PIER_Z_M + 0.26 + ((index * 5) % 3) * 0.04;
    box(parts, index % 2 === 0 ? STONE_TRIM : STONE_PIER, 0.26, 0.3, reach - LOWER_FIELD_Z_M,
      x, STRING_BOTTOM_M + 0.15, (LOWER_FIELD_Z_M + reach) * 0.5);
    pushUndershade(parts, x - 0.14, x + 0.14, STRING_BOTTOM_M - 0.03, LOWER_FIELD_Z_M, reach);
  }
  slab(parts, STONE_PIER, -half, half, STRING_BOTTOM_M + 0.13, STRING_BOTTOM_M + 0.28,
    Z_BACK_M, LOWER_PIER_Z_M + 0.12);
  slab(parts, STONE_TRIM, -half, half, STRING_BOTTOM_M + 0.28, STRING_BOTTOM_M + 0.42,
    Z_BACK_M, UPPER_FIELD_Z_M - 0.06);
  slab(parts, STONE_PIER, -half, half, STRING_BOTTOM_M + 0.42, STRING_TOP_M, Z_BACK_M, UPPER_PIER_Z_M);
  pushUndershade(parts, -half, half, STRING_TOP_M - 0.06, UPPER_FIELD_Z_M, UPPER_PIER_Z_M);
  slab(parts, STONE_CREVICE, -half, half, STRING_BOTTOM_M - 0.1, STRING_BOTTOM_M + 0.13,
    LOWER_FIELD_Z_M, LOWER_FIELD_Z_M + 0.02);

  // Upper storey with its shuttered windows left out of the masonry.
  let upperCursor = -half;
  for (const window of config.windows) {
    slab(parts, config.field, upperCursor, window.x - window.halfWidth - 0.16,
      STRING_TOP_M, config.eavesY, Z_BACK_M, UPPER_FIELD_Z_M);
    pushArchedField(parts, config.field, window.x - window.halfWidth - 0.16,
      window.x + window.halfWidth + 0.16, STRING_TOP_M, config.eavesY,
      Z_BACK_M, UPPER_FIELD_Z_M, {
        x0: window.x - window.halfWidth,
        x1: window.x + window.halfWidth,
        sillY: window.sill,
        headY: (x) => blindArchY(x, window.x, window.halfWidth, window.head - 0.28, window.head),
        floorZ: UPPER_RECESS_Z_M - 0.18,
        floorTone: STONE_RECESS_DEEP,
      }, 14);
    // Sill on brackets, and a hood over the head.
    slab(parts, STONE_TRIM, window.x - window.halfWidth - 0.18, window.x + window.halfWidth + 0.18,
      window.sill - 0.13, window.sill, UPPER_RECESS_Z_M - 0.18, UPPER_FIELD_Z_M + 0.15);
    pushUndershade(parts, window.x - window.halfWidth - 0.18, window.x + window.halfWidth + 0.18,
      window.sill - 0.19, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.15);
    for (const side of [-1, 1] as const) {
      box(parts, STONE_PIER, 0.13, 0.19, 0.19, window.x + side * (window.halfWidth - 0.05),
        window.sill - 0.24, UPPER_FIELD_Z_M + 0.05);
    }
    slab(parts, STONE_TRIM, window.x - window.halfWidth - 0.2, window.x + window.halfWidth + 0.2,
      window.head + 0.02, window.head + 0.15, UPPER_RECESS_Z_M, UPPER_FIELD_Z_M + 0.19);
    pushUndershade(parts, window.x - window.halfWidth - 0.2, window.x + window.halfWidth + 0.2,
      window.head - 0.04, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.19);
    upperCursor = window.x + window.halfWidth + 0.16;
  }
  slab(parts, config.field, upperCursor, half, STRING_TOP_M, config.eavesY,
    Z_BACK_M, UPPER_FIELD_Z_M);

  // Eaves, parapet and coping.
  const joists = Math.max(3, Math.round(config.widthM / 0.46));
  for (let joist = 0; joist < joists; joist += 1) {
    const x = -half + 0.22 + ((config.widthM - 0.44) * joist) / (joists - 1);
    const reach = UPPER_FIELD_Z_M + 0.3 + ((joist * 7) % 4) * 0.03;
    box(parts, joist % 3 === 0 ? TIMBER_GATE_EDGE : TIMBER_ROOF, 0.13, 0.16,
      reach - UPPER_FIELD_Z_M, x, config.eavesY - 0.11, (UPPER_FIELD_Z_M + reach) * 0.5);
  }
  slab(parts, STONE_TRIM, -half - 0.06, half + 0.06, config.eavesY, config.eavesY + 0.19,
    Z_BACK_M, UPPER_FIELD_Z_M + 0.42);
  pushUndershade(parts, -half - 0.06, half + 0.06, config.eavesY - 0.06,
    UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.42);
  slab(parts, config.field, -half, half, config.eavesY + 0.19, config.parapetY - 0.13,
    Z_BACK_M, UPPER_FIELD_Z_M + 0.18);
  slab(parts, STONE_TRIM, -half - 0.05, half + 0.05, config.parapetY - 0.13, config.parapetY,
    Z_BACK_M, UPPER_FIELD_Z_M + 0.28);

  // End quoins. The gate-side return is quoined tighter, so the seam against
  // the portal reads as two walls interlocking rather than butting.
  for (const side of [-1, 1] as const) {
    const outerX = side * half;
    const innerX = side * (half - (side === config.gateSide ? 0.38 : 0.52));
    const x0 = Math.min(outerX, innerX);
    const x1 = Math.max(outerX, innerX);
    for (let course = 0; ; course += 1) {
      const y0 = course * 0.54;
      if (y0 >= config.parapetY) break;
      const y1 = Math.min(config.parapetY, y0 + 0.54);
      const short = course % 2 === 1;
      const width = (x1 - x0) * (short ? 0.6 : 1);
      const qx0 = side < 0 ? x0 : x1 - width;
      const z = y1 <= STRING_BOTTOM_M ? LOWER_PIER_Z_M : UPPER_PIER_Z_M;
      slab(parts, short ? STONE_PIER_ALT : STONE_PIER, qx0, qx0 + width, y0, y1 - 0.03,
        Z_BACK_M, short ? z - 0.05 : z + 0.02);
    }
    const ex0 = side < 0 ? -half : half - 0.04;
    const ex1 = side < 0 ? -half + 0.04 : half;
    slab(parts, STONE_CREVICE, ex0, ex1, 0, STRING_BOTTOM_M, Z_BACK_M, LOWER_PIER_Z_M + 0.005);
    slab(parts, STONE_CREVICE, ex0, ex1, STRING_TOP_M, config.parapetY,
      Z_BACK_M, UPPER_PIER_Z_M + 0.005);
  }

  // Apron and base dressing, in the language the other three sides use.
  const flags = Math.max(4, Math.round(config.widthM / 0.8));
  for (let index = 0; index < flags; index += 1) {
    const x0 = -half + (config.widthM * index) / flags;
    const x1 = x0 + config.widthM / flags - 0.05;
    const depth = 1.16 + ((index * 5) % 3) * 0.09;
    const worn = (index * 3) % 4 === 0;
    slab(parts, worn ? APRON_WORN : APRON_FLAG, x0, x1, 0, 0.075, PLINTH_Z_M, PLINTH_Z_M + depth);
    if (index % 4 === 1) {
      slab(parts, APRON_PATCH, x0 + 0.08, x1 - 0.2, 0.075, 0.085,
        PLINTH_Z_M + 0.16, PLINTH_Z_M + depth - 0.3);
    }
    slab(parts, STONE_TRIM, x0, x1, 0.075, 0.15, PLINTH_Z_M + depth - 0.2, PLINTH_Z_M + depth);
    slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.02, PLINTH_Z_M + depth, PLINTH_Z_M + depth + 0.14);
    slab(parts, STONE_CREVICE_SOFT, x1, x1 + 0.05, 0, 0.08, PLINTH_Z_M, PLINTH_Z_M + depth);
  }
  for (let index = 0; index < 2; index += 1) {
    const x = -half + 0.9 + index * (config.widthM - 1.8);
    slab(parts, SAND_DRIFT, x - 0.45, x + 0.45, 0, 0.08, PLINTH_Z_M - 0.05, PLINTH_Z_M + 0.42);
    box(parts, RUBBLE, 0.26, 0.17, 0.22, x + 0.35, 0.085, PLINTH_Z_M + 0.62);
    slab(parts, STONE_CREVICE_SOFT, x + 0.2, x + 0.5, 0, 0.02, PLINTH_Z_M + 0.5, PLINTH_Z_M + 0.75);
  }
}

function pushReturnFixtures(parts: BufferGeometry[], config: ReturnConfig): void {
  const recessZ = UPPER_FIELD_Z_M - 0.18;
  for (const [index, window] of config.windows.entries()) {
    const leafHalf = window.halfWidth * 0.5;
    for (const side of [-1, 1] as const) {
      // One window on each run is left open, so the row is not a repeated state.
      if (index === 1 && side < 0) continue;
      const open = index === 0 && side > 0 ? 0.12 : 0;
      const cx = window.x + side * leafHalf;
      slab(parts, side < 0 ? SHUTTER_TEAL : SHUTTER_TEAL_EDGE,
        cx - leafHalf + 0.02, cx + leafHalf - 0.02, window.sill + 0.04, window.head - 0.09,
        recessZ + 0.02 + open, recessZ + 0.07 + open);
      for (let slat = 0; slat < 6; slat += 1) {
        const y = window.sill + 0.1 + slat * ((window.head - window.sill - 0.24) / 5);
        slab(parts, slat % 2 === 0 ? SHUTTER_TEAL_EDGE : SHUTTER_TEAL,
          cx - leafHalf + 0.03, cx + leafHalf - 0.03, y, y + 0.05,
          recessZ + 0.07 + open, recessZ + 0.09 + open);
      }
      box(parts, IRON_DARK, 0.05, 0.05, 0.05, cx, window.sill + 0.2, recessZ + 0.11 + open);
    }
  }

  for (const bay of config.bays) {
    if (bay.kind === "door") {
      // Closed timber door with a braced back and a ring pull.
      for (let plank = 0; plank < 4; plank += 1) {
        const px0 = bay.center - bay.halfWidth + 0.06 + plank * ((bay.halfWidth * 2 - 0.12) / 4);
        const px1 = px0 + (bay.halfWidth * 2 - 0.12) / 4;
        slab(parts, plank % 2 === 0 ? TIMBER_GATE : TIMBER_GATE_ALT, px0 + 0.008, px1 - 0.008,
          0.12, bayHeadY(bay) - 0.2, 0.07, 0.12);
        slab(parts, TIMBER_GATE_EDGE, px1 - 0.012, px1, 0.12, bayHeadY(bay) - 0.2, 0.07, 0.124);
      }
      for (const strapY of [0.46, 1.66]) {
        slab(parts, IRON_DARK, bay.center - bay.halfWidth + 0.06, bay.center + bay.halfWidth - 0.06,
          strapY, strapY + 0.08, 0.12, 0.15);
      }
      angledBox(parts, TIMBER_ROOF, bay.halfWidth * 2.1, 0.1, 0.035,
        bay.center, 1.06, 0.13, 0.7);
      box(parts, IRON_RUST, 0.1, 0.1, 0.05, bay.center + 0.3, 1.14, 0.16);
      continue;
    }

    // Trading bay: stock on the counter, goods hung on the back wall, and a
    // shutter propped open above the lintel. All of it inside the recess.
    const stock = [
      { x: -0.62, w: 0.3, h: 0.24, d: 0.26, tone: TIMBER_ROOF },
      { x: -0.24, w: 0.24, h: 0.3, d: 0.22, tone: CLOTH_PALE },
      { x: 0.14, w: 0.34, h: 0.2, d: 0.28, tone: TIMBER_LATTICE },
      { x: 0.56, w: 0.22, h: 0.28, d: 0.22, tone: DYE_SAFFRON },
    ];
    for (const item of stock) {
      const x = bay.center + item.x * (bay.halfWidth / 1.05);
      if (Math.abs(x - bay.center) > bay.halfWidth - 0.16) continue;
      box(parts, item.tone, item.w, item.h, item.d, x, 1.02 + item.h * 0.5, RECESS_FLOOR_Z_M + 0.11);
      box(parts, TIMBER_GATE_EDGE, item.w + 0.02, 0.05, item.d + 0.02,
        x, 1.02 + item.h - 0.02, RECESS_FLOOR_Z_M + 0.11);
    }
    // Hung goods on the back wall of the bay.
    slab(parts, TIMBER_ROOF, bay.center - bay.halfWidth + 0.14, bay.center + bay.halfWidth - 0.14,
      2.2, 2.26, RECESS_FLOOR_Z_M + 0.03, RECESS_FLOOR_Z_M + 0.1);
    for (const [index, hang] of [
      { x: -0.5, width: 0.34, drop: 0.62, tone: DYE_MADDER },
      { x: 0.05, width: 0.26, drop: 0.44, tone: CLOTH_FADED },
      { x: 0.52, width: 0.3, drop: 0.7, tone: DYE_SAFFRON },
    ].entries()) {
      const x = bay.center + hang.x * (bay.halfWidth / 1.05);
      if (Math.abs(x - bay.center) > bay.halfWidth - 0.2) continue;
      slab(parts, hang.tone, x - hang.width * 0.5, x + hang.width * 0.5,
        2.2 - hang.drop, 2.2, RECESS_FLOOR_Z_M + 0.05, RECESS_FLOOR_Z_M + 0.09);
      slab(parts, TIMBER_GATE_EDGE, x - hang.width * 0.5, x + hang.width * 0.5,
        2.2 - hang.drop, 2.2 - hang.drop + 0.06,
        RECESS_FLOOR_Z_M + 0.05, RECESS_FLOOR_Z_M + 0.095);
      box(parts, IRON_DARK, 0.04, 0.1, 0.04, x, 2.24, RECESS_FLOOR_Z_M + 0.07);
      void index;
    }
    // Propped shutter over the bay, hinged at the lintel and held on two stays.
    // It stops well above head height, so nothing here is walked through.
    const propTop = bayHeadY(bay) + 0.2;
    slab(parts, TIMBER_GATE, bay.center - bay.halfWidth, bay.center + bay.halfWidth,
      propTop + 0.28, propTop + 0.36, LOWER_PIER_Z_M, LOWER_PIER_Z_M + 0.52);
    for (let slat = 0; slat < 4; slat += 1) {
      slab(parts, slat % 2 === 0 ? TIMBER_GATE_ALT : TIMBER_GATE_EDGE,
        bay.center - bay.halfWidth, bay.center + bay.halfWidth,
        propTop + 0.28 + slat * 0.02, propTop + 0.3 + slat * 0.02,
        LOWER_PIER_Z_M + 0.12 * slat, LOWER_PIER_Z_M + 0.12 * slat + 0.1);
    }
    for (const side of [-1, 1] as const) {
      const sx = bay.center + side * (bay.halfWidth - 0.1);
      box(parts, IRON_DARK, 0.045, 0.3, 0.045, sx, propTop + 0.14, LOWER_PIER_Z_M + 0.44);
      box(parts, IRON_RUST, 0.08, 0.08, 0.08, sx, propTop + 0.3, LOWER_PIER_Z_M + 0.44);
    }
  }
}

function pushReturnVoid(parts: BufferGeometry[], config: ReturnConfig): void {
  for (const window of config.windows) {
    slab(parts, VOID_DARK, window.x - window.halfWidth + 0.04, window.x + window.halfWidth - 0.04,
      window.sill + 0.02, window.head - 0.07, UPPER_RECESS_Z_M - 0.2, UPPER_RECESS_Z_M - 0.17);
  }
  for (const bay of config.bays) {
    if (bay.kind !== "door") continue;
    slab(parts, VOID_DARK, bay.center - bay.halfWidth + 0.06, bay.center + bay.halfWidth - 0.06,
      0.12, bayHeadY(bay) - 0.18, RECESS_FLOOR_Z_M - 0.02, RECESS_FLOOR_Z_M + 0.01);
  }
}

export function createSpawnAExitWestReturnStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushReturnStone(parts, WEST_RETURN);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2), WEST_RETURN.widthM);
}

export function createSpawnAExitWestReturnFixtureGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushReturnFixtures(parts, WEST_RETURN);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2), WEST_RETURN.widthM);
}

export function createSpawnAExitWestReturnVoidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushReturnVoid(parts, WEST_RETURN);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2), WEST_RETURN.widthM);
}

export function createSpawnAExitEastReturnStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushReturnStone(parts, EAST_RETURN);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2), EAST_RETURN.widthM);
}

export function createSpawnAExitEastReturnFixtureGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushReturnFixtures(parts, EAST_RETURN);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2), EAST_RETURN.widthM);
}

export function createSpawnAExitEastReturnVoidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushReturnVoid(parts, EAST_RETURN);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2), EAST_RETURN.widthM);
}
