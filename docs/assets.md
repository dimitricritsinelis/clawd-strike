# Asset maintenance

[assets/source](../assets/source/README.md) holds Blender sources and audio provenance. [apps/client/assets-src](../apps/client/assets-src/) holds map build inputs and loading-screen masters. Vite copies `apps/client/public/` into the build. Put review renders and intermediate exports in ignored `artifacts/`.

## Changing a shipped asset

| Asset | Edit or build | Verify |
|---|---|---|
| Bazaar facades and props | Use the package and catalog workflow below. | Run `pnpm map:check` and review the affected route and camera views. See [Bazaar](map.md). |
| First-person weapon and reload | Follow the [weapon export guide](weapons.md) for the retained Blender scene, reload marks and clip. | Run the weapon viewmodel spec and inspect a full reload and interruptions. |
| Enemy raider | Run the [Blender builder](../assets/source/enemy-raider/build.py) against the retained character and rifle donors. It writes the source scene, runtime GLB and provenance. | Run the [raider spec](../apps/client/playwright/enemy-raider.spec.ts) for mesh tiers, sockets and motion. |
| Loading screen | Edit the [masters and manifest](../apps/client/assets-src/loading-screen/), then run `pnpm assets:loading-screen`. This replaces the generated output directory. | Run `pnpm assets:loading-screen:verify` for file inventory, runtime references and size budgets. Check desktop and mobile layouts. |
| Audio | Keep source credits and processing records under [assets/source/audio](../assets/source/audio/). | Run the [weapon audio spec](../apps/client/playwright/weapon-audio.spec.ts) for weapon changes and listen in game. |

Run Blender builders in a separate headless process. For the raider on macOS, run the following from the repository root.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 --python assets/source/enemy-raider/build.py
```

## Bazaar packages

To install a facade, supply `assets/source/<unit>/package.json` and every GLB named in it. From the repository root run `pnpm assets:facade apply <unit>`, then `pnpm map:check`. The installer updates the source map, facade catalog, GLBs and shared texture hashes. The guard regenerates the runtime map and checks protected gameplay and placement clearance. Review the changes together.

`pnpm assets:facade revert <unit>` restores the last apply from its local checkpoint in `artifacts/facade-packages/`. Run the map guard again after a revert. Use `pnpm assets:facade pack-textures` only when installed GLBs need their embedded images externalized. It processes the whole catalog without creating a checkpoint.

For new Poly Haven assets use `pnpm assets:fetch-model <id> --res 1k` or `pnpm assets:fetch-texture <id> --res 1k,2k`. These populate the prop or wall catalog. Use a new family ID for texture intake. A failed download deletes that family's local directory, even if it existed before the run. [Texture intake](../scripts/assets/fetch-cc0-texture.mjs)

Place a new prop through the source map’s asset registry and dressing clusters. Before retiring a file, trace model placements, shared textures and direct texture URLs through the [runtime loader](../apps/client/src/runtime/bootstrap/assetLoading.ts) and [asset plan](../apps/client/src/runtime/qa/assetReadiness.ts).

## Attribution

Record each shipped asset’s source URL or tracked repository path, author when known, license evidence, modifications and checksums in its catalog or provenance file. Add third-party credits to [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). The [owner declaration](../assets/source/owner-created.provenance.json) covers the named character donor, audio and loading-screen assets. The rifle used by both character and viewmodel has its own license.

Run `pnpm test:tools` after catalog changes. Its [provenance tests](../apps/client/scripts/lib/asset-provenance.test.mjs) check Bazaar pack inventories, hashes and tracked source paths.
