# Deployment and operations

Vercel builds the Vite client and serves the shared-champion API from the same origin. The build runs `pnpm typecheck && pnpm build` and publishes `apps/client/dist`. Node and pnpm versions come from the root package. [Build settings and headers](../vercel.json) · [Upload exclusions](../.vercelignore) · [Package](../package.json)

## Database and server environment

Vite's development middleware uses an in-memory store. The deployed API uses Postgres. Configure server secrets on the intended deployment. The store picks the first non-empty connection value in each list. [Connection selection](../server/store/connection.ts) · [Request security](../server/highScoreSecurity.ts)

| Use | Preference order |
|---|---|
| Write | `POSTGRES_WRITE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `NEON_DATABASE_URL` |
| Read | `POSTGRES_READ_URL`, then the write list |
| Maintenance | `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED`, `POSTGRES_WRITE_URL`, `POSTGRES_URL`, `DATABASE_URL`, `NEON_DATABASE_URL` |

Production privacy hashing requires a `PRIVACY_HASH_SECRET` of at least 32 characters. Set `STATS_ADMIN_TOKEN` to enable admin stats. Public run submission defaults to enabled and can be disabled with `SHARED_CHAMPION_ENABLE_PUBLIC_RUNS`. Use a disposable local database for [integration tests](development.md#real-postgresql-integration). Configure and verify backups and point-in-time recovery with the database provider.

## Operations

Inspect options with `pnpm <command> -- --help` before selecting a target. For the database commands, an explicit `--env-file` overrides ambient environment values. [Operations scripts](../scripts/ops/)

| Command | Effect |
|---|---|
| `db:export` | Exports a local audit workbook. Use `--out` for its destination and keep player data private. |
| `db:reconcile` | Writes schema maintenance and reconciliation changes to the selected database. |
| `db:validate-constraints` | Validates database constraints and updates their validation status. |
| `ops:stats` | Reads protected stats using `BASE_URL` and a bearer token from `STATS_ADMIN_TOKEN`. |

## From pull request to production

1. On a PR, GitHub runs the [CI job](../.github/workflows/ci.yml) and Vercel builds a preview. The required GitHub check on `main` is `build`.
2. After merge, GitHub tests the merged commit and Vercel builds the production candidate in parallel. Production deployments must pass the Vercel Deployment Checks for the GitHub contexts `build` and `production-gameplay` before Vercel assigns the live domain.
3. Vercel sends `vercel.deployment.ready` to GitHub. The [gameplay workflow](../.github/workflows/public-agent-smoke.yml) checks out the candidate commit, plays through one death and restart at its deployment URL, and compares its served `skills.md` with that commit. It reports the result on the deployed commit. The live version keeps serving while a check is pending or failed.
4. After promotion, a half-hour [uptime check](../.github/workflows/uptime.yml) probes the homepage and leaderboard API. The daily gameplay run plays two rounds on the public URL to check repeated restarts. A manual run exercises one round. For map, animation or device-specific changes, run the additional [focused checks](development.md) before release.

The monitor plays in real time so the server can validate each run's elapsed time. Testing all leaderboard operations on a PR preview requires a separate preview database. An unconfigured preview can play the game while its leaderboard endpoints return HTTP 503.

## Release settings and recovery

The Vercel Git integration must send repository dispatch events. Keep production domain auto-assignment enabled with both production Deployment Checks set to block domain assignment. The GitHub environment `production-smoke` allows the `main` branch and holds the project’s automation bypass secret. The smoke exchanges it for a browser cookie on the immutable deployment origin. Rotation requires updating the Vercel bypass and the GitHub environment secret together. [Deployment Checks](https://vercel.com/docs/deployment-checks)

On failure, open the linked GitHub run and its browser diagnostics. A retry must test the same candidate URL and commit. GitHub statuses follow the commit SHA. For a new build of previously released source, use a fresh commit so a previous build's passing status cannot count toward the new release.

If a promoted game regresses, select the previous known-good production deployment in Vercel and use **Instant Rollback**. Verify the live homepage, leaderboard read and gameplay afterward. Database changes have their own recovery path. [Vercel rollback](https://vercel.com/docs/deployments/instant-rollback)
