import { defineConfig } from "vite";
import { createSharedChampionDevPlugin } from "../../server/highScoreVitePlugin";

export default defineConfig({
  plugins: [createSharedChampionDevPlugin()],
  server: {
    port: parseInt(process.env.PORT || "5174", 10),
    strictPort: true,
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
