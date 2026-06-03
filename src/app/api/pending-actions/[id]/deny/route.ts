import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";

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
    await prisma.$transaction([
      prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: "denied", resolvedAt: new Date() },
      }),
      prisma.actionLog.create({
        data: {
          userId: user.id,
          recipeId: action.recipeId,
          actionType: action.actionType,
          status: "denied",
          payload: action.payload as any,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/pending-actions/[id]/deny POST]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to deny action" },
      { status: 500 }
    );
  }
}
