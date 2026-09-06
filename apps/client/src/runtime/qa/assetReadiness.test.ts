import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  QA_PALM_DIRECT_TEXTURE_URLS,
  QA_RENDERER_DIRECT_TEXTURE_URLS,
  QA_STAINED_GLASS_DIRECT_TEXTURE_URLS,
  QaAssetReadinessTracker,
  createQaAssetPlan,
  hashQaAssetRequestIds,
  preloadQaDirectTextures,
  qaDirectTextureRequestId,
  qaFacadeModelRequestId,
  resolveQaAssetProfile,
  resolveQaAssetTimeoutMs,
  type QaAssetPlan,
} from "./assetReadiness";
import {
  parseAnchorsSpec,
  parseBlockoutSpec,
  type RuntimeMapAssets,
} from "../map/types";
import {
  parsePropModelManifest,
  resolvePropModelUrlForQuality,
} from "../render/models/PropModelLibrary";

function fixtureMap(): RuntimeMapAssets {
  return {
    blockout: {
      mapId: "fixture",
      playable_boundary: { x: 0, y: 0, w: 10, h: 10 },
      defaults: { wall_height: 3, wall_thickness: 0.2, ceiling_height: 3, floor_height: 0.1 },
      wall_details: {} as RuntimeMapAssets["blockout"]["wall_details"],
      zones: [
        {
          id: "B",
          type: "lane",
          rect: { x: 0, y: 0, w: 2, h: 2 },
          label: "B",
          notes: "",
          floorMaterialId: "patterned_cobblestone",
        },
        {
          id: "A",
          type: "lane",
          rect: { x: 2, y: 0, w: 2, h: 2 },
          label: "A",
          notes: "",
          floorMaterialId: "large_sandstone_blocks_01",
        },
      ],
      exterior_wall_patches: [],
      facadeProfiles: [{
        id: "profile",
        label: "Profile",
        family: "active_merchant",
        massingProfileId: "mass",
        materialSlots: {
          wall: "ph_painted_plaster_warm",
          trim: "ph_stone_trim_white",
          roof: "ph_painted_plaster_warm",
          timber: "tm_balcony_wood_dark",
          metal: "tm_balcony_painted_metal",
          accent: "tm_stained_glass_hero",
        },
        moduleIds: [],
      }],
      dressingPlacements: [{
        id: "placement",
        clusterId: "cluster",
        assetId: "asset",
        anchorId: "anchor",
        zoneId: "A",
        classification: "soft_visual",
        position: { x: 0, y: 0, z: 0 },
        yawDeg: 0,
        scale: { x: 1, y: 1, z: 1 },
        dimensionsM: { width: 1, depth: 1, height: 1 },
        collisionClass: "none",
        shadowPolicy: "cast_receive",
        lodEligible: true,
        semanticClass: "container",
        runtime: { mode: "model", id: "ph_wooden_crate_02" },
      }],
      constraints: { min_path_width_main_lane: 2, min_path_width_side_halls: 1 },
    },
    anchors: { mapId: "fixture", anchors: [] },
    shots: { metadata: {}, shots: [] },
  };
}

function trackerPlan(requestIds: readonly string[] = []): QaAssetPlan {
  return {
    schemaVersion: 1,
    profile: "qa",
    floorMaterialIds: [],
    wallMaterialIds: [],
    propModelIds: [],
    doorModelIds: [],
    facadeModelIds: [],
    directTextureUrls: [],
    requiredLogicalRequestIds: requestIds,
    hash: hashQaAssetRequestIds("qa", requestIds),
  };
}

function directTexturePlan(urls: readonly string[]): QaAssetPlan {
  const requestIds = urls.map(qaDirectTextureRequestId);
  return {
    ...trackerPlan(requestIds),
    directTextureUrls: urls,
  };
}

test("QA asset plan is deterministic and sorts compiled dependencies", () => {
  const first = createQaAssetPlan(fixtureMap(), "cell-review");
  const second = createQaAssetPlan(fixtureMap(), "cell-review");
  assert.deepEqual(first, second);
  assert.deepEqual(first.floorMaterialIds, [...first.floorMaterialIds].sort());
  assert.deepEqual(first.floorMaterialIds, [
    "cobblestone_pavement",
    "grey_tiles",
    "large_sandstone_blocks_01",
    "patterned_cobblestone",
    "red_sandstone_pavement",
    "sand_01",
  ]);
  assert.ok(first.wallMaterialIds.includes("ph_painted_plaster_warm"));
  assert.deepEqual(first.propModelIds, ["ph_wooden_crate_02"]);
  assert.deepEqual(
    first.requiredLogicalRequestIds,
    [...first.requiredLogicalRequestIds].sort(),
  );
  assert.equal(
    first.hash,
    hashQaAssetRequestIds(first.profile, first.requiredLogicalRequestIds),
  );
});

test("current V3 plan derives door models only from compiled runtime placements", () => {
  const runtimeSpecUrl = new URL(
    "../../../public/maps/bazaar-map/map_spec.json",
    import.meta.url,
  );
  const raw = JSON.parse(readFileSync(runtimeSpecUrl, "utf8")) as unknown;
  const blockout = parseBlockoutSpec(raw, runtimeSpecUrl.pathname);
  const mapAssets: RuntimeMapAssets = {
    blockout,
    anchors: parseAnchorsSpec(raw, runtimeSpecUrl.pathname),
    shots: { metadata: {}, shots: [] },
  };
  assert.match(blockout.formatVersion ?? "", /^3(?:\.|$)/);

  const modelIdByAssetId = new Map(
    (blockout.assetRegistry ?? [])
      .filter((asset) => asset.runtime?.mode === "model")
      .map((asset) => [asset.id, asset.runtime!.id] as const),
  );
  const compiledDoorModelIds = [...new Set(
    (blockout.architecturePlacements ?? []).flatMap((placement) => {
      if (placement.kind !== "facade_module" || placement.moduleKind !== "door" || !placement.assetId) {
        return [];
      }
      const modelId = modelIdByAssetId.get(placement.assetId);
      return modelId ? [modelId] : [];
    }),
  )].sort();
  const plan = createQaAssetPlan(mapAssets, "cell-review", {
    floorPbr: false,
    wallPbr: false,
    wallDetails: false,
    bazaarProps: false,
    doorModels: true,
  });
  assert.deepEqual(plan.doorModelIds, compiledDoorModelIds);
  assert.ok(!plan.doorModelIds.includes("ph_rollershutter_window_02"));

  const buildBlockoutSource = readFileSync(
    new URL("../map/buildBlockout.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    buildBlockoutSource,
    /const wallDetailPlacements = isV3\s*\?\s*buildV3Architecture\(/,
    "V3 maps must continue to bypass the legacy wallDetailPlacer door selector",
  );
});

test("QA door loading selects the 1K derivative while normal loading keeps the 2K source", () => {
  const manifestUrl = new URL(
    "../../../public/assets/models/environment/bazaar/doors/models.json",
    import.meta.url,
  );
  const entries = parsePropModelManifest(
    JSON.parse(readFileSync(manifestUrl, "utf8")) as unknown,
  );
  const castleDoor = entries.find((entry) => entry.id === "ph_large_castle_door");
  assert.ok(castleDoor);
  assert.equal(
    resolvePropModelUrlForQuality(castleDoor),
    "large_castle_door/large_castle_door_2k.gltf",
  );
  assert.equal(
    resolvePropModelUrlForQuality(castleDoor, "1k"),
    "large_castle_door/large_castle_door_1k.gltf",
  );
  const rollerShutter = entries.find((entry) => entry.id === "ph_rollershutter_window_02");
  assert.ok(rollerShutter);
  assert.throws(
    () => resolvePropModelUrlForQuality(rollerShutter, "1k"),
    /missing required '1k' variant/,
  );

  const bootstrapSource = readFileSync(
    new URL("../bootstrap.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    bootstrapSource,
    /if \(qaAssetTracker && qaAssetPlan\)[\s\S]*?PropModelLibrary\.load\(DOOR_MANIFEST_URL, \{[\s\S]*?quality: "1k",[\s\S]*?\}\);[\s\S]*?\} else \{[\s\S]*?PropModelLibrary\.load\(DOOR_MANIFEST_URL\)/,
    "QA must select the 1K door variant while normal loading keeps the manifest default",
  );
});

test("QA facade requests remain pending between prop and door packs until the GLB completes", async () => {
  const map = fixtureMap();
  map.blockout.architecturePlacements = [{
    id: "massing", kind: "massing", frontageId: "frontage", zoneId: "A", face: "north",
    profileId: "profile", massingProfileId: "mass", center: { x: 0, y: 0, z: 0 },
    sizeM: { width: 4, depth: 2, height: 3 }, yawDeg: 0,
    materialSlots: map.blockout.facadeProfiles![0]!.materialSlots,
    roof: { style: "flat_parapet", setbackM: 0, parapetHeightM: 0.2, upperStorySetbackM: 0, elevationM: 3 },
    facadeModelId: "spice-facade",
  }];
  const plan = createQaAssetPlan(map, "cell-review", {
    floorPbr: false, wallPbr: false, wallDetails: false, bazaarProps: false, doorModels: true,
  });
  assert.deepEqual(plan.facadeModelIds, ["spice-facade"]);
  const requestId = qaFacadeModelRequestId("spice-facade");
  assert.ok(plan.requiredLogicalRequestIds.includes(requestId));
  const tracker = new QaAssetReadinessTracker(plan, 20_000, () => 0, () => "stable");
  let finishGlb!: () => void;
  const loading = tracker.track(requestId, new Promise<void>((resolve) => { finishGlb = resolve; }));
  // A poll after prior packs finish but before doors start must see the facade
  // still pending, even when the manifest and all other requests have settled.
  await Promise.resolve();
  assert.deepEqual(tracker.state().pending, [requestId]);
  assert.notEqual(tracker.state().observedPlanHash, plan.hash);
  assert.equal(tracker.state().ready, false);
  finishGlb();
  await loading;
  for (const id of plan.requiredLogicalRequestIds.filter((id) => id !== requestId)) {
    tracker.start(id);
    tracker.complete(id);
  }
  assert.deepEqual(tracker.state().pending, []);
  assert.equal(tracker.state().observedPlanHash, plan.hash);

  const bootstrapSource = readFileSync(new URL("../bootstrap.ts", import.meta.url), "utf8");
  assert.match(bootstrapSource, /qaAssetPlan\?\.facadeModelIds\.map\(qaFacadeModelRequestId\)/);
  assert.match(
    bootstrapSource,
    /for \(const requestId of qaFacadeRequestIds\) qaAssetTracker\?\.start\(requestId\);\s*facadeModels = await PropModelLibrary\.load\(FACADE_MANIFEST_URL, \{[\s\S]*?requestObserver: qaAssetTracker\.observer[\s\S]*?\}\);\s*for \(const requestId of qaFacadeRequestIds\) qaAssetTracker\?\.complete\(requestId\);/,
    "the facade load must stay tracked across the entire awaited manifest and GLB load",
  );
  assert.match(bootstrapSource, /for \(const requestId of qaFacadeRequestIds\) qaAssetTracker\.fail\(requestId, error\);/);
});

test("QA direct-texture inventory matches every static buildProps asset URL", () => {
  const buildPropsSource = readFileSync(
    new URL("../map/buildProps.ts", import.meta.url),
    "utf8",
  );
  const declaredUrls = [...buildPropsSource.matchAll(
    /["'](\/assets\/(?:models|textures)\/[^"']+\.(?:jpg|jpeg|png|webp))["']/g,
  )].map((match) => match[1]!);
  assert.deepEqual(
    [...new Set(declaredUrls)].sort(),
    [...QA_RENDERER_DIRECT_TEXTURE_URLS].sort(),
    "buildProps direct asset URLs changed without updating the QA asset plan",
  );

  const propsCoreSource = readFileSync(
    new URL("../map/propFamilies/propsCore.ts", import.meta.url),
    "utf8",
  );
  const propsCoreDeclaredUrls = [...propsCoreSource.matchAll(
    /["'](\/assets\/(?:models|textures)\/[^"']+\.(?:jpg|jpeg|png|webp))["']/g,
  )].map((match) => match[1]!);
  const plannedPropTextureUrls = new Set<string>(QA_RENDERER_DIRECT_TEXTURE_URLS);
  for (const url of new Set(propsCoreDeclaredUrls)) {
    assert.ok(
      plannedPropTextureUrls.has(url),
      `propsCore direct asset '${url}' is absent from the QA asset plan`,
    );
  }
});

test("QA direct-texture inventory covers palm and stained-glass loader declarations", () => {
  const palmSource = readFileSync(
    new URL("../map/buildDecorativePalms.ts", import.meta.url),
    "utf8",
  );
  const palmDeclaredUrls = [...palmSource.matchAll(
    /["'](\/assets\/(?:models|textures)\/[^"']+\.(?:jpg|jpeg|png|webp))["']/g,
  )].map((match) => match[1]!);
  assert.deepEqual(
    [...new Set(palmDeclaredUrls)].sort(),
    [...new Set([
      ...QA_PALM_DIRECT_TEXTURE_URLS["1k"],
      ...QA_PALM_DIRECT_TEXTURE_URLS["2k"],
    ])].sort(),
    "decorative palm texture declarations changed without updating the QA asset plan",
  );

  const windowsSource = readFileSync(
    new URL("../map/wallDetailFamilies/windows.ts", import.meta.url),
    "utf8",
  );
  const stainedGlassBase = windowsSource.match(
    /STAINED_GLASS_TEXTURE_BASE_URL\s*=\s*"([^"]+)"/,
  )?.[1];
  assert.ok(stainedGlassBase);
  const stainedGlassDeclaredUrls = [...windowsSource.matchAll(
    /\$\{STAINED_GLASS_TEXTURE_BASE_URL\}\/([^`]+\.(?:jpg|jpeg|png|webp))/g,
  )].map((match) => `${stainedGlassBase}/${match[1]}`);
  assert.deepEqual(
    [...new Set(stainedGlassDeclaredUrls)].sort(),
    [...QA_STAINED_GLASS_DIRECT_TEXTURE_URLS].sort(),
    "stained-glass texture declarations changed without updating the QA asset plan",
  );
});

test("QA plan includes only the selected palm tier and tracks stained glass when enabled", () => {
  const map = fixtureMap();
  map.anchors.anchors.push({
    id: "PALM_FIXTURE",
    type: "decorative_palm",
    zone: "A",
    pos: { x: 1, y: 1, z: 0 },
  });
  const plan = createQaAssetPlan(map, "cell-review", {
    floorPbr: false,
    wallPbr: false,
    wallDetails: true,
    bazaarProps: false,
    doorModels: false,
    textureTier: "1k",
  });
  for (const url of QA_PALM_DIRECT_TEXTURE_URLS["1k"]) {
    assert.ok(plan.directTextureUrls.includes(url));
  }
  const oneKPalmUrls = new Set<string>(QA_PALM_DIRECT_TEXTURE_URLS["1k"]);
  for (const url of QA_PALM_DIRECT_TEXTURE_URLS["2k"]) {
    if (!oneKPalmUrls.has(url)) {
      assert.ok(!plan.directTextureUrls.includes(url));
    }
  }
  for (const url of QA_STAINED_GLASS_DIRECT_TEXTURE_URLS) {
    assert.ok(plan.directTextureUrls.includes(url));
  }
});

test("QA readiness requires matching plan, zero failures, eight frames, and 500ms stability", () => {
  let now = 0;
  let resources = "resources:a";
  const requestId = "texture:a";
  const tracker = new QaAssetReadinessTracker(
    trackerPlan([requestId]),
    20_000,
    () => now,
    () => resources,
    now,
  );
  tracker.start(requestId);
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(12);
  now = 600;
  assert.equal(tracker.state().ready, false);

  tracker.complete(requestId);
  assert.equal(tracker.state().ready, false);
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(12);
  now = 1_200;
  assert.equal(tracker.state().ready, true);

  resources = "resources:b";
  tracker.recordRenderedFrame(12);
  assert.equal(tracker.state().ready, false);
});

test("QA readiness accepts registered child requests and reports their exact coverage", () => {
  let now = 0;
  const logicalId = "floor-material:floor-a";
  const childId = "floor-texture:https://example.test/floor-a_1k.png";
  const tracker = new QaAssetReadinessTracker(
    trackerPlan([logicalId]),
    20_000,
    () => now,
    () => "resources:stable",
    now,
  );
  tracker.observer.expectChild(childId);
  tracker.observer.start(logicalId);
  tracker.observer.start(childId);
  tracker.observer.complete(childId);
  tracker.observer.complete(logicalId);
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(1);
  now = 600;
  const state = tracker.state();
  assert.equal(state.ready, true);
  assert.deepEqual(state.plannedChildRequests, [childId]);
  assert.deepEqual(state.observedChildRequests, [childId]);
  assert.deepEqual(state.unexpectedRequests, []);
});

test("an unplanned 4K child request is surfaced and permanently blocks readiness", () => {
  let now = 0;
  const logicalId = "floor-material:floor-a";
  const unexpectedId = "floor-texture:https://example.test/floor-a_4k.png";
  const tracker = new QaAssetReadinessTracker(
    trackerPlan([logicalId]),
    20_000,
    () => now,
    () => "resources:stable",
    now,
  );
  tracker.start(logicalId);
  tracker.complete(logicalId);
  tracker.start(unexpectedId);
  tracker.complete(unexpectedId);
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(1);
  now = 600;
  const state = tracker.state();
  assert.equal(state.ready, false);
  assert.equal(state.observedPlanHash, state.planHash);
  assert.deepEqual(state.unexpectedRequests, [unexpectedId]);
});

test("a zero-request plan becomes ready only after rendered stability", () => {
  let now = 0;
  const tracker = new QaAssetReadinessTracker(
    trackerPlan(),
    20_000,
    () => now,
    () => "resources:stable",
    now,
  );
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(0);
  assert.equal(tracker.state().ready, false);
  now = 600;
  const state = tracker.state();
  assert.equal(state.ready, true);
  assert.deepEqual(state.plannedChildRequests, []);
  assert.deepEqual(state.observedChildRequests, []);
  assert.deepEqual(state.unexpectedRequests, []);
});

test("QA readiness exposes failures and a real timeout", () => {
  let now = 0;
  const requestId = "model:a";
  const tracker = new QaAssetReadinessTracker(
    trackerPlan([requestId]),
    1_000,
    () => now,
    () => "resources:a",
    now,
  );
  tracker.start(requestId);
  tracker.fail(requestId, new Error("model failed"));
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(2);
  now = 1_100;
  const state = tracker.state();
  assert.equal(state.ready, false);
  assert.equal(state.timedOut, true);
  assert.deepEqual(state.failed, [{ id: "model:a", message: "model failed" }]);
});

test("QA readiness permanently latches a deadline crossed before delayed completion", () => {
  let now = 0;
  const requestId = "model:delayed";
  const tracker = new QaAssetReadinessTracker(
    trackerPlan([requestId]),
    1_000,
    () => now,
    () => "resources:stable",
    now,
  );
  tracker.start(requestId);
  now = 1_100;
  tracker.complete(requestId);
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(1);
  now = 1_700;
  const state = tracker.state();
  assert.equal(state.timedOut, true);
  assert.equal(state.ready, false);
  assert.equal(state.readyAtMs, null);
});

test("nonempty plans cannot become ready without observed request starts and completions", () => {
  let now = 0;
  const plan = trackerPlan(["planned-but-never-requested"]);
  const tracker = new QaAssetReadinessTracker(
    plan,
    20_000,
    () => now,
    () => "resources:stable",
    now,
  );
  for (let frame = 0; frame < 16; frame += 1) tracker.recordRenderedFrame(4);
  now = 2_000;
  const state = tracker.state();
  assert.equal(state.ready, false);
  assert.notEqual(state.observedPlanHash, state.planHash);
  assert.equal(state.requestedCount, 0);
  assert.equal(state.completedCount, 0);
});

test("a delayed direct asset cannot reuse stability accumulated before it completes", async () => {
  let now = 0;
  let resolveFetch!: (response: Response) => void;
  const delayedResponse = new Promise<Response>((resolve) => {
    resolveFetch = resolve;
  });
  const plan = directTexturePlan(["/assets/delayed.png"]);
  const tracker = new QaAssetReadinessTracker(
    plan,
    20_000,
    () => now,
    () => "resources:stable",
    now,
  );
  const preload = preloadQaDirectTextures(
    plan,
    tracker,
    (() => delayedResponse) as typeof fetch,
  );
  await Promise.resolve();
  for (let frame = 0; frame < 16; frame += 1) tracker.recordRenderedFrame(4);
  now = 1_000;
  assert.equal(tracker.state().ready, false);
  assert.deepEqual(tracker.state().pending, [
    qaDirectTextureRequestId("/assets/delayed.png"),
  ]);

  resolveFetch(new Response(new Uint8Array([1]), { status: 200 }));
  await preload;
  assert.equal(tracker.state().ready, false);
  for (let frame = 0; frame < 8; frame += 1) tracker.recordRenderedFrame(5);
  now = 1_600;
  assert.equal(tracker.state().ready, true);
});

test("a missing direct asset records the failing planned request and permanently blocks capture", async () => {
  let now = 0;
  const url = "/assets/missing.png";
  const plan = directTexturePlan([url]);
  const tracker = new QaAssetReadinessTracker(
    plan,
    20_000,
    () => now,
    () => "resources:stable",
    now,
  );
  await assert.rejects(
    preloadQaDirectTextures(
      plan,
      tracker,
      (async () => new Response(null, {
        status: 404,
        statusText: "Not Found",
      })) as typeof fetch,
    ),
    /Failed to fetch direct texture \(404 Not Found\)/,
  );
  for (let frame = 0; frame < 16; frame += 1) tracker.recordRenderedFrame(4);
  now = 1_000;
  const state = tracker.state();
  assert.equal(state.ready, false);
  assert.deepEqual(state.failed, [{
    id: qaDirectTextureRequestId(url),
    message: "Failed to fetch direct texture (404 Not Found)",
  }]);
  assert.notEqual(state.observedPlanHash, state.planHash);
});

test("QA profile and timeout require explicit, bounded parameters", () => {
  assert.equal(resolveQaAssetProfile("?qa=1"), "qa");
  assert.equal(resolveQaAssetProfile("?qa=1&shot=SHOT_01"), "cell-review");
  assert.equal(resolveQaAssetProfile("?qaProfile=cell-review"), "cell-review");
  assert.equal(resolveQaAssetProfile("?shot=SHOT_01"), null);
  assert.equal(resolveQaAssetTimeoutMs(""), 20_000);
  assert.equal(resolveQaAssetTimeoutMs("?qaAssetTimeoutMs=100"), 1_000);
  assert.equal(resolveQaAssetTimeoutMs("?qaAssetTimeoutMs=500000"), 120_000);
});
