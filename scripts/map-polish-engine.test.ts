import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { readStateFile, type MapSpec } from "./lib/mapPolish.js";
import {
  CLAUDE_MODEL,
  WRITER_ENGINE,
  claudeInvocationArgs,
  codexInvocationArgs,
  invokeEngineJson,
  invokeWriter,
  parseClaudeEnvelope,
  parsePlannerDecision,
  parseSurveyPayload,
  plannerSchema,
  runMapPolishCli,
  surveySchema,
} from "./map-polish.js";

const execFile = promisify(execFileCallback);

async function git(repoRoot: string, args: string[]): Promise<string> {
  const result = await execFile("git", ["-C", repoRoot, ...args]);
  return result.stdout.trim();
}

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runMapPolishCli(args, {
    stdout: (value) => { stdout += value; },
    stderr: (value) => { stderr += value; },
  });
  return { code, stdout, stderr };
}

test("claude engine argv per role: headless, safe-mode, schema-validated, role-isolated tools", () => {
  assert.equal(CLAUDE_MODEL, "claude-fable-5-1");
  for (const role of ["planner", "survey", "reviewer"] as const) {
    const args = claudeInvocationArgs({ role, schemaJson: "{\"type\":\"object\"}" });
    assert.ok(args.includes("-p"), role);
    assert.ok(args.includes("--safe-mode"), `${role} ignores customizations without disabling normal auth`);
    assert.ok(args.includes("--no-session-persistence"), `${role} leaves no resumable session`);
    assert.ok(!args.includes("--bare"));
    assert.ok(!args.includes("--fallback-model"));
    assert.deepEqual(args.slice(args.indexOf("--output-format"), args.indexOf("--output-format") + 2), ["--output-format", "json"]);
    assert.deepEqual(
      args.slice(args.indexOf("--json-schema"), args.indexOf("--json-schema") + 2),
      ["--json-schema", "{\"type\":\"object\"}"],
      "the CLI takes the schema inline, not a file path",
    );
    assert.deepEqual(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2), ["--model", CLAUDE_MODEL]);
    assert.deepEqual(args.slice(args.indexOf("--allowedTools"), args.indexOf("--allowedTools") + 2), ["--allowedTools", "Read"]);
    assert.deepEqual(args.slice(args.indexOf("--permission-mode"), args.indexOf("--permission-mode") + 2), ["--permission-mode", "manual"]);
    assert.ok(args.includes("--max-budget-usd"));
    assert.deepEqual(args.slice(args.indexOf("--tools"), args.indexOf("--tools") + 2), ["--tools", "Read"]);
    assert.ok(!args.includes("--disallowedTools"), "an exact available-tool list needs no denylist");
  }
  const planner = claudeInvocationArgs({ role: "planner", schemaJson: "{\"type\":\"object\"}" });
  assert.deepEqual(planner.slice(planner.indexOf("--effort"), planner.indexOf("--effort") + 2), ["--effort", "high"]);
  const writer = claudeInvocationArgs({ role: "writer", schemaJson: "{\"type\":\"object\"}" });
  assert.deepEqual(writer.slice(writer.indexOf("--effort"), writer.indexOf("--effort") + 2), ["--effort", "xhigh"]);
  assert.deepEqual(writer.slice(writer.indexOf("--permission-mode"), writer.indexOf("--permission-mode") + 2), ["--permission-mode", "acceptEdits"]);
  assert.deepEqual(writer.slice(writer.indexOf("--allowedTools"), writer.indexOf("--allowedTools") + 2), ["--allowedTools", "Read,Edit,Write,Glob,Grep"]);
  assert.deepEqual(
    writer.slice(writer.indexOf("--tools"), writer.indexOf("--tools") + 2),
    ["--tools", "Read,Edit,Write,Glob,Grep"],
    "the writer edits; the workflow runs generators and checks",
  );
  assert.ok(writer.includes("--safe-mode"));
  assert.ok(writer.includes("--no-session-persistence"));
  assert.ok(!writer.includes("--bare"));
  assert.ok(!writer.includes("--disallowedTools"));
  assert.ok(!writer.includes("--fallback-model"));
  // No image flags in either engine's Claude path: images travel via the prompt.
  assert.ok(!writer.includes("-i"));

  const codexWriter = codexInvocationArgs({
    role: "writer",
    repoRoot: "/repo",
    workingDirectory: "/repo",
    images: ["a.png"],
    schemaPath: "schema.json",
    resultPath: "result.json",
  });
  assert.ok(codexWriter.includes("--approve-for-me"), "codex path stays behaviourally identical");
  assert.ok(codexWriter.includes("gpt-5.6-sol"));
});

test("claude result envelope parses structured output, usage, and cost", () => {
  const envelope = parseClaudeEnvelope(JSON.stringify({
    is_error: false,
    result: "{\"ok\":true}",
    structured_output: { ok: true },
    total_cost_usd: 0.0421,
    usage: {
      input_tokens: 12,
      cache_creation_input_tokens: 1900,
      cache_read_input_tokens: 300,
      output_tokens: 44,
    },
  }));
  assert.deepEqual(envelope.structuredOutput, { ok: true });
  assert.equal(envelope.isError, false);
  assert.equal(envelope.telemetry.costUsd, 0.0421);
  assert.deepEqual(envelope.telemetry.usage, {
    inputTokens: 12,
    cachedInputTokens: 300,
    cacheWriteInputTokens: 1900,
    outputTokens: 44,
    reasoningOutputTokens: 0,
    totalTokens: 2256,
  });
  assert.throws(() => parseClaudeEnvelope("not json"), SyntaxError);
  const errorEnvelope = parseClaudeEnvelope(JSON.stringify({ is_error: true, result: "budget exceeded" }));
  assert.equal(errorEnvelope.isError, true);
  assert.equal(errorEnvelope.resultText, "budget exceeded");
});

test("planner decisions are validated closed", () => {
  assert.deepEqual(
    parsePlannerDecision({ action: "run", objective: "Compose the west frontage around its storage door.", risk: "route-adjacent", targetViewIds: ["elev:F_A"] }),
    { action: "run", objective: "Compose the west frontage around its storage door.", risk: "route-adjacent", targetViewIds: ["elev:F_A"] },
  );
  assert.deepEqual(
    parsePlannerDecision({ action: "defer", diagnosis: "No bounded local emitter owns this defect." }),
    { action: "defer", diagnosis: "No bounded local emitter owns this defect." },
  );
  // Codex strict output schemas list every property as required, so unused
  // fields arrive as null and must normalize to absent.
  assert.deepEqual(
    parsePlannerDecision({
      action: "defer", objective: null, risk: null, targetViewIds: null, sharedCause: null, sharedEvidence: null,
      greenRegression: null, diagnosis: "No bounded local emitter owns this defect.",
    }),
    { action: "defer", diagnosis: "No bounded local emitter owns this defect." },
  );
  assert.throws(() => parsePlannerDecision({ action: "run" }), /bounded objective/);
  assert.throws(() => parsePlannerDecision({ action: "run", objective: "Do the whole map over completely.", risk: "everything" }), /explicit risk/);
  assert.throws(() => parsePlannerDecision({ action: "defer" }), /diagnosis/);
  assert.throws(() => parsePlannerDecision({ action: "replan" }), /run or defer/);
});

test("planner and survey schemas require every property and allow unused fields as null", () => {
  type Schema = {
    type?: string | string[];
    required?: string[];
    additionalProperties?: boolean;
    properties?: Record<string, Schema>;
    items?: Schema;
    enum?: unknown[];
  };
  const assertStrictObjects = (schema: Schema): void => {
    if (schema.type === "object") {
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual([...(schema.required ?? [])].sort(), Object.keys(schema.properties ?? {}).sort());
    }
    for (const property of Object.values(schema.properties ?? {})) assertStrictObjects(property);
    if (schema.items) assertStrictObjects(schema.items);
  };
  for (const schema of [surveySchema(), surveySchema(["primary"]), plannerSchema([], []), plannerSchema(["primary"], ["unit-a"])]) {
    assertStrictObjects(schema as Schema);
  }
  const planner = plannerSchema(["primary"], ["unit-a"]) as Schema;
  for (const [name, property] of Object.entries(planner.properties ?? {})) {
    if (name !== "action") assert.ok(property.type?.includes("null"), `${name} can be unused`);
  }
  const survey = surveySchema(["primary"]) as Schema;
  const viewId = survey.properties?.ratings?.items?.properties?.defects?.items?.properties?.viewId;
  assert.deepEqual(viewId?.enum, ["primary", null]);

  assert.deepEqual(parsePlannerDecision({
    action: "run", objective: "Compose the west frontage around its storage door.", risk: "route-adjacent",
    targetViewIds: ["primary"], sharedCause: null, sharedEvidence: null, greenRegression: null, diagnosis: null,
  }), {
    action: "run", objective: "Compose the west frontage around its storage door.", risk: "route-adjacent", targetViewIds: ["primary"],
  });
  const ratings = parseSurveyPayload({ ratings: [{
    unitId: "unit-a", rating: "red", confidence: 0.9,
    defects: [{ criterion: "order-and-variation", evidence: "The wall has no readable opening rhythm.", viewId: null }],
  }] }, ["unit-a"], new Map([["unit-a", ["primary"]]]));
  assert.deepEqual(ratings[0]?.defects, ["[order-and-variation] The wall has no readable opening rhythm."]);
});

type Fixture = {
  tempRoot: string;
  repoRoot: string;
  statePath: string;
  markerPath: string;
};

async function buildFixture(): Promise<Fixture> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-map-engine-"));
  const repoRoot = path.join(tempRoot, "repo");
  const specPath = path.join(repoRoot, "docs/map-design/specs/map_spec.json");
  const targetPath = path.join(repoRoot, "apps/client/src/runtime/map/propFamilies/visualFixture.ts");
  await mkdir(path.dirname(specPath), { recursive: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  const spec: MapSpec = {
    zones: [
      { id: "TEST_RED_4", type: "courtyard", label: "Test Red Four", rect: { x: 0, y: 0, w: 8, h: 8 } },
      { id: "TEST_RED_6", type: "service_area", label: "Test Red Six", rect: { x: 12, y: 0, w: 8, h: 8 } },
      { id: "TEST_GREEN_0", type: "connector", label: "Test Green Zero", rect: { x: 24, y: 0, w: 8, h: 8 } },
    ],
  };
  await writeFile(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  await writeFile(targetPath, "// TEST_RED_4 TEST_RED_6\nexport const visualFixture = \"baseline\";\n", "utf8");
  await writeFile(path.join(repoRoot, ".gitignore"), "artifacts/\n", "utf8");
  await git(repoRoot, ["init", "--initial-branch", "codex/map-engine-test"]);
  await git(repoRoot, ["config", "user.name", "Engine Test"]);
  await git(repoRoot, ["config", "user.email", "engine-test@example.com"]);
  await git(repoRoot, ["add", ".gitignore", "apps", "docs"]);
  await git(repoRoot, ["commit", "-m", "fixture baseline"]);
  return {
    tempRoot,
    repoRoot,
    statePath: path.join(repoRoot, "docs/map-design/map-polish-state.json"),
    markerPath: path.join(tempRoot, "model-invoked"),
  };
}

test("control engine defaults to codex, CLI overrides env, and resume commands forward codex", async () => {
  const fixture = await buildFixture();
  const previousEngine = process.env.MAP_POLISH_ENGINE;
  try {
    for (const selection of [
      { env: undefined, args: [], expected: "codex" },
      { env: "codex", args: [], expected: "codex" },
      { env: "claude", args: ["--engine", "codex"], expected: "codex" },
      { env: "invalid", args: ["--engine", "codex"], expected: "codex" },
    ]) {
      if (selection.env === undefined) delete process.env.MAP_POLISH_ENGINE;
      else process.env.MAP_POLISH_ENGINE = selection.env;
      const loop = await runCli(["loop", "--repo-root", fixture.repoRoot, "--mode", "mock", ...selection.args]);
      assert.equal(loop.code, 0, loop.stderr);
      const report = JSON.parse(loop.stdout) as { engine: string; writerEngine: string; stopReason: string };
      assert.equal(report.engine, selection.expected);
      assert.equal(report.writerEngine, "claude");
      assert.equal(report.stopReason, "resurvey-required");

      const next = await runCli(["next", "--repo-root", fixture.repoRoot, ...selection.args]);
      assert.equal(next.code, 0, next.stderr);
      assert.match(next.stdout, new RegExp(`pnpm map:survey -- .*--engine ${selection.expected}`));
    }
    process.env.MAP_POLISH_ENGINE = "invalid";
    const invalid = await runCli(["next", "--repo-root", fixture.repoRoot]);
    assert.equal(invalid.code, 1);
    assert.match(invalid.stderr, /unsupported engine 'invalid'/);
    for (const args of [[], ["--engine", "claude"]]) {
      process.env.MAP_POLISH_ENGINE = "claude";
      const claudeControl = await runCli(["next", "--repo-root", fixture.repoRoot, ...args]);
      assert.equal(claudeControl.code, 1);
      assert.match(claudeControl.stderr, /Claude is reserved for map writing; use --engine codex for survey, planning, and review/);
    }
  } finally {
    if (previousEngine === undefined) delete process.env.MAP_POLISH_ENGINE;
    else process.env.MAP_POLISH_ENGINE = previousEngine;
    await rm(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("Claude control is refused and the existing survey engine pin remains enforced", async () => {
  const fixture = await buildFixture();
  try {
    const survey = await runCli(["survey", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic"]);
    assert.equal(survey.code, 0, survey.stderr);
    // Mock surveys record no engine; pin one to simulate a real codex survey.
    const state = JSON.parse(await readFile(fixture.statePath, "utf8")) as Record<string, unknown>;
    state.engine = "codex";
    await writeFile(fixture.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    assert.equal((await readStateFile(fixture.statePath)).engine, "codex");

    const crossEngineRun = await runCli([
      "run", "--repo-root", fixture.repoRoot, "--mode", "real", "--engine", "claude",
      "--objective", "One bounded visual objective.", "--risk", "pure",
    ]);
    assert.equal(crossEngineRun.code, 1);
    assert.match(crossEngineRun.stderr, /Claude is reserved for map writing/);

    const crossEngineLoop = await runCli([
      "loop", "--repo-root", fixture.repoRoot, "--mode", "real", "--engine", "claude", "--max-accepts", "1",
    ]);
    assert.equal(crossEngineLoop.code, 1);
    assert.match(crossEngineLoop.stderr, /Claude is reserved for map writing/);
    assert.equal((await readStateFile(fixture.statePath)).engine, "codex");

    state.engine = "claude";
    await writeFile(fixture.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    const oldClaudeSurvey = await runCli([
      "loop", "--repo-root", fixture.repoRoot, "--mode", "real", "--engine", "codex", "--max-accepts", "1",
    ]);
    assert.equal(oldClaudeSurvey.code, 1);
    assert.match(oldClaudeSurvey.stderr, /surveyed with engine 'claude'/);
  } finally {
    await rm(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("fake claude binary: argv shape is enforced and the envelope round-trips", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-fake-claude-"));
  const fakeClaudePath = path.join(tempRoot, "fake-claude.cjs");
  const argvPath = path.join(tempRoot, "claude-argv.json");
  try {
    await writeFile(fakeClaudePath, `#!/usr/bin/env node
const fs = require("node:fs");
fs.writeFileSync(${JSON.stringify(argvPath)}, JSON.stringify(process.argv.slice(2)));
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({
    is_error: false,
    result: "{\\"ok\\":true}",
    structured_output: { ok: true, promptLength: input.length },
    total_cost_usd: 0.01,
    usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 5 },
  }));
});
`, "utf8");
    await chmod(fakeClaudePath, 0o755);
    const result = await new Promise<{ stdout: string }>((resolve, reject) => {
      const child = execFileCallback(
        process.execPath,
        [fakeClaudePath, ...claudeInvocationArgs({ role: "reviewer", schemaJson: "{\"type\":\"object\"}" })],
        { cwd: tempRoot },
        (error, stdout) => (error ? reject(error) : resolve({ stdout })),
      );
      child.stdin?.end("blind review prompt");
    });
    const envelope = parseClaudeEnvelope(result.stdout);
    assert.deepEqual(envelope.structuredOutput, { ok: true, promptLength: "blind review prompt".length });
    const argv = JSON.parse(await readFile(argvPath, "utf8")) as string[];
    assert.ok(argv.includes("--safe-mode"));
    assert.ok(argv.includes("--no-session-persistence"));
    assert.ok(argv.includes("--json-schema"));
    assert.deepEqual(argv.slice(argv.indexOf("--tools"), argv.indexOf("--tools") + 2), ["--tools", "Read"]);
    assert.deepEqual(argv.slice(argv.indexOf("--allowedTools"), argv.indexOf("--allowedTools") + 2), ["--allowedTools", "Read"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("failed engine calls identify the selected CLI and never invoke the other engine", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-engine-failure-"));
  const callsPath = path.join(tempRoot, "calls.txt");
  const previousCodexBin = process.env.CODEX_BIN;
  const previousClaudeBin = process.env.CLAUDE_BIN;
  try {
    for (const engine of ["claude", "codex"] as const) {
      const fakePath = path.join(tempRoot, `fake-${engine}.cjs`);
      await writeFile(fakePath, `#!/usr/bin/env node
require("node:fs").appendFileSync(${JSON.stringify(callsPath)}, ${JSON.stringify(`${engine}\n`)});
process.stderr.write(${JSON.stringify(`sentinel ${engine} failure\n`)});
process.exit(17);
`, "utf8");
      await chmod(fakePath, 0o755);
      if (engine === "claude") process.env.CLAUDE_BIN = fakePath;
      else process.env.CODEX_BIN = fakePath;
    }
    for (const engine of ["claude", "codex"] as const) {
      await assert.rejects(invokeEngineJson(engine, {
        repoRoot: tempRoot,
        prompt: "Return the one bounded writer result.",
        images: [],
        schema: { type: "object", properties: {}, required: [], additionalProperties: false },
        resultPath: path.join(tempRoot, `${engine}-result.json`),
        role: "writer",
      }), new RegExp(`${engine === "claude" ? "Claude Code" : "Codex"} CLI failed \\(17\\): sentinel ${engine} failure`));
      const calls = (await readFile(callsPath, "utf8")).trim().split("\n");
      assert.deepEqual(calls, engine === "claude" ? ["claude"] : ["claude", "codex"]);
    }
  } finally {
    if (previousCodexBin === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = previousCodexBin;
    if (previousClaudeBin === undefined) delete process.env.CLAUDE_BIN;
    else process.env.CLAUDE_BIN = previousClaudeBin;
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Codex-controlled tasks dispatch map writing only to Claude Fable 5.1", async () => {
  assert.equal(WRITER_ENGINE, "claude");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "clawd-strike-writer-engine-"));
  const callsPath = path.join(tempRoot, "calls.txt");
  const workOrderPath = path.join(tempRoot, "work-order.md");
  const previousCodexBin = process.env.CODEX_BIN;
  const previousClaudeBin = process.env.CLAUDE_BIN;
  try {
    await writeFile(workOrderPath, "Make one bounded map edit and stop.\n", "utf8");
    for (const engine of ["claude", "codex"] as const) {
      const fakePath = path.join(tempRoot, `fake-${engine}.cjs`);
      await writeFile(fakePath, `#!/usr/bin/env node
require("node:fs").appendFileSync(${JSON.stringify(callsPath)}, ${JSON.stringify(`${engine}\n`)});
if (${JSON.stringify(engine)} !== "claude") process.exit(98);
let prompt = "";
process.stdin.on("data", (chunk) => { prompt += chunk; });
process.stdin.on("end", () => {
  if (!prompt.includes("Make one bounded map edit and stop.")) process.exit(99);
  process.stdout.write(JSON.stringify({ is_error: false, structured_output: {
    summary: "One bounded edit.", designRationale: "The storage entrance establishes the frontage axis."
  } }));
});
`, "utf8");
      await chmod(fakePath, 0o755);
      if (engine === "claude") process.env.CLAUDE_BIN = fakePath;
      else process.env.CODEX_BIN = fakePath;
    }
    // Only the fields consumed by invokeWriter are needed; captures and map
    // mutation are deliberately outside this fake-CLI routing test.
    const options = { mode: "real", engine: "codex", repoRoot: tempRoot } as Parameters<typeof invokeWriter>[0];
    const context = {
      unit: { id: "unit-a" },
      before: { units: [{ id: "unit-a", views: {
        primary: { imagePath: path.join(tempRoot, "primary.png") },
        context: { imagePath: path.join(tempRoot, "context.png") },
      } }] },
      workOrderPath,
      artifactDir: tempRoot,
      targetViewIds: [],
    } as unknown as Parameters<typeof invokeWriter>[1];
    const telemetry = await invokeWriter(options, context);
    assert.equal(telemetry?.engine, "claude");
    assert.equal(telemetry?.role, "writer");
    assert.equal(telemetry?.model, "claude-fable-5-1");
    assert.equal(await readFile(callsPath, "utf8"), "claude\n", "Codex never receives the implementation work order");
  } finally {
    if (previousCodexBin === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = previousCodexBin;
    if (previousClaudeBin === undefined) delete process.env.CLAUDE_BIN;
    else process.env.CLAUDE_BIN = previousClaudeBin;
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("map:loop in mock mode runs planner-free tasks to the accept bound and reports", async () => {
  const fixture = await buildFixture();
  const previousCodexBin = process.env.CODEX_BIN;
  const previousClaudeBin = process.env.CLAUDE_BIN;
  try {
    const fakeModelPath = path.join(fixture.tempRoot, "fake-model.cjs");
    await writeFile(fakeModelPath, `#!/usr/bin/env node
require("node:fs").writeFileSync(${JSON.stringify(fixture.markerPath)}, "invoked\\n");
process.exit(97);
`, "utf8");
    await chmod(fakeModelPath, 0o755);
    process.env.CODEX_BIN = fakeModelPath;
    process.env.CLAUDE_BIN = fakeModelPath;

    const survey = await runCli(["survey", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic"]);
    assert.equal(survey.code, 0, survey.stderr);

    const loopWithMaxTasks = await runCli([
      "loop", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic", "--max-tasks", "2",
    ]);
    assert.equal(loopWithMaxTasks.code, 1);
    assert.match(loopWithMaxTasks.stderr, /--max-tasks is not valid here/);

    const loop = await runCli([
      "loop", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic", "--commit",
      "--max-accepts", "1",
      "--mock-target", "apps/client/src/runtime/map/propFamilies/visualFixture.ts",
      "--mock-review", "accept",
    ]);
    assert.equal(loop.code, 0, loop.stderr);
    const report = JSON.parse(loop.stdout.slice(loop.stdout.indexOf("{"))) as {
      loop: string;
      writerEngine: string;
      accepts: number;
      stopReason: string;
      outcomes: string[];
    };
    assert.equal(report.loop, "final-report");
    assert.equal(report.writerEngine, "claude");
    assert.equal(report.accepts, 1);
    assert.equal(report.stopReason, "max-accepts");
    assert.equal(report.outcomes.length, 1);
    assert.match(report.outcomes[0] ?? "", /accept/);

    const state = await readStateFile(fixture.statePath);
    assert.equal(state.activeTask, null);
    assert.equal(state.units.reduce((sum, unit) => sum + unit.acceptedChanges, 0), 1);

    const manualPlanner = await runCli([
      "loop", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic",
      "--planner", "manual", "--max-accepts", "1",
    ]);
    assert.equal(manualPlanner.code, 0, manualPlanner.stderr);
    assert.match(manualPlanner.stdout, /awaiting-operator-objective/);

    assert.equal(
      await readFile(fixture.markerPath, "utf8").then(() => true).catch(() => false),
      false,
      "mock loop must never invoke a model binary",
    );
  } finally {
    if (previousCodexBin === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = previousCodexBin;
    if (previousClaudeBin === undefined) delete process.env.CLAUDE_BIN;
    else process.env.CLAUDE_BIN = previousClaudeBin;
    await rm(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("map:loop stops at the resurvey boundary instead of running through it", async () => {
  const fixture = await buildFixture();
  try {
    const survey = await runCli(["survey", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic"]);
    assert.equal(survey.code, 0, survey.stderr);
    const state = JSON.parse(await readFile(fixture.statePath, "utf8")) as Record<string, unknown>;
    state.surveyRequired = true;
    await writeFile(fixture.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    const loop = await runCli([
      "loop", "--repo-root", fixture.repoRoot, "--mode", "mock", "--synthetic", "--commit",
      "--max-accepts", "2",
      "--mock-target", "apps/client/src/runtime/map/propFamilies/visualFixture.ts",
    ]);
    assert.equal(loop.code, 0, loop.stderr);
    const report = JSON.parse(loop.stdout.slice(loop.stdout.indexOf("{"))) as { stopReason: string; accepts: number };
    assert.equal(report.stopReason, "resurvey-required");
    assert.equal(report.accepts, 0);
  } finally {
    await rm(fixture.tempRoot, { recursive: true, force: true });
  }
});
