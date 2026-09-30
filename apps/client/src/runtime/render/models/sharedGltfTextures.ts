import {
  DefaultLoadingManager,
  ImageBitmapLoader,
  LoadingManager,
  Source,
  Texture,
  TextureLoader,
} from "three";

// glTF images referenced by URL. Installed facade GLBs point every finish at a
// content-addressed file under facades/textures/, so one image is shared by
// dozens of models.
const IMAGE_URI = /\.(?:png|jpe?g|webp)(?:\?.*)?$/i;

const sourcesByUrl = new Map<string, Promise<Source<unknown>>>();

function prefersImageBitmap(): boolean {
  if (typeof createImageBitmap === "undefined" || typeof navigator === "undefined") return false;
  // Same gate as GLTFLoader: older Safari and Firefox mishandle ImageBitmap options.
  const userAgent = navigator.userAgent;
  const safari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const safariVersion = Number(userAgent.match(/Version\/(\d+)/)?.[1] ?? -1);
  const firefoxVersion = Number(userAgent.match(/Firefox\/(\d+)\./)?.[1] ?? -1);
  if (safari && safariVersion < 17) return false;
  if (userAgent.includes("Firefox") && firefoxVersion < 98) return false;
  return true;
}

function loadSource(requestedUrl: string): Promise<Source<unknown>> {
  // GLTFLoader joins the GLB's directory with "../textures/<file>", so each
  // area directory spells the same file differently.
  const url = typeof location === "undefined" ? requestedUrl : new URL(requestedUrl, location.href).href;
  let pending = sourcesByUrl.get(url);
  if (!pending) {
    pending = new Promise<Source<unknown>>((resolve, reject) => {
      const done = (image: unknown): void => {
        const source = new Source(image);
        source.needsUpdate = true;
        resolve(source);
      };
      if (prefersImageBitmap()) {
        // GLTFLoader's own defaults: no premultiply, orientation from the file.
        new ImageBitmapLoader(DefaultLoadingManager).load(url, done, undefined, reject);
      } else {
        new TextureLoader(DefaultLoadingManager).load(url, (texture) => done(texture.image), undefined, reject);
      }
    });
    pending.catch(() => sourcesByUrl.delete(url));
    sourcesByUrl.set(url, pending);
  }
  return pending;
}

/**
 * Hands GLTFLoader a new Texture per request that shares one decoded image.
 * three keys GPU uploads by Source and sampling parameters, so every model
 * using the same file and settings binds the same GL texture.
 */
class SharedImageTextureLoader {
  readonly isImageBitmapLoader = false;

  load(
    url: string,
    onLoad: (texture: Texture) => void,
    _onProgress?: unknown,
    onError?: (error: unknown) => void,
  ): void {
    loadSource(url).then((source) => {
      const texture = new Texture();
      texture.source = source;
      // Mark this texture for upload without re-uploading the shared source.
      texture.version += 1;
      onLoad(texture);
    }, (error) => onError?.(error));
  }
}

const sharedImageLoader = new SharedImageTextureLoader();

/**
 * Loading manager for GLTFLoader: routes glTF image URIs through the shared
 * cache and reports every item to the default manager, which the boot gate
 * watches.
 */
export function createSharedTextureLoadingManager(): LoadingManager {
  const manager = new LoadingManager();
  manager.itemStart = (url) => DefaultLoadingManager.itemStart(url);
  manager.itemEnd = (url) => DefaultLoadingManager.itemEnd(url);
  manager.itemError = (url) => DefaultLoadingManager.itemError(url);
  manager.addHandler(IMAGE_URI, sharedImageLoader as unknown as TextureLoader);
  return manager;
}
