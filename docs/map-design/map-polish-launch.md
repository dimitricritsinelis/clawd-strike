Audience: human, implementation-agent
Authority: launch reference
Read when: starting a map-polish pass
Owns: copy-pasteable map-polish launch prompts per engine
Do not use for: workflow policy, quality judgment, or task status
Last updated: 2026-08-17

# Map Polish Launch Prompts

Two copy-pasteable prompts for launching a bounded map-polish pass. The workflow owns
correctness; the launched agent's job is preflight, launch, babysit, and report. Policy lives in
`.claude/skills/map-polish/SKILL.md`; safeguards live in `AGENTS.md`.

## Codex goal prompt

```text
Run one bounded map-polish pass on the Bazaar map.

1. Read AGENTS.md and .claude/skills/map-polish/SKILL.md in full before acting.
2. Preflight: confirm the current git branch is the dedicated map-polish branch and
   `git status` is clean apart from map-polish state; run `pnpm map:verify`; run
   `pnpm map:coverage` and confirm the coverage gate passes.
3. Launch: `pnpm map:loop -- --engine codex --max-accepts 5 --commit`
4. Respect the loop's stop reasons. Never restart past a resurvey, milestone, or
   owner-review boundary: when the loop asks for a milestone or resurvey, run that
   command, and relaunch the loop only if accepted-task budget remains. If it stops
   for human disposition or an unrecoverable blocker, stop and report.
5. Never run an unbounded loop, never pass --max-tasks to map:run, and never touch
   protected scopes (collision, spawns, routes, traversal, cover, sightlines,
   doorway dimensions, tactical connectivity).
6. Finish by reporting the loop's JSON final report verbatim (accepts, outcomes,
   stop reason, rating counts, coverage) plus any deferred units and their
   one-line diagnoses.
```

## Claude Code prompt

```text
Run one bounded map-polish pass on the Bazaar map.

1. Read AGENTS.md and .claude/skills/map-polish/SKILL.md in full before acting.
2. Preflight: confirm the current git branch is the dedicated map-polish branch and
   `git status` is clean apart from map-polish state; run `pnpm map:verify`; run
   `pnpm map:coverage` and confirm the coverage gate passes. On a GPU-less host
   (software-rendered headless Chromium) export `QA_STATE_READ_TIMEOUT_MS=45000`
   first, or every capture dies on the first shader-compiling frame.
3. Launch: `pnpm map:loop -- --engine claude --max-accepts 5 --commit`
4. Respect the loop's stop reasons. Never restart past a resurvey, milestone, or
   owner-review boundary: when the loop asks for a milestone or resurvey, run that
   command, and relaunch the loop only if accepted-task budget remains. If it stops
   for human disposition or an unrecoverable blocker, stop and report.
5. Never run an unbounded loop, never pass --max-tasks to map:run, and never touch
   protected scopes (collision, spawns, routes, traversal, cover, sightlines,
   doorway dimensions, tactical connectivity).
6. Finish by reporting the loop's JSON final report verbatim (accepts, outcomes,
   stop reason, rating counts, coverage) plus any deferred units and their
   one-line diagnoses.
```

### Interactive alternative (manual planner)

An interactive Claude Code session can drive the loop itself instead of delegating the
planner role:

1. Run `pnpm map:loop -- --engine claude --planner manual`. The loop stops before each
   task and prints the unit context: defects, named views, and coverage.
2. Read that context plus the unit's site brief and plan crop, then write one bounded
   objective yourself.
3. Run `pnpm map:run -- --objective "..." --risk <pure|shared|route-adjacent>`, then
   resolve with `pnpm map:verify -- --accept|--reject|--defer --commit`.
4. For blind review in manual mode, a fresh subagent given only the task's `review/`
   images may serve as reviewer. Never show it the diff, the design rationale, the
   chronology, or which image is before/after beyond the neutral A/B labels.

The same boundaries apply: bounded accepts, stop at resurvey/milestone/owner-review,
no protected-scope changes.
