# unit-service-north · Service North

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-service-north --tag r1-before` prints the same walls and must agree. Also called: Service North, north service alley.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

A long quiet service run under the tea terrace: three retaining screens on the east (inspection panels, two niches, two niches), sealed perimeter west. Damp base staining and spouts; no props.

## 2. Site

### Site · `SERVICE_NORTH` (Service North)

- Rect x 3..10, y 48..80 (7 × 32 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **4.5 m** (protected).
- Connects: CARAVAN_COURT, LINK_NORTH_WEST.
- `north` edge: exempt (`sealed_perimeter`): The 7.00m wall run on the 7.00m north edge is a deliberately sealed back-of-house boundary.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m south edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`sealed_perimeter`): The 32.00m west wall is the deliberately sealed outer service perimeter.
- `east` edge: frontage `FRONTAGE_SERVICE_NORTH_EAST_SPINE_S` → `BLD_STORES_BACK`.
- `east` edge: frontage `FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID` → `BLD_TEA_HOUSE_BACK`.
- `east` edge: frontage `FRONTAGE_SERVICE_NORTH_EAST_SPINE_N` → `BLD_NORTH_YARD_WALL`.

**Existing source.** No unit folder.

## 3. Walls

### FRONTAGE_SERVICE_NORTH_EAST_SPINE_S  ·  BLD_STORES_BACK (service back, 2 storeys)

- **Role:** public front. Solid retaining enclosure with two flush sealed inspection panels; no warehouse doors, visible upper vents or excavated interior.
- **Wall line:** east edge of `SERVICE_NORTH`; x = 10, y = 48.03 .. 57.34 (a runs south to north); length **9.31 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 48.03), (10, 57.34), faces='W')`.
- **Massing `MASSING_SERVICE_SPINE`:** wall top 7 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 7, parapet cap 7.890, emitted max 10.118.
- **Facade GLB frame:** width 9.31 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `service_inspection`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_002`.
- **Corners:** `held`; solid end piers reserved: 1.65 m at a=0, 1.65 m at a=L. Ground head datum 1.1 m.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 6.84..7.0 (retaining screen, keep tall).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `inspection_panel` → `ASMB_WALL_FINISH` | sealed inspection panel 1.35 × 0.85 (flush, sill 0.25) | 2.33 | (10, 50.36) | 1.35 × 0.04 × 0.85 | 0.25 / 1.1 | 0 |  |
| `GROUND_02` | `inspection_panel` → `ASMB_WALL_FINISH` | sealed inspection panel 1.35 × 0.85 (flush, sill 0.25) | 6.98 | (10, 55.02) | 1.35 × 0.04 × 0.85 | 0.25 / 1.1 | 0 |  |


**Composition.** Two small sealed inspection panels explain the retaining spine without inventing full-height storage under the ramp.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course 2.84..2.96, coping 6.84..7.0; end piers 0.45. Completion: a retaining spine, not a warehouse.
2. REPLACE the two 2.5 m door visuals with sealed inspection panels `GROUND_01/02` 1.35 × 0.85 at a=2.328/6.984, sill 0.25 (SD, flush timber board in a 0.06 stone frame, no depth). Suppress the three old upper vent visuals (`STORY_1_*` stay dormant bindings). Completion: two hatches, no doors, no vents.
3. APPLY wear: dirt band 0..1.5 with damp staining 0..0.8 (retaining wall), one spout at a=0.6 and one at a=8.7. Completion: as listed.

**Why it exists (reality check):** The back of the caravan stores is a retaining wall under the tea ramp; two small hatches let the stores be inspected from the lane, nobody walks in.

### FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID  ·  BLD_TEA_HOUSE_BACK (service back, 2 storeys)

- **Role:** compound/service wall. Retaining screen with two high blind niches at thirds, a quiet lower field and the unchanged tall roofline; no overlook opening.
- **Wall line:** east edge of `SERVICE_NORTH`; x = 10, y = 57.34 .. 66.66 (a runs south to north); length **9.31 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 57.34), (10, 66.66), faces='W')`.
- **Massing `MASSING_SERVICE_SPINE`:** wall top 7 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 7, parapet cap 7.890, emitted max 10.018.
- **Facade GLB frame:** width 9.31 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_warmwash_relief`):** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 2.58 m at a=0, 2.58 m at a=L. Ground head datum 3.1 m.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `blind_niche` |  | 3.1 | (10, 60.45) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |
| `GROUND_02` | `blind_niche` |  | 6.21 | (10, 63.55) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |


**Composition.** Two high blind panels articulate the retaining/enclosure screen beside the terrace, with E1 opening a tested overlook.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth 0..0.44, course, coping 6.84..7.0; end piers 0.45. Completion: a warm plaster screen between two stone ones.
2. CREATE `GROUND_01/02` niches 1.05 × 1.8 at sill 1.30, a=3.104/6.208 (thirds). The old `STORY_1_WINDOW_01` niche stays suppressed. Completion: two niches, no third.
3. The Tea shade `TEA_TERRACE_SHADE_01` lands on this wall's terrace side (x 11.6, y 62.4, z 5.75): CREATE an iron eye at that point on the terrace face. APPLY wear: dirt band, damp 0..0.8, one spout at a=4.65 (centre). Completion: as listed.

**Why it exists (reality check):** The retaining screen beside the tea terrace, whitewashed because it faces the tea garden; the E1 overlook is a separate gameplay trial and is not built here.

### FRONTAGE_SERVICE_NORTH_EAST_SPINE_N  ·  BLD_NORTH_YARD_WALL (compound wall, 2 storeys)

- **Role:** compound/service wall. Retaining spine, north third: cut stone with pilasters and coping toward the link. Reads as a wall, not a building.
- **Wall line:** east edge of `SERVICE_NORTH`; x = 10, y = 66.66 .. 75.97 (a runs south to north); length **9.31 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 66.66), (10, 75.97), faces='W')`.
- **Massing `MASSING_SERVICE_SPINE`:** wall top 7 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 7, parapet cap 7.890, emitted max 10.018.
- **Facade GLB frame:** width 9.31 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_relief`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `held`; solid end piers reserved: 2.58 m at a=0, 2.58 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 3.1 | (10, 69.76) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |
| `BAY_02` | `blind_niche` |  | 6.21 | (10, 72.86) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** The north retaining spine ends in two high blind panels under the existing tall coping.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 6.84..7.0 (closes the `coping` need); end piers 0.45. Completion: tall stone screen.
2. CREATE `BAY_01/02` niches 1.05 × 1.8 at sill 1.30, a=3.104/6.208. Completion: two niches.
3. APPLY wear: dirt band, damp 0..0.8, one spout at a=8.7. The north-link corner stays clear. Completion: as listed.

**Why it exists (reality check):** The north yard's retaining wall; the terrain is higher behind it.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; damp band along the east base; polish along the centre; flush seams at y 48 and at the north-link turn.

## 7. Roofs and skyline

Baseline roofs per the massing table above (roof base = wall top, parapet per profile, coping SD-03). No new rooftop props. Perimeter skyline placements, if any, are listed in [skyline.md](skyline.md).

## 8. Completion checks

- [ ] Two sealed panels replace the 2.5 m doors; no vents remain visible on the south screen.
- [ ] Two niches on each of the other screens at thirds; copings continuous at 7.0.
- [ ] `pnpm map:check` passes with no new reasons; `[section-models]`, `[facade-models]` and `[authored-placements]` print no warnings.
- [ ] Every opening in the bay tables exists in the GLB at its `a`, sill and head; nothing else opens the wall.
- [ ] Every placed asset in section 4 still sits in a rebate or on a floor the GLB provides (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and coping run the full wall and turn the solid corners; coping matches the neighbour where the same building continues.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.
- [ ] Worst view of `pnpm map:shoot` stays inside the budget (1,500 draws / 2.2 M tris / 12.5 ms).
- [ ] Fresh-eyes verdict passes all three tiers on every view; a fail is another round.

## 9. Verification record

| Date | Check or view | Result | Evidence |
|---|---|---|---|
| | `pnpm map:check` | | |
| | movement check standing and crouched | | |
| | fresh-eyes verdict (massing / facade / materials) | | |

