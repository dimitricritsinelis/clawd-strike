# BZ-04 / R7 spawn b courtyard facade-centered upper openings · Spawn B Courtyard

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `SPAWN_B_COURTYARD`

Retained merchant balcony and its related upper timber-and-glass pair. Segmental work/guest windows and crafted entrance surrounds. Preserve the fixed routes and use quieter fields to frame this composition.

Primary focus: Retain the B-04 merchant address and B-05 finish. The plain-slatted tea gallery remains secondary; proper opening craft and one rail rug complete the established composition..

## R7 building character and exact details

**R7 finish update:** [Exact finish recipes, material bindings and acceptance](unit-spawn-b-courtyard-finish.md). The B-04 composition below remains the architectural basis.

### Architectural questions and decisions

- **What stays from B?** Retain the complete building layout, focal merchant balcony, tea gallery, trade groups and gameplay. Small coordinated stack shifts provide sound corner piers.
- **Where does the new craft belong?** The matching upper merchant timber-and-glass pair and carved entrance frame; segmental work/guest windows support that address. Plain background shutters remain useful.
- **How much detail is enough?** Keep the upper central wall quiet and the existing single rail rug. No extra balcony, plant group or pasted ornament is added to B.

This is the B-only proposal. The existing gameplay envelope, routes, floor and cover remain fixed. Profiles below replace the old repeated openings; they are not overlays.

| Building | Composition | Reason |
|---|---|---|
| `B_N_POTTER` — Potter workshop — a working frontage | Retain three ground bays and family-room alignment. Loft serves one drying room across work/shop bays, not three tiny windows. | The workroom, shop and stair retain their three structural bays. Drying loft vents are high and small; no arch is added to announce each room. |
| `B_N_HOUSE` — Merchant house — the courtyard address | Retain existing restrained parent-building family and room datums. No new decorative opening family on quiet returns. | Keep the central upper wall clear and the existing B star balustrade; no additional balcony or ground props. |
| `B_N_TEXTILE` — Textile store — broad working shutters | One broad loom-room screen remains over shop. Loft gets one matching broad ventilator; leave the staff stair one useful lower light rather than a full repeated mini-stack. | The large working room explains a wider opening. Simple shutters and a plain timber hood support the merchant house composition. |
| `B_E_STORE` — Receiving store — quiet stone mass | Single loading stack is clear; replace two disconnected loft vents with one aligned louver. | The warehouse has a different use and opening scale; its substantial quiet wall needs no domestic ornament. |
| `B_E_PACKER` — Packer — modest later addition | Packers house uses two plain window stacks matching door and counter; widening the pin-sized stair windows makes a coherent frame family. | Bay width and servicing explain the asymmetry. This supporting building shares the courtyard timber vocabulary. |
| `B_S_WEST` — Gateway abutment — solid support | Retain existing restrained parent-building family and room datums. No new decorative opening family on quiet returns. | Finish the base, exposed return and coping once. No invented doorway, upper room, house windows or decorative quota. |
| `B_S_EAST` — Keeper return — quiet gate support | Gatekeeper has plain paired domestic windows and one centered loft louver. Gatekeeper court return shares matching domestic sill/head and one loft vent, preserving the gateway mass. | Keep its B-facing return restrained and coordinate the same floors around the corner. |
| `B_W_HOUSE` — Guest house — restrained domestic edge | Retain existing restrained parent-building family and room datums. No new decorative opening family on quiet returns. | Keep its existing floor, axes, courtyard layout and supporting role. |
| `B_W_TEA` — Tea house — the shaded gallery | Gallery is the useful feature. Loft ventilation belongs to one center, not two unrelated louvers. | The upper sitting room joins the two lower trade bays. This is the secondary spatial focus, subordinate to the merchant address. |

### Opening profiles and receivers

| Opening | Profile / lights | Depth / front projection | Detail |
|---|---|---|---|
| `B_N_POTTER_WORK` | rectangular; 1 light(s); mullion 0 m | 0.38 / 0 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_POTTER_SHOP` | rectangular; 1 light(s); mullion 0 m | 1.9 / 0 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_POTTER_DOOR` | rectangular; 1 light(s); mullion 0 m | 0.22 / 0 m | B-OPEN; finish `workshop`; 2 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_POTTER-L1-B1` | segmental; 1 light(s); mullion 0 m | 0.38 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_POTTER-L1-B2` | segmental; 1 light(s); mullion 0 m | 0.38 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_POTTER-L1-B3` | rectangular; 1 light(s); mullion 0 m | 0.38 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_POTTER-COMMON-LOFT-VENT` | rectangular; 1 light(s); mullion 0 m | 0.32 / 0.08 m | B-OPEN; finish `workshop`; 0 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE_DOOR` | pointed; 1 light(s); mullion 0 m | 0.42 / 0 m | B-OPEN; finish `stone`; 2 leaf/leaves; surround `ph_bz04_weathered_brown_planks`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-ground-0` | rectangular; 1 light(s); mullion 0 m | 0.4 / 0 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-ground-2` | rectangular; 1 light(s); mullion 0 m | 0.4 / 0 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-L1-B1` | segmental; 1 light(s); mullion 0 m | 0.42 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-L1-B2` | rectangular; 1 light(s); mullion 0 m | 0.45 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-L1-B3` | segmental; 1 light(s); mullion 0 m | 0.42 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-L2-B1` | paired-pointed; 2 light(s); mullion 0.1 m | 0.38 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_HOUSE-L2-B3` | paired-pointed; 2 light(s); mullion 0.1 m | 0.38 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_red_plaster_weathered`; reveal `ph_bz04_red_plaster_weathered`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_TEXTILE_SHOP` | rectangular; 1 light(s); mullion 0 m | 1.9 / 0 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_TEXTILE_DOOR` | rectangular; 1 light(s); mullion 0 m | 0.22 / 0 m | B-OPEN; finish `workshop`; 2 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_TEXTILE-L1-B3` | rectangular; 1 light(s); mullion 0 m | 0.35 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_TEXTILE-L2-B1` | rectangular; 1 light(s); mullion 0 m | 0.35 / 0.08 m | B-OPEN; finish `workshop`; 0 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_N_TEXTILE_UPPER_SCREEN` | rectangular; 1 light(s); mullion 0 m | 0.5 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_STORE-DOOR` | segmental; 1 light(s); mullion 0 m | 0.4 / 0.08 m | B-OPEN; finish `stone`; 2 leaf/leaves; surround `ph_bz04_sandstone_blocks_06`; reveal `ph_bz04_sandstone_blocks_06`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_STORE-L2-B1` | rectangular; 1 light(s); mullion 0 m | 0.42 / 0.08 m | B-OPEN; finish `stone`; 0 leaf/leaves; surround `ph_bz04_sandstone_blocks_06`; reveal `ph_bz04_sandstone_blocks_06`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_STORE_LOADING` | rectangular; 1 light(s); mullion 0 m | 0.38 / 0.08 m | B-OPEN; finish `stone`; 2 leaf/leaves; surround `ph_bz04_sandstone_blocks_06`; reveal `ph_bz04_sandstone_blocks_06`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_PACK_DOOR` | rectangular; 1 light(s); mullion 0 m | 0.22 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_plastered_wall`; reveal `ph_bz04_plastered_wall`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_PACK_SHOP` | rectangular; 1 light(s); mullion 0 m | 1.9 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_plastered_wall`; reveal `ph_bz04_plastered_wall`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_PACKER-L1-B1` | rectangular; 1 light(s); mullion 0 m | 0.28 / 0.08 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_plastered_wall`; reveal `ph_bz04_plastered_wall`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_PACKER-L1-B2` | rectangular; 1 light(s); mullion 0 m | 0.32 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_plastered_wall`; reveal `ph_bz04_plastered_wall`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_PACKER-L2-B1` | rectangular; 1 light(s); mullion 0 m | 0.28 / 0.08 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_plastered_wall`; reveal `ph_bz04_plastered_wall`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_E_PACKER-L2-B2` | rectangular; 1 light(s); mullion 0 m | 0.32 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_plastered_wall`; reveal `ph_bz04_plastered_wall`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_S_EAST-L1-W1` | rectangular; 2 light(s); mullion 0 m | 0.38 / 0.08 m | B-OPEN; finish `stone`; 2 leaf/leaves; surround `ph_bz04_sandstone_blocks_06`; reveal `ph_bz04_sandstone_blocks_06`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_S_EAST-L1-W2` | rectangular; 2 light(s); mullion 0 m | 0.38 / 0.08 m | B-OPEN; finish `stone`; 2 leaf/leaves; surround `ph_bz04_sandstone_blocks_06`; reveal `ph_bz04_sandstone_blocks_06`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_S_EAST-RETURN-LOFT-VENT` | rectangular; 1 light(s); mullion 0 m | 0.42 / 0.08 m | B-OPEN; finish `stone`; 1 leaf/leaves; surround `ph_bz04_sandstone_blocks_06`; reveal `ph_bz04_sandstone_blocks_06`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_W_HOUSE-DOOR` | rectangular; 1 light(s); mullion 0 m | 0.22 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_HOUSE-ground-0` | rectangular; 1 light(s); mullion 0 m | 0.3 / 0.08 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_HOUSE-ground-1` | rectangular; 1 light(s); mullion 0 m | 0.3 / 0.08 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_HOUSE-L1-B1` | segmental; 1 light(s); mullion 0 m | 0.4 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_HOUSE-L1-B2` | segmental; 1 light(s); mullion 0 m | 0.4 / 0.08 m | B-OPEN; finish `domestic`; 2 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_HOUSE-L2-B1` | rectangular; 1 light(s); mullion 0 m | 0.32 / 0.08 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_HOUSE-L2-B2` | rectangular; 1 light(s); mullion 0 m | 0.32 / 0.08 m | B-OPEN; finish `domestic`; 1 leaf/leaves; surround `ph_bz04_beige_wall_002`; reveal `ph_bz04_beige_wall_002`; sill `ph_bz04_stone_trim_sandstone`; paint #5d9c8a |
| `B_W_SEAT` | rectangular; 1 light(s); mullion 0 m | 0.5 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_W_TEA_SHOP` | rectangular; 1 light(s); mullion 0 m | 1.9 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_W_TEA-L2-B1` | rectangular; 1 light(s); mullion 0 m | 0.32 / 0.08 m | B-OPEN; finish `workshop`; 0 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |
| `B_W_TEA_GALLERY` | paired-pointed; 3 light(s); mullion 0.22 m | 0.85 / 0.08 m | B-OPEN; finish `workshop`; 1 leaf/leaves; surround `ph_bz04_painted_plaster_warm`; reveal `ph_bz04_painted_plaster_warm`; sill `ph_bz04_stone_trim_sandstone`; paint #9c8060 |

**detailId:** B-OPEN

**lowNorthTrim:** All north opening jambs, heads, sills, thresholds and hardware at z<=2.2 finish at out<=0. Carve the surround/reveal into the shell; retain opaque backing. Do not shorten SPAWN_B_COURTYARD-CLEAR or transfer a waiver.

**profiles:** B pointed profiles: spring=sill+0.74H; crown=sill+H; each quadratic half has its control at along +/-0.22W and sill+0.92H. Segmental profiles retain spring=sill+0.82H with the midpoint quadratic control at 2*head-spring. Paired-pointed uses lightCount equal pointed lights separated by mullionM solid piers. Profiles govern actual shell holes, reveal barrels, frames and closures, not decoration over rectangular holes.

**screenPattern:**

```json
{
  "id": "B-STAR",
  "pitchM": 0.4,
  "barWidthM": 0.022,
  "barDepthM": 0.025,
  "construction": "Repeat an original eight-point star centered in each 0.40 m square cell: 16 vertices at angle k*pi/8, with radius alternating 0.16 and 0.08 m. Four straight connections join the cardinal star tips to the cell boundary. Use a planar union of 0.022 m-wide strips, extrude 0.025 m, close the exposed cut edges and clip the finished screen to its opening. Do not stack overlapping full-length bars or retain hidden internal faces.",
  "backing": "Opaque dark plaster at the scheduled recess back. Screens are 0.04 m ahead of the back; only the solid frame and broad surround cast shadows.",
  "scope": "B-STAR is used only on B-HOUSE-BALCONY balustrade. All facade-window screens are replaced by scheduled ordinary shutters or vertical slats. Do not spread the star motif to other buildings."
}
```

**joinery:** Frame 0.08 m; paired mullions use instance mullionM; jamb/head surround 0.10 m; sill height 0.06 m. Curved surrounds are 0.10 m normal offsets, not scaled copies. 12 segments per arch half. Close every exposed reveal and back.

**materials:** Existing scheduled closureMaterialId and trimMaterialId only. Round masonry/light openings use the original plaster/stone; do not introduce stained glass or new texture families.

**panelJoinery:** B_N_TEXTILE_UPPER_SCREEN has three equal louver panels separated by two 0.08 m vertical mullions. Gallery slats use the opening slatPitchM/slatWidthM; their 0.025 m depth is behind the 0.08 m frame. Both are clipped to their real aperture profiles. Louver dimensions otherwise follow SD-07.

### Architectural features

| ID / receiver | World bounds min / max | Detail |
|---|---|---|
| `B-HOUSE-BALCONY` / `B_N_HOUSE` | {'min': [26.299999999999997, 91.22, 3.12], 'max': [29.0, 92.18, 6.2]} | B-BALCONY |
| `B-TEXTILE-HOOD` / `B_N_TEXTILE` | {'min': [31.525, 91.52, 5.98], 'max': [35.475, 92.12, 6.2]} | B-HOOD |
| `B-STORE-HOIST` / `B_E_STORE` | {'min': [38.35, 83.41, 5.94], 'max': [39.45, 83.59, 6.24]} | B-HOIST |
| `B-TEA-GALLERY-SILL` / `B_W_TEA` | {'min': [16.1, 86.63, 3.45], 'max': [17.12, 91.57, 3.65]} | B-GALLERY |
| `B-WEST-ABUTMENT-FIELD` / `B_S_WEST` | {'min': [17.474999999999998, 77.9, 1.0], 'max': [19.825, 77.96, 8.7]} | B-FIELD |
| `B-HOUSE-RAIL-RUG` / `B_N_HOUSE` | {'min': [26.59, 91.2, 3.7], 'max': [27.35, 91.36, 4.47]} | B-FINISH-TEXTILE |

**B-BALCONY.** A 2.70 m-wide nonplayable timber balcony at x=27.65. Deck top z=3.40; deck thickness 0.14; front out=0.75. Two 0.14-square joists at local along +/-0.90 run from out=-0.18 to +0.75; knee braces terminate at z=3.12 and touch the wall and joists. Front/side balustrade z=3.40..4.45 with 0.08-square posts at local along -1.27,0,+1.27, rails 0.07 square, B-STAR infill. Four outer corner posts continue to a timber canopy underside z=6.05, top z=6.20; sides close at the wall. Canopy projection 0.78. Do not fill the balcony as a solid box; the rear opening is the scheduled closed upper door. No new collider, access route or playable floor. Balustrade infill is open lattice with no plaster backing. Only the four corner posts continue to the canopy; the middle front post ends at the rail top.

**B-GALLERY.** B_W_TEA_GALLERY is one 4.70 m-wide by 2.15 m-high recess at along=89.10, sill z=3.65, depth=0.85. Three equal pointed lights and two 0.22 m solid piers; barrel follows the arch over the first 0.30 m of depth, with flat ceiling behind. The gallery has an opaque back and plain vertical timber slats at out=-0.81, 0.035 m wide and 0.025 m deep at 0.16 m pitch, in 0.08 m perimeter frames; clip slats to the three actual arches. Sill z=3.45..3.65, out=-0.90..+0.12; close ends. The existing upper floor supports the recess. This is a sheltered room volume, never a traversable balcony.

**B-HOOD.** The textile hood is a plain timber working shade, not carved ornament. Use its feature width, Z and out bounds. A 0.08 m board canopy bears on two 0.07-square brackets 0.12 m inside the ends; 0.22 m diagonal knees connect brackets to the wall. The straight fascia is 0.12 m deep. All members fit the declared feature box. No upper hood is scheduled on the packer.

**B-HOIST.** One 0.18 m-wide timber beam runs out=-0.45..+0.65, z=6.06..6.24. Its last out=0.40..0.63 is a fork: two 0.04 m-wide cheeks at local along=-0.09..-0.05 and +0.05..+0.09 extend z=5.99..6.24; the top web spans z=6.16..6.24. Leave the central slot empty below that web. The 0.06 m-thick pulley, radius 0.08, is centered at along=0, out=0.50,z=6.04; its upper arc fits the slot and a 0.02-diameter axle through both cheeks supports it. Keep all parts inside B-STORE-HOIST bbox. One 0.06-square rear knee joins the wall z=5.97 to beam underside at out=0.35. The hatch has a 0.40 m sill upstand and serves hand-carried sacks, not wheeled upper loading; no hanging load or route rope.

**B-FIELD.** On the quiet west gate abutment, carve a 0.06 m-deep plaster field into its stone face inside the printed feature box. Leave the outer stone margins and solid backing; no door, arch, or window is implied. This is a finished masonry abutment, not another house.

**B-SHADE.** SD-12 member dimensions remain. Ledger center at the instance ledgerZ (north 3.08, tea 3.26), 0.08 square; arms 0.07 square with top at ledgerZ; knees run/rise exactly 0.30 m from wall to underside of each arm. Cloth upper surface falls 0.20 m to the front, with 0.10 m midspan sag, 0.008 m thickness and 0.025 m hem. Full assembly must fit the printed bbox (north lowest z=2.55; tea lowest z=2.73); fabric remains inside clothBbox with thickness/hem allowed only inside the full assembly bbox.

**B-FINISH-TEXTILE.** Use finishSchedule.textiles. B-HOUSE-RAIL-RUG is a 0.76 m-wide cloth strip swept along foldPathOutZ in the existing north-face coordinate frame. Subdivide each segment twice, ease the top fold through its listed points and keep 0.008 m thickness inside bbox. The fold underside contacts the front rail top z=4.45; no rigid rectangular slab. Bound border and end fringe lie inside width/height. Render double-sided cloth with finished edges and no shadow casting; leave the remainder of the balustrade visible.

### B-only installation and reuse

**id:** B-05-finish-only

**mode:** Implement the complete B area, review once at the end, then make targeted corrections. No mid-build design reviews or approval ladder.

**existingTrial:** The B-04 courtyard, local gateway caps, roof, portal and shared environment are now implemented. Reuse all unchanged outputs. Rebuild only the courtyard section for B-05 finish; do not repeat roof retirement, rebuild caps or change map placement data unless an affected binding actually requires it.

**roofPolicy:** The full-map roofBundleIds remain coordination references. For this B-only trial, replace the previously installed full Rug Gate roof bundle with B-local caps clipped to the exact B_S_WEST and B_S_EAST footprints; restore retained legacy roof output outside those two footprints. Keep the full-map bundle definition for the later Rug Gate build. Never install an unsupported 9.9 m roof above retained 4.5/7.0 m neighbor facades.

**roofSlices:**

```json
[
  {
    "sourceParcelId": "B_S_WEST",
    "clipRect": [
      17,
      76.5,
      21,
      78
    ],
    "modelId": "bz03_b_gate_cap_west",
    "bbox": {
      "min": [
        17,
        76.5,
        9.9
      ],
      "max": [
        21,
        78,
        10.02
      ]
    },
    "materialId": "ph_bz04_stone_trim_sandstone",
    "geometry": "one closed flat cap; no overhang, parapet, screed or collector",
    "placement": {
      "designCenter": [
        19.0,
        77.25,
        9.9
      ],
      "yawDeg": 180
    },
    "retirement": "Retire this cap when ROOF_BUNDLE_UNIT_RUG_GATE and its complete supporting facades are installed."
  },
  {
    "sourceParcelId": "B_S_EAST",
    "clipRect": [
      34,
      76,
      39,
      78
    ],
    "modelId": "bz03_b_gate_cap_east",
    "bbox": {
      "min": [
        34,
        76,
        9.9
      ],
      "max": [
        39,
        78,
        10.08
      ]
    },
    "materialId": "ph_bz04_stone_trim_sandstone",
    "geometry": "one closed flat cap; no overhang, parapet, screed or collector",
    "placement": {
      "designCenter": [
        36.5,
        77.0,
        9.9
      ],
      "yawDeg": 180
    },
    "retirement": "Retire this cap when ROOF_BUNDLE_UNIT_RUG_GATE and its complete supporting facades are installed."
  }
]
```

**roofSliceDetail:** Build exactly the two closed slab boxes listed in roofSlices. Keep their y=76/76.5 cut faces closed, restore the original legacy roof producers outside their clip rectangles and suppress them inside. The courtyard’s enclosed B_S_EAST and B_S_WEST volumes support the caps. Remove the previously installed full Rug Gate roof placement and activate these cap placements atomically, with unique model IDs and bounds. Later replace the caps with the complete supported Rug Gate bundle atomically. No invented neighbor walls or roof fragments.

**sourceOwner:** Keep B-local caps in the courtyard-owned deterministic source and package, retaining the stable bz03_b_gate_cap_west/east model IDs from the existing phase design. Do not call the old Rug Gate builder, which emits out-of-scope foreground facades.

**runtimeRetirement:** Retire named visual placements together with now-unreferenced clusters, asset registry entries and soft-visual anchors; preserve shared references. Every new model binding includes its /assets/-rooted runtime.uri.

**remainingTooling:** map:check inspects transformed triangle bounds instead of treating the shared enclosing box as solid. Keep the separate exact triangle-volume proof; unsupported geometry must fail closed.

**builderDelta:** Retain the corrected B-04 builder and its assertions. Add per-opening finish bindings from finishSchedule, use private B material copies, consume existing stockColorSrgb, finish the two rug displays/cushion and add the one receiver-mounted balcony rug. Preserve opening masks, facade normals, screen holes, geometry envelopes, source/runtime identity and the user-authorized 64,000-triangle/23-primitive ceilings. No whole-map runtime or shared-material edits.

### Construction economy

Reuse the installed B/shared outputs where compatible. Rebuild the named section for R4 profiles and finish; preserve the 64,000 triangle cap, 56,000 target and existing roof phase. One consolidated end review, then targeted corrections.

[B courtyard character and assembly review plate](drawings/spawn_b_courtyard-character.svg) · [monochrome composition](drawings/spawn_b_courtyard-composition.svg). These are measured design drawings, not implemented renders.

## Architecture and craftsmanship

**Primary:** Retained merchant balcony and its related upper timber-and-glass pair

**Supporting:** Segmental work/guest windows and crafted entrance surrounds

**Quiet fields and limits:** Refine the hoist mounting and loading story; do not restart the window-motif cycle.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `B_N_POTTER` / `BLD_B_N_POTTER` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The single pottery drying-loft vent centers at20.65 in the17..24.3 upper field. The lower family-room pair and potter workfront remain. |
| `B_N_HOUSE` / `BLD_B_N_HOUSE` | building | `ph_bz04_red_plaster_weathered`; single-drip; CF-ENVELOPE / CF-JOINT | Merchant family house |
| `B_N_TEXTILE` / `BLD_B_N_TEXTILE` | building | `ph_bz04_beige_wall_002`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The single cloth-storage loft vent centers at35 in the31..39 upper field, independently of the wider working shutters and ground shop. |
| `B_E_STORE` / `BLD_B_E_STORE` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Single loading stack is clear; replace two disconnected loft vents with one aligned louver. |
| `B_E_PACKER` / `BLD_B_E_PACKER` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Packers house uses two plain window stacks matching door and counter; widening the pin-sized stair windows makes a coherent frame family. |
| `B_S_WEST` / `ASM_B_GATE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Solid gateway return; the entrance hierarchy belongs to LM-01, with no invented door or niche |
| `B_S_EAST` / `BLD_RUG_EAST_GATEKEEPER` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Gatekeeper court return shares matching domestic sill/head and one loft vent, preserving the gateway mass. |
| `B_W_HOUSE` / `BLD_B_W_HOUSE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Guest house |
| `B_W_TEA` / `BLD_B_W_TEA` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Gallery is the useful feature. Loft ventilation belongs to one center, not two unrelated louvers. |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_B_N_POTTER_SHOP` | pottery display | 16 / CF-CERAMIC, CF-CLOTH, CF-COUNTER, CF-SHELF | Build the named parts as pottery display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_B_N_TEXTILE_SHOP` | rug display | 10 / CF-COUNTER, CF-RUG, CF-TIMBER | Build the named parts as rug display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_B_W_TEA_SHOP` | tea display | 19 / CF-CERAMIC, CF-CLOTH, CF-COUNTER, CF-METAL, CF-SHELF | Build the named parts as tea display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_B_E_PACK_SHOP` | shipping bales composition for this tenancy | 4 / CF-COUNTER, CF-ROLLED-CLOTH | Build the named parts as shipping bales composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_B_W_SEAT` | seat display | 7 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | Build the named parts as seat display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |
| `G_SPAWN_B_COURTYARD_PLANT` | Contained jasmine trough below the potter workroom window, clear of the shop and private entrance | 5 / CF-PLANT | Build the named parts as Contained jasmine trough below the potter workroom window, clear of the shop and private entrance. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` |
| `ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD` | `B_E_PACKER`, `B_E_STORE`, `B_N_HOUSE`, `B_N_POTTER`, `B_N_TEXTILE`, `B_W_HOUSE`, `B_W_TEA`, `lne-n`, `lnw-n-part-2` | `lne-n`, `lnw-n-part-2` |

**Required craft recipes:** CF-CERAMIC, CF-CLOTH, CF-COUNTER, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-JOINT, CF-METAL, CF-OPEN, CF-PLANT, CF-R4-GLASS, CF-R4-PORTAL, CF-ROLLED-CLOTH, CF-RUG, CF-SHADE, CF-SHELF, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `SPAWN_B_COURTYARD` · `north`

Quiet background: Full north boundary is built massing behind every collider span..

Protected wall interval: **17..39 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 17..39 | collider-backed solid | COLLIDER_WALL_043, COLLIDER_WALL_045 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `B_N_POTTER` | 17..24.3 | (17, 92, 24.3, 95.8) | The single pottery drying-loft vent centers at20.65 in the17..24.3 upper field. The lower family-room pair and potter workfront remain. | 9.9 | 3.8 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | B-04 proposal. Plain timber living windows, smaller loft vents and one recessed pottery counter under supported cream shade. Thick reveals and the working shop provide character. Preserve the fixed collider envelope. |
| `B_N_HOUSE` | 24.3..31 | (24.3, 92, 31, 96) | Merchant family house | 10.2 | 4 | `ph_bz04_red_plaster_weathered` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | B-04 proposal. One arched entrance and its centered timber balcony form the primary address. Ordinary paired-leaf bedroom windows flank this axis. The balcony balustrade alone carries B-STAR ornament; the upper central wall stays quiet. Preserve the fixed collider envelope. |
| `B_N_TEXTILE` | 31..39 | (31, 92, 39, 96) | The single cloth-storage loft vent centers at35 in the31..39 upper field, independently of the wider working shutters and ground shop. | 9.9 | 4 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | B-04 proposal. A broad three-panel louvered opening belongs to the sorting room above the display shop. A narrow stair strip remains separate. The masonry ground storey carries a pale plaster upper wall. Preserve the fixed collider envelope. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `B_N_POTTER_WORK` | `B_N_POTTER` | window | 18.225 | 1.1 / 2.25 | 1.35 × 1.15 × 0.38 | 92 | `SD-07`; closed timber louver | potter workroom |
| `B_N_POTTER_SHOP` | `B_N_POTTER` | shop | 20.675 | 0 / 2.75 | 2.2 × 2.75 × 1.9 | 92 | `SD-08`; closed shop back and fixed counter; side-door clear 0.8 m → `B_N_POTTER_DOOR` | pottery display and working counter |
| `B_N_POTTER_DOOR` | `B_N_POTTER` | door | 23.1 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 92 | `SD-05`; closed double timber leaves | private stair entrance |
| `B_N_POTTER-L1-B1` | `B_N_POTTER` | window | 18.225 | 4.15 / 5.8 | 1.2 × 1.65 × 0.38 | 92 | `SD-07`; closed timber louver | family room |
| `B_N_POTTER-L1-B2` | `B_N_POTTER` | window | 20.675 | 4.15 / 5.8 | 1.2 × 1.65 × 0.38 | 92 | `SD-07`; closed timber louver | family room |
| `B_N_POTTER-L1-B3` | `B_N_POTTER` | window | 23.1 | 4.55 / 5.55 | 0.55 × 1 × 0.38 | 92 | `SD-07`; closed timber louver | stair landing |
| `B_N_POTTER-COMMON-LOFT-VENT` | `B_N_POTTER` | vent | 20.65 | 8.35 / 9 | 2 × 0.65 × 0.32 | 92 | `SD-07`; closed timber louver | ventilated pottery drying loft |
| `B_N_HOUSE_DOOR` | `B_N_HOUSE` | door | 27.65 | 0 / 2.85 | 1.35 × 2.85 × 0.42 | 92 | `SD-05`; closed double timber leaves; architecturalDetail: `{"profile":"carved-timber-portal","surroundWidthM":0.18,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#9c8060","frameMaterialId":"ph_bz04_weathered_brown_planks","materialProfile":"warmTimber","carving":{"pattern":"running-lozenge","modulePitchM":0.12,"moduleWidthM":0.085,"moduleHeightM":0.05,"incisionWidthM":0.006,"incisionDepthM":0.006,"placement":"One centered vertical chain on each outer timber jamb; stop 0.18 m above sill and 0.18 m below the arch spring/head. The head retains two continuous nested bands. No floral alternative."}}` | principal vestibule and stair |
| `B_N_HOUSE-ground-0` | `B_N_HOUSE` | window | 25.55 | 1.15 / 2.35 | 0.75 × 1.2 × 0.4 | 92 | `SD-07`; closed paneled timber shutters | family room |
| `B_N_HOUSE-ground-2` | `B_N_HOUSE` | window | 29.75 | 1.15 / 2.35 | 0.75 × 1.2 × 0.4 | 92 | `SD-07`; closed paneled timber shutters | family room |
| `B_N_HOUSE-L1-B1` | `B_N_HOUSE` | window | 25.55 | 4.05 / 5.75 | 1.05 × 1.7 × 0.42 | 92 | `SD-07`; closed double paneled timber shutters | family bedroom |
| `B_N_HOUSE-L1-B2` | `B_N_HOUSE` | window | 27.65 | 3.55 / 5.7 | 1.55 × 2.15 × 0.45 | 92 | `SD-07`; closed double paneled timber leaves behind balcony | closed upper stair door to private balcony |
| `B_N_HOUSE-L1-B3` | `B_N_HOUSE` | window | 29.75 | 4.05 / 5.75 | 1.05 × 1.7 × 0.42 | 92 | `SD-07`; closed double paneled timber shutters | family bedroom |
| `B_N_HOUSE-L2-B1` | `B_N_HOUSE` | window | 25.55 | 7.4 / 9.35 | 1.35 × 1.95 × 0.38 | 92 | `SD-07`; Closed timber lower leaves and fixed colored-glass upper lights; glazingProfile: `{"fromZM":8.8,"pattern":"diamond","paletteSrgb":["#d7ceb0","#ad8650","#6d8c87","#6c8096"],"paletteSequence":[0,1,0,2,0,3],"columnsPerLight":2,"rows":2,"webM":0.045,"glassThicknessM":0.006,"backing":"Opaque dark matte receiver at the scheduled recess back; no view through, emission or transmitted light.","materialProfile":"fixedGlass"}` | Bedroom daylight with fixed decorative upper glass and private lower shutters |
| `B_N_HOUSE-L2-B3` | `B_N_HOUSE` | window | 29.75 | 7.4 / 9.35 | 1.35 × 1.95 × 0.38 | 92 | `SD-07`; Closed timber lower leaves and fixed colored-glass upper lights; glazingProfile: `{"fromZM":8.8,"pattern":"diamond","paletteSrgb":["#d7ceb0","#ad8650","#6d8c87","#6c8096"],"paletteSequence":[0,1,0,2,0,3],"columnsPerLight":2,"rows":2,"webM":0.045,"glassThicknessM":0.006,"backing":"Opaque dark matte receiver at the scheduled recess back; no view through, emission or transmitted light.","materialProfile":"fixedGlass"}` | Bedroom daylight with fixed decorative upper glass and private lower shutters |
| `B_N_TEXTILE_SHOP` | `B_N_TEXTILE` | shop | 33.5 | 0 / 2.75 | 3 × 2.75 × 1.9 | 92 | `SD-08`; closed shop back and fixed counter; side-door clear 0.8 m → `B_N_TEXTILE_DOOR` | textile packing display |
| `B_N_TEXTILE_DOOR` | `B_N_TEXTILE` | door | 37.5 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 92 | `SD-05`; closed double timber leaves | staff stair entrance |
| `B_N_TEXTILE-L1-B3` | `B_N_TEXTILE` | window | 37.5 | 4.55 / 5.65 | 0.5 × 1.1 × 0.35 | 92 | `SD-07`; closed timber louver | stair landing |
| `B_N_TEXTILE-L2-B1` | `B_N_TEXTILE` | vent | 35 | 8.25 / 9.05 | 2.1 × 0.8 × 0.35 | 92 | `SD-07`; closed timber louver | high dry-stock ventilation |
| `B_N_TEXTILE_UPPER_SCREEN` | `B_N_TEXTILE` | window | 33.5 | 3.95 / 5.85 | 3.55 × 1.9 × 0.5 | 92 | `SD-07`; closed three-panel timber louver | three-panel ventilating shutters for the textile sorting room |

### `SPAWN_B_COURTYARD` · `east`

Quiet background: y=78..81 exact connector is empty..

Protected wall interval: **78..92 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 81..92 | collider-backed solid | COLLIDER_WALL_114 |
| 78..81 | **ZERO BUILD protected opening** | LINK_NORTH_EAST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `B_E_STORE` | 81..86 | (39, 81, 42.6, 86) | Single loading stack is clear; replace two disconnected loft vents with one aligned louver. | 9.9 | 3.6 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | B-04 proposal. One broad closed loading hatch, a small working hoist and high rectangular vents. A segmental stone receiving entrance remains the functional ground threshold. Preserve the fixed collider envelope. |
| `B_E_PACKER` | 86..92 | (39, 86, 42.6, 92) | Packers house uses two plain window stacks matching door and counter; widening the pin-sized stair windows makes a coherent frame family. | 10.2 | 3.6 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | B-04 proposal. Plain double shutters serve the larger office/family bay; small stair lights serve the narrow bay. The packing counter establishes its trade. No upper decorative hood. Preserve the fixed collider envelope. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `B_E_STORE-DOOR` | `B_E_STORE` | door | 83.5 | 0 / 2.85 | 1.8 × 2.85 × 0.4 | 39 | `SD-05`; closed double timber leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | receiving entrance |
| `B_E_STORE-L2-B1` | `B_E_STORE` | vent | 83.5 | 8.2 / 8.85 | 1.7 × 0.65 × 0.42 | 39 | `SD-07`; closed timber louver | high store ventilation |
| `B_E_STORE_LOADING` | `B_E_STORE` | window | 83.5 | 3.7 / 5.85 | 2.1 × 2.15 × 0.38 | 39 | `SD-07`; closed double paneled timber loading leaves | closed hoist loading hatch for the receiving store |
| `B_E_PACK_DOOR` | `B_E_PACKER` | door | 87.5 | 0 / 2.55 | 1.15 × 2.55 × 0.22 | 39 | `SD-05`; closed double timber leaves | staff stair entrance |
| `B_E_PACK_SHOP` | `B_E_PACKER` | shop | 90.2 | 0 / 2.75 | 2.2 × 2.75 × 1.9 | 39 | `SD-08`; closed shop back and fixed counter; side-door clear 0.8 m → `B_E_PACK_DOOR` | packing counter and dispatch store |
| `B_E_PACKER-L1-B1` | `B_E_PACKER` | window | 87.5 | 4.05 / 5.8 | 0.8 × 1.75 × 0.28 | 39 | `SD-07`; Closed 1-panel timber shutters | stair landing |
| `B_E_PACKER-L1-B2` | `B_E_PACKER` | window | 90.2 | 4.05 / 5.8 | 1.35 × 1.75 × 0.32 | 39 | `SD-07`; closed double paneled timber shutters | packing office or stock room |
| `B_E_PACKER-L2-B1` | `B_E_PACKER` | window | 87.5 | 7.35 / 9.1 | 0.8 × 1.75 × 0.28 | 39 | `SD-07`; Closed 1-panel timber shutters | stair landing |
| `B_E_PACKER-L2-B2` | `B_E_PACKER` | window | 90.2 | 7.35 / 9.1 | 1.35 × 1.75 × 0.32 | 39 | `SD-07`; closed double paneled timber shutters | packing office or stock room |

### `SPAWN_B_COURTYARD` · `south`

Quiet background: Exact Rug Gate main throat x=21..34 is clear..

Protected wall interval: **17..39 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 17..21 | collider-backed solid | COLLIDER_WALL_036 |
| 34..39 | collider-backed solid | COLLIDER_WALL_037 |
| 21..34 | **ZERO BUILD protected opening** | RUG_GATE |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `B_S_WEST` | 17..21 | (17, 76.5, 21, 78) | Solid gateway return; the entrance hierarchy belongs to LM-01, with no invented door or niche | 9.9 | 1.5 | `ph_bz04_sandstone_blocks_05` | slab 9.9..10.02; parapet 10.02; cap 10.02; setback 0 | B-04 proposal. A restrained recessed plaster field articulates the solid stone abutment. No doorway, false room or added ornament. Preserve the fixed collider envelope. |
| `B_S_EAST` | 34..39 | (34, 76, 39, 78) | Gatekeeper court return shares matching domestic sill/head and one loft vent, preserving the gateway mass. | 9.9 | 2 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | B-04 proposal. Restrained lower windows and small upper lights in the stone gatekeeper return. No paired arches or decorative screen competes with the gate. Preserve the fixed collider envelope. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `B_S_EAST-L1-W1` | `B_S_EAST` | window | 35.35 | 4.25 / 5.85 | 1 × 1.6 × 0.38 | 78 | `SD-07`; Closed 2-panel timber shutters | upper workroom or dry-stock room |
| `B_S_EAST-L1-W2` | `B_S_EAST` | window | 37.65 | 4.25 / 5.85 | 1 × 1.6 × 0.38 | 78 | `SD-07`; Closed 2-panel timber shutters | upper workroom or dry-stock room |
| `B_S_EAST-RETURN-LOFT-VENT` | `B_S_EAST` | window | 36.5 | 8.65 / 9.35 | 1.5 × 0.7 × 0.42 | 78 | `SD-07`; closed timber louver | upper workroom or dry-stock room |

### `SPAWN_B_COURTYARD` · `west`

Quiet background: y=78..81 exact north-west connector is empty..

Protected wall interval: **78..92 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 81..92 | collider-backed solid | COLLIDER_WALL_078 |
| 78..81 | **ZERO BUILD protected opening** | LINK_NORTH_WEST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `B_W_HOUSE` | 81..86.2 | (13.4, 81, 17, 86.2) | Guest house | 9.9 | 3.6 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | B-04 proposal. Two aligned room bays use plain teal shutters below smaller upper louvers. A centered entrance and limited joinery color are sufficient to distinguish the house. Preserve the fixed collider envelope. |
| `B_W_TEA` | 86.2..92 | (13.4, 86.2, 17, 92) | Gallery is the useful feature. Loft ventilation belongs to one center, not two unrelated louvers. | 9.9 | 3.6 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | B-04 proposal. Three recessed arches with plain vertical timber infill form one shaded sitting gallery. Solid piers and 0.85 m depth matter more than surface pattern. The lower counter and seat share one canopy. Preserve the fixed collider envelope. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `B_W_HOUSE-DOOR` | `B_W_HOUSE` | door | 83.6 | 0 / 2.55 | 1.3 × 2.55 × 0.22 | 17 | `SD-05`; closed double timber leaves; architecturalDetail: `{"profile":"painted-domestic","surroundWidthM":0.14,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | guest vestibule |
| `B_W_HOUSE-ground-0` | `B_W_HOUSE` | window | 82.4 | 1.2 / 2.3 | 0.7 × 1.1 × 0.3 | 17 | `SD-07`; closed paneled timber shutters | guest room |
| `B_W_HOUSE-ground-1` | `B_W_HOUSE` | window | 84.8 | 1.2 / 2.3 | 0.7 × 1.1 × 0.3 | 17 | `SD-07`; closed paneled timber shutters | guest room |
| `B_W_HOUSE-L1-B1` | `B_W_HOUSE` | window | 82.4 | 4.05 / 5.75 | 1.2 × 1.7 × 0.4 | 17 | `SD-07`; closed double paneled timber shutters | guest bedroom |
| `B_W_HOUSE-L1-B2` | `B_W_HOUSE` | window | 84.8 | 4.05 / 5.75 | 1.2 × 1.7 × 0.4 | 17 | `SD-07`; closed double paneled timber shutters | guest bedroom |
| `B_W_HOUSE-L2-B1` | `B_W_HOUSE` | window | 82.4 | 7.65 / 8.9 | 1.2 × 1.25 × 0.32 | 17 | `SD-07`; closed timber louver | guest bedroom |
| `B_W_HOUSE-L2-B2` | `B_W_HOUSE` | window | 84.8 | 7.65 / 8.9 | 1.2 × 1.25 × 0.32 | 17 | `SD-07`; closed timber louver | guest bedroom |
| `B_W_SEAT` | `B_W_TEA` | niche | 87.65 | 0 / 2.7 | 1.8 × 2.7 × 0.5 | 17 | `SD-09-SEAT`; closed seating alcove | integrated shaded seating |
| `B_W_TEA_SHOP` | `B_W_TEA` | shop | 90.3 | 0 / 2.75 | 2.1 × 2.75 × 1.9 | 17 | `SD-08`; closed shop back and fixed counter; side-door clear 0.8 m → `B_W_TEA-rear-staff-door` | tea serving counter |
| `B_W_TEA-L2-B1` | `B_W_TEA` | vent | 89.1 | 8.15 / 8.95 | 2 × 0.8 × 0.32 | 17 | `SD-07`; closed timber louver | high guest-room ventilation above the gallery |
| `B_W_TEA_GALLERY` | `B_W_TEA` | window | 89.1 | 3.65 / 5.8 | 4.7 × 2.15 × 0.85 | 17 | `SD-07`; closed vertical slat timber screens | recessed guest sitting gallery, screened and nonplayable |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `SPAWN_B_COURTYARD` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'SPAWN_B_COURTYARD-CLEAR', 'x': 25.0, 'y': 78, 'w': 6, 'h': 14, 'heightM': 2.2, 'floorSource': 'SPAWN_B_COURTYARD'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `SPAWN_B_COURTYARD` | `G_B_N_POTTER_SHOP` / `AG-POTTERY` | north/B_N_POTTER/B_N_POTTER_SHOP | (19.615, 91.72, 0.04) → (21.735, 93.9, 2.65) | Build the named parts as pottery display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPAWN_B_COURTYARD` | `G_B_N_TEXTILE_SHOP` / `AG-RUG` | north/B_N_TEXTILE/B_N_TEXTILE_SHOP | (32.04, 91.72, 0.04) → (34.96, 93.9, 2.65) | Build the named parts as rug display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPAWN_B_COURTYARD` | `G_B_W_TEA_SHOP` / `AG-TEA` | west/B_W_TEA/B_W_TEA_SHOP | (15.1, 89.29, 0.04) → (17.28, 91.31, 2.65) | Build the named parts as tea display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPAWN_B_COURTYARD` | `G_B_E_PACK_SHOP` / `AG-PACK` | east/B_E_PACKER/B_E_PACK_SHOP | (38.72, 89.14, 0.04) → (40.9, 91.26, 2.65) | Build the named parts as shipping bales composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPAWN_B_COURTYARD` | `G_B_W_SEAT` / `AG-SEAT` | west/B_W_TEA/B_W_SEAT | (16.85, 86.85, 0.04) → (17.3, 88.45, 0.55) | Build the named parts as seat display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | Two grounded timber supports on niche deck z=0.04; rear seat reaches out=-0.15 |
| `SPAWN_B_COURTYARD` | `G_SPAWN_B_COURTYARD_PLANT` / `AG-PLANT` | north/B_N_POTTER | (17.675, 91.7, 0) → (18.775, 92, 0.95) | Build the named parts as Contained jasmine trough below the potter workroom window, clear of the shop and private entrance. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | Grounded trough against the named north wall; soil and roots enclosed by 0.05m walls |
| `SPAWN_B_COURTYARD` | `SPAWN_B_COURTYARD-CLEAR` | **CLEAR ROUTE** | (25, 78) → (31, 92) | Protected empty region | Do not place geometry |

### Fixed composition `G_B_N_POTTER_SHOP`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.05, -0.55, 0] / [1.05, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `bowl-1` | open-ceramic-bowl / `CF-CERAMIC` | [-0.73, -0.05, 0.9] / [-0.5700000000000001, 0.11, 1.0] | `bz04_ceramic_project_original`; albedo #879b8b | countertop |
| `bowl-2` | open-ceramic-bowl / `CF-CERAMIC` | [-0.11, -0.08, 0.9] / [0.11, 0.14, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `bowl-3` | open-ceramic-bowl / `CF-CERAMIC` | [0.56, -0.06, 0.9] / [0.74, 0.12, 1.04] | `bz04_ceramic_project_original`; albedo #b98970 | countertop |
| `bowl-4` | open-ceramic-bowl / `CF-CERAMIC` | [-0.75, -0.5, 0.9] / [-0.55, -0.30000000000000004, 1.0] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `bowl-5` | open-ceramic-bowl / `CF-CERAMIC` | [-0.07, -0.47000000000000003, 0.9] / [0.07, -0.33, 1.02] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `bowl-6` | open-ceramic-bowl / `CF-CERAMIC` | [0.53, -0.52, 0.9] / [0.77, -0.28, 1.04] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `plate-1` | stacked-ceramic-plate / `CF-CERAMIC` | [-0.45, -0.32, 0.9] / [-0.21000000000000002, -0.08000000000000002, 0.925] | `bz04_ceramic_project_original`; albedo #d6c9b2 | countertop |
| `plate-2` | stacked-ceramic-plate / `CF-CERAMIC` | [-0.45, -0.32, 0.925] / [-0.21000000000000002, -0.08000000000000002, 0.9500000000000001] | `bz04_ceramic_project_original`; albedo #d6c9b2 | plate-1 |
| `folded-linen` | folded-cloth / `CF-CLOTH` | [0.205, -0.3, 0.9] / [0.455, -0.1, 0.94] | `ph_bz04_fine_linen` | countertop |
| `pot-shelf-1` | plank-shelf / `CF-SHELF` | [-0.85, -1.9, 1.09] / [0.85, -1.68, 1.3] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `lidded-jar-1-1` | lidded-ceramic-jar / `CF-CERAMIC` | [-0.55, -1.8900000000000001, 1.3] / [-0.35, -1.69, 1.58] | `bz04_ceramic_project_original`; albedo #d6c9b2 | pot-shelf-1 |
| `lidded-jar-1-2` | lidded-ceramic-jar / `CF-CERAMIC` | [0.35, -1.8900000000000001, 1.3] / [0.55, -1.69, 1.65] | `bz04_ceramic_project_original`; albedo #879b8b | pot-shelf-1 |
| `pot-shelf-2` | plank-shelf / `CF-SHELF` | [-0.85, -1.9, 1.64] / [0.85, -1.68, 1.85] | `ph_bz04_worn_planks` | two wall brackets at the recess back |
| `lidded-jar-2-1` | lidded-ceramic-jar / `CF-CERAMIC` | [-0.55, -1.8900000000000001, 1.85] / [-0.35, -1.69, 2.15] | `bz04_ceramic_project_original`; albedo #d6c9b2 | pot-shelf-2 |
| `lidded-jar-2-2` | lidded-ceramic-jar / `CF-CERAMIC` | [0.35, -1.8900000000000001, 1.85] / [0.55, -1.69, 2.09] | `bz04_ceramic_project_original`; albedo #d6c9b2 | pot-shelf-2 |

### Fixed composition `G_B_N_TEXTILE_SHOP`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.45, -0.55, 0] / [1.45, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
| `upright-1` | timber-member / `CF-TIMBER` | [-0.9, -1.9, 0] / [-0.83, -1.65, 2.45] | `ph_bz04_worn_planks` | recess deck and upper wall bracket |
| `upright-2` | timber-member / `CF-TIMBER` | [0.83, -1.9, 0] / [0.9, -1.65, 2.45] | `ph_bz04_worn_planks` | recess deck and upper wall bracket |
| `top-rail` | timber-member / `CF-TIMBER` | [-0.9, -1.9, 2.38] / [0.9, -1.65, 2.45] | `ph_bz04_worn_planks` | two uprights |
| `hanging-rug-1` | bound-hanging-rug / `CF-RUG` | [-0.77, -1.735, 0.7] / [0.16, -1.705, 2.3] | `bz04_levantine_rug_project_original` | two ties to top-rail, one at each upper corner |
| `hanging-rug-2` | bound-hanging-rug / `CF-RUG` | [0.24, -1.735, 1.0] / [0.76, -1.705, 2.3] | `bz04_levantine_rug_project_original` | two ties to top-rail, one at each upper corner |
| `rolled-rug-1-1` | horizontal-rolled-rug / `CF-RUG` | [-0.655, -0.19, 0.9] / [-0.10499999999999998, -0.010000000000000009, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-1-2` | horizontal-rolled-rug / `CF-RUG` | [0.10499999999999998, -0.19, 0.9] / [0.655, -0.010000000000000009, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-2-1` | horizontal-rolled-rug / `CF-RUG` | [-0.655, -0.44999999999999996, 0.9] / [-0.10499999999999998, -0.27, 1.08] | `bz04_levantine_rug_project_original` | countertop |
| `rolled-rug-2-2` | horizontal-rolled-rug / `CF-RUG` | [0.10499999999999998, -0.44999999999999996, 0.9] / [0.655, -0.27, 1.08] | `bz04_levantine_rug_project_original` | countertop |

### Fixed composition `G_B_W_TEA_SHOP`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `counter` | grounded-counter-carcass / `CF-COUNTER` | [-1.0, -0.55, 0] / [1.0, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck; base feet are flat and continuous under the carcass |
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

### Fixed composition `G_B_E_PACK_SHOP`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `chest` | grounded-plank-chest / `CF-COUNTER` | [-1.05, -0.55, 0] / [1.05, 0.15, 0.9] | `ph_bz04_worn_planks` | recess deck |
| `bale-1` | bound-folded-textile / `CF-ROLLED-CLOTH` | [-0.8049999999999999, -0.38, 0.9] / [-0.15499999999999997, 0.11, 1.28] | `ph_bz04_fine_linen` | chest top |
| `bale-2` | bound-folded-textile / `CF-ROLLED-CLOTH` | [0.0, -0.38, 0.9] / [0.6, 0.11, 1.2] | `ph_bz04_fine_linen` | chest top |
| `bale-3` | bound-folded-textile / `CF-ROLLED-CLOTH` | [-0.6499999999999999, -0.38, 1.28] / [0.04999999999999999, 0.11, 1.6] | `ph_bz04_fine_linen` | bale-1 |

### Fixed composition `G_B_W_SEAT`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `end-frame-1` | framed-timber-end / `CF-FURNITURE` | [-0.78, -0.12, 0] / [-0.7, 0.27, 0.42] | `ph_bz04_worn_planks` | recess deck |
| `end-frame-2` | framed-timber-end / `CF-FURNITURE` | [0.7, -0.12, 0] / [0.78, 0.27, 0.42] | `ph_bz04_worn_planks` | recess deck |
| `seat-board-1` | plank-board / `CF-TIMBER` | [-0.8, -0.15, 0.42] / [0.8, -0.02, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `seat-board-2` | plank-board / `CF-TIMBER` | [-0.8, 0.01, 0.42] / [0.8, 0.14, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `seat-board-3` | plank-board / `CF-TIMBER` | [-0.8, 0.17, 0.42] / [0.8, 0.3, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `stretcher` | timber-member / `CF-TIMBER` | [-0.74, -0.025, 0.18] / [0.74, 0.025, 0.23] | `ph_bz04_worn_planks` | two end frames |
| `fitted-cushion` | fitted-cloth-cushion / `CF-CLOTH` | [-0.625, -0.1, 0.46] / [0.625, 0.25, 0.51] | `bz04_levantine_rug_project_original` | seat boards |

### Fixed composition `G_SPAWN_B_COURTYARD_PLANT`

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
| `SPAWN_B_COURTYARD` | `SHADE_B_N_POTTER` | `SD-12` | north/B_N_POTTER/B_N_POTTER_SHOP | (19.425, 90.86, 2.55) → (21.925, 92.08, 3.145) | Whole assembly bounds include ledger, 0.07 m arms, exact 0.30 m knee run/rise, cloth and hem; clothBbox describes only the membrane. |
| | `SHADE_B_N_POTTER` dimensions/supports | | | {'interval': [19.425, 21.925], 'ledgerZ': 3.08, 'armAxesM': [19.525000000000002, 21.825], 'projectionM': 1.1, 'dropM': 0.2, 'sagM': 0.1} | Exact instance values override the standard defaults. |
| `SPAWN_B_COURTYARD` | `SHADE_B_N_TEXTILE` | `SD-12` | north/B_N_TEXTILE/B_N_TEXTILE_SHOP | (31.85, 90.86, 2.55) → (35.15, 92.08, 3.145) | Whole assembly bounds include ledger, 0.07 m arms, exact 0.30 m knee run/rise, cloth and hem; clothBbox describes only the membrane. |
| | `SHADE_B_N_TEXTILE` dimensions/supports | | | {'interval': [31.85, 35.15], 'ledgerZ': 3.08, 'armAxesM': [31.950000000000003, 35.05], 'projectionM': 1.1, 'dropM': 0.2, 'sagM': 0.1} | Exact instance values override the standard defaults. |
| `SPAWN_B_COURTYARD` | `SHADE_B_W_TEA` | `SD-12` | west/B_W_TEA/B_W_TEA_SHOP | (16.92, 86.4, 2.73) → (18.14, 91.8, 3.325) | Whole assembly bounds include ledger, 0.07 m arms, exact 0.30 m knee run/rise, cloth and hem; clothBbox describes only the membrane. |
| | `SHADE_B_W_TEA` dimensions/supports | | | {'interval': [86.4, 91.8], 'ledgerZ': 3.26, 'armAxesM': [86.5, 89.1, 91.7], 'projectionM': 1.1, 'dropM': 0.2, 'sagM': 0.1} | Exact instance values override the standard defaults. |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `SPAWN_B_COURTYARD` | 64000 | 20 | 23 | 12 |

Section origin (design coordinates): `{'x': 17, 'y': 78, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.799999999999999, -0.02, -2.200000000000003], 'max': [25.800000000000004, 10.219999999999999, 18.200000000000003]}`.
Required bindings: `bz04_brass_project_original`, `bz04_ceramic_project_original`, `bz04_court_limestone_flags_01`, `bz04_levantine_rug_project_original`, `bz04_plant_project_original`, `bz04_soil_project_original`, `bz04_teal_timber_project_original`, `ph_bz04_beige_wall_002`, `ph_bz04_dark_wood`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_red_plaster_weathered`, `ph_bz04_rough_pine_door`, `ph_bz04_rusty_metal_02`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`, `ph_hessian_230`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `SPAWN_B_COURTYARD-travel-reverse` | `SPAWN_B_COURTYARD` | (28, 91.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `SPAWN_B_COURTYARD-travel-forward` | `SPAWN_B_COURTYARD` | (28, 78.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `SPAWN_B_COURTYARD-portal-context` | `SPAWN_B_COURTYARD` | (27.5, 88.5, 1.7) | 0° / 9.5° / 75° | Whole gateway and courtyard approach; verify the focal landmark in its neighboring frame |
| `SPAWN_B_COURTYARD-north-B_N_POTTER_B_N_HOUSE_B_N_TEXTILE-s1-base` | `SPAWN_B_COURTYARD` | (28, 78.35, 1.7) | 180° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_B_COURTYARD-east-B_E_STORE_B_E_PACKER-s1-base` | `SPAWN_B_COURTYARD` | (17.35, 86.5, 1.7) | 270° / 1.323° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_B_COURTYARD-south-B_S_WEST-s1-base` | `SPAWN_B_COURTYARD` | (19, 91.65, 1.7) | 0° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_B_COURTYARD-south-B_S_EAST-s1-base` | `SPAWN_B_COURTYARD` | (36.5, 91.65, 1.7) | 0° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_B_COURTYARD-west-B_W_HOUSE_B_W_TEA-s1-base` | `SPAWN_B_COURTYARD` | (38.65, 86.5, 1.7) | 90° / 1.323° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_B_COURTYARD-finish-textiles` | `SPAWN_B_COURTYARD` | (33.5, 88.4, 1.7) | 180° / 0° / 75° | Rug borders, drape, rolled ends, ties and textile-store joinery |
| `B04-MERCHANT-DETAIL` | `SPAWN_B_COURTYARD` | (27.65, 87.5, 1.7) | 180° / 30° / 75° | Balcony voids, joist/canopy bearings, entrance and closed upper door |
| `B04-TEA-GALLERY-DETAIL` | `SPAWN_B_COURTYARD` | (23.5, 89.1, 1.7) | 90° / 24° / 75° | Three deep arches, complete piers/barrels, slat spacing and shade supports |
| `B04-GUEST-SHUTTER-DETAIL` | `SPAWN_B_COURTYARD` | (21, 82.4, 1.7) | 90° / 37° / 75° | Opaque teal shutter finish, room-depth reveals and lengthwise grain |
| `SPAWN_B_COURTYARD-R3-craft-detail` | `SPAWN_B_COURTYARD` | (35.5, 83.5, 1.7) | 270° / 49.514° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: B_E_STORE_LOADING |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `RUG-GATE-PORTAL` | `SPAWN_B_COURTYARD` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `SPAWN_B_COURTYARD` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `SPAWN_B_COURTYARD` cells: `ROOF_CELL_003`, `ROOF_CELL_040`, `ROOF_CELL_041`, `ROOF_CELL_042`, `ROOF_CELL_043`, `ROOF_CELL_044`, `ROOF_CELL_045`, `ROOF_CELL_046`, `ROOF_CELL_064`, `ROOF_CELL_065`.
- `SPAWN_B_COURTYARD` bundles: `ROOF_BUNDLE_UNIT_RUG_GATE`, `ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD`.
- `SPAWN_B_COURTYARD` interfaces: `ROOF_INTERFACE_ROOF_STEP_006`, `ROOF_INTERFACE_ROOF_STEP_049`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_red_plaster_weathered` | `ph_red_plaster_weathered` | <span style="color:#b77c62">■</span> `#b77c62` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-04` | `SPAWN_B_COURTYARD` | shared-environment | (12, 97, 0) → (19, 102, 11.6) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |
| `BG-05` | `SPAWN_B_COURTYARD` | shared-environment | (24, 100, 0) → (32, 106, 12.8) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |
| `BG-06` | `SPAWN_B_COURTYARD` | shared-environment | (36, 97, 0) → (44, 102, 11.4) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_SPAWN_B_DOOR_SHADE_E_MOUNT_SPAWN_B_DOOR_SHADE_E` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_DOOR_SHADE_W_MOUNT_SPAWN_B_DOOR_SHADE_W` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_NORTH_POT_MOUNT_SPAWN_B_NORTH_POT` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_NORTH_POT_SMALL_MOUNT_SPAWN_B_NORTH_POT_SMALL` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_NORTH_UPPER_ROOM_MOUNT_SPAWN_B_NORTH_UPPER_ROOM` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_PASSAGE_SHADE_MOUNT_SPAWN_B_PASSAGE_SHADE` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_SECOND_UPPER_ROOM_MOUNT_SPAWN_B_SECOND_UPPER_ROOM` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_SKYLINE_PALM_MOUNT_SPAWN_B_SKYLINE_PALM` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_WEST_BENCH_MOUNT_SPAWN_B_WEST_BENCH` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_WEST_POT_MOUNT_SPAWN_B_WEST_POT` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_B_WEST_UPPER_ROOM_MOUNT_SPAWN_B_WEST_UPPER_ROOM` | `SPAWN_B_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_BAY_01` | `SPAWN_B_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_MASSING` | `SPAWN_B_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_BAY_01` | `SPAWN_B_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_MASSING` | `SPAWN_B_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_SPAWN_B_COURTYARD_north` | `SPAWN_B_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPAWN_B_COURTYARD_east` | `SPAWN_B_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPAWN_B_COURTYARD_south` | `SPAWN_B_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPAWN_B_COURTYARD_west` | `SPAWN_B_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [SPAWN_B_COURTYARD dimensioned plan](drawings/spawn_b_courtyard-plan.svg), [SPAWN_B_COURTYARD four elevations](drawings/spawn_b_courtyard-elevations.svg), and [SPAWN_B_COURTYARD roof axonometric](drawings/spawn_b_courtyard-axon.svg)
- [Master plan](drawings/master-plan.svg)
