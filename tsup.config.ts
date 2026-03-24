import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  sourcemap: true,
  clean: true,
  bundle: true,
  outDir: "dist",
  banner: {
    js: "#!/usr/bin/env node"
  }
});
