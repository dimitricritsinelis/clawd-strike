/** Read-only fixtures through the game's real mounting functions, without rendering. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { buildAuthoredPlacements, buildSectionModels } from "../../../apps/client/src/runtime/map/buildFacadeModels";
import type { PropModelLibrary } from "../../../apps/client/src/runtime/render/models/PropModelLibrary";
import type { RuntimeAuthoredPlacement } from "../../../apps/client/src/runtime/map/types";

const requireClient = createRequire(new URL("../../../apps/client/package.json", import.meta.url));
const { Group, Mesh, BoxGeometry, MeshBasicMaterial, Vector3 } = requireClient("three");
const read = (name: string) => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const design = read("design.json");
const roofs = read("roof-coordination.json");
const binding = { wallMaterials: null, quality: "1k" as const, seed: 0 };
type Point = { x: number; y: number; z: number };

function fixture(point: Point, origin: Point): PropModelLibrary {
  return {
    hasModel: () => true,
    instantiate: () => {
      const model = new Group();
      const base = new Mesh(new BoxGeometry(.001, .001, .001), new MeshBasicMaterial());
      base.position.y = .0005;
      model.add(base);
      const probe = new Group();
      probe.name = "asymmetric-probe";
      // Same Z-up to Y-up conversion as the prescribed Blender export.
      probe.position.set(point.x - origin.x, point.z - origin.z, point.y - origin.y);
      model.add(probe);
      return model;
    },
  } as unknown as PropModelLibrary;
}

function error(root: ReturnType<typeof buildAuthoredPlacements>, expected: Point): number {
  root.updateMatrixWorld(true);
  const probe = root.getObjectByName("asymmetric-probe");
  assert(probe, "fixture probe must survive the actual loader");
  return probe.getWorldPosition(new Vector3()).distanceTo(new Vector3(expected.x, expected.z, expected.y));
}

for (const bundle of roofs.roofBundles) {
  const cell = roofs.roofCells.find((candidate: { id: string }) => candidate.id === bundle.roofCellIds[0]);
  const [x0, y0, x1, y1] = cell.footprint;
  const point = { x: x0 + .31 * (x1 - x0), y: y0 + .67 * (y1 - y0), z: cell.roofDatum.slabTopM };
  const placement: RuntimeAuthoredPlacement = {
    ...bundle.baseCentrePlacement, unit: bundle.installationOutputUnit, materialIds: bundle.requiredMaterialIds,
  };
  const library = fixture(point, placement.position);
  assert(error(buildAuthoredPlacements([placement], library, binding), point) < 1e-6, `${bundle.id}: wrong world transform`);
  assert(error(buildAuthoredPlacements([{ ...placement, yawDeg: 0 }], library, binding), point) > .01,
    `${bundle.id}: asymmetric fixture must reject the former yaw-zero rotation`);
}

for (const area of design.areas) {
  const origin = area.sectionOriginDesign;
  const point = { x: origin.x + .31 * area.rect.w, y: origin.y + .67 * area.rect.h, z: origin.z + 2.13 };
  const root = buildSectionModels([{
    zoneId: area.zone, modelId: `fixture-${area.zone}`, origin,
    sizeM: { width: area.rect.w, depth: area.rect.h }, faces: area.sectionFaces, materialIds: [],
  }], fixture(point, origin), binding);
  assert(error(root, point) < 1e-6, `${area.zone}: wrong section origin or axes`);
}

assert.equal(design.freeModelFrame.placementYawDeg, 180);
assert.equal(design.sharedEnvironment.freeModelPlacementYawDeg, 180);
for (const target of design.skyline) assert.equal(target.placementYawDeg, 180, target.id);
console.log(`PASS verify-transforms.ts: ${roofs.roofBundles.length} roof bundles and ${design.areas.length} sections through actual loaders; all former yaw-zero fixtures rejected`);
