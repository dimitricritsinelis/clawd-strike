#!/usr/bin/env node
// Integrate or revert one area's facade package. This script is the only writer
// of map_spec.json and the facades manifest; area builds hand over a package.
//
//   node scripts/apply-facade-package.mjs apply  <unit>   reads assets/source/<unit>/package.json
//   node scripts/apply-facade-package.mjs revert <unit>   restores the files from before its latest apply
//   node scripts/apply-facade-package.mjs pack-textures   moves images still embedded in installed GLBs into
//                                                         the shared textures/ directory (no checkpoint; lossless)
//
// Installed GLBs reference their images from facades/textures/<sha256>.<ext>, one file per distinct image, so a
// finish shared by many areas downloads and uploads to the GPU once. A model's md5 map lists its GLB and the shared
// images it uses; images no model references any more are removed.
//
// package.json: { "models": [ { id, file, source, license } ],
//                 "section": { "zoneId": "<ZONE_ID>", "modelId": "<model id>", "faces": ["north"] },  // faces the GLB owns; omit for all four
//                 "frontages": { "<FRONTAGE_ID>": "<model id>" },                     // legacy per-face binding
//                 "placements": [ { id, modelId, position: {x,y,z}, yawDeg, role } ] }  // free render-only GLBs
// placements: design metres (x east, y north, z up), model origin at its base centre, yawDeg as anchors[].yawDeg
// (0 = north). role is "dressing" (default) or "skyline"; both are render-only and never collide.
// url and md5 are derived here from the built GLB.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { externalizeGlbImages } from "./lib/glbTextures.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = path.join(ROOT, "docs/map-design/specs/map_spec.json");
const FACADES = path.join(ROOT, "apps/client/public/assets/models/environment/bazaar/facades");
const MANIFEST = path.join(FACADES, "models.json");
const TEXTURE_DIR = "textures";
// Every installed GLB sits one directory below the manifest.
const TEXTURE_URI_PREFIX = `../${TEXTURE_DIR}/`;
const [action, unit] = process.argv.slice(2);
if (action !== "pack-textures" && (!["apply", "revert"].includes(action) || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(unit ?? ""))) {
  console.error("usage: node scripts/apply-facade-package.mjs apply|revert <unit> | pack-textures");
  process.exit(2);
}
const checkpoint = path.join(ROOT, "artifacts/facade-packages", `${unit}.json`);
const hash = (bytes) => bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
const md5 = (bytes) => createHash("md5").update(bytes).digest("hex");

/** Pack one GLB for installation at `url`; returns its bytes and md5 map (GLB + shared images). */
function packModel(url, bytes, writes) {
  const packed = externalizeGlbImages(bytes, TEXTURE_URI_PREFIX);
  const checksums = { [url]: md5(packed.glb) };
  for (const [name, data] of packed.textures) {
    const relative = `${TEXTURE_DIR}/${name}`;
    const file = path.join(FACADES, relative);
    const existing = readOptional(file);
    const content = data ?? existing ?? writes.get(file);
    if (!content) throw new Error(`${url} references missing shared texture ${relative}`);
    if (!existing || !existing.equals(content)) writes.set(file, content);
    checksums[relative] = md5(content);
  }
  return { glb: packed.glb, checksums };
}

/** Delete shared images that no manifest entry references. */
function collectUnusedTextures(manifest, writes) {
  const used = new Set();
  for (const model of manifest.models) for (const file of Object.keys(model.md5 ?? {})) used.add(file);
  const directory = path.join(FACADES, TEXTURE_DIR);
  const present = new Set(existsSync(directory) ? readdirSync(directory).map((name) => `${TEXTURE_DIR}/${name}`) : []);
  for (const [file, bytes] of writes) {
    const relative = path.relative(FACADES, file).split(path.sep).join("/");
    if (relative.startsWith(`${TEXTURE_DIR}/`) && bytes) present.add(relative);
  }
  for (const relative of present) {
    if (!used.has(relative)) writes.set(path.join(FACADES, relative), null);
  }
}

function packInstalledTextures() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const writes = new Map();
  let packedCount = 0;
  for (const model of manifest.models) {
    const file = path.join(FACADES, model.url);
    const bytes = readFileSync(file);
    const { glb, checksums } = packModel(model.url, bytes, writes);
    if (!glb.equals(bytes)) {
      writes.set(file, glb);
      packedCount += 1;
    }
    model.md5 = checksums;
  }
  collectUnusedTextures(manifest, writes);
  writes.set(MANIFEST, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  for (const [file, bytes] of writes) {
    if (bytes === null) rmSync(file, { force: true });
    else {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, bytes);
    }
  }
  const textures = [...writes.keys()].filter((file) => file.includes(`${path.sep}${TEXTURE_DIR}${path.sep}`));
  console.log(`pack-textures: packed ${packedCount} GLBs; ${textures.length} shared texture files written or removed`);
}
const readOptional = (file) => existsSync(file) ? readFileSync(file) : null;
function restore(files) {
  for (const entry of files) {
    const file = path.join(ROOT, entry.file);
    if (entry.before === null) rmSync(file, { force: true });
    else {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(entry.before, "base64"));
    }
  }
}
if (action === "pack-textures") {
  packInstalledTextures();
  process.exit(0);
}
if (action === "revert") {
  if (!existsSync(checkpoint)) throw new Error(`No saved apply for ${unit}; no files changed.`);
  const files = JSON.parse(readFileSync(checkpoint, "utf8"));
  // Check every file before restoring any. Also allow recovery of an interrupted apply.
  for (const entry of files) {
    const current = hash(readOptional(path.join(ROOT, entry.file)));
    const before = entry.before === null ? null : Buffer.from(entry.before, "base64");
    if (current !== entry.after && current !== hash(before)) {
      throw new Error(`${entry.file} changed since apply; refusing to overwrite it. Backup: ${checkpoint}`);
    }
  }
  restore(files);
  rmSync(checkpoint);
  console.log(`revert ${unit}: restored the previous files; run pnpm map:shoot <unit> --tag <round> to regenerate and capture`);
  process.exit(0);
}
const packagePath = path.join(ROOT, "assets/source", unit, "package.json");
if (!existsSync(packagePath)) throw new Error(`${path.relative(ROOT, packagePath)} not found`);
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
let spec = readFileSync(SPEC, "utf8");
const writes = new Map();
/** Pack material ids a GLB references by material name (`ph_*`); the runtime preloads exactly these. */
function glbPackMaterialIds(file) {
  const bytes = readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB`);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  return [...new Set((json.materials ?? []).map((m) => String(m.name ?? "").split(".")[0]).filter((n) => n.startsWith("ph_")))].sort();
}

/** Textual edit so the 380 KB spec keeps its formatting; only the one frontage object changes. */
function setFrontageModel(frontageId, modelId) {
  const start = spec.indexOf(`"id": "${frontageId}"`);
  if (start < 0) throw new Error(`frontage ${frontageId} not found in map_spec.json`);
  insertLineBeforeId(start, "facadeModelId", modelId === null ? null : JSON.stringify(modelId));
}

/** Insert `"<key>": <json>,` on its own line just above the object's `"id"` line (always valid JSON), or remove it. */
function insertLineBeforeId(idStart, key, jsonValue) {
  const lineStart = spec.lastIndexOf("\n", idStart) + 1;
  const indent = spec.slice(lineStart, idStart);
  // Section bindings stack above id. Scan the entire object so applying a
  // second section revision replaces both keys instead of duplicating them.
  const start = spec.lastIndexOf("\n    {", idStart) + "\n    {".length;
  const end = spec.indexOf("\n    }", idStart);
  const block = spec.slice(start, end).replace(new RegExp(`\\n[ \\t]*"${key}": (?:"[^"]*"|\\[[^\\]]*\\]),?`, "g"), "").replace(/,\s*$/, "");
  const idLine = block.lastIndexOf("\n", block.indexOf('"id":')) + 1;
  const prefix = jsonValue === null ? "" : `${indent}"${key}": ${jsonValue},\n`;
  spec = spec.slice(0, start) + block.slice(0, idLine) + prefix + block.slice(idLine) + spec.slice(end);
}

/** zones[].sectionModelId and sectionFaces, same approach anchored inside the zones array. */
function setZoneSection(zoneId, modelId, faces) {
  const zonesStart = spec.indexOf('"zones": [');
  const start = spec.indexOf(`"id": "${zoneId}"`, zonesStart);
  if (zonesStart < 0 || start < 0) throw new Error(`zone ${zoneId} not found in map_spec.json`);
  insertLineBeforeId(start, "sectionFaces", faces ? JSON.stringify(faces) : null);
  insertLineBeforeId(spec.indexOf(`"id": "${zoneId}"`, zonesStart), "sectionModelId", modelId === null ? null : JSON.stringify(modelId));
}

/** Top-level authored_placements array: keep other units' entries, replace this unit's. */
function setAuthoredPlacements(entries) {
  const key = '\n  "authored_placements": [';
  let start = spec.indexOf(key);
  if (start < 0) {
    const zones = spec.indexOf('\n  "zones": [');
    if (zones < 0) throw new Error("zones not found in map_spec.json");
    spec = `${spec.slice(0, zones)}\n  "authored_placements": [],${spec.slice(zones)}`;
    start = spec.indexOf(key);
  }
  const open = start + key.length - 1;
  let depth = 0;
  let inString = false;
  let end = open;
  for (; end < spec.length; end += 1) {
    const ch = spec[end];
    if (inString) {
      if (ch === "\\") end += 1;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]" && (depth -= 1) === 0) break;
  }
  const kept = JSON.parse(spec.slice(open, end + 1)).filter((entry) => entry.unit !== unit);
  for (const entry of entries) {
    if (kept.some((other) => other.id === entry.id)) throw new Error(`placement id ${entry.id} is already used by another unit`);
  }
  const next = [...kept, ...entries];
  const json = next.length ? JSON.stringify(next, null, 2).replace(/\n/g, "\n  ") : "[]";
  spec = spec.slice(0, open) + json + spec.slice(end + 1);
}

const unitModelIds = new Set(pkg.models.map((m) => m.id));
for (const model of pkg.models) {
  const source = path.resolve(path.dirname(packagePath), model.file);
  if (!source.startsWith(`${path.dirname(packagePath)}${path.sep}`)) throw new Error(`${model.id}: file must be inside the unit directory`);
  if (!existsSync(source)) throw new Error(`${model.id}: ${model.file} does not exist`);
  const url = `${unit}/${path.basename(source)}`;
  const destination = path.join(FACADES, url);
  if (writes.has(destination)) throw new Error(`Duplicate output: ${url}`);
  const materialIds = glbPackMaterialIds(source);
  const { glb, checksums } = packModel(url, readFileSync(source), writes);
  writes.set(destination, glb);
  manifest.models = manifest.models.filter((m) => m.id !== model.id);
  manifest.models.push({
    id: model.id,
    url,
    scale: 1,
    variants: {},
    source: model.source ?? `repo://assets/source/${unit}/build.py`,
    license: model.license ?? "Project-Original",
    md5: checksums,
    materialIds,
  });
}
for (const [frontageId, modelId] of Object.entries(pkg.frontages ?? {})) {
  if (!unitModelIds.has(modelId)) throw new Error(`${frontageId} references ${modelId}, which is not in this package`);
  setFrontageModel(frontageId, modelId);
}
if (pkg.section) {
  if (!unitModelIds.has(pkg.section.modelId)) throw new Error(`section references ${pkg.section.modelId}, which is not in this package`);
  const faces = pkg.section.faces ?? null;
  if (faces && (!Array.isArray(faces) || !faces.every((f) => ["north", "south", "east", "west"].includes(f)))) throw new Error("section.faces must list north/south/east/west");
  setZoneSection(pkg.section.zoneId, pkg.section.modelId, faces);
}
if (pkg.placements) {
  if (!Array.isArray(pkg.placements)) throw new Error("placements must be an array");
  const ids = new Set();
  const number = (value, label) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
    return value;
  };
  setAuthoredPlacements(pkg.placements.map((entry, index) => {
    const label = `placements[${index}]`;
    if (typeof entry?.id !== "string" || !entry.id) throw new Error(`${label}.id is required`);
    if (ids.has(entry.id)) throw new Error(`${label}: duplicate id ${entry.id}`);
    ids.add(entry.id);
    if (!unitModelIds.has(entry.modelId)) throw new Error(`${entry.id} references ${entry.modelId}, which is not in this package`);
    const role = entry.role ?? "dressing";
    if (!["dressing", "skyline"].includes(role)) throw new Error(`${entry.id}: role must be dressing or skyline`);
    return {
      id: entry.id,
      unit,
      modelId: entry.modelId,
      position: { x: number(entry.position?.x, `${label}.position.x`), y: number(entry.position?.y, `${label}.position.y`), z: number(entry.position?.z, `${label}.position.z`) },
      yawDeg: number(entry.yawDeg ?? 0, `${label}.yawDeg`),
      role,
    };
  }));
} else if (spec.includes('\n  "authored_placements": [')) {
  setAuthoredPlacements([]); // A package without placements drops this unit's earlier ones.
}
JSON.parse(spec); // Validate all bindings and assets before saving or replacing any files.
collectUnusedTextures(manifest, writes);
writes.set(MANIFEST, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
writes.set(SPEC, Buffer.from(spec));
const files = [...writes].map(([file, bytes]) => ({
  file: path.relative(ROOT, file),
  before: readOptional(file)?.toString("base64") ?? null,
  after: hash(bytes),
}));
mkdirSync(path.dirname(checkpoint), { recursive: true });
writeFileSync(`${checkpoint}.tmp`, JSON.stringify(files));
renameSync(`${checkpoint}.tmp`, checkpoint);
try {
  for (const [file, bytes] of writes) {
    if (bytes === null) {
      rmSync(file, { force: true });
      continue;
    }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
} catch (error) {
  restore(files);
  throw error;
}
console.log(`${action} ${unit}: done; run pnpm map:shoot <unit> --tag <round> to regenerate and capture`);
