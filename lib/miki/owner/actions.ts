import "server-only";
import { randomBytes } from "node:crypto";
import { acceptRequest, attachThread, declineRequest, formatSlot, getRequest, proposeReschedule, REQUEST_SUBJECT, type OwnerResult } from "../booking";
import { attachEnquiryThread, enquiryLabel, getEnquiry } from "../enquiry";
import { gmailSend } from "../google";
import { getSettings, updateSettings, type BookingSettings } from "../settings";
import { audit, requireRedis } from "../store";
import { esc, mikiMessage, sendToOwner, untrusted, type InlineButton } from "../telegram";

/**
 * Confirm-before-execute. The owner agent (a language model) can never act directly: it can
 * only create a pending action. Code renders the card from the action itself (never from
 * model prose), and the action runs only when Christian taps its button, exactly once
 * (GETDEL is atomic, so a double tap or a Telegram retry finds nothing the second time).
 */
export type OwnerAction =
  | { kind: "accept"; requestId: string }
  | { kind: "decline"; requestId: string }
  | { kind: "reschedule"; requestId: string; start: string; durationMin: 30 | 60 }
  | { kind: "email"; target: EmailTarget; body: string }
  | { kind: "settings"; patch: Partial<BookingSettings> };

export type EmailTarget = { type: "request" | "enquiry"; id: string };

const TTL = 24 * 3600;
const key = (nonce: string) => `miki:action:${nonce}`;
export const isNonce = (s: string) => /^[A-Za-z0-9_-]{16}$/.test(s);

/** Store an action and return the nonce its button carries. */
export async function storeAction(action: OwnerAction) {
  const nonce = randomBytes(12).toString("base64url");
  await requireRedis().set(key(nonce), { action, createdAt: new Date().toISOString() }, { ex: TTL });
  return nonce;
}

/** Store an action and send its confirmation card. */
export async function proposeAction(action: OwnerAction, confirmLabel: string) {
  const nonce = await storeAction(action);
  const card = await describe(action);
  const buttons: InlineButton[][] = [[{ text: confirmLabel, callback_data: `ok:${nonce}` }, { text: "Cancel", callback_data: `no:${nonce}` }]];
  const sent = await sendToOwner(mikiMessage(card.title, [...card.lines, "", "<i>Nothing happens until you tap the button. Expires in 24 hours.</i>"]), buttons);
  await audit({ actor: "owner", action: `action.propose.${action.kind}`, result: sent ? "ok" : "error" });
  return sent !== null;
}

export async function cancelAction(nonce: string) {
  return (await requireRedis().del(key(nonce))) === 1;
}

/** Run the action behind a Confirm tap. Returns null when it was already used or expired. */
export async function runAction(nonce: string, origin: string): Promise<OwnerResult | null> {
  const stored = await requireRedis().getdel<{ action: OwnerAction }>(key(nonce));
  if (!stored) return null;
  const a = stored.action;
  let result: OwnerResult;
  switch (a.kind) {
    case "accept":
      result = await acceptRequest(a.requestId);
      break;
    case "decline":
      result = await declineRequest(a.requestId);
      break;
    case "reschedule":
      result = await proposeReschedule(a.requestId, new Date(a.start), a.durationMin, origin);
      break;
    case "email":
      result = await sendOwnerEmail(a.target, a.body);
      break;
    case "settings":
      await updateSettings(a.patch);
      result = { ok: true, message: "Settings updated." };
      break;
  }
  await audit({ actor: "owner", action: `action.run.${a.kind}`, subject: "requestId" in a ? a.requestId : undefined, result: result.ok ? "ok" : "skipped" });
  return result;
}

// ---------- Email ----------

export type Recipient = { name: string; email: string; verified: boolean; subject: string; threadId?: string; context: string };

/** Who an email goes to is decided by the record, never by the model: no free-form addresses. */
export async function resolveRecipient(t: EmailTarget): Promise<Recipient | null> {
  if (t.type === "request") {
    const r = await getRequest(t.id);
    if (!r) return null;
    return { name: r.name, email: r.email, verified: true, subject: REQUEST_SUBJECT, threadId: r.gmailThreadId, context: `call request for ${formatSlot(r.start, "Europe/London")} London` };
  }
  const e = await getEnquiry(t.id);
  if (!e) return null;
  return {
    name: e.name,
    email: e.email,
    verified: false,
    subject: `Your ${enquiryLabel(e.kind).toLowerCase()} enquiry to Christian Onovo`,
    threadId: e.gmailThreadId,
    context: `${enquiryLabel(e.kind).toLowerCase()} enquiry`,
  };
}

async function sendOwnerEmail(t: EmailTarget, body: string): Promise<OwnerResult> {
  const to = await resolveRecipient(t);
  if (!to) return { ok: false, message: "That conversation no longer exists." };
  const sent = await gmailSend({ to: to.email, toName: to.name, subject: to.subject, text: body, threadId: to.threadId });
  if (t.type === "request") await attachThread(t.id, sent.threadId);
  else await attachEnquiryThread(t.id, sent.threadId);
  // Thread → record mapping, so replies in this thread can be matched later.
  await requireRedis().set(`miki:thread:${sent.threadId}`, { ...t, at: new Date().toISOString() }, { ex: 180 * 24 * 3600 });
  await audit({ actor: "owner", action: "email.send", subject: t.id, result: "ok", detail: t.type });
  return { ok: true, message: `Sent to ${to.name}.` };
}

// ---------- Card text (built from the action, never from model prose) ----------

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function describeSetting(k: keyof BookingSettings, v: unknown): string {
  switch (k) {
    case "bookingsEnabled":
      return v ? "Bookings: on" : "Bookings: off until you turn them on";
    case "bookingsPausedUntil":
      return v ? `Bookings paused until ${formatSlot(String(v), "Europe/London")} London` : "Bookings: no pause";
    case "workingDays":
      return `Days: ${(v as number[]).map((d) => DAYS[d]).join(", ")}`;
    case "dayStart":
      return `Day starts: ${hhmm(Number(v))}`;
    case "dayEnd":
      return `Day ends: ${hhmm(Number(v))}`;
    case "durations":
      return `Call lengths: ${(v as number[]).join(" or ")} min`;
    case "bufferMinutes":
      return `Buffer between meetings: ${v} min`;
    case "minNoticeHours":
      return `Minimum notice: ${v} hours`;
    case "horizonDays":
      return `Bookable up to ${v} days ahead`;
    case "visitorThresholds":
      return `Visitor milestones: ${(v as number[]).join(", ")} per day`;
    default:
      return `${k}: ${JSON.stringify(v)}`;
  }
}

async function describe(a: OwnerAction): Promise<{ title: string; lines: string[] }> {
  if (a.kind === "settings") {
    const now = await getSettings();
    const lines = (Object.keys(a.patch) as (keyof BookingSettings)[]).map((k) => `• ${esc(describeSetting(k, now[k]))} → <b>${esc(describeSetting(k, a.patch[k]))}</b>`);
    return { title: "Change settings?", lines };
  }
  if (a.kind === "email") {
    const to = await resolveRecipient(a.target);
    return {
      title: "Send this email?",
      lines: [
        `To: ${untrusted(to?.name ?? "?", 120)} ${untrusted(to?.email ?? "?", 200)}${to?.verified ? " (verified)" : " (not verified)"}`,
        `Subject: ${esc(to?.subject ?? "")}`,
        `About: ${esc(to?.context ?? "")}`,
        "",
        `<pre>${esc(a.body.slice(0, 3000))}</pre>`,
        "To change it, tell me what to change and I'll redraft.",
      ],
    };
  }
  const req = await getRequest(a.requestId);
  const who = req ? `${untrusted(req.name, 120)}${req.company ? ` at ${untrusted(req.company, 120)}` : ""}` : "this visitor";
  const when = req ? `${formatSlot(req.start, "Europe/London")} London, ${req.durationMin} min` : "";
  if (a.kind === "accept") return { title: "Accept this call?", lines: [`${who}: <b>${esc(when)}</b>`, "Creates the Calendar event with a Meet link and emails them the invitation."] };
  if (a.kind === "decline") return { title: "Decline this call?", lines: [`${who}: ${esc(when)}`, "Emails them a polite note that you can't take it."] };
  const offered = `${formatSlot(a.start, "Europe/London")} London, ${a.durationMin} min`;
  const theirs = req ? ` (${formatSlot(a.start, req.visitorTimeZone)} their time)` : "";
  return {
    title: "Offer a new time?",
    lines: [`${who} asked for ${esc(when)}.`, `Offer: <b>${esc(offered)}</b>${esc(theirs)}`, "Emails them a link to accept. The meeting is booked only when they do."],
  };
}
