import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";

/**
 * DELETE /api/pending-actions/clear
 *
 * Resolves all pending actions for the current user. Each cleared
 * action is also logged as a "denied" entry in the ActionLog so we
 * keep an audit trail of what the user dismissed.
 *
 * Optional body: { scope: "pending" | "all" } — defaults to "pending".
 *   "pending" only clears status=pending
 *   "all"     clears pending + approved + denied (everything not yet
 *             executed)
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const scope = body?.scope === "all" ? "all" : "pending";

    const where: any = { userId: user.id };
    if (scope === "pending") where.status = "pending";

    const toClear = await prisma.pendingAction.findMany({
      where,
      select: { id: true, recipeId: true, actionType: true, payload: true, status: true },
    });

    if (toClear.length === 0) {
      return NextResponse.json({ ok: true, cleared: 0 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.pendingAction.updateMany({
        where: { id: { in: toClear.map((a) => a.id) } },
        data: { status: "denied", resolvedAt: now },
      }),
      ...toClear.map((a) =>
        prisma.actionLog.create({
          data: {
            userId: user.id,
            recipeId: a.recipeId,
            actionType: a.actionType,
            status: "denied",
            payload: a.payload as any,
            result: Prisma.JsonNull,
            error: `Bulk-cleared via UI (${scope})`,
          },
        })
      ),
    ]);

    return NextResponse.json({ ok: true, cleared: toClear.length });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/pending-actions/clear DELETE]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to clear pending actions" },
      { status: 500 }
    );
  }
}
