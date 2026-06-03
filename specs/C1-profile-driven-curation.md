# C1 — 画像驱动选题（`profile-curation`）

- **阶段：** C · **状态：** ✅ 已实现
- **上游：** A3（`MorningBriefJob`）、现有 `UserProfile` · **下游：** C3（反哺）

## 1. 目标
让 `MorningBriefJob` 用 `UserProfile` 给候选资讯**打分排序**（`interests`/`knownTopics`/`unknownTopics`），并让讲解深度按 `explanationStyle` 自适应——实现「越用越懂你」在选题与讲解上的体现。

## 2. 非目标
- 不改收件箱/确认逻辑。
- 不做主动归档（C2）。

## 3. 接口契约
```ts
// src/agent/curation/scoreNews.ts（纯函数，可单测）
export interface NewsScore { item: NewsItem; score: number; reasons: string[]; }
export function scoreNewsByProfile(news: NewsItem[], profile: UserProfile): NewsScore[];
// 规则：命中 interests 加权；命中 unknownTopics（用户想学）加权；已在 knownTopics 且无新意降权
```
- `MorningBriefJob` 用 `scoreNewsByProfile` 排序后再取 topN（替换 A3 的简单排序）。
- `explain/summarize` 的 prompt 注入 `explanationStyle`（经 `LlmProvider`，不破坏接口）。

## 4. 验收清单
- [x] 打分纯函数表驱动用例：命中兴趣/未知主题分高，已知无新意分低。
- [x] topN 选取顺序随画像变化而变化（同新闻不同画像→不同排序）。
- [x] 画像为空（冷启动）时退化为时间/来源排序，不报错。
- [x] 讲解深度随 `explanationStyle` 变化（mock 可断言 prompt 包含该风格）。

## 5. 测试（`scoreNews.test.ts`）
- 多画像 × 多新闻打分矩阵；空画像退化；稳定排序。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 过度个性化形成信息茧房 | 保留少量「探索位」给低分但新颖的项 |
| 画像噪声影响排序 | 打分透明（`reasons`）便于调参与调试 |

## 7. DoD
`pnpm check` 全绿；同一批新闻在不同画像下排序明显不同。
