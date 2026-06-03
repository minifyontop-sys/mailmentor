import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Zod schema (single source of truth for shape + runtime validation)  */
/* ------------------------------------------------------------------ */

export const UserProfileSchema = z.object({
  generatedAt: z.string().optional(),
  sourceEmailCount: z.number().int().nonnegative().optional(),

  identity: z
    .object({
      fullName: z.string().optional(),
      role: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      timezone: z.string().optional(),
    })
    .default({}),

  writingStyle: z
    .object({
      tone: z.string().default(""),
      formality: z.enum(["casual", "neutral", "formal"]).default("neutral"),
      avgLength: z.enum(["short", "medium", "long"]).default("medium"),
      signOffs: z.array(z.string()).default([]),
      quirks: z.array(z.string()).default([]),
    })
    .default({
      tone: "",
      formality: "neutral",
      avgLength: "medium",
      signOffs: [],
      quirks: [],
    }),

  keyPeople: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        relationship: z.string().default(""),
        notes: z.string().default(""),
        emailCount: z.number().int().nonnegative().default(0),
      })
    )
    .default([]),

  activeProjects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().default(""),
        stakeholders: z.array(z.string()).default([]),
      })
    )
    .default([]),

  recurringTopics: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),

  /**
   * Names of topics the user has explicitly excluded from AI context
   * (matched case-insensitively as substrings of topic strings). Prevents
   * the profile from injecting unrelated areas of their life into replies
   * (e.g. gaming topics bleeding into a personal email to a partner).
   */
  excludedTopics: z.array(z.string()).default([]),
  /** Same idea, but for entries in the `keyPeople` list. */
  excludedPeople: z.array(z.string()).default([]),
  /** Same idea, but for entries in the `activeProjects` list. */
  excludedProjects: z.array(z.string()).default([]),
  /**
   * Email domains to skip when building the profile corpus
   * (e.g. "steam.com", "twitch.tv"). Compared as substrings against
   * the From/To addresses of each candidate email. Persisted so that
   * the next "Refresh profile" run respects the same exclusion set.
   */
  excludedDomains: z.array(z.string()).default([]),

  bio: z.string().default(""),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/* ------------------------------------------------------------------ */
/* Profile → prompt fragment                                           */
/* ------------------------------------------------------------------ */

function isExcluded(
  name: string,
  excluded: string[] | undefined
): boolean {
  if (!excluded?.length) return false;
  const lower = name.toLowerCase();
  return excluded.some((e) => e && lower.includes(e.toLowerCase()));
}

/**
 * Build a compact "about you" prompt fragment from a UserProfile.
 * Used as a prefix on every AI call so responses match who the user is
 * and how they write. We trim aggressively — only the slices relevant
 * to the task.
 *
 * Excludes topics / people / projects that the user has explicitly marked
 * as off-limits via `excludedTopics` / `excludedPeople` / `excludedProjects`.
 * Matching is case-insensitive substring on the item's display name.
 */
export function buildProfileContext(profile: UserProfile | null | undefined): string {
  if (!profile) return "";
  const lines: string[] = [];

  const id = profile.identity;
  const idParts = [
    id.fullName,
    id.role,
    id.company && `at ${id.company}`,
    id.location,
  ].filter(Boolean);
  if (idParts.length) {
    lines.push(`About the user: ${idParts.join(", ")}.`);
  }

  if (profile.bio?.trim()) {
    lines.push(`Bio: ${profile.bio.trim()}`);
  }

  const ws = profile.writingStyle;
  const wsParts: string[] = [];
  if (ws.tone) wsParts.push(`tone: ${ws.tone}`);
  if (ws.formality) wsParts.push(`formality: ${ws.formality}`);
  if (ws.avgLength) wsParts.push(`typical length: ${ws.avgLength}`);
  if (ws.signOffs?.length) {
    wsParts.push(`signs off with: ${[...new Set(ws.signOffs)].slice(0, 4).join(" / ")}`);
  }
  if (ws.quirks?.length) {
    wsParts.push(`quirks: ${ws.quirks.slice(0, 5).join("; ")}`);
  }
  if (wsParts.length) {
    lines.push(`Their writing style — ${wsParts.join("; ")}.`);
  }

  const activeProjects = (profile.activeProjects ?? []).filter(
    (p) => !isExcluded(p.name, profile.excludedProjects)
  );
  if (activeProjects.length) {
    const ps = activeProjects
      .slice(0, 6)
      .map((p) => `· ${p.name} — ${p.description}${p.stakeholders?.length ? ` (stakeholders: ${p.stakeholders.join(", ")})` : ""}`)
      .join("\n");
    lines.push(`Active projects:\n${ps}`);
  }

  const keyPeople = (profile.keyPeople ?? []).filter(
    (p) => !isExcluded(p.name, profile.excludedPeople)
  );
  if (keyPeople.length) {
    const kp = keyPeople
      .slice(0, 8)
      .map((p) => `· ${p.name}${p.role ? ` (${p.role})` : ""} — ${p.relationship}: ${p.notes}`)
      .join("\n");
    lines.push(`Key people they work with:\n${kp}`);
  }

  const topics = (profile.recurringTopics ?? []).filter(
    (t) => !isExcluded(t, profile.excludedTopics)
  );
  if (topics.length) {
    lines.push(`Recurring topics: ${topics.slice(0, 10).join(", ")}.`);
  }

  if (profile.preferences?.length) {
    lines.push(`Preferences: ${profile.preferences.slice(0, 6).join("; ")}.`);
  }

  return lines.length ? "--- USER PROFILE ---\n" + lines.join("\n") + "\n--- END PROFILE ---\n" : "";
}

/* ------------------------------------------------------------------ */
/* Corpus types                                                        */
/* ------------------------------------------------------------------ */

/**
 * Email corpus the profile was built from. Used as the *user message*
 * when asking the LLM to extract the profile. Caller is responsible for
 * truncating per-email bodies so the total stays under model limits.
 */
export interface CorpusEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  direction: "sent" | "received";
}
