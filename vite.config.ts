import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import { existsSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

/** Generates public/wallpapers.json listing all image files in public/wallpapers/ */
const wallpapersManifestPlugin = {
  name: "wallpapers-manifest",
  buildStart() {
    const dir = resolve("public/wallpapers");
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => IMAGE_EXT.test(f))
          .sort()
      : [];
    writeFileSync(resolve("public/wallpapers.json"), JSON.stringify(files));
  },
};

export default defineConfig({
  plugins: [
    wallpapersManifestPlugin,
    react(),
    webExtension({
      manifest: "manifest.json",
      webExtConfig: {
        target: "chromium",
        startUrl: ["chrome://newtab/"],
      },
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: false,
  },
});
