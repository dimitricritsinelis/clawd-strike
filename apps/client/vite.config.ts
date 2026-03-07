import { defineConfig } from "vite";
import { createSharedChampionDevPlugin } from "../../server/highScoreVitePlugin";

export default defineConfig({
  plugins: [createSharedChampionDevPlugin()],
  server: {
    port: 5174,
    strictPort: true
  },
  build: {
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
