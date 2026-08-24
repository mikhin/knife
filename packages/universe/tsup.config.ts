import { defineConfig } from "tsup";

/**
 * The browser reads this package through a bundler and would take the sources
 * as they are; the API is Node and cannot. Two formats, one entry: whoever
 * asks about a repeat runs the very same code.
 */
export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "es2023",
});
