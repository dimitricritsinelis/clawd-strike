# unit-caravan-court · Caravan Court

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-caravan-court --tag r1-before` prints the same walls and must agree. Also called: Caravan Court, caravan yard.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The loading yard: two store doors under one storage head on the west, garden walls with one niche each on the east, the crate stack and cart at the north end under the loading shade and pack line. Red sandstone paving with wheel ruts toward the receiving door.

## 2. Site

### Site · `CARAVAN_COURT` (Caravan Court)

- Rect x 3..15, y 30..48 (12 × 18 m); floor z = 0; floor `red_sandstone_pavement`; authored clear width **4.5 m** (protected).
- Connects: LINK_WEST_MID, SERVICE_NORTH, SERVICE_SOUTH, TEA_RAMP.
- `north` edge: exempt (`short_wall_return`): Only 1.00m of the 12.00m north edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `south` edge: exempt (`architectural_cut_edge`): The 5.00m supported run on the 12.00m south edge frames an authored connector cut and is not a served facade plane.
- `west` edge: frontage `FRONTAGE_CARAVAN_COURT_WEST` → `BLD_CARAVAN_STORES`.
- `east` edge: frontage `FRONTAGE_CARAVAN_COURT_EAST_SOUTH` → `BLD_CARAVAN_YARD_WALL_S`.
- `east` edge: frontage `FRONTAGE_CARAVAN_COURT_EAST_NORTH` → `BLD_CARAVAN_YARD_WALL_N`.

**Existing source.** `assets/source/unit-caravan-court/` holds three GLBs and previews but no `package.json`; reference only.

## 3. Walls

### FRONTAGE_CARAVAN_COURT_WEST  ·  BLD_CARAVAN_STORES (store row, 1 storey)

- **Role:** public front. Niche, door, niche, door, niche under one head at one gap; the two store doors mirror about the court axis.
- **Wall line:** west edge of `CARAVAN_COURT`; x = 3, y = 31.44 .. 46.56 (a runs south to north); length **15.12 m**; street side +X (street lies east of the wall); kit `Wall(F, (3, 31.44), (3, 46.56), faces='E')`.
- **Massing `MASSING_LOW_MERCHANT`:** wall top 4.5 m, depth 4.2 m, roof `flat_parapet`, roof setback 0.45 m, parapet +0.65 m; baseline survey: roof base 4.5, parapet cap 5.590, emitted max 7.618.
- **Facade GLB frame:** width 15.12 m × height 4.5 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `service_storage`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_002`.
- **Corners:** `held`; solid end piers reserved: 1.54 m at a=0, 1.54 m at a=L. Ground head datum 2.5 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; one continuous storage head at 2.5 (the doors' lintel line runs the full length as a 0.20 stone band 2.50..2.70); coping 4.34..4.5; parapet +0.65.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_NICHE_S` | `blind_niche` |  | 2.07 | (3, 33.51) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |  |
| `BAY_DOOR_S` | `door_storage_heavy` | primary receiving door (closed, cart scuffs) | 4.82 | (3, 36.26) | 1.35 × 0.25 × 2.5 | 0 / 2.5 | 0 |  |
| `BAY_NICHE_AXIS` | `blind_niche` |  | 7.56 | (3, 39) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |  |
| `BAY_DOOR_N` | `door_storage_heavy` | second store door (closed) | 10.3 | (3, 41.75) | 1.35 × 0.25 × 2.5 | 0 / 2.5 | 0 |  |
| `BAY_NICHE_N` | `blind_niche` |  | 13.05 | (3, 44.49) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CARAVAN_LOAD_CRATE` at a stack beside each store door, on the pier side; `ASSET_COVER_GOODS` at existing COVER_CARAVAN_01, keep; `ASSET_LAUNDRY_LINE` at existing L34_CARAVAN_PACK_LINE_01, keep.

**Composition.** Two equal locked stores alternate with three blind niches on a single storage-yard head.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, continuous lintel band `ph_stone_trim_white` 2.50..2.70 × 0.08 the full length, coping 4.34..4.5; corners `held`: end piers 0.45 × 0.16. Completion: one storage-yard head across five bays.
2. CREATE two heavy store doors `BAY_DOOR_S/N` 1.35 × 2.5 at a=4.815/10.305: double leaves `ph_weathered_brown_planks`, three iron straps each, a 0.6 m timber bumper rail at 0.35 m across each door (cart protection), threshold 0.06 flush. `BAY_DOOR_S` is the receiving door: heavier scuffs. Completion: two identical closed store doors, the south one more worn.
3. CREATE three blind niches `BAY_NICHE_S/AXIS/N` 1.05 × 1.8 at sill 0.70, a=2.07/7.56/13.05 (SD-18). Completion: read as bricked-up bays between the doors.
4. KEEP the loading cluster (crates at (13.7..14.5, 45.9..46.1), cart at (14.1, 45.05)) and the cover at (5.0, 34.2); the 0.8 m floors in front of both doors stay empty. No shop signs; no awning. Completion: as stated.
5. CREATE one drain spout (SD-13) at a=0.6 and one at a=14.5 with streaks; APPLY wear: dirt band, cart scuffs 0..0.6 at both doors, wheel ruts in the paving finish in front of `BAY_DOOR_S` (ground task). Completion: as listed.

**Why it exists (reality check):** Two locked caravanserai stores with handcart doors (1.35 m, not wagon gates) between blank bays; goods are handled in the yard, not stored against the wall.

### FRONTAGE_CARAVAN_COURT_EAST_SOUTH  ·  BLD_CARAVAN_YARD_WALL_S (compound wall, 1 storey)

- **Role:** compound/service wall. Yard wall flanking the West Mid Link: coping and string course only.
- **Wall line:** east edge of `CARAVAN_COURT`; x = 15, y = 30.54 .. 35.4 (a runs south to north); length **4.86 m**; street side -X (street lies west of the wall); kit `Wall(F, (15, 30.54), (15, 35.4), faces='W')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 4.86 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_ochre_relief`):** wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`.
- **Corners:** `held`; solid end piers reserved: 1.91 m at a=0, 1.91 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 2.43 | (15, 32.97) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping: stone coping course on compound walls`.

**Composition.** A shallow garden enclosure south of West Mid Link holds one high blind niche.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_plastered_wall`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.43. One spout at a=0.4. Completion: garden wall, empty base.

**Why it exists (reality check):** A garden enclosure south of the west-mid link.

### FRONTAGE_CARAVAN_COURT_EAST_NORTH  ·  BLD_CARAVAN_YARD_WALL_N (compound wall, 1 storey)

- **Role:** compound/service wall. Yard wall flanking the West Mid Link: coping and string course only.
- **Wall line:** east edge of `CARAVAN_COURT`; x = 15, y = 41.52 .. 47.46 (a runs south to north); length **5.94 m**; street side -X (street lies west of the wall); kit `Wall(F, (15, 41.52), (15, 47.46), faces='W')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 5.94 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_warmwash_relief`):** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 2.44 m at a=0, 2.44 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 2.97 | (15, 44.49) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** The north enclosure continues the garden wall with a longer span and a warmer repaired plaster field.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_whitewashed_brick_warm` with three 0.6 × 0.6 plaster repair patches (a=1.2 / 3.9 / 5.2, z 1.0..2.2) in `ph_plastered_wall`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.97. The loading shade `CARAVAN_LOAD_SHADE_01` and pack line end at (13.8, 46.6, 4.32) / (14.65, 47.8, 4.35) on this wall's north pier: CREATE two iron eyes there. One spout at a=5.5. Completion: repaired plaster field, one niche, canopy ends bearing on eyes.

**Why it exists (reality check):** The north garden wall, patched where carts have hit it.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_CARAVAN_DISTRICT` | landmark | (14.1, 46, 0) | 1.8 × 1 | 0 | L3.4 authored east loading-bay override: the grounded crate stack joins the basket and pottery supply beat south of the ramp mouth, outside  |
| `OPEN_CARAVAN_CENTER` | open_node | (9.2, 39.2, 0) |  | 0 | Open caravan court turning pocket. |
| `COVER_CARAVAN_01` | cover_cluster | (5, 34.2, 0) | 1.8 × 1.25 | 20 | Cargo stack at the west edge. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_CARAVAN_LOAD_NORTH_LMK_CARAVAN_DISTRICT` | `ASSET_CARAVAN_LOAD_CRATE` | `LMK_CARAVAN_DISTRICT` | (14.52, 46.12, 0) | 0.79 × 0.39 × 0.34 | 9 | KEEP at this transform |
| `PLACE_CARAVAN_LOAD_SOUTH_LMK_CARAVAN_DISTRICT` | `ASSET_CARAVAN_LOAD_CRATE` | `LMK_CARAVAN_DISTRICT` | (13.7, 45.92, 0) | 0.89 × 0.44 × 0.38 | 353 | KEEP at this transform |
| `PLACE_CARAVAN_LOAD_TOP_LMK_CARAVAN_DISTRICT` | `ASSET_CARAVAN_LOAD_CRATE` | `LMK_CARAVAN_DISTRICT` | (14.07, 46, 0.38) | 0.74 × 0.37 × 0.31 | 4 | KEEP at this transform |
| `PLACE_CARAVAN_LOAD_SHADE_CARAVAN_LOAD_SHADE_01` | `ASSET_CLOTH_CANOPY` | `CARAVAN_LOAD_SHADE_01` | (9, 46.6, 4.41) | 2.2 × 9.6 × 0.18 | 90 | KEEP at this transform |
| `PLACE_CARAVAN_COVER_COVER_CARAVAN_01` | `ASSET_COVER_GOODS` | `COVER_CARAVAN_01` | (5, 34.2, 0) | 1.5 × 0.75 × 1 | 20 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_L34_CARAVAN_PACK_LINE_L34_CARAVAN_PACK_LINE_01` | `ASSET_LAUNDRY_LINE` | `L34_CARAVAN_PACK_LINE_01` | (9, 47.8, 4.38) | 1.2 × 11.3 × 0.85 | 90 | KEEP at this transform |
| `PLACE_L34_CARAVAN_CART_L34_CARAVAN_CART_01` | `ASSET_MARKET_CART` | `L34_CARAVAN_CART_01` | (14.1, 45.05, 0) | 1.3 × 0.81 × 0.96 | 261 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `L34_CARAVAN_PACK_LINE_01` | (3.35, 47.8, 4.4) | (14.65, 47.8, 4.35) | 1.2 | L3.4 R4 zone-derived caravan pack-textile line spans opposing edge bands above a 3.5 m hem clearance, adding frame-scale loading identity without ente |
| `CARAVAN_LOAD_SHADE_01` | (4.2, 46.6, 4.5) | (13.8, 46.6, 4.32) | 2.2 | Loading shade spanning the yard between the two ramp-approach piers, seated in both edge bands above the 4.5 m court route so the caravan bay finally  |

## 6. Ground, wear and drainage

KEEP `red_sandstone_pavement`; wheel ruts in the finish from the cart at (14.1, 45.05) to `BAY_DOOR_S` at (3, 36.26); flush ramp transition at y 48; contact wear under the crates and cover.

## 7. Roofs and skyline

Stores 4.5 / 5.59; yard walls 4.9 / 5.79 (kept taller than the stores: M07 decided against lowering). Nothing on the roofs.

## 8. Completion checks

- [ ] Two identical store doors, the south one more worn; three niches at sill 0.7.
- [ ] Loading shade and pack line ends bear on eyes on the walls; nothing in the turning pocket at (9.2, 39.2).
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

