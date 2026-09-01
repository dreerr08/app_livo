import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/__tests__/setup.ts"],
    fileParallelism: false,
    hookTimeout: 20000,
  },
});
