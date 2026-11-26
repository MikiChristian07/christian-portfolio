import "server-only";
import { decrypt, encrypt } from "./crypto";
import { audit, redis } from "./store";
import type { Interval } from "./availability";

/**
 * Minimal Google client over REST (no SDK). One owner account, offline access.
 * The refresh token is stored encrypted in Redis; short-lived access tokens are cached
 * encrypted with a TTL just under their lifetime.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
] as const;

const TOKEN_KEY = "miki:google:token";
const ACCESS_KEY = "miki:google:access";
const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function redirectUri(origin: string) {
  return `${origin}/api/google/oauth/callback`;
}

export function authUrl(origin: string, state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    include_granted_scopes: "true",
    login_hint: "onovochristian19@gmail.com",
    state,
  }).toString();
  return u.toString();
}

export class GoogleNotConnected extends Error {
  constructor() {
    super("Google is not connected");
  }
}

export async function exchangeCode(origin: string, code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as { refresh_token?: string; access_token?: string; expires_in?: number; scope?: string; error?: string };
  if (!res.ok || !json.refresh_token) throw new Error(`Google token exchange failed: ${json.error ?? res.status}`);
  const granted = new Set((json.scope ?? "").split(" "));
  const missing = GOOGLE_SCOPES.filter((s) => !granted.has(s));
  if (!redis) throw new Error("Redis not configured");
  await redis.set(TOKEN_KEY, encrypt(json.refresh_token));
  if (json.access_token) await redis.set(ACCESS_KEY, encrypt(json.access_token), { ex: Math.max(60, (json.expires_in ?? 3600) - 120) });
  return { missing };
}

export async function isConnected() {
  return Boolean(redis && (await redis.exists(TOKEN_KEY)));
}

async function accessToken(): Promise<string> {
  if (!redis) throw new GoogleNotConnected();
  const cached = await redis.get<string>(ACCESS_KEY);
  if (cached) return decrypt(cached);
  const sealed = await redis.get<string>(TOKEN_KEY);
  if (!sealed) throw new GoogleNotConnected();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: decrypt(sealed),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) {
    await audit({ actor: "system", action: "google.refresh", result: "error", detail: json.error });
    // invalid_grant: revoked or expired consent; Christian must reconnect.
    if (json.error === "invalid_grant") throw new GoogleNotConnected();
    throw new Error(`Google token refresh failed: ${json.error ?? res.status}`);
  }
  await redis.set(ACCESS_KEY, encrypt(json.access_token), { ex: Math.max(60, (json.expires_in ?? 3600) - 120) });
  return json.access_token;
}

async function api<T>(url: string, init: RequestInit & { expectStatus?: number[] } = {}): Promise<{ status: number; body: T }> {
  const token = await accessToken();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as T;
  if (!res.ok && !(init.expectStatus ?? []).includes(res.status)) {
    const err = body as unknown as { error?: { message?: string } };
    throw new Error(`Google API ${res.status}: ${err.error?.message ?? url}`);
  }
  return { status: res.status, body };
}

/** Busy blocks only (never titles or attendees), for the public availability path. */
export async function freeBusy(timeMin: Date, timeMax: Date): Promise<Interval[]> {
  const { body } = await api<{ calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> }>(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    { method: "POST", body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: calendarId() }] }) },
  );
  const cal = Object.values(body.calendars ?? {})[0];
  if (!cal || cal.errors?.length) throw new Error("FreeBusy returned an error for the calendar");
  return (cal.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export type CreatedEvent = { eventId: string; htmlLink: string; meetLink: string | null; existed: boolean };

/**
 * Create the accepted meeting with a Google Meet link and email invitations.
 * Idempotent: the event id is derived from the request id, so a retry or double click
 * returns the existing event (HTTP 409) instead of creating a second one.
 */
export async function createMeetEvent(opts: {
  requestId: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  attendee: { email: string; name: string };
}): Promise<CreatedEvent> {
  const eventId = `miki${opts.requestId.toLowerCase().replace(/[^a-v0-9]/g, "")}`.slice(0, 64);
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events`;
  const created = await api<{ id: string; htmlLink: string; hangoutLink?: string; conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] } }>(
    `${base}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      expectStatus: [409],
      body: JSON.stringify({
        id: eventId,
        summary: opts.summary,
        description: opts.description,
        start: { dateTime: opts.start.toISOString() },
        end: { dateTime: opts.end.toISOString() },
        attendees: [{ email: opts.attendee.email, displayName: opts.attendee.name }],
        conferenceData: { createRequest: { requestId: opts.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
        reminders: { useDefault: true },
      }),
    },
  );
  const existed = created.status === 409;
  const ev = existed ? (await api<typeof created.body>(`${base}/${eventId}?conferenceDataVersion=1`)).body : created.body;
  const meet = ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
  return { eventId: ev.id, htmlLink: ev.htmlLink, meetLink: meet, existed };
}

/** Owner-only: upcoming events with titles (never exposed to the public path). */
export async function upcomingEvents(from: Date, to: Date) {
  const u = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events`);
  u.search = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "25" }).toString();
  const { body } = await api<{ items?: { summary?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; hangoutLink?: string }[] }>(u.toString());
  return (body.items ?? []).map((e) => ({ summary: e.summary ?? "(no title)", start: e.start.dateTime ?? e.start.date!, end: e.end.dateTime ?? e.end.date!, meet: e.hangoutLink ?? null }));
}

function header(value: string) {
  // RFC 2047 for non-ASCII; strip CR/LF so no header can be injected.
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

/** Send a plain-text email from Christian's Gmail, optionally continuing a thread. */
export async function gmailSend(opts: { to: string; toName?: string; subject: string; text: string; threadId?: string; inReplyTo?: string; references?: string }) {
  if (!/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(opts.to)) throw new Error("Invalid recipient");
  const lines = [
    `To: ${opts.toName ? `${header(opts.toName)} <${opts.to}>` : opts.to}`,
    `Subject: ${header(opts.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    ...(opts.inReplyTo ? [`In-Reply-To: ${header(opts.inReplyTo)}`] : []),
    ...(opts.references ? [`References: ${header(opts.references)}`] : []),
    "",
    Buffer.from(opts.text, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
  ];
  const raw = Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
  const { body } = await api<{ id: string; threadId: string }>("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw, ...(opts.threadId ? { threadId: opts.threadId } : {}) }),
  });
  return body;
}
