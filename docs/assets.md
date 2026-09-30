# Asset sources and builds

## Ownership

[assets/source](../assets/source/) contains retained Blender and audio sources. [apps/client/assets-src](../apps/client/assets-src/) contains loading-screen masters and map build inputs. `apps/client/public/` is deployed verbatim: put an output there only when the application uses it. Keep renders, diagnostics, and intermediate exports outside public assets, usually in ignored `exports/` or `artifacts/` directories.

Shipped models and material catalogs carry source records in `models.json`, `provenance.json`, `sources.json`, or `SOURCE.md`. Record source URL/repository path, author when known, recorded license, modifications, and checksums. [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) indexes third-party and unresolved sources; it does not replace per-file provenance.

The asset-provenance tooling tests check catalog/disk consistency, selected hashes, texture families, and repository source paths. Passing them proves those mechanical contracts, not ownership, artistic acceptance, or every asset's legal status.

## Blender

For a live supported builder on macOS, run a separate headless process:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 --python assets/source/enemy-raider/build.py
```

Read the chosen builder before running it: many install public output as part of their build. Author in metres with Blender Z up and export with `export_yup`; use the base centre as the origin where the asset contract requires it. Facade wall planes use Y=0, with the street toward negative Y. Do not overwrite a live user scene.

Blender MCP is optional local tooling. Verify its connection for the current session rather than relying on an old setup record. Keep reproducible shipped builds in their existing source pipeline.

## Frozen facade builders

Most map unit and shared-environment scripts depend on construction inputs removed from the tip. They are retained as provenance and reproduce at `archive/bazaar-map-dev` with that revision's complete design bundle. See [source README](../assets/source/README.md) and [map](map.md). Individual standalone prop builders may remain usable; check their imports and inputs before running them.

Facade installation is still handled by:

```sh
pnpm assets:facade apply <unit>
pnpm assets:facade revert <unit>
pnpm assets:facade pack-textures
```

`apply` consumes a unit package; `revert` needs its saved local backup. `pack-textures` externalizes embedded textures into the shared content-addressed texture directory. Review all catalog, GLB, texture, map-source, and generated-output changes together. Do not hand-edit hashed texture names or assume that a local rollback artifact exists in another checkout.

## CC0 intake

The existing scripts fetch Poly Haven material/model data and write source records:

```sh
pnpm assets:fetch-texture <polyhaven-id> --res 1k,2k
pnpm assets:fetch-model <polyhaven-id> --res 1k
```

Texture intake adds the `ph_<id>` material convention to the wall pack. Model intake updates the prop catalog. A downloaded entry is not automatically visible: use the supported source-spec asset registry and model dressing placement, regenerate maps, and verify the load plan includes it. Direct texture consumers and frozen atmosphere model IDs also participate in loading; a catalog-only search is insufficient for safe deletion.

## Loading-screen assets

The manifest and masters under `apps/client/assets-src/loading-screen/` generate `public/loading-screen/assets/`:

```sh
pnpm assets:loading-screen
pnpm assets:loading-screen:verify
```

The verifier checks generated formats and size budgets. Visually inspect desktop and mobile layouts after image changes. Audio/source licensing needs its own recorded provenance; the optimization manifest describes processing, not license ownership.

## Weapon and raider

The AK has a live authoring/export pipeline and a single reload timeline; follow [weapons](weapons.md). The raider builder uses `assets/source/enemy-raider/donor/model_source_4k.glb` and the retained AK donor under `assets/source/ak47/legacy/`. Its current provenance records a 1.8 m character, `Raider_Low`/`Raider_High`, a rifle, `MuzzleSocket`, and nine idle/directional movement clips. Preserve the low/high triangle checks in the browser spec; runtime mesh simplification is not an equivalent export.

The owner confirmed that the Tripo donor, older weapon/UI audio, and loading-screen imagery/music were their own creations. The [owner declaration](../assets/source/owner-created.provenance.json) records that statement. The raider's rifle retains its separate third-party source terms, and its historical design-approval field is not a new playtest sign-off.

## Change verification

Run `pnpm test:tools`, affected runtime tests, `pnpm check:maps`, `pnpm typecheck`, and `pnpm build` as applicable. For changed map assets also run the map guard and traversal/capture checks. For weapon, character, or audio changes run their browser specs and inspect the actual in-game result; audio requires listening. Confirm the loaded asset's bytes when stale browser/CDN content could invalidate the comparison.
