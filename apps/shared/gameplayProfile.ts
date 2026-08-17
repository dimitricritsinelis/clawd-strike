export const GAMEPLAY_PROFILE_IDS = Object.freeze([
  "mobile-human",
  "desktop-human",
  "desktop-agent",
] as const);

export type GameplayProfileId = (typeof GAMEPLAY_PROFILE_IDS)[number];
export type GameplayControlMode = "human" | "agent";

export type GameplayProfileIdentity = Readonly<{
  profileId: GameplayProfileId;
  tuningRevision: string;
  balanceSeason: string;
}>;

export type GameplayProfileResolutionInput = Readonly<{
  controlMode: GameplayControlMode;
  isMobile: boolean;
}>;

export type GameplayProfileResolution =
  | Readonly<{
      supported: true;
      requestedProfileId: GameplayProfileId;
      resolvedProfileId: GameplayProfileId;
      usedFallback: false;
      identity: GameplayProfileIdentity;
    }>
  | Readonly<{
      supported: false;
      requestedProfileId: "mobile-agent";
      resolvedProfileId: "desktop-agent";
      usedFallback: true;
      reason: "mobile-agent-unsupported";
      identity: GameplayProfileIdentity;
    }>;

export const GAMEPLAY_BALANCE_SEASON = "preseason-2026-08";
/** First 12 hex characters of SHA-256(JSON.stringify(DESKTOP_HUMAN_BALANCE_BASELINE)). */
export const GAMEPLAY_BALANCE_BASELINE_FINGERPRINT = "5aed687b2c66";
export const MOBILE_AGENT_FALLBACK_PROFILE_ID = "desktop-agent" as const;

const mobileHumanIdentity = Object.freeze({
  profileId: "mobile-human",
  tuningRevision: `mobile-human-baseline-${GAMEPLAY_BALANCE_BASELINE_FINGERPRINT}-r2`,
  balanceSeason: GAMEPLAY_BALANCE_SEASON,
} satisfies GameplayProfileIdentity);

const desktopHumanIdentity = Object.freeze({
  profileId: "desktop-human",
  tuningRevision: `desktop-human-baseline-${GAMEPLAY_BALANCE_BASELINE_FINGERPRINT}-r2`,
  balanceSeason: GAMEPLAY_BALANCE_SEASON,
} satisfies GameplayProfileIdentity);

const desktopAgentIdentity = Object.freeze({
  profileId: "desktop-agent",
  tuningRevision: `desktop-agent-baseline-${GAMEPLAY_BALANCE_BASELINE_FINGERPRINT}-r2`,
  balanceSeason: GAMEPLAY_BALANCE_SEASON,
} satisfies GameplayProfileIdentity);

/**
 * Stable identity metadata recorded at session start. Both the registry and
 * every identity value are frozen so a run cannot silently change profile or
 * revision after it begins.
 */
export const GAMEPLAY_PROFILE_IDENTITIES = Object.freeze({
  "mobile-human": mobileHumanIdentity,
  "desktop-human": desktopHumanIdentity,
  "desktop-agent": desktopAgentIdentity,
} satisfies Readonly<Record<GameplayProfileId, GameplayProfileIdentity>>);

export function isGameplayProfileId(value: unknown): value is GameplayProfileId {
  return typeof value === "string"
    && (GAMEPLAY_PROFILE_IDS as readonly string[]).includes(value);
}

export function getGameplayProfileIdentity(profileId: GameplayProfileId): GameplayProfileIdentity {
  return GAMEPLAY_PROFILE_IDENTITIES[profileId];
}

/**
 * Resolves the immutable profile identity for a runtime session.
 *
 * Mobile agent play is not a supported competitive surface. It is rejected in
 * the result while also naming the desktop-agent fallback, allowing a caller to
 * fail closed or continue safely without ever applying human mobile tuning to
 * an agent run.
 */
export function resolveGameplayProfileIdentity(
  input: GameplayProfileResolutionInput,
): GameplayProfileResolution {
  if (input.controlMode === "agent") {
    if (input.isMobile) {
      return Object.freeze({
        supported: false,
        requestedProfileId: "mobile-agent",
        resolvedProfileId: MOBILE_AGENT_FALLBACK_PROFILE_ID,
        usedFallback: true,
        reason: "mobile-agent-unsupported",
        identity: desktopAgentIdentity,
      });
    }

    return Object.freeze({
      supported: true,
      requestedProfileId: "desktop-agent",
      resolvedProfileId: "desktop-agent",
      usedFallback: false,
      identity: desktopAgentIdentity,
    });
  }

  const profileId: GameplayProfileId = input.isMobile ? "mobile-human" : "desktop-human";
  return Object.freeze({
    supported: true,
    requestedProfileId: profileId,
    resolvedProfileId: profileId,
    usedFallback: false,
    identity: GAMEPLAY_PROFILE_IDENTITIES[profileId],
  });
}
