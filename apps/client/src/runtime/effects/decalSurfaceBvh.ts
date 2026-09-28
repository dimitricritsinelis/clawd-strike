import type { BufferGeometry } from "three";

/**
 * Compact static triangle BVH for bullet-decal placement. Built once per
 * BufferGeometry (in local space) and shared by every mesh/instance using it,
 * so a shot can find the exact rendered surface without testing every triangle
 * of the ~0.9 M-triangle map.
 */

const LEAF_MAX_TRIS = 8;
const LEAF_FLAG = 0x8000_0000;
const TRI_EPSILON = 1e-9;

export type BvhTriangleHit = {
  /** Distance along the (unnormalized) ray direction. */
  t: number;
  /** Original triangle index (index-buffer order / 3). */
  triangle: number;
  /** Barycentric weights of vertices 1 and 2 (vertex 0 = 1 - u - v). */
  u: number;
  v: number;
  /** True when the ray meets the counter-clockwise (front) side. */
  frontFacing: boolean;
};

export function createBvhTriangleHit(): BvhTriangleHit {
  return { t: 0, triangle: -1, u: 0, v: 0, frontFacing: true };
}

export class GeometryBvh {
  readonly triangleCount: number;
  /** Vertex indices of each triangle in original order (3 per triangle). */
  readonly triangleVertices: Uint32Array;
  readonly positions: Float32Array;
  private readonly order: Uint32Array;
  private readonly nodeBounds: Float32Array;
  private readonly nodeData: Uint32Array;
  private readonly stack: Uint32Array;

  private constructor(
    positions: Float32Array,
    triangleVertices: Uint32Array,
    order: Uint32Array,
    nodeBounds: Float32Array,
    nodeData: Uint32Array,
    maxDepth: number,
  ) {
    this.positions = positions;
    this.triangleVertices = triangleVertices;
    this.triangleCount = triangleVertices.length / 3;
    this.order = order;
    this.nodeBounds = nodeBounds;
    this.nodeData = nodeData;
    this.stack = new Uint32Array(Math.max(64, maxDepth * 2 + 4));
  }

  static fromGeometry(geometry: BufferGeometry): GeometryBvh | null {
    const position = geometry.getAttribute("position");
    if (!position || position.itemSize < 3 || position.count === 0) return null;
    const vertexCount = position.count;
    const positions = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3] = position.getX(i);
      positions[i * 3 + 1] = position.getY(i);
      positions[i * 3 + 2] = position.getZ(i);
    }
    let triangleVertices: Uint32Array;
    const index = geometry.getIndex();
    if (index) {
      const count = index.count - (index.count % 3);
      triangleVertices = new Uint32Array(count);
      for (let i = 0; i < count; i++) triangleVertices[i] = index.getX(i);
    } else {
      const count = vertexCount - (vertexCount % 3);
      triangleVertices = new Uint32Array(count);
      for (let i = 0; i < count; i++) triangleVertices[i] = i;
    }
    return GeometryBvh.build(positions, triangleVertices);
  }

  static build(positions: Float32Array, triangleVertices: Uint32Array): GeometryBvh | null {
    const triCount = Math.floor(triangleVertices.length / 3);
    if (triCount === 0) return null;

    const centroids = new Float32Array(triCount * 3);
    const triBounds = new Float32Array(triCount * 6);
    for (let t = 0; t < triCount; t++) {
      const a = triangleVertices[t * 3]! * 3;
      const b = triangleVertices[t * 3 + 1]! * 3;
      const c = triangleVertices[t * 3 + 2]! * 3;
      for (let axis = 0; axis < 3; axis++) {
        const va = positions[a + axis]!;
        const vb = positions[b + axis]!;
        const vc = positions[c + axis]!;
        const lo = Math.min(va, vb, vc);
        const hi = Math.max(va, vb, vc);
        triBounds[t * 6 + axis] = lo;
        triBounds[t * 6 + 3 + axis] = hi;
        centroids[t * 3 + axis] = (lo + hi) * 0.5;
      }
    }

    const order = new Uint32Array(triCount);
    for (let t = 0; t < triCount; t++) order[t] = t;

    const maxNodes = Math.max(1, 2 * Math.ceil(triCount / (LEAF_MAX_TRIS / 2)));
    let nodeBounds = new Float32Array(maxNodes * 6);
    let nodeData = new Uint32Array(maxNodes * 2);
    let nodeCount = 0;
    let maxDepth = 0;

    // Iterative build: each work item is [nodeIndex, start, count, depth].
    const work: number[] = [];
    const allocNode = (): number => {
      if ((nodeCount + 1) * 6 > nodeBounds.length) {
        const grownBounds = new Float32Array(nodeBounds.length * 2);
        grownBounds.set(nodeBounds);
        nodeBounds = grownBounds;
        const grownData = new Uint32Array(nodeData.length * 2);
        grownData.set(nodeData);
        nodeData = grownData;
      }
      return nodeCount++;
    };

    work.push(allocNode(), 0, triCount, 0);
    while (work.length > 0) {
      const depth = work.pop()!;
      const count = work.pop()!;
      const start = work.pop()!;
      const node = work.pop()!;
      if (depth > maxDepth) maxDepth = depth;

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      let cMinX = Infinity, cMinY = Infinity, cMinZ = Infinity;
      let cMaxX = -Infinity, cMaxY = -Infinity, cMaxZ = -Infinity;
      for (let i = start; i < start + count; i++) {
        const t = order[i]!;
        const o = t * 6;
        if (triBounds[o]! < minX) minX = triBounds[o]!;
        if (triBounds[o + 1]! < minY) minY = triBounds[o + 1]!;
        if (triBounds[o + 2]! < minZ) minZ = triBounds[o + 2]!;
        if (triBounds[o + 3]! > maxX) maxX = triBounds[o + 3]!;
        if (triBounds[o + 4]! > maxY) maxY = triBounds[o + 4]!;
        if (triBounds[o + 5]! > maxZ) maxZ = triBounds[o + 5]!;
        const cx = centroids[t * 3]!;
        const cy = centroids[t * 3 + 1]!;
        const cz = centroids[t * 3 + 2]!;
        if (cx < cMinX) cMinX = cx;
        if (cy < cMinY) cMinY = cy;
        if (cz < cMinZ) cMinZ = cz;
        if (cx > cMaxX) cMaxX = cx;
        if (cy > cMaxY) cMaxY = cy;
        if (cz > cMaxZ) cMaxZ = cz;
      }
      const b = node * 6;
      nodeBounds[b] = minX;
      nodeBounds[b + 1] = minY;
      nodeBounds[b + 2] = minZ;
      nodeBounds[b + 3] = maxX;
      nodeBounds[b + 4] = maxY;
      nodeBounds[b + 5] = maxZ;

      if (count <= LEAF_MAX_TRIS) {
        nodeData[node * 2] = start;
        nodeData[node * 2 + 1] = (count | LEAF_FLAG) >>> 0;
        continue;
      }

      const ex = cMaxX - cMinX;
      const ey = cMaxY - cMinY;
      const ez = cMaxZ - cMinZ;
      const axis = ex >= ey && ex >= ez ? 0 : ey >= ez ? 1 : 2;
      const split = axis === 0 ? (cMinX + cMaxX) * 0.5 : axis === 1 ? (cMinY + cMaxY) * 0.5 : (cMinZ + cMaxZ) * 0.5;

      // Partition around the centroid-bounds midpoint on the widest axis.
      let lo = start;
      let hi = start + count - 1;
      while (lo <= hi) {
        if (centroids[order[lo]! * 3 + axis]! < split) {
          lo++;
        } else {
          const swap = order[lo]!;
          order[lo] = order[hi]!;
          order[hi] = swap;
          hi--;
        }
      }
      let leftCount = lo - start;
      // Coincident centroids: split the range in half so the tree stays finite.
      if (leftCount === 0 || leftCount === count) leftCount = count >> 1;

      const left = allocNode();
      const right = allocNode();
      nodeData[node * 2] = left;
      nodeData[node * 2 + 1] = right;
      work.push(right, start + leftCount, count - leftCount, depth + 1);
      work.push(left, start, leftCount, depth + 1);
    }

    return new GeometryBvh(
      positions,
      triangleVertices,
      order,
      nodeBounds.slice(0, nodeCount * 6),
      nodeData.slice(0, nodeCount * 2),
      maxDepth,
    );
  }

  /**
   * Nearest triangle hit with t in [tMin, tMax]. Both faces are reported; the
   * caller decides from `frontFacing` and the material side.
   */
  raycast(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    tMin: number, tMax: number,
    out: BvhTriangleHit,
  ): boolean {
    // A zero component would give 0 * Infinity = NaN on a slab boundary.
    const invX = 1 / (dx === 0 ? 1e-12 : dx);
    const invY = 1 / (dy === 0 ? 1e-12 : dy);
    const invZ = 1 / (dz === 0 ? 1e-12 : dz);
    const bounds = this.nodeBounds;
    const data = this.nodeData;
    const positions = this.positions;
    const tris = this.triangleVertices;
    const order = this.order;
    const stack = this.stack;
    let best = tMax;
    let found = false;
    let sp = 0;
    stack[sp++] = 0;

    while (sp > 0) {
      const node = stack[--sp]!;
      const b = node * 6;
      let t0 = (bounds[b]! - ox) * invX;
      let t1 = (bounds[b + 3]! - ox) * invX;
      let near = Math.min(t0, t1);
      let far = Math.max(t0, t1);
      t0 = (bounds[b + 1]! - oy) * invY;
      t1 = (bounds[b + 4]! - oy) * invY;
      near = Math.max(near, Math.min(t0, t1));
      far = Math.min(far, Math.max(t0, t1));
      t0 = (bounds[b + 2]! - oz) * invZ;
      t1 = (bounds[b + 5]! - oz) * invZ;
      near = Math.max(near, Math.min(t0, t1));
      far = Math.min(far, Math.max(t0, t1));
      if (!(far >= near) || far < tMin || near > best) continue;

      const a = data[node * 2]!;
      const c = data[node * 2 + 1]!;
      if ((c & LEAF_FLAG) === 0) {
        if (sp + 2 > stack.length) continue;
        stack[sp++] = c;
        stack[sp++] = a;
        continue;
      }

      const end = a + (c & ~LEAF_FLAG);
      for (let i = a; i < end; i++) {
        const tri = order[i]!;
        const i0 = tris[tri * 3]! * 3;
        const i1 = tris[tri * 3 + 1]! * 3;
        const i2 = tris[tri * 3 + 2]! * 3;
        const v0x = positions[i0]!, v0y = positions[i0 + 1]!, v0z = positions[i0 + 2]!;
        const e1x = positions[i1]! - v0x, e1y = positions[i1 + 1]! - v0y, e1z = positions[i1 + 2]! - v0z;
        const e2x = positions[i2]! - v0x, e2y = positions[i2 + 1]! - v0y, e2z = positions[i2 + 2]! - v0z;
        // Möller–Trumbore
        const px = dy * e2z - dz * e2y;
        const py = dz * e2x - dx * e2z;
        const pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -TRI_EPSILON && det < TRI_EPSILON) continue;
        const invDet = 1 / det;
        const sx = ox - v0x, sy = oy - v0y, sz = oz - v0z;
        const u = (sx * px + sy * py + sz * pz) * invDet;
        if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y;
        const qy = sz * e1x - sx * e1z;
        const qz = sx * e1y - sy * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * invDet;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
        if (t < tMin || t > best) continue;
        best = t;
        found = true;
        out.t = t;
        out.triangle = tri;
        out.u = u;
        out.v = v;
        out.frontFacing = det > 0;
      }
    }
    return found;
  }
}
