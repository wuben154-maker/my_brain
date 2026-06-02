import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { ManualGraphPanel } from "@/components/brain/ManualGraphPanel";
import { NewsIngestPanel } from "@/components/brain/NewsIngestPanel";
import { LoadingScreen } from "@/components/launch/LoadingScreen";
import { BootSelfCheck } from "@/components/launch/BootSelfCheck";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { useAppStore } from "@/stores/appStore";

export function AppShell() {
  const phase = useAppStore((state) => state.phase);
  const errorMessage = useAppStore((state) => state.errorMessage);

  if (phase === "self_check") {
    return <BootSelfCheck />;
  }

  if (phase === "loading") {
    return <LoadingScreen />;
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

  return (
    <div
      data-testid="main-shell"
      className="grid h-full grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]"
    >
      <section className="relative min-h-0">
        <BrainGraphView />
        <ManualGraphPanel />
        <NewsIngestPanel />
      </section>
      <VoicePanel />
    </div>
  );
}
