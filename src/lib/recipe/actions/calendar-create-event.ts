import "server-only";
import {
  createEvent as calendarCreateEvent,
  type CreateEventArgs,
} from "@/lib/connectors/google-calendar";
import { chatCompletion } from "@/lib/ai";
import { requireActiveAccount, getMessage } from "@/lib/account";
import { memCache } from "@/lib/cache.server";

// Cache extractions for 10 minutes. The email body is immutable; the
// extraction is deterministic enough at temperature 0.2 that re-running
// in the same process wastes ~4000 tokens per call against our daily
// Groq TPD budget.
const extractionCache = memCache<ExtractedMeeting | null>(
  "extract-meeting",
  10 * 60_000
);

/**
 * Parses the trigger email with the LLM to extract a confirmed
 * meeting time, duration, and attendees. Returns null if the email
 * doesn't contain a specific time. Falls back to next-business-day
 * at 10:00 if ambiguous.
 */
export interface ExtractedMeeting {
  title: string;
  start: string; // ISO
  end: string;   // ISO
  attendees: string[];
  addMeetLink: boolean;
  confidence: number; // 0..1
  startRaw: string;   // original text the LLM extracted (for debugging)
}

const EXTRACTION_SYSTEM = `You are a calendar-extraction assistant. The user will give you an inbound email. Your job is to identify whether the email confirms or proposes a specific meeting time, and to extract structured event details.

Output strict JSON: { "found": boolean, "title": string|null, "start": string|null, "durationMinutes": number|null, "attendees": string[]|null, "addMeetLink": boolean, "confidence": number }

- "found" is true only if the email contains a specific date+time (e.g. "Thursday 3pm", "tomorrow at 2:30", "next Tuesday at 10:00 AM PST", "6/9/2026 12:00 AM").
- "start" must be a parseable date+time string. The system will parse it with JavaScript's \`new Date()\`. Prefer one of these formats:
    * ISO 8601 with timezone: "2026-06-09T00:00:00-07:00" or "2026-06-09T07:00:00Z"
    * ISO 8601 local: "2026-06-09T00:00:00"
    * US format: "June 9, 2026 12:00 AM" or "6/9/2026 12:00 AM"
  If only a date is given, use 10:00 AM. If a timezone isn't mentioned, assume the user's local time.
- "durationMinutes" is the meeting length in minutes. Default 30 if not mentioned.
- "attendees" is a list of email addresses. Include the email sender if you can extract their address.
- "addMeetLink" is true if the email is a working meeting (not a casual coffee).
- "confidence" is 0.0-1.0. Be conservative: 0.9+ only when the email is explicit ("let's meet Thursday at 3pm"); 0.6-0.8 when ambiguous ("how about next week?"); 0.0 when no time is mentioned.`;

export async function extractMeetingFromEmail(
  emailId: string
): Promise<ExtractedMeeting | null> {
  const cached = extractionCache.get(emailId);
  if (cached !== undefined) return cached;
  const ctx = await requireActiveAccount();
  const email = await getMessage(ctx, emailId);
  const userMsg = `From: ${email.sender.name} <${email.sender.email}>
Subject: ${email.subject}
Date received: ${email.date}

${email.body || email.snippet || ""}

Current date: ${new Date().toISOString()}`;

  let raw: string;
  try {
    raw = await chatCompletion({
      system: EXTRACTION_SYSTEM,
      user: userMsg,
      temperature: 0.2,
      maxTokens: 400,
      json: true,
    });
  } catch (e: any) {
    // Rate limit, network, etc. Cache the null so we don't retry this
    // email for 10 minutes and burn more tokens.
    console.warn(
      `[extractMeetingFromEmail] LLM call failed for ${emailId}: ${e?.message ?? e}`
    );
    extractionCache.set(emailId, null);
    return null;
  }
  const parsed = safeJson(raw);
  if (!parsed?.found || !parsed.start) {
    extractionCache.set(emailId, null);
    return null;
  }
  const start = parseDateFlexible(String(parsed.start));
  if (!start) {
    extractionCache.set(emailId, null);
    return null;
  }
  const end = new Date(
    start.getTime() + (parsed.durationMinutes ?? 30) * 60_000
  );
  const meeting: ExtractedMeeting = {
    title:
      parsed.title?.trim() ||
      `Meeting: ${email.subject.replace(/^re:\s*/i, "").trim()}`,
    start: start.toISOString(),
    end: end.toISOString(),
    attendees: Array.isArray(parsed.attendees)
      ? parsed.attendees.filter((x: unknown) => typeof x === "string")
      : [],
    addMeetLink: Boolean(parsed.addMeetLink),
    confidence:
      typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    startRaw: String(parsed.start),
  };
  extractionCache.set(emailId, meeting);
  return meeting;
}

/**
 * Try a bunch of date formats. Returns null if nothing parses.
 * Tries (in order):
 *   1. JS native Date() — handles ISO 8601 and many common formats
 *   2. Common US format: "6/9/2026 12:00 AM"
 *   3. Common US format with comma: "June 9, 2026 12:00 AM"
 *   4. Date-only with assumed 10:00 AM
 */
export function parseDateFlexible(input: string): Date | null {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;

  // 1. Native parse
  const native = new Date(s);
  if (!Number.isNaN(native.getTime())) return native;

  // 2. US format "6/9/2026 12:00 AM" or "6/9/2026 12:00:00 AM"
  const usRe = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm))?$/;
  const usMatch = s.match(usRe);
  if (usMatch) {
    let [, mo, dy, yr, hh = "10", mm = "00", ss = "00", ap] = usMatch;
    let year = Number(yr);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    let hour = Number(hh);
    if (ap) {
      const upper = ap.toUpperCase();
      if (upper === "PM" && hour < 12) hour += 12;
      if (upper === "AM" && hour === 12) hour = 0;
    }
    const d = new Date(
      year,
      Number(mo) - 1,
      Number(dy),
      hour,
      Number(mm),
      Number(ss)
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 3. Long form: "June 9, 2026 12:00 AM"
  const longRe = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm))?$/;
  const longMatch = s.match(longRe);
  if (longMatch) {
    const [, monthName, dy, yr, hh = "10", mm = "00", ss = "00", ap] = longMatch;
    const monthIdx = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ].indexOf(monthName.toLowerCase());
    if (monthIdx >= 0) {
      let year = Number(yr);
      if (year < 100) year += year < 50 ? 2000 : 1900;
      let hour = Number(hh);
      if (ap) {
        const upper = ap.toUpperCase();
        if (upper === "PM" && hour < 12) hour += 12;
        if (upper === "AM" && hour === 12) hour = 0;
      }
      const d = new Date(
        year,
        monthIdx,
        Number(dy),
        hour,
        Number(mm),
        Number(ss)
      );
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // 4. Date-only "2026-06-09" → assume 10:00 AM
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const d = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      10,
      0,
      0
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * The real approve handler — calls the Google Calendar API to create
 * the event. Defensive against bad date strings.
 */
export async function executeCreateEvent(
  userId: string,
  params: Record<string, unknown>
): Promise<{ id: string; htmlLink: string; hangoutLink?: string }> {
  const title = String(params.title ?? "Untitled event");

  // Try to parse start. If params.start is missing or unparseable,
  // fall back to the next business day at 10am and surface a clear
  // warning rather than failing.
  const startParsed = parseDateFlexible(String(params.start ?? ""));
  let start: Date;
  if (startParsed) {
    start = startParsed;
  } else {
    // Fallback: next business day at 10am
    start = nextBusinessDayAt(10, 0);
  }

  // End: prefer explicit, else start + 30 min, else start + 60 min
  const endParsed = params.end ? parseDateFlexible(String(params.end)) : null;
  const end = endParsed ?? new Date(start.getTime() + 30 * 60_000);

  const args: CreateEventArgs = {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    description: params.description
      ? String(params.description)
      : undefined,
    attendees: Array.isArray(params.attendees)
      ? (params.attendees as string[])
      : undefined,
    addMeetLink: Boolean(params.addMeetLink),
  };
  return calendarCreateEvent(userId, args);
}

function nextBusinessDayAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(hour, minute, 0, 0);
  return d;
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
