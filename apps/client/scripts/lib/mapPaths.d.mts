// Types for mapPaths.mjs, imported by the root scripts/*.ts map guard.
type MapSourceKey =
  | "spec"
  | "specSchema"
  | "compositionWaivers"
  | "compositionWaiversSchema"
  | "generatedProvenanceSchema"
  | "shots";

export declare const REPO_ROOT: string;
export declare const MAP_SOURCE_DIR: string;
export declare const MAP_SOURCE: Readonly<Record<MapSourceKey, string>>;
export declare const MAP_SOURCE_ABS: Readonly<Record<MapSourceKey, string>>;
