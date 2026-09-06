#!/usr/bin/env node
// Integrate or revert one builder's facade package. The orchestrator is the only
// writer of map_spec.json and the facades manifest; builders hand over a package.
//
//   node scripts/apply-facade-package.mjs apply  <unit>   reads assets/source/<unit>/package.json
//   node scripts/apply-facade-package.mjs revert <unit>   restores the files from before its latest apply
//
// package.json: { "models": [ { id, file, source, license } ],
//                 "section": { "zoneId": "<ZONE_ID>", "modelId": "<model id>", "faces": ["north"] },  // faces the GLB owns; omit for all four
//                 "frontages": { "<FRONTAGE_ID>": "<model id>" } }                    // legacy per-face binding
// url and md5 are derived here from the built GLB.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = path.join(ROOT, "docs/map-design/specs/map_spec.json");
const FACADES = path.join(ROOT, "apps/client/public/assets/models/environment/bazaar/facades");
const MANIFEST = path.join(FACADES, "models.json");
const [action, unit] = process.argv.slice(2);
if (!["apply", "revert"].includes(action) || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(unit ?? "")) {
  console.error("usage: node scripts/apply-facade-package.mjs apply|revert <unit>");
  process.exit(2);
}
const checkpoint = path.join(ROOT, "artifacts/facade-packages", `${unit}.json`);
const hash = (bytes) => bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
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
  const existing = new RegExp(`"${key}": (?:"[^"]*"|\\[[^\\]]*\\]),?`);
  // Existing binding: either our own line just above the id, or a legacy one anywhere in the object.
  const prevLineStart = spec.lastIndexOf("\n", lineStart - 2) + 1;
  const prevLine = spec.slice(prevLineStart, lineStart);
  const head = new RegExp(`^\\s*${existing.source}\\n$`).test(prevLine) ? spec.slice(0, prevLineStart) : spec.slice(0, lineStart);
  const end = spec.indexOf("\n    }", idStart);
  const block = spec.slice(lineStart, end).replace(new RegExp(`\\n(\\s*)${existing.source}`), "").replace(/,\s*$/, "");
  const prefix = jsonValue === null ? "" : `${indent}"${key}": ${jsonValue},\n`;
  spec = head + prefix + block + spec.slice(end);
}

/** zones[].sectionModelId and sectionFaces, same approach anchored inside the zones array. */
function setZoneSection(zoneId, modelId, faces) {
  const zonesStart = spec.indexOf('"zones": [');
  const start = spec.indexOf(`"id": "${zoneId}"`, zonesStart);
  if (zonesStart < 0 || start < 0) throw new Error(`zone ${zoneId} not found in map_spec.json`);
  insertLineBeforeId(start, "sectionFaces", faces ? JSON.stringify(faces) : null);
  insertLineBeforeId(spec.indexOf(`"id": "${zoneId}"`, zonesStart), "sectionModelId", modelId === null ? null : JSON.stringify(modelId));
}

const unitModelIds = new Set(pkg.models.map((m) => m.id));
for (const model of pkg.models) {
  const source = path.resolve(path.dirname(packagePath), model.file);
  if (!source.startsWith(`${path.dirname(packagePath)}${path.sep}`)) throw new Error(`${model.id}: file must be inside the unit directory`);
  if (!existsSync(source)) throw new Error(`${model.id}: ${model.file} does not exist`);
  const url = `${unit}/${path.basename(source)}`;
  const destination = path.join(FACADES, url);
  if (writes.has(destination)) throw new Error(`Duplicate output: ${url}`);
  const bytes = readFileSync(source);
  const materialIds = glbPackMaterialIds(source);
  writes.set(destination, bytes);
  manifest.models = manifest.models.filter((m) => m.id !== model.id);
  manifest.models.push({
    id: model.id,
    url,
    scale: 1,
    variants: {},
    source: model.source ?? `repo://assets/source/${unit}/build.py`,
    license: model.license ?? "Project-Original",
    md5: { [url]: createHash("md5").update(bytes).digest("hex") },
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
JSON.parse(spec); // Validate all bindings and assets before saving or replacing any files.
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
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
} catch (error) {
  restore(files);
  throw error;
}
console.log(`${action} ${unit}: done; run pnpm map:shoot <unit> --tag <round> to regenerate and capture`);
