import type { gmail_v1 } from "googleapis";

export interface SendReplyInput {
  gmail: gmail_v1.Gmail;
  threadId: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}

function toBase64Url(s: string): string {
  return Buffer.from(s, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendReply(input: SendReplyInput) {
  const { gmail, threadId, to, from, subject, body, inReplyTo, references } = input;

  const finalSubject = subject.toLowerCase().startsWith("re:")
    ? subject
    : `Re: ${subject}`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${finalSubject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) {
    headers.push(`References: ${references}`);
  } else if (inReplyTo) {
    headers.push(`References: ${inReplyTo}`);
  }

  const raw = toBase64Url(headers.join("\r\n") + "\r\n\r\n" + body);

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId },
  });

  return res.data;
}
