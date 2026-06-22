import { describe, expect, it } from "vitest";

import {
  appendCasualTurn,
  createEphemeralConversation,
  rejectEphemeralMemory,
} from "../conversation/ephemeralChat.js";
import type { UserModeProfile } from "../domain/userMode.js";
import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import { inferUserModeProfileFromDialogue } from "../radar/adaptiveRadar.js";
import {
  assertPersonalObserverDoesNotMutateGraph,
  extractPersonalSignalsFromEphemeralChat,
  type PersonalSignal,
} from "./personalObserver.js";

function expectValidPersonalSignal(signal: PersonalSignal): void {
  expect(signal.id).toMatch(/^psignal-/);
  expect(["chat", "project", "repeated_question", "learning"]).toContain(signal.source);
  expect(signal.evidence.length).toBeGreaterThan(0);
  expect(signal.evidence[0]).toContain("companion-chat:");
  expect(signal.whyUseful.length).toBeGreaterThan(0);
  expect(signal.confidence).toBeGreaterThan(0);
  expect(signal.confidence).toBeLessThanOrEqual(0.9);
}

describe("personal observer — CK-15", () => {
  it("extracts project and learning signals with evidence and whyUseful", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "最近项目推进慢，Rust 所有权还没完全懂"));
    const profile = inferUserModeProfileFromDialogue(["学 Rust 所有权"], "cold-learner");

    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);

    expect(signals.length).toBeGreaterThanOrEqual(2);
    const project = signals.find((s) => s.source === "project");
    const learning = signals.find((s) => s.source === "learning");
    expect(project).toBeDefined();
    expect(learning).toBeDefined();
    for (const signal of signals) {
      expectValidPersonalSignal(signal);
    }
    expect(project!.whyUseful).toContain("项目");
    expect(learning!.whyUseful).toContain("学习");
  });

  it("extracts chat signal from emotional companion turns", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "最近压力好大，有点焦虑"));
    const profile = inferUserModeProfileFromDialogue([], "cold-personal-capture");

    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);
    const chatSignal = signals.find((s) => s.source === "chat");

    expect(chatSignal).toBeDefined();
    expectValidPersonalSignal(chatSignal!);
    expect(chatSignal!.whyUseful).toContain("陪聊");
    expect(chatSignal!.evidence.some((ref) => ref.startsWith("user-turn:"))).toBe(true);
  });

  it("detects learning mastery phrasing as learning signal", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "Rust 所有权我已经懂了"));
    const profile = inferUserModeProfileFromDialogue(["Rust"], "cold-learner");

    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);
    const learning = signals.find((s) => s.source === "learning");

    expect(learning).toBeDefined();
    expectValidPersonalSignal(learning!);
    expect(learning!.whyUseful).toContain("学习");
  });

  it("detects repeated questions as bounded repeated_question signal", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "voice provider 怎么选？"));
    ({ state: chat } = appendCasualTurn(chat, "voice provider 怎么选？"));
    const profile = inferUserModeProfileFromDialogue([], "cold-tech-tracker");

    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);
    const repeated = signals.find((s) => s.source === "repeated_question");

    expect(repeated).toBeDefined();
    expectValidPersonalSignal(repeated!);
    expect(repeated!.evidence.some((ref) => ref.includes("repeated-question:"))).toBe(true);
    expect(repeated!.whyUseful).toContain("重复");
  });

  it("returns no signals when user rejected memory for session", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "项目推进慢"));
    chat = rejectEphemeralMemory(chat);

    const profile = inferUserModeProfileFromDialogue(["创业想法"], "cold-personal-capture");
    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);

    expect(signals).toEqual([]);
  });

  it("extractPersonalSignalsFromEphemeralChat does not mutate chat, profile, or graph", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "项目里程碑被阻塞了"));
    const profile: UserModeProfile = inferUserModeProfileFromDialogue(
      ["创业"],
      "cold-founder-project",
    );
    const graph = new InMemoryGraphRepository();
    const beforeNodes = graph.countVisibleNodes();
    const chatBefore = JSON.stringify(chat);
    const profileBefore = JSON.stringify(profile);

    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);

    expect(signals.length).toBeGreaterThan(0);
    expect(JSON.stringify(chat)).toBe(chatBefore);
    expect(JSON.stringify(profile)).toBe(profileBefore);
    assertPersonalObserverDoesNotMutateGraph(graph, beforeNodes);
    expect(graph.countVisibleNodes()).toBe(beforeNodes);
  });

  it("assertPersonalObserverDoesNotMutateGraph rejects graph growth", () => {
    const graph = new InMemoryGraphRepository();
    const beforeNodes = graph.countVisibleNodes();
    graph.createNode({ concept: "Leaked", intro: "should not happen", sourceLinks: [] });

    expect(() => assertPersonalObserverDoesNotMutateGraph(graph, beforeNodes)).toThrow(
      /must not create permanent graph nodes/,
    );
  });

  it("caps extracted signals at six bounded candidates", () => {
    let chat = createEphemeralConversation();
    const lines = [
      "项目A推进慢",
      "项目B有阻塞",
      "项目C要决策",
      "学Rust复习",
      "学Go深入",
      "学Python掌握",
      "压力好大",
      "最近很累",
    ];
    for (const line of lines) {
      ({ state: chat } = appendCasualTurn(chat, line));
    }
    const profile = inferUserModeProfileFromDialogue(["多项目"], "cold-founder-project");

    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);

    expect(signals.length).toBeLessThanOrEqual(6);
    for (const signal of signals) {
      expectValidPersonalSignal(signal);
    }
  });
});
