import assert from "node:assert/strict";
import test from "node:test";
import { parseBlockoutSpec } from "./types";

function makeLegacyRuntime() {
  return {
    mapId: "bazaar-map",
    playable_boundary: { x: 0, y: 0, w: 20, h: 12 },
    defaults: {
      wall_height: 7,
      wall_thickness: 0.35,
      ceiling_height: 10,
      floor_height: 0,
    },
    zones: [
      { id: "ZONE_FLAT", type: "spawn_plaza", rect: { x: 0, y: 0, w: 10, h: 10 }, label: "", notes: "" },
    ],
    constraints: {
      min_path_width_main_lane: 6,
      min_path_width_side_halls: 4.5,
    },
  };
}

function makeV3Runtime() {
  return {
    ...makeLegacyRuntime(),
    formatVersion: "3.0",
    mapCenter: { x: 10, y: 6 },
    wall_details: {
      enabled: true,
      style: "bazaar",
      density: 0.4,
      maxProtrusion: 0.73,
      seed: 7,
    },
    zones: [
      {
        id: "ZONE_FLAT",
        type: "spawn_plaza",
        rect: { x: 0, y: 0, w: 10, h: 10 },
        label: "Flat court",
        notes: "Ground court",
        surfaceId: "SURFACE_FLAT",
        districtId: "DISTRICT_SPICE",
        macroLane: "west",
        floorMaterialId: "limestone",
        facadeProfileId: "merchant",
        clearWidthM: 4,
      },
      {
        id: "ZONE_RAMP",
        type: "connector",
        rect: { x: 10, y: 0, w: 8, h: 8 },
        label: "Terrace stairs",
        notes: "Analytic ramp with visual treads",
        surfaceId: "SURFACE_RAMP",
        districtId: "DISTRICT_SPICE",
        macroLane: "west",
      },
    ],
    exterior_wall_patches: [
      { orientation: "vertical", coord: 10, start: 0, end: 8, outward: 1 },
    ],
    districts: [{ id: "DISTRICT_SPICE", label: "Spice Street" }],
    traversalSurfaces: [
      {
        id: "SURFACE_FLAT",
        zoneId: "ZONE_FLAT",
        kind: "flat",
        rect: { x: 0, y: 0, w: 10, h: 10 },
        elevationM: 0,
      },
      {
        id: "SURFACE_RAMP",
        zoneId: "ZONE_RAMP",
        kind: "ramp",
        rect: { x: 10, y: 0, w: 8, h: 8 },
        axis: "x",
        startElevationM: 0,
        endElevationM: 1.4,
        visualStyle: "stairs",
        stepCount: 10,
      },
    ],
    tacticalLanes: [
      { id: "west", label: "West route", zoneIds: ["ZONE_FLAT", "ZONE_RAMP"], cost: 1.25 },
    ],
    explicitConnectivity: [
      {
        fromZoneId: "ZONE_FLAT",
        toZoneId: "ZONE_RAMP",
        transitionSurfaceId: "SURFACE_RAMP",
        cost: 1.5,
      },
    ],
    authoredSpawns: [
      {
        id: "SPAWN_PLAYER_A",
        kind: "player",
        zoneId: "ZONE_FLAT",
        surfaceId: "SURFACE_FLAT",
        x: 2,
        y: 2,
        yawDeg: 90,
      },
    ],
    massingProfiles: [
      {
        id: "MASS_MID",
        label: "Mid mass",
        heightM: 7,
        depthM: 4,
        roofStyle: "flat_parapet",
        roofSetbackM: 0.4,
        parapetHeightM: 0.6,
        upperStorySetbackM: 0.3,
      },
    ],
    facadeModules: [
      {
        id: "shop_recess_market",
        label: "Merchant recess",
        kind: "shop_recess",
        openingType: "recess",
        dimensionsM: { width: 2.4, depth: 0.45, height: 2.7 },
        materialSlot: "timber",
        collisionOpening: false,
      },
    ],
    facadeProfiles: [
      {
        id: "merchant",
        label: "Merchant facade",
        family: "active_merchant",
        massingProfileId: "MASS_MID",
        materialSlots: {
          wall: "ph_lime_plaster_sun",
          trim: "ph_trim_sanded_01",
          roof: "ph_lime_plaster_sun",
          timber: "tm_balcony_wood_dark",
          metal: "tm_balcony_painted_metal",
          accent: "ph_band_lime_soft",
        },
        moduleIds: ["shop_recess_market"],
      },
    ],
    frontages: [
      {
        id: "FRONTAGE_SPICE_NORTH",
        zoneId: "ZONE_FLAT",
        face: "north",
        start: 0.1,
        end: 0.9,
        districtId: "DISTRICT_SPICE",
        facadeProfileId: "merchant",
        massingProfileId: "MASS_MID",
        bays: [
          {
            id: "SHOP_01",
            moduleId: "shop_recess_market",
            along: 0.5,
            baseElevationM: 0,
            datumId: "GROUND_HEAD_2.70",
            columnId: "COLUMN_01",
            layoutSource: "generated",
          },
        ],
        layout: {
          source: "generated",
          rhythm: "merchant",
          storyCount: 2,
          edgeMarginM: 0.6,
          groundHeadM: 2.7,
          upperSillDatumsM: [],
          signBandBottomM: 2.82,
          signBandTopM: 3.42,
        },
      },
    ],
    assetRegistry: [
      {
        id: "ASSET_CRATES",
        label: "Crate cluster",
        source: { kind: "project_original", uri: "repo://procedural/crates" },
        license: "Project-Original",
        dimensionsM: { width: 1.8, depth: 0.8, height: 1.1 },
        collisionClass: "hard",
        shadowPolicy: "cast_receive",
        lodEligible: true,
        semanticClass: "cover",
        runtime: { mode: "procedural", id: "bazaar_crates" },
        transform: {
          pivot: "base_center",
          upAxis: "+y",
          forwardAxis: "+z",
          authoredScale: { x: 1, y: 1, z: 1 },
        },
      },
    ],
    dressingClusters: [
      {
        id: "CLUSTER_CRATES",
        zoneId: "ZONE_FLAT",
        surfaceId: "SURFACE_FLAT",
        districtId: "DISTRICT_SPICE",
        classification: "gameplay_cover",
        anchors: ["ANCHOR_CRATES"],
        assetIds: ["ASSET_CRATES"],
      },
    ],
    anchors: [
      {
        id: "ANCHOR_CRATES",
        type: "cover_cluster",
        zone: "ZONE_FLAT",
        pos: { x: 3, y: 3, z: 0 },
      },
    ],
    architecturePlacements: [
      {
        id: "ARCH_FRONTAGE_SPICE_NORTH_MASSING",
        kind: "massing",
        frontageId: "FRONTAGE_SPICE_NORTH",
        zoneId: "ZONE_FLAT",
        districtId: "DISTRICT_SPICE",
        face: "north",
        profileId: "merchant",
        massingProfileId: "MASS_MID",
        center: { x: 5, y: 12, z: 3.5 },
        sizeM: { width: 8, depth: 4, height: 7 },
        yawDeg: 180,
        materialSlots: {
          wall: "ph_lime_plaster_sun",
          trim: "ph_trim_sanded_01",
          roof: "ph_lime_plaster_sun",
          timber: "tm_balcony_wood_dark",
          metal: "tm_balcony_painted_metal",
          accent: "ph_band_lime_soft",
        },
        roof: {
          style: "flat_parapet",
          setbackM: 0.4,
          parapetHeightM: 0.6,
          upperStorySetbackM: 0.3,
          elevationM: 7,
        },
      },
      {
        id: "ARCH_FRONTAGE_SPICE_NORTH_SHOP_01",
        kind: "facade_module",
        frontageId: "FRONTAGE_SPICE_NORTH",
        zoneId: "ZONE_FLAT",
        districtId: "DISTRICT_SPICE",
        face: "north",
        profileId: "merchant",
        moduleId: "shop_recess_market",
        moduleKind: "shop_recess",
        openingType: "recess",
        datumId: "GROUND_HEAD_2.70",
        columnId: "COLUMN_01",
        layoutSource: "generated",
        center: { x: 5, y: 9.775, z: 1.35 },
        sizeM: { width: 2.4, depth: 0.45, height: 2.7 },
        yawDeg: 180,
        materialSlot: "timber",
        collisionOpening: false,
      },
    ],
    dressingPlacements: [
      {
        id: "PLACE_CRATES_ANCHOR_CRATES",
        clusterId: "CLUSTER_CRATES",
        assetId: "ASSET_CRATES",
        anchorId: "ANCHOR_CRATES",
        zoneId: "ZONE_FLAT",
        districtId: "DISTRICT_SPICE",
        classification: "gameplay_cover",
        position: { x: 3, y: 3, z: 0 },
        yawDeg: 0,
        scale: { x: 1, y: 1, z: 1 },
        dimensionsM: { width: 1.8, depth: 0.8, height: 1.1 },
        collisionClass: "hard",
        shadowPolicy: "cast_receive",
        lodEligible: true,
        semanticClass: "cover",
        runtime: { mode: "procedural", id: "bazaar_crates" },
      },
    ],
  };
}

test("parses legacy map JSON without requiring any v3 fields", () => {
  const parsed = parseBlockoutSpec(makeLegacyRuntime(), "legacy-map.json");
  assert.equal(parsed.wall_details.maxProtrusion, 0.3);
  assert.deepEqual(parsed.exterior_wall_patches, []);
  assert.equal(parsed.traversalSurfaces, undefined);
  assert.equal(parsed.authoredSpawns, undefined);
});

test("parses and preserves the complete optional v3 runtime contract", () => {
  const parsed = parseBlockoutSpec(makeV3Runtime(), "v3-map.json");
  assert.equal(parsed.formatVersion, "3.0");
  assert.deepEqual(parsed.mapCenter, { x: 10, y: 6 });
  assert.equal(parsed.wall_details.maxProtrusion, 0.73);
  assert.deepEqual(parsed.exterior_wall_patches, [
    { orientation: "vertical", coord: 10, start: 0, end: 8, outward: 1 },
  ]);
  const ramp = parsed.traversalSurfaces?.find((surface) => surface.kind === "ramp");
  assert.equal(ramp?.visualStyle, "stairs");
  assert.equal(ramp?.stepCount, 10);
  assert.equal(parsed.zones[0]?.clearWidthM, 4);
  assert.equal(parsed.authoredSpawns?.[0]?.surfaceId, "SURFACE_FLAT");
  assert.equal(parsed.frontages?.[0]?.facadeProfileId, "merchant");
  assert.equal(parsed.frontages?.[0]?.bays?.[0]?.moduleId, "shop_recess_market");
  assert.equal(parsed.frontages?.[0]?.layout?.source, "generated");
  assert.equal(parsed.architecturePlacements?.length, 2);
  assert.equal(parsed.dressingPlacements?.[0]?.runtime.id, "bazaar_crates");
  assert.deepEqual(parsed.dressingClusters?.[0]?.anchors, ["ANCHOR_CRATES"]);
  assert.equal(parsed.assetRegistry?.[0]?.source.kind, "project_original");
  assert.deepEqual(parsed.dressingClusters?.[0]?.assetIds, ["ASSET_CRATES"]);
});

test("rejects invalid values instead of silently clamping or dropping them", () => {
  const badProtrusion = makeV3Runtime();
  badProtrusion.wall_details.maxProtrusion = 0;
  assert.throws(() => parseBlockoutSpec(badProtrusion, "bad-protrusion.json"), /expected number > 0/);

  const badPatch = { ...makeV3Runtime(), exterior_wall_patches: {} };
  assert.throws(() => parseBlockoutSpec(badPatch, "bad-patch.json"), /expected array when provided/);

  const badGrade = makeV3Runtime();
  const badRamp = badGrade.traversalSurfaces[1]!;
  assert.equal(badRamp.kind, "ramp");
  if (badRamp.kind === "ramp") {
    badRamp.endElevationM = 8;
  }
  assert.throws(() => parseBlockoutSpec(badGrade, "bad-grade.json"), /ramp grade exceeds 30 degrees/);

  const badSpawn = makeV3Runtime();
  badSpawn.authoredSpawns[0]!.surfaceId = "SURFACE_RAMP";
  assert.throws(() => parseBlockoutSpec(badSpawn, "bad-spawn.json"), /zone and surface must belong together/);

  const badCluster = makeV3Runtime();
  badCluster.dressingClusters[0]!.classification = "random_scatter";
  assert.throws(
    () => parseBlockoutSpec(badCluster, "bad-cluster.json"),
    /expected gameplay_cover, soft_visual, or overhead/,
  );

  const badAsset = makeV3Runtime();
  badAsset.dressingClusters[0]!.assetIds = ["UNKNOWN_ASSET"];
  assert.throws(() => parseBlockoutSpec(badAsset, "bad-asset.json"), /unknown asset 'UNKNOWN_ASSET'/);
});
