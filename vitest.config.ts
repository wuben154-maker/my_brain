import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.e2e.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**",
        "src/agent/**",
        "src/domain/**",
        "src/stores/**",
        "src/storage/**",
      ],
      exclude: [
        "**/*.test.ts",
        "src/**/types.ts",
        "src/components/**",
        "src/dev/**",
      ],
      thresholds: { lines: 58, functions: 75, branches: 60, statements: 58 },
    },
  },
});
