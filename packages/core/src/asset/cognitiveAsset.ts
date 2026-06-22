import {
  applyIngestCreate,
  type IngestDeps,
  type IngestInput,
  type IngestResult,
} from "../conversation/ingest.js";
import type { ProvisionalCandidate, ProvisionalSourceType } from "../provisional/types.js";

export enum CognitiveAssetType {
  Concept = "concept",
  Project = "project",
  Learning = "learning",
  Life = "life",
}

export interface CognitiveAssetCandidate {
  kind: "candidate";
  assetType: CognitiveAssetType;
  candidateId: string;
  summary: string;
  evidenceRefs: string[];
  createdAt: string;
}

export interface CognitiveAssetPermanent {
  kind: "permanent";
  assetType: CognitiveAssetType;
  nodeId: string;
  summary: string;
  confirmedAt: string;
}

export type CognitiveAssetRecord = CognitiveAssetCandidate | CognitiveAssetPermanent;

const SOURCE_TO_ASSET: Record<ProvisionalSourceType, CognitiveAssetType> = {
  text: CognitiveAssetType.Concept,
  link: CognitiveAssetType.Concept,
  learning: CognitiveAssetType.Learning,
  project: CognitiveAssetType.Project,
  life: CognitiveAssetType.Life,
  image_mock: CognitiveAssetType.Concept,
  voice_note_mock: CognitiveAssetType.Life,
};

export function assetTypeFromProvisionalSource(
  sourceType: ProvisionalSourceType,
): CognitiveAssetType {
  return SOURCE_TO_ASSET[sourceType];
}

export const COGNITIVE_ASSET_TYPE_LABELS: Record<CognitiveAssetType, string> = {
  [CognitiveAssetType.Concept]: "Concept",
  [CognitiveAssetType.Project]: "Project",
  [CognitiveAssetType.Learning]: "Learning",
  [CognitiveAssetType.Life]: "Life",
};

export function cognitiveAssetTypeLabel(assetType: CognitiveAssetType): string {
  return COGNITIVE_ASSET_TYPE_LABELS[assetType];
}

/** UI copy aligned with 17-asset-candidate — candidate, not permanent. */
export function formatCandidateTypeLabel(candidate: ProvisionalCandidate): string {
  const assetType = assetTypeFromProvisionalSource(candidate.sourceType);
  return `候选类型 · ${cognitiveAssetTypeLabel(assetType)}`;
}

export function asCognitiveAssetCandidate(
  candidate: ProvisionalCandidate,
): CognitiveAssetCandidate {
  return {
    kind: "candidate",
    assetType: assetTypeFromProvisionalSource(candidate.sourceType),
    candidateId: candidate.id,
    summary: candidate.summary,
    evidenceRefs: candidate.evidenceRefs,
    createdAt: candidate.createdAt,
  };
}

export function isCognitiveAssetCandidate(
  record: CognitiveAssetRecord,
): record is CognitiveAssetCandidate {
  return record.kind === "candidate";
}

export function isCognitiveAssetPermanent(
  record: CognitiveAssetRecord,
): record is CognitiveAssetPermanent {
  return record.kind === "permanent";
}

export interface ConfirmedIngestGate {
  userConfirmed: boolean;
}

/** Permanent cognitive assets only enter via user-confirmed ingest. */
export function assertConfirmedIngestOnly(
  input: IngestInput,
  deps: IngestDeps,
  gate: ConfirmedIngestGate,
): IngestResult {
  if (!gate.userConfirmed) {
    throw new Error("Permanent cognitive asset requires explicit user confirmation");
  }
  const beforeNodes = deps.graph.countVisibleNodes();
  const result = applyIngestCreate(input, deps);
  if (deps.graph.countVisibleNodes() <= beforeNodes) {
    throw new Error("Confirmed ingest must create a visible graph node");
  }
  return result;
}

/** Single entry for UI confirm actions that create permanent graph nodes. */
export function confirmUserIngest(input: IngestInput, deps: IngestDeps): IngestResult {
  return assertConfirmedIngestOnly(input, deps, { userConfirmed: true });
}

export function toPermanentCognitiveAsset(
  assetType: CognitiveAssetType,
  ingest: IngestResult,
  summary: string,
  confirmedAt = new Date().toISOString(),
): CognitiveAssetPermanent {
  return {
    kind: "permanent",
    assetType,
    nodeId: ingest.nodeId,
    summary,
    confirmedAt,
  };
}
