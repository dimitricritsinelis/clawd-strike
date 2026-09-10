# BZ-04 / R7 dyers alley facade-centered upper openings · Dyers Alley

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `DYERS_ALLEY`

A broad preparation-room light above the receiving entrance. Plain domestic windows, sample workfronts and fewer purposeful clerestories.

Primary focus: Wet work, sample rails and domestic contrast. Low east works have high daylight; west preparation and house fronts differ through room proportion and joinery..

## Architecture and craftsmanship

**Primary:** A broad preparation-room light above the receiving entrance

**Supporting:** Plain domestic windows, sample workfronts and fewer purposeful clerestories

**Quiet fields and limits:** Drying samples stay on their supported frames. Wear follows vessels and handling, not arbitrary wall grunge.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `DA_E_WORK` / `BLD_DYERS_EAST` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | One high louver centers at 14.8 in the complete 10..19.6 work tenancy; the workfront and separate staff entrance retain their ground positions. |
| `DA_E_SAMPLES` / `BLD_DYERS_EAST` | building | `ph_bz04_aged_plaster_ochre`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | One high louver centers at 22.8 in the complete 19.6..26 sample tenancy; the workfront and separate staff entrance retain their ground positions. |
| `DA_E_YARD` / `BLD_DYERS_EAST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | East dyers works compound - coordinated wing or return |
| `da-s` / `ASM_DYERS_SOUTH_WALL` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Dyers south boundary enclosure return |
| `da-works` / `BLD_DYERS_WEST` | building | `ph_bz04_aged_plaster_ochre`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Workroom has one broad three-panel rectangular window above entrance; leave two quiet side wall fields instead of a decorative arch with flanking mini-windows. |
| `da-house` / `BLD_DYERS_WEST_HOUSE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Plain rectangular domestic shutters form a matched three-window row. |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_DA_E_WORK_RECESS` | sample dye preparation and finishing | 7 / CF-CERAMIC, CF-CLOTH, CF-DYE-VESSEL, CF-FURNITURE, CF-STONE, CF-TIMBER | The visible recess supports sample dye preparation/finishing; bulk wet work belongs inside the compound. Build only the listed vessel, lidded companion, table and cloth. |
| `G_DA_E_SAMPLE_RECESS` | sample drying composition for this tenancy | 8 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | Build the named parts as sample drying composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_DYERS_ALLEY` | `DA_E_SAMPLES`, `DA_E_WORK`, `DA_E_YARD`, `cs-s-part-2`, `da-house`, `da-s`, `da-works`, `lse-n-part-2` | `cs-s-part-2`, `lse-n-part-2` |

**Required craft recipes:** CF-CERAMIC, CF-CLOTH, CF-DYE-VESSEL, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-JOINT, CF-OPEN, CF-R4-PORTAL, CF-SHADE, CF-STONE, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `DYERS_ALLEY` · `north`

Quiet background: open x=46..53.

Protected wall interval: **46..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 46..53 | **ZERO BUILD protected opening** | COVERED_SOUK |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `DYERS_ALLEY` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..32 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..32 | collider-backed solid | COLLIDER_WALL_123 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `DA_E_WORK` | 10..19.6 | (53, 10, 56.8, 19.6) | One high louver centers at 14.8 in the complete 10..19.6 work tenancy; the workfront and separate staff entrance retain their ground positions. | 5.2 | 3.8 | `ph_bz04_aged_plaster_ochre` | slab 5.2..5.38; parapet 5.83; cap 5.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `DA_E_SAMPLES` | 19.6..26 | (53, 19.6, 56.8, 26) | One high louver centers at 22.8 in the complete 19.6..26 sample tenancy; the workfront and separate staff entrance retain their ground positions. | 5.2 | 3.8 | `ph_bz04_aged_plaster_ochre` | slab 5.2..5.38; parapet 5.83; cap 5.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `DA_E_YARD` | 26..32 | (53, 26, 56.8, 32) | East dyers works compound - coordinated wing or return | 5.2 | 3.8 | `ph_bz04_aged_plaster_ochre` | slab 5.2..5.38; parapet 5.83; cap 5.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `DA_E_WORK_RECESS` | `DA_E_WORK` | shop | 12.88 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 53 | `SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `DA_E_WORK-STAFF-DOOR` | dye workfront |
| `DA_E_WORK-STAFF-DOOR` | `DA_E_WORK` | door | 17.68 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 53 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `DA_E_WORK-CLERESTORY-1` | `DA_E_WORK` | vent | 14.8 | 3.95 / 4.65 | 1.8 × 0.7 × 0.22 | 53 | `SD-07`; closed timber louver | wet vessels, sample drying and yard service daylight and ventilation |
| `DA_E_SAMPLE_RECESS` | `DA_E_SAMPLES` | shop | 21.52 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 53 | `SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `DA_E_SAMPLES-STAFF-DOOR` | dye workfront |
| `DA_E_SAMPLES-STAFF-DOOR` | `DA_E_SAMPLES` | door | 24.72 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 53 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `DA_E_SAMPLES-CLERESTORY-1` | `DA_E_SAMPLES` | vent | 22.8 | 3.95 / 4.65 | 1.8 × 0.7 × 0.22 | 53 | `SD-07`; closed timber louver | wet vessels, sample drying and yard service daylight and ventilation |
| `DA_E_YARD-ENTRANCE` | `DA_E_YARD` | door | 29 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 53 | `SD-05`; closed timber leaves | Secondary delivery or service entrance to its measured room/stair bay |
| `DA_E_YARD-CLERESTORY-1` | `DA_E_YARD` | vent | 29 | 3.95 / 4.65 | 1.35 × 0.7 × 0.22 | 53 | `SD-07`; closed timber louver | wet vessels, sample drying and yard service daylight and ventilation |

### `DYERS_ALLEY` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **46..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 46..53 | collider-backed solid | COLLIDER_WALL_008 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `da-s` | 46..53 | (46, 9.4, 53, 10) | Dyers south boundary enclosure return | 4.5 | 0.6 | `ph_bz04_sandstone_blocks_06` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `DYERS_ALLEY` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..32 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 13..32 | collider-backed solid | COLLIDER_WALL_119 |
| 10..13 | **ZERO BUILD protected opening** | LINK_SOUTH_EAST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `da-works` | 13..21.99 | (42.4, 13, 46, 21.99) | Workroom has one broad three-panel rectangular window above entrance; leave two quiet side wall fields instead of a decorative arch with flanking mini-windows. | 7 | 3.6 | `ph_bz04_aged_plaster_ochre` | slab 7..7.18; parapet 7.63; cap 7.73; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `da-house` | 21.99..32 | (42.4, 21.99, 46, 32) | Plain rectangular domestic shutters form a matched three-window row. | 7.2 | 3.6 | `ph_bz04_beige_wall_002` | slab 7.2..7.38; parapet 7.83; cap 7.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `da-works-ENTRANCE` | `da-works` | door | 17.495 | 0 / 2.8 | 1.8 × 2.8 × 0.35 | 46 | `SD-05`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `da-works-L1-W2` | `da-works` | window | 17.495 | 4.5 / 6.2 | 3.2 × 1.7 × 0.45 | 46 | `SD-07`; Closed 3-panel timber shutters | Broad preparation-room daylight above the dye receiving entrance |
| `da-house-ENTRANCE` | `da-house` | door | 26.995 | 0 / 2.55 | 1.4 × 2.55 × 0.22 | 46 | `SD-05`; closed timber leaves; architecturalDetail: `{"profile":"painted-domestic","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | principal entrance and internal stair |
| `da-house-L1-W1` | `da-house` | window | 23.491 | 4.55 / 6.15 | 1.1 × 1.6 × 0.34 | 46 | `SD-07`; Closed 2-panel timber shutters | bedrooms; daylight on its measured room axis |
| `da-house-L1-W2` | `da-house` | window | 26.995 | 4.55 / 6.15 | 1.1 × 1.6 × 0.34 | 46 | `SD-07`; Closed 2-panel timber shutters | bedrooms; daylight on its measured room axis |
| `da-house-L1-W3` | `da-house` | window | 30.498 | 4.55 / 6.15 | 1.1 × 1.6 × 0.34 | 46 | `SD-07`; Closed 2-panel timber shutters | bedrooms; daylight on its measured room axis |
| `da-house-GROUND-ROOM-0` | `da-house` | window | 23.491 | 0.95 / 2.46 | 0.95 × 1.51 × 0.22 | 46 | `SD-07`; closed paneled timber shutter | ground family room |
| `da-house-GROUND-ROOM-2` | `da-house` | window | 30.498 | 0.95 / 2.46 | 0.95 × 1.51 × 0.22 | 46 | `SD-07`; closed paneled timber shutter | ground family room |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `DYERS_ALLEY` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'DYERS_ALLEY-CLEAR', 'x': 47.25, 'y': 10, 'w': 4.5, 'h': 22, 'heightM': 2.2, 'floorSource': 'DYERS_ALLEY'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `DYERS_ALLEY` | `G_DA_E_WORK_RECESS` / `AG-DYE` | east/DA_E_WORK/DA_E_WORK_RECESS | (52.72, 11.62, 0.04) → (54.9, 14.14, 2.65) | The visible recess supports sample dye preparation/finishing; bulk wet work belongs inside the compound. Build only the listed vessel, lidded companion, table and cloth. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `DYERS_ALLEY` | `G_DA_E_SAMPLE_RECESS` / `AG-DYE` | east/DA_E_SAMPLES/DA_E_SAMPLE_RECESS | (52.72, 20.26, 0.04) → (54.9, 22.78, 2.65) | Build the named parts as sample drying composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `DYERS_ALLEY` | `DYERS_ALLEY-CLEAR` | **CLEAR ROUTE** | (47.25, 10) → (51.75, 32) | Protected empty region | Do not place geometry |

### Fixed composition `G_DA_E_WORK_RECESS`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `vessel-plinth` | stone-plinth / `CF-STONE` | [-0.85, -0.48, 0] / [0.2, 0.14, 0.13] | `ph_bz04_stone_trim_sandstone` | recess deck |
| `dye-vessel` | rounded-ceramic-vessel / `CF-DYE-VESSEL` | [-0.75, -0.42, 0.13] / [-0.18, 0.12, 0.84] | `bz04_ceramic_project_original`; albedo #d6c9b2 | vessel-plinth |
| `lidded-vessel` | lidded-ceramic-vessel / `CF-CERAMIC` | [-0.1, -0.38, 0.13] / [0.2, -0.08, 0.57] | `bz04_ceramic_project_original`; albedo #d6c9b2 | vessel-plinth |
| `side-table` | grounded-timber-table / `CF-FURNITURE` | [0.3, -0.4, 0] / [0.83, 0.15, 0.88] | `ph_bz04_worn_planks` | recess deck |
| `folded-work` | folded-cloth / `CF-CLOTH` | [0.38, -0.32, 0.88] / [0.75, 0.1, 1.02] | `ph_bz04_fine_linen` | side-table |
| `dyed-length` | hanging-cloth / `CF-CLOTH` | [-0.8, -1.82, 1.05] / [-0.18, -1.79, 2.25] | `ph_bz04_fine_linen`; albedo #d6c9b2 | wall rail with two ties at upper corners |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.25, 0.18, 0] / [1.25, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

### Fixed composition `G_DA_E_SAMPLE_RECESS`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `left-post` | timber-member / `CF-TIMBER` | [-0.86, -0.3, 0] / [-0.79, -0.23, 2.36] | `ph_bz04_worn_planks` | recess deck |
| `right-post` | timber-member / `CF-TIMBER` | [0.79, -0.3, 0] / [0.86, -0.23, 2.36] | `ph_bz04_worn_planks` | recess deck |
| `drying-rail` | timber-member / `CF-TIMBER` | [-0.86, -0.3, 2.27] / [0.86, -0.23, 2.36] | `ph_bz04_worn_planks` | left-post and right-post |
| `sample-1` | hanging-cloth / `CF-CLOTH` | [-0.74, -0.285, 1.35] / [-0.38000000000000006, -0.255, 2.25] | `ph_bz04_fine_linen`; albedo #66778c | two ties to drying-rail |
| `sample-2` | hanging-cloth / `CF-CLOTH` | [-0.2, -0.285, 0.95] / [0.2, -0.255, 2.25] | `ph_bz04_fine_linen`; albedo #ba8d75 | two ties to drying-rail |
| `sample-3` | hanging-cloth / `CF-CLOTH` | [0.41999999999999993, -0.285, 1.2] / [0.72, -0.255, 2.25] | `ph_bz04_fine_linen`; albedo #d6c9b2 | two ties to drying-rail |
| `folding-bench` | grounded-timber-bench / `CF-FURNITURE` | [-0.82, -0.4, 0] / [0.82, 0.15, 0.48] | `ph_bz04_worn_planks` | recess deck |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.25, 0.18, 0] / [1.25, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `DYERS_ALLEY` | `SHADE_DA_E_WORK_RECESS` | `SD-12` | east/DA_E_WORK/DA_E_WORK_RECESS | (52.075, 11.43, 2.54) → (53.08, 14.33, 3.145) | Supported working shade for Wet-work sample counter and supported rack |
| | `SHADE_DA_E_WORK_RECESS` dimensions/supports | | | {'interval': [11.43, 14.33], 'ledgerZ': 3.08, 'armAxesM': [11.53, 14.23], 'projectionM': 0.9, 'dropM': 0.22, 'sagM': 0.1} | Exact instance values override the standard defaults. |

**SHADE_DA_E_WORK_RECESS membrane-only bounds:** `{'min': [52.1, 11.43, 2.752], 'max': [53, 14.33, 3.08]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [52.96, 11.43, 3.04], 'max': [53.08, 14.33, 3.12]}` |
| arm-knee-1 | `{'min': [52.075, 11.495, 2.54], 'max': [53.04, 11.565, 3.145]}` |
| arm-knee-2 | `{'min': [52.075, 14.195, 2.54], 'max': [53.04, 14.265, 3.145]}` |
| cloth-and-hem | `{'min': [52.1, 11.43, 2.727], 'max': [53, 14.33, 3.08]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `DYERS_ALLEY` | 48000 | 14 | 17 | 9 |

Section origin (design coordinates): `{'x': 46, 'y': 10, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.8000000000000043, -0.02, -0.7999999999999989], 'max': [11.0, 7.22, 22.200000000000003]}`.
Required bindings: `bz04_ceramic_project_original`, `bz04_court_limestone_flags_01`, `bz04_levantine_rug_project_original`, `ph_bz04_aged_plaster_ochre`, `ph_bz04_beige_wall_002`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `DYERS_ALLEY-travel-reverse` | `DYERS_ALLEY` | (49.5, 31.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `DYERS_ALLEY-travel-forward` | `DYERS_ALLEY` | (49.5, 10.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `DYERS_ALLEY-east-DA_E_WORK-s1-base` | `DYERS_ALLEY` | (46.35, 14.8, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_ALLEY-east-DA_E_SAMPLES_DA_E_YARD-s1-base` | `DYERS_ALLEY` | (46.35, 25.8, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_ALLEY-south-da-s-s1-base` | `DYERS_ALLEY` | (49.5, 31.65, 1.7) | 0° / 0.636° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_ALLEY-west-da-works-s1-base` | `DYERS_ALLEY` | (52.65, 17.495, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_ALLEY-west-da-works-s1-upper` | `DYERS_ALLEY` | (52.65, 17.495, 1.7) | 90° / 39.491° / 75° | upper facade, parapet and roof-step coverage |
| `DYERS_ALLEY-west-da-house-s1-base` | `DYERS_ALLEY` | (52.65, 26.995, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_ALLEY-west-da-house-s1-upper` | `DYERS_ALLEY` | (52.65, 26.995, 1.7) | 90° / 40.502° / 75° | upper facade, parapet and roof-step coverage |
| `DYERS_ALLEY-R3-craft-detail` | `DYERS_ALLEY` | (49.5, 12.88, 1.7) | 270° / -1.637° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: DA_E_WORK_RECESS |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `DYERS_ALLEY` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `DYERS_ALLEY` cells: `ROOF_CELL_006`, `ROOF_CELL_051`, `ROOF_CELL_052`, `ROOF_CELL_053`.
- `DYERS_ALLEY` bundles: `ROOF_BUNDLE_UNIT_DYERS_ALLEY`.
- `DYERS_ALLEY` interfaces: `ROOF_INTERFACE_ROOF_SEAM_026`, `ROOF_INTERFACE_ROOF_STEP_044`, `ROOF_INTERFACE_ROOF_STEP_045`, `ROOF_INTERFACE_ROOF_STEP_051`, `ROOF_INTERFACE_ROOF_STEP_052`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_aged_plaster_ochre` | `ph_aged_plaster_ochre` | <span style="color:#c6a16c">■</span> `#c6a16c` | 2 / 0.28 / 0.93 / 1 |
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-11` | `DYERS_ALLEY` | shared-environment | (59, 13, 0) → (64, 22, 9) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_01` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_02` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_03` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_04` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_E_RACK_VAT_DYERS_E_RACK_04` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_01` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_03` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_HOUSE_HATCH_DYERS_HOUSE_ROOF_HATCH` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_HOUSE_SCREENS_DYERS_HOUSE_SCREEN_N` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_HOUSE_SCREENS_DYERS_HOUSE_SCREEN_S` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_HOUSE_VENT_DYERS_HOUSE_LOFT_VENT` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DYERS_ALLEY_POTTERY_L34_DYERS_ALLEY_POTTERY_01` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DYERS_ALLEY_VATS_L34_DYERS_ALLEY_VAT_01` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DYERS_ALLEY_VATS_L34_DYERS_ALLEY_VAT_02` | `DYERS_ALLEY` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_01` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_02` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_03` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_04` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_EAST_MASSING` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_DOOR` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_N` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_S` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_MASSING` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_CART_DOOR` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_NICHE_N` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_NICHE_S` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_VENT_AXIS` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_VENT_N` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_VENT_S` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_MASSING` | `DYERS_ALLEY` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_DYERS_ALLEY_north` | `DYERS_ALLEY` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_DYERS_ALLEY_east` | `DYERS_ALLEY` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_DYERS_ALLEY_south` | `DYERS_ALLEY` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_DYERS_ALLEY_west` | `DYERS_ALLEY` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [DYERS_ALLEY dimensioned plan](drawings/dyers_alley-plan.svg), [DYERS_ALLEY four elevations](drawings/dyers_alley-elevations.svg), and [DYERS_ALLEY roof axonometric](drawings/dyers_alley-axon.svg)
- [Master plan](drawings/master-plan.svg)
