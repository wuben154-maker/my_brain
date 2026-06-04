import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { GraphUndoControl } from "@/components/shell/GraphUndoControl";
import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import { VoiceOrb } from "@/components/voice/VoiceOrb";

/** V0 companion shell — full-screen graph + voice orb + settings corner. */
export function ImmersiveScene() {
  return (
    <div
      data-testid="immersive-scene"
      className="relative h-full w-full overflow-hidden"
    >
      <div className="absolute inset-0">
        <BrainGraphView />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-6">
        <div className="pointer-events-auto">
          <VoiceOrb />
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <GraphUndoControl />
        <SettingsOverlay />
      </div>
    </div>
  );
}
