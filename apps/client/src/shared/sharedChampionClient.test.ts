import assert from "node:assert/strict";
import test from "node:test";

import {
  SHARED_CHAMPION_SCORE_RULESET,
  createSharedChampion,
  deriveSharedChampionBoardKey,
} from "../../../shared/highScore.js";
import { GAMEPLAY_PROFILE_IDENTITIES } from "../../../shared/gameplayProfile.js";
import {
  getSharedChampionSnapshot,
  loadSharedChampionWithMeta,
  startSharedChampionRunSession,
  submitSharedChampionRunSession,
} from "./sharedChampionClient.js";

test("client caches, starts, and finishes shared champion runs by immutable profile board", async () => {
  const originalFetch = globalThis.fetch;
  const desktopIdentity = GAMEPLAY_PROFILE_IDENTITIES["desktop-human"];
  const mobileIdentity = GAMEPLAY_PROFILE_IDENTITIES["mobile-human"];
  const agentIdentity = GAMEPLAY_PROFILE_IDENTITIES["desktop-agent"];
  const desktopChampion = createSharedChampion({
    holderName: "Desktop Ace",
    score: 100,
    controlMode: "human",
    updatedAt: "2026-08-16T12:00:00.000Z",
    identity: desktopIdentity,
  });
  const mobileChampion = createSharedChampion({
    holderName: "Mobile Ace",
    score: 40,
    controlMode: "human",
    updatedAt: "2026-08-16T12:00:00.000Z",
    identity: mobileIdentity,
  });
  const agentChampion = createSharedChampion({
    holderName: "Agent Ace",
    score: 75,
    controlMode: "agent",
    updatedAt: "2026-08-16T12:01:00.000Z",
    identity: agentIdentity,
  });
  const requestBodies: unknown[] = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url, "https://example.test");
    if (init?.method === "GET") {
      const profileId = url.searchParams.get("profileId");
      return Response.json({
        champion: profileId === desktopIdentity.profileId ? desktopChampion : mobileChampion,
      });
    }

    requestBodies.push(JSON.parse(String(init?.body)) as unknown);
    if (url.pathname.endsWith("/start")) {
      return Response.json({
        runToken: "profile-bound-token",
        issuedAt: "2026-08-16T12:00:00.000Z",
        expiresAt: "2026-08-16T12:30:00.000Z",
        ruleset: SHARED_CHAMPION_SCORE_RULESET,
        boardKey: deriveSharedChampionBoardKey(agentIdentity),
        ...agentIdentity,
      });
    }
    return Response.json({
      accepted: true,
      updated: true,
      champion: agentChampion,
      reason: null,
    });
  };

  try {
    await Promise.all([
      loadSharedChampionWithMeta({ force: true, profileIdentity: desktopIdentity }),
      loadSharedChampionWithMeta({ force: true, profileIdentity: mobileIdentity }),
    ]);
    assert.equal(getSharedChampionSnapshot(desktopIdentity).champion?.holderName, "Desktop Ace");
    assert.equal(getSharedChampionSnapshot(mobileIdentity).champion?.holderName, "Mobile Ace");

    const session = await startSharedChampionRunSession({
      playerName: "Agent Ace",
      controlMode: "agent",
      mapId: "bazaar-map",
      ...agentIdentity,
    });
    assert.ok(session);
    assert.equal(session.boardKey, deriveSharedChampionBoardKey(agentIdentity));

    const summary = {
      survivalTimeS: 1,
      kills: 1,
      headshots: 0,
      headshotsPerWave: [0],
      shotsFired: 1,
      shotsHit: 1,
      accuracy: 100,
      finalScore: 5,
      deathCause: "enemy-fire" as const,
    };
    const finished = await submitSharedChampionRunSession(session, summary);
    assert.equal(finished.accepted, true);
    assert.equal(finished.snapshot.champion?.holderName, "Agent Ace");
    assert.deepEqual(requestBodies[1], {
      runToken: "profile-bound-token",
      summary,
      profileId: agentIdentity.profileId,
      tuningRevision: agentIdentity.tuningRevision,
      balanceSeason: agentIdentity.balanceSeason,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
