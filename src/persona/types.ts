import type { PersonaPreset } from "@/domain/profile";

export type PersonaVerbosity = "concise" | "balanced" | "detailed";

export interface PersonaPresetDefinition {
  id: PersonaPreset;
  name: string;
  tone: string;
  verbosity: PersonaVerbosity;
  warmth: number;
  technicality: number;
  opening: string;
  closing: string;
}

export interface ExpressionPlan {
  innerIntent: string;
  verbosity: PersonaVerbosity;
  technicality: number;
  warmth: number;
}
