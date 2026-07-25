import type { RuntimeMapAssets } from "../map/types";

export type QaAssetProfile = "qa" | "cell-review";
export type QaTextureTier = "1k" | "2k" | "4k";

export type QaResolvedTexture = {
  kind: "floor" | "wall";
  materialId: string;
  requestedTier: QaTextureTier;
  resolvedTier: QaTextureTier;
  urls: readonly string[];
};

export type QaAssetPlan = {
  schemaVersion: 1;
  profile: QaAssetProfile;
  floorMaterialIds: readonly string[];
  wallMaterialIds: readonly string[];
  propModelIds: readonly string[];
  doorModelIds: readonly string[];
  directTextureUrls: readonly string[];
  requiredLogicalRequestIds: readonly string[];
  hash: string;
};

export type QaAssetPlanOptions = {
  floorPbr?: boolean;
  wallPbr?: boolean;
  wallDetails?: boolean;
  bazaarProps?: boolean;
  doorModels?: boolean;
  textureTier?: "1k" | "2k";
};

export type QaAssetFailure = {
  id: string;
  message: string;
};

export type QaCaptureState = {
  schemaVersion: 1;
  profile: QaAssetProfile;
  planHash: string;
  observedPlanHash: string | null;
  plannedChildRequests: readonly string[];
  observedChildRequests: readonly string[];
  unexpectedRequests: readonly string[];
  pending: readonly string[];
  failed: readonly QaAssetFailure[];
  totalRequests: number;
  requestedCount: number;
  completedCount: number;
  resolvedTextures: readonly QaResolvedTexture[];
  textureCount: number;
  stableFrameCount: number;
  stableForMs: number;
  startedAtMs: number;
  lastResourceChangeAtMs: number | null;
  readyAtMs: number | null;
  ready: boolean;
  timedOut: boolean;
  timeoutMs: number;
};

export type QaAssetRequestObserver = {
  expectChild: (id: string) => void;
  start: (id: string) => void;
  complete: (id: string) => void;
  fail: (id: string, error: unknown) => void;
};

const QA_FLOOR_DIRECT_MATERIAL_IDS = [
  // buildPbrFloors transition courses. These can be emitted even when no
  // authored zone selects the material directly.
  "large_sandstone_blocks_01",
  "grey_tiles",
  // buildBlockout visual-only floor details.
  "cobblestone_pavement",
  "red_sandstone_pavement",
  // buildSandAccumulation's golden-lighting pass.
  "sand_01",
] as const;

// These materials are selected by visual-only builders rather than directly
// by the compiled facade slots. Keeping them explicit makes that dependency
// visible to the QA plan without changing the authored map contract.
const QA_WALL_DIRECT_MATERIAL_IDS = [
  "ph_aged_plaster_ochre",
  "ph_beige_wall_001",
  "ph_beige_wall_002",
  "ph_lime_plaster_sun",
  "ph_plastered_wall",
  "ph_rough_pine_door",
  "ph_rusty_metal_02",
  "ph_sandstone_blocks_06",
  "ph_stone_trim_sandstone",
  "ph_whitewashed_brick_cool",
  "ph_whitewashed_brick_dusty",
  "ph_worn_planks",
  "ph_worn_plaster_ochre",
  "ph_worn_plaster_sun",
] as const;

const LEGACY_QA_DOOR_MODEL_IDS = [
  "ph_large_castle_door",
  "ph_rollershutter_window_02",
] as const;

// Textures loaded directly by render-only prop templates rather than through
// a material manifest. The capture gate prefetches and observes these requests.
export const QA_RENDERER_DIRECT_TEXTURE_URLS = [
  "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_arm_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_diff_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_nor_gl_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_arm_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_diff_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_nor_gl_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_arm_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_diff_1k.jpg",
  "/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_nor_gl_1k.jpg",
  "/assets/textures/environment/bazaar/textiles/project_original/canopy_stripe_albedo_v1.jpg",
  "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_arm_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_diff_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rusty_metal_02/rusty_metal_02_nor_gl_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_plaster_02/white_plaster_02_arm_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_plaster_02/white_plaster_02_diff_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_plaster_02/white_plaster_02_nor_gl_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
  "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
] as const;

export const QA_PALM_DIRECT_TEXTURE_URLS = {
  "1k": [
    "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_arm_1k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_diff_1k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_nor_gl_1k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_frond_project_original/palm_frond_diff.png",
    "/assets/textures/environment/bazaar/foliage/palms/palm_bark/palm_bark_arm_1k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_bark/palm_bark_nor_gl_1k.jpg",
    "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
    "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
    "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
  ],
  "2k": [
    "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_arm_2k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_diff_2k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_tree_bark/palm_tree_bark_nor_gl_2k.jpg",
    "/assets/textures/environment/bazaar/foliage/palms/palm_frond_project_original/palm_frond_diff.png",
    "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_2k.jpg",
    "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_2k.jpg",
    "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_2k.jpg",
  ],
} as const;

export const QA_STAINED_GLASS_DIRECT_TEXTURE_URLS = [
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_ambientOcclusion.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_basecolor.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_height.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_metallic.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_normal.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_opacity.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_roughness.png",
  "/assets/textures/environment/bazaar/windows/stained_glass_panel_001/Glass_Stained_Panel_001_transmissive.png",
] as const;

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function qaFloorMaterialRequestId(materialId: string): string {
  return `floor-material:${materialId}`;
}

export function qaWallMaterialRequestId(materialId: string): string {
  return `wall-material:${materialId}`;
}

export function qaPropModelRequestId(modelId: string): string {
  return `prop-model:${modelId}`;
}

export function qaDoorModelRequestId(modelId: string): string {
  return `door-model:${modelId}`;
}

export function qaDirectTextureRequestId(url: string): string {
  return `direct-texture:${url}`;
}

export function hashQaAssetRequestIds(
  profile: QaAssetProfile,
  requestIds: Iterable<string>,
): string {
  return stableHash(JSON.stringify({
    schemaVersion: 1,
    profile,
    requestIds: sortedUnique(requestIds),
  }));
}

export function resolveQaAssetProfile(search: string): QaAssetProfile | null {
  const params = new URLSearchParams(search);
  const namedProfile = params.get("qaProfile")?.trim().toLowerCase();
  if (namedProfile === "cell-review") return "cell-review";
  if (params.get("qa") !== "1") return null;
  return params.has("shot") ? "cell-review" : "qa";
}

export function resolveQaAssetTimeoutMs(search: string): number {
  const raw = new URLSearchParams(search).get("qaAssetTimeoutMs");
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 20_000;
  return Math.max(1_000, Math.min(120_000, parsed));
}

export function resolveQaDoorModelIds(mapAssets: RuntimeMapAssets): string[] {
  const blockout = mapAssets.blockout;
  if (!/^3(?:\.|$)/.test(blockout.formatVersion ?? "")) {
    // Legacy wall-detail placement chooses between both registered models from
    // the computed door width. V3 bypasses that placer and declares model
    // dependencies on the compiled facade placements instead.
    return sortedUnique(LEGACY_QA_DOOR_MODEL_IDS);
  }

  const modelIdByAssetId = new Map(
    (blockout.assetRegistry ?? [])
      .filter((asset) => asset.runtime?.mode === "model")
      .map((asset) => [asset.id, asset.runtime!.id] as const),
  );
  return sortedUnique(
    (blockout.architecturePlacements ?? []).flatMap((placement) => {
      if (placement.kind !== "facade_module" || placement.moduleKind !== "door" || !placement.assetId) {
        return [];
      }
      const modelId = modelIdByAssetId.get(placement.assetId);
      return modelId ? [modelId] : [];
    }),
  );
}

export function createQaAssetPlan(
  mapAssets: RuntimeMapAssets,
  profile: QaAssetProfile,
  options: QaAssetPlanOptions = {},
): QaAssetPlan {
  const floorMaterialIds = options.floorPbr === false
    ? []
    : sortedUnique([
        ...QA_FLOOR_DIRECT_MATERIAL_IDS,
        ...mapAssets.blockout.zones.flatMap((zone) => zone.floorMaterialId ? [zone.floorMaterialId] : []),
      ]);
  const wallMaterialIds = options.wallPbr === false
    ? []
    : sortedUnique([
        ...QA_WALL_DIRECT_MATERIAL_IDS,
        ...(mapAssets.blockout.facadeProfiles ?? []).flatMap((facade) => (
          Object.values(facade.materialSlots).filter((id) => id.startsWith("ph_"))
        )),
        ...(mapAssets.blockout.architecturePlacements ?? []).flatMap((placement) => (
          placement.kind === "massing"
            ? Object.values(placement.materialSlots).filter((id) => id.startsWith("ph_"))
            : []
        )),
      ]);
  const propModelIds = options.bazaarProps === false
    ? []
    : sortedUnique([
        ...(mapAssets.blockout.dressingPlacements ?? []).flatMap((placement) => (
          placement.runtime.mode === "model" ? [placement.runtime.id] : []
        )),
        ...(mapAssets.blockout.dressingPlacements ?? []).some((placement) => (
          placement.runtime.id === "bazaar_cover_goods"
        )) ? ["ph_wooden_crate_01"] : [],
      ]);
  const doorModelIds = options.doorModels === false ? [] : resolveQaDoorModelIds(mapAssets);
  const hasDecorativePalms = mapAssets.anchors.anchors.some((anchor) => (
    anchor.type.toLowerCase() === "decorative_palm"
  ));
  const textureTier = options.textureTier ?? "1k";
  const directTextureUrls = sortedUnique([
    ...(options.bazaarProps === false ? [] : QA_RENDERER_DIRECT_TEXTURE_URLS),
    ...(hasDecorativePalms ? QA_PALM_DIRECT_TEXTURE_URLS[textureTier] : []),
    ...(options.wallDetails === false ? [] : QA_STAINED_GLASS_DIRECT_TEXTURE_URLS),
  ]);
  const requiredLogicalRequestIds = sortedUnique([
    ...floorMaterialIds.map(qaFloorMaterialRequestId),
    ...wallMaterialIds.map(qaWallMaterialRequestId),
    ...propModelIds.map(qaPropModelRequestId),
    ...doorModelIds.map(qaDoorModelRequestId),
    ...directTextureUrls.map(qaDirectTextureRequestId),
  ]);
  return {
    schemaVersion: 1,
    profile,
    floorMaterialIds,
    wallMaterialIds,
    propModelIds,
    doorModelIds,
    directTextureUrls,
    requiredLogicalRequestIds,
    hash: hashQaAssetRequestIds(profile, requiredLogicalRequestIds),
  };
}

function defaultResourceSignature(): string {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return "resources:unavailable";
  }
  const rows = performance.getEntriesByType("resource").map((entry) => {
    const resource = entry as PerformanceResourceTiming;
    return [
      resource.name,
      Math.round(resource.responseEnd * 10) / 10,
      resource.transferSize ?? 0,
      resource.decodedBodySize ?? 0,
    ].join("|");
  });
  rows.sort((left, right) => left.localeCompare(right));
  return stableHash(rows.join("\n"));
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class QaAssetReadinessTracker {
  private readonly pending = new Set<string>();
  private readonly requested = new Set<string>();
  private readonly completed = new Set<string>();
  private readonly failures = new Map<string, string>();
  private readonly resolvedTextures = new Map<string, QaResolvedTexture>();
  private readonly requiredLogicalRequestIds: ReadonlySet<string>;
  private readonly plannedChildRequestIds = new Set<string>();
  private readonly unexpectedRequestIds = new Set<string>();
  private lastResourceState: string | null = null;
  private stableSinceMs: number | null = null;
  private stableFrameCount = 0;
  private textureCount = 0;
  private readyAtMs: number | null = null;
  private timeoutLatched = false;

  constructor(
    readonly plan: QaAssetPlan,
    readonly timeoutMs: number,
    private readonly now: () => number = () => performance.now(),
    private readonly resourceSignature: () => string = defaultResourceSignature,
    private readonly startedAtMs: number = now(),
  ) {
    this.requiredLogicalRequestIds = new Set(plan.requiredLogicalRequestIds);
  }

  readonly observer: QaAssetRequestObserver = {
    expectChild: (id) => this.expectChild(id),
    start: (id) => this.start(id),
    complete: (id) => this.complete(id),
    fail: (id, error) => this.fail(id, error),
  };

  expectChild(id: string): void {
    const now = this.now();
    this.latchTimeoutIfExpired(now);
    if (this.requiredLogicalRequestIds.has(id)) {
      throw new Error(`[qa-assets] '${id}' is already a required logical request`);
    }
    const wasKnown = this.plannedChildRequestIds.has(id);
    this.plannedChildRequestIds.add(id);
    if (!wasKnown) this.resetStability();
  }

  start(id: string): void {
    const now = this.now();
    this.latchTimeoutIfExpired(now);
    const wasKnown = this.requested.has(id);
    this.requested.add(id);
    if (!this.isPlannedRequest(id)) this.unexpectedRequestIds.add(id);
    if (!this.completed.has(id) && !this.failures.has(id)) this.pending.add(id);
    if (!wasKnown) this.resetStability();
  }

  complete(id: string): void {
    const now = this.now();
    this.latchTimeoutIfExpired(now);
    if (!this.requested.has(id)) {
      this.requested.add(id);
      this.unexpectedRequestIds.add(id);
    }
    const wasPending = this.pending.delete(id);
    const wasCompleted = this.completed.has(id);
    this.completed.add(id);
    if (wasPending || !wasCompleted) this.resetStability();
  }

  fail(id: string, error: unknown): void {
    const now = this.now();
    this.latchTimeoutIfExpired(now);
    if (!this.requested.has(id)) {
      this.requested.add(id);
      this.unexpectedRequestIds.add(id);
    }
    const wasPending = this.pending.delete(id);
    const previousFailure = this.failures.get(id);
    this.failures.set(id, failureMessage(error));
    if (wasPending || previousFailure !== this.failures.get(id)) this.resetStability();
  }

  async track<T>(id: string, request: Promise<T>): Promise<T> {
    this.start(id);
    try {
      const result = await request;
      this.complete(id);
      return result;
    } catch (error) {
      this.fail(id, error);
      throw error;
    }
  }

  addResolvedTextures(entries: readonly QaResolvedTexture[]): void {
    this.latchTimeoutIfExpired(this.now());
    for (const entry of entries) {
      this.resolvedTextures.set(`${entry.kind}:${entry.materialId}`, {
        ...entry,
        urls: [...entry.urls],
      });
    }
  }

  recordRenderedFrame(textureCount: number): void {
    const now = this.now();
    this.latchTimeoutIfExpired(now);
    this.textureCount = textureCount;
    const resourceState = `${this.resourceSignature()}|textures:${textureCount}`;
    if (resourceState !== this.lastResourceState) {
      this.lastResourceState = resourceState;
      this.stableSinceMs = now;
      this.stableFrameCount = 1;
      return;
    }
    this.stableFrameCount += 1;
  }

  state(): QaCaptureState {
    const now = this.now();
    const stableForMs = this.stableSinceMs === null ? 0 : Math.max(0, now - this.stableSinceMs);
    this.latchTimeoutIfExpired(now);
    const observedPlanHash = this.observedPlanHash();
    const ready = !this.timeoutLatched && this.isReadyWithoutTimeout(stableForMs);
    if (ready && this.readyAtMs === null) this.readyAtMs = now;
    if (!ready) this.readyAtMs = null;
    const failed = [...this.failures.entries()]
      .map(([id, message]) => ({ id, message }))
      .sort((left, right) => left.id.localeCompare(right.id));
    return {
      schemaVersion: 1,
      profile: this.plan.profile,
      planHash: this.plan.hash,
      observedPlanHash,
      plannedChildRequests: [...this.plannedChildRequestIds]
        .sort((left, right) => left.localeCompare(right)),
      observedChildRequests: [...this.requested]
        .filter((id) => this.plannedChildRequestIds.has(id))
        .sort((left, right) => left.localeCompare(right)),
      unexpectedRequests: [...this.unexpectedRequestIds]
        .sort((left, right) => left.localeCompare(right)),
      pending: [...this.pending].sort((left, right) => left.localeCompare(right)),
      failed,
      totalRequests: this.requested.size,
      requestedCount: this.requested.size,
      completedCount: this.completed.size,
      resolvedTextures: [...this.resolvedTextures.values()]
        .sort((left, right) => (
          left.kind.localeCompare(right.kind)
          || left.materialId.localeCompare(right.materialId)
        )),
      textureCount: this.textureCount,
      stableFrameCount: this.stableFrameCount,
      stableForMs,
      startedAtMs: this.startedAtMs,
      lastResourceChangeAtMs: this.stableSinceMs,
      readyAtMs: this.readyAtMs,
      ready,
      timedOut: this.timeoutLatched,
      timeoutMs: this.timeoutMs,
    };
  }

  private isReadyWithoutTimeout(stableForMs: number): boolean {
    return this.pending.size === 0
      && this.failures.size === 0
      && this.unexpectedRequestIds.size === 0
      && this.hasCompleteLogicalCoverage()
      && this.hasCompleteChildCoverage()
      && this.observedPlanHash() === this.plan.hash
      && this.stableFrameCount >= 8
      && stableForMs >= 500;
  }

  private completedRequiredLogicalRequestIds(): string[] {
    return [...this.requiredLogicalRequestIds].filter((id) => (
      this.requested.has(id) && this.completed.has(id)
    ));
  }

  private hasCompleteLogicalCoverage(): boolean {
    if (this.requiredLogicalRequestIds.size === 0) return true;
    return this.completedRequiredLogicalRequestIds().length === this.requiredLogicalRequestIds.size;
  }

  private hasCompleteChildCoverage(): boolean {
    return [...this.plannedChildRequestIds].every((id) => (
      this.requested.has(id) && this.completed.has(id)
    ));
  }

  private isPlannedRequest(id: string): boolean {
    return this.requiredLogicalRequestIds.has(id) || this.plannedChildRequestIds.has(id);
  }

  private observedPlanHash(): string {
    return hashQaAssetRequestIds(
      this.plan.profile,
      this.completedRequiredLogicalRequestIds(),
    );
  }

  private latchTimeoutIfExpired(now: number): void {
    if (this.timeoutLatched || now - this.startedAtMs < this.timeoutMs) return;
    const stableForMs = this.stableSinceMs === null ? 0 : Math.max(0, now - this.stableSinceMs);
    if (!this.isReadyWithoutTimeout(stableForMs)) this.timeoutLatched = true;
  }

  private resetStability(): void {
    this.lastResourceState = null;
    this.stableSinceMs = null;
    this.stableFrameCount = 0;
    this.readyAtMs = null;
  }
}

export async function preloadQaDirectTextures(
  plan: QaAssetPlan,
  tracker: QaAssetReadinessTracker,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await Promise.all(plan.directTextureUrls.map(async (url) => {
    await tracker.track(
      qaDirectTextureRequestId(url),
      fetchImpl(url).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch direct texture (${response.status} ${response.statusText})`);
        }
        await response.arrayBuffer();
      }),
    );
  }));
}
