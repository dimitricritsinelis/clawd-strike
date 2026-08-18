#!/usr/bin/env node
// Map-polish plan crop: rasterises the compiled layout reference SVG (zones,
// architecture placements, facade modules, dressing) and crops it around one
// review unit's zone with a margin, a north arrow, a scale bar, and the zone
// outline. This is the design-time evidence a player-eye screenshot cannot
// give: where every opening sits relative to the room, its axis, its entrances,
// and the opposite wall. Deterministic for a given SVG + zone rect.
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const PIXELS_PER_METRE = 40;
const DEFAULT_MARGIN_M = 8;

function usage() {
  return [
    "Usage:",
    "  node map-polish-plan-crop.mjs --svg PATH --zone-rect x,y,w,h --boundary w,h --out PATH [--label TEXT] [--margin M]",
    "",
    "The zone rect is in map metres with +y north; the SVG viewBox is boundary metres with y flipped.",
  ].join("\n");
}

function parseOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument '${arg}'\n${usage()}`);
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (typeof value === "undefined" || value.startsWith("--")) throw new Error(`Option --${key} requires a value\n${usage()}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function numbers(value, label, count) {
  const parts = String(value).split(",").map((part) => Number(part.trim()));
  if (parts.length !== count || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`--${label} must be ${count} comma-separated finite numbers`);
  }
  return parts;
}

function xmlEscape(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&#39;",
  })[char]);
}

export async function renderPlanCrop({ svgPath, zoneRect, boundary, outPath, label, marginM = DEFAULT_MARGIN_M }) {
  const [boundaryW, boundaryH] = boundary;
  const [zx, zy, zw, zh] = zoneRect;
  const svg = await readFile(svgPath);
  const fullWidthPx = Math.round(boundaryW * PIXELS_PER_METRE);
  const fullHeightPx = Math.round(boundaryH * PIXELS_PER_METRE);
  const raster = await sharp(svg, { density: 72 })
    .resize(fullWidthPx, fullHeightPx, { fit: "fill", kernel: "nearest" })
    .png()
    .toBuffer();

  // Map metres (+y north) -> SVG metres (y down): svgY = boundaryH - (y + h).
  const cropX0 = Math.max(0, zx - marginM);
  const cropX1 = Math.min(boundaryW, zx + zw + marginM);
  const cropSvgY0 = Math.max(0, boundaryH - (zy + zh) - marginM);
  const cropSvgY1 = Math.min(boundaryH, boundaryH - zy + marginM);
  const left = Math.round(cropX0 * PIXELS_PER_METRE);
  const top = Math.round(cropSvgY0 * PIXELS_PER_METRE);
  const width = Math.max(1, Math.round((cropX1 - cropX0) * PIXELS_PER_METRE));
  const height = Math.max(1, Math.round((cropSvgY1 - cropSvgY0) * PIXELS_PER_METRE));

  // Overlay: zone outline, label, north arrow, 5m scale bar. Coordinates are
  // relative to the crop.
  const zoneLeftPx = (zx - cropX0) * PIXELS_PER_METRE;
  const zoneTopPx = ((boundaryH - (zy + zh)) - cropSvgY0) * PIXELS_PER_METRE;
  const zoneWPx = zw * PIXELS_PER_METRE;
  const zoneHPx = zh * PIXELS_PER_METRE;
  const barPx = 5 * PIXELS_PER_METRE;
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${zoneLeftPx.toFixed(1)}" y="${zoneTopPx.toFixed(1)}" width="${zoneWPx.toFixed(1)}" height="${zoneHPx.toFixed(1)}" fill="none" stroke="#ff3b1f" stroke-width="3" stroke-dasharray="10,6"/>
  <g font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700">
    <rect x="8" y="8" width="${Math.min(width - 16, 22 + label.length * 12.5).toFixed(0)}" height="34" rx="4" fill="#000000" fill-opacity="0.72"/>
    <text x="16" y="32" fill="#ffffff">${xmlEscape(label)}</text>
    <g transform="translate(${width - 44}, 60)">
      <polygon points="0,-26 10,10 0,3 -10,10" fill="#ffffff" stroke="#000000" stroke-width="2"/>
      <text x="0" y="34" text-anchor="middle" fill="#ffffff" stroke="#000000" stroke-width="0.8" font-size="20">N</text>
    </g>
    <g transform="translate(16, ${height - 26})">
      <rect x="0" y="0" width="${barPx}" height="8" fill="#ffffff" stroke="#000000" stroke-width="2"/>
      <text x="${barPx + 10}" y="10" fill="#ffffff" stroke="#000000" stroke-width="0.8" font-size="18">5 m</text>
    </g>
  </g>
</svg>`);

  await mkdir(path.dirname(outPath), { recursive: true });
  const temporary = `${outPath}.tmp-${process.pid}`;
  await sharp(raster)
    .extract({ left, top, width, height })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(temporary);
  await rename(temporary, outPath);
  return { outPath, width, height, cropMetres: { x0: cropX0, x1: cropX1, y0: zy - marginM, y1: zy + zh + marginM } };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const unexpected = Object.keys(options).filter((key) => !["svg", "zone-rect", "boundary", "out", "label", "margin"].includes(key));
  if (unexpected.length > 0) throw new Error(`Unknown option(s): ${unexpected.join(", ")}\n${usage()}`);
  for (const key of ["svg", "zone-rect", "boundary", "out"]) {
    if (!options[key]) throw new Error(`Missing --${key}\n${usage()}`);
  }
  const result = await renderPlanCrop({
    svgPath: path.resolve(options.svg),
    zoneRect: numbers(options["zone-rect"], "zone-rect", 4),
    boundary: numbers(options.boundary, "boundary", 2),
    outPath: path.resolve(options.out),
    label: options.label ?? "plan",
    marginM: options.margin ? Number(options.margin) : DEFAULT_MARGIN_M,
  });
  await writeFile(`${result.outPath}.json`, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

// URL.pathname keeps a leading slash before the drive letter on Windows, so it
// can never equal a resolved argv path there; compare file URLs instead.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
