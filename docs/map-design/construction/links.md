# links · The eight link passages

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot links --tag r1-before` prints the same walls and must agree. Also called: the links, cross-links, link passages (one shoot unit per zone: unit-link-south-west, unit-link-south-east, unit-link-west-mid, unit-link-east-mid, unit-link-west-upper, unit-link-east-upper, unit-link-north-west, unit-link-north-east).

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

Eight quiet passages. They carry no shops, signs, awnings, props or overheads. Only two of them own a wall (the north-west and north-east garden walls); the rest are open faces, cut edges and short returns finished to match their neighbours. Their job is to read as passages and keep their clear widths.

## 2. Site

### Site · `LINK_SOUTH_WEST` (South West Link)

- Rect x 10..17, y 8..13 (7 × 5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **3.5 m** (protected).
- Connects: SERVICE_SOUTH, SPAWN_A_COURTYARD.
- `north` edge: exempt (`architectural_cut_edge`): The 7.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 7.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`short_wall_return`): Only 2.00m of the 5.00m west edge is collision wall; no continuous return reaches the 2.50m frontage minimum.

### Site · `LINK_SOUTH_EAST` (South East Link)

- Rect x 39..46, y 8..13 (7 × 5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **3.5 m** (protected).
- Connects: DYERS_ALLEY, SPAWN_A_COURTYARD.
- `north` edge: exempt (`architectural_cut_edge`): The 7.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 7.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`short_wall_return`): Only 2.00m of the 5.00m east edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_WEST_MID` (West Mid Link)

- Rect x 15..20, y 36..41 (5 × 5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **3.5 m** (protected).
- Connects: CARAVAN_COURT, FOUNTAIN_COURT.
- `north` edge: exempt (`architectural_cut_edge`): The 5.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 5.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_EAST_MID` (East Mid Link)

- Rect x 36..41, y 39..44 (5 × 5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **3.5 m** (protected).
- Connects: COVERED_SOUK, FOUNTAIN_COURT.
- `north` edge: exempt (`architectural_cut_edge`): The 5.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 5.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_WEST_UPPER` (West Upper Link)

- Rect x 19..21, y 72..76.5 (2 × 4.5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **4.5 m** (protected).
- Connects: RUG_GATE, TEA_LANDING.
- `north` edge: exempt (`short_wall_return`): The complete north wall is only 2.00m long, below the 2.50m frontage minimum.
- `south` edge: exempt (`short_wall_return`): The complete south wall is only 2.00m long, below the 2.50m frontage minimum.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 4.50m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 4.50m west edge; the full face remains an authored traversal opening.

### Site · `LINK_EAST_UPPER` (East Upper Link)

- Rect x 34..41, y 67..72 (7 × 5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **3.5 m** (protected).
- Connects: NORTH_COURT, RUG_GATE.
- `north` edge: exempt (`architectural_cut_edge`): The 7.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 7.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_NORTH_WEST` (North West Link)

- Rect x 10..17, y 76..81 (7 × 5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **3.5 m** (protected).
- Connects: SERVICE_NORTH, SPAWN_B_COURTYARD.
- `south` edge: exempt (`short_wall_return`): Only 1.00m of the 7.00m south edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `east` edge: exempt (`short_wall_return`): Only 1.50m of the 5.00m east edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `west` edge: exempt (`short_wall_return`): Only 1.00m of the 5.00m west edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `north` edge: frontage `FRONTAGE_LINK_NORTH_WEST_NORTH` → `BLD_LINK_WALL_NW`.

### Site · `LINK_NORTH_EAST` (North East Link)

- Rect x 39..46, y 76..81 (7 × 5 m); floor z = 0; floor `court_limestone_flags_01`; authored clear width **3.5 m** (protected).
- Connects: NORTH_COURT, SPAWN_B_COURTYARD.
- `south` edge: exempt (`short_wall_return`): Only 2.00m of the 7.00m south edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `east` edge: exempt (`short_wall_return`): Only 1.00m of the 5.00m east edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `west` edge: exempt (`short_wall_return`): Only 2.00m of the 5.00m west edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `north` edge: frontage `FRONTAGE_LINK_NORTH_EAST_NORTH` → `BLD_LINK_WALL_NE`.

**Existing source.** `assets/source/example-section/` is the kit demonstration on the north-east link wall and is the template for every section GLB.

## 3. Walls

### FRONTAGE_LINK_NORTH_WEST_NORTH  ·  BLD_LINK_WALL_NW (compound wall, 1 storey)

- **Role:** compound/service wall. Coping, one string course, a single blind niche on the axis of the approach from Tea Landing.
- **Wall line:** north edge of `LINK_NORTH_WEST`; y = 81, x = 10.56 .. 16.44 (a runs west to east); length **5.88 m**; street side -Y (street lies south); kit `Wall(F, (10.56, 81), (16.44, 81), faces='S')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 5.88 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_warmwash_relief`):** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 2.42 m at a=0, 2.42 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_NICHE_AXIS` | `blind_niche` |  | 2.94 | (13.5, 81) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** A garden wall gives the north-west approach one centered high niche and a continuous cap.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45 turning the two short returns. CREATE `BAY_NICHE_AXIS` niche 1.05 × 1.8 at sill 1.30, a=2.94 (repaired full height, keep). One spout at a=0.5. Completion: one centred niche, continuous cap.

**Why it exists (reality check):** A garden wall closing the north-west passage; the house behind it is off-map.

### FRONTAGE_LINK_NORTH_EAST_NORTH  ·  BLD_LINK_WALL_NE (compound wall, 1 storey)

- **Role:** compound/service wall. Mirror of the north-west wall.
- **Wall line:** north edge of `LINK_NORTH_EAST`; y = 81, x = 39.56 .. 45.44 (a runs west to east); length **5.88 m**; street side -Y (street lies south); kit `Wall(F, (39.56, 81), (45.44, 81), faces='S')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 5.88 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_warmwash_relief`):** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 2.42 m at a=0, 2.42 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `blind_niche` |  | 2.94 | (42.5, 81) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** A quieter matching garden wall terminates the north-east approach with one high niche.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `GROUND_01` niche 1.05 × 1.8 raised to sill 1.30 (matching the west wall), a=2.94. One spout at a=5.4. The example section `assets/source/example-section` shows the kit on this exact wall. Completion: as stated.

**Why it exists (reality check):** Matching garden wall on the north-east passage.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

#### `LINK_SOUTH_WEST`

#### `LINK_SOUTH_EAST`

#### `LINK_WEST_MID`

#### `LINK_EAST_MID`

#### `LINK_WEST_UPPER`

#### `LINK_EAST_UPPER`

#### `LINK_NORTH_WEST`

#### `LINK_NORTH_EAST`

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP each floor material; flush seams at both mouths; polish along the centre; no curbs, grates or trenches.

## 7. Roofs and skyline

Nothing on the link roofs.

## 8. Completion checks

- [ ] Each link keeps its clear width (3.5 m; 4.5 m at the west-upper link); no geometry inside the swept turn.
- [ ] Short returns and cut edges carry only plinth, field, coping matching the adjoining owner.
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

