import { z } from "zod";
import type { RecipeAction } from "./schema";
import type { ActionContext, ActionHandler, ActionResult } from "./action-context";

/**
 * The action registry. Each entry describes what an action does and
 * provides a handler that runs the action. The LLM parser can only emit
 * action types that exist here — the Zod `ActionSchema` enum is derived
 * from this list.
 */
export interface ActionSpec {
  type: RecipeAction["type"];
  description: string;
  paramsHint: string;
  /** If the action can be invoked when there's no email context (e.g. schedule triggers). */
  emailRequired: boolean;
}

export const ACTION_REGISTRY: ActionSpec[] = [
  {
    type: "calendar.propose_slots",
    description:
      "Finds N free time slots in the user's calendar for a meeting. Returns the slots as ISO times. Used together with ai.draft_reply.",
    paramsHint: `{ count?: number (1-8, default 3), durationMinutes?: number (15-240, default 30), workingHours?: { start: "HH:MM", end: "HH:MM" } }`,
    emailRequired: true,
  },
  {
    type: "calendar.create_event",
    description:
      "Creates a Google Calendar event. Title and duration come from params; attendees are auto-pulled from the source email if attendeesFromEmail is true.",
    paramsHint: `{ title: string, durationMinutes?: number, addMeetLink?: boolean, attendeesFromEmail?: boolean }`,
    emailRequired: true,
  },
  {
    type: "ai.draft_reply",
    description:
      "Drafts an email reply in the user's voice. By default pulls proposed time slots from a prior calendar.propose_slots action. Tone: 'default' | 'direct' | 'soft' | 'formal'.",
    paramsHint: `{ tone?: "default"|"direct"|"soft"|"formal", includeSlotsFromPriorAction?: boolean }`,
    emailRequired: true,
  },
  {
    type: "email.archive",
    description:
      "Archives the source email (Gmail: removes INBOX label; Outlook: moves to Archive folder).",
    paramsHint: `{}`,
    emailRequired: true,
  },
  {
    type: "email.label",
    description:
      "Applies a label to the source email (Gmail) or moves to a folder (Outlook).",
    paramsHint: `{ label: string }`,
    emailRequired: true,
  },
  {
    type: "slack.post_message",
    description:
      "Posts a message to a Slack channel. Requires the Slack connector to be connected.",
    paramsHint: `{ channel: string (channel name like "#general" or ID), message: string }`,
    emailRequired: false,
  },
  {
    type: "notion.create_page",
    description:
      "Creates a page in a Notion database. Requires the Notion connector to be connected.",
    paramsHint: `{ databaseId: string, title: string, properties?: Record<string, any> }`,
    emailRequired: false,
  },
];

export const ACTION_TYPE_TO_SPEC: Record<string, ActionSpec> = Object.fromEntries(
  ACTION_REGISTRY.map((s) => [s.type, s])
);

export function getActionSpec(type: string): ActionSpec | undefined {
  return ACTION_TYPE_TO_SPEC[type];
}

/**
 * The handler registry. Only wired up for the action types we've
 * actually implemented; unimplemented ones throw at run time.
 */
export const ACTION_HANDLERS: Partial<Record<RecipeAction["type"], ActionHandler>> = {
  "calendar.create_event": async (params, ctx) => {
    const { executeCreateEvent, parseDateFlexible } = await import(
      "@/lib/recipe/actions/calendar-create-event"
    );
    const p = params as unknown as Record<string, unknown>;
    const result = await executeCreateEvent(ctx.userId, p);
    const startDisplay = (() => {
      const d = parseDateFlexible(String(p.start ?? ""));
      return d ? d.toLocaleString() : "time TBD";
    })();
    return {
      key: "event",
      data: result,
      preview: `Created event "${p.title}" (${startDisplay})${
        result.hangoutLink ? " · Meet link attached" : ""
      }`,
    };
  },
  // Other action types are registered by their modules in
  // lib/recipe/actions/*.ts at import time.
};

/**
 * Preview handlers. A preview handler runs against a real (or synthetic)
 * context and returns a human-readable string that gets stored on the
 * PendingAction row. For actions that have rich state (calendar slots,
 * AI drafts) this lets the user see the actual proposed output before
 * approving.
 *
 * Preview handlers are best-effort: if the connector isn't connected,
 * the handler should still return a sensible "would run X" string.
 */
export interface PreviewHandler {
  (
    params: Record<string, unknown>,
    ctx: ActionContext
  ): Promise<{
    preview: string;
    key?: string;
    data?: unknown;
    /**
     * If false, the engine will NOT queue a PendingAction for this
     * preview. Use this for "no-op" cases like "no specific time
     * found in the email" or "Google Calendar not connected" where
     * the user wouldn't have anything to approve.
     */
    actionable?: boolean;
  }>;
}

export const PREVIEW_HANDLERS: Partial<Record<RecipeAction["type"], PreviewHandler>> = {};

/**
 * Allow action modules to register their preview handler at import
 * time. The module side-effect (see preview-handlers.ts) calls this
 * with the handler it wants to attach.
 */
export function registerPreviewHandler(
  type: RecipeAction["type"],
  handler: PreviewHandler
): void {
  PREVIEW_HANDLERS[type] = handler;
}

// Trigger lazy registration of preview handlers from action modules.
import("@/lib/recipe/actions/preview-handlers").catch(() => null);
