import { vitePlugin as remix } from "@remix-run/dev";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default {
  plugins: [
    remix({
      appDirectory: "src/app",
    }),
    tsconfigPaths({ project: "./tsconfig.app.json" }),
  ],
  build: {
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src/app"),
      "@": path.resolve(__dirname, "./src/app"),
    },
  },
};
