import type { OutlookClient } from "./client";

export interface SendReplyInput {
  client: OutlookClient;
  conversationId?: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendReply(input: SendReplyInput) {
  const { client, conversationId, to, subject, body } = input;
  const finalSubject = subject.toLowerCase().startsWith("re:")
    ? subject
    : `Re: ${subject}`;

  const payload: Record<string, unknown> = {
    message: {
      subject: finalSubject,
      body: {
        contentType: "Text",
        content: body,
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
    },
    saveToSentItems: true,
  };

  if (conversationId) {
    payload.message = {
      ...(payload.message as Record<string, unknown>),
      conversationId,
    };
  }

  const endpoint = conversationId
    ? `/me/messages/${encodeURIComponent(conversationId)}/reply`
    : `/me/sendMail`;

  await client.fetch(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
