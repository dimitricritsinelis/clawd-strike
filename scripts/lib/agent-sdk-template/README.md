# Clawd Strike Agent SDK

This is the **legacy SDK snapshot produced by the game repo exporter**. The canonical public contract is served at [{{PUBLIC_AGENT_CANONICAL_SKILLS_URL}}]({{PUBLIC_AGENT_CANONICAL_SKILLS_URL}}); that contract wins when this snapshot differs.

This snapshot supplies browser-control helpers and an older learning example. It does not implement the complete current `agentic-gameplay-v1` workflow. Updating that runtime is a separate SDK task, not a prerequisite for Three.js map or Blender asset work.

## What this snapshot implements

- Enter Agent mode through public selectors or the documented autostart URL.
- Read documented public state, send actions, and restart after death.
- Run fixed-policy attempts or the legacy `agent:self-improve` loop.
- Save episodic logs, champion parameters, candidate summaries, and semantic notes.
- Use a persistent browser profile during the learning loop. `score.best` remains browser-session scoped; a saved profile does not guarantee it survives a new browser session.

Policy mutations are seeded. This does not give the runner access to game seeds or make separate gameplay attempts identical.

## Current contract gap

The canonical contract requires `contract:check`, `agent:learn`, explicit run configuration and budgets, the `bootstrap_hit` / `bootstrap_kill` / `stabilize_score` phases, and immutable candidate history. This snapshot has no `contract:check` or `agent:learn` script and no equivalent phase-aware promotion gate.

Its older comparator can promote a zero-kill, zero-hit policy for longer survival. Such a promotion is not valid first-hit or first-kill evidence under the current contract. Candidate summary files are written by policy ID and can be replaced if an ID is reused; do not describe them as an immutable audit trail. A smoke pass proves only the checks the smoke script runs, not full workflow conformance.

For current benchmark work, use a companion SDK revision that implements the live contract and verify its commands before running. Do not rename this snapshot's scripts or claim conformance through documentation alone.

## Inspect the legacy snapshot

Run these commands inside the exported SDK directory:

```bash
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm smoke:no-context
pnpm agent:baseline
```

`agent:baseline` defaults to five completed attempts and prints its results to stdout. It does not write the canonical one-attempt baseline artifact.

The optional legacy learning example is `pnpm agent:self-improve`. It accepts `BASE_URL`, `HEADLESS`, `STATE_ROOT`, `USER_DATA_DIR`, `BATCH_SIZE`, `MAX_BATCHES`, `MAX_STEPS_PER_EPISODE`, `STEP_MS`, `AGENT_NAME`, and `SEED` environment overrides. `MAX_BATCHES=0` means unlimited candidate batches. A positive value limits candidate batches, not wall-clock time; timed-out attempts are retried until a batch has enough completed deaths.

## Saved artifacts

The legacy learning example uses `output/self-improving-runner/` by default:

- `episodes.jsonl`: appended episode records.
- `champion-policy.json`: the legacy comparator's selected policy.
- `semantic-memory.json`: recent mutation notes.
- `hall-of-fame.json`: retained policy records.
- `latest-session-summary.json`: the latest written session summary.
- `candidate-summaries/*.json`: summaries keyed by candidate ID, subject to replacement on ID reuse.

Review [the playbook](docs/PLAYBOOK.md), [implemented tuning parameters](docs/TUNING_GUIDE.md), and [troubleshooting](docs/troubleshooting.md). Saved files prove persistence only to the extent their actual contents and identity history support it; they do not certify canonical learning or map quality.
