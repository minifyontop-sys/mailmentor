import type { gmail_v1 } from "googleapis";
import type { Email } from "@/types";

function decodeBase64Url(b: string): string {
  const normalized = b.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  const v = headers.find((h) => h.name?.toLowerCase() === target)?.value;
  return v ?? undefined;
}

function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  if (m) {
    const name = (m[1] ?? "").trim();
    return { name: name || m[2].trim(), email: m[2].trim() };
  }
  return { name: from.trim(), email: from.trim() };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") return htmlToText(decoded);
    return decoded;
  }
  if (payload.parts) {
    let plain: string | undefined;
    let html: string | undefined;
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        plain = decodeBase64Url(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      } else if (part.parts) {
        const nested = extractBody(part);
        if (nested) plain = plain ?? nested;
      }
    }
    return plain ?? (html ? htmlToText(html) : "");
  }
  return "";
}

const SYSTEM_LABELS = new Set([
  "UNREAD",
  "IMPORTANT",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "STARRED",
]);

export interface ParseOptions {
  userEmail: string;
  /** When true, skip body extraction (used for the inbox list to keep things fast). */
  metadataOnly?: boolean;
}

export function parseMessage(
  message: gmail_v1.Schema$Message,
  options: ParseOptions
): Email {
  const headers = message.payload?.headers ?? [];
  const from = getHeader(headers, "From") ?? "";
  const subject = getHeader(headers, "Subject") ?? "(no subject)";
  const date = getHeader(headers, "Date");
  const to = getHeader(headers, "To") ?? "";
  const messageId = getHeader(headers, "Message-ID") ?? undefined;
  const references = getHeader(headers, "References") ?? undefined;

  const sender = parseSender(from);
  const body = options.metadataOnly ? "" : extractBody(message.payload);
  const snippet = message.snippet ?? "";
  const isUnread = (message.labelIds ?? []).includes("UNREAD");
  const labels = (message.labelIds ?? []).filter((l) => !SYSTEM_LABELS.has(l));
  const isReplyToMine = !!to && to.toLowerCase().includes(options.userEmail.toLowerCase());

  const internalMs = message.internalDate ? parseInt(message.internalDate, 10) : Date.now();

  return {
    id: message.id ?? "",
    sender,
    subject,
    body,
    snippet,
    date: date ? new Date(date).toISOString() : new Date(internalMs).toISOString(),
    threadId: message.threadId ?? "",
    isUnread,
    labels,
    isReplyToMine,
    messageId,
    references,
  };
}
