import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { generateReply } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Not signed in.", code: "unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    emailId?: string;
    body?: string;
    subject?: string;
    senderName?: string;
    style?: string;
    profile?: any;
    replyMode?: "always" | "strict";
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", code: "bad_request" },
      { status: 400 }
    );
  }

  if (!body.emailId || !body.body || !body.subject || !body.senderName) {
    return NextResponse.json(
      {
        error: "emailId, body, subject, and senderName are required.",
        code: "bad_request",
      },
      { status: 400 }
    );
  }

  try {
    const text = await generateReply({
      emailId: body.emailId,
      body: body.body,
      subject: body.subject,
      senderName: body.senderName,
      style: body.style,
      profile: body.profile ?? null,
      replyMode: body.replyMode ?? "always",
      userName: session.user?.name ?? session.user?.email ?? null,
    });
    return NextResponse.json({ text });
  } catch (e: any) {
    console.error("[/api/ai/reply]", e?.message ?? e);
    return NextResponse.json(
      {
        error: e?.message ?? "Failed to generate reply.",
        code: "ai_error",
      },
      { status: 500 }
    );
  }
}
