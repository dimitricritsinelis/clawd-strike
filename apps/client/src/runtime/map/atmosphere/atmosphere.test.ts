import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Mesh } from "three";
import { classifySurfaceMaterial } from "../../render/materials/surfaceWeathering";
import { buildStreetAtmosphere, STREET_ATMOSPHERE } from "./buildStreetAtmosphere";

type Surface = { rect: { x: number; y: number; w: number; h: number } };
const runtimeSpec = JSON.parse(readFileSync(new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8")) as {
  traversalSurfaces: Surface[];
};

test("Surface weathering classifies by material kind, not by unit name", () => {
  assert.equal(classifySurfaceMaterial("bz10_textile_plaster", false), "plaster");
  assert.equal(classifySurfaceMaterial("bz11_rug_timber", false), "timber");
  assert.equal(classifySurfaceMaterial("bz10_textile_cloth", false), null);
  assert.equal(classifySurfaceMaterial("bz04_levantine_rug_project_original", false), null);
  assert.equal(classifySurfaceMaterial("bz12_stock_ceramic_pot", false), null);
  assert.equal(classifySurfaceMaterial("ph_bz04_painted_plaster_warm", false), "plaster");
  assert.equal(classifySurfaceMaterial("ph_bz04_stone_trim_sandstone", false), "masonry");
  assert.equal(classifySurfaceMaterial("bz04_craft_dark_iron", false), null);
  assert.equal(classifySurfaceMaterial("anything", true), "floor");
});

test("Street atmosphere records keep the BZ-04 clearance contract", () => {
  for (const a of STREET_ATMOSPHERE.awnings) {
    assert.ok(a.frontZ - a.valanceM >= 2.45 - 1e-6, `${a.id} valance below 2.45 m`);
  }
  for (const c of STREET_ATMOSPHERE.clutter) {
    assert.ok(c.projectionM <= 0.3 + 1e-6, `${c.id} projects ${c.projectionM} m`);
  }
  const floorUnder = (x: number, y: number): boolean => runtimeSpec.traversalSurfaces.some(({ rect }) => (
    x >= rect.x - 0.3 && x <= rect.x + rect.w + 0.3 && y >= rect.y - 0.3 && y <= rect.y + rect.h + 0.3
  ));
  for (const p of STREET_ATMOSPHERE.palms) {
    assert.ok(!floorUnder(p.pos[0], p.pos[1]), `${p.id} stands on playable floor`);
  }
  for (const s of STREET_ATMOSPHERE.spans) {
    const lowest = Math.min(s.a[2], s.b[2]) - s.sagM - s.dropM;
    assert.ok(lowest >= 4.2 - 1e-6, `${s.id} hangs to ${lowest.toFixed(2)} m`);
  }
});

test("Street atmosphere builds render-only merged meshes", () => {
  const root = buildStreetAtmosphere({
    seed: 7,
    wallMaterials: null,
    wallQuality: "1k",
    palmQuality: "1k",
    floorTopY: 0,
    data: { ...STREET_ATMOSPHERE, palms: [] },
  });
  const meshes: Mesh[] = [];
  root.traverse((node) => {
    if ((node as Mesh).isMesh) meshes.push(node as Mesh);
  });
  assert.ok(meshes.length >= 8, "expected one merged mesh per material family");
  for (const mesh of meshes) {
    assert.equal(mesh.userData.renderOnly, true);
    const position = mesh.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      assert.ok(Number.isFinite(position.getX(i)) && Number.isFinite(position.getY(i)) && Number.isFinite(position.getZ(i)));
    }
  }
});

test("Market dressing touches stay few, shallow below head height and on their counters", () => {
  const market = STREET_ATMOSPHERE.market!;
  assert.ok(market, "market records are present");
  assert.ok(market.wallArt.length > 0 && market.wallArt.length <= 30, `${market.wallArt.length} wall pieces`);
  assert.ok(market.lanterns.length <= 8 && market.counterGoods.length <= 24);
  for (const a of market.wallArt) {
    const bottom = a.zTop - a.heightM;
    if (bottom < 2.2) assert.ok(a.projectionM <= 0.3 + 1e-6, `${a.id} projects ${a.projectionM} m at ${bottom.toFixed(2)} m`);
  }
  for (const c of market.lanterns) assert.ok(c.bottomAboveFloorM >= 2.2 - 1e-6, `${c.id} hangs to ${c.bottomAboveFloorM} m`);
  for (const g of market.counterGoods) assert.ok(g.projectionM <= g.counterFrontM + 1e-6, `${g.id} overhangs its counter`);
  // Market materials are finishes of their own; the wall weathering must skip them.
  for (const name of ["r8_market_rug", "r8_market_tile", "r8_market_brass", "r8_market_lantern", "r8_market_glass", "r8_market_stock", "r8_market_ceramic", "r8_market_sack", "r8_market_iron"]) {
    assert.equal(classifySurfaceMaterial(name, false), null, name);
  }
});
