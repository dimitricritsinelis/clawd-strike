import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import type { FloorMaterialLibrary, FloorTextureQuality } from "../render/materials/FloorMaterialLibrary";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";
import type { BoundarySegment } from "./buildBlockout";

/**
 * Chips, spalled paving and swept rubble along the base of a frontage.
 *
 * The drift sheet supplies the soft accumulation, but a sheet alone still
 * leaves the building line a dead-straight edge. Solid pieces sitting in that
 * seam are what stop the wall/floor junction reading as two surfaces meeting
 * at a drawn line.
 *
 * Everything here lives inside the authored dressing edge: pieces are placed
 * within `MAX_OFFSET_M` of the wall, far outside the clear corridor the map
 * constraints reserve down the middle of a lane, and they are short enough to
 * step over rather than snag on.
 */

const VARIANT_COUNT = 3;
const MAX_INSTANCES_PER_VARIANT = 1400;

// Cluster spacing along a run. Debris gathers where it is swept to and where
// nobody walks, so runs alternate between busy patches and clean stretches.
const MIN_CLUSTER_GAP_M = 0.85;
const MAX_CLUSTER_GAP_M = 3.1;
const MIN_PIECES_PER_CLUSTER = 3;
const MAX_PIECES_PER_CLUSTER = 9;
const CLUSTER_SPREAD_M = 0.7;

// Offsets measured inward from the wall plane.
const MIN_OFFSET_M = 0.05;
const MAX_OFFSET_M = 0.86;

const MIN_PIECE_M = 0.04;
const MAX_PIECE_M = 0.15;
// A minority of pieces are spalled slab corners rather than gravel. Without a
// few of these the run reads as uniform grit and never breaks the wall line.
const LARGE_PIECE_CHANCE = 0.22;
const LARGE_PIECE_SCALE = 1.9;
// Pieces sit slightly into the ground so they read as resting rather than
// balanced on the surface.
const SINK_FRACTION = 0.28;

type BuildWallBaseDebrisOptions = {
  wallSegments: readonly BoundarySegment[];
  seed: number;
  floorTopY: number;
  manifest: FloorMaterialLibrary;
  quality: FloorTextureQuality;
};

type InstanceTransform = {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  tint: Color;
};

/**
 * An icosahedron with its vertices pushed around deterministically. Three of
 * these carry enough silhouette variety that repeats are not legible at the
 * range a player sees a wall base.
 */
function createChipGeometry(variantIndex: number, seed: number): BufferGeometry {
  const geometry = new IcosahedronGeometry(0.5, 0);
  const rng = new DeterministicRng(deriveSubSeed(seed, `wall-debris-chip:${variantIndex}`));
  const position = geometry.getAttribute("position");
  const values: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) * rng.range(0.62, 1.32);
    const y = position.getY(index) * rng.range(0.34, 0.78);
    const z = position.getZ(index) * rng.range(0.62, 1.32);
    values.push(x, y, z);
  }
  geometry.setAttribute("position", new Float32BufferAttribute(values, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function planClusterPieces(
  segment: BoundarySegment,
  along: number,
  rng: DeterministicRng,
  floorTopY: number,
): InstanceTransform[] {
  const pieces: InstanceTransform[] = [];
  const count = rng.int(MIN_PIECES_PER_CLUSTER, MAX_PIECES_PER_CLUSTER + 1);
  for (let index = 0; index < count; index += 1) {
    const isLargePiece = rng.range(0, 1) < LARGE_PIECE_CHANCE;
    const sizeM = rng.range(MIN_PIECE_M, MAX_PIECE_M) * (isLargePiece ? LARGE_PIECE_SCALE : 1);
    // Swept debris banks against the wall rather than spreading evenly across
    // the lane, so the offset is squared toward the plinth: most pieces sit in
    // the first hand's width, and a stray piece out in the open stays rare.
    // Bigger fragments settle closest to the wall they spalled off.
    const offsetBias = rng.range(0, 1) ** 2;
    const offsetSpanM = (isLargePiece ? MAX_OFFSET_M * 0.55 : MAX_OFFSET_M) - MIN_OFFSET_M;
    const offsetM = MIN_OFFSET_M + offsetBias * offsetSpanM;
    const alongOffsetM = rng.range(-CLUSTER_SPREAD_M, CLUSTER_SPREAD_M);
    const inward = -segment.outward;

    const x = segment.orientation === "vertical"
      ? segment.coord + inward * offsetM
      : along + alongOffsetM;
    const z = segment.orientation === "vertical"
      ? along + alongOffsetM
      : segment.coord + inward * offsetM;

    const height = sizeM * rng.range(0.5, 0.92);
    const position = new Vector3(x, floorTopY + height * (0.5 - SINK_FRACTION), z);
    const quaternion = new Quaternion().setFromEuler(
      new Euler(rng.range(-0.34, 0.34), rng.range(0, Math.PI * 2), rng.range(-0.34, 0.34)),
    );
    const scale = new Vector3(sizeM * rng.range(0.85, 1.4), height, sizeM * rng.range(0.85, 1.4));
    // Spalled stone is the paving's own colour, weathered a little further in
    // either direction rather than recoloured.
    const shade = rng.range(0.72, 1.12);
    pieces.push({
      position,
      quaternion,
      scale,
      tint: new Color(shade, shade * rng.range(0.95, 1.0), shade * rng.range(0.86, 0.95)),
    });
  }
  return pieces;
}

export function buildWallBaseDebris(options: BuildWallBaseDebrisOptions): Group {
  const root = new Group();
  root.name = "map-wall-base-debris";

  const rngRoot = new DeterministicRng(deriveSubSeed(options.seed, "wall-base-debris"));
  const perVariant: InstanceTransform[][] = Array.from({ length: VARIANT_COUNT }, () => []);

  for (let index = 0; index < options.wallSegments.length; index += 1) {
    const segment = options.wallSegments[index]!;
    const segmentLength = segment.end - segment.start;
    if (segmentLength <= 1) continue;

    const segmentRng = rngRoot.fork(
      `seg:${index}:${segment.orientation}:${segment.coord.toFixed(3)}:${segment.start.toFixed(3)}:${segment.end.toFixed(3)}:${segment.outward}`,
    );
    let cursor = segment.start + segmentRng.range(0.4, 2.4);

    while (cursor < segment.end - 0.4) {
      const clusterRng = segmentRng.fork(`cluster:${cursor.toFixed(3)}`);
      for (const piece of planClusterPieces(segment, cursor, clusterRng, options.floorTopY)) {
        const variantIndex = clusterRng.int(0, VARIANT_COUNT);
        const bucket = perVariant[variantIndex];
        if (bucket && bucket.length < MAX_INSTANCES_PER_VARIANT) bucket.push(piece);
      }
      cursor += segmentRng.range(MIN_CLUSTER_GAP_M, MAX_CLUSTER_GAP_M);
    }
  }

  const matrix = new Matrix4();
  for (let variantIndex = 0; variantIndex < VARIANT_COUNT; variantIndex += 1) {
    const instances = perVariant[variantIndex] ?? [];
    if (instances.length === 0) continue;

    const geometry = createChipGeometry(variantIndex, options.seed);
    const material = options.manifest.createStandardMaterial("large_sandstone_blocks_01", options.quality);
    material.name = `wall-base-debris-${variantIndex}-${options.quality}`;
    material.roughness = Math.max(material.roughness, 0.95);
    material.needsUpdate = true;

    const mesh = new InstancedMesh(geometry, material, instances.length);
    mesh.name = `map-wall-base-debris-${variantIndex}`;
    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index]!;
      matrix.compose(instance.position, instance.quaternion, instance.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instance.tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // A chip that casts nothing sits on the floor like a sticker; the contact
    // shadow is most of what makes it read as a solid on the ground.
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.visualQa = {
      moduleId: "wall_base_debris",
      semanticClass: "ground_debris",
      representation: "module",
      materialMode: "pbr",
      shadowMode: "cast_receive",
      placementCount: instances.length,
    };
    root.add(mesh);
  }

  return root;
}
