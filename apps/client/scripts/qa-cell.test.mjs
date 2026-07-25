import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseCellArgs } from "./lib/mapCellQa.mjs";
import { runCellQa } from "./qa-cell.mjs";

test("qa:cell command parsing requires one cell and one optional mode", () => {
  assert.deepEqual(parseCellArgs(["--cell", "spice-west-merchant"]), {
    cellId: "spice-west-merchant",
    mode: "capture",
  });
  assert.deepEqual(parseCellArgs(["--", "--cell", "spice-west-merchant", "--baseline"]), {
    cellId: "spice-west-merchant",
    mode: "baseline",
  });
  assert.equal(parseCellArgs(["--cell", "spice-west-merchant", "--baseline"]).mode, "baseline");
  assert.equal(parseCellArgs(["--compare", "--cell", "spice-west-merchant"]).mode, "compare");
  assert.throws(
    () => parseCellArgs(["--cell", "spice-west-merchant", "--baseline", "--compare"]),
    /mutually exclusive/,
  );
});

test("qa:cell rejects an unknown cell before starting server or browser resources", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "clawd-cell-command-"));
  const cellsPath = path.join(root, "cells.json");
  const shotsPath = path.join(root, "shots.json");
  await writeFile(cellsPath, `${JSON.stringify({ schemaVersion: 1, cells: [] })}\n`);
  await writeFile(shotsPath, `${JSON.stringify({ shots: [] })}\n`);
  let serverStarted = false;
  await assert.rejects(
    runCellQa(["--cell", "unknown"], {
      cellsPath,
      shotsPath,
      artifactRoot: path.join(root, "artifacts"),
      startServer: async () => {
        serverStarted = true;
        return { baseUrl: "http://127.0.0.1/", async close() {} };
      },
    }),
    /unknown cell 'unknown'/,
  );
  assert.equal(serverStarted, false);
});
