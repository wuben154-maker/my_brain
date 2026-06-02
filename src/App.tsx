import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { createGraphDemoSnapshot, isGraphDemoMode } from "@/lib/graphDemoSeed";
import { runLaunchSequence } from "@/lib/runLaunchSequence";
import {
  applyVisualSnapshot,
  readVisualSnapshotId,
} from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";

export default function App() {
  const phase = useAppStore((state) => state.phase);
  const visualSnapshot = readVisualSnapshotId();
  const isBoot = phase === "self_check";
  const launchRequested = useRef(false);

  useEffect(() => {
    if (launchRequested.current) {
      return;
    }
    launchRequested.current = true;

    const visualSnapshot = readVisualSnapshotId();
    if (visualSnapshot) {
      applyVisualSnapshot(visualSnapshot);
      return;
    }

    if (isGraphDemoMode()) {
      useGraphStore.getState().setGraph(createGraphDemoSnapshot());
      useAppStore.getState().setPhase("ready");
      return;
    }

    void runLaunchSequence();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-primary">
      {!isBoot && visualSnapshot !== "main" ? (
        <header className="border-b border-hud px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="font-hud text-label uppercase tracking-hud text-muted">
                my_brain
              </p>
              <h1 className="text-h2 font-medium text-primary">
                你的 AI 大脑伴侣
              </h1>
            </div>
            <p className="text-caption text-secondary">
              本地优先 · 语音优先 · 图谱共建
            </p>
          </div>
        </header>
      ) : null}
      <main
        className={
          isBoot || visualSnapshot === "main"
            ? "h-screen w-full"
            : "mx-auto h-[calc(100vh-73px)] max-w-7xl p-4"
        }
      >
        <AppShell />
      </main>
    </div>
  );
}
