import { useCallback, useState } from "react";
import type { UnderstandingLevel } from "@/domain/profile";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { buildProfileTeachingRationale } from "@/conversation/teachingDepth";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useProfileStore } from "@/stores/profileStore";
import { primaryBriefingSignal } from "@/domain/radar/briefingItem";

const UNDERSTANDING_OPTIONS: { value: UnderstandingLevel; label: string }[] = [
  { value: "unfamiliar", label: "未接触" },
  { value: "heard", label: "听过" },
  { value: "can_explain", label: "能解释" },
];

const DEMO_RAG_ID = "demo-rag";

export function ProfilePanel() {
  const storage = useAppStore((state) => state.storage);
  const profile = useProfileStore((state) => state.profile);
  const applyCorrection = useProfileStore((state) => state.applyCorrection);
  const undoLastCorrection = useProfileStore((state) => state.undoLastCorrection);
  const persistWarning = useProfileStore((state) => state.persistWarning);
  const lastCorrection = useProfileStore((state) => state.lastCorrection);
  const todayItems = useBriefingStore((state) => state.todayItems);

  const primarySignal = todayItems[0]
    ? primaryBriefingSignal(todayItems[0])
    : undefined;
  const rationaleLines = buildProfileTeachingRationale(profile, primarySignal);

  const interestEntries =
    profile.interestEntries ?? DEFAULT_USER_PROFILE.interestEntries ?? [];
  const understanding =
    profile.understanding ?? DEFAULT_USER_PROFILE.understanding ?? {};
  const explainPrefs =
    profile.explainPrefs ?? DEFAULT_USER_PROFILE.explainPrefs;

  const [ragLevel, setRagLevel] = useState<UnderstandingLevel>(
    understanding[DEMO_RAG_ID] ?? "heard",
  );
  const [voiceWeight, setVoiceWeight] = useState(
    String(
      interestEntries.find((entry) => entry.id === "voice_realtime")?.weight ??
        0.5,
    ),
  );
  const [busy, setBusy] = useState(false);

  const saveCorrections = useCallback(async () => {
    setBusy(true);
    try {
      await applyCorrection(
        {
          understanding: { [DEMO_RAG_ID]: ragLevel },
          interestWeights: {
            voice_realtime: Number.parseFloat(voiceWeight),
          },
        },
        storage,
      );
    } finally {
      setBusy(false);
    }
  }, [applyCorrection, ragLevel, storage, voiceWeight]);

  const handleUndo = useCallback(async () => {
    setBusy(true);
    try {
      await undoLastCorrection(storage);
      const latest = useProfileStore.getState().profile;
      setRagLevel(latest.understanding?.[DEMO_RAG_ID] ?? "heard");
      setVoiceWeight(
        String(
          latest.interestEntries?.find((entry) => entry.id === "voice_realtime")
            ?.weight ?? 0.5,
        ),
      );
    } finally {
      setBusy(false);
    }
  }, [storage, undoLastCorrection]);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      data-testid="profile-panel"
    >
      <header>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
          画像
        </p>
        <h2 className="text-h2 text-primary">我的兴趣与理解</h2>
      </header>

      {persistWarning ? (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          data-testid="profile-persist-warning"
        >
          画像已更新到内存，但未能写入本地存储。
        </p>
      ) : null}

      <GlassCard
        className="flex flex-col gap-2 p-4 text-sm"
        data-testid="profile-teaching-rationale"
      >
        <h3 className="font-medium text-primary">为何推荐 / 讲解</h3>
        <ul className="flex flex-col gap-1 text-secondary">
          {rationaleLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-medium text-primary">兴趣权重</h3>
        <ul className="flex flex-col gap-2" data-testid="profile-interest-list">
          {interestEntries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between text-sm">
              <span>{entry.label}</span>
              <span data-testid={`profile-interest-weight-${entry.id}`}>
                {entry.id === "voice_realtime" ? (
                  <input
                    aria-label={`${entry.label} 权重`}
                    className="w-16 rounded border border-white/10 bg-black/20 px-2 py-1 text-right"
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={voiceWeight}
                    onChange={(event) => setVoiceWeight(event.target.value)}
                  />
                ) : (
                  entry.weight.toFixed(1)
                )}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-medium text-primary">理解程度</h3>
        <label className="flex flex-col gap-1 text-sm">
          <span>RAG（demo-rag）</span>
          <select
            aria-label="RAG 理解程度"
            className="rounded border border-white/10 bg-black/20 px-2 py-2"
            data-testid="profile-understanding-demo-rag"
            value={ragLevel}
            onChange={(event) =>
              setRagLevel(event.target.value as UnderstandingLevel)
            }
          >
            {UNDERSTANDING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </GlassCard>

      <GlassCard className="flex flex-col gap-2 p-4 text-sm" data-testid="profile-explain-prefs">
        <h3 className="font-medium text-primary">讲解偏好</h3>
        <p>比喻优先：{explainPrefs?.preferMetaphor ? "是" : "否"}</p>
        <p>源码优先：{explainPrefs?.preferSourceCode ? "是" : "否"}</p>
        <p>架构优先：{explainPrefs?.preferArchitecture ? "是" : "否"}</p>
        <p>面试优先：{explainPrefs?.preferInterview ? "是" : "否"}</p>
      </GlassCard>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md bg-accent-cyan/20 px-4 py-2 text-sm text-accent-cyan disabled:opacity-50"
          data-testid="profile-save-correction"
          disabled={busy}
          onClick={() => void saveCorrections()}
        >
          保存修正
        </button>
        <button
          type="button"
          className="rounded-md border border-white/15 px-4 py-2 text-sm text-secondary disabled:opacity-40"
          data-testid="profile-undo-correction"
          disabled={busy || !lastCorrection}
          onClick={() => void handleUndo()}
        >
          撤销修正
        </button>
      </div>
    </section>
  );
}
