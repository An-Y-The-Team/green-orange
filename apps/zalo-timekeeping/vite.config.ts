import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Per Zalo's convert-web-app guide: relative base + .module.js chunk names so
// the bundle loads from Zalo's hosting, output to www/ (what `zmp deploy`
// expects when pointed at an existing project's build folder).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "www",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].module.js",
        chunkFileNames: "assets/[name].[hash].module.js",
      },
    },
  },
});
