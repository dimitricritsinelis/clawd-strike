import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DoubleSide, Mesh, MeshStandardMaterial, Raycaster, Vector3, type InstancedMesh } from "three";
import { createArchSpandrelGeometry, createOpenBottomArchRecessGeometry, createOpenBottomPointedArchFrameGeometry } from "./wallDetailFamilies/arches";
import type { WallMaterialLibrary } from "../render/materials/WallMaterialLibrary";
import { buildWallDetailMeshes, type WallDetailInstance } from "./wallDetailKit";
import {
  buildV3Architecture,
  type V3ArchitectureMassingPlacement,
  type V3ArchitecturePlacement,
  type V3FacadeProfile,
  type V3MassingProfile,
} from "./v3Architecture";
import { parseBlockoutSpec, type RuntimeBlockoutZone } from "./types";

const massingProfiles: V3MassingProfile[] = [
  {
    id: "mass_mid",
    label: "Mid",
    heightM: 7,
    depthM: 3,
    roofStyle: "flat_parapet",
    roofSetbackM: 0,
    parapetHeightM: 0.42,
    upperStorySetbackM: 0,
  },
];

const materialSlots = {
  wall: "ph_lime_plaster_sun",
  trim: "ph_trim_sanded_01",
  roof: "ph_aged_plaster_ochre",
  timber: "ph_rough_pine_door",
  metal: "ph_trim_sanded_01",
  accent: "ph_band_lime_soft",
};

// Render-only segmented shells stop 2 cm short of each authored edge to avoid
// coplanar z-fighting. Authored dimensions remain available in visualQaDimensions.
const SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M = 0.02;

const facadeProfiles: V3FacadeProfile[] = [
  {
    id: "active_merchant",
    label: "Merchant",
    family: "active_merchant",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: [
      "shop_recess_market",
      "door_shop_timber",
      "door_fortified_gate",
      "window_shuttered",
      "window_screened",
      "vent_service",
      "arch_arcade",
      "column_arcade",
      "blind_niche",
    ],
  },
  {
    id: "quiet_residential",
    label: "Residential",
    family: "quiet_residential",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: ["door_residential_timber", "window_screened", "window_dark_recess", "blind_niche"],
  },
  {
    id: "service_storage",
    label: "Service",
    family: "service_storage",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: ["door_storage_heavy", "vent_service", "blind_niche"],
  },
  {
    id: "hero_courtyard",
    label: "Hero courtyard",
    family: "hero_courtyard",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: [
      "arch_hero_courtyard",
      "door_residential_timber",
      "window_screened",
      "window_landmark_stained",
      "blind_niche",
    ],
  },
];

const zones: RuntimeBlockoutZone[] = [{
  id: "ARBITRARY_ZONE_ID",
  type: "side_hall",
  rect: { x: 10, y: 10, w: 8, h: 12 },
  label: "Authored side-lane frontage",
  notes: "Profile—not zone id—owns the architecture.",
  facadeProfileId: "active_merchant",
}];

function massingPlacement(
  profileId = "active_merchant",
  id = "ARCH_MASSING_001",
  options: {
    heightM?: number;
    roofStyle?: "flat_parapet" | "setback_flat";
    roofSetbackM?: number;
    upperStorySetbackM?: number;
  } = {},
): V3ArchitecturePlacement {
  const heightM = options.heightM ?? 7;
  return {
    id,
    kind: "massing",
    frontageId: "FRONTAGE_001",
    zoneId: "ARBITRARY_ZONE_ID",
    face: "west",
    profileId,
    massingProfileId: "mass_mid",
    center: { x: 8.5, y: 16, z: heightM * 0.5 },
    sizeM: { width: 10, depth: 3, height: heightM },
    yawDeg: 90,
    materialSlots,
    roof: {
      style: options.roofStyle ?? "flat_parapet",
      setbackM: options.roofSetbackM ?? 0,
      parapetHeightM: 0.42,
      upperStorySetbackM: options.upperStorySetbackM ?? 0,
      elevationM: heightM,
    },
  };
}

function modulePlacement(
  id: string,
  moduleId: string,
  moduleKind: "shop_recess" | "door" | "window" | "vent" | "arch" | "column" | "blind_niche",
  center: { x: number; y: number; z: number },
  profileId = "active_merchant",
): V3ArchitecturePlacement {
  return {
    id,
    kind: "facade_module",
    frontageId: "FRONTAGE_001",
    zoneId: "ARBITRARY_ZONE_ID",
    face: "west",
    profileId,
    moduleId,
    moduleKind,
    openingType: moduleKind === "window" ? "window_void" : moduleKind === "door" ? "door_void" : "recess",
    datumId: center.z > 3 ? "STORY_1_SILL_3.35" : "GROUND_HEAD_2.70",
    columnId: `COLUMN_${id}`,
    layoutSource: "generated",
    center,
    sizeM: { width: moduleKind === "column" ? 0.4 : 1.4, depth: 0.16, height: moduleKind === "column" ? 3 : 2.2 },
    yawDeg: 90,
    materialSlot: moduleKind === "column" ? "trim" : "timber",
    collisionOpening: false,
  };
}

function build(
  placements: V3ArchitecturePlacement[],
  fortifiedDoorModelAvailable = true,
  experimentalVisualCutoutMassing = false,
  profiles: V3FacadeProfile[] = facadeProfiles,
) {
  return buildV3Architecture({
    placements,
    massingProfiles,
    facadeProfiles: profiles,
    segments: [{ orientation: "vertical", coord: 10, start: 10, end: 22, outward: -1 }],
    zones,
    traversalSurfaces: [],
    wallHeightM: 9.5,
    fortifiedDoorModelAvailable,
    experimentalVisualCutoutMassing,
  });
}

test("merchant storefronts override legacy flat timber/metal templates with varied PBR joinery", () => {
  const legacyProfiles = facadeProfiles.map((profile) => profile.family === "active_merchant"
    ? {
      ...profile,
      materialSlots: {
        ...profile.materialSlots,
        timber: "tm_balcony_wood_dark",
        metal: "tm_balcony_painted_metal",
      },
    }
    : profile);
  const result = build([
    massingPlacement("active_merchant", "PBR_SHOP_MASS"),
    modulePlacement("PBR_SHOP_A", "shop_recess_market", "shop_recess", { x: 10, y: 13.5, z: 1.35 }),
    modulePlacement("PBR_SHOP_B", "shop_recess_market", "shop_recess", { x: 10, y: 16.5, z: 1.35 }),
    modulePlacement("PBR_SHOP_WINDOW", "window_shuttered", "window", { x: 10, y: 13.5, z: 4.3 }),
  ], true, true, legacyProfiles);

  const merchantJoinery = result.instances.filter((instance) => (
    instance.semanticClass?.startsWith("merchant_")
    || instance.semanticClass?.startsWith("active_merchant_")
    || instance.semanticClass?.startsWith("canopy_")
  ));
  assert.ok(merchantJoinery.length > 0);
  assert.equal(
    merchantJoinery.some((instance) => (
      instance.trimMaterialId === "tm_balcony_wood_dark"
      || instance.detailMaterialId === "tm_balcony_wood_dark"
      || instance.detailMaterialId === "tm_balcony_painted_metal"
    )),
    false,
    "merchant construction leaked a flat legacy material template",
  );
  assert.ok(merchantJoinery.some((instance) => (
    instance.trimMaterialId?.startsWith("ph_")
    || instance.detailMaterialId?.startsWith("ph_")
  )), "merchant construction lost its manifest-backed PBR joinery");
  // The struts and their fixings are deliberately timber, not iron: on the
  // metal role they reflected the sky as pale galvanised pipe. They must carry
  // the manifest-backed merchant timber id, bypassing the profile's (possibly
  // legacy) timber slot entirely.
  assert.ok(
    result.instances
      .filter((instance) => instance.moduleId === "awning_support_pole")
      .every((instance) => instance.detailMaterialId === "ph_worn_planks"),
    "awning hardware bypassed the manifest-backed merchant timber role",
  );

  const shopTints = new Set(
    result.instances
      .filter((instance) => instance.semanticClass === "merchant_timber_surround")
      .map((instance) => instance.detailTintHex),
  );
  assert.ok(shopTints.size >= 2, "neighboring served shops lost deterministic joinery separation");
  const shutterSignatures = new Set(
    result.instances
      .filter((instance) => instance.semanticClass === "merchant_louvered_shutter")
      .map((instance) => `${instance.scale.x}:${instance.yawRad.toFixed(3)}:${instance.detailTintHex}`),
  );
  assert.ok(shutterSignatures.size >= 3, "neighboring shutter states collapsed into one repeated silhouette");
  const counterWidths = new Set(
    result.instances
      .filter((instance) => instance.semanticClass === "merchant_counter")
      .map((instance) => instance.scale.x.toFixed(4)),
  );
  const shelfWidths = new Set(
    result.instances
      .filter((instance) => instance.semanticClass === "merchant_interior_shelf")
      .map((instance) => instance.scale.x.toFixed(4)),
  );
  const valanceHeights = new Set(
    result.instances
      .filter((instance) => instance.semanticClass === "canopy_valance")
      .map((instance) => instance.scale.y.toFixed(4)),
  );
  assert.ok(counterWidths.size >= 2, "neighboring served counters lost seeded width separation");
  assert.ok(shelfWidths.size >= 2, "neighboring served shelves lost seeded width separation");
  assert.ok(valanceHeights.size >= 2, "neighboring served awning edges collapsed into one silhouette");
  const foregroundStock = result.instances.filter((instance) => (
    instance.semanticClass === "merchant_generic_counter_stock"
  ));
  assert.ok(foregroundStock.length >= 4, "served merchant counters lost their visible generic occupied-market baseline");
  assert.ok(
    new Set(foregroundStock.map((instance) => `${instance.meshId}:${instance.scale.x}:${instance.detailTintHex}`)).size >= 3,
    "foreground merchant stock collapsed into one readable repeat",
  );
});

test("Rug Gate threshold awnings derive separated east/west silhouettes from their served openings", () => {
  const east = {
    ...modulePlacement(
      "ARCH_FRONTAGE_RUG_GATE_EAST_GROUND_01",
      "shop_recess_market",
      "shop_recess",
      { x: 10, y: 14, z: 1.35 },
    ),
    frontageId: "FRONTAGE_RUG_GATE_EAST",
    zoneId: "RUG_GATE",
  };
  const west = {
    ...modulePlacement(
      "ARCH_FRONTAGE_RUG_GATE_WEST_GROUND_02",
      "shop_recess_market",
      "shop_recess",
      { x: 10, y: 18, z: 1.35 },
    ),
    frontageId: "FRONTAGE_RUG_GATE_WEST",
    zoneId: "RUG_GATE",
  };
  const result = build([massingPlacement(), east, west], true, true);
  const eastAwning = result.instances.find((instance) => instance.placementId === `${east.id}:awning`);
  const westAwning = result.instances.find((instance) => instance.placementId === `${west.id}:awning`);
  const eastValance = result.instances.find((instance) => instance.placementId === `${east.id}:awning-valance`);
  const westValance = result.instances.find((instance) => instance.placementId === `${west.id}:awning-valance`);
  assert.ok(eastAwning && westAwning && eastValance && westValance);
  assert.ok(eastAwning.scale.z >= westAwning.scale.z + 0.3, "threshold frontage roles lost their canopy-depth separation");
  assert.ok(eastValance.scale.y >= westValance.scale.y + 0.08, "threshold frontage roles lost their eave silhouette separation");
  assert.equal(typeof eastAwning.detailTintHex, "number");
  assert.equal(typeof westAwning.detailTintHex, "number");
  assert.notEqual(westAwning.detailTintHex, eastAwning.detailTintHex);
  assert.ok(Math.abs(eastAwning.scale.x - westAwning.scale.x) < 0.2, "served-opening width stopped governing threshold hoods");
});

test("covered-arcade ground openings derive generic occupied counters from their sill datum", () => {
  const coveredProfile: V3FacadeProfile = {
    ...facadeProfiles[0]!,
    id: "covered_arcade",
    label: "Covered arcade",
    family: "covered_arcade",
  };
  const groundWindow = modulePlacement(
    "COVERED_GROUND_MARKET_WINDOW",
    "window_screened",
    "window",
    { x: 10, y: 16, z: 1.4 },
    "covered_arcade",
  );
  groundWindow.sizeM = { width: 1.5, depth: 0.24, height: 2.2 };
  const upperWindow = modulePlacement(
    "COVERED_UPPER_WINDOW_NO_MARKET",
    "window_screened",
    "window",
    { x: 10, y: 18, z: 4.5 },
    "covered_arcade",
  );
  const result = build([groundWindow, upperWindow], true, true, [coveredProfile]);
  const counters = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_generic_merchant_counter"
  ));
  const shelves = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_generic_merchant_shelf"
  ));
  const stock = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_generic_merchant_stock"
  ));
  const groundAwning = result.instances.find((instance) => (
    instance.placementId === `${groundWindow.id}:awning`
  ));
  const groundSupports = result.instances.filter((instance) => (
    instance.placementId?.startsWith(`${groundWindow.id}:awning-pole:`)
  ));
  assert.equal(counters.length, 2, "ground served opening needs one counter front and one top");
  assert.equal(shelves.length, 1, "ground served opening needs one shop-depth shelf");
  assert.equal(stock.length, 2, "ground served opening needs visible generic counter stock");
  assert.ok(groundAwning, "served covered-arcade opening lost its opening-derived rain hood");
  assert.ok(
    Math.abs((groundAwning?.scale.x ?? 0) - groundWindow.sizeM.width) <= 0.25,
    "served rain hood stopped deriving its width from the opening",
  );
  assert.equal(groundSupports.length, 2, "served rain hood lost its two opening-edge braces");
  assert.ok(counters.every((instance) => instance.placementId?.startsWith(groundWindow.id)));
  assert.equal(
    result.instances.some((instance) => instance.placementId?.startsWith(`${upperWindow.id}:arcade-counter`)),
    false,
    "upper story window incorrectly received a market counter",
  );
  assert.equal("colliders" in result, false, "render-only market sill changed gameplay authority");
});

test("covered-arcade massing returns derive aligned lower niches and upper screens from shared story datums", () => {
  const coveredProfile: V3FacadeProfile = {
    ...facadeProfiles[0]!,
    id: "covered_arcade",
    label: "Covered arcade",
    family: "covered_arcade",
  };
  const placement = massingPlacement("covered_arcade", "COVERED_RETURN_GRAMMAR", { heightM: 7 });
  placement.sizeM = { width: 5.72, depth: 4.8, height: 7 };
  const result = build([placement], true, true, [coveredProfile]);
  const niches = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_return_blind_niche"
  ));
  const screens = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_return_screen"
  ));
  const contactCourses = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_return_grounding"
  ));
  const variedClosures = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_return_varied_closure"
  ));
  const marketCounters = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_return_generic_merchant_counter"
  ));
  const marketStock = result.instances.filter((instance) => (
    instance.semanticClass === "covered_arcade_return_generic_merchant_stock"
  ));

  assert.equal(niches.length, 4, "two grammar bays per short return drifted");
  assert.equal(screens.length, 4, "upper screens stopped aligning above the return niches");
  assert.equal(contactCourses.length, 2, "one grounded contact course is required per return");
  assert.equal(variedClosures.length, 8, "each lower return bay needs two varied closed shutters");
  assert.equal(marketCounters.length, 8, "each served lower return bay needs a counter front and top");
  assert.equal(marketStock.length, 8, "each served lower return bay needs two generic display pieces");
  assert.ok(marketCounters.every((instance) => instance.backingPlacementId === placement.id));
  assert.ok(marketStock.every((instance) => instance.structurallyBacked));
  assert.equal(new Set(variedClosures.map((instance) => (
    `${instance.scale.x.toFixed(4)}:${instance.yawRad.toFixed(4)}:${instance.detailTintHex}`
  ))).size, variedClosures.length, "return closure assemblies repeated visibly");
  assert.ok(niches.every((instance) => Math.abs(instance.position.y - 1.66) <= 0.001));
  assert.ok(screens.every((instance) => Math.abs(instance.position.y - 4.825) <= 0.001));
  assert.ok(niches.every((instance) => instance.backingPlacementId === placement.id));
  assert.ok(
    screens.every((instance) => instance.detailMaterialId?.startsWith("ph_")),
    "covered-arcade screens left the manifest-backed timber family",
  );
  assert.equal("colliders" in result, false, "render-only return relief changed gameplay authority");
});

test("adjacent massings keep one material identity within each building and distinct tints between buildings", () => {
  const left = massingPlacement("active_merchant", "IDENTITY_BUILDING_LEFT");
  const right = massingPlacement("active_merchant", "IDENTITY_BUILDING_RIGHT");
  const result = build([left, right]);
  const shells = result.instances.filter((instance) => instance.semanticClass === "closed_massing");
  assert.equal(shells.length, 2);
  assert.ok(shells.every((instance) => typeof instance.detailTintHex === "number"));
  assert.notEqual(shells[0]?.detailTintHex, shells[1]?.detailTintHex, "adjacent wall material+tint keys collapsed");
  for (const shell of shells) {
    const roofs = result.instances.filter((instance) => (
      instance.placementId?.startsWith(`${shell.placementId}:roof`)
      && instance.semanticClass === "supported_roof"
    ));
    assert.ok(roofs.length >= 1);
    assert.ok(roofs.every((instance) => typeof instance.detailTintHex === "number"));
  }
});

test("merchant short returns derive blind bays and upper screens from one story and bay grammar", () => {
  const placement = massingPlacement("active_merchant", "MERCHANT_RETURN_IDENTITY", { heightM: 7 });
  if (placement.kind !== "massing") throw new Error("fixture drift");
  placement.sizeM = { width: 8, depth: 6, height: 7 };
  const result = build([placement], true, true);
  const groundPanels = result.instances.filter((instance) => (
    instance.semanticClass === "active_merchant_return_structural_blind_bay"
  ));
  const storyCourses = result.instances.filter((instance) => (
    instance.semanticClass === "active_merchant_return_story_datum"
  ));
  const upperRecesses = result.instances.filter((instance) => (
    instance.semanticClass === "active_merchant_return_upper_blind_recess"
  ));
  const upperScreens = result.instances.filter((instance) => (
    instance.semanticClass === "active_merchant_return_upper_screen"
  ));
  const terminalArrises = result.instances.filter((instance) => (
    instance.semanticClass === "active_merchant_return_terminal_arris"
  ));
  assert.equal(groundPanels.length, 6, "three equal-pitch bays are required on each six-metre return");
  assert.equal(storyCourses.length, 2, "both returns need the same story transition datum");
  assert.equal(upperRecesses.length, 6, "upper blind screens stopped aligning over lower structural bays");
  assert.ok(upperScreens.length >= 24, "seeded upper screen density lost its readable construction");
  assert.equal(terminalArrises.length, 4, "each return lost one of its two derived terminal arrises");
  assert.ok(groundPanels.every((instance) => instance.backingPlacementId === placement.id));
  assert.ok(upperScreens.every((instance) => instance.structurallyBacked));
  assert.ok(storyCourses.every((instance) => instance.scale.x > 5.5), "story datum stopped short of the terminal arrises");
  assert.equal(new Set(storyCourses.map((instance) => instance.position.y)).size, 1);
  assert.equal(new Set(groundPanels.map((instance) => instance.detailTintHex)).size, groundPanels.length);
  assert.equal("colliders" in result, false, "render-only return identity changed gameplay authority");
});

test("Dyers service returns use the same bounded structural bay grammar instead of blank planes", () => {
  const placement = massingPlacement("service_storage", "DYERS_SERVICE_RETURN_IDENTITY", { heightM: 7 });
  if (placement.kind !== "massing") throw new Error("fixture drift");
  placement.sizeM = { width: 17.24, depth: 4.8, height: 7 };
  const result = build([placement], true, true);
  const groundPanels = result.instances.filter((instance) => (
    instance.semanticClass === "service_storage_return_structural_blind_bay"
  ));
  const upperRecesses = result.instances.filter((instance) => (
    instance.semanticClass === "service_storage_return_upper_blind_recess"
  ));
  const storyCourses = result.instances.filter((instance) => (
    instance.semanticClass === "service_storage_return_story_datum"
  ));
  const backPanels = result.instances.filter((instance) => (
    instance.semanticClass === "service_storage_back_structural_blind_bay"
  ));
  const backScreens = result.instances.filter((instance) => (
    instance.semanticClass === "service_storage_back_upper_screen"
  ));
  assert.equal(groundPanels.length, 6, "Dyers service massing needs three fitted lower bays per short return");
  assert.equal(upperRecesses.length, 6, "Dyers upper service screens lost the lower-bay centerlines");
  assert.equal(storyCourses.length, 2, "Dyers side faces stopped sharing the story transition datum");
  assert.equal(backPanels.length, 4, "the named Dyers structural back span regained a blank plane");
  assert.ok(backScreens.length >= 16, "the Dyers back-span upper closure lost seeded screen variation");
  assert.ok(groundPanels.every((instance) => instance.backingPlacementId === placement.id));
  assert.ok(backPanels.every((instance) => instance.backingPlacementId === placement.id));
  assert.equal("colliders" in result, false, "Dyers return relief changed gameplay authority");
});

test("facade story courses derive from authored heads and sills and never invent upper openings", () => {
  const residentialMassing = massingPlacement("quiet_residential", "RESIDENTIAL_DATUM_GRAMMAR", { heightM: 4.5 });
  residentialMassing.sizeM = { width: 10, depth: 3, height: 4.5 };
  const residentialGround = [12.5, 16, 19.5].map((designY, index) => modulePlacement(
    `RESIDENTIAL_GROUND_${index + 1}`,
    index === 1 ? "blind_niche" : "door_residential_timber",
    index === 1 ? "blind_niche" : "door",
    { x: 10, y: designY, z: 1.125 },
    "quiet_residential",
  ));
  for (const module of residentialGround) {
    module.sizeM = { width: 1.05, depth: 0.2, height: 2.25 };
  }
  const residential = build([residentialMassing, ...residentialGround], true, true);
  const residentialCourse = residential.instances.find((instance) => (
    instance.semanticClass === "quiet_residential_story_transition_course"
  ));
  const inventedUppers = residential.instances.filter((instance) => (
    instance.semanticClass?.startsWith("quiet_residential_upper_blind_")
    || instance.semanticClass === "quiet_residential_varied_upper_closure"
  ));

  assert.ok(residentialCourse, "shared ground head did not emit a story-transition course");
  assert.ok(Math.abs(residentialCourse.position.y - 2.55) <= 0.001);
  assert.equal(residentialCourse.scale.x, 9.3, "story course stopped respecting derived edge margins");
  assert.equal(inventedUppers.length, 0, "a frontage with no STORY_ placements grew runtime-invented upper openings");
  assert.equal("colliders" in residential, false, "render-only facade relief changed gameplay authority");

  const coveredProfile: V3FacadeProfile = {
    ...facadeProfiles[0]!,
    id: "covered_arcade",
    label: "Covered arcade",
    family: "covered_arcade",
  };
  const coveredMassing = massingPlacement("covered_arcade", "COVERED_DATUM_GRAMMAR", { heightM: 7 });
  const coveredGround = modulePlacement(
    "COVERED_GROUND_ARCH",
    "arch_arcade",
    "arch",
    { x: 10, y: 16, z: 1.775 },
    "covered_arcade",
  );
  coveredGround.sizeM = { width: 2.6, depth: 0.42, height: 3.55 };
  const coveredUpper = modulePlacement(
    "COVERED_UPPER_WINDOW",
    "window_screened",
    "window",
    { x: 10, y: 16, z: 4.85 },
    "covered_arcade",
  );
  coveredUpper.sizeM = { width: 1, depth: 0.24, height: 1.4 };
  const covered = build([coveredMassing, coveredGround, coveredUpper], true, true, [coveredProfile]);
  const coveredCourse = covered.instances.find((instance) => (
    instance.semanticClass === "covered_arcade_story_transition_course"
  ));
  assert.ok(coveredCourse);
  assert.ok(Math.abs(coveredCourse.position.y - 3.85) <= 0.001, "covered story course left its authored head/sill midpoint");
  assert.equal(
    covered.instances.filter((instance) => instance.semanticClass === "quiet_residential_upper_blind_recess").length,
    0,
    "an authored upper story was obscured by residential blind relief",
  );

  const merchantMassing = massingPlacement("active_merchant", "MERCHANT_DATUM_GRAMMAR", { heightM: 7 });
  merchantMassing.sizeM = { width: 10, depth: 3, height: 7 };
  const merchantGround = modulePlacement(
    "MERCHANT_DATUM_GROUND",
    "door_shop_timber",
    "door",
    { x: 10, y: 16, z: 1.35 },
  );
  merchantGround.sizeM = { width: 1.2, depth: 0.22, height: 2.7 };
  const merchantUpper = modulePlacement(
    "MERCHANT_DATUM_UPPER",
    "window_shuttered",
    "window",
    { x: 10, y: 16, z: 4.5 },
  );
  merchantUpper.sizeM = { width: 1.1, depth: 0.2, height: 1.5 };
  const merchant = build([merchantMassing, merchantGround, merchantUpper], true, true);
  const merchantCourse = merchant.instances.find((instance) => (
    instance.semanticClass === "active_merchant_story_transition_course"
  ));
  assert.ok(merchantCourse, "merchant building identity lost its opening-derived story seam");
  assert.ok(Math.abs(merchantCourse.position.y - 3.225) <= 0.001);
  assert.equal(merchantCourse.scale.x, 9.3, "merchant story seam stopped respecting facade edge margins");
});

test("core-shot structural walls receive closed grammar bays without changing their boundary segments", () => {
  const coveredProfile: V3FacadeProfile = {
    ...facadeProfiles[0]!,
    id: "covered_arcade",
    label: "Covered arcade",
    family: "covered_arcade",
  };
  const fixtureZones: RuntimeBlockoutZone[] = [
    {
      id: "COVERED_SOUK",
      type: "side_hall",
      rect: { x: 41, y: 32, w: 12, h: 16 },
      label: "Covered Souk",
      notes: "fixture",
      facadeProfileId: "covered_arcade",
    },
    {
      id: "DYERS_DOGLEG",
      type: "side_hall",
      rect: { x: 46, y: 48, w: 7, h: 14 },
      label: "Dyers Dogleg",
      notes: "fixture",
      facadeProfileId: "quiet_residential",
    },
  ];
  const segments = [
    { orientation: "horizontal" as const, coord: 48, start: 41, end: 46, outward: 1 as const },
    { orientation: "vertical" as const, coord: 46, start: 48, end: 62, outward: -1 as const },
    { orientation: "vertical" as const, coord: 53, start: 48, end: 62, outward: 1 as const },
  ];
  const segmentSnapshot = structuredClone(segments);
  const result = buildV3Architecture({
    placements: [massingPlacement()],
    massingProfiles,
    facadeProfiles: [...facadeProfiles, coveredProfile],
    segments,
    zones: fixtureZones,
    traversalSurfaces: [],
    wallHeightM: 7,
    fortifiedDoorModelAvailable: true,
    experimentalVisualCutoutMassing: true,
  });
  const niches = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_blind_niche"
  ));
  const screens = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_upper_screen"
  ));
  const courses = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_grounding"
  ));
  const variedClosures = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_varied_closure"
  ));
  const merchantCounters = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_merchant_counter"
  ));
  const merchantStock = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_merchant_stock"
  ));
  const merchantCanopies = result.instances.filter((instance) => (
    instance.placementId?.endsWith(":served-opening:awning")
  ));
  const twoStoryDyersGate = result.instances.filter((instance) => (
    instance.moduleId === "boundary_facade_two_story_blind_gate"
  ));

  assert.deepEqual(segments, segmentSnapshot, "visual grammar mutated collision boundary authority");
  assert.equal(niches.length, 11, "the two-story Dyers gate must replace exactly one ordinary lower niche");
  assert.equal(screens.length, 11, "the two-story Dyers gate must replace exactly one ordinary upper screen");
  assert.equal(courses.length, 3, "each named structural frontage needs one continuous contact course");
  assert.equal(variedClosures.length, 22, "ordinary lower boundary bays need two varied closed shutters");
  assert.ok(
    twoStoryDyersGate.some((instance) => instance.semanticClass === "grammar_served_boundary_gate_stone_surround"),
    "the Dyers terminal gate lost its pointed masonry surround",
  );
  assert.ok(
    twoStoryDyersGate.some((instance) => instance.semanticClass === "grammar_served_boundary_gate_threshold"),
    "the Dyers terminal gate lost its grounded threshold",
  );
  assert.equal(merchantCounters.length, 4, "the two covered-souk bays need counter fronts and tops");
  assert.equal(merchantStock.length, 2, "the two covered-souk bays need varied generic stock");
  assert.equal(merchantCanopies.length, 2, "the two covered-souk bays need opening-derived supported hoods");
  assert.ok(
    merchantCanopies.every((canopy) => Math.abs(canopy.scale.x - 1.25) <= 0.25),
    "boundary market hoods stopped deriving width from their served bay",
  );
  assert.equal(new Set(variedClosures.map((instance) => (
    `${instance.scale.x.toFixed(4)}:${instance.yawRad.toFixed(4)}:${instance.detailTintHex}`
  ))).size, variedClosures.length, "structural closure assemblies repeated visibly");
  assert.ok(niches.every((instance) => Math.abs(instance.position.y - 1.635) <= 0.001));
  assert.ok(screens.every((instance) => Math.abs(instance.position.y - 4.81) <= 0.001));
  const identityPlanes = result.instances.filter((instance) => (
    instance.semanticClass === "grammar_served_boundary_wall_identity"
  ));
  assert.equal(identityPlanes.length, 3);
  assert.equal(
    identityPlanes.find((instance) => instance.placementId?.includes("DYERS_DOGLEG_WEST"))?.wallMaterialId,
    "ph_beige_wall_002",
    "opposing Dogleg buildings reused an identical material+tint",
  );
  assert.equal("colliders" in result, false);
});

test("Spice-west terminal boundary relief derives its span from the massing edge without changing collision", () => {
  const spiceZone: RuntimeBlockoutZone = {
    id: "SPICE_STREET",
    type: "main_lane_segment",
    rect: { x: 21, y: 14, w: 12, h: 18 },
    label: "Spice Street",
    notes: "fixture",
    facadeProfileId: "active_merchant",
  };
  const spiceMassing = massingPlacement("active_merchant", "ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING", { heightM: 7 });
  if (spiceMassing.kind !== "massing") throw new Error("fixture drift");
  spiceMassing.center = { x: 18.6, y: 23, z: 3.5 };
  spiceMassing.sizeM = { width: 15.12, depth: 4.8, height: 7 };
  spiceMassing.face = "west";
  spiceMassing.yawDeg = 90;
  const segments = [{ orientation: "vertical" as const, coord: 21, start: 14, end: 16, outward: -1 as const }];
  const snapshot = structuredClone(segments);
  const result = buildV3Architecture({
    placements: [spiceMassing],
    massingProfiles,
    facadeProfiles,
    segments,
    zones: [spiceZone],
    traversalSurfaces: [],
    wallHeightM: 7,
    fortifiedDoorModelAvailable: true,
    experimentalVisualCutoutMassing: true,
  });
  const lower = result.instances.filter((instance) => instance.semanticClass === "grammar_served_boundary_blind_niche");
  const upper = result.instances.filter((instance) => instance.semanticClass === "grammar_served_boundary_upper_screen");
  const arrises = result.instances.filter((instance) => instance.semanticClass === "grammar_served_boundary_terminal_arris");
  const course = result.instances.find((instance) => (
    instance.placementId === "ARCH_SPICE_STREET_WEST_TERMINAL_BOUNDARY_1:story-string-course"
  ));
  assert.deepEqual(segments, snapshot, "terminal visual relief mutated the surviving collision segment");
  assert.equal(lower.length, 1, "the derived 1.44m terminal span needs one complete lower bay");
  assert.equal(upper.length, 1, "the terminal upper screen lost the return bay centerline");
  assert.equal(arrises.length, 2, "the surviving wall span needs two bounded terminal arrises");
  assert.equal(course?.position.y, 3.12, "terminal story course left the Spice return datum");
  assert.ok(lower.every((instance) => instance.position.x > 21), "terminal relief was not placed on the playable face");
  assert.equal("colliders" in result, false);
});

test("v3 massing is a closed authored volume with a supported roof and four parapet sides", () => {
  const result = build([massingPlacement()]);
  assert.equal(result.segmentHeights[0], 7);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "closed_massing").length, 1);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "active_merchant_roof_silhouette_mass").length, 1);
  assert.ok(result.instances.filter((instance) => instance.meshId === "roof_slab").length >= 6);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "roof_parapet").length, 4);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "roof_parapet_coping").length, 4);
  assert.ok(result.instances.every((instance) => instance.placementId));
  assert.ok(result.instances.every((instance) => instance.moduleId));
});

test("visual facade segmentation remains deterministic and explicitly opt-in", () => {
  const placements = [
    massingPlacement("active_merchant", "MASS_SEGMENTED"),
    modulePlacement("SEGMENTED_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 13.5, z: 1.35 }),
    modulePlacement("SEGMENTED_DOOR", "door_shop_timber", "door", { x: 10, y: 18.5, z: 1.175 }),
  ];
  const stable = build(placements);
  assert.equal(stable.instances.filter((instance) => instance.meshId === "facade_shell_open_front").length, 0);
  assert.equal(stable.instances.filter((instance) => instance.semanticClass === "closed_massing").length, 1);

  const experimental = build(placements, true, true);
  assert.equal(experimental.instances.filter((instance) => instance.meshId === "facade_shell_open_front").length, 0);
  assert.equal(experimental.instances.filter((instance) => instance.semanticClass === "closed_massing").length, 0);
  assert.equal(
    experimental.instances.some((instance) => instance.placementId === "MASS_SEGMENTED:roofline-cornice"),
    false,
    "the physical skyline bevel must not be hidden behind a separate cornice overlay",
  );
  const infill = experimental.instances.filter((instance) => instance.semanticClass === "facade_wall_infill");
  const shell = experimental.instances.find(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  assert.ok(shell);
  assert.equal(shell.uvProjection, "world");
  assert.equal(shell.wallMaterialId, materialSlots.wall);
  assert.equal(shell.detailMaterialId, materialSlots.wall);
  assert.equal(shell.visualQaDimensions?.x, 10);
  assert.equal(shell.scale.x, 10 - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2);
  assert.equal(shell.scale.y, 7);
  assert.equal(shell.scale.z, 2.38);
  assert.ok(Math.abs(shell.position.x + shell.scale.z * 0.5 - 9.38) <= 0.001);
  const shellReturns = experimental.instances.filter(
    (instance) => instance.semanticClass === "segmented_massing_recess_return",
  );
  assert.equal(shellReturns.length, 0, "a detached 24cm cavity return must never own a building edge");
  assert.equal(
    experimental.instances.filter((instance) => instance.semanticClass === "segmented_massing_return_cap").length,
    0,
  );
  assert.ok(infill.length >= 3, "authored bays must split the visual frontage into deterministic infill rectangles");
  const boundaryInfill = infill.filter((instance) => instance.moduleId?.endsWith("_full_depth_boundary_massing"));
  const interiorInfill = infill.filter((instance) => instance.moduleId?.endsWith("_segmented_facade"));
  assert.ok(boundaryInfill.length > 0);
  assert.ok(interiorInfill.length > 0);
  assert.ok(infill.every((instance) => instance.scale.x >= 0.02 && instance.scale.y >= 0.02));
  assert.ok(infill.every((instance) => instance.uvProjection === "world"));
  assert.ok(infill.every((instance) => instance.detailMaterialId === materialSlots.wall));
  assert.ok(boundaryInfill.every((instance) => instance.meshId === "facade_wall_shell"));
  assert.ok(boundaryInfill.every((instance) => instance.scale.z === 3));
  assert.ok(boundaryInfill.every((instance) => !instance.boundaryChamfer));
  assert.ok(
    boundaryInfill.some((instance) => (
      instance.scale.x === 10 - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2
      && Math.abs(instance.position.y + instance.scale.y * 0.5 - 7) <= 0.001
    )),
    "the complete upper facade band must be absorbed into authored building depth",
  );
  assert.ok(interiorInfill.every((instance) => instance.meshId === "facade_wall_infill"));
  assert.ok(interiorInfill.every((instance) => instance.scale.z === 0.02));
  assert.ok(infill.every((instance) => instance.structurallyBacked === true));
  assert.ok(infill.every((instance) => instance.backingPlacementId === "MASS_SEGMENTED"));
  assert.equal(new Set(infill.map((instance) => instance.wallMaterialId)).size, 1);
  const wallTopCoping = experimental.instances.find(
    (instance) => instance.placementId === "MASS_SEGMENTED:wall-top-coping",
  );
  assert.ok(wallTopCoping);
  assert.equal(wallTopCoping.moduleId, "full_footprint_wall_top_coping");
  assert.equal(wallTopCoping.semanticClass, "massing_perimeter_coping");
  assert.equal(wallTopCoping.meshId, "roof_slab");
  assert.deepEqual(wallTopCoping.scale, { x: 10.24, y: 0.14, z: 3.24 });
  assert.ok(Math.abs(wallTopCoping.position.y - wallTopCoping.scale.y * 0.5 - 7) <= 0.001);
  assert.equal(wallTopCoping.backingPlacementId, "MASS_SEGMENTED");
  assert.equal(wallTopCoping.structurallyBacked, true);
  assert.equal(wallTopCoping.detailMaterialId, materialSlots.trim);
  const previousWindow = Reflect.get(globalThis, "window");
  const previousDocument = Reflect.get(globalThis, "document");
  const image = {
    addEventListener() {},
    removeEventListener() {},
    set src(_value: string) {},
    crossOrigin: "",
  };
  Reflect.set(globalThis, "window", { location: { href: "http://localhost/" } });
  Reflect.set(globalThis, "document", { createElementNS: () => image });
  try {
    const copingRender = buildWallDetailMeshes([wallTopCoping], {
      highVis: false,
      wallMode: "blockout",
      wallMaterials: null,
      quality: "1k",
      seed: 23,
    });
    assert.equal(copingRender.children.length, 1);
    const copingTelemetry = (copingRender.children[0] as InstancedMesh).userData.visualQaInstances?.[0];
    assert.deepEqual(copingTelemetry?.dimensions, wallTopCoping.scale);
    assert.equal(copingTelemetry?.placementId, "MASS_SEGMENTED:wall-top-coping");
    assert.equal(copingTelemetry?.moduleId, "full_footprint_wall_top_coping");
    assert.equal(copingTelemetry?.semanticClass, "massing_perimeter_coping");
    assert.equal(copingTelemetry?.backingPlacementId, "MASS_SEGMENTED");
    assert.equal(copingTelemetry?.structurallyBacked, true);
  } finally {
    if (typeof previousWindow === "undefined") Reflect.deleteProperty(globalThis, "window");
    else Reflect.set(globalThis, "window", previousWindow);
    if (typeof previousDocument === "undefined") Reflect.deleteProperty(globalThis, "document");
    else Reflect.set(globalThis, "document", previousDocument);
  }
  assert.equal(
    stable.instances.some((instance) => instance.placementId === "MASS_SEGMENTED:wall-top-coping"),
    false,
    "the v2 closed-massing path must remain unchanged",
  );
  assert.equal(
    stable.instances.some((instance) => instance.placementId?.includes(":reveal-jamb:") === true),
    false,
  );
  assert.equal(
    experimental.instances.filter((instance) => instance.placementId?.includes(":reveal-jamb:") === true).length,
    2,
  );
  const stableShopBacking = stable.instances.find((instance) => instance.placementId === "SEGMENTED_SHOP");
  const experimentalShopBacking = experimental.instances.find((instance) => instance.placementId === "SEGMENTED_SHOP");
  assert.ok(stableShopBacking && experimentalShopBacking);
  assert.equal(
    experimentalShopBacking.visualQaDimensions?.z,
    0.6,
    "visual QA must report the assembled recess depth rather than the thin backing plane",
  );
  assert.equal(experimentalShopBacking.wallMaterialId, materialSlots.wall);
  assert.equal(
    experimentalShopBacking.detailMaterialId,
    undefined,
    "the experimental shop backing must stay on the manifest-backed wall path",
  );
  assert.ok(
    experimentalShopBacking.position.x < stableShopBacking.position.x - 0.5,
    "opt-in shop backing must sit behind the visual facade plane rather than masking it outward",
  );
  const merchantReturns = experimental.instances.filter(
    (instance) => instance.semanticClass === "merchant_interior_return",
  );
  assert.equal(merchantReturns.length, 2);
  assert.ok(merchantReturns.every((instance) => instance.scale.x >= 0.5));
  const merchantCeiling = experimental.instances.find(
    (instance) => instance.semanticClass === "merchant_interior_ceiling",
  );
  const merchantFloor = experimental.instances.find(
    (instance) => instance.semanticClass === "merchant_interior_floor",
  );
  assert.ok(merchantCeiling && merchantFloor);
  assert.ok(merchantCeiling.scale.z >= 0.5 && merchantFloor.scale.z >= 0.5);
  assert.equal(
    experimental.instances.filter(
      (instance) => instance.semanticClass === "active_merchant_bay" && instance.meshId === "shop_recess_back",
    ).length,
    1,
    "the merchant opening may have one rear shadow plane, never an opaque panel at its face",
  );
  assert.deepEqual(experimental, build(placements, true, true));
});

test("backing volume covers every facade span without changing aperture, collider, or LOS inputs", () => {
  const placements = [
    massingPlacement("active_merchant", "BACKED_MASSING"),
    modulePlacement("BACKED_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 13.5, z: 1.35 }),
    modulePlacement("BACKED_DOOR", "door_shop_timber", "door", { x: 10, y: 18.5, z: 1.175 }),
  ];
  const segments = [{ orientation: "vertical" as const, coord: 10, start: 10, end: 22, outward: -1 as const }];
  const inputSnapshot = structuredClone({ placements, segments, zones });
  const result = buildV3Architecture({
    placements,
    massingProfiles,
    facadeProfiles,
    segments,
    zones,
    traversalSurfaces: [],
    wallHeightM: 9.5,
    fortifiedDoorModelAvailable: true,
    experimentalVisualCutoutMassing: true,
  });
  assert.deepEqual({ placements, segments, zones }, inputSnapshot);
  assert.deepEqual(result.segmentHeights, [7]);
  assert.equal("colliders" in result, false);
  assert.equal("lineOfSight" in result, false);

  const backing = result.instances.find(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  assert.ok(backing);
  assert.equal(backing.visualQaDimensions?.x, 10);
  assert.deepEqual(backing.scale, {
    x: 10 - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2,
    y: 7,
    z: 2.38,
  });
  const authoredFacadeX = 10;
  const backingFrontX = backing.position.x + backing.scale.z * 0.5;
  assert.ok(Math.abs(authoredFacadeX - backingFrontX - 0.62) <= 0.001);

  const facadeFaces = result.instances.filter((instance) => (
    instance.semanticClass === "facade_wall_infill"
    || instance.semanticClass === "facade_masonry_divider"
  ));
  assert.ok(facadeFaces.length > 0);
  assert.ok(facadeFaces.every((instance) => instance.structurallyBacked === true));
  assert.ok(facadeFaces.every((instance) => instance.backingPlacementId === "BACKED_MASSING"));
  const boundaryFaces = facadeFaces.filter((instance) => instance.moduleId?.endsWith("_full_depth_boundary_massing"));
  const interiorFaces = facadeFaces.filter((instance) => instance.moduleId?.endsWith("_segmented_facade"));
  assert.ok(boundaryFaces.length > 0);
  assert.ok(interiorFaces.length > 0);
  assert.ok(boundaryFaces.every((instance) => instance.scale.z === 3));
  assert.ok(boundaryFaces.every((instance) => Math.abs(instance.position.x + instance.scale.z * 0.5 - authoredFacadeX) <= 0.001));
  assert.ok(interiorFaces.every((instance) => instance.position.x - instance.scale.z * 0.5 > backingFrontX));
  assert.ok(facadeFaces.every((instance) => instance.scale.x <= backing.scale.x));
  assert.ok(facadeFaces.every((instance) => instance.scale.y <= backing.scale.y));

  const shop = result.instances.find((instance) => instance.placementId === "BACKED_SHOP");
  const doorReveal = result.instances.find(
    (instance) => instance.placementId === "BACKED_DOOR:reveal-jamb:-1",
  );
  assert.equal(shop?.visualQaDimensions?.z, 0.6);
  assert.ok(
    doorReveal && doorReveal.scale.z > 0 && doorReveal.scale.z <= 0.26,
    "the merchant door reveal must remain positive and bounded inside the backing clearance",
  );
});

test("authored merchant recess depth drives collision-backed shell clearance and stocked interior construction", () => {
  const deepShop = modulePlacement(
    "DEEP_AUTHORED_SHOP",
    "shop_recess_market",
    "shop_recess",
    { x: 10, y: 16, z: 1.35 },
  );
  if (deepShop.kind !== "facade_module") throw new Error("fixture drift");
  deepShop.sizeM.depth = 1.35;
  const placements = [massingPlacement("active_merchant", "DEEP_SHOP_MASSING"), deepShop];
  const snapshot = structuredClone(placements);
  const result = build(placements, true, true);
  assert.deepEqual(placements, snapshot, "render-only shop construction must not mutate compiled placements");

  const backing = result.instances.find(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  const shopBack = result.instances.find((instance) => instance.placementId === deepShop.id);
  assert.ok(backing && shopBack);
  assert.ok(Math.abs(backing.scale.z - 1.53) <= 0.001);
  assert.ok(Math.abs(10 - (backing.position.x + backing.scale.z * 0.5) - 1.47) <= 0.001);
  assert.equal(shopBack.visualQaDimensions?.z, 1.35);
  assert.equal(shopBack.meshId, "shop_recess_back");
  assert.equal(shopBack.wallMaterialId, materialSlots.wall);
  assert.equal(shopBack.scale.z, 0.06, "deep shop interior must terminate in a rear plane, not a solid block");
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_interior_return").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_interior_stock").length, 5);
  const stockMeshes = new Set(
    result.instances
      .filter((instance) => instance.semanticClass === "merchant_interior_stock")
      .map((instance) => instance.meshId),
  );
  assert.deepEqual(
    stockMeshes,
    new Set(["merchant_goods_pot", "merchant_goods_basket", "merchant_goods_folded_textile"]),
  );
  const counter = result.instances.find((instance) => instance.placementId === `${deepShop.id}:counter-front`);
  assert.ok(counter && counter.scale.y <= 0.62 && counter.scale.x <= deepShop.sizeM.width * 0.74 + 0.001);
  const depthWitness = result.instances.find((instance) => instance.placementId === `${deepShop.id}:counter-top`);
  assert.equal(depthWitness?.semanticClass, "active_merchant_bay");
  assert.equal(depthWitness?.visualQaDimensions?.z, 1.35);
  assert.ok(result.instances.some((instance) => instance.semanticClass === "merchant_interior_hanging_goods"));
  assert.ok(
    result.instances.filter((instance) => instance.semanticClass === "canopy_support")
      .every((instance) => instance.detailMaterialId === "ph_worn_planks"),
    "canopy supports must use the manifest-backed merchant timber material",
  );
  assert.ok(
    result.instances.filter((instance) => instance.semanticClass === "merchant_interior_stock")
      .filter((instance) => instance.meshId !== "merchant_goods_folded_textile")
      .every((instance) => instance.uvProjection === "world"),
  );
  assert.equal("colliders" in result, false);
  assert.equal("lineOfSight" in result, false);
});

test("distant windows have thin rear planes, constructed returns, and grammar-served coverage", () => {
  const window = modulePlacement(
    "DEEP_WINDOW",
    "window_screened",
    "window",
    { x: 10, y: 16, z: 4.1 },
    "quiet_residential",
  );
  const result = build([massingPlacement("quiet_residential", "DEEP_WINDOW_MASSING"), window], true, true);
  const backing = result.instances.find((instance) => instance.placementId === window.id);
  assert.ok(backing);
  assert.equal(backing.scale.z, 0.06);
  assert.equal(backing.visualQaDimensions?.z, 0.42);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "window_recess_return").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "window_recess_head").length, 1);
  assert.ok(result.instances.some((instance) => instance.semanticClass === "window_screen"));
});

test("main-lane upper windows use dense but seeded mashrabiya closure variants", () => {
  const firstWindow = modulePlacement(
    "MERCHANT_UPPER_WINDOW_A",
    "window_screened",
    "window",
    { x: 10, y: 14, z: 4.1 },
    "active_merchant",
  );
  const secondWindow = modulePlacement(
    "MERCHANT_UPPER_WINDOW_B",
    "window_screened",
    "window",
    { x: 10, y: 18, z: 4.1 },
    "active_merchant",
  );
  const result = build([massingPlacement(), firstWindow, secondWindow], true, true);
  const closureSignature = (placementId: string): string => {
    const bars = result.instances.filter((instance) => (
      instance.semanticClass === "window_screen" && instance.placementId?.startsWith(`${placementId}:`)
    ));
    const diagonals = result.instances.filter((instance) => (
      instance.semanticClass === "upper_story_mashrabiya_lattice"
      && instance.placementId?.startsWith(`${placementId}:`)
    ));
    assert.ok(bars.length >= 7 && bars.length <= 11, "seeded lattice left the dense closure range");
    assert.ok(diagonals.length >= 1 && diagonals.length <= 2, "seeded motif lost its diagonal construction");
    assert.ok(diagonals.every((instance) => Math.abs(instance.rollRad ?? 0) > 0.4));
    assert.ok(
      diagonals.every((instance) => instance.trimMaterialId?.startsWith("ph_")),
      "mashrabiya diagonals left the manifest-backed timber family",
    );
    assert.ok([...bars, ...diagonals].every((instance) => typeof instance.detailTintHex === "number"));
    return `${bars.length}:${diagonals.map((instance) => Math.sign(instance.rollRad ?? 0)).join(",")}:${bars[0]?.detailTintHex}`;
  };
  assert.notEqual(
    closureSignature(firstWindow.id),
    closureSignature(secondWindow.id),
    "neighboring upper closures collapsed into an identical prefab read",
  );
});

test("terminal Spice merchant awning keeps both supports inside its shallow return clearance", () => {
  const terminalShop = modulePlacement(
    "ARCH_FRONTAGE_SPICE_STREET_WEST_GROUND_01",
    "shop_recess_market",
    "shop_recess",
    { x: 10, y: 16, z: 1.35 },
  );
  const result = build([massingPlacement(), terminalShop], true, true);
  const awning = result.instances.find((instance) => instance.placementId === `${terminalShop.id}:awning`);
  assert.equal(awning?.scale.z, 0.46);
  assert.equal(
    result.instances.filter(
      (instance) => instance.placementId?.startsWith(`${terminalShop.id}:awning-pole:`) === true,
    ).length,
    2,
  );
});

test("boundary infill becomes physical massing and stays inside the authored facade envelope", () => {
  const placements = [
    massingPlacement("active_merchant", "BOUNDARY_ENVELOPE_MASSING"),
    modulePlacement("BOUNDARY_ENVELOPE_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 13.5, z: 1.35 }),
    modulePlacement("BOUNDARY_ENVELOPE_DOOR", "door_shop_timber", "door", { x: 10, y: 18.5, z: 1.175 }),
  ];
  const result = build(placements, true, true);
  const backing = result.instances.find(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  assert.ok(backing);
  const infill = result.instances.filter((instance) => instance.semanticClass === "facade_wall_infill");
  const boundary = infill.filter((instance) => instance.moduleId?.endsWith("_full_depth_boundary_massing"));
  const interior = infill.filter((instance) => instance.moduleId?.endsWith("_segmented_facade"));
  assert.ok(boundary.length > 0, "outer shoulders and the upper span must be solid masonry");
  assert.ok(interior.length > 0, "the bay-to-bay interior must remain a thin tessellated face");

  const facadePlaneX = 10;
  const backingFrontX = backing.position.x + backing.scale.z * 0.5;
  const facadeMinZ = 11;
  const facadeMaxZ = 21;
  for (const instance of boundary) {
    assert.equal(instance.meshId, "facade_wall_shell");
    assert.equal(instance.scale.z, 3);
    assert.equal(instance.boundaryChamfer, undefined);
    assert.equal(instance.uvProjection, "world");
    assert.equal(instance.wallMaterialId, materialSlots.wall);
    assert.equal(instance.detailMaterialId, materialSlots.wall);
    assert.ok(Math.abs(instance.position.x + instance.scale.z * 0.5 - facadePlaneX) <= 0.001);
    assert.ok(instance.position.x - instance.scale.z * 0.5 < backingFrontX - 0.5);
    assert.ok(instance.position.z - instance.scale.x * 0.5 >= facadeMinZ - 0.001);
    assert.ok(instance.position.z + instance.scale.x * 0.5 <= facadeMaxZ + 0.001);
    assert.ok(instance.position.y - instance.scale.y * 0.5 >= -0.001);
    assert.ok(instance.position.y + instance.scale.y * 0.5 <= 7.001);
  }
  assert.ok(interior.every((instance) => instance.meshId === "facade_wall_infill"));
  assert.ok(interior.every((instance) => instance.scale.z === 0.02));
  assert.ok(interior.every((instance) => instance.position.x - instance.scale.z * 0.5 > backingFrontX));
});

test("segmented infill is forced through the continuous world-projected PBR path", () => {
  const previousWindow = Reflect.get(globalThis, "window");
  const previousDocument = Reflect.get(globalThis, "document");
  const image = {
    addEventListener() {},
    removeEventListener() {},
    set src(_value: string) {},
    crossOrigin: "",
  };
  Reflect.set(globalThis, "window", { location: { href: "http://localhost/" } });
  Reflect.set(globalThis, "document", { createElementNS: () => image });
  try {
    const wallMaterials = {
      getMaterialIds: () => [materialSlots.wall],
      createStandardMaterial: () => new MeshStandardMaterial({ color: 0xb8aa92 }),
      getTileSizeM: () => 2,
    } as unknown as WallMaterialLibrary;
    const instances: WallDetailInstance[] = [
      {
        placementId: "SHELL_WORLD_UV",
        moduleId: "active_merchant_segmented_shell",
        semanticClass: "segmented_massing_shell",
        meshId: "facade_wall_shell",
        position: { x: 10, y: 3.5, z: 14 },
        scale: { x: 10, y: 7, z: 3 },
        yawRad: Math.PI * 0.5,
        uvProjection: "world",
        wallMaterialId: materialSlots.wall,
        trimMaterialId: null,
      },
      {
        placementId: "INFILL_WORLD_UV",
        moduleId: "active_merchant_segmented_facade",
        semanticClass: "facade_wall_infill",
        meshId: "facade_wall_infill",
        position: { x: 10, y: 2, z: 14 },
        scale: { x: 2.5, y: 4, z: 0.22 },
        yawRad: Math.PI * 0.5,
        uvProjection: "world",
        backingPlacementId: "SHELL_WORLD_UV",
        structurallyBacked: true,
        wallMaterialId: materialSlots.wall,
        trimMaterialId: null,
      },
    ];
    const root = buildWallDetailMeshes(instances, {
      highVis: false,
      wallMode: "pbr",
      wallMaterials,
      quality: "1k",
      seed: 23,
    });
    assert.equal(root.children.length, 2);
    const meshes = root.children as InstancedMesh[];
    for (const mesh of meshes) {
      assert.equal(mesh.userData.visualQa.uvProjection, "world");
      assert.ok(!Array.isArray(mesh.material));
      assert.equal(mesh.material.userData.wallUvProjection, "world");
    }
    assert.equal(meshes[0]?.material, meshes[1]?.material, "shell and infill must share one continuous wall material");
    const infillMesh = meshes.find((candidate) => candidate.name.includes("facade_wall_infill"));
    assert.ok(infillMesh);
    assert.equal(infillMesh.userData.visualQaInstances[0]?.backingPlacementId, "SHELL_WORLD_UV");
    assert.equal(infillMesh.userData.visualQaInstances[0]?.structurallyBacked, true);
    infillMesh.geometry.computeBoundingBox();
    assert.ok(infillMesh.geometry.boundingBox);
    assert.equal(infillMesh.geometry.boundingBox.max.z - infillMesh.geometry.boundingBox.min.z, 0);
    assert.equal(infillMesh.geometry.getIndex()?.count, 12, "infill must contain only two front/back faces");
    const normals = infillMesh.geometry.getAttribute("normal");
    for (let index = 0; index < normals.count; index += 1) {
      assert.equal(normals.getX(index), 0);
      assert.equal(normals.getY(index), 0);
      assert.equal(Math.abs(normals.getZ(index)), 1);
    }
    const mesh = meshes[0]!;
    const material = mesh.material;
    if (Array.isArray(material)) throw new Error("world-projected wall material unexpectedly split");
    const shader = {
      vertexShader: "#include <common>\n#include <worldpos_vertex>",
      fragmentShader: "#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>",
      uniforms: {},
    };
    material.onBeforeCompile(shader as never, {} as never);
    assert.match(shader.vertexShader, /wallProjectedUv/);
    assert.match(shader.vertexShader, /vWallWorldPos/);
    assert.match(
      shader.vertexShader,
      /inverseTransformDirection\(transformedNormal, viewMatrix\)/,
      "world projection must reuse Three's inverse-scale-corrected normal",
    );
    assert.doesNotMatch(
      shader.vertexShader,
      /mat3\(batchingMatrix\) \* wallObjectNormal/,
      "world projection must not reapply a non-uniform batch transform to normals",
    );
  } finally {
    if (typeof previousWindow === "undefined") Reflect.deleteProperty(globalThis, "window");
    else Reflect.set(globalThis, "window", previousWindow);
    if (typeof previousDocument === "undefined") Reflect.deleteProperty(globalThis, "document");
    else Reflect.set(globalThis, "document", previousDocument);
  }
});

test("boundary chamfer buckets preserve a physical diagonal facet on wide and narrow spans", () => {
  const previousWindow = Reflect.get(globalThis, "window");
  const previousDocument = Reflect.get(globalThis, "document");
  const image = {
    addEventListener() {},
    removeEventListener() {},
    set src(_value: string) {},
    crossOrigin: "",
  };
  Reflect.set(globalThis, "window", { location: { href: "http://localhost/" } });
  Reflect.set(globalThis, "document", { createElementNS: () => image });
  try {
    const wallMaterials = {
      getMaterialIds: () => [materialSlots.wall],
      createStandardMaterial: () => new MeshStandardMaterial({ color: 0xb8aa92 }),
      getTileSizeM: () => 2,
    } as unknown as WallMaterialLibrary;
    const instances: WallDetailInstance[] = [
      {
        placementId: "TEXTILE_UPPER_SPAN",
        moduleId: "covered_arcade_boundary_masonry",
        semanticClass: "facade_wall_infill",
        meshId: "facade_boundary_chamfer",
        position: { x: 0, y: 3, z: 0 },
        scale: { x: 13.44, y: 3.45, z: 0.62 },
        boundaryChamfer: {
          exposedEnds: "both",
          runM: 0.62,
          topBevel: { heightM: 0.25, depthM: 0.25 },
        },
        backingPlacementId: "TEXTILE_BACKING",
        structurallyBacked: true,
        yawRad: 0,
        uvProjection: "world",
        wallMaterialId: materialSlots.wall,
        trimMaterialId: null,
        detailMaterialId: materialSlots.wall,
      },
      {
        placementId: "RUG_SHOULDER",
        moduleId: "active_merchant_boundary_masonry",
        semanticClass: "facade_wall_infill",
        meshId: "facade_boundary_chamfer",
        position: { x: 0, y: 2, z: 4 },
        scale: { x: 0.8, y: 1.4, z: 0.62 },
        boundaryChamfer: { exposedEnds: "left", runM: 0.62 },
        backingPlacementId: "RUG_BACKING",
        structurallyBacked: true,
        yawRad: 0,
        uvProjection: "world",
        wallMaterialId: materialSlots.wall,
        trimMaterialId: null,
        detailMaterialId: materialSlots.wall,
      },
    ];
    const root = buildWallDetailMeshes(instances, {
      highVis: false,
      wallMode: "pbr",
      wallMaterials,
      quality: "1k",
      seed: 23,
    });
    assert.equal(root.children.length, 2, "different aspect ratios require deterministic geometry buckets");
    assert.equal(
      root.children.some((child) => child.name.includes("facade_wall_infill")),
      false,
      "a chamfered placement must not hide a second planar facade fin",
    );

    for (const child of root.children as InstancedMesh[]) {
      const metadata = child.geometry.userData.boundaryChamfer as {
        exposedEnds: "none" | "left" | "right" | "both";
        runM: number;
        widthM: number;
        heightM: number;
        depthM: number;
        angleDeg: number;
        topBevel?: {
          heightM: number;
          depthM: number;
          angleDeg: number;
        };
      } | undefined;
      assert.ok(metadata);
      assert.equal(metadata.runM, 0.62);
      assert.equal(metadata.depthM, 0.62);
      assert.ok(metadata.angleDeg >= 35 && metadata.angleDeg <= 45.000001);
      assert.equal(child.userData.visualQa.uvProjection, "world");
      assert.equal(child.userData.visualQaInstances[0]?.boundaryChamfer?.runM, 0.62);

      const positions = child.geometry.getAttribute("position");
      const frontX: number[] = [];
      const rearX: number[] = [];
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.getX(index);
        const z = positions.getZ(index);
        if (Math.abs(z + 0.5) <= 1e-5) frontX.push(x);
        if (Math.abs(z - 0.5) <= 1e-5) rearX.push(x);
      }
      assert.ok(frontX.length > 0 && rearX.length > 0);
      assert.ok(Math.abs(Math.min(...frontX) + 0.5) <= 1e-5);
      assert.ok(Math.abs(Math.max(...frontX) - 0.5) <= 1e-5);
      if (metadata.exposedEnds === "left" || metadata.exposedEnds === "both") {
        assert.ok(Math.min(...rearX) > -0.5, "left rear cut must be closed by the backing plane");
      }
      if (metadata.exposedEnds === "right" || metadata.exposedEnds === "both") {
        assert.ok(Math.max(...rearX) < 0.5, "right rear cut must be closed by the backing plane");
      }

      const normals = child.geometry.getAttribute("normal");
      const physicalAngles: number[] = [];
      for (let index = 0; index < normals.count; index += 1) {
        const x = normals.getX(index) / metadata.widthM;
        const z = normals.getZ(index) / metadata.depthM;
        if (Math.abs(x) <= 1e-5 || Math.abs(z) <= 1e-5 || Math.abs(normals.getY(index)) > 1e-5) continue;
        physicalAngles.push(Math.atan2(Math.abs(z), Math.abs(x)) * 180 / Math.PI);
      }
      assert.ok(physicalAngles.length > 0, "prism must expose a real diagonal XZ facet normal");
      assert.ok(physicalAngles.every((angle) => angle >= 35 - 0.01 && angle <= 45 + 0.01));

      if (metadata.topBevel) {
        assert.equal(metadata.topBevel.heightM, 0.25);
        assert.equal(metadata.topBevel.depthM, 0.25);
        assert.ok(metadata.topBevel.angleDeg >= 35 && metadata.topBevel.angleDeg <= 45.000001);
        const frontY: number[] = [];
        let preservedRearTop = false;
        for (let index = 0; index < positions.count; index += 1) {
          const y = positions.getY(index);
          const z = positions.getZ(index);
          if (Math.abs(z + 0.5) <= 1e-5) frontY.push(y);
          if (Math.abs(y - 0.5) <= 1e-5 && Math.abs(z - 0.5) <= 1e-5) preservedRearTop = true;
        }
        assert.ok(frontY.length > 0);
        const frontTopReductionM = (0.5 - Math.max(...frontY)) * metadata.heightM;
        assert.ok(Math.abs(frontTopReductionM - 0.25) <= 1e-4);
        assert.equal(preservedRearTop, true, "horizontal top and backing contact must survive the front bevel");
        assert.equal(
          frontY.some((y) => Math.abs(y - 0.5) <= 1e-5),
          false,
          "the square front-top corner must be physically absent",
        );

        const physicalTopAngles: number[] = [];
        const bevelFrontAlignments: number[] = [];
        let hasVerticalFrontNormal = false;
        let hasHorizontalTopNormal = false;
        for (let index = 0; index < normals.count; index += 1) {
          const rawX = normals.getX(index);
          const rawY = normals.getY(index);
          const rawZ = normals.getZ(index);
          if (Math.abs(rawX) > 1e-5) continue;
          if (Math.abs(rawY) <= 1e-5 && rawZ < -0.99) hasVerticalFrontNormal = true;
          if (rawY > 0.99 && Math.abs(rawZ) <= 1e-5) hasHorizontalTopNormal = true;
          const y = rawY / metadata.heightM;
          const frontFacingZ = -rawZ / metadata.depthM;
          if (y <= 1e-5 || frontFacingZ <= 1e-5) continue;
          physicalTopAngles.push(Math.atan2(frontFacingZ, Math.abs(y)) * 180 / Math.PI);
          bevelFrontAlignments.push(-rawZ);
        }
        assert.ok(physicalTopAngles.length > 0, "skyline bevel needs an actual diagonal YZ facet normal");
        assert.ok(physicalTopAngles.every((angle) => angle >= 35 - 0.01 && angle <= 45 + 0.01));
        assert.ok(
          bevelFrontAlignments.every((alignment) => alignment > 0),
          "bevel normals must face authored local -Z, the same frontage contract used by assertFrontageOrientation",
        );
        assert.equal(hasVerticalFrontNormal, true);
        assert.equal(hasHorizontalTopNormal, true);
      }
    }
  } finally {
    if (typeof previousWindow === "undefined") Reflect.deleteProperty(globalThis, "window");
    else Reflect.set(globalThis, "window", previousWindow);
    if (typeof previousDocument === "undefined") Reflect.deleteProperty(globalThis, "document");
    else Reflect.set(globalThis, "document", previousDocument);
  }
});

test("arch meshes leave a real opening facing the frontage and masonry above the curve", () => {
  const material = new MeshStandardMaterial({ side: DoubleSide });
  const frame = new Mesh(createOpenBottomPointedArchFrameGeometry(), material);
  const spandrel = new Mesh(createArchSpandrelGeometry(), material);
  const back = new Mesh(createOpenBottomArchRecessGeometry(), material);
  const hit = (mesh: Mesh, x: number, y: number) => new Raycaster(
    new Vector3(x, y, -2), new Vector3(0, 0, 1),
  ).intersectObject(mesh).length > 0;
  try {
    for (const y of [-0.49, 0, 0.25]) {
      assert.equal(hit(frame, 0, y), false, "arch frame closes its aperture");
      assert.equal(hit(spandrel, 0, y), false, "spandrel seals the opening");
      assert.equal(hit(back, 0, y), true, "recess backing faces sideways");
    }
    assert.equal(hit(frame, -0.44, -0.2), true, "left jamb missing");
    assert.equal(hit(frame, 0.44, -0.2), true, "right jamb missing");
    assert.equal(hit(frame, 0, 0.44), true, "arch crown missing");
    assert.equal(hit(spandrel, -0.46, 0.46), true, "left spandrel missing");
    assert.equal(hit(spandrel, 0.46, 0.46), true, "right spandrel missing");
  } finally {
    for (const mesh of [frame, spandrel, back]) mesh.geometry.dispose();
    material.dispose();
  }
});

test("authored arch cutouts stay facade-aligned with no coplanar infill overlap", () => {
  const archPlacement = modulePlacement(
    "ARCH_AXIS_REGRESSION",
    "arch_arcade",
    "arch",
    { x: 10, y: 16, z: 1.8 },
  );
  const result = build([massingPlacement(), archPlacement], true, true);
  const archSurfaces = result.instances.filter((instance) => (
    instance.placementId === "ARCH_AXIS_REGRESSION"
    || instance.placementId?.startsWith("ARCH_AXIS_REGRESSION:arch-")
  ));
  assert.ok(archSurfaces.length >= 3);
  for (const surface of archSurfaces) {
    const normalExtentM = Math.abs(Math.cos(surface.yawRad)) * surface.scale.x
      + Math.abs(Math.sin(surface.yawRad)) * surface.scale.z;
    const tangentExtentM = Math.abs(Math.sin(surface.yawRad)) * surface.scale.x
      + Math.abs(Math.cos(surface.yawRad)) * surface.scale.z;
    assert.ok(normalExtentM <= 0.3, `${surface.placementId} escaped down the return wall (${normalExtentM}m)`);
    assert.ok(tangentExtentM <= 1.401, `${surface.placementId} exceeded the authored 1.4m aperture width`);
  }

  const infill = result.instances.filter((instance) => instance.semanticClass === "facade_wall_infill");
  const spandrel = result.instances.find((instance) => instance.semanticClass === "arcade_arch_spandrel");
  assert.ok(spandrel);
  const infillAreaM2 = infill.reduce((total, instance) => total + instance.scale.x * instance.scale.y, 0);
  const renderedFacadeWidthM = 10 - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2;
  assert.ok(
    Math.abs(infillAreaM2 - (renderedFacadeWidthM * 7 - 1.4 * 2.2)) <= 0.001,
    "aperture area changed beyond the render-only facade edge clearance",
  );
  assert.ok(infill.every((instance) => instance.scale.z === 3));
  assert.ok(infill.every((instance) => instance.meshId === "facade_wall_shell"));
  const coplanarSurfaces = [...infill, spandrel];
  for (let leftIndex = 0; leftIndex < coplanarSurfaces.length; leftIndex += 1) {
    const left = coplanarSurfaces[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < coplanarSurfaces.length; rightIndex += 1) {
      const right = coplanarSurfaces[rightIndex]!;
      if (Math.abs(left.position.x - right.position.x) > 0.02) continue;
      const alongOverlapM = Math.min(
        left.position.z + left.scale.x * 0.5,
        right.position.z + right.scale.x * 0.5,
      ) - Math.max(
        left.position.z - left.scale.x * 0.5,
        right.position.z - right.scale.x * 0.5,
      );
      const verticalOverlapM = Math.min(
        left.position.y + left.scale.y * 0.5,
        right.position.y + right.scale.y * 0.5,
      ) - Math.max(
        left.position.y - left.scale.y * 0.5,
        right.position.y - right.scale.y * 0.5,
      );
      assert.ok(
        alongOverlapM <= 0.001 || verticalOverlapM <= 0.001,
        `${left.placementId} overlaps coplanar cutout surface ${right.placementId}`,
      );
    }
  }
});

test("adjacent arcade apertures share one upper wall instead of emitting a full-height sliver", () => {
  const massing = massingPlacement("active_merchant", "ARCADE_PAIR_MASSING");
  const leftArch = modulePlacement(
    "ARCADE_PAIR_LEFT",
    "arch_arcade",
    "arch",
    { x: 10, y: 14.55, z: 1.775 },
  );
  const rightArch = modulePlacement(
    "ARCADE_PAIR_RIGHT",
    "arch_arcade",
    "arch",
    { x: 10, y: 17.45, z: 1.775 },
  );
  if (
    massing.kind !== "massing"
    || leftArch.kind !== "facade_module"
    || rightArch.kind !== "facade_module"
  ) throw new Error("fixture drift");
  massing.sizeM = { width: 5.72, depth: 4.8, height: 7 };
  leftArch.sizeM = { width: 2.6, depth: 0.46, height: 3.55 };
  rightArch.sizeM = { width: 2.6, depth: 0.46, height: 3.55 };
  const result = build([massing, leftArch, rightArch], true, true);
  const infill = result.instances.filter((instance) => instance.semanticClass === "facade_wall_infill");
  assert.equal(
    infill.some((instance) => instance.scale.x <= 0.301 && instance.scale.y >= 6.99),
    false,
    "the narrow pier between arches escaped upward as a skyline fin",
  );
  assert.ok(
    infill.some((instance) => (
      instance.scale.x >= massing.sizeM.width - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2 - 0.001
      && instance.scale.y >= 3.449
    )),
    "neighboring arch heads must resolve into one continuous upper masonry mass",
  );
  const divider = result.instances.find((instance) => instance.semanticClass === "facade_masonry_divider");
  assert.ok(divider);
  assert.ok(divider.scale.z >= 0.48, "the shared arch pier must have readable masonry depth");
  assert.equal(divider.meshId, "facade_wall_shell");
});

test("narrow segmented massing uses exact-width fallbacks only beneath full-depth upper massing", () => {
  const narrowMassing = massingPlacement("active_merchant", "NARROW_MASSING");
  const centeredDoor = modulePlacement(
    "NARROW_DOOR",
    "door_shop_timber",
    "door",
    { x: 10, y: 16, z: 1.175 },
  );
  if (narrowMassing.kind !== "massing" || centeredDoor.kind !== "facade_module") throw new Error("fixture drift");
  narrowMassing.sizeM = { width: 1.88, depth: 4.2, height: 4.5 };
  narrowMassing.center = { x: 7.9, y: 16, z: 2.25 };
  narrowMassing.roof.setbackM = 0.45;
  narrowMassing.roof.upperStorySetbackM = 0.35;
  centeredDoor.sizeM = { width: 1.4, depth: 0.16, height: 2.2 };
  const result = build([narrowMassing, centeredDoor], true, true);
  const returns = result.instances.filter((instance) => instance.semanticClass === "segmented_massing_recess_return");
  const caps = result.instances.filter((instance) => instance.semanticClass === "segmented_massing_return_cap");
  assert.equal(returns.length, 0);
  assert.equal(caps.length, 0);
  const fallbacks = result.instances.filter((instance) => instance.moduleId?.endsWith("_recess_edge_fallback"));
  assert.equal(fallbacks.length, 2);
  const renderedEdgeWidthM = (
    narrowMassing.sizeM.width - centeredDoor.sizeM.width
  ) * 0.5 - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M;
  assert.ok(fallbacks.every((instance) => (
    Math.abs(instance.scale.x - renderedEdgeWidthM) <= 0.001
    && instance.scale.z === 0.62
  )));
  assert.ok(fallbacks.every((instance) => instance.scale.y === 2.2));
  const upperMassing = result.instances.find((instance) => (
    instance.moduleId?.endsWith("_full_depth_boundary_massing")
    && Math.abs(instance.position.y + instance.scale.y * 0.5 - 4.5) <= 0.001
  ));
  assert.ok(upperMassing);
  assert.equal(
    upperMassing.scale.x,
    narrowMassing.sizeM.width - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2,
  );
  assert.equal(upperMassing.scale.z, 4.2);
  assert.ok(fallbacks.every((instance) => (
    instance.position.y + instance.scale.y * 0.5 <= upperMassing.position.y - upperMassing.scale.y * 0.5 + 0.001
  )));
  const backing = result.instances.find(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  assert.ok(backing);
  assert.equal(backing.visualQaDimensions?.x, narrowMassing.sizeM.width);
  assert.deepEqual(backing.scale, {
    x: narrowMassing.sizeM.width - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M * 2,
    y: 4.5,
    z: 3.58,
  });
  assert.equal(result.instances.some((instance) => instance.placementId?.includes("upper-shell")), false);
  assert.ok(fallbacks.every((instance) => instance.scale.x <= 0.24));
  assert.equal(result.instances.some((instance) => instance.meshId === "facade_shell_open_front"), false);
});

test("a sub-62cm authored edge gap stays exact and cannot reach the skyline", () => {
  const massing = massingPlacement("active_merchant", "NARROW_RETURN_MASSING");
  const door = modulePlacement(
    "NARROW_RETURN_DOOR",
    "door_shop_timber",
    "door",
    { x: 10, y: 16, z: 1.175 },
  );
  if (massing.kind !== "massing" || door.kind !== "facade_module") throw new Error("fixture drift");
  massing.sizeM = { width: 1.97, depth: 4.2, height: 4.5 };
  massing.center = { x: 7.9, y: 16, z: 2.25 };
  const result = build([massing, door], true, true);
  const narrowReturns = result.instances.filter(
    (instance) => instance.moduleId?.endsWith("_recess_edge_fallback"),
  );
  assert.equal(narrowReturns.length, 2);
  const renderedEdgeWidthM = (
    massing.sizeM.width - door.sizeM.width
  ) * 0.5 - SEGMENTED_SHELL_RENDER_EDGE_CLEARANCE_M;
  assert.ok(narrowReturns.every((instance) => Math.abs(instance.scale.x - renderedEdgeWidthM) <= 0.001));
  assert.ok(narrowReturns.every((instance) => instance.scale.z === 0.62));
  assert.ok(narrowReturns.every((instance) => instance.meshId === "facade_wall_shell"));
  assert.ok(narrowReturns.every((instance) => !instance.boundaryChamfer));
  assert.equal(
    result.instances.some(
      (instance) => narrowReturns.some((narrow) => narrow.placementId === instance.placementId)
        && instance.meshId === "facade_wall_infill",
    ),
    false,
  );
});

test("a shallow skyline band becomes full-depth masonry without cutting its aperture", () => {
  const massing = massingPlacement("active_merchant", "MICRO_SKYLINE_MASSING");
  const window = modulePlacement(
    "MICRO_SKYLINE_WINDOW",
    "window_shuttered",
    "window",
    { x: 10, y: 16, z: 3.2 },
  );
  if (massing.kind !== "massing" || window.kind !== "facade_module") throw new Error("fixture drift");
  massing.sizeM = { width: 10, depth: 3, height: 4.5 };
  massing.center = { x: 8.5, y: 16, z: 2.25 };
  const result = build([massing, window], true, true);
  const micro = result.instances.find(
    (instance) => (
      instance.moduleId?.endsWith("_full_depth_boundary_massing")
      && Math.abs(instance.position.y + instance.scale.y * 0.5 - 4.5) <= 0.001
    ),
  );
  assert.ok(micro);
  assert.ok(Math.abs(micro.scale.y - 0.2) <= 0.001);
  assert.equal(micro.scale.z, 3);
  assert.equal(micro.meshId, "facade_wall_shell");
  assert.equal(micro.boundaryChamfer, undefined);
  assert.equal(
    result.instances.some(
      (instance) => instance.placementId === micro.placementId && instance.meshId === "facade_wall_infill",
    ),
    false,
  );
  const authoredWindowTopY = window.center.z + window.sizeM.height * 0.5;
  assert.ok(Math.abs(micro.position.y - micro.scale.y * 0.5 - authoredWindowTopY) <= 0.001);
});

test("the three compiled skyline regressions are absorbed into authored massing depth without changing apertures", () => {
  const compiled = parseBlockoutSpec(
    JSON.parse(readFileSync(new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8")),
    "compiled bazaar-map/map_spec.json",
  );
  const skylineMassingIds = [
    "ARCH_FRONTAGE_COVERED_SOUK_EAST_MASSING",
    "ARCH_FRONTAGE_RUG_GATE_WEST_MASSING",
  ] as const;
  const rugEastMassingId = "ARCH_FRONTAGE_RUG_GATE_EAST_MASSING";
  const requiredMassingIds = new Set([...skylineMassingIds, rugEastMassingId]);
  const requiredFrontageIds = new Set(
    compiled.architecturePlacements
      ?.filter((placement) => requiredMassingIds.has(placement.id))
      .map((placement) => placement.frontageId),
  );
  assert.equal(requiredFrontageIds.size, 3, "compiled skyline regression fixtures drifted");
  const placements = compiled.architecturePlacements?.filter((placement) => (
    requiredFrontageIds.has(placement.frontageId)
  )) ?? [];
  const segments: [] = [];
  const inputSnapshot = structuredClone({ placements, segments, zones: compiled.zones });
  const apertureSnapshot = structuredClone(
    placements.filter((placement) => placement.kind === "facade_module"),
  );
  const result = buildV3Architecture({
    placements,
    massingProfiles: compiled.massingProfiles ?? [],
    facadeProfiles: compiled.facadeProfiles ?? [],
    segments,
    zones: compiled.zones,
    traversalSurfaces: [],
    wallHeightM: compiled.defaults.wall_height,
    fortifiedDoorModelAvailable: true,
    experimentalVisualCutoutMassing: true,
  });

  assert.deepEqual({ placements, segments, zones: compiled.zones }, inputSnapshot);
  assert.deepEqual(
    placements.filter((placement) => placement.kind === "facade_module"),
    apertureSnapshot,
    "massing absorption changed an authored aperture",
  );
  assert.equal("colliders" in result, false);
  assert.equal("lineOfSight" in result, false);

  for (const massingId of skylineMassingIds) {
    const massing = placements.find((placement) => placement.id === massingId);
    assert.ok(massing?.kind === "massing");
    const infill = result.instances.filter((instance) => (
      instance.placementId?.startsWith(`${massingId}:facade-infill:`)
      && instance.moduleId?.endsWith("_full_depth_boundary_massing")
    ));
    assert.ok(infill.length > 0, `${massingId} lost its full-depth skyline absorption`);
    const authoredBottomY = massing.center.z - massing.sizeM.height * 0.5;
    const authoredTopY = massing.center.z + massing.sizeM.height * 0.5;
    for (const instance of infill) {
      assert.equal(instance.meshId, "facade_wall_shell");
      assert.ok(instance.scale.x > 0 && instance.scale.x <= massing.sizeM.width + 0.001);
      assert.ok(instance.scale.y > 0);
      assert.equal(instance.scale.z, massing.sizeM.depth);
      assert.ok(instance.position.y - instance.scale.y * 0.5 >= authoredBottomY - 0.001);
      assert.ok(instance.position.y + instance.scale.y * 0.5 <= authoredTopY + 0.001);
      assert.equal(instance.wallMaterialId, massing.materialSlots.wall);
      assert.equal(instance.detailMaterialId, massing.materialSlots.wall);
      assert.equal(instance.uvProjection, "world");
      assert.equal(instance.boundaryChamfer, undefined);
    }
  }

  assert.equal(
    result.instances.some((instance) => instance.placementId === `${rugEastMassingId}:side-return:-1`),
    false,
    "the exact Rug Gate East 24cm skyline return survived",
  );
  const rugEastMassing = placements.find((placement) => placement.id === rugEastMassingId);
  const rugEastUppers = result.instances.filter((instance) => (
    instance.placementId?.startsWith(`${rugEastMassingId}:facade-infill:`)
    && instance.moduleId?.endsWith("_full_depth_boundary_massing")
  ));
  const rugEastFallbacks = result.instances.filter((instance) => (
    instance.placementId?.startsWith(`${rugEastMassingId}:facade-infill:`)
    && instance.moduleId?.endsWith("_recess_edge_fallback")
  ));
  assert.ok(rugEastMassing?.kind === "massing");
  assert.ok(rugEastUppers.length > 0);
  assert.ok(rugEastUppers.every((instance) => instance.scale.z === rugEastMassing.sizeM.depth));
  assert.ok(rugEastUppers.some((instance) => instance.scale.x >= 0.62));
  assert.ok(rugEastFallbacks.every((instance) => instance.scale.x > 0 && instance.scale.x < 0.62));
  assert.ok(rugEastFallbacks.every((instance) => instance.scale.z === 0.62));
  assert.ok(
    rugEastFallbacks.every((fallback) => rugEastUppers.some((upper) => (
      Math.abs(
        fallback.position.y + fallback.scale.y * 0.5
        - (upper.position.y - upper.scale.y * 0.5)
      ) <= 0.001
    ))),
    "the narrow source fallback escaped above its full-depth upper masonry cover",
  );

  const fullRuntimeInput = {
    placements: compiled.architecturePlacements ?? [],
    segments: [] as [],
    zones: compiled.zones,
  };
  const fullRuntimeSnapshot = structuredClone(fullRuntimeInput);
  const fullRuntime = buildV3Architecture({
    placements: fullRuntimeInput.placements,
    massingProfiles: compiled.massingProfiles ?? [],
    facadeProfiles: compiled.facadeProfiles ?? [],
    segments: fullRuntimeInput.segments,
    zones: fullRuntimeInput.zones,
    traversalSurfaces: [],
    wallHeightM: compiled.defaults.wall_height,
    fortifiedDoorModelAvailable: true,
    experimentalVisualCutoutMassing: true,
  });
  assert.deepEqual(fullRuntimeInput, fullRuntimeSnapshot);
  assert.equal("colliders" in fullRuntime, false);
  assert.equal("lineOfSight" in fullRuntime, false);

  const rugGableCourses = fullRuntime.instances.filter(
    (instance) => instance.semanticClass === "hero_gate_gable_tympanum",
  );
  assert.equal(rugGableCourses.length, 13, "Rug Gate lost its deterministic stepped masonry courses");
  assert.ok(rugGableCourses.every((instance) => (
    instance.wallMaterialId === "ph_sandstone_blocks_05"
    && instance.uvProjection === "world"
  )), "Rug Gate tympanum regained the frontage's pale plaster finish");
  const rugRakeCaps = fullRuntime.instances.filter(
    (instance) => instance.semanticClass === "hero_gate_gable_raking_cornice",
  );
  assert.equal(rugRakeCaps.length, 26);
  for (const cap of rugRakeCaps) {
    const courseIndex = Number(cap.placementId?.split(":")[2]);
    const course = rugGableCourses.find(
      (candidate) => candidate.placementId === `ARCH_RUG_GATE_STRUCTURAL_FINISH:gable-course:${courseIndex}`,
    );
    assert.ok(course, `${cap.placementId} lost its supporting gable course`);
    assert.ok(
      cap.position.x - cap.scale.x * 0.5 >= course.position.x - course.scale.x * 0.5 - 0.001
        && cap.position.x + cap.scale.x * 0.5 <= course.position.x + course.scale.x * 0.5 + 0.001,
      `${cap.placementId} regained its floating three-centimetre bearing`,
    );
    assert.equal(cap.scale.z, course.scale.z);
    assert.equal(cap.detailMaterialId, "ph_sandstone_blocks_05");
  }
  const continuousRakeCaps = fullRuntime.instances.filter(
    (instance) => instance.semanticClass === "hero_gate_gable_continuous_raking_cap",
  );
  assert.equal(continuousRakeCaps.length, 2, "Rug Gate lost its paired continuous pediment cap");
  assert.ok(continuousRakeCaps.every((instance) => (
    typeof instance.rollRad === "number"
    && Math.abs(instance.rollRad) > 0.1
    && instance.detailMaterialId?.startsWith("ph_") === true
  )));
  assert.equal(
    fullRuntime.instances.filter((instance) => instance.semanticClass === "hero_gate_gable_raking_cap_bond").length,
    3,
    "Rug Gate cornice lost its two shoulder bonds or apex bond",
  );
  assert.equal(
    fullRuntime.instances.some((instance) => instance.semanticClass === "hero_gate_gable_inlay_band"),
    false,
    "Rug Gate regained the flat full-width teal decal",
  );
  let localizedSkylineCopingCount = 0;
  for (const massingId of requiredMassingIds) {
    const massing = fullRuntimeInput.placements.find((placement) => placement.id === massingId);
    const skylineCopings = fullRuntime.instances.filter((instance) => (
      instance.placementId?.startsWith(`${massingId}:facade-infill:`)
      && instance.placementId.endsWith(":skyline-coping")
    ));
    assert.ok(massing?.kind === "massing");
    localizedSkylineCopingCount += skylineCopings.length;
    for (const skylineCoping of skylineCopings) {
      const backing = fullRuntime.instances.find(
        (instance) => instance.placementId === skylineCoping.backingPlacementId,
      );
      assert.ok(backing, `${skylineCoping.placementId} lost its backing mass`);
      assert.equal(skylineCoping.moduleId, "frontage_skyline_band_coping");
      assert.equal(skylineCoping.semanticClass, "massing_skyline_edge_coping");
      assert.equal(skylineCoping.meshId, "roof_slab");
      assert.ok(Math.abs(skylineCoping.scale.x - backing.scale.x - 0.24) <= 0.001);
      assert.equal(skylineCoping.scale.y, 0.12);
      assert.ok(Math.abs(skylineCoping.scale.z - massing.sizeM.depth - 0.24) <= 0.001);
      assert.equal(skylineCoping.structurallyBacked, true);
      assert.equal(skylineCoping.detailMaterialId, massing.materialSlots.trim);
      assert.ok(
        skylineCoping.position.y - skylineCoping.scale.y * 0.5
          >= backing.position.y + backing.scale.y * 0.5 - 0.001,
        `${skylineCoping.placementId} is not supported by its skyline mass`,
      );
    }
  }
  assert.ok(localizedSkylineCopingCount > 0, "compiled skyline absorption emitted no supported edge coping");
});

test("shallow service spine preserves its positive authored backing depth without clamping", () => {
  const spine = massingPlacement("service_storage", "SHALLOW_SERVICE_SPINE");
  const door = modulePlacement(
    "SHALLOW_SERVICE_DOOR",
    "door_storage_heavy",
    "door",
    { x: 10, y: 16, z: 1.25 },
    "service_storage",
  );
  if (spine.kind !== "massing" || door.kind !== "facade_module") throw new Error("fixture drift");
  spine.sizeM = { width: 8, depth: 0.96, height: 7 };
  spine.roof.setbackM = 0.08;
  const result = build([spine, door], true, true);
  const backing = result.instances.find(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  assert.ok(backing);
  assert.ok(Math.abs(backing.scale.z - 0.34) <= 1e-9);
  assert.ok(Math.abs(backing.position.x - (8.5 - 0.31)) <= 1e-9);
  assert.ok(Math.abs(backing.scale.x - 7.96) <= 0.001);
  assert.equal(backing.scale.y, 7);
});

test("opposing Fountain Court and Covered Souk frontages share one closed shell and skyline", () => {
  const covered = massingPlacement(
    "active_merchant",
    "ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_MASSING",
  );
  const fountain = massingPlacement(
    "active_merchant",
    "ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_MASSING",
  );
  const coveredDoor = modulePlacement(
    "ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_BAY_01",
    "door_shop_timber",
    "door",
    { x: 38.6, y: 45.36, z: 1.1 },
  );
  const fountainDoor = modulePlacement(
    "ARCH_FRONTAGE_FOUNTAIN_COURT_EAST_NORTH_BAY_01",
    "door_shop_timber",
    "door",
    { x: 38.4, y: 45.36, z: 1.1 },
  );
  if (
    covered.kind !== "massing"
    || fountain.kind !== "massing"
    || coveredDoor.kind !== "facade_module"
    || fountainDoor.kind !== "facade_module"
  ) throw new Error("fixture drift");
  covered.frontageId = "FRONTAGE_COVERED_SOUK_WEST_NORTH";
  covered.center = { x: 38.6, y: 45.36, z: 3.5 };
  covered.sizeM = { width: 2.72, depth: 4.8, height: 7 };
  covered.roof.setbackM = 0.75;
  covered.roof.upperStorySetbackM = 0.65;
  coveredDoor.frontageId = covered.frontageId;

  fountain.frontageId = "FRONTAGE_FOUNTAIN_COURT_EAST_NORTH";
  fountain.face = "east";
  fountain.yawDeg = 270;
  fountain.center = { x: 38.4, y: 45.36, z: 3.5 };
  fountain.sizeM = { width: 2.72, depth: 4.8, height: 7 };
  fountain.roof.setbackM = 0.75;
  fountain.roof.upperStorySetbackM = 0.65;
  fountainDoor.frontageId = fountain.frontageId;
  fountainDoor.face = "east";
  fountainDoor.yawDeg = 270;

  const result = build([covered, fountain, coveredDoor, fountainDoor], true, true);
  const backingVolumes = result.instances.filter(
    (instance) => instance.semanticClass === "segmented_massing_backing_volume",
  );
  assert.equal(backingVolumes.length, 1);
  const sharedBacking = backingVolumes[0]!;
  assert.equal(sharedBacking.placementId, covered.id);
  assert.ok(Math.abs(sharedBacking.scale.z - 3.76) <= 0.001);
  assert.ok(Math.abs(sharedBacking.position.x - 38.5) <= 0.001);
  assert.ok(Math.abs(sharedBacking.scale.x - 2.68) <= 0.001);
  assert.equal(sharedBacking.scale.y, 7);
  assert.ok(Math.abs(41 - (sharedBacking.position.x + sharedBacking.scale.z * 0.5) - 0.62) <= 0.001);
  assert.ok(Math.abs((sharedBacking.position.x - sharedBacking.scale.z * 0.5) - 36 - 0.62) <= 0.001);
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "segmented_massing_recess_return").length,
    0,
  );
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "segmented_massing_end_volume").length,
    0,
  );
  assert.ok(
    result.instances.some((instance) => (
      instance.placementId?.startsWith(`${covered.id}:facade-infill:`) === true
    )),
  );
  assert.ok(
    result.instances.some((instance) => (
      instance.placementId?.startsWith(`${fountain.id}:facade-infill:`) === true
    )),
  );
  const bothFaces = result.instances.filter((instance) => (
    instance.semanticClass === "facade_wall_infill"
    || instance.semanticClass === "facade_masonry_divider"
  ));
  assert.ok(bothFaces.length > 0);
  assert.ok(bothFaces.every((instance) => instance.structurallyBacked === true));
  assert.ok(bothFaces.every((instance) => instance.backingPlacementId === covered.id));
  assert.equal(
    result.instances.some((instance) => instance.placementId === `${fountain.id}:roof`),
    false,
    "the non-owner frontage must not emit a coincident roof slab",
  );
  assert.ok(result.instances.some((instance) => instance.placementId === `${covered.id}:roof`));
});

test("merchant-mid and quiet-low massing have distinct repaired bases and roofline silhouettes", () => {
  const merchant = build([massingPlacement("active_merchant", "MASS_MERCHANT", {
    heightM: 7,
    roofStyle: "setback_flat",
    roofSetbackM: 0.75,
    upperStorySetbackM: 0.65,
  })]);
  const residential = build([massingPlacement("quiet_residential", "MASS_RESIDENTIAL_LOW", {
    heightM: 4.5,
    roofStyle: "flat_parapet",
    roofSetbackM: 0.45,
    upperStorySetbackM: 0.35,
  })]);

  assert.equal(merchant.instances.filter((instance) => instance.semanticClass === "partial_upper_roof_mass").length, 1);
  assert.equal(residential.instances.filter((instance) => instance.semanticClass === "partial_upper_roof_mass").length, 0);
  assert.equal(merchant.instances.filter((instance) => instance.semanticClass === "active_merchant_localized_base").length, 1);
  assert.equal(residential.instances.filter((instance) => instance.semanticClass === "residential_plaster_repair").length, 2);
  assert.equal(
    residential.instances.filter((instance) => instance.semanticClass === "residential_localized_base_repair").length,
    1,
  );
  const merchantCornice = merchant.instances.find((instance) => instance.semanticClass === "active_merchant_roofline");
  const residentialCornice = residential.instances.find((instance) => instance.semanticClass === "quiet_residential_roofline");
  assert.ok(merchantCornice && residentialCornice);
  assert.ok(merchantCornice.scale.y > residentialCornice.scale.y);
  assert.equal(merchantCornice.meshId, "plinth_strip");
  assert.equal(residentialCornice.meshId, "facade_wall_shell");
  assert.equal(residentialCornice.wallMaterialId, materialSlots.wall);
  assert.equal(residentialCornice.trimMaterialId, null);
  assert.equal(merchant.instances.filter((instance) => instance.semanticClass === "active_merchant_parapet_silhouette").length, 1);
  assert.equal(
    residential.instances.filter((instance) => instance.semanticClass === "quiet_residential_parapet_silhouette").length,
    1,
  );
  const residentialRoofService = residential.instances.filter(
    (instance) => instance.moduleId === "seeded_rooftop_service_cluster",
  );
  assert.ok(
    residentialRoofService.length === 0 || residentialRoofService.length === 4,
    "seeded flat-roof service grammar must emit one complete pad/vent/cap/exhaust cluster or none",
  );
  assert.ok(
    residentialRoofService.every((instance) => (
      instance.semanticClass?.startsWith("roof_") === true
      || instance.semanticClass === "grounded_rooftop_service_pad"
    )),
    "rooftop service grammar emitted an unclassified loose primitive",
  );
  assert.ok(
    (merchant.instances.find((instance) => instance.semanticClass === "active_merchant_parapet_silhouette")?.position.x ?? 0)
      > 8.5,
    "front parapet accent must face the playable route rather than the closed shell back",
  );
});

test("Spawn B shallow skyline roofs receive complete edge-seated exhaust fixtures", () => {
  const placement = massingPlacement(
    "quiet_residential",
    "ARCH_FRONTAGE_SPAWN_B_SOUTH_WEST_MASSING",
    {
      heightM: 4.9,
      roofStyle: "flat_parapet",
      roofSetbackM: 0.08,
      upperStorySetbackM: 0,
    },
  ) as V3ArchitectureMassingPlacement;
  placement.sizeM = { width: 2.64, depth: 0.96, height: 4.9 };
  placement.roof = {
    style: "flat_parapet",
    setbackM: 0.08,
    parapetHeightM: 0.45,
    upperStorySetbackM: 0,
    elevationM: 4.9,
  };
  const result = build([placement]);
  const fixture = result.instances.filter(
    (instance) => instance.moduleId === "shallow_roof_skyline_fixture",
  );
  assert.equal(fixture.length, 3);
  assert.deepEqual(
    fixture.map((instance) => instance.semanticClass).sort(),
    ["grounded_rooftop_service_pad", "roof_exhaust_cap", "roof_exhaust_stack"],
  );
  assert.ok(
    fixture.every((instance) => (
      Math.hypot(instance.position.x - 8.5, instance.position.z - 16)
      <= placement.sizeM.width * 0.5
    )),
    "shallow skyline fixture escaped the authored roof width",
  );
});

test("closed merchant doors derive generic displays and supported hoods from their opening", () => {
  const door = modulePlacement(
    "CLOSED_MERCHANT_DOOR_OCCUPANCY",
    "door_shop_timber",
    "door",
    { x: 10, y: 16, z: 1.35 },
  );
  door.sizeM = { width: 1.15, depth: 0.22, height: 2.7 };
  const result = build([
    massingPlacement("active_merchant", "CLOSED_MERCHANT_DOOR_MASS"),
    door,
  ], true, true);
  const display = result.instances.find((instance) => (
    instance.semanticClass === "active_merchant_generic_door_display"
  ));
  const stock = result.instances.find((instance) => (
    instance.semanticClass === "active_merchant_generic_door_stock"
  ));
  const awning = result.instances.find((instance) => (
    instance.placementId === `${door.id}:awning`
  ));
  assert.ok(display && stock && awning);
  const doorClearHalfWidthM = door.sizeM.width * 0.5;
  const displayNearestDoorEdgeM = Math.abs(display.position.z - door.center.z) - display.scale.x * 0.5;
  assert.ok(
    displayNearestDoorEdgeM >= doorClearHalfWidthM + 0.1,
    "closed-shop display entered the full door-leaf clear strip",
  );
  assert.ok(
    Math.abs(stock.position.z - display.position.z) <= 0.001,
    "closed-shop stock detached from its side plinth",
  );
  assert.ok(Math.abs(awning.scale.x - door.sizeM.width) <= 0.2);
  assert.equal(
    result.instances.filter((instance) => instance.placementId?.startsWith(`${door.id}:awning-pole:`)).length,
    2,
  );
  assert.equal(
    result.instances.some((instance) => instance.placementId?.startsWith(`${door.id}:sign-mount:`)),
    false,
    "closed shop hood regained unattached sign mounts",
  );
  assert.equal("colliders" in result, false, "render-only closed-shop occupancy changed gameplay authority");
});

test("service-storage doors are a heavy door in an untinted stone surround with no stall, goods, or awning", () => {
  const door = modulePlacement(
    "COURT_SERVICE_STORAGE_OCCUPANCY",
    "door_storage_heavy",
    "door",
    { x: 10, y: 16, z: 1.35 },
    "service_storage",
  );
  door.sizeM = { width: 2.4, depth: 1.35, height: 2.7 };
  const result = build([
    massingPlacement("service_storage", "COURT_SERVICE_STORAGE_MASS"),
    door,
  ], true, true);
  assert.equal(
    result.instances.filter((instance) => instance.moduleId === "service_storage_served_loading_bay").length,
    0,
    "storage door regained its loading apron or stock",
  );
  assert.equal(
    result.instances.some((instance) => instance.placementId?.startsWith(`${door.id}:awning`)),
    false,
    "storage door regained an awning",
  );
  const frame = result.instances.filter((instance) => instance.semanticClass === "service_storage_door_frame");
  assert.equal(frame.length, 3, "storage door lost its two jambs and lintel");
  assert.ok(frame.every((instance) => instance.detailTintHex === undefined), "stone surround was tinted");
  assert.ok(result.instances.some((instance) => instance.semanticClass === "door_threshold"));
  assert.equal("colliders" in result, false, "render-only storage occupancy changed gameplay authority");
});

test("authored openings replace repetitive facade-wide dividers and story courses", () => {
  const merchant = build([
    massingPlacement("active_merchant", "MASS_MERCHANT_BAYS"),
    modulePlacement("MERCHANT_BAY_A", "shop_recess_market", "shop_recess", { x: 10, y: 13.5, z: 1.35 }),
    modulePlacement("MERCHANT_BAY_B", "door_shop_timber", "door", { x: 10, y: 18.5, z: 1.175 }),
  ]);
  const residential = build([
    massingPlacement("quiet_residential", "MASS_RESIDENTIAL_BAYS"),
    modulePlacement(
      "RESIDENTIAL_BAY_A",
      "door_residential_timber",
      "door",
      { x: 10, y: 13.5, z: 1.125 },
      "quiet_residential",
    ),
    modulePlacement(
      "RESIDENTIAL_BAY_B",
      "window_dark_recess",
      "window",
      { x: 10, y: 18.5, z: 3.4 },
      "quiet_residential",
    ),
  ]);

  assert.equal(
    merchant.instances.filter((instance) => instance.semanticClass?.endsWith("facade_bay_divider")).length,
    0,
  );
  assert.equal(
    residential.instances.filter((instance) => instance.semanticClass?.endsWith("facade_bay_divider")).length,
    0,
  );
  assert.equal(
    merchant.instances.filter((instance) => instance.semanticClass === "active_merchant_facade_edge_support").length,
    2,
  );
  assert.equal(
    residential.instances.filter((instance) => instance.semanticClass === "quiet_residential_facade_edge_support").length,
    0,
  );
  assert.ok(
    merchant.instances
      .filter((instance) => instance.semanticClass === "active_merchant_facade_edge_support")
      .every((instance) => instance.scale.y <= 3.5),
    "merchant corner masonry must stop at the shop storey",
  );
  assert.equal(merchant.instances.filter((instance) => instance.semanticClass?.endsWith("facade_story_course")).length, 0);
  assert.equal(residential.instances.filter((instance) => instance.semanticClass?.endsWith("facade_story_course")).length, 0);
});

test("hero courtyard massing ties its arch, screen, ordinary door, and landmark bay into one frontage", () => {
  const arch = modulePlacement(
    "HERO_ARCH",
    "arch_hero_courtyard",
    "arch",
    { x: 10, y: 13.5, z: 2.425 },
    "hero_courtyard",
  );
  const window = modulePlacement(
    "HERO_WINDOW",
    "window_landmark_stained",
    "window",
    { x: 10, y: 18.5, z: 4.325 },
    "hero_courtyard",
  );
  const screen = modulePlacement(
    "HERO_SCREEN",
    "window_screened",
    "window",
    { x: 10, y: 16, z: 1.95 },
    "hero_courtyard",
  );
  const door = modulePlacement(
    "HERO_DOOR",
    "door_residential_timber",
    "door",
    { x: 10, y: 18.5, z: 1.125 },
    "hero_courtyard",
  );
  if (
    arch.kind !== "facade_module"
    || window.kind !== "facade_module"
    || screen.kind !== "facade_module"
    || door.kind !== "facade_module"
  ) throw new Error("fixture drift");
  arch.sizeM = { width: 4.2, depth: 0.5, height: 4.85 };
  window.sizeM = { width: 1.2, depth: 0.25, height: 1.75 };
  screen.sizeM = { width: 1, depth: 0.24, height: 1.4 };
  door.sizeM = { width: 1.05, depth: 0.2, height: 2.25 };
  const result = build([
    massingPlacement("hero_courtyard", "MASS_HERO_COURT", {
      heightM: 9.5,
      roofStyle: "setback_flat",
      roofSetbackM: 1.05,
      upperStorySetbackM: 0.95,
    }),
    arch,
    screen,
    door,
    window,
  ]);

  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_courtyard_facade_edge_support").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_courtyard_facade_bay_divider").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_courtyard_facade_story_course").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_courtyard_parapet_pier").length, 2);
  assert.ok(result.instances.some((instance) => instance.meshId === "arch_pointed_frame"));
  const archAccent = result.instances.find((instance) => instance.semanticClass === "hero_arch_accent");
  assert.ok(archAccent && archAccent.scale.x < 0.5, "hero accent must remain a restrained keystone");
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_arch_masonry_return").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_arch_timber_screen").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "screened_arch_interior").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_arch_closed_double_door").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_arch_double_door_center_seam").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_arch_door_joinery").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "hero_arch_double_door_handle").length, 0);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "open_arch_threshold").length, 1);
  assert.equal(result.instances.filter((instance) => instance.semanticClass?.startsWith("hero_arch_column_")).length, 4);
  assert.equal(result.instances.find((instance) => instance.placementId === "HERO_DOOR")?.meshId, "door_panel_timber");
  assert.equal(
    result.instances.filter((instance) => instance.placementId?.startsWith("HERO_SCREEN:screen-")).length,
    5,
  );
});

test("elevated terrace and ramp foundations close visible under-surface gaps without colliders", () => {
  const result = buildV3Architecture({
    placements: [massingPlacement()],
    massingProfiles,
    facadeProfiles,
    segments: [{ orientation: "vertical", coord: 10, start: 10, end: 22, outward: -1 }],
    zones,
    traversalSurfaces: [
      { id: "TERRACE", zoneId: "ARBITRARY_ZONE_ID", kind: "flat", rect: { x: 10, y: 10, w: 8, h: 4 }, elevationM: 1.4 },
      {
        id: "RAMP",
        zoneId: "ARBITRARY_ZONE_ID",
        kind: "ramp",
        rect: { x: 10, y: 14, w: 8, h: 8 },
        axis: "y",
        startElevationM: 0,
        endElevationM: 1.4,
        visualStyle: "ramp",
      },
    ],
    wallHeightM: 9.5,
    fortifiedDoorModelAvailable: false,
  });
  const foundations = result.instances.filter((instance) => instance.moduleId === "elevation_foundation");
  assert.equal(foundations.filter((instance) => instance.semanticClass === "terrace_retaining_mass").length, 1);
  assert.equal(foundations.filter((instance) => instance.semanticClass === "ramp_foundation").length, 9);
  assert.ok(foundations.every((instance) => instance.meshId === "facade_wall_shell"));
  const terraceFoundation = foundations.find((instance) => instance.semanticClass === "terrace_retaining_mass")!;
  const terraceBottomM = terraceFoundation.position.y - terraceFoundation.scale.y * 0.5;
  const terraceTopM = terraceFoundation.position.y + terraceFoundation.scale.y * 0.5;
  assert.ok(Math.abs(terraceBottomM) < 1e-6, "terrace retaining mass must remain grounded at y=0");
  assert.ok(
    terraceTopM < 1.39 && terraceTopM > 1.36,
    `terrace retaining top must clear the authored 1.4m paving plane, got ${terraceTopM}`,
  );
  const cheeks = result.instances.filter((instance) => instance.semanticClass === "ramp_retaining_cheek");
  const caps = result.instances.filter((instance) => instance.semanticClass === "ramp_retaining_cap");
  assert.equal(cheeks.length, 18);
  assert.equal(caps.length, 2);
  assert.ok(caps.every((instance) => instance.meshId === "plinth_strip"));
  assert.ok(caps.every((instance) => Math.abs(instance.pitchRad ?? 0) > 0.1));
  assert.ok(cheeks.every((instance) => instance.scale.y <= 1.4));
});

test("v3 merchant modules emit supported awnings, ordinary timber doors, and dark shuttered windows", () => {
  const result = build([
    massingPlacement(),
    modulePlacement("MOD_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 14, z: 1.1 }),
    modulePlacement("MOD_DOOR", "door_shop_timber", "door", { x: 10, y: 17, z: 1.1 }),
    modulePlacement("MOD_WINDOW", "window_shuttered", "window", { x: 10, y: 19, z: 4.3 }),
  ]);
  assert.equal(result.doorModelPlacements.length, 0, "ordinary doors must not use the castle model");
  assert.ok(result.instances.some((instance) => instance.moduleId === "awning_supported"));
  assert.equal(
    result.instances.filter((instance) => instance.placementId?.startsWith("MOD_SHOP:awning-pole:")).length,
    2,
  );
  assert.ok(result.instances.some((instance) => instance.meshId === "awning_valance"));
  assert.ok(
    result.instances.filter((instance) => instance.moduleId === "awning_support_pole")
      .every((instance) => Math.abs(instance.pitchRad ?? 0) > 0.5),
    "awning supports regressed to unsupported vertical stubs",
  );
  const shopRecess = result.instances.find((instance) => instance.placementId === "MOD_SHOP");
  assert.match(shopRecess?.meshId ?? "", /^shop_recess(?:_timber)?_back$/);
  assert.equal(shopRecess?.scale.z, 0.06, "shop backing must be a thin inset plane, not a brown block");
  assert.equal(typeof shopRecess?.detailTintHex, "number");
  assert.equal(shopRecess?.uvProjection, "world");
  const interiorReturns = result.instances.filter((instance) => instance.semanticClass === "merchant_interior_return");
  assert.equal(interiorReturns.length, 2);
  assert.ok(interiorReturns.every((instance) => /^shop_recess(?:_timber)?_back$/.test(instance.meshId)));
  assert.ok(interiorReturns.every((instance) => typeof instance.detailTintHex === "number"));
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_interior_ceiling").length, 1);
  const timberSurround = result.instances.filter((instance) => instance.semanticClass === "merchant_timber_surround");
  assert.equal(timberSurround.length, 3);
  assert.ok(timberSurround.every((instance) => instance.scale.z >= 0.56));
  assert.ok(timberSurround.every((instance) => instance.trimMaterialId?.startsWith("ph_")));
  const portalSill = result.instances.find((instance) => instance.semanticClass === "merchant_timber_portal_sill");
  assert.ok(portalSill && portalSill.scale.z >= 0.56);
  assert.match(portalSill.trimMaterialId ?? "", /^ph_/);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_display_frame").length, 4);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_counter_joinery").length, 4);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_interior_shelf").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_interior_shelf_support").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "merchant_louvered_shutter").length, 2);
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "merchant_sign_support").length,
    0,
    "awning emitter created detached sign hardware without a served signboard",
  );
  assert.ok(result.instances.some((instance) => instance.semanticClass === "canopy_attachment_ledger"));
  const door = result.instances.find((instance) => instance.placementId === "MOD_DOOR");
  assert.equal(door?.meshId, "door_panel_shop");
  assert.equal(door?.semanticClass, "ordinary_door");
  assert.match(door?.detailMaterialId ?? door?.trimMaterialId ?? "", /^ph_/);
  assert.ok((door?.scale.z ?? 0) >= 0.12, "ordinary door lost its constructed relief depth");
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "active_merchant_door_joinery").length, 5);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "active_merchant_door_hinge").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "active_merchant_door_hinge_pin").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "active_merchant_door_handle").length, 1);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "active_merchant_door_handle_backplate").length, 1);
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "active_merchant_generic_door_display").length,
    2,
    "closed shop display should include its masonry base and capping course",
  );
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "active_merchant_generic_door_stock").length,
    1,
  );
  assert.equal(
    result.instances.filter((instance) => instance.placementId?.startsWith("MOD_DOOR:awning-pole:")).length,
    2,
    "closed shop bay lost its opening-edge canopy supports",
  );
  assert.ok(result.instances.some((instance) => instance.semanticClass === "door_threshold"));
  const windowRecess = result.instances.find((instance) => instance.placementId === "MOD_WINDOW");
  assert.equal(windowRecess?.meshId, "window_recess_dark");
  assert.equal(windowRecess?.semanticClass, "dark_window_recess");
  assert.ok((windowRecess?.scale.z ?? 0) >= 0.18);
  const windowShutters = result.instances.filter((instance) => instance.semanticClass === "window_shutter");
  assert.equal(windowShutters.length, 2);
  assert.ok(windowShutters.every((instance) => instance.scale.z >= 0.1));
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "window_shutter_hinge").length, 4);
  const windowScreens = result.instances.filter((instance) => instance.semanticClass === "window_screen");
  assert.ok(windowScreens.length >= 5 && windowScreens.length <= 12);
  assert.ok(result.instances.some((instance) => instance.semanticClass === "active_merchant_wall_base_contact"));
  const upperScreenSlab = result.instances.find(
    (instance) => instance.semanticClass === "active_merchant_upper_screen_slab",
  );
  assert.ok(upperScreenSlab, "upper merchant bay lost its restrained projecting timber screen");
  assert.ok(
    upperScreenSlab.position.y - upperScreenSlab.scale.y * 0.5 >= 2.7,
    "upper merchant screen violates player headroom",
  );
  assert.match(upperScreenSlab.detailMaterialId ?? "", /^ph_/);
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "active_merchant_upper_timber_screen").length,
    5,
  );
});

test("residential and service modules retain visibly different construction grammar", () => {
  const residential = build([
    massingPlacement("quiet_residential", "MASS_RESIDENTIAL"),
    modulePlacement(
      "DOOR_RESIDENTIAL",
      "door_residential_timber",
      "door",
      { x: 10, y: 15, z: 1.125 },
      "quiet_residential",
    ),
  ]);
  const service = build([
    massingPlacement("service_storage", "MASS_SERVICE"),
    modulePlacement(
      "DOOR_SERVICE",
      "door_storage_heavy",
      "door",
      { x: 10, y: 15, z: 1.25 },
      "service_storage",
    ),
  ]);

  assert.equal(
    residential.instances.find((instance) => instance.placementId === "DOOR_RESIDENTIAL")?.meshId,
    "door_panel_timber",
  );
  assert.equal(
    service.instances.find((instance) => instance.placementId === "DOOR_SERVICE")?.meshId,
    "door_panel_storage",
  );
  assert.equal(
    residential.instances.find((instance) => instance.placementId === "DOOR_RESIDENTIAL")?.semanticClass,
    "ordinary_door",
  );
  assert.equal(
    residential.instances.filter((instance) => instance.semanticClass === "quiet_residential_door_joinery").length,
    4,
  );
  assert.equal(residential.instances.filter((instance) => instance.moduleId === "awning_supported").length, 0);
  assert.equal(residential.instances.filter((instance) => instance.semanticClass === "active_merchant_bay").length, 0);
  assert.equal(
    residential.instances.filter((instance) => instance.semanticClass === "service_storage_door_strap").length,
    0,
  );
  assert.equal(
    service.instances.filter((instance) => instance.semanticClass === "service_storage_door_strap").length,
    2,
  );
  const residentialBase = residential.instances.find(
    (instance) => instance.semanticClass === "quiet_residential_wall_base_contact",
  );
  const serviceBase = service.instances.find(
    (instance) => instance.semanticClass === "service_storage_wall_base_contact",
  );
  assert.ok(residentialBase && serviceBase);
  assert.ok(serviceBase.scale.y > residentialBase.scale.y, "service plinth must read heavier than residential trim");
  assert.ok(serviceBase.scale.z > residentialBase.scale.z, "service plinth must project farther than residential trim");
});

test("blind and service apertures remain explicitly closed", () => {
  const blind = build([
    massingPlacement("quiet_residential", "MASS_BLIND_NICHE"),
    modulePlacement(
      "BLIND_NICHE_CLOSED",
      "blind_niche",
      "blind_niche",
      { x: 10, y: 16, z: 1.4 },
      "quiet_residential",
    ),
  ], true, true);
  const service = build([
    massingPlacement("service_storage", "MASS_SERVICE_LEAF"),
    modulePlacement(
      "SERVICE_LEAF_CLOSED",
      "door_storage_heavy",
      "door",
      { x: 10, y: 16, z: 1.25 },
      "service_storage",
    ),
  ], true, true);
  assert.equal(blind.instances.find((instance) => instance.placementId === "BLIND_NICHE_CLOSED")?.meshId, "niche_recess_back");
  assert.equal(blind.instances.filter((instance) => instance.semanticClass === "blind_niche_masonry_return").length, 3);
  assert.equal(service.instances.find((instance) => instance.placementId === "SERVICE_LEAF_CLOSED")?.meshId, "door_panel_storage");
  assert.equal(
    [...blind.instances, ...service.instances].some(
      (instance) => instance.meshId === "door_void" || instance.meshId === "door_void_arch",
    ),
    false,
  );
});

test("constructed merchant-bay output is deterministic", () => {
  const placements = [
    massingPlacement(),
    modulePlacement("MOD_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 14, z: 1.35 }),
    modulePlacement("MOD_DOOR", "door_shop_timber", "door", { x: 10, y: 17, z: 1.175 }),
    modulePlacement("MOD_WINDOW", "window_shuttered", "window", { x: 10, y: 17, z: 3.575 }),
  ];
  assert.deepEqual(build(placements), build(placements));
});

test("noninteractive arches are shallow masonry-framed recesses, never deep black blocks", () => {
  const result = build([
    massingPlacement(),
    modulePlacement("MOD_ARCH", "arch_arcade", "arch", { x: 10, y: 16, z: 1.8 }),
  ]);
  const recess = result.instances.find((instance) => instance.placementId === "MOD_ARCH");
  assert.equal(recess?.meshId, "arch_recess_back");
  assert.equal(recess?.semanticClass, "screened_arch_interior");
  // The bay back is the frontage's own plastered wall, not a boarded timber
  // panel: on the timber source a 2 m tile stretched across the whole plane and
  // read as pale straw planking wherever the arcade caught sun.
  assert.equal(recess?.detailMaterialId, materialSlots.wall);
  assert.ok((recess?.scale.z ?? 1) <= 0.1, "arch recess became a deep protruding volume");
  assert.ok((recess?.scale.y ?? Infinity) < 2.2, "default fixture backing unexpectedly fills the full arch height");
  assert.equal(result.instances.some((instance) => instance.meshId === "door_void_arch"), false);
  assert.equal(result.instances.some((instance) => instance.meshId === "door_arch_lintel"), false);
  const frame = result.instances.find((instance) => instance.meshId === "arch_pointed_frame");
  assert.ok(frame);
  assert.equal(frame.rollRad, undefined);
  assert.ok(frame.scale.z >= 0.18, "masonry frame lost its constructed reveal depth");
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "arcade_arch").length, 1);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "arcade_arch_masonry_return").length, 2);
  assert.equal(result.instances.filter((instance) => instance.semanticClass?.startsWith("arcade_arch_column_")).length, 4);
  assert.equal(result.instances.filter((instance) => instance.semanticClass === "screened_arch_threshold").length, 1);
  const grille = result.instances.filter((instance) => instance.semanticClass === "arcade_arch_complete_grille");
  assert.equal(grille.length, 12);
  assert.ok(grille.every((instance) => instance.detailMaterialId === "tm_arch_screen_dark"));
  assert.equal(
    result.instances.filter((instance) => instance.semanticClass === "covered_arcade_generic_merchant_counter").length,
    2,
    "served arcade kiosk lost its counter front/top baseline",
  );
  assert.ok(
    result.instances.filter((instance) => instance.semanticClass === "covered_arcade_generic_merchant_stock").length >= 2,
    "served arcade kiosk lost its visible generic stock baseline",
  );
  assert.equal(
    result.instances.filter((instance) => instance.placementId?.startsWith("MOD_ARCH:awning-pole:")).length,
    2,
    "served arcade kiosk lost its opening-edge canopy supports",
  );
  assert.equal(result.instances.some((instance) => instance.semanticClass?.includes("timber_dado")), false);
});

test("noninteractive apertures emit explicit readable closures with bounded reveal depth", () => {
  const shop = build([
    massingPlacement(),
    modulePlacement("CLOSED_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 16, z: 1.35 }),
  ], true, true);
  const door = build([
    massingPlacement(),
    modulePlacement("CLOSED_DOOR", "door_shop_timber", "door", { x: 10, y: 16, z: 1.175 }),
  ], true, true);
  const window = build([
    massingPlacement(),
    modulePlacement("CLOSED_WINDOW", "window_screened", "window", { x: 10, y: 16, z: 3.4 }),
  ], true, true);
  const arch = build([
    massingPlacement(),
    modulePlacement("CLOSED_ARCH", "arch_arcade", "arch", { x: 10, y: 16, z: 1.8 }),
  ], true, true);

  const shopBacking = shop.instances.find((instance) => instance.placementId === "CLOSED_SHOP");
  assert.match(shopBacking?.wallMaterialId ?? shopBacking?.detailMaterialId ?? "", /^ph_/);
  assert.ok((shopBacking?.visualQaDimensions?.z ?? 0) >= 0.5);
  assert.ok(shop.instances.some((instance) => instance.semanticClass === "merchant_interior_shelf"));
  assert.ok(shop.instances.some((instance) => instance.semanticClass === "merchant_interior_return"));
  assert.ok(shop.instances.some((instance) => instance.semanticClass === "merchant_interior_floor"));

  const doorLeaf = door.instances.find((instance) => instance.placementId === "CLOSED_DOOR");
  assert.equal(doorLeaf?.meshId, "door_panel_shop");
  assert.equal(doorLeaf?.semanticClass, "ordinary_door");
  assert.match(doorLeaf?.detailMaterialId ?? doorLeaf?.trimMaterialId ?? "", /^ph_/);

  const windowBacking = window.instances.find((instance) => instance.placementId === "CLOSED_WINDOW");
  assert.equal(windowBacking?.meshId, "window_recess_dark");
  assert.equal(windowBacking?.detailMaterialId, "tm_window_interior_merchant");
  assert.ok((windowBacking?.scale.z ?? Infinity) > 0 && (windowBacking?.scale.z ?? Infinity) <= 0.1);
  assert.ok((windowBacking?.visualQaDimensions?.z ?? 0) >= 0.28);
  const windowScreenBars = window.instances.filter((instance) => instance.semanticClass === "window_screen");
  assert.ok(windowScreenBars.length >= 5 && windowScreenBars.length <= 12);

  const archBacking = arch.instances.find((instance) => instance.placementId === "CLOSED_ARCH");
  assert.equal(archBacking?.detailMaterialId, materialSlots.wall);
  assert.ok((archBacking?.scale.y ?? Infinity) < 2.1, "arch backing regressed to a full-height tan slab");
  assert.ok((archBacking?.visualQaDimensions?.z ?? 0) >= 0.4);
  const returns = arch.instances.filter((instance) => instance.semanticClass === "arcade_arch_masonry_return");
  assert.equal(returns.length, 2);
  assert.ok(returns.every((instance) => instance.scale.z >= 0.3 && instance.scale.z <= 0.8));
  const spandrel = arch.instances.find((instance) => instance.semanticClass === "arcade_arch_spandrel");
  assert.equal(spandrel?.wallMaterialId, materialSlots.wall);
  assert.equal(spandrel?.detailMaterialId, spandrel?.wallMaterialId);
  assert.equal(spandrel?.uvProjection, "world");
  const archFrame = arch.instances.find((instance) => instance.semanticClass === "arcade_arch");
  assert.ok(archFrame);
  assert.match(archFrame.detailMaterialId ?? "", /^ph_/);
  assert.equal(archFrame.uvProjection, "world");
  assert.ok(
    archFrame.scale.x <= 1.4 && archFrame.scale.y <= 2.2 && archFrame.scale.z <= 0.25,
    "arch surround escaped its authored aperture bounds",
  );
  const completeGrille = arch.instances.filter((instance) => instance.semanticClass === "arcade_arch_complete_grille");
  assert.equal(completeGrille.length, 12);

  const allApertureInstances = [shop, door, window, arch].flatMap((result) => result.instances);
  assert.equal(
    allApertureInstances.some((instance) => instance.meshId === "door_void" || instance.meshId === "door_void_arch"),
    false,
    "a noninteractive bay regressed to a black passable-looking void",
  );

  const previousWindow = Reflect.get(globalThis, "window");
  const previousDocument = Reflect.get(globalThis, "document");
  const image = {
    addEventListener() {},
    removeEventListener() {},
    set src(_value: string) {},
    crossOrigin: "",
  };
  Reflect.set(globalThis, "window", { location: { href: "http://localhost/" } });
  Reflect.set(globalThis, "document", { createElementNS: () => image });
  try {
    const wallMaterials = {
      getMaterialIds: () => [
        materialSlots.wall,
        materialSlots.trim,
        "ph_rough_pine_door",
        "ph_stone_trim_sandstone",
      ],
      createStandardMaterial: () => new MeshStandardMaterial({ color: 0xb8aa92 }),
      getTileSizeM: () => 2,
    } as unknown as WallMaterialLibrary;
    const readableBackings = [shopBacking, windowBacking, archBacking].filter(
      (instance): instance is WallDetailInstance => Boolean(instance),
    );
    const root = buildWallDetailMeshes(readableBackings, {
      highVis: false,
      wallMode: "pbr",
      wallMaterials,
      quality: "1k",
      seed: 23,
    });
    assert.equal(root.children.length, 3);
    for (const child of root.children) {
      const mesh = child as InstancedMesh;
      assert.ok(!Array.isArray(mesh.material));
      assert.ok(mesh.material instanceof MeshStandardMaterial);
      const { r, g, b } = mesh.material.color;
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const minimumLuminance = mesh.name.includes("tm_arch_interior_warm") ? 0.055 : 0.045;
      assert.ok(luminance > minimumLuminance, `${mesh.name} regressed to a near-black backing (${luminance})`);
      assert.match(mesh.name, /wall-detail-(shop_recess|window_recess|arch_recess)/);
    }

    const frameRoot = buildWallDetailMeshes([archFrame], {
      highVis: false,
      wallMode: "pbr",
      wallMaterials: {
        ...wallMaterials,
        getMaterialIds: () => [materialSlots.wall, materialSlots.trim],
      } as unknown as WallMaterialLibrary,
      quality: "1k",
      seed: 23,
    });
    assert.equal(frameRoot.children.length, 1);
    const frameGeometry = (frameRoot.children[0] as InstancedMesh).geometry;
    frameGeometry.computeBoundingBox();
    const bounds = frameGeometry.boundingBox;
    assert.ok(bounds);
    const frameExtents = [
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z,
    ];
    assert.ok(frameExtents.every((extent) => Number.isFinite(extent) && extent > 0));

    const spandrelRoot = buildWallDetailMeshes([spandrel], {
      highVis: false,
      wallMode: "pbr",
      wallMaterials,
      quality: "1k",
      seed: 23,
    });
    assert.equal(spandrelRoot.children.length, 1);
    const spandrelMesh = spandrelRoot.children[0] as InstancedMesh;
    assert.match(spandrelMesh.name, new RegExp(materialSlots.wall));
    assert.ok(!Array.isArray(spandrelMesh.material));
    assert.ok(spandrelMesh.material instanceof MeshStandardMaterial);

  } finally {
    if (typeof previousWindow === "undefined") Reflect.deleteProperty(globalThis, "window");
    else Reflect.set(globalThis, "window", previousWindow);
    if (typeof previousDocument === "undefined") Reflect.deleteProperty(globalThis, "document");
    else Reflect.set(globalThis, "document", previousDocument);
  }
});

test("screened windows use open grille bars and retain a real sill", () => {
  const result = build([
    massingPlacement(),
    modulePlacement("MOD_SCREEN", "window_screened", "window", { x: 10, y: 16, z: 4 }),
  ]);
  assert.equal(result.instances.some((instance) => instance.meshId === "window_screen"), false);
  const bars = result.instances.filter((instance) => instance.meshId === "window_screen_bar");
  assert.ok(bars.length >= 5 && bars.length <= 12, "screen grille left its bounded density range");
  assert.ok(bars.some((instance) => instance.scale.x < instance.scale.y), "screen lost its vertical grille bars");
  assert.ok(bars.some((instance) => instance.scale.x > instance.scale.y), "screen lost its horizontal grille rails");
  assert.ok(result.instances.some((instance) => instance.semanticClass === "window_sill"));
});

test("only the explicit fortified-gate module may instantiate the castle door", () => {
  const fortified = modulePlacement("MOD_GATE", "door_fortified_gate", "door", { x: 10, y: 16, z: 1.5 });
  const desktop = build([massingPlacement(), fortified], true);
  assert.equal(desktop.doorModelPlacements.length, 1);
  assert.equal(desktop.doorModelPlacements[0]?.modelId, "ph_large_castle_door");
  assert.equal(desktop.instances.some((instance) => instance.meshId === "door_panel_fortified"), false);

  const reducedDetail = build([massingPlacement(), fortified], false);
  assert.equal(reducedDetail.doorModelPlacements.length, 0);
  assert.ok(reducedDetail.instances.some((instance) => instance.meshId === "door_panel_fortified"));
});

test("v3 renderer rejects unresolved modules and refuses to bury future collision openings", () => {
  const unknown = modulePlacement("MOD_UNKNOWN", "made_up_module", "window", { x: 10, y: 16, z: 4 });
  assert.throws(() => build([massingPlacement(), unknown]), /outside profile/);

  const connector = modulePlacement("MOD_OPEN", "door_shop_timber", "door", { x: 10, y: 16, z: 1.2 });
  if (connector.kind !== "facade_module") throw new Error("fixture drift");
  connector.collisionOpening = true;
  assert.throws(
    () => build([massingPlacement(), connector], true, true),
    /cannot place a closed backing volume behind collision opening 'MOD_OPEN'/,
  );
});

test("the single Blender textile booth replaces furnishings but preserves its masonry", () => {
  const targetId = "ARCH_FRONTAGE_COVERED_SOUK_EAST_GROUND_02";
  const target = modulePlacement(targetId, "arch_arcade", "arch", { x: 10, y: 16, z: 1.8 });
  const neighbor = modulePlacement("NEIGHBOR_ARCH", "arch_arcade", "arch", { x: 10, y: 20, z: 1.8 });
  const result = build([massingPlacement(), target, neighbor]);
  const own = result.instances.filter((instance) => instance.placementId?.startsWith(targetId));
  const adjacent = result.instances.filter((instance) => instance.placementId?.startsWith(neighbor.id));
  const furniture = (instance: WallDetailInstance) => instance.moduleId === "covered_arcade_served_kiosk"
    || instance.semanticClass === "arcade_arch_complete_grille"
    || instance.placementId?.includes("awning");
  assert.equal(own.filter(furniture).length, 0);
  assert.ok(adjacent.some(furniture));
  for (const semantic of ["arcade_arch", "screened_arch_interior", "screened_arch_threshold", "arcade_arch_masonry_return"]) {
    assert.equal(
      own.filter((instance) => instance.semanticClass === semantic).length,
      adjacent.filter((instance) => instance.semanticClass === semantic).length,
    );
  }
});
