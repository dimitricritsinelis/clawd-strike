# Runtime material and draw allocation schedule

Generated from design.json. These are implementation targets, not measurements of the current game.

## Pack aliases

| Alias | Source | Authored role | Exact shader overrides |
|---|---|---|---|
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | wall | {'macroColorAmplitude': 0.025, 'macroRoughnessAmplitude': 0.04, 'macroFrequency': 0.12, 'topBleachAmount': 0, 'topBleachStartY': 2.5, 'topBleachHeightM': 3.0, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.35, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.1, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_beige_wall_002` | `ph_beige_wall_002` | wall | {'macroColorAmplitude': 0.022, 'macroRoughnessAmplitude': 0.035, 'macroFrequency': 0.12, 'topBleachAmount': 0, 'topBleachStartY': 2.5, 'topBleachHeightM': 3.0, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.32, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.09, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | wall | {'macroColorAmplitude': 0.02, 'macroRoughnessAmplitude': 0.032, 'macroFrequency': 0.12, 'topBleachAmount': 0, 'topBleachStartY': 2.8, 'topBleachHeightM': 2.6, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.3, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.08, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_aged_plaster_ochre` | `ph_aged_plaster_ochre` | wall | {'macroColorAmplitude': 0.024, 'macroRoughnessAmplitude': 0.038, 'macroFrequency': 0.12, 'topBleachAmount': 0, 'topBleachStartY': 2.5, 'topBleachHeightM': 2.8, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.35, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.1, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_red_plaster_weathered` | `ph_red_plaster_weathered` | wall | {'macroColorAmplitude': 0.022, 'macroRoughnessAmplitude': 0.035, 'macroFrequency': 0.12, 'topBleachAmount': 0, 'topBleachStartY': 2.7, 'topBleachHeightM': 2.5, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.3, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.08, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_whitewashed_brick_warm` | `ph_whitewashed_brick_warm` | wall | {'macroColorAmplitude': 0.022, 'macroRoughnessAmplitude': 0.035, 'macroFrequency': 0.1, 'topBleachAmount': 0, 'topBleachStartY': 2.4, 'topBleachHeightM': 3.2, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.32, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.09, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_whitewashed_brick_cool` | `ph_whitewashed_brick_cool` | wall | {'macroColorAmplitude': 0.018, 'macroRoughnessAmplitude': 0.03, 'macroFrequency': 0.12, 'topBleachAmount': 0, 'topBleachStartY': 2.8, 'topBleachHeightM': 2.4, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.28, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.07, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | wall | {'macroColorAmplitude': 0.025, 'macroRoughnessAmplitude': 0.035, 'macroFrequency': 0.09, 'topBleachAmount': 0, 'topBleachStartY': 2.8, 'topBleachHeightM': 2.2, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.35, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.11, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | wall | {'macroColorAmplitude': 0.026, 'macroRoughnessAmplitude': 0.038, 'macroFrequency': 0.09, 'topBleachAmount': 0, 'topBleachStartY': 2.8, 'topBleachHeightM': 2.2, 'dustColorAmount': 0, 'dirtEnabled': False, 'dirtHeightM': 0.35, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.12, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0} |
| `ph_bz04_stone_trim_sandstone` | `ph_stone_trim_sandstone` | detail | {'macroColorAmplitude': 0.0, 'macroRoughnessAmplitude': 0.0, 'macroFrequency': 0.0, 'dirtEnabled': False, 'dustColorAmount': 0, 'dirtHeightM': 0.0, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'topBleachAmount': 0} |
| `ph_bz04_stone_trim_white` | `ph_stone_trim_white` | detail | {'macroColorAmplitude': 0.0, 'macroRoughnessAmplitude': 0.0, 'macroFrequency': 0.0, 'dirtEnabled': False, 'dustColorAmount': 0, 'dirtHeightM': 0.0, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'topBleachAmount': 0} |
| `ph_bz04_trim_sanded_01` | `ph_trim_sanded_01` | detail | {'macroColorAmplitude': 0.0, 'macroRoughnessAmplitude': 0.0, 'macroFrequency': 0.0, 'dirtEnabled': False, 'dustColorAmount': 0, 'dirtHeightM': 0.0, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'topBleachAmount': 0} |
| `ph_bz04_worn_plaster_ochre` | `ph_worn_plaster_ochre` | detail | {'macroColorAmplitude': 0.01, 'macroRoughnessAmplitude': 0.015, 'macroFrequency': 0.14, 'dirtEnabled': False, 'dustColorAmount': 0, 'dirtHeightM': 0.0, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'topBleachAmount': 0} |
| `ph_bz04_hessian_230` | `ph_hessian_230` | detail | {'macroColorAmplitude': 0.0, 'macroRoughnessAmplitude': 0.0, 'macroFrequency': 0.0, 'dirtEnabled': False, 'dustColorAmount': 0, 'dirtHeightM': 0.0, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'topBleachAmount': 0} |
| `ph_bz04_fabric_leather_02` | `ph_fabric_leather_02` | detail | {'macroColorAmplitude': 0.0, 'macroRoughnessAmplitude': 0.0, 'macroFrequency': 0.0, 'dirtEnabled': False, 'dustColorAmount': 0, 'dirtHeightM': 0.0, 'dirtDarken': 0, 'dirtRoughnessBoost': 0.0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'topBleachAmount': 0} |
| `ph_bz04_rough_pine_door` | `ph_rough_pine_door` | detail | {'macroColorAmplitude': 0, 'macroRoughnessAmplitude': 0, 'macroFrequency': 0.12, 'dirtEnabled': False, 'dirtHeightM': 0.18, 'dirtDarken': 0, 'dirtRoughnessBoost': 0, 'dustColorAmount': 0, 'topBleachAmount': 0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'contactDarkenAmount': 0} |
| `ph_bz04_weathered_brown_planks` | `ph_weathered_brown_planks` | detail | {'macroColorAmplitude': 0, 'macroRoughnessAmplitude': 0, 'macroFrequency': 0.12, 'dirtEnabled': False, 'dirtHeightM': 0.18, 'dirtDarken': 0, 'dirtRoughnessBoost': 0, 'dustColorAmount': 0, 'topBleachAmount': 0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'contactDarkenAmount': 0} |
| `ph_bz04_worn_planks` | `ph_worn_planks` | detail | {'macroColorAmplitude': 0, 'macroRoughnessAmplitude': 0, 'macroFrequency': 0.12, 'dirtEnabled': False, 'dirtHeightM': 0.18, 'dirtDarken': 0, 'dirtRoughnessBoost': 0, 'dustColorAmount': 0, 'topBleachAmount': 0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'contactDarkenAmount': 0} |
| `ph_bz04_dark_wood` | `ph_dark_wood` | detail | {'macroColorAmplitude': 0, 'macroRoughnessAmplitude': 0, 'macroFrequency': 0.12, 'dirtEnabled': False, 'dirtHeightM': 0.18, 'dirtDarken': 0, 'dirtRoughnessBoost': 0, 'dustColorAmount': 0, 'topBleachAmount': 0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'contactDarkenAmount': 0} |
| `ph_bz04_rusty_metal_02` | `ph_rusty_metal_02` | detail | {'macroColorAmplitude': 0, 'macroRoughnessAmplitude': 0, 'macroFrequency': 0.12, 'dirtEnabled': False, 'dirtHeightM': 0.18, 'dirtDarken': 0, 'dirtRoughnessBoost': 0, 'dustColorAmount': 0, 'topBleachAmount': 0, 'localizedWearEnabled': False, 'wearStreakStrength': 0, 'wearChipStrength': 0, 'wearRepairStrength': 0, 'wearRoughnessBoost': 0, 'contactDarkenAmount': 0} |

## Floor aliases

| Alias | Source / insert after | Macro color / roughness / frequency |
|---|---|---|
| `bz04_large_sandstone_blocks_01` | `large_sandstone_blocks_01` | 0.045 / 0.05 / 0.05 |
| `bz04_spice_laid_stone_01` | `spice_laid_stone_01` | 0.045 / 0.05 / 0.045 |
| `bz04_patterned_cobblestone` | `patterned_cobblestone` | 0.045 / 0.05 / 0.055 |
| `bz04_cobblestone_color` | `cobblestone_color` | 0.045 / 0.05 / 0.075 |
| `bz04_cobblestone_pavement` | `cobblestone_pavement` | 0.04 / 0.03 / 0.04 |
| `bz04_red_sandstone_pavement` | `red_sandstone_pavement` | 0.045 / 0.05 / 0.16 |
| `bz04_court_limestone_flags_01` | `court_limestone_flags_01` | 0.045 / 0.05 / 0.042 |

## Embedded original materials

These named bindings stay embedded; they do not receive the generic pack shader.

```json
{
  "timber": [
    "ph_bz04_rough_pine_door",
    "ph_bz04_weathered_brown_planks",
    "ph_bz04_worn_planks",
    "ph_bz04_dark_wood"
  ],
  "hardware": [
    "ph_bz04_rusty_metal_02"
  ],
  "ceramic": "bz04_ceramic_project_original",
  "rug": "bz04_levantine_rug_project_original",
  "rugSource": "apps/client/public/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
  "rugPbr": {
    "metalness": 0.0,
    "roughness": 0.86,
    "repeatM": 1.2,
    "albedo": "unmodified"
  },
  "rule": "These are explicit embedded GLB bindings, not pack aliases. Do not use ph_dirty_carpet for a decorative rug.",
  "ceramicPbr": {
    "metalness": 0,
    "roughness": 0.77,
    "baseColor": "#c5a37c",
    "vertexAccentColors": [
      "#b09168",
      "#ccbea2",
      "#869b8a"
    ],
    "normalScale": 0,
    "textureSource": "project-original modeled ceramic; no external scan"
  },
  "brass": "bz04_brass_project_original",
  "brassPbr": {
    "metalness": 0.72,
    "roughness": 0.48,
    "baseColor": "#8f7750",
    "textureSource": "project-original modeled metal"
  },
  "neutralTextile": "ph_bz04_fine_linen",
  "closureMaterials": {
    "bz04_teal_timber_project_original": {
      "sourceMaterialId": "ph_rough_pine_door",
      "tintSrgb": "#5d9c8a",
      "roughness": 0.86,
      "metalness": 0,
      "binding": "Opaque assigned owner paint, not raw brown scan multiplication; preserve source normals/roughness and explicit metallic0."
    },
    "bz04_opaque_clerestory_project_original": {
      "source": "project-original opaque colored panel",
      "colorsSrgb": [
        "#b7a36c",
        "#728c85",
        "#8b7366"
      ],
      "metalness": 0,
      "roughness": 0.8,
      "opacity": 1,
      "transmission": 0,
      "layout": "Three equal vertical muted color panes within each closed SD07 lattice; not an emissive window"
    }
  },
  "plantMaterial": "bz04_plant_project_original",
  "plantPbr": {
    "metalness": 0,
    "roughness": 0.9,
    "baseColor": "#738565",
    "geometry": "Each rooted plant has seven curved lancet leaves around a stem, with three longitudinal segments per leaf; fit the exact authored silhouette box."
  },
  "soilMaterial": "bz04_soil_project_original",
  "soilPbr": {
    "metalness": 0,
    "roughness": 1,
    "baseColor": "#6c5a45",
    "geometry": "Contained flat soil with low relief inside the trough only"
  },
  "fineLinen": {
    "sourceMaterialId": "ph_bz04_fine_linen",
    "sourceScanMaterialId": "ph_hessian_230",
    "repeatM": 0.09,
    "normalScale": 0.1,
    "metalness": 0,
    "roughness": 0.94,
    "roughnessMode": "ARM green multiplied by0.94",
    "paintSrgb": null,
    "grainMix": 0.12,
    "use": "Tea/domestic cushions and linen; no leather texture or seam. Existing source weave at one third shade scale.",
    "vertexPaintRecipe": {
      "mode": "neutral-grain-with-calibrated-vertex-paint",
      "baseColorFactor": "#ffffff",
      "baseTexture": "Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.",
      "grainMix": 0.12,
      "representativeNeutralGrainLinear": 0.9054704308536836,
      "vertexFormula": "COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.",
      "defaultDesiredSrgb": "#dfcfab",
      "stockRule": "Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.",
      "check": "All selected vertex components must remain <=1; fail rather than silently clamp."
    }
  }
}
```

## Global allocation

```json
{
  "sectionAndSharedPrimitives": 280,
  "roofPostBatchPrimitives": 11,
  "allNewPrimitiveCeiling": 291,
  "retainedSceneDrawAllowance": 209,
  "sectionAndSharedTriangles": 802600,
  "roofTriangles": 35716,
  "allNewTriangleCeiling": 838316,
  "retainedSceneTriangleAllowance": 461684,
  "mobileDrawCeiling": 500,
  "mobileTriangleCeiling": 1300000,
  "interpretation": "Conservative simultaneous-visibility planning allocation. Roof static batching is required. Retained allowance covers existing gameplay props, actors, weapons and effects; actual game measurements remain mandatory."
}
```

The area sheets list exact material/shadow classes and primitive ceilings. Implement the named batching and shadow behavior in integration.md, then measure actual game performance.

## Selected source-to-export recipes

Desired appearance is a diagram/albedo target, not a second shader tint. Apply each paint formula once. Keep raw sources unchanged; new derived exports retain their own names and embedded albedo.

| Selected material | Desired sRGB | Normal strength | Roughness / interpretation | Source / bake / export recipe |
|---|---|---|---|---|
| `ph_bz04_painted_plaster_warm` | `#d8c4a0` | 0.3 | 0.92; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#d8c4a0', 'paintSrgb': '#fce8bf', 'paintLinear': [0.9759319078969907, 0.8080663901978523, 0.5201984763525123], 'grainMix': 0.5, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'ec57d01d27651f483bc090d056b283ff50e7f9e0e2793f6eba5c49d49dc20307', 'normal': '773161a02c4e3a8b975bd3adbfa5306c44d4658e5d8c3a6a4d66bd8477230109', 'arm': 'ec41a0b413679af0d7a50cda1c9429c7f9a658bfd3cf5df3f772faac04be6f28'}, 'exportName': 'bz06_cream_plaster', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_beige_wall_002` | `#d3bb93` | 0.25 | 0.93; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#d3bb93', 'paintSrgb': '#f4dbb0', 'paintLinear': [0.9014739814657824, 0.7089028117412087, 0.4348573119144994], 'grainMix': 0.5, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg'}, 'sourceHashes': {'albedo': '73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e', 'normal': '504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5', 'arm': 'cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f'}, 'exportName': 'bz06_sand_plaster', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_plastered_wall` | `#ddd0b3` | 0.25 | 0.93; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#ddd0b3', 'paintSrgb': '#fdf1d4', 'paintLinear': [0.9812088492707967, 0.8804478356651972, 0.6552866173193502], 'grainMix': 0.47422169068066733, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg'}, 'sourceHashes': {'albedo': '73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e', 'normal': '504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5', 'arm': 'cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f'}, 'exportName': 'bz06_pale_lime', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_aged_plaster_ochre` | `#c6a16c` | 0.28 | 0.93; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#c6a16c', 'paintSrgb': '#e5bd82', 'paintLinear': [0.7814988083980416, 0.5084248113955151, 0.22350127106028497], 'grainMix': 0.5, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg'}, 'sourceHashes': {'albedo': '73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e', 'normal': '504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5', 'arm': 'cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f'}, 'exportName': 'bz06_faded_ochre', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_red_plaster_weathered` | `#b77c62` | 0.25 | 0.93; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#b77c62', 'paintSrgb': '#dea183', 'paintLinear': [0.7282053832884988, 0.35496713337145963, 0.2257058556419342], 'grainMix': 0.5, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'b49519d865609f137b1796114234183f512d936a51989b74a17a67b47d3bf668', 'normal': '72ee053a5ea8a0e9c9a33bd6d84ab576cb218961c62f97b08804c3e19f824d5f', 'arm': '4fed44ce160da630bc6f6e7793a264d5375ad4602bf0d87499ee96eb894b3b7d'}, 'exportName': 'bz06_faded_earth_red', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_sandstone_blocks_05` | `#bda985` | 0.45 | 0.94; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#bda985', 'paintSrgb': '#eaddbb', 'paintLinear': [0.8214550628297725, 0.7220556851362163, 0.4965705233480168], 'grainMix': 0.7, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'd17c322d9e793ab9fc198948a34f2632595560471ff8714f2b0e052bc75c9ee3', 'normal': 'ab42361855310d8de9b11470c6b21e512c9926decd5548dc9e9d72bd6cc06f3e', 'arm': '6bc226c4985aee587db5995754069dc2f01f6295cc997db3ebbebc6a33578e4d'}, 'exportName': 'bz06_dressed_sandstone', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_sandstone_blocks_06` | `#b6a185` | 0.42 | 0.94; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#b6a185', 'paintSrgb': '#f9e7c9', 'paintLinear': [0.946174958515037, 0.7983868950319168, 0.5872168732348412], 'grainMix': 0.6707432788190668, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'a091e04d73ddf7485d1b99a66d6cfe270e9ba36cdc26f98dbc17934427e43bc9', 'normal': 'a7e5c96b8ba3ab3d066c673c4da9b1b7735f176ed6b6b2b9f74216fc151225f7', 'arm': '119a2dd5a764d82396e1ea3736aff0c981295ab756847a0bc90d455c182cb411'}, 'exportName': 'bz06_service_stone', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_trim_sanded_01` | `#c5b18d` | 0.12 | 0.94; ARM green multiplied by0.94 | {'mode': 'crop-mirror-bounded-linear-source-paint', 'desiredAppearanceSrgb': '#c5b18d', 'paintSrgb': '#dccba5', 'paintLinear': [0.7175869406315156, 0.5951917042797605, 0.3778628251105845], 'grainMix': 0.4, 'formula': 'Crop and normal-correct mirror first; paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear). Bake sRGB output once.', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'd17c322d9e793ab9fc198948a34f2632595560471ff8714f2b0e052bc75c9ee3', 'normal': 'ab42361855310d8de9b11470c6b21e512c9926decd5548dc9e9d72bd6cc06f3e', 'arm': '6bc226c4985aee587db5995754069dc2f01f6295cc997db3ebbebc6a33578e4d'}, 'exportName': 'bz06_monolithic_stone_trim', 'binding': 'Preserve derived monolithic trim maps and white export base factor. Crop recipe takes precedence over original whole-wall textures.'} |
| `ph_bz04_hessian_230` | `#dfcfab` | 0.18 | 0.94; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'neutral-grain-with-calibrated-vertex-paint', 'desiredAppearanceSrgb': '#dfcfab', 'paintSrgb': '#e9d8b3', 'paintLinear': [0.8149469973050627, 0.689100792708164, 0.4497553956762431], 'grainMix': 0.12, 'formula': 'Final=neutralGrainLinear*calibratedVertexPaintLinear; neutral grain contains no cream/rust tint. Base factor white.', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'ef9ac1a0129b6d0f44b6d5beb68db7be7a0adf11e09fe52fd2cdc9370b27d4ba', 'normal': '6d5a6d23c880dbaae98477ed33dbd5d7c0eeda910a39319aec2d0014892974aa', 'arm': '963ba03b3583a9dcc3a10181a9042de63aec019ee1a8a89c8be77d33a2f6b691'}, 'exportName': 'bz06_cream_woven_cloth', 'binding': 'Preserve neutral-grain derived texture and calibrated COLOR_0. Base factor white; no additional source/cream/stock multiplication.', 'vertexPaintRecipe': {'mode': 'neutral-grain-with-calibrated-vertex-paint', 'baseColorFactor': '#ffffff', 'baseTexture': 'Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.', 'grainMix': 0.12, 'representativeNeutralGrainLinear': 0.9054704308536836, 'vertexFormula': 'COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.', 'defaultDesiredSrgb': '#dfcfab', 'stockRule': 'Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.', 'check': 'All selected vertex components must remain <=1; fail rather than silently clamp.'}} |
| `bz04_large_sandstone_blocks_01` | `#b29972` | 0.3 | 0.94; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#b29972', 'paintSrgb': '#e5d8b0', 'paintLinear': [0.7803693662498348, 0.6862490137981643, 0.4364997362754391], 'grainMix': 0.7, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'b378f21aee692b297a84c6cb6e2c09c2149f192cb93ae7dc14436013c8d3c29f', 'normal': 'b117c89f83372724d409c9d921fa1c8e0f488867ab4029dd98ed20cbce22c18d', 'arm': 'f6217220ec9a33014f17d8e5bd33c92e28e2ec8ccb191cf9a2082d7485bb54b2'}, 'exportName': 'bz06_rough_service_paving', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `bz04_court_limestone_flags_01` | `#baa47f` | 0.3 | 0.94; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'bounded-linear-source-paint', 'desiredAppearanceSrgb': '#baa47f', 'paintSrgb': '#eedebd', 'paintLinear': [0.8552869216232429, 0.7317958404526851, 0.5079860185422087], 'grainMix': 0.7, 'formula': 'paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_arm_1k.jpg'}, 'sourceHashes': {'albedo': '8d2458db374992bef26044610895f7bbf2acfdbbbcaa98cbacbc0ca2e168b7f1', 'normal': 'c73e302b6ffacf5f28dece4d40acfeca854933980e661968e255de4ee07bb283', 'arm': '93272f7bb1013e7655678aef81ea21382ffce57e66f3641ce7ef3eab1e86cfb8'}, 'exportName': 'bz06_quiet_flags', 'binding': 'Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice.'} |
| `ph_bz04_fine_linen` | `#dfcfab` | 0.1 | 0.94; ARM green multiplied by roughness scalar; not final constant roughness | {'mode': 'neutral-grain-with-calibrated-vertex-paint', 'desiredAppearanceSrgb': '#dfcfab', 'paintSrgb': '#e9d8b3', 'paintLinear': [0.8149469973050627, 0.689100792708164, 0.4497553956762431], 'grainMix': 0.12, 'formula': 'Final=neutralGrainLinear*calibratedVertexPaintLinear; neutral grain contains no cream/rust tint. Base factor white.', 'sourceFiles': {'albedo': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_diff_1k.jpg', 'normal': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_nor_gl_1k.jpg', 'arm': 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_arm_1k.jpg'}, 'sourceHashes': {'albedo': 'ef9ac1a0129b6d0f44b6d5beb68db7be7a0adf11e09fe52fd2cdc9370b27d4ba', 'normal': '6d5a6d23c880dbaae98477ed33dbd5d7c0eeda910a39319aec2d0014892974aa', 'arm': '963ba03b3583a9dcc3a10181a9042de63aec019ee1a8a89c8be77d33a2f6b691'}, 'exportName': 'bz06_fine_linen', 'binding': 'Preserve neutral-grain derived texture and calibrated COLOR_0. Base factor white; no additional source/cream/stock multiplication.', 'vertexPaintRecipe': {'mode': 'neutral-grain-with-calibrated-vertex-paint', 'baseColorFactor': '#ffffff', 'baseTexture': 'Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.', 'grainMix': 0.12, 'representativeNeutralGrainLinear': 0.9054704308536836, 'vertexFormula': 'COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.', 'defaultDesiredSrgb': '#dfcfab', 'stockRule': 'Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.', 'check': 'All selected vertex components must remain <=1; fail rather than silently clamp.'}} |

## Source, selected material and shadow binding

| Family | Source material | Selected material | Export name | Shadow class |
|---|---|---|---|---|
| cream-plaster | ph_painted_plaster_warm | ph_bz04_painted_plaster_warm | bz06_cream_plaster | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| sand-plaster | ph_plastered_wall | ph_bz04_beige_wall_002 | bz06_sand_plaster | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| pale-lime | ph_plastered_wall | ph_bz04_plastered_wall | bz06_pale_lime | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| faded-ochre | ph_aged_plaster_ochre | ph_bz04_aged_plaster_ochre | bz06_faded_ochre | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| faded-earth-red | ph_red_plaster_weathered | ph_bz04_red_plaster_weathered | bz06_faded_earth_red | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| dressed-sandstone | ph_sandstone_blocks_05 | ph_bz04_sandstone_blocks_05 | bz06_dressed_sandstone | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| service-stone | ph_sandstone_blocks_06 | ph_bz04_sandstone_blocks_06 | bz06_service_stone | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| quiet-flags | court_limestone_flags_01 | bz04_court_limestone_flags_01 | bz06_quiet_flags | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| rough-service-paving | large_sandstone_blocks_01 | bz04_large_sandstone_blocks_01 | bz06_rough_service_paving | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| cream-woven-cloth | ph_hessian_230 | ph_bz04_hessian_230 | bz06_cream_woven_cloth | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| fine-linen | ph_hessian_230 | ph_bz04_fine_linen | bz06_fine_linen | Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch |
| monolithic-stone-trim | ph_sandstone_blocks_05 | ph_bz04_trim_sanded_01 | bz06_monolithic_stone_trim | Retain owning opening trim shadow class; crop adds no geometry/material per sill. |

## Monolithic trim crop and mirror recipe

```json
{
  "materialId": "ph_bz04_trim_sanded_01",
  "sourceMaterialId": "ph_bz04_sandstone_blocks_05",
  "sourcePixelCropXYXY": [
    340,
    195,
    740,
    290
  ],
  "sourceImageSizePx": [
    1024,
    1024
  ],
  "cropWorldSizeM": [
    0.78125,
    0.185546875
  ],
  "mirrorTileWorldSizeM": [
    1.5625,
    0.37109375
  ],
  "recipe": "Crop each original map identically; mirror 2x2 in X/Y. For mirrored tangent normal maps invert red on X mirror and green on Y mirror. Preserve originals. Orient crop X along trim member, Y across its face; do not stretch a wall image across sill.",
  "albedoPaintSrgb": "#dccba5",
  "albedoPaintLinear": [
    0.7175869406315156,
    0.5951917042797605,
    0.3778628251105845
  ],
  "grainMix": 0.4,
  "desiredAppearanceSrgb": "#c5b18d",
  "roughness": 0.94,
  "roughnessMode": "ARM green times scalar",
  "metalness": 0,
  "normalScale": 0.12,
  "scope": "Monolithic sills, threshold caps and single-piece trim faces only. Masonry arch rings retain coherent voussoir courses/joints; no mortar-free whole-ring override.",
  "sampleFiles": {
    "albedo": "artifacts/bazaar-material-review/r6-samples/trim-albedo.png",
    "normal": "artifacts/bazaar-material-review/r6-samples/trim-normal.png",
    "arm": "artifacts/bazaar-material-review/r6-samples/trim-arm.png"
  },
  "sourceFiles": {
    "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
    "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
    "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg"
  },
  "sourceHashes": {
    "albedo": "d17c322d9e793ab9fc198948a34f2632595560471ff8714f2b0e052bc75c9ee3",
    "normal": "ab42361855310d8de9b11470c6b21e512c9926decd5548dc9e9d72bd6cc06f3e",
    "arm": "6bc226c4985aee587db5995754069dc2f01f6295cc997db3ebbebc6a33578e4d"
  },
  "exportName": "bz06_monolithic_stone_trim"
}
```


## Fine linen source and physical scale

```json
{
  "sourceMaterialId": "ph_bz04_fine_linen",
  "sourceScanMaterialId": "ph_hessian_230",
  "repeatM": 0.09,
  "normalScale": 0.1,
  "metalness": 0,
  "roughness": 0.94,
  "roughnessMode": "ARM green multiplied by0.94",
  "paintSrgb": null,
  "grainMix": 0.12,
  "use": "Tea/domestic cushions and linen; no leather texture or seam. Existing source weave at one third shade scale.",
  "vertexPaintRecipe": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "baseColorFactor": "#ffffff",
    "baseTexture": "Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.",
    "grainMix": 0.12,
    "representativeNeutralGrainLinear": 0.9054704308536836,
    "vertexFormula": "COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.",
    "defaultDesiredSrgb": "#dfcfab",
    "stockRule": "Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.",
    "check": "All selected vertex components must remain <=1; fail rather than silently clamp."
  }
}
```


## Derived export binding rule

Preserve bz06_* baked materials, including COLOR_0 and source normal/roughness. Do not strip their base-color images or substitute a generic pack shader. Apply only the named existing BZ04 macro profile once during construction/integration.

## Assignment coverage

```json
{
  "ownerRows": 58,
  "floorRows": 25,
  "backgroundRows": 15,
  "scope": "All current parcel fields resolved by original parcel ID; removed architecture openings are not recreated."
}
```
