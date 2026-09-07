# unit-spice-street · Spice Street

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-spice-street --tag r1-before` prints the same walls and must agree. Also called: Spice Street, spice row.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The market street: busy west, quiet east. Three spice counters under three awnings on the west with houses above; a low stone wholesale row on the east with a household room set back at the north end (S1). Two canopies and three laundry lines cross the 12 m street from the west parapet to roof ties on the east, leaving sky between them. The fountain is glimpsed through the north end under the cloth. Palette: warm plaster west, pale coursed stone east, brown timber, teal louvres, cream and rust cloth.

## 2. Site

### Site · `SPICE_STREET` (Spice Street)

- Rect x 21..33, y 14..32 (12 × 18 m); floor z = 0; floor `spice_laid_stone_01`; authored clear width **6 m** (protected).
- Connects: FOUNTAIN_COURT, SPAWN_A_COURTYARD.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 12.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 12.00m south edge; the full face remains an authored traversal opening.
- `west` edge: frontage `FRONTAGE_SPICE_STREET_WEST` → `BLD_SPICE_ROW_W`.
- `east` edge: frontage `FRONTAGE_SPICE_STREET_EAST` → `BLD_SPICE_ROW_E`.

**Existing source.** `assets/source/unit-spice-street/` holds a hand-modelled `build.py`, `spice-west.glb`, `spice-east.glb` and a `package.json` that was never applied (the facade manifest is empty). Treat it as reference for material setup only; rebuild both faces with `facade_kit` to this sheet.

## 3. Walls

### FRONTAGE_SPICE_STREET_WEST  ·  BLD_SPICE_ROW_W (shop row, 2 storeys)

- **Role:** public front. Three distinct spice trades and two closed access doors beneath five complete upper shutters and three broad stepped parcel roofs.
- **Wall line:** west edge of `SPICE_STREET`; x = 21, y = 15.44 .. 30.56 (a runs south to north); length **15.12 m**; street side +X (street lies east of the wall); kit `Wall(F, (21, 15.44), (21, 30.56), faces='E')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 7, parapet cap 8.190, emitted max 10.668.
- **Facade GLB frame:** width 15.12 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `active_merchant`):** wall `ph_painted_plaster_warm`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `open`; solid end piers reserved: 0.6 m at a=0, 1.23 m at a=L. Ground head datum 2.7 m.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28 m sandstone (SD-01); awning ledger datum 2.85 m; continuous sill course 3.50..3.62 m under the five shutters (SD-02 variant); wall top 7.0 with coping 6.84..7.0; S1 parcel roofs above (section 7).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `shop_recess_market` | SP-D spice drawers (placed `ASSET_SPICE_DRAWERS`) | 1.8 | (21, 17.24) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_01` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`) | 1.8 | (21, 17.24) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_LOUVERED (MOUNT_SPICE_WINDOW_1) |
| `GROUND_02` | `door_shop_timber` | closed household door, south tenancy | 4.68 | (21, 20.12) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_02` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`) | 4.68 | (21, 20.12) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_PANELED (MOUNT_SPICE_WINDOW_2) |
| `GROUND_03` | `shop_recess_market` | SP-G grain balance (placed `ASSET_GRAIN_BALANCE`) | 7.56 | (21, 23) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_03` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`) | 7.56 | (21, 23) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_LOUVERED (MOUNT_SPICE_WINDOW_3) |
| `GROUND_04` | `shop_recess_market` | SP-A apothecary (placed `ASSET_APOTHECARY`) | 10.44 | (21, 25.88) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_04` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-W woven infill (placed `ASSET_SHUTTER_WOVEN`) | 10.44 | (21, 25.88) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_WOVEN (MOUNT_SPICE_WINDOW_4) |
| `GROUND_05` | `door_shop_timber` | closed household door, north tenancy | 13.32 | (21, 28.76) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_05` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`) | 13.32 | (21, 28.76) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_PANELED (MOUNT_SPICE_WINDOW_5) |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SHUTTER_LOUVERED` at MOUNT_SPICE_WINDOW_1; `ASSET_SHUTTER_PANELED` at MOUNT_SPICE_WINDOW_2; `ASSET_SHUTTER_LOUVERED` at MOUNT_SPICE_WINDOW_3; `ASSET_SHUTTER_WOVEN` at MOUNT_SPICE_WINDOW_4; `ASSET_SHUTTER_PANELED` at MOUNT_SPICE_WINDOW_5; `ASSET_SPICE_DRAWERS` at SPICE_W_SHOP_1; `ASSET_GRAIN_BALANCE` at MOUNT_SPICE_COUNTER_3; `ASSET_APOTHECARY` at MOUNT_SPICE_COUNTER_4.

**Composition.** Three spice tenancies and two closed household/store access doors form one mixed-use block, with five aligned upper shutters.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB (`facade_kit`): skin `ph_painted_plaster_warm` 0..7.0, plinth `ph_sandstone_blocks_05` 0..0.28 × 0.14 proud, sill course `ph_stone_trim_sandstone` 3.50..3.62 × 0.10 proud, coping 6.84..7.0 × 0.18 proud, parcel joints as 0.02 m plaster steps at a=6.12 and a=11.88 (between bays, never through a frame). Corners are `open`: the return kits own both ends, so no end pilasters. Completion: one plaster field with three legible parcels.
2. CREATE three shop recesses `GROUND_01/03/04` 2.4 wide × 2.7 high × 1.35 deep at a=1.80/7.56/10.44: stone jambs 0.22 × 0.29 proud in 8 courses of 0.31, stone lintel 2.9 wide × 0.25 at head 2.7, timber head beam 0.17 under it, dark timber back at depth 1.35, floor 0.08 m timber deck (the placed counters sit at z 0.08). Leave the recess empty: the counters `ASSET_SPICE_DRAWERS` (a=1.80), `ASSET_GRAIN_BALANCE` (a=7.56) and `ASSET_APOTHECARY` (a=10.44) are placed assets 1.72 × 0.50 × 1.70 against the back plane. Completion: each counter sits inside its recess with 0.34 m of reveal either side and its top shelf under the head beam.
3. CREATE two closed household doors `GROUND_02/05` 1.15 × 2.7 at a=4.68 and a=13.32 per SD-05: eight vertical planks `ph_rough_pine_door`, two iron straps, ring pull at 1.05 m, stone jambs 0.14, threshold flush. Completion: both read as house doors, not shop doors; nothing stands within 0.8 m in front.
4. CREATE five upper window rebates `STORY_1_WINDOW_01..05` 1.6 × 1.65 at sill 3.68 / head 5.33 on the five axes: stone frame 0.10 all round, sill slab 0.06 high × 0.08 proud sitting on the sill course, reveal 0.135 deep, dark plaster back. Do NOT model shutters: the placed `ASSET_SHUTTER_*` assets (SH-L / SH-P / SH-L / SH-W / SH-P at z 3.68) fill the rebates. Completion: every shutter sits inside its frame with the sill under it, none floats in front of plaster.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 2.85 spanning a=0.55..3.05, projection 1.10 m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01`; same over `GROUND_03` (a=6.31..8.81) and `GROUND_04` (a=9.19..11.69). No awning over the doors. Completion: three awnings, hems at 2.48 m, brackets bear on the jamb stones, cloth clears the sign boards.
6. CREATE sign brackets (SD-09) behind the two placed boards `SPICE_W_SIGN_1` (a=1.80, z 3.20..3.50) and `SPICE_W_SIGN_3` (a=7.56): two 0.06 × 0.06 timber stubs 0.18 proud at ±0.9 m of the axis, z 3.35. No sign on `GROUND_04` (goods identify it). Completion: both boards visibly hang from brackets.
7. KEEP goods: `PLACE_SPICE_COVER_*` cluster at (23.0, 27.6) is gameplay cover; `BPL16_SPICE_W_STOCK_GROUND_02` and `B4_SPICE_W_CRATES_GROUND_04` anchors stay dormant (no new floor stock). Completion: nothing on the paving in front of this wall except the cover cluster.
8. APPLY wear (SD-12): dirt band 0..1.5 m; hand polish on the door jambs 0.9..1.4 m; spice dust staining 0..0.4 m under the three recesses only; sun bleach on the upper field (this face looks east, morning sun): light. Completion: wear differs between the three shops and the two doors.
9. KEEP the S1 parcel roofs already placed (`ASSET_SPICE_ROOF_SOUTH/MIDDLE/NORTH` at x 18.60, z 7.0: caps 8.79 / 9.59 / 8.19) and the three `ASSET_ROOF_TIE_*` supports on the east side. Completion: the GLB coping meets the roof-asset bases without a gap or a double slab.

**Why it exists (reality check):** Three spice tenancies each have a counter recess with a lockable timber back and a stair to the room above (upper shutters over every axis); the two plain doors are the households' street doors, one per end so each family has its own entrance. Awnings shade the counters facing the morning sun; the doors need none.

### FRONTAGE_SPICE_STREET_EAST  ·  BLD_SPICE_ROW_E (shop row, 1 storey)

- **Role:** public front. Low wholesale frontage retained beneath the northern setback room, two closed upper windows and roof-supported shade ties.
- **Wall line:** east edge of `SPICE_STREET`; x = 33, y = 15.44 .. 30.56 (a runs south to north); length **15.12 m**; street side -X (street lies west of the wall); kit `Wall(F, (33, 15.44), (33, 30.56), faces='W')`.
- **Massing `MASSING_LOW_MERCHANT`:** wall top 4.5 m, depth 4.2 m, roof `flat_parapet`, roof setback 0.45 m, parapet +0.65 m; baseline survey: roof base 4.5, parapet cap 5.590, emitted max 7.518.
- **Facade GLB frame:** width 15.12 m × height 4.5 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_cut_stone`):** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 0.6 m at a=0, 0.6 m at a=L. Ground head datum 2.7 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28 m; string course 2.90 m (heads 2.25); coping 4.34..4.5 m; parapet cap 5.59 (baseline); the S1 setback room sits behind the north half (section 7).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `door_storage_heavy` → `door_residential_timber` | closed sack-store door 1.35 × 2.5 (handcart parked outside) | 1.12 | (33, 16.56) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 | ASSET_MARKET_CART (existing B4_SPICE_E_CART at GROUND_01, keep) |
| `GROUND_02` | `blind_niche` | blind niche, sill 0.45 | 4.34 | (33, 19.78) | 1.05 × 0.18 × 1.8 | 0.45 / 2.25 | 0 |  |
| `GROUND_03` | `door_storage_heavy` → `door_residential_timber` | primary closed store door 1.35 × 2.5 with wicket | 7.56 | (33, 23) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 | ASSET_SPICE_GOODS (existing at GROUND_03 and GROUND_04, keep) |
| `GROUND_04` | `door_residential_timber` | closed household door 1.05 × 2.25 (stair to the setback room behind) | 10.78 | (33, 26.22) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 | ASSET_SPICE_GOODS (existing at GROUND_03 and GROUND_04, keep) |
| `GROUND_05` | `blind_niche` | blind niche, sill 0.45 | 13.99 | (33, 29.43) | 1.05 × 0.18 × 1.8 | 0.45 / 2.25 | 0 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_MARKET_CART` at existing B4_SPICE_E_CART at GROUND_01, keep; `ASSET_SPICE_GOODS` at existing at GROUND_03 and GROUND_04, keep.

**Composition.** A low wholesale row has three closed entries and two blind panels, with one northern setback household/store room under S1.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05` 0..4.5 (coursed stone, quiet side), plinth 0..0.28, string course 2.84..2.96 × 0.10, coping 4.34..4.50 × 0.18; corners `held`: two end piers 0.45 × 0.16 full height at a=0.225 and a=14.895. Completion: reads as a low stone wholesale row, one material family, no plaster.
2. CREATE two closed sack-store doors `GROUND_01/03` as `door_storage_heavy` 1.35 × 2.5 at a=1.125/7.56 (double leaves `ph_weathered_brown_planks`, three iron straps, bumper rail 0.35, threshold flush; a handcart needs the width) and one closed household door `GROUND_04` as `door_residential_timber` 1.05 × 2.25 at a=10.777 (the stair to the setback room). `GROUND_03` is the primary store door: add a 0.35 × 0.35 iron-grille wicket at 1.5 m. `GROUND_01` gets cart scuffs 0..0.6 on both jambs. Piers between bay edges stay ≥ 1.67 m. Completion: two wide store doors and one narrow house door, all closed.
3. CREATE two blind niches `GROUND_02/05` 1.05 × 1.8, sill 0.45, at a=4.343/13.995 (SD-18). Completion: read as bricked-up openings.
4. KEEP the wall-base stock at the four `SPICE_E_WALLBASE_STOCK_*` anchors (crates, sacks, baskets, pots at x≈32.1..32.3) and the handcart at (31.88, 16.57). Add nothing. Completion: all stock within 0.9 m of the wall; the 0.8 m door floors in front of a=1.125/7.56/10.777 stay empty (the cart is 0.9 m north of `GROUND_01`, keep it there).
5. No awnings, no signs on this face (quiet side). Completion: none exist.
6. KEEP the five roof-tie supports `ASSET_ROOF_TIE_*` at x 34.88 (z 5.48..5.59) that receive the canopies and lines; the GLB coping must pass under their feet. Completion: every tie foot bears on coping or parapet, none floats.
7. APPLY wear: dirt band; cart scuffs at `GROUND_01`; drip streak from the two tie feet nearest the doors; strong sun bleach on the upper stone (this face looks west, afternoon sun). Completion: as listed.
8. KEEP the S1 setback room `ASSET_SPICE_UPPER_ROOM` at (35.70, 27.28, 4.76) (roof 7.0, cap 7.71, two closed windows at y 25.8 / 28.1, sill 5.40). Completion: the room's base sits on the 4.76 slab with no gap.

**Why it exists (reality check):** Wholesale sack stores: three plain doors, no windows at street level (stock, not living), stock waiting outside for the cart. A household lives in the setback room at the north end and reaches it by the stair behind `GROUND_04`.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_SPICE_DISTRICT` | landmark | (21.68, 23, 0) | 1.5 × 0.85 | 0 | Authored Ground 03 override: the spice display is centered inside the 2.4 m west merchant recess, with its sack and brass pot grounded at th |
| `LMK_SPICE_GATE_01` | hero_landmark | (27, 14.95, 0) | 12.8 × 9.1 | 180 | Lane-spanning southern gate that terminates Spawn A and opens Spice Street. Its front elevation sits on the y=14 courtyard wall plane and it |
| `COVER_SPICE_01` | cover_cluster | (23, 27.6, 0) | 1.8 × 1.15 | 15 | Sacks and baskets at the route edge. |
| `LANTERN_SPICE_01` | lantern_anchor | (21.45, 16.2, 3.8) | 0.42 × 0.72 | 90 | CC0 wooden lantern at the spice district entrance. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_SPICE_COUNTER_4_MOUNT_SPICE_COUNTER_4` | `ASSET_APOTHECARY` | `MOUNT_SPICE_COUNTER_4` | (20.75, 25.88, 0.08) | 1.72 × 0.5 × 1.7 | 270 | KEEP at this transform |
| `PLACE_SPICE_BARREL_COVER_SPICE_01` | `ASSET_CC0_BARREL` | `COVER_SPICE_01` | (21.9, 27.65, 0) | 0.67 × 0.68 × 0.78 | 9 | KEEP; the barrel overlaps the cover core by design (waiver CW-7599CB836F04 stays) |
| `PLACE_SPICE_BASKET_COVER_SPICE_01` | `ASSET_CC0_BASKET` | `COVER_SPICE_01` | (23.78, 27.98, 0) | 0.38 × 0.27 × 0.22 | 27 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_BASKET_MID_SPICE_E_WALLBASE_STOCK_02` | `ASSET_CC0_BASKET` | `SPICE_E_WALLBASE_STOCK_02` | (31.89, 22.1, 0) | 0.38 × 0.27 × 0.22 | 262 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_BASKET_NORTH_SPICE_E_WALLBASE_STOCK_04` | `ASSET_CC0_BASKET` | `SPICE_E_WALLBASE_STOCK_04` | (32, 27.98, 0) | 0.39 × 0.28 × 0.23 | 286 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_BRASS_POT_SPICE_E_WALLBASE_STOCK_04` | `ASSET_CC0_BRASS_POT` | `SPICE_E_WALLBASE_STOCK_04` | (31.88, 28.42, 0) | 0.3 × 0.3 × 0.29 | 270 | KEEP at this transform |
| `PLACE_SPICE_LANTERN_LANTERN_SPICE_01` | `ASSET_CC0_LANTERN` | `LANTERN_SPICE_01` | (21.45, 16.2, 3.8) | 0.22 × 0.23 × 0.53 | 90 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_POTTERY_NORTH_SPICE_E_WALLBASE_STOCK_04` | `ASSET_CC0_POTTERY` | `SPICE_E_WALLBASE_STOCK_04` | (32.18, 27.32, 0) | 0.66 × 0.5 × 0.37 | 258 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_POTTERY_SOUTH_SPICE_E_WALLBASE_STOCK_01` | `ASSET_CC0_POTTERY` | `SPICE_E_WALLBASE_STOCK_01` | (32.1, 18.65, 0) | 0.62 × 0.48 × 0.35 | 284 | KEEP at this transform |
| `PLACE_SPICE_POTTERY_COVER_SPICE_01` | `ASSET_CC0_POTTERY` | `COVER_SPICE_01` | (23.76, 27.22, 0) | 0.52 × 0.4 × 0.3 | 15 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_SACK_SPICE_E_WALLBASE_STOCK_03` | `ASSET_CC0_SPICE_SACK` | `SPICE_E_WALLBASE_STOCK_03` | (32.14, 24.89, 0) | 0.47 × 0.47 × 0.44 | 279 | KEEP at this transform |
| `PLACE_SPICE_CANOPIES_CANOPY_SPICE_01` | `ASSET_CLOTH_CANOPY` | `CANOPY_SPICE_01` | (27, 20.58, 5.67) | 3.6 × 12 × 0.18 | 90 | KEEP at this transform |
| `PLACE_SPICE_CANOPIES_CANOPY_SPICE_02` | `ASSET_CLOTH_CANOPY` | `CANOPY_SPICE_02` | (27, 26.48, 5.67) | 3.2 × 12 × 0.18 | 90 | KEEP at this transform |
| `PLACE_SPICE_COVER_CORE_COVER_SPICE_01` | `ASSET_COVER_GOODS` | `COVER_SPICE_01` | (23, 27.6, 0) | 1.5 × 0.75 × 1 | 15 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_SPICE_E_STOCK_CRATE_BASE_SPICE_E_WALLBASE_STOCK_01` | `ASSET_DECORATIVE_CRATE` | `SPICE_E_WALLBASE_STOCK_01` | (32.25, 17.76, 0) | 0.83 × 0.41 × 0.35 | 275 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_CRATE_MID_SPICE_E_WALLBASE_STOCK_03` | `ASSET_DECORATIVE_CRATE` | `SPICE_E_WALLBASE_STOCK_03` | (32.25, 24.11, 0) | 0.78 × 0.38 × 0.33 | 264 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_CRATE_STACK_SPICE_E_WALLBASE_STOCK_01` | `ASSET_DECORATIVE_CRATE` | `SPICE_E_WALLBASE_STOCK_01` | (32.17, 17.81, 0.35) | 0.71 × 0.35 × 0.3 | 259 | KEEP at this transform |
| `PLACE_SPICE_COUNTER_3_MOUNT_SPICE_COUNTER_3` | `ASSET_GRAIN_BALANCE` | `MOUNT_SPICE_COUNTER_3` | (20.75, 23, 0.08) | 1.72 × 0.5 × 1.64 | 270 | KEEP at this transform |
| `PLACE_B4_SPICE_COVER_RUG_COVER_SPICE_01` | `ASSET_GROUND_RUG` | `COVER_SPICE_01` | (23, 27.6, 0) | 2.25 × 1.36 × 0.04 | 11 | KEEP (gameplay cover cluster; waiver CW-13333D7BED23 stays) |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_01` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_SPICE_01` | (27, 18.16, 5.95) | 1.4 × 12 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_02` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_SPICE_02` | (27, 23.76, 6) | 1.55 × 12 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_03` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_SPICE_03` | (27, 28.75, 6.15) | 1.2 × 12 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B4_SPICE_CART_B4_SPICE_E_CART_GROUND_01` | `ASSET_MARKET_CART` | `B4_SPICE_E_CART_GROUND_01` | (31.88, 16.57, 0) | 1.25 × 0.78 × 0.92 | 277 | KEEP at this transform |
| `PLACE_SUPPORT_CANOPY_SPICE_01_MOUNT_SUPPORT_CANOPY_SPICE_01` | `ASSET_ROOF_TIE_555` | `MOUNT_SUPPORT_CANOPY_SPICE_01` | (34.88, 20.58, 5.48) | 3.75 × 0.16 × 0.32 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_CANOPY_SPICE_02_MOUNT_SUPPORT_CANOPY_SPICE_02` | `ASSET_ROOF_TIE_555` | `MOUNT_SUPPORT_CANOPY_SPICE_02` | (34.88, 26.48, 5.48) | 3.75 × 0.16 × 0.32 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_01_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01` | `ASSET_ROOF_TIE_590` | `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01` | (34.88, 18.16, 5.59) | 3.75 × 0.16 × 0.45 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_02_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02` | `ASSET_ROOF_TIE_595` | `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02` | (34.88, 23.76, 5.59) | 3.75 × 0.16 × 0.5 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_03_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03` | `ASSET_ROOF_TIE_610` | `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03` | (34.88, 28.75, 5.59) | 3.75 × 0.16 × 0.65 | 180 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_1_MOUNT_SPICE_WINDOW_1` | `ASSET_SHUTTER_LOUVERED` | `MOUNT_SPICE_WINDOW_1` | (20.98, 17.24, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_3_MOUNT_SPICE_WINDOW_3` | `ASSET_SHUTTER_LOUVERED` | `MOUNT_SPICE_WINDOW_3` | (20.98, 23, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_2_MOUNT_SPICE_WINDOW_2` | `ASSET_SHUTTER_PANELED` | `MOUNT_SPICE_WINDOW_2` | (20.98, 20.12, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_5_MOUNT_SPICE_WINDOW_5` | `ASSET_SHUTTER_PANELED` | `MOUNT_SPICE_WINDOW_5` | (20.98, 28.76, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_4_MOUNT_SPICE_WINDOW_4` | `ASSET_SHUTTER_WOVEN` | `MOUNT_SPICE_WINDOW_4` | (20.98, 25.88, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_SIGNS_SPICE_W_SIGN_1` | `ASSET_SIGNBOARD` | `SPICE_W_SIGN_1` | (21.12, 17.24, 3.2) | 2.2 × 0.12 × 0.3 | 90 | KEEP; the GLB adds the two bracket stubs behind it (SD-09) |
| `PLACE_SPICE_SIGNS_SPICE_W_SIGN_3` | `ASSET_SIGNBOARD` | `SPICE_W_SIGN_3` | (21.12, 23, 3.2) | 2.2 × 0.12 × 0.3 | 90 | KEEP; the GLB adds the two bracket stubs behind it (SD-09) |
| `PLACE_SPICE_COUNTER_1_SPICE_W_SHOP_1` | `ASSET_SPICE_DRAWERS` | `SPICE_W_SHOP_1` | (20.75, 17.24, 0.08) | 1.72 × 0.5 × 1.7 | 270 | KEEP at this transform |
| `PLACE_SPICE_GATE_LMK_SPICE_GATE_01` | `ASSET_SPICE_GATE` | `LMK_SPICE_GATE_01` | (27, 14.95, 0) | 12.8 × 1.9 × 9.1 | 180 | KEEP (landmark kit; corner returns belong to the two Spice owners) |
| `PLACE_SPICE_E_STOCK_BINS_SPICE_E_WALLBASE_STOCK_02` | `ASSET_SPICE_GOODS` | `SPICE_E_WALLBASE_STOCK_02` | (32.21, 21.3, 0) | 1.5 × 0.75 × 0.85 | 270 | KEEP at this transform |
| `PLACE_SPICE_ROOF_MIDDLE_MOUNT_SPICE_ROOF_MIDDLE` | `ASSET_SPICE_ROOF_MIDDLE` | `MOUNT_SPICE_ROOF_MIDDLE` | (18.6, 24.44, 7) | 4.8 × 5.76 × 2.59 | 180 | KEEP at this transform |
| `PLACE_SPICE_ROOF_NORTH_MOUNT_SPICE_ROOF_NORTH` | `ASSET_SPICE_ROOF_NORTH` | `MOUNT_SPICE_ROOF_NORTH` | (18.6, 28.94, 7) | 4.8 × 3.24 × 1.19 | 180 | KEEP at this transform |
| `PLACE_SPICE_ROOF_SOUTH_MOUNT_SPICE_ROOF_SOUTH` | `ASSET_SPICE_ROOF_SOUTH` | `MOUNT_SPICE_ROOF_SOUTH` | (18.6, 18.5, 7) | 4.8 × 6.12 × 1.79 | 180 | KEEP at this transform |
| `PLACE_SPICE_UPPER_ROOM_MOUNT_SPICE_UPPER_ROOM` | `ASSET_SPICE_UPPER_ROOM` | `MOUNT_SPICE_UPPER_ROOM` | (35.7, 27.28, 4.76) | 3 × 6.56 × 2.95 | 180 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `CANOPY_SPICE_01` | (21, 20.58, 5.8) | (33, 20.58, 5.55) | 3.6 | Hung above the upper-window heads so the span reads over the openings, not across them. |
| `CANOPY_SPICE_02` | (21, 26.48, 5.8) | (33, 26.48, 5.55) | 3.2 | Hung above the upper-window heads so the span reads over the openings, not across them. |
| `B6_LAUNDRY_SPICE_01` | (21, 18.16, 6) | (33, 18.16, 5.9) | 1.4 | Hung above the upper-window heads so the span reads over the openings, not across them. |
| `B6_LAUNDRY_SPICE_02` | (21, 23.76, 6.05) | (33, 23.76, 5.95) | 1.55 | Mid-lane line between the two cloth spans. Hung above the upper-window heads so the overhead layer reads as one continuous rhythm instead of two isola |
| `B6_LAUNDRY_SPICE_03` | (21, 28.75, 6.2) | (33, 28.75, 6.1) | 1.2 | North line closes the lane sequence at the Fountain Court transition. Hung above the upper-window heads. |

Canopy ends on the west bear on the S1 parapet coping (z 5.8 ≈ top of the wall + ledger 0.10 × 0.10 timber, 1.2 m long, iron eyes); the east ends bear on the placed `ASSET_ROOF_TIE_*` at x 34.88. Cloth `ph_hessian_230` for the canopies (cream), rust and indigo garments on the lines. Sag 0.35 max at mid-span; hem ≥ 4.9 m over the street. Nothing hangs from the canopies.

## 6. Ground, wear and drainage

KEEP `spice_laid_stone_01`. Finish: flush seams at y 14 (Spice Gate threshold) and y 32; a 0.6 m worn band along the west counters (foot traffic); spice-dust tint 0..0.4 m out from the three west recesses; cart ruts 0.05 deep in the finish (no collision) from the east cart at (31.88, 16.57) toward the gate; contact wear under the cover cluster and the wall-base stock.

## 7. Roofs and skyline

S1 adopted: west parcels y 15.44..21.56 / 21.56..27.32 / 27.32..30.56 with roof bases 7.6 / 8.4 / 7.0 and caps 8.79 / 9.59 / 8.19 (placed `ASSET_SPICE_ROOF_SOUTH/MIDDLE/NORTH`, KEEP); east stays 4.5 / 5.59 with the setback room (placed `ASSET_SPICE_UPPER_ROOM`, cap 7.71, KEEP). Nothing else on the roofs. From (27, 16) looking north and (27, 30) looking south the three west caps must step; from the fountain the setback room must read behind the east parapet.

## 8. Completion checks

- [ ] Three west awnings, zero east awnings; two signs on the west (bays 01 and 03), none elsewhere.
- [ ] Three counters seated in their recesses with 0.34 m reveal either side; shutters seated in all five upper rebates.
- [ ] Canopy and line ends bear on ledgers or roof ties; hems ≥ 4.9 m; sky visible between spans from both street ends.
- [ ] East doors have empty 0.8 m floors; stock stays within 0.9 m of the east wall.
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

