import {
  applyPersonaStyle,
  buildExpressionPlan,
} from "@/lib/personaPrompt";
import { loadPersonaPreset } from "@/persona/loadPreset";
import type { LlmProvider } from "@/providers/llm/types";
import { selectTeachingHighlights } from "@/conversation/selectTeachingHighlights";
import type { PersonaPreset } from "@/domain/profile";
import type {
  ConversationContext,
  ConversationEvent,
  ConversationState,
  Turn,
} from "@/conversation/types";
import { generateInterviewPack } from "@/cognitive/generateInterviewPack";
import type { InterviewQuestion } from "@/domain/actions/interviewQuestion";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import { SHOWCASE_INGEST_NODE_ID } from "@/showcase/showcaseFixtures";

function stylize(
  ctx: ConversationContext,
  content: string,
  topicHint = "",
): string {
  const preset = loadPersonaPreset(ctx.personaId as PersonaPreset);
  const plan = buildExpressionPlan(
    preset,
    ctx.profile,
    ctx.recalledMemories,
    topicHint,
  );
  return applyPersonaStyle(preset, plan, content);
}

function currentNewsItem(ctx: ConversationContext) {
  return ctx.newsQueue[ctx.newsCursor] ?? null;
}

function wantsNews(transcript: string): boolean {
  return /资讯|新闻|简报|听听|讲讲今天|有什么.*新/i.test(transcript);
}

function wantsTopic(transcript: string): { topic: string } | null {
  const teach = transcript.match(/讲讲|说说|介绍一下|什么是\s*(.+)/i);
  if (teach?.[1]) {
    return { topic: teach[1].trim().slice(0, 80) };
  }
  return null;
}

function isGreeting(transcript: string): boolean {
  return /你好|嗨|哈喽|在吗|早上好|晚上好/i.test(transcript);
}

function wantsInterview(transcript: string): boolean {
  return /面试模式|考考我/i.test(transcript);
}

function wantsInterviewSkip(transcript: string): boolean {
  return /^(跳过|不要|skip)$/i.test(transcript.trim());
}

function wantsInterviewNext(transcript: string): boolean {
  return /下一题|继续|next/i.test(transcript);
}

function formatInterviewQuestionPrompt(question: InterviewQuestion): string {
  const scaffold = question.scaffold ? `\n${question.scaffold}` : "";
  return `第 ${question.id} 题：${question.prompt}${scaffold}`;
}

function interviewStartTurn(ctx: ConversationContext): Turn {
  const pack = generateInterviewPack(ctx.graph, ctx.profile, {
    project: "my_brain",
  });
  const first = pack.questions[0];
  if (!first) {
    return {
      say: stylize(ctx, "图谱里概念还不够，先入库几条再考你。"),
      expect: "free",
      nextState: ctx.onboarding.active ? "idle_chat" : "idle_chat",
    };
  }
  return {
    say: stylize(
      ctx,
      `好，面试模式。共 ${pack.questions.length} 题，先说思路不用打分。${formatInterviewQuestionPrompt(first)}`,
      "面试",
    ),
    expect: "free",
    nextState: "interview",
    highlightNodeIds: first.linkedNodeIds,
    interviewAction: "start",
    interviewQuestions: pack.questions,
  };
}

function interviewAdvanceTurn(
  ctx: ConversationContext,
  questions: InterviewQuestion[],
  nextIndex: number,
  action: "skip" | "next",
): Turn {
  if (nextIndex >= questions.length) {
    return {
      say: stylize(ctx, "这轮面试题答完了。想再来一轮可以说「考考我」。"),
      expect: "free",
      nextState: "idle_chat",
      interviewAction: action,
    };
  }
  const question = questions[nextIndex];
  const prefix = action === "skip" ? "好，这题跳过。" : "好，下一题。";
  return {
    say: stylize(
      ctx,
      `${prefix}${formatInterviewQuestionPrompt(question)}`,
      "面试",
    ),
    expect: "free",
    nextState: "interview",
    highlightNodeIds: question.linkedNodeIds,
    interviewAction: action,
  };
}

async function explainBriefing(
  ctx: ConversationContext,
  llm: LlmProvider,
  depth: "normal" | "elaborate",
): Promise<string> {
  const item = currentNewsItem(ctx);
  if (!item) {
    return stylize(ctx, "暂时没有新资讯，我们可以先聊聊你的兴趣。");
  }
  return explainBriefingItem(ctx, llm, item, depth);
}

async function explainBriefingItem(
  ctx: ConversationContext,
  llm: LlmProvider,
  item: NonNullable<ReturnType<typeof currentNewsItem>>,
  depth: "normal" | "elaborate",
): Promise<string> {
  let core = await llm.summarizeNews(item, ctx.profile);
  if (depth === "elaborate") {
    const extra = await llm.explainConcept(item.title, ctx.profile);
    core = `${core}\n\n${extra}`;
  }
  return stylize(ctx, core, item.title);
}

function ingestPrompt(ctx: ConversationContext): string {
  const item = currentNewsItem(ctx);
  const title = item?.title ?? "这条";
  if (ctx.onboarding.active && ctx.onboarding.step === "first_star") {
    return stylize(
      ctx,
      `要把「${title}」记进大脑吗？这是你的第一颗星——说「入」就点亮，说「不要」就跳过。`,
      title,
    );
  }
  return stylize(
    ctx,
    `关于「${title}」，要入库吗？说「入」收录，「不要」跳过，「讲细点」我再展开。`,
    title,
  );
}

function onboardingIntroTurn(ctx: ConversationContext): Turn {
  return {
    say: stylize(
      ctx,
      "你好，我是你的 AI 大脑伴侣。先认识一下——你希望我怎么称呼你？随便说个名字就行。",
    ),
    expect: "free",
    nextState: "idle_chat",
  };
}

function onboardingPersonaTurn(ctx: ConversationContext): Turn {
  const skipped =
    ctx.profile.persona !== "mentor" || ctx.profile.explanationStyle;
  const line = skipped
    ? "人格和音色你已经在设置里选好了，我们直接聊兴趣。"
    : "右上角设置里可以换人格和音色；现在先告诉我，你最近最关心 AI 的哪几块？";
  return {
    say: stylize(ctx, line),
    expect: "free",
    nextState: skipped ? "small_talk" : "idle_chat",
  };
}

async function handleOnboardingUserSpeak(
  state: ConversationState,
  ctx: ConversationContext,
  transcript: string,
  llm: LlmProvider,
): Promise<Turn> {
  const step = ctx.onboarding.step;

  if (step === "intro") {
    return {
      say: stylize(
        ctx,
        `好的，${transcript.trim().slice(0, 24) || "朋友"}。${onboardingPersonaTurn(ctx).say}`,
      ),
      expect: "free",
      nextState: "small_talk",
    };
  }

  if (step === "persona_voice") {
    return {
      ...onboardingPersonaTurn(ctx),
      nextState: "small_talk",
    };
  }

  if (step === "interests") {
    const rounds = ctx.onboarding.interestRounds + 1;
    if (rounds < 2) {
      const core = `收到，你对「${transcript.trim().slice(0, 40)}」感兴趣。还有呢？随便再说一个方向。`;
      return {
        say: stylize(ctx, core, transcript),
        expect: "free",
        nextState: "small_talk",
      };
    }
    const item = ctx.newsQueue[0];
    if (!item) {
      return {
        say: stylize(ctx, "好，兴趣我记住了。启动时还没抓到资讯，我们稍后再点亮第一颗星。"),
        expect: "free",
        nextState: "idle_chat",
      };
    }
    const say = await explainBriefing(ctx, llm, "normal");
    return {
      say,
      expect: "ingest",
      nextState: "ingest_decision",
    };
  }

  return {
    say: stylize(ctx, "我们继续。"),
    expect: "free",
    nextState: state,
  };
}

/**
 * Pure transition core for the conversation state machine (V2).
 */
export async function nextTurn(
  state: ConversationState,
  event: ConversationEvent,
  ctx: ConversationContext,
  llm: LlmProvider,
): Promise<Turn> {
  if (event.type === "userInterrupt") {
    return {
      say: "",
      nextState: state === "ingest_decision" ? "ingest_decision" : state,
    };
  }

  if (event.type === "sessionStart") {
    if (ctx.onboarding.active && ctx.onboarding.step === "intro") {
      return onboardingIntroTurn(ctx);
    }
    const queueLen = ctx.newsQueue.length;
    if (queueLen > 0) {
      return {
        say: stylize(
          ctx,
          `我在这儿。启动时抓了 ${queueLen} 条资讯，想听可以说「讲讲资讯」，也可以随便聊。`,
        ),
        expect: "free",
        nextState: "idle_chat",
      };
    }
    return {
      say: stylize(ctx, "我在这儿，想聊什么都可以。"),
      expect: "free",
      nextState: "idle_chat",
    };
  }

  if (event.type === "newsAvailable") {
    if (state === "small_talk" || state === "idle_chat") {
      const item = currentNewsItem(ctx);
      if (!item) {
        return {
          say: stylize(ctx, "队列里还没有资讯，稍后再试。"),
          expect: "free",
          nextState: state,
        };
      }
      const say = await explainBriefing(ctx, llm, "normal");
      return {
        say,
        expect: "ingest",
        nextState: "ingest_decision",
      };
    }
  }

  if (event.type === "ingestReprompt") {
    const reason = event.reason?.trim();
    const say = reason
      ? stylize(ctx, `${reason}。${ingestPrompt(ctx)}`)
      : ingestPrompt(ctx);
    return {
      say,
      expect: "ingest",
      nextState: "ingest_decision",
    };
  }

  if (event.type === "ingestAnswer") {
    const celebrating =
      ctx.onboarding.active && ctx.onboarding.step === "first_star";
    if (event.command === "elaborate") {
      const say = await explainBriefing(ctx, llm, "elaborate");
      return {
        say,
        expect: "ingest",
        nextState: "ingest_decision",
      };
    }
    if (event.command === "skip") {
      const hasMore = ctx.newsCursor + 1 < ctx.newsQueue.length;
      if (hasMore) {
        if (isShowcaseDemoMode()) {
          const nextItem = ctx.newsQueue[ctx.newsCursor + 1];
          if (nextItem) {
            return {
              say: await explainBriefingItem(ctx, llm, nextItem, "normal"),
              expect: "ingest",
              nextState: "ingest_decision",
            };
          }
        }
        return {
          say: stylize(ctx, "好，这条跳过。下一条要听吗？"),
          expect: "free",
          nextState: "briefing",
        };
      }
      return {
        say: stylize(ctx, "好，这条先不要。想继续聊或听别的，随时说。"),
        expect: "free",
        nextState: celebrating ? "idle_chat" : "idle_chat",
      };
    }
    if (event.command === "ingest") {
      const highlights = selectTeachingHighlights(ctx.graph, "第一颗星");
      const showcaseIngest = isShowcaseDemoMode();
      const celebration = showcaseIngest
        ? stylize(ctx, "好，Graphiti 这颗星亮了。")
        : celebrating
          ? stylize(
              ctx,
              "好，记下了！你的第一颗星会在确认后亮起——欢迎开始点亮大脑。",
            )
          : stylize(ctx, "好，这条按你的确认入库（落库由语音入库流程处理）。");
      const hasMore =
        !celebrating && !showcaseIngest && ctx.newsCursor + 1 < ctx.newsQueue.length;
      return {
        say: celebration,
        expect: "free",
        highlightNodeIds: showcaseIngest
          ? [SHOWCASE_INGEST_NODE_ID]
          : celebrating
            ? highlights
            : undefined,
        nextState: hasMore ? "briefing" : "idle_chat",
      };
    }
  }

  if (event.type === "topicRequest") {
    const core = await llm.explainConcept(event.topic, ctx.profile);
    const highlights = selectTeachingHighlights(ctx.graph, event.topic);
    return {
      say: stylize(ctx, core, event.topic),
      expect: "free",
      highlightNodeIds: highlights,
      nextState: "teaching",
    };
  }

  if (event.type === "interviewStart") {
    return interviewStartTurn(ctx);
  }

  if (event.type === "interviewSkip" || event.type === "interviewNext") {
    const questions =
      ctx.interviewSession?.questions ??
      generateInterviewPack(ctx.graph, ctx.profile, { project: "my_brain" })
        .questions;
    const action = event.type === "interviewSkip" ? "skip" : "next";
    const currentIndex = ctx.interviewSession?.cursor ?? 0;
    return interviewAdvanceTurn(
      ctx,
      questions,
      currentIndex + 1,
      action,
    );
  }

  if (event.type === "userSpeak") {
    const transcript = event.transcript.trim();
    if (!transcript) {
      return { say: "", nextState: state };
    }

    if (ctx.onboarding.active && ctx.onboarding.step !== "done") {
      return handleOnboardingUserSpeak(state, ctx, transcript, llm);
    }

    if (wantsInterview(transcript)) {
      return interviewStartTurn(ctx);
    }

    const topic = wantsTopic(transcript);
    if (topic) {
      return nextTurn(
        state,
        { type: "topicRequest", topic: topic.topic },
        ctx,
        llm,
      );
    }

    if (wantsNews(transcript)) {
      return nextTurn(
        state,
        { type: "newsAvailable", queueLength: ctx.newsQueue.length },
        ctx,
        llm,
      );
    }

    if (state === "ingest_decision") {
      return {
        say: ingestPrompt(ctx),
        expect: "ingest",
        nextState: "ingest_decision",
      };
    }

    if (state === "briefing") {
      const say = await explainBriefing(ctx, llm, "normal");
      return {
        say,
        expect: "ingest",
        nextState: "ingest_decision",
      };
    }

    if (state === "teaching") {
      const core = await llm.explainConcept(transcript, ctx.profile);
      return {
        say: stylize(ctx, core, transcript),
        expect: "free",
        nextState: "teaching",
      };
    }

    if (state === "interview") {
      const questions =
        ctx.interviewSession?.questions ??
        generateInterviewPack(ctx.graph, ctx.profile, { project: "my_brain" })
          .questions;
      const currentIndex = ctx.interviewSession?.cursor ?? 0;
      if (wantsInterviewSkip(transcript)) {
        return interviewAdvanceTurn(
          ctx,
          questions,
          currentIndex + 1,
          "skip",
        );
      }
      if (wantsInterviewNext(transcript)) {
        return interviewAdvanceTurn(
          ctx,
          questions,
          currentIndex + 1,
          "next",
        );
      }
      return {
        say: stylize(
          ctx,
          "我在听你的思路。说「下一题」继续，或「跳过」换题。",
        ),
        expect: "free",
        nextState: "interview",
      };
    }

    if (state === "idle_chat" || state === "small_talk") {
      if (isGreeting(transcript) && state === "idle_chat") {
        return {
          say: stylize(ctx, "嗨！想听资讯、聊兴趣，或让我讲讲图谱里的概念，都可以。"),
          expect: "free",
          nextState: "small_talk",
        };
      }
      const core = `嗯，${transcript.slice(0, 60)}——我记住了。还想听资讯，或深入聊某个概念，直接说就行。`;
      return {
        say: stylize(ctx, core, transcript),
        expect: "free",
        nextState: "small_talk",
      };
    }
  }

  return {
    say: stylize(ctx, "我在听，你可以继续说。"),
    expect: "free",
    nextState: state,
  };
}

export function nextOnboardingAfterEvent(
  ctx: ConversationContext,
  event: ConversationEvent,
): ConversationContext["onboarding"] {
  const onboarding = { ...ctx.onboarding };
  if (!onboarding.active) {
    return onboarding;
  }

  if (event.type === "sessionStart") {
    return onboarding;
  }

  if (event.type === "userSpeak") {
    if (onboarding.step === "intro") {
      return { ...onboarding, step: "persona_voice" };
    }
    if (onboarding.step === "persona_voice") {
      return { ...onboarding, step: "interests", interestRounds: 0 };
    }
    if (onboarding.step === "interests") {
      const rounds = onboarding.interestRounds + 1;
      if (rounds >= 2) {
        return { ...onboarding, step: "first_star", interestRounds: rounds };
      }
      return { ...onboarding, interestRounds: rounds };
    }
  }

  if (
    event.type === "newsAvailable" &&
    onboarding.step === "interests" &&
    onboarding.interestRounds >= 2
  ) {
    return { ...onboarding, step: "first_star" };
  }

  if (event.type === "ingestAnswer" && event.command === "ingest") {
    if (onboarding.step === "first_star") {
      return { active: false, step: "done", interestRounds: 0 };
    }
  }

  if (event.type === "ingestAnswer" && event.command === "skip") {
    if (onboarding.step === "first_star") {
      return { active: false, step: "done", interestRounds: 0 };
    }
  }

  return onboarding;
}

export function nextNewsCursorAfterIngest(
  ctx: ConversationContext,
  event: ConversationEvent,
): number {
  if (event.type !== "ingestAnswer") {
    return ctx.newsCursor;
  }
  if (event.command === "skip" || event.command === "ingest") {
    return Math.min(ctx.newsCursor + 1, ctx.newsQueue.length);
  }
  return ctx.newsCursor;
}
