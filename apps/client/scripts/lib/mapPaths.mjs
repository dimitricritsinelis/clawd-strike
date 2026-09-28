// Bazaar map source data. gen-map-runtime.mjs compiles it into
// apps/client/public/maps/bazaar-map/ and records the repo-relative path of
// each input as generatedFrom.path, so moving these files needs a regen.
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
export const MAP_SOURCE_DIR = "apps/client/assets-src/maps/bazaar-map";

/** Repo-relative, "/"-separated source paths. */
export const MAP_SOURCE = Object.freeze({
  spec: `${MAP_SOURCE_DIR}/map_spec.json`,
  specSchema: `${MAP_SOURCE_DIR}/map_spec_schema.json`,
  compositionWaivers: `${MAP_SOURCE_DIR}/composition_waivers.json`,
  compositionWaiversSchema: `${MAP_SOURCE_DIR}/composition_waivers.schema.json`,
  generatedProvenanceSchema: `${MAP_SOURCE_DIR}/generated_provenance.schema.json`,
  shots: `${MAP_SOURCE_DIR}/shots.json`,
});

/** Absolute paths of MAP_SOURCE. */
export const MAP_SOURCE_ABS = Object.freeze(Object.fromEntries(
  Object.entries(MAP_SOURCE).map(([key, relativePath]) => [key, path.join(REPO_ROOT, relativePath)]),
));
