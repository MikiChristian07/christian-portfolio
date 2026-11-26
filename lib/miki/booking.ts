import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { z } from "zod";
import { availableSlots, isFree, suggestAlternatives, withinRules, zonedToUtc, type Interval } from "./availability";
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
  /** A new time Christian offered; the booking happens only when the visitor accepts it. */
  proposal?: { start: string; durationMin: 30 | 60; sentAt: string; nonce: string };
  /** Gmail thread Miki uses for every email about this request. */
  gmailThreadId?: string;
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
  recent: "miki:req:recent",
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
  await r.zadd(k.recent, { score: Date.now(), member: id });
  await r.zremrangebyrank(k.recent, 0, -201);
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

/** Requests still waiting on someone: Christian (pending) or the visitor (new time offered). */
export async function pendingRequests(limitN = 10) {
  const ids = await requireRedis().zrange<string[]>(k.pending, 0, limitN - 1);
  const rows = await Promise.all(ids.map((id) => getRequest(id)));
  return rows.filter((x): x is MeetingRequest => !!x && (x.state === "pending" || x.state === "reschedule_proposed"));
}

/** The most recent requests in any state, newest first (owner lookups like "Alex's meeting"). */
export async function recentRequests(limitN = 20) {
  const ids = await requireRedis().zrange<string[]>(k.recent, 0, limitN - 1, { rev: true });
  const rows = await Promise.all(ids.map((id) => getRequest(id)));
  return rows.filter((x): x is MeetingRequest => !!x);
}

/** Remember the Gmail thread of an email Christian sent about this request. */
export async function attachThread(id: string, threadId: string) {
  const req = await getRequest(id);
  if (!req || req.gmailThreadId === threadId) return;
  req.gmailThreadId = threadId;
  await saveRequest(req);
}

/**
 * Book `req` at `start`: lock the slot, recheck FreeBusy, create the event with a Meet link
 * (event id derives from the request id, so a retry can never create two), then mark the
 * request accepted. Callers hold the request lock.
 */
async function bookSlot(req: MeetingRequest, start: Date, durationMin: 30 | 60, by: "owner" | "visitor"): Promise<OwnerResult> {
  const r = requireRedis();
  const s = await getSettings();
  const end = new Date(start.getTime() + durationMin * MIN);
  if ((await r.set(k.slotLock(start.toISOString()), req.id, { nx: true, ex: 60 })) !== "OK") return { ok: false, message: "Another booking for this time is in progress." };
  try {
    const busy = await busyWindow(s, true);
    if (!isFree(start, durationMin, busy, s.bufferMinutes)) {
      const alternatives = suggestAlternatives(rulesOf(s), busy, durationMin, start, 3).map((d) => d.toISOString());
      await audit({ actor: by, action: "meeting.book", subject: req.id, result: "skipped", detail: "slot no longer free" });
      return { ok: false, message: "That time is no longer free in your calendar.", alternatives };
    }
    const ev = await createMeetEvent({
      requestId: req.id,
      start,
      end,
      summary: `Call: ${req.name}${req.company ? ` (${req.company})` : ""} and Christian Onovo`,
      description: `Booked through christianonovo.com.\n\nPurpose (from ${req.name}):\n${req.purpose}`,
      attendee: { email: req.email, name: req.name },
    });
    if (!ev.meetLink) {
      await audit({ actor: by, action: "meeting.book", subject: req.id, result: "error", detail: "event created without Meet link" });
      return { ok: false, message: "The event was created but Google didn't attach a Meet link. Check the event in your calendar." };
    }
    req.state = "accepted";
    req.start = start.toISOString();
    req.durationMin = durationMin;
    req.eventId = ev.eventId;
    req.meetLink = ev.meetLink;
    req.history.push({ at: new Date().toISOString(), state: "accepted", by });
    await saveRequest(req);
    await r.zrem(k.pending, req.id);
    await r.del(k.busyCache);
    return { ok: true, message: "Accepted. Google Calendar has sent the invitation with the Meet link.", meetLink: ev.meetLink };
  } finally {
    await r.del(k.slotLock(start.toISOString()));
  }
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

    const result = await bookSlot(req, new Date(req.start), req.durationMin, "owner");
    if (result.ok) await audit({ actor: "owner", action: "meeting.approve", subject: id, result: "ok" });
    return result;
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
    const sent = await gmailSend({
      to: req.email,
      toName: req.name,
      subject: REQUEST_SUBJECT,
      threadId: req.gmailThreadId,
      text: `Hi ${req.name},\n\nThank you for your interest in a call. Unfortunately Christian can't take this one. You're welcome to get in touch through christianonovo.com/#contact.\n\nBest wishes,\nMiki, Christian Onovo's AI assistant`,
    });
    req.gmailThreadId = sent.threadId;
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

// ---------- Owner: propose a new time; the visitor accepts by link ----------

export const REQUEST_SUBJECT = "Your call request with Christian Onovo";

/**
 * Offer the visitor a different time. Nothing is booked yet: the visitor gets an email with a
 * signed link, and the event is created only when they confirm (confirmReschedule).
 * A newer proposal replaces the old one, and the old link stops working.
 */
export async function proposeReschedule(id: string, start: Date, durationMin: 30 | 60, origin: string): Promise<OwnerResult> {
  const r = requireRedis();
  if ((await r.set(k.reqLock(id), 1, { nx: true, ex: 60 })) !== "OK") return { ok: false, message: "Already being processed." };
  try {
    const req = await getRequest(id);
    if (!req) return { ok: false, message: "Request not found (it may have expired)." };
    if (req.state !== "pending" && req.state !== "reschedule_proposed") return { ok: false, message: `This request is ${req.state.replace("_", " ")}.` };
    const check = await checkOwnerSlot(start, durationMin);
    if (!check.ok) return check;
    // The link lives until an hour before the new time, at most 7 days.
    const ttl = Math.max(600, Math.min(7 * 24 * 3600, Math.round((start.getTime() - Date.now()) / 1000) - 3600));
    const token = sign("reschedule", { id, start: start.toISOString(), d: durationMin }, ttl);
    const nonce = verify<Record<string, unknown>>(token, "reschedule")!.nonce;
    const link = `${origin}/api/booking/reschedule?t=${encodeURIComponent(token)}`;
    const theirs = formatSlot(start.toISOString(), req.visitorTimeZone);
    const sent = await gmailSend({
      to: req.email,
      toName: req.name,
      subject: REQUEST_SUBJECT,
      threadId: req.gmailThreadId,
      text: [
        `Hi ${req.name},`,
        "",
        `Thank you for your call request. Christian can't make the time you picked, but he can do ${theirs} (${req.visitorTimeZone}) for ${durationMin} minutes.`,
        "",
        "If that works for you, confirm it here and you'll get a calendar invitation with a Google Meet link:",
        link,
        "",
        "If it doesn't, just reply to this email.",
        "",
        "Best wishes,",
        "Miki, Christian Onovo's AI assistant",
      ].join("\n"),
    });
    req.state = "reschedule_proposed";
    req.proposal = { start: start.toISOString(), durationMin, sentAt: new Date().toISOString(), nonce };
    req.gmailThreadId = sent.threadId;
    req.history.push({ at: new Date().toISOString(), state: "reschedule_proposed", by: "owner", note: start.toISOString() });
    await saveRequest(req);
    await audit({ actor: "owner", action: "meeting.reschedule.propose", subject: id, result: "ok" });
    return { ok: true, message: `Offered ${formatSlot(start.toISOString(), "Europe/London")} London to ${req.name}. I'll tell you when they confirm.` };
  } finally {
    await r.del(k.reqLock(id));
  }
}

/**
 * Christian may offer times outside the public working hours, but never one that clashes
 * with his calendar (buffer included), is under an hour away, or is more than 90 days out.
 */
export async function checkOwnerSlot(start: Date, durationMin: 30 | 60): Promise<OwnerResult> {
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 60 * MIN) return { ok: false, message: "That time is in the past or less than an hour away." };
  if (start.getTime() > Date.now() + 90 * 24 * 60 * MIN) return { ok: false, message: "That time is more than 90 days away." };
  const s = await getSettings();
  const busy = await busyWindow(s, true);
  if (!isFree(start, durationMin, busy, s.bufferMinutes)) {
    const alternatives = suggestAlternatives(rulesOf(s), busy, durationMin, start, 3).map((d) => d.toISOString());
    return { ok: false, message: "You're busy then (counting the buffer).", alternatives };
  }
  return { ok: true, message: "Free" };
}

/** Free times near `around`, for the Reschedule button (owner view, public rules). */
export async function ownerAlternatives(durationMin: 30 | 60, around: Date) {
  const s = await getSettings();
  return suggestAlternatives(rulesOf(s), await busyWindow(s, true), durationMin, around, 3).map((d) => d.toISOString());
}

/** Free start times on one London date, for the owner ("is Monday free?"). Ignores the 24h notice. */
export async function ownerFreeSlots(date: string, durationMin: 30 | 60) {
  const s = await getSettings();
  const busy = await busyWindow(s, true);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const out: string[] = [];
  for (let t = s.dayStart; t + durationMin <= s.dayEnd; t += s.stepMinutes) {
    const start = zonedToUtc(y, m, d, t, s.timeZone);
    if (start.getTime() > Date.now() + 60 * MIN && isFree(start, durationMin, busy, s.bufferMinutes)) out.push(start.toISOString());
  }
  return out;
}

export type RescheduleView =
  | { ok: true; req: MeetingRequest; start: string; durationMin: 30 | 60; done: boolean }
  | { ok: false; message: string };

/** Check a reschedule link without acting on it (the GET page: email link scanners must not book). */
export async function viewReschedule(token: string): Promise<RescheduleView> {
  const v = verify<{ id: string; start: string; d: 30 | 60 }>(token, "reschedule");
  if (!v) return { ok: false, message: "This link has expired. Reply to the email and Christian will find another time." };
  const req = await getRequest(v.data.id);
  if (!req) return { ok: false, message: "This request no longer exists." };
  const done = req.state === "accepted" && req.start === v.data.start;
  if (!done && (req.state !== "reschedule_proposed" || req.proposal?.nonce !== v.nonce)) {
    return { ok: false, message: "This time is no longer on offer. Check your inbox for a newer email, or reply to it." };
  }
  return { ok: true, req, start: v.data.start, durationMin: v.data.d, done };
}

/** The visitor accepts the new time: book it and tell Christian. Safe to submit twice. */
export async function confirmReschedule(token: string): Promise<OwnerResult> {
  const view = await viewReschedule(token);
  if (!view.ok) return view;
  if (view.done) return { ok: true, message: "Already confirmed.", meetLink: view.req.meetLink };
  const r = requireRedis();
  const id = view.req.id;
  if ((await r.set(k.reqLock(id), 1, { nx: true, ex: 60 })) !== "OK") return { ok: false, message: "This is being confirmed already. Refresh in a moment." };
  try {
    const req = await getRequest(id);
    // Re-read under the lock: the offer may have changed since the page was opened.
    if (!req || req.state !== "reschedule_proposed" || req.proposal?.start !== view.start) return { ok: false, message: "This time is no longer on offer." };
    const result = await bookSlot(req, new Date(view.start), view.durationMin, "visitor");
    const when = `${formatSlot(view.start, "Europe/London")} London, ${view.durationMin} min`;
    await audit({ actor: "visitor", action: "meeting.reschedule.confirm", subject: id, result: result.ok ? "ok" : "skipped" });
    await sendToOwner(
      result.ok
        ? mikiMessage("New time confirmed", [
            `${untrusted(req.name, 120)} accepted <b>${esc(when)}</b>.`,
            "Google Calendar has sent them the invitation with the Meet link.",
          ])
        : mikiMessage("New time no longer free", [`${untrusted(req.name, 120)} tried to accept ${esc(when)}, but it's now busy in your calendar. Offer another time with Reschedule.`]),
      result.ok ? undefined : [[{ text: "🕒 Reschedule", callback_data: `res:${id}` }]],
    );
    return result.ok ? result : { ok: false, message: "Sorry, that time was just taken. Christian has been told and will offer another." };
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
