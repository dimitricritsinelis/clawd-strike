# unit-rug-gate · Rug Gate

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Rug Gate, the gate.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The northern threshold: the repaired gate arch with its blue accent spans the lane; one rug merchant on the west, the gatekeeper's quiet house on the east, the receiving backdrop beyond. Restraint: the gate is the landmark, nothing competes; repairs remain integrated into its warm aged surface.

**Character schedule (build with the numbered tasks):**

- The merchant plaster, retained rug rolls and warm timber face the gatekeeper rubble, planted sill and lantern. Keep the gate blue accent as the distant focal point; the house is an occupied home, not a second rug shop.
- On FRONTAGE_RUG_GATE_WEST replace skin a=3.48..3.98, z=0.35..1.05 with `ph_worn_plaster_sun` (SD-21). The shop jambs get touch polish; the service door gets localized foot dust. Keep the unlike upper closures and use SD-21 softened plaster returns. No tilted portal or rug across its floor.

## 2. Site

### Site · `RUG_GATE` (Rug Gate)

- Rect x 21..34, y 64..78 (13 × 14 m); floor z = 0; floor `patterned_cobblestone`; authored clear width **6 m** (protected).
- Connects: LINK_EAST_UPPER, LINK_WEST_UPPER, SPAWN_B_COURTYARD, TEXTILE_ARCADE.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 13.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`architectural_cut_edge`): The 3.00m supported run on the 13.00m south edge frames the spawn connector and is not a served facade plane.
- `west` edge: frontage `FRONTAGE_RUG_GATE_WEST` → `BLD_RUG_MERCHANT`.
- `east` edge: frontage `FRONTAGE_RUG_GATE_EAST` → `BLD_GATE_KEEPER`.
- `east` edge: frontage `FRONTAGE_RUG_GATE_EAST_SOUTH` → `BLD_GATE_KEEPER`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-rug-gate/` | `RUG_GATE` | `["east", "west"]` | `unit-rug-gate.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-rug-gate/` holds hand-modelled GLBs and an unapplied package; reference only.

## 3. Walls

### FRONTAGE_RUG_GATE_WEST  ·  BLD_RUG_MERCHANT (shop, 2 storeys)

- **Role:** shop. One rug merchant with his display, his locked service door and two upper rooms; the last shop before the city gate, so no second stall crowds the portal.
- **Wall line:** west edge of `RUG_GATE`; x = 21, y = 65.12 .. 72 (a runs south to north); length **6.88 m**; street side +X (street lies east of the wall); kit `Wall(F, (21, 65.12), (21, 72), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_plastered_wall`, trim `ph_trim_sanded_01`, timber `ph_worn_planks`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 2.7 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; awning ledger 2.85; signboard centre 3.10, nominal span 2.95..3.25; sill course 3.50..3.62; coping 6.84..7.0; parapet +0.75.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `shop_recess_market` | RG-R roll chest (placed `ASSET_RUG_ROLL_CHEST`) | 1.8 | (21, 66.92) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_01` | `window_shuttered` | SH-P paneled walnut (placed `ASSET_SHUTTER_PANELED`) | 1.8 | (21, 66.92) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |
| `GROUND_02` | `door_shop_timber` | closed service door (was a shop recess; same bay id) | 5.08 | (21, 70.2) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_02` | `window_dark_recess` | dark recess 0.9 × 1.25 (kit window, closed timber leaf) | 5.08 | (21, 70.2) | 0.9 × 0.28 × 1.25 | 3.68 / 4.93 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.8, 2.4, 0, 2.7), (1.8, 1.6, 3.68, 1.65), (5.08, 1.15, 0, 2.7), (5.08, 0.9, 3.68, 1.25)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_RUG_ROLL_CHEST` at MOUNT_RUG_DISPLAY_COMPLETE; `ASSET_SHUTTER_PANELED` at MOUNT_RUG_PANELED_WINDOW.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_plastered_wall`, plinth sandstone, sill course 3.50..3.62, coping 6.84..7.0; corners `open` (south: the Textile arcade continues; north: the gate abutment): no end pilasters, but a 0.16 quoin strip at a=6.88 where the gate kit meets. Completion: the merchant house reads as the last shop before the gate.
2. CREATE `GROUND_01` shop recess 2.4 × 2.7 × 1.35 at a=1.80 (as Spice); interior empty for the placed `ASSET_RUG_ROLL_CHEST` at (20.84, 66.92, 0.08). Completion: chest inside the recess.
3. REPLACE `GROUND_02` with a closed shop-service door 1.15 × 2.7 at a=5.08 per SD-05 (`ph_rough_pine_door`, straps). This bay has no shop dressing. Completion: door reads closed; the `RUG_W_SHOP_2` collision anchor is untouched.
4. CREATE `STORY_1_WINDOW_01` rebate 1.6 × 1.65 at sill 3.68 / head 5.33 over a=1.80 for the placed `ASSET_SHUTTER_PANELED` (z 3.68); CREATE `STORY_1_WINDOW_02` dark recess 0.9 × 1.25 at sill 3.68 / head 4.93 over a=5.08 with a closed dark leaf. Completion: two different upper closures.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 2.85 spanning a=0.55..3.05, projection 1.10 m, hem drop 0.25, default sag 0.12 (the character schedule overrides sag only), two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01` only. Completion: one awning, hem 2.48.
6. CREATE sign brackets for `RUG_W_SIGN_1` (a=1.80, board centre z 3.10, span 2.95..3.25) at z 3.25, ±0.9. `RUG_W_SIGN_2` stays dormant. Completion: the board clears the shutter sill by 0.10.
7. KEEP `COVER_RUG_01` cluster at (23.0, 68.2). Nothing else on the paving; the door approach (0.8 m) and the gate abutment corner stay empty. Completion: as stated.
8. APPLY wear: dust band, polish at both openings, light bleach. Completion: as listed.

**Why it exists (reality check):** One rug merchant with his display, his locked service door and two upper rooms; the last shop before the city gate, so no second stall crowds the portal.

### FRONTAGE_RUG_GATE_EAST  ·  BLD_GATE_KEEPER (house, 1 storey)

- **Role:** house. The gatekeeper's one-room house: a door with a lantern for the night watch, one window, nothing to sell.
- **Wall line:** east edge of `RUG_GATE`; x = 34, y = 72 .. 76.88 (a runs south to north); length **4.88 m**; street side -X (street lies west of the wall); kit `Wall(F, (34, 72), (34, 76.88), faces='W')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.25 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; coping 4.34..4.5; parapet +0.65.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `door_residential_timber` | closed household door with lantern over | 1.775 | (34, 73.775) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `BAY_02` | `window_dark_recess` | dark recess window, planter under | 3.18 | (34, 75.18) | 0.9 × 0.28 × 1.25 | 1 / 2.25 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.775002, 1.05, 0, 2.25), (3.180003, 0.9, 1, 1.25)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at over the door at 1.77 m along, under the head; `ASSET_COURT_PLANTER` at under the window.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth, course 2.84..2.96, coping 4.34..4.5; corners `held`: end piers 0.45 × 0.16. Completion: a low stone house beside the gate.
2. CREATE `BAY_01` closed door 1.05 × 2.25 at a=1.775 (SD-05). CREATE the lantern bracket at a=2.44: it starts at (34.0, 74.44, 3.915), reaches 0.25 m into the street to the placed lantern handle at (33.75, 74.44, 3.915), and carries `LANTERN_RUG_01` centred at (33.75, 74.44, 3.65). Completion: door reads closed and the lantern hangs from its wall bracket, not in the air.
3. CREATE `BAY_02` dark recess window 0.9 × 1.25 at sill 1.0 / head 2.25, a=3.18, closed dark leaf and a 0.06 sill. CREATE a grounded architectural planter trough directly below it: 1.05 m along × 0.30 m projection × 0.55 m high, centred at (33.85, 75.18), bottom z=0; sandstone side, end and base walls 0.06 thick, soil top z=0.43, contained foliage to z=0.75 within the same 1.05 × 0.30 footprint. Its street edge is x=33.70, 0.30 m from the x=34 wall, so it stays inside the wall band and outside the door floor. Completion: planted sill feature with a grounded masonry base, no free placement.
4. APPLY wear: dust band, polish at the door. No awning, sign, shop or goods. Completion: as listed.

**Why it exists (reality check):** The gatekeeper's one-room house: a door with a lantern for the night watch, one window, nothing to sell.

### FRONTAGE_RUG_GATE_EAST_SOUTH  ·  BLD_GATE_KEEPER (house, 1 storey)

- **Role:** house. The blank flank of the same house on the other side of the link passage.
- **Wall line:** east edge of `RUG_GATE`; x = 34, y = 65.12 .. 67 (a runs south to north); length **1.88 m**; street side -X (street lies west of the wall); kit `Wall(F, (34, 65.12), (34, 67), faces='W')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 3.4 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; coping 4.34..4.5.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `pilaster_facade` |  | 0.94 | (34, 66.06) | 0.42 × 0.24 × 3.4 | 0 / 3.4 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_05` (cut stone against the rubble stone of the main face: the validator's adjacent-material rule), plinth, course, coping continuous with the main face at 4.5. Completion: same coping height across the link.
2. CREATE `BAY_01` grounded pilaster 0.42 × 0.24 × 3.4 at a=0.94 (SD, full height, not a bollard). Completion: touches ground and the course.
3. APPLY wear: dust band only. Nothing else: no niche, door, window or goods. Completion: as listed.

**Why it exists (reality check):** The blank flank of the same house on the other side of the link passage.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_RUG_GATE_01` | hero_landmark | (27.5, 76.3, 0) | 13 × 6.8 | 180 | Lane-spanning northern gate arch tied into both inward-facing frontage walls without opening the exterior perimeter. |
| `COVER_RUG_01` | cover_cluster | (23, 68.2, 0) | 1.7 × 1.1 | 0 | Rolled rugs protect the upper jog. |
| `LANTERN_RUG_01` | lantern_anchor | (32.5, 70, 4.25) | 0.42 × 0.72 | 270 | CC0 wooden lantern below Rug Gate. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_RUG_LANTERN_LANTERN_RUG_01` | `ASSET_CC0_LANTERN` | `LANTERN_RUG_01` | (33.75, 74.44, 3.65) | 0.221 × 0.235 × 0.53 | 270 | KEEP at this transform |
| `PLACE_RUG_COVER_COVER_RUG_01` | `ASSET_COVER_GOODS` | `COVER_RUG_01` | (23, 68.2, 0) | 1.5 × 0.75 × 1 | 0 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_RUG_ARCH_LMK_RUG_GATE_01` | `ASSET_HERO_ARCH` | `LMK_RUG_GATE_01` | (27.5, 76.3, 0) | 13 × 0.8 × 6.8 | 180 | KEEP (landmark kit; abutments, soffit and crown are one composition) |
| `PLACE_RUG_DISPLAY_COMPLETE_MOUNT_RUG_DISPLAY_COMPLETE` | `ASSET_RUG_ROLL_CHEST` | `MOUNT_RUG_DISPLAY_COMPLETE` | (20.84, 66.92, 0.08) | 1.48 × 0.32 × 2.3 | 270 | KEEP at this transform |
| `PLACE_RUG_PANELED_WINDOW_MOUNT_RUG_PANELED_WINDOW` | `ASSET_SHUTTER_PANELED` | `MOUNT_RUG_PANELED_WINDOW` | (20.985, 66.92, 3.68) | 1.6 × 0.24 × 1.65 | 270 | KEEP at this transform |
| `PLACE_RUG_SIGNS_RUG_W_SIGN_1` | `ASSET_SIGNBOARD` | `RUG_W_SIGN_1` | (21.12, 66.92, 3.1) | 2.2 × 0.12 × 0.304 | 90 | KEEP (centre z 3.10, nominal board span 2.95..3.25; masonry stubs meet its top at z 3.25) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `patterned_cobblestone`; flush seam only at existing transitions; polish under the gate; contact wear under the cover cluster.

**`RUG_GATE` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(27.2, 64.3, 0.014), (27.8, 64.3, 0.014), (27.8, 77.7, 0.014), (27.2, 77.7, 0.014)], 'polish')
wear_patch(F, [(22.17, 67.745, 0.014), (23.83, 67.745, 0.014), (23.83, 68.655, 0.014), (22.17, 68.655, 0.014)], 'dust')
```

## 7. Roofs and skyline

Merchant house 7.0 / 8.19 (emitted max 8.87 kept); gatekeeper 4.5 / 5.59 low; the gate crown and the `pushRugGateCrownBackdrop` planes are kept as built.

## 8. Required result

- [ ] One shop recess, one closed service door, two different upper closures on the west; one door, one window on the east.
- [ ] Sign at z 3.10 clearing the shutter frame.
- [ ] The lantern hangs from a bracket over the gatekeeper's door; the planter sits under the window.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

