import type { RecipeAction } from "./schema";

export interface ActionContext {
  userId: string;
  triggerEmailId?: string;
  triggerEmailSubject?: string;
  triggerEmailSender?: string;
  triggerEmailBody?: string;
  /**
   * Outputs from prior actions in the same recipe run. Action N can read
   * the result of action N-1 by name. Used for "propose_slots" → "ai.draft_reply"
   * where the draft reply needs the slot list.
   */
  priorResults: Record<string, unknown>;
}

export interface ActionResult {
  /** Stable key used by later actions to reference this result via priorResults. */
  key: string;
  /** What the action produced. Shape depends on action type. */
  data: unknown;
  /** Human-readable summary for the pending-action preview. */
  preview: string;
  /** If the action can be undone, the descriptor for the undo handler. */
  undo?: { type: string; descriptor: unknown };
}

export type ActionHandler = (
  action: RecipeAction,
  ctx: ActionContext
) => Promise<ActionResult>;
