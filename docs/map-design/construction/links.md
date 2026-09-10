# BZ-04 / R7-facade-centered-upper-openings · Links

Controlled issue status: **PROPOSED_WHOLE_MAP_DESIGN**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `LINK_SOUTH_WEST`

Open connection between A and service stores. Continue the actual loading-store/house bases and close the exposed end returns. No new openings or dressing in the connector.

Primary focus: Open connection between A and service stores. Continue the actual loading-store/house bases and close the exposed end returns..

## Architecture and craftsmanship

**Primary:** Open connection between A and service stores

**Supporting:** Continue the actual loading-store/house bases and close the exposed end returns.

**Quiet fields and limits:** No new openings or dressing in the connector.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lsw-n` / `BLD_SPICE_SERVICE_COMPOUND` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Spice south service compound; its entrance and floor hierarchy are defined on the principal elevation |
| `lsw-n-part-2` / `ASM_LINK_SOUTH_WEST` | boundary-assembly | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | South-west link boundary enclosure return |
| `lsw-s` / `ASM_LINK_SOUTH_WEST` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | South-west link boundary enclosure return |
| `lsw-s-part-2` / `BLD_A_DOMESTIC_REAR` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Stepped court-facing domestic rear; its entrance and floor hierarchy are defined on the principal elevation |
| `lsw-w` / `ASM_LINK_SOUTH_WEST` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | South-west link boundary enclosure return |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_LINK_SOUTH_WEST` | `lsw-n-part-2`, `lsw-s`, `lsw-w` | none |
| `ROOF_BUNDLE_UNIT_SERVICE_SOUTH` | `cc-s`, `lsw-n`, `ss-e`, `ss-s`, `ss-w` | `cc-s`, `ss-e`, `ss-s`, `ss-w` |
| `ROOF_BUNDLE_UNIT_SPAWN_A_COURTYARD` | `A_E_CAP`, `A_E_DRYING`, `A_E_VATS`, `A_S_GATE`, `A_S_KEEPER`, `A_S_WATCH`, `A_W_CAP`, `A_W_MID`, `A_W_NORTH`, `A_W_SOUTH`, `lse-s`, `lsw-s-part-2` | `A_E_CAP`, `A_E_DRYING`, `A_E_VATS`, `A_S_GATE`, `A_S_KEEPER`, `A_S_WATCH`, `A_W_CAP`, `A_W_MID`, `A_W_NORTH`, `A_W_SOUTH`, `lse-s` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_SOUTH_EAST`

Open connection into dye works. Wet-work material bases turn the corner without a repeated false shopfront. No low hanging line, new post or material curb.

Primary focus: Open connection into dye works. Wet-work material bases turn the corner without a repeated false shopfront..

## Architecture and craftsmanship

**Primary:** Open connection into dye works

**Supporting:** Wet-work material bases turn the corner without a repeated false shopfront.

**Quiet fields and limits:** No low hanging line, new post or material curb.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lse-n` / `ASM_LINK_SOUTH_EAST` | boundary-assembly | `ph_bz04_aged_plaster_ochre`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | South-east link boundary enclosure return |
| `lse-n-part-2` / `BLD_DYERS_WEST` | building | `ph_bz04_aged_plaster_ochre`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of West dye works and shallow market storage; its entrance and floor hierarchy are defined on the principal elevation |
| `lse-e` / `ASM_LINK_SOUTH_EAST` | boundary-assembly | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | South-east link boundary enclosure return |
| `lse-s` / `BLD_A_DYEWORKS` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Dye works compound; its entrance and floor hierarchy are defined on the principal elevation |
| `lse-s-part-2` / `ASM_LINK_SOUTH_EAST` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | South-east link boundary enclosure return |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_DYERS_ALLEY` | `DA_E_SAMPLES`, `DA_E_WORK`, `DA_E_YARD`, `cs-s-part-2`, `da-house`, `da-s`, `da-works`, `lse-n-part-2` | `DA_E_SAMPLES`, `DA_E_WORK`, `DA_E_YARD`, `cs-s-part-2`, `da-house`, `da-s`, `da-works` |
| `ROOF_BUNDLE_UNIT_LINK_SOUTH_EAST` | `lse-e`, `lse-n`, `lse-s-part-2` | none |
| `ROOF_BUNDLE_UNIT_SPAWN_A_COURTYARD` | `A_E_CAP`, `A_E_DRYING`, `A_E_VATS`, `A_S_GATE`, `A_S_KEEPER`, `A_S_WATCH`, `A_W_CAP`, `A_W_MID`, `A_W_NORTH`, `A_W_SOUTH`, `lse-s`, `lsw-s-part-2` | `A_E_CAP`, `A_E_DRYING`, `A_E_VATS`, `A_S_GATE`, `A_S_KEEPER`, `A_S_WATCH`, `A_W_CAP`, `A_W_MID`, `A_W_NORTH`, `A_W_SOUTH`, `lsw-s-part-2` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_WEST_MID`

Fountain-to-caravan transition. Guildhall and service-house corners retain their own materials, heights and correct coping ends. Keep both approaches and the protected mouth readable.

Primary focus: Fountain-to-caravan transition. Guildhall and service-house corners retain their own materials, heights and correct coping ends..

## Architecture and craftsmanship

**Primary:** Fountain-to-caravan transition

**Supporting:** Guildhall and service-house corners retain their own materials, heights and correct coping ends.

**Quiet fields and limits:** Keep both approaches and the protected mouth readable.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lwm-n` / `BLD_MADRASA` | building | `ph_bz04_sandstone_blocks_05`; civic-stepped; CF-ENVELOPE / CF-JOINT | Closed secondary face of Bazaar guildhall; its entrance and floor hierarchy are defined on the principal elevation |
| `lwm-s` / `BLD_MADRASA_SERVICE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Guildhall service house; its entrance and floor hierarchy are defined on the principal elevation |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `tr-s` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_EAST_MID`

Fountain-to-souk transition. Merchant/loggia and corner-house returns share their actual floor and wall finish. No decorative gate or added room in the connector.

Primary focus: Fountain-to-souk transition. Merchant/loggia and corner-house returns share their actual floor and wall finish..

## Architecture and craftsmanship

**Primary:** Fountain-to-souk transition

**Supporting:** Merchant/loggia and corner-house returns share their actual floor and wall finish.

**Quiet fields and limits:** No decorative gate or added room in the connector.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lem-n` / `BLD_FOUNTAIN_HOUSE` | building | `ph_bz04_sandstone_blocks_05`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Merchant corner house; its entrance and floor hierarchy are defined on the principal elevation |
| `lem-s` / `BLD_FOUNTAIN_MERCHANT` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Merchant court building; its entrance and floor hierarchy are defined on the principal elevation |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lwm-n`, `lwm-s`, `tr-s` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_WEST_UPPER`

Tea landing to Rug Gate throat. The narrow merchant gallery return meets its exact roof/coping and stair-side receiver. Keep the 2 m-wide passage free; no rug or prop used to hide an interface.

Primary focus: Tea landing to Rug Gate throat. The narrow merchant gallery return meets its exact roof/coping and stair-side receiver..

## Architecture and craftsmanship

**Primary:** Tea landing to Rug Gate throat

**Supporting:** The narrow merchant gallery return meets its exact roof/coping and stair-side receiver.

**Quiet fields and limits:** Keep the 2 m-wide passage free; no rug or prop used to hide an interface.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lwu-n` / `ASM_LINK_WEST_UPPER` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | West-upper link boundary enclosure return |
| `lwu-s` / `BLD_RUG_MERCHANT` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Rug merchant property; its entrance and floor hierarchy are defined on the principal elevation |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `ts-e`, `tt-rug-return` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_EAST_UPPER`

Covered trade route to North Court. Textile, gatekeeper and bathhouse-store returns keep real ownership at their joints. No cloned screens on blind boundary fields.

Primary focus: Covered trade route to North Court. Textile, gatekeeper and bathhouse-store returns keep real ownership at their joints..

## Architecture and craftsmanship

**Primary:** Covered trade route to North Court

**Supporting:** Textile, gatekeeper and bathhouse-store returns keep real ownership at their joints.

**Quiet fields and limits:** No cloned screens on blind boundary fields.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `leu-n` / `BLD_RUG_EAST_GATEKEEPER` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of East gatekeeper property; its entrance and floor hierarchy are defined on the principal elevation |
| `leu-n-part-2` / `BLD_HAMMAM_STORES` | building | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Hammam service house; its entrance and floor hierarchy are defined on the principal elevation |
| `leu-s` / `BLD_TEXTILE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of East textile works; its entrance and floor hierarchy are defined on the principal elevation |
| `leu-s-part-2` / `ASM_LINK_EAST_UPPER` | boundary-assembly | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | East-upper link boundary enclosure return |
| `leu-s-part-3` / `BLD_HAMMAM` | building | `ph_bz04_sandstone_blocks_05`; civic-stepped; CF-ENVELOPE / CF-JOINT | Closed secondary face of North Court hammam; its entrance and floor hierarchy are defined on the principal elevation |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_LINK_EAST_UPPER` | `leu-s-part-2` | none |
| `ROOF_BUNDLE_UNIT_NORTH_COURT` | `leu-n-part-2`, `leu-s-part-3`, `lne-e`, `lne-s`, `nc-eh`, `nc-ey`, `nc-n`, `nc-wn`, `nc-ws` | `lne-e`, `lne-s`, `nc-eh`, `nc-ey`, `nc-n`, `nc-wn`, `nc-ws` |
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` |
| `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `leu-s`, `tr-e`, `tt-e` | `F_NE`, `F_NW`, `R_E_SOUTH`, `R_S_CAP`, `T_E_CART`, `T_E_GALLERY`, `T_E_LOOM`, `T_N_CAP`, `T_W_DYER`, `T_W_FOLDS`, `T_W_LOOM`, `tr-e`, `tt-e` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_NORTH_WEST`

B courtyard to northern service route. The B guest-house return meets the low service boundary and grade honestly. Preserve the open mouth; no added bench or curtain.

Primary focus: B courtyard to northern service route. The B guest-house return meets the low service boundary and grade honestly..

## Architecture and craftsmanship

**Primary:** B courtyard to northern service route

**Supporting:** The B guest-house return meets the low service boundary and grade honestly.

**Quiet fields and limits:** Preserve the open mouth; no added bench or curtain.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lnw-n` / `ASM_LINK_NORTH_WEST` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | North-west link boundary enclosure return |
| `lnw-n-part-2` / `BLD_B_W_HOUSE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Guest house; its entrance and floor hierarchy are defined on the principal elevation |
| `lnw-e` / `ASM_LINK_NORTH_WEST` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | North-west link boundary enclosure return |
| `lnw-s` / `ASM_LINK_NORTH_WEST` | boundary-assembly | `ph_bz04_beige_wall_002`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | North-west link boundary enclosure return |
| `lnw-w` / `ASM_LINK_NORTH_WEST` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | North-west link boundary enclosure return |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_LINK_NORTH_WEST` | `lnw-n`, `lnw-s`, `lnw-w` | none |
| `ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD` | `B_E_PACKER`, `B_E_STORE`, `B_N_HOUSE`, `B_N_POTTER`, `B_N_TEXTILE`, `B_W_HOUSE`, `B_W_TEA`, `lne-n`, `lnw-n-part-2` | `B_E_PACKER`, `B_E_STORE`, `B_N_HOUSE`, `B_N_POTTER`, `B_N_TEXTILE`, `B_W_HOUSE`, `B_W_TEA`, `lne-n` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### `LINK_NORTH_EAST`

B courtyard to North Court. Receiving-store and gatekeeper returns frame the opening with their actual material and roof ownership. No loose stock or false frontage inside the link.

Primary focus: B courtyard to North Court. Receiving-store and gatekeeper returns frame the opening with their actual material and roof ownership..

## Architecture and craftsmanship

**Primary:** B courtyard to North Court

**Supporting:** Receiving-store and gatekeeper returns frame the opening with their actual material and roof ownership.

**Quiet fields and limits:** No loose stock or false frontage inside the link.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `lne-n` / `BLD_B_E_STORE` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Receiving store with upper stock rooms; its entrance and floor hierarchy are defined on the principal elevation |
| `lne-n-part-2` / `ASM_LINK_NORTH_EAST` | boundary-assembly | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | North-east link boundary enclosure return |
| `lne-e` / `BLD_NORTH_DYERS_COMPOUND` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of North drying-yard compound; its entrance and floor hierarchy are defined on the principal elevation |
| `lne-s` / `BLD_HAMMAM_STORES` | building | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Hammam service house; its entrance and floor hierarchy are defined on the principal elevation |
| `lne-w` / `BLD_RUG_EAST_GATEKEEPER` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of East gatekeeper property; its entrance and floor hierarchy are defined on the principal elevation |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_LINK_NORTH_EAST` | `lne-n-part-2` | none |
| `ROOF_BUNDLE_UNIT_NORTH_COURT` | `leu-n-part-2`, `leu-s-part-3`, `lne-e`, `lne-s`, `nc-eh`, `nc-ey`, `nc-n`, `nc-wn`, `nc-ws` | `leu-n-part-2`, `leu-s-part-3`, `nc-eh`, `nc-ey`, `nc-n`, `nc-wn`, `nc-ws` |
| `ROOF_BUNDLE_UNIT_RUG_GATE` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lne-w`, `lwu-s`, `ts-e`, `tt-rug-return` | `B_S_EAST`, `B_S_WEST`, `R_E_HOUSE`, `R_W_ABUTMENT`, `R_W_MERCHANT`, `leu-n`, `lwu-s`, `ts-e`, `tt-rug-return` |
| `ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD` | `B_E_PACKER`, `B_E_STORE`, `B_N_HOUSE`, `B_N_POTTER`, `B_N_TEXTILE`, `B_W_HOUSE`, `B_W_TEA`, `lne-n`, `lnw-n-part-2` | `B_E_PACKER`, `B_E_STORE`, `B_N_HOUSE`, `B_N_POTTER`, `B_N_TEXTILE`, `B_W_HOUSE`, `B_W_TEA`, `lnw-n-part-2` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `LINK_SOUTH_WEST` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..17 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..17 | collider-backed solid | COLLIDER_WALL_009 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lsw-n` | 10..13.6 | (10, 13, 13.6, 13.5) | Closed secondary face of Spice south service compound; its entrance and floor hierarchy are defined on the principal elevation | 4.9 | 0.5 | `ph_bz04_plastered_wall` | slab 4.9..5.08; parapet 5.53; cap 5.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `lsw-n-part-2` | 13.6..17 | (13.6, 13, 17, 13.5) | South-west link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_plastered_wall` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_SOUTH_WEST` · `east`

Quiet background: open y=8..13.

Protected wall interval: **8..13 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 8..13 | **ZERO BUILD protected opening** | SPAWN_A_COURTYARD |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_SOUTH_WEST` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..17 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..17 | collider-backed solid | COLLIDER_WALL_005 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lsw-s` | 10..13.9 | (10, 7.5, 13.9, 8) | South-west link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_plastered_wall` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `lsw-s-part-2` | 13.9..17 | (13.9, 7.5, 17, 8) | Closed secondary face of Stepped court-facing domestic rear; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.5 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_SOUTH_WEST` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **8..13 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 8..10 | collider-backed solid | COLLIDER_WALL_050 |
| 10..13 | **ZERO BUILD protected opening** | SERVICE_SOUTH |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lsw-w` | 8..10 | (9.5, 8, 10, 10) | South-west link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_plastered_wall` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_SOUTH_EAST` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **39..46 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 39..46 | collider-backed solid | COLLIDER_WALL_010 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lse-n` | 39..42.4 | (39, 13, 42.4, 13.5) | South-east link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_aged_plaster_ochre` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `lse-n-part-2` | 42.4..46 | (42.4, 13, 46, 13.5) | Closed secondary face of West dye works and shallow market storage; its entrance and floor hierarchy are defined on the principal elevation | 7 | 0.5 | `ph_bz04_aged_plaster_ochre` | slab 7..7.18; parapet 7.63; cap 7.73; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_SOUTH_EAST` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **8..13 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 8..10 | collider-backed solid | COLLIDER_WALL_121 |
| 10..13 | **ZERO BUILD protected opening** | DYERS_ALLEY |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lse-e` | 8..10 | (46, 8, 46.5, 10) | South-east link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_aged_plaster_ochre` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_SOUTH_EAST` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **39..46 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 39..46 | collider-backed solid | COLLIDER_WALL_006 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lse-s` | 39..42.2 | (39, 7.5, 42.2, 8) | Closed secondary face of Dye works compound; its entrance and floor hierarchy are defined on the principal elevation | 10.2 | 0.5 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `lse-s-part-2` | 42.2..46 | (42.2, 7.5, 46, 8) | South-east link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_aged_plaster_ochre` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_SOUTH_EAST` · `west`

Quiet background: open y=8..13.

Protected wall interval: **8..13 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 8..13 | **ZERO BUILD protected opening** | SPAWN_A_COURTYARD |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_WEST_MID` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **15..20 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 15..20 | collider-backed solid | COLLIDER_WALL_019 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lwm-n` | 15..20 | (15, 41, 20, 41.5) | Closed secondary face of Bazaar guildhall; its entrance and floor hierarchy are defined on the principal elevation | 11.4 | 0.5 | `ph_bz04_sandstone_blocks_05` | slab 11.4..11.58; parapet 12.03; cap 12.13; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_WEST_MID` · `east`

Quiet background: open y=36..41.

Protected wall interval: **36..41 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 36..41 | **ZERO BUILD protected opening** | FOUNTAIN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_WEST_MID` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **15..20 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 15..20 | collider-backed solid | COLLIDER_WALL_017 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lwm-s` | 15..20 | (15, 35.5, 20, 36) | Closed secondary face of Guildhall service house; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.5 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_WEST_MID` · `west`

Quiet background: open y=36..41.

Protected wall interval: **36..41 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 36..41 | **ZERO BUILD protected opening** | CARAVAN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_EAST_MID` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **36..41 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 36..41 | collider-backed solid | COLLIDER_WALL_020 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lem-n` | 36..41 | (36, 44, 41, 44.6) | Closed secondary face of Merchant corner house; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_aged_plaster_ochre` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_EAST_MID` · `east`

Quiet background: open y=39..44.

Protected wall interval: **39..44 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 39..44 | **ZERO BUILD protected opening** | COVERED_SOUK |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_EAST_MID` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **36..41 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 36..41 | collider-backed solid | COLLIDER_WALL_018 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lem-s` | 36..41 | (36, 38.4, 41, 39) | Closed secondary face of Merchant court building; its entrance and floor hierarchy are defined on the principal elevation | 10.9 | 0.6 | `ph_bz04_beige_wall_002` | slab 10.9..11.08; parapet 11.53; cap 11.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_EAST_MID` · `west`

Quiet background: open y=39..44.

Protected wall interval: **39..44 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 39..44 | **ZERO BUILD protected opening** | FOUNTAIN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_WEST_UPPER` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **19..21 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 19..21 | collider-backed solid | COLLIDER_WALL_035 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lwu-n` | 19..21 | (19, 76.5, 21, 77) | West-upper link boundary enclosure return | 4.5 | 0.5 | `ph_bz04_sandstone_blocks_05` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_WEST_UPPER` · `east`

Quiet background: open y=72..76.5.

Protected wall interval: **72..76.5 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 72..76.5 | **ZERO BUILD protected opening** | RUG_GATE |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_WEST_UPPER` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **19..21 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 19..21 | collider-backed solid | COLLIDER_WALL_030 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lwu-s` | 19..21 | (19, 71.5, 21, 72) | Closed secondary face of Rug merchant property; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.5 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_WEST_UPPER` · `west`

Quiet background: open y=72..76.5.

Protected wall interval: **72..76.5 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 72..76.5 | **ZERO BUILD protected opening** | TEA_LANDING |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_EAST_UPPER` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **34..41 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 34..41 | collider-backed solid | COLLIDER_WALL_031 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `leu-n` | 34..37.5 | (34, 72, 37.5, 72.6) | Closed secondary face of East gatekeeper property; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `leu-n-part-2` | 37.5..41 | (37.5, 72, 41, 72.6) | Closed secondary face of Hammam service house; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_EAST_UPPER` · `east`

Quiet background: open y=67..72.

Protected wall interval: **67..72 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 67..72 | **ZERO BUILD protected opening** | NORTH_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_EAST_UPPER` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **34..41 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 34..41 | collider-backed solid | COLLIDER_WALL_029 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `leu-s` | 34..37 | (34, 66.4, 37, 67) | Closed secondary face of East textile works; its entrance and floor hierarchy are defined on the principal elevation | 10.2 | 0.6 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `leu-s-part-2` | 37..38 | (37, 66.4, 38, 67) | East-upper link boundary enclosure return | 7 | 0.6 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `leu-s-part-3` | 38..41 | (38, 66.4, 41, 67) | Closed secondary face of North Court hammam; its entrance and floor hierarchy are defined on the principal elevation | 9.8 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 9.8..9.98; parapet 10.43; cap 10.53; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_EAST_UPPER` · `west`

Quiet background: open y=67..72.

Protected wall interval: **67..72 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 67..72 | **ZERO BUILD protected opening** | RUG_GATE |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `LINK_NORTH_WEST` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..17 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..17 | collider-backed solid | COLLIDER_WALL_040 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lnw-n` | 10..13.4 | (10, 81, 13.4, 81.7) | North-west link boundary enclosure return | 7 | 0.7 | `ph_bz04_sandstone_blocks_05` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `lnw-n-part-2` | 13.4..17 | (13.4, 81, 17, 81.7) | Closed secondary face of Guest house; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.7 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_WEST` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **76..81 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 76.5..78 | collider-backed solid | COLLIDER_WALL_079 |
| 76..76.5 | **ZERO BUILD protected opening** | TEA_LANDING |
| 78..81 | **ZERO BUILD protected opening** | SPAWN_B_COURTYARD |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lnw-e` | 76.5..78 | (17, 76.5, 17.6, 78) | North-west link boundary enclosure return | 7 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_WEST` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..17 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..11 | collider-backed solid | COLLIDER_WALL_032 |
| 11..17 | **ZERO BUILD protected opening** | TEA_LANDING |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lnw-s` | 10..11 | (10, 75.4, 11, 76) | North-west link boundary enclosure return | 7 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_WEST` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **76..81 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 80..81 | collider-backed solid | COLLIDER_WALL_051 |
| 76..80 | **ZERO BUILD protected opening** | SERVICE_NORTH |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lnw-w` | 80..81 | (9.4, 80, 10, 81) | North-west link boundary enclosure return | 7 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_EAST` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **39..46 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 39..46 | collider-backed solid | COLLIDER_WALL_041 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lne-n` | 39..42.6 | (39, 81, 42.6, 81.7) | Closed secondary face of Receiving store with upper stock rooms; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.7 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `lne-n-part-2` | 42.6..46 | (42.6, 81, 46, 81.7) | North-east link boundary enclosure return | 7 | 0.7 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_EAST` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **76..81 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 80..81 | collider-backed solid | COLLIDER_WALL_122 |
| 76..80 | **ZERO BUILD protected opening** | NORTH_COURT |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lne-e` | 80..81 | (46, 80, 46.6, 81) | Closed secondary face of North drying-yard compound; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_EAST` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **39..46 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 39..41 | collider-backed solid | COLLIDER_WALL_033 |
| 41..46 | **ZERO BUILD protected opening** | NORTH_COURT |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lne-s` | 39..41 | (39, 75.4, 41, 76) | Closed secondary face of Hammam service house; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `LINK_NORTH_EAST` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **76..81 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 76..78 | collider-backed solid | COLLIDER_WALL_111 |
| 78..81 | **ZERO BUILD protected opening** | SPAWN_B_COURTYARD |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `lne-w` | 76..78 | (38.4, 76, 39, 78) | Closed secondary face of East gatekeeper property; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `LINK_SOUTH_WEST` floor | `bz04_large_sandstone_blocks_01` | {'receiver': 'bz04_large_sandstone_blocks_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_SOUTH_WEST-CLEAR', 'x': 10, 'y': 8.75, 'w': 7, 'h': 3.5, 'heightM': 2.2, 'floorSource': 'LINK_SOUTH_WEST'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_SOUTH_EAST` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_SOUTH_EAST-CLEAR', 'x': 39, 'y': 8.75, 'w': 7, 'h': 3.5, 'heightM': 2.2, 'floorSource': 'LINK_SOUTH_EAST'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_WEST_MID` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_WEST_MID-CLEAR', 'x': 15.75, 'y': 36, 'w': 3.5, 'h': 5, 'heightM': 2.2, 'floorSource': 'LINK_WEST_MID'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_EAST_MID` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_EAST_MID-CLEAR', 'x': 36.75, 'y': 39, 'w': 3.5, 'h': 5, 'heightM': 2.2, 'floorSource': 'LINK_EAST_MID'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_WEST_UPPER` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_WEST_UPPER-CLEAR', 'x': 19, 'y': 72, 'w': 2, 'h': 4.5, 'heightM': 2.2, 'floorSource': 'LINK_WEST_UPPER'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_EAST_UPPER` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_EAST_UPPER-CLEAR', 'x': 34, 'y': 67.75, 'w': 7, 'h': 3.5, 'heightM': 2.2, 'floorSource': 'LINK_EAST_UPPER'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_NORTH_WEST` floor | `bz04_large_sandstone_blocks_01` | {'receiver': 'bz04_large_sandstone_blocks_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_NORTH_WEST-CLEAR', 'x': 10, 'y': 76.75, 'w': 7, 'h': 3.5, 'heightM': 2.2, 'floorSource': 'LINK_NORTH_WEST'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
| `LINK_NORTH_EAST` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'LINK_NORTH_EAST-CLEAR', 'x': 39, 'y': 76.75, 'w': 7, 'h': 3.5, 'heightM': 2.2, 'floorSource': 'LINK_NORTH_EAST'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `LINK_SOUTH_WEST` | `LINK_SOUTH_WEST-CLEAR` | **CLEAR ROUTE** | (10, 8.75) → (17, 12.25) | Protected empty region | Do not place geometry |
| `LINK_SOUTH_EAST` | `LINK_SOUTH_EAST-CLEAR` | **CLEAR ROUTE** | (39, 8.75) → (46, 12.25) | Protected empty region | Do not place geometry |
| `LINK_WEST_MID` | `LINK_WEST_MID-CLEAR` | **CLEAR ROUTE** | (15.75, 36) → (19.25, 41) | Protected empty region | Do not place geometry |
| `LINK_EAST_MID` | `LINK_EAST_MID-CLEAR` | **CLEAR ROUTE** | (36.75, 39) → (40.25, 44) | Protected empty region | Do not place geometry |
| `LINK_WEST_UPPER` | `LINK_WEST_UPPER-CLEAR` | **CLEAR ROUTE** | (19, 72) → (21, 76.5) | Protected empty region | Do not place geometry |
| `LINK_EAST_UPPER` | `LINK_EAST_UPPER-CLEAR` | **CLEAR ROUTE** | (34, 67.75) → (41, 71.25) | Protected empty region | Do not place geometry |
| `LINK_NORTH_WEST` | `LINK_NORTH_WEST-CLEAR` | **CLEAR ROUTE** | (10, 76.75) → (17, 80.25) | Protected empty region | Do not place geometry |
| `LINK_NORTH_EAST` | `LINK_NORTH_EAST-CLEAR` | **CLEAR ROUTE** | (39, 76.75) → (46, 80.25) | Protected empty region | Do not place geometry |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `LINK_SOUTH_WEST` | 5000 | 6 | 6 | 5 |
| `LINK_SOUTH_EAST` | 5000 | 7 | 7 | 6 |
| `LINK_WEST_MID` | 5000 | 4 | 4 | 3 |
| `LINK_EAST_MID` | 5000 | 4 | 4 | 3 |
| `LINK_WEST_UPPER` | 5000 | 5 | 5 | 4 |
| `LINK_EAST_UPPER` | 5000 | 6 | 6 | 5 |
| `LINK_NORTH_WEST` | 5000 | 5 | 5 | 4 |
| `LINK_NORTH_EAST` | 5000 | 6 | 6 | 5 |

Section origin (design coordinates): `{'x': 10, 'y': 8, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.6999999999999993, -0.02, -0.7000000000000002], 'max': [7.199999999999999, 9.92, 5.699999999999999]}`.
Required bindings: `bz04_large_sandstone_blocks_01`, `ph_bz04_beige_wall_002`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 39, 'y': 8, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.20000000000000284, -0.02, -0.7000000000000002], 'max': [7.700000000000003, 10.219999999999999, 5.699999999999999]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_aged_plaster_ochre`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 15, 'y': 36, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.1999999999999993, -0.02, -0.7000000000000028], 'max': [5.199999999999999, 11.42, 5.700000000000003]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_beige_wall_002`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 36, 'y': 39, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.20000000000000284, -0.02, -0.8000000000000043], 'max': [5.200000000000003, 10.92, 5.800000000000004]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_aged_plaster_ochre`, `ph_bz04_beige_wall_002`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 19, 'y': 72, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.1999999999999993, -0.02, -0.7000000000000028], 'max': [2.1999999999999993, 9.92, 5.200000000000003]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_painted_plaster_warm`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 34, 'y': 67, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.20000000000000284, -0.02, -0.7999999999999972], 'max': [7.200000000000003, 10.219999999999999, 5.799999999999997]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 10, 'y': 76, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.7999999999999989, -0.02, -0.7999999999999972], 'max': [7.800000000000001, 9.92, 5.900000000000006]}`.
Required bindings: `bz04_large_sandstone_blocks_01`, `ph_bz04_beige_wall_002`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


Section origin (design coordinates): `{'x': 39, 'y': 76, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-0.8000000000000043, -0.02, -0.7999999999999972], 'max': [7.800000000000004, 9.92, 5.900000000000006]}`.
Required bindings: `bz04_court_limestone_flags_01`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `LINK_SOUTH_WEST-travel-reverse` | `LINK_SOUTH_WEST` | (16.35, 10.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_SOUTH_WEST-travel-forward` | `LINK_SOUTH_WEST` | (10.65, 10.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_SOUTH_WEST-north-lsw-n_lsw-n-part-2-s1-base` | `LINK_SOUTH_WEST` | (13.5, 8.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_SOUTH_WEST-south-lsw-s_lsw-s-part-2-s1-base` | `LINK_SOUTH_WEST` | (13.5, 12.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_SOUTH_WEST-south-lsw-s_lsw-s-part-2-s1-upper` | `LINK_SOUTH_WEST` | (13.5, 12.65, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_SOUTH_WEST-west-lsw-w-s1-base` | `LINK_SOUTH_WEST` | (16.65, 9, 1.7) | 90° / 2.07° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_SOUTH_EAST-travel-reverse` | `LINK_SOUTH_EAST` | (45.35, 10.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_SOUTH_EAST-travel-forward` | `LINK_SOUTH_EAST` | (39.65, 10.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_SOUTH_EAST-north-lse-n_lse-n-part-2-s1-base` | `LINK_SOUTH_EAST` | (42.5, 8.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_SOUTH_EAST-north-lse-n_lse-n-part-2-s1-upper` | `LINK_SOUTH_EAST` | (42.5, 8.35, 1.7) | 180° / 49.684° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_SOUTH_EAST-east-lse-e-s1-base` | `LINK_SOUTH_EAST` | (39.35, 9, 1.7) | 270° / 2.07° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_SOUTH_EAST-south-lse-s_lse-s-part-2-s1-base` | `LINK_SOUTH_EAST` | (42.5, 12.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_SOUTH_EAST-south-lse-s_lse-s-part-2-s1-upper` | `LINK_SOUTH_EAST` | (42.5, 12.65, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_WEST_MID-travel-reverse` | `LINK_WEST_MID` | (19.35, 38.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_WEST_MID-travel-forward` | `LINK_WEST_MID` | (15.65, 38.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_WEST_MID-north-lwm-n-s1-base` | `LINK_WEST_MID` | (17.5, 36.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_WEST_MID-north-lwm-n-s1-upper` | `LINK_WEST_MID` | (17.5, 36.35, 1.7) | 180° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_WEST_MID-south-lwm-s-s1-base` | `LINK_WEST_MID` | (17.5, 40.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_WEST_MID-south-lwm-s-s1-upper` | `LINK_WEST_MID` | (17.5, 40.65, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_EAST_MID-travel-reverse` | `LINK_EAST_MID` | (40.35, 41.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_EAST_MID-travel-forward` | `LINK_EAST_MID` | (36.65, 41.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_EAST_MID-north-lem-n-s1-base` | `LINK_EAST_MID` | (38.5, 39.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_EAST_MID-north-lem-n-s1-upper` | `LINK_EAST_MID` | (38.5, 39.35, 1.7) | 180° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_EAST_MID-south-lem-s-s1-base` | `LINK_EAST_MID` | (38.5, 43.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_EAST_MID-south-lem-s-s1-upper` | `LINK_EAST_MID` | (38.5, 43.65, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_WEST_UPPER-travel-reverse` | `LINK_WEST_UPPER` | (20.35, 74.25, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_WEST_UPPER-travel-forward` | `LINK_WEST_UPPER` | (19.65, 74.25, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_WEST_UPPER-north-lwu-n-s1-base` | `LINK_WEST_UPPER` | (20, 72.35, 1.7) | 180° / 3.315° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_WEST_UPPER-south-lwu-s-s1-base` | `LINK_WEST_UPPER` | (20, 76.15, 1.7) | 0° / 6.87° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_WEST_UPPER-south-lwu-s-s1-upper` | `LINK_WEST_UPPER` | (20, 76.15, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_EAST_UPPER-travel-reverse` | `LINK_EAST_UPPER` | (40.35, 69.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_EAST_UPPER-travel-forward` | `LINK_EAST_UPPER` | (34.65, 69.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_EAST_UPPER-north-leu-n_leu-n-part-2-s1-base` | `LINK_EAST_UPPER` | (37.5, 67.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_EAST_UPPER-north-leu-n_leu-n-part-2-s1-upper` | `LINK_EAST_UPPER` | (37.5, 67.35, 1.7) | 180° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_EAST_UPPER-south-leu-s_leu-s-part-2_leu-s-part-3-s1-base` | `LINK_EAST_UPPER` | (37.5, 71.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_EAST_UPPER-south-leu-s_leu-s-part-2_leu-s-part-3-s1-upper` | `LINK_EAST_UPPER` | (37.5, 71.65, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_NORTH_WEST-travel-reverse` | `LINK_NORTH_WEST` | (16.35, 78.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_NORTH_WEST-travel-forward` | `LINK_NORTH_WEST` | (10.65, 78.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_NORTH_WEST-north-lnw-n_lnw-n-part-2-s1-base` | `LINK_NORTH_WEST` | (13.5, 76.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_WEST-north-lnw-n_lnw-n-part-2-s1-upper` | `LINK_NORTH_WEST` | (13.5, 76.35, 1.7) | 180° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_NORTH_WEST-east-lnw-e-s1-base` | `LINK_NORTH_WEST` | (10.35, 77.25, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_WEST-south-lnw-s-s1-base` | `LINK_NORTH_WEST` | (10.5, 80.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_WEST-south-lnw-s-s1-upper` | `LINK_NORTH_WEST` | (10.5, 80.65, 1.7) | 0° / 46.324° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_NORTH_WEST-west-lnw-w-s1-base` | `LINK_NORTH_WEST` | (16.65, 80.5, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_EAST-travel-reverse` | `LINK_NORTH_EAST` | (45.35, 78.5, 1.7) | 90° / 0° / 75° | Reverse arrival and district transition |
| `LINK_NORTH_EAST-travel-forward` | `LINK_NORTH_EAST` | (39.65, 78.5, 1.7) | 270° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `LINK_NORTH_EAST-north-lne-n_lne-n-part-2-s1-base` | `LINK_NORTH_EAST` | (42.5, 76.35, 1.7) | 180° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_EAST-north-lne-n_lne-n-part-2-s1-upper` | `LINK_NORTH_EAST` | (42.5, 76.35, 1.7) | 180° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_NORTH_EAST-east-lne-e-s1-base` | `LINK_NORTH_EAST` | (39.35, 80.5, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_EAST-east-lne-e-s1-upper` | `LINK_NORTH_EAST` | (39.35, 80.5, 1.7) | 270° / 51.566° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_NORTH_EAST-south-lne-s-s1-base` | `LINK_NORTH_EAST` | (40, 80.65, 1.7) | 0° / 6.137° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_EAST-south-lne-s-s1-upper` | `LINK_NORTH_EAST` | (40, 80.65, 1.7) | 0° / 52° / 75° | upper facade, parapet and roof-step coverage |
| `LINK_NORTH_EAST-west-lne-w-s1-base` | `LINK_NORTH_EAST` | (45.65, 77, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `LINK_NORTH_EAST-west-lne-w-s1-upper` | `LINK_NORTH_EAST` | (45.65, 77, 1.7) | 90° / 51.566° / 75° | upper facade, parapet and roof-step coverage |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_SOUTH_WEST` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_SOUTH_EAST` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_WEST_MID` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_EAST_MID` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_WEST_UPPER` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_EAST_UPPER` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_NORTH_WEST` | Must remain coordinated with owner | No duplicate landmark or filled route opening |
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `LINK_NORTH_EAST` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `LINK_SOUTH_WEST` cells: `ROOF_CELL_015`, `ROOF_CELL_016`, `ROOF_CELL_017`, `ROOF_CELL_029`, `ROOF_CELL_030`, `ROOF_CELL_031`, `ROOF_CELL_070`.
- `LINK_SOUTH_WEST` bundles: `ROOF_BUNDLE_UNIT_LINK_SOUTH_WEST`, `ROOF_BUNDLE_UNIT_SERVICE_SOUTH`, `ROOF_BUNDLE_UNIT_SPAWN_A_COURTYARD`.
- `LINK_SOUTH_WEST` interfaces: `ROOF_INTERFACE_ROOF_STEP_003`, `ROOF_INTERFACE_ROOF_STEP_004`, `ROOF_INTERFACE_ROOF_STEP_018`, `ROOF_INTERFACE_ROOF_STEP_019`, `ROOF_INTERFACE_ROOF_STEP_022`.
- `LINK_SOUTH_EAST` cells: `ROOF_CELL_012`, `ROOF_CELL_013`, `ROOF_CELL_014`, `ROOF_CELL_032`, `ROOF_CELL_033`, `ROOF_CELL_052`.
- `LINK_SOUTH_EAST` bundles: `ROOF_BUNDLE_UNIT_DYERS_ALLEY`, `ROOF_BUNDLE_UNIT_LINK_SOUTH_EAST`, `ROOF_BUNDLE_UNIT_SPAWN_A_COURTYARD`.
- `LINK_SOUTH_EAST` interfaces: `ROOF_INTERFACE_ROOF_SEAM_026`, `ROOF_INTERFACE_ROOF_STEP_041`, `ROOF_INTERFACE_ROOF_STEP_043`, `ROOF_INTERFACE_ROOF_STEP_044`, `ROOF_INTERFACE_ROOF_STEP_047`.
- `LINK_WEST_MID` cells: `ROOF_CELL_058`, `ROOF_CELL_059`.
- `LINK_WEST_MID` bundles: `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT`.
- `LINK_WEST_MID` interfaces: No cross-bundle interface.
- `LINK_EAST_MID` cells: `ROOF_CELL_054`, `ROOF_CELL_055`.
- `LINK_EAST_MID` bundles: `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT`.
- `LINK_EAST_MID` interfaces: No cross-bundle interface.
- `LINK_WEST_UPPER` cells: `ROOF_CELL_066`.
- `LINK_WEST_UPPER` bundles: `ROOF_BUNDLE_UNIT_RUG_GATE`.
- `LINK_WEST_UPPER` interfaces: No cross-bundle interface.
- `LINK_EAST_UPPER` cells: `ROOF_CELL_007`, `ROOF_CELL_056`, `ROOF_CELL_057`, `ROOF_CELL_064`, `ROOF_CELL_074`, `ROOF_CELL_075`.
- `LINK_EAST_UPPER` bundles: `ROOF_BUNDLE_UNIT_LINK_EAST_UPPER`, `ROOF_BUNDLE_UNIT_NORTH_COURT`, `ROOF_BUNDLE_UNIT_RUG_GATE`, `ROOF_BUNDLE_UNIT_TEXTILE_ARCADE`.
- `LINK_EAST_UPPER` interfaces: `ROOF_INTERFACE_ROOF_STEP_038`, `ROOF_INTERFACE_ROOF_STEP_039`.
- `LINK_NORTH_WEST` cells: `ROOF_CELL_009`, `ROOF_CELL_010`, `ROOF_CELL_011`, `ROOF_CELL_045`.
- `LINK_NORTH_WEST` bundles: `ROOF_BUNDLE_UNIT_LINK_NORTH_WEST`, `ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD`.
- `LINK_NORTH_WEST` interfaces: `ROOF_INTERFACE_ROOF_SEAM_001`, `ROOF_INTERFACE_ROOF_SEAM_005`, `ROOF_INTERFACE_ROOF_STEP_006`, `ROOF_INTERFACE_ROOF_STEP_017`.
- `LINK_NORTH_EAST` cells: `ROOF_CELL_008`, `ROOF_CELL_041`, `ROOF_CELL_057`, `ROOF_CELL_060`, `ROOF_CELL_065`.
- `LINK_NORTH_EAST` bundles: `ROOF_BUNDLE_UNIT_LINK_NORTH_EAST`, `ROOF_BUNDLE_UNIT_NORTH_COURT`, `ROOF_BUNDLE_UNIT_RUG_GATE`, `ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD`.
- `LINK_NORTH_EAST` interfaces: `ROOF_INTERFACE_ROOF_STEP_049`, `ROOF_INTERFACE_ROOF_STEP_050`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_aged_plaster_ochre` | `ph_aged_plaster_ochre` | <span style="color:#c6a16c">■</span> `#c6a16c` | 2 / 0.28 / 0.93 / 1 |
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `ARCH_FRONTAGE_LINK_NORTH_EAST_NORTH_GROUND_01` | `LINK_NORTH_EAST` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_LINK_NORTH_EAST_NORTH_MASSING` | `LINK_NORTH_EAST` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_BAY_NICHE_AXIS` | `LINK_NORTH_WEST` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_MASSING` | `LINK_NORTH_WEST` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_LINK_EAST_MID_north` | `LINK_EAST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_MID_east` | `LINK_EAST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_MID_south` | `LINK_EAST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_MID_west` | `LINK_EAST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_UPPER_north` | `LINK_EAST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_UPPER_east` | `LINK_EAST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_UPPER_south` | `LINK_EAST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_EAST_UPPER_west` | `LINK_EAST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_EAST_north` | `LINK_NORTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_EAST_east` | `LINK_NORTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_EAST_south` | `LINK_NORTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_EAST_west` | `LINK_NORTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_WEST_north` | `LINK_NORTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_WEST_east` | `LINK_NORTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_WEST_south` | `LINK_NORTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_NORTH_WEST_west` | `LINK_NORTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_EAST_north` | `LINK_SOUTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_EAST_east` | `LINK_SOUTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_EAST_south` | `LINK_SOUTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_EAST_west` | `LINK_SOUTH_EAST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_WEST_north` | `LINK_SOUTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_WEST_east` | `LINK_SOUTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_WEST_south` | `LINK_SOUTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_SOUTH_WEST_west` | `LINK_SOUTH_WEST` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_MID_north` | `LINK_WEST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_MID_east` | `LINK_WEST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_MID_south` | `LINK_WEST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_MID_west` | `LINK_WEST_MID` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_UPPER_north` | `LINK_WEST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_UPPER_east` | `LINK_WEST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_UPPER_south` | `LINK_WEST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_LINK_WEST_UPPER_west` | `LINK_WEST_UPPER` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [LINK_SOUTH_WEST dimensioned plan](drawings/link_south_west-plan.svg), [LINK_SOUTH_WEST four elevations](drawings/link_south_west-elevations.svg), and [LINK_SOUTH_WEST roof axonometric](drawings/link_south_west-axon.svg)
- [LINK_SOUTH_EAST dimensioned plan](drawings/link_south_east-plan.svg), [LINK_SOUTH_EAST four elevations](drawings/link_south_east-elevations.svg), and [LINK_SOUTH_EAST roof axonometric](drawings/link_south_east-axon.svg)
- [LINK_WEST_MID dimensioned plan](drawings/link_west_mid-plan.svg), [LINK_WEST_MID four elevations](drawings/link_west_mid-elevations.svg), and [LINK_WEST_MID roof axonometric](drawings/link_west_mid-axon.svg)
- [LINK_EAST_MID dimensioned plan](drawings/link_east_mid-plan.svg), [LINK_EAST_MID four elevations](drawings/link_east_mid-elevations.svg), and [LINK_EAST_MID roof axonometric](drawings/link_east_mid-axon.svg)
- [LINK_WEST_UPPER dimensioned plan](drawings/link_west_upper-plan.svg), [LINK_WEST_UPPER four elevations](drawings/link_west_upper-elevations.svg), and [LINK_WEST_UPPER roof axonometric](drawings/link_west_upper-axon.svg)
- [LINK_EAST_UPPER dimensioned plan](drawings/link_east_upper-plan.svg), [LINK_EAST_UPPER four elevations](drawings/link_east_upper-elevations.svg), and [LINK_EAST_UPPER roof axonometric](drawings/link_east_upper-axon.svg)
- [LINK_NORTH_WEST dimensioned plan](drawings/link_north_west-plan.svg), [LINK_NORTH_WEST four elevations](drawings/link_north_west-elevations.svg), and [LINK_NORTH_WEST roof axonometric](drawings/link_north_west-axon.svg)
- [LINK_NORTH_EAST dimensioned plan](drawings/link_north_east-plan.svg), [LINK_NORTH_EAST four elevations](drawings/link_north_east-elevations.svg), and [LINK_NORTH_EAST roof axonometric](drawings/link_north_east-axon.svg)
- [Master plan](drawings/master-plan.svg)
