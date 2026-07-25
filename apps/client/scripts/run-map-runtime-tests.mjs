import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(scriptDir, "..");
const runtimeRoot = path.join(clientRoot, "src/runtime");

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(absolute);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [absolute] : [];
  }));
  return nested.flat();
}

const testFiles = (await collectTests(runtimeRoot))
  .map((filePath) => path.relative(clientRoot, filePath))
  .sort();

if (testFiles.length === 0) {
  throw new Error("No runtime TypeScript tests were found.");
}

const child = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "tsx", "--test", ...testFiles],
  {
    cwd: clientRoot,
    stdio: "inherit",
    env: process.env,
  },
);

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Runtime test process exited from signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
