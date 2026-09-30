import {
  type PoolConfig,
  Pool,
} from "pg";
import {
  attachDatabasePool,
} from "@vercel/functions";

type PoolKind = "read" | "write";

const SHARED_CHAMPION_WRITE_CONNECTION_ENV_KEYS = [
  "POSTGRES_WRITE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "NEON_DATABASE_URL",
] as const;

const SHARED_CHAMPION_READ_CONNECTION_ENV_KEYS = [
  "POSTGRES_READ_URL",
  "POSTGRES_WRITE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "NEON_DATABASE_URL",
] as const;

const SHARED_CHAMPION_RECONCILE_CONNECTION_ENV_KEYS = [
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_WRITE_URL",
  "POSTGRES_URL",
  "DATABASE_URL",
  "NEON_DATABASE_URL",
] as const;

export type SharedChampionConnectionEnvKey =
  | typeof SHARED_CHAMPION_WRITE_CONNECTION_ENV_KEYS[number]
  | typeof SHARED_CHAMPION_READ_CONNECTION_ENV_KEYS[number]
  | typeof SHARED_CHAMPION_RECONCILE_CONNECTION_ENV_KEYS[number];

export type SharedChampionConnectionSelection = {
  connectionString: string;
  envKey: SharedChampionConnectionEnvKey;
};

const warnedConnectionSelections = new Set<string>();

function isProductionDatabaseMode(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function getSharedChampionConnectionEnvKeys(kind: PoolKind): readonly SharedChampionConnectionEnvKey[] {
  return kind === "write"
    ? SHARED_CHAMPION_WRITE_CONNECTION_ENV_KEYS
    : SHARED_CHAMPION_READ_CONNECTION_ENV_KEYS;
}

function formatConnectionEnvKeys(kind: PoolKind): string {
  return getSharedChampionConnectionEnvKeys(kind).join(", ");
}

function formatReconcileConnectionEnvKeys(): string {
  return SHARED_CHAMPION_RECONCILE_CONNECTION_ENV_KEYS.join(", ");
}

function maybeWarnOnConnectionAlias(kind: PoolKind, selection: SharedChampionConnectionSelection): void {
  if (!isProductionDatabaseMode()) return;

  const preferredEnvKey = kind === "write" ? "POSTGRES_WRITE_URL" : "POSTGRES_READ_URL";
  if (selection.envKey === preferredEnvKey) return;

  const warningKey = `${kind}:${selection.envKey}`;
  if (warnedConnectionSelections.has(warningKey)) return;
  warnedConnectionSelections.add(warningKey);

  console.warn(
    `[shared-champion] using ${selection.envKey} for the ${kind} database connection. `
    + `Set ${preferredEnvKey} to make the deployment-specific override explicit.`,
  );
}

export function resolvePgConnectionSelection(
  kind: PoolKind,
  env: NodeJS.ProcessEnv = process.env,
): SharedChampionConnectionSelection {
  for (const envKey of getSharedChampionConnectionEnvKeys(kind)) {
    const candidate = env[envKey];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return {
        connectionString: candidate.trim(),
        envKey,
      };
    }
  }

  throw new Error(
    kind === "write"
      ? `Missing Postgres write connection string. Configure one of: ${formatConnectionEnvKeys("write")}.`
      : `Missing Postgres read connection string. Configure one of: ${formatConnectionEnvKeys("read")}.`,
  );
}

export function resolveSharedChampionReconcileConnectionSelection(
  env: NodeJS.ProcessEnv = process.env,
): SharedChampionConnectionSelection {
  for (const envKey of SHARED_CHAMPION_RECONCILE_CONNECTION_ENV_KEYS) {
    const candidate = env[envKey];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return {
        connectionString: candidate.trim(),
        envKey,
      };
    }
  }

  throw new Error(
    `Missing Postgres reconcile connection string. Configure one of: ${formatReconcileConnectionEnvKeys()}.`,
  );
}

export function resolveSharedChampionReconcileConnectionString(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return normalizePgConnectionString(
    resolveSharedChampionReconcileConnectionSelection(env).connectionString,
  ).connectionString;
}

export function resolvePgConnectionString(
  kind: PoolKind,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const selection = resolvePgConnectionSelection(kind, env);
  if (env === process.env) {
    maybeWarnOnConnectionAlias(kind, selection);
  }
  return normalizePgConnectionString(selection.connectionString).connectionString;
}

function hasPgConnectionString(kind: PoolKind): boolean {
  try {
    return resolvePgConnectionString(kind).length > 0;
  } catch {
    return false;
  }
}

export function normalizePgConnectionString(connectionString: string): {
  connectionString: string;
  sslModeBefore: string | null;
  sslModeAfter: string | null;
} {
  try {
    const parsedUrl = new URL(connectionString);
    const sslModeBefore = parsedUrl.searchParams.get("sslmode")?.trim().toLowerCase() ?? null;
    const isLocalHost = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

    if (isLocalHost || sslModeBefore === null || sslModeBefore === "disable" || sslModeBefore === "verify-full") {
      return {
        connectionString,
        sslModeBefore,
        sslModeAfter: sslModeBefore,
      };
    }

    if (sslModeBefore === "prefer" || sslModeBefore === "require" || sslModeBefore === "verify-ca") {
      parsedUrl.searchParams.set("sslmode", "verify-full");
      return {
        connectionString: parsedUrl.toString(),
        sslModeBefore,
        sslModeAfter: "verify-full",
      };
    }

    return {
      connectionString,
      sslModeBefore,
      sslModeAfter: sslModeBefore,
    };
  } catch {
    return {
      connectionString,
      sslModeBefore: null,
      sslModeAfter: null,
    };
  }
}

export function resolveSslConfig(connectionString: string): PoolConfig["ssl"] {
  try {
    const parsedUrl = new URL(connectionString);
    const sslMode = parsedUrl.searchParams.get("sslmode")?.trim().toLowerCase();
    const isLocalHost = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
    if (sslMode === "disable" || isLocalHost) return undefined;
    return { rejectUnauthorized: true };
  } catch {
    return { rejectUnauthorized: true };
  }
}

const pools: Partial<Record<PoolKind, Pool>> = {};

export function getPool(kind: PoolKind): Pool {
  const existing = pools[kind];
  if (existing) return existing;

  const connectionString = resolvePgConnectionString(kind);
  const pool = new Pool({
    connectionString,
    max: kind === "write" ? 4 : 2,
    idleTimeoutMillis: 5_000,
    ssl: resolveSslConfig(connectionString),
  });
  // pg removes failed idle clients itself. Handling the event keeps a lost
  // connection from crashing the process; the next query opens a new client.
  pool.on("error", () => {
    console.warn(`[shared-champion] ${kind} database pool discarded a failed idle connection.`);
  });
  attachDatabasePool(pool);
  pools[kind] = pool;
  return pool;
}

export function hasConfiguredSharedChampionDatabase(kind: PoolKind = "write"): boolean {
  return hasPgConnectionString(kind);
}
