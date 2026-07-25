import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveWallShaderProfile } from "../../map/wallShaderProfiles";
import {
  parseFloorMaterialManifest,
  resolveFloorTextureSetForQuality,
} from "./FloorMaterialLibrary";
import {
  parseWallMaterialManifest,
  resolveWallTextureSetForQuality,
} from "./WallMaterialLibrary";

const FLOOR_MANIFEST_URL = new URL(
  "../../../../public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/materials.json",
  import.meta.url,
);
const WALL_MANIFEST_URL = new URL(
  "../../../../public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/materials.json",
  import.meta.url,
);

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as unknown;
}

function md5(url: URL): string {
  return createHash("md5").update(readFileSync(fileURLToPath(url))).digest("hex");
}

function floorEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test_floor",
    tileSizeM: 2,
    textures: {
      "1k": {
        albedo: "./floor_diff.jpg",
        normal: "./floor_nor_gl.jpg",
        arm: "./floor_arm.jpg",
      },
    },
    ...overrides,
  };
}

function wallEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const textureSet = {
    albedo: "./wall_diff.jpg",
    normal: "./wall_nor_gl.jpg",
    arm: "./wall_arm.jpg",
  };
  return {
    id: "test_wall",
    tileSizeM: 2,
    textures: { "1k": textureSet, "2k": textureSet },
    ...overrides,
  };
}

test("production manifests expose truthful 1k QA variants and distinct facade families", () => {
  const floors = parseFloorMaterialManifest(readJson(FLOOR_MANIFEST_URL));
  const walls = parseWallMaterialManifest(readJson(WALL_MANIFEST_URL));

  for (const floor of floors) {
    const oneK = resolveFloorTextureSetForQuality(floor.textures, "1k", false);
    assert.equal(oneK.quality, "1k", `${floor.id} would upscale the 1k QA profile`);
  }
  for (const wall of walls) {
    const oneK = resolveWallTextureSetForQuality(wall.textures, "1k", false);
    assert.equal(oneK.quality, "1k", `${wall.id} would upscale the 1k QA profile`);
  }

  const v3WallIds = [
    "ph_sandstone_blocks_05",
    "ph_lime_plaster_sun",
    "ph_aged_plaster_ochre",
  ];
  assert.equal(v3WallIds.filter((id) => walls.some((entry) => entry.id === id)).length, 3);
  const limestone = walls.find((entry) => entry.id === "ph_sandstone_blocks_05");
  assert.ok(limestone);
  const limestone2k = limestone.textures["2k"];
  assert.ok(limestone2k);
  assert.match(limestone2k.albedo, /sandstone_blocks_05_diff_2k/);
  assert.doesNotMatch(limestone2k.albedo, /rustic_stone_wall_02/);

  const lime = walls.find((entry) => entry.id === "ph_lime_plaster_sun");
  const ochre = walls.find((entry) => entry.id === "ph_aged_plaster_ochre");
  assert.ok(lime);
  assert.ok(ochre);
  for (const entry of [limestone, lime, ochre]) {
    assert.ok(entry.tileSizeM > 0);
    assert.ok((entry.normalScale ?? 0) >= 0 && (entry.normalScale ?? 0) <= 1);
    assert.ok((entry.aoIntensity ?? 0) >= 0 && (entry.aoIntensity ?? 0) <= 1);
    assert.ok((entry.roughness ?? 0) >= 0 && (entry.roughness ?? 0) <= 1);
  }
  assert.notEqual(limestone.tintHex, lime.tintHex);
  assert.notEqual(lime.tintHex, ochre.tintHex);
  assert.notEqual(ochre.tintHex, limestone.tintHex);
  assert.notEqual(limestone2k.albedo, lime.textures["2k"]?.albedo);
  assert.notEqual(lime.textures["2k"]?.albedo, ochre.textures["2k"]?.albedo);
});

test("no-upscale resolution is isolated to QA while normal fallback behavior remains compatible", () => {
  const floor4k = {
    albedo: "./floor_diff_4k.jpg",
    normal: "./floor_nor_gl_4k.jpg",
    arm: "./floor_arm_4k.jpg",
  };
  assert.equal(
    resolveFloorTextureSetForQuality({ "4k": floor4k }, "1k").quality,
    "4k",
    "normal gameplay must preserve its existing best-available fallback",
  );
  assert.throws(
    () => resolveFloorTextureSetForQuality({ "4k": floor4k }, "1k", false),
    /equal-or-lower/,
  );

  const wall2k = {
    albedo: "./wall_diff_2k.jpg",
    normal: "./wall_nor_gl_2k.jpg",
    arm: "./wall_arm_2k.jpg",
  };
  assert.equal(
    resolveWallTextureSetForQuality({ "2k": wall2k }, "1k").quality,
    "2k",
    "normal gameplay must preserve its existing best-available fallback",
  );
  assert.throws(
    () => resolveWallTextureSetForQuality({ "2k": wall2k }, "1k", false),
    /equal-or-lower/,
  );
});

test("rough pine timber is a licensed, dimensioned 1k material with deliberate quality fallback", () => {
  const walls = parseWallMaterialManifest(readJson(WALL_MANIFEST_URL));
  const timber = walls.find((entry) => entry.id === "ph_rough_pine_door");
  assert.ok(timber);
  assert.equal(timber.tileSizeM, 2);
  assert.deepEqual(Object.keys(timber.textures), ["1k"]);
  assert.equal(timber.source?.provider, "Poly Haven");
  assert.equal(timber.source?.assetId, "rough_pine_door");
  assert.equal(timber.source?.license, "CC0");
  assert.deepEqual(timber.source?.nativeDimensionsM, { width: 2, height: 2 });
  assert.equal(timber.source?.downloadedResolution, "1k");

  const oneK = timber.textures["1k"];
  assert.ok(oneK);
  assert.deepEqual(resolveWallTextureSetForQuality(timber.textures, "2k").textures, oneK);
  assert.equal(md5(new URL(oneK.albedo, WALL_MANIFEST_URL)), timber.source?.md5.albedo);
  assert.equal(md5(new URL(oneK.normal, WALL_MANIFEST_URL)), timber.source?.md5.normal);
  assert.equal(md5(new URL(oneK.arm, WALL_MANIFEST_URL)), timber.source?.md5.arm);

  const shaderProfile = resolveWallShaderProfile(timber.id, "detail");
  assert.ok((shaderProfile.macroColorAmplitude ?? 1) <= 0.02);
  assert.ok((shaderProfile.dirtDarken ?? 1) <= 0.05);
});

test("plaster shader profiles author localized wear without contaminating timber or trim", () => {
  const sunWashed = resolveWallShaderProfile("ph_lime_plaster_sun", "wall");
  const aged = resolveWallShaderProfile("ph_aged_plaster_ochre", "wall");
  const timber = resolveWallShaderProfile("ph_rough_pine_door", "wall");
  const trim = resolveWallShaderProfile("ph_band_lime_soft", "detail");

  for (const plaster of [sunWashed, aged]) {
    assert.equal(plaster.localizedWearEnabled, true);
    assert.ok((plaster.wearStreakStrength ?? 0) >= 0.1);
    assert.ok((plaster.wearChipStrength ?? 0) >= 0.1);
    assert.ok((plaster.wearRepairStrength ?? 0) >= 0.13);
    assert.ok((plaster.wearRoughnessBoost ?? 0) >= 0.12);
  }
  assert.notEqual(
    sunWashed.wearRepairColor,
    aged.wearRepairColor,
    "sun-washed and aged plaster collapsed to one repair tone",
  );
  assert.equal(timber.localizedWearEnabled, undefined);
  assert.equal(trim.localizedWearEnabled, undefined);
});

test("aged kit hardware uses a licensed, dimensioned 1k PBR material", () => {
  const walls = parseWallMaterialManifest(readJson(WALL_MANIFEST_URL));
  const metal = walls.find((entry) => entry.id === "ph_rusty_metal_02");
  assert.ok(metal);
  assert.equal(metal.tileSizeM, 1);
  assert.deepEqual(Object.keys(metal.textures), ["1k"]);
  assert.equal(metal.source?.provider, "Poly Haven");
  assert.equal(metal.source?.assetId, "rusty_metal_02");
  assert.equal(metal.source?.license, "CC0");
  assert.deepEqual(metal.source?.nativeDimensionsM, { width: 1, height: 1 });
  assert.equal(metal.source?.downloadedResolution, "1k");

  const oneK = metal.textures["1k"];
  assert.ok(oneK);
  assert.deepEqual(resolveWallTextureSetForQuality(metal.textures, "2k").textures, oneK);
  assert.equal(md5(new URL(oneK.albedo, WALL_MANIFEST_URL)), metal.source?.md5.albedo);
  assert.equal(md5(new URL(oneK.normal, WALL_MANIFEST_URL)), metal.source?.md5.normal);
  assert.equal(md5(new URL(oneK.arm, WALL_MANIFEST_URL)), metal.source?.md5.arm);
});

test("painted kit timber uses a licensed, dimensioned 1k PBR material", () => {
  const walls = parseWallMaterialManifest(readJson(WALL_MANIFEST_URL));
  const timber = walls.find((entry) => entry.id === "ph_worn_planks");
  assert.ok(timber);
  assert.equal(timber.tileSizeM, 1.4);
  assert.deepEqual(Object.keys(timber.textures), ["1k"]);
  assert.equal(timber.source?.provider, "Poly Haven");
  assert.equal(timber.source?.assetId, "worn_planks");
  assert.equal(timber.source?.license, "CC0");
  assert.deepEqual(timber.source?.nativeDimensionsM, { width: 1.4, height: 1.4 });
  assert.equal(timber.source?.downloadedResolution, "1k");

  const oneK = timber.textures["1k"];
  assert.ok(oneK);
  assert.deepEqual(resolveWallTextureSetForQuality(timber.textures, "2k").textures, oneK);
  assert.equal(md5(new URL(oneK.albedo, WALL_MANIFEST_URL)), timber.source?.md5.albedo);
  assert.equal(md5(new URL(oneK.normal, WALL_MANIFEST_URL)), timber.source?.md5.normal);
  assert.equal(md5(new URL(oneK.arm, WALL_MANIFEST_URL)), timber.source?.md5.arm);
});

test("floor manifest rejects out-of-range authored values instead of clamping", () => {
  assert.throws(
    () => parseFloorMaterialManifest({ materials: [floorEntry({ tileSizeM: 0.01 })] }),
    /expected number in range/,
  );
  assert.throws(
    () => parseFloorMaterialManifest({ materials: [floorEntry({ normalScale: 1.1 })] }),
    /expected number in range/,
  );
});

test("wall manifest rejects invalid values and duplicate ids", () => {
  assert.throws(
    () => parseWallMaterialManifest({ materials: [wallEntry({ tintHex: "ochre" })] }),
    /expected #RRGGBB/,
  );
  assert.throws(
    () => parseWallMaterialManifest({ materials: [wallEntry(), wallEntry()] }),
    /duplicate material id/,
  );
  assert.throws(
    () => parseWallMaterialManifest({
      materials: [wallEntry({
        source: {
          provider: "Poly Haven",
          assetId: "test_wall",
          url: "https://polyhaven.com/a/test_wall",
          license: "proprietary",
          nativeDimensionsM: { width: 2, height: 2 },
          downloadedResolution: "1k",
          md5: {
            albedo: "00000000000000000000000000000000",
            normal: "00000000000000000000000000000000",
            arm: "00000000000000000000000000000000",
          },
        },
      })],
    }),
    /must declare CC0/,
  );
});
