import type { PersonaPreset } from "@/domain/profile";
import type { PersonaPresetDefinition, PersonaVerbosity } from "@/persona/types";
import companionRaw from "@/persona/presets/companion.md?raw";
import geekRaw from "@/persona/presets/geek.md?raw";
import mentorRaw from "@/persona/presets/mentor.md?raw";

const RAW_BY_ID: Record<PersonaPreset, string> = {
  mentor: mentorRaw,
  companion: companionRaw,
  geek: geekRaw,
};

const DEFAULTS: Omit<PersonaPresetDefinition, "id"> = {
  name: "默认讲解",
  tone: "neutral",
  verbosity: "balanced",
  warmth: 0.5,
  technicality: 0.5,
  opening: "",
  closing: "",
};

function parseVerbosity(value: string | undefined): PersonaVerbosity {
  if (value === "concise" || value === "detailed" || value === "balanced") {
    return value;
  }
  return DEFAULTS.verbosity;
}

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) {
      fields[key] = value;
    }
  }
  return fields;
}

export function parsePersonaPresetMarkdown(
  raw: string,
  fallbackId: PersonaPreset,
): PersonaPresetDefinition {
  const meta = parseFrontmatter(raw);
  const id = (meta.id as PersonaPreset | undefined) ?? fallbackId;
  const warmth = Number(meta.warmth);
  const technicality = Number(meta.technicality);

  return {
    id,
    name: meta.name ?? DEFAULTS.name,
    tone: meta.tone ?? DEFAULTS.tone,
    verbosity: parseVerbosity(meta.verbosity),
    warmth: Number.isFinite(warmth) ? warmth : DEFAULTS.warmth,
    technicality: Number.isFinite(technicality)
      ? technicality
      : DEFAULTS.technicality,
    opening: meta.opening ?? DEFAULTS.opening,
    closing: meta.closing ?? DEFAULTS.closing,
  };
}

export function loadPersonaPreset(id: PersonaPreset): PersonaPresetDefinition {
  return parsePersonaPresetMarkdown(RAW_BY_ID[id], id);
}
