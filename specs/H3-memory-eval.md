# H3 — 记忆质量与自进化评测（`memory-eval`）

- **阶段：** 硬化项 · **执行时机：** **起步跟 M1**（召回可测后），**加强跟 C3**（自进化曲线需纵向数据）· **状态：** ✅ 已实现
- **上游：** M1（召回）、M2（显著度）、C1/C3（画像生长）

## 1. 目标
把"记忆到底有没有用"变成**会失败的断言**：建一个小型固定评测集，量化 ①**召回质量**（给定问题，相关记忆是否被召回）与 ②**自进化**（随对话累积，画像驱动的回答/选题是否越来越准），对标 EverMemBench（事实召回/应用推理/个性化泛化）与 EvoAgentBench（纵向成长曲线）。纯 harness engineering，**不依赖真实网络/API key**（mock provider + 固定语料）。

## 2. 非目标
- 不复刻 EverMemOS 的完整学术 benchmark；只做**回归级**轻量评测。
- 不接真实 LLM/真实 EverMemOS（用 mock + 固定固件，保证 CI 确定性）。

## 3. 契约
```
src/eval/memory/fixtures.ts        // 固定语料：多轮对话 + 期望召回/期望画像信号
src/eval/memory/recallQuality.ts   // 指标：recall@k / 命中率（基于 mockMemoryProvider）
src/eval/memory/evolution.ts       // 指标：随轮次画像匹配度是否单调上升（成长曲线）
src/eval/memory/memoryEval.test.ts // 跑评测并对阈值断言（低于下限即红灯）
```
- 阈值化：`recall@5 >= 1.0`（当前固件 3/3 全命中）、`evolution 曲线非降` 等写成断言；阈值在 `src/eval/memory/thresholds.ts`，调整需改 spec（棘轮）。
- 输出：评测报告（命中率/曲线）可打印；可选接入 H0 覆盖率/CI 一起跑。

## 4. 验收清单
- [x] 固定语料 + mock 引擎下评测可复现、确定性（同输入同结果）。
- [x] `recall@k` 与"成长曲线非降"指标实现并阈值断言。
- [x] 阈值不达标时测试**红灯**（验证断言真的会失败）。
- [x] 不依赖真实网络/key；可在 CI 跑。

## 5. 测试（harness）
- `memoryEval.test.ts` 本身即评测断言。
- 反向用例：人为劣化召回 → 评测应红灯（证明护栏有效）。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 评测变 flaky | 全用 mock + 固定固件，无真实 API；确定性优先 |
| 阈值拍脑袋 | 阈值入 spec、随数据迭代修订（棘轮，只升不降优先） |

## 7. DoD
`pnpm check` 全绿；评测确定性可复现；阈值断言生效（劣化会红灯）；不依赖真实服务。
