# apps/mobile

> **状态**：M0 Expo 空壳占位（非业务 UI）。LivingBrainHome 等业务屏从 M1 起实现。

`apps/mobile` 是 iOS / Android **App-only 第一入口**。业务规则、入库门控、provider 接口和 storage 契约必须从 `@my-brain/core` 消费。

## M0 交付

| 项 | 路径 |
|----|------|
| Expo 配置 | `app.json` |
| 占位屏 | `App.tsx` — 「M0 · Expo shell placeholder」 |
| 入口 | `index.js` |
| 包清单 | `package.json`, `tsconfig.json` |

M0 依赖已安装时：

```bash
pnpm --filter @my-brain/mobile start
pnpm --filter @my-brain/mobile run expo:config
```

M0-GATE 证据见 `specs/mobile-app/reports/M0-GATE-report.md`（含 `expo config` + Metro smoke）。

## App 信息架构（文档级，M1+ 实现）

```text
LivingBrainHome
  ├── ColdStartDialogue
  ├── AdaptiveRadar
  ├── QuickCapture（M4）
  ├── MemoryWeather / MemoryReplay（M5）
  └── Settings / ProfileReview
```

## 禁止事项

- 长期 provider 密钥进 APK/IPA
- 复制 `packages/core` 业务逻辑
- M2 前 LivingBrainHome 读写 SQLite
- raw audio / full article 落盘
