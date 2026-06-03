import type { UserProfile } from "@/lib/profile";

/**
 * Apply the user's voice to a generated reply body. For v1 this is
 * the same sign-off chain we use elsewhere, plus a length cap so the
 * draft isn't a wall of text.
 */
export function applyUserVoice(
  body: string,
  profile: UserProfile | null,
  userName: string
): string {
  let out = body.trim();

  // Strip any trailing sign-off the LLM added (we'll re-add it).
  out = out.replace(
    /\n*(best|kind regards|regards|thanks|thank you|cheers|warmly|all the best|sincerely)[\s,]+[A-Za-z .'-]*$/i,
    ""
  ).trimEnd();

  const signOff = pickSignOff(profile, userName);
  out = `${out}\n\n${signOff}`;
  return out;
}

function pickSignOff(profile: UserProfile | null, userName: string): string {
  const choices = [
    ...((profile as any)?.signOffs ?? []),
    (profile as any)?.writingStyle?.signOffs ?? [],
    (profile as any)?.identity?.fullName,
    userName,
  ].filter(Boolean) as string[];
  return choices[0] ?? "Best,";
}
