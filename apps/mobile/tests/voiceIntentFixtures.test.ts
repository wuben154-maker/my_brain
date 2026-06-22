import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  resolveVoiceTranscript,
  type UserIntent,
} from "@my-brain/core";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(here, "..", "..", "..", "docs", "evals", "voice-intent-fixtures.json");
const runRecordPath = join(here, "..", "..", "..", "docs", "evals", "voice-intent-fixtures-run.json");

interface VoiceIntentFixture {
  id: string;
  transcript: string;
  attempt: 1 | 2;
  expectedIntent?: UserIntent;
  expected?: "reprompt";
}

interface VoiceIntentFixtureFile {
  version: string;
  fixtures: VoiceIntentFixture[];
}

describe("voiceIntentFixtures", () => {
  const file = JSON.parse(readFileSync(fixturesPath, "utf8")) as VoiceIntentFixtureFile;

  for (const fixture of file.fixtures) {
    it(`${fixture.id} matches core voice ingest FSM`, () => {
      const resolved = resolveVoiceTranscript(fixture.transcript, fixture.attempt);
      if (fixture.expected === "reprompt") {
        expect(resolved.kind).toBe("reprompt");
        return;
      }
      expect(resolved.kind).toBe("intent");
      if (resolved.kind === "intent") {
        expect(resolved.intent).toBe(fixture.expectedIntent);
      }
    });
  }

  it("writes guardrails §7 execution record", () => {
    const results = file.fixtures.map((fixture) => {
      const resolved = resolveVoiceTranscript(fixture.transcript, fixture.attempt);
      const actual =
        resolved.kind === "reprompt"
          ? "reprompt"
          : resolved.kind === "intent"
            ? resolved.intent
            : "unknown";
      return {
        id: fixture.id,
        pass: fixture.expected === "reprompt"
          ? resolved.kind === "reprompt"
          : resolved.kind === "intent" && resolved.intent === fixture.expectedIntent,
        actual,
      };
    });

    const record = {
      version: file.version,
      executedAt: "2026-06-16T00:00:00.000Z",
      command: "pnpm --filter @my-brain/mobile test -- voiceIntentFixtures",
      passCount: results.filter((r) => r.pass).length,
      total: results.length,
      results,
    };

    writeFileSync(runRecordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    expect(record.passCount).toBe(record.total);
  });
});
