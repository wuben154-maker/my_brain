import { CurationReportOverlay } from "@/components/curation/CurationReportOverlay";
import { InterviewOverlay } from "@/components/interview/InterviewOverlay";
import { WeeklyReviewOverlay } from "@/components/review/WeeklyReviewOverlay";
import { SciFiAtmosphere } from "@/components/shell/SciFiAtmosphere";
import { GraphHistoryPanel } from "@/components/shell/GraphHistoryPanel";
import { GraphUndoControl } from "@/components/shell/GraphUndoControl";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { RelationLegend } from "@/components/brain/RelationLegend";
import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import { CompanionVoicePresence } from "@/components/voice/CompanionVoicePresence";
import { VisualVoiceOrb } from "@/components/voice/VisualVoiceChrome";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useEffect } from "react";

function GraphHistoryBootstrap(): null {
  const storage = useAppStore((state) => state.storage);
  const loaded = useGraphHistoryStore((state) => state.loaded);
  const load = useGraphHistoryStore((state) => state.load);

  useEffect(() => {
    if (!storage || loaded) {
      return;
    }
    void load(storage);
  }, [storage, loaded, load]);

  return null;
}

/** V0 companion shell — full-screen star graph + floating voice orb. */
export function ImmersiveScene() {
  const showcaseDemo = isShowcaseDemoMode();

  return (
    <div
      data-testid="immersive-scene"
      className="companion-nebula relative h-full w-full overflow-hidden"
    >
      <SciFiAtmosphere showCorners={false} />
      <GraphHistoryBootstrap />
      <GraphHistoryPanel />
      <CurationReportOverlay />
      <InterviewOverlay />
      <WeeklyReviewOverlay />
      <div className="pointer-events-auto absolute bottom-4 right-5 z-20">
        <GraphUndoControl fallback />
      </div>
      {showcaseDemo ? (
        <div
          data-testid="showcase-demo-badge"
          className="pointer-events-none absolute left-5 top-5 z-20 rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-1 text-xs tracking-wide text-cyan-200"
        >
          Showcase · Mock Demo
        </div>
      ) : null}
      <div className="pointer-events-auto absolute right-5 top-5 z-20">
        <SettingsOverlay companionCorner />
      </div>

      <div className="relative z-10 h-full w-full">
        <div
          data-testid="graph-pane"
          className="companion-graph-pane relative h-full min-h-0 w-full overflow-hidden"
        >
          <BrainGraphView immersiveMinimalHud />
          <div className="pointer-events-none absolute bottom-4 left-4 z-20">
            <RelationLegend />
          </div>
        </div>

        <div
          data-testid="voice-orb-region"
          className="pointer-events-none absolute right-[7%] top-1/2 z-20 flex -translate-y-1/2 flex-col items-center"
        >
          <div className="companion-voice-orb-mount">
            <VisualVoiceOrb />
            <VoiceOrb immersiveChromeless />
          </div>
          <CompanionVoicePresence />
        </div>
      </div>
    </div>
  );
}
