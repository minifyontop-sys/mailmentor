import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";
import { RecipeDraftSchema } from "@/lib/recipe/schema";

const PatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(280).nullable().optional(),
  })
  .merge(RecipeDraftSchema.partial().omit({ naturalLanguage: true }));

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
    const existing = await prisma.recipe.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.recipe.update({
      where: { id: params.id },
      data: {
        enabled: parsed.data.enabled ?? existing.enabled,
        name: parsed.data.name ?? existing.name,
        description:
          parsed.data.description !== undefined
            ? parsed.data.description
            : existing.description,
      },
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/recipes/[id] PATCH]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to update recipe" },
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
    const existing = await prisma.recipe.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.recipe.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/recipes/[id] DELETE]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
