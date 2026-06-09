import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  createRichGraphDemoSnapshot,
  isGraphDemoMode,
} from "@/lib/graphDemoSeed";
import { runLaunchSequence } from "@/lib/runLaunchSequence";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import { runShowcaseLaunchSequence } from "@/showcase/runShowcaseLaunchSequence";
import {
  applyVisualSnapshot,
  bootstrapVisualInboxStorage,
  readVisualSnapshotId,
} from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";

export default function App() {
  const launchRequested = useRef(false);

  useEffect(() => {
    if (launchRequested.current) {
      return;
    }
    launchRequested.current = true;

    const visualSnapshot = readVisualSnapshotId();
    if (visualSnapshot) {
      applyVisualSnapshot(visualSnapshot);
      if (visualSnapshot === "inbox") {
        void bootstrapVisualInboxStorage().then(() => {
          document.documentElement.dataset.visualInboxReady = "true";
        });
      }
      return;
    }

    if (isGraphDemoMode()) {
      useGraphStore.getState().setGraph(createRichGraphDemoSnapshot());
      useAppStore.getState().setPhase("companion");
      return;
    }

    void (isShowcaseDemoMode() ? runShowcaseLaunchSequence() : runLaunchSequence());
  }, []);

  return (
    <div className="h-screen bg-bg-base text-primary">
      <main className="h-screen w-full">
        <AppShell />
      </main>
    </div>
  );
}
