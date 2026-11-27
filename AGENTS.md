# Repository instructions

Clawd Strike ships one Bazaar map. Use the installed game as the reference for maintenance and small design changes. The [map guide](docs/map.md) identifies its routes, landmarks, palette and clearance rules. The [architecture guide](docs/architecture.md) identifies the owners of gameplay, rendering, input and animation.

## Change boundaries

- Preserve routes, cover, spawns, playable elevation and colliders unless the task explicitly changes them. Inspect every protected-file report from the [map guard](scripts/lib/mapGuard.ts). Never weaken a check or reset its baseline to hide a change.
- Edit [map sources](apps/client/assets-src/maps/bazaar-map/) and regenerate with `pnpm --filter @clawd-strike/client gen:maps`. Review source and generated output together. Keep the generator path synchronized with the provenance schema. Treat the installed atmosphere data as frozen.
- Use the [asset pipeline](docs/assets.md) for facades, content-addressed textures and loading-screen derivatives. Keep editable sources, licenses and catalog provenance. Record third-party assets in the [notices](THIRD_PARTY_NOTICES.md). New AI-generated meshes or images require owner approval and a provenance/notice entry before shipping.
- Keep documented gameplay behavior synchronized with the [public agent contract](apps/client/public/skills.md). Changes to fingerprinted balance values create new leaderboard board keys. Keep shared tuning importable from Node and worker dependencies free of browser globals.
- Update the [reload marks](apps/client/src/runtime/weapons/ak47ReloadMarks.ts), authored clip and exported asset together for timing changes. The Blender tools parse specific TypeScript declarations. Use headless Blender and protect open scenes. [Weapon guide](docs/weapons.md)
- Keep secrets and local environment files out of Git. Access production configuration only with explicit authorization. Keep review output under ignored `artifacts/` or outside the checkout. Remove a superseded runtime path when replacing it.

## Verification

Before a PR, run the gates in the [CI workflow](.github/workflows/ci.yml), including its disposable PostgreSQL integration test. [Development and verification](docs/development.md) gives the local commands and setup.

- For map or asset changes, also run `pnpm map:check`, affected browser specs, and relevant traversal and camera checks. Inspect the diff and the affected views.
- For public gameplay changes, run the [public agent contract spec](apps/client/playwright/public-agent-contract.spec.ts). After release, verify the intended deployment with `pnpm verify:skills`.
- Run affected browser specs after moving modules referenced by URL. Some asset and readiness tests also inspect source text. Report checks run, failures and any remaining visual, audio or device checks.

Update the guide that owns the changed behavior. The [README](README.md) indexes those guides. [Deployment](docs/deployment.md) owns backend operations.
