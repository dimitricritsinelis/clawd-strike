# R7 | B courtyard finish schedule

Retained B building layout and focal balcony, with the explicitly scheduled revised windows, surrounds and finish; no gameplay changes.

R5 preserves B building layout, focal balcony, established trade groups and selected upper merchant glass. Redundant loft vents are consolidated and related opening stacks use the exact revised positions and datums.

[Finish details plate](drawings/spawn_b_courtyard-finish.svg) · [complete courtyard sheet](unit-spawn-b-courtyard.md) · [finish review cameras](unit-spawn-b-courtyard.md#fixtures-receivers-budgets-and-critical-views)

## Window, door and reveal families

| Family | Receiver and trim | Joinery | Applies to |
|---|---|---|---|
| `domestic` | Use the owning wall plaster across the outer 0.10 m surround. Ease its exposed arris 0.012 m inside the existing envelope. The opening is cut into plaster; do not apply a bright stone rectangle. Keep a separate stone sill only. | 0.08 m perimeter frame; opening.finishLeafCount timber leaves, 0.025 m thick with a 0.006 m central seam. Each leaf has 0.055 m stiles, 0.07 m top/bottom rails and one 0.05 m midrail. Recess panels 0.008 m behind the rails; ease exposed timber edges 0.003 m. Give each leaf two 0.025 x 0.10 m hinge plates and one restrained latch, all inside the opening envelope. | Merchant and guest-house windows, packer office/family shutters. Keep small stair lights plain. |
| `workshop` | Return the owning plaster to the 0.08 m timber frame; retain a stone sill with a 0.008 m underside drip groove. Use one plain timber head rather than four dressed-stone bars. Recess depths and outward limits remain B-04. | Louvers keep 0.035 m visible height at 0.08 m pitch. Their local cross section relative to closure front c is (out,z): (-0.025,-0.0175),(0,0.0105),(0,0.0175),(-0.025,-0.0105). Clip within the frame, close visible ends, and preserve the gap to the opaque back. Textile upper shutters retain their three panels and 0.08 m mullions. | Potter and textile work/loft openings; tea gallery uses its existing arch piers and plain vertical slats. |
| `stone` | Use the owning stone on jambs and reveals, with a restrained dressed sill. Keep the merchant principal arched door in its scheduled dressed stone. Ease exposed stone arrises 0.008 m; show the head as a coherent lintel or arch ring, not disconnected trim cubes. | Closed receiving/loading leaves use vertical boards with 0.002 m seams and two continuous dark iron straps per leaf. Keep their existing widths and heights. Rings, straps and hinge plates read as dark iron, not bright white or gold bands. | Receiving store, gatekeeper return and principal merchant doorway. |

Each opening in the complete sheet has a finish family, paint target and named surround/reveal/sill materials. These override the old parcel-wide trim argument. Do not guess the family from the nearest building.

## B-only material bindings

Private copies inside the B courtyard GLB only. Replace the named B material batches one for one; never edit shared pack aliases, original texture files, source hashes, global lighting or other-area bindings. requiredMaterialIds continue to name the source dependencies.

Convert paint and source albedo from sRGB to linear exactly once. BaseColor = paintLinear * ((1-grainMix) + grainMix*sourceAlbedoLinear). This is a painted finish with retained scan grain, not emission or a global exposure adjustment. Vertex colors are white except explicitly authored local accents. Avoid the old full-strength dark-scan-times-paint multiplication.

These paint colors are proposed albedo targets, not measured final pixels. Neutral and shipped-light inspection occurs in the consolidated end review. Correct the actual material graph before adjusting a palette or attributing the dark shutters to one cause.

### warmTimber

```json
{
  "sourceMaterialId": "ph_bz04_weathered_brown_planks",
  "exportName": "bz05_b_warm_timber",
  "paintSrgb": "#9c8060",
  "grainMix": 0.28,
  "metalness": 0,
  "roughness": 0.86,
  "normalScale": 0.18,
  "use": "Replace this new R4 timber batch on structural joinery, doors and ordinary shutters. Member grain follows its length."
}
```

### tealTimber

```json
{
  "sourceMaterialId": "ph_bz04_rough_pine_door",
  "exportName": "bz05_b_teal_timber",
  "grainMix": 0,
  "metalness": 0,
  "roughness": 0.86,
  "normalScale": 0.15,
  "use": "Authored teal/indigo painted joinery uses desired linear vertex color on a white base and the licensed normal/roughness maps. Multiple owner colors share one PBR/shadow batch.",
  "baseColorMode": "opaque-paint",
  "paintColorSource": "opening.finishPaintSrgb",
  "ownerPaletteSrgb": {
    "teal": "#5d9c8a",
    "indigo": "#53799f"
  },
  "roughnessMode": "Source ARM green multiplied by0.86; source metallic disconnected",
  "paintSrgbRole": "Desired opaque paint, grainMix0; retain assigned owner openings only.",
  "replacesExportName": "bz04_teal_timber_project_original"
}
```

### iron

```json
{
  "sourceMaterialId": "ph_bz04_rusty_metal_02",
  "exportName": "bz05_b_dark_iron",
  "paintSrgb": "#56534b",
  "grainMix": 0.12,
  "metalness": 0.15,
  "roughness": 0.86,
  "normalScale": 0.12,
  "use": "Replace the new R4 hardware batch. Scanned oxide gives close grain; straps must not become bright masonry-like strips."
}
```

### cloth

```json
{
  "sourceMaterialIds": [
    "ph_bz04_hessian_230",
    "ph_bz04_fine_linen"
  ],
  "exportNameRule": "Private B copy of each existing cloth batch; no extra material per hem",
  "paintSrgb": null,
  "grainMix": 0.12,
  "metalness": 0,
  "roughness": 0.94,
  "normalScale": 0.18,
  "use": "Cream shade and linen. Existing scan weave remains at its physical scale. Colored bound edges use the per-instance hem tint with this same formula.",
  "roughnessMode": "ARM green multiplied by0.94",
  "repeatM": 0.27,
  "baseColor": "#ffffff",
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

### ceramic

```json
{
  "replacesExportName": "bz04_ceramic_project_original",
  "exportName": "bz05_b_ceramic",
  "baseColor": "#ffffff",
  "metalness": 0,
  "roughness": 0.77,
  "use": "New R4 ceramic groups: existing desired stockColorSrgb values become linear vertex colors, not another multiplication by the old beige base. Retain one material batch and smooth normals; lid/rim breaks stay sharp."
}
```

**exportRecipe:** Non-cloth bounded profiles bake exact calibrated source/paint to area-owned sRGB albedo with white base and white default vertices. Cloth exports neutral gray grain with calibrated desired per-part COLOR_0 and white base. Preserve bz06_* and private B named materials through binding; no raw-pack rebind. Original source files unchanged; record formula and hashes. Explicit metallic and ARM-green roughness factors apply. Monolithic trim crops all maps exactly and mirrors tangent normal components per recipe. Retain existing private B export names.

**accentRecipe:** Use selected cloth.vertexPaintRecipe with shared neutral grain and calibrated per-part vertex color; ceramics retain desired vertex color on white base. Never tint cream bake by stock color.

### opaqueTimber

```json
{
  "sourceMaterialId": "ph_bz04_rough_pine_door",
  "exportName": "bz05_b_teal_timber",
  "grainMix": 0,
  "metalness": 0,
  "roughness": 0.86,
  "normalScale": 0.15,
  "use": "Authored teal/indigo painted joinery uses desired linear vertex color on a white base and the licensed normal/roughness maps. Multiple owner colors share one PBR/shadow batch.",
  "baseColorMode": "opaque-paint",
  "paintColorSource": "opening.finishPaintSrgb",
  "ownerPaletteSrgb": {
    "teal": "#5d9c8a",
    "indigo": "#53799f"
  },
  "roughnessMode": "Source ARM green multiplied by0.86; source metallic disconnected",
  "paintSrgbRole": "Desired opaque paint, grainMix0; retain assigned owner openings only.",
  "replacesExportName": "bz04_teal_timber_project_original"
}
```

### fineLinen

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

### monolithicStoneTrim

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

### surfaceRecipes

```json
{
  "ph_bz04_painted_plaster_warm": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#d8c4a0",
    "paintSrgb": "#fce8bf",
    "paintLinear": [
      0.9759319078969907,
      0.8080663901978523,
      0.5201984763525123
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "ec57d01d27651f483bc090d056b283ff50e7f9e0e2793f6eba5c49d49dc20307",
      "normal": "773161a02c4e3a8b975bd3adbfa5306c44d4658e5d8c3a6a4d66bd8477230109",
      "arm": "ec41a0b413679af0d7a50cda1c9429c7f9a658bfd3cf5df3f772faac04be6f28"
    },
    "exportName": "bz06_cream_plaster",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_beige_wall_002": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#d3bb93",
    "paintSrgb": "#f4dbb0",
    "paintLinear": [
      0.9014739814657824,
      0.7089028117412087,
      0.4348573119144994
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e",
      "normal": "504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5",
      "arm": "cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f"
    },
    "exportName": "bz06_sand_plaster",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_plastered_wall": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#ddd0b3",
    "paintSrgb": "#fdf1d4",
    "paintLinear": [
      0.9812088492707967,
      0.8804478356651972,
      0.6552866173193502
    ],
    "grainMix": 0.47422169068066733,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e",
      "normal": "504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5",
      "arm": "cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f"
    },
    "exportName": "bz06_pale_lime",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_aged_plaster_ochre": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#c6a16c",
    "paintSrgb": "#e5bd82",
    "paintLinear": [
      0.7814988083980416,
      0.5084248113955151,
      0.22350127106028497
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e",
      "normal": "504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5",
      "arm": "cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f"
    },
    "exportName": "bz06_faded_ochre",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_red_plaster_weathered": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#b77c62",
    "paintSrgb": "#dea183",
    "paintLinear": [
      0.7282053832884988,
      0.35496713337145963,
      0.2257058556419342
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "b49519d865609f137b1796114234183f512d936a51989b74a17a67b47d3bf668",
      "normal": "72ee053a5ea8a0e9c9a33bd6d84ab576cb218961c62f97b08804c3e19f824d5f",
      "arm": "4fed44ce160da630bc6f6e7793a264d5375ad4602bf0d87499ee96eb894b3b7d"
    },
    "exportName": "bz06_faded_earth_red",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_sandstone_blocks_05": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#bda985",
    "paintSrgb": "#eaddbb",
    "paintLinear": [
      0.8214550628297725,
      0.7220556851362163,
      0.4965705233480168
    ],
    "grainMix": 0.7,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
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
    "exportName": "bz06_dressed_sandstone",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_sandstone_blocks_06": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#b6a185",
    "paintSrgb": "#f9e7c9",
    "paintLinear": [
      0.946174958515037,
      0.7983868950319168,
      0.5872168732348412
    ],
    "grainMix": 0.6707432788190668,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "a091e04d73ddf7485d1b99a66d6cfe270e9ba36cdc26f98dbc17934427e43bc9",
      "normal": "a7e5c96b8ba3ab3d066c673c4da9b1b7735f176ed6b6b2b9f74216fc151225f7",
      "arm": "119a2dd5a764d82396e1ea3736aff0c981295ab756847a0bc90d455c182cb411"
    },
    "exportName": "bz06_service_stone",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "bz04_court_limestone_flags_01": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#baa47f",
    "paintSrgb": "#eedebd",
    "paintLinear": [
      0.8552869216232429,
      0.7317958404526851,
      0.5079860185422087
    ],
    "grainMix": 0.7,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "8d2458db374992bef26044610895f7bbf2acfdbbbcaa98cbacbc0ca2e168b7f1",
      "normal": "c73e302b6ffacf5f28dece4d40acfeca854933980e661968e255de4ee07bb283",
      "arm": "93272f7bb1013e7655678aef81ea21382ffce57e66f3641ce7ef3eab1e86cfb8"
    },
    "exportName": "bz06_quiet_flags",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "bz04_large_sandstone_blocks_01": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#b29972",
    "paintSrgb": "#e5d8b0",
    "paintLinear": [
      0.7803693662498348,
      0.6862490137981643,
      0.4364997362754391
    ],
    "grainMix": 0.7,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "b378f21aee692b297a84c6cb6e2c09c2149f192cb93ae7dc14436013c8d3c29f",
      "normal": "b117c89f83372724d409c9d921fa1c8e0f488867ab4029dd98ed20cbce22c18d",
      "arm": "f6217220ec9a33014f17d8e5bd33c92e28e2ec8ccb191cf9a2082d7485bb54b2"
    },
    "exportName": "bz06_rough_service_paving",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_hessian_230": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "desiredAppearanceSrgb": "#dfcfab",
    "paintSrgb": "#e9d8b3",
    "paintLinear": [
      0.8149469973050627,
      0.689100792708164,
      0.4497553956762431
    ],
    "grainMix": 0.12,
    "formula": "Final=neutralGrainLinear*calibratedVertexPaintLinear; neutral grain contains no cream/rust tint. Base factor white.",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "ef9ac1a0129b6d0f44b6d5beb68db7be7a0adf11e09fe52fd2cdc9370b27d4ba",
      "normal": "6d5a6d23c880dbaae98477ed33dbd5d7c0eeda910a39319aec2d0014892974aa",
      "arm": "963ba03b3583a9dcc3a10181a9042de63aec019ee1a8a89c8be77d33a2f6b691"
    },
    "exportName": "bz06_cream_woven_cloth",
    "binding": "Preserve neutral-grain derived texture and calibrated COLOR_0. Base factor white; no additional source/cream/stock multiplication.",
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
  },
  "ph_bz04_fine_linen": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "desiredAppearanceSrgb": "#dfcfab",
    "paintSrgb": "#e9d8b3",
    "paintLinear": [
      0.8149469973050627,
      0.689100792708164,
      0.4497553956762431
    ],
    "grainMix": 0.12,
    "formula": "Final=neutralGrainLinear*calibratedVertexPaintLinear; neutral grain contains no cream/rust tint. Base factor white.",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "ef9ac1a0129b6d0f44b6d5beb68db7be7a0adf11e09fe52fd2cdc9370b27d4ba",
      "normal": "6d5a6d23c880dbaae98477ed33dbd5d7c0eeda910a39319aec2d0014892974aa",
      "arm": "963ba03b3583a9dcc3a10181a9042de63aec019ee1a8a89c8be77d33a2f6b691"
    },
    "exportName": "bz06_fine_linen",
    "binding": "Preserve neutral-grain derived texture and calibrated COLOR_0. Base factor white; no additional source/cream/stock multiplication.",
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
  },
  "ph_bz04_trim_sanded_01": {
    "mode": "crop-mirror-bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#c5b18d",
    "paintSrgb": "#dccba5",
    "paintLinear": [
      0.7175869406315156,
      0.5951917042797605,
      0.3778628251105845
    ],
    "grainMix": 0.4,
    "formula": "Crop and normal-correct mirror first; paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear). Bake sRGB output once.",
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
    "exportName": "bz06_monolithic_stone_trim",
    "binding": "Preserve derived monolithic trim maps and white export base factor. Crop recipe takes precedence over original whole-wall textures."
  }
}
```

## Rugs, shade and trade detail

**source:** apps/client/public/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg

**sha256:** 2ce0167be55709349357dc8062f2673fba899bfd537863472567fa4e9a7e063e

**uv:** This source is a repeating woven motif, not a whole rug with a border. Preserve its 1.20 m world repeat in the field, align the weave to the long edge and add the specified plain bound border. Never stretch the field separately on each triangle or map unrelated world axes onto folds.

**hangingRugs:** Keep the two existing textile-shop rugs on their rear frame; use the revised part boxes. Model 0.008 m cloth thickness and at most 0.010 m bow within the 0.030 m out envelope. A 0.035 m indigo bound border lies inside each rectangle; 0.020 m end fringe stays inside the height. Ties meet the existing top rail. Preserve staff space.

**rolledRugs:** Retain four existing rolls. Give visible ends a shallow concentric fold and a bound outer edge within the existing cylinder; no flat wood-like disk or extra stock.

**balcony:** One domestic rug drapes over the left front balustrade panel at its exact new feature coordinates. It covers less than one third of the rail and leaves the star joinery visible. No rugs on random walls or on protected ground.

**seat:** The existing fitted tea cushion receives the rug motif as woven upholstery, with a 0.025 m plain indigo bound edge. Keep its existing supports and silhouette; do not add floor cushions.

### Exact rail-rug attachment

```json
{
  "id": "B-HOUSE-RAIL-RUG",
  "receiverParcel": "B_N_HOUSE",
  "receiverFace": "north",
  "wallPlaneM": 92,
  "kind": "draped-rug",
  "alongM": 26.97,
  "widthM": 0.76,
  "zM": [
    3.7,
    4.47
  ],
  "outM": [
    0.64,
    0.8
  ],
  "bbox": {
    "min": [
      26.59,
      91.2,
      3.7
    ],
    "max": [
      27.35,
      91.36,
      4.47
    ]
  },
  "materialId": "bz04_levantine_rug_project_original",
  "detail": "B-FINISH-TEXTILE",
  "playable": false,
  "castsShadow": false,
  "receiverFeatureId": "B-HOUSE-BALCONY",
  "receiverPart": "front top rail",
  "receiverRailTopM": 4.45,
  "foldPathOutZ": [
    [
      0.66,
      3.94
    ],
    [
      0.66,
      4.41
    ],
    [
      0.72,
      4.458
    ],
    [
      0.8,
      4.41
    ],
    [
      0.8,
      3.7
    ]
  ],
  "thicknessM": 0.008,
  "borderWidthM": 0.035,
  "borderColorSrgb": "#596778",
  "fringeM": 0.02
}
```

**B-FINISH-TRIM:** Consume opening.finishFamily and its explicit surroundMaterialId, revealMaterialId, sillMaterialId and finishPaintSrgb. These override the parcel-wide trim argument in the existing builder. B-04 aperture positions, profile masks, widths, heights and depths stay fixed. All north joinery below z=2.2 remains at out<=0, including hinges, sill and threshold.

**B-FINISH-GRAIN:** Assign UVs per physical member: vertical grain on stiles/boards, horizontal on rails/lintels; normal maps follow the same axes. Do not let box/world projection put masonry-like horizontal bands across a timber leaf. Preserve source scan scale and provenance. Panel rebates, frame joints and bound edges must survive export.

**B-FINISH-SHADE:** Keep existing support and membrane geometry. Render a 0.025 m bound hem inside each cloth edge. Potter hem is cream; textile hem muted indigo #596778; tea hem muted teal #78978d. The band is part of the cloth material/UV or vertex treatment, not a floating strip or new draw batch.

**B-FINISH-STOCK:** Keep every trade group and its exact quantities. Apply the scheduled pottery accent colors to bowls and jars. Retain open bowls, rolled ends, proper lids, grounded feet and smooth vessel sides. Existing plants need curved leaves and visible soil contact; do not replace them with flat triangular cards or add extra planting.

**B-FINISH-WEAR:** Use local receiver-bound wear only: 0.003 m timber edge easing on handled rails; subtle desaturation at latch/handle contact; pottery-counter abrasion on its front top edge; soil contact inside the planter. Use existing meshes and low-contrast vertex/UV treatment. No full-height grime, regular dirt stripes, random cracks or global sepia grade.

## Performance and efficient execution

```json
{
  "targetTriangles": 56000,
  "hardTriangleLimit": 64000,
  "maxPrimitives": 23,
  "newFinishTriangleAllowance": 8000,
  "rule": "User-authorized B-only increase: 64,000 triangles maximum, 56,000 working target, at most 23 primitives. The implemented B-04 mesh is 47,860 triangles, leaving 16,140 below the revised ceiling. Allocate up to 8,000 added triangles to trim, joinery, cloth folds and edges within the total. Preserve lattice voids and curved silhouettes; remove hidden topology without blanket 3D dissolution. Retain the corrected screen-area, outward-normal and bounds assertions. Global desktop/mobile draw, triangle and frame-time limits remain unchanged and must be measured at the end.",
  "sampling": "At the consolidated end review, collect three alternating before/after runs at each affected north/tea view after warmup, at least 120 rendered samples per view per run. Preserve raw samples and report median, p95, absolute change in ms and percent. Do not average 15-sample medians or repeat until a pass. Keep the existing 10 percent rule, draw/triangle ceilings and physical-mobile limitation explicit. Use real rendered-frame sampling for FPS/GPU claims. If the existing runner advances manual QA frames, report its CPU timings as QA telemetry and keep actual FPS/device performance unverified.",
  "process": "Build and integrate once, then one end review and targeted corrections. Reuse before cameras, material provenance, shared assets and the corrected export runner. A cheap batch of shape/normal/material assertions belongs in the normal export, not another approval gate. Record construction vs correction vs reporting time; do not commission recurring reviewers. Extract only B courtyard and its referenced records from design.json; do not dump the whole-map source into the implementation context."
}
```

## Finish acceptance

- Wide view: the retained merchant balcony and tea gallery lead, with the matching R4 upper window pair and crafted entrance clearly visible. No unscheduled motifs or extra clutter.
- At 3–6 m: guest-house shutters show leaves, midrails and teal paint in neutral and shipped light. A correctly named but visually black material fails finish acceptance. Verify the final GLB base-color graph and vertex colors before assigning a cause.
- At 2–4 m: plaster reveals, stone sills, frame joints, dark hardware and timber grain are distinguishable. No uniform bright stone rectangle around every opening, light leaks, floating trim or texture stretching.
- Textiles: both shop rugs have visible bound edges and grounded frame ties; rolls read as rolled cloth; the balcony rug touches the rail along its fold; the tea cushion reads as fabric.
- Final evidence must show material/assembly appearance and the recorded gameplay/performance checks. No percent-complete estimate, bounding-box pass or material ID substitutes for the explicit finish criteria.

## Audited B-04 baseline

```json
{
  "evidence": "artifacts/b04-trial-20260909/report.md",
  "taskId": "01a0844e-5bfd-74a3-bc5f-bb68592bb553",
  "taskElapsedSeconds": 2632.974,
  "validationElapsedSeconds": 2009,
  "exportAttempts": 9,
  "correctionSeconds": 821,
  "finalTriangles": 47860,
  "triangleHeadroom": 140,
  "primitives": 23,
  "colliders": 155,
  "movementRoutesPassed": 7,
  "desktopMaxCpuMedianMs": 5.0,
  "mobileEmulationMaxCpuMedianMs": 3.3,
  "desktopMaxDrawCalls": 756,
  "mobileMaxDrawCalls": 281,
  "limits": "Saved QA evidence, not a new live benchmark. Only 15 samples per view. Paired CPU failures remain unresolved; manual QA-frame telemetry is not physical-device FPS. The 85 percent completion estimate did not schedule a further finishing layer.",
  "baselineTriangleLimit": 48000,
  "concurrentWork": "The active B spawn test task is repairing the shared-environment guard, material helper and workflow tooling. Its new merchant/gallery/guest detail cameras and opaque-paint material definition are preserved; B-05 adds the textile detail pose and future finish targets. Baseline failures above describe the completed B-04 trial, not a claim that concurrent fixes remain broken."
}
```

The linked trial records the implemented result. R7 is documentation only until a separate implementation task builds and measures it.
