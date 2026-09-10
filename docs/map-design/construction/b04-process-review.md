# B-04 implementation: root causes and corrective work

The implementation prompt was substantially correct. The largest demonstrated cause of rework was implementation error, amplified by missing reusable tests and evidence tooling. The engineering documents were detailed enough to specify the architecture, but they were not a proven construction package: some recipes, material appearance and software assumptions had not been exercised. More repeated prose would not have prevented the observed failures.

This review changes the process and tooling. It does not claim that the installed B-04 courtyard is now visually A-grade. The live handoff advanced to a proposed B-05 finish during this work; that proposal remains separate from the installed B-04 trial and retains its proposed status.

## What failed, and why

| Observed failure | Root cause and contribution | Corrective work |
|---|---|---|
| Nine exports, with five rejected attempts | The implementing agent developed and tested basic geometry operations inside a full courtyard build. The first attempt assumed the wrong installed Blender tessellation return type. Later attempts discovered bounds and topology problems late. | A standalone builder fixture path now exercises the installed API, all four wall orientations, shaped thresholds and the star voids after the actual cleanup path. Run it before a full build when those helpers change. |
| A lower triangle count destroyed the lattice pattern | The documents explicitly required a planar union. The agent used a 3D dissolve operation, then treated reduced counts as success before checking the holes. This was an implementation error, not a missing design instruction. | The existing corrected 2D construction is retained. Tests now raycast the center opening, a solid strip and an empty corner after cleanup, in addition to checking projected area. Both topology and budget must pass. |
| Wall strips and missing east/south surfaces | The source mixed mirrored coordinate systems with automatic normal recalculation on disconnected skins. A fix was applied to some orientations without testing the whole helper. | One exterior-skin function is used by the builder and the four-direction fixture. The fixture checks the final processed normals. |
| Failed exports replaced source scenes before the budget check | The export path saved `.blend` before validating its budget, so a failed attempt could leave a new scene next to an older GLB. | Bounds and source budgets run before output publication. `.blend`, GLB and inspection data are staged; final GLB counts are checked before the completed outputs replace their destinations. |
| Dark guest-house shutters despite matching IDs and tints | The agent initially guessed a metallic cause without proving it. A dark brown albedo multiplied by a teal tint does not itself specify a readable painted finish. The runtime probe confirms the actual material, textures and tint. | The false causal claim is retired. The handoff now requires an explicit stain/paint interpretation and a representative runtime material witness. A dedicated shutter camera is provided. The finish correction belongs to the proposed B-05 design, not a silent recoloring during this process audit. |
| A persistent shared-environment guard failure | The guard sampled the enclosing box of a disconnected model. The empty courtyard inside that box was incorrectly treated as mesh. | The guard now uses transformed conservative bounds per rendered triangle. It retains relief, contact and wall-distance rules and fails closed on unsupported geometry. Tests accept separated geometry and still reject a triangle spanning the court. `map:check` now passes without an ID exemption, weakened threshold or rebaseline. Exact triangle-volume checks remain separate. |
| Misleading FPS and weak relative CPU conclusions | The dated runner timed a zero-delta debug render, overwrote CPU telemetry and reported the runtime FPS smoothed from zero-duration frames. Fifteen samples and different desktop/mobile entry modes compounded the problem. | The tracked runner uses the same deterministic full-update/render workload for both devices, driven by browser animation frames. It warms 60 frames and records 180, preserves raw runtime telemetry and derives cadence from wall-clock frame intervals. Relative comparison refuses the old render-only measurements and requires at least 120 compatible samples. |
| Transpile-only tests passed while typecheck failed | Two B-trial fixtures omitted required fields. The first trial ran the tests without the corresponding type check. | The fixtures now supply the required material/unit fields. Both runtime tests and typecheck pass. No types or assertions were weakened. |
| Repeated reading, custom reporting and large context cost | The agent repeatedly fetched overlapping documents and large outputs. Useful capture, movement, comparison and reporting logic was left in ignored dated artifact folders. The prompt requested detailed evidence, but did not require reinventing the machinery. | `handoff.py` extracts one unit with source identity. The B extraction is about 0.4 MB instead of the 2.5 MB full design, and should still be queried by relevant IDs. The capture runner, frame sampler, comparison output and tests now live in tracked source. It refuses output overwrites and records source/runtime/asset inputs. |
| Confusing approval and revision state | An installed B-04 trial and a later proposed B-05 finish were easy to conflate. During this audit, a live design change added a `draped-rug` type that the old builder would silently omit. | Instructions distinguish installed, proposed and accepted states. A build requires a saved handoff hash and rejects changed inputs, unsupported features and unsupported installation phases before exporting. The B-05 rug was correctly rejected, and the existing GLB hash was preserved. |

## Responsibility by layer

**Implementation.** The agent bears primary responsibility for the API assumption, invalid simplification, orientation errors, early output writes, incomplete fixtures and premature material diagnosis. Those were not compelled by the prompt. “Review at the end” already allowed cheap technical assertions; treating it as a reason to delay helper validation was a mistake.

**Tooling.** The tools did not make the correct path easy enough. Core geometry assumptions had no small runnable fixture; the guard used the wrong spatial representation; evidence scripts were task-local; performance mixed simulation and wall-clock time. Corrective behavior is now executable rather than only another paragraph of advice.

**Engineering handoff.** Numeric completeness is necessary but insufficient. A drawing can contain every opening and still leave a material too dark, a recipe too expensive or a renderer unable to express the intended finish. The handoff needs supported construction recipes, measured cost, explicit material behavior and subject-specific camera coverage. The new README defines these readiness conditions. B-FIELD also separates the inset finish box from the surrounding stone receiver bounds.

**MD instructions.** The high-level sequence was appropriate: implement the complete named area, review once, correct observed defects. The fixes clarify technical preflight, durable tool routing, revision identity and evidence semantics. They do not add review agents, serial aesthetic approvals or a new architectural review ladder. The old sandbox advice was corrected to respect actual session permissions rather than assume a repository config grants access.

**Prompt.** Keep it short and scope-specific. Name the unit, issue, handoff, installation phase, protected gameplay and expected evidence. The machinery and detailed standards belong in the repository. Asking the user to write a longer prompt would shift responsibility away from the implementation system.

## How to reach A-level performance

For the process, the target is a mostly correct first integrated build, followed by one bounded correction pass. Small technical fixtures run when their helpers change; shared assets are reused by identity; only changed outputs are rebuilt; one frozen camera set serves before and after; evidence and comparisons are generated by tracked tools. A repeated failure requires examining the failing operation on a small fixture, not another blind whole-area export. This is an operating target, not a promise that every complex area needs exactly two exports.

For the product, an A requires all of the following together:

- The built silhouettes, room openings, materials, supports and interfaces match the approved target at actual player cameras.
- The dominant address, secondary space, trade activity and quiet fields read clearly. More decorative objects are not a substitute for that hierarchy.
- Material samples work under the real renderer and shipped lighting. An attractive swatch or a correct material name is not sufficient.
- Clear volumes, collider identity, movement, asset provenance and absolute budgets pass, with credible relative performance evidence where required.
- The user accepts the final in-game composition. Test passes and subjective percent-complete estimates cannot supply that acceptance.

The existing target triangle budgets remain working headroom below the hard ceiling. Do not lower detail blindly or invent additional ceilings; measure the recipe by assembly and remove hidden/redundant topology without changing its visual meaning. Reuse these fixtures and tools for the next implementation, then compare the actual first-pass defects, number of full exports and correction time. That subsequent trial is the evidence needed to award an A process grade.

## Commands and verified outcomes

See the construction README for the durable handoff, fixture, capture and comparison commands. The main additions are:

- `python3 docs/map-design/construction/handoff.py --unit <unit> --output <saved-input.json>`
- `Blender -b --factory-startup --python-exit-code 1 --python assets/source/unit-spawn-b-courtyard/build.py -- self-test`
- `pnpm map:trial --plan <saved-plan.json> --output <new-directory> [--baseline <before-directory>] [--views id,id] [--movement]`
- `python3 assets/source/unit-spawn-b-courtyard/verify.py <evidence-directory> --design <frozen-design.json>`

Fresh validation in `artifacts/b04-process-fix-20260909/`:

- `map:check`: pass, with the existing baseline and no special shared-model exception.
- Map/runtime regression tests: 16 pass. Performance comparator tests: 2 pass.
- Typecheck: pass after correcting the two related test fixtures.
- Blender fixture: pass, without exporting or installing a courtyard asset.
- Unsupported B-05 issue: correctly rejected before construction; the installed source GLB hash is unchanged.
- Document, building and roof validation plus generated-document/camera reproducibility: pass.
- New runner smoke/control comparison: 180 samples per device; approximately 59.9 FPS browser cadence; CPU samples remain within the absolute budgets; cameras and collider authority match. The two runs used the same unchanged scene, so this proves the runner and comparator, not a rendering improvement.
- Frozen B-04 exported triangle-volume checks: 11 pass.
- Skill validation: pass.

The old trial's quoted 399+ FPS should not be used as performance evidence. The new sampler does not turn browser emulation into physical-mobile testing; physical-device performance remains unverified. No B-05 finish was built, no installed model was changed in this process audit, and no commit, push or deployment was performed.
