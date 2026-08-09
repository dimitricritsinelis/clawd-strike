import assert from "node:assert/strict";
import test from "node:test";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { createPaneledDoorGeometry } from "./doors";

test("paneled door presents constructed boards on the exterior local-Z face", () => {
  const geometry = createPaneledDoorGeometry("shop");
  const material = new MeshBasicMaterial({ vertexColors: true });
  const mesh = new Mesh(geometry, material);
  mesh.updateMatrixWorld(true);

  // This ray clears the perimeter frame, center muntin, horizontal rails and
  // hardware. It should meet a raised board before the continuous backer.
  const raycaster = new Raycaster(
    new Vector3(0.09, 0.12, -1),
    new Vector3(0, 0, 1),
  );
  const hit = raycaster.intersectObject(mesh, false)[0];
  assert.ok(hit?.face, "expected the exterior ray to meet the door leaf");

  const colors = geometry.getAttribute("color");
  const face = hit.face;
  const meanVertexValue = [face.a, face.b, face.c]
    .map((index) => (colors.getX(index) + colors.getY(index) + colors.getZ(index)) / 3)
    .reduce((sum, value) => sum + value, 0) / 3;
  assert.ok(
    meanVertexValue > 0.6,
    `exterior ray hit the dark anti-halo backer instead of a raised board (${meanVertexValue})`,
  );

  geometry.dispose();
  material.dispose();
});
