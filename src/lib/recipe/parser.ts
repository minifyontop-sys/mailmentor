import "server-only";
import { chatCompletion } from "@/lib/ai";
import { RecipeDraftSchema, type RecipeDraft } from "./schema";
import { ACTION_REGISTRY } from "./action-registry";

/**
 * Parses a free-text automation description into a structured RecipeDraft.
 * The LLM is given the full action registry and a few examples; output is
 * Zod-validated and (on parse failure) retried once with the error
 * surfaced in the prompt.
 */
export async function parseRecipeFromNL(
  naturalLanguage: string,
  context: {
    userName?: string | null;
    knownPeople?: string[];
  } = {}
): Promise<RecipeDraft> {
  const system = buildSystemPrompt(context);
  const user = naturalLanguage.trim();

  let draft = await runParse(system, user, 1);

  // One auto-retry: if Zod validation fails, ask the model to fix it.
  const firstValidation = RecipeDraftSchema.safeParse(draft);
  if (!firstValidation.success) {
    const issues = firstValidation.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const fixUser = `Your previous response failed schema validation. Fix it and return ONLY the corrected JSON object.\n\nValidation errors:\n${issues}\n\nOriginal request: "${user}"`;
    draft = await runParse(system, fixUser, 1);
  }

  const final = RecipeDraftSchema.safeParse(draft);
  if (!final.success) {
    throw new Error(
      `Recipe could not be parsed: ${final.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }
  return final.data;
}

async function runParse(
  system: string,
  user: string,
  temperature: number
): Promise<unknown> {
  const text = await chatCompletion({
    system,
    user,
    temperature,
    maxTokens: 900,
    json: true,
  });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "AI returned malformed JSON for the recipe. Try rephrasing your request."
    );
  }
}

function buildSystemPrompt(context: {
  userName?: string | null;
  knownPeople?: string[];
}): string {
  const registryText = ACTION_REGISTRY.map((a) => {
    return `- ${a.type}\n    ${a.description}\n    params: ${a.paramsHint}`;
  }).join("\n\n");

  const peopleContext = context.knownPeople?.length
    ? `\nThe user regularly corresponds with these people (use these to resolve "Sarah" → "sarah@company.com" if the user mentions them by first name):\n${context.knownPeople
        .slice(0, 12)
        .map((p) => `  - ${p}`)
        .join("\n")}`
    : "";

  return `You translate plain-English automation requests into a structured "recipe" that the MailMentor engine can execute.

You always respond with a single valid JSON object matching this exact shape (no extra fields, no commentary, no code fences):

{
  "name": string,                       // short, human-readable name for the recipe
  "description": string | null,         // 1-sentence "what this does"
  "naturalLanguage": string,            // echo the user's original request verbatim
  "trigger": {
    "type": "email.arrived" | "email.sent" | "schedule" | "manual"
    // "schedule" also requires "cron": "<5-field cron expression>"
  },
  "conditions": [
    {
      "field": "sender" | "senderEmail" | "subject" | "body" | "hasAttachment" | "fromVip" | "label",
      "op": "contains" | "equals" | "matches" | "exists",
      "value": string                    // required for all ops except "exists"
    }
  ],
  "actions": [
    // 1-8 action objects, each matching one of the registered action types below
  ],
  "enabled": boolean                    // true unless the user explicitly says "off" or "disabled"
}

## Available action types

${registryText}

## Conditions

- "sender" matches the display name of the sender
- "senderEmail" matches the raw email address
- "subject" / "body" match text in those fields (case-insensitive substring)
- "matches" uses a JS-compatible regular expression (escape special chars)
- For "exists" the value field should be omitted
- If the user describes a trigger that should match many things, leave conditions empty

## Triggers

- "email.arrived" — fires when a new email hits the inbox. Most common.
- "email.sent" — fires when the user sends an email.
- "schedule" — fires on a cron schedule. Use 5-field cron (minute hour day-of-month month day-of-week).
- "manual" — user-triggered only (for actions that don't tie to an email).

## Rules

- The recipe name should be short (≤60 chars) and action-oriented ("Meeting request → propose slots", not "My recipe 1").
- Conditions are AND-combined. If the user says "from Sarah OR about Project X", make TWO recipes, not one with OR.
- If the user's request implies needing the calendar, you MUST also include the action that uses it (e.g. "propose meeting slots" needs both calendar.propose_slots AND ai.draft_reply with includeSlotsFromPriorAction: true).
- If the user's request is too vague to extract specific actions, prefer a single manual recipe with a brief action that captures their intent.
- Do NOT invent action types that aren't in the registry above. If the request needs something we don't have, choose the closest existing action and set a clear description.
- cron expressions use server time (UTC). For "every Friday at 4pm" use "0 16 * * 5".
- For "every Monday morning", use "0 9 * * 1" (the user can fine-tune).
${peopleContext}
${context.userName ? `\nThe user's name is "${context.userName}". When drafting actions that need a sign-off, prefer this name.` : ""}

## Output

Return ONLY the JSON object. No prose. No code fences. No trailing commentary.`;
}
