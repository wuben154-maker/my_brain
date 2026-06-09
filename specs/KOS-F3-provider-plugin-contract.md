# KOS-F3 — Provider Plugin Contract 插件规范（`provider-plugin-contract`）

- **阶段：** KOS-F · **状态：** ✅ 已实现
- **上游：** V7、KOS-A1 · **下游：** —
- **复用：** `VoiceProvider`、`LlmProvider`、`NewsSource`、`MemoryProvider`、现有 mock/openai 实现
- **依赖 / 前置里程碑：** **V7** cutover；**KOS-A1** mock-first 演示路径
- **可并行性：** 与 F1/F2 并行

> **定位：** 文档化 + 测试化 **Provider 插件契约**：接口签名、env 配置、**mock parity**、failure recovery；提供 **最小国内模型 adapter 示例骨架**（mock 实现通过 CI，live 可选）。业务核心 **不直接依赖厂商 SDK**。

## 1. 目标

1. **`docs/providers/PROVIDER_PLUGIN_CONTRACT.md`**（或 `specs` 内嵌 § + 短 doc 指针）：四类 Provider 接口表。
2. **`ProviderPluginManifest`** 类型：`id`、`kind`、`envKeys[]`、`mockImpl`、`liveImpl?`。
3. **`mockParity.test.ts`**：同一 harness 输入下，mock vs 默认 mock 输出 shape 一致（LLM teach turn、voice speak、news fetch）。
4. **示例 adapter：** `src/providers/llm/domesticMockLlmProvider.ts`（纯 mock，演示国内命名与 env 占位 `DOMESTIC_LLM_API_KEY`）。
5. **Failure recovery 表**：provider factory 层 key 缺失必须抛 `MISSING_API_KEY`；app/provider factory 聚合层捕获后降级 mock（与 V7 清单对齐）。

## 2. 非目标

- 不实现真实豆包/通义/讯飞 API 完整接入（仅 skeleton + mock parity）。
- 不新增业务依赖厂商 SDK 到 domain 层。
- 不做插件 marketplace / 动态加载 DLL。
- 不修改 Radar 算法（B2）。
- EmbeddingProvider 完整 live 接入顺延。

## 3. 契约 / 涉及文件

```
docs/providers/PROVIDER_PLUGIN_CONTRACT.md   # 新增：契约文档
src/providers/providerManifest.ts            # 新增：manifest 注册表
src/providers/llm/domesticMockLlmProvider.ts # 新增：示例 adapter
src/providers/__tests__/mockParity.test.ts   # 新增：parity 测试
src/providers/voice/mockVoiceProvider.ts     # 参照实现
src/providers/llm/mockLlmProvider.ts         # 参照实现
AGENTS.md                                    # 可选一行指针（minimal）
```

### 3.1 Provider 接口摘要

| Provider | 核心方法 | mock 必实现 |
|---|---|---|
| `VoiceProvider` | `speak`, `interrupt`, `setVoice` | ✓ |
| `LlmProvider` | `complete`, `summarize`（+ 现有扩展） | ✓ |
| `NewsSource` / `WorldSource` | `fetch` → items | ✓ |
| `MemoryProvider` | `recall`, `remember`（只写蒸馏文本） | ✓ |

### 3.2 Mock parity golden

**输入：** `buildTeachingTurn('demo-rag', profile.heard)`

**断言：**

- `mockLlmProvider` 与 `domesticMockLlmProvider` 返回 `{ text: string, usage?: ... }` 同 shape。
- `text.length > 0`；CI 不比较具体文案（或比较 domestic 固定 stub 文案）。

**Key 缺失：**

- `createDomesticLlmProvider({ apiKey: undefined })` → throws `ProviderConfigError` with code `MISSING_API_KEY`
- App 层捕获 → 降级 `mockLlmProvider` + UI mock 角标（与 V7 一致）。

### 3.3 国内 adapter 示例 manifest

```typescript
{
  id: 'domestic-mock-llm',
  kind: 'llm',
  envKeys: ['DOMESTIC_LLM_API_KEY', 'DOMESTIC_LLM_BASE_URL'],
  mockImpl: domesticMockLlmProvider,
  docs: 'docs/providers/PROVIDER_PLUGIN_CONTRACT.md#domestic-mock'
}
```

## 4. 数据结构 / store

| 模块 | 说明 |
|---|---|
| `providerManifest.ts` | 静态注册表；无运行时插件加载 |
| env | `.env.example` 追加占位 key（无真实 secret） |

## 5. 验收清单

- [ ] CONTRACT 文档描述四类接口 + env + parity + recovery。
- [ ] `domesticMockLlmProvider` 通过 parity shape 测试。
- [ ] domain/agent **无** `@vendor/sdk` import（lint 或 grep 测试可选）。
- [ ] Key 缺失契约单测：provider factory 抛 `MISSING_API_KEY`；app/provider 聚合层捕获并降级 mock，demo 继续。
- [ ] 不变量：新 provider 不打开 graph write。
- [ ] `pnpm check` 无 API key 全绿。

## 6. 涉及不变量

- **Provider 可换**（AGENTS 技术栈 LOCKED 精神）。
- **mock-first**；live 为加分项。
- **记忆引擎 remember 不写图谱**。
- **API key 不进仓库**。

## 7. 测试（harness）

- `mockParity.test.ts`
- `domesticMockLlmProvider.test.ts`
- `providerConfigRecovery.test.ts`

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 文档漂移 | manifest 与 doc 同 PR |
| 假 adapter 进生产 | 默认 DI 仍 mock；domestic 仅 opt-in env |

## 9. DoD

- `pnpm check` 全绿；parity + recovery 绿。
- 新贡献者可按 CONTRACT 添加 adapter mock。

---

## Harness（验收协议）

### Scope

- **做：** contract 文档、manifest、domestic mock adapter、parity、key 缺失降级。
- **不做：** 真实国内 API、plugin marketplace、MCP。

### Input fixtures

- A1 profile + demo-rag teaching 输入
- env：无 `DOMESTIC_LLM_API_KEY`

### User actions

1. 注册 domestic provider in test DI。
2. 触发 teaching turn（harness）。
3. 模拟 key 缺失启动。

### Expected observations

- Parity shape 一致。
- Provider factory key 缺失 → 抛 `MISSING_API_KEY`；app/provider 聚合层 → mock 降级 + 明确 warning（非 silent fail）。

### Assertions

```text
Given domesticMockLlmProvider registered
When buildTeachingTurn same input as mockLlm
Then response shape matches MOCK_LLM_RESPONSE_SHAPE
When apiKey missing at factory
Then provider factory throws MISSING_API_KEY
And app/provider aggregation catches it and falls back to mockLlm per V7
And no graph mutation from provider layer
```

### Forbidden behaviors

- Domain 层 import OpenAI/axios 直连 vendor（除 providers/ 目录）。
- Provider 初始化失败导致 phase=error 且无 mock 降级（demo 路径）。
- Secret 写入 repo 或 export（F2）。

### Failure recovery

| 失败 | 行为 |
|---|---|
| MISSING_API_KEY | 降级 mock + settings warn |
| live 请求超时 | retry 0 次 → mock stub（demo） |
| manifest 未知 id | fallback default mock |

### Verification commands

```bash
pnpm test -- mockParity domesticMockLlmProvider providerConfigRecovery
pnpm check
```

### Out-of-scope

- Real 豆包/通义/讯飞 HTTP 集成。
- Dynamic plugin loading。
- Embedding live provider。
- Voice Realtime 国内替代（V7 真 API 清单单独跟踪）。
