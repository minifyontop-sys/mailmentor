import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";

const PatchSchema = z.object({
  done: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const existing = await prisma.taskMirror.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.taskMirror.update({
      where: { id: params.id },
      data: { done: parsed.data.done ?? existing.done },
    });
    return NextResponse.json({ ok: true, done: updated.done });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/tasks/[id] PATCH]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const existing = await prisma.taskMirror.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.taskMirror.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/tasks/[id] DELETE]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to delete task" },
      { status: 500 }
    );
  }
}
