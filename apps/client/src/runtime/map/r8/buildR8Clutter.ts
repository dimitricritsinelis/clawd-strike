import { Box3, Group, Vector3 } from "three";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";
import { R8_ATMOSPHERE, type R8Clutter } from "./buildR8Atmosphere";

/**
 * R8 wall-foot goods that reuse registered CC0 prop models. Every record sits
 * against a solid wall with at most 0.30 m projection (checked by
 * r8Atmosphere.test.ts); the runtime re-measures the scaled model and shrinks
 * it if its real bounds would exceed the recorded projection. Render-only: no
 * colliders.
 */

const LOW_PROJECTION_MAX_M = 0.3;

export const R8_CLUTTER_MODEL_IDS: readonly string[] = [...new Set(
  R8_ATMOSPHERE.clutter.flatMap((c) => (c.model ? [c.model] : [])),
)].sort();

export function buildR8Clutter(propModels: PropModelLibrary, records: readonly R8Clutter[] = R8_ATMOSPHERE.clutter): Group {
  const root = new Group();
  root.name = "r8-clutter";
  const bbox = new Box3();
  const size = new Vector3();
  let placed = 0;
  for (const c of records) {
    if (!c.model || !propModels.hasModel(c.model)) continue;
    const model = propModels.instantiate(c.model);
    // Longest horizontal side runs along the wall.
    model.scale.setScalar(c.scale);
    model.updateMatrixWorld(true);
    bbox.setFromObject(model).getSize(size);
    if (size.z > size.x) model.rotation.y = Math.PI / 2;
    const holder = new Group();
    holder.name = `r8-clutter-${c.id}`;
    holder.add(model);
    const inward = new Vector3(c.inward[0], 0, c.inward[1]).normalize();
    holder.rotation.y = Math.atan2(inward.x, inward.z) + (c.yawJitterDeg * Math.PI) / 180;
    holder.updateMatrixWorld(true);
    bbox.setFromObject(holder);
    const depth = Math.abs(inward.x) > 0.5 ? bbox.max.x - bbox.min.x : bbox.max.z - bbox.min.z;
    const limit = Math.min(c.projectionM, LOW_PROJECTION_MAX_M) - 0.02;
    if (depth > limit) {
      model.scale.multiplyScalar(limit / depth);
      holder.updateMatrixWorld(true);
      bbox.setFromObject(holder);
    }
    // Back face touches the wall 0.02 m out; base rests on the floor.
    const wall = new Vector3(c.wallPoint[0], c.pos[2], c.wallPoint[1]);
    const backExtent = inward.x > 0.5 ? -bbox.min.x : inward.x < -0.5 ? bbox.max.x : inward.z > 0.5 ? -bbox.min.z : bbox.max.z;
    const along = new Vector3(c.pos[0], 0, c.pos[1]).sub(new Vector3(c.wallPoint[0], 0, c.wallPoint[1]));
    holder.position.set(wall.x, wall.y - bbox.min.y, wall.z);
    holder.position.addScaledVector(inward, 0.02 + backExtent);
    // Keep the along-wall position the generator chose.
    holder.position.add(along.sub(inward.clone().multiplyScalar(along.dot(inward))));
    holder.traverse((node) => {
      const mesh = node as { isMesh?: boolean; castShadow: boolean; receiveShadow: boolean };
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    holder.userData.renderOnly = true;
    root.add(holder);
    placed += 1;
  }
  root.userData.r8Placed = placed;
  return root;
}
