import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

export const ConditionField = z.enum([
  "sender",
  "senderEmail",
  "subject",
  "body",
  "hasAttachment",
  "fromVip",
  "label",
]);
export type ConditionField = z.infer<typeof ConditionField>;

export const ConditionOp = z.enum([
  "contains",
  "equals",
  "matches", // regex
  "exists", // truthy / present
]);
export type ConditionOp = z.infer<typeof ConditionOp>;

export const ConditionSchema = z.object({
  field: ConditionField,
  op: ConditionOp,
  value: z.string().optional(),
});
export type Condition = z.infer<typeof ConditionSchema>;

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("email.arrived") }),
  z.object({ type: z.literal("email.sent") }),
  z.object({
    type: z.literal("schedule"),
    cron: z.string().min(1), // "0 16 * * 5" etc.
  }),
  z.object({ type: z.literal("manual") }),
]);
export type RecipeTrigger = z.infer<typeof TriggerSchema>;

/* ------------------------------------------------------------------ */
/* Action params (one schema per action type — discriminated union)    */
/* ------------------------------------------------------------------ */

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("calendar.propose_slots"),
    params: z.object({
      count: z.number().int().min(1).max(8).default(3),
      durationMinutes: z.number().int().min(15).max(240).default(30),
      workingHours: z
        .object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
        })
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("calendar.create_event"),
    params: z.object({
      title: z.string().min(1),
      durationMinutes: z.number().int().min(15).max(240).default(30),
      addMeetLink: z.boolean().default(true),
      attendeesFromEmail: z.boolean().default(true),
    }),
  }),
  z.object({
    type: z.literal("ai.draft_reply"),
    params: z.object({
      tone: z.enum(["default", "direct", "soft", "formal"]).default("default"),
      includeSlotsFromPriorAction: z.boolean().default(true),
    }),
  }),
  z.object({
    type: z.literal("email.archive"),
    params: z.object({}).default({}),
  }),
  z.object({
    type: z.literal("email.label"),
    params: z.object({ label: z.string().min(1) }),
  }),
  z.object({
    type: z.literal("slack.post_message"),
    params: z.object({
      channel: z.string().min(1),
      message: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("notion.create_page"),
    params: z.object({
      databaseId: z.string().min(1),
      title: z.string().min(1),
      properties: z.record(z.any()).default({}),
    }),
  }),
]);
export type RecipeAction = z.infer<typeof ActionSchema>;

export const ACTION_TYPES = ActionSchema.options.map((o) =>
  o.shape.type.value
) as RecipeAction["type"][];

/* ------------------------------------------------------------------ */
/* Recipe                                                              */
/* ------------------------------------------------------------------ */

export const RecipeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional().nullable(),
  naturalLanguage: z.string().min(1),
  trigger: TriggerSchema,
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).min(1).max(8),
  enabled: z.boolean().default(true),
  lastRunAt: z.string().nullable().optional(),
  runCount: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

/** Shape returned by the NL parser. The DB row stores trigger/conditions/actions as JSON. */
export const RecipeDraftSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional().nullable(),
  naturalLanguage: z.string().min(1),
  trigger: TriggerSchema,
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).min(1).max(8),
  enabled: z.boolean().default(true),
});
export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;
