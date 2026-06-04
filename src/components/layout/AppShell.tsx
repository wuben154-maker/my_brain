import { useEffect } from "react";
import { LaunchScene } from "@/components/launch/LaunchScene";
import { ImmersiveScene } from "@/components/shell/ImmersiveScene";
import { useAgentScheduler } from "@/hooks/useAgentScheduler";
import { useAppStore } from "@/stores/appStore";

export function AppShell() {
  const phase = useAppStore((state) => state.phase);
  const errorMessage = useAppStore((state) => state.errorMessage);

  useAgentScheduler();

  useEffect(() => {
    return undefined;
  }, []);

  if (phase === "boot" || phase === "self_check" || phase === "loading") {
    return <LaunchScene />;
  }

  if (phase === "error") {
    return (
      <section className="flex h-full items-center justify-center px-8 text-center">
        <div>
          <h1 className="text-h1 text-status-error">启动失败</h1>
          <p className="mt-3 text-body text-secondary">{errorMessage}</p>
        </div>
      </section>
    );
  }

  if (phase !== "companion") {
    return null;
  }

  return <ImmersiveScene />;
}
