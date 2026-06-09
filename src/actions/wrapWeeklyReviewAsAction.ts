import { createCognitiveAction } from "@/actions/createCognitiveAction";

import {

  bodyMarkdownPrefixHash,

  type CognitiveAction,

  type CognitiveActionCitation,

} from "@/domain/actions/cognitiveAction";

import type { WeeklyBrainReview } from "@/domain/review/weeklyBrainReview";

import { WEEKLY_REVIEW_GOLDEN } from "@/cognitive/weeklyReviewGolden";



export const COGNITIVE_ACTION_WEEKLY_REVIEW_ID = "cognitive-weekly-review-2026-W22";



export interface CognitiveActionGoldenCitation {

  type: CognitiveActionCitation["type"];

  id: string;

}



export interface CognitiveActionGolden {

  id: string;

  kind: "weekly_review";

  permissionLevel: "suggest";

  status: "draft";

  weekId: string;

  titlePrefix: string;

  citations: CognitiveActionGoldenCitation[];

  bodyMarkdownPrefixHash: string;

}



function mapReviewCitations(review: WeeklyBrainReview): CognitiveActionCitation[] {

  return review.citations.map((citation) => ({

    type: citation.type,

    id: citation.id,

    label: citation.label,

  }));

}



/** Wrap D3 WeeklyBrainReview as a draft weekly_review CognitiveAction. */

export function wrapWeeklyReviewAsAction(

  review: WeeklyBrainReview,

  options?: { id?: string; createdAt?: string },

): CognitiveAction {

  return createCognitiveAction({

    id: options?.id ?? `cognitive-weekly-review-${review.weekId}`,

    kind: "weekly_review",

    title: `每周脑图回顾 · ${review.weekId}`,

    bodyMarkdown: review.markdown,

    citations: mapReviewCitations(review),

    createdAt: options?.createdAt ?? review.generatedAt,

  });

}



/** Golden snapshot for E1 harness — body hash derived from D3 golden week fixture. */

export const COGNITIVE_ACTION_GOLDEN: CognitiveActionGolden = {

  id: COGNITIVE_ACTION_WEEKLY_REVIEW_ID,

  kind: "weekly_review",

  permissionLevel: "suggest",

  status: "draft",

  weekId: WEEKLY_REVIEW_GOLDEN.weekId,

  titlePrefix: "每周脑图回顾",

  citations: [

    { type: "node", id: "showcase-ingest-graphiti" },

    { type: "historyEntry", id: "weekly-fixture-create-graphiti" },

    { type: "historyEntry", id: "weekly-fixture-merge-rag-dup" },

    { type: "historyEntry", id: "weekly-fixture-archive-stale" },

    { type: "trace", id: "weekly-trace-ingest" },

  ],

  bodyMarkdownPrefixHash: "",

};



/** Call once after building golden review to freeze prefix hash in tests. */

export function freezeCognitiveActionGoldenBodyHash(

  action: CognitiveAction,

): string {

  return bodyMarkdownPrefixHash(action.bodyMarkdown);

}



export function cognitiveActionMatchesGolden(

  action: CognitiveAction,

  golden: CognitiveActionGolden = COGNITIVE_ACTION_GOLDEN,

): boolean {

  if (action.id !== golden.id) {

    return false;

  }

  if (action.kind !== golden.kind) {

    return false;

  }

  if (action.permissionLevel !== golden.permissionLevel) {

    return false;

  }

  if (action.status !== golden.status) {

    return false;

  }

  if (!action.title.startsWith(golden.titlePrefix)) {

    return false;

  }

  for (const required of golden.citations) {

    if (

      !action.citations.some(

        (citation) => citation.type === required.type && citation.id === required.id,

      )

    ) {

      return false;

    }

  }

  const hash = bodyMarkdownPrefixHash(action.bodyMarkdown);

  if (golden.bodyMarkdownPrefixHash && hash !== golden.bodyMarkdownPrefixHash) {

    return false;

  }

  return true;

}


