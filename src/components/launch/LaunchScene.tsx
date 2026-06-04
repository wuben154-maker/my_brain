import { BootIntroScreen } from "@/components/launch/BootIntroScreen";
import { BootSelfCheck } from "@/components/launch/BootSelfCheck";
import { LoadingScreen } from "@/components/launch/LoadingScreen";
import { skipLaunchSelfCheckSpeech } from "@/lib/runLaunchSequence";
import { useAppStore } from "@/stores/appStore";

/** V1 launch shell: boot → self_check → loading (companion handled by AppShell). */
export function LaunchScene() {
  const phase = useAppStore((state) => state.phase);

  if (phase === "boot") {
    return <BootIntroScreen />;
  }

  if (phase === "self_check") {
    return <BootSelfCheck onSkipVoice={() => skipLaunchSelfCheckSpeech()} />;
  }

  if (phase === "loading") {
    return <LoadingScreen />;
  }

  return null;
}
