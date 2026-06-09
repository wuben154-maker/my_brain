import { useCallback, useEffect, useState } from "react";
import type { PersonaPreset } from "@/domain/profile";
import { readVoiceProviderMode } from "@/lib/voiceProviderMode";
import {
  readVoiceTimbrePreference,
  writeVoiceTimbrePreference,
} from "@/lib/voiceTimbrePreference";
import type { VoiceTimbre } from "@/providers/voice/types";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { useOpenWeeklyBrainReview } from "@/hooks/useOpenWeeklyBrainReview";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

const VOICE_OPTIONS: { id: VoiceTimbre; label: string }[] = [
  { id: "alloy", label: "Alloy" },
  { id: "echo", label: "Echo" },
  { id: "fable", label: "Fable" },
  { id: "onyx", label: "Onyx" },
  { id: "nova", label: "Nova" },
  { id: "shimmer", label: "Shimmer" },
];

const PERSONA_OPTIONS: { id: PersonaPreset; label: string }[] = [
  { id: "mentor", label: "导师" },
  { id: "companion", label: "伙伴" },
  { id: "geek", label: "极客" },
];

/** Thin cyan-outline gear — companion corner must not use the ⚙ text glyph. */
function SettingsGearIcon() {
  return (
    <svg
      data-testid="settings-gear-icon"
      viewBox="0 0 24 24"
      className="h-[1.05rem] w-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.5v2.1M12 19.4v2.1M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5" />
      <path d="M12 5.8a6.2 6.2 0 0 1 4.4 10.6l-.9.9a6.2 6.2 0 0 1-8.8 0l-.9-.9A6.2 6.2 0 0 1 12 5.8Z" opacity="0.55" />
    </svg>
  );
}

/** Corner settings: voice timbre + persona preset (V5). API keys stay in .env only. */
export function SettingsOverlay({
  companionCorner = false,
}: {
  /** Companion main: icon-only gear at top-right (§4). */
  companionCorner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [profileView, setProfileView] = useState(false);
  const providers = useAppStore((state) => state.providers);
  const storage = useAppStore((state) => state.storage);
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const voice = providers?.voice ?? null;
  const openWeeklyReview = useOpenWeeklyBrainReview();

  const [selectedTimbre, setSelectedTimbre] = useState<VoiceTimbre>(
    voice?.getVoice() ?? "alloy",
  );

  useEffect(() => {
    if (!voice) {
      return;
    }
    const saved = readVoiceTimbrePreference();
    const timbre = saved ?? voice.getVoice();
    voice.setVoice(timbre);
    setSelectedTimbre(timbre);
  }, [voice]);

  const onTimbreChange = useCallback(
    (timbre: VoiceTimbre) => {
      voice?.setVoice(timbre);
      writeVoiceTimbrePreference(timbre);
      setSelectedTimbre(timbre);
    },
    [voice],
  );

  const savePersona = useCallback(
    async (persona: PersonaPreset) => {
      const next = {
        ...profile,
        persona,
        updatedAt: new Date().toISOString(),
      };
      setProfile(next);
      if (storage) {
        await storage.saveUserProfile(next);
      }
    },
    [profile, setProfile, storage],
  );

  const voiceMode = readVoiceProviderMode();

  return (
    <>
      <button
        type="button"
        data-testid="settings-corner"
        aria-label="设置"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => {
            if (value) {
              setProfileView(false);
            }
            return !value;
          });
        }}
        className={
          companionCorner
            ? "flex h-7 w-7 items-center justify-center rounded-sm border border-accent-cyan/45 bg-bg-base/25 text-accent-cyan shadow-[0_0_14px_rgba(59,232,224,0.22)] backdrop-blur-sm transition hover:border-accent-cyan/70 hover:text-star hover:shadow-[0_0_18px_rgba(59,232,224,0.42)]"
            : "flex h-6 w-6 items-center justify-center rounded-full border border-hud bg-bg-elevated/80 text-secondary backdrop-blur-md transition hover:border-accent-cyan/50 hover:text-primary"
        }
      >
        <SettingsGearIcon />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={profileView ? "画像" : "设置"}
          data-testid="settings-overlay"
          className={[
            "absolute right-0 top-12 z-30 max-h-[min(32rem,80vh)] overflow-y-auto rounded-md border border-hud bg-bg-elevated/95 p-4 shadow-glow-cyan backdrop-blur-md",
            profileView ? "w-[min(24rem,90vw)]" : "w-72",
          ].join(" ")}
        >
          {profileView ? (
            <>
              <button
                type="button"
                data-testid="settings-profile-back"
                onClick={() => setProfileView(false)}
                className="text-caption text-accent-cyan hover:underline"
              >
                ← 返回设置
              </button>
              <div className="mt-3">
                <ProfilePanel />
              </div>
            </>
          ) : (
            <>
              <p className="font-hud text-label uppercase tracking-hud text-muted">
                设置
              </p>

              <section
                className="mt-4 flex flex-col gap-2"
                data-testid="settings-overlay-voice"
              >
                <h3 className="text-caption font-medium text-primary">音色</h3>
                <p className="text-caption text-muted">
                  当前语音模式：{voiceMode}。API 密钥请在项目根目录{" "}
                  <code className="text-secondary">.env</code> 配置。
                </p>
                <fieldset className="flex flex-col gap-1.5">
                  {VOICE_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2 text-body text-secondary"
                      data-testid={`settings-voice-${option.id}`}
                    >
                      <input
                        type="radio"
                        name="voice-timbre"
                        value={option.id}
                        checked={selectedTimbre === option.id}
                        onChange={() => onTimbreChange(option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              </section>

              <section
                className="mt-4 flex flex-col gap-2"
                data-testid="settings-overlay-persona"
              >
                <h3 className="text-caption font-medium text-primary">人格预设</h3>
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
              </section>

              <button
                type="button"
                data-testid="settings-open-profile"
                onClick={() => setProfileView(true)}
                className="mt-4 w-full rounded-sm border border-hud px-3 py-2 text-left text-caption text-primary transition hover:border-accent-cyan/50"
              >
                我的画像
              </button>

              <button
                type="button"
                data-testid="settings-open-weekly-review"
                onClick={() => openWeeklyReview()}
                className="mt-2 w-full rounded-sm border border-hud px-3 py-2 text-left text-caption text-primary transition hover:border-accent-cyan/50"
              >
                每周脑图回顾
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 text-caption text-accent-cyan hover:underline"
              >
                关闭
              </button>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
