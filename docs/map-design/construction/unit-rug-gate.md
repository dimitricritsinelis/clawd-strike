# BZ-04 / R7 rug gate facade-centered upper openings · Rug Gate

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `RUG_GATE`

Existing large gateway and carved rug-gallery workfront. Plain gatekeeper house and finished rug display. Preserve the fixed routes and use quieter fields to frame this composition.

Primary focus: The supported gateway frames arrival. A shallow rug-stock gallery and plain gatekeeper household support the arch, with textile craft concentrated at the existing shop..

## Architecture and craftsmanship

**Primary:** Existing large gateway and carved rug-gallery workfront

**Supporting:** Plain gatekeeper house and finished rug display

**Quiet fields and limits:** Do not compete with B’s merchant balcony or deepen the narrow stock gallery.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `R_E_SOUTH` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Textile north return shares the workroom datum and plain timber family of the continuous east owner. |
| `R_E_HOUSE` / `BLD_RUG_EAST_GATEKEEPER` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Gatekeeper has plain paired domestic windows and one centered loft louver. |
| `R_S_CAP` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | West textile merchants - coordinated wing or return |
| `R_W_MERCHANT` / `BLD_RUG_MERCHANT` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The common loft vent centers at68 in the complete64..72 upper field. The lower broad/narrow window group and ground access keep their existing roles. |
| `R_W_ABUTMENT` / `ASM_B_GATE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | West Rug Gate abutment enclosure return |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_R_W_SHOP` | rug display | 10 / CF-COUNTER, CF-RUG, CF-TIMBER | Build the named parts as rug display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `B_S_EAST`, `B_S_WEST`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` |
| `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` | `F_NE`, `F_NW`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` |

**Required craft recipes:** CF-COUNTER, CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-OPEN, CF-R4-PORTAL, CF-RUG, CF-SHADE, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `RUG_GATE` · `north`

Quiet background: Exact immutable x=21..34 opening to Spawn B..

Protected wall interval: **21..34 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 21..34 | **ZERO BUILD protected opening** | SPAWN_B_COURTYARD |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `RUG_GATE` · `east`

Quiet background: y=67..72 exact east link is empty..

Protected wall interval: **64..78 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 64..67 | collider-backed solid | COLLIDER_WALL_106 |
| 72..78 | collider-backed solid | COLLIDER_WALL_107 |
| 67..72 | **ZERO BUILD protected opening** | LINK_EAST_UPPER |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `R_E_SOUTH` | 64..67 | (34, 64, 37, 67) | Textile north return shares the workroom datum and plain timber family of the continuous east owner. | 10.2 | 3 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `R_E_HOUSE` | 72..78 | (34, 72, 37.5, 78) | Gatekeeper has plain paired domestic windows and one centered loft louver. | 9.9 | 3.5 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `R_E_SOUTH-L1-W1` | `R_E_SOUTH` | window | 65.5 | 4.2 / 6 | 1.45 × 1.8 × 0.38 | 34 | `SD-07`; Closed 2-panel timber shutters | broad daylit production rooms and narrow stairs; daylight on its measured room axis |
| `R_E_SOUTH-L2-W1` | `R_E_SOUTH` | vent | 65.5 | 9.03 / 9.68 | 1.25 × 0.65 × 0.3 | 34 | `SD-07`; closed timber louver | high dry-stock loft; high ventilation |
| `R_E_HOUSE-ENTRANCE` | `R_E_HOUSE` | door | 75 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 34 | `SD-05`; closed timber leaves | principal entrance and internal stair |
| `R_E_HOUSE-L1-W1` | `R_E_HOUSE` | window | 73.62 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 34 | `SD-07`; closed double paneled timber shutters | household rooms; daylight on its measured room axis |
| `R_E_HOUSE-L1-W2` | `R_E_HOUSE` | window | 76.38 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 34 | `SD-07`; closed double paneled timber shutters | household rooms; daylight on its measured room axis |
| `R_E_HOUSE-COMMON-LOFT-VENT` | `R_E_HOUSE` | vent | 75 | 8.65 / 9.35 | 1.5 × 0.7 × 0.3 | 34 | `SD-07`; closed timber louver | dry gate stores; high ventilation |

### `RUG_GATE` · `south`

Quiet background: Exact immutable Textile Arcade opening x=24..34..

Protected wall interval: **21..34 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 21..24 | collider-backed solid | COLLIDER_WALL_027 |
| 24..34 | **ZERO BUILD protected opening** | TEXTILE_ARCADE |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `R_S_CAP` | 21..24 | (21, 60.6, 24, 64) | West textile merchants - coordinated wing or return | 11.1 | 3.4 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `R_S_CAP-L1-W1` | `R_S_CAP` | vent | 22.5 | 6.63 / 7.28 | 1.25 × 0.65 × 0.3 | 64 | `SD-07`; closed timber louver | ventilated cloth sorting and stock; high ventilation |
| `R_S_CAP-L2-W1` | `R_S_CAP` | window | 22.5 | 8.75 / 10.35 | 1.1 × 1.6 × 0.34 | 64 | `SD-07`; closed double paneled timber shutters | staff accommodation; daylight on its measured room axis |

### `RUG_GATE` · `west`

Quiet background: The merchant gallery ends before the protected west-upper link mouth..

Protected wall interval: **64..78 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 64..72 | collider-backed solid | COLLIDER_WALL_102 |
| 76.5..78 | collider-backed solid | COLLIDER_WALL_103 |
| 72..76.5 | **ZERO BUILD protected opening** | LINK_WEST_UPPER |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `R_W_MERCHANT` | 64..72 | (19, 64, 21, 72) | The common loft vent centers at68 in the complete64..72 upper field. The lower broad/narrow window group and ground access keep their existing roles. | 9.9 | 2 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `R_W_ABUTMENT` | 76.5..78 | (17, 76.5, 21, 78) | West Rug Gate abutment enclosure return | 9.9 | 4 | `ph_bz04_sandstone_blocks_05` | slab 9.9..10.02; parapet 10.02; cap 10.02; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `R_W_SHOP` | `R_W_MERCHANT` | shop | 66.4 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 21 | `SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `R_W_MERCHANT-STAFF-DOOR`; architecturalDetail: `{"profile":"carved-timber-portal","surroundWidthM":0.14,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#9c8060","frameMaterialId":"ph_bz04_weathered_brown_planks","materialProfile":"warmTimber","carving":{"pattern":"running-lozenge","modulePitchM":0.12,"moduleWidthM":0.085,"moduleHeightM":0.05,"incisionWidthM":0.006,"incisionDepthM":0.006,"placement":"One centered vertical chain on each outer timber jamb; stop 0.18 m above sill and 0.18 m below the arch spring/head. The head retains two continuous nested bands. No floral alternative."}}` | rug workfront |
| `R_W_MERCHANT-STAFF-DOOR` | `R_W_MERCHANT` | door | 70.4 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 21 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `R_W_MERCHANT-L1-W1` | `R_W_MERCHANT` | window | 66.4 | 4.25 / 5.85 | 1.8 × 1.6 × 0.3 | 21 | `SD-07`; Closed 2-panel timber shutters | hand-carried stock gallery; daylight on its measured room axis |
| `R_W_MERCHANT-L1-W2` | `R_W_MERCHANT` | window | 70.4 | 4.25 / 5.85 | 0.8 × 1.6 × 0.3 | 21 | `SD-07`; Closed 1-panel timber shutters | hand-carried stock gallery; daylight on its measured room axis |
| `R_W_MERCHANT-COMMON-LOFT-VENT` | `R_W_MERCHANT` | vent | 68 | 8.65 / 9.35 | 1.8 × 0.7 × 0.3 | 21 | `SD-07`; closed timber louver | ventilated dry rug loft; high ventilation |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `RUG_GATE` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'RUG_GATE-CLEAR', 'x': 24.5, 'y': 64, 'w': 6, 'h': 14, 'heightM': 2.2, 'floorSource': 'RUG_GATE'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `RUG_GATE` | `G_R_W_SHOP` / `AG-RUG` | west/R_W_MERCHANT/R_W_SHOP | (19.1, 65.14, 0.04) → (21.28, 67.66, 2.65) | Build the named parts as rug display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `RUG_GATE` | `RUG_GATE-CLEAR` | **CLEAR ROUTE** | (24.5, 64) → (30.5, 78) | Protected empty region | Do not place geometry |

### Fixed composition `G_R_W_SHOP`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.25, -0.55, 0] / [1.25, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `upright-1` | timber-member / `CF-TIMBER` | [-0.9, -1.9, 0] / [-0.83, -1.65, 2.45] | `ph_bz04_worn_planks` | recess deck and upper wall bracket |
| `upright-2` | timber-member / `CF-TIMBER` | [0.83, -1.9, 0] / [0.9, -1.65, 2.45] | `ph_bz04_worn_planks` | recess deck and upper wall bracket |
| `top-rail` | timber-member / `CF-TIMBER` | [-0.9, -1.9, 2.38] / [0.9, -1.65, 2.45] | `ph_bz04_worn_planks` | two uprights |
| `hanging-rug-1` | bound-hanging-rug / `CF-RUG` | [-0.74, -1.73, 0.8499999999999999] / [-0.020000000000000018, -1.7, 2.3] | `bz04_levantine_rug_project_original` | two ties to top-rail, one at each upper corner |
| `hanging-rug-2` | bound-hanging-rug / `CF-RUG` | [0.08000000000000002, -1.73, 1.0499999999999998] / [0.6599999999999999, -1.7, 2.3] | `bz04_levantine_rug_project_original` | two ties to top-rail, one at each upper corner |
| `rolled-rug-1-1` | horizontal-rolled-rug / `CF-RUG` | [-0.655, -0.19, 0.9] / [-0.10499999999999998, -0.010000000000000009, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-1-2` | horizontal-rolled-rug / `CF-RUG` | [0.10499999999999998, -0.19, 0.9] / [0.655, -0.010000000000000009, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-2-1` | horizontal-rolled-rug / `CF-RUG` | [-0.655, -0.44999999999999996, 0.9] / [-0.10499999999999998, -0.27, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-2-2` | horizontal-rolled-rug / `CF-RUG` | [0.10499999999999998, -0.44999999999999996, 0.9] / [0.655, -0.27, 1.08] | `bz04_levantine_rug_project_original` | countertop |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `RUG_GATE` | `SHADE_R_W_SHOP` | `SD-12` | west/R_W_MERCHANT/R_W_SHOP | (20.92, 64.95, 2.54) → (22.025, 67.85, 3.145) | Supported working shade for sealed rug recess |
| | `SHADE_R_W_SHOP` dimensions/supports | | | {'interval': [64.95, 67.85], 'ledgerZ': 3.08, 'armAxesM': [65.05, 67.75], 'projectionM': 1.0, 'dropM': 0.22, 'sagM': 0.1} | Exact instance values override the standard defaults. |

**SHADE_R_W_SHOP membrane-only bounds:** `{'min': [21, 64.95, 2.752], 'max': [22.0, 67.85, 3.08]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [20.92, 64.95, 3.04], 'max': [21.04, 67.85, 3.12]}` |
| arm-knee-1 | `{'min': [20.96, 65.015, 2.54], 'max': [22.025, 65.085, 3.145]}` |
| arm-knee-2 | `{'min': [20.96, 67.715, 2.54], 'max': [22.025, 67.785, 3.145]}` |
| cloth-and-hem | `{'min': [21, 64.95, 2.727], 'max': [22.0, 67.85, 3.08]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `RUG_GATE` | 48000 | 12 | 14 | 9 |

Section origin (design coordinates): `{'x': 21, 'y': 64, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-4.199999999999999, -0.02, -3.6000000000000014], 'max': [16.700000000000003, 11.12, 14.200000000000003]}`.
Required bindings: `bz04_court_limestone_flags_01`, `bz04_levantine_rug_project_original`, `ph_bz04_dark_wood`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `RUG_GATE-travel-reverse` | `RUG_GATE` | (27.5, 77.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `RUG_GATE-travel-forward` | `RUG_GATE` | (27.5, 64.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `RUG_GATE-portal-context` | `RUG_GATE` | (27.5, 69, 1.7) | 180° / 9.5° / 75° | Whole gateway and courtyard approach; verify the focal landmark in its neighboring frame |
| `RUG_GATE-east-R_E_SOUTH-s1-base` | `RUG_GATE` | (21.35, 65.5, 1.7) | 270° / 2.263° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `RUG_GATE-east-R_E_HOUSE-s1-base` | `RUG_GATE` | (21.35, 75, 1.7) | 270° / 2.263° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `RUG_GATE-south-R_S_CAP-s1-base` | `RUG_GATE` | (22.5, 77.65, 1.7) | 0° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `RUG_GATE-west-R_W_MERCHANT-s1-base` | `RUG_GATE` | (33.65, 68, 1.7) | 90° / 2.263° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `RUG_GATE-west-R_W_ABUTMENT-s1-base` | `RUG_GATE` | (33.65, 77.25, 1.7) | 90° / 2.263° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `RUG_GATE-R3-craft-detail` | `RUG_GATE` | (24.5, 66.4, 1.7) | 90° / -1.637° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: R_W_SHOP |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| `RUG-GATE-PORTAL` / `LM-01` | `unit-rug-gate` | (19.7, 76.7, 0.0, 35.3, 77.5, 7.45) | clear (21.0, 76.7, 0.0, 34.0, 77.5, 4.2); crown [27.5, 6.9]; cap 7.45 |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `RUG_GATE` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `RUG_GATE` cells: `ROOF_CELL_003`, `ROOF_CELL_064`, `ROOF_CELL_065`, `ROOF_CELL_066`, `ROOF_CELL_074`, `ROOF_CELL_075`, `ROOF_CELL_078`.
- `RUG_GATE` bundles: `ROOF_BUNDLE_UNIT_RUG_GATE`, `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE`.
- `RUG_GATE` interfaces: `ROOF_INTERFACE_ROOF_SEAM_013`, `ROOF_INTERFACE_ROOF_SEAM_018`, `ROOF_INTERFACE_ROOF_SEAM_020`, `ROOF_INTERFACE_ROOF_STEP_027`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_RUG_ARCH_LMK_RUG_GATE_01` | `RUG_GATE` | buildProps.ts / dressing_placements / asset_registry | rebind_visual | Replace with ASSET_BZ04_RUG_GATE / bz04_rug_gate at (27.5,77.1,0), yaw180; full geometry in LM-01. Retire old procedural hero arch render emission. |
| `PLACE_RUG_COVER_COVER_RUG_01` | `RUG_GATE` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_RUG_DISPLAY_COMPLETE_MOUNT_RUG_DISPLAY_COMPLETE` | `RUG_GATE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_RUG_LANTERN_LANTERN_RUG_01` | `RUG_GATE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_RUG_PANELED_WINDOW_MOUNT_RUG_PANELED_WINDOW` | `RUG_GATE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_RUG_SIGNS_RUG_W_SIGN_1` | `RUG_GATE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_RUG_GATE_EAST_BAY_01` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_EAST_BAY_02` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_EAST_MASSING` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_BAY_01` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_MASSING` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_01` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_02` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_WEST_MASSING` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_01` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_02` | `RUG_GATE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_RUG_GATE_north` | `RUG_GATE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_RUG_GATE_east` | `RUG_GATE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_RUG_GATE_south` | `RUG_GATE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_RUG_GATE_west` | `RUG_GATE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [RUG_GATE dimensioned plan](drawings/rug_gate-plan.svg), [RUG_GATE four elevations](drawings/rug_gate-elevations.svg), and [RUG_GATE roof axonometric](drawings/rug_gate-axon.svg)
- [Master plan](drawings/master-plan.svg)
