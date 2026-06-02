# M0 — MemoryProvider 接口 + EverMemOS 记忆引擎（`memory-provider`）

- **阶段：** A 段收尾 → B 段地基（在 B1 之前执行）· **状态：** 📝 待做
- **上游：** 现有 Provider 工厂模式、`voiceSessionFinalize`/`profileDistillation`（已有蒸馏）· **下游：** M1（召回 grounding）、M2、M3、C1、C4、H3 全部依赖本接口
- **依赖决策（显式例外）：** 采用 **EverMemOS B 方案（核心依赖深度集成）**，已由产品负责人明确批准。引入本地 **Python 3.12 + Docker** sidecar（EverCore/EverMemOS，REST @ `http://localhost:1995/api/v1`）。AGENTS.md「不要随意加依赖/锁定栈」的例外，记录在此 spec 为依据。

## 1. 目标
为系统引入**长期记忆引擎**：定义一套与厂商无关的 `MemoryProvider` 接口（`remember` / `recall`），用 **EverMemOS** 作为其默认实现（情节记忆 → 语义固结 → 重构召回，对标 EverCore 三阶段生命周期），并提供 mock 实现与本地 sidecar 生命周期管理。本里程碑只建"地基与接口 + 引擎可跑通"，**不接业务调用点**（召回注入在 M1）。

## 2. 不变量守护（本 spec 的第一性约束）
- **不变量 1（原始即丢）**：只向 `remember` 写入**蒸馏后的纯文本**（对话情节摘要、抽取事实）；**严禁**写入原始音频、新闻全文、密钥。
- **不变量 5（Provider 可替换）**：业务只依赖 `MemoryProvider` 接口；EverMemOS REST/SDK **只允许**出现在 `src/providers/memory/everMemOsProvider.ts` 适配器内。
- **不变量 6/2（Agent 无写、先建议后确认）**：记忆模块**只读注入上下文**，**绝不**调用 `applyGraphMutation`/`persistGraphSnapshot`/写 `StorageProvider`；图谱落库仍只走收件箱。
- **不变量 7（本地优先/隐私）**：EverMemOS 为**本机自部署** sidecar，非云端；数据不出机。

## 3. 契约

> **前置确认（实现前必做，harness 要求不杜撰外部契约）**：先对照**仓库内 vendored EverMemOS 源**或官方文档，确认真实 REST 契约（端点路径、请求/响应 schema、检索参数名）。把确认结果**回填**本节「适配器端点」后再编码；确认前不得按猜测实现。下方端点注释为**待核对占位**。

```ts
// src/providers/memory/types.ts
export interface MemoryItem {
  id?: string;
  kind: "episode" | "fact";   // 情节（对话片段摘要）/ 语义事实
  text: string;               // 仅蒸馏纯文本
  tags?: string[];            // 关联概念 id/主题，便于与图谱回链
  timestamp: number;
}
export interface RecallQuery {
  query: string;
  topK?: number;              // 默认 5
  kinds?: MemoryItem["kind"][];
}
export interface RecalledMemory { item: MemoryItem; score: number; }

export interface MemoryProvider {
  remember(items: MemoryItem[]): Promise<void>;           // 仅蒸馏文本入库
  recall(q: RecallQuery): Promise<RecalledMemory[]>;      // 只读召回
  health(): Promise<{ ok: boolean; detail?: string }>;    // sidecar 健康
}
```
```
src/providers/memory/everMemOsProvider.ts   // REST 适配器：端点待前置确认（占位：add/search）
src/providers/memory/mockMemoryProvider.ts  // 内存/本地实现，供测试与离线开发（不依赖 sidecar）
src/providers/memory/index.ts               // createMemoryProvider(env)：由 memoryProviderMode 决定 mock/evermemos
src/lib/memoryProviderMode.ts               // 仿 voiceProviderMode/llmProviderMode
```
- 接入工厂：扩展 `createAppProviders(env)` 暴露 `memory: MemoryProvider`（调用方不感知厂商）。
- **Sidecar 生命周期**：文档化 `docker compose up -d`（仓库内 `vendor/EverMemOS/` 或 compose 文件）；桌面端（Tauri）健康探测 + 优雅降级——`health().ok === false` 时 `recall` 返回 `[]`、`remember` 进本地待发队列，**绝不抛错冒泡到 UI/崩溃**。
- **配置**：`EVERMEMOS_BASE_URL`、`EVERMEMOS_API_KEY` 走 `.env`（gitignored），客户端不硬编码、不明文展示。
- EverCore 生命周期映射：`remember`=情节痕迹形成；语义固结由 EverMemOS 内部完成；`recall`=重构召回。

## 4. 验收清单
- [ ] `MemoryProvider` 三方法签名落地；`mockMemoryProvider` 可在无 sidecar 下跑通 remember/recall。
- [ ] `everMemOsProvider` 对接 EverMemOS REST：add 一条记忆后能被 `recall` 命中（本地 sidecar 跑起来时）。
- [ ] sidecar 不可用时全链路优雅降级（`recall→[]`，无异常冒泡），有日志。
- [ ] `createAppProviders` 暴露 `memory`，由 `memoryProviderMode` 切 mock/evermemos。
- [ ] EverMemOS 端点/SDK 仅出现在适配器文件（**已上线守护**：`.cursor/rules/memory-boundary.mdc` + `.cursor/hooks/memory-boundary.mjs`）。
- [ ] **CI / `pnpm check` 零依赖 sidecar**：测试全用 mock/打桩，绿灯不需要 Docker/EverMemOS 在跑；真连仅作本地手动验收。
- [ ] 适配器端点已按「前置确认」核对真实 EverMemOS 契约并回填本 spec（非猜测）。
- [ ] sidecar 启动/健康/降级写入 README/AGENT.md 运行档。

## 5. 测试（harness）
- `mockMemoryProvider.test.ts`：remember→recall 命中、topK、kinds 过滤、空集。
- `everMemOsProvider.test.ts`：用 mock fetch 打桩 REST，断言请求体（`method:"hybrid"`、过滤）与解析健壮（截断/非法 JSON 降级不抛）。
- **边界不变量测试**（`productInvariants.test.ts` 扩展，`readRepoSource` 扫描）：`src/providers/memory/**` 不出现 `applyGraphMutation`/`persistGraphSnapshot`/`StorageProvider` 写；`EVERMEMOS`/`localhost:1995` 不出现在 `memory/` 适配器之外。
- 降级测试：`health.ok=false` 时 `recall` 返回 `[]`。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| Python/Docker 重、桌面端拉不起 | 优雅降级为"无记忆 grounding"，应用照常可用；sidecar 安装写进文档；后续可评估打包 |
| 把原始音频/全文写进记忆，破坏不变量 1 | `remember` 只收蒸馏文本；rule + hook + 测试三重守护 |
| 厂商锁定 | 业务只依赖 `MemoryProvider`；EverMemOS 仅在适配器内；切 mock/其他引擎零改业务 |
| 隐私/密钥泄露 | 本机自部署；密钥走 `.env`；客户端不渲染 key |

## 7. DoD
`pnpm check` 全绿；mock 路径无需 sidecar 即过测；边界不变量测试守住；sidecar 运行/降级有文档与日志。
