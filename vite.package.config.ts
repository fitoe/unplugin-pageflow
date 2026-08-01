import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";

export default defineConfig({
  base: "./",
  plugins: [vue(), ui()],
  worker: { format: "es" },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./src/client/mount.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "client/mount.js",
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["vue-router"],
    },
  },
});
