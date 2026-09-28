// Protected-gameplay guard: check that a map_spec edit left protected gameplay untouched.
//
//   pnpm map:check              regen maps + protected-gameplay diff vs the task baseline (or HEAD)
//   pnpm map:check --baseline   record the current dirty state as the task baseline
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  authoredPlacementReasons,
  detectProtectedChanges,
  glbBounds,
  glbTriangleBounds,
  hashMapAuthority,
  validateMapSpec,
} from "./lib/mapGuard";
import type { Bounds3 } from "./lib/mapGuard";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = "docs/map-design/specs/map_spec.json";
const CLIENT = path.join(ROOT, "apps/client");
const BASELINE = path.join(ROOT, "artifacts/map-guard/baseline");
const FACADES = path.join(ROOT, "apps/client/public/assets/models/environment/bazaar/facades");
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

/** Bounds of each placed model, read from the GLB the facades manifest points at. */
function placementGeometry() {
  const cache = new Map<string, { bounds: Bounds3 | null; triangles: Bounds3[]; vertices: Bounds3["min"][] }>();
  const manifest = JSON.parse(readFileSync(path.join(FACADES, "models.json"), "utf8")) as { models: { id: string; url: string }[] };
  const get = (modelId: string) => {
    if (!cache.has(modelId)) {
      const model = manifest.models.find((m) => m.id === modelId);
      if (!model) throw new Error(`placement model ${modelId} is not in ${rel(path.join(FACADES, "models.json"))}`);
      const bytes = readFileSync(path.join(FACADES, model.url));
      const vertices: Bounds3["min"][] = [];
      const bounds=glbBounds(bytes), triangles=glbTriangleBounds(bytes, vertex => vertices.push(vertex));
      if(!bounds&&triangles.length)throw new Error(`placement model ${modelId} has geometry but no declared bounds`);
      cache.set(modelId, { bounds, triangles, vertices });
    }
    return cache.get(modelId)!;
  };
  return { bounds: (id: string) => get(id).bounds, triangles: (id: string) => get(id).triangles, vertices: (id: string) => get(id).vertices };
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
  const geometry = placementGeometry();
  reasons.push(...authoredPlacementReasons(spec, geometry.bounds, undefined, undefined, geometry.triangles, geometry.vertices));
  const buildingIds = new Set(((spec.buildings as any[]) ?? []).map((b) => b.id));
  for (const f of spec.frontages as any[]) {
    if (!buildingIds.has(f.buildingId)) reasons.push(`frontage ${f.id} has no building (buildingId '${f.buildingId ?? ""}')`);
  }
  const against = usingBaseline ? `task baseline ${rel(BASELINE)}` : "HEAD (no task baseline; run pnpm map:check --baseline at task start)";
  if (reasons.length) {
    console.error(`map:check FAIL vs ${against}\n  ` + reasons.join("\n  "));
    process.exit(1);
  }
  console.log(`map:check OK  protected authority unchanged since ${against}. Changed since then:\n  ` + (touched.join("\n  ") || "(nothing)"));
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
if (cmd !== "check") {
  console.error("usage: node --import tsx scripts/map-guard.ts check [--baseline]");
  process.exit(2);
}
regen();
if (rest.includes("--baseline")) recordBaseline();
else check();
