# M2 — 显著度与衰减（`salience-decay`）

- **阶段：** C 段（在 C2 之前/同期）· **状态：** 📝 待做
- **上游：** M0/M1（记忆引擎）、现有图谱/画像· **下游：** C2（主动归档吃衰减信号）、星图视觉（节点弱化）

## 1. 目标
给图谱节点、画像信号、记忆项引入**显著度（salience）+ 随时间衰减**：被频繁提及/召回命中/确认的记忆"变深刻"，长期不被触达的"渐渐淡去"（对标 OpenHer 风格记忆的引力质量加权 + Hawking 衰减、EverCore 语义固结）。**核心用途**：给 C2 提供"哪些节点可能过时/被淡忘"的客观依据；给星图提供"久未触达节点弱化"的视觉。

## 2. 非目标
- **不自动归档/删除**任何节点（不变量 3/2）：衰减只产生**信号**，归档仍由 C2 走"先建议后确认"。
- 不改图谱结构与落库通道。

## 3. 契约
```
src/lib/salience.ts  （纯函数，可单测、确定性）
  computeSalience(node, now, events): number          // 命中/确认/提及次数 + 时间衰减
  decay(prev: number, ageMs: number, halfLifeMs): number  // 指数半衰
  type SalienceEvent = { kind: "recall_hit" | "mention" | "confirm" | "manual_edit"; at: number };
```
- 数据落点：`ConceptNode` 增可选 `salience?: number` + `lastTouchedAt?: number`（migration，向后兼容，默认值不影响旧数据）；画像信号同理可选加权。
- 计分输入来源：M1 的 `recall` 命中、ingest 确认、语音提及、手动编辑——汇总为 `SalienceEvent[]`。
- 纯函数 + 确定性：给定相同事件与 `now`，输出稳定（便于测试与 H3 评测）。
- 视觉（可选 SHOULD）：星图按 `salience` 调节点亮度/辉光强度（低显著度更暗），复用 `graphVisualTokens`。

## 4. 验收清单
- [ ] `decay` 指数半衰正确；`computeSalience` 对命中/确认提升、对久置衰减，确定性可测。
- [ ] migration 向后兼容：旧节点无 `salience` 字段也正常加载（默认值）。
- [ ] 衰减**只产信号**：无任何自动归档/删除路径（不变量测试断言）。
- [ ] C2 能消费 salience 排序出"低显著度 + 久未触达"候选（接口对齐 C2）。
- [ ] （SHOULD）星图低显著度节点视觉弱化截图。

## 5. 测试（harness）
- `salience.test.ts`：半衰、单调性、边界（无事件、刚触达、极久未触达）、确定性。
- migration 测试：旧快照升级不丢数据、默认值正确。
- 不变量测试：salience 模块无图谱写/归档调用。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 衰减被误解为"自动遗忘/删除" | 严格"只产信号"；归档仍 C2 先建议后确认；加断言 |
| 参数难调 | 半衰期/权重集中在 `salience.ts` 常量，附默认值与说明，可在 N4 设置暴露（后续） |

## 7. DoD
`pnpm check` 全绿；纯函数确定性可测；migration 兼容；无自动归档；C2 可消费排序。
