import type { RecipeAction } from "./schema";
import type { ActionContext, ActionResult } from "./action-context";

/**
 * Loose-typed input shape for runtime action dispatch. The DB stores
 * actions as `Json` columns, so at the point of execution we only know
 * the `type` discriminator with confidence (Zod validated it on parse).
 * The action-specific params are cast inside the handler.
 */
export interface LooseRecipeAction {
  type: RecipeAction["type"];
  params: Record<string, unknown>;
}

/**
 * Dispatches a RecipeAction to its registered handler. Each handler is
 * responsible for executing the action (calling Google Calendar, sending
 * an email, posting to Slack, etc.) and returning an ActionResult.
 *
 * If no handler is registered, throws — which the caller (the approve
 * endpoint) catches, logs as "failed", and surfaces the error to the
 * user. This means adding a new action type is a two-step change: add
 * to schema + register a handler.
 */
export async function runAction(
  action: LooseRecipeAction,
  ctx: ActionContext
): Promise<ActionResult> {
  // Lazy import to keep the registry bundled where it's used
  const { ACTION_HANDLERS } = await import("./action-registry");
  const handler = ACTION_HANDLERS[action.type];
  if (!handler) {
    throw new Error(
      `No handler registered for action type "${action.type}". This action is not implemented yet.`
    );
  }
  // The handlers accept a fully-typed RecipeAction; we cast here
  // because we trust the Zod-validated payload stored in the DB.
  return handler(
    { type: action.type, params: action.params as any },
    ctx
  );
}
