# G1 — 3D 星图视图（`graph-3d`）

- **阶段：** A 段收尾 / B 段（建议 A4 之后、B3「星图预览高亮」之前或同期）· **状态：** ✅ 已实现
- **上游：** 现有 `BrainGraphView`（2D）、`GraphHeader`「3D 视图」按钮· **下游：** B3（预览高亮需在所选视图生效）

## 1. 目标（采纳 C 方案：真 3D）
引入 `react-force-graph-3d` + `three.js`，让中央星图支持**鼠标环绕旋转 / 缩放 / 平移的真 3D** 力导布局。3D 作为**可切换视图模式**，由 `GraphHeader` 现有「3D 视图」按钮控制；**2D 仍为默认**，从而保住 `?visual=main` 像素回归基线与现有辉光/小地图的投入。

## 2. 依赖决策（显式例外）
- 新增依赖：`react-force-graph-3d`、`three`（`three` 为前者 peer）。
- AGENTS.md 规定「不要随意加依赖」；**本例外已由产品负责人明确批准（选定 C 方案）**，记录在此 spec 作为依据。
- 锁版本、计入包体；桌面（Tauri WebView）与 Web 均需 WebGL 可用。

## 3. 非目标
- 不替换 2D：2D `BrainGraphView` 保留为默认与视觉基线载体。
- 不改图谱数据/落库（不变量 2/6 不受影响：3D 只是渲染层）。
- 小地图（`GraphMinimap`）不强求 3D 化：3D 模式下隐藏或降级为方位指示。

## 4. 契约
```
src/stores/uiStore.ts            // 扩展：graphViewMode: "2d" | "3d"; setGraphViewMode()
src/components/brain/BrainGraph3DView.tsx   // ForceGraph3D 封装，复用同一 graphData/选择/高亮
src/components/brain/BrainGraphView.tsx     // 维持 2D；按 graphViewMode 由 AppShell/容器择一渲染
```
- `GraphHeader`「3D 视图」按钮 → `setGraphViewMode` 切换，按钮 `aria-pressed` 反映状态。
- 两视图**共享同一交互契约**：`graphStore.selectNode(id)`、`highlightedNodeIds/EdgeIds`、`layerDepth`（3D 用作 link distance/斥力或 Z 分层）、cluster 颜色（`clusterColorForNodeId`）。A4/B3 的「命中节点高亮预览」在当前激活视图下都要生效。
- 交互：默认 OrbitControls（拖拽旋转、滚轮缩放、右键/双指平移）；点击节点选中并 `centerAt/zoom` 聚焦。
- 归档节点：3D 下同样降透明、可见性与 2D 一致。
- 辉光（**可选 SHOULD**）：用 `three` `UnrealBloomPass` 经 `postProcessingComposer` 实现节点 bloom，呼应 2D 观感；性能不达标可降级为节点自发光材质。
- 强制保护：`?visual=main` 与默认进入**一律 2D**，G1 不得改变 2D 默认路径与像素基线。

## 5. 验收清单（含 §9 截图反馈闭环）
- [x] 「3D 视图」按钮切换 2D⇄3D，状态可视且可逆。
- [x] 3D 下鼠标可旋转/缩放/平移；点击节点选中并高亮（与 2D 行为对齐）。
- [x] A4/B3 的提议「预览高亮」在 3D 视图下也命中正确节点（graphStore 高亮共享）。
- [x] 默认与 `?visual=main` 仍是 2D，`visual:*` 像素对比零回归。
- [ ] 3D 模式截图留证（旋转前后两帧）；切回 2D 视觉无损。
- [ ] 桌面（`pnpm tauri dev`）与 Web（`pnpm dev`）均能渲染 3D，无 WebGL 报错。

## 6. 测试（harness）
- `uiStore.test.ts`：`graphViewMode` 默认 `2d`、`setGraphViewMode` 切换。
- 渲染冒烟：3D 组件用 mock 数据挂载不抛错（必要时 mock WebGL/`react-force-graph-3d` 以适配 jsdom；3D 像素**不纳入**确定性回归）。
- 不变量回归：现有 `productInvariants.test.ts` 全绿；新增断言「3D 视图无任何图谱写路径」（渲染层只读）。

## 7. 风险与对策
| 风险 | 对策 |
|---|---|
| three.js 增大包体/桌面 WebView 兼容 | 锁版本、按需引入；桌面冒烟验收纳入 H2-3d；不达标则 3D 设为可选开关、默认 2D |
| 破坏现有视觉基线 | 2D 为默认且唯一基线载体，3D 仅 opt-in；CI `visual:*` 仍跑 2D |
| jsdom 无 WebGL 致测试失败 | 3D 仅做挂载冒烟 + mock，确定性像素测试只留 2D |
| 性能（大图旋转掉帧） | 限 `cooldownTicks`、节点数；bloom 设为可降级 SHOULD 而非 MUST |

## 8. DoD
`pnpm check` 全绿；2D 默认/基线零回归；3D 切换+旋转+选中高亮截图通过；桌面与 Web 各一次 3D 渲染冒烟。
