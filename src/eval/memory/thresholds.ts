/** H3 ratchet thresholds — adjust only via specs/H3-memory-eval.md. */
export const MEMORY_EVAL_THRESHOLDS = {
  /** Fraction of recall cases that must hit in top-K (current fixture: 3/3). */
  recallAt5Min: 1,
  /** Profile-topic match scores must never decrease across evolution rounds. */
  evolutionNonDecreasing: true,
} as const;

export const RECALL_EVAL_TOP_K = 5;
