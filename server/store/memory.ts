import {
  type SharedChampionRunTokenRecord,
  type SharedChampionStore,
  type SharedChampionAuditEvent,
} from "./types.js";
import {
  type SharedChampionRunRecord,
  type ResolvedSharedChampionStatsFilters,
  type SharedChampionStatsOverview,
  formatNullableScore,
  type SharedChampionStatsNameRollup,
  type SharedChampionStatsDailyRollup,
  createRunCursor,
} from "../highScoreStats.js";
import {
  roundMetric,
  normalizeRunTokenInput,
  getSharedChampionRunTokenProfileIdentity,
  normalizeRunRecord,
} from "./records.js";
import {
  type SharedChampion,
  deriveSharedChampionBoardKey,
  SITEWIDE_CHAMPION_BOARD_KEY,
  createSharedChampion,
} from "../../apps/shared/highScore.js";

type InMemoryRunTokenRecord = SharedChampionRunTokenRecord & {
  tokenHash: string;
};

function compareRunCursor(a: SharedChampionRunRecord, b: { createdAt: string; runId: string }): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  if (a.runId === b.runId) return 0;
  return a.runId < b.runId ? -1 : 1;
}

function applyInMemoryFilters<T extends SharedChampionRunRecord>(
  runs: readonly T[],
  filters: ResolvedSharedChampionStatsFilters,
): T[] {
  return runs.filter((run) => {
    if (filters.from && run.endedAt < filters.from) return false;
    if (filters.to && run.endedAt > filters.to) return false;
    if (filters.controlMode && run.controlMode !== filters.controlMode) return false;
    if (filters.mapId && run.mapId !== filters.mapId) return false;
    if (filters.playerNameKey && run.playerNameKey !== filters.playerNameKey) return false;
    if (filters.profileId && run.profileId !== filters.profileId) return false;
    if (filters.tuningRevision && run.tuningRevision !== filters.tuningRevision) return false;
    if (filters.balanceSeason && run.balanceSeason !== filters.balanceSeason) return false;
    return true;
  });
}

function sortRunsDesc<T extends SharedChampionRunRecord>(runs: readonly T[]): T[] {
  return [...runs].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    if (a.runId === b.runId) return 0;
    return a.runId < b.runId ? 1 : -1;
  });
}

function computeOverview(runs: readonly SharedChampionRunRecord[]): SharedChampionStatsOverview {
  const totalRuns = runs.length;
  const championUpdates = runs.filter((run) => run.championUpdated).length;
  const uniqueNames = new Set(runs.map((run) => run.playerNameKey)).size;
  const humanRuns = runs.filter((run) => run.controlMode === "human").length;
  const agentRuns = runs.filter((run) => run.controlMode === "agent").length;
  const bestScore = totalRuns > 0
    ? Math.max(...runs.map((run) => run.score))
    : null;
  const averageScoreRaw = totalRuns > 0
    ? runs.reduce((sum, run) => sum + run.score, 0) / totalRuns
    : null;
  const averageAccuracy = totalRuns > 0
    ? runs.reduce((sum, run) => sum + run.accuracyPct, 0) / totalRuns
    : null;
  const latestRunAt = totalRuns > 0 ? sortRunsDesc(runs)[0]?.createdAt ?? null : null;
  const latestChampionAt = sortRunsDesc(runs.filter((run) => run.championUpdated))[0]?.createdAt ?? null;
  return {
    totalRuns,
    championUpdates,
    uniquePlayerNames: uniqueNames,
    humanRuns,
    agentRuns,
    bestScore: formatNullableScore(bestScore),
    averageScore: averageScoreRaw === null ? null : roundMetric(averageScoreRaw, 2),
    averageAccuracyPct: averageAccuracy === null ? null : roundMetric(averageAccuracy, 2),
    latestRunAt,
    latestChampionAt,
  };
}

function computeNameRollups(
  runs: readonly SharedChampionRunRecord[],
): SharedChampionStatsNameRollup[] {
  const byName = new Map<string, SharedChampionRunRecord[]>();
  for (const run of runs) {
    const bucket = byName.get(run.playerNameKey);
    if (bucket) {
      bucket.push(run);
    } else {
      byName.set(run.playerNameKey, [run]);
    }
  }
  return [...byName.entries()]
    .map(([playerNameKey, playerRuns]) => {
      const sorted = sortRunsDesc(playerRuns);
      const totalRuns = playerRuns.length;
      const championUpdates = playerRuns.filter((run) => run.championUpdated).length;
      const humanRuns = playerRuns.filter((run) => run.controlMode === "human").length;
      const agentRuns = playerRuns.filter((run) => run.controlMode === "agent").length;
      const bestScore = Math.max(...playerRuns.map((run) => run.score));
      const averageScore = playerRuns.reduce((sum, run) => sum + run.score, 0) / totalRuns;
      const averageAccuracyPct = playerRuns.reduce((sum, run) => sum + run.accuracyPct, 0) / totalRuns;
      const stableName = [...new Set(playerRuns.map((run) => run.playerName))].sort()[0] ?? playerNameKey;
      return {
        playerNameKey,
        playerName: stableName,
        totalRuns,
        championUpdates,
        humanRuns,
        agentRuns,
        bestScore,
        averageScore: roundMetric(averageScore, 2),
        averageAccuracyPct: roundMetric(averageAccuracyPct, 2),
        latestRunAt: sorted[0]?.createdAt ?? new Date(0).toISOString(),
      };
    })
    .sort((a, b) => {
      if (a.bestScore !== b.bestScore) {
        return b.bestScore - a.bestScore;
      }
      if (a.latestRunAt !== b.latestRunAt) {
        return a.latestRunAt < b.latestRunAt ? 1 : -1;
      }
      return a.playerNameKey.localeCompare(b.playerNameKey);
    });
}

function computeDailyRollups(
  runs: readonly SharedChampionRunRecord[],
): SharedChampionStatsDailyRollup[] {
  const byDay = new Map<string, SharedChampionRunRecord[]>();
  for (const run of runs) {
    const day = run.endedAt.slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket) {
      bucket.push(run);
    } else {
      byDay.set(day, [run]);
    }
  }
  return [...byDay.entries()]
    .map(([day, dayRuns]) => {
      const totalRuns = dayRuns.length;
      const championUpdates = dayRuns.filter((run) => run.championUpdated).length;
      const uniquePlayerNames = new Set(dayRuns.map((run) => run.playerNameKey)).size;
      const humanRuns = dayRuns.filter((run) => run.controlMode === "human").length;
      const agentRuns = dayRuns.filter((run) => run.controlMode === "agent").length;
      const bestScore = Math.max(...dayRuns.map((run) => run.score));
      const averageScore = dayRuns.reduce((sum, run) => sum + run.score, 0) / totalRuns;
      const averageAccuracyPct = dayRuns.reduce((sum, run) => sum + run.accuracyPct, 0) / totalRuns;
      return {
        day,
        totalRuns,
        championUpdates,
        uniquePlayerNames,
        humanRuns,
        agentRuns,
        bestScore,
        averageScore: roundMetric(averageScore, 2),
        averageAccuracyPct: roundMetric(averageAccuracyPct, 2),
      };
    })
    .sort((a, b) => b.day.localeCompare(a.day));
}

export function createInMemorySharedChampionStore(): SharedChampionStore {
  const champions = new Map<string, SharedChampion>();
  const runTokens = new Map<string, InMemoryRunTokenRecord>();
  const auditEvents: SharedChampionAuditEvent[] = [];
  const runs: SharedChampionRunRecord[] = [];

  return {
    async getChampion(identity = null) {
      const boardKey = identity
        ? deriveSharedChampionBoardKey(identity)
        : SITEWIDE_CHAMPION_BOARD_KEY;
      return champions.get(boardKey) ?? null;
    },
    async consumeRateLimit() {
      // Development uses the request handler's per-process limiter.
      return true;
    },
    async issueRunToken(input) {
      const normalized = normalizeRunTokenInput(input);
      const issuedAt = new Date();
      const record: InMemoryRunTokenRecord = {
        runId: normalized.runId,
        tokenHash: normalized.tokenHash,
        playerName: normalized.playerName,
        controlMode: normalized.controlMode,
        mapId: normalized.mapId,
        ruleset: normalized.ruleset,
        balanceSeason: normalized.balanceSeason,
        profileId: normalized.profileId,
        tuningRevision: normalized.tuningRevision,
        boardKey: normalized.boardKey,
        issuedAt: issuedAt.toISOString(),
        expiresAt: normalized.expiresAt.toISOString(),
        claimedAt: null,
      };
      runTokens.set(normalized.tokenHash, record);
      return {
        runId: record.runId,
        playerName: record.playerName,
        controlMode: record.controlMode,
        mapId: record.mapId,
        ruleset: record.ruleset,
        balanceSeason: record.balanceSeason,
        profileId: record.profileId,
        tuningRevision: record.tuningRevision,
        boardKey: record.boardKey,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
        claimedAt: record.claimedAt,
      };
    },
    async consumeRunToken(input) {
      const tokenHash = input.tokenHash.trim();
      const record = runTokens.get(tokenHash) ?? null;
      if (!record) {
        return {
          status: "missing" as const,
          record: null,
        };
      }

      if (record.claimedAt !== null) {
        return {
          status: "used" as const,
          record: {
            runId: record.runId,
            playerName: record.playerName,
            controlMode: record.controlMode,
            mapId: record.mapId,
            ruleset: record.ruleset,
            balanceSeason: record.balanceSeason,
            profileId: record.profileId,
            tuningRevision: record.tuningRevision,
            boardKey: record.boardKey,
            issuedAt: record.issuedAt,
            expiresAt: record.expiresAt,
            claimedAt: record.claimedAt,
          },
        };
      }

      if (Date.parse(record.expiresAt) <= Date.now()) {
        return {
          status: "expired" as const,
          record: {
            runId: record.runId,
            playerName: record.playerName,
            controlMode: record.controlMode,
            mapId: record.mapId,
            ruleset: record.ruleset,
            balanceSeason: record.balanceSeason,
            profileId: record.profileId,
            tuningRevision: record.tuningRevision,
            boardKey: record.boardKey,
            issuedAt: record.issuedAt,
            expiresAt: record.expiresAt,
            claimedAt: record.claimedAt,
          },
        };
      }

      record.claimedAt = new Date().toISOString();
      return {
        status: "consumed" as const,
        record: {
          runId: record.runId,
          playerName: record.playerName,
          controlMode: record.controlMode,
          mapId: record.mapId,
          ruleset: record.ruleset,
          balanceSeason: record.balanceSeason,
          profileId: record.profileId,
          tuningRevision: record.tuningRevision,
          boardKey: record.boardKey,
          issuedAt: record.issuedAt,
          expiresAt: record.expiresAt,
          claimedAt: record.claimedAt,
        },
      };
    },
    async finalizeValidatedRun(input) {
      const identity = getSharedChampionRunTokenProfileIdentity(input.tokenRecord);
      if (!identity) {
        throw new Error("Competitive runs require a token-bound gameplay profile identity.");
      }
      const boardKey = deriveSharedChampionBoardKey(identity);
      const champion = champions.get(boardKey) ?? null;
      const normalizedSummary = normalizeRunRecord({
        ...input,
        championUpdated: false,
      });
      const nextChampion = createSharedChampion({
        holderName: normalizedSummary.playerName,
        score: normalizedSummary.score,
        controlMode: normalizedSummary.controlMode,
        updatedAt: new Date(normalizedSummary.createdAt),
        identity,
      });
      const updated = champion === null || normalizedSummary.score > champion.score;
      if (updated) {
        champions.set(boardKey, nextChampion);
      }
      const run = {
        ...normalizedSummary,
        championUpdated: updated,
      };
      runs.push(run);
      return {
        updated,
        champion: updated ? nextChampion : champion,
        run,
      };
    },
    async recordAuditEvent(event) {
      auditEvents.push(event);
    },
    async getStatsOverview(filters) {
      return computeOverview(applyInMemoryFilters(runs, filters));
    },
    async listRuns(filters) {
      let filtered = applyInMemoryFilters(runs, filters);
      if (filters.championUpdated !== null) {
        filtered = filtered.filter((run) => run.championUpdated === filters.championUpdated);
      }
      const sorted = sortRunsDesc(filtered);
      const afterCursor = filters.cursor
        ? sorted.filter((run) => compareRunCursor(run, filters.cursor!) < 0)
        : sorted;
      const items = afterCursor.slice(0, filters.limit);
      const next = afterCursor.length > filters.limit ? items[items.length - 1] ?? null : null;
      return {
        items,
        nextCursor: next ? createRunCursor({ createdAt: next.createdAt, runId: next.runId }) : null,
      };
    },
    async listNames(filters, limit) {
      return computeNameRollups(applyInMemoryFilters(runs, filters)).slice(0, limit);
    },
    async listDaily(filters, limit) {
      return computeDailyRollups(applyInMemoryFilters(runs, filters)).slice(0, limit);
    },
  };
}
