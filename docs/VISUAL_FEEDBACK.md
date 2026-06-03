# 截图反馈闭环（Visual Feedback Loop）

将运行中的应用与定稿设计图做**像素级对比**（按 MVP 可落地区域裁剪对比，而非整张概念稿），驱动样式迭代。

## 定稿参考

| 画面 | 文件 |
|------|------|
| 启动自检 | `assets/boot-self-check.png` |
| 主界面 | `assets/main-ui-graph-voice.png` |
| 收件箱闭环 | `assets/inbox-approve-empty.png` |
| 洞察轨迹+预览 | `assets/insight-trace-preview.png` |

## 一次性准备

```bash
pnpm install
pnpm visual:browser   # 安装 Playwright Chromium
pnpm dev              # 或让 loop 自动启动
```

## 命令

| 命令 | 作用 |
|------|------|
| `pnpm visual:capture` | 打开应用并截图到 `artifacts/visual-feedback/actual/` |
| `pnpm visual:compare` | 与 `assets/*.png` 对比，生成 diff 热力图、`report.json` 与 `index.html` |
| `pnpm visual:report` | 仅从已有 `report.json` 重新生成 HTML 对比页 |
| `pnpm visual:loop` | 捕获 → 对比；未通过则退出码 1 |
| `pnpm visual:loop --watch` | 失败后监听 `src/` 变更，自动再截图再对比（配合改 CSS） |
| `pnpm visual:loop --max-rounds 30` | 最多循环 30 轮 |

## 可复现快照 URL

避免启动动画与力导向图随机布局影响对比：

- 启动自检：`http://localhost:1420/?visual=boot`
- 主界面：`http://localhost:1420/?visual=main`（固定 demo 图谱坐标 + 语音区文案）
- 收件箱：`http://localhost:1420/?visual=inbox`（待确认→同意→空态）
- 洞察：`http://localhost:1420/?visual=insight`（调研轨迹→预览到星图）

## 产出物

```
artifacts/visual-feedback/
  actual/     # 当前应用截图
  diff/       # 红色差异热力图
  reference-crops/  # 从设计图裁剪出的对比基准
  report.json # 差异比例、是否通过
  index.html  # 三栏对比页（设计裁剪 | 当前 | diff）
```

## 对比范围

定稿 PNG 是完整仪表盘概念稿（侧栏/顶栏等），与当前 MVP 布局不同。对比时：

| 目标 | 应用截图 | 设计图裁剪 |
|------|----------|------------|
| boot | `[data-testid=boot-diagnostics]` 诊断卡 | 概念稿右侧 SYSTEM DIAGNOSTICS 区 |
| main | `[data-testid=voice-panel]` 语音栏 | 概念稿右侧语音/对话区（聊天区在对比中忽略） |

裁剪参考保存在 `artifacts/visual-feedback/reference-crops/`。

## 阈值

在 `scripts/visual-feedback/config.mjs` 中配置（区域对比）：

- `boot`：约 15%（忽略概念稿左侧 HUD 光晕区）
- `main`：约 24%（忽略语音区中部聊天气泡，减少文案差异）

## Agent 工作流

1. `pnpm visual:loop` → 查看 `report.json` 与 `diff/*.png`
2. 按差异改 `src/index.css`、相关组件
3. `pnpm visual:loop --watch` 直到连续 2 轮通过

脚本**不会自动改代码**；闭环 = 自动截图 + 对比 +（可选）监听保存后重跑。
