import { BoxGeometry, Float32BufferAttribute, type BufferGeometry } from "three";
import { mergeProceduralGeometry } from "./propsCore";
import {
  APRON_FLAG,
  APRON_PATCH,
  APRON_WORN,
  BRICK_INFILL,
  BRICK_INFILL_ALT,
  DYE_INDIGO,
  DYE_INDIGO_DEEP,
  DYE_MADDER,
  DYE_MADDER_DEEP,
  DYE_SAFFRON,
  DYE_TEAL,
  DATUM_PLINTH_TOP_M,
  DATUM_STRING_BOTTOM_M,
  DATUM_STRING_TOP_M,
  FREE_PROJECTION_Y_M,
  GROUND_DRESSING_MAX_Y_M,
  IRON_DARK,
  IRON_RUST,
  LOW_PROJECTION_MAX_M,
  OCHRE_FIELD,
  OCHRE_FIELD_ALT,
  OCHRE_SHADED,
  RUBBLE,
  SAND_DRIFT,
  SOOT_DARK,
  STONE_CREVICE,
  STONE_CREVICE_SOFT,
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
 * The east courtyard edge of A spawn: the back of a dye works.
 *
 * Like the west edge, this is 8 m of blank blockout plane between the
 * courtyard's corner and a route connector. Unlike the west edge, it faces the
 * route out to the Dyers district, so it gets that district's work rather than
 * more housing.
 *
 * ## Why a dye works, and why it is the only colour on this courtyard
 *
 * The courtyard now has a monumental sealed gate on its rear boundary and
 * domestic house backs on its west edge. A third variation on "wall with
 * windows" would leave a player unable to tell the three edges apart, and would
 * leave the whole plaza in one sandstone value with no colour anywhere.
 *
 * So this edge is a working yard: ochre plaster instead of ashlar, a boiler
 * stack breaking the skyline where the other edges step or crenellate, a
 * bricked-up arch, a loading door, and — the point of the whole thing —
 * cantilevered drying rails carrying dyed cloth in indigo, madder and saffron.
 * That hung cloth is the one saturated accent in the courtyard, it is the
 * bazaar-density element the plaza otherwise lacks, and unlike an awning over
 * the plinth it hangs *down* across the wall, so it reads face-on from the
 * courtyard instead of edge-on from standing eye height.
 *
 * ## Frame
 *
 * Authored in the shared boundary-kit frame (see `./boundaryKit`): metres, `y`
 * from the paving, `z` outward from the wall plane into the courtyard. This
 * wall faces **west**, so the kit is instanced at design yaw 90, which maps
 * local +Z to design west and local +X to design *north*. Local x = -4
 * therefore lands at design y = 0 (the rear corner) and local x = +4 at design
 * y = 8 (the connector end).
 *
 * The kit is render-only and obeys the shared clearance envelope: nothing below
 * {@link FREE_PROJECTION_Y_M} reaches past {@link LOW_PROJECTION_MAX_M}, depth
 * at that height comes from recesses cut back toward the wall, and ground
 * dressing stays under {@link GROUND_DRESSING_MAX_Y_M}. The drying rails and
 * everything hung from them sit well above head height.
 */
export const SPAWN_A_EAST_REFERENCE_WIDTH_M = 8;
export const SPAWN_A_EAST_REFERENCE_HEIGHT_M = 12.8;
export const SPAWN_A_EAST_REFERENCE_DEPTH_M = 2.4;

const Z_BACK_M = -0.3;
const Z_CENTER_M = Z_BACK_M + SPAWN_A_EAST_REFERENCE_DEPTH_M * 0.5;
const HALF_W_M = SPAWN_A_EAST_REFERENCE_WIDTH_M * 0.5;

// Depth datums, shared with the other two edges of this courtyard.
const PLINTH_Z_M = LOW_PROJECTION_MAX_M;
const LOWER_FIELD_Z_M = 0.2;
const LOWER_PIER_Z_M = LOW_PROJECTION_MAX_M;
const UPPER_FIELD_Z_M = 0.52;
const UPPER_PIER_Z_M = 0.62;
const UPPER_RECESS_Z_M = 0.3;
const RECESS_FLOOR_Z_M = 0.04;

const PLINTH_TOP_M = DATUM_PLINTH_TOP_M;
const STRING_BOTTOM_M = DATUM_STRING_BOTTOM_M;
const STRING_TOP_M = DATUM_STRING_TOP_M;

/** The boiler house, tall enough to hide the 9.5 m wall behind it. */
const WORKS_X0_M = -HALF_W_M;
const WORKS_X1_M = -0.5;
const WORKS_EAVES_M = 8.85;
const WORKS_PARAPET_M = 9.7;
/** The lower yard wall carrying the drying rails. */
const YARD_X0_M = -0.5;
const YARD_X1_M = HALF_W_M;
const YARD_EAVES_M = 5.95;
const YARD_PARAPET_M = 6.6;

/** Boiler stack: the edge's silhouette, and its counterpart to the gate turrets. */
const STACK_CENTER_X_M = -2.95;
const STACK_HALF_W_M = 0.52;
const STACK_TOP_M = 12.55;

/** Bricked-up arch on the works, cut back to the wall plane. */
const ARCH_CENTER_X_M = -1.55;
const ARCH_HALF_W_M = 1.05;
const ARCH_SPRING_M = 2.55;
const ARCH_APEX_M = 3.95;

/** Loading door on the yard wall. */
const DOOR_CENTER_X_M = 1.15;
const DOOR_HALF_W_M = 1;
const DOOR_HEAD_M = 2.85;

/**
 * Cantilevered drying rails. Both sit above {@link FREE_PROJECTION_Y_M} plus
 * the deepest cloth drop, so a player walks under the whole assembly.
 */
const RAILS = [
  { y: 5.35, reachZ: 1.55, x0: -0.2, x1: 3.85, brackets: 4 },
  { y: 4.15, reachZ: 1.1, x0: 1.25, x1: 3.9, brackets: 3 },
] as const;
/** Lowest any hung cloth may reach. */
const CLOTH_FLOOR_M = 3.05;

function normalize(geometry: BufferGeometry): BufferGeometry {
  geometry.translate(0, -SPAWN_A_EAST_REFERENCE_HEIGHT_M * 0.5, -Z_CENTER_M);
  geometry.scale(
    1 / SPAWN_A_EAST_REFERENCE_WIDTH_M,
    1 / SPAWN_A_EAST_REFERENCE_HEIGHT_M,
    1 / SPAWN_A_EAST_REFERENCE_DEPTH_M,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Continuous plinth and the ground-line darkening under it. */
function pushPlinth(parts: BufferGeometry[]): void {
  slab(parts, STONE_PIER_ALT, -HALF_W_M, HALF_W_M, 0, 0.3, Z_BACK_M, PLINTH_Z_M);
  slab(parts, STONE_PIER, -HALF_W_M, HALF_W_M, 0.3, PLINTH_TOP_M - 0.1, Z_BACK_M, PLINTH_Z_M - 0.05);
  slab(parts, STONE_TRIM, -HALF_W_M, HALF_W_M, PLINTH_TOP_M - 0.1, PLINTH_TOP_M, Z_BACK_M, PLINTH_Z_M);
  pushUndershade(parts, -HALF_W_M, HALF_W_M, PLINTH_TOP_M - 0.15, LOWER_FIELD_Z_M, PLINTH_Z_M);
  slab(parts, STONE_CREVICE_SOFT, -HALF_W_M, HALF_W_M, 0, 0.14, PLINTH_Z_M - 0.02, PLINTH_Z_M + 0.16);
  slab(parts, STONE_CREVICE, -HALF_W_M, HALF_W_M, 0, 0.05, PLINTH_Z_M + 0.16, PLINTH_Z_M + 0.4);
  // Dye that has run down the wall and stained the plinth, worst under the
  // rails. This is the tell that the colour above is not decoration.
  for (const stain of [
    { x: 0.55, width: 0.7, tone: DYE_INDIGO_DEEP },
    { x: 1.95, width: 0.5, tone: DYE_MADDER_DEEP },
    { x: 3.1, width: 0.62, tone: DYE_INDIGO_DEEP },
  ]) {
    slab(parts, stain.tone, stain.x - stain.width * 0.5, stain.x + stain.width * 0.5,
      0.02, PLINTH_TOP_M - 0.06, PLINTH_Z_M - 0.045, PLINTH_Z_M - 0.033);
    slab(parts, stain.tone, stain.x - stain.width * 0.7, stain.x + stain.width * 0.7,
      0, 0.03, PLINTH_Z_M, PLINTH_Z_M + 0.5);
  }
}

/**
 * The two masses: boiler house and yard wall, their openings, eaves and
 * parapets, and the party pilaster between them.
 */
function pushMasses(parts: BufferGeometry[]): void {
  // Boiler house lower storey, with the bricked-up arch left out of the field.
  pushArchedField(parts, OCHRE_FIELD, WORKS_X0_M, WORKS_X1_M, PLINTH_TOP_M, STRING_BOTTOM_M,
    Z_BACK_M, LOWER_FIELD_Z_M, {
      x0: ARCH_CENTER_X_M - ARCH_HALF_W_M,
      x1: ARCH_CENTER_X_M + ARCH_HALF_W_M,
      sillY: 0,
      headY: (x) => blindArchY(x, ARCH_CENTER_X_M, ARCH_HALF_W_M, ARCH_SPRING_M, ARCH_APEX_M),
      floorZ: RECESS_FLOOR_Z_M,
      floorTone: STONE_SOFFIT,
    }, 22);
  // The arch continues above head height, so the upper storey has to leave it
  // out too or the head would be buried.
  pushArchedField(parts, OCHRE_FIELD, WORKS_X0_M, WORKS_X1_M, STRING_TOP_M, WORKS_EAVES_M,
    Z_BACK_M, UPPER_FIELD_Z_M, {
      x0: ARCH_CENTER_X_M - ARCH_HALF_W_M,
      x1: ARCH_CENTER_X_M + ARCH_HALF_W_M,
      sillY: STRING_TOP_M,
      headY: (x) => blindArchY(x, ARCH_CENTER_X_M, ARCH_HALF_W_M, ARCH_SPRING_M, ARCH_APEX_M),
      floorZ: UPPER_RECESS_Z_M,
      floorTone: OCHRE_SHADED,
    }, 22);

  // Brick infill filling the arch: the works was closed up, not merely shut.
  // Coursed, with a couple of courses left short so it reads as later work.
  for (let course = 0; course < 12; course += 1) {
    const y0 = 0.14 + course * 0.32;
    const headAt = blindArchY(0, ARCH_CENTER_X_M, ARCH_HALF_W_M, ARCH_SPRING_M, ARCH_APEX_M);
    if (y0 > headAt - 0.2) break;
    const inset = course === 7 ? 0.22 : course === 10 ? 0.34 : 0;
    // Follow the arch head where the courses reach it.
    const halfAt = y0 > ARCH_SPRING_M
      ? ARCH_HALF_W_M * Math.sqrt(Math.max(0, 1 - ((y0 - ARCH_SPRING_M) / (ARCH_APEX_M - ARCH_SPRING_M)) ** 2))
      : ARCH_HALF_W_M;
    slab(parts, course % 2 === 0 ? BRICK_INFILL : BRICK_INFILL_ALT,
      ARCH_CENTER_X_M - halfAt + 0.05 + inset, ARCH_CENTER_X_M + halfAt - 0.05 - inset,
      y0, y0 + 0.28, RECESS_FLOOR_Z_M + 0.02, RECESS_FLOOR_Z_M + 0.13);
  }
  // Relieving arch of brick voussoirs over the infill.
  for (let index = 0; index < 22; index += 1) {
    const cx0 = ARCH_CENTER_X_M - ARCH_HALF_W_M + (ARCH_HALF_W_M * 2 * index) / 22;
    const cx1 = ARCH_CENTER_X_M - ARCH_HALF_W_M + (ARCH_HALF_W_M * 2 * (index + 1)) / 22;
    const inner = blindArchY((cx0 + cx1) * 0.5, ARCH_CENTER_X_M, ARCH_HALF_W_M,
      ARCH_SPRING_M, ARCH_APEX_M);
    const outer = blindArchY((cx0 + cx1) * 0.5, ARCH_CENTER_X_M, ARCH_HALF_W_M + 0.2,
      ARCH_SPRING_M, ARCH_APEX_M + 0.26);
    if (outer <= inner) continue;
    slab(parts, index % 2 === 0 ? STONE_TRIM : BRICK_INFILL_ALT, cx0 + 0.006, cx1 - 0.006,
      inner, outer, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.09);
  }
  // Impost blocks at the springing.
  for (const side of [-1, 1] as const) {
    box(parts, STONE_TRIM, 0.36, 0.13, 0.16, ARCH_CENTER_X_M + side * (ARCH_HALF_W_M + 0.07),
      ARCH_SPRING_M - 0.06, LOWER_PIER_Z_M);
  }

  // Two high vents on the works, with real voids behind.
  for (const vent of [{ x: -3.5, y: 6.35 }, { x: -0.95, y: 6.05 }]) {
    slab(parts, STONE_TRIM, vent.x - 0.34, vent.x + 0.34, vent.y - 0.12, vent.y,
      UPPER_RECESS_Z_M - 0.16, UPPER_FIELD_Z_M + 0.08);
    slab(parts, STONE_SOFFIT, vent.x - 0.26, vent.x + 0.26, vent.y, vent.y + 0.62,
      UPPER_RECESS_Z_M - 0.16, UPPER_RECESS_Z_M);
    slab(parts, STONE_TRIM, vent.x - 0.38, vent.x + 0.38, vent.y + 0.62, vent.y + 0.74,
      UPPER_RECESS_Z_M - 0.16, UPPER_FIELD_Z_M + 0.1);
    pushUndershade(parts, vent.x - 0.38, vent.x + 0.38, vent.y + 0.56,
      UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.1);
    for (let bar = 0; bar < 3; bar += 1) {
      slab(parts, IRON_RUST, vent.x - 0.24 + bar * 0.24, vent.x - 0.2 + bar * 0.24,
        vent.y + 0.02, vent.y + 0.6, UPPER_RECESS_Z_M - 0.02, UPPER_RECESS_Z_M + 0.03);
    }
  }

  // Yard wall lower storey, with the loading door left out of the field.
  pushArchedField(parts, OCHRE_FIELD_ALT, YARD_X0_M, YARD_X1_M, PLINTH_TOP_M, STRING_BOTTOM_M,
    Z_BACK_M, LOWER_FIELD_Z_M, {
      x0: DOOR_CENTER_X_M - DOOR_HALF_W_M,
      x1: DOOR_CENTER_X_M + DOOR_HALF_W_M,
      sillY: 0,
      headY: (x) => blindArchY(x, DOOR_CENTER_X_M, DOOR_HALF_W_M, DOOR_HEAD_M - 0.42, DOOR_HEAD_M),
      floorZ: RECESS_FLOOR_Z_M,
      floorTone: STONE_SOFFIT,
    }, 18);
  slab(parts, OCHRE_FIELD_ALT, YARD_X0_M, YARD_X1_M, STRING_TOP_M, YARD_EAVES_M,
    Z_BACK_M, UPPER_FIELD_Z_M);
  // Timber lintel over the door, and its worn threshold.
  slab(parts, TIMBER_ROOF, DOOR_CENTER_X_M - DOOR_HALF_W_M - 0.22,
    DOOR_CENTER_X_M + DOOR_HALF_W_M + 0.22, DOOR_HEAD_M, DOOR_HEAD_M + 0.22,
    Z_BACK_M, LOWER_PIER_Z_M + 0.04);
  pushUndershade(parts, DOOR_CENTER_X_M - DOOR_HALF_W_M - 0.22,
    DOOR_CENTER_X_M + DOOR_HALF_W_M + 0.22, DOOR_HEAD_M - 0.05,
    LOWER_FIELD_Z_M, LOWER_PIER_Z_M + 0.04);
  slab(parts, STONE_TRIM, DOOR_CENTER_X_M - DOOR_HALF_W_M - 0.12,
    DOOR_CENTER_X_M + DOOR_HALF_W_M + 0.12, 0, 0.14, RECESS_FLOOR_Z_M, PLINTH_Z_M + 0.62);

  // Corbelled string course across both masses, carrying the upper storey out.
  for (const [x0, x1] of [[WORKS_X0_M, WORKS_X1_M], [YARD_X0_M, YARD_X1_M]] as const) {
    const spacing = 1.14;
    const count = Math.max(1, Math.floor((x1 - x0) / spacing));
    for (let index = 0; index <= count; index += 1) {
      const x = x0 + 0.26 + index * spacing;
      if (x > x1 - 0.26) break;
      const reach = LOWER_PIER_Z_M + 0.28 + ((index * 5) % 3) * 0.04;
      box(parts, index % 2 === 0 ? STONE_TRIM : STONE_PIER, 0.28, 0.32, reach - LOWER_FIELD_Z_M,
        x, STRING_BOTTOM_M + 0.16, (LOWER_FIELD_Z_M + reach) * 0.5);
      pushUndershade(parts, x - 0.15, x + 0.15, STRING_BOTTOM_M - 0.03, LOWER_FIELD_Z_M, reach);
    }
    slab(parts, STONE_PIER, x0, x1, STRING_BOTTOM_M + 0.14, STRING_BOTTOM_M + 0.3,
      Z_BACK_M, LOWER_PIER_Z_M + 0.12);
    slab(parts, STONE_TRIM, x0, x1, STRING_BOTTOM_M + 0.3, STRING_BOTTOM_M + 0.44,
      Z_BACK_M, UPPER_FIELD_Z_M - 0.06);
    slab(parts, STONE_PIER, x0, x1, STRING_BOTTOM_M + 0.44, STRING_TOP_M, Z_BACK_M, UPPER_PIER_Z_M);
    pushUndershade(parts, x0, x1, STRING_TOP_M - 0.06, UPPER_FIELD_Z_M, UPPER_PIER_Z_M);
    slab(parts, STONE_CREVICE, x0, x1, STRING_BOTTOM_M - 0.1, STRING_BOTTOM_M + 0.14,
      LOWER_FIELD_Z_M, LOWER_FIELD_Z_M + 0.02);
  }

  // Eaves and parapets. Two heights, both flat-capped: the crenellation
  // vocabulary belongs to the gate and must not appear here.
  for (const [x0, x1, eaves, parapet] of [
    [WORKS_X0_M, WORKS_X1_M, WORKS_EAVES_M, WORKS_PARAPET_M],
    [YARD_X0_M, YARD_X1_M, YARD_EAVES_M, YARD_PARAPET_M],
  ] as const) {
    const joists = Math.max(3, Math.round((x1 - x0) / 0.48));
    for (let joist = 0; joist < joists; joist += 1) {
      const x = x0 + 0.24 + ((x1 - x0 - 0.48) * joist) / (joists - 1);
      const reach = UPPER_FIELD_Z_M + 0.32 + ((joist * 7) % 4) * 0.03;
      box(parts, joist % 3 === 0 ? TIMBER_GATE_EDGE : TIMBER_ROOF, 0.14, 0.17,
        reach - UPPER_FIELD_Z_M, x, eaves - 0.12, (UPPER_FIELD_Z_M + reach) * 0.5);
    }
    slab(parts, STONE_TRIM, x0 - 0.06, x1 + 0.06, eaves, eaves + 0.2, Z_BACK_M, UPPER_FIELD_Z_M + 0.44);
    pushUndershade(parts, x0 - 0.06, x1 + 0.06, eaves - 0.06, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.44);
    slab(parts, OCHRE_SHADED, x0, x1, eaves + 0.2, parapet - 0.14, Z_BACK_M, UPPER_FIELD_Z_M + 0.2);
    slab(parts, STONE_TRIM, x0 - 0.05, x1 + 0.05, parapet - 0.14, parapet, Z_BACK_M, UPPER_FIELD_Z_M + 0.3);
  }

  // Party pilaster between the two masses.
  const partyX = WORKS_X1_M;
  const topY = WORKS_PARAPET_M + 0.16;
  slab(parts, STONE_PIER, partyX - 0.24, partyX + 0.24, 0, STRING_BOTTOM_M, Z_BACK_M, LOWER_PIER_Z_M);
  slab(parts, STONE_PIER, partyX - 0.24, partyX + 0.24, STRING_TOP_M, topY, Z_BACK_M, UPPER_PIER_Z_M + 0.04);
  slab(parts, STONE_TRIM, partyX - 0.29, partyX + 0.29, topY, topY + 0.16, Z_BACK_M, UPPER_PIER_Z_M + 0.12);
  pushUndershade(parts, partyX - 0.29, partyX + 0.29, topY - 0.06, UPPER_PIER_Z_M, UPPER_PIER_Z_M + 0.12);
  for (const jointSide of [-1, 1] as const) {
    const jx = partyX + jointSide * 0.255;
    slab(parts, STONE_CREVICE_SOFT, jx - 0.018, jx + 0.018, PLINTH_TOP_M, STRING_BOTTOM_M,
      LOWER_PIER_Z_M - 0.02, LOWER_PIER_Z_M + 0.005);
    slab(parts, STONE_CREVICE_SOFT, jx - 0.018, jx + 0.018, STRING_TOP_M, topY - 0.1,
      UPPER_PIER_Z_M - 0.02, UPPER_PIER_Z_M + 0.005);
  }

  // End quoins into the rear boundary and the connector jamb.
  for (const side of [-1, 1] as const) {
    const outerX = side * HALF_W_M;
    const innerX = side * (HALF_W_M - 0.5);
    const x0 = Math.min(outerX, innerX);
    const x1 = Math.max(outerX, innerX);
    const endTop = side < 0 ? WORKS_PARAPET_M : YARD_PARAPET_M;
    for (let course = 0; ; course += 1) {
      const y0 = course * 0.56;
      if (y0 >= endTop) break;
      const y1 = Math.min(endTop, y0 + 0.56);
      const short = course % 2 === 1;
      const width = (x1 - x0) * (short ? 0.62 : 1);
      const qx0 = side < 0 ? x0 : x1 - width;
      const z = y1 <= STRING_BOTTOM_M ? LOWER_PIER_Z_M : UPPER_PIER_Z_M;
      slab(parts, short ? STONE_PIER_ALT : STONE_PIER, qx0, qx0 + width, y0, y1 - 0.03,
        Z_BACK_M, short ? z - 0.05 : z + 0.02);
    }
    const ex0 = side < 0 ? -HALF_W_M : HALF_W_M - 0.04;
    const ex1 = side < 0 ? -HALF_W_M + 0.04 : HALF_W_M;
    slab(parts, STONE_CREVICE, ex0, ex1, 0, STRING_BOTTOM_M, Z_BACK_M, LOWER_PIER_Z_M + 0.005);
    slab(parts, STONE_CREVICE, ex0, ex1, STRING_TOP_M, endTop, Z_BACK_M, UPPER_PIER_Z_M + 0.005);
  }
}

/**
 * The boiler stack.
 *
 * Every edge of this courtyard needs one thing that breaks its own skyline, and
 * this edge's is vertical where the gate's is horizontal crenellation and the
 * west edge's is a stepped roofline. It is also the reason the works below it
 * is a works.
 */
function pushStack(parts: BufferGeometry[]): void {
  const x0 = STACK_CENTER_X_M - STACK_HALF_W_M;
  const x1 = STACK_CENTER_X_M + STACK_HALF_W_M;
  // Low shaft stays inside the clearance envelope; it corbels out above head
  // height like the rest of the kit.
  slab(parts, OCHRE_FIELD_ALT, x0, x1, 0, FREE_PROJECTION_Y_M, Z_BACK_M, LOWER_PIER_Z_M);
  slab(parts, STONE_TRIM, x0 - 0.06, x1 + 0.06, FREE_PROJECTION_Y_M, FREE_PROJECTION_Y_M + 0.18,
    Z_BACK_M, UPPER_PIER_Z_M + 0.22);
  pushUndershade(parts, x0 - 0.06, x1 + 0.06, FREE_PROJECTION_Y_M - 0.06,
    LOWER_PIER_Z_M, UPPER_PIER_Z_M + 0.22);
  slab(parts, OCHRE_FIELD_ALT, x0, x1, FREE_PROJECTION_Y_M + 0.18, STACK_TOP_M - 0.85,
    Z_BACK_M, UPPER_PIER_Z_M + 0.18);
  // Brick banding up the shaft, and iron hoops where it was repaired.
  for (let index = 0; index < 14; index += 1) {
    const y = 3.3 + index * 0.68;
    if (y > STACK_TOP_M - 1.1) break;
    slab(parts, index % 3 === 0 ? BRICK_INFILL : BRICK_INFILL_ALT, x0 - 0.03, x1 + 0.03,
      y, y + 0.12, Z_BACK_M, UPPER_PIER_Z_M + 0.22);
    if (index === 5 || index === 10) {
      slab(parts, IRON_RUST, x0 - 0.06, x1 + 0.06, y - 0.1, y, Z_BACK_M, UPPER_PIER_Z_M + 0.26);
    }
  }
  // Corbelled cap, and the soot that comes with it.
  slab(parts, STONE_TRIM, x0 - 0.14, x1 + 0.14, STACK_TOP_M - 0.85, STACK_TOP_M - 0.62,
    Z_BACK_M, UPPER_PIER_Z_M + 0.34);
  pushUndershade(parts, x0 - 0.14, x1 + 0.14, STACK_TOP_M - 0.91,
    UPPER_PIER_Z_M, UPPER_PIER_Z_M + 0.34);
  slab(parts, SOOT_DARK, x0 - 0.02, x1 + 0.02, STACK_TOP_M - 0.62, STACK_TOP_M - 0.2,
    Z_BACK_M, UPPER_PIER_Z_M + 0.2);
  slab(parts, STONE_TRIM, x0 - 0.1, x1 + 0.1, STACK_TOP_M - 0.2, STACK_TOP_M,
    Z_BACK_M, UPPER_PIER_Z_M + 0.28);
  slab(parts, SOOT_DARK, x0 + 0.06, x1 - 0.06, STACK_TOP_M - 0.08, STACK_TOP_M + 0.02,
    Z_BACK_M + 0.2, UPPER_PIER_Z_M + 0.2);
  // Smoke staining washed down the leeward face.
  slab(parts, SOOT_DARK, x1 - 0.14, x1 + 0.02, 5.6, STACK_TOP_M - 0.9,
    UPPER_PIER_Z_M + 0.18, UPPER_PIER_Z_M + 0.192);
}

/**
 * Drying rails and the dyed cloth on them.
 *
 * Carried on iron brackets off the wall rather than on posts, for the same
 * reason the west edge has no awning posts: a post here would be a
 * non-colliding object standing in walkable ground. The cloth hangs down across
 * the wall face, which is what makes it read from standing eye height.
 */
function pushDryingRails(parts: BufferGeometry[]): void {
  for (const [railIndex, rail] of RAILS.entries()) {
    // Iron brackets: an arm off the wall with a strut back under it, so the
    // rail is visibly carried rather than floating at its far end.
    for (let index = 0; index < rail.brackets; index += 1) {
      const x = rail.x0 + 0.3 + ((rail.x1 - rail.x0 - 0.6) * index) / (rail.brackets - 1);
      // Slim sections. Ironwork this far from the wall reads against the sky and
      // against the cloth behind it, so a heavy bracket turns into a black bar
      // laid across the one part of the elevation that carries colour.
      box(parts, IRON_DARK, 0.045, 0.06, rail.reachZ - UPPER_FIELD_Z_M + 0.16,
        x, rail.y, (UPPER_FIELD_Z_M + rail.reachZ) * 0.5 + 0.08);
      box(parts, IRON_RUST, 0.07, 0.28, 0.07, x, rail.y - 0.16, UPPER_FIELD_Z_M + 0.06);
      // Strut, stepped so it reads as a continuous diagonal brace.
      for (let step = 0; step < 5; step += 1) {
        const t = step / 4;
        box(parts, IRON_RUST, 0.04, 0.1, 0.14,
          x, rail.y - 0.32 + t * 0.26, UPPER_FIELD_Z_M + 0.1 + t * (rail.reachZ - UPPER_FIELD_Z_M - 0.5));
      }
      box(parts, IRON_RUST, 0.1, 0.1, 0.07, x, rail.y - 0.02, UPPER_FIELD_Z_M + 0.04);
      pushUndershade(parts, x - 0.11, x + 0.11, rail.y - 0.38, UPPER_FIELD_Z_M, rail.reachZ);
    }
    // The rail itself: a timber pole through the bracket eyes.
    slab(parts, railIndex === 0 ? TIMBER_ROOF : TIMBER_GATE, rail.x0, rail.x1,
      rail.y, rail.y + 0.11, rail.reachZ - 0.11, rail.reachZ);
    slab(parts, TIMBER_GATE_EDGE, rail.x0 - 0.08, rail.x0, rail.y - 0.01, rail.y + 0.12,
      rail.reachZ - 0.12, rail.reachZ + 0.01);
    slab(parts, TIMBER_GATE_EDGE, rail.x1, rail.x1 + 0.08, rail.y - 0.01, rail.y + 0.12,
      rail.reachZ - 0.12, rail.reachZ + 0.01);
  }
}

/**
 * The dyed cloth and yarn.
 *
 * Kept in its own untextured batch. On the timber batch's pine diffuse every
 * dye tint multiplied down into the same muddy brown, which is the opposite of
 * the point: this cloth is the only saturated colour in the courtyard, so it
 * needs a neutral base to survive. Folds, selvedges and hems are authored as
 * separate tinted pieces, so a flat base still reads as cloth rather than as
 * coloured card.
 */
function pushDyedCloth(parts: BufferGeometry[]): void {
  // The cloth. Widths, drops, colours and hang depth all vary; a row of equal
  // panels would read as a texture strip rather than as laundry.
  // Keyed warm. The daylight references hang ochre and orange cloth and keep
  // cool colour to small accents; a run dominated by blue reads as cold against
  // sandstone and pulls the warmth out of the whole frame. So the yard is
  // drying a madder lot and a saffron lot, with one indigo piece left over.
  const cloths = [
    { x: 0.35, width: 1.0, drop: 1.65, tone: DYE_SAFFRON },
    { x: 1.34, width: 0.94, drop: 2.05, tone: DYE_MADDER },
    { x: 2.29, width: 0.96, drop: 1.8, tone: DYE_TEAL },
    { x: 3.28, width: 1.02, drop: 1.45, tone: DYE_SAFFRON },
  ] as const;
  for (const [index, cloth] of cloths.entries()) {
    const rail = RAILS[0];
    const geometry = new BoxGeometry(cloth.width, cloth.drop, 0.018, 24, 14, 1);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    for (let v = 0; v < positions.count; v += 1) {
      const x = positions.getX(v);
      const t = 0.5 - positions.getY(v) / cloth.drop;
      const fold = Math.sin((x / cloth.width + 0.5) * Math.PI * 8 + index) * 0.055;
      positions.setXYZ(v, cloth.x + x,
        Math.max(CLOTH_FLOOR_M, rail.y - t * cloth.drop - Math.sin(Math.PI * (x / cloth.width + 0.5)) * 0.07 * t),
        rail.reachZ + 0.035 + fold * Math.sin(t * Math.PI / 2) + positions.getZ(v));
      colors.set(cloth.tone, v * 3);
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    parts.push(geometry);
  }
  // The broad shade is carried by the existing wall brackets and front rail.
  const shade = new BoxGeometry(4.05, 0.018, 1.03, 40, 1, 10);
  const positions = shade.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let v = 0; v < positions.count; v += 1) {
    const x = positions.getX(v);
    const t = positions.getZ(v) / 1.03 + 0.5;
    positions.setXYZ(v, 1.825 + x,
      5.75 - 0.40 * t - 0.10 * Math.sin(t * Math.PI) + positions.getY(v),
      0.52 + t * 1.03);
    colors.set(Math.floor((x + 2.025) / 0.17) % 2 ? DYE_SAFFRON : [0.88, 0.73, 0.49], v * 3);
  }
  shade.setAttribute("color", new Float32BufferAttribute(colors, 3));
  shade.computeVertexNormals();
  parts.push(shade);
  // Skeins of dyed yarn hung directly on pegs on the wall, below the top rail.
  for (const [index, skein] of [
    { x: -0.05, y: 3.55, tone: DYE_INDIGO },
    { x: 0.42, y: 3.42, tone: DYE_INDIGO },
    { x: 4.05, y: 3.62, tone: DYE_MADDER },
  ].entries()) {
    box(parts, IRON_DARK, 0.05, 0.05, 0.14, skein.x, skein.y + 0.3, UPPER_FIELD_Z_M + 0.06);
    box(parts, skein.tone, 0.22, 0.5, 0.16, skein.x, skein.y, UPPER_FIELD_Z_M + 0.1);
    box(parts, index % 2 === 0 ? DYE_INDIGO_DEEP : DYE_MADDER_DEEP, 0.24, 0.09, 0.17,
      skein.x, skein.y + 0.2, UPPER_FIELD_Z_M + 0.1);
  }
}

/** Vats, lids, ash and debris at the base, all under the camera. */
function pushYardDressing(parts: BufferGeometry[]): void {
  // Dye vats: faceted from boxes, stained to the colour they last held.
  for (const vat of [
    { x: -3.05, radius: 0.42, height: 0.44, z: 0.86, tone: DYE_INDIGO_DEEP },
    { x: -2.05, radius: 0.34, height: 0.38, z: 0.72, tone: DYE_MADDER_DEEP },
    { x: 3.55, radius: 0.38, height: 0.42, z: 0.8, tone: DYE_INDIGO_DEEP },
  ]) {
    // Tapered tub: three courses of decreasing footprint. The instancer has no
    // way to rotate a box about its vertical axis, so a stepped taper is the
    // honest way to get a round-ish vessel out of this kit.
    for (const [course, shrink] of [0.02, 0.09, 0.16].entries()) {
      const half = vat.radius * (1 - shrink);
      slab(parts, course % 2 === 0 ? STONE_PIER_ALT : STONE_PIER,
        vat.x - half, vat.x + half, (vat.height * course) / 3, (vat.height * (course + 1)) / 3,
        vat.z - half, vat.z + half);
    }
    box(parts, STONE_TRIM, vat.radius * 1.76, 0.07, vat.radius * 1.76, vat.x, vat.height, vat.z);
    box(parts, vat.tone, vat.radius * 1.6, 0.03, vat.radius * 1.6, vat.x, vat.height - 0.02, vat.z);
    // Run-down staining on the outside, and a puddle at the foot.
    slab(parts, vat.tone, vat.x - 0.1, vat.x + 0.1, 0.06, vat.height - 0.05,
      vat.z - vat.radius * 0.95, vat.z - vat.radius * 0.9);
    slab(parts, vat.tone, vat.x - vat.radius * 1.3, vat.x + vat.radius * 1.3, 0, 0.02,
      vat.z - vat.radius * 1.4, vat.z + vat.radius * 1.4);
    slab(parts, STONE_CREVICE_SOFT, vat.x - vat.radius * 1.1, vat.x + vat.radius * 1.1, 0, 0.02,
      vat.z - vat.radius * 1.15, vat.z + vat.radius * 1.15);
  }
  // Stacked lids and a crate of fuel by the stack.
  box(parts, TIMBER_ROOF, 0.78, 0.09, 0.78, -3.95, 0.05, 0.72);
  box(parts, TIMBER_GATE_EDGE, 0.7, 0.08, 0.7, -3.95, 0.14, 0.75);
  box(parts, TIMBER_LATTICE, 0.66, 0.34, 0.5, -1.15, 0.17, 0.66);
  box(parts, TIMBER_GATE_EDGE, 0.68, 0.07, 0.52, -1.15, 0.33, 0.66);
  slab(parts, STONE_CREVICE_SOFT, -1.5, -0.8, 0, 0.02, 0.4, 0.95);
  // Ash raked out from under the boiler.
  slab(parts, SOOT_DARK, -3.7, -2.3, 0, 0.03, PLINTH_Z_M, PLINTH_Z_M + 0.66);
  slab(parts, STONE_RECESS_DEEP, -3.9, -2.1, 0, 0.02, PLINTH_Z_M + 0.66, PLINTH_Z_M + 1.02);
  // Blown sand and spalled stone in the quieter corner.
  for (let index = 0; index < 3; index += 1) {
    const x = 1.5 + index * 1.1;
    slab(parts, SAND_DRIFT, x - 0.55, x + 0.55, 0, 0.09 + index * 0.02,
      PLINTH_Z_M - 0.05, PLINTH_Z_M + 0.48);
  }
  for (const stone of [
    { x: -0.35, w: 0.3, h: 0.2, d: 0.26, z: 0.92 },
    { x: 4.25, w: 0.36, h: 0.24, d: 0.3, z: 0.8 },
  ]) {
    box(parts, RUBBLE, stone.w, stone.h, stone.d, stone.x, stone.h * 0.5, stone.z);
    slab(parts, STONE_CREVICE_SOFT, stone.x - stone.w * 0.6, stone.x + stone.w * 0.6, 0, 0.02,
      stone.z - stone.d * 0.6, stone.z + stone.d * 0.6);
  }

  // Apron, in the same language as the other two edges of this courtyard.
  for (let index = 0; index < 10; index += 1) {
    const x0 = -HALF_W_M + (SPAWN_A_EAST_REFERENCE_WIDTH_M * index) / 10;
    const x1 = x0 + SPAWN_A_EAST_REFERENCE_WIDTH_M / 10 - 0.05;
    const depth = 1.2 + ((index * 5) % 3) * 0.09;
    const worn = (index * 3) % 4 === 0;
    slab(parts, worn ? APRON_WORN : APRON_FLAG, x0, x1, 0, 0.075, PLINTH_Z_M, PLINTH_Z_M + depth);
    if (index % 4 === 2) {
      slab(parts, APRON_PATCH, x0 + 0.08, x1 - 0.2, 0.075, 0.085,
        PLINTH_Z_M + 0.16, PLINTH_Z_M + depth - 0.3);
    }
    slab(parts, STONE_TRIM, x0, x1, 0.075, 0.155, PLINTH_Z_M + depth - 0.2, PLINTH_Z_M + depth);
    slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.02, PLINTH_Z_M + depth, PLINTH_Z_M + depth + 0.14);
    slab(parts, STONE_CREVICE_SOFT, x1, x1 + 0.05, 0, 0.08, PLINTH_Z_M, PLINTH_Z_M + depth);
  }
  // Drain runnel carrying spent dye away along the base.
  slab(parts, STONE_RECESS_DEEP, -0.6, 4.1, 0, 0.035, PLINTH_Z_M + 0.52, PLINTH_Z_M + 0.82);
  // Spent liquor in the channel goes green where two dye lots have mixed.
  slab(parts, DYE_TEAL, -0.6, 4.1, 0.02, 0.04, PLINTH_Z_M + 0.58, PLINTH_Z_M + 0.76);
  for (let index = 0; index < 8; index += 1) {
    const x = -0.4 + index * 0.6;
    slab(parts, STONE_TRIM, x, x + 0.34, 0.035, 0.06, PLINTH_Z_M + 0.52, PLINTH_Z_M + 0.82);
  }
}

/** Stone and plaster geometry of the works. */
export function createSpawnAEastDyeWorksStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushPlinth(parts);
  pushMasses(parts);
  pushStack(parts);
  pushYardDressing(parts);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/** Timber, iron and dyed cloth: the loading door and the drying rails. */
export function createSpawnAEastDyeWorksFixtureGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Loading door: two braced leaves, shut, with a heavy hasp.
  for (const side of [-1, 1] as const) {
    const inner = DOOR_CENTER_X_M + side * 0.03;
    const outer = DOOR_CENTER_X_M + side * (DOOR_HALF_W_M - 0.06);
    const x0 = Math.min(inner, outer);
    const x1 = Math.max(inner, outer);
    for (let plank = 0; plank < 5; plank += 1) {
      const px0 = x0 + ((x1 - x0) * plank) / 5;
      const px1 = x0 + ((x1 - x0) * (plank + 1)) / 5;
      slab(parts, plank % 2 === 0 ? TIMBER_GATE : TIMBER_GATE_ALT, px0 + 0.008, px1 - 0.008,
        0.14, DOOR_HEAD_M - 0.3, 0.06, 0.11);
      slab(parts, TIMBER_GATE_EDGE, px1 - 0.012, px1, 0.14, DOOR_HEAD_M - 0.3, 0.06, 0.114);
    }
    for (const railY of [0.5, 1.9]) {
      slab(parts, TIMBER_ROOF, x0, x1, railY, railY + 0.14, 0.11, 0.15);
    }
    angledBox(parts, TIMBER_ROOF, (x1 - x0) * 1.55, 0.12, 0.04,
      (x0 + x1) * 0.5, 1.2, 0.13, side * 0.78);
    for (const hingeY of [0.62, 1.98]) {
      slab(parts, IRON_DARK, side < 0 ? x0 : x1 - 0.34, side < 0 ? x0 + 0.34 : x1,
        hingeY, hingeY + 0.09, 0.11, 0.14);
    }
  }
  box(parts, IRON_DARK, 0.3, 0.36, 0.06, DOOR_CENTER_X_M, 1.34, 0.14);
  box(parts, IRON_RUST, 0.12, 0.12, 0.05, DOOR_CENTER_X_M, 1.2, 0.17);

  pushDryingRails(parts);

  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/** Dyed cloth and yarn: flat-shaded so the dye colours read true. */
export function createSpawnAEastDyeWorksClothGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushDyedCloth(parts);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 1));
}

/** Unlit interiors behind the vents and the bricked arch's remaining gap. */
export function createSpawnAEastDyeWorksVoidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const vent of [{ x: -3.5, y: 6.35 }, { x: -0.95, y: 6.05 }]) {
    slab(parts, VOID_DARK, vent.x - 0.24, vent.x + 0.24, vent.y + 0.02, vent.y + 0.6,
      UPPER_RECESS_Z_M - 0.2, UPPER_RECESS_Z_M - 0.17);
  }
  slab(parts, VOID_DARK, DOOR_CENTER_X_M - DOOR_HALF_W_M + 0.08,
    DOOR_CENTER_X_M + DOOR_HALF_W_M - 0.08, 0.12, DOOR_HEAD_M - 0.28, 0.02, 0.05);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}
