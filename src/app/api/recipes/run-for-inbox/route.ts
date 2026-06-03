import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";
import {
  listMessages,
  requireActiveAccount,
  NoActiveAccountError,
  UnsupportedProviderError,
} from "@/lib/account";
import { runRecipesForEmail } from "@/lib/recipe/engine";

/**
 * POST /api/recipes/run-for-inbox
 *
 * Pulls the most recent N messages from the active account and runs
 * the recipe engine against each one. This is what fires on app open
 * (and on inbox refresh) to surface "Would you like to X?" prompts.
 *
 * Body: { limit?: number (default 10) }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit ?? 10), 1), 50);
    const accountId = body?.accountId ?? undefined;

    const ctx = await requireActiveAccount(accountId).catch((e: unknown) => {
      if (e instanceof NoActiveAccountError) {
        return { __error: { status: 401, message: e.message } };
      }
      if (e instanceof UnsupportedProviderError) {
        return { __error: { status: 501, message: e.message } };
      }
      throw e;
    });
    if (typeof ctx === "object" && "__error" in ctx) {
      return NextResponse.json(
        { error: ctx.__error.message },
        { status: ctx.__error.status }
      );
    }

    const { messages } = await listMessages(ctx, { maxResults: limit });

    let totalMatched = 0;
    let totalQueued = 0;
    let rateLimited = false;
    for (const m of messages) {
      const { matched, queued, rateLimited: rl } = await runRecipesForEmail(
        user.id,
        {
          id: m.id,
          subject: m.subject,
          body: m.body || m.snippet || "",
          senderName: m.sender.name,
          senderEmail: m.sender.email,
          isReplyToMine: Boolean(m.isReplyToMine),
          hasAttachment: false,
          labels: m.labels ?? [],
          isVip: false,
        }
      );
      totalMatched += matched;
      totalQueued += queued;
      if (rl) {
        rateLimited = true;
        // Stop spamming the LLM once we hit a rate limit
        break;
      }
    }

    return NextResponse.json({
      scanned: messages.length,
      matched: totalMatched,
      queued: totalQueued,
      rateLimited,
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/recipes/run-for-inbox POST]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to run recipes" },
      { status: 500 }
    );
  }
}
