import { FloorMaterialLibrary } from "./render/materials/FloorMaterialLibrary";
import { preloadEnemyVisualAssets } from "./enemies/EnemyVisual";
import { isMobileDevice } from "./input/MobileDetect";
import { loadMap } from "./map/spec/loadMap";
import type { RuntimeMapAssets } from "./map/spec/types";
import { WallMaterialLibrary } from "./render/materials/WallMaterialLibrary";
import { parseRuntimeUrlParams } from "./utils/UrlParams";
import { createAk47ViewModel, type WeaponViewModel } from "./weapons/Ak47AnimatedViewModel";
import { plannedFloorMaterialIds, plannedWallMaterialIds, resolveQaAssetProfile } from "./qa/assetReadiness";
import { FLOOR_MANIFEST_URL, WALL_MANIFEST_URL } from "./assetManifests";
import { waitForWarmupBeforeDeadline } from "./bootstrap/warmupDeadline";

// Bound speculative prefetch; bootstrap still owns required asset loading.
const RUNTIME_WARMUP_TIMEOUT_MS = 20_000;

export type RuntimeWarmupAssets = {
  mapAssets: RuntimeMapAssets | null;
  floorMaterials: FloorMaterialLibrary | null;
  wallMaterials: WallMaterialLibrary | null;
  viewModel: WeaponViewModel | null;
  enemyVisualsReady: boolean;
  timedOut: boolean;
};

function createEmptyWarmupAssets(timedOut: boolean): RuntimeWarmupAssets {
  return {
    mapAssets: null,
    floorMaterials: null,
    wallMaterials: null,
    viewModel: null,
    enemyVisualsReady: false,
    timedOut,
  };
}

async function performWarmup(search: string): Promise<RuntimeWarmupAssets> {
  const parsed = parseRuntimeUrlParams(search);
  // Map-review runs build a dependency plan only after the compiled map is
  // available. Starting broad gameplay warmup here would defeat that plan and
  // reintroduce enemy/viewmodel failure modes into deterministic captures.
  if (resolveQaAssetProfile(search) !== null) {
    return createEmptyWarmupAssets(false);
  }
  let mapAssets: RuntimeMapAssets | null = null;
  let floorMaterials: FloorMaterialLibrary | null = null;
  let wallMaterials: WallMaterialLibrary | null = null;
  let viewModel: WeaponViewModel | null = null;
  let enemyVisualsReady = false;
  const warmupTasks: Promise<void>[] = [];

  // The map decides which floor and wall materials to preload; bootstrap reuses
  // it. On failure bootstrap loads it again and reports the error.
  const mapLoad = loadMap(parsed.mapId);
  warmupTasks.push(mapLoad.then((assets) => {
    mapAssets = assets;
  }, () => undefined));

  // Mobile always renders blockout floors and walls.
  if (parsed.floorMode === "pbr" && !isMobileDevice()) {
    warmupTasks.push((async () => {
      try {
        floorMaterials = await FloorMaterialLibrary.load(FLOOR_MANIFEST_URL);
        await floorMaterials.preloadAllTextures(parsed.floorQuality, {
          materialIds: new Set(plannedFloorMaterialIds(await mapLoad)),
        });
      } catch (error) {
        floorMaterials = null;
        console.warn(
          `[runtime:warmup] failed to preload floor textures: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })());
  }

  if (parsed.wallMode === "pbr" && !isMobileDevice()) {
    warmupTasks.push((async () => {
      try {
        const wallQuality = parsed.floorQuality === "1k" ? "1k" : "2k";
        wallMaterials = await WallMaterialLibrary.load(WALL_MANIFEST_URL);
        await wallMaterials.preloadAllTextures(wallQuality, {
          materialIds: new Set(plannedWallMaterialIds(await mapLoad)),
        });
      } catch (error) {
        wallMaterials = null;
        console.warn(
          `[runtime:warmup] failed to preload wall textures: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })());
  }

  if (parsed.vm) {
    warmupTasks.push((async () => {
      let warmedViewModel: WeaponViewModel | null = null;
      try {
        warmedViewModel = createAk47ViewModel();
        await warmedViewModel.load();
        viewModel = warmedViewModel;
        warmedViewModel = null;
      } catch (error) {
        warmedViewModel?.dispose();
        viewModel = null;
        console.warn(
          `[runtime:warmup] failed to preload AK viewmodel: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })());
  }

  warmupTasks.push((async () => {
    try {
      await preloadEnemyVisualAssets();
      enemyVisualsReady = true;
    } catch (error) {
      enemyVisualsReady = false;
      console.warn(
        `[runtime:warmup] failed to preload enemy visuals: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  })());

  await Promise.all(warmupTasks);

  return {
    mapAssets,
    floorMaterials,
    wallMaterials,
    viewModel,
    enemyVisualsReady,
    timedOut: false,
  };
}

export async function warmupRuntimeAssets(): Promise<RuntimeWarmupAssets> {
  const timeoutResult = await waitForWarmupBeforeDeadline(
    performWarmup(window.location.search),
    RUNTIME_WARMUP_TIMEOUT_MS,
    (assets) => {
      // Bootstrap has already taken the fallback path and will load its own
      // weapon. The late speculative model has no owner. Floor/wall textures
      // and enemy templates use shared caches that bootstrap still reuses.
      assets.viewModel?.dispose();
    },
  );

  if (timeoutResult === null) {
    console.warn(`[runtime:warmup] timed out after ${RUNTIME_WARMUP_TIMEOUT_MS}ms; continuing runtime startup`);
    return createEmptyWarmupAssets(true);
  }

  return timeoutResult;
}
