# Showcase Mock vs Live 边界

Showcase 的目的，是让 GitHub 访客在本地、无网络、无 API key 的情况下复现 3 分钟核心闭环。Live provider 只用于验收期和后续真实接入，不是 Showcase 的前置条件。

## 默认路径

| 场景 | 行为 |
|---|---|
| 无 `.env` / 无 API key | 使用 mock providers，`pnpm dev` 可启动 |
| URL 含 `?showcase=1` | 强制使用 Showcase fixtures 和 mock provider 路径 |
| 配置了 live key 但仍打开 `?showcase=1` | Showcase 仍应保持确定性 mock 行为 |
| 需要 live 验收 | 按 [`docs/V2_REAL_API_ACCEPTANCE.md`](./V2_REAL_API_ACCEPTANCE.md) 单独执行 |

## Provider 矩阵

| 能力 | 默认 / Showcase | Live 验收期 | 关键边界 |
|---|---|---|---|
| 语音 | `MockVoiceProvider`，支持 transcript 注入和固定 speak 序列 | OpenAI Realtime API | 可中断语音是产品要求；Showcase 不依赖真实麦克风 |
| LLM | Mock LLM 固定讲解、固定 reason 文案 | OpenAI API 或其他 `LlmProvider` | 业务逻辑依赖接口，不依赖厂商 SDK |
| 资讯 | 固定 `SHOWCASE_BRIEFING_ITEMS` | RSS / GitHub trending fetchers | Showcase 不调用 live NewsSource |
| Embedding | Mock embedding / deterministic neighbor | 可选真实 embedding provider | 仅用于语义邻域；Showcase golden curation 固定 |
| 图谱存储 | 本地 SQLite / dev storage，固定 demo graph | 同一存储层 | 新建节点仍必须用户确认 |
| 自动整理 | 固定 `SHOWCASE_AUTO_CURATE_GOLDEN` | `autoCurate` 真实策略 | 入库后整理可自动，但必须有 reason、history、undo |
| 记忆 | Mock `MemoryProvider` 或关闭 | 可选 EverMemOS sidecar | `MemoryProvider` 不写图谱、不写画像 |
| Brain MCP | 只读查询 | 只读查询 | 不暴露 create / update / delete / merge / archive / undo 写工具 |

## Env Vars

常见变量以 `.env.example` 为准。以下是文档层面的边界说明：

| 变量 | 用途 | Showcase 行为 |
|---|---|---|
| `VITE_OPENAI_API_KEY` | live LLM / voice 验收可能使用 | `?showcase=1` 不需要，也不应改变固定 demo |
| `VITE_MEMORY_PROVIDER` | 选择 mock / EverMemOS 等记忆 provider | Showcase 可走 mock，不需要 sidecar |
| `VITE_EVERMEMOS_URL` | EverMemOS REST sidecar 地址 | Showcase 不依赖 |
| `VITE_SHOWCASE_DEMO` | 可选环境门控，与 URL flag 类似 | 与 `?showcase=1` 语义一致：固定 mock demo |
| `MY_BRAIN_MCP` | 启用只读 Brain MCP server | 不影响 Showcase 写入边界 |

不要把 API key 写入仓库。需要 live provider 时使用本地 `.env`，并按验收文档单独验证。

## Showcase 强制 Mock 的原因

Showcase 是作品级演示和回归基线，必须稳定：

- `newsQueue` 固定为 3 条，id 分别是 `showcase-brief-1`、`showcase-brief-2`、`showcase-brief-3`。
- 入库候选固定为 Graphiti，预期新节点 id 是 `showcase-ingest-graphiti`。
- 自动整理固定为 `ingest_link`：Graphiti 连接到 AI Agent。
- Undo 固定撤销该条自动整理连边，并保留用户确认入库的 Graphiti 节点。

任何 live source、live LLM 或 live embedding 都可能引入时间、网络、模型输出差异，因此不能作为 Showcase 能否跑通的条件。

## Live 验收边界

Live 验收要证明 provider 可替换，而不是改变产品权限模型。

| 验收点 | 要证明什么 | 不能改变什么 |
|---|---|---|
| Realtime voice | 能 speak、listen、interrupt | 不能绕过用户确认 create |
| Live LLM | 能生成摘要、讲解、整理理由 | 不能凭空新建永久图谱节点 |
| Live NewsSource | 能抓取真实 RSS / GitHub 趋势并失败降级 | `WorldItem` / briefing 不等于长期知识 |
| Live Embedding | 能辅助语义邻域排序 | 自动整理仍必须记录 reason 和 undo |
| Memory sidecar | 能 recall / remember 蒸馏文本 | 记忆引擎不写图谱、不写画像 |
| Brain MCP | 能被外部 agent 查询 | MCP 保持只读，不写图谱 |

Live 失败时，开发体验应能回到 mock-first 路径继续工作；Showcase 不应因 API key 缺失、网络失败或 provider 限流而不可演示。

## 验证建议

```bash
# Showcase / mock path
pnpm dev
# open http://localhost:1420/?showcase=1

# Behavior and invariant checks
pnpm test -- showcaseFixtures showcaseDemoMode showcaseAutoCurateGolden showcaseVoiceScript
pnpm test -- runShowcaseLaunchSequence showcaseCompanionScript showcaseCoreLoop showcaseUndoReport
pnpm check
```

Live provider 验收请单独参考 [`docs/V2_REAL_API_ACCEPTANCE.md`](./V2_REAL_API_ACCEPTANCE.md)。
