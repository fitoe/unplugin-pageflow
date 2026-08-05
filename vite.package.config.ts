import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";
import { resolvePageFlowVersion } from "./scripts/pageflow-version.mjs";

export default defineConfig({
  base: "./",
  define: { __PAGEFLOW_VERSION__: JSON.stringify(resolvePageFlowVersion()) },
  plugins: [vue(), ui({ dts: false, autoImport: false, components: false, colorMode: false, router: false })],
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
