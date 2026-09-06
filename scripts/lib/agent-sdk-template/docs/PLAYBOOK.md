# Playbook

This playbook describes the legacy exported snapshot. The [README](../README.md#current-contract-gap) explains its gaps against the canonical public contract. It is not the workflow for building or verifying the game map.

## Legacy inspection workflow

1. Run `pnpm smoke:no-context` inside the exported SDK directory to exercise public selectors, API availability, and death/retry behavior. This checks selected contract snippets, not complete workflow conformance.
2. Run `pnpm agent:baseline` to inspect the fixed policy. It defaults to five completed attempts and prints a summary to stdout.
3. Use `pnpm agent:self-improve` only as the legacy learning example. Set a positive `MAX_BATCHES` for a finite candidate-batch count; this is not an attempt or wall-time deadline because timed-out attempts can retry.
4. Inspect `latest-session-summary.json`, `candidate-summaries/`, `episodes.jsonl`, and `semantic-memory.json`. Compare the reported outcomes with the canonical promotion rules before describing an improvement.

## Persistence and evidence

- Keep the same browser session alive for browser-session `score.best`.
- Reuse `USER_DATA_DIR` and `STATE_ROOT` when preserving legacy experiment state; do not delete existing history between attempts.
- Candidate summaries are keyed by policy ID. This writer can replace an existing file, so those files alone do not establish immutable lineage across sessions.
- The runner's `bootstrapGatePassed` checks at least one kill-positive episode in a completed batch. It does not implement the canonical first-hit phase or establish every required benchmark condition.

## Canonical promotion requirements

The live contract requires hit evidence in `bootstrap_hit`, combat evidence in `bootstrap_kill`, and score optimization only in `stabilize_score`. Survival alone cannot promote a hitless or killless bootstrap policy. Confirmation uses completed-attempt batches, not one lucky run.

The legacy comparator does not enforce these phases. Record survival-only promotions as legacy comparator behavior, not acquisition success. A conforming learning workflow requires a separately authorized SDK implementation and verification task; this document does not perform that migration.

## Public boundaries

- Use only documented public globals, selectors, observations, and permitted local experiment files.
- Do not use map coordinates, hidden enemy positions, routes, LOS truth, game seeds, or debug data for competitive agent play.
- Keep policy changes bounded and evidence attributable to the policy actually tested.
