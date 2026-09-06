import {
  SHARED_CHAMPION_WAVE_ENEMY_COUNT,
  calculateSharedChampionScore,
  computeAccuracyPercent,
  type SharedChampionRunDeathCause,
  type SharedChampionRunSummary,
} from "../../../shared/highScore";

export type SharedChampionCompetitiveTelemetry = Readonly<{
  kills: number;
  headshots: number;
  headshotsPerWave: readonly number[];
  shotsFired: number;
  shotsHit: number;
}>;

export type SharedChampionRunCompletion<TSession> = Readonly<{
  generation: number;
  activeTimeS: number;
  telemetry: SharedChampionCompetitiveTelemetry;
  sessionPromise: Promise<TSession | null>;
}>;

export function createSharedChampionRunSummary<TSession>(
  completion: SharedChampionRunCompletion<TSession> | null,
  deathCause: SharedChampionRunDeathCause,
): SharedChampionRunSummary {
  const telemetry = completion?.telemetry ?? {
    kills: 0,
    headshots: 0,
    headshotsPerWave: [],
    shotsFired: 0,
    shotsHit: 0,
  };
  const headshotsPerWave = [...telemetry.headshotsPerWave];
  return {
    // The wire format requires positive tenths. If death beats the start
    // response, 0.1s is a protocol floor inside the server's wall tolerance;
    // no pre-session time or telemetry is attributed to the episode.
    survivalTimeS: completion
      ? Math.max(0.1, Math.round(Math.max(0, completion.activeTimeS) * 10) / 10)
      : 0,
    kills: telemetry.kills,
    headshots: telemetry.headshots,
    headshotsPerWave,
    shotsFired: telemetry.shotsFired,
    shotsHit: telemetry.shotsHit,
    accuracy: computeAccuracyPercent(telemetry.shotsHit, telemetry.shotsFired),
    finalScore: calculateSharedChampionScore(telemetry.kills, headshotsPerWave),
    deathCause,
  };
}

type RunEpisode<TSession> = {
  generation: number;
  activeTimeS: number;
  sessionReady: boolean;
  activeFrame: boolean;
  completed: boolean;
  canceled: boolean;
  telemetry: {
    kills: number;
    headshots: number;
    headshotsPerWave: number[];
    shotsFired: number;
    shotsHit: number;
  };
  sessionPromise: Promise<TSession | null>;
};

/**
 * Owns the asynchronous score-session lifecycle independently of the gameplay
 * run lifecycle. An episode's start promise can resolve after death or restart
 * without ever becoming the current episode for a different run.
 */
export class SharedChampionRunLifecycle<TSession> {
  private nextGeneration = 0;
  private current: RunEpisode<TSession> | null = null;

  begin(startSession: () => Promise<TSession | null>): number {
    this.cancelCurrent();

    const episode: RunEpisode<TSession> = {
      generation: ++this.nextGeneration,
      activeTimeS: 0,
      sessionReady: false,
      activeFrame: false,
      completed: false,
      canceled: false,
      telemetry: {
        kills: 0,
        headshots: 0,
        headshotsPerWave: [],
        shotsFired: 0,
        shotsHit: 0,
      },
      sessionPromise: Promise.resolve(null),
    };

    let started: Promise<TSession | null>;
    try {
      started = startSession();
    } catch {
      started = Promise.resolve(null);
    }
    episode.sessionPromise = started
      .catch(() => null)
      .then((session) => {
        if (episode.canceled || session === null) {
          return null;
        }
        episode.sessionReady = true;
        return session;
      });
    this.current = episode;
    return episode.generation;
  }

  beginActiveFrame(deltaS: number): void {
    const episode = this.current;
    if (
      !episode
      || episode.completed
      || episode.canceled
      || !episode.sessionReady
      || !Number.isFinite(deltaS)
      || deltaS <= 0
    ) {
      if (episode) episode.activeFrame = false;
      return;
    }
    episode.activeFrame = true;
    episode.activeTimeS += deltaS;
  }

  endActiveFrame(): void {
    if (this.current) this.current.activeFrame = false;
  }

  recordShotFired(): void {
    const episode = this.getActiveTelemetryEpisode();
    if (!episode) return;
    episode.telemetry.shotsFired += 1;
  }

  recordShotHit(): void {
    const episode = this.getActiveTelemetryEpisode();
    if (!episode || episode.telemetry.shotsHit >= episode.telemetry.shotsFired) return;
    episode.telemetry.shotsHit += 1;
  }

  recordKill(isHeadshot: boolean): void {
    const episode = this.getActiveTelemetryEpisode();
    if (!episode) return;
    const waveIndex = Math.floor(episode.telemetry.kills / SHARED_CHAMPION_WAVE_ENEMY_COUNT);
    while (episode.telemetry.headshotsPerWave.length <= waveIndex) {
      episode.telemetry.headshotsPerWave.push(0);
    }
    episode.telemetry.kills += 1;
    if (!isHeadshot) return;
    episode.telemetry.headshots += 1;
    episode.telemetry.headshotsPerWave[waveIndex] =
      (episode.telemetry.headshotsPerWave[waveIndex] ?? 0) + 1;
  }

  complete(): SharedChampionRunCompletion<TSession> | null {
    const episode = this.current;
    if (!episode || episode.completed || episode.canceled) {
      return null;
    }
    episode.completed = true;
    episode.activeFrame = false;
    this.current = null;
    return Object.freeze({
      generation: episode.generation,
      activeTimeS: episode.activeTimeS,
      telemetry: Object.freeze({
        kills: episode.telemetry.kills,
        headshots: episode.telemetry.headshots,
        headshotsPerWave: Object.freeze([...episode.telemetry.headshotsPerWave]),
        shotsFired: episode.telemetry.shotsFired,
        shotsHit: episode.telemetry.shotsHit,
      }),
      sessionPromise: episode.sessionPromise,
    });
  }

  cancelCurrent(): void {
    if (!this.current) return;
    this.current.canceled = true;
    this.current = null;
  }

  getCurrentGeneration(): number | null {
    return this.current?.generation ?? null;
  }

  getIsCurrentSessionReady(): boolean {
    return this.current?.sessionReady === true;
  }

  private getActiveTelemetryEpisode(): RunEpisode<TSession> | null {
    const episode = this.current;
    if (
      !episode
      || episode.completed
      || episode.canceled
      || !episode.sessionReady
      || !episode.activeFrame
    ) {
      return null;
    }
    return episode;
  }
}
