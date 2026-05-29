# AGENTS.md — my_brain

> Guidance for AI coding agents working in this repo. Keep it loaded. Read `PRODUCT.md` for full product spec.

## What we're building
A **voice-first, locally-stored AI companion** that helps the user follow AI news + GitHub trends and hand-builds a **self-updating "brain" knowledge graph**. The longer it's used, the better it knows the user. Sci-fi knowledge-graph UI + real-time voice.

## Status
**Scaffolded.** Tauri 2 + React 18 + Vite + Tailwind + Zustand skeleton is in place. Provider interfaces (`VoiceProvider`, `LLMProvider`, `NewsSource`) and dual-target storage (`better-sqlite3` web-dev / Tauri SQL desktop) are wired as stubs. Next: Realtime voice loop, cold-start onboarding, graph mutations with suggest-then-confirm.

---

## Tech stack (LOCKED for MVP)
- **Language:** TypeScript (strict) everywhere.
- **App shell:** Tauri 2 for desktop; same frontend also ships as a standalone web build. One React codebase, two targets.
- **Frontend:** React 18 + Vite + Tailwind CSS. State: Zustand.
- **Brain graph viz:** `react-force-graph` (force-directed, zoomable, supports layered/clustered rendering).
- **Voice core:** OpenAI **Realtime API** (speech-to-speech) — chosen because it handles **barge-in / interruption natively**, which is a hard MVP requirement. Must sit behind a `VoiceProvider` interface so it can be swapped.
- **LLM tasks** (news summarization, plain-language explanation, merge/archive/link suggestions, user-profile distillation): LLM API behind an `LLMProvider` interface.
- **Storage:** **Local-first.** SQLite (Tauri SQL plugin / `better-sqlite3` for web-dev). Plain text only — no audio/raw-article persistence.
- **News ingest:** pluggable `NewsSource` fetchers (RSS/authoritative feeds + GitHub trending by star velocity). Fetch on launch.

> No cloud backend in MVP. A cloud component (overnight pre-fetch + multi-device sync) is an explicit **later iteration**, so keep providers/sources cleanly abstracted to allow it.

---

## Core invariants (NEVER violate these)
These encode the product's soul. Breaking them breaks the product.

1. **Three memory layers, kept separate:**
   - Raw audio / full articles → **discarded after the conversation**.
   - Knowledge graph (concept + short intro + relations + source link) → **permanent**.
   - User profile (interests, what they know/don't, explanation prefs, habits) → **permanent, continuously grown**. Before discarding audio, distill user-profile signals into this layer.
2. **The user owns the brain.** Every AI resource is **asked one-by-one** ("入库?") before entering the knowledge base. Other categories are chat-only and **discarded** unless the user explicitly asks to save.
3. **Suggest-then-confirm for ANY graph mutation.** Merge, archive, delete, link, attach-to-concept → AI proposes, user approves. Never auto-mutate the graph.
4. **Delete = archive, not hard-delete.** Outdated nodes are hidden but recoverable. Edges of a replaced node **migrate** to the new node.
5. **Node = a concept + short intro** (not a news fragment). Multiple news items feed/update the same concept.
6. **Interruptible voice is mandatory** in MVP. The user can cut in mid-sentence and the assistant stops and listens.
7. **Local-first / privacy.** User data stays on the user's machine in MVP.

---

## MVP scope
**In:** launch self-check → fetch-on-launch with sci-fi loading → full voice loop (interruptible) → cold-start onboarding (name + fast persona preset + interest chat + light up the first node) → knowledge ops (merge / archive / edge-migration, all suggest-then-confirm) → layered/zoomable brain graph → manual node add/edit/delete → source links → user-profile layer → persona presets.

**Out (later):** cloud pre-fetch + multi-device sync, expanded relation types, cloud backup/export.

**Just be aware:** STT/TTS/LLM API cost; EN→ZH term handling (explain in Chinese, keep English technical terms).

---

## Conventions
- Strict TypeScript; no `any` without a written reason.
- Keep providers swappable: `VoiceProvider`, `LLMProvider`, `NewsSource` are interfaces with concrete impls behind them. Business logic depends on the interface, never the vendor SDK directly.
- UI language: Chinese (zh-CN). Code identifiers/comments: English.
- Comments explain **why**, not what.
- Conventional Commits. Don't commit secrets; API keys via env/`.env` (gitignored).
- Don't add dependencies casually; prefer the locked stack above.

## Commands
- `pnpm install` — install dependencies
- `pnpm dev` — web dev server (Vite, port 1420) with local SQLite via better-sqlite3
- `pnpm build` — production web build to `dist/`
- `pnpm preview` — preview production web build
- `pnpm tauri dev` — desktop app (requires [Rust + Tauri prerequisites](https://tauri.app/start/prerequisites/))
- `pnpm tauri build` — desktop production bundle
- `pnpm lint` — ESLint on `src/`
- `pnpm test` — Vitest unit tests

## Pointers
- `PRODUCT.md` — full agreed spec (mechanics, data flow, UI, cold start, memory model).
