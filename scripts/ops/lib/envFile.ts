import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

/**
 * Returns a copy of process.env with the variables from `filePath` applied on
 * top, so the env file wins over ambient variables (node --env-file would let
 * ambient variables win).
 */
export function loadEnv(filePath: string | null): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (filePath) {
    Object.assign(env, parseEnv(fs.readFileSync(path.resolve(filePath), "utf8")));
  }
  return env;
}
