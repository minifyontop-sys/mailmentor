/**
 * Seed recipes for the v1 launch. These are the "starter pack" that
 * every signed-in user gets a chance to enable. They're natural
 * language descriptions — we still let the LLM parser turn them
 * into a structured Recipe row when the user clicks "Use this".
 */
export interface SeedRecipe {
  name: string;
  description: string;
  naturalLanguage: string;
  icon: string;
}

export const SEED_RECIPES: SeedRecipe[] = [
  {
    name: "Confirmed meetings → add to Calendar",
    description:
      "When an inbound email mentions a specific date and time (a meeting, event, deadline, anniversary, etc.), add it to your Google Calendar with a Meet link.",
    naturalLanguage:
      "When any inbound email mentions a specific date and time (a meeting, event, deadline, keynote, anniversary, reservation, or any scheduled thing — words like 'meet', 'schedule', 'tomorrow', 'Friday at 3pm', '6/9 at noon' all count), create a Google Calendar event with a Meet link and invite the sender. Do NOT add any text-matching conditions — let the calendar-extraction model decide whether a specific time is present.",
    icon: "📅",
  },
  {
    name: "Meeting requests → propose slots",
    description:
      "When someone emails you asking to meet, draft a warm reply proposing three free 30-minute slots from your calendar.",
    naturalLanguage:
      "When someone emails me asking to meet, schedule a call, or find time to talk, draft a short warm reply proposing three free 30-minute slots from my calendar over the next 5 business days.",
    icon: "✨",
  },
  {
    name: "Boss emails → first-pass draft",
    description:
      "When my manager emails me, generate a draft reply I can review and send quickly.",
    naturalLanguage:
      "When my boss emails me (sender is in my profile's VIP list), generate a draft reply in my voice that addresses their ask.",
    icon: "⚡",
  },
  {
    name: "Newsletters → archive",
    description:
      "When an email looks like a newsletter or marketing email, archive it automatically (still requires your approval).",
    naturalLanguage:
      "When an inbound email contains typical newsletter markers (unsubscribe links, marketing language, or sender domain is in my exclusion list), suggest archiving it.",
    icon: "📥",
  },
  {
    name: "PR / investor outreach → flag",
    description:
      "When someone from a PR firm, VC, or accelerator emails me, draft a polite holding reply.",
    naturalLanguage:
      "When an email is from a PR agency, VC, or accelerator and it's a first-time sender, draft a polite holding reply that I'll review before sending.",
    icon: "🚩",
  },
];
