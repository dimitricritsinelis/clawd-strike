import type { BufferGeometry } from "three";
import { mergeProceduralGeometry } from "./propsCore";
import {
  APRON_FLAG,
  APRON_PATCH,
  APRON_WORN,
  CLOTH_FADED,
  CLOTH_PALE,
  DATUM_SILL_M,
  DATUM_PLINTH_TOP_M,
  DATUM_STRING_BOTTOM_M,
  DATUM_STRING_TOP_M,
  FREE_PROJECTION_Y_M,
  GROUND_DRESSING_MAX_Y_M,
  IRON_DARK,
  IRON_RUST,
  LOW_PROJECTION_MAX_M,
  PLASTER_FIELD,
  PLASTER_SHADED,
  RUBBLE,
  SAND_DRIFT,
  SHUTTER_TEAL,
  SHUTTER_TEAL_EDGE,
  STONE_CREVICE,
  STONE_CREVICE_SOFT,
  STONE_FIELD,
  STONE_PIER,
  STONE_PIER_ALT,
  STONE_RECESS_DEEP,
  STONE_SOFFIT,
  STONE_TRIM,
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
 * The west courtyard edge of A spawn: three house backs standing against the
 * sealed x = 17 wall run.
 *
 * The run is 8 m of blank blockout plane between the courtyard's south-west
 * corner and the south-west connector mouth, and it is the largest dead surface
 * in every camera a player sees on leaving spawn.
 *
 * ## Why house backs and not another gate
 *
 * Bab al-Suq already terminates this courtyard on its rear boundary. Repeating
 * monumental masonry on the adjacent edge would read as one continuous castle
 * rather than as a corner of a city, and would flatten the courtyard's
 * hierarchy — a spawn plaza should have exactly one thing that dominates it.
 * So this edge takes the opposite vocabulary: unequal domestic masses at three
 * different heights, plastered rather than ashlar, with shutters, a service
 * door, a projecting timber oriel and stacked stock, all of it subordinate to
 * the gate it turns the corner into.
 *
 * ## Frame
 *
 * Authored in the shared boundary-kit frame (see `./boundaryKit`): metres, `y`
 * from the paving, `z` outward from the wall plane into the courtyard. This
 * wall faces **east**, so the kit is instanced at design yaw 270, which maps
 * local +Z to design east and local +X to design *south*. Local x = -4
 * therefore lands at design y = 8 (the connector end) and local x = +4 at
 * design y = 0 (the rear corner). Every constant below is in that local frame.
 *
 * The kit is render-only and obeys the shared clearance envelope: nothing below
 * {@link FREE_PROJECTION_Y_M} reaches past {@link LOW_PROJECTION_MAX_M}, depth
 * at that height comes from recesses cut back toward the wall, and ground
 * dressing stays under {@link GROUND_DRESSING_MAX_Y_M}.
 */
export const SPAWN_A_WEST_REFERENCE_WIDTH_M = 8;
export const SPAWN_A_WEST_REFERENCE_HEIGHT_M = 9.8;
export const SPAWN_A_WEST_REFERENCE_DEPTH_M = 2.2;

const Z_BACK_M = -0.3;
const Z_CENTER_M = Z_BACK_M + SPAWN_A_WEST_REFERENCE_DEPTH_M * 0.5;
const HALF_W_M = SPAWN_A_WEST_REFERENCE_WIDTH_M * 0.5;

// Depth datums, matching Bab al-Suq so the corner between them is one wall.
const PLINTH_Z_M = LOW_PROJECTION_MAX_M;
const LOWER_FIELD_Z_M = 0.2;
const LOWER_PIER_Z_M = LOW_PROJECTION_MAX_M;
const UPPER_FIELD_Z_M = 0.52;
const UPPER_PIER_Z_M = 0.62;
const UPPER_RECESS_Z_M = 0.3;

const PLINTH_TOP_M = DATUM_PLINTH_TOP_M;
const STRING_BOTTOM_M = DATUM_STRING_BOTTOM_M;
const STRING_TOP_M = DATUM_STRING_TOP_M;

/**
 * Three houses of deliberately unequal width and height. The tallest stands at
 * the connector end so the edge steps *down* toward the rear corner and hands
 * the skyline to the gate instead of competing with it.
 */
type House = {
  x0: number;
  x1: number;
  eavesY: number;
  parapetY: number;
  plastered: boolean;
};
// One wall material for the whole row, with stone only at the dressings —
// plinth, string course, sills, hoods, quoins and copings. Alternating the
// field material house by house made three buildings out of three paint jobs;
// stepping the heights and letting the openings differ does it properly, and
// keeps the row reading as one street of one town.
const HOUSES: readonly House[] = [
  { x0: -HALF_W_M, x1: -1.5, eavesY: 8.35, parapetY: 9.25, plastered: true },
  { x0: -1.5, x1: 1.2, eavesY: 6.95, parapetY: 7.75, plastered: true },
  { x0: 1.2, x1: HALF_W_M, eavesY: 5.85, parapetY: 6.5, plastered: true },
];
/** Party pilasters run the full height at every house join. */
const PARTY_X_M = [-1.5, 1.2] as const;

// Projecting timber oriel on the tallest house.
const ORIEL_CENTER_X_M = -2.85;
const ORIEL_HALF_W_M = 1.02;
const ORIEL_BOTTOM_M = 4.55;
const ORIEL_TOP_M = 6.45;
const ORIEL_FRONT_Z_M = 1.28;

/** Upper shuttered windows, authored per house. */
// Every sill on the courtyard's shared datum and every head on one line above
// it. Three windows at three different heights read as an accident; three at
// one height read as a floor.
const WINDOWS = [
  { x: -0.15, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3, halfWidth: 0.48 },
  { x: 2.35, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3, halfWidth: 0.48 },
  { x: 3.62, sill: DATUM_SILL_M, head: DATUM_SILL_M + 1.3, halfWidth: 0.48 },
] as const;

/** Closed service door on the lowest house. */
const DOOR_CENTER_X_M = 2.9;
const DOOR_HALF_W_M = 0.62;
const DOOR_HEAD_M = 2.28;

function normalize(geometry: BufferGeometry): BufferGeometry {
  geometry.translate(0, -SPAWN_A_WEST_REFERENCE_HEIGHT_M * 0.5, -Z_CENTER_M);
  geometry.scale(
    1 / SPAWN_A_WEST_REFERENCE_WIDTH_M,
    1 / SPAWN_A_WEST_REFERENCE_HEIGHT_M,
    1 / SPAWN_A_WEST_REFERENCE_DEPTH_M,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Continuous plinth and the ground-line darkening under it. */
function pushPlinth(parts: BufferGeometry[]): void {
  slab(parts, STONE_PIER_ALT, -HALF_W_M, HALF_W_M, 0, 0.28, Z_BACK_M, PLINTH_Z_M);
  slab(parts, STONE_PIER, -HALF_W_M, HALF_W_M, 0.28, PLINTH_TOP_M - 0.1, Z_BACK_M, PLINTH_Z_M - 0.05);
  slab(parts, STONE_TRIM, -HALF_W_M, HALF_W_M, PLINTH_TOP_M - 0.1, PLINTH_TOP_M, Z_BACK_M, PLINTH_Z_M);
  pushUndershade(parts, -HALF_W_M, HALF_W_M, PLINTH_TOP_M - 0.15, LOWER_FIELD_Z_M, PLINTH_Z_M);
  slab(parts, STONE_CREVICE_SOFT, -HALF_W_M, HALF_W_M, 0, 0.14, PLINTH_Z_M - 0.02, PLINTH_Z_M + 0.16);
  slab(parts, STONE_CREVICE, -HALF_W_M, HALF_W_M, 0, 0.05, PLINTH_Z_M + 0.16, PLINTH_Z_M + 0.4);
  // Coursed read so an 8 m plinth is not one unbroken block.
  for (let index = 0; index < 12; index += 1) {
    const x0 = -HALF_W_M + (SPAWN_A_WEST_REFERENCE_WIDTH_M * index) / 12;
    const x1 = x0 + SPAWN_A_WEST_REFERENCE_WIDTH_M / 12;
    if (index % 3 !== 0) continue;
    slab(parts, STONE_CREVICE_SOFT, x1 - 0.05, x1, 0.06, PLINTH_TOP_M - 0.12,
      PLINTH_Z_M - 0.07, PLINTH_Z_M - 0.02);
  }
}

/**
 * House masses, their eaves and parapets, and the party pilasters between them.
 *
 * The three different heights are the whole point: the run currently ends in
 * one flat line against the sky, and a stepped roofline is what turns a wall
 * into a row of buildings.
 */
function pushHouses(parts: BufferGeometry[]): void {
  for (const [index, house] of HOUSES.entries()) {
    const field = house.plastered ? PLASTER_FIELD : STONE_FIELD;
    // Lower storey, with the service door left out of the lowest house.
    const doorOpening = index === 2
      ? {
          x0: DOOR_CENTER_X_M - DOOR_HALF_W_M,
          x1: DOOR_CENTER_X_M + DOOR_HALF_W_M,
          sillY: 0,
          headY: (x: number) => blindArchY(x, DOOR_CENTER_X_M, DOOR_HALF_W_M,
            DOOR_HEAD_M - 0.34, DOOR_HEAD_M),
          floorZ: 0.04,
          floorTone: STONE_SOFFIT,
        }
      : null;
    pushArchedField(parts, field, house.x0, house.x1, PLINTH_TOP_M, STRING_BOTTOM_M,
      Z_BACK_M, LOWER_FIELD_Z_M, doorOpening, 16);

    // No sunk panel here. A house back facing a plaza is a private, largely
    // blind ground storey — that is what makes the shutters and oriel above it
    // read. The panels, limewash and hung goods that used to sit at eye height
    // were a second order competing with the openings, and gave the run its
    // scattered look.

    // Corbelled string course carrying the upper storey out over head height.
    const corbelSpacing = 1.05;
    const corbels = Math.max(1, Math.floor((house.x1 - house.x0) / corbelSpacing));
    for (let corbel = 0; corbel <= corbels; corbel += 1) {
      const x = house.x0 + 0.26 + corbel * corbelSpacing;
      if (x > house.x1 - 0.26) break;
      const reach = LOWER_PIER_Z_M + 0.28 + ((corbel * 5) % 3) * 0.04;
      box(parts, corbel % 2 === 0 ? STONE_TRIM : STONE_PIER, 0.28, 0.32, reach - LOWER_FIELD_Z_M,
        x, STRING_BOTTOM_M + 0.16, (LOWER_FIELD_Z_M + reach) * 0.5);
      pushUndershade(parts, x - 0.15, x + 0.15, STRING_BOTTOM_M - 0.03, LOWER_FIELD_Z_M, reach);
    }
    slab(parts, STONE_PIER, house.x0, house.x1, STRING_BOTTOM_M + 0.14, STRING_BOTTOM_M + 0.3,
      Z_BACK_M, LOWER_PIER_Z_M + 0.12);
    slab(parts, STONE_TRIM, house.x0, house.x1, STRING_BOTTOM_M + 0.3, STRING_BOTTOM_M + 0.44,
      Z_BACK_M, UPPER_FIELD_Z_M - 0.06);
    slab(parts, STONE_PIER, house.x0, house.x1, STRING_BOTTOM_M + 0.44, STRING_TOP_M,
      Z_BACK_M, UPPER_PIER_Z_M);
    pushUndershade(parts, house.x0, house.x1, STRING_TOP_M - 0.06, UPPER_FIELD_Z_M, UPPER_PIER_Z_M);

    // Upper storey, with its shuttered windows left out of the masonry.
    const houseWindows = WINDOWS.filter((w) => w.x > house.x0 && w.x < house.x1);
    let cursor = house.x0;
    for (const window of houseWindows) {
      slab(parts, field, cursor, window.x - window.halfWidth - 0.16, STRING_TOP_M, house.eavesY,
        Z_BACK_M, UPPER_FIELD_Z_M);
      pushArchedField(parts, field, window.x - window.halfWidth - 0.16,
        window.x + window.halfWidth + 0.16, STRING_TOP_M, house.eavesY,
        Z_BACK_M, UPPER_FIELD_Z_M, {
          x0: window.x - window.halfWidth,
          x1: window.x + window.halfWidth,
          sillY: window.sill,
          headY: (x) => blindArchY(x, window.x, window.halfWidth, window.head - 0.3, window.head),
          floorZ: UPPER_RECESS_Z_M - 0.18,
          floorTone: STONE_SOFFIT,
        }, 14);
      // Projecting sill on brackets, and a hood over the head.
      slab(parts, STONE_TRIM, window.x - window.halfWidth - 0.18, window.x + window.halfWidth + 0.18,
        window.sill - 0.14, window.sill, UPPER_RECESS_Z_M - 0.18, UPPER_FIELD_Z_M + 0.16);
      pushUndershade(parts, window.x - window.halfWidth - 0.18, window.x + window.halfWidth + 0.18,
        window.sill - 0.2, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.16);
      for (const bracketSide of [-1, 1] as const) {
        box(parts, STONE_PIER, 0.14, 0.2, 0.2, window.x + bracketSide * (window.halfWidth - 0.06),
          window.sill - 0.26, UPPER_FIELD_Z_M + 0.05);
      }
      slab(parts, STONE_TRIM, window.x - window.halfWidth - 0.2, window.x + window.halfWidth + 0.2,
        window.head + 0.02, window.head + 0.16, UPPER_RECESS_Z_M, UPPER_FIELD_Z_M + 0.2);
      pushUndershade(parts, window.x - window.halfWidth - 0.2, window.x + window.halfWidth + 0.2,
        window.head - 0.04, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.2);
      cursor = window.x + window.halfWidth + 0.16;
    }
    slab(parts, field, cursor, house.x1, STRING_TOP_M, house.eavesY, Z_BACK_M, UPPER_FIELD_Z_M);

    // Eaves: projecting joist ends and the fascia they carry. The regional
    // roof-structure tell, and a row of small casts across a long flat band.
    const joists = Math.max(3, Math.round((house.x1 - house.x0) / 0.46));
    for (let joist = 0; joist < joists; joist += 1) {
      const x = house.x0 + 0.24 + ((house.x1 - house.x0 - 0.48) * joist) / (joists - 1);
      // One rotted-out beam leaves a socket instead of a joist.
      if (index === 0 && joist === 2) {
        slab(parts, STONE_SOFFIT, x - 0.08, x + 0.08, house.eavesY - 0.2, house.eavesY - 0.02,
          UPPER_FIELD_Z_M - 0.16, UPPER_FIELD_Z_M);
        continue;
      }
      const reach = UPPER_FIELD_Z_M + 0.34 + ((joist * 7) % 4) * 0.03;
      box(parts, joist % 3 === 0 ? TIMBER_GATE_EDGE : TIMBER_ROOF, 0.15, 0.18, reach - UPPER_FIELD_Z_M,
        x, house.eavesY - 0.12, (UPPER_FIELD_Z_M + reach) * 0.5);
    }
    slab(parts, STONE_TRIM, house.x0 - 0.06, house.x1 + 0.06, house.eavesY, house.eavesY + 0.2,
      Z_BACK_M, UPPER_FIELD_Z_M + 0.46);
    pushUndershade(parts, house.x0 - 0.06, house.x1 + 0.06, house.eavesY - 0.06,
      UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.46);

    // Parapet and coping. Each house gets its own height and its own coping
    // profile so the skyline is three buildings, not one extrusion.
    slab(parts, house.plastered ? PLASTER_SHADED : STONE_PIER, house.x0, house.x1,
      house.eavesY + 0.2, house.parapetY - 0.14, Z_BACK_M, UPPER_FIELD_Z_M + 0.2);
    slab(parts, STONE_TRIM, house.x0 - 0.05, house.x1 + 0.05, house.parapetY - 0.14, house.parapetY,
      Z_BACK_M, UPPER_FIELD_Z_M + 0.3);
    // Roof clutter breaking the parapet line. Each piece stands on the parapet
    // it is seen against: a stick leaning out of the roof with both ends buried
    // in masonry has no load path and reads as an authoring error, which is
    // exactly what the quality bar rejects.
    if (index === 0) {
      box(parts, STONE_PIER_ALT, 0.42, 0.46, 0.42, house.x0 + 0.9, house.parapetY + 0.23,
        UPPER_FIELD_Z_M - 0.12);
      box(parts, STONE_TRIM, 0.5, 0.08, 0.5, house.x0 + 0.9, house.parapetY + 0.5,
        UPPER_FIELD_Z_M - 0.12);
      pushUndershade(parts, house.x0 + 0.66, house.x0 + 1.14, house.parapetY,
        UPPER_FIELD_Z_M - 0.33, UPPER_FIELD_Z_M + 0.09);
    }
    if (index === 1) {
      // A stack of spare roof timbers lying on the parapet, tied at one end.
      const stackX = house.x1 - 0.72;
      for (let timber = 0; timber < 3; timber += 1) {
        angledBox(parts, timber % 2 === 0 ? TIMBER_ROOF : TIMBER_GATE_EDGE,
          1.05, 0.12, 0.12, stackX, house.parapetY + 0.07 + timber * 0.12,
          UPPER_FIELD_Z_M - 0.14 + timber * 0.03, 0.03 - timber * 0.02);
      }
      box(parts, IRON_DARK, 0.06, 0.4, 0.06, stackX + 0.32, house.parapetY + 0.2,
        UPPER_FIELD_Z_M - 0.11);
      pushUndershade(parts, stackX - 0.55, stackX + 0.55, house.parapetY,
        UPPER_FIELD_Z_M - 0.24, UPPER_FIELD_Z_M + 0.02);
    }
  }

  // Party pilasters at the house joins, plus the crevice that stops two
  // adjacent fields from butting into one flat plane.
  for (const partyX of PARTY_X_M) {
    const left = HOUSES.find((house) => house.x1 === partyX);
    const right = HOUSES.find((house) => house.x0 === partyX);
    const topY = Math.max(left?.parapetY ?? 0, right?.parapetY ?? 0) + 0.16;
    slab(parts, STONE_PIER, partyX - 0.22, partyX + 0.22, 0, STRING_BOTTOM_M,
      Z_BACK_M, LOWER_PIER_Z_M);
    slab(parts, STONE_PIER, partyX - 0.22, partyX + 0.22, STRING_TOP_M, topY,
      Z_BACK_M, UPPER_PIER_Z_M + 0.04);
    slab(parts, STONE_TRIM, partyX - 0.27, partyX + 0.27, topY, topY + 0.16,
      Z_BACK_M, UPPER_PIER_Z_M + 0.12);
    pushUndershade(parts, partyX - 0.27, partyX + 0.27, topY - 0.06,
      UPPER_PIER_Z_M, UPPER_PIER_Z_M + 0.12);
    for (let course = 0; course < 16; course += 1) {
      const y = STRING_TOP_M + 0.3 + course * 0.46;
      if (y > topY - 0.4) break;
      slab(parts, course % 2 === 0 ? STONE_TRIM : STONE_PIER_ALT,
        partyX - (course % 2 === 0 ? 0.22 : 0.15), partyX + (course % 2 === 0 ? 0.22 : 0.15),
        y, y + 0.1, UPPER_PIER_Z_M - 0.04, UPPER_PIER_Z_M + 0.06);
    }
    // Joint shadow down each side of the pilaster. It has to be authored per
    // storey: one full-height band at the upper storey's depth would both stand
    // 0.67 m off the wall where a player walks and read as a black stripe
    // painted down the elevation rather than as a joint.
    for (const jointSide of [-1, 1] as const) {
      const jx = partyX + jointSide * 0.235;
      slab(parts, STONE_CREVICE_SOFT, jx - 0.018, jx + 0.018, PLINTH_TOP_M, STRING_BOTTOM_M,
        LOWER_PIER_Z_M - 0.02, LOWER_PIER_Z_M + 0.005);
      slab(parts, STONE_CREVICE_SOFT, jx - 0.018, jx + 0.018, STRING_TOP_M, topY - 0.1,
        UPPER_PIER_Z_M - 0.02, UPPER_PIER_Z_M + 0.005);
    }
  }

  // End quoins: the connector jamb at one end, the return into Bab al-Suq's
  // corner at the other. Without them the run dies in a raw vertical seam.
  for (const side of [-1, 1] as const) {
    const outerX = side * HALF_W_M;
    const innerX = side * (HALF_W_M - 0.5);
    const x0 = Math.min(outerX, innerX);
    const x1 = Math.max(outerX, innerX);
    const topY = side < 0 ? HOUSES[0]!.parapetY : HOUSES[2]!.parapetY;
    for (let course = 0; ; course += 1) {
      const y0 = course * 0.56;
      if (y0 >= topY) break;
      const y1 = Math.min(topY, y0 + 0.56);
      const short = course % 2 === 1;
      const width = (x1 - x0) * (short ? 0.62 : 1);
      const qx0 = side < 0 ? x0 : x1 - width;
      const z = y1 <= STRING_BOTTOM_M ? LOWER_PIER_Z_M : UPPER_PIER_Z_M;
      slab(parts, short ? STONE_PIER_ALT : STONE_PIER, qx0, qx0 + width, y0, y1 - 0.03,
        Z_BACK_M, short ? z - 0.05 : z + 0.02);
    }
    // Terminal joint, again split by storey so it never stands proud of the
    // wall within reach.
    const ex0 = side < 0 ? -HALF_W_M : HALF_W_M - 0.04;
    const ex1 = side < 0 ? -HALF_W_M + 0.04 : HALF_W_M;
    slab(parts, STONE_CREVICE, ex0, ex1, 0, STRING_BOTTOM_M, Z_BACK_M, LOWER_PIER_Z_M + 0.005);
    slab(parts, STONE_CREVICE, ex0, ex1, STRING_TOP_M, topY, Z_BACK_M, UPPER_PIER_Z_M + 0.005);
  }
}

/** Stone brackets carrying the timber oriel, and the wall fixtures. */
function pushOrielCorbelsAndFixtures(parts: BufferGeometry[]): void {
  for (let index = 0; index < 3; index += 1) {
    const x = ORIEL_CENTER_X_M - ORIEL_HALF_W_M + 0.3
      + index * ((ORIEL_HALF_W_M * 2 - 0.6) / 2);
    const reach = ORIEL_FRONT_Z_M - 0.2;
    box(parts, STONE_PIER, 0.26, 0.22, (UPPER_PIER_Z_M + 0.34) - UPPER_FIELD_Z_M,
      x, ORIEL_BOTTOM_M - 0.4, (UPPER_FIELD_Z_M + UPPER_PIER_Z_M + 0.34) * 0.5);
    box(parts, STONE_TRIM, 0.28, 0.22, reach - UPPER_FIELD_Z_M,
      x, ORIEL_BOTTOM_M - 0.18, (UPPER_FIELD_Z_M + reach) * 0.5);
    pushUndershade(parts, x - 0.15, x + 0.15, ORIEL_BOTTOM_M - 0.52,
      UPPER_FIELD_Z_M, UPPER_PIER_Z_M + 0.34);
    pushUndershade(parts, x - 0.16, x + 0.16, ORIEL_BOTTOM_M - 0.3, UPPER_FIELD_Z_M, reach);
  }
  slab(parts, STONE_TRIM, ORIEL_CENTER_X_M - ORIEL_HALF_W_M - 0.09,
    ORIEL_CENTER_X_M + ORIEL_HALF_W_M + 0.09, ORIEL_BOTTOM_M - 0.08, ORIEL_BOTTOM_M,
    UPPER_FIELD_Z_M, ORIEL_FRONT_Z_M);
  pushUndershade(parts, ORIEL_CENTER_X_M - ORIEL_HALF_W_M - 0.09,
    ORIEL_CENTER_X_M + ORIEL_HALF_W_M + 0.09, ORIEL_BOTTOM_M - 0.14,
    UPPER_FIELD_Z_M, ORIEL_FRONT_Z_M);

  // Service-door hood on the lowest house, and the drip stain under it.
  slab(parts, STONE_TRIM, DOOR_CENTER_X_M - DOOR_HALF_W_M - 0.2,
    DOOR_CENTER_X_M + DOOR_HALF_W_M + 0.2, DOOR_HEAD_M + 0.02, DOOR_HEAD_M + 0.16,
    Z_BACK_M, LOWER_PIER_Z_M + 0.02);
  pushUndershade(parts, DOOR_CENTER_X_M - DOOR_HALF_W_M - 0.2,
    DOOR_CENTER_X_M + DOOR_HALF_W_M + 0.2, DOOR_HEAD_M - 0.04,
    LOWER_FIELD_Z_M, LOWER_PIER_Z_M + 0.02);
  // Worn threshold slab at the door.
  slab(parts, STONE_TRIM, DOOR_CENTER_X_M - DOOR_HALF_W_M - 0.1,
    DOOR_CENTER_X_M + DOOR_HALF_W_M + 0.1, 0, 0.13, 0.04, PLINTH_Z_M + 0.5);

  // Wall lamp bracket above head height, on the middle house.
  box(parts, STONE_TRIM, 0.28, 0.2, 0.24, -0.15, 3.42, UPPER_PIER_Z_M + 0.1);
  pushUndershade(parts, -0.29, -0.01, 3.3, UPPER_FIELD_Z_M, UPPER_PIER_Z_M + 0.22);

  // Drain spout through the lowest parapet, and its stain.
  box(parts, STONE_TRIM, 0.22, 0.18, 0.5, 3.9, HOUSES[2]!.eavesY - 0.1, UPPER_FIELD_Z_M + 0.4);
  slab(parts, STONE_RECESS_DEEP, 3.79, 4.01, STRING_TOP_M, HOUSES[2]!.eavesY - 0.2,
    UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.012);
}

/** Apron, drift and low stock along the base, in the rear boundary's language. */
function pushGroundDressing(parts: BufferGeometry[]): void {
  for (let index = 0; index < 10; index += 1) {
    const x0 = -HALF_W_M + (SPAWN_A_WEST_REFERENCE_WIDTH_M * index) / 10;
    const x1 = x0 + SPAWN_A_WEST_REFERENCE_WIDTH_M / 10 - 0.05;
    const depth = 1.2 + ((index * 5) % 3) * 0.09;
    const worn = (index * 3) % 4 === 0;
    slab(parts, worn ? APRON_WORN : APRON_FLAG, x0, x1, 0, 0.075, PLINTH_Z_M, PLINTH_Z_M + depth);
    if (index % 4 === 1) {
      slab(parts, APRON_PATCH, x0 + 0.08, x1 - 0.2, 0.075, 0.085,
        PLINTH_Z_M + 0.16, PLINTH_Z_M + depth - 0.3);
    }
    slab(parts, STONE_TRIM, x0, x1, 0.075, 0.155, PLINTH_Z_M + depth - 0.2, PLINTH_Z_M + depth);
    // Shadow line off the kerb, laid flat on the paving. As a standing block it
    // reads as a row of black teeth from any oblique camera.
    slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.02, PLINTH_Z_M + depth, PLINTH_Z_M + depth + 0.14);
    slab(parts, STONE_CREVICE_SOFT, x1, x1 + 0.05, 0, 0.08, PLINTH_Z_M, PLINTH_Z_M + depth);
  }
  // Blown sand banked into the corner the courtyard never sweeps.
  for (let index = 0; index < 5; index += 1) {
    const x = 1.4 + index * 1.3;
    const height = 0.1 + index * 0.025;
    slab(parts, SAND_DRIFT, x - 0.75, x + 0.75, 0, height, PLINTH_Z_M - 0.05, PLINTH_Z_M + 0.6);
    slab(parts, SAND_DRIFT, x - 1, x + 1, 0, height * 0.5, PLINTH_Z_M + 0.6, PLINTH_Z_M + 0.95);
  }
  for (const stone of [
    { x: -3.4, w: 0.4, h: 0.26, d: 0.36, z: 0.78 },
    { x: -3.05, w: 0.26, h: 0.17, d: 0.24, z: 1.06 },
    { x: 3.7, w: 0.34, h: 0.22, d: 0.3, z: 0.84 },
  ]) {
    box(parts, RUBBLE, stone.w, stone.h, stone.d, stone.x, stone.h * 0.5, stone.z);
    slab(parts, STONE_CREVICE_SOFT, stone.x - stone.w * 0.6, stone.x + stone.w * 0.6, 0, 0.02,
      stone.z - stone.d * 0.6, stone.z + stone.d * 0.6);
  }
}

/** Stone geometry: the three house masses and everything masonry on them. */
export function createSpawnAWestBacksStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushPlinth(parts);
  pushHouses(parts);
  pushOrielCorbelsAndFixtures(parts);
  pushGroundDressing(parts);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/**
 * Timber, cloth and ironwork: the shutters, the oriel, the service door, and
 * the low stock and hung goods that make the backs read as lived behind.
 */
export function createSpawnAWestBacksFixtureGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Shuttered windows. Each pair is set at its own angle so the row is not one
  // repeated state: shut, ajar, and one leaf missing.
  for (const [index, window] of WINDOWS.entries()) {
    const recessZ = UPPER_FIELD_Z_M - 0.18;
    const leafHalf = window.halfWidth * 0.5;
    for (const side of [-1, 1] as const) {
      if (index === 1 && side < 0) continue;
      const open = index === 0 && side > 0 ? 0.13 : 0;
      const cx = window.x + side * leafHalf;
      slab(parts, side < 0 ? SHUTTER_TEAL : SHUTTER_TEAL_EDGE,
        cx - leafHalf + 0.02, cx + leafHalf - 0.02, window.sill + 0.04, window.head - 0.1,
        recessZ + 0.02 + open, recessZ + 0.07 + open);
      // Louvre boards.
      for (let slat = 0; slat < 7; slat += 1) {
        const y = window.sill + 0.1 + slat * ((window.head - window.sill - 0.26) / 6);
        slab(parts, slat % 2 === 0 ? SHUTTER_TEAL_EDGE : SHUTTER_TEAL,
          cx - leafHalf + 0.03, cx + leafHalf - 0.03, y, y + 0.05,
          recessZ + 0.07 + open, recessZ + 0.09 + open);
      }
      box(parts, IRON_DARK, 0.05, 0.05, 0.05, cx, window.sill + 0.22, recessZ + 0.11 + open);
    }
    // Unlit interior behind the opening, plus a rail with hung cloth on one.
    if (index === 1) {
      slab(parts, CLOTH_FADED, window.x - window.halfWidth + 0.06, window.x - 0.02,
        window.sill - 0.36, window.head - 0.24, recessZ + 0.04, recessZ + 0.08);
    }
    box(parts, IRON_RUST, 0.07, 0.07, 0.05, window.x, window.head - 0.06, UPPER_FIELD_Z_M + 0.14);
  }

  // Mashrabiya oriel on the tallest house.
  const latticeZ = ORIEL_FRONT_Z_M;
  slab(parts, TIMBER_ROOF, ORIEL_CENTER_X_M - ORIEL_HALF_W_M, ORIEL_CENTER_X_M + ORIEL_HALF_W_M,
    ORIEL_BOTTOM_M, ORIEL_BOTTOM_M + 0.13, UPPER_FIELD_Z_M, latticeZ);
  slab(parts, TIMBER_ROOF, ORIEL_CENTER_X_M - ORIEL_HALF_W_M, ORIEL_CENTER_X_M + ORIEL_HALF_W_M,
    ORIEL_TOP_M - 0.16, ORIEL_TOP_M, UPPER_FIELD_Z_M, latticeZ);
  for (const side of [-1, 1] as const) {
    const x = ORIEL_CENTER_X_M + side * ORIEL_HALF_W_M;
    slab(parts, TIMBER_ROOF, x - 0.07, x + 0.07, ORIEL_BOTTOM_M, ORIEL_TOP_M,
      UPPER_FIELD_Z_M, latticeZ);
    for (let index = 0; index < 5; index += 1) {
      const z = UPPER_FIELD_Z_M + 0.1 + index * ((latticeZ - UPPER_FIELD_Z_M - 0.18) / 4);
      slab(parts, TIMBER_LATTICE, x - 0.04, x + 0.04, ORIEL_BOTTOM_M + 0.15, ORIEL_TOP_M - 0.18,
        z, z + 0.032);
    }
  }
  const barCount = 15;
  for (let index = 0; index < barCount; index += 1) {
    const x = ORIEL_CENTER_X_M - ORIEL_HALF_W_M + 0.12
      + index * ((ORIEL_HALF_W_M * 2 - 0.24) / (barCount - 1));
    slab(parts, index % 2 === 0 ? TIMBER_LATTICE : TIMBER_ROOF, x - 0.026, x + 0.026,
      ORIEL_BOTTOM_M + 0.13, ORIEL_TOP_M - 0.16, latticeZ - 0.05, latticeZ);
  }
  for (const railY of [ORIEL_BOTTOM_M + 0.46, ORIEL_TOP_M - 0.46]) {
    slab(parts, TIMBER_ROOF, ORIEL_CENTER_X_M - ORIEL_HALF_W_M + 0.07,
      ORIEL_CENTER_X_M + ORIEL_HALF_W_M - 0.07, railY, railY + 0.07,
      latticeZ - 0.07, latticeZ + 0.015);
  }
  angledBox(parts, TIMBER_ROOF, ORIEL_HALF_W_M * 2 + 0.26, 0.09, latticeZ - UPPER_FIELD_Z_M + 0.22,
    ORIEL_CENTER_X_M, ORIEL_TOP_M + 0.11, (UPPER_FIELD_Z_M + latticeZ) * 0.5 + 0.05, 0);
  for (let index = 0; index < 5; index += 1) {
    const x = ORIEL_CENTER_X_M - ORIEL_HALF_W_M + 0.16
      + index * ((ORIEL_HALF_W_M * 2 - 0.32) / 4);
    box(parts, TIMBER_LATTICE, 0.075, 0.075, 0.2, x, ORIEL_TOP_M + 0.04, latticeZ + 0.09);
  }

  // Closed service door: braced boards, strap hinges, a ring pull and a bar.
  const doorZ = 0.1;
  for (let plank = 0; plank < 5; plank += 1) {
    const px0 = DOOR_CENTER_X_M - DOOR_HALF_W_M + 0.05 + plank * ((DOOR_HALF_W_M * 2 - 0.1) / 5);
    const px1 = px0 + (DOOR_HALF_W_M * 2 - 0.1) / 5;
    slab(parts, plank % 2 === 0 ? TIMBER_GATE : TIMBER_GATE_ALT, px0 + 0.008, px1 - 0.008,
      0.13, DOOR_HEAD_M - 0.24, doorZ - 0.05, doorZ);
    slab(parts, TIMBER_GATE_EDGE, px1 - 0.012, px1, 0.13, DOOR_HEAD_M - 0.24,
      doorZ - 0.05, doorZ + 0.004);
  }
  for (const strapY of [0.42, 1.72]) {
    slab(parts, IRON_DARK, DOOR_CENTER_X_M - DOOR_HALF_W_M + 0.05,
      DOOR_CENTER_X_M + DOOR_HALF_W_M - 0.05, strapY, strapY + 0.09, doorZ, doorZ + 0.03);
    for (let stud = 0; stud < 4; stud += 1) {
      const sx = DOOR_CENTER_X_M - DOOR_HALF_W_M + 0.16 + stud * ((DOOR_HALF_W_M * 2 - 0.32) / 3);
      box(parts, IRON_RUST, 0.06, 0.06, 0.04, sx, strapY + 0.045, doorZ + 0.045);
    }
  }
  angledBox(parts, TIMBER_GATE_EDGE, DOOR_HALF_W_M * 2.2, 0.11, 0.04,
    DOOR_CENTER_X_M, 1.08, doorZ + 0.03, 0.72);
  box(parts, IRON_DARK, 0.12, 0.12, 0.05, DOOR_CENTER_X_M + 0.34, 1.02, doorZ + 0.05);

  // The hung goods that dressed the sunk panels are gone with them.

  // Low stock at the base, kept under the camera.
  for (const item of [
    { x: -3.55, w: 0.82, h: 0.32, d: 0.58, z: 0.7, tone: TIMBER_ROOF },
    { x: -3.5, w: 0.66, h: 0.1, d: 0.48, z: 0.76, tone: TIMBER_LATTICE },
    { x: -2.6, w: 0.56, h: 0.26, d: 0.46, z: 0.64, tone: TIMBER_GATE },
    { x: 0.55, w: 0.98, h: 0.22, d: 0.42, z: 0.6, tone: TIMBER_LATTICE },
    { x: 1.35, w: 0.46, h: 0.4, d: 0.44, z: 0.66, tone: CLOTH_PALE },
  ]) {
    box(parts, item.tone, item.w, item.h, item.d, item.x, item.h * 0.5, item.z);
    // Lid band with real thickness, and a contact shadow under the footprint. A
    // 0.035 m band on a stone ledge reads as a paper card laid on the plinth.
    box(parts, TIMBER_GATE_EDGE, item.w + 0.02, 0.07, item.d + 0.02, item.x, item.h - 0.035, item.z);
    slab(parts, STONE_CREVICE_SOFT, item.x - item.w * 0.58, item.x + item.w * 0.58, 0, 0.02,
      item.z - item.d * 0.58, item.z + item.d * 0.58);
  }
  box(parts, CLOTH_FADED, 0.95, 0.24, 0.24, -1.65, 0.12, 0.5);
  box(parts, TIMBER_GATE_EDGE, 0.96, 0.07, 0.07, -1.65, 0.12, 0.63);

  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/** Unlit interiors behind the shutters and the oriel screen. */
export function createSpawnAWestBacksVoidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const window of WINDOWS) {
    slab(parts, VOID_DARK, window.x - window.halfWidth + 0.04, window.x + window.halfWidth - 0.04,
      window.sill + 0.02, window.head - 0.08, UPPER_RECESS_Z_M - 0.2, UPPER_RECESS_Z_M - 0.17);
  }
  slab(parts, VOID_DARK, ORIEL_CENTER_X_M - ORIEL_HALF_W_M + 0.09,
    ORIEL_CENTER_X_M + ORIEL_HALF_W_M - 0.09, ORIEL_BOTTOM_M + 0.15, ORIEL_TOP_M - 0.18,
    UPPER_FIELD_Z_M + 0.05, ORIEL_FRONT_Z_M - 0.08);
  slab(parts, VOID_DARK, DOOR_CENTER_X_M - DOOR_HALF_W_M + 0.06,
    DOOR_CENTER_X_M + DOOR_HALF_W_M - 0.06, 0.12, DOOR_HEAD_M - 0.22, 0.02, 0.045);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}
