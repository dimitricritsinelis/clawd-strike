import {
  BufferGeometry,
  CylinderGeometry,
  Quaternion,
  Vector3,
} from "three";
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

/** A supported hanging rug: timber rail, tied loops, woven field and fringe. */
export function createHangingTextileGeometry(variant: TextileVariant = 0): BufferGeometry {
  const palette = paletteFor(variant);
  const fieldWidth = 0.78 + (variant % 2) * 0.08;
  const parts: BufferGeometry[] = [
    tintGeometry(boxPart(fieldWidth, 0.72, 0.46, 0, -0.03, 0), palette.field),
    tintGeometry(boxPart(fieldWidth, 0.1, 0.48, 0, 0.28, 0), palette.border),
    tintGeometry(boxPart(fieldWidth, 0.1, 0.48, 0, -0.34, 0), palette.border),
    tintGeometry(boxPart(0.94, 0.06, 0.72, 0, 0.45, 0), [0.3, 0.19, 0.11]),
  ];

  for (const x of [-0.3, 0.3]) {
    parts.push(tintGeometry(boxPart(0.08, 0.12, 0.52, x, 0.38, 0), palette.thread));
  }
  const motifSpacing = variant % 2 === 0 ? 0.2 : 0.16;
  for (const x of [-motifSpacing, 0, motifSpacing]) {
    const motifHeight = x === 0 ? 0.32 : 0.24;
    parts.push(tintGeometry(boxPart(0.095, motifHeight, 0.49, x, -0.02, 0), palette.motif));
  }

  const fringeCount = 8 + variant;
  for (let index = 0; index < fringeCount; index += 1) {
    const x = -fieldWidth * 0.43 + (index / (fringeCount - 1)) * fieldWidth * 0.86;
    const length = 0.06 + ((index + variant) % 3) * 0.014;
    parts.push(tintGeometry(boxPart(0.028, length, 0.4, x, -0.45 + length * 0.5, 0), palette.thread));
  }

  return mergeProceduralGeometry(parts);
}

/**
 * Soft market drape with a readable stepped hem and restrained folds. It uses
 * the same unit bounds as the placeholder panel and stays fully render-only.
 */
export function createDrapePanelGeometry(variant: TextileVariant = 0): BufferGeometry {
  const palette = paletteFor(variant);
  const parts: BufferGeometry[] = [];
  const foldCount = 7 + (variant % 2) * 2;
  const foldWidth = 0.82 / foldCount;
  for (let index = 0; index < foldCount; index += 1) {
    const x = -0.41 + foldWidth * (index + 0.5);
    const bottomLift = Math.abs(index - (foldCount - 1) * 0.5) * 0.025;
    const height = 0.78 - bottomLift;
    const tone = index % 2 === 0 ? palette.field : palette.border;
    parts.push(tintGeometry(
      boxPart(foldWidth * 1.03, height, 0.34 + (index % 2) * 0.12, x, 0.34 - height * 0.5, 0),
      tone,
    ));
  }
  parts.push(tintGeometry(boxPart(0.92, 0.08, 0.54, 0, 0.43, 0), palette.thread));
  for (const x of [-0.34, 0.34]) {
    parts.push(tintGeometry(boxPart(0.07, 0.13, 0.46, x, 0.36, 0), palette.motif));
  }
  return mergeProceduralGeometry(parts);
}

/** Finished wall-art panel with a timber frame, recessed textile and motif. */
export function createWallArtGeometry(variant: TextileVariant = 0): BufferGeometry {
  const palette = paletteFor(variant);
  const frame: TextileTone = variant % 2 === 0 ? [0.31, 0.2, 0.12] : [0.2, 0.24, 0.25];
  const parts: BufferGeometry[] = [
    tintGeometry(boxPart(0.76, 0.68, 0.3, 0, 0, -0.08), palette.field),
    tintGeometry(boxPart(0.92, 0.09, 0.55, 0, 0.41, 0), frame),
    tintGeometry(boxPart(0.92, 0.09, 0.55, 0, -0.41, 0), frame),
    tintGeometry(boxPart(0.09, 0.73, 0.55, -0.415, 0, 0), frame),
    tintGeometry(boxPart(0.09, 0.73, 0.55, 0.415, 0, 0), frame),
  ];

  const motifXs = variant % 2 === 0 ? [-0.2, 0, 0.2] : [-0.24, -0.08, 0.08, 0.24];
  for (const x of motifXs) {
    parts.push(tintGeometry(boxPart(0.075, 0.38, 0.34, x, 0, 0.12), palette.motif));
  }
  parts.push(tintGeometry(boxPart(0.52, 0.07, 0.36, 0, 0, 0.14), palette.thread));
  return mergeProceduralGeometry(parts);
}

function laundryCatenaryY(localZ: number): number {
  const normalized = Math.max(-0.5, Math.min(0.5, localZ)) * 2;
  return -0.34 * (1 - normalized * normalized);
}

function cylinderBetween(start: Vector3, end: Vector3, radius: number): BufferGeometry {
  const delta = end.clone().sub(start);
  const geometry = new CylinderGeometry(radius, radius, delta.length(), 8, 1, false);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    delta.clone().normalize(),
  ));
  geometry.translate(
    (start.x + end.x) * 0.5,
    (start.y + end.y) * 0.5,
    (start.z + end.z) * 0.5,
  );
  return geometry;
}

/**
 * A sampled catenary replaces the former taut cylinder. Its endpoints remain
 * at the authored facade fixtures while the center drops inside the original
 * collisionless laundry envelope.
 */
export function createLaundryLineGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const segmentCount = 16;
  for (let index = 0; index < segmentCount; index += 1) {
    const z0 = -0.5 + index / segmentCount;
    const z1 = -0.5 + (index + 1) / segmentCount;
    parts.push(cylinderBetween(
      new Vector3(0, laundryCatenaryY(z0), z0),
      new Vector3(0, laundryCatenaryY(z1), z1),
      0.009,
    ));
  }
  return mergeProceduralGeometry(parts);
}

type LaundryVariant = 0 | 1 | 2;

function resolveLaundryClothLayout(variant: LaundryVariant) {
  return variant === 0
    ? [
      { x: -0.2, y: -0.23, z: -0.36, w: 0.11, h: 0.46, tone: [0.92, 0.68, 0.51] as const },
      { x: 0.18, y: -0.3, z: -0.12, w: 0.14, h: 0.6, tone: [0.54, 0.78, 0.73] as const },
      { x: -0.12, y: -0.2, z: 0.13, w: 0.1, h: 0.4, tone: [0.9, 0.8, 0.56] as const },
      { x: 0.16, y: -0.26, z: 0.36, w: 0.12, h: 0.52, tone: [0.72, 0.48, 0.4] as const },
    ]
    : variant === 1
      ? [
      { x: 0.18, y: -0.21, z: -0.38, w: 0.1, h: 0.42, tone: [0.45, 0.7, 0.72] as const },
      { x: -0.16, y: -0.32, z: -0.14, w: 0.13, h: 0.64, tone: [0.88, 0.58, 0.42] as const },
      { x: 0.08, y: -0.25, z: 0.1, w: 0.11, h: 0.5, tone: [0.82, 0.76, 0.52] as const },
      { x: -0.2, y: -0.18, z: 0.34, w: 0.09, h: 0.36, tone: [0.55, 0.72, 0.58] as const },
      ]
      : [
        // A process-specific dye batch: indigo, verdigris, saffron, madder,
        // and violet panels vary in width and drop while preserving the same
        // collisionless authored line envelope.
        { x: -0.18, y: -0.29, z: -0.4, w: 0.13, h: 0.58, tone: [0.19, 0.29, 0.58] as const },
        { x: 0.13, y: -0.23, z: -0.21, w: 0.1, h: 0.46, tone: [0.12, 0.49, 0.46] as const },
        { x: -0.08, y: -0.33, z: -0.02, w: 0.14, h: 0.66, tone: [0.82, 0.52, 0.12] as const },
        { x: 0.2, y: -0.26, z: 0.2, w: 0.12, h: 0.52, tone: [0.61, 0.16, 0.12] as const },
        { x: -0.14, y: -0.21, z: 0.39, w: 0.1, h: 0.42, tone: [0.4, 0.2, 0.5] as const },
      ];
}

export function createLaundryClothGeometry(variant: LaundryVariant): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const panel of resolveLaundryClothLayout(variant)) {
    const lineY = laundryCatenaryY(panel.z);
    const panelHeight = panel.h * 0.6;
    const foldCount = 5;
    const foldWidth = panel.w / foldCount;
    for (let foldIndex = 0; foldIndex < foldCount; foldIndex += 1) {
      const foldLift = ((foldIndex + variant) % 3) * 0.024;
      const foldHeight = panelHeight - foldLift;
      const foldZ = panel.z - panel.w * 0.5 + foldWidth * (foldIndex + 0.5);
      parts.push(tintGeometry(
        boxPart(
          0.012 + (foldIndex % 2) * 0.008,
          foldHeight,
          foldWidth * 1.04,
          panel.x + (foldIndex % 2 === 0 ? -0.012 : 0.012),
          lineY - foldHeight * 0.5,
          foldZ,
        ),
        foldIndex % 2 === 0
          ? panel.tone
          : [panel.tone[0] * 0.82, panel.tone[1] * 0.82, panel.tone[2] * 0.82],
      ));
    }
    parts.push(tintGeometry(
      boxPart(0.02, 0.035, panel.w * 0.94, panel.x, lineY - 0.008, panel.z),
      [0.72, 0.58, 0.42],
    ));
    for (const side of [-1, 1] as const) {
      parts.push(tintGeometry(
        boxPart(
          0.018,
          panelHeight * 0.88,
          0.014,
          panel.x,
          lineY - panelHeight * 0.5,
          panel.z + side * panel.w * 0.45,
        ),
        [panel.tone[0] * 0.72, panel.tone[1] * 0.72, panel.tone[2] * 0.72],
      ));
    }
  }
  return mergeProceduralGeometry(parts);
}

export function createLaundryClipGeometry(variant: LaundryVariant): BufferGeometry {
  return mergeProceduralGeometry(resolveLaundryClothLayout(variant).flatMap((panel) => (
    [-1, 1].map((side) => boxPart(
      0.03,
      0.1,
      0.03,
      panel.x,
      laundryCatenaryY(panel.z) + 0.025,
      panel.z + side * panel.w * 0.25,
    ))
  )));
}

/** Unit lantern silhouette for individual world-sized line attachments. */
export function createLaundryLanternGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    tintGeometry(boxPart(0.62, 0.08, 0.62, 0, 0.44, 0), [0.34, 0.22, 0.12]),
    tintGeometry(boxPart(0.72, 0.09, 0.72, 0, -0.44, 0), [0.28, 0.18, 0.11]),
  ];
  for (const sideX of [-1, 1] as const) {
    for (const sideZ of [-1, 1] as const) {
      parts.push(tintGeometry(
        boxPart(0.08, 0.8, 0.08, sideX * 0.29, 0, sideZ * 0.29),
        [0.3, 0.2, 0.12],
      ));
    }
  }
  const body = new CylinderGeometry(0.27, 0.36, 0.64, 8, 1, false);
  body.translate(0, -0.02, 0);
  parts.push(tintGeometry(body, [0.68, 0.42, 0.16]));
  return mergeProceduralGeometry(parts);
}

/**
 * One camera-scale folded textile bundle. Alternating fold depths, a stepped
 * hem and a narrow binding sleeve keep it from reading as another rigid bar.
 * Individual instances are suspended at the catenary low point in world
 * metres, independently of the authored full-span transform.
 */
export function createLaundryBundleGeometry(): BufferGeometry {
  const tones: readonly TextileTone[] = [
    [0.62, 0.2, 0.12],
    [0.34, 0.52, 0.48],
    [0.78, 0.56, 0.2],
  ];
  const parts: BufferGeometry[] = [];
  const foldCount = 7;
  const foldWidth = 0.82 / foldCount;
  for (let index = 0; index < foldCount; index += 1) {
    const lift = (index % 3) * 0.055;
    const height = 0.78 - lift;
    const z = -0.41 + foldWidth * (index + 0.5);
    parts.push(tintGeometry(
      boxPart(
        0.16 + (index % 2) * 0.07,
        height,
        foldWidth * 1.05,
        index % 2 === 0 ? -0.035 : 0.035,
        0.39 - height * 0.5,
        z,
      ),
      tones[index % tones.length]!,
    ));
  }
  parts.push(tintGeometry(boxPart(0.24, 0.1, 0.92, 0, 0.43, 0), [0.34, 0.22, 0.13]));
  for (const z of [-0.31, 0.31]) {
    parts.push(tintGeometry(boxPart(0.27, 0.13, 0.08, 0, 0.39, z), [0.72, 0.57, 0.34]));
  }
  return mergeProceduralGeometry(parts);
}

/**
 * A canonical dyers' workbench textile display. The five large cloth bolts
 * and three folded batches use the same textured, vertex-tinted material seam
 * as other soft goods, but their process palette and varied proportions make
 * the workshop legible without adding collision or a one-location model.
 */
export function createDyersWorkshopTextileGeometry(): BufferGeometry {
  const tones: readonly TextileTone[] = [
    [0.18, 0.28, 0.58],
    [0.11, 0.47, 0.44],
    [0.82, 0.5, 0.11],
    [0.62, 0.15, 0.11],
    [0.38, 0.19, 0.49],
  ];
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < tones.length; index += 1) {
    const width = 0.12 + (index % 2) * 0.025;
    const height = 0.5 + ((index + 1) % 3) * 0.12;
    const x = -0.39 + index * 0.195;
    parts.push(tintGeometry(
      boxPart(width, height, 0.16, x, 0.12 - height * 0.5, 0),
      tones[index]!,
    ));
    parts.push(tintGeometry(
      boxPart(width * 1.04, 0.045, 0.18, x, 0.13, 0),
      [tones[index]![0] * 0.72, tones[index]![1] * 0.72, tones[index]![2] * 0.72],
    ));
  }
  for (let index = 0; index < 3; index += 1) {
    parts.push(tintGeometry(
      boxPart(0.25, 0.09, 0.34, -0.28 + index * 0.28, -0.39 + index * 0.015, 0.02),
      tones[(index + 2) % tones.length]!,
    ));
  }
  return mergeProceduralGeometry(parts);
}
