# unit-rug-gate · Rug Gate

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-rug-gate --tag r1-before` prints the same walls and must agree. Also called: Rug Gate, the gate.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The northern threshold: the repaired gate arch with its blue accent spans the lane; one rug merchant on the west, the gatekeeper's quiet house on the east, the receiving backdrop beyond. Restraint: the gate is the landmark, nothing competes.

## 2. Site

### Site · `RUG_GATE` (Rug Gate)

- Rect x 21..34, y 64..78 (13 × 14 m); floor z = 0; floor `patterned_cobblestone`; authored clear width **6 m** (protected).
- Connects: LINK_EAST_UPPER, LINK_WEST_UPPER, SPAWN_B_COURTYARD, TEXTILE_ARCADE.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 13.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`architectural_cut_edge`): The 3.00m supported run on the 13.00m south edge frames the spawn connector and is not a served facade plane.
- `west` edge: frontage `FRONTAGE_RUG_GATE_WEST` → `BLD_RUG_MERCHANT`.
- `east` edge: frontage `FRONTAGE_RUG_GATE_EAST` → `BLD_GATE_KEEPER`.
- `east` edge: frontage `FRONTAGE_RUG_GATE_EAST_SOUTH` → `BLD_GATE_KEEPER`.

**Existing source.** `assets/source/unit-rug-gate/` holds hand-modelled GLBs and an unapplied package; reference only.

## 3. Walls

### FRONTAGE_RUG_GATE_WEST  ·  BLD_RUG_MERCHANT (shop, 2 storeys)

- **Role:** public front. A complete rug display and a closed north service door, with a paneled upper closure above the display and one smaller dark window above the entry.
- **Wall line:** west edge of `RUG_GATE`; x = 21, y = 65.12 .. 72 (a runs south to north); length **6.88 m**; street side +X (street lies east of the wall); kit `Wall(F, (21, 65.12), (21, 72), faces='E')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 7, parapet cap shared owner / landmark, emitted max 8.870.
- **Facade GLB frame:** width 6.88 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `active_merchant_rug_complete`):** wall `ph_plastered_wall`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `open`; solid end piers reserved: 0.6 m at a=0, 1.23 m at a=L. Ground head datum 2.7 m.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; awning ledger 2.85; sign 3.10..3.48; sill course 3.50..3.62; coping 6.84..7.0; parapet +0.75.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `shop_recess_market` | RG-R roll chest (placed `ASSET_RUG_ROLL_CHEST`) | 1.8 | (21, 66.92) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_01` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`) | 1.8 | (21, 66.92) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |  |
| `GROUND_02` | `door_shop_timber` | closed service door (was a shop recess; same bay id) | 5.08 | (21, 70.2) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_02` | `window_dark_recess` | dark recess 0.9 × 1.25 (kit window, closed timber leaf) | 5.08 | (21, 70.2) | 0.9 × 0.28 × 1.25 | 3.68 / 4.93 | 1 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_RUG_ROLL_CHEST` at MOUNT_RUG_DISPLAY_COMPLETE; `ASSET_SHUTTER_PANELED` at MOUNT_RUG_PANELED_WINDOW.

**Composition.** One rug display and one closed north service door sit below two differently closed upper windows in the gate approach.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_plastered_wall`, plinth sandstone, sill course 3.50..3.62, coping 6.84..7.0; corners `open` (south: the Textile arcade continues; north: the gate abutment): no end pilasters, but a 0.16 quoin strip at a=6.88 where the gate kit meets. Completion: the merchant house reads as the last shop before the gate.
2. CREATE `GROUND_01` shop recess 2.4 × 2.7 × 1.35 at a=1.80 (as Spice); interior empty for the placed `ASSET_RUG_ROLL_CHEST` at (20.84, 66.92, 0.08). Completion: chest inside the recess.
3. REPLACE `GROUND_02` (was a shop recess) with a closed shop-service door 1.15 × 2.7 at a=5.08 per SD-05 (`ph_rough_pine_door`, straps). The old shop dressings under this bay stay suppressed. Completion: door reads closed; the `RUG_W_SHOP_2` collision anchor is untouched.
4. CREATE `STORY_1_WINDOW_01` rebate 1.6 × 1.65 at sill 3.68 / head 5.33 over a=1.80 for the placed `ASSET_SHUTTER_PANELED` (z 3.68); CREATE `STORY_1_WINDOW_02` dark recess 0.9 × 1.25 at sill 3.68 / head 4.93 over a=5.08 with a closed dark leaf. Completion: two different upper closures.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 2.85 spanning a=0.55..3.05, projection 1.10 m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01` only. Completion: one awning, hem 2.48.
6. CREATE sign brackets for `RUG_W_SIGN_1` (a=1.80, board at z 3.10..3.40) at z 3.25, ±0.9. `RUG_W_SIGN_2` stays dormant. Completion: the board clears the shutter sill by 0.10.
7. KEEP `COVER_RUG_01` cluster at (23.0, 68.2). Nothing else on the paving; the door approach (0.8 m) and the gate abutment corner stay empty. Completion: as stated.
8. APPLY wear: dust band, polish at both openings, light bleach. Completion: as listed.

**Why it exists (reality check):** One rug merchant with his display, his locked service door and two upper rooms; the last shop before the city gate, so no second stall crowds the portal.

### FRONTAGE_RUG_GATE_EAST  ·  BLD_GATE_KEEPER (house, 1 storey)

- **Role:** public front. Small house beside the northern gate: one door, one window beside, one above. The 1.9 m return is its blank flank.
- **Wall line:** east edge of `RUG_GATE`; x = 34, y = 72 .. 76.88 (a runs south to north); length **4.88 m**; street side -X (street lies west of the wall); kit `Wall(F, (34, 72), (34, 76.88), faces='W')`.
- **Massing `MASSING_LOW_MERCHANT`:** wall top 4.5 m, depth 4.2 m, roof `flat_parapet`, roof setback 0.45 m, parapet +0.65 m; baseline survey: roof base 4.5, parapet cap shared owner / landmark, emitted max 4.760.
- **Facade GLB frame:** width 4.88 m × height 4.5 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `held`; solid end piers reserved: 1.25 m at a=0, 1.25 m at a=L. Ground head datum 2.25 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; coping 4.34..4.5; parapet +0.65.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `door_residential_timber` | closed household door with lantern over | 1.77 | (34, 73.78) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |  |
| `BAY_02` | `window_dark_recess` | dark recess window, planter under | 3.18 | (34, 75.18) | 0.9 × 0.28 × 1.25 | 1 / 2.25 | 0 |  |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at over the door at 1.77 m along, under the head; `ASSET_COURT_PLANTER` at under the window.

**Composition.** One low gatekeeper dwelling has an offset closed entry and a small north window; its detached-looking south piece is a blank flank across the link.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course 2.84..2.96, coping 4.34..4.5; corners `held`: end piers 0.45 × 0.16. Completion: a low stone house beside the gate.
2. CREATE `BAY_01` closed door 1.05 × 2.25 at a=1.775 (SD-05) with a lantern bracket (SD-10) centred over the head at z 2.55, 0.35 proud, carrying the placed `ASSET_CC0_LANTERN` (`LANTERN_RUG_01` at (33.75, 74.44, 3.65)): move nothing, make the bracket reach the lantern's hook. Completion: lantern hangs from a bracket on the wall, not in the air.
3. CREATE `BAY_02` dark recess window 0.9 × 1.25 at sill 1.0 / head 2.25, a=3.18, closed dark leaf and a 0.06 sill; the bound `ASSET_COURT_PLANTER` (1.05 × 1.05 × 1.2, procedural id `bazaar_court_planter`) is not placed today: ADD it through `placements[]` as a GLB built in `build.py` from the same envelope, at (33.3, 75.18, 0), yawDeg 0. Completion: planter under the window, 0.2 m off the wall, outside the 0.8 m door floor.
4. APPLY wear: dust band, polish at the door. No awning, sign, shop or goods. Completion: as listed.

**Why it exists (reality check):** The gatekeeper's one-room house: a door with a lantern for the night watch, one window, nothing to sell.

### FRONTAGE_RUG_GATE_EAST_SOUTH  ·  BLD_GATE_KEEPER (house, 1 storey)

- **Role:** secondary/service wing front. Small house beside the northern gate: one door, one window beside, one above. The 1.9 m return is its blank flank.
- **Wall line:** east edge of `RUG_GATE`; x = 34, y = 65.12 .. 67 (a runs south to north); length **1.88 m**; street side -X (street lies west of the wall); kit `Wall(F, (34, 65.12), (34, 67), faces='W')`.
- **Massing `MASSING_LOW_MERCHANT`:** wall top 4.5 m, depth 4.2 m, roof `flat_parapet`, roof setback 0.45 m, parapet +0.65 m; baseline survey: roof base 4.5, parapet cap shared owner / landmark, emitted max 4.760.
- **Facade GLB frame:** width 1.88 m × height 4.5 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_cut_stone`):** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `open`; solid end piers reserved: 0.73 m at a=0, 0.73 m at a=L. Ground head datum 3.4 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; coping 4.34..4.5.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `pilaster_facade` |  | 0.94 | (34, 66.06) | 0.42 × 0.24 × 3.4 | 0 / 3.4 | 0 |  |


**Composition.** One low gatekeeper dwelling has an offset closed entry and a small north window; its detached-looking south piece is a blank flank across the link.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05` (cut stone against the rubble stone of the main face: the validator's adjacent-material rule), plinth, course, coping continuous with the main face at 4.5. Completion: same coping height across the link.
2. CREATE `BAY_01` grounded pilaster 0.42 × 0.24 × 3.4 at a=0.94 (SD, full height, not a bollard). Completion: touches ground and the course.
3. APPLY wear: dust band only. Nothing else: no niche, door, window or goods. Completion: as listed.

**Why it exists (reality check):** The blank flank of the same house on the other side of the link passage.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_RUG_GATE_01` | hero_landmark | (27.5, 76.3, 0) | 13 × 6.8 | 180 | Lane-spanning northern gate arch tied into both inward-facing frontage walls without opening the exterior perimeter. |
| `COVER_RUG_01` | cover_cluster | (23, 68.2, 0) | 1.7 × 1.1 | 0 | Rolled rugs protect the upper jog. |
| `LANTERN_RUG_01` | lantern_anchor | (32.5, 70, 4.25) | 0.42 × 0.72 | 270 | CC0 wooden lantern below Rug Gate. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_RUG_LANTERN_LANTERN_RUG_01` | `ASSET_CC0_LANTERN` | `LANTERN_RUG_01` | (33.75, 74.44, 3.65) | 0.22 × 0.23 × 0.53 | 270 | KEEP at this transform |
| `PLACE_RUG_COVER_COVER_RUG_01` | `ASSET_COVER_GOODS` | `COVER_RUG_01` | (23, 68.2, 0) | 1.5 × 0.75 × 1 | 0 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_RUG_ARCH_LMK_RUG_GATE_01` | `ASSET_HERO_ARCH` | `LMK_RUG_GATE_01` | (27.5, 76.3, 0) | 13 × 0.8 × 6.8 | 180 | KEEP (landmark kit; abutments, soffit and crown are one composition) |
| `PLACE_RUG_DISPLAY_COMPLETE_MOUNT_RUG_DISPLAY_COMPLETE` | `ASSET_RUG_ROLL_CHEST` | `MOUNT_RUG_DISPLAY_COMPLETE` | (20.84, 66.92, 0.08) | 1.48 × 0.32 × 2.3 | 270 | KEEP at this transform |
| `PLACE_RUG_PANELED_WINDOW_MOUNT_RUG_PANELED_WINDOW` | `ASSET_SHUTTER_PANELED` | `MOUNT_RUG_PANELED_WINDOW` | (20.98, 66.92, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_RUG_SIGNS_RUG_W_SIGN_1` | `ASSET_SIGNBOARD` | `RUG_W_SIGN_1` | (21.12, 66.92, 3.1) | 2.2 × 0.12 × 0.3 | 90 | KEEP (moved 2026-09-07 to z 3.10, board 0.30 high; clears the sill course 3.50 by 0.10; waiver CW-D82E53BBDABD retired) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `patterned_cobblestone`; flush seam only at existing transitions; polish under the gate; contact wear under the cover cluster.

## 7. Roofs and skyline

Merchant house 7.0 / 8.19 (emitted max 8.87 kept); gatekeeper 4.5 / 5.59 low; the gate crown and the `pushRugGateCrownBackdrop` planes are kept as built.

## 8. Completion checks

- [ ] One shop recess, one closed service door, two different upper closures on the west; one door, one window on the east.
- [ ] Sign at z 3.10 clearing the shutter frame.
- [ ] The lantern hangs from a bracket over the gatekeeper's door; the planter sits under the window.
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

