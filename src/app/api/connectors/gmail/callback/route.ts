import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { encryptToken } from "@/lib/crypto.server";
import { getOrCreateUserByEmail } from "@/lib/user.server";

async function exchangeGoogleCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/connectors/gmail/callback`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Google token exchange failed: ${err}`);
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
    const tokens = await exchangeGoogleCode(code);

    const accessTokenEnc = encryptToken(tokens.access_token);
    const refreshTokenEnc = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Also fetch user email from Google if not known
    let googleEmail = stateData.email;
    try {
      const profileRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.email) googleEmail = profile.email;
      }
    } catch { /* fallback to state email */ }

    await prisma.connector.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "gmail" },
      },
      create: {
        userId: user.id,
        provider: "gmail",
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        expiresAt,
        scope: "gmail.readonly gmail.send gmail.modify openid email profile",
        metadata: { email: googleEmail },
      },
      update: {
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        expiresAt,
        scope: "gmail.readonly gmail.send gmail.modify openid email profile",
        metadata: { email: googleEmail },
      },
    });

    return NextResponse.redirect(new URL("/inbox", req.url));
  } catch (e: any) {
    console.error("[/api/connectors/gmail/callback] FATAL:", e);
    return NextResponse.redirect(
      new URL("/signin?error=callback_failed", req.url)
    );
  }
}
