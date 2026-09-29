import { FloorMaterialLibrary } from "../render/materials/FloorMaterialLibrary";
import { WallMaterialLibrary } from "../render/materials/WallMaterialLibrary";
import { PropModelLibrary } from "../render/models/PropModelLibrary";
import { FACADE_MANIFEST_URL, FLOOR_MANIFEST_URL, PROP_MANIFEST_URL, WALL_MANIFEST_URL } from "../assetManifests";
import { plannedFloorMaterialIds, plannedPropModelIds, plannedWallMaterialIds,
  qaFloorMaterialRequestId, qaPropModelRequestId, qaWallMaterialRequestId,
  type QaAssetPlan, type QaAssetReadinessTracker } from "../qa/assetReadiness";
import type { RuntimeMapAssets } from "../map/spec/types";
import type { RuntimeWarmupAssets } from "../warmup";
import type { RuntimeFloorQuality, RuntimeUrlParams } from "../utils/UrlParams";

export async function loadRuntimeMaterials({
  runtimeParams, performanceSafeFallback, mobile, warmupAssets, mapAssets,
  qaAssetPlan, qaAssetTracker, effectiveFloorQuality, appendWarning,
}: {
  runtimeParams: RuntimeUrlParams;
  performanceSafeFallback: boolean;
  mobile: boolean;
  warmupAssets: RuntimeWarmupAssets | null;
  mapAssets: RuntimeMapAssets | null;
  qaAssetPlan: QaAssetPlan | null;
  qaAssetTracker: QaAssetReadinessTracker | null;
  effectiveFloorQuality: RuntimeFloorQuality;
  appendWarning: (message: string) => void;
}) {
  let resolvedFloorMode = runtimeParams.floorMode;
  if (performanceSafeFallback || mobile) {
    resolvedFloorMode = "blockout";
  }
  let floorMaterials: FloorMaterialLibrary | null = null;
  const qaFloorRequestIds = qaAssetPlan?.floorMaterialIds.map(qaFloorMaterialRequestId) ?? [];
  if (resolvedFloorMode === "pbr") {
    try {
      if (qaAssetTracker && qaAssetPlan) {
        for (const requestId of qaFloorRequestIds) qaAssetTracker.start(requestId);
        const floorIds = new Set(qaAssetPlan.floorMaterialIds);
        floorMaterials = await FloorMaterialLibrary.load(FLOOR_MANIFEST_URL, {
          materialIds: floorIds,
          requestObserver: qaAssetTracker.observer,
        });
        const resolutions = await floorMaterials.preloadAllTextures(effectiveFloorQuality, {
          materialIds: floorIds,
          allowUpscale: false,
          requestObserver: qaAssetTracker.observer,
        });
        qaAssetTracker.addResolvedTextures(resolutions.map((resolution) => ({
          kind: "floor",
          materialId: resolution.materialId,
          requestedTier: resolution.requestedQuality,
          resolvedTier: resolution.resolvedQuality,
          urls: resolution.urls,
        })));
        for (const requestId of qaFloorRequestIds) qaAssetTracker.complete(requestId);
      } else {
        floorMaterials = warmupAssets?.floorMaterials ?? await FloorMaterialLibrary.load(FLOOR_MANIFEST_URL);
        await floorMaterials.preloadAllTextures(effectiveFloorQuality, {
          materialIds: new Set(mapAssets ? plannedFloorMaterialIds(mapAssets) : []),
        });
      }
    } catch (error) {
      if (qaAssetTracker) {
        for (const requestId of qaFloorRequestIds) qaAssetTracker.fail(requestId, error);
        qaAssetTracker.fail("floor-material-pack", error);
        throw new Error(
          `[qa-assets] floor material pack failed; capture is blocked: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      floorMaterials = null;
      resolvedFloorMode = "blockout";
      appendWarning(
        `Failed to load floor PBR pack. Falling back to blockout floors.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let resolvedWallMode = runtimeParams.wallMode;
  if (performanceSafeFallback || mobile) {
    resolvedWallMode = "blockout";
  }
  let wallMaterials: WallMaterialLibrary | null = null;
  const qaWallRequestIds = qaAssetPlan?.wallMaterialIds.map(qaWallMaterialRequestId) ?? [];
  if (resolvedWallMode === "pbr") {
    try {
      const wallQuality = effectiveFloorQuality === "1k" ? "1k" : "2k";
      if (qaAssetTracker && qaAssetPlan) {
        for (const requestId of qaWallRequestIds) qaAssetTracker.start(requestId);
        const wallIds = new Set(qaAssetPlan.wallMaterialIds);
        wallMaterials = await WallMaterialLibrary.load(WALL_MANIFEST_URL, {
          materialIds: wallIds,
          requestObserver: qaAssetTracker.observer,
        });
        const resolutions = await wallMaterials.preloadAllTextures(wallQuality, {
          materialIds: wallIds,
          allowUpscale: false,
          requestObserver: qaAssetTracker.observer,
        });
        qaAssetTracker.addResolvedTextures(resolutions.map((resolution) => ({
          kind: "wall",
          materialId: resolution.materialId,
          requestedTier: resolution.requestedQuality,
          resolvedTier: resolution.resolvedQuality,
          urls: resolution.urls,
        })));
        for (const requestId of qaWallRequestIds) qaAssetTracker.complete(requestId);
      } else {
        wallMaterials = warmupAssets?.wallMaterials ?? await WallMaterialLibrary.load(WALL_MANIFEST_URL);
        await wallMaterials.preloadAllTextures(wallQuality, {
          materialIds: new Set(mapAssets ? plannedWallMaterialIds(mapAssets) : []),
        });
      }
    } catch (error) {
      if (qaAssetTracker) {
        for (const requestId of qaWallRequestIds) qaAssetTracker.fail(requestId, error);
        qaAssetTracker.fail("wall-material-pack", error);
        throw new Error(
          `[qa-assets] wall material pack failed; capture is blocked: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      wallMaterials = null;
      resolvedWallMode = "blockout";
      appendWarning(
        `Failed to load wall PBR pack. Falling back to blockout walls.\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let propModels: PropModelLibrary | null = null;
  const qaPropRequestIds = qaAssetPlan?.propModelIds.map(qaPropModelRequestId) ?? [];
  try {
    if (qaAssetTracker && qaAssetPlan) {
      for (const requestId of qaPropRequestIds) qaAssetTracker.start(requestId);
      propModels = await PropModelLibrary.load(PROP_MANIFEST_URL, {
        modelIds: new Set(qaAssetPlan.propModelIds),
        concurrency: 4,
        requestObserver: qaAssetTracker.observer,
      });
      for (const requestId of qaPropRequestIds) qaAssetTracker.complete(requestId);
    } else {
      // Mobile has never loaded the R8 wall-foot clutter models; buildR8Clutter
      // skips records whose model is absent.
      propModels = await PropModelLibrary.load(PROP_MANIFEST_URL, {
        modelIds: new Set(mapAssets ? plannedPropModelIds(mapAssets, !mobile) : []),
      });
    }
  } catch (error) {
    if (qaAssetTracker) {
      for (const requestId of qaPropRequestIds) qaAssetTracker.fail(requestId, error);
      qaAssetTracker.fail("prop-model-pack", error);
      throw new Error(
        `[qa-assets] prop model pack failed; capture is blocked: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    appendWarning(
      `Failed to load the CC0 bazaar prop pack. Final-mode map readiness will fail rather than render placeholders.\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Authored section and facade GLBs render every frontage. Loaded on every
  // profile (mobile included); without them the map falls back to flat
  // blockout walls. Collision never depends on these models.
  let facadeModels: PropModelLibrary | null = null;
  const facadeModelIds = new Set([
    ...(mapAssets?.blockout.sectionModels ?? []).map((section) => section.modelId),
    ...(mapAssets?.blockout.authoredPlacements ?? []).map((placement) => placement.modelId),
  ]);
  if (facadeModelIds.size > 0) {
    try {
      facadeModels = await PropModelLibrary.load(FACADE_MANIFEST_URL, {
        modelIds: facadeModelIds,
        concurrency: 4,
        ...(qaAssetTracker ? { requestObserver: qaAssetTracker.observer } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (qaAssetTracker) {
        throw new Error(`[qa-assets] facade model pack failed; capture is blocked: ${message}`);
      }
      console.error(`[runtime:boot] authored facade models failed to load; rendering flat blockout walls: ${message}`);
      appendWarning(`Failed to load the authored facade models. Falling back to flat blockout walls.\n${message}`);
      wallMaterials = null;
      resolvedWallMode = "blockout";
    }
  }
  return { resolvedFloorMode, resolvedWallMode, floorMaterials, wallMaterials, propModels, facadeModels };
}
