import { SciFiAtmosphere } from "@/components/shell/SciFiAtmosphere";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { RelationLegend } from "@/components/brain/RelationLegend";
import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import { CompanionVoicePresence } from "@/components/voice/CompanionVoicePresence";
import { VisualVoiceOrb } from "@/components/voice/VisualVoiceChrome";
import { VoiceOrb } from "@/components/voice/VoiceOrb";

/** V0 companion shell — full-screen star graph + floating voice orb. */
export function ImmersiveScene() {
  return (
    <div
      data-testid="immersive-scene"
      className="companion-nebula relative h-full w-full overflow-hidden"
    >
      <SciFiAtmosphere showCorners={false} />
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
