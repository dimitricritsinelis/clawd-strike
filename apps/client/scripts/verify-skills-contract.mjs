import path from "node:path";
import { readFile } from "node:fs/promises";
import { deploymentRequestOptions } from "./lib/deploymentProtection.mjs";

function normalize(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:5174/";
const skillsUrl = new URL(
  process.env.SKILLS_URL ?? "/skills.md",
  baseUrl,
).toString();
const localPath = path.resolve(
  process.cwd(),
  process.env.LOCAL_SKILLS_PATH ?? "dist/skills.md",
);

const localText = await readFile(localPath, "utf8");
const response = await fetch(skillsUrl, deploymentRequestOptions(baseUrl, skillsUrl));
if (!response.ok) {
  throw new Error(`Failed to fetch ${skillsUrl}: ${response.status} ${response.statusText}`);
}
const remoteText = await response.text();

const matches = normalize(localText) === normalize(remoteText);
const result = {
  localPath,
  skillsUrl,
  matches,
  localLength: localText.length,
  remoteLength: remoteText.length,
};

console.log(JSON.stringify(result, null, 2));

if (!matches) {
  throw new Error(`Served skills.md at ${skillsUrl} does not match ${localPath}`);
}
