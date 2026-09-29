export type RuntimeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type RuntimeVec3 = {
  x: number;
  y: number;
  z: number;
};

export type RuntimeBlockoutZone = {
  id: string;
  type: string;
  rect: RuntimeRect;
  label: string;
  notes: string;
  surfaceId?: string;
  districtId?: string;
  macroLane?: RuntimeMacroLane;
  floorMaterialId?: string;
  facadeProfileId?: string;
  clearWidthM?: number;
  /** Authored section GLB that owns the zone's faces listed in sectionFaces (default all four). */
  sectionModelId?: string;
  sectionFaces?: RuntimeFacadeFace[];
};

export type RuntimeMacroLane = "west" | "main" | "east";

export type RuntimeDistrict = {
  id: string;
  label: string;
  notes?: string;
};

type RuntimeFlatTraversalSurface = {
  id: string;
  zoneId: string;
  kind: "flat";
  rect: RuntimeRect;
  elevationM: number;
};

export type RuntimeRampTraversalSurface = {
  id: string;
  zoneId: string;
  kind: "ramp";
  rect: RuntimeRect;
  axis: "x" | "y";
  startElevationM: number;
  endElevationM: number;
  visualStyle?: "ramp" | "stairs";
  stepCount?: number;
};

export type RuntimeTraversalSurface = RuntimeFlatTraversalSurface | RuntimeRampTraversalSurface;

export type RuntimeTacticalLane = {
  id: RuntimeMacroLane;
  label: string;
  zoneIds: string[];
  cost?: number;
};

export type RuntimeExplicitConnectivityEdge = {
  fromZoneId: string;
  toZoneId: string;
  transitionSurfaceId?: string;
  cost?: number;
};

export type RuntimeAuthoredSpawn = {
  id: string;
  kind: "player" | "enemy";
  zoneId: string;
  surfaceId: string;
  x: number;
  y: number;
  yawDeg: number;
};

export type RuntimeFrontage = {
  id: string;
  zoneId: string;
  face: "north" | "south" | "east" | "west";
  start?: number;
  end?: number;
  districtId?: string;
  facadeProfileId?: string;
  massingProfileId?: string;
  bays?: RuntimeFrontageBay[];
  layout?: RuntimeFrontageLayout;
};

export type RuntimeFrontageBay = {
  id: string;
  moduleId: string;
  along: number;
  baseElevationM: number;
  datumId?: string;
  columnId?: string;
  layoutSource?: RuntimeFacadeLayoutSource;
};

/** Generated layouts come from the rhythm grammar; authored layouts are composed per frontage. */
export type RuntimeFacadeLayoutSource = "generated" | "authored";

export type RuntimeFrontageLayout = {
  source: RuntimeFacadeLayoutSource;
  rhythm: "merchant" | "residential" | "residential_dense" | "service" | "arcade" | "hero" | "authored";
  storyCount: number;
  edgeMarginM: number;
  groundHeadM: number;
  upperSillDatumsM: number[];
  signBandBottomM: number;
  signBandTopM: number;
};

export type RuntimeMassingProfile = {
  id: string;
  label: string;
  heightM: number;
  depthM: number;
  roofStyle: "flat_parapet" | "setback_flat";
  roofSetbackM: number;
  parapetHeightM: number;
  upperStorySetbackM: number;
};

export type RuntimeFacadeMaterialSlot = "wall" | "trim" | "roof" | "timber" | "metal" | "accent";
export type RuntimeFacadeMaterialSlots = Record<RuntimeFacadeMaterialSlot, string>;
export type RuntimeFacadeModuleKind = "shop_recess" | "door" | "window" | "vent" | "arch" | "column" | "blind_niche";
export type RuntimeFacadeOpeningType = "none" | "recess" | "door_void" | "window_void" | "arch_void";

export type RuntimeFacadeModule = {
  id: string;
  label: string;
  kind: RuntimeFacadeModuleKind;
  openingType: RuntimeFacadeOpeningType;
  dimensionsM: { width: number; depth: number; height: number };
  materialSlot: RuntimeFacadeMaterialSlot;
  collisionOpening: false;
  assetId?: string;
};

export type RuntimeFacadeProfile = {
  id: string;
  label: string;
  family: "active_merchant" | "quiet_residential" | "service_storage" | "covered_arcade" | "hero_courtyard";
  massingProfileId: string;
  materialSlots: RuntimeFacadeMaterialSlots;
  moduleIds: string[];
};

export type RuntimeArchitectureMassingPlacement = {
  id: string;
  kind: "massing";
  frontageId: string;
  zoneId: string;
  districtId?: string;
  face: RuntimeFacadeFace;
  profileId: string;
  massingProfileId: string;
  center: RuntimeVec3;
  sizeM: { width: number; depth: number; height: number };
  yawDeg: number;
  materialSlots: RuntimeFacadeMaterialSlots;
  roof: {
    style: "flat_parapet" | "setback_flat";
    setbackM: number;
    parapetHeightM: number;
    upperStorySetbackM: number;
    elevationM: number;
  };
};

type RuntimeArchitectureModulePlacement = {
  id: string;
  kind: "facade_module";
  frontageId: string;
  zoneId: string;
  districtId?: string;
  face: RuntimeFacadeFace;
  profileId: string;
  moduleId: string;
  moduleKind: RuntimeFacadeModuleKind;
  openingType: RuntimeFacadeOpeningType;
  datumId: string;
  columnId: string;
  layoutSource: RuntimeFacadeLayoutSource;
  center: RuntimeVec3;
  sizeM: { width: number; depth: number; height: number };
  yawDeg: number;
  materialSlot: RuntimeFacadeMaterialSlot;
  collisionOpening: false;
  assetId?: string;
};

export type RuntimeArchitecturePlacement = RuntimeArchitectureMassingPlacement | RuntimeArchitectureModulePlacement;

/** Compiled zone section GLB: mounted at the zone rect's south-west corner on the zone floor. */
export type RuntimeSectionModel = {
  zoneId: string;
  modelId: string;
  origin: RuntimeVec3;
  sizeM: { width: number; depth: number };
  /** Zone faces the GLB owns; the kit keeps its face details elsewhere. */
  faces: RuntimeFacadeFace[];
  /** Wall-pack material ids the GLB names; preloaded alongside the kit's materials. */
  materialIds: string[];
};

/** Free render-only GLB placed by an area package; design metres, base-centre origin. */
export type RuntimeAuthoredPlacement = {
  id: string;
  unit: string;
  modelId: string;
  position: RuntimeVec3;
  yawDeg: number;
  role: "dressing" | "skyline";
  materialIds: string[];
};

type RuntimeDressingClassification = "gameplay_cover" | "soft_visual" | "overhead";

export type RuntimeAssetRegistryEntry = {
  id: string;
  label: string;
  source: {
    kind: "project_original" | "external_cc0";
    uri: string;
  };
  license: "Project-Original" | "CC0-1.0";
  dimensionsM: {
    width: number;
    depth: number;
    height: number;
  };
  collisionClass: "none" | "soft" | "hard" | "overhead";
  shadowPolicy: "cast_receive" | "receive_only" | "none";
  lodEligible: boolean;
  semanticClass?: "architecture" | "container" | "cover" | "furniture" | "foliage" | "landmark" | "lighting" | "overhead" | "signage" | "textile";
  runtime?: {
    mode: "model" | "procedural";
    id: string;
    uri?: string;
  };
  transform?: {
    pivot: "base_center";
    upAxis: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
    forwardAxis: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
    authoredScale: { x: number; y: number; z: number };
  };
};

export type RuntimeDressingCluster = {
  id: string;
  zoneId: string;
  surfaceId?: string;
  districtId?: string;
  classification: RuntimeDressingClassification;
  anchors?: string[];
  assetIds?: string[];
};

export type RuntimeDressingPlacement = {
  id: string;
  clusterId: string;
  assetId: string;
  anchorId: string;
  zoneId: string;
  districtId?: string;
  classification: RuntimeDressingClassification;
  position: RuntimeVec3;
  yawDeg: number;
  spanSeats?: {
    start: RuntimeVec3;
    end: RuntimeVec3;
  };
  scale: { x: number; y: number; z: number };
  dimensionsM: { width: number; depth: number; height: number };
  collisionClass: RuntimeAssetRegistryEntry["collisionClass"];
  shadowPolicy: RuntimeAssetRegistryEntry["shadowPolicy"];
  lodEligible: boolean;
  semanticClass: NonNullable<RuntimeAssetRegistryEntry["semanticClass"]>;
  runtime: NonNullable<RuntimeAssetRegistryEntry["runtime"]>;
};

export type RuntimeWallPatch = {
  orientation: "vertical" | "horizontal";
  coord: number;
  start: number;
  end: number;
  outward: -1 | 1;
};

export type RuntimeBlockoutSpec = {
  mapId: string;
  formatVersion?: string;
  mapCenter?: {
    x: number;
    y: number;
  };
  playable_boundary: RuntimeRect;
  defaults: {
    wall_height: number;
    wall_thickness: number;
    ceiling_height: number;
    floor_height: number;
  };
  wall_details: RuntimeWallDetailOptions;
  zones: RuntimeBlockoutZone[];
  exterior_wall_patches: RuntimeWallPatch[];
  districts?: RuntimeDistrict[];
  traversalSurfaces?: RuntimeTraversalSurface[];
  tacticalLanes?: RuntimeTacticalLane[];
  explicitConnectivity?: RuntimeExplicitConnectivityEdge[];
  authoredSpawns?: RuntimeAuthoredSpawn[];
  frontages?: RuntimeFrontage[];
  massingProfiles?: RuntimeMassingProfile[];
  facadeModules?: RuntimeFacadeModule[];
  facadeProfiles?: RuntimeFacadeProfile[];
  architecturePlacements?: RuntimeArchitecturePlacement[];
  sectionModels?: RuntimeSectionModel[];
  authoredPlacements?: RuntimeAuthoredPlacement[];
  assetRegistry?: RuntimeAssetRegistryEntry[];
  dressingClusters?: RuntimeDressingCluster[];
  dressingPlacements?: RuntimeDressingPlacement[];
  constraints: {
    min_path_width_main_lane: number;
    min_path_width_side_halls: number;
  };
};

type RuntimeWallDetailStyle = "bazaar";

export type RuntimeFacadeFace = "north" | "south" | "east" | "west";

export type RuntimeWallDetailOptions = {
  style: RuntimeWallDetailStyle;
};

export type RuntimeAnchor = {
  id: string;
  type: string;
  zone: string;
  pos: {
    x: number;
    y: number;
    z: number;
  };
  yawDeg?: number;
  endPos?: {
    x: number;
    y: number;
    z: number;
  };
  widthM?: number;
  heightM?: number;
  frontageId?: string;
  servedBayId?: string;
  along?: number;
  notes?: string;
};

export type RuntimeAnchorsSpec = {
  mapId: string;
  anchors: RuntimeAnchor[];
};

type RuntimeShot = {
  id: string;
  label: string;
  description: string;
  camera: {
    pos: {
      x: number;
      y: number;
      z: number;
    };
    lookAt: {
      x: number;
      y: number;
      z: number;
    };
    fovDeg: number;
  };
  durationSec?: number;
  tags?: string[];
};

export type RuntimeShotsSpec = {
  metadata: Record<string, unknown>;
  aliases?: {
    compare?: string;
  };
  shots: RuntimeShot[];
};

export type RuntimeMapAssets = {
  blockout: RuntimeBlockoutSpec;
  anchors: RuntimeAnchorsSpec;
  shots: RuntimeShotsSpec;
};
