import assert from "node:assert/strict";
import test from "node:test";
import { DECAL_SURFACE_CLASSES, classifyDecalSurfaceLabel } from "./BulletDecalSurfaces";
import { BULLET_HOLE_ATLAS_VARIANTS, bulletHoleAtlasRow, generateBulletHoleAtlas } from "./bulletHoleAtlas";

test("every atlas cell has an opaque dark core, a deep centre and a clear gutter", () => {
  const cellPx = 64;
  const atlas = generateBulletHoleAtlas(3, cellPx);
  assert.equal(atlas.width, cellPx * BULLET_HOLE_ATLAS_VARIANTS);
  assert.equal(atlas.height, cellPx * DECAL_SURFACE_CLASSES.length);
  const texel = (x: number, y: number) => (y * atlas.width + x) * 4;
  for (const surface of DECAL_SURFACE_CLASSES) {
    const row = bulletHoleAtlasRow(surface);
    for (let column = 0; column < BULLET_HOLE_ATLAS_VARIANTS; column++) {
      const centre = texel(column * cellPx + cellPx / 2, row * cellPx + cellPx / 2);
      let darkest = 255;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const t = texel(column * cellPx + cellPx / 2 + dx, row * cellPx + cellPx / 2 + dy);
          if (atlas.albedo[t + 3]! > 200) darkest = Math.min(darkest, atlas.albedo[t]!);
        }
      }
      assert.ok(darkest < 40, `${surface}/${column} core is dark and opaque`);
      assert.ok(atlas.normalHeight[centre + 3]! < 250, `${surface}/${column} core is recessed`);
      for (const [x, y] of [[0, 0], [cellPx - 1, 0], [0, cellPx - 1], [cellPx - 1, cellPx - 1], [cellPx / 2, 0]] as const) {
        const edge = texel(column * cellPx + x, row * cellPx + y);
        assert.equal(atlas.albedo[edge + 3], 0, `${surface}/${column} gutter (${x},${y}) is clear`);
        assert.equal(atlas.normalHeight[edge + 3], 255, `${surface}/${column} gutter is flush`);
      }
    }
  }
  const masonryCentre = texel(cellPx / 2, bulletHoleAtlasRow("masonry") * cellPx + cellPx / 2);
  const glassCentre = texel(cellPx / 2, bulletHoleAtlasRow("glass") * cellPx + cellPx / 2);
  assert.ok(atlas.normalHeight[masonryCentre + 3]! < atlas.normalHeight[glassCentre + 3]!, "masonry craters are deeper than glass");
});

test("the atlas is deterministic per seed", () => {
  const a = generateBulletHoleAtlas(9, 32);
  const b = generateBulletHoleAtlas(9, 32);
  assert.deepEqual(a.albedo, b.albedo);
  assert.deepEqual(a.normalHeight, b.normalHeight);
});

test("map material labels resolve to the expected surface classes", () => {
  const expected: [string, string | null][] = [
    ["bz11_rug_timber bz11_rug_timber-cast", "wood"],
    ["bz11_rug_plaster bz11_rug_plaster-cast", "masonry"],
    ["bz11_rug_cloth bz11_rug_cloth-cast", "soft"],
    ["bz10_textile_sand bz10_textile_sand-cast", "masonry"],
    ["bz04_levantine_rug_project_original", "soft"],
    ["brass_pot_01 brass_pot_01", "metal"],
    ["ceramic_pot ceramic_pot", "masonry"],
    ["wooden_crate_01 v3-shared-model-batch-1-wooden_crate_01_lid", "wood"],
    ["Barrel_02 Barrel_02", "wood"],
    ["r8_tank_metal r8-tank", "metal"],
    ["r8_panel_glass r8-panel", "glass"],
    ["bz13_service_opal_lens", "glass"],
    ["bz21_souk_red bz21_souk_red-cast", "masonry"],
    ["Sack v3-shared-model-batch-0-SackOfGrain", "soft"],
    ["floor-bz04_court_limestone_flags_01-2k floor-bz04_court_limestone_flags_01", "masonry"],
    [" decorative-palms-trunks", "wood"],
    [" decorative-palms-planter-body", "masonry"],
    [" decorative-palms-fronds-full", null],
    ["bz04_plant_project_original", null],
    ["r8_cable_iron r8-cable", null],
    [" v3-canopy-edge-ropes", null],
    ["water v3-fountain-shallow-water", null],
    ["bz20_dyers_indigo_bath", null],
    [" v3-prop-ground-contact", null],
    ["r8_stain_decal r8-stainStreak", null],
    [" map-pbr-boundary-copings-volume", "masonry"],
    ["bz06_rough_service_paving bz04_shared_environment bz06_rough_service_paving-receive", "masonry"],
    ["bz10_textile_cloth bz10_textile_cloth-cast", "soft"],
    ["bz04_spice_stock bz04_spice_stock-cast", "soft"],
    ["bz12_stock_brass_pot_01 bz12_stock_brass_pot_01-cast", "metal"],
    ["ph_rusty_metal_02", "metal"],
    ["ph_worn_planks", "wood"],
  ];
  for (const [label, surface] of expected) {
    assert.equal(classifyDecalSurfaceLabel(label), surface, label);
  }
});
