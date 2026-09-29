import { SHARED_CHAMPION_SCORE_RULESET, type SharedChampion } from "../../../../shared/highScore";

const SCORE_STORAGE_PREFIX = "clawd-strike:score-best";
const SCORE_RULESET_KEY = SHARED_CHAMPION_SCORE_RULESET;

export function shouldReplaceSharedChampion(
  currentChampion: SharedChampion | null,
  nextChampion: SharedChampion | null,
): boolean {
  if (nextChampion === null) {
    return currentChampion === null;
  }
  if (currentChampion === null) {
    return true;
  }
  if (nextChampion.score !== currentChampion.score) {
    return nextChampion.score > currentChampion.score;
  }
  return nextChampion.updatedAt >= currentChampion.updatedAt;
}

export function makeScoreStorageKey(mapId: string, boardKey: string): string {
  return `${SCORE_STORAGE_PREFIX}:${mapId}:${SCORE_RULESET_KEY}:${boardKey}`;
}

export function normalizeScoreValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function readBestScore(storageKey: string): number {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return normalizeScoreValue(parsed);
  } catch {
    return 0;
  }
}

export function writeBestScore(storageKey: string, value: number): void {
  try {
    window.sessionStorage.setItem(storageKey, String(normalizeScoreValue(value)));
  } catch {
    // Ignore storage errors in constrained browser contexts.
  }
}
