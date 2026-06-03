import { currentUser, auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db.server";
import { decryptToken } from "@/lib/crypto.server";
import type { LinkedAccount, AccountProvider } from "@/types/next-auth";

/**
 * Compatibility layer: provides the same `getServerSession(authOptions)`
 * shape that all existing routes expect, but powered by Clerk.
 *
 * The session object has:
 *  - user: { email, name, image }
 *  - accounts: LinkedAccount[]  (read from Connector table)
 *  - activeAccountId: string | null
 *  - accessToken: string | null (active account's token, decrypted)
 */

export const authOptions = {};

function makeAccountId(provider: string, id: string): string {
  return `${provider}:${id}`;
}

export async function getServerSession(
  _opts?: unknown
): Promise<{
  user: { email: string; name: string | null; image: string | null };
  accounts: LinkedAccount[];
  activeAccountId: string | null;
  accessToken: string | null;
  error: string | undefined;
} | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses.find(
      (ea) => ea.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? "";

  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ") || null;

  // Look up our User row by email (created by webhook or on first sign-in)
  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser) {
    return {
      user: { email, name, image: clerkUser.imageUrl },
      accounts: [],
      activeAccountId: null,
      accessToken: null,
      error: undefined,
    };
  }

  // Read connected email providers from Connector table.
  // We store "gmail" and "outlook" connectors with encrypted tokens.
  const connectors = await prisma.connector.findMany({
    where: { userId: dbUser.id, provider: { in: ["gmail", "outlook", "google_calendar"] } },
  });

  const accounts: LinkedAccount[] = [];
  for (const c of connectors) {
    const provider = c.provider === "gmail" ? "google" : c.provider === "outlook" ? "azure-ad" : "google";
    const accessToken = c.accessToken ? decryptToken(c.accessToken) : "";
    accounts.push({
      id: makeAccountId(provider, dbUser.id),
      provider: provider as AccountProvider,
      email,
      name: name ?? undefined,
      image: clerkUser.imageUrl ?? undefined,
      accessToken,
      refreshToken: c.refreshToken ? decryptToken(c.refreshToken) : undefined,
      expiresAt: c.expiresAt?.getTime() ?? 0,
    });
  }

  const activeAccountId = accounts.length > 0 ? accounts[0].id : null;
  const active = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];

  return {
    user: { email, name, image: clerkUser.imageUrl },
    accounts,
    activeAccountId,
    accessToken: active?.accessToken ?? null,
    error: undefined,
  };
}

// ---- helpers kept for compatibility with existing imports ----

export async function requireUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthenticated");
  return clerkUser;
}

export async function getCurrentUser() {
  return await currentUser();
}

export async function getOrCreateUserByEmail(
  email: string,
  name: string | null = null
) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: name ?? email.split("@")[0] ?? "MailMentor user",
      },
    });
  }
  return user;
}
