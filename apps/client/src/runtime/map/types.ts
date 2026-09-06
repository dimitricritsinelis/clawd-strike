type UnknownRecord = Record<string, unknown>;

export type RuntimeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RuntimeVec3 = {
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

export type RuntimeFlatTraversalSurface = {
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
  /** Registered facade GLB that owns this frontage's street face. */
  facadeModelId?: string;
};

export type RuntimeArchitectureModulePlacement = {
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

export type RuntimeDressingClassification = "gameplay_cover" | "soft_visual" | "overhead";

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
  assetRegistry?: RuntimeAssetRegistryEntry[];
  dressingClusters?: RuntimeDressingCluster[];
  dressingPlacements?: RuntimeDressingPlacement[];
  constraints: {
    min_path_width_main_lane: number;
    min_path_width_side_halls: number;
  };
};

export type RuntimeWallDetailStyle = "bazaar";

export type RuntimeFacadeFace = "north" | "south" | "east" | "west";

export type RuntimeFacadeOverridePreset =
  | "merchant_rhythm"
  | "merchant_hero_stack"
  | "residential_quiet"
  | "residential_balcony_stack"
  | "spawn_courtyard_landmark"
  | "spawn_gate_brick_backdrop"
  | "service_blank";

export type RuntimeFacadeOverride = {
  zoneId: string;
  face: RuntimeFacadeFace;
  preset: RuntimeFacadeOverridePreset;
};

export type WindowHeadShape = "rect" | "pointed_arch";
export type WindowGlassStyle = "stained_glass_bright" | "stained_glass_dim";

export type RuntimeAuthoredWindow = {
  centerS: number;
  sillY: number;
  width: number;
  height: number;
  headShape: WindowHeadShape;
  glassStyle: WindowGlassStyle;
};

export type RuntimeAuthoredDoor = {
  centerS: number;
};

export type RuntimeAuthoredBalconyOpening = {
  width: number;
  height: number;
  sillOffsetM: number;
  headShape: "pointed_arch";
  glassStyle: WindowGlassStyle;
};

export type RuntimeAuthoredBalcony = {
  centerS: number;
  storyIndex: number;
  spanBays: number;
  depthM: number;
  parapetHeightM: number;
  openingSurroundWidthM: number;
  openingSurroundHeightM: number;
  openingSurroundBottomOffsetM: number;
  roofBreakWidthM: number;
  roofBreakBottomOffsetM: number;
  roofBreakHeightM: number;
  roofBreakCapHeightM: number;
  opening: RuntimeAuthoredBalconyOpening;
};

export type RuntimeDoorStyleSource = {
  zoneId: string;
  face: RuntimeFacadeFace;
  segmentOrdinal: number;
};

export type RuntimeDoorLayoutOverride = {
  zoneId: string;
  face: RuntimeFacadeFace;
  segmentOrdinal: number;
  doors: RuntimeAuthoredDoor[];
  styleSource?: RuntimeDoorStyleSource;
};

export type RuntimeWindowLayoutOverride = {
  zoneId: string;
  face: RuntimeFacadeFace;
  segmentOrdinal: number;
  windows: RuntimeAuthoredWindow[];
};

export type RuntimeBalconyLayoutOverride = {
  zoneId: string;
  face: RuntimeFacadeFace;
  segmentOrdinal: number;
  balconies: RuntimeAuthoredBalcony[];
};

export type RuntimeWindowModule = {
  id: string;
  headShape: "pointed_arch";
  glassStyle: WindowGlassStyle;
  apertureWidthM: number;
  apertureHeightM: number;
  frameWidthM: number;
  frameHeightM: number;
  frameDepthM: number;
  voidInsetM: number;
  glassInsetM: number;
  sillWidthM: number;
  sillHeightM: number;
  sillDepthM: number;
  apronWidthM: number;
  apronHeightM: number;
  apronDepthM: number;
  apronOffsetBelowSillM: number;
};

export type RuntimeDoorModule = {
  id: string;
  modelId: string;
  coverShape: "arched" | "rect";
  doorWidthM: number;
  doorHeightM: number;
  coverWidthM: number;
  coverHeightM: number;
  coverCenterYOffsetM: number;
  trimThicknessM: number;
  revealWidthM: number;
  surroundDepthM: number;
  voidInsetM: number;
  voidDepthM: number;
};

export type RuntimeHeroBayModule = {
  id: string;
  glassStyle: WindowGlassStyle;
  openingWidthM: number;
  openingHeightM: number;
  openingSillY: number;
  surroundWidthM: number;
  surroundHeightM: number;
  surroundBottomY: number;
  frameDepthM: number;
  voidInsetM: number;
  glassInsetM: number;
  pilasterWidthM: number;
  pilasterDepthM: number;
  pilasterHeightM: number;
  pilasterBottomY: number;
  entablatureWidthM: number;
  entablatureDepthM: number;
  entablatureThicknessM: number;
  entablatureCenterY: number;
  entablatureCapWidthM: number;
  entablatureCapDepthM: number;
  entablatureCapThicknessM: number;
  entablatureCapCenterY: number;
  corbelWidthM: number;
  corbelDepthM: number;
  corbelHeightM: number;
  corbelCenterY: number;
  corbelCount: number;
  corbelSpreadM: number;
  pedimentBaseWidthM: number;
  pedimentDepthM: number;
  pedimentLayerHeightM: number;
  pedimentLayerCount: number;
  pedimentWidthStepM: number;
  pedimentBottomY: number;
};

export type RuntimeWallModuleRegistry = {
  windowModules: RuntimeWindowModule[];
  doorModules: RuntimeDoorModule[];
  heroBayModules: RuntimeHeroBayModule[];
};

export type RuntimeCompositionLayoutKind =
  | "spawn_b_front_courtyard"
  | "spawn_b_side_courtyard";

export type RuntimeCompositionLayoutOverride = {
  zoneId: string;
  face: RuntimeFacadeFace;
  segmentOrdinal: number;
  kind: RuntimeCompositionLayoutKind;
  windowModuleId: string;
  doorModuleId: string;
  heroBayModuleId?: string;
  lowerWindowSillY: number;
  upperWindowSillY: number;
};

export type RuntimeWallDetailOptions = {
  enabled: boolean;
  seed?: number;
  style: RuntimeWallDetailStyle;
  density: number;
  maxProtrusion: number;
  facadeOverrides: RuntimeFacadeOverride[];
  doorLayoutOverrides: RuntimeDoorLayoutOverride[];
  windowLayoutOverrides: RuntimeWindowLayoutOverride[];
  balconyLayoutOverrides: RuntimeBalconyLayoutOverride[];
  moduleRegistry: RuntimeWallModuleRegistry;
  compositionLayoutOverrides: RuntimeCompositionLayoutOverride[];
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

export type RuntimeShot = {
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

function failParse(source: string, message: string): never {
  throw new Error(`[map-parse] ${source}: ${message}`);
}

function asObject(value: unknown, source: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failParse(source, "expected object");
  }
  return value as UnknownRecord;
}

function asString(value: unknown, source: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    failParse(source, "expected non-empty string");
  }
  return value;
}

function asNumber(value: unknown, source: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    failParse(source, "expected finite number");
  }
  return value;
}

function asBoolean(value: unknown, source: string): boolean {
  if (typeof value !== "boolean") {
    failParse(source, "expected boolean");
  }
  return value;
}

function asPositiveNumber(value: unknown, source: string): number {
  const numeric = asNumber(value, source);
  if (numeric <= 0) {
    failParse(source, "expected number > 0");
  }
  return numeric;
}

function asStringArray(value: unknown, source: string): string[] {
  if (!Array.isArray(value)) {
    failParse(source, "expected string array");
  }
  return value.map((item, index) => asString(item, `${source}[${index}]`));
}

function parseRect(value: unknown, source: string): RuntimeRect {
  const obj = asObject(value, source);
  return {
    x: asNumber(obj.x, `${source}.x`),
    y: asNumber(obj.y, `${source}.y`),
    w: asPositiveNumber(obj.w, `${source}.w`),
    h: asPositiveNumber(obj.h, `${source}.h`),
  };
}

function parseVec3(value: unknown, source: string): { x: number; y: number; z: number } {
  const obj = asObject(value, source);
  return {
    x: asNumber(obj.x, `${source}.x`),
    y: asNumber(obj.y, `${source}.y`),
    z: asNumber(obj.z, `${source}.z`),
  };
}

const DEFAULT_WALL_THICKNESS_M = 0.25;
const DEFAULT_WALL_DETAIL_DENSITY = 0.48;
const DEFAULT_WALL_DETAIL_MAX_PROTRUSION_M = 0.30;

function parseWallDetailOptions(value: unknown, source: string): RuntimeWallDetailOptions {
  if (typeof value === "undefined") {
    return {
      enabled: true,
      style: "bazaar",
      density: DEFAULT_WALL_DETAIL_DENSITY,
      maxProtrusion: DEFAULT_WALL_DETAIL_MAX_PROTRUSION_M,
      facadeOverrides: [],
      doorLayoutOverrides: [],
      windowLayoutOverrides: [],
      balconyLayoutOverrides: [],
      moduleRegistry: {
        windowModules: [],
        doorModules: [],
        heroBayModules: [],
      },
      compositionLayoutOverrides: [],
    };
  }

  const obj = asObject(value, source);
  const styleRaw = typeof obj.style === "string" ? obj.style : "bazaar";
  if (styleRaw !== "bazaar") {
    failParse(`${source}.style`, "expected 'bazaar'");
  }
  const style: RuntimeWallDetailStyle = "bazaar";

  const density = typeof obj.density === "undefined"
    ? DEFAULT_WALL_DETAIL_DENSITY
    : asNumber(obj.density, `${source}.density`);
  if (density < 0 || density > 1.25) {
    failParse(`${source}.density`, "expected number >= 0 and <= 1.25");
  }
  const maxProtrusion = typeof obj.maxProtrusion === "undefined"
    ? DEFAULT_WALL_DETAIL_MAX_PROTRUSION_M
    : asPositiveNumber(obj.maxProtrusion, `${source}.maxProtrusion`);

  const resolved: RuntimeWallDetailOptions = {
    enabled: typeof obj.enabled === "undefined" ? true : asBoolean(obj.enabled, `${source}.enabled`),
    style,
    density,
    maxProtrusion,
    facadeOverrides: [],
    doorLayoutOverrides: [],
    windowLayoutOverrides: [],
    balconyLayoutOverrides: [],
    moduleRegistry: {
      windowModules: [],
      doorModules: [],
      heroBayModules: [],
    },
    compositionLayoutOverrides: [],
  };

  if (typeof obj.seed !== "undefined") {
    const seed = asNumber(obj.seed, `${source}.seed`);
    if (!Number.isInteger(seed)) {
      failParse(`${source}.seed`, "expected integer");
    }
    resolved.seed = seed;
  }

  if (typeof obj.facade_overrides !== "undefined") {
    if (!Array.isArray(obj.facade_overrides)) {
      failParse(`${source}.facade_overrides`, "expected array");
    }

    resolved.facadeOverrides = obj.facade_overrides.map((rawOverride, index) => {
      const override = asObject(rawOverride, `${source}.facade_overrides[${index}]`);
      const zoneId = asString(override.zoneId, `${source}.facade_overrides[${index}].zoneId`);
      const face = asString(override.face, `${source}.facade_overrides[${index}].face`);
      if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
        failParse(`${source}.facade_overrides[${index}].face`, "expected 'north', 'south', 'east', or 'west'");
      }
      const preset = asString(override.preset, `${source}.facade_overrides[${index}].preset`);
      if (
        preset !== "merchant_rhythm"
        && preset !== "merchant_hero_stack"
        && preset !== "residential_quiet"
        && preset !== "residential_balcony_stack"
        && preset !== "spawn_courtyard_landmark"
        && preset !== "spawn_gate_brick_backdrop"
        && preset !== "service_blank"
      ) {
        failParse(
          `${source}.facade_overrides[${index}].preset`,
          "expected known facade preset",
        );
      }

      return {
        zoneId,
        face,
        preset,
      };
    });
  }

  if (typeof obj.module_registry !== "undefined") {
    const registry = asObject(obj.module_registry, `${source}.module_registry`);

    if (typeof registry.window_modules !== "undefined") {
      if (!Array.isArray(registry.window_modules)) {
        failParse(`${source}.module_registry.window_modules`, "expected array");
      }
      resolved.moduleRegistry.windowModules = registry.window_modules.map((rawModule, index) => {
        const module = asObject(rawModule, `${source}.module_registry.window_modules[${index}]`);
        const headShape = asString(
          module.headShape,
          `${source}.module_registry.window_modules[${index}].headShape`,
        );
        if (headShape !== "pointed_arch") {
          failParse(
            `${source}.module_registry.window_modules[${index}].headShape`,
            "expected 'pointed_arch'",
          );
        }
        const glassStyle = asString(
          module.glassStyle,
          `${source}.module_registry.window_modules[${index}].glassStyle`,
        );
        if (glassStyle !== "stained_glass_bright" && glassStyle !== "stained_glass_dim") {
          failParse(
            `${source}.module_registry.window_modules[${index}].glassStyle`,
            "expected supported window glass style",
          );
        }
        return {
          id: asString(module.id, `${source}.module_registry.window_modules[${index}].id`),
          headShape: "pointed_arch",
          glassStyle,
          apertureWidthM: asPositiveNumber(
            module.apertureWidthM,
            `${source}.module_registry.window_modules[${index}].apertureWidthM`,
          ),
          apertureHeightM: asPositiveNumber(
            module.apertureHeightM,
            `${source}.module_registry.window_modules[${index}].apertureHeightM`,
          ),
          frameWidthM: asPositiveNumber(
            module.frameWidthM,
            `${source}.module_registry.window_modules[${index}].frameWidthM`,
          ),
          frameHeightM: asPositiveNumber(
            module.frameHeightM,
            `${source}.module_registry.window_modules[${index}].frameHeightM`,
          ),
          frameDepthM: asPositiveNumber(
            module.frameDepthM,
            `${source}.module_registry.window_modules[${index}].frameDepthM`,
          ),
          voidInsetM: asNumber(
            module.voidInsetM,
            `${source}.module_registry.window_modules[${index}].voidInsetM`,
          ),
          glassInsetM: asNumber(
            module.glassInsetM,
            `${source}.module_registry.window_modules[${index}].glassInsetM`,
          ),
          sillWidthM: asPositiveNumber(
            module.sillWidthM,
            `${source}.module_registry.window_modules[${index}].sillWidthM`,
          ),
          sillHeightM: asPositiveNumber(
            module.sillHeightM,
            `${source}.module_registry.window_modules[${index}].sillHeightM`,
          ),
          sillDepthM: asPositiveNumber(
            module.sillDepthM,
            `${source}.module_registry.window_modules[${index}].sillDepthM`,
          ),
          apronWidthM: asPositiveNumber(
            module.apronWidthM,
            `${source}.module_registry.window_modules[${index}].apronWidthM`,
          ),
          apronHeightM: asPositiveNumber(
            module.apronHeightM,
            `${source}.module_registry.window_modules[${index}].apronHeightM`,
          ),
          apronDepthM: asPositiveNumber(
            module.apronDepthM,
            `${source}.module_registry.window_modules[${index}].apronDepthM`,
          ),
          apronOffsetBelowSillM: asNumber(
            module.apronOffsetBelowSillM,
            `${source}.module_registry.window_modules[${index}].apronOffsetBelowSillM`,
          ),
        };
      });
    }

    if (typeof registry.door_modules !== "undefined") {
      if (!Array.isArray(registry.door_modules)) {
        failParse(`${source}.module_registry.door_modules`, "expected array");
      }
      resolved.moduleRegistry.doorModules = registry.door_modules.map((rawModule, index) => {
        const module = asObject(rawModule, `${source}.module_registry.door_modules[${index}]`);
        const coverShape = asString(
          module.coverShape,
          `${source}.module_registry.door_modules[${index}].coverShape`,
        );
        if (coverShape !== "arched" && coverShape !== "rect") {
          failParse(
            `${source}.module_registry.door_modules[${index}].coverShape`,
            "expected 'arched' or 'rect'",
          );
        }
        return {
          id: asString(module.id, `${source}.module_registry.door_modules[${index}].id`),
          modelId: asString(module.modelId, `${source}.module_registry.door_modules[${index}].modelId`),
          coverShape,
          doorWidthM: asPositiveNumber(
            module.doorWidthM,
            `${source}.module_registry.door_modules[${index}].doorWidthM`,
          ),
          doorHeightM: asPositiveNumber(
            module.doorHeightM,
            `${source}.module_registry.door_modules[${index}].doorHeightM`,
          ),
          coverWidthM: asPositiveNumber(
            module.coverWidthM,
            `${source}.module_registry.door_modules[${index}].coverWidthM`,
          ),
          coverHeightM: asPositiveNumber(
            module.coverHeightM,
            `${source}.module_registry.door_modules[${index}].coverHeightM`,
          ),
          coverCenterYOffsetM: asNumber(
            module.coverCenterYOffsetM,
            `${source}.module_registry.door_modules[${index}].coverCenterYOffsetM`,
          ),
          trimThicknessM: asPositiveNumber(
            module.trimThicknessM,
            `${source}.module_registry.door_modules[${index}].trimThicknessM`,
          ),
          revealWidthM: asPositiveNumber(
            module.revealWidthM,
            `${source}.module_registry.door_modules[${index}].revealWidthM`,
          ),
          surroundDepthM: asPositiveNumber(
            module.surroundDepthM,
            `${source}.module_registry.door_modules[${index}].surroundDepthM`,
          ),
          voidInsetM: asNumber(
            module.voidInsetM,
            `${source}.module_registry.door_modules[${index}].voidInsetM`,
          ),
          voidDepthM: asPositiveNumber(
            module.voidDepthM,
            `${source}.module_registry.door_modules[${index}].voidDepthM`,
          ),
        };
      });
    }

    if (typeof registry.hero_bay_modules !== "undefined") {
      if (!Array.isArray(registry.hero_bay_modules)) {
        failParse(`${source}.module_registry.hero_bay_modules`, "expected array");
      }
      resolved.moduleRegistry.heroBayModules = registry.hero_bay_modules.map((rawModule, index) => {
        const module = asObject(rawModule, `${source}.module_registry.hero_bay_modules[${index}]`);
        const glassStyle = asString(
          module.glassStyle,
          `${source}.module_registry.hero_bay_modules[${index}].glassStyle`,
        );
        if (glassStyle !== "stained_glass_bright" && glassStyle !== "stained_glass_dim") {
          failParse(
            `${source}.module_registry.hero_bay_modules[${index}].glassStyle`,
            "expected supported window glass style",
          );
        }
        const corbelCount = asPositiveNumber(
          module.corbelCount,
          `${source}.module_registry.hero_bay_modules[${index}].corbelCount`,
        );
        if (!Number.isInteger(corbelCount)) {
          failParse(
            `${source}.module_registry.hero_bay_modules[${index}].corbelCount`,
            "expected integer > 0",
          );
        }
        const pedimentLayerCount = asPositiveNumber(
          module.pedimentLayerCount,
          `${source}.module_registry.hero_bay_modules[${index}].pedimentLayerCount`,
        );
        if (!Number.isInteger(pedimentLayerCount)) {
          failParse(
            `${source}.module_registry.hero_bay_modules[${index}].pedimentLayerCount`,
            "expected integer > 0",
          );
        }
        return {
          id: asString(module.id, `${source}.module_registry.hero_bay_modules[${index}].id`),
          glassStyle,
          openingWidthM: asPositiveNumber(
            module.openingWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].openingWidthM`,
          ),
          openingHeightM: asPositiveNumber(
            module.openingHeightM,
            `${source}.module_registry.hero_bay_modules[${index}].openingHeightM`,
          ),
          openingSillY: asNumber(
            module.openingSillY,
            `${source}.module_registry.hero_bay_modules[${index}].openingSillY`,
          ),
          surroundWidthM: asPositiveNumber(
            module.surroundWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].surroundWidthM`,
          ),
          surroundHeightM: asPositiveNumber(
            module.surroundHeightM,
            `${source}.module_registry.hero_bay_modules[${index}].surroundHeightM`,
          ),
          surroundBottomY: asNumber(
            module.surroundBottomY,
            `${source}.module_registry.hero_bay_modules[${index}].surroundBottomY`,
          ),
          frameDepthM: asPositiveNumber(
            module.frameDepthM,
            `${source}.module_registry.hero_bay_modules[${index}].frameDepthM`,
          ),
          voidInsetM: asNumber(
            module.voidInsetM,
            `${source}.module_registry.hero_bay_modules[${index}].voidInsetM`,
          ),
          glassInsetM: asNumber(
            module.glassInsetM,
            `${source}.module_registry.hero_bay_modules[${index}].glassInsetM`,
          ),
          pilasterWidthM: asPositiveNumber(
            module.pilasterWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].pilasterWidthM`,
          ),
          pilasterDepthM: asPositiveNumber(
            module.pilasterDepthM,
            `${source}.module_registry.hero_bay_modules[${index}].pilasterDepthM`,
          ),
          pilasterHeightM: asPositiveNumber(
            module.pilasterHeightM,
            `${source}.module_registry.hero_bay_modules[${index}].pilasterHeightM`,
          ),
          pilasterBottomY: asNumber(
            module.pilasterBottomY,
            `${source}.module_registry.hero_bay_modules[${index}].pilasterBottomY`,
          ),
          entablatureWidthM: asPositiveNumber(
            module.entablatureWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureWidthM`,
          ),
          entablatureDepthM: asPositiveNumber(
            module.entablatureDepthM,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureDepthM`,
          ),
          entablatureThicknessM: asPositiveNumber(
            module.entablatureThicknessM,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureThicknessM`,
          ),
          entablatureCenterY: asNumber(
            module.entablatureCenterY,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureCenterY`,
          ),
          entablatureCapWidthM: asPositiveNumber(
            module.entablatureCapWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureCapWidthM`,
          ),
          entablatureCapDepthM: asPositiveNumber(
            module.entablatureCapDepthM,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureCapDepthM`,
          ),
          entablatureCapThicknessM: asPositiveNumber(
            module.entablatureCapThicknessM,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureCapThicknessM`,
          ),
          entablatureCapCenterY: asNumber(
            module.entablatureCapCenterY,
            `${source}.module_registry.hero_bay_modules[${index}].entablatureCapCenterY`,
          ),
          corbelWidthM: asPositiveNumber(
            module.corbelWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].corbelWidthM`,
          ),
          corbelDepthM: asPositiveNumber(
            module.corbelDepthM,
            `${source}.module_registry.hero_bay_modules[${index}].corbelDepthM`,
          ),
          corbelHeightM: asPositiveNumber(
            module.corbelHeightM,
            `${source}.module_registry.hero_bay_modules[${index}].corbelHeightM`,
          ),
          corbelCenterY: asNumber(
            module.corbelCenterY,
            `${source}.module_registry.hero_bay_modules[${index}].corbelCenterY`,
          ),
          corbelCount,
          corbelSpreadM: asPositiveNumber(
            module.corbelSpreadM,
            `${source}.module_registry.hero_bay_modules[${index}].corbelSpreadM`,
          ),
          pedimentBaseWidthM: asPositiveNumber(
            module.pedimentBaseWidthM,
            `${source}.module_registry.hero_bay_modules[${index}].pedimentBaseWidthM`,
          ),
          pedimentDepthM: asPositiveNumber(
            module.pedimentDepthM,
            `${source}.module_registry.hero_bay_modules[${index}].pedimentDepthM`,
          ),
          pedimentLayerHeightM: asPositiveNumber(
            module.pedimentLayerHeightM,
            `${source}.module_registry.hero_bay_modules[${index}].pedimentLayerHeightM`,
          ),
          pedimentLayerCount,
          pedimentWidthStepM: asPositiveNumber(
            module.pedimentWidthStepM,
            `${source}.module_registry.hero_bay_modules[${index}].pedimentWidthStepM`,
          ),
          pedimentBottomY: asNumber(
            module.pedimentBottomY,
            `${source}.module_registry.hero_bay_modules[${index}].pedimentBottomY`,
          ),
        };
      });
    }
  }

  if (typeof obj.window_layout_overrides !== "undefined") {
    if (!Array.isArray(obj.window_layout_overrides)) {
      failParse(`${source}.window_layout_overrides`, "expected array");
    }

    resolved.windowLayoutOverrides = obj.window_layout_overrides.map((rawOverride, index) => {
      const override = asObject(rawOverride, `${source}.window_layout_overrides[${index}]`);
      const zoneId = asString(override.zoneId, `${source}.window_layout_overrides[${index}].zoneId`);
      const face = asString(override.face, `${source}.window_layout_overrides[${index}].face`);
      if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
        failParse(`${source}.window_layout_overrides[${index}].face`, "expected 'north', 'south', 'east', or 'west'");
      }
      const segmentOrdinal = asPositiveNumber(
        override.segmentOrdinal,
        `${source}.window_layout_overrides[${index}].segmentOrdinal`,
      );
      if (!Number.isInteger(segmentOrdinal)) {
        failParse(`${source}.window_layout_overrides[${index}].segmentOrdinal`, "expected integer > 0");
      }
      if (!Array.isArray(override.windows) || override.windows.length === 0) {
        failParse(`${source}.window_layout_overrides[${index}].windows`, "expected non-empty array");
      }

      const windows = override.windows.map((rawWindow, windowIndex) => {
        const window = asObject(rawWindow, `${source}.window_layout_overrides[${index}].windows[${windowIndex}]`);
        const headShapeRaw = asString(
          window.headShape,
          `${source}.window_layout_overrides[${index}].windows[${windowIndex}].headShape`,
        );
        if (headShapeRaw !== "rect" && headShapeRaw !== "pointed_arch") {
          failParse(
            `${source}.window_layout_overrides[${index}].windows[${windowIndex}].headShape`,
            "expected 'rect' or 'pointed_arch'",
          );
        }
        const glassStyleRaw = asString(
          window.glassStyle,
          `${source}.window_layout_overrides[${index}].windows[${windowIndex}].glassStyle`,
        );
        if (glassStyleRaw !== "stained_glass_bright" && glassStyleRaw !== "stained_glass_dim") {
          failParse(
            `${source}.window_layout_overrides[${index}].windows[${windowIndex}].glassStyle`,
            "expected supported window glass style",
          );
        }
        const headShape: WindowHeadShape = headShapeRaw;
        const glassStyle: WindowGlassStyle = glassStyleRaw;

        return {
          centerS: asNumber(window.centerS, `${source}.window_layout_overrides[${index}].windows[${windowIndex}].centerS`),
          sillY: asNumber(window.sillY, `${source}.window_layout_overrides[${index}].windows[${windowIndex}].sillY`),
          width: asPositiveNumber(window.width, `${source}.window_layout_overrides[${index}].windows[${windowIndex}].width`),
          height: asPositiveNumber(window.height, `${source}.window_layout_overrides[${index}].windows[${windowIndex}].height`),
          headShape,
          glassStyle,
        };
      });

      return {
        zoneId,
        face,
        segmentOrdinal,
        windows,
      };
    });
  }

  if (typeof obj.balcony_layout_overrides !== "undefined") {
    if (!Array.isArray(obj.balcony_layout_overrides)) {
      failParse(`${source}.balcony_layout_overrides`, "expected array");
    }

    resolved.balconyLayoutOverrides = obj.balcony_layout_overrides.map((rawOverride, index) => {
      const override = asObject(rawOverride, `${source}.balcony_layout_overrides[${index}]`);
      const zoneId = asString(override.zoneId, `${source}.balcony_layout_overrides[${index}].zoneId`);
      const face = asString(override.face, `${source}.balcony_layout_overrides[${index}].face`);
      if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
        failParse(`${source}.balcony_layout_overrides[${index}].face`, "expected 'north', 'south', 'east', or 'west'");
      }
      const segmentOrdinal = asPositiveNumber(
        override.segmentOrdinal,
        `${source}.balcony_layout_overrides[${index}].segmentOrdinal`,
      );
      if (!Number.isInteger(segmentOrdinal)) {
        failParse(`${source}.balcony_layout_overrides[${index}].segmentOrdinal`, "expected integer > 0");
      }
      if (!Array.isArray(override.balconies) || override.balconies.length === 0) {
        failParse(`${source}.balcony_layout_overrides[${index}].balconies`, "expected non-empty array");
      }

      const balconies = override.balconies.map((rawBalcony, balconyIndex) => {
        const balcony = asObject(rawBalcony, `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}]`);
        const storyIndex = asNumber(
          balcony.storyIndex,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].storyIndex`,
        );
        if (!Number.isInteger(storyIndex) || storyIndex < 1) {
          failParse(
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].storyIndex`,
            "expected integer >= 1",
          );
        }
        const spanBays = asPositiveNumber(
          balcony.spanBays,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].spanBays`,
        );
        if (!Number.isInteger(spanBays)) {
          failParse(
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].spanBays`,
            "expected integer > 0",
          );
        }
        const opening = asObject(
          balcony.opening,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening`,
        );
        const headShape = asString(
          opening.headShape,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.headShape`,
        );
        if (headShape !== "pointed_arch") {
          failParse(
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.headShape`,
            "expected 'pointed_arch'",
          );
        }
        const balconyHeadShape: "pointed_arch" = "pointed_arch";
        const glassStyleRaw = asString(
          opening.glassStyle,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.glassStyle`,
        );
        if (glassStyleRaw !== "stained_glass_bright" && glassStyleRaw !== "stained_glass_dim") {
          failParse(
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.glassStyle`,
            "expected supported window glass style",
          );
        }
        const glassStyle: WindowGlassStyle = glassStyleRaw;

        const roofBreakHeightM = asNumber(
          balcony.roofBreakHeightM,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakHeightM`,
        );
        if (roofBreakHeightM < 0) {
          failParse(
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakHeightM`,
            "expected number >= 0",
          );
        }
        const roofBreakCapHeightM = asNumber(
          balcony.roofBreakCapHeightM,
          `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakCapHeightM`,
        );
        if (roofBreakCapHeightM < 0) {
          failParse(
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakCapHeightM`,
            "expected number >= 0",
          );
        }

        return {
          centerS: asNumber(
            balcony.centerS,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].centerS`,
          ),
          storyIndex,
          spanBays,
          depthM: asPositiveNumber(
            balcony.depthM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].depthM`,
          ),
          parapetHeightM: asPositiveNumber(
            balcony.parapetHeightM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].parapetHeightM`,
          ),
          openingSurroundWidthM: asPositiveNumber(
            balcony.openingSurroundWidthM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].openingSurroundWidthM`,
          ),
          openingSurroundHeightM: asPositiveNumber(
            balcony.openingSurroundHeightM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].openingSurroundHeightM`,
          ),
          openingSurroundBottomOffsetM: asNumber(
            balcony.openingSurroundBottomOffsetM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].openingSurroundBottomOffsetM`,
          ),
          roofBreakWidthM: asPositiveNumber(
            balcony.roofBreakWidthM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakWidthM`,
          ),
          roofBreakBottomOffsetM: asNumber(
            balcony.roofBreakBottomOffsetM,
            `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].roofBreakBottomOffsetM`,
          ),
          roofBreakHeightM,
          roofBreakCapHeightM,
          opening: {
            width: asPositiveNumber(
              opening.width,
              `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.width`,
            ),
            height: asPositiveNumber(
              opening.height,
              `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.height`,
            ),
            sillOffsetM: asNumber(
              opening.sillOffsetM,
              `${source}.balcony_layout_overrides[${index}].balconies[${balconyIndex}].opening.sillOffsetM`,
            ),
            headShape: balconyHeadShape,
            glassStyle,
          },
        };
      });

      return {
        zoneId,
        face,
        segmentOrdinal,
        balconies,
      };
    });
  }

  if (typeof obj.door_layout_overrides !== "undefined") {
    if (!Array.isArray(obj.door_layout_overrides)) {
      failParse(`${source}.door_layout_overrides`, "expected array");
    }

    resolved.doorLayoutOverrides = obj.door_layout_overrides.map((rawOverride, index) => {
      const override = asObject(rawOverride, `${source}.door_layout_overrides[${index}]`);
      const zoneId = asString(override.zoneId, `${source}.door_layout_overrides[${index}].zoneId`);
      const face = asString(override.face, `${source}.door_layout_overrides[${index}].face`);
      if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
        failParse(`${source}.door_layout_overrides[${index}].face`, "expected 'north', 'south', 'east', or 'west'");
      }
      const segmentOrdinal = asPositiveNumber(
        override.segmentOrdinal,
        `${source}.door_layout_overrides[${index}].segmentOrdinal`,
      );
      if (!Number.isInteger(segmentOrdinal)) {
        failParse(`${source}.door_layout_overrides[${index}].segmentOrdinal`, "expected integer > 0");
      }
      if (!Array.isArray(override.doors) || override.doors.length === 0) {
        failParse(`${source}.door_layout_overrides[${index}].doors`, "expected non-empty array");
      }

      const doors = override.doors.map((rawDoor, doorIndex) => {
        const door = asObject(rawDoor, `${source}.door_layout_overrides[${index}].doors[${doorIndex}]`);
        return {
          centerS: asNumber(door.centerS, `${source}.door_layout_overrides[${index}].doors[${doorIndex}].centerS`),
        };
      });

      let styleSource: RuntimeDoorStyleSource | undefined;
      if (typeof override.styleSource !== "undefined") {
        const sourceRef = asObject(override.styleSource, `${source}.door_layout_overrides[${index}].styleSource`);
        const sourceFace = asString(
          sourceRef.face,
          `${source}.door_layout_overrides[${index}].styleSource.face`,
        );
        if (sourceFace !== "north" && sourceFace !== "south" && sourceFace !== "east" && sourceFace !== "west") {
          failParse(
            `${source}.door_layout_overrides[${index}].styleSource.face`,
            "expected 'north', 'south', 'east', or 'west'",
          );
        }
        const sourceSegmentOrdinal = asPositiveNumber(
          sourceRef.segmentOrdinal,
          `${source}.door_layout_overrides[${index}].styleSource.segmentOrdinal`,
        );
        if (!Number.isInteger(sourceSegmentOrdinal)) {
          failParse(
            `${source}.door_layout_overrides[${index}].styleSource.segmentOrdinal`,
            "expected integer > 0",
          );
        }
        styleSource = {
          zoneId: asString(
            sourceRef.zoneId,
            `${source}.door_layout_overrides[${index}].styleSource.zoneId`,
          ),
          face: sourceFace,
          segmentOrdinal: sourceSegmentOrdinal,
        };
      }

      return {
        zoneId,
        face,
        segmentOrdinal,
        doors,
        ...(styleSource ? { styleSource } : {}),
      };
    });
  }

  if (typeof obj.composition_layout_overrides !== "undefined") {
    if (!Array.isArray(obj.composition_layout_overrides)) {
      failParse(`${source}.composition_layout_overrides`, "expected array");
    }

    const windowModuleIds = new Set(resolved.moduleRegistry.windowModules.map((module) => module.id));
    const doorModuleIds = new Set(resolved.moduleRegistry.doorModules.map((module) => module.id));
    const heroBayModuleIds = new Set(resolved.moduleRegistry.heroBayModules.map((module) => module.id));

    resolved.compositionLayoutOverrides = obj.composition_layout_overrides.map((rawOverride, index) => {
      const override = asObject(rawOverride, `${source}.composition_layout_overrides[${index}]`);
      const zoneId = asString(override.zoneId, `${source}.composition_layout_overrides[${index}].zoneId`);
      const face = asString(override.face, `${source}.composition_layout_overrides[${index}].face`);
      if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
        failParse(`${source}.composition_layout_overrides[${index}].face`, "expected 'north', 'south', 'east', or 'west'");
      }
      const segmentOrdinal = asPositiveNumber(
        override.segmentOrdinal,
        `${source}.composition_layout_overrides[${index}].segmentOrdinal`,
      );
      if (!Number.isInteger(segmentOrdinal)) {
        failParse(`${source}.composition_layout_overrides[${index}].segmentOrdinal`, "expected integer > 0");
      }
      const kind = asString(override.kind, `${source}.composition_layout_overrides[${index}].kind`);
      if (kind !== "spawn_b_front_courtyard" && kind !== "spawn_b_side_courtyard") {
        failParse(
          `${source}.composition_layout_overrides[${index}].kind`,
          "expected supported composition layout kind",
        );
      }
      const windowModuleId = asString(
        override.windowModuleId,
        `${source}.composition_layout_overrides[${index}].windowModuleId`,
      );
      if (!windowModuleIds.has(windowModuleId)) {
        failParse(
          `${source}.composition_layout_overrides[${index}].windowModuleId`,
          `unknown window module '${windowModuleId}'`,
        );
      }
      const doorModuleId = asString(
        override.doorModuleId,
        `${source}.composition_layout_overrides[${index}].doorModuleId`,
      );
      if (!doorModuleIds.has(doorModuleId)) {
        failParse(
          `${source}.composition_layout_overrides[${index}].doorModuleId`,
          `unknown door module '${doorModuleId}'`,
        );
      }
      const heroBayModuleId = typeof override.heroBayModuleId === "undefined"
        ? undefined
        : asString(
            override.heroBayModuleId,
            `${source}.composition_layout_overrides[${index}].heroBayModuleId`,
          );
      if (kind === "spawn_b_front_courtyard" && !heroBayModuleId) {
        failParse(
          `${source}.composition_layout_overrides[${index}].heroBayModuleId`,
          "front Spawn B compositions require a hero bay module",
        );
      }
      if (heroBayModuleId && !heroBayModuleIds.has(heroBayModuleId)) {
        failParse(
          `${source}.composition_layout_overrides[${index}].heroBayModuleId`,
          `unknown hero bay module '${heroBayModuleId}'`,
        );
      }
      return {
        zoneId,
        face,
        segmentOrdinal,
        kind,
        windowModuleId,
        doorModuleId,
        ...(heroBayModuleId ? { heroBayModuleId } : {}),
        lowerWindowSillY: asNumber(
          override.lowerWindowSillY,
          `${source}.composition_layout_overrides[${index}].lowerWindowSillY`,
        ),
        upperWindowSillY: asNumber(
          override.upperWindowSillY,
          `${source}.composition_layout_overrides[${index}].upperWindowSillY`,
        ),
      };
    });
  }

  return resolved;
}

const MAX_AUTHORED_GRADE_DEG = 30;
const RECT_EPSILON = 1e-6;

function optionalArray(value: unknown, source: string): unknown[] | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (!Array.isArray(value)) {
    failParse(source, "expected array when provided");
  }
  return value;
}

function parseMacroLane(value: unknown, source: string): RuntimeMacroLane {
  const lane = asString(value, source);
  if (lane !== "west" && lane !== "main" && lane !== "east") {
    failParse(source, "expected 'west', 'main', or 'east'");
  }
  return lane;
}

function rectContainsRect(outer: RuntimeRect, inner: RuntimeRect): boolean {
  return (
    inner.x >= outer.x - RECT_EPSILON
    && inner.y >= outer.y - RECT_EPSILON
    && inner.x + inner.w <= outer.x + outer.w + RECT_EPSILON
    && inner.y + inner.h <= outer.y + outer.h + RECT_EPSILON
  );
}

function rectContainsPoint(rect: RuntimeRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

const RUNTIME_MASSING_ROOF_STYLES = new Set(["flat_parapet", "setback_flat"]);
const RUNTIME_FACADE_FAMILIES = new Set([
  "active_merchant", "quiet_residential", "service_storage", "covered_arcade", "hero_courtyard",
]);
const RUNTIME_FACADE_MODULE_KINDS = new Set([
  "shop_recess", "door", "window", "vent", "arch", "column", "blind_niche",
]);
const RUNTIME_FACADE_OPENING_TYPES = new Set(["none", "recess", "door_void", "window_void", "arch_void"]);
const RUNTIME_FACADE_MATERIAL_SLOTS: RuntimeFacadeMaterialSlot[] = ["wall", "trim", "roof", "timber", "metal", "accent"];

function parseRuntimeDimensions(value: unknown, source: string): { width: number; depth: number; height: number } {
  const dimensions = asObject(value, source);
  return {
    width: asPositiveNumber(dimensions.width, `${source}.width`),
    depth: asPositiveNumber(dimensions.depth, `${source}.depth`),
    height: asPositiveNumber(dimensions.height, `${source}.height`),
  };
}

function parseRuntimeFacadeFace(value: unknown, source: string): RuntimeFacadeFace {
  const face = asString(value, source);
  if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
    failParse(source, "expected north, south, east, or west");
  }
  return face;
}

function parseRuntimeMaterialSlots(value: unknown, source: string): RuntimeFacadeMaterialSlots {
  const slots = asObject(value, source);
  const parsed = {} as RuntimeFacadeMaterialSlots;
  for (const slot of RUNTIME_FACADE_MATERIAL_SLOTS) {
    parsed[slot] = asString(slots[slot], `${source}.${slot}`);
  }
  return parsed;
}

function parseRuntimeMassingProfiles(
  raw: unknown[] | undefined,
  source: string,
): RuntimeMassingProfile[] | undefined {
  const ids = new Set<string>();
  return raw?.map((entryRaw, index) => {
    const path = `${source}.massingProfiles[${index}]`;
    const entry = asObject(entryRaw, path);
    const id = asString(entry.id, `${path}.id`);
    if (ids.has(id)) failParse(`${path}.id`, `duplicate massing profile '${id}'`);
    ids.add(id);
    const roofStyle = asString(entry.roofStyle, `${path}.roofStyle`);
    if (!RUNTIME_MASSING_ROOF_STYLES.has(roofStyle)) failParse(`${path}.roofStyle`, "unsupported roof style");
    const roofSetbackM = asNumber(entry.roofSetbackM, `${path}.roofSetbackM`);
    const upperStorySetbackM = asNumber(entry.upperStorySetbackM, `${path}.upperStorySetbackM`);
    if (roofSetbackM < 0 || upperStorySetbackM < 0) failParse(path, "setbacks must be >= 0");
    return {
      id,
      label: asString(entry.label, `${path}.label`),
      heightM: asPositiveNumber(entry.heightM, `${path}.heightM`),
      depthM: asPositiveNumber(entry.depthM, `${path}.depthM`),
      roofStyle: roofStyle as RuntimeMassingProfile["roofStyle"],
      roofSetbackM,
      parapetHeightM: asPositiveNumber(entry.parapetHeightM, `${path}.parapetHeightM`),
      upperStorySetbackM,
    };
  });
}

function parseRuntimeFacadeModules(
  raw: unknown[] | undefined,
  source: string,
  assetById: ReadonlyMap<string, RuntimeAssetRegistryEntry>,
): RuntimeFacadeModule[] | undefined {
  const ids = new Set<string>();
  return raw?.map((entryRaw, index) => {
    const path = `${source}.facadeModules[${index}]`;
    const entry = asObject(entryRaw, path);
    const id = asString(entry.id, `${path}.id`);
    if (ids.has(id)) failParse(`${path}.id`, `duplicate facade module '${id}'`);
    ids.add(id);
    const kind = asString(entry.kind, `${path}.kind`);
    if (!RUNTIME_FACADE_MODULE_KINDS.has(kind)) failParse(`${path}.kind`, "unsupported facade module kind");
    const openingType = asString(entry.openingType, `${path}.openingType`);
    if (!RUNTIME_FACADE_OPENING_TYPES.has(openingType)) failParse(`${path}.openingType`, "unsupported opening type");
    const materialSlot = asString(entry.materialSlot, `${path}.materialSlot`);
    if (!RUNTIME_FACADE_MATERIAL_SLOTS.includes(materialSlot as RuntimeFacadeMaterialSlot)) {
      failParse(`${path}.materialSlot`, "unsupported facade material slot");
    }
    if (asBoolean(entry.collisionOpening, `${path}.collisionOpening`) !== false) {
      failParse(`${path}.collisionOpening`, "v3 facade modules must not alter collision");
    }
    const assetId = typeof entry.assetId === "undefined" ? undefined : asString(entry.assetId, `${path}.assetId`);
    if (assetId && !assetById.has(assetId)) failParse(`${path}.assetId`, `unknown asset '${assetId}'`);
    return {
      id,
      label: asString(entry.label, `${path}.label`),
      kind: kind as RuntimeFacadeModuleKind,
      openingType: openingType as RuntimeFacadeOpeningType,
      dimensionsM: parseRuntimeDimensions(entry.dimensionsM, `${path}.dimensionsM`),
      materialSlot: materialSlot as RuntimeFacadeMaterialSlot,
      collisionOpening: false,
      ...(assetId ? { assetId } : {}),
    };
  });
}

function parseRuntimeFacadeProfiles(
  raw: unknown[] | undefined,
  source: string,
  massingById: ReadonlyMap<string, RuntimeMassingProfile>,
  moduleById: ReadonlyMap<string, RuntimeFacadeModule>,
): RuntimeFacadeProfile[] | undefined {
  const ids = new Set<string>();
  return raw?.map((entryRaw, index) => {
    const path = `${source}.facadeProfiles[${index}]`;
    const entry = asObject(entryRaw, path);
    const id = asString(entry.id, `${path}.id`);
    if (ids.has(id)) failParse(`${path}.id`, `duplicate facade profile '${id}'`);
    ids.add(id);
    const family = asString(entry.family, `${path}.family`);
    if (!RUNTIME_FACADE_FAMILIES.has(family)) failParse(`${path}.family`, "unsupported facade family");
    const massingProfileId = asString(entry.massingProfileId, `${path}.massingProfileId`);
    if (!massingById.has(massingProfileId)) failParse(`${path}.massingProfileId`, `unknown massing profile '${massingProfileId}'`);
    if (!Array.isArray(entry.moduleIds) || entry.moduleIds.length === 0) failParse(`${path}.moduleIds`, "expected non-empty array");
    const moduleIds = entry.moduleIds.map((moduleIdRaw, moduleIndex) => {
      const moduleId = asString(moduleIdRaw, `${path}.moduleIds[${moduleIndex}]`);
      if (!moduleById.has(moduleId)) failParse(`${path}.moduleIds[${moduleIndex}]`, `unknown module '${moduleId}'`);
      return moduleId;
    });
    if (new Set(moduleIds).size !== moduleIds.length) failParse(`${path}.moduleIds`, "duplicate module id");
    return {
      id,
      label: asString(entry.label, `${path}.label`),
      family: family as RuntimeFacadeProfile["family"],
      massingProfileId,
      materialSlots: parseRuntimeMaterialSlots(entry.materialSlots, `${path}.materialSlots`),
      moduleIds,
    };
  });
}

function parseRuntimeArchitecturePlacements(
  raw: unknown[] | undefined,
  source: string,
  zoneIds: ReadonlySet<string>,
  districtIds: ReadonlySet<string>,
  frontageIds: ReadonlySet<string>,
  massingById: ReadonlyMap<string, RuntimeMassingProfile>,
  profileById: ReadonlyMap<string, RuntimeFacadeProfile>,
  moduleById: ReadonlyMap<string, RuntimeFacadeModule>,
  assetById: ReadonlyMap<string, RuntimeAssetRegistryEntry>,
): RuntimeArchitecturePlacement[] | undefined {
  const ids = new Set<string>();
  return raw?.map((entryRaw, index) => {
    const path = `${source}.architecturePlacements[${index}]`;
    const entry = asObject(entryRaw, path);
    const id = asString(entry.id, `${path}.id`);
    if (ids.has(id)) failParse(`${path}.id`, `duplicate architecture placement '${id}'`);
    ids.add(id);
    const frontageId = asString(entry.frontageId, `${path}.frontageId`);
    if (!frontageIds.has(frontageId)) failParse(`${path}.frontageId`, `unknown frontage '${frontageId}'`);
    const zoneId = asString(entry.zoneId, `${path}.zoneId`);
    if (!zoneIds.has(zoneId)) failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    const districtId = typeof entry.districtId === "undefined" ? undefined : asString(entry.districtId, `${path}.districtId`);
    if (districtId && !districtIds.has(districtId)) failParse(`${path}.districtId`, `unknown district '${districtId}'`);
    const profileId = asString(entry.profileId, `${path}.profileId`);
    if (!profileById.has(profileId)) failParse(`${path}.profileId`, `unknown facade profile '${profileId}'`);
    const kind = asString(entry.kind, `${path}.kind`);
    const shared = {
      id,
      frontageId,
      zoneId,
      ...(districtId ? { districtId } : {}),
      face: parseRuntimeFacadeFace(entry.face, `${path}.face`),
      profileId,
      center: parseVec3(entry.center, `${path}.center`),
      sizeM: parseRuntimeDimensions(entry.sizeM, `${path}.sizeM`),
      yawDeg: asNumber(entry.yawDeg, `${path}.yawDeg`),
    };
    if (kind === "massing") {
      const massingProfileId = asString(entry.massingProfileId, `${path}.massingProfileId`);
      if (!massingById.has(massingProfileId)) failParse(`${path}.massingProfileId`, `unknown massing profile '${massingProfileId}'`);
      const roof = asObject(entry.roof, `${path}.roof`);
      const style = asString(roof.style, `${path}.roof.style`);
      if (!RUNTIME_MASSING_ROOF_STYLES.has(style)) failParse(`${path}.roof.style`, "unsupported roof style");
      const facadeModelId = typeof entry.facadeModelId === "undefined"
        ? undefined
        : asString(entry.facadeModelId, `${path}.facadeModelId`);
      return {
        ...shared,
        kind: "massing",
        massingProfileId,
        ...(facadeModelId ? { facadeModelId } : {}),
        materialSlots: parseRuntimeMaterialSlots(entry.materialSlots, `${path}.materialSlots`),
        roof: {
          style: style as RuntimeArchitectureMassingPlacement["roof"]["style"],
          setbackM: asNumber(roof.setbackM, `${path}.roof.setbackM`),
          parapetHeightM: asPositiveNumber(roof.parapetHeightM, `${path}.roof.parapetHeightM`),
          upperStorySetbackM: asNumber(roof.upperStorySetbackM, `${path}.roof.upperStorySetbackM`),
          elevationM: asNumber(roof.elevationM, `${path}.roof.elevationM`),
        },
      };
    }
    if (kind !== "facade_module") failParse(`${path}.kind`, "expected massing or facade_module");
    const moduleId = asString(entry.moduleId, `${path}.moduleId`);
    const module = moduleById.get(moduleId);
    if (!module) failParse(`${path}.moduleId`, `unknown facade module '${moduleId}'`);
    const moduleKind = asString(entry.moduleKind, `${path}.moduleKind`);
    const openingType = asString(entry.openingType, `${path}.openingType`);
    const materialSlot = asString(entry.materialSlot, `${path}.materialSlot`);
    if (module.kind !== moduleKind || module.openingType !== openingType || module.materialSlot !== materialSlot) {
      failParse(path, "compiled facade module semantics drift from its registry entry");
    }
    if (asBoolean(entry.collisionOpening, `${path}.collisionOpening`) !== false) {
      failParse(`${path}.collisionOpening`, "compiled facade modules must not alter collision");
    }
    const assetId = typeof entry.assetId === "undefined" ? undefined : asString(entry.assetId, `${path}.assetId`);
    if (assetId && !assetById.has(assetId)) failParse(`${path}.assetId`, `unknown asset '${assetId}'`);
    return {
      ...shared,
      kind: "facade_module",
      moduleId,
      moduleKind: moduleKind as RuntimeFacadeModuleKind,
      openingType: openingType as RuntimeFacadeOpeningType,
      datumId: asString(entry.datumId, `${path}.datumId`),
      columnId: asString(entry.columnId, `${path}.columnId`),
      layoutSource: (() => {
        const layoutSource = asString(entry.layoutSource, `${path}.layoutSource`);
        if (layoutSource !== "generated" && layoutSource !== "authored") {
          failParse(`${path}.layoutSource`, "expected generated or authored");
        }
        return layoutSource as RuntimeFacadeLayoutSource;
      })(),
      materialSlot: materialSlot as RuntimeFacadeMaterialSlot,
      collisionOpening: false,
      ...(assetId ? { assetId } : {}),
    };
  });
}

function parseRuntimeDressingPlacements(
  raw: unknown[] | undefined,
  source: string,
  zoneIds: ReadonlySet<string>,
  districtIds: ReadonlySet<string>,
  clusterIds: ReadonlySet<string>,
  assetById: ReadonlyMap<string, RuntimeAssetRegistryEntry>,
): RuntimeDressingPlacement[] | undefined {
  const ids = new Set<string>();
  return raw?.map((entryRaw, index) => {
    const path = `${source}.dressingPlacements[${index}]`;
    const entry = asObject(entryRaw, path);
    const id = asString(entry.id, `${path}.id`);
    if (ids.has(id)) failParse(`${path}.id`, `duplicate dressing placement '${id}'`);
    ids.add(id);
    const clusterId = asString(entry.clusterId, `${path}.clusterId`);
    if (!clusterIds.has(clusterId)) failParse(`${path}.clusterId`, `unknown cluster '${clusterId}'`);
    const assetId = asString(entry.assetId, `${path}.assetId`);
    const asset = assetById.get(assetId);
    if (!asset) failParse(`${path}.assetId`, `unknown asset '${assetId}'`);
    const zoneId = asString(entry.zoneId, `${path}.zoneId`);
    if (!zoneIds.has(zoneId)) failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    const districtId = typeof entry.districtId === "undefined" ? undefined : asString(entry.districtId, `${path}.districtId`);
    if (districtId && !districtIds.has(districtId)) failParse(`${path}.districtId`, `unknown district '${districtId}'`);
    const classification = asString(entry.classification, `${path}.classification`);
    if (classification !== "gameplay_cover" && classification !== "soft_visual" && classification !== "overhead") {
      failParse(`${path}.classification`, "unsupported dressing classification");
    }
    const scale = asObject(entry.scale, `${path}.scale`);
    const collisionClass = asString(entry.collisionClass, `${path}.collisionClass`);
    const shadowPolicy = asString(entry.shadowPolicy, `${path}.shadowPolicy`);
    const semanticClass = asString(entry.semanticClass, `${path}.semanticClass`);
    const runtime = asObject(entry.runtime, `${path}.runtime`);
    const runtimeMode = asString(runtime.mode, `${path}.runtime.mode`);
    const runtimeUri = typeof runtime.uri === "undefined" ? undefined : asString(runtime.uri, `${path}.runtime.uri`);
    const spanSeats = typeof entry.spanSeats === "undefined"
      ? undefined
      : asObject(entry.spanSeats, `${path}.spanSeats`);
    if (asset.runtime?.id !== asString(runtime.id, `${path}.runtime.id`) || asset.runtime?.mode !== runtimeMode) {
      failParse(`${path}.runtime`, "compiled runtime metadata drifts from asset registry");
    }
    return {
      id,
      clusterId,
      assetId,
      anchorId: asString(entry.anchorId, `${path}.anchorId`),
      zoneId,
      ...(districtId ? { districtId } : {}),
      classification,
      position: parseVec3(entry.position, `${path}.position`),
      yawDeg: asNumber(entry.yawDeg, `${path}.yawDeg`),
      ...(spanSeats ? {
        spanSeats: {
          start: parseVec3(spanSeats.start, `${path}.spanSeats.start`),
          end: parseVec3(spanSeats.end, `${path}.spanSeats.end`),
        },
      } : {}),
      scale: {
        x: asPositiveNumber(scale.x, `${path}.scale.x`),
        y: asPositiveNumber(scale.y, `${path}.scale.y`),
        z: asPositiveNumber(scale.z, `${path}.scale.z`),
      },
      dimensionsM: parseRuntimeDimensions(entry.dimensionsM, `${path}.dimensionsM`),
      collisionClass: collisionClass as RuntimeDressingPlacement["collisionClass"],
      shadowPolicy: shadowPolicy as RuntimeDressingPlacement["shadowPolicy"],
      lodEligible: asBoolean(entry.lodEligible, `${path}.lodEligible`),
      semanticClass: semanticClass as RuntimeDressingPlacement["semanticClass"],
      runtime: {
        mode: runtimeMode as RuntimeDressingPlacement["runtime"]["mode"],
        id: asString(runtime.id, `${path}.runtime.id`),
        ...(runtimeUri ? { uri: runtimeUri } : {}),
      },
    };
  });
}

export function parseBlockoutSpec(value: unknown, source = "map_spec.json"): RuntimeBlockoutSpec {
  const obj = asObject(value, source);
  const zonesRaw = obj.zones;
  if (!Array.isArray(zonesRaw) || zonesRaw.length === 0) {
    failParse(source, "zones must be a non-empty array");
  }

  const zoneIds = new Set<string>();
  const zones: RuntimeBlockoutZone[] = zonesRaw.map((zoneRaw, index) => {
    const zone = asObject(zoneRaw, `${source}.zones[${index}]`);
    const id = asString(zone.id, `${source}.zones[${index}].id`);
    if (zoneIds.has(id)) {
      failParse(`${source}.zones[${index}].id`, `duplicate zone id '${id}'`);
    }
    zoneIds.add(id);
    const type = asString(zone.type, `${source}.zones[${index}].type`);
    const rect = parseRect(zone.rect, `${source}.zones[${index}].rect`);
    const clearWidthM = typeof zone.clearWidthM === "undefined"
      ? undefined
      : asPositiveNumber(zone.clearWidthM, `${source}.zones[${index}].clearWidthM`);
    const availableCrossSectionM = type === "connector" || type === "cut"
      ? Math.max(rect.w, rect.h)
      : Math.min(rect.w, rect.h);
    if (typeof clearWidthM !== "undefined" && clearWidthM > availableCrossSectionM) {
      failParse(`${source}.zones[${index}].clearWidthM`, "must fit inside the authored passage cross-section");
    }
    return {
      id,
      type,
      rect,
      label: typeof zone.label === "string" ? zone.label : "",
      notes: typeof zone.notes === "string" ? zone.notes : "",
      ...(typeof zone.sectionModelId !== "undefined"
        ? { sectionModelId: asString(zone.sectionModelId, `${source}.zones[${index}].sectionModelId`) }
        : {}),
      ...(typeof zone.sectionFaces !== "undefined"
        ? { sectionFaces: (optionalArray(zone.sectionFaces, `${source}.zones[${index}].sectionFaces`) ?? []).map((face, i) => parseRuntimeFacadeFace(face, `${source}.zones[${index}].sectionFaces[${i}]`)) }
        : {}),
      ...(typeof zone.surfaceId !== "undefined"
        ? { surfaceId: asString(zone.surfaceId, `${source}.zones[${index}].surfaceId`) }
        : {}),
      ...(typeof zone.districtId !== "undefined"
        ? { districtId: asString(zone.districtId, `${source}.zones[${index}].districtId`) }
        : {}),
      ...(typeof zone.macroLane !== "undefined"
        ? { macroLane: parseMacroLane(zone.macroLane, `${source}.zones[${index}].macroLane`) }
        : {}),
      ...(typeof zone.floorMaterialId !== "undefined"
        ? { floorMaterialId: asString(zone.floorMaterialId, `${source}.zones[${index}].floorMaterialId`) }
        : {}),
      ...(typeof zone.facadeProfileId !== "undefined"
        ? { facadeProfileId: asString(zone.facadeProfileId, `${source}.zones[${index}].facadeProfileId`) }
        : {}),
      ...(typeof clearWidthM !== "undefined" ? { clearWidthM } : {}),
    };
  });

  const defaults = asObject(obj.defaults, `${source}.defaults`);
  const constraints = asObject(obj.constraints, `${source}.constraints`);
  const playableBoundary = parseRect(obj.playable_boundary, `${source}.playable_boundary`);

  const patchesRaw = obj.exterior_wall_patches;
  if (typeof patchesRaw !== "undefined" && !Array.isArray(patchesRaw)) {
    failParse(`${source}.exterior_wall_patches`, "expected array when provided");
  }
  const patchKeys = new Set<string>();
  const exterior_wall_patches: RuntimeWallPatch[] = Array.isArray(patchesRaw)
    ? patchesRaw.map((p, i): RuntimeWallPatch => {
        const patch = asObject(p, `${source}.exterior_wall_patches[${i}]`);
        const orientation = asString(patch.orientation, `${source}.exterior_wall_patches[${i}].orientation`);
        if (orientation !== "vertical" && orientation !== "horizontal") {
          failParse(`${source}.exterior_wall_patches[${i}].orientation`, "expected 'vertical' or 'horizontal'");
        }
        const outward = asNumber(patch.outward, `${source}.exterior_wall_patches[${i}].outward`);
        if (outward !== -1 && outward !== 1) {
          failParse(`${source}.exterior_wall_patches[${i}].outward`, "expected -1 or 1");
        }
        const coord = asNumber(patch.coord, `${source}.exterior_wall_patches[${i}].coord`);
        const start = asNumber(patch.start, `${source}.exterior_wall_patches[${i}].start`);
        const end = asNumber(patch.end, `${source}.exterior_wall_patches[${i}].end`);
        if (start >= end) {
          failParse(`${source}.exterior_wall_patches[${i}]`, "start must be less than end");
        }
        const key = `${orientation}\u0000${coord}\u0000${start}\u0000${end}\u0000${outward}`;
        if (patchKeys.has(key)) {
          failParse(`${source}.exterior_wall_patches[${i}]`, "duplicate wall patch");
        }
        patchKeys.add(key);
        return { orientation, coord, start, end, outward };
      })
    : [];

  const districtsRaw = optionalArray(obj.districts, `${source}.districts`);
  const districtIds = new Set<string>();
  const districts: RuntimeDistrict[] | undefined = districtsRaw?.map((districtRaw, index) => {
    const district = asObject(districtRaw, `${source}.districts[${index}]`);
    const id = asString(district.id, `${source}.districts[${index}].id`);
    if (districtIds.has(id)) {
      failParse(`${source}.districts[${index}].id`, `duplicate district id '${id}'`);
    }
    districtIds.add(id);
    return {
      id,
      label: asString(district.label, `${source}.districts[${index}].label`),
      ...(typeof district.notes !== "undefined"
        ? { notes: asString(district.notes, `${source}.districts[${index}].notes`) }
        : {}),
    };
  });

  const surfacesRaw = optionalArray(obj.traversalSurfaces, `${source}.traversalSurfaces`);
  const surfaceById = new Map<string, RuntimeTraversalSurface>();
  const traversalSurfaces: RuntimeTraversalSurface[] | undefined = surfacesRaw?.map((surfaceRaw, index) => {
    const path = `${source}.traversalSurfaces[${index}]`;
    const surface = asObject(surfaceRaw, path);
    const id = asString(surface.id, `${path}.id`);
    if (surfaceById.has(id)) {
      failParse(`${path}.id`, `duplicate traversal surface id '${id}'`);
    }
    const zoneId = asString(surface.zoneId, `${path}.zoneId`);
    const zone = zones.find((candidate) => candidate.id === zoneId);
    if (!zone) {
      failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    }
    const rect = parseRect(surface.rect, `${path}.rect`);
    if (!rectContainsRect(zone.rect, rect)) {
      failParse(`${path}.rect`, `must fit inside zone '${zoneId}'`);
    }
    const kind = asString(surface.kind, `${path}.kind`);
    let parsed: RuntimeTraversalSurface;
    if (kind === "flat") {
      parsed = {
        id,
        zoneId,
        kind,
        rect,
        elevationM: asNumber(surface.elevationM, `${path}.elevationM`),
      };
    } else if (kind === "ramp") {
      const axis = asString(surface.axis, `${path}.axis`);
      if (axis !== "x" && axis !== "y") {
        failParse(`${path}.axis`, "expected 'x' or 'y'");
      }
      const startElevationM = asNumber(surface.startElevationM, `${path}.startElevationM`);
      const endElevationM = asNumber(surface.endElevationM, `${path}.endElevationM`);
      if (startElevationM === endElevationM) {
        failParse(path, "ramp must change elevation");
      }
      const runM = axis === "x" ? rect.w : rect.h;
      const gradeDeg = Math.atan(Math.abs(endElevationM - startElevationM) / runM) * (180 / Math.PI);
      if (gradeDeg > MAX_AUTHORED_GRADE_DEG + RECT_EPSILON) {
        failParse(path, `ramp grade exceeds ${MAX_AUTHORED_GRADE_DEG} degrees`);
      }
      let visualStyle: RuntimeRampTraversalSurface["visualStyle"];
      if (typeof surface.visualStyle !== "undefined") {
        const parsedVisualStyle = asString(surface.visualStyle, `${path}.visualStyle`);
        if (parsedVisualStyle !== "ramp" && parsedVisualStyle !== "stairs") {
          failParse(`${path}.visualStyle`, "expected 'ramp' or 'stairs'");
        }
        visualStyle = parsedVisualStyle;
      }
      const stepCount = typeof surface.stepCount === "undefined"
        ? undefined
        : asPositiveNumber(surface.stepCount, `${path}.stepCount`);
      if (typeof stepCount !== "undefined" && (!Number.isInteger(stepCount) || stepCount > 64)) {
        failParse(`${path}.stepCount`, "expected integer from 1 through 64");
      }
      if ((visualStyle === "stairs") !== (typeof stepCount !== "undefined")) {
        failParse(path, "visualStyle 'stairs' and stepCount must be provided together");
      }
      parsed = {
        id,
        zoneId,
        kind,
        rect,
        axis,
        startElevationM,
        endElevationM,
        ...(visualStyle ? { visualStyle } : {}),
        ...(typeof stepCount !== "undefined" ? { stepCount } : {}),
      };
    } else {
      failParse(`${path}.kind`, "expected 'flat' or 'ramp'");
    }
    surfaceById.set(id, parsed);
    return parsed;
  });

  const tacticalLanesRaw = optionalArray(obj.tacticalLanes, `${source}.tacticalLanes`);
  const tacticalLaneById = new Map<RuntimeMacroLane, RuntimeTacticalLane>();
  const tacticalLanes: RuntimeTacticalLane[] | undefined = tacticalLanesRaw?.map((laneRaw, index) => {
    const path = `${source}.tacticalLanes[${index}]`;
    const lane = asObject(laneRaw, path);
    const id = parseMacroLane(lane.id, `${path}.id`);
    if (tacticalLaneById.has(id)) {
      failParse(`${path}.id`, `duplicate tactical lane id '${id}'`);
    }
    if (!Array.isArray(lane.zoneIds) || lane.zoneIds.length === 0) {
      failParse(`${path}.zoneIds`, "expected non-empty array");
    }
    const seenLaneZoneIds = new Set<string>();
    const laneZoneIds = lane.zoneIds.map((zoneIdRaw, zoneIndex) => {
      const zoneId = asString(zoneIdRaw, `${path}.zoneIds[${zoneIndex}]`);
      if (!zoneIds.has(zoneId)) {
        failParse(`${path}.zoneIds[${zoneIndex}]`, `unknown zone '${zoneId}'`);
      }
      if (seenLaneZoneIds.has(zoneId)) {
        failParse(`${path}.zoneIds[${zoneIndex}]`, `duplicate zone '${zoneId}'`);
      }
      seenLaneZoneIds.add(zoneId);
      return zoneId;
    });
    const cost = typeof lane.cost === "undefined" ? undefined : asPositiveNumber(lane.cost, `${path}.cost`);
    const parsed: RuntimeTacticalLane = {
      id,
      label: asString(lane.label, `${path}.label`),
      zoneIds: laneZoneIds,
      ...(typeof cost !== "undefined" ? { cost } : {}),
    };
    tacticalLaneById.set(id, parsed);
    return parsed;
  });

  for (const zone of zones) {
    if (zone.districtId && !districtIds.has(zone.districtId)) {
      failParse(`${source}.zones`, `zone '${zone.id}' references unknown district '${zone.districtId}'`);
    }
    if (zone.surfaceId) {
      const surface = surfaceById.get(zone.surfaceId);
      if (!surface) {
        failParse(`${source}.zones`, `zone '${zone.id}' references unknown surface '${zone.surfaceId}'`);
      }
      if (surface.zoneId !== zone.id) {
        failParse(`${source}.zones`, `zone '${zone.id}' references a surface owned by '${surface.zoneId}'`);
      }
    }
    if (zone.macroLane && tacticalLanes) {
      const lane = tacticalLaneById.get(zone.macroLane);
      if (!lane) {
        failParse(`${source}.zones`, `zone '${zone.id}' references unknown tactical lane '${zone.macroLane}'`);
      }
      if (!lane.zoneIds.includes(zone.id)) {
        failParse(`${source}.tacticalLanes`, `lane '${zone.macroLane}' must list zone '${zone.id}'`);
      }
    }
  }

  const connectivityRaw = optionalArray(obj.explicitConnectivity, `${source}.explicitConnectivity`);
  const edgeKeys = new Set<string>();
  const explicitConnectivity: RuntimeExplicitConnectivityEdge[] | undefined = connectivityRaw?.map((edgeRaw, index) => {
    const path = `${source}.explicitConnectivity[${index}]`;
    const edge = asObject(edgeRaw, path);
    const fromZoneId = asString(edge.fromZoneId, `${path}.fromZoneId`);
    const toZoneId = asString(edge.toZoneId, `${path}.toZoneId`);
    if (!zoneIds.has(fromZoneId)) failParse(`${path}.fromZoneId`, `unknown zone '${fromZoneId}'`);
    if (!zoneIds.has(toZoneId)) failParse(`${path}.toZoneId`, `unknown zone '${toZoneId}'`);
    if (fromZoneId === toZoneId) failParse(path, "cannot connect a zone to itself");
    const transitionSurfaceId = typeof edge.transitionSurfaceId === "undefined"
      ? undefined
      : asString(edge.transitionSurfaceId, `${path}.transitionSurfaceId`);
    if (transitionSurfaceId) {
      const surface = surfaceById.get(transitionSurfaceId);
      if (!surface) failParse(`${path}.transitionSurfaceId`, `unknown surface '${transitionSurfaceId}'`);
      if (surface.zoneId !== fromZoneId && surface.zoneId !== toZoneId) {
        failParse(`${path}.transitionSurfaceId`, "surface must belong to one endpoint zone");
      }
    }
    const cost = typeof edge.cost === "undefined" ? undefined : asPositiveNumber(edge.cost, `${path}.cost`);
    const edgeKey = `${fromZoneId}\u0000${toZoneId}\u0000${transitionSurfaceId ?? ""}`;
    if (edgeKeys.has(edgeKey)) failParse(path, "duplicate connectivity edge");
    edgeKeys.add(edgeKey);
    return {
      fromZoneId,
      toZoneId,
      ...(transitionSurfaceId ? { transitionSurfaceId } : {}),
      ...(typeof cost !== "undefined" ? { cost } : {}),
    };
  });

  const authoredSpawnsRaw = optionalArray(obj.authoredSpawns, `${source}.authoredSpawns`);
  const spawnIds = new Set<string>();
  const authoredSpawns: RuntimeAuthoredSpawn[] | undefined = authoredSpawnsRaw?.map((spawnRaw, index) => {
    const path = `${source}.authoredSpawns[${index}]`;
    const spawn = asObject(spawnRaw, path);
    const id = asString(spawn.id, `${path}.id`);
    if (spawnIds.has(id)) failParse(`${path}.id`, `duplicate spawn id '${id}'`);
    spawnIds.add(id);
    const kind = asString(spawn.kind, `${path}.kind`);
    if (kind !== "player" && kind !== "enemy") failParse(`${path}.kind`, "expected 'player' or 'enemy'");
    const zoneId = asString(spawn.zoneId, `${path}.zoneId`);
    const zone = zones.find((candidate) => candidate.id === zoneId);
    if (!zone) failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    const surfaceId = asString(spawn.surfaceId, `${path}.surfaceId`);
    const surface = surfaceById.get(surfaceId);
    if (!surface) failParse(`${path}.surfaceId`, `unknown surface '${surfaceId}'`);
    if (surface.zoneId !== zoneId) failParse(path, "zone and surface must belong together");
    const x = asNumber(spawn.x, `${path}.x`);
    const y = asNumber(spawn.y, `${path}.y`);
    if (!rectContainsPoint(zone.rect, x, y) || !rectContainsPoint(surface.rect, x, y)) {
      failParse(path, "spawn must lie inside its zone and traversal surface");
    }
    const yawDeg = asNumber(spawn.yawDeg, `${path}.yawDeg`);
    if (yawDeg < 0 || yawDeg >= 360) failParse(`${path}.yawDeg`, "expected number >= 0 and < 360");
    return { id, kind, zoneId, surfaceId, x, y, yawDeg };
  });

  const frontagesRaw = optionalArray(obj.frontages, `${source}.frontages`);
  const frontageIds = new Set<string>();
  const frontages: RuntimeFrontage[] | undefined = frontagesRaw?.map((frontageRaw, index) => {
    const path = `${source}.frontages[${index}]`;
    const frontage = asObject(frontageRaw, path);
    const id = asString(frontage.id, `${path}.id`);
    if (frontageIds.has(id)) failParse(`${path}.id`, `duplicate frontage id '${id}'`);
    frontageIds.add(id);
    const zoneId = asString(frontage.zoneId, `${path}.zoneId`);
    if (!zoneIds.has(zoneId)) failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    const face = asString(frontage.face, `${path}.face`);
    if (face !== "north" && face !== "south" && face !== "east" && face !== "west") {
      failParse(`${path}.face`, "expected north, south, east, or west");
    }
    const start = typeof frontage.start === "undefined" ? undefined : asNumber(frontage.start, `${path}.start`);
    const end = typeof frontage.end === "undefined" ? undefined : asNumber(frontage.end, `${path}.end`);
    if ((typeof start === "undefined") !== (typeof end === "undefined")) {
      failParse(path, "start and end must be provided together");
    }
    if (typeof start !== "undefined" && typeof end !== "undefined" && (start < 0 || end > 1 || start >= end)) {
      failParse(path, "expected 0 <= start < end <= 1");
    }
    const districtId = typeof frontage.districtId === "undefined"
      ? undefined
      : asString(frontage.districtId, `${path}.districtId`);
    if (districtId && !districtIds.has(districtId)) {
      failParse(`${path}.districtId`, `unknown district '${districtId}'`);
    }
    const massingProfileId = typeof frontage.massingProfileId === "undefined"
      ? undefined
      : asString(frontage.massingProfileId, `${path}.massingProfileId`);
    const baysRaw = optionalArray(frontage.bays, `${path}.bays`);
    const bayIds = new Set<string>();
    const bays: RuntimeFrontageBay[] | undefined = baysRaw?.map((bayRaw, bayIndex) => {
      const bayPath = `${path}.bays[${bayIndex}]`;
      const bay = asObject(bayRaw, bayPath);
      const bayId = asString(bay.id, `${bayPath}.id`);
      if (bayIds.has(bayId)) failParse(`${bayPath}.id`, `duplicate bay id '${bayId}'`);
      bayIds.add(bayId);
      const along = asNumber(bay.along, `${bayPath}.along`);
      if (along < 0 || along > 1) failParse(`${bayPath}.along`, "expected number between 0 and 1");
      const baseElevationM = asNumber(bay.baseElevationM, `${bayPath}.baseElevationM`);
      if (baseElevationM < 0) failParse(`${bayPath}.baseElevationM`, "expected number >= 0");
      return {
        id: bayId,
        moduleId: asString(bay.moduleId, `${bayPath}.moduleId`),
        along,
        baseElevationM,
        ...(typeof bay.datumId !== "undefined" ? { datumId: asString(bay.datumId, `${bayPath}.datumId`) } : {}),
        ...(typeof bay.columnId !== "undefined" ? { columnId: asString(bay.columnId, `${bayPath}.columnId`) } : {}),
        ...(typeof bay.layoutSource !== "undefined" ? {
          layoutSource: (() => {
            const layoutSource = asString(bay.layoutSource, `${bayPath}.layoutSource`);
            if (layoutSource !== "generated" && layoutSource !== "authored") {
              failParse(`${bayPath}.layoutSource`, "expected generated or authored");
            }
            return layoutSource as RuntimeFacadeLayoutSource;
          })(),
        } : {}),
      };
    });
    let layout: RuntimeFrontageLayout | undefined;
    if (typeof frontage.layout !== "undefined") {
      const layoutPath = `${path}.layout`;
      const rawLayout = asObject(frontage.layout, layoutPath);
      const layoutSource = asString(rawLayout.source, `${layoutPath}.source`);
      if (layoutSource !== "generated" && layoutSource !== "authored") {
        failParse(`${layoutPath}.source`, "expected generated or authored");
      }
      const rhythm = asString(rawLayout.rhythm, `${layoutPath}.rhythm`);
      if (!["merchant", "residential", "residential_dense", "service", "arcade", "hero", "authored"].includes(rhythm)) {
        failParse(`${layoutPath}.rhythm`, "unsupported facade rhythm");
      }
      if ((layoutSource === "authored") !== (rhythm === "authored")) {
        failParse(`${layoutPath}.rhythm`, "authored layouts use rhythm 'authored' and generated layouts use a grammar rhythm");
      }
      const upperSillDatumsRaw = optionalArray(rawLayout.upperSillDatumsM, `${layoutPath}.upperSillDatumsM`) ?? [];
      layout = {
        source: layoutSource as RuntimeFacadeLayoutSource,
        rhythm: rhythm as RuntimeFrontageLayout["rhythm"],
        storyCount: asPositiveNumber(rawLayout.storyCount, `${layoutPath}.storyCount`),
        edgeMarginM: asPositiveNumber(rawLayout.edgeMarginM, `${layoutPath}.edgeMarginM`),
        groundHeadM: asPositiveNumber(rawLayout.groundHeadM, `${layoutPath}.groundHeadM`),
        upperSillDatumsM: upperSillDatumsRaw.map((value, datumIndex) => asPositiveNumber(value, `${layoutPath}.upperSillDatumsM[${datumIndex}]`)),
        signBandBottomM: asPositiveNumber(rawLayout.signBandBottomM, `${layoutPath}.signBandBottomM`),
        signBandTopM: asPositiveNumber(rawLayout.signBandTopM, `${layoutPath}.signBandTopM`),
      };
      if (layout.signBandTopM <= layout.signBandBottomM) failParse(layoutPath, "sign band top must exceed bottom");
    }
    return {
      id,
      zoneId,
      face,
      ...(typeof start !== "undefined" ? { start, end: end as number } : {}),
      ...(districtId ? { districtId } : {}),
      ...(typeof frontage.facadeProfileId !== "undefined"
        ? { facadeProfileId: asString(frontage.facadeProfileId, `${path}.facadeProfileId`) }
        : {}),
      ...(massingProfileId ? { massingProfileId } : {}),
      ...(bays ? { bays } : {}),
      ...(layout ? { layout } : {}),
    };
  });

  const assetRegistryRaw = optionalArray(obj.assetRegistry, `${source}.assetRegistry`);
  const assetById = new Map<string, RuntimeAssetRegistryEntry>();
  const assetRegistry: RuntimeAssetRegistryEntry[] | undefined = assetRegistryRaw?.map((assetRaw, index) => {
    const path = `${source}.assetRegistry[${index}]`;
    const asset = asObject(assetRaw, path);
    const id = asString(asset.id, `${path}.id`);
    if (assetById.has(id)) failParse(`${path}.id`, `duplicate asset id '${id}'`);
    const sourceRecord = asObject(asset.source, `${path}.source`);
    const sourceKind = asString(sourceRecord.kind, `${path}.source.kind`);
    if (sourceKind !== "project_original" && sourceKind !== "external_cc0") {
      failParse(`${path}.source.kind`, "expected project_original or external_cc0");
    }
    const license = asString(asset.license, `${path}.license`);
    if (license !== "Project-Original" && license !== "CC0-1.0") {
      failParse(`${path}.license`, "expected Project-Original or CC0-1.0");
    }
    if ((sourceKind === "project_original") !== (license === "Project-Original")) {
      failParse(path, "source kind and license do not match");
    }
    const dimensions = asObject(asset.dimensionsM, `${path}.dimensionsM`);
    const collisionClass = asString(asset.collisionClass, `${path}.collisionClass`);
    if (collisionClass !== "none" && collisionClass !== "soft" && collisionClass !== "hard" && collisionClass !== "overhead") {
      failParse(`${path}.collisionClass`, "expected none, soft, hard, or overhead");
    }
    const shadowPolicy = asString(asset.shadowPolicy, `${path}.shadowPolicy`);
    if (shadowPolicy !== "cast_receive" && shadowPolicy !== "receive_only" && shadowPolicy !== "none") {
      failParse(`${path}.shadowPolicy`, "expected cast_receive, receive_only, or none");
    }
    const semanticClass = typeof asset.semanticClass === "undefined"
      ? undefined
      : asString(asset.semanticClass, `${path}.semanticClass`);
    const semanticClasses = new Set([
      "architecture", "container", "cover", "furniture", "foliage",
      "landmark", "lighting", "overhead", "signage", "textile",
    ]);
    if (semanticClass && !semanticClasses.has(semanticClass)) {
      failParse(`${path}.semanticClass`, "unsupported semantic class");
    }
    let runtime: RuntimeAssetRegistryEntry["runtime"];
    if (typeof asset.runtime !== "undefined") {
      const runtimeRecord = asObject(asset.runtime, `${path}.runtime`);
      const mode = asString(runtimeRecord.mode, `${path}.runtime.mode`);
      if (mode !== "model" && mode !== "procedural") {
        failParse(`${path}.runtime.mode`, "expected model or procedural");
      }
      const uri = typeof runtimeRecord.uri === "undefined"
        ? undefined
        : asString(runtimeRecord.uri, `${path}.runtime.uri`);
      if (mode === "model" && !uri) failParse(`${path}.runtime.uri`, "model assets require a URI");
      if (mode === "procedural" && uri) failParse(`${path}.runtime.uri`, "procedural assets cannot use a URI");
      runtime = {
        mode,
        id: asString(runtimeRecord.id, `${path}.runtime.id`),
        ...(uri ? { uri } : {}),
      };
    }
    let transform: RuntimeAssetRegistryEntry["transform"];
    if (typeof asset.transform !== "undefined") {
      const transformRecord = asObject(asset.transform, `${path}.transform`);
      const pivot = asString(transformRecord.pivot, `${path}.transform.pivot`);
      if (pivot !== "base_center") failParse(`${path}.transform.pivot`, "expected base_center");
      const upAxis = asString(transformRecord.upAxis, `${path}.transform.upAxis`);
      const forwardAxis = asString(transformRecord.forwardAxis, `${path}.transform.forwardAxis`);
      const axes = new Set(["+x", "-x", "+y", "-y", "+z", "-z"]);
      if (!axes.has(upAxis)) failParse(`${path}.transform.upAxis`, "unsupported axis");
      if (!axes.has(forwardAxis)) failParse(`${path}.transform.forwardAxis`, "unsupported axis");
      if (upAxis.slice(1) === forwardAxis.slice(1)) failParse(`${path}.transform`, "up and forward axes must differ");
      const scale = asObject(transformRecord.authoredScale, `${path}.transform.authoredScale`);
      transform = {
        pivot,
        upAxis: upAxis as NonNullable<RuntimeAssetRegistryEntry["transform"]>["upAxis"],
        forwardAxis: forwardAxis as NonNullable<RuntimeAssetRegistryEntry["transform"]>["forwardAxis"],
        authoredScale: {
          x: asPositiveNumber(scale.x, `${path}.transform.authoredScale.x`),
          y: asPositiveNumber(scale.y, `${path}.transform.authoredScale.y`),
          z: asPositiveNumber(scale.z, `${path}.transform.authoredScale.z`),
        },
      };
    }
    const parsed: RuntimeAssetRegistryEntry = {
      id,
      label: asString(asset.label, `${path}.label`),
      source: { kind: sourceKind, uri: asString(sourceRecord.uri, `${path}.source.uri`) },
      license,
      dimensionsM: {
        width: asPositiveNumber(dimensions.width, `${path}.dimensionsM.width`),
        depth: asPositiveNumber(dimensions.depth, `${path}.dimensionsM.depth`),
        height: asPositiveNumber(dimensions.height, `${path}.dimensionsM.height`),
      },
      collisionClass,
      shadowPolicy,
      lodEligible: asBoolean(asset.lodEligible, `${path}.lodEligible`),
      ...(semanticClass ? { semanticClass: semanticClass as NonNullable<RuntimeAssetRegistryEntry["semanticClass"]> } : {}),
      ...(runtime ? { runtime } : {}),
      ...(transform ? { transform } : {}),
    };
    assetById.set(id, parsed);
    return parsed;
  });

  const dressingClustersRaw = optionalArray(obj.dressingClusters, `${source}.dressingClusters`);
  const anchorById = new Map<string, string>();
  if (dressingClustersRaw) {
    if (!Array.isArray(obj.anchors)) failParse(`${source}.anchors`, "expected array for dressing cluster references");
    obj.anchors.forEach((anchorRaw, index) => {
      const anchor = asObject(anchorRaw, `${source}.anchors[${index}]`);
      const id = asString(anchor.id, `${source}.anchors[${index}].id`);
      if (anchorById.has(id)) failParse(`${source}.anchors[${index}].id`, `duplicate anchor id '${id}'`);
      anchorById.set(id, asString(anchor.zone, `${source}.anchors[${index}].zone`));
    });
  }
  const clusterIds = new Set<string>();
  const dressingClusters: RuntimeDressingCluster[] | undefined = dressingClustersRaw?.map((clusterRaw, index) => {
    const path = `${source}.dressingClusters[${index}]`;
    const cluster = asObject(clusterRaw, path);
    const id = asString(cluster.id, `${path}.id`);
    if (clusterIds.has(id)) failParse(`${path}.id`, `duplicate dressing cluster id '${id}'`);
    clusterIds.add(id);
    const zoneId = asString(cluster.zoneId, `${path}.zoneId`);
    if (!zoneIds.has(zoneId)) failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    const surfaceId = typeof cluster.surfaceId === "undefined"
      ? undefined
      : asString(cluster.surfaceId, `${path}.surfaceId`);
    if (surfaceId) {
      const surface = surfaceById.get(surfaceId);
      if (!surface) failParse(`${path}.surfaceId`, `unknown surface '${surfaceId}'`);
      if (surface.zoneId !== zoneId) failParse(path, "zone and surface must belong together");
    }
    const districtId = typeof cluster.districtId === "undefined"
      ? undefined
      : asString(cluster.districtId, `${path}.districtId`);
    if (districtId && !districtIds.has(districtId)) {
      failParse(`${path}.districtId`, `unknown district '${districtId}'`);
    }
    const classification = asString(cluster.classification, `${path}.classification`);
    if (classification !== "gameplay_cover" && classification !== "soft_visual" && classification !== "overhead") {
      failParse(`${path}.classification`, "expected gameplay_cover, soft_visual, or overhead");
    }
    let anchors: string[] | undefined;
    if (typeof cluster.anchors !== "undefined") {
      if (!Array.isArray(cluster.anchors)) failParse(`${path}.anchors`, "expected array");
      const seenAnchorIds = new Set<string>();
      anchors = cluster.anchors.map((anchorIdRaw, anchorIndex) => {
        const anchorId = asString(anchorIdRaw, `${path}.anchors[${anchorIndex}]`);
        const anchorZoneId = anchorById.get(anchorId);
        if (!anchorZoneId) failParse(`${path}.anchors[${anchorIndex}]`, `unknown anchor '${anchorId}'`);
        if (anchorZoneId !== zoneId) failParse(`${path}.anchors[${anchorIndex}]`, "anchor belongs to another zone");
        if (seenAnchorIds.has(anchorId)) failParse(`${path}.anchors[${anchorIndex}]`, "duplicate anchor reference");
        seenAnchorIds.add(anchorId);
        return anchorId;
      });
    }
    let assetIds: string[] | undefined;
    if (typeof cluster.assetIds !== "undefined") {
      if (!Array.isArray(cluster.assetIds) || cluster.assetIds.length === 0) {
        failParse(`${path}.assetIds`, "expected non-empty array");
      }
      const seenAssetIds = new Set<string>();
      assetIds = cluster.assetIds.map((assetIdRaw, assetIndex) => {
        const assetId = asString(assetIdRaw, `${path}.assetIds[${assetIndex}]`);
        if (!assetById.has(assetId)) failParse(`${path}.assetIds[${assetIndex}]`, `unknown asset '${assetId}'`);
        if (seenAssetIds.has(assetId)) failParse(`${path}.assetIds[${assetIndex}]`, "duplicate asset reference");
        seenAssetIds.add(assetId);
        return assetId;
      });
      const assets = assetIds.map((assetId) => assetById.get(assetId)!);
      if (classification === "gameplay_cover" && !assets.some((asset) => asset.collisionClass === "hard")) {
        failParse(`${path}.assetIds`, "gameplay cover requires a hard-collision asset");
      }
      if (classification === "overhead" && assets.some((asset) => asset.collisionClass !== "overhead" && asset.collisionClass !== "none")) {
        failParse(`${path}.assetIds`, "overhead cluster has incompatible collision class");
      }
      if (classification === "soft_visual" && assets.some((asset) => asset.collisionClass === "hard")) {
        failParse(`${path}.assetIds`, "soft visual cluster cannot use hard-collision assets");
      }
    } else if (assetRegistry && assetRegistry.length > 0) {
      failParse(`${path}.assetIds`, "required when assetRegistry is present");
    }
    return {
      id,
      zoneId,
      ...(surfaceId ? { surfaceId } : {}),
      ...(districtId ? { districtId } : {}),
      classification,
      ...(anchors ? { anchors } : {}),
      ...(assetIds ? { assetIds } : {}),
    };
  });

  const massingProfiles = parseRuntimeMassingProfiles(
    optionalArray(obj.massingProfiles, `${source}.massingProfiles`),
    source,
  );
  const massingById = new Map((massingProfiles ?? []).map((profile) => [profile.id, profile]));
  const facadeModules = parseRuntimeFacadeModules(
    optionalArray(obj.facadeModules, `${source}.facadeModules`),
    source,
    assetById,
  );
  const moduleById = new Map((facadeModules ?? []).map((module) => [module.id, module]));
  const facadeProfiles = parseRuntimeFacadeProfiles(
    optionalArray(obj.facadeProfiles, `${source}.facadeProfiles`),
    source,
    massingById,
    moduleById,
  );
  const profileById = new Map((facadeProfiles ?? []).map((profile) => [profile.id, profile]));
  const isV3 = /^3(?:\.|$)/.test(typeof obj.formatVersion === "string" ? obj.formatVersion : "");
  if (isV3 && (!massingProfiles?.length || !facadeModules?.length || !facadeProfiles?.length)) {
    failParse(source, "format v3 requires massingProfiles, facadeModules, and facadeProfiles");
  }
  for (const [index, frontage] of (frontages ?? []).entries()) {
    const path = `${source}.frontages[${index}]`;
    if (frontage.massingProfileId && !massingById.has(frontage.massingProfileId)) {
      failParse(`${path}.massingProfileId`, `unknown massing profile '${frontage.massingProfileId}'`);
    }
    const profile = frontage.facadeProfileId ? profileById.get(frontage.facadeProfileId) : undefined;
    if (frontage.facadeProfileId && !profile) {
      failParse(`${path}.facadeProfileId`, `unknown facade profile '${frontage.facadeProfileId}'`);
    }
    for (const [bayIndex, bay] of (frontage.bays ?? []).entries()) {
      if (!moduleById.has(bay.moduleId)) failParse(`${path}.bays[${bayIndex}].moduleId`, `unknown facade module '${bay.moduleId}'`);
      if (profile && !profile.moduleIds.includes(bay.moduleId)) {
        failParse(`${path}.bays[${bayIndex}].moduleId`, `module '${bay.moduleId}' is outside profile '${profile.id}'`);
      }
    }
    if (isV3 && (!frontage.massingProfileId || !profile || !frontage.bays?.length || !frontage.layout)) {
      failParse(path, "format v3 frontages require massingProfileId, facadeProfileId, generated bays, and layout metadata");
    }
    if (isV3 && frontage.bays?.some((bay) => (
      !bay.datumId || !bay.columnId || (bay.layoutSource !== "generated" && bay.layoutSource !== "authored")
    ))) {
      failParse(path, "format v3 frontage bays require generated or authored datum and column metadata");
    }
  }
  const architecturePlacements = parseRuntimeArchitecturePlacements(
    optionalArray(obj.architecturePlacements, `${source}.architecturePlacements`),
    source,
    zoneIds,
    districtIds,
    frontageIds,
    massingById,
    profileById,
    moduleById,
    assetById,
  );
  const dressingPlacements = parseRuntimeDressingPlacements(
    optionalArray(obj.dressingPlacements, `${source}.dressingPlacements`),
    source,
    zoneIds,
    districtIds,
    clusterIds,
    assetById,
  );
  if (isV3 && (!architecturePlacements?.length || !dressingPlacements?.length)) {
    failParse(source, "format v3 requires compiled architecturePlacements and dressingPlacements");
  }
  const sectionModels = optionalArray(obj.sectionModels, `${source}.sectionModels`)?.map((raw, index) => {
    const path = `${source}.sectionModels[${index}]`;
    const entry = asObject(raw, path);
    const zoneId = asString(entry.zoneId, `${path}.zoneId`);
    if (!zoneIds.has(zoneId)) failParse(`${path}.zoneId`, `unknown zone '${zoneId}'`);
    const sizeM = asObject(entry.sizeM, `${path}.sizeM`);
    return {
      zoneId,
      modelId: asString(entry.modelId, `${path}.modelId`),
      origin: parseVec3(entry.origin, `${path}.origin`),
      sizeM: {
        width: asPositiveNumber(sizeM.width, `${path}.sizeM.width`),
        depth: asPositiveNumber(sizeM.depth, `${path}.sizeM.depth`),
      },
      faces: (optionalArray(entry.faces, `${path}.faces`) ?? ["north", "south", "east", "west"]).map((face, i) => parseRuntimeFacadeFace(face, `${path}.faces[${i}]`)),
      materialIds: (optionalArray(entry.materialIds, `${path}.materialIds`) ?? []).map((id, i) => asString(id, `${path}.materialIds[${i}]`)),
    };
  });

  let mapCenter: RuntimeBlockoutSpec["mapCenter"];
  if (typeof obj.mapCenter !== "undefined") {
    const center = asObject(obj.mapCenter, `${source}.mapCenter`);
    mapCenter = {
      x: asNumber(center.x, `${source}.mapCenter.x`),
      y: asNumber(center.y, `${source}.mapCenter.y`),
    };
    if (!rectContainsPoint(playableBoundary, mapCenter.x, mapCenter.y)) {
      failParse(`${source}.mapCenter`, "must lie inside playable_boundary");
    }
  }

  return {
    mapId: asString(obj.mapId, `${source}.mapId`),
    ...(typeof obj.formatVersion !== "undefined"
      ? { formatVersion: asString(obj.formatVersion, `${source}.formatVersion`) }
      : {}),
    ...(mapCenter ? { mapCenter } : {}),
    playable_boundary: playableBoundary,
    defaults: {
      wall_height: asPositiveNumber(defaults.wall_height, `${source}.defaults.wall_height`),
      wall_thickness:
        typeof defaults.wall_thickness === "undefined"
          ? DEFAULT_WALL_THICKNESS_M
          : asPositiveNumber(defaults.wall_thickness, `${source}.defaults.wall_thickness`),
      ceiling_height: asPositiveNumber(defaults.ceiling_height, `${source}.defaults.ceiling_height`),
      floor_height: asNumber(defaults.floor_height, `${source}.defaults.floor_height`),
    },
    wall_details: parseWallDetailOptions(obj.wall_details, `${source}.wall_details`),
    zones,
    exterior_wall_patches,
    ...(districts ? { districts } : {}),
    ...(traversalSurfaces ? { traversalSurfaces } : {}),
    ...(tacticalLanes ? { tacticalLanes } : {}),
    ...(explicitConnectivity ? { explicitConnectivity } : {}),
    ...(authoredSpawns ? { authoredSpawns } : {}),
    ...(frontages ? { frontages } : {}),
    ...(massingProfiles ? { massingProfiles } : {}),
    ...(facadeModules ? { facadeModules } : {}),
    ...(facadeProfiles ? { facadeProfiles } : {}),
    ...(architecturePlacements ? { architecturePlacements } : {}),
    ...(sectionModels ? { sectionModels } : {}),
    ...(assetRegistry ? { assetRegistry } : {}),
    ...(dressingClusters ? { dressingClusters } : {}),
    ...(dressingPlacements ? { dressingPlacements } : {}),
    constraints: {
      min_path_width_main_lane: asPositiveNumber(
        constraints.min_path_width_main_lane,
        `${source}.constraints.min_path_width_main_lane`,
      ),
      min_path_width_side_halls: asPositiveNumber(
        constraints.min_path_width_side_halls,
        `${source}.constraints.min_path_width_side_halls`,
      ),
    },
  };
}

export function parseAnchorsSpec(value: unknown, source = "map_spec.json"): RuntimeAnchorsSpec {
  const obj = asObject(value, source);
  const anchorsRaw = obj.anchors;
  if (!Array.isArray(anchorsRaw)) {
    failParse(source, "anchors must be an array");
  }

  const anchors = anchorsRaw.map((anchorRaw, index) => {
    const anchor = asObject(anchorRaw, `${source}.anchors[${index}]`);
    const out: RuntimeAnchor = {
      id: asString(anchor.id, `${source}.anchors[${index}].id`),
      type: asString(anchor.type, `${source}.anchors[${index}].type`),
      zone: asString(anchor.zone, `${source}.anchors[${index}].zone`),
      pos: parseVec3(anchor.pos, `${source}.anchors[${index}].pos`),
    };

    if (typeof anchor.yawDeg !== "undefined") {
      out.yawDeg = asNumber(anchor.yawDeg, `${source}.anchors[${index}].yawDeg`);
    }
    if (typeof anchor.endPos !== "undefined") {
      out.endPos = parseVec3(anchor.endPos, `${source}.anchors[${index}].endPos`);
    }
    if (typeof anchor.widthM !== "undefined") {
      out.widthM = asPositiveNumber(anchor.widthM, `${source}.anchors[${index}].widthM`);
    }
    if (typeof anchor.heightM !== "undefined") {
      out.heightM = asPositiveNumber(anchor.heightM, `${source}.anchors[${index}].heightM`);
    }
    if (typeof anchor.frontageId !== "undefined") {
      out.frontageId = asString(anchor.frontageId, `${source}.anchors[${index}].frontageId`);
      out.along = asNumber(anchor.along, `${source}.anchors[${index}].along`);
      if (out.along < 0 || out.along > 1) failParse(`${source}.anchors[${index}].along`, "expected number between 0 and 1");
    }
    if (typeof anchor.servedBayId !== "undefined") {
      out.servedBayId = asString(anchor.servedBayId, `${source}.anchors[${index}].servedBayId`);
    }
    if (typeof anchor.notes !== "undefined") {
      out.notes = asString(anchor.notes, `${source}.anchors[${index}].notes`);
    }

    return out;
  });

  return {
    mapId: asString(obj.mapId, `${source}.mapId`),
    anchors,
  };
}

export function parseShotsSpec(value: unknown, source = "shots.json"): RuntimeShotsSpec {
  const obj = asObject(value, source);
  const shotsRaw = obj.shots;
  if (!Array.isArray(shotsRaw) || shotsRaw.length === 0) {
    failParse(source, "shots must be a non-empty array");
  }

  const shots = shotsRaw.map((shotRaw, index) => {
    const shot = asObject(shotRaw, `${source}.shots[${index}]`);
    const camera = asObject(shot.camera, `${source}.shots[${index}].camera`);

    return {
      id: asString(shot.id, `${source}.shots[${index}].id`),
      label: asString(shot.label, `${source}.shots[${index}].label`),
      description: asString(shot.description, `${source}.shots[${index}].description`),
      camera: {
        pos: parseVec3(camera.pos, `${source}.shots[${index}].camera.pos`),
        lookAt: parseVec3(camera.lookAt, `${source}.shots[${index}].camera.lookAt`),
        fovDeg: asPositiveNumber(camera.fovDeg, `${source}.shots[${index}].camera.fovDeg`),
      },
      ...(typeof shot.durationSec !== "undefined"
        ? { durationSec: asPositiveNumber(shot.durationSec, `${source}.shots[${index}].durationSec`) }
        : {}),
      ...(typeof shot.tags !== "undefined"
        ? { tags: asStringArray(shot.tags, `${source}.shots[${index}].tags`) }
        : {}),
    };
  });

  const metadataRaw = obj.metadata;
  const metadata = metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
    ? (metadataRaw as Record<string, unknown>)
    : {};

  let aliases: RuntimeShotsSpec["aliases"] | undefined;
  if (typeof obj.aliases !== "undefined") {
    const aliasObj = asObject(obj.aliases, `${source}.aliases`);
    aliases = {
      ...(typeof aliasObj.compare !== "undefined"
        ? { compare: asString(aliasObj.compare, `${source}.aliases.compare`) }
        : {}),
    };
  }

  return {
    metadata,
    ...(aliases ? { aliases } : {}),
    shots,
  };
}
