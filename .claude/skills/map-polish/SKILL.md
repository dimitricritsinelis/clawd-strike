---
name: map-polish
description: Polish one bounded Clawd Strike map production cell with fixed-camera, baseline-controlled visual iteration and blind A/B review. Use for map-visual finaling, material, prop, lighting, architectural-detail, or close-range finish work directed by docs/agent/active-brief.md.
---

# Map Polish

Work on one bounded map area at a time. Treat `docs/agent/active-brief.md` as the complete task boundary and `docs/map-design/quality-bar.md` as the durable visual bar. Follow `AGENTS.md` for repository invariants and validation routing.

## Establish the cell

1. Confirm the active brief names one production cell, a goal, fixed camera IDs, allowed scope, locked systems, and hard checks. Do not expand it into a map-wide task list.
2. Verify the current branch and worktree. Preserve unrelated changes.
3. Capture a retained baseline from every fixed camera before editing, using identical camera poses, resolution, runtime options, and capture path for all comparisons.
4. Inspect the baseline against the named references. Record only the top three visible defects in the cell.
5. Name the causal mechanism for each defect, such as source material, asset construction, placement authority, light response, renderer behavior, or locked layout.

## Iterate one mechanism

1. Choose one causal mechanism. Change only that mechanism and stay within the brief's allowed scope.
2. Regenerate the owning map outputs, run `pnpm typecheck`, run the focused QA named by the brief, and recapture the exact same cameras.
3. Give a fresh-context, read-only critic the baseline and candidate captures in a blind A/B comparison. Provide only the paired captures, references, cell goal, and hard checks—never the implementation diff, preferred answer, or prior scores.
4. Retain the candidate only when the critic finds a clear cell-level improvement and every hard check remains green. Reject a tie or regression without disturbing unrelated work.
5. Begin the next iteration only after naming a different unresolved mechanism. Do not blindly retune the same parameters.

## Stop or escalate

- Stop after two consecutive ties or regressions.
- Stop when the current implementation medium has reached its visible ceiling.
- Escalate the blocked mechanism to a new material source, authored asset, renderer change, or explicit layout unlock; do not disguise a medium change as parameter tuning.
- Require owner approval only at the production-cell boundary, after the retained candidate and exact-camera evidence are ready.
- Do not create a map-wide task list, score ledger, roadmap, residual backlog, or phase plan.
