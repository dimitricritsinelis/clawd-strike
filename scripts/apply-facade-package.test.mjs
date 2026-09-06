import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function glb(label) {
  const json = Buffer.from(JSON.stringify({ asset: { version: "2.0", generator: label }, materials: [] }));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(padded);
  const header = Buffer.alloc(20);
  [0x46546c67, 2, 20 + padded.length, padded.length, 0x4e4f534a].forEach((value, i) => header.writeUInt32LE(value, i * 4));
  return Buffer.concat([header, padded]);
}

function fixture(t, kind = "section") {
  const root = mkdtempSync(path.join(os.tmpdir(), "facade-undo-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, data) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), data);
  };
  const spec = "docs/map-design/specs/map_spec.json";
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
