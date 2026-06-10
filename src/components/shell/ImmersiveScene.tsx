import { CurationReportOverlay } from "@/components/curation/CurationReportOverlay";
import { InterviewOverlay } from "@/components/interview/InterviewOverlay";
import { WeeklyReviewOverlay } from "@/components/review/WeeklyReviewOverlay";
import {
  CompanionShell,
  type CompanionShellSlot,
} from "@/components/companion/CompanionShell";
import { CurationCompanionCard } from "@/components/companion/CurationCompanionCard";
import { RadarCompanionCard } from "@/components/companion/RadarCompanionCard";
import { WeeklyReviewCompanionCard } from "@/components/companion/WeeklyReviewCompanionCard";
import { useOpenWeeklyBrainReview } from "@/hooks/useOpenWeeklyBrainReview";
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
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";
import { useCallback, useEffect, useState } from "react";

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

/**
 * V0 companion shell — full-screen star graph + floating voice orb.
 *
 * Region map (KP-00):
 * - graph-pane: primary force-directed stage (z-10)
 * - companion-shell: canonical Radar/curation/review/action carrier (z-20)
 * - voice-orb-region: voice-first companion entry (z-20)
 * - settings-corner: configuration only, not mainflow (z-20)
 * - legacy overlays below: auxiliary surfaces pending KP-02/KP-03 migration
 */
export function ImmersiveScene() {
  const showcaseDemo = isShowcaseDemoMode();
  const phase = useAppStore((state) => state.phase);
  const todayItems = useBriefingStore((state) => state.todayItems);
  const reportEntryId = useGraphHistoryStore((state) => state.reportEntryId);
  const companionReviewOpen = useWeeklyReviewStore((state) => state.companionOpen);
  const closeReview = useWeeklyReviewStore((state) => state.closeReview);
  const openWeeklyReview = useOpenWeeklyBrainReview();
  const [activeSlot, setActiveSlot] = useState<CompanionShellSlot | null>(null);

  useEffect(() => {
    if (phase === "companion" && todayItems.length > 0) {
      setActiveSlot((current) => (current === "curation" || current === "review" ? current : current ?? "radar"));
    }
  }, [phase, todayItems.length]);

  useEffect(() => {
    if (reportEntryId) {
      setActiveSlot("curation");
    }
  }, [reportEntryId]);

  useEffect(() => {
    if (companionReviewOpen) {
      setActiveSlot("review");
    }
  }, [companionReviewOpen]);

  const handleOpenReviewFromCuration = useCallback(() => {
    openWeeklyReview();
    setActiveSlot("review");
  }, [openWeeklyReview]);

  const handleShellClose = useCallback(() => {
    setActiveSlot(null);
    closeReview();
  }, [closeReview]);

  const handleShellBack = useCallback(() => {
    if (activeSlot === "review") {
      setActiveSlot("curation");
      closeReview();
    }
  }, [activeSlot, closeReview]);

  return (
    <div
      data-testid="immersive-scene"
      className="companion-nebula relative h-full w-full overflow-hidden"
    >
      <SciFiAtmosphere showCorners={false} />
      <GraphHistoryBootstrap />
      <GraphHistoryPanel />
      {/* Legacy auxiliary overlays — do not add new KP UI here; migrate into CompanionShell slots. */}
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
          <CompanionShell
            activeSlot={activeSlot ?? undefined}
            radar={<RadarCompanionCard />}
            curation={
              <CurationCompanionCard onOpenReview={handleOpenReviewFromCuration} />
            }
            review={<WeeklyReviewCompanionCard />}
            onBack={activeSlot === "review" ? handleShellBack : undefined}
            onClose={handleShellClose}
          />
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
