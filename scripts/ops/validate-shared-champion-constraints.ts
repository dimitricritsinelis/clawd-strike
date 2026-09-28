import { validateSharedChampionConstraints } from "../../server/highScoreStoreImpl.js";
import { loadEnv } from "./lib/envFile.js";

type CliOptions = {
  envFile: string | null;
  json: boolean;
};

function printUsage(): void {
  console.log(`Usage:
  pnpm db:validate-constraints -- [--env-file .env.production.local] [--json]

Options:
  --env-file <path>  Load environment variables from a local env file before validating constraints.
  --json             Print the validation report as JSON.
`);
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    envFile: null,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg === "--") continue;

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--json") {
      options.json = true;
      continue;
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const env = loadEnv(options.envFile);

  const report = await validateSharedChampionConstraints({ env });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("Shared champion constraint validation");
  console.log(`connection env key: ${report.connectionEnvKey}`);
  console.log(`sslmode before: ${report.connectionSslModeBefore ?? "(unset)"}`);
  console.log(`sslmode after: ${report.connectionSslModeAfter ?? "(unset)"}`);
  console.log(`validated constraints: ${report.validatedConstraints.join(", ")}`);
  if (report.alreadyPresentConstraints.length > 0) {
    console.log(`present before validation: ${report.alreadyPresentConstraints.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `[db:validate-constraints] ${error.message}`
      : "[db:validate-constraints] failed",
  );
  process.exitCode = 1;
});
