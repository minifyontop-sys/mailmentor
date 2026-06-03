import "server-only";
import { prisma } from "@/lib/db.server";
import type { UserProfile } from "./profile";

/**
 * Read the user's most recent server-side profile mirror. Used by
 * recipe actions (especially ai.draft_reply) to keep voice consistent
 * with the main app. Returns null if the user has never built a
 * profile.
 */
export async function readProfileFromServer(
  email: string
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const mirror = await prisma.profileMirror.findUnique({
    where: { userId: user.id },
  });
  if (!mirror) return null;
  return (mirror as any).data as UserProfile;
}
