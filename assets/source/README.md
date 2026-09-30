# Retained asset sources

This directory holds retained source assets, builders, and provenance inputs. Most review renders and intermediate build outputs are ignored. Public runtime assets live under `apps/client/public/`; do not publish source sidecars or temporary exports there.

The facade unit and shared-environment pipelines are frozen. Their complete `design.json`, `handoff.py`, roof coordination, drawings, and generators are preserved at Git tag `archive/bazaar-map-dev`. These builders generally do not reproduce in the current checkout because their construction inputs were archived. They remain here to preserve source provenance and `repo://` references. Recover the whole historical bundle in a separate checkout before reproducing a map unit.

The AK authoring/export pipeline and raider builder remain active. Individual standalone prop builders may work independently; inspect their imports and file inputs before running them. A script's presence is not proof of a working regeneration path.

See [assets](../../docs/assets.md) for source and installation rules, [weapons](../../docs/weapons.md) for the current reload pipeline, and [third-party notices](../../THIRD_PARTY_NOTICES.md) for recorded attribution and gaps. Never overwrite a user's live Blender scene.
