---
name: map-polish
description: Survey Bazaar, schedule its weakest review unit, and run one bounded engine-written visual iteration with matched-view evidence and gameplay safeguards.
---

# Map Polish

This is the sole explanation of the map-polish workflow. Follow `AGENTS.md`; use `docs/map-design/quality-bar.md` only for visual judgment.
`docs/map-design/map-polish-state.json` is the only active status source; Git holds history. Codex handles survey/planning/review; `--engine codex` remains accepted, and `MAP_POLISH_ENGINE`, if set, must be `codex`. The prep/review engine is pinned for the pass at survey time. Claude Code Fable 5.1 is the fixed map writer, not a prep/review option. The workflow prepares evidence/work orders and runs checks; Claude only implements the bounded map improvement. Never switch the prep/review engine mid-pass or fall back across engines on failure. Tests never make real model calls: fake binaries via `CODEX_BIN`/`CLAUDE_BIN`.

## Commands and modes

- Start with `pnpm map:survey -- --engine codex`, inspect `pnpm map:next -- --engine codex`, trace ownership, then run `pnpm map:run -- --engine codex --objective "..." --risk pure|shared|route-adjacent`; real mode requires both flags before capture or a Claude writer call. Use the `suggestedRisk` from `map:next`: composing a frontage is `route-adjacent` (one focused traversal), not `pure`.
- Real `pnpm map:run` runs one explicitly scoped task and stops; repeat `map:next` → `map:run` up to a chosen bound. Mock orchestration may use `--max-tasks N`. `--concept PATH` adds advisory direction. Never run an unbounded loop.
- Bounded multi-task driver: `pnpm map:loop -- --engine codex --max-accepts 5 --commit`. Codex plans/reviews; Claude writes the map change. See the one-task loop section.
- Without `--commit`, resolve once with `pnpm map:verify -- --accept --commit` to continue from a clean checkpoint, or use `--accept` without committing and stop. Reject/defer with the matching flag. Use `-- --milestone` only at milestone cadence.
- Real mode invokes the pass's pinned prep/review CLI and the fixed Claude writer CLI installed locally (Claude Code 2.1.251 or newer for Fable 5.1). Manual mode emits complete work/review packages. Mock mode makes no external call. If a required CLI is unavailable, emit the work order and exit or use manual mode; a failed call is a workflow failure — never fall back to the other engine, print credentials, or make a real model call in tests.
- Real calls pin models per role and suppress unrelated plugins/config. Codex pins Sol High for survey/planning/review with `--ignore-user-config`. The Claude writer pins `claude-fable-5-1` headless with `--safe-mode`, `--no-session-persistence`, and per-role `--effort`/`--max-budget-usd`, retaining the existing login. It reads prompt-listed images with Read and uses exact `--tools Read,Edit,Write,Glob,Grep` in the repo under `acceptEdits`. No Bash or delegated agents: the workflow runs generators and checks. Ultra is diagnostic, not the routine iteration default.

Automatic mode requires a clean dedicated branch and refuses unrelated changes. `map:run` and `map:loop` refuse a prep/review engine different from the one pinned in state unless the pass is resurveyed; the separate Claude writer does not change that pin. Bind survey state to a deterministic fingerprint of tracked/untracked source (excluding state and ignored artifacts); invalidate after out-of-band drift while preserving active recovery.
Record the start commit and candidate patch/files. `--commit` creates one local accepted-task checkpoint and never pushes; without it, retain the candidate for manual acceptance and stop.

## Survey before editing

Derive units from every authored zone in `map_spec.json`; never hard-code the count. Include every connector, service/transition, spawn, elevated piece, and edge; fail newly uncovered zones.
Generate a stable ordered list of named player-eye views per unit from authority and traversal direction: `primary` and `context` always first; square-on `elev:<FRONTAGE_ID>` / `elev:<face>` wall elevations (long walls split into `:1`, `:2`… segments; pitch tilts up when the wall top would not fit at ~90% of frame height); `cross-a`/`cross-b` in squarish zones (aspect ≤ 1.6); `upper` (+20° pitch) where walls ≥ 7 m stand within 9 m. Cap ~10 views per unit; keep fovDeg 75 player-eye honesty; `pitchDeg` is a real pose field. Allow tiny overrides only for invalid poses; never add survey poses to `shots.json` merely for coverage.

Before capture, `assertSurveyCoverage` gates the pose set and fails closed on pure geometry with own-zone views: it samples every wall face; usable = inside a view's horizontal wedge, ≤30 m, incidence ≤60°; full-height = the frame reaches the wall top. Every wall face ≥6 m needs ≥80% usable; every authored frontage ≥90% usable and ≥85% full-height; map-wide full-height ≥85%. The same gate runs inside `map:verify`; `pnpm map:coverage` prints the per-face table; the three map-wide numbers are stored in state, and `SURVEY_POSE_RULESET_VERSION` is hashed into survey authority so pose-rule changes invalidate old surveys.

Capture every named view per unit. Group 5 labeled units per sheet with variable per-unit thumbnail grids labeled by view id, plus one compact approved reference board; ask for structured `rating`, `confidence`, and at most two criterion-grounded visible defects; a defect may name the wall it saw inline as `[view:<id>]`.
Run one short map-wide synthesis on the same sheets; retain at most three findings in existing defect slots. Retry malformed output once. Never implement during survey.

- **Red:** unacceptable, broken, blockout-like, or dramatically below the map.
- **Yellow:** coherent but underdeveloped or carrying an important visible defect.
- **Green:** acceptable for now.

Eliminate Red, resurvey, improve the highest-impact Yellow, then stop for human review. Do not use
completion percentages or demand an abstract final score from every minor space.

## Deterministic scheduling

Sort by rating (`unrated`, Red, Yellow, Green), least recently attempted, fewest accepts, then stable ID. Never select Green while Red remains except as a shared regression view.
Allow one accepted change per unit/pass and two attempts. A second needs new evidence and a materially different hypothesis; after two failures defer. Resurvey after every Red receives attention.

Shared-system work may override geography only when `--shared-cause` names one cause supported by
at least two Red/Yellow units, one Green regression view is included, and the objective stays bounded.

## Compose before polish

Screenshots alone cannot tell a writer where a door belongs. Every task therefore also gets a
**site brief** (`site-brief.md`: the unit's frontages with their current bays and positions, exempt
faces and why, connected zones and neighbouring frontages as alignment references, and the
authored-layout schema) and a **plan crop** (`plan-before.png`: the compiled layout around the unit,
north up, unit outlined). The work order and site brief name the elevation view that shows each
frontage (review view `elev:FRONTAGE_X` shows this wall square-on: the wall you are composing).
Read both before deciding anything.

Facade openings are placed by `layoutIntent`. `generated` spreads modules evenly between the edge
margins by rhythm and is only for quiet backdrops; any frontage a player reads should be `authored`:
named columns, declared mirrors about an axis, a declared corner treatment (`held`, `pilaster`, or
`open`), one sentence stating the ordering idea, validated by the same physical grammar. A Red unit
whose defect is bones-level (blank, blockout, arbitrary, no readable purpose) is a **composition
task**: the work order demands a composition brief, and a profile, material, or rhythm swap alone is
not a resolution. If the unit has no composable frontage (every dominant face is an exemption),
`--defer-selected` it with that diagnosis: adding frontage or massing is an owner decision.

## One-task loop

Before capture or a paid writer call, confirm the selected defect has a bounded local emitter. If it
does not, use `pnpm map:run -- --defer-selected --diagnosis "..."` and rotate without a model call.

1. Select one unit; capture its exact current named views; render the plan crop and site brief.
2. Read the unit through Purpose → Order → Exception → Evidence → Readability from the quality bar, then name one highest-impact visible defect and trace its likely emitter. Do not create a score or optimize only the hero angle.
3. Write a work order of about 550 words or less: unit/zone IDs, the unit's view captures with the elevation view naming each frontage, plan crop, site brief, optional concept, one objective, at most two defects, a composition brief when the defect is bones-level, likely files, protected constraints, minimum checks, success, and one directly relevant rejected tactic at most.
4. Invoke the fixed Claude writer for one bounded implementation attempt. It reads `AGENTS.md`, supplied evidence/site brief, and permitted map surfaces only; no broad repository exploration, orchestration repair, generators, or duplicate checks. A workflow failure is a concise blocker, not another development task. Return a `designRationale` (purpose, axis and entrance logic, why each opening sits where it does) for the owner.
5. Run the smallest risk-appropriate checks, recapture the exact poses, and validate the per-view image pairs. Target views come from the task's defects and objective (fallback: all views); a material change must land in at least one target view.
6. Run at most one fresh short blind A/B review with Codex, then accept, reject, or defer.
7. Atomically update bounded state, clean temporary artifacts, and rotate to another unit.

`pnpm map:loop -- --engine codex --max-accepts N --commit` is the bounded multi-task driver: a
deterministic loop of `map:next` → one fresh planner call per task → `map:run` → `map:verify`, same
gates as above. It stops at N accepts, a resurvey/milestone due, an owner-review boundary, a task
needing human disposition, or an unrecoverable blocker, and prints a JSON final report.
`--planner manual` stops before each task and prints the unit context for an operator-written
objective. Real `map:run` still refuses `--max-tasks`; the loop is the only multi-task path.

A concept image is advisory and only appropriate for a Red unit whose direction, composition,
identity, or density is unclear. Do not use one for UV/normal/shader/emitter/grounding defects,
obvious geometry fixes, or small material corrections.

Before review, reject stale/missing/corrupt/sky-only captures, wrong units, dimension or camera/FOV
drift, runtime errors, no relevant source change, and tasks with no materially changed target view
(identical or effectively unchanged pairs under the strict threshold). These are workflow failures,
never critic ties.

Randomize A/B labels. Keep review instruction concise and give only the blind package: A/B pairs for
primary, context, and every view whose pixels changed materially, the
neutrally labelled A/B plan crops (identical framing, rendered from the pre-edit and post-edit layouts), the
Green regression view when the task is shared, the
objective, and the same design lens—never diff, rationale, chronology, or history. The reviewer
prompt's image-order sentence is generated from the actual image list. Require
chronology-neutral preferred/design/objective/blocking-defect fields, a `compositionLogic`
judgment (legible/arbitrary/unclear: is the preferred version's placement of openings and elements
on an axis, paired, held from corners, aligned to something, or a justified exception?), confidence, and one concise reason.
A candidate that wins the pair with arbitrary placement is deferred for the owner, never baselined:
better than blank is not the bar. If the engine cannot inspect images, emit the package for manual review.
Use objective technical/crop evidence once when uncertain; otherwise defer, without critic debate.

## Checks and boundaries

Default checks are: protected-domain diff, fastest relevant scoped typecheck, exact recapture,
runtime console-error check, image-pair validity, and one short visual comparison.

- Pure visual work adds an existing focused test only when it directly covers the mechanism.
- A shared visual system adds one justified mechanism test and one Green regression view.
- Route-adjacent props, placement, openings, frontage composition, or geometry preflight and rerun the smallest relevant props-on agent route; a passing focused traversal is acceptance evidence. Reserve hands-on confirmation for a retained legacy/manual task that explicitly requires it.
- Shared composition work (the facade grammar `apps/client/scripts/lib/facade-layout-grammar.mjs` or its generator) runs the grammar/generator tests as its focused mechanism test and needs the usual two weak units plus one Green regression view.
- Never add per-task snapshots, cameras, or tests for an ordinary aesthetic choice.

Normal polish cannot change collision authority, spawns, route topology, traversal surfaces,
gameplay cover, doorway dimensions, major sightlines, or tactical connectivity. If it does, restore
only the candidate-touched files and stop for explicit owner scope. Never reset, stash, checkout,
or alter unrelated work.

## Outcomes, state, and artifacts

Accept only a valid, visibly or technically improved candidate with required checks green, a
material change in at least one target view, no material regression in any view or the Green
regression view, and protected authority unchanged. A clear partial
improvement may land; retain the remaining defect in one sentence and rotate. Human map approval is
always required.

On first failure, restore the captured candidate patch, inspect one small diagnostic, and retain one
concise rejected tactic. Retry only with a changed hypothesis. On second failure, restore, retain a
one-line blocker/next action, defer, and rotate. Keep at most two rejected tactics per unit.

State stores only the current source fingerprint, stable unit/zone IDs, rating/confidence, two current defects, per-view
evidence records (schema v2, one baseline per named view) with the three map-wide coverage numbers, the pinned prep/review engine, last attempted pass, accepted count, two rejected tactics, and optional one-line deferred
reason/next action. Write atomically in stable order; never store prompts, diffs, transcripts, or logs.

Keep only the active task's per-view before/after review images plus the A/B plan pair, the plan crop, the site brief,
compact work order/review/outcome, and candidate patch when needed. Accepted after-images replace prior baselines. Rejection deletes captures and ephemera unless
`--keep-debug`; always delete traces, duplicates, temporary diagnostics, and empty console dumps.
Generated task artifacts are never committed.

Each current outcome retains only compact phase timing and per-call telemetry (`engine`, `role`, `model`, `effort`, `wallMs`, `usage`, `costUsd` when known). Target ≤10 minutes writer,
≤2 minutes reviewer, ≤3 minutes non-model tooling, and ≤15 minutes end to end; warnings do not weaken
quality gates. Confirm the defaults against the first five real tasks rather than optimizing one sample.

After about five ordinary accepts, run the small completion/map-tooling/typecheck/build checkpoint.
Use the full traversal, smoke, completion, tooling, typecheck, and build milestone after shared work,
a complete Red pass, and before owner review. Never weaken gates or raise budgets.
