import { BufferGeometry } from "three";
import { boxPart, mergeProceduralGeometry, tintGeometry } from "./propsCore";

type TextileVariant = 0 | 1 | 2 | 3;
type TextileTone = readonly [number, number, number];

const TEXTILE_PALETTES: ReadonlyArray<{
  field: TextileTone;
  border: TextileTone;
  motif: TextileTone;
  thread: TextileTone;
}> = [
  { field: [0.58, 0.2, 0.12], border: [0.18, 0.3, 0.31], motif: [0.86, 0.63, 0.28], thread: [0.73, 0.52, 0.35] },
  { field: [0.15, 0.38, 0.43], border: [0.5, 0.2, 0.13], motif: [0.82, 0.68, 0.4], thread: [0.65, 0.72, 0.64] },
  { field: [0.54, 0.34, 0.16], border: [0.24, 0.25, 0.35], motif: [0.76, 0.35, 0.22], thread: [0.75, 0.61, 0.38] },
  { field: [0.32, 0.27, 0.43], border: [0.12, 0.3, 0.3], motif: [0.76, 0.5, 0.22], thread: [0.64, 0.52, 0.56] },
] as const;

function paletteFor(variant: TextileVariant) {
  return TEXTILE_PALETTES[variant]!;
}

/**
 * Unit-envelope ground rug. The flat field, raised hand-bound edges, woven
 * border, and separated fringe all remain within the former BoxGeometry
 * bounds so authored transforms and telemetry envelopes do not change.
 */
export function createGroundRugGeometry(variant: TextileVariant = 0): BufferGeometry {
  const palette = paletteFor(variant);
  const parts: BufferGeometry[] = [
    tintGeometry(boxPart(0.9, 0.82, 0.86, 0, -0.09, 0), palette.field),
    tintGeometry(boxPart(0.9, 0.1, 0.12, 0, 0.37, -0.36), palette.border),
    tintGeometry(boxPart(0.9, 0.1, 0.12, 0, 0.37, 0.36), palette.border),
    tintGeometry(boxPart(0.1, 0.1, 0.6, -0.4, 0.37, 0), palette.border),
    tintGeometry(boxPart(0.1, 0.1, 0.6, 0.4, 0.37, 0), palette.border),
  ];

  const motifOffset = variant % 2 === 0 ? 0.17 : 0.23;
  for (const x of [-motifOffset, motifOffset]) {
    parts.push(tintGeometry(boxPart(0.12, 0.11, 0.48, x, 0.445, 0), palette.motif));
  }
  for (const z of [-0.16, 0, 0.16]) {
    const width = z === 0 ? 0.34 : 0.2;
    parts.push(tintGeometry(boxPart(width, 0.11, 0.055, 0, 0.445, z), palette.thread));
  }

  const fringeCount = 9 + variant;
  for (let index = 0; index < fringeCount; index += 1) {
    const x = -0.4 + (index / (fringeCount - 1)) * 0.8;
    const stagger = ((index + variant) % 3) * 0.012;
    for (const side of [-1, 1] as const) {
      parts.push(tintGeometry(
        boxPart(0.025, 0.055, 0.075 - stagger, x, 0.385, side * (0.4625 - stagger * 0.5)),
        palette.thread,
      ));
    }
  }

  return mergeProceduralGeometry(parts);
}
