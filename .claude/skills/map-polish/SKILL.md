---
name: map-polish
description: Polish one bounded Clawd Strike map area through fixed-camera capture, parallel diagnosis, focused edits, and blind before/after review.
---

# Map Polish

Follow `AGENTS.md` and `docs/map-design/quality-bar.md`.

## Task boundary

- The current user prompt names one bounded map area.
- The current user prompt names or implies the fixed screenshot cameras.
- Do not expand the work into other areas.
- Do not create a roadmap, task list, backlog, score ledger, phase plan, active brief, baseline file, or new QA tooling.

## Initial capture

- Capture the exact named cameras before editing.
- The initial screenshot artifact directory is the working baseline for the current session.
- Keep the accepted baseline path in the current Claude session only. Do not persist baseline state in repository files.
- Use `pnpm capture:shots` for all sixteen review cameras or comma-delimited authored IDs, for example:
  `SHOT_IDS=SHOT_03_FOUNTAIN_COURT,SHOT_16_CLOSEUP_FOUNTAIN_MATERIAL pnpm capture:shots`.
- Use `pnpm capture:spice` for the four authored Spice-area cameras.

## Parallel diagnosis

For each iteration, run two read-only subagents in parallel:

1. Visual critic:
   - Inspect the current screenshots against the relevant reference images.
   - Identify the three most visible quality defects.
   - Name the causal mechanism for each defect.
   - Recommend the single highest-impact improvement.
2. Technical scout:
   - Locate the exact source files, map-spec fields, asset definitions, materials, or geometry builders responsible for the selected defect.
   - Recommend the smallest coherent implementation approach.
   - Do not edit files.

## Focused implementation

- Choose one causal mechanism and make one coherent edit batch.
- Do not fix unrelated problems or other map areas.
- Before editing, preserve only the files being changed under `/tmp/clawdstrike-map-loop/iteration-<n>/`.
- Do not use `git reset`, `git checkout`, `git restore`, stash, or broad rollback commands.
- Reasonable increases in texture resolution, geometry detail, or triangle count are allowed when they create a clear visible improvement.
- Do not optimize every iteration prematurely.
- Preserve final browser performance as a hard end-of-area requirement.

## Recapture and compare

After each edit batch:

1. Run `pnpm typecheck`.
2. Recapture the exact same cameras with the exact same settings.
3. Launch a new read-only visual critic.
4. Give the critic the previous accepted screenshots, candidate screenshots, relevant reference images, and bounded-area goal. Give no code diff and no indication which set is newer.
5. Ask whether A or B is clearly closer to the reference quality bar and why.
6. Keep the candidate only when it is clearly better.
7. If tied or worse, restore only the files changed during that iteration from `/tmp/clawdstrike-map-loop/iteration-<n>/`.

## Iteration limits

- Continue for no more than six accepted improvements.
- Stop after two consecutive rejected iterations.
- Stop when the bounded area is consistently close to the reference quality bar.
- Stop when the remaining gap requires an asset or production method that cannot be created reliably in the current loop.
- Do not stop merely because the starting map contains known defects.

## Final validation

After the final accepted iteration, run once:

- `pnpm typecheck`
- `pnpm smoke:game`
- `pnpm qa:completion`
- One final capture of the named cameras

Do not run `qa:completion` after every iteration.

Do not commit or push during the map-development loop unless the user explicitly instructs it.
