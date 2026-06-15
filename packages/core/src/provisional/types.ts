export type ProvisionalSourceType =
  | "text"
  | "link"
  | "learning"
  | "project"
  | "life"
  | "image_mock"
  /** Mock/disabled until M3-GATE PASS — must not enable voice capture path. */
  | "voice_note_mock";

export type ProvisionalStatus = "pending" | "explaining" | "confirmed" | "rejected";

/** M1 memory-only candidate — M2 persists to SQLite. */
export interface ProvisionalCandidate {
  id: string;
  sourceType: ProvisionalSourceType;
  summary: string;
  evidenceRefs: string[];
  createdAt: string;
  status: ProvisionalStatus;
  linkUrl?: string;
  /** Set when UrlFetchGuard rejects outbound fetch — raw link may still be kept. */
  ssrfRejectCode?: string;
  fetchHint?: string;
  /** true when allowlist + mock fetch succeeded. */
  fetchOk?: boolean;
}
