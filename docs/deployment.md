# Deployment and operations

## Vercel build

[vercel.json](../vercel.json) runs `pnpm typecheck && pnpm build` and publishes `apps/client/dist`. The build regenerates runtime maps from `apps/client/assets-src/maps/`. [.vercelignore](../.vercelignore) excludes local credentials, evidence, Blender sources, docs, and old build output; it keeps application, API, server, scripts, and map build inputs.

The production site is [clawd-strike.vercel.app](https://clawd-strike.vercel.app/). The root package pins Node 22.x, matching `.nvmrc` and CI; this overrides the project dashboard default for subsequent deployments. Repository configuration is not proof that a deployment or its dashboard/environment matches it. Confirm the target deployment before release operations.

## Runtime environment

Set secrets through the deployment environment, never client code or a committed file. The server connection selector uses these precedence chains:

| Use | First configured non-empty value |
|---|---|
| Write | `POSTGRES_WRITE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `NEON_DATABASE_URL` |
| Read | `POSTGRES_READ_URL`, then the write chain |
| Maintenance | `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED`, then the write chain |

Production requires an appropriate Postgres connection. `PRIVACY_HASH_SECRET` must contain at least 32 characters; production privacy hashing fails closed without it. `STATS_ADMIN_TOKEN` enables protected admin statistics; without it production admin requests are unavailable. `SHARED_CHAMPION_ENABLE_PUBLIC_RUNS` optionally controls public run submission and defaults to enabled.

`VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_GIT_COMMIT_SHA`, and `VERCEL_GIT_COMMIT_REF` are deployment metadata used by the platform or application. Do not substitute application secrets into those variables. Development-only fallback secrets are not production configuration.

Vite's development middleware explicitly uses an in-memory store. Adding a local env file does not make that middleware exercise Postgres. Production database checks require an explicitly authorized database target.

## Headers and caching

The checked-in headers deny framing, disable MIME sniffing, restrict referrers, and disable camera/microphone/geolocation permissions. CSP keeps scripts and network connections on the same origin, permits the configured inline styles and image data/blob URLs, and disallows objects and third-party embedding. Inspect the exact CSP before introducing a worker, external service, or asset host.

| URL | Cache policy in `vercel.json` |
|---|---|
| `/build/*` | One year, immutable; Vite content-hashed bundles |
| Content-addressed facade textures | One year, immutable; filenames derive from image-byte hashes |
| Other `/assets/*`, `/loading-screen/*`, `/maps/*` | Revalidate on every use; unchanged cached bodies can be reused |
| `/api/*` | No store |

Unhashed assets and map/manifests revalidate so a new deployment cannot continue loading an old model or a removed asset list for a week. Map JSON and material/model manifest fetches also use `cache: "no-cache"` to revalidate responses stored under an earlier deployment's longer cache lifetime; new response headers alone cannot invalidate those browser copies. Keep immutable caching only for content-addressed files and bundles. Verify served asset identity, conditional responses and headers on the target preview; a successful local build does not exercise the CDN.

## Workflows

- `ci.yml`: PRs, pushes to `main`, and manual dispatch; generated maps, typecheck, Knip, non-browser tests, real PostgreSQL integration, browser smoke, and build.
- `public-agent-smoke.yml`: daily schedule and manual dispatch against production; public contract smoke and deployed `skills.md` comparison.
- `uptime.yml`: page and champion API probes every 30 minutes and on dispatch.

There is no repository workflow that publishes database backup artifacts. Backup and point-in-time recovery must be configured and checked with the database provider; removal of a workflow does not prove that recovery is enabled.

## Database release checks

Run `pnpm test:postgres` with an explicit local `TEST_POSTGRES_URL` before releasing server changes. [Development](development.md#real-postgresql-integration) describes the target restrictions and retained test databases. CI uses an isolated PostgreSQL 16 service; its fixed credentials belong only to that disposable fixture.

The store reserves rate-limit slots atomically under a transaction-scoped lock per namespaced client fingerprint. Competing score writes retain strict greater-than promotion and read the committed winner with a fresh statement snapshot. Failed idle pool connections are discarded without crashing the process or logging credentials; later queries reconnect.

Local release verification exercised these paths on PostgreSQL 16.2, including concurrent schema startup, token replay, profile separation, constraints, stats authorization, process restart, and database stop/restart persistence. Deployed database version and connection behavior remain separate checks; successful local recovery does not promise that every request in flight during an outage succeeds.

## Database and stats tools

The `scripts/ops/` tools accept explicit targets. Read `--help` before running them:

- `pnpm db:export -- --help` describes the local workbook audit export. Its output can contain player data; keep it private and out of Git or public CI artifacts.
- `pnpm db:reconcile -- --help` describes reconciliation/schema maintenance. It writes to the selected database.
- `pnpm db:validate-constraints -- --help` describes database constraint validation. Treat it as a database-writing operation.
- `pnpm ops:stats -- --help` describes authenticated stats queries; supply the bearer token through the environment.

For the TypeScript operations scripts, an explicit `--env-file` overrides ambient environment values. Verify the selected file and database deliberately. Never print credentials while diagnosing connection selection.

## Release verification

1. Run the CI checks, full browser suite, map guard where applicable, and `pnpm qa:release`. Resolve failures or report them explicitly; do not turn a partial check into a release pass.
2. Review desktop/mobile captures, actual asset requests, and gameplay/audio behavior affected by the change.
3. After deployment is authorized, create a preview and check headers, API behavior, and required environment configuration there. Run `BASE_URL=<preview-url> pnpm smoke:public` only against the intended target.
4. Publish or merge only with the owner's authorization. After deployment, run `BASE_URL=<deployment-url> pnpm verify:skills` after a build, or set `LOCAL_SKILLS_PATH=public/skills.md` to compare the source contract directly.
5. Record the deployed revision and unresolved limits. Source checks do not prove remote rollout, physical-device performance, or asset licensing completeness.

The owner identified the project as noncommercial during cleanup. The [notices](../THIRD_PARTY_NOTICES.md) record the owner-confirmed original assets and the separate third-party dependencies.
