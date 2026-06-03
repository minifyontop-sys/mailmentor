import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";
import { parseRecipeFromNL } from "@/lib/recipe/parser";
import { RecipeDraftSchema } from "@/lib/recipe/schema";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await prisma.recipe.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      recipes: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        naturalLanguage: r.naturalLanguage,
        trigger: r.trigger,
        conditions: r.conditions,
        actions: r.actions,
        enabled: r.enabled,
        lastRunAt: r.lastRunAt?.toISOString() ?? null,
        runCount: r.runCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/recipes GET]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load recipes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = body as {
      naturalLanguage?: string;
      draft?: unknown;
    };
    let draft;
    if (input.draft) {
      const parsed = RecipeDraftSchema.safeParse(input.draft);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid draft", issues: parsed.error.issues },
          { status: 400 }
        );
      }
      draft = parsed.data;
    } else if (input.naturalLanguage) {
      draft = await parseRecipeFromNL(input.naturalLanguage, {
        userName: user.name,
      });
    } else {
      return NextResponse.json(
        { error: "naturalLanguage or draft is required" },
        { status: 400 }
      );
    }
    const created = await prisma.recipe.create({
      data: {
        userId: user.id,
        name: draft.name,
        description: draft.description ?? null,
        naturalLanguage: draft.naturalLanguage,
        trigger: draft.trigger as any,
        conditions: draft.conditions as any,
        actions: draft.actions as any,
        enabled: draft.enabled,
      },
    });
    return NextResponse.json({
      recipe: {
        id: created.id,
        name: created.name,
        description: created.description,
        naturalLanguage: created.naturalLanguage,
        trigger: created.trigger,
        conditions: created.conditions,
        actions: created.actions,
        enabled: created.enabled,
        lastRunAt: null,
        runCount: 0,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/recipes POST]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to create recipe" },
      { status: 500 }
    );
  }
}
