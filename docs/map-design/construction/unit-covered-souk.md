# BZ-04 / R7 covered souk facade-centered upper openings · Covered Souk

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `COVERED_SOUK`

Larger central rug-showroom bay and related upper daylight. Smaller flanking workfronts and corrected merchant-house corner margins. Preserve the fixed routes and use quieter fields to frame this composition.

Primary focus: Coherent sheltered trading street. Three segmental east workfronts and the reverse merchant/loom face share measured lintels and the existing two cloth spans..

## Architecture and craftsmanship

**Primary:** Larger central rug-showroom bay and related upper daylight

**Supporting:** Smaller flanking workfronts and corrected merchant-house corner margins

**Quiet fields and limits:** Daylight breaks and routes stay legible. No extra continuous dark roof or cloned display cabinets.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `cs-n` / `ASM_SOUK_NORTH_END` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Covered Souk north end enclosure return |
| `cs-n-part-2` / `BLD_DOGLEG_WEST_ANNEX` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Dogleg dye works annex; its entrance and floor hierarchy are defined on the principal elevation |
| `cs-e` / `BLD_SOUK_EAST_STORAGE` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Three ground traders are a coherent arcade; one centered stockroom hatch and quieter blank upper flanks give the covered frontage hierarchy. |
| `cs-s` / `ASM_SOUK_SOUTH_RETURN` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Covered Souk south return enclosure return |
| `cs-s-part-2` / `BLD_DYERS_WEST_HOUSE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Dyer family house beside the works; its entrance and floor hierarchy are defined on the principal elevation |
| `cs-ws` / `BLD_FOUNTAIN_MERCHANT` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Upper narrow/broad stacks at33.6/36.6 balance the full32..39 facade and share the same physical ENTRY/MAIN rooms as the Fountain front. The ground counter and staff entrance remain independent. |
| `cs-wn` / `BLD_FOUNTAIN_HOUSE` | building | `ph_bz04_aged_plaster_ochre`; single-drip; CF-ENVELOPE / CF-JOINT | Merchant corner house - coordinated wing or return |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_COVERED_SOUK_EAST_GROUND_01` | cloth bolt store | 5 / CF-COUNTER, CF-ROLLED-CLOTH | Build the named parts as cloth bolt store. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_COVERED_SOUK_EAST_GROUND_02` | rug merchant | 10 / CF-COUNTER, CF-RUG, CF-TIMBER | Build the named parts as rug merchant. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_COVERED_SOUK_EAST_GROUND_03` | tailoring and folding | 7 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | Build the named parts as tailoring and folding. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_COVERED_SOUK_WEST_GROUND_01` | weaving sample frame | 7 / CF-BASKET, CF-TIMBER, CF-WEAVING | Build the named parts as weaving and samples. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_COVERED_SOUK` | `cs-e`, `cs-n`, `cs-s` | none |
| `ROOF_BUNDLE_UNIT_DYERS_ALLEY` | `DA_E_SAMPLES`, `DA_E_WORK`, `DA_E_YARD`, `cs-s-part-2`, `da-house`, `da-s`, `da-works`, `lse-n-part-2` | `DA_E_SAMPLES`, `DA_E_WORK`, `DA_E_YARD`, `da-house`, `da-s`, `da-works`, `lse-n-part-2` |
| `ROOF_BUNDLE_UNIT_DYERS_DOGLEG` | `cs-n-part-2`, `dd-e`, `dd-w`, `nc-s` | `dd-e`, `dd-w`, `nc-s` |
| `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` |

**Required craft recipes:** CF-BASKET, CF-CLOTH, CF-COUNTER, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-JOINT, CF-OPEN, CF-ROLLED-CLOTH, CF-RUG, CF-SHADE, CF-TIMBER, CF-WEAVING

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `COVERED_SOUK` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **41..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 41..46 | collider-backed solid | COLLIDER_WALL_025 |
| 46..53 | **ZERO BUILD protected opening** | DYERS_DOGLEG |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cs-n` | 41..42.4 | (41, 48, 42.4, 48.8) | Covered Souk north end enclosure return | 7 | 0.8 | `ph_bz04_sandstone_blocks_05` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `cs-n-part-2` | 42.4..46 | (42.4, 48, 46, 48.8) | Closed secondary face of Dogleg dye works annex; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.8 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `COVERED_SOUK` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **32..48 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 32..48 | collider-backed solid | COLLIDER_WALL_124 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cs-e` | 32..48 | (53, 32, 56.6, 48) | Three ground traders are a coherent arcade; one centered stockroom hatch and quieter blank upper flanks give the covered frontage hierarchy. | 8 | 3.6 | `ph_bz04_plastered_wall` | slab 8..8.18; parapet 8.63; cap 8.73; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `COVERED_SOUK_EAST_GROUND_01` | `cs-e` | shop | 34.667 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 53 | `SD-11+SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `cs-e-REAR-STAFF-DOOR` | pack workfront |
| `COVERED_SOUK_EAST_GROUND_02` | `cs-e` | shop | 40 | 0 / 3.1 | 3.4 × 3.1 × 1.9 | 53 | `SD-11+SD-08`; Closed continuous counter and deep display chamber; side-door clear 0.8 m → `cs-e-REAR-STAFF-DOOR` | Main cloth showroom opening in the central structural bay; flanking trading bays remain smaller |
| `COVERED_SOUK_EAST_GROUND_03` | `cs-e` | shop | 45.333 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 53 | `SD-11+SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `cs-e-REAR-STAFF-DOOR` | dye workfront |
| `cs-e-L1-W2` | `cs-e` | vent | 40 | 4.85 / 6.6 | 2.2 × 1.75 × 0.42 | 53 | `SD-07`; Closed broad timber shutters with plain fixed segmental upper light; no colored glass | Upper sorting room daylight aligned over the principal cloth showroom |

### `COVERED_SOUK` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **41..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 41..46 | collider-backed solid | COLLIDER_WALL_016 |
| 46..53 | **ZERO BUILD protected opening** | DYERS_ALLEY |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cs-s` | 41..42.4 | (41, 31.3, 42.4, 32) | Covered Souk south return enclosure return | 7 | 0.7 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `cs-s-part-2` | 42.4..46 | (42.4, 31.3, 46, 32) | Closed secondary face of Dyer family house beside the works; its entrance and floor hierarchy are defined on the principal elevation | 7.2 | 0.7 | `ph_bz04_beige_wall_002` | slab 7.2..7.38; parapet 7.83; cap 7.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `COVERED_SOUK` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **32..48 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 32..39 | collider-backed solid | COLLIDER_WALL_115 |
| 44..48 | collider-backed solid | COLLIDER_WALL_116 |
| 39..44 | **ZERO BUILD protected opening** | LINK_EAST_MID |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cs-ws` | 32..39 | (39.8, 32, 41, 39) | Upper narrow/broad stacks at33.6/36.6 balance the full32..39 facade and share the same physical ENTRY/MAIN rooms as the Fountain front. The ground counter and staff entrance remain independent. | 10.9 | 1.2 | `ph_bz04_beige_wall_002` | slab 10.9..11.08; parapet 11.53; cap 11.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `cs-wn` | 44..48 | (39.8, 44, 41, 48) | Merchant corner house - coordinated wing or return | 9.9 | 1.2 | `ph_bz04_aged_plaster_ochre` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `COVERED_SOUK_WEST_GROUND_01` | `cs-ws` | shop | 35.5 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 41 | `SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `cs-ws-STAFF-DOOR` | Rear dye-display tenancy of the merchant building |
| `cs-ws-STAFF-DOOR` | `cs-ws` | door | 37.85 | 0 / 2.55 | 1.05 × 2.55 × 0.24 | 41 | `SD-05`; closed timber leaves with a fixed opaque transom | Staff access from the covered souk |
| `cs-ws-L1-W1` | `cs-ws` | window | 33.6 | 5.85 / 7.35 | 0.7 × 1.5 × 0.34 | 41 | `SD-07`; Closed 1-panel timber shutters | family reception rooms; daylight on its measured room axis |
| `cs-ws-L1-W2` | `cs-ws` | window | 36.6 | 5.85 / 7.35 | 2 × 1.5 × 0.34 | 41 | `SD-07`; Closed 2-panel timber shutters | family reception rooms; daylight on its measured room axis |
| `cs-ws-L2-W1` | `cs-ws` | window | 33.6 | 8.85 / 10.35 | 0.7 × 1.5 × 0.34 | 41 | `SD-07`; Closed 1-panel timber shutters | private household; daylight on its measured room axis |
| `cs-ws-L2-W2` | `cs-ws` | window | 36.6 | 8.85 / 10.35 | 2 × 1.5 × 0.34 | 41 | `SD-07`; Closed 2-panel timber shutters | private household; daylight on its measured room axis |
| `cs-wn-L1-W1` | `cs-wn` | window | 46 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 41 | `SD-07`; closed double paneled timber shutters | family room; daylight on its measured room axis |
| `cs-wn-L2-W1` | `cs-wn` | window | 46 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 41 | `SD-07`; closed double paneled timber shutters | bedroom; daylight on its measured room axis |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `COVERED_SOUK` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'COVERED_SOUK-CLEAR', 'x': 44.75, 'y': 32, 'w': 4.5, 'h': 16, 'heightM': 2.2, 'floorSource': 'COVERED_SOUK'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `COVERED_SOUK` | `G_COVERED_SOUK_EAST_GROUND_01` / `AG-PACK` | east/cs-e/COVERED_SOUK_EAST_GROUND_01 | (52.72, 33.407, 0.04) → (54.9, 35.927, 2.65) | Build the named parts as cloth bolt store. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `COVERED_SOUK` | `G_COVERED_SOUK_EAST_GROUND_02` / `AG-RUG` | east/cs-e/COVERED_SOUK_EAST_GROUND_02 | (52.72, 38.35, 0.04) → (54.9, 41.65, 2.65) | Build the named parts as rug merchant. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `COVERED_SOUK` | `G_COVERED_SOUK_EAST_GROUND_03` / `AG-DYE` | east/cs-e/COVERED_SOUK_EAST_GROUND_03 | (52.72, 44.073, 0.04) → (54.9, 46.593, 2.65) | Build the named parts as tailoring and folding. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `COVERED_SOUK` | `G_COVERED_SOUK_WEST_GROUND_01` / `AG-DYE` | west/cs-ws/COVERED_SOUK_WEST_GROUND_01 | (39.1, 34.24, 0.04) → (41.28, 36.76, 2.65) | Build the named parts as weaving and samples. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `COVERED_SOUK` | `COVERED_SOUK-CLEAR` | **CLEAR ROUTE** | (44.75, 32) → (49.25, 48) | Protected empty region | Do not place geometry |

### Fixed composition `G_COVERED_SOUK_EAST_GROUND_01`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `chest` | grounded-plank-chest / `CF-COUNTER` | [-1.25, -0.55, 0] / [1.25, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck |
| `bolt-1` | rolled-textile / `CF-ROLLED-CLOTH` | [-0.68, -0.23, 0.9] / [-0.44000000000000006, 0.03, 2.05] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |
| `bolt-2` | rolled-textile / `CF-ROLLED-CLOTH` | [-0.31, -0.23, 0.9] / [-0.07, 0.03, 2.25] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |
| `bolt-3` | rolled-textile / `CF-ROLLED-CLOTH` | [0.08000000000000002, -0.23, 0.9] / [0.32, 0.03, 1.95] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |
| `bolt-4` | rolled-textile / `CF-ROLLED-CLOTH` | [0.44999999999999996, -0.23, 0.9] / [0.69, 0.03, 2.17] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |

### Fixed composition `G_COVERED_SOUK_EAST_GROUND_02`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.65, -0.55, 0] / [1.65, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `upright-1` | timber-member / `CF-TIMBER` | [-0.9, -1.9, 0] / [-0.83, -1.65, 2.45] | `ph_bz04_worn_planks` | recess deck and upper wall bracket |
| `upright-2` | timber-member / `CF-TIMBER` | [0.83, -1.9, 0] / [0.9, -1.65, 2.45] | `ph_bz04_worn_planks` | recess deck and upper wall bracket |
| `top-rail` | timber-member / `CF-TIMBER` | [-0.9, -1.9, 2.38] / [0.9, -1.65, 2.45] | `ph_bz04_worn_planks` | two uprights |
| `hanging-rug-1` | bound-hanging-rug / `CF-RUG` | [-0.74, -1.73, 0.8499999999999999] / [-0.020000000000000018, -1.7, 2.3] | `bz04_levantine_rug_project_original` | two ties to top-rail, one at each upper corner |
| `hanging-rug-2` | bound-hanging-rug / `CF-RUG` | [0.08000000000000002, -1.73, 1.0499999999999998] / [0.6599999999999999, -1.7, 2.3] | `bz04_levantine_rug_project_original` | two ties to top-rail, one at each upper corner |
| `rolled-rug-1-1` | horizontal-rolled-rug / `CF-RUG` | [-0.655, -0.19, 0.9] / [-0.10499999999999998, -0.010000000000000009, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-1-2` | horizontal-rolled-rug / `CF-RUG` | [0.10499999999999998, -0.19, 0.9] / [0.655, -0.010000000000000009, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-2-1` | horizontal-rolled-rug / `CF-RUG` | [-0.655, -0.44999999999999996, 0.9] / [-0.10499999999999998, -0.27, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-2-2` | horizontal-rolled-rug / `CF-RUG` | [0.10499999999999998, -0.44999999999999996, 0.9] / [0.655, -0.27, 1.08] | `bz04_levantine_rug_project_original` | countertop |

### Fixed composition `G_COVERED_SOUK_EAST_GROUND_03`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `left-trestle` | framed-timber-trestle / `CF-FURNITURE` | [-0.74, -0.4, 0] / [-0.64, 0.15, 0.82] | `ph_bz04_worn_planks` | recess deck |
| `right-trestle` | framed-timber-trestle / `CF-FURNITURE` | [0.64, -0.4, 0] / [0.74, 0.15, 0.82] | `ph_bz04_worn_planks` | recess deck |
| `worktop` | plank-worktop / `CF-TIMBER` | [-1.25, -0.55, 0.82] / [1.25, 0.15, 0.9] | `ph_bz04_worn_planks` | both trestles |
| `cloth-length` | folded-cloth / `CF-CLOTH` | [-0.75, -0.36, 0.9] / [0.15, 0.12, 1.04] | `bz04_levantine_rug_project_original` | worktop |
| `folded-stack` | folded-cloth / `CF-CLOTH` | [0.28, -0.3, 0.9] / [0.73, 0.1, 1.2] | `ph_bz04_fine_linen` | worktop |
| `wall-sample` | hanging-cloth / `CF-CLOTH` | [-0.55, -1.82, 1.5] / [0.4, -1.79, 2.28] | `bz04_levantine_rug_project_original` | two wall hooks at both upper corners |
| `counter-apron` | timber-apron / `CF-TIMBER` | [-1.25, 0.1, 0.65] / [1.25, 0.15, 0.82] | `ph_bz04_worn_planks` | worktop and grounded trestles |

### Fixed composition `G_COVERED_SOUK_WEST_GROUND_01`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `left-upright` | timber-member / `CF-TIMBER` | [-0.87, -0.28, 0] / [-0.8, -0.21, 2.35] | `ph_bz04_worn_planks` | recess deck and head wall brackets |
| `right-upright` | timber-member / `CF-TIMBER` | [0.8, -0.28, 0] / [0.87, -0.21, 2.35] | `ph_bz04_worn_planks` | recess deck and head wall brackets |
| `head` | timber-member / `CF-TIMBER` | [-0.87, -0.28, 2.28] / [0.87, -0.21, 2.35] | `ph_bz04_worn_planks` | both uprights |
| `weft-panel` | taut-woven-panel / `CF-WEAVING` | [-0.72, -0.265, 0.65] / [0.72, -0.24, 2.2] | `bz04_levantine_rug_project_original` | head ties and lower timber roller |
| `bottom-roller` | timber-roller / `CF-WEAVING` | [-0.84, -0.3, 0.56] / [0.84, -0.2, 0.66] | `ph_bz04_worn_planks` | both uprights |
| `shuttle-basket` | woven-basket / `CF-BASKET` | [-0.35, -0.38, 0] / [0.35, 0.1, 0.35] | `ph_bz04_fine_linen` | recess deck |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.25, 0.18, 0] / [1.25, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `COVERED_SOUK` | `CANOPY_SOUK_S` | `SD-13` | cs-ws, cs-e | (40.95, 34.2, 4.242) → (53.05, 36.8, 4.55) | Ledger placed in the measured clear band between complete window assemblies. The low southern souk panel gives the market entrance an intimate shade layer while preserving the4.20m minimum overhead clearance. |
| | `CANOPY_SOUK_S` dimensions/supports | | | {'sagM': 0.25, 'endA': [41, 35.5, 4.5], 'endB': [53, 35.5, 4.5], 'widthM': 2.4, 'ledgerLengthM': 2.6} | Exact instance values override the standard defaults. |
| `COVERED_SOUK` | `CANOPY_SOUK_N` | `SD-13` | cs-wn, cs-e | (40.95, 44.7, 6.192) → (53.05, 47.3, 6.5) | Ledger placed in a measured structural band with0.21m clearance to the full adjacent window trim. |
| | `CANOPY_SOUK_N` dimensions/supports | | | {'sagM': 0.25, 'endA': [41, 46.0, 6.45], 'endB': [53, 46.0, 6.45], 'widthM': 2.4, 'ledgerLengthM': 2.6} | Exact instance values override the standard defaults. |

**CANOPY_SOUK_S membrane-only bounds:** `{'min': [41, 34.3, 4.242], 'max': [53, 36.7, 4.5]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| cloth-or-line | `{'min': [41, 34.3, 4.242], 'max': [53, 36.7, 4.5]}` |
| endpoint-ledger-1 | `{'min': [40.95, 34.2, 4.45], 'max': [41.05, 36.8, 4.55]}` |
| endpoint-ledger-2 | `{'min': [52.95, 34.2, 4.45], 'max': [53.05, 36.8, 4.55]}` |


**CANOPY_SOUK_N membrane-only bounds:** `{'min': [41, 44.8, 6.192], 'max': [53, 47.2, 6.45]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| cloth-or-line | `{'min': [41, 44.8, 6.192], 'max': [53, 47.2, 6.45]}` |
| endpoint-ledger-1 | `{'min': [40.95, 44.7, 6.4], 'max': [41.05, 47.3, 6.5]}` |
| endpoint-ledger-2 | `{'min': [52.95, 44.7, 6.4], 'max': [53.05, 47.3, 6.5]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `COVERED_SOUK` | 48000 | 14 | 16 | 10 |

Section origin (design coordinates): `{'x': 41, 'y': 32, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-2.1000000000000014, -0.02, -0.8999999999999986], 'max': [15.800000000000004, 10.92, 17.0]}`.
Required bindings: `bz04_court_limestone_flags_01`, `bz04_levantine_rug_project_original`, `ph_bz04_aged_plaster_ochre`, `ph_bz04_beige_wall_002`, `ph_bz04_dark_wood`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `COVERED_SOUK-travel-reverse` | `COVERED_SOUK` | (47, 47.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `COVERED_SOUK-travel-forward` | `COVERED_SOUK` | (47, 32.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `COVERED_SOUK-north-cs-n_cs-n-part-2-s1-base` | `COVERED_SOUK` | (43.5, 32.35, 1.7) | 180° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `COVERED_SOUK-east-cs-e-s1-base` | `COVERED_SOUK` | (41.35, 40, 1.7) | 270° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `COVERED_SOUK-south-cs-s_cs-s-part-2-s1-base` | `COVERED_SOUK` | (43.5, 47.65, 1.7) | 0° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `COVERED_SOUK-west-cs-ws-s1-base` | `COVERED_SOUK` | (52.65, 35.5, 1.7) | 90° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `COVERED_SOUK-west-cs-ws-s1-upper` | `COVERED_SOUK` | (52.65, 35.5, 1.7) | 90° / 38.839° / 75° | upper facade, parapet and roof-step coverage |
| `COVERED_SOUK-west-cs-wn-s1-base` | `COVERED_SOUK` | (52.65, 46, 1.7) | 90° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `COVERED_SOUK-R3-craft-detail` | `COVERED_SOUK` | (44.5, 35.5, 1.7) | 90° / 0° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: COVERED_SOUK_WEST_GROUND_01 |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `COVERED_SOUK` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `COVERED_SOUK` cells: `ROOF_CELL_023`, `ROOF_CELL_024`, `ROOF_CELL_050`, `ROOF_CELL_053`, `ROOF_CELL_054`, `ROOF_CELL_055`, `ROOF_CELL_067`.
- `COVERED_SOUK` bundles: `ROOF_BUNDLE_UNIT_COVERED_SOUK`, `ROOF_BUNDLE_UNIT_DYERS_ALLEY`, `ROOF_BUNDLE_UNIT_DYERS_DOGLEG`, `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT`.
- `COVERED_SOUK` interfaces: `ROOF_INTERFACE_ROOF_STEP_045`, `ROOF_INTERFACE_ROOF_STEP_046`, `ROOF_INTERFACE_ROOF_STEP_051`, `ROOF_INTERFACE_ROOF_STEP_052`, `ROOF_INTERFACE_ROOF_STEP_053`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_aged_plaster_ochre` | `ph_aged_plaster_ochre` | <span style="color:#c6a16c">■</span> `#c6a16c` | 2 / 0.28 / 0.93 / 1 |
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-12` | `COVERED_SOUK` | shared-environment | (61, 34, 0) → (67, 43, 10.6) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_B18_DYE_COUNTER_B18_SAMPLE_DISPLAY` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B18_PACKING_FINISH_B18_PACKING_DISPLAY` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B18_ROOF_ACCESS_B18_ROOF_ACCESS` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B4_SOUK_CART_B4_SOUK_W_CART_GROUND_01` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B4_SOUK_PROCESS_VESSEL_B4_SOUK_E_GOODS_GROUND_01` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CENTRAL_DYE_DISPLAY_CENTRAL_DYE_DISPLAY` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_NORTH` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_SOUTH_1` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_SOUTH_2` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_CANOPY_CANOPY_DYERS_01` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_CERAMIC_VESSEL_LMK_DYERS_DISTRICT` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_COVER_COVER_DYERS_01` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_DYERS_LANTERN_LANTERN_DYERS_01` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_SIGNS_DYE_E_SIGN_1` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_SIGNS_DYE_E_SIGN_2` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_SIGNS_DYE_W_SIGN_1` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_VAT_EAST_LMK_DYERS_DISTRICT` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_DYERS_VAT_WEST_LMK_DYERS_DISTRICT` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_COVERED_SOUK_BASKET_LMK_DYERS_DISTRICT` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_CANOPY_DYERS_01_MOUNT_SUPPORT_CANOPY_DYERS_01` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_BOOTH_DYE_E_TEXTILE_BOOTH` | `COVERED_SOUK` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_01` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_02` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_03` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_EAST_MASSING` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_SOUTH_BAY_01` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_SOUTH_MASSING` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_GROUND_01` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_MASSING` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_GROUND_01` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_MASSING` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_STORY_1_WINDOW_01` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_STORY_1_WINDOW_01` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_COVERED_SOUK_WEST_STORY_1_WINDOW_02` | `COVERED_SOUK` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_COVERED_SOUK_north` | `COVERED_SOUK` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_COVERED_SOUK_east` | `COVERED_SOUK` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_COVERED_SOUK_south` | `COVERED_SOUK` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_COVERED_SOUK_west` | `COVERED_SOUK` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [COVERED_SOUK dimensioned plan](drawings/covered_souk-plan.svg), [COVERED_SOUK four elevations](drawings/covered_souk-elevations.svg), and [COVERED_SOUK roof axonometric](drawings/covered_souk-axon.svg)
- [Master plan](drawings/master-plan.svg)
