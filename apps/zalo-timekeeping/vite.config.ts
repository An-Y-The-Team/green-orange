import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Per Zalo's convert-web-app guide: relative base + .module.js chunk names so
// the bundle loads from Zalo's hosting, output to www/ (what `zmp deploy`
// expects when pointed at an existing project's build folder).
//
// Asset names are deliberately unhashed: on Zalo the platform serves its own
// index.html and loads whatever app-config.json lists, so a hash in the
// filename would mean editing app-config.json after every build.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "www",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].module.js",
        chunkFileNames: "assets/[name].module.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
