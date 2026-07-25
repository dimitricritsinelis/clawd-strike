Audience: implementation-agent
Authority: entry point
Read when: starting repository work
Owns: minimal Claude startup sequence
Do not use for: workflow policy, task history, or durable decisions
Last updated: 2026-07-25

# CLAUDE.md

1. Read `AGENTS.md`.
2. For map-visual work, read `.claude/skills/map-polish/SKILL.md`.
3. When relevant, read `docs/map-design/quality-bar.md` and the named fixed-camera definitions in `docs/map-design/shots.json`.
4. Treat the current user prompt as the complete task boundary.
5. Read only the source files required for the bounded area.

Before editing:

- Verify the current branch and worktree state.
- Preserve every unrelated worktree change.
- Never commit, push, switch branches, reset, stash, or discard changes unless the user explicitly instructs it.
- Never hand-edit generated map files; use their owning generators.
- Preserve deterministic RNG behavior and `userData.visualQa` metadata.
- For every new external asset, require source, license, and MD5 provenance.

Keep detailed workflow rules in their owning policy, skill, or spec.
