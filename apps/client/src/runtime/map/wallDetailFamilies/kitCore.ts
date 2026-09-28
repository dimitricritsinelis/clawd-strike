import type { BufferGeometry, MeshStandardMaterial } from "three";
import type { WallMaterialLibrary, WallTextureQuality } from "../../render/materials/WallMaterialLibrary";
import type { RuntimeWallMode } from "../../utils/UrlParams";

export type WallDetailMeshId = "plinth_strip" | "facade_wall_shell" | "roof_slab";

export type WallDetailInstance = {
  /** Stable compiled placement id used by internal visual QA. */
  placementId?: string;
  /** Stable compiled facade module id used by internal visual QA. */
  moduleId?: string;
  /** Semantic class used by internal visual QA; never exposed publicly. */
  semanticClass?: string;
  meshId: WallDetailMeshId;
  position: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
  yawRad: number;
  pitchRad?: number;
  rollRad?: number;
  wallMaterialId: string | null;
  trimMaterialId: string | null;
};

export type BuildWallDetailMeshesOptions = {
  highVis: boolean;
  wallMode: RuntimeWallMode;
  wallMaterials: WallMaterialLibrary | null;
  quality: WallTextureQuality;
  seed: number;
};

export type DetailTemplate = {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
};
