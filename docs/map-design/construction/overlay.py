# Design layer for the construction sheets. Everything numeric here is a decision; the skeleton numbers come from the spec.

# ---------------------------------------------------------------- assembly variants per bay
VARIANTS = {
    ('FRONTAGE_SPICE_STREET_WEST', 'STORY_1_WINDOW_01'): 'SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'STORY_1_WINDOW_02'): 'SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'STORY_1_WINDOW_03'): 'SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'STORY_1_WINDOW_04'): 'SH-W woven infill (placed `ASSET_SHUTTER_WOVEN`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'STORY_1_WINDOW_05'): 'SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'GROUND_01'): 'SP-D spice drawers (placed `ASSET_SPICE_DRAWERS`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'GROUND_02'): 'closed household door, south tenancy',
    ('FRONTAGE_SPICE_STREET_WEST', 'GROUND_03'): 'SP-G grain balance (placed `ASSET_GRAIN_BALANCE`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'GROUND_04'): 'SP-A apothecary (placed `ASSET_APOTHECARY`)',
    ('FRONTAGE_SPICE_STREET_WEST', 'GROUND_05'): 'closed household door, north tenancy',
    ('FRONTAGE_SPICE_STREET_EAST', 'GROUND_01'): 'closed sack-store door 1.35 × 2.5 (handcart parked outside)',
    ('FRONTAGE_SPICE_STREET_EAST', 'GROUND_02'): 'blind niche, sill 0.45',
    ('FRONTAGE_SPICE_STREET_EAST', 'GROUND_03'): 'primary closed store door 1.35 × 2.5 with wicket',
    ('FRONTAGE_SPICE_STREET_EAST', 'GROUND_04'): 'closed household door 1.05 × 2.25 (stair to the setback room behind)',
    ('FRONTAGE_SPICE_STREET_EAST', 'GROUND_05'): 'blind niche, sill 0.45',
    ('FRONTAGE_TEXTILE_ARCADE_WEST', 'GROUND_01'): 'RG-H hanging gallery (placed `ASSET_RUG_GALLERY`)',
    ('FRONTAGE_TEXTILE_ARCADE_WEST', 'GROUND_03'): 'RG-R roll chest (placed `ASSET_RUG_ROLL_CHEST`)',
    ('FRONTAGE_TEXTILE_ARCADE_WEST', 'GROUND_04'): 'packing bay (placed `ASSET_B18_PACKING_FINISH`)',
    ('FRONTAGE_TEXTILE_ARCADE_WEST', 'STORY_1_WINDOW_01'): 'SC-V vertical slats (placed `ASSET_TEXTILE_SCREEN_SC_V`)',
    ('FRONTAGE_TEXTILE_ARCADE_WEST', 'STORY_1_WINDOW_03'): 'SC-V vertical slats (placed)',
    ('FRONTAGE_TEXTILE_ARCADE_WEST', 'STORY_1_WINDOW_04'): 'SC-V vertical slats (placed)',
    ('FRONTAGE_TEXTILE_ARCADE_EAST', 'GROUND_01'): 'light-fabric packing bay (placed `ASSET_B18_PACKING_FINISH`); no booth here',
    ('FRONTAGE_TEXTILE_ARCADE_EAST', 'GROUND_03'): 'RG-H hanging gallery (placed `ASSET_RUG_GALLERY`)',
    ('FRONTAGE_TEXTILE_ARCADE_EAST', 'GROUND_04'): 'packing bay (placed `ASSET_B18_PACKING_FINISH`) + cart outside',
    ('FRONTAGE_RUG_GATE_WEST', 'GROUND_01'): 'RG-R roll chest (placed `ASSET_RUG_ROLL_CHEST`)',
    ('FRONTAGE_RUG_GATE_WEST', 'GROUND_02'): 'closed service door (was a shop recess; same bay id)',
    ('FRONTAGE_RUG_GATE_WEST', 'STORY_1_WINDOW_01'): 'SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`)',
    ('FRONTAGE_RUG_GATE_WEST', 'STORY_1_WINDOW_02'): 'dark recess 0.9 × 1.25 (kit window, closed timber leaf)',
    ('FRONTAGE_TEA_TERRACE_EAST', 'STORY_1_WINDOW_01'): 'SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`)',
    ('FRONTAGE_TEA_TERRACE_EAST', 'STORY_1_WINDOW_02'): 'SH-W woven infill (placed `ASSET_SHUTTER_WOVEN`)',
    ('FRONTAGE_TEA_TERRACE_EAST', 'GROUND_01'): 'tea serving recess (brass/porcelain/linen shelves)',
    ('FRONTAGE_TEA_TERRACE_EAST', 'GROUND_02'): 'closed tea-house entry',
    ('FRONTAGE_COVERED_SOUK_WEST', 'GROUND_01'): 'DY-S dye-sample counter (placed `ASSET_B18_DYE_COUNTER`)',
    ('FRONTAGE_COVERED_SOUK_WEST', 'STORY_1_WINDOW_01'): 'SC-C fine crossed lattice (placed `ASSET_SCREEN_SC_C`)',
    ('FRONTAGE_COVERED_SOUK_WEST', 'STORY_1_WINDOW_02'): 'SC-C fine crossed lattice (placed)',
    ('FRONTAGE_COVERED_SOUK_WEST_NORTH', 'GROUND_01'): 'closed trade service door (north wing)',
    ('FRONTAGE_COVERED_SOUK_WEST_NORTH', 'STORY_1_WINDOW_01'): 'SC-C fine crossed lattice (placed)',
    ('FRONTAGE_COVERED_SOUK_EAST', 'GROUND_01'): 'packing bay (placed `ASSET_B18_PACKING_FINISH`)',
    ('FRONTAGE_COVERED_SOUK_EAST', 'GROUND_02'): 'approved textile booth (placed `ASSET_TEXTILE_BOOTH`, untouchable)',
    ('FRONTAGE_COVERED_SOUK_EAST', 'GROUND_03'): 'DY-S dye-sample counter (placed `ASSET_B18_DYE_COUNTER`)',
    ('FRONTAGE_FOUNTAIN_COURT_EAST_NORTH', 'STORY_1_WINDOW_01'): 'SC-C fine crossed lattice (placed `ASSET_SCREEN_SC_C`)',
    ('FRONTAGE_FOUNTAIN_COURT_EAST_NORTH', 'GROUND_01'): 'primary closed household door',
    ('FRONTAGE_FOUNTAIN_COURT_WEST', 'GROUND_01'): 'sealed loggia arch, dark backing',
    ('FRONTAGE_FOUNTAIN_COURT_WEST', 'STORY_1_WINDOW_01'): 'stained clerestory (`stained_glass_panel_001`)',
    ('FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH', 'GROUND_01'): 'closed service door',
    ('FRONTAGE_FOUNTAIN_COURT_EAST', 'GROUND_01'): 'sealed loggia arch, dark backing',
    ('FRONTAGE_DYERS_ALLEY_WEST_N', 'BAY_WINDOW_S'): 'SC-D diamond lattice (placed `ASSET_DYERS_SCREEN_SC_D`)',
    ('FRONTAGE_DYERS_ALLEY_WEST_N', 'BAY_WINDOW_N'): 'SC-D diamond lattice (placed)',
    ('FRONTAGE_DYERS_ALLEY_WEST_N', 'BAY_DOOR'): 'closed household door',
    ('FRONTAGE_NORTH_COURT_WEST', 'GROUND_01'): 'heavy closed hammam door (`ASSET_CC0_LARGE_CASTLE_DOOR` model)',
    ('FRONTAGE_RUG_GATE_EAST', 'BAY_01'): 'closed household door with lantern over',
    ('FRONTAGE_RUG_GATE_EAST', 'BAY_02'): 'dark recess window, planter under',
    ('FRONTAGE_CARAVAN_COURT_WEST', 'BAY_DOOR_S'): 'primary receiving door (closed, cart scuffs)',
    ('FRONTAGE_CARAVAN_COURT_WEST', 'BAY_DOOR_N'): 'second store door (closed)',
    ('FRONTAGE_DYERS_ALLEY_WEST_S', 'BAY_CART_DOOR'): 'handcart work door (closed, dye stains)',
    ('FRONTAGE_SERVICE_NORTH_EAST_SPINE_S', 'GROUND_01'): 'sealed inspection panel 1.35 × 0.85 (flush, sill 0.25)',
    ('FRONTAGE_SERVICE_NORTH_EAST_SPINE_S', 'GROUND_02'): 'sealed inspection panel 1.35 × 0.85 (flush, sill 0.25)',
    ('FRONTAGE_FOUNTAIN_COURT_WEST', 'UPPER1_01'): 'SUPPRESSED: not built (old-brief extra stained window; dormant binding)',
    ('FRONTAGE_FOUNTAIN_COURT_WEST', 'UPPER1_02'): 'SUPPRESSED: not built (old-brief extra stained window; dormant binding)',
    ('FRONTAGE_FOUNTAIN_COURT_WEST', 'UPPER2_01'): 'SUPPRESSED: not built (no third floor; dormant binding)',
    ('FRONTAGE_FOUNTAIN_COURT_WEST', 'UPPER2_02'): 'SUPPRESSED: not built (no third floor; dormant binding)',
    ('FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH', 'BAY_01'): 'SUPPRESSED: the door occupies this axis; no niche',
    ('FRONTAGE_NORTH_COURT_WEST_SOUTH', 'BAY_01'): 'SUPPRESSED: the door occupies this axis; no niche',
    ('FRONTAGE_SERVICE_NORTH_EAST_SPINE_S', 'STORY_1_WINDOW_01'): 'SUPPRESSED: no vents on the retaining screen (dormant binding)',
    ('FRONTAGE_SERVICE_NORTH_EAST_SPINE_S', 'STORY_1_WINDOW_02'): 'SUPPRESSED: no vents on the retaining screen (dormant binding)',
    ('FRONTAGE_SERVICE_NORTH_EAST_SPINE_S', 'STORY_1_WINDOW_03'): 'SUPPRESSED: no vents on the retaining screen (dormant binding)',
    ('FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID', 'STORY_1_WINDOW_01'): 'SUPPRESSED: two niches only (dormant binding)',
    ('FRONTAGE_SPAWN_A_NORTH_WEST', 'BAY_01'): 'SUPPRESSED: hidden behind the return kit',
    ('FRONTAGE_SPAWN_A_NORTH_EAST', 'BAY_01'): 'SUPPRESSED: hidden behind the return kit',
}

# sill/head for code-owned dogleg walls (from the deleted schedule)
CODE_SH = {
    ('BLD_DYE_WORKS_GATE', 'EXISTING_NORTH_GATE'): 'retained repaired blind gate (M04 measures outer frame)',
    ('BLD_DYE_WORKS_GATE', 'VENT_S'): '4.15 / 4.63',
    ('BLD_DYE_WORKS_GATE', 'VENT_AXIS'): '4.15 / 4.63',
    ('BLD_DOGLEG_HOUSE', 'HOUSE_DOOR'): '0 / 2.25',
    ('BLD_DOGLEG_HOUSE', 'UPPER_S'): '4.15 / 5.40',
    ('BLD_DOGLEG_HOUSE', 'UPPER_AXIS'): '4.15 / 5.40',
    ('BLD_DOGLEG_HOUSE', 'UPPER_N'): '4.15 / 5.40',
    ('BLD_DOGLEG_HOUSE', 'WINDOW_S'): '1.0 / 2.25',
    ('BLD_DOGLEG_HOUSE', 'WINDOW_N'): '1.0 / 2.25',
}

# ---------------------------------------------------------------- placement dispositions (default KEEP)
PLACEMENTS = {
    'ASSET_TEXTILE_BOOTH': 'KEEP exactly (user-approved at this location; never move, scale or re-export)',
    'ASSET_SPAWN_A_GATE': 'KEEP (landmark kit; the GLB facades stop at its abutments)',
    'ASSET_SPICE_GATE': 'KEEP (landmark kit; corner returns belong to the two Spice owners)',
    'ASSET_HERO_ARCH': 'KEEP (landmark kit; abutments, soffit and crown are one composition)',
    'ASSET_SPAWN_A_WEST_BACKS': 'KEEP (retained kit; three domestic rear parcels)',
    'ASSET_SPAWN_A_EAST_DYE_WORKS': 'KEEP (retained kit)',
    'ASSET_SPAWN_A_EXIT_WEST_RETURN': 'KEEP (corner front of the west Spice block)',
    'ASSET_SPAWN_A_EXIT_EAST_RETURN': 'KEEP (corner front of the east Spice block)',
    'ASSET_COVER_GOODS': 'KEEP (gameplay cover; silhouette and collider protected)',
    'ASSET_SPAWN_COVER': 'KEEP (gameplay cover)',
    'ASSET_FOUNTAIN': 'KEEP (landmark; 3 m footprint at (24.5, 43.5))',
    'ASSET_PALM': 'KEEP (silhouette marker)',
    'PLACE_SPICE_SIGNS_SPICE_W_SIGN_1': 'KEEP; the GLB adds the two bracket stubs behind it (SD-09)',
    'PLACE_SPICE_SIGNS_SPICE_W_SIGN_3': 'KEEP; the GLB adds the two bracket stubs behind it (SD-09)',
    'PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_1': 'KEEP (moved 2026-09-07 to z 3.67, board 0.30 high: above the arch crown 3.55, 0.08 under the screen frame; waiver CW-D8602E151B6B retired)',
    'PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_1': 'KEEP (moved 2026-09-07 to z 3.67, board 0.30 high; both faces share one sign datum)',
    'PLACE_RUG_SIGNS_RUG_W_SIGN_1': 'KEEP (moved 2026-09-07 to z 3.10, board 0.30 high; clears the sill course 3.50 by 0.10; waiver CW-D82E53BBDABD retired)',
    'PLACE_DYERS_SIGNS_DYE_W_SIGN_1': 'KEEP (moved 2026-09-07 to z 3.67, board 0.30 high: above the crown 3.55, under the screen frame 4.05)',
    'PLACE_DYERS_SIGNS_DYE_E_SIGN_1': 'KEEP (moved 2026-09-07 to z 3.80, board 0.30 high: 0.16 above the booth top 3.64, 0.24 under the coping 4.34)',
    'PLACE_DYERS_SIGNS_DYE_E_SIGN_2': 'KEEP (moved 2026-09-07 to z 3.67, board 0.30 high)',
    'PLACE_TEA_SIGNS_TEA_E_SIGN_1': 'KEEP (z 4.45 absolute = 3.05 over the 1.4 terrace; sits under the 5.08 sill)',
    'PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST': 'KEEP (route sign)',
    'PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST': 'KEEP (route sign)',
    'PLACE_L3R0_NORTH_EXIT_SIGN_L3R0_NORTH_EXIT_SIGN_01': 'KEEP (route sign)',
    'PLACE_SPICE_BARREL_COVER_SPICE_01': 'KEEP; the barrel overlaps the cover core by design (waiver CW-7599CB836F04 stays)',
    'PLACE_DYERS_CANOPY_CANOPY_DYERS_01': 'KEEP (raised 2026-09-07 to 5.90 at both ends: west on a ledger above the north-wing screen, east on a new roof tie; waiver CW-CCAEF9D05D21 retired)',
    'PLACE_L3R0_NORTH_DYERS_LINE_L3R0_NORTH_DYERS_LINE_01': 'KEEP (shifted 2026-09-07 to y 75.3; garments clear the hammam window at y 73.55..74.45; waiver CW-1AD31D32494E retired)',
    'PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_EAST': 'KEEP (shifted 2026-09-07 to y 43.8, out of the north-wing door floor; waiver CW-A0FABA3DAE26 retired)',
    'PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01': 'KEEP (shifted 2026-09-07 by 0.65 m south to y 62.0, out of the entry door service floor; waiver CW-F70D65F7D790 retired)',
    'PLACE_FOUNTAIN_PALM_PALM_FOUNTAIN_01': 'KEEP (fronds near the stained window are real-life plausible; waiver CW-216C7CBF937B stays)',
    'PLACE_B4_SPICE_COVER_RUG_COVER_SPICE_01': 'KEEP (gameplay cover cluster; waiver CW-13333D7BED23 stays)',
}

# ---------------------------------------------------------------- common completion checks
COMMON_CHECKS = [
    '`pnpm map:check` passes with no new reasons; `[section-models]`, `[facade-models]` and `[authored-placements]` print no warnings.',
    'Every opening in the bay tables exists in the GLB at its `a`, sill and head; nothing else opens the wall.',
    'Every placed asset in section 4 still sits in a rebate or on a floor the GLB provides (no shutter floating in front of plaster, no counter clipping a jamb).',
    'No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.',
    'Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.',
    'Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.',
    'Plinth, course and coping run the full wall and turn the solid corners; coping matches the neighbour where the same building continues.',
    'Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.',
    'Worst view of `pnpm map:shoot` stays inside the budget (1,500 draws / 2.2 M tris / 12.5 ms).',
    'Fresh-eyes verdict passes all three tiers on every view; a fail is another round.',
]

# ---------------------------------------------------------------- defaults
def default_datums(b, wall, mas, gh):
    top = mas['heightM']
    relief = mas['id'] in ('MASSING_FRONTAGE_RELIEF', 'MASSING_SERVICE_SPINE')
    plinth = 0.44 if relief else 0.28
    course = f"{gh + 0.65:.2f}" if gh else '2.90'
    return f"plinth 0..{plinth} m (SD-01); string course centred {course} m (SD-02); coping {top - 0.16:.2f}..{top:.2f} m (SD-03); parapet above per massing."

def default_tasks(b, f, wall, gh):
    t = b['type']
    L = wall.get('lengthM', 0) if wall else 0
    tasks = []
    tasks.append(f"KEEP the wall shell and roofline (runtime); CREATE the face GLB from `facade_kit` with skin, plinth, course and coping per the datums above; completion: the face reads as one {t} in the profile materials with no runtime kit modules left visible.")
    for bay in (wall['bays'] if wall else []):
        m = bay['module']
        if m == 'blind_niche':
            tasks.append(f"CREATE `{bay['id']}` niche 1.05 × 1.8 at a={bay['alongM']:.2f} m: 0.16 m stone jambs and 0.20 m head, 0.14 m deep, dark plaster back (`ph_worn_plaster_ochre`), sill per table; completion: reads as a bricked-up opening, never a door.")
        elif m.startswith('door'):
            tasks.append(f"CREATE `{bay['id']}` closed door at a={bay['alongM']:.2f} m per SD-05 (stone jambs 0.14, head 0.14, threshold 0.06 flush with paving, iron strap hinges, ring pull); completion: reads closed and hinged, threshold flush, 0.8 m clear service floor in front stays empty.")
        elif m == 'vent_service':
            tasks.append(f"CREATE `{bay['id']}` vent 0.58 × 0.48 at a={bay['alongM']:.2f} m, sill per table, timber grille 0.03 bars, deep dark back; completion: grille reads, no light bleed.")
        elif m.startswith('window'):
            tasks.append(f"CREATE `{bay['id']}` window at a={bay['alongM']:.2f} m per SD-06 (frame 0.10, sill 0.06 proud, closed shutters or dark closure per variant); completion: full frame and sill, closure visibly shut.")
        elif m.startswith('pilaster'):
            tasks.append(f"CREATE `{bay['id']}` grounded pilaster 0.42 wide × 0.24 proud, full scheduled height at a={bay['alongM']:.2f} m; completion: touches the ground and the head.")
        elif m == 'inspection_panel':
            tasks.append(f"CREATE `{bay['id']}` flush sealed panel 1.35 × 0.85 at a={bay['alongM']:.2f} m, sill 0.25: 0.035 m timber board in a 0.06 stone frame, no depth behind; completion: reads as a sealed hatch, not an entry.")
    if t in ('compound wall', 'service back'):
        tasks.append("CREATE one drain spout (SD-13) at the a-position given in the wall note or, if none, at 0.6 m from the a=L end, with the SD-12 streak below; completion: one spout, one stain, nothing else on the field.")
    tasks.append("APPLY wear per SD-12 for this type; completion: base band continuous, no wear above 1.5 m except sun bleach.")
    return tasks

def default_ground(zids):
    return ("KEEP the authored floor material and grade (protected). Finish: flush material seams at the zone boundaries listed in section 2 (no sills, curbs or steps); contact wear 0.25 m wide along every wall base and around every placed prop footprint; traffic polish along the route centreline; no sand mounds, grates or trenches. Dressing footprints stay inside the 0.35 m wall band except the scheduled cover clusters.")

# ---------------------------------------------------------------- per-wall design layer
AWN = "SD-08 awning: timber ledger 0.08 × 0.08 at z {z:.2f} spanning a={a0:.2f}..{a1:.2f}, projection {p:.2f} m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `{cloth}`"

WALLS = {
'FRONTAGE_SPICE_STREET_WEST': {
    'datums': "plinth 0..0.28 m sandstone (SD-01); awning ledger datum 2.85 m; continuous sill course 3.50..3.62 m under the five shutters (SD-02 variant); wall top 7.0 with coping 6.84..7.0; S1 parcel roofs above (section 7).",
    'tasks': [
        "CREATE the face GLB (`facade_kit`): skin `ph_painted_plaster_warm` 0..7.0, plinth `ph_sandstone_blocks_05` 0..0.28 × 0.14 proud, sill course `ph_stone_trim_sandstone` 3.50..3.62 × 0.10 proud, coping 6.84..7.0 × 0.18 proud, parcel joints as 0.02 m plaster steps at a=6.12 and a=11.88 (between bays, never through a frame). Corners are `open`: the return kits own both ends, so no end pilasters. Completion: one plaster field with three legible parcels.",
        "CREATE three shop recesses `GROUND_01/03/04` 2.4 wide × 2.7 high × 1.35 deep at a=1.80/7.56/10.44: stone jambs 0.22 × 0.29 proud in 8 courses of 0.31, stone lintel 2.9 wide × 0.25 at head 2.7, timber head beam 0.17 under it, dark timber back at depth 1.35, floor 0.08 m timber deck (the placed counters sit at z 0.08). Leave the recess empty: the counters `ASSET_SPICE_DRAWERS` (a=1.80), `ASSET_GRAIN_BALANCE` (a=7.56) and `ASSET_APOTHECARY` (a=10.44) are placed assets 1.72 × 0.50 × 1.70 against the back plane. Completion: each counter sits inside its recess with 0.34 m of reveal either side and its top shelf under the head beam.",
        "CREATE two closed household doors `GROUND_02/05` 1.15 × 2.7 at a=4.68 and a=13.32 per SD-05: eight vertical planks `ph_rough_pine_door`, two iron straps, ring pull at 1.05 m, stone jambs 0.14, threshold flush. Completion: both read as house doors, not shop doors; nothing stands within 0.8 m in front.",
        "CREATE five upper window rebates `STORY_1_WINDOW_01..05` 1.6 × 1.65 at sill 3.68 / head 5.33 on the five axes: stone frame 0.10 all round, sill slab 0.06 high × 0.08 proud sitting on the sill course, reveal 0.135 deep, dark plaster back. Do NOT model shutters: the placed `ASSET_SHUTTER_*` assets (SH-L / SH-P / SH-L / SH-W / SH-P at z 3.68) fill the rebates. Completion: every shutter sits inside its frame with the sill under it, none floats in front of plaster.",
        AWN.format(z=2.85, a0=0.55, a1=3.05, p=1.10, cloth='ph_hessian_230') + " over `GROUND_01`; same over `GROUND_03` (a=6.31..8.81) and `GROUND_04` (a=9.19..11.69). No awning over the doors. Completion: three awnings, hems at 2.48 m, brackets bear on the jamb stones, cloth clears the sign boards.",
        "CREATE sign brackets (SD-09) behind the two placed boards `SPICE_W_SIGN_1` (a=1.80, z 3.20..3.50) and `SPICE_W_SIGN_3` (a=7.56): two 0.06 × 0.06 timber stubs 0.18 proud at ±0.9 m of the axis, z 3.35. No sign on `GROUND_04` (goods identify it). Completion: both boards visibly hang from brackets.",
        "KEEP goods: `PLACE_SPICE_COVER_*` cluster at (23.0, 27.6) is gameplay cover; `BPL16_SPICE_W_STOCK_GROUND_02` and `B4_SPICE_W_CRATES_GROUND_04` anchors stay dormant (no new floor stock). Completion: nothing on the paving in front of this wall except the cover cluster.",
        "APPLY wear (SD-12): dirt band 0..1.5 m; hand polish on the door jambs 0.9..1.4 m; spice dust staining 0..0.4 m under the three recesses only; sun bleach on the upper field (this face looks east, morning sun): light. Completion: wear differs between the three shops and the two doors.",
        "KEEP the S1 parcel roofs already placed (`ASSET_SPICE_ROOF_SOUTH/MIDDLE/NORTH` at x 18.60, z 7.0: caps 8.79 / 9.59 / 8.19) and the three `ASSET_ROOF_TIE_*` supports on the east side. Completion: the GLB coping meets the roof-asset bases without a gap or a double slab.",
    ],
    'reality': "Three spice tenancies each have a counter recess with a lockable timber back and a stair to the room above (upper shutters over every axis); the two plain doors are the households' street doors, one per end so each family has its own entrance. Awnings shade the counters facing the morning sun; the doors need none.",
},
'FRONTAGE_SPICE_STREET_EAST': {
    'datums': "plinth 0..0.28 m; string course 2.90 m (heads 2.25); coping 4.34..4.5 m; parapet cap 5.59 (baseline); the S1 setback room sits behind the north half (section 7).",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05` 0..4.5 (coursed stone, quiet side), plinth 0..0.28, string course 2.84..2.96 × 0.10, coping 4.34..4.50 × 0.18; corners `held`: two end piers 0.45 × 0.16 full height at a=0.225 and a=14.895. Completion: reads as a low stone wholesale row, one material family, no plaster.",
        "CREATE two closed sack-store doors `GROUND_01/03` as `door_storage_heavy` 1.35 × 2.5 at a=1.125/7.56 (double leaves `ph_weathered_brown_planks`, three iron straps, bumper rail 0.35, threshold flush; a handcart needs the width) and one closed household door `GROUND_04` as `door_residential_timber` 1.05 × 2.25 at a=10.777 (the stair to the setback room). `GROUND_03` is the primary store door: add a 0.35 × 0.35 iron-grille wicket at 1.5 m. `GROUND_01` gets cart scuffs 0..0.6 on both jambs. Piers between bay edges stay ≥ 1.67 m. Completion: two wide store doors and one narrow house door, all closed.",
        "CREATE two blind niches `GROUND_02/05` 1.05 × 1.8, sill 0.45, at a=4.343/13.995 (SD-18). Completion: read as bricked-up openings.",
        "KEEP the wall-base stock at the four `SPICE_E_WALLBASE_STOCK_*` anchors (crates, sacks, baskets, pots at x≈32.1..32.3) and the handcart at (31.88, 16.57). Add nothing. Completion: all stock within 0.9 m of the wall; the 0.8 m door floors in front of a=1.125/7.56/10.777 stay empty (the cart is 0.9 m north of `GROUND_01`, keep it there).",
        "No awnings, no signs on this face (quiet side). Completion: none exist.",
        "KEEP the five roof-tie supports `ASSET_ROOF_TIE_*` at x 34.88 (z 5.48..5.59) that receive the canopies and lines; the GLB coping must pass under their feet. Completion: every tie foot bears on coping or parapet, none floats.",
        "APPLY wear: dirt band; cart scuffs at `GROUND_01`; drip streak from the two tie feet nearest the doors; strong sun bleach on the upper stone (this face looks west, afternoon sun). Completion: as listed.",
        "KEEP the S1 setback room `ASSET_SPICE_UPPER_ROOM` at (35.70, 27.28, 4.76) (roof 7.0, cap 7.71, two closed windows at y 25.8 / 28.1, sill 5.40). Completion: the room's base sits on the 4.76 slab with no gap.",
    ],
    'reality': "Wholesale sack stores: three plain doors, no windows at street level (stock, not living), stock waiting outside for the cart. A household lives in the setback room at the north end and reaches it by the stair behind `GROUND_04`.",
},
'FRONTAGE_FOUNTAIN_COURT_WEST': {
    'datums': "plinth 0..0.28 sandstone; arch impost band 3.10 m; sill course 4.97..5.09 under the clerestory; coping 9.34..9.5; parapet +0.85.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05` full height, plinth 0..0.28, impost band `ph_stone_trim_white` 3.04..3.16 × 0.08 across the whole face, sill course 4.97..5.09, coping 9.34..9.50 × 0.18; corners `held`: end piers 0.60 wide × 0.16 proud full height at both ends. Completion: one tall pale civic face, no plaster.",
        "CREATE `GROUND_01` sealed hero arch 4.2 × 4.85 at a=2.86 (pointed, ring 0.25 `ph_stone_trim_white`, depth 0.50): dark plaster back 0.5 m in, a 0.06 stone threshold flush with paving, and a carved band 0.30 high at 4.95..5.25 over the crown (three repeated rosettes 0.20; this closes the spec's `inscription_band` need; the `raised_parapet` need is closed as rejected: the parapet stays +0.85). Do not open it. Completion: reads as the madrasa's sealed loggia; the threshold rug `B4_FOUNTAIN_W_RUG_GROUND_01` at (21.10, 43.86) lies centred in front of it.",
        "CREATE `STORY_1_WINDOW_01` stained clerestory 1.2 × 1.75 at sill 5.15 / head 6.90, a=2.86: stone frame 0.12, pointed head, `stained_glass_panel_001` panel 0.03 behind a timber lattice of 0.02 bars at 0.15 pitch; no second or third window (old brief rejected). Completion: one glazed opening reads from the court floor.",
        "No awning, sign, balcony or goods. KEEP planter `B7_FOUNTAIN_PLANTER_WEST` (21.15, 41.90) and the market spill cluster at (21.35, 37.10) which belong to the court. Completion: none added.",
        "APPLY wear: minimal; dust band 0..0.8, one water streak from the coping at a=0.4 (a spout SD-13 at a=0.4), hand polish either side of the arch at 1.0..1.4 m. Completion: as listed.",
    ],
    'reality': "A madrasa presents one grand sealed arch to the court and lights its hall from a high stained window; the students enter from the service wing, not the court.",
},
'FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH': {
    'datums': "plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 9.34..9.5. Same building as the main face: same coping height, same parapet.",
    'tasks': [
        "CREATE the face GLB: skin `ph_beige_wall_002` (the wing is plastered, the hall is stone: the correlated difference), plinth sandstone 0..0.28, course 2.84..2.96, sill course 4.97..5.09, coping 9.34..9.50; end piers 0.45 × 0.16 both ends (`held`). Completion: plaster wing reading as part of the stone hall.",
        "CREATE `GROUND_01` closed service door 1.05 × 2.25 at a=1.36 (SD-05), timber `ph_rough_pine_door`, iron straps, threshold flush. Completion: closed, hinged.",
        "CREATE `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.36: frame 0.10, 0.28 deep, closed dark timber leaf. Suppress the old `STORY_2_WINDOW_01` (no third floor). Completion: one window only.",
        "APPLY wear: dust band, polish at the door jambs. No awning, sign or goods. Completion: as listed.",
    ],
    'reality': "The madrasa's back-of-house: one service door and one window to the stair. Nothing to sell.",
},
'FRONTAGE_FOUNTAIN_COURT_EAST': {
    'datums': "plinth 0..0.28; impost band 3.04..3.16; sill course 4.97..5.09; coping 6.84..7.0; parapet +0.75.",
    'tasks': [
        "CREATE the face GLB: skin `ph_beige_wall_002`, plinth sandstone, impost band, sill course, coping per datums; corners `held`: end piers 0.60 × 0.16. Completion: warm plaster block facing the pale madrasa (deliberate contrast across the court).",
        "CREATE `GROUND_01` sealed loggia arch 4.2 × 4.85 at a=2.86 with ring 0.25 `ph_stone_trim_sandstone`, dark back at 0.5 m, flush threshold; rug `B4_FOUNTAIN_E_RUG_GROUND_01` at (34.90, 36.14) lies in front. Completion: sealed, no passage implied.",
        "CREATE `STORY_1_WINDOW_01/02` dark recesses 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.05 and a=4.67 (a mirrored pair about the arch axis): frame 0.10, 0.28 deep, closed dark leaves. No balcony (old 2.4 m balcony rejected: no access). Completion: a pair, symmetric about a=2.86.",
        "No awning, sign or goods on the court face. KEEP `B7_FOUNTAIN_PLANTER_EAST` (34.55, 44.25), the tea spill table and stools at (33.55, 41.6) and the cover cluster at (33.8, 35.2). Completion: none added.",
        "APPLY wear: dust band, one spout SD-13 at a=5.3 with streak, polish on the arch jambs. Completion: as listed.",
    ],
    'reality': "A merchant's house shows the court a formal loggia and two upper windows; the family's door is round the corner on the north wing, the trade is on the Souk side.",
},
'FRONTAGE_FOUNTAIN_COURT_EAST_NORTH': {
    'datums': "plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 6.84..7.0.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05` (stone wing against the plaster hall: correlated difference), plinth, course 2.84..2.96, sill course, coping 6.84..7.0, end piers 0.45 both ends. Completion: as datums.",
        "CREATE `GROUND_01` primary household door 1.05 × 2.25 at a=1.36 (SD-05) with a 0.30 stone step flush, ring pull, iron studs; a lantern bracket (SD-10) at z 3.8, 0.35 proud, 0.6 m south of the axis for a future `ASSET_CC0_LANTERN` (not placed today; leave the bracket). Completion: door reads as the family entrance.",
        "CREATE `STORY_1_WINDOW_01` rebate 1.0 × 1.4 at sill 5.15 / head 6.55, a=1.36: frame 0.10, reveal 0.135; the placed `ASSET_SCREEN_SC_C` (`CENTRAL_SCREEN_COURT` at (36.02, 45.36, 5.15)) fills it. Completion: screen sits in the rebate.",
        "APPLY wear: dust band, polish at the door. No awning, sign, goods. Completion: as listed.",
    ],
    'reality': "The merchant family's own door, one screened window above for the women's room. The north wing is the only wing this door serves (the passage cuts the block).",
},
'FRONTAGE_TEXTILE_ARCADE_WEST': {
    'datums': "plinth 0..0.28; arch impost 1.93 m (spring of the 2.6 arches); sign band 3.67..3.97; no continuous sill course on arcades (each screen has its own SD-06 sill at 4.09); coping 6.84..7.0; S2 roofs above (section 7).",
    'tasks': [
        "CREATE the face GLB: skin `ph_aged_plaster_ochre` 0..7.0, plinth sandstone 0..0.28, impost band `ph_stone_trim_sandstone` 1.87..1.99 × 0.06 between the arches only, no continuous sill course, coping 6.84..7.0; end piers 0.60 × 0.16 both ends. Completion: ochre arcade with three arches and one pier reading as one rhythm.",
        "CREATE three sealed display arches `GROUND_01/03/04` 2.6 × 3.55 pointed at a=1.90/8.327/11.54 (kit `arch`, ring 0.18 stone, depth 0.42): stone jambs, dark timber back at 0.42, floor deck at 0.14 (the placed displays mount at z 0.14). Leave the arch interiors empty: `ASSET_RUG_GALLERY` (a=1.90), `ASSET_RUG_ROLL_CHEST` (a=8.327) and `ASSET_B18_PACKING_FINISH` (a=11.54) are placed. Completion: each display sits inside its arch, 0.55 m reveal either side.",
        "CREATE `GROUND_02` grounded column 0.42 × 0.42 × 3.55 at a=5.113 with a 0.10 capital and 0.08 base (the irregular intervening column; keep it). Completion: touches ground and impost band.",
        "CREATE three screen rebates `STORY_1_WINDOW_01/03/04` 1.0 × 1.4 at sill 4.15 / head 5.55 over the three arches (a=1.90/8.327/11.54): frame 0.10, reveal 0.135; placed `ASSET_TEXTILE_SCREEN_SC_V` fill them. No window over the column. Completion: three screens seated, none over `GROUND_02`.",
        AWN.format(z=3.00, a0=0.45, a1=3.35, p=1.20, cloth='ph_hessian_230') + " over `GROUND_01` (ledger spans pier to pier in front of the arch, brackets on the piers at z 2.55); same over `GROUND_03` (a=6.88..9.78) and `GROUND_04` (a=10.09..12.99). Completion: three awnings, hems 2.63 m, the upper third of each arch visible above the cloth.",
        "CREATE sign brackets for `TEXTILE_W_SIGN_1` only (a=1.90, board at z 3.67..3.97) at z 3.82, ±0.9. `TEXTILE_W_SIGN_2` stays dormant. Completion: one sign, hung from brackets, clear of the screen sill.",
        "KEEP dormant anchors `B4_TEXTILE_W_RUG_GROUND_01`, `BPL16_TEXTILE_W_STALL_GROUND_04` (no floor stock, no loose rugs). Completion: paving in front of the arcade empty.",
        "APPLY wear: dust band; polish on the arch jambs 0.9..1.4; textile dye drips 0..0.3 under `GROUND_01`; sun bleach light (faces east). Completion: as listed.",
        "CREATE S2 roof (section 7): south parcel a=0..7.52 roof base 7.0, cap 8.19 (the massing parapet); north parcel a=7.52..13.44 stepped up: `upper_room` from the kit a=7.52..13.44, z0 7.0, height 1.4, depth 4.0, setback 0.75, coping at 8.40, parapet to 9.59 as a 0.26 slab + 0.75 parapet + 0.18 coping. Completion: from Fountain Court the north half reads taller than the south half; no double slab with the Tea house behind (shared volume: this GLB owns the strip a≥7.52 up to x 19.0 only).",
    ],
    'reality': "Three rug dealers under one arcade share a common back store reached from behind; each shows stock in its arch and lives above behind a slatted screen. The column marks where two older buildings were joined.",
},
'FRONTAGE_TEXTILE_ARCADE_EAST': {
    'datums': "plinth 0..0.28; impost 1.93; sign band 3.67..3.97; coping 4.34..4.5; parapet cap 5.59 (baseline, S2 keeps it low).",
    'tasks': [
        "CREATE the face GLB: skin `ph_painted_plaster_warm` 0..4.5, plinth sandstone, impost band between arches, coping 4.34..4.5; end piers 0.60 × 0.16. Completion: the low lime arcade opposite the tall ochre one.",
        "CREATE three arches `GROUND_01/03/04` 2.6 × 3.55 at a=1.90/8.327/11.54 as on the west face; column `GROUND_02` at a=5.113. Interiors empty for the placed assets: `ASSET_B18_PACKING_FINISH` at a=1.90 (light-fabric packing; no second textile booth on this map: the approved booth stays unique to the Souk), `ASSET_RUG_GALLERY` at a=8.327, `ASSET_B18_PACKING_FINISH` at a=11.54. Completion: three arches, two trades read differently from the west face.",
        "No upper windows (single storey). No balcony. Completion: none.",
        AWN.format(z=3.00, a0=0.45, a1=3.35, p=1.20, cloth='ph_hessian_230') + " over `GROUND_01`, the same over `GROUND_03` (a=6.88..9.78) and `GROUND_04` (a=10.09..12.99). Completion: three awnings, hems 2.63 m.",
        "CREATE sign brackets for `TEXTILE_E_SIGN_1` (a=1.90, board at z 3.67..3.97) at z 3.82, ±0.9. `TEXTILE_E_SIGN_2` stays dormant; `GROUND_03/04` are identified by their goods. Completion: one sign.",
        "KEEP the cart `PLACE_B4_TEXTILE_CART_*` at (33.95, 60.82) and the cover cluster at (32.6, 58.2). Completion: nothing else on the paving.",
        "KEEP the two roof ties `ASSET_ROOF_TIE_610/490` at x 36.88 (z 5.59 / 4.83); coping passes under them. APPLY wear: dust band, polish on jambs, strong sun bleach (faces west). Completion: as listed.",
    ],
    'reality': "The cheaper side of the street: single storey, light fabrics and packing, stock arrives by the cart parked at the north bay.",
},
'FRONTAGE_RUG_GATE_WEST': {
    'datums': "plinth 0..0.28; awning ledger 2.85; sign 3.10..3.48; sill course 3.50..3.62; coping 6.84..7.0; parapet +0.75.",
    'tasks': [
        "CREATE the face GLB: skin `ph_plastered_wall`, plinth sandstone, sill course 3.50..3.62, coping 6.84..7.0; corners `open` (south: the Textile arcade continues; north: the gate abutment): no end pilasters, but a 0.16 quoin strip at a=6.88 where the gate kit meets. Completion: the merchant house reads as the last shop before the gate.",
        "CREATE `GROUND_01` shop recess 2.4 × 2.7 × 1.35 at a=1.80 (as Spice); interior empty for the placed `ASSET_RUG_ROLL_CHEST` at (20.84, 66.92, 0.08). Completion: chest inside the recess.",
        "REPLACE `GROUND_02` (was a shop recess) with a closed shop-service door 1.15 × 2.7 at a=5.08 per SD-05 (`ph_rough_pine_door`, straps). The old shop dressings under this bay stay suppressed. Completion: door reads closed; the `RUG_W_SHOP_2` collision anchor is untouched.",
        "CREATE `STORY_1_WINDOW_01` rebate 1.6 × 1.65 at sill 3.68 / head 5.33 over a=1.80 for the placed `ASSET_SHUTTER_PANELED` (z 3.68); CREATE `STORY_1_WINDOW_02` dark recess 0.9 × 1.25 at sill 3.68 / head 4.93 over a=5.08 with a closed dark leaf. Completion: two different upper closures.",
        AWN.format(z=2.85, a0=0.55, a1=3.05, p=1.10, cloth='ph_hessian_230') + " over `GROUND_01` only. Completion: one awning, hem 2.48.",
        "CREATE sign brackets for `RUG_W_SIGN_1` (a=1.80, board at z 3.10..3.40) at z 3.25, ±0.9. `RUG_W_SIGN_2` stays dormant. Completion: the board clears the shutter sill by 0.10.",
        "KEEP `COVER_RUG_01` cluster at (23.0, 68.2). Nothing else on the paving; the door approach (0.8 m) and the gate abutment corner stay empty. Completion: as stated.",
        "APPLY wear: dust band, polish at both openings, light bleach. Completion: as listed.",
    ],
    'reality': "One rug merchant with his display, his locked service door and two upper rooms; the last shop before the city gate, so no second stall crowds the portal.",
},
'FRONTAGE_RUG_GATE_EAST': {
    'datums': "plinth 0..0.28; string course 2.90; coping 4.34..4.5; parapet +0.65.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course 2.84..2.96, coping 4.34..4.5; corners `held`: end piers 0.45 × 0.16. Completion: a low stone house beside the gate.",
        "CREATE `BAY_01` closed door 1.05 × 2.25 at a=1.775 (SD-05) with a lantern bracket (SD-10) centred over the head at z 2.55, 0.35 proud, carrying the placed `ASSET_CC0_LANTERN` (`LANTERN_RUG_01` at (33.75, 74.44, 3.65)): move nothing, make the bracket reach the lantern's hook. Completion: lantern hangs from a bracket on the wall, not in the air.",
        "CREATE `BAY_02` dark recess window 0.9 × 1.25 at sill 1.0 / head 2.25, a=3.18, closed dark leaf and a 0.06 sill; the bound `ASSET_COURT_PLANTER` (1.05 × 1.05 × 1.2, procedural id `bazaar_court_planter`) is not placed today: ADD it through `placements[]` as a GLB built in `build.py` from the same envelope, at (33.3, 75.18, 0), yawDeg 0. Completion: planter under the window, 0.2 m off the wall, outside the 0.8 m door floor.",
        "APPLY wear: dust band, polish at the door. No awning, sign, shop or goods. Completion: as listed.",
    ],
    'reality': "The gatekeeper's one-room house: a door with a lantern for the night watch, one window, nothing to sell.",
},
'FRONTAGE_RUG_GATE_EAST_SOUTH': {
    'datums': "plinth 0..0.28; string course 2.90; coping 4.34..4.5.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05` (cut stone against the rubble stone of the main face: the validator's adjacent-material rule), plinth, course, coping continuous with the main face at 4.5. Completion: same coping height across the link.",
        "CREATE `BAY_01` grounded pilaster 0.42 × 0.24 × 3.4 at a=0.94 (SD, full height, not a bollard). Completion: touches ground and the course.",
        "APPLY wear: dust band only. Nothing else: no niche, door, window or goods. Completion: as listed.",
    ],
    'reality': "The blank flank of the same house on the other side of the link passage.",
},
'FRONTAGE_CARAVAN_COURT_WEST': {
    'datums': "plinth 0..0.28; one continuous storage head at 2.5 (the doors' lintel line runs the full length as a 0.20 stone band 2.50..2.70); coping 4.34..4.5; parapet +0.65.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, continuous lintel band `ph_stone_trim_white` 2.50..2.70 × 0.08 the full length, coping 4.34..4.5; corners `held`: end piers 0.45 × 0.16. Completion: one storage-yard head across five bays.",
        "CREATE two heavy store doors `BAY_DOOR_S/N` 1.35 × 2.5 at a=4.815/10.305: double leaves `ph_weathered_brown_planks`, three iron straps each, a 0.6 m timber bumper rail at 0.35 m across each door (cart protection), threshold 0.06 flush. `BAY_DOOR_S` is the receiving door: heavier scuffs. Completion: two identical closed store doors, the south one more worn.",
        "CREATE three blind niches `BAY_NICHE_S/AXIS/N` 1.05 × 1.8 at sill 0.70, a=2.07/7.56/13.05 (SD-18). Completion: read as bricked-up bays between the doors.",
        "KEEP the loading cluster (crates at (13.7..14.5, 45.9..46.1), cart at (14.1, 45.05)) and the cover at (5.0, 34.2); the 0.8 m floors in front of both doors stay empty. No shop signs; no awning. Completion: as stated.",
        "CREATE one drain spout (SD-13) at a=0.6 and one at a=14.5 with streaks; APPLY wear: dirt band, cart scuffs 0..0.6 at both doors, wheel ruts in the paving finish in front of `BAY_DOOR_S` (ground task). Completion: as listed.",
    ],
    'reality': "Two locked caravanserai stores with handcart doors (1.35 m, not wagon gates) between blank bays; goods are handled in the yard, not stored against the wall.",
},
'FRONTAGE_TEA_TERRACE_EAST': {
    'datums': "ALL heights here are above the terrace floor z = 1.4 (add 1.4 for absolute): plinth 0..0.28; awning ledger 2.85; sign 3.05..3.43; sill course 3.50..3.62; coping 6.84..7.0 (absolute 8.4); S2 roof base 8.4, cap 9.59 absolute.",
    'tasks': [
        "CREATE the face GLB with its origin on the terrace floor (z 1.4): skin `ph_beige_wall_002`, plinth sandstone 0..0.28, sill course 3.50..3.62, coping 6.84..7.0; corners `open`: the north end meets the stairs' retaining stone with a 0.16 quoin strip, the south end the ramp's. Completion: the tea house reads as a two-storey house on a raised street.",
        "CREATE `GROUND_01` serving recess 2.4 × 2.7 × 1.35 at a=1.80: stone jambs, timber head, three timber shelves at 0.85 / 1.4 / 1.95 carrying brass pots, porcelain and folded linen (model 12 small items from the CC0 brass pot and simple lathe cups, all inside the recess), counter top at 0.90 × 0.34 deep, closed panel front. This recess is modelled in the GLB (no placed counter here). Completion: a tea counter with visible stock, nothing beyond the wall plane except the counter top's 0.10.",
        "CREATE `GROUND_02` closed entry door 1.15 × 2.7 at a=6.6 (SD-05). Completion: closed.",
        "CREATE two rebates `STORY_1_WINDOW_01/02` 1.6 × 1.65 at sill 3.68 / head 5.33 over a=1.80 and a=6.6 for the placed `ASSET_SHUTTER_LOUVERED` and `ASSET_SHUTTER_WOVEN` (absolute z 5.08). Completion: shutters seated.",
        AWN.format(z=2.85, a0=0.55, a1=3.05, p=1.10, cloth='ph_fabric_leather_02') + " over `GROUND_01` only (the tea house uses plain cream cloth, no stripes). Completion: one awning.",
        "CREATE sign brackets for `TEA_E_SIGN_1` (a=1.80, absolute z 4.45) at z 3.24 local. `TEA_E_SIGN_2` dormant. Completion: one sign.",
        "CREATE a lantern bracket (SD-10) at a=3.7, z 3.25 local (absolute 4.65), 0.35 proud, to carry the placed `LANTERN_TEA_01` at (18.5, 60.5, 4.65). Completion: lantern hangs from the bracket.",
        "KEEP the tea service, table, three stools and stall at their placed transforms (they sit on the terrace against this wall, outside the 4 m clear width). Completion: nothing new on the terrace.",
        "APPLY wear: dust band on the plinth, tea-stain drips 0..0.3 under the recess, polish at the door, seat polish on the wall at 0.4..0.9 m behind the stools. Completion: as listed.",
        "CREATE S2 roof: `upper_room` a=0..8.4, z0 7.0 local, height 1.4, depth 4.0, setback 0.75, coping 8.4 local, parapet 0.75 + coping to 9.59 absolute − 1.4 = 8.19 local. This GLB owns the shared Tea/Textile north wing roof strip x 19.0..24.0 for y 56.8..62.72; the Textile west GLB stops at x 19.0. Completion: one continuous stepped roof, no double slab.",
    ],
    'reality': "A tea house serves the raised terrace from a counter recess and has its own street door; the owners live above behind louvres (ventilation for the kitchen room) and woven reed (the bedroom).",
},
'FRONTAGE_COVERED_SOUK_WEST': {
    'datums': "plinth 0..0.28; impost 1.93; sign band 3.67..3.97; no continuous sill course (SD-06 sills at 4.09); coping 6.84..7.0.",
    'tasks': [
        "CREATE the face GLB: skin `ph_aged_plaster_ochre`, plinth sandstone, impost band, coping; end piers 0.45 × 0.16 (`held`). Completion: the trade side of the central merchant block.",
        "CREATE `GROUND_01` sealed arch 2.6 × 3.55 at a=2.86, floor deck 0.14, interior empty for the placed `ASSET_B18_DYE_COUNTER` (`CENTRAL_DYE_DISPLAY` at (40.83, 36.14, 0.14)). Completion: counter inside the arch.",
        "CREATE two screen rebates `STORY_1_WINDOW_01/02` 1.0 × 1.4 at sill 4.15 / head 5.55, a=1.10 and a=4.62 (a pair about the arch axis) for the placed `ASSET_SCREEN_SC_C` (`CENTRAL_SCREEN_SOUTH_1/2` at (40.98, 34.38 / 37.90, 4.15)). Completion: screens seated.",
        AWN.format(z=3.00, a0=1.41, a1=4.31, p=1.20, cloth='ph_hessian_230') + " over `GROUND_01` (brackets on the piers at 2.55). Completion: one awning, hem 2.63, under the shared canopy above.",
        "CREATE sign brackets for `DYE_W_SIGN_1` (a=2.86, board at z 3.67..3.97) at z 3.82, ±0.9. Completion: one sign.",
        "KEEP the cart at (43.10, 36.14) and the dormant rug anchor. APPLY wear: dust band, indigo drips 0..0.35 under the arch, polish on the jambs. Completion: as listed.",
    ],
    'reality': "The merchant block's trade face onto the covered souk: a dye-sample seller in the arch, family rooms above behind fine lattice (the women's side looks onto the busy souk).",
},
'FRONTAGE_COVERED_SOUK_WEST_NORTH': {
    'datums': "plinth 0..0.28; string course 3.35 (head 2.7); no sill course (SD-06 sill at 4.09); coping 6.84..7.0.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_cool` (a cooler wash for the north wing: the correlated difference), plinth, course 3.29..3.41, coping; end piers 0.45. Completion: reads as the same block's north wing across the passage.",
        "CREATE `GROUND_01` closed trade service door 1.15 × 2.7 at a=1.36 (SD-05), quiet: no sign (`DYE_W_SIGN_2` dormant), no awning. Completion: closed, quiet.",
        "CREATE `STORY_1_WINDOW_01` rebate 1.0 × 1.4 at sill 4.15 / head 5.55, a=1.36 for the placed `ASSET_SCREEN_SC_C` (`CENTRAL_SCREEN_NORTH` at (40.98, 45.36, 4.15)). Completion: seated.",
        "The shared canopy `CANOPY_DYERS_01` lands on this wall at a=1.36 (inset 0.3) at z 5.90: CREATE a 0.10 × 0.10 timber ledger 1.2 m long at z 5.90 with two iron eyes (0.35 above the screen head 5.55, 0.94 below the coping). Completion: the canopy end bears on the ledger above the screen; nothing crosses the screen.",
        "APPLY wear: dust band, polish at the door. Completion: as listed.",
    ],
    'reality': "The north wing's service door: goods in, nothing sold here. It serves only the north wing (the passage separates the wings).",
},
'FRONTAGE_COVERED_SOUK_EAST': {
    'datums': "plinth 0..0.28; impost 1.93; sign band 3.67..4.10 (3.80 over the booth); coping 4.34..4.5; slab 4.76, parapet cap 5.59; B18 roof-access room behind (placed).",
    'tasks': [
        "CREATE the face GLB: skin `ph_painted_plaster_warm`, plinth sandstone, impost band between the three arches, coping 4.34..4.5; end piers 0.60 × 0.16. Completion: low lime arcade of three repaired arches.",
        "CREATE three sealed arches `GROUND_01/02/03` 2.6 × 3.55 at a=1.90/6.72/11.54 with floor deck 0.14. Interiors empty: `ASSET_B18_PACKING_FINISH` (a=1.90), the approved `ASSET_TEXTILE_BOOTH` (a=6.72, do not touch) and `ASSET_B18_DYE_COUNTER` (a=11.54) are placed. The booth's side braces seat on masonry at ±1.19 from its axis: give the `GROUND_02` piers a 0.05 flat seat at z 3.26. Completion: three different trades in three arches.",
        AWN.format(z=3.00, a0=0.45, a1=3.35, p=1.20, cloth='ph_hessian_230') + " over `GROUND_01` and the same over `GROUND_03` (a=10.09..12.99). None over `GROUND_02` (the booth carries its own). Completion: exactly two awnings.",
        "CREATE sign brackets for `DYE_E_SIGN_1` (a=6.72, board at z 3.80..4.10, brackets z 3.95) and `DYE_E_SIGN_2` (a=11.54, board at z 3.67..3.97, brackets z 3.82). `GROUND_01` has no sign. Completion: two signs.",
        "CREATE a lantern bracket at a=7.22, z 3.75, 0.35 proud for the placed `LANTERN_DYERS_01` (52.5, 40.5, 4.1). Completion: lantern on a bracket.",
        "KEEP `COVER_DYERS_01` (50.5, 43.6) and the process vessel at (51.98, 35.18). No floor stock. Completion: as stated.",
        "KEEP the placed `ASSET_B18_ROOF_ACCESS` room at (55.5, 42.8, 4.76) (cap 7.35) and the roof tie `ASSET_ROOF_TIE_590` at y 45.36 on the parapet (the canopy's east seat; the GLB coping passes under its foot); CREATE the low service vent cluster on the roof toward y 38.3 as two 0.4 × 0.4 × 0.6 plaster boxes at (55.6, 38.2, 4.76) and (56.2, 38.6, 4.76) via `placements[]`. APPLY wear: dust band, indigo drips under `GROUND_03`, polish on jambs, west-facing bleach strong. Completion: as listed.",
    ],
    'reality': "Three fabric businesses under repaired arches: a packer, the cloth booth and a dye-sample seller; their back store is off-map, the roof room is where the packer keeps bolts dry.",
},
'FRONTAGE_DYERS_ALLEY_WEST_S': {
    'datums': "plinth 0..0.44 (workshop, stone); string course 3.20 (between the 2.5 door head and the 3.68 vents); coping 6.84..7.0; parapet +0.75.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth 0..0.44 × 0.14, course 3.14..3.26, coping; end piers 0.45. Completion: a stone workshop wall, quiet above the vents.",
        "CREATE `BAY_CART_DOOR` 1.35 × 2.5 at a=4.495 (double leaves, straps, bumper rail 0.35, threshold flush, dye stains on the leaves 0..0.9). Completion: closed work door.",
        "CREATE `BAY_NICHE_S/N` 1.05 × 1.8 at sill 0.70, a=1.91/7.08; `BAY_VENT_S/AXIS/N` 0.58 × 0.48 at sill 3.68 / head 4.16, a=1.91/4.495/7.08 with timber grilles. Completion: a niche under each outer vent, the door under the middle vent.",
        "KEEP the two `ASSET_DYERS_WORKSTATION` at (52.38, 17.0 / 21.0) on the EAST wall (they belong to the alley, not to this face). Nothing at this door's 0.8 m floor. No awning, sign or goods. Completion: as stated.",
        "CREATE one drain spout at a=0.5 (SD-13); APPLY wear: dirt band 0..1.5 heavy, indigo and madder splashes 0..0.9 around the door, cart scuffs, drip streak under each vent 0.3 long. Completion: the dirtiest wall on the map, but only below 1.5 m and under the vents.",
    ],
    'reality': "A dye works: one cart door for the wet work, vents high up to let the steam out, no windows to look through, staining where the vats are wheeled in and out.",
},
'FRONTAGE_DYERS_ALLEY_WEST_N': {
    'datums': "plinth 0..0.28 exposed stone; string course 2.90; loft vent sill 3.50; coping 4.34..4.5; slab 4.76, cap 5.59; hatch on the roof (placed).",
    'tasks': [
        "CREATE the face GLB: skin `ph_beige_wall_002` lime plaster over an exposed stone base `ph_sandstone_blocks_05` 0..0.28 and stone quoins 0.30 wide at both ends full height (`held`), course 2.84..2.96 `ph_trim_sanded_01`, coping 4.34..4.5. Completion: a plastered house between two stone buildings.",
        "CREATE `BAY_DOOR` 1.05 × 2.25 at a=4.125 (SD-05): planks, ring pull, a 0.06 step flush with paving. Completion: closed household door on the axis.",
        "CREATE `BAY_WINDOW_S/N` rebates 1.0 × 1.4 at sill 0.85 / head 2.25, a=1.80/6.45, frame 0.10, reveal 0.135, sill 0.06 proud; the placed `ASSET_DYERS_SCREEN_SC_D` (45.98, 23.79 / 28.44, 0.85) fill them. Completion: screens seated, the pair mirrored about the door.",
        "KEEP the placed loft vent `ASSET_DYERS_LOFT_VENT` at (46.0, 26.11, 3.5): CREATE its 0.58 × 0.48 rebate at a=4.125, sill 3.50. KEEP the roof hatch at (42.9, 23.5, 4.76). Completion: vent in a rebate, hatch flush on the slab.",
        "No awning, sign, shop, vats or goods. APPLY wear: light dust band, polish at the door, one water streak from the coping at a=0.3. Completion: as listed.",
    ],
    'reality': "The dyer's family house: one door in the middle, two lattice windows at eye height so the street can't see in, a loft above with a vent and a roof hatch to dry cloth up there.",
},
'FRONTAGE_NORTH_COURT_WEST': {
    'datums': "plinth 0..0.28; impost band 3.04..3.16; sill course 4.97..5.09; coping 6.84..7.0; parapet +0.75.",
    'tasks': [
        "CREATE the face GLB: skin `ph_beige_wall_002`, plinth sandstone, impost band, sill course, coping; end piers 0.60. Completion: the bath hall, plain and tall.",
        "CREATE `GROUND_01` the fortified door 2.012 × 2.965 at a=2.0: model the surround in the kit (stone jambs 0.20, pointed head, 0.34 reveal) and import the CC0 leaf `apps/client/public/assets/models/environment/bazaar/doors/large_castle_door/large_castle_door_2k.gltf` into `build.py` at the bay axis (a bound face GLB suppresses the runtime's door-model placement, so the leaf must travel in the GLB). Completion: one heavy closed door, no gap under it.",
        "CREATE `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=2.0. Completion: one high window.",
        "No dome, no raised parapet, no awning, sign or props. APPLY wear: dust band, steam staining 0..0.6 at a=0.3 (a low vent grille 0.3 × 0.3 at z 0.5 there), polish at the door. Completion: as listed.",
    ],
    'reality': "A hammam: one heavy door, high windows for light and steam, a low vent for the furnace room.",
},
'FRONTAGE_NORTH_COURT_WEST_SOUTH': {
    'datums': "plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 6.84..7.0.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05` (stone wing to the plaster hall), plinth, course, sill course, coping; end piers 0.45. Completion: same coping as the hall.",
        "CREATE `GROUND_01` closed door 1.05 × 2.25 at a=1.78 and `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.78. Completion: door and window on one axis.",
        "APPLY wear: dust band, polish at the door. Nothing else. Completion: as listed.",
    ],
    'reality': "The bath's service wing across the link: the stoker's door.",
},
'FRONTAGE_NORTH_COURT_EAST_S': {
    'datums': "plinth 0..0.44 (relief wall); string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course 2.84..2.96, coping 4.74..4.9; end piers 0.45. Completion: a low stone house on the court.",
        "CREATE `BAY_DOOR` 1.05 × 2.25 at a=3.78 (SD-05) and the mirrored pair `BAY_WINDOW_S/N` dark recesses 0.9 × 1.25 at sill 1.0 / head 2.25, a=1.70/5.86 with closed dark leaves and 0.06 sills. Completion: door on axis, windows mirrored.",
        "No pottery at the threshold (old brief), no awning, sign, balcony. KEEP the court's planter at (52.0, 76.2) (it is North Court's, not this house's). APPLY wear: dust band, polish at the door, one spout SD-13 at a=0.5. Completion: as listed.",
    ],
    'reality': "A one-room house on the court: door in the middle, a window each side, roof drains to the corner.",
},
'FRONTAGE_NORTH_COURT_EAST_N': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05` (cut stone against the house's rubble: correlated difference), plinth, course, coping; end piers 0.45. Completion: as datums.",
        "CREATE `BAY_NICHE_S/N` 1.05 × 1.8 at sill 0.70, a=2.345/5.215. Completion: two bricked-up bays framing the drying station.",
        "KEEP the drying station at `L3R0_NORTH_DYERS_BAY_01` (stall (50.85, 73.2), rack (52.17, 73.3), vat, rug) as one bounded work area; CREATE two iron rack hooks in the wall at z 2.4, a=1.8 and a=2.8, from which the placed rack hangs. No new vats. Completion: the rack reads as hung from the wall.",
        "APPLY wear: dust band, indigo drips 0..0.4 under the rack, one spout at a=7.0. Completion: as listed.",
    ],
    'reality': "The dyers' drying yard wall: no door (access from the works behind), two blind bays, the rack where cloth dries in the sun.",
},
'FRONTAGE_SERVICE_NORTH_EAST_SPINE_S': {
    'datums': "plinth 0..0.44; string course 2.90; coping 6.84..7.0 (retaining screen, keep tall).",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course 2.84..2.96, coping 6.84..7.0; end piers 0.45. Completion: a retaining spine, not a warehouse.",
        "REPLACE the two 2.5 m door visuals with sealed inspection panels `GROUND_01/02` 1.35 × 0.85 at a=2.328/6.984, sill 0.25 (SD, flush timber board in a 0.06 stone frame, no depth). Suppress the three old upper vent visuals (`STORY_1_*` stay dormant bindings). Completion: two hatches, no doors, no vents.",
        "APPLY wear: dirt band 0..1.5 with damp staining 0..0.8 (retaining wall), one spout at a=0.6 and one at a=8.7. Completion: as listed.",
    ],
    'reality': "The back of the caravan stores is a retaining wall under the tea ramp; two small hatches let the stores be inspected from the lane, nobody walks in.",
},
'FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID': {
    'datums': "plinth 0..0.44; string course 2.90; coping 6.84..7.0.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth 0..0.44, course, coping 6.84..7.0; end piers 0.45. Completion: a warm plaster screen between two stone ones.",
        "CREATE `GROUND_01/02` niches 1.05 × 1.8 at sill 1.30, a=3.104/6.208 (thirds). The old `STORY_1_WINDOW_01` niche stays suppressed. Completion: two niches, no third.",
        "The Tea shade `TEA_TERRACE_SHADE_01` lands on this wall's terrace side (x 11.6, y 62.4, z 5.75): CREATE an iron eye at that point on the terrace face. APPLY wear: dirt band, damp 0..0.8, one spout at a=4.65 (centre). Completion: as listed.",
    ],
    'reality': "The retaining screen beside the tea terrace, whitewashed because it faces the tea garden; the E1 overlook is a separate gameplay trial and is not built here.",
},
'FRONTAGE_SERVICE_NORTH_EAST_SPINE_N': {
    'datums': "plinth 0..0.44; string course 2.90; coping 6.84..7.0.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 6.84..7.0 (closes the `coping` need); end piers 0.45. Completion: tall stone screen.",
        "CREATE `BAY_01/02` niches 1.05 × 1.8 at sill 1.30, a=3.104/6.208. Completion: two niches.",
        "APPLY wear: dirt band, damp 0..0.8, one spout at a=8.7. The north-link corner stays clear. Completion: as listed.",
    ],
    'reality': "The north yard's retaining wall; the terrain is higher behind it.",
},
'FRONTAGE_SERVICE_SOUTH_EAST': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth 0..0.44 sandstone, course 2.84..2.96, coping 4.74..4.9; end piers 0.45. Completion: quiet whitewashed service-yard wall.",
        "CREATE `BAY_01/02/03` niches 1.05 × 1.8 at sill 1.60, a=3.95/7.9/11.85. No hatch. Completion: three high panels.",
        "CREATE one drain spout (SD-13, terracotta 0.12) at a=13.9 with the base stain under it (closes the `drain_stain` need); APPLY wear: dirt band, damp 0..0.6 at the spout end only. KEEP basket and pot at (9.5, 20.7) / (9.48, 22.15). Completion: one spout, one stain.",
    ],
    'reality': "A service-yard wall: nothing opens onto the lane; the roof behind drains through one spout.",
},
'FRONTAGE_DYERS_ALLEY_EAST': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course, coping 4.74..4.9; end piers 0.45. Completion: long quiet enclosure.",
        "REPLACE the three truncated pilaster-niche pieces with full blind niches `GROUND_01..04` 1.05 × 1.8 at sill 1.60, a=1.125/6.535/11.945/17.355. Completion: four equal high niches.",
        "KEEP the four rack clusters (`DYERS_E_RACK_01..04` at y 13.4 / 19.1 / 23.7 / 29.2, x 52.42) and the two workstations at (52.38, 17.0 / 21.0): CREATE iron rack hooks at z 2.4 for each hanging rack (two per rack, ±1.0 of its axis). Cloth stays within 0.35 m of the wall. Completion: every rack hangs from hooks.",
        "CREATE spouts at a=0.6 and a=17.9; APPLY wear: dirt band, dye splashes 0..0.9 under each workstation and rack, damp at the spouts. Completion: wear only where work happens.",
    ],
    'reality': "The backs of the houses east of the alley, rented to the dyers as a drying wall: hooks, racks, vats, splashes, but no way in.",
},
'FRONTAGE_COVERED_SOUK_SOUTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.1. One spout at a=0.5. Completion: a garden wall with one niche.",
    ],
    'reality': "The yard wall of the house behind the Souk's south end; the route passes beside it.",
},
'FRONTAGE_NORTH_COURT_SOUTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.1. One spout at a=3.7. Completion: as stated; the dogleg turn beside it stays empty.",
    ],
    'reality': "Yard wall closing the court's south side beside the dogleg arrival.",
},
'FRONTAGE_NORTH_COURT_NORTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01/02` niches at sill 1.30, a=2.013/4.027. No central gate. The drying line `L3R0_NORTH_DYERS_LINE_01` ends at (41.35, 75, 4.8) and (52.65, 75, 4.6) on the flanking walls, not on this one. One spout at a=5.5. Completion: two niches under an unbroken coping.",
    ],
    'reality': "The north enclosure of the drying court.",
},
'FRONTAGE_LINK_NORTH_WEST_NORTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45 turning the two short returns. CREATE `BAY_NICHE_AXIS` niche 1.05 × 1.8 at sill 1.30, a=2.94 (repaired full height, keep). One spout at a=0.5. Completion: one centred niche, continuous cap.",
    ],
    'reality': "A garden wall closing the north-west passage; the house behind it is off-map.",
},
'FRONTAGE_LINK_NORTH_EAST_NORTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `GROUND_01` niche 1.05 × 1.8 raised to sill 1.30 (matching the west wall), a=2.94. One spout at a=5.4. The example section `assets/source/example-section` shows the kit on this exact wall. Completion: as stated.",
    ],
    'reality': "Matching garden wall on the north-east passage.",
},
'FRONTAGE_SPAWN_A_NORTH_WEST': {
    'datums': "support shell only: the visible skin is the retained kit `ASSET_SPAWN_A_EXIT_WEST_RETURN` (3.5 × 2 × 7.6 at (18.75, 13.0)).",
    'tasks': [
        "KEEP the return kit as the visible corner front (one recess 2.1 wide at local x +0.35, two shuttered windows sill 4.3 / head 5.6). CREATE the face GLB only as a plain support skin `ph_sandstone_blocks_06` 0..4.9 with coping 4.74..4.9 (closes `coping`) behind the kit; suppress the frontage niche where the kit hides it. Completion: no duplicate skin or shelf visible in the gate turn.",
    ],
    'reality': "The south corner of the west Spice block, seen from the spawn court.",
},
'FRONTAGE_SPAWN_A_NORTH_EAST': {
    'datums': "support shell only: the visible skin is the retained kit `ASSET_SPAWN_A_EXIT_EAST_RETURN` (5.5 × 2 × 7.6 at (36.25, 13.0)).",
    'tasks': [
        "KEEP the return kit (one recess 2.3 wide at local x −1.5, one door 1.2 wide at x +1.35, three shuttered windows sill 4.3 / head 5.6). CREATE the support skin `ph_plastered_wall` 0..4.9 with coping 4.74..4.9 (closes `coping`) behind it; suppress the niche under the kit. Completion: no duplicate skin, no new booth.",
    ],
    'reality': "The south corner of the east Spice block.",
},
'FRONTAGE_SPAWN_B_SOUTH_WEST': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_05`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=1.32. One spout at a=0.4. Completion: quiet wing beside the gate; the placed `ASSET_SPAWN_B_SHADE` at (17.78, 83.5, 3.5) on the west perimeter is unrelated to this face.",
    ],
    'reality': "A small enclosure wing framing the north arrival.",
},
'FRONTAGE_SPAWN_B_SOUTH_EAST': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=1.87 (centred on the wall). One spout at a=3.3. Completion: as stated.",
    ],
    'reality': "The longer enclosure wing east of the gate.",
},
'FRONTAGE_CARAVAN_COURT_EAST_SOUTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_plastered_wall`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.43. One spout at a=0.4. Completion: garden wall, empty base.",
    ],
    'reality': "A garden enclosure south of the west-mid link.",
},
'FRONTAGE_CARAVAN_COURT_EAST_NORTH': {
    'datums': "plinth 0..0.44; string course 2.90; coping 4.74..4.9.",
    'tasks': [
        "CREATE the face GLB: skin `ph_whitewashed_brick_warm` with three 0.6 × 0.6 plaster repair patches (a=1.2 / 3.9 / 5.2, z 1.0..2.2) in `ph_plastered_wall`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.97. The loading shade `CARAVAN_LOAD_SHADE_01` and pack line end at (13.8, 46.6, 4.32) / (14.65, 47.8, 4.35) on this wall's north pier: CREATE two iron eyes there. One spout at a=5.5. Completion: repaired plaster field, one niche, canopy ends bearing on eyes.",
    ],
    'reality': "The north garden wall, patched where carts have hit it.",
},
'BLD_DYE_WORKS_GATE': {
    'tasks': [
        "KEEP the code boundary plane and the repaired blind gate at a=12.056 exactly (M04: measure its outer frame with `get_object_info` before touching anything near it). Add nothing to the gate.",
        "CREATE two vents 0.58 × 0.48 at a=4.2 and a=7.0, sill 4.15 / head 4.63, as free GLBs through `placements[]` at (46.0, 52.2, 4.15) and (46.0, 55.0, 4.15), yawDeg 90, base-centre origin, 0.05 proud (grilles on the plane). Completion: two grilles, no other opening.",
        "KEEP the vats at (46.55, 59.35 / 61.55), the rack at (46.18, 60.4) and the workstation at (46.6, 60.3). CREATE two rack hooks at z 2.4 (placements at (46.0, 59.4, 2.4) and (46.0, 61.4, 2.4)). APPLY wear: dye splashes 0..0.9 around the workstation only; dirt band. Completion: quiet working wall, wet work at the north end.",
    ],
    'reality': "The dye works' back onto the dogleg: a sealed old cart gate, vents for the boiling room, and the wet-work corner where the vats stand.",
},
'BLD_DOGLEG_HOUSE': {
    'tasks': [
        "REPLACE the repeated boundary bays with one dwelling composition as free GLBs (`placements[]`, origin base-centre, yawDeg 270 facing west): closed door 1.05 × 2.25 at (53.0, 55.0, 0); two dark-recess windows 0.9 × 1.25 at (53.0, 52.2, 1.0) and (53.0, 57.8, 1.0); three upper dark recesses 0.9 × 1.25 at (53.0, 52.2 / 55.0 / 57.8, 4.15). Each is a complete frame + closed leaf + sill 0.06, 0.05 proud of the plane with a 0.14 dark reveal box behind. Completion: one house reads on the east wall: door centred, pairs mirrored, uppers over lowers.",
        "KEEP the boundary plane's base, story course and roof. No balcony, awning, sign or stock; the door approach stays empty. APPLY wear: dust band, polish at the door. Completion: as stated.",
    ],
    'reality': "A family house whose street door happens to face the dogleg; the rest of it is off-map to the east.",
},
}

# ---------------------------------------------------------------- per-zone / per-unit design layer
ZONES = {}

UNITS = {
'unit-spice-street': {
    'intent': "The market street: busy west, quiet east. Three spice counters under three awnings on the west with houses above; a low stone wholesale row on the east with a household room set back at the north end (S1). Two canopies and three laundry lines cross the 12 m street from the west parapet to roof ties on the east, leaving sky between them. The fountain is glimpsed through the north end under the cloth. Palette: warm plaster west, pale coursed stone east, brown timber, teal louvres, cream and rust cloth.",
    'existing': "`assets/source/unit-spice-street/` holds a hand-modelled `build.py`, `spice-west.glb`, `spice-east.glb` and a `package.json` that was never applied (the facade manifest is empty). Treat it as reference for material setup only; rebuild both faces with `facade_kit` to this sheet.",
    'overheads': "Canopy ends on the west bear on the S1 parapet coping (z 5.8 ≈ top of the wall + ledger 0.10 × 0.10 timber, 1.2 m long, iron eyes); the east ends bear on the placed `ASSET_ROOF_TIE_*` at x 34.88. Cloth `ph_hessian_230` for the canopies (cream), rust and indigo garments on the lines. Sag 0.35 max at mid-span; hem ≥ 4.9 m over the street. Nothing hangs from the canopies.",
    'ground': "KEEP `spice_laid_stone_01`. Finish: flush seams at y 14 (Spice Gate threshold) and y 32; a 0.6 m worn band along the west counters (foot traffic); spice-dust tint 0..0.4 m out from the three west recesses; cart ruts 0.05 deep in the finish (no collision) from the east cart at (31.88, 16.57) toward the gate; contact wear under the cover cluster and the wall-base stock.",
    'skyline': "S1 adopted: west parcels y 15.44..21.56 / 21.56..27.32 / 27.32..30.56 with roof bases 7.6 / 8.4 / 7.0 and caps 8.79 / 9.59 / 8.19 (placed `ASSET_SPICE_ROOF_SOUTH/MIDDLE/NORTH`, KEEP); east stays 4.5 / 5.59 with the setback room (placed `ASSET_SPICE_UPPER_ROOM`, cap 7.71, KEEP). Nothing else on the roofs. From (27, 16) looking north and (27, 30) looking south the three west caps must step; from the fountain the setback room must read behind the east parapet.",
    'checks': [
        "Three west awnings, zero east awnings; two signs on the west (bays 01 and 03), none elsewhere.",
        "Three counters seated in their recesses with 0.34 m reveal either side; shutters seated in all five upper rebates.",
        "Canopy and line ends bear on ledgers or roof ties; hems ≥ 4.9 m; sky visible between spans from both street ends.",
        "East doors have empty 0.8 m floors; stock stays within 0.9 m of the east wall.",
    ],
},
'unit-fountain-court': {
    'intent': "The civic release: a tall pale madrasa with one sealed arch and a stained window on the west, a warm plastered merchant house with a loggia on the east, the off-axis fountain and palm, quiet mid-link passages north and south. Value contrast across the court is the composition: stone versus plaster, tall versus mid.",
    'existing': "`assets/source/unit-fountain-court/` holds hand-modelled GLBs for all four faces and an unapplied package; reference only, rebuild to this sheet.",
    'ground': "KEEP `patterned_cobblestone`. Finish: the pattern continues around the fountain with a 0.4 m wet-wear ring at its base; flush seams at y 32 and y 48 and at both mid-link mouths; polish along x 26..32 (the rotation lane); contact wear under the planters, spill cluster and tea table.",
    'skyline': "Madrasa roof base 9.5, cap 10.79, existing minaret vista kept; merchant house 7.0 / 8.19 shared with the Souk wing (M01: the Souk massing owns the common roof; this GLB adds no roof slab). No new dome.",
    'checks': [
        "Both hero arches sealed with dark backs; the threshold rugs lie centred in front of them.",
        "One stained window on the madrasa; a mirrored pair of dark windows on the merchant house; the screen seated in the north wing rebate.",
        "Nothing new on the court floor; x 26..32 and both link cones clear.",
    ],
},
'unit-textile-arcade': {
    'intent': "The compressed cloth street: two facing arcades on one arch rhythm (three arches and one column each), rug galleries and roll chests in the west arches, packing and light fabric in the east; a canopy and two lines overhead; the ochre two-storey west against the lime single-storey east; Rug Gate visible at the north end above the cloth.",
    'existing': "`assets/source/unit-textile-arcade/` holds hand-modelled GLBs and an unapplied package; reference only.",
    'overheads': "West ends of `CANOPY_TEXTILE_01` (z 4.2) and the two lines bear on 1.2 m ledgers at those heights on the west face (between the screen heads 5.55 and the sill course for the lines; the canopy ledger at 4.2 sits above the sign band and below the screen sills, spanning a pier); east ends on the placed roof ties. Cloth `ph_hessian_230`; garments indigo and rust.",
    'ground': "KEEP `cobblestone_color`. Finish: flush seams at y 48 / 64; polish along the centre; contact wear under the cover cluster and the cart; no loose rugs.",
    'skyline': "S2 adopted: west south parcel 7.0 / 8.19; west north wing (y 56.8..62.72) 8.4 / 9.59 shared with the Tea house (the Tea GLB owns x 19..24, the Textile GLB owns x ≤ 19 side strip nothing: one roof, two owners by x); east 4.5 / 5.59 flat with the two roof ties. Sky gaps between the spans stay open.",
    'checks': [
        "Six arches on the same axes across the lane; both columns grounded.",
        "Three screens seated on the west; no window over either column; no upper windows on the east.",
        "Both signs at z 3.67, 0.30 high; canopy ledger clears the sign boards.",
    ],
},
'unit-rug-gate': {
    'intent': "The northern threshold: the repaired gate arch with its blue accent spans the lane; one rug merchant on the west, the gatekeeper's quiet house on the east, the receiving backdrop beyond. Restraint: the gate is the landmark, nothing competes.",
    'existing': "`assets/source/unit-rug-gate/` holds hand-modelled GLBs and an unapplied package; reference only.",
    'ground': "KEEP `patterned_cobblestone`; flush seam only at existing transitions; polish under the gate; contact wear under the cover cluster.",
    'skyline': "Merchant house 7.0 / 8.19 (emitted max 8.87 kept); gatekeeper 4.5 / 5.59 low; the gate crown and the `pushRugGateCrownBackdrop` planes are kept as built.",
    'checks': [
        "One shop recess, one closed service door, two different upper closures on the west; one door, one window on the east.",
        "Sign at z 3.10 clearing the shutter frame.",
        "The lantern hangs from a bracket over the gatekeeper's door; the planter sits under the window.",
    ],
},
'unit-spawn-a-courtyard': {
    'intent': "The civic arrival: Bab al-Suq closes the south, three house backs and the dye-works back close the sides, the two Spice corner kits frame the exit north. Everything is a retained kit; this unit's work is support skins, coping, ground and wear.",
    'existing': "`assets/source/unit-spawn-a-courtyard/` holds two small support-skin GLBs and an unapplied package.",
    'ground': "KEEP `large_sandstone_blocks_01`; a worn centre; flush seams at the three exits; contact wear under the spawn cover and edge props.",
    'skyline': "All kits as built (gate turret 11.9, backs 9.25 / 7.75 / 6.5, works chimney 12.55, returns 7.6). No additions.",
    'checks': ["Both support skins invisible behind the kits; coping continuous where exposed.", "No new props; the three exits and both inside turns empty."],
},
'unit-spawn-b-courtyard': {
    'intent': "The quiet receiving court: two low enclosure wings either side of the gate, benches and pots at the west wall, shade over the two sealed north doors, three upper rooms and a palm on the skyline behind the sealed walls.",
    'existing': "`assets/source/unit-spawn-b-courtyard/` holds the two wing GLBs (unapplied) plus bench, shade and upper-room GLBs that ARE placed today through the registry (`ASSET_SPAWN_B_*`). Keep those; rebuild only the two wing faces.",
    'ground': "KEEP `large_sandstone_blocks_01`; flush seams; contact wear under the bench, pots and spawn cover.",
    'skyline': "KEEP the three placed upper rooms (z 9.85..10.0) and the skyline palm at (17.1, 89.6, 7.4). Nothing else.",
    'checks': ["Both wing niches at sill 1.30; copings at 4.9 continuous into the gate abutments.", "No market rows, no overhead."],
},
'unit-service-south': {
    'intent': "A quiet 7 m service lane: whitewashed yard wall with three high panels on the east, sealed perimeter west and south. Wear tells the story: one spout, one stain, a basket and a pot at the wall.",
    'existing': "`assets/source/unit-service-south/` holds one GLB and an unapplied package; reference only.",
    'ground': "KEEP `large_sandstone_blocks_01`; polish along the centre; damp patch under the spout at (10, 27.5) 0.6 m across; flush seams at both link mouths.",
    'checks': ["Three panels at sill 1.6; one spout; nothing else on the wall.", "Basket and pot within 0.5 m of the east wall."],
},
'unit-caravan-court': {
    'intent': "The loading yard: two store doors under one storage head on the west, garden walls with one niche each on the east, the crate stack and cart at the north end under the loading shade and pack line. Red sandstone paving with wheel ruts toward the receiving door.",
    'existing': "`assets/source/unit-caravan-court/` holds three GLBs and previews but no `package.json`; reference only.",
    'ground': "KEEP `red_sandstone_pavement`; wheel ruts in the finish from the cart at (14.1, 45.05) to `BAY_DOOR_S` at (3, 36.26); flush ramp transition at y 48; contact wear under the crates and cover.",
    'skyline': "Stores 4.5 / 5.59; yard walls 4.9 / 5.79 (kept taller than the stores: M07 decided against lowering). Nothing on the roofs.",
    'checks': ["Two identical store doors, the south one more worn; three niches at sill 0.7.", "Loading shade and pack line ends bear on eyes on the walls; nothing in the turning pocket at (9.2, 39.2)."],
},
'unit-tea-terrace': {
    'intent': "The raised route: ramp up from Caravan Court, the tea house on the terrace at +1.4 with its serving recess, table and stools under a shade sail, stairs down to the landing and the west-upper link. The retaining screens on the west stay tall and quiet. All tea-house heights are relative to the 1.4 floor.",
    'existing': "No unit folder yet.",
    'overheads': "`TEA_TERRACE_SHADE_01` runs from the retaining screen (11.6, 62.4, 5.75) to the tea house (18.4, 62.4, 5.65): iron eye on the screen, 1.2 m ledger on the house at local z 4.25. Cloth `ph_fabric_leather_02` (plain cream). Hem ≥ 4.2 over the terrace floor.",
    'ground': "KEEP the ramp (z 0..1.4 over 8 m), the terrace `patterned_cobblestone`, the ten visual treads and the landing; material seams at the top of the ramp and the top of the stairs only; polish on the tread nosings; tea-stain patch under the service at (18.55, 62.65).",
    'skyline': "Tea house roof base 8.4, cap 9.59 (shared with the Textile north wing; this GLB owns x 19..24). Retaining screens stay 7.0 / 7.89. The E1 overlook slot is NOT built (gameplay trial, separate task).",
    'checks': ["Serving recess with stocked shelves and a 0.90 counter; closed entry door; two shutters seated at absolute z 5.08.", "Lantern and sign on brackets; shade sail ends bear on an eye and a ledger.", "Ramp and stairs untouched; nothing on the treads or the inside corners."],
},
'unit-service-north': {
    'intent': "A long quiet service run under the tea terrace: three retaining screens on the east (inspection panels, two niches, two niches), sealed perimeter west. Damp base staining and spouts; no props.",
    'existing': "No unit folder.",
    'ground': "KEEP `large_sandstone_blocks_01`; damp band along the east base; polish along the centre; flush seams at y 48 and at the north-link turn.",
    'checks': ["Two sealed panels replace the 2.5 m doors; no vents remain visible on the south screen.", "Two niches on each of the other screens at thirds; copings continuous at 7.0."],
},
'unit-dyers-alley': {
    'intent': "The wet-work edge: the dye works' cart door and vents on the south-west, the dyer's plastered house north of it, the long drying wall east with four niches, racks and two workstations. Dirt and dye only where the work is.",
    'existing': "`assets/source/dyers-house/` holds the Blender sources of the placed screens, loft vent and hatch (keep). No wall GLBs yet.",
    'ground': "KEEP `patterned_cobblestone`; dye splashes and damp under the two workstations and four racks only; polish along the centre 4.5 m; flush seam at y 32 and the south-east link.",
    'skyline': "Works 7.0 / 8.19; house 4.5 / 5.59 with the placed hatch at 4.76; east wall 4.9 / 5.79. The works' party wall above the house roof stays blank stone.",
    'checks': ["Works: one cart door, two niches, three vents; house: one door, two seated screens, one seated loft vent; east: four equal niches.", "Every rack hangs from hooks; cloth within 0.35 m of the wall; the middle 4.5 m empty."],
},
'unit-covered-souk': {
    'intent': "Three fabric trades under repaired arches on the east (packing, the approved booth, dye samples), the merchant block's trade arch and north-wing door on the west, one shared canopy overhead, the 5 m structural end wall at the north. The B18 pilot roof room sits on the east roof.",
    'existing': "`assets/source/b18-counters/`, `central-screen-sc-c/`, `textile-booth/`, `b18-roof-access/` are the sources of the placed assets (keep). No wall GLBs yet.",
    'overheads': "`CANOPY_DYERS_01` runs level at z 5.90 from the west north wing (41.3, 45.36) to the east parapet at a=0.899 (53, 45.36), the same construction as Spice Street: CREATE a 1.2 m ledger at z 5.90 on the west north wing; the east end bears on the placed roof tie `ASSET_ROOF_TIE_590` (`PLACE_SUPPORT_CANOPY_DYERS_01`, on the parapet cap 5.59 behind the arcade face). Cloth `ph_hessian_230`, sag ≤ 0.35, hem ≥ 5.4 over the sheltered floor.",
    'ground': "KEEP `court_limestone_flags_01`; polish along the centre; indigo drips under both dye counters; contact wear under the cover and vats; flush seams at y 32 / 48 and the east-mid link mouth.",
    'skyline': "East: slab 4.76, parapet 5.59, the placed roof room (cap 7.35) and the two vent boxes; west: 7.0 / 8.19 shared with the merchant house (M01: this GLB adds no roof). The north end wall (x 41..46, y 48) is an arcade end wall: quiet stone field, coping at 7.0, zero arches.",
    'checks': ["Three east arches with three different trades; the booth untouched; two awnings (bays 01 and 03) and two signs on the east (z 3.80 over the booth, 3.67 over the dye counter).", "West: one arch with the dye counter, two seated screens, the north-wing door quiet; canopy ends on the west ledger and the east roof tie.", "Lantern on a bracket; the west-mid link turn empty."],
},
'unit-dyers-dogleg': {
    'intent': "The residential turn: the dye works' sealed gate and vents on the west, one dwelling's door and windows on the east, the drying line across, vats and a rack in the north-west corner. Both faces are code-owned boundary planes; work goes through free placements.",
    'existing': "No unit folder.",
    'ground': "KEEP `cobblestone_color`; dye splashes under the workstation corner only; polish along the route; flush seams north and south.",
    'skyline': "Both boundary planes stay 7.0. Nothing added.",
    'checks': ["West: gate untouched, two vent grilles at sill 4.15, rack on hooks; east: door + two + three windows reading as one house.", "The inside north turn and both passages empty."],
},
'unit-north-court': {
    'intent': "The drying court and release: the hammam's heavy door and service wing on the west, a small house and the dyers' yard wall with the drying station on the east, garden walls north and south, the drying line and palm overhead. Open centre.",
    'existing': "No unit folder.",
    'ground': "KEEP `court_limestone_flags_01`; polish across the open centre; indigo drips under the drying station; contact wear under the cover, planter and workstation; flush seams into the three links.",
    'skyline': "Hammam 7.0 / 8.19 (no dome); east houses and walls 4.9 / 5.79; palm at (50.6, 77.2). Nothing else.",
    'checks': ["Hammam door heavy and closed, high window over it; wing door and window on one axis.", "House: door centred, windows mirrored; yard wall: two niches, rack on hooks; north and south walls: niches at sill 1.3, no gate."],
},
'links': {
    'intent': "Eight quiet passages. They carry no shops, signs, awnings, props or overheads. Only two of them own a wall (the north-west and north-east garden walls); the rest are open faces, cut edges and short returns finished to match their neighbours. Their job is to read as passages and keep their clear widths.",
    'existing': "`assets/source/example-section/` is the kit demonstration on the north-east link wall and is the template for every section GLB.",
    'ground': "KEEP each floor material; flush seams at both mouths; polish along the centre; no curbs, grates or trenches.",
    'skyline': "Nothing on the link roofs.",
    'checks': ["Each link keeps its clear width (3.5 m; 4.5 m at the west-upper link); no geometry inside the swept turn.", "Short returns and cut edges carry only plinth, field, coping matching the adjoining owner."],
},
}
