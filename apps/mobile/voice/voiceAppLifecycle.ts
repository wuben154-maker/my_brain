import type { VoiceSessionController } from "./VoiceSession";

let activeVoiceController: VoiceSessionController | null = null;

export function registerActiveVoiceController(controller: VoiceSessionController | null): void {
  activeVoiceController = controller;
}

export function disconnectActiveVoiceSession(): void {
  activeVoiceController?.disconnect();
}
