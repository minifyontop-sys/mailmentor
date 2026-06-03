import type { Email } from "@/types";
import type { OutlookClient } from "./client";

interface GraphRecipient {
  emailAddress: { name?: string; address: string };
}

interface GraphBody {
  contentType: "Text" | "HTML";
  content: string;
}

export interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  sentDateTime?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  isRead?: boolean;
  flag?: { flagStatus?: string };
  body?: GraphBody;
  internetMessageId?: string;
  parentFolderId?: string;
}

export interface GraphListResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
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

function pickSender(
  from: GraphRecipient | undefined
): { name: string; email: string } {
  const addr = from?.emailAddress?.address ?? "";
  const name = from?.emailAddress?.name?.trim();
  return { name: name || addr, email: addr };
}

export interface ParseOptions {
  userEmail: string;
  metadataOnly?: boolean;
}

export function parseMessage(
  message: GraphMessage,
  options: ParseOptions
): Email {
  const sender = pickSender(message.from);
  const toRecipients = message.toRecipients ?? [];
  const toAddresses = toRecipients
    .map((r) => r.emailAddress?.address)
    .filter((a): a is string => !!a)
    .join(", ");
  const subject = message.subject || "(no subject)";
  const date = message.receivedDateTime || message.sentDateTime || new Date().toISOString();
  const isUnread = message.isRead === false;
  const isReplyToMine = !!toAddresses &&
    toAddresses.toLowerCase().includes(options.userEmail.toLowerCase());
  const rawBody = message.body?.content ?? "";
  const body =
    options.metadataOnly || !rawBody
      ? ""
      : message.body?.contentType === "HTML"
        ? htmlToText(rawBody)
        : rawBody;

  return {
    id: message.id,
    sender,
    subject,
    body,
    snippet: message.bodyPreview ?? "",
    date: new Date(date).toISOString(),
    threadId: message.conversationId ?? message.id,
    isUnread,
    labels: message.flag?.flagStatus ? [message.flag.flagStatus] : [],
    isReplyToMine,
    messageId: message.internetMessageId,
    references: undefined,
  };
}
