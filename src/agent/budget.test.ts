import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  agentUsageDateKey,
  createMorningBriefBudget,
  createTokenBudget,
  DEFAULT_DAILY_TOKEN_BUDGET,
} from "@/agent/budget";
import { DEFAULT_MORNING_BRIEF_CONFIG } from "@/agent/jobs/morningBriefJob";
import {
  createTempStorage,
  STORAGE_BACKEND_KINDS,
} from "@/invariants/testStorage";

describe("createTokenBudget (H1)", () => {
  it("throws when per-run cap exceeded", () => {
    const budget = createTokenBudget({
      perRun: 100,
      perDay: 1000,
      loadTodaySpent: () => 0,
      recordSpend: () => undefined,
    });
    budget.charge(80);
    expect(() => budget.charge(30)).toThrow(BudgetExceededError);
    expect(budget.remaining()).toBe(20);
  });

  it("throws when per-day cap exceeded", () => {
    const budget = createTokenBudget({
      perRun: 500,
      perDay: 100,
      loadTodaySpent: () => 90,
      recordSpend: () => undefined,
    });
    expect(() => budget.charge(20)).toThrow(BudgetExceededError);
    expect(budget.isDayCapReached()).toBe(false);
    budget.charge(10);
    expect(budget.isDayCapReached()).toBe(true);
  });

  it("ignores non-positive charges", () => {
    const budget = createTokenBudget({
      perRun: 100,
      perDay: 100,
      loadTodaySpent: () => 0,
      recordSpend: () => undefined,
    });
    budget.charge(0);
    budget.charge(-5);
    expect(budget.spentToday()).toBe(0);
    expect(budget.remaining()).toBe(100);
  });
});

describe("agent usage persistence (H1)", () => {
  it.each(STORAGE_BACKEND_KINDS)(
    "loadAgentUsage / addAgentUsage on %s",
    async (kind) => {
      const { storage, cleanup } = createTempStorage(kind);
      try {
        await storage.init();
        const today = agentUsageDateKey(new Date("2026-06-02T12:00:00.000Z"));
        const yesterday = agentUsageDateKey(
          new Date("2026-06-01T12:00:00.000Z"),
        );

        expect(await storage.loadAgentUsage(today)).toBe(0);
        await storage.addAgentUsage(today, 120);
        await storage.addAgentUsage(today, 30);
        expect(await storage.loadAgentUsage(today)).toBe(150);
        expect(await storage.loadAgentUsage(yesterday)).toBe(0);
      } finally {
        cleanup();
      }
    },
  );

  it("createMorningBriefBudget uses storage-backed daily spend", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const dateKey = agentUsageDateKey();
      await storage.addAgentUsage(dateKey, DEFAULT_DAILY_TOKEN_BUDGET - 50);

      const budget = await createMorningBriefBudget(storage);
      expect(budget.isDayCapReached()).toBe(false);
      expect(() => budget.charge(60)).toThrow(BudgetExceededError);
      expect(budget.spentToday()).toBe(DEFAULT_DAILY_TOKEN_BUDGET - 50);
    } finally {
      cleanup();
    }
  });

  it("defaults align with morning brief config", () => {
    expect(DEFAULT_DAILY_TOKEN_BUDGET).toBeGreaterThan(
      DEFAULT_MORNING_BRIEF_CONFIG.tokenBudgetPerRun,
    );
  });
});
