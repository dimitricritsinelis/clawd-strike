import assert from "node:assert/strict";
import test from "node:test";
import {
  GAMEPLAY_BALANCE_SEASON,
  GAMEPLAY_PROFILE_IDENTITIES,
  GAMEPLAY_PROFILE_IDS,
  getGameplayProfileIdentity,
  isGameplayProfileId,
  resolveGameplayProfileIdentity,
} from "./gameplayProfile.js";

test("declares the three durable gameplay profile ids", () => {
  assert.deepEqual(GAMEPLAY_PROFILE_IDS, [
    "mobile-human",
    "desktop-human",
    "desktop-agent",
  ]);
  assert.equal(isGameplayProfileId("desktop-human"), true);
  assert.equal(isGameplayProfileId("mobile-agent"), false);
  assert.equal(isGameplayProfileId(null), false);
  assert.equal(Object.isFrozen(GAMEPLAY_PROFILE_IDS), true);
});

test("profile identities have stable unique revisions and are immutable", () => {
  const revisions = new Set<string>();

  for (const profileId of GAMEPLAY_PROFILE_IDS) {
    const identity = getGameplayProfileIdentity(profileId);
    assert.equal(identity.profileId, profileId);
    assert.equal(identity.balanceSeason, GAMEPLAY_BALANCE_SEASON);
    assert.match(identity.tuningRevision, /^[a-z0-9-]+-r\d+$/);
    assert.equal(Object.isFrozen(identity), true);
    revisions.add(identity.tuningRevision);
  }

  assert.equal(revisions.size, GAMEPLAY_PROFILE_IDS.length);
  assert.equal(Object.isFrozen(GAMEPLAY_PROFILE_IDENTITIES), true);
  assert.deepEqual(
    Object.fromEntries(
      GAMEPLAY_PROFILE_IDS.map((profileId) => [
        profileId,
        GAMEPLAY_PROFILE_IDENTITIES[profileId].tuningRevision,
      ]),
    ),
    {
      "mobile-human": "mobile-human-baseline-f30c73c70dc0-r3",
      "desktop-human": "desktop-human-baseline-f30c73c70dc0-r3",
      "desktop-agent": "desktop-agent-baseline-f30c73c70dc0-r3",
    },
  );
});

test("resolves supported human and agent environments", () => {
  const cases = [
    [{ controlMode: "human", isMobile: true } as const, "mobile-human"],
    [{ controlMode: "human", isMobile: false } as const, "desktop-human"],
    [{ controlMode: "agent", isMobile: false } as const, "desktop-agent"],
  ] as const;

  for (const [input, expectedProfileId] of cases) {
    const result = resolveGameplayProfileIdentity(input);
    assert.equal(result.supported, true);
    assert.equal(result.requestedProfileId, expectedProfileId);
    assert.equal(result.resolvedProfileId, expectedProfileId);
    assert.equal(result.identity.profileId, expectedProfileId);
    assert.equal(result.usedFallback, false);
    assert.equal(Object.isFrozen(result), true);
  }
});

test("rejects mobile agent play and supplies only the safe agent fallback", () => {
  const result = resolveGameplayProfileIdentity({ controlMode: "agent", isMobile: true });

  assert.equal(result.supported, false);
  if (result.supported) assert.fail("mobile agent unexpectedly resolved as supported");
  assert.equal(result.requestedProfileId, "mobile-agent");
  assert.equal(result.resolvedProfileId, "desktop-agent");
  assert.equal(result.identity.profileId, "desktop-agent");
  assert.equal(result.reason, "mobile-agent-unsupported");
  assert.equal(result.usedFallback, true);
  assert.equal(Object.isFrozen(result), true);
});
