# unit-dyers-alley · Dyers Alley

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Dyers Alley.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The wet-work edge: the dye works' cart door and vents on the south-west, the dyer's plastered house north of it, the long drying wall east with four niches, racks and two workstations. Warm aged plaster holds the district together; dirt and dye stay only where the work is.

## 2. Site

### Site · `DYERS_ALLEY` (Dyers Alley)

- Rect x 46..53, y 10..32 (7 × 22 m); floor z = 0; floor `patterned_cobblestone`; authored clear width **4.5 m** (protected).
- Connects: COVERED_SOUK, LINK_SOUTH_EAST.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`sealed_perimeter`): The 7.00m wall run on the 7.00m south edge is a deliberately sealed back-of-house boundary.
- `west` edge: frontage `FRONTAGE_DYERS_ALLEY_WEST_S` → `BLD_DYE_WORKS`.
- `west` edge: frontage `FRONTAGE_DYERS_ALLEY_WEST_N` → `BLD_DYERS_HOUSE`.
- `east` edge: frontage `FRONTAGE_DYERS_ALLEY_EAST` → `BLD_ALLEY_BACKS`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-dyers-alley/` | `DYERS_ALLEY` | `["east", "west"]` | `unit-dyers-alley.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/dyers-house/` holds the Blender sources of the placed screens, loft vent and hatch (keep). No wall GLBs yet.

## 3. Walls

### FRONTAGE_DYERS_ALLEY_WEST_S  ·  BLD_DYE_WORKS (workshop, 2 storeys)

- **Role:** workshop. One cart door on the axis between two blind niches at equal gaps; vents above light the dye floor; the base is stained by the trade; vats and the rack stand at the door.
- **Wall line:** west edge of `DYERS_ALLEY`; x = 46, y = 13 .. 21.99 (a runs south to north); length **8.99 m**; street side +X (street lies east of the wall); kit `Wall(F, (46, 13), (46, 21.99), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.5 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44 (workshop, stone); string course 3.20 (between the 2.5 door head and the 3.68 vents); coping 6.84..7.0; parapet +0.75.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_NICHE_S` | `blind_niche` |  | 1.91 | (46, 14.91) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |
| `BAY_VENT_S` | `vent_service` |  | 1.91 | (46, 14.91) | 0.58 × 0.18 × 0.48 | 3.68 / 4.16 | 0 |
| `BAY_CART_DOOR` | `door_storage_heavy` | handcart work door (closed, dye stains) | 4.495 | (46, 17.495) | 1.35 × 0.25 × 2.5 | 0 / 2.5 | 0 |
| `BAY_VENT_AXIS` | `vent_service` |  | 4.495 | (46, 17.495) | 0.58 × 0.18 × 0.48 | 3.68 / 4.16 | 0 |
| `BAY_NICHE_N` | `blind_niche` |  | 7.08 | (46, 20.08) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |
| `BAY_VENT_N` | `vent_service` |  | 7.08 | (46, 20.08) | 0.58 × 0.18 × 0.48 | 3.68 / 4.16 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.910375, 1.05, 0.7, 1.8), (1.910375, 0.58, 3.68, 0.48), (4.495, 1.35, 0, 2.5), (4.495, 0.58, 3.68, 0.48), (7.079625, 1.05, 0.7, 1.8), (7.079625, 0.58, 3.68, 0.48)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_DYERS_SEALED_VAT` at two beside the cart door on the south pier; `ASSET_DYERS_HANGING_TEXTILES` at drying rack on the north niche; `ASSET_DYERS_WORKSTATION` at under the south niche.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth 0..0.44 × 0.14, course 3.14..3.26, coping; end piers 0.45. Completion: a stone workshop wall, quiet above the vents.
2. CREATE `BAY_CART_DOOR` 1.35 × 2.5 at a=4.495 (double leaves, straps, bumper rail 0.35, SD-05 threshold, dye stains on the leaves 0..0.9). Completion: closed work door.
3. CREATE `BAY_NICHE_S/N` 1.05 × 1.8 at sill 0.70, a=1.91/7.08; `BAY_VENT_S/AXIS/N` 0.58 × 0.48 at sill 3.68 / head 4.16, a=1.91/4.495/7.08 with timber grilles. Completion: a niche under each outer vent, the door under the middle vent.
4. KEEP the two `ASSET_DYERS_WORKSTATION` at (52.38, 17.0 / 21.0) on the EAST wall (they belong to the alley, not to this face). Nothing at this door's 0.8 m floor. No awning, sign or goods. Completion: as stated.
5. CREATE one drain spout at a=0.5 (SD-13); APPLY wear: dirt band 0..1.5 heavy, indigo and madder splashes 0..0.9 around the door, cart scuffs, drip streak under each vent 0.3 long. Completion: the dirtiest wall on the map, but only below 1.5 m and under the vents.

**Why it exists (reality check):** A dye works: one cart door for the wet work, vents high up to let the steam out, no windows to look through, staining where the vats are wheeled in and out.

### FRONTAGE_DYERS_ALLEY_WEST_N  ·  BLD_DYERS_HOUSE (house, 1 storey)

- **Role:** house. Single-storey lime-plastered dyer household: centered closed door, paired SC-D timber screens, ventilated loft and a closed roof hatch. Existing stone base, walls and routes remain.
- **Wall line:** west edge of `DYERS_ALLEY`; x = 46, y = 21.99 .. 30.24 (a runs south to north); length **8.25 m**; street side +X (street lies east of the wall); kit `Wall(F, (46, 21.99), (46, 30.24), faces='E')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_beige_wall_002`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.25 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28 exposed stone; string course 2.90; loft vent sill 3.50; coping 4.34..4.5; slab 4.76, cap 5.59; hatch on the roof (placed).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_WINDOW_S` | `window_screened` | SC-D diamond lattice (placed `ASSET_DYERS_SCREEN_SC_D`) | 1.8 | (46, 23.79) | 1 × 0.24 × 1.4 | 0.85 / 2.25 | 0 |
| `BAY_DOOR` | `door_residential_timber` | closed household door | 4.125 | (46, 26.115) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `BAY_WINDOW_N` | `window_screened` | SC-D diamond lattice (placed) | 6.45 | (46, 28.44) | 1 × 0.24 × 1.4 | 0.85 / 2.25 | 0 |
| `LOFT_VENT` | `vent_service` | KEEP placed ASSET_DYERS_LOFT_VENT; skin rebate only | 4.125 | (46, 26.115) | 0.58 × 0.18 × 0.48 | 3.5 / 3.98 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.799985, 1, 0.85, 1.4), (4.125, 1.05, 0, 2.25), (6.450015, 1, 0.85, 1.4), (4.125, 0.58, 3.5, 0.48)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_DYERS_SCREEN_SC_D` at the two unchanged window axes at sill 0.85 m; `ASSET_DYERS_LOFT_VENT` at loft at the door axis, sill 3.50 m; `ASSET_DYERS_ROOF_HATCH` at retained roof slab, x42.4..43.4/y23..24.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_beige_wall_002` lime plaster over an exposed stone base `ph_sandstone_blocks_05` 0..0.28 and stone quoins 0.30 wide at both ends full height (`held`), course 2.84..2.96 `ph_trim_sanded_01`, coping 4.34..4.5. Completion: a plastered house between two stone buildings.
2. CREATE `BAY_DOOR` 1.05 × 2.25 at a=4.125 (SD-05): planks, ring pull, a 0.06 step flush with paving. Completion: closed household door on the axis.
3. CREATE `BAY_WINDOW_S/N` rebates 1.0 × 1.4 at sill 0.85 / head 2.25, a=1.80/6.45, frame 0.10, reveal 0.135, sill 0.06 proud; the placed `ASSET_DYERS_SCREEN_SC_D` (45.98, 23.79 / 28.44, 0.85) fill them. Completion: screens seated, the pair mirrored about the door.
4. KEEP the placed loft vent `ASSET_DYERS_LOFT_VENT` at (46.0, 26.11, 3.5): CREATE its 0.58 × 0.48 rebate at a=4.125, sill 3.50. KEEP the roof hatch at (42.9, 23.5, 4.76). Completion: vent in a rebate, hatch flush on the slab.
5. No awning, sign, shop, vats or goods. APPLY wear: light dust band, polish at the door, one water streak from the coping at a=0.3. Completion: as listed.

**Why it exists (reality check):** The dyer's family house: one door in the middle, two lattice windows at eye height so the street can't see in, a loft above with a vent and a roof hatch to dry cloth up there.

### FRONTAGE_DYERS_ALLEY_EAST  ·  BLD_ALLEY_BACKS (service back, 1 storey)

- **Role:** service back. Service enclosure with four complete high blind niches behind retained edge-mounted drying stations; no doors or windows.
- **Wall line:** east edge of `DYERS_ALLEY`; x = 53, y = 11.76 .. 30.24 (a runs south to north); length **18.48 m**; street side -X (street lies west of the wall); kit `Wall(F, (53, 11.76), (53, 30.24), faces='W')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.4 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `blind_niche` |  | 1.125 | (53, 12.885) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |
| `GROUND_02` | `blind_niche` |  | 6.535 | (53, 18.295) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |
| `GROUND_03` | `blind_niche` |  | 11.945 | (53, 23.705) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |
| `GROUND_04` | `blind_niche` |  | 17.355 | (53, 29.115) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.125, 1.05, 1.6, 1.8), (6.535, 1.05, 1.6, 1.8), (11.945, 1.05, 1.6, 1.8), (17.355, 1.05, 1.6, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course, coping 4.74..4.9; end piers 0.45. Completion: long quiet enclosure.
2. REPLACE the three truncated pilaster-niche pieces with full blind niches `GROUND_01..04` 1.05 × 1.8 at sill 1.60, a=1.125/6.535/11.945/17.355. Completion: four equal high niches.
3. KEEP the four rack clusters (`DYERS_E_RACK_01..04` at y 13.4 / 19.1 / 23.7 / 29.2, x 52.42) and the two workstations at (52.38, 17.0 / 21.0): CREATE iron rack hooks at z 2.4 for each hanging rack (two per rack, ±1.0 of its axis). Cloth stays within 0.35 m of the wall. Completion: every rack hangs from hooks.
4. CREATE spouts at a=0.6 and a=17.9; APPLY wear: dirt band, dye splashes 0..0.9 under each workstation and rack, damp at the spouts. Completion: wear only where work happens.

**Why it exists (reality check):** The backs of the houses east of the alley, rented to the dyers as a drying wall: hooks, racks, vats, splashes, but no way in.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_01` | `ASSET_DYERS_CERAMIC_VESSEL` | `DYERS_E_RACK_01` | (52.5, 12.78, 0) | 0.656 × 0.502 × 0.372 | 281 | KEEP at this transform |
| `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_03` | `ASSET_DYERS_CERAMIC_VESSEL` | `DYERS_E_RACK_03` | (52.5, 23.08, 0) | 0.656 × 0.502 × 0.372 | 281 | KEEP at this transform |
| `PLACE_L34_DYERS_ALLEY_POTTERY_L34_DYERS_ALLEY_POTTERY_01` | `ASSET_DYERS_CERAMIC_VESSEL` | `L34_DYERS_ALLEY_POTTERY_01` | (52.45, 26.5, 0) | 0.538 × 0.412 × 0.305 | 280 | KEEP at this transform |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_01` | `ASSET_DYERS_HANGING_TEXTILES` | `DYERS_E_RACK_01` | (52.42, 13.4, 1.18) | 2.25 × 0.16 × 1.55 | 270 | KEEP at this transform |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_02` | `ASSET_DYERS_HANGING_TEXTILES` | `DYERS_E_RACK_02` | (52.42, 19.1, 1.18) | 2.25 × 0.16 × 1.55 | 270 | KEEP at this transform |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_03` | `ASSET_DYERS_HANGING_TEXTILES` | `DYERS_E_RACK_03` | (52.42, 23.7, 1.18) | 2.25 × 0.16 × 1.55 | 270 | KEEP at this transform |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_04` | `ASSET_DYERS_HANGING_TEXTILES` | `DYERS_E_RACK_04` | (52.42, 29.2, 1.18) | 2.25 × 0.16 × 1.55 | 270 | KEEP at this transform |
| `PLACE_DYERS_HOUSE_VENT_DYERS_HOUSE_LOFT_VENT` | `ASSET_DYERS_LOFT_VENT` | `DYERS_HOUSE_LOFT_VENT` | (46, 26.115, 3.5) | 0.58 × 0.12 × 0.48 | 270 | KEEP at this transform |
| `PLACE_DYERS_HOUSE_HATCH_DYERS_HOUSE_ROOF_HATCH` | `ASSET_DYERS_ROOF_HATCH` | `DYERS_HOUSE_ROOF_HATCH` | (42.9, 23.5, 4.76) | 1 × 1 × 0.18 | 180 | KEEP at this transform |
| `PLACE_DYERS_HOUSE_SCREENS_DYERS_HOUSE_SCREEN_N` | `ASSET_DYERS_SCREEN_SC_D` | `DYERS_HOUSE_SCREEN_N` | (45.985, 28.44, 0.85) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_DYERS_HOUSE_SCREENS_DYERS_HOUSE_SCREEN_S` | `ASSET_DYERS_SCREEN_SC_D` | `DYERS_HOUSE_SCREEN_S` | (45.985, 23.79, 0.85) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_DYERS_E_RACK_VAT_DYERS_E_RACK_04` | `ASSET_DYERS_SEALED_VAT` | `DYERS_E_RACK_04` | (52.44, 29.75, 0) | 0.697 × 0.711 × 0.819 | 263 | KEEP at this transform |
| `PLACE_L34_DYERS_ALLEY_VATS_L34_DYERS_ALLEY_VAT_01` | `ASSET_DYERS_WORKSTATION` | `L34_DYERS_ALLEY_VAT_01` | (52.38, 17, 0) | 2.8 × 1.45 × 2.2 | 270 | KEEP at this transform |
| `PLACE_L34_DYERS_ALLEY_VATS_L34_DYERS_ALLEY_VAT_02` | `ASSET_DYERS_WORKSTATION` | `L34_DYERS_ALLEY_VAT_02` | (52.38, 21, 0) | 2.8 × 1.45 × 2.2 | 270 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `patterned_cobblestone`; dye splashes and damp under the two workstations and four racks only; polish along the centre 4.5 m; flush seam at y 32 and the south-east link.

**`DYERS_ALLEY` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(49.2, 10.3, 0.014), (49.8, 10.3, 0.014), (49.8, 31.7, 0.014), (49.2, 31.7, 0.014)], 'polish')
wear_patch(F, [(51.7, 16.3, 0.014), (52.9, 16.3, 0.014), (52.9, 17.7, 0.014), (51.7, 17.7, 0.014)], 'dye')
wear_patch(F, [(51.7, 20.3, 0.014), (52.9, 20.3, 0.014), (52.9, 21.7, 0.014), (51.7, 21.7, 0.014)], 'dye')
wear_patch(F, [(52.924336, 29.377556, 0.014), (52.819847, 30.228553, 0.014), (51.955664, 30.122444, 0.014), (52.060153, 29.271447, 0.014)], 'dust')
wear_patch(F, [(52.747069, 12.316338, 0.014), (52.902769, 13.117346, 0.014), (52.252931, 13.243662, 0.014), (52.097231, 12.442654, 0.014)], 'dust')
wear_patch(F, [(52.747069, 22.616338, 0.014), (52.902769, 23.417346, 0.014), (52.252931, 23.543662, 0.014), (52.097231, 22.742654, 0.014)], 'dust')
wear_patch(F, [(52.670881, 26.106709, 0.014), (52.792074, 26.794026, 0.014), (52.229119, 26.893291, 0.014), (52.107926, 26.205974, 0.014)], 'dust')
wear_patch(F, [(53, 15.52, 0.014), (53, 18.48, 0.014), (51.575, 18.48, 0.014), (51.575, 15.52, 0.014)], 'dust')
wear_patch(F, [(53, 19.52, 0.014), (53, 22.48, 0.014), (51.575, 22.48, 0.014), (51.575, 19.52, 0.014)], 'dust')
```

## 7. Roofs and skyline

Works 7.0 / 8.19; house 4.5 / 5.59 with the placed hatch at 4.76; east wall 4.9 / 5.79. The works' party wall above the house roof stays blank stone.

## 8. Required result

- [ ] Works: one cart door, two niches, three vents; house: one door, two seated screens, one seated loft vent; east: four equal niches.
- [ ] Every rack hangs from hooks; cloth within 0.35 m of the wall; the middle 4.5 m empty.
- [ ] Every scheduled finished-frontage opening exists at its `a`, sill and head; Dogleg door, windows and vents remain the matching runtime-owned modules.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.

Record `built` in the progress index after applying the package. Gameplay, visual and performance validation occur in the later validation task.

