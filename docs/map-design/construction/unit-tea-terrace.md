# unit-tea-terrace · Tea house, ramp, terrace, stairs and landing

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-tea-terrace --tag r1-before` prints the same walls and must agree. Also called: tea house, Tea Terrace, tea ramp, tea stairs, tea landing (shoot units unit-tea-ramp, unit-tea-terrace, unit-tea-stairs, unit-tea-landing).

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The raised route: ramp up from Caravan Court, the tea house on the terrace at +1.4 with its serving recess, table and stools under a shade sail, stairs down to the landing and the west-upper link. The retaining screens on the west stay tall and quiet. All tea-house heights are relative to the 1.4 floor.

## 2. Site

### Site · `TEA_RAMP` (Tea Terrace Ramp)

- Rect x 11..19, y 48..56 (8 × 8 m); ramp along y: z 0 → 1.4; floor `large_sandstone_blocks_01`; authored clear width **4 m** (protected).
- Connects: CARAVAN_COURT, TEA_TERRACE.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`architectural_cut_edge`): The 4.00m supported run on the 8.00m south edge frames the ramp entry and is not a served facade plane.
- `east` edge: exempt (`retaining_wall`): The 8.00m east wall follows and retains the complete authored ramp grade.
- `west` edge: exempt (`retaining_wall`): The 8.00m west wall follows and retains the complete authored ramp grade.

### Site · `TEA_TERRACE` (Tea Terrace)

- Rect x 11..19, y 56..66 (8 × 10 m); floor z = 1.4; floor `patterned_cobblestone`; authored clear width **4 m** (protected).
- Connects: TEA_RAMP, TEA_STAIRS.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m south edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`retaining_wall`): The complete 10.00m west wall retains the raised terrace and is not a served opening plane.
- `east` edge: frontage `FRONTAGE_TEA_TERRACE_EAST` → `BLD_TEA_HOUSE`.

### Site · `TEA_STAIRS` (Tea Terrace Stairs)

- Rect x 11..19, y 66..72 (8 × 6 m); ramp along y: z 1.4 → 0; floor `large_sandstone_blocks_01`; authored clear width **4 m** (protected).
- Connects: TEA_LANDING, TEA_TERRACE.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m south edge; the full face remains an authored traversal opening.
- `east` edge: exempt (`retaining_wall`): The 6.00m east wall follows and retains the complete authored stair grade.
- `west` edge: exempt (`retaining_wall`): The 6.00m west wall follows and retains the complete authored stair grade.

### Site · `TEA_LANDING` (Tea Terrace Landing)

- Rect x 11..19, y 72..76.5 (8 × 4.5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **4.5 m** (protected).
- Connects: LINK_WEST_UPPER, TEA_STAIRS.
- `north` edge: exempt (`short_wall_return`): Only 2.00m of the 8.00m north edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m south edge; the full face remains an authored traversal opening.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 4.50m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`retaining_wall`): The 4.00m wall run on the 4.50m west edge retains the authored raised landing grade.

**Existing source.** No unit folder yet.

## 3. Walls

### FRONTAGE_TEA_TERRACE_EAST  ·  BLD_TEA_HOUSE (tea house, 2 storeys)

- **Role:** public front. Tea serving recess and closed entry beneath louvered and woven upper closures; the existing raised terrace, tea furniture and high shade remain.
- **Wall line:** east edge of `TEA_TERRACE`; x = 19, y = 56.8 .. 65.2 (a runs south to north); length **8.4 m**; street side -X (street lies west of the wall); kit `Wall(F, (19, 56.8), (19, 65.2), faces='W')`.
- **Massing `MASSING_MID_MIXED`:** wall top 7 m, depth 4.8 m, roof `setback_flat`, roof setback 0.75 m, parapet +0.75 m; baseline survey: roof base 8.4, parapet cap 9.590, emitted max 12.068.
- **Facade GLB frame:** width 8.4 m × height 7 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `active_merchant_ochre`):** wall `ph_beige_wall_002`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_sun`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`.
- **Corners:** `open`; solid end piers reserved: 0.6 m at a=0, 1.23 m at a=L. Ground head datum 2.7 m.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** ALL heights here are above the terrace floor z = 1.4 (add 1.4 for absolute): plinth 0..0.28; awning ledger 2.85; sign 3.05..3.43; sill course 3.50..3.62; coping 6.84..7.0 (absolute 8.4); S2 roof base 8.4, cap 9.59 absolute.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `GROUND_01` | `shop_recess_market` | tea serving recess (brass/porcelain/linen shelves) | 1.8 | (19, 58.6) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_01` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`) | 1.8 | (19, 58.6) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_LOUVERED (MOUNT_TEA_WINDOW_1) |
| `GROUND_02` | `door_shop_timber` | closed tea-house entry | 6.6 | (19, 63.4) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |  |
| `STORY_1_WINDOW_02` | `window_shuttered` → `ASMB_SHUTTER_WINDOW` | SH-W woven infill (placed `ASSET_SHUTTER_WOVEN`) | 6.6 | (19, 63.4) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 | ASSET_SHUTTER_WOVEN (MOUNT_TEA_WINDOW_2) |

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SHUTTER_LOUVERED` at MOUNT_TEA_WINDOW_1; `ASSET_SHUTTER_WOVEN` at MOUNT_TEA_WINDOW_2.

**Composition.** A tea serving recess and a closed entrance sit under two shuttered upper rooms overlooking the raised terrace.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB with its origin on the terrace floor (z 1.4): skin `ph_beige_wall_002`, plinth sandstone 0..0.28, sill course 3.50..3.62, coping 6.84..7.0; corners `open`: the north end meets the stairs' retaining stone with a 0.16 quoin strip, the south end the ramp's. Completion: the tea house reads as a two-storey house on a raised street.
2. CREATE `GROUND_01` serving recess 2.4 × 2.7 × 1.35 at a=1.80: stone jambs, timber head, three timber shelves at 0.85 / 1.4 / 1.95 carrying brass pots, porcelain and folded linen (model 12 small items from the CC0 brass pot and simple lathe cups, all inside the recess), counter top at 0.90 × 0.34 deep, closed panel front. This recess is modelled in the GLB (no placed counter here). Completion: a tea counter with visible stock, nothing beyond the wall plane except the counter top's 0.10.
3. CREATE `GROUND_02` closed entry door 1.15 × 2.7 at a=6.6 (SD-05). Completion: closed.
4. CREATE two rebates `STORY_1_WINDOW_01/02` 1.6 × 1.65 at sill 3.68 / head 5.33 over a=1.80 and a=6.6 for the placed `ASSET_SHUTTER_LOUVERED` and `ASSET_SHUTTER_WOVEN` (absolute z 5.08). Completion: shutters seated.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 2.85 spanning a=0.55..3.05, projection 1.10 m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `ph_fabric_leather_02` over `GROUND_01` only (the tea house uses plain cream cloth, no stripes). Completion: one awning.
6. CREATE sign brackets for `TEA_E_SIGN_1` (a=1.80, absolute z 4.45) at z 3.24 local. `TEA_E_SIGN_2` dormant. Completion: one sign.
7. CREATE a lantern bracket (SD-10) at a=3.7, z 3.25 local (absolute 4.65), 0.35 proud, to carry the placed `LANTERN_TEA_01` at (18.5, 60.5, 4.65). Completion: lantern hangs from the bracket.
8. KEEP the tea service, table, three stools and stall at their placed transforms (they sit on the terrace against this wall, outside the 4 m clear width). Completion: nothing new on the terrace.
9. APPLY wear: dust band on the plinth, tea-stain drips 0..0.3 under the recess, polish at the door, seat polish on the wall at 0.4..0.9 m behind the stools. Completion: as listed.
10. CREATE S2 roof: `upper_room` a=0..8.4, z0 7.0 local, height 1.4, depth 4.0, setback 0.75, coping 8.4 local, parapet 0.75 + coping to 9.59 absolute − 1.4 = 8.19 local. This GLB owns the shared Tea/Textile north wing roof strip x 19.0..24.0 for y 56.8..62.72; the Textile west GLB stops at x 19.0. Completion: one continuous stepped roof, no double slab.

**Why it exists (reality check):** A tea house serves the raised terrace from a counter recess and has its own street door; the owners live above behind louvres (ventilation for the kitchen room) and woven reed (the bedroom).

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

#### `TEA_RAMP`

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST` | `ASSET_SIGNBOARD` | `TEA_RAMP_SIGN_EAST` | (18.75, 54.3, 3.65) | 1.2 × 0.12 × 0.38 | 270 | KEEP (route sign) |
| `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST` | `ASSET_SIGNBOARD` | `TEA_RAMP_SIGN_WEST` | (11.25, 51.2, 3.05) | 1.1 × 0.12 × 0.38 | 90 | KEEP (route sign) |

#### `TEA_TERRACE`

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_TEA_TERRACE_01` | landmark | (14.2, 61.3, 1.4) | 2.2 × 2.4 | 0 | Tea service landmark on the shared elevated route. |
| `COVER_TEA_01` | cover_cluster | (12.2, 63.8, 1.4) | 1.5 × 1.1 | 90 | Low tea crates provide elevated cover. |
| `LANTERN_TEA_01` | lantern_anchor | (18.5, 60.5, 4.65) | 0.42 × 0.72 | 270 | CC0 wooden lantern above the raised tea route. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_TEA_LANTERN_LANTERN_TEA_01` | `ASSET_CC0_LANTERN` | `LANTERN_TEA_01` | (18.5, 60.5, 4.65) | 0.22 × 0.23 × 0.53 | 270 | KEEP at this transform |
| `PLACE_TEA_STOOL_EAST_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_STOOL` | `LMK_TEA_TERRACE_01` | (17.88, 61.3, 1.4) | 0.38 × 0.41 × 0.58 | 270 | KEEP at this transform |
| `PLACE_TEA_STOOL_WEST_NORTH_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_STOOL` | `LMK_TEA_TERRACE_01` | (16.45, 61.75, 1.4) | 0.38 × 0.41 × 0.58 | 110 | KEEP at this transform |
| `PLACE_TEA_STOOL_WEST_SOUTH_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_STOOL` | `LMK_TEA_TERRACE_01` | (16.45, 60.85, 1.4) | 0.38 × 0.41 × 0.58 | 70 | KEEP at this transform |
| `PLACE_TEA_TABLE_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_TABLE` | `LMK_TEA_TERRACE_01` | (17.15, 61.3, 1.4) | 1.13 × 0.71 × 0.8 | 90 | KEEP at this transform |
| `PLACE_TEA_TERRACE_SHADE_TEA_TERRACE_SHADE_01` | `ASSET_CLOTH_CANOPY` | `TEA_TERRACE_SHADE_01` | (15, 62.4, 5.7) | 1.9 × 6.8 × 0.18 | 90 | KEEP at this transform |
| `PLACE_TEA_COVER_COVER_TEA_01` | `ASSET_COVER_GOODS` | `COVER_TEA_01` | (12.2, 63.8, 1.4) | 1.5 × 0.75 × 1 | 90 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_L34_TEA_STALL_L34_TEA_STALL_01` | `ASSET_MARKET_STALL` | `L34_TEA_STALL_01` | (16.9, 64.7, 1.4) | 1.98 × 1.22 × 1.98 | 270 | KEEP at this transform |
| `PLACE_TEA_WINDOW_1_MOUNT_TEA_WINDOW_1` | `ASSET_SHUTTER_LOUVERED` | `MOUNT_TEA_WINDOW_1` | (19.02, 58.6, 5.08) | 1.6 × 0.24 × 1.65 | 90 | KEEP at this transform |
| `PLACE_TEA_WINDOW_2_MOUNT_TEA_WINDOW_2` | `ASSET_SHUTTER_WOVEN` | `MOUNT_TEA_WINDOW_2` | (19.02, 63.4, 5.08) | 1.6 × 0.24 × 1.65 | 90 | KEEP at this transform |
| `PLACE_TEA_SIGNS_TEA_E_SIGN_1` | `ASSET_SIGNBOARD` | `TEA_E_SIGN_1` | (18.88, 58.6, 4.45) | 2.2 × 0.12 × 0.38 | 270 | KEEP (z 4.45 absolute = 3.05 over the 1.4 terrace; sits under the 5.08 sill) |
| `PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01` | `ASSET_TEA_SERVICE` | `LMK_TEA_TERRACE_01` | (18.55, 62, 1.4) | 1.2 × 0.55 × 0.9 | 90 | KEEP (shifted 2026-09-07 by 0.65 m south to y 62.0, out of the entry door service floor; waiver CW-F70D65F7D790 retired) |

#### `TEA_STAIRS`

#### `TEA_LANDING`

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `TEA_TERRACE_SHADE_01` | (11.6, 62.4, 5.75) | (18.4, 62.4, 5.65) | 1.9 | Tea terrace shade sail slung across the elevated route between both wall faces. Seated 4.2 m above the terrace surface so the hem stays clear of the 4 |

`TEA_TERRACE_SHADE_01` runs from the retaining screen (11.6, 62.4, 5.75) to the tea house (18.4, 62.4, 5.65): iron eye on the screen, 1.2 m ledger on the house at local z 4.25. Cloth `ph_fabric_leather_02` (plain cream). Hem ≥ 4.2 over the terrace floor.

## 6. Ground, wear and drainage

KEEP the ramp (z 0..1.4 over 8 m), the terrace `patterned_cobblestone`, the ten visual treads and the landing; material seams at the top of the ramp and the top of the stairs only; polish on the tread nosings; tea-stain patch under the service at (18.55, 62.65).

## 7. Roofs and skyline

Tea house roof base 8.4, cap 9.59 (shared with the Textile north wing; this GLB owns x 19..24). Retaining screens stay 7.0 / 7.89. The E1 overlook slot is NOT built (gameplay trial, separate task).

## 8. Completion checks

- [ ] Serving recess with stocked shelves and a 0.90 counter; closed entry door; two shutters seated at absolute z 5.08.
- [ ] Lantern and sign on brackets; shade sail ends bear on an eye and a ledger.
- [ ] Ramp and stairs untouched; nothing on the treads or the inside corners.
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

