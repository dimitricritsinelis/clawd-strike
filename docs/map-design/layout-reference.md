# Bazaar Map v3 — Compiled Layout Reference

Generated from `docs/map-design/specs/map_spec.json` through the shared v3 compiler. Runtime and this reference consume the same absolute placements; this document performs no facade or material inference.

- Format: `3.0`
- Zones: 25
- Frontages: 38
- Architecture placements: 145
- Dressing placements: 184

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

### `active_merchant_rug_complete` — Rug merchant display and closed service entry

- Family: `active_merchant`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_plastered_wall`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`, timber `ph_worn_planks`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `shop_recess_market`, `door_shop_timber`, `window_shuttered`, `window_screened`, `pilaster_facade`, `window_dark_recess`

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
- Modules: `door_residential_timber`, `window_dark_recess`, `window_screened`, `blind_niche`, `pilaster_facade`, `door_shop_timber`, `window_shuttered`

### `quiet_residential_cut_stone_pilaster_relief` — Coursed-limestone timber-closure relief

- Family: `quiet_residential`
- Massing: `MASSING_FRONTAGE_RELIEF`
- Materials: wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `timber_coverage_closure`, `pilaster_coverage`

### `quiet_residential_dyers_lime` — Dyers house lime plaster and cut-stone trim

- Family: `quiet_residential`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_beige_wall_002`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`
- Modules: `door_residential_timber`, `window_dark_recess`, `window_screened`, `blind_niche`, `pilaster_facade`, `door_shop_timber`, `window_shuttered`

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

### `service_inspection` — Retaining enclosure with sealed inspection panels

- Family: `service_storage`
- Massing: `MASSING_LOW_MERCHANT`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_002`
- Modules: `door_storage_heavy`, `vent_service`, `window_dark_recess`, `blind_niche`, `pilaster_facade`, `inspection_panel`

### `service_storage` — Stone service and storage frontage

- Family: `service_storage`
- Massing: `MASSING_LOW_MERCHANT`
- Materials: wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_002`
- Modules: `door_storage_heavy`, `vent_service`, `window_dark_recess`, `blind_niche`, `pilaster_facade`

## Frontage Placements

### `FRONTAGE_CARAVAN_COURT_EAST_NORTH`

- Zone/face: `CARAVAN_COURT` / `east`
- Profile/massing: `quiet_residential_warmwash_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_EAST_NORTH_BAY_01`, `ARCH_FRONTAGE_CARAVAN_COURT_EAST_NORTH_MASSING`

### `FRONTAGE_CARAVAN_COURT_EAST_SOUTH`

- Zone/face: `CARAVAN_COURT` / `east`
- Profile/massing: `quiet_residential_ochre_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_BAY_01`, `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_MASSING`

### `FRONTAGE_CARAVAN_COURT_WEST`

- Zone/face: `CARAVAN_COURT` / `west`
- Profile/massing: `service_storage` / `MASSING_LOW_MERCHANT`
- Explicit bays: `BAY_NICHE_S:blind_niche@0.14`, `BAY_DOOR_S:door_storage_heavy@0.32`, `BAY_NICHE_AXIS:blind_niche@0.50`, `BAY_DOOR_N:door_storage_heavy@0.68`, `BAY_NICHE_N:blind_niche@0.86`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_DOOR_N`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_DOOR_S`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_AXIS`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_N`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_S`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_MASSING`

### `FRONTAGE_COVERED_SOUK_EAST`

- Zone/face: `COVERED_SOUK` / `east`
- Profile/massing: `covered_arcade_lime` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:arch_arcade@0.14`, `GROUND_02:arch_arcade@0.50`, `GROUND_03:arch_arcade@0.86`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_01`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_02`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_03`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_MASSING`

### `FRONTAGE_COVERED_SOUK_SOUTH`

- Zone/face: `COVERED_SOUK` / `south`
- Profile/massing: `quiet_residential_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_SOUTH_BAY_01`, `ARCH_FRONTAGE_COVERED_SOUK_SOUTH_MASSING`

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
- Explicit bays: `GROUND_01:blind_niche@0.06`, `GROUND_02:blind_niche@0.35`, `GROUND_03:blind_niche@0.65`, `GROUND_04:blind_niche@0.94`
- Compiled placements: `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_01`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_02`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_03`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_GROUND_04`, `ARCH_FRONTAGE_DYERS_ALLEY_EAST_MASSING`

### `FRONTAGE_DYERS_ALLEY_WEST_N`

- Zone/face: `DYERS_ALLEY` / `west`
- Profile/massing: `quiet_residential_dyers_lime` / `MASSING_LOW_MERCHANT`
- Explicit bays: `BAY_WINDOW_S:window_screened@0.22`, `BAY_DOOR:door_residential_timber@0.50`, `BAY_WINDOW_N:window_screened@0.78`
- Compiled placements: `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_DOOR`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_N`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_S`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_MASSING`

### `FRONTAGE_DYERS_ALLEY_WEST_S`

- Zone/face: `DYERS_ALLEY` / `west`
- Profile/massing: `service_storage` / `MASSING_MID_MIXED`
- Explicit bays: `BAY_NICHE_S:blind_niche@0.21`, `BAY_VENT_S:vent_service@0.21`, `BAY_CART_DOOR:door_storage_heavy@0.50`, `BAY_VENT_AXIS:vent_service@0.50`, `BAY_NICHE_N:blind_niche@0.79`, `BAY_VENT_N:vent_service@0.79`
- Compiled placements: `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_CART_DOOR`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_NICHE_N`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_NICHE_S`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_VENT_AXIS`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_VENT_N`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_BAY_VENT_S`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_S_MASSING`

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
- Explicit bays: `BAY_NICHE_AXIS:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_BAY_NICHE_AXIS`, `ARCH_FRONTAGE_LINK_NORTH_WEST_NORTH_MASSING`

### `FRONTAGE_NORTH_COURT_EAST_N`

- Zone/face: `NORTH_COURT` / `east`
- Profile/massing: `quiet_residential_cut_stone` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_NICHE_S:blind_niche@0.31`, `BAY_NICHE_N:blind_niche@0.69`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_EAST_N_BAY_NICHE_N`, `ARCH_FRONTAGE_NORTH_COURT_EAST_N_BAY_NICHE_S`, `ARCH_FRONTAGE_NORTH_COURT_EAST_N_MASSING`

### `FRONTAGE_NORTH_COURT_EAST_S`

- Zone/face: `NORTH_COURT` / `east`
- Profile/massing: `quiet_residential` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_WINDOW_S:window_dark_recess@0.22`, `BAY_DOOR:door_residential_timber@0.50`, `BAY_WINDOW_N:window_dark_recess@0.78`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_EAST_S_BAY_DOOR`, `ARCH_FRONTAGE_NORTH_COURT_EAST_S_BAY_WINDOW_N`, `ARCH_FRONTAGE_NORTH_COURT_EAST_S_BAY_WINDOW_S`, `ARCH_FRONTAGE_NORTH_COURT_EAST_S_MASSING`

### `FRONTAGE_NORTH_COURT_NORTH`

- Zone/face: `NORTH_COURT` / `north`
- Profile/massing: `quiet_residential_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.33`, `BAY_02:blind_niche@0.67`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_NORTH_BAY_01`, `ARCH_FRONTAGE_NORTH_COURT_NORTH_BAY_02`, `ARCH_FRONTAGE_NORTH_COURT_NORTH_MASSING`

### `FRONTAGE_NORTH_COURT_SOUTH`

- Zone/face: `NORTH_COURT` / `south`
- Profile/massing: `quiet_residential_warmwash_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_SOUTH_BAY_01`, `ARCH_FRONTAGE_NORTH_COURT_SOUTH_MASSING`

### `FRONTAGE_NORTH_COURT_WEST`

- Zone/face: `NORTH_COURT` / `west`
- Profile/massing: `hero_courtyard_beige` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_fortified_gate@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_WEST_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_WEST_MASSING`, `ARCH_FRONTAGE_NORTH_COURT_WEST_STORY_1_WINDOW_01`

### `FRONTAGE_NORTH_COURT_WEST_SOUTH`

- Zone/face: `NORTH_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:door_residential_timber@0.50`, `STORY_1_WINDOW_01:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_GROUND_01`, `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_MASSING`, `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_STORY_1_WINDOW_01`

### `FRONTAGE_RUG_GATE_EAST`

- Zone/face: `RUG_GATE` / `east`
- Profile/massing: `quiet_residential` / `MASSING_LOW_MERCHANT`
- Explicit bays: `BAY_01:door_residential_timber@0.36`, `BAY_02:window_dark_recess@0.65`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_EAST_BAY_01`, `ARCH_FRONTAGE_RUG_GATE_EAST_BAY_02`, `ARCH_FRONTAGE_RUG_GATE_EAST_MASSING`

### `FRONTAGE_RUG_GATE_EAST_SOUTH`

- Zone/face: `RUG_GATE` / `east`
- Profile/massing: `quiet_residential_cut_stone` / `MASSING_LOW_MERCHANT`
- Explicit bays: `BAY_01:pilaster_facade@0.50`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_BAY_01`, `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_MASSING`

### `FRONTAGE_RUG_GATE_WEST`

- Zone/face: `RUG_GATE` / `west`
- Profile/massing: `active_merchant_rug_complete` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:shop_recess_market@0.26`, `STORY_1_WINDOW_01:window_shuttered@0.26`, `GROUND_02:door_shop_timber@0.74`, `STORY_1_WINDOW_02:window_dark_recess@0.74`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_01`, `ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_02`, `ARCH_FRONTAGE_RUG_GATE_WEST_MASSING`, `ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_RUG_GATE_WEST_STORY_1_WINDOW_02`

### `FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID`

- Zone/face: `SERVICE_NORTH` / `east`
- Profile/massing: `quiet_residential_warmwash_relief` / `MASSING_SERVICE_SPINE`
- Explicit bays: `GROUND_01:blind_niche@0.33`, `STORY_1_WINDOW_01:blind_niche@0.50`, `GROUND_02:blind_niche@0.67`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_GROUND_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_GROUND_02`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_MASSING`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_STORY_1_WINDOW_01`

### `FRONTAGE_SERVICE_NORTH_EAST_SPINE_N`

- Zone/face: `SERVICE_NORTH` / `east`
- Profile/massing: `quiet_residential_relief` / `MASSING_SERVICE_SPINE`
- Explicit bays: `BAY_01:blind_niche@0.33`, `BAY_02:blind_niche@0.67`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_N_BAY_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_N_BAY_02`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_N_MASSING`

### `FRONTAGE_SERVICE_NORTH_EAST_SPINE_S`

- Zone/face: `SERVICE_NORTH` / `east`
- Profile/massing: `service_inspection` / `MASSING_SERVICE_SPINE`
- Explicit bays: `STORY_1_WINDOW_01:vent_service@0.10`, `GROUND_01:inspection_panel@0.25`, `STORY_1_WINDOW_02:vent_service@0.50`, `GROUND_02:inspection_panel@0.75`, `STORY_1_WINDOW_03:vent_service@0.90`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_GROUND_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_GROUND_02`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_MASSING`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_STORY_1_WINDOW_02`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_STORY_1_WINDOW_03`

### `FRONTAGE_SERVICE_SOUTH_EAST`

- Zone/face: `SERVICE_SOUTH` / `east`
- Profile/massing: `quiet_residential_warmwash_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.25`, `BAY_02:blind_niche@0.50`, `BAY_03:blind_niche@0.75`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_BAY_01`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_BAY_02`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_BAY_03`, `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_MASSING`

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
- Profile/massing: `quiet_residential_relief` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_BAY_01`, `ARCH_FRONTAGE_SPAWN_B_SOUTH_EAST_MASSING`

### `FRONTAGE_SPAWN_B_SOUTH_WEST`

- Zone/face: `SPAWN_B_COURTYARD` / `south`
- Profile/massing: `quiet_residential_cut_stone` / `MASSING_FRONTAGE_RELIEF`
- Explicit bays: `BAY_01:blind_niche@0.50`
- Compiled placements: `ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_BAY_01`, `ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_MASSING`

### `FRONTAGE_SPICE_STREET_EAST`

- Zone/face: `SPICE_STREET` / `east`
- Profile/massing: `quiet_residential_cut_stone` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:door_residential_timber@0.07`, `GROUND_02:blind_niche@0.29`, `GROUND_03:door_residential_timber@0.50`, `GROUND_04:door_residential_timber@0.71`, `GROUND_05:blind_niche@0.93`
- Compiled placements: `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_01`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_02`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_03`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_04`, `ARCH_FRONTAGE_SPICE_STREET_EAST_GROUND_05`, `ARCH_FRONTAGE_SPICE_STREET_EAST_MASSING`

### `FRONTAGE_SPICE_STREET_WEST`

- Zone/face: `SPICE_STREET` / `west`
- Profile/massing: `active_merchant` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:shop_recess_market@0.12`, `STORY_1_WINDOW_01:window_shuttered@0.12`, `GROUND_02:door_shop_timber@0.31`, `STORY_1_WINDOW_02:window_shuttered@0.31`, `GROUND_03:shop_recess_market@0.50`, `STORY_1_WINDOW_03:window_shuttered@0.50`, `GROUND_04:shop_recess_market@0.69`, `STORY_1_WINDOW_04:window_shuttered@0.69`, `GROUND_05:door_shop_timber@0.88`, `STORY_1_WINDOW_05:window_shuttered@0.88`
- Compiled placements: `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_02`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_03`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_04`, `ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_05`, `ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_02`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_03`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_04`, `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_05`

### `FRONTAGE_TEA_TERRACE_EAST`

- Zone/face: `TEA_TERRACE` / `east`
- Profile/massing: `active_merchant_ochre` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:shop_recess_market@0.21`, `STORY_1_WINDOW_01:window_shuttered@0.21`, `GROUND_02:door_shop_timber@0.79`, `STORY_1_WINDOW_02:window_shuttered@0.79`
- Compiled placements: `ARCH_FRONTAGE_TEA_TERRACE_EAST_GROUND_01`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_GROUND_02`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_MASSING`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_STORY_1_WINDOW_02`

### `FRONTAGE_TEXTILE_ARCADE_EAST`

- Zone/face: `TEXTILE_ARCADE` / `east`
- Profile/massing: `covered_arcade_lime` / `MASSING_LOW_MERCHANT`
- Explicit bays: `GROUND_01:arch_arcade@0.14`, `GROUND_02:column_arcade@0.38`, `GROUND_03:arch_arcade@0.62`, `GROUND_04:arch_arcade@0.86`
- Compiled placements: `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_GROUND_04`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_MASSING`

### `FRONTAGE_TEXTILE_ARCADE_WEST`

- Zone/face: `TEXTILE_ARCADE` / `west`
- Profile/massing: `covered_arcade` / `MASSING_MID_MIXED`
- Explicit bays: `GROUND_01:arch_arcade@0.14`, `STORY_1_WINDOW_01:window_screened@0.14`, `GROUND_02:column_arcade@0.38`, `GROUND_03:arch_arcade@0.62`, `STORY_1_WINDOW_03:window_screened@0.62`, `GROUND_04:arch_arcade@0.86`, `STORY_1_WINDOW_04:window_screened@0.86`
- Compiled placements: `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_GROUND_04`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_MASSING`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_STORY_1_WINDOW_04`

## Dressing Placements

- `PLACE_B18_DYE_COUNTER_B18_SAMPLE_DISPLAY`: `ASSET_B18_DYE_COUNTER` at `B18_SAMPLE_DISPLAY` (53.17, 44.82, 0.14), size 1.48×0.34×2.11m, yaw 450.00deg
- `PLACE_B18_PACKING_FINISH_B18_PACKING_DISPLAY`: `ASSET_B18_PACKING_FINISH` at `B18_PACKING_DISPLAY` (53.17, 35.18, 0.14), size 1.48×0.34×1.53m, yaw 450.00deg
- `PLACE_B18_ROOF_ACCESS_B18_ROOF_ACCESS`: `ASSET_B18_ROOF_ACCESS` at `B18_ROOF_ACCESS` (55.50, 42.80, 4.76), size 1.80×3.80×2.59m, yaw 180.00deg
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
- `PLACE_B6_TEXTILE_LAUNDRY_B6_LAUNDRY_TEXTILE_02`: `ASSET_LAUNDRY_LINE` at `B6_LAUNDRY_TEXTILE_02` (29.50, 58.87, 4.97), size 1.15×11.00×0.85m, yaw 90.00deg
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
- `PLACE_CENTRAL_DYE_DISPLAY_CENTRAL_DYE_DISPLAY`: `ASSET_B18_DYE_COUNTER` at `CENTRAL_DYE_DISPLAY` (40.83, 36.14, 0.14), size 1.48×0.34×2.11m, yaw 270.00deg
- `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_NORTH`: `ASSET_SCREEN_SC_C` at `CENTRAL_SCREEN_NORTH` (40.98, 45.36, 4.15), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_SOUTH_1`: `ASSET_SCREEN_SC_C` at `CENTRAL_SCREEN_SOUTH_1` (40.98, 34.38, 4.15), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_SOUTH_2`: `ASSET_SCREEN_SC_C` at `CENTRAL_SCREEN_SOUTH_2` (40.98, 37.90, 4.15), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_CENTRAL_SCREENS_FOUNTAIN_COURT_CENTRAL_SCREEN_COURT`: `ASSET_SCREEN_SC_C` at `CENTRAL_SCREEN_COURT` (36.02, 45.36, 5.15), size 1.00×0.24×1.40m, yaw 450.00deg
- `PLACE_DYERS_CANOPY_CANOPY_DYERS_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_DYERS_01` (47.15, 45.36, 4.25), size 4.40×11.70×0.18m, yaw 90.00deg
- `PLACE_DYERS_CERAMIC_VESSEL_LMK_DYERS_DISTRICT`: `ASSET_DYERS_CERAMIC_VESSEL` at `LMK_DYERS_DISTRICT` (43.42, 43.88, 0.00), size 0.56×0.43×0.32m, yaw -12.00deg
- `PLACE_DYERS_COVER_COVER_DYERS_01`: `ASSET_COVER_GOODS` at `COVER_DYERS_01` (50.50, 43.60, 0.00), size 1.50×0.75×1.00m, yaw 75.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_01`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_01` (52.42, 13.40, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_02`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_02` (52.42, 19.10, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_03`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_03` (52.42, 23.70, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_CLOTH_DYERS_E_RACK_04`: `ASSET_DYERS_HANGING_TEXTILES` at `DYERS_E_RACK_04` (52.42, 29.20, 1.18), size 2.25×0.16×1.55m, yaw 270.00deg
- `PLACE_DYERS_E_RACK_VAT_DYERS_E_RACK_04`: `ASSET_DYERS_SEALED_VAT` at `DYERS_E_RACK_04` (52.44, 29.75, 0.00), size 0.70×0.71×0.82m, yaw 263.00deg
- `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_01`: `ASSET_DYERS_CERAMIC_VESSEL` at `DYERS_E_RACK_01` (52.50, 12.78, 0.00), size 0.66×0.50×0.37m, yaw 281.00deg
- `PLACE_DYERS_E_RACK_VESSEL_DYERS_E_RACK_03`: `ASSET_DYERS_CERAMIC_VESSEL` at `DYERS_E_RACK_03` (52.50, 23.08, 0.00), size 0.66×0.50×0.37m, yaw 281.00deg
- `PLACE_DYERS_HOUSE_HATCH_DYERS_HOUSE_ROOF_HATCH`: `ASSET_DYERS_ROOF_HATCH` at `DYERS_HOUSE_ROOF_HATCH` (42.90, 23.50, 4.76), size 1.00×1.00×0.18m, yaw 180.00deg
- `PLACE_DYERS_HOUSE_SCREENS_DYERS_HOUSE_SCREEN_N`: `ASSET_DYERS_SCREEN_SC_D` at `DYERS_HOUSE_SCREEN_N` (45.98, 28.44, 0.85), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_DYERS_HOUSE_SCREENS_DYERS_HOUSE_SCREEN_S`: `ASSET_DYERS_SCREEN_SC_D` at `DYERS_HOUSE_SCREEN_S` (45.98, 23.79, 0.85), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_DYERS_HOUSE_VENT_DYERS_HOUSE_LOFT_VENT`: `ASSET_DYERS_LOFT_VENT` at `DYERS_HOUSE_LOFT_VENT` (46.00, 26.11, 3.50), size 0.58×0.12×0.48m, yaw 270.00deg
- `PLACE_DYERS_LANTERN_LANTERN_DYERS_01`: `ASSET_CC0_LANTERN` at `LANTERN_DYERS_01` (52.50, 40.50, 4.10), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_E_SIGN_1`: `ASSET_SIGNBOARD` at `DYE_E_SIGN_1` (52.88, 40.00, 3.85), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_E_SIGN_2`: `ASSET_SIGNBOARD` at `DYE_E_SIGN_2` (52.88, 44.82, 3.85), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_W_SIGN_1`: `ASSET_SIGNBOARD` at `DYE_W_SIGN_1` (41.12, 36.14, 3.85), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_DYERS_VAT_EAST_LMK_DYERS_DISTRICT`: `ASSET_DYERS_SEALED_VAT` at `LMK_DYERS_DISTRICT` (43.48, 44.50, 0.00), size 0.61×0.62×0.71m, yaw 11.00deg
- `PLACE_DYERS_VAT_WEST_LMK_DYERS_DISTRICT`: `ASSET_DYERS_SEALED_VAT` at `LMK_DYERS_DISTRICT` (42.72, 44.42, 0.00), size 0.70×0.72×0.83m, yaw -8.00deg
- `PLACE_FOUNTAIN_COVER_COVER_FOUNTAIN_01`: `ASSET_COVER_GOODS` at `COVER_FOUNTAIN_01` (33.80, 35.20, 0.00), size 1.50×0.75×1.00m, yaw 80.00deg
- `PLACE_FOUNTAIN_LANTERN_LANTERN_FOUNTAIN_01`: `ASSET_CC0_LANTERN` at `LANTERN_FOUNTAIN_01` (35.45, 39.00, 4.25), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_FOUNTAIN_LMK_FOUNTAIN_01`: `ASSET_FOUNTAIN` at `LMK_FOUNTAIN_01` (24.50, 43.50, 0.00), size 3.00×3.00×1.32m, yaw 0.00deg
- `PLACE_FOUNTAIN_PALM_PALM_FOUNTAIN_01`: `ASSET_PALM` at `PALM_FOUNTAIN_01` (22.40, 45.00, 0.00), size 3.80×3.80×7.80m, yaw 0.00deg
- `PLACE_L34_CARAVAN_CART_L34_CARAVAN_CART_01`: `ASSET_MARKET_CART` at `L34_CARAVAN_CART_01` (14.10, 45.05, 0.00), size 1.30×0.81×0.96m, yaw 261.00deg
- `PLACE_L34_CARAVAN_PACK_LINE_L34_CARAVAN_PACK_LINE_01`: `ASSET_LAUNDRY_LINE` at `L34_CARAVAN_PACK_LINE_01` (9.00, 47.80, 4.38), size 1.20×11.30×0.85m, yaw 90.00deg
- `PLACE_L34_COVERED_SOUK_BASKET_LMK_DYERS_DISTRICT`: `ASSET_CC0_BASKET` at `LMK_DYERS_DISTRICT` (42.38, 43.82, 0.00), size 0.41×0.30×0.24m, yaw -12.00deg
- `PLACE_L34_DOGLEG_DYERS_LINE_L34_DOGLEG_DYERS_LINE_01`: `ASSET_LAUNDRY_LINE` at `L34_DOGLEG_DYERS_LINE_01` (49.50, 60.40, 4.65), size 1.30×6.96×0.85m, yaw 90.00deg
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
- `PLACE_RUG_DISPLAY_COMPLETE_MOUNT_RUG_DISPLAY_COMPLETE`: `ASSET_RUG_ROLL_CHEST` at `MOUNT_RUG_DISPLAY_COMPLETE` (20.84, 66.92, 0.08), size 1.48×0.32×2.30m, yaw 270.00deg
- `PLACE_RUG_LANTERN_LANTERN_RUG_01`: `ASSET_CC0_LANTERN` at `LANTERN_RUG_01` (33.75, 74.44, 3.65), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_RUG_PANELED_WINDOW_MOUNT_RUG_PANELED_WINDOW`: `ASSET_SHUTTER_PANELED` at `MOUNT_RUG_PANELED_WINDOW` (20.98, 66.92, 3.68), size 1.60×0.24×1.65m, yaw 270.00deg
- `PLACE_RUG_SIGNS_RUG_W_SIGN_1`: `ASSET_SIGNBOARD` at `RUG_W_SIGN_1` (21.12, 66.92, 3.32), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_SPAWN_A_COVER_SPAWN_A_COVER_01`: `ASSET_SPAWN_COVER` at `SPAWN_A_COVER_01` (20.20, 5.20, 0.00), size 2.20×1.10×1.30m, yaw 0.00deg
- `PLACE_SPAWN_A_EAST_WORKS_LMK_SPAWN_A_EAST_WORKS_01`: `ASSET_SPAWN_A_EAST_DYE_WORKS` at `LMK_SPAWN_A_EAST_WORKS_01` (38.20, 4.00, 0.00), size 8.00×2.40×12.80m, yaw 90.00deg
- `PLACE_SPAWN_A_EDGE_EAST_WORKS_BARREL_LMK_SPAWN_A_EAST_WORKS_01`: `ASSET_SPAWN_A_EDGE_BARREL` at `LMK_SPAWN_A_EAST_WORKS_01` (38.20, 1.90, 0.00), size 0.70×0.72×0.83m, yaw 90.00deg
- `PLACE_SPAWN_A_EDGE_EAST_WORKS_CRATE_LMK_SPAWN_A_EAST_WORKS_01`: `ASSET_DECORATIVE_CRATE` at `LMK_SPAWN_A_EAST_WORKS_01` (38.15, 7.00, 0.15), size 0.91×0.45×0.38m, yaw 90.00deg
- `PLACE_SPAWN_A_EDGE_EAST_WORKS_POT_LMK_SPAWN_A_EAST_WORKS_01`: `ASSET_SPAWN_A_EDGE_POT` at `LMK_SPAWN_A_EAST_WORKS_01` (38.15, 2.75, 0.00), size 0.69×0.53×0.39m, yaw 90.00deg
- `PLACE_SPAWN_A_EDGE_EAST_WORKS_TOP_POT_LMK_SPAWN_A_EAST_WORKS_01`: `ASSET_SPAWN_A_EDGE_POT` at `LMK_SPAWN_A_EAST_WORKS_01` (38.15, 7.00, 0.54), size 0.49×0.38×0.28m, yaw 90.00deg
- `PLACE_SPAWN_A_EDGE_EXIT_EAST_CRATE_LMK_SPAWN_A_EXIT_EAST_01`: `ASSET_DECORATIVE_CRATE` at `LMK_SPAWN_A_EXIT_EAST_01` (38.35, 12.85, 0.15), size 0.91×0.45×0.38m, yaw 180.00deg
- `PLACE_SPAWN_A_EDGE_EXIT_EAST_POT_LMK_SPAWN_A_EXIT_EAST_01`: `ASSET_SPAWN_A_EDGE_POT` at `LMK_SPAWN_A_EXIT_EAST_01` (37.55, 12.85, 0.15), size 0.66×0.50×0.37m, yaw 180.00deg
- `PLACE_SPAWN_A_EDGE_WEST_BACKS_BARREL_LMK_SPAWN_A_WEST_BACKS_01`: `ASSET_SPAWN_A_EDGE_BARREL` at `LMK_SPAWN_A_WEST_BACKS_01` (17.80, 2.20, 0.00), size 0.67×0.68×0.78m, yaw 270.00deg
- `PLACE_SPAWN_A_EDGE_WEST_BACKS_POT_LMK_SPAWN_A_WEST_BACKS_01`: `ASSET_SPAWN_A_EDGE_POT` at `LMK_SPAWN_A_WEST_BACKS_01` (17.82, 3.05, 0.00), size 0.66×0.50×0.37m, yaw 270.00deg
- `PLACE_SPAWN_A_EXIT_EAST_LMK_SPAWN_A_EXIT_EAST_01`: `ASSET_SPAWN_A_EXIT_EAST_RETURN` at `LMK_SPAWN_A_EXIT_EAST_01` (36.25, 13.00, 0.00), size 5.50×2.00×7.60m, yaw 180.00deg
- `PLACE_SPAWN_A_EXIT_WEST_LMK_SPAWN_A_EXIT_WEST_01`: `ASSET_SPAWN_A_EXIT_WEST_RETURN` at `LMK_SPAWN_A_EXIT_WEST_01` (18.75, 13.00, 0.00), size 3.50×2.00×7.60m, yaw 180.00deg
- `PLACE_SPAWN_A_GATE_LMK_SPAWN_A_GATE_01`: `ASSET_SPAWN_A_GATE` at `LMK_SPAWN_A_GATE_01` (28.00, 0.85, 0.00), size 21.90×2.20×12.00m, yaw 180.00deg
- `PLACE_SPAWN_A_WEST_BACKS_LMK_SPAWN_A_WEST_BACKS_01`: `ASSET_SPAWN_A_WEST_BACKS` at `LMK_SPAWN_A_WEST_BACKS_01` (17.80, 4.00, 0.00), size 8.00×2.20×9.80m, yaw 270.00deg
- `PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01`: `ASSET_SPAWN_COVER` at `SPAWN_B_COVER_01` (35.20, 86.00, 0.00), size 2.20×1.10×1.30m, yaw 180.00deg
- `PLACE_SPAWN_B_DOOR_SHADE_E_MOUNT_SPAWN_B_DOOR_SHADE_E`: `ASSET_SPAWN_B_SHADE` at `MOUNT_SPAWN_B_DOOR_SHADE_E` (32.40, 91.24, 3.25), size 2.18×1.19×0.60m, yaw 0.00deg
- `PLACE_SPAWN_B_DOOR_SHADE_W_MOUNT_SPAWN_B_DOOR_SHADE_W`: `ASSET_SPAWN_B_SHADE` at `MOUNT_SPAWN_B_DOOR_SHADE_W` (23.60, 91.24, 3.25), size 2.18×1.19×0.60m, yaw 0.00deg
- `PLACE_SPAWN_B_NORTH_POT_MOUNT_SPAWN_B_NORTH_POT`: `ASSET_SPAWN_A_EDGE_POT` at `MOUNT_SPAWN_B_NORTH_POT` (18.40, 91.50, 0.00), size 0.82×0.63×0.46m, yaw 0.00deg
- `PLACE_SPAWN_B_NORTH_POT_SMALL_MOUNT_SPAWN_B_NORTH_POT_SMALL`: `ASSET_SPAWN_A_EDGE_POT` at `MOUNT_SPAWN_B_NORTH_POT_SMALL` (19.10, 91.60, 0.00), size 0.72×0.55×0.41m, yaw 0.00deg
- `PLACE_SPAWN_B_NORTH_UPPER_ROOM_MOUNT_SPAWN_B_NORTH_UPPER_ROOM`: `ASSET_SPAWN_B_UPPER_ROOM` at `MOUNT_SPAWN_B_NORTH_UPPER_ROOM` (21.30, 93.25, 10.00), size 3.30×2.68×2.95m, yaw 0.00deg
- `PLACE_SPAWN_B_PASSAGE_SHADE_MOUNT_SPAWN_B_PASSAGE_SHADE`: `ASSET_SPAWN_B_SHADE` at `MOUNT_SPAWN_B_PASSAGE_SHADE` (17.78, 83.50, 3.50), size 2.73×1.49×0.75m, yaw 270.00deg
- `PLACE_SPAWN_B_SECOND_UPPER_ROOM_MOUNT_SPAWN_B_SECOND_UPPER_ROOM`: `ASSET_SPAWN_B_UPPER_ROOM` at `MOUNT_SPAWN_B_SECOND_UPPER_ROOM` (35.50, 93.25, 9.85), size 3.30×2.68×2.95m, yaw 0.00deg
- `PLACE_SPAWN_B_SKYLINE_PALM_MOUNT_SPAWN_B_SKYLINE_PALM`: `ASSET_SPAWN_B_SKYLINE_PALM` at `MOUNT_SPAWN_B_SKYLINE_PALM` (17.10, 89.60, 7.40), size 2.85×2.85×5.85m, yaw 0.00deg
- `PLACE_SPAWN_B_WEST_BENCH_MOUNT_SPAWN_B_WEST_BENCH`: `ASSET_SPAWN_B_BENCH` at `MOUNT_SPAWN_B_WEST_BENCH` (17.43, 87.80, 0.00), size 1.80×0.42×0.49m, yaw 90.00deg
- `PLACE_SPAWN_B_WEST_POT_MOUNT_SPAWN_B_WEST_POT`: `ASSET_SPAWN_A_EDGE_POT` at `MOUNT_SPAWN_B_WEST_POT` (17.50, 89.40, 0.00), size 0.82×0.63×0.46m, yaw 0.00deg
- `PLACE_SPAWN_B_WEST_UPPER_ROOM_MOUNT_SPAWN_B_WEST_UPPER_ROOM`: `ASSET_SPAWN_B_UPPER_ROOM` at `MOUNT_SPAWN_B_WEST_UPPER_ROOM` (15.75, 86.90, 9.85), size 3.79×3.08×3.39m, yaw 270.00deg
- `PLACE_SPICE_BARREL_COVER_SPICE_01`: `ASSET_CC0_BARREL` at `COVER_SPICE_01` (21.90, 27.65, 0.00), size 0.67×0.68×0.78m, yaw 9.00deg
- `PLACE_SPICE_BASKET_COVER_SPICE_01`: `ASSET_CC0_BASKET` at `COVER_SPICE_01` (23.78, 27.98, 0.00), size 0.38×0.27×0.22m, yaw 27.00deg
- `PLACE_SPICE_CANOPIES_CANOPY_SPICE_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_SPICE_01` (27.00, 20.58, 5.67), size 3.60×12.00×0.18m, yaw 90.00deg
- `PLACE_SPICE_CANOPIES_CANOPY_SPICE_02`: `ASSET_CLOTH_CANOPY` at `CANOPY_SPICE_02` (27.00, 26.48, 5.67), size 3.20×12.00×0.18m, yaw 90.00deg
- `PLACE_SPICE_COUNTER_1_SPICE_W_SHOP_1`: `ASSET_SPICE_DRAWERS` at `SPICE_W_SHOP_1` (20.75, 17.24, 0.08), size 1.72×0.50×1.70m, yaw 270.00deg
- `PLACE_SPICE_COUNTER_3_MOUNT_SPICE_COUNTER_3`: `ASSET_GRAIN_BALANCE` at `MOUNT_SPICE_COUNTER_3` (20.75, 23.00, 0.08), size 1.72×0.50×1.64m, yaw 270.00deg
- `PLACE_SPICE_COUNTER_4_MOUNT_SPICE_COUNTER_4`: `ASSET_APOTHECARY` at `MOUNT_SPICE_COUNTER_4` (20.75, 25.88, 0.08), size 1.72×0.50×1.70m, yaw 270.00deg
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
- `PLACE_SPICE_LANTERN_LANTERN_SPICE_01`: `ASSET_CC0_LANTERN` at `LANTERN_SPICE_01` (21.45, 16.20, 3.80), size 0.22×0.23×0.53m, yaw 90.00deg
- `PLACE_SPICE_POTTERY_COVER_SPICE_01`: `ASSET_CC0_POTTERY` at `COVER_SPICE_01` (23.76, 27.22, 0.00), size 0.52×0.40×0.30m, yaw 15.00deg
- `PLACE_SPICE_ROOF_MIDDLE_MOUNT_SPICE_ROOF_MIDDLE`: `ASSET_SPICE_ROOF_MIDDLE` at `MOUNT_SPICE_ROOF_MIDDLE` (18.60, 24.44, 7.00), size 4.80×5.76×2.59m, yaw 180.00deg
- `PLACE_SPICE_ROOF_NORTH_MOUNT_SPICE_ROOF_NORTH`: `ASSET_SPICE_ROOF_NORTH` at `MOUNT_SPICE_ROOF_NORTH` (18.60, 28.94, 7.00), size 4.80×3.24×1.19m, yaw 180.00deg
- `PLACE_SPICE_ROOF_SOUTH_MOUNT_SPICE_ROOF_SOUTH`: `ASSET_SPICE_ROOF_SOUTH` at `MOUNT_SPICE_ROOF_SOUTH` (18.60, 18.50, 7.00), size 4.80×6.12×1.79m, yaw 180.00deg
- `PLACE_SPICE_SIGNS_SPICE_W_SIGN_1`: `ASSET_SIGNBOARD` at `SPICE_W_SIGN_1` (21.12, 17.24, 3.20), size 2.20×0.12×0.30m, yaw 90.00deg
- `PLACE_SPICE_SIGNS_SPICE_W_SIGN_3`: `ASSET_SIGNBOARD` at `SPICE_W_SIGN_3` (21.12, 23.00, 3.20), size 2.20×0.12×0.30m, yaw 90.00deg
- `PLACE_SPICE_UPPER_ROOM_MOUNT_SPICE_UPPER_ROOM`: `ASSET_SPICE_UPPER_ROOM` at `MOUNT_SPICE_UPPER_ROOM` (35.70, 27.28, 4.76), size 3.00×6.56×2.95m, yaw 180.00deg
- `PLACE_SPICE_WINDOW_1_MOUNT_SPICE_WINDOW_1`: `ASSET_SHUTTER_LOUVERED` at `MOUNT_SPICE_WINDOW_1` (20.98, 17.24, 3.68), size 1.60×0.24×1.65m, yaw 270.00deg
- `PLACE_SPICE_WINDOW_2_MOUNT_SPICE_WINDOW_2`: `ASSET_SHUTTER_PANELED` at `MOUNT_SPICE_WINDOW_2` (20.98, 20.12, 3.68), size 1.60×0.24×1.65m, yaw 270.00deg
- `PLACE_SPICE_WINDOW_3_MOUNT_SPICE_WINDOW_3`: `ASSET_SHUTTER_LOUVERED` at `MOUNT_SPICE_WINDOW_3` (20.98, 23.00, 3.68), size 1.60×0.24×1.65m, yaw 270.00deg
- `PLACE_SPICE_WINDOW_4_MOUNT_SPICE_WINDOW_4`: `ASSET_SHUTTER_WOVEN` at `MOUNT_SPICE_WINDOW_4` (20.98, 25.88, 3.68), size 1.60×0.24×1.65m, yaw 270.00deg
- `PLACE_SPICE_WINDOW_5_MOUNT_SPICE_WINDOW_5`: `ASSET_SHUTTER_PANELED` at `MOUNT_SPICE_WINDOW_5` (20.98, 28.76, 3.68), size 1.60×0.24×1.65m, yaw 270.00deg
- `PLACE_SUPPORT_B6_LAUNDRY_SPICE_01_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01`: `ASSET_ROOF_TIE_590` at `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_01` (34.88, 18.16, 5.59), size 3.75×0.16×0.45m, yaw 180.00deg
- `PLACE_SUPPORT_B6_LAUNDRY_SPICE_02_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02`: `ASSET_ROOF_TIE_595` at `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_02` (34.88, 23.76, 5.59), size 3.75×0.16×0.50m, yaw 180.00deg
- `PLACE_SUPPORT_B6_LAUNDRY_SPICE_03_MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03`: `ASSET_ROOF_TIE_610` at `MOUNT_SUPPORT_B6_LAUNDRY_SPICE_03` (34.88, 28.75, 5.59), size 3.75×0.16×0.65m, yaw 180.00deg
- `PLACE_SUPPORT_B6_LAUNDRY_TEXTILE_01_MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_01`: `ASSET_ROOF_TIE_610` at `MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_01` (36.88, 51.70, 5.59), size 3.75×0.16×0.65m, yaw 180.00deg
- `PLACE_SUPPORT_B6_LAUNDRY_TEXTILE_02_MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_02`: `ASSET_ROOF_TIE_490` at `MOUNT_SUPPORT_B6_LAUNDRY_TEXTILE_02` (36.88, 58.87, 4.83), size 3.75×0.16×0.97m, yaw 180.00deg
- `PLACE_SUPPORT_CANOPY_SPICE_01_MOUNT_SUPPORT_CANOPY_SPICE_01`: `ASSET_ROOF_TIE_555` at `MOUNT_SUPPORT_CANOPY_SPICE_01` (34.88, 20.58, 5.48), size 3.75×0.16×0.32m, yaw 180.00deg
- `PLACE_SUPPORT_CANOPY_SPICE_02_MOUNT_SUPPORT_CANOPY_SPICE_02`: `ASSET_ROOF_TIE_555` at `MOUNT_SUPPORT_CANOPY_SPICE_02` (34.88, 26.48, 5.48), size 3.75×0.16×0.32m, yaw 180.00deg
- `PLACE_TEA_COVER_COVER_TEA_01`: `ASSET_COVER_GOODS` at `COVER_TEA_01` (12.20, 63.80, 1.40), size 1.50×0.75×1.00m, yaw 90.00deg
- `PLACE_TEA_LANTERN_LANTERN_TEA_01`: `ASSET_CC0_LANTERN` at `LANTERN_TEA_01` (18.50, 60.50, 4.65), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST`: `ASSET_SIGNBOARD` at `TEA_RAMP_SIGN_EAST` (18.75, 54.30, 3.65), size 1.20×0.12×0.38m, yaw 270.00deg
- `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST`: `ASSET_SIGNBOARD` at `TEA_RAMP_SIGN_WEST` (11.25, 51.20, 3.05), size 1.10×0.12×0.38m, yaw 90.00deg
- `PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01`: `ASSET_TEA_SERVICE` at `LMK_TEA_TERRACE_01` (18.55, 62.65, 1.40), size 1.20×0.55×0.90m, yaw 90.00deg
- `PLACE_TEA_SIGNS_TEA_E_SIGN_1`: `ASSET_SIGNBOARD` at `TEA_E_SIGN_1` (18.88, 58.60, 4.45), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_TEA_STOOL_EAST_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (17.88, 61.30, 1.40), size 0.38×0.41×0.58m, yaw 270.00deg
- `PLACE_TEA_STOOL_WEST_NORTH_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (16.45, 61.75, 1.40), size 0.38×0.41×0.58m, yaw 110.00deg
- `PLACE_TEA_STOOL_WEST_SOUTH_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (16.45, 60.85, 1.40), size 0.38×0.41×0.58m, yaw 70.00deg
- `PLACE_TEA_TABLE_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_TABLE` at `LMK_TEA_TERRACE_01` (17.15, 61.30, 1.40), size 1.13×0.71×0.80m, yaw 90.00deg
- `PLACE_TEA_TERRACE_SHADE_TEA_TERRACE_SHADE_01`: `ASSET_CLOTH_CANOPY` at `TEA_TERRACE_SHADE_01` (15.00, 62.40, 5.70), size 1.90×6.80×0.18m, yaw 90.00deg
- `PLACE_TEA_WINDOW_1_MOUNT_TEA_WINDOW_1`: `ASSET_SHUTTER_LOUVERED` at `MOUNT_TEA_WINDOW_1` (19.02, 58.60, 5.08), size 1.60×0.24×1.65m, yaw 450.00deg
- `PLACE_TEA_WINDOW_2_MOUNT_TEA_WINDOW_2`: `ASSET_SHUTTER_WOVEN` at `MOUNT_TEA_WINDOW_2` (19.02, 63.40, 5.08), size 1.60×0.24×1.65m, yaw 450.00deg
- `PLACE_TEXTILE_BOOTH_DYE_E_TEXTILE_BOOTH`: `ASSET_TEXTILE_BOOTH` at `DYE_E_TEXTILE_BOOTH` (52.73, 40.00, 0.00), size 2.68×1.29×3.64m, yaw 450.00deg
- `PLACE_TEXTILE_CANOPY_CANOPY_TEXTILE_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_TEXTILE_01` (29.50, 54.39, 4.20), size 4.00×11.00×0.18m, yaw 90.00deg
- `PLACE_TEXTILE_COVER_COVER_TEXTILE_01`: `ASSET_COVER_GOODS` at `COVER_TEXTILE_01` (32.60, 58.20, 0.00), size 1.50×0.75×1.00m, yaw 90.00deg
- `PLACE_TEXTILE_EAST_GROUND_01_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_01_COMPLETE`: `ASSET_B18_PACKING_FINISH` at `MOUNT_TEXTILE_EAST_GROUND_01_COMPLETE` (35.16, 51.18, 0.14), size 1.48×0.34×1.53m, yaw 450.00deg
- `PLACE_TEXTILE_EAST_GROUND_03_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_03_COMPLETE`: `ASSET_RUG_GALLERY` at `MOUNT_TEXTILE_EAST_GROUND_03_COMPLETE` (35.16, 57.61, 0.14), size 1.48×0.32×2.30m, yaw 450.00deg
- `PLACE_TEXTILE_EAST_GROUND_04_COMPLETE_MOUNT_TEXTILE_EAST_GROUND_04_COMPLETE`: `ASSET_B18_PACKING_FINISH` at `MOUNT_TEXTILE_EAST_GROUND_04_COMPLETE` (35.16, 60.82, 0.14), size 1.48×0.34×1.53m, yaw 450.00deg
- `PLACE_TEXTILE_LANTERN_LANTERN_TEXTILE_01`: `ASSET_CC0_LANTERN` at `LANTERN_TEXTILE_01` (24.45, 55.20, 4.15), size 0.22×0.23×0.53m, yaw 90.00deg
- `PLACE_TEXTILE_SCREEN_1_MOUNT_TEXTILE_SCREEN_1`: `ASSET_TEXTILE_SCREEN_SC_V` at `MOUNT_TEXTILE_SCREEN_1` (23.98, 51.18, 4.15), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_TEXTILE_SCREEN_3_MOUNT_TEXTILE_SCREEN_3`: `ASSET_TEXTILE_SCREEN_SC_V` at `MOUNT_TEXTILE_SCREEN_3` (23.98, 57.61, 4.15), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_TEXTILE_SCREEN_4_MOUNT_TEXTILE_SCREEN_4`: `ASSET_TEXTILE_SCREEN_SC_V` at `MOUNT_TEXTILE_SCREEN_4` (23.98, 60.82, 4.15), size 1.00×0.24×1.40m, yaw 270.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_1`: `ASSET_SIGNBOARD` at `TEXTILE_E_SIGN_1` (34.88, 51.18, 3.85), size 2.20×0.12×0.38m, yaw 270.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_1`: `ASSET_SIGNBOARD` at `TEXTILE_W_SIGN_1` (24.12, 51.18, 3.85), size 2.20×0.12×0.38m, yaw 90.00deg
- `PLACE_TEXTILE_WEST_GROUND_01_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_01_COMPLETE`: `ASSET_RUG_GALLERY` at `MOUNT_TEXTILE_WEST_GROUND_01_COMPLETE` (23.84, 51.18, 0.14), size 1.48×0.32×2.30m, yaw 270.00deg
- `PLACE_TEXTILE_WEST_GROUND_03_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_03_COMPLETE`: `ASSET_RUG_ROLL_CHEST` at `MOUNT_TEXTILE_WEST_GROUND_03_COMPLETE` (23.84, 57.61, 0.14), size 1.48×0.32×2.30m, yaw 270.00deg
- `PLACE_TEXTILE_WEST_GROUND_04_COMPLETE_MOUNT_TEXTILE_WEST_GROUND_04_COMPLETE`: `ASSET_B18_PACKING_FINISH` at `MOUNT_TEXTILE_WEST_GROUND_04_COMPLETE` (23.84, 60.82, 0.14), size 1.48×0.34×1.53m, yaw 270.00deg
