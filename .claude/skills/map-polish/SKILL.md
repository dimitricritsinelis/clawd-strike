---
name: map-polish
description: Improve a bounded Bazaar building or shared render part using player-eye before/after evidence. Use for map visual implementation, not process audits. The owner commits.
---

# Map Polish

Read `AGENTS.md` and `docs/map-design/quality-bar.md` once. Shipped CS2 quality is the visual target. The current task defines the work, not an endless map-wide polish pass.

## Scope

One writer per checkout. Spec edits, part edits, generation, and captures are serial: every capture regenerates from the live spec. Start with `git status --short`; preserve existing work.

Work on one building or shared defect at a time. Use the owner's target; otherwise `pnpm map:shoot random` selects an initial unit. For unattended goals, use a finite ordered list of targets, not repeated random selection. Do not revisit completed work without new evidence or a request.

Resolve the named defect completely. An accepted iteration does not mean the whole unit is finished. Unrelated defects remain follow-up work; missing parts required by the chosen outcome remain dependencies. Never call an incomplete assembly finished.

Before propagating a new building type or shared kit, finish one representative assembly against the reference. Do not multiply a weak part across scheduled walls.

## The loop

1. **Capture and inspect.** `pnpm map:shoot <unit> --tag <task>-01-before`. Use a unique tag per attempt; preserve earlier snapshots. Read `plan.png`, `primary`, `context`, and the target `elev:*`; add an oblique view for depth/material work. Open one relevant daylight reference from the quality bar once per task. Use `--views` for focused experiments after establishing context; the after shoot must include the same views.
2. **Name the defect and finish line.** One sentence each, with visible criteria. Judge building identity and composition before assemblies or texture. Start from the printed building brief and `walls[]` schedule, but check them against the plan, module dimensions, and render. Schedules can be wrong. Correct a contradictory schedule with the reason in its note; do not decorate around a broken shared part.
3. **Implement the complete fix.** Edit `docs/map-design/specs/map_spec.json` or the owning render code under `apps/client/src/runtime/map/`. Inspect the active implementation and callers. The before shoot saves the spec; copy each code file into that before directory before editing. Edit JSON locally, not by reserialising the file. Preserve `servedBayId` bindings and all placement `anchorIds`.
4. **Check and compare.** Run `pnpm map:check`; for code changes, also `pnpm typecheck` and the smallest relevant existing runtime check. Run `pnpm map:shoot <unit> --tag <task>-01-after`. Capture validity and runtime collider comparison must pass. Inspect all changed views and compare the target pair and neighbours. Pixel change locates effects; it does not score quality. Review performance below.
5. **Keep or restore.** Keep only if the named defect is resolved, the affected assembly meets the quality bar, and safety/performance evidence supports it. Otherwise restore only this attempt's files from its immediate before snapshots and regenerate. Never restore an old task's full spec over later kept work. After two attempts without clear gain, reassess the owning layer; continue only with a different evidence-backed approach. Report required missing assets, authority changes, or unavailable measurements as unresolved dependencies.
6. **Finish the bounded task.** Complete the requested list, then stop. Report accepted, reverted, or incomplete outcomes, before/after paths, checks, performance deltas, and dependencies. Do not commit. The owner reviews and commits.

## Shared parts

Use a part iteration when a defect appears on two walls or a module contradicts its role. Capture two or three representative uses, including a cramped or differently scaled use. Fix the shared cause once. Check and reshoot those views, including an oblique view. Require improvement in intended uses and no regression elsewhere; unchanged unaffected walls are fine. Inspect callers and run the relevant existing check; a sample cannot prove every instance.

Facade rendering is in `v3Architecture.ts`; shared wall materials are in `wallDetailFamilies/kitMaterials.ts`. Trace active branches rather than similarly named dead branches. Inspect existing module output before designing around its label. Keep defect inventories in task handovers, not this skill.

## Authoring facts

- The plan is north-up, east-right. Runtime coordinates put east on screen-left when facing north. `along` runs west-to-east on north/south faces and south-to-north on east/west faces; camera-left segment numbering may run the other way.
- An `elev:<face>` without a frontage is exempt. `system_articulated_boundary` is code-owned, usually in `pushCoreBoundaryFacadeGrammar`; `retaining_wall` is terrain. Inspect the actual span before adding a frontage to a sealed perimeter or architectural cut edge. Short returns and open traversal faces do not imply walls to decorate.
- Each frontage needs `buildingId`. A building may own several faces. Split only for real parcels, preserving attached anchors. Brief, schedule, and layout must describe the same building.
- Authored bays must use the profile's `moduleIds`; widen an appropriate existing profile when needed. Generated family selection does not prove authored membership.
- Doors, shop recesses, arches, and columns are grounded. Their heights must equal `groundHeadM`; other ground modules hang from that head. A 3.4 m pilaster cannot share a 2.5 m door head. Do not shorten it into a bollard to satisfy the compiler.
- Massing under 5.4 m permits only `story: 0`. Authored uppers require explicit `story: 1` or higher; declare `upperSillDatumsM` if defaults do not fit. Only generated layouts automatically choose upper bays. The runtime consumes compiled bays. Do not raise massing to fit an opening when that changes sightlines.
- Current grammar requires `ceil(lengthM / 6)` ground bays, a 0.6 m edge margin, no overlaps, and shared heads. Held corners reserve 1.2 m for ground doors/recesses/arches; pilaster corners require a column edge within 0.9 m. Mirrors use 0.03 m tolerance about `axisAlong` (default 0.5). Generated spacing uses a 0.42 m gap; authored spacing does not enforce it. Judge edge spacing visually.
- `gen-map-runtime.mjs` requires different resolved wall material+tint on adjacent frontages, including nearby collinear spans and corners. Compiler restrictions are not design proof. An incoherent restriction belongs in a bounded grammar task with a regression check; never weaken gameplay safeguards to satisfy a schedule.
- `composition` is at most 240 characters and ends in `.`, `!`, or `?`. It is unchecked design prose.

## Safety and performance

`map:check` compares protected spec fields against HEAD and checks protected runtime files. It does not prove all gameplay unchanged. The after shoot additionally compares actual runtime collider hashes. Neither proves visual sightlines, body clearance, or bot behaviour; inspect the diff and affected space.

Run `pnpm validate:map-layout` after geometry, props, or dressing changes near routes, including non-colliding geometry and facade projections, and once before handing off kept map changes. It runs 12 blockout routes plus bot smoke. It cannot detect walking through render-only clutter: inspect movement through the affected final-render route when the body envelope changes. Material-only edits need no per-iteration traversal.

Shoots retain per-view draws, triangles, and CPU frame time. Compare identical poses on the same machine/profile without concurrent captures. Use the existing budgets in `apps/client/scripts/lib/performanceAcceptance.mjs`. Investigate budget overruns or frame-time increases over 10%. Confirm timing regressions with one repeat of the before/after pair under comparable load, keeping the original rollback snapshot. Repeatable regressions block acceptance; missing measurements mean unverified performance. CPU timings do not prove GPU or live-combat FPS. Run `pnpm qa:completion` for desktop/mobile performance at a district or release milestone, not every facade edit.

## Goal mode and task boundaries

Keep related iterations in one task to retain module knowledge and failed attempts. Start fresh for a new building batch, unrelated shared part, or context dominated by obsolete experiments. Do not create a task per edit, automatically fork workers, or build a scheduler. Carry the target list, kept changes, evidence paths, and unresolved dependencies; the spec and worktree remain authoritative.

Example goal: "Resolve the corner-door defect on BLD_LINK_WALL_NE as a coherent compound-wall facade. Verify matching elevation and oblique views, unchanged gameplay, clear traversal, and performance within budget without a repeatable frame-time regression. Follow map-polish; preserve unrelated work; do not commit. Report required missing parts as incomplete; do not expand to the whole map."
