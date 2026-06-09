import { useCallback, useEffect, useState } from "react";
import type { PersonaPreset } from "@/domain/profile";
import { getAgentSchedulerRuntime } from "@/agent/schedulerRuntime";
import {
  loadSchedulerSettings,
  saveSchedulerSettings,
  MIN_SCHEDULER_INTERVAL_MS,
  type StoredSchedulerSettings,
  DEFAULT_SCHEDULER_SETTINGS,
} from "@/agent/schedulerSettings";
import { readLlmProviderMode } from "@/lib/llmProviderMode";
import { readVoiceProviderMode } from "@/lib/voiceProviderMode";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

const PERSONA_OPTIONS: { id: PersonaPreset; label: string }[] = [
  { id: "mentor", label: "导师" },
  { id: "companion", label: "伙伴" },
  { id: "geek", label: "极客" },
];

const INTERVAL_OPTIONS = [
  { ms: 60 * 60 * 1000, label: "每 1 小时" },
  { ms: 3 * 60 * 60 * 1000, label: "每 3 小时" },
  { ms: 6 * 60 * 60 * 1000, label: "每 6 小时" },
  { ms: 12 * 60 * 60 * 1000, label: "每 12 小时" },
];

export function SettingsPanel() {
  const storage = useAppStore((state) => state.storage);
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);

  const [schedule, setSchedule] = useState<StoredSchedulerSettings>({
    ...DEFAULT_SCHEDULER_SETTINGS,
  });
  const [scheduleBusy, setScheduleBusy] = useState(false);

  const refreshSchedule = useCallback(async () => {
    const runtime = getAgentSchedulerRuntime();
    if (runtime) {
      setSchedule(runtime.getSettings());
      return;
    }
    if (storage) {
      setSchedule(await loadSchedulerSettings(storage));
    }
  }, [storage]);

  useEffect(() => {
    void refreshSchedule();
  }, [refreshSchedule]);

  const applySchedule = async (partial: Partial<StoredSchedulerSettings>) => {
    setScheduleBusy(true);
    try {
      const runtime = getAgentSchedulerRuntime();
      if (runtime) {
        setSchedule(await runtime.updateSettings(partial));
        return;
      }
      if (!storage) {
        return;
      }
      const next = { ...schedule, ...partial };
      await saveSchedulerSettings(storage, next);
      setSchedule(next);
    } finally {
      setScheduleBusy(false);
    }
  };

  const savePersona = async (persona: PersonaPreset) => {
    if (!storage) {
      return;
    }
    const next = {
      ...profile,
      persona,
      updatedAt: new Date().toISOString(),
    };
    setProfile(next);
    await storage.saveUserProfile(next);
  };

  const voiceMode = readVoiceProviderMode();
  const llmMode = readLlmProviderMode();

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      data-testid="section-settings"
    >
      <header>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
          设置
        </p>
        <h2 className="text-h2 text-primary">偏好与隐私</h2>
      </header>

      <GlassCard className="flex flex-col gap-3 p-4" data-testid="settings-scheduler">
        <h3 className="text-h3 text-primary">本机调度（L1）</h3>
        <p className="text-caption text-muted">
          应用运行时在后台定时跑晨间简报，结果进入智能体收件箱。电脑关机期间不会执行。
        </p>
        <label className="flex items-center gap-2 text-body text-primary">
          <input
            type="checkbox"
            checked={schedule.enabled}
            disabled={scheduleBusy}
            onChange={(event) =>
              void applySchedule({ enabled: event.target.checked })
            }
            data-testid="settings-scheduler-enabled"
          />
          启用自动简报
        </label>
        <label className="flex flex-col gap-1 text-caption text-secondary">
          触发频率
          <select
            className="rounded-sm border border-hud bg-bg-elevated px-2 py-1.5 text-body text-primary"
            value={schedule.intervalMs}
            disabled={scheduleBusy || !schedule.enabled}
            onChange={(event) =>
              void applySchedule({
                intervalMs: Math.max(
                  MIN_SCHEDULER_INTERVAL_MS,
                  Number(event.target.value),
                ),
              })
            }
            data-testid="settings-scheduler-interval"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.ms} value={option.ms}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={scheduleBusy}
          className="self-start rounded-sm border border-hud px-3 py-1.5 text-caption text-primary disabled:opacity-40"
          data-testid="settings-scheduler-trigger-now"
          onClick={() =>
            void getAgentSchedulerRuntime()?.scheduler.triggerNow()
          }
        >
          立即跑一次简报
        </button>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4" data-testid="settings-providers">
        <h3 className="text-h3 text-primary">Provider 模式</h3>
        <p className="text-caption text-muted">
          通过项目根目录 <code className="text-secondary">.env</code> 配置，重启应用后生效。界面不会显示或保存 API 密钥。
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body">
          <dt className="text-muted">语音</dt>
          <dd data-testid="settings-voice-mode">{voiceMode}</dd>
          <dt className="text-muted">LLM</dt>
          <dd data-testid="settings-llm-mode">{llmMode}</dd>
        </dl>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4" data-testid="settings-persona">
        <h3 className="text-h3 text-primary">人格预设</h3>
        <div className="flex flex-wrap gap-2">
          {PERSONA_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => void savePersona(option.id)}
              className={[
                "rounded-sm border px-3 py-1.5 text-caption",
                profile.persona === option.id
                  ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                  : "border-hud text-secondary hover:text-primary",
              ].join(" ")}
              data-testid={`settings-persona-${option.id}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-2 p-4" data-testid="settings-privacy">
        <h3 className="text-h3 text-primary">隐私与数据</h3>
        <p className="text-caption text-secondary">
          本地优先：知识图谱与用户画像存于本机 SQLite；对话与资讯原文不会持久化。清除本地数据入口将在后续版本提供。
        </p>
      </GlassCard>

      <ProfilePanel />
    </section>
  );
}
