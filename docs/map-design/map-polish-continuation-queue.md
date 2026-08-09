Audience: implementation-agent
Authority: active continuation queue
Read when: continuing Bazaar polish after commit `d9f77d8`
Owns: the ordered cause-level shared-system cards for the continuation wave
Do not use for: workflow policy (see the map-polish skill), quality criteria (see `quality-bar.md`), or first-wave status (see `map-polish-queue.md`)
Last updated: 2026-08-08

# Bazaar Map-Polish Continuation Queue

The completed first wave in [`map-polish-queue.md`](map-polish-queue.md) remains the diagnostic baseline. Its accepted work stays accepted. A stalled tactic may continue here only when fresh evidence points to a materially different cause-level intervention; this queue does not authorize another round of the rejected material swaps, tone/optics sweeps, shadow toggles, generic contact-disc sizing, fog tuning, or token roof clutter recorded there.

Work one card at a time, in the order below, using the repository `map-polish` skill. For every card:

1. Capture a fresh exact before set from all named fixed cameras.
2. Keep each implementation attempt separable, run `pnpm typecheck`, and recapture the exact set.
3. Give anonymized before/after sets and the named target references to a fresh read-only critic, with no code diff and no indication of which set is newer.
4. Keep only a clear visual improvement. Fully restore that attempt on a tie or regression.
5. Two consecutive cause-distinct non-improvements stall the card. Record both attempts and the remaining gap, commit the stall record, and move on.
6. Commit a completed card only after its complete-when bar is met. A partial improvement may be retained on a stalled card only when the blind evidence clearly prefers it; record the unmet clause precisely.

The first-wave authorizations remain in force: a demonstrated visual gain may justify a tightly measured ceiling change while `pnpm qa:completion` stays at or below a 12.5 ms desktop frame-time median; selective 2k promotion retains the documented allowlist requirements; and external assets must be CC0 with source, license, and MD5 provenance. Leave `SUN_POS` unchanged. Retry a failed batch shot solo before calling it a map regression, and never run a build concurrently with capture.

All cards are render-only system work. `docs/map-design/specs/map_spec.json` remains layout authority, `docs/map-design/shots.json` remains camera authority, and `AGENTS.md` protects collision, traversal, routes, cover, sightlines, opening clearance, and the full standing/crouched movement envelope.

## C1 — Batched facade surface-attribute integrity

- [x] Complete
- Visual boundary: The compiled wall-detail surface-data path wherever it renders non-uniformly scaled, world-projected architectural detail or paneled door leaves: projection basis, geometry vertex attributes, per-instance tint composition, and the affected `arch_pointed_frame` and `door_panel_*` buckets map-wide.
- Protected gameplay boundary: No placement transform, authored dimension, facade opening, reveal depth, threshold, collision mesh, navigation surface, sightline, route width, or movement envelope may change. This card repairs render data, not facade layout or door/opening state.
- Primary fixed camera: `SHOT_04_TEXTILE_ARCADE`
- Supporting fixed cameras: `SHOT_13_CLOSEUP_MERCHANT_FACADE`, `AUDIT_03_SERVICE_SOUTH_EAST_FRONTAGE`, `SHOT_08_DYERS_DOGLEG`
- Target references: [08 Textile Arcade](visual-targets/08-textile-arcade-south-compression/target.jpg), [01 merchant frontage](visual-targets/01-spice-street-west-merchant-frontage/target.jpg), [14 service frontage](visual-targets/14-service-south-utility-frontage/target.jpg), [12 Dyers dogleg](visual-targets/12-dyers-dogleg-residential-turn/target.jpg)
- Verified cause / hypothesis: The Textile smear is verified to be emitted by the `arch_pointed_frame` bucket; source-material substitution and projection-branch gating did not move it. The shared world-projection shader transforms batched/instanced normals with the forward non-uniform scale, unlike Three's inverse-transpose approximation, so dominant-axis selection can be wrong on scaled arch faces. Door board tone and relief changes likewise failed to reach rendered leaf faces while framing and hardware in the same assembly did, pointing to color/role signal loss in the compiled `BatchedMesh` path rather than insufficient relief. Inspect and regress those attribute paths before changing appearance values.
- Excluded repeated tactics: More arch material swaps, timber tone sweeps, door board-depth amplification, or adjacent-surface retinting without new runtime evidence.
- Complete when: Across the four exact after cameras, every visible Textile Arcade pointed frame reads as consistently scaled coursed masonry with no pale vertical straw/smear; every exposed paneled door has legible board separation, rails, and hardware distinct from its dark reveal; and no supporting camera loses an accepted material, opening, or facade read.

### Evidence and outcome

- Fresh before: `artifacts/playwright/map-shots/continuation-C1-before/` — all four authored cameras passed at their exact poses with no capture findings.
- Attempt 1 after / blind result: `continuation-C1-a1-projection/`, completed after the required clean solo retries in `continuation-C1-a1-projection-SHOT13-retry/` and `continuation-C1-a1-projection-AUDIT03-retry/`. The shader now derives projection orientation from Three's inverse-scale-corrected `transformedNormal` instead of applying the non-uniform batch transform a second time. A fresh blind critic strongly preferred the result: `SHOT_04` decisive and `SHOT_08` moderate for coherent horizontal masonry, with both door cameras tied and no regression. This clear partial improvement was retained.
- Attempt 2 after / blind result: Before implementation, `continuation-C1-door-role-diagnostic/` applied impossible RGB role colors. They still resolved as one black face while separately emitted rails remained visible, proving the camera saw the continuous anti-halo backer rather than the constructed board side; CPU `BatchedMesh` probing had already shown the color attribute survived batching. The reusable door part-depth convention was reversed so its boards, rails, and fittings occupy the exterior negative-local-Z side. Final exact set: `continuation-C1-a2-door-face/`. A fresh blind critic preferred it 4–0: decisive in `SHOT_04` and `AUDIT_03`, clear in `SHOT_08` and `SHOT_13`, with constructed leaves now distinct from their reveals and no lost facade/opening/material read.
- Checks: `pnpm typecheck`; the focused world-projection shader regression in `v3Architecture.test.ts`; and the new exterior-face raycast regression in `wallDetailFamilies/doors.test.ts` all pass. The diagnostic role colors were fully restored before final capture.
- Final status / commit: Complete 2026-08-08. The full acceptance bar is met in the fixed set; coarse distant coursing and a few deep gaps on the darkest `SHOT_13` leaf remain finish caveats, not regressions or failures of the card bar. The card checkpoint is the commit containing this record.

## C2 — Canopy span load path and finished-edge topology

- [ ] Complete
- Status: Stalled 2026-08-08 after two consecutive cause-distinct non-improvements; both attempts were fully restored.
- Visual boundary: Every overhead cloth span and the structural system that visibly carries it: reinforced hems and edge battens, span-end attachment stations, rings, cords, tension members, local load deformation, and deterministic cloth-family assignment.
- Protected gameplay boundary: Preserve every authored span footprint, endpoint, clear height, doorway/opening buffer, route and sightline. Added work is non-colliding, seated on the existing span or wall support, and must remain outside standing/crouched swept movement volumes.
- Primary fixed camera: `SHOT_15_CLOSEUP_CANOPY_ATTACHMENT`
- Supporting fixed cameras: `AUDIT_23_SPICE_OVERHEAD_RUN`, `SHOT_11_SPICE_CANOPY`, `SHOT_04_TEXTILE_ARCADE`
- Target references: [03 Spice canopy system](visual-targets/03-spice-street-overhead-canopy-system/target.jpg), [08 Textile Arcade](visual-targets/08-textile-arcade-south-compression/target.jpg), plus [`bazaar_main_hall_reference.png`](refs/bazaar_main_hall_reference.png) for layered cloth identity
- Verified cause / hypothesis: The cloth surface, edge ropes, trestles, rings, and P4 intermediate lashings are parallel batches. The retained lashings cross the ledger but do not deform or reinforce the hem, so the eye cannot trace load from cloth to structure; the exposed edge still terminates in air and no point load appears in the sheet. The new approach must derive edge finish, attachment geometry, and local pucker from one span surface/anchor contract rather than add more independent lashings.
- Excluded repeated tactics: More free-floating cord instances, global sag tuning, or another cream-cloth texture-only pass.
- Complete when: In `SHOT_15`, both exposed cloth edges can be traced continuously through a finished hem or batten and a visible tension member to a real wall support, with at least one readable point-load pucker or weighted edge; the supporting set contains at least two clearly distinct woven cloth families including one restrained saturated bolt; no visible span edge ends unsupported; and authored clearance remains unchanged.

### Evidence and outcome

- Fresh before: `artifacts/playwright/map-shots/continuation-C2-before/` — all four exact authored cameras passed with no capture findings from the accepted C1 checkpoint.
- Attempt 1 after / blind result: `continuation-C2-a1-integrated-load-path/`. This integrated rolled long-edge hems, bound end sleeves, shared three-station point-load deformation and wall ties, removed the separately floated wall-end strips, and assigned one deterministic madder bolt. In the anonymous Cedar/Linen comparison, a fresh blind critic preferred the unchanged Linen set overall: moderate–strong in `SHOT_15`, strong in `SHOT_11` and `AUDIT_23`, and at most a weak Linen preference in `SHOT_04`. The accepted pale end rails and ochre woven bolt read better than the new raw-looking edge and flat red sheet, while the new cordage still failed to connect visibly to an identifiable anchor. The entire attempt was restored.
- Attempt 2 after / blind result: `continuation-C2-a2-direct-ring-tension/`. Runtime inspection verified that the retained L-shaped ropes ended at each fixture's instance origin even though its visible torus is offset `0.455 m` along the arm and `0.07 m` upward. This cause-distinct pass derived a pucker and three attachment stations from the sheet, computed the rendered cloth and torus endpoints, and used exact quaternion-oriented members between them while preserving the accepted cloth palette. The focused regression proved all 36 members terminated at their paired torus centers and the obsolete edge-rope draw was absent. Nevertheless, in the anonymous Alder/Bronze comparison a second fresh blind critic preferred the unchanged Bronze set in every camera (moderate in `SHOT_15`, slight–moderate in `SHOT_11`, strong in `SHOT_04`, slight in `AUDIT_23`): the new members remained too short or low-contrast to read as continuous load paths, and the long front lip still appeared soft or partly raw. This attempt was also fully restored.
- Final status / commit: Stalled. `pnpm typecheck` passes after restoration, and no C2 source, test, palette, geometry, or draw-path change remains. The supporting set already retains two preferred woven families, including its restrained ochre/rust bolt, but the primary camera still does not prove a continuous finished edge → tension member → wall support path or an unmistakable point load. The two-rejection threshold forbids further grinding in this wave; the checkpoint is the commit containing this record.

## C3 — Structural old-city perimeter massing

- [ ] Complete
- Visual boundary: The sealed, non-playable background perimeter belt and its render-only roof silhouettes, party-wall grouping, setbacks, sparse supported service shapes, and the transition from map edge to surrounding old city.
- Protected gameplay boundary: Preserve the exact sealed playable perimeter and every playable roof, floor, opening, collision volume, cover object, route, sightline, and spawn. Do not change sun direction, playable-camera shadow-map bounds/resolution, or fog to manufacture the result. Background geometry stays non-colliding and outside the authoritative map boundary.
- Primary fixed camera: `SHOT_01_TOPDOWN_ESTABLISHING`
- Supporting fixed cameras: `SHOT_02_SPAWN_A_TO_BAZAAR`, `SHOT_12_SPAWN_B_RETURN`, `SHOT_13_CLOSEUP_MERCHANT_FACADE`
- Target references: [19 perimeter and skyline integration](visual-targets/19-perimeter-rooftops-and-skyline-integration/target.jpg), [`bazaar_v3_detailed_birdseye.png`](refs/bazaar_v3_detailed_birdseye.png), and [`cs2_daylight_ref_1.png`](refs/cs2_daylight_ref_1.png) for readable depth layering
- Verified cause / hypothesis: P10 verified that palette rebalance collapses the belt into a dark roof carpet and same-budget hatches/tanks remain token decoration. The current approximately 120 shells all use the same lower-box, 68/32 setback, capped-roof grammar at regular ring spacing; eye-level heights stay nearly flat, the distant belt lies outside the fitted shadow camera, and fog strong enough to separate it would flatten accepted playable ground. The new cause-level route is a lean deterministic massing grammar with aggregated party-wall runs and several genuinely different stepped profiles, not another palette, fog, shadow-toggle, or rooftop-token pass.
- Excluded repeated tactics: Playable-roof palette bands, fog retuning, merely enabling distant cast shadows, or rearranging only hatches/tanks/chimneys.
- Complete when: `SHOT_01` no longer exposes an obvious repeated capped-box ring or an abrupt featureless surround and instead shows coherent low/mid/tall old-city massing around all four sides; `SHOT_02` and `SHOT_12` each show multiple believable height and depth layers that frame rather than flatten the route; `SHOT_13` remains capture-stable and visually unchanged in its playable foreground; and any justified budget change still leaves `pnpm qa:completion` at or below 12.5 ms median.

### Evidence and outcome

- Fresh before:
- Attempt 1 after / blind result:
- Attempt 2 after / blind result:
- Final status / commit:

## C4 — Support-specific contact coverage for hero and imported props

- [ ] Complete
- Visual boundary: The render-only contact/receiver system under ground-resting props map-wide, including fountain base courses, palm planter and trunk, cart wheels/supports, barrels, crates, and representative goods. Contact shapes derive from actual support geometry rather than crown or whole-object envelopes.
- Protected gameplay boundary: Prop transforms, collision, floor authority/material identity, traversal surfaces, routes, movement envelopes, sun direction, and broad cast-shadow silhouettes remain unchanged. Contact work stays flush to the floor, non-colliding, compact, and cannot cover an authored floor seam or threshold.
- Primary fixed camera: `SHOT_03_FOUNTAIN_COURT`
- Supporting fixed cameras: `SHOT_16_CLOSEUP_FOUNTAIN_MATERIAL`, `SHOT_06_CARAVAN_RAMP`, `SHOT_14_CLOSEUP_PROP_GROUNDING`
- Target references: [06 Fountain Court](visual-targets/06-fountain-court-hero-composition/target.jpg), [07 fountain material/contact](visual-targets/07-fountain-basin-material-and-ground-transition/target.jpg), [15 Caravan loading](visual-targets/15-caravan-court-ramp-and-loading/target.jpg), [04 Spice ground cover](visual-targets/04-spice-street-ground-cover-and-thresholds/target.jpg)
- Verified cause / hypothesis: P5 verified that the major cast-shadow flags already exist; palm-disc resizing and shadow-refresh restoration were visual ties. The current radial `prop-ground-contact` is generated only from broad compiled-placement footprints, while hero/imported renderers do not share precise support metadata and the palm GTAO exclusion covers the entire palm root rather than only cutout fronds. This produces either a broad merged wash or no readable seam at the actual base. The new route is a shared deterministic support-footprint registry and compact anisotropic contacts derived from plinths, planter rims/trunks, wheels, feet, and vessel bases.
- Excluded repeated tactics: Shadow-caster toggles, refresh changes, generic radial-disc resizing, or global light-level tuning.
- Complete when: The fixed set shows a tight, object-specific contact seam under the fountain plinth, palm/planter, cart supports or wheels, and representative goods; no reviewed object gains a grey halo or visibly dirty radial disc; the broad Fountain Court shadow mass does not worsen; and no floor identity, seam, threshold, or route changes.

### Evidence and outcome

- Fresh before:
- Attempt 1 after / blind result:
- Attempt 2 after / blind result:
- Final status / commit:

## Deferred lower-impact residuals

The Rug Gate inlay remains a local entablature rebuild rather than a shared system. Fountain-water optics are also local, and the fixed set does not show two palms together well enough to support a credible duplicate-silhouette acceptance bar. If the four cards above leave review headroom, the only evidence-backed new water tactic is a seam-safe toroidal basin normal plus separate basin/jet materials; do not repeat global transmission or saturation tuning. Neither residual is silently accepted by this deferral; both return to the owner review with the first-wave stall record intact.

## After the last card

Run, in order:

1. `pnpm typecheck`.
2. Focused regressions for every touched shared system, including generated-map freshness.
3. Canonical final traversal (`pnpm --filter @clawd-strike/client test:map-traversal:final`).
4. `pnpm qa:completion` and confirm the desktop frame-time median is at or below 12.5 ms.
5. An explicit fixed 23-camera wave sweep selected with `SHOT_IDS`: `SHOT_01`–`SHOT_16` plus `AUDIT_01`–`AUDIT_07` — no implicit/default selection.
6. A fresh blind final critic against the same references, covering assembly, material/UV defects, floating or intersecting geometry, movement-adjacent dressing, and like-kind regressions.

Commit the final evidence/status update, then stop for owner review. Do not mark the active goal complete at that handoff; it remains active until the owner explicitly approves the final review or directs closure.
