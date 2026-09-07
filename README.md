# Clawd Strike

Web-based FPS. Remaining work: Bazaar map visuals, one area at a time.

```bash
pnpm install
pnpm dev
```

`pnpm dev` generates the runtime map files, then serves the client on port 5174. Confirm the loaded map before comparing captures.

| Work | Start here |
|---|---|
| Agent instructions | [AGENTS.md](AGENTS.md) |
| Map area PREPARE / BUILD | [map-polish skill](.claude/skills/map-polish/SKILL.md) |
| Finish criteria | [quality-bar.md](docs/map-design/quality-bar.md) |
| Progress and references | [development-plan/README.md](docs/map-design/development-plan/README.md) |
| Public browser-agent contract | [skills.md](apps/client/public/skills.md) |

- `apps/client/src/runtime/`: gameplay runtime, rendering, HUD, weapons, bots
- `apps/client/scripts/`: map generation, QA and smoke scripts
- `assets/source/`: Blender sources (`facade_kit.py`, per-unit `build.py`)
- `docs/map-design/`: spec, references, atlas, briefs
