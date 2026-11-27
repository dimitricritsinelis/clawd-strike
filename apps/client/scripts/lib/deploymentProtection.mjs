import { validateHeaderValue } from "node:http";

export function deploymentRequestOptions(baseUrl, targetUrl, secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  if (!secret) return {};
  const base = new URL(baseUrl);
  const target = new URL(targetUrl);
  if (base.protocol !== "https:" || target.origin !== base.origin
    || base.username || base.password || target.username || target.password) {
    throw new Error("Protected deployment checks require a same-origin HTTPS URL without credentials.");
  }
  // fetch includes malformed header values in its error message. Validate without echoing the credential.
  validateHeaderValue("x-vercel-protection-bypass", secret);
  return { headers: { "x-vercel-protection-bypass": secret }, redirect: "error" };
}

export async function authorizeDeploymentBrowser(context, baseUrl, skillsUrl, secret) {
  const { headers } = deploymentRequestOptions(baseUrl, skillsUrl, secret);
  if (!headers) return;
  const endpoint = new URL("/", baseUrl);
  let response;
  try {
    response = await context.request.get(endpoint.href, {
      headers: { ...headers, "x-vercel-set-bypass-cookie": "true" },
      maxRedirects: 0,
    });
  } catch {
    // Playwright request errors can include the outgoing headers.
    throw new Error("Could not request the deployment protection cookie.");
  }
  // The context shares its request cookie jar with the page. Navigate normally after this handshake.
  const status = response.status();
  const { location, "set-cookie": cookie } = response.headers();
  if (status < 300 || status >= 400 || !cookie || !location
    || !URL.canParse(location, endpoint) || new URL(location, endpoint).origin !== endpoint.origin) {
    throw new Error(`Deployment protection did not issue a cookie redirect (HTTP ${status}).`);
  }
}
