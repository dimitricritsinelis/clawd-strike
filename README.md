# Clawd Strike

A browser FPS set in Bazaar, with wave-based bots, a shared-champion leaderboard, and a public browser-agent API. Play at [clawd-strike.vercel.app](https://clawd-strike.vercel.app/).

The client uses Three.js, Vite, and TypeScript. This pnpm workspace includes the browser client, shared contracts, Vercel API functions, and a Postgres backend.

## Run locally

Use Node 22 (`.nvmrc`) and pnpm 10.28.2 (`package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:5174](http://localhost:5174). Development, build, and preview regenerate the runtime map first. The development API uses an in-memory store that resets with the server; no database credentials are needed. See [deployment](docs/deployment.md) for the production backend.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the client and local development API |
| `pnpm build` / `pnpm preview` | Build / serve the built client |
| `pnpm check:maps` | Verify committed generated maps match their sources |
| `pnpm typecheck` / `pnpm lint:unused` | Check TypeScript, including Playwright, / unused code |
| `pnpm test` | Run unit, tooling, and server tests |
| `pnpm test:e2e:smoke` | Run the browser boot and gameplay smoke tests |
| `pnpm test:e2e` | Run the full browser suite |
| `pnpm test:e2e:traversal` | Check the canonical routes on the final map |
| `pnpm map:check` | Check protected gameplay and authored placement clearance |
| `pnpm capture:shots` / `pnpm qa:completion` | Capture review cameras / run completion QA |
| `pnpm qa:release` | Run the combined map, test, traversal, completion, bot, and build gate |
| `pnpm assets:loading-screen` | Rebuild loading-screen assets |
| `pnpm sdk:export -- --dry-run --out <directory>` | Preview the companion SDK export |

Browser tests require Chromium: `pnpm --filter @clawd-strike/client exec playwright install chromium`. [Development](docs/development.md) explains focused checks and the limits of automated evidence.

## Repository

- `apps/client/src/`: loading screen, runtime, UI, and rendering.
- `apps/client/assets-src/`: map and loading-screen build inputs.
- `apps/client/public/`: shipped assets, generated maps, and the public agent contract.
- `apps/client/scripts/` and `apps/client/playwright/`: generation and QA.
- `apps/shared/`: browser/server contracts.
- `api/` and `server/`: Vercel routes and backend implementation.
- `scripts/`: asset intake, database operations, map guard, and SDK export.
- `assets/source/`: retained asset sources; frozen map builders are identified in its README.

## Guides

[Architecture](docs/architecture.md), [development](docs/development.md), [deployment](docs/deployment.md), [map](docs/map.md), [assets](docs/assets.md), and [weapons](docs/weapons.md).

[AGENTS.md](AGENTS.md) contains repository engineering instructions. [skills.md](apps/client/public/skills.md) is the public browser-agent contract. The [SDK template](scripts/sdk/template/README.md) documents its current compatibility limits. [Third-party notices](THIRD_PARTY_NOTICES.md) record asset sources and unresolved provenance.

The completed map-construction documents and generators remain in Git at `archive/bazaar-map-dev`. They are historical references, not the current work queue.
