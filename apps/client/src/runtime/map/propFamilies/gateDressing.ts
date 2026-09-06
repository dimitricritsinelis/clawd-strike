import {
  BufferGeometry,
  CylinderGeometry,
  PlaneGeometry,
} from "three";
import {
  boxPart,
  mergeProceduralGeometry,
  tintGeometry,
} from "./propsCore";

export const HERO_GATE_REFERENCE_WIDTH_M = 13;
export const HERO_GATE_REFERENCE_HEIGHT_M = 6.8;
export const HERO_GATE_REFERENCE_DEPTH_M = 0.8;
export const HERO_GATE_RETURN_PILLAR_WIDTH_M = 0.24;
export const HERO_GATE_ROUTE_HALF_CLEARANCE_M = 3.15;
export const HERO_GATE_OUTER_RETURN_CLEARANCE_M = 0.5;
export const HERO_GATE_MIN_FIXTURE_GAP_M = 0.15;
export const HERO_GATE_MAX_FIXTURE_GAP_M = 0.35;

export type HeroGateDressingVariant = "cool-tall" | "warm-low";
export type HeroGateDressingMassKind = "threshold-textile" | "rug-cradle" | "textile-rack";

export type HeroGateDressingMass = {
  kind: HeroGateDressingMassKind;
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type HeroGateDressingLayout = {
  variant: HeroGateDressingVariant;
  side: -1 | 1;
  routeHalfClearanceM: number;
  outerLimitM: number;
  gapsM: readonly [number, number];
  masses: readonly [
    HeroGateDressingMass,
    HeroGateDressingMass,
    HeroGateDressingMass,
  ];
};

type GateDressingTone = readonly [number, number, number];

type GateDressingVariantSpec = {
  side: -1 | 1;
  innerEdgeM: number;
  gapsM: readonly [number, number];
  masses: readonly [
    Omit<HeroGateDressingMass, "centerX" | "centerZ"> & { centerZ: number },
    Omit<HeroGateDressingMass, "centerX" | "centerZ"> & { centerZ: number },
    Omit<HeroGateDressingMass, "centerX" | "centerZ"> & { centerZ: number },
  ];
  textile: {
    field: GateDressingTone;
    border: GateDressingTone;
    motif: GateDressingTone;
    thread: GateDressingTone;
    rolls: readonly GateDressingTone[];
  };
  timber: {
    primary: GateDressingTone;
    edge: GateDressingTone;
    worn: GateDressingTone;
  };
};

const HERO_GATE_DRESSING_SPECS: Readonly<Record<HeroGateDressingVariant, GateDressingVariantSpec>> = {
  "cool-tall": {
    side: -1,
    // The card's 6.0 m route plus 0.15 m visual buffer ends at 3.15 m.
    // A further 0.06 m prevents fringe/AA from visually grazing that datum.
    innerEdgeM: 3.18,
    gapsM: [0.15, 0.15],
    masses: [
      { kind: "threshold-textile", centerZ: -0.05, width: 0.2, height: 0.035, depth: 0.65 },
      { kind: "rug-cradle", centerZ: -0.02, width: 0.28, height: 0.5, depth: 0.66 },
      { kind: "textile-rack", centerZ: 0.12, width: 1.8, height: 3.15, depth: 0.44 },
    ],
    textile: {
      field: [0.27, 0.5, 0.52],
      border: [0.72, 0.3, 0.18],
      motif: [0.94, 0.7, 0.34],
      thread: [0.82, 0.7, 0.49],
      rolls: [
        [0.86, 0.59, 0.25],
        [0.26, 0.58, 0.56],
        [0.78, 0.4, 0.29],
      ],
    },
    timber: {
      primary: [0.61, 0.45, 0.3],
      edge: [0.45, 0.31, 0.2],
      worn: [0.73, 0.56, 0.37],
    },
  },
  "warm-low": {
    side: 1,
    innerEdgeM: 3.16,
    gapsM: [0.16, 0.15],
    masses: [
      { kind: "threshold-textile", centerZ: -0.04, width: 0.2, height: 0.03, depth: 0.68 },
      { kind: "rug-cradle", centerZ: -0.02, width: 0.28, height: 0.56, depth: 0.66 },
      { kind: "textile-rack", centerZ: 0.12, width: 1.8, height: 2.85, depth: 0.44 },
    ],
    textile: {
      field: [0.72, 0.27, 0.16],
      border: [0.26, 0.36, 0.48],
      motif: [0.94, 0.68, 0.29],
      thread: [0.82, 0.62, 0.38],
      rolls: [
        [0.48, 0.53, 0.28],
        [0.84, 0.59, 0.24],
        [0.86, 0.76, 0.55],
      ],
    },
    timber: {
      primary: [0.67, 0.49, 0.33],
      edge: [0.48, 0.34, 0.23],
      worn: [0.78, 0.61, 0.42],
    },
  },
};

function resolveVariantSpec(variant: HeroGateDressingVariant): GateDressingVariantSpec {
  return HERO_GATE_DRESSING_SPECS[variant];
}

export function resolveHeroGateDressingLayout(
  variant: HeroGateDressingVariant,
): HeroGateDressingLayout {
  const spec = resolveVariantSpec(variant);
  const outerLimitM = (
    (HERO_GATE_REFERENCE_WIDTH_M - HERO_GATE_RETURN_PILLAR_WIDTH_M * 2) * 0.5
    - HERO_GATE_OUTER_RETURN_CLEARANCE_M
  );
  let cursor = spec.innerEdgeM;
  const masses = spec.masses.map((mass, index) => {
    const centerAbs = cursor + mass.width * 0.5;
    cursor += mass.width + (spec.gapsM[index] ?? 0);
    return {
      ...mass,
      centerX: spec.side * centerAbs,
    };
  }) as [
    HeroGateDressingMass,
    HeroGateDressingMass,
    HeroGateDressingMass,
  ];

  return {
    variant,
    side: spec.side,
    routeHalfClearanceM: HERO_GATE_ROUTE_HALF_CLEARANCE_M,
    outerLimitM,
    gapsM: spec.gapsM,
    masses,
  };
}

function normalizeGateGeometry(geometry: BufferGeometry): BufferGeometry {
  geometry.scale(
    1 / HERO_GATE_REFERENCE_WIDTH_M,
    1 / HERO_GATE_REFERENCE_HEIGHT_M,
    1 / HERO_GATE_REFERENCE_DEPTH_M,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createSaggedRackPanel(
  mass: HeroGateDressingMass,
  tint: GateDressingTone,
  variant: HeroGateDressingVariant,
): BufferGeometry {
  const width = mass.width * (variant === "cool-tall" ? 0.92 : 0.90);
  const height = mass.height * (variant === "cool-tall" ? 0.76 : 0.74);
  const bottomY = variant === "cool-tall" ? 0.62 : 0.42;
  const panel = new PlaneGeometry(width, height, 5, 6);
  const positions = panel.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const across = positions.getX(index) / (width * 0.5);
    const vertical = positions.getY(index) / (height * 0.5);
    const centerSag = (1 - across * across) * (1 - (vertical + 1) * 0.18) * 0.055;
    const fold = Math.sin((across + 1) * Math.PI * 3) * 0.032;
    positions.setZ(index, mass.centerZ - mass.depth * 0.28 - centerSag - fold);
  }
  positions.needsUpdate = true;
  panel.translate(mass.centerX, height * 0.5 + bottomY, 0);
  panel.computeVertexNormals();
  return tintGeometry(panel, tint);
}

function createTextileGeometry(variant: HeroGateDressingVariant): BufferGeometry {
  const spec = resolveVariantSpec(variant);
  const layout = resolveHeroGateDressingLayout(variant);
  const [threshold, cradle, rack] = layout.masses;
  const parts: BufferGeometry[] = [];

  // Mass 1: a shallow, walk-clear threshold kilim with bound edges. It stays
  // outside the protected route strip and never becomes collision.
  parts.push(tintGeometry(
    boxPart(threshold.width, threshold.height, threshold.depth, threshold.centerX, threshold.height * 0.5, threshold.centerZ),
    spec.textile.field,
  ));
  for (const xOffset of [-0.32, 0.32]) {
    parts.push(tintGeometry(
      boxPart(
        threshold.width * 0.14,
        threshold.height * 1.18,
        threshold.depth * 0.88,
        threshold.centerX + xOffset * threshold.width,
        threshold.height * 0.59,
        threshold.centerZ,
      ),
      spec.textile.motif,
    ));
  }
  for (const zOffset of [-0.42, 0.42]) {
    parts.push(tintGeometry(
      boxPart(
        threshold.width * 0.94,
        threshold.height * 1.24,
        threshold.depth * 0.1,
        threshold.centerX,
        threshold.height * 0.62,
        threshold.centerZ + zOffset * threshold.depth,
      ),
      spec.textile.border,
    ));
  }

  // Mass 2: two visibly supported layers of rolled stock. The rolls are part
  // of the cradle asset, so the gate receives inventory without loose scatter.
  const rollRadius = variant === "cool-tall" ? 0.07 : 0.085;
  const rollWidth = cradle.width * 0.78;
  const rollLayout = variant === "cool-tall"
    ? [
      { y: 0.18, z: -0.11, toneIndex: 0 },
      { y: 0.18, z: 0.07, toneIndex: 1 },
      { y: 0.31, z: -0.01, toneIndex: 2 },
    ]
    : [
      { y: 0.2, z: -0.13, toneIndex: 0 },
      { y: 0.2, z: 0.08, toneIndex: 1 },
      { y: 0.35, z: 0, toneIndex: 2 },
    ];
  for (const roll of rollLayout) {
    const geometry = new CylinderGeometry(rollRadius, rollRadius, rollWidth, 10, 1, false);
    geometry.rotateZ(Math.PI * 0.5);
    geometry.translate(cradle.centerX, roll.y, cradle.centerZ + roll.z);
    parts.push(tintGeometry(geometry, spec.textile.rolls[roll.toneIndex]!));
  }

  // Mass 3: one supported hero hanging. Border, motif, hem, and ties all stay
  // inside the rack AABB and differ by side; the two flanks are not clones.
  parts.push(createSaggedRackPanel(rack, spec.textile.field, variant));
  const panelWidth = rack.width * (variant === "cool-tall" ? 0.92 : 0.90);
  const panelHeight = rack.height * (variant === "cool-tall" ? 0.76 : 0.74);
  const panelBottomY = variant === "cool-tall" ? 0.62 : 0.42;
  const panelCenterY = panelHeight * 0.5 + panelBottomY;
  const panelZ = rack.centerZ - rack.depth * 0.3 - 0.01;
  for (const yOffset of [-0.44, 0.44]) {
    parts.push(tintGeometry(
      boxPart(
        panelWidth * 0.94,
        panelHeight * 0.08,
        0.018,
        rack.centerX,
        panelCenterY + yOffset * panelHeight,
        panelZ,
      ),
      spec.textile.border,
    ));
  }
  const motifOffsets = variant === "cool-tall" ? [-0.24, 0, 0.24] : [-0.3, -0.1, 0.1, 0.3];
  for (const offset of motifOffsets) {
    const motif = boxPart(
      panelWidth * 0.09,
      panelHeight * (variant === "cool-tall" ? 0.42 : 0.34),
      0.02,
      0,
      0,
      0,
    );
    if (variant === "warm-low") motif.rotateZ(offset * 0.45);
    motif.translate(
      rack.centerX + offset * panelWidth,
      panelCenterY,
      panelZ - 0.005,
    );
    parts.push(tintGeometry(motif, spec.textile.motif));
  }
  for (const across of [-0.4, 0, 0.4]) {
    const top = panelBottomY + panelHeight;
    const tieHeight = rack.height - 0.04 - top;
    parts.push(tintGeometry(
      boxPart(0.025, tieHeight + 0.06, 0.025, rack.centerX + across * panelWidth, top + tieHeight * 0.5, panelZ),
      spec.textile.thread,
    ));
  }
  const fringeCount = variant === "cool-tall" ? 7 : 9;
  for (let index = 0; index < fringeCount; index += 1) {
    const x = rack.centerX - panelWidth * 0.42 + (index / (fringeCount - 1)) * panelWidth * 0.84;
    const length = 0.055 + ((index + (variant === "cool-tall" ? 0 : 1)) % 3) * 0.012;
    parts.push(tintGeometry(
      boxPart(0.018, length, 0.016, x, panelBottomY - length * 0.5, panelZ),
      spec.textile.thread,
    ));
  }
  const rackRollRadius = variant === "cool-tall" ? 0.09 : 0.1;
  const rackRollWidth = rack.width * 0.72;
  const rackRollLayout = variant === "cool-tall"
    ? [
      { y: 0.24, z: -0.08, toneIndex: 0 },
      { y: 0.42, z: 0.03, toneIndex: 1 },
    ]
    : [
      { y: 0.2, z: -0.07, toneIndex: 2 },
      { y: 0.34, z: 0.06, toneIndex: 0 },
    ];
  for (const roll of rackRollLayout) {
    const geometry = new CylinderGeometry(rackRollRadius, rackRollRadius, rackRollWidth, 10, 1, false);
    geometry.rotateZ(Math.PI * 0.5);
    geometry.translate(rack.centerX, roll.y, rack.centerZ + roll.z);
    parts.push(tintGeometry(geometry, spec.textile.rolls[roll.toneIndex]!));
  }

  return normalizeGateGeometry(mergeProceduralGeometry(parts));
}

function createFrameGeometry(variant: HeroGateDressingVariant): BufferGeometry {
  const spec = resolveVariantSpec(variant);
  const layout = resolveHeroGateDressingLayout(variant);
  const [, cradle, rack] = layout.masses;
  const parts: BufferGeometry[] = [];

  // Grounded rug cradle: feet, tray, two retaining cheeks, and a worn lip.
  parts.push(tintGeometry(
    boxPart(cradle.width, 0.08, cradle.depth, cradle.centerX, 0.04, cradle.centerZ),
    spec.timber.primary,
  ));
  for (const side of [-1, 1] as const) {
    parts.push(tintGeometry(
      boxPart(0.055, cradle.height * 0.78, cradle.depth * 0.9, cradle.centerX + side * (cradle.width * 0.5 - 0.028), cradle.height * 0.39, cradle.centerZ),
      spec.timber.edge,
    ));
  }
  parts.push(tintGeometry(
    boxPart(cradle.width * 0.94, 0.055, 0.06, cradle.centerX, cradle.height * 0.56, cradle.centerZ - cradle.depth * 0.42),
    spec.timber.worn,
  ));

  // Tall/low rack variants share a plausible load path but intentionally vary
  // their bay rhythm and brace direction.
  const postInset = 0.04;
  const postDepth = 0.055;
  for (const xSide of [-1, 1] as const) {
    for (const zSide of [-1, 1] as const) {
      parts.push(tintGeometry(
        boxPart(
          0.055,
          rack.height,
          postDepth,
          rack.centerX + xSide * (rack.width * 0.5 - postInset),
          rack.height * 0.5,
          rack.centerZ + zSide * (rack.depth * 0.5 - postDepth * 0.5),
        ),
        xSide === -1 ? spec.timber.primary : spec.timber.edge,
      ));
    }
  }
  for (const zSide of [-1, 1] as const) {
    parts.push(tintGeometry(
      boxPart(
        rack.width,
        0.065,
        0.065,
        rack.centerX,
        rack.height - 0.045,
        rack.centerZ + zSide * (rack.depth * 0.5 - 0.04),
      ),
      spec.timber.worn,
    ));
  }
  parts.push(tintGeometry(
    boxPart(
      rack.width * 0.92,
      0.07,
      rack.depth * 0.82,
      rack.centerX,
      0.12,
      rack.centerZ,
    ),
    spec.timber.primary,
  ));
  for (const zSide of [-1, 1] as const) {
    for (const heightRatio of variant === "cool-tall" ? [0.3, 0.57] : [0.38]) {
      parts.push(tintGeometry(
        boxPart(
          rack.width * 0.82,
          0.045,
          0.045,
          rack.centerX,
          rack.height * heightRatio,
          rack.centerZ + zSide * (rack.depth * 0.5 - 0.035),
        ),
        spec.timber.edge,
      ));
    }
  }
  const railCount = variant === "cool-tall" ? 2 : 1;
  for (let index = 0; index < railCount; index += 1) {
    parts.push(tintGeometry(
      boxPart(
        rack.width * 0.9,
        0.045,
        0.05,
        rack.centerX,
        rack.height * (0.34 + index * 0.22),
        rack.centerZ + rack.depth * 0.38,
      ),
      spec.timber.worn,
    ));
  }
  for (const xSide of [-1, 1] as const) {
    parts.push(tintGeometry(
      boxPart(
        0.13,
        0.06,
        rack.depth * 0.86,
        rack.centerX + xSide * (rack.width * 0.5 - 0.07),
        0.03,
        rack.centerZ,
      ),
      spec.timber.edge,
    ));
  }

  return normalizeGateGeometry(mergeProceduralGeometry(parts));
}

export function createHeroGateDressingTextileGeometry(
  variant: HeroGateDressingVariant,
): BufferGeometry {
  return createTextileGeometry(variant);
}

export function createHeroGateDressingFrameGeometry(
  variant: HeroGateDressingVariant,
): BufferGeometry {
  return createFrameGeometry(variant);
}
