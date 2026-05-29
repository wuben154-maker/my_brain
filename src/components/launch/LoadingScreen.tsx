import { useAppStore } from "@/stores/appStore";

export function LoadingScreen() {
  const message = useAppStore((state) => state.loadingMessage);
  const count = useAppStore((state) => state.newsQueue.length);

  return (
    <section className="relative flex h-full flex-col items-center justify-center overflow-hidden px-8 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_60%)]" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="h-28 w-28 animate-pulse-glow rounded-full border border-brain-glow/40 bg-brain-glow/10 shadow-[0_0_60px_rgba(96,165,250,0.35)]" />
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-brain-muted">
            数据流注入
          </p>
          <h1 className="mt-2 text-2xl font-medium text-white">{message}</h1>
          <p className="mt-3 text-sm text-slate-400">
            已抓取 {count} 条候选资讯，正在同步到你的大脑星图…
          </p>
        </div>
      </div>
    </section>
  );
}
