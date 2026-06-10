import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import type { DecisionNode } from "@/domain/nodes/decisionNode";
import type { ProjectNode } from "@/domain/nodes/projectNode";
import type { QuestionNode } from "@/domain/nodes/questionNode";
import type { SkillNode } from "@/domain/nodes/skillNode";
import type { SourceNode } from "@/domain/nodes/sourceNode";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { UserProfile } from "@/domain/profile";
import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";
import type { CognitiveAction } from "@/domain/actions/cognitiveAction";
import type { BriefingFeedback } from "@/domain/radar/briefingItem";
import type { LearningTrace } from "@/domain/learning/learningTrace";
import type { StorageProvider } from "../types";

const STORAGE_BASE = "/__my_brain/storage";

async function storageFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const method =
    options.method ?? (options.body !== undefined ? "POST" : "GET");
  const response = await fetch(`${STORAGE_BASE}${path}`, {
    method,
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(`Storage request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

/**
 * Web-dev storage client — talks to Vite middleware backed by better-sqlite3.
 * Dev-only bridge; not Brain MCP, not Tauri production, not an external write surface.
 */
export class WebSqlStorageProvider implements StorageProvider {
  async init(): Promise<void> {
    await storageFetch("/init", { method: "POST" });
  }

  async close(): Promise<void> {
    await storageFetch("/close", { method: "POST" });
  }

  loadGraph(): Promise<BrainGraphSnapshot> {
    return storageFetch("/graph");
  }

  loadGraphForDisplay(): Promise<BrainGraphSnapshot> {
    return storageFetch("/graph/display");
  }

  saveConcept(node: ConceptNode): Promise<void> {
    return storageFetch("/concept", { body: node });
  }

  saveProject(node: ProjectNode): Promise<void> {
    return storageFetch("/project", { body: node });
  }

  saveSource(node: SourceNode): Promise<void> {
    return storageFetch("/source", { body: node });
  }

  saveDecision(node: DecisionNode): Promise<void> {
    return storageFetch("/decision", { body: node });
  }

  saveQuestion(node: QuestionNode): Promise<void> {
    return storageFetch("/question", { body: node });
  }

  saveSkill(node: SkillNode): Promise<void> {
    return storageFetch("/skill", { body: node });
  }

  deleteConcept(conceptId: string): Promise<void> {
    return storageFetch("/concept/delete", {
      method: "POST",
      body: { id: conceptId },
    });
  }

  deleteProject(projectId: string): Promise<void> {
    return storageFetch("/project/delete", {
      method: "POST",
      body: { id: projectId },
    });
  }

  deleteSource(sourceId: string): Promise<void> {
    return storageFetch("/source/delete", {
      method: "POST",
      body: { id: sourceId },
    });
  }

  deleteDecision(decisionId: string): Promise<void> {
    return storageFetch("/decision/delete", {
      method: "POST",
      body: { id: decisionId },
    });
  }

  deleteQuestion(questionId: string): Promise<void> {
    return storageFetch("/question/delete", {
      method: "POST",
      body: { id: questionId },
    });
  }

  deleteSkill(skillId: string): Promise<void> {
    return storageFetch("/skill/delete", {
      method: "POST",
      body: { id: skillId },
    });
  }

  saveEdge(edge: GraphEdge): Promise<void> {
    return storageFetch("/edge", { body: edge });
  }

  deleteEdge(edgeId: string): Promise<void> {
    return storageFetch("/edge/delete", { method: "POST", body: { id: edgeId } });
  }

  syncEdgesSnapshot(edges: GraphEdge[]): Promise<void> {
    return storageFetch("/edges/sync", { body: { edges } });
  }

  loadUserProfile(): Promise<UserProfile> {
    return storageFetch("/profile");
  }

  saveUserProfile(profile: UserProfile): Promise<void> {
    return storageFetch("/profile", { body: profile });
  }

  listPendingProposals(): Promise<ProposalEnvelope[]> {
    return storageFetch("/proposals/pending");
  }

  saveProposal(p: ProposalEnvelope): Promise<void> {
    return storageFetch("/proposals/save", { body: p });
  }

  setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
    return storageFetch("/proposals/status", { body: { id, status } });
  }

  getAppMeta(key: string): Promise<string | null> {
    return storageFetch(`/meta/${encodeURIComponent(key)}`);
  }

  setAppMeta(key: string, value: string): Promise<void> {
    return storageFetch("/meta", { body: { key, value } });
  }

  loadAgentUsage(usageDate: string): Promise<number> {
    return storageFetch(`/agent-usage/${encodeURIComponent(usageDate)}`);
  }

  addAgentUsage(usageDate: string, tokens: number): Promise<void> {
    return storageFetch("/agent-usage", { body: { usageDate, tokens } });
  }

  listGraphHistory(): Promise<GraphHistoryEntry[]> {
    return storageFetch("/graph-history");
  }

  saveGraphHistoryEntry(entry: GraphHistoryEntry): Promise<void> {
    return storageFetch("/graph-history/save", { body: entry });
  }

  setGraphHistoryUndone(id: string): Promise<void> {
    return storageFetch("/graph-history/undone", { body: { id } });
  }

  listLearningTraces(): Promise<LearningTrace[]> {
    return storageFetch("/learning-traces");
  }

  saveLearningTrace(trace: LearningTrace): Promise<void> {
    return storageFetch("/learning-traces/save", { body: trace });
  }

  listCognitiveActions(): Promise<CognitiveAction[]> {
    return storageFetch("/cognitive-actions");
  }

  saveCognitiveAction(action: CognitiveAction): Promise<void> {
    return storageFetch("/cognitive-actions/save", { body: action });
  }

  listBriefingFeedback(): Promise<BriefingFeedback[]> {
    return storageFetch("/briefing-feedback");
  }

  saveBriefingFeedback(feedback: BriefingFeedback): Promise<void> {
    return storageFetch("/briefing-feedback/save", { body: feedback });
  }
}
