export type ProvisionalSourceType = "text" | "link" | "voice_note_mock";

export type ProvisionalStatus = "pending" | "explaining" | "confirmed" | "rejected";

/** M1 memory-only candidate — M2 persists to SQLite. */
export interface ProvisionalCandidate {
  id: string;
  sourceType: ProvisionalSourceType;
  summary: string;
  evidenceRefs: string[];
  createdAt: string;
  status: ProvisionalStatus;
  /** Optional mock link — no SSRF fetch in M1 */
  linkUrl?: string;
}
