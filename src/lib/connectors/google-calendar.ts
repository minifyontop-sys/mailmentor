import "server-only";
import { prisma } from "@/lib/db.server";
import { decryptToken, encryptToken } from "@/lib/crypto.server";
import { getConnectorSpec } from "./registry";

/**
 * Google Calendar connector.
 *
 * Storage: an encrypted access token per user lives in the `Connector`
 * table, keyed by provider "google_calendar". The token is also tied
 * to a Google OAuth refresh token, since Calendar access tokens are
 * short-lived (1h).
 *
 * On connect, the user grants a Calendar scope in addition to Gmail
 * (we use the same Google identity, so we can store the access token
 * alongside the user's Gmail session if it's still valid). For v1 we
 * require the user to be already signed in with Google, and we copy
 * the access token from the active Google account if it's not expired.
 * If it's expired, we return a 401 so the client can prompt re-auth.
 */
export const GOOGLE_CALENDAR_PROVIDER = "google_calendar";

export interface CalendarSlot {
  start: string; // ISO timestamp
  end: string;   // ISO timestamp
}

/**
 * Returns N free slots in the user's primary calendar within the next
 * `windowDays` days, each `durationMinutes` long. Working hours are
 * 9:00-17:00 local by default.
 *
 * Implementation: pulls the next `windowDays * 16` events from
 * `freeBusy.query`, then walks 30-min slots in working hours and
 * filters out anything that overlaps a busy interval.
 */
export async function findFreeSlots(
  userId: string,
  options: {
    durationMinutes?: number;
    windowDays?: number;
    workingHours?: { start: string; end: string }; // "HH:MM"
    maxResults?: number;
  } = {}
): Promise<CalendarSlot[]> {
  const durationMinutes = options.durationMinutes ?? 30;
  const windowDays = options.windowDays ?? 5;
  const workingHours = options.workingHours ?? { start: "09:00", end: "17:00" };
  const maxResults = options.maxResults ?? 5;

  const token = await getValidAccessToken(userId);
  if (!token) {
    throw new Error(
      "Google Calendar is not connected for this account. Connect it in the Connectors panel."
    );
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMaxDate = new Date(now);
  timeMaxDate.setDate(timeMaxDate.getDate() + windowDays);
  const timeMax = timeMaxDate.toISOString();

  const fbRes = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    }
  );
  if (!fbRes.ok) {
    const errText = await fbRes.text().catch(() => "");
    throw new Error(
      `Google Calendar free/busy query failed (${fbRes.status}): ${errText || "unknown error"}`
    );
  }
  const fb = (await fbRes.json()) as {
    calendars?: { primary?: { busy?: { start: string; end: string }[] } };
  };
  const busy: Array<{ start: number; end: number }> = (
    fb.calendars?.primary?.busy ?? []
  )
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));

  const slots: CalendarSlot[] = [];
  const dayCursor = new Date(now);
  dayCursor.setSeconds(0, 0);

  while (slots.length < maxResults && dayCursor < timeMaxDate) {
    const day = dayCursor.getDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) {
      // Skip weekends
      dayCursor.setDate(dayCursor.getDate() + 1);
      continue;
    }
    const [sh, sm] = workingHours.start.split(":").map(Number);
    const [eh, em] = workingHours.end.split(":").map(Number);
    const dayStart = new Date(dayCursor);
    dayStart.setHours(sh, sm, 0, 0);
    const dayEnd = new Date(dayCursor);
    dayEnd.setHours(eh, em, 0, 0);

    // Start the candidate loop at the next half-hour after `now`
    let candidate = new Date(dayStart);
    if (candidate < now) {
      const minute = now.getMinutes();
      const nextHalf = minute < 30 ? 30 : 60;
      candidate = new Date(now);
      candidate.setMinutes(nextHalf, 0, 0);
      if (candidate < dayStart) candidate = new Date(dayStart);
    }

    while (slots.length < maxResults) {
      const candidateEnd = new Date(candidate.getTime() + durationMinutes * 60_000);
      if (candidateEnd > dayEnd) break;
      const overlaps = busy.some(
        (b) => candidate.getTime() < b.end && candidateEnd.getTime() > b.start
      );
      if (!overlaps) {
        slots.push({
          start: candidate.toISOString(),
          end: candidateEnd.toISOString(),
        });
      }
      candidate = new Date(candidate.getTime() + 30 * 60_000);
    }

    dayCursor.setDate(dayCursor.getDate() + 1);
    dayCursor.setHours(0, 0, 0, 0);
  }

  return slots;
}

export interface CreateEventArgs {
  title: string;
  start: string; // ISO
  end: string;   // ISO
  description?: string;
  attendees?: string[]; // emails
  addMeetLink?: boolean;
}

export async function createEvent(
  userId: string,
  args: CreateEventArgs
): Promise<{ id: string; htmlLink: string; hangoutLink?: string }> {
  const token = await getValidAccessToken(userId);
  if (!token) {
    throw new Error(
      "Google Calendar is not connected for this account. Connect it in the Connectors panel."
    );
  }
  const event: Record<string, unknown> = {
    summary: args.title,
    start: { dateTime: args.start },
    end: { dateTime: args.end },
  };
  if (args.description) event.description = args.description;
  if (args.attendees?.length) {
    event.attendees = args.attendees.map((email) => ({ email }));
  }
  if (args.addMeetLink) {
    event.conferenceData = {
      createRequest: {
        requestId: `mailmentor-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Google Calendar create event failed (${res.status}): ${errText || "unknown error"}`
    );
  }
  const created = (await res.json()) as {
    id: string;
    htmlLink: string;
    hangoutLink?: string;
  };
  return {
    id: created.id,
    htmlLink: created.htmlLink,
    hangoutLink: created.hangoutLink,
  };
}

/**
 * Returns the active access token for the user, refreshing from the
 * stored refresh token if it's about to expire. Returns null if the
 * user hasn't connected Google Calendar yet.
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const conn = await prisma.connector.findUnique({
    where: {
      userId_provider: { userId, provider: GOOGLE_CALENDAR_PROVIDER },
    },
  });
  if (!conn) return null;

  const now = Date.now();
  const expiresAt = conn.expiresAt?.getTime() ?? 0;
  if (conn.accessToken && expiresAt - now > 60_000) {
    return decryptToken(conn.accessToken);
  }
  if (!conn.refreshToken) {
    return null;
  }
  const refreshToken = decryptToken(conn.refreshToken);

  // Refresh against Google's token endpoint
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!refreshRes.ok) {
    const errText = await refreshRes.text().catch(() => "");
    throw new Error(
      `Google token refresh failed (${refreshRes.status}): ${errText || "unknown error"}`
    );
  }
  const refreshed = (await refreshRes.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };

  await prisma.connector.update({
    where: { id: conn.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scope: refreshed.scope ?? conn.scope,
    },
  });
  return refreshed.access_token;
}

/**
 * Check that the provider is supported by this module.
 */
export function isGoogleCalendarProvider(provider: string): boolean {
  return provider === GOOGLE_CALENDAR_PROVIDER;
}

void getConnectorSpec;
