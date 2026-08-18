// One-shot maintenance: rewrite provenance-hashed files whose working-tree
// bytes differ from HEAD only by CRLF conversion back to their exact committed
// bytes. Never touches a file whose normalized content differs from HEAD.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "*.gltf", "docs/map-design/specs/*.json", "docs/map-design/shots.json"], { encoding: "utf8" })
  .split("\n").filter(Boolean);
let rewritten = 0;
for (const file of files) {
  const committed = execFileSync("git", ["cat-file", "blob", `HEAD:${file}`], { maxBuffer: 256 * 1024 * 1024 });
  const current = readFileSync(file);
  if (current.equals(committed)) continue;
  const normalized = current.toString("latin1").replaceAll("\r\n", "\n");
  if (normalized !== committed.toString("latin1")) {
    console.log(`SKIP (real content difference): ${file}`);
    continue;
  }
  writeFileSync(file, committed);
  rewritten += 1;
  console.log(`restored LF bytes: ${file}`);
}
console.log(`done: ${rewritten} file(s) rewritten`);
