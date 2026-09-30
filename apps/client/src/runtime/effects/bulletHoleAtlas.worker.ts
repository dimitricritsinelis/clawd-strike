import { generateBulletHoleAtlas } from "./bulletHoleAtlas";

// Builds the bullet-hole atlas off the main thread (~150-350 ms of pixel work)
// so boot and the first shots never stall on it.
self.onmessage = (event: MessageEvent<{ seed: number }>) => {
  const atlas = generateBulletHoleAtlas(event.data.seed);
  self.postMessage(atlas, {
    transfer: [atlas.albedo.buffer, atlas.normalHeight.buffer, atlas.surface.buffer],
  });
};
