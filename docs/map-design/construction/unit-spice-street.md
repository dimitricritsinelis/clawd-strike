# BZ-04 / R7 spice street facade-centered upper openings · Spice Street

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `SPICE_STREET`

Spice merchant workfront and broad living-room shutter. Related plain windows and concentrated storage ventilation; no repeated colored-glass pair.

Primary focus: Three west retail workfronts. Broad east warehouse doors/hatches and high vents contrast with the west counters, preparation windows and one domestic termination..

## Architecture and craftsmanship

**Primary:** Spice merchant workfront and broad living-room shutter

**Supporting:** Related plain windows and concentrated storage ventilation; no repeated colored-glass pair

**Quiet fields and limits:** Keep two existing overhead cloth spans and their daylight gaps; no new street gate or loose floor stock.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `S_E_SOUTH` / `BLD_A_SPICE_EAST` | building | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Loading door and sack hatch form one useful central stack; consolidate paired loft vents into one high louver. |
| `S_E_MID` / `BLD_SPICE_EAST_BULK` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Bulk spice store - principal frontage |
| `S_E_NORTH` / `BLD_SPICE_EAST_NORTH` | building | `ph_bz04_beige_wall_002`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Narrow warehouse-house front uses two upper room stacks flanking the centered delivery door. |
| `S_W_SOUTH` / `BLD_A_SPICE_WEST` | building | `ph_bz04_painted_plaster_warm`; single-drip; CF-ENVELOPE / CF-JOINT | The single common loft vent centers at17.78 in the complete14..21.56 upper field, independently of the lower trade/stair arrangement. |
| `S_W_MID` / `BLD_SPICE_WEST_MID` | building | `ph_bz04_beige_wall_002`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Grain and apothecary - principal frontage |
| `S_W_NORTH` / `BLD_SPICE_WEST_NORTH` | building | `ph_bz04_red_plaster_weathered`; single-drip; CF-ENVELOPE / CF-JOINT | Red household return - principal frontage |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_S_W_SHOP_1` | spice display | 18 / CF-CERAMIC, CF-COUNTER, CF-SHELF, CF-SPICE | Build the named parts as spice display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_S_W_SHOP_2` | grain display | 6 / CF-BALANCE, CF-CLOTH, CF-COUNTER, CF-SACK, CF-SHELF | Build the named parts as grain display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_S_W_SHOP_3` | apothecary display | 24 / CF-BALANCE, CF-CERAMIC, CF-COUNTER, CF-MORTAR, CF-SHELF, CF-TIMBER | Build the named parts as apothecary display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_SPICE_STREET` | `A_NE_RETURN`, `A_NW_RETURN`, `F_SE`, `F_SW`, `S_E_MID`, `S_E_NORTH`, `S_E_SOUTH`, `S_W_MID`, `S_W_NORTH`, `S_W_SOUTH` | `A_NE_RETURN`, `A_NW_RETURN`, `F_SE`, `F_SW` |

**Required craft recipes:** CF-BALANCE, CF-CERAMIC, CF-CLOTH, CF-COUNTER, CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-MORTAR, CF-OPEN, CF-R4-PORTAL, CF-SACK, CF-SHADE, CF-SHELF, CF-SPICE, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `SPICE_STREET` · `north`

Quiet background: Exact immutable x=21..33 opening to Fountain Court..

Protected wall interval: **21..33 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 21..33 | **ZERO BUILD protected opening** | FOUNTAIN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `SPICE_STREET` · `east`

Quiet background: East is mostly closed stone and quiet high windows..

Protected wall interval: **14..32 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 14..32 | collider-backed solid | COLLIDER_WALL_105 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `S_E_SOUTH` | 14..20.1 | (33, 14, 37.2, 20.1) | Loading door and sack hatch form one useful central stack; consolidate paired loft vents into one high louver. | 10.2 | 4.2 | `ph_bz04_sandstone_blocks_05` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `S_E_MID` | 20.1..24.8 | (33, 20.1, 37.2, 24.8) | Bulk spice store - principal frontage | 7.2 | 4.2 | `ph_bz04_sandstone_blocks_06` | slab 7.2..7.38; parapet 7.83; cap 7.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `S_E_NORTH` | 24.8..32 | (33, 24.8, 37.2, 32) | Narrow warehouse-house front uses two upper room stacks flanking the centered delivery door. | 9.9 | 4.2 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `S_E_SOUTH-ENTRANCE` | `S_E_SOUTH` | door | 17.05 | 0 / 2.85 | 2.1 × 2.85 × 0.35 | 33 | `SD-05`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `S_E_SOUTH-L2-W1` | `S_E_SOUTH` | vent | 17.05 | 8.95 / 9.65 | 1.8 × 0.7 × 0.3 | 33 | `SD-07`; closed timber louver | dry bulk loft; high ventilation |
| `S_E_SOUTH-UPPER-SACK-HATCH` | `S_E_SOUTH` | window | 17.05 | 3.8 / 5.9 | 2 × 2.1 × 0.38 | 33 | `SD-07`; closed double paneled timber stock-room shutters | Broad closed stock-room airing shutters; goods reach this floor by the internal stair, with no exterior loading operation |
| `S_E_MID-ENTRANCE` | `S_E_MID` | door | 22.45 | 0 / 2.85 | 2 × 2.85 × 0.35 | 33 | `SD-05`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `S_E_MID-UPPER-SACK-HATCH` | `S_E_MID` | window | 22.45 | 3.9 / 6 | 2.1 × 2.1 × 0.38 | 33 | `SD-07`; closed double paneled timber stock-room shutters | Broad closed stock-room airing shutters; goods reach this floor by the internal stair, with no exterior loading operation |
| `S_E_NORTH-ENTRANCE` | `S_E_NORTH` | door | 28.4 | 0 / 2.8 | 1.9 × 2.8 × 0.35 | 33 | `SD-05`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `S_E_NORTH-L1-W1` | `S_E_NORTH` | window | 26.5 | 4.35 / 5.8 | 1.5 × 1.45 × 0.38 | 33 | `SD-07`; Closed 2-panel timber shutters | working stock rooms; daylight on its measured room axis |
| `S_E_NORTH-L1-W3` | `S_E_NORTH` | window | 30.3 | 4.35 / 5.8 | 1.5 × 1.45 × 0.38 | 33 | `SD-07`; Closed 2-panel timber shutters | working stock rooms; daylight on its measured room axis |
| `S_E_NORTH-L2-W1` | `S_E_NORTH` | window | 26.5 | 7.55 / 9.15 | 1.2 × 1.6 × 0.34 | 33 | `SD-07`; Closed 2-panel timber shutters | keeper household; daylight on its measured room axis |
| `S_E_NORTH-L2-W3` | `S_E_NORTH` | window | 30.3 | 7.55 / 9.15 | 1.2 × 1.6 × 0.34 | 33 | `SD-07`; Closed 2-panel timber shutters | keeper household; daylight on its measured room axis |

### `SPICE_STREET` · `south`

Quiet background: Exact immutable x=21..33 opening to Spawn A..

Protected wall interval: **21..33 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 21..33 | **ZERO BUILD protected opening** | SPAWN_A_COURTYARD |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `SPICE_STREET` · `west`

Quiet background: Trade-side activity is integrated inside shop recesses..

Protected wall interval: **14..32 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 14..32 | collider-backed solid | COLLIDER_WALL_101 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `S_W_SOUTH` | 14..21.56 | (16.2, 14, 21, 21.56) | The single common loft vent centers at17.78 in the complete14..21.56 upper field, independently of the lower trade/stair arrangement. | 9.9 | 4.8 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `S_W_MID` | 21.56..27.32 | (16.2, 21.56, 21, 27.32) | Grain and apothecary - principal frontage | 7.3 | 4.8 | `ph_bz04_beige_wall_002` | slab 7.3..7.48; parapet 7.93; cap 8.03; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `S_W_NORTH` | 27.32..32 | (16.2, 27.32, 21, 32) | Red household return - principal frontage | 9.9 | 4.8 | `ph_bz04_red_plaster_weathered` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `S_W_SHOP_1` | `S_W_SOUTH` | shop | 16.268 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 21 | `SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `S_W_SOUTH-STAFF-DOOR` | spice workfront |
| `S_W_SOUTH-STAFF-DOOR` | `S_W_SOUTH` | door | 20.048 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 21 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `S_W_SOUTH-L1-W1` | `S_W_SOUTH` | window | 16.268 | 4.25 / 5.85 | 1.9 × 1.6 × 0.48 | 21 | `SD-07`; Closed 2-panel timber shutters | Merchant reception room overlooking the spice counter |
| `S_W_SOUTH-L1-W2` | `S_W_SOUTH` | window | 20.048 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 21 | `SD-07`; closed double paneled timber shutters | family rooms; daylight on its measured room axis |
| `S_W_SOUTH-COMMON-LOFT-VENT` | `S_W_SOUTH` | vent | 17.78 | 8.7 / 9.4 | 1.8 × 0.7 × 0.3 | 21 | `SD-07`; closed timber louver | dry spice and household stores; high ventilation |
| `S_W_SHOP_2` | `S_W_MID` | shop | 23 | 0 / 2.75 | 2.48 × 2.75 × 1.9 | 21 | `SD-08`; closed backed shopfront with a continuous counter; back-door clear 0.8 m → `S_W_MID-REAR-STAFF-DOOR` | grain workfront |
| `S_W_SHOP_3` | `S_W_MID` | shop | 25.88 | 0 / 2.75 | 2.48 × 2.75 × 1.9 | 21 | `SD-08`; closed backed shopfront with a continuous counter; back-door clear 0.8 m → `S_W_MID-REAR-STAFF-DOOR` | apothecary workfront |
| `S_W_MID-L1-W1` | `S_W_MID` | window | 23 | 4.55 / 6 | 1.45 × 1.45 × 0.38 | 21 | `SD-07`; closed timber louver | daylit preparation and measured storage; daylight on its measured room axis |
| `S_W_MID-L1-W2` | `S_W_MID` | window | 25.88 | 4.55 / 6 | 1.45 × 1.45 × 0.38 | 21 | `SD-07`; closed timber louver | daylit preparation and measured storage; daylight on its measured room axis |
| `S_W_NORTH-ENTRANCE` | `S_W_NORTH` | door | 29.66 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 21 | `SD-05`; closed timber leaves; architecturalDetail: `{"profile":"carved-timber-portal","surroundWidthM":0.15,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#9c8060","frameMaterialId":"ph_bz04_weathered_brown_planks","materialProfile":"warmTimber","carving":{"pattern":"running-lozenge","modulePitchM":0.12,"moduleWidthM":0.085,"moduleHeightM":0.05,"incisionWidthM":0.006,"incisionDepthM":0.006,"placement":"One centered vertical chain on each outer timber jamb; stop 0.18 m above sill and 0.18 m below the arch spring/head. The head retains two continuous nested bands. No floral alternative."}}` | principal entrance and internal stair |
| `S_W_NORTH-L1-W1` | `S_W_NORTH` | window | 28.584 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 21 | `SD-07`; closed double paneled timber shutters | family sitting rooms; daylight on its measured room axis |
| `S_W_NORTH-L1-W2` | `S_W_NORTH` | window | 30.736 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 21 | `SD-07`; closed double paneled timber shutters | family sitting rooms; daylight on its measured room axis |
| `S_W_NORTH-L2-W1` | `S_W_NORTH` | window | 28.584 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 21 | `SD-07`; closed double paneled timber shutters | bedrooms; daylight on its measured room axis |
| `S_W_NORTH-L2-W2` | `S_W_NORTH` | window | 30.736 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 21 | `SD-07`; closed double paneled timber shutters | bedrooms; daylight on its measured room axis |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `SPICE_STREET` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'SPICE_STREET-CLEAR', 'x': 24.0, 'y': 14, 'w': 6, 'h': 18, 'heightM': 2.2, 'floorSource': 'SPICE_STREET'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `SPICE_STREET` | `G_S_W_SHOP_1` / `AG-SPICE` | west/S_W_SOUTH/S_W_SHOP_1 | (19.1, 15.008, 0.04) → (21.28, 17.528, 2.65) | Build the named parts as spice display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPICE_STREET` | `G_S_W_SHOP_2` / `AG-GRAIN` | west/S_W_MID/S_W_SHOP_2 | (19.1, 21.8, 0.04) → (21.28, 24.2, 2.65) | Build the named parts as grain display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPICE_STREET` | `G_S_W_SHOP_3` / `AG-APOTHECARY` | west/S_W_MID/S_W_SHOP_3 | (19.1, 24.68, 0.04) → (21.28, 27.08, 2.65) | Build the named parts as apothecary display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPICE_STREET` | `SPICE_STREET-CLEAR` | **CLEAR ROUTE** | (24, 14) → (30, 32) | Protected empty region | Do not place geometry |

### Fixed composition `G_S_W_SHOP_1`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.25, -0.55, 0] / [1.25, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `tray-1-1` | stocked-spice-tray / `CF-SPICE` | [-0.64, -0.19, 0.9] / [-0.4, 0.09000000000000001, 0.98] | `bz04_ceramic_project_original`; albedo #9c5139 | countertop |
| `tray-1-2` | stocked-spice-tray / `CF-SPICE` | [-0.12, -0.19, 0.9] / [0.12, 0.09000000000000001, 0.98] | `bz04_ceramic_project_original`; albedo #a47e3f | countertop |
| `tray-1-3` | stocked-spice-tray / `CF-SPICE` | [0.4, -0.19, 0.9] / [0.64, 0.09000000000000001, 0.98] | `bz04_ceramic_project_original`; albedo #657254 | countertop |
| `tray-2-1` | stocked-spice-tray / `CF-SPICE` | [-0.64, -0.54, 0.9] / [-0.4, -0.26, 0.98] | `bz04_ceramic_project_original`; albedo #9c5139 | countertop |
| `tray-2-2` | stocked-spice-tray / `CF-SPICE` | [-0.12, -0.54, 0.9] / [0.12, -0.26, 0.98] | `bz04_ceramic_project_original`; albedo #a47e3f | countertop |
| `tray-2-3` | stocked-spice-tray / `CF-SPICE` | [0.4, -0.54, 0.9] / [0.64, -0.26, 0.98] | `bz04_ceramic_project_original`; albedo #657254 | countertop |
| `jar-shelf-1` | plank-shelf / `CF-SHELF` | [-0.85, -1.9, 1.14] / [0.85, -1.68, 1.35] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `jar-1-1` | lidded-ceramic-jar / `CF-CERAMIC` | [-0.69, -1.8800000000000001, 1.35] / [-0.51, -1.7, 1.53] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-1 |
| `jar-1-2` | lidded-ceramic-jar / `CF-CERAMIC` | [-0.29000000000000004, -1.8800000000000001, 1.35] / [-0.11000000000000001, -1.7, 1.59] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-1 |
| `jar-1-3` | lidded-ceramic-jar / `CF-CERAMIC` | [0.11000000000000001, -1.8800000000000001, 1.35] / [0.29000000000000004, -1.7, 1.56] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-1 |
| `jar-1-4` | lidded-ceramic-jar / `CF-CERAMIC` | [0.51, -1.8800000000000001, 1.35] / [0.69, -1.7, 1.62] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-1 |
| `jar-shelf-2` | plank-shelf / `CF-SHELF` | [-0.85, -1.9, 1.64] / [0.85, -1.68, 1.85] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `jar-2-1` | lidded-ceramic-jar / `CF-CERAMIC` | [-0.69, -1.8800000000000001, 1.85] / [-0.51, -1.7, 2.0300000000000002] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-2 |
| `jar-2-2` | lidded-ceramic-jar / `CF-CERAMIC` | [-0.29000000000000004, -1.8800000000000001, 1.85] / [-0.11000000000000001, -1.7, 2.09] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-2 |
| `jar-2-3` | lidded-ceramic-jar / `CF-CERAMIC` | [0.11000000000000001, -1.8800000000000001, 1.85] / [0.29000000000000004, -1.7, 2.06] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-2 |
| `jar-2-4` | lidded-ceramic-jar / `CF-CERAMIC` | [0.51, -1.8800000000000001, 1.85] / [0.69, -1.7, 2.12] | `bz04_ceramic_project_original`; albedo #d6c9b2 | jar-shelf-2 |
| `scoop` | carved-wood-scoop / `CF-SPICE` | [-0.59, -0.1, 0.98] / [-0.4, 0.07, 1.03] | `ph_bz04_worn_planks` | front left spice tray contents |

### Fixed composition `G_S_W_SHOP_2`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.19, -0.55, 0] / [1.19, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `balance` | supported-brass-balance / `CF-BALANCE` | [-0.57, -0.38, 0.9] / [-0.13, -0.06, 1.55] | `bz04_brass_project_original` | countertop |
| `grain-sack-1` | open-cloth-sack / `CF-SACK` | [0.07500000000000001, -0.5, 0.9] / [0.425, -0.15, 1.45] | `ph_bz04_fine_linen` | countertop |
| `grain-sack-2` | open-cloth-sack / `CF-SACK` | [0.47500000000000003, -0.5, 0.9] / [0.825, -0.15, 1.45] | `ph_bz04_fine_linen` | countertop |
| `sack-shelf` | plank-shelf / `CF-SHELF` | [-1.15, -1.9, 1.34] / [0.15, -1.68, 1.55] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `folded-sack` | folded-cloth / `CF-CLOTH` | [-0.725, -1.87, 1.55] / [-0.275, -1.7, 1.6] | `ph_bz04_fine_linen` | sack-shelf |

### Fixed composition `G_S_W_SHOP_3`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.19, -0.55, 0] / [1.19, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `cabinet-left` | timber-member / `CF-TIMBER` | [-1.19, -1.9, 0] / [-1.14, -1.6, 2.05] | `ph_bz04_worn_planks` | recess deck and backing |
| `cabinet-right` | timber-member / `CF-TIMBER` | [0.16, -1.9, 0] / [0.21, -1.6, 2.05] | `ph_bz04_worn_planks` | recess deck and backing |
| `cabinet-top` | plank-board / `CF-TIMBER` | [-1.19, -1.9, 2.0] / [0.21, -1.6, 2.05] | `ph_bz04_worn_planks` | cabinet sides |
| `cabinet-shelf-1` | plank-shelf / `CF-SHELF` | [-1.14, -1.9, 0.59] / [0.16, -1.68, 0.8] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `herb-bottle-1-1` | sealed-ceramic-bottle / `CF-CERAMIC` | [-1.015, -1.825, 0.8] / [-0.925, -1.735, 0.98] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-1 |
| `herb-bottle-1-2` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.795, -1.845, 0.8] / [-0.665, -1.715, 1.05] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-1 |
| `herb-bottle-1-3` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.535, -1.825, 0.8] / [-0.445, -1.735, 0.98] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-1 |
| `herb-bottle-1-4` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.315, -1.845, 0.8] / [-0.185, -1.715, 0.98] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-1 |
| `herb-bottle-1-5` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.055, -1.825, 0.8] / [0.035, -1.735, 1.05] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-1 |
| `cabinet-shelf-2` | plank-shelf / `CF-SHELF` | [-1.14, -1.9, 1.04] / [0.16, -1.68, 1.25] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `herb-bottle-2-1` | sealed-ceramic-bottle / `CF-CERAMIC` | [-1.015, -1.825, 1.25] / [-0.925, -1.735, 1.43] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-2 |
| `herb-bottle-2-2` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.795, -1.845, 1.25] / [-0.665, -1.715, 1.5] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-2 |
| `herb-bottle-2-3` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.535, -1.825, 1.25] / [-0.445, -1.735, 1.43] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-2 |
| `herb-bottle-2-4` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.315, -1.845, 1.25] / [-0.185, -1.715, 1.43] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-2 |
| `herb-bottle-2-5` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.055, -1.825, 1.25] / [0.035, -1.735, 1.5] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-2 |
| `cabinet-shelf-3` | plank-shelf / `CF-SHELF` | [-1.14, -1.9, 1.44] / [0.16, -1.68, 1.65] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `herb-bottle-3-1` | sealed-ceramic-bottle / `CF-CERAMIC` | [-1.015, -1.825, 1.65] / [-0.925, -1.735, 1.8299999999999998] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-3 |
| `herb-bottle-3-2` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.795, -1.845, 1.65] / [-0.665, -1.715, 1.9] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-3 |
| `herb-bottle-3-3` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.535, -1.825, 1.65] / [-0.445, -1.735, 1.8299999999999998] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-3 |
| `herb-bottle-3-4` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.315, -1.845, 1.65] / [-0.185, -1.715, 1.8299999999999998] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-3 |
| `herb-bottle-3-5` | sealed-ceramic-bottle / `CF-CERAMIC` | [-0.055, -1.825, 1.65] / [0.035, -1.735, 1.9] | `bz04_ceramic_project_original`; albedo #b6bca8 | cabinet-shelf-3 |
| `counter-scale` | supported-brass-balance / `CF-BALANCE` | [-0.65, -0.4, 0.9] / [-0.15, -0.04, 1.35] | `bz04_brass_project_original` | countertop |
| `mortar` | ceramic-mortar-with-seated-pestle / `CF-MORTAR` | [0.34, -0.33, 0.9] / [0.56, -0.11, 1.06] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `SPICE_STREET` | `SHADE_S_W_SHOP_1` | `SD-12` | west/S_W_SOUTH/S_W_SHOP_1 | (20.92, 14.818, 2.54) → (22.075, 17.718, 3.145) | Supported working shade for sealed spice counter recess |
| | `SHADE_S_W_SHOP_1` dimensions/supports | | | {'interval': [14.818, 17.718], 'ledgerZ': 3.08, 'armAxesM': [14.918, 17.618], 'projectionM': 1.05, 'dropM': 0.22, 'sagM': 0.1} | Exact instance values override the standard defaults. |
| `SPICE_STREET` | `SHADE_S_W_SHOP_2` | `SD-12` | west/S_W_MID/S_W_SHOP_2 | (20.92, 21.61, 2.54) → (22.125, 24.39, 3.145) | Supported working shade for sealed grain recess |
| | `SHADE_S_W_SHOP_2` dimensions/supports | | | {'interval': [21.61, 24.39], 'ledgerZ': 3.08, 'armAxesM': [21.71, 24.29], 'projectionM': 1.1, 'dropM': 0.22, 'sagM': 0.08} | Exact instance values override the standard defaults. |
| `SPICE_STREET` | `SHADE_S_W_SHOP_3` | `SD-12` | west/S_W_MID/S_W_SHOP_3 | (20.92, 24.49, 2.54) → (21.975, 27.27, 3.145) | Supported working shade for sealed apothecary recess |
| | `SHADE_S_W_SHOP_3` dimensions/supports | | | {'interval': [24.49, 27.27], 'ledgerZ': 3.08, 'armAxesM': [24.59, 27.169999999999998], 'projectionM': 0.95, 'dropM': 0.22, 'sagM': 0.12} | Exact instance values override the standard defaults. |
| `SPICE_STREET` | `CANOPY_SPICE_S` | `SD-13` | S_W_SOUTH, S_E_SOUTH | (20.95, 17.4, 6.292) → (33.05, 20, 6.6) | Ledger placed in a measured structural band with0.21m clearance to the full adjacent window trim. |
| | `CANOPY_SPICE_S` dimensions/supports | | | {'sagM': 0.25, 'endA': [21, 18.7, 6.55], 'endB': [33, 18.7, 6.55], 'widthM': 2.4, 'ledgerLengthM': 2.6} | Exact instance values override the standard defaults. |
| `SPICE_STREET` | `CANOPY_SPICE_N` | `SD-13` | S_W_NORTH, S_E_NORTH | (20.95, 27.7, 6.442) → (33.05, 30.3, 6.75) | Shade ledgers occupy the uninterrupted structural band between window rows on both receiving buildings. The different heights follow those storey datums. |
| | `CANOPY_SPICE_N` dimensions/supports | | | {'sagM': 0.25, 'endA': [21, 29.0, 6.7], 'endB': [33, 29.0, 6.7], 'widthM': 2.4, 'ledgerLengthM': 2.6} | Exact instance values override the standard defaults. |

**SHADE_S_W_SHOP_1 membrane-only bounds:** `{'min': [21, 14.818, 2.752], 'max': [22.05, 17.718, 3.08]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [20.92, 14.818, 3.04], 'max': [21.04, 17.718, 3.12]}` |
| arm-knee-1 | `{'min': [20.96, 14.883, 2.54], 'max': [22.075, 14.953, 3.145]}` |
| arm-knee-2 | `{'min': [20.96, 17.583, 2.54], 'max': [22.075, 17.653, 3.145]}` |
| cloth-and-hem | `{'min': [21, 14.818, 2.727], 'max': [22.05, 17.718, 3.08]}` |


**SHADE_S_W_SHOP_2 membrane-only bounds:** `{'min': [21, 21.61, 2.772], 'max': [22.1, 24.39, 3.08]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [20.92, 21.61, 3.04], 'max': [21.04, 24.39, 3.12]}` |
| arm-knee-1 | `{'min': [20.96, 21.675, 2.54], 'max': [22.125, 21.745, 3.145]}` |
| arm-knee-2 | `{'min': [20.96, 24.255, 2.54], 'max': [22.125, 24.325, 3.145]}` |
| cloth-and-hem | `{'min': [21, 21.61, 2.747], 'max': [22.1, 24.39, 3.08]}` |


**SHADE_S_W_SHOP_3 membrane-only bounds:** `{'min': [21, 24.49, 2.732], 'max': [21.95, 27.27, 3.08]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [20.92, 24.49, 3.04], 'max': [21.04, 27.27, 3.12]}` |
| arm-knee-1 | `{'min': [20.96, 24.555, 2.54], 'max': [21.975, 24.625, 3.145]}` |
| arm-knee-2 | `{'min': [20.96, 27.134999999999998, 2.54], 'max': [21.975, 27.205, 3.145]}` |
| cloth-and-hem | `{'min': [21, 24.49, 2.7070000000000003], 'max': [21.95, 27.27, 3.08]}` |


**CANOPY_SPICE_S membrane-only bounds:** `{'min': [21, 17.5, 6.292], 'max': [33, 19.9, 6.55]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| cloth-or-line | `{'min': [21, 17.5, 6.292], 'max': [33, 19.9, 6.55]}` |
| endpoint-ledger-1 | `{'min': [20.95, 17.4, 6.5], 'max': [21.05, 20.0, 6.6]}` |
| endpoint-ledger-2 | `{'min': [32.95, 17.4, 6.5], 'max': [33.05, 20.0, 6.6]}` |


**CANOPY_SPICE_N membrane-only bounds:** `{'min': [21, 27.8, 6.442], 'max': [33, 30.2, 6.7]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| cloth-or-line | `{'min': [21, 27.8, 6.442], 'max': [33, 30.2, 6.7]}` |
| endpoint-ledger-1 | `{'min': [20.95, 27.7, 6.65], 'max': [21.05, 30.3, 6.75]}` |
| endpoint-ledger-2 | `{'min': [32.95, 27.7, 6.65], 'max': [33.05, 30.3, 6.75]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `SPICE_STREET` | 48000 | 14 | 16 | 9 |

Section origin (design coordinates): `{'x': 21, 'y': 14, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-5.0, -0.02, -0.1999999999999993], 'max': [16.400000000000006, 10.219999999999999, 18.200000000000003]}`.
Required bindings: `bz04_brass_project_original`, `bz04_ceramic_project_original`, `bz04_court_limestone_flags_01`, `ph_bz04_beige_wall_002`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_red_plaster_weathered`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `SPICE_STREET-travel-reverse` | `SPICE_STREET` | (27, 31.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `SPICE_STREET-travel-forward` | `SPICE_STREET` | (27, 14.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `SPICE_STREET-east-S_E_SOUTH_S_E_MID_S_E_NORTH-s1-base` | `SPICE_STREET` | (21.35, 23, 1.7) | 270° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPICE_STREET-west-S_W_SOUTH_S_W_MID_S_W_NORTH-s1-base` | `SPICE_STREET` | (32.65, 23, 1.7) | 90° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPICE_STREET-R3-craft-detail` | `SPICE_STREET` | (24.5, 25.88, 1.7) | 90° / -1.637° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: S_W_SHOP_3 |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `SPICE_STREET` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `SPICE_STREET` cells: `ROOF_CELL_036`, `ROOF_CELL_037`, `ROOF_CELL_038`, `ROOF_CELL_068`, `ROOF_CELL_069`, `ROOF_CELL_072`, `ROOF_CELL_073`.
- `SPICE_STREET` bundles: `ROOF_BUNDLE_UNIT_SPICE_STREET`.
- `SPICE_STREET` interfaces: `ROOF_INTERFACE_ROOF_SEAM_010`, `ROOF_INTERFACE_ROOF_SEAM_011`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_red_plaster_weathered` | `ph_red_plaster_weathered` | <span style="color:#b77c62">■</span> `#b77c62` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_B4_SPICE_CART_B4_SPICE_E_CART_GROUND_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B4_SPICE_COVER_RUG_COVER_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_02` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_03` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_BARREL_COVER_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_SPICE_BASKET_COVER_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_SPICE_CANOPIES_CANOPY_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_CANOPIES_CANOPY_SPICE_02` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_COUNTER_1_SPICE_W_SHOP_1` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_COUNTER_3_MOUNT_SPICE_COUNTER_3` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_COUNTER_4_MOUNT_SPICE_COUNTER_4` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_COVER_CORE_COVER_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_SPICE_E_STOCK_BASKET_MID_SPICE_E_WALLBASE_STOCK_02` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_BASKET_NORTH_SPICE_E_WALLBASE_STOCK_04` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_BINS_SPICE_E_WALLBASE_STOCK_02` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_BRASS_POT_SPICE_E_WALLBASE_STOCK_04` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_CRATE_BASE_SPICE_E_WALLBASE_STOCK_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_CRATE_MID_SPICE_E_WALLBASE_STOCK_03` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_CRATE_STACK_SPICE_E_WALLBASE_STOCK_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_POTTERY_NORTH_SPICE_E_WALLBASE_STOCK_04` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_POTTERY_SOUTH_SPICE_E_WALLBASE_STOCK_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_E_STOCK_SACK_SPICE_E_WALLBASE_STOCK_03` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_GATE_LMK_SPICE_GATE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_LANTERN_LANTERN_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_POTTERY_COVER_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_SPICE_ROOF_MIDDLE_MOUNT_SPICE_ROOF_MIDDLE` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_ROOF_NORTH_MOUNT_SPICE_ROOF_NORTH` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_ROOF_SOUTH_MOUNT_SPICE_ROOF_SOUTH` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_SIGNS_SPICE_W_SIGN_1` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_SIGNS_SPICE_W_SIGN_3` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_UPPER_ROOM_MOUNT_SPICE_UPPER_ROOM` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_WINDOW_1_MOUNT_SPICE_WINDOW_1` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_WINDOW_2_MOUNT_SPICE_WINDOW_2` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_WINDOW_3_MOUNT_SPICE_WINDOW_3` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_WINDOW_4_MOUNT_SPICE_WINDOW_4` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPICE_WINDOW_5_MOUNT_SPICE_WINDOW_5` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_01_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_02_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_B6_LAUNDRY_SPICE_03_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_CANOPY_SPICE_01_MOUNT_SUPPORT_CANOPY_SPICE_01` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SUPPORT_CANOPY_SPICE_02_MOUNT_SUPPORT_CANOPY_SPICE_02` | `SPICE_STREET` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_01` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_02` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_03` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_04` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_05` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_EAST_MASSING` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_01` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_02` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_03` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_04` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_05` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_01` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_02` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_03` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_04` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_05` | `SPICE_STREET` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_SPICE_STREET_north` | `SPICE_STREET` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPICE_STREET_east` | `SPICE_STREET` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPICE_STREET_south` | `SPICE_STREET` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPICE_STREET_west` | `SPICE_STREET` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [SPICE_STREET dimensioned plan](drawings/spice_street-plan.svg), [SPICE_STREET four elevations](drawings/spice_street-elevations.svg), and [SPICE_STREET roof axonometric](drawings/spice_street-axon.svg)
- [Master plan](drawings/master-plan.svg)
