import { readMemoryProviderMode } from "@/lib/memoryProviderMode";
import {
  createEverMemOsProvider,
} from "./everMemOsProvider";
import { createMockMemoryProvider } from "./mockMemoryProvider";
import type { MemoryProvider } from "./types";

export type { MemoryItem, MemoryProvider, RecallQuery, RecalledMemory } from "./types";
export { MockMemoryProvider, createMockMemoryProvider } from "./mockMemoryProvider";
export { EverMemOsProvider, createEverMemOsProvider } from "./everMemOsProvider";

export interface MemoryProviderEnv {
  everMemOsBaseUrl?: string;
  everMemOsApiKey?: string;
  everMemOsUserId?: string;
}

export function createMemoryProvider(env: MemoryProviderEnv = {}): MemoryProvider {
  if (readMemoryProviderMode() === "evermemos") {
    return createEverMemOsProvider({
      baseUrl: env.everMemOsBaseUrl ?? "http://localhost:1995",
      apiKey: env.everMemOsApiKey,
      userId: env.everMemOsUserId ?? "my_brain_local",
    });
  }
  return createMockMemoryProvider();
}
