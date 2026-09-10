# BZ-04 / R7-facade-centered-upper-openings · Tea Elevation

Controlled issue status: **PROPOSED_WHOLE_MAP_DESIGN**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `TEA_RAMP`

Continuous grade and a visible terrace destination. The textile building’s rear and retaining spine meet the actual ramp profile. No false level thresholds or decorations on the slope; floor and wall contact are the detail.

Primary focus: Continuous grade and a visible terrace destination. The textile building’s rear and retaining spine meet the actual ramp profile..

## Architecture and craftsmanship

**Primary:** Continuous grade and a visible terrace destination

**Supporting:** The textile building’s rear and retaining spine meet the actual ramp profile.

**Quiet fields and limits:** No false level thresholds or decorations on the slope; floor and wall contact are the detail.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `tr-e` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Rear household facade with a balanced lower pair at50/54 and one centered upper light at52 within the48..56 field |
| `tr-s` / `BLD_MADRASA` | building | `ph_bz04_sandstone_blocks_05`; civic-stepped; CF-ENVELOPE / CF-JOINT | Closed secondary face of Bazaar guildhall; its entrance and floor hierarchy are defined on the principal elevation |
| `tr-w` / `ASM_TEA_WEST_GRADE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea west grade retaining enclosure return |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s` |
| `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tt-e` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-OPEN

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `TEA_TERRACE`

A horizontal timber sitting gallery above tea service and seat. Broad upper room window aligned with the gallery, with one separate side room.

Primary focus: The raised tea serving bay and supported shade. The rear entrance at z=1.40 shares the textile building’s common upper floors. Linen, service ware and clear working depth carry the use..

## Architecture and craftsmanship

**Primary:** A horizontal timber sitting gallery above tea service and seat

**Supporting:** Broad upper room window aligned with the gallery, with one separate side room

**Quiet fields and limits:** Preserve opening head z=4.10 and ceiling 4.28. No new lintel, shelf or hardware through that tight clearance.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `tt-e` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Rear sitting hall with its3.8m gallery centered at60 and upper lights of2.3m/1.1m at58.545/62.055, with their combined outside bounds centered at60 within the56..64 field; ground service and seat remain unchanged |
| `tt-rug-return` / `BLD_RUG_MERCHANT` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed rear return of the Rug merchant gallery at the measured y64 party wall |
| `tt-w` / `ASM_TEA_WEST_GRADE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea west grade retaining enclosure return |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_tt-shop` | tea display | 19 / CF-CERAMIC, CF-CLOTH, CF-COUNTER, CF-METAL, CF-SHELF | Build the named parts as tea display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_TT_RECESSED_SEAT` | shaded tea seating | 7 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | One recessed fixed bench with a plain fitted linen cushion; no extra floor props. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e` |
| `ROOF_BUNDLE_UNIT_TEA_TERRACE` | `tl-w`, `ts-w`, `tt-w` | `tl-w`, `ts-w` |
| `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e` |

**Required craft recipes:** CF-CERAMIC, CF-CLOTH, CF-COUNTER, CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-METAL, CF-OPEN, CF-SHADE, CF-SHELF

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `TEA_STAIRS`

Legible stair run and turn. Stone base, coping, tread contact and the nearby merchant return share their measured interfaces. No added door, pot, rail or stock on protected treads.

Primary focus: Legible stair run and turn. Stone base, coping, tread contact and the nearby merchant return share their measured interfaces..

## Architecture and craftsmanship

**Primary:** Legible stair run and turn

**Supporting:** Stone base, coping, tread contact and the nearby merchant return share their measured interfaces.

**Quiet fields and limits:** No added door, pot, rail or stock on protected treads.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `ts-e` / `BLD_RUG_MERCHANT` | building | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The two rear lights stack at 69, centered in the visibly bounded 66..72 return. They serve the existing stock and loft rooms at their rear wall; front openings need not share this rear axis. The ground face stays closed along the grade. |
| `ts-w` / `ASM_TEA_WEST_GRADE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea west grade retaining enclosure return |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `tt-rug-return` |
| `ROOF_BUNDLE_UNIT_TEA_TERRACE` | `tl-w`, `ts-w`, `tt-w` | `tl-w`, `tt-w` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-OPEN

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `TEA_LANDING`

The exact open mouths and safe turning space. Returns inherit the same materials and roof edges as their owner buildings. Keep the landing empty; no invented frontage or new elevation.

Primary focus: The exact open mouths and safe turning space. Returns inherit the same materials and roof edges as their owner buildings..

## Architecture and craftsmanship

**Primary:** The exact open mouths and safe turning space

**Supporting:** Returns inherit the same materials and roof edges as their owner buildings.

**Quiet fields and limits:** Keep the landing empty; no invented frontage or new elevation.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `tl-n` / `ASM_TEA_LINK_RETURN` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea landing north return enclosure return |
| `tl-w` / `ASM_TEA_WEST_GRADE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea west grade retaining enclosure return |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_TEA_TERRACE` | `tl-w`, `ts-w`, `tt-w` | `ts-w`, `tt-w` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `TEA_RAMP` · `north`

Quiet background: open x=11..19.

Protected wall interval: **11..19 m**; floor grade: **0 → 1.4 m at 9.926°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 11..19 | **ZERO BUILD protected opening** | TEA_TERRACE |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_RAMP` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **48..56 m**; floor grade: **0 → 1.4 m at 9.926°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..56 | collider-backed solid | COLLIDER_WALL_080, COLLIDER_WALL_081, COLLIDER_WALL_082, COLLIDER_WALL_083, COLLIDER_WALL_084, COLLIDER_WALL_085, COLLIDER_WALL_086, COLLIDER_WALL_087 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tr-e` | 48..56 | (19, 48, 19.6, 56) | Rear household facade with a balanced lower pair at50/54 and one centered upper light at52 within the48..56 field | 11.1 | 0.6 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `tr-e-L1-W1` | `tr-e` | window | 50 | 5.15 / 6.95 | 1.35 × 1.8 × 0.3 | 19 | `SD-07`; Closed 2-panel timber shutters | ventilated cloth sorting and stock; daylight on its measured room axis |
| `tr-e-L1-W3` | `tr-e` | window | 54 | 5.15 / 6.95 | 1.35 × 1.8 × 0.3 | 19 | `SD-07`; Closed 2-panel timber shutters | ventilated cloth sorting and stock; daylight on its measured room axis |
| `tr-e-L2-CENTER` | `tr-e` | window | 52 | 8.75 / 10.35 | 1.25 × 1.6 × 0.3 | 19 | `SD-07`; Closed 2-panel timber shutters | staff accommodation; daylight on its measured room axis |

### `TEA_RAMP` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **11..19 m**; floor grade: **0 → 1.4 m at 9.926°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 15..19 | collider-backed solid | COLLIDER_WALL_021 |
| 11..15 | **ZERO BUILD protected opening** | CARAVAN_COURT |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tr-s` | 15..19 | (15, 47.4, 19, 48) | Closed secondary face of Bazaar guildhall; its entrance and floor hierarchy are defined on the principal elevation | 11.4 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 11.4..11.58; parapet 12.03; cap 12.13; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `TEA_RAMP` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **48..56 m**; floor grade: **0 → 1.4 m at 9.926°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..56 | collider-backed solid | COLLIDER_WALL_054, COLLIDER_WALL_055, COLLIDER_WALL_056, COLLIDER_WALL_057, COLLIDER_WALL_058, COLLIDER_WALL_059, COLLIDER_WALL_060, COLLIDER_WALL_061 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tr-w` | 48..56 | (10.4, 48, 11, 56) | Tea west grade retaining enclosure return | 5.9 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 5.9..6.02; parapet 6.02; cap 6.02; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `TEA_TERRACE` · `north`

Quiet background: open x=11..19.

Protected wall interval: **11..19 m**; floor grade: **z 1.4 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 11..19 | **ZERO BUILD protected opening** | TEA_STAIRS |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_TERRACE` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **56..66 m**; floor grade: **z 1.4 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 56..66 | collider-backed solid | COLLIDER_WALL_088 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tt-e` | 56..64 | (19, 56, 20.2, 64) | Rear sitting hall with its3.8m gallery centered at60 and upper lights of2.3m/1.1m at58.545/62.055, with their combined outside bounds centered at60 within the56..64 field; ground service and seat remain unchanged | 11.1 | 1.2 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `tt-rug-return` | 64..66 | (19, 64, 21, 66) | Closed rear return of the Rug merchant gallery at the measured y64 party wall | 9.9 | 2 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `tt-shop` | `tt-e` | shop | 58.01 | 1.4 / 4.1 | 1.8 × 2.7 × 1.9 | 19 | `SD-08`; closed shop back and continuous fixed counter; side-door clear 0.8 m → `tt-e-STAFF-DOOR` | Tea serving counter in the shared Textile/Tea building |
| `tt-e-STAFF-DOOR` | `tt-e` | door | 62.8 | 1.4 / 3.95 | 1.1 × 2.55 × 0.24 | 19 | `SD-05`; closed timber leaves with a fixed opaque transom | Rear staff entrance aligned with the front stair bay |
| `TT-SITTING-GALLERY` | `tt-e` | window | 60 | 5 / 7.3 | 3.8 × 2.3 × 0.65 | 19 | `SD-07`; closed three-panel timber sitting gallery | Rear upper sitting gallery overlooking the tea terrace; three lights belonging to one room |
| `tt-e-L2-W1` | `tt-e` | window | 58.545 | 8.75 / 10.35 | 2.3 × 1.6 × 0.34 | 19 | `SD-07`; Closed 2-panel timber shutters | staff accommodation; daylight on its measured room axis |
| `tt-e-L2-W3` | `tt-e` | window | 62.055 | 8.75 / 10.35 | 1.1 × 1.6 × 0.34 | 19 | `SD-07`; Closed 2-panel timber shutters | staff accommodation; daylight on its measured room axis |
| `TT-RECESSED-SEAT` | `tt-e` | niche | 60.57 | 1.4 / 3.65 | 1.8 × 2.25 × 0.7 | 19 | `SD-09-SEAT`; Opaque recessed plaster back with a separate fixed timber seat | Built-in shaded tea seat between serving counter and staff entrance |

### `TEA_TERRACE` · `south`

Quiet background: open x=11..19.

Protected wall interval: **11..19 m**; floor grade: **z 1.4 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 11..19 | **ZERO BUILD protected opening** | TEA_RAMP |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_TERRACE` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **56..66 m**; floor grade: **z 1.4 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 56..66 | collider-backed solid | COLLIDER_WALL_062 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tt-w` | 56..66 | (10.2, 56, 11, 66) | Tea west grade retaining enclosure return | 8.4 | 0.8 | `ph_bz04_sandstone_blocks_05` | slab 8.4..8.52; parapet 8.52; cap 8.52; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `TEA_STAIRS` · `north`

Quiet background: open x=11..19.

Protected wall interval: **11..19 m**; floor grade: **1.4 → 0 m at 13.134°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 11..19 | **ZERO BUILD protected opening** | TEA_LANDING |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_STAIRS` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **66..72 m**; floor grade: **1.4 → 0 m at 13.134°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 66..72 | collider-backed solid | COLLIDER_WALL_089, COLLIDER_WALL_090, COLLIDER_WALL_091, COLLIDER_WALL_092, COLLIDER_WALL_093, COLLIDER_WALL_094, COLLIDER_WALL_095, COLLIDER_WALL_096, COLLIDER_WALL_097, COLLIDER_WALL_098 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `ts-e` | 66..72 | (19, 66, 19.6, 72) | The two rear lights stack at 69, centered in the visibly bounded 66..72 return. They serve the existing stock and loft rooms at their rear wall; front openings need not share this rear axis. The ground face stays closed along the grade. | 9.9 | 0.6 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `ts-e-L1-W1` | `ts-e` | window | 69 | 4.6 / 5.6 | 0.55 × 1 × 0.3 | 19 | `SD-07`; closed timber louver | hand-carried stock gallery; daylight on its measured room axis |
| `ts-e-L2-W1` | `ts-e` | window | 69 | 7.9 / 8.9 | 0.55 × 1 × 0.3 | 19 | `SD-07`; closed timber louver | ventilated dry rug loft; daylight on its measured room axis |

### `TEA_STAIRS` · `south`

Quiet background: open x=11..19.

Protected wall interval: **11..19 m**; floor grade: **1.4 → 0 m at 13.134°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 11..19 | **ZERO BUILD protected opening** | TEA_TERRACE |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_STAIRS` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **66..72 m**; floor grade: **1.4 → 0 m at 13.134°**.

| Baseline interval | Status | Notes |
|---|---|---|
| 66..72 | collider-backed solid | COLLIDER_WALL_063, COLLIDER_WALL_064, COLLIDER_WALL_065, COLLIDER_WALL_066, COLLIDER_WALL_067, COLLIDER_WALL_068, COLLIDER_WALL_069, COLLIDER_WALL_070, COLLIDER_WALL_071, COLLIDER_WALL_072 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `ts-w` | 66..72 | (10.4, 66, 11, 72) | Tea west grade retaining enclosure return | 5.9 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 5.9..6.02; parapet 6.02; cap 6.02; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `TEA_LANDING` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **11..19 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 17..19 | collider-backed solid | COLLIDER_WALL_034 |
| 11..17 | **ZERO BUILD protected opening** | LINK_NORTH_WEST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tl-n` | 17..19 | (17, 76.5, 19, 77.1) | Tea landing north return enclosure return | 4.5 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `TEA_LANDING` · `east`

Quiet background: open y=72..76.5.

Protected wall interval: **72..76.5 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 72..76.5 | **ZERO BUILD protected opening** | LINK_WEST_UPPER |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_LANDING` · `south`

Quiet background: open x=11..19.

Protected wall interval: **11..19 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 11..19 | **ZERO BUILD protected opening** | TEA_STAIRS |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEA_LANDING` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **72..76.5 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 72..76 | collider-backed solid | COLLIDER_WALL_073 |
| 76..76.5 | **ZERO BUILD protected opening** | LINK_NORTH_WEST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `tl-w` | 72..76 | (10.4, 72, 11, 76) | Tea west grade retaining enclosure return | 4.5 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `TEA_RAMP` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'TEA_RAMP-CLEAR', 'x': 13.0, 'y': 48, 'w': 4, 'h': 8, 'heightM': 2.2, 'floorSource': 'TEA_RAMP'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `TEA_TERRACE` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'TEA_TERRACE-CLEAR', 'x': 13.0, 'y': 56, 'w': 4, 'h': 10, 'heightM': 2.2, 'floorSource': 'TEA_TERRACE'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `TEA_STAIRS` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'TEA_STAIRS-CLEAR', 'x': 11, 'y': 67.0, 'w': 8, 'h': 4, 'heightM': 2.2, 'floorSource': 'TEA_STAIRS'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `TEA_LANDING` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'TEA_LANDING-CLEAR', 'x': 11, 'y': 72.0, 'w': 8, 'h': 4.5, 'heightM': 2.2, 'floorSource': 'TEA_LANDING'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `TEA_RAMP` | `TEA_RAMP-CLEAR` | **CLEAR ROUTE** | (13, 48) → (17, 56) | Protected empty region | Do not place geometry |
| `TEA_TERRACE` | `G_tt-shop` / `AG-TEA` | east/tt-e/tt-shop | (18.72, 57.15, 1.44) → (20.9, 58.87, 4) | Build the named parts as tea display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=1.44, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEA_TERRACE` | `G_TT_RECESSED_SEAT` / `AG-SEAT` | east/tt-e/TT-RECESSED-SEAT | (19, 59.77, 1.44) → (19.45, 61.37, 1.95) | One recessed fixed bench with a plain fitted linen cushion; no extra floor props. | Two grounded supports on the SD-09 niche deck; no unlisted floor props |
| `TEA_TERRACE` | `TEA_TERRACE-CLEAR` | **CLEAR ROUTE** | (13, 56) → (17, 66) | Protected empty region | Do not place geometry |
| `TEA_STAIRS` | `TEA_STAIRS-CLEAR` | **CLEAR ROUTE** | (11, 67) → (19, 71) | Protected empty region | Do not place geometry |
| `TEA_LANDING` | `TEA_LANDING-CLEAR` | **CLEAR ROUTE** | (11, 72) → (19, 76.5) | Protected empty region | Do not place geometry |

### Fixed composition `G_tt-shop`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-0.85, -0.55, 0] / [0.85, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `tea-pot-1` | arabian-coffee-pot / `CF-METAL` | [-0.5800000000000001, -0.41000000000000003, 0.9] / [-0.32, -0.23, 1.22] | `bz04_brass_project_original` | countertop |
| `tea-pot-2` | arabian-coffee-pot / `CF-METAL` | [-0.15, -0.43, 0.9] / [0.15, -0.21000000000000002, 1.28] | `bz04_brass_project_original` | countertop |
| `tea-pot-3` | arabian-coffee-pot / `CF-METAL` | [0.33, -0.4, 0.9] / [0.5700000000000001, -0.24, 1.1800000000000002] | `bz04_brass_project_original` | countertop |
| `cup-1-1` | open-ceramic-cup / `CF-CERAMIC` | [-0.39499999999999996, -0.015, 0.9] / [-0.305, 0.075, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `cup-1-2` | open-ceramic-cup / `CF-CERAMIC` | [-0.045, -0.015, 0.9] / [0.045, 0.075, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `cup-1-3` | open-ceramic-cup / `CF-CERAMIC` | [0.305, -0.015, 0.9] / [0.39499999999999996, 0.075, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `cup-2-1` | open-ceramic-cup / `CF-CERAMIC` | [-0.39499999999999996, -0.14500000000000002, 0.9] / [-0.305, -0.05500000000000001, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `cup-2-2` | open-ceramic-cup / `CF-CERAMIC` | [-0.045, -0.14500000000000002, 0.9] / [0.045, -0.05500000000000001, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `cup-2-3` | open-ceramic-cup / `CF-CERAMIC` | [0.305, -0.14500000000000002, 0.9] / [0.39499999999999996, -0.05500000000000001, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `tea-linen` | folded-cloth / `CF-CLOTH` | [-0.82, -0.18, 0.9] / [-0.62, 0.08, 0.95] | `ph_bz04_fine_linen` | countertop |
| `tea-shelf-1` | plank-shelf / `CF-SHELF` | [-0.8, -1.9, 1.14] / [0.8, -1.68, 1.35] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `tea-stock-1-1` | lidded-tea-canister / `CF-CERAMIC` | [-0.58, -1.87, 1.35] / [-0.42, -1.71, 1.57] | `bz04_ceramic_project_original`; albedo #c1b69e | tea-shelf-1 |
| `tea-stock-1-2` | lidded-tea-canister / `CF-CERAMIC` | [-0.08, -1.87, 1.35] / [0.08, -1.71, 1.57] | `bz04_ceramic_project_original`; albedo #c1b69e | tea-shelf-1 |
| `tea-stock-1-3` | lidded-tea-canister / `CF-CERAMIC` | [0.42, -1.87, 1.35] / [0.58, -1.71, 1.57] | `bz04_ceramic_project_original`; albedo #c1b69e | tea-shelf-1 |
| `tea-shelf-2` | plank-shelf / `CF-SHELF` | [-0.8, -1.9, 1.64] / [0.8, -1.68, 1.85] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `tea-stock-2-1` | lidded-tea-canister / `CF-CERAMIC` | [-0.58, -1.87, 1.85] / [-0.42, -1.71, 2.0700000000000003] | `bz04_ceramic_project_original`; albedo #c1b69e | tea-shelf-2 |
| `tea-stock-2-2` | lidded-tea-canister / `CF-CERAMIC` | [-0.08, -1.87, 1.85] / [0.08, -1.71, 2.0700000000000003] | `bz04_ceramic_project_original`; albedo #c1b69e | tea-shelf-2 |
| `tea-stock-2-3` | lidded-tea-canister / `CF-CERAMIC` | [0.42, -1.87, 1.85] / [0.58, -1.71, 2.0700000000000003] | `bz04_ceramic_project_original`; albedo #c1b69e | tea-shelf-2 |

### Fixed composition `G_TT_RECESSED_SEAT`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `end-frame-1` | framed-timber-end / `CF-FURNITURE` | [-0.78, -0.42, 0] / [-0.7, -0.02999999999999997, 0.42] | `ph_bz04_worn_planks` | recess deck |
| `end-frame-2` | framed-timber-end / `CF-FURNITURE` | [0.7, -0.42, 0] / [0.78, -0.02999999999999997, 0.42] | `ph_bz04_worn_planks` | recess deck |
| `seat-board-1` | plank-board / `CF-TIMBER` | [-0.8, -0.44999999999999996, 0.42] / [0.8, -0.32, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `seat-board-2` | plank-board / `CF-TIMBER` | [-0.8, -0.29, 0.42] / [0.8, -0.15999999999999998, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `seat-board-3` | plank-board / `CF-TIMBER` | [-0.8, -0.12999999999999998, 0.42] / [0.8, 0.0, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `stretcher` | timber-member / `CF-TIMBER` | [-0.74, -0.325, 0.18] / [0.74, -0.27499999999999997, 0.23] | `ph_bz04_worn_planks` | two end frames |
| `fitted-cushion` | fitted-cloth-cushion / `CF-CLOTH` | [-0.625, -0.4, 0.46] / [0.625, -0.04999999999999999, 0.51] | `ph_bz04_hessian_230`; albedo #c8b896 | seat boards |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `TEA_TERRACE` | `SHADE_tt-shop` | `SD-12` | east/tt-e/tt-shop | (17.975, 56.96, 3.89) → (19.08, 59.06, 4.495) | Supported working shade for existing tea recess |
| | `SHADE_tt-shop` dimensions/supports | | | {'interval': [56.96, 59.06], 'ledgerZ': 4.43, 'armAxesM': [57.06, 58.96], 'projectionM': 1.0, 'dropM': 0.22, 'sagM': 0.08} | Exact instance values override the standard defaults. |
| `TEA_TERRACE` | `R4-SHADE-TT-RECESSED-SEAT` | `SD-12` | east/tt-e/TT-RECESSED-SEAT | (18.275, 59.57, 3.86) → (19.08, 61.57, 4.465) | Supported cream shade makes the fixed sitting pocket usable; no ground posts. |
| | `R4-SHADE-TT-RECESSED-SEAT` dimensions/supports | | | {'interval': [59.57, 61.57], 'ledgerZ': 4.4, 'armAxesM': [59.67, 61.47], 'projectionM': 0.7, 'dropM': 0.16, 'sagM': 0.08} | Exact instance values override the standard defaults. |

**SHADE_tt-shop membrane-only bounds:** `{'min': [18.0, 56.96, 4.122], 'max': [19, 59.06, 4.43]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [18.96, 56.96, 4.39], 'max': [19.08, 59.06, 4.47]}` |
| arm-knee-1 | `{'min': [17.975, 57.025000000000006, 3.8899999999999997], 'max': [19.04, 57.095, 4.495]}` |
| arm-knee-2 | `{'min': [17.975, 58.925000000000004, 3.8899999999999997], 'max': [19.04, 58.995, 4.495]}` |
| cloth-and-hem | `{'min': [18.0, 56.96, 4.0969999999999995], 'max': [19, 59.06, 4.43]}` |


**R4-SHADE-TT-RECESSED-SEAT membrane-only bounds:** `{'min': [18.3, 59.57, 4.152], 'max': [19, 61.57, 4.4]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [18.96, 59.57, 4.36], 'max': [19.08, 61.57, 4.44]}` |
| arm-knee-1 | `{'min': [18.275, 59.635000000000005, 3.8600000000000003], 'max': [19.04, 59.705, 4.465000000000001]}` |
| arm-knee-2 | `{'min': [18.275, 61.435, 3.8600000000000003], 'max': [19.04, 61.504999999999995, 4.465000000000001]}` |
| cloth-and-hem | `{'min': [18.3, 59.57, 4.127000000000001], 'max': [19, 61.57, 4.4]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `TEA_RAMP` | 12000 | 6 | 6 | 5 |
| `TEA_TERRACE` | 48000 | 12 | 15 | 8 |
| `TEA_STAIRS` | 12000 | 6 | 6 | 5 |
| `TEA_LANDING` | 12000 | 4 | 4 | 3 |

Section origin (design coordinates): `{'x': 11, 'y': 48, 'z': 0.7, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.7999999999999989, -0.72, -0.8000000000000043], 'max': [8.8, 10.72, 8.200000000000003]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_painted_plaster_warm`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`.


Section origin (design coordinates): `{'x': 11, 'y': 56, 'z': 1.4, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-1.0, -0.020000000000000018, -0.20000000000000284], 'max': [10.2, 9.719999999999999, 10.200000000000003]}`.
Required bindings: `bz04_brass_project_original`, `bz04_ceramic_project_original`, `bz04_court_limestone_flags_01`, `ph_bz04_dark_wood`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


Section origin (design coordinates): `{'x': 11, 'y': 66, 'z': 0.7, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.7999999999999989, -0.72, -0.20000000000000284], 'max': [8.8, 9.22, 6.200000000000003]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_painted_plaster_warm`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`.


Section origin (design coordinates): `{'x': 11, 'y': 72, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.7999999999999989, -0.02, -0.20000000000000284], 'max': [8.2, 4.52, 5.299999999999997]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `TEA_RAMP-travel-reverse` | `TEA_RAMP` | (15, 55.35, 2.986) | 0° / 0° / 75° | Reverse arrival and district transition |
| `TEA_RAMP-travel-forward` | `TEA_RAMP` | (15, 48.65, 1.814) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `TEA_RAMP-east-tr-e-s1-base` | `TEA_RAMP` | (11.35, 52, 2.4) | 270° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_RAMP-east-tr-e-s1-upper` | `TEA_RAMP` | (11.35, 52, 2.4) | 270° / 49.256° / 75° | upper facade, parapet and roof-step coverage |
| `TEA_RAMP-south-tr-s-s1-base` | `TEA_RAMP` | (17, 55.65, 3.039) | 0° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_RAMP-south-tr-s-s1-upper` | `TEA_RAMP` | (17, 55.65, 3.039) | 0° / 48.151° / 75° | upper facade, parapet and roof-step coverage |
| `TEA_RAMP-west-tr-w-s1-base` | `TEA_RAMP` | (18.65, 52, 2.4) | 90° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_TERRACE-travel-reverse` | `TEA_TERRACE` | (15, 65.35, 3.1) | 0° / 0° / 75° | Reverse arrival and district transition |
| `TEA_TERRACE-travel-forward` | `TEA_TERRACE` | (15, 56.65, 3.1) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `TEA_TERRACE-east-tt-e_tt-rug-return-s1-base` | `TEA_TERRACE` | (11.35, 61, 3.1) | 270° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_TERRACE-east-tt-e_tt-rug-return-s1-upper` | `TEA_TERRACE` | (11.35, 61, 3.1) | 270° / 46.918° / 75° | upper facade, parapet and roof-step coverage |
| `TEA_TERRACE-west-tt-w-s1-base` | `TEA_TERRACE` | (18.65, 61, 3.1) | 90° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_TERRACE-R3-craft-detail` | `TEA_TERRACE` | (15.5, 58.01, 3.1) | 270° / -1.637° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: tt-shop |
| `TEA_STAIRS-travel-reverse` | `TEA_STAIRS` | (15, 71.35, 1.852) | 0° / 0° / 75° | Reverse arrival and district transition |
| `TEA_STAIRS-travel-forward` | `TEA_STAIRS` | (15, 66.65, 2.948) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `TEA_STAIRS-east-ts-e-s1-base` | `TEA_STAIRS` | (11.35, 69, 2.4) | 270° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_STAIRS-east-ts-e-s1-upper` | `TEA_STAIRS` | (11.35, 69, 2.4) | 270° / 45.112° / 75° | upper facade, parapet and roof-step coverage |
| `TEA_STAIRS-west-ts-w-s1-base` | `TEA_STAIRS` | (18.65, 69, 2.4) | 90° / 3.74° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_LANDING-travel-reverse` | `TEA_LANDING` | (15, 75.85, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `TEA_LANDING-travel-forward` | `TEA_LANDING` | (15, 72.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `TEA_LANDING-north-tl-n-s1-base` | `TEA_LANDING` | (18, 72.35, 1.7) | 180° / 3.315° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEA_LANDING-west-tl-w-s1-base` | `TEA_LANDING` | (18.65, 74, 1.7) | 90° / 1.8° / 75° | lower and mid facade coverage with adjacent approach/return context |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `TEA_RAMP` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `TEA_TERRACE` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `TEA_STAIRS` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `TEA_LANDING` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `TEA_RAMP` cells: `ROOF_CELL_058`, `ROOF_CELL_078`.
- `TEA_RAMP` bundles: `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT`, `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE`.
- `TEA_RAMP` interfaces: No cross-bundle interface.
- `TEA_TERRACE` cells: `ROOF_CELL_026`, `ROOF_CELL_027`, `ROOF_CELL_028`, `ROOF_CELL_066`, `ROOF_CELL_078`.
- `TEA_TERRACE` bundles: `ROOF_BUNDLE_UNIT_RUG_GATE`, `ROOF_BUNDLE_UNIT_TEA_TERRACE`, `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE`.
- `TEA_TERRACE` interfaces: `ROOF_INTERFACE_ROOF_STEP_005`, `ROOF_INTERFACE_ROOF_STEP_007`, `ROOF_INTERFACE_ROOF_STEP_008`, `ROOF_INTERFACE_ROOF_STEP_009`, `ROOF_INTERFACE_ROOF_STEP_010`, `ROOF_INTERFACE_ROOF_STEP_011`, `ROOF_INTERFACE_ROOF_STEP_012`, `ROOF_INTERFACE_ROOF_STEP_013`, `ROOF_INTERFACE_ROOF_STEP_014`, `ROOF_INTERFACE_ROOF_STEP_016`, `ROOF_INTERFACE_ROOF_STEP_017`.
- `TEA_STAIRS` cells: `ROOF_CELL_027`, `ROOF_CELL_066`.
- `TEA_STAIRS` bundles: `ROOF_BUNDLE_UNIT_RUG_GATE`, `ROOF_BUNDLE_UNIT_TEA_TERRACE`.
- `TEA_STAIRS` interfaces: No cross-bundle interface.
- `TEA_LANDING` cells: `ROOF_CELL_028`.
- `TEA_LANDING` bundles: `ROOF_BUNDLE_UNIT_TEA_TERRACE`.
- `TEA_LANDING` interfaces: No cross-bundle interface.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_L34_TEA_STALL_L34_TEA_STALL_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_COVER_COVER_TEA_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_TEA_LANTERN_LANTERN_TEA_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST` | `TEA_RAMP` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST` | `TEA_RAMP` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_SIGNS_TEA_E_SIGN_1` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_STOOL_EAST_LMK_TEA_TERRACE_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_STOOL_WEST_NORTH_LMK_TEA_TERRACE_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_STOOL_WEST_SOUTH_LMK_TEA_TERRACE_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_TABLE_LMK_TEA_TERRACE_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_TERRACE_SHADE_TEA_TERRACE_SHADE_01` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_WINDOW_1_MOUNT_TEA_WINDOW_1` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEA_WINDOW_2_MOUNT_TEA_WINDOW_2` | `TEA_TERRACE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_TEA_TERRACE_EAST_GROUND_01` | `TEA_TERRACE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEA_TERRACE_EAST_GROUND_02` | `TEA_TERRACE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEA_TERRACE_EAST_MASSING` | `TEA_TERRACE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_01` | `TEA_TERRACE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_02` | `TEA_TERRACE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_TEA_LANDING_north` | `TEA_LANDING` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_LANDING_east` | `TEA_LANDING` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_LANDING_south` | `TEA_LANDING` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_LANDING_west` | `TEA_LANDING` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_RAMP_north` | `TEA_RAMP` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_RAMP_east` | `TEA_RAMP` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_RAMP_south` | `TEA_RAMP` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_RAMP_west` | `TEA_RAMP` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_STAIRS_north` | `TEA_STAIRS` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_STAIRS_east` | `TEA_STAIRS` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_STAIRS_south` | `TEA_STAIRS` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_STAIRS_west` | `TEA_STAIRS` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_TERRACE_north` | `TEA_TERRACE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_TERRACE_east` | `TEA_TERRACE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_TERRACE_south` | `TEA_TERRACE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEA_TERRACE_west` | `TEA_TERRACE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [TEA_RAMP dimensioned plan](drawings/tea_ramp-plan.svg), [TEA_RAMP four elevations](drawings/tea_ramp-elevations.svg), and [TEA_RAMP roof axonometric](drawings/tea_ramp-axon.svg)
- [TEA_TERRACE dimensioned plan](drawings/tea_terrace-plan.svg), [TEA_TERRACE four elevations](drawings/tea_terrace-elevations.svg), and [TEA_TERRACE roof axonometric](drawings/tea_terrace-axon.svg)
- [TEA_STAIRS dimensioned plan](drawings/tea_stairs-plan.svg), [TEA_STAIRS four elevations](drawings/tea_stairs-elevations.svg), and [TEA_STAIRS roof axonometric](drawings/tea_stairs-axon.svg)
- [TEA_LANDING dimensioned plan](drawings/tea_landing-plan.svg), [TEA_LANDING four elevations](drawings/tea_landing-elevations.svg), and [TEA_LANDING roof axonometric](drawings/tea_landing-axon.svg)
- [Master plan](drawings/master-plan.svg)
