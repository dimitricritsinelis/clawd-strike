import assert from "node:assert/strict";
import test from "node:test";
import { Box3, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from "three";
import { buildDecorativePalms } from "./buildDecorativePalms";
import type { RuntimeAnchorsSpec } from "./types";

const anchors: RuntimeAnchorsSpec = {
  mapId: "bazaar-map",
  anchors: [
    {
      id: "PALM_FOUNTAIN_01",
      type: "decorative_palm",
      zone: "FOUNTAIN_COURT",
      pos: { x: 22.4, y: 45, z: 0 },
      heightM: 7.4,
    },
    {
      id: "PALM_NORTH_01",
      type: "decorative_palm",
      zone: "NORTH_COURT",
      pos: { x: 50.6, y: 77.2, z: 0 },
      heightM: 7.8,
    },
  ],
};

test("decorative palms render as global instanced batches with a dense shadow-casting crown", () => {
  const result = buildDecorativePalms(anchors, 1337, "1k");
  assert.ok(result);
  assert.equal(result.name, "decorative-palms");
  assert.deepEqual(result.userData.anchorIds, ["PALM_FOUNTAIN_01", "PALM_NORTH_01"]);
  assert.deepEqual(result.userData.renderStats, {
    palmCount: 2,
    drawBatches: 11,
    renderedTriangles: 13352,
    frondCount: 72,
    collarCount: 15,
  });
  assert.ok(result.children.every((child) => child instanceof InstancedMesh));

  const frondBatches = result.children.filter((child) => child.name.includes("-fronds-"));
  assert.equal(frondBatches.length, 4);
  assert.ok(frondBatches.every((child) => child.castShadow));
  assert.equal(
    frondBatches.reduce((count, child) => count + (child as InstancedMesh).count, 0),
    72,
  );
  assert.ok(frondBatches.every((child) => {
    const geometry = (child as InstancedMesh).geometry;
    const triangles = (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
    geometry.computeBoundingBox();
    return triangles === 160 && (geometry.boundingBox?.min.z ?? 0) < -0.25;
  }), "each frond variant should use a crossed, visibly drooping card");

  const frondMaterial = (frondBatches[0] as InstancedMesh).material as MeshStandardMaterial | MeshStandardMaterial[];
  assert.ok(!Array.isArray(frondMaterial));
  assert.equal(
    frondMaterial.map?.name,
    "/assets/textures/environment/bazaar/foliage/palms/palm_frond_project_original/palm_frond_diff.png",
  );
});

test("a 7.4m authored palm stays grounded and produces a broad crown instead of a pole silhouette", () => {
  const singleAnchor: RuntimeAnchorsSpec = { mapId: "bazaar-map", anchors: [anchors.anchors[0]!] };
  const result = buildDecorativePalms(singleAnchor, 1337, "1k");
  assert.ok(result);
  result.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(result);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(bounds.min.y) <= 0.001, `planter must touch authored ground, got ${bounds.min.y}`);
  assert.ok(size.y >= 7.2 && size.y <= 7.7, `authored height drifted to ${size.y}`);
  assert.ok(size.x >= 4.0 && size.z >= 4.0, `crown is too narrow: ${size.x}×${size.z}`);
  assert.ok(size.x <= 5.2 && size.z <= 5.2, `crown exceeds its tactical visual envelope: ${size.x}×${size.z}`);

  const planterMeshes = result.children.filter((child) => child.name.startsWith("decorative-palms-planter-"));
  assert.equal(planterMeshes.length, 4);
  const stoneShells = planterMeshes.filter((child) => !child.name.endsWith("-soil"));
  assert.ok(stoneShells.every((child) => {
    const material = (child as InstancedMesh).material as MeshStandardMaterial | MeshStandardMaterial[];
    return !Array.isArray(material)
      && material.map !== null
      && material.normalMap !== null
      && material.roughnessMap !== null
      && material.roughness >= 0.85
      && material.metalness === 0;
  }), "planter shell should use a complete rough, non-metallic PBR stone treatment");
  const planterBody = result.children.find((child) => child.name === "decorative-palms-planter-body") as InstancedMesh;
  const planterRim = result.children.find((child) => child.name === "decorative-palms-planter-rim") as InstancedMesh;
  const bodyMaterial = planterBody.material as MeshStandardMaterial;
  const rimMaterial = planterRim.material as MeshStandardMaterial;
  assert.notEqual(bodyMaterial.color.getHex(), rimMaterial.color.getHex(), "coping should read lighter than the carved body");
  assert.equal(planterRim.geometry.type, "TorusGeometry", "coping must expose the authored soil instead of capping it");

  const planterBounds = new Box3();
  planterBounds.makeEmpty();
  for (const planter of planterMeshes) planterBounds.expandByObject(planter);
  const planterSize = planterBounds.getSize(new Vector3());
  assert.ok(planterSize.x <= 1.62 && planterSize.z <= 1.62, `planter profile is oversized: ${planterSize.x}×${planterSize.z}`);
});

test("palm generation is deterministic for a fixed seed", () => {
  const first = buildDecorativePalms(anchors, 92821, "2k");
  const second = buildDecorativePalms(anchors, 92821, "2k");
  assert.ok(first && second);
  assert.equal(first.children.length, second.children.length);
  for (let index = 0; index < first.children.length; index += 1) {
    const left = first.children[index] as InstancedMesh;
    const right = second.children[index] as InstancedMesh;
    assert.equal(left.name, right.name);
    assert.equal(left.count, right.count);
    for (let instanceIndex = 0; instanceIndex < left.count; instanceIndex += 1) {
      const leftMatrix = new Matrix4();
      const rightMatrix = new Matrix4();
      left.getMatrixAt(instanceIndex, leftMatrix);
      right.getMatrixAt(instanceIndex, rightMatrix);
      assert.deepEqual(leftMatrix.elements, rightMatrix.elements);
    }
  }
});

test("decorative palm builder preserves null behavior for maps without palm anchors", () => {
  assert.equal(buildDecorativePalms(null, 1, "1k"), null);
  assert.equal(buildDecorativePalms({ mapId: "flat-map", anchors: [] }, 1, "1k"), null);
});
