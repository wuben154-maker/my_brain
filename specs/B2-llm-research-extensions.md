# B2 — LlmProvider 研究扩展（`research-llm`）

- **阶段：** B · **状态：** ✅ 已实现
- **上游：** 现有 `LlmProvider` · **下游：** B1（消费这些方法）

## 1. 目标
给 `LlmProvider` 增加两个研究链所需方法：`planResearch`（把主题拆成研究步骤/子问题）与 `synthesizeConcepts`（把多条证据提炼成概念候选）。仍是**接口方法**，mock 与 openai **双实现**，业务不依赖厂商 SDK。

## 2. 非目标
- 不改现有 4 个方法的签名/行为。
- 不在本里程碑接入研究 Job（B1 做）。

## 3. 接口契约（`src/providers/llm/types.ts` 追加）
```ts
export interface ResearchPlan { topic: string; subQuestions: string[]; suggestedSources: string[]; }
export interface ConceptCandidate {
  title: string; intro: string; sourceUrl: string | null;
  relations: Array<{ targetTitle: string; relationType: RelationType }>;  // 复用 domain/graph
}
export interface LlmProvider {
  // …现有 4 个方法不变…
  planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan>;
  synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]>;
}
```
- `mockLlmProvider`：确定性输出（便于单测断言）。
- `openaiLlmProvider`：结构化输出（JSON schema / 函数调用），解析失败有兜底。

## 4. 验收清单
- [x] mock 双方法返回稳定结构，类型完备（无 `any`）。
- [x] openai 实现解析健壮：非法 JSON 不抛未捕获异常，降级为空结果 + 记录。
- [x] 现有 `mockLlmProvider.test.ts` 全过，新增两方法用例。
- [x] `ConceptCandidate.relations.relationType` 限定在 `RelationType` 枚举。

## 5. 测试
- mock 输出快照；openai 解析器对「正常/截断/非法」三类输入的处理。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| LLM 结构化输出不稳定 | 强约束 schema + 解析兜底 + 重试退避 |
| 关系类型越界 | 解析时过滤非枚举值 |

## 7. DoD
`pnpm check` 全绿；B1 可直接调用两方法。
