import {
  areGameplayProfileIdentitiesEqual,
  deriveSharedChampionBoardKey,
  parseSharedChampionGetResponse,
  parseSharedChampionRunFinishResponse,
  parseSharedChampionRunStartResponse,
  SHARED_CHAMPION_RUN_FINISH_ENDPOINT,
  SHARED_CHAMPION_RUN_START_ENDPOINT,
  SHARED_CHAMPION_SCORE_RULESET,
  SHARED_CHAMPION_SCORE_WRITE_ENDPOINT,
  SITEWIDE_CHAMPION_BOARD_KEY,
  type SharedChampion,
  type SharedChampionRunStartRequest,
  type SharedChampionRunSummary,
  type SharedChampionSnapshot,
  type SharedChampionSnapshotStatus,
} from "../../../shared/highScore";
import type { GameplayProfileIdentity } from "../../../shared/gameplayProfile";
import { isLocalhostHostname } from "./hostEnvironment";

const SHARED_CHAMPION_ENDPOINT = SHARED_CHAMPION_SCORE_WRITE_ENDPOINT;
export type SharedChampionRunSession = GameplayProfileIdentity & {
  runToken: string;
  issuedAt: string;
  expiresAt: string;
  boardKey: string;
  ruleset: typeof SHARED_CHAMPION_SCORE_RULESET;
};

export type LoadSharedChampionResult = {
  snapshot: SharedChampionSnapshot;
  loadedFromNetwork: boolean;
};

type SharedChampionBoardState = {
  status: SharedChampionSnapshotStatus;
  champion: SharedChampion | null;
  pendingLoad: Promise<LoadSharedChampionResult> | null;
};

export type LoadSharedChampionOptions = {
  force?: boolean;
  profileIdentity?: GameplayProfileIdentity;
};

const boardStates = new Map<string, SharedChampionBoardState>();

function getBoardKey(profileIdentity?: GameplayProfileIdentity): string {
  return profileIdentity
    ? deriveSharedChampionBoardKey(profileIdentity)
    : SITEWIDE_CHAMPION_BOARD_KEY;
}

function getBoardState(profileIdentity?: GameplayProfileIdentity): SharedChampionBoardState {
  const boardKey = getBoardKey(profileIdentity);
  const existing = boardStates.get(boardKey);
  if (existing) return existing;
  const created: SharedChampionBoardState = {
    status: "idle",
    champion: null,
    pendingLoad: null,
  };
  boardStates.set(boardKey, created);
  return created;
}

function snapshot(state: SharedChampionBoardState): SharedChampionSnapshot {
  return {
    status: state.status,
    champion: state.champion,
  };
}

export function getSharedChampionSnapshot(profileIdentity?: GameplayProfileIdentity): SharedChampionSnapshot {
  return snapshot(getBoardState(profileIdentity));
}

function canUseSharedChampionNetwork(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  if (import.meta.env.DEV) {
    return true;
  }
  return !isLocalhostHostname(window.location.hostname);
}

function buildSharedChampionGetEndpoint(profileIdentity?: GameplayProfileIdentity): string {
  if (!profileIdentity) return SHARED_CHAMPION_ENDPOINT;
  const search = new URLSearchParams({
    profileId: profileIdentity.profileId,
    tuningRevision: profileIdentity.tuningRevision,
    balanceSeason: profileIdentity.balanceSeason,
  });
  return `${SHARED_CHAMPION_ENDPOINT}?${search.toString()}`;
}

function setChampionForBoard(
  state: SharedChampionBoardState,
  expectedBoardKey: string,
  nextChampion: SharedChampion | null,
): boolean {
  if (nextChampion && nextChampion.boardKey !== expectedBoardKey) {
    return false;
  }
  state.champion = nextChampion;
  return true;
}

export async function loadSharedChampionWithMeta(
  options: LoadSharedChampionOptions = {},
): Promise<LoadSharedChampionResult> {
  const state = getBoardState(options.profileIdentity);
  const boardKey = getBoardKey(options.profileIdentity);
  if (!canUseSharedChampionNetwork()) {
    state.status = state.champion ? "ready" : "unavailable";
    return {
      snapshot: snapshot(state),
      loadedFromNetwork: false,
    };
  }
  if (!options.force && state.status === "ready") {
    return {
      snapshot: snapshot(state),
      loadedFromNetwork: false,
    };
  }
  if (state.pendingLoad) {
    return state.pendingLoad;
  }

  state.status = "loading";
  state.pendingLoad = fetch(buildSharedChampionGetEndpoint(options.profileIdentity), {
    method: "GET",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`GET /api/high-score failed: ${response.status}`);
      }

      const parsed = parseSharedChampionGetResponse(await response.json());
      if (!parsed) {
        throw new Error("GET /api/high-score returned an invalid payload.");
      }

      if (!setChampionForBoard(state, boardKey, parsed.champion)) {
        throw new Error("GET /api/high-score returned a champion for a different profile board.");
      }
      state.status = "ready";
      return {
        snapshot: snapshot(state),
        loadedFromNetwork: true,
      };
    })
    .catch((error) => {
      console.warn("[shared-champion] failed to load", error);
      state.status = state.champion ? "ready" : "unavailable";
      return {
        snapshot: snapshot(state),
        loadedFromNetwork: false,
      };
    })
    .finally(() => {
      state.pendingLoad = null;
    });

  return state.pendingLoad;
}

export async function loadSharedChampion(
  options: LoadSharedChampionOptions = {},
): Promise<SharedChampionSnapshot> {
  const result = await loadSharedChampionWithMeta(options);
  return result.snapshot;
}

export async function startSharedChampionRunSession(
  input: SharedChampionRunStartRequest,
): Promise<SharedChampionRunSession | null> {
  if (!canUseSharedChampionNetwork()) {
    return null;
  }
  try {
    const response = await fetch(SHARED_CHAMPION_RUN_START_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`POST ${SHARED_CHAMPION_RUN_START_ENDPOINT} failed: ${response.status}`);
    }

    const parsed = parseSharedChampionRunStartResponse(await response.json());
    if (!parsed) {
      throw new Error("POST /api/run/start returned an invalid payload.");
    }
    if (!areGameplayProfileIdentitiesEqual(parsed, input)) {
      throw new Error("POST /api/run/start returned a mismatched gameplay profile identity.");
    }

    return {
      runToken: parsed.runToken,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
      boardKey: parsed.boardKey,
      ruleset: parsed.ruleset,
      profileId: parsed.profileId,
      tuningRevision: parsed.tuningRevision,
      balanceSeason: parsed.balanceSeason,
    };
  } catch (error) {
    console.warn("[shared-champion] failed to start run session", error);
    return null;
  }
}

export async function submitSharedChampionRunSession(
  session: SharedChampionRunSession,
  summary: SharedChampionRunSummary,
): Promise<{ accepted: boolean; updated: boolean; reason: string | null; snapshot: SharedChampionSnapshot }> {
  const profileIdentity: GameplayProfileIdentity = session;
  const state = getBoardState(profileIdentity);
  if (!canUseSharedChampionNetwork()) {
    state.status = state.champion ? "ready" : "unavailable";
    return {
      accepted: false,
      updated: false,
      reason: "shared-champion-network-disabled",
      snapshot: snapshot(state),
    };
  }
  try {
    const response = await fetch(SHARED_CHAMPION_RUN_FINISH_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        runToken: session.runToken,
        summary,
        profileId: session.profileId,
        tuningRevision: session.tuningRevision,
        balanceSeason: session.balanceSeason,
      }),
    });

    const payload = await response.json().catch(() => null);
    const parsed = parseSharedChampionRunFinishResponse(payload);

    if (!response.ok) {
      if (parsed) {
        setChampionForBoard(state, session.boardKey, parsed.champion);
        state.status = "ready";
        return {
          accepted: parsed.accepted,
          updated: parsed.updated,
          reason: parsed.reason,
          snapshot: snapshot(state),
        };
      }

      throw new Error(`POST ${SHARED_CHAMPION_RUN_FINISH_ENDPOINT} failed: ${response.status}`);
    }

    if (!parsed) {
      throw new Error("POST /api/run/finish returned an invalid payload.");
    }

    if (!setChampionForBoard(state, session.boardKey, parsed.champion)) {
      throw new Error("POST /api/run/finish returned a champion for a different profile board.");
    }
    state.status = "ready";
    return {
      accepted: parsed.accepted,
      updated: parsed.updated,
      reason: parsed.reason,
      snapshot: snapshot(state),
    };
  } catch (error) {
    console.warn("[shared-champion] failed to finish run session", error);
    if (!state.champion) {
      state.status = "unavailable";
    }
    return {
      accepted: false,
      updated: false,
      reason: error instanceof Error ? error.message : String(error),
      snapshot: snapshot(state),
    };
  }
}
