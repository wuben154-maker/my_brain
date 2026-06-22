import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@my-brain/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "react-native": fileURLToPath(new URL("./apps/mobile/test/reactNativeMock.ts", import.meta.url)),
      "@edkimmel/expo-audio-stream": fileURLToPath(
        new URL("./apps/mobile/test/expoAudioStreamMock.ts", import.meta.url),
      ),
      "expo-av": fileURLToPath(new URL("./apps/mobile/test/expoAvMock.ts", import.meta.url)),
      "expo-speech": fileURLToPath(new URL("./apps/mobile/test/expoSpeechMock.ts", import.meta.url)),
      "react-native-tts": fileURLToPath(
        new URL("./apps/mobile/test/reactNativeTtsMock.ts", import.meta.url),
      ),
      "@react-native-voice/voice": fileURLToPath(
        new URL("./apps/mobile/test/reactNativeVoiceMock.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Windows dev machines OOM on default parallel forks; serial workers keep pnpm check reliable.
    maxWorkers: 1,
    // Let happy-dom / sqlite teardown finish so vitest can print summary and exit.
    teardownTimeout: 15_000,
    // Surface long CLI smokes (export-graph spawns Vite per case) without hiding failures.
    slowTestThreshold: 30_000,
    reporters: process.env.CI ? ["dot"] : ["default"],
    setupFiles: [fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))],
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.e2e.test.ts",
      "packages/core/**/*.test.ts",
      "apps/mobile/**/*.test.ts",
      "apps/mobile/**/*.test.tsx",
      "tools/mobile-execution/**/*.test.ts",
      "tools/app-ui-execution/**/*.test.ts",
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
