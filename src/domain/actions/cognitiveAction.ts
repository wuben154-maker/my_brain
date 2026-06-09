/** KOS-E1 — unified cognitive action model (draft-only by default). */



export const COGNITIVE_ACTION_KINDS = [

  "weekly_review",

  "interview_question",

  "project_issue",

  "roadmap",

  "blog_draft",

  "research_followup",

  "learning_path",

] as const;



export type CognitiveActionKind = (typeof COGNITIVE_ACTION_KINDS)[number];



export const PERMISSION_LEVELS = [

  "read",

  "suggest",

  "auto_organize",

  "user_confirmed_write",

] as const;



export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];



export const COGNITIVE_ACTION_STATUSES = [

  "draft",

  "confirmed",

  "dismissed",

] as const;



export type CognitiveActionStatus = (typeof COGNITIVE_ACTION_STATUSES)[number];



export const COGNITIVE_ACTION_CITATION_TYPES = [

  "node",

  "historyEntry",

  "trace",

] as const;



export type CognitiveActionCitationType =

  (typeof COGNITIVE_ACTION_CITATION_TYPES)[number];



export interface CognitiveActionCitation {

  type: CognitiveActionCitationType;

  id: string;

  label: string;

}

/** Structured payload for project_issue / roadmap drafts (KOS-E2). */
export interface ProjectSuggestionMetadata {
  linkedNodeIds: string[];
  reason: string;
  expectedImpact: string;
  suggestedNextStep: string;
  worldItemId?: string;
}

/** Structured payload for blog_draft actions (KOS-E3). */
export interface BlogDraftSection {
  heading: string;
  body: string;
  citations: string[];
}

export interface BlogDraftMetadata {
  pathNodeIds: string[];
  sections: BlogDraftSection[];
}

/** Structured payload for research_followup actions (KOS-E3). */
export interface ResearchFollowupItem {
  label: string;
  reason: string;
  worldItemId?: string;
  query?: string;
}

export interface ResearchFollowupMetadata {
  researchItems: ResearchFollowupItem[];
}

export type CognitiveActionMetadata =
  | ProjectSuggestionMetadata
  | BlogDraftMetadata
  | ResearchFollowupMetadata
  | Record<string, unknown>;

export interface CognitiveAction {

  id: string;

  kind: CognitiveActionKind;

  title: string;

  bodyMarkdown: string;

  citations: CognitiveActionCitation[];

  permissionLevel: PermissionLevel;

  status: CognitiveActionStatus;

  createdAt: string;

  metadata?: CognitiveActionMetadata;

}



export interface CognitiveActionUserEvent {

  kind: "user_confirm";

  at: string;

  source: "harness" | "ui";

  actionId: string;

}



const KIND_SET = new Set<string>(COGNITIVE_ACTION_KINDS);

const PERMISSION_SET = new Set<string>(PERMISSION_LEVELS);

const STATUS_SET = new Set<string>(COGNITIVE_ACTION_STATUSES);

const CITATION_TYPE_SET = new Set<string>(COGNITIVE_ACTION_CITATION_TYPES);



export class CognitiveActionValidationError extends Error {

  constructor(message: string) {

    super(message);

    this.name = "CognitiveActionValidationError";

  }

}



function assertNonEmpty(value: unknown, field: string): string {

  const text = String(value ?? "").trim();

  if (!text) {

    throw new CognitiveActionValidationError(`${field} is required`);

  }

  return text;

}



export function normalizeCognitiveActionCitation(

  raw: unknown,

): CognitiveActionCitation | null {

  if (!raw || typeof raw !== "object") {

    return null;

  }

  const record = raw as Record<string, unknown>;

  const typeRaw = String(record.type ?? "").trim();

  if (!CITATION_TYPE_SET.has(typeRaw)) {

    return null;

  }

  const id = String(record.id ?? "").trim();

  const label = String(record.label ?? "").trim();

  if (!id || !label) {

    return null;

  }

  return {

    type: typeRaw as CognitiveActionCitationType,

    id,

    label,

  };

}



export function validateCognitiveActionCitations(

  citations: unknown,

): CognitiveActionCitation[] {

  if (!Array.isArray(citations)) {

    throw new CognitiveActionValidationError("citations must be an array");

  }

  const normalized: CognitiveActionCitation[] = [];

  for (const raw of citations) {

    const citation = normalizeCognitiveActionCitation(raw);

    if (!citation) {

      throw new CognitiveActionValidationError("invalid citation entry");

    }

    normalized.push(citation);

  }

  return normalized;

}



export function serializeCognitiveActionCitations(

  citations: CognitiveActionCitation[],

): string {

  return JSON.stringify(citations);

}



export function parseCognitiveActionCitations(json: string): CognitiveActionCitation[] {

  let parsed: unknown;

  try {

    parsed = JSON.parse(json);

  } catch {

    throw new CognitiveActionValidationError("citations_json is not valid JSON");

  }

  return validateCognitiveActionCitations(parsed);

}

const EMPTY_METADATA_JSON = "{}";

const PROJECT_SUGGESTION_KINDS = new Set<CognitiveActionKind>(["project_issue", "roadmap"]);
const BLOG_DRAFT_KINDS = new Set<CognitiveActionKind>(["blog_draft"]);
const RESEARCH_FOLLOWUP_KINDS = new Set<CognitiveActionKind>(["research_followup"]);

export function isProjectSuggestionMetadata(
  metadata: CognitiveActionMetadata,
): metadata is ProjectSuggestionMetadata {
  const record = metadata as ProjectSuggestionMetadata;
  return (
    Array.isArray(record.linkedNodeIds) &&
    record.linkedNodeIds.length > 0 &&
    typeof record.reason === "string" &&
    record.reason.trim().length > 0 &&
    typeof record.expectedImpact === "string" &&
    record.expectedImpact.trim().length > 0 &&
    typeof record.suggestedNextStep === "string" &&
    record.suggestedNextStep.trim().length > 0
  );
}

export function isBlogDraftMetadata(
  metadata: CognitiveActionMetadata,
): metadata is BlogDraftMetadata {
  const record = metadata as BlogDraftMetadata;
  if (!Array.isArray(record.pathNodeIds) || !Array.isArray(record.sections)) {
    return false;
  }
  if (record.pathNodeIds.length < 1 || record.sections.length < 1) {
    return false;
  }
  return record.sections.every(
    (section) =>
      typeof section.heading === "string" &&
      section.heading.trim().length > 0 &&
      typeof section.body === "string" &&
      section.body.trim().length > 0 &&
      Array.isArray(section.citations) &&
      section.citations.length >= 1 &&
      section.citations.every((id) => typeof id === "string" && id.trim().length > 0),
  );
}

export function isResearchFollowupMetadata(
  metadata: CognitiveActionMetadata,
): metadata is ResearchFollowupMetadata {
  const record = metadata as ResearchFollowupMetadata;
  if (!Array.isArray(record.researchItems) || record.researchItems.length < 1) {
    return false;
  }
  return record.researchItems.every((item) => {
    if (typeof item.label !== "string" || item.label.trim().length === 0) {
      return false;
    }
    if (typeof item.reason !== "string" || item.reason.trim().length === 0) {
      return false;
    }
    const worldItemId =
      typeof item.worldItemId === "string" ? item.worldItemId.trim() : "";
    const query = typeof item.query === "string" ? item.query.trim() : "";
    return worldItemId.length > 0 || query.length > 0;
  });
}

export function validateCognitiveActionMetadata(
  kind: CognitiveActionKind,
  metadata: unknown,
): CognitiveActionMetadata | undefined {
  if (metadata === undefined || metadata === null) {
    return undefined;
  }
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new CognitiveActionValidationError("metadata must be an object");
  }
  const record = metadata as Record<string, unknown>;
  if (PROJECT_SUGGESTION_KINDS.has(kind)) {
    const linkedNodeIds = Array.isArray(record.linkedNodeIds)
      ? record.linkedNodeIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const reason = String(record.reason ?? "").trim();
    const expectedImpact = String(record.expectedImpact ?? "").trim();
    const suggestedNextStep = String(record.suggestedNextStep ?? "").trim();
    if (linkedNodeIds.length < 1) {
      throw new CognitiveActionValidationError("metadata.linkedNodeIds must be non-empty");
    }
    if (!reason || !expectedImpact || !suggestedNextStep) {
      throw new CognitiveActionValidationError("metadata reason/impact/nextStep are required");
    }
    const normalized: ProjectSuggestionMetadata = {
      linkedNodeIds,
      reason,
      expectedImpact,
      suggestedNextStep,
    };
    const worldItemId = String(record.worldItemId ?? "").trim();
    if (worldItemId) {
      normalized.worldItemId = worldItemId;
    }
    return normalized;
  }
  if (BLOG_DRAFT_KINDS.has(kind)) {
    const pathNodeIds = Array.isArray(record.pathNodeIds)
      ? record.pathNodeIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const rawSections = Array.isArray(record.sections) ? record.sections : [];
    const sections: BlogDraftSection[] = [];
    for (const raw of rawSections) {
      if (!raw || typeof raw !== "object") {
        throw new CognitiveActionValidationError("metadata.sections entries must be objects");
      }
      const sectionRecord = raw as Record<string, unknown>;
      const heading = String(sectionRecord.heading ?? "").trim();
      const body = String(sectionRecord.body ?? "").trim();
      const citations = Array.isArray(sectionRecord.citations)
        ? sectionRecord.citations.map((id) => String(id).trim()).filter(Boolean)
        : [];
      if (!heading || !body || citations.length < 1) {
        throw new CognitiveActionValidationError(
          "metadata.sections require heading, body, and citations",
        );
      }
      sections.push({ heading, body, citations });
    }
    if (pathNodeIds.length < 1 || sections.length < 1) {
      throw new CognitiveActionValidationError(
        "metadata.pathNodeIds and metadata.sections must be non-empty",
      );
    }
    return { pathNodeIds, sections };
  }
  if (RESEARCH_FOLLOWUP_KINDS.has(kind)) {
    const rawItems = Array.isArray(record.researchItems) ? record.researchItems : [];
    const researchItems: ResearchFollowupItem[] = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== "object") {
        throw new CognitiveActionValidationError("metadata.researchItems entries must be objects");
      }
      const itemRecord = raw as Record<string, unknown>;
      const label = String(itemRecord.label ?? "").trim();
      const reason = String(itemRecord.reason ?? "").trim();
      const worldItemId = String(itemRecord.worldItemId ?? "").trim();
      const query = String(itemRecord.query ?? "").trim();
      if (!label || !reason) {
        throw new CognitiveActionValidationError("researchItems require label and reason");
      }
      if (!worldItemId && !query) {
        throw new CognitiveActionValidationError(
          "researchItems require worldItemId or query",
        );
      }
      const normalized: ResearchFollowupItem = { label, reason };
      if (worldItemId) {
        normalized.worldItemId = worldItemId;
      }
      if (query) {
        normalized.query = query;
      }
      researchItems.push(normalized);
    }
    if (researchItems.length < 1) {
      throw new CognitiveActionValidationError("metadata.researchItems must be non-empty");
    }
    return { researchItems };
  }
  return record;
}

export function serializeCognitiveActionMetadata(
  metadata: CognitiveActionMetadata | undefined,
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return EMPTY_METADATA_JSON;
  }
  return JSON.stringify(metadata);
}

export function parseCognitiveActionMetadata(json: string): CognitiveActionMetadata | undefined {
  const trimmed = (json ?? "").trim() || EMPTY_METADATA_JSON;
  if (trimmed === EMPTY_METADATA_JSON) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new CognitiveActionValidationError("metadata_json is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  return parsed as CognitiveActionMetadata;
}

export function normalizeCognitiveAction(raw: unknown): CognitiveAction | null {

  if (!raw || typeof raw !== "object") {

    return null;

  }

  const record = raw as Record<string, unknown>;

  const kindRaw = String(record.kind ?? "").trim();

  const permissionRaw = String(record.permissionLevel ?? "").trim();

  const statusRaw = String(record.status ?? "").trim();

  if (!KIND_SET.has(kindRaw)) {

    return null;

  }

  if (!PERMISSION_SET.has(permissionRaw)) {

    return null;

  }

  if (!STATUS_SET.has(statusRaw)) {

    return null;

  }

  try {

    const id = assertNonEmpty(record.id, "id");

    const title = assertNonEmpty(record.title, "title");

    const bodyMarkdown = assertNonEmpty(record.bodyMarkdown ?? record.body_md, "bodyMarkdown");

    const createdAt = assertNonEmpty(record.createdAt ?? record.created_at, "createdAt");

    const citations = validateCognitiveActionCitations(record.citations);

    const kind = kindRaw as CognitiveActionKind;

    const metadataRaw =
      record.metadata ??
      (typeof record.metadata_json === "string"
        ? parseCognitiveActionMetadata(record.metadata_json)
        : undefined);

    const metadata =
      metadataRaw === undefined
        ? undefined
        : validateCognitiveActionMetadata(kind, metadataRaw);

    const action: CognitiveAction = {

      id,

      kind,

      title,

      bodyMarkdown,

      citations,

      permissionLevel: permissionRaw as PermissionLevel,

      status: statusRaw as CognitiveActionStatus,

      createdAt,

    };

    if (metadata !== undefined) {

      action.metadata = metadata;

    }

    return action;

  } catch {

    return null;

  }

}



export function serializeCognitiveAction(action: CognitiveAction): string {

  return JSON.stringify(action);

}



export function parseCognitiveAction(json: string): CognitiveAction {

  let parsed: unknown;

  try {

    parsed = JSON.parse(json);

  } catch {

    throw new CognitiveActionValidationError("action JSON is invalid");

  }

  const action = normalizeCognitiveAction(parsed);

  if (!action) {

    throw new CognitiveActionValidationError("action JSON failed validation");

  }

  return action;

}



/** Deterministic prefix hash for golden bodyMarkdown snapshots (first N chars). */

export function bodyMarkdownPrefixHash(markdown: string, length = 80): string {

  const prefix = markdown.slice(0, length);

  let hash = 5381;

  for (let i = 0; i < prefix.length; i += 1) {

    hash = (hash * 33) ^ prefix.charCodeAt(i);

  }

  return (hash >>> 0).toString(16);

}



export interface StoredCognitiveActionRow {

  id: string;

  kind: CognitiveActionKind;

  title: string;

  bodyMd: string;

  citationsJson: string;

  metadataJson: string;

  permissionLevel: PermissionLevel;

  status: CognitiveActionStatus;

  createdAt: string;

}



export function mapStoredCognitiveActionRow(

  row: StoredCognitiveActionRow,

): CognitiveAction {

  const metadata = parseCognitiveActionMetadata(row.metadataJson);

  const action: CognitiveAction = {

    id: row.id,

    kind: row.kind,

    title: row.title,

    bodyMarkdown: row.bodyMd,

    citations: parseCognitiveActionCitations(row.citationsJson),

    permissionLevel: row.permissionLevel,

    status: row.status,

    createdAt: row.createdAt,

  };

  if (metadata !== undefined) {

    action.metadata = validateCognitiveActionMetadata(row.kind, metadata);

  }

  return action;

}


