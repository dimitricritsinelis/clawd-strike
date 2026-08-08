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
import { buildProps } from "./buildProps";
import {
  HERO_GATE_MAX_FIXTURE_GAP_M,
  HERO_GATE_MIN_FIXTURE_GAP_M,
  HERO_GATE_OUTER_RETURN_CLEARANCE_M,
  HERO_GATE_REFERENCE_DEPTH_M,
  HERO_GATE_REFERENCE_HEIGHT_M,
  HERO_GATE_REFERENCE_WIDTH_M,
  HERO_GATE_RETURN_PILLAR_WIDTH_M,
  HERO_GATE_ROUTE_HALF_CLEARANCE_M,
  resolveHeroGateDressingLayout,
} from "./propFamilies/gateDressing";
import { parseAnchorsSpec, parseBlockoutSpec } from "./types";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";

const POLISH_MODULES = new Set([
  "bazaar_market_stall",
  "cc0_spice_sack",
  "ph_brass_pot_01",
  "bazaar_signboard",
  "bazaar_laundry_line",
  "bazaar_dyers_workstation",
  "bazaar_cloth_canopy",
  "bazaar_fountain_octagonal",
  "bazaar_court_planter",
  "bazaar_spice_goods",
]);

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

async function buildPolishResult() {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = (blockout.dressingPlacements ?? []).filter((placement) => (
    POLISH_MODULES.has(placement.runtime.id)
    && !placement.id.includes("PLACE_B4_")
    && !placement.id.includes("PLACE_BPL")
  ));
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: parseAnchorsSpec(raw, specUrl.pathname),
    seedOverride: 73,
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: 0 },
    propVisuals: "bazaar",
    propModels: createPropModelFixture(),
    highVis: false,
  });
}

async function buildPolishFixture() {
  return (await buildPolishResult()).root.getObjectByName("map-props-v3-compiled")!;
}

async function buildSharedStallResult(includeStalls = true) {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = includeStalls
    ? (blockout.dressingPlacements ?? []).filter((placement) => placement.runtime.id === "bazaar_market_stall")
    : [];
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: parseAnchorsSpec(raw, specUrl.pathname),
    seedOverride: 73,
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: 0 },
    propVisuals: "bazaar",
    propModels: createPropModelFixture(),
    highVis: false,
  });
}

async function buildDistrictSanitationResult() {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = (blockout.dressingPlacements ?? []).filter((placement) => (
    placement.assetId === "ASSET_DYERS_SEALED_VAT"
    || placement.assetId === "ASSET_DYERS_CERAMIC_VESSEL"
    || placement.assetId === "ASSET_CARAVAN_LOAD_CRATE"
  ));
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: { mapId: blockout.mapId, anchors: [] },
    seedOverride: 73,
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels: createPropModelFixture(),
    highVis: false,
  });
}

async function buildSharedBrassPotResult() {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  const authored = (blockout.dressingPlacements ?? []).find((placement) => (
    placement.assetId === "ASSET_CC0_BRASS_POT"
  ));
  assert.ok(authored, "authoritative brass-pot placement is missing");
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
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels: createSharedPropModelFixture(),
    highVis: false,
  });
}

async function buildB4DressingResult() {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  blockout.dressingPlacements = (blockout.dressingPlacements ?? []).filter((placement) => (
    placement.id.includes("PLACE_B4_")
  ));
  const anchors = parseAnchorsSpec(raw, specUrl.pathname);
  anchors.anchors = anchors.anchors.filter((anchor) => anchor.id.startsWith("B4_"));
  return buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors,
    seedOverride: 73,
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels: createPropModelFixture(),
    highVis: false,
  });
}

async function buildCoverGoodsResult(anchorId: string | null = "COVER_SPICE_01") {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
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
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels: createPropModelFixture(),
    highVis: false,
  });
}

async function buildSpiceCoverClusterResult() {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
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
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels: createPropModelFixture(),
    highVis: false,
  });
}

async function buildRugGateFixture() {
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const blockout = parseBlockoutSpec(raw, specUrl.pathname);
  const placement = (blockout.dressingPlacements ?? []).find((candidate) => (
    candidate.runtime.id === "bazaar_rug_gate_arch"
  ));
  assert.ok(placement, "authored Rug Gate placement is missing");
  blockout.dressingPlacements = [placement];
  const result = buildProps({
    mapId: blockout.mapId,
    blockout,
    anchors: { mapId: blockout.mapId, anchors: [] },
    seedOverride: 73,
    propChaos: { profile: "subtle", jitter: null, cluster: null, density: null },
    propVisuals: "bazaar",
    propModels: null,
    highVis: false,
  });
  return {
    placement,
    result,
    root: result.root.getObjectByName("map-props-v3-compiled")!,
  };
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

function texturePixel(texture: DataTexture, u: number, v: number): readonly number[] {
  const image = texture.image as { data: Uint8Array; width: number; height: number };
  const x = Math.min(image.width - 1, Math.max(0, Math.floor(u * image.width)));
  const y = Math.min(image.height - 1, Math.max(0, Math.floor(v * image.height)));
  const offset = (y * image.width + x) * 4;
  return Array.from(image.data.slice(offset, offset + 3));
}

test("compiled merchant stall is a complete grounded prefab rather than a bare table", async () => {
  const result = await buildPolishResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  assert.equal(root.getObjectByName("v3-market-display"), undefined, "procedural table proxy is still rendered");

  const placementId = "PLACE_SPICE_STALLS_SPICE_W_SHOP_1";
  const goods = root.getObjectByName(`v3-market-stall-prefab-${placementId}`);
  assert.ok(goods instanceof Group, "market-stall goods composition is missing");
  assert.equal(goods.getObjectByName("model-ph_wooden_table_01"), undefined, "bare table mapping still renders");
  for (const modelId of ["ph_wooden_crate_01", "ph_wicker_basket_02", "ph_brass_pot_01", "ph_ceramic_pot"]) {
    const model = goods.getObjectByName(`model-${modelId}`) as Mesh;
    assert.ok(model?.isMesh, `${modelId} is missing from the stall goods composition`);
    assert.equal(model.castShadow, true);
    assert.equal(model.receiveShadow, true);
  }
  const structure = mesh(root, "v3-market-stall-timber-structure");
  const canopy = mesh(root, "v3-market-stall-cloth-canopy");
  const rug = mesh(root, "v3-market-stall-ground-rug");
  const hangingGoods = mesh(root, "v3-market-stall-hanging-goods");
  const backboard = mesh(root, "v3-market-stall-slatted-back");
  const shelves = mesh(root, "v3-market-stall-display-shelves");
  const header = mesh(root, "v3-market-stall-served-header");
  const visibleShelfStock = mesh(root, "v3-spice-shallow-baskets");
  const stallCount = result.renderedPlacements.filter(
    (placement) => placement.moduleId === "bazaar_market_stall",
  ).length;
  assert.ok(stallCount > 0, "compiled authority contains no merchant stalls");
  assert.equal(structure.count, stallCount);
  assert.equal(canopy.count, stallCount);
  assert.equal(rug.count, stallCount);
  assert.equal(hangingGoods.count, stallCount);
  assert.equal(backboard.count, stallCount);
  assert.ok(shelves.count >= stallCount, "each stall needs a supported display shelf");
  assert.ok(visibleShelfStock.count >= stallCount, "each stall needs visible generic storage/display mass");
  assert.equal(header.count, stallCount);
  const structureScale = instanceScale(structure, 0);
  assert.ok(structureScale.x >= 1.5 && structureScale.x <= 3, "seeded counter/frame width left a human-scale served bay");
  assert.ok(structureScale.y >= 1.8 && structureScale.y <= 2.4, "stall structure left its human-scale height range");
  assert.ok(structureScale.z >= 1 && structureScale.z <= 1.6, "stall structure left its served-bay depth range");
  assert.ok(instanceScale(canopy, 0).x > structureScale.x, "stall cloth does not overhang the timber frame");
  assert.ok(instanceScale(rug, 0).z > structureScale.z, "stall ground rug does not fill the footprint");
  assert.ok(new Box3().setFromObject(goods).min.y >= -0.001, "stall goods are not grounded or supported");

  const telemetry = result.renderedPlacements.find((placement) => placement.placementId === placementId);
  assert.equal(telemetry?.representation, "module");
  assert.equal(telemetry?.moduleId, "bazaar_market_stall");
  assert.equal(telemetry?.groundingGapM, 0);
  assert.equal(telemetry?.shadowMode, "cast_receive");
});

test("shared merchant stalls seed complete counter, shelf, header, and canopy silhouettes", async () => {
  const result = await buildSharedStallResult();
  const noStallBaseline = await buildSharedStallResult(false);
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const structures = mesh(root, "v3-market-stall-timber-structure");
  const backboards = mesh(root, "v3-market-stall-slatted-back");
  const shelves = mesh(root, "v3-market-stall-display-shelves");
  const headers = mesh(root, "v3-market-stall-served-header");
  const canopies = mesh(root, "v3-market-stall-cloth-canopy");

  const stallCount = result.renderedPlacements.filter(
    (placement) => placement.moduleId === "bazaar_market_stall",
  ).length;
  assert.ok(stallCount > 0, "authoritative shared-stall fixture is empty");
  assert.equal(structures.count, stallCount);
  assert.equal(backboards.count, structures.count, "every shared stall needs a finished rear display plane");
  assert.ok(shelves.count >= structures.count, "every shared stall needs at least one supported shelf");
  assert.equal(headers.count, structures.count, "every shared stall needs one centered served header");
  assert.equal(canopies.count, structures.count);
  const signatures = new Set(Array.from({ length: structures.count }, (_, index) => {
    const structure = instanceScale(structures, index);
    const header = instanceScale(headers, index);
    const canopy = instanceScale(canopies, index);
    return [structure.x, header.x, header.y, canopy.x, canopy.z].map((value) => value.toFixed(3)).join(":");
  }));
  assert.ok(
    signatures.size >= Math.min(3, structures.count),
    "shared stalls collapsed into one repeated silhouette",
  );
  const rugs = mesh(root, "v3-market-stall-ground-rug");
  assert.equal(rugs.count, structures.count);
  assert.ok(rugs.instanceColor, "stall rugs lost their per-served-bay textile identity");
  const rugColors = new Set(Array.from({ length: rugs.count }, (_, index) => {
    const color = new Color();
    rugs.getColorAt(index, color);
    return color.getHexString();
  }));
  assert.ok(rugColors.size >= 4, "stall rugs collapsed back to one repeated signature");
  assert.deepEqual(result.colliders, noStallBaseline.colliders, "stall finish changed gameplay collision");
});

test("Dyers wet-workstations are grounded seeded PBR prefabs without gameplay collision", async () => {
  const result = await buildPolishResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const stone = mesh(root, "v3-dyers-workstation-stone-apron");
  const indigoShell = mesh(root, "v3-dyers-workstation-indigo-basin-shell");
  const madderShell = mesh(root, "v3-dyers-workstation-madder-basin-shell");
  const timber = mesh(root, "v3-dyers-workstation-drying-rack");
  const textiles = mesh(root, "v3-dyers-workstation-drying-textiles");
  const indigo = mesh(root, "v3-dyers-workstation-indigo-bath");
  const madder = mesh(root, "v3-dyers-workstation-madder-bath");
  const drain = mesh(root, "v3-dyers-workstation-drainage-tools");
  const wetApron = mesh(root, "v3-dyers-workstation-wet-contact-apron");

  for (const target of [stone, indigoShell, madderShell, timber, textiles, indigo, madder, drain, wetApron]) {
    assert.equal(target.count, 2, `${target.name} did not propagate from the canonical Dogleg instance to North Court`);
  }
  for (const target of [stone, indigoShell, madderShell, timber, drain, wetApron]) {
    const material = target.material as MeshStandardMaterial;
    assert.ok(material.map, `${target.name} lost its real albedo texture`);
    assert.ok(material.normalMap, `${target.name} lost its normal response`);
    assert.ok(material.roughnessMap, `${target.name} lost its packed roughness response`);
  }
  assert.ok((textiles.material as MeshStandardMaterial).map, "wet-work textiles lost their real textile albedo");
  assert.ok(textiles.instanceColor, "workstation textile variants lost deterministic tint variation");
  const textileColors = new Set(Array.from({ length: textiles.count }, (_, index) => {
    const color = new Color();
    textiles.getColorAt(index, color);
    return color.getHexString();
  }));
  assert.equal(textileColors.size, 2, "the propagated workstation still clones the canonical textile signature");

  const placements = result.renderedPlacements.filter((placement) => placement.moduleId === "bazaar_dyers_workstation");
  assert.equal(placements.length, 2);
  assert.ok(placements.every((placement) => placement.groundingGapM === 0));
  assert.ok(placements.every((placement) => placement.materialMode === "pbr"));
  assert.ok(result.colliders.every((collider) => !collider.id.includes("WORKSTATION")), "render-only workstation added gameplay collision");
});

test("Spice display uses explicit CC0 sacks and brass pottery at human scale", async () => {
  const result = await buildPolishResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  assert.equal(root.getObjectByName("v3-spice-tied-sacks"), undefined, "procedural sack proxy is still rendered");

  const sackPlacements = result.renderedPlacements.filter((placement) => placement.moduleId === "cc0_spice_sack");
  assert.ok(sackPlacements.length > 0, "authoritative Spice dressing contains no explicit sack model");
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

  const baskets = mesh(root, "v3-spice-shallow-baskets");
  assert.ok(baskets.count >= 3, "Spice composition lost its shallow basket cluster");
  for (const name of ["v3-spice-mound-gold", "v3-spice-mound-rust", "v3-spice-mound-ochre"]) {
    const powder = mesh(root, name);
    assert.ok(powder.count > 0, `${name} lost all authored floor placements`);
    for (let index = 0; index < powder.count; index += 1) {
      const scale = instanceScale(powder, index);
      assert.ok(scale.y <= 0.046, `${name} regressed to a cone at ${scale.y}m tall`);
      assert.ok(scale.y / Math.min(scale.x, scale.z) <= 0.5, `${name} is not a shallow powder bed`);
    }
  }
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
  const rootUrl = new URL("../../../public/assets/models/environment/bazaar/props/", import.meta.url);
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
      id: "ph_wooden_table_01",
      url: "wooden_table_01/WoodenTable_01_1k.gltf",
      dimensions: [1.7996479273, 0.5488492709, 0.6571746469],
      triangles: 952,
    },
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

test("Caravan and Dyers final mode use explicit finished models without cart, cone-vat, or rack proxies", async () => {
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
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const authority = parseBlockoutSpec(raw, specUrl.pathname).dressingPlacements ?? [];
  const expectedCounts = new Map(
    ["ASSET_DYERS_SEALED_VAT", "ASSET_DYERS_CERAMIC_VESSEL", "ASSET_CARAVAN_LOAD_CRATE"]
      .map((assetId) => [assetId, authority.filter((placement) => placement.assetId === assetId).length]),
  );
  assert.equal(
    modelPlacements.length,
    [...expectedCounts.values()].reduce((total, count) => total + count, 0),
    "final-mode telemetry drifted from authoritative district dressing",
  );
  assert.ok(modelPlacements.every((placement) => placement.representation === "model"));
  for (const [assetId, expectedCount] of expectedCounts) {
    assert.ok(expectedCount > 0, `${assetId} is missing from authoritative dressing`);
    assert.equal(
      modelPlacements.filter((placement) => placement.assetId === assetId).length,
      expectedCount,
      `${assetId} final-mode propagation drifted from authority`,
    );
  }
});

test("B4 lane dressing stays collisionless and renders its authored textured rug and cart families", async () => {
  const result = await buildB4DressingResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  assert.equal(result.colliders.length, 0, "B4 visual density introduced gameplay collision");

  const rugs = mesh(root, "v3-main-lane-ground-rugs");
  const carts = mesh(root, "v3-main-lane-market-carts");
  const specUrl = new URL("../../../public/maps/bazaar-map/map_spec.json", import.meta.url);
  const raw = JSON.parse(await readFile(specUrl, "utf8"));
  const b4Placements = (parseBlockoutSpec(raw, specUrl.pathname).dressingPlacements ?? [])
    .filter((placement) => placement.id.includes("PLACE_B4_"));
  assert.equal(
    rugs.count,
    b4Placements.filter((placement) => placement.runtime.id === "bazaar_ground_rug").length,
    "B4 rug rendering drifted from authoritative placements",
  );
  assert.equal(
    carts.count,
    b4Placements.filter((placement) => placement.runtime.id === "bazaar_market_cart").length,
    "B4 cart rendering drifted from authoritative placements",
  );
  for (const module of [rugs, carts]) {
    const material = module.material as MeshStandardMaterial;
    assert.ok(material.map, `${module.name} lost its real texture map`);
    assert.ok(material.roughness >= 0.5, `${module.name} lost its rough, shadow-readable surface response`);
  }

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
  const cartVariants = countInstanceVariants(carts);
  assert.ok(
    rugVariants.colors >= Math.min(2, rugs.count)
      && rugVariants.proportions >= Math.min(2, rugs.count),
    "rug repeats need color and aspect variation",
  );
  assert.ok(cartVariants.colors >= 2 && cartVariants.proportions === 3, "cart repeats need color and silhouette variation");

  assert.equal(
    result.renderedPlacements.some((placement) => placement.assetId === "ASSET_DECORATIVE_CRATE"),
    b4Placements.some((placement) => placement.assetId === "ASSET_DECORATIVE_CRATE"),
    "B4 renderer synthesized a display-crate family absent from authority",
  );
});

test("cover goods preserve the authored hard collider while adding sacks and a flexible PBR tarp", async () => {
  const result = await buildCoverGoodsResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  assert.equal(result.colliders.length, 1, "cover-goods collider count changed");
  const collider = result.colliders[0]!;
  assert.deepEqual(
    {
      width: Number((collider.max.x - collider.min.x).toFixed(2)),
      height: Number((collider.max.y - collider.min.y).toFixed(2)),
      depth: Number((collider.max.z - collider.min.z).toFixed(2)),
    },
    { width: 1.04, height: 1.15, depth: 0.96 },
    "rotated cover collider bounds changed",
  );
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

test("merchant signs use painted fields with symmetric emblems instead of placeholder strokes", async () => {
  const root = await buildPolishFixture();
  const first = mesh(root, "v3-sign-board-handpainted-a");
  const second = mesh(root, "v3-sign-board-handpainted-b");
  const third = mesh(root, "v3-sign-board-handpainted-c");
  const firstTexture = (first.material as MeshStandardMaterial).map;
  const secondTexture = (second.material as MeshStandardMaterial).map;
  const thirdTexture = (third.material as MeshStandardMaterial).map;
  assert.ok(firstTexture instanceof DataTexture);
  assert.ok(secondTexture instanceof DataTexture);
  assert.ok(thirdTexture instanceof DataTexture);

  for (const texture of [firstTexture, secondTexture, thirdTexture]) {
    const field = texturePixel(texture, 0.16, 0.5);
    const center = texturePixel(texture, 0.5, 0.5);
    const leftDiamond = texturePixel(texture, 0.25, 0.5);
    const rightDiamond = texturePixel(texture, 0.75, 0.5);
    const frame = texturePixel(texture, 0.015, 0.5);
    const upperField = texturePixel(texture, 0.16, 0.22);
    const lowerField = texturePixel(texture, 0.16, 0.78);
    const innerFrame = texturePixel(texture, 0.062, 0.5);
    assert.notDeepEqual(center, field, "central merchant emblem disappeared into the field");
    assert.deepEqual(leftDiamond, rightDiamond, "merchant emblem lost its intentional symmetry");
    assert.notDeepEqual(frame, field, "painted frame disappeared into the sign field");
    assert.notDeepEqual(frame, innerFrame, "sign perimeter lost its coherent edge wear");
    assert.notDeepEqual(upperField, lowerField, "sign field lost its broad sun-fade gradient");
  }
  assert.notDeepEqual(
    texturePixel(firstTexture, 0.16, 0.5),
    texturePixel(secondTexture, 0.16, 0.5),
    "both merchant sign variants collapsed to one blank field",
  );
  assert.notDeepEqual(
    texturePixel(secondTexture, 0.16, 0.5),
    texturePixel(thirdTexture, 0.16, 0.5),
    "third merchant sign field collapsed into an existing repeat",
  );

  const frame = mesh(root, "v3-sign-frame");
  const rig = mesh(root, "v3-sign-forged-rod-ring-rig");
  assert.equal(rig.count, frame.count, "each grammar-served board requires one complete hanging rig");
  rig.geometry.computeBoundingBox();
  const rigSize = rig.geometry.boundingBox!.getSize(new Vector3());
  assert.ok(rigSize.y > 0.58, "sign rods and linked rings no longer reach the facade attachment");
  assert.ok((rig.material as MeshStandardMaterial).metalness >= 0.45, "sign rig no longer reads as forged metal");
});

test("B6 laundry spans remain collisionless above head height and vary their textile layouts", async () => {
  const result = await buildPolishResult();
  const root = result.root.getObjectByName("map-props-v3-compiled")!;
  const ropes = mesh(root, "v3-overhead-laundry-rope");
  const clothA = mesh(root, "v3-overhead-laundry-cloth-a");
  const clothB = mesh(root, "v3-overhead-laundry-cloth-b");
  const clothDyers = mesh(root, "v3-overhead-laundry-cloth-dyers");
  const clipsA = mesh(root, "v3-overhead-laundry-clips-a");
  const clipsB = mesh(root, "v3-overhead-laundry-clips-b");
  const clipsDyers = mesh(root, "v3-overhead-laundry-clips-dyers");
  const lanterns = mesh(root, "v3-overhead-laundry-lanterns");
  const bundles = mesh(root, "v3-overhead-laundry-bundles");
  const dropRopes = mesh(root, "v3-overhead-laundry-drop-ropes");
  const placements = result.renderedPlacements.filter((placement) => placement.moduleId === "bazaar_laundry_line");
  assert.equal(ropes.count, placements.length);
  const ropeMatrix = new Matrix4();
  const ropeScale = new Vector3();
  ropes.getMatrixAt(0, ropeMatrix);
  ropeMatrix.decompose(new Vector3(), new Quaternion(), ropeScale);
  assert.ok(
    ropeScale.y >= 0.38 / 0.34,
    "catenary sag regressed to the labeled asset height instead of the authored world span",
  );
  assert.equal(
    lanterns.count,
    ropes.count - 1,
    "only the SHOT_15 Spice closeup line may omit its detached lantern/drop assembly",
  );
  assert.equal(bundles.count, ropes.count, "each catenary span lost its camera-scale folded bundle");
  assert.equal(dropRopes.count, lanterns.count, "hanging lanterns lost their visible suspension drops");
  assert.equal(ropes.castShadow, true, "catenary rope stopped casting the overhead shadow cue");
  assert.equal(lanterns.castShadow, true, "modeled overhead lantern stopped casting a shadow");
  assert.equal(bundles.castShadow, true, "folded overhead textile stopped casting a shadow");
  assert.equal(clothA.count + clothB.count + clothDyers.count, placements.length);
  assert.ok(clothA.count > 0 && clothB.count > 0, "cross-facade laundry collapsed to one readable repeat");
  assert.equal(clipsA.count, clothA.count, "laundry variant A lost its visible clothespins");
  assert.equal(clipsB.count, clothB.count, "laundry variant B lost its visible clothespins");
  assert.equal(clipsDyers.count, clothDyers.count, "dyers laundry lost its visible clothespins");
  assert.ok(
    (clipsA.material as MeshStandardMaterial).normalMap && (clipsB.material as MeshStandardMaterial).normalMap,
    "laundry clips regressed to flat placeholder material",
  );
  const qaPlacementIds = [ropes, clothA, clothB, clothDyers]
    .flatMap((batch) => (batch.userData.visualQaInstances ?? []) as Array<{ placementId?: string } | null>)
    .filter((qa): qa is { placementId?: string } => qa !== null)
    .map((qa) => qa.placementId)
    .filter((placementId): placementId is string => typeof placementId === "string");
  assert.equal(
    qaPlacementIds.length,
    placements.length,
    "laundry submeshes emitted duplicate module-level QA records",
  );
  assert.equal(
    new Set(qaPlacementIds).size,
    placements.length,
    "laundry placement ids are not unique across QA batches",
  );
  assert.ok(
    result.colliders.every((collider) => !collider.id.includes("B6_LAUNDRY")),
    "overhead laundry changed gameplay collision",
  );
  assert.ok(placements.length >= 3, "compiled map lost its repeated cross-facade laundry family");
  assert.ok(placements.every((placement) => placement.center.y - placement.dimensionsM.height * 0.5 > 3.5));
  const fixtureQa = (mesh(root, "v3-canopy-rings-brackets").userData.visualQaInstances ?? []) as Array<{
    moduleId?: string;
  } | null>;
  assert.equal(
    fixtureQa.filter((instance) => instance?.moduleId === "laundry_wall_ring").length,
    placements.length * 4,
    "laundry ropes lost the eye and wall ring at each of their two facade endpoints",
  );
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
  assert.ok(Math.abs(stoneMaterial.normalScale.x - 0.68) <= 0.001);
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
  assert.ok(waterMaterial.transmission >= 0.15 && waterMaterial.opacity <= 0.65, "fountain water is no longer shallow and restrained");
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

  const planterStone = mesh(root, "v3-fountain-court-planter-stone");
  assert.equal(planterStone.count, 3);
  assert.ok((planterStone.material as MeshStandardMaterial).map instanceof DataTexture);
});

test("canopy support reaches the cloth edge with a forged bracket and preserves the draw budget", async () => {
  const root = await buildPolishFixture();
  const fixtures = mesh(root, "v3-canopy-rings-brackets");
  fixtures.geometry.computeBoundingBox();
  const fixtureSize = fixtures.geometry.boundingBox!.getSize(new Vector3());
  assert.ok(fixtureSize.x >= 0.46 && fixtureSize.x <= 0.53, `fixture arm no longer bridges the wall-to-cloth gap: ${fixtureSize.x}m`);
  assert.ok(fixtureSize.y >= 0.31 && fixtureSize.y <= 0.36, `fixture plate profile drifted: ${fixtureSize.y}m`);
  assert.equal(fixtures.castShadow, false, "micro canopy fixtures regained per-instance shadow cost");
  const fixtureMaterial = fixtures.material as MeshStandardMaterial;
  assert.ok(fixtureMaterial.metalness >= 0.18, "canopy bracket no longer reads as forged metal");
  const qaInstances = fixtures.userData.visualQaInstances as Array<{ shadowMode?: string } | null>;
  assert.ok(qaInstances.every((instance) => instance?.shadowMode === "cast_only"));

  // The span's longitudinal cordage is sampled into the cloth module so it can
  // follow the catenary; this batch now carries only the four wall corner ties
  // per span that a straight instanced rope can still describe honestly.
  assert.equal(mesh(root, "v3-canopy-edge-ropes").count, 16, "corner ties are not batched with the canopy edge ropes");
  const cloth = mesh(root, "v3-canopy-cloth");
  const positions = cloth.geometry.getAttribute("position");
  const minYNear = (z: number): number => {
    let min = Number.POSITIVE_INFINITY;
    for (let index = 0; index < positions.count; index += 1) {
      if (Math.abs(positions.getX(index)) > 0.01 || Math.abs(positions.getZ(index) - z) > 0.035) continue;
      min = Math.min(min, positions.getY(index));
    }
    return min;
  };
  assert.ok(minYNear(-0.333) < minYNear(-0.496) - 0.35, "cloth lost its second-axis panel tension");
  const instanceColor = cloth.instanceColor;
  assert.ok(instanceColor, "Dyers canopy lost its deterministic district tint");
  assert.ok(
    instanceColor.getY(0) > instanceColor.getX(0) && instanceColor.getZ(0) > instanceColor.getX(0),
    "Dyers canopy no longer reads as blue-green cloth",
  );
  const centerlineZ = Array.from({ length: positions.count }, (_, index) => index)
    .filter((index) => Math.abs(positions.getX(index)) <= 0.01)
    .map((index) => positions.getZ(index));
  // The sheet is one continuous surface, so the invariant is that a vertex row
  // lands exactly on each authored batten station and the panels either side
  // share it. A row that misses the station is a sliver of open sky.
  for (const seamZ of [-1 / 6, 1 / 6]) {
    const nearestOffset = Math.min(...centerlineZ.map((z) => Math.abs(z - seamZ)));
    assert.ok(
      nearestOffset <= 0.001,
      `covered-souk cloth seam reopened to sky: no row on station ${seamZ.toFixed(4)} (nearest ${nearestOffset.toFixed(4)})`,
    );
  }
  const hangRopes = mesh(root, "v3-canopy-hang-ropes");
  assert.ok(hangRopes.count >= 24 && hangRopes.count % 2 === 0, "canopy and laundry supports lost their paired vertical load paths");
  const trestles = mesh(root, "v3-canopy-wall-trestles");
  assert.equal(trestles.count, 8, "each full-street cloth span needs one trestle on both served walls");
  assert.ok((trestles.material as MeshStandardMaterial).map instanceof DataTexture, "canopy trestles regressed to flat timber");
  assert.equal(root.children.length, 62, "served-souk canopy families drifted from their deterministic batch budget");
});

test("Rug Gate stays collider-neutral and inside its exact authored telemetry envelope", async () => {
  const { placement, result, root } = await buildRugGateFixture();
  assert.equal(result.colliders.length, 0, "visual Rug Gate placement introduced gameplay collision");
  assert.equal(root.children.length, 9, "Rug Gate draw families drifted from its open arch, tiled crown, four-batch textile kit and ground contact");
  assert.equal(mesh(root, "v3-rug-gate-pillars").count, 2);
  assert.equal(mesh(root, "v3-rug-gate-crown").count, 1);
  assert.equal(mesh(root, "v3-rug-gate-crown-inlay").count, 1);
  assert.equal(mesh(root, "v3-rug-gate-cool-textile-kit").count, 1);
  assert.equal(mesh(root, "v3-rug-gate-cool-timber-kit").count, 1);
  assert.equal(mesh(root, "v3-rug-gate-warm-textile-kit").count, 1);
  assert.equal(mesh(root, "v3-rug-gate-warm-timber-kit").count, 1);
  assert.equal(mesh(root, "v3-rug-gate-inner-frame").count, 1);
  assert.equal(root.getObjectByName("v3-rug-gate-dark-recess"), undefined);
  assert.equal(root.getObjectByName("v3-rug-gate-timber-leaves"), undefined);
  assert.equal(root.getObjectByName("v3-rug-gate-ironwork"), undefined);

  // Measured over the gate's own draw families. The ground-contact decal is a
  // soft floor shadow rather than gate geometry, so it is deliberately outside
  // the authored massing envelope this guard protects.
  const bounds = new Box3();
  for (const child of root.children) {
    if (child.name === "v3-prop-ground-contact") continue;
    bounds.expandByObject(child);
  }
  const size = bounds.getSize(new Vector3());
  assert.ok(size.x <= placement.dimensionsM.width + 0.001, `gate exceeded authored width: ${size.x}m`);
  assert.ok(size.y <= placement.dimensionsM.height + 0.001, `gate exceeded authored height: ${size.y}m`);
  assert.ok(size.z <= placement.dimensionsM.depth + 0.001, `gate exceeded authored depth: ${size.z}m`);
  assert.ok(Math.abs(bounds.min.y) <= 0.001, `threshold is not grounded: ${bounds.min.y}m`);

  assert.deepEqual(result.renderedPlacements, [{
    placementId: placement.id,
    anchorId: placement.anchorId,
    assetId: placement.assetId,
    moduleId: "bazaar_rug_gate_arch",
    semanticClass: "landmark",
    representation: "module",
    materialMode: "pbr",
    center: { x: placement.position.x, y: placement.dimensionsM.height * 0.5, z: placement.position.y },
    dimensionsM: placement.dimensionsM,
    groundingGapM: 0,
    shadowMode: "cast_receive",
  }]);

  const renderedTriangles = root.children.reduce((total, child) => {
    const batch = child as InstancedMesh;
    const triangles = (batch.geometry.index?.count ?? batch.geometry.getAttribute("position").count) / 3;
    return total + triangles * batch.count;
  }, 0);
  // P6's authored tiled crown adds a separate glazed inlay surface and stone
  // bezels. The fixed hero camera clearly kept that material separation, so
  // the queue's pre-approved geometry waiver raises only this measured gate
  // ceiling (5,118 triangles at acceptance), with final performance still
  // required to remain below the 12.5 ms completion median.
  assert.ok(renderedTriangles <= 5_200, `Rug Gate exceeded its focused triangle budget: ${renderedTriangles}`);
});

test("Rug Gate spans the lane with a pointed crown, wall-buried returns, and no fake floor threshold", async () => {
  const { root } = await buildRugGateFixture();
  const pillars = mesh(root, "v3-rug-gate-pillars");
  const crown = mesh(root, "v3-rug-gate-crown");
  const coolTextiles = mesh(root, "v3-rug-gate-cool-textile-kit");
  const coolFrame = mesh(root, "v3-rug-gate-cool-timber-kit");
  const warmTextiles = mesh(root, "v3-rug-gate-warm-textile-kit");
  const warmFrame = mesh(root, "v3-rug-gate-warm-timber-kit");
  const innerFrame = mesh(root, "v3-rug-gate-inner-frame");
  pillars.geometry.computeBoundingBox();
  crown.geometry.computeBoundingBox();

  const pierBounds = [0, 1].map((index) => {
    const matrix = new Matrix4();
    pillars.getMatrixAt(index, matrix);
    return pillars.geometry.boundingBox!.clone().applyMatrix4(matrix);
  }).sort((left, right) => left.min.x - right.min.x);
  const clearWidth = pierBounds[1]!.min.x - pierBounds[0]!.max.x;
  assert.ok(clearWidth >= 12.4, `Rug Gate returns stopped tying into the lane walls: ${clearWidth}m clear`);

  const positions = crown.geometry.getAttribute("position");
  let apexY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.count; index += 1) apexY = Math.max(apexY, positions.getY(index));
  const apexXs: number[] = [];
  let crownMinY = Number.POSITIVE_INFINITY;
  for (let index = 0; index < positions.count; index += 1) {
    if (Math.abs(positions.getY(index) - apexY) <= 0.0001) apexXs.push(positions.getX(index));
    crownMinY = Math.min(crownMinY, positions.getY(index));
  }
  assert.ok(apexXs.length > 0 && apexXs.every((x) => Math.abs(x) <= 0.051), "gate crown regressed to a round classical arch");
  assert.ok(crownMinY > -0.1, `gate crown regained a cross-lane floor strip at ${crownMinY}`);
  for (let index = 0; index < positions.count; index += 3) {
    const xs = [positions.getX(index), positions.getX(index + 1), positions.getX(index + 2)];
    const ys = [positions.getY(index), positions.getY(index + 1), positions.getY(index + 2)];
    const spansOpening = Math.min(...xs) < -0.1 && Math.max(...xs) > 0.1;
    const sitsOnLowerEdge = Math.max(...ys) < 0;
    assert.ok(!(spansOpening && sitsOnLowerEdge), "gate crown regained a cross-opening horizontal bridge");
  }

  const pillarMaterial = pillars.material as MeshStandardMaterial;
  const crownMaterial = crown.material as MeshStandardMaterial;
  const inlay = mesh(root, "v3-rug-gate-crown-inlay");
  const inlayMaterial = inlay.material as MeshStandardMaterial;
  assert.ok(pillarMaterial.map, "pillar PBR sandstone was disconnected");
  assert.ok(crownMaterial.map, "crown PBR sandstone was disconnected");
  assert.ok(crownMaterial.roughness >= 0.85, "Rug Gate crown lost its weathered sandstone response");
  assert.ok(inlayMaterial.map instanceof DataTexture, "Rug Gate inlay lost its deterministic glazed-tile surface");
  assert.ok(inlayMaterial.roughness >= 0.5, "Rug Gate inlay regained a synthetic glossy decal response");
  const pillarColors = uniqueVertexColors(pillars);
  const crownColors = uniqueVertexColors(crown);
  const coolTextileColors = uniqueVertexColors(coolTextiles);
  const warmTextileColors = uniqueVertexColors(warmTextiles);
  assert.ok(pillarColors.size >= 6, "tied pier masonry lost course separation");
  assert.ok(crownColors.size >= 5, "finished coping, stone, and restrained tile accents collapsed together");
  assert.ok(crownColors.has("0.84:0.76:0.62"), "gable slopes lost their datum-fitted coping stones");
  assert.ok(crownColors.has("0.70:0.61:0.47"), "gable shoulders lost their eave and terminal arris finish");
  assert.ok(!crownColors.has("0.12:0.36:0.38"), "pediment regained the disconnected teal tablet plane");
  assert.ok(uniqueVertexColors(inlay).size >= 3, "Rug Gate mosaic collapsed to one flat teal accent");
  crown.geometry.computeBoundingBox();
  inlay.geometry.computeBoundingBox();
  assert.ok(
    crown.geometry.boundingBox!.max.z > inlay.geometry.boundingBox!.max.z
      && crown.geometry.boundingBox!.min.z < inlay.geometry.boundingBox!.min.z,
    "Rug Gate tile infill escaped its stone lips",
  );
  assert.ok(coolTextileColors.has("0.27:0.50:0.52"), "cool indigo gate textile is missing");
  assert.ok(warmTextileColors.has("0.72:0.27:0.16"), "warm madder gate textile is missing");
  assert.notEqual(
    coolTextiles.geometry.getAttribute("position").count,
    warmTextiles.geometry.getAttribute("position").count,
    "gate textile variants regressed to tint-only clones",
  );
  for (const [side, targets] of [
    [-1, [coolTextiles, coolFrame]],
    [1, [warmTextiles, warmFrame]],
  ] as const) {
    for (const target of targets) {
      const authoredPositions = target.geometry.getAttribute("position");
      for (let index = 0; index < authoredPositions.count; index += 1) {
        const xM = authoredPositions.getX(index) * HERO_GATE_REFERENCE_WIDTH_M;
        const yM = authoredPositions.getY(index) * HERO_GATE_REFERENCE_HEIGHT_M;
        const zM = authoredPositions.getZ(index) * HERO_GATE_REFERENCE_DEPTH_M;
        assert.ok(
          side === -1
            ? xM <= -HERO_GATE_ROUTE_HALF_CLEARANCE_M + 1e-6 && xM >= -5.76 - 1e-6
            : xM >= HERO_GATE_ROUTE_HALF_CLEARANCE_M - 1e-6 && xM <= 5.76 + 1e-6,
          `${target.name} crosses the protected route or outer-return buffer at x=${xM.toFixed(3)}m`,
        );
        assert.ok(yM >= -0.001, `${target.name} falls below paving at y=${yM.toFixed(3)}m`);
        assert.ok(Math.abs(zM) <= 0.4 + 1e-6, `${target.name} exceeds gate depth at z=${zM.toFixed(3)}m`);
      }
    }
  }
  for (const [name, target] of [
    ["cool textile", coolTextiles],
    ["cool frame", coolFrame],
    ["warm textile", warmTextiles],
    ["warm frame", warmFrame],
  ] as const) {
    target.geometry.computeBoundingBox();
    const matrix = new Matrix4();
    target.getMatrixAt(0, matrix);
    const bounds = target.geometry.boundingBox!.clone().applyMatrix4(matrix);
    assert.ok(Math.abs(bounds.min.y) <= 0.001, `${name} is not grounded: ${bounds.min.y}m`);
  }
  for (const frame of [coolFrame, warmFrame]) {
    const material = frame.material as MeshStandardMaterial;
    assert.ok(
      material.map && material.normalMap && material.roughnessMap && material.aoMap,
      `${frame.name} regressed from full PBR timber`,
    );
    assert.equal(material.userData.materialId, "ph_rough_pine_door");
  }
  for (const textiles of [coolTextiles, warmTextiles]) {
    const material = textiles.material as MeshStandardMaterial;
    assert.ok(material.map, `${textiles.name} lost its woven albedo`);
    assert.equal(material.vertexColors, true);
    assert.equal(material.side, 2, `${textiles.name} lost its two-sided textile response`);
  }

  const innerFrameMaterial = innerFrame.material as MeshStandardMaterial;
  assert.ok(innerFrameMaterial.map && innerFrameMaterial.normalMap, "inner portal frame lost its finished stone transition");
  assert.equal(root.getObjectByName("v3-rug-gate-dark-recess"), undefined, "open portal regained a fake recess");
  assert.equal(root.getObjectByName("v3-rug-gate-timber-leaves"), undefined, "open portal regained timber doors");
  assert.equal(root.getObjectByName("v3-rug-gate-ironwork"), undefined, "open portal regained gate ironwork");
});

test("Rug Gate dressing keeps exactly three measured, asymmetric masses per flank outside the route", () => {
  const outerLimit = (
    (HERO_GATE_REFERENCE_WIDTH_M - HERO_GATE_RETURN_PILLAR_WIDTH_M * 2) * 0.5
    - HERO_GATE_OUTER_RETURN_CLEARANCE_M
  );
  const layouts = [
    resolveHeroGateDressingLayout("cool-tall"),
    resolveHeroGateDressingLayout("warm-low"),
  ];
  for (const layout of layouts) {
    assert.equal(layout.masses.length, 3);
    assert.deepEqual(
      layout.masses.map((mass) => mass.kind),
      ["threshold-textile", "rug-cradle", "textile-rack"],
    );
    const ordered = [...layout.masses].sort((left, right) => (
      Math.abs(left.centerX) - Math.abs(right.centerX)
    ));
    const innerEdge = Math.abs(ordered[0]!.centerX) - ordered[0]!.width * 0.5;
    const outerEdge = Math.abs(ordered[2]!.centerX) + ordered[2]!.width * 0.5;
    assert.ok(innerEdge >= HERO_GATE_ROUTE_HALF_CLEARANCE_M, `${layout.variant} enters the protected route`);
    assert.ok(outerEdge <= outerLimit + 1e-9, `${layout.variant} crowds the return arris`);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const inner = ordered[index]!;
      const outer = ordered[index + 1]!;
      const gap = (
        Math.abs(outer.centerX) - outer.width * 0.5
        - (Math.abs(inner.centerX) + inner.width * 0.5)
      );
      assert.ok(
        gap >= HERO_GATE_MIN_FIXTURE_GAP_M - 1e-9
        && gap <= HERO_GATE_MAX_FIXTURE_GAP_M + 1e-9,
        `${layout.variant} fixture gap ${gap.toFixed(3)}m is outside the authored band`,
      );
    }
  }
  assert.notDeepEqual(
    layouts[0]!.masses.map((mass) => [mass.width, mass.height, mass.depth]),
    layouts[1]!.masses.map((mass) => [mass.width, mass.height, mass.depth]),
    "gate flanks regressed to cloned dimensions",
  );
});
