# Bazaar Map v3 — Compiled Layout Reference

Generated from `docs/map-design/specs/map_spec.json` through the shared v3 compiler. Runtime and this reference consume the same absolute placements; this document performs no facade or material inference.

- Format: `3.0`
- Zones: 25
- Frontages: 20
- Architecture placements: 70
- Dressing placements: 61

## Facade Profiles

### `active_merchant` — Active merchant frontage

- Family: `active_merchant`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_lime_plaster_sun`, trim `ph_trim_sanded_01`, roof `ph_lime_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `shop_recess_market`, `door_shop_timber`, `window_shuttered`, `window_screened`

### `covered_arcade` — Covered arcade frontage

- Family: `covered_arcade`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_aged_plaster_ochre`, trim `ph_band_lime_soft`, roof `ph_aged_plaster_ochre`, timber `tm_balcony_wood_dark`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `arch_arcade`, `column_arcade`, `shop_recess_market`

### `hero_courtyard` — Hero courtyard frontage

- Family: `hero_courtyard`
- Massing: `MASSING_TALL_HERO`
- Materials: wall `ph_lime_plaster_sun`, trim `ph_trim_sanded_01`, roof `ph_lime_plaster_sun`, timber `tm_balcony_wood_dark`, metal `tm_balcony_painted_metal`, accent `tm_stained_glass_hero`
- Modules: `arch_hero_courtyard`, `door_fortified_gate`, `door_residential_timber`, `window_dark_recess`, `window_screened`, `window_landmark_stained`, `blind_niche`

### `quiet_residential` — Quiet residential frontage

- Family: `quiet_residential`
- Massing: `MASSING_MID_MIXED`
- Materials: wall `ph_aged_plaster_ochre`, trim `ph_trim_sanded_01`, roof `ph_aged_plaster_ochre`, timber `tm_balcony_wood_dark`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `door_residential_timber`, `window_dark_recess`, `window_screened`, `blind_niche`

### `service_storage` — Service and storage frontage

- Family: `service_storage`
- Massing: `MASSING_LOW_MERCHANT`
- Materials: wall `ph_sandstone_blocks_05`, trim `ph_band_lime_soft`, roof `ph_sandstone_blocks_05`, timber `tm_balcony_wood_dark`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`
- Modules: `door_storage_heavy`, `vent_service`, `blind_niche`

## Frontage Placements

### `FRONTAGE_CARAVAN_COURT_WEST`

- Zone/face: `CARAVAN_COURT` / `west`
- Profile/massing: `service_storage` / `MASSING_LOW_MERCHANT`
- Explicit bays: `DOOR_01:door_storage_heavy@0.28`, `VENT_01:vent_service@0.62`, `NICHE_01:blind_niche@0.82`
- Compiled placements: `ARCH_FRONTAGE_CARAVAN_COURT_WEST_DOOR_01`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_MASSING`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_NICHE_01`, `ARCH_FRONTAGE_CARAVAN_COURT_WEST_VENT_01`

### `FRONTAGE_COVERED_SOUK_EAST`

- Zone/face: `COVERED_SOUK` / `east`
- Profile/massing: `covered_arcade` / `MASSING_LOW_MERCHANT`
- Explicit bays: `COLUMN_01:column_arcade@0.10`, `ARCH_01:arch_arcade@0.34`, `ARCH_02:arch_arcade@0.70`, `COLUMN_02:column_arcade@0.94`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_EAST_ARCH_01`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_ARCH_02`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_COLUMN_01`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_COLUMN_02`, `ARCH_FRONTAGE_COVERED_SOUK_EAST_MASSING`

### `FRONTAGE_COVERED_SOUK_WEST`

- Zone/face: `COVERED_SOUK` / `west`
- Profile/massing: `covered_arcade` / `MASSING_MID_MIXED`
- Explicit bays: `ARCH_01:arch_arcade@0.24`, `ARCH_02:arch_arcade@0.75`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_WEST_ARCH_01`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_ARCH_02`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_MASSING`

### `FRONTAGE_COVERED_SOUK_WEST_NORTH`

- Zone/face: `COVERED_SOUK` / `west`
- Profile/massing: `covered_arcade` / `MASSING_MID_MIXED`
- Explicit bays: `ARCH_03:arch_arcade@0.50`
- Compiled placements: `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_ARCH_03`, `ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_MASSING`

### `FRONTAGE_DYERS_ALLEY_WEST`

- Zone/face: `DYERS_ALLEY` / `west`
- Profile/massing: `service_storage` / `MASSING_MID_MIXED`
- Explicit bays: `DOOR_01:door_storage_heavy@0.20`, `VENT_01:vent_service@0.55`, `NICHE_01:blind_niche@0.79`
- Compiled placements: `ARCH_FRONTAGE_DYERS_ALLEY_WEST_DOOR_01`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_MASSING`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_NICHE_01`, `ARCH_FRONTAGE_DYERS_ALLEY_WEST_VENT_01`

### `FRONTAGE_FOUNTAIN_COURT_EAST`

- Zone/face: `FOUNTAIN_COURT` / `east`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `WINDOW_01:window_dark_recess@0.56`, `WINDOW_02:window_screened@0.56`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_WINDOW_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_WINDOW_02`

### `FRONTAGE_FOUNTAIN_COURT_EAST_NORTH`

- Zone/face: `FOUNTAIN_COURT` / `east`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `WINDOW_03:window_dark_recess@0.50`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_WINDOW_03`

### `FRONTAGE_FOUNTAIN_COURT_WEST`

- Zone/face: `FOUNTAIN_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_TALL_HERO`
- Explicit bays: `ARCH_01:arch_hero_courtyard@0.38`, `WINDOW_01:window_landmark_stained@0.88`, `DOOR_01:door_residential_timber@0.89`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_ARCH_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_DOOR_01`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_WINDOW_01`

### `FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH`

- Zone/face: `FOUNTAIN_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_TALL_HERO`
- Explicit bays: `SCREEN_01:window_screened@0.50`
- Compiled placements: `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_MASSING`, `ARCH_FRONTAGE_FOUNTAIN_COURT_WEST_SOUTH_SCREEN_01`

### `FRONTAGE_NORTH_COURT_WEST`

- Zone/face: `NORTH_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `WINDOW_02:window_dark_recess@0.88`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_WEST_MASSING`, `ARCH_FRONTAGE_NORTH_COURT_WEST_WINDOW_02`

### `FRONTAGE_NORTH_COURT_WEST_SOUTH`

- Zone/face: `NORTH_COURT` / `west`
- Profile/massing: `hero_courtyard` / `MASSING_MID_MIXED`
- Explicit bays: `DOOR_01:door_residential_timber@0.23`, `WINDOW_01:window_screened@0.76`
- Compiled placements: `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_DOOR_01`, `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_MASSING`, `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_WINDOW_01`

### `FRONTAGE_RUG_GATE_EAST`

- Zone/face: `RUG_GATE` / `east`
- Profile/massing: `active_merchant` / `MASSING_LOW_MERCHANT`
- Explicit bays: `SHOP_01:shop_recess_market@0.28`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_EAST_MASSING`, `ARCH_FRONTAGE_RUG_GATE_EAST_SHOP_01`

### `FRONTAGE_RUG_GATE_EAST_SOUTH`

- Zone/face: `RUG_GATE` / `east`
- Profile/massing: `active_merchant` / `MASSING_LOW_MERCHANT`
- Explicit bays: `DOOR_01:door_shop_timber@0.47`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_DOOR_01`, `ARCH_FRONTAGE_RUG_GATE_EAST_SOUTH_MASSING`

### `FRONTAGE_RUG_GATE_WEST`

- Zone/face: `RUG_GATE` / `west`
- Profile/massing: `active_merchant` / `MASSING_MID_MIXED`
- Explicit bays: `SHOP_01:shop_recess_market@0.41`, `WINDOW_01:window_shuttered@0.41`, `SHOP_02:shop_recess_market@0.81`, `WINDOW_02:window_screened@0.81`
- Compiled placements: `ARCH_FRONTAGE_RUG_GATE_WEST_MASSING`, `ARCH_FRONTAGE_RUG_GATE_WEST_SHOP_01`, `ARCH_FRONTAGE_RUG_GATE_WEST_SHOP_02`, `ARCH_FRONTAGE_RUG_GATE_WEST_WINDOW_01`, `ARCH_FRONTAGE_RUG_GATE_WEST_WINDOW_02`

### `FRONTAGE_SERVICE_NORTH_EAST_SPINE`

- Zone/face: `SERVICE_NORTH` / `east`
- Profile/massing: `service_storage` / `MASSING_SERVICE_SPINE`
- Explicit bays: `VENT_01:vent_service@0.33`, `NICHE_01:blind_niche@0.67`
- Compiled placements: `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MASSING`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_NICHE_01`, `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_VENT_01`

### `FRONTAGE_SPICE_STREET_EAST`

- Zone/face: `SPICE_STREET` / `east`
- Profile/massing: `quiet_residential` / `MASSING_LOW_MERCHANT`
- Explicit bays: `DOOR_01:door_residential_timber@0.30`, `WINDOW_01:window_screened@0.30`, `NICHE_01:blind_niche@0.70`, `WINDOW_02:window_dark_recess@0.70`
- Compiled placements: `ARCH_FRONTAGE_SPICE_STREET_EAST_DOOR_01`, `ARCH_FRONTAGE_SPICE_STREET_EAST_MASSING`, `ARCH_FRONTAGE_SPICE_STREET_EAST_NICHE_01`, `ARCH_FRONTAGE_SPICE_STREET_EAST_WINDOW_01`, `ARCH_FRONTAGE_SPICE_STREET_EAST_WINDOW_02`

### `FRONTAGE_SPICE_STREET_WEST`

- Zone/face: `SPICE_STREET` / `west`
- Profile/massing: `active_merchant` / `MASSING_MID_MIXED`
- Explicit bays: `SHOP_01:shop_recess_market@0.28`, `WINDOW_01:window_shuttered@0.28`, `DOOR_01:door_shop_timber@0.57`, `WINDOW_02:window_shuttered@0.57`, `SCREEN_01:window_screened@0.82`
- Compiled placements: `ARCH_FRONTAGE_SPICE_STREET_WEST_DOOR_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING`, `ARCH_FRONTAGE_SPICE_STREET_WEST_SCREEN_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_SHOP_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_WINDOW_01`, `ARCH_FRONTAGE_SPICE_STREET_WEST_WINDOW_02`

### `FRONTAGE_TEA_TERRACE_EAST`

- Zone/face: `TEA_TERRACE` / `east`
- Profile/massing: `active_merchant` / `MASSING_MID_MIXED`
- Explicit bays: `SHOP_01:shop_recess_market@0.22`, `DOOR_01:door_shop_timber@0.55`, `SHOP_02:shop_recess_market@0.82`
- Compiled placements: `ARCH_FRONTAGE_TEA_TERRACE_EAST_DOOR_01`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_MASSING`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_SHOP_01`, `ARCH_FRONTAGE_TEA_TERRACE_EAST_SHOP_02`

### `FRONTAGE_TEXTILE_ARCADE_EAST`

- Zone/face: `TEXTILE_ARCADE` / `east`
- Profile/massing: `covered_arcade` / `MASSING_LOW_MERCHANT`
- Explicit bays: `COLUMN_01:column_arcade@0.10`, `ARCH_01:arch_arcade@0.34`, `ARCH_02:arch_arcade@0.70`, `COLUMN_02:column_arcade@0.94`
- Compiled placements: `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_ARCH_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_ARCH_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_COLUMN_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_COLUMN_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_EAST_MASSING`

### `FRONTAGE_TEXTILE_ARCADE_WEST`

- Zone/face: `TEXTILE_ARCADE` / `west`
- Profile/massing: `covered_arcade` / `MASSING_MID_MIXED`
- Explicit bays: `ARCH_01:arch_arcade@0.18`, `ARCH_02:arch_arcade@0.50`, `ARCH_03:arch_arcade@0.82`
- Compiled placements: `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_ARCH_01`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_ARCH_02`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_ARCH_03`, `ARCH_FRONTAGE_TEXTILE_ARCADE_WEST_MASSING`

## Dressing Placements

- `PLACE_CARAVAN_COVER_COVER_CARAVAN_01`: `ASSET_COVER_GOODS` at `COVER_CARAVAN_01` (5.00, 34.20, 0.00), size 1.50×0.75×1.00m, yaw 20.00deg
- `PLACE_CARAVAN_LOAD_NORTH_LMK_CARAVAN_DISTRICT`: `ASSET_CARAVAN_LOAD_CRATE` at `LMK_CARAVAN_DISTRICT` (5.62, 43.92, 0.00), size 0.79×0.39×0.34m, yaw 9.00deg
- `PLACE_CARAVAN_LOAD_SOUTH_LMK_CARAVAN_DISTRICT`: `ASSET_CARAVAN_LOAD_CRATE` at `LMK_CARAVAN_DISTRICT` (4.80, 43.72, 0.00), size 0.89×0.44×0.38m, yaw -7.00deg
- `PLACE_CARAVAN_LOAD_TOP_LMK_CARAVAN_DISTRICT`: `ASSET_CARAVAN_LOAD_CRATE` at `LMK_CARAVAN_DISTRICT` (5.17, 43.80, 0.38), size 0.74×0.37×0.31m, yaw 4.00deg
- `PLACE_DYERS_CANOPY_CANOPY_DYERS_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_DYERS_01` (47.00, 45.36, 4.25), size 4.40×12.00×0.18m, yaw 90.00deg
- `PLACE_DYERS_CERAMIC_VESSEL_LMK_DYERS_DISTRICT`: `ASSET_DYERS_CERAMIC_VESSEL` at `LMK_DYERS_DISTRICT` (43.42, 43.88, 0.00), size 0.56×0.43×0.32m, yaw -12.00deg
- `PLACE_DYERS_COVER_COVER_DYERS_01`: `ASSET_COVER_GOODS` at `COVER_DYERS_01` (50.50, 43.60, 0.00), size 1.50×0.75×1.00m, yaw 75.00deg
- `PLACE_DYERS_LANTERN_LANTERN_DYERS_01`: `ASSET_CC0_LANTERN` at `LANTERN_DYERS_01` (52.50, 40.50, 4.10), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_E_SIGN_1`: `ASSET_SIGNBOARD` at `DYE_E_SIGN_1` (52.88, 38.92, 3.35), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_E_SIGN_2`: `ASSET_SIGNBOARD` at `DYE_E_SIGN_2` (52.88, 44.30, 3.35), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_DYERS_SIGNS_DYE_W_SIGN_1`: `ASSET_SIGNBOARD` at `DYE_W_SIGN_1` (41.12, 36.51, 3.35), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_DYERS_SIGNS_DYE_W_SIGN_2`: `ASSET_SIGNBOARD` at `DYE_W_SIGN_2` (41.12, 45.36, 3.35), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_DYERS_VAT_EAST_LMK_DYERS_DISTRICT`: `ASSET_DYERS_SEALED_VAT` at `LMK_DYERS_DISTRICT` (43.48, 44.50, 0.00), size 0.61×0.62×0.71m, yaw 11.00deg
- `PLACE_DYERS_VAT_WEST_LMK_DYERS_DISTRICT`: `ASSET_DYERS_SEALED_VAT` at `LMK_DYERS_DISTRICT` (42.72, 44.42, 0.00), size 0.70×0.72×0.83m, yaw -8.00deg
- `PLACE_FOUNTAIN_COVER_COVER_FOUNTAIN_01`: `ASSET_COVER_GOODS` at `COVER_FOUNTAIN_01` (33.80, 35.20, 0.00), size 1.50×0.75×1.00m, yaw 80.00deg
- `PLACE_FOUNTAIN_LANTERN_LANTERN_FOUNTAIN_01`: `ASSET_CC0_LANTERN` at `LANTERN_FOUNTAIN_01` (35.45, 39.00, 4.25), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_FOUNTAIN_LMK_FOUNTAIN_01`: `ASSET_FOUNTAIN` at `LMK_FOUNTAIN_01` (23.50, 39.20, 0.00), size 2.20×2.20×0.46m, yaw 0.00deg
- `PLACE_FOUNTAIN_PALM_PALM_FOUNTAIN_01`: `ASSET_PALM` at `PALM_FOUNTAIN_01` (22.40, 45.00, 0.00), size 3.80×3.80×7.80m, yaw 0.00deg
- `PLACE_NORTH_COVER_COVER_NORTH_01`: `ASSET_COVER_GOODS` at `COVER_NORTH_01` (43.20, 66.00, 0.00), size 1.50×0.75×1.00m, yaw 10.00deg
- `PLACE_NORTH_PALM_PALM_NORTH_01`: `ASSET_PALM` at `PALM_NORTH_01` (50.60, 77.20, 0.00), size 3.80×3.80×7.80m, yaw 0.00deg
- `PLACE_RUG_ARCH_LMK_RUG_GATE_01`: `ASSET_HERO_ARCH` at `LMK_RUG_GATE_01` (27.50, 76.30, 0.00), size 13.00×0.80×6.80m, yaw 180.00deg
- `PLACE_RUG_COVER_COVER_RUG_01`: `ASSET_COVER_GOODS` at `COVER_RUG_01` (23.00, 68.20, 0.00), size 1.50×0.75×1.00m, yaw 0.00deg
- `PLACE_RUG_LANTERN_LANTERN_RUG_01`: `ASSET_CC0_LANTERN` at `LANTERN_RUG_01` (32.50, 70.00, 4.25), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_RUG_SIGNS_RUG_E_SIGN_1`: `ASSET_SIGNBOARD` at `RUG_E_SIGN_1` (33.88, 73.35, 3.35), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_RUG_SIGNS_RUG_W_SIGN_1`: `ASSET_SIGNBOARD` at `RUG_W_SIGN_1` (21.12, 68.41, 3.35), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_RUG_SIGNS_RUG_W_SIGN_2`: `ASSET_SIGNBOARD` at `RUG_W_SIGN_2` (21.12, 70.70, 3.35), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_SPAWN_A_COVER_SPAWN_A_COVER_01`: `ASSET_SPAWN_COVER` at `SPAWN_A_COVER_01` (20.20, 5.20, 0.00), size 2.20×1.10×1.30m, yaw 0.00deg
- `PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01`: `ASSET_SPAWN_COVER` at `SPAWN_B_COVER_01` (35.20, 86.00, 0.00), size 2.20×1.10×1.30m, yaw 180.00deg
- `PLACE_SPICE_BARREL_COVER_SPICE_01`: `ASSET_CC0_BARREL` at `COVER_SPICE_01` (21.90, 27.65, 0.00), size 0.67×0.68×0.78m, yaw 9.00deg
- `PLACE_SPICE_BASKET_COVER_SPICE_01`: `ASSET_CC0_BASKET` at `COVER_SPICE_01` (23.78, 27.98, 0.00), size 0.38×0.27×0.22m, yaw 27.00deg
- `PLACE_SPICE_CANOPIES_CANOPY_SPICE_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_SPICE_01` (27.00, 20.58, 5.38), size 3.60×12.00×0.18m, yaw 90.00deg
- `PLACE_SPICE_CANOPIES_CANOPY_SPICE_02`: `ASSET_CLOTH_CANOPY` at `CANOPY_SPICE_02` (27.00, 26.48, 5.28), size 3.20×12.00×0.18m, yaw 90.00deg
- `PLACE_SPICE_COVER_CORE_COVER_SPICE_01`: `ASSET_COVER_GOODS` at `COVER_SPICE_01` (23.00, 27.60, 0.00), size 1.50×0.75×1.00m, yaw 15.00deg
- `PLACE_SPICE_LANDMARK_BASKET_LMK_SPICE_DISTRICT`: `ASSET_CC0_BASKET` at `LMK_SPICE_DISTRICT` (21.38, 20.70, 0.00), size 0.38×0.27×0.22m, yaw -12.00deg
- `PLACE_SPICE_LANDMARK_BRASS_POT_LMK_SPICE_DISTRICT`: `ASSET_CC0_BRASS_POT` at `LMK_SPICE_DISTRICT` (21.16, 19.50, 0.55), size 0.30×0.30×0.29m, yaw -8.00deg
- `PLACE_SPICE_LANDMARK_GOODS_LMK_SPICE_DISTRICT`: `ASSET_SPICE_GOODS` at `LMK_SPICE_DISTRICT` (22.10, 20.40, 0.00), size 1.50×0.75×0.85m, yaw -4.00deg
- `PLACE_SPICE_LANDMARK_SACK_SHORT_LMK_SPICE_DISTRICT`: `ASSET_CC0_SPICE_SACK` at `LMK_SPICE_DISTRICT` (21.95, 19.88, 0.00), size 0.41×0.41×0.39m, yaw 8.00deg
- `PLACE_SPICE_LANDMARK_SACK_TALL_LMK_SPICE_DISTRICT`: `ASSET_CC0_SPICE_SACK` at `LMK_SPICE_DISTRICT` (21.95, 20.74, 0.00), size 0.48×0.48×0.45m, yaw -6.00deg
- `PLACE_SPICE_LANTERN_LANTERN_SPICE_01`: `ASSET_CC0_LANTERN` at `LANTERN_SPICE_01` (21.45, 16.20, 3.80), size 0.22×0.23×0.53m, yaw 90.00deg
- `PLACE_SPICE_POTTERY_COVER_SPICE_01`: `ASSET_CC0_POTTERY` at `COVER_SPICE_01` (23.76, 27.22, 0.00), size 0.52×0.40×0.30m, yaw 15.00deg
- `PLACE_SPICE_SIGNS_SPICE_W_SIGN_1`: `ASSET_SIGNBOARD` at `SPICE_W_SIGN_1` (21.12, 19.67, 2.85), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_SPICE_SIGNS_SPICE_W_SIGN_3`: `ASSET_SIGNBOARD` at `SPICE_W_SIGN_3` (21.12, 24.06, 2.85), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_SPICE_STALLS_SPICE_W_SHOP_1`: `ASSET_MARKET_STALL` at `SPICE_W_SHOP_1` (21.16, 19.67, 0.00), size 1.80×0.66×0.55m, yaw 90.00deg
- `PLACE_TEA_COVER_COVER_TEA_01`: `ASSET_COVER_GOODS` at `COVER_TEA_01` (12.20, 63.80, 1.40), size 1.50×0.75×1.00m, yaw 90.00deg
- `PLACE_TEA_LANTERN_LANTERN_TEA_01`: `ASSET_CC0_LANTERN` at `LANTERN_TEA_01` (18.50, 60.50, 4.65), size 0.22×0.23×0.53m, yaw 270.00deg
- `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST`: `ASSET_SIGNBOARD` at `TEA_RAMP_SIGN_EAST` (18.75, 54.30, 3.65), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST`: `ASSET_SIGNBOARD` at `TEA_RAMP_SIGN_WEST` (11.25, 51.20, 3.05), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01`: `ASSET_TEA_SERVICE` at `LMK_TEA_TERRACE_01` (18.55, 62.65, 1.40), size 1.20×0.55×0.90m, yaw 90.00deg
- `PLACE_TEA_SIGNS_TEA_E_SIGN_1`: `ASSET_SIGNBOARD` at `TEA_E_SIGN_1` (18.88, 59.15, 4.75), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_TEA_SIGNS_TEA_E_SIGN_2`: `ASSET_SIGNBOARD` at `TEA_E_SIGN_2` (18.88, 62.85, 4.75), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_TEA_STOOL_EAST_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (17.88, 61.30, 1.40), size 0.38×0.41×0.58m, yaw 270.00deg
- `PLACE_TEA_STOOL_WEST_NORTH_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (16.45, 61.75, 1.40), size 0.38×0.41×0.58m, yaw 110.00deg
- `PLACE_TEA_STOOL_WEST_SOUTH_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_STOOL` at `LMK_TEA_TERRACE_01` (16.45, 60.85, 1.40), size 0.38×0.41×0.58m, yaw 70.00deg
- `PLACE_TEA_TABLE_LMK_TEA_TERRACE_01`: `ASSET_CC0_TEA_TABLE` at `LMK_TEA_TERRACE_01` (17.15, 61.30, 1.40), size 1.13×0.71×0.80m, yaw 90.00deg
- `PLACE_TEXTILE_CANOPY_CANOPY_TEXTILE_01`: `ASSET_CLOTH_CANOPY` at `CANOPY_TEXTILE_01` (29.50, 54.39, 4.20), size 4.00×11.00×0.18m, yaw 90.00deg
- `PLACE_TEXTILE_COVER_COVER_TEXTILE_01`: `ASSET_COVER_GOODS` at `COVER_TEXTILE_01` (32.60, 58.20, 0.00), size 1.50×0.75×1.00m, yaw 90.00deg
- `PLACE_TEXTILE_LANTERN_LANTERN_TEXTILE_01`: `ASSET_CC0_LANTERN` at `LANTERN_TEXTILE_01` (24.45, 55.20, 4.15), size 0.22×0.23×0.53m, yaw 90.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_1`: `ASSET_SIGNBOARD` at `TEXTILE_E_SIGN_1` (34.88, 54.66, 3.35), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_E_SIGN_2`: `ASSET_SIGNBOARD` at `TEXTILE_E_SIGN_2` (34.88, 60.30, 3.35), size 1.80×0.12×0.62m, yaw 270.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_1`: `ASSET_SIGNBOARD` at `TEXTILE_W_SIGN_1` (24.12, 52.64, 3.35), size 1.80×0.12×0.62m, yaw 90.00deg
- `PLACE_TEXTILE_SIGNS_TEXTILE_W_SIGN_2`: `ASSET_SIGNBOARD` at `TEXTILE_W_SIGN_2` (24.12, 58.69, 3.35), size 1.80×0.12×0.62m, yaw 90.00deg
