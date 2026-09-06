// Map SWAT tooling: shoot one review unit's player-eye views, and check that a
// map_spec edit left protected gameplay untouched.
//
//   pnpm map:shoot                      list units and their view ids
//   pnpm map:shoot <unit|random> [--views a,b] [--tag before|after]
//     a tag ending in "before" snapshots map_spec.json next to the images for a safe revert;
//     a tag ending in "after" reuses the poses of the matching "...before" shoot and writes
//     critic/brief.md: blind A/B copies of both shoots plus the unit's target image
//   pnpm map:check                      regen maps + protected-gameplay diff vs the task baseline (or HEAD)
//   pnpm map:check --baseline           record the current dirty state as the task baseline
import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveReviewUnits,
  captureEvidenceErrors,
  detectProtectedChanges,
  hashMapAuthority,
  hasFrameMeasurement,
  validateMapSpec,
} from "./lib/mapShoot";
import type { FramePerformance, ReviewUnitDefinition } from "./lib/mapShoot";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = "docs/map-design/specs/map_spec.json";
const CLIENT = path.join(ROOT, "apps/client");
const OUT = path.join(ROOT, "artifacts/map-shoot");
const BASELINE = path.join(OUT, ".baseline");
const TARGETS = path.join(ROOT, "docs/map-design/targets");
const FOUNDING_IMAGE = path.join(ROOT, "docs/map-design/refs/bazaar_main_hall_reference.png");
const rel = (file: string) => path.relative(ROOT, file);
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
function touchedFiles(): string[] {
  return [...new Set([
    ...run("git", ["diff", "--name-only", "HEAD"]).split("\n"),
    ...run("git", ["ls-files", "--others", "--exclude-standard"]).split("\n"),
  ].filter(Boolean))];
}
function fileHash(file: string): string {
  const absolute = path.join(ROOT, file);
  return existsSync(absolute) ? hashMapAuthority(readFileSync(absolute)) : "missing";
}
/** The unit's target image; the founding image until a per-unit target exists. */
function targetImage(unitId: string): { file: string; perUnit: boolean } {
  const perUnit = path.join(TARGETS, `${unitId}.png`);
  return existsSync(perUnit) ? { file: perUnit, perUnit: true } : { file: FOUNDING_IMAGE, perUnit: false };
}
type ShotViews = Record<string, { imagePath: string; valid: boolean; errors: string[]; performance?: FramePerformance }>;
/**
 * Blind A/B for a fresh-context critic: both shoots copied under neutral labels,
 * the target beside them, and the label key kept apart so the judge cannot know
 * which render is newer until the verdict is written.
 */
function writeCriticBrief(unit: ReviewUnitDefinition, dir: string, beforeDir: string, shot: ShotViews, target: string): string {
  const criticDir = path.join(dir, "critic");
  mkdirSync(criticDir, { recursive: true });
  const afterIsA = randomInt(2) === 1;
  const files = ["target.png", "plan.png"];
  copyFileSync(target, path.join(criticDir, "target.png"));
  copyFileSync(path.join(dir, "plan.png"), path.join(criticDir, "plan.png"));
  for (const view of Object.values(shot)) {
    const name = path.basename(view.imagePath, ".png");
    const before = path.join(beforeDir, "units", unit.id, path.basename(view.imagePath));
    if (!existsSync(before)) continue;
    copyFileSync(afterIsA ? view.imagePath : before, path.join(criticDir, `A_${name}.png`));
    copyFileSync(afterIsA ? before : view.imagePath, path.join(criticDir, `B_${name}.png`));
    files.push(`A_${name}.png`, `B_${name}.png`);
  }
  writeFileSync(path.join(criticDir, "key.json"), JSON.stringify({ A: afterIsA ? "after" : "before", B: afterIsA ? "before" : "after" }));
  writeFileSync(path.join(criticDir, "brief.md"), [
    `# Blind critic brief: ${unit.label} (${unit.id})`,
    "",
    "You did not build these. A and B are the same cameras; you do not know which is newer.",
    "Follow `.claude/skills/map-critic/SKILL.md`. Do not open `key.json` until `verdict.json` is written.",
    "",
    "Target: `target.png` (inspiration, not a spec). Plan crop (north up, east right): `plan.png`. Compare each `A_<view>.png` with its `B_<view>.png`; `*_primary` carries the most weight.",
    "If `problems.md` exists beside this file, it names the problems this cycle set out to fix: say which improved.",
    "",
    "Write `verdict.json` next to this file:",
    "```json",
    '{ "winner": "A" | "B", "improved": ["problem that visibly improved"], "regressions": ["view or surface made worse"], "blockers": [], "biggestGap": "one concrete visible sentence" }',
    "```",
    "",
    `Files: ${files.join(", ")}`,
    "",
  ].join("\n"));
  return criticDir;
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
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(tag)) throw new Error("tag must contain only letters, numbers, underscores, and hyphens");
  // Critic rounds reuse one before: "<name>-after", "<name>-after2", "<name>-after3" all pair with "<name>-before".
  const isAfter = /after-?\d*$/.test(tag);
  if (target === "random" && isAfter) throw new Error("after capture requires the unit named by the before shoot, not random");
  // An "after" shoot reuses the exact "before" poses so every pair is frame-to-frame comparable,
  // even when the edit added a frontage and changed the derived view set.
  const beforePlan = path.join(OUT, unit.id, tag.replace(/after-?\d*$/, "before"), "plan.json");
  const beforeResult = path.join(path.dirname(beforePlan), "capture-result.json");
  if (isAfter && (!existsSync(beforePlan) || !existsSync(beforeResult))) {
    throw new Error("after capture requires a matching before plan and capture-result.json; capture a new before tag first");
  }
  const baseline = isAfter ? JSON.parse(readFileSync(beforeResult, "utf8")) : undefined;
  if (baseline) {
    const errors = captureEvidenceErrors(baseline);
    if (errors.length) throw new Error(`before evidence cannot be reused: ${errors.join("; ")}`);
  }
  const poses = baseline ? (JSON.parse(readFileSync(beforePlan, "utf8")).units[0].views as typeof unit.views) : unit.views;
  const wanted = opt("--views")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (wanted?.some((id) => !poses.some((view) => view.id === id))) throw new Error("unknown --views id; run map:shoot without arguments to list views");
  // primary and context are always shot: the capture adapter requires them first, and they are cheap.
  const views = wanted ? poses.filter((v) => v.id === "primary" || v.id === "context" || wanted.includes(v.id)) : poses;
  if (baseline && views.length !== poses.length) throw new Error("after capture must reuse all views from the matching before shoot");
  const dir = path.join(OUT, unit.id, tag);
  if (tag.endsWith("before") && existsSync(path.join(dir, "map_spec.json"))) {
    throw new Error(`${rel(dir)} already holds a before snapshot; use the matching after tag, or a new unique before tag`);
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
  const shot = result.units[0].views as ShotViews;
  console.log(`${unit.id}  ${zone.label}  zone=${zone.id}  type=${unit.zoneType}${poses !== unit.views ? "  (poses reused from " + path.basename(path.dirname(beforePlan)) + "/)" : ""}`);
  if (tag.endsWith("before")) {
    const rows = (key: string, pred: (r: any) => boolean) => ((spec[key] as any[]) ?? []).filter(pred);
    console.log("zone     " + JSON.stringify(zone));
    const buildings = (spec.buildings as any[]) ?? [];
    for (const f of rows("frontages", (r) => r.zoneId === zone.id)) {
      const b = buildings.find((x) => x.id === f.buildingId);
      console.log("frontage " + JSON.stringify(f));
      console.log(b ? `  building ${b.id}  ${b.type}, ${b.storeys} storey(s): ${b.brief}` : "  building NONE: assign one in buildings[] before touching this wall");
      const massing = ((spec.massing_profiles as any[]) ?? []).find((m) => m.id === f.massingProfileId);
      const lengthM = (f.face === "west" || f.face === "east" ? zone.rect.h : zone.rect.w) * ((f.end ?? 1) - (f.start ?? 0));
      if (massing) console.log(`  facade GLB  width ${lengthM.toFixed(2)} m x wall height ${massing.heightM} m (massing depth ${massing.depthM} m, parapet +${massing.parapetHeightM} m); origin bottom-center of the street face, +Z toward the street`);
      for (const wall of b?.walls ?? []) {
        if (wall.frontageId === f.id) console.log("  schedule " + JSON.stringify(wall));
      }
    }
    for (const b of buildings.filter((x) => x.faces.some((fc: any) => fc.zoneId === zone.id) && !rows("frontages", (r) => r.buildingId === x.id).length)) {
      console.log(`code-owned building ${b.id} (${b.faces.filter((fc: any) => fc.zoneId === zone.id).map((fc: any) => fc.face).join(",")}): ${b.type}: ${b.brief}`);
      console.log("  schedule " + JSON.stringify(b.walls));
    }
    for (const e of rows("frontage_exemptions", (r) => r.zoneId === zone.id)) console.log("exempt   " + JSON.stringify(e));
    const links = rows("explicit_connectivity", (r) => r.fromZoneId === zone.id || r.toZoneId === zone.id)
      .map((r) => (r.fromZoneId === zone.id ? r.toZoneId : r.fromZoneId));
    console.log("connects " + [...new Set(links)].join(", "));
  }
  const unitTarget = targetImage(unit.id);
  console.log(`target ${rel(unitTarget.file)}${unitTarget.perUnit ? "" : "  (no per-unit target yet: founding image; prompts in docs/map-design/targets/targets.json)"}`);
  console.log(`plan   ${rel(planPng)}`);
  for (const [id, v] of Object.entries(shot)) {
    let delta = "";
    if (poses !== unit.views) {
      const before = path.join(path.dirname(beforePlan), "units", unit.id, path.basename(v.imagePath));
      if (existsSync(before)) {
        const c = JSON.parse(run(process.execPath, ["scripts/map-polish-capture.mjs", "compare", "--before", before, "--after", v.imagePath], CLIENT));
        delta = c.decoded?.pixelIdentical ? "  identical" : `  changed ${(c.changedPixelRatio * 100).toFixed(3)}% of pixels${c.effectivelyUnchanged ? " (below global threshold; inspect the target)" : ""}`;
      }
    }
    console.log(`${v.valid ? "view  " : "BAD   "} ${id.padEnd(40)} ${rel(v.imagePath)}${delta}${v.errors.length ? "  " + v.errors.join("; ") : ""}`);
  }
  // Performance is one number per section: the worst view against the budget.
  const perfs = Object.values(shot).map((v) => v.performance).filter(hasFrameMeasurement);
  if (perfs.length < Object.keys(shot).length) console.log("PERF UNVERIFIED: capture telemetry missing on some views");
  if (perfs.length) {
    const budget = result.performanceBudget as { maxDrawCalls: number; maxTriangles: number; maxDesktopFrameMs: number };
    const worst = perfs.reduce(
      (acc, p) => ({ draws: Math.max(acc.draws, p.drawCalls), tris: Math.max(acc.tris, p.triangles), ms: Math.max(acc.ms, p.medianFrameMs) }),
      { draws: 0, tris: 0, ms: 0 },
    );
    const over = worst.draws > budget.maxDrawCalls || worst.tris > budget.maxTriangles || worst.ms > budget.maxDesktopFrameMs;
    console.log(`perf   worst view ${worst.draws} draws / ${worst.tris} tris / ${worst.ms.toFixed(1)} ms CPU  (budget ${budget.maxDrawCalls} / ${budget.maxTriangles} / ${budget.maxDesktopFrameMs} ms)${over ? "  OVER BUDGET: fix before moving on" : ""}`);
  }
  if (baseline) {
    const criticDir = writeCriticBrief(unit, dir, path.dirname(beforePlan), shot, unitTarget.file);
    console.log(`critic ${rel(criticDir)}/brief.md  (hand to a fresh-context map-critic; read key.json only after verdict.json exists)`);
  }
  const errors = captureEvidenceErrors(result, baseline);
  if (errors.length) throw new Error(`map:shoot FAIL: ${errors.join("; ")}`);
  if (baseline) console.log("runtime colliders unchanged; walk the routes for visual clearance before moving on");
  check();
}

/**
 * Protected-gameplay guard. Compares against the task baseline when one was
 * recorded (`pnpm map:check --baseline`), otherwise against HEAD. Files already
 * dirty at baseline count only when their content changed since.
 */
function check(): void {
  const { spec } = loadSpec();
  const baselineSpec = path.join(BASELINE, "map_spec.json");
  const baselineHashes = path.join(BASELINE, "touched.json");
  const usingBaseline = existsSync(baselineSpec) && existsSync(baselineHashes);
  const base = validateMapSpec(JSON.parse(usingBaseline ? readFileSync(baselineSpec, "utf8") : run("git", ["show", `HEAD:${SPEC}`])));
  const knownHashes: Record<string, string> = usingBaseline ? JSON.parse(readFileSync(baselineHashes, "utf8")) : {};
  const touched = touchedFiles().filter((file) => knownHashes[file] !== fileHash(file));
  const reasons = detectProtectedChanges(base, spec, touched);
  const buildingIds = new Set(((spec.buildings as any[]) ?? []).map((b) => b.id));
  for (const f of spec.frontages as any[]) {
    if (!buildingIds.has(f.buildingId)) reasons.push(`frontage ${f.id} has no building (buildingId '${f.buildingId ?? ""}')`);
  }
  const against = usingBaseline ? `task baseline ${rel(BASELINE)}` : "HEAD (no task baseline; run pnpm map:check --baseline at task start)";
  if (reasons.length) {
    console.error(`map:check FAIL vs ${against}\n  ` + reasons.join("\n  "));
    process.exit(1);
  }
  console.log(`map:check OK  protected authority unchanged since ${against}; compare runtime colliders with paired shoots. Changed since then:\n  ` + (touched.join("\n  ") || "(nothing)"));
}

function recordBaseline(): void {
  const { source, spec } = loadSpec();
  mkdirSync(BASELINE, { recursive: true });
  writeFileSync(path.join(BASELINE, "map_spec.json"), source);
  const touched = touchedFiles();
  writeFileSync(path.join(BASELINE, "touched.json"), JSON.stringify(Object.fromEntries(touched.map((file) => [file, fileHash(file)])), null, 2));
  const head = validateMapSpec(JSON.parse(run("git", ["show", `HEAD:${SPEC}`])));
  const accepted = detectProtectedChanges(head, spec, touched);
  console.log(`map:check baseline recorded at ${rel(BASELINE)} (${touched.length} dirty files). Later checks fail only on protected changes made after this point.`);
  if (accepted.length) console.log("  accepted as pre-existing vs HEAD:\n  " + accepted.join("\n  "));
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "check") {
  regen();
  if (rest.includes("--baseline")) recordBaseline();
  else check();
}
else shoot(cmd ? [cmd, ...rest] : rest);
