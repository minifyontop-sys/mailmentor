import "server-only";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db.server";
import type { User } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Returns the currently signed-in user row from the DB, creating it on
 * first sign-in if it doesn't exist. Throws UnauthorizedError if not
 * signed in.
 */
export async function requireUser(): Promise<User> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new UnauthorizedError("Not signed in.");
  }
  const email = session.user.email.toLowerCase();
  return getOrCreateUserByEmail(email, session.user.name ?? null);
}

/**
 * Returns the user row, or null if not signed in. Does not throw.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
}

export async function getOrCreateUserByEmail(
  email: string,
  name: string | null
): Promise<User> {
  const normalized = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    if (name && existing.name !== name) {
      return prisma.user.update({ where: { id: existing.id }, data: { name } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { email: normalized, name },
  });
}
