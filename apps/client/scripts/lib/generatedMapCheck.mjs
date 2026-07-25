import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function assertGeneratedMapsFresh(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  try {
    const result = await execFileAsync(
      process.execPath,
      ["scripts/gen-map-runtime.mjs", "--check"],
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return {
      passed: true,
      output: result.stdout.trim(),
    };
  } catch (error) {
    const detail = [
      error?.stdout?.trim(),
      error?.stderr?.trim(),
      error instanceof Error ? error.message : String(error),
    ].filter(Boolean).join(" | ");
    throw new Error(
      `[generated-map-check] public runtime map or shots are stale; run pnpm gen:maps | ${detail}`,
    );
  }
}
