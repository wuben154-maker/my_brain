import type { StorageProvider } from "@/storage/types";
import { DEFAULT_MORNING_BRIEF_CONFIG } from "./jobs/morningBriefJob";

export class BudgetExceededError extends Error {
  constructor(message = "Token budget exceeded") {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export interface TokenBudget {
  charge(tokens: number): void;
  remaining(): number;
  spentToday(): number;
  isDayCapReached(): boolean;
}

/** UTC date key for daily usage rollup (H1). */
export function agentUsageDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const DEFAULT_DAILY_TOKEN_BUDGET = 24_000;

export function createTokenBudget(input: {
  perRun: number;
  perDay: number;
  loadTodaySpent: () => number;
  recordSpend: (tokens: number) => void;
}): TokenBudget {
  let runSpent = 0;
  let daySpent = input.loadTodaySpent();

  return {
    charge(tokens: number) {
      if (tokens <= 0) {
        return;
      }
      if (daySpent + tokens > input.perDay) {
        throw new BudgetExceededError("Daily token budget exceeded");
      }
      if (runSpent + tokens > input.perRun) {
        throw new BudgetExceededError("Per-run token budget exceeded");
      }
      runSpent += tokens;
      daySpent += tokens;
      input.recordSpend(tokens);
    },
    remaining() {
      return Math.max(0, input.perRun - runSpent);
    },
    spentToday() {
      return daySpent;
    },
    isDayCapReached() {
      return daySpent >= input.perDay;
    },
  };
}

export async function createMorningBriefBudget(
  storage: StorageProvider,
): Promise<TokenBudget> {
  const dateKey = agentUsageDateKey();
  let spentToday = await storage.loadAgentUsage(dateKey);

  return createTokenBudget({
    perRun: DEFAULT_MORNING_BRIEF_CONFIG.tokenBudgetPerRun,
    perDay: DEFAULT_DAILY_TOKEN_BUDGET,
    loadTodaySpent: () => spentToday,
    recordSpend: (tokens) => {
      spentToday += tokens;
      void storage.addAgentUsage(dateKey, tokens);
    },
  });
}
