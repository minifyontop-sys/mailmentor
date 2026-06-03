import type { gmail_v1 } from "googleapis";
import { parseMessage, type ParseOptions } from "./parse";
import type { Email } from "@/types";
import type { CorpusEmail } from "@/lib/profile";

const SYSTEM_LABELS = new Set([
  "UNREAD",
  "IMPORTANT",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "STARRED",
  "TRASH",
  "SPAM",
]);

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  return headers.find((h) => h.name?.toLowerCase() === target)?.value ?? undefined;
}

function decodeBase64Url(b: string): string {
  const normalized = b.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function extractPlainText(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  if (payload.body?.data && payload.mimeType === "text/plain") {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const nested = extractPlainText(part);
        if (nested) return nested;
      }
    }
  }
  return "";
}

export interface CorpusFetchOptions {
  /** How many of each (sent + received) to pull. Total = 2 * perSide. */
  perSide?: number;
  /** Hard cap on per-email body length (chars). Keeps total corpus bounded. */
  maxBodyChars?: number;
  userEmail: string;
  /**
   * Email domains to skip when assembling the corpus. Compared as
   * substrings (case-insensitive) against the From and To addresses of
   * each candidate email. Use this to keep topics from unrelated areas
   * of the user's life (gaming platforms, retailers, social) out of the
   * profile build.
   * e.g. ["steam.com", "twitch.tv", "roblox.com"]
   */
  excludeDomains?: string[];
}

export interface CorpusResult {
  emails: CorpusEmail[];
  totalCandidates: number;
  truncatedAt?: string;
}

/**
 * Fetches up to 2 * perSide recent emails (50/50 by default) from the user's
 * Gmail and returns a compact corpus suitable for sending to Gemini.
 *
 * Excludes system / category labels so newsletters and spam don't pollute
 * the profile. Bodies are truncated to keep total input under ~80KB.
 */
export async function fetchProfileCorpus(
  gmail: gmail_v1.Gmail,
  options: CorpusFetchOptions
): Promise<CorpusResult> {
  const perSide = options.perSide ?? 50;
  const maxBody = options.maxBodyChars ?? 1500;
  const parseOpts: ParseOptions = { userEmail: options.userEmail };

  const excludeDomains = (options.excludeDomains ?? [])
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const matchesExcludedDomain = (address: string): boolean => {
    if (!excludeDomains.length) return false;
    const lower = address.toLowerCase();
    return excludeDomains.some((d) => lower.includes(d));
  };

  // Run both list calls in parallel for speed.
  const [sent, received] = await Promise.all([
    gmail.users.messages.list({
      userId: "me",
      maxResults: perSide,
      labelIds: ["SENT"],
    }),
    gmail.users.messages.list({
      userId: "me",
      maxResults: perSide,
      labelIds: ["INBOX"],
    }),
  ]);

  const sentIds = (sent.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => !!id);
  const receivedIds = (received.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => !!id);

  const allIds = [...sentIds, ...receivedIds];
  const totalCandidates = allIds.length;

  // Batch-fetch metadata+body for all ids in chunks of 20.
  const corpus: CorpusEmail[] = [];
  for (let i = 0; i < allIds.length; i += 20) {
    const batch = allIds.slice(i, i + 20);
    const fetched = await Promise.all(
      batch.map((id) =>
        gmail.users.messages.get({
          userId: "me",
          id,
          format: "full",
        })
      )
    );
    for (const msg of fetched) {
      const labels = msg.data.labelIds ?? [];
      if (labels.some((l) => SYSTEM_LABELS.has(l))) continue;

      const parsed: Email = parseMessage(msg.data, parseOpts);
      const body = parsed.body || extractPlainText(msg.data.payload);
      if (!parsed.subject && !body) continue;

      const fromAddr = parsed.sender.email ?? "";
      const toAddr = getHeader(msg.data.payload?.headers, "To") ?? "";
      if (matchesExcludedDomain(fromAddr) || matchesExcludedDomain(toAddr)) {
        continue;
      }

      corpus.push({
        from: `${parsed.sender.name} <${parsed.sender.email}>`,
        to: toAddr,
        subject: parsed.subject,
        body: body.length > maxBody ? body.slice(0, maxBody) + "\n[…truncated]" : body,
        date: parsed.date,
        direction: sentIds.includes(parsed.id) ? "sent" : "received",
      });
    }
  }

  return { emails: corpus, totalCandidates };
}
