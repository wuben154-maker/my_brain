# KOS-F1 — Brain MCP 只读边界（`brain-mcp-boundary`）

- **阶段：** KOS-F · **状态：** ✅ 已实现
- **上游：** KOS-A2、KOS-E1 · **下游：** KOS-F2、KOS-F3
- **复用：** `src/mcp/**` 现有 Brain MCP、A2/A3 不变量断言模式
- **依赖 / 前置里程碑：** **KOS-A2**（graph 可读）；**KOS-E1**（action draft 不得 MCP confirm）
- **可并行性：** 与 F2/F3 并行；**安全边界应早于 export 文档宣传**

> **定位：** 强化 **Brain MCP 默认只读**：暴露 read/search/outline/neighborhood；**不暴露** create/update/delete/merge/archive/undo/confirm action。外部 agent **不能绕过用户确认写图谱**。

## 1. 目标

1. 文档化 **`BrainMcpToolCatalog`**：允许工具清单 + permissionLevel=read。
2. 实现或收紧 **`registerBrainMcpTools(server, { mode: 'read_only' })`**（默认 read_only）。
3. **`MCP_FORBIDDEN_TOOLS`** 列表 + 静态测试：仓库内不得注册写工具（grep/AST 测试）。
4. **`brainMcp.integration.test.ts`**：模拟 agent 调用 read 工具成功；调用写工具 **不在 catalog** 或返回 403。
5. 与 E1 对齐：MCP 不得 `confirmCognitiveAction` 或等价写外部系统。

## 2. 非目标

- 不实现 MCP write 模式（即使未来有，也非本 spec；需新 spec + 用户门控）。
- 不做 export 格式（F2）。
- 不做 Provider 插件（F3）。
- 不修改 ingest 主路径（仍 App 内用户确认）。

## 3. 契约 / 涉及文件

```
src/mcp/brainMcpServer.ts              # 扩展：read_only 注册
src/mcp/brainMcpTools.ts               # 新增：工具 catalog 常量
src/mcp/tools/readGraphOutline.ts      # 允许
src/mcp/tools/searchNodes.ts           # 允许
src/mcp/tools/getNodeNeighborhood.ts   # 允许
docs/handbook/PROJECT_HANDBOOK.md      # 可选一句 MCP 边界（minimal）
```

### 3.1 允许工具（首版）

| toolName | 说明 | 权限 |
|---|---|---|
| `brain_search_nodes` | 关键词搜节点 | read |
| `brain_get_node` | 单节点详情含 sourceRefs | read |
| `brain_graph_outline` | 层级大纲 | read |
| `brain_node_neighborhood` | N-hop 邻域 | read |

### 3.2 禁止工具（必须在测试中冻结）

`brain_create_node`, `brain_update_node`, `brain_delete_node`, `brain_merge_nodes`, `brain_archive_node`, `brain_undo`, `brain_confirm_action`, `brain_ingest`, `brain_write_profile`

### 3.3 MCP_BOUNDARY_GOLDEN

**Given：** showcase graph loaded

**When：** harness 调用 `brain_search_nodes({ q: 'Agent' })`

**Then：** 返回 ≥1 命中 `demo-agent`；`graphStore` 节点数不变

**When：** harness 尝试 invoke `brain_create_node`（若存在）

**Then：** tool not found 或 explicit forbidden error；graph 不变

## 4. 数据结构 / store

| 模块 | 行为 |
|---|---|
| MCP server | 仅注册 READ catalog |
| graphStore | MCP 工具只读访问（via service 层，不直接暴露 mutator） |

## 5. 验收清单

- [ ] Catalog 测试：允许 4 工具；禁止列表 0 注册。
- [ ] Read 工具单测：search/outline/neighborhood 返回 A1 节点。
- [ ] 写工具不存在或 fail closed。
- [ ] E1 cognitive action store 无 MCP 写路径。
- [ ] 文档（handbook 或 AGENTS 指针）说明 agent 只读策略。
- [ ] 记忆引擎 MCP 分离（若存在 memory MCP，不得写 graph）。

## 6. 涉及不变量

- **Brain MCP 默认 Read**（愿景 Stage 6）。
- **外部 agent 不能绕过 ingest 门控**。
- **User-confirmed write** 仅 App 内。
- **记忆引擎不写图谱**。

## 7. 测试（harness）

- `brainMcpCatalog.test.ts`：允许/禁止清单。
- `brainMcpRead.integration.test.ts`：read 工具 + graph 不变。
- `brainMcpForbidden.test.ts`：写工具不可调用。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 历史 MCP 写工具残留 | grep CI gate |
| 只读仍泄漏 PII | 返回字段白名单；无 raw transcript |

## 9. DoD

- `pnpm check` 全绿；MCP boundary 测试绿。
- F2 README 可声明「MCP 只读已测」。

---

## Harness（验收协议）

### Scope

- **做：** MCP read catalog、forbidden 列表、integration 边界测试。
- **不做：** export、provider 插件、write mode。

### Input fixtures

- A1 `SHOWCASE_GRAPH_SNAPSHOT` loaded in test harness

### User actions

- Harness 作为 MCP client 调用 read 工具各 1 次。
- Harness 尝试调用每个 forbidden toolName。

### Expected observations

- Read 返回结构化 JSON；无 mutation side effect。
- Forbidden 调用失败且 graph 快照相等。

### Assertions

```text
Given showcase graph
When brain_search_nodes('Agent')
Then results include demo-agent
And graphStore.getState().nodes.length unchanged
When invoke each MCP_FORBIDDEN_TOOLS name
Then all fail without side effects
And cognitiveActionStore unchanged
```

### Forbidden behaviors

- MCP 注册 merge/archive/create。
- MCP 调用 ingestActions 或 applyGraphMutation。
- MCP confirm draft action。
- 返回未归档节点的 deleted 标记（hard-delete 语义）。

### Failure recovery

| 失败 | 行为 |
|---|---|
| MCP server 启动失败 | App 主流程不受影响；设置页 warn |
| read 工具内部错误 | 结构化 error；不 partial write |

### Verification commands

```bash
pnpm test -- brainMcpCatalog brainMcpRead brainMcpForbidden
pnpm check
```

### Out-of-scope

- Export formats（F2）。
- Provider adapter（F3）。
- OAuth agent 身份。
- Remote MCP over HTTP 部署。
