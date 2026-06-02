# C4 — Persona 引擎精简版（`persona-engine`）

- **阶段：** C 段（companion）· **状态：** 📝 待做
- **上游：** 现有人格预设 + `UserProfile.explanationStyle`、M1（召回 grounding）· **下游：** 语音/讲解风格

## 1. 目标
把现有"人格预设"升级为**声明式 Persona 引擎（精简版）**：用一份声明式预设文件（仿 OpenHer 的 `SOUL.md`，YAML/MD frontmatter）描述讲解风格参数，并在生成讲解/语音应答时走 **feel-first 两段式**（先内部判断"此刻该用什么口吻/深度" → 再生成对用户的表达），让讲解风格随人格预设与画像自适应。

## 2. 非目标（明确刹车，防偏离产品定位）
- **不做**情绪热力学、神经网络涌现、Hebbian、主动"想你"等恋爱陪伴向重机制——我们是**知识伴侣**，不是情感 AI Being。
- 不改图谱/落库；persona 只影响**表达风格**，不改变事实内容与"先建议后确认"。
- 不引入新依赖（纯提示词工程 + 现有 `LlmProvider`）。

## 3. 契约
```
src/persona/presets/*.md         // 声明式预设：沉稳导师 / 活泼伙伴 / 冷静极客（对齐冷启动）
  frontmatter: { name, tone, verbosity, warmth, technicality, ... }  // 风格参数，非性格描述文
src/persona/types.ts             // PersonaPreset 类型 + 解析
src/lib/personaPrompt.ts         // 纯函数：
  buildExpressionPlan(preset, profile, recalled): { innerIntent: string }   // feel-first 第一段
  applyPersonaStyle(preset, plan, content): string                          // 第二段：塑形表达
```
- 接入：`explain`/语音应答构造提示词时，先 `buildExpressionPlan`（决定口吻/深度/详略），再 `applyPersonaStyle`。两段可合并为一次 LLM 调用的结构化提示（省 token）。
- 与画像联动：`explanationStyle`/`knownTopics` 调节 `technicality`/`verbosity`（已懂的略讲，不懂的展开）。
- 预设可在 N4 设置切换（依赖 N4，若未做则用默认预设）。

## 4. 验收清单
- [ ] 三个预设文件解析为 `PersonaPreset`；缺字段有默认。
- [ ] 同一内容在不同预设下表达风格可辨（口吻/详略不同），事实不变。
- [ ] feel-first：`buildExpressionPlan` 先产出内部意图，再塑形输出（纯函数可测）。
- [ ] 不触碰图谱/落库；不引入新依赖。
- [ ] 截图/示例：同一讲解切预设，风格差异可见。

## 5. 测试（harness）
- `personaPrompt.test.ts`：预设解析、默认值、`buildExpressionPlan`/`applyPersonaStyle` 纯函数行为、画像联动。
- 不变量测试：persona 模块无图谱写、无厂商 SDK 直依赖。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 范围蔓延到情感 AI | §2 明确非目标；只调表达风格参数 |
| 风格压过准确性 | persona 只塑形表达，事实内容与来源不变；测试断言事实一致 |

## 7. DoD
`pnpm check` 全绿；预设可切、风格可辨、事实不变；无新依赖、无图谱写。
