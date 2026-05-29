import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { LoadingScreen } from "@/components/launch/LoadingScreen";
import { SelfCheckScreen } from "@/components/launch/SelfCheckScreen";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { useAppStore } from "@/stores/appStore";

export function AppShell() {
  const phase = useAppStore((state) => state.phase);
  const errorMessage = useAppStore((state) => state.errorMessage);

  if (phase === "self_check") {
    return <SelfCheckScreen />;
  }

  if (phase === "loading") {
    return <LoadingScreen />;
  }

  if (phase === "error") {
    return (
      <section className="flex h-full items-center justify-center px-8 text-center">
        <div>
          <h1 className="text-xl text-red-300">启动失败</h1>
          <p className="mt-3 text-sm text-slate-400">{errorMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-h-0">
        <BrainGraphView />
      </section>
      <VoicePanel />
    </div>
  );
}
