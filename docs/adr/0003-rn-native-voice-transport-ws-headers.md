# ADR 0003 — RN Native Voice Transport & WebSocket Headers

- **Status:** accepted (M3 mock-first)
- **Context:** Volc/OpenAI Realtime requires WebSocket with custom headers (e.g. `Authorization`). React Native `WebSocket` cannot set arbitrary headers on iOS/Android; legacy Web Audio path is invalid for mobile.

## Decision

1. **No Web Audio / browser mic path on mobile.** Voice I/O uses RN-native recording/playback modules (M3: mock transport; native module stub documented for Dev Client).
2. **Realtime transport sits behind `VoiceRealtimeTransport` interface** (`apps/mobile/voice/mockRealtimeTransport.ts`). Production impl will use a thin native module wrapping platform WS client that supports headers.
3. **Header injection pattern:**
   - Exchange short-lived token from ADR 0002.
   - Pass `Authorization: Bearer <shortToken>` via native bridge, not JS `new WebSocket(url)`.
4. **Barge-in:** `interrupt()` cancels playback queue immediately and FSM → `interrupted` → `listening`. No buffered TTS after user speech detected.
5. **Audio session:** Android `AudioFocus` + iOS `AVAudioSession` category `playAndRecord` / `voiceChat` — simulated in `audioFocus.ts` / `audioSession.ts` for tests; native hooks in Dev Client follow same event names.

## M3 mock boundary

- `MockRealtimePlaybackQueue` simulates TTS chunks and barge-in without persisting raw audio or full transcripts.
- Claiming **live** Realtime requires native WS module + staging token exchange — not asserted in M3-GATE without device evidence.

## Consequences

- Desktop `src/providers/voice/*` Web paths remain legacy; mobile does not import them.
- M6 dual-device QA will validate native transport on dev/preview builds.
