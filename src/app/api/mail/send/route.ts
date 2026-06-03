import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import {
  requireActiveAccount,
  sendReply,
  NoActiveAccountError,
  UnsupportedProviderError,
} from "@/lib/account";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.activeAccountId) {
    return NextResponse.json({ error: "No active mail account" }, { status: 401 });
  }

  let body: {
    threadId?: string;
    to?: string;
    subject?: string;
    body?: string;
    inReplyTo?: string;
    references?: string;
    accountId?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { threadId, to, subject, body: text, inReplyTo, references, accountId } = body;
  if (!to || !subject || !text) {
    return NextResponse.json(
      { error: "to, subject, and body are required" },
      { status: 400 }
    );
  }

  try {
    const ctx = await requireActiveAccount(accountId);
    const result = await sendReply(ctx, {
      threadId,
      to,
      subject,
      body: text,
      inReplyTo,
      references,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    if (e instanceof NoActiveAccountError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof UnsupportedProviderError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    console.error("[/api/mail/send]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to send reply" },
      { status: 500 }
    );
  }
}
