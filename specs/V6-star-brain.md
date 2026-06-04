# V6 — 星图主画布与串讲高亮（`star-brain`）

- **阶段：** V · **状态：** ✅ 已实现
- **上游：** V2 · **下游：** V7
- **复用：** `BrainGraphView`、`BrainGraph3DView`、`graphVisualTokens`、`graphOutline`、V2 `teaching`
- **依赖 / 前置里程碑：** **V2**（`teaching` 态 + `Turn.highlightNodeIds`）
- **可并行性：** 视觉与 **V3/V4** 可并行推进；高亮联动需 V2 契约稳定

## 1. 目标
星图升为 **唯一主画布** 并做科幻视觉打磨（辉光、层级、干净边线）。**串讲**（walkthrough）时节点/连线随语音 **逐步高亮**；与 conductor `highlightNodeIds` 联动。悬停 **节点**：聚焦 + 简介浮层；悬停 **边**：显示关系文案。2D/3D **均**支持高亮（复用 G1 开关）。

## 2. 非目标
- 不改图谱数据模型与落库规则。
- 不实现 walkthrough 的自然语言规划（V2 `topicRequest` + `graphOutline` 已有/扩展）。
- 不强求小地图 3D 化（延续 G1 非目标）。

## 3. 契约
```
src/hooks/useWalkthroughHighlight.ts
  export function useWalkthroughHighlight(
    nodeIds: string[],
    paceMs?: number,   // 默认 800–1200，可配置
  ): {
    activeNodeId: string | null;
    activeEdgeIds: string[];
    stepIndex: number;
    start(): void;
    stop(): void;
    onStep?: (id: string) => void;
  };

src/components/brain/BrainGraphView.tsx | BrainGraph3DView.tsx
  // 消费 graphStore.highlightedNodeIds / highlightedEdgeIds
  // walkthrough：useWalkthroughHighlight 逐步写入 highlightedNodeIds
  // 悬停：NodeHoverCard（简介）、EdgeHoverLabel（relation label）

src/lib/graphOutline.ts
  planWalkthrough(topic: string, graph: GraphSnapshot): string[];  // 有序 nodeIds，供 teaching

src/conversation/ConversationConductor.ts
  // teaching 态：Turn.highlightNodeIds 触发 useWalkthroughHighlight.start()
  // 用户 interrupt → stop() 清高亮
```

### 视觉回归双轨（定稿）
| 轨道 | 快照 id | 策略 |
|---|---|---|
| **冻结轨** | `?visual=main` | **保留至 V6 结束**：2D 旧布局 + 现有 `assets/*main*` **不得**因 V6 科幻打磨而漂移；V6 PR 若触 main 布局则须回滚或隔离改动。 |
| **v2 主轨** | `?visual=companion` | **V6 新增**：沉浸式 `ImmersiveScene` 截图入 `assets/`，`pnpm visual:loop --companion`（或等价参数）达科幻基线。 |
| **退役** | `main` | **V7** 退役 `?visual=main` CI 门禁，仅保留 `companion`（见 V7）。 |

- 视觉 token：在 **companion 轨** 打磨 `graphVisualTokens`（辉光、边型、归档透明）；冻结轨仅修阻断性 bug。

## 4. 数据结构 / store
| 字段 | 说明 |
|---|---|
| `graphStore.highlightedNodeIds` | 教学/预览/ walkthrough 共享 |
| `graphStore.highlightedEdgeIds` | 沿 walkthrough 路径的边 |
| `graphStore.selectedNodeId` | 悬停/点击选中 |

## 5. 验收清单
- [x] mock teaching：`highlightNodeIds` 长度为 N 时，高亮逐步推进 N 步（单测 fake timers）（`useWalkthroughHighlight.test.ts`）。
- [ ] 2D 与 3D 模式切换后高亮行为一致（共享 store）— 未加专用切换单测；`graphStore` 共享已由 2D/3D 视图冒烟间接覆盖。
- [x] 悬停节点显示简介；悬停边显示关系类型/描述（`BrainGraph3DView.test.ts` · V6 hover parity）。
- [x] interrupt 停止 walkthrough 并清除高亮（`useConversationSession.test.ts` · `onUserInterrupt`）。
- [ ] `pnpm visual:loop` **`companion` 轨**通过（新基线入 `assets/`）；**`main` 轨像素 diff 零回归**（冻结轨）— 未纳入本次 `pnpm check` 门禁。
- [ ] 无 WebGL 控制台 error（3D 冒烟）— 未接真 WebGL 浏览器断言；仅 mock 挂载测试。

## 6. 涉及不变量
- 渲染层 **只读**图谱；无 `applyGraphMutation`。
- 节点=概念+简介；归档节点降透明（与现有一致）。

## 7. 测试（harness）
- `useWalkthroughHighlight.test.ts`
- `graphOutline.test.ts`：walkthrough 序列
- `BrainGraphView.test.tsx`：高亮 props 冒烟
- `productInvariants`：brain 组件无图谱写

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| companion 打磨误伤 main | 双轨门禁：main 冻结、companion 新基线；V7 退役 main |
| 大图 walkthrough 性能 | 限步数；pace 可中断 |

## 9. DoD
`pnpm check` 全绿；mock 串讲可演示高亮递进；`useWalkthroughHighlight.test.ts` 绿；**companion** visual loop 达标且 **main** 轨零回归。
