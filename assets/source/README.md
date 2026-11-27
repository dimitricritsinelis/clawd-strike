# Retained asset sources

| Path | Purpose |
|---|---|
| [ak47/](ak47/) | First-person weapon scene, donor assets, grips and export tools. Follow the [weapon guide](../../docs/weapons.md). |
| [enemy-raider/](enemy-raider/) | Character donor, Blender scene and builder. The builder also reads the [rifle donor](ak47/legacy/ak47.glb). |
| [audio/](audio/) | Market ambience and reload foley source records. The [owner declaration](owner-created.provenance.json) covers other named assets. |
| `unit-*/`, `bz04-shared-environment/` and shared Python helpers | Source records for the installed Bazaar. Shipped catalogs reference individual builders through `repo://` paths. |

The facade builders depend on construction inputs outside this tree, including `design.json`, `handoff.py` and roof coordination data. Normal game builds use the installed GLBs and textures. To update an installed package, follow [asset maintenance](../../docs/assets.md).

For historical facade designs, commit `a95f3d692b2de8fb9e0b12cae991e84fa3308b88` contains `docs/map-design/construction/`, including the design, handoff, roof coordination and drawings. In a shallow checkout, retrieve it with `git fetch --depth=1 origin a95f3d692b2de8fb9e0b12cae991e84fa3308b88`. That revision lacks the generator for the shipped atmosphere. Use the installed assets and [atmosphere data](../../apps/client/src/runtime/map/atmosphere/atmosphere.json) as the current reference.
