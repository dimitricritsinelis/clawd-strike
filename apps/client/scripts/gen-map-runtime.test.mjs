import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileMapSpec, deriveShotsRuntime, validateMapSpecAgainstSchema } from "./gen-map-runtime.mjs";
import { normalizeCompositionWaiverRegistry } from "./lib/composition-waivers.mjs";

const authoritativeCompositionWaiverDocument = JSON.parse(await readFile(
  new URL("../../../docs/map-design/specs/composition_waivers.json", import.meta.url),
  "utf8",
));
const compositionWaiverSchema = JSON.parse(await readFile(
  new URL("../../../docs/map-design/specs/composition_waivers.schema.json", import.meta.url),
  "utf8",
));
const generatedProvenanceSchema = JSON.parse(await readFile(
  new URL("../../../docs/map-design/specs/generated_provenance.schema.json", import.meta.url),
  "utf8",
));
const authoritativeCompositionWaivers = normalizeCompositionWaiverRegistry(
  authoritativeCompositionWaiverDocument,
);
const compositionMigrationBaseline = JSON.parse(await readFile(
  new URL("../../../docs/map-design/specs/composition_migration_baseline.json", import.meta.url),
  "utf8",
));
const authoritativeGeneratedMap = JSON.parse(await readFile(
  new URL("../public/maps/bazaar-map/map_spec.json", import.meta.url),
  "utf8",
));
const authoritativeGeneratedShots = JSON.parse(await readFile(
  new URL("../public/maps/bazaar-map/shots.json", import.meta.url),
  "utf8",
));

test("versioned schemas validate composition waivers and generated provenance", () => {
  validateMapSpecAgainstSchema(authoritativeCompositionWaiverDocument, compositionWaiverSchema);
  validateMapSpecAgainstSchema(authoritativeGeneratedMap.generatedFrom, generatedProvenanceSchema);
  validateMapSpecAgainstSchema(
    authoritativeGeneratedShots.metadata.generatedFrom,
    generatedProvenanceSchema,
  );
});

test("composition metadata migration preserves the authoritative normalized map semantics", () => {
  assert.equal(compositionMigrationBaseline.schemaVersion, 1);
  assert.equal(compositionMigrationBaseline.hashAlgorithm, "sha256-json-v1");
  assert.equal(
    authoritativeGeneratedMap.generatedFrom.path,
    compositionMigrationBaseline.sourcePath,
  );
  assert.equal(
    authoritativeGeneratedMap.generatedFrom.sha256,
    compositionMigrationBaseline.sourceSha256,
  );
  assert.deepEqual(compositionMigrationBaseline.sections, [
    "mapId",
    "playable_boundary",
    "defaults",
    "wall_details",
    "zones",
    "exterior_wall_patches",
    "constraints",
    "formatVersion",
    "mapCenter",
    "districts",
    "traversalSurfaces",
    "tacticalLanes",
    "explicitConnectivity",
    "authoredSpawns",
    "frontages",
    "frontageCoverage",
    "assetRegistry",
    "massingProfiles",
    "facadeModules",
    "facadeProfiles",
    "architecturePlacements",
    "dressingClusters",
    "dressingPlacements",
    "anchors",
  ]);
  assert.deepEqual(
    [...compositionMigrationBaseline.sections].sort(),
    Object.keys(authoritativeGeneratedMap)
      .filter((section) => section !== "generatedFrom")
      .sort(),
    "the migration seal must cover every normalized runtime-map field",
  );
  const normalizedSemantics = Object.fromEntries(
    compositionMigrationBaseline.sections.map((section) => {
      assert.ok(
        Object.hasOwn(authoritativeGeneratedMap, section),
        `generated map is missing migration-protected section '${section}'`,
      );
      return [section, authoritativeGeneratedMap[section]];
    }),
  );
  const semanticSha256 = createHash("sha256")
    .update(JSON.stringify(normalizedSemantics))
    .digest("hex");
  assert.equal(semanticSha256, compositionMigrationBaseline.semanticSha256);
});

function makeV3Spec() {
  return {
    metadata: {
      version: "3.0",
      zone_types: ["spawn_plaza", "connector"],
      anchor_types: ["cover_cluster"],
    },
    global_dimensions: {
      playable_boundary: { x: 0, y: 0, w: 20, h: 12 },
      wall_height_default: 7,
      wall_thickness_default: 0.35,
      ceiling_height_default: 10,
      floor_height_default: 0,
    },
    wall_details: {
      enabled: true,
      style: "bazaar",
      density: 0.4,
      maxProtrusion: 0.73,
      seed: 7,
    },
    map_center: { x: 10, y: 6 },
    districts: [{ id: "DISTRICT_SPICE", label: "Spice Street" }],
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
    traversal_surfaces: [
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
        visual_style: "stairs",
        step_count: 10,
      },
    ],
    tactical_lanes: [
      { id: "west", label: "West route", zoneIds: ["ZONE_FLAT", "ZONE_RAMP"], cost: 1.25 },
    ],
    explicit_connectivity: [
      {
        fromZoneId: "ZONE_FLAT",
        toZoneId: "ZONE_RAMP",
        transitionSurfaceId: "SURFACE_RAMP",
        cost: 1.5,
      },
    ],
    authored_spawns: [
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
    massing_profiles: [
      {
        id: "MASSING_LOW",
        label: "Low mass",
        heightM: 4.5,
        depthM: 4,
        roofStyle: "flat_parapet",
        roofSetbackM: 0.5,
        parapetHeightM: 0.65,
        upperStorySetbackM: 0.4,
      },
    ],
    facade_modules: [
      {
        id: "shop_recess_market",
        label: "Merchant shop recess",
        kind: "shop_recess",
        openingType: "recess",
        dimensionsM: { width: 2, depth: 0.4, height: 2.6 },
        materialSlot: "timber",
        collisionOpening: false,
      },
    ],
    facade_profiles: [
      {
        id: "merchant",
        label: "Merchant frontage",
        family: "active_merchant",
        massingProfileId: "MASSING_LOW",
        materialSlots: {
          wall: "ph_lime_plaster_sun",
          trim: "ph_trim_sanded_01",
          roof: "ph_lime_plaster_sun",
          timber: "timber_dark",
          metal: "metal_dark",
          accent: "tile_blue",
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
        massingProfileId: "MASSING_LOW",
        layoutIntent: { mode: "generated", rhythm: "merchant" },
      },
    ],
    frontage_exemptions: [
      {
        zoneId: "ZONE_FLAT",
        face: "south",
        reason: "sealed_perimeter",
        note: "The full 10.00m south face is the sealed outer boundary behind the spawn court.",
      },
      {
        zoneId: "ZONE_FLAT",
        face: "east",
        reason: "open_traversal_face",
        note: "The east face is the authored transition into ZONE_RAMP, with no supported wall span.",
      },
      {
        zoneId: "ZONE_FLAT",
        face: "west",
        reason: "sealed_perimeter",
        note: "The full 10.00m west face is the sealed outer boundary.",
      },
      {
        zoneId: "ZONE_RAMP",
        face: "north",
        reason: "architectural_cut_edge",
        note: "The 8.00m north edge terminates the analytic ramp and is not a served facade.",
      },
      {
        zoneId: "ZONE_RAMP",
        face: "south",
        reason: "sealed_perimeter",
        note: "The 8.00m south edge is part of the sealed outer boundary.",
      },
      {
        zoneId: "ZONE_RAMP",
        face: "east",
        reason: "retaining_wall",
        note: "The 8.00m east face retains the full 1.40m analytic grade change.",
      },
      {
        zoneId: "ZONE_RAMP",
        face: "west",
        reason: "open_traversal_face",
        note: "The west face is the authored transition from ZONE_FLAT, with no served facade.",
      },
    ],
    composition_rules: {
      clearances: {
        door_service_m: 0.8,
        opening_lateral_buffer_m: 0.08,
        canopy_opening_buffer_m: 0.12,
        placement_aabb_buffer_m: 0.05,
        fixture_buffer_m: 0.08,
        fixture_axis_tolerance_m: 0.02,
      },
      wall_budgets: {
        fixture_spacing_m: 1.4,
        symmetry_tolerance: 0.14,
        small_wall_max_m: 2.5,
        small_wall_max_fixtures: 1,
      },
      zone_density_budgets: {
        ZONE_FLAT: 2,
        ZONE_RAMP: 0,
      },
    },
    asset_registry: [
      {
        id: "ASSET_CRATES",
        label: "Crate cover cluster",
        source: { kind: "project_original", uri: "repo://procedural/crates" },
        license: "Project-Original",
        dimensionsM: { width: 1.8, depth: 0.8, height: 1.1 },
        collisionClass: "hard",
        shadowPolicy: "cast_receive",
        lodEligible: true,
        semanticClass: "cover",
        runtime: { mode: "procedural", id: "crate_cover" },
        transform: {
          pivot: "base_center",
          upAxis: "+y",
          forwardAxis: "+z",
          authoredScale: { x: 1, y: 1, z: 1 },
        },
      },
    ],
    dressing_clusters: [
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
    dressing_placements: [
      {
        id: "PLACE_CRATES",
        clusterId: "CLUSTER_CRATES",
        assetId: "ASSET_CRATES",
        anchorIds: ["ANCHOR_CRATES"],
        offsetM: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        yawOffsetDeg: 0,
      },
    ],
    exterior_wall_patches: [
      { orientation: "horizontal", coord: 0, start: 0, end: 20, outward: -1, _note: "south" },
      { orientation: "horizontal", coord: 12, start: 0, end: 20, outward: 1, _note: "north" },
      { orientation: "vertical", coord: 0, start: 0, end: 12, outward: -1, _note: "west" },
      { orientation: "vertical", coord: 20, start: 0, end: 12, outward: 1, _note: "east" },
    ],
    constraints: {
      min_path_width_main_lane: 6,
      min_path_width_side_halls: 4.5,
    },
    anchors: [
      {
        id: "ANCHOR_CRATES",
        type: "cover_cluster",
        zone: "ZONE_FLAT",
        x: 3,
        y: 3,
        z: 0,
      },
    ],
  };
}

test("compiles the optional v3 contract without source/runtime drift", () => {
  const runtime = compileMapSpec(makeV3Spec());

  assert.equal(runtime.formatVersion, "3.0");
  assert.deepEqual(runtime.mapCenter, { x: 10, y: 6 });
  assert.equal(runtime.wall_details.maxProtrusion, 0.73);
  assert.equal(runtime.exterior_wall_patches.length, 4);
  assert.deepEqual(runtime.traversalSurfaces?.[1], {
    id: "SURFACE_RAMP",
    zoneId: "ZONE_RAMP",
    kind: "ramp",
    rect: { x: 10, y: 0, w: 8, h: 8 },
    axis: "x",
    startElevationM: 0,
    endElevationM: 1.4,
    visualStyle: "stairs",
    stepCount: 10,
  });
  assert.deepEqual(runtime.authoredSpawns?.[0], {
    id: "SPAWN_PLAYER_A",
    kind: "player",
    zoneId: "ZONE_FLAT",
    surfaceId: "SURFACE_FLAT",
    x: 2,
    y: 2,
    yawDeg: 90,
  });
  assert.equal(runtime.zones[0].clearWidthM, 4);
  assert.equal(runtime.frontages?.[0].id, "FRONTAGE_SPICE_NORTH");
  assert.equal(runtime.frontageCoverage?.totalFaceCount, 8);
  assert.equal(runtime.frontageCoverage?.frontageFaceCount, 1);
  assert.equal(runtime.frontageCoverage?.exemptionFaceCount, 7);
  assert.equal("compositionRules" in runtime, false);
  assert.equal("compositionValidation" in runtime, false);
  assert.deepEqual(runtime.dressingClusters?.[0].anchors, ["ANCHOR_CRATES"]);
  assert.equal(runtime.assetRegistry?.[0].license, "Project-Original");
  assert.deepEqual(runtime.dressingClusters?.[0].assetIds, ["ASSET_CRATES"]);
  assert.equal(runtime.massingProfiles?.[0].heightM, 4.5);
  assert.equal(runtime.facadeProfiles?.[0].family, "active_merchant");
  assert.equal(runtime.facadeModules?.[0].kind, "shop_recess");
  assert.equal(runtime.architecturePlacements?.filter((placement) => placement.kind === "massing").length, 1);
  assert.equal(runtime.architecturePlacements?.filter((placement) => placement.kind === "facade_module").length, 2);
  assert.equal(runtime.frontages?.[0].layout?.source, "generated");
  assert.equal(runtime.frontages?.[0].bays?.[0].datumId, "GROUND_HEAD_2.60");
  assert.deepEqual(runtime.dressingPlacements?.[0].position, { x: 3, y: 3, z: 0 });
});

test("fails compilation loudly when a seeded composition rule is violated", () => {
  const source = makeV3Spec();
  source.composition_rules.zone_density_budgets.ZONE_FLAT = 0;
  assert.throws(
    () => compileMapSpec(source),
    /Zone 'ZONE_FLAT' has 1 placements, above density budget 0/,
  );
});

test("validates the source document against the owning schema before compilation", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../../../docs/map-design/specs/map_spec_schema.json", import.meta.url), "utf8"),
  );
  const source = makeV3Spec();
  assert.doesNotThrow(() => validateMapSpecAgainstSchema(source, schema));

  source.traversal_surfaces[1].visualStyle = "stairs";
  assert.throws(
    () => validateMapSpecAgainstSchema(source, schema),
    /visualStyle: additional property is not allowed/,
  );
});

test("resolves stable frontage-relative anchors without persisting segment ordinals", async () => {
  const source = makeV3Spec();
  source.anchors.push({
    id: "ANCHOR_SIGN_RELATIVE",
    type: "cover_cluster",
    zone: "ZONE_FLAT",
    frontageId: "FRONTAGE_SPICE_NORTH",
    along: 0.25,
    inset_m: 0.4,
    vertical_offset_m: 2.2,
  });
  const schema = JSON.parse(
    await readFile(new URL("../../../docs/map-design/specs/map_spec_schema.json", import.meta.url), "utf8"),
  );
  assert.doesNotThrow(() => validateMapSpecAgainstSchema(source, schema));

  const runtime = compileMapSpec(source);
  const anchor = runtime.anchors.find((entry) => entry.id === "ANCHOR_SIGN_RELATIVE");
  assert.ok(anchor);
  assert.ok(Math.abs(anchor.pos.x - 3) < 1e-9);
  assert.ok(Math.abs(anchor.pos.y - 9.6) < 1e-9);
  assert.equal(anchor.pos.z, 2.2);
  assert.equal(anchor?.yawDeg, 180);
});

test("keeps authoritative v3 massing and frontage anchors out of authored connector gaps", async () => {
  const source = JSON.parse(
    await readFile(new URL("../../../docs/map-design/specs/map_spec.json", import.meta.url), "utf8"),
  );
  const schema = JSON.parse(
    await readFile(new URL("../../../docs/map-design/specs/map_spec_schema.json", import.meta.url), "utf8"),
  );
  assert.doesNotThrow(() => validateMapSpecAgainstSchema(source, schema));
  const runtime = compileMapSpec(source, authoritativeCompositionWaivers);
  const gaps = [
    { zoneId: "COVERED_SOUK", face: "west", startM: 39, endM: 44 },
    { zoneId: "DYERS_ALLEY", face: "west", startM: 11.76, endM: 13 },
    { zoneId: "FOUNTAIN_COURT", face: "east", startM: 39, endM: 44 },
    { zoneId: "FOUNTAIN_COURT", face: "west", startM: 36, endM: 41 },
    { zoneId: "NORTH_COURT", face: "west", startM: 67, endM: 72 },
    { zoneId: "NORTH_COURT", face: "west", startM: 76, endM: 80 },
    { zoneId: "RUG_GATE", face: "east", startM: 67, endM: 72 },
    { zoneId: "RUG_GATE", face: "west", startM: 72, endM: 76 },
  ];
  const zonesById = new Map(source.zones.map((zone) => [zone.id, zone]));
  const frontagesById = new Map(source.frontages.map((frontage) => [frontage.id, frontage]));
  const epsilon = 1e-9;

  const worldInterval = (frontage) => {
    const zone = zonesById.get(frontage.zoneId);
    assert.ok(zone, `frontage ${frontage.id} must resolve its zone`);
    const axisStart = frontage.face === "west" || frontage.face === "east"
      ? zone.rect.y
      : zone.rect.x;
    const axisLength = frontage.face === "west" || frontage.face === "east"
      ? zone.rect.h
      : zone.rect.w;
    return {
      startM: axisStart + axisLength * (frontage.start ?? 0),
      endM: axisStart + axisLength * (frontage.end ?? 1),
    };
  };
  const missesGap = (interval, gap) => (
    interval.endM <= gap.startM + epsilon || interval.startM >= gap.endM - epsilon
  );

  for (const gap of gaps) {
    const matchingFrontages = source.frontages.filter(
      (frontage) => frontage.zoneId === gap.zoneId && frontage.face === gap.face,
    );
    assert.ok(matchingFrontages.length > 0, `${gap.zoneId}:${gap.face} must retain a supported frontage`);
    for (const frontage of matchingFrontages) {
      assert.ok(
        missesGap(worldInterval(frontage), gap),
        `${frontage.id} must not claim connector gap ${gap.startM}..${gap.endM}`,
      );
    }
  }

  const runtimeAnchorsById = new Map(runtime.anchors.map((anchor) => [anchor.id, anchor]));
  const assertAnchorEndpoint = (anchor, frontageId, along, label) => {
    const frontage = frontagesById.get(frontageId);
    assert.ok(frontage, `${anchor.id} ${label} must resolve frontage ${frontageId}`);
    assert.equal(frontage.zoneId, anchor.zone, `${anchor.id} ${label} must stay in its authored zone`);
    const interval = worldInterval(frontage);
    const positionM = interval.startM + (interval.endM - interval.startM) * along;
    const gap = gaps.find((entry) => entry.zoneId === frontage.zoneId && entry.face === frontage.face);
    if (gap) {
      assert.ok(
        positionM <= gap.startM + epsilon || positionM >= gap.endM - epsilon,
        `${anchor.id} ${label} must not resolve inside connector gap ${gap.startM}..${gap.endM}`,
      );
    }
  };

  for (const anchor of source.anchors) {
    const runtimeAnchor = runtimeAnchorsById.get(anchor.id);
    assert.ok(runtimeAnchor, `${anchor.id} must compile to a runtime anchor`);
    assert.ok(
      [runtimeAnchor.pos.x, runtimeAnchor.pos.y, runtimeAnchor.pos.z].every(Number.isFinite),
      `${anchor.id} must compile to finite coordinates`,
    );
    if (anchor.frontageId) assertAnchorEndpoint(anchor, anchor.frontageId, anchor.along, "start");
    if (anchor.end_frontage_id) {
      assertAnchorEndpoint(anchor, anchor.end_frontage_id, anchor.end_along, "end");
    }
  }
});

test("keeps the legacy v2.3 shape valid when v3 sections are absent", () => {
  const source = makeV3Spec();
  for (const key of [
    "map_center",
    "districts",
    "traversal_surfaces",
    "tactical_lanes",
    "explicit_connectivity",
    "authored_spawns",
    "frontages",
    "frontage_exemptions",
    "massing_profiles",
    "facade_modules",
    "facade_profiles",
    "dressing_clusters",
    "dressing_placements",
    "asset_registry",
    "exterior_wall_patches",
  ]) {
    delete source[key];
  }
  for (const zone of source.zones) {
    delete zone.surfaceId;
    delete zone.districtId;
    delete zone.macroLane;
    delete zone.floorMaterialId;
    delete zone.facadeProfileId;
    delete zone.clearWidthM;
  }
  source.metadata.version = "2.3";

  const runtime = compileMapSpec(source);
  assert.equal(runtime.formatVersion, "2.3");
  assert.deepEqual(runtime.exterior_wall_patches, []);
  assert.equal("traversalSurfaces" in runtime, false);
  assert.equal("authoredSpawns" in runtime, false);
});

test("preserves the exact authored shot inventory and points compare at a real shot", () => {
  const source = {
    metadata: { compareShotId: "SHOT_02_SPAWN_A_TO_BAZAAR" },
    shots: [
      { id: "SHOT_01_BIRDSEYE", tags: ["overview"] },
      { id: "SHOT_02_SPAWN_A_TO_BAZAAR", tags: ["gameplay"] },
    ],
  };
  const runtime = deriveShotsRuntime(source);
  assert.deepEqual(runtime.shots, source.shots);
  assert.equal(runtime.metadata.shotCount, 2);
  assert.equal(runtime.aliases.compare, "SHOT_02_SPAWN_A_TO_BAZAAR");
  assert.equal(runtime.shots.some((shot) => shot.id === "SHOT_BLOCKOUT_COMPARE"), false);
  assert.throws(
    () => deriveShotsRuntime({
      metadata: { compareShotId: "SHOT_UNKNOWN" },
      shots: source.shots,
    }),
    /require exact compare shot 'SHOT_UNKNOWN'/,
  );
});

test("compiles authored cloth spans at their true midpoint, span, width, and yaw", async () => {
  const source = JSON.parse(
    await readFile(new URL("../../../docs/map-design/specs/map_spec.json", import.meta.url), "utf8"),
  );
  const first = compileMapSpec(source, authoritativeCompositionWaivers).dressingPlacements.find(
    (placement) => placement.anchorId === "CANOPY_SPICE_01",
  );
  const second = compileMapSpec(source, authoritativeCompositionWaivers).dressingPlacements.find(
    (placement) => placement.anchorId === "CANOPY_SPICE_01",
  );

  assert.ok(first);
  assert.equal(first.id, "PLACE_SPICE_CANOPIES_CANOPY_SPICE_01");
  assert.equal(first.id, second?.id, "compiled placement identity must remain stable");
  assert.ok(Math.abs(first.position.x - 27) < 1e-9);
  assert.ok(Math.abs(first.position.y - 20.5808) < 1e-9);
  assert.ok(Math.abs(first.position.z - 5.675) < 1e-9);
  assert.deepEqual(first.spanSeats, {
    start: { x: 21, y: 20.5808, z: 5.8 },
    end: { x: 33, y: 20.5808, z: 5.55 },
  });
  assert.ok(Math.abs(first.dimensionsM.depth - 12) < 1e-9);
  assert.equal(first.dimensionsM.width, 3.6);
  assert.equal(first.dimensionsM.height, 0.18);
  assert.ok(Math.abs(first.yawDeg - 90) < 1e-9);
});

test("compiles signboard width from its served-opening anchor", async () => {
  const source = JSON.parse(
    await readFile(new URL("../../../docs/map-design/specs/map_spec.json", import.meta.url), "utf8"),
  );
  const runtime = compileMapSpec(source, authoritativeCompositionWaivers);
  for (const anchorId of ["SPICE_W_SIGN_1", "DYE_W_SIGN_2"]) {
    const sourceAnchor = source.anchors.find((anchor) => anchor.id === anchorId);
    const placement = runtime.dressingPlacements.find((candidate) => candidate.anchorId === anchorId);
    assert.ok(sourceAnchor && placement);
    assert.equal(placement.dimensionsM.width, sourceAnchor.width_m);
  }
});

test("rejects malformed geometry and broken v3 references", () => {
  const badPatch = makeV3Spec();
  badPatch.exterior_wall_patches[0].end = 0;
  assert.throws(() => compileMapSpec(badPatch), /start must be less than end/);

  const badProtrusion = makeV3Spec();
  badProtrusion.wall_details.maxProtrusion = 0;
  assert.throws(() => compileMapSpec(badProtrusion), /maxProtrusion must be > 0/);

  const missingFrontageCoverage = makeV3Spec();
  missingFrontageCoverage.frontage_exemptions.pop();
  assert.throws(
    () => compileMapSpec(missingFrontageCoverage),
    /Walkable zone faces lack frontage or exemption records: ZONE_RAMP:west/,
  );

  const badGrade = makeV3Spec();
  badGrade.traversal_surfaces[1].endElevationM = 8;
  assert.throws(() => compileMapSpec(badGrade), /grade .* exceeds 30deg/);

  const badSteps = makeV3Spec();
  delete badSteps.traversal_surfaces[1].step_count;
  assert.throws(() => compileMapSpec(badSteps), /must pair visual_style 'stairs' with step_count/);

  const badSpawn = makeV3Spec();
  badSpawn.authored_spawns[0].surfaceId = "SURFACE_RAMP";
  assert.throws(() => compileMapSpec(badSpawn), /zone and surface must belong together/);

  const badCluster = makeV3Spec();
  badCluster.dressing_clusters[0].anchors = ["UNKNOWN_ANCHOR"];
  assert.throws(() => compileMapSpec(badCluster), /unknown anchor 'UNKNOWN_ANCHOR'/);

  const badAsset = makeV3Spec();
  badAsset.dressing_clusters[0].assetIds = ["UNKNOWN_ASSET"];
  assert.throws(() => compileMapSpec(badAsset), /unknown asset 'UNKNOWN_ASSET'/);

  const badLicense = makeV3Spec();
  badLicense.asset_registry[0].source = { kind: "external_cc0", uri: "https://example.com/crates" };
  badLicense.asset_registry[0].license = "CC0-1.0";
  assert.throws(() => compileMapSpec(badLicense), /external source host 'example.com' is not approved/);

  const missingRuntimeFile = makeV3Spec();
  missingRuntimeFile.asset_registry[0].runtime = {
    mode: "model",
    id: "missing_model",
    uri: "/assets/models/environment/bazaar/props/does-not-exist.gltf",
  };
  assert.throws(() => compileMapSpec(missingRuntimeFile), /runtime\.uri does not exist/);

  const unrenderedAsset = makeV3Spec();
  unrenderedAsset.dressing_placements = [];
  assert.throws(() => compileMapSpec(unrenderedAsset), /requires a non-empty 'dressing_placements'/);

  const silentScaleClamp = makeV3Spec();
  silentScaleClamp.dressing_placements[0].scale.x = 1.5;
  assert.throws(() => compileMapSpec(silentScaleClamp), /0\.75-1\.25 production tolerance/);

  const authoredBays = makeV3Spec();
  authoredBays.frontages[0].bays = [{
    id: "SHOP_02",
    moduleId: "shop_recess_market",
    along: 0.52,
    baseElevationM: 0,
  }];
  assert.throws(() => compileMapSpec(authoredBays), /cannot retain hand-authored bays/);

  const duplicateAdjacentIdentity = makeV3Spec();
  duplicateAdjacentIdentity.frontages[0].start = 0.1;
  duplicateAdjacentIdentity.frontages[0].end = 0.48;
  duplicateAdjacentIdentity.facade_profiles.push({
    ...structuredClone(duplicateAdjacentIdentity.facade_profiles[0]),
    id: "merchant_duplicate",
    label: "Duplicate merchant frontage",
  });
  duplicateAdjacentIdentity.frontages.push({
    ...structuredClone(duplicateAdjacentIdentity.frontages[0]),
    id: "FRONTAGE_SPICE_NORTH_ADJACENT",
    start: 0.52,
    end: 0.9,
    facadeProfileId: "merchant_duplicate",
  });
  assert.throws(
    () => compileMapSpec(duplicateAdjacentIdentity),
    /Adjacent frontages .* share wall material\+tint 'ph_lime_plaster_sun'/,
  );

  const degenerateCanopy = makeV3Spec();
  degenerateCanopy.metadata.anchor_types.push("cloth_canopy_span");
  Object.assign(degenerateCanopy.anchors[0], {
    type: "cloth_canopy_span",
    end_x: 3,
    end_y: 3,
    end_z: 0,
    width_m: 3.6,
  });
  assert.throws(() => compileMapSpec(degenerateCanopy), /must define a non-zero horizontal span/);

  const rescaledCanopy = makeV3Spec();
  rescaledCanopy.metadata.anchor_types.push("cloth_canopy_span");
  Object.assign(rescaledCanopy.anchors[0], {
    type: "cloth_canopy_span",
    end_x: 7,
    end_y: 3,
    end_z: 0,
    width_m: 3.6,
  });
  rescaledCanopy.dressing_placements[0].scale.x = 1.1;
  assert.throws(() => compileMapSpec(rescaledCanopy), /cannot rescale its authored width\/span/);

  const disconnected = makeV3Spec();
  disconnected.explicit_connectivity = [];
  assert.throws(() => compileMapSpec(disconnected), /must connect the authored topology/);

  const detachedEdge = makeV3Spec();
  detachedEdge.zones[1].rect.x = 11;
  detachedEdge.traversal_surfaces[1].rect.x = 11;
  assert.throws(() => compileMapSpec(detachedEdge), /without a physical opening/);

  const outsideAnchor = makeV3Spec();
  outsideAnchor.anchors[0].x = -0.1;
  assert.throws(() => compileMapSpec(outsideAnchor), /must fit inside zone 'ZONE_FLAT'/);

  const openPerimeter = makeV3Spec();
  openPerimeter.exterior_wall_patches.pop();
  assert.throws(() => compileMapSpec(openPerimeter), /seal the complete east perimeter/);
});
