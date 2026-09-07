# unit-fountain-court · Fountain Court

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-fountain-court --tag r1-before` prints the same walls and must agree. Also called: Fountain Court, the fountain.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The civic release: a tall pale madrasa with one sealed arch and a stained window on the west, a warm plastered merchant house with a loggia on the east, the off-axis fountain and palm, quiet mid-link passages north and south. Value contrast across the court is the composition: stone versus plaster, tall versus mid.

## 2. Site

### Site · `FOUNTAIN_COURT` (Fountain Court)

- Rect x 20..36, y 32..48 (16 × 16 m); floor z = 0; floor `patterned_cobblestone`; authored clear width **6 m** (protected).
- Connects: LINK_EAST_MID, LINK_WEST_MID, SPICE_STREET, TEXTILE_ARCADE.
- `north` edge: exempt (`architectural_cut_edge`): The 5.00m supported run on the 16.00m north edge frames authored connector cuts and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 4.00m supported run on the 16.00m south edge frames authored connector cuts and is not a served facade plane.
- `west` edge: frontage `FRONTAGE_FOUNTAIN_COURT_WEST` → `BLD_MADRASA`.
- `west` edge: frontage `FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH` → `BLD_MADRASA`.
- `east` edge: frontage `FRONTAGE_FOUNTAIN_COURT_EAST` → `BLD_MERCHANT_HOUSE`.
- `east` edge: frontage `FRONTAGE_FOUNTAIN_COURT_EAST_NORTH` → `BLD_MERCHANT_HOUSE`.

**Existing source.** `assets/source/unit-fountain-court/` holds hand-modelled GLBs for all four faces and an unapplied package; reference only, rebuild to this sheet.

## 3. Walls

### FRONTAGE_FOUNTAIN_COURT_WEST  ·  BLD_MADRASA (landmark, 2 storeys)

- **Role:** public front. Repaired sealed hero arch and one stained opening remain the court focus. The south service wing has one closed entry and one high dark window; no invented third floor.
- **Wall line:** west edge of `FOUNTAIN_COURT`; x = 20, y = 41 .. 46.72 (a runs south to north); length **5.72 m**; street side +X (street lies east of the wall); kit `Wall(F, (20, 41), (20, 46.72), faces='E')`.
- **Massing `MASSING_TALL_HERO`:** wall top 9.5 m, depth 5.4 m, roof `setback_flat`, roof setback 1.05 m, parapet +0.85 m; baseline survey: roof base 9.5, parapet cap 10.790, emitted max 11.520.
- **Facade GLB frame:** width 5.72 m × height 9.5 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `hero_courtyard`):** wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`.
- **Corners:** `open`; solid end piers reserved: 0.76 m at a=0, 0.76 m at a=L. Ground head datum 4.85 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28 sandstone; arch impost band 3.10 m; sill course 4.97..5.09 under the clerestory; coping 9.34..9.5; parapet +0.85.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `arch_hero_courtyard` | sealed loggia arch, dark backing | 2.86 | (20, 43.86) | 4.2 × 0.5 × 4.85 | 0 / 4.85 | 0 |  |
| `STORY_1_WINDOW_01` | `window_landmark_stained` | stained clerestory (`stained_glass_panel_001`) | 2.86 | (20, 43.86) | 1.2 × 0.25 × 1.75 | 5.15 / 6.9 | 1 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at flanking the arch at 0.60 m along, under the head; `ASSET_CC0_LANTERN` at flanking the arch at 5.12 m along, under the head; `ASSET_COURT_PLANTER` at one each side of the arch, 0.4 m off the wall.
Open `needs` in the spec (close them with this sheet): `raised_parapet: massing option lifting the parapet 1.2 m over the arch bay`, `inscription_band: carved band module between arch head and stained windows`.

**Composition.** One tall blind entrance arch and one stained clerestory face the fountain; a narrow south wing contains the closed service entrance.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05` full height, plinth 0..0.28, impost band `ph_stone_trim_white` 3.04..3.16 × 0.08 across the whole face, sill course 4.97..5.09, coping 9.34..9.50 × 0.18; corners `held`: end piers 0.60 wide × 0.16 proud full height at both ends. Completion: one tall pale civic face, no plaster.
2. CREATE `GROUND_01` sealed hero arch 4.2 × 4.85 at a=2.86 (pointed, ring 0.25 `ph_stone_trim_white`, depth 0.50): dark plaster back 0.5 m in, a 0.06 stone threshold flush with paving, and a carved band 0.30 high at 4.95..5.25 over the crown (three repeated rosettes 0.20; this closes the spec's `inscription_band` need; the `raised_parapet` need is closed as rejected: the parapet stays +0.85). Do not open it. Completion: reads as the madrasa's sealed loggia; the threshold rug `B4_FOUNTAIN_W_RUG_GROUND_01` at (21.10, 43.86) lies centred in front of it.
3. CREATE `STORY_1_WINDOW_01` stained clerestory 1.2 × 1.75 at sill 5.15 / head 6.90, a=2.86: stone frame 0.12, pointed head, `stained_glass_panel_001` panel 0.03 behind a timber lattice of 0.02 bars at 0.15 pitch; no second or third window (old brief rejected). Completion: one glazed opening reads from the court floor.
4. No awning, sign, balcony or goods. KEEP planter `B7_FOUNTAIN_PLANTER_WEST` (21.15, 41.90) and the market spill cluster at (21.35, 37.10) which belong to the court. Completion: none added.
5. APPLY wear: minimal; dust band 0..0.8, one water streak from the coping at a=0.4 (a spout SD-13 at a=0.4), hand polish either side of the arch at 1.0..1.4 m. Completion: as listed.

**Why it exists (reality check):** A madrasa presents one grand sealed arch to the court and lights its hall from a high stained window; the students enter from the service wing, not the court.

### FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH  ·  BLD_MADRASA (landmark, 2 storeys)

- **Role:** secondary/service wing front. Repaired sealed hero arch and one stained opening remain the court focus. The south service wing has one closed entry and one high dark window; no invented third floor.
- **Wall line:** west edge of `FOUNTAIN_COURT`; x = 20, y = 33.28 .. 36 (a runs south to north); length **2.72 m**; street side +X (street lies east of the wall); kit `Wall(F, (20, 33.28), (20, 36), faces='E')`.
- **Massing `MASSING_TALL_HERO`:** wall top 9.5 m, depth 5.4 m, roof `setback_flat`, roof setback 1.05 m, parapet +0.85 m; baseline survey: roof base 9.5, parapet cap 10.790, emitted max 11.520.
- **Facade GLB frame:** width 2.72 m × height 9.5 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `hero_courtyard_beige`):** wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`.
- **Corners:** `open`; solid end piers reserved: 0.83 m at a=0, 0.83 m at a=L. Ground head datum 2.5 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 9.34..9.5. Same building as the main face: same coping height, same parapet.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `door_residential_timber` | closed service door | 1.36 | (20, 34.64) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |  |
| `STORY_1_WINDOW_01` | `window_dark_recess` |  | 1.36 | (20, 34.64) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |  |


**Composition.** One tall blind entrance arch and one stained clerestory face the fountain; a narrow south wing contains the closed service entrance.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_beige_wall_002` (the wing is plastered, the hall is stone: the correlated difference), plinth sandstone 0..0.28, course 2.84..2.96, sill course 4.97..5.09, coping 9.34..9.50; end piers 0.45 × 0.16 both ends (`held`). Completion: plaster wing reading as part of the stone hall.
2. CREATE `GROUND_01` closed service door 1.05 × 2.25 at a=1.36 (SD-05), timber `ph_rough_pine_door`, iron straps, threshold flush. Completion: closed, hinged.
3. CREATE `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.36: frame 0.10, 0.28 deep, closed dark timber leaf. Suppress the old `STORY_2_WINDOW_01` (no third floor). Completion: one window only.
4. APPLY wear: dust band, polish at the door jambs. No awning, sign or goods. Completion: as listed.

**Why it exists (reality check):** The madrasa's back-of-house: one service door and one window to the stair. Nothing to sell.

### FRONTAGE_FOUNTAIN_COURT_EAST  ·  BLD_MERCHANT_HOUSE (house, 2 storeys)

- **Role:** public front. Two wings of one shared merchant block, with a clear mid-link, closed north entrances, a south loggia and dry dye display.
- **Wall line:** east edge of `FOUNTAIN_COURT`; x = 36, y = 33.28 .. 39 (a runs south to north); length **5.72 m**; street side -X (street lies west of the wall); kit `Wall(F, (36, 33.28), (36, 39), faces='W')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 7, parapet cap shared owner / landmark, emitted max shared owner.
- **Facade GLB frame:** width 5.72 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `hero_courtyard_beige`):** wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`.
- **Corners:** `held`; solid end piers reserved: 0.76 m at a=0, 0.76 m at a=L. Ground head datum 2.25 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; impost band 3.04..3.16; sill course 4.97..5.09; coping 6.84..7.0; parapet +0.75.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `STORY_1_WINDOW_01` | `window_dark_recess` |  | 1.05 | (36, 34.33) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |  |
| `GROUND_01` | `arch_hero_courtyard` | sealed loggia arch, dark backing | 2.86 | (36, 36.14) | 4.2 × 0.5 × 4.85 | 0 / 4.85 | 0 |  |
| `STORY_1_WINDOW_02` | `window_dark_recess` |  | 4.67 | (36, 37.95) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |  |


**Composition.** A merchant block has a quiet court loggia on its west front and a cloth-trade back on the Souk, with the existing cross-link between its wings.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_beige_wall_002`, plinth sandstone, impost band, sill course, coping per datums; corners `held`: end piers 0.60 × 0.16. Completion: warm plaster block facing the pale madrasa (deliberate contrast across the court).
2. CREATE `GROUND_01` sealed loggia arch 4.2 × 4.85 at a=2.86 with ring 0.25 `ph_stone_trim_sandstone`, dark back at 0.5 m, flush threshold; rug `B4_FOUNTAIN_E_RUG_GROUND_01` at (34.90, 36.14) lies in front. Completion: sealed, no passage implied.
3. CREATE `STORY_1_WINDOW_01/02` dark recesses 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.05 and a=4.67 (a mirrored pair about the arch axis): frame 0.10, 0.28 deep, closed dark leaves. No balcony (old 2.4 m balcony rejected: no access). Completion: a pair, symmetric about a=2.86.
4. No awning, sign or goods on the court face. KEEP `B7_FOUNTAIN_PLANTER_EAST` (34.55, 44.25), the tea spill table and stools at (33.55, 41.6) and the cover cluster at (33.8, 35.2). Completion: none added.
5. APPLY wear: dust band, one spout SD-13 at a=5.3 with streak, polish on the arch jambs. Completion: as listed.

**Why it exists (reality check):** A merchant's house shows the court a formal loggia and two upper windows; the family's door is round the corner on the north wing, the trade is on the Souk side.

### FRONTAGE_FOUNTAIN_COURT_EAST_NORTH  ·  BLD_MERCHANT_HOUSE (house, 2 storeys)

- **Role:** secondary/service wing front. Two wings of one shared merchant block, with a clear mid-link, closed north entrances, a south loggia and dry dye display.
- **Wall line:** east edge of `FOUNTAIN_COURT`; x = 36, y = 44 .. 46.72 (a runs south to north); length **2.72 m**; street side -X (street lies west of the wall); kit `Wall(F, (36, 44), (36, 46.72), faces='W')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 7, parapet cap shared owner / landmark, emitted max shared owner.
- **Facade GLB frame:** width 2.72 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `hero_courtyard`):** wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`.
- **Corners:** `open`; solid end piers reserved: 0.83 m at a=0, 0.83 m at a=L. Ground head datum 2.5 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `door_residential_timber` | primary closed household door | 1.36 | (36, 45.36) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |  |
| `STORY_1_WINDOW_01` | `window_screened` → `ASMB_SCREEN_WINDOW` | SC-C fine crossed lattice (placed `ASSET_SCREEN_SC_C`) | 1.36 | (36, 45.36) | 1 × 0.24 × 1.4 | 5.15 / 6.55 | 1 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SCREEN_SC_C` at complete SC-C closure at the existing 5.15 m sill.

**Composition.** A merchant block has a quiet court loggia on its west front and a cloth-trade back on the Souk, with the existing cross-link between its wings.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05` (stone wing against the plaster hall: correlated difference), plinth, course 2.84..2.96, sill course, coping 6.84..7.0, end piers 0.45 both ends. Completion: as datums.
2. CREATE `GROUND_01` primary household door 1.05 × 2.25 at a=1.36 (SD-05) with a 0.30 stone step flush, ring pull, iron studs; a lantern bracket (SD-10) at z 3.8, 0.35 proud, 0.6 m south of the axis for a future `ASSET_CC0_LANTERN` (not placed today; leave the bracket). Completion: door reads as the family entrance.
3. CREATE `STORY_1_WINDOW_01` rebate 1.0 × 1.4 at sill 5.15 / head 6.55, a=1.36: frame 0.10, reveal 0.135; the placed `ASSET_SCREEN_SC_C` (`CENTRAL_SCREEN_COURT` at (36.02, 45.36, 5.15)) fills it. Completion: screen sits in the rebate.
4. APPLY wear: dust band, polish at the door. No awning, sign, goods. Completion: as listed.

**Why it exists (reality check):** The merchant family's own door, one screened window above for the women's room. The north wing is the only wing this door serves (the passage cuts the block).

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_FOUNTAIN_01` | landmark | (24.5, 43.5, 0) | 3 × 1.32 | 0 | Off-center tiered carved-stone fountain relocated beyond the west-mid entry cone; its 3 m footprint leaves the x=26–32 six-meter rotation la |
| `OPEN_FOUNTAIN_NORTH` | open_node | (31.5, 43.2, 0) |  | 0 | Open rotation pocket beside the fountain. |
| `COVER_FOUNTAIN_01` | cover_cluster | (33.8, 35.2, 0) | 2.2 × 1.3 | 80 | Crate cluster breaks the diagonal sightline. |
| `PALM_FOUNTAIN_01` | decorative_palm | (22.4, 45, 0) | 7.4 | 0 | Court silhouette marker. |
| `LANTERN_FOUNTAIN_01` | lantern_anchor | (35.45, 39, 4.25) | 0.42 × 0.72 | 270 | CC0 wooden lantern marking Fountain Court. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_B7_FOUNTAIN_MARKET_BASKET_B7_FOUNTAIN_MARKET_SPILL` | `ASSET_CC0_BASKET` | `B7_FOUNTAIN_MARKET_SPILL` | (20.77, 37.5, 0) | 0.42 × 0.3 × 0.24 | 338 | KEEP at this transform |
| `PLACE_FOUNTAIN_LANTERN_LANTERN_FOUNTAIN_01` | `ASSET_CC0_LANTERN` | `LANTERN_FOUNTAIN_01` | (35.45, 39, 4.25) | 0.22 × 0.23 × 0.53 | 270 | KEEP at this transform |
| `PLACE_B7_FOUNTAIN_MARKET_POT_B7_FOUNTAIN_MARKET_SPILL` | `ASSET_CC0_POTTERY` | `B7_FOUNTAIN_MARKET_SPILL` | (20.65, 36.76, 0) | 0.55 × 0.42 × 0.31 | 357 | KEEP at this transform |
| `PLACE_B7_FOUNTAIN_TEA_STOOL_A_B7_FOUNTAIN_TEA_SPILLOVER` | `ASSET_CC0_TEA_STOOL` | `B7_FOUNTAIN_TEA_SPILLOVER` | (32.73, 41.44, 0) | 0.37 × 0.39 × 0.56 | 172 | KEEP at this transform |
| `PLACE_B7_FOUNTAIN_TEA_STOOL_B_B7_FOUNTAIN_TEA_SPILLOVER` | `ASSET_CC0_TEA_STOOL` | `B7_FOUNTAIN_TEA_SPILLOVER` | (34.27, 41.84, 0) | 0.34 × 0.36 × 0.51 | 354 | KEEP at this transform |
| `PLACE_B7_FOUNTAIN_TEA_TABLE_B7_FOUNTAIN_TEA_SPILLOVER` | `ASSET_CC0_TEA_TABLE` | `B7_FOUNTAIN_TEA_SPILLOVER` | (33.55, 41.6, 0) | 1.13 × 0.71 × 0.8 | 98 | KEEP at this transform |
| `PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_EAST` | `ASSET_COURT_PLANTER` | `B7_FOUNTAIN_PLANTER_EAST` | (34.55, 43.8, 0) | 1.05 × 1.05 × 1.2 | 11 | KEEP (shifted 2026-09-07 to y 43.8, out of the north-wing door floor; waiver CW-A0FABA3DAE26 retired) |
| `PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_WEST` | `ASSET_COURT_PLANTER` | `B7_FOUNTAIN_PLANTER_WEST` | (21.15, 41.9, 0) | 1.05 × 1.05 × 1.2 | 352 | KEEP at this transform |
| `PLACE_FOUNTAIN_COVER_COVER_FOUNTAIN_01` | `ASSET_COVER_GOODS` | `COVER_FOUNTAIN_01` | (33.8, 35.2, 0) | 1.5 × 0.75 × 1 | 80 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_B7_FOUNTAIN_MARKET_CRATE_B7_FOUNTAIN_MARKET_SPILL` | `ASSET_DECORATIVE_CRATE` | `B7_FOUNTAIN_MARKET_SPILL` | (22.17, 37.48, 0) | 0.71 × 0.35 × 0.3 | 1 | KEEP at this transform |
| `PLACE_FOUNTAIN_LMK_FOUNTAIN_01` | `ASSET_FOUNTAIN` | `LMK_FOUNTAIN_01` | (24.5, 43.5, 0) | 3 × 3 × 1.32 | 0 | KEEP (landmark; 3 m footprint at (24.5, 43.5)) |
| `PLACE_B4_FOUNTAIN_RUG_B4_FOUNTAIN_E_RUG_GROUND_01` | `ASSET_GROUND_RUG` | `B4_FOUNTAIN_E_RUG_GROUND_01` | (34.9, 36.14, 0) | 2.56 × 1.32 × 0.04 | 270 | KEEP at this transform |
| `PLACE_B4_FOUNTAIN_RUG_B4_FOUNTAIN_W_RUG_GROUND_01` | `ASSET_GROUND_RUG` | `B4_FOUNTAIN_W_RUG_GROUND_01` | (21.1, 43.86, 0) | 2.56 × 1.32 × 0.04 | 90 | KEEP at this transform |
| `PLACE_BPL19_FOUNTAIN_MARKET_RUG_B7_FOUNTAIN_MARKET_SPILL` | `ASSET_GROUND_RUG` | `B7_FOUNTAIN_MARKET_SPILL` | (21.39, 37.12, 0) | 2.09 × 1.29 × 0.04 | 345 | KEEP at this transform |
| `PLACE_BPL19_FOUNTAIN_MARKET_STALL_B7_FOUNTAIN_MARKET_SPILL` | `ASSET_MARKET_STALL` | `B7_FOUNTAIN_MARKET_SPILL` | (21.35, 37.1, 0) | 1.67 × 1.11 × 1.67 | 342 | KEEP at this transform |
| `PLACE_FOUNTAIN_PALM_PALM_FOUNTAIN_01` | `ASSET_PALM` | `PALM_FOUNTAIN_01` | (22.4, 45, 0) | 3.8 × 3.8 × 7.8 | 0 | KEEP (fronds near the stained window are real-life plausible; waiver CW-216C7CBF937B stays) |
| `PLACE_CENTRAL_SCREENS_FOUNTAIN_COURT_CENTRAL_SCREEN_COURT` | `ASSET_SCREEN_SC_C` | `CENTRAL_SCREEN_COURT` | (36.02, 45.36, 5.15) | 1 × 0.24 × 1.4 | 90 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `patterned_cobblestone`. Finish: the pattern continues around the fountain with a 0.4 m wet-wear ring at its base; flush seams at y 32 and y 48 and at both mid-link mouths; polish along x 26..32 (the rotation lane); contact wear under the planters, spill cluster and tea table.

## 7. Roofs and skyline

Madrasa roof base 9.5, cap 10.79, existing minaret vista kept; merchant house 7.0 / 8.19 shared with the Souk wing (M01: the Souk massing owns the common roof; this GLB adds no roof slab). No new dome.

## 8. Completion checks

- [ ] Both hero arches sealed with dark backs; the threshold rugs lie centred in front of them.
- [ ] One stained window on the madrasa; a mirrored pair of dark windows on the merchant house; the screen seated in the north wing rebate.
- [ ] Nothing new on the court floor; x 26..32 and both link cones clear.
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

