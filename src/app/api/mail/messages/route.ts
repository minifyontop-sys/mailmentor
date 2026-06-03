import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import {
  listMessages,
  requireActiveAccount,
  NoActiveAccountError,
  UnsupportedProviderError,
} from "@/lib/account";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.activeAccountId) {
    return NextResponse.json({ error: "No active mail account" }, { status: 401 });
  }
  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") ?? "50", 10), 100);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const accountId = searchParams.get("accountId") ?? undefined;

  try {
    const ctx = await requireActiveAccount(accountId);
    const result = await listMessages(ctx, { maxResults, pageToken });
    return NextResponse.json({
      messages: result.messages,
      nextPageToken: result.nextPageToken,
      account: {
        id: ctx.account.id,
        provider: ctx.account.provider,
        email: ctx.account.email,
        name: ctx.account.name,
      },
    });
  } catch (e: any) {
    if (e instanceof NoActiveAccountError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof UnsupportedProviderError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    console.error("[/api/mail/messages]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load messages" },
      { status: 500 }
    );
  }
}
