import type { Email } from "@/types";
import { isVip } from "./vipSenders";

const KEYWORDS = ["urgent", "deadline", "asap"];

export function scoreEmail(email: Email): number {
  let score = 0;
  if (isVip(email.sender.email)) score += 10;

  const text = `${email.subject} ${email.body}`.toLowerCase();
  for (const kw of KEYWORDS) {
    if (text.includes(kw)) {
      score += 5;
      break;
    }
  }

  if (email.isReplyToMine) score += 3;

  return score;
}

export function scoreBreakdown(email: Email): {
  vip: boolean;
  keyword: boolean;
  reply: boolean;
  total: number;
} {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const keyword = KEYWORDS.some((kw) => text.includes(kw));
  return {
    vip: isVip(email.sender.email),
    keyword,
    reply: !!email.isReplyToMine,
    total: scoreEmail(email),
  };
}
