---
name: map-polish
description: Autonomously polish one bounded Clawd Strike map area through fixed-camera capture, focused visual objectives, and blind before/after review.
---

# Map Polish

Follow `AGENTS.md` and `docs/map-design/quality-bar.md`.
Visible improvement in the named fixed-camera screenshots is the primary objective. Guardrails protect gameplay and repository integrity; they are not reasons to avoid meaningful visual work.

## Task boundary

- The current user prompt names one bounded map area.
- The current user prompt names or implies the fixed screenshot cameras.
- Act autonomously within that area. Do not ask permission for ordinary visual edits allowed by `AGENTS.md`.
- Start with the smallest relevant source area. Expand into adjacent or shared visual systems only when the diagnosed cause requires it.
- Do not turn the task into unrelated map-wide work.
- Do not create roadmaps, task lists, backlogs, score ledgers, phase plans, active briefs, baseline registries, promotion systems, debt tracking, invariant bundles, or new QA tooling.

## Initial capture

- Capture the exact named cameras before editing.
- Treat that artifact directory as the first accepted capture for the current session.
- Keep the current accepted capture path in the Claude session only. Do not persist comparison state in repository files.
- Use `pnpm capture:shots` for all sixteen review cameras or comma-delimited authored IDs, for example:
  `SHOT_IDS=SHOT_03_FOUNTAIN_COURT,SHOT_16_CLOSEUP_FOUNTAIN_MATERIAL pnpm capture:shots`.
- Use `pnpm capture:spice` for the four authored Spice-area cameras.

## Diagnosis

- Run the computed composition audit first and treat its findings as the area's composition defect list. Clear them before opening any finish objective.
- Use two separate read-only critics, never one merged prompt. The first sees only the elevation camera and is asked only about composition and semantics, given the quality bar's composition list verbatim. The second sees the remaining cameras and is asked only about finish. A single critic asked for "the most visible defects" reports large-area material problems and reliably misses alignment, datum ordering, and semantic conflicts.
- Ask each for the three most visible defects in its class, the causal mechanism behind each, and the single highest-impact coherent objective.
- When source ownership is already obvious, proceed directly.
- Only when source ownership is unclear, use a read-only technical scout to locate the responsible source files, map-spec fields, asset definitions, materials, or geometry builders and recommend the smallest coherent implementation approach.
- A technical scout may run in parallel with the critic, but it must not edit files.
- Critic and scout recommendations are evidence for Claude's judgment; they do not need unanimous agreement.

## Focused implementation

- Choose one coherent visual objective and make one focused edit batch.
- One objective may coordinate render-only geometry, placement, materials, textures, lighting response, and attachments when they jointly solve the visible problem.
- Do not fix unrelated problems or other map areas.
- Before editing, preserve only the files being changed under `/tmp/clawdstrike-map-loop/iteration-<n>/`.
- Do not use `git reset`, `git checkout`, `git restore`, stash, or broad rollback commands.
- Follow generated-file authority when an owning source requires regeneration.
- Render-only geometry changes, authored one-off assets, higher-resolution textures, increased detail, and reasonable triangle-count increases are allowed when they materially improve the target screenshots.
- Reuse and instancing are preferences, not requirements when they would produce a visibly inferior result.

## Recapture and compare

After each edit batch:

1. Run `pnpm typecheck`.
2. Recapture the exact same cameras with the exact same settings.
3. Launch a new read-only visual critic.
4. Give the critic the previous accepted screenshots, candidate screenshots, relevant reference images, and bounded-area goal. Give no code diff and no indication which set is newer.
5. Ask it to score composition and finish separately and name the winner on each. A candidate that improves finish while regressing composition is a rejection.
6. Use the comparison as strong evidence, then make the acceptance decision. Do not require unanimous subagent agreement.
7. Keep a clearly better candidate.
8. On a tie or ambiguous result, Claude may make one focused revision and compare again before reverting.
9. If the candidate is clearly worse, or its focused revision still does not improve, restore only the files changed during that iteration from `/tmp/clawdstrike-map-loop/iteration-<n>/`.

These are the only required per-iteration checks. Do not run full traversal, smoke, completion, build, or repository-wide tests after every iteration.

Performance budgets are final-signoff requirements, not intermediate vetoes. A modest temporary overage may be retained while visual quality converges; perform a focused optimization pass before final validation without sacrificing the accepted visible improvement.

## Stop conditions

- Continue without a fixed accepted-improvement cap.
- Stop when the bounded area is consistently close to the reference quality bar.
- Stop after two consecutive revised candidates fail to improve.
- Stop when the user-defined loop limit is reached.
- Stop when a genuine production-method blocker prevents reliable progress in the current loop.
- Do not stop merely because the starting map contains defects. Fix them.
- A demonstrably pre-existing unrelated test failure should be reported once, but it must not trigger repeated workflow tuning or abandonment of the visual task. Fix regressions introduced by the current work.

## Final validation

After the bounded area is visually finished, run once:

- `pnpm smoke:game`
- `pnpm qa:completion`

Do not commit or push during the map-development loop unless the user explicitly instructs it.
