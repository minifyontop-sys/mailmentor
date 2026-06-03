import { getServerSession, authOptions } from "@/lib/auth";
import { getGmailClient } from "@/lib/gmail/client";
import {
  parseMessage as parseGmail,
  type ParseOptions as GmailParseOptions,
} from "@/lib/gmail/parse";
import { sendReply as sendGmailReply } from "@/lib/gmail/send";
import { fetchProfileCorpus as fetchGmailCorpus } from "@/lib/gmail/profile-source";
import { createOutlookClient } from "@/lib/outlook/client";
import {
  parseMessage as parseOutlook,
  type ParseOptions as OutlookParseOptions,
} from "@/lib/outlook/parse";
import { sendReply as sendOutlookReply } from "@/lib/outlook/send";
import { fetchProfileCorpus as fetchOutlookCorpus } from "@/lib/outlook/profile-source";
import type { LinkedAccount } from "@/types/next-auth";
import type { Email } from "@/types";
import type { CorpusEmail } from "@/lib/profile";

export interface ActiveAccountContext {
  account: LinkedAccount;
  userEmail: string;
}

export class NoActiveAccountError extends Error {
  constructor() {
    super("No active mail account is linked. Please sign in with Google or Microsoft.");
  }
}

export class UnsupportedProviderError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" is not supported yet.`);
  }
}

export async function requireActiveAccount(
  preferredProvider?: string
): Promise<ActiveAccountContext> {
  const session = await getServerSession(authOptions);
  if (!session?.accounts?.length) throw new NoActiveAccountError();

  let account: LinkedAccount | undefined;
  if (preferredProvider) {
    const providerMap: Record<string, string> = {
      gmail: "google",
      outlook: "azure-ad",
    };
    const internalProvider = providerMap[preferredProvider] || preferredProvider;
    account = session.accounts.find((a) => a.provider === internalProvider);
  }
  if (!account && session.activeAccountId) {
    account = session.accounts.find((a) => a.id === session.activeAccountId);
  }
  if (!account) {
    account = session.accounts[0];
  }
  if (!account) throw new NoActiveAccountError();
  return {
    account,
    userEmail: account.email || session.user?.email || "",
  };
}

export async function getActiveAccount(): Promise<LinkedAccount | null> {
  const session = await getServerSession(authOptions);
  if (!session?.activeAccountId) return null;
  return session.accounts.find((a) => a.id === session.activeAccountId) ?? null;
}

export interface ListMessagesOptions {
  maxResults?: number;
  pageToken?: string;
}

export interface ListMessagesResult {
  messages: Email[];
  nextPageToken: string | null;
}

export async function listMessages(
  ctx: ActiveAccountContext,
  options: ListMessagesOptions = {}
): Promise<ListMessagesResult> {
  const { account, userEmail } = ctx;
  const maxResults = Math.min(options.maxResults ?? 50, 100);
  const parseOpts: GmailParseOptions & OutlookParseOptions = { userEmail };

  if (account.provider === "google") {
    const gmail = await getGmailClient();
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      pageToken: options.pageToken,
      labelIds: ["INBOX"],
    });
    const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
    const messages = await Promise.all(
      ids.map(async (id) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date", "To", "Message-ID", "References"],
        });
        return parseGmail(msg.data, { ...parseOpts, metadataOnly: true });
      })
    );
    return { messages, nextPageToken: list.data.nextPageToken ?? null };
  }

  if (account.provider === "azure-ad") {
    const client = createOutlookClient(account.accessToken);
    const top = maxResults;
    const path = `/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,conversationId,subject,bodyPreview,receivedDateTime,from,toRecipients,isRead,flag${options.pageToken ? `&$skiptoken=${encodeURIComponent(options.pageToken)}` : ""}`;
    const res = await client.fetch<{
      value: Parameters<typeof parseOutlook>[0][];
      "@odata.nextLink"?: string;
    }>(path);
    const messages = res.value.map((m) => parseOutlook(m, { ...parseOpts, metadataOnly: true }));
    const next = res["@odata.nextLink"];
    const token = next ? new URL(next).searchParams.get("$skiptoken") : null;
    return { messages, nextPageToken: token };
  }

  throw new UnsupportedProviderError(account.provider);
}

export async function getMessage(
  ctx: ActiveAccountContext,
  id: string
): Promise<Email> {
  const { account, userEmail } = ctx;
  const parseOpts = { userEmail };

  if (account.provider === "google") {
    const gmail = await getGmailClient();
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    return parseGmail(msg.data, { ...parseOpts, metadataOnly: false });
  }

  if (account.provider === "azure-ad") {
    const client = createOutlookClient(account.accessToken);
    const select = "id,conversationId,subject,bodyPreview,receivedDateTime,sentDateTime,from,toRecipients,isRead,flag,body,internetMessageId";
    const msg = await client.fetch<Parameters<typeof parseOutlook>[0]>(
      `/me/messages/${encodeURIComponent(id)}?$select=${select}`
    );
    return parseOutlook(msg, { ...parseOpts, metadataOnly: false });
  }

  throw new UnsupportedProviderError(account.provider);
}

export async function setUnread(
  ctx: ActiveAccountContext,
  id: string,
  isUnread: boolean
): Promise<void> {
  const { account } = ctx;
  if (account.provider === "google") {
    const gmail = await getGmailClient();
    await gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: isUnread ? ["UNREAD"] : [],
        removeLabelIds: isUnread ? [] : ["UNREAD"],
      },
    });
    return;
  }
  if (account.provider === "azure-ad") {
    const client = createOutlookClient(account.accessToken);
    await client.fetch(`/me/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: !isUnread }),
    });
    return;
  }
  throw new UnsupportedProviderError(account.provider);
}

export interface SendReplyArgs {
  threadId?: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendReply(
  ctx: ActiveAccountContext,
  args: SendReplyArgs
): Promise<{ id?: string; threadId?: string }> {
  const { account } = ctx;
  if (account.provider === "google") {
    const gmail = await getGmailClient();
    const result = await sendGmailReply({
      gmail,
      threadId: args.threadId ?? "",
      to: args.to,
      from: ctx.userEmail,
      subject: args.subject,
      body: args.body,
      inReplyTo: args.inReplyTo,
      references: args.references,
    });
    return { id: result.id ?? undefined, threadId: result.threadId ?? undefined };
  }
  if (account.provider === "azure-ad") {
    const client = createOutlookClient(account.accessToken);
    await sendOutlookReply({
      client,
      conversationId: args.threadId,
      to: args.to,
      subject: args.subject,
      body: args.body,
    });
    return { id: args.threadId, threadId: args.threadId };
  }
  throw new UnsupportedProviderError(account.provider);
}

export async function fetchCorpus(
  ctx: ActiveAccountContext,
  options: { excludedDomains?: string[] } = {}
): Promise<CorpusEmail[]> {
  const { account, userEmail } = ctx;
  if (account.provider === "google") {
    const gmail = await getGmailClient();
    const result = await fetchGmailCorpus(gmail, {
      userEmail,
      perSide: 50,
      maxBodyChars: 1200,
      excludeDomains: options.excludedDomains,
    });
    return result.emails;
  }
  if (account.provider === "azure-ad") {
    const client = createOutlookClient(account.accessToken);
    return fetchOutlookCorpus(client, { excludeDomains: options.excludedDomains });
  }
  throw new UnsupportedProviderError(account.provider);
}
