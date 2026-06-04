import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db.server";
import { getConnectorSpec } from "@/lib/connectors/registry";
import { encryptToken } from "@/lib/crypto.server";
import { getOrCreateUserByEmail } from "@/lib/user.server";
import type { LinkedAccount } from "@/types/next-auth";

function getGoogleOAuthUrl(userId: string, userEmail: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");
  const state = Buffer.from(JSON.stringify({ userId, email: userEmail, ts: Date.now() })).toString("base64");
  const redirectUri = `${(process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "")}/api/connectors/gmail/callback`;
  const scope = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "openid",
    "email",
    "profile",
  ].join(" ");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

function getMicrosoftOAuthUrl(userId: string, userEmail: string) {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  if (!clientId) throw new Error("AZURE_AD_CLIENT_ID not configured");
  const state = Buffer.from(JSON.stringify({ userId, email: userEmail, ts: Date.now() })).toString("base64");
  const redirectUri = `${(process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "")}/api/connectors/outlook/callback`;
  const scope = [
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "offline_access",
    "openid",
    "profile",
    "email",
    "User.Read",
  ].join(" ");
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const spec = getConnectorSpec(params.provider);
    if (!spec) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const user = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? null
    );

    // Email providers: initiate OAuth flow
    if (params.provider === "gmail") {
      const redirectUrl = getGoogleOAuthUrl(user.id, user.email);
      return NextResponse.json({ redirectUrl });
    }

    if (params.provider === "outlook") {
      const redirectUrl = getMicrosoftOAuthUrl(user.id, user.email);
      return NextResponse.json({ redirectUrl });
    }

    // Calendar connector: re-use existing Google tokens
    if (params.provider === "google_calendar") {
      const googleAccount = session.accounts.find(
        (a: LinkedAccount) => a.provider === "google"
      );
      if (!googleAccount) {
        return NextResponse.json(
          { error: "Connect a Google account first in the sidebar, then connect Calendar." },
          { status: 400 }
        );
      }
      const safeExpiresAt = (() => {
        const v = googleAccount.expiresAt;
        if (typeof v !== "number" || !Number.isFinite(v)) return null;
        if (v <= 0 || v >= Number.MAX_SAFE_INTEGER / 2) return null;
        return v;
      })();
      const fresh = safeExpiresAt ? safeExpiresAt - Date.now() > 60_000 : false;
      if (!fresh) {
        return NextResponse.json(
          { error: "Your Google access token has expired. Re-connect your Gmail account to add Calendar access." },
          { status: 401 }
        );
      }

      const accessTokenEnc = googleAccount.accessToken
        ? encryptToken(googleAccount.accessToken)
        : null;
      const refreshTokenEnc = googleAccount.refreshToken
        ? encryptToken(googleAccount.refreshToken)
        : null;

      await prisma.connector.upsert({
        where: {
          userId_provider: { userId: user.id, provider: spec.provider },
        },
        create: {
          userId: user.id,
          provider: spec.provider,
          accessToken: accessTokenEnc,
          refreshToken: refreshTokenEnc,
          expiresAt: safeExpiresAt ? new Date(safeExpiresAt) : null,
          scope: spec.scopes.join(" "),
        },
        update: {
          accessToken: accessTokenEnc,
          refreshToken: refreshTokenEnc,
          expiresAt: safeExpiresAt ? new Date(safeExpiresAt) : null,
          scope: spec.scopes.join(" "),
        },
      });

      return NextResponse.json({ ok: true, connected: true });
    }

    return NextResponse.json(
      { error: `Provider "${params.provider}" is not yet supported for connect.` },
      { status: 501 }
    );
  } catch (e: any) {
    console.error("[/api/connectors/[provider]/connect POST] FATAL:", e);
    return NextResponse.json(
      { error: e?.message ?? "Connector connect failed" },
      { status: 500 }
    );
  }
}
