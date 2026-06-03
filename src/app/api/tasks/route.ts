import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";

const TaskCreateSchema = z.object({
  description: z.string().min(1),
  deadline: z.string().nullable().optional(),
  emailId: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  subject: z.string(),
  sender: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await prisma.taskMirror.findMany({
      where: { userId: user.id },
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.task,
        deadline: undefined,
        sourceEmailId: t.emailId ?? undefined,
        sourceEmailSubject: t.subject,
        sender: t.sender ?? undefined,
        done: t.done,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/tasks GET]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = TaskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { description, emailId, threadId, subject, sender } = parsed.data;
    const task = await prisma.taskMirror.create({
      data: {
        userId: user.id,
        emailId: emailId ?? null,
        threadId: threadId ?? null,
        subject,
        task: description,
        sender: sender ?? null,
      },
    });
    return NextResponse.json({
      task: {
        id: task.id,
        description: task.task,
        sourceEmailId: task.emailId ?? undefined,
        sourceEmailSubject: task.subject,
        sender: task.sender ?? undefined,
        done: task.done,
        createdAt: task.createdAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/tasks POST]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to create task" },
      { status: 500 }
    );
  }
}
