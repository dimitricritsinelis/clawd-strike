# Troubleshooting the legacy examples

| Symptom | What to check |
| --- | --- |
| Missing `agent:run`, `agent:learn` or `contract:check` | Check which SDK you installed. The [snapshot README](../README.md#compatibility) lists its commands and timing behavior. |
| Batch keeps running | `MAX_BATCHES=0` permits unlimited batches. `MAX_STEPS_PER_EPISODE` limits one attempt. Timed-out attempts are retried until the batch has enough completed deaths. Stop the process at your time limit. |
| Missing past results | Check `STATE_ROOT` and the [output files](PLAYBOOK.md). Candidate summaries use the policy ID as the filename. |
| Damage reaction stops | The controller reacts to new public `damage-taken` feedback events. When feedback is absent it continues its ordinary movement and firing pattern. |
| Inconsistent timing | Keep the page visible and record the cadence. Hidden tabs can throttle timers and stop rendering. |
