import { defineConfig } from "vite";
import { createSharedChampionDevPlugin } from "../../server/highScoreVitePlugin";

export default defineConfig({
  plugins: [createSharedChampionDevPlugin()],
  server: {
    port: parseInt(process.env.PORT || "5174", 10),
    strictPort: true,
  },
  build: {
    // Content-hashed bundles go to /build/, keeping them out of /assets/, which
    // is the public folder's unhashed textures and models. That separation lets
    // the CDN cache hashed output as immutable for a year without also freezing
    // an unhashed texture that a later deploy replaces under the same URL.
    assetsDir: "build",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
