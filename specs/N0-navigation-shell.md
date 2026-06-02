# N0 — 导航外壳与分区路由（`navigation-shell`）

- **阶段：** A（基建，建议 H0 之后、A4 之前执行）· **状态：** 📝 待做
- **上游：** 现有 `AppShell` / `NavRail`（装饰外壳）· **下游：** A4、B3、N1–N4、G1（都挂成分区）

## 1. 目标
把左侧 `NavRail` 从「纯高亮装饰」升级为**真正可跳转的分区路由**：点击任一导航项立即切换中央内容区；尚未实现的分区显示统一的「规划中」占位（标注对应 spec 号）。让**每一个导航项都有去处、点击都有反馈**，且为后续 A4/B3/N1–N4/G1 的真实界面预留挂载点。

## 2. 非目标
- 不引入 `react-router`（单窗口桌面/Web 应用，用轻量状态切换即可）。
- 不实现任何分区的业务功能（仅 graph 默认区沿用现状，其余给占位）。
- 不改语音面板：它是常驻伴侣，跨分区保留。

## 3. 契约
```
src/stores/uiStore.ts
  type NavSectionId = "graph" | "explore" | "docs" | "mindmap" | "agent" | "insight" | "settings";
  interface UiState { activeSection: NavSectionId; setSection(id: NavSectionId): void; }

src/lib/navSections.ts
  interface NavSectionDef {
    id: NavSectionId;
    label: string;          // 中文，与 NavRail 一致
    status: "live" | "planned";
    specRef: string | null; // 例 "specs/N1-explore-feed.md"；live 区为 null
  }
  export const NAV_SECTIONS: NavSectionDef[]; // 顺序即 NavRail 渲染顺序，唯一真源

src/components/layout/SectionPlaceholder.tsx  // planned 区统一占位（图标+标题+“规划中，见 <specRef>”）
```
- `NavRail` 改为从 `NAV_SECTIONS` 渲染、点击调 `setSection`，`activeSection` 决定高亮（移除本地 `useState`）。
- `AppShell` 在 `ready` 阶段按 `activeSection` 渲染中央区：`graph` → 现有星图+统计+ingest；其余 `planned` 区 → `<SectionPlaceholder>`。`?visual=main` 与 boot/loading/error 分支**保持不变**。
- 语音面板在所有分区常驻（右栏）。
- **可选（SHOULD）**：`activeSection` 与 `location.hash`（如 `#explore`）双向同步，支持刷新保持与浏览器后退。

## 4. 验收清单
- [ ] 点击每个导航项，中央区即时切换；当前项高亮（`aria-current="page"`）。
- [ ] `graph` 区与现状一致（星图/统计卡/ingest/语音）。
- [ ] 所有 `planned` 区显示占位，且文案含对应 spec 号；无任何「点击无反应」的死项。
- [ ] `?visual=main`、boot、loading、error 行为零回归（重跑 `visual:*` 对比通过）。
- [ ] 浏览器截图：依次点击各分区，留证（截图反馈闭环 §9）。

## 5. 测试（harness）
- `uiStore.test.ts`：`setSection` 更新、默认值 `graph`。
- `navSections.test.ts`（**关键不变量**）：`NAV_SECTIONS` 的 id 与 `NavRail` 渲染项一一对应；每个 `planned` 区 `specRef` 指向 `specs/` 下**真实存在**的文件（用 `readRepoSource` 校验路径存在）；`live` 区 `specRef` 为 null。→ 保证「所有功能都有 spec、无死链」。
- `AppShell` 渲染测试：切换 `activeSection` 时渲染对应区/占位。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 占位区显得“空” | 占位统一用 `GlassCard` + 简短规划说明，视觉与 DESIGN.md 一致 |
| 分区与抽屉式 A4 冲突 | A4「智能体」既可做分区也可做抽屉；本 spec 先占 `agent` 分区位，A4 决定落地形态（见 A4 §3 备注） |

## 7. DoD
`pnpm check` 全绿；`navSections.test.ts` 守住「导航项↔分区↔spec」三者一致；分区切换截图通过。
