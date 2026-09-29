import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import {
  Box3,
  BoxGeometry,
  Color,
  DataTexture,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { PlayerController } from "../../sim/PlayerController";
import { WorldColliders } from "../../sim/collision/WorldColliders";
import { buildProps } from "./buildProps";
import { parseAnchorsSpec, parseBlockoutSpec } from "../spec/parseMapSpec";
import type { RuntimeDressingPlacement } from "../spec/types";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";

test("B18 north cabinet height changes only its authorized collider", async () => {
  const raw = JSON.parse(await readFile(new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8"));
  const blockout = parseBlockoutSpec(raw);
  const anchors = parseAnchorsSpec(raw);
  blockout.dressingPlacements = [];
  const models = { hasModel: () => false } as unknown as PropModelLibrary;
  const options = { mapId: blockout.mapId, blockout, anchors, seedOverride: null, propModels: models };
  const result = buildProps(options);
  const beforeAnchors = { ...anchors, anchors: anchors.anchors.filter((entry) => !entry.id.startsWith("B18_")).map((entry) => entry.id === "DYE_E_SHOP_2" ? { ...entry, heightM: 3.2 } : entry) };
  const before = buildProps({ ...options, anchors: beforeAnchors });
  const retained = (colliders: typeof result.colliders) => colliders.filter((entry) => entry.id !== "DYE_E_SHOP_2-shop");
  assert.deepEqual(retained(result.colliders), retained(before.colliders));
  const cabinet = result.colliders.find((entry) => entry.id === "DYE_E_SHOP_2-shop");
  assert.ok(cabinet);
  assert.ok(Math.abs(cabinet.min.x - 53) < .0001);
  assert.ok(Math.abs(cabinet.max.y - .9) < .0001);
  const world = new WorldColliders([...result.colliders, { id: "retained-east-wall", kind: "wall",
    min: { x: 53, y: 0, z: 32 }, max: { x: 53.35, y: 7, z: 48 } }], blockout.playable_boundary, blockout.traversalSurfaces);
  const player = new PlayerController();
  player.setWorld(world);
  player.setSpawn(52.2, 0, 44.82);
  for (let step = 0; step < 240; step++) {
    player.step(1 / 120, { forward: 1, right: 0, crouchHeld: false, jumpPressed: step === 0 || step === 120 }, -Math.PI / 2);
    assert.ok(player.getPosition().y < 1.01, "cabinet introduced a jump perch");
  }
  assert.ok(player.getPosition().y < .001);
});

const MODEL_FIXTURE_DIMENSIONS = new Map<string, { width: number; depth: number; height: number }>([
  ["ph_wooden_table_01", { width: 1.7996479273, depth: 0.6571746469, height: 0.5488492709 }],
  ["cc0_spice_sack", { width: 0.5316592455, depth: 0.5316592455, height: 0.5013803095 }],
  ["ph_brass_pot_01", { width: 0.3019456565, depth: 0.3016925901, height: 0.2909476549 }],
  ["ph_wine_barrel_01", { width: 0.7419015169, depth: 0.7560357153, height: 0.871263355 }],
  ["ph_ceramic_pot", { width: 0.656, depth: 0.502, height: 0.372 }],
  ["ph_wooden_crate_01", { width: 0.8252729177, depth: 0.4089537412, height: 0.3496182831 }],
  ["ph_wicker_basket_02", { width: 0.2119268924, depth: 0.2163341418, height: 0.2004578559 }],
  ["ph_wooden_lantern_01", { width: 0.221, depth: 0.235, height: 0.53 }],
]);

function createPropModelFixture(): PropModelLibrary {
  return {
    hasModel(id: string): boolean {
      return MODEL_FIXTURE_DIMENSIONS.has(id);
    },
    instantiate(id: string): Group {
      const dimensions = MODEL_FIXTURE_DIMENSIONS.get(id);
      assert.ok(dimensions, `unexpected prop-model fixture request: ${id}`);
      const root = new Group();
      root.name = `prop-template-${id}`;
      const geometry = new BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
      geometry.translate(0, dimensions.height * 0.5, 0);
      const model = new Mesh(geometry, new MeshStandardMaterial());
      model.name = `model-${id}`;
      root.add(model);
      return root;
    },
  } as unknown as PropModelLibrary;
}

function createSharedPropModelFixture(): PropModelLibrary {
  const templates = new Map<string, Group>();
  return {
    hasModel(id: string): boolean {
      return MODEL_FIXTURE_DIMENSIONS.has(id);
    },
    instantiate(id: string): Group {
      const dimensions = MODEL_FIXTURE_DIMENSIONS.get(id);
      assert.ok(dimensions, `unexpected shared prop-model fixture request: ${id}`);
      let template = templates.get(id);
      if (!template) {
        template = new Group();
        template.name = `prop-template-${id}`;
        const geometry = new BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
        geometry.translate(0, dimensions.height * 0.5, 0);
        const model = new Mesh(geometry, new MeshStandardMaterial());
        model.name = `model-${id}`;
        template.add(model);
        templates.set(id, template);
      }
      return template.clone(true);
    },
  } as unknown as PropModelLibrary;
}

// Explicit legacy renderer inputs survive approved retirement from the live map.
function legacyPlacement(id: string, moduleId: string, dimensionsM: RuntimeDressingPlacement["dimensionsM"],
  position: RuntimeDressingPlacement["position"], overrides: Partial<RuntimeDressingPlacement> = {}): RuntimeDressingPlacement {
  return { id, clusterId:"LEGACY_FIXTURE", assetId:moduleId, anchorId:id, zoneId:"SPICE_STREET", districtId:"DISTRICT_SPICE",
    classification:"soft_visual", position, yawDeg:90, scale:{x:1,y:1,z:1}, dimensionsM,
    collisionClass:"none", shadowPolicy:"cast_receive", lodEligible:true, semanticClass:"furniture",
    runtime:{mode:moduleId.startsWith("bazaar_")?"procedural":"model",id:moduleId}, ...overrides };
}

const legacyB4Placements = Array.from({length:12},(_,index)=>legacyPlacement(`LEGACY_B4_bazaar_ground_rug_${index}`,
  "bazaar_ground_rug",{width:2,depth:1.2,height:.04},{x:22,y:18+index,z:0}));

async function buildPolishResult(placements?: RuntimeDressingPlacement[]) {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = placements ?? (blockout.dressingPlacements ?? []).filter((placement) => (
    placement.runtime.id === "bazaar_fountain_octagonal"
  ));
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: parseAnchorsSpec(raw, specUrl.pathname),
    seedOverride: 73,
    propModels: createPropModelFixture(),
  });
}

async function buildPolishFixture() {
  return (await buildPolishResult()).root.getObjectByName("map-props-v3-compiled")!;
}

const legacySanitationPlacements = [
  ["ASSET_DYERS_SEALED_VAT", "ph_wine_barrel_01"],
  ["ASSET_DYERS_CERAMIC_VESSEL", "ph_ceramic_pot"],
  ["ASSET_CARAVAN_LOAD_CRATE", "ph_wooden_crate_01"],
].map(([assetId, modelId], index) => legacyPlacement(`LEGACY_SANITATION_${index}`, modelId!,
  MODEL_FIXTURE_DIMENSIONS.get(modelId!)!, { x: 14, y: 34 + index, z: 0 }, { assetId: assetId! }));

async function buildDistrictSanitationResult() {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = legacySanitationPlacements;
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: { mapId: blockout.mapId, anchors: [] },
    seedOverride: 73,
    propModels: createPropModelFixture(),
  });
}

async function buildSharedBrassPotResult() {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  const authored = legacyPlacement("LEGACY_BRASS_POT","ph_brass_pot_01",{width:.302,depth:.302,height:.291},{x:27,y:23,z:0});
  blockout.dressingPlacements = Array.from({ length: 4 }, (_, index) => ({
    ...structuredClone(authored),
    id: `${authored.id}:batch-fixture:${index + 1}`,
    position: {
      ...authored.position,
      x: authored.position.x + index * 0.42,
    },
  }));
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: parseAnchorsSpec(raw, specUrl.pathname),
    seedOverride: 73,
    propModels: createSharedPropModelFixture(),
  });
}

async function buildB4DressingResult() {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = legacyB4Placements;
  const anchors = { mapId:blockout.mapId, anchors:[] };
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propModels: createPropModelFixture(),
  });
}

async function buildCoverGoodsResult(anchorId: string | null = "COVER_SPICE_01") {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = (blockout.dressingPlacements ?? []).filter((placement) => (
    placement.assetId === "ASSET_COVER_GOODS" && (anchorId === null || placement.anchorId === anchorId)
  ));
  const anchors = parseAnchorsSpec(raw, specUrl.pathname);
  if (anchorId !== null) anchors.anchors = anchors.anchors.filter((anchor) => anchor.id === anchorId);
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propModels: createPropModelFixture(),
  });
}

async function buildSpiceCoverClusterResult() {
  const specUrl = new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = (blockout.dressingPlacements ?? []).filter((placement) => (
    placement.clusterId === "CLUSTER_SPICE_COVER"
  ));
  const anchors = parseAnchorsSpec(raw, specUrl.pathname);
  anchors.anchors = anchors.anchors.filter((anchor) => anchor.id === "COVER_SPICE_01");
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propModels: createPropModelFixture(),
  });
}

function mesh(root: Awaited<ReturnType<typeof buildPolishFixture>>, name: string): InstancedMesh {
  const object = root.getObjectByName(name);
  assert.ok(object instanceof InstancedMesh, `${name} is not an instanced module batch`);
  return object;
}

function uniqueVertexColors(target: InstancedMesh): Set<string> {
  const colors = target.geometry.getAttribute("color");
  assert.ok(colors, `${target.name} is missing authored vertex colors`);
  const unique = new Set<string>();
  for (let index = 0; index < colors.count; index += 1) {
    unique.add([
      colors.getX(index).toFixed(2),
      colors.getY(index).toFixed(2),
      colors.getZ(index).toFixed(2),
    ].join(":"));
  }
  return unique;
}

function instanceScale(target: InstancedMesh, index: number): Vector3 {
  const matrix = new Matrix4();
  target.getMatrixAt(index, matrix);
  const scale = new Vector3();
  matrix.decompose(new Vector3(), new Quaternion(), scale);
  return scale;
}

function instanceBounds(target: InstancedMesh, index: number): Box3 {
  target.geometry.computeBoundingBox();
  const matrix = new Matrix4();
  target.getMatrixAt(index, matrix);
  return target.geometry.boundingBox!.clone().applyMatrix4(matrix);
}

test("model dressing keeps CC0 sacks and brass pottery grounded at human scale", async () => {
  const result = await buildPolishResult([
    legacyPlacement("LEGACY_SACK","cc0_spice_sack",{width:.43,depth:.43,height:.405},{x:23,y:20,z:0},{scale:{x:.8,y:.8,z:.8}}),
    legacyPlacement("LEGACY_POT","ph_brass_pot_01",{width:.302,depth:.302,height:.291},{x:24,y:20,z:0}),
  ]);
  const root = result.root.getObjectByName("map-props-v3-compiled")!;

  const sackPlacements = result.renderedPlacements.filter((placement) => placement.moduleId === "cc0_spice_sack");
  assert.ok(sackPlacements.length > 0, "legacy fixture contains no explicit sack model");
  for (const placement of sackPlacements) {
    assert.equal(placement.representation, "model");
    assert.ok(placement.dimensionsM.height <= 0.46, `sack is too tall at ${placement.dimensionsM.height}m`);
    const placementRoot = root.getObjectByName(`v3-dressing-${placement.placementId}`);
    assert.ok(placementRoot instanceof Group);
    const bounds = new Box3().setFromObject(placementRoot);
    assert.ok(Math.abs(bounds.min.y) <= 0.001, `sack is not grounded: ${bounds.min.y}m`);
    const model = placementRoot.getObjectByName("model-cc0_spice_sack") as Mesh;
    assert.ok(model?.isMesh);
    assert.equal(model.castShadow, placement.shadowMode === "cast_receive");
    assert.equal(model.receiveShadow, placement.shadowMode === "cast_receive" || placement.shadowMode === "receive_only");
  }

  const brassPot = result.renderedPlacements.find((placement) => placement.moduleId === "ph_brass_pot_01");
  assert.ok(brassPot);
  assert.ok(brassPot.dimensionsM.width <= 0.31 && brassPot.dimensionsM.height <= 0.3);
  const brassRoot = root.getObjectByName(`v3-dressing-${brassPot.placementId}`);
  assert.ok(brassRoot instanceof Group);
  const brassSupportY = new Box3().setFromObject(brassRoot).min.y;
  assert.ok(
    brassSupportY >= -0.001 && brassSupportY <= 1.1,
    `brass pot is neither grounded nor supported at human scale: ${brassSupportY}m`,
  );
});

test("compiled dressing rejects procedural modules it no longer renders", async () => {
  await assert.rejects(
    buildPolishResult([legacyPlacement("RETIRED_STALL","bazaar_market_stall",{width:2.2,depth:1.35,height:2.2},{x:27,y:23,z:0})]),
    /unsupported compiled dressing module 'bazaar_market_stall' for placement 'RETIRED_STALL'/,
  );
});

test("repeated brass-pot batching preserves the authoritative cast-receive shadow policy", async () => {
  const result = await buildSharedBrassPotResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const batch = root.children.find((child) => (
    child instanceof InstancedMesh
    && child.name.includes("model-ph_brass_pot_01")
  ));
  assert.ok(batch instanceof InstancedMesh, "repeated brass pots were not retained as one shared batch");
  assert.equal(batch.count, 4);
  assert.equal(batch.castShadow, true);
  assert.equal(batch.receiveShadow, true);
  const qaInstances = batch.userData.visualQaInstances as Array<{ shadowMode?: string } | null>;
  assert.equal(qaInstances.length, 4);
  assert.ok(
    qaInstances.every((instance) => instance?.shadowMode === "cast_receive"),
    "batched brass-pot telemetry drifted from the authored cast-receive policy",
  );
});

test("CC0 merchant payloads preserve native pivots, dimensions, and focused triangle budgets", async () => {
  const rootUrl = new URL("../../../../public/assets/models/environment/bazaar/props/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("models.json", rootUrl), "utf8")) as {
    models: Array<{
      id: string;
      url: string;
      scale: number;
      source?: string;
      license?: string;
      md5?: Record<string, string>;
    }>;
  };
  const expected = [
    {
      id: "cc0_spice_sack",
      url: "spice_sack/spice_sack_1k.gltf",
      dimensions: [0.5316592455, 0.5013803095, 0.5316592455],
      triangles: 576,
    },
    {
      id: "ph_brass_pot_01",
      url: "brass_pot_01/brass_pot_01_1k.gltf",
      dimensions: [0.3019456565, 0.2909476549, 0.3016925901],
      triangles: 3_760,
    },
  ] as const;

  for (const asset of expected) {
    const manifestEntry = manifest.models.find((entry) => entry.id === asset.id);
    assert.ok(manifestEntry, `${asset.id} is missing from the prop manifest`);
    assert.equal(manifestEntry.url, asset.url);
    assert.equal(manifestEntry.scale, 1);
    assert.equal(manifestEntry.license, "CC0-1.0");
    assert.match(manifestEntry.source ?? "", /^https:\/\//);
    assert.ok(Object.keys(manifestEntry.md5 ?? {}).length > 0, `${asset.id} is missing provenance hashes`);
    const gltf = JSON.parse(await readFile(new URL(asset.url, rootUrl), "utf8")) as {
      meshes: Array<{ primitives: Array<{ indices: number; attributes: { POSITION: number } }> }>;
      accessors: Array<{ count: number; min?: number[]; max?: number[] }>;
      nodes: Array<{ mesh?: number; translation?: number[] }>;
      images: Array<{ uri: string }>;
    };
    const primitive = gltf.meshes[0]!.primitives[0]!;
    assert.equal(gltf.accessors[primitive.indices]!.count / 3, asset.triangles);
    const positions = gltf.accessors[primitive.attributes.POSITION]!;
    const translation = gltf.nodes.find((node) => node.mesh === 0)?.translation ?? [0, 0, 0];
    const dimensions = positions.max!.map((value, index) => value - positions.min![index]!);
    dimensions.forEach((value, index) => {
      assert.ok(Math.abs(value - asset.dimensions[index]!) <= 0.001, `${asset.id} dimension ${index} drifted`);
    });
    assert.ok(
      Math.abs(positions.min![1]! + translation[1]!) <= 0.001,
      `${asset.id} is not authored at a base-center pivot`,
    );
    assert.equal(gltf.images.length, 3);
    assert.ok(gltf.images.every((image) => image.uri.includes("_1k.")), `${asset.id} is not using only 1K textures`);
  }
});

test("legacy Caravan and Dyers model rendering excludes cart, cone-vat, and rack proxies", async () => {
  const result = await buildDistrictSanitationResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  assert.equal(root.getObjectByName("v3-merchant-cart-body"), undefined);
  assert.equal(root.getObjectByName("v3-merchant-cart-wheels"), undefined);
  assert.equal(root.getObjectByName("v3-dye-vessels"), undefined);
  assert.equal(result.colliders.length, 0, "soft district sanitation models changed gameplay collision");

  const modelPlacements = result.renderedPlacements.filter((placement) => (
    placement.assetId === "ASSET_DYERS_SEALED_VAT"
    || placement.assetId === "ASSET_DYERS_CERAMIC_VESSEL"
    || placement.assetId === "ASSET_CARAVAN_LOAD_CRATE"
  ));
  const authority = legacySanitationPlacements;
  const expectedCounts = new Map(
    ["ASSET_DYERS_SEALED_VAT", "ASSET_DYERS_CERAMIC_VESSEL", "ASSET_CARAVAN_LOAD_CRATE"]
      .map((assetId) => [assetId, authority.filter((placement) => placement.assetId === assetId).length]),
  );
  assert.equal(
    modelPlacements.length,
    [...expectedCounts.values()].reduce((total, count) => total + count, 0),
    "final-mode telemetry drifted from the explicit legacy fixtures",
  );
  assert.ok(modelPlacements.every((placement) => placement.representation === "model"));
  for (const [assetId, expectedCount] of expectedCounts) {
    assert.ok(expectedCount > 0, `${assetId} is missing from the legacy fixture`);
    assert.equal(
      modelPlacements.filter((placement) => placement.assetId === assetId).length,
      expectedCount,
      `${assetId} final-mode propagation drifted from authority`,
    );
  }
});

test("B4 lane rugs stay collisionless and render as one textured, varied rug family", async () => {
  const result = await buildB4DressingResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  assert.equal(result.colliders.length, 0, "B4 visual density introduced gameplay collision");

  const rugs = mesh(root, "v3-main-lane-ground-rugs");
  const b4Placements = legacyB4Placements;
  assert.equal(rugs.count, b4Placements.length, "B4 rug rendering drifted from authoritative placements");
  const material = rugs.material as MeshStandardMaterial;
  assert.ok(material.map, `${rugs.name} lost its real texture map`);
  assert.ok(material.roughness >= 0.5, `${rugs.name} lost its rough, shadow-readable surface response`);

  const countInstanceVariants = (module: InstancedMesh): { colors: number; proportions: number } => {
    const colors = new Set<string>();
    const proportions = new Set<string>();
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    for (let index = 0; index < module.count; index += 1) {
      const color = new Color();
      module.getColorAt(index, color);
      colors.add(color.getHexString());
      module.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      proportions.add(`${scale.x.toFixed(3)}:${scale.y.toFixed(3)}:${scale.z.toFixed(3)}`);
    }
    return { colors: colors.size, proportions: proportions.size };
  };
  const rugVariants = countInstanceVariants(rugs);
  assert.ok(
    rugVariants.colors >= Math.min(2, rugs.count)
      && rugVariants.proportions >= Math.min(2, rugs.count),
    "rug repeats need color and aspect variation",
  );

  assert.equal(
    result.renderedPlacements.some((placement) => placement.assetId === "ASSET_DECORATIVE_CRATE"),
    b4Placements.some((placement) => placement.assetId === "ASSET_DECORATIVE_CRATE"),
    "B4 renderer synthesized a display-crate family absent from authority",
  );
});

test("cover goods collide exactly where their crates and sack render, with a sack and flexible PBR tarp", async () => {
  const result = await buildCoverGoodsResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  // Three crates and one sack; the old envelope stood 1.15 m tall around goods
  // that top out near 0.6 m and stopped shots at empty air.
  assert.equal(result.colliders.length, 4, "cover-goods collider count changed");
  const pieces: Box3[] = [];
  const matrix = new Matrix4();
  for (const name of ["v3-cover-crate-horizontal-slat", "v3-cover-crate-painted-vertical-slat", "v3-cover-crate-diagonal-braced"]) {
    const crates = mesh(root, name);
    crates.geometry.computeBoundingBox();
    for (let index = 0; index < crates.count; index += 1) {
      crates.getMatrixAt(index, matrix);
      pieces.push(crates.geometry.boundingBox!.clone().applyMatrix4(matrix));
    }
  }
  root.updateMatrixWorld(true);
  const sack = root.getObjectByName("market-stall-goods-cc0_spice_sack");
  assert.ok(sack, "cover sack is missing");
  pieces.push(new Box3().setFromObject(sack, true));
  const colliderBoxes = result.colliders.map((collider) => new Box3(
    new Vector3(collider.min.x, collider.min.y, collider.min.z),
    new Vector3(collider.max.x, collider.max.y, collider.max.z),
  ));
  const same = (a: Box3, b: Box3) => a.min.distanceTo(b.min) < 1e-6 && a.max.distanceTo(b.max) < 1e-6;
  assert.ok(colliderBoxes.every((box) => pieces.some((piece) => same(box, piece))), "a cover collider does not match a rendered piece");
  assert.ok(pieces.every((piece) => colliderBoxes.some((box) => same(box, piece))), "a rendered cover piece lost its collider");
  assert.ok(Math.max(...colliderBoxes.map((box) => box.max.y)) < 0.7, "cover collider rises above the rendered goods");
  assert.ok(result.colliders.every((collider) => collider.kind === "prop" && collider.id.startsWith("COVER_SPICE_01-cover-")));
  const tarp = mesh(root, "v3-cover-goods-draped-tarp");
  assert.equal(tarp.count, 1);
  const tarpMaterial = tarp.material as MeshStandardMaterial;
  assert.ok(tarpMaterial.map);
  assert.equal(tarpMaterial.emissiveMap, null, "closeup cover cloth regained a flattening emissive copy");
  assert.equal(tarpMaterial.emissiveIntensity, 0);
  assert.ok(root.getObjectByName("market-stall-goods-cc0_spice_sack"), "cover sack is missing");
});

test("cover-goods layouts vary deterministically and every tarp intersects a support crate", async () => {
  const result = await buildCoverGoodsResult(null);
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const tarp = mesh(root, "v3-cover-goods-draped-tarp");
  const crateMeshes = [
    mesh(root, "v3-cover-crate-horizontal-slat"),
    mesh(root, "v3-cover-crate-painted-vertical-slat"),
    mesh(root, "v3-cover-crate-diagonal-braced"),
  ];
  assert.equal(tarp.count, 8);
  assert.ok(crateMeshes.every((crate) => crate.count === tarp.count));
  const piecesByAnchor = new Map<string, number>();
  for (const collider of result.colliders.filter((entry) => /-cover-\d+$/.test(entry.id))) {
    const anchorId = collider.id.replace(/-cover-\d+$/, "");
    piecesByAnchor.set(anchorId, (piecesByAnchor.get(anchorId) ?? 0) + 1);
  }
  assert.ok([...piecesByAnchor.values()].every((count) => count === 4), `a cover cluster became partially solid: ${JSON.stringify([...piecesByAnchor])}`);
  assert.equal(piecesByAnchor.has("COVER_TEXTILE_01"), false, "the lane-clearance rule no longer holds the textile cover open");

  const tarpTints = new Set<string>();
  for (let index = 0; index < tarp.count; index += 1) {
    const color = new Color();
    tarp.getColorAt(index, color);
    tarpTints.add(color.getHexString());
    const tarpBox = instanceBounds(tarp, index);
    assert.ok(
      crateMeshes.some((crate) => tarpBox.intersectsBox(instanceBounds(crate, index))),
      `cover tarp ${index} has no supporting crate overlap`,
    );
  }
  assert.equal(tarpTints.size, 3, "uint32 cover seed collapsed all placements onto one layout variant");
});

test("ground rugs receive cluster shadows without stacking a generic contact apron", async () => {
  const result = await buildSpiceCoverClusterResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const contacts = mesh(root, "v3-prop-ground-contact");
  assert.equal(
    contacts.count,
    4,
    "the low-profile rug should not add a fifth broad contact decal beneath the grounded goods",
  );
  const rug = mesh(root, "v3-main-lane-ground-rugs");
  assert.equal(rug.count, 1);
  assert.equal(rug.receiveShadow, true, "rug must retain the real shadows and contacts from the goods above it");
});

test("fountain is a grounded tiered court centerpiece with PBR stone, tile, spouts, water, and an accent apron", async () => {
  const result = await buildPolishResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const coreNames = [
    "v3-fountain-modular-stone",
    "v3-fountain-glazed-tile-segments",
    "v3-fountain-damp-contact",
    "v3-fountain-shallow-water",
    "v3-fountain-bronze-spouts",
  ];
  const fountainBounds = new Box3();
  fountainBounds.makeEmpty();
  for (const name of coreNames) fountainBounds.expandByObject(mesh(root, name));
  const size = fountainBounds.getSize(new Vector3());
  assert.ok(fountainBounds.min.y >= -0.001, `fountain sank below its court: ${fountainBounds.min.y}m`);
  assert.ok(size.y >= 1.28 && size.y <= 1.34, `fountain lost its tiered court presence: ${size.y}m`);
  assert.ok(size.x <= 3.05 && size.z <= 3.05, `fountain exceeded its 3m authored footprint: ${size.x}x${size.z}m`);

  const stone = mesh(root, "v3-fountain-modular-stone");
  const construction = stone.geometry.userData.fountainConstruction as {
    wallSegments: number;
    copingSegments: number;
    lowerCourseSegments: number;
    shoulderSegments: number;
    jointWidthM: number;
    finishedJointWidthM: number;
    deterministicWearVariants: number;
    reliefPanels: number;
    reliefElements: number;
    appliedPlaques: number;
    drainageCurbs: number;
    centralPedestals: number;
    upperBasinSegments: number;
    materialId: string;
    uvProjection: string;
    batteredWallNormals: string;
  };
  assert.equal(construction.wallSegments, 8);
  assert.equal(construction.copingSegments, 8);
  assert.equal(construction.lowerCourseSegments, 8);
  assert.equal(construction.shoulderSegments, 8);
  assert.ok(construction.jointWidthM >= 0.001 && construction.jointWidthM <= 0.003);
  assert.ok(construction.finishedJointWidthM >= 0.001 && construction.finishedJointWidthM <= 0.003);
  assert.equal(construction.deterministicWearVariants, 8);
  assert.equal(construction.reliefPanels, 0, "line-like applied relief returned to the clean basin faces");
  assert.equal(construction.reliefElements, 0, "wireframe-reading face strips returned to the fountain");
  assert.equal(construction.appliedPlaques, 0, "contrasting applied plaques returned to the carved-stone basin");
  assert.equal(construction.drainageCurbs, 0, "toy projecting drain nibs returned to the basin");
  assert.equal(construction.centralPedestals, 1, "tiered fountain lost its central pedestal");
  assert.equal(construction.upperBasinSegments, 8);
  assert.equal(construction.materialId, "ph_stone_trim_white");
  assert.equal(construction.uvProjection, "radial-face-local-2m");
  assert.equal(construction.batteredWallNormals, "flat-face-shared");
  assert.ok(uniqueVertexColors(stone).size >= 12, "authored stone and continuous base wear collapsed to a flat placeholder tint");

  const stoneMaterial = stone.material as MeshStandardMaterial;
  assert.equal(stoneMaterial.userData.materialId, "ph_stone_trim_white");
  assert.ok(stoneMaterial.map instanceof DataTexture, "fountain limestone is still a flat-cream placeholder");
  assert.ok(stoneMaterial.normalMap instanceof DataTexture, "fountain limestone lost its shallow normal response");
  assert.ok(stoneMaterial.roughnessMap instanceof DataTexture, "fountain limestone lost its roughness response");
  assert.equal(stoneMaterial.aoMap, stoneMaterial.roughnessMap);
  assert.ok(stoneMaterial.normalMap.name.endsWith("white_sandstone_blocks_02_nor_gl_1k.jpg"));
  assert.ok(stoneMaterial.roughnessMap.name.endsWith("white_sandstone_blocks_02_arm_1k.jpg"));
  assert.ok(Math.abs(stoneMaterial.normalScale.x - 0.38) <= 0.001);
  assert.ok(stoneMaterial.roughness >= 0.88 && stoneMaterial.roughness <= 0.93, "fountain stone lost its dry worn finish");
  assert.ok(stoneMaterial.color.r >= stoneMaterial.color.g, "fountain stone lost its pale limestone separation");

  const tiles = mesh(root, "v3-fountain-glazed-tile-segments");
  const tilework = tiles.geometry.userData.fountainTilework as {
    tileSegments: number;
    groutJoints: number;
    jointWidthM: number;
    basinLiningSegments: number;
    basinFloorPanels: number;
    upperBasinLiningSegments: number;
    uvProjection: string;
    surfaceFinish: string;
    orderedPaletteSequence: string;
    exteriorInlays: number;
  };
  assert.equal(tilework.tileSegments, 0);
  assert.equal(tilework.groutJoints, 16);
  assert.ok(tilework.jointWidthM >= 0.008 && tilework.jointWidthM <= 0.015);
  assert.equal(tilework.basinLiningSegments, 8);
  assert.equal(tilework.basinFloorPanels, 1);
  assert.equal(tilework.upperBasinLiningSegments, 8);
  assert.equal(tilework.uvProjection, "radial-face-local-0.32m");
  assert.equal(tilework.surfaceFinish, "mottled-glaze");
  assert.equal(tilework.orderedPaletteSequence, "eight-segment-blue-green-ochre");
  assert.equal(tilework.exteriorInlays, 0, "floating exterior cyan plaques returned");
  assert.ok(uniqueVertexColors(tiles).size >= 6, "restrained glazed-tile variants and grout collapsed to one ring");
  const tileMaterial = tiles.material as MeshStandardMaterial;
  assert.ok(tileMaterial.map instanceof DataTexture, "fountain tile returned to flat turquoise inserts");
  assert.ok(tileMaterial.roughness >= 0.2 && tileMaterial.roughness <= 0.28, "fountain glaze lost its ceramic response");

  const details = mesh(root, "v3-fountain-damp-contact");
  assert.deepEqual(details.geometry.userData.fountainDetails, {
    bronzeSpouts: 0,
    bronzeRosettes: 0,
    wetStreaks: 0,
    drainageNotches: 0,
    drainageChannels: 0,
    drainBars: 0,
    dampContactSegments: 8,
  });
  assert.equal(uniqueVertexColors(details).size, 1, "continuous damp contact curb lost its restrained single-tone finish");

  const water = mesh(root, "v3-fountain-shallow-water");
  assert.deepEqual(water.geometry.userData.fountainWater, {
    shallowSurfaces: 2,
    trickles: 4,
    drainSplashes: 4,
    spoutContactRipples: 4,
    surfaceElevationM: 0.342,
  });
  const waterMaterial = water.material;
  assert.ok(waterMaterial instanceof MeshPhysicalMaterial);
  // Transmission must stay at 0: any transmission > 0 forces three to
  // re-render the entire opaque scene per frame (see FOUNTAIN_WATER_MATERIAL_INPUTS).
  // The alpha blend alone carries the shallow translucent read.
  assert.ok(waterMaterial.transmission === 0 && waterMaterial.opacity <= 0.65, "fountain water must stay alpha-blended with zero transmission");
  assert.ok(waterMaterial.normalMap instanceof DataTexture, "fountain water lost its procedural ripple normal");
  // Guards that the water keeps a specular surface response, without pinning it
  // to near-mirror. At clearcoat 1 / specularIntensity 1 the pool returned one
  // uniform sheet of sky and read as a flat cyan lid; the floor here is what
  // stops it becoming a dead matte plane, which is what the check is actually
  // protecting against.
  assert.ok(waterMaterial.clearcoat >= 0.25 && waterMaterial.specularIntensity >= 0.4, "fountain water lost its specular surface response");
  assert.deepEqual(waterMaterial.userData.fountainWaterShader, {
    response: "view-dependent-fresnel",
    fresnelStrength: 0.42,
    rippleNormal: "procedural-scrolling",
  });
  assert.deepEqual(water.userData.fountainWaterAnimation, {
    clock: "render-frame",
    scrollPerFrame: { x: 0.00045, y: 0.00031 },
  });

  const accent = mesh(root, "v3-fountain-court-tile-apron");
  accent.geometry.computeBoundingBox();
  const accentSize = accent.geometry.boundingBox!.getSize(new Vector3()).multiply(instanceScale(accent, 0));
  assert.ok(
    accentSize.x >= 3.3 && accentSize.x <= 3.5 && accentSize.z >= 3.3 && accentSize.z <= 3.5,
    `court accent is no longer one tight basin-seated octagonal course: ${accentSize.x}x${accentSize.z}`,
  );
  assert.deepEqual(accent.geometry.userData.fountainCourtAccent, {
    apronSegments: 8,
    borderCourseSegments: 8,
    radialDatumKeys: 0,
    zelligeKeys: 0,
    dampStains: 4,
    jointWidthM: 0.024,
    geometryConcept: "jointed-octagonal-court-course",
  });
  const accentMatrix = new Matrix4();
  accent.getMatrixAt(0, accentMatrix);
  const accentBounds = accent.geometry.boundingBox!.clone().applyMatrix4(accentMatrix);
  assert.ok(accentBounds.min.y >= -0.0011 && accentBounds.min.y <= 0.01, `court apron lost flush ground contact: ${accentBounds.min.y}m`);
  assert.ok((accent.material as MeshStandardMaterial).map instanceof DataTexture, "court apron lost its PBR sandstone albedo");
  const bronze = mesh(root, "v3-fountain-bronze-spouts");
  assert.ok((bronze.material as MeshStandardMaterial).metalness >= 0.65);
  assert.deepEqual(bronze.geometry.userData.fountainBronze, {
    rosettes: 4,
    horizontalNecks: 4,
    downturnedNozzles: 4,
    elbows: 4,
  });

  const names = [...coreNames, "v3-fountain-court-tile-apron"];
  assert.ok(names.every((name) => mesh(root, name).count === 1), "fountain is no longer six deterministic module draws");
  const renderedTriangles = names.reduce((total, name) => {
    const target = mesh(root, name);
    return total + (target.geometry.index?.count ?? target.geometry.getAttribute("position").count) / 3 * target.count;
  }, 0);
  assert.ok(renderedTriangles >= 2_000 && renderedTriangles <= 8_000, `fountain missed its focused triangle target: ${renderedTriangles}`);

  const fountainColliders = result.colliders.filter((collider) => collider.id === "LMK_FOUNTAIN_01-fountain-collider");
  assert.equal(fountainColliders.length, 0, "compiled soft-visual fountain synthesized a new gameplay collider");

  const qa = stone.userData.visualQaInstances as Array<{ dimensions?: { x: number; y: number; z: number } } | null>;
  assert.deepEqual(qa[0]?.dimensions, { x: 3, y: 1.32, z: 3 });
});

test("approved dye cabinet colliders survive visual retirement with exact bounds and anchor height authority", async () => {
  const raw=JSON.parse(await readFile(new URL("../../../../public/maps/bazaar-map/map_spec.json",import.meta.url),"utf8"));
  const blockout=parseBlockoutSpec(raw);
  const anchors=parseAnchorsSpec(raw);
  anchors.anchors=anchors.anchors.filter(a=>a.id==="DYE_E_SHOP_2" || a.id==="DYE_W_SHOP_1");
  const displays=[
    legacyPlacement("OLD_B18_DISPLAY","ph_wooden_crate_01",{width:1.48,depth:.34,height:.76},{x:53.17,y:44.82,z:.14},{anchorId:"B18_SAMPLE_DISPLAY",yawDeg:450}),
    legacyPlacement("OLD_CENTRAL_DISPLAY","ph_wooden_crate_01",{width:1.48,depth:.34,height:.76},{x:40.83,y:36.14,z:.14},{anchorId:"CENTRAL_DYE_DISPLAY",yawDeg:270}),
  ];
  const build=(placements:RuntimeDressingPlacement[], sourceAnchors=anchors) => buildProps({mapId:blockout.mapId,
    blockout:{...blockout,dressingPlacements:placements},anchors:sourceAnchors,seedOverride:73,
    propModels:createPropModelFixture()});
  const before=build(displays),after=build([]);
  assert.deepEqual(after.colliders,before.colliders);
  assert.equal(after.colliders.length,2);
  const expected={"DYE_E_SHOP_2-shop":[53,.14,44.08,53.34,.9,45.56],"DYE_W_SHOP_1-shop":[40.66,.14,35.4,41,.9,36.88]};
  for(const c of after.colliders) {
    const limits=expected[c.id as keyof typeof expected];assert.ok(limits);
    [c.min.x,c.min.y,c.min.z,c.max.x,c.max.y,c.max.z].forEach((value,i)=>assert.ok(Math.abs(value-limits[i]!)<1e-10,`${c.id} bound${i}: ${value}`));
  }
  assert.equal(after.renderedPlacements.some(p=>p.placementId.startsWith("OLD_")),false);
  const taller=build([],{...anchors,anchors:anchors.anchors.map(a=>({...a,heightM:1.1}))});
  assert.ok(taller.colliders.every(c=>Math.abs(c.min.y-.14)<1e-10 && Math.abs(c.max.y-1.24)<1e-10));
  assert.throws(()=>build([],{...anchors,anchors:anchors.anchors.map(({heightM:_heightM,...a})=>a)}),/requires its authored solid height/);
});

test("central service-door collider takes its depth from the authored door", async () => {
  const raw=JSON.parse(await readFile(new URL("../../../../public/maps/bazaar-map/map_spec.json",import.meta.url),"utf8"));
  const blockout=parseBlockoutSpec(raw);
  const anchors=parseAnchorsSpec(raw);
  anchors.anchors=anchors.anchors.filter(a=>a.id==="DYE_W_SHOP_2");
  const build=(architecturePlacements=blockout.architecturePlacements ?? []) => buildProps({mapId:blockout.mapId,
    blockout:{...blockout,architecturePlacements,dressingPlacements:[]},anchors,seedOverride:73,propModels:createPropModelFixture()});
  const [door,...rest]=build().colliders;
  assert.equal(rest.length,0);
  assert.equal(door?.id,"DYE_W_SHOP_2-shop");
  [door.min.x,door.min.y,door.min.z,door.max.x,door.max.y,door.max.z].forEach((value,i)=>
    assert.ok(Math.abs(value-[40.87,0,44.64,41.13,2.845,46.08][i]!)<1e-10,`bound${i}: ${value}`));
  assert.throws(()=>build((blockout.architecturePlacements ?? []).filter(p=>p.id!=="ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_GROUND_01")),
    /requires its authored door and envelope/);
});
