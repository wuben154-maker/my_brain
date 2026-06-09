import {

  type CognitiveAction,

  type CognitiveActionCitation,

  type CognitiveActionKind,

  type CognitiveActionStatus,

  type CognitiveActionUserEvent,

  type CognitiveActionMetadata,

  type PermissionLevel,

  validateCognitiveActionCitations,

  validateCognitiveActionMetadata,

} from "@/domain/actions/cognitiveAction";

import { assertUserConfirmedAction } from "@/actions/actionDraftGuard";



export interface CreateCognitiveActionInput {

  id: string;

  kind: CognitiveActionKind;

  title: string;

  bodyMarkdown: string;

  citations: CognitiveActionCitation[];

  permissionLevel?: PermissionLevel;

  status?: CognitiveActionStatus;

  createdAt?: string;

  metadata?: CognitiveActionMetadata;

}



export interface CreateCognitiveActionContext {

  userEvent?: CognitiveActionUserEvent;

}



/** Pure factory — defaults draft + suggest; invalid citations fail fast. */

export function createCognitiveAction(

  input: CreateCognitiveActionInput,

  context?: CreateCognitiveActionContext,

): CognitiveAction {

  const status = input.status ?? "draft";

  if (status === "confirmed") {

    assertUserConfirmedAction(context?.userEvent);

  }



  const citations = validateCognitiveActionCitations(input.citations);

  const metadata =
    input.metadata === undefined
      ? undefined
      : validateCognitiveActionMetadata(input.kind, input.metadata);

  const action: CognitiveAction = {

    id: input.id.trim(),

    kind: input.kind,

    title: input.title.trim(),

    bodyMarkdown: input.bodyMarkdown,

    citations,

    permissionLevel: input.permissionLevel ?? "suggest",

    status,

    createdAt: input.createdAt ?? new Date().toISOString(),

  };

  if (metadata !== undefined) {

    action.metadata = metadata;

  }

  return action;

}


