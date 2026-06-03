import type { CorpusEmail } from "@/lib/profile";
import type { OutlookClient } from "./client";
import { parseMessage, type GraphMessage, type GraphListResponse } from "./parse";

const SYSTEM_FOLDERS = new Set([
  "inbox",
  "junkemail",
  "deleteditems",
  "drafts",
  "sentitems",
]);

const MAX_BODY_CHARS = 1200;
const FETCH_BATCH = 20;

interface FetchOptions {
  excludeDomains?: string[];
  perFolder?: number;
}

function addressListContains(list: string, domains: string[]): boolean {
  if (!list || !domains.length) return false;
  const lower = list.toLowerCase();
  return domains.some((d) => d && lower.includes(d.toLowerCase().trim()));
}

async function listFolder(
  client: OutlookClient,
  folder: string,
  select: string,
  top: number
) {
  const path = `/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc&$select=${select}`;
  return client.fetch<GraphListResponse<GraphMessage>>(path);
}

async function listInbox(
  client: OutlookClient,
  select: string,
  top: number
) {
  const path = `/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=${select}`;
  return client.fetch<GraphListResponse<GraphMessage>>(path);
}

export async function fetchProfileCorpus(
  client: OutlookClient,
  options: FetchOptions = {}
): Promise<CorpusEmail[]> {
  const select = "id,conversationId,subject,bodyPreview,receivedDateTime,from,toRecipients,isRead,body";
  const perFolder = options.perFolder ?? 60;
  const excludeDomains = options.excludeDomains ?? [];

  const [sent, inbox] = await Promise.all([
    listFolder(client, "sentitems", select, perFolder).catch(() => ({
      value: [] as GraphMessage[],
    })),
    listInbox(client, select, perFolder).catch(() => ({
      value: [] as GraphMessage[],
    })),
  ]);

  const userEmail = "";
  const makeCorpus = (msg: GraphMessage, direction: "sent" | "received") => {
    if (
      addressListContains(msg.from?.emailAddress?.address ?? "", excludeDomains) ||
      addressListContains(
        (msg.toRecipients ?? [])
          .map((r) => r.emailAddress?.address)
          .filter(Boolean)
          .join(","),
        excludeDomains
      )
    ) {
      return null;
    }
    const parsed = parseMessage(msg, { userEmail, metadataOnly: false });
    const body = (parsed.body || parsed.snippet || "").slice(0, MAX_BODY_CHARS);
    return {
      subject: parsed.subject,
      from: parsed.sender.email,
      to: parsed.isReplyToMine ? "" : "",
      body,
      date: parsed.date,
      direction,
    } satisfies CorpusEmail;
  };

  const receivedCorpus: CorpusEmail[] = [];
  const sentCorpus: CorpusEmail[] = [];

  for (const msg of inbox.value) {
    const c = makeCorpus(msg, "received");
    if (c) receivedCorpus.push(c);
    if (receivedCorpus.length >= 50) break;
  }
  for (const msg of sent.value) {
    const c = makeCorpus(msg, "sent");
    if (c) sentCorpus.push(c);
    if (sentCorpus.length >= 50) break;
  }

  const trimmedSent = sentCorpus.slice(0, 50);
  const trimmedReceived = receivedCorpus.slice(0, 50);

  return [...trimmedSent, ...trimmedReceived].slice(0, FETCH_BATCH * 5);
}
