# R5 model and asset readiness audit

Read-only audit, 2026-09-09. Current geometry and window composition are preserved. Counts come from active design.json; mesh costs below come from current installed GLB/glTF headers. Existing image previews are earlier work, not R5 model proof.

## Readiness conclusion

Most R5 architecture and all complete R5 area outputs remain to be built. The 25-area handoff is a proposed design. Eight area source directories exist, but their presence does not mean an R5 implementation exists. The B package explicitly says B-04-only. The active facade model registry contains old Spice, B-04, B roof/caps and shared environment; the Rug Gate portal is registered in props. Schematic perspective boxes are measured envelopes, not finished prop models.

## Existing sources and reusable assets

| Family | Status | Material treatment |
|---|---|---|
| Licensed wall/floor/timber/cloth scans | Existing source images; 84 entries in the design material schedule include originals/aliases, not 84 unique ready new textures | Preserve scans; use proposed isolated aliases and craft derived copies. Source image readiness does not establish the painted exported finish. |
| Levantine rug field | Existing project-owned 1024px albedo, sources.json records licence and hash; visually inspected | Keep unmodified rust/indigo/cream/teal woven field at 1.20 m repeat; new bound borders/fringe/curved rolls belong to geometry. |
| Old rug-gallery and rug-roll-chest | Existing source .blend/build.py/GLBs, provenance file present | Reusable construction reference, not R5 drop-ins. Their old simplified atlas is not the required Levantine field. |
| Wine barrel, wicker basket, ceramic pot | Existing Poly Haven CC0 glTFs, registry source and checksums | Retain exact designated gameplay placement/mesh. The wicker basket is 17,850 triangles and the wine barrel 10,820 triangles at the registered mesh level, so do not multiply them across stock shelves. Calibration only; do not populate new shop layouts from generic random pools. |
| Spawn cover / cover goods | Existing procedural compositions with existing crate/model paths | Retain silhouette and transform. Materials remain subject to common calibration, not replacement with new colliders. |
| Ground rug | Existing procedural runtime asset | Retain one exact gameplay-associated placement; align scheduled textile finish without moving or expanding it. |
| Fountain | Existing project-authored procedural assembly, stone/tile/water/bronze batches | Retain existing geometry; selective blue/teal tile is useful craft color. No current fountain visual acceptance is claimed in this audit. |
| B-04 facade / B roof / shared skyline / Rug Gate portal | Existing GLBs and generator reuse candidates | B is not R5. Reuse helpers/geometry only where exact R5 schedule agrees; final paint, craft details and planned owner-specific openings still require construction. |

## All areas

| Area | Existing source directory | Activity groups | Features | Shade fixtures | Retained gameplay | R5 status |
|---|---|---:|---:|---:|---:|---|
| SPAWN_A_COURTYARD | Yes; earlier output/source | 2 | 1 | 1 | 1 | Proposed; complete R5 output unverified |
| SPICE_STREET | Yes; earlier output/source | 3 | 0 | 5 | 5 | Proposed; complete R5 output unverified |
| FOUNTAIN_COURT | Yes; earlier output/source | 1 | 1 | 0 | 2 | Proposed; complete R5 output unverified |
| TEXTILE_ARCADE | Yes; earlier output/source | 6 | 0 | 1 | 1 | Proposed; complete R5 output unverified |
| RUG_GATE | Yes; earlier output/source | 1 | 0 | 1 | 1 | Proposed; complete R5 output unverified |
| SPAWN_B_COURTYARD | Yes; earlier output/source | 6 | 6 | 3 | 1 | Proposed; complete R5 output unverified |
| SERVICE_SOUTH | Yes; earlier output/source | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| CARAVAN_COURT | Yes; earlier output/source | 1 | 0 | 0 | 1 | Proposed; complete R5 output unverified |
| SERVICE_NORTH | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| TEA_RAMP | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| TEA_TERRACE | No | 2 | 0 | 2 | 1 | Proposed; complete R5 output unverified |
| TEA_STAIRS | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| TEA_LANDING | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| DYERS_ALLEY | No | 2 | 0 | 1 | 0 | Proposed; complete R5 output unverified |
| COVERED_SOUK | No | 4 | 0 | 2 | 1 | Proposed; complete R5 output unverified |
| DYERS_DOGLEG | No | 1 | 1 | 0 | 0 | Proposed; complete R5 output unverified |
| NORTH_COURT | No | 1 | 1 | 0 | 1 | Proposed; complete R5 output unverified |
| LINK_WEST_MID | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_EAST_MID | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_WEST_UPPER | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_EAST_UPPER | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_SOUTH_WEST | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_SOUTH_EAST | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_NORTH_WEST | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |
| LINK_NORTH_EAST | No | 0 | 0 | 0 | 0 | Proposed; complete R5 output unverified |

## Every activity part kind

These are 271 scheduled parts across 30 groups and 43 shape kinds. All require the exact R5 assembly layout/craft treatment, even where prior helper shapes exist. None is accepted merely because a localBox is shown.

| Part kind | Instances | Material(s) | Readiness |
|---|---:|---|---|
| arabian-coffee-pot | 6 | bz04_brass_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| bound-folded-textile | 6 | ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| bound-hanging-rug | 10 | bz04_levantine_rug_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| carved-wood-scoop | 1 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| ceramic-mortar-with-seated-pestle | 1 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| contained-lancet-plant | 6 | bz04_plant_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| contained-soil | 2 | bz04_soil_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| fitted-cloth-cushion | 3 | bz04_levantine_rug_project_original, ph_bz04_fabric_leather_02, ph_bz04_hessian_230 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| folded-cloth | 11 | bz04_levantine_rug_project_original, ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| framed-timber-end | 6 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| framed-timber-trestle | 6 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| grounded-counter-carcass | 11 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| grounded-plank-chest | 4 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| grounded-timber-bench | 2 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| grounded-timber-table | 3 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| hanging-cloth | 9 | bz04_levantine_rug_project_original, ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| hollow-stone-trough | 2 | ph_bz04_stone_trim_sandstone | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| horizontal-rolled-rug | 20 | bz04_levantine_rug_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| lidded-ceramic-jar | 12 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| lidded-ceramic-vessel | 3 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| lidded-tea-canister | 12 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| lidded-wood-box | 1 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| locked-timber-lattice-gate | 7 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| open-ceramic-bowl | 6 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| open-ceramic-cup | 12 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| open-cloth-sack | 2 | ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| plank-board | 10 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| plank-shelf | 12 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| plank-worktop | 3 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| rolled-textile | 8 | ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| rounded-ceramic-vessel | 3 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| sealed-ceramic-bottle | 15 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| slatted-wood-box | 1 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| stacked-ceramic-plate | 2 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| stocked-spice-tray | 6 | bz04_ceramic_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| stone-plinth | 3 | ph_bz04_stone_trim_sandstone | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| supported-brass-balance | 2 | bz04_brass_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| taut-woven-panel | 2 | bz04_levantine_rug_project_original | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| tied-cloth-parcel | 1 | ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| timber-apron | 3 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| timber-member | 32 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| timber-roller | 2 | ph_bz04_worn_planks | Bespoke R5 assembly; reuse existing source material/helper where compatible |
| woven-basket | 2 | ph_bz04_fabric_leather_02 | Bespoke R5 assembly; reuse existing source material/helper where compatible |

## Planned facade features and fixtures

| Area | Feature or fixture | Kind / recipe | Owner |
|---|---|---|---|
| SPAWN_A_COURTYARD | R3-A-GATE-INSCRIPTION | inscribed-panel /  | unit-spawn-a-courtyard |
| SPAWN_A_COURTYARD | R4-SHADE-A_W_SEAT | awning / SD-12 | unit-spawn-a-courtyard |
| SPICE_STREET | SHADE_S_W_SHOP_1 | awning / SD-12 | unit-spice-street |
| SPICE_STREET | SHADE_S_W_SHOP_2 | awning / SD-12 | unit-spice-street |
| SPICE_STREET | SHADE_S_W_SHOP_3 | awning / SD-12 | unit-spice-street |
| SPICE_STREET | CANOPY_SPICE_S | canopy / SD-13 | unit-spice-street |
| SPICE_STREET | CANOPY_SPICE_N | canopy / SD-13 | unit-spice-street |
| FOUNTAIN_COURT | R3-GUILD-INSCRIPTION | inscribed-panel /  | unit-fountain-court |
| TEXTILE_ARCADE | CANOPY_TEXTILE | canopy / SD-13 | unit-textile-arcade |
| RUG_GATE | SHADE_R_W_SHOP | awning / SD-12 | unit-rug-gate |
| SPAWN_B_COURTYARD | B-HOUSE-BALCONY | screened-balcony /  | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | B-TEXTILE-HOOD | timber-hood /  | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | B-STORE-HOIST | hoist /  | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | B-TEA-GALLERY-SILL | gallery-sill /  | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | B-WEST-ABUTMENT-FIELD | recessed-field /  | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | B-HOUSE-RAIL-RUG | draped-rug /  | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | SHADE_B_N_POTTER | awning / SD-12 | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | SHADE_B_N_TEXTILE | awning / SD-12 | unit-spawn-b-courtyard |
| SPAWN_B_COURTYARD | SHADE_B_W_TEA | awning / SD-12 | unit-spawn-b-courtyard |
| TEA_TERRACE | SHADE_tt-shop | awning / SD-12 | unit-tea-terrace |
| TEA_TERRACE | R4-SHADE-TT-RECESSED-SEAT | awning / SD-12 | unit-tea-terrace |
| DYERS_ALLEY | SHADE_DA_E_WORK_RECESS | awning / SD-12 | unit-dyers-alley |
| COVERED_SOUK | CANOPY_SOUK_S | canopy / SD-13 | unit-covered-souk |
| COVERED_SOUK | CANOPY_SOUK_N | canopy / SD-13 | unit-covered-souk |
| DYERS_DOGLEG | R4-DOGLEG-HOUSE-BALCONY | supported-shallow-balcony /  | unit-dyers-dogleg |
| NORTH_COURT | R3-HAMMAM-INSCRIPTION | inscribed-panel /  | unit-north-court |

## Retained gameplay inventory

| Area | Placement | Asset |
|---|---|---|
| SPAWN_A_COURTYARD | PLACE_SPAWN_A_COVER_SPAWN_A_COVER_01 | ASSET_SPAWN_COVER |
| SPICE_STREET | PLACE_B4_SPICE_COVER_RUG_COVER_SPICE_01 | ASSET_GROUND_RUG |
| SPICE_STREET | PLACE_SPICE_BARREL_COVER_SPICE_01 | ASSET_CC0_BARREL |
| SPICE_STREET | PLACE_SPICE_BASKET_COVER_SPICE_01 | ASSET_CC0_BASKET |
| SPICE_STREET | PLACE_SPICE_COVER_CORE_COVER_SPICE_01 | ASSET_COVER_GOODS |
| SPICE_STREET | PLACE_SPICE_POTTERY_COVER_SPICE_01 | ASSET_CC0_POTTERY |
| FOUNTAIN_COURT | PLACE_FOUNTAIN_COVER_COVER_FOUNTAIN_01 | ASSET_COVER_GOODS |
| FOUNTAIN_COURT | PLACE_FOUNTAIN_LMK_FOUNTAIN_01 | ASSET_FOUNTAIN |
| TEXTILE_ARCADE | PLACE_TEXTILE_COVER_COVER_TEXTILE_01 | ASSET_COVER_GOODS |
| RUG_GATE | PLACE_RUG_COVER_COVER_RUG_01 | ASSET_COVER_GOODS |
| SPAWN_B_COURTYARD | PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01 | ASSET_SPAWN_COVER |
| CARAVAN_COURT | PLACE_CARAVAN_COVER_COVER_CARAVAN_01 | ASSET_COVER_GOODS |
| TEA_TERRACE | PLACE_TEA_COVER_COVER_TEA_01 | ASSET_COVER_GOODS |
| COVERED_SOUK | PLACE_DYERS_COVER_COVER_DYERS_01 | ASSET_COVER_GOODS |
| NORTH_COURT | PLACE_NORTH_COVER_COVER_NORTH_01 | ASSET_COVER_GOODS |

## Measured installed mesh cost

Header counts are mesh primitives and indexed triangles, not in-game draw calls, instanced scene totals or GPU memory. Files are measured fresh; counts do not certify R5 appearance. glTF byte counts cover the JSON container only, excluding external .bin and images; GLB counts cover embedded resources. The installed B GLB measures 47,860 triangles, while its existing inspection sidecar says 47,902; use the freshly parsed output rather than treating the sidecar as current truth.

| Model | Triangles | Primitives | Materials | Images | Container bytes |
|---|---:|---:|---:|---:|---:|
| ph_wooden_crate_02 | 5176 | 2 | 1 | 3 | 4150 |
| ph_Barrel_02 | 2688 | 1 | 1 | 3 | 2639 |
| ph_wicker_basket_02 | 17850 | 2 | 1 | 3 | 4497 |
| ph_ceramic_pot | 3592 | 1 | 1 | 3 | 2990 |
| ph_wine_barrel_01 | 10820 | 4 | 1 | 3 | 6673 |
| ph_wooden_crate_01 | 6576 | 3 | 1 | 3 | 5612 |
| bz04_rug_gate | 1868 | 4 | 4 | 9 | 7025768 |
| section_unit_spice_street | 23768 | 17 | 17 | 0 | 1747092 |
| section_unit_spawn_b_courtyard | 47860 | 23 | 19 | 4 | 6118516 |
| bz04_roof_bundle_unit_spawn_b_courtyard | 816 | 8 | 8 | 21 | 11108756 |
| bz03_b_gate_cap_west | 12 | 1 | 1 | 3 | 2024320 |
| bz03_b_gate_cap_east | 12 | 1 | 1 | 3 | 2024308 |
| bz04_shared_environment | 14586 | 8 | 8 | 24 | 12777288 |

## Prioritized findings

1. **R5 material and model approval is still design-level.** No complete R5 area export is established. Preserve the liked architecture, but do not call old B/Spice GLBs or schematic boxes finished R5 assets. The highest risk is a generic part emitter silently treating a named vessel, textile fold or fitting as a box.

2. **Use the new craft material recipes, not old embedded bindings literally.** The old embeddedDetailBindings ceramic recipe has beige baseColor #c5a37c; craftStandards explicitly replaces it with a white base and linear desired stock colors. Timber/cloth also require bounded paint/scan mixes, not scan-times-paint. Following the old bindings darkens all pottery/wood/cloth and loses the warm maintained bazaar. This is precedence risk, not a request to change geometry.

3. **Keep the actual woven rug source distinct from earlier atlas assets.** The current Levantine image visually has the desired rich rust/indigo/cream weave. The older rug-displays atlas visually has sparse flat diamonds and broad muted strips. Reusing its GLB material as-is would downgrade the scheduled craft. Its geometry may inform new construction, but field material/UVs must follow R5.

4. **Shared ownership metadata still describes a pre-install state.** sharedEnvironment.status is not-started although its installed model is present. Rug Gate design.source names assets/source/unit-rug-gate/build.py, but the installed portal registry correctly names assets/source/unit-spawn-b-courtyard/build.py, where LM01 export actually lives; the named Rug Gate build.py makes earlier frontage faces. Reconcile the construction owner/source at implementation so an area build does not accidentally rebuild old frontage output or duplicate shared geometry.

5. **Budget the embedded craft texture copies explicitly.** Current measured B section has 23 primitives. Existing installed B roof is already 11,108,756 bytes with 21 embedded images for 816 triangles; each 12-triangle gate cap is about 2.02 MB with three images; shared environment is 12,777,288 bytes with 24 images. These are measured container costs, not GPU residency; future canonical per-source/PBR/shadow batches and 1k area-owned bakes are specified but not delivered. Repeated embedded copies across areas can cost texture memory even if alias names match. A 1024x1024 RGBA texture is approximately 4 MiB without mips (5.33 MiB with full mips), an estimate, not measured residency. The 291 new-primitive / 838,316 new-triangle whole-map allocations are planning ceilings, not observed runtime results.

6. **Prior source presence is not full visual provenance.** Licensed scans and the Levantine textile have local source/license/hash records. Project-original brass, ceramics, plant and soil are explicit model/material recipes awaiting finished shapes. No modern/polished store-bought asset is required by the current named layouts; generic modern/legacy/random pools should not be substituted. The reviewed old B bench preview has conspicuous multicolor plank patchwork, so its material is a reuse candidate requiring the proposed calm warm-timber copy, not an as-is finish.

## Visual inspection limits

Opened the current Levantine source, old rug-displays atlas, and existing B bench preview. Other planned bespoke shapes were audited as construction prescriptions and registry/source readiness, not visually audited completed meshes. No game build, runtime capture, asset fetching, installation, active document edit or game asset edit occurred. A subsequent bounded Blender CPU render imported four exact registered existing glTF models with their original material bindings; only camera, neutral world and light were added to the temporary scene.


## Actual retained imported model visual evidence

Fresh 800px CPU renders use exact registered glTF imports and unchanged imported materials/mesh geometry. Neutral studio daylight with AgX is a source-asset inspection, not the game's final lighting/shader result. Each image fits its own camera framing and is not a comparative scale lineup. Sources remain untouched; the render script is saved alongside these images.

| Asset | Image | Observation and proposed treatment |
|---|---|---|
| `ph_wicker_basket_02` | [Basket](retained-wicker-basket.png) | Warm honey-colored woven cane, uneven weave, restrained darker supports and a leaning lid. Fits the golden market well as-is. Do not brown-grade it or multiply its expensive 17,850-triangle mesh into shelf stock. Preserve the full retained silhouette, including its lid. |
| `ph_wine_barrel_01` | [Barrel](retained-wine-barrel.png) | Medium brown wood, dull grey metal hoops, readable stave structure. Neither overly clean nor modern. Suitable retained storage accent; avoid spreading its darker brown mass into a repeated decor formula. Common calibration only, no shape changes. |
| `ph_ceramic_pot` | [Pot](retained-ceramic-pot.png) | Existing lidded handled cooking vessel reads mottled olive/brown with greenish worn glaze and dark shoulder. Believable old utility ware but comparatively muddy/dark beside the target sun-faded palette. Keep this retained vessel; if calibration is needed, use a bounded material-only lift, preserving glaze variation. Do not use this same pot for every new ceramic shop item: those are distinct R5 shapes and glazes. |
| `ph_wooden_crate_01` | [Crate](retained-wooden-crate.png) | Low lidded timber chest with rope handle, dark latch and muted worn reddish-golden boards. Good trade/storage source. This source model is linked to the cover-goods family, but the runtime cover composition remains procedural; the image is the imported source chest, not proof of the complete in-game cover arrangement. Preserve retained cover geometry and transforms. |

No procedural fountain, spawn-cover arrangement or unbuilt R5 assembly was replaced by a proxy for this audit. None of the four imported models is conspicuously modern or polished. The pot is the strongest finish mismatch; the wicker basket is the strongest as-is color match.
