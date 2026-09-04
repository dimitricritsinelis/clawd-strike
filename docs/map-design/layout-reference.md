# Bazaar Map v3 — Compiled Layout Reference

Generated from `docs/map-design/specs/map_spec.json` through the shared v3 compiler. Runtime and this reference consume the same absolute placements; this document performs no facade or material inference.

- Format: `3.0`
- Zones: 25
- Frontages: 34
- Architecture placements: 150
- Dressing placements: 126

## Facade Profiles

### `active_merchant` — Sun-lime active merchant frontage

- Family: `active_merchant`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_painted_plaster_warm`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `shop_recess_market`, `door_shop_timber`, `window_shuttered`, `window_screened`, `pilaster_facade`

### `active_merchant_ochre` — Aged-ochre active merchant frontage

- Family: `active_merchant`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_beige_wall_002`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_sun`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`
- Modules: `shop_recess_market`, `door_shop_timber`, `window_shuttered`, `window_screened`, `pilaster_facade`

### `active_merchant_warmwash` — Warm-washed active merchant frontage

- Family: `active_merchant`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_plastered_wall`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `shop_recess_market`, `door_shop_timber`, `window_shuttered`, `window_screened`, `pilaster_facade`

### `covered_arcade` — Aged-ochre covered arcade frontage

- Family: `covered_arcade`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_aged_plaster_ochre`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `arch_arcade`, `column_arcade`, `shop_recess_market`, `door_shop_timber`, `window_screened`, `blind_niche`, `pilaster_facade`

### `covered_arcade_lime` — Sun-lime covered arcade frontage

- Family: `covered_arcade`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_painted_plaster_warm`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `arch_arcade`, `column_arcade`, `shop_recess_market`, `door_shop_timber`, `window_screened`, `blind_niche`, `pilaster_facade`

### `covered_arcade_wash` — Cool-washed covered arcade frontage

- Family: `covered_arcade`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_whitewashed_brick_cool`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`
- Modules: `arch_arcade`, `column_arcade`, `shop_recess_market`, `door_shop_timber`, `window_screened`, `blind_niche`, `pilaster_facade`

### `hero_courtyard` — Sandstone hero courtyard frontage

- Family: `hero_courtyard`
- Massing: `MASSING_TALL_HERO`
- Materials: wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`
- Modules: `arch_hero_courtyard`, `door_fortified_gate`, `door_residential_timber`, `window_dark_recess`, `window_screened`, `window_landmark_stained`, `blind_niche`, `pilaster_facade`

### `hero_courtyard_beige` — Beige-plaster hero courtyard frontage

- Family: `hero_courtyard`
- Massing: `MASSING_TALL_HERO`
- Materials: wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`
- Modules: `arch_hero_courtyard`, `door_fortified_gate`, `door_residential_timber`, `window_dark_recess`, `window_screened`, `window_landmark_stained`, `blind_niche`, `pilaster_facade`

### `quiet_residential` — Dusty limewashed residential frontage

- Family: `quiet_residential`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `door_residential_timber`, `window_dark_recess`, `window_screened`, `blind_niche`, `pilaster_facade`

### `quiet_residential_cut_stone` — Sun-bleached cut-limestone residential frontage

- Family: `quiet_residential`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `door_residential_timber`, `window_dark_recess`, `window_screened`, `blind_niche`, `pilaster_facade`

### `quiet_residential_cut_stone_pilaster_relief` — Coursed-limestone timber-closure relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `timber_coverage_closure`, `pilaster_coverage`

### `quiet_residential_niche_coverage_relief` — Budgeted dusty single-niche coverage relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `blind_niche`, `pilaster_niche_coverage`

### `quiet_residential_ochre_niche_coverage_relief` — Budgeted aged-ochre single-niche coverage relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`
- Modules: `blind_niche`, `pilaster_niche_coverage`

### `quiet_residential_ochre_pilaster_relief` — Budgeted aged-ochre timber-closure relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`
- Modules: `timber_coverage_closure`, `pilaster_coverage`

### `quiet_residential_ochre_relief` — Aged-ochre residential relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`
- Modules: `blind_niche`, `pilaster_facade`

### `quiet_residential_pilaster_relief` — Budgeted dusty timber-closure relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `timber_coverage_closure`, `pilaster_coverage`

### `quiet_residential_relief` — Dusty limewashed residential relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `blind_niche`, `pilaster_facade`

### `quiet_residential_warmwash_niche_coverage_relief` — Budgeted warm-washed single-niche coverage relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `blind_niche`, `pilaster_niche_coverage`

### `quiet_residential_warmwash_pilaster_relief` — Budgeted warm-washed timber-closure relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `timber_coverage_closure`, `pilaster_coverage`

### `quiet_residential_warmwash_relief` — Warm-washed residential relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `blind_niche`, `pilaster_facade`

### `service_storage` — Stone service and storage frontage

- Family: `service_storage`
- Massing: `MASSING_LOW_MERCHANT`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_002`
- Modules: `door_storage_heavy`, `vent_service`, `blind_niche`, `pilaster_facade`

## Frontage Placements

### `FRONTAGE_CARAVAN_COURT_EAST_NORTH`

- Zone/face: `CARAVAN_COURT` / `east`
- Profile/massing: `quiet_residential_warmwash_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.50`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_EAST_NORTH_GROUND_01`, `ARCH_FRONTAGE_CARAVAN_COURT_EAST_NORTH_MASSING`

### `FRONTAGE_CARAVAN_COURT_EAST_SOUTH`

- Zone/face: `CARAVAN_COURT` / `east`
- Profile/massing: `quiet_residential_ochre_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_PILASTER_S:pilaster_coverage@0.17`, `BAY_TIMBER_AXIS:timber_coverage_closure@0.50`, `BAY_PILASTER_N:pilaster_coverage@0.83`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_BAY_PILASTER_N`, `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_BAY_PILASTER_S`, `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_BAY_TIMBER_AXIS`, `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_MASSING`

### `FRONTAGE_CARAVAN_COURT_WEST`

- Zone/face: `CARAVAN_COURT` / `west`
- Profile/massing: `service_storage` / `MASSING_LOW_MERCHANT`
- Explicit bays: `BAY_NICHE_S:blind_niche@0.09`, `BAY_DOOR_S:door_storage_heavy@0.23`, `BAY_VENT_S:vent_service@0.36`, `BAY_NICHE_AXIS:blind_niche@0.50`, `BAY_VENT_N:vent_service@0.64`, `BAY_DOOR_N:door_storage_heavy@0.78`, `BAY_NICHE_N:blind_niche@0.91`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_DOOR_N`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_DOOR_S`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_AXIS`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_N`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_S`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_VENT_N`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_VENT_S`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_MASSING`

### `FRONTAGE_COVERED_SOUK_EAST`

- Zone/face: `COVERED_SOUK` / `east`
- Profile/massing: `covered_arcade_lime` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:arch_arcade@0.14`, `GROUND_02:arch_arcade@0.50`, `GROUND_03:arch_arcade@0.86`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_01`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_02`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_03`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_MASSING`

### `FRONTAGE_COVERED_SOUK_SOUTH`

- Zone/face: `COVERED_SOUK` / `south`
- Profile/massing: `quiet_residential_warmwash_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.50`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_SOUTH_GROUND_01`, `ARCH_FRONTAGE_COVERED_SOUK_SOUTH_MASSING`

### `FRONTAGE_COVERED_SOUK_WEST`

- Zone/face: `COVERED_SOUK` / `west`
- Profile/massing: `covered_arcade` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:arch_arcade@0.50`, `STORY_1_WINDOW_01:window_screened@0.19`, `STORY_1_WINDOW_02:window_screened@0.81`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_WEST_GROUND_01`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_MASSING`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_STORY_1_WINDOW_02`

### `FRONTAGE_COVERED_SOUK_WEST_NORTH`

- Zone/face: `COVERED_SOUK` / `west`
- Profile/massing: `covered_arcade_wash` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_shop_timber@0.50`, `STORY_1_WINDOW_01:window_screened@0.50`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_GROUND_01`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_MASSING`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_STORY_1_WINDOW_01`

### `FRONTAGE_DYERS_ALLEY_EAST`

- Zone/face: `DYERS_ALLEY` / `east`
- Profile/massing: `quiet_residential_niche_coverage_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:blind_niche@0.06`, `GROUND_02:pilaster_niche_coverage@0.35`, `GROUND_03:pilaster_niche_coverage@0.65`, `GROUND_04:pilaster_niche_coverage@0.94`
- Compiled placements: `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_01`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_02`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_03`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_04`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_MASSING`

### `FRONTAGE_DYERS_ALLEY_WEST`

- Zone/face: `DYERS_ALLEY` / `west`
- Profile/massing: `service_storage` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_storage_heavy@0.07`, `GROUND_02:door_storage_heavy@0.36`, `GROUND_03:door_storage_heavy@0.64`, `GROUND_04:blind_niche@0.93`, `STORY_1_WINDOW_01:vent_service@0.07`, `STORY_1_WINDOW_02:vent_service@0.36`, `STORY_1_WINDOW_03:vent_service@0.64`, `STORY_1_WINDOW_04:vent_service@0.93`
- Compiled placements: `ARCH_FRONTAGE_DYERS_ALLEY_WEST_GROUND_01`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_GROUND_02`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_GROUND_03`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_GROUND_04`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_MASSING`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_STORY_1_WINDOW_02`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_STORY_1_WINDOW_03`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_STORY_1_WINDOW_04`

### `FRONTAGE_FOUNTAIN_COURT_EAST`

- Zone/face: `FOUNTAIN_COURT` / `east`
- Profile/massing: `hero_courtyard_beige` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:arch_hero_courtyard@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.18`, `STORY_1_WINDOW_02:window_dark_recess@0.82`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_GROUND_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_STORY_1_WINDOW_02`

### `FRONTAGE_FOUNTAIN_COURT_EAST_NORTH`

- Zone/face: `FOUNTAIN_COURT` / `east`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_residential_timber@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_GROUND_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_STORY_1_WINDOW_01`

### `FRONTAGE_FOUNTAIN_COURT_WEST`

- Zone/face: `FOUNTAIN_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_TALL_HERO`
- Explicit bays: `GROUND_01:arch_hero_courtyard@0.50`, `STORY_1_WINDOW_01:window_landmark_stained@0.50`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_GROUND_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_STORY_1_WINDOW_01`

### `FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH`

- Zone/face: `FOUNTAIN_COURT` / `west`
- Profile/massing: `hero_courtyard_beige` / `MASSING_TALL_HERO`
- Explicit bays: `GROUND_01:door_residential_timber@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.50`, `STORY_2_WINDOW_01:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_GROUND_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_STORY_2_WINDOW_01`

### `FRONTAGE_LINK_NORTH_EAST_NORTH`

- Zone/face: `LINK_NORTH_EAST` / `north`
- Profile/massing: `quiet_residential_warmwash_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_LINK_NORTH_EAST_NORTH_GROUND_01`, `ARCH_FRONTAGE_LINK_NORTH_EAST_NORTH_MASSING`

### `FRONTAGE_LINK_NORTH_WEST_NORTH`

- Zone/face: `LINK_NORTH_WEST` / `north`
- Profile/massing: `quiet_residential_warmwash_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_NICHE_W:blind_niche@0.21`, `BAY_NICHE_AXIS:blind_niche@0.50`, `BAY_NICHE_E:blind_niche@0.79`
- Compiled placements: `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_BAY_NICHE_AXIS`, `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_BAY_NICHE_E`, `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_BAY_NICHE_W`, `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_MASSING`

### `FRONTAGE_NORTH_COURT_EAST`

- Zone/face: `NORTH_COURT` / `east`
- Profile/massing: `quiet_residential_ochre_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:blind_niche@0.07`, `GROUND_02:blind_niche@0.36`, `GROUND_03:blind_niche@0.64`, `GROUND_04:blind_niche@0.93`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_EAST_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_EAST_GROUND_02`, `ARCH_FRONTAGE_NORTH_COURT_EAST_GROUND_03`, `ARCH_FRONTAGE_NORTH_COURT_EAST_GROUND_04`, `ARCH_FRONTAGE_NORTH_COURT_EAST_MASSING`

### `FRONTAGE_NORTH_COURT_NORTH`

- Zone/face: `NORTH_COURT` / `north`
- Profile/massing: `quiet_residential_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.19`, `GROUND_02:pilaster_coverage@0.81`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_NORTH_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_NORTH_GROUND_02`, `ARCH_FRONTAGE_NORTH_COURT_NORTH_MASSING`

### `FRONTAGE_NORTH_COURT_SOUTH`

- Zone/face: `NORTH_COURT` / `south`
- Profile/massing: `quiet_residential_warmwash_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.50`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_SOUTH_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_SOUTH_MASSING`

### `FRONTAGE_NORTH_COURT_WEST`

- Zone/face: `NORTH_COURT` / `west`
- Profile/massing: `hero_courtyard_beige` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_residential_timber@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_WEST_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_WEST_MASSING`, `ARCH_FRONTAGE_NORTH_COURT_WEST_STORY_1_WINDOW_01`

### `FRONTAGE_NORTH_COURT_WEST_SOUTH`

- Zone/face: `NORTH_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_residential_timber@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_MASSING`, `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_STORY_1_WINDOW_01`

### `FRONTAGE_RUG_GATE_EAST`

- Zone/face: `RUG_GATE` / `east`
- Profile/massing: `active_merchant_ochre` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:shop_recess_market@0.50`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_EAST_GROUND_01`, `ARCH_FRONTAGE_RUG_GATE_EAST_MASSING`

### `FRONTAGE_RUG_GATE_EAST_SOUTH`

- Zone/face: `RUG_GATE` / `east`
- Profile/massing: `active_merchant` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:pilaster_facade@0.50`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_GROUND_01`, `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_MASSING`

### `FRONTAGE_RUG_GATE_WEST`

- Zone/face: `RUG_GATE` / `west`
- Profile/massing: `active_merchant_warmwash` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:shop_recess_market@0.26`, `GROUND_02:shop_recess_market@0.74`, `STORY_1_WINDOW_01:window_shuttered@0.26`, `STORY_1_WINDOW_02:window_shuttered@0.74`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_01`, `ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_02`, `ARCH_FRONTAGE_RUG_GATE_WEST_MASSING`, `ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_02`

### `FRONTAGE_SERVICE_NORTH_EAST_SPINE`

- Zone/face: `SERVICE_NORTH` / `east`
- Profile/massing: `service_storage` / `MASSING_SERVICE_SPINE`
- Explicit bays: `GROUND_01:door_storage_heavy@0.05`, `GROUND_02:blind_niche@0.20`, `GROUND_03:door_storage_heavy@0.35`, `GROUND_04:door_storage_heavy@0.50`, `GROUND_05:blind_niche@0.65`, `GROUND_06:door_storage_heavy@0.80`, `GROUND_07:door_storage_heavy@0.95`, `STORY_1_WINDOW_01:vent_service@0.05`, `STORY_1_WINDOW_02:vent_service@0.20`, `STORY_1_WINDOW_03:vent_service@0.35`, `STORY_1_WINDOW_04:vent_service@0.50`, `STORY_1_WINDOW_05:vent_service@0.65`, `STORY_1_WINDOW_06:vent_service@0.80`, `STORY_1_WINDOW_07:vent_service@0.95`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_02`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_03`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_04`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_05`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_06`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_GROUND_07`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MASSING`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_02`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_03`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_04`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_05`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_06`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_STORY_1_WINDOW_07`

### `FRONTAGE_SERVICE_SOUTH_EAST`

- Zone/face: `SERVICE_SOUTH` / `east`
- Profile/massing: `quiet_residential_warmwash_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.07`, `GROUND_02:pilaster_coverage@0.36`, `GROUND_03:timber_coverage_closure@0.64`, `GROUND_04:timber_coverage_closure@0.93`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_GROUND_01`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_GROUND_02`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_GROUND_03`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_GROUND_04`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_MASSING`

### `FRONTAGE_SPAWN_A_NORTH_EAST`

- Zone/face: `SPAWN_A_COURTYARD` / `north`
- Profile/massing: `quiet_residential_ochre_niche_coverage_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_SPAWN_A_NORTH_EAST_GROUND_01`, `ARCH_FRONTAGE_SPAWN_A_NORTH_EAST_MASSING`

### `FRONTAGE_SPAWN_A_NORTH_WEST`

- Zone/face: `SPAWN_A_COURTYARD` / `north`
- Profile/massing: `quiet_residential_niche_coverage_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_SPAWN_A_NORTH_WEST_GROUND_01`, `ARCH_FRONTAGE_SPAWN_A_NORTH_WEST_MASSING`

### `FRONTAGE_SPAWN_B_SOUTH_EAST`

- Zone/face: `SPAWN_B_COURTYARD` / `south`
- Profile/massing: `quiet_residential_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.50`
- Compiled placements: `ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_GROUND_01`, `ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_MASSING`

### `FRONTAGE_SPAWN_B_SOUTH_WEST`

- Zone/face: `SPAWN_B_COURTYARD` / `south`
- Profile/massing: `quiet_residential_cut_stone_pilaster_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `GROUND_01:timber_coverage_closure@0.50`
- Compiled placements: `ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_GROUND_01`, `ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_MASSING`

### `FRONTAGE_SPICE_STREET_EAST`

- Zone/face: `SPICE_STREET` / `east`
- Profile/massing: `quiet_residential_cut_stone` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:door_residential_timber@0.07`, `GROUND_02:blind_niche@0.29`, `GROUND_03:door_residential_timber@0.50`, `GROUND_04:door_residential_timber@0.71`, `GROUND_05:blind_niche@0.93`
- Compiled placements: `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_01`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_02`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_03`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_04`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_05`, `ARCH_FRONTAGE_SPICE_STREET_EAST_MASSING`

### `FRONTAGE_SPICE_STREET_WEST`

- Zone/face: `SPICE_STREET` / `west`
- Profile/massing: `active_merchant` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:shop_recess_market@0.12`, `GROUND_02:door_shop_timber@0.31`, `GROUND_03:shop_recess_market@0.50`, `GROUND_04:shop_recess_market@0.69`, `GROUND_05:door_shop_timber@0.88`, `STORY_1_WINDOW_01:window_shuttered@0.12`, `STORY_1_WINDOW_02:window_shuttered@0.31`, `STORY_1_WINDOW_03:window_shuttered@0.50`, `STORY_1_WINDOW_04:window_shuttered@0.69`, `STORY_1_WINDOW_05:window_shuttered@0.88`
- Compiled placements: `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_02`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_03`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_04`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_05`, `ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_02`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_03`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_04`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_05`

### `FRONTAGE_TEA_TERRACE_EAST`

- Zone/face: `TEA_TERRACE` / `east`
- Profile/massing: `active_merchant_ochre` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:shop_recess_market@0.21`, `GROUND_02:door_shop_timber@0.79`, `STORY_1_WINDOW_01:window_shuttered@0.21`, `STORY_1_WINDOW_02:window_shuttered@0.79`
- Compiled placements: `ARCH_FRONTAGE_TEA_TERRACE_EAST_GROUND_01`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_GROUND_02`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_MASSING`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_02`

### `FRONTAGE_TEXTILE_ARCADE_EAST`

- Zone/face: `TEXTILE_ARCADE` / `east`
- Profile/massing: `covered_arcade_lime` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:arch_arcade@0.14`, `GROUND_02:column_arcade@0.38`, `GROUND_03:arch_arcade@0.62`, `GROUND_04:arch_arcade@0.86`
- Compiled placements: `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_04`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_MASSING`

### `FRONTAGE_TEXTILE_ARCADE_WEST`

- Zone/face: `TEXTILE_ARCADE` / `west`
- Profile/massing: `covered_arcade` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:arch_arcade@0.14`, `GROUND_02:column_arcade@0.38`, `GROUND_03:arch_arcade@0.62`, `GROUND_04:arch_arcade@0.86`, `STORY_1_WINDOW_01:window_screened@0.14`, `STORY_1_WINDOW_02:window_screened@0.38`, `STORY_1_WINDOW_03:window_screened@0.62`, `STORY_1_WINDOW_04:window_screened@0.86`
- Compiled placements: `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_04`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_MASSING`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_04`

## Dressing Placements

- `PLACE_B4_FOUNTAIN_RUG_B4_FOUNTAIN_E_RUG_GROUND_01`: `ASSET_GROUND_RUG` at `B4_FOUNTAIN_E_RUG_GROUND_01` (34.90, 36.14, 0.00), size 2.56×1.32×0.04m, yaw 270.00deg
- `PLACE_B4_FOUNTAIN_RUG_B4_FOUNTAIN_W_RUG_GROUND_01`: `ASSET_GROUND_RUG` at `B4_FOUNTAIN_W_RUG_GROUND_01` (21.10, 43.86, 0.00), size 2.56×1.32×0.04m, yaw 90.00deg
- `PLACE_B4_SOUK_CART_B4_SOUK_W_CART_GROUND_01`: `ASSET_MARKET_CART` at `B4_SOUK_W_CART_GROUND_01` (43.10, 36.14, 0.00), size 1.20×0.75×0.88m, yaw 98.00deg
- `PLACE_B4_SOUK_PROCESS_VESSEL_B4_SOUK_E_GOODS_GROUND_01`: `ASSET_DYERS_CERAMIC_VESSEL` at `B4_SOUK_E_GOODS_GROUND_01` (51.98, 35.18, 0.00), size 0.55×0.42×0.31m, yaw 277.00deg
- `PLACE_B4_SPICE_CART_B4_SPICE_E_CART_GROUND_01`: `ASSET_MARKET_CART` at `B4_SPICE_E_CART_GROUND_01` (31.88, 16.57, 0.00), size 1.25×0.78×0.92m, yaw 277.00deg
- `PLACE_B4_SPICE_COVER_RUG_COVER_SPICE_01`: `ASSET_GROUND_RUG` at `COVER_SPICE_01` (23.00, 27.60, 0.00), size 2.25×1.36×0.04m, yaw 11.00deg
- `PLACE_B4_TEXTILE_CART_BPL16_TEXTILE_E_STOCK_GROUND_04`: `ASSET_MARKET_CART` at `BPL16_TEXTILE_E_STOCK_GROUND_04` (33.95, 60.82, 0.00), size 1.27×0.80×0.94m, yaw 278.00deg
- `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_01`: `ASSET_LAUNDRY_LINE` at `B6_LAUNDRY_SPICE_01` (27.00, 18.16, 5.95), size 1.40×12.00×0.85m, yaw 90.00deg
- `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_02`: `ASSET_LAUNDRY_LINE` at `B6_LAUNDRY_SPICE_02` (27.00, 23.76, 6.00), size 1.55×12.00×0.85m, yaw 90.00deg
- `PLACE_B6_SPICE_LAUNDRY_B6_LAUNDRY_SPICE_03`: `ASSET_LAUNDRY_LINE` at `B6_LAUNDRY_SPICE_03` (27.00, 28.75, 6.15), size 1.20×12.00×0.85m, yaw 90.00deg
- `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_01`: `ASSET_LAUNDRY_LINE` at `B6_LAUNDRY_TEXTILE_01` (29.50, 51.70, 6.15), size 1.35×11.00×0.85m, yaw 90.00deg
- `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_02`: `ASSET_LAUNDRY_LINE` at `B6_LAUNDRY_TEXTILE_02` (29.50, 58.69, 4.97), size 1.15×11.00×0.85m, yaw 90.00deg
- `PLACE_B7_FOUNTAIN_MARKET_BASKET_B7_FOUNTAIN_MARKET_SPILL`: `ASSET_CC0_BASKET` at `B7_FOUNTAIN_MARKET_SPILL` (20.77, 37.50, 0.00), size 0.42×0.30×0.24m, yaw -22.00deg
- `PLACE_B7_FOUNTAIN_MARKET_CRATE_B7_FOUNTAIN_MARKET_SPILL`: `ASSET_DECORATIVE_CRATE` at `B7_FOUNTAIN_MARKET_SPILL` (22.17, 37.48, 0.00), size 0.71×0.35×0.30m, yaw 1.00deg
- `PLACE_B7_FOUNTAIN_MARKET_POT_B7_FOUNTAIN_MARKET_SPILL`: `ASSET_CC0_POTTERY` at `B7_FOUNTAIN_MARKET_SPILL` (20.65, 36.76, 0.00), size 0.55×0.42×0.31m, yaw -3.00deg
- `PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_EAST`: `ASSET_COURT_PLANTER` at `B7_FOUNTAIN_PLANTER_EAST` (34.55, 44.25, 0.00), size 1.05×1.05×1.20m, yaw 11.00deg
- `PLACE_B7_FOUNTAIN_PLANTERS_B7_FOUNTAIN_PLANTER_WEST`: `ASSET_COURT_PLANTER` at `B7_FOUNTAIN_PLANTER_WEST` (21.15, 41.90, 0.00), size 1.05×1.05×1.20m, yaw -8.00deg
- `PLACE_B7_FOUNTAIN_TEA_STOOL_A_B7_FOUNTAIN_TEA_SPILLOVER`: `ASSET_CC0_TEA_STOOL` at `B7_FOUNTAIN_TEA_SPILLOVER` (32.73, 41.44, 0.00), size 0.37×0.39×0.56m, yaw 172.00deg
- `PLACE_B7_FOUNTAIN_TEA_STOOL_B_B7_FOUNTAIN_TEA_SPILLOVER`: `ASSET_CC0_TEA_STOOL` at `B7_FOUNTAIN_TEA_SPILLOVER` (34.27, 41.84, 0.00), size 0.34×0.36×0.51m, yaw 354.00deg
- `PLACE_B7_FOUNTAIN_TEA_TABLE_B7_FOUNTAIN_TEA_SPILLOVER`: `ASSET_CC0_TEA_TABLE` at `B7_FOUNTAIN_TEA_SPILLOVER` (33.55, 41.60, 0.00), size 1.13×0.71×0.80m, yaw 98.00deg
- `PLACE_BPL19_FOUNTAIN_MARKET_RUG_B7_FOUNTAIN_MARKET_SPILL`: `ASSET_GROUND_RUG` at `B7_FOUNTAIN_MARKET_SPILL` (21.39, 37.12, 0.00), size 2.09×1.29×0.04m, yaw -15.00deg
- `PLACE_BPL19_FOUNTAIN_MARKET_STALL_B7_FOUNTAIN_MARKET_SPILL`: `ASSET_MARKET_STALL` at `B7_FOUNTAIN_MARKET_SPILL` (21.35, 37.10, 0.00), size 1.67×1.11×1.67m, yaw -18.00deg
- `PLACE_CARAVAN_COVER_COVER_CARAVAN_01`: `ASSET_COVER_GOODS` at `COVER_CARAVAN_01` (5.00, 34.20, 0.00), size 1.50×0.75×1.00m, yaw 20.00deg
- `PLACE_CARAVAN_LOAD_NORTH_LMK_CARAVAN_DISTRICT`: `ASSET_CARAVAN_LOAD_CRATE` at `LMK_CARAVAN_DISTRICT` (14.52, 46.12, 0.00), size 0.79×0.39×0.34m, yaw 9.00deg
- `PLACE_CARAVAN_LOAD_SHADE_CARAVAN_LOAD_SHADE_01`: `ASSET_CLOTH_CANOPY` at `CARAVAN_LOAD_SHADE_01` (9.00, 46.60, 4.41), size 2.20×9.60×0.18m, yaw 90.00deg
- `PLACE_CARAVAN_LOAD_SOUTH_LMK_CARAVAN_DISTRICT`: `ASSET_CARAVAN_LOAD_CRATE` at `LMK_CARAVAN_DISTRICT` (13.70, 45.92, 0.00), size 0.89×0.44×0.38m, yaw -7.00deg
- `PLACE_CARAVAN_LOAD_TOP_LMK_CARAVAN_DISTRICT`: `ASSET_CARAVAN_LOAD_CRATE` at `LMK_CARAVAN_DISTRICT` (14.07, 46.00, 0.38), size 0.74×0.37×0.31m, yaw 4.00deg
- `PLACE_DYERS_CANOPY_CANOPY_DYERS_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_DYERS_01` (47.00, 45.36, 4.25), size 4.40×12.00×0.18m, yaw 90.00deg
- `PLACE_DYERS_CERAMIC_VESSEL_LMK_DYERS_DISTRICT`: `ASSET_DYERS_CERAMIC_VESSEL` at `LMK_DYERS_DISTRICT` (43.42, 43.88, 0.00), size 0.56×0.43×0.32m, yaw -12.00deg
- `PLACE_DYERS_COVER_COVER_DYERS_01`: `ASSET_COVER_GOODS` at `COVER_DYERS_01` (50.50, 43.60, 0.00), size 1.50×0.75×1.00m, yaw 75.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_01`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_01` (52.42, 13.40, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_02`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_02` (52.42, 19.10, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_03`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_03` (52.42, 23.70, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_04`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_04` (52.42, 29.20, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_VAT_DYERS_E_RACK_04`: `ASSET_DYERS_SEALED_VAT` at `DYERS_E_RACK_04` (52.44, 29.75, 0.00), size 0.70×0.71×0.82m, yaw 263.00deg
- `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_01`: `ASSET_DYERS_CERAMIC_VESSEL` at `DYERS_E_RACK_01` (52.50, 12.78, 0.00), size 0.66×0.50×0.37m, yaw 281.00deg
- `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_03`: `ASSET_DYERS_CERAMIC_VESSEL` at `DYERS_E_RACK_03` (52.50, 23.08, 0.00), size 0.66×0.50×0.37m, yaw 281.00deg
- `PLACE_DYERS_LANTERN_LANTERN_DYERS_01`: `ASSET_CC0_LANTERN` at `LANTERN_DYERS_01` (52.50, 40.50, 4.10), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_E_SIGN_1`: `ASSET_SIGNBOARD` at `DYE_E_SIGN_1` (52.88, 40.00, 3.85), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_E_SIGN_2`: `ASSET_SIGNBOARD` at `DYE_E_SIGN_2` (52.88, 44.82, 3.85), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_W_SIGN_1`: `ASSET_SIGNBOARD` at `DYE_W_SIGN_1` (41.12, 36.14, 3.85), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_DYERS_SIGNS_DYE_W_SIGN_2`: `ASSET_SIGNBOARD` at `DYE_W_SIGN_2` (41.12, 45.36, 3.32), size 1.38×0.12×0.38m, yaw 90.00deg
- `PLACE_DYERS_VAT_EAST_LMK_DYERS_DISTRICT`: `ASSET_DYERS_SEALED_VAT` at `LMK_DYERS_DISTRICT` (43.48, 44.50, 0.00), size 0.61×0.62×0.71m, yaw 11.00deg
- `PLACE_DYERS_VAT_WEST_LMK_DYERS_DISTRICT`: `ASSET_DYERS_SEALED_VAT` at `LMK_DYERS_DISTRICT` (42.72, 44.42, 0.00), size 0.70×0.72×0.83m, yaw -8.00deg
- `PLACE_FOUNTAIN_COVER_COVER_FOUNTAIN_01`: `ASSET_COVER_GOODS` at `COVER_FOUNTAIN_01` (33.80, 35.20, 0.00), size 1.50×0.75×1.00m, yaw 80.00deg
- `PLACE_FOUNTAIN_LANTERN_LANTERN_FOUNTAIN_01`: `ASSET_CC0_LANTERN` at `LANTERN_FOUNTAIN_01` (35.45, 39.00, 4.25), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_FOUNTAIN_LMK_FOUNTAIN_01`: `ASSET_FOUNTAIN` at `LMK_FOUNTAIN_01` (24.50, 43.50, 0.00), size 3.00×3.00×1.32m, yaw 0.00deg
- `PLACE_FOUNTAIN_PALM_PALM_FOUNTAIN_01`: `ASSET_PALM` at `PALM_FOUNTAIN_01` (22.40, 45.00, 0.00), size 3.80×3.80×7.80m, yaw 0.00deg
- `PLACE_L34_CARAVAN_CART_L34_CARAVAN_CART_01`: `ASSET_MARKET_CART` at `L34_CARAVAN_CART_01` (14.10, 45.05, 0.00), size 1.30×0.81×0.96m, yaw 261.00deg
- `PLACE_L34_CARAVAN_PACK_LINE_L34_CARAVAN_PACK_LINE_01`: `ASSET_LAUNDRY_LINE` at `L34_CARAVAN_PACK_LINE_01` (9.00, 47.80, 4.38), size 1.20×11.30×0.85m, yaw 90.00deg
- `PLACE_L34_COVERED_SOUK_BASKET_LMK_DYERS_DISTRICT`: `ASSET_CC0_BASKET` at `LMK_DYERS_DISTRICT` (42.38, 43.82, 0.00), size 0.41×0.30×0.24m, yaw -12.00deg
- `PLACE_L34_DOGLEG_VAT_02_L34_DOGLEG_VAT_02`: `ASSET_DYERS_SEALED_VAT` at `L34_DOGLEG_VAT_02` (46.55, 61.55, 0.00), size 0.56×0.57×0.65m, yaw 101.00deg
- `PLACE_L34_DOGLEG_VAT_L34_DOGLEG_VAT_01`: `ASSET_DYERS_SEALED_VAT` at `L34_DOGLEG_VAT_01` (46.55, 59.35, 0.00), size 0.56×0.57×0.65m, yaw 82.00deg
- `PLACE_L34_DOGLEG_WALL_RACK_L34_DOGLEG_WALL_RACK_01`: `ASSET_DYERS_HANGING_TEXTILES` at `L34_DOGLEG_WALL_RACK_01` (46.18, 60.40, 1.18), size 2.36×0.17×1.63m, yaw 90.00deg
- `PLACE_L34_DOGLEG_WORKSTATION_L34_DOGLEG_WORKSTATION_01`: `ASSET_DYERS_WORKSTATION` at `L34_DOGLEG_WORKSTATION_01` (46.60, 60.30, 0.00), size 2.80×1.45×2.20m, yaw 90.00deg
- `PLACE_L34_DYERS_ALLEY_POTTERY_L34_DYERS_ALLEY_POTTERY_01`: `ASSET_DYERS_CERAMIC_VESSEL` at `L34_DYERS_ALLEY_POTTERY_01` (52.45, 26.50, 0.00), size 0.54×0.41×0.31m, yaw 280.00deg
- `PLACE_L34_DYERS_ALLEY_VATS_L34_DYERS_ALLEY_VAT_01`: `ASSET_DYERS_WORKSTATION` at `L34_DYERS_ALLEY_VAT_01` (52.38, 17.00, 0.00), size 2.80×1.45×2.20m, yaw 270.00deg
- `PLACE_L34_DYERS_ALLEY_VATS_L34_DYERS_ALLEY_VAT_02`: `ASSET_DYERS_WORKSTATION` at `L34_DYERS_ALLEY_VAT_02` (52.38, 21.00, 0.00), size 2.80×1.45×2.20m, yaw 270.00deg
- `PLACE_L34_NORTH_PLANTER_EAST_L34_NORTH_PLANTER_EAST`: `ASSET_COURT_PLANTER` at `L34_NORTH_PLANTER_EAST` (52.00, 76.20, 0.00), size 0.90×0.90×1.03m, yaw 11.00deg
- `PLACE_L34_NORTH_WORKSTATION_02_L34_NORTH_WORKSTATION_02`: `ASSET_DYERS_WORKSTATION` at `L34_NORTH_WORKSTATION_02` (42.10, 77.00, 0.00), size 2.94×1.52×2.31m, yaw 90.00deg
- `PLACE_L34_SERVICE_SOUTH_BASKET_L34_SERVICE_SOUTH_BASKET_01`: `ASSET_CC0_BASKET` at `L34_SERVICE_SOUTH_BASKET_01` (9.50, 20.70, 0.00), size 0.41×0.29×0.24m, yaw 262.00deg
- `PLACE_L34_SERVICE_SOUTH_POTTERY_L34_SERVICE_SOUTH_POTTERY_01`: `ASSET_CC0_POTTERY` at `L34_SERVICE_SOUTH_POTTERY_01` (9.48, 22.15, 0.00), size 0.60×0.46×0.34m, yaw 281.00deg
- `PLACE_L34_TEA_STALL_L34_TEA_STALL_01`: `ASSET_MARKET_STALL` at `L34_TEA_STALL_01` (16.90, 64.70, 1.40), size 1.98×1.22×1.98m, yaw 270.00deg
- `PLACE_L3R0_NORTH_DYERS_LINE_L3R0_NORTH_DYERS_LINE_01`: `ASSET_LAUNDRY_LINE` at `L3R0_NORTH_DYERS_LINE_01` (47.00, 75.00, 4.70), size 1.30×11.30×0.85m, yaw 90.00deg
- `PLACE_L3R0_NORTH_DYERS_WALL_RACK_L3R0_NORTH_DYERS_BAY_01`: `ASSET_DYERS_HANGING_TEXTILES` at `L3R0_NORTH_DYERS_BAY_01` (52.17, 73.30, 1.18), size 2.48×0.18×1.71m, yaw 90.00deg
- `PLACE_L3R0_NORTH_EXIT_SIGN_L3R0_NORTH_EXIT_SIGN_01`: `ASSET_SIGNBOARD` at `L3R0_NORTH_EXIT_SIGN_01` (41.28, 69.50, 2.35), size 1.40×0.12×0.38m, yaw 90.00deg
- `PLACE_L3R0_NORTH_RUG_L3R0_NORTH_DYERS_BAY_01`: `ASSET_GROUND_RUG` at `L3R0_NORTH_DYERS_BAY_01` (51.45, 73.30, 0.00), size 2.36×1.15×0.04m, yaw -2.00deg
- `PLACE_L3R0_NORTH_STALL_L3R0_NORTH_DYERS_BAY_01`: `ASSET_MARKET_STALL` at `L3R0_NORTH_DYERS_BAY_01` (50.85, 73.20, 0.00), size 2.09×1.28×2.09m, yaw 90.00deg
- `PLACE_L3R0_NORTH_VAT_EAST_L3R0_NORTH_DYERS_BAY_01`: `ASSET_DYERS_SEALED_VAT` at `L3R0_NORTH_DYERS_BAY_01` (52.17, 74.30, 0.00), size 0.56×0.57×0.66m, yaw 11.00deg
- `PLACE_L3R0_NORTH_VAT_WEST_L34_NORTH_DYERS_BAY_02`: `ASSET_DYERS_SEALED_VAT` at `L34_NORTH_DYERS_BAY_02` (42.55, 72.85, 0.00), size 0.61×0.62×0.71m, yaw -9.00deg
- `PLACE_L3R0_NORTH_VESSEL_L34_NORTH_DYERS_BAY_02`: `ASSET_DYERS_CERAMIC_VESSEL` at `L34_NORTH_DYERS_BAY_02` (42.55, 73.75, 0.00), size 0.54×0.41×0.31m, yaw 7.00deg
- `PLACE_NORTH_COVER_COVER_NORTH_01`: `ASSET_COVER_GOODS` at `COVER_NORTH_01` (43.20, 66.00, 0.00), size 1.50×0.75×1.00m, yaw 10.00deg
- `PLACE_NORTH_PALM_PALM_NORTH_01`: `ASSET_PALM` at `PALM_NORTH_01` (50.60, 77.20, 0.00), size 3.80×3.80×7.80m, yaw 0.00deg
- `PLACE_RUG_ARCH_LMK_RUG_GATE_01`: `ASSET_HERO_ARCH` at `LMK_RUG_GATE_01` (27.50, 76.30, 0.00), size 13.00×0.80×6.80m, yaw 180.00deg
- `PLACE_RUG_COVER_COVER_RUG_01`: `ASSET_COVER_GOODS` at `COVER_RUG_01` (23.00, 68.20, 0.00), size 1.50×0.75×1.00m, yaw 0.00deg
- `PLACE_RUG_LANTERN_LANTERN_RUG_01`: `ASSET_CC0_LANTERN` at `LANTERN_RUG_01` (32.50, 70.00, 4.25), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_RUG_SIGNS_RUG_E_SIGN_1`: `ASSET_SIGNBOARD` at `RUG_E_SIGN_1` (33.88, 74.44, 3.32), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_RUG_SIGNS_RUG_W_SIGN_1`: `ASSET_SIGNBOARD` at `RUG_W_SIGN_1` (21.12, 66.92, 3.32), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_RUG_SIGNS_RUG_W_SIGN_2`: `ASSET_SIGNBOARD` at `RUG_W_SIGN_2` (21.12, 70.20, 3.32), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_SPAWN_A_COVER_SPAWN_A_COVER_01`: `ASSET_SPAWN_COVER` at `SPAWN_A_COVER_01` (20.20, 5.20, 0.00), size 2.20×1.10×1.30m, yaw 0.00deg
- `PLACE_SPAWN_A_EAST_WORKS_LMK_SPAWN_A_EAST_WORKS_01`: `ASSET_SPAWN_A_EAST_DYE_WORKS` at `LMK_SPAWN_A_EAST_WORKS_01` (38.20, 4.00, 0.00), size 8.00×2.40×12.80m, yaw 90.00deg
- `PLACE_SPAWN_A_EXIT_EAST_LMK_SPAWN_A_EXIT_EAST_01`: `ASSET_SPAWN_A_EXIT_EAST_RETURN` at `LMK_SPAWN_A_EXIT_EAST_01` (36.25, 13.00, 0.00), size 5.50×2.00×7.60m, yaw 180.00deg
- `PLACE_SPAWN_A_EXIT_WEST_LMK_SPAWN_A_EXIT_WEST_01`: `ASSET_SPAWN_A_EXIT_WEST_RETURN` at `LMK_SPAWN_A_EXIT_WEST_01` (18.75, 13.00, 0.00), size 3.50×2.00×7.60m, yaw 180.00deg
- `PLACE_SPAWN_A_GATE_LMK_SPAWN_A_GATE_01`: `ASSET_SPAWN_A_GATE` at `LMK_SPAWN_A_GATE_01` (28.00, 0.85, 0.00), size 21.90×2.20×12.00m, yaw 180.00deg
- `PLACE_SPAWN_A_WEST_BACKS_LMK_SPAWN_A_WEST_BACKS_01`: `ASSET_SPAWN_A_WEST_BACKS` at `LMK_SPAWN_A_WEST_BACKS_01` (17.80, 4.00, 0.00), size 8.00×2.20×9.80m, yaw 270.00deg
- `PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01`: `ASSET_SPAWN_COVER` at `SPAWN_B_COVER_01` (35.20, 86.00, 0.00), size 2.20×1.10×1.30m, yaw 180.00deg
- `PLACE_SPICE_BARREL_COVER_SPICE_01`: `ASSET_CC0_BARREL` at `COVER_SPICE_01` (21.90, 27.65, 0.00), size 0.67×0.68×0.78m, yaw 9.00deg
- `PLACE_SPICE_BASKET_COVER_SPICE_01`: `ASSET_CC0_BASKET` at `COVER_SPICE_01` (23.78, 27.98, 0.00), size 0.38×0.27×0.22m, yaw 27.00deg
- `PLACE_SPICE_CANOPIES_CANOPY_SPICE_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_SPICE_01` (27.00, 20.58, 5.67), size 3.60×12.00×0.18m, yaw 90.00deg
- `PLACE_SPICE_CANOPIES_CANOPY_SPICE_02`: `ASSET_CLOTH_CANOPY` at `CANOPY_SPICE_02` (27.00, 26.48, 5.67), size 3.20×12.00×0.18m, yaw 90.00deg
- `PLACE_SPICE_COVER_CORE_COVER_SPICE_01`: `ASSET_COVER_GOODS` at `COVER_SPICE_01` (23.00, 27.60, 0.00), size 1.50×0.75×1.00m, yaw 15.00deg
- `PLACE_SPICE_E_STOCK_BASKET_MID_SPICE_E_WALLBASE_STOCK_02`: `ASSET_CC0_BASKET` at `SPICE_E_WALLBASE_STOCK_02` (31.89, 22.10, 0.00), size 0.38×0.27×0.22m, yaw 262.00deg
- `PLACE_SPICE_E_STOCK_BASKET_NORTH_SPICE_E_WALLBASE_STOCK_04`: `ASSET_CC0_BASKET` at `SPICE_E_WALLBASE_STOCK_04` (32.00, 27.98, 0.00), size 0.39×0.28×0.23m, yaw 286.00deg
- `PLACE_SPICE_E_STOCK_BINS_SPICE_E_WALLBASE_STOCK_02`: `ASSET_SPICE_GOODS` at `SPICE_E_WALLBASE_STOCK_02` (32.21, 21.30, 0.00), size 1.50×0.75×0.85m, yaw 270.00deg
- `PLACE_SPICE_E_STOCK_BRASS_POT_SPICE_E_WALLBASE_STOCK_04`: `ASSET_CC0_BRASS_POT` at `SPICE_E_WALLBASE_STOCK_04` (31.88, 28.42, 0.00), size 0.30×0.30×0.29m, yaw 270.00deg
- `PLACE_SPICE_E_STOCK_CRATE_BASE_SPICE_E_WALLBASE_STOCK_01`: `ASSET_DECORATIVE_CRATE` at `SPICE_E_WALLBASE_STOCK_01` (32.25, 17.76, 0.00), size 0.83×0.41×0.35m, yaw 275.00deg
- `PLACE_SPICE_E_STOCK_CRATE_MID_SPICE_E_WALLBASE_STOCK_03`: `ASSET_DECORATIVE_CRATE` at `SPICE_E_WALLBASE_STOCK_03` (32.25, 24.11, 0.00), size 0.78×0.38×0.33m, yaw 264.00deg
- `PLACE_SPICE_E_STOCK_CRATE_STACK_SPICE_E_WALLBASE_STOCK_01`: `ASSET_DECORATIVE_CRATE` at `SPICE_E_WALLBASE_STOCK_01` (32.17, 17.81, 0.35), size 0.71×0.35×0.30m, yaw 259.00deg
- `PLACE_SPICE_E_STOCK_POTTERY_NORTH_SPICE_E_WALLBASE_STOCK_04`: `ASSET_CC0_POTTERY` at `SPICE_E_WALLBASE_STOCK_04` (32.18, 27.32, 0.00), size 0.66×0.50×0.37m, yaw 258.00deg
- `PLACE_SPICE_E_STOCK_POTTERY_SOUTH_SPICE_E_WALLBASE_STOCK_01`: `ASSET_CC0_POTTERY` at `SPICE_E_WALLBASE_STOCK_01` (32.10, 18.65, 0.00), size 0.62×0.48×0.35m, yaw 284.00deg
- `PLACE_SPICE_E_STOCK_SACK_SPICE_E_WALLBASE_STOCK_03`: `ASSET_CC0_SPICE_SACK` at `SPICE_E_WALLBASE_STOCK_03` (32.14, 24.89, 0.00), size 0.47×0.47×0.44m, yaw 279.00deg
- `PLACE_SPICE_GATE_LMK_SPICE_GATE_01`: `ASSET_SPICE_GATE` at `LMK_SPICE_GATE_01` (27.00, 14.95, 0.00), size 12.80×1.90×9.10m, yaw 180.00deg
- `PLACE_SPICE_LANDMARK_BRASS_POT_LMK_SPICE_DISTRICT`: `ASSET_CC0_BRASS_POT` at `LMK_SPICE_DISTRICT` (22.03, 22.55, 0.00), size 0.30×0.30×0.29m, yaw 82.00deg
- `PLACE_SPICE_LANDMARK_GOODS_LMK_SPICE_DISTRICT`: `ASSET_SPICE_GOODS` at `LMK_SPICE_DISTRICT` (21.68, 23.00, 0.00), size 1.50×0.75×0.85m, yaw 90.00deg
- `PLACE_SPICE_LANDMARK_SACK_TALL_LMK_SPICE_DISTRICT`: `ASSET_CC0_SPICE_SACK` at `LMK_SPICE_DISTRICT` (22.03, 23.45, 0.00), size 0.48×0.48×0.45m, yaw 84.00deg
- `PLACE_SPICE_LANTERN_LANTERN_SPICE_01`: `ASSET_CC0_LANTERN` at `LANTERN_SPICE_01` (21.45, 16.20, 3.80), size 0.22×0.23×0.53m, yaw 90.00deg
- `PLACE_SPICE_POTTERY_COVER_SPICE_01`: `ASSET_CC0_POTTERY` at `COVER_SPICE_01` (23.76, 27.22, 0.00), size 0.52×0.40×0.30m, yaw 15.00deg
- `PLACE_SPICE_SIGNS_SPICE_W_SIGN_1`: `ASSET_SIGNBOARD` at `SPICE_W_SIGN_1` (21.12, 17.24, 3.01), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_SPICE_STALLS_SPICE_W_SHOP_1`: `ASSET_MARKET_STALL` at `SPICE_W_SHOP_1` (21.68, 17.24, 0.00), size 1.80×1.11×1.80m, yaw 90.00deg
- `PLACE_TEA_COVER_COVER_TEA_01`: `ASSET_COVER_GOODS` at `COVER_TEA_01` (12.20, 63.80, 1.40), size 1.50×0.75×1.00m, yaw 90.00deg
- `PLACE_TEA_LANTERN_LANTERN_TEA_01`: `ASSET_CC0_LANTERN` at `LANTERN_TEA_01` (18.50, 60.50, 4.65), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST`: `ASSET_SIGNBOARD` at `TEA_RAMP_SIGN_EAST` (18.75, 54.30, 3.65), size 1.20×0.12×0.38m, yaw 270.00deg
- `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST`: `ASSET_SIGNBOARD` at `TEA_RAMP_SIGN_WEST` (11.25, 51.20, 3.05), size 1.10×0.12×0.38m, yaw 90.00deg
- `PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01`: `ASSET_TEA_SERVICE` at `LMK_TEA_TERRACE_01` (18.55, 62.65, 1.40), size 1.20×0.55×0.90m, yaw 90.00deg
- `PLACE_TEA_SIGNS_TEA_E_SIGN_1`: `ASSET_SIGNBOARD` at `TEA_E_SIGN_1` (18.88, 58.60, 4.45), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_TEA_SIGNS_TEA_E_SIGN_2`: `ASSET_SIGNBOARD` at `TEA_E_SIGN_2` (18.88, 63.40, 4.45), size 1.38×0.12×0.38m, yaw 270.00deg
- `PLACE_TEA_STOOL_EAST_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (17.88, 61.30, 1.40), size 0.38×0.41×0.58m, yaw 270.00deg
- `PLACE_TEA_STOOL_WEST_NORTH_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (16.45, 61.75, 1.40), size 0.38×0.41×0.58m, yaw 110.00deg
- `PLACE_TEA_STOOL_WEST_SOUTH_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (16.45, 60.85, 1.40), size 0.38×0.41×0.58m, yaw 70.00deg
- `PLACE_TEA_TABLE_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_TABLE` at `LMK_TEA_TERRACE_01` (17.15, 61.30, 1.40), size 1.13×0.71×0.80m, yaw 90.00deg
- `PLACE_TEA_TERRACE_SHADE_TEA_TERRACE_SHADE_01`: `ASSET_CLOTH_CANOPY` at `TEA_TERRACE_SHADE_01` (15.00, 62.40, 5.70), size 1.90×6.80×0.18m, yaw 90.00deg
- `PLACE_TEXTILE_CANOPY_CANOPY_TEXTILE_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_TEXTILE_01` (29.50, 54.39, 4.20), size 4.00×11.00×0.18m, yaw 90.00deg
- `PLACE_TEXTILE_COVER_COVER_TEXTILE_01`: `ASSET_COVER_GOODS` at `COVER_TEXTILE_01` (32.60, 58.20, 0.00), size 1.50×0.75×1.00m, yaw 90.00deg
- `PLACE_TEXTILE_LANTERN_LANTERN_TEXTILE_01`: `ASSET_CC0_LANTERN` at `LANTERN_TEXTILE_01` (24.45, 55.20, 4.15), size 0.22×0.23×0.53m, yaw 90.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_1`: `ASSET_SIGNBOARD` at `TEXTILE_E_SIGN_1` (34.88, 51.18, 3.85), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_1`: `ASSET_SIGNBOARD` at `TEXTILE_W_SIGN_1` (24.12, 51.18, 3.85), size 2.20×0.12×0.38m, yaw 90.00deg
