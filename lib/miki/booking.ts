import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { z } from "zod";
import { availableSlots, isFree, suggestAlternatives, withinRules, type Interval } from "./availability";
import { digest, sign, verify } from "./crypto";
import { createMeetEvent, freeBusy, gmailSend, GoogleNotConnected, isConnected } from "./google";
import { bookingsOpen, getSettings, type BookingSettings } from "./settings";
import { audit, redis, requireRedis } from "./store";
import { esc, mikiMessage, sendToOwner, untrusted } from "./telegram";

/**
 * The one booking service. The Book a call dialog and Miki's tools both call these
 * functions, so rules, verification, approval and idempotency are identical for both.
 */

export type RequestState = "pending" | "accepted" | "declined" | "reschedule_proposed" | "expired";

export type MeetingRequest = {
  id: string;
  createdAt: string;
  state: RequestState;
  source: "dialog" | "miki";
  name: string;
  email: string;
  company: string | null;
  purpose: string;
  start: string;
  durationMin: 30 | 60;
  visitorTimeZone: string;
  eventId?: string;
  meetLink?: string;
  telegramMessageId?: number | null;
  history: { at: string; state: RequestState; by: "visitor" | "owner" | "system"; note?: string }[];
};

export class BookingError extends Error {
  constructor(
    public code: "closed" | "not_connected" | "rate_limited" | "invalid" | "unverified" | "outside_rules" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

const k = {
  req: (id: string) => `miki:req:${id}`,
  pending: "miki:req:pending",
  verify: (email: string) => `miki:verify:${digest(email.toLowerCase())}`,
  idem: (key: string) => `miki:idem:${key}`,
  reqLock: (id: string) => `miki:lock:req:${id}`,
  slotLock: (start: string) => `miki:lock:slot:${start}`,
  busyCache: "miki:fb:cache",
};

const RETENTION_SECONDS = 90 * 24 * 3600;
const MIN = 60_000;

/** Base32hex (0-9, a-v): valid inside Google Calendar event ids, so the id doubles as the idempotency key. */
function newId() {
  const alphabet = "0123456789abcdefghijklmnopqrstuv";
  return Array.from(randomBytes(20), (b) => alphabet[b % 32]).join("");
}

const limiters = redis
  ? {
      codePerEmail: new Ratelimit({ redis, prefix: "miki:rl:code:email", limiter: Ratelimit.slidingWindow(3, "1 h") }),
      codePerIp: new Ratelimit({ redis, prefix: "miki:rl:code:ip", limiter: Ratelimit.slidingWindow(10, "1 h") }),
      submitPerIp: new Ratelimit({ redis, prefix: "miki:rl:submit:ip", limiter: Ratelimit.slidingWindow(5, "1 h") }),
    }
  : null;

async function limit(which: keyof NonNullable<typeof limiters>, id: string) {
  if (!limiters) return;
  const r = await limiters[which].limit(id);
  if (!r.success) throw new BookingError("rate_limited", "Too many attempts. Please wait a while and try again.");
}

function rulesOf(s: BookingSettings) {
  return {
    timeZone: s.timeZone,
    workingDays: s.workingDays,
    dayStart: s.dayStart,
    dayEnd: s.dayEnd,
    bufferMinutes: s.bufferMinutes,
    minNoticeHours: s.minNoticeHours,
    horizonDays: s.horizonDays,
    stepMinutes: s.stepMinutes,
  };
}

async function ensureOpen() {
  const s = await getSettings();
  if (!bookingsOpen(s)) throw new BookingError("closed", "Christian isn't taking new bookings right now. You can still send a message through the contact form.");
  if (!(await isConnected())) throw new BookingError("not_connected", "Booking is temporarily unavailable. Please use the contact form.");
  return s;
}

/** Busy blocks across the booking window, cached briefly so the public path can't hammer Google. */
async function busyWindow(s: BookingSettings, fresh = false): Promise<Interval[]> {
  const r = requireRedis();
  if (!fresh) {
    const cached = await r.get<{ start: string; end: string }[]>(k.busyCache);
    if (cached) return cached.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }
  const now = new Date();
  try {
    const busy = await freeBusy(now, new Date(now.getTime() + (s.horizonDays + 1) * 24 * 60 * MIN));
    await r.set(k.busyCache, busy.map((b) => ({ start: b.start.toISOString(), end: b.end.toISOString() })), { ex: 60 });
    return busy;
  } catch (err) {
    if (err instanceof GoogleNotConnected) throw new BookingError("not_connected", "Booking is temporarily unavailable. Please use the contact form.");
    throw err;
  }
}

// ---------- Public: availability ----------

export async function publicAvailability(durationMin: 30 | 60) {
  const s = await ensureOpen();
  if (!s.durations.includes(durationMin)) throw new BookingError("invalid", "That call length isn't offered.");
  const busy = await busyWindow(s);
  return { durations: s.durations, timeZone: s.timeZone, slots: availableSlots(rulesOf(s), busy, durationMin).map((d) => d.toISOString()) };
}

export async function suggestTimes(durationMin: 30 | 60, requested: Date) {
  const s = await ensureOpen();
  const busy = await busyWindow(s);
  return suggestAlternatives(rulesOf(s), busy, durationMin, requested, 3).map((d) => d.toISOString());
}

// ---------- Public: email verification ----------

const emailSchema = z.email().max(200);

export async function sendVerificationCode(rawEmail: string, ip: string) {
  const email = emailSchema.parse(rawEmail.trim().toLowerCase());
  await ensureOpen();
  await limit("codePerEmail", digest(email));
  await limit("codePerIp", ip);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await requireRedis().set(k.verify(email), { h: digest(`code:${email}:${code}`), tries: 0 }, { ex: 15 * 60 });
  await gmailSend({
    to: email,
    subject: `${code} is your code to book a call with Christian Onovo`,
    text: `Your verification code is ${code}\n\nEnter it on christianonovo.com to send your meeting request. It expires in 15 minutes.\n\nIf you didn't ask for this, you can ignore this email.\n\nMiki, Christian Onovo's AI assistant`,
  });
  await audit({ actor: "visitor", action: "booking.code_sent", result: "ok" });
}

/** Check a code. On success returns a 30-minute token proving control of the email. */
export async function checkVerificationCode(rawEmail: string, code: string) {
  const email = emailSchema.parse(rawEmail.trim().toLowerCase());
  const r = requireRedis();
  const rec = await r.get<{ h: string; tries: number }>(k.verify(email));
  if (!rec) throw new BookingError("unverified", "That code has expired. Ask for a new one.");
  if (rec.tries >= 5) {
    await r.del(k.verify(email));
    throw new BookingError("unverified", "Too many wrong codes. Ask for a new one.");
  }
  if (digest(`code:${email}:${code.trim()}`) !== rec.h) {
    await r.set(k.verify(email), { ...rec, tries: rec.tries + 1 }, { keepTtl: true });
    throw new BookingError("unverified", "That code isn't right. Check the email and try again.");
  }
  await r.del(k.verify(email));
  return sign("visitor-email", { email }, 30 * 60);
}

// ---------- Public: submit a request ----------

export const requestInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  company: z.string().trim().max(120).optional().nullable(),
  purpose: z.string().trim().min(3).max(1000),
  start: z.iso.datetime(),
  durationMin: z.union([z.literal(30), z.literal(60)]),
  visitorTimeZone: z.string().max(64).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone"),
  verifiedToken: z.string().max(2000),
  idempotencyKey: z.string().min(8).max(64),
  source: z.enum(["dialog", "miki"]),
});

export type SubmitResult = { status: "pending"; id: string } | { status: "unavailable"; alternatives: string[] };

export async function submitRequest(raw: unknown, ip: string): Promise<SubmitResult> {
  const input = requestInput.parse(raw);
  const email = input.email.toLowerCase();
  const proof = verify<{ email: string }>(input.verifiedToken, "visitor-email");
  if (!proof || proof.data.email !== email) throw new BookingError("unverified", "Please verify your email first.");

  const r = requireRedis();
  // Same submission twice (double click, retry): return the first result.
  const prior = await r.get<string>(k.idem(input.idempotencyKey));
  if (prior) return { status: "pending", id: prior };
  await limit("submitPerIp", ip);

  const s = await ensureOpen();
  const start = new Date(input.start);
  if (!s.durations.includes(input.durationMin) || !withinRules(rulesOf(s), start, input.durationMin)) {
    throw new BookingError("outside_rules", "That time isn't bookable. Please pick one of the times shown.");
  }
  const busy = await busyWindow(s, true);
  if (!isFree(start, input.durationMin, busy, s.bufferMinutes)) {
    return { status: "unavailable", alternatives: suggestAlternatives(rulesOf(s), busy, input.durationMin, start, 3).map((d) => d.toISOString()) };
  }

  const id = newId();
  if ((await r.set(k.idem(input.idempotencyKey), id, { nx: true, ex: 24 * 3600 })) !== "OK") {
    return { status: "pending", id: (await r.get<string>(k.idem(input.idempotencyKey)))! };
  }
  const now = new Date().toISOString();
  const req: MeetingRequest = {
    id,
    createdAt: now,
    state: "pending",
    source: input.source,
    name: input.name,
    email,
    company: input.company || null,
    purpose: input.purpose,
    start: start.toISOString(),
    durationMin: input.durationMin,
    visitorTimeZone: input.visitorTimeZone,
    history: [{ at: now, state: "pending", by: "visitor" }],
  };
  req.telegramMessageId = await sendToOwner(requestCard(req, "Free in your calendar"), requestButtons(req.id));
  await saveRequest(req);
  await r.zadd(k.pending, { score: Date.now(), member: id });
  await audit({ actor: "visitor", action: "meeting.request", subject: id, result: "ok", detail: input.source });
  return { status: "pending", id };
}

// ---------- Records ----------

async function saveRequest(req: MeetingRequest) {
  const until = new Date(req.start).getTime() + RETENTION_SECONDS * 1000;
  await requireRedis().set(k.req(req.id), req, { ex: Math.max(3600, Math.round((until - Date.now()) / 1000)) });
}

export async function getRequest(id: string) {
  if (!/^[0-9a-v]{20}$/.test(id)) return null;
  return requireRedis().get<MeetingRequest>(k.req(id));
}

export async function pendingRequests(limitN = 10) {
  const ids = await requireRedis().zrange<string[]>(k.pending, 0, limitN - 1);
  const rows = await Promise.all(ids.map((id) => getRequest(id)));
  return rows.filter((x): x is MeetingRequest => !!x && x.state === "pending");
}

// ---------- Owner: accept / decline (called only from the verified Telegram webhook) ----------

export type OwnerResult = { ok: true; message: string; meetLink?: string } | { ok: false; message: string; alternatives?: string[] };

export async function acceptRequest(id: string): Promise<OwnerResult> {
  const r = requireRedis();
  if ((await r.set(k.reqLock(id), 1, { nx: true, ex: 60 })) !== "OK") return { ok: false, message: "Already being processed." };
  try {
    const req = await getRequest(id);
    if (!req) return { ok: false, message: "Request not found (it may have expired)." };
    if (req.state === "accepted") return { ok: true, message: "Already accepted.", meetLink: req.meetLink };
    if (req.state !== "pending") return { ok: false, message: `This request is ${req.state.replace("_", " ")}.` };

    const s = await getSettings();
    const start = new Date(req.start);
    const end = new Date(start.getTime() + req.durationMin * MIN);
    if ((await r.set(k.slotLock(req.start), id, { nx: true, ex: 60 })) !== "OK") return { ok: false, message: "Another booking for this time is in progress." };
    const busy = await busyWindow(s, true);
    if (!isFree(start, req.durationMin, busy, s.bufferMinutes)) {
      const alternatives = suggestAlternatives(rulesOf(s), busy, req.durationMin, start, 3).map((d) => d.toISOString());
      await audit({ actor: "owner", action: "meeting.approve", subject: id, result: "skipped", detail: "slot no longer free" });
      return { ok: false, message: "That time is no longer free in your calendar.", alternatives };
    }
    const ev = await createMeetEvent({
      requestId: id,
      start,
      end,
      summary: `Call: ${req.name}${req.company ? ` (${req.company})` : ""} and Christian Onovo`,
      description: `Booked through christianonovo.com.\n\nPurpose (from ${req.name}):\n${req.purpose}`,
      attendee: { email: req.email, name: req.name },
    });
    if (!ev.meetLink) {
      await audit({ actor: "owner", action: "meeting.approve", subject: id, result: "error", detail: "event created without Meet link" });
      return { ok: false, message: "The event was created but Google didn't attach a Meet link. Check the event in your calendar." };
    }
    req.state = "accepted";
    req.eventId = ev.eventId;
    req.meetLink = ev.meetLink;
    req.history.push({ at: new Date().toISOString(), state: "accepted", by: "owner" });
    await saveRequest(req);
    await r.zrem(k.pending, id);
    await r.del(k.busyCache);
    await audit({ actor: "owner", action: "meeting.approve", subject: id, result: "ok", detail: ev.existed ? "event existed" : "event created" });
    return { ok: true, message: "Accepted. Google Calendar has sent the invitation with the Meet link.", meetLink: ev.meetLink };
  } finally {
    await r.del(k.reqLock(id));
  }
}

export async function declineRequest(id: string): Promise<OwnerResult> {
  const r = requireRedis();
  if ((await r.set(k.reqLock(id), 1, { nx: true, ex: 60 })) !== "OK") return { ok: false, message: "Already being processed." };
  try {
    const req = await getRequest(id);
    if (!req) return { ok: false, message: "Request not found (it may have expired)." };
    if (req.state === "declined") return { ok: true, message: "Already declined." };
    if (req.state !== "pending") return { ok: false, message: `This request is ${req.state.replace("_", " ")}.` };
    await gmailSend({
      to: req.email,
      toName: req.name,
      subject: "Your call request with Christian Onovo",
      text: `Hi ${req.name},\n\nThank you for your interest in a call. Unfortunately Christian can't take this one. You're welcome to get in touch through christianonovo.com/#contact.\n\nBest wishes,\nMiki, Christian Onovo's AI assistant`,
    });
    req.state = "declined";
    req.history.push({ at: new Date().toISOString(), state: "declined", by: "owner" });
    await saveRequest(req);
    await r.zrem(k.pending, id);
    await audit({ actor: "owner", action: "meeting.decline", subject: id, result: "ok" });
    return { ok: true, message: `Declined. A polite note was emailed to ${req.name}.` };
  } finally {
    await r.del(k.reqLock(id));
  }
}

// ---------- Telegram card ----------

export function formatSlot(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function requestCard(req: MeetingRequest, availability: string) {
  return mikiMessage("Meeting request", [
    `From: ${untrusted(req.name, 120)}${req.company ? ` at ${untrusted(req.company, 120)}` : ""}`,
    `Email: ${untrusted(req.email, 200)} (verified)`,
    `When: <b>${esc(formatSlot(req.start, "Europe/London"))}</b> London, ${req.durationMin} min`,
    `Their time: ${esc(formatSlot(req.start, req.visitorTimeZone))} (${esc(req.visitorTimeZone)})`,
    `Calendar: ${esc(availability)}`,
    `Purpose:`,
    untrusted(req.purpose, 800),
    "",
    `<i>Request ${esc(req.id.slice(0, 6))} · via ${req.source === "miki" ? "Miki chat" : "Book a call"}</i>`,
  ]);
}

export function requestButtons(id: string) {
  return [
    [
      { text: "✅ Accept", callback_data: `acc:${id}` },
      { text: "✖️ Decline (emails them)", callback_data: `dec:${id}` },
    ],
    [
      { text: "🕒 Reschedule", callback_data: `res:${id}` },
      { text: "✉️ Reply by email", callback_data: `rep:${id}` },
    ],
  ];
}
