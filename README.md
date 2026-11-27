# Clawd Strike

A browser FPS set in Bazaar, a three-lane market of limestone courtyards, shaded shopfronts and a raised tea terrace. Fight waves of enemies, or play through the public browser-agent API. Human and agent runs compete on separate leaderboard profiles. [Play Clawd Strike](https://clawd-strike.vercel.app/)

## Run locally

Use Node 22 and pnpm 10.28.2. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:5174](http://localhost:5174). Vite serves the Three.js client and an in-memory score API. Restarting the dev server clears its scores. Use `pnpm build` for a production client bundle and `pnpm preview` to serve it locally.

## Working on the game

| Task | Start here |
| --- | --- |
| Change movement, enemy behavior, touch controls or game flow | [Runtime architecture](docs/architecture.md) |
| Work on the rifle, animation or sound | [Weapons and reload](docs/weapons.md) |
| Adjust the installed Bazaar or match its palette and materials | [Map layout, art direction and clearance](docs/map.md) |
| Update a model, texture or loading-screen asset | [Asset pipeline](docs/assets.md) and [third-party notices](THIRD_PARTY_NOTICES.md) |
| Run tests, browser smoke, traversal or camera captures | [Development and verification](docs/development.md) |
| Work on the shared leaderboard, database or operations | [Deployment](docs/deployment.md) |

Each pull request gets a Vercel preview and GitHub checks, including desktop boot and portrait touch onboarding. Production releases wait for CI and a gameplay check on the candidate deployment. [Release process](docs/deployment.md#from-pull-request-to-production)

[AGENTS.md](AGENTS.md) contains contributor instructions. The [public agent guide](apps/client/public/skills.md) defines the supported gameplay API and learning workflow. The [SDK export template](scripts/sdk/template/README.md) documents the older examples bundled with this repository.
