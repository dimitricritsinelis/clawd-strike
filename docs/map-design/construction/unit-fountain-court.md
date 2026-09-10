# BZ-04 / R7 fountain court facade-centered upper openings · Fountain Court

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `FOUNTAIN_COURT`

Guildhall entrance and fixed hall light. Merchant loggia, reception and entrance-side room stacks coordinated with the Souk reverse.

Primary focus: Retained fountain and guildhall destination. A deep, sealed merchant loggia and ordinary households frame the court. Civic transom/inscription craft belongs at the guildhall portal..

## Architecture and craftsmanship

**Primary:** Guildhall entrance and fixed hall light

**Supporting:** Merchant loggia, reception and entrance-side room stacks coordinated with the Souk reverse

**Quiet fields and limits:** Quiet corner returns inherit their buildings; do not pattern every upper window or fill the court with props.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `F_NW` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | West textile merchants - coordinated wing or return |
| `F_NE` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | East textile works - coordinated wing or return |
| `F_E_LOGGIA` / `BLD_FOUNTAIN_MERCHANT` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Upper narrow/broad stacks at33.6/36.6 balance the full32..39 facade across both upper floors. Their shared vertical grid accommodates different widths; ground entrance33.1 and loggia36.1 remain independent. |
| `F_E_HOUSE` / `BLD_FOUNTAIN_HOUSE` | building | `ph_bz04_sandstone_blocks_05`; single-drip; CF-ENVELOPE / CF-JOINT | Merchant corner house - principal frontage |
| `F_SW` / `BLD_SPICE_WEST_NORTH` | building | `ph_bz04_sandstone_blocks_06`; single-drip; CF-ENVELOPE / CF-JOINT | Red household return - coordinated wing or return |
| `F_SE` / `BLD_SPICE_EAST_NORTH` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Spice warehouse with family rooms - coordinated wing or return |
| `F_W_SERVICE` / `BLD_MADRASA_SERVICE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Guildhall service house - principal frontage |
| `F_W_HALL` / `BLD_MADRASA` | building | `ph_bz04_sandstone_blocks_05`; civic-stepped; CF-ENVELOPE / CF-JOINT | Guildhall has one strong portal and crafted high light. Upper registry rooms use paired plain windows flanking the center rather than a third competing center window. |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_FOUNTAIN_COURT_PLANT` | plant display | 5 / CF-PLANT | Build the named parts as plant display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` | `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` |
| `ROOF_BUNDLE_UNIT_SPICE_STREET` | `A_NE_RETURN`, `A_NW_RETURN`, `F_SE`, `F_SW`, `S_E_MID`, `S_E_NORTH`, `S_E_SOUTH`, `S_W_MID`, `S_W_NORTH`, `S_W_SOUTH` | `A_NE_RETURN`, `A_NW_RETURN`, `S_E_MID`, `S_E_NORTH`, `S_E_SOUTH`, `S_W_MID`, `S_W_NORTH`, `S_W_SOUTH` |
| `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` | `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-INSCRIPTION, CF-JOINT, CF-OPEN, CF-PLANT, CF-R4-GLASS, CF-R4-PORTAL

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `FOUNTAIN_COURT` · `north`

Quiet background: x=24..35 is exact immutable north opening..

Protected wall interval: **20..36 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 20..24 | collider-backed solid | COLLIDER_WALL_023 |
| 35..36 | collider-backed solid | COLLIDER_WALL_024 |
| 24..35 | **ZERO BUILD protected opening** | TEXTILE_ARCADE |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `F_NW` | 20..24 | (20, 48, 24, 51.4) | West textile merchants - coordinated wing or return | 11.1 | 3.4 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `F_NE` | 35..36 | (35, 48, 36, 50.7) | East textile works - coordinated wing or return | 10.2 | 2.7 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `F_NW-L1-W1` | `F_NW` | vent | 22 | 6.63 / 7.28 | 1.25 × 0.65 × 0.3 | 48 | `SD-07`; closed timber louver | ventilated cloth sorting and stock; high ventilation |
| `F_NW-L2-W1` | `F_NW` | window | 22 | 8.75 / 10.35 | 1.1 × 1.6 × 0.34 | 48 | `SD-07`; closed double paneled timber shutters | staff accommodation; daylight on its measured room axis |

### `FOUNTAIN_COURT` · `east`

Quiet background: y=39..44 is exact east link, with no prop or return..

Protected wall interval: **32..48 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 32..39 | collider-backed solid | COLLIDER_WALL_109 |
| 44..48 | collider-backed solid | COLLIDER_WALL_110 |
| 39..44 | **ZERO BUILD protected opening** | LINK_EAST_MID |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `F_E_LOGGIA` | 32..39 | (36, 32, 41, 39) | Upper narrow/broad stacks at33.6/36.6 balance the full32..39 facade across both upper floors. Their shared vertical grid accommodates different widths; ground entrance33.1 and loggia36.1 remain independent. | 10.9 | 5 | `ph_bz04_beige_wall_002` | slab 10.9..11.08; parapet 11.53; cap 11.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `F_E_HOUSE` | 44..48 | (36, 44, 41, 48) | Merchant corner house - principal frontage | 9.9 | 5 | `ph_bz04_aged_plaster_ochre` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `F_E_LOGGIA-PRINCIPAL` | `F_E_LOGGIA` | door | 33.1 | 0 / 2.75 | 1 × 2.75 × 0.36 | 36 | `SD-05`; Closed carved timber household entrance; architecturalDetail: `{"profile":"carved-timber-portal","surroundWidthM":0.15,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#9c8060","frameMaterialId":"ph_bz04_weathered_brown_planks","materialProfile":"warmTimber","carving":{"pattern":"running-lozenge","modulePitchM":0.12,"moduleWidthM":0.085,"moduleHeightM":0.05,"incisionWidthM":0.006,"incisionDepthM":0.006,"placement":"One centered vertical chain on each outer timber jamb; stop 0.18 m above sill and 0.18 m below the arch spring/head. The head retains two continuous nested bands. No floral alternative."}}` | Principal office entrance and stair |
| `F_E_ARCH` | `F_E_LOGGIA` | niche | 36.1 | 0 / 4.2 | 3.6 × 4.2 × 0.85 | 36 | `SD-11-CIVIC`; closed vertical slat timber screen over stone dado | Sealed civic loggia with continuous stone dado and closed screen |
| `F_E_LOGGIA-L1-W1` | `F_E_LOGGIA` | window | 33.6 | 5.85 / 7.35 | 0.7 × 1.5 × 0.34 | 36 | `SD-07`; Closed 1-panel timber shutters | Private stair landing within the entrance bay |
| `F_E_LOGGIA-RECEPTION` | `F_E_LOGGIA` | window | 36.6 | 5.65 / 7.35 | 2.6 × 1.7 × 0.5 | 36 | `SD-07`; Closed 3-panel timber shutters | One large reception-room opening above the shaded loggia |
| `F_E_LOGGIA-L2-W1` | `F_E_LOGGIA` | window | 33.6 | 8.85 / 10.35 | 0.7 × 1.5 × 0.34 | 36 | `SD-07`; Closed 1-panel timber shutters | Private stair landing within the entrance bay |
| `F_E_LOGGIA-L2-W2` | `F_E_LOGGIA` | window | 36.6 | 8.85 / 10.35 | 2 × 1.5 × 0.34 | 36 | `SD-07`; Closed 2-panel timber shutters | private household; daylight on its measured room axis |
| `F_E_HOUSE-ENTRANCE` | `F_E_HOUSE` | door | 46 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 36 | `SD-05`; closed timber leaves | principal entrance and internal stair |
| `F_E_HOUSE-L1-W1` | `F_E_HOUSE` | window | 46 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 36 | `SD-07`; closed double paneled timber shutters | family room; daylight on its measured room axis |
| `F_E_HOUSE-L2-W1` | `F_E_HOUSE` | window | 46 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 36 | `SD-07`; closed double paneled timber shutters | bedroom; daylight on its measured room axis |

### `FOUNTAIN_COURT` · `south`

Quiet background: x=21..33 is exact Spice opening..

Protected wall interval: **20..36 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 20..21 | collider-backed solid | COLLIDER_WALL_014 |
| 33..36 | collider-backed solid | COLLIDER_WALL_015 |
| 21..33 | **ZERO BUILD protected opening** | SPICE_STREET |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `F_SW` | 20..21 | (20, 29.6, 21, 32) | Red household return - coordinated wing or return | 9.9 | 2.4 | `ph_bz04_red_plaster_weathered` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `F_SE` | 33..36 | (33, 29.4, 36, 32) | Spice warehouse with family rooms - coordinated wing or return | 9.9 | 2.6 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `F_SE-L1-W1` | `F_SE` | window | 34.5 | 4.35 / 5.8 | 1.45 × 1.45 × 0.38 | 32 | `SD-07`; closed timber louver | working stock rooms; daylight on its measured room axis |
| `F_SE-L2-W1` | `F_SE` | window | 34.5 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 32 | `SD-07`; closed double paneled timber shutters | keeper household; daylight on its measured room axis |

### `FOUNTAIN_COURT` · `west`

Quiet background: y=36..41 exact west link is empty..

Protected wall interval: **32..48 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 32..36 | collider-backed solid | COLLIDER_WALL_099 |
| 41..48 | collider-backed solid | COLLIDER_WALL_100 |
| 36..41 | **ZERO BUILD protected opening** | LINK_WEST_MID |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `F_W_SERVICE` | 32..36 | (15, 32, 20, 36) | Guildhall service house - principal frontage | 9.9 | 5 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `F_W_HALL` | 41..48 | (15, 41, 20, 48) | Guildhall has one strong portal and crafted high light. Upper registry rooms use paired plain windows flanking the center rather than a third competing center window. | 11.4 | 5 | `ph_bz04_sandstone_blocks_05` | slab 11.4..11.58; parapet 12.03; cap 12.13; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `F_W_SERVICE-ENTRANCE` | `F_W_SERVICE` | door | 34 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 20 | `SD-05`; closed timber leaves | principal entrance and internal stair |
| `F_W_SERVICE-L1-W1` | `F_W_SERVICE` | window | 34 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 20 | `SD-07`; closed double paneled timber shutters | caretaker room; daylight on its measured room axis |
| `F_W_SERVICE-L2-W1` | `F_W_SERVICE` | vent | 34 | 8.73 / 9.38 | 1.25 × 0.65 × 0.3 | 20 | `SD-07`; closed timber louver | dry guild supplies; high ventilation |
| `F_W_HALL-PRINCIPAL` | `F_W_HALL` | door | 44.5 | 0 / 4.4 | 3.6 × 4.4 × 0.24 | 20 | `SD-11+SD-05`; closed timber leaves with a fixed opaque transom; architecturalDetail: `{"profile":"dressed-stone-portal","surroundWidthM":0.28,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#c6b391","frameMaterialId":"ph_bz04_stone_trim_sandstone"}` | Closed guildhall portal with timber leaves and fixed upper light |
| `F_W_HALL-HIGH-LIGHT` | `F_W_HALL` | vent | 44.5 | 5.75 / 7.05 | 2.15 × 1.3 × 0.45 | 20 | `SD-07`; Closed timber lower leaves and fixed colored-glass upper lights; glazingProfile: `{"fromZM":5.75,"pattern":"plaster-tracery","paletteSrgb":["#d7ceb0","#ad8650","#6d8c87","#6c8096"],"paletteSequence":[0,1,0,2,0,3],"columnsPerLight":3,"rows":1,"webM":0.045,"glassThicknessM":0.006,"backing":"Opaque dark matte receiver at the scheduled recess back; no view through, emission or transmitted light.","materialProfile":"fixedGlass"}` | Fixed plaster-and-glass hall light above the principal guild portal |
| `F_W_HALL-L1-W1` | `F_W_HALL` | window | 42.15 | 8.45 / 10.15 | 1.1 × 1.7 × 0.4 | 20 | `SD-07`; closed double paneled timber shutters | registry and guild offices; daylight on its measured room axis |
| `F_W_HALL-L1-W3` | `F_W_HALL` | window | 46.85 | 8.45 / 10.15 | 1.1 × 1.7 × 0.4 | 20 | `SD-07`; closed double paneled timber shutters | registry and guild offices; daylight on its measured room axis |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `FOUNTAIN_COURT` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'FOUNTAIN_COURT-CLEAR', 'x': 25.0, 'y': 32, 'w': 6, 'h': 16, 'heightM': 2.2, 'floorSource': 'FOUNTAIN_COURT'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `FOUNTAIN_COURT` | `G_FOUNTAIN_COURT_PLANT` / `AG-PLANT` | north/F_NW | (21.45, 47.7, 0) → (22.55, 48, 0.95) | Build the named parts as plant display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | Grounded trough against the named north wall; soil and roots enclosed by 0.05m walls |
| `FOUNTAIN_COURT` | `FOUNTAIN_COURT-CLEAR` | **CLEAR ROUTE** | (25, 32) → (31, 48) | Protected empty region | Do not place geometry |

### Fixed composition `G_FOUNTAIN_COURT_PLANT`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `trough` | hollow-stone-trough / `CF-PLANT` | [-0.55, 0, 0] / [0.55, 0.3, 0.5] | `ph_bz04_stone_trim_sandstone` | actual paving, full base contact |
| `soil` | contained-soil / `CF-PLANT` | [-0.5, 0.05, 0.35] / [0.5, 0.25, 0.4] | `bz04_soil_project_original` | trough interior |
| `plant-1` | contained-lancet-plant / `CF-PLANT` | [-0.42, 0.05, 0.4] / [-0.18, 0.25, 0.75] | `bz04_plant_project_original` | rooted in trough soil |
| `plant-2` | contained-lancet-plant / `CF-PLANT` | [-0.12, 0.05, 0.4] / [0.12, 0.25, 0.95] | `bz04_plant_project_original` | rooted in trough soil |
| `plant-3` | contained-lancet-plant / `CF-PLANT` | [0.18, 0.05, 0.4] / [0.42, 0.25, 0.8] | `bz04_plant_project_original` | rooted in trough soil |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `FOUNTAIN_COURT` | 48000 | 11 | 12 | 7 |

Section origin (design coordinates): `{'x': 20, 'y': 32, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-5.199999999999999, -0.02, -2.8000000000000007], 'max': [21.200000000000003, 11.42, 19.6]}`.
Required bindings: `bz04_court_limestone_flags_01`, `bz04_plant_project_original`, `bz04_soil_project_original`, `ph_bz04_aged_plaster_ochre`, `ph_bz04_beige_wall_002`, `ph_bz04_dark_wood`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_red_plaster_weathered`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `FOUNTAIN_COURT-travel-reverse` | `FOUNTAIN_COURT` | (28, 47.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `FOUNTAIN_COURT-travel-forward` | `FOUNTAIN_COURT` | (28, 32.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `FOUNTAIN_COURT-north-F_NW-s1-base` | `FOUNTAIN_COURT` | (22, 32.35, 1.7) | 180° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-north-F_NE-s1-base` | `FOUNTAIN_COURT` | (35.5, 32.35, 1.7) | 180° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-east-F_E_LOGGIA-s1-base` | `FOUNTAIN_COURT` | (20.35, 35.5, 1.7) | 270° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-east-F_E_HOUSE-s1-base` | `FOUNTAIN_COURT` | (20.35, 46, 1.7) | 270° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-south-F_SW-s1-base` | `FOUNTAIN_COURT` | (20.5, 47.65, 1.7) | 0° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-south-F_SE-s1-base` | `FOUNTAIN_COURT` | (34.5, 47.65, 1.7) | 0° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-west-F_W_SERVICE-s1-base` | `FOUNTAIN_COURT` | (35.65, 34, 1.7) | 90° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-west-F_W_HALL-s1-base` | `FOUNTAIN_COURT` | (35.65, 44.5, 1.7) | 90° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `FOUNTAIN_COURT-R3-craft-detail` | `FOUNTAIN_COURT` | (23.5, 44.5, 1.7) | 90° / 20.376° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: F_W_HALL-PRINCIPAL |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `FOUNTAIN_COURT` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `FOUNTAIN_COURT` cells: `ROOF_CELL_054`, `ROOF_CELL_055`, `ROOF_CELL_058`, `ROOF_CELL_059`, `ROOF_CELL_069`, `ROOF_CELL_073`, `ROOF_CELL_075`, `ROOF_CELL_078`.
- `FOUNTAIN_COURT` bundles: `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT`, `ROOF_BUNDLE_UNIT_SPICE_STREET`, `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE`.
- `FOUNTAIN_COURT` interfaces: `ROOF_INTERFACE_ROOF_SEAM_010`, `ROOF_INTERFACE_ROOF_SEAM_011`, `ROOF_INTERFACE_ROOF_STEP_021`, `ROOF_INTERFACE_ROOF_STEP_035`, `ROOF_INTERFACE_ROOF_STEP_036`, `ROOF_INTERFACE_ROOF_STEP_037`, `ROOF_INTERFACE_ROOF_STEP_040`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_aged_plaster_ochre` | `ph_aged_plaster_ochre` | <span style="color:#c6a16c">■</span> `#c6a16c` | 2 / 0.28 / 0.93 / 1 |
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_red_plaster_weathered` | `ph_red_plaster_weathered` | <span style="color:#b77c62">■</span> `#b77c62` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-15` | `FOUNTAIN_COURT` | shared-environment | (57, 44, 0) → (59.4, 46.4, 17.5) | Single distant civic orientation marker visible above the roof sequence. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_B4_FOUNTAIN_RUG_B4_FOUNTAIN_E_RUG_GROUND_01` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B4_FOUNTAIN_RUG_B4_FOUNTAIN_W_RUG_GROUND_01` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_MARKET_BASKET_B7_FOUNTAIN_MARKET_SPILL` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_MARKET_CRATE_B7_FOUNTAIN_MARKET_SPILL` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_MARKET_POT_B7_FOUNTAIN_MARKET_SPILL` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_EAST` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_WEST` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_TEA_STOOL_A_B7_FOUNTAIN_TEA_SPILLOVER` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_TEA_STOOL_B_B7_FOUNTAIN_TEA_SPILLOVER` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B7_FOUNTAIN_TEA_TABLE_B7_FOUNTAIN_TEA_SPILLOVER` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_BPL19_FOUNTAIN_MARKET_RUG_B7_FOUNTAIN_MARKET_SPILL` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_BPL19_FOUNTAIN_MARKET_STALL_B7_FOUNTAIN_MARKET_SPILL` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CENTRAL_SCREENS_FOUNTAIN_COURT_CENTRAL_SCREEN_COURT` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_FOUNTAIN_COVER_COVER_FOUNTAIN_01` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_FOUNTAIN_LANTERN_LANTERN_FOUNTAIN_01` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_FOUNTAIN_LMK_FOUNTAIN_01` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_FOUNTAIN_PALM_PALM_FOUNTAIN_01` | `FOUNTAIN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_GROUND_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_MASSING` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_GROUND_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_MASSING` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_STORY_1_WINDOW_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_STORY_1_WINDOW_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_STORY_1_WINDOW_02` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_GROUND_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_MASSING` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_GROUND_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_MASSING` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_STORY_1_WINDOW_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_STORY_2_WINDOW_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_STORY_1_WINDOW_01` | `FOUNTAIN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_FOUNTAIN_COURT_north` | `FOUNTAIN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_FOUNTAIN_COURT_east` | `FOUNTAIN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_FOUNTAIN_COURT_south` | `FOUNTAIN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_FOUNTAIN_COURT_west` | `FOUNTAIN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [FOUNTAIN_COURT dimensioned plan](drawings/fountain_court-plan.svg), [FOUNTAIN_COURT four elevations](drawings/fountain_court-elevations.svg), and [FOUNTAIN_COURT roof axonometric](drawings/fountain_court-axon.svg)
- [Master plan](drawings/master-plan.svg)
