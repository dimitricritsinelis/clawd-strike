# unit-dyers-dogleg · Dyers Dogleg

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Dyers Dogleg, the dogleg.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The residential turn: the dye works' sealed gate and vents on the west, one dwelling's door and windows on the east, the drying line across, vats and a rack in the north-west corner. Both faces are runtime-owned boundary planes; only hooks and finish are authored here, with a warm aged base and localized wet-work contact.

## 2. Site

### Site · `DYERS_DOGLEG` (Dyers Dogleg)

- Rect x 46..53, y 48..62 (7 × 14 m); floor z = 0; floor `cobblestone_color`; authored clear width **4.5 m** (protected).
- Connects: COVERED_SOUK, NORTH_COURT.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m south edge; the full face remains an authored traversal opening.
- `east` edge: exempt (`system_articulated_boundary`): The 14.00m east wall is articulated by the Dyers Dogleg east identity plane; another frontage would duplicate render geometry.
- `west` edge: exempt (`system_articulated_boundary`): The 14.00m west wall is articulated by the Dyers Dogleg west identity plane; another frontage would duplicate render geometry.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-dyers-dogleg/` | `DYERS_DOGLEG` | `[]` | `unit-dyers-dogleg.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** No unit folder.

## 3. Walls

### code-owned west face of `DYERS_DOGLEG`  ·  BLD_DYE_WORKS_GATE (workshop, 2 storeys)

- **Role:** boundary identity plane owned by `pushCoreBoundaryFacadeGrammar` (no frontage record, no GLB binding). Code-owned identity plane (pushCoreBoundaryFacadeGrammar). The works' cart gate at the north end and a blank working wall; the gate surround must read as an arch, not a slab.
- **Wall line:** x = 46, y = 48 .. 62; length 14 m; wall top 7 m (`MASSING_MID_MIXED`). Ground head datum 6.54 m.
- **Placement path:** this face is not a frontage; its render-only additions go through `placements[]` (free GLBs) in the unit package, coordinates below. Do not add a frontage record.

| Bay | Module | a (m) | World (x, y) | Storey | Sill / head (m) |
|---|---|---:|---|---:|---|
| `EXISTING_NORTH_GATE` | `retained_two_story_blind_gate` | 12.056 | (46, 60.056) | 0 | retained repaired blind gate; runtime-owned at a=12.056 |
| `VENT_S` | `vent_service` | 4.2 | (46, 52.2) | 1 | 4.15 / 4.63 |
| `VENT_AXIS` | `vent_service` | 7 | (46, 55) | 1 | 4.15 / 4.63 |

- Bound dressing: `ASSET_DYERS_SEALED_VAT` at existing dogleg cluster, keep.

**Construction tasks:**

1. KEEP the code boundary plane, its repaired blind gate at a=12.056, and its two runtime-owned vents at a=4.2 and a=7.0, sill 4.15 / head 4.63. Add no door, vent or gate GLB to this face.
2. KEEP the vats at (46.55, 59.35 / 61.55), the rack at (46.18, 60.4) and the workstation at (46.6, 60.3). CREATE two rack hooks at z 2.4 (placements at (46.0, 59.4, 2.4) and (46.0, 61.4, 2.4)). APPLY wear: dye splashes 0..0.9 around the workstation only; dirt band. Completion: quiet working wall, wet work at the north end.

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


**Construction tasks:**

1. KEEP the runtime-owned dwelling composition: closed door 1.05 × 2.25 at (53.0, 55.0, 0); ground dark-recess windows 0.9 × 1.25 at (53.0, 52.2 / 57.8, 1.0); upper dark-recess windows 0.9 × 1.25 at (53.0, 52.2 / 55.0 / 57.8, 4.15). Add no door or window GLB to this face. Completion: one house reads on the east wall: door centred, pairs mirrored, uppers over lowers.
2. KEEP the boundary plane's base, story course and roof. No balcony, awning, sign or stock; the door approach stays empty. APPLY wear: dirt band 0..1.5 and hand polish 0.9..1.4 on both door jambs. Completion: as stated.

**Why it exists (reality check):** A family house whose street door happens to face the dogleg; the rest of it is off-map to the east.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_L34_DOGLEG_WALL_RACK_L34_DOGLEG_WALL_RACK_01` | `ASSET_DYERS_HANGING_TEXTILES` | `L34_DOGLEG_WALL_RACK_01` | (46.18, 60.4, 1.18) | 2.363 × 0.168 × 1.628 | 90 | KEEP at this transform |
| `PLACE_L34_DOGLEG_VAT_02_L34_DOGLEG_VAT_02` | `ASSET_DYERS_SEALED_VAT` | `L34_DOGLEG_VAT_02` | (46.55, 61.55, 0) | 0.556 × 0.567 × 0.653 | 101 | KEEP at this transform |
| `PLACE_L34_DOGLEG_VAT_L34_DOGLEG_VAT_01` | `ASSET_DYERS_SEALED_VAT` | `L34_DOGLEG_VAT_01` | (46.55, 59.35, 0) | 0.556 × 0.567 × 0.653 | 82 | KEEP at this transform |
| `PLACE_L34_DOGLEG_WORKSTATION_L34_DOGLEG_WORKSTATION_01` | `ASSET_DYERS_WORKSTATION` | `L34_DOGLEG_WORKSTATION_01` | (46.6, 60.3, 0) | 2.8 × 1.45 × 2.2 | 90 | KEEP at this transform |
| `PLACE_L34_DOGLEG_DYERS_LINE_L34_DOGLEG_DYERS_LINE_01` | `ASSET_LAUNDRY_LINE` | `L34_DOGLEG_DYERS_LINE_01` | (49.5, 60.4, 4.65) | 1.3 × 6.96 × 0.85 | 90 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `L34_DOGLEG_DYERS_LINE_01` | (46.02, 60.4, 4.75) | (52.98, 60.4, 4.55) | 1.3 | Dogleg drying line: one dyed-textile line hangs over the west wet-work cluster (rack, vats, workstation at y 59.35-61.55), ends 2 cm inside both dogleg wall lines so the rope buries in the 5 cm identity-plane relief at the upper-screen datum, and continues the North Court dyers line south into the lane above the 3.5 m hem clearance. |

## 6. Ground, wear and drainage

KEEP `cobblestone_color`; dye splashes under the workstation corner only; polish along the route; flush seams north and south.

**`DYERS_DOGLEG` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(49.2, 48.3, 0.014), (49.8, 48.3, 0.014), (49.8, 61.7, 0.014), (49.2, 61.7, 0.014)], 'polish')
wear_patch(F, [(46.05, 59.5, 0.014), (47.2, 59.5, 0.014), (47.2, 61.1, 0.014), (46.05, 61.1, 0.014)], 'dye')
wear_patch(F, [(46.261516, 61.970993, 0.014), (46.124815, 61.26773, 0.014), (46.838484, 61.129007, 0.014), (46.975185, 61.83227, 0.014)], 'dust')
wear_patch(F, [(46.140171, 59.654136, 0.014), (46.239878, 58.944682, 0.014), (46.959829, 59.045864, 0.014), (46.860122, 59.755318, 0.014)], 'dust')
wear_patch(F, [(46, 61.78, 0.014), (46, 58.82, 0.014), (47.405, 58.82, 0.014), (47.405, 61.78, 0.014)], 'dust')
```

## 7. Roofs and skyline

Both boundary planes stay 7.0. Nothing added.

## 8. Required result

- [ ] West: gate untouched, two vent grilles at sill 4.15, rack on hooks; east: door + two + three windows reading as one house.
- [ ] The inside north turn and both passages empty.
- [ ] Every scheduled finished-frontage opening exists at its `a`, sill and head; Dogleg door, windows and vents remain the matching runtime-owned modules.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.

Record `built` in the progress index after applying the package. Gameplay, visual and performance validation occur in the later validation task.

