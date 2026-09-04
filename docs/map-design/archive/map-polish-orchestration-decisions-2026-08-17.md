# Archived map-polish orchestration decisions

These superseded decisions are preserved from `docs/decisions.md`. They do not define current commands, model choices, gates or workflow. Use [DEC-025](../../decisions.md#dec-025-map-polish-is-a-fast-in-session-loop-not-an-orchestrated-pipeline) and the [map-polish skill](../../../.claude/skills/map-polish/SKILL.md) for current procedure.

## DEC-023 (superseded by DEC-025): Map-polish is engine-agnostic with a per-pass engine pin and a code-owned loop
- The workflow owns correctness: the bounded loop, gates, and validators live in code (`map:loop` → planner → `map:run` → `map:verify`); agents launch it and babysit its stop reasons, they do not orchestrate.
- A single ModelEngine abstraction (`--engine codex|claude`, env fallback `MAP_POLISH_ENGINE`) serves four roles — planner, survey, writer, reviewer — with generalized per-call telemetry `{engine, role, model, effort, wallMs, usage, costUsd?}`.
- The engine is pinned in state at survey time; `map:run`/`map:loop` refuse a different engine unless the pass is resurveyed. A failed call is a workflow failure, never a cross-engine fallback; no mid-pass switch.
- Claude runs the Claude Code CLI headless (`--bare`, pinned `claude-fable-5`, per-role `--effort`/`--max-budget-usd`); images are read via its Read tool, not an image flag. Survey/reviewer/planner are isolated in a fresh temp dir with only image copies and `--allowedTools Read` — blindness by directory plus tool allowlist, not a hard sandbox. The writer edits the repo under `acceptEdits` with Read/Edit/Write/Glob/Grep and no Bash.
- Tests never make real model calls; they use fake binaries via `CODEX_BIN`/`CLAUDE_BIN`.

## DEC-024 (superseded by DEC-025): Survey wall coverage is a fail-closed survey gate
- Geometry-derived named views (`primary`, `context`, `elev:*`, `cross-a`/`cross-b`, `upper`) must cover every wall face: a sample is usable when it sits inside a view's horizontal wedge at ≤30 m with incidence ≤60°, and full-height when the frame reaches the wall top.
- Thresholds block `map:survey` and `map:verify` when unmet: every wall face ≥6 m needs ≥80% usable; every authored frontage needs ≥90% usable and ≥85% full-height; map-wide full-height must be ≥85%. `pnpm map:coverage` prints the per-face table.
- `SURVEY_POSE_RULESET_VERSION` is hashed into survey authority, so pose-rule changes invalidate old surveys and force resurvey.
- Acceptance recaptures the same named poses, so a wall no view can see can never be silently unrated-and-unacceptable.
- Remaining blind spots — overhead/canopy interiors and rooftops — are documented, not gated.

