import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { accountId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }
  if (!session.accounts.some((a) => a.id === body.accountId)) {
    return NextResponse.json({ error: "Unknown account" }, { status: 404 });
  }
  if (session.accounts.length <= 1) {
    return NextResponse.json(
      { error: "Cannot unlink the only remaining account. Sign out instead." },
      { status: 400 }
    );
  }
  const remaining = session.accounts.filter((a) => a.id !== body.accountId);
  return NextResponse.json({
    ok: true,
    removed: body.accountId,
    remaining: remaining.map((a) => ({
      id: a.id,
      provider: a.provider,
      email: a.email,
    })),
    newActiveAccountId:
      session.activeAccountId === body.accountId ? remaining[0].id : session.activeAccountId,
  });
}
