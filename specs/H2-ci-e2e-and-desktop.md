# H2 — CI 扩展：端到端 + 桌面构建（`ci-e2e-desktop`）

- **类型：** 硬化（Hardening）· **状态：** 📝 待做
- **执行时机：** 分阶段——**3b 跟 A4**、**3c 跟 B3**、**3d 在 A 阶段收尾 / 首次桌面打包前**
- **上游：** 现有 `ci.yml`、视觉反馈脚本（`visual:*`）· **下游：** —

## 1. 目标
把"只校验 web `pnpm check`"的 CI 扩展为也守住 **UI 端到端** 与 **桌面构建**，按 UI/桌面风险真正出现的时机分批接入。

## 2. 非目标
- 不追求全量 e2e；先冒烟（关键路径跑通 + 截图），逐步扩。
- 桌面构建只验"能编译/能打包"，不在 CI 做 GUI 交互测试。

## 3. 分批契约

### 3b · 视觉/e2e 冒烟进 CI（跟 A4）
- CI 加一个 job：`pnpm visual:browser`（装 chromium）→ 启动 dev/preview → 跑收件箱关键路径冒烟（`visual:capture` + `visual:compare`），产物作为 artifact 上传。
- 失败条件：关键路径报错，或与 `DESIGN.md` 基线差异超阈值。

### 3c · e2e 覆盖扩到调研轨迹/预览（跟 B3）
- 在 3b 基础上增加 B3 的「调研轨迹 + 提议预览」路径冒烟与基线截图。

### 3d · Tauri 桌面构建进 CI（A 阶段收尾 / 桌面打包前）
- 新增 job（matrix 可选 windows/macos）：装 Rust 工具链 + Tauri 依赖 → `pnpm tauri build`（或 `cargo build` 验证）。
- 仅验证构建通过，作为桌面发布前的回归闸门。

## 4. 验收清单
- [x] 3b：A4 合并后，CI 含收件箱冒烟 job，确认闭环路径在 CI 跑通并出截图 artifact。（`ci.yml` `visual-smoke`：`visual:loop --once` 含 `?visual=inbox` 同意→空态）
- [ ] 3c：B3 合并后，CI 冒烟覆盖轨迹/预览。
- [ ] 3d：CI 能在干净环境完成一次 Tauri 构建（绿）。
- [ ] 每批都不显著拖慢主 `check` job（重活放独立 job / 仅特定触发）。

## 5. 风险与对策
| 风险 | 对策 |
|---|---|
| e2e 不稳定（flaky） | 关键路径优先、重试、超时；先冒烟后扩面 |
| Tauri 构建慢/重 | 独立 job、缓存 cargo、必要时仅在 release 分支/tag 触发 |
| 视觉对比误报 | 用 `pixelmatch` 阈值 + 稳定视口（复用现有 `visual:*` 配置） |

## 6. DoD
A4/B3 的 UI 路径在 CI 有冒烟守护；桌面发布前 Tauri 构建在 CI 验证通过。
