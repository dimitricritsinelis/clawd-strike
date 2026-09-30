# Repository instructions

Clawd Strike is a browser FPS with an installed Bazaar map. Work from the current task and current source. The BZ-04 and R-round construction queues are archived at `archive/bazaar-map-dev`; those historical instructions do not authorize new construction or gameplay changes.

## Scope and verification

Use the smallest complete change in the existing design. Preserve unrelated work. Use bounded subagents for independent work when they save time, assign disjoint files, and let one owner integrate shared registries. Serialize heavy Blender jobs and browser QA when they compete for the same machine.

Before a PR, run the CI gates:

```sh
pnpm check:maps
pnpm typecheck
pnpm lint:unused
pnpm test
pnpm test:e2e:smoke
pnpm build
```

For map or asset changes, also run `pnpm map:check`, affected browser specs, and the relevant traversal/capture checks in [development](docs/development.md). Inspect the full diff. Record failures and unavailable checks accurately. A passing build, collider snapshot, or screenshot metric does not establish visual quality, gameplay feel, physical-device performance, or audio quality.

## Invariants

1. Colliders, routes, cover, spawns, playable elevation, and the protected fields/files in [mapGuard.ts](scripts/lib/mapGuard.ts) change only within an explicitly scoped task. Never weaken a check or reset its baseline to conceal a change. A protected-file report requires inspection even when the change is a refactor.
2. [map_spec.json](apps/client/assets-src/maps/bazaar-map/map_spec.json) owns map source data. Use the existing schema and `scripts/assets/apply-facade-package.mjs` for supported asset installation. Regenerate with `pnpm --filter @clawd-strike/client gen:maps`.
3. Do not hand-edit generated maps in `apps/client/public/maps/`, loading-screen derivatives in `apps/client/public/loading-screen/assets/`, or content-addressed facade textures. The atmosphere JSON is frozen generated data; its archived generator and inputs must be recovered together for regeneration. See [map](docs/map.md).
4. Keep gameplay values and behavior documented in [skills.md](apps/client/public/skills.md) synchronized with code. Run the public-agent contract spec when those change and `pnpm verify:skills` against the intended deployment after release. The fingerprinted gameplay baseline contributes to `tuningRevision` and leaderboard board keys; changing it creates a new balance revision.
5. Reload timing lives in [ak47ReloadMarks.ts](apps/client/src/runtime/weapons/ak47ReloadMarks.ts). Rebuild the clip and asset after changing it. Preserve the TypeScript literal forms parsed by the Blender exporter; [weapons](docs/weapons.md) identifies them.
6. Record each shipped asset's source, author when known, license evidence, and transformations in its provenance or source manifest. Add third-party entries to [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). A manifest entry alone does not prove an asset is used or loaded. Keep review exports and unused sidecars out of `public/`.
7. New AI-generated meshes or images need owner approval and a provenance/notice entry before shipping. Existing recorded assets do not authorize unrelated generation. Preserve the Latin-label art direction; do not add invented or pseudo-Arabic lettering.
8. Never commit credentials or `.env*` files other than an explicitly requested example. Do not read or modify production configuration without authorization.
9. Keep captures, temporary reports, and review outputs in ignored `artifacts/` or outside the checkout. Never claim historical evidence as a fresh verification.
10. Remove a replaced runtime path with its replacement. Do not introduce permanent enable flags or legacy URL forks to retain dead code.

## Integration traps

- Playwright specs are typechecked, but runtime module imports expressed as URL strings still need the affected browser tests after renames.
- `gameplayTuning.ts` must remain importable in Node; helpers used by workers must not depend on browser-only globals.
- Some asset and readiness tests inspect source text. Check those consumers before moving literals or paths.
- The map generator's path is recorded in the provenance schema. Move all consumers and the schema together if a task explicitly changes it.
- Vite's development API always injects an in-memory store. A local env file does not turn it into the deployed Postgres API.
- Use headless Blender for reproducible asset builds. Never save over the user's live scene. Confirm a live MCP connection before relying on it; machine setup in an old log is not current evidence.

## Documentation ownership

| Change | Update |
|---|---|
| Runtime structure | [Architecture](docs/architecture.md) |
| Commands or QA | README and [development](docs/development.md) |
| Map or clearance | [Map](docs/map.md) |
| Asset pipeline or provenance | [Assets](docs/assets.md) and notices |
| Weapon timing or tuning | [Weapons](docs/weapons.md), plus the public contract when applicable |
| Backend environment or operations | [Deployment](docs/deployment.md) |
