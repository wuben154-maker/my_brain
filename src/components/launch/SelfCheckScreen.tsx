import { useAppStore } from "@/stores/appStore";

export function SelfCheckScreen() {
  const checks = useAppStore((state) => state.selfChecks);

  return (
    <section className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <p className="text-sm uppercase tracking-[0.35em] text-brain-muted">
        系统自检
      </p>
      <h1 className="text-2xl font-medium text-white">启动前环境检查</h1>
      <ul className="w-full max-w-md space-y-3 text-left">
        {checks.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-brain-panel/80 px-4 py-3"
          >
            <span className="text-sm text-slate-200">{item.label}</span>
            <span className={item.ok ? "text-emerald-400" : "text-amber-400"}>
              {item.ok ? "就绪" : "待配置"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
