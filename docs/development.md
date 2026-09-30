# Development and verification

## Setup

Use the Node version in [.nvmrc](../.nvmrc) and pnpm version in [package.json](../package.json). From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @clawd-strike/client exec playwright install chromium
pnpm dev
```

The Vite development port is 5174 with `strictPort`; `PORT` overrides it. The local API is in memory. No database setup is required for gameplay development. Current tracked sources do not require Git LFS.

`predev`, `prebuild`, and `prepreview` generate map outputs. After changing source map data, run `pnpm --filter @clawd-strike/client gen:maps` and review both the source and generated diff. `pnpm check:maps` checks freshness rather than silently accepting drift.

## Test layers

| Command | Coverage |
|---|---|
| `pnpm typecheck` | Root/server/tooling and client browser/worker/Playwright TypeScript |
| `pnpm lint:unused` | Knip's configured unused-file/export/dependency check |
| `pnpm test:unit` | Discovered `*.test.ts` below client `src/runtime`, client `src/shared`, and `apps/shared` |
| `pnpm test:tools` | Script `*.test.mjs` and root script `*.test.ts` |
| `pnpm test:server` | Server `*.test.ts`; database integration skips unless explicitly configured |
| `pnpm test:postgres` | Required real PostgreSQL integration against an explicit local test target |
| `pnpm test:e2e:smoke` | Runtime boot, agent traversal, death/restart, desktop-human profile |
| `pnpm test:e2e` | Full browser suite |
| `pnpm test:e2e:traversal` | Canonical final-map routes |
| `pnpm assets:loading-screen:verify` | Loading asset presence, formats, and budgets |

`pnpm test` combines the three non-browser test layers. Tests are discovered, so place them under the existing test roots. `pnpm typecheck` includes Playwright, but dynamic browser module URLs still require runtime coverage after moves.

The browser wrapper [run-playwright-qa.mjs](../apps/client/scripts/run-playwright-qa.mjs) owns its QA server and supplies `PW_BASE_URL`; the Playwright config requires that URL. Run a focused spec through the wrapper:

```sh
pnpm --filter @clawd-strike/client exec node scripts/run-playwright-qa.mjs test playwright/weapon-audio.spec.ts --workers=1
```

`pnpm test:e2e:headed` shows the browser. `pnpm test:e2e:pointer-lock` is the headed pointer-lock check. A browser or server launch blocked by the execution environment is an unavailable check, not a passing test.

## Real PostgreSQL integration

Set `TEST_POSTGRES_URL` to a disposable local PostgreSQL database named `clawdstrike_test` (or `clawdstrike_test_<suffix>`), then run `pnpm test:postgres`. The test accepts only loopback or Unix-socket targets and rejects remote hosts, unknown database names, and ambiguous connection parameters. It never falls back to production connection variables. The database user needs permission to create databases.

Each run creates its own database and retains it for diagnosis until the disposable server is retired. Coverage includes concurrent token claims, shared rate-limit reservations, competing score writes, rollback, profile separation, database constraints, and recovery after terminating idle connections. The command fails if `TEST_POSTGRES_URL` is missing; ordinary `pnpm test:server` still runs its URL-safety checks and reports the real database test as skipped without that variable.

CI supplies an ephemeral PostgreSQL 16 service and fixture credentials for this gate. Local release verification used PostgreSQL 16.2 on a private Unix socket with TCP disabled. This does not verify the deployed database's version, privileges, TLS configuration, or network behavior.

## Map and visual checks

CI runs the Playwright-pinned Chromium installed with its Linux dependencies. Local QA keeps system Chrome. Set `CI=1` locally to select the pinned browser and `PW_SOFTWARE_RENDERING=1` to reproduce SwiftShader explicitly. CI allows 60 seconds for the asset tracker to load the complete scene and observe eight texture-stability frames on software GL; the 9-second state/frame deadline and 150-second test deadline remain unchanged. The asset budget applies to agent, human and mobile URLs, with an explicit `qaAssetTimeoutMs` taking precedence. Software GL stages shader compilation and texture uploads before reveal, preserving the complete scene, shadows and postprocessing. The forced human boot gate still requires hardware GL. Software GL completes and retires one staged initialization draw before marking the runtime ready: geometry, shadow and postprocessing initialization belongs to startup rather than the nine-second steady-state frame budget. CI uses a 640×400 gameplay viewport; local desktop rendering retains 1440×900. Renderer identity and browser version appear in QA logs; failed CI runs retain traces, screenshots and runtime diagnostics for seven days.

Software GL uses a single-sample default framebuffer and HDR composer targets. SwiftShader advertises multisample format support, but the added HDR resolve path stalls after repeated frames; hardware renderers keep their supported MSAA sample count and canvas antialiasing. PBR, shadows, AO, postprocessing and the weapon remain enabled. Renderer logs include both composer sample counts and actual canvas antialiasing so QA can verify this policy.

Death/restart smoke uses deterministic QA to exercise combat death, the actual restart button and simulation-driven fade, run reset and retained last-run summary. It advances the fade after the click because this mode has no real-time loop. That test establishes behavior; the separate delayed-asset desktop test exercises the full rendered PBR/weapon path and verifies one submitted frame per 500 ms compatibility simulation batch.

The canonical traversal set covers the map with 12 routes. Use `pnpm test:e2e:traversal:focused` with `BAZAAR_ROUTE` to focus a change; use `pnpm test:e2e:traversal:blockout` for the optional blockout profile. Final release evidence uses the shipped final profile.

`pnpm map:check` compares protected gameplay against a recorded task baseline or HEAD and checks authored placement geometry. An existing task baseline must be inspected before interpreting the result. Do not replace it to hide a new failure. See [map](map.md).

`pnpm capture:shots` captures the authored cameras. `pnpm qa:completion` evaluates route, screenshot, asset-readiness, and performance evidence. Capture configuration includes `QA_PROFILE`, `SHOT_IDS`, `MAX_SHOTS`, `ALLOW_PARTIAL_SHOTS`, `DIAGNOSTIC_MODE`, and `CAPTURE_TRACE`; read the target runner before changing a setting. Partial or diagnostic runs do not establish a full completion pass.

`pnpm qa:release` runs map freshness, non-browser tests, final traversal, completion QA, the owned bot smoke, and a build. It does not include the full browser suite, typecheck, or Knip; run those separately for a release. The CI sequence is recorded in [AGENTS.md](../AGENTS.md).

Compare desktop and mobile captures at the same cameras and settings after rendering or asset changes. Inspect route visibility, missing assets, texture seams, weapon framing, and console/network errors. Automated pixels and route checks do not prove visual acceptance or physical-mobile performance.

## Manual performance and behavior smokes

These client commands still require an externally started server:

- `smoke:headshot-kill-perf`, `smoke:orb-scaling-perf`, and `smoke:wave-ammo-reset` default to the development server on 5174.
- `smoke:loading-screen-perf` defaults to a preview on 4174; build first, then run `pnpm --filter @clawd-strike/client preview --port 4174` in another terminal.

Invoke them with `pnpm --filter @clawd-strike/client <command>`. Inspect each script's `BASE_URL` and browser controls before changing the target. Never accidentally point an operational or submission smoke at production.

## Evidence and known limitations

Keep generated evidence under ignored `artifacts/`. Report the exact command, result, and remaining limitation. Recheck behavior after the last relevant edit; old logs describe old bytes.

The reload thumb-wrap assertion in `weapon-viewmodel.spec.ts` is a known asset contact/framing defect documented in [weapons](weapons.md). It remains a real failure until corrected and verified. A passing boot smoke does not cover that test. Do not lower the contact thresholds to make the release appear green.

At the September 2026 cleanup handoff, `qa:completion` also failed the existing `SHOT_14_CLOSEUP_PROP_GROUNDING` review and mobile geometry budgets: 635 draw calls against 500, and 1,410,846 triangles against 1,300,000. The prop-grounding image was unchanged by cleanup. These are rendering/asset follow-ups; do not increase the budgets to make the gate pass.

The cleanup baseline also reproduced bot pursuit failures. The production-readiness pass corrected collision-stall detection and waypoint reversal; the bot smoke now passes all 42 checks. Its elapsed-tier expectation follows the existing tuning, and zero-contact search measures progress toward assigned goals without assuming knowledge of a hidden player. Desktop scene checks now pass, including the corrected SHOT_14 metadata. Mobile remains deferred at the owner’s request, so the combined completion gate still reports its unchanged mobile budget failures. The reload thumb-contact issue and native desktop input still require explicit owner review before release.

CPU-only software GL uses a nonblocking GPU completion fence to bound queued real-time draws; it does not lower scene or texture quality. Manual QA renders return a promise and retain the existing nine-second operation budget. Always await them: completed simulation updates are distinct from submitted render frames.

The software initialization draw has a separate 60-second completion budget. The measured cold desktop draw takes about 30 seconds to retire because executable GPU kernels are compiled lazily, even after Three reports shader compilation complete. Startup waits on the actual fence before Ready; steady-state frame/state and total browser-test deadlines are unchanged.
