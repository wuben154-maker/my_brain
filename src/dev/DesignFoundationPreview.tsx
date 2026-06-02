import { GlassCard } from "@/components/ui/GlassCard";

/** Dev-only harness — `VITE_DESIGN_PREVIEW=true pnpm dev` */
export function DesignFoundationPreview() {
  return (
    <div className="min-h-screen bg-bg-base p-7 text-primary">
      <header className="mb-6 space-y-2">
        <p className="font-hud text-label uppercase tracking-hud text-muted">
          design foundation
        </p>
        <h1 className="font-hud text-display font-medium uppercase tracking-hud text-accent-cyan">
          GlassCard · Token Check
        </h1>
        <p className="text-body text-secondary">
          仅验证 DESIGN.md token 与玻璃面板规范，非产品页面。
        </p>
      </header>

      <div className="grid max-w-3xl gap-5">
        <GlassCard>
          <p className="font-hud text-label uppercase tracking-hud text-muted">
            默认玻璃卡
          </p>
          <h2 className="mt-2 text-h2 font-medium">bg-panel · border-hud · glow-soft</h2>
          <p className="mt-3 text-body text-secondary">
            背景、描边、圆角、内高光均来自 :root / tailwind theme.extend。
          </p>
        </GlassCard>

        <GlassCard active>
          <p className="font-hud text-label uppercase tracking-hud text-accent-cyan">
            激活态
          </p>
          <h2 className="mt-2 text-h2 font-medium text-primary">
            border-hud-active · shadow-glow-cyan
          </h2>
          <p className="mt-3 text-body text-secondary">
            用于 suggest-then-confirm 等高可辨识操作容器。
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="mb-4 font-hud text-label uppercase tracking-hud text-muted">
            语义色 · 间距阶梯
          </p>
          <ul className="space-y-3 text-body">
            <li className="flex items-center justify-between gap-4">
              <span className="text-secondary">status-ok</span>
              <span className="text-status-ok">就绪</span>
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="text-secondary">status-syncing</span>
              <span className="inline-flex items-center gap-2 text-status-syncing">
                <span
                  className="h-3 w-3 animate-sync-spin rounded-full border border-status-syncing border-t-transparent"
                  aria-hidden
                />
                同步中
              </span>
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="text-secondary">status-warn</span>
              <span className="text-status-warn">待配置</span>
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="text-secondary">node-violet / node-amber</span>
              <span className="flex gap-3">
                <span className="text-node-violet">图谱</span>
                <span className="text-node-amber">聚类</span>
              </span>
            </li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
