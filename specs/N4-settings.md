# N4 — 设置（`settings`）

- **阶段：** A（建议跟 A5，因 A5 需要「设置里开关调度」）· **状态：** 📝 待做
- **上游：** N0、A5（调度开关/频率）、现有 Provider 模式与人格预设· **下游：** 后续画像/人格相关

## 1. 目标
把「设置」导航项做成统一设置区，汇总：①A5 本机调度开关与频率；②Provider 模式（mock / 真实 API，对齐 `voiceProviderMode`/`llmProviderMode`）；③人格预设选择（PRODUCT.md 人格预设）；④隐私/数据说明（本地优先声明 + 清除本地数据入口的占位）。让 A5「在设置里开关」有真实落点。

## 2. 非目标
- 不在前端硬编码/明文展示 API Key（密钥走 env/`.env`，不变量：不提交密钥）。
- 不实现云同步设置（云为后续迭代）。
- 调度引擎本身属 A5；本 spec 只负责设置 UI 与持久化开关项。

## 3. 契约
```
src/components/settings/SettingsPanel.tsx     // 分组设置：调度 / Provider 模式 / 人格 / 隐私
src/stores/settingsStore.ts (或扩展现有)       // 持久化：scheduleEnabled, scheduleFreq, personaPreset 等
```
- 调度项读写交给 A5 暴露的接口（本 spec 依赖 A5 的开关/频率 API；若 A5 先行则直接接）。
- Provider 模式只读展示当前模式（mock/openai）+ 切换入口（实际切换机制沿用现有 `*ProviderMode`）。
- 挂载：`NAV_SECTIONS` 中 `settings` 改 `live`，分区渲染 `<SettingsPanel>`。

## 4. 验收清单
- [ ] 调度开关/频率读写生效（关→不触发 `MorningBriefJob`，开→按频率触发；与 A5 验收一致）。
- [ ] 人格预设切换后影响后续语音/讲解风格（与画像/人格逻辑对接）。
- [ ] 不在 UI 暴露任何密钥明文。
- [ ] 截图留证。

## 5. 测试（harness）
- `settingsStore.test.ts`：开关/频率/人格持久化读写。
- `SettingsPanel` 交互测试：切换调用对应 setter；调度关闭后调度器不触发（与 A5 用例联动）。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 与 A5 职责边界模糊 | A5=调度引擎+触发；N4=设置 UI+持久化开关。二者共用一组 schedule 配置接口 |
| 误暴露密钥 | 仅做模式只读 + 文案引导用 `.env`；加测试断言面板不渲染 key 字段 |

## 7. DoD
`pnpm check` 全绿 + 截图；与 A5 联动用例通过；无密钥泄露。
