import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import {
  access,
  appendFile,
  copyFile,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_ARTIFACTS_PATH,
  DEFAULT_STATE_PATH,
  DESIGN_REVIEW_LENS,
  applyRatings,
  assertAutomaticWorktree,
  assertSurveyCoverage,
  buildSiteBrief,
  buildSurveyBatches,
  buildWorkOrder,
  captureCandidatePatch,
  cleanupRejectedArtifacts,
  collectTouchedFiles,
  compositionRequiredForUnit,
  computeSurveyCoverage,
  conceptAllowed,
  createInitialState,
  currentCommit,
  deriveReviewUnits,
  detectProtectedChanges,
  focusedRouteForUnit,
  formatCoverageTable,
  inferTaskRisk,
  isRelevantMapSource,
  mockSurveyRatings,
  pruneState,
  readMapSpecFile,
  readStateFile,
  requiredChecks,
  restoreCandidateFiles,
  selectNextUnit,
  syncStateWithSpec,
  syncStateWithSourceFingerprint,
  totalAcceptedChanges,
  updateOutcome,
  validateImagePair,
  writeJsonAtomic,
  writeStateFile,
  type ActiveTask,
  type EngineName,
  type ImagePairInput,
  type MapPolishState,
  type MapSpec,
  type ReviewUnitDefinition,
  type ReviewUnitState,
  type ReviewerResult,
  type RunMode,
  type SurveyRating,
  type TaskRisk,
  type UnitEvidence,
} from "./lib/mapPolish.js";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const TOOL_REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), "..");
const CAPTURE_ADAPTER = path.join(TOOL_REPO_ROOT, "apps/client/scripts/map-polish-capture.mjs");
const PLAN_CROP_ADAPTER = path.join(TOOL_REPO_ROOT, "apps/client/scripts/map-polish-plan-crop.mjs");
const MAP_SPEC_PATH = "docs/map-design/specs/map_spec.json";
const LAYOUT_REFERENCE_SVG = "docs/map-design/layout-reference.svg";

class CodexInvocationError extends Error {
  readonly telemetry: ModelCallTelemetry | null;

  constructor(message: string, telemetry: ModelCallTelemetry | null = null) {
    super(message);
    this.name = "CodexInvocationError";
    this.telemetry = telemetry;
  }
}

type CommandName = "survey" | "next" | "run" | "verify" | "coverage" | "loop";

type CliIo = {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
};

type CliOptions = {
  command: CommandName;
  repoRoot: string;
  statePath: string;
  artifactsRoot: string;
  mapSpecPath: string;
  mode: RunMode;
  engine: EngineName;
  planner: "model" | "manual";
  maxAccepts: number;
  dryRun: boolean;
  synthetic: boolean;
  commit: boolean;
  keepDebug: boolean;
  milestone: boolean;
  maxTasks: number;
  risk?: TaskRisk;
  concept?: string;
  objective?: string;
  ratings?: string;
  accept: boolean;
  reject: boolean;
  defer: boolean;
  deferSelected: boolean;
  diagnosis?: string;
  nextAction?: string;
  remainingDefect?: string;
  movementConfirmed: boolean;
  mockTarget?: string;
  mockReview: "accept" | "reject" | "defer";
  sharedEvidence: string[];
  sharedCause?: string;
  greenRegression?: string;
};

type ProcessResult = {
  code: number;
  stdout: string;
  stderr: string;
  wallMs: number;
};

type ModelRole = "planner" | "survey" | "writer" | "reviewer";
type CodexRole = ModelRole;
type ModelEffort = "high" | "xhigh";
type ModelUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};
type CodexUsage = ModelUsage;
type ModelCallTelemetry = {
  engine: EngineName;
  role: ModelRole;
  model: string;
  effort: ModelEffort;
  wallMs: number;
  usage: ModelUsage | null;
  costUsd?: number;
};
type CodexCallTelemetry = ModelCallTelemetry;
type TaskPerformance = {
  startedAtMs: number;
  prepareMs: number;
  beforeCaptureMs: number;
  workOrderMs: number;
  writer: ModelCallTelemetry | null;
  postWriterValidationMs: number;
  checksMs: number;
  afterCaptureMs: number;
  comparisonPackageMs: number;
  reviewer: ModelCallTelemetry | null;
  finalizeMs: number;
};

type CaptureCameraEvidence = {
  expected?: unknown;
  actual: {
    pos: { x: number; y: number; z: number };
    yawDeg: number;
    pitchDeg: number;
    fovDeg: number;
  } | null;
};

type CaptureView = {
  imagePath: string;
  camera: CaptureCameraEvidence;
  playerZoneId: string | null;
  skyOnly: boolean;
  consoleErrorCount: number;
  valid: boolean;
  errors: string[];
  width?: number;
  height?: number;
  sha256?: string;
};

type CaptureUnit = {
  id: string;
  zoneIds: string[];
  /** Keyed by view id, insertion-ordered to match the plan's ordered view list. */
  views: Record<string, CaptureView>;
};

type CaptureBatch = {
  id: string;
  unitIds: string[];
  contactSheetPath: string;
};

type CaptureManifest = {
  schemaVersion: number;
  authorityHash: string;
  protectedAuthorityHash: string;
  synthetic: boolean;
  units: CaptureUnit[];
  batches: CaptureBatch[];
  referenceBoardPath?: string;
};

type CompareResult = {
  before: { width: number; height: number; sha256: string; corrupt?: boolean };
  after: { width: number; height: number; sha256: string; corrupt?: boolean };
  meanAbsoluteDelta: number;
  changedPixelRatio: number;
  effectivelyUnchanged?: boolean;
};

type CaptureViewAudit = {
  width: number;
  height: number;
  sha256: string;
  camera: CaptureCameraEvidence["actual"];
  playerZoneId: string | null;
  skyOnly: boolean;
  consoleErrorCount: number;
  valid: boolean;
  errors: string[];
};

type ViewPairEvidence = {
  before: CaptureViewAudit;
  after: CaptureViewAudit;
  comparison: CompareResult;
  materiallyChanged: boolean;
  targetView: boolean;
};

type TaskValidationEvidence = {
  schemaVersion: 2;
  startCommit: string;
  unitId: string;
  zoneIds: string[];
  risk: TaskRisk;
  engine: EngineName;
  touchedFiles: string[];
  candidatePatchSha256: string;
  completedChecks: string[];
  protectedAuthority: { before: string; after: string; unchanged: boolean };
  targetViewIds: string[];
  /** Per-view before/after audits and comparisons, keyed by view id. */
  views: Record<string, ViewPairEvidence>;
  greenRegression?: {
    unitId: string;
    primary: { before: CaptureViewAudit; after: CaptureViewAudit };
    context: { before: CaptureViewAudit; after: CaptureViewAudit };
  };
  reviewPackage?: {
    images: Array<{ file: string; sha256: string }>;
    externalReviewerCalls: number;
  };
  valid: boolean;
  reasons: string[];
};

type TaskContext = {
  state: MapPolishState;
  spec: MapSpec;
  authorityHash: string;
  definition: ReviewUnitDefinition;
  unit: ReviewUnitState;
  objective: string;
  risk: TaskRisk;
  /** Views the task must materially improve (from defects/objective; default all). */
  targetViewIds: string[];
  startCommit: string;
  artifactDir: string;
  taskId: string;
  before: CaptureManifest;
  workOrderPath: string;
  ownershipPaths: string[];
  permittedPaths: string[];
  performance: TaskPerformance;
  /** Plan crops of the unit's zone (before at task start; after once the candidate is regenerated). */
  planImages?: { before: string; after?: string };
  siteBriefPath?: string;
  compositionRequired?: boolean;
  greenRegressionUnitId?: string;
  sharedCause?: string;
  sharedEvidence?: Array<{
    unitId: string;
    defect: string;
    primaryScreenshot: string;
  }>;
  requiresHumanTraversal?: boolean;
};

type BlindReviewPackage = {
  afterLabel: "A" | "B";
  images: string[];
  /** Human-readable image order for the reviewer prompt, from the actual list. */
  imageOrder: string[];
};

const DESIGN_DEFECT_CRITERIA = Object.freeze([
  "intent-hierarchy",
  "order-and-variation",
  "plausibility-causality",
  "scale-sequence-restraint",
] as const);
// Facade composition is decided by the grammar and its generator, not only by
// map_spec.json. Shared composition tasks may reach these; pure tasks may not.
export const FACADE_COMPOSITION_SOURCES = Object.freeze([
  "apps/client/scripts/lib/facade-layout-grammar.mjs",
  "apps/client/scripts/gen-map-runtime.mjs",
] as const);
const COMPOSITION_DEFECT_PATTERN =
  /facade|frontage|opening|door|window|bay|rhythm|symmetr|align|axis|corner|blank|bare|composition|proportion|datum/;
const DESIGN_EVIDENCE_MAX = 150;
const MAP_WIDE_EVIDENCE_MAX = 140;
const DESIGN_CONFIDENCE_MIN = 0.65;
const OBJECTIVE_MAX = 260;
const REVIEW_REASON_MAX = 220;
const CODEX_MODEL = "gpt-5.6-sol" as const;
export const CLAUDE_MODEL = "claude-fable-5" as const;
export const CLAUDE_FALLBACK_MODEL = "claude-opus-5" as const;
const MODEL_ROLE_CONFIG: Readonly<Record<ModelRole, { effort: ModelEffort; timeoutMs: number; maxBudgetUsd: number }>> = Object.freeze({
  planner: { effort: "high", timeoutMs: 300_000, maxBudgetUsd: 3 },
  survey: { effort: "high", timeoutMs: 300_000, maxBudgetUsd: 5 },
  writer: { effort: "xhigh", timeoutMs: 720_000, maxBudgetUsd: 15 },
  reviewer: { effort: "high", timeoutMs: 180_000, maxBudgetUsd: 3 },
});
const CODEX_ROLE_CONFIG = MODEL_ROLE_CONFIG;
type DesignDefectCriterion = typeof DESIGN_DEFECT_CRITERIA[number];
export type MapWideFinding = {
  unitIds: string[];
  criterion: DesignDefectCriterion;
  evidence: string;
  confidence: number;
};

type SharedSelection = {
  greenRegressionUnitId: string;
  sharedCause: string;
  evidence: Array<{
    unitId: string;
    defect: string;
    primaryScreenshot: string;
  }>;
};

const DEFAULT_IO: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

function helpText(): string {
  return `Engine-agnostic map-polish workflow (Codex CLI or Claude Code CLI)

Start here:
  pnpm map:survey
  pnpm map:next
  pnpm map:run
  pnpm map:verify -- --accept --commit   (continue from a clean local checkpoint)
  pnpm map:verify -- --reject            (or use --defer)
  pnpm map:loop -- --engine codex --max-accepts 5 --commit

Commands:
  map:survey    Capture every authored zone and classify Red/Yellow/Green.
  map:next      Print the deterministic next weak review unit with its views/coverage.
  map:run       Run one bounded task (default), or --max-tasks N with --commit.
  map:verify    Resolve a pending task, validate state, or run --milestone.
  map:coverage  Print the per-unit/per-frontage wall-coverage table (pure geometry).
  map:loop      Deterministic bounded loop: next -> planner -> run -> verify.

Common options:
  --mode real|manual|mock   Model engine, handoff package, or no-model mock (default: real)
  --engine codex|claude     Model engine for real calls (default: codex; env MAP_POLISH_ENGINE)
  --dry-run                Generate/print a plan without capture or model calls

Loop options:
  --max-accepts N          Stop map:loop after N accepted tasks (default 1)
  --planner model|manual   model: engine plans each objective; manual: stop for an operator objective

Task options:
  --objective TEXT         One bounded objective (required in real mode)
  --concept PATH           Advisory Red-unit image; use an ignored artifact or external path
  --risk pure|shared|route-adjacent  Explicit mechanism risk (required in real mode)
  --shared-evidence ID,ID  Required weak-unit evidence for shared work
  --shared-cause TEXT      One concise cause visible in both weak units
  --green-regression ID    Required Green regression unit for shared work
  --commit                 Local checkpoint commit for an accepted task; never pushes
  --max-tasks N            Mock bounded-run coverage; real mode is one scoped task at a time
  --defer-selected         Defer the selected unit after a no-model ownership/actionability preflight

Disposition and survey options:
  --accept | --reject | --defer
  --diagnosis TEXT         Concise rejected tactic or blocker
  --next-action TEXT       Materially different second-attempt hypothesis
  --remaining-defect TEXT  One sentence retained after partial acceptance
  --movement-confirmed    Assert required hands-on movement review passed
  --milestone              Run the existing expensive milestone gates
  --ratings PATH           Import a completed manual survey response

Advanced/test options:
  --state PATH  --artifacts PATH  --synthetic  --keep-debug
`;
}

function realpathSyncSafe(candidate: string): string {
  try {
    return realpathSync(candidate);
  } catch {
    return candidate;
  }
}

function parseBooleanFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function optionValue(args: string[], name: string): string | undefined {
  const direct = args.find((value) => value.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function parseMode(value: string | undefined): RunMode {
  if (value === undefined) return "real";
  if (value === "real" || value === "manual" || value === "mock") return value;
  throw new Error(`unsupported mode '${value}'`);
}

function parseRisk(value: string | undefined): TaskRisk | undefined {
  if (value === undefined) return undefined;
  if (value === "pure" || value === "shared" || value === "route-adjacent") return value;
  throw new Error(`unsupported risk '${value}'`);
}

function parsePositiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function resolveFrom(base: string, value: string): string {
  return path.resolve(base, value);
}

function shellArg(value: string): string {
  return JSON.stringify(value);
}

function forwardedCliArgs(options: CliOptions): string[] {
  const args: string[] = [];
  if (options.repoRoot !== TOOL_REPO_ROOT) args.push("--repo-root", shellArg(options.repoRoot));
  if (options.statePath !== path.join(options.repoRoot, DEFAULT_STATE_PATH)) args.push("--state", shellArg(options.statePath));
  if (options.artifactsRoot !== path.join(options.repoRoot, DEFAULT_ARTIFACTS_PATH)) args.push("--artifacts", shellArg(options.artifactsRoot));
  if (options.mode !== "real") args.push("--mode", options.mode);
  if (options.engine !== "codex") args.push("--engine", options.engine);
  return args;
}

function workflowCommand(script: "map:survey" | "map:run" | "map:verify", options: CliOptions, extra: string[] = []): string {
  const args = [...forwardedCliArgs(options), ...extra];
  return args.length > 0 ? `pnpm ${script} -- ${args.join(" ")}` : `pnpm ${script}`;
}

const VALUE_OPTIONS = new Set([
  "--repo-root", "--state", "--artifacts", "--map-spec", "--mode", "--max-tasks",
  "--risk", "--concept", "--objective", "--ratings", "--diagnosis", "--next-action",
  "--remaining-defect", "--mock-target", "--mock-review", "--shared-evidence", "--green-regression",
  "--shared-cause", "--engine", "--max-accepts", "--planner",
]);
const BOOLEAN_OPTIONS = new Set([
  "--dry-run", "--synthetic", "--commit", "--keep-debug", "--milestone",
  "--accept", "--reject", "--defer", "--defer-selected", "--movement-confirmed",
]);

function assertKnownOptions(args: readonly string[]): void {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--") continue;
    if (!token?.startsWith("--")) throw new Error(`unexpected positional argument '${token ?? ""}'`);
    const equalsIndex = token.indexOf("=");
    const name = equalsIndex < 0 ? token : token.slice(0, equalsIndex);
    const inline = equalsIndex < 0 ? undefined : token.slice(equalsIndex + 1);
    if (seen.has(name)) throw new Error(`option '${name}' may be supplied only once`);
    seen.add(name);
    if (BOOLEAN_OPTIONS.has(name)) {
      if (inline !== undefined) throw new Error(`${name} does not take a value`);
      continue;
    }
    if (!VALUE_OPTIONS.has(name)) throw new Error(`unknown option '${name}'`);
    if (inline === undefined) index += 1;
  }
}

function parseEngine(value: string | undefined): EngineName {
  const candidate = value ?? process.env.MAP_POLISH_ENGINE ?? "codex";
  if (candidate === "codex" || candidate === "claude") return candidate;
  throw new Error(`unsupported engine '${candidate}'`);
}

function parseOptions(argv: string[]): CliOptions {
  const rawCommand = argv[0];
  if (!rawCommand || rawCommand === "--help" || rawCommand === "-h") {
    throw Object.assign(new Error(helpText()), { help: true });
  }
  if (!["survey", "next", "run", "verify", "coverage", "loop"].includes(rawCommand)) {
    throw new Error(`unknown map-polish command '${rawCommand}'`);
  }
  const args = argv.slice(1);
  if (args.includes("--help") || args.includes("-h")) {
    throw Object.assign(new Error(helpText()), { help: true });
  }
  assertKnownOptions(args);
  // Realpath so symlinked roots (macOS /tmp -> /private/tmp) match the paths the
  // Vite QA server, git, and the capture adapter resolve internally.
  const repoRoot = realpathSyncSafe(path.resolve(optionValue(args, "--repo-root") ?? TOOL_REPO_ROOT));
  const statePath = resolveFrom(repoRoot, optionValue(args, "--state") ?? DEFAULT_STATE_PATH);
  const artifactsRoot = resolveFrom(repoRoot, optionValue(args, "--artifacts") ?? DEFAULT_ARTIFACTS_PATH);
  const mapSpecPath = resolveFrom(repoRoot, optionValue(args, "--map-spec") ?? MAP_SPEC_PATH);
  const dispositions = ["--accept", "--reject", "--defer"].filter((flag) => args.includes(flag));
  if (dispositions.length > 1) throw new Error("choose only one of --accept, --reject, or --defer");
  if (args.includes("--defer-selected") && rawCommand !== "run") throw new Error("--defer-selected is valid only with map:run");
  if (args.includes("--defer-selected") && dispositions.length > 0) {
    throw new Error("--defer-selected cannot be combined with a pending-task disposition");
  }
  const mockReviewRaw = optionValue(args, "--mock-review") ?? "accept";
  if (!["accept", "reject", "defer"].includes(mockReviewRaw)) throw new Error("--mock-review must be accept, reject, or defer");
  const sharedEvidence = (optionValue(args, "--shared-evidence") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const risk = parseRisk(optionValue(args, "--risk"));
  const objective = normalizeObjective(optionValue(args, "--objective"));
  const mode = parseMode(optionValue(args, "--mode"));
  const dryRun = parseBooleanFlag(args, "--dry-run");
  const synthetic = parseBooleanFlag(args, "--synthetic");
  if (synthetic && mode !== "mock" && !dryRun) {
    throw new Error("--synthetic is allowed only with --mode mock or --dry-run");
  }
  if (
    mode === "mock"
    && !dryRun
    && (
      statePath === path.join(TOOL_REPO_ROOT, DEFAULT_STATE_PATH)
      || artifactsRoot === path.join(TOOL_REPO_ROOT, DEFAULT_ARTIFACTS_PATH)
    )
  ) {
    throw new Error("mock mode requires alternate --state and --artifacts paths; authoritative workflow state cannot contain mock evidence");
  }
  const planner = optionValue(args, "--planner") ?? "model";
  if (planner !== "model" && planner !== "manual") throw new Error("--planner must be model or manual");
  return {
    command: rawCommand as CommandName,
    repoRoot,
    statePath,
    artifactsRoot,
    mapSpecPath,
    mode,
    engine: parseEngine(optionValue(args, "--engine")),
    planner,
    maxAccepts: parsePositiveInteger(optionValue(args, "--max-accepts"), 1, "--max-accepts"),
    dryRun,
    synthetic,
    commit: parseBooleanFlag(args, "--commit"),
    keepDebug: parseBooleanFlag(args, "--keep-debug"),
    milestone: parseBooleanFlag(args, "--milestone"),
    maxTasks: parsePositiveInteger(optionValue(args, "--max-tasks"), 1, "--max-tasks"),
    ...(risk ? { risk } : {}),
    ...(optionValue(args, "--concept") ? { concept: resolveFrom(repoRoot, optionValue(args, "--concept") as string) } : {}),
    ...(objective ? { objective } : {}),
    ...(optionValue(args, "--ratings") ? { ratings: resolveFrom(repoRoot, optionValue(args, "--ratings") as string) } : {}),
    accept: parseBooleanFlag(args, "--accept"),
    reject: parseBooleanFlag(args, "--reject"),
    defer: parseBooleanFlag(args, "--defer"),
    deferSelected: parseBooleanFlag(args, "--defer-selected"),
    ...(optionValue(args, "--diagnosis") ? { diagnosis: optionValue(args, "--diagnosis") as string } : {}),
    ...(optionValue(args, "--next-action") ? { nextAction: optionValue(args, "--next-action") as string } : {}),
    ...(optionValue(args, "--remaining-defect") ? { remainingDefect: optionValue(args, "--remaining-defect") as string } : {}),
    movementConfirmed: parseBooleanFlag(args, "--movement-confirmed"),
    ...(optionValue(args, "--mock-target") ? { mockTarget: optionValue(args, "--mock-target") as string } : {}),
    mockReview: mockReviewRaw as "accept" | "reject" | "defer",
    sharedEvidence,
    ...(optionValue(args, "--shared-cause") ? { sharedCause: optionValue(args, "--shared-cause") as string } : {}),
    ...(optionValue(args, "--green-regression") ? { greenRegression: optionValue(args, "--green-regression") as string } : {}),
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileSha256(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

/**
 * Windows cannot spawn .cmd shims (pnpm) directly; route them through cmd.exe
 * with the shim resolved to its absolute path (bare names can break the
 * shim's own %~dp0 resolution). Everything else spawns as-is.
 */
function spawnSpec(command: string, args: readonly string[]): {
  command: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
} {
  if (process.platform !== "win32" || !["pnpm", "npm", "npx"].includes(command)) {
    return { command, args: [...args] };
  }
  let resolved = command;
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    for (const extension of [".cmd", ".CMD", ".bat", ".exe"]) {
      const candidate = path.join(directory, `${command}${extension}`);
      try {
        realpathSync(candidate);
        resolved = candidate;
        break;
      } catch {
        // keep searching
      }
    }
    if (resolved !== command) break;
  }
  const quoted = [resolved, ...args].map((value) => `"${value}"`).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", `"${quoted}"`],
    windowsVerbatimArguments: true,
  };
}

async function runProcess(
  command: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; input?: string; timeoutMs?: number },
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const spec = spawnSpec(command, args);
    const child = spawn(spec.command, spec.args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
      ...(spec.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: ProcessResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      resolve(result);
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    }, options.timeoutMs ?? 900_000);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      reject(error);
    });
    child.on("close", (code) => finish({
      code: timedOut ? 124 : code ?? 1,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: `${Buffer.concat(stderr).toString("utf8")}${timedOut ? `\nTimed out after ${options.timeoutMs ?? 900_000}ms` : ""}`,
      wallMs: performance.now() - startedAt,
    }));
    child.stdin.end(options.input ?? "");
  });
}

async function runChecked(
  command: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; input?: string },
): Promise<ProcessResult> {
  const result = await runProcess(command, args, options);
  if (result.code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.code})\n${result.stderr || result.stdout}`);
  }
  return result;
}

/** Repo-relative state-file path in git's forward-slash form (Windows-safe). */
function workflowStateFile(options: Pick<CliOptions, "repoRoot" | "statePath">): string {
  return path.relative(options.repoRoot, options.statePath).split(path.sep).join("/");
}

function portablePath(repoRoot: string, filePath: string): string {
  const relative = path.relative(repoRoot, path.resolve(filePath));
  return relative.startsWith("..") || path.isAbsolute(relative)
    ? path.resolve(filePath)
    : relative.split(path.sep).join("/");
}

function conciseText(value: string | undefined, maxLength = 260): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length <= maxLength) return normalized;
  const prefix = normalized.slice(0, maxLength - 1);
  const boundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, boundary >= Math.floor(maxLength * 0.65) ? boundary : maxLength - 1).trimEnd()}…`;
}

export function normalizeObjective(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length > OBJECTIVE_MAX) {
    throw new Error(`--objective must be ${OBJECTIVE_MAX} characters or fewer; received ${normalized.length}`);
  }
  return normalized;
}

function boundedPrompt(prompt: string, maxWords: number, label: string): string {
  const words = prompt.trim().split(/\s+/).length;
  if (words > maxWords) throw new Error(`${label} exceeds ${maxWords} words (${words})`);
  return prompt;
}

function currentRetryAction(state: MapPolishState, unit: ReviewUnitState): string | undefined {
  return unit.lastAttemptedPass?.pass === state.pass && unit.lastAttemptedPass.attempts > 0
    ? conciseText(unit.nextAction)
    : undefined;
}

function taskObjective(state: MapPolishState, unit: ReviewUnitState, override?: string): string {
  return normalizeObjective(override)
    ?? currentRetryAction(state, unit)
    ?? `Resolve the highest-impact visible defect: ${unit.defects[0] ?? "underdeveloped visual finish"}`;
}

async function loadStateAndSpec(options: CliOptions): Promise<{
  state: MapPolishState;
  spec: MapSpec;
  authorityHash: string;
  sourceFingerprint: string;
}> {
  const [map, sourceFingerprint] = await Promise.all([
    readMapSpecFile(options.mapSpecPath),
    sourceWorktreeFingerprint(options),
  ]);
  const loaded = await exists(options.statePath)
    ? await readStateFile(options.statePath)
    : createInitialState(map.spec, map.hash);
  const authorityState = syncStateWithSpec(loaded, map.spec, map.hash);
  return {
    state: syncStateWithSourceFingerprint(authorityState, sourceFingerprint),
    spec: map.spec,
    authorityHash: map.hash,
    sourceFingerprint,
  };
}

function capturePlan(
  authorityHash: string,
  definitions: readonly ReviewUnitDefinition[],
): unknown {
  return {
    schemaVersion: 1,
    authorityHash,
    contactSheets: true,
    units: definitions,
    batches: buildSurveyBatches(definitions).map((batch, index) => ({
      id: `batch-${String(index + 1).padStart(2, "0")}`,
      unitIds: batch.map((unit) => unit.id),
    })),
  };
}

function validateCaptureManifest(value: unknown, authorityHash: string): CaptureManifest {
  if (!value || typeof value !== "object") throw new Error("capture adapter returned a non-object manifest");
  const manifest = value as Partial<CaptureManifest>;
  if (manifest.authorityHash !== authorityHash) throw new Error("capture authority hash does not match map_spec.json");
  if (typeof manifest.protectedAuthorityHash !== "string" || !manifest.protectedAuthorityHash) {
    throw new Error("capture manifest is missing protected gameplay-authority evidence");
  }
  if (!Array.isArray(manifest.units) || !Array.isArray(manifest.batches)) {
    throw new Error("capture manifest is missing units or batches");
  }
  return manifest as CaptureManifest;
}

function captureValidityReasons(
  manifest: CaptureManifest,
  expectedDefinitions: readonly ReviewUnitDefinition[],
): string[] {
  const reasons: string[] = [];
  const expected = new Map(expectedDefinitions.map((definition) => [definition.id, definition]));
  if (manifest.units.length !== expected.size) reasons.push("capture unit count does not match the plan");
  for (const [unitId, definition] of expected) {
    const unit = manifest.units.find((candidate) => candidate.id === unitId);
    if (!unit) {
      reasons.push(`capture is missing ${unitId}`);
      continue;
    }
    if (JSON.stringify([...unit.zoneIds].sort()) !== JSON.stringify([...definition.zoneIds].sort())) {
      reasons.push(`${unitId} has the wrong zone coverage`);
    }
    const expectedViewIds = definition.views.map((view) => view.id);
    const capturedViewIds = Object.keys(unit.views ?? {});
    if (JSON.stringify(capturedViewIds) !== JSON.stringify(expectedViewIds)) {
      reasons.push(`${unitId} captured views do not match the plan (${capturedViewIds.join(",")} != ${expectedViewIds.join(",")})`);
    }
    for (const viewId of expectedViewIds) {
      const view = unit.views?.[viewId];
      if (!view || view.valid !== true) reasons.push(`${unitId}/${viewId} is invalid`);
      if (!view?.imagePath || !view.sha256 || (view.width ?? 0) <= 0 || (view.height ?? 0) <= 0) {
        reasons.push(`${unitId}/${viewId} image evidence is missing or corrupt`);
      }
      if (!view?.camera?.actual) reasons.push(`${unitId}/${viewId} camera evidence is missing`);
      if (view?.skyOnly) reasons.push(`${unitId}/${viewId} is sky-only`);
      if ((view?.consoleErrorCount ?? 0) > 0) reasons.push(`${unitId}/${viewId} has runtime errors`);
      if (!view?.playerZoneId || !definition.zoneIds.includes(view.playerZoneId)) {
        reasons.push(`${unitId}/${viewId} captured the wrong review unit`);
      }
    }
  }
  const unknown = manifest.units.filter((unit) => !expected.has(unit.id)).map((unit) => unit.id);
  if (unknown.length > 0) reasons.push(`capture contains unknown units: ${unknown.join(", ")}`);
  return [...new Set(reasons)];
}

async function captureFileIntegrityReasons(manifest: CaptureManifest): Promise<string[]> {
  const reasons: string[] = [];
  for (const unit of manifest.units) {
    for (const [viewId, view] of Object.entries(unit.views)) {
      try {
        const hash = createHash("sha256").update(await readFile(view.imagePath)).digest("hex");
        if (hash !== view.sha256) reasons.push(`${unit.id}/${viewId} evidence changed after capture`);
      } catch {
        reasons.push(`${unit.id}/${viewId} evidence is missing after capture`);
      }
    }
  }
  return reasons;
}

async function invokeCapture(
  options: CliOptions,
  plan: unknown,
  outputDir: string,
  syntheticVariant?: string,
): Promise<CaptureManifest> {
  await mkdir(outputDir, { recursive: true });
  const planPath = path.join(outputDir, "capture-plan.json");
  await writeJsonAtomic(planPath, plan);
  const args = [CAPTURE_ADAPTER, "capture", "--plan", planPath, "--output", outputDir, "--repo-root", options.repoRoot];
  if (options.synthetic) args.push("--synthetic", syntheticVariant ?? "baseline");
  const result = await runChecked(process.execPath, args, { cwd: options.repoRoot });
  const manifestPath = path.join(outputDir, "capture-result.json");
  const raw = await readFile(manifestPath, "utf8").catch(() => result.stdout);
  return validateCaptureManifest(JSON.parse(raw) as unknown, (plan as { authorityHash: string }).authorityHash);
}

/**
 * Design-time evidence: a plan crop of the unit's zone from the compiled layout
 * reference (zones, massing, facade modules, dressing). Returns null when the
 * SVG is unavailable (mock/synthetic fixtures) so evidence degrades explicitly
 * rather than blocking the task.
 */
async function renderPlanCrop(
  options: CliOptions,
  spec: MapSpec,
  definition: ReviewUnitDefinition,
  outPath: string,
  label: string,
  svgOverride?: string,
): Promise<string | null> {
  if (options.mode === "mock" || options.synthetic) return null;
  const svgPath = svgOverride ?? path.join(options.repoRoot, LAYOUT_REFERENCE_SVG);
  if (!(await exists(svgPath))) return null;
  const zone = spec.zones.find((entry) => entry.id === definition.zoneIds[0]);
  const boundary = (spec.global_dimensions as { playable_boundary?: { w?: number; h?: number } } | undefined)?.playable_boundary;
  if (!zone || typeof boundary?.w !== "number" || typeof boundary?.h !== "number") return null;
  const result = await runProcess(process.execPath, [
    PLAN_CROP_ADAPTER,
    "--svg", svgPath,
    "--zone-rect", `${zone.rect.x},${zone.rect.y},${zone.rect.w},${zone.rect.h}`,
    "--boundary", `${boundary.w},${boundary.h}`,
    "--out", outPath,
    "--label", label,
  ], { cwd: options.repoRoot, timeoutMs: 60_000 });
  if (result.code !== 0) return null;
  return (await exists(outPath)) ? outPath : null;
}

async function invokeCompare(options: CliOptions, before: string, after: string): Promise<CompareResult> {
  const result = await runChecked(
    process.execPath,
    [CAPTURE_ADAPTER, "compare", "--before", before, "--after", after],
    { cwd: options.repoRoot },
  );
  return JSON.parse(result.stdout) as CompareResult;
}

function surveySchema(viewIds: readonly string[] = []): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["ratings"],
    properties: {
      ratings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["unitId", "rating", "confidence", "defects"],
          properties: {
            unitId: { type: "string" },
            rating: { type: "string", enum: ["red", "yellow", "green"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            defects: {
              type: "array",
              maxItems: 2,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["criterion", "evidence"],
                properties: {
                  criterion: { type: "string", enum: DESIGN_DEFECT_CRITERIA },
                  evidence: { type: "string", minLength: 8, maxLength: DESIGN_EVIDENCE_MAX },
                  // Union across the batch's units; per-unit membership is
                  // enforced by the parser.
                  ...(viewIds.length > 0 ? { viewId: { type: "string", enum: [...viewIds] } } : {}),
                },
              },
            },
          },
        },
      },
    },
  };
}

export function mapWideSurveySchema(): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["findings"],
    properties: {
      findings: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["unitIds", "criterion", "evidence", "confidence"],
          properties: {
            unitIds: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
            criterion: { type: "string", enum: DESIGN_DEFECT_CRITERIA },
            evidence: { type: "string", minLength: 8, maxLength: MAP_WIDE_EVIDENCE_MAX },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
        },
      },
    },
  };
}

function reviewerSchema(): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "preferred", "designPreferred", "objectiveMetBy", "blockingDefectIn", "compositionLogic", "confidence", "reason",
    ],
    properties: {
      preferred: { type: "string", enum: ["A", "B", "tie"] },
      designPreferred: { type: "string", enum: ["A", "B", "tie"] },
      objectiveMetBy: { type: "string", enum: ["A", "B", "both", "neither"] },
      blockingDefectIn: { type: "string", enum: ["A", "B", "both", "neither"] },
      // Absolute bar, not relative: does the preferred version's placement of
      // openings and elements follow a legible logic (axis, symmetry, rhythm,
      // corner treatment, alignment reference, or a justified exception)?
      // "better than blank" with arbitrary placement is not an accept.
      compositionLogic: { type: "string", enum: ["legible", "arbitrary", "unclear"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reason: { type: "string", minLength: 8, maxLength: REVIEW_REASON_MAX },
    },
  };
}

function writerSchema(): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "designRationale"],
    properties: {
      summary: { type: "string" },
      // The "does this make sense" question, answered and retained: purpose,
      // axis/entrance logic, why each opening sits where it does, and the cause
      // of any exception. Read by the human owner, never by the blind reviewer.
      designRationale: { type: "string", minLength: 20, maxLength: 600 },
    },
  };
}

export function codexInvocationArgs(options: {
  role: CodexRole;
  repoRoot: string;
  workingDirectory: string;
  images: readonly string[];
  schemaPath: string;
  resultPath: string;
}): string[] {
  const writer = options.role === "writer";
  const config = CODEX_ROLE_CONFIG[options.role];
  const imageArgs = options.images.flatMap((image) => ["-i", image]);
  const explicitConfig = [
    "--ignore-user-config",
    "-m",
    CODEX_MODEL,
    "-c",
    `model_reasoning_effort="${config.effort}"`,
    "--json",
  ];
  return writer
    ? [
        "exec",
        ...explicitConfig,
        "--ephemeral",
        "--color",
        "never",
        "--approve-for-me",
        "-C",
        options.repoRoot,
        ...imageArgs,
        "--output-schema",
        options.schemaPath,
        "-o",
        options.resultPath,
        "-",
      ]
    : [
        "--ask-for-approval",
        "never",
        "exec",
        ...explicitConfig,
        "--ephemeral",
        "--color",
        "never",
        "-s",
        "read-only",
        "--skip-git-repo-check",
        "-C",
        options.workingDirectory,
        ...imageArgs,
        "--output-schema",
        options.schemaPath,
        "-o",
        options.resultPath,
        "-",
      ];
}

export function parseCodexUsage(jsonl: string): CodexUsage | null {
  let usage: Record<string, unknown> | null = null;
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const candidate = event.usage
        ?? (event.turn && typeof event.turn === "object" ? (event.turn as Record<string, unknown>).usage : null)
        ?? (event.response && typeof event.response === "object" ? (event.response as Record<string, unknown>).usage : null);
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        usage = candidate as Record<string, unknown>;
      }
    } catch {
      // Ignore non-event diagnostic lines; the result file remains authoritative.
    }
  }
  if (!usage) return null;
  const token = (...keys: string[]): number => {
    for (const key of keys) {
      const value = usage?.[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
    }
    return 0;
  };
  const inputTokens = token("input_tokens", "inputTokens");
  const outputTokens = token("output_tokens", "outputTokens");
  return {
    inputTokens,
    cachedInputTokens: token("cached_input_tokens", "cachedInputTokens"),
    cacheWriteInputTokens: token("cache_write_input_tokens", "cacheWriteInputTokens"),
    outputTokens,
    reasoningOutputTokens: token("reasoning_output_tokens", "reasoningOutputTokens"),
    totalTokens: token("total_tokens", "totalTokens") || inputTokens + outputTokens,
  };
}

function boundedDiagnostic(value: string, maxLength = 700): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : `…${normalized.slice(-(maxLength - 1))}`;
}

function codexCallTelemetry(role: ModelRole, wallMs: number, stdout: string): ModelCallTelemetry {
  return {
    engine: "codex",
    role,
    model: CODEX_MODEL,
    effort: MODEL_ROLE_CONFIG[role].effort,
    wallMs: Math.round(wallMs),
    usage: parseCodexUsage(stdout),
  };
}

/**
 * Claude Code CLI headless invocation. There is no image flag: image paths go
 * into the prompt and the isolated session reads them with its Read tool.
 * Survey/reviewer/planner run in a fresh temp dir containing only their
 * images/text with Read-only tools and no repo path; the writer runs with
 * cwd = repo and edit tools but no Bash (the workflow runs generators and
 * checks itself). Isolation is by directory + tool allowlist, not a hard
 * sandbox.
 */
export function claudeInvocationArgs(options: {
  role: ModelRole;
  /** Serialized JSON Schema; the CLI takes the schema inline, not a file path. */
  schemaJson: string;
  model?: string;
}): string[] {
  const writer = options.role === "writer";
  const config = MODEL_ROLE_CONFIG[options.role];
  return [
    "-p",
    "--bare",
    "--output-format",
    "json",
    "--json-schema",
    options.schemaJson,
    "--model",
    options.model ?? CLAUDE_MODEL,
    "--effort",
    config.effort,
    "--max-budget-usd",
    String(config.maxBudgetUsd),
    "--permission-mode",
    writer ? "acceptEdits" : "manual",
    "--allowedTools",
    writer ? "Read,Edit,Write,Glob,Grep" : "Read",
    // --allowedTools only pre-approves; it does not deny. Bash must be denied
    // explicitly: the workflow runs generators and checks itself, and paging a
    // 4k-line spec through `sed` burns the writer's whole role timeout.
    "--disallowedTools",
    writer ? "Bash,WebSearch,WebFetch,Task,Agent" : "Bash,Edit,Write,WebSearch,WebFetch,Task,Agent",
  ];
}

type ClaudeEnvelope = {
  structuredOutput: unknown;
  telemetry: { usage: ModelUsage | null; costUsd?: number };
  isError: boolean;
  resultText: string;
};

export function parseClaudeEnvelope(stdout: string): ClaudeEnvelope {
  const raw = JSON.parse(stdout) as Record<string, unknown>;
  const usageRecord = isPlainRecord(raw.usage) ? raw.usage : null;
  const token = (key: string): number => {
    const value = usageRecord?.[key];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
  };
  const usage: ModelUsage | null = usageRecord
    ? {
        inputTokens: token("input_tokens"),
        cachedInputTokens: token("cache_read_input_tokens"),
        cacheWriteInputTokens: token("cache_creation_input_tokens"),
        outputTokens: token("output_tokens"),
        reasoningOutputTokens: 0,
        totalTokens: token("input_tokens") + token("cache_read_input_tokens")
          + token("cache_creation_input_tokens") + token("output_tokens"),
      }
    : null;
  return {
    structuredOutput: raw.structured_output,
    telemetry: {
      usage,
      ...(typeof raw.total_cost_usd === "number" && Number.isFinite(raw.total_cost_usd)
        ? { costUsd: raw.total_cost_usd }
        : {}),
    },
    isError: raw.is_error === true,
    resultText: typeof raw.result === "string" ? raw.result : "",
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function claudeImagePreamble(images: readonly string[]): string {
  if (images.length === 0) return "";
  const lines = images.map((image, index) => `Image ${index + 1}: ${image}`);
  return `Read the following image files with your Read tool before answering; image numbering in the instructions refers to this list.\n${lines.join("\n")}\n\n`;
}

async function invokeClaudeJson(options: {
  repoRoot: string;
  prompt: string;
  images: string[];
  schema: unknown;
  resultPath: string;
  role: ModelRole;
}): Promise<{ value: unknown; telemetry: ModelCallTelemetry }> {
  const schemaPath = `${options.resultPath}.schema.json`;
  await writeJsonAtomic(schemaPath, options.schema);
  await mkdir(path.dirname(options.resultPath), { recursive: true });
  const claudeBin = process.env.CLAUDE_BIN ?? "claude";
  const writer = options.role === "writer";
  const isolatedDirectory = writer
    ? null
    : await mkdtemp(path.join(os.tmpdir(), "clawdstrike-map-claude-"));
  const config = MODEL_ROLE_CONFIG[options.role];
  const telemetryFor = (wallMs: number, envelope?: ClaudeEnvelope): ModelCallTelemetry => ({
    engine: "claude",
    role: options.role,
    model: CLAUDE_MODEL,
    effort: config.effort,
    wallMs: Math.round(wallMs),
    usage: envelope?.telemetry.usage ?? null,
    ...(envelope?.telemetry.costUsd !== undefined ? { costUsd: envelope.telemetry.costUsd } : {}),
  });
  try {
    let images = options.images;
    if (isolatedDirectory) {
      // Blindness: the isolated roles see only their copied images, never the
      // repo. Copy preserves the base name; disambiguate collisions by index.
      const copied: string[] = [];
      for (const [index, image] of options.images.entries()) {
        const destination = path.join(
          isolatedDirectory,
          `${String(index + 1).padStart(2, "0")}-${path.basename(image)}`,
        );
        await copyFile(image, destination);
        copied.push(destination);
      }
      images = copied;
    }
    const prompt = `${claudeImagePreamble(images)}${options.prompt}`;
    const args = claudeInvocationArgs({ role: options.role, schemaJson: JSON.stringify(options.schema) });
    let result: ProcessResult;
    const callStartedAt = performance.now();
    try {
      result = await runProcess(claudeBin, args, {
        cwd: isolatedDirectory ?? options.repoRoot,
        input: prompt,
        timeoutMs: config.timeoutMs,
      });
    } catch (error) {
      throw new CodexInvocationError(
        `Claude Code CLI is unavailable: ${error instanceof Error ? error.message : String(error)}`,
        telemetryFor(performance.now() - callStartedAt),
      );
    }
    if (result.code !== 0) {
      throw new CodexInvocationError(
        `Claude Code CLI failed (${result.code}): ${boundedDiagnostic(result.stderr || result.stdout || "no diagnostic")}`,
        telemetryFor(result.wallMs),
      );
    }
    let envelope: ClaudeEnvelope;
    try {
      envelope = parseClaudeEnvelope(result.stdout);
    } catch (error) {
      throw new CodexInvocationError(
        `Claude Code result envelope was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        telemetryFor(result.wallMs),
      );
    }
    const telemetry = telemetryFor(result.wallMs, envelope);
    if (envelope.isError) {
      throw new CodexInvocationError(
        `Claude Code call errored: ${boundedDiagnostic(envelope.resultText || "no diagnostic")}`,
        telemetry,
      );
    }
    if (envelope.structuredOutput === undefined) {
      throw new CodexInvocationError("Claude Code call returned no structured output", telemetry);
    }
    // The CLI validated against --json-schema; retain the result file so the
    // shared retry/parse path treats both engines identically.
    await writeJsonAtomic(options.resultPath, envelope.structuredOutput);
    return { value: envelope.structuredOutput, telemetry };
  } finally {
    if (isolatedDirectory) await rm(isolatedDirectory, { recursive: true, force: true });
  }
}

async function invokeEngineJson(
  engine: EngineName,
  options: {
    repoRoot: string;
    prompt: string;
    images: string[];
    schema: unknown;
    resultPath: string;
    role: ModelRole;
  },
): Promise<{ value: unknown; telemetry: ModelCallTelemetry }> {
  return engine === "claude" ? invokeClaudeJson(options) : invokeCodexJson(options);
}

async function invokeCodexJson(options: {
  repoRoot: string;
  prompt: string;
  images: string[];
  schema: unknown;
  resultPath: string;
  role: CodexRole;
}): Promise<{ value: unknown; telemetry: CodexCallTelemetry }> {
  const schemaPath = `${options.resultPath}.schema.json`;
  await writeJsonAtomic(schemaPath, options.schema);
  await mkdir(path.dirname(options.resultPath), { recursive: true });
  const codexBin = process.env.CODEX_BIN ?? "codex";
  const writer = options.role === "writer";
  const isolatedDirectory = writer
    ? null
    : await mkdtemp(path.join(os.tmpdir(), "clawdstrike-map-review-"));
  const args = codexInvocationArgs({
    role: options.role,
    repoRoot: options.repoRoot,
    workingDirectory: isolatedDirectory ?? options.repoRoot,
    images: options.images,
    schemaPath,
    resultPath: options.resultPath,
  });
  try {
    let result: ProcessResult;
    const callStartedAt = performance.now();
    try {
      result = await runProcess(codexBin, args, {
        cwd: isolatedDirectory ?? options.repoRoot,
        input: options.prompt,
        timeoutMs: CODEX_ROLE_CONFIG[options.role].timeoutMs,
      });
    } catch (error) {
      throw new CodexInvocationError(
        `Codex CLI is unavailable: ${error instanceof Error ? error.message : String(error)}`,
        codexCallTelemetry(options.role, performance.now() - callStartedAt, ""),
      );
    }
    const telemetry = codexCallTelemetry(options.role, result.wallMs, result.stdout);
    if (result.code !== 0) {
      throw new CodexInvocationError(
        `Codex CLI failed (${result.code}): ${boundedDiagnostic(result.stderr || result.stdout || "no diagnostic")}`,
        telemetry,
      );
    }
    if (!(await exists(options.resultPath))) {
      throw new CodexInvocationError("Codex CLI exited successfully without a result file", telemetry);
    }
    try {
      return {
        value: JSON.parse(await readFile(options.resultPath, "utf8")) as unknown,
        telemetry,
      };
    } catch (error) {
      throw new CodexInvocationError(
        `Codex result was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        telemetry,
      );
    }
  } finally {
    if (isolatedDirectory) await rm(isolatedDirectory, { recursive: true, force: true });
  }
}

/** Defect strings carry an optional evidence-view tag: `[criterion] [view:<id>] evidence`. */
export function defectViewIds(defects: readonly string[]): string[] {
  return [...new Set(defects
    .map((defect) => /\[view:([A-Za-z0-9:._-]+)\]/.exec(defect)?.[1])
    .filter((viewId): viewId is string => Boolean(viewId)))];
}

export function parseSurveyPayload(
  value: unknown,
  expectedIds: readonly string[],
  viewIdsByUnit: ReadonlyMap<string, readonly string[]> = new Map(),
): SurveyRating[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { ratings?: unknown }).ratings)) {
    throw new Error("survey response must contain ratings[]");
  }
  const raw = (value as { ratings: unknown[] }).ratings;
  const ratings = raw.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("survey rating must be an object");
    const candidate = entry as {
      unitId?: unknown;
      rating?: unknown;
      confidence?: unknown;
      defects?: unknown;
    };
    if (typeof candidate.unitId !== "string" || !["red", "yellow", "green"].includes(String(candidate.rating))) {
      throw new Error("survey rating has invalid unitId or category");
    }
    const allowedViewIds = viewIdsByUnit.get(candidate.unitId);
    if (
      typeof candidate.confidence !== "number"
      || !Number.isFinite(candidate.confidence)
      || candidate.confidence < 0
      || candidate.confidence > 1
      || !Array.isArray(candidate.defects)
      || candidate.defects.length > 2
      || candidate.defects.some((defect) => {
        if (!defect || typeof defect !== "object") return true;
        const item = defect as { criterion?: unknown; evidence?: unknown; viewId?: unknown };
        if (item.viewId !== undefined) {
          if (typeof item.viewId !== "string") return true;
          if (allowedViewIds && !allowedViewIds.includes(item.viewId)) return true;
        }
        return !DESIGN_DEFECT_CRITERIA.includes(item.criterion as DesignDefectCriterion)
          || typeof item.evidence !== "string"
          || item.evidence.trim().length < 8
          || item.evidence.trim().length > DESIGN_EVIDENCE_MAX
          || !/[.!?]$/.test(item.evidence.trim())
          || /^(?:needs? (?:more )?detail|underdeveloped|looks bad)[.!]?$/i.test(item.evidence.trim());
      })
      || (candidate.rating !== "green" && candidate.defects.length === 0)
    ) {
      throw new Error(`survey rating '${candidate.unitId}' has invalid confidence or defects`);
    }
    return {
      unitId: candidate.unitId,
      rating: candidate.rating as SurveyRating["rating"],
      confidence: candidate.confidence,
      defects: candidate.defects.map((defect) => {
        const item = defect as { criterion: DesignDefectCriterion; evidence: string; viewId?: string };
        return `[${item.criterion}]${item.viewId ? ` [view:${item.viewId}]` : ""} ${item.evidence.trim()}`;
      }),
    };
  });
  const actualIds = ratings.map((rating) => rating.unitId).sort();
  const expected = [...expectedIds].sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expected)) {
    throw new Error(`survey batch coverage mismatch | expected=${expected.join(",")} actual=${actualIds.join(",")}`);
  }
  return ratings;
}

export function surveyPrompt(batch: CaptureBatch): string {
  return boundedPrompt(`Image 1 is the labeled map-survey contact sheet; image 2 is the approved reference board. Calibrate absolute finish and visual coherence against image 2. Every unit in image 1 shows a labeled set of player-eye views: primary and reverse/context along the traversal direction, elev:<FRONTAGE or face> square-on wall elevations (long walls split into numbered segments), cross-a/cross-b perpendicular views in squarish spaces, and an upward upper view where tall walls stand close.

Red = unacceptable, broken, blockout-like, or dramatically below the map. Yellow = coherent but visibly underdeveloped or has an important defect. Green = acceptable for now.

Target a bright, readable, shipped-quality Middle Eastern bazaar with complete assemblies, grounded detail, clear composition, and believable materials.

Design lens: ${DESIGN_REVIEW_LENS.join(" ")} Symmetry and variation are not quotas: symmetry should reveal designed order; asymmetry should reveal function, site, history, repair, or use. Randomness without a cause is noise.

Return exactly one rating for each of: ${batch.unitIds.join(", ")}. Include confidence from 0 to 1. Red/Yellow require one or two defects, highest impact first, each as {criterion, evidence, viewId?}. Criterion must be one of ${DESIGN_DEFECT_CRITERIA.join(", ")}; evidence must be one complete visible-evidence sentence ending in punctuation, preferably 120 characters or fewer, rather than saying only “needs detail”; viewId, when the defect is visible in one labeled view, is that view's exact label so the fix can target the wall it names. Green may have none. Do not propose or perform implementation work.`, 340, "survey prompt");
}

function manifestViewIdsByUnit(manifest: CaptureManifest): Map<string, string[]> {
  return new Map(manifest.units.map((unit) => [unit.id, Object.keys(unit.views)]));
}

async function classifySurveyReal(
  options: CliOptions,
  manifest: CaptureManifest,
  surveyDir: string,
): Promise<SurveyRating[]> {
  const ratings: SurveyRating[] = [];
  const viewIdsByUnit = manifestViewIdsByUnit(manifest);
  for (const batch of manifest.batches) {
    const batchViewIds = [...new Set(batch.unitIds.flatMap((unitId) => viewIdsByUnit.get(unitId) ?? []))].sort();
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const resultPath = path.join(surveyDir, `${batch.id}-ratings-${attempt}.json`);
        const value = await exists(resultPath)
          ? JSON.parse(await readFile(resultPath, "utf8")) as unknown
          : (await invokeEngineJson(options.engine, {
              repoRoot: options.repoRoot,
              prompt: surveyPrompt(batch),
              images: [batch.contactSheetPath, ...(manifest.referenceBoardPath ? [manifest.referenceBoardPath] : [])],
              schema: surveySchema(batchViewIds),
              resultPath,
              role: "survey",
            })).value;
        ratings.push(...parseSurveyPayload(value, batch.unitIds, viewIdsByUnit));
        lastError = null;
        break;
      } catch (error) {
        const malformed = error instanceof SyntaxError
          || (error instanceof Error && /survey (?:response|rating|batch coverage)/.test(error.message));
        if (!malformed) throw error;
        lastError = error;
      }
    }
    if (lastError) throw lastError;
  }
  return ratings;
}

function mapWideSurveyPrompt(unitIds: readonly string[]): string {
  return boundedPrompt(`Review these contact sheets as one map, calibrated against the labeled reference board. Use ${DESIGN_REVIEW_LENS.join(" ")}

Return at most three strong map-scale coherence findings, or none. Consider shared architectural grammar, district identity, route sequence and landmarks, massing/silhouette, datum and facade rhythm, repetition with bounded causal variation, density/value rhythm, transitions, quiet visual rest, and whether reverse views expose a stage set. Randomness without functional, structural, climatic, or historical cause is noise. These are art-direction observations, not scores.

Return one JSON object with a findings array. For each finding include affected unitIds chosen only from: ${unitIds.join(", ")}; one design criterion; one complete visible-evidence sentence ending in punctuation and preferably 120 characters or fewer; and confidence. In manual mode copy that array into ratings-template.json; use [] when no strong finding is supported. Do not propose implementation.`, 300, "map-wide survey prompt");
}

export function parseMapWideFindings(value: unknown, expectedIds: readonly string[]): MapWideFinding[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { findings?: unknown }).findings)) {
    throw new Error("map-wide survey response must contain findings[]");
  }
  const expected = new Set(expectedIds);
  const findings = (value as { findings: unknown[] }).findings;
  if (findings.length > 3) throw new Error("map-wide survey may return at most three findings");
  return findings.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("map-wide survey finding must be an object");
    const finding = raw as Partial<MapWideFinding>;
    if (
      !Array.isArray(finding.unitIds)
      || finding.unitIds.length < 1
      || finding.unitIds.length > 6
      || finding.unitIds.some((id) => typeof id !== "string" || !expected.has(id))
      || new Set(finding.unitIds).size !== finding.unitIds.length
      || !DESIGN_DEFECT_CRITERIA.includes(finding.criterion as DesignDefectCriterion)
      || typeof finding.evidence !== "string"
      || finding.evidence.trim().length < 8
      || finding.evidence.trim().length > MAP_WIDE_EVIDENCE_MAX
      || !/[.!?]$/.test(finding.evidence.trim())
      || typeof finding.confidence !== "number"
      || finding.confidence < 0
      || finding.confidence > 1
    ) throw new Error("map-wide survey finding is malformed");
    return {
      unitIds: finding.unitIds as string[],
      criterion: finding.criterion as DesignDefectCriterion,
      evidence: finding.evidence.trim(),
      confidence: finding.confidence,
    };
  });
}

async function classifyMapWideCoherenceReal(
  options: CliOptions,
  manifest: CaptureManifest,
  surveyDir: string,
): Promise<MapWideFinding[]> {
  const unitIds = manifest.units.map((unit) => unit.id);
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const resultPath = path.join(surveyDir, `map-wide-findings-${attempt}.json`);
      const value = await exists(resultPath)
        ? JSON.parse(await readFile(resultPath, "utf8")) as unknown
        : (await invokeEngineJson(options.engine, {
            repoRoot: options.repoRoot,
            prompt: mapWideSurveyPrompt(unitIds),
            images: [
              ...manifest.batches.map((batch) => batch.contactSheetPath),
              ...(manifest.referenceBoardPath ? [manifest.referenceBoardPath] : []),
            ],
            schema: mapWideSurveySchema(),
            resultPath,
            role: "survey",
          })).value;
      return parseMapWideFindings(value, unitIds);
    } catch (error) {
      const malformed = error instanceof SyntaxError
        || (error instanceof Error && /map-wide survey/.test(error.message));
      if (!malformed) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("map-wide survey classification failed");
}

export function mergeMapWideFindings(
  ratings: readonly SurveyRating[],
  findings: readonly MapWideFinding[],
): SurveyRating[] {
  const byId = new Map(ratings.map((rating) => [rating.unitId, { ...rating, defects: [...rating.defects] }]));
  for (const finding of findings.filter((candidate) => candidate.confidence >= DESIGN_CONFIDENCE_MIN)) {
    const defect = `[${finding.criterion}] Map-wide: ${finding.evidence}`;
    const affected = finding.unitIds
      .map((unitId) => byId.get(unitId))
      .filter((rating): rating is SurveyRating => Boolean(rating));
    const alreadyWeak = affected.filter((rating) => rating.rating !== "green");
    const targets = alreadyWeak.length > 0 ? alreadyWeak : affected.slice(0, 1);
    for (const rating of targets) {
      if (rating.rating === "green") {
        rating.rating = "yellow";
        rating.confidence = finding.confidence;
      }
      rating.defects = [...rating.defects.filter((entry) => entry !== defect), defect].slice(0, 2);
    }
  }
  return ratings.map((rating) => byId.get(rating.unitId) as SurveyRating);
}

export function parseManualSurveyPayload(
  value: unknown,
  expectedIds: readonly string[],
  viewIdsByUnit: ReadonlyMap<string, readonly string[]> = new Map(),
): SurveyRating[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { findings?: unknown }).findings)) {
    throw new Error("manual survey response must contain findings[]; use an empty array when no map-wide finding is supported");
  }
  return mergeMapWideFindings(
    parseSurveyPayload(value, expectedIds, viewIdsByUnit),
    parseMapWideFindings({ findings: (value as { findings: unknown[] }).findings }, expectedIds),
  );
}

async function writeManualSurveyPackages(manifest: CaptureManifest, surveyDir: string): Promise<void> {
  for (const batch of manifest.batches) {
    await writeFile(path.join(surveyDir, `${batch.id}-prompt.txt`), `${surveyPrompt(batch)}\n`, "utf8");
  }
  await writeFile(
    path.join(surveyDir, "map-wide-prompt.txt"),
    `${mapWideSurveyPrompt(manifest.units.map((unit) => unit.id))}\n`,
    "utf8",
  );
  await writeJsonAtomic(path.join(surveyDir, "ratings-template.json"), {
    ratings: manifest.units.map((unit) => ({
      unitId: unit.id,
      rating: null,
      confidence: null,
      defects: [{ criterion: null, evidence: null }],
    })),
    findings: null,
  });
}

function baselineFileName(viewId: string): string {
  return `${viewId.replace(/[^A-Za-z0-9_-]+/g, "_")}.png`;
}

async function promoteSurveyEvidence(
  options: CliOptions,
  manifest: CaptureManifest,
): Promise<Map<string, UnitEvidence>> {
  const result = new Map<string, UnitEvidence>();
  for (const unit of manifest.units) {
    const baselineDir = path.join(options.artifactsRoot, "baselines", unit.id);
    await rm(baselineDir, { recursive: true, force: true });
    await mkdir(baselineDir, { recursive: true });
    const evidence: UnitEvidence = { primary: null, context: null };
    for (const [viewId, view] of Object.entries(unit.views)) {
      const destination = path.join(baselineDir, baselineFileName(viewId));
      await copyFile(view.imagePath, destination);
      evidence[viewId] = portablePath(options.repoRoot, destination);
    }
    result.set(unit.id, evidence);
  }
  return result;
}

export async function sourceWorktreeFingerprint(options: Pick<CliOptions, "repoRoot" | "statePath">): Promise<string> {
  const stateFile = workflowStateFile(options);
  const index = await runChecked("git", ["ls-files", "-s", "-z"], { cwd: options.repoRoot });
  const entries = new Map<string, { mode: string; objectId: string }>();
  for (const raw of index.stdout.split("\0").filter(Boolean)) {
    const match = /^(\d+) ([0-9a-f]+) (\d+)\t([\s\S]+)$/.exec(raw);
    if (!match) throw new Error(`cannot fingerprint malformed Git index entry '${raw}'`);
    const mode = match[1] as string;
    const objectId = match[2] as string;
    const stage = match[3] as string;
    const file = match[4] as string;
    if (!mode || !objectId || !stage || !file) {
      throw new Error(`cannot fingerprint incomplete Git index entry '${raw}'`);
    }
    if (stage !== "0") throw new Error(`cannot fingerprint unmerged Git index entry '${file}'`);
    if (file !== stateFile) entries.set(file, { mode, objectId });
  }

  const touched = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== stateFile);
  for (const file of touched) {
    const absolute = path.join(options.repoRoot, file);
    const details = await lstat(absolute).catch(() => null);
    if (!details) {
      entries.delete(file);
      continue;
    }
    if (!details.isFile() && !details.isSymbolicLink()) {
      throw new Error(`cannot fingerprint non-file worktree entry '${file}'`);
    }
    const objectId = (await runChecked(
      "git",
      ["hash-object", `--path=${file}`, "--", file],
      { cwd: options.repoRoot },
    )).stdout.trim();
    if (!/^[0-9a-f]+$/.test(objectId)) throw new Error(`cannot fingerprint worktree file '${file}'`);
    const mode = details.isSymbolicLink() ? "120000" : (details.mode & 0o111) !== 0 ? "100755" : "100644";
    entries.set(file, { mode, objectId });
  }
  const hash = createHash("sha256");
  for (const [file, entry] of [...entries].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(`${entry.mode}\0${entry.objectId}\0${file}\0`);
  }
  return hash.digest("hex");
}

async function retainedSurveyManifest(
  surveyDir: string,
  definitions: readonly ReviewUnitDefinition[],
  authorityHash: string,
  sourceFingerprint: string,
): Promise<CaptureManifest | null> {
  try {
    const context = JSON.parse(await readFile(path.join(surveyDir, "survey-source.json"), "utf8")) as {
      authorityHash?: unknown;
      sourceFingerprint?: unknown;
      contactSheetHashes?: unknown;
      referenceBoardHash?: unknown;
    };
    if (context.authorityHash !== authorityHash || context.sourceFingerprint !== sourceFingerprint) return null;
    const manifest = validateCaptureManifest(
      JSON.parse(await readFile(path.join(surveyDir, "capture-result.json"), "utf8")) as unknown,
      authorityHash,
    );
    if (captureValidityReasons(manifest, definitions).length > 0) return null;
    if ((await captureFileIntegrityReasons(manifest)).length > 0) return null;
    for (const unit of manifest.units) {
      for (const view of Object.values(unit.views)) {
        if (!(await exists(view.imagePath))) return null;
      }
    }
    if (!context.contactSheetHashes || typeof context.contactSheetHashes !== "object") return null;
    const sheetHashes = context.contactSheetHashes as Record<string, unknown>;
    for (const batch of manifest.batches) {
      if (!batch.contactSheetPath || !(await exists(batch.contactSheetPath))) return null;
      const hash = createHash("sha256").update(await readFile(batch.contactSheetPath)).digest("hex");
      if (sheetHashes[batch.id] !== hash) return null;
    }
    if (!manifest.referenceBoardPath || !(await exists(manifest.referenceBoardPath))) return null;
    const referenceBoardHash = createHash("sha256").update(await readFile(manifest.referenceBoardPath)).digest("hex");
    if (context.referenceBoardHash !== referenceBoardHash) return null;
    return manifest;
  } catch {
    return null;
  }
}

async function survey(options: CliOptions, io: CliIo): Promise<number> {
  if (options.mode === "real" && !options.dryRun) {
    await assertAutomaticWorktree(options.repoRoot, [workflowStateFile(options)]);
  }
  const loaded = await loadStateAndSpec(options);
  if (loaded.state.activeTask) {
    throw new Error(`resolve active task '${loaded.state.activeTask.id}' before surveying`);
  }
  const definitions = deriveReviewUnits(loaded.spec);
  // Coverage is a survey gate (DEC-024): fail closed before any capture so an
  // unseen wall can never become an unrated-but-unacceptable wall.
  const coverageReport = assertSurveyCoverage(loaded.spec, definitions);
  const plan = capturePlan(loaded.authorityHash, definitions);
  const surveyDir = path.join(options.artifactsRoot, "survey");
  if (options.dryRun) {
    const dryRunDir = path.join(options.artifactsRoot, "dry-run");
    await rm(dryRunDir, { recursive: true, force: true });
    await mkdir(dryRunDir, { recursive: true });
    const planPath = path.join(dryRunDir, "survey-plan.json");
    await writeJsonAtomic(planPath, plan);
    io.stdout(`Survey dry run: ${definitions.length} units in ${buildSurveyBatches(definitions).length} batches; plan=${planPath}\n`);
    return 0;
  }
  const sourceFingerprint = await sourceWorktreeFingerprint(options);
  const surveyContext = {
    engine: options.mode === "real" ? options.engine : null,
    coverage: coverageReport.mapWide,
  };
  if (options.ratings) {
    const retainedManifest = await retainedSurveyManifest(
      surveyDir,
      definitions,
      loaded.authorityHash,
      sourceFingerprint,
    );
    if (!retainedManifest) throw new Error("manual ratings require the retained current-source/current-authority survey capture");
    const payload = JSON.parse(await readFile(options.ratings, "utf8")) as unknown;
    const ratings = parseManualSurveyPayload(
      payload,
      loaded.state.units.map((unit) => unit.id),
      manifestViewIdsByUnit(retainedManifest),
    );
    const evidence = await promoteSurveyEvidence(options, retainedManifest);
    const rated = applyRatings(
      loaded.state,
      ratings,
      loaded.authorityHash,
      sourceFingerprint,
      evidence,
      surveyContext,
    );
    await writeStateFile(options.statePath, rated);
    await rm(surveyDir, { recursive: true, force: true });
    io.stdout(`Manual survey ratings imported: ${ratings.length} units; pass=${rated.pass}\n`);
    return 0;
  }
  let manifest = await retainedSurveyManifest(
    surveyDir,
    definitions,
    loaded.authorityHash,
    sourceFingerprint,
  );
  if (manifest) {
    io.stdout(`Reusing retained survey capture: ${surveyDir}\n`);
  } else {
    await rm(surveyDir, { recursive: true, force: true });
    manifest = await invokeCapture(options, plan, surveyDir, "survey");
    const contactSheetHashes: Record<string, string> = {};
    for (const batch of manifest.batches) {
      contactSheetHashes[batch.id] = createHash("sha256")
        .update(await readFile(batch.contactSheetPath))
        .digest("hex");
    }
    if (!manifest.referenceBoardPath) throw new Error("survey capture did not produce the required reference board");
    const referenceBoardHash = createHash("sha256")
      .update(await readFile(manifest.referenceBoardPath))
      .digest("hex");
    await writeJsonAtomic(path.join(surveyDir, "survey-source.json"), {
      authorityHash: loaded.authorityHash,
      sourceFingerprint,
      contactSheetHashes,
      referenceBoardHash,
    });
  }
  const captureReasons = captureValidityReasons(manifest, definitions);
  if (captureReasons.length > 0) throw new Error(`survey capture is invalid: ${captureReasons.join(" | ")}`);
  const capturedIds = new Set(manifest.units.flatMap((unit) => unit.zoneIds));
  const uncovered = loaded.spec.zones.map((zone) => zone.id).filter((zoneId) => !capturedIds.has(zoneId));
  if (uncovered.length > 0) throw new Error(`survey left authored zones uncovered: ${uncovered.join(", ")}`);
  if (options.mode === "manual") {
    await writeManualSurveyPackages(manifest, surveyDir);
    const state = pruneState({
      ...loaded.state,
      mapAuthorityHash: loaded.authorityHash,
      surveyedAuthorityHash: null,
      sourceFingerprint,
      surveyRequired: true,
    });
    await writeStateFile(options.statePath, state);
    io.stdout(`Manual survey package ready: ${surveyDir}; rate every unit and replace findings:null with [] or supported map-wide findings, then run ${workflowCommand("map:survey", options, ["--ratings", shellArg(path.join(surveyDir, "ratings-template.json"))])}\n`);
    return 0;
  }
  const ratings = options.mode === "mock"
    ? mockSurveyRatings(loaded.state.units)
    : mergeMapWideFindings(
        await classifySurveyReal(options, manifest, surveyDir),
        await classifyMapWideCoherenceReal(options, manifest, surveyDir),
      );
  const evidence = await promoteSurveyEvidence(options, manifest);
  const state = applyRatings(
    loaded.state,
    ratings,
    loaded.authorityHash,
    sourceFingerprint,
    evidence,
    surveyContext,
  );
  await writeStateFile(options.statePath, state);
  await rm(surveyDir, { recursive: true, force: true });
  const counts = Object.fromEntries(["red", "yellow", "green"].map((rating) => [
    rating,
    state.units.filter((unit) => unit.rating === rating).length,
  ]));
  io.stdout(`Survey complete: pass=${state.pass} engine=${state.engine ?? "none"} red=${counts.red} yellow=${counts.yellow} green=${counts.green} coverage usable=${coverageReport.mapWide.usablePct}% full-height=${coverageReport.mapWide.fullHeightPct}%\n`);
  return 0;
}

async function coverage(options: CliOptions, io: CliIo): Promise<number> {
  const map = await readMapSpecFile(options.mapSpecPath);
  const report = computeSurveyCoverage(map.spec);
  io.stdout(formatCoverageTable(report));
  if (report.failures.length > 0) {
    io.stderr(`coverage failures:\n- ${report.failures.join("\n- ")}\n`);
    return 1;
  }
  return 0;
}

async function next(options: CliOptions, io: CliIo): Promise<number> {
  const loaded = await loadStateAndSpec(options);
  if (loaded.state.activeTask) {
    io.stdout(`Active task ${loaded.state.activeTask.id} is ${loaded.state.activeTask.status}; run ${workflowCommand("map:verify", options)}\n`);
    return 0;
  }
  if (loaded.state.surveyRequired || loaded.state.surveyedAuthorityHash !== loaded.authorityHash) {
    io.stdout(`Survey required before implementation: ${workflowCommand("map:survey", options)}${loaded.state.milestone.required ? `\nA full milestone is also due after the resurvey: ${workflowCommand("map:verify", options, ["--milestone"])}` : ""}\n`);
    return 0;
  }
  if (loaded.state.milestone.required) {
    io.stdout(`Milestone verification is due: ${workflowCommand("map:verify", options, ["--milestone"])}\n`);
    return 0;
  }
  const selected = selectNextUnit(loaded.state);
  if (!selected) {
    io.stdout("No Red or Yellow unit is eligible; stop for human owner review.\n");
    return 0;
  }
  const nextAction = currentRetryAction(loaded.state, selected);
  const suggestedRisk = inferTaskRisk(selected);
  const definition = deriveReviewUnits(loaded.spec).find((entry) => entry.id === selected.id);
  const unitCoverage = definition
    ? computeSurveyCoverage(loaded.spec, [definition]).rows
        .filter((row) => selected.zoneIds.includes(row.zoneId))
        .map((row) => ({
          face: row.face,
          frontageId: row.frontageId,
          wallsM: row.lengthM,
          usablePct: row.usablePct,
          fullHeightPct: row.fullHeightPct,
        }))
    : [];
  io.stdout(`${JSON.stringify({
    id: selected.id,
    zoneIds: selected.zoneIds,
    rating: selected.rating,
    confidence: selected.confidence,
    defects: selected.defects,
    suggestedRisk,
    engine: loaded.state.engine,
    views: definition?.views.map((view) => view.id) ?? [],
    targetViewIds: defectViewIds(selected.defects),
    coverage: unitCoverage,
    ...(suggestedRisk === "shared" ? {
      sharedEvidenceCandidates: loaded.state.units
        .filter((unit) => unit.id !== selected.id && (unit.rating === "red" || unit.rating === "yellow"))
        .slice(0, 3)
        .map((unit) => ({ id: unit.id, defect: unit.defects[0] ?? null })),
      greenRegressionCandidates: loaded.state.units
        .filter((unit) => unit.rating === "green")
        .slice(0, 3)
        .map((unit) => unit.id),
    } : {}),
    ...(nextAction ? { nextAction } : {}),
    pass: loaded.state.pass,
  }, null, 2)}\n`);
  return 0;
}

async function traceOwnership(
  repoRoot: string,
  unit: ReviewUnitState,
  risk: TaskRisk,
  commit?: string,
): Promise<string[]> {
  const prioritized: string[] = [MAP_SPEC_PATH];
  if (risk === "shared") {
    const text = unit.defects.join(" ").toLowerCase();
    // Composition defects (where openings sit, rhythm, symmetry, corners, blank
    // planes) are owned by the facade grammar and its generator, not only by
    // map_spec.json. Without these surfaces a shared fix for "doors hug the
    // corners" is impossible, so they rank directly after map authority.
    if (COMPOSITION_DEFECT_PATTERN.test(text)) {
      prioritized.push(...FACADE_COMPOSITION_SOURCES);
    }
    if (/shader|material|surface|roughness|texture/.test(text)) {
      prioritized.push(
        "apps/client/src/runtime/map/wallShaderProfiles.ts",
        "apps/client/src/runtime/map/wallMaterialAssignment.ts",
        "apps/client/src/runtime/map/floorMaterialAssignment.ts",
      );
    }
    if (/prop|model|asset|stall|goods/.test(text)) {
      prioritized.push(
        "apps/client/src/runtime/map/propFamilies/propsCore.ts",
        "apps/client/src/runtime/map/buildProps.ts",
        "apps/client/src/runtime/render/models/PropModelLibrary.ts",
      );
    }
    if (/facade|wall|window|door|detail|architecture/.test(text)) {
      prioritized.push(
        "apps/client/src/runtime/map/v3Architecture.ts",
        "apps/client/src/runtime/map/wallDetailKit.ts",
        "apps/client/src/runtime/map/wallDetailPlacer.ts",
      );
    }
    if (prioritized.length === 1) {
      prioritized.push(
        "apps/client/src/runtime/map/wallShaderProfiles.ts",
        "apps/client/src/runtime/map/buildProps.ts",
        "apps/client/src/runtime/map/v3Architecture.ts",
      );
    }
  }
  for (const zoneId of unit.zoneIds) {
    // git grep is the only tracer: it is always present wherever the workflow
    // can run at all, and `--untracked` covers new files. A missing `rg` used
    // to degrade this silently to map_spec-only ownership, which then rejected
    // every legitimate runtime-source edit as a boundary crossing.
    const args = commit
      ? ["grep", "-l", "-F", "-I", "-e", zoneId, commit, "--", "apps/client/src/runtime/map", MAP_SPEC_PATH]
      : ["grep", "-l", "-F", "-I", "--untracked", "-e", zoneId, "--", "apps/client/src/runtime/map", MAP_SPEC_PATH];
    const result = await runProcess("git", args, { cwd: repoRoot });
    if (result.code === 0) {
      for (const rawFile of result.stdout.split("\n").filter(Boolean)) {
        const file = commit && rawFile.startsWith(`${commit}:`)
          ? rawFile.slice(commit.length + 1)
          : rawFile;
        if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)) prioritized.push(file);
      }
    } else if (result.code !== 1) {
      throw new Error(`ownership trace failed for '${zoneId}': ${boundedDiagnostic(result.stderr || result.stdout || "git grep error")}`);
    }
  }
  return [...new Set(prioritized)].slice(0, 6);
}

function permittedSourcePaths(risk: TaskRisk, ownershipPaths: readonly string[]): string[] {
  if (risk === "shared") return [...ownershipPaths].slice(0, 6);
  const permitted = ownershipPaths.filter((file) => (
    file === MAP_SPEC_PATH
    || /^apps\/client\/public\/assets\//.test(file)
    || (
      /^apps\/client\/src\/runtime\/(?:map|render)\//.test(file)
      && !touchedSharedMechanism([file])
    )
  ));
  return [...new Set(permitted.length > 0 ? permitted : [MAP_SPEC_PATH])].slice(0, 6);
}

function singleUnitPlan(authorityHash: string, definitions: readonly ReviewUnitDefinition[]): unknown {
  return {
    schemaVersion: 1,
    authorityHash,
    contactSheets: false,
    units: definitions,
    batches: [{ id: "task", unitIds: definitions.map((definition) => definition.id) }],
  };
}

function taskCaptureUnit(manifest: CaptureManifest, unitId: string): CaptureUnit {
  const unit = manifest.units.find((entry) => entry.id === unitId);
  if (!unit) throw new Error(`capture manifest is missing '${unitId}'`);
  return unit;
}

function validateSharedSelection(
  state: MapPolishState,
  selected: ReviewUnitState,
  options: CliOptions,
): SharedSelection | null {
  if ((options.risk ?? inferTaskRisk(selected)) !== "shared") return null;
  const sharedCause = conciseText(options.sharedCause, 180);
  if (!sharedCause) throw new Error("shared work requires one concise --shared-cause supported by both weak units");
  const evidenceIds = [...new Set([selected.id, ...options.sharedEvidence])];
  const evidence = evidenceIds.map((id) => state.units.find((unit) => unit.id === id)).filter(Boolean) as ReviewUnitState[];
  if (
    evidence.length < 2
    || evidence.some((unit) => (
      !["red", "yellow"].includes(unit.rating)
      || !unit.evidence.primary
      || !unit.evidence.context
      || unit.defects.length === 0
    ))
  ) {
    throw new Error("shared work requires evidence from at least two Red or Yellow units (--shared-evidence)");
  }
  const green = options.greenRegression
    ? state.units.find((unit) => unit.id === options.greenRegression)
    : state.units.find((unit) => unit.rating === "green");
  if (!green || green.rating !== "green" || !green.evidence.primary || !green.evidence.context) {
    throw new Error("shared work requires one already-Green --green-regression unit");
  }
  return {
    greenRegressionUnitId: green.id,
    sharedCause,
    evidence: evidence
      .filter((unit) => unit.id !== selected.id)
      .slice(0, 2)
      .map((unit) => ({
        unitId: unit.id,
        defect: unit.defects[0] as string,
        primaryScreenshot: unit.evidence.primary as string,
      })),
  };
}

/**
 * Engine pin (DEC-023): a pass is surveyed by one engine and its tasks must
 * use the same engine; a failed call is a workflow failure, never an engine
 * switch. Changing engines requires a resurvey.
 */
function assertEnginePin(state: MapPolishState, options: CliOptions): void {
  if (options.mode !== "real") return;
  if (state.engine !== null && state.engine !== options.engine) {
    throw new Error(
      `this pass was surveyed with engine '${state.engine}'; rerun with --engine ${state.engine} or resurvey with --engine ${options.engine}`,
    );
  }
}

async function prepareTask(options: CliOptions): Promise<TaskContext> {
  const taskStartedAt = performance.now();
  const loaded = await loadStateAndSpec(options);
  if (loaded.state.activeTask) throw new Error(`active task '${loaded.state.activeTask.id}' must be resolved with map:verify`);
  if (loaded.state.surveyRequired || loaded.state.surveyedAuthorityHash !== loaded.authorityHash) {
    throw new Error("full-map survey is required before implementation");
  }
  if (loaded.state.milestone.required) throw new Error("milestone verification is required before another task");
  assertEnginePin(loaded.state, options);
  const unit = selectNextUnit(loaded.state);
  if (!unit) throw new Error("no Red or Yellow review unit is eligible; stop for human owner review");
  const definition = deriveReviewUnits(loaded.spec).find((entry) => entry.id === unit.id);
  if (!definition) throw new Error(`review definition missing for '${unit.id}'`);
  const risk = options.risk ?? inferTaskRisk(unit);
  const sharedSelection = validateSharedSelection(loaded.state, unit, { ...options, risk });
  const greenRegressionUnitId = sharedSelection?.greenRegressionUnitId;
  if (options.concept) {
    if (!(await exists(options.concept))) throw new Error(`concept image does not exist: ${options.concept}`);
    if (!conceptAllowed(unit)) throw new Error("concept image is not allowed for this unit's rating/defect type");
  }
  const automatic = options.mode === "real" || options.mode === "mock";
  const stateFile = workflowStateFile(options);
  const start = automatic
    ? await assertAutomaticWorktree(options.repoRoot, [stateFile])
    : await (async () => {
        const unrelated = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== stateFile);
        if (unrelated.length > 0) {
          throw new Error(`manual mode refuses unrelated uncommitted changes: ${unrelated.join(", ")}`);
        }
        return { commit: await currentCommit(options.repoRoot) };
      })();
  const priorAttempts = unit.lastAttemptedPass?.pass === loaded.state.pass
    ? unit.lastAttemptedPass.attempts
    : 0;
  const attempt = Math.min(2, priorAttempts + 1);
  const taskId = `pass-${loaded.state.pass}-${unit.id}-attempt-${attempt}`;
  const artifactDir = path.join(options.artifactsRoot, "active", taskId);
  await rm(path.join(options.artifactsRoot, "active"), { recursive: true, force: true });
  await mkdir(artifactDir, { recursive: true });
  if (risk === "route-adjacent" && options.mode !== "mock") {
    try {
      await runRouteSpecificChecks(options, definition, artifactDir);
    } catch (error) {
      await cleanupRejectedArtifacts(artifactDir, options.keepDebug);
      throw new Error(`baseline focused-route preflight failed before capture or writer; no artistic attempt was consumed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const captureDefinitions = [definition];
  if (greenRegressionUnitId) {
    const greenDefinition = deriveReviewUnits(loaded.spec).find((entry) => entry.id === greenRegressionUnitId);
    if (!greenDefinition) throw new Error(`Green regression definition missing for '${greenRegressionUnitId}'`);
    captureDefinitions.push(greenDefinition);
  }
  const beforeCaptureStartedAt = performance.now();
  const before = await invokeCapture(
    options,
    singleUnitPlan(loaded.authorityHash, captureDefinitions),
    path.join(artifactDir, "before"),
    "before",
  );
  const beforeCaptureMs = performance.now() - beforeCaptureStartedAt;
  const beforeReasons = captureValidityReasons(before, captureDefinitions);
  if (beforeReasons.length > 0) {
    await rm(artifactDir, { recursive: true, force: true });
    throw new Error(`before capture is invalid; no writer call was made: ${beforeReasons.join(" | ")}`);
  }
  const workOrderStartedAt = performance.now();
  const beforeUnit = taskCaptureUnit(before, unit.id);
  const ownership = await traceOwnership(options.repoRoot, unit, risk);
  const permitted = permittedSourcePaths(risk, ownership);
  const objective = taskObjective(loaded.state, unit, options.objective);
  // Target views: those the defects/objective cite; fallback is every view.
  const allViewIds = definition.views.map((view) => view.id);
  const citedViewIds = [
    ...defectViewIds(unit.defects),
    ...allViewIds.filter((viewId) => objective.includes(viewId)),
  ].filter((viewId) => allViewIds.includes(viewId));
  const targetViewIds = citedViewIds.length > 0 ? [...new Set(citedViewIds)] : allViewIds;
  // Design-time evidence the screenshots cannot carry: plan crop + site brief.
  const planBefore = await renderPlanCrop(
    options,
    loaded.spec,
    definition,
    path.join(artifactDir, "plan-before.png"),
    `${unit.id} · ${definition.zoneIds.join(", ")} · plan (before)`,
  );
  if (planBefore) {
    // The layout SVG is regenerated after the edit; keep the pre-edit copy so
    // the blind review can render both plans with neutral labels and identical framing.
    await copyFile(path.join(options.repoRoot, LAYOUT_REFERENCE_SVG), path.join(artifactDir, "plan-before.svg"));
  }
  const siteBriefPath = path.join(artifactDir, "site-brief.md");
  await writeFile(siteBriefPath, buildSiteBrief(loaded.spec, definition, unit), "utf8");
  const compositionRequired = compositionRequiredForUnit(unit);
  const workOrder = buildWorkOrder({
    unit,
    definition,
    primaryScreenshot: (beforeUnit.views.primary as CaptureView).imagePath,
    contextScreenshot: (beforeUnit.views.context as CaptureView).imagePath,
    targetViewScreenshots: targetViewImagePaths(beforeUnit, targetViewIds),
    targetViewIds,
    ...(planBefore ? { planImage: planBefore } : {}),
    siteBriefPath,
    compositionRequired,
    ...(options.concept ? { conceptImage: options.concept } : {}),
    objective,
    risk,
    ownershipPaths: ownership,
    permittedPaths: permitted,
    checks: requiredChecks(risk, definition),
    ...(sharedSelection ? { sharedCause: sharedSelection.sharedCause, sharedEvidence: sharedSelection.evidence } : {}),
    ...(unit.rejectedTactics.at(-1) ? { priorRejectedTactic: unit.rejectedTactics.at(-1) as string } : {}),
  });
  const workOrderPath = path.join(artifactDir, "work-order.md");
  await writeFile(workOrderPath, workOrder, "utf8");
  return {
    state: loaded.state,
    spec: loaded.spec,
    authorityHash: loaded.authorityHash,
    definition,
    unit,
    objective,
    risk,
    targetViewIds,
    startCommit: start.commit,
    artifactDir,
    taskId,
    before,
    workOrderPath,
    ownershipPaths: ownership,
    permittedPaths: permitted,
    ...(planBefore ? { planImages: { before: planBefore } } : {}),
    siteBriefPath,
    compositionRequired,
    performance: {
      startedAtMs: taskStartedAt,
      prepareMs: beforeCaptureStartedAt - taskStartedAt,
      beforeCaptureMs,
      workOrderMs: performance.now() - workOrderStartedAt,
      writer: null,
      postWriterValidationMs: 0,
      checksMs: 0,
      afterCaptureMs: 0,
      comparisonPackageMs: 0,
      reviewer: null,
      finalizeMs: 0,
    },
    ...(greenRegressionUnitId ? { greenRegressionUnitId } : {}),
    ...(sharedSelection ? { sharedCause: sharedSelection.sharedCause, sharedEvidence: sharedSelection.evidence } : {}),
  };
}

function activeTaskFromContext(
  context: TaskContext,
  status: ActiveTask["status"],
  touchedFiles: string[] = [],
  proposedOutcome?: ActiveTask["proposedOutcome"],
  blindAfterLabel?: ActiveTask["blindAfterLabel"],
  artifactEvidenceHash?: ActiveTask["artifactEvidenceHash"],
): ActiveTask {
  return {
    id: context.taskId,
    unitId: context.unit.id,
    status,
    startCommit: context.startCommit,
    artifactDir: portablePath(TOOL_REPO_ROOT, context.artifactDir),
    workOrder: portablePath(TOOL_REPO_ROOT, context.workOrderPath),
    objective: context.objective,
    attempt: context.unit.lastAttemptedPass?.pass === context.state.pass
      ? Math.min(2, context.unit.lastAttemptedPass.attempts + 1)
      : 1,
    risk: context.risk,
    touchedFiles,
    ...(context.greenRegressionUnitId ? { greenRegressionUnitId: context.greenRegressionUnitId } : {}),
    ...(proposedOutcome ? { proposedOutcome } : {}),
    ...(blindAfterLabel ? { blindAfterLabel } : {}),
    ...(context.requiresHumanTraversal ? { movementConfirmationRequired: true } : {}),
    ...(artifactEvidenceHash ? { artifactEvidenceHash } : {}),
  };
}

async function runMockWriter(options: CliOptions, context: TaskContext): Promise<void> {
  if (!options.mockTarget) throw new Error("full mock task requires --mock-target RELATIVE_PATH in a disposable repo");
  if (path.isAbsolute(options.mockTarget) || options.mockTarget.split(/[\\/]/).includes("..")) {
    throw new Error("--mock-target must be a safe repo-relative path");
  }
  const target = path.resolve(options.repoRoot, options.mockTarget);
  const relative = path.relative(options.repoRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("mock target escapes repo");
  const existing = await readFile(target, "utf8");
  await appendFile(target, `\n// ${context.taskId} mock visual candidate\n`, "utf8");
  if (existing.length === 0) throw new Error("mock target must be an existing source file");
}

/** Bounded writer output retained for the human owner: what changed and why it makes sense. */
async function readWriterRationale(artifactDir: string): Promise<{ summary?: string; designRationale?: string }> {
  try {
    const raw = JSON.parse(await readFile(path.join(artifactDir, "writer-result.json"), "utf8")) as {
      summary?: unknown;
      designRationale?: unknown;
    };
    return {
      ...(typeof raw.summary === "string" && raw.summary.trim() ? { summary: raw.summary.trim().slice(0, 400) } : {}),
      ...(typeof raw.designRationale === "string" && raw.designRationale.trim()
        ? { designRationale: raw.designRationale.trim().slice(0, 600) }
        : {}),
    };
  } catch {
    return {};
  }
}

function targetViewImagePaths(unit: CaptureUnit, targetViewIds: readonly string[]): Array<{ viewId: string; path: string }> {
  return targetViewIds
    .filter((viewId) => viewId !== "primary" && viewId !== "context")
    .map((viewId) => ({ viewId, path: unit.views[viewId]?.imagePath ?? "" }))
    .filter((entry) => entry.path.length > 0);
}

async function invokeWriter(options: CliOptions, context: TaskContext): Promise<ModelCallTelemetry | null> {
  if (options.mode === "mock") {
    await runMockWriter(options, context);
    return null;
  }
  const beforeUnit = taskCaptureUnit(context.before, context.unit.id);
  const prompt = await readFile(context.workOrderPath, "utf8");
  const result = await invokeEngineJson(options.engine, {
    repoRoot: options.repoRoot,
    prompt,
    images: [
      (beforeUnit.views.primary as CaptureView).imagePath,
      (beforeUnit.views.context as CaptureView).imagePath,
      ...targetViewImagePaths(beforeUnit, context.targetViewIds).map((entry) => entry.path),
      ...(context.planImages ? [context.planImages.before] : []),
      ...(context.sharedEvidence ?? []).map((entry) => resolveFrom(options.repoRoot, entry.primaryScreenshot)),
      ...(options.concept ? [options.concept] : []),
    ],
    schema: writerSchema(),
    resultPath: path.join(context.artifactDir, "writer-result.json"),
    role: "writer",
  });
  return result.telemetry;
}

async function mapSpecAtCommit(repoRoot: string, commit: string): Promise<MapSpec> {
  const result = await runChecked("git", ["show", `${commit}:${MAP_SPEC_PATH}`], { cwd: repoRoot });
  return JSON.parse(result.stdout) as MapSpec;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

export function isAllowedCandidateFile(file: string): boolean {
  return isRelevantMapSource(file)
    || /^apps\/client\/public\/maps\/bazaar-map\/(?:map_spec|shots)\.json$/.test(file)
    || /^docs\/map-design\/(?:layout-reference\.(?:md|svg)|blockout\/topdown_layout\.svg)$/.test(file)
    || /^apps\/client\/src\/runtime\/(?:map|render)\/.*\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
}

export function outsidePermittedSourceFiles(permittedPaths: readonly string[], touchedFiles: readonly string[]): string[] {
  const permitted = new Set(permittedPaths);
  return touchedFiles.filter((file) => (
    (isRelevantMapSource(file) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file))
    && !permitted.has(file)
  ));
}

async function assertCandidateUnchanged(options: CliOptions, task: ActiveTask, artifactDir: string): Promise<void> {
  const head = await currentCommit(options.repoRoot);
  if (head !== task.startCommit) throw new Error("candidate HEAD changed after capture; manual recovery is required");
  const stateFile = workflowStateFile(options);
  const touchedFiles = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== stateFile);
  if (!sameStringSet(touchedFiles, task.touchedFiles)) {
    throw new Error("candidate touched-file set changed after visual validation; recapture is required");
  }
  const recordedPatch = path.join(artifactDir, "candidate.patch");
  if (!(await exists(recordedPatch))) throw new Error("candidate patch evidence is missing");
  const currentPatch = path.join(artifactDir, ".candidate-current.patch");
  await captureCandidatePatch({
    repoRoot: options.repoRoot,
    startCommit: task.startCommit,
    touchedFiles,
    outputPath: currentPatch,
  });
  const [recorded, current] = await Promise.all([readFile(recordedPatch), readFile(currentPatch)]);
  await rm(currentPatch, { force: true });
  if (!recorded.equals(current)) {
    throw new Error("candidate patch changed after visual validation; recapture is required");
  }
}

export function touchedSharedMechanism(touchedFiles: readonly string[]): boolean {
  return touchedFiles.some((file) => (
    !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
    && (
      /^(?:apps\/client\/src\/runtime\/map\/(?:[^/]+\.ts|propFamilies\/propsCore\.ts|wallDetailFamilies\/(?:kitCore|kitMaterials|facadeShells)\.ts)|apps\/client\/src\/runtime\/render\/(?:materials|models)\/.*\.ts)$/.test(file)
      || (FACADE_COMPOSITION_SOURCES as readonly string[]).includes(file)
    )
  ));
}

function specRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    : [];
}

function changedSpecRecordIds(beforeValue: unknown, afterValue: unknown): string[] {
  const before = new Map(specRecords(beforeValue).map((entry) => [String(entry.id), JSON.stringify(entry)]));
  const after = new Map(specRecords(afterValue).map((entry) => [String(entry.id), JSON.stringify(entry)]));
  return [...new Set([...before.keys(), ...after.keys()])].filter((id) => before.get(id) !== after.get(id));
}

function facadeModuleGeometry(record: Record<string, unknown> | undefined): unknown {
  if (!record) return null;
  return {
    kind: record.kind ?? null,
    openingType: record.openingType ?? null,
    dimensionsM: record.dimensionsM ?? null,
    collisionOpening: record.collisionOpening ?? null,
  };
}

function facadeProfileGeometry(spec: MapSpec, profileId: unknown): unknown {
  const profile = specRecords(spec.facade_profiles).find((entry) => String(entry.id) === String(profileId));
  if (!profile) return null;
  const modules = new Map(specRecords(spec.facade_modules).map((entry) => [String(entry.id), entry]));
  const moduleIds = Array.isArray(profile.moduleIds) ? profile.moduleIds.map(String) : [];
  return {
    family: profile.family ?? null,
    massingProfileId: profile.massingProfileId ?? null,
    modules: moduleIds.map((id) => ({ id, geometry: facadeModuleGeometry(modules.get(id)) })),
  };
}

function frontageGeometryChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  const before = new Map(specRecords(base.frontages).map((entry) => [String(entry.id), entry]));
  const after = new Map(specRecords(current.frontages).map((entry) => [String(entry.id), entry]));
  const zones = new Set<string>();
  for (const id of [...new Set([...before.keys(), ...after.keys()])]) {
    const left = before.get(id);
    const right = after.get(id);
    if (JSON.stringify(left) === JSON.stringify(right)) continue;
    const addZones = (): void => {
      for (const record of [left, right]) {
        if (typeof record?.zoneId === "string") zones.add(record.zoneId);
      }
    };
    if (!left || !right) {
      addZones();
      continue;
    }
    const placement = (record: Record<string, unknown>): unknown => ({
      zoneId: record.zoneId ?? null,
      face: record.face ?? null,
      start: record.start ?? null,
      end: record.end ?? null,
      massingProfileId: record.massingProfileId ?? null,
      layoutIntent: record.layoutIntent ?? null,
    });
    if (JSON.stringify(placement(left)) !== JSON.stringify(placement(right))) {
      addZones();
      continue;
    }
    if (
      left.facadeProfileId !== right.facadeProfileId
      && JSON.stringify(facadeProfileGeometry(base, left.facadeProfileId))
        !== JSON.stringify(facadeProfileGeometry(current, right.facadeProfileId))
    ) addZones();
  }
  return [...zones].sort();
}

function facadeModuleGeometryChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  const beforeModules = new Map(specRecords(base.facade_modules).map((entry) => [String(entry.id), entry]));
  const afterModules = new Map(specRecords(current.facade_modules).map((entry) => [String(entry.id), entry]));
  const changedIds = new Set([...new Set([...beforeModules.keys(), ...afterModules.keys()])].filter((id) => (
    JSON.stringify(facadeModuleGeometry(beforeModules.get(id)))
      !== JSON.stringify(facadeModuleGeometry(afterModules.get(id)))
  )));
  if (changedIds.size === 0) return [];
  const profiles = [...specRecords(base.facade_profiles), ...specRecords(current.facade_profiles)];
  const profileIds = new Set(profiles.filter((profile) => (
    Array.isArray(profile.moduleIds) && profile.moduleIds.some((id) => changedIds.has(String(id)))
  )).map((profile) => String(profile.id)));
  const zones = new Set<string>();
  for (const record of [...specRecords(base.frontages), ...specRecords(current.frontages)]) {
    if (profileIds.has(String(record.facadeProfileId)) && typeof record.zoneId === "string") zones.add(record.zoneId);
  }
  for (const zone of [...specRecords(base.zones), ...specRecords(current.zones)]) {
    if (profileIds.has(String(zone.facadeProfileId)) && typeof zone.id === "string") zones.add(zone.id);
  }
  return [...zones].sort();
}

function zoneFacadeGeometryChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  const before = new Map(specRecords(base.zones).map((entry) => [String(entry.id), entry]));
  const after = new Map(specRecords(current.zones).map((entry) => [String(entry.id), entry]));
  const zones = new Set<string>();
  for (const id of [...new Set([...before.keys(), ...after.keys()])]) {
    const left = before.get(id);
    const right = after.get(id);
    if (!left || !right) continue;
    if (left.massingProfileId !== right.massingProfileId) zones.add(id);
    if (
      left.facadeProfileId !== right.facadeProfileId
      && JSON.stringify(facadeProfileGeometry(base, left.facadeProfileId))
        !== JSON.stringify(facadeProfileGeometry(current, right.facadeProfileId))
    ) zones.add(id);
  }
  return [...zones].sort();
}

function facadeProfileGeometryChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  const profileIds = new Set([
    ...specRecords(base.facade_profiles).map((entry) => String(entry.id)),
    ...specRecords(current.facade_profiles).map((entry) => String(entry.id)),
  ]);
  const changed = new Set([...profileIds].filter((id) => (
    JSON.stringify(facadeProfileGeometry(base, id)) !== JSON.stringify(facadeProfileGeometry(current, id))
  )));
  if (changed.size === 0) return [];
  const zones = new Set<string>();
  for (const frontage of [...specRecords(base.frontages), ...specRecords(current.frontages)]) {
    if (changed.has(String(frontage.facadeProfileId)) && typeof frontage.zoneId === "string") zones.add(frontage.zoneId);
  }
  for (const zone of [...specRecords(base.zones), ...specRecords(current.zones)]) {
    if (changed.has(String(zone.facadeProfileId)) && typeof zone.id === "string") zones.add(zone.id);
  }
  return [...zones].sort();
}

function massingProfileGeometryChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  const changed = new Set(changedSpecRecordIds(base.massing_profiles, current.massing_profiles));
  if (changed.size === 0) return [];
  const profiles = [...specRecords(base.facade_profiles), ...specRecords(current.facade_profiles)];
  const affectedProfileIds = new Set(profiles.filter((profile) => (
    changed.has(String(profile.massingProfileId))
  )).map((profile) => String(profile.id)));
  const zones = new Set<string>();
  for (const frontage of [...specRecords(base.frontages), ...specRecords(current.frontages)]) {
    if (
      (changed.has(String(frontage.massingProfileId)) || affectedProfileIds.has(String(frontage.facadeProfileId)))
      && typeof frontage.zoneId === "string"
    ) zones.add(frontage.zoneId);
  }
  for (const zone of [...specRecords(base.zones), ...specRecords(current.zones)]) {
    if (
      (changed.has(String(zone.massingProfileId)) || affectedProfileIds.has(String(zone.facadeProfileId)))
      && typeof zone.id === "string"
    ) zones.add(zone.id);
  }
  return [...zones].sort();
}

function facadeRouteChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  return [...new Set([
    ...frontageGeometryChangedZoneIds(base, current),
    ...facadeModuleGeometryChangedZoneIds(base, current),
    ...zoneFacadeGeometryChangedZoneIds(base, current),
    ...facadeProfileGeometryChangedZoneIds(base, current),
    ...massingProfileGeometryChangedZoneIds(base, current),
  ])].sort();
}

export function mapSpecRouteAdjacentChanged(base: MapSpec, current: MapSpec): boolean {
  const keys = [
    "anchors",
    "dressing_clusters",
    "dressing_placements",
  ];
  if (keys.some((key) => JSON.stringify(base[key] ?? null) !== JSON.stringify(current[key] ?? null))) return true;
  if (facadeRouteChangedZoneIds(base, current).length > 0) return true;
  const beforeAssets = new Map(specRecords(base.asset_registry).map((entry) => [String(entry.id), entry]));
  const afterAssets = new Map(specRecords(current.asset_registry).map((entry) => [String(entry.id), entry]));
  return changedSpecRecordIds(base.asset_registry, current.asset_registry).some((id) => {
    const before = beforeAssets.get(id);
    const after = afterAssets.get(id);
    if (!before || !after) return false;
    return JSON.stringify({ dimensionsM: before.dimensionsM, collisionClass: before.collisionClass })
      !== JSON.stringify({ dimensionsM: after.dimensionsM, collisionClass: after.collisionClass });
  });
}

export function mapSpecRouteChangedZoneIds(base: MapSpec, current: MapSpec): string[] {
  const zones = new Set<string>();
  for (const zoneId of facadeRouteChangedZoneIds(base, current)) zones.add(zoneId);
  const addChangedRecordZones = (key: string, zoneKeys: string[]): void => {
    const records = [...specRecords(base[key]), ...specRecords(current[key])];
    for (const id of changedSpecRecordIds(base[key], current[key])) {
      for (const record of records.filter((entry) => String(entry.id) === id)) {
        for (const zoneKey of zoneKeys) {
          if (typeof record[zoneKey] === "string") zones.add(record[zoneKey] as string);
        }
      }
    }
  };
  addChangedRecordZones("anchors", ["zone", "zoneId"]);
  addChangedRecordZones("dressing_clusters", ["zoneId"]);

  const clusters = [...specRecords(base.dressing_clusters), ...specRecords(current.dressing_clusters)];
  const clusterZone = new Map(clusters.map((entry) => [String(entry.id), String(entry.zoneId)]));
  const placements = [...specRecords(base.dressing_placements), ...specRecords(current.dressing_placements)];
  for (const id of changedSpecRecordIds(base.dressing_placements, current.dressing_placements)) {
    for (const placement of placements.filter((entry) => String(entry.id) === id)) {
      const zoneId = clusterZone.get(String(placement.clusterId));
      if (zoneId && zoneId !== "undefined") zones.add(zoneId);
    }
  }

  const beforeAssets = new Map(specRecords(base.asset_registry).map((entry) => [String(entry.id), entry]));
  const afterAssets = new Map(specRecords(current.asset_registry).map((entry) => [String(entry.id), entry]));
  for (const id of changedSpecRecordIds(base.asset_registry, current.asset_registry)) {
    const before = beforeAssets.get(id);
    const after = afterAssets.get(id);
    if (!before || !after) continue;
    const dimensionsChanged = JSON.stringify({ dimensionsM: before.dimensionsM, collisionClass: before.collisionClass })
      !== JSON.stringify({ dimensionsM: after.dimensionsM, collisionClass: after.collisionClass });
    if (!dimensionsChanged) continue;
    for (const cluster of clusters) {
      if (Array.isArray(cluster.assetIds) && cluster.assetIds.includes(id) && typeof cluster.zoneId === "string") {
        zones.add(cluster.zoneId);
      }
    }
  }
  return [...zones].sort();
}

export function mapSpecSharedVisualChanged(base: MapSpec, current: MapSpec): boolean {
  const frontages = [...specRecords(base.frontages), ...specRecords(current.frontages)];
  for (const [key, referenceKey] of [
    ["facade_profiles", "facadeProfileId"],
    ["massing_profiles", "massingProfileId"],
  ] as const) {
    const changedIds = changedSpecRecordIds(base[key], current[key]);
    if (changedIds.some((id) => new Set(
      frontages.filter((frontage) => frontage[referenceKey] === id).map((frontage) => String(frontage.zoneId)),
    ).size >= 2)) return true;
  }
  const clusters = [...specRecords(base.dressing_clusters), ...specRecords(current.dressing_clusters)];
  if (changedSpecRecordIds(base.asset_registry, current.asset_registry).some((id) => new Set(
    clusters
      .filter((cluster) => Array.isArray(cluster.assetIds) && cluster.assetIds.includes(id))
      .map((cluster) => String(cluster.zoneId)),
  ).size >= 2)) return true;

  const profiles = [...specRecords(base.facade_profiles), ...specRecords(current.facade_profiles)];
  if (changedSpecRecordIds(base.facade_modules, current.facade_modules).some((id) => {
    const profileIds = new Set(
      profiles.filter((profile) => Array.isArray(profile.moduleIds) && profile.moduleIds.includes(id)).map((profile) => String(profile.id)),
    );
    return new Set(frontages.filter((frontage) => profileIds.has(String(frontage.facadeProfileId))).map((frontage) => String(frontage.zoneId))).size >= 2;
  })) return true;
  const sharedWallDetails = (value: unknown): unknown => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value ?? null;
    const shared = { ...(value as Record<string, unknown>) };
    delete shared.facade_overrides;
    return shared;
  };
  if (JSON.stringify(sharedWallDetails(base.wall_details)) !== JSON.stringify(sharedWallDetails(current.wall_details))) {
    return true;
  }
  return false;
}

export function mapSpecSurveyCameraAuthorityChanged(base: MapSpec, current: MapSpec): boolean {
  return JSON.stringify(base.map_polish_survey_camera_overrides ?? null)
    !== JSON.stringify(current.map_polish_survey_camera_overrides ?? null);
}

type MapSpecVisualImpact = {
  zoneIds: string[];
  unscopedKeys: string[];
};

type CandidateLocality = MapSpecVisualImpact & {
  foreignVisualZoneIds: string[];
  outsideOwnershipFiles: string[];
  ambiguousSharedFiles: string[];
  mapShared: boolean;
  requiresSharedEvidence: boolean;
};

function changedRecords(
  beforeValue: unknown,
  afterValue: unknown,
  identity: (record: Record<string, unknown>) => string,
): Array<Record<string, unknown>> {
  const before = new Map(specRecords(beforeValue).map((record) => [identity(record), record]));
  const after = new Map(specRecords(afterValue).map((record) => [identity(record), record]));
  const changed = [...new Set([...before.keys(), ...after.keys()])]
    .filter((key) => JSON.stringify(before.get(key) ?? null) !== JSON.stringify(after.get(key) ?? null));
  return changed.flatMap((key) => [before.get(key), after.get(key)])
    .filter((record): record is Record<string, unknown> => Boolean(record));
}

function referencedZones(
  records: readonly Record<string, unknown>[],
  keys: readonly string[],
): string[] {
  return records.flatMap((record) => keys
    .map((key) => record[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0));
}

/**
 * Resolve authored visual changes to the zones whose recaptures can prove them.
 * A changed visual record that cannot be resolved to any zone is deliberately
 * unscoped: accepting it requires the shared-system evidence path.
 */
export function mapSpecVisualImpact(base: MapSpec, current: MapSpec): MapSpecVisualImpact {
  const zones = new Set<string>();
  const unscoped = new Set<string>();
  const addZones = (values: readonly string[]): void => {
    for (const value of values) zones.add(value);
  };
  const recordId = (record: Record<string, unknown>): string => String(record.id);
  const zoneRecord = (key: string, zoneKeys: readonly string[]): void => {
    if (JSON.stringify(base[key] ?? null) === JSON.stringify(current[key] ?? null)) return;
    const changed = changedRecords(base[key], current[key], recordId);
    const impacted = referencedZones(changed, zoneKeys);
    addZones(impacted);
    if (impacted.length === 0) unscoped.add(key);
  };

  if (JSON.stringify(base.zones ?? null) !== JSON.stringify(current.zones ?? null)) {
    const changed = changedRecords(base.zones, current.zones, recordId);
    const impacted = changed.map((record) => record.id).filter((value): value is string => typeof value === "string");
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("zones");
  }
  zoneRecord("frontages", ["zoneId"]);
  zoneRecord("anchors", ["zone", "zoneId"]);
  zoneRecord("dressing_clusters", ["zoneId"]);

  if (JSON.stringify(base.frontage_exemptions ?? null) !== JSON.stringify(current.frontage_exemptions ?? null)) {
    const changed = changedRecords(
      base.frontage_exemptions,
      current.frontage_exemptions,
      (record) => `${String(record.zoneId)}:${String(record.face)}`,
    );
    const impacted = referencedZones(changed, ["zoneId"]);
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("frontage_exemptions");
  }

  const allClusters = [...specRecords(base.dressing_clusters), ...specRecords(current.dressing_clusters)];
  const clusterZones = new Map(allClusters.map((record) => [String(record.id), String(record.zoneId)]));
  if (JSON.stringify(base.dressing_placements ?? null) !== JSON.stringify(current.dressing_placements ?? null)) {
    const changed = changedRecords(base.dressing_placements, current.dressing_placements, recordId);
    const impacted = changed
      .map((record) => clusterZones.get(String(record.clusterId)))
      .filter((value): value is string => Boolean(value) && value !== "undefined");
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("dressing_placements");
  }

  const allFrontages = [...specRecords(base.frontages), ...specRecords(current.frontages)];
  const allZones = [...specRecords(base.zones), ...specRecords(current.zones)];
  const zonesUsingProfile = (ids: ReadonlySet<string>, referenceKey: string): string[] => [
    ...allFrontages
      .filter((record) => ids.has(String(record[referenceKey])))
      .map((record) => String(record.zoneId)),
    ...allZones
      .filter((record) => ids.has(String(record[referenceKey])))
      .map((record) => String(record.id)),
  ].filter((value) => value !== "undefined");
  const changedProfileIds = new Set(changedSpecRecordIds(base.facade_profiles, current.facade_profiles));
  if (changedProfileIds.size > 0) {
    const impacted = zonesUsingProfile(changedProfileIds, "facadeProfileId");
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("facade_profiles");
  }
  const changedMassingIds = new Set(changedSpecRecordIds(base.massing_profiles, current.massing_profiles));
  if (changedMassingIds.size > 0) {
    const impacted = zonesUsingProfile(changedMassingIds, "massingProfileId");
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("massing_profiles");
  }

  const allProfiles = [...specRecords(base.facade_profiles), ...specRecords(current.facade_profiles)];
  const changedModuleIds = new Set(changedSpecRecordIds(base.facade_modules, current.facade_modules));
  if (changedModuleIds.size > 0) {
    const profileIds = new Set(allProfiles
      .filter((profile) => Array.isArray(profile.moduleIds)
        && profile.moduleIds.some((id) => changedModuleIds.has(String(id))))
      .map((profile) => String(profile.id)));
    const impacted = zonesUsingProfile(profileIds, "facadeProfileId");
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("facade_modules");
  }

  const changedAssetIds = new Set(changedSpecRecordIds(base.asset_registry, current.asset_registry));
  if (changedAssetIds.size > 0) {
    const impacted = allClusters
      .filter((cluster) => Array.isArray(cluster.assetIds)
        && cluster.assetIds.some((id) => changedAssetIds.has(String(id))))
      .map((cluster) => String(cluster.zoneId));
    const allPlacements = [...specRecords(base.dressing_placements), ...specRecords(current.dressing_placements)];
    impacted.push(...allPlacements
      .filter((placement) => changedAssetIds.has(String(placement.assetId)))
      .map((placement) => clusterZones.get(String(placement.clusterId)) ?? "")
      .filter(Boolean));
    const allModules = [...specRecords(base.facade_modules), ...specRecords(current.facade_modules)];
    const moduleIds = new Set(allModules
      .filter((module) => changedAssetIds.has(String(module.assetId)))
      .map((module) => String(module.id)));
    const profileIds = new Set(allProfiles
      .filter((profile) => Array.isArray(profile.moduleIds)
        && profile.moduleIds.some((id) => moduleIds.has(String(id))))
      .map((profile) => String(profile.id)));
    impacted.push(...zonesUsingProfile(profileIds, "facadeProfileId"));
    const validImpacted = impacted.filter((value) => value && value !== "undefined");
    addZones(validImpacted);
    if (validImpacted.length === 0) unscoped.add("asset_registry");
  }

  if (JSON.stringify(base.wall_details ?? null) !== JSON.stringify(current.wall_details ?? null)) {
    const wallDetails = (value: unknown): Record<string, unknown> => (
      value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
    );
    const before = wallDetails(base.wall_details);
    const after = wallDetails(current.wall_details);
    const beforeShared = { ...before };
    const afterShared = { ...after };
    delete beforeShared.facade_overrides;
    delete afterShared.facade_overrides;
    if (JSON.stringify(beforeShared) !== JSON.stringify(afterShared)) unscoped.add("wall_details");
    const overridesChanged = JSON.stringify(before.facade_overrides ?? null)
      !== JSON.stringify(after.facade_overrides ?? null);
    const changed = changedRecords(
      before.facade_overrides,
      after.facade_overrides,
      (record) => `${String(record.zoneId)}:${String(record.face)}`,
    );
    const impacted = referencedZones(changed, ["zoneId"]);
    addZones(impacted);
    if (overridesChanged && impacted.length === 0) unscoped.add("wall_details");
  }

  if (JSON.stringify(base.landmarks ?? null) !== JSON.stringify(current.landmarks ?? null)) {
    const anchorZones = new Map(
      [...specRecords(base.anchors), ...specRecords(current.anchors)]
        .map((anchor) => [String(anchor.id), String(anchor.zone ?? anchor.zoneId)]),
    );
    const landmarkEntries = (value: unknown): Map<string, Record<string, unknown>> => new Map(
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value as Record<string, unknown>)
          .filter((entry): entry is [string, Record<string, unknown>] => (
            Boolean(entry[1]) && typeof entry[1] === "object" && !Array.isArray(entry[1])
          ))
        : [],
    );
    const beforeLandmarks = landmarkEntries(base.landmarks);
    const afterLandmarks = landmarkEntries(current.landmarks);
    const changedLandmarks = [...new Set([...beforeLandmarks.keys(), ...afterLandmarks.keys()])]
      .filter((key) => JSON.stringify(beforeLandmarks.get(key) ?? null) !== JSON.stringify(afterLandmarks.get(key) ?? null));
    const impacted = changedLandmarks
      .flatMap((key) => [beforeLandmarks.get(key), afterLandmarks.get(key)])
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .map((entry) => String(entry.anchor_id))
      .map((id) => anchorZones.get(id))
      .filter((value): value is string => Boolean(value) && value !== "undefined");
    addZones(impacted);
    if (impacted.length === 0) unscoped.add("landmarks");
  }

  const protectedOrEvidenceKeys = new Set([
    "global_dimensions", "traversal_surfaces", "tactical_lanes", "explicit_connectivity",
    "authored_spawns", "constraints", "composition_rules", "lanes", "connectivity",
    "layout_reference",
  ]);
  const handledVisualKeys = new Set([
    "zones", "frontages", "frontage_exemptions", "anchors", "dressing_clusters",
    "dressing_placements", "facade_profiles", "massing_profiles", "facade_modules",
    "asset_registry", "wall_details", "landmarks",
  ]);
  for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
    if (JSON.stringify(base[key] ?? null) === JSON.stringify(current[key] ?? null)) continue;
    if (!protectedOrEvidenceKeys.has(key) && !handledVisualKeys.has(key)) unscoped.add(key);
  }
  return {
    zoneIds: [...zones].sort(),
    unscopedKeys: [...unscoped].sort(),
  };
}

export function sourceFilesOutsideTracedOwnership(
  touchedFiles: readonly string[],
  ownershipPaths: readonly string[],
): string[] {
  const owned = new Set(ownershipPaths);
  return touchedFiles
    .filter((file) => file !== MAP_SPEC_PATH && isRelevantMapSource(file) && !owned.has(file))
    .sort();
}

export function inspectCandidateLocality(input: {
  baseSpec: MapSpec;
  currentSpec: MapSpec;
  touchedFiles: readonly string[];
  ownershipPaths: readonly string[];
  selectedZoneIds: readonly string[];
}): CandidateLocality {
  const impact = mapSpecVisualImpact(input.baseSpec, input.currentSpec);
  const selected = new Set(input.selectedZoneIds);
  const foreignVisualZoneIds = impact.zoneIds.filter((zoneId) => !selected.has(zoneId));
  const outsideOwnershipFiles = sourceFilesOutsideTracedOwnership(input.touchedFiles, input.ownershipPaths);
  const ambiguousSharedFiles = input.touchedFiles.filter((file) => touchedSharedMechanism([file])).sort();
  const mapShared = mapSpecSharedVisualChanged(input.baseSpec, input.currentSpec);
  return {
    ...impact,
    foreignVisualZoneIds,
    outsideOwnershipFiles,
    ambiguousSharedFiles,
    mapShared,
    requiresSharedEvidence: mapShared
      || foreignVisualZoneIds.length > 0
      || impact.unscopedKeys.length > 0
      || outsideOwnershipFiles.length > 0
      || ambiguousSharedFiles.length > 0,
  };
}

function candidateLocalitySummary(locality: CandidateLocality): string {
  return [
    locality.mapShared ? "shared map authority" : null,
    locality.foreignVisualZoneIds.length > 0
      ? `foreign visual zones: ${locality.foreignVisualZoneIds.join(", ")}`
      : null,
    locality.unscopedKeys.length > 0
      ? `unscoped map authority: ${locality.unscopedKeys.join(", ")}`
      : null,
    locality.outsideOwnershipFiles.length > 0
      ? `outside traced ownership: ${locality.outsideOwnershipFiles.join(", ")}`
      : null,
    locality.ambiguousSharedFiles.length > 0
      ? `ambiguous shared emitters: ${locality.ambiguousSharedFiles.join(", ")}`
      : null,
  ].filter(Boolean).join(" | ");
}

export function focusedSharedTest(touchedFiles: readonly string[], mapShared = false): string | null {
  if (mapShared) return "apps/client/scripts/gen-map-runtime.test.mjs";
  const mappings: Array<[RegExp, string]> = [
    [/facade-layout-grammar\.mjs$/, "apps/client/scripts/lib/facade-layout-grammar.test.mjs"],
    [/gen-map-runtime\.mjs$/, "apps/client/scripts/gen-map-runtime.test.mjs"],
    [/wallShaderProfiles|runtime\/render\/materials\//, "apps/client/src/runtime/render/materials/MaterialLibraries.test.ts"],
    [/wallMaterialAssignment|floorMaterialAssignment/, "apps/client/src/runtime/map/standardizedArchitecture.test.ts"],
    [/buildPbrWalls/, "apps/client/src/runtime/map/v3VisualWallSegments.test.ts"],
    [/propFamilies\/propsCore|runtime\/render\/models\//, "apps/client/src/runtime/map/buildProps.test.ts"],
    [/wallDetailKit|wallDetailFamilies\/(?:kitCore|kitMaterials|facadeShells)/, "apps/client/src/runtime/map/v3Architecture.test.ts"],
  ];
  const mapped = mappings.find(([pattern]) => touchedFiles.some((file) => pattern.test(file)))?.[1];
  const companion = touchedFiles
    .find((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    ?.replace(/\.ts$/, ".test.ts");
  return mapped ?? companion ?? null;
}

async function runRouteSpecificChecks(
  options: CliOptions,
  definition: ReviewUnitDefinition,
  artifactDir: string,
  routeIds: readonly string[] = [focusedRouteForUnit(definition)],
): Promise<string[]> {
  await runChecked(
    "pnpm",
    ["--filter", "@clawd-strike/client", "exec", "node", "--test", "scripts/gen-map-runtime.test.mjs"],
    { cwd: options.repoRoot },
  );
  const completed: string[] = ["clearance validation"];
  for (const route of [...new Set(routeIds)]) {
    const routeArtifactDir = path.join(artifactDir, "route-check", route);
    await rm(routeArtifactDir, { recursive: true, force: true });
    await runChecked(
      "pnpm",
      [
        "--filter", "@clawd-strike/client", "exec", "node", "scripts/run-playwright-qa.mjs",
        "test", "playwright/bazaar-v3-traversal.spec.ts", "--workers=1",
        "--output", routeArtifactDir, "--trace", "off",
      ],
      {
        cwd: options.repoRoot,
        env: {
          ...process.env,
          BAZAAR_TRAVERSAL_SCOPE: "focused",
          BAZAAR_ROUTE: route,
        },
      },
    );
    await rm(routeArtifactDir, { recursive: true, force: true });
    completed.push(`focused route ${route}`);
  }
  await rm(path.join(artifactDir, "route-check"), { recursive: true, force: true });
  return completed;
}

async function runMinimumChecks(
  options: CliOptions,
  context: TaskContext,
  touchedFiles: readonly string[],
  mapRouteAdjacent = false,
  mapShared = false,
  routeIds: readonly string[] = [],
): Promise<string[]> {
  if (options.mode === "mock") return ["mock scoped checks passed"];
  const completed: string[] = [];
  await runChecked("pnpm", ["--filter", "@clawd-strike/client", "typecheck"], { cwd: options.repoRoot });
  completed.push("client typecheck");
  const shared = context.risk === "shared" || mapShared || touchedSharedMechanism(touchedFiles);
  if (shared) {
    if (!context.greenRegressionUnitId) throw new Error("actual changed files require shared-system evidence and a Green regression view");
    const focusedTest = focusedSharedTest(touchedFiles, mapShared);
    if (focusedTest && await exists(path.join(options.repoRoot, focusedTest))) {
      if (focusedTest.endsWith(".mjs")) {
        // Run the focused test that was actually selected, relative to the client package.
        const clientRelative = focusedTest.replace(/^apps\/client\//, "");
        await runChecked(
          "pnpm",
          ["--filter", "@clawd-strike/client", "exec", "node", "--test", clientRelative],
          { cwd: options.repoRoot },
        );
      } else {
        await runChecked(process.execPath, ["--import", "tsx", "--test", focusedTest], { cwd: options.repoRoot });
      }
      completed.push(`focused mechanism test ${focusedTest}`);
    } else {
      throw new Error("shared-system task requires an existing or justified focused mechanism test");
    }
  }
  if (context.risk === "route-adjacent" || mapRouteAdjacent) {
    completed.push(...await runRouteSpecificChecks(
      options,
      context.definition,
      context.artifactDir,
      routeIds.length > 0 ? routeIds : [focusedRouteForUnit(context.definition)],
    ));
  }
  return completed;
}

function captureViewInput(view: CaptureView): ImagePairInput["before"] {
  return {
    width: view.width ?? 0,
    height: view.height ?? 0,
    sha256: view.sha256 ?? "",
    skyOnly: view.skyOnly,
    corrupt: !view.valid,
    camera: view.camera.actual,
    zoneId: view.playerZoneId,
    runtimeErrors: view.consoleErrorCount,
  };
}

function captureViewAudit(view: CaptureView): CaptureViewAudit {
  return {
    width: view.width ?? 0,
    height: view.height ?? 0,
    sha256: view.sha256 ?? "",
    camera: view.camera.actual,
    playerZoneId: view.playerZoneId,
    skyOnly: view.skyOnly,
    consoleErrorCount: view.consoleErrorCount,
    valid: view.valid,
    errors: [...view.errors],
  };
}

function compactCompareResult(compare: CompareResult): CompareResult {
  return {
    before: {
      width: compare.before.width,
      height: compare.before.height,
      sha256: compare.before.sha256,
      ...(compare.before.corrupt !== undefined ? { corrupt: compare.before.corrupt } : {}),
    },
    after: {
      width: compare.after.width,
      height: compare.after.height,
      sha256: compare.after.sha256,
      ...(compare.after.corrupt !== undefined ? { corrupt: compare.after.corrupt } : {}),
    },
    meanAbsoluteDelta: compare.meanAbsoluteDelta,
    changedPixelRatio: compare.changedPixelRatio,
    ...(compare.effectivelyUnchanged !== undefined ? { effectivelyUnchanged: compare.effectivelyUnchanged } : {}),
  };
}

function taskPerformanceSummary(context: TaskContext, engine: EngineName = "codex"): unknown {
  const call = (telemetry: ModelCallTelemetry | null, role: ModelRole): unknown => telemetry
    ? { calls: 1, ...telemetry }
    : {
        calls: 0,
        engine,
        role,
        model: engine === "claude" ? CLAUDE_MODEL : CODEX_MODEL,
        effort: MODEL_ROLE_CONFIG[role].effort,
        wallMs: 0,
        usage: null,
      };
  const phases = {
    prepareMs: Math.round(context.performance.prepareMs),
    beforeCaptureMs: Math.round(context.performance.beforeCaptureMs),
    workOrderMs: Math.round(context.performance.workOrderMs),
    postWriterValidationMs: Math.round(context.performance.postWriterValidationMs),
    checksMs: Math.round(context.performance.checksMs),
    afterCaptureMs: Math.round(context.performance.afterCaptureMs),
    comparisonPackageMs: Math.round(context.performance.comparisonPackageMs),
    finalizeMs: Math.round(context.performance.finalizeMs),
  };
  const totalAutomationMs = Math.round(performance.now() - context.performance.startedAtMs);
  const nonModelMs = Object.values(phases).reduce((sum, value) => sum + value, 0);
  const budgetsMs = { writer: 600_000, reviewer: 120_000, nonModel: 180_000, total: 900_000 };
  const warnings = [
    ...(context.performance.writer && context.performance.writer.wallMs > budgetsMs.writer ? ["writer exceeded 10-minute target"] : []),
    ...(context.performance.reviewer && context.performance.reviewer.wallMs > budgetsMs.reviewer ? ["reviewer exceeded 2-minute target"] : []),
    ...(nonModelMs > budgetsMs.nonModel ? ["non-model tooling exceeded 3-minute target"] : []),
    ...(totalAutomationMs > budgetsMs.total ? ["task exceeded 15-minute target"] : []),
  ];
  return {
    schemaVersion: 1,
    totalAutomationMs,
    nonModelMs,
    phases,
    writer: call(context.performance.writer, "writer"),
    reviewer: call(context.performance.reviewer, "reviewer"),
    budgetsMs,
    warnings,
  };
}

function taskPerformanceLine(context: TaskContext): string {
  const writerMs = context.performance.writer?.wallMs ?? 0;
  const reviewerMs = context.performance.reviewer?.wallMs ?? 0;
  const writerTokens = context.performance.writer?.usage?.totalTokens;
  const reviewerTokens = context.performance.reviewer?.usage?.totalTokens;
  return `performance total=${Math.round(performance.now() - context.performance.startedAtMs)}ms writer=${writerMs}ms${writerTokens === undefined ? "" : `/${writerTokens}tok`} reviewer=${reviewerMs}ms${reviewerTokens === undefined ? "" : `/${reviewerTokens}tok`}`;
}

async function taskValidationEvidence(
  context: TaskContext,
  options: CliOptions,
  touchedFiles: readonly string[],
  completedChecks: readonly string[],
  after: CaptureManifest,
  validation: TaskPairValidation,
): Promise<TaskValidationEvidence> {
  const beforeUnit = taskCaptureUnit(context.before, context.unit.id);
  const afterUnit = taskCaptureUnit(after, context.unit.id);
  const greenRegression = context.greenRegressionUnitId
    ? (() => {
        const greenBefore = taskCaptureUnit(context.before, context.greenRegressionUnitId as string);
        const greenAfter = taskCaptureUnit(after, context.greenRegressionUnitId as string);
        return {
          unitId: context.greenRegressionUnitId as string,
          primary: {
            before: captureViewAudit(greenBefore.views.primary as CaptureView),
            after: captureViewAudit(greenAfter.views.primary as CaptureView),
          },
          context: {
            before: captureViewAudit(greenBefore.views.context as CaptureView),
            after: captureViewAudit(greenAfter.views.context as CaptureView),
          },
        };
      })()
    : null;
  const views: Record<string, ViewPairEvidence> = {};
  for (const view of context.definition.views) {
    const compare = validation.compares[view.id];
    const viewBefore = beforeUnit.views[view.id];
    const viewAfter = afterUnit.views[view.id];
    if (!compare || !viewBefore || !viewAfter) continue;
    views[view.id] = {
      before: captureViewAudit(viewBefore),
      after: captureViewAudit(viewAfter),
      comparison: compactCompareResult(compare),
      materiallyChanged: validation.materiallyChangedViewIds.includes(view.id),
      targetView: context.targetViewIds.includes(view.id),
    };
  }
  return {
    schemaVersion: 2,
    startCommit: context.startCommit,
    unitId: context.unit.id,
    zoneIds: [...context.definition.zoneIds],
    risk: context.risk,
    engine: options.engine,
    touchedFiles: [...touchedFiles].sort(),
    candidatePatchSha256: await fileSha256(path.join(context.artifactDir, "candidate.patch")),
    completedChecks: [...new Set([
      "protected-domain diff",
      ...completedChecks,
      "exact same-camera recapture",
      "runtime console-error check",
      "image-pair validity",
    ])],
    protectedAuthority: {
      before: context.before.protectedAuthorityHash,
      after: after.protectedAuthorityHash,
      unchanged: context.before.protectedAuthorityHash === after.protectedAuthorityHash,
    },
    targetViewIds: [...context.targetViewIds],
    views,
    ...(greenRegression ? { greenRegression } : {}),
    valid: validation.valid,
    reasons: [...validation.reasons],
  };
}


async function attachReviewPackageEvidence(
  context: TaskContext,
  evidence: TaskValidationEvidence,
  images: readonly string[],
  externalReviewerCalls: number,
): Promise<void> {
  evidence.reviewPackage = {
    images: await Promise.all(images.map(async (imagePath) => ({
      file: path.relative(context.artifactDir, imagePath),
      sha256: await fileSha256(imagePath),
    }))),
    externalReviewerCalls,
  };
}

async function assertRetainedTaskEvidence(
  artifactDir: string,
  evidence: TaskValidationEvidence,
): Promise<void> {
  if (await fileSha256(path.join(artifactDir, "candidate.patch")) !== evidence.candidatePatchSha256) {
    throw new Error("candidate patch evidence changed after visual validation");
  }
  if (!evidence.reviewPackage || evidence.reviewPackage.images.length < 4) {
    throw new Error("validated review-package evidence is missing");
  }
  for (const image of evidence.reviewPackage.images) {
    const imagePath = path.resolve(artifactDir, image.file);
    if (!imagePath.startsWith(`${path.resolve(artifactDir)}${path.sep}`)) {
      throw new Error("review-package evidence path escaped its artifact directory");
    }
    if (await fileSha256(imagePath) !== image.sha256) {
      throw new Error(`review image '${image.file}' changed after visual validation`);
    }
  }
}

type TaskPairValidation = {
  valid: boolean;
  reasons: string[];
  /** Per-view comparison keyed by view id. */
  compares: Record<string, CompareResult>;
  /** Views whose pixels changed materially (above the strict threshold). */
  materiallyChangedViewIds: string[];
};

async function validateTaskPair(
  options: CliOptions,
  context: TaskContext,
  after: CaptureManifest,
  touchedFiles: readonly string[],
): Promise<TaskPairValidation> {
  const beforeUnit = taskCaptureUnit(context.before, context.unit.id);
  const afterUnit = taskCaptureUnit(after, context.unit.id);
  const expectedDefinitions = [context.definition];
  if (context.greenRegressionUnitId) {
    const green = deriveReviewUnits(context.spec).find((definition) => definition.id === context.greenRegressionUnitId);
    if (green) expectedDefinitions.push(green);
  }
  const reasons = [...captureValidityReasons(after, expectedDefinitions)];
  if (context.before.protectedAuthorityHash !== after.protectedAuthorityHash) {
    reasons.push("runtime collision authority changed");
  }
  const relevantSourceChanged = touchedFiles.some(isRelevantMapSource);
  const compares: Record<string, CompareResult> = {};
  const materiallyChangedViewIds: string[] = [];
  const viewIds = context.definition.views.map((view) => view.id);
  for (const viewId of viewIds) {
    const viewBefore = beforeUnit.views[viewId];
    const viewAfter = afterUnit.views[viewId];
    if (!viewBefore || !viewAfter) {
      reasons.push(`${viewId} capture is missing`);
      continue;
    }
    const compare = await invokeCompare(options, viewBefore.imagePath, viewAfter.imagePath);
    compares[viewId] = compare;
    const materiallyChanged = !(compare.effectivelyUnchanged ?? false)
      && compare.before.sha256 !== compare.after.sha256;
    if (materiallyChanged) materiallyChangedViewIds.push(viewId);
    // Per-view recapture validity: dimensions, camera drift, sky-only, zone,
    // and console errors gate every view; the changed-pixel requirement is a
    // target-view requirement handled below.
    const probe = validateImagePair({
      before: { ...captureViewInput(viewBefore), ...compare.before },
      after: { ...captureViewInput(viewAfter), ...compare.after },
      meanAbsoluteDelta: compare.meanAbsoluteDelta,
      changedPixelRatio: compare.changedPixelRatio,
      expectedZoneId: context.definition.zoneIds[0] as string,
      relevantSourceChanged,
    });
    reasons.push(...probe.reasons
      .filter((reason) => !reason.includes("identical") && !reason.includes("effectively unchanged"))
      .map((reason) => `${viewId}: ${reason}`));
  }
  if (!context.targetViewIds.some((viewId) => materiallyChangedViewIds.includes(viewId))) {
    reasons.push(`no material change in any target view (${context.targetViewIds.join(", ")})`);
  }
  return {
    valid: reasons.length === 0,
    reasons: [...new Set(reasons)],
    compares,
    materiallyChangedViewIds,
  };
}

function reviewLabel(context: TaskContext): { afterLabel: "A" | "B"; beforeLabel: "A" | "B" } {
  const first = createHash("sha256").update(context.taskId).digest()[0] ?? 0;
  const afterLabel = first % 2 === 0 ? "A" : "B";
  return { afterLabel, beforeLabel: afterLabel === "A" ? "B" : "A" };
}

function reviewPrompt(context: TaskContext, imageOrder?: readonly string[]): string {
  const objective = context.objective;
  const orderSentence = imageOrder && imageOrder.length > 0
    ? imageOrder.join(", ")
    : `A-primary, A-context, B-primary, B-context${context.greenRegressionUnitId ? ", then A-green and B-green regression views" : ""}`;
  return boundedPrompt(`Blindly compare two versions of the same deterministic map views. Image order is ${orderSentence}. Views named elev:<wall> are square-on wall elevations of the named frontage/face; cross and upper are perpendicular and upward room views. You are not told which version is newer.

Objective: ${objective}
Criterion: prefer the version that more clearly meets this one objective without a visible regression, broken assembly, blocked opening, floating/intersecting geometry, or loss of clarity. Judge macro before meso before micro. ${DESIGN_REVIEW_LENS.join(" ")} Symmetry should communicate designed order; asymmetry and variation need a functional, structural, climatic, or historical cause rather than uniform jitter.

Composition is judged absolutely, not relatively: in the version you prefer, do openings and elements sit where a designer would put them—on an axis, in mirrored or rhythmic pairs, held back from corners or framed by pilasters, aligned to something visible—or is placement arbitrary (an opening jammed against a corner, evenly smeared modules, unrelated to the room or opposite wall)? Beating a blank wall does not make placement legible.${context.planImages ? " Plan crops (A-plan, B-plan) follow the render pairs and show each version's openings relative to the room, axis, entrances, and opposite walls; use them for alignment only, never for finish." : ""}

Return preferred A/B/tie; confidence; objectiveMetBy A/B/both/neither; designPreferred A/B/tie using the full lens; blockingDefectIn A/B/both/neither; compositionLogic legible/arbitrary/unclear for the preferred version; and one complete evidence-based reason ending in punctuation, preferably 160 characters or fewer. Do not infer chronology, code changes, or implementation.`, 380, "review prompt");
}

async function stageBlindReviewPackage(
  options: CliOptions,
  context: TaskContext,
  after: CaptureManifest,
  materiallyChangedViewIds: readonly string[],
): Promise<BlindReviewPackage> {
  const labels = reviewLabel(context);
  const reviewDir = path.join(context.artifactDir, "review");
  await rm(reviewDir, { recursive: true, force: true });
  await mkdir(reviewDir, { recursive: true });
  const beforeUnit = taskCaptureUnit(context.before, context.unit.id);
  const afterUnit = taskCaptureUnit(after, context.unit.id);
  const byLabel = new Map<"A" | "B", CaptureUnit>([
    [labels.beforeLabel, beforeUnit],
    [labels.afterLabel, afterUnit],
  ]);
  const images: string[] = [];
  const imageOrder: string[] = [];
  // A/B pairs for primary, context, and every additional view whose pixels
  // changed materially — target or not, so collateral changes are reviewed.
  const reviewViewIds = context.definition.views
    .map((view) => view.id)
    .filter((viewId) => (
      viewId === "primary"
      || viewId === "context"
      || materiallyChangedViewIds.includes(viewId)
    ));
  for (const viewId of reviewViewIds) {
    const fileSegment = baselineFileName(viewId).replace(/\.png$/, "");
    for (const label of ["A", "B"] as const) {
      const unit = byLabel.get(label) as CaptureUnit;
      const view = unit.views[viewId];
      if (!view) continue;
      const destination = path.join(reviewDir, `${label}-${fileSegment}.png`);
      await copyFile(view.imagePath, destination);
      images.push(destination);
      imageOrder.push(`${label}-${viewId}`);
    }
  }
  if (context.greenRegressionUnitId) {
    const greenBefore = taskCaptureUnit(context.before, context.greenRegressionUnitId);
    const greenAfter = taskCaptureUnit(after, context.greenRegressionUnitId);
    const greenByLabel = new Map<"A" | "B", CaptureUnit>([
      [labels.beforeLabel, greenBefore],
      [labels.afterLabel, greenAfter],
    ]);
    for (const label of ["A", "B"] as const) {
      const destination = path.join(reviewDir, `${label}-green.png`);
      await copyFile((greenByLabel.get(label) as CaptureUnit).views.primary?.imagePath as string, destination);
      images.push(destination);
      imageOrder.push(`${label}-green`);
    }
  }
  // Plan pair: same framing, neutral labels, rendered from the pre-edit SVG
  // snapshot and the regenerated SVG. Lets the reviewer judge where openings
  // sit relative to the room without revealing which version is newer.
  const beforeSvg = path.join(context.artifactDir, "plan-before.svg");
  if (context.planImages && await exists(beforeSvg)) {
    const planByLabel = new Map<"A" | "B", string | undefined>([
      [labels.beforeLabel, beforeSvg],
      [labels.afterLabel, undefined],
    ]);
    const rendered: string[] = [];
    for (const label of ["A", "B"] as const) {
      const destination = path.join(reviewDir, `${label}-plan.png`);
      const result = await renderPlanCrop(
        options,
        context.spec,
        context.definition,
        destination,
        `${label} · plan`,
        planByLabel.get(label),
      );
      if (result) rendered.push(result);
    }
    if (rendered.length === 2) {
      images.push(...rendered);
      imageOrder.push("A-plan", "B-plan");
      context.planImages.after = rendered[labels.afterLabel === "A" ? 0 : 1] as string;
    } else {
      for (const file of rendered) await rm(file, { force: true });
    }
  }
  return { afterLabel: labels.afterLabel, images, imageOrder };
}

async function compactValidatedTaskArtifacts(artifactDir: string): Promise<void> {
  for (const name of ["before", "after"]) {
    await rm(path.join(artifactDir, name), { recursive: true, force: true });
  }
  for (const name of [
    "pair-validation.json",
    "touched-files.json",
    "writer-result.json",
    "writer-result.json.schema.json",
    "review-result.json.schema.json",
    "plan-before.svg",
    "plan-before.png.json",
  ]) {
    await rm(path.join(artifactDir, name), { force: true });
  }
  for (const name of ["A-plan.png.json", "B-plan.png.json"]) {
    await rm(path.join(artifactDir, "review", name), { force: true });
  }
}

async function refreshPendingWorkOrder(context: TaskContext, requiresHumanTraversal = false): Promise<void> {
  let workOrder = await readFile(context.workOrderPath, "utf8");
  workOrder = workOrder
    .replace(/^Primary screenshot:.*$/m, "Primary review pair: review/A-primary.png and review/B-primary.png (chronology blinded)")
    .replace(/^Context screenshot:.*$/m, "Context review pair: review/A-context.png and review/B-context.png (chronology blinded)");
  if (context.greenRegressionUnitId && !workOrder.includes("Green regression pair:")) {
    workOrder += "\nGreen regression pair: review/A-green.png and review/B-green.png (chronology blinded)\n";
  }
  if (requiresHumanTraversal && !workOrder.includes("Human movement confirmation")) {
    workOrder += "\nHuman movement confirmation: required before acceptance.\n";
  }
  await writeFile(context.workOrderPath, workOrder, "utf8");
}

export function parseReviewer(value: unknown): ReviewerResult {
  if (!value || typeof value !== "object") throw new Error("reviewer result must be an object");
  const result = value as Partial<ReviewerResult>;
  if (!result.preferred || !["A", "B", "tie"].includes(result.preferred)) throw new Error("reviewer preferred is invalid");
  if (!result.designPreferred || !["A", "B", "tie"].includes(result.designPreferred)) {
    throw new Error("reviewer designPreferred is invalid");
  }
  if (!result.objectiveMetBy || !["A", "B", "both", "neither"].includes(result.objectiveMetBy)) {
    throw new Error("reviewer objectiveMetBy is invalid");
  }
  if (!result.blockingDefectIn || !["A", "B", "both", "neither"].includes(result.blockingDefectIn)) {
    throw new Error("reviewer blockingDefectIn is invalid");
  }
  if (!result.compositionLogic || !["legible", "arbitrary", "unclear"].includes(result.compositionLogic)) {
    throw new Error("reviewer compositionLogic is invalid");
  }
  if (
    typeof result.confidence !== "number"
    || result.confidence < 0
    || result.confidence > 1
  ) {
    throw new Error("reviewer result fields are invalid");
  }
  if (
    typeof result.reason !== "string"
    || result.reason.trim().length < 8
    || result.reason.trim().length > REVIEW_REASON_MAX
    || !/[.!?]$/.test(result.reason.trim())
  ) throw new Error("reviewer reason is invalid");
  return { ...result, reason: result.reason.trim() } as ReviewerResult;
}

async function reviewTask(
  options: CliOptions,
  context: TaskContext,
  reviewPackage: BlindReviewPackage,
): Promise<{ result: ReviewerResult; afterLabel: "A" | "B"; telemetry: ModelCallTelemetry | null }> {
  if (options.mode === "mock") {
    const preferred = options.mockReview === "accept"
      ? reviewPackage.afterLabel
      : options.mockReview === "reject"
        ? (reviewPackage.afterLabel === "A" ? "B" : "A")
        : "tie";
    return {
      afterLabel: reviewPackage.afterLabel,
      telemetry: null,
      result: {
        preferred,
        designPreferred: preferred,
        objectiveMetBy: options.mockReview === "accept" ? reviewPackage.afterLabel : "neither",
        blockingDefectIn: options.mockReview === "reject" ? reviewPackage.afterLabel : "neither",
        compositionLogic: options.mockReview === "accept" ? "legible" : "unclear",
        confidence: options.mockReview === "defer" ? 0.45 : 0.9,
        reason: `Mock ${options.mockReview} review for workflow validation.`,
      },
    };
  }
  const response = await invokeEngineJson(options.engine, {
    repoRoot: options.repoRoot,
    prompt: reviewPrompt(context, reviewPackage.imageOrder),
    images: reviewPackage.images,
    schema: reviewerSchema(),
    resultPath: path.join(context.artifactDir, "review-result.json"),
    role: "reviewer",
  });
  try {
    return { result: parseReviewer(response.value), afterLabel: reviewPackage.afterLabel, telemetry: response.telemetry };
  } catch (error) {
    throw new CodexInvocationError(
      `${options.engine} reviewer result was malformed: ${error instanceof Error ? error.message : String(error)}`,
      response.telemetry,
    );
  }
}

export function proposedOutcome(
  review: ReviewerResult,
  afterLabel: "A" | "B",
): "accept" | "reject" | "defer" {
  const beforeLabel = afterLabel === "A" ? "B" : "A";
  const objectiveMet = review.objectiveMetBy === afterLabel || review.objectiveMetBy === "both";
  const candidateBlocked = review.blockingDefectIn === afterLabel || review.blockingDefectIn === "both";
  const designRegressed = review.designPreferred === beforeLabel;
  if (review.confidence < DESIGN_CONFIDENCE_MIN) return "defer";
  if (
    candidateBlocked
    || designRegressed
    || (review.preferred !== "tie" && review.preferred !== afterLabel)
  ) {
    return "reject";
  }
  // A candidate that wins the pair but whose placement is arbitrary is not an
  // improvement worth baselining: it would be polished on later passes instead
  // of composed. Defer it for the human with the reviewer's reason retained.
  if (review.preferred === afterLabel && objectiveMet && review.compositionLogic !== "arbitrary") return "accept";
  return "defer";
}

type AcceptedBaselineStage = {
  evidence: UnitEvidence;
  baselineDir: string;
  backupDir: string;
  hadPrevious: boolean;
};

async function stageAcceptedBaseline(
  options: CliOptions,
  unitId: string,
  viewIds: readonly string[],
  viewSources: Record<string, string>,
  outcomeSummary: unknown,
  transactionDir: string,
): Promise<AcceptedBaselineStage> {
  const baselineDir = path.join(options.artifactsRoot, "baselines", unitId);
  const backupDir = path.join(transactionDir, ".previous-baseline");
  await rm(backupDir, { recursive: true, force: true });
  const hadPrevious = await exists(baselineDir);
  if (hadPrevious) {
    await mkdir(path.dirname(backupDir), { recursive: true });
    await rename(baselineDir, backupDir);
  }
  const evidence: UnitEvidence = { primary: null, context: null };
  try {
    await mkdir(baselineDir, { recursive: true });
    for (const viewId of viewIds) {
      const fileName = baselineFileName(viewId);
      const destination = path.join(baselineDir, fileName);
      const source = viewSources[viewId];
      if (source) {
        await copyFile(source, destination);
      } else if (hadPrevious && await exists(path.join(backupDir, fileName))) {
        // A view whose pixels did not change materially keeps its prior
        // accepted baseline image.
        await copyFile(path.join(backupDir, fileName), destination);
      } else {
        evidence[viewId] = null;
        continue;
      }
      evidence[viewId] = portablePath(options.repoRoot, destination);
    }
    if (!evidence.primary || !evidence.context) {
      throw new Error("accepted baseline requires primary and context view images");
    }
    await writeJsonAtomic(path.join(baselineDir, "latest-outcome.json"), outcomeSummary);
  } catch (error) {
    await rm(baselineDir, { recursive: true, force: true });
    if (hadPrevious) await rename(backupDir, baselineDir);
    throw error;
  }
  return {
    evidence,
    baselineDir,
    backupDir,
    hadPrevious,
  };
}

async function rollbackAcceptedBaseline(stage: AcceptedBaselineStage): Promise<void> {
  await rm(stage.baselineDir, { recursive: true, force: true });
  if (stage.hadPrevious && await exists(stage.backupDir)) {
    await rename(stage.backupDir, stage.baselineDir);
  }
}

async function finishAcceptedBaseline(stage: AcceptedBaselineStage): Promise<void> {
  await rm(stage.backupDir, { recursive: true, force: true });
}

async function commitAcceptedTask(
  options: CliOptions,
  context: TaskContext,
  touchedFiles: readonly string[],
): Promise<void> {
  await runChecked("git", ["add", "--", ...touchedFiles, workflowStateFile(options)], { cwd: options.repoRoot });
  await runChecked("git", ["commit", "-m", `map-polish: ${context.unit.id} ${context.unit.defects[0] ?? "visual improvement"}`], {
    cwd: options.repoRoot,
  });
}

async function restoreWorkflowStateIndex(options: CliOptions, startCommit: string): Promise<void> {
  const stateFile = workflowStateFile(options);
  const tree = await runChecked("git", ["ls-tree", startCommit, "--", stateFile], { cwd: options.repoRoot });
  const match = /^(\d+) blob ([0-9a-f]+)\t/.exec(tree.stdout.trim());
  if (match) {
    await runChecked(
      "git",
      ["update-index", "--add", "--cacheinfo", `${match[1]},${match[2]},${stateFile}`],
      { cwd: options.repoRoot },
    );
    return;
  }
  await runChecked("git", ["update-index", "--force-remove", "--", stateFile], { cwd: options.repoRoot });
}

export function candidateTouchesMapAuthority(touchedFiles: readonly string[]): boolean {
  return touchedFiles.includes(MAP_SPEC_PATH);
}

async function regenerateMapEvidence(options: CliOptions): Promise<void> {
  if (!(await exists(path.join(options.repoRoot, "apps/client/package.json")))) return;
  await runChecked("pnpm", ["--filter", "@clawd-strike/client", "gen:layout-reference"], { cwd: options.repoRoot });
  await runChecked("pnpm", ["--filter", "@clawd-strike/client", "gen:maps"], { cwd: options.repoRoot });
}

async function restoreCandidateAndEvidence(
  options: CliOptions,
  startCommit: string,
  touchedFiles: readonly string[],
): Promise<void> {
  await restoreCandidateFiles({ repoRoot: options.repoRoot, startCommit, touchedFiles });
  if (candidateTouchesMapAuthority(touchedFiles)) await regenerateMapEvidence(options);
}

async function rejectCandidate(
  options: CliOptions,
  context: TaskContext,
  touchedFiles: readonly string[],
  outcome: "reject" | "defer",
  reason: string,
  restore = true,
): Promise<MapPolishState> {
  if (restore) await restoreCandidateAndEvidence(options, context.startCommit, touchedFiles);
  let rejectedTactic = options.diagnosis;
  if (!rejectedTactic) {
    try {
      const writer = JSON.parse(await readFile(path.join(context.artifactDir, "writer-result.json"), "utf8")) as { summary?: unknown };
      if (typeof writer.summary === "string" && writer.summary.trim()) rejectedTactic = writer.summary.trim().slice(0, 180);
    } catch {
      rejectedTactic = undefined;
    }
  }
  const materiallyDifferentNext = outcome === "reject" && Boolean(options.nextAction?.trim());
  const state = updateOutcome(context.state, {
    unitId: context.unit.id,
    outcome,
    rejectedTactic: rejectedTactic ?? `Bounded attempt did not resolve: ${context.unit.defects[0] ?? "selected visual defect"}`,
    ...(!materiallyDifferentNext ? { deferredReason: reason } : {}),
    ...(options.nextAction ? { nextAction: options.nextAction } : {}),
    shared: context.risk === "shared",
  });
  await writeStateFile(options.statePath, state);
  await cleanupRejectedArtifacts(context.artifactDir, options.keepDebug);
  return state;
}

async function abortInfrastructureFailure(
  options: CliOptions,
  context: TaskContext,
  touchedFiles: readonly string[],
): Promise<void> {
  await restoreCandidateAndEvidence(options, context.startCommit, touchedFiles);
  await writeStateFile(options.statePath, context.state);
  await cleanupRejectedArtifacts(context.artifactDir, options.keepDebug);
}

async function handleFocusedCheckFailure(
  options: CliOptions,
  context: TaskContext,
  touchedFiles: readonly string[],
  mapRouteAdjacent: boolean,
  mapShared: boolean,
  routeIds: readonly string[],
): Promise<Error | null> {
  await restoreCandidateAndEvidence(options, context.startCommit, touchedFiles);
  try {
    await runMinimumChecks(options, context, touchedFiles, mapRouteAdjacent, mapShared, routeIds);
  } catch (baselineError) {
    await writeStateFile(options.statePath, context.state);
    await cleanupRejectedArtifacts(context.artifactDir, options.keepDebug);
    return baselineError instanceof Error ? baselineError : new Error(String(baselineError));
  }
  await rejectCandidate(
    options,
    context,
    touchedFiles,
    "reject",
    "A required focused check failed only with the candidate applied.",
    false,
  );
  return null;
}

async function finalizeAutomaticTask(
  options: CliOptions,
  context: TaskContext,
  touchedFiles: string[],
  after: CaptureManifest,
  review: ReviewerResult,
  afterLabel: "A" | "B",
  evidence: TaskValidationEvidence,
): Promise<{ outcome: "accept" | "reject" | "defer"; state: MapPolishState }> {
  const finalizeStartedAt = performance.now();
  const outcome = proposedOutcome(review, afterLabel);
  const summary = {
    schemaVersion: 1,
    unitId: context.unit.id,
    objective: context.objective,
    outcome,
    review,
    blindAfterLabel: afterLabel,
    writer: await readWriterRationale(context.artifactDir),
    evidence,
    performance: taskPerformanceSummary(context, options.engine),
  };
  const outcomePath = path.join(context.artifactDir, "outcome.json");
  await writeJsonAtomic(outcomePath, summary);
  const artifactEvidenceHash = await fileSha256(outcomePath);
  if (outcome !== "accept") {
    const state = await rejectCandidate(options, context, touchedFiles, outcome, review.reason);
    return { outcome, state };
  }
  const afterUnit = taskCaptureUnit(after, context.unit.id);
  const baseline = await stageAcceptedBaseline(
    options,
    context.unit.id,
    context.definition.views.map((view) => view.id),
    Object.fromEntries(
      Object.entries(afterUnit.views).map(([viewId, view]) => [viewId, view.imagePath]),
    ),
    summary,
    context.artifactDir,
  );
  const state = pruneState({
    ...updateOutcome(context.state, {
      unitId: context.unit.id,
      outcome: "accept",
      ...(options.remainingDefect ? { remainingDefect: options.remainingDefect } : {}),
      shared: context.risk === "shared",
    }),
    sourceFingerprint: await sourceWorktreeFingerprint(options),
  });
  const target = state.units.find((unit) => unit.id === context.unit.id);
  if (target) target.evidence = baseline.evidence;
  try {
    await writeStateFile(options.statePath, state);
    if (options.commit) await commitAcceptedTask(options, context, touchedFiles);
  } catch (error) {
    await rollbackAcceptedBaseline(baseline);
    const recovery = pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(
        context,
        "awaiting-human",
        touchedFiles,
        "accept",
        afterLabel,
        artifactEvidenceHash,
      ),
    });
    await writeStateFile(options.statePath, recovery);
    await restoreWorkflowStateIndex(options, context.startCommit);
    await refreshPendingWorkOrder(context);
    await compactValidatedTaskArtifacts(context.artifactDir);
    throw new Error(`accepted candidate was retained for recovery because the local checkpoint failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  await finishAcceptedBaseline(baseline);
  await rm(context.artifactDir, { recursive: true, force: true });
  context.performance.finalizeMs = performance.now() - finalizeStartedAt;
  await writeJsonAtomic(path.join(baseline.baselineDir, "latest-outcome.json"), {
    ...summary,
    performance: taskPerformanceSummary(context, options.engine),
  });
  return { outcome, state };
}

async function prepareDryRunTask(options: CliOptions, io: CliIo): Promise<void> {
  const loaded = await loadStateAndSpec(options);
  if (loaded.state.activeTask) throw new Error(`active task '${loaded.state.activeTask.id}' must be resolved with map:verify`);
  if (loaded.state.surveyRequired || loaded.state.surveyedAuthorityHash !== loaded.authorityHash) {
    throw new Error("full-map survey is required before implementation");
  }
  if (loaded.state.milestone.required) throw new Error("milestone verification is required before another task");
  const unit = selectNextUnit(loaded.state);
  if (!unit) throw new Error("no Red or Yellow review unit is eligible; stop for human owner review");
  const definition = deriveReviewUnits(loaded.spec).find((candidate) => candidate.id === unit.id);
  if (!definition) throw new Error(`review definition missing for '${unit.id}'`);
  const risk = options.risk ?? inferTaskRisk(unit);
  const sharedSelection = validateSharedSelection(loaded.state, unit, { ...options, risk });
  const greenRegressionUnitId = sharedSelection?.greenRegressionUnitId;
  if (options.concept) {
    if (!(await exists(options.concept))) throw new Error(`concept image does not exist: ${options.concept}`);
    if (!conceptAllowed(unit)) throw new Error("concept image is not allowed for this unit's rating/defect type");
  }
  const objective = taskObjective(loaded.state, unit, options.objective);
  const outputDir = path.join(options.artifactsRoot, "dry-run");
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const captureDefinitions = [definition];
  if (greenRegressionUnitId) {
    const green = deriveReviewUnits(loaded.spec).find((candidate) => candidate.id === greenRegressionUnitId);
    if (!green) throw new Error(`Green regression definition missing for '${greenRegressionUnitId}'`);
    captureDefinitions.push(green);
  }
  const ownershipPaths = await traceOwnership(options.repoRoot, unit, risk);
  await writeJsonAtomic(path.join(outputDir, "capture-plan.json"), singleUnitPlan(loaded.authorityHash, captureDefinitions));
  await writeFile(path.join(outputDir, "work-order.md"), buildWorkOrder({
    unit,
    definition,
    primaryScreenshot: unit.evidence.primary ?? "<capture primary at task start>",
    contextScreenshot: unit.evidence.context ?? "<capture context at task start>",
    ...(options.concept ? { conceptImage: options.concept } : {}),
    objective,
    risk,
    ownershipPaths,
    permittedPaths: permittedSourcePaths(risk, ownershipPaths),
    checks: requiredChecks(risk, definition),
    ...(sharedSelection ? { sharedCause: sharedSelection.sharedCause, sharedEvidence: sharedSelection.evidence } : {}),
    ...(unit.rejectedTactics.at(-1) ? { priorRejectedTactic: unit.rejectedTactics.at(-1) as string } : {}),
  }), "utf8");
  io.stdout(`Task dry run: ${unit.id}; no capture, model call, source edit, or state update. Plan=${outputDir}\n`);
}

async function executeTask(options: CliOptions, io: CliIo): Promise<"accept" | "reject" | "defer" | "pending"> {
  if (options.dryRun) {
    await prepareDryRunTask(options, io);
    return "pending";
  }
  if (options.mode === "real" && (!options.objective || !options.risk)) {
    throw new Error("real map:run requires explicit --objective and --risk after map:next ownership/actionability preflight");
  }
  const context = await prepareTask(options);
  try {
  const requiresHumanTraversal = false;
  if (options.mode === "manual") {
    const state = pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(context, "awaiting-writer"),
    });
    await writeStateFile(options.statePath, state);
    io.stdout(`Work order ready without a model call: ${context.workOrderPath}\nEdit only this candidate, then run ${workflowCommand("map:verify", options)} to build the A/B package.\n`);
    return "pending";
  }
  await writeStateFile(options.statePath, pruneState({
    ...context.state,
    activeTask: activeTaskFromContext(context, "awaiting-writer"),
  }));
  try {
    context.performance.writer = await invokeWriter(options, context);
  } catch (error) {
    if (error instanceof CodexInvocationError) context.performance.writer = error.telemetry;
    const stateFile = workflowStateFile(options);
    const touchedFiles = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== stateFile);
    const headChanged = await currentCommit(options.repoRoot) !== context.startCommit;
    if (!headChanged && touchedFiles.length > 0) {
      await rejectCandidate(
        { ...options, diagnosis: "Writer failed after a partial edit before producing a valid result." },
        context,
        touchedFiles,
        "reject",
        "Writer failed after a partial candidate edit.",
      );
      io.stderr(`Codex failed after a partial edit; the candidate was restored and no Claude fallback was used. Work order: ${context.workOrderPath}\n${boundedDiagnostic(error instanceof Error ? error.message : String(error))}\n`);
      return "reject";
    }
    if (headChanged) await writeJsonAtomic(path.join(context.artifactDir, "touched-files.json"), touchedFiles);
    const state = headChanged
      ? pruneState({
          ...context.state,
          activeTask: activeTaskFromContext(context, "blocked", touchedFiles),
        })
      : context.state;
    await writeStateFile(options.statePath, state);
    io.stderr(`Codex is unavailable or failed; no Claude fallback was used. Work order: ${context.workOrderPath}${headChanged ? "\nWriter changed HEAD; manual recovery is required." : `\nNo source edit occurred; rerun ${workflowCommand("map:run", options)} or use --mode manual.`}\n${boundedDiagnostic(error instanceof Error ? error.message : String(error))}\n`);
    return "pending";
  }
  const postWriterStartedAt = performance.now();
  if (await currentCommit(options.repoRoot) !== context.startCommit) {
    const touchedFiles = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== workflowStateFile(options));
    const state = pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(context, "blocked", touchedFiles),
    });
    await writeStateFile(options.statePath, state);
    io.stderr("Writer changed HEAD; task is blocked for manual recovery and no automated rollback was attempted.\n");
    return "pending";
  }
  let touchedFiles = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== workflowStateFile(options));
  if (candidateTouchesMapAuthority(touchedFiles)) {
    try {
      await regenerateMapEvidence(options);
      touchedFiles = (await collectTouchedFiles(options.repoRoot))
        .filter((file) => file !== workflowStateFile(options));
    } catch (error) {
      await rejectCandidate(options, context, touchedFiles, "reject", "Candidate map authority could not regenerate its runtime evidence.");
      io.stderr(`Candidate restored: map evidence regeneration failed (${boundedDiagnostic(error instanceof Error ? error.message : String(error))}).\n`);
      return "reject";
    }
  }
  if (touchedFiles.length > 32) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate touched more than 32 files and was not bounded.");
    io.stderr("Candidate rejected: touched-file scope was not bounded.\n");
    return "reject";
  }
  const outOfScopeFiles = touchedFiles.filter((file) => !isAllowedCandidateFile(file));
  if (outOfScopeFiles.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate changed files outside map-visual ownership.");
    io.stderr(`Candidate restored before checks: out-of-scope files changed (${outOfScopeFiles.join(", ")}).\n`);
    return "reject";
  }
  const outsidePermitted = outsidePermittedSourceFiles(context.permittedPaths, touchedFiles);
  if (outsidePermitted.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate crossed the work order's permitted source boundary.");
    io.stderr(`Candidate restored before checks: hard source boundary crossed (${outsidePermitted.join(", ")}).\n`);
    return "reject";
  }
  if (!touchedFiles.some(isRelevantMapSource)) {
    await rejectCandidate(options, context, touchedFiles, "reject", "No relevant map source file changed.");
    io.stderr("Candidate restored before checks: no relevant map source file changed.\n");
    return "reject";
  }
  const beforeIntegrityReasons = await captureFileIntegrityReasons(context.before);
  if (beforeIntegrityReasons.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Before-capture evidence changed after writer handoff.");
    io.stderr(`Candidate restored before checks: ${beforeIntegrityReasons.join(" | ")}.\n`);
    return "reject";
  }
  try {
    await captureCandidatePatch({
      repoRoot: options.repoRoot,
      startCommit: context.startCommit,
      touchedFiles,
      outputPath: path.join(context.artifactDir, "candidate.patch"),
    });
    await writeJsonAtomic(path.join(context.artifactDir, "touched-files.json"), touchedFiles);
    await writeStateFile(options.statePath, pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(context, "blocked", touchedFiles),
    }));
  } catch (error) {
    await rejectCandidate(
      { ...options, diagnosis: "Candidate patch could not be captured safely." },
      context,
      touchedFiles,
      "reject",
      "Candidate patch capture failed.",
    );
    io.stderr(`Candidate patch capture failed; candidate was restored: ${error instanceof Error ? error.message : String(error)}\n`);
    return "reject";
  }
  let currentMap: Awaited<ReturnType<typeof readMapSpecFile>>;
  let baseSpec: MapSpec;
  try {
    currentMap = await readMapSpecFile(options.mapSpecPath);
    baseSpec = await mapSpecAtCommit(options.repoRoot, context.startCommit);
  } catch (error) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Map authority became unreadable during the candidate.");
    io.stderr(`Candidate rejected and restored: ${error instanceof Error ? error.message : String(error)}\n`);
    return "reject";
  }
  const protectedReasons = detectProtectedChanges(baseSpec, currentMap.spec, touchedFiles);
  if (mapSpecSurveyCameraAuthorityChanged(baseSpec, currentMap.spec)) {
    protectedReasons.push("survey camera authority changed");
  }
  if (protectedReasons.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Explicit owner scope expansion is required for protected gameplay changes.");
    io.stderr(`Candidate blocked and restored: ${protectedReasons.join(" | ")}\n`);
    return "reject";
  }
  const locality = inspectCandidateLocality({
    baseSpec,
    currentSpec: currentMap.spec,
    touchedFiles,
    ownershipPaths: context.ownershipPaths,
    selectedZoneIds: context.definition.zoneIds,
  });
  const mapShared = locality.mapShared;
  const mapRouteAdjacent = mapSpecRouteAdjacentChanged(baseSpec, currentMap.spec);
  const changedRouteZoneIds = mapSpecRouteChangedZoneIds(baseSpec, currentMap.spec);
  const foreignRouteZones = changedRouteZoneIds.filter((zoneId) => !context.definition.zoneIds.includes(zoneId));
  if (locality.requiresSharedEvidence && context.risk !== "shared") {
    await rejectCandidate(
      { ...options, nextAction: "Retry as one shared-system task with evidence from two weak units and one Green regression view." },
      context,
      touchedFiles,
      "reject",
      `Changed files escaped bounded unit ownership (${candidateLocalitySummary(locality)}).`,
    );
    io.stderr(`Candidate restored: shared-system evidence is required (${candidateLocalitySummary(locality)}).\n`);
    return "reject";
  }
  if (foreignRouteZones.length > 0 && context.risk !== "shared") {
    await rejectCandidate(options, context, touchedFiles, "reject", "Route-adjacent edits crossed the selected review-unit boundary.");
    io.stderr(`Candidate restored: route-adjacent edits touched other zones (${foreignRouteZones.join(", ")}). Split the task.\n`);
    return "reject";
  }
  if (mapRouteAdjacent && context.risk === "pure") {
    await rejectCandidate(
      { ...options, nextAction: "Retry as a route-adjacent task with focused agent traversal." },
      context,
      touchedFiles,
      "reject",
      "Actual placement changes require route-adjacent validation.",
    );
    io.stderr("Candidate restored: actual map placement changes require a route-adjacent retry.\n");
    return "reject";
  }
  const routeDefinitions = deriveReviewUnits(currentMap.spec);
  const routeIds = changedRouteZoneIds
    .map((zoneId) => routeDefinitions.find((definition) => definition.zoneIds.includes(zoneId)))
    .filter((definition): definition is ReviewUnitDefinition => Boolean(definition))
    .map(focusedRouteForUnit);
  context.performance.postWriterValidationMs = performance.now() - postWriterStartedAt;
  let completedChecks: string[];
  const checksStartedAt = performance.now();
  try {
    completedChecks = await runMinimumChecks(
      options,
      context,
      touchedFiles,
      mapRouteAdjacent,
      mapShared,
      routeIds,
    );
    context.performance.checksMs = performance.now() - checksStartedAt;
  } catch (error) {
    context.performance.checksMs = performance.now() - checksStartedAt;
    const baselineError = await handleFocusedCheckFailure(
      options, context, touchedFiles, mapRouteAdjacent, mapShared, routeIds,
    );
    if (baselineError) {
      io.stderr(`Candidate restored without consuming an attempt because the baseline check is already failing: ${baselineError.message}\n`);
      return "pending";
    }
    io.stderr(`Candidate rejected because the focused check failed only with the candidate applied: ${boundedDiagnostic(error instanceof Error ? error.message : String(error))}\n`);
    return "reject";
  }
  const captureDefinitions = [context.definition];
  if (context.greenRegressionUnitId) {
    const definition = deriveReviewUnits(context.spec).find((entry) => entry.id === context.greenRegressionUnitId);
    if (definition) captureDefinitions.push(definition);
  }
  let after: CaptureManifest;
  const afterCaptureStartedAt = performance.now();
  try {
    after = await invokeCapture(
      options,
      singleUnitPlan(context.authorityHash, captureDefinitions),
      path.join(context.artifactDir, "after"),
      "after",
    );
    context.performance.afterCaptureMs = performance.now() - afterCaptureStartedAt;
  } catch (error) {
    await abortInfrastructureFailure(options, context, touchedFiles);
    io.stderr(`Candidate restored without consuming an attempt because recapture failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return "reject";
  }
  let validation: TaskPairValidation;
  const comparisonStartedAt = performance.now();
  try {
    validation = await validateTaskPair(options, context, after, touchedFiles);
  } catch (error) {
    await abortInfrastructureFailure(options, context, touchedFiles);
    io.stderr(`Candidate restored without consuming an attempt because comparison failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return "reject";
  }
  await writeJsonAtomic(path.join(context.artifactDir, "pair-validation.json"), validation);
  if (!validation.valid) {
    await rejectCandidate(options, context, touchedFiles, "reject", validation.reasons[0] ?? "Invalid image comparison.");
    io.stderr(`Comparison rejected before reviewer invocation: ${validation.reasons.join(" | ")}\n`);
    return "reject";
  }
  const evidence = await taskValidationEvidence(context, options, touchedFiles, completedChecks, after, validation);
  let reviewPackage: BlindReviewPackage;
  try {
    reviewPackage = await stageBlindReviewPackage(options, context, after, validation.materiallyChangedViewIds);
  } catch (error) {
    await abortInfrastructureFailure(options, context, touchedFiles);
    io.stderr(`Candidate restored without consuming an attempt because review packaging failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return "reject";
  }
  context.performance.comparisonPackageMs = performance.now() - comparisonStartedAt;
  await attachReviewPackageEvidence(context, evidence, reviewPackage.images, 0);
  let reviewed: { result: ReviewerResult; afterLabel: "A" | "B"; telemetry: CodexCallTelemetry | null };
  try {
    reviewed = await reviewTask(options, context, reviewPackage);
    context.performance.reviewer = reviewed.telemetry;
  } catch (error) {
    if (error instanceof CodexInvocationError) context.performance.reviewer = error.telemetry;
    if (evidence.reviewPackage && options.mode === "real") evidence.reviewPackage.externalReviewerCalls = 1;
    await writeFile(path.join(context.artifactDir, "manual-review.txt"), `${reviewPrompt(context)}\n`, "utf8");
    const outcomePath = path.join(context.artifactDir, "outcome.json");
    await writeJsonAtomic(outcomePath, {
      schemaVersion: 1,
      unitId: context.unit.id,
      objective: context.objective,
      status: "manual-review-required",
      evidence,
      performance: taskPerformanceSummary(context, options.engine),
    });
    const artifactEvidenceHash = await fileSha256(outcomePath);
    await refreshPendingWorkOrder(context, requiresHumanTraversal);
    await compactValidatedTaskArtifacts(context.artifactDir);
    const state = pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(
        context,
        "awaiting-human",
        touchedFiles,
        undefined,
        reviewPackage.afterLabel,
        artifactEvidenceHash,
      ),
    });
    await writeStateFile(options.statePath, state);
    io.stderr(`Codex image review was unavailable; blind manual package retained at ${path.join(context.artifactDir, "review")}. No Claude fallback was used. ${error instanceof Error ? error.message : String(error)}\n`);
    return "pending";
  }
  if (evidence.reviewPackage && options.mode === "real") evidence.reviewPackage.externalReviewerCalls = 1;
  await writeJsonAtomic(path.join(context.artifactDir, "review-result.json"), reviewed.result);
  const outcome = proposedOutcome(reviewed.result, reviewed.afterLabel);
  if (!options.commit) {
    const outcomePath = path.join(context.artifactDir, "outcome.json");
    await writeJsonAtomic(outcomePath, {
      schemaVersion: 1,
      unitId: context.unit.id,
      objective: context.objective,
      proposedOutcome: outcome,
      writer: await readWriterRationale(context.artifactDir),
      evidence,
      performance: taskPerformanceSummary(context, options.engine),
    });
    const artifactEvidenceHash = await fileSha256(outcomePath);
    await refreshPendingWorkOrder(context, requiresHumanTraversal);
    await compactValidatedTaskArtifacts(context.artifactDir);
    const state = pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(
        context,
        "awaiting-human",
        touchedFiles,
        outcome,
        reviewed.afterLabel,
        artifactEvidenceHash,
      ),
    });
    await writeStateFile(options.statePath, state);
    const disposition = outcome === "accept" ? "accept" : outcome;
    io.stdout(`Candidate is pending human ${outcome}: ${context.artifactDir}. Resolve with ${workflowCommand("map:verify", options, [`--${disposition}`, ...(disposition === "accept" ? ["--commit"] : [])])}${disposition === "accept" ? ", or omit --commit and stop with local changes" : ""}.\n`);
    return "pending";
  }
  try {
    await assertRetainedTaskEvidence(context.artifactDir, evidence);
    await assertCandidateUnchanged(
      options,
      activeTaskFromContext(context, "awaiting-human", touchedFiles, outcome, reviewed.afterLabel),
      context.artifactDir,
    );
  } catch (error) {
    await writeStateFile(options.statePath, pruneState({
      ...context.state,
      activeTask: activeTaskFromContext(context, "blocked", touchedFiles, outcome, reviewed.afterLabel),
    }));
    io.stderr(`Candidate changed after visual validation; local commit was blocked: ${error instanceof Error ? error.message : String(error)}\n`);
    return "pending";
  }
  const final = await finalizeAutomaticTask(
    options,
    context,
    touchedFiles,
    after,
    reviewed.result,
    reviewed.afterLabel,
    evidence,
  );
  io.stdout(`Task ${context.taskId}: ${final.outcome}${final.outcome === "accept" ? " (local commit created; not pushed)" : ""}\n`);
  return final.outcome;
  } finally {
    if (options.mode !== "manual") io.stdout(`${taskPerformanceLine(context)}\n`);
  }
}

async function runTasks(options: CliOptions, io: CliIo): Promise<number> {
  if (options.maxTasks > 1 && !options.commit) throw new Error("--max-tasks greater than 1 requires --commit");
  if (options.mode === "real" && options.maxTasks > 1) {
    throw new Error("real mode runs one explicitly scoped task at a time; repeat map:next and map:run instead of reusing one objective/risk");
  }
  for (let index = 0; index < options.maxTasks; index += 1) {
    const outcome = await executeTask(options, io);
    if (outcome !== "accept" || !options.commit) break;
    if (index + 1 >= options.maxTasks) break;
    const loaded = await loadStateAndSpec(options);
    const stopReason = loaded.state.activeTask
      ? "an active task requires resolution"
      : loaded.state.surveyRequired || loaded.state.surveyedAuthorityHash !== loaded.authorityHash
        ? "a resurvey is required"
        : loaded.state.milestone.required
          ? "milestone verification is required"
          : selectNextUnit(loaded.state) === null
            ? "no Red or Yellow unit remains eligible; stop for owner review"
            : null;
    if (stopReason) {
      io.stdout(`Bounded run stopped cleanly after ${index + 1} accepted task(s): ${stopReason}.\n`);
      break;
    }
  }
  return 0;
}

async function deferSelectedUnit(options: CliOptions, io: CliIo): Promise<number> {
  const diagnosis = conciseText(options.diagnosis, 220);
  if (!diagnosis) throw new Error("--defer-selected requires --diagnosis with the bounded ownership/actionability blocker");
  const loaded = await loadStateAndSpec(options);
  if (loaded.state.activeTask) throw new Error(`resolve active task '${loaded.state.activeTask.id}' before preflight deferral`);
  if (loaded.state.surveyRequired || loaded.state.surveyedAuthorityHash !== loaded.authorityHash) {
    throw new Error("full-map survey is required before preflight deferral");
  }
  if (loaded.state.milestone.required) throw new Error("milestone verification is required before preflight deferral");
  const selected = selectNextUnit(loaded.state);
  if (!selected) throw new Error("no Red or Yellow review unit is eligible");
  const stateFile = workflowStateFile(options);
  if (options.mode === "manual") {
    const unrelated = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== stateFile);
    if (unrelated.length > 0) throw new Error(`manual preflight deferral refuses unrelated changes: ${unrelated.join(", ")}`);
  } else {
    await assertAutomaticWorktree(options.repoRoot, [stateFile]);
  }
  const next = updateOutcome(loaded.state, {
    unitId: selected.id,
    outcome: "defer",
    deferredReason: diagnosis,
    ...(options.nextAction ? { nextAction: options.nextAction } : {}),
  });
  await writeStateFile(options.statePath, next);
  io.stdout(`Preflight-deferred ${selected.id} without capture or model call: ${diagnosis}\n`);
  return 0;
}

async function resolvePendingDisposition(options: CliOptions, io: CliIo, state: MapPolishState): Promise<number> {
  const task = state.activeTask;
  if (!task) throw new Error("there is no active task to resolve");
  const disposition = options.accept ? "accept" : options.reject ? "reject" : options.defer ? "defer" : undefined;
  if (!disposition) {
    io.stdout(`Active task ${task.id}: ${task.status}${task.proposedOutcome ? `; proposed=${task.proposedOutcome}` : ""}.\n`);
    return 0;
  }
  if (disposition === "accept" && task.status !== "awaiting-human") {
    throw new Error("a task can be accepted only after machine validation and independent/manual review packaging");
  }
  if (disposition === "accept" && task.movementConfirmationRequired && !options.movementConfirmed) {
    throw new Error("route-adjacent acceptance requires hands-on traversal and --movement-confirmed");
  }
  const artifactDir = resolveFrom(options.repoRoot, task.artifactDir);
  const patchPath = path.join(artifactDir, "candidate.patch");
  const patchExists = await exists(patchPath);
  let touchedFiles = task.touchedFiles;
  if (task.status === "awaiting-writer") {
    if (await currentCommit(options.repoRoot) !== task.startCommit) {
      throw new Error("candidate HEAD changed after the work order; manual recovery is required");
    }
    touchedFiles = (await collectTouchedFiles(options.repoRoot))
      .filter((file) => file !== workflowStateFile(options));
  } else if (patchExists) {
    await assertCandidateUnchanged(options, task, artifactDir);
  } else if (task.touchedFiles.length > 0) {
    if (disposition === "accept") throw new Error("validated candidate patch evidence is missing");
    if (await currentCommit(options.repoRoot) !== task.startCommit) {
      throw new Error("candidate HEAD changed; automatic rollback is unsafe");
    }
    const currentTouched = (await collectTouchedFiles(options.repoRoot))
      .filter((file) => file !== workflowStateFile(options));
    if (!sameStringSet(currentTouched, task.touchedFiles)) {
      throw new Error("candidate touched-file set changed; manual recovery is required");
    }
  } else if (task.status === "blocked" && await currentCommit(options.repoRoot) !== task.startCommit) {
    throw new Error("candidate HEAD changed; automatic rollback is unsafe");
  }
  if (disposition !== "accept") {
    await restoreCandidateAndEvidence(options, task.startCommit, touchedFiles);
    const next = updateOutcome(state, {
      unitId: task.unitId,
      outcome: disposition,
      rejectedTactic: options.diagnosis ?? `Candidate approach did not satisfy: ${task.objective}`,
      ...(!options.nextAction || disposition === "defer"
        ? { deferredReason: options.diagnosis ?? `Human ${disposition} disposition.` }
        : {}),
      ...(options.nextAction ? { nextAction: options.nextAction } : {}),
      shared: task.risk === "shared",
    });
    await writeStateFile(options.statePath, next);
    await cleanupRejectedArtifacts(artifactDir, options.keepDebug);
    io.stdout(`Task ${task.id} ${disposition === "defer" ? "deferred" : "rejected"}; candidate restored.\n`);
    return 0;
  }
  if (task.blindAfterLabel !== "A" && task.blindAfterLabel !== "B") {
    throw new Error("pending review state is missing its private blinded after-label mapping");
  }
  if (!task.artifactEvidenceHash) {
    throw new Error("pending review state is missing its sealed validation-evidence hash");
  }
  const retainedOutcomePath = path.join(artifactDir, "outcome.json");
  const retainedOutcomeRaw = await readFile(retainedOutcomePath, "utf8");
  if (createHash("sha256").update(retainedOutcomeRaw).digest("hex") !== task.artifactEvidenceHash) {
    throw new Error("retained validation evidence changed after review");
  }
  const retainedOutcome = JSON.parse(retainedOutcomeRaw) as { evidence?: TaskValidationEvidence; performance?: unknown };
  if (!retainedOutcome.evidence) throw new Error("retained validation evidence is missing");
  await assertRetainedTaskEvidence(artifactDir, retainedOutcome.evidence);
  const review = await readFile(path.join(artifactDir, "review-result.json"), "utf8")
    .then((value) => JSON.parse(value) as unknown)
    .catch(() => null);
  const summary = {
    schemaVersion: 1,
    unitId: task.unitId,
    objective: task.objective,
    outcome: "accept",
    blindAfterLabel: task.blindAfterLabel,
    ...(review ? { review } : {}),
    evidence: retainedOutcome.evidence,
    ...(retainedOutcome.performance ? { performance: retainedOutcome.performance } : {}),
  };
  const evidenceViews = retainedOutcome.evidence.views ?? {};
  const evidenceViewIds = Object.keys(evidenceViews);
  const reviewSources: Record<string, string> = {};
  for (const viewId of evidenceViewIds) {
    const viewEvidence = evidenceViews[viewId];
    const reviewImage = path.join(
      artifactDir,
      "review",
      `${task.blindAfterLabel}-${baselineFileName(viewId)}`,
    );
    if ((viewId === "primary" || viewId === "context" || viewEvidence?.materiallyChanged) && await exists(reviewImage)) {
      reviewSources[viewId] = reviewImage;
    }
  }
  const baseline = await stageAcceptedBaseline(
    options,
    task.unitId,
    evidenceViewIds,
    reviewSources,
    summary,
    artifactDir,
  );
  const next = pruneState({
    ...updateOutcome(state, {
      unitId: task.unitId,
      outcome: "accept",
      ...(options.remainingDefect ? { remainingDefect: options.remainingDefect } : {}),
      shared: task.risk === "shared",
    }),
    sourceFingerprint: await sourceWorktreeFingerprint(options),
  });
  const target = next.units.find((entry) => entry.id === task.unitId);
  if (target) target.evidence = baseline.evidence;
  try {
    await writeStateFile(options.statePath, next);
    if (options.commit) {
      const contextStub = {
        unit: state.units.find((unit) => unit.id === task.unitId) as ReviewUnitState,
      } as TaskContext;
      await commitAcceptedTask(options, contextStub, touchedFiles);
    }
  } catch (error) {
    await rollbackAcceptedBaseline(baseline);
    await writeStateFile(options.statePath, state);
    await restoreWorkflowStateIndex(options, task.startCommit);
    throw new Error(`accepted candidate remains pending because the local checkpoint failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  await finishAcceptedBaseline(baseline);
  await cleanupRejectedArtifacts(artifactDir, false);
  io.stdout(`Task ${task.id} accepted; candidate retained${options.commit ? " in a local commit (not pushed)" : ""}.\n`);
  return 0;
}

async function continueManualTask(options: CliOptions, io: CliIo, state: MapPolishState, spec: MapSpec): Promise<number> {
  const task = state.activeTask;
  if (!task || task.status !== "awaiting-writer") return resolvePendingDisposition(options, io, state);
  const artifactDir = resolveFrom(options.repoRoot, task.artifactDir);
  const definition = deriveReviewUnits(spec).find((entry) => entry.id === task.unitId);
  const unit = state.units.find((entry) => entry.id === task.unitId);
  if (!definition || !unit) throw new Error("active manual task references a missing unit");
  let touchedFiles = (await collectTouchedFiles(options.repoRoot)).filter((file) => file !== workflowStateFile(options));
  if (await currentCommit(options.repoRoot) !== task.startCommit) {
    throw new Error("manual candidate changed HEAD; automatic rollback is unsafe");
  }
  const ownershipPaths = await traceOwnership(options.repoRoot, unit, task.risk, task.startCommit);
  const manualViewIds = definition.views.map((view) => view.id);
  const manualCited = [
    ...defectViewIds(unit.defects),
    ...manualViewIds.filter((viewId) => task.objective.includes(viewId)),
  ].filter((viewId) => manualViewIds.includes(viewId));
  const context: TaskContext = {
    state,
    spec,
    authorityHash: state.mapAuthorityHash,
    definition,
    unit,
    objective: task.objective,
    risk: task.risk,
    targetViewIds: manualCited.length > 0 ? [...new Set(manualCited)] : manualViewIds,
    startCommit: task.startCommit,
    artifactDir,
    taskId: task.id,
    before: validateCaptureManifest(
      JSON.parse(await readFile(path.join(artifactDir, "before", "capture-result.json"), "utf8")) as unknown,
      state.mapAuthorityHash,
    ),
    workOrderPath: resolveFrom(options.repoRoot, task.workOrder),
    ownershipPaths,
    permittedPaths: permittedSourcePaths(task.risk, ownershipPaths),
    // Manual writers hand back through the same package: rediscover the plan
    // crop and site brief so the blind review still gets its plan pair.
    ...((await exists(path.join(artifactDir, "plan-before.png"))) ? { planImages: { before: path.join(artifactDir, "plan-before.png") } } : {}),
    ...((await exists(path.join(artifactDir, "site-brief.md"))) ? { siteBriefPath: path.join(artifactDir, "site-brief.md") } : {}),
    performance: {
      startedAtMs: performance.now(),
      prepareMs: 0,
      beforeCaptureMs: 0,
      workOrderMs: 0,
      writer: null,
      postWriterValidationMs: 0,
      checksMs: 0,
      afterCaptureMs: 0,
      comparisonPackageMs: 0,
      reviewer: null,
      finalizeMs: 0,
    },
    ...(task.greenRegressionUnitId ? { greenRegressionUnitId: task.greenRegressionUnitId } : {}),
    ...(task.movementConfirmationRequired ? { requiresHumanTraversal: true } : {}),
  };
  if (candidateTouchesMapAuthority(touchedFiles)) {
    try {
      await regenerateMapEvidence(options);
      touchedFiles = (await collectTouchedFiles(options.repoRoot))
        .filter((file) => file !== workflowStateFile(options));
    } catch (error) {
      await rejectCandidate(options, context, touchedFiles, "reject", "Manual map authority could not regenerate runtime evidence.");
      io.stderr(`Manual candidate restored: map evidence regeneration failed (${boundedDiagnostic(error instanceof Error ? error.message : String(error))}).\n`);
      return 1;
    }
  }
  if (touchedFiles.length > 32) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate touched more than 32 files and was not bounded.");
    io.stderr("Manual candidate rejected: touched-file scope was not bounded.\n");
    return 1;
  }
  const outOfScopeFiles = touchedFiles.filter((file) => !isAllowedCandidateFile(file));
  if (outOfScopeFiles.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate changed files outside map-visual ownership.");
    io.stderr(`Manual candidate restored before checks: out-of-scope files changed (${outOfScopeFiles.join(", ")}).\n`);
    return 1;
  }
  const outsidePermitted = outsidePermittedSourceFiles(context.permittedPaths, touchedFiles);
  if (outsidePermitted.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate crossed the work order's permitted source boundary.");
    io.stderr(`Manual candidate restored before checks: hard source boundary crossed (${outsidePermitted.join(", ")}).\n`);
    return 1;
  }
  if (!touchedFiles.some(isRelevantMapSource)) {
    await rejectCandidate(options, context, touchedFiles, "reject", "No relevant map source file changed.");
    io.stderr("Manual candidate restored before checks: no relevant map source file changed.\n");
    return 1;
  }
  const beforeIntegrityReasons = await captureFileIntegrityReasons(context.before);
  if (beforeIntegrityReasons.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Before-capture evidence changed after writer handoff.");
    io.stderr(`Manual candidate restored before checks: ${beforeIntegrityReasons.join(" | ")}.\n`);
    return 1;
  }
  try {
    await captureCandidatePatch({
      repoRoot: options.repoRoot,
      startCommit: task.startCommit,
      touchedFiles,
      outputPath: path.join(artifactDir, "candidate.patch"),
    });
    await writeJsonAtomic(path.join(artifactDir, "touched-files.json"), touchedFiles);
    await writeStateFile(options.statePath, pruneState({
      ...state,
      activeTask: {
        ...task,
        status: "blocked",
        touchedFiles,
      },
    }));
  } catch (error) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Candidate patch capture failed.");
    io.stderr(`Manual candidate was restored after patch capture failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  let baseSpec: MapSpec;
  let currentMap: Awaited<ReturnType<typeof readMapSpecFile>>;
  try {
    baseSpec = await mapSpecAtCommit(options.repoRoot, task.startCommit);
    currentMap = await readMapSpecFile(options.mapSpecPath);
  } catch (error) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Map authority became unreadable during the candidate.");
    io.stderr(`Manual candidate rejected and restored: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  const protectedReasons = detectProtectedChanges(baseSpec, currentMap.spec, touchedFiles);
  if (mapSpecSurveyCameraAuthorityChanged(baseSpec, currentMap.spec)) {
    protectedReasons.push("survey camera authority changed");
  }
  if (protectedReasons.length > 0) {
    await rejectCandidate(options, context, touchedFiles, "reject", "Explicit owner scope expansion is required for protected gameplay changes.");
    io.stderr(`Manual candidate blocked and restored: ${protectedReasons.join(" | ")}\n`);
    return 1;
  }
  const locality = inspectCandidateLocality({
    baseSpec,
    currentSpec: currentMap.spec,
    touchedFiles,
    ownershipPaths: context.ownershipPaths,
    selectedZoneIds: context.definition.zoneIds,
  });
  const mapShared = locality.mapShared;
  const mapRouteAdjacent = mapSpecRouteAdjacentChanged(baseSpec, currentMap.spec);
  const changedRouteZoneIds = mapSpecRouteChangedZoneIds(baseSpec, currentMap.spec);
  const foreignRouteZones = changedRouteZoneIds.filter((zoneId) => !context.definition.zoneIds.includes(zoneId));
  if (locality.requiresSharedEvidence && context.risk !== "shared") {
    await rejectCandidate(
      { ...options, nextAction: "Retry as one shared-system task with evidence from two weak units and one Green regression view." },
      context,
      touchedFiles,
      "reject",
      `Changed files escaped bounded unit ownership (${candidateLocalitySummary(locality)}).`,
    );
    io.stderr(`Manual candidate restored: shared-system evidence is required (${candidateLocalitySummary(locality)}).\n`);
    return 1;
  }
  if (foreignRouteZones.length > 0 && context.risk !== "shared") {
    await rejectCandidate(options, context, touchedFiles, "reject", "Route-adjacent edits crossed the selected review-unit boundary.");
    io.stderr(`Manual candidate restored: route-adjacent edits touched other zones (${foreignRouteZones.join(", ")}). Split the task.\n`);
    return 1;
  }
  if (mapRouteAdjacent && context.risk === "pure") {
    await rejectCandidate(
      { ...options, nextAction: "Retry as a route-adjacent task with focused agent traversal." },
      context,
      touchedFiles,
      "reject",
      "Actual placement changes require route-adjacent validation.",
    );
    io.stderr("Manual candidate restored: actual map placement changes require a route-adjacent retry.\n");
    return 1;
  }
  const routeDefinitions = deriveReviewUnits(currentMap.spec);
  const routeIds = changedRouteZoneIds
    .map((zoneId) => routeDefinitions.find((entry) => entry.zoneIds.includes(zoneId)))
    .filter((entry): entry is ReviewUnitDefinition => Boolean(entry))
    .map(focusedRouteForUnit);
  let completedChecks: string[];
  try {
    completedChecks = await runMinimumChecks(
      options,
      context,
      touchedFiles,
      mapRouteAdjacent,
      mapShared,
      routeIds,
    );
  } catch (error) {
    const baselineError = await handleFocusedCheckFailure(
      options, context, touchedFiles, mapRouteAdjacent, mapShared, routeIds,
    );
    if (baselineError) {
      io.stderr(`Manual candidate restored without consuming an attempt because the baseline check is already failing: ${baselineError.message}\n`);
      return 1;
    }
    io.stderr(`Manual candidate rejected because the focused check failed only with the candidate applied: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  const definitions = [definition];
  if (task.greenRegressionUnitId) {
    const green = deriveReviewUnits(spec).find((entry) => entry.id === task.greenRegressionUnitId);
    if (green) definitions.push(green);
  }
  let after: CaptureManifest;
  try {
    after = await invokeCapture(
      options,
      singleUnitPlan(state.mapAuthorityHash, definitions),
      path.join(artifactDir, "after"),
      "after",
    );
  } catch (error) {
    await abortInfrastructureFailure(options, context, touchedFiles);
    io.stderr(`Manual candidate restored without consuming an attempt because recapture failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  let validation: TaskPairValidation;
  try {
    validation = await validateTaskPair(options, context, after, touchedFiles);
  } catch (error) {
    await abortInfrastructureFailure(options, context, touchedFiles);
    io.stderr(`Manual candidate restored without consuming an attempt because comparison failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  await writeJsonAtomic(path.join(artifactDir, "pair-validation.json"), validation);
  if (!validation.valid) {
    await rejectCandidate(options, context, touchedFiles, "reject", validation.reasons[0] ?? "Invalid image comparison.");
    io.stderr(`Manual comparison rejected and candidate restored: ${validation.reasons.join(" | ")}\n`);
    return 1;
  }
  const evidence = await taskValidationEvidence(context, options, touchedFiles, completedChecks, after, validation);
  let reviewPackage: BlindReviewPackage;
  try {
    reviewPackage = await stageBlindReviewPackage(options, context, after, validation.materiallyChangedViewIds);
  } catch (error) {
    await abortInfrastructureFailure(options, context, touchedFiles);
    io.stderr(`Manual candidate restored without consuming an attempt because review packaging failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  await attachReviewPackageEvidence(context, evidence, reviewPackage.images, 0);
  await writeFile(path.join(artifactDir, "manual-review.txt"), `${reviewPrompt(context, reviewPackage.imageOrder)}\n`, "utf8");
  const outcomePath = path.join(artifactDir, "outcome.json");
  await writeJsonAtomic(outcomePath, {
    schemaVersion: 1,
    unitId: task.unitId,
    objective: context.objective,
    status: "manual-review-required",
    evidence,
    performance: taskPerformanceSummary(context, options.engine),
  });
  const artifactEvidenceHash = await fileSha256(outcomePath);
  await refreshPendingWorkOrder(context, context.risk === "route-adjacent" || mapRouteAdjacent);
  await compactValidatedTaskArtifacts(artifactDir);
  const nextState = pruneState({
    ...state,
    activeTask: {
      ...task,
      status: "awaiting-human",
      touchedFiles,
      blindAfterLabel: reviewPackage.afterLabel,
      ...(context.requiresHumanTraversal ? { movementConfirmationRequired: true } : {}),
      artifactEvidenceHash,
    },
  });
  await writeStateFile(options.statePath, nextState);
  io.stdout(`Manual A/B package is valid and ready at ${artifactDir}; review once, then use --accept, --reject, or --defer.\n`);
  return 0;
}

const CHECKPOINT_COMMANDS: ReadonlyArray<{ command: string; args: string[]; label: string }> = Object.freeze([
  { command: "pnpm", args: ["qa:completion"], label: "representative shots and routes" },
  { command: "pnpm", args: ["test:map-tooling"], label: "map tooling" },
  { command: "pnpm", args: ["typecheck"], label: "typecheck" },
  { command: "pnpm", args: ["build"], label: "build" },
]);

const FULL_MILESTONE_COMMANDS: ReadonlyArray<{ command: string; args: string[]; label: string }> = Object.freeze([
  { command: "pnpm", args: ["--filter", "@clawd-strike/client", "test:map-traversal:final"], label: "full props-on traversal" },
  { command: "pnpm", args: ["smoke:game"], label: "runtime smoke" },
  { command: "pnpm", args: ["qa:completion"], label: "completion gate" },
  { command: "pnpm", args: ["test:map-tooling"], label: "map tooling" },
  { command: "pnpm", args: ["test:qa-tooling"], label: "QA tooling" },
  { command: "pnpm", args: ["typecheck"], label: "typecheck" },
  { command: "pnpm", args: ["build"], label: "build" },
]);

async function milestoneVerify(options: CliOptions, io: CliIo, state: MapPolishState): Promise<number> {
  if (state.activeTask) throw new Error("resolve the active candidate before milestone verification");
  if (options.mode !== "mock") {
    const commands = state.milestone.full ? FULL_MILESTONE_COMMANDS : CHECKPOINT_COMMANDS;
    for (const step of commands) {
      io.stdout(`Milestone: ${step.label}\n`);
      await runChecked(step.command, step.args, { cwd: options.repoRoot });
    }
  }
  const next = pruneState({
    ...state,
    milestone: {
      acceptedAtLastRun: totalAcceptedChanges(state),
      required: false,
      full: false,
    },
  });
  await writeStateFile(options.statePath, next);
  io.stdout(`${state.milestone.full ? "Full milestone" : "Five-task checkpoint"} verification ${options.mode === "mock" ? "mock " : ""}complete.\n`);
  return 0;
}

async function verify(options: CliOptions, io: CliIo): Promise<number> {
  if ((options.accept || options.reject || options.defer) && await exists(options.statePath)) {
    const recoveryState = await readStateFile(options.statePath);
    if (recoveryState.activeTask) return resolvePendingDisposition(options, io, recoveryState);
  }
  const loaded = await loadStateAndSpec(options);
  if (options.milestone) return milestoneVerify(options, io, loaded.state);
  if (loaded.state.activeTask?.status === "awaiting-writer" && !options.accept && !options.reject && !options.defer) {
    return continueManualTask(options, io, loaded.state, loaded.spec);
  }
  if (loaded.state.activeTask) return resolvePendingDisposition(options, io, loaded.state);
  const definitions = deriveReviewUnits(loaded.spec);
  const covered = new Set(loaded.state.units.flatMap((unit) => unit.zoneIds));
  const uncovered = loaded.spec.zones.map((zone) => zone.id).filter((zoneId) => !covered.has(zoneId));
  if (definitions.length !== loaded.state.units.length || uncovered.length > 0) {
    throw new Error(`state coverage is stale; run map:survey (uncovered=${uncovered.join(",") || "none"})`);
  }
  const coverageReport = assertSurveyCoverage(loaded.spec, definitions);
  io.stdout(`State valid: ${loaded.state.units.length} units, pass=${loaded.state.pass}, engine=${loaded.state.engine ?? "none"}, surveyRequired=${loaded.state.surveyRequired}, milestoneRequired=${loaded.state.milestone.required}, coverage usable=${coverageReport.mapWide.usablePct}% full-height=${coverageReport.mapWide.fullHeightPct}%.\n`);
  return 0;
}

const PLANNER_ACTIONS = ["run", "defer"] as const;

type PlannerDecision = {
  action: typeof PLANNER_ACTIONS[number];
  objective?: string;
  risk?: TaskRisk;
  targetViewIds?: string[];
  sharedCause?: string;
  sharedEvidence?: string[];
  greenRegression?: string;
  diagnosis?: string;
};

function plannerSchema(viewIds: readonly string[], unitIds: readonly string[]): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["action"],
    properties: {
      action: { type: "string", enum: [...PLANNER_ACTIONS] },
      objective: { type: "string", minLength: 12, maxLength: OBJECTIVE_MAX },
      risk: { type: "string", enum: ["pure", "shared", "route-adjacent"] },
      targetViewIds: {
        type: "array",
        maxItems: 8,
        items: viewIds.length > 0 ? { type: "string", enum: [...viewIds] } : { type: "string" },
      },
      sharedCause: { type: "string", minLength: 12, maxLength: 180 },
      sharedEvidence: {
        type: "array",
        maxItems: 2,
        items: unitIds.length > 0 ? { type: "string", enum: [...unitIds] } : { type: "string" },
      },
      greenRegression: unitIds.length > 0 ? { type: "string", enum: [...unitIds] } : { type: "string" },
      diagnosis: { type: "string", minLength: 12, maxLength: 220 },
    },
  };
}

export function parsePlannerDecision(value: unknown): PlannerDecision {
  if (!value || typeof value !== "object") throw new Error("planner decision must be an object");
  const decision = value as Partial<PlannerDecision>;
  if (!PLANNER_ACTIONS.includes(decision.action as typeof PLANNER_ACTIONS[number])) {
    throw new Error("planner action must be run or defer");
  }
  if (decision.action === "run") {
    if (typeof decision.objective !== "string" || decision.objective.trim().length < 12) {
      throw new Error("planner run decision requires a bounded objective");
    }
    if (decision.objective.trim().length > OBJECTIVE_MAX) {
      throw new Error(`planner objective must be ${OBJECTIVE_MAX} characters or fewer`);
    }
    if (!["pure", "shared", "route-adjacent"].includes(String(decision.risk))) {
      throw new Error("planner run decision requires an explicit risk");
    }
  }
  if (decision.action === "defer" && (typeof decision.diagnosis !== "string" || decision.diagnosis.trim().length < 12)) {
    throw new Error("planner defer decision requires a diagnosis");
  }
  return decision as PlannerDecision;
}

function plannerPrompt(input: {
  unit: ReviewUnitState;
  views: readonly string[];
  targetViewIds: readonly string[];
  suggestedRisk: TaskRisk;
  rejectedTactics: readonly string[];
  weakUnits: ReadonlyArray<{ id: string; defect: string | null }>;
  greenUnits: readonly string[];
}): string {
  return boundedPrompt(`You plan exactly one bounded map-polish task for review unit ${input.unit.id} (rating ${input.unit.rating}). The attached images are the unit's current site brief plan crop and labeled current views; the site brief text follows them.

Defects on record:
${input.unit.defects.map((defect) => `- ${defect}`).join("\n") || "- none recorded"}

Labeled views: ${input.views.join(", ")}. Views cited by defects: ${input.targetViewIds.join(", ") || "none"}. Suggested risk: ${input.suggestedRisk}. ${input.rejectedTactics.length > 0 ? `Rejected tactics (do not repeat): ${input.rejectedTactics.join(" | ")}` : ""}

Decide: action run with one objective (max ${OBJECTIVE_MAX} chars) naming what visibly improves and in which target views, an explicit risk (composing a frontage is route-adjacent; a shared mechanism needs sharedCause plus sharedEvidence from ${input.weakUnits.map((unit) => unit.id).join(", ") || "none"} and greenRegression from ${input.greenUnits.join(", ") || "none"}), and targetViewIds; or action defer with a diagnosis when no bounded local emitter owns the defect. Do not propose implementation detail beyond the objective sentence.`, 380, "planner prompt");
}

type LoopStopReason =
  | "max-accepts"
  | "resurvey-required"
  | "milestone-required"
  | "owner-review"
  | "protected-scope"
  | "active-task"
  | "blocker";

async function runLoop(options: CliOptions, io: CliIo): Promise<number> {
  if (options.maxTasks > 1) throw new Error("map:loop is bounded by --max-accepts; --max-tasks is not valid here");
  let accepts = 0;
  let iterations = 0;
  const outcomes: string[] = [];
  let stopReason: LoopStopReason | null = null;
  let stopDetail = "";
  const maxIterations = Math.max(options.maxAccepts * 4, 8);
  while (accepts < options.maxAccepts && iterations < maxIterations) {
    iterations += 1;
    const loaded = await loadStateAndSpec(options);
    assertEnginePin(loaded.state, options);
    if (loaded.state.activeTask) {
      stopReason = "active-task";
      stopDetail = `active task ${loaded.state.activeTask.id} (${loaded.state.activeTask.status}) requires map:verify`;
      break;
    }
    if (loaded.state.surveyRequired || loaded.state.surveyedAuthorityHash !== loaded.authorityHash) {
      stopReason = "resurvey-required";
      stopDetail = "a full-map survey is required";
      break;
    }
    if (loaded.state.milestone.required) {
      stopReason = "milestone-required";
      stopDetail = "milestone verification is due";
      break;
    }
    const selected = selectNextUnit(loaded.state);
    if (!selected) {
      stopReason = "owner-review";
      stopDetail = "no Red or Yellow unit is eligible";
      break;
    }
    const definition = deriveReviewUnits(loaded.spec).find((entry) => entry.id === selected.id);
    if (!definition) throw new Error(`review definition missing for '${selected.id}'`);
    const views = definition.views.map((view) => view.id);
    const citedViews = defectViewIds(selected.defects).filter((viewId) => views.includes(viewId));
    const suggestedRisk = inferTaskRisk(selected);
    let decision: PlannerDecision;
    if (options.planner === "manual") {
      io.stdout(`${JSON.stringify({
        loop: "awaiting-operator-objective",
        unit: selected.id,
        rating: selected.rating,
        defects: selected.defects,
        views,
        targetViewIds: citedViews,
        suggestedRisk,
        resume: `${workflowCommand("map:run", options, ["--objective", "\"...\"", "--risk", suggestedRisk])} then ${workflowCommand("map:verify", options, ["--accept", "--commit"])}`,
      }, null, 2)}\n`);
      return 0;
    }
    if (options.mode === "mock") {
      decision = {
        action: "run",
        objective: `Resolve the highest-impact visible defect: ${selected.defects[0] ?? "underdeveloped visual finish"}`,
        risk: suggestedRisk,
        targetViewIds: citedViews,
      };
    } else {
      const weakUnits = loaded.state.units
        .filter((unit) => unit.id !== selected.id && (unit.rating === "red" || unit.rating === "yellow"))
        .slice(0, 3)
        .map((unit) => ({ id: unit.id, defect: unit.defects[0] ?? null }));
      const greenUnits = loaded.state.units.filter((unit) => unit.rating === "green").slice(0, 3).map((unit) => unit.id);
      const plannerDir = path.join(options.artifactsRoot, "planner");
      await rm(plannerDir, { recursive: true, force: true });
      await mkdir(plannerDir, { recursive: true });
      const plannerImages: string[] = [];
      for (const viewId of ["primary", "context", ...citedViews.filter((id) => id !== "primary" && id !== "context")]) {
        const evidencePath = selected.evidence[viewId];
        if (evidencePath) plannerImages.push(resolveFrom(options.repoRoot, evidencePath));
      }
      const planCrop = await renderPlanCrop(
        options,
        loaded.spec,
        definition,
        path.join(plannerDir, "plan.png"),
        `${selected.id} · plan`,
      );
      if (planCrop) plannerImages.push(planCrop);
      const siteBriefPath = path.join(plannerDir, "site-brief.md");
      await writeFile(siteBriefPath, buildSiteBrief(loaded.spec, definition, selected), "utf8");
      const siteBrief = await readFile(siteBriefPath, "utf8");
      const prompt = `${plannerPrompt({
        unit: selected,
        views,
        targetViewIds: citedViews,
        suggestedRisk,
        rejectedTactics: selected.rejectedTactics,
        weakUnits,
        greenUnits,
      })}\n\nSite brief:\n${siteBrief}`;
      const response = await invokeEngineJson(options.engine, {
        repoRoot: options.repoRoot,
        prompt,
        images: plannerImages,
        schema: plannerSchema(views, loaded.state.units.map((unit) => unit.id)),
        resultPath: path.join(plannerDir, "planner-decision.json"),
        role: "planner",
      });
      decision = parsePlannerDecision(response.value);
      io.stdout(`Planner (${options.engine}): ${decision.action}${decision.objective ? ` — ${decision.objective}` : ""}${decision.diagnosis ? ` — ${decision.diagnosis}` : ""}\n`);
      await rm(plannerDir, { recursive: true, force: true });
    }
    if (decision.action === "defer") {
      const deferOptions: CliOptions = {
        ...options,
        deferSelected: true,
        diagnosis: decision.diagnosis as string,
      };
      const code = await deferSelectedUnit(deferOptions, io);
      if (code !== 0) {
        stopReason = "blocker";
        stopDetail = "planner defer failed";
        break;
      }
      outcomes.push(`${selected.id}: planner-deferred`);
      continue;
    }
    const plannedObjective = normalizeObjective(decision.objective);
    if (!plannedObjective) {
      stopReason = "blocker";
      stopDetail = "planner returned an empty objective";
      break;
    }
    const runOptions: CliOptions = {
      ...options,
      command: "run",
      objective: plannedObjective,
      risk: decision.risk as TaskRisk,
      sharedEvidence: decision.sharedEvidence ?? [],
      ...(decision.sharedCause ? { sharedCause: decision.sharedCause } : {}),
      ...(decision.greenRegression ? { greenRegression: decision.greenRegression } : {}),
      maxTasks: 1,
    };
    const outcome = await executeTask(runOptions, io);
    outcomes.push(`${selected.id}: ${outcome}`);
    if (outcome === "accept") {
      accepts += 1;
      continue;
    }
    if (outcome === "pending") {
      const after = await loadStateAndSpec(options);
      if (after.state.activeTask) {
        stopReason = "active-task";
        stopDetail = `task ${after.state.activeTask.id} is ${after.state.activeTask.status}; resolve with map:verify`;
      } else {
        stopReason = "blocker";
        stopDetail = "task ended pending without an active task";
      }
      break;
    }
  }
  if (!stopReason) {
    stopReason = accepts >= options.maxAccepts ? "max-accepts" : "blocker";
    if (stopReason === "blocker") stopDetail = `loop exhausted ${maxIterations} iterations without reaching ${options.maxAccepts} accepts`;
  }
  const finalState = await loadStateAndSpec(options).then((loaded) => loaded.state).catch(() => null);
  io.stdout(`${JSON.stringify({
    loop: "final-report",
    engine: options.engine,
    accepts,
    iterations,
    outcomes,
    stopReason,
    ...(stopDetail ? { stopDetail } : {}),
    ...(finalState ? {
      pass: finalState.pass,
      ratings: {
        red: finalState.units.filter((unit) => unit.rating === "red").length,
        yellow: finalState.units.filter((unit) => unit.rating === "yellow").length,
        green: finalState.units.filter((unit) => unit.rating === "green").length,
        unrated: finalState.units.filter((unit) => unit.rating === "unrated").length,
      },
      milestoneRequired: finalState.milestone.required,
      surveyRequired: finalState.surveyRequired,
      coverage: finalState.coverage,
    } : {}),
  }, null, 2)}\n`);
  return stopReason === "blocker" ? 1 : 0;
}

export async function runMapPolishCli(argv: string[], io: CliIo = DEFAULT_IO): Promise<number> {
  try {
    const options = parseOptions(argv);
    if (options.command === "survey") return await survey(options, io);
    if (options.command === "next") return await next(options, io);
    if (options.command === "coverage") return await coverage(options, io);
    if (options.command === "loop") return await runLoop(options, io);
    if (options.command === "run") {
      return options.deferSelected ? await deferSelectedUnit(options, io) : await runTasks(options, io);
    }
    return await verify(options, io);
  } catch (error) {
    if (error instanceof Error && (error as Error & { help?: boolean }).help) {
      io.stdout(error.message);
      return 0;
    }
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT_FILE) {
  process.exitCode = await runMapPolishCli(process.argv.slice(2));
}
