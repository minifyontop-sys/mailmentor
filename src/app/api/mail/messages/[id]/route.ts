import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import {
  getMessage,
  requireActiveAccount,
  setUnread,
  NoActiveAccountError,
  UnsupportedProviderError,
} from "@/lib/account";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.activeAccountId) {
    return NextResponse.json({ error: "No active mail account" }, { status: 401 });
  }
  const accountId = new URL(_req.url).searchParams.get("accountId") ?? undefined;
  try {
    const ctx = await requireActiveAccount(accountId);
    const message = await getMessage(ctx, params.id);
    return NextResponse.json({ message });
  } catch (e: any) {
    if (e instanceof NoActiveAccountError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof UnsupportedProviderError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    console.error("[/api/mail/messages/:id GET]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load message" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.activeAccountId) {
    return NextResponse.json({ error: "No active mail account" }, { status: 401 });
  }

  let body: { isUnread?: boolean; accountId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.isUnread !== "boolean") {
    return NextResponse.json({ error: "isUnread (boolean) is required" }, { status: 400 });
  }

  const accountId = new URL(req.url).searchParams.get("accountId") ?? body.accountId ?? undefined;
  try {
    const ctx = await requireActiveAccount(accountId);
    await setUnread(ctx, params.id, body.isUnread);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof NoActiveAccountError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof UnsupportedProviderError) {
      return NextResponse.json({ error: e.message }, { status: 501 });
    }
    console.error("[/api/mail/messages/:id PATCH]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to modify message" },
      { status: 500 }
    );
  }
}
