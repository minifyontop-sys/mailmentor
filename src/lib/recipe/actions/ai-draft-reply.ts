"use server";

import "server-only";
import { prisma } from "@/lib/db.server";
import { requireActiveAccount, getMessage } from "@/lib/account";
import { readProfileFromServer } from "@/lib/profile-source";
import { applyUserVoice } from "@/lib/recipe/voice";
import {
  findFreeSlots,
  GOOGLE_CALENDAR_PROVIDER,
  type CalendarSlot,
} from "@/lib/connectors/google-calendar";
import { memCache } from "@/lib/cache.server";

// Cache reply drafts for 10 minutes. Drafts are deterministic enough
// at temperature 0.7 that re-running on the next inbox refresh would
// just burn ~600 tokens per call against the daily Groq TPD budget.
const draftCache = memCache<{ subject: string; body: string; to: string }>(
  "ai-draft-reply",
  10 * 60_000
);

export interface DraftReplyArgs {
  tone?: "default" | "direct" | "soft" | "formal";
  referencePriorKey?: string | null;
  priorResults?: Record<string, unknown>;
}

const MEETING_KEYWORDS = [
  "meet",
  "meeting",
  "schedule",
  "call",
  "chat",
  "catch up",
  "sync",
  "available",
  "free time",
  "find time",
  "set up",
  "set up a time",
  "15 min",
  "30 min",
  "60 min",
];

/**
 * Heuristic: does the inbound email ask to schedule a meeting? Looks
 * at subject + body for common meeting-request phrasings.
 */
function isMeetingRequest(subject: string, body: string): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return MEETING_KEYWORDS.some((k) => text.includes(k));
}

/**
 * Generates a draft reply that references the trigger email. If the
 * email is a meeting request AND the user has Google Calendar
 * connected, also looks up free 30-min slots over the next 5 days
 * and embeds them in the draft. Otherwise just drafts a plain reply.
 *
 * The chain design lets recipes also pass a `priorResults.slots`
 * (e.g. from a separate `calendar.propose_slots` action), in which
 * case we use those instead of looking up ourselves.
 */
export async function generateReplyDraft(
  userId: string,
  triggerEmailId: string | null,
  args: DraftReplyArgs
): Promise<{ subject: string; body: string; to: string }> {
  if (!triggerEmailId) {
    throw new Error("ai.draft_reply requires a trigger email");
  }

  // Cache key: same email + same tone + same slots-source → same draft.
  // We include userId so per-user cache namespaces stay clean.
  const tone = args.tone ?? "default";
  const priorKey = args.referencePriorKey ?? "auto";
  const cacheKey = `${userId}:${triggerEmailId}:${tone}:${priorKey}`;
  const cached = draftCache.get(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const ctx = await requireActiveAccount();
  const email = await getMessage(ctx, triggerEmailId);
  const profile = await readProfileFromServer(user.email);
  const userName =
    user.name || user.email.split("@")[0] || "MailMentor user";

  // Determine whether to embed calendar slots, and where to get them
  // from.
  let slots: CalendarSlot[] | null = null;
  if (args.referencePriorKey && args.priorResults) {
    const prior = args.priorResults[args.referencePriorKey] as
      | { slots?: CalendarSlot[] }
      | undefined;
    if (prior?.slots?.length) {
      slots = prior.slots;
    }
  }
  if (!slots && isMeetingRequest(email.subject, email.body || email.snippet)) {
    // Auto-detect: meeting request + Calendar connected → propose slots
    const c = await prisma.connector.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: GOOGLE_CALENDAR_PROVIDER,
        },
      },
    });
    if (c) {
      try {
        slots = await findFreeSlots(userId, {
          durationMinutes: 30,
          windowDays: 5,
          maxResults: 3,
        });
      } catch {
        // Fall through to a no-slots draft.
      }
    }
  }

  const slotList = slots
    ?.map(
      (s) =>
        new Date(s.start).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
    )
    .join("\n  - ");

  const system = `You are a drafting assistant. The user will give you an inbound email; your job is to write a short, warm reply that the user can review and edit.

${profile ? userProfileContext(profile) : ""}

${args.tone && args.tone !== "default" ? `Use a ${args.tone} tone.` : ""}
${slotList ? `The user wants you to propose some times. Reference these options naturally in the reply:\n  - ${slotList}` : ""}

Output strict JSON: { "subject": string, "body": string }.
- "subject" is the reply subject (re-use the inbound subject, prefixed with "Re: " if not already).
- "body" is the reply body in plain text. 2-4 short paragraphs maximum. No placeholders, no HTML. Sign off in the user's voice.`;

  const userMsg = `From: ${email.sender.name} <${email.sender.email}>
Subject: ${email.subject}

${email.body || email.snippet || ""}`;

  const { chatCompletion } = await import("@/lib/ai");
  let raw: string;
  try {
    raw = await chatCompletion({
      system,
      user: userMsg,
      temperature: 0.7,
      maxTokens: 600,
      json: true,
    });
  } catch (e: any) {
    // Rate limit, network, etc. Surface a friendly error to the caller
    // so the preview handler can show a graceful message instead of a
    // 500.
    throw new Error(
      `LLM unavailable: ${e?.message ?? "unknown error"}. Try again in a minute.`
    );
  }
  const parsed = safeJson(raw);
  if (!parsed.subject || !parsed.body) {
    throw new Error("LLM did not return a valid draft JSON");
  }
  const body = applyUserVoice(parsed.body, profile, userName);
  const draft = {
    subject: parsed.subject,
    body,
    to: email.sender.email,
  };
  draftCache.set(cacheKey, draft);
  return draft;
}

function userProfileContext(profile: any): string {
  const bits: string[] = [];
  if (profile.identity?.fullName) bits.push(`User's name: ${profile.identity.fullName}`);
  if (profile.signOffs?.length) bits.push(`Preferred sign-offs: ${profile.signOffs.join(", ")}`);
  if (profile.tone) bits.push(`General tone: ${profile.tone}`);
  if (profile.voiceNotes) bits.push(`Voice notes: ${profile.voiceNotes}`);
  if (bits.length === 0) return "";
  return `User voice guidance:\n${bits.map((b) => `  - ${b}`).join("\n")}`;
}

function safeJson(s: string): { subject?: string; body?: string } {
  try {
    return JSON.parse(s);
  } catch {
    // Some LLMs wrap JSON in code fences despite being told not to.
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return {};
    try {
      return JSON.parse(m[0]);
    } catch {
      return {};
    }
  }
}
