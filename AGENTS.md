# AGENTS.md — my_brain

> Guidance for AI coding agents working in this repo. Keep it loaded. **New session / new window:** read `docs/handbook/PROJECT_HANDBOOK.md` first, then `PRODUCT.md` for full product spec.

## What we're building
A **voice-first, locally-stored AI companion** that helps the user follow AI news + GitHub trends and hand-builds a **self-updating "brain" knowledge graph**. The longer it's used, the better it knows the user. Sci-fi knowledge-graph UI + real-time voice.

## Status
**v2 大换血进行中（沉浸式语音伴侣）.** spec 级功能（A/B/C/M/N/G/H 系列）已宽覆盖且 mock 可演示。v2 正把形态从「多分区仪表盘 + 逐条审批」重做为「**全屏星图 + 语音光球的沉浸式伴侣**」，落地工作单见 `specs/V*.md`。底层 provider/domain/storage/lib/agent 逻辑大量复用；旧 A/B/C/N/G spec 标 `superseded`。**仍是 mock-first，验收期才接真 API key。**

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
These encode the product's soul. Breaking them breaks the product. **v2 改写了 #2/#3/#6**（见标注）。

1. **Three memory layers, kept separate:**
 - Raw audio / full articles → **discarded after the conversation**.
 - Knowledge graph (concept + short intro + relations + source link) → **permanent**.
 - User profile (interests, what they know/don't, explanation prefs, habits) → **permanent, continuously grown**. Before discarding audio, distill user-profile signals into this layer. **v2：画像蒸馏静默执行，无需用户确认。**
2. **入库 = 用户决定（保留）.** 每条 AI 资源在进入知识库前**逐条语音确认**（"入/不要/讲细点"）。其他类目仅聊天、聊完即丢，除非用户主动要求保存。
3. **【v2 改写】入库后的图谱结构整理 = AI 自动执行，不再要确认.** Merge / archive / link / attach / edge-migrate 由 AI 在入库后**自动完成**。兜底三件套：**① 归档=隐藏不真删；② 每次结构变更进变更历史且可一键撤销；③ 偶尔语音口头汇报**。（注意：**新建概念节点仍受 #2 用户确认门控**；自动的只是"入库之后的整理"。）
4. **Delete = archive, not hard-delete.** Outdated nodes are hidden but recoverable. Edges of a replaced node **migrate** to the new node.
5. **Node = a concept + short intro** (not a news fragment). Multiple news items feed/update the same concept.
6. **【v2 改写】Interruptible voice is mandatory.** 用户可随时打断、助手立即停说转听。**Agent/curation 层现拥有"整理类"图谱写能力（merge/archive/link，自动执行）**，但**新建节点仍只能经"用户语音确认入库"出口**；**记忆引擎仍绝不写图谱/画像**（见 §memory-boundary）。
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
- `pnpm visual:browser` — Playwright Chromium for screenshot regression
- `pnpm visual:loop` / `pnpm visual:loop --watch` — capture app, pixel-compare vs `assets/*.png`, iterate (see `docs/VISUAL_FEEDBACK.md`)
- `pnpm dev` — web dev server (Vite, port 1420) with local SQLite via better-sqlite3
- `pnpm build` — production web build to `dist/`
- `pnpm preview` — preview production web build
- `pnpm tauri dev` — desktop app (requires [Rust + Tauri prerequisites](https://tauri.app/start/prerequisites/))
- `pnpm tauri build` — desktop production bundle
- `pnpm lint` — ESLint on `src/`
- `pnpm check` — lint + test (also runs on pre-commit / pre-push via Husky)

## Pointers
- `docs/handbook/PROJECT_HANDBOOK.md` — **project handbook** (architecture map, key files, data flow, legacy vs v2, commands); start here when context is cold.
- `PRODUCT.md` — full agreed spec (mechanics, data flow, UI, cold start, memory model).
