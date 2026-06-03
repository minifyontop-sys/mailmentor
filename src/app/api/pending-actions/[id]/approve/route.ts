import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";
import { runAction } from "@/lib/recipe/run-action";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const action = await prisma.pendingAction.findUnique({
      where: { id: params.id },
    });
    if (!action || action.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (action.status !== "pending") {
      return NextResponse.json(
        { error: `Action is already ${action.status}` },
        { status: 409 }
      );
    }

    // Execute the action. Each action handler returns a result that we
    // log and write back to the PendingAction row.
    let result: unknown;
    let errorMessage: string | null = null;
    try {
      if (action.actionType === "ai.draft_reply") {
        // Special-case: the ai.draft_reply preview already produced
        // the full draft JSON in the payload. We don't need to
        // re-invoke the LLM; just send it.
        const draft = action.payload as { subject?: string; body?: string; to?: string };
        if (!draft?.subject || !draft?.body || !draft?.to) {
          throw new Error("Draft is missing subject/body/recipient.");
        }
        const { sendReply } = await import("@/lib/account");
        const ctx = await import("@/lib/account").then((m) =>
          m.requireActiveAccount()
        );
        const send = await sendReply(ctx, {
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
        });
        result = { sent: true, id: send.id };
      } else {
        result = await runAction(
          {
            type: action.actionType as Parameters<typeof runAction>[0]["type"],
            params: (action.payload as Record<string, unknown>) ?? {},
          },
          {
            userId: user.id,
            triggerEmailId: action.triggerEmailId ?? undefined,
            priorResults: {},
          }
        );
      }
    } catch (e: any) {
      errorMessage = e?.message ?? "Action failed.";
    }

    const newStatus = errorMessage ? "denied" : "approved";
    await prisma.$transaction([
      prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: newStatus, resolvedAt: new Date() },
      }),
      prisma.actionLog.create({
        data: {
          userId: user.id,
          recipeId: action.recipeId,
          actionType: action.actionType,
          status: errorMessage ? "failed" : "executed",
          payload: action.payload as any,
          result: result ? (result as any) : null,
          error: errorMessage,
        },
      }),
    ]);

    if (errorMessage) {
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/pending-actions/[id]/approve POST]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to approve action" },
      { status: 500 }
    );
  }
}
