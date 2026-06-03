import { prisma } from "@/lib/db.server";
import { findMatchingRecipes, type RecipeEmail } from "./evaluator";
import { runAction } from "./run-action";
import { PREVIEW_HANDLERS } from "./action-registry";
import type { Recipe } from "./schema";

/**
 * When an email arrives, the recipe engine:
 *  1. Loads the user's enabled recipes whose trigger is "email.arrived".
 *  2. Evaluates each recipe's conditions against the email.
 *  3. For matching recipes, runs each action's preview handler. The
 *     action is responsible for returning a { preview, key?, data? }
 *     object. We chain priorResults so an `ai.draft_reply` action can
 *     read a prior `calendar.propose_slots` result.
 *  4. Each preview becomes a PendingAction row, queued for the user to
 *     approve or skip.
 *
 * Approval/execution happens via /api/pending-actions/[id]/approve.
 */
export async function runRecipesForEmail(
  userId: string,
  email: RecipeEmail,
  options: { autoCreate?: boolean } = { autoCreate: true }
): Promise<{ matched: number; queued: number; rateLimited?: boolean }> {
  const rows = await prisma.recipe.findMany({
    where: {
      userId,
      enabled: true,
      trigger: { path: ["type"], equals: "email.arrived" },
    },
  });

  // Map DB rows (where conditions/actions are `Json`) into the typed
  // Recipe shape the evaluator expects. We trust the parser to have
  // produced a valid shape when the recipe was created.
  const recipes: Recipe[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    naturalLanguage: r.naturalLanguage,
    trigger: r.trigger as Recipe["trigger"],
    conditions: r.conditions as Recipe["conditions"],
    actions: r.actions as Recipe["actions"],
    enabled: r.enabled,
    runCount: r.runCount,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    userId: r.userId,
  }));

  const matches = findMatchingRecipes(recipes, email);

  if (matches.length === 0 || !options.autoCreate) {
    return { matched: matches.length, queued: 0 };
  }

  let queued = 0;
  for (const { recipe } of matches) {
    // DEDUP: skip if a pending action already exists for the same
    // (recipe, email, action) tuple. Prevents the queue from filling
    // with duplicates every time the user opens the inbox.
    const existing = await prisma.pendingAction.findMany({
      where: {
        userId,
        recipeId: recipe.id,
        triggerEmailId: email.id,
        status: "pending",
      },
      select: { actionType: true },
    });
    const alreadyQueued = new Set(existing.map((x) => x.actionType));

    // We process actions in order so that `priorResults` chaining works.
    // For preview-on-arrival we just compute each action's preview; the
    // actual run happens when the user approves.
    const priorResults: Record<string, unknown> = {};
    for (const action of recipe.actions) {
      if (alreadyQueued.has(action.type)) {
        continue;
      }
      let preview: string;
      let payload: Record<string, unknown> = (action.params as Record<string, unknown>) ?? {};
      const previewHandler =
        PREVIEW_HANDLERS[action.type as keyof typeof PREVIEW_HANDLERS];
      if (!previewHandler) {
        preview = `Would run ${action.type}`;
      } else {
        try {
          const result = await previewHandler(
            payload,
            {
              userId,
              triggerEmailId: email.id,
              priorResults,
            }
          );
          // Non-actionable previews (e.g. "no specific time found in
          // the email", "Google Calendar not connected") should NOT
          // queue a useless PendingAction card. The handler signals
          // this with `actionable: false`.
          if (result.actionable === false) {
            continue;
          }
          preview = result.preview;
          if (result.key) {
            priorResults[result.key] = result.data;
            // For actions whose preview produced a complete payload
            // (e.g. ai.draft_reply with a full draft), copy the data
            // into the persisted payload so the approve endpoint can
            // re-use it without re-running the LLM.
            if (result.data && typeof result.data === "object") {
              payload = { ...payload, ...(result.data as Record<string, unknown>) };
            }
          }
        } catch (e: any) {
          // Graceful: don't queue if the LLM is rate-limited or down.
          // The user can re-run the recipe manually once the provider
          // recovers.
          const msg = e?.message ?? "unknown error";
          if (isRateLimitError(msg)) {
            return {
              matched: matches.length,
              queued,
              rateLimited: true,
            } as any;
          }
          // Other errors: skip silently rather than queue a broken
          // card. Log so we can diagnose.
          console.warn(
            `[runRecipesForEmail] preview failed for ${action.type}:`,
            msg
          );
          continue;
        }
      }
      // Don't queue actions whose preview produced a no-op (e.g.
      // "no specific time found in the email"). Otherwise the user
      // would see a useless pending card.
      if (preview.startsWith("(") && preview.includes("failed")) {
        continue;
      }
      await prisma.pendingAction.create({
        data: {
          userId,
          recipeId: recipe.id,
          triggerEmailId: email.id,
          actionType: action.type,
          payload: payload as any,
          preview,
          status: "pending",
        },
      });
      queued += 1;
    }

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    });
  }

  return { matched: matches.length, queued };
}

/**
 * Manual "test this recipe against the current email" hook for the
 * RecipePanel UI. Runs the same pipeline but doesn't persist the
 * PendingAction rows.
 */
export async function previewRecipeForEmail(
  userId: string,
  recipeId: string,
  email: RecipeEmail
): Promise<Array<{ actionType: string; preview: string }>> {
  const row = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!row || row.userId !== userId) return [];
  const recipe: Recipe = {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    naturalLanguage: row.naturalLanguage,
    trigger: row.trigger as Recipe["trigger"],
    conditions: row.conditions as Recipe["conditions"],
    actions: row.actions as Recipe["actions"],
    enabled: row.enabled,
    runCount: row.runCount,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
  };
  const matches = findMatchingRecipes([recipe], email);
  if (matches.length === 0) return [];
  const out: Array<{ actionType: string; preview: string }> = [];
  const priorResults: Record<string, unknown> = {};
  for (const action of recipe.actions) {
    const previewHandler =
      PREVIEW_HANDLERS[action.type as keyof typeof PREVIEW_HANDLERS];
    let preview = `Would run ${action.type}`;
    if (previewHandler) {
      try {
        const r = await previewHandler(
          action.params as Record<string, unknown>,
          {
            userId,
            triggerEmailId: email.id,
            priorResults,
          }
        );
        preview = r.preview;
        if (r.key) priorResults[r.key] = r.data;
      } catch (e: any) {
        preview = `(${action.type} preview failed: ${e?.message ?? "unknown error"})`;
      }
    }
    out.push({ actionType: action.type, preview });
  }
  return out;
}

/**
 * On app open, run scheduled recipes whose conditions evaluate against
 * synthetic context (a "self-email" placeholder). For v1 this just
 * toggles a `lastRunAt` heartbeat. Real scheduled logic (Vercel Cron
 * + free/busy polling) is a follow-up.
 */
export async function runScheduledRecipes(
  userId: string
): Promise<{ matched: number; queued: number }> {
  const scheduled = await prisma.recipe.findMany({
    where: {
      userId,
      enabled: true,
      trigger: { path: ["type"], equals: "schedule" },
    },
  });
  for (const r of scheduled) {
    await prisma.recipe.update({
      where: { id: r.id },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    });
  }
  return { matched: scheduled.length, queued: 0 };
}

// Avoid unused import warning for `runAction`; kept for future
// "auto-execute" mode that admin opt-in could enable.
void runAction;

function isRateLimitError(message: string): boolean {
  return /rate limit|429|tpd|tokens per day/i.test(message);
}
