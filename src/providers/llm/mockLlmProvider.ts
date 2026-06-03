import type { GraphMutationProposal } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";
import { extractProfileSignalsFromTranscript } from "@/lib/extractProfileSignals";
import { stripMemoryPrefixFromContext } from "@/lib/memoryGrounding";
import type { ConceptCandidate, LlmProvider, ResearchPlan } from "./types";

export interface IngestProposalContext {
  newsItem: NewsItem;
  nodes: Array<{ id: string; title: string; intro: string }>;
}

function parseIngestContext(context: string): IngestProposalContext | null {
  try {
    const stripped = stripMemoryPrefixFromContext(context);
    const parsed = JSON.parse(stripped) as IngestProposalContext;
    if (!parsed?.newsItem?.title) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function findRelatedNode(
  title: string,
  nodes: IngestProposalContext["nodes"],
): { id: string; title: string; intro: string } | undefined {
  const keywords = ["上下文", "context", "agent", "framework", "transformer"];
  const lower = title.toLowerCase();
  return nodes.find((node) => {
    const nodeLower = node.title.toLowerCase();
    return keywords.some(
      (keyword) =>
        lower.includes(keyword.toLowerCase()) &&
        nodeLower.includes(keyword.toLowerCase()),
    );
  });
}

/** Deterministic LLM stub for graph ops + news explain without API keys. */
export class MockLlmProvider implements LlmProvider {
  readonly id = "mock-llm";

  async summarizeNews(item: NewsItem, profile?: UserProfile): Promise<string> {
    const style = profile?.explanationStyle ?? "通俗中文 + 保留英文术语";
    if (item.category === "github_trending") {
      return `GitHub 趋势：${item.title}。这是 Mock 讲解（${style}）——${item.summary} 你可以把它理解成「用代码搭智能体流水线的 starter kit」，适合想快速试 Agent 编排的开发者。`;
    }
    return `AI 资讯速览：${item.title}。Mock 讲解（${style}）——${item.summary} 核心在 Transformer 的上下文窗口变长，意味着模型一次能读更多 token，长文档问答会更稳。`;
  }

  async explainConcept(topic: string, profile: UserProfile): Promise<string> {
    const style = profile.explanationStyle ?? "通俗中文 + 保留英文术语";
    return `Mock 讲解「${topic}」（${style}）：这是概念层面的说明，真实 LLM 接入后会结合你的大脑图谱个性化展开。`;
  }

  async proposeGraphMutations(context: string): Promise<GraphMutationProposal[]> {
    const parsed = parseIngestContext(context);
    if (!parsed) {
      return [];
    }

    const { newsItem, nodes } = parsed;
    const related = findRelatedNode(newsItem.title, nodes);

    if (newsItem.category === "github_trending") {
      const proposals: GraphMutationProposal[] = [
        {
          id: `proposal-create-${newsItem.id}`,
          kind: "create",
          summary: "新建 GitHub 趋势概念「Agent Framework Starter」",
          payload: {
            title: "Agent Framework Starter",
            intro: `${newsItem.summary}\n\n（来自 GitHub 趋势 Mock 数据）`,
            sourceUrl: newsItem.sourceUrl,
          },
        },
      ];
      if (related) {
        proposals.push({
          id: `proposal-link-${newsItem.id}`,
          kind: "link",
          summary: `将新节点与「${related.title}」建立 related 关联`,
          payload: {
            sourceId: related.id,
            targetId: "__PENDING_CREATE__",
            relationType: "related",
          },
        });
      }
      return proposals;
    }

    if (related && /扩展|更新|继续/i.test(newsItem.title)) {
      return [
        {
          id: `proposal-attach-${newsItem.id}`,
          kind: "attach",
          summary: `将资讯补充进已有概念「${related.title}」`,
          payload: {
            nodeId: related.id,
            introAppend: `【${newsItem.sourceName}】${newsItem.summary}`,
            sourceUrl: newsItem.sourceUrl,
          },
        },
      ];
    }

    if (nodes.length >= 2 && /上下文|context/i.test(newsItem.title)) {
      const duplicate = nodes.find((node) =>
        node.title.includes("上下文"),
      );
      const canonical = nodes.find((node) => !node.title.includes("过时"));
      if (duplicate && canonical && duplicate.id !== canonical.id) {
        return [
          {
            id: `proposal-merge-${newsItem.id}`,
            kind: "merge",
            summary: `合并重复概念「${duplicate.title}」→「${canonical.title}」，并迁移关系边`,
            payload: {
              sourceNodeId: duplicate.id,
              targetNodeId: canonical.id,
              mergedIntro: `${canonical.intro}\n\n【合并】${newsItem.summary}`,
            },
          },
        ];
      }
    }

    return [
      {
        id: `proposal-create-${newsItem.id}`,
        kind: "create",
        summary: "新建概念节点「大模型上下文窗口」",
        payload: {
          title: "大模型上下文窗口",
          intro: `${newsItem.summary}\n\n（Mock 入库：概念 + 短介绍 + 来源链接）`,
          sourceUrl: newsItem.sourceUrl,
        },
      },
    ];
  }

  async distillUserProfile(
    transcript: string,
    current: UserProfile,
  ): Promise<UserProfile> {
    const signals = extractProfileSignalsFromTranscript(transcript);
    const timestamp = new Date().toISOString();

    const mergeList = (existing: string[], additions: string[]) => {
      const seen = new Set(existing.map((item) => item.toLowerCase()));
      const next = [...existing];
      for (const item of additions) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          next.push(item);
        }
      }
      return next;
    };

    return {
      ...current,
      displayName: signals.displayName ?? current.displayName,
      interests: mergeList(current.interests, signals.interests),
      knownTopics: mergeList(current.knownTopics, signals.knownTopics),
      unknownTopics: mergeList(current.unknownTopics, signals.unknownTopics),
      explanationStyle: signals.explanationStyle ?? current.explanationStyle,
      habits: mergeList(current.habits, signals.habits),
      updatedAt: timestamp,
    };
  }

  async planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan> {
    const trimmed = topic.trim() || "未命名主题";
    const interestHints = profile.interests.slice(0, 2);
    return {
      topic: trimmed,
      subQuestions: [
        `${trimmed} 的核心定义与边界是什么？`,
        `${trimmed} 与大脑图谱里已有概念如何关联？`,
        `近期关于 ${trimmed} 有哪些值得入库的进展？`,
      ],
      suggestedSources: [
        "news_registry",
        "github_trending",
        ...interestHints.map((interest) => `profile_interest:${interest}`),
      ],
    };
  }

  async synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]> {
    const snippets = evidence.map((line) => line.trim()).filter(Boolean);
    if (snippets.length === 0) {
      return [];
    }

    const joined = snippets.join("\n");

    if (snippets.length >= 2) {
      return [
        {
          title: "研究概念 A",
          intro: `Mock 提炼（A）：${snippets[0]!.slice(0, 120)}`,
          sourceUrl: null,
          relations: [{ targetTitle: "研究概念 B", relationType: "related" }],
        },
        {
          title: "研究概念 B",
          intro: `Mock 提炼（B）：${snippets[1]!.slice(0, 120)}`,
          sourceUrl: null,
          relations: [{ targetTitle: "研究概念 A", relationType: "related" }],
        },
      ];
    }

    const title = joined.includes("Agent")
      ? "AI Agent 编排"
      : joined.includes("RAG")
        ? "RAG 检索增强"
        : "研究概念摘要";

    const relations: ConceptCandidate["relations"] = [];
    if (/rag|检索增强/i.test(joined)) {
      relations.push({ targetTitle: "RAG", relationType: "related" });
    }
    if (/agent|智能体/i.test(joined)) {
      relations.push({ targetTitle: "AI Agent", relationType: "depends_on" });
    }

    return [
      {
        title,
        intro: `Mock 提炼自 ${snippets.length} 条证据：${snippets.slice(0, 2).join("；").slice(0, 240)}`,
        sourceUrl: null,
        relations,
      },
    ];
  }
}

export function createMockLlmProvider(): MockLlmProvider {
  return new MockLlmProvider();
}
