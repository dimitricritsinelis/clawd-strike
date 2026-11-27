# Development and verification

Use the [root setup instructions](../README.md) to install dependencies and run the game. Vite uses port 5174 by default and honors `PORT` with strict port selection. The local API stores scores in memory.

## CI checks

From the repository root, run the same gates as the [CI workflow](../.github/workflows/ci.yml). The workflow supplies an isolated PostgreSQL 16 service and Playwright's pinned Chromium.

| Command | Coverage |
|---|---|
| `pnpm check:maps` | Committed runtime maps match current authoring inputs. Run before build or dev regenerates them. |
| `pnpm typecheck` | Server, tooling, browser, worker and Playwright TypeScript |
| `pnpm lint:unused` | Knip checks for unused files, exports and dependencies |
| `pnpm test` | Client/shared unit tests, tooling tests and server tests. Run a layer with `test:unit`, `test:tools` or `test:server`. |
| `pnpm test:postgres` | Real store integration using an explicit local database, as described below |
| `pnpm build` | Production client bundle |
| `pnpm test:e2e:smoke` | Runtime boot, agent traversal, death/restart, the desktop human profile and the portrait touch menu, name entry and gameplay HUD. CI installs Chromium after the build succeeds. |

## Focused browser checks

The Playwright wrapper starts an isolated Vite server and sets `PW_BASE_URL`. The local configuration launches Google Chrome. To use pinned Chromium, install it with `pnpm --filter @clawd-strike/client exec playwright install chromium` and run the test with `CI=1`. CI also uses a smaller gameplay viewport. To exercise SwiftShader explicitly, set `PW_SOFTWARE_RENDERING=1`. [Browser configuration](../apps/client/playwright.config.ts)

Run the full suite with `pnpm test:e2e`. For a change to touch onboarding, for example, run only its spec through the same wrapper:

```sh
pnpm --filter @clawd-strike/client exec node scripts/run-playwright-qa.mjs test playwright/mobile-human-onboarding.spec.ts
```

Use the [spec directory](../apps/client/playwright/) to select coverage for viewmodel animation, audio, public agent behavior, startup recovery and other features outside the smoke suite. Run affected browser specs after moving runtime modules because TypeScript cannot validate URLs imported as strings.

Native desktop input was still awaiting hands-on review at the previous handoff. Run `pnpm test:e2e:pointer-lock` for the headed check, then play with a mouse and keyboard to assess look, movement and pointer reacquisition after restart. Check touch controls and frame rate on a physical phone after touch or rendering changes.

## Map and visual checks

- Run `pnpm map:check` for protected gameplay and authored placement clearance. Check which task baseline or Git revision it compares before interpreting a difference. [Map guide](map.md)
- `pnpm test:e2e:traversal` runs the canonical routes on the shipped map. Set `BAZAAR_ROUTE` to a route ID and run `pnpm test:e2e:traversal:focused` for a targeted check. The separate `test:e2e:traversal:blockout` profile helps diagnose geometry.
- `pnpm capture:shots` captures the authored review cameras. `pnpm qa:completion` checks traversal, capture coverage, asset readiness and performance budgets. Inspect comparable desktop and mobile frames for route visibility, missing models, seams and framing. Keep review output in ignored `artifacts/`. [Capture runner](../apps/client/scripts/capture-map-shots.mjs) · [Completion gate](../apps/client/scripts/qa-completion-gate.mjs)
- `pnpm qa:release` combines map freshness, non-browser tests, final traversal, completion QA, bot smoke and build. The other CI gates and full browser suite remain separate.

For focused performance checks, `smoke:headshot-kill-perf`, `smoke:orb-scaling-perf` and `smoke:wave-ammo-reset` use a running dev server on 5174 by default. For `smoke:loading-screen-perf`, build and start `pnpm --filter @clawd-strike/client preview --port 4174` first. Invoke these scripts with `pnpm --filter @clawd-strike/client <command>`.

## Real PostgreSQL integration

Set `TEST_POSTGRES_URL` to a disposable local PostgreSQL target named `clawdstrike_test` or `clawdstrike_test_<suffix>`. Use a loopback host or local Unix socket and a database role with permission to create databases. Each run creates a separate database and retains it for diagnosis. The test covers concurrent token claims, rate limits, competing scores, rollback, constraints, profile isolation and connection recovery. [Integration test and target restrictions](../server/realPostgres.integration.test.ts)

Without `TEST_POSTGRES_URL`, the ordinary server suite skips the real database test and the required `pnpm test:postgres` gate fails.
