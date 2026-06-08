import { CompanionSelfCheckScreen } from "@/components/launch/CompanionSelfCheckScreen";
import { LoadingScreen } from "@/components/launch/LoadingScreen";
import { skipLaunchSelfCheckSpeech } from "@/lib/runLaunchSequence";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import { BootSelfCheck } from "@/components/launch/BootSelfCheck";
import { useAppStore } from "@/stores/appStore";

/** V2 launch shell: self_check → loading (companion handled by AppShell). */
export function LaunchScene() {
  const phase = useAppStore((state) => state.phase);
  const visualId = readVisualSnapshotId();

  if (phase === "self_check" || phase === "boot") {
    // Legacy ?visual=boot only — normal launch never mounts BootBrainSphere.
    if (visualId === "boot") {
      return <BootSelfCheck onSkipVoice={() => skipLaunchSelfCheckSpeech()} />;
    }
    return (
      <CompanionSelfCheckScreen onSkipVoice={() => skipLaunchSelfCheckSpeech()} />
    );
  }

  if (phase === "loading") {
    return <LoadingScreen />;
  }

  return null;
}
