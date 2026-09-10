# BZ-04 / R7 textile arcade facade-centered upper openings · Textile Arcade

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `TEXTILE_ARCADE`

One continuous production building with three useful workrooms. One broad central showroom shutter; coordinated merchant rooms opposite; no miniature stair-slot grid.

Primary focus: Production east, retail and stock west. The east working windows and high loft vents differ from the west sorting vents/household floor. Existing loom, rug, folding and dispatch groups are visibly distinct..

## Architecture and craftsmanship

**Primary:** One continuous production building with three useful workrooms

**Supporting:** One broad central showroom shutter; coordinated merchant rooms opposite; no miniature stair-slot grid

**Quiet fields and limits:** Three drafting parcels on a side are one building. Keep a coherent material/floor system and the protected clear route.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `T_N_CAP` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | East textile works - coordinated wing or return |
| `T_E_LOOM` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering. |
| `T_E_GALLERY` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering. |
| `T_E_CART` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering. |
| `T_W_LOOM` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering. |
| `T_W_DYER` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering. |
| `T_W_FOLDS` / `BLD_TEXTILE_WEST` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering. |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_T_E_ARCH1` | cloth bolts receiving | 5 / CF-COUNTER, CF-ROLLED-CLOTH | Build the named parts as cloth bolts receiving. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_T_E_ARCH2` | textile display | 10 / CF-COUNTER, CF-RUG, CF-TIMBER | Build the named parts as textile display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_T_E_ARCH3` | weaving sample frame | 7 / CF-BASKET, CF-TIMBER, CF-WEAVING | Build the named parts as weaving workroom. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_T_W_ARCH1` | rug retail | 10 / CF-COUNTER, CF-RUG, CF-TIMBER | Build the named parts as rug retail. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_T_W_ARCH2` | cutting and folding | 7 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | Build the named parts as cutting and folding. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_T_W_ARCH3` | packing and dispatch | 4 / CF-COUNTER, CF-ROLLED-CLOTH | Build the named parts as packing and dispatch. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `leu-s`, `tr-e`, `tt-e` |

**Required craft recipes:** CF-BASKET, CF-CLOTH, CF-COUNTER, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-JOINT, CF-OPEN, CF-ROLLED-CLOTH, CF-RUG, CF-SHADE, CF-TIMBER, CF-WEAVING

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `TEXTILE_ARCADE` · `north`

Quiet background: x=24..34 is immutable open Rug Gate reveal..

Protected wall interval: **24..35 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 34..35 | collider-backed solid | COLLIDER_WALL_028 |
| 24..34 | **ZERO BUILD protected opening** | RUG_GATE |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `T_N_CAP` | 34..35 | (34, 64, 35, 66.2) | East textile works - coordinated wing or return | 10.2 | 2.2 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `TEXTILE_ARCADE` · `east`

Quiet background: Practical low-contrast packing side..

Protected wall interval: **48..64 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..64 | collider-backed solid | COLLIDER_WALL_108 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `T_E_LOOM` | 48..53.65 | (35, 48, 39.2, 53.65) | Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged | 10.2 | 4.2 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `T_E_GALLERY` | 53.65..59.1 | (35, 53.65, 39.2, 59.1) | Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged | 10.2 | 4.2 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `T_E_CART` | 59.1..64 | (35, 59.1, 38, 64) | Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged | 10.2 | 3 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `T_E_ARCH1` | `T_E_LOOM` | shop | 49.95 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 35 | `SD-11+SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `T_E_GALLERY-STAFF-DOOR` | pack workfront |
| `T_E_LOOM-L1-W1` | `T_E_LOOM` | window | 50.825 | 4.2 / 6 | 1.8 × 1.8 × 0.38 | 35 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_E_LOOM-L2-W1` | `T_E_LOOM` | vent | 50.825 | 8.95 / 9.65 | 1.5 × 0.7 × 0.3 | 35 | `SD-07`; closed timber louver | High ventilation centered in the end stock-room facade field |
| `T_E_ARCH2` | `T_E_GALLERY` | shop | 55.285 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 35 | `SD-11+SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `T_E_GALLERY-STAFF-DOOR` | rug workfront |
| `T_E_GALLERY-STAFF-DOOR` | `T_E_GALLERY` | door | 58.01 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 35 | `SD-05`; closed timber leaves | Principal shared stair and internal staff passage serving the three textile workrooms and upper stock floor |
| `T_E_GALLERY-L1-W1` | `T_E_GALLERY` | window | 56.375 | 4.2 / 6 | 2.96 × 1.8 × 0.55 | 35 | `SD-07`; Closed 3-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_E_ARCH3` | `T_E_CART` | shop | 60.57 | 0 / 2.75 | 2.54 × 2.75 × 1.9 | 35 | `SD-11+SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `T_E_CART-STAFF-DOOR` | pack workfront |
| `T_E_CART-STAFF-DOOR` | `T_E_CART` | door | 62.8 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 35 | `SD-05`; closed timber leaves | North receiving entrance for cloth parcels and dry-stock handling; upper rooms use the central shared stair |
| `T_E_CART-L1-W1` | `T_E_CART` | window | 61.55 | 4.2 / 6 | 1.8 × 1.8 × 0.38 | 35 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_E_CART-L2-W1` | `T_E_CART` | vent | 61.55 | 8.95 / 9.65 | 1.5 × 0.7 × 0.3 | 35 | `SD-07`; closed timber louver | High ventilation centered in the end stock-room facade field |

### `TEXTILE_ARCADE` · `south`

Quiet background: Exact immutable x=24..35 opening to Fountain Court..

Protected wall interval: **24..35 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 24..35 | **ZERO BUILD protected opening** | FOUNTAIN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `TEXTILE_ARCADE` · `west`

Quiet background: West carries display colour, not free floor clutter..

Protected wall interval: **48..64 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..64 | collider-backed solid | COLLIDER_WALL_104 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `T_W_LOOM` | 48..53.65 | (19.2, 48, 24, 53.65) | Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged | 11.1 | 4.8 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `T_W_DYER` | 53.65..59.1 | (19.2, 53.65, 24, 59.1) | Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged | 11.1 | 4.8 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `T_W_FOLDS` | 59.1..64 | (19.2, 59.1, 24, 64) | Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged | 11.1 | 4.8 | `ph_bz04_painted_plaster_warm` | slab 11.1..11.28; parapet 11.73; cap 11.83; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `T_W_ARCH1` | `T_W_LOOM` | shop | 49.95 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 24 | `SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `T_W_LOOM-STAFF-DOOR` | rug workfront |
| `T_W_LOOM-STAFF-DOOR` | `T_W_LOOM` | door | 52.52 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 24 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `T_W_LOOM-L1-W1` | `T_W_LOOM` | window | 50.825 | 5.15 / 6.95 | 1.45 × 1.8 × 0.3 | 24 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_W_LOOM-L2-W1` | `T_W_LOOM` | window | 50.825 | 8.75 / 10.35 | 1.25 × 1.6 × 0.34 | 24 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_W_ARCH2` | `T_W_DYER` | shop | 55.285 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 24 | `SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `T_W_DYER-STAFF-DOOR` | pack workfront |
| `T_W_DYER-STAFF-DOOR` | `T_W_DYER` | door | 58.01 | 0 / 2.7 | 1.3 × 2.7 × 0.35 | 24 | `SD-05`; Closed paired timber leaves with carved top rail only | Principal merchant-house and stair entrance, distinguished by depth and a restrained timber head |
| `T_W_DYER-L1-W1` | `T_W_DYER` | window | 56.375 | 5.15 / 6.95 | 2.6 × 1.8 × 0.3 | 24 | `SD-07`; Closed 3-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_W_DYER-UPPER-SITTING` | `T_W_DYER` | window | 56.375 | 8.75 / 10.35 | 2.3 × 1.6 × 0.4 | 24 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_W_ARCH3` | `T_W_FOLDS` | shop | 60.57 | 0 / 2.75 | 2.54 × 2.75 × 1.9 | 24 | `SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `T_W_FOLDS-STAFF-DOOR` | pack workfront |
| `T_W_FOLDS-STAFF-DOOR` | `T_W_FOLDS` | door | 62.8 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 24 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `T_W_FOLDS-L1-W1` | `T_W_FOLDS` | window | 61.55 | 5.15 / 6.95 | 1.2 × 1.8 × 0.3 | 24 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |
| `T_W_FOLDS-L2-W1` | `T_W_FOLDS` | window | 61.55 | 8.75 / 10.35 | 1.2 × 1.6 × 0.34 | 24 | `SD-07`; Closed 2-panel timber shutters | Upper textile work, sitting or dry-stock room daylight centered in its facade field |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `TEXTILE_ARCADE` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'TEXTILE_ARCADE-CLEAR', 'x': 26.5, 'y': 48, 'w': 6, 'h': 16, 'heightM': 2.2, 'floorSource': 'TEXTILE_ARCADE'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `TEXTILE_ARCADE` | `G_T_E_ARCH1` / `AG-PACK` | east/T_E_LOOM/T_E_ARCH1 | (34.72, 48.69, 0.04) → (36.9, 51.21, 2.65) | Build the named parts as cloth bolts receiving. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEXTILE_ARCADE` | `G_T_E_ARCH2` / `AG-RUG` | east/T_E_GALLERY/T_E_ARCH2 | (34.72, 54.025, 0.04) → (36.9, 56.545, 2.65) | Build the named parts as textile display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEXTILE_ARCADE` | `G_T_E_ARCH3` / `AG-PACK` | east/T_E_CART/T_E_ARCH3 | (34.72, 59.34, 0.04) → (36.9, 61.8, 2.65) | Build the named parts as weaving workroom. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEXTILE_ARCADE` | `G_T_W_ARCH1` / `AG-RUG` | west/T_W_LOOM/T_W_ARCH1 | (22.1, 48.69, 0.04) → (24.28, 51.21, 2.65) | Build the named parts as rug retail. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEXTILE_ARCADE` | `G_T_W_ARCH2` / `AG-PACK` | west/T_W_DYER/T_W_ARCH2 | (22.1, 54.025, 0.04) → (24.28, 56.545, 2.65) | Build the named parts as cutting and folding. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEXTILE_ARCADE` | `G_T_W_ARCH3` / `AG-PACK` | west/T_W_FOLDS/T_W_ARCH3 | (22.1, 59.34, 0.04) → (24.28, 61.8, 2.65) | Build the named parts as packing and dispatch. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `TEXTILE_ARCADE` | `TEXTILE_ARCADE-CLEAR` | **CLEAR ROUTE** | (26.5, 48) → (32.5, 64) | Protected empty region | Do not place geometry |

### Fixed composition `G_T_E_ARCH1`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `chest` | grounded-plank-chest / `CF-COUNTER` | [-1.25, -0.55, 0] / [1.25, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck |
| `bolt-1` | rolled-textile / `CF-ROLLED-CLOTH` | [-0.68, -0.23, 0.9] / [-0.44000000000000006, 0.03, 2.05] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |
| `bolt-2` | rolled-textile / `CF-ROLLED-CLOTH` | [-0.31, -0.23, 0.9] / [-0.07, 0.03, 2.25] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |
| `bolt-3` | rolled-textile / `CF-ROLLED-CLOTH` | [0.08000000000000002, -0.23, 0.9] / [0.32, 0.03, 1.95] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |
| `bolt-4` | rolled-textile / `CF-ROLLED-CLOTH` | [0.44999999999999996, -0.23, 0.9] / [0.69, 0.03, 2.17] | `ph_bz04_fine_linen` | chest top; concealed dowel socket |

### Fixed composition `G_T_E_ARCH2`

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

### Fixed composition `G_T_E_ARCH3`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `left-upright` | timber-member / `CF-TIMBER` | [-0.87, -0.48000000000000004, 0] / [-0.8, -0.41000000000000003, 2.35] | `ph_bz04_worn_planks` | recess deck and head wall brackets |
| `right-upright` | timber-member / `CF-TIMBER` | [0.8, -0.48000000000000004, 0] / [0.87, -0.41000000000000003, 2.35] | `ph_bz04_worn_planks` | recess deck and head wall brackets |
| `head` | timber-member / `CF-TIMBER` | [-0.87, -0.48000000000000004, 2.28] / [0.87, -0.41000000000000003, 2.35] | `ph_bz04_worn_planks` | both uprights |
| `weft-panel` | taut-woven-panel / `CF-WEAVING` | [-0.72, -0.465, 0.65] / [0.72, -0.44, 2.2] | `bz04_levantine_rug_project_original` | head ties and lower timber roller |
| `bottom-roller` | timber-roller / `CF-WEAVING` | [-0.84, -0.5, 0.56] / [0.84, -0.4, 0.66] | `ph_bz04_worn_planks` | both uprights |
| `shuttle-basket` | woven-basket / `CF-BASKET` | [-0.35, -0.5800000000000001, 0] / [0.35, -0.1, 0.35] | `ph_bz04_fine_linen` | recess deck |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.22, 0.18, 0] / [1.22, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

### Fixed composition `G_T_W_ARCH1`

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

### Fixed composition `G_T_W_ARCH2`

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

### Fixed composition `G_T_W_ARCH3`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `chest` | grounded-plank-chest / `CF-COUNTER` | [-1.22, -0.55, 0] / [1.22, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck |
| `bale-1` | bound-folded-textile / `CF-ROLLED-CLOTH` | [-0.8049999999999999, -0.38, 0.9] / [-0.15499999999999997, 0.11, 1.28] | `ph_bz04_fine_linen` | chest top |
| `bale-2` | bound-folded-textile / `CF-ROLLED-CLOTH` | [0.0, -0.38, 0.9] / [0.6, 0.11, 1.2] | `ph_bz04_fine_linen` | chest top |
| `bale-3` | bound-folded-textile / `CF-ROLLED-CLOTH` | [-0.6499999999999999, -0.38, 1.28] / [0.04999999999999999, 0.11, 1.6] | `ph_bz04_fine_linen` | bale-1 |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `TEXTILE_ARCADE` | `CANOPY_TEXTILE` | `SD-13` | T_W_DYER, T_E_GALLERY | (23.95, 54.45, 7.642) → (35.05, 57.15, 7.95) | Ledger placed in a measured structural band with0.21m clearance to the full adjacent window trim. |
| | `CANOPY_TEXTILE` dimensions/supports | | | {'sagM': 0.25, 'endA': [24, 55.8, 7.9], 'endB': [35, 55.8, 7.9], 'widthM': 2.5, 'ledgerLengthM': 2.7} | Exact instance values override the standard defaults. |

**CANOPY_TEXTILE membrane-only bounds:** `{'min': [24, 54.55, 7.642], 'max': [35, 57.05, 7.9]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| cloth-or-line | `{'min': [24, 54.55, 7.642], 'max': [35, 57.05, 7.9]}` |
| endpoint-ledger-1 | `{'min': [23.95, 54.449999999999996, 7.8500000000000005], 'max': [24.05, 57.15, 7.95]}` |
| endpoint-ledger-2 | `{'min': [34.95, 54.449999999999996, 7.8500000000000005], 'max': [35.05, 57.15, 7.95]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `TEXTILE_ARCADE` | 48000 | 14 | 16 | 10 |

Section origin (design coordinates): `{'x': 24, 'y': 48, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-5.0, -0.02, -0.20000000000000284], 'max': [15.400000000000006, 11.12, 18.400000000000006]}`.
Required bindings: `bz04_court_limestone_flags_01`, `bz04_levantine_rug_project_original`, `ph_bz04_dark_wood`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `TEXTILE_ARCADE-travel-reverse` | `TEXTILE_ARCADE` | (29.5, 63.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `TEXTILE_ARCADE-travel-forward` | `TEXTILE_ARCADE` | (29.5, 48.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `TEXTILE_ARCADE-north-T_N_CAP-s1-base` | `TEXTILE_ARCADE` | (34.5, 48.35, 1.7) | 180° / 1.83° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEXTILE_ARCADE-east-T_E_LOOM_T_E_GALLERY_T_E_CART-s1-base` | `TEXTILE_ARCADE` | (24.35, 56, 1.7) | 270° / 2.688° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEXTILE_ARCADE-east-T_E_LOOM_T_E_GALLERY_T_E_CART-s1-upper` | `TEXTILE_ARCADE` | (24.35, 56, 1.7) | 270° / 39.181° / 75° | upper facade, parapet and roof-step coverage |
| `TEXTILE_ARCADE-west-T_W_LOOM_T_W_DYER_T_W_FOLDS-s1-base` | `TEXTILE_ARCADE` | (34.65, 56, 1.7) | 90° / 2.688° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `TEXTILE_ARCADE-west-T_W_LOOM_T_W_DYER_T_W_FOLDS-s1-upper` | `TEXTILE_ARCADE` | (34.65, 56, 1.7) | 90° / 41.972° / 75° | upper facade, parapet and roof-step coverage |
| `TEXTILE_ARCADE-R3-craft-detail` | `TEXTILE_ARCADE` | (31.5, 60.57, 1.7) | 270° / 0° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: T_E_ARCH3 |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `TEXTILE_ARCADE` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `TEXTILE_ARCADE` cells: `ROOF_CELL_074`, `ROOF_CELL_075`, `ROOF_CELL_076`, `ROOF_CELL_077`, `ROOF_CELL_078`.
- `TEXTILE_ARCADE` bundles: `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE`.
- `TEXTILE_ARCADE` interfaces: `ROOF_INTERFACE_ROOF_STEP_027`, `ROOF_INTERFACE_ROOF_STEP_035`, `ROOF_INTERFACE_ROOF_STEP_036`, `ROOF_INTERFACE_ROOF_STEP_037`, `ROOF_INTERFACE_ROOF_STEP_038`, `ROOF_INTERFACE_ROOF_STEP_040`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |

## Skyline and legacy producer dispositions

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_B4_TEXTILE_CART_BPL16_TEXTILE_E_STOCK_GROUND_04` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_01` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_02` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_B6_LAUNDRY_TEXTILE_01_MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_01` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_B6_LAUNDRY_TEXTILE_02_MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_02` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_CANOPY_CANOPY_TEXTILE_01` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_COVER_COVER_TEXTILE_01` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_TEXTILE_EAST_GROUND_01_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_01_COMPLETE` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_EAST_GROUND_03_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_03_COMPLETE` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_EAST_GROUND_04_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_04_COMPLETE` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_LANTERN_LANTERN_TEXTILE_01` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_SCREEN_1_MOUNT_TEXTILE_SCREEN_1` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_SCREEN_3_MOUNT_TEXTILE_SCREEN_3` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_SCREEN_4_MOUNT_TEXTILE_SCREEN_4` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_1` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_1` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_WEST_GROUND_01_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_01_COMPLETE` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_WEST_GROUND_03_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_03_COMPLETE` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_TEXTILE_WEST_GROUND_04_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_04_COMPLETE` | `TEXTILE_ARCADE` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_01` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_02` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_03` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_04` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_MASSING` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_01` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_02` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_03` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_04` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_MASSING` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_01` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_03` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_04` | `TEXTILE_ARCADE` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_TEXTILE_ARCADE_north` | `TEXTILE_ARCADE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEXTILE_ARCADE_east` | `TEXTILE_ARCADE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEXTILE_ARCADE_south` | `TEXTILE_ARCADE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_TEXTILE_ARCADE_west` | `TEXTILE_ARCADE` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [TEXTILE_ARCADE dimensioned plan](drawings/textile_arcade-plan.svg), [TEXTILE_ARCADE four elevations](drawings/textile_arcade-elevations.svg), and [TEXTILE_ARCADE roof axonometric](drawings/textile_arcade-axon.svg)
- [Master plan](drawings/master-plan.svg)
