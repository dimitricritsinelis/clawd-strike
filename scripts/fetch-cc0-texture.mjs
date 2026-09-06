#!/usr/bin/env node
// Fetch Poly Haven CC0 PBR textures into the bazaar wall pack and record provenance.
//
//   node scripts/fetch-cc0-texture.mjs <polyhaven-id>... [--res 1k,2k]
//
// Writes <pack>/<id>/<id>_{diff,nor_gl,arm}_<res>.jpg, appends the family to
// sources.json (source, license, md5 per map) and a material `ph_<id>` to
// materials.json with the asset's real tile size. Material ids are then usable
// anywhere a wall material id is accepted (facade profiles, kit materials).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = path.join(ROOT, "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5");
const MAPS = { albedo: [["Diffuse", "Color"], "diff"], normal: [["nor_gl"], "nor_gl"], arm: [["arm"], "arm"] };

const args = process.argv.slice(2);
const resIndex = args.indexOf("--res");
const resolutions = (resIndex >= 0 ? args[resIndex + 1] : "1k,2k").split(",");
const ids = args.filter((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--res");
if (ids.length === 0) {
  console.error("usage: node scripts/fetch-cc0-texture.mjs <polyhaven-id>... [--res 1k,2k]");
  process.exit(2);
}

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};
const sources = JSON.parse(readFileSync(path.join(PACK, "sources.json"), "utf8"));
const materials = JSON.parse(readFileSync(path.join(PACK, "materials.json"), "utf8"));

for (const id of ids) {
  try {
    const [info, files] = await Promise.all([
      fetchJson(`https://api.polyhaven.com/info/${id}`),
      fetchJson(`https://api.polyhaven.com/files/${id}`),
    ]);
    const tileSizeM = Array.isArray(info.dimensions) && info.dimensions[0] > 0 ? Number((info.dimensions[0] / 1000).toFixed(2)) : 2;
    const md5 = {};
    const textures = {};
    for (const res of resolutions) {
      md5[res] = {};
      textures[res] = {};
      for (const [slot, [mapNames, suffix]] of Object.entries(MAPS)) {
        const mapName = mapNames.find((name) => files[name]?.[res]);
        if (!mapName) throw new Error(`no ${mapNames.join("/")} map at ${res}`);
        const variants = files[mapName][res];
        const ext = variants.jpg ? "jpg" : "png";
        const file = variants[ext];
        if (!file?.url) throw new Error(`${mapName} ${res} has no jpg/png download`);
        const relative = `${id}/${id}_${suffix}_${res}.${ext}`;
        const absolute = path.join(PACK, relative);
        mkdirSync(path.dirname(absolute), { recursive: true });
        const response = await fetch(file.url);
        if (!response.ok) throw new Error(`${file.url}: HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        const hash = createHash("md5").update(bytes).digest("hex");
        if (file.md5 && file.md5 !== hash) throw new Error(`${relative}: download md5 ${hash} does not match Poly Haven's ${file.md5}`);
        writeFileSync(absolute, bytes);
        md5[res][slot] = hash;
        textures[res][slot] = `./${relative}`;
      }
    }
    sources.sourceFamilies[id] = {
      source: `https://polyhaven.com/a/${id}`,
      license: "CC0-1.0",
      originalResolution: resolutions[resolutions.length - 1],
      md5,
    };
    materials.materials = materials.materials.filter((material) => material.id !== `ph_${id}`);
    materials.materials.push({ id: `ph_${id}`, tileSizeM, tintHex: "#ffffff", textures });
    // Persist after every asset so one bad id never loses the others.
    writeFileSync(path.join(PACK, "sources.json"), `${JSON.stringify(sources, null, 2)}\n`);
    writeFileSync(path.join(PACK, "materials.json"), `${JSON.stringify(materials, null, 2)}\n`);
    console.log(`registered ph_${id}  tile ${tileSizeM} m  (${info.name}, ${Object.keys(info.authors ?? {}).join(", ")}, CC0)`);
  } catch (error) {
    rmSync(path.join(PACK, id), { recursive: true, force: true });
    console.error(`skipped ${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
