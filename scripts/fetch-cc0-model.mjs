#!/usr/bin/env node
// Fetch Poly Haven CC0 models into the bazaar prop pack and record provenance.
//
//   node scripts/fetch-cc0-model.mjs <polyhaven-id>... [--res 1k]
//
// Writes <pack>/<id>/<id>_<res>.gltf with its .bin and textures/ exactly as Poly
// Haven lays them out, then registers `ph_<id>` in models.json (url, source,
// license, md5 per file) in the same shape as the existing entries. A registered
// prop is used by adding its id to a pool in MODEL_POOLS_BY_KIND
// (apps/client/src/runtime/map/buildProps.ts) or by importing its gltf in a unit
// build.py.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = path.join(ROOT, "apps/client/public/assets/models/environment/bazaar/props");

const args = process.argv.slice(2);
const resIndex = args.indexOf("--res");
const res = resIndex >= 0 ? args[resIndex + 1] : "1k";
const ids = args.filter((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--res");
if (ids.length === 0) {
  console.error("usage: node scripts/fetch-cc0-model.mjs <polyhaven-id>... [--res 1k]");
  process.exit(2);
}

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};
const download = async (file, relative) => {
  if (relative.split(/[\\/]/).includes("..")) throw new Error(`${relative}: refusing a path outside the asset folder`);
  const response = await fetch(file.url);
  if (!response.ok) throw new Error(`${file.url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = createHash("md5").update(bytes).digest("hex");
  if (file.md5 && file.md5 !== hash) throw new Error(`${relative}: download md5 ${hash} does not match Poly Haven's ${file.md5}`);
  const absolute = path.join(PACK, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
  return hash;
};
const manifestPath = path.join(PACK, "models.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

for (const id of ids) {
  const existed = existsSync(path.join(PACK, id));
  try {
    const [info, files] = await Promise.all([
      fetchJson(`https://api.polyhaven.com/info/${id}`),
      fetchJson(`https://api.polyhaven.com/files/${id}`),
    ]);
    const gltf = files.gltf?.[res]?.gltf;
    if (!gltf?.url) throw new Error(`no gltf download at ${res}`);
    const url = `${id}/${path.basename(new URL(gltf.url).pathname)}`;
    const md5 = { [url]: await download(gltf, url) };
    for (const [relative, file] of Object.entries(gltf.include ?? {})) {
      md5[`${id}/${relative}`] = await download(file, `${id}/${relative}`);
    }
    manifest.models = manifest.models.filter((model) => model.id !== `ph_${id}`);
    manifest.models.push({ id: `ph_${id}`, url, scale: 1, source: `https://polyhaven.com/a/${id}`, license: "CC0-1.0", md5 });
    // Persist after every asset so one bad id never loses the others.
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const size = Array.isArray(info.dimensions) ? info.dimensions.map((mm) => (mm / 1000).toFixed(2)).join(" x ") : "?";
    console.log(`registered ph_${id}  ${size} m  (${info.name}, ${Object.keys(info.authors ?? {}).join(", ")}, CC0)`);
  } catch (error) {
    if (!existed) rmSync(path.join(PACK, id), { recursive: true, force: true });
    console.error(`skipped ${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
