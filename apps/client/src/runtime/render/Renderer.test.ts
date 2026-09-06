import assert from "node:assert/strict";
import test from "node:test";
import { Mesh, PerspectiveCamera, Raycaster, Scene, Vector3 } from "three";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { createClothGeometry } from "../map/propFamilies/signsAwnings";
import { constrainAoOccluders } from "./Renderer";

test("AO depth includes the visible canopy underside before background architecture", () => {
  const pass = new GTAOPass(new Scene(), new PerspectiveCamera(), 32, 32);
  const geometry = createClothGeometry();
  const cloth = new Mesh(geometry, pass.normalMaterial);
  const ray = new Raycaster(new Vector3(0.11, -20, 0.1), new Vector3(0, 1, 0));
  try {
    assert.equal(ray.intersectObject(cloth).length, 0, "fixture must reproduce the omitted underside");
    constrainAoOccluders(pass);
    const hits = ray.intersectObject(cloth);
    assert.ok(hits.length > 0, "AO must stop at the cloth seen by the player below it");
    assert.ok(hits[0]!.distance < 20, "background surfaces must remain behind the cloth depth");
  } finally {
    geometry.dispose();
    pass.dispose();
  }
});
