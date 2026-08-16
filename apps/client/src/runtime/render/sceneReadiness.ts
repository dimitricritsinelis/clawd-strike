import {
  DefaultLoadingManager,
  type Material,
  type Mesh,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * Resolves once every load started through three's DefaultLoadingManager
 * (TextureLoader, GLTFLoader, …) has settled, or after timeoutMs. The manager
 * only fires onLoad when an active queue drains, so an idle queue is detected
 * by a short quiet window instead.
 */
export function waitForPendingAssetLoads(
  timeoutMs: number,
  quietMs = 400,
): Promise<"idle" | "timed-out"> {
  return new Promise((resolve) => {
    const manager = DefaultLoadingManager;
    const previousOnStart = manager.onStart;
    const previousOnLoad = manager.onLoad;
    const previousOnProgress = manager.onProgress;
    let quietTimerId = 0;
    let timeoutId = 0;
    // The manager's callbacks report cumulative itemsLoaded/itemsTotal.
    // onProgress only fires on item COMPLETION, so a single slow in-flight
    // load produces no events; once any callback has shown a gap, the quiet
    // timer must defer to onLoad instead of declaring idle.
    let knownPendingGap = false;
    const finish = (result: "idle" | "timed-out"): void => {
      window.clearTimeout(quietTimerId);
      window.clearTimeout(timeoutId);
      manager.onStart = previousOnStart;
      manager.onLoad = previousOnLoad;
      manager.onProgress = previousOnProgress;
      resolve(result);
    };
    const armQuietTimer = (): void => {
      window.clearTimeout(quietTimerId);
      quietTimerId = window.setTimeout(() => {
        if (knownPendingGap) {
          armQuietTimer();
          return;
        }
        finish("idle");
      }, quietMs);
    };
    manager.onStart = (url, itemsLoaded, itemsTotal) => {
      previousOnStart?.(url, itemsLoaded, itemsTotal);
      knownPendingGap = itemsLoaded < itemsTotal;
      armQuietTimer();
    };
    manager.onLoad = () => {
      previousOnLoad?.();
      finish("idle");
    };
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      previousOnProgress?.(url, itemsLoaded, itemsTotal);
      knownPendingGap = itemsLoaded < itemsTotal;
      armQuietTimer();
    };
    timeoutId = window.setTimeout(() => finish("timed-out"), timeoutMs);
    armQuietTimer();
  });
}

/**
 * Collects every texture referenced by materials in the scene plus the scene
 * environment/background. Render-target textures are excluded — they are
 * GPU-resident already and must not be re-initialised.
 */
export function collectSceneTextures(scene: Scene): Texture[] {
  const found = new Set<Texture>();
  const visit = (value: unknown): void => {
    const texture = value as Texture | null | undefined;
    if (texture?.isTexture && !texture.isRenderTargetTexture) found.add(texture);
  };
  scene.traverse((object) => {
    const material = (object as Mesh).material as Material | Material[] | undefined;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const mat of materials) {
      for (const value of Object.values(mat)) visit(value);
    }
  });
  visit(scene.environment);
  visit(scene.background);
  return [...found];
}

/**
 * Uploads textures to the GPU in small per-frame batches so a loading overlay
 * stays responsive while the whole set is initialised. Returns the number of
 * textures uploaded.
 */
export async function uploadTexturesInBatches(
  renderer: WebGLRenderer,
  textures: readonly Texture[],
  texturesPerFrame = 12,
  budgetMs = 6_000,
): Promise<number> {
  // Every other stage of the boot gate is deadline-bounded; without this one
  // the click-to-play wait grows with the map's texture count and nothing stops
  // it. Whatever is left over simply uploads lazily on the first frames, which
  // is exactly the old behaviour rather than a new failure.
  const startedAt = performance.now();
  let uploaded = 0;
  for (let index = 0; index < textures.length; index += texturesPerFrame) {
    if (performance.now() - startedAt > budgetMs) break;
    const batch = textures.slice(index, index + texturesPerFrame);
    for (const texture of batch) {
      try {
        renderer.initTexture(texture);
        uploaded += 1;
      } catch {
        // A single bad texture must not block the boot gate.
      }
    }
    if (index + texturesPerFrame < textures.length) {
      // rAF keeps the overlay animating between batches, but it never fires in
      // hidden tabs — race a timeout so a backgrounded boot cannot hang here.
      await new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(resolve, 100);
        requestAnimationFrame(() => {
          window.clearTimeout(timeoutId);
          resolve();
        });
      });
    }
  }
  return uploaded;
}
