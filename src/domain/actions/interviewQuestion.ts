import type { SourceRef } from "@/domain/graph/sourceRef";

export type InterviewDepth = "foundational" | "intermediate" | "advanced";

export interface InterviewFollowUp {
  prompt: string;
}

export interface InterviewQuestion {
  id: string;
  prompt: string;
  linkedNodeIds: string[];
  linkedSourceRefs: SourceRef[];
  depth: InterviewDepth;
  /** Extra hint when profile marks linked concepts as unfamiliar (C2). */
  scaffold?: string;
  followUps: InterviewFollowUp[];
}

export interface InterviewPack {
  questions: InterviewQuestion[];
  project: string;
}
