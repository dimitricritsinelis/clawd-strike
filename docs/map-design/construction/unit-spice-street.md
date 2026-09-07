# unit-spice-street · Spice Street

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Spice Street, spice row.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The market street: busy west, quiet east. Three spice counters under three awnings on the west with houses above; a low stone wholesale row on the east with a household room set back at the north end (S1). Two canopies and three laundry lines cross the 12 m street from west wall ledgers to roof ties on the east, leaving sky between them. The fountain is glimpsed through the north end under the cloth. Palette: warm cream and sandy-tan shop plaster with a faded earth-red north household on the west, sun-aged coursed stone east, weathered brown timber, teal louvres, cream and rust cloth; traffic and spice use show at the trade edge, not as a brown wash.

**Character schedule (build with the numbered tasks):**

- Three plaster tenancies on the west are scheduled in wall task 1; the lower east remains coursed sandstone. Warm cream, sandy tan and faded earth-red must be distinguishable under the same neutral daylight. Keep all five shutter colors and the existing stepped parcel roofs.
- West plaster repairs: replace only the receiving skin inside a=3.48..3.84, z=0.38..1.05 with `ph_worn_plaster_sun`; a=5.52..5.91, z=0.46..1.22 with `ph_plastered_wall`; and a=14.05..14.56, z=0.34..0.78 with `ph_beige_wall_002`. These are trowelled repairs at shop edges and the household door, not identical stain cards. SD-21 tapers their irregular edges into the existing skin; no extra slab on top.
- CREATE two fitted woven back-wall panels (SD-22) inside west recesses, fixed above the retained counters: GROUND_01 a=0.84..2.70, z=1.88..2.43, receiving timber back out=-1.35; GROUND_04 a=9.61..11.30, z=1.93..2.39 on the same back plane. Use the existing Project-Original `levantine_rug_albedo_v1.jpg` via SD-22, retaining its rust/indigo/cream woven pattern, 0.008 m thickness and 0.012 m shallow drape toward the street; rear cloth at peg seats touches out=-1.35 and both thickness and drape stay toward the street inside the recess; hem stays within those bounds. Four timber pegs, diameter 0.025 and depth 0.05, at 0.08 from each top/bottom corner, enter the back wall. No textile crosses a counter or opening head. GROUND_03 retains its exposed timber back, making grain handling distinct from the other shops.
- Retained sacks, baskets, stock, laundry and the cover rug carry street activity at their existing anchors. Add no paving stock. The grain shop gets pale swept dust, spice drawers rusty spice residue, and the apothecary a wiped edge; do not repeat the same stain at all three.

## 2. Site

### Site · `SPICE_STREET` (Spice Street)

- Rect x 21..33, y 14..32 (12 × 18 m); floor z = 0; floor `spice_laid_stone_01`; authored clear width **6 m** (protected).
- Connects: FOUNTAIN_COURT, SPAWN_A_COURTYARD.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 12.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 12.00m south edge; the full face remains an authored traversal opening.
- `west` edge: frontage `FRONTAGE_SPICE_STREET_WEST` → `BLD_SPICE_ROW_W`.
- `east` edge: frontage `FRONTAGE_SPICE_STREET_EAST` → `BLD_SPICE_ROW_E`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-spice-street/` | `SPICE_STREET` | `["east", "west"]` | `unit-spice-street.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-spice-street/` contains the applied trial `build.py`, `package.json` and `unit-spice-street.glb`, which predate this character revision. The progress index records its open door, niche and unsupported-wear defects and missing context evidence. Revise that existing section source to this sheet during the next authorized implementation; do not treat the older face exports or the trial previews as the revised result.

## 3. Walls

### FRONTAGE_SPICE_STREET_WEST  ·  BLD_SPICE_ROW_W (shop row, 2 storeys)

- **Role:** shop row. Three spice tenancies each have a counter recess with a lockable timber back and a stair to the room above (upper shutters over every axis); the two plain doors are the households' street doors, one per end so each family has its own entrance. Awnings shade the counters facing the morning sun; the doors need none.
- **Wall line:** west edge of `SPICE_STREET`; x = 21, y = 15.44 .. 30.56 (a runs south to north); length **15.12 m**; street side +X (street lies east of the wall); kit `Wall(F, (21, 15.44), (21, 30.56), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_painted_plaster_warm`, trim `ph_stone_trim_sandstone`, timber `ph_worn_planks`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 2.7 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28 m sandstone (SD-01); awning ledger datum 2.85 m; continuous sill course 3.50..3.62 m under the five shutters (SD-02 variant); wall top 7.0 with coping 6.84..7.0; S1 parcel roofs above (section 7).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `shop_recess_market` | SP-D spice drawers (placed `ASSET_SPICE_DRAWERS`) | 1.8 | (21, 17.24) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_01` | `window_shuttered` | SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`) | 1.8 | (21, 17.24) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |
| `GROUND_02` | `door_shop_timber` | closed household door, south tenancy | 4.68 | (21, 20.12) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_02` | `window_shuttered` | SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`) | 4.68 | (21, 20.12) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |
| `GROUND_03` | `shop_recess_market` | SP-G grain balance (placed `ASSET_GRAIN_BALANCE`) | 7.56 | (21, 23) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_03` | `window_shuttered` | SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`) | 7.56 | (21, 23) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |
| `GROUND_04` | `shop_recess_market` | SP-A apothecary (placed `ASSET_APOTHECARY`) | 10.44 | (21, 25.88) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_04` | `window_shuttered` | SH-W woven infill (placed `ASSET_SHUTTER_WOVEN`) | 10.44 | (21, 25.88) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |
| `GROUND_05` | `door_shop_timber` | closed household door, north tenancy | 13.32 | (21, 28.76) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_05` | `window_shuttered` | SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`) | 13.32 | (21, 28.76) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.8, 2.4, 0, 2.7), (1.8, 1.6, 3.68, 1.65), (4.68, 1.15, 0, 2.7), (4.68, 1.6, 3.68, 1.65), (7.56, 2.4, 0, 2.7), (7.56, 1.6, 3.68, 1.65), (10.44, 2.4, 0, 2.7), (10.44, 1.6, 3.68, 1.65), (13.32, 1.15, 0, 2.7), (13.32, 1.6, 3.68, 1.65)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SHUTTER_LOUVERED` at MOUNT_SPICE_WINDOW_1; `ASSET_SHUTTER_PANELED` at MOUNT_SPICE_WINDOW_2; `ASSET_SHUTTER_LOUVERED` at MOUNT_SPICE_WINDOW_3; `ASSET_SHUTTER_WOVEN` at MOUNT_SPICE_WINDOW_4; `ASSET_SHUTTER_PANELED` at MOUNT_SPICE_WINDOW_5; `ASSET_SPICE_DRAWERS` at SPICE_W_SHOP_1; `ASSET_GRAIN_BALANCE` at MOUNT_SPICE_COUNTER_3; `ASSET_APOTHECARY` at MOUNT_SPICE_COUNTER_4.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish (`facade_kit`): three apertured plaster fields 0..7.0: a=0..6.12 `ph_painted_plaster_warm` (warm cream, face out=0.02), a=6.12..11.88 `ph_beige_wall_002` (sandy tan, out=0.04), a=11.88..15.12 `ph_red_plaster_weathered` (faded earth-red household plaster, out=0.02); plinth `ph_sandstone_blocks_05` 0..0.28 × 0.14 proud, sill course `ph_stone_trim_sandstone` 3.50..3.62 × 0.10 proud, coping 6.84..7.0 × 0.18 proud, parcel joints as 0.02 m plaster steps at a=6.12 and a=11.88 (between bays, never through a frame). Corners are `open`: the return kits own both ends, so no end pilasters. Completion: three legible tenancies with different plaster grain and tone, continuous construction datums, and no full-height decorative seams through openings.
2. CREATE three shop recesses `GROUND_01/03/04` 2.4 wide × 2.7 high × 1.35 deep at a=1.80/7.56/10.44: stone jambs 0.22 wide with 0.29 m street projection, 2.70 m high with course heights bottom to top per shop: GROUND_01 [0.30, 0.34, 0.36, 0.31, 0.37, 0.33, 0.35, 0.34], GROUND_03 [0.38, 0.40, 0.36, 0.41, 0.39, 0.37, 0.39], GROUND_04 [0.28, 0.32, 0.29, 0.31, 0.30, 0.27, 0.33, 0.29, 0.31]. Reverse each sequence for the opposite jamb, retaining the 2.70 m head and SD-21 edge finish; each jamb extends from 1.35 m behind the wall to 0.29 m in front. Stone lintel 2.90 wide at z 2.70..2.95, front 0.29 proud; timber head at z 2.53..2.70. Dark timber back at depth 1.35. Timber deck top z 0.08, spanning from depth 1.35 behind the wall to 0.28 proud so the retained counter feet are supported. Leave the counter envelopes empty; only the two back-wall textiles in the character schedule are added behind them. The counters `ASSET_SPICE_DRAWERS` (a=1.80), `ASSET_GRAIN_BALANCE` (a=7.56) and `ASSET_APOTHECARY` (a=10.44) are placed assets 1.72 × 0.50 × 1.70 at their fixed Section 4 transforms; do not move them to the recess back. Completion: each counter sits inside its recess with 0.34 m of reveal either side and its top shelf under the head beam.
3. CREATE two closed household doors `GROUND_02/05` 1.15 × 2.7 at a=4.68 and a=13.32 per SD-05: eight vertical planks `ph_rough_pine_door` with grain along the plank, tight 0.002..0.003 m seams and SD-05 separated backing, two iron straps, ring pull at 1.05 m, stone jambs 0.14, SD-05 threshold. Completion: both read as house doors, not shop doors; nothing stands within 0.8 m in front.
4. CREATE five upper window rebates `STORY_1_WINDOW_01..05` 1.6 × 1.65 at sill 3.68 / head 5.33 on the five axes: stone frame 0.10 all round, sill slab 0.06 high × 0.08 proud sitting on the sill course, reveal 0.135 deep, dark plaster back. Do NOT model shutters: the placed `ASSET_SHUTTER_*` assets (SH-L / SH-P / SH-L / SH-W / SH-P at z 3.68) fill the rebates. Completion: every shutter sits inside its frame with the sill under it, none floats in front of plaster.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 2.85 spanning a=0.55..3.05, projection 1.10 m, hem drop 0.25, default sag 0.12 (the character schedule overrides sag only), two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01`; same over `GROUND_03` (a=6.31..8.81) and `GROUND_04` (a=9.19..11.69). No awning over the doors. Override sag by bay: GROUND_01=0.07, GROUND_03=0.10, GROUND_04=0.12 m; keep drop 0.25, all ledger endpoints and projection unchanged. Completion: three different cloth curves, evaluated lowest surfaces at least 2.45 m, brackets bear on the jamb stones, cloth clears the sign boards.
6. CREATE sign brackets (SD-09) behind the two placed boards `SPICE_W_SIGN_1` (a=1.80, centre z 3.20, span 3.05..3.35) and `SPICE_W_SIGN_3` (a=7.56, same span): two 0.06 × 0.06 timber stubs 0.18 proud at ±0.9 m of the axis, z 3.35. CREATE the lantern bracket at a=0.76: it starts at (21.0, 16.2, 4.065), reaches 0.45 m into the street to the placed lantern handle at (21.45, 16.2, 4.065), and carries `LANTERN_SPICE_01` centred at (21.45, 16.2, 3.80). No sign on `GROUND_04` (goods identify it). Completion: both boards and the lantern visibly hang from their brackets.
7. KEEP goods: `PLACE_SPICE_COVER_*` cluster at (23.0, 27.6) is gameplay cover; `BPL16_SPICE_W_STOCK_GROUND_02` and `B4_SPICE_W_CRATES_GROUND_04` anchors stay dormant (no new floor stock). Completion: nothing on the paving in front of this wall except the cover cluster.
8. APPLY SD-12 only on solid receiving faces: broken dust 0..0.35, local hand polish on door jambs 0.9..1.4, and spice marks 0..0.4 on the GROUND_01 deck/jambs. GROUND_03 carries pale flour dust on its deck; GROUND_04 has a clean wiped deck and one small spice mark at its south jamb. Keep the named repair patches in the character schedule separate from dirt. Light morning bleach is allowed only above the west shutters, z 5.43..6.84. Completion: distinct daily use at each trade; dust never bridges a recess or a door.
9. KEEP the S1 parcel roofs already placed (`ASSET_SPICE_ROOF_SOUTH/MIDDLE/NORTH` at x 18.60, z 7.0: caps 8.79 / 9.59 / 8.19) and the five `ASSET_ROOF_TIE_*` supports on the east side. Completion: the GLB coping meets the roof-asset bases without a gap or a double slab.

**Why it exists (reality check):** Three spice tenancies each have a counter recess with a lockable timber back and a stair to the room above (upper shutters over every axis); the two plain doors are the households' street doors, one per end so each family has its own entrance. Awnings shade the counters facing the morning sun; the doors need none.

### FRONTAGE_SPICE_STREET_EAST  ·  BLD_SPICE_ROW_E (shop row, 1 storey)

- **Role:** shop row. Wholesale sack stores: three plain doors, no windows at street level (stock, not living), stock waiting outside for the cart. A household lives in the setback room at the north end and reaches it by the stair behind `GROUND_04`.
- **Wall line:** east edge of `SPICE_STREET`; x = 33, y = 15.44 .. 30.56 (a runs south to north); length **15.12 m**; street side -X (street lies west of the wall); kit `Wall(F, (33, 15.44), (33, 30.56), faces='W')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.25 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28 m; string course 2.90 m (heads 2.25); coping 4.34..4.5 m; parapet cap 5.59 (baseline); the S1 setback room sits behind the north half (section 7).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `door_residential_timber` | closed sack-store door 1.05 × 2.25 (double leaves, cart parked on its anchor) | 1.125 | (33, 16.565) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `GROUND_02` | `blind_niche` | blind niche, sill 0.45 | 4.343 | (33, 19.782) | 1.05 × 0.18 × 1.8 | 0.45 / 2.25 | 0 |
| `GROUND_03` | `door_residential_timber` | primary closed store door 1.05 × 2.25 with wicket | 7.56 | (33, 23) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `GROUND_04` | `door_residential_timber` | closed household door 1.05 × 2.25 (stair to the setback room behind) | 10.777 | (33, 26.218) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `GROUND_05` | `blind_niche` | blind niche, sill 0.45 | 13.995 | (33, 29.435) | 1.05 × 0.18 × 1.8 | 0.45 / 2.25 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.125, 1.05, 0, 2.25), (4.3425, 1.05, 0.45, 1.8), (7.56, 1.05, 0, 2.25), (10.7775, 1.05, 0, 2.25), (13.995, 1.05, 0.45, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_MARKET_CART` at existing B4_SPICE_E_CART at GROUND_01, keep; `ASSET_SPICE_GOODS` at existing at GROUND_03 and GROUND_04, keep.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_05` 0..4.5 (coursed stone, quiet side), plinth 0..0.28, string course 2.84..2.96 × 0.10, coping 4.34..4.50 × 0.18; corners `held`: two end piers 0.45 × 0.16 full height at a=0.225 and a=14.895. Completion: reads as a low stone wholesale row, one material family, no plaster.
2. CREATE two closed sack-store doors `GROUND_01/03` as the runtime `door_residential_timber` envelope, 1.05 × 2.25 at a=1.125/7.56: double leaves `ph_weathered_brown_planks`, three iron straps, a 0.35 m bumper rail and flush threshold. `GROUND_03` adds a 0.35 × 0.35 iron-grille wicket at z=1.50. CREATE `GROUND_04` as the same 1.05 × 2.25 envelope at a=10.777 with one `ph_rough_pine_door` leaf, two straps and a ring pull. Completion: two locked sack-store doors and one household door, all closed, with the existing runtime envelopes unchanged.
3. CREATE two blind niches `GROUND_02/05` 1.05 × 1.8, sill 0.45, at a=4.343/13.995 (SD-18). Backing must be `ph_worn_plaster_ochre` at out=-0.14 per SD-18, with sealed masonry behind it; do not substitute exposed sandstone. Completion: plastered infill in a former opening.
4. KEEP the wall-base stock at the four `SPICE_E_WALLBASE_STOCK_*` anchors (crates, sacks, baskets, pots at x≈32.1..32.3) and the handcart at its corrected fixed anchor (31.60, 16.565), 1.40 m inset on `GROUND_01`, yaw 277°. Its nearest edge stays 0.937 m from the wall, leaving a 0.137 m gap beyond the protected 0.8 m door floor while the six-metre lane x=24..30 remains clear. Add nothing. Completion: stock remains within 0.9 m of the wall, the door floor stays empty and the cart keeps this transform.
5. No awnings, no signs on this face (quiet side). Completion: none exist.
6. KEEP the five roof-tie supports `ASSET_ROOF_TIE_*` at x 34.88 (z 5.48..5.59) that receive the canopies and lines; their seats are the retained roof/parapet geometry behind the facade, not the section cornice at x=33, z=4.5. Completion: inspect all five retained contacts in assembled context; do not extend the section to reach them.
7. APPLY wear: broken base dust 0..0.35 and cart scuffs 0..0.6 on GROUND_01 jambs at out=0.125; light afternoon bleach on the solid stone field z 2.96..4.34, out=0.025. No drain or tie-foot streak is scheduled here: the retained parapet is set back from the x=33 facade, and a roof tie is not a drain. Completion: every mark has a receiving surface below the 4.5 m wall top; no floating marks above the cornice.
8. KEEP the S1 setback room `ASSET_SPICE_UPPER_ROOM` at (35.70, 27.28, 4.76) (roof 7.0, cap 7.71, two closed windows at y 25.8 / 28.1, sill 5.40). Completion: the room's base sits on the 4.76 slab with no gap.

**Why it exists (reality check):** Wholesale sack stores: three plain doors, no windows at street level (stock, not living), stock waiting outside for the cart. A household lives in the setback room at the north end and reaches it by the stair behind `GROUND_04`.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_SPICE_DISTRICT` | landmark | (21.675, 23, 0) | 1.5 × 0.85 | 0 | Authored Ground 03 override: the spice display is centered inside the 2.4 m west merchant recess, with its sack and brass pot grounded at the two front corners and the adjacent door service volume left clear. |
| `LMK_SPICE_GATE_01` | hero_landmark | (27, 14.95, 0) | 12.8 × 9.1 | 180 | Lane-spanning southern gate that terminates Spawn A and opens Spice Street. Its front elevation sits on the y=14 courtyard wall plane and its abutments occupy the solid corner nubs outside the 12 m throat, so the arch adds silhouette, soffit shade, and threshold without narrowing the route or altering collision. |
| `COVER_SPICE_01` | cover_cluster | (23, 27.6, 0) | 1.8 × 1.15 | 15 | Sacks and baskets at the route edge. |
| `LANTERN_SPICE_01` | lantern_anchor | (21.45, 16.2, 3.8) | 0.42 × 0.72 | 90 | CC0 wooden lantern at the spice district entrance. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_SPICE_COUNTER_4_MOUNT_SPICE_COUNTER_4` | `ASSET_APOTHECARY` | `MOUNT_SPICE_COUNTER_4` | (20.75, 25.88, 0.08) | 1.72 × 0.5 × 1.7 | 270 | KEEP at this transform |
| `PLACE_SPICE_BARREL_COVER_SPICE_01` | `ASSET_CC0_BARREL` | `COVER_SPICE_01` | (21.9, 27.65, 0) | 0.668 × 0.68 × 0.784 | 9 | KEEP; the barrel overlaps the cover core by design (waiver CW-7599CB836F04 stays) |
| `PLACE_SPICE_BASKET_COVER_SPICE_01` | `ASSET_CC0_BASKET` | `COVER_SPICE_01` | (23.78, 27.98, 0) | 0.375 × 0.271 × 0.218 | 27 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_BASKET_MID_SPICE_E_WALLBASE_STOCK_02` | `ASSET_CC0_BASKET` | `SPICE_E_WALLBASE_STOCK_02` | (31.89, 22.1, 0) | 0.375 × 0.271 × 0.218 | 262 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_BASKET_NORTH_SPICE_E_WALLBASE_STOCK_04` | `ASSET_CC0_BASKET` | `SPICE_E_WALLBASE_STOCK_04` | (32, 27.98, 0) | 0.394 × 0.285 × 0.229 | 286 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_BRASS_POT_SPICE_E_WALLBASE_STOCK_04` | `ASSET_CC0_BRASS_POT` | `SPICE_E_WALLBASE_STOCK_04` | (31.88, 28.42, 0) | 0.302 × 0.302 × 0.291 | 270 | KEEP at this transform |
| `PLACE_SPICE_LANTERN_LANTERN_SPICE_01` | `ASSET_CC0_LANTERN` | `LANTERN_SPICE_01` | (21.45, 16.2, 3.8) | 0.221 × 0.235 × 0.53 | 90 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_POTTERY_NORTH_SPICE_E_WALLBASE_STOCK_04` | `ASSET_CC0_POTTERY` | `SPICE_E_WALLBASE_STOCK_04` | (32.18, 27.32, 0) | 0.656 × 0.502 × 0.372 | 258 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_POTTERY_SOUTH_SPICE_E_WALLBASE_STOCK_01` | `ASSET_CC0_POTTERY` | `SPICE_E_WALLBASE_STOCK_01` | (32.1, 18.65, 0) | 0.623 × 0.477 × 0.353 | 284 | KEEP at this transform |
| `PLACE_SPICE_POTTERY_COVER_SPICE_01` | `ASSET_CC0_POTTERY` | `COVER_SPICE_01` | (23.76, 27.22, 0) | 0.525 × 0.402 × 0.298 | 15 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_SACK_SPICE_E_WALLBASE_STOCK_03` | `ASSET_CC0_SPICE_SACK` | `SPICE_E_WALLBASE_STOCK_03` | (32.14, 24.89, 0) | 0.468 × 0.468 × 0.441 | 279 | KEEP at this transform |
| `PLACE_SPICE_CANOPIES_CANOPY_SPICE_01` | `ASSET_CLOTH_CANOPY` | `CANOPY_SPICE_01` | (27, 20.581, 5.675) | 3.6 × 12 × 0.18 | 90 | KEEP at this transform |
| `PLACE_SPICE_CANOPIES_CANOPY_SPICE_02` | `ASSET_CLOTH_CANOPY` | `CANOPY_SPICE_02` | (27, 26.478, 5.675) | 3.2 × 12 × 0.18 | 90 | KEEP at this transform |
| `PLACE_SPICE_COVER_CORE_COVER_SPICE_01` | `ASSET_COVER_GOODS` | `COVER_SPICE_01` | (23, 27.6, 0) | 1.5 × 0.75 × 1 | 15 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_SPICE_E_STOCK_CRATE_BASE_SPICE_E_WALLBASE_STOCK_01` | `ASSET_DECORATIVE_CRATE` | `SPICE_E_WALLBASE_STOCK_01` | (32.25, 17.76, 0) | 0.825 × 0.409 × 0.35 | 275 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_CRATE_MID_SPICE_E_WALLBASE_STOCK_03` | `ASSET_DECORATIVE_CRATE` | `SPICE_E_WALLBASE_STOCK_03` | (32.25, 24.11, 0) | 0.776 × 0.384 × 0.329 | 264 | KEEP at this transform |
| `PLACE_SPICE_E_STOCK_CRATE_STACK_SPICE_E_WALLBASE_STOCK_01` | `ASSET_DECORATIVE_CRATE` | `SPICE_E_WALLBASE_STOCK_01` | (32.17, 17.81, 0.35) | 0.71 × 0.352 × 0.301 | 259 | KEEP at this transform |
| `PLACE_SPICE_COUNTER_3_MOUNT_SPICE_COUNTER_3` | `ASSET_GRAIN_BALANCE` | `MOUNT_SPICE_COUNTER_3` | (20.75, 23, 0.08) | 1.72 × 0.495 × 1.64 | 270 | KEEP at this transform |
| `PLACE_B4_SPICE_COVER_RUG_COVER_SPICE_01` | `ASSET_GROUND_RUG` | `COVER_SPICE_01` | (23, 27.6, 0) | 2.255 × 1.357 × 0.04 | 11 | KEEP (gameplay cover cluster; waiver CW-13333D7BED23 stays) |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_01` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_SPICE_01` | (27, 18.162, 5.95) | 1.4 × 12 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_02` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_SPICE_02` | (27, 23.756, 6) | 1.55 × 12 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_03` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_SPICE_03` | (27, 28.746, 6.15) | 1.2 × 12 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B4_SPICE_CART_B4_SPICE_E_CART_GROUND_01` | `ASSET_MARKET_CART` | `B4_SPICE_E_CART_GROUND_01` | (31.6, 16.565, 0) | 1.25 × 0.78 × 0.92 | 277 | KEEP at this transform |
| `PLACE_SUPPORT_CANOPY_SPICE_01_MOUNT_SUPPORT_CANOPY_SPICE_01` | `ASSET_ROOF_TIE_555` | `MOUNT_SUPPORT_CANOPY_SPICE_01` | (34.875, 20.581, 5.48) | 3.75 × 0.16 × 0.32 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_CANOPY_SPICE_02_MOUNT_SUPPORT_CANOPY_SPICE_02` | `ASSET_ROOF_TIE_555` | `MOUNT_SUPPORT_CANOPY_SPICE_02` | (34.875, 26.478, 5.48) | 3.75 × 0.16 × 0.32 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_01_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01` | `ASSET_ROOF_TIE_590` | `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01` | (34.875, 18.162, 5.59) | 3.75 × 0.16 × 0.45 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_02_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02` | `ASSET_ROOF_TIE_595` | `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02` | (34.875, 23.756, 5.59) | 3.75 × 0.16 × 0.5 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_03_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03` | `ASSET_ROOF_TIE_610` | `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03` | (34.875, 28.746, 5.59) | 3.75 × 0.16 × 0.65 | 180 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_1_MOUNT_SPICE_WINDOW_1` | `ASSET_SHUTTER_LOUVERED` | `MOUNT_SPICE_WINDOW_1` | (20.985, 17.24, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_3_MOUNT_SPICE_WINDOW_3` | `ASSET_SHUTTER_LOUVERED` | `MOUNT_SPICE_WINDOW_3` | (20.985, 23, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_2_MOUNT_SPICE_WINDOW_2` | `ASSET_SHUTTER_PANELED` | `MOUNT_SPICE_WINDOW_2` | (20.985, 20.12, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_5_MOUNT_SPICE_WINDOW_5` | `ASSET_SHUTTER_PANELED` | `MOUNT_SPICE_WINDOW_5` | (20.985, 28.76, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_WINDOW_4_MOUNT_SPICE_WINDOW_4` | `ASSET_SHUTTER_WOVEN` | `MOUNT_SPICE_WINDOW_4` | (20.985, 25.88, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_SPICE_SIGNS_SPICE_W_SIGN_1` | `ASSET_SIGNBOARD` | `SPICE_W_SIGN_1` | (21.12, 17.24, 3.2) | 2.2 × 0.12 × 0.304 | 90 | KEEP; the GLB adds the two bracket stubs behind it (SD-09) |
| `PLACE_SPICE_SIGNS_SPICE_W_SIGN_3` | `ASSET_SIGNBOARD` | `SPICE_W_SIGN_3` | (21.12, 23, 3.2) | 2.2 × 0.12 × 0.304 | 90 | KEEP; the GLB adds the two bracket stubs behind it (SD-09) |
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
| `CANOPY_SPICE_01` | (21, 20.581, 5.8) | (33, 20.581, 5.55) | 3.6 | Hung above the upper-window heads so the span reads over the openings, not across them. |
| `CANOPY_SPICE_02` | (21, 26.478, 5.8) | (33, 26.478, 5.55) | 3.2 | Hung above the upper-window heads so the span reads over the openings, not across them. |
| `B6_LAUNDRY_SPICE_01` | (21, 18.162, 6) | (33, 18.162, 5.9) | 1.4 | Hung above the upper-window heads so the span reads over the openings, not across them. |
| `B6_LAUNDRY_SPICE_02` | (21, 23.756, 6.05) | (33, 23.756, 5.95) | 1.55 | Mid-lane line between the two cloth spans. Hung above the upper-window heads so the overhead layer reads as one continuous rhythm instead of two isolated sheets. |
| `B6_LAUNDRY_SPICE_03` | (21, 28.746, 6.2) | (33, 28.746, 6.1) | 1.2 | North line closes the lane sequence at the Fountain Court transition. Hung above the upper-window heads. |

The west ends at (21, 20.58 / 26.48, 5.8) bear on 1.2 m timber wall ledgers, 0.10 × 0.10, with two iron eyes each; they attach to the 7 m Spice-west wall, not a parapet. The east ends bear on the placed `ASSET_ROOF_TIE_*` at x 34.88. Cloth `ph_hessian_230` for the canopies (cream), rust and indigo garments on the lines. Sag 0.35 max at mid-span; hem ≥ 4.9 m over the street. Nothing hangs from the canopies.

## 6. Ground, wear and drainage

KEEP `spice_laid_stone_01`. Finish: flush seams at y 14 (Spice Gate threshold) and y 32; separate swept contact patches along the west counters, not a continuous band; rust spice residue at the drawers, pale dust at the grain shop and a small stain by the apothecary south jamb, bounded by the exact floor polygons below; two 0.05 m wide wheel scuffs in colour and roughness only from the east cart at (31.60, 16.565) toward the gate, with no displacement; contact wear under the cover cluster and the wall-base stock.

**`SPICE_STREET` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(26.7, 14.3, 0.014), (27.3, 14.3, 0.014), (27.3, 31.7, 0.014), (26.7, 31.7, 0.014)], 'polish')
wear_patch(F, [(21.04, 15.7, 0.014), (21.38, 15.85, 0.014), (21.46, 16.35, 0.014), (21.03, 16.25, 0.014)], 'dust')
wear_patch(F, [(21.03, 21.5, 0.014), (21.53, 21.68, 0.014), (21.42, 22.15, 0.014), (21.02, 22.28, 0.014)], 'dust')
wear_patch(F, [(21.04, 27.34, 0.014), (21.3, 27.43, 0.014), (21.34, 27.81, 0.014), (21.02, 27.97, 0.014)], 'dust')
wear_patch(F, [(21.02, 16.44, 0.014), (21.4, 16.44, 0.014), (21.4, 18.04, 0.014), (21.02, 18.04, 0.014)], 'spice')
wear_patch(F, [(21.03, 22.47, 0.014), (21.34, 22.66, 0.014), (21.26, 23.38, 0.014), (21.02, 23.56, 0.014)], 'dust')
wear_patch(F, [(21.03, 24.86, 0.014), (21.24, 24.92, 0.014), (21.2, 25.17, 0.014), (21.02, 25.23, 0.014)], 'spice')
wear_patch(F, [(31.2, 15.1, 0.014), (31.25, 15.1, 0.014), (31.25, 16.565, 0.014), (31.2, 16.565, 0.014)], 'rut')
wear_patch(F, [(31.77, 15.1, 0.014), (31.82, 15.1, 0.014), (31.82, 16.565, 0.014), (31.77, 16.565, 0.014)], 'rut')
wear_patch(F, [(31.980579, 15.807976, 0.014), (32.152415, 17.207466, 0.014), (31.219421, 17.322024, 0.014), (31.047585, 15.922534, 0.014)], 'dust')
wear_patch(F, [(21.425503, 27.299699, 0.014), (22.243024, 27.170216, 0.014), (22.374497, 28.000301, 0.014), (21.556976, 28.129784, 0.014)], 'dust')
wear_patch(F, [(23.443821, 27.909431, 0.014), (23.920509, 27.666546, 0.014), (24.116179, 28.050569, 0.014), (23.639491, 28.293454, 0.014)], 'dust')
wear_patch(F, [(22.080519, 27.375324, 0.014), (23.683956, 26.945684, 0.014), (23.919481, 27.824676, 0.014), (22.316044, 28.254316, 0.014)], 'dust')
wear_patch(F, [(32.140632, 21.865095, 0.014), (32.066174, 22.394889, 0.014), (31.639368, 22.334905, 0.014), (31.713826, 21.805111, 0.014)], 'dust')
wear_patch(F, [(32.137347, 27.652583, 0.014), (32.289982, 28.184882, 0.014), (31.862653, 28.307417, 0.014), (31.710018, 27.775118, 0.014)], 'dust')
wear_patch(F, [(32.665, 20.47, 0.014), (32.665, 22.13, 0.014), (31.755, 22.13, 0.014), (31.755, 20.47, 0.014)], 'dust')
wear_patch(F, [(32.110846, 28.189027, 0.014), (32.110846, 28.650973, 0.014), (31.649154, 28.650973, 0.014), (31.649154, 28.189027, 0.014)], 'dust')
wear_patch(F, [(32.490458, 17.244444, 0.014), (32.57633, 18.225968, 0.014), (32.009542, 18.275556, 0.014), (31.92367, 17.294032, 0.014)], 'dust')
wear_patch(F, [(32.569624, 23.673138, 0.014), (32.47181, 24.603769, 0.014), (31.930376, 24.546862, 0.014), (32.02819, 23.616231, 0.014)], 'dust')
wear_patch(F, [(32.588595, 26.989735, 0.014), (32.418939, 27.787903, 0.014), (31.771405, 27.650265, 0.014), (31.941061, 26.852097, 0.014)], 'dust')
wear_patch(F, [(32.314254, 18.192992, 0.014), (32.503727, 18.952928, 0.014), (31.885746, 19.107008, 0.014), (31.696273, 18.347072, 0.014)], 'dust')
wear_patch(F, [(32.400956, 24.530825, 0.014), (32.499175, 25.150956, 0.014), (31.879044, 25.249175, 0.014), (31.780825, 24.629044, 0.014)], 'dust')
wear_patch(F, [(23.356591, 27.037388, 0.014), (24.018057, 26.860148, 0.014), (24.163409, 27.402612, 0.014), (23.501943, 27.579852, 0.014)], 'dust')
```

## 7. Roofs and skyline

S1 adopted: west parcels y 15.44..21.56 / 21.56..27.32 / 27.32..30.56 with roof bases 7.6 / 8.4 / 7.0 and caps 8.79 / 9.59 / 8.19 (placed `ASSET_SPICE_ROOF_SOUTH/MIDDLE/NORTH`, KEEP); east stays 4.5 / 5.59 with the setback room (placed `ASSET_SPICE_UPPER_ROOM`, cap 7.71, KEEP). Nothing else on the roofs. From (27, 16) looking north and (27, 30) looking south the three west caps must step; from the fountain the setback room must read behind the east parapet.

## 8. Required result

- [ ] Three west awnings, zero east awnings; two signs on the west (bays 01 and 03), none elsewhere.
- [ ] Three counters seated in their recesses with 0.34 m reveal either side; shutters seated in all five upper rebates.
- [ ] Canopy and line ends bear on ledgers or roof ties; hems ≥ 4.9 m; sky visible between spans from both street ends.
- [ ] East stock stays within 0.9 m of the wall; the handcart at (31.60, 16.565), yaw 277°, leaves the `GROUND_01` 0.8 m door floor clear and stays beyond the six-metre lane.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

