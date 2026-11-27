# Clawd Strike Agent SDK snapshot

This export contains the game's legacy Playwright helpers and example policies. For the current real-time learning workflow, use the companion SDK and the game's [public agent guide]({{PUBLIC_AGENT_CANONICAL_SKILLS_URL}}). The guide is also mirrored as `skills.md` in the export.

## Run the examples

From the exported SDK directory, with the game running locally:

```sh
pnpm install
pnpm exec playwright install chromium
BASE_URL=http://localhost:5174 pnpm smoke:no-context
BASE_URL=http://localhost:5174 pnpm agent:baseline
```

The smoke checks startup, public observations, death and retry. The baseline prints metrics for five completed attempts by default. The [playbook](docs/PLAYBOOK.md) covers the optional learning example and its output.

## Compatibility

The examples call `advanceTime()` when available. The current workflow uses a visible page, real-time waits at about 8 Hz, and finite attempt and wall-clock budgets. The exported package supplies `agent:self-improve` but lacks the companion SDK's `agent:run`, `agent:learn` and `contract:check` commands. A legacy run can select a longer-surviving policy with zero hits or kills. Record the observed results when interpreting its output. [Tuning](docs/TUNING_GUIDE.md) · [Troubleshooting](docs/troubleshooting.md)
