import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await prisma.pendingAction.findMany({
      where: { userId: user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      pending: rows.map((r) => ({
        id: r.id,
        recipeId: r.recipeId,
        triggerEmailId: r.triggerEmailId,
        actionType: r.actionType,
        payload: r.payload,
        preview: r.preview,
        status: r.status,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
      count: rows.length,
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/pending-actions GET]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load pending actions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { actionType, payload, preview, recipeId, triggerEmailId } = body ?? {};
    if (!actionType || !preview) {
      return NextResponse.json(
        { error: "actionType and preview are required" },
        { status: 400 }
      );
    }
    const created = await prisma.pendingAction.create({
      data: {
        userId: user.id,
        actionType,
        payload: payload ?? {},
        preview,
        recipeId: recipeId ?? null,
        triggerEmailId: triggerEmailId ?? null,
        status: "pending",
      },
    });
    return NextResponse.json({
      id: created.id,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/pending-actions POST]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to create pending action" },
      { status: 500 }
    );
  }
}
