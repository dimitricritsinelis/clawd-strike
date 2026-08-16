import type { BufferGeometry } from "three";
import { mergeProceduralGeometry } from "./propsCore";
import {
  APRON_FLAG,
  APRON_PATCH,
  APRON_POLISHED,
  APRON_WORN,
  CLOTH_FADED,
  DATUM_SILL_M,
  CLOTH_PALE,
  DATUM_PLINTH_TOP_M,
  DATUM_STRING_BOTTOM_M,
  DATUM_STRING_TOP_M,
  FREE_PROJECTION_Y_M,
  GROUND_DRESSING_MAX_Y_M,
  IRON_DARK,
  IRON_RUST,
  LANTERN_GLASS,
  LOW_PROJECTION_MAX_M,
  PLASTER_FIELD,
  PLASTER_FIELD_ALT,
  PLASTER_SHADED,
  RUBBLE,
  SAND_DRIFT,
  STONE_CREVICE,
  STONE_CREVICE_SOFT,
  STONE_FIELD,
  STONE_FIELD_ALT,
  STONE_KEYSTONE,
  STONE_PIER,
  STONE_PIER_ALT,
  STONE_RECESS,
  STONE_RECESS_DEEP,
  STONE_SOFFIT,
  STONE_SOFFIT_EDGE,
  STONE_THRESHOLD,
  STONE_THRESHOLD_WORN,
  STONE_TRIM,
  TIMBER_GATE,
  TIMBER_GATE_ALT,
  TIMBER_GATE_EDGE,
  TIMBER_LATTICE,
  TIMBER_ROOF,
  VOID_DARK,
  WATER_DARK,
  angledBox,
  applyWorldBoxUv,
  blindArchY,
  box,
  pushArchedField,
  pushUndershade,
  slab,
} from "./boundaryKit";

/**
 * Bab al-Suq: the sealed south gate that closes the A-spawn courtyard.
 *
 * The courtyard's rear boundary is a blockout perimeter wall — one flat 22 m
 * plane, one material, no relief, no openings, no silhouette. It is also the
 * first thing a player sees when they turn around on the spawn point. This kit
 * re-faces that whole run as a single built assembly: a battered plinth, a
 * buttressed curtain carrying two storeys of blind arcading, a corbelled
 * machicolation and crenellated parapet, and a pishtaq gate block on the
 * spawn's own sightline with a barred timber gate and a mashrabiya oriel.
 *
 * ## Frame
 *
 * Authored in the shared boundary-kit frame (see `./boundaryKit`): metres, `y`
 * from the paving, `z` outward from the wall plane into the courtyard, so a
 * part authored at `z = 0.4` renders 0.4 m north of design y = 0. Instanced at
 * design yaw 180 so local +Z maps to design north.
 *
 * ## Why the depth profile steps
 *
 * The kit obeys the shared clearance envelope, and answers it the way a real
 * fortified wall does rather than by going flat. Below
 * {@link FREE_PROJECTION_Y_M} nothing reaches past
 * {@link LOW_PROJECTION_MAX_M}, and the elevation earns its depth there from
 * recesses cut *back* toward the wall plane instead. The whole facade then
 * steps outward on a corbelled string course at head height and keeps stepping
 * out — machicolation, parapet, oriel — where no player can reach. Ground
 * dressing is exempt only while it stays under
 * {@link GROUND_DRESSING_MAX_Y_M}, low enough to pass below the camera.
 *
 * ## Why it is this tall
 *
 * The wall behind it is 9.5 m: SPAWN_A_COURTYARD carries the `hero_courtyard`
 * profile, so its boundary run takes MASSING_TALL_HERO's height. A shorter kit
 * would leave the untreated plane and its coping standing above the new
 * parapet, which is the defect this is fixing. The crenellation therefore
 * clears the old coping across the full width.
 */
export const SPAWN_A_GATE_REFERENCE_WIDTH_M = 21.9;
export const SPAWN_A_GATE_REFERENCE_HEIGHT_M = 12;
export const SPAWN_A_GATE_REFERENCE_DEPTH_M = 2.2;

/** Author-space z of the back face: buried inside the perimeter wall. */
const Z_BACK_M = -0.3;
/** Author-space z at the middle of the depth envelope. */
const Z_CENTER_M = Z_BACK_M + SPAWN_A_GATE_REFERENCE_DEPTH_M * 0.5;

const HALF_W_M = SPAWN_A_GATE_REFERENCE_WIDTH_M * 0.5;

// Depth datums. Everything reads off these so the storeys stay on a consistent
// set of planes, and so the low-level clearance rule stays checkable by eye.
const PLINTH_Z_M = LOW_PROJECTION_MAX_M;
const LOWER_FIELD_Z_M = 0.2;
const LOWER_PIER_Z_M = LOW_PROJECTION_MAX_M;
/** Recess floors sit just proud of the perimeter wall face at z = 0. */
const RECESS_FLOOR_Z_M = 0.04;
const UPPER_FIELD_Z_M = 0.52;
const UPPER_PIER_Z_M = 0.62;
const UPPER_RECESS_Z_M = 0.3;
const MACHICOLATION_Z_M = 1.05;
const MERLON_Z_M = 0.95;

// Vertical datums.
const PLINTH_TOP_M = DATUM_PLINTH_TOP_M;
const STRING_BOTTOM_M = DATUM_STRING_BOTTOM_M;
const STRING_TOP_M = DATUM_STRING_TOP_M;
const CORBEL_TABLE_BOTTOM_M = 8.55;
const PARAPET_BOTTOM_M = 8.95;
const PARAPET_WALK_M = 9.2;
const MERLON_TOP_M = 10.05;

// Pishtaq (the projecting gate block) and its engaged turrets.
const PISHTAQ_HALF_W_M = 5.2;
const TURRET_INNER_X_M = 4.3;
const PANEL_HALF_W_M = 3.75;
const FRAME_HEAD_BOTTOM_M = 9.4;
const PISHTAQ_CORNICE_BOTTOM_M = 10.5;
const PISHTAQ_CORNICE_TOP_M = 10.9;
const PISHTAQ_TOP_M = 11.55;
const TURRET_TOP_M = 11.9;

// Gate opening: a two-centred pointed arch. Each arc's centre sits on the
// springing line offset toward the far side, which is what points the head.
const GATE_HALF_SPAN_M = 2.6;
const GATE_SPRING_Y_M = 3.6;
const ARCH_CENTER_X_M = 0.572;
const ARCH_RADIUS_M = GATE_HALF_SPAN_M + ARCH_CENTER_X_M;
const RING_THICKNESS_M = 0.5;
const ARCH_APEX_Y_M = GATE_SPRING_Y_M
  + Math.sqrt(ARCH_RADIUS_M * ARCH_RADIUS_M - ARCH_CENTER_X_M * ARCH_CENTER_X_M);
/** Outermost x the extrados reaches, where the ring lands on the jamb. */
const RING_OUTER_REACH_M = ARCH_RADIUS_M + RING_THICKNESS_M - ARCH_CENTER_X_M;
const JAMB_OUTER_X_M = 3.25;
const GATE_LEAF_TOP_M = 4;
const GATE_REVEAL_Z_M = 0.05;
const GATE_LEAF_Z_M = 0.12;

// Mashrabiya oriel over the gate.
const ORIEL_HALF_W_M = 1.95;
const ORIEL_BOTTOM_M = 7.32;
const ORIEL_TOP_M = 9.12;
const ORIEL_FRONT_Z_M = 1.55;

/**
 * Flank bays, mirrored on both sides of the pishtaq.
 *
 * Two equal bays per flank on the courtyard's {@link BAY_MODULE_M} module, with
 * {@link PIER_WIDTH_M} piers between them and a wider quoin at the corner.
 * Equal is the point: an arcade is a series, and unequal bays each with their
 * own springing height are just a row of different arches.
 */
const FLANK_BAYS = [
  { innerX: 5.8, outerX: 7.6 },
  { innerX: 8.2, outerX: 10 },
] as const;
const FLANK_PIERS = [
  { innerX: PISHTAQ_HALF_W_M, outerX: 5.8 },
  { innerX: 7.6, outerX: 8.2 },
  { innerX: 10, outerX: HALF_W_M },
] as const;
/** One springing line and one crown for every bay on the wall. */
const ARCADE_SPRING_M = 5.4;
const ARCADE_APEX_M = 7;
const SLIT_TOP_M = 5.3;

function normalize(geometry: BufferGeometry): BufferGeometry {
  geometry.translate(0, -SPAWN_A_GATE_REFERENCE_HEIGHT_M * 0.5, -Z_CENTER_M);
  geometry.scale(
    1 / SPAWN_A_GATE_REFERENCE_WIDTH_M,
    1 / SPAWN_A_GATE_REFERENCE_HEIGHT_M,
    1 / SPAWN_A_GATE_REFERENCE_DEPTH_M,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Height of the gate arch intrados at `x`, offset `radialOffset` outward. */
function archBoundaryY(x: number, radialOffset: number): number {
  const radius = ARCH_RADIUS_M + radialOffset;
  const dx = Math.abs(x) + ARCH_CENTER_X_M;
  if (dx >= radius) return GATE_SPRING_Y_M;
  return GATE_SPRING_Y_M + Math.sqrt(radius * radius - dx * dx);
}

/**
 * Continuous battered plinth and the ground-line darkening under it.
 *
 * The blockout wall meets the paving with nothing but a butt joint. A stepped
 * plinth with its own weathering course is the honest fix, and running it the
 * whole width gives the elevation a single grounding datum. It breaks only for
 * the gate, where the threshold takes over.
 */
function pushPlinth(parts: BufferGeometry[]): void {
  const runs: Array<[number, number]> = [
    [-HALF_W_M, -GATE_HALF_SPAN_M],
    [GATE_HALF_SPAN_M, HALF_W_M],
  ];
  for (const [x0, x1] of runs) {
    slab(parts, STONE_PIER_ALT, x0, x1, 0, 0.26, Z_BACK_M, PLINTH_Z_M);
    slab(parts, STONE_PIER, x0, x1, 0.26, PLINTH_TOP_M - 0.1, Z_BACK_M, PLINTH_Z_M - 0.05);
    // Sloped weathering course, so rain and blown sand shed rather than sit.
    slab(parts, STONE_TRIM, x0, x1, PLINTH_TOP_M - 0.1, PLINTH_TOP_M, Z_BACK_M, PLINTH_Z_M);
    pushUndershade(parts, x0, x1, PLINTH_TOP_M - 0.15, LOWER_FIELD_Z_M, PLINTH_Z_M);
    // Ground-line darkening: the contact shadow a baked pass would give the
    // paving-to-wall junction.
    slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.14, PLINTH_Z_M - 0.02, PLINTH_Z_M + 0.16);
    slab(parts, STONE_CREVICE, x0, x1, 0, 0.05, PLINTH_Z_M + 0.16, PLINTH_Z_M + 0.4);
  }

  // Coursed read on the plinth itself, so a 22 m run is not one unbroken block.
  for (let index = 0; index < 26; index += 1) {
    const x0 = -HALF_W_M + (SPAWN_A_GATE_REFERENCE_WIDTH_M * index) / 26;
    const x1 = x0 + SPAWN_A_GATE_REFERENCE_WIDTH_M / 26;
    if (index % 3 !== 0 || Math.abs(x0) < GATE_HALF_SPAN_M + 0.4) continue;
    slab(parts, STONE_CREVICE_SOFT, x1 - 0.05, x1, 0.05, PLINTH_TOP_M - 0.12,
      PLINTH_Z_M - 0.07, PLINTH_Z_M - 0.02);
    slab(parts, index % 2 === 0 ? STONE_PIER_ALT : STONE_FIELD_ALT, x0 + 0.06, x1 - 0.06,
      0.3, 0.62, PLINTH_Z_M - 0.06, PLINTH_Z_M - 0.03);
  }
}

/**
 * Buttress piers, the two-storey blind arcade between them, and the slit
 * windows. This is where the flanks get their value range: the recesses are cut
 * back toward the wall plane rather than standing proud of it, so the depth is
 * real without any of it reaching into the courtyard.
 */
function pushFlankCurtain(parts: BufferGeometry[]): void {
  for (const side of [-1, 1] as const) {
    for (const [pierIndex, pier] of FLANK_PIERS.entries()) {
      const x0 = side < 0 ? -pier.outerX : pier.innerX;
      const x1 = side < 0 ? -pier.innerX : pier.outerX;
      slab(parts, STONE_PIER, x0, x1, PLINTH_TOP_M, STRING_BOTTOM_M, Z_BACK_M, LOWER_PIER_Z_M);
      slab(parts, STONE_PIER, x0, x1, STRING_TOP_M, CORBEL_TABLE_BOTTOM_M, Z_BACK_M, UPPER_PIER_Z_M);
      // Quoin courses so the pier reads as laid stone, not an extruded strip.
      for (let course = 0; course < 14; course += 1) {
        const y = STRING_TOP_M + 0.36 + course * 0.42;
        if (y > CORBEL_TABLE_BOTTOM_M - 0.3) break;
        const short = (course + pierIndex) % 2 === 1;
        const inset = short ? (x1 - x0) * 0.24 : 0;
        slab(parts, short ? STONE_PIER_ALT : STONE_TRIM,
          x0 + inset, x1 - inset, y, y + 0.1, UPPER_PIER_Z_M - 0.05, UPPER_PIER_Z_M + 0.02);
      }
      // Sloped set-off partway up the lower shaft: the buttress visibly sheds
      // before it reaches the string course.
      angledBox(parts, STONE_TRIM, (x1 - x0) + 0.06, 0.16, 0.3,
        (x0 + x1) * 0.5, 1.92, LOWER_PIER_Z_M - 0.1, side * 0.12);
      pushUndershade(parts, x0, x1, 1.84, LOWER_FIELD_Z_M, LOWER_PIER_Z_M);
    }

    for (const bay of FLANK_BAYS) {
      const x0 = side < 0 ? -bay.outerX : bay.innerX;
      const x1 = side < 0 ? -bay.innerX : bay.outerX;
      const centerX = (x0 + x1) * 0.5;
      const halfWidth = (x1 - x0) * 0.5 - 0.05;

      // Mastaba: the stone bench that runs along the base of a Levantine street
      // wall. Stripping the ground storey back to plain ashlar was right, but a
      // 5 m blank run still needs something, and the answer is another piece of
      // architecture on the same order rather than more dressing scattered on
      // it. Set under each bay, it gives the base a horizontal, a shadow line
      // and somewhere to sit. Under GROUND_DRESSING_MAX_Y_M, so it may project
      // past the low limit: a player passes over it, never through it.
      slab(parts, STONE_PIER_ALT, x0 + 0.12, x1 - 0.12, 0, 0.32, PLINTH_Z_M, PLINTH_Z_M + 0.62);
      slab(parts, STONE_TRIM, x0 + 0.06, x1 - 0.06, 0.32, 0.42, PLINTH_Z_M - 0.03, PLINTH_Z_M + 0.68);
      pushUndershade(parts, x0 + 0.12, x1 - 0.12, 0.32, PLINTH_Z_M, PLINTH_Z_M + 0.62);
      slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.02, PLINTH_Z_M + 0.62, PLINTH_Z_M + 0.86);
      // Worn hollows where it has actually been sat on.
      for (const seat of [0.3, 0.66]) {
        slab(parts, STONE_THRESHOLD_WORN, x0 + (x1 - x0) * seat - 0.24,
          x0 + (x1 - x0) * seat + 0.24, 0.42, 0.432, PLINTH_Z_M + 0.06, PLINTH_Z_M + 0.56);
      }

      // Ground storey: solid.
      //
      // This is a city wall, and its lower storey is meant to be a calm,
      // defensive, largely blind surface. The arcade above only reads as
      // ornament because there is a quiet field beneath it to read against. The
      // sunk panels, limewash and hung goods that used to sit here were a
      // second order competing with the first.
      slab(parts, STONE_FIELD, x0, x1, PLINTH_TOP_M, STRING_BOTTOM_M, Z_BACK_M, LOWER_FIELD_Z_M);

      // One order on the upper storey: a tall blind arcade panel per bay, every
      // one springing off the same impost line and reaching the same crown.
      // Equal bays, one profile, one springing — that repetition is the whole
      // effect, and varying it per bay is what made the run read as noise.
      pushArchedField(parts, STONE_FIELD, x0, x1, STRING_TOP_M, CORBEL_TABLE_BOTTOM_M,
        Z_BACK_M, UPPER_FIELD_Z_M, {
          x0: centerX - halfWidth,
          x1: centerX + halfWidth,
          sillY: STRING_TOP_M + 0.16,
          headY: (x) => blindArchY(x, centerX, halfWidth, ARCADE_SPRING_M, ARCADE_APEX_M),
          floorZ: UPPER_RECESS_Z_M,
          floorTone: STONE_RECESS_DEEP,
        }, 28);

      // Arch ring, one course proud of the field.
      const ringColumns = 30;
      for (let index = 0; index < ringColumns; index += 1) {
        const outerHalf = halfWidth + 0.16;
        const cx0 = centerX - outerHalf + (outerHalf * 2 * index) / ringColumns;
        const cx1 = centerX - outerHalf + (outerHalf * 2 * (index + 1)) / ringColumns;
        const inner = blindArchY((cx0 + cx1) * 0.5, centerX, halfWidth, ARCADE_SPRING_M, ARCADE_APEX_M);
        const outer = blindArchY((cx0 + cx1) * 0.5, centerX, outerHalf,
          ARCADE_SPRING_M, ARCADE_APEX_M + 0.22);
        if (outer <= inner) continue;
        slab(parts, index % 2 === 0 ? STONE_TRIM : STONE_PIER_ALT, cx0 + 0.008, cx1 - 0.008,
          inner, outer, UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.09);
      }
      // Impost blocks. They mark the springing, and because every bay shares it
      // they read as one course running the length of the wall.
      for (const impostSide of [-1, 1] as const) {
        const ix = centerX + impostSide * (halfWidth + 0.08);
        box(parts, STONE_TRIM, 0.42, 0.14, 0.16, ix, ARCADE_SPRING_M - 0.07, UPPER_FIELD_Z_M + 0.02);
      }

      // One slit per bay, centred in its panel, on the shared sill datum.
      slab(parts, STONE_TRIM, centerX - 0.32, centerX + 0.32, DATUM_SILL_M - 0.14, DATUM_SILL_M,
        UPPER_RECESS_Z_M, UPPER_FIELD_Z_M + 0.06);
      slab(parts, STONE_SOFFIT, centerX - 0.11, centerX + 0.11, DATUM_SILL_M, SLIT_TOP_M,
        UPPER_RECESS_Z_M - 0.16, UPPER_RECESS_Z_M);
      slab(parts, STONE_SOFFIT_EDGE, centerX - 0.17, centerX + 0.17, SLIT_TOP_M, SLIT_TOP_M + 0.09,
        UPPER_RECESS_Z_M - 0.16, UPPER_RECESS_Z_M + 0.02);
    }
  }
}

/**
 * The corbelled string course at head height.
 *
 * One device solving two problems: it is the hard horizontal shadow line the
 * elevation needs across its whole width, and it is the honest reason the upper
 * storey may stand 0.34 m further into the courtyard than the storey a player
 * can walk up to. It runs on the flanks and returns onto the pishtaq's frame
 * border, never across the gate.
 */
function pushStringCourse(parts: BufferGeometry[]): void {
  const runs: Array<[number, number]> = [
    [-HALF_W_M, -PISHTAQ_HALF_W_M],
    [PISHTAQ_HALF_W_M, HALF_W_M],
    [-TURRET_INNER_X_M, -PANEL_HALF_W_M],
    [PANEL_HALF_W_M, TURRET_INNER_X_M],
  ];
  for (const [x0, x1] of runs) {
    // Corbel blocks first, so the course visibly lands on something.
    const spacing = 1.32;
    const count = Math.max(1, Math.floor((x1 - x0) / spacing));
    for (let index = 0; index <= count; index += 1) {
      const x = x0 + 0.24 + index * spacing;
      if (x > x1 - 0.24) break;
      const reach = LOWER_PIER_Z_M + 0.3 + ((index * 7) % 4) * 0.035;
      box(parts, index % 3 === 0 ? STONE_TRIM : STONE_PIER, 0.3, 0.34, reach - LOWER_FIELD_Z_M,
        x, STRING_BOTTOM_M + 0.17, (LOWER_FIELD_Z_M + reach) * 0.5);
      pushUndershade(parts, x - 0.16, x + 0.16, STRING_BOTTOM_M - 0.03, LOWER_FIELD_Z_M, reach);
    }
    // Three stepped courses carrying the wall out.
    slab(parts, STONE_PIER, x0, x1, STRING_BOTTOM_M + 0.14, STRING_BOTTOM_M + 0.3,
      Z_BACK_M, LOWER_PIER_Z_M + 0.12);
    slab(parts, STONE_TRIM, x0, x1, STRING_BOTTOM_M + 0.3, STRING_BOTTOM_M + 0.44,
      Z_BACK_M, UPPER_FIELD_Z_M - 0.06);
    slab(parts, STONE_PIER, x0, x1, STRING_BOTTOM_M + 0.44, STRING_TOP_M, Z_BACK_M, UPPER_PIER_Z_M);
    pushUndershade(parts, x0, x1, STRING_TOP_M - 0.06, UPPER_FIELD_Z_M, UPPER_PIER_Z_M);
    // Its cast shadow on the storey below, which is what makes the band read
    // from across the courtyard.
    slab(parts, STONE_CREVICE, x0, x1, STRING_BOTTOM_M - 0.1, STRING_BOTTOM_M + 0.14,
      LOWER_FIELD_Z_M, LOWER_FIELD_Z_M + 0.02);
  }
}

/**
 * Machicolation, parapet walk, and merlons.
 *
 * The biggest silhouette change: the run currently terminates in one flat line
 * against the sky, and crenellation is the vocabulary a sealed city boundary is
 * supposed to end with.
 */
function pushCrown(parts: BufferGeometry[]): void {
  const spacing = 0.82;
  const count = Math.floor(SPAWN_A_GATE_REFERENCE_WIDTH_M / spacing);
  for (let index = 0; index <= count; index += 1) {
    const x = -HALF_W_M + 0.3 + index * spacing;
    if (x > HALF_W_M - 0.3) break;
    if (Math.abs(x) < PISHTAQ_HALF_W_M) continue;
    const reach = MACHICOLATION_Z_M + 0.1;
    box(parts, index % 2 === 0 ? STONE_TRIM : STONE_PIER, 0.34, 0.4, reach - UPPER_FIELD_Z_M,
      x, CORBEL_TABLE_BOTTOM_M + 0.2, (UPPER_FIELD_Z_M + reach) * 0.5);
    // Sloped underside, so each corbel has a legible bracket profile.
    angledBox(parts, STONE_PIER_ALT, 0.3, 0.2, 0.3, x, CORBEL_TABLE_BOTTOM_M + 0.04, reach - 0.2, 0);
    pushUndershade(parts, x - 0.18, x + 0.18, CORBEL_TABLE_BOTTOM_M - 0.02, UPPER_FIELD_Z_M, reach);
  }

  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? -HALF_W_M : PISHTAQ_HALF_W_M;
    const x1 = side < 0 ? -PISHTAQ_HALF_W_M : HALF_W_M;
    // Continuous band above the corbels. The slots between corbels read as the
    // machicolation openings without ever being shot through.
    slab(parts, STONE_PIER, x0, x1, CORBEL_TABLE_BOTTOM_M + 0.4, PARAPET_BOTTOM_M,
      Z_BACK_M, MACHICOLATION_Z_M);
    slab(parts, STONE_TRIM, x0, x1, PARAPET_BOTTOM_M, PARAPET_WALK_M, Z_BACK_M, MACHICOLATION_Z_M + 0.05);
    pushUndershade(parts, x0, x1, PARAPET_WALK_M - 0.07, MACHICOLATION_Z_M, MACHICOLATION_Z_M + 0.05);

    // Merlons: width, gap, and top height vary along the run so the
    // crenellation is a built rhythm rather than one repeated tooth.
    const runLength = x1 - x0;
    const merlonCount = Math.max(2, Math.round(runLength / 1.06));
    for (let index = 0; index < merlonCount; index += 1) {
      const cell0 = x0 + (runLength * index) / merlonCount;
      const cell1 = x0 + (runLength * (index + 1)) / merlonCount;
      const width = (cell1 - cell0) * (0.56 + ((index * 5) % 3) * 0.035);
      const mx0 = cell0 + ((cell1 - cell0) - width) * 0.5;
      const mx1 = mx0 + width;
      const top = MERLON_TOP_M - ((index * 3) % 4) * 0.045;
      slab(parts, index % 2 === 0 ? STONE_PIER : STONE_PIER_ALT, mx0, mx1, PARAPET_WALK_M, top - 0.12,
        Z_BACK_M, MERLON_Z_M);
      slab(parts, STONE_TRIM, mx0 - 0.04, mx1 + 0.04, top - 0.12, top - 0.04, Z_BACK_M, MERLON_Z_M + 0.04);
      slab(parts, STONE_TRIM, mx0 + 0.08, mx1 - 0.08, top - 0.04, top, Z_BACK_M, MERLON_Z_M);
      slab(parts, STONE_CREVICE, mx0 - 0.025, mx0, PARAPET_WALK_M, top - 0.12,
        MERLON_Z_M - 0.02, MERLON_Z_M + 0.01);
      slab(parts, STONE_CREVICE, mx1, mx1 + 0.025, PARAPET_WALK_M, top - 0.12,
        MERLON_Z_M - 0.02, MERLON_Z_M + 0.01);
    }
  }
}

/** Full-height quoin returns terminating the run into the courtyard side walls. */
function pushEndReturns(parts: BufferGeometry[]): void {
  for (const side of [-1, 1] as const) {
    const outerX = side * HALF_W_M;
    const innerX = side * (HALF_W_M - 0.65);
    const x0 = Math.min(outerX, innerX);
    const x1 = Math.max(outerX, innerX);
    const courseHeight = 0.58;
    for (let index = 0; ; index += 1) {
      const y0 = index * courseHeight;
      if (y0 >= PARAPET_WALK_M) break;
      const y1 = Math.min(PARAPET_WALK_M, y0 + courseHeight);
      const short = index % 2 === 1;
      const width = (x1 - x0) * (short ? 0.6 : 1);
      const qx0 = side < 0 ? x0 : x1 - width;
      const z = y1 <= STRING_BOTTOM_M ? LOWER_PIER_Z_M : UPPER_PIER_Z_M;
      slab(parts, short ? STONE_PIER_ALT : STONE_PIER, qx0, qx0 + width, y0, y1 - 0.03,
        Z_BACK_M, short ? z - 0.05 : z + 0.01);
    }
    // Joint shadow at the very end, where the kit dies into the side wall.
    slab(parts, STONE_CREVICE, side < 0 ? -HALF_W_M : HALF_W_M - 0.05,
      side < 0 ? -HALF_W_M + 0.05 : HALF_W_M, 0, PARAPET_WALK_M, Z_BACK_M, UPPER_PIER_Z_M + 0.02);
  }
}

/**
 * The pishtaq: the projecting gate block on the spawn's own sightline. Frame,
 * jambs, the pointed arch ring and its tympanum, the muqarnas corbel tiers, and
 * the crowning cornice and parapet.
 */
function pushPishtaq(parts: BufferGeometry[]): void {
  const frameOuter = PISHTAQ_HALF_W_M;

  // Frame border around the recessed panel: the pishtaq's defining band.
  for (const side of [-1, 1] as const) {
    const bx0 = side < 0 ? -TURRET_INNER_X_M : PANEL_HALF_W_M;
    const bx1 = side < 0 ? -PANEL_HALF_W_M : TURRET_INNER_X_M;
    slab(parts, STONE_PIER, bx0, bx1, PLINTH_TOP_M, STRING_BOTTOM_M, Z_BACK_M, LOWER_PIER_Z_M);
    slab(parts, STONE_PIER, bx0, bx1, STRING_TOP_M, PISHTAQ_CORNICE_BOTTOM_M, Z_BACK_M, UPPER_PIER_Z_M);
    for (let course = 0; course < 18; course += 1) {
      const y = STRING_TOP_M + 0.3 + course * 0.44;
      if (y > PISHTAQ_CORNICE_BOTTOM_M - 0.3) break;
      slab(parts, course % 2 === 0 ? STONE_TRIM : STONE_PIER_ALT,
        bx0 + (course % 2 === 0 ? 0 : 0.14), bx1 - (course % 2 === 0 ? 0 : 0.14),
        y, y + 0.1, UPPER_PIER_Z_M - 0.05, UPPER_PIER_Z_M + 0.025);
    }
  }
  // Frame head above the arch, closing the border into a rectangle.
  slab(parts, STONE_PIER, -TURRET_INNER_X_M, TURRET_INNER_X_M, FRAME_HEAD_BOTTOM_M,
    PISHTAQ_CORNICE_BOTTOM_M, Z_BACK_M, UPPER_PIER_Z_M);
  slab(parts, STONE_TRIM, -TURRET_INNER_X_M, TURRET_INNER_X_M, FRAME_HEAD_BOTTOM_M,
    FRAME_HEAD_BOTTOM_M + 0.14, Z_BACK_M, UPPER_PIER_Z_M + 0.05);
  pushUndershade(parts, -TURRET_INNER_X_M, TURRET_INNER_X_M, FRAME_HEAD_BOTTOM_M - 0.06,
    UPPER_FIELD_Z_M, UPPER_PIER_Z_M + 0.05);

  // Recessed panel: plastered masonry with the gate opening left out of it.
  pushArchedField(parts, PLASTER_FIELD, -PANEL_HALF_W_M, PANEL_HALF_W_M,
    STRING_TOP_M, FRAME_HEAD_BOTTOM_M, Z_BACK_M, UPPER_RECESS_Z_M, {
      x0: -RING_OUTER_REACH_M,
      x1: RING_OUTER_REACH_M,
      sillY: STRING_TOP_M,
      headY: (x) => archBoundaryY(x, RING_THICKNESS_M),
      floorZ: RECESS_FLOOR_Z_M,
      floorTone: STONE_SOFFIT,
    }, 48);
  pushArchedField(parts, PLASTER_FIELD, -PANEL_HALF_W_M, PANEL_HALF_W_M,
    PLINTH_TOP_M, STRING_BOTTOM_M, Z_BACK_M, LOWER_FIELD_Z_M, {
      x0: -JAMB_OUTER_X_M,
      x1: JAMB_OUTER_X_M,
      sillY: 0,
      headY: () => STRING_BOTTOM_M,
      floorZ: RECESS_FLOOR_Z_M,
      floorTone: STONE_SOFFIT,
    }, 8);
  // Plaster loss on the panel: patches fallen away to the stone beneath, which
  // is what stops a large pale field reading as a painted card.
  for (const patch of [
    { x0: -3.6, x1: -2.95, y0: 3.1, y1: 4.6 },
    { x0: 2.85, x1: 3.6, y0: 5.4, y1: 7.1 },
    { x0: -3.55, x1: -3.05, y0: 7.4, y1: 8.6 },
    { x0: 3.05, x1: 3.62, y0: 3.05, y1: 3.9 },
  ]) {
    slab(parts, STONE_FIELD_ALT, patch.x0, patch.x1, patch.y0, patch.y1,
      UPPER_RECESS_Z_M, UPPER_RECESS_Z_M + 0.014);
    slab(parts, PLASTER_SHADED, patch.x0 - 0.05, patch.x0, patch.y0, patch.y1,
      UPPER_RECESS_Z_M, UPPER_RECESS_Z_M + 0.016);
    slab(parts, PLASTER_SHADED, patch.x0, patch.x1, patch.y1, patch.y1 + 0.05,
      UPPER_RECESS_Z_M, UPPER_RECESS_Z_M + 0.016);
  }

  // Jambs of the opening.
  for (const side of [-1, 1] as const) {
    const jx0 = side < 0 ? -JAMB_OUTER_X_M : GATE_HALF_SPAN_M;
    const jx1 = side < 0 ? -GATE_HALF_SPAN_M : JAMB_OUTER_X_M;
    slab(parts, STONE_PIER, jx0, jx1, 0, FREE_PROJECTION_Y_M, Z_BACK_M, LOWER_PIER_Z_M);
    // Corbelled impost: the jamb steps out to meet the ring above head height.
    slab(parts, STONE_PIER, jx0, jx1, FREE_PROJECTION_Y_M, GATE_SPRING_Y_M - 0.2,
      Z_BACK_M, UPPER_PIER_Z_M);
    slab(parts, STONE_TRIM, jx0 - 0.06, jx1 + 0.06, GATE_SPRING_Y_M - 0.2, GATE_SPRING_Y_M,
      Z_BACK_M, UPPER_PIER_Z_M + 0.14);
    pushUndershade(parts, jx0 - 0.06, jx1 + 0.06, GATE_SPRING_Y_M - 0.26,
      UPPER_FIELD_Z_M, UPPER_PIER_Z_M + 0.14);
    for (let course = 0; course < 4; course += 1) {
      const y = 0.42 + course * 0.56;
      slab(parts, course % 2 === 0 ? STONE_TRIM : STONE_PIER_ALT, jx0, jx1, y, y + 0.09,
        LOWER_PIER_Z_M - 0.05, LOWER_PIER_Z_M + 0.02);
    }
    // Reveal: the side wall of the opening, dark, running back to the door.
    slab(parts, STONE_SOFFIT, side < 0 ? -GATE_HALF_SPAN_M : GATE_HALF_SPAN_M - 0.06,
      side < 0 ? -GATE_HALF_SPAN_M + 0.06 : GATE_HALF_SPAN_M, 0, ARCH_APEX_Y_M,
      GATE_REVEAL_Z_M, LOWER_PIER_Z_M);
  }

  // Back of the opening: the wall plane itself, in shade.
  slab(parts, STONE_SOFFIT, -GATE_HALF_SPAN_M, GATE_HALF_SPAN_M, 0, ARCH_APEX_Y_M,
    GATE_REVEAL_Z_M - 0.02, GATE_REVEAL_Z_M);

  // Arch: shaded barrel inside the opening, proud voussoir ring on the face.
  const columns = 60;
  for (let index = 0; index < columns; index += 1) {
    const cx0 = -RING_OUTER_REACH_M + (RING_OUTER_REACH_M * 2 * index) / columns;
    const cx1 = -RING_OUTER_REACH_M + (RING_OUTER_REACH_M * 2 * (index + 1)) / columns;
    const mid = (cx0 + cx1) * 0.5;
    const inner = Math.max(GATE_SPRING_Y_M, archBoundaryY(mid, 0));
    const outer = archBoundaryY(mid, RING_THICKNESS_M);
    if (outer <= inner) continue;
    if (Math.abs(mid) <= GATE_HALF_SPAN_M) {
      slab(parts, STONE_SOFFIT, cx0, cx1, inner - 0.16, inner, GATE_REVEAL_Z_M, LOWER_PIER_Z_M);
      slab(parts, STONE_SOFFIT_EDGE, cx0, cx1, inner - 0.05, inner,
        LOWER_PIER_Z_M - 0.03, LOWER_PIER_Z_M);
    }
    // Voussoirs. Alternating tone gives the ~0.45 m stone read the daylight
    // references carry at this distance.
    const voussoir = Math.floor((index / columns) * 21);
    slab(parts, voussoir % 2 === 0 ? STONE_TRIM : STONE_PIER_ALT, cx0 + 0.006, cx1 - 0.006,
      inner, outer, UPPER_RECESS_Z_M, UPPER_PIER_Z_M + 0.06);
  }
  slab(parts, STONE_KEYSTONE, -0.26, 0.26, ARCH_APEX_Y_M - 0.12,
    ARCH_APEX_Y_M + RING_THICKNESS_M + 0.2, UPPER_RECESS_Z_M, UPPER_PIER_Z_M + 0.16);
  pushUndershade(parts, -0.32, 0.32, ARCH_APEX_Y_M + RING_THICKNESS_M + 0.2,
    UPPER_FIELD_Z_M, UPPER_PIER_Z_M + 0.16);

  // Tympanum over the doors: relieving lintel, inscription band, rosette.
  slab(parts, PLASTER_FIELD_ALT, -GATE_HALF_SPAN_M + 0.08, GATE_HALF_SPAN_M - 0.08,
    GATE_LEAF_TOP_M, ARCH_APEX_Y_M - 0.1, GATE_REVEAL_Z_M, GATE_REVEAL_Z_M + 0.12);
  slab(parts, STONE_TRIM, -GATE_HALF_SPAN_M, GATE_HALF_SPAN_M, GATE_LEAF_TOP_M,
    GATE_LEAF_TOP_M + 0.22, GATE_REVEAL_Z_M, GATE_REVEAL_Z_M + 0.22);
  pushUndershade(parts, -GATE_HALF_SPAN_M, GATE_HALF_SPAN_M, GATE_LEAF_TOP_M - 0.05,
    GATE_REVEAL_Z_M, GATE_REVEAL_Z_M + 0.22);
  slab(parts, STONE_RECESS, -1.75, 1.75, GATE_LEAF_TOP_M + 0.4, GATE_LEAF_TOP_M + 0.9,
    GATE_REVEAL_Z_M + 0.06, GATE_REVEAL_Z_M + 0.08);
  for (let index = 0; index < 13; index += 1) {
    const x = -1.56 + index * 0.26;
    box(parts, STONE_TRIM, 0.14, 0.22, 0.05, x, GATE_LEAF_TOP_M + 0.65, GATE_REVEAL_Z_M + 0.11);
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    box(parts, STONE_TRIM, 0.14, 0.14, 0.08,
      Math.cos(angle) * 0.36, GATE_LEAF_TOP_M + 1.55 + Math.sin(angle) * 0.36,
      GATE_REVEAL_Z_M + 0.12);
  }

  // Muqarnas: three tiers of stepped corbel cells under the cornice.
  for (let tier = 0; tier < 3; tier += 1) {
    const y0 = 9.58 + tier * 0.3;
    const cells = 15 - tier * 2;
    const reach = UPPER_PIER_Z_M + 0.1 + tier * 0.16;
    for (let index = 0; index < cells; index += 1) {
      const span = (frameOuter * 2 - 0.5) / cells;
      const cx = -frameOuter + 0.25 + span * (index + 0.5);
      box(parts, index % 2 === 0 ? STONE_TRIM : STONE_PIER, span * 0.86, 0.3, reach - UPPER_FIELD_Z_M,
        cx, y0 + 0.15, (UPPER_FIELD_Z_M + reach) * 0.5);
      pushUndershade(parts, cx - span * 0.43, cx + span * 0.43, y0 - 0.02, UPPER_FIELD_Z_M, reach);
    }
  }

  // Cornice, parapet, coping.
  slab(parts, STONE_TRIM, -frameOuter - 0.16, frameOuter + 0.16,
    PISHTAQ_CORNICE_BOTTOM_M, PISHTAQ_CORNICE_TOP_M, Z_BACK_M, UPPER_PIER_Z_M + 0.6);
  pushUndershade(parts, -frameOuter - 0.16, frameOuter + 0.16, PISHTAQ_CORNICE_BOTTOM_M - 0.06,
    UPPER_PIER_Z_M, UPPER_PIER_Z_M + 0.6);
  slab(parts, STONE_PIER, -frameOuter, frameOuter, PISHTAQ_CORNICE_TOP_M, PISHTAQ_TOP_M - 0.12,
    Z_BACK_M, UPPER_PIER_Z_M + 0.3);
  slab(parts, STONE_TRIM, -frameOuter - 0.08, frameOuter + 0.08, PISHTAQ_TOP_M - 0.12, PISHTAQ_TOP_M,
    Z_BACK_M, UPPER_PIER_Z_M + 0.38);
  for (let index = 0; index < 9; index += 1) {
    const cell = (frameOuter * 2) / 9;
    const cx = -frameOuter + cell * (index + 0.5);
    if (Math.abs(cx) > TURRET_INNER_X_M - 0.2) continue;
    slab(parts, index % 2 === 0 ? STONE_PIER : STONE_PIER_ALT, cx - cell * 0.28, cx + cell * 0.28,
      PISHTAQ_TOP_M, PISHTAQ_TOP_M + 0.34, Z_BACK_M, UPPER_PIER_Z_M + 0.24);
  }
}

/** Engaged turrets at the pishtaq corners, capped above everything else. */
function pushTurrets(parts: BufferGeometry[]): void {
  for (const side of [-1, 1] as const) {
    const cx = side * (TURRET_INNER_X_M + (PISHTAQ_HALF_W_M - TURRET_INNER_X_M) * 0.5);
    const halfWidth = (PISHTAQ_HALF_W_M - TURRET_INNER_X_M) * 0.5;
    // Faceted shaft: a narrower forward plane on a wider one approximates a
    // round turret without a cylinder, and each facet takes the sun differently.
    slab(parts, STONE_PIER, cx - halfWidth, cx + halfWidth, 0, FREE_PROJECTION_Y_M,
      Z_BACK_M, LOWER_PIER_Z_M);
    slab(parts, STONE_FIELD, cx - halfWidth * 0.62, cx + halfWidth * 0.62, 0, FREE_PROJECTION_Y_M,
      Z_BACK_M, LOWER_PIER_Z_M + 0.008);
    // Upper shaft is free to stand proud.
    slab(parts, STONE_PIER, cx - halfWidth, cx + halfWidth, FREE_PROJECTION_Y_M, TURRET_TOP_M - 0.9,
      Z_BACK_M, UPPER_PIER_Z_M + 0.26);
    slab(parts, STONE_FIELD, cx - halfWidth * 0.62, cx + halfWidth * 0.62,
      FREE_PROJECTION_Y_M, TURRET_TOP_M - 0.9, Z_BACK_M, UPPER_PIER_Z_M + 0.4);
    // Corbelled transition where the shaft steps out over head height.
    slab(parts, STONE_TRIM, cx - halfWidth - 0.05, cx + halfWidth + 0.05,
      FREE_PROJECTION_Y_M, FREE_PROJECTION_Y_M + 0.18, Z_BACK_M, UPPER_PIER_Z_M + 0.3);
    pushUndershade(parts, cx - halfWidth - 0.05, cx + halfWidth + 0.05, FREE_PROJECTION_Y_M - 0.06,
      LOWER_PIER_Z_M, UPPER_PIER_Z_M + 0.3);
    for (let index = 0; index < 8; index += 1) {
      const y = 3.5 + index * 1.02;
      if (y > TURRET_TOP_M - 1.2) break;
      slab(parts, STONE_TRIM, cx - halfWidth - 0.04, cx + halfWidth + 0.04, y, y + 0.13,
        Z_BACK_M, UPPER_PIER_Z_M + 0.44);
    }
    // Corbel table and stepped cap.
    slab(parts, STONE_TRIM, cx - halfWidth - 0.12, cx + halfWidth + 0.12,
      TURRET_TOP_M - 0.9, TURRET_TOP_M - 0.66, Z_BACK_M, UPPER_PIER_Z_M + 0.52);
    pushUndershade(parts, cx - halfWidth - 0.12, cx + halfWidth + 0.12, TURRET_TOP_M - 0.96,
      UPPER_PIER_Z_M, UPPER_PIER_Z_M + 0.52);
    slab(parts, STONE_PIER, cx - halfWidth, cx + halfWidth, TURRET_TOP_M - 0.66, TURRET_TOP_M - 0.28,
      Z_BACK_M, UPPER_PIER_Z_M + 0.34);
    slab(parts, STONE_TRIM, cx - halfWidth * 0.78, cx + halfWidth * 0.78,
      TURRET_TOP_M - 0.28, TURRET_TOP_M - 0.1, Z_BACK_M, UPPER_PIER_Z_M + 0.26);
    slab(parts, STONE_KEYSTONE, cx - halfWidth * 0.32, cx + halfWidth * 0.32,
      TURRET_TOP_M - 0.1, TURRET_TOP_M, Z_BACK_M, UPPER_PIER_Z_M + 0.14);
  }
}

/** Stone corbels carrying the mashrabiya oriel over the gate. */
function pushOrielCorbels(parts: BufferGeometry[]): void {
  for (let index = 0; index < 5; index += 1) {
    const x = -ORIEL_HALF_W_M + 0.28 + index * ((ORIEL_HALF_W_M * 2 - 0.56) / 4);
    const reach = ORIEL_FRONT_Z_M - 0.22;
    // Two-course bracket, each course reaching further than the one below.
    box(parts, STONE_PIER, 0.3, 0.24, (UPPER_PIER_Z_M + 0.42) - UPPER_RECESS_Z_M,
      x, ORIEL_BOTTOM_M - 0.44, (UPPER_RECESS_Z_M + UPPER_PIER_Z_M + 0.42) * 0.5);
    box(parts, STONE_TRIM, 0.32, 0.24, reach - UPPER_RECESS_Z_M,
      x, ORIEL_BOTTOM_M - 0.2, (UPPER_RECESS_Z_M + reach) * 0.5);
    pushUndershade(parts, x - 0.17, x + 0.17, ORIEL_BOTTOM_M - 0.58, UPPER_RECESS_Z_M, UPPER_PIER_Z_M + 0.42);
    pushUndershade(parts, x - 0.18, x + 0.18, ORIEL_BOTTOM_M - 0.34, UPPER_RECESS_Z_M, reach);
  }
  // Continuous sill the oriel actually sits on.
  slab(parts, STONE_TRIM, -ORIEL_HALF_W_M - 0.1, ORIEL_HALF_W_M + 0.1,
    ORIEL_BOTTOM_M - 0.08, ORIEL_BOTTOM_M, UPPER_RECESS_Z_M, ORIEL_FRONT_Z_M);
  pushUndershade(parts, -ORIEL_HALF_W_M - 0.1, ORIEL_HALF_W_M + 0.1, ORIEL_BOTTOM_M - 0.14,
    UPPER_RECESS_Z_M, ORIEL_FRONT_Z_M);
  // Hood over the oriel, tying it back into the frame head.
  slab(parts, STONE_TRIM, -ORIEL_HALF_W_M - 0.16, ORIEL_HALF_W_M + 0.16,
    ORIEL_TOP_M, ORIEL_TOP_M + 0.16, UPPER_RECESS_Z_M, ORIEL_FRONT_Z_M + 0.1);
  pushUndershade(parts, -ORIEL_HALF_W_M - 0.16, ORIEL_HALF_W_M + 0.16, ORIEL_TOP_M - 0.06,
    UPPER_RECESS_Z_M, ORIEL_FRONT_Z_M + 0.1);
}

/**
 * Ground treatment: apron, threshold steps, drift, and the service dressing a
 * back-of-house boundary earns. Everything here stays below
 * {@link GROUND_DRESSING_MAX_Y_M} wherever it reaches past the low projection
 * limit, so a player passes over it rather than through it.
 */
function pushGroundDressing(parts: BufferGeometry[]): void {
  // Paved apron with a kerb.
  //
  // The courtyard floor runs up to the wall as one near-white sheet, which both
  // flattens the value range and leaves an accidental straight material seam
  // parallel to the boundary. A darker, warmer apron laid against the plinth
  // takes that seam over as a deliberate edge and gives the bottom of every
  // camera something other than the brightest value in frame.
  for (let index = 0; index < 26; index += 1) {
    const x0 = -HALF_W_M + (SPAWN_A_GATE_REFERENCE_WIDTH_M * index) / 26;
    const x1 = x0 + SPAWN_A_GATE_REFERENCE_WIDTH_M / 26 - 0.05;
    const depth = 1.24 + ((index * 5) % 3) * 0.09;
    const worn = (index * 3) % 4 === 0;
    slab(parts, worn ? APRON_WORN : APRON_FLAG, x0, x1, 0, 0.075, PLINTH_Z_M, PLINTH_Z_M + depth);
    // Every few flags is a replacement in paler stone, cut to a different size.
    if (index % 5 === 2) {
      slab(parts, APRON_PATCH, x0 + 0.08, x1 - 0.22, 0.075, 0.085,
        PLINTH_Z_M + 0.16, PLINTH_Z_M + depth - 0.3);
    }
    // Kerb: bright top, dark outer face. The pair is what makes the edge read.
    slab(parts, STONE_TRIM, x0, x1, 0.075, 0.155, PLINTH_Z_M + depth - 0.2, PLINTH_Z_M + depth);
    // Shadow line off the kerb, laid flat on the paving. As a standing block it
    // reads as a row of black teeth from any oblique camera.
    slab(parts, STONE_CREVICE_SOFT, x0, x1, 0, 0.02, PLINTH_Z_M + depth, PLINTH_Z_M + depth + 0.14);
    // Joint shadow between flags.
    slab(parts, STONE_CREVICE_SOFT, x1, x1 + 0.05, 0, 0.08, PLINTH_Z_M, PLINTH_Z_M + depth);
  }
  // Traffic wear on the apron in front of the gate: the one part of this
  // boundary that ever saw use, polished lighter and dished.
  slab(parts, APRON_POLISHED, -3.6, 3.6, 0.075, 0.088, PLINTH_Z_M + 0.18, PLINTH_Z_M + 1.34);
  slab(parts, APRON_WORN, -2.4, 2.4, 0.088, 0.096, PLINTH_Z_M + 0.3, PLINTH_Z_M + 1.2);

  // Scattered debris across the apron: grit, potsherds, and blown straw. Small,
  // dark and irregular, which is what stops a paved strip reading as new.
  for (let index = 0; index < 34; index += 1) {
    const x = -HALF_W_M + 0.4 + (index * 7.13) % (SPAWN_A_GATE_REFERENCE_WIDTH_M - 0.8);
    const z = PLINTH_Z_M + 0.2 + ((index * 5) % 7) * 0.16;
    const size = 0.07 + ((index * 3) % 4) * 0.035;
    box(parts, index % 3 === 0 ? RUBBLE : STONE_CREVICE_SOFT, size, 0.05, size * 0.8, x, 0.1, z);
  }
  for (let index = 0; index < 10; index += 1) {
    const x = -HALF_W_M + 1.1 + index * 2.05;
    slab(parts, SAND_DRIFT, x - 0.4, x + 0.4, 0.075, 0.088,
      PLINTH_Z_M + 0.9, PLINTH_Z_M + 1.5 + (index % 3) * 0.12);
  }

  // Threshold: two worn steps up to the gate.
  slab(parts, STONE_THRESHOLD, -3.35, 3.35, 0, 0.15, PLINTH_Z_M, PLINTH_Z_M + 1.05);
  slab(parts, STONE_THRESHOLD_WORN, -2.95, 2.95, 0.15, 0.29, GATE_REVEAL_Z_M, PLINTH_Z_M + 0.62);
  slab(parts, STONE_TRIM, -3.35, 3.35, 0.11, 0.15, PLINTH_Z_M + 0.95, PLINTH_Z_M + 1.05);
  pushUndershade(parts, -3.35, 3.35, 0.29, GATE_REVEAL_Z_M, PLINTH_Z_M + 0.3);
  // Wear hollows in the tread, from the traffic this gate used to take.
  for (let index = 0; index < 6; index += 1) {
    const x = -2.1 + index * 0.84;
    slab(parts, STONE_THRESHOLD_WORN, x - 0.3, x + 0.3, 0.29, 0.305,
      PLINTH_Z_M - 0.08, PLINTH_Z_M + 0.5);
  }

  // Blown sand banked into the base, heaviest toward the corners.
  for (let index = 0; index < 14; index += 1) {
    const x = -HALF_W_M + 0.7 + index * 1.55;
    if (Math.abs(x) < 3.9) continue;
    const cornerFactor = 1 - Math.abs(x) / HALF_W_M;
    const height = 0.09 + (1 - cornerFactor) * 0.12 + ((index * 7) % 3) * 0.02;
    const reach = 0.55 + (1 - cornerFactor) * 0.5;
    slab(parts, SAND_DRIFT, x - 0.8, x + 0.8, 0, height, PLINTH_Z_M - 0.05, PLINTH_Z_M + reach);
    slab(parts, SAND_DRIFT, x - 1.1, x + 1.1, 0, height * 0.5,
      PLINTH_Z_M + reach, PLINTH_Z_M + reach + 0.35);
  }

  // Fallen masonry: the wall has a history.
  const rubble = [
    { x: -8.6, w: 0.52, h: 0.34, d: 0.46, z: 0.72 },
    { x: -8.1, w: 0.34, h: 0.22, d: 0.3, z: 1.1 },
    { x: -7.85, w: 0.24, h: 0.16, d: 0.22, z: 0.62 },
    { x: 7.4, w: 0.46, h: 0.3, d: 0.4, z: 0.9 },
    { x: 8.05, w: 0.28, h: 0.19, d: 0.26, z: 0.66 },
    { x: 9.9, w: 0.36, h: 0.24, d: 0.32, z: 1.02 },
  ];
  for (const stone of rubble) {
    box(parts, RUBBLE, stone.w, stone.h, stone.d, stone.x, stone.h * 0.5, stone.z);
    slab(parts, STONE_CREVICE_SOFT, stone.x - stone.w * 0.6, stone.x + stone.w * 0.6, 0, 0.02,
      stone.z - stone.d * 0.6, stone.z + stone.d * 0.6);
  }
  // Column drum lying on its side, half buried in the drift.
  box(parts, RUBBLE, 1.05, 0.42, 0.42, -6.3, 0.19, 0.86);
  box(parts, STONE_THRESHOLD_WORN, 1.02, 0.12, 0.44, -6.3, 0.36, 0.86);
  box(parts, SAND_DRIFT, 1.3, 0.1, 0.62, -6.3, 0.05, 0.86);

  // Stone water trough against the plinth, still in service.
  const troughX = 6.9;
  slab(parts, STONE_PIER, troughX - 0.85, troughX + 0.85, 0, 0.44, PLINTH_Z_M, PLINTH_Z_M + 0.66);
  slab(parts, STONE_TRIM, troughX - 0.9, troughX + 0.9, 0.44, 0.5, PLINTH_Z_M - 0.02, PLINTH_Z_M + 0.7);
  slab(parts, WATER_DARK, troughX - 0.74, troughX + 0.74, 0.4, 0.43, PLINTH_Z_M + 0.06, PLINTH_Z_M + 0.58);
  slab(parts, STONE_CREVICE_SOFT, troughX - 0.95, troughX + 0.95, 0, 0.03, PLINTH_Z_M, PLINTH_Z_M + 0.78);
  // Damp staining below the spout that feeds it.
  slab(parts, STONE_RECESS_DEEP, troughX - 0.16, troughX + 0.16, 0.5, PLINTH_TOP_M + 0.9,
    LOWER_FIELD_Z_M, LOWER_FIELD_Z_M + 0.012);
}

/**
 * The service dressing that makes the boundary read as inhabited rather than as
 * a clean elevation over empty pavement: the awning's stone corbels, the wall
 * fountain on the east flank, a drain runnel, and the keepers the gate's draw
 * bar seats into.
 */
function pushWallServiceStone(parts: BufferGeometry[]): void {
  // Soot and smoke staining above the two gate lamps.
  for (const side of [-1, 1] as const) {
    slab(parts, STONE_RECESS_DEEP, side * 3.62 - 0.2, side * 3.62 + 0.2, 4.25, 5.5,
      UPPER_PIER_Z_M, UPPER_PIER_Z_M + 0.012);
  }

  // The sabil, its trough and the drain runnel have been removed from this
  // wall. A wall fountain is a real piece of civic architecture, but it is a
  // second focus on an elevation whose focus is the gate, and it sat in a sunk
  // panel that no longer exists. That programme now lives on the east edge's
  // dye works, where water is what the building is for.
  // Keepers on both jambs: the sockets the draw bar drops into, which is what
  // makes the gate read as barred shut rather than merely closed.
  for (const side of [-1, 1] as const) {
    box(parts, STONE_PIER_ALT, 0.34, 0.36, 0.3, side * (GATE_HALF_SPAN_M - 0.16), 2.32,
      GATE_LEAF_Z_M + 0.18);
    pushUndershade(parts, side * GATE_HALF_SPAN_M - 0.18, side * GATE_HALF_SPAN_M + 0.18, 2.13,
      GATE_LEAF_Z_M, GATE_LEAF_Z_M + 0.34);
  }
}

/** Above-head fixtures on the stone: spouts and the lamp brackets. */
function pushStoneFixtures(parts: BufferGeometry[]): void {
  // Drainage spouts through the parapet, throwing water clear of the wall.
  for (const x of [-9.2, -6.9, 6.9, 9.2]) {
    box(parts, STONE_TRIM, 0.26, 0.22, 0.62, x, PARAPET_BOTTOM_M + 0.1, MACHICOLATION_Z_M + 0.28);
    box(parts, STONE_PIER_ALT, 0.18, 0.1, 0.16, x, PARAPET_BOTTOM_M + 0.02, MACHICOLATION_Z_M + 0.54);
    pushUndershade(parts, x - 0.14, x + 0.14, PARAPET_BOTTOM_M - 0.02,
      MACHICOLATION_Z_M, MACHICOLATION_Z_M + 0.6);
    // Water staining down the face beneath each spout.
    slab(parts, STONE_RECESS_DEEP, x - 0.14, x + 0.14, CORBEL_TABLE_BOTTOM_M - 2.2, PARAPET_BOTTOM_M,
      UPPER_FIELD_Z_M, UPPER_FIELD_Z_M + 0.012);
  }

  // Lamp brackets flanking the gate, well above head height.
  for (const side of [-1, 1] as const) {
    const x = side * 3.62;
    box(parts, STONE_TRIM, 0.34, 0.26, 0.28, x, 4.05, UPPER_PIER_Z_M + 0.12);
    pushUndershade(parts, x - 0.18, x + 0.18, 3.9, UPPER_FIELD_Z_M, UPPER_PIER_Z_M + 0.26);
  }
}

/** Stone geometry: the whole masonry assembly. */
export function createSpawnAGateStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  pushPlinth(parts);
  pushFlankCurtain(parts);
  pushStringCourse(parts);
  pushCrown(parts);
  pushPishtaq(parts);
  pushTurrets(parts);
  pushOrielCorbels(parts);
  pushEndReturns(parts);
  pushStoneFixtures(parts);
  pushWallServiceStone(parts);
  pushGroundDressing(parts);
  // ph_sandstone_blocks_05 is authored at a 2.0 m tile, which lands the courses
  // at the large ashlar scale the daylight references read at.
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/**
 * Timber, cloth and ironwork of the lived-in boundary: the goods hung on the
 * wall, the low stock at its base, and the bar and chain that make the gate
 * unambiguously shut.
 *
 * Everything here obeys the same envelope as the masonry: hung goods sit inside
 * the sunk panels, behind the wall face, and stock at the base stays under
 * {@link GROUND_DRESSING_MAX_Y_M}.
 */
function pushWallServiceFixtures(parts: BufferGeometry[]): void {
  // The hung textiles, baskets and stacked stock that used to dress this wall
  // are gone with the sunk panels they hung in. Market goods belong on a
  // merchant frontage, not on the defensive curtain of a city gate, and
  // spreading them along the base gave the elevation a third order competing
  // with its arcade and its portal. The courtyard still carries that content —
  // concentrated where it means something, on the exit returns and the dye
  // works — which is the whole point of concentrating it.

  // The gate is barred. A monumental door on a sealed boundary has to say so,
  // or it reads as a route that was never opened.
  slab(parts, TIMBER_GATE_ALT, -GATE_HALF_SPAN_M + 0.1, GATE_HALF_SPAN_M - 0.1, 2.26, 2.5,
    GATE_LEAF_Z_M + 0.05, GATE_LEAF_Z_M + 0.24);
  slab(parts, TIMBER_GATE_EDGE, -GATE_HALF_SPAN_M + 0.1, GATE_HALF_SPAN_M - 0.1, 2.26, 2.32,
    GATE_LEAF_Z_M + 0.05, GATE_LEAF_Z_M + 0.25);
  // Chain looped between the two ring handles, with a padlock at the meeting.
  for (let index = 0; index < 11; index += 1) {
    const t = index / 10;
    const x = -0.36 + t * 0.72;
    const sag = Math.sin(t * Math.PI) * 0.16;
    box(parts, IRON_DARK, 0.09, 0.075, 0.05, x, 1.9 - sag, GATE_LEAF_Z_M + 0.1);
  }
  box(parts, IRON_RUST, 0.16, 0.22, 0.08, 0, 1.66, GATE_LEAF_Z_M + 0.12);
  // Boards nailed across the wicket.
  for (const [index, board] of [{ y: 1.5, roll: 0.16 }, { y: 1.02, roll: -0.13 }].entries()) {
    angledBox(parts, index === 0 ? TIMBER_GATE : TIMBER_GATE_ALT, 1.22, 0.17, 0.05,
      -1.17, board.y, GATE_LEAF_Z_M + 0.07, board.roll);
    box(parts, IRON_RUST, 0.06, 0.06, 0.04, -1.6, board.y, GATE_LEAF_Z_M + 0.1);
    box(parts, IRON_RUST, 0.06, 0.06, 0.04, -0.74, board.y, GATE_LEAF_Z_M + 0.1);
  }
}

/**
 * Timber and ironwork: the barred gate leaves, the mashrabiya lattice, the
 * lanterns, the awning and hung goods, and the parapet pennants.
 */
export function createSpawnAGateFixtureGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Two gate leaves, planked vertically, meeting on the centre line.
  for (const side of [-1, 1] as const) {
    const inner = side * 0.035;
    const outer = side * (GATE_HALF_SPAN_M - 0.07);
    const x0 = Math.min(inner, outer);
    const x1 = Math.max(inner, outer);
    const planks = 10;
    for (let index = 0; index < planks; index += 1) {
      const px0 = x0 + ((x1 - x0) * index) / planks;
      const px1 = x0 + ((x1 - x0) * (index + 1)) / planks;
      slab(parts, index % 3 === 0 ? TIMBER_GATE_ALT : TIMBER_GATE, px0 + 0.008, px1 - 0.008,
        0.29, GATE_LEAF_TOP_M, GATE_LEAF_Z_M - 0.05, GATE_LEAF_Z_M);
      slab(parts, TIMBER_GATE_EDGE, px1 - 0.012, px1, 0.29, GATE_LEAF_TOP_M,
        GATE_LEAF_Z_M - 0.05, GATE_LEAF_Z_M + 0.004);
    }
    // Iron straps across the leaf, with studs.
    for (const strapY of [0.62, 1.62, 2.62, 3.62]) {
      slab(parts, IRON_DARK, x0 + 0.02, x1 - 0.02, strapY, strapY + 0.11,
        GATE_LEAF_Z_M, GATE_LEAF_Z_M + 0.035);
      const studs = 7;
      for (let index = 0; index < studs; index += 1) {
        const sx = x0 + 0.12 + ((x1 - x0 - 0.24) * index) / (studs - 1);
        box(parts, IRON_RUST, 0.075, 0.075, 0.05, sx, strapY + 0.055, GATE_LEAF_Z_M + 0.055);
      }
    }
    // Stile at the meeting edge.
    slab(parts, IRON_DARK, Math.min(inner, inner - side * 0.055), Math.max(inner, inner - side * 0.055),
      0.29, GATE_LEAF_TOP_M, GATE_LEAF_Z_M, GATE_LEAF_Z_M + 0.03);
    // Ring handle.
    const ringX = side * 0.36;
    box(parts, IRON_DARK, 0.16, 0.16, 0.05, ringX, 1.98, GATE_LEAF_Z_M + 0.05);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      box(parts, IRON_DARK, 0.05, 0.05, 0.05,
        ringX + Math.cos(angle) * 0.16, 1.82 + Math.sin(angle) * 0.16, GATE_LEAF_Z_M + 0.07);
    }
    // Pintle hinges into the jamb.
    for (const hingeY of [0.72, 2.42]) {
      const hx0 = side < 0 ? -GATE_HALF_SPAN_M + 0.02 : x1 - 0.06;
      const hx1 = side < 0 ? x0 + 0.06 : GATE_HALF_SPAN_M - 0.02;
      slab(parts, IRON_DARK, Math.min(hx0, hx1), Math.max(hx0, hx1), hingeY, hingeY + 0.14,
        GATE_LEAF_Z_M, GATE_LEAF_Z_M + 0.05);
    }
  }
  // Wicket door set into the left leaf: the small gate that still gets used.
  slab(parts, TIMBER_GATE_EDGE, -1.72, -0.62, 0.29, 2.32, GATE_LEAF_Z_M, GATE_LEAF_Z_M + 0.028);
  slab(parts, TIMBER_GATE_ALT, -1.66, -0.68, 0.34, 2.26, GATE_LEAF_Z_M + 0.028, GATE_LEAF_Z_M + 0.05);
  box(parts, IRON_DARK, 0.09, 0.09, 0.06, -0.8, 1.28, GATE_LEAF_Z_M + 0.075);
  box(parts, IRON_RUST, 0.2, 0.28, 0.04, -1.62, 1.34, GATE_LEAF_Z_M + 0.06);
  // Draw-bar plate and lock at the meeting stiles.
  box(parts, IRON_DARK, 0.42, 0.5, 0.06, 0, 1.86, GATE_LEAF_Z_M + 0.06);
  box(parts, IRON_RUST, 0.16, 0.16, 0.05, 0, 1.72, GATE_LEAF_Z_M + 0.09);

  // Mashrabiya oriel: latticed timber box on the stone corbels.
  const latticeZ = ORIEL_FRONT_Z_M;
  slab(parts, TIMBER_ROOF, -ORIEL_HALF_W_M, ORIEL_HALF_W_M, ORIEL_BOTTOM_M, ORIEL_BOTTOM_M + 0.14,
    UPPER_RECESS_Z_M, latticeZ);
  slab(parts, TIMBER_ROOF, -ORIEL_HALF_W_M, ORIEL_HALF_W_M, ORIEL_TOP_M - 0.18, ORIEL_TOP_M,
    UPPER_RECESS_Z_M, latticeZ);
  for (const side of [-1, 1] as const) {
    const x = side * ORIEL_HALF_W_M;
    slab(parts, TIMBER_ROOF, x - 0.07, x + 0.07, ORIEL_BOTTOM_M, ORIEL_TOP_M,
      UPPER_RECESS_Z_M, latticeZ);
    for (let index = 0; index < 7; index += 1) {
      const z = UPPER_RECESS_Z_M + 0.12 + index * ((latticeZ - UPPER_RECESS_Z_M - 0.2) / 6);
      slab(parts, TIMBER_LATTICE, x - 0.045, x + 0.045, ORIEL_BOTTOM_M + 0.16, ORIEL_TOP_M - 0.2,
        z, z + 0.035);
    }
  }
  // Front lattice: turned verticals and three rails, all real geometry so the
  // screen throws a broken shadow instead of reading as a printed panel.
  const barCount = 23;
  for (let index = 0; index < barCount; index += 1) {
    const x = -ORIEL_HALF_W_M + 0.14 + index * ((ORIEL_HALF_W_M * 2 - 0.28) / (barCount - 1));
    slab(parts, index % 2 === 0 ? TIMBER_LATTICE : TIMBER_ROOF, x - 0.028, x + 0.028,
      ORIEL_BOTTOM_M + 0.14, ORIEL_TOP_M - 0.18, latticeZ - 0.055, latticeZ);
  }
  for (const railY of [ORIEL_BOTTOM_M + 0.5, ORIEL_BOTTOM_M + 1.06, ORIEL_TOP_M - 0.42]) {
    slab(parts, TIMBER_ROOF, -ORIEL_HALF_W_M + 0.08, ORIEL_HALF_W_M - 0.08, railY, railY + 0.075,
      latticeZ - 0.075, latticeZ + 0.015);
  }
  // Sloped timber roof over the oriel, with rafter ends.
  angledBox(parts, TIMBER_ROOF, ORIEL_HALF_W_M * 2 + 0.3, 0.1, latticeZ - UPPER_RECESS_Z_M + 0.24,
    0, ORIEL_TOP_M + 0.12, (UPPER_RECESS_Z_M + latticeZ) * 0.5 + 0.06, 0);
  for (let index = 0; index < 7; index += 1) {
    const x = -ORIEL_HALF_W_M + 0.2 + index * ((ORIEL_HALF_W_M * 2 - 0.4) / 6);
    box(parts, TIMBER_LATTICE, 0.085, 0.085, 0.22, x, ORIEL_TOP_M + 0.05, latticeZ + 0.1);
  }

  // Two iron lanterns on the gate brackets.
  for (const side of [-1, 1] as const) {
    const x = side * 3.62;
    const top = 3.98;
    box(parts, IRON_DARK, 0.07, 0.1, 0.07, x, top, UPPER_PIER_Z_M + 0.2);
    box(parts, IRON_DARK, 0.035, 0.44, 0.035, x, top - 0.24, UPPER_PIER_Z_M + 0.2);
    box(parts, IRON_DARK, 0.3, 0.06, 0.3, x, top - 0.47, UPPER_PIER_Z_M + 0.2);
    box(parts, LANTERN_GLASS, 0.22, 0.3, 0.22, x, top - 0.65, UPPER_PIER_Z_M + 0.2);
    for (const cornerX of [-1, 1] as const) {
      for (const cornerZ of [-1, 1] as const) {
        box(parts, IRON_DARK, 0.035, 0.32, 0.035,
          x + cornerX * 0.11, top - 0.64, UPPER_PIER_Z_M + 0.2 + cornerZ * 0.11);
      }
    }
    box(parts, IRON_DARK, 0.26, 0.05, 0.26, x, top - 0.82, UPPER_PIER_Z_M + 0.2);
  }

  pushWallServiceFixtures(parts);

  // Two faded pennants on the pishtaq parapet, giving its top a soft edge.
  for (const side of [-1, 1] as const) {
    const x = side * 2.4;
    box(parts, IRON_DARK, 0.05, 1.35, 0.05, x, PISHTAQ_TOP_M + 0.66, UPPER_PIER_Z_M + 0.18);
    for (let index = 0; index < 5; index += 1) {
      const drop = 0.24 + index * 0.13;
      angledBox(parts, index % 2 === 0 ? CLOTH_FADED : CLOTH_PALE,
        0.16, 0.62 - index * 0.06, 0.02,
        x + side * (0.12 + index * 0.15), PISHTAQ_TOP_M + 1.02 - drop, UPPER_PIER_Z_M + 0.18,
        side * (0.06 + index * 0.04));
    }
  }

  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}

/**
 * Unlit voids: the slit windows, the open gallery cells, and the space behind
 * the mashrabiya screen, so the openings read as rooms rather than as panels
 * painted on the wall.
 */
export function createSpawnAGateVoidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    for (const bay of FLANK_BAYS) {
      const centerX = side * (bay.innerX + bay.outerX) * 0.5;
      slab(parts, VOID_DARK, centerX - 0.13, centerX + 0.13, DATUM_SILL_M, SLIT_TOP_M,
        UPPER_RECESS_Z_M - 0.2, UPPER_RECESS_Z_M - 0.15);
    }
  }
  slab(parts, VOID_DARK, -ORIEL_HALF_W_M + 0.1, ORIEL_HALF_W_M - 0.1,
    ORIEL_BOTTOM_M + 0.16, ORIEL_TOP_M - 0.2, UPPER_RECESS_Z_M + 0.06, ORIEL_FRONT_Z_M - 0.09);
  return normalize(applyWorldBoxUv(mergeProceduralGeometry(parts), 2));
}
