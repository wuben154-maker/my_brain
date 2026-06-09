import type {

  CognitiveAction,

  CognitiveActionUserEvent,

} from "@/domain/actions/cognitiveAction";



export class ActionDraftGuardError extends Error {

  constructor(message: string) {

    super(message);

    this.name = "ActionDraftGuardError";

  }

}



export interface ActionGuardContext {

  userEvent?: CognitiveActionUserEvent;

}



/** Blocks confirmed status without an explicit user confirmation event. */

export function assertActionDraftOnly(

  action: CognitiveAction,

  context?: ActionGuardContext,

): void {

  if (action.status === "confirmed" && !context?.userEvent) {

    throw new ActionDraftGuardError(

      `CognitiveAction ${action.id} is confirmed without user event`,

    );

  }

}



export function assertUserConfirmedAction(

  userEvent: CognitiveActionUserEvent | undefined,

): asserts userEvent is CognitiveActionUserEvent {

  if (!userEvent || userEvent.kind !== "user_confirm") {

    throw new ActionDraftGuardError(

      "confirmAction requires explicit user_confirm event",

    );

  }

  if (!userEvent.actionId.trim() || !userEvent.at.trim()) {

    throw new ActionDraftGuardError("user_confirm event is incomplete");

  }

}



export function assertConfirmableDraft(action: CognitiveAction): void {

  if (action.status !== "draft") {

    throw new ActionDraftGuardError(

      `CognitiveAction ${action.id} is not confirmable (status=${action.status})`,

    );

  }

}


