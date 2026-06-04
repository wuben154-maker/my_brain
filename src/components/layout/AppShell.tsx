import { useEffect } from "react";
import { LaunchScene } from "@/components/launch/LaunchScene";
import { MainSectionContent } from "@/components/layout/MainSectionContent";
import { NavRail } from "@/components/layout/NavRail";
import { TopBar } from "@/components/layout/TopBar";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { ManualGraphPanel } from "@/components/brain/ManualGraphPanel";
import { NewsIngestPanel } from "@/components/brain/NewsIngestPanel";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { ImmersiveScene } from "@/components/shell/ImmersiveScene";
import { useAgentScheduler } from "@/hooks/useAgentScheduler";
import { useProposalInboxInit } from "@/hooks/useProposalInboxInit";
import {
  readVisualSnapshotId,
  type VisualSnapshotId,
} from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { bindUiStoreHashSync } from "@/stores/uiStore";

function isLegacyNavVisualSnapshot(id: VisualSnapshotId | null): boolean {
  return id === "inbox" || id === "insight";
}

export function AppShell() {
  const phase = useAppStore((state) => state.phase);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const visualId = readVisualSnapshotId();
  // Keep the frozen `?visual=main` baseline untouched for visual regression.
  const visualMain = visualId === "main";
  const visualLegacyNav = isLegacyNavVisualSnapshot(visualId);

  useProposalInboxInit();
  useAgentScheduler();

  useEffect(() => {
    if (visualMain || visualLegacyNav) {
      return;
    }
    return bindUiStoreHashSync();
  }, [visualMain, visualLegacyNav]);

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

  if (visualLegacyNav) {
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

  return <ImmersiveScene />;
}
