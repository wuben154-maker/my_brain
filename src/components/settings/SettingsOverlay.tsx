import { useCallback, useEffect, useState } from "react";
import type { PersonaPreset } from "@/domain/profile";
import { readVoiceProviderMode } from "@/lib/voiceProviderMode";
import {
  readVoiceTimbrePreference,
  writeVoiceTimbrePreference,
} from "@/lib/voiceTimbrePreference";
import type { VoiceTimbre } from "@/providers/voice/types";
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

/** Corner settings: voice timbre + persona preset (V5). API keys stay in .env only. */
export function SettingsOverlay() {
  const [open, setOpen] = useState(false);
  const providers = useAppStore((state) => state.providers);
  const storage = useAppStore((state) => state.storage);
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const voice = providers?.voice ?? null;

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
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-hud bg-bg-elevated/80 text-secondary backdrop-blur-md transition hover:border-accent-cyan/50 hover:text-primary"
      >
        ⚙
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="设置"
          data-testid="settings-overlay"
          className="absolute right-0 top-12 z-30 w-72 rounded-md border border-hud bg-bg-elevated/95 p-4 shadow-glow-cyan backdrop-blur-md"
        >
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
            onClick={() => setOpen(false)}
            className="mt-4 text-caption text-accent-cyan hover:underline"
          >
            关闭
          </button>
        </div>
      ) : null}
    </>
  );
}
