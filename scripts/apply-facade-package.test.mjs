import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { MAP_SOURCE } from "../apps/client/scripts/lib/mapPaths.mjs";

function glb(label) {
  const json = Buffer.from(JSON.stringify({ asset: { version: "2.0", generator: label }, materials: [] }));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(padded);
  const header = Buffer.alloc(20);
  [0x46546c67, 2, 20 + padded.length, padded.length, 0x4e4f534a].forEach((value, i) => header.writeUInt32LE(value, i * 4));
  return Buffer.concat([header, padded]);
}

/** GLB with one triangle and the given embedded PNG payloads (fake bytes are fine: nothing decodes them). */
function glbWithImages(label, payloads) {
  const positions = Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
  const parts = [positions];
  const bufferViews = [{ buffer: 0, byteOffset: 0, byteLength: positions.length }];
  let offset = positions.length;
  for (const payload of payloads) {
    const pad = (4 - (offset % 4)) % 4;
    if (pad) parts.push(Buffer.alloc(pad));
    offset += pad;
    parts.push(payload);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: payload.length });
    offset += payload.length;
  }
  const bin = Buffer.concat(parts);
  const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const json = Buffer.from(JSON.stringify({
    asset: { version: "2.0", generator: label },
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
    images: payloads.map((_, index) => ({ bufferView: index + 1, mimeType: "image/png" })),
    materials: [],
  }));
  const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const header = Buffer.alloc(12);
  [0x46546c67, 2, 12 + 8 + jsonPadded.length + 8 + binPadded.length].forEach((value, i) => header.writeUInt32LE(value, i * 4));
  const chunk = (length, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(length, 0); b.writeUInt32LE(type, 4); return b; };
  return Buffer.concat([header, chunk(jsonPadded.length, 0x4e4f534a), jsonPadded, chunk(binPadded.length, 0x004e4942), binPadded]);
}

function fixture(t, kind = "section") {
  const root = mkdtempSync(path.join(os.tmpdir(), "facade-undo-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, data) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), data);
  };
  const spec = MAP_SOURCE.spec;
  const assets = "apps/client/public/assets/models/environment/bazaar/facades/";
  const manifest = `${assets}models.json`;
  const model = `${assets}unit-test/test.glb`;
  const source = "assets/source/unit-test/test.glb";
  const packageFile = "assets/source/unit-test/package.json";
  const pkg = {
    models: [{ id: "model-test", file: "test.glb" }],
    ...(kind === "section" ? { section: { zoneId: "ZONE", modelId: "model-test" } } : { frontages: { FACE: "model-test" } }),
  };
  write(spec, JSON.stringify({ zones: [{ id: "ZONE", label: "Keep this" }], frontages: [{ id: "FACE", zoneId: "ZONE" }] }, null, 2) + "\n");
  write(manifest, JSON.stringify({ models: [{ id: "other-unit", url: "other/file.glb" }] }, null, 2) + "\n");
  write(source, glb("first"));
  write(packageFile, JSON.stringify(pkg));
  write("scripts/placeholder", "");
  copyFileSync(new URL("./apply-facade-package.mjs", import.meta.url), path.join(root, "scripts/apply-facade-package.mjs"));
  mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
  copyFileSync(new URL("./lib/glbTextures.mjs", import.meta.url), path.join(root, "scripts/lib/glbTextures.mjs"));
  mkdirSync(path.join(root, "apps/client/scripts/lib"), { recursive: true });
  copyFileSync(new URL("../apps/client/scripts/lib/mapPaths.mjs", import.meta.url), path.join(root, "apps/client/scripts/lib/mapPaths.mjs"));
  const run = (action, succeeds = true) => {
    const result = spawnSync(process.execPath, [path.join(root, "scripts/apply-facade-package.mjs"), action, "unit-test"], { encoding: "utf8" });
    assert.equal(result.status === 0, succeeds, result.stderr || result.stdout);
    return result;
  };
  const read = (file) => readFileSync(path.join(root, file));
  return { root, write, read, run, spec, manifest, model, source, packageFile, pkg };
}

for (const kind of ["section", "frontage"]) {
  test(`${kind}: a rejected revision restores the last accepted model and bindings byte for byte`, (t) => {
    const f = fixture(t, kind);
    f.run("apply");
    const accepted = [f.model, f.spec, f.manifest].map(f.read);
    f.write(f.source, glb("rejected revision"));
    f.run("apply");
    assert.notDeepEqual(f.read(f.model), accepted[0]);
    // Rebuilding or removing the source package must not change what undo restores.
    rmSync(path.join(f.root, f.packageFile));
    f.run("revert");
    [f.model, f.spec, f.manifest].forEach((file, i) => assert.deepEqual(f.read(file), accepted[i]));
  });
}

test("first apply can be undone without deleting neighboring files", (t) => {
  const f = fixture(t);
  const before = [f.spec, f.manifest].map(f.read);
  const neighbor = path.join(path.dirname(f.model), "keep.glb");
  f.write(neighbor, glb("unrelated"));
  f.run("apply");
  f.run("revert");
  assert.equal(existsSync(path.join(f.root, f.model)), false);
  assert.deepEqual(f.read(neighbor), glb("unrelated"));
  [f.spec, f.manifest].forEach((file, i) => assert.deepEqual(f.read(file), before[i]));
  assert.match(f.run("revert", false).stderr, /No saved apply/);
});

test("a later unrelated edit blocks undo before any files are restored", (t) => {
  const f = fixture(t);
  f.run("apply");
  f.write(f.spec, f.read(f.spec).toString().replace("Keep this", "Another task's edit"));
  const current = [f.model, f.spec, f.manifest].map(f.read);
  assert.match(f.run("revert", false).stderr, /changed since apply/);
  [f.model, f.spec, f.manifest].forEach((file, i) => assert.deepEqual(f.read(file), current[i]));
});

test("invalid package validation leaves the deployment and previous undo intact", (t) => {
  const f = fixture(t);
  const original = [f.spec, f.manifest].map(f.read);
  f.run("apply");
  const accepted = [f.model, f.spec, f.manifest].map(f.read);
  f.write(f.source, glb("must not copy"));
  f.pkg.section.zoneId = "MISSING";
  f.write(f.packageFile, JSON.stringify(f.pkg));
  f.run("apply", false);
  [f.model, f.spec, f.manifest].forEach((file, i) => assert.deepEqual(f.read(file), accepted[i]));
  f.run("revert");
  [f.spec, f.manifest].forEach((file, i) => assert.deepEqual(f.read(file), original[i]));
});

test("undo recovers an interrupted apply with some files already restored", (t) => {
  const f = fixture(t);
  const original = f.read(f.spec);
  f.run("apply");
  f.write(f.spec, original);
  f.run("revert");
  assert.equal(existsSync(path.join(f.root, f.model)), false);
  assert.deepEqual(f.read(f.spec), original);
});

test("placements: apply writes this unit's authored_placements, keeps other units', and revert restores", (t) => {
  const f = fixture(t);
  f.write(f.spec, f.read(f.spec).toString().replace('"zones"', '"authored_placements": [{"id": "other", "unit": "unit-other", "modelId": "m", "position": {"x": 1, "y": 2, "z": 0}, "yawDeg": 0, "role": "skyline"}],\n  "zones"'));
  const original = f.read(f.spec);
  f.pkg.placements = [{ id: "balcony-1", modelId: "model-test", position: { x: 10, y: 20.5, z: 3 }, yawDeg: 90 }];
  f.write(f.packageFile, JSON.stringify(f.pkg));
  f.run("apply");
  const spec = JSON.parse(f.read(f.spec).toString());
  assert.deepEqual(spec.authored_placements, [
    { id: "other", unit: "unit-other", modelId: "m", position: { x: 1, y: 2, z: 0 }, yawDeg: 0, role: "skyline" },
    { id: "balcony-1", unit: "unit-test", modelId: "model-test", position: { x: 10, y: 20.5, z: 3 }, yawDeg: 90, role: "dressing" },
  ]);
  assert.equal(spec.zones[0].label, "Keep this");
  f.pkg.placements = [{ id: "other", modelId: "model-test", position: { x: 0, y: 0, z: 0 } }];
  f.write(f.packageFile, JSON.stringify(f.pkg));
  assert.match(f.run("apply", false).stderr, /already used by another unit/);
  f.run("revert");
  assert.deepEqual(f.read(f.spec), original);
});

test("placements: a package without placements drops the unit's earlier ones only", (t) => {
  const f = fixture(t);
  f.pkg.placements = [{ id: "p1", modelId: "model-test", position: { x: 0, y: 0, z: 0 } }];
  f.write(f.packageFile, JSON.stringify(f.pkg));
  f.run("apply");
  delete f.pkg.placements;
  f.write(f.packageFile, JSON.stringify(f.pkg));
  f.run("apply");
  assert.deepEqual(JSON.parse(f.read(f.spec).toString()).authored_placements, []);
});

test("embedded images install once as shared textures and are removed when unused", (t) => {
  const f = fixture(t);
  const shared = Buffer.from("shared-image-bytes");
  const extra = Buffer.from("second-image-bytes");
  f.write(f.source, glbWithImages("with images", [shared, extra, shared]));
  f.run("apply");
  const manifest = JSON.parse(f.read(f.manifest));
  const entry = manifest.models.find((model) => model.id === "model-test");
  const textures = Object.keys(entry.md5).filter((file) => file.startsWith("textures/"));
  assert.equal(textures.length, 2, "duplicate images collapse to one shared file");
  for (const file of textures) assert.ok(existsSync(path.join(path.dirname(path.join(f.root, f.manifest)), file)));
  const installed = f.read(f.model);
  const json = JSON.parse(installed.subarray(20, 20 + installed.readUInt32LE(12)).toString());
  assert.ok(json.images.every((image) => image.bufferView === undefined && image.uri.startsWith("../textures/")));
  assert.ok(installed.length < f.read(f.source).length, "image bytes leave the GLB");

  f.write(f.source, glbWithImages("fewer images", [shared]));
  f.run("apply");
  const after = JSON.parse(f.read(f.manifest)).models.find((model) => model.id === "model-test");
  const remaining = Object.keys(after.md5).filter((file) => file.startsWith("textures/"));
  assert.equal(remaining.length, 1);
  const removed = textures.find((file) => !remaining.includes(file));
  const texturePath = (file) => path.join(path.dirname(path.join(f.root, f.manifest)), file);
  assert.equal(existsSync(texturePath(removed)), false, "unreferenced shared textures are deleted");
  f.run("revert");
  assert.ok(existsSync(texturePath(removed)), "revert restores the textures its apply removed");
});
