# CLAUDE.md

1. Read [AGENTS.md](AGENTS.md).
2. For map work follow [.claude/skills/map-polish/SKILL.md](.claude/skills/map-polish/SKILL.md), then [docs/map-design/construction/README.md](docs/map-design/construction/README.md) and the area's construction sheet in `docs/map-design/construction/`. The construction README and sheet are the handoff; [docs/map-design/development-plan/README.md](docs/map-design/development-plan/README.md) is only the progress index.
3. Map work inverts the global scope rules: the agent owns the named area, may add the files, assets, geometry, buildings and dressing that its sheet schedules, then marks it `built`. Stop after the requested area; continue only through an explicit user-provided queue. Do not redesign, create a separate brief, or run gameplay/aesthetic validation. The quality bar and `map:check` remain release-validation requirements for a later user-authorized task.
