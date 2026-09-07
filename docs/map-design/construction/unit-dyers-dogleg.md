# unit-dyers-dogleg · Dyers Dogleg

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-dyers-dogleg --tag r1-before` prints the same walls and must agree. Also called: Dyers Dogleg, the dogleg.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The residential turn: the dye works' sealed gate and vents on the west, one dwelling's door and windows on the east, the drying line across, vats and a rack in the north-west corner. Both faces are code-owned boundary planes; work goes through free placements.

## 2. Site

### Site · `DYERS_DOGLEG` (Dyers Dogleg)

- Rect x 46..53, y 48..62 (7 × 14 m); floor z = 0; floor `cobblestone_color`; authored clear width **4.5 m** (protected).
- Connects: COVERED_SOUK, NORTH_COURT.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m south edge; the full face remains an authored traversal opening.
- `east` edge: exempt (`system_articulated_boundary`): The 14.00m east wall is articulated by the Dyers Dogleg east identity plane; another frontage would duplicate render geometry.
- `west` edge: exempt (`system_articulated_boundary`): The 14.00m west wall is articulated by the Dyers Dogleg west identity plane; another frontage would duplicate render geometry.

**Existing source.** No unit folder.

## 3. Walls

### code-owned west face of `DYERS_DOGLEG`  ·  BLD_DYE_WORKS_GATE (workshop, 2 storeys)

- **Role:** boundary identity plane owned by `pushCoreBoundaryFacadeGrammar` (no frontage record, no GLB binding). Code-owned identity plane (pushCoreBoundaryFacadeGrammar). The works' cart gate at the north end and a blank working wall; the gate surround must read as an arch, not a slab.
- **Wall line:** x = 46, y = 48 .. 62; length 14 m; wall top 7 m (`MASSING_MID_MIXED`). Ground head datum 6.54 m.
- **Placement path:** this face is not a frontage; its render-only additions go through `placements[]` (free GLBs) in the unit package, coordinates below. Do not add a frontage record.

| Bay | Module | a (m) | World (x, y) | Storey | Sill / head (m) |
|---|---|---:|---|---:|---|
| `EXISTING_NORTH_GATE` | `retained_two_story_blind_gate` | 12.06 | (46, 60.06) | 0 | retained repaired blind gate (M04 measures outer frame) |
| `VENT_S` | `vent_service` | 4.2 | (46, 52.2) | 1 | 4.15 / 4.63 |
| `VENT_AXIS` | `vent_service` | 7 | (46, 55) | 1 | 4.15 / 4.63 |

- Bound dressing: `ASSET_DYERS_SEALED_VAT` at existing dogleg cluster, keep.

**Composition.** The Dogleg west service wall ends in a tall sealed loading niche, with two high vents and an otherwise quiet working face.

**Construction tasks:**

1. KEEP the code boundary plane and the repaired blind gate at a=12.056 exactly (M04: measure its outer frame with `get_object_info` before touching anything near it). Add nothing to the gate.
2. CREATE two vents 0.58 × 0.48 at a=4.2 and a=7.0, sill 4.15 / head 4.63, as free GLBs through `placements[]` at (46.0, 52.2, 4.15) and (46.0, 55.0, 4.15), yawDeg 90, base-centre origin, 0.05 proud (grilles on the plane). Completion: two grilles, no other opening.
3. KEEP the vats at (46.55, 59.35 / 61.55), the rack at (46.18, 60.4) and the workstation at (46.6, 60.3). CREATE two rack hooks at z 2.4 (placements at (46.0, 59.4, 2.4) and (46.0, 61.4, 2.4)). APPLY wear: dye splashes 0..0.9 around the workstation only; dirt band. Completion: quiet working wall, wet work at the north end.

**Why it exists (reality check):** The dye works' back onto the dogleg: a sealed old cart gate, vents for the boiling room, and the wet-work corner where the vats stand.

### code-owned east face of `DYERS_DOGLEG`  ·  BLD_DOGLEG_HOUSE (house, 2 storeys)

- **Role:** boundary identity plane owned by `pushCoreBoundaryFacadeGrammar` (no frontage record, no GLB binding). Code-owned identity plane. A house wall: one door, paired windows, thresholds. Not nine identical blind bays.
- **Wall line:** x = 53, y = 48 .. 62; length 14 m; wall top 7 m (`MASSING_MID_MIXED`). Ground head datum 2.25 m.
- **Placement path:** this face is not a frontage; its render-only additions go through `placements[]` (free GLBs) in the unit package, coordinates below. Do not add a frontage record.

| Bay | Module | a (m) | World (x, y) | Storey | Sill / head (m) |
|---|---|---:|---|---:|---|
| `HOUSE_DOOR` | `door_residential_timber` | 7 | (53, 55) | 0 | 0 / 2.25 |
| `WINDOW_S` | `window_dark_recess` | 4.2 | (53, 52.2) | 0 | 1.0 / 2.25 |
| `WINDOW_N` | `window_dark_recess` | 9.8 | (53, 57.8) | 0 | 1.0 / 2.25 |
| `UPPER_S` | `window_dark_recess` | 4.2 | (53, 52.2) | 1 | 4.15 / 5.40 |
| `UPPER_AXIS` | `window_dark_recess` | 7 | (53, 55) | 1 | 4.15 / 5.40 |
| `UPPER_N` | `window_dark_recess` | 9.8 | (53, 57.8) | 1 | 4.15 / 5.40 |


**Composition.** One centered household door and paired windows make the Dogleg east wall read as one dwelling.

**Construction tasks:**

1. REPLACE the repeated boundary bays with one dwelling composition as free GLBs (`placements[]`, origin base-centre, yawDeg 270 facing west): closed door 1.05 × 2.25 at (53.0, 55.0, 0); two dark-recess windows 0.9 × 1.25 at (53.0, 52.2, 1.0) and (53.0, 57.8, 1.0); three upper dark recesses 0.9 × 1.25 at (53.0, 52.2 / 55.0 / 57.8, 4.15). Each is a complete frame + closed leaf + sill 0.06, 0.05 proud of the plane with a 0.14 dark reveal box behind. Completion: one house reads on the east wall: door centred, pairs mirrored, uppers over lowers.
2. KEEP the boundary plane's base, story course and roof. No balcony, awning, sign or stock; the door approach stays empty. APPLY wear: dust band, polish at the door. Completion: as stated.

**Why it exists (reality check):** A family house whose street door happens to face the dogleg; the rest of it is off-map to the east.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_L34_DOGLEG_WALL_RACK_L34_DOGLEG_WALL_RACK_01` | `ASSET_DYERS_HANGING_TEXTILES` | `L34_DOGLEG_WALL_RACK_01` | (46.18, 60.4, 1.18) | 2.36 × 0.17 × 1.63 | 90 | KEEP at this transform |
| `PLACE_L34_DOGLEG_VAT_02_L34_DOGLEG_VAT_02` | `ASSET_DYERS_SEALED_VAT` | `L34_DOGLEG_VAT_02` | (46.55, 61.55, 0) | 0.56 × 0.57 × 0.65 | 101 | KEEP at this transform |
| `PLACE_L34_DOGLEG_VAT_L34_DOGLEG_VAT_01` | `ASSET_DYERS_SEALED_VAT` | `L34_DOGLEG_VAT_01` | (46.55, 59.35, 0) | 0.56 × 0.57 × 0.65 | 82 | KEEP at this transform |
| `PLACE_L34_DOGLEG_WORKSTATION_L34_DOGLEG_WORKSTATION_01` | `ASSET_DYERS_WORKSTATION` | `L34_DOGLEG_WORKSTATION_01` | (46.6, 60.3, 0) | 2.8 × 1.45 × 2.2 | 90 | KEEP at this transform |
| `PLACE_L34_DOGLEG_DYERS_LINE_L34_DOGLEG_DYERS_LINE_01` | `ASSET_LAUNDRY_LINE` | `L34_DOGLEG_DYERS_LINE_01` | (49.5, 60.4, 4.65) | 1.3 × 6.96 × 0.85 | 90 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `L34_DOGLEG_DYERS_LINE_01` | (46.02, 60.4, 4.75) | (52.98, 60.4, 4.55) | 1.3 | Dogleg drying line: one dyed-textile line hangs over the west wet-work cluster (rack, vats, workstation at y 59.35-61.55), ends 2 cm inside both dogle |

## 6. Ground, wear and drainage

KEEP `cobblestone_color`; dye splashes under the workstation corner only; polish along the route; flush seams north and south.

## 7. Roofs and skyline

Both boundary planes stay 7.0. Nothing added.

## 8. Completion checks

- [ ] West: gate untouched, two vent grilles at sill 4.15, rack on hooks; east: door + two + three windows reading as one house.
- [ ] The inside north turn and both passages empty.
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

