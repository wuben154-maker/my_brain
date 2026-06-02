import { useEffect } from "react";
import { LoadingScreen } from "@/components/launch/LoadingScreen";
import { BootSelfCheck } from "@/components/launch/BootSelfCheck";
import { MainSectionContent } from "@/components/layout/MainSectionContent";
import { NavRail } from "@/components/layout/NavRail";
import { TopBar } from "@/components/layout/TopBar";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { ManualGraphPanel } from "@/components/brain/ManualGraphPanel";
import { NewsIngestPanel } from "@/components/brain/NewsIngestPanel";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { useAgentScheduler } from "@/hooks/useAgentScheduler";
import { useProposalInboxInit } from "@/hooks/useProposalInboxInit";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { bindUiStoreHashSync } from "@/stores/uiStore";

export function AppShell() {
  const phase = useAppStore((state) => state.phase);
  const errorMessage = useAppStore((state) => state.errorMessage);
  // Keep the frozen `?visual=main` baseline untouched for visual regression.
  const visualMain = readVisualSnapshotId() === "main";

  useProposalInboxInit();
  useAgentScheduler();

  useEffect(() => {
    if (visualMain) {
      return;
    }
    return bindUiStoreHashSync();
  }, [visualMain]);

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

  if (visualMain) {
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

  return (
    <div data-testid="main-shell" className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <NavRail />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <MainSectionContent />
          <VoicePanel />
        </div>
      </div>
    </div>
  );
}
