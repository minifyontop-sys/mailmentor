import "server-only";
import { registerPreviewHandler } from "../action-registry";
import { findFreeSlots, GOOGLE_CALENDAR_PROVIDER } from "@/lib/connectors/google-calendar";
import { prisma } from "@/lib/db.server";
import { generateReplyDraft } from "./ai-draft-reply";
import { extractMeetingFromEmail } from "./calendar-create-event";

/**
 * Side-effect module: registers preview handlers for the actions we
 * have implementations for. Importing this file (which is done at the
 * bottom of action-registry.ts) populates PREVIEW_HANDLERS.
 *
 * For actions that have no implementation yet, the engine falls back
 * to "Would run <type>" as the preview.
 */

registerPreviewHandler("calendar.propose_slots", async (params, ctx) => {
  const c = await prisma.connector.findUnique({
    where: { userId_provider: { userId: ctx.userId, provider: GOOGLE_CALENDAR_PROVIDER } },
  });
  if (!c) {
    return {
      preview: "Would propose 3 calendar slots (Google Calendar not connected)",
      key: "slots",
      data: { slots: [] },
    };
  }
  const slots = await findFreeSlots(ctx.userId, {
    durationMinutes: (params.durationMinutes as number) ?? 30,
    windowDays: (params.windowDays as number) ?? 5,
  });
  const formatted = slots
    .slice(0, 3)
    .map((s) => new Date(s.start).toUTCString().replace(":00 GMT", " GMT"))
    .join("; ");
  return {
    preview: `Propose 3 free 30-min slots: ${formatted || "(no free slots found)"}`,
    key: "slots",
    data: { slots },
  };
});

registerPreviewHandler("calendar.create_event", async (_params, ctx) => {
  if (!ctx.triggerEmailId) {
    return {
      preview: "Would create a calendar event (no trigger email)",
      actionable: false,
    };
  }
  const c = await prisma.connector.findUnique({
    where: { userId_provider: { userId: ctx.userId, provider: GOOGLE_CALENDAR_PROVIDER } },
  });
  if (!c) {
    return {
      preview: "Would create a calendar event (Google Calendar not connected)",
      actionable: false,
    };
  }
  const meeting = await extractMeetingFromEmail(ctx.triggerEmailId);
  if (!meeting) {
    return {
      preview:
        "Would create a calendar event (no specific time found in the email)",
      actionable: false,
    };
  }
  if (meeting.confidence < 0.7) {
    return {
      preview: `Would create "${meeting.title}" on ${new Date(
        meeting.start
      ).toLocaleString()} (low confidence — verify time)`,
      key: "meeting",
      data: { ...meeting, _skipAuto: true },
    };
  }
  return {
    preview: `Create "${meeting.title}" on ${new Date(
      meeting.start
    ).toLocaleString()}${
      meeting.attendees.length ? ` with ${meeting.attendees.join(", ")}` : ""
    }${meeting.addMeetLink ? " · Meet link" : ""}`,
    key: "meeting",
    data: meeting,
  };
});

registerPreviewHandler("ai.draft_reply", async (params, ctx) => {
  if (!ctx.triggerEmailId) {
    return {
      preview: "Would draft a reply (no trigger email)",
      actionable: false,
    };
  }
  const draft = await generateReplyDraft(ctx.userId, ctx.triggerEmailId, {
    tone: (params.tone as "default" | "direct" | "soft" | "formal") ?? "default",
    referencePriorKey: (params.referencePriorKey as string) ?? null,
    priorResults: ctx.priorResults,
  });
  return {
    preview: `Draft reply to ${draft.to}: "${draft.subject}"`,
    // The full draft is stored in priorResults so the approve endpoint
    // can re-use it without re-running the LLM. We also store it in
    // the payload via the engine wrapping.
    key: "draft",
    data: draft,
  };
});
