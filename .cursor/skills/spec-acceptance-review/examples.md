# 输出示例（lite 默认）

## 合格

```
AW-01 验收：合格

验证：go test ./internal/agent/... ✓ · web tsc ✓
范围：无漂移
```

## 不合格

```
AW-02 验收：不合格

- AC-01：刷新后会话未恢复（无持久化读取逻辑）
- 验证：go test ./internal/console/... exit 1
- 漂移：`web/src/lib/billing.ts`
```

## 阻塞

```
AW-08 验收：阻塞

- AC-02：需登录态，本地无 auth bootstrap
```

## 不要这样（反例）

❌ 50 行 markdown 报告  
❌ 合格时逐条列出 AC-01 ✓ AC-02 ✓  
❌ 每个 spec 都跑 `go test ./...` + 全量 web build + `/qa` 整站
