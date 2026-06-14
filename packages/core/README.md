# packages/core

> **状态**：M0 public API 边界已落地（类型/错误/接口/mock/env/invariants 占位）。

`@my-brain/core` 是纯 TypeScript 业务内核，供 `apps/mobile` 与 legacy Web/Tauri 复用。

## 脚本

```bash
pnpm --filter @my-brain/core run typecheck
pnpm --filter @my-brain/core run lint:boundaries
pnpm --filter @my-brain/core test
```

## 目录

| 路径 | 责任 |
|------|------|
| `src/domain/` | `UserModeProfile`, `AdaptiveSignal`（M0 契约） |
| `src/errors/` | 移动错误注册表类 |
| `src/env/` | `ReadAppEnv` 端口与 `AppEnv` 类型 |
| `src/providers/` | Provider 接口 + mock factories |
| `src/storage/` | `StoragePort` 占位（M2 实现） |
| `src/invariants/` | 产品不变量列表 + 冒烟测试 |
| `scripts/lint-boundaries.mjs` | 禁止 import 扫描 |

详见 [`PUBLIC_API.md`](./PUBLIC_API.md)。

## 禁止泄漏

React/RN、Zustand、`import.meta.env`、DOM、Web Audio、UI 库 — M0-GATE 由 `lint:boundaries` 强制。
