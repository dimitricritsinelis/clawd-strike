// Map SWAT tooling: shoot one review unit's player-eye views, and check that a
// map_spec edit left protected gameplay untouched.
//
//   pnpm map:shoot                      list units and their view ids
//   pnpm map:shoot <unit|random> [--views a,b] [--tag before|after]
//     a tag ending in "before" snapshots map_spec.json next to the images for a safe revert;
//     a tag ending in "after" reuses the poses of the matching "...before" shoot
//   pnpm map:check                      regen maps + protected-gameplay diff vs HEAD
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveReviewUnits,
  detectProtectedChanges,
  hashMapAuthority,
  validateMapSpec,
} from "./lib/mapShoot";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = "docs/map-design/specs/map_spec.json";
const CLIENT = path.join(ROOT, "apps/client");
const OUT = path.join(ROOT, "artifacts/map-shoot");

function run(cmd: string, args: string[], cwd = ROOT): string {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  } catch (error) {
    const out = (error as { stdout?: string }).stdout;
    if (out) console.error(out.trim());
    throw new Error(`${path.basename(String(args[0] ?? cmd))} failed`);
  }
}

function regen(): void {
  run(process.execPath, ["scripts/gen-map-runtime.mjs"], CLIENT);
  run(process.execPath, ["scripts/gen-layout-reference.mjs"], CLIENT);
}

function loadSpec() {
  const source = readFileSync(path.join(ROOT, SPEC), "utf8");
  return { source, spec: validateMapSpec(JSON.parse(source)) };
}

function shoot(argv: string[]): void {
  const { source, spec } = loadSpec();
  const units = deriveReviewUnits(spec);
  const target = argv.find((a) => !a.startsWith("--"));
  if (!target) {
    for (const u of units) console.log(`${u.id.padEnd(26)} ${u.views.map((v) => v.id).join(" ")}`);
    return;
  }
  const unit = target === "random"
    ? units[Math.floor(Math.random() * units.length)]
    : units.find((u) => u.id === target || u.id === `unit-${target}`);
  if (!unit) throw new Error(`unknown unit '${target}'; run with no args to list`);
  const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const tag = opt("--tag") ?? "before";
  // An "after" shoot reuses the exact "before" poses so every pair is frame-to-frame comparable,
  // even when the edit added a frontage and changed the derived view set.
  const beforePlan = path.join(OUT, unit.id, tag.replace(/after$/, "before"), "plan.json");
  const poses = tag.endsWith("after") && existsSync(beforePlan)
    ? (JSON.parse(readFileSync(beforePlan, "utf8")).units[0].views as typeof unit.views)
    : unit.views;
  const wanted = opt("--views")?.split(",");
  // primary and context are always shot: the capture adapter requires them first, and they are cheap.
  const views = wanted ? poses.filter((v) => v.id === "primary" || v.id === "context" || wanted.includes(v.id)) : poses;
  const dir = path.join(OUT, unit.id, tag);
  if (tag.endsWith("before") && existsSync(path.join(dir, "map_spec.json"))) {
    throw new Error(`${path.relative(ROOT, dir)} already holds a before snapshot; use --tag after, or delete that directory to start the unit over`);
  }
  mkdirSync(dir, { recursive: true });

  regen();
  if (tag.endsWith("before")) writeFileSync(path.join(dir, "map_spec.json"), source);
  const planPath = path.join(dir, "plan.json");
  writeFileSync(planPath, JSON.stringify({
    schemaVersion: 1,
    authorityHash: hashMapAuthority(source),
    contactSheets: false,
    units: [{ ...unit, views }],
    batches: [{ id: "batch-01", unitIds: [unit.id] }],
  }));
  run(process.execPath, ["scripts/map-polish-capture.mjs", "capture", "--plan", planPath, "--output", dir, "--repo-root", ROOT], CLIENT);

  const zone = spec.zones.find((z) => z.id === unit.zoneIds[0])!;
  const boundary = (spec.global_dimensions as { playable_boundary: { w: number; h: number } }).playable_boundary;
  const planPng = path.join(dir, "plan.png");
  run(process.execPath, [
    "scripts/map-polish-plan-crop.mjs",
    "--svg", path.join(ROOT, "docs/map-design/layout-reference.svg"),
    "--zone-rect", `${zone.rect.x},${zone.rect.y},${zone.rect.w},${zone.rect.h}`,
    "--boundary", `${boundary.w},${boundary.h}`,
    "--out", planPng,
    "--label", `${unit.id} (${zone.label}) · N up, E right · in game, looking N puts E on your LEFT`,
  ], CLIENT);

  const result = JSON.parse(readFileSync(path.join(dir, "capture-result.json"), "utf8"));
  const shot = result.units[0].views as Record<string, { imagePath: string; valid: boolean; errors: string[] }>;
  console.log(`${unit.id}  ${zone.label}  zone=${zone.id}  type=${unit.zoneType}${poses !== unit.views ? "  (poses reused from " + path.basename(path.dirname(beforePlan)) + "/)" : ""}`);
  if (tag.endsWith("before")) {
    const rows = (key: string, pred: (r: any) => boolean) => ((spec[key] as any[]) ?? []).filter(pred);
    console.log("zone     " + JSON.stringify(zone));
    const buildings = (spec.buildings as any[]) ?? [];
    for (const f of rows("frontages", (r) => r.zoneId === zone.id)) {
      const b = buildings.find((x) => x.id === f.buildingId);
      console.log("frontage " + JSON.stringify(f));
      console.log(b ? `  building ${b.id}  ${b.type}, ${b.storeys} storey(s): ${b.brief}` : "  building NONE: assign one in buildings[] before touching this wall");
    }
    for (const b of buildings.filter((x) => x.faces.some((fc: any) => fc.zoneId === zone.id) && !rows("frontages", (r) => r.buildingId === x.id).length)) {
      console.log(`code-owned building ${b.id} (${b.faces.filter((fc: any) => fc.zoneId === zone.id).map((fc: any) => fc.face).join(",")}): ${b.type}: ${b.brief}`);
    }
    for (const e of rows("frontage_exemptions", (r) => r.zoneId === zone.id)) console.log("exempt   " + JSON.stringify(e));
    const links = rows("explicit_connectivity", (r) => r.fromZoneId === zone.id || r.toZoneId === zone.id)
      .map((r) => (r.fromZoneId === zone.id ? r.toZoneId : r.fromZoneId));
    console.log("connects " + [...new Set(links)].join(", "));
  }
  console.log(`plan   ${path.relative(ROOT, planPng)}`);
  for (const [id, v] of Object.entries(shot)) {
    let delta = "";
    if (poses !== unit.views) {
      const before = path.join(path.dirname(beforePlan), "units", unit.id, path.basename(v.imagePath));
      if (existsSync(before)) {
        const c = JSON.parse(run(process.execPath, ["scripts/map-polish-capture.mjs", "compare", "--before", before, "--after", v.imagePath], CLIENT));
        delta = c.effectivelyUnchanged ? "  unchanged" : `  changed ${(c.changedPixelRatio * 100).toFixed(1)}% of pixels`;
      }
    }
    console.log(`${v.valid ? "view  " : "BAD   "} ${id.padEnd(40)} ${path.relative(ROOT, v.imagePath)}${delta}${v.errors.length ? "  " + v.errors.join("; ") : ""}`);
  }
}

function check(): void {
  regen();
  const { spec } = loadSpec();
  const base = validateMapSpec(JSON.parse(run("git", ["show", `HEAD:${SPEC}`])));
  const touched = run("git", ["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean);
  const reasons = detectProtectedChanges(base, spec, touched);
  const buildingIds = new Set(((spec.buildings as any[]) ?? []).map((b) => b.id));
  for (const f of spec.frontages as any[]) {
    if (!buildingIds.has(f.buildingId)) reasons.push(`frontage ${f.id} has no building (buildingId '${f.buildingId ?? ""}')`);
  }
  if (reasons.length) {
    console.error("map:check FAIL\n  " + reasons.join("\n  "));
    process.exit(1);
  }
  console.log("map:check OK  protected gameplay unchanged. Modified vs HEAD:\n  " + (touched.join("\n  ") || "(nothing)"));
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "check") check();
else shoot(cmd ? [cmd, ...rest] : rest);
