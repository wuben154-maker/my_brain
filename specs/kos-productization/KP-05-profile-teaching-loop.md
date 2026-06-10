# KP-05 — Profile 修正与 Teaching Depth 闭环（`profile-teaching-loop`）

- **阶段：** KP Phase 2 · **状态：** planned
- **上游：** KP-04、KOS-C2 · **下游：** KP-09
- **依赖 / 前置里程碑：** KP-04 feedback 可写；KOS-C2 profile-correction harness
- **可并行性：** 依赖 KP-04；可与 KP-06 文档工作穿插

## 定位

让用户看见「系统为什么这样推荐/讲解」，并能 **修正画像**；修正 **优先于** AI 蒸馏冲突。把 `teachingDepth` 与 Radar feedback、profile correction **串进产品路径**，而非仅单测存在。

## 目标

1. `ProfilePanel`（或 companion 内画像区）展示推荐/讲解依据（signals + profile 字段摘要）。
2. 用户 correction **覆盖**蒸馏冲突项（KOS-C2 规则）。
3. `teachingDepth` 读 profile + feedback，影响 conductor 讲解深度。
4. Radar ranking 可读 profile correction（与 KP-04 feedback 协同）。
5. **冲突 resolution**：显式 user correction > item 级 feedback（KP-04）> AI 蒸馏；golden 覆盖至少一个冲突场景（例：用户对某主题标记 `not_interested` 但画像 interests 含该主题——correction/feedback 应获胜）。
6. 全流程 mock-first 可 demo。

## 非目标

- 不重做 profile 蒸馏管道（V5 已有）。
- 不做 Interview mode 产品化（KOS-C3 可选后续）。
- 不做 schema 扩展。
- 不让 profile UI 静默改图谱结构。

## 涉及文件/模块

```
src/components/profile/ProfilePanel.tsx
src/conversation/teachingDepth.ts
src/stores/profileStore.ts
src/radar/scoreWorldItems.ts                # 读 profile correction（ranking 逻辑）
src/conversation/ConversationConductor.ts
src/components/companion/RadarCompanionCard.tsx  # 「为何推荐」链接
```

## 用户可见流程或数据流

```
Radar 展示 signal → 用户打开画像/「为何这样讲」
  → 看到 interests / depth pref / correction
  → 用户修正「太深了/默认浅讲」
  → 下次 briefing ranking + 讲解 depth 变化
  → correction 优先于上次蒸馏值
```

## 验收清单

- [ ] 用户可见「为何推荐/讲解」摘要（非黑盒）。
- [ ] 提交 correction 后，profile store 更新且 **优先于**冲突蒸馏字段。
- [ ] 同一主题在不同 correction 下 ranking 或 depth **可观察**变化（harness）。
- [ ] teachingDepth 单测 + integration 覆盖 conductor 路径。
- [ ] 画像 UI **不**提供直接 edit 图谱节点（仅 profile 层）。
- [ ] **冲突 resolution**：correction > item feedback > 蒸馏；golden 含至少一个冲突场景（如 `not_interested` vs interests 含该主题）。
- [ ] KOS-C2 golden 仍绿。

## 不变量与权限边界

- profile 修正 ≠ 图谱 merge/archive；不写 graph history。
- 新建概念仍仅用户确认入库。
- MemoryProvider 仍只写蒸馏文本，不写图谱。

## 测试 / 验证命令

```bash
pnpm test -- teachingDepth profileCorrection profileRerank integration
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 假画像面板（无效果） | rerank/depth 前后对比单测 |
| correction 被蒸馏覆盖 | C2 优先级断言 |

**Stop condition：** 与 KP-04 相同——反馈/修正不能影响下一轮 → STOP Phase 2 后续。

## Skill 使用要求

- **若改 ProfilePanel / 伴侣卡片入口：** `design-review` + `qa`。
- **仅 store 逻辑：** integration tests 即可。

---

## Harness 验收协议

### Scope

- **做：** 可见推荐理由、correction 优先、teaching depth 联动。
- **不做：** Weekly Review 主路径、Project 节点。

### Input fixtures

- KOS-C2 profile correction golden
- User with conflict: distilled depth=deep, correction=shallow
- Conflict: item `not_interested` on topic T while profile interests include T

### User actions

1. 打开 profile/为何推荐 UI。
2. 提交 correction shallow。
3. 触发下一条 briefing elaboration 或 rerank。

### Expected observations

| 观测 | 期望 |
|------|------|
| UI | 可见 signal + profile 摘要 |
| correction | 生效后 depth/rank 变化 |

### Assertions

```text
Given profile correction overrides distilled preference
When scoreWorldItems or teachingDepth resolves
Then correction wins
And user-visible rationale updated
And no graph mutation from profile UI
When not_interested feedback conflicts with profile interests on same topic
Then correction or item feedback wins over distilled interests
```

### Forbidden behaviors

- 蒸馏或 item feedback 静默覆盖显式 user correction。
- 画像修正直接改 KnowledgeGraph。
- UI 声称「已修正」但 ranking 不变。
- 蒸馏静默覆盖用户 correction。

### Failure recovery

| 失败 | 行为 |
|------|------|
| panel 加载失败 | 降级 transcript 口头解释 |
| 冲突 unresolved | 显式提示用户确认 correction |

### Verification command

```bash
pnpm test -- profileCorrection teachingDepth profileRerank
pnpm check
```
