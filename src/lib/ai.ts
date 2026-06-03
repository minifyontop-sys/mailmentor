import OpenAI from "openai";
import { z } from "zod";
import type { AIResult } from "@/types";
import { buildProfileContext, type UserProfile } from "./profile";

export type ReplyMode = "always" | "strict";

/* ------------------------------------------------------------------ */
/* Config & client                                                     */
/* ------------------------------------------------------------------ */

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const API_KEY = process.env.AI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? "";
const MODEL = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

const hasUsableKey = API_KEY.length > 20;

export const client = hasUsableKey
  ? new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL })
  : null;
export const aiModel = MODEL;

export function getGenerativeClient() {
  return client;
}

if (!hasUsableKey) {
  console.warn(
    "[ai] AI_API_KEY missing or too short. AI features disabled."
  );
}

/* ------------------------------------------------------------------ */
/* Retry helper                                                        */
/* ------------------------------------------------------------------ */

const RETRYABLE = new Set([429, 500, 503, 504]);

function isRetryable(e: any): boolean {
  const status = e?.status ?? e?.response?.status ?? e?.error?.status;
  if (RETRYABLE.has(Number(status))) return true;
  const msg = String(e?.message ?? "");
  if (
    /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|rate limit|high demand|overloaded/i.test(
      msg
    )
  )
    return true;
  return false;
}

interface ChatOpts {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  json: boolean;
}

export async function chatCompletion(opts: ChatOpts): Promise<string> {
  if (!client) {
    throw new Error(
      "AI is not configured. Add AI_API_KEY (and AI_BASE_URL, AI_MODEL) to .env.local."
    );
  }

  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await client.chat.completions.create({
        model: MODEL,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      });
      const text = r.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("AI returned an empty response.");
      return text;
    } catch (e: any) {
      lastErr = e;
      if (!isRetryable(e) || attempt === 3) throw e;
      const backoffMs = 500 * Math.pow(2, attempt - 1);
      console.warn(
        `[ai] ${MODEL} attempt ${attempt} failed (${e?.status ?? "?"}); retrying in ${backoffMs}ms`
      );
      await new Promise((res) => setTimeout(res, backoffMs));
    }
  }
  throw lastErr;
}

/* ------------------------------------------------------------------ */
/* Post-processing: strip the junk Llama occasionally adds to replies  */
/* ------------------------------------------------------------------ */

const FENCE_RE = /^```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/;
const PREFIX_RE = /^\s*(sure[,!. ]+|sure thing[,!. ]+|here(?:'s| is) (?:a |an |the |my )?(?:reply|response|email|message|short|draft|note)|absolutely[,!. ]+|of course[,!. ]+)/i;

function cleanupReply(raw: string): string {
  let out = raw.trim();
  const fence = out.match(FENCE_RE);
  if (fence) out = fence[1];
  if (PREFIX_RE.test(out)) {
    out = out.replace(PREFIX_RE, "").trimStart();
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const AIResultSchema = z.object({
  summary: z.string().min(1),
  tasks: z
    .array(
      z.object({
        description: z.string().min(1),
        deadline: z.string().nullable().optional(),
      })
    )
    .default([]),
});

/* ------------------------------------------------------------------ */
/* summarizeAndExtract                                                 */
/* ------------------------------------------------------------------ */

interface SummarizeInput {
  emailId: string;
  body: string;
  subject: string;
  senderName: string;
  profile?: UserProfile | null;
  replyMode?: ReplyMode;
}

export async function summarizeAndExtract(
  input: SummarizeInput
): Promise<AIResult> {
  const profileCtx = buildProfileContext(input.profile);

  const modeInstruction =
    input.replyMode === "strict"
      ? `Reply mode is STRICT: if the email is clearly outside the user's usual domain (cold pitch from an unrelated vendor, newsletter from a publication they don't read, etc.) and carries no real task, you may return an empty tasks array AND prefix the summary with [unrelated] so the UI can surface it. Still produce a real 1–2 sentence summary either way.`
      : `Reply mode is ALWAYS: produce a real summary in 1–2 sentences — never add a "not related" or "outside the user's domain" disclaimer, even for newsletters, cold pitches, or unfamiliar senders. If there are no actionable tasks, return an empty tasks array.`;

  const system = `You are an email assistant. You extract a 1–2 sentence summary and any concrete action items from a single email. Always respond with a single valid JSON object matching this exact shape:
{
  "summary": string,
  "tasks": [{ "description": string, "deadline": string | null }]
}
"summary" must be 1–2 sentences. "tasks" is an array of concrete action items the recipient would need to do next; empty array if none. Be concise. Do not add commentary outside the JSON.`;

  const user = `${profileCtx}${input.profile ? "The user profile above is the user's general background. It is provided so you can recognize people, projects, and topics by name when they appear in the email. Do NOT mention projects, people, or topics from the profile in your summary unless the email is directly about them. " : ""}${modeInstruction}

From: ${input.senderName}
Subject: ${input.subject}
---
${input.body}`;

  const raw = await chatCompletion({
    system,
    user,
    temperature: 0.3,
    maxTokens: 512,
    json: true,
  });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(
      `AI returned malformed JSON: ${raw.slice(0, 140)} (${e?.message ?? "parse error"})`
    );
  }

  const parsed = AIResultSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `AI returned unexpected shape: ${raw.slice(0, 140)} (${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")})`
    );
  }

  return {
    summary: parsed.data.summary,
    tasks: parsed.data.tasks.map((t) => ({
      description: t.description,
      deadline: t.deadline ?? undefined,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* generateReply                                                       */
/* ------------------------------------------------------------------ */

interface ReplyInput {
  emailId: string;
  body: string;
  subject: string;
  senderName: string;
  style?: string;
  profile?: UserProfile | null;
  replyMode?: ReplyMode;
  /**
   * Real name of the signed-in user (from the OAuth session). Used as the
   * authoritative sign-off source when the user profile doesn't carry a
   * detected sign-off. Never invent a placeholder name like "Alex".
   */
  userName?: string | null;
}

function buildSignOffHint(
  profile: UserProfile | null | undefined,
  userName: string | null | undefined
): string {
  const profileSignOffs = profile?.writingStyle?.signOffs?.length
    ? [...new Set(profile.writingStyle.signOffs)].slice(0, 3)
    : [];

  if (profileSignOffs.length) {
    return `Sign off with one of: ${profileSignOffs.join(" / ")}.`;
  }

  const profileName = profile?.identity?.fullName?.trim();
  if (profileName) {
    return `Sign off with "Best,\n${profileName}".`;
  }

  const sessionName = userName?.trim();
  if (sessionName) {
    return `Sign off with "Best,\n${sessionName}".`;
  }

  return `Do NOT invent a name. Either end the reply with a generic sign-off like "Best," or "Thanks," with no name, or omit the sign-off entirely.`;
}

export async function generateReply(input: ReplyInput): Promise<string> {
  const profileCtx = buildProfileContext(input.profile);
  const replyMode: ReplyMode = input.replyMode ?? "always";

  const signOffHint = buildSignOffHint(input.profile, input.userName);

  const styleParts: string[] = [];
  if (input.profile) {
    const ws = input.profile.writingStyle;
    styleParts.push(
      `Match the user's writing style: ${ws.tone || "natural"}, ${ws.formality}, ${ws.avgLength}-form.`
    );
  } else {
    styleParts.push(
      "Match a friendly, professional, concise voice (under 120 words)."
    );
  }
  styleParts.push(signOffHint);
  const styleHint = styleParts.join(" ");

  const modeInstruction =
    replyMode === "strict"
      ? `Reply mode is STRICT: if the email is clearly outside the user's usual domain (cold pitch from an unrelated vendor, newsletter from a publication they don't read, mass marketing, an automated notification with no question to answer) and there is no genuine ask from a person, you may politely decline with a single short sentence like "Thanks for reaching out — not the right fit for me right now." and sign off. Otherwise, draft a real reply.`
      : `Reply mode is ALWAYS: always draft a real, useful reply — never refuse, never say the email is "unrelated" or "not in the user's domain" or "outside their usual scope", never add a disclaimer about relevance. A pitch from a vendor, a newsletter signup, a cold outreach, a question from a stranger — all deserve a real, helpful reply as if it's an ordinary day.`;

  const system = `You are an email reply assistant. You draft replies that the user will send verbatim (or with small edits). Respond with ONLY the body of the reply — no subject line, no explanations, no markdown, no leading commentary, no code fences. If your first word would be "Sure" or "Here's", rewrite to start with the actual content.`;

  const user = `${profileCtx}You are drafting an email reply for the user. The reply should be friendly, professional, concise (under 120 words), and address the sender's specific request.

${styleHint}
${input.style ? `Style note: ${input.style}\n` : ""}${
    input.profile
      ? "The user profile above is provided for writing-style grounding (tone, formality, length, sign-off, quirks). The profile may also list the user's projects, people they work with, and recurring topics from other areas of their life. CRITICAL: only mention a project, person, or topic from the profile in this reply if the current email is directly about it. Do not shoehorn unrelated profile content into the reply just because it exists in the profile. If the current email is from the user's partner about dinner, do not bring up their work projects, gaming, or anything not directly relevant. "
      : ""
  }${modeInstruction}

From: ${input.senderName}
Subject: ${input.subject}
---
${input.body}`;

  const raw = await chatCompletion({
    system,
    user,
    temperature: 0.7,
    maxTokens: 512,
    json: false,
  });

  return cleanupReply(raw);
}
