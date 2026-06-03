import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import {
  fetchCorpus,
  requireActiveAccount,
  NoActiveAccountError,
  UnsupportedProviderError,
} from "@/lib/account";
import { aiModel, client } from "@/lib/ai";
import { UserProfileSchema } from "@/lib/profile";

const ProfileJsonSchema = UserProfileSchema.omit({
  generatedAt: true,
  sourceEmailCount: true,
  excludedTopics: true,
  excludedPeople: true,
  excludedProjects: true,
  excludedDomains: true,
}).deepPartial();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.activeAccountId) {
    return NextResponse.json(
      { error: "No active mail account. Sign in first.", code: "unauthorized" },
      { status: 401 }
    );
  }
  if (!client) {
    return NextResponse.json(
      {
        error:
          "AI is not configured. Add AI_API_KEY (and AI_BASE_URL, AI_MODEL) to .env.local.",
        code: "ai_disabled",
      },
      { status: 503 }
    );
  }

  let body: { excludedDomains?: string[]; accountId?: string } = {};
  try {
    if (req.headers.get("content-length") !== "0") {
      body = await req.json();
    }
  } catch {
    // empty body is fine
  }
  const excludeDomains = (body.excludedDomains ?? [])
    .map((d) => String(d).trim().toLowerCase())
    .filter(Boolean);
  const accountId = new URL(req.url).searchParams.get("accountId") ?? body.accountId ?? undefined;

  try {
    const ctx = await requireActiveAccount(accountId);
    if (!ctx.account.email) {
      return NextResponse.json(
        { error: "Active account has no email on file.", code: "no_email" },
        { status: 400 }
      );
    }

    const emails = await fetchCorpus(ctx, { excludedDomains: excludeDomains });

    if (emails.length === 0) {
      return NextResponse.json(
        {
          error:
            "No usable emails found. The profile needs at least a few messages to learn from.",
          code: "empty_corpus",
        },
        { status: 422 }
      );
    }

    const corpusBlock = emails
      .map((e, i) => {
        const date = e.date.slice(0, 10);
        return `[${i + 1}] ${date}  ${e.direction.toUpperCase()}\nFrom: ${e.from}\nTo: ${e.to}\nSubject: ${e.subject}\n${e.body}`;
      })
      .join("\n\n---\n\n");

    const excludedHint = excludeDomains.length
      ? `\nThe user has flagged these domains as out-of-scope for the profile: ${excludeDomains.join(
          ", "
        )}. Do NOT extract any topics, people, or projects whose primary association is with these domains.`
      : "";

    const providerHint = `Provider: ${ctx.account.provider}.`;

    const system = `You build a structured "user profile" from a person's recent email history. You always respond with a single valid JSON object exactly matching this shape (no extra fields, no commentary, no code fences):

{
  "identity": {
    "fullName": string,
    "role": string,
    "company": string,
    "location": string,
    "timezone": string
  },
  "writingStyle": {
    "tone": string,
    "formality": "casual" | "neutral" | "formal",
    "avgLength": "short" | "medium" | "long",
    "signOffs": string[],
    "quirks": string[]
  },
  "keyPeople": [{ "name": string, "role": string, "relationship": string, "notes": string, "emailCount": number }],
  "activeProjects": [{ "name": string, "description": string, "stakeholders": string[] }],
  "recurringTopics": string[],
  "preferences": string[],
  "bio": string
}

Strings may be empty if you cannot infer them; arrays may be empty. "writingStyle.formality" must be exactly one of "casual", "neutral", "formal". "writingStyle.avgLength" must be exactly one of "short", "medium", "long".`;

    const user = `You are building a user profile from their recent email history (${emails.length} messages: a mix of sent and received). ${providerHint}${excludedHint}

Use SENT and RECEIVED messages for STRICTLY DIFFERENT purposes:

- SENT emails (what the user wrote) → use these for writingStyle, signOffs, quirks, identity, and bio. Their voice and self-presentation is the strongest signal here. Ignore recipients, projects, and topics that appear only in sent emails as inbound context.

- RECEIVED emails (what others sent them, regardless of whether the user replied) → use these for keyPeople, activeProjects, recurringTopics, and preferences. These reflect who the user corresponds with and what areas of life they engage with. Do NOT filter received emails to "ones the user replied to" — even unreplied messages reveal the user's actual spheres of interest and ongoing threads.

Do not let one sphere of the user's life (e.g. gaming, a personal hobby, a side project) bleed into a sphere where it doesn't belong (e.g. professional emails, a message to their partner). When in doubt about whether a topic belongs in the profile, leave it out.

From these messages, extract:
- identity (name, role, company, location, timezone if discernible)
- writingStyle (tone, formality, typical length, sign-offs they use, distinctive quirks like emoji or "FYI") — derive from SENT emails
- keyPeople (people they correspond with regularly — name, role, relationship, one-sentence notes, email count) — derive from RECEIVED emails
- activeProjects (named initiatives or ongoing work, with stakeholders) — derive from RECEIVED emails
- recurringTopics (3-10 themes that come up repeatedly) — derive from RECEIVED emails
- preferences (how they like to communicate — concise? casual? emoji? sign-off convention?) — derive from SENT emails
- bio (1-2 sentence "about me" in third person, written in their voice) — derive from SENT emails

Only include info you can actually infer — leave fields empty if uncertain. Be honest about uncertainty rather than inventing details.

Here is the email corpus:

${corpusBlock}`;

    const raw = await client.chat.completions.create({
      model: aiModel,
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = raw.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("AI returned an empty profile response.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      throw new Error(
        `AI returned malformed profile JSON: ${text.slice(0, 140)}`
      );
    }

    const validation = ProfileJsonSchema.safeParse(parsed);
    if (!validation.success) {
      throw new Error(
        `AI returned unexpected profile shape: ${validation.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`
      );
    }

    return NextResponse.json({
      profile: {
        ...validation.data,
        generatedAt: new Date().toISOString(),
        sourceEmailCount: emails.length,
      },
    });
  } catch (e: any) {
    if (e instanceof NoActiveAccountError) {
      return NextResponse.json({ error: e.message, code: "unauthorized" }, { status: 401 });
    }
    if (e instanceof UnsupportedProviderError) {
      return NextResponse.json({ error: e.message, code: "unsupported_provider" }, { status: 501 });
    }
    console.error("[/api/profile/generate]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to generate profile.", code: "ai_error" },
      { status: 500 }
    );
  }
}
