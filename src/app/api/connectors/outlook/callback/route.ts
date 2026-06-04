import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { encryptToken } from "@/lib/crypto.server";
import { getOrCreateUserByEmail } from "@/lib/user.server";

async function exchangeMicrosoftCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID || "common";
  if (!clientId || !clientSecret) throw new Error("Microsoft OAuth not configured");
  const redirectUri = `${(process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "")}/api/connectors/outlook/callback`;
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/signin?error=" + encodeURIComponent(error), req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/signin?error=missing_params", req.url)
      );
    }

    // Decode state to identify the user
    let stateData: { userId: string; email: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/signin?error=invalid_state", req.url)
      );
    }

    const user = await getOrCreateUserByEmail(stateData.email, null);

    // Exchange code for tokens
    const tokens = await exchangeMicrosoftCode(code);

    const accessTokenEnc = encryptToken(tokens.access_token);
    const refreshTokenEnc = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Fetch user info from Microsoft Graph
    let outlookEmail = stateData.email;
    let outlookName: string | null = null;
    try {
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.mail) outlookEmail = profile.mail;
        if (profile.userPrincipalName && !profile.mail) outlookEmail = profile.userPrincipalName;
        if (profile.displayName) outlookName = profile.displayName;
      }
    } catch { /* fallback to state data */ }

    await prisma.connector.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "outlook" },
      },
      create: {
        userId: user.id,
        provider: "outlook",
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        expiresAt,
        scope: "Mail.Read Mail.ReadWrite Mail.Send offline_access openid profile email User.Read",
        metadata: { email: outlookEmail, name: outlookName },
      },
      update: {
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        expiresAt,
        scope: "Mail.Read Mail.ReadWrite Mail.Send offline_access openid profile email User.Read",
        metadata: { email: outlookEmail, name: outlookName },
      },
    });

    return NextResponse.redirect(new URL("/inbox", req.url));
  } catch (e: any) {
    console.error("[/api/connectors/outlook/callback] FATAL:", e);
    return NextResponse.redirect(
      new URL("/signin?error=callback_failed", req.url)
    );
  }
}
