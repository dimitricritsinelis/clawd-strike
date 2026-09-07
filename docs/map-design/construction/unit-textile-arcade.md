# unit-textile-arcade · Textile Arcade

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Textile Arcade, textiles.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The compressed cloth street: two facing arcades on one arch rhythm (three arches and one column each), rug galleries and roll chests in the west arches, packing and light fabric in the east; a canopy and two lines overhead; the ochre two-storey west against the warm aged-lime single-storey east; Rug Gate visible at the north end above the cloth. Cloth edges and busy arch bases carry the localized use.

**Character schedule (build with the numbered tasks):**

- West stays `ph_aged_plaster_ochre`, east `ph_painted_plaster_warm`; their different heights and the intervening columns remain. Cloth identity comes from the retained hanging galleries, roll chest, packing displays and overhead lines. Show hanging versus rolled versus folded stock; never duplicate the approved Souk booth or cover every arch with the same rug.
- On the west, replace skin a=5.72..6.31, z=0.42..1.31 with `ph_worn_plaster_sun`; on the east replace a=9.84..10.01, z=0.35..0.91 with `ph_beige_wall_002` (SD-21). These unequal repairs sit beyond the arch rings and columns. Finished arch stones keep their axes but receive hand-cut edges, not perfectly identical cube bevels.
- The six new awnings retain their scheduled spans, ledgers and drops. Use sag west GROUND_01/03/04 = 0.12/0.08/0.10 m and east = 0.07/0.11/0.09 m. Cloth folds remain supported and inside the original maximum drop; no loose rugs or additional stock on paving.

## 2. Site

### Site · `TEXTILE_ARCADE` (Textile Arcade)

- Rect x 24..35, y 48..64 (11 × 16 m); floor z = 0; floor `cobblestone_color`; authored clear width **6 m** (protected).
- Connects: FOUNTAIN_COURT, RUG_GATE.
- `north` edge: exempt (`short_wall_return`): Only 1.00m of the 11.00m north edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 11.00m south edge; the full face remains an authored traversal opening.
- `west` edge: frontage `FRONTAGE_TEXTILE_ARCADE_WEST` → `BLD_RUG_ARCADE_W`.
- `east` edge: frontage `FRONTAGE_TEXTILE_ARCADE_EAST` → `BLD_RUG_ARCADE_E`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-textile-arcade/` | `TEXTILE_ARCADE` | `["east", "west"]` | `unit-textile-arcade.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-textile-arcade/` holds hand-modelled GLBs and an unapplied package; reference only.

## 3. Walls

### FRONTAGE_TEXTILE_ARCADE_WEST  ·  BLD_RUG_ARCADE_W (arcade, 2 storeys)

- **Role:** arcade. Three rug dealers under one arcade share a common back store reached from behind; each shows stock in its arch and lives above behind a slatted screen. The column marks where two older buildings were joined.
- **Wall line:** west edge of `TEXTILE_ARCADE`; x = 24, y = 49.28 .. 62.72 (a runs south to north); length **13.44 m**; street side +X (street lies east of the wall); kit `Wall(F, (24, 49.28), (24, 62.72), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_aged_plaster_ochre`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 3.55 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 4.15 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; arch impost 1.93 m (spring of the 2.6 arches); signboard centre 3.67, nominal span 3.52..3.82; no continuous sill course on arcades (each screen has its own SD-06 sill at 4.09); coping 6.84..7.0; S2 roofs above (section 7).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `arch_arcade` | RG-H hanging gallery (placed `ASSET_RUG_GALLERY`) | 1.9 | (24, 51.18) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `STORY_1_WINDOW_01` | `window_screened` | SC-V vertical slats (placed `ASSET_TEXTILE_SCREEN_SC_V`) | 1.9 | (24, 51.18) | 1 × 0.24 × 1.4 | 4.15 / 5.55 | 1 |
| `GROUND_02` | `column_arcade` |  | 5.113 | (24, 54.393) | 0.42 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `GROUND_03` | `arch_arcade` | RG-R roll chest (placed `ASSET_RUG_ROLL_CHEST`) | 8.327 | (24, 57.607) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `STORY_1_WINDOW_03` | `window_screened` | SC-V vertical slats (placed) | 8.327 | (24, 57.607) | 1 × 0.24 × 1.4 | 4.15 / 5.55 | 1 |
| `GROUND_04` | `arch_arcade` | packing bay (placed `ASSET_B18_PACKING_FINISH`) | 11.54 | (24, 60.82) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `STORY_1_WINDOW_04` | `window_screened` | SC-V vertical slats (placed) | 11.54 | (24, 60.82) | 1 × 0.24 × 1.4 | 4.15 / 5.55 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.9, 2.6, 0, 3.55), (1.9, 1, 4.15, 1.4), (8.326667, 2.6, 0, 3.55), (8.326667, 1, 4.15, 1.4), (11.54, 2.6, 0, 3.55), (11.54, 1, 4.15, 1.4)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_RUG_GALLERY` at MOUNT_TEXTILE_WEST_GROUND_01_COMPLETE; `ASSET_RUG_ROLL_CHEST` at MOUNT_TEXTILE_WEST_GROUND_03_COMPLETE; `ASSET_B18_PACKING_FINISH` at MOUNT_TEXTILE_WEST_GROUND_04_COMPLETE; `ASSET_TEXTILE_SCREEN_SC_V` at MOUNT_TEXTILE_SCREEN_1; `ASSET_TEXTILE_SCREEN_SC_V` at MOUNT_TEXTILE_SCREEN_3; `ASSET_TEXTILE_SCREEN_SC_V` at MOUNT_TEXTILE_SCREEN_4.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_aged_plaster_ochre` 0..7.0, plinth sandstone 0..0.28, impost band `ph_stone_trim_sandstone` 1.87..1.99 × 0.06 between the arches only, no continuous sill course, coping 6.84..7.0; end piers 0.60 × 0.16 both ends. Completion: ochre arcade with three arches and one pier reading as one rhythm.
2. CREATE three sealed display arches `GROUND_01/03/04` 2.6 × 3.55 pointed at a=1.90/8.327/11.54 (kit `arch`, spring 1.93, ring 0.18 stone, depth 0.42): stone jambs, dark timber back at 0.42, floor deck at 0.14 (the placed displays mount at z 0.14). Leave the arch interiors empty: `ASSET_RUG_GALLERY` (a=1.90), `ASSET_RUG_ROLL_CHEST` (a=8.327) and `ASSET_B18_PACKING_FINISH` (a=11.54) are placed. Completion: each display sits inside its arch, 0.55 m reveal either side.
3. CREATE `GROUND_02` grounded column 0.42 × 0.42 × 3.55 at a=5.113 with a 0.10 capital and 0.08 base (the irregular intervening column; keep it). Completion: touches ground and impost band.
4. CREATE three screen rebates `STORY_1_WINDOW_01/03/04` 1.0 × 1.4 at sill 4.15 / head 5.55 over the three arches (a=1.90/8.327/11.54): frame 0.10, reveal 0.135; placed `ASSET_TEXTILE_SCREEN_SC_V` fill them. No window over the column. Completion: three screens seated, none over `GROUND_02`.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 3.00 spanning a=0.45..3.35, projection 1.20 m, hem drop 0.25, default sag 0.12 (the character schedule overrides sag only), two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01` (ledger spans pier to pier in front of the arch, brackets on the piers at z 2.55); same over `GROUND_03` (a=6.88..9.78) and `GROUND_04` (a=10.09..12.99). Completion: three awnings, evaluated hems at least 2.60 m, the upper third of each arch visible above the cloth.
6. CREATE sign brackets for `TEXTILE_W_SIGN_1` only (a=1.90, board centre z 3.67, span 3.52..3.82) at z 3.82, ±0.9. CREATE the lantern bracket at a=5.92: it starts at (24.0, 55.2, 4.415), reaches 0.45 m into the street to the placed lantern handle at (24.45, 55.2, 4.415), and carries `LANTERN_TEXTILE_01` centred at (24.45, 55.2, 4.15). `TEXTILE_W_SIGN_2` stays dormant. Completion: one sign and one lantern, both supported and clear of the screen sill.
7. KEEP dormant anchors `B4_TEXTILE_W_RUG_GROUND_01`, `BPL16_TEXTILE_W_STALL_GROUND_04` (no floor stock, no loose rugs). Completion: paving in front of the arcade empty.
8. APPLY wear: dust band; polish on the arch jambs 0.9..1.4; textile dye drips 0..0.3 under `GROUND_01`; sun bleach light (faces east). Completion: as listed.
9. CREATE only the south S2 parcel a=0..7.52: roof base 7.0, cap 8.19. KEEP the existing runtime-owned shared north S2 roof over a=7.52..13.44 (y=56.8..62.72), absolute base 8.4 and cap 9.59; do not add an `upper_room`, slab, coping or parapet there. Completion: from Fountain Court the north half reads taller than the south half with one continuous shared roof and no double geometry.

**Why it exists (reality check):** Three rug dealers under one arcade share a common back store reached from behind; each shows stock in its arch and lives above behind a slatted screen. The column marks where two older buildings were joined.

### FRONTAGE_TEXTILE_ARCADE_EAST  ·  BLD_RUG_ARCADE_E (arcade, 1 storey)

- **Role:** arcade. The cheaper side of the street: single storey, light fabrics and packing, stock arrives by the cart parked at the north bay.
- **Wall line:** east edge of `TEXTILE_ARCADE`; x = 35, y = 49.28 .. 62.72 (a runs south to north); length **13.44 m**; street side -X (street lies west of the wall); kit `Wall(F, (35, 49.28), (35, 62.72), faces='W')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_painted_plaster_warm`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 3.55 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; impost 1.93; signboard centre 3.67, nominal span 3.52..3.82; coping 4.34..4.5; parapet cap 5.59 (baseline, S2 keeps it low).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `arch_arcade` | light-fabric packing bay (placed `ASSET_B18_PACKING_FINISH`); no booth here | 1.9 | (35, 51.18) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `GROUND_02` | `column_arcade` |  | 5.113 | (35, 54.393) | 0.42 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `GROUND_03` | `arch_arcade` | RG-H hanging gallery (placed `ASSET_RUG_GALLERY`) | 8.327 | (35, 57.607) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `GROUND_04` | `arch_arcade` | packing bay (placed `ASSET_B18_PACKING_FINISH`) + cart outside | 11.54 | (35, 60.82) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.9, 2.6, 0, 3.55), (8.326667, 2.6, 0, 3.55), (11.54, 2.6, 0, 3.55)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_B18_PACKING_FINISH` at MOUNT_TEXTILE_EAST_GROUND_01_COMPLETE; `ASSET_RUG_GALLERY` at MOUNT_TEXTILE_EAST_GROUND_03_COMPLETE; `ASSET_B18_PACKING_FINISH` at MOUNT_TEXTILE_EAST_GROUND_04_COMPLETE.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_painted_plaster_warm` 0..4.5, plinth sandstone, impost band between arches, coping 4.34..4.5; end piers 0.60 × 0.16. Completion: the low lime arcade opposite the tall ochre one.
2. CREATE three arches `GROUND_01/03/04` 2.6 × 3.55 at a=1.90/8.327/11.54 as on the west face; column `GROUND_02` at a=5.113. Interiors empty for the placed assets: `ASSET_B18_PACKING_FINISH` at a=1.90 (light-fabric packing; no second textile booth on this map: the approved booth stays unique to the Souk), `ASSET_RUG_GALLERY` at a=8.327, `ASSET_B18_PACKING_FINISH` at a=11.54. Completion: three arches, two trades read differently from the west face.
3. No upper windows (single storey). No balcony. Completion: none.
4. SD-08 awning: timber ledger 0.08 × 0.08 at z 3.00 spanning a=0.45..3.35, projection 1.20 m, hem drop 0.25, default sag 0.12 (the character schedule overrides sag only), two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01`, the same over `GROUND_03` (a=6.88..9.78) and `GROUND_04` (a=10.09..12.99). Completion: three awnings, evaluated hems at least 2.60 m.
5. CREATE sign brackets for `TEXTILE_E_SIGN_1` (a=1.90, board centre z 3.67, span 3.52..3.82) at z 3.82, ±0.9. `TEXTILE_E_SIGN_2` stays dormant; `GROUND_03/04` are identified by their goods. Completion: one sign.
6. KEEP the cart `PLACE_B4_TEXTILE_CART_*` at (33.95, 60.82) and the cover cluster at (32.6, 58.2). Completion: nothing else on the paving.
7. KEEP the two roof ties `ASSET_ROOF_TIE_610/490` at x 36.88 (z 5.59 / 4.83); coping passes under them. APPLY wear: dust band, polish on jambs, strong sun bleach (faces west). Completion: as listed.

**Why it exists (reality check):** The cheaper side of the street: single storey, light fabrics and packing, stock arrives by the cart parked at the north bay.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `COVER_TEXTILE_01` | cover_cluster | (32.6, 58.2, 0) | 1.6 × 1.25 | 90 | Folded textile crates at the east wall. |
| `LANTERN_TEXTILE_01` | lantern_anchor | (24.45, 55.2, 4.15) | 0.42 × 0.72 | 90 | CC0 wooden lantern within the textile arcade. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_TEXTILE_EAST_GROUND_01_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_01_COMPLETE` | `ASSET_B18_PACKING_FINISH` | `MOUNT_TEXTILE_EAST_GROUND_01_COMPLETE` | (35.16, 51.18, 0.14) | 1.48 × 0.34 × 1.535 | 90 | KEEP at this transform |
| `PLACE_TEXTILE_EAST_GROUND_04_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_04_COMPLETE` | `ASSET_B18_PACKING_FINISH` | `MOUNT_TEXTILE_EAST_GROUND_04_COMPLETE` | (35.16, 60.82, 0.14) | 1.48 × 0.34 × 1.535 | 90 | KEEP at this transform |
| `PLACE_TEXTILE_WEST_GROUND_04_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_04_COMPLETE` | `ASSET_B18_PACKING_FINISH` | `MOUNT_TEXTILE_WEST_GROUND_04_COMPLETE` | (23.84, 60.82, 0.14) | 1.48 × 0.34 × 1.535 | 270 | KEEP at this transform |
| `PLACE_TEXTILE_LANTERN_LANTERN_TEXTILE_01` | `ASSET_CC0_LANTERN` | `LANTERN_TEXTILE_01` | (24.45, 55.2, 4.15) | 0.221 × 0.235 × 0.53 | 90 | KEEP at this transform |
| `PLACE_TEXTILE_CANOPY_CANOPY_TEXTILE_01` | `ASSET_CLOTH_CANOPY` | `CANOPY_TEXTILE_01` | (29.5, 54.387, 4.2) | 4 × 11 × 0.18 | 90 | KEEP at this transform |
| `PLACE_TEXTILE_COVER_COVER_TEXTILE_01` | `ASSET_COVER_GOODS` | `COVER_TEXTILE_01` | (32.6, 58.2, 0) | 1.5 × 0.75 × 1 | 90 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_01` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_TEXTILE_01` | (29.5, 51.699, 6.15) | 1.35 × 11 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_02` | `ASSET_LAUNDRY_LINE` | `B6_LAUNDRY_TEXTILE_02` | (29.5, 58.868, 4.975) | 1.15 × 11 × 0.85 | 90 | KEEP at this transform |
| `PLACE_B4_TEXTILE_CART_BPL16_TEXTILE_E_STOCK_GROUND_04` | `ASSET_MARKET_CART` | `BPL16_TEXTILE_E_STOCK_GROUND_04` | (33.95, 60.82, 0) | 1.275 × 0.796 × 0.938 | 278 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_TEXTILE_02_MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_02` | `ASSET_ROOF_TIE_490` | `MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_02` | (36.875, 58.868, 4.83) | 3.75 × 0.16 × 0.97 | 180 | KEEP at this transform |
| `PLACE_SUPPORT_B6_LAUNDRY_TEXTILE_01_MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_01` | `ASSET_ROOF_TIE_610` | `MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_01` | (36.875, 51.699, 5.59) | 3.75 × 0.16 × 0.65 | 180 | KEEP at this transform |
| `PLACE_TEXTILE_EAST_GROUND_03_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_03_COMPLETE` | `ASSET_RUG_GALLERY` | `MOUNT_TEXTILE_EAST_GROUND_03_COMPLETE` | (35.16, 57.607, 0.14) | 1.48 × 0.32 × 2.302 | 90 | KEEP at this transform |
| `PLACE_TEXTILE_WEST_GROUND_01_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_01_COMPLETE` | `ASSET_RUG_GALLERY` | `MOUNT_TEXTILE_WEST_GROUND_01_COMPLETE` | (23.84, 51.18, 0.14) | 1.48 × 0.32 × 2.302 | 270 | KEEP at this transform |
| `PLACE_TEXTILE_WEST_GROUND_03_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_03_COMPLETE` | `ASSET_RUG_ROLL_CHEST` | `MOUNT_TEXTILE_WEST_GROUND_03_COMPLETE` | (23.84, 57.607, 0.14) | 1.48 × 0.32 × 2.3 | 270 | KEEP at this transform |
| `PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_1` | `ASSET_SIGNBOARD` | `TEXTILE_E_SIGN_1` | (34.88, 51.18, 3.67) | 2.2 × 0.12 × 0.304 | 270 | KEEP (centre z 3.67, nominal board span 3.52..3.82; both faces share this datum) |
| `PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_1` | `ASSET_SIGNBOARD` | `TEXTILE_W_SIGN_1` | (24.12, 51.18, 3.67) | 2.2 × 0.12 × 0.304 | 90 | KEEP (centre z 3.67, nominal board span 3.52..3.82; masonry stubs meet its top at z 3.82) |
| `PLACE_TEXTILE_SCREEN_1_MOUNT_TEXTILE_SCREEN_1` | `ASSET_TEXTILE_SCREEN_SC_V` | `MOUNT_TEXTILE_SCREEN_1` | (23.985, 51.18, 4.15) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_TEXTILE_SCREEN_3_MOUNT_TEXTILE_SCREEN_3` | `ASSET_TEXTILE_SCREEN_SC_V` | `MOUNT_TEXTILE_SCREEN_3` | (23.985, 57.607, 4.15) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_TEXTILE_SCREEN_4_MOUNT_TEXTILE_SCREEN_4` | `ASSET_TEXTILE_SCREEN_SC_V` | `MOUNT_TEXTILE_SCREEN_4` | (23.985, 60.82, 4.15) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `CANOPY_TEXTILE_01` | (24, 54.387, 4.2) | (35, 54.387, 4.2) | 4 | Covered textile arcade span. |
| `B6_LAUNDRY_TEXTILE_01` | (24, 51.699, 6.2) | (35, 51.699, 6.1) | 1.35 | Laundry line hung above the arcade's upper-window heads. |
| `B6_LAUNDRY_TEXTILE_02` | (24, 58.868, 5.05) | (35, 58.868, 4.9) | 1.15 | Line shifted 0.18 m north to clear the complete upper window; east end is carried by a roof-seated hanger. |

West ends of `CANOPY_TEXTILE_01` (z 4.2) and the two lines bear on 1.2 m ledgers at those heights on the west face (between the screen heads 5.55 and the sill course for the lines; the canopy ledger at 4.2 sits above the signboard span and below the screen sills, spanning a pier); east ends on the placed roof ties. Cloth `ph_hessian_230`; garments indigo and rust.

## 6. Ground, wear and drainage

KEEP `cobblestone_color`. Finish: flush seams at y 48 / 64; polish along the centre; contact wear under the cover cluster and the cart; no loose rugs.

**`TEXTILE_ARCADE` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(29.2, 48.3, 0.014), (29.8, 48.3, 0.014), (29.8, 63.7, 0.014), (29.2, 63.7, 0.014)], 'polish')
wear_patch(F, [(24.02, 50.58, 0.014), (24.35, 50.58, 0.014), (24.35, 51.78, 0.014), (24.02, 51.78, 0.014)], 'dye')
wear_patch(F, [(34.323293, 60.042986, 0.014), (34.523007, 61.46402, 0.014), (33.576707, 61.597014, 0.014), (33.376993, 60.17598, 0.014)], 'dust')
wear_patch(F, [(32.145, 59.03, 0.014), (32.145, 57.37, 0.014), (33.055, 57.37, 0.014), (33.055, 59.03, 0.014)], 'dust')
```

## 7. Roofs and skyline

S2 adopted: west south parcel 7.0 / 8.19; the shared Tea/Textile north wing (y 56.8..62.72) is the existing runtime roof, absolute 8.4 / 9.59, with no face-GLB roof geometry; east 4.5 / 5.59 flat with the two roof ties. Sky gaps between the spans stay open.

## 8. Required result

- [ ] Six arches on the same axes across the lane; both columns grounded.
- [ ] Three screens seated on the west; no window over either column; no upper windows on the east.
- [ ] Both signs at z 3.67, 0.30 high; canopy ledger clears the sign boards.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

