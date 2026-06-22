/**
 * M4 mock fixture runner — inject App Group / intent JSON fixtures into provisional intake.
 * Does not simulate native Android intent or iOS Share Extension.
 */

import type { GraphRepository } from "@my-brain/core";
import {
  getSharePayloadFixture,
  type SharePayloadFixture,
  type UrlFetchGuardDeps,
  validateSharePayload,
} from "@my-brain/core";

import {
  intakeSharePayload,
  intakeVoiceNoteShareMock,
  type ShareIntakeResult,
} from "./shareIntake";

export interface ShareFixtureIntakeDiagnostic {
  fixtureId: string;
  ok: boolean;
  code?: string;
  hint?: string;
  candidateId?: string;
  sourceType?: string;
  graphNodeCount: number;
}

export interface ShareFixtureIntakeDeps {
  graph: GraphRepository;
  urlGuard?: UrlFetchGuardDeps;
}

function classifyIntake(result: ShareIntakeResult): Pick<
  ShareFixtureIntakeDiagnostic,
  "ok" | "code" | "hint" | "candidateId" | "sourceType"
> {
  if (!result.ok) {
    return { ok: false, code: result.code, hint: result.hint };
  }
  return {
    ok: true,
    candidateId: result.candidate.id,
    sourceType: result.candidate.sourceType,
  };
}

/** Run a manifest fixture through mock share intake (no permanent nodes). */
export async function intakeSharePayloadFixture(
  fixtureId: string,
  deps: ShareFixtureIntakeDeps,
): Promise<ShareFixtureIntakeDiagnostic> {
  const fixture = getSharePayloadFixture(fixtureId);
  if (!fixture) {
    return {
      fixtureId,
      ok: false,
      code: "SHARE_FIXTURE_UNKNOWN",
      hint: `未知 fixture：${fixtureId}`,
      graphNodeCount: deps.graph.countVisibleNodes(),
    };
  }
  return intakeSharePayloadFixtureDef(fixture, deps);
}

export async function intakeSharePayloadFixtureDef(
  fixture: SharePayloadFixture,
  deps: ShareFixtureIntakeDeps,
): Promise<ShareFixtureIntakeDiagnostic> {
  const beforeNodes = deps.graph.countVisibleNodes();

  if (fixture.expectIntake === "SHARE_INTAKE_VOICE_DISABLED") {
    const voice = intakeVoiceNoteShareMock();
    return {
      fixtureId: fixture.id,
      ...classifyIntake(voice),
      graphNodeCount: deps.graph.countVisibleNodes(),
    };
  }

  if (fixture.input === undefined) {
    return {
      fixtureId: fixture.id,
      ok: false,
      code: "SHARE_FIXTURE_NO_INPUT",
      hint: "fixture 缺少 input",
      graphNodeCount: beforeNodes,
    };
  }

  const validated = validateSharePayload(fixture.input);
  if (!validated.ok && fixture.expectIntake === "safe_error_no_permanent") {
    return {
      fixtureId: fixture.id,
      ok: false,
      code: validated.code,
      hint: validated.hint,
      graphNodeCount: deps.graph.countVisibleNodes(),
    };
  }

  const result = await intakeSharePayload(fixture.input, deps);
  const diagnostic = classifyIntake(result);

  return {
    fixtureId: fixture.id,
    ...diagnostic,
    graphNodeCount: deps.graph.countVisibleNodes(),
  };
}

