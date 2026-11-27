# Running the legacy learning example

1. Start the game and run the fixed baseline in the [README](../README.md#run-the-examples).
2. For one candidate batch, run `BASE_URL=http://localhost:5174 MAX_BATCHES=1 pnpm agent:self-improve`. A new state directory also triggers an initial champion batch.
3. Compare completed deaths, hits, kills, scores and survival time for the policies tested. The seed controls policy mutations. Game runs can still differ.
4. Look under `output/self-improving-runner/` for `episodes.jsonl`, `champion-policy.json`, `candidate-summaries/`, `hall-of-fame.json`, `semantic-memory.json` and `latest-session-summary.json`. Archive the policy and its outputs if you need a durable comparison. Reusing a candidate ID replaces its summary.

`STATE_ROOT` selects the output directory. `USER_DATA_DIR` selects the persistent browser profile. The game scopes its best score to the browser session. Use the saved episode records for comparisons across sessions.
