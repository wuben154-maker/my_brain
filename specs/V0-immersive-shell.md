# V0 — 沉浸式外壳（`immersive-shell`）

- **阶段：** V 系列地基 · **状态：** 📝 待实现
- **上游：** — · **下游：** V1–V7
- **复用：** 现有 `AppShell` / `NavRail` / `TopBar` / `MainSectionContent` / `VoicePanel`
- **依赖 / 前置里程碑：** 无（V 系列起点）
- **可并行性：** 无前置；V1 起均依赖本 spec 的 phase 与布局契约

## 1. 目标
用**单一沉浸式外壳**替换多分区仪表盘主体验：`App` 仅走 `LaunchScene`（启动链，V1 细化）→ `ImmersiveScene`（伴侣主场景）。主画面**只有**全屏大脑星图 + 语音光球 + 角落设置入口；`NavRail` / `TopBar` / `MainSectionContent` 从**主渲染路径下线**（源码可暂留、不挂载、不测主流程）。

## 2. 非目标
- 不实现对话编排（V2）、电影感启动与语音自检播报（V1）、入库后自动整理（V4）。
- 不删除底层 `providers/**`、`domain/`、`storage/`、`agent/`、`proposalStore` 等逻辑；仅 UI 路由与 phase 收敛。
- 不改 `?visual=main` 等视觉回归专用入口的行为契约（可保留独立快照路径，但默认用户路径走沉浸式）。

## 3. 契约

**LaunchPhase 五态（定稿，不得增减）**：`boot` | `self_check` | `loading` | `companion` | `error`。旧 `ready` / `onboarding` **已废除**，一律合并为 `companion`（编译期不得再出现旧字面量）。

- **`boot`**：自检**之前**的独立可见态——电影感短屏（黑场 + logo），**非**纯日志态；由 V1 从 `boot` 起做动画。`AppShell` 在 `boot` 渲染 `BootIntroScreen`（或等价），**不**渲染 `ImmersiveScene` / `NavRail`。

```
src/stores/appStore.ts
  type LaunchPhase = "boot" | "self_check" | "loading" | "companion" | "error";

src/components/launch/BootIntroScreen.tsx   // boot 态：黑场 + logo，V1 电影化

src/components/shell/ImmersiveScene.tsx
  // 全屏布局：BrainGraphView（或 2D/3D 容器）占满 + VoiceOrb 叠层 + SettingsCornerTrigger

src/components/voice/VoiceOrb.tsx
  // 从 VisualVoiceOrb / VoicePanel 抽离「声波光球」视觉；无对话逻辑（V2 接线）

src/components/settings/SettingsOverlay.tsx
  // 角落图标 → 浮层；V0 仅占位（音色/人格/API key 由 V5/N4 逻辑迁入）

src/components/layout/AppShell.tsx
  // phase 分支（定稿）：
  //   boot → BootIntroScreen
  //   self_check | loading | error → LaunchScene 子组件（V1）
  //   companion → <ImmersiveScene />
  // 主路径不再渲染 NavRail、TopBar、MainSectionContent、NewsIngestPanel 侧栏布局

src/lib/navSections.ts / uiStore.activeSection
  // 主流程不读；保留文件供 V7 清理或 visual 快照
```

- `VoicePanel` 右栏分栏布局从 companion 主路径移除；语音 UI 入口改为 `VoiceOrb`（可复用 `useVoiceSession` 的 connect 按钮态，但无 ingest/收件箱控件）。
- `GraphHeader` 等星图控件可保留最小集（2D/3D 切换、缩放），不得出现「跳转探索/收件箱」类导航。

## 4. 数据结构 / store
| Store / 类型 | 变更 |
|---|---|
| `appStore.phase` | 启动链定稿：`boot` → `self_check` → `loading` → `companion`（见 V1） |
| `uiStore` | V0 主流程不依赖 `activeSection`；不得因未选 section 而空白 |

## 5. 验收清单
- [ ] 默认启动后进入 `ImmersiveScene`：全屏星图 + `VoiceOrb` + 角落设置图标可见。
- [ ] 主路径无 `NavRail` / `TopBar` / `MainSectionContent` / 多栏 `VoicePanel` 布局。
- [ ] `LaunchPhase` 仅含五态；旧 `ready`/`onboarding` 已删除，编译期无残留引用。
- [ ] `boot` 态可见短屏（黑场 + logo），且**不**挂载 `ImmersiveScene` / `NavRail`。
- [ ] `pnpm dev` mock 路径可进入 `companion` 并渲染空/已有图谱（与现 storage 加载一致）。
- [ ] **视觉双轨**：`?visual=main` 冻结保留至 V6（见 V6）；v2 默认用户路径不走 main 布局。

## 6. 涉及不变量
- 本地优先；Provider 可替换（壳层不绑厂商 SDK）。
- **未改**入库门控与自动整理策略（V3/V4 才动）；本 spec 仅 UI/phase。
- 记忆边界：壳层不写图谱/画像。

## 7. 测试（harness）
- `appStore.test.ts`（或扩展现有）：`LaunchPhase` 字面量、默认 phase、`setPhase("companion")`。
- `AppShell.test.tsx`：`companion` 渲染 `ImmersiveScene`；`self_check`/`loading` 不渲染 `NavRail`。
- `ImmersiveScene.test.tsx`：挂载含 `data-testid="immersive-scene"`、`voice-orb`、`settings-corner`。

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| 视觉回归 `?visual=main` 仍依赖旧布局 | 双轨：main 冻结至 V6，V7 退役；见 V6/V7 |
| 下线分区后 e2e 断 | V0 更新/跳过旧 nav e2e；V7 补 `companion.e2e` |

## 9. DoD
`pnpm check` 全绿；mock 下可演示「启动链结束 → 全屏星图 + 光球」；上述 `*.test.ts` 通过；不违反 AGENTS.md 除已被 v2 显式覆盖项外的其余不变量。
