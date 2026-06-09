# Provider Plugin Contract

> **KOS-F3** — how to add or swap providers without touching domain/agent code.  
> Manifest source of truth: `src/providers/providerManifest.ts`.

## Principles

1. **Business logic depends on interfaces**, never vendor SDKs directly.
2. **Mock-first**: every adapter ships a deterministic mock; live HTTP is opt-in.
3. **Failure recovery at the factory boundary**: missing API keys throw `ProviderConfigError` (`MISSING_API_KEY`); app aggregation catches and falls back to mock with an explicit warning — demo paths must not land in `phase=error`.
4. **Memory boundary**: `MemoryProvider.remember` stores distilled text only; providers must not write graph/profile/learning/action stores.

## Provider interface table

| Provider | Interface | Core methods | Mock must implement |
|---|---|---|---|
| Voice | `VoiceProvider` (`src/providers/voice/types.ts`) | `connect`, `disconnect`, `interrupt`, `speak`, `setVoice`, `getVoice`, transcript/state listeners | ✓ |
| LLM | `LlmProvider` (`src/providers/llm/types.ts`) | `summarizeNews`, `explainConcept`, `proposeGraphMutations`, `distillUserProfile`, `planResearch`, `synthesizeConcepts` | ✓ |
| News / World | `NewsSource` (`src/providers/news/types.ts`) + radar `WorldSource` adapters | `fetchLatest` → `NewsFetchResult` / `fetchWorldItems` → `WorldItem[]` | ✓ |
| Memory | `MemoryProvider` (`src/providers/memory/types.ts`) | `remember`, `recall`, `health` | ✓ |

Adapter-level LLM helpers (for domestic/live skeletons) may also expose:

```typescript
interface LlmTextResponse {
  text: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}
```

- `complete(prompt)` → `LlmTextResponse`
- `summarize(sourceText)` → `LlmTextResponse`

## Environment configuration

| Variable | Purpose | Required when |
|---|---|---|
| `VITE_LLM_PROVIDER` | `mock` (default), `openai`, `domestic-mock` | Always (defaults to mock) |
| `VITE_OPENAI_API_KEY` | OpenAI voice + LLM | `VITE_LLM_PROVIDER=openai` or realtime voice |
| `VITE_DOMESTIC_LLM_API_KEY` | Domestic adapter (logical: `DOMESTIC_LLM_API_KEY`) | `VITE_LLM_PROVIDER=domestic-mock` |
| `VITE_DOMESTIC_LLM_BASE_URL` | Optional base URL (logical: `DOMESTIC_LLM_BASE_URL`) | Optional |
| `VITE_MEMORY_PROVIDER` | `mock` / `evermemos` | Memory sidecar opt-in |
| `VITE_VOICE_PROVIDER` | `mock` / `openai-realtime` | Realtime voice opt-in |

Placeholders live in `.env.example` — **never commit real secrets**.

## Mock parity

Harness input: `buildTeachingTurn("demo-rag", profileWithHeardLevel)` from `src/conversation/teachingDepth.ts`.

Assertions:

- `mockLlmProvider` and `domesticMockLlmProvider` both yield non-empty text for the same teaching prompt.
- Adapter `complete` / `summarize` responses match `MOCK_LLM_RESPONSE_SHAPE` (`{ text: string; usage?: ... }`).
- Voice/news/memory manifest `mockImpl()` factories return objects with the expected interface surface (id, core methods).

## Failure recovery

| Failure | Factory layer | Aggregation layer (`resolveLlmProviderWithFallback`) |
|---|---|---|
| `MISSING_API_KEY` | `createDomesticLlmProvider` throws `ProviderConfigError` | Warn + fallback `mockLlmProvider` |
| OpenAI mode without `VITE_OPENAI_API_KEY` | N/A (OpenAI provider throws on call) | Warn + fallback `mockLlmProvider` |
| Unknown manifest id | N/A | Default mock registry |
| Live request timeout (future) | Adapter-specific | Retry 0 → mock stub in demo |

## domestic-mock {#domestic-mock}

Example manifest entry:

```typescript
{
  id: "domestic-mock-llm",
  kind: "llm",
  envKeys: ["DOMESTIC_LLM_API_KEY", "DOMESTIC_LLM_BASE_URL"],
  mockImpl: domesticMockLlmProvider,
  docs: "docs/providers/PROVIDER_PLUGIN_CONTRACT.md#domestic-mock",
}
```

Implementation: `src/providers/llm/domesticMockLlmProvider.ts`

- Pure mock — no HTTP, no vendor SDK.
- `createDomesticLlmProvider({ apiKey, baseUrl? })` validates key at construction.
- Registered parity instance uses a harness-only test key.

## How to add a new adapter

1. Define config + `ProviderConfigError` guards in `src/providers/<kind>/`.
2. Implement the interface (`LlmProvider`, etc.) with a mock-first class.
3. Register in `PROVIDER_PLUGIN_REGISTRY` with `id`, `kind`, `envKeys`, `mockImpl`, optional `liveImpl`, `docs`.
4. Wire env reading in `src/lib/env.ts` and mode switch in `src/lib/*ProviderMode.ts` if needed.
5. Add parity + recovery tests under `src/providers/__tests__/`.
6. Extend `.env.example` with placeholders only.
7. Run `pnpm test -- mockParity domesticMockLlmProvider providerConfigRecovery` and `pnpm check`.

## Boundaries (do not break)

- **No graph writes from providers** — graph mutations flow through user-confirmed ingest + auto-curate only.
- **No domain/agent vendor imports** — SDKs stay under `src/providers/**`.
- **No secrets in repo** — use env placeholders.
