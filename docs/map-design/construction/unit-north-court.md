# unit-north-court · North Court

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-north-court --tag r1-before` prints the same walls and must agree. Also called: North Court.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The drying court and release: the hammam's heavy door and service wing on the west, a small house and the dyers' yard wall with the drying station on the east, garden walls north and south, the drying line and palm overhead. Open centre.

## 2. Site

### Site · `NORTH_COURT` (North Court)

- Rect x 41..53, y 62..80 (12 × 18 m); floor z = 0; floor `court_limestone_flags_01`; authored clear width **4.5 m** (protected).
- Connects: DYERS_DOGLEG, LINK_EAST_UPPER, LINK_NORTH_EAST.
- `west` edge: frontage `FRONTAGE_NORTH_COURT_WEST` → `BLD_HAMMAM`.
- `west` edge: frontage `FRONTAGE_NORTH_COURT_WEST_SOUTH` → `BLD_HAMMAM`.
- `north` edge: frontage `FRONTAGE_NORTH_COURT_NORTH` → `BLD_NORTH_YARD_WALL_N`.
- `east` edge: frontage `FRONTAGE_NORTH_COURT_EAST_S` → `BLD_NORTH_HOUSE_S`.
- `east` edge: frontage `FRONTAGE_NORTH_COURT_EAST_N` → `BLD_NORTH_DYERS_YARD`.
- `south` edge: frontage `FRONTAGE_NORTH_COURT_SOUTH` → `BLD_NORTH_YARD_WALL_S`.

**Existing source.** No unit folder.

## 3. Walls

### FRONTAGE_NORTH_COURT_WEST  ·  BLD_HAMMAM (landmark, 1 storey)

- **Role:** public front. One tall bath hall with a broad closed fortified entrance and high clerestory, beside its retained closed service wing; no new playable interior or roof mass.
- **Wall line:** west edge of `NORTH_COURT`; x = 41, y = 72 .. 76 (a runs south to north); length **4 m**; street side +X (street lies east of the wall); kit `Wall(F, (41, 72), (41, 76), faces='E')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 7, parapet cap 8.190, emitted max 9.020.
- **Facade GLB frame:** width 4 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `hero_courtyard_beige`):** wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`.
- **Corners:** `open`; solid end piers reserved: 0.99 m at a=0, 0.99 m at a=L. Ground head datum 2.96 m.
- **Upper sill datums:** 5.15 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; impost band 3.04..3.16; sill course 4.97..5.09; coping 6.84..7.0; parapet +0.75.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `door_fortified_gate` | heavy closed hammam door (`ASSET_CC0_LARGE_CASTLE_DOOR` model) | 2 | (41, 74) | 2.01 × 0.34 × 2.96 | 0 / 2.96 | 0 |  |
| `STORY_1_WINDOW_01` | `window_dark_recess` |  | 2 | (41, 74) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at flanking the gate at 0.50 m along, under the head; `ASSET_CC0_LANTERN` at flanking the gate at 3.50 m along, under the head.

**Composition.** A tall bath hall has one heavy closed entry and high clerestories, with a small service wing across the link.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_beige_wall_002`, plinth sandstone, impost band, sill course, coping; end piers 0.60. Completion: the bath hall, plain and tall.
2. CREATE `GROUND_01` the fortified door 2.012 × 2.965 at a=2.0: model the surround in the kit (stone jambs 0.20, pointed head, 0.34 reveal) and import the CC0 leaf `apps/client/public/assets/models/environment/bazaar/doors/large_castle_door/large_castle_door_2k.gltf` into `build.py` at the bay axis (a bound face GLB suppresses the runtime's door-model placement, so the leaf must travel in the GLB). Completion: one heavy closed door, no gap under it.
3. CREATE `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=2.0. Completion: one high window.
4. No dome, no raised parapet, no awning, sign or props. APPLY wear: dust band, steam staining 0..0.6 at a=0.3 (a low vent grille 0.3 × 0.3 at z 0.5 there), polish at the door. Completion: as listed.

**Why it exists (reality check):** A hammam: one heavy door, high windows for light and steam, a low vent for the furnace room.

### FRONTAGE_NORTH_COURT_WEST_SOUTH  ·  BLD_HAMMAM (landmark, 1 storey)

- **Role:** secondary/service wing front. One tall bath hall with a broad closed fortified entrance and high clerestory, beside its retained closed service wing; no new playable interior or roof mass.
- **Wall line:** west edge of `NORTH_COURT`; x = 41, y = 63.44 .. 67 (a runs south to north); length **3.56 m**; street side +X (street lies east of the wall); kit `Wall(F, (41, 63.44), (41, 67), faces='E')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 7, parapet cap 8.190, emitted max 9.020.
- **Facade GLB frame:** width 3.56 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `hero_courtyard`):** wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`.
- **Corners:** `held`; solid end piers reserved: 1.25 m at a=0, 1.25 m at a=L. Ground head datum 2.5 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `door_residential_timber` |  | 1.78 | (41, 65.22) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |  |
| `STORY_1_WINDOW_01` | `window_dark_recess` |  | 1.78 | (41, 65.22) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |  |


**Composition.** A tall bath hall has one heavy closed entry and high clerestories, with a small service wing across the link.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05` (stone wing to the plaster hall), plinth, course, sill course, coping; end piers 0.45. Completion: same coping as the hall.
2. CREATE `GROUND_01` closed door 1.05 × 2.25 at a=1.78 and `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.78. Completion: door and window on one axis.
3. APPLY wear: dust band, polish at the door. Nothing else. Completion: as listed.

**Why it exists (reality check):** The bath's service wing across the link: the stoker's door.

### FRONTAGE_NORTH_COURT_NORTH  ·  BLD_NORTH_YARD_WALL_N (compound wall, 1 storey)

- **Role:** compound/service wall. Coping and string course.
- **Wall line:** north edge of `NORTH_COURT`; y = 80, x = 46 .. 52.04 (a runs west to east); length **6.04 m**; street side -Y (street lies south); kit `Wall(F, (46, 80), (52.04, 80), faces='S')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 6.04 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_relief`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `held`; solid end piers reserved: 1.49 m at a=0, 1.49 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 2.01 | (48.01, 80) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |
| `BAY_02` | `blind_niche` |  | 4.03 | (50.03, 80) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** Two high niches continue the court enclosure below an unbroken coping.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01/02` niches at sill 1.30, a=2.013/4.027. No central gate. The drying line `L3R0_NORTH_DYERS_LINE_01` ends at (41.35, 75, 4.8) and (52.65, 75, 4.6) on the flanking walls, not on this one. One spout at a=5.5. Completion: two niches under an unbroken coping.

**Why it exists (reality check):** The north enclosure of the drying court.

### FRONTAGE_NORTH_COURT_EAST_S  ·  BLD_NORTH_HOUSE_S (house, 1 storey)

- **Role:** public front. Limewashed single-storey house: door on its axis, one dark-recess window mirrored each side, 1.25 m piers at the corners. Its neighbour to the north is the dyers yard wall, not another house.
- **Wall line:** east edge of `NORTH_COURT`; x = 53, y = 63.44 .. 71 (a runs south to north); length **7.56 m**; street side -X (street lies west of the wall); kit `Wall(F, (53, 63.44), (53, 71), faces='W')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 7.56 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `held`; solid end piers reserved: 1.25 m at a=0, 1.25 m at a=L. Ground head datum 2.25 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44 (relief wall); string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_WINDOW_S` | `window_dark_recess` |  | 1.7 | (53, 65.14) | 0.9 × 0.28 × 1.25 | 1 / 2.25 | 0 |  |
| `BAY_DOOR` | `door_residential_timber` |  | 3.78 | (53, 67.22) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |  |
| `BAY_WINDOW_N` | `window_dark_recess` |  | 5.86 | (53, 69.3) | 0.9 × 0.28 × 1.25 | 1 / 2.25 | 0 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at over the door at 3.78 m along, under the head; `ASSET_CC0_POTTERY` at beside the door on the north side.

**Composition.** A quiet single-storey dwelling faces the court with a centered closed door and paired dark windows.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course 2.84..2.96, coping 4.74..4.9; end piers 0.45. Completion: a low stone house on the court.
2. CREATE `BAY_DOOR` 1.05 × 2.25 at a=3.78 (SD-05) and the mirrored pair `BAY_WINDOW_S/N` dark recesses 0.9 × 1.25 at sill 1.0 / head 2.25, a=1.70/5.86 with closed dark leaves and 0.06 sills. Completion: door on axis, windows mirrored.
3. No pottery at the threshold (old brief), no awning, sign, balcony. KEEP the court's planter at (52.0, 76.2) (it is North Court's, not this house's). APPLY wear: dust band, polish at the door, one spout SD-13 at a=0.5. Completion: as listed.

**Why it exists (reality check):** A one-room house on the court: door in the middle, a window each side, roof drains to the corner.

### FRONTAGE_NORTH_COURT_EAST_N  ·  BLD_NORTH_DYERS_YARD (workshop, 1 storey)

- **Role:** public front. The dyers works yard: a cut-stone working wall with two blind niches flanking the axis where the rack hangs, vats and stall at its base, no door because the cart gate is in the Dogleg.
- **Wall line:** east edge of `NORTH_COURT`; x = 53, y = 71 .. 78.56 (a runs south to north); length **7.56 m**; street side -X (street lies west of the wall); kit `Wall(F, (53, 71), (53, 78.56), faces='W')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 7.56 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_cut_stone`):** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 1.82 m at a=0, 1.82 m at a=L. Ground head datum 2.5 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_NICHE_S` | `blind_niche` |  | 2.35 | (53, 73.34) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |  |
| `BAY_NICHE_N` | `blind_niche` |  | 5.21 | (53, 76.22) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_DYERS_HANGING_TEXTILES` at existing rack L3R0_NORTH_DYERS_BAY_01, keep; `ASSET_DYERS_SEALED_VAT` at existing, keep; `ASSET_MARKET_STALL` at existing, keep; asset itself is on the parts list.

**Composition.** Two blind niches frame a workshop-yard drying rack with service access elsewhere.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05` (cut stone against the house's rubble: correlated difference), plinth, course, coping; end piers 0.45. Completion: as datums.
2. CREATE `BAY_NICHE_S/N` 1.05 × 1.8 at sill 0.70, a=2.345/5.215. Completion: two bricked-up bays framing the drying station.
3. KEEP the drying station at `L3R0_NORTH_DYERS_BAY_01` (stall (50.85, 73.2), rack (52.17, 73.3), vat, rug) as one bounded work area; CREATE two iron rack hooks in the wall at z 2.4, a=1.8 and a=2.8, from which the placed rack hangs. No new vats. Completion: the rack reads as hung from the wall.
4. APPLY wear: dust band, indigo drips 0..0.4 under the rack, one spout at a=7.0. Completion: as listed.

**Why it exists (reality check):** The dyers' drying yard wall: no door (access from the works behind), two blind bays, the rack where cloth dries in the sun.

### FRONTAGE_NORTH_COURT_SOUTH  ·  BLD_NORTH_YARD_WALL_S (compound wall, 1 storey)

- **Role:** compound/service wall. Coping and string course.
- **Wall line:** south edge of `NORTH_COURT`; y = 62, x = 41.36 .. 45.56 (a runs west to east); length **4.2 m**; street side +Y (street lies north); kit `Wall(F, (41.36, 62), (45.56, 62), faces='N')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 4.2 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_warmwash_relief`):** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 1.57 m at a=0, 1.57 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 2.1 | (43.46, 62) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** One high niche ends the southern court enclosure beside the dogleg arrival.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.1. One spout at a=3.7. Completion: as stated; the dogleg turn beside it stays empty.

**Why it exists (reality check):** Yard wall closing the court's south side beside the dogleg arrival.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `OPEN_NORTH_COURT` | open_node | (47.2, 70.2, 0) |  | 0 | Open dyers north-court rotation pocket. |
| `COVER_NORTH_01` | cover_cluster | (43.2, 66, 0) | 2.1 × 1.25 | 10 | Merchant crates obscure the cross-link sightline. |
| `PALM_NORTH_01` | decorative_palm | (50.6, 77.2, 0) | 7.8 | 0 | North court silhouette marker. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_L34_NORTH_PLANTER_EAST_L34_NORTH_PLANTER_EAST` | `ASSET_COURT_PLANTER` | `L34_NORTH_PLANTER_EAST` | (52, 76.2, 0) | 0.9 × 0.9 × 1.03 | 11 | KEEP at this transform |
| `PLACE_NORTH_COVER_COVER_NORTH_01` | `ASSET_COVER_GOODS` | `COVER_NORTH_01` | (43.2, 66, 0) | 1.5 × 0.75 × 1 | 10 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_L3R0_NORTH_VESSEL_L34_NORTH_DYERS_BAY_02` | `ASSET_DYERS_CERAMIC_VESSEL` | `L34_NORTH_DYERS_BAY_02` | (42.55, 73.75, 0) | 0.54 × 0.41 × 0.31 | 7 | KEEP at this transform |
| `PLACE_L3R0_NORTH_DYERS_WALL_RACK_L3R0_NORTH_DYERS_BAY_01` | `ASSET_DYERS_HANGING_TEXTILES` | `L3R0_NORTH_DYERS_BAY_01` | (52.17, 73.3, 1.18) | 2.48 × 0.18 × 1.71 | 90 | KEEP at this transform |
| `PLACE_L3R0_NORTH_VAT_EAST_L3R0_NORTH_DYERS_BAY_01` | `ASSET_DYERS_SEALED_VAT` | `L3R0_NORTH_DYERS_BAY_01` | (52.17, 74.3, 0) | 0.56 × 0.57 × 0.66 | 11 | KEEP at this transform |
| `PLACE_L3R0_NORTH_VAT_WEST_L34_NORTH_DYERS_BAY_02` | `ASSET_DYERS_SEALED_VAT` | `L34_NORTH_DYERS_BAY_02` | (42.55, 72.85, 0) | 0.61 × 0.62 × 0.71 | 351 | KEEP at this transform |
| `PLACE_L34_NORTH_WORKSTATION_02_L34_NORTH_WORKSTATION_02` | `ASSET_DYERS_WORKSTATION` | `L34_NORTH_WORKSTATION_02` | (42.1, 77, 0) | 2.94 × 1.52 × 2.31 | 90 | KEEP at this transform |
| `PLACE_L3R0_NORTH_RUG_L3R0_NORTH_DYERS_BAY_01` | `ASSET_GROUND_RUG` | `L3R0_NORTH_DYERS_BAY_01` | (51.45, 73.3, 0) | 2.36 × 1.15 × 0.04 | 358 | KEEP at this transform |
| `PLACE_L3R0_NORTH_DYERS_LINE_L3R0_NORTH_DYERS_LINE_01` | `ASSET_LAUNDRY_LINE` | `L3R0_NORTH_DYERS_LINE_01` | (47, 75.3, 4.7) | 1.3 × 11.3 × 0.85 | 90 | KEEP (shifted 2026-09-07 to y 75.3; garments clear the hammam window at y 73.55..74.45; waiver CW-1AD31D32494E retired) |
| `PLACE_L3R0_NORTH_STALL_L3R0_NORTH_DYERS_BAY_01` | `ASSET_MARKET_STALL` | `L3R0_NORTH_DYERS_BAY_01` | (50.85, 73.2, 0) | 2.09 × 1.28 × 2.09 | 90 | KEEP at this transform |
| `PLACE_NORTH_PALM_PALM_NORTH_01` | `ASSET_PALM` | `PALM_NORTH_01` | (50.6, 77.2, 0) | 3.8 × 3.8 × 7.8 | 0 | KEEP (silhouette marker) |
| `PLACE_L3R0_NORTH_EXIT_SIGN_L3R0_NORTH_EXIT_SIGN_01` | `ASSET_SIGNBOARD` | `L3R0_NORTH_EXIT_SIGN_01` | (41.28, 69.5, 2.35) | 1.4 × 0.12 × 0.38 | 90 | KEEP (route sign) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `L3R0_NORTH_DYERS_LINE_01` | (41.35, 75.3, 4.8) | (52.65, 75.3, 4.6) | 1.3 | L3.R0 authored override: one dyed-textile workshop line seats 0.35 m into the opposing court walls above the 3.5 m clearance and marks the dyers ident |

## 6. Ground, wear and drainage

KEEP `court_limestone_flags_01`; polish across the open centre; indigo drips under the drying station; contact wear under the cover, planter and workstation; flush seams into the three links.

## 7. Roofs and skyline

Hammam 7.0 / 8.19 (no dome); east houses and walls 4.9 / 5.79; palm at (50.6, 77.2). Nothing else.

## 8. Completion checks

- [ ] Hammam door heavy and closed, high window over it; wing door and window on one axis.
- [ ] House: door centred, windows mirrored; yard wall: two niches, rack on hooks; north and south walls: niches at sill 1.3, no gate.
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

