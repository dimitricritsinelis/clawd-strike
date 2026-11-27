import assert from "node:assert/strict";
import test from "node:test";
import { authorizeDeploymentBrowser, deploymentRequestOptions } from "./deploymentProtection.mjs";

const candidate = "https://candidate.example/";
const guide = new URL("/skills.md", candidate);
const secret = "fixture-secret";

test("public monitors work without protection credentials", async () => {
  assert.deepEqual(deploymentRequestOptions("http://localhost:5174", guide, ""), {});
  await authorizeDeploymentBrowser(null, candidate, guide, "");
});

test("protected guide fetches use a same-origin HTTPS request without redirects", () => {
  assert.deepEqual(deploymentRequestOptions(candidate, guide, secret), {
    headers: { "x-vercel-protection-bypass": secret },
    redirect: "error",
  });
  for (const [base, target] of [
    [candidate, "https://other.example/skills.md"],
    ["http://candidate.example/", "http://candidate.example/skills.md"],
    [candidate, "https://user@candidate.example/skills.md"],
  ]) {
    assert.throws(() => deploymentRequestOptions(base, target, secret), /same-origin HTTPS/);
  }
  assert.throws(() => deploymentRequestOptions(candidate, guide, `${secret}\ninvalid`),
    (error) => error.code === "ERR_INVALID_CHAR" && !error.message.includes(secret));
});

test("the browser exchanges its credential once at the candidate origin without following redirects", async () => {
  const requests = [];
  let location = "/";
  const context = {
    request: {
      async get(url, options) {
        requests.push({ url, options });
        return { status: () => 307, headers: () => ({ location, "set-cookie": "fixture=session" }) };
      },
    },
  };
  await authorizeDeploymentBrowser(context, candidate, guide, secret);
  assert.deepEqual(requests, [{
    url: candidate,
    options: {
      headers: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" },
      maxRedirects: 0,
    },
  }]);
  location = "https://login.example/";
  await assert.rejects(authorizeDeploymentBrowser(context, candidate, guide, secret), /cookie redirect/);
});

test("authentication errors omit Playwright's request headers", async () => {
  const context = {
    request: { get: async () => { throw new Error(`headers: ${secret}`); } },
  };
  await assert.rejects(authorizeDeploymentBrowser(context, candidate, guide, secret), {
    message: "Could not request the deployment protection cookie.",
  });
});
