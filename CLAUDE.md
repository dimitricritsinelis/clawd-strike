Audience: implementation-agent
Authority: entry point
Read when: starting repository work
Owns: minimal Claude startup sequence
Do not use for: workflow policy, task history, or durable decisions
Last updated: 2026-07-25

# CLAUDE.md

Start every task by reading, in order:

1. `AGENTS.md`
2. `docs/agent/active-brief.md`
3. The skill named by the active brief

Then read only the owning files required for the bounded task.

Before editing:

- Verify the current branch and worktree state.
- Preserve every unrelated worktree change.
- Never commit, push, switch branches, reset, stash, or discard changes.
- Never hand-edit generated map files; use their owning generators.
- Preserve deterministic RNG behavior and `userData.visualQa` metadata.
- For every new external asset, require source, license, and MD5 provenance.

Keep detailed workflow rules in their owning policy, brief, skill, or spec.
