# Mobile UI Assets (v2)

> **2026-06-12**：v1 HUD 科幻稿已全部作废并删除。当前仅保留文字规格。

## 文件

| 文件 | 说明 |
|------|------|
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 双主题、组件、动效、口语文案令牌 |
| [SCREEN_SPECS.md](./SCREEN_SPECS.md) | 屏幕状态机、分模式情境卡、交互细节 |

## 审阅稿（v2）

| 文件 | 说明 |
|------|------|
| `v2-launch-reference.html` / `.png` | 启动屏 |
| `v2-home-reference.html` / `.png` | 主屏 · `empty_invite`（首次空星座） |
| `v2-home-adaptive-tech-reference.*` | 冷启动后 · **技术追踪者** |
| `v2-home-adaptive-learner-reference.*` | 冷启动后 · **学习者** |
| `v2-home-adaptive-creator-reference.*` | 冷启动后 · **创作者/研究者** |
| `v2-home-adaptive-founder-reference.*` | 冷启动后 · **创业/项目型** |
| `v2-home-adaptive-memory-reference.*` | 冷启动后 · **个人记忆/生活型** |
| `v2-home-star-tap-reference.*` | **点星出摘要**交互态 |
| `generate-v2-adaptive-screens.mjs` | 从规格生成五模式 HTML |
| `render-v2-screens.mjs` | Playwright 导出全部 PNG |

```bash
node specs/mobile-app/assets/ui/generate-v2-adaptive-screens.mjs
node specs/mobile-app/assets/ui/render-v2-screens.mjs
```

## 产品依据

- [docs/MOBILE_PRODUCT_PLAN.md](../../../docs/MOBILE_PRODUCT_PLAN.md) — User Evolution-first、AdaptiveRadar、冷启动分流
