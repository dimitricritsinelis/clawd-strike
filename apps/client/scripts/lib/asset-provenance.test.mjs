import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readJson(url) {
  return JSON.parse(readFileSync(url, "utf8"));
}

function md5(url) {
  return createHash("md5").update(readFileSync(url)).digest("hex");
}

function walkFiles(rootUrl, relative = "") {
  const directoryUrl = new URL(`${relative}${relative ? "/" : ""}`, rootUrl);
  return readdirSync(directoryUrl).flatMap((name) => {
    const nextRelative = relative ? `${relative}/${name}` : name;
    const nextUrl = new URL(nextRelative, rootUrl);
    return statSync(nextUrl).isDirectory()
      ? walkFiles(rootUrl, nextRelative)
      : [nextRelative];
  });
}

function assertSource(source, license, label) {
  assert.match(source, /^(https:\/\/|repo:\/\/)/, `${label} must declare an absolute or repo source`);
  assert.ok(
    license === "CC0" || license === "CC0-1.0" || license === "Project-Original",
    `${label} has unsupported license '${license}'`,
  );
}

function assertChecksums(baseUrl, checksumByPath, label) {
  assert.ok(
    checksumByPath && typeof checksumByPath === "object" && !Array.isArray(checksumByPath),
    `${label} must declare an MD5 map`,
  );
  for (const [relativePath, expected] of Object.entries(checksumByPath)) {
    assert.match(expected, /^[0-9a-f]{32}$/, `${label}:${relativePath} has an invalid MD5`);
    assert.equal(md5(new URL(relativePath, baseUrl)), expected, `${label}:${relativePath} MD5 drifted`);
  }
}

function verifyModelPack(manifestUrl) {
  const manifest = readJson(manifestUrl);
  const baseUrl = new URL(".", manifestUrl);
  const claimedFiles = new Set(["models.json"]);
  const entriesById = new Map();
  for (const model of manifest.models) {
    assert.ok(!entriesById.has(model.id), `model pack repeats '${model.id}'`);
    entriesById.set(model.id, model);
    assertSource(model.source, model.license, model.id);
    assert.ok(model.url in model.md5, `${model.id} model URL is absent from its MD5 map`);
    assertChecksums(baseUrl, model.md5, model.id);
    for (const relativePath of Object.keys(model.md5)) claimedFiles.add(relativePath);
    for (const [quality, variant] of Object.entries(model.variants ?? {})) {
      const label = `${model.id}:${quality}`;
      assert.match(quality, /^1k$/, `${label} has unsupported model quality`);
      assert.ok(variant.url in variant.md5, `${label} model URL is absent from its MD5 map`);
      assert.match(
        variant.generator,
        /^sharp@[0-9]+\.[0-9]+\.[0-9]+ /,
        `${label} must record its deterministic derivative generator`,
      );
      assert.deepEqual(
        Object.keys(variant.derivedFrom).sort(),
        Object.keys(variant.md5).sort(),
        `${label} derived source and MD5 inventories differ`,
      );
      for (const [derivedPath, sourcePath] of Object.entries(variant.derivedFrom)) {
        assert.ok(sourcePath in model.md5, `${label}:${derivedPath} has unknown source '${sourcePath}'`);
      }
      assertChecksums(baseUrl, variant.md5, label);
      for (const relativePath of Object.keys(variant.md5)) claimedFiles.add(relativePath);
    }
  }
  assert.deepEqual(
    walkFiles(baseUrl).sort(),
    [...claimedFiles].sort(),
    `${fileURLToPath(manifestUrl)} has unmanifested or stale model files`,
  );
  return entriesById;
}

function verifySourcePack(manifestUrl) {
  const manifest = readJson(manifestUrl);
  const baseUrl = new URL(".", manifestUrl);
  const claimedFiles = new Set([manifestUrl.pathname.split("/").at(-1)]);
  for (const asset of manifest.assets) {
    assertSource(asset.source, asset.license, asset.id);
    assert.deepEqual(
      [...asset.files].sort(),
      Object.keys(asset.md5).sort(),
      `${asset.id} files and MD5 inventory differ`,
    );
    assertChecksums(baseUrl, asset.md5, asset.id);
    for (const relativePath of asset.files) claimedFiles.add(relativePath);
  }
  assert.deepEqual(
    walkFiles(baseUrl).sort(),
    [...claimedFiles].sort(),
    `${fileURLToPath(manifestUrl)} has unmanifested or stale source files`,
  );
}

function verifyMarkdownSourcePack(sourceUrl) {
  const sourceText = readFileSync(sourceUrl, "utf8");
  const baseUrl = new URL(".", sourceUrl);
  const assetPage = sourceText.match(/^Asset page:\s+(https:\/\/\S+)$/m)?.[1];
  const license = sourceText.match(/^License:\s+(CC0(?:-1\.0)?)(?:,|$)/m)?.[1];
  assert.ok(assetPage, `${fileURLToPath(sourceUrl)} must declare an HTTPS asset page`);
  assert.ok(license, `${fileURLToPath(sourceUrl)} must declare a supported CC0 license`);
  assertSource(assetPage, license, fileURLToPath(sourceUrl));

  const checksumByPath = Object.fromEntries(
    [...sourceText.matchAll(/^- `([^`]+)`: `([0-9a-f]{32})`$/gm)]
      .map((match) => [match[1], match[2]]),
  );
  assertChecksums(baseUrl, checksumByPath, fileURLToPath(sourceUrl));
  const productionFiles = walkFiles(baseUrl)
    .filter((relativePath) => relativePath !== "SOURCE.md")
    .sort();
  assert.deepEqual(
    Object.keys(checksumByPath).sort(),
    productionFiles,
    `${fileURLToPath(sourceUrl)} MD5 inventory must cover every production file`,
  );
}

function verifyMaterialPack(manifestUrl) {
  const manifest = readJson(manifestUrl);
  const baseUrl = new URL(".", manifestUrl);
  const provenanceUrl = new URL("sources.json", baseUrl);
  const provenance = readJson(provenanceUrl);
  assert.equal(provenance.schemaVersion, 1, `${fileURLToPath(provenanceUrl)} has an unsupported schema`);
  assert.ok(
    provenance.sourceFamilies && typeof provenance.sourceFamilies === "object",
    `${fileURLToPath(provenanceUrl)} must declare sourceFamilies`,
  );

  const referencedFamilies = new Set();
  const referencedFiles = new Set(["materials.json", "sources.json"]);
  for (const material of manifest.materials) {
    for (const [resolution, textures] of Object.entries(material.textures)) {
      assert.deepEqual(
        Object.keys(textures).sort(),
        ["albedo", "arm", "normal"],
        `${material.id}:${resolution} must declare albedo, normal, and ARM`,
      );
      for (const [channel, relativePath] of Object.entries(textures)) {
        const normalizedPath = relativePath.replace(/^\.\//, "");
        const familyId = normalizedPath.split("/")[0];
        const family = provenance.sourceFamilies[familyId];
        assert.ok(family, `${material.id}:${resolution}:${channel} has no owning source family '${familyId}'`);
        assertSource(family.source, family.license, familyId);
        assert.ok(
          family.md5[family.originalResolution],
          `${familyId} lacks checksums for original resolution '${family.originalResolution}'`,
        );
        const expected = family.md5[resolution]?.[channel];
        assert.match(
          expected ?? "",
          /^[0-9a-f]{32}$/,
          `${familyId}:${resolution}:${channel} has no valid checksum`,
        );
        assert.equal(
          md5(new URL(relativePath, manifestUrl)),
          expected,
          `${material.id}:${resolution}:${channel} MD5 drifted`,
        );
        referencedFamilies.add(familyId);
        referencedFiles.add(normalizedPath);
      }
    }
  }

  assert.deepEqual(
    Object.keys(provenance.sourceFamilies).sort(),
    [...referencedFamilies].sort(),
    `${fileURLToPath(provenanceUrl)} has missing or unused source families`,
  );
  assert.deepEqual(
    walkFiles(baseUrl).sort(),
    [...referencedFiles].sort(),
    `${fileURLToPath(manifestUrl)} has unmanifested or stale texture files`,
  );
}

test("bazaar model packs carry complete CC0 provenance and no dead files", () => {
  const propManifestUrl = new URL(
    "../../public/assets/models/environment/bazaar/props/models.json",
    import.meta.url,
  );
  const doorManifestUrl = new URL(
    "../../public/assets/models/environment/bazaar/doors/models.json",
    import.meta.url,
  );
  const facadeManifestUrl = new URL(
    "../../public/assets/models/environment/bazaar/facades/models.json",
    import.meta.url,
  );
  const modelById = new Map([
    ...verifyModelPack(propManifestUrl),
    ...verifyModelPack(doorManifestUrl),
    ...verifyModelPack(facadeManifestUrl),
  ]);
  const sourceSpec = readJson(new URL(
    "../../../../docs/map-design/specs/map_spec.json",
    import.meta.url,
  ));
  for (const asset of sourceSpec.asset_registry.filter((entry) => (
    entry.source.kind === "external_cc0" && entry.runtime.mode === "model"
  ))) {
    const model = modelById.get(asset.runtime.id);
    assert.ok(model, `${asset.id} runtime model '${asset.runtime.id}' has no owning manifest`);
    assert.equal(model.source, asset.source.uri, `${asset.id} source differs from its model pack`);
    assert.equal(model.license, asset.license, `${asset.id} license differs from its model pack`);
  }
});

test("every production bazaar texture carries complete provenance and a matching MD5", () => {
  verifySourcePack(new URL(
    "../../public/assets/textures/environment/bazaar/foliage/palms/sources.json",
    import.meta.url,
  ));
  verifySourcePack(new URL(
    "../../public/assets/textures/environment/bazaar/textiles/sources.json",
    import.meta.url,
  ));
  verifyMarkdownSourcePack(new URL(
    "../../public/assets/textures/environment/bazaar/windows/stained_glass_panel_001/SOURCE.md",
    import.meta.url,
  ));
  verifyMaterialPack(new URL(
    "../../public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/materials.json",
    import.meta.url,
  ));
  verifyMaterialPack(new URL(
    "../../public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/materials.json",
    import.meta.url,
  ));
});
