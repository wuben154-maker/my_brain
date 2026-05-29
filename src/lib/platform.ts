/** Detect Tauri webview vs standalone browser for dual-target builds. */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
