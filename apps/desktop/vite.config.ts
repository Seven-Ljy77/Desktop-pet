import { fileURLToPath, URL } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const petImageDirectory = fileURLToPath(new URL("../../image", import.meta.url));

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      "@pet-image": petImageDirectory,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/target/**"],
    },
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), petImageDirectory],
    },
  },
});
