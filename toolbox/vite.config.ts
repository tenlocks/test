import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// `base: "./"` keeps every asset URL relative, so the build works from any
// sub-path (e.g. a Tomcat webapp at /compute/toolbox/) without rebuilding.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@geolibre/map": path.resolve(import.meta.dirname, "src/shims/map.ts"),
    },
  },
  define: { __GEOLIBRE_MAS_BUILD__: "false", __NO_EXTERNAL_CDN__: "false" },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["geolibre-wasm"] },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
});
