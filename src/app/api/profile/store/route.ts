import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";

const ProfilePutSchema = z.object({
  data: z.any(), // UserProfile shape; validated by the existing Zod schema on the client side
  generatedAt: z.string().nullable().optional(),
  sourceEmailCount: z.number().int().nonnegative().optional(),
  replyMode: z.enum(["always", "strict"]).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const mirror = await prisma.profileMirror.findUnique({
      where: { userId: user.id },
    });
    if (!mirror) {
      return NextResponse.json({ profile: null });
    }
    return NextResponse.json({
      profile: {
        data: mirror.data,
        generatedAt: mirror.generatedAt?.toISOString() ?? null,
        sourceEmailCount: mirror.sourceEmailCount,
        replyMode: mirror.replyMode,
        updatedAt: mirror.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/profile/store GET]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = ProfilePutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { data, generatedAt, sourceEmailCount, replyMode } = parsed.data;
    const mirror = await prisma.profileMirror.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        data,
        generatedAt: generatedAt ? new Date(generatedAt) : null,
        sourceEmailCount: sourceEmailCount ?? 0,
        replyMode: replyMode ?? "always",
      },
      update: {
        data,
        generatedAt: generatedAt ? new Date(generatedAt) : null,
        sourceEmailCount: sourceEmailCount ?? 0,
        replyMode: replyMode,
      },
    });
    return NextResponse.json({
      ok: true,
      updatedAt: mirror.updatedAt.toISOString(),
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/profile/store PUT]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to save profile" },
      { status: 500 }
    );
  }
}
