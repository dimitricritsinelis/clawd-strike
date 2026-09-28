type FacadeFamily = "merchant" | "residential" | "service" | "spawn";
type FacadeTrimTier = "restrained" | "accented" | "hero";
type BalconyStyle = "none" | "merchant_ledge" | "residential_parapet" | "hero_cantilever";
export type FacadeFace = "north" | "south" | "east" | "west";

type FacadeMaterialSlots = {
  wall: string;
  trimHeavy: string;
  trimLight: string;
  balcony: string | null;
};

export type FacadeSegmentFrame = {
  centerX: number;
  centerZ: number;
  inwardX: number;
  inwardZ: number;
};

type ZoneRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ZoneLike = {
  id: string;
  type: string;
  rect: ZoneRect;
  facadeProfileId?: string;
} | null;

export type ResolvedFacadeStyle = {
  family: FacadeFamily;
  trimTier: FacadeTrimTier;
  balconyStyle: BalconyStyle;
  materials: FacadeMaterialSlots;
};

const SHADED_TIMBER_MATERIAL_ID = "ph_rough_pine_door";

function withWallVariant(
  materials: FacadeMaterialSlots,
  wall: string,
): FacadeMaterialSlots {
  return {
    ...materials,
    wall,
  };
}

// V3 uses a deliberately small material grammar.
const V3_SLOT_LIMESTONE: FacadeMaterialSlots = {
  wall: "ph_sandstone_blocks_05",
  trimHeavy: "ph_trim_sanded_01",
  trimLight: "ph_band_lime_soft",
  balcony: null,
};

const V3_SLOT_MERCHANT_LIME: FacadeMaterialSlots = {
  ...V3_SLOT_LIMESTONE,
  wall: "ph_lime_plaster_sun",
  balcony: SHADED_TIMBER_MATERIAL_ID,
};

const V3_SLOT_RESIDENTIAL_DUSTY: FacadeMaterialSlots = {
  ...V3_SLOT_LIMESTONE,
  wall: "ph_whitewashed_brick_dusty",
  balcony: SHADED_TIMBER_MATERIAL_ID,
};

const V3_SLOT_SERVICE_STONE: FacadeMaterialSlots = {
  ...V3_SLOT_LIMESTONE,
  wall: "ph_sandstone_blocks_06",
};

const V3_SLOT_OCHRE: FacadeMaterialSlots = {
  wall: "ph_aged_plaster_ochre",
  trimHeavy: "ph_trim_sanded_01",
  trimLight: "ph_band_lime_soft",
  balcony: SHADED_TIMBER_MATERIAL_ID,
};

function isVerticalFacade(frame: FacadeSegmentFrame): boolean {
  return Math.abs(frame.inwardX) > Math.abs(frame.inwardZ);
}

export function resolveFacadeFaceForSegment(zone: ZoneLike, frame: FacadeSegmentFrame): FacadeFace {
  const { x: zoneCenterX, z: zoneCenterZ } = getZoneCenter(zone);
  if (isVerticalFacade(frame)) {
    return frame.centerX < zoneCenterX ? "west" : "east";
  }
  return frame.centerZ < zoneCenterZ ? "south" : "north";
}

function getZoneCenter(zone: ZoneLike): { x: number; z: number } {
  if (!zone) {
    return { x: 0, z: 0 };
  }
  return {
    x: zone.rect.x + zone.rect.w * 0.5,
    z: zone.rect.y + zone.rect.h * 0.5,
  };
}

function selectProfileVariant(zoneId: string, face: FacadeFace): boolean {
  let hash = 0;
  const key = `${zoneId}:${face}`;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return (hash & 1) === 0;
}

function resolveProfiledFacadeStyle(
  zone: NonNullable<ZoneLike>,
  frame: FacadeSegmentFrame,
  authoredProfile?: RuntimeFacadeProfile,
): ResolvedFacadeStyle | null {
  const profile = zone.facadeProfileId;
  if (!profile) return null;

  const face = resolveFacadeFaceForSegment(zone, frame);
  const alternate = selectProfileVariant(zone.id, face);
  const family = authoredProfile?.family ?? profile;
  const authoredMaterials: FacadeMaterialSlots | null = authoredProfile
    ? {
        wall: authoredProfile.materialSlots.wall,
        trimHeavy: authoredProfile.materialSlots.trim,
        trimLight: authoredProfile.materialSlots.trim,
        balcony: authoredProfile.family === "service_storage" || authoredProfile.family === "covered_arcade"
          ? null
          : authoredProfile.materialSlots.timber,
      }
    : null;
  switch (family) {
    case "active_merchant":
      {
        const materials = authoredMaterials ?? V3_SLOT_MERCHANT_LIME;
      return {
        family: "merchant",
        trimTier: "accented",
        balconyStyle: "merchant_ledge",
        materials: alternate ? materials : withWallVariant(materials, "ph_worn_plaster_sun"),
      };
      }
    case "hero_courtyard":
      if (zone.type === "spawn_plaza") {
        const isHorizontalFace = face === "north" || face === "south";
        const materials = authoredMaterials ?? V3_SLOT_LIMESTONE;
        return {
          family: "spawn",
          trimTier: isHorizontalFace ? "hero" : "accented",
          balconyStyle: isHorizontalFace ? "hero_cantilever" : "residential_parapet",
          materials: alternate ? materials : withWallVariant(materials, "ph_sandstone_blocks_06"),
        };
      }
      {
        const materials = authoredMaterials ?? V3_SLOT_LIMESTONE;
      return {
        family: "merchant",
        trimTier: "hero",
        balconyStyle: "hero_cantilever",
        materials: alternate ? materials : withWallVariant(materials, "ph_sandstone_blocks_06"),
      };
      }
    case "quiet_residential":
      {
        const materials = authoredMaterials ?? V3_SLOT_RESIDENTIAL_DUSTY;
      return {
        family: "residential",
        trimTier: alternate ? "restrained" : "accented",
        balconyStyle: "residential_parapet",
        materials: alternate ? materials : withWallVariant(materials, "ph_whitewashed_brick_warm"),
      };
      }
    case "covered_arcade":
      {
        const materials = authoredMaterials ?? V3_SLOT_OCHRE;
      return {
        family: "merchant",
        trimTier: "accented",
        balconyStyle: "none",
        materials: alternate ? materials : withWallVariant(materials, "ph_worn_plaster_ochre"),
      };
      }
    case "service_storage":
    case "sealed_perimeter":
      {
        const materials = authoredMaterials ?? V3_SLOT_SERVICE_STONE;
      return {
        family: "service",
        trimTier: "restrained",
        balconyStyle: "none",
        materials: alternate ? materials : withWallVariant(materials, "ph_sandstone_blocks_05"),
      };
      }
    default:
      return null;
  }
}

export function resolveFacadeStyleForSegment(
  zone: NonNullable<ZoneLike>,
  frame: FacadeSegmentFrame,
  authoredProfile?: RuntimeFacadeProfile,
): ResolvedFacadeStyle {
  const style = resolveProfiledFacadeStyle(zone, frame, authoredProfile);
  if (!style) {
    throw new Error(`[wall materials] zone '${zone.id}' has no supported facade profile`);
  }
  return style;
}

import type { RuntimeFacadeProfile } from "./types";
