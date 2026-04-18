import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Ensure legacy bundle + shell from `public/` are present in `dist/` (Flask serves them at /legacy-*). */
function legacyPublicPlugin() {
  return {
    name: "pegaprox-legacy-public-check",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      for (const f of ["legacy-app.js", "legacy-ui-shell.html"]) {
        const p = path.join(dist, f);
        if (!fs.existsSync(p)) {
          throw new Error(`Missing ${f} in dist — run pnpm run build:legacy before vite build`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), legacyPublicPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/static": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/images": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/favicon.ico": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/legacy-app.js": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/legacy-ui-shell.html": { target: "http://127.0.0.1:5000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
