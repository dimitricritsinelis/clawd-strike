# Building and public-space schedule

**Revision 3 - all cards: proposed.** Implemented dimensions below are observed in the inspected source/compiled pair; treatments and explicitly changed axes are proposals. All heights are metres. Read [assets](assets.md) for complete assembly construction, suppression and fit contracts.

## Drawing-led review

Open [design-atlas.pdf](design-atlas.pdf) for the presentation: district references, dimensioned plans/elevations, blank-face treatments, sections, material/assembly studies and approval handoff. The SVG building sheets in `drawings/` are derived review drawings; this document owns proposed placement decisions, `assets.md` owns construction variants, and the live spec owns implemented state. No generated concept image is a measuring instrument.

**Revision 3 design judgment:** spatial sequence precedes asset production. S1/S2 propose broad roof profiles; E1/G1 are explicitly gameplay alternatives. B18 was the first complete-building study; no building is frozen or gated behind another, and each unit is judged against its target image. The common rules and individual revisions below replace the former blanket roof freeze and blank-face suppression. Source dimensions remain labeled observed.

## District intent

| District | Uses, palette and sequence | Busy / quiet / transition |
|---|---|---|
| DISTRICT_SPICE | Grain and dry-spice shops, wholesale storage, homes above; warm plaster, sandstone, brown wood, restrained teal shutters and cream/rust shade. | West counters are busy, low east stores quiet below one setback northern room. Spawn A's civic gate stays behind; Spice Gate announces the market. Keep the fountain glimpse between supported cloth layers; S1 supplies broad roof steps without narrowing the 6 m route. |
| DISTRICT_FOUNTAIN | Civic madrasa and merchant residence/loggia; pale cut stone, warm wash, blue tile only on the existing fountain/hero accent. | The fountain stays off-axis. Quiet lower civic walls frame the open court; activity sits at the existing south-west market edge and east tea table. Side links read as narrow service passages, not extra shops. |
| DISTRICT_TEXTILE | Rug dealers west, light cloth south-east, packing at northern bays; ochre west, lime east, muted indigo/rust textiles. | Paired arch axes make one street. Keep the overhead compression and the open northern view to Rug Gate; stock stays in reveals, blank piers keep each shop legible. |
| DISTRICT_RUG | Rug merchant, gatekeeper, northern receiving court; warm wash and stone, restrained blue gate accents. | One west display, closed east house. The existing gate is the arrival landmark; Spawn B and its backdrop are deliberately quiet. No second row of unrelated stalls. |
| DISTRICT_CARAVAN | Locked stores, receiving/loading yard, tea house above a service route; stone, warm brick wash, timber, unpatterned cream shade. | Cargo at the existing court edge; bare service spines. Retain the ramp/stair sequence and raised tea view. Tee intersections have quiet walls and continuous paving, never stock in the turning envelope. |
| DISTRICT_DYERS | Dye works, domestic infill, covered cloth retail, drying yard; ochre/warm wash, pale stone, indigo and muted cloth. | Wet work is edge-clustered in the south, cloth booths in the Souk, quiet residential dogleg, open northern drying court. Covered/open changes mark the sequence without extra gates. |

Use each frontage's existing profile slots listed on its card, except an explicit proposed finish below. Those stable material IDs are the default production assignment; the palette descriptions guide tuning, not replacement textures. Do not randomize colors per instance. Material variation at a wall seam follows its existing phase/repair; corners of one volume stay one family.

## Coordinate and face rules

- Design coordinates: x east, y north, z up, southwest origin; runtime vectors exchange design y/z. A zone's `west` face is its west edge, facing east into the route. Never derive facing from camera-left. Along `a` starts at the **low coordinate of the named frontage span** and increases west-to-east on north/south edges, south-to-north on east/west edges. Units are metres; `along=a/L` when authoring. World span endpoints below come from the source rectangle × start/end, not screenshot estimates.
- Every bay table is ordered by along, then height. S/H are sill/head above the local floor. Door/arch/shop sill is zero. On Tea Terrace add z=1.4 to every datum. Upper openings follow their scheduled datums; S1 east and B21 loft are the explicitly added rows. `ARCH_<F>_MASSING` owns the existing envelope and roof; a table's massing height is measured from its own floor. Do not raise it to fit a part.
- **Common face card:** retain the existing shell and structural piers unless a named M/G proposal below changes them. Public faces follow their bay schedules. Hidden party surfaces receive no duplicate mesh. Quiet enclosures retain zero new openings; visible inhabited returns retain useful existing backed screens, service windows and supported projections unless a named owner conflicts. Do not delete these profile-wide. The context/access schedule below distinguishes buildings, wings, screens and reliefs. No playable interior is implied.
- These return/rear dimensions are **determined**, not missing: each frontage massing is L × depth D × height H; its two perpendicular faces are D × H and opposite face L × H, reduced by existing occlusion and actual shell cutouts. Exposed party-wall portions above a lower neighbor remain blank and use the taller owner's material. Hidden shared surfaces receive no new mesh. Roof ownership follows the current shared-shell resolver, not one roof per frontage. The roof survey records slabs, parapets, bulkheads and silhouette heads separately. S1/S2, B18 and B21 replace only their named roof features. No random rooftop props.
- Face ownership precedence: named public/secondary face, then its physical building's side/rear, then public-space residual boundary. At the central merchant block the court and Souk frontages are opposite **public faces**, not blank rears. At Spawn A the return kits are corner fronts of their Spice owners. Retaining spines are enclosure/terrain screens, not fictitious housing. Keep stable IDs; these groupings do not merge runtime meshes.
- **Blank intervals:** on every scheduled face, the complement of the listed assembly widths is wall, with no added openings, signs or props. New or moved door/recess bays reserve at least 1.2 m of solid pier; non-opening trim/niches reserve at least 0.6 m. The retained end arches/recesses with 0.6 m end piers are explicit existing-composition exceptions: keep their openings and surrounding masonry, do not widen or move them. Per-face reservations below make these exceptions visible. All bay widths below use the asset definition; narrow door frames cannot consume a corner reservation. Keep current columns grounded; never hang a shortened pilaster to meet a window head.
- `ASMB_WALL_FINISH` supplies resolved blank fields, existing base/coping and contact/drainage treatment. This does not authorize adding continuous raised strips across route mouths. On body-adjacent walls new visual geometry must remain behind the existing reachable solid surface; a 0.28 m camera rule is not proof that the player's body cannot intersect it. The C asset batch preserves collision and sightlines; E1/G1 and measured overhead revisions are separate proposals.
- All existing active dressing placements are assigned exactly once: frontage-bound anchors belong to that face's building; other anchors belong to their `zone`. Shared canopy/line anchors belong to OWN_OVERHEAD. Landmark kits use their OWN cards. **Retain** the current placement unless a named replacement/suppression below applies. Dormant anchors are retained bindings, not new placements. No implied extra furniture from prose.

## Spatial design schedule

**S1 / Spice, class M.** Preserve x=21..33 street and all ground bays. West three parcel ranges in y are 15.44..21.56, 21.56..27.32 and 27.32..30.56; their proposed wall/roof-base tops are +7.60, +8.40 and +7.00. Ground-to-upper-room floor remains schematic at +3.12; existing window heads +5.33 remain human scale. Full parcel depth remains 4.8 m (x=16.2..21). Set back each roof slab 0.75 m; use the existing 0.26 slab, 0.75 parapet and 0.18 coping: absolute cap tops +8.79 / +9.59 / +8.19. Replace west seeded head, rear tier and small bulkhead with these broad roof steps; do not stack both systems. Parcel joints sit between bays (a=6.12 and 11.88), never through a frame. The two closed doors serve south and north households; the middle shop shares the south internal stair. Hidden access is explanatory only.

East retains the 4.5 m ground shell at x=33..37.2. A setback occupied end room spans x=34.2..37.2, y=24..30.56, roof base +7.00. Its cap is +7.71 (0.26 slab, 0.30 parapet, 0.15 coping). Two closed `window_dark_recess` modules face west on x=34.2 at y=25.8/28.1, sill +5.40/head +6.65, width 0.90. Interior stair is implied behind closed GROUND_04. Replace only east seeded head/rear tier; retain low roof/parapet outside the room. This breaks repeated high-west/low-east order without raising the entire street. Proposed room dimensions are design decisions, not permission to change the live massing profile globally.

**S2 / Textile, class M.** Preserve x=24..35 street and three arches plus the actual intervening column on each face. West y=49.28..56.8 retains roof base +7.00/cap +8.19. The northern shared Tea/Textile wing y=56.8..62.72 reads behind that front at roof base +8.40/cap +9.59, matching Tea's absolute base, not an added third storey. In the overlapping x=19..24 range, treat B05 and B12 as faces of one stepped physical volume; M01 must settle the common backing and visible roof strip because the different floor/roof datums do not qualify for the present equal-height shell merge. No independent whole-building export of either face. Remove B05's small head/rear tier/bulkhead only when this shared roof is approved; retain Tea beyond y=62.72 through65.2. East stays low at +4.50/cap +5.59; replace its narrow seeded head/rear tier with a quiet flat roof and measured tie supports. No added east windows. This is a distinct rhythm from S1. End views retain Rug Gate as the distant marker and open sky between cloth spans.

**E1 / Tea relationship, class G.** Trial an open-top slot **x=10..11, y=58..61** through the Service-North screen and any coincident western retaining/coping layers. Retain solid masonry below **z=2.50**; this is a **1.10 m parapet above the +1.40 platform**. The 0.96 m spine x=10..10.96 is measured; the 0.04 m gap to the platform is a junction to resolve in section, not a new floor. Match visible, projectile and LOS surfaces. Retain tall flanks outside y=58..61, with no lintel or high fixture spanning the slot. Remove the affected B15 seeded roof head/parts above the opening; never leave an invisible 7 m blocker. Keep Service's x=3..10 ground lane, Tea x=11..19, both end approaches and the existing center travel band. Existing west shade line y=62.4 is outside the slot; M03 verifies its actual support and hem beyond the slot's north edge.

Test eye positions (+3.10 standing, +2.70 crouched at Tea) from x=11.7/y=59.5 against a ground bot at x=6/y=59.5, eye +1.70. A simple straight ray clears the +2.50 cap standing but intersects it crouched; the actual gun rays, bot stance and collateral objects still require M06. Lower-lane crossfire discourages a permanent hold; ramp/stair pursuits force a choice to leave north or south. No one-way drop or player-only invisible guard is authorized. The 1.10 m guard is only about 0.09 m above the theoretical 1.008 m ballistic jump rise (6.35²/(2×20)); adjacent objects and collision stepping require M05 before acceptance.

**G1 / southern Textile turn, class G.** Conditional trial: solid masonry return **x=24..28, y=48..49, z=0..2.40** connected to the existing west cut edge. Remaining nominal passage **x=28..35 = 7 m**; retain at least 6 m through the entire diagonal body sweep. The first west arch starts around y=49.88; the 0.88 m nominal separation from this return is not a clearance pass. No display or stool in that pocket. From Fountain x=27/y=43 at eye +1.70 the northward x=27 ray now meets the return, while x=29.5 remains open. This is a partial offset and reload break, not a guaranteed hard dogleg. Keep the high Rug Gate crown visible above it. Test both bot pressure from Textile and the return's blind inside corner; reject if it only trades kiting for unavoidable close shots.

## Sequence and encounter relationships

| Route sequence, south to north | Foreground / middle / distance | Escape and bot counterplay / unresolved evidence |
|---|---|---|
| Spawn A 22 m court → Spice 12 m street → Fountain 16 m court | Gate/return craft; supported awnings and S1 staggered occupied parcels; off-axis fountain and civic arch | Retain main plus both side escapes. M06 measures initial threat and long retreat rays; no map shrink inferred from the 78 m spawn-center distance. |
| Fountain → Textile 11 m street → Rug 13 m threshold → Spawn B 22 m release | Off-axis fountain edge; G1 if retained and paired cloth layers; repaired Rug Gate and stepped receiving backdrop | Mid links are alternate escape choices before entering Textile. Bots can converge from either end; no extra east connector unless repeated trap evidence survives G1 evaluation. |
| Service South 7 m → Caravan 12 m → Service North 7 m / Tea 8 m branch | Quiet service wear; cart-handled receiving court and ramp; E1 offers one lateral contact before north-link exit | Tea's height becomes a choice between view/exposure and enclosed end approaches. The ground route remains an alternative, not a new room under a bridge. M05/M06 test recovery time, camping and two-sided pursuit. |
| Dyers Alley 7 m → Souk 12 m → Dogleg 7 m → North Court 12 m | Dense wet-work edge; three distinct dry trades and shared shade; residential turn and open drying court | Continuous x=46..53 alignment is not proven hard cover. M06 tests pressure through Souk mid link, Dogleg reversal and north mouths before any new east elevation. |

All widths above are zone footprints, not usable body clearances. Retain 6 m main / 4.5 m side / 4 m elevation / 3.5 m links, except the authored 4.5 m West Upper opening. Never fill the apparent surplus with non-colliding props. Shade compresses the view; courts release it. No overhead is declared bullet cover.

## Complete volume and access relationships

| Owners / classification | Physical relationship and design decision |
|---|---|
| B01/B02 + B32/B33: mixed-use buildings with corner kits | S1 broad parcels continue the existing south kits. Label supporting shells separately from visible 3.5×2×7.6 and 5.5×2×7.6 m kit envelopes. Kit sources, placement and integral windows remain untouched. |
| B03: civic wings | Source spans y=33.28..36 and41..46.72 at x=14.6..20; gap stays open. Closed south service entrance implies rear access through non-playable fabric, not a bridge across the 5 m link. Main hall retains +9.5 roof base and repaired arch. |
| B04/B17: two wings, two public faces | South y=33.28..39, north44..46.72. West shell x=36..40.8; east shell x=36.2..41; union5 m deep, 4.6 m overlap. LINK_EAST_MID y=39..44 remains open. Each wing has its own access; the north door cannot secretly serve the disconnected south shop across the passage. South dye shop is a front-served locked display with stock behind a closed backing; no player entrance. North household/trade doors imply one shared service vestibule in that wing. |
| B05/B06/B18: merchant buildings | Per bay, public floor reaches the counter; service is explained by a closed rear store/working pocket only where M02 proves depth. B05/B12 share an overlapping physical wing, as S2 states. B06/B18 have a 4.2 m envelope extending behind the sealed boundary, not 4.2 m of playable interior. No interior mesh or new ground doorway is required. |
| B12: raised public frontage | Tea floor +1.4, roof base +8.4; storefront opens visually onto Tea, back meets B05's overlapping northern wing. Internal household stair behind closed GROUND_02 is schematic; retain useful source upper projections with measured supports. No new accessible balcony. |
| B14/B15/B16: retaining/enclosure spines | 0.96 m deep, not warehouses. B14 removes impossible 2.5 m under-terrace doors: two small sealed inspection panels fit below the local terrace/ramp profile where measured. B15 E1 is a changed parapet, flanked by retained tall screens. B16 remains tall for this batch; no decorative second storey. |
| B20/B21: workshop plus domestic infill | Workshop door is for handcart/foot access, high vents serve the work volume. B21 keeps the 4.5 m wall but adds one small loft vent and roof hatch, removes seeded towers and retains a +5.59 cap. This explicitly rejects R07's apparent low roof/oversized door proportions. |
| B23/B24: code-boundary reliefs | B23 is the closed working compound edge, with repaired gate retained. B24 represents a dwelling behind x=53, y=48..62; show a dashed explanatory 4.2 m rear depth to x=57.2, not a new runtime footprint. Retain opaque boundary. No free-standing 0.35 m-deep house export. |
| B25/B26: bath wings / domestic boundary relief | B25 retains high hall light and sealed doors; rear ventilation/water stains follow existing service evidence. B26's 0.96 m support relief is on an implied house x=53..57.2,y=63.44..71. Keep cut stone as listed; remove contradictory whitewash instruction. Hidden rear depth is explanatory and subject to city-context fit, not production geometry. |
| B08/B09 and enclosure owners | Gatekeeper wings stay separated by the open link. Caravan doors are 1.35 m handcart entries, not wagon portals. Yard walls at4.9 m remain in the baseline despite exceeding store walls4.5: M07 compares cap/fixture heights and loading-court hierarchy before lowering either. |

## Current roof survey

Static evaluation of the current `v3Architecture.ts` and compiled massings, with experimental visual cutouts enabled. Values are absolute z. The end/profile drawings include generated slab, coping, parapet, bulkhead, head and tier boxes, so a4.5 m shell is not mistaken for its skyline. Boundary segments/props were omitted from this in-memory inspection; final visibility and all active boundary fixtures still require M07. A shared non-owner has no separate emitted roof; its apparent top belongs to the opposite owner. Rug Gate silhouettes are landmark-owned; formula cap values there are omitted.

| Card / frontage | Roof base | Parapet cap | Emitted roof-group maximum |
|---|---:|---:|---:|
| B01 / `SPICE_STREET_WEST` | 7.000 | 8.190 | 10.668 |
| B02 / `SPICE_STREET_EAST` | 4.500 | 5.590 | 7.518 |
| B03 / `FOUNTAIN_COURT_WEST` | 9.500 | 10.790 | 11.520 |
| B03 / `FOUNTAIN_COURT_WEST_SOUTH` | 9.500 | 10.790 | 11.520 |
| B04 / `FOUNTAIN_COURT_EAST` | 7.000 | shared owner / landmark | shared owner |
| B04 / `FOUNTAIN_COURT_EAST_NORTH` | 7.000 | shared owner / landmark | shared owner |
| B05 / `TEXTILE_ARCADE_WEST` | 7.000 | 8.190 | 9.968 |
| B06 / `TEXTILE_ARCADE_EAST` | 4.500 | 5.590 | 7.468 |
| B07 / `RUG_GATE_WEST` | 7.000 | shared owner / landmark | 8.870 |
| B08 / `RUG_GATE_EAST` | 4.500 | shared owner / landmark | 4.760 |
| B08 / `RUG_GATE_EAST_SOUTH` | 4.500 | shared owner / landmark | 4.760 |
| B09 / `CARAVAN_COURT_WEST` | 4.500 | 5.590 | 7.618 |
| B10 / `CARAVAN_COURT_EAST_SOUTH` | 4.900 | 5.790 | 7.918 |
| B11 / `CARAVAN_COURT_EAST_NORTH` | 4.900 | 5.790 | 7.918 |
| B12 / `TEA_TERRACE_EAST` | 8.400 | 9.590 | 12.068 |
| B13 / `SERVICE_SOUTH_EAST` | 4.900 | 5.790 | 7.918 |
| B14 / `SERVICE_NORTH_EAST_SPINE_S` | 7.000 | 7.890 | 10.118 |
| B15 / `SERVICE_NORTH_EAST_SPINE_MID` | 7.000 | 7.890 | 10.018 |
| B16 / `SERVICE_NORTH_EAST_SPINE_N` | 7.000 | 7.890 | 10.018 |
| B18 / `COVERED_SOUK_EAST` | 4.500 | 5.590 | 7.468 |
| B19 / `COVERED_SOUK_SOUTH` | 4.900 | 5.790 | 7.918 |
| B20 / `DYERS_ALLEY_WEST_S` | 7.000 | 8.190 | 10.118 |
| B21 / `DYERS_ALLEY_WEST_N` | 4.500 | 5.590 | 7.518 |
| B22 / `DYERS_ALLEY_EAST` | 4.900 | 5.790 | 7.918 |
| B25 / `NORTH_COURT_WEST` | 7.000 | 8.190 | 9.020 |
| B25 / `NORTH_COURT_WEST_SOUTH` | 7.000 | 8.190 | 9.020 |
| B26 / `NORTH_COURT_EAST_S` | 4.900 | 5.790 | 7.918 |
| B27 / `NORTH_COURT_EAST_N` | 4.900 | 5.790 | 7.918 |
| B28 / `NORTH_COURT_NORTH` | 4.900 | 5.790 | 7.918 |
| B29 / `NORTH_COURT_SOUTH` | 4.900 | 5.790 | 7.918 |
| B30 / `LINK_NORTH_WEST_NORTH` | 4.900 | 5.790 | 7.918 |
| B31 / `LINK_NORTH_EAST_NORTH` | 4.900 | 5.790 | 7.918 |
| B34 / `SPAWN_B_SOUTH_WEST` | 4.900 | 5.790 | 7.918 |
| B35 / `SPAWN_B_SOUTH_EAST` | 4.900 | 5.790 | 7.918 |
| B17 / `COVERED_SOUK_WEST` | 7.000 | 8.190 | 9.968 |
| B17 / `COVERED_SOUK_WEST_NORTH` | 7.000 | 8.190 | 9.968 |

B23/B24 are code-boundary treatments: this roof evaluation does not supply their missing gate/roof measurements. B32/B33 use the retained complete kits rather than the shallow supporting-shell roof. See M04/M05 and the owning cards. Proposed cap tops and replacements are in S1/S2/B18/B21; this table is baseline evidence only.

## District response schedule

This closes the remaining location-specific review findings. A retain decision is scoped; measurements remain pending.

| Owners | Concrete disposition / evidence needed |
|---|---|
| B01/B02/P02 | S1 retains three west trades/two household doors; east doors serve sacks/handcarts. M03 ties, M07 two-direction skyline review; no blanket street narrowing. |
| B03/B04/B17/P03/P19 | Repaired arches and open mid link retained. Resolve wing access above and shared roof in assembly-fit. M06 tests Fountain's four-way pressure and x=26..32 escape band. |
| B05/B06/P04 | S2; packing bays complete, actual column preserved. Extra booth remains fit-dependent. G1 conditional; connector deferred unless repeated trap evidence. |
| B07/B08/P05 | Keep west display/service split and Gatekeeper's separated wings/full pilaster. M05 and M07 review both upper-link approaches, gate soffit and receiving view. |
| B09-B11/P08 | Retain locked handcart stores and yard enclosure; cart handling is a 0.8 m door-service floor plus measured turning pocket, not a wagon court claim. Keep ramp entry and mid-link options. M05/M07 decide wall hierarchy. |
| B12-B16/P07/P09-P13 | E1 first, B14 corrected panels, Tea source shade and end grades retained. B13 keeps its three existing blind panels as enclosure joints rather than adding decoration. No niche production batch until Service's moving sequence is reviewed. |
| B18/B19/P15 | B18 complete-building pilot. B19 is a 4.2 m-long, 4.9 m-high wall; preserve open turn. Souk north end remains solid with zero fake arches. M06 checks emerging mid-link pressure; M02/M03 handle trade/support fit. |
| B20-B22/P14 | Wet work against east wall and workshop edge, quiet home retained. B22 keeps source high panel positions and full repairs; no extra niches for density. M05 maps racks/vats against body volume; localized dye wear follows their positions. |
| B23/B24/P16 | Code-boundary skins with implied use, never independent thin buildings. M04 actual gate; M06 measures whether a dogleg sightline exists before adding one. M05 tests inside north turn. |
| B25-B29/P17 | Bath, domestic edge and drying yard remain distinct. Keep open release and edge work access. Drainage is flush joint/base wear toward existing low points; no invented trench/outfall. M05/M06 inspect each mouth and escape. |
| B30/B31/P24/P25 | Preserve repaired full-height niches and link walls; M05 checks NW service turn and NE workstation separately. No symmetrical dressing rollout. |
| B32/B33/P01/P22/P23 | Retain complete Spawn-A kits, label visible versus support bounds. Three exits remain. M05 protects both inside turns; M06 validates actual initial placement/fallback behavior. |
| B34/B35/P06 | Quiet receiving wings retained; do not call central gate the only escape because side links exist. M07 reviews exit recognition with O06; M06 treats B spawns independently from A. |
| P18/P20/P21 | Mid link5×5; West Upper2 m long/4.5 m wide; East Upper7×5, clear3.5. Preserve unequal geometry. M05/M06 compare emerging threat and bot congestion, not nominal symmetry. |
| O01/O02/O03 | Keep closed city gate, unequal domestic parcels and dye-process rear. These supply construction/occupation precedent; no changed meshes. M05 verifies source kits' full body envelope. |
| O04/O05/O06 | Preserve open Spice/Rug portals and stepped receiving backdrop. M07 checks both-direction layer overlap and closed off-map access cues, M06 visibility around transitions. |
| O07 | All14 overheads get endpoint/low-sag/support records; assets.md names the high-tie revisions. Retain hanging textiles and sky gaps, not arbitrary unsupported endpoints. |
| O08/O09 | Keep sealed collision boundary and120 deterministic shells. Near visible ring0 north/east silhouettes may retain or receive two backed upper service closures per selected shell after M07 selects actual visible shell IDs; no new placement until those IDs are recorded. Distant shells remain economical. No blanket120-shell window export or blanket removal of inhabited context. |

## Registered owner cards (35)

Numbers B01..B35 are diagram keys only. Every card includes the common face rules. The roof/context drawings and named measurements qualify what remains unresolved; a rectangular schedule alone is not complete-building approval.

<a id="bld_spice_row_w"></a>
### B01 · BLD_SPICE_ROW_W

[Architectural drawing](drawings/BLD_SPICE_ROW_W.svg)

**Composition:** Three spice tenancies and two closed household/store access doors form one mixed-use block, with five aligned upper shutters.

Primary access is GROUND_02; GROUND_05 serves the north tenancy. Recesses GROUND_01/03/04 receive ASMB_SPICE_COUNTER (3); SP-D spice drawers at01, SP-G grain/balance counter at03 and SP-A apothecary cabinet at04. Retain signs SPICE_W_SIGN_1 and add the existing SPICE_W_SIGN_3 binding; one sign per named tenant, no sign at 04. Retain the three bay awnings, their wall ledger and diagonal braces; no canopy on doors. Replace all five upper shutter windows with the assigned SH-L/SH-P/SH-W constructions in assets.md. S1 changes the parcel roofs; useful existing high backed projections may remain after M02 support review. Keep door approaches and the two end piers empty. No fruit, vats or extra shop doors. Owns the south terminal SPICE_STREET_WEST_TERMINAL and the attached Spawn-A west return card below; do not treat them as separate houses.

**public front:** `F/SPICE_STREET_WEST`; zone `SPICE_STREET`, `west` edge, x=21, y=15.440..30.560; a increases +y. **Observed L×D×H:** 15.120 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; observed baseline, with the named revision above proposed separately.

Material assignment: `active_merchant`; wall `ph_painted_plaster_warm`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **1.225 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `shop_recess_market` | 1.800 | 0.000 / 2.700 |
| `STORY_1_WINDOW_01` | `ASMB_SHUTTER_WINDOW` | 1.800 | 3.680 / 5.330 |
| `GROUND_02` | `door_shop_timber` | 4.680 | 0.000 / 2.700 |
| `STORY_1_WINDOW_02` | `ASMB_SHUTTER_WINDOW` | 4.680 | 3.680 / 5.330 |
| `GROUND_03` | `shop_recess_market` | 7.560 | 0.000 / 2.700 |
| `STORY_1_WINDOW_03` | `ASMB_SHUTTER_WINDOW` | 7.560 | 3.680 / 5.330 |
| `GROUND_04` | `shop_recess_market` | 10.440 | 0.000 / 2.700 |
| `STORY_1_WINDOW_04` | `ASMB_SHUTTER_WINDOW` | 10.440 | 3.680 / 5.330 |
| `GROUND_05` | `door_shop_timber` | 13.320 | 0.000 / 2.700 |
| `STORY_1_WINDOW_05` | `ASMB_SHUTTER_WINDOW` | 13.320 | 3.680 / 5.330 |

**Face totals:** 2 closed doors; 5 windows; 0 sealed architectural arches; 3 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_spice_row_e"></a>
### B02 · BLD_SPICE_ROW_E

[Architectural drawing](drawings/BLD_SPICE_ROW_E.svg)

**Composition:** A low wholesale row has three closed entries and two blind panels, with one northern setback household/store room under S1.

Retain GROUND_01/03/04 doors and GROUND_02/05 niches at ground. S1 adds one northern setback room and two closed dark windows; no ground awnings or playable upper floor. Primary entrance GROUND_03. Retain SPICE_E_WALLBASE_STOCK_01..04, B4_SPICE_E_CART_GROUND_01 and their active placements at their current positions; goods remain at the wall, door service volumes stay empty. No new signs; no stacked threshold sacks. Attached south shop return is BLD_SPAWN_A_WALL_E, one block with a corner front, not another frontage-driven building.

**public front:** `F/SPICE_STREET_EAST`; zone `SPICE_STREET`, `east` edge, x=33, y=15.440..30.560; a increases +y. **Observed L×D×H:** 15.120 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; observed baseline, with the named revision above proposed separately.

Material assignment: `quiet_residential_cut_stone`; wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **0.600 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `door_residential_timber` | 1.125 | 0.000 / 2.250 |
| `GROUND_02` | `blind_niche` | 4.343 | 0.450 / 2.250 |
| `GROUND_03` | `door_residential_timber` | 7.560 | 0.000 / 2.250 |
| `GROUND_04` | `door_residential_timber` | 10.777 | 0.000 / 2.250 |
| `GROUND_05` | `blind_niche` | 13.995 | 0.450 / 2.250 |

**Face totals:** 3 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 2 blind niches; 0 columns/pilasters.


<a id="bld_madrasa"></a>
### B03 · BLD_MADRASA

[Architectural drawing](drawings/BLD_MADRASA.svg)

**Composition:** One tall blind entrance arch and one stained clerestory face the fountain; a narrow south wing contains the closed service entrance.

Retain the repaired 4.2 × 4.85 m hero arch, sealed backing, stained opening on its axis and existing roof/minaret vista. Do not add the two extra stained windows or raise the parapet from the old brief. South wing GROUND_01 is the closed service entry; retain one high dark window and suppress STORY_2_WINDOW_01, avoiding an invented third floor. No balcony, awning, sign or goods. Retain the existing court-edge planters/rugs through FOUNTAIN_COURT, not extra pairs in the doorway. Plain lower stone surrounds the entry; no new playable passage.

**public front:** `F/FOUNTAIN_COURT_WEST`; zone `FOUNTAIN_COURT`, `west` edge, x=20, y=41.000..46.720; a increases +y. **Observed L×D×H:** 5.720 × 5.4 × 9.5; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.85; retain envelope.

Material assignment: `hero_courtyard`; wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.760 m at a=0**, **0.760 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `arch_hero_courtyard` | 2.860 | 0.000 / 4.850 |
| `STORY_1_WINDOW_01` | `window_landmark_stained` | 2.860 | 5.150 / 6.900 |

**Face totals:** 0 closed doors; 1 windows; 1 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.

**secondary/service wing front:** `F/FOUNTAIN_COURT_WEST_SOUTH`; zone `FOUNTAIN_COURT`, `west` edge, x=20, y=33.280..36.000; a increases +y. **Observed L×D×H:** 2.720 × 5.4 × 9.5; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.85; retain envelope.

Material assignment: `hero_courtyard_beige`; wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.835 m at a=0**, **0.835 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `door_residential_timber` | 1.360 | 0.000 / 2.250 |
| `STORY_1_WINDOW_01` | `window_dark_recess` | 1.360 | 5.150 / 6.400 |

**Face totals:** 1 closed doors; 1 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_merchant_house"></a>
### B04 · BLD_MERCHANT_HOUSE

[Architectural drawing](drawings/BLD_MERCHANT_HOUSE.svg)

**Composition:** A merchant block has a quiet court loggia on its west front and a cloth-trade back on the Souk, with the existing cross-link between its wings.

Group BLD_DYERS_ARCADE_W here as the opposite trade face: the massing rectangles overlap (M01), so they cannot be independently styled buildings. Keep both live IDs. Court main GROUND_01 remains a sealed 4.2 m loggia, with two dark clerestories; the north wing GROUND_01 is the primary closed household entrance. Replace its upper dark window with one ASMB_SCREEN_WINDOW at the same sill. No balcony: the old 2.4 m balcony has no resolved access and conflicts with the retained hero arch. No court awning or commercial sign. North-wing access serves only that wing; the separate south display is front-served and locked, with non-playable stock behind the backing. Preserve the court/Souk passage, return corners and roof envelope; walls toward the passage are quiet, zero openings.

**public front:** `F/FOUNTAIN_COURT_EAST`; zone `FOUNTAIN_COURT`, `east` edge, x=36, y=33.280..39.000; a increases +y. **Observed L×D×H:** 5.720 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `hero_courtyard_beige`; wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.760 m at a=0**, **0.760 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `STORY_1_WINDOW_01` | `window_dark_recess` | 1.050 | 5.150 / 6.400 |
| `GROUND_01` | `arch_hero_courtyard` | 2.860 | 0.000 / 4.850 |
| `STORY_1_WINDOW_02` | `window_dark_recess` | 4.670 | 5.150 / 6.400 |

**Face totals:** 0 closed doors; 2 windows; 1 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.

**secondary/service wing front:** `F/FOUNTAIN_COURT_EAST_NORTH`; zone `FOUNTAIN_COURT`, `east` edge, x=36, y=44.000..46.720; a increases +y. **Observed L×D×H:** 2.720 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `hero_courtyard`; wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.835 m at a=0**, **0.835 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `door_residential_timber` | 1.360 | 0.000 / 2.250 |
| `STORY_1_WINDOW_01` | `ASMB_SCREEN_WINDOW` | 1.360 | 5.150 / 6.550 |

**Face totals:** 1 closed doors; 1 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_rug_arcade_w"></a>
### B05 · BLD_RUG_ARCADE_W

[Architectural drawing](drawings/BLD_RUG_ARCADE_W.svg)

**Composition:** Three rug-display arches and one pier form a shared commercial frontage; three upper screens belong only to the three arches.

Keep actual GROUND_01/02/03/04 bindings and 3.2133 m pitch; the old five-bay schedule is not the current architecture. ASMB_RUG_DISPLAY replaces furnishings in 01 and 03; 04 retains one existing generic textile kiosk as a packing bay. Retain the arch masonry and sealed backings. Suppress the upper window over column 02; use three ASMB_SCREEN_WINDOW at 01/03/04 axes. Retain TEXTILE_W_SIGN_1; no second sign. Retain supported awnings at the three arches; no new balcony. Merchant access is off-map behind the existing sealed packing bay; no new service door is added. Keep the column and inter-bay wall blank, no floor racks.

**public front:** `F/TEXTILE_ARCADE_WEST`; zone `TEXTILE_ARCADE`, `west` edge, x=24, y=49.280..62.720; a increases +y. **Observed L×D×H:** 13.440 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; observed baseline, with the named revision above proposed separately.

Material assignment: `covered_arcade`; wall `ph_aged_plaster_ochre`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **0.600 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `arch_arcade` | 1.900 | 0.000 / 3.550 |
| `STORY_1_WINDOW_01` | `ASMB_SCREEN_WINDOW` | 1.900 | 4.150 / 5.550 |
| `GROUND_02` | `column_arcade` | 5.113 | 0.000 / 3.550 |
| `GROUND_03` | `arch_arcade` | 8.327 | 0.000 / 3.550 |
| `STORY_1_WINDOW_03` | `ASMB_SCREEN_WINDOW` | 8.327 | 4.150 / 5.550 |
| `GROUND_04` | `arch_arcade` | 11.540 | 0.000 / 3.550 |
| `STORY_1_WINDOW_04` | `ASMB_SCREEN_WINDOW` | 11.540 | 4.150 / 5.550 |

**Face totals:** 0 closed doors; 3 windows; 3 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 1 columns/pilasters.


<a id="bld_rug_arcade_e"></a>
### B06 · BLD_RUG_ARCADE_E

[Architectural drawing](drawings/BLD_RUG_ARCADE_E.svg)

**Composition:** A low arcade shares the west frontage rhythm but sells light fabric at its south bay and rugs farther north.

GROUND_01 receives ASSET_TEXTILE_BOOTH, P-BOOTH target 1; GROUND_03 receives ASMB_RUG_DISPLAY; 04 retains the existing packing kiosk and cart anchored by BPL16_TEXTILE_E_STOCK_GROUND_04. No uppers or balcony. Keep signs TEXTILE_E_SIGN_1 only; 03/04 use goods as identification. Retain the awnings on 03/04 and replace the 01 awning with the booth awning, never two covers. Merchant access is off-map behind the existing sealed north packing bay; no new service door is added. No loose ground rugs crossing the lane or extra cloth through the pillar gap.

**public front:** `F/TEXTILE_ARCADE_EAST`; zone `TEXTILE_ARCADE`, `east` edge, x=35, y=49.280..62.720; a increases +y. **Observed L×D×H:** 13.440 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; observed baseline, with the named revision above proposed separately.

Material assignment: `covered_arcade_lime`; wall `ph_painted_plaster_warm`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **0.600 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `arch_arcade` | 1.900 | 0.000 / 3.550 |
| `GROUND_02` | `column_arcade` | 5.113 | 0.000 / 3.550 |
| `GROUND_03` | `arch_arcade` | 8.327 | 0.000 / 3.550 |
| `GROUND_04` | `arch_arcade` | 11.540 | 0.000 / 3.550 |

**Face totals:** 0 closed doors; 0 windows; 3 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 1 columns/pilasters.


<a id="bld_rug_merchant"></a>
### B07 · BLD_RUG_MERCHANT

[Architectural drawing](drawings/BLD_RUG_MERCHANT.svg)

**Composition:** One rug display and one closed north service door sit below two differently closed upper windows in the gate approach.

Keep current bay centers, replace north GROUND_02 shop recess with door_shop_timber (same bay ID, old shop dressings suppressed), and replace its upper shutter with the smaller existing dark-window assembly at the same sill. ASMB_RUG_DISPLAY in GROUND_01; one ASMB_SHUTTER_WINDOW above it. Primary access is GROUND_02, closed with no collision opening. Retain RUG_W_SIGN_1; suppress the RUG_W_SIGN_2 member and any auto shop2 sign/stock/awning, preserving its anchor. One supported awning over display 01 only. No balcony or second booth; keep the north door and gate abutment approach empty.

**public front:** `F/RUG_GATE_WEST`; zone `RUG_GATE`, `west` edge, x=21, y=65.120..72.000; a increases +y. **Observed L×D×H:** 6.880 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `active_merchant_warmwash`; wall `ph_plastered_wall`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **1.225 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `shop_recess_market` | 1.800 | 0.000 / 2.700 |
| `STORY_1_WINDOW_01` | `ASMB_SHUTTER_WINDOW` | 1.800 | 3.680 / 5.330 |
| `GROUND_02` | `door_shop_timber` | 5.080 | 0.000 / 2.700 |
| `STORY_1_WINDOW_02` | `window_dark_recess` | 5.080 | 3.680 / 4.930 |

**Face totals:** 1 closed doors; 2 windows; 0 sealed architectural arches; 1 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_gate_keeper"></a>
### B08 · BLD_GATE_KEEPER

[Architectural drawing](drawings/BLD_GATE_KEEPER.svg)

**Composition:** One low gatekeeper dwelling has an offset closed entry and a small north window; its detached-looking south piece is a blank flank across the link.

One door, one dark window, no uppers despite the old brief. Retain the south-return pilaster as a full-height 3.4 m pilaster, not a shortened bollard. Primary entry BAY_01. No balcony, shop, goods, awning or sign. Both walls share the cut-stone family with the existing profile variation at the construction seam. Keep the two faces and all link clearances; do not bridge the intervening passage.

**public front:** `F/RUG_GATE_EAST`; zone `RUG_GATE`, `east` edge, x=34, y=72.000..76.880; a increases +y. **Observed L×D×H:** 4.880 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; retain envelope.

Material assignment: `quiet_residential`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.250 m at a=0**, **1.250 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `door_residential_timber` | 1.775 | 0.000 / 2.250 |
| `BAY_02` | `window_dark_recess` | 3.180 | 1.000 / 2.250 |

**Face totals:** 1 closed doors; 1 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.

**secondary/service wing front:** `F/RUG_GATE_EAST_SOUTH`; zone `RUG_GATE`, `east` edge, x=34, y=65.120..67.000; a increases +y. **Observed L×D×H:** 1.880 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; retain envelope.

Material assignment: `quiet_residential_cut_stone`; wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.730 m at a=0**, **0.730 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `pilaster_facade` | 0.940 | 0.000 / 3.400 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 1 columns/pilasters.


<a id="bld_caravan_stores"></a>
### B09 · BLD_CARAVAN_STORES

[Architectural drawing](drawings/BLD_CARAVAN_STORES.svg)

**Composition:** Two equal locked stores alternate with three blind niches on a single storage-yard head.

Retain authored BAY_DOOR_S/N and BAY_NICHE_S/AXIS/N, including their nonnumeric IDs. No windows, upper floor, balcony or retail awnings. South door is primary receiving access; north door separate storage access, both closed. Retain loading crates, cart and shade through CARAVAN_COURT; no goods in either door service volume. No shop signs; small existing route signs remain route-owned. Quiet stone piers and roof complete the row.

**public front:** `F/CARAVAN_COURT_WEST`; zone `CARAVAN_COURT`, `west` edge, x=3, y=31.440..46.560; a increases +y. **Observed L×D×H:** 15.120 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; retain envelope.

Material assignment: `service_storage`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.545 m at a=0**, **1.545 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_NICHE_S` | `blind_niche` | 2.070 | 0.700 / 2.500 |
| `BAY_DOOR_S` | `door_storage_heavy` | 4.815 | 0.000 / 2.500 |
| `BAY_NICHE_AXIS` | `blind_niche` | 7.560 | 0.700 / 2.500 |
| `BAY_DOOR_N` | `door_storage_heavy` | 10.305 | 0.000 / 2.500 |
| `BAY_NICHE_N` | `blind_niche` | 13.050 | 0.700 / 2.500 |

**Face totals:** 2 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 3 blind niches; 0 columns/pilasters.


<a id="bld_caravan_yard_wall_s"></a>
### B10 · BLD_CARAVAN_YARD_WALL_S

[Architectural drawing](drawings/BLD_CARAVAN_YARD_WALL_S.svg)

**Composition:** A shallow garden enclosure south of West Mid Link holds one high blind niche.

One niche only, zero doors/windows, no interior floor implied. Keep coping, string course and existing plaster; no balcony, signs, awning or goods. Access is the existing West Mid Link opening beside it. Base and both short returns remain blank; no doorway painted in the niche.

**compound/service wall:** `F/CARAVAN_COURT_EAST_SOUTH`; zone `CARAVAN_COURT`, `east` edge, x=15, y=30.540..35.400; a increases +y. **Observed L×D×H:** 4.860 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_ochre_relief`; wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.905 m at a=0**, **1.905 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 2.430 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_caravan_yard_wall_n"></a>
### B11 · BLD_CARAVAN_YARD_WALL_N

[Architectural drawing](drawings/BLD_CARAVAN_YARD_WALL_N.svg)

**Composition:** The north enclosure continues the garden wall with a longer span and a warmer repaired plaster field.

One high niche; zero doors/windows. Same coping/head datum as the south wall, separate existing profile material retained. The existing loading cluster at its north end belongs to CARAVAN_COURT; keep the wall center blank. Access via West Mid Link. No balcony, retail sign, extra awning or openings.

**compound/service wall:** `F/CARAVAN_COURT_EAST_NORTH`; zone `CARAVAN_COURT`, `east` edge, x=15, y=41.520..47.460; a increases +y. **Observed L×D×H:** 5.940 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_warmwash_relief`; wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **2.445 m at a=0**, **2.445 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 2.970 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_tea_house"></a>
### B12 · BLD_TEA_HOUSE

[Architectural drawing](drawings/BLD_TEA_HOUSE.svg)

**Composition:** A tea serving recess and a closed entrance sit under two shuttered upper rooms overlooking the raised terrace.

Retain GROUND_01 serving recess and GROUND_02 entry, not two retail openings from the old brief. Primary access GROUND_02. Two ASMB_SHUTTER_WINDOW: SH-L at the serving-recess axis and SH-W over the entry; no new gallery or playable balcony; keep useful existing backed upper projections only after support/access review. Retain ASSET_TEA_SERVICE, table and stools via TEA_TERRACE; retain the existing bay awning at 01 plus route-owned high shade. Keep TEA_E_SIGN_1, suppress TEA_E_SIGN_2 member; one tea-house sign. No ground textile booth, barrels or new stools. Thresholds reference z=1.4 m, not map zero.

**public front:** `F/TEA_TERRACE_EAST`; zone `TEA_TERRACE`, `east` edge, x=19, y=56.800..65.200; a increases +y. **Observed L×D×H:** 8.400 × 4.8 × 7; registered storeys=2, local floor z=1.4. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `active_merchant_ochre`; wall `ph_beige_wall_002`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **1.225 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `shop_recess_market` | 1.800 | 0.000 / 2.700 |
| `STORY_1_WINDOW_01` | `ASMB_SHUTTER_WINDOW` | 1.800 | 3.680 / 5.330 |
| `GROUND_02` | `door_shop_timber` | 6.600 | 0.000 / 2.700 |
| `STORY_1_WINDOW_02` | `ASMB_SHUTTER_WINDOW` | 6.600 | 3.680 / 5.330 |

**Face totals:** 1 closed doors; 2 windows; 0 sealed architectural arches; 1 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_spice_backs"></a>
### B13 · BLD_SPICE_BACKS

[Architectural drawing](drawings/BLD_SPICE_BACKS.svg)

**Composition:** The service-yard enclosure uses three high blind panels and a stained base, with no public access on this side.

The legacy name does not establish that it is the physical back of BLD_SPICE_ROW_W: the shells are separated in plan. Keep this as the service-yard wall owner at x=10. Retain three niches at 3.95/7.9/11.85 m, sill 1.6/head 3.4; zero doors/windows, no inhabitable second floor in 4.9 m relief. Add no hatch from the brief. No balcony, sign or awning; the existing two edge vessels are SERVICE_SOUTH-owned. Drain treatment ASMB_WALL_FINISH; the whole lower field is intentionally quiet.

**compound/service wall:** `F/SERVICE_SOUTH_EAST`; zone `SERVICE_SOUTH`, `east` edge, x=10, y=13.600..29.400; a increases +y. **Observed L×D×H:** 15.800 × 0.96 × 4.9; registered storeys=2, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_warmwash_relief`; wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **3.425 m at a=0**, **3.425 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 3.950 | 1.600 / 3.400 |
| `BAY_02` | `blind_niche` | 7.900 | 1.600 / 3.400 |
| `BAY_03` | `blind_niche` | 11.850 | 1.600 / 3.400 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 3 blind niches; 0 columns/pilasters.


<a id="bld_stores_back"></a>
### B14 · BLD_STORES_BACK

[Architectural drawing](drawings/BLD_STORES_BACK.svg)

**Composition:** Two small sealed inspection panels explain the retaining spine without inventing full-height storage under the ramp.

This 0.96 m massing is a retaining/enclosure screen, not a warehouse. Replace the two 2.5 m door visuals with sealed inspection panels, 1.35 m wide × 0.85 m high, sill0.25/head1.10, at a=2.328/6.984; preserve GROUND_01/02 identities. Suppress all three old upper vent visuals and any door-service signage, retaining bindings and solid collision. These are flush ASMB_WALL_FINISH panels, not entries. M02 checks that the local ramp/retaining section can contain each panel; where it cannot, finish that panel as uninterrupted masonry. No hidden excavated room or lowered floor is proposed.

**public front:** `F/SERVICE_NORTH_EAST_SPINE_S`; zone `SERVICE_NORTH`, `east` edge, x=10, y=48.032..57.344; a increases +y. **Observed L×D×H:** 9.312 × 0.96 × 7; registered storeys=2, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `service_storage`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.653 m at a=0**, **1.653 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `ASMB_WALL_FINISH` sealed inspection panel | 2.328 | 0.250 / 1.100 |
| `GROUND_02` | `ASMB_WALL_FINISH` sealed inspection panel | 6.984 | 0.250 / 1.100 |

**Face totals:** 0 doors; 0 windows; 0 arches; 0 shop recesses; 0 vents; 2 sealed inspection panels. Three upper vent IDs remain dormant bindings. Baseline wall/roof retained; panel fit unresolved at M02.


<a id="bld_tea_house_back"></a>
### B15 · BLD_TEA_HOUSE_BACK

[Architectural drawing](drawings/BLD_TEA_HOUSE_BACK.svg)

**Composition:** Two high blind panels articulate the retaining/enclosure screen beside the terrace, with E1 opening a tested overlook.

Retain GROUND_01/02 IDs but put their niches at thirds, sill 1.3/head 3.1; suppress the extra STORY_1_WINDOW_01 niche. Zero doors/windows, no balcony, shop, sign or awning. Name is legacy: this x=10 retaining spine is not the back of the tea building at x=19. Baseline retains the 7 m screen; E1 separately cuts the y=58..61 slot and affected roof pieces above +2.50. The two niche rows below describe the retained baseline only; E1 suppresses any overlapping niche geometry. Blank lower field and terrain-side face, one continuous contact course.

**compound/service wall:** `F/SERVICE_NORTH_EAST_SPINE_MID`; zone `SERVICE_NORTH`, `east` edge, x=10, y=57.344..66.656; a increases +y. **Observed L×D×H:** 9.312 × 0.96 × 7; registered storeys=2, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; observed baseline, with the named revision above proposed separately.

Material assignment: `quiet_residential_warmwash_relief`; wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **2.579 m at a=0**, **2.579 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `blind_niche` | 3.104 | 1.300 / 3.100 |
| `GROUND_02` | `blind_niche` | 6.208 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 2 blind niches; 0 columns/pilasters.


<a id="bld_north_yard_wall"></a>
### B16 · BLD_NORTH_YARD_WALL

[Architectural drawing](drawings/BLD_NORTH_YARD_WALL.svg)

**Composition:** The north retaining spine ends in two high blind panels under the existing tall coping.

Retain BAY_01/02 at thirds, no upper niches from the old walls list, zero doors/windows. Existing 7 m height screens the terrain; do not invent floors or lower it. No sign, awning, balcony or goods. The north-link corner is entirely clear. Access is elsewhere in the open route network.

**compound/service wall:** `F/SERVICE_NORTH_EAST_SPINE_N`; zone `SERVICE_NORTH`, `east` edge, x=10, y=66.656..75.968; a increases +y. **Observed L×D×H:** 9.312 × 0.96 × 7; registered storeys=2, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_relief`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **2.579 m at a=0**, **2.579 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 3.104 | 1.300 / 3.100 |
| `BAY_02` | `blind_niche` | 6.208 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 2 blind niches; 0 columns/pilasters.


<a id="bld_dyers_arcade_w"></a>
### B17 · BLD_DYERS_ARCADE_W

[Architectural drawing](drawings/BLD_MERCHANT_HOUSE.svg)

**Composition:** The Souk-facing side of the central merchant block has one cloth-trade arch, a cross-link, and one narrow closed service door.

Part of BLD_MERCHANT_HOUSE, not a separate building. Keep the south arch; replace its generic kiosk with ASMB_DYE_COUNTER (DY-S) and retain its supported awning. No full textile booth here. Three ASMB_SCREEN_WINDOW: two existing south-wing windows and one north-wing window. Primary trade service entry is north GROUND_01. Keep DYE_W_SIGN_1; suppress DYE_W_SIGN_2 member so the service door is quiet. No balcony. Retain the cart and rug bindings via COVERED_SOUK; no new goods at the cross-link turn. M01 verifies the existing shared owner (Souk massing for each wing), preserving both IDs, repairs and every anchor.

**public front:** `F/COVERED_SOUK_WEST`; zone `COVERED_SOUK`, `west` edge, x=41, y=33.280..39.000; a increases +y. **Observed L×D×H:** 5.720 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `covered_arcade`; wall `ph_aged_plaster_ochre`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.560 m at a=0**, **1.560 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `STORY_1_WINDOW_01` | `ASMB_SCREEN_WINDOW` | 1.100 | 4.150 / 5.550 |
| `GROUND_01` | `arch_arcade` | 2.860 | 0.000 / 3.550 |
| `STORY_1_WINDOW_02` | `ASMB_SCREEN_WINDOW` | 4.620 | 4.150 / 5.550 |

**Face totals:** 0 closed doors; 2 windows; 1 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.

**secondary/service wing front:** `F/COVERED_SOUK_WEST_NORTH`; zone `COVERED_SOUK`, `west` edge, x=41, y=44.000..46.720; a increases +y. **Observed L×D×H:** 2.720 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `covered_arcade_wash`; wall `ph_whitewashed_brick_cool`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.785 m at a=0**, **0.785 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `door_shop_timber` | 1.360 | 0.000 / 2.700 |
| `STORY_1_WINDOW_01` | `ASMB_SCREEN_WINDOW` | 1.360 | 4.150 / 5.550 |

**Face totals:** 1 closed doors; 1 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_dyers_arcade_e"></a>
### B18 · BLD_DYERS_ARCADE_E

[Architectural drawing](drawings/BLD_DYERS_ARCADE_E.svg)

**Composition:** Three low fabric bays share repaired stone arches; one approved cloth booth sits between a quiet packing bay and a distinct dye-sample seller.

GROUND_02 is the approved textile pilot and remains untouched. GROUND_03 receives ASMB_DYE_COUNTER (DY-S); GROUND_01 retains a smaller closed packing cabinet with restrained bolts. Three arches, zero doors/windows/uppers, no balcony. Service access is off-map behind the existing sealed commercial backing; no new door or traversable interior is advertised. Keep DYE_E_SIGN_1/2 and existing southern auto sign, one per bay maximum. The approved booth owns the02 awning; retain the independently supported01/03 awnings. Preserve wide blank piers and grounded arch thresholds; no additional floor stock. M02/M03 govern the north dye counter and its existing awning below CANOPY_DYERS_01.

**Proposed complete roof (M):** retain the 4.50 m wall, slab top4.76, 0.45 m setback and parapet cap5.59. Replace this owner's seeded roof head/rear tier with a broad roof-access room x=54.6..56.4,y=40.9..44.7, base4.76, wall top7.15, flat cap7.35 (0.20 m). It has one closed west-facing roof door1.0×2.10 centered y=42.2 on x=54.6, opening only to the non-playable roof; the stair is implied behind the north trade bay. Both room end walls are blank; rear gets one0.58×0.48 vent centered y=42.8,sill6.20. Keep existing low service vent/exhaust cluster toward y≈38.33. No room extends over the walking lane. The two outer end walls retain wall base, existing useful supported details, roof returns and source closures; no new ground entry. Rear is sealed boundary fabric; no modeled interior. Exterior roof falls are represented by flush stains toward existing low rear joints, with no invented drain pipe or outlet until M02 confirms a route. See assets.md for exact exports and suppression.

**public front:** `F/COVERED_SOUK_EAST`; zone `COVERED_SOUK`, `east` edge, x=53, y=33.280..46.720; a increases +y. **Observed L×D×H:** 13.440 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; observed baseline, with the named revision above proposed separately.

Material assignment: `covered_arcade_lime`; wall `ph_painted_plaster_warm`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **0.600 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `arch_arcade` | 1.900 | 0.000 / 3.550 |
| `GROUND_02` | `arch_arcade` | 6.720 | 0.000 / 3.550 |
| `GROUND_03` | `arch_arcade` | 11.540 | 0.000 / 3.550 |

**Face totals:** 0 closed doors; 0 windows; 3 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_souk_yard_wall"></a>
### B19 · BLD_SOUK_YARD_WALL

[Architectural drawing](drawings/BLD_SOUK_YARD_WALL.svg)

**Composition:** One high niche resolves the low south enclosure at the Souk arrival.

Zero doors/windows, no balcony, shop, sign, awning or loose dressing. Existing side route is the entrance; retain the 4.2 m-long, 4.9 m-high wall and open path beside it. Base, ends and coping use ASMB_WALL_FINISH.

**compound/service wall:** `F/COVERED_SOUK_SOUTH`; zone `COVERED_SOUK`, `south` edge, y=32, x=41.360..45.560; a increases +x. **Observed L×D×H:** 4.200 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_relief`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.575 m at a=0**, **1.575 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 2.100 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_dye_works"></a>
### B20 · BLD_DYE_WORKS

[Architectural drawing](drawings/BLD_DYE_WORKS.svg)

**Composition:** A locked work door sits between two blind niches, with three vents above and dye work clustered at the edge.

Retain authored BAY_CART_DOOR, BAY_NICHE_S/N and BAY_VENT_S/AXIS/N. The 1.35 m door is a handcart/workshop door, not a new traversable route. Access on this face is visually closed. No balcony, retail sign or awning; the process stations stay on their existing L34_DYERS_ALLEY_VAT_01/02 anchors. No goods at the door or around its inside turn. Base stains follow the workstations; not every panel gets damage.

**public front:** `F/DYERS_ALLEY_WEST_S`; zone `DYERS_ALLEY`, `west` edge, x=46, y=13.000..21.990; a increases +y. **Observed L×D×H:** 8.990 × 4.8 × 7; registered storeys=2, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `service_storage`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.385 m at a=0**, **1.385 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_NICHE_S` | `blind_niche` | 1.910 | 0.700 / 2.500 |
| `BAY_VENT_S` | `vent_service` | 1.910 | 3.680 / 4.160 |
| `BAY_CART_DOOR` | `door_storage_heavy` | 4.495 | 0.000 / 2.500 |
| `BAY_VENT_AXIS` | `vent_service` | 4.495 | 3.680 / 4.160 |
| `BAY_NICHE_N` | `blind_niche` | 7.080 | 0.700 / 2.500 |
| `BAY_VENT_N` | `vent_service` | 7.080 | 3.680 / 4.160 |

**Face totals:** 1 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 3 vents; 2 blind niches; 0 columns/pilasters.


<a id="bld_dyers_house"></a>
### B21 · BLD_DYERS_HOUSE

[Architectural drawing](drawings/BLD_DYERS_HOUSE.svg)

**Composition:** A single-storey home steps down beside the workshop, with one centered closed door and two equal screened windows.

Retain BAY_DOOR at axis, use two ASMB_SCREEN_WINDOW, SC-D diamond-lattice construction, at BAY_WINDOW_S/N; no upper windows. Proposed finish for R07: `ph_beige_wall_002` pale lime-plaster field on front/side/rear, with existing `ph_sandstone_blocks_05` exposed base/corner stone and `ph_trim_sanded_01` surrounds. The profile slots below record the existing implementation; the approved Blender skin will own this proposed material treatment without repainting other uses of that profile. Primary entry BAY_DOOR. No balcony, awning, sign, shop, vats or stacked goods. Proposed roof: retain slab4.50..4.76 and parapet/cap top5.59; remove this owner's seeded head/rear tier, add a closed flush roof hatch x=42.4..43.4,y=23..24, top4.94. One existing-type vent_service at a=4.125, sill3.50/head3.98,width0.58 explains a ventilated loft above the2.7 m ceiling. Human-scale door1.05×2.25 and screens1.0×1.4 remain unchanged. Hidden household stair/hatch access is explanatory, not playable. Keep the full door approach and southern party-wall corner empty. The taller works party-wall strip is owned by the works and remains blank stone above this roof.

**public front:** `F/DYERS_ALLEY_WEST_N`; zone `DYERS_ALLEY`, `west` edge, x=46, y=21.990..30.240; a increases +y. **Observed L×D×H:** 8.250 × 4.2 × 4.5; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.65; observed baseline, with the named revision above proposed separately.

Material assignment: `quiet_residential_cut_stone`; wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.300 m at a=0**, **1.300 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_WINDOW_S` | `ASMB_SCREEN_WINDOW` | 1.800 | 0.850 / 2.250 |
| `BAY_DOOR` | `door_residential_timber` | 4.125 | 0.000 / 2.250 |
| `BAY_WINDOW_N` | `ASMB_SCREEN_WINDOW` | 6.450 | 0.850 / 2.250 |

| `LOFT_VENT_PROPOSED` | `vent_service` | 4.125 | 3.500 / 3.980 |

**Face totals:** 1 closed doors; 2 windows; 0 sealed architectural arches; 0 shop recesses; 1 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_alley_backs"></a>
### B22 · BLD_ALLEY_BACKS

[Architectural drawing](drawings/BLD_ALLEY_BACKS.svg)

**Composition:** Four evenly distributed high blind niches break a long service enclosure without adding fake access.

Preserve live GROUND_01..04 axes, replace the three truncated pilaster_niche_coverage pieces with full blind niches; all four share sill 1.6/head 3.4. Zero doors/windows. Retain the four existing DYERS_E_RACK anchors and their rack/vessel/vat placements; cloth stays on that edge and does not extend into the path. No balcony, awning, retail sign or new floor stock; base remains quiet between work stations.

**compound/service wall:** `F/DYERS_ALLEY_EAST`; zone `DYERS_ALLEY`, `east` edge, x=53, y=11.760..30.240; a increases +y. **Observed L×D×H:** 18.480 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_niche_coverage_relief`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.600 m at a=0**, **0.600 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `blind_niche` | 1.125 | 1.600 / 3.400 |
| `GROUND_02` | `blind_niche` | 6.535 | 1.600 / 3.400 |
| `GROUND_03` | `blind_niche` | 11.945 | 1.600 / 3.400 |
| `GROUND_04` | `blind_niche` | 17.355 | 1.600 / 3.400 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 4 blind niches; 0 columns/pilasters.


<a id="bld_dye_works_gate"></a>
### B23 · BLD_DYE_WORKS_GATE

[Architectural drawing](drawings/BLD_DYE_WORKS_GATE.svg)

**Composition:** The Dogleg west service wall ends in a tall sealed loading niche, with two high vents and an otherwise quiet working face.

Code owner DYERS_DOGLEG_WEST; retain the existing northmost repaired blind gate at a=12.056 m (M04), not the obsolete ordinary castle-door requirement. Zero traversable doors and zero windows; two vent_service at a=4.2 and 7.0 m, sill 4.15/head 4.63. Suppress other boundary ground/upper repeated bays at this target only. Gate remains backed and closed; service access is elsewhere. No awning, balcony or shop sign. Retain the two vats, wall rack and workstation at existing L34_DOGLEG anchors; keep the inside north turn clear.

Observed code-boundary span: west edge of DYERS_DOGLEG, y=48..62, L=14, wall height from `MASSING_MID_MIXED` = 7 m. Existing registered storeys=2; proposed two-level composition, no new floor. Boundary prefix `ARCH_DYERS_DOGLEG_WEST_BOUNDARY_1`. Grounded base and existing string course; the code-owned silhouette stays fixed. Side/rear residuals follow the common face card.


<a id="bld_dogleg_house"></a>
### B24 · BLD_DOGLEG_HOUSE

[Architectural drawing](drawings/BLD_DOGLEG_HOUSE.svg)

**Composition:** One centered household door and paired windows make the Dogleg east wall read as one dwelling.

Code owner DYERS_DOGLEG_EAST; replace its repeated boundary-bay furnishings with one closed door_residential_timber at a=7.0, two window_dark_recess at a=4.2/9.8 (sill 1.0/head 2.25), and three window_dark_recess above at a=4.2/7.0/9.8 (sill 4.15/head 5.40). Keep the boundary identity plane, contact and story courses and roof. Primary entry is the center door, no collision opening. No balcony, awning, sign or shop stock. Lower end panels and door approach are empty.

Observed code-boundary span: east edge of DYERS_DOGLEG, y=48..62, L=14, wall height from `MASSING_MID_MIXED` = 7 m. Existing registered storeys=2; proposed two-level composition, no new floor. Boundary prefix `ARCH_DYERS_DOGLEG_EAST_BOUNDARY_1`. Grounded base and existing string course; the code-owned silhouette stays fixed. Side/rear residuals follow the common face card.


<a id="bld_hammam"></a>
### B25 · BLD_HAMMAM

[Architectural drawing](drawings/BLD_HAMMAM.svg)

**Composition:** A tall bath hall has one heavy closed entry and high clerestories, with a small service wing across the link.

Replace main GROUND_01 with the existing 2.012 × 2.965 m fortified-door assembly at the same center; keep its high dark window. South wing keeps its existing closed door and high window. One tall hall, no new inhabited upper floor: the existing 7 m massing, not the old storeys=1/upper contradiction, controls available height. No new dome or raised parapet. No balcony, awning, sign or retail props. South service door and main entrance remain closed; keep both approaches free.

**public front:** `F/NORTH_COURT_WEST`; zone `NORTH_COURT`, `west` edge, x=41, y=72.000..76.000; a increases +y. **Observed L×D×H:** 4.000 × 4.8 × 7; registered storeys=1, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `hero_courtyard_beige`; wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.994 m at a=0**, **0.994 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `door_fortified_gate` | 2.000 | 0.000 / 2.965 |
| `STORY_1_WINDOW_01` | `window_dark_recess` | 2.000 | 5.150 / 6.400 |

**Face totals:** 1 closed doors; 1 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.

**secondary/service wing front:** `F/NORTH_COURT_WEST_SOUTH`; zone `NORTH_COURT`, `west` edge, x=41, y=63.440..67.000; a increases +y. **Observed L×D×H:** 3.560 × 4.8 × 7; registered storeys=1, local floor z=0. Roof/parapet setback_flat, existing parapet height 0.75; retain envelope.

Material assignment: `hero_courtyard`; wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.255 m at a=0**, **1.255 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `door_residential_timber` | 1.780 | 0.000 / 2.250 |
| `STORY_1_WINDOW_01` | `window_dark_recess` | 1.780 | 5.150 / 6.400 |

**Face totals:** 1 closed doors; 1 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_north_house_s"></a>
### B26 · BLD_NORTH_HOUSE_S

[Architectural drawing](drawings/BLD_NORTH_HOUSE_S.svg)

**Composition:** A quiet single-storey dwelling faces the court with a centered closed door and paired dark windows.

Retain BAY_DOOR and BAY_WINDOW_S/N exactly. No uppers, balcony, awning, sign or shop goods. Do not add pottery at the threshold from the old brief. The existing east planter belongs to NORTH_COURT and stays at its current anchor. Quiet ends and base, retain the listed cut-stone field and sandstone trim; no whitewash substitution.

**public front:** `F/NORTH_COURT_EAST_S`; zone `NORTH_COURT`, `east` edge, x=53, y=63.440..71.000; a increases +y. **Observed L×D×H:** 7.560 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.250 m at a=0**, **1.250 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_WINDOW_S` | `window_dark_recess` | 1.700 | 1.000 / 2.250 |
| `BAY_DOOR` | `door_residential_timber` | 3.780 | 0.000 / 2.250 |
| `BAY_WINDOW_N` | `window_dark_recess` | 5.860 | 1.000 / 2.250 |

**Face totals:** 1 closed doors; 2 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 0 blind niches; 0 columns/pilasters.


<a id="bld_north_dyers_yard"></a>
### B27 · BLD_NORTH_DYERS_YARD

[Architectural drawing](drawings/BLD_NORTH_DYERS_YARD.svg)

**Composition:** Two blind niches frame a workshop-yard drying rack with service access elsewhere.

Zero doors/windows. Retain the authored two niches and the existing L3R0_NORTH_DYERS_BAY_01 stall, rack, vessels and rug as one bounded work area. ASSET_MARKET_STALL is retained here as a complete existing station, not replaced with a textile booth. Access is the existing surrounding route/off-map works, not either niche. No balcony, awning or extra shop sign; one existing route exit sign is public-space-owned. No new vats at the corner.

**public front:** `F/NORTH_COURT_EAST_N`; zone `NORTH_COURT`, `east` edge, x=53, y=71.000..78.560; a increases +y. **Observed L×D×H:** 7.560 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_cut_stone`; wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.820 m at a=0**, **1.820 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_NICHE_S` | `blind_niche` | 2.345 | 0.700 / 2.500 |
| `BAY_NICHE_N` | `blind_niche` | 5.215 | 0.700 / 2.500 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 2 blind niches; 0 columns/pilasters.


<a id="bld_north_yard_wall_n"></a>
### B28 · BLD_NORTH_YARD_WALL_N

[Architectural drawing](drawings/BLD_NORTH_YARD_WALL_N.svg)

**Composition:** Two high niches continue the court enclosure below an unbroken coping.

Retain BAY_01/02 at thirds; zero doors/windows, no balcony, retail fittings, signs or awnings. Existing north link supplies circulation. Quiet lower wall and both ends; do not add a central gate to fill the axis.

**compound/service wall:** `F/NORTH_COURT_NORTH`; zone `NORTH_COURT`, `north` edge, y=80, x=46.000..52.040; a increases +x. **Observed L×D×H:** 6.040 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_relief`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.488 m at a=0**, **1.488 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 2.013 | 1.300 / 3.100 |
| `BAY_02` | `blind_niche` | 4.027 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 2 blind niches; 0 columns/pilasters.


<a id="bld_north_yard_wall_s"></a>
### B29 · BLD_NORTH_YARD_WALL_S

[Architectural drawing](drawings/BLD_NORTH_YARD_WALL_S.svg)

**Composition:** One high niche ends the southern court enclosure beside the dogleg arrival.

Retain BAY_01; zero doors/windows. No balcony, retail fittings, sign or awning. Keep the narrow turn into the dogleg empty; drainage/base finish belongs to the wall, not a prop pile.

**compound/service wall:** `F/NORTH_COURT_SOUTH`; zone `NORTH_COURT`, `south` edge, y=62, x=41.360..45.560; a increases +x. **Observed L×D×H:** 4.200 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_warmwash_relief`; wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.575 m at a=0**, **1.575 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 2.100 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_link_wall_nw"></a>
### B30 · BLD_LINK_WALL_NW

[Architectural drawing](drawings/BLD_LINK_WALL_NW.svg)

**Composition:** A garden wall gives the north-west approach one centered high niche and a continuous cap.

Retain BAY_NICHE_AXIS, not the old BAY_01 alias. Zero doors/windows, no balcony, shop, sign or awning. Its short returns are part of the same enclosure; preserve the existing repaired full-height niche and surrounding architecture. Entire base and turning space stay empty.

**compound/service wall:** `F/LINK_NORTH_WEST_NORTH`; zone `LINK_NORTH_WEST`, `north` edge, y=81, x=10.560..16.440; a increases +x. **Observed L×D×H:** 5.880 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_warmwash_relief`; wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **2.415 m at a=0**, **2.415 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_NICHE_AXIS` | `blind_niche` | 2.940 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_link_wall_ne"></a>
### B31 · BLD_LINK_WALL_NE

[Architectural drawing](drawings/BLD_LINK_WALL_NE.svg)

**Composition:** A quieter matching garden wall terminates the north-east approach with one high niche.

Retain GROUND_01 identity and raise the niche sill from the generated floor position to 1.3 m/head 3.1, matching the west wall. Zero doors/windows. No new bays, shop, balcony, sign or awning. Retain existing arch/tooling repairs. The nearby dyers workstation is NORTH_COURT-owned; keep it outside the link swept turn.

**compound/service wall:** `F/LINK_NORTH_EAST_NORTH`; zone `LINK_NORTH_EAST`, `north` edge, y=81, x=39.560..45.440; a increases +x. **Observed L×D×H:** 5.880 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_warmwash_relief`; wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **2.415 m at a=0**, **2.415 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `GROUND_01` | `blind_niche` | 2.940 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_spawn_a_wall_w"></a>
### B32 · BLD_SPAWN_A_WALL_W

[Architectural drawing](drawings/BLD_SPAWN_A_WALL_W.svg)

**Composition:** The existing merchant return is the south corner front of the west spice block, not a freestanding compound facade.

Keep the source frontage ID as support ownership; the visible ASSET_SPAWN_A_EXIT_WEST_RETURN supersedes its blind-niche decoration. Suppress that frontage module only where hidden by the return kit. Visible count: one shop recess, zero doors, two shuttered upper windows (local x=-0.75,+0.90; sill 4.3/head 5.6); recess center +0.35 and width 2.1. Retain the kit timber counter and supported cover; zero added signs/balconies. Same block as BLD_SPICE_ROW_W; primary household access is on Spice Street. Keep the gate-side pier clear.

**compound/service wall:** `F/SPAWN_A_NORTH_WEST`; zone `SPAWN_A_COURTYARD`, `north` edge, y=14, x=17.660..20.300; a increases +x. **Observed L×D×H:** 2.640 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_niche_coverage_relief`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Visible bay counts and source-local positions are in the overlay card above; zero additional frontage bays. Keep the support shell and all anchors.


<a id="bld_spawn_a_wall_e"></a>
### B33 · BLD_SPAWN_A_WALL_E

[Architectural drawing](drawings/BLD_SPAWN_A_WALL_E.svg)

**Composition:** A broader south corner front begins the east spice block with one display and one closed entrance.

ASSET_SPAWN_A_EXIT_EAST_RETURN owns the visible skin; suppress the support frontage niche under that kit. Visible count: one recess (local x=-1.5, width 2.3), one door (x=1.35, width 1.2), three upper shutter windows (x=-2.05,-0.35,+1.75; sill 4.3/head 5.6). Retain existing heads and timber attachments. Primary corner access is the closed door. No new signs, balcony, booth or floor goods. Both returns use their existing source frame and anchor, not a guessed 1 m offset from y=14.

**compound/service wall:** `F/SPAWN_A_NORTH_EAST`; zone `SPAWN_A_COURTYARD`, `north` edge, y=14, x=33.720..38.340; a increases +x. **Observed L×D×H:** 4.620 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_ochre_niche_coverage_relief`; wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`; wood/metal use that same profile's existing slots.

Visible bay counts and source-local positions are in the overlay card above; zero additional frontage bays. Keep the support shell and all anchors.


<a id="bld_spawn_b_wall_w"></a>
### B34 · BLD_SPAWN_B_WALL_W

[Architectural drawing](drawings/BLD_SPAWN_B_WALL_W.svg)

**Composition:** A small quiet enclosure wing frames the north arrival without competing with the Rug Gate.

One high niche, zero doors/windows. No balcony, shop, sign or awning. Retain coping and sandstone, with empty lower field and gate return. The central arrival and both existing side links remain legible routes.

**compound/service wall:** `F/SPAWN_B_SOUTH_WEST`; zone `SPAWN_B_COURTYARD`, `south` edge, y=78, x=17.660..20.300; a increases +x. **Observed L×D×H:** 2.640 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_cut_stone`; wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **0.795 m at a=0**, **0.795 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 1.320 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


<a id="bld_spawn_b_wall_e"></a>
### B35 · BLD_SPAWN_B_WALL_E

[Architectural drawing](drawings/BLD_SPAWN_B_WALL_E.svg)

**Composition:** A longer quiet enclosure wing balances the northern gate arrival with one offset-in-plan but centered-on-wall niche.

One high niche, zero doors/windows. No balcony, shop, sign or awning; no added symmetry props. Retain the 3.74 m span, current material and roof screen; the open gate and north backdrop carry the scene.

**compound/service wall:** `F/SPAWN_B_SOUTH_EAST`; zone `SPAWN_B_COURTYARD`, `south` edge, y=78, x=34.600..38.340; a increases +x. **Observed L×D×H:** 3.740 × 0.96 × 4.9; registered storeys=1, local floor z=0. Roof/parapet flat_parapet, existing parapet height 0.45; retain envelope.

Material assignment: `quiet_residential_relief`; wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`; wood/metal use that same profile's existing slots.

Reserved end fields to lower assemblies: **1.345 m at a=0**, **1.345 m at a=L** (measured to the scheduled module envelope; integral high awnings measured separately).

| Stable bay suffix | Assembly (quantity 1 each) | a | S / H |
|---|---|---:|---:|
| `BAY_01` | `blind_niche` | 1.870 | 1.300 / 3.100 |

**Face totals:** 0 closed doors; 0 windows; 0 sealed architectural arches; 0 shop recesses; 0 vents; 1 blind niches; 0 columns/pilasters.


## Public-space and route cards (25)

Each existing zone ID is its public-space owner. Paving, freestanding active dressing, cover, residual collision-wall fields, connector cut edges and short returns are included. Frontage faces defer to their BLD card; no second facade is added. `open` means no treatment geometry. On a partially open edge, apply finish **only to the existing supported wall intervals**, never across the union of adjoining traversal surfaces. Baseline boundaries remain; E1/G1 and S1/S2 are the only spatial alternatives here. They require separate approval and the README tests.

`ASMB_GROUND_FINISH` means retain the authored surface and floor material, resolve material transitions and contact wear at the existing footprint edges. Drainage here is existing joints and localized flush stain, not excavated channels or collision. New trim stays off every opening/turn, including the inner line of diagonal movement. World rect is (x,y,w,h); along for east/west walls increases y, for north/south walls x. Linear passage floors increase toward their destination; stair/ramp elevation follows source y.

<a id="spawn_a_courtyard"></a>
### P01 · SPAWN_A_COURTYARD

Observed rect **(17,0,22,14)**, surface `SURFACE_SPAWN_A_COURTYARD`, material `large_sandstone_blocks_01`, authored clear width **6 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-spawn-a-courtyard`.

Open civic arrival. Retain the central spawn cover at SPAWN_A_COVER_01, all spawn points, south gate and two side kits. North returns belong to the Spice blocks. Retain existing paving and worn center; no center stalls, extra palms or canopy. Drain/base finish stops before both side-link mouths and the main portal. OWN records resolve the four walls.

Edge ownership: north: BLD_SPAWN_A_WALL_W, BLD_SPAWN_A_WALL_E; east: sealed_perimeter; south: sealed_perimeter; west: sealed_perimeter. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="spice_street"></a>
### P02 · SPICE_STREET

Observed rect **(21,14,12,18)**, surface `SURFACE_SPICE_STREET`, material `spice_laid_stone_01`, authored clear width **6 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-spice-street`.

Retain two existing overhead spans and three laundry lines via OWN_OVERHEAD. Three west counters establish the busy edge; wholesale stock stays east. Retain COVER_SPICE_01 and all its physical cover. Ground transitions at y=14 and y=32 use the existing paving boundary, no raised threshold. No middle-lane goods or new suspended signs.

Edge ownership: north: open_traversal_face; east: BLD_SPICE_ROW_E; south: open_traversal_face; west: BLD_SPICE_ROW_W. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="fountain_court"></a>
### P03 · FOUNTAIN_COURT

Observed rect **(20,32,16,16)**, surface `SURFACE_FOUNTAIN_COURT`, material `patterned_cobblestone`, authored clear width **6 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-fountain-court`.

Retain fountain LMK_FOUNTAIN_01 at (24.5,43.5), 3 m footprint/1.32 m high; retain PALM_FOUNTAIN_01 and COVER_FOUNTAIN_01. Keep x=26..32 rotation lane and both mid-link entry cones clear. Retain two existing planters, tea table/stools and southwest market spill at their B7 anchors; no extra radial planter pair. Retain the existing complete ASSET_MARKET_STALL, not a textile booth. Patterned paving continues around fountain, contact wear only; no new basin step, curb or fountain relocation.

Edge ownership: north: architectural_cut_edge; east: BLD_MERCHANT_HOUSE, BLD_MERCHANT_HOUSE; south: architectural_cut_edge; west: BLD_MADRASA, BLD_MADRASA. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="textile_arcade"></a>
### P04 · TEXTILE_ARCADE

Observed rect **(24,48,11,16)**, surface `SURFACE_TEXTILE_ARCADE`, material `cobblestone_color`, authored clear width **6 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-textile-arcade`.

Retain COVER_TEXTILE_01 and east north cart. Three arch axes face the same axes across the lane. Overhead canopy/laundry and S2 roof order compress the passage; G1 separately tests one southern return. Keep the north reveal quiet. No new center rugs or piers. Keep cobblestone boundaries at y=48/64; edge contact dirt follows existing walls, not a full-width strip.

Edge ownership: north: short_wall_return; east: BLD_RUG_ARCADE_E; south: open_traversal_face; west: BLD_RUG_ARCADE_W. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="rug_gate"></a>
### P05 · RUG_GATE

Observed rect **(21,64,13,14)**, surface `SURFACE_RUG_GATE`, material `patterned_cobblestone`, authored clear width **6 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-rug-gate`.

Retain LMK_RUG_GATE_01 portal and COVER_RUG_01; OWN_RUG_GATE owns its soffit, abutments and approach. Keep north arrival open; do not close the actual portal like a shop arch. The west merchant display and quiet east house suffice. Retain paving under the gate with a material seam only at existing transitions; no change in thresholds or elevation.

Edge ownership: north: open_traversal_face; east: BLD_GATE_KEEPER, BLD_GATE_KEEPER; south: architectural_cut_edge; west: BLD_RUG_MERCHANT. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="spawn_b_courtyard"></a>
### P06 · SPAWN_B_COURTYARD

Observed rect **(17,78,22,14)**, surface `SURFACE_SPAWN_B_COURTYARD`, material `large_sandstone_blocks_01`, authored clear width **6 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-spawn-b-courtyard`.

Quiet receiving court. Retain SPAWN_B_COVER_01 and every spawn; no market rows or extra overhead. The two south enclosure wings and OWN_NORTH_VISTA frame the approach. North/east/west remaining boundary fields receive quiet finish; keep all current openings sealed. Existing paving stays continuous, no new curbs.

Edge ownership: north: sealed_perimeter; east: sealed_perimeter; south: BLD_SPAWN_B_WALL_W, BLD_SPAWN_B_WALL_E; west: sealed_perimeter. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="service_south"></a>
### P07 · SERVICE_SOUTH

Observed rect **(3,10,7,20)**, surface `SURFACE_SERVICE_SOUTH`, material `large_sandstone_blocks_01`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-service-south`.

Quiet service route; retain L34_SERVICE_SOUTH_BASKET_01 and L34_SERVICE_SOUTH_POTTERY_01 active placements at their edges. No stalls. West and south sealed walls use stone contact/coping with zero openings. East three high panels belong to BLD_SPICE_BACKS. Drain stain follows the base only; no trench across either connector mouth.

Edge ownership: north: open_traversal_face; east: BLD_SPICE_BACKS; south: sealed_perimeter; west: sealed_perimeter. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="caravan_court"></a>
### P08 · CARAVAN_COURT

Observed rect **(3,30,12,18)**, surface `SURFACE_CARAVAN_COURT`, material `red_sandstone_pavement`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-caravan-court`.

Retain LMK_CARAVAN_DISTRICT crate stack, L34_CARAVAN_CART_01, COVER_CARAVAN_01, loading shade and pack line. North edge stack stays south of ramp mouth; nothing expands inward or into receiving-door service volumes. Red sandstone paving meets the ramp with a flush existing transition. Stairs/ramp support faces belong to their zone cards. No new storage sheds or shade posts in the court.

Edge ownership: north: short_wall_return; east: BLD_CARAVAN_YARD_WALL_S, BLD_CARAVAN_YARD_WALL_N; south: architectural_cut_edge; west: BLD_CARAVAN_STORES. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="service_north"></a>
### P09 · SERVICE_NORTH

Observed rect **(3,48,7,32)**, surface `SURFACE_SERVICE_NORTH`, material `large_sandstone_blocks_01`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-service-north`.

Long quiet service run below the terrace. Retain all existing geometry and the three east-spine cards; west/north sealed perimeter stays zero openings. No extra containers, benches, lamps or overhead. Continue existing sandstone paving to the north-link turn. Base stains may collect in current joints, never a new drainage obstruction.

Edge ownership: north: sealed_perimeter; east: BLD_STORES_BACK, BLD_TEA_HOUSE_BACK, BLD_NORTH_YARD_WALL; south: open_traversal_face; west: sealed_perimeter. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="tea_ramp"></a>
### P10 · TEA_RAMP

Observed rect **(11,48,8,8)**, surface `SURFACE_TEA_RAMP`, material `large_sandstone_blocks_01`, authored clear width **4 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-tea-ramp`.

Retain the 8 m north-rising ramp, z=0..1.4, slope 0.175. East/west retaining faces and south entry cut get existing stone base and flush coping; zero doors/windows/props. Keep entire transition and inside corners clear; no stool, crate, hanging cloth or new rail foot. Retain the two TEA_RAMP_SIGN anchors and current signs; do not duplicate them on the house.

Edge ownership: north: open_traversal_face; east: retaining_wall; south: architectural_cut_edge; west: retaining_wall. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="tea_terrace"></a>
### P11 · TEA_TERRACE

Observed rect **(11,56,8,10)**, surface `SURFACE_TEA_TERRACE`, material `patterned_cobblestone`, authored clear width **4 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-tea-terrace`.

Retain z=1.4 walking surface and its west retaining wall. Retain LMK_TEA_TERRACE_01 tea-service/table/three stools and L34_TEA_STALL_01 at their exact source transforms, plus COVER_TEA_01. No new seating. Keep the existing route-owned high shade. Serving recess is the commercial focus; walkway center and stair/ramp transitions stay empty. Use existing patterned paving; a material seam marks arrival, no extra step.

Edge ownership: north: open_traversal_face; east: BLD_TEA_HOUSE; south: open_traversal_face; west: retaining_wall. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="tea_stairs"></a>
### P12 · TEA_STAIRS

Observed rect **(11,66,8,6)**, surface `SURFACE_TEA_STAIRS`, material `large_sandstone_blocks_01`, authored clear width **4 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-tea-stairs`.

Retain the six-metre descending ramp collider and ten visual stair treads, z=1.4..0. Keep all tread/riser/nosing profiles and ground contact unchanged. Both stair sides get quiet existing retaining stone, zero openings/props. No rugs, planters, drain grates or new brackets at the top/bottom landing or inside line.

Edge ownership: north: open_traversal_face; east: retaining_wall; south: open_traversal_face; west: retaining_wall. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="tea_landing"></a>
### P13 · TEA_LANDING

Observed rect **(11,72,8,4.5)**, surface `SURFACE_TEA_LANDING`, material `large_sandstone_blocks_01`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-tea-landing`.

Retain flat z=0 landing and the existing west retaining run. Its short north return receives continuous contact/coping only; east and south stay open. No props or doorlike panels. The 4.5 m width carries into LINK_WEST_UPPER; neither material boundary adds a step.

Edge ownership: north: short_wall_return; east: open_traversal_face; south: open_traversal_face; west: retaining_wall. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="dyers_alley"></a>
### P14 · DYERS_ALLEY

Observed rect **(46,10,7,22)**, surface `SURFACE_DYERS_ALLEY`, material `patterned_cobblestone`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-dyers-alley`.

Retain two ASSET_DYERS_WORKSTATION placements at L34_DYERS_ALLEY_VAT_01/02, the pottery anchor, and the four east wall rack clusters. Density belongs to those stations; keep the middle 4.5 m and each approach empty. Preserve south sealed wall with no doors/windows, base staining only. Do not add drains or geometry across the route. Paving stays patterned; local dye wear follows actual workstation footprints.

Edge ownership: north: open_traversal_face; east: BLD_ALLEY_BACKS; south: sealed_perimeter; west: BLD_DYE_WORKS, BLD_DYERS_HOUSE. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="covered_souk"></a>
### P15 · COVERED_SOUK

Observed rect **(41,32,12,16)**, surface `SURFACE_COVERED_SOUK`, material `court_limestone_flags_01`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-covered-souk`.

Retain COVER_DYERS_01 and the LMK_DYERS_DISTRICT vessels/basket, west rug/cart and east process vessel. OWN_OVERHEAD owns the existing cloth span. The 5 m north structural wall (x=41..46,y=48) is an arcade end wall: retain its identity plane/contact/course/roof, suppress duplicate generic boundary openings, zero doors/windows, one quiet stone field. Do not add a frontage there. No cloth or vats in the west-mid-link turn; existing limestone flags mark the sheltered public floor.

Edge ownership: north: system_articulated_boundary; east: BLD_DYERS_ARCADE_E; south: BLD_SOUK_YARD_WALL; west: BLD_DYERS_ARCADE_W, BLD_DYERS_ARCADE_W. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="dyers_dogleg"></a>
### P16 · DYERS_DOGLEG

Observed rect **(46,48,7,14)**, surface `SURFACE_DYERS_DOGLEG`, material `cobblestone_color`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-dyers-dogleg`.

Retain L34_DOGLEG_WALL_RACK_01, vats 01/02 and WORKSTATION_01 at their current edge positions; retain the existing dyers line. West service wall and east dwelling are separate physical owners. North/south passages stay open; no signs, extra canopies or turn props. Cobblestone follows the existing route; contact wear belongs beside work, not across the lane.

Edge ownership: north: open_traversal_face; east: system_articulated_boundary; south: open_traversal_face; west: system_articulated_boundary. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="north_court"></a>
### P17 · NORTH_COURT

Observed rect **(41,62,12,18)**, surface `SURFACE_NORTH_COURT`, material `court_limestone_flags_01`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-north-court`.

Retain PALM_NORTH_01, COVER_NORTH_01, L3R0_NORTH_* drying/stall/rug/exit-sign set, L34_NORTH_WORKSTATION_02 and L34_NORTH_PLANTER_EAST. No extra textile booth or second market shed. Retain the shared drying line; open court center is the release after the dogleg. Limestone flags meet side links flush. Preserve inside north-west and north-east turns through the whole body sweep.

Edge ownership: north: BLD_NORTH_YARD_WALL_N; east: BLD_NORTH_HOUSE_S, BLD_NORTH_DYERS_YARD; south: BLD_NORTH_YARD_WALL_S; west: BLD_HAMMAM, BLD_HAMMAM. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_west_mid"></a>
### P18 · LINK_WEST_MID

Observed rect **(15,36,5,5)**, surface `SURFACE_LINK_WEST_MID`, material `cobblestone_pavement`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-west-mid`.

Five-metre passage between Caravan Court and Fountain Court. Both long walls are connector returns, zero openings/props/signs; match the adjoining owner on each side and stop finishes at the open ends. Keep the existing cobblestone transition and 3.5 m route. No arch, shop, overhead or new drain across it.

Edge ownership: north: architectural_cut_edge; east: open_traversal_face; south: architectural_cut_edge; west: open_traversal_face. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_east_mid"></a>
### P19 · LINK_EAST_MID

Observed rect **(36,39,5,5)**, surface `SURFACE_LINK_EAST_MID`, material `cobblestone_pavement`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-east-mid`.

Five-metre passage through the central merchant block. North/south walls belong to that same block, zero openings/props; use continuous quiet plaster over the existing stone base. East/west remain completely open. No new door, merchandise, canopy or curb. M01 verifies existing shared-shell ownership and exposed strips where the two frontage masses meet the connector; duplication is not an established current bug.

Edge ownership: north: architectural_cut_edge; east: open_traversal_face; south: architectural_cut_edge; west: open_traversal_face. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_west_upper"></a>
### P20 · LINK_WEST_UPPER

Observed rect **(19,72,2,4.5)**, surface `SURFACE_LINK_WEST_UPPER`, material `cobblestone_pavement`, authored clear width **4.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-west-upper`.

Two metres is passage LENGTH east-west, not its walking width: the north-south opening is 4.5 m. Keep the short north/south returns blank with existing coping. No brackets, pots, signs or door. Preserve the flat z=0 junction from Tea Landing into Rug Gate.

Edge ownership: north: short_wall_return; east: open_traversal_face; south: short_wall_return; west: open_traversal_face. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_east_upper"></a>
### P21 · LINK_EAST_UPPER

Observed rect **(34,67,7,5)**, surface `SURFACE_LINK_EAST_UPPER`, material `cobblestone_pavement`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-east-upper`.

Seven-metre passage from Rug Gate to North Court. Quiet north/south walls, zero openings/props/signs; retain cobblestone and open east/west ends. Paving change is a flush material joint, not a sill. Do not add a shop to either return or narrow the 3.5 m route.

Edge ownership: north: architectural_cut_edge; east: open_traversal_face; south: architectural_cut_edge; west: open_traversal_face. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_south_west"></a>
### P22 · LINK_SOUTH_WEST

Observed rect **(10,8,7,5)**, surface `SURFACE_LINK_SOUTH_WEST`, material `large_sandstone_blocks_01`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-south-west`.

Quiet seven-metre service connector. Keep north/south walls and the existing short west return; all receive wall/base/coping finish, zero openings. Both route mouths retain their existing cuts. No awning or stored goods, including against the inside south turn.

Edge ownership: north: architectural_cut_edge; east: open_traversal_face; south: architectural_cut_edge; west: short_wall_return. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_south_east"></a>
### P23 · LINK_SOUTH_EAST

Observed rect **(39,8,7,5)**, surface `SURFACE_LINK_SOUTH_EAST`, material `large_sandstone_blocks_01`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-south-east`.

Quiet seven-metre dye-works connector. Keep north/south walls and short east return with zero openings and no stock. Match the Spawn-A works at its corner then use the alley wall family. Preserve clear 3.5 m and existing paving; no new painted doorway or threshold.

Edge ownership: north: architectural_cut_edge; east: short_wall_return; south: architectural_cut_edge; west: open_traversal_face. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_north_west"></a>
### P24 · LINK_NORTH_WEST

Observed rect **(10,76,7,5)**, surface `SURFACE_LINK_NORTH_WEST`, material `large_sandstone_blocks_01`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-north-west`.

Quiet approach to BLD_LINK_WALL_NW. That card owns the north high niche; the three short remaining returns get the same contact/coping finish, zero openings/props/signs. Retain all cuts. No new arcade or lattice to fill gaps at the landing turn.

Edge ownership: north: BLD_LINK_WALL_NW; east: short_wall_return; south: short_wall_return; west: short_wall_return. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

<a id="link_north_east"></a>
### P25 · LINK_NORTH_EAST

Observed rect **(39,76,7,5)**, surface `SURFACE_LINK_NORTH_EAST`, material `court_limestone_flags_01`, authored clear width **3.5 m**. One ASMB_GROUND_FINISH schedule; existing surface geometry retained. Review unit `unit-link-north-east`.

Quiet approach to BLD_LINK_WALL_NE. North niche and its return finish frame the route; other short returns stay blank with no doors/windows. Keep the existing North Court workstation outside the actual swept turn. No added awning, stall or screen on the link.

Edge ownership: north: BLD_LINK_WALL_NE; east: short_wall_return; south: short_wall_return; west: short_wall_return. All unscheduled supported fragments receive ASMB_WALL_FINISH with zero openings; named code/kit overlays take precedence. No assembly spans an open fragment.

## Additional owned architecture (9)

These `OWN_*` IDs are proposed ownership labels only. Existing anchor IDs, runtime selectors and asset IDs are retained. They close inventory gaps without another system. Whole existing kits are complete reusable assemblies; use their source constants when retained, not new individual-stone placements.

<a id="own_spawn_a_gate"></a>
### O01 · OWN_SPAWN_A_GATE

**Bab al-Suq, sealed south public front.** Retain `ASSET_SPAWN_A_GATE` ×1 at `LMK_SPAWN_A_GATE_01`, placement `PLACE_SPAWN_A_GATE`. Source `propFamilies/spawnAGate.ts`; canonical envelope 21.9 wide ×2.2 deep ×12 high. The front faces north; source local horizontal is used unchanged through the existing anchor transform. Existing single closed monumental gate on axis, 5.2 m clear arch width/spring 3.6; one integral closed wicket, four high slit windows (two per flank), four blind arcades, one screened oriel at z=7.32..9.12 with existing brackets. No accessible balcony; guard-room access is internal/off-map. Retain all stone courses, corners, flanking fountain details, barred leaves, inscription and parapet (turret top 11.9); no extra sign, shop or awning. Sides and rear are blank stone, zero doors/windows, all existing returns/caps retained. Lower field stays quiet. No open exit to the south. M05 before further detailing; do not reuse its old low-clutter exemption.

<a id="own_spawn_a_west_backs"></a>
### O02 · OWN_SPAWN_A_WEST_BACKS

**Three domestic rear parcels, one retained assembly.** `ASSET_SPAWN_A_WEST_BACKS` ×1 / `PLACE_SPAWN_A_WEST_BACKS` / `LMK_SPAWN_A_WEST_BACKS_01`; source `propFamilies/spawnAWestBacks.ts`. Envelope 8 ×2.2 ×9.8 m, court-facing rear at x=17, y=0..8. Source local x increases toward design south, so do not reverse the parcels from a camera.

| Physical parcel (local x bounds) | Existing visible rear composition | Access / remaining faces |
|---|---|---|
| North: -4..-1.5 (2.5 m) | 0 doors, 0 ordinary windows, one closed screened oriel at x=-2.85, width 2.04, z=4.55..6.45; existing brackets. Eaves 8.35, parapet 9.25. | Public entrance is off-map west, not a new route. Two side faces/party wall and unseen front retain blank plaster, zero new openings. |
| Middle: -1.5..1.2 (2.7 m) | 0 doors, 1 shuttered window at x=-0.15, width .96, sill4.3/head5.6; eaves6.95, parapet7.75. | Off-map front access. Existing shared party piers at -1.5/1.2, plain side/front faces. |
| South: 1.2..4 (2.8 m) | 1 closed rear service door x=2.9, width1.24/head2.28; 2 shuttered windows x=2.35/3.62, width .96, sill4.3/head5.6; eaves5.85/parapet6.5. | Off-map primary entrance; rear service door stays sealed. Plain side/front faces. |

Keep the shared base .72, string 2.45..2.9, quiet plaster and all existing roof/coping. No shops, awnings, balconies, signs or extra stock. Retain existing integral dressing only after M05 body check; hidden faces receive no duplicate geometry. These real parcel breaks, not compass directions, justify three domestic compositions.

<a id="own_spawn_a_dye_works"></a>
### O03 · OWN_SPAWN_A_DYE_WORKS

**Boiler house and attached drying-yard rear.** Retain `ASSET_SPAWN_A_EAST_DYE_WORKS` ×1 / `PLACE_SPAWN_A_EAST_WORKS` / `LMK_SPAWN_A_EAST_WORKS_01`; source `propFamilies/spawnAEastDyeWorks.ts`. 8 ×2.4 ×12.8 m envelope, local x increases design north on the court's east wall. House local x=-4..-.5: one bricked arch x=-1.55, width2.1, spring2.55/apex3.95; 0 doors/windows, 2 high vents x=-3.5/z6.35 and x=-.95/z6.05. Yard x=-.5..4: one closed loading door x=1.15,width2/head2.85, 0 windows. Primary operational access is off-map; this rear door remains closed. Two existing drying rails at z5.35 and4.15 with respectively four and three brackets, cloth never below z3.05; no new awning or balcony. Keep boiler eaves8.85/parapet9.7, yard eaves5.95/parapet6.6 and chimney12.55. Retain warm masonry, soot only around flue, actual rail garments, plain side/rear returns and existing roofs. No retail sign, textile booth, new vats or open gate.

<a id="own_spice_gate"></a>
### O04 · OWN_SPICE_GATE

**Open district threshold.** Retain `ASSET_SPICE_GATE` ×1 at `LMK_SPICE_GATE_01`, `PLACE_SPICE_GATE`; canonical 12.8 ×1.9 ×9.1 m, source `propFamilies/spiceGate.ts`. One open portal, zero doors and two through-windows (two visible on each elevation) at source-local x=±5.36, width .66, sill6.4/head7.35; outer side faces have zero openings. Keep source shutters/reveals and two supported lamp brackets at z5.5. Arch spring4.62, rise2.3; coping8.8. Access to the bridge level is off-map; no new stair or balcony. The obsolete source comment saying four openings is not the active two-position array. Both north/south elevations, soffit, jamb side faces and crown belong here. Retain geometry, materials, attachments and route-bearing threshold exactly; corner returns belong to the two Spice owners. Primary passage is the existing 12 m throat. No hanging stall, new cloth, added arch thickness or changed supporting pier. Keep current inscription/sign hierarchy subordinate to the portal. No balcony or accessible upper platform.

<a id="own_rug_gate"></a>
### O05 · OWN_RUG_GATE

**Open northern market threshold.** Retain `ASSET_HERO_ARCH` ×1 / `PLACE_RUG_ARCH` / `LMK_RUG_GATE_01`, envelope 13 ×.8 ×6.8 m and all `pushRugGateStructuralFinish` / `pushRugGateWestWallCoping` output. One playable portal; zero doors and zero windows on either elevation or either return. Both elevations, soffit, crown, flanking attachment cloth and abutments are one composition. Existing blue accent identifies the gate; no new sign or retail counter. Keep all integral architectural ornament at its existing deterministic positions, support cloth at its existing attachments, no added balcony/roof-access cue. Preserve the north sightline and ground plane. Retain the repaired arch profile; never substitute the booth arch dimensions.

<a id="own_north_vista"></a>
### O06 · OWN_NORTH_VISTA

**Closed receiving-house backdrop beyond Spawn B.** Retain `ARCH_RUG_GATE_CROWN_BACKDROP:*`, `pushRugGateCrownBackdrop`. Three overlapping grounded facade planes, three offset mass groups, 2 closed side doors (1.55 ×2.65 m at centerX ±.3×width), 1 backed decorative central arcade and 0 new windows. Width/height/offsets remain the function's expressions from the existing Rug Gate and y=92 north perimeter; do not copy inferred transforms into the spec. Quiet side/back walls and stepped flat roofs remain as built, zero added openings or roof props. No balcony, new awning, sign or exposed interior; the closed doors imply off-map receiving access only. No geometry enters the playable gate view corridor or opens the north boundary.

<a id="own_overhead"></a>
### O07 · OWN_OVERHEAD

**Shared supported shade and drying structures.** Retain six `ASSET_CLOTH_CANOPY` and eight `ASSET_LAUNDRY_LINE` instances at their exact active anchors; the complete list is in assets. Shared ownership prevents both street faces adding the same rope. Each has two attachment ends, resolved load path, bound hem and restrained sag. M03 verifies masonry/roof support and minimum cloth height before adaptation; do not invent a floating ledger or new route post. Roof attachments follow the finite M03 options in assets.md; revisions outside existing envelopes are class M/L. Preserve or improve sky gaps; no new variants, spans or added hanging goods. Bay awnings belong to their shops and are not counted here. Covered Souk north structural end wall belongs to COVERED_SOUK; it does not need another arch bay.

<a id="own_city_boundary"></a>
### O08 · OWN_CITY_BOUNDARY

**Continuous outer enclosure and interstitial support walls.** Own the four `exterior_wall_patches` at x=0/56, y=0/92 and code-generated boundary/support wall fragments not visibly owned by a named card. Preserve their extents, height, collision, roof closure and every cut. Zero new doors/windows; existing boundary is deliberately sealed. Apply ASMB_WALL_FINISH to their exposed portions, turning base/coping around corners and tying them into the nearest same-material support course. Inset quiet panels only; no fake storefronts, signs, balconies, canopy poles or freestanding stock. Top and outboard faces retain rough masonry; no detailed interior faces behind opaque buildings. `buildBlockout.ts` boundary/support/perimeter coping output is evidence of this group, not a new facade schedule.

<a id="own_city_backdrop"></a>
### O09 · OWN_CITY_BACKDROP

**Four city belts, 120 massing shells total.** Retain `resolveBackgroundShellPlacements` and its deterministic order: rings0..3 contain south/north 4/5/6/7 shells each, west/east 6/7/8/9 each, plus four corner shells per ring (24+28+32+36=120). Each existing shell keeps its `shellIndex`, profile, dimensions, walls, roof/crown, water tank if present, and material assignment. Three existing minaret flags (ring0: north last, east penultimate, south slot1) remain; no new minaret or dome. Primary city-facing surfaces are quiet masonry, side/rear/exposed party faces equally resolved; **zero ground doors/windows added**; selected near-city upper closures remain conditional on exact visible shell IDs at M07, retain existing roof/tank/minaret details as part of the group. No accessible floors, foreground goods, balconies, awnings or signs. Keep sealed background ground and roof continuity, existing profile heights (party9.5/terrace11.15/rearStep8.35/tower13.45 before existing ring/jitter rules), and all silhouette gaps. These are retained group rules, not permission to regenerate random variants or force every building to the same height.

## Suppression boundary and finish line

Each card's replacement affects only that owner and named bay/segment. `ASMB_*` definitions specify old assembly selectors. Retain masonry frames, massing, anchors and collision unless the card explicitly replaces a **visual** frame; never suppress an entire frontage to remove a counter. Quiet-face suppressions select generic return detail under that face's massing ownership, never another named public face or shared structural plane.

A building is complete only when its listed faces and inherited side/rear/roof treatments, integral goods, local ground junctions and adjacent route are reviewed. A retained assembly is a concrete design choice, not a claim of existing approval. The inventory stops here; no individual stone, board or trim receives its own task.
