import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appHtmlPath = fileURLToPath(
  new URL("./AccessHub-Preview.html", import.meta.url),
);

export default defineConfig({
  publicDir: fileURLToPath(new URL("../extension/public", import.meta.url)),
  plugins: [
    {
      name: "accesshub-preview-entry",
      transformIndexHtml: {
        order: "pre",
        handler() {
          return readFileSync(appHtmlPath, "utf8");
        },
      },
    },
  ],
});
