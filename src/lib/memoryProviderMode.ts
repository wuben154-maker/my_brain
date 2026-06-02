export type MemoryProviderMode = "mock" | "evermemos";

export function readMemoryProviderMode(): MemoryProviderMode {
  const raw = import.meta.env.VITE_MEMORY_PROVIDER;
  return raw === "evermemos" ? "evermemos" : "mock";
}
