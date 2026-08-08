---
name: map-polish
description: Improve one bounded Bazaar focus — a map section or one shared visual system — through fixed-camera capture, focused visual work, and blind before/after review.
---

# Map Polish

Follow `AGENTS.md` and `docs/map-design/quality-bar.md`. Rendered before/after screenshots from the fixed cameras are the primary quality signal.

## Scope and ownership

- The current task names one bounded focus — a map section, or one shared visual system worked wherever it appears — and 1–4 fixed cameras.
- One writer owns that focus and any directly coupled visual systems needed to improve it.
- The writer may refine, rebuild, replace, or rearrange visual assemblies within the focus when that produces a materially better result. Preserve the map's overall identity and general layout by default; a system-scoped task legitimately touches every section its system serves, but never expands into layout redesign.
- Critics and technical scouts are read-only. Use a scout only when source ownership is unclear, and do not require unanimous critic approval.
- Do not create a new process, persistent task-state layer, or QA system for map polishing.

## Section loop

1. Capture the current state from the exact fixed cameras named for the task.
2. Compare those screenshots with the relevant references. Identify the three most visible defects and the cause of each.
3. Choose the single highest-impact coherent visual objective.
4. Keep the iteration's edits separable, then implement the objective across geometry, materials, attachments, props, openings, dressing, or local structural composition as needed. Change a shared visual system when it is the true cause of the section's weakness.
5. Run `pnpm typecheck`.
6. Recapture the same cameras with the same settings.
7. Use a fresh read-only critic for a blind comparison. Give it both screenshot sets and the relevant references, but no code diff and no indication of which set is newer. Ask which set is stronger and why.
8. Keep a clear improvement. If the result is worse, either restore only the files changed in that iteration or revise it once and compare again. If an ambiguous result or that revision still does not improve, restore only that iteration.
9. Repeat with the next highest-impact objective until the focus is close to the reference bar or two consecutive revised attempts fail to improve it.

Accepted improvements may continue as long as they move the focus toward the reference bar. Starting defects are work to resolve, not a reason to stop. The writer makes the final acceptance decision from the rendered evidence.

## Finish

After the focus is visually finished, run once:

- `pnpm smoke:game`
- `pnpm qa:completion`

Run these final checks once, not after each iteration. Performance guidance lives in the quality bar.
