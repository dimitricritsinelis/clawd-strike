# Bazaar design atlas

**Revision 3 / proposed / 2026-09-04. Design review only. No implementation approval.**

Open the revised 56-page A3 [design atlas](design-atlas.pdf), then [spatial and building schedules](buildings.md), [asset assignments](assets.md) and [reference register](references.md). The independent [design-review.md](design-review.md) remains intact. This revision answers its findings; it does not adopt every recommendation.

![Primary artistic authority: founding Bazaar street](../refs/bazaar_main_hall_reference.png)

## Concrete revision

Keep the three-route survival graph. Make the market read as an occupied street through broad stepped roof volumes, close supported awnings, distinct businesses and alternating shade and open courts. Propose one bounded Tea overlook and one optional Fountain-to-Textile return for graybox comparison. Neither is a cosmetic change. Do not add a second elevated route or a new east connector without evidence from that comparison.

The first complete-building pilot becomes **B18 / BLD_DYERS_ARCADE_E**, after the graybox decision. Its three businesses, actual approved booth, shared shade, roof and outer corners test the commercial architecture that the founding image demands. B21 is corrected as a later domestic study; a screen replacement alone cannot validate a whole building.

## Inventory and authority

69 owner records remain: 35 building/wall records, 25 public spaces and nine additional groups. All 38 frontage spans and 36 registered assets keep explicit dispositions. B04/B17 still share one of the 34 building sheets. Inventory coverage is not design approval. Unselected buildings retain their measured baseline until their named measurement gates close.

| File | Owns |
|---|---|
| [buildings.md](buildings.md) | Spatial proposals S1/S2, E1/G1, roof datums, owner/use relationships, individual schedules |
| [assets.md](assets.md) | Finite constructions, 1:1 fit, shade attachment decisions, named pilot exports and suppressions |
| [references.md](references.md) | Founding-image interpretation, secondary concept limits and unchanged image provenance |
| [overview.svg](overview.svg) | Route composition, encounter alternatives and dimensional relationships |
| [assembly-fit.svg](assembly-fit.svg) | Central shared ownership, booth profile and pilot working section |
| [design-atlas.pdf](design-atlas.pdf), `drawings/*.svg` | Derived proposed drawings; dimensions and notes distinguish baseline from revisions |
| [Live spec](../specs/map_spec.json) | Implemented geometry, transforms, traversal, anchors and constraints |

Inspected branch **dev-4**, HEAD **f0dab246d209705ee038290c1cd6d40c9b3daed4**. Spec SHA-256 **eb1dcf02c1b550272f7b08588150049eb5ed41cf767382fc342ff7d259384d4f**, matching the existing compiled map. The previous atlas's `6a34462` snapshot is historical. Existing worktree edits, deleted repair script, booth assets, shared arch/shell repairs, tooling and all reference images are preserved.

The founding image outranks R01-R08. Its useful relationships are close trade edges, broad staggered upper rooms, overlapping awnings/cloth, a clear path and a distant arch. Its ambiguous rope anchors, stock in walking space and generated lettering are not construction instructions. Warm daylight with readable shade is settled; exact light settings remain a later measured treatment.

## Scope classes

| Class | Proposed work | Consequence / authorization still needed |
|---|---|---|
| C: cosmetic and assembly | Trade-specific cabinets, closures, flush finish, use-based wear, closed access cues; measured supports inside retained envelopes | Must still fit the full moving body and represent retained collision. No new playable access. |
| M: massing and silhouette | S1 Spice parcel roofs, S2 Textile roof order, B21 roof composition, B18 broad roof-access volume, selective near-city occupation | Changes silhouette, visual occlusion and potentially shadows. Separate from C; compare views and threat readability before integration. |
| G: layout, collision and sightlines | E1 Tea screen opening/parapet; G1 Fountain-to-Textile return | Explicit collision/LOS changes. E1 preserves floor grades but changes the elevated combat relationship. Approve a graybox task first. |
| L: lighting | Warm sun/material balance, readable bounced shade, local background contrast | No numerical sun/exposure/bounce change is approved. Compare matching moving-bot samples; no orange overlay or crushed shade. |

All dimensions in this package are metres. Observed values come from source or a static in-memory architecture evaluation. Proposed dimensions are design choices, not measured fit. Static roof drawings omit unrelated boundary and prop meshes; they do not prove complete runtime sightlines.

## Review findings: disposition and evidence

| Finding | Revision / rejection / test |
|---|---|
| P0-A Complete visible buildings | Adopt. All sheets now distinguish shell from actual roof profile. Context/access and critical sections are explicit for B04/B17, B12/B14-B16, B18, B21 and B24/B26. B18 has complete exterior/export ownership. Do not invent hidden rooms as production geometry. M01/M02 close mounting details. |
| P0-B Raised corridor | Confirmed: 192/3,148 m² of zone rectangles participate in Tea's rise, 80 m² flat at +1.4; not a quality score. E1 opens y=58..61 in the western screen to a parapet top +2.50. Ground bots gain a reciprocal angle; both end approaches remain. Reject stacked bridges for this batch: the resolver is a height field. Defer a second Dogleg platform until E1 demonstrates a useful decision. |
| P0-C Survival routes | Keep the existing graph; no authored dead-end zone does not prove good combat. G1 is a 4 × 1 × 2.4 m return at x=24..28, y=48..49, leaving a nominal 7 m passage. It breaks selected western rays, not the entire x=24..33 aligned strip. Test retreat/reload behavior before adding it. Defer the Textile-to-Dogleg connector: no demonstrated trap yet. |
| P1-D Cover | Keep eight cover anchors, two spawn covers and fountain in the baseline. Nominal tops 1.1-1.3 m do not certify crouch or bullet protection. M06 records collider and visible tops plus both eye rays and weapon rays, from reciprocal approach angles, for all 11 objects. No generic tall-crate rollout. |
| P1-E Skyline | Adopt S1/S2's broad parcel volumes and actual roof sections. Source evaluation puts Spice west's cap at +10.668, east +7.518, Tea +12.068, B18 +7.468; wall heights alone omitted these. Keep low eastern release except the selected Spice end room. No universal height increase. |
| P1-F Unsupported shade | Confirmed height mismatch, not proof that every endpoint floats. Spice east ties 5.55-6.10 exceed its 4.5 m wall and 5.59 m parapet cap. Assets now assign backed roof brackets or lower ties per endpoint. M03 measures the real receiving material, lateral reach, sag and opening gaps; fixed endpoints are no longer absolute. No route poles. |
| P1-G Blank faces / implausible use | Replace blanket blank-face suppression with per-owner retain/remove choices. B14 becomes sealed retaining inspection panels, not 2.5 m-high under-terrace stores. B24/B26 are facade reliefs on implied off-map volumes. B21 retains human-scale openings and a 4.5 m wall with an explicit loft/roof-access composition. Keep sparse domestic evidence on visible returns and near-city shells; do not populate all backs. |
| P1-H Central block | Reject duplicate roofs as an established bug. Runtime already chooses the lexicographically first opposing massing for common backing/roof. Draw the two strips and y=39..44 link together; B17/Souk IDs own shared roof/backing for each wing. M01 verifies the visible 0.2 m outer strip relationship before any skin export. Preserve both IDs and repairs. |
| P1-I Asset fit / exports | Retain the bounded variants and the one fit-dependent extra booth candidate. Its actual GLB is 38,820 triangles, 2.681056 m measured width with a much narrower low cabinet; registry width 2.683 is rounded. M02 checks the full section, not a nominal 2.6 m arch. Complete building is the approval unit; named parts are export units. No distorted assets or repaired-arch suppression to force fit. |
| P2-J Warm light / scale | Founding image now opens the atlas. Historic neutral-daylight prompts remain verbatim as provenance, with an explicit superseding warm-light direction. M07 compares bot recognition in sun, shade and below cloth; material scale is reviewed at player distance. No claim that generated joinery is engine-ready. |

Detailed B/P/O dispositions appear on the existing cards and in the [district response schedule](buildings.md#district-response-schedule). Asset-registry retention remains in assets.md; cover, wet work, freight, seating, signs and overheads have named tests below rather than assumed approval.

## One small graybox batch

**Recommend baseline A, E1-only B, and G1-only C. Do not combine alternatives in the first comparison.** No graybox is built by this revision. S1/S2 massing can be reviewed as design silhouettes now; defer their runtime geometry and light changes so they cannot confound this combat comparison.

| Snapshot / bounded sample | Exact trial | Evidence and decision |
|---|---|---|
| A: current map | Run 12 canonical routes plus bot smoke once. Two 90-second holds at Tea (wave 1 and wave 7/tier 3 baseline), then leave by both ends. Main, Service and Dyers circuits: one 90-second run each at each pressure, including reload and reversal. | Record contacts <8 / 8-18 / >18 m, first incoming shot, damage, contact breaks, route dwell, pressure timing, bot arrival directions and usable escape windows. Save actual seed, start, profile and fallback use; do not assume a seed override exists. |
| B: A + E1 only | Cut all visual, projectile and LOS blockers in the specified western slot above +2.50; retain both grades and approaches. Repeat Tea holds/traversals with the same controls, tier, pressure and seed when available. | Standing and crouched reciprocal shots at (11.7,59.5) and ground (6,59.5), plus bots from both ramp/stairs. Keep only if the overlook offers a useful exposure/retreat choice and bots can challenge it. Reject grounding defects, one-way visual protection, unreachable camping or a new jump/drop exploit. |
| C: A + G1 only, conditional on A | Test only if A repeatedly yields easy long shots during retreat or no useful reload break at Textile south. Add the one matched solid return, then repeat main circuit/reversal and Fountain-to-Textile approaches both ways. | Keep only if measured contact breaks/escape choices improve without persistent congestion or unavoidable corner damage. If x=28..33 still dominates firing, reject this candidate as insufficient; do not silently add a second obstruction. |
| Each changed snapshot | Repeat canonical routes/bot smoke, then moving body sweeps in the changed area. Check both starts with three recorded spawn selections and six later-wave turnovers across Fountain/Tea/North. | Initial final placement: existing zero-visible/opposite-half/24 m expectations. Later waves follow their own runtime rules. Record fallback, first sight/shot and escape directions. Do not infer safety from spawn-center distance. |

Target one 90-120 minute baseline session and one matched comparison session. Repeat an ambiguous result once under the same conditions, then leave it unresolved. The existing harness owns route manifests; use `pnpm validate:map-layout` only in the later authorized test task because related tools may regenerate map outputs. The acceptance evidence here is a planned small sample, not a population-level fun or balance claim.

E1 is not a new floor: x=11..19/y=56..66 stays at +1.4; ramp y=48..56 and stairs y=66..72 retain their gradients. A 1.1 m parapet is only about 0.09 m above the theoretical 1.008 m jump rise, so M05 must test stepping and nearby objects. If preventing a drop requires a player-only invisible wall or a new traversal contract, reject E1 in this batch and retain A. No walkable over/under overlap is proposed.

## Subsequent complete-building pilot

**B18 / BLD_DYERS_ARCADE_E: 13.44 × 4.20 m shell, wall top +4.50, retained roof slab top +4.76 and parapet cap +5.59.** Three arches at y=35.18 / 40.00 / 44.82; original booth stays at center, packing south, DY-S samples north. The new broad non-playable roof-access room occupies x=54.6..56.4, y=40.9..44.7, slab-to-cap +4.76..7.35. It replaces that owner's narrow seeded roof head/rear tier only. This is M, not a cosmetic cabinet change.

[The pilot drawing](drawings/BLD_DYERS_ARCADE_E.svg) and [export/fit sheet](assembly-fit.svg) show closed merchant access, working pockets, supporting masonry, independent awnings, shared canopy, exposed ends, roof access and drainage intent. Hidden access is schematic; no interior is modeled or made playable. If the retained sealed backing cannot support the proposed 0.8 m working-pocket explanation at measured depth, keep a front-served packing/display use and record that before modeling. Do not deepen the shell or move a collider to fit the story.

Pilot completion includes all three trade fronts, both visible ends, rear/party-wall ownership, roof room and roof junctions, material continuity, ground contact, awning brackets and M02/M03/M05. Preserve the actual center booth file and placement. Build the complete exterior with explicit small export units in assets.md; keep the repaired runtime masonry/backing and shared systems where assigned. Compare the approach from each end and the opposite mid link before close-up material approval. No propagation until matching game views, traversal and existing desktop/mobile performance gates support it. Roof-room visibility and shadow impact are part of pilot signoff.

## Measurements and unresolved choices

| ID | Required measurement / output | Affected choice |
|---|---|---|
| M01 | B04/B17 oblique plan/section with actual shared backing, roof owner, 0.2 m offset strips and y=39..44 passage; B05/B06/B12 overlaps also marked | No independent intersecting building exports; use the current shared-shell solution |
| M02 | At floor, counter, shelf, arch spring, ledger and braces: usable width/depth, backing/wall plane, threshold, model low/high bounds and all fixture/collider AABBs | B18 pilot first; each later window/counter/booth gets its own fit record. 0.08 m lateral opening / 0.12 m canopy-opening / 0.05 m placement / 0.08 m fixture gaps remain floors |
| M03 | Both ends of all six canopies/eight lines: support x/y/z, actual receiving member, ledger/brace reach, minimum sag, hem, opening/cloth overlaps | Resolve Spice/Textile high eastern ties; verify Tea support remains outside E1; canopy poles never enter paths |
| M04 | Dogleg gate frame outer width/top, backing, actual wall interval and rack/vat/workstation envelopes | Retain repaired gate; no unmeasured thin substitute or reopened boundary |
| M05 | Standing/crouched/jumping and diagonal turn sweeps at E1/G1, Tea transitions, B18 bays, Dogleg edges, both north turns and Spawn-A kits | Keep 6 / 4.5 / 4 / 3.5 m floors and entire body volume; camera-only clearance is insufficient |
| M06 | Collider/visible tops and reciprocal eye/weapon rays for eight covers, two spawn covers and fountain; matched survival telemetry | Decide partial cover versus concealment, G1 value, Fountain exposure and long-lane kiting. No cover resize by implication |
| M07 | North/south Spice and Textile sequence; moving bots at 8, 18 and approximately 30 m in sun/shade/cloth; two first-look human navigation passes if available, one mobile | Test warm-light readability, business versus route signs, roof overlap, maintained sky gaps and false doors. No sun angle/exposure values invented |
| M08 | Same-pose draws, triangles and CPU, then desktop/mobile combat profile for selected pilot | Existing 1,500 draws / 2.2M triangles / 12.5 ms desktop median CPU; mobile 500 draws / 1.3M triangles / 30 FPS. Measure net suppression cost and repeat a >10% CPU regression once |

Outstanding scope choices are finite: retain/reject E1; run/retain/reject G1 if triggered; accept S1/S2/B18 roof silhouettes after view/light review; approve the complete B18 pilot after fit records. A second elevation and extra east connector remain deferred, with no implied production assignment.

## Review and handoff

Use `proposed → approved → implemented → verified`. Approval can select a district or a named test/building; it never follows from this document. Only the original textile booth has location-specific user-reported visual approval at `ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_02`.

For the later pilot, lock the approved map/neighbors as reference, work in metres with editable named objects, review clay composition and all visible faces before materials, and use fixed-origin GLB units. The existing booth `.blend`/`build.py` is a source/export example; no re-export is requested. World transforms stay in the spec. No monolithic map mesh or second placement database. Implementation tools, modeling, runtime generation and playtests are outside this revision.

## Obsolete guidance and conflict handling

`CLAUDE.md` remains startup navigation. This package is the current development entry point through AGENTS. Old roadmaps, `archive/map-polish-queue-sections-2026-08-05.md`, archived critic/cadence rules, and short-term rollups are historical evidence, not a queue or approval. DEC-023/024 remain superseded by DEC-025. Do not resurrect survey quotas, engine pins, automatic critics or an endless map-wide pass.

Existing `buildings[].brief`, `walls[]`, `needs` and generated bays sometimes disagree. The proposed cards explicitly resolve those design conflicts; preserve stable `servedBayId` and placement `anchorIds` when implementing an approved resolution. Source spec owns implemented truth, so an approved card is translated into the owning source records, never a duplicate live transform table.

The quality bar's type recipes are judgment aids, not reasons to add an unwanted balcony, door or prop. Compiler minimum-bay/material restrictions do not justify improvising against an approved card. Camera-only low-clutter or overhead allowances in old comments never override the full body-envelope safeguards. Surface real conflicts; do not weaken validation or rewrite unrelated instructions.


## Revision verification

The founding image, eight retained concepts, original atlas and relevant historical game evidence were inspected. Source heights, Tea grades, roof profiles, shared ownership, overhead anchors and the height-field limit were rechecked. All 56 revised atlas pages were rendered and visually inspected. PDF text bounds and overlap checks, local document links, all 36 SVG files, 35/25/9 owner coverage, static E1 eye-ray arithmetic and `git diff --check` passed. Changed-file hashes confirmed the original review, runtime, spec, assets, tooling and reference images were preserved at handoff. These are design/document checks. No fresh gameplay, collision, traversal, lighting or performance pass is claimed. The review document and all runtime/spec/asset/reference/tooling files remain unchanged by this revision.
