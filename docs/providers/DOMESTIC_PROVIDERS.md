# 大陆 Provider 接入说明（Volc + ModelScope）

> 更新时间：2026-06-10。默认仍为 **mock-first**；以下 live 路径均需 `.env` 显式配置。

## 豆包 / 火山端到端实时语音

- 文档：[API 接入](https://www.volcengine.com/docs/6561/1594356) · [SDK](https://www.volcengine.com/docs/6561/1597643)
- 代码：`src/providers/voice/volcengineRealtimeVoiceProvider.ts` · 二进制协议 `src/providers/voice/volcengine/volcBinaryProtocol.ts`
- 环境变量：
  - `VITE_VOICE_PROVIDER=volc-realtime`
  - `VITE_VOLC_APP_ID` — 控制台 App ID（`X-Api-App-ID`）
  - `VITE_VOLC_ACCESS_KEY` — Access Token（`X-Api-Access-Key`）
  - `VITE_VOLC_REALTIME_MODEL` — `1.2.1.1` 或 `2.2.0.0`
  - 可选 `VITE_VOLC_CONNECT_ID` — 连接追踪 ID
- WebSocket：`wss://openspeech.bytedance.com/api/v3/realtime/dialogue`
- 协议要点：二进制帧；`StartConnection(1)` → `StartSession(100)` → `TaskRequest(200)` 上传 PCM16 mono 16kHz；`ClientInterrupt(515)` 打断
- **当前限制**：浏览器 WebSocket 无法附带握手 Header，Web 端 `connect()` 会 fail-fast；完整 live 需 Tauri 原生传输或 dev proxy。Mock 默认路径不受影响。

## ModelScope 非实时文本 LLM

- 代码：`src/providers/llm/modelscopeLlmProvider.ts`（OpenAI-compatible `/v1/chat/completions`）
- 环境变量：
  - `VITE_LLM_PROVIDER=modelscope`
  - `VITE_MODELSCOPE_API_KEY`
  - `VITE_MODELSCOPE_BASE_URL`（默认 `https://api-inference.modelscope.cn/v1`）
  - `VITE_MODELSCOPE_LLM_MODEL`（例如 `Qwen/Qwen2.5-7B-Instruct`）
- 缺 key 时 aggregation 层降级 mock 并打印 warning（不进入 `phase=error`）

## 权威资讯源（公开、无 key）

| 源 | ID | Live 函数 |
|---|---|---|
| OpenAI / Google AI / Anthropic / HN RSS | `rss-ai-feeds` | `fetchAuthoritativeRssLiveSmoke()` |
| GitHub Search API | `github-trending` | `fetchGitHubTrendingLiveSmoke()` |
| arXiv cs.AI Atom | `arxiv-cs-ai` | `fetchArxivCsAiLiveSmoke()` |

- App 内 demo 占位：`VITE_NEWS_LIVE_FETCH=0`（默认）
- 联网抓取：`VITE_NEWS_LIVE_FETCH=1`
- CI / 手工 smoke：`KP01_LIVE_SOURCE_SMOKE=1 pnpm exec vitest run src/radar/liveSourceSmoke.test.ts`

## 安全

- 切勿在代码、文档、测试快照中硬编码真实 Access Token / API Key
- `.env` 已在 gitignore；仅 `.env.example` 使用占位符
