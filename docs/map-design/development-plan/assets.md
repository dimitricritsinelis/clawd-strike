# Asset kit and placement assignments

**Revision 3 / status: proposed**, except the existing textile booth's location-specific visual approval stated below. This file owns assembly definitions and batches. [Building cards](buildings.md) own composition and bay positions. Existing runtime transforms remain exclusively in the source spec and owning code. An asset described as “reuse” is selected for retention, not certified visually complete.

## Shared production contract

- **Five complete-assembly families:** adapt `ASMB_SHUTTER_WINDOW`, adapt `ASMB_SCREEN_WINDOW`, create `ASMB_SPICE_COUNTER`, adapt `ASMB_RUG_DISPLAY`, create `ASMB_DYE_COUNTER`. Each has the finite, placement-driven designs below. Other definitions group existing components/assemblies for a complete handoff; they do not require a new model, editor, registry system or generator. `ASMB_WALL_FINISH` and `ASMB_GROUND_FINISH` are treatment schedules using existing material/trim code, not configurable products.
- **Source:** one editable Blender asset, named objects/materials, reproducible export beside the source, one pilot at a time. Use the existing textile booth workflow. Keep source and runtime art separate. Source metre frame: +X across the asset, +Z up, front -Y. GLB export +Y up, +Z toward viewer; mount using the existing design-to-runtime transform, not camera yaw. Pivot is the center of the mounting width at the wall/base datum (window at sill, freestanding asset at ground). For reused assets retain their actual existing pivot and transforms.
- **Fit:** complete models use 1:1 scale and no mirror; signs/lettering and cloth motifs must never reverse. No nonuniform scaling of finished frames, counters or booths. A bay is compatible only when the entire model, its attachments and swept-body clearance fit. Minimum reveal clearances use source `composition_rules.clearances` (opening lateral .08 m, canopy/opening .12, placement AABB .05, fixture .08, fixture-axis tolerance .02, door service .8); these do not replace route width or standing/crouched clearance. Refuse an incompatible placement rather than stretch an asset.
- **Construction:** give frames closed backings, two jambs, head, sill with drip, visible return thickness, believable frame-to-wall seating and hardware. Timber joins end in supported members. Cloth has thickness, seams, tension points and weighted hem; no unsupported corners or paper cards. All base contacts are grounded. No new topology advertises a doorway the player cannot use: doors remain visibly closed, display recesses have backs/counters/screens, route portals remain open.
- **Materials:** use the existing facade material slots and installed textures; `ph_worn_planks`/`ph_rough_pine_door`, sandstone trims, existing project-original textile maps. Original art or CC0 production resources only. Keep source/license/MD5 and dependency provenance in the owning model/texture manifest. Reference photographs/screenshots guide construction and palette; do not turn them into production textures. No new downloads are needed for this kit.
- **Targets, not measured performance:** new window ≤2,500 triangles, ≤2 material slots, shared 1k PBR maps initially (2k when justified by the close pilot); counter ≤12,000 triangles/2 materials/shared 1k maps; rug display ≤8,000 triangles/2 materials/shared 1k maps. A close pilot can justify a bounded increase by evidence. Avoid separate materials per board/cloth color. Reuse atlas regions and existing batching; do not add a new instancing framework. Do not rebuild retained landmark kits for a speculative triangle goal.
- **Performance acceptance:** use the current `apps/client/scripts/lib/performanceAcceptance.mjs` budgets and map-polish matching-pose comparison. Asset targets do not override whole-view draw/triangle/CPU limits. One new booth adds up to 38,820 model triangles before suppression, so measure its actual net cost. No performance or clearance pass is claimed by this plan.
- **Gameplay:** retain all colliders, anchor bindings, cover silhouettes, traversable surfaces, route cuts and existing sightline envelopes. New render-only elements must fit outside the entire traversed body volume. Being below the camera or above a nominal 2.45 m plane is insufficient, especially on stairs/ramps. No external collision proxies or new route obstructions are part of this asset batch.

## Complete assemblies

<a id="asmb_shutter_window"></a>
### ASMB_SHUTTER_WINDOW · P-WINDOW

**Adapt** existing `window_shuttered` construction in `wallDetailFamilies/windows.ts` / `v3Architecture.ts` into one finished source asset. Purpose: believable merchant upper-room closure. Visual reference: R01 Spice Street and R08 construction study in references.md; the real CS2 daylight images remain finish benchmarks. Existing game windows are spatial evidence, not the target quality. No borrowed texture pixels.

Observed module: **1.60 W ×.24 D ×1.65 H m**. Preserve that complete external envelope; canonical fit is this module only, within mounting tolerance measured at M02. Pivot at center sill on wall plane. Four back mounting corners; shutter hinges on both jambs; sill supported by masonry below. Closed timber shutter leaves, no swing into route or exposed void. Three construction variants, with the same external fit: **SH-L louvered teal** (ventilated paired leaves), **SH-P paneled walnut** (solid framed leaves, quieter bedrooms), **SH-W woven infill** (timber frame with backed woven reed panels). All remain visibly closed. The assignment table below selects every use; do not apply a random style at export. Material variation follows the construction, not a recolored clone. No scaling/mirroring. Upper floors and exact sill/head are in the cards. New model adds no collision.

Pilot: `ARCH_FRONTAGE_SPICE_STREET_WEST_STORY_1_WINDOW_01` (SH-L), within the complete Spice building task; finish the other two used constructions before their placements. Replace that window's generated reveal/frame/shutter/trim/sill and integral fixture pieces as a unit; keep wall infill around it, story band, massing and surrounding roof. Do not stack both windows or remove the containing wall. Dependencies: M02, existing texture provenance, design approval. Status **proposed**; eight total includes pilot.

<a id="asmb_screen_window"></a>
### ASMB_SCREEN_WINDOW · P-SCREEN

**Adapt** existing `window_screened` and `pushMashrabiyaScreen`; enclosed timber lattice with complete frame, head, sill, reveal, backing, hinges/closed service panel. Reference: R07 Dyers House and R08 construction study; existing Dyers Alley and Textile game images establish the unchanged mounting context. Canonical **1.00 W ×.24 D ×1.40 H m**; only same-size compatible modules, no stretch/mirror. Pivot center sill/wall plane, four rear mounting corners. Three backed constructions: **SC-D diamond lattice** for the two Dyers-house windows; **SC-V vertical slats** for three upper Textile windows; **SC-C fine crossed lattice** for the three Souk-west upper windows and one merchant-house court window. Nine uses total; exact membership below. No balcony projection, opaque backing behind lattice; max external envelope unchanged. Target ≤2,500 triangles/2 shared materials/1k maps.

Pilot: `ARCH_FRONTAGE_DYERS_ALLEY_WEST_N_BAY_WINDOW_S`; its mirror-position counterpart is a second placement of the same unmirrored model. Preserve original axes, sill and story binding; replace old complete screened-window visuals, not the wall. Dependencies: M02 and later approval of the complete BLD_DYERS_HOUSE study; B18 is the first building pilot. This screen study does not wait for P-WINDOW. Reuse its timber/frame craft in the later window families. Status **proposed**, nine total.

<a id="asmb_spice_counter"></a>
### ASMB_SPICE_COUNTER · P-SPICE

**Create** three distinct trade counters using common joinery, metalwork and installed source materials. Each is a complete authored assembly. Reference: west Spice Street's `GROUND_03` spice scale/bin composition plus the approved booth's grounded cabinet, stock layering, joints and physical folds. No speculative generic stall system.

Proposed maximum envelope **1.72 W ×.50 D ×1.70 H m**, with a .90 m serving top. These are design dimensions, not observed usable recess dimensions. Three named constructions have actual uses: **SP-D spice drawers** at GROUND_01: six small closed drawers, three inset spice bins, three metal tins and rear shelf; **SP-G grain balance** at GROUND_03: two larger closed cupboards, three low grain bins and one brass balance; **SP-A apothecary** at GROUND_04: a closed paneled cabinet and two shallow rear shelves carrying eight lidded ceramic/tin vessels. No speculative variants. Their stock and cabinet divisions differ, while hinges, wood sections and fit stay shared.

No awning/sign is bundled: each building's supported awning/sign remains assigned separately. Pivot base center at rear mounting plane, feet grounded, rear shelves fixed to the cabinet uprights. All contents stay inside the stated envelope. Compatible nominal shop module **2.4 ×1.35 ×2.7 m** only after M02 measures usable depth. No model stretching, clipping through walls or projecting into the body envelope. Target ≤12k triangles and ≤2 materials per finished counter; 1k shared PBR maps initially, 2k only when the close pilot shows a justified need.

Pilot: Spice west `GROUND_01`; following uses `GROUND_03` and `GROUND_04`, three total. Set the counter width center to the existing bay axis; rear mounting plane seats against the measured reveal back, base on its floor. Do not infer usable depth from the module's bounding box. Preserve `SPICE_W_SHOP_1` and all other original collision/bay anchors. `SPICE_W_SHOP_1` is not an instruction to keep the old visible stall.

Suppression: at 01 remove `PLACE_SPICE_STALLS` visual assembly. At 03 replace `PLACE_SPICE_LANDMARK_GOODS`, `PLACE_SPICE_LANDMARK_SACK_TALL` and `PLACE_SPICE_LANDMARK_BRASS_POT` visuals with the complete counter contents; keep `LMK_SPICE_DISTRICT` binding. At all three target bay prefixes suppress the old generated shop counter, counter legs/panels, stock, goods shelves/hanging stock and ground-spill props represented by the complete counter; retain the shop masonry, back/reveals, door access, sign and supported awning. Keep every collision source unchanged. Existing stock not within a target belongs to its original owner. Dependencies: M02 and asset/pilot approval; status **proposed**.

<a id="asmb_rug_display"></a>
### ASMB_RUG_DISPLAY · P-RUG

**Adapt** the existing arch kiosk and `ASSET_DYERS_HANGING_TEXTILES` craft into a complete fixed rug display. Reference: R03 Textile Arcade, R08 construction study and the approved booth's real rail, fastenings, weighted drape and layered folded cloth. It displays rugs, so do not import the full light-fabric booth into every arch.

Proposed canonical **1.80 W ×.32 D ×2.30 H m**; grounded closed chest .70 m high, folded rugs on top, a rear timber frame with two anchored uprights and top rail carrying two overlapping hanging rugs. Everything within that envelope; no loose floor rug. Two complete compositions: **RG-H hanging gallery**, two large rugs over a low folded-rug chest, used at Textile west01 and east03; **RG-R roll chest**, two horizontal roll shelves and a tied folded-stock compartment, used at Textile west03 and Rug west01. Both use indigo/rust textiles within the same measured outer envelope. Cabinet/rack form changes, not only tint. Pivot base center at rear mounting plane; rail ends anchor into supported rear frame/masonry, chest on floor. Compatible nominal arch 2.6 ×.42 ×3.55 and shop recess 2.4 ×1.35 ×2.7 only after measured usable inner profile/depth fits (M02). No model resizing; the shop and arcade share the display, not a stretched arch. ≤8k triangles/2 materials/1k maps.

Pilot: `FRONTAGE_TEXTILE_ARCADE_WEST` / `GROUND_01`. Remaining: same frontage `GROUND_03`; Textile east `GROUND_03`; Rug Gate west `GROUND_01`. Position on bay axis, base on the current inner display floor, rear on its actual backing. Retain existing frame, sealed back and supported external awning/sign. Suppress the old **interior** counter/stock/textile shelves/rolls/panel/rail/grille within the assigned bay only. For the shop target suppress generated furniture/stock under that bay prefix; retain the recess. The new chest and backing keep it visually closed, never route-like. No active floor prop placement is removed unless it duplicates the display and is explicitly listed in the building card. Dependencies: M02, arch repairs retained, pilot approval. Status **proposed**, four total.

<a id="asmb_dye_counter"></a>
### ASMB_DYE_COUNTER · P-DYE

**Create** a complete dry dye-sample seller, distinct from the textile booth and the wet-work stations. Reference: [Covered Souk elevation](references/covered-souk.png), [craft study](references/craft-and-trade.png), and the existing ceramic vessel / wall textile rack construction. Proposed envelope **1.80 W ×.35 D ×2.25 H m**; .90 m counter, two rear supported shelves with eight lidded sample jars, a timber rail at 1.85 m with six short indigo/madder test strips ending above 1.30 m, closed cabinet under the counter. Single **DY-S sample counter** construction, two placements. No open dye bath, spilling pigment or loose cloth at floor level.

Pivot at base center/rear mounting plane, fixed scale1; feet on the measured inner bay floor, rail and shelves supported by rear uprights. Existing bay awning and one assigned sign remain external, supported assemblies. Nominal 2.6 m arcade bay only; M02/M03 verify the actual inner arch/reveal and shade fit. Target ≤12k triangles, ≤2 shared PBR materials, 1k maps (2k only if a close pilot needs it). No new collision, mirroring or variant system.

**Pilot:** `FRONTAGE_COVERED_SOUK_EAST` / `GROUND_03`, preserve `DYE_E_SHOP_2`. **Second use:** `FRONTAGE_COVERED_SOUK_WEST` / `GROUND_01`, preserve `DYE_W_SHOP_1`. One assembly each, two total. Suppress old generated `covered_arcade_served_kiosk` counter/top/stock/textile shelves/rolls/panel/rail and `arcade_arch_complete_grille` within each target only. Retain repaired masonry, threshold, sealed backing, external awning, signs and original collision/bay anchors. No propagation until the complete Souk-east building pilot is approved. Status proposed.

<a id="asset_textile_booth"></a>
### ASSET_TEXTILE_BOOTH · P-BOOTH

**Reuse, do not rebuild.** `original_textile_booth`; source [textile_booth.blend](../../../assets/source/textile-booth/textile_booth.blend) and [build.py](../../../assets/source/textile-booth/build.py); exported [GLB](../../../apps/client/public/assets/models/environment/bazaar/props/textile_booth/textile_booth.glb). Source metres/+Z up/front -Y; exported +Y up/+Z front. Keep the actual source origin, scale1 and existing material. Export is a single primitive/material with **38,820 triangles**, **27,422 position vertices**, three packed **2048×1024** PBR images (albedo/normal/roughness). The manifest's “1k” variant label does not describe those actual atlas dimensions.

Observed GLB bounds: X=-1.34106..1.34000, up=0..3.63935, front=-.395..+.896 m. Registry rounds envelope to **2.683 W ×1.291 D ×3.64 H**. Ground datum0; origin is not the center of this asymmetric depth. Source fit assertions bound low geometry below2.5 m to |X|≤.93 and front≤.29; inspect the actual section and collision rather than treating that assertion as body-clearance approval. Wall ledger around3.58 m, front spar3.26, side-brace masonry seats near X=±1.19; all part of this finished booth. Width over the high awning is deliberately greater than the nominal2.6 m arch. Do not shrink it to the inner opening.

Single **approved-original** visual asset, no new color/stock variants, no mirroring or scaling. Existing wood dependency is CC0 Poly Haven wooden_table_02, MD5/source recorded in `props/models.json`; original woven cloth. The design reference URL recorded in the manifest is reference only, not a production texture. No external resources required.

| Batch position | Exact owner / frontage / bay | Placement decision | Status / dependencies |
|---|---|---|---|
| Existing pilot | BLD_DYERS_ARCADE_E / FRONTAGE_COVERED_SOUK_EAST / GROUND_02 | Retain PLACE_TEXTILE_BOOTH and DYE_E_TEXTILE_BOOTH exactly; do not recenter or re-export. | User-reported visual approval at this location only. Other verification is not inferred. |
| Target 1 | BLD_RUG_ARCADE_E / FRONTAGE_TEXTILE_ARCADE_EAST / GROUND_01 | Reuse one booth; preserve TEXTILE_E_SHOP_1 and its servedBayId. Southern light-fabric bay under same-size arch. | Proposed; placement approval, M02/M03 and per-location verification. |

**Quantity: two total = one retained + one proposed.** Souk east GROUND_03 now receives ASMB_DYE_COUNTER; the two neighboring shops must not be booth clones. No booth at Spice shops, tea house, workshop, courtyard stall, gatekeeper, rug-only west arcades or connector. Trade/height/depth mismatch does not justify a variant.

Deterministic placement rule for the one new candidate: use the existing bay axis and floor; preserve model unit scale; reproduce the approved pilot's **booth-to-wall** orientation/offset, not its world coordinates. The current east-facing-wall pilot uses frontage anchor inset .265 m and yawOffsetDeg180. The candidate is an east zone wall, so this same orientation is the starting fit, subject to M02. Keep the existing gameplay shop anchor; add only a visual booth binding if the current integration requires one. Do not move the old anchor or recycle its ID for a different collision role. Final small mounting tolerance follows the measured wall/threshold; if it cannot fit, the placement stays proposed and is surfaced, not forced.

**Replacement contract (each new target):** match the current pilot's bounded suppression in `v3Architecture.ts` and its existing test. Under that target bay prefix suppress module `covered_arcade_served_kiosk` (counter/top, kiosk stock, textile shelves/rolls/hanging panel/rail), semantic `arcade_arch_complete_grille` (posts/rails), and that bay's generated supported-awning assembly. Retain semantic `arcade_arch`, `screened_arch_interior`, `screened_arch_threshold`, `arcade_arch_masonry_return`, reveal bases/capitals, backing/spandrel, surrounding massing and signs. Do not suppress neighboring bays or `CANOPY_DYERS_01` / `CANOPY_TEXTILE_01`. The existing pilot is selected by a single hard-coded bay exception; copying the model alone will leave duplicated furniture. Extend only the explicitly approved selection during that future task, with one matching suppression check per approved bay. Do not generalize all arches into booths.

## Selected construction variants

These are design assignments, not new live config. One finished model per named construction; all unlisted transforms remain source-owned. This table replaces the first draft's one-variant-per-family rule.

| Variant | Exact intended placements | Qty |
|---|---|---:|
| SH-L louvered teal | Spice west STORY_1_WINDOW_01/03; Tea east STORY_1_WINDOW_01 | 3 |
| SH-P paneled walnut | Spice west STORY_1_WINDOW_02/05; Rug west STORY_1_WINDOW_01 | 3 |
| SH-W woven infill | Spice west STORY_1_WINDOW_04; Tea east STORY_1_WINDOW_02 | 2 |
| SC-D diamond lattice | Dyers Alley west-north BAY_WINDOW_S/N | 2 |
| SC-V vertical slats | Textile west STORY_1_WINDOW_01/03/04 | 3 |
| SC-C fine crossed lattice | Souk west STORY_1_WINDOW_01/02; Souk west-north STORY_1_WINDOW_01; Fountain east-north STORY_1_WINDOW_01 | 4 |
| SP-D spice drawers | Spice west GROUND_01 | 1 |
| SP-G grain balance | Spice west GROUND_03 | 1 |
| SP-A apothecary | Spice west GROUND_04 | 1 |
| RG-H hanging gallery | Textile west GROUND_01; Textile east GROUND_03 | 2 |
| RG-R roll chest | Textile west GROUND_03; Rug west GROUND_01 | 2 |
| DY-S sample counter | Souk east GROUND_03; Souk west GROUND_01 | 2 |
| Original approved textile booth | Souk east GROUND_02 retained; Textile east GROUND_01 proposed | 2 |

Eight shuttered windows, nine screens, three spice counters, four rug displays, two dye counters and two textile booths. These variations have assigned uses now. The design vocabulary can be crafted in Blender from shared components, but entire buildings must not become repeated exports. Doors, upper openings, wall phases, signs, shop uses and blank intervals establish ownership at building scale.

## Shared components and retained assembly families

These stable module IDs remain the smallest component kit. Sizes are **observed** width ×depth ×height in metres. Retain their existing pivot, backed closure, wall attachment, material slots, geometry and collision behavior. The selected construction variants above apply to their named assets; retained modules gain no random variants. A changed module in a card is a visual replacement at that bay with the old visual assembly suppressed; surrounding massing and collision remain. Counts include the explicitly proposed Dogleg composition but exclude integral ornament inside retained large kits.

| Component | Size | Total planned / construction decision | Pilot or representative location |
|---|---|---|---|
| shop_recess_market | 2.4×1.35×2.7 | 5 recesses; retain complete shell, head/jambs/back and grounded reveal. Goods are assigned separately. | Spice west GROUND_01 |
| door_shop_timber | 1.15×.22×2.7 | 5 closed timber doors; preserve head and jamb seating, threshold and hardware. | Rug merchant GROUND_02 conversion |
| door_residential_timber | 1.05×.20×2.25 | 10 closed doors, including one Dogleg center door; no swung leaf in route. | Dyers house BAY_DOOR |
| door_storage_heavy | 1.35×.25×2.5 | 3 closed storage/work doors; full-width lintel and heavy hinges. | Caravan BAY_DOOR_S |
| door_fortified_gate / ASSET_CC0_LARGE_CASTLE_DOOR | 2.012×.339×2.965 | 1 Hammam main entry; existing CC0 model, backed/closed, no new collision opening. | North Court west GROUND_01 |
| window_dark_recess | .90×.28×1.25 | 16 framed closed dark windows, including five Dogleg windows. Retain complete sill and grille/backing; never a flat black route hole. | North house BAY_WINDOW_S |
| window_landmark_stained | 1.2×.25×1.75 | 1 restrained stained clerestory; retain existing frame/glass/backing. | Madrasa main STORY_1_WINDOW_01 |
| vent_service | .58×.18×.48 | 7 vents, including two Dogleg west, B21 loft and B18 roof room; retain grille, deep closed shadow/backing and head. | DYE_WORKS BAY_VENT_AXIS |
| arch_arcade | 2.6×.42×3.55 | 10 repaired sealed display arches; retain masonry, spring/jambs/spandrel/backing/threshold. Stock is booth, rug display, or existing kiosk as assigned. | Approved Souk east GROUND_02 |
| arch_hero_courtyard | 4.2×.50×4.85 | 2 repaired backed civic/loggia arches; keep shape and sightlines, no new passage. | Fountain west GROUND_01 |
| column_arcade | .42×.42×3.55 | 2 grounded full-height columns in Textile west/east GROUND_02. | Textile west GROUND_02 |
| pilaster_facade | .42×.24×3.4 | 1 grounded pilaster, Gatekeeper south return; do not shorten. | RUG_GATE_EAST_SOUTH BAY_01 |
| blind_niche | 1.05×.18×1.8 | 30 high/quiet blind panels at scheduled datums. Back wall stays opaque; not a door. | LINK_NORTH_WEST BAY_NICHE_AXIS |

Use current `wallDetailFamilies/arches.ts`, `windows.ts`, `doors.ts`, `shops.ts`, `structuralTrims.ts` and their `v3Architecture.ts` callers as the source reference. No new budgets for unchanged modules. If a retained component must be adapted to meet a named defect, use the window target (≤2.5k triangles/≤2 slots/shared1k) for ordinary fixtures; preserve the higher existing requirement of hero arches. Do not auto-rebuild them in this batch.

<a id="asmb_wall_finish"></a>
### ASMB_WALL_FINISH

**Reuse** existing wall materials, shell/infill, plinth/contact strip, story band, corner arris and coping as one treatment assembly. Representative retained finish: BLD_LINK_WALL_NE (one niche, empty lower field). B18 is the first complete-building pilot. Reference: existing repaired north-west link and daylight stone/plaster in cs2_daylight_ref_1. Canonical length/height/depth are each existing wall's dimensions, not a new resizable model. Retain existing segment clipping; wall/roof corners share owner materials. No added window, balcony or sign. Contact wear follows the actual wall base; a proposed .25 m wide, max .45 m tall **flush** stain at the downstream end of an existing drain/contact joint is allowed only in service/dye cards. No fictitious spout or projected pipe without real roof drainage. Where no drain exists, use base dampness at the joint and no new outlet.

For each existing exposed face: one quiet field, existing grounded base, existing coping, existing story band if present; return these only around solid corners. Keep existing heights, cross-sections and material slots; do not stack new trim over old. No new triangles for material-only finishing, no new texture/material slot (reuse existing tile/wear maps). No independent “random damage” variant. All meaningful residual surfaces are assigned this treatment in buildings, including blank faces and city boundary.

<a id="asmb_ground_finish"></a>
### ASMB_GROUND_FINISH

**Reuse** existing floor materials, floor wear/sand/debris systems and authored surface profiles. Exactly 25 zone schedules, one per P card. Canonical footprint and grade come from `traversal_surfaces`; identity scale, no displacement or new curb. Pilot LINK_EAST_MID for flush material transitions; stair/ramp exceptions use their exact existing grade and tread count. Retain cover/contact wear beneath current props; no new floating rugs or raised drain grates. Ground dirt stays visually flat at edges without building a body-intersecting mound. Match existing texture world scale; no new shader, atlas or geometry. Suppress only duplicated finish on a shared border, never either supporting traversal surface. No new variants.

### Existing bay awnings and packing kiosks

**Reuse** `pushSupportedAwning` and the existing shop/arch constructions; finish their existing ledger, rafter, diagonal brace and hem instead of inventing an awning kit. Exactly **13 retained independent bay awnings**: Spice west01/03/04 (3), Textile west01/03/04 (3), Textile east03/04 (2), Rug west01 (1), Tea east01 (1), Souk west01 (1), Souk east01/03 (2). The two booth awnings are integral to P-BOOTH and counted there; integral landmark-kit covers remain part of their retained kits. Exact span/head comes from that bay's existing renderer; no stretch of the booth awning. Existing packing kiosks are retained in Textile west04/east04 and Souk east01; three retained packing assemblies total; Souk west01 is replaced by ASMB_DYE_COUNTER. Their counters are grounded, stock/rack backs stay inside the recess, sealed packing backing implies off-map access, with no additional modeled service door. Keep deterministic current selection, no new prop assortment. No new geometry budget or texture variants for retention.

## Exact bay batches

The lists below are membership assignments, not copies of transforms. Read positions/datums in the linked building card and the construction variant table above; quantity is one at each listed suffix.

### ASMB_SHUTTER_WINDOW membership

| Owner / frontage | Bay suffixes | Quantity |
|---|---|---:|
| [BLD_SPICE_ROW_W](buildings.md#bld_spice_row_w) / `FRONTAGE_SPICE_STREET_WEST` | `STORY_1_WINDOW_01`, `STORY_1_WINDOW_02`, `STORY_1_WINDOW_03`, `STORY_1_WINDOW_04`, `STORY_1_WINDOW_05` | 5 |
| [BLD_RUG_MERCHANT](buildings.md#bld_rug_merchant) / `FRONTAGE_RUG_GATE_WEST` | `STORY_1_WINDOW_01` | 1 |
| [BLD_TEA_HOUSE](buildings.md#bld_tea_house) / `FRONTAGE_TEA_TERRACE_EAST` | `STORY_1_WINDOW_01`, `STORY_1_WINDOW_02` | 2 |

### ASMB_SCREEN_WINDOW membership

| Owner / frontage | Bay suffixes | Quantity |
|---|---|---:|
| [BLD_MERCHANT_HOUSE](buildings.md#bld_merchant_house) / `FRONTAGE_FOUNTAIN_COURT_EAST_NORTH` | `STORY_1_WINDOW_01` | 1 |
| [BLD_RUG_ARCADE_W](buildings.md#bld_rug_arcade_w) / `FRONTAGE_TEXTILE_ARCADE_WEST` | `STORY_1_WINDOW_01`, `STORY_1_WINDOW_03`, `STORY_1_WINDOW_04` | 3 |
| [BLD_DYERS_ARCADE_W](buildings.md#bld_dyers_arcade_w) / `FRONTAGE_COVERED_SOUK_WEST` | `STORY_1_WINDOW_01`, `STORY_1_WINDOW_02` | 2 |
| [BLD_DYERS_ARCADE_W](buildings.md#bld_dyers_arcade_w) / `FRONTAGE_COVERED_SOUK_WEST_NORTH` | `STORY_1_WINDOW_01` | 1 |
| [BLD_DYERS_HOUSE](buildings.md#bld_dyers_house) / `FRONTAGE_DYERS_ALLEY_WEST_N` | `BAY_WINDOW_S`, `BAY_WINDOW_N` | 2 |

### Component placement membership

All other component instances are exactly the ordered rows bearing that component ID in the 38 frontage schedules, plus the explicitly enumerated Dogleg east/west code-owned rows. No other placement is authorized. This single deterministic membership rule avoids copying the same bay transforms into two files. A “retain” return/roof is a complete existing assembly; minor trim is not counted as separate assets.

## Existing registry retention and changes

The following table covers all 36 current asset-registry IDs. **Current quantity** counts active `dressing_placements[].anchorIds`, not dormant anchors or procedural submeshes. **Selected assignment** is exact: retain all those source placement/anchor pairs unless the stated bounded replacement applies. Their location and dimensions are already authoritative in the live spec. `ASSET_CC0_LARGE_CASTLE_DOOR` also supplies the one scheduled facade door; zero current dressing instances does not mean an unused library model.

For each retained asset: use its registry canonical dimensions/transform/mounts, current model/geometry/materials/textures and collision class. Compatible fit range is **its current placements at current transforms only**; no new scale/mirror variant, pilot or propagation is implied. These groups are reuse assignments, not a production request. The representative location is the first current anchor shown. Dependencies are the existing source/CC0 manifest plus the owning building/public-space card. Retained geometry/material/texture budget is the current implementation with no planned increase; performance review still applies when that owner is worked on.

| Asset ID | Current quantity | Exact placement membership / selected assignment | Representative anchor |
|---|---:|---|---|
| `ASSET_CARAVAN_LOAD_CRATE` | 3 | Retain all active members unchanged. Membership: `PLACE_CARAVAN_LOAD_SOUTH`, `PLACE_CARAVAN_LOAD_NORTH`, `PLACE_CARAVAN_LOAD_TOP`. | `LMK_CARAVAN_DISTRICT` |
| `ASSET_CC0_BARREL` | 1 | Retain all active members unchanged. Membership: `PLACE_SPICE_BARREL`. | `COVER_SPICE_01` |
| `ASSET_CC0_BASKET` | 6 | Retain all active members unchanged. Membership: `PLACE_SPICE_BASKET`, `PLACE_SPICE_E_STOCK_BASKET_MID`, `PLACE_SPICE_E_STOCK_BASKET_NORTH`, `PLACE_B7_FOUNTAIN_MARKET_BASKET`, `PLACE_L34_SERVICE_SOUTH_BASKET`, `PLACE_L34_COVERED_SOUK_BASKET`. | `COVER_SPICE_01` |
| `ASSET_CC0_BRASS_POT` | 2 | Suppress PLACE_SPICE_LANDMARK_BRASS_POT visual in P-SPICE; retain1 east-stock pot. New counter contents are integral. Membership: `PLACE_SPICE_LANDMARK_BRASS_POT`, `PLACE_SPICE_E_STOCK_BRASS_POT`. | `LMK_SPICE_DISTRICT` |
| `ASSET_CC0_LANTERN` | 6 | Retain all active members unchanged. Membership: `PLACE_SPICE_LANTERN`, `PLACE_FOUNTAIN_LANTERN`, `PLACE_TEXTILE_LANTERN`, `PLACE_RUG_LANTERN`, `PLACE_TEA_LANTERN`, `PLACE_DYERS_LANTERN`. | `LANTERN_SPICE_01` |
| `ASSET_CC0_LARGE_CASTLE_DOOR` | 0 | One proposed facade use at Hammam main GROUND_01, not a dressing placement. Membership: facade module only. | `FRONTAGE_NORTH_COURT_WEST` |
| `ASSET_CC0_POTTERY` | 5 | Retain all active members unchanged. Membership: `PLACE_SPICE_POTTERY`, `PLACE_SPICE_E_STOCK_POTTERY_SOUTH`, `PLACE_SPICE_E_STOCK_POTTERY_NORTH`, `PLACE_B7_FOUNTAIN_MARKET_POT`, `PLACE_L34_SERVICE_SOUTH_POTTERY`. | `COVER_SPICE_01` |
| `ASSET_CC0_SPICE_SACK` | 2 | Suppress PLACE_SPICE_LANDMARK_SACK_TALL visual in P-SPICE; retain1 east-stock sack. New counter contents are integral. Membership: `PLACE_SPICE_LANDMARK_SACK_TALL`, `PLACE_SPICE_E_STOCK_SACK`. | `LMK_SPICE_DISTRICT` |
| `ASSET_CC0_TEA_STOOL` | 5 | Retain all active members unchanged. Membership: `PLACE_TEA_STOOL_WEST_SOUTH`, `PLACE_TEA_STOOL_WEST_NORTH`, `PLACE_TEA_STOOL_EAST`, `PLACE_B7_FOUNTAIN_TEA_STOOL_A`, `PLACE_B7_FOUNTAIN_TEA_STOOL_B`. | `LMK_TEA_TERRACE_01` |
| `ASSET_CC0_TEA_TABLE` | 2 | Retain all active members unchanged. Membership: `PLACE_TEA_TABLE`, `PLACE_B7_FOUNTAIN_TEA_TABLE`. | `LMK_TEA_TERRACE_01` |
| `ASSET_CLOTH_CANOPY` | 6 | Retain all active members unchanged. Membership: `PLACE_SPICE_CANOPIES`, `PLACE_TEXTILE_CANOPY`, `PLACE_DYERS_CANOPY`, `PLACE_CARAVAN_LOAD_SHADE`, `PLACE_TEA_TERRACE_SHADE`. | `CANOPY_SPICE_01` |
| `ASSET_COURT_PLANTER` | 3 | Retain all active members unchanged. Membership: `PLACE_B7_FOUNTAIN_PLANTERS`, `PLACE_L34_NORTH_PLANTER_EAST`. | `B7_FOUNTAIN_PLANTER_WEST` |
| `ASSET_COVER_GOODS` | 8 | Retain all active members unchanged. Membership: `PLACE_SPICE_COVER_CORE`, `PLACE_FOUNTAIN_COVER`, `PLACE_TEXTILE_COVER`, `PLACE_RUG_COVER`, `PLACE_CARAVAN_COVER`, `PLACE_TEA_COVER`, `PLACE_DYERS_COVER`, `PLACE_NORTH_COVER`. | `COVER_SPICE_01` |
| `ASSET_DECORATIVE_CRATE` | 4 | Retain all active members unchanged. Membership: `PLACE_SPICE_E_STOCK_CRATE_BASE`, `PLACE_SPICE_E_STOCK_CRATE_STACK`, `PLACE_SPICE_E_STOCK_CRATE_MID`, `PLACE_B7_FOUNTAIN_MARKET_CRATE`. | `SPICE_E_WALLBASE_STOCK_01` |
| `ASSET_DYERS_CERAMIC_VESSEL` | 6 | Retain all active members unchanged. Membership: `PLACE_DYERS_CERAMIC_VESSEL`, `PLACE_L3R0_NORTH_VESSEL`, `PLACE_B4_SOUK_PROCESS_VESSEL`, `PLACE_L34_DYERS_ALLEY_POTTERY`, `PLACE_DYERS_E_RACK_VESSEL`. | `LMK_DYERS_DISTRICT` |
| `ASSET_DYERS_HANGING_TEXTILES` | 6 | Retain all active members unchanged. Membership: `PLACE_L3R0_NORTH_DYERS_WALL_RACK`, `PLACE_L34_DOGLEG_WALL_RACK`, `PLACE_DYERS_E_RACK_CLOTH`. | `L3R0_NORTH_DYERS_BAY_01` |
| `ASSET_DYERS_SEALED_VAT` | 7 | Retain all active members unchanged. Membership: `PLACE_DYERS_VAT_WEST`, `PLACE_DYERS_VAT_EAST`, `PLACE_L3R0_NORTH_VAT_WEST`, `PLACE_L3R0_NORTH_VAT_EAST`, `PLACE_L34_DOGLEG_VAT`, `PLACE_L34_DOGLEG_VAT_02`, `PLACE_DYERS_E_RACK_VAT`. | `LMK_DYERS_DISTRICT` |
| `ASSET_TEXTILE_BOOTH` | 1 | P-BOOTH: retain1 + proposed1 =2 total. Membership: `PLACE_TEXTILE_BOOTH`. | `DYE_E_TEXTILE_BOOTH` |
| `ASSET_DYERS_WORKSTATION` | 4 | Retain all active members unchanged. Membership: `PLACE_L34_DYERS_ALLEY_VATS`, `PLACE_L34_DOGLEG_WORKSTATION`, `PLACE_L34_NORTH_WORKSTATION_02`. | `L34_DYERS_ALLEY_VAT_01` |
| `ASSET_FOUNTAIN` | 1 | Retain all active members unchanged. Membership: `PLACE_FOUNTAIN`. | `LMK_FOUNTAIN_01` |
| `ASSET_GROUND_RUG` | 5 | Retain all active members unchanged. Membership: `PLACE_B4_SPICE_COVER_RUG`, `PLACE_L3R0_NORTH_RUG`, `PLACE_B4_FOUNTAIN_RUG`, `PLACE_BPL19_FOUNTAIN_MARKET_RUG`. | `COVER_SPICE_01` |
| `ASSET_HERO_ARCH` | 1 | Retain all active members unchanged. Membership: `PLACE_RUG_ARCH`. | `LMK_RUG_GATE_01` |
| `ASSET_LAUNDRY_LINE` | 8 | Retain all active members unchanged. Membership: `PLACE_B6_SPICE_LAUNDRY`, `PLACE_B6_TEXTILE_LAUNDRY`, `PLACE_L3R0_NORTH_DYERS_LINE`, `PLACE_L34_CARAVAN_PACK_LINE`, `PLACE_L34_DOGLEG_DYERS_LINE`. | `B6_LAUNDRY_SPICE_01` |
| `ASSET_MARKET_CART` | 4 | Retain all active members unchanged. Membership: `PLACE_B4_SPICE_CART`, `PLACE_B4_TEXTILE_CART`, `PLACE_B4_SOUK_CART`, `PLACE_L34_CARAVAN_CART`. | `B4_SPICE_E_CART_GROUND_01` |
| `ASSET_MARKET_STALL` | 4 | Suppress PLACE_SPICE_STALLS visible stand in P-SPICE; retain3: PLACE_BPL19_FOUNTAIN_MARKET_STALL, PLACE_L3R0_NORTH_STALL, PLACE_L34_TEA_STALL. Membership: `PLACE_SPICE_STALLS`, `PLACE_L3R0_NORTH_STALL`, `PLACE_BPL19_FOUNTAIN_MARKET_STALL`, `PLACE_L34_TEA_STALL`. | `SPICE_W_SHOP_1` |
| `ASSET_PALM` | 2 | Retain all active members unchanged. Membership: `PLACE_FOUNTAIN_PALM`, `PLACE_NORTH_PALM`. | `PALM_FOUNTAIN_01` |
| `ASSET_SIGNBOARD` | 14 | Retain11 of14: suppress RUG_W_SIGN_2, TEA_E_SIGN_2 and DYE_W_SIGN_2 members only; add1 at existing SPICE_W_SIGN_3 =12 standalone signs. Suppress duplicate auto bay signs wherever a standalone sign is assigned; retain only the existing auto sign at Souk east GROUND_01, plus integral landmark-kit inscriptions. No other generated sign is added to a quiet face. Membership: `PLACE_SPICE_SIGNS`, `PLACE_TEXTILE_SIGNS`, `PLACE_RUG_SIGNS`, `PLACE_TEA_SIGNS`, `PLACE_DYERS_SIGNS`, `PLACE_L3R0_NORTH_EXIT_SIGN`, `PLACE_TEA_RAMP_SIGNS`. | `SPICE_W_SIGN_1` |
| `ASSET_SPAWN_A_EAST_DYE_WORKS` | 1 | Retain all active members unchanged. Membership: `PLACE_SPAWN_A_EAST_WORKS`. | `LMK_SPAWN_A_EAST_WORKS_01` |
| `ASSET_SPAWN_A_EXIT_EAST_RETURN` | 1 | Retain all active members unchanged. Membership: `PLACE_SPAWN_A_EXIT_EAST`. | `LMK_SPAWN_A_EXIT_EAST_01` |
| `ASSET_SPAWN_A_EXIT_WEST_RETURN` | 1 | Retain all active members unchanged. Membership: `PLACE_SPAWN_A_EXIT_WEST`. | `LMK_SPAWN_A_EXIT_WEST_01` |
| `ASSET_SPAWN_A_GATE` | 1 | Retain all active members unchanged. Membership: `PLACE_SPAWN_A_GATE`. | `LMK_SPAWN_A_GATE_01` |
| `ASSET_SPAWN_A_WEST_BACKS` | 1 | Retain all active members unchanged. Membership: `PLACE_SPAWN_A_WEST_BACKS`. | `LMK_SPAWN_A_WEST_BACKS_01` |
| `ASSET_SPAWN_COVER` | 2 | Retain all active members unchanged. Membership: `PLACE_SPAWN_A_COVER`, `PLACE_SPAWN_B_COVER`. | `SPAWN_A_COVER_01` |
| `ASSET_SPICE_GATE` | 1 | Retain all active members unchanged. Membership: `PLACE_SPICE_GATE`. | `LMK_SPICE_GATE_01` |
| `ASSET_SPICE_GOODS` | 2 | Suppress PLACE_SPICE_LANDMARK_GOODS in P-SPICE; retain the east wall stock instance. Counter contents replace the west display. Membership: `PLACE_SPICE_LANDMARK_GOODS`, `PLACE_SPICE_E_STOCK_BINS`. | `LMK_SPICE_DISTRICT` |
| `ASSET_TEA_SERVICE` | 1 | Retain all active members unchanged. Membership: `PLACE_TEA_SERVICE`. | `LMK_TEA_TERRACE_01` |

## Shared overhead assignments

**Six canopy spans:** CANOPY_SPICE_01/02 (2), CANOPY_TEXTILE_01 (1), CANOPY_DYERS_01 (1), CARAVAN_LOAD_SHADE_01 (1), TEA_TERRACE_SHADE_01 (1). **Eight laundry/drying lines:** B6_LAUNDRY_SPICE_01/02/03 (3), B6_LAUNDRY_TEXTILE_01/02 (2), L3R0_NORTH_DYERS_LINE_01 (1), L34_CARAVAN_PACK_LINE_01 (1), L34_DOGLEG_DYERS_LINE_01 (1). All are OWN_OVERHEAD-owned. Membership stays fixed; endpoints are baseline measurements, with the finite support/repositioning proposals below.

Purpose and variants are already placed: warm/cream shade on Spice, light cover in Textile, blue-green cover in Dyers, plain work shade in Caravan/Tea; existing cloth pieces stay assigned to their anchor's deterministic variant. No extra variants. The registry's 4×8 canopy and 1.4×8 line are nominal, not usable mounting spans: anchor endpoints determine length and endpoint heights, and `width_m` determines the cloth strip. Adapt those existing assemblies only to resolve measured attachments, recording any endpoint/silhouette revision as M/L; never rescale an unrelated finished cloth model across arbitrary streets.

Pilot for support finishing: CANOPY_SPICE_01; measure both end supports, then review opposite side and below before touching the other five. M03 chooses between an actual supported bracket and the stated lower-tie alternative; no unsupported endpoint is retained by default. Preserve existing material slots and draw budgets; no new texture or variant. No low ropes or unsupported poles. Door/window/head clearance and overhead sightlines apply to every hem and brace, not only the endpoints.

## Unique landmarks and building compositions

No new unique landmark is requested. Retain the fountain, Spice Gate, Rug Gate, Bab al-Suq, Spawn-A works/back-house kits and North Vista. Their canonical bounds, exact source/anchor assignment and all visible faces are in O/P cards. Existing asset-registry/model provenance and source functions own their construction. No scaling, mirrors, duplicates or replacement “hero variants.” The three Spawn-A back parcels and both corner returns reuse their existing integral windows; those are not extra members of the new window batches.

A building composition is its ordered bays, shared finishes and assigned complete assemblies. It is not a new export of the entire street. Approve and finish B18 as a complete building, using the explicit component exports below and its retained repaired masonry. A component-only swap is not pilot completion. Repeated parts belong to different uses through counts, spacing, height, quiet intervals and materials, not a new asset for every facade.

## Bounded suppression summary

| Replacement | Old visible assembly to suppress | Always retain |
|---|---|---|
| Window asset | Old frame, reveal trim, sill, closure/screen and integral fixture under the exact bay prefix | Surrounding wall infill, story band, massing, opening binding and collision |
| Spice counter | Named active stand/stock placements plus old generated counter/stock inside target recess | Masonry, reveal/back, supported awning, authorized sign, every anchor/collider |
| Rug display | Generated kiosk counter/top/stock, textile shelves/rolls/panel/rail/grille at target; shop stock equivalent at Rug Gate | Arch/recess frame, sealed backing/threshold, supported awning and one assigned sign |
| New textile booth | Exact P-BOOTH furniture, grille and bay-awning selectors | Repaired arch frame/returns/bases/capitals, sealed interior/threshold, massing, anchors, overhead street canopy |
| Quiet return or rear face | Only named conflicting or unsupported generic details on that owner; retain useful inhabited side/rear evidence | Shell, grounded base, structural piers, roof/coping, other named public faces, collision |
| Door conversion | Original shop furniture and stock, shop-only awning/sign, replaced old visual opening trim | Bay/anchor identity, shell, unchanged collision; new complete closed door fits its scheduled envelope |
| Spawn-A return kit | Support-frontage blind-niche visuals hidden by the existing kit | Support wall/massing, both current complete return kits, all bindings |
| Dogleg composition | Repeated boundary-bay windows/panels at named code target, excluding retained west gate | Identity plane, contact/story courses, repaired gate and roof, structural geometry and active edge clusters |

Source selectors are precise enough to locate the affected assembly; final child mesh names are verified against the current code during the authorized task. No blanket `ARCH_FRONTAGE_*` deletion, unbound anchor, spec rollback, or generic neighbor suppression. A replaced nonvisual collision source remains active without changing its shape; review that the new visible asset still represents it plausibly. If it does not, the fit is incompatible and must be surfaced.

## Revision 3 finite support assignments

These are proposed construction relationships, not measured fixing capacity. Reuse existing shade meshes and materials after M03 records the real wall/beam, fixings and minimum hem. No new cloth family or route pole. Drawings show the support section; actual member sizes remain subject to mounting and visual review.

| Existing span / endpoints | Proposed support decision | Remaining M03 check |
|---|---|---|
| CANOPY_SPICE_01/02: east z5.55 at y20.5808/26.4776 | West ledgers stay on S1 solid wall above5.33 window heads. East ties seat on wall-backed roof brackets, not on an isolated skyline cap. Proposed east bracket at each endpoint:0.14 m square timber upright on a transverse roof beam x33.45..36.75; outer tie reaches x33, maximum0.55 m beyond upright x33.55; diagonal knee returns to roof beam at x34.5. | Real wall/parapet seating, roof beam bearing, hem versus shop/windows. Proposed support is M where silhouette/shadow changes. If unsupported, compare east tie lowered to4.35 on solid wall, with revised sag; do not silently adopt it. |
| B6_LAUNDRY_SPICE_01/02/03: east z5.90/5.95/6.10 at y18.1616/23.7560/28.7456 | Same wall-backed roof construction at those exact y values, upright top endpoint+0.14. Northern endpoint may instead tie back to S1 end-room wall via the same supported bracket; the setback1.2 m is not an invisible rope attachment. Keep western ties6.00/6.05/6.20. | Upright seating and lateral reach to the actual room/wall; compare lower4.35 east ties if roof support fails. Check line03 against the new room window at y28.1 and its full frame. |
| CANOPY_TEXTILE_01: z4.20 each end, y54.3872 | Retain ties to solid piers/wall; neither tie is assumed compatible merely because it is below the roof. | West upper sill4.15 and head5.55: inspect the whole line/cloth against openings and column, revise along locally only with a measured drawing. |
| B6_LAUNDRY_TEXTILE_01: east z6.10 at y51.6992; west6.20 | East wall-backed roof bracket, same0.14 member/0.55 maximum outward reach as Spice. Retain low east roof rather than growing a tower to catch a rope. | S2 west roof support and all opening overlaps; if unsupported test east tie4.35. |
| B6_LAUNDRY_TEXTILE_02: east4.90/west5.05 at y58.688 | East roof bracket seated on actual parapet/roof beam; west load lands in the shared Tea/Textile volume, not duplicate roofs. | Shared ownership M01 and both support seats; actual low hem. |
| CANOPY_DYERS_01: west4.40 at y45.36, east4.10 at y45.36 | Keep independent of booth awnings. East fixing is on the north arch spandrel/solid wall; west fixing belongs to the central block north wing. | Measure actual spandrel thickness and y-span of4.4 m cloth. Confirm no overlap with booth ledger3.58 or north sample awning. B18 roof room is not an excuse to reroute this tie. |
| CARAVAN_LOAD_SHADE_01: (4.2,46.6,4.50) to(13.8,46.6,4.32) | Retain only if both current edge supports exist at those endpoints. Diagram the bearing into store/yard masonry and keep ramp mouth free. | Full pier/beam envelopes and sag; if a support is absent, reposition to a measured existing wall seat and redraw the span before integration. No extra route pier. |
| TEA_TERRACE_SHADE_01: (11.6,62.4,5.75) to(18.4,62.4,5.65) | Keep y62.4, width1.9, outside E1 y58..61. West support must connect to retained north flank, east to Tea wall; do not suspend it from the removed slot. | Nominal southern cloth edge61.45 leaves0.45 m past the slot; measure actual skew/sag/fixture sweep and reach from x11.6 to the spine. Reposition within retained north flank if this fails. |
| L3R0_NORTH_DYERS_LINE_01 | Retain existing drying-work endpoints, clothes and variant; tie to the actual work-yard support, beyond north-link turning volume. | Record both xyz ends from source, rack footing and lowest garment; no assumption based on line name. |
| L34_CARAVAN_PACK_LINE_01 | Retain packing-yard endpoints and existing work purpose, separate from loading canopy. | Both xyz ends, bearing into yard/store structure, minimum cloth height and receiving-door clearance. |
| L34_DOGLEG_DYERS_LINE_01 | Retain workshop-to-dwelling line as use-based occupation; no new hanging stock over the turn. | Both xyz ends, code-boundary supporting volumes, vat/rack/jump sweeps and sightline readability. |

Measured endpoints for the last three lines remain source-owned; M03 must record their world positions on the chosen support sheet before dependent production. No supplied nominal height is a substitute for that measurement. All14 instances remain accounted for.

## B18 complete-building pilot: fit and export boundaries

Approval unit: **BLD_DYERS_ARCADE_E including exterior roof, ends and street attachments**. This is the first building after the README graybox decision. Work in local metres, no scale/mirror variants. Proposed export names below are handoff names, not new runtime IDs. Stable placement/served-bay IDs stay intact.

| Visual export / retained system | Origin and boundary | Visible replacement / exclusion |
|---|---|---|
| `b18-dye-counter.glb` (DY-S) | Base-center/rear mounting plane on GROUND_03, y44.82, exact depth offset from M02;1.80×0.35×2.25 | Replace only north kiosk counter/stock/rail/grille selectors in P-DYE. Retain north arch, threshold, backing, independent awning and sign. |
| `b18-packing-finish.glb` only if needed | GROUND_01 bay axis y35.18, base0, measured rear plane. Requested maximum1.80 W×0.45 D×1.80 H,0.90 counter | Complete the retained packing cabinet with closed lower stock and three tied cloth bolts, rear rail1.65. Reuse source geometry where it already satisfies the envelope; export only changed cabinet parts. Do not introduce a new family or generic variation. Retain its repaired arch and independent awning. |
| `b18-roof-access.glb` | Local origin at design(54.6,40.9,4.76); local x runs east, local y north, local z up before standard GLB conversion. Envelope1.80 east-west×3.80 north-south×2.59 high including cap | New broad roof-access room ending at7.35, with closed roof door and one rear vent per B18. Suppress only B18 roof-silhouette-head/cap/rear-tier/rear-cap. Keep slab, parapets, full-footprint coping and low service cluster. No duplicate roof slab under the room or open interior. |
| `b18-finish.glb` only for needed local repairs | Shell center at design(55.1,40,0); boundaries x53..57.2,y33.28..46.72, original4.5 wall. Reuse source materials | Only named wall/roof junction or supported attachment pieces after M02/M03. Retain runtime wall infill, corner piers, repaired arches, backings and collision. Material-only work needs no new mesh. Never replace the entire frontage because a finish is difficult to mask. |
| Original center booth | Retain actual `PLACE_TEXTILE_BOOTH` / `DYE_E_TEXTILE_BOOTH`, asset origin,1:1 orientation and material | No export, redesign, translation, scaling or suppression changes. Existing booth-specific exception remains. |
| Bay awnings01/03 and shared canopy | Retain existing source assemblies at measured support datums | No double covers, no canopy inside the booth export. Finish supports under those exact owners; no blanket awning suppression. |

**Whole-building section:** shell depth4.2 is measured; usable display depth is not. Requested counter setback/working diagram reserves0.80 m behind a0.35 m north counter within the closed building envelope, plus at least0.80 m service approach where a door is depicted. The runtime sealed backing remains opaque; model no room behind it. If measured recess depth cannot explain a behind-counter worker, classify that bay as a front-served locked sample display and keep the0.35 m cabinet, rather than asserting an impossible seller pocket. The0.90 m counter is not standing-height cover. M06 must reconcile the old stall collider before any visual replacement.

**Roof section:** room west wall x54.6 leaves approximately0.84 m between the existing street-side parapet's inner face (about53.76) and the room; roof access is non-playable. Its1.0×2.10 m closed roof door faces this strip. No stair mesh is exported; the schematic stair belongs inside the north stock room. Room walls are supported over the original building shell/structure, never over the street canopy. M02 verifies roof beam/bearing locations, not structural engineering certification. Existing rear boundary and neighboring context determine which rear faces need finishing; hidden surfaces get no duplicate mesh.

**B04/B17 future boundary:** for each separate wing, `ARCH_FRONTAGE_COVERED_SOUK_WEST_MASSING` or `...WEST_NORTH_MASSING` is the current lexicographic common backing/roof owner. Court/Souk face modules retain their own IDs. One physical-wing finish export may replace a named visible strip, but neither face may export another complete roof. LINK_EAST_MID x36..41/y39..44 stays empty above its whole body clearance. M01 verifies oblique junctions; it is not a new shared-shell repair request.

## Revision 3 component deltas and retained-system tests

The twelve named construction variants and their memberships remain unchanged. Additional architecture uses existing components: two `window_dark_recess` on the S1 east room; one `vent_service` on B21; one existing-type rear vent and one closed roof door on B18. These are owner-specific composition pieces, not new reusable families. B14 removes two tall storage-door visuals and three upper vents, replacing them with two wall-finish inspection panels; keep their source bindings. Thus the previous generic component counts are adjusted for these explicit changes, while the five new assembly-family totals stay8 shutters /9 screens /3 spice counters /4 rug displays /2 dye counters; booth count1 retained+1 proposed.

Retained systems are not automatically verified: M06 classifies cover/fountain and old stall collision; M05 checks wet-work vessels/racks, freight carts, seating and ground rugs through moving turns; M03 checks all cloth supports and lantern/sign attachments; M07 checks the12 proposed standalone signs against two-direction navigation, material scale and moving bots; M08 measures actual net draws/triangles/shadow cost. Keep installed small stock trade-specific at existing owners. No new downloads, instancing system or arbitrary variant library is requested.
