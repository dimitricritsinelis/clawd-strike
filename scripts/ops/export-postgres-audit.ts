import { loadEnv } from "./lib/envFile.js";
import { exportPostgresAudit } from "./lib/postgresAuditExport.js";

type CliOptions = {
  envFile: string | null;
  outPath: string | null;
};

function printUsage(): void {
  console.log(`Usage:
  pnpm db:export -- [--env-file .env.production.local] [--out /Users/dimitri/Desktop/clawd-strike-postgres-audit-2026-03-08.xlsx]

Options:
  --env-file <path>  Load environment variables from a local env file before exporting.
  --out <path>       Workbook output path. Defaults to a dated Desktop-adjacent .xlsx path.
`);
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    envFile: null,
    outPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || arg === "--") continue;

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--env-file") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--env-file requires a path.");
      }
      options.envFile = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--env-file=")) {
      options.envFile = arg.slice("--env-file=".length);
      continue;
    }
    if (arg === "--out") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--out requires a path.");
      }
      options.outPath = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--out=")) {
      options.outPath = arg.slice("--out=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const env = loadEnv(options.envFile);

  const result = await exportPostgresAudit({
    env,
    ...(options.outPath ? { outPath: options.outPath } : {}),
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `[db:export] ${error.message}`
      : "[db:export] failed",
  );
  process.exitCode = 1;
});
