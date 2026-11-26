import "server-only";
import { z } from "zod";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import { zonedDate, zonedToUtc } from "../availability";
import { checkOwnerSlot, formatSlot, getRequest, ownerFreeSlots, pendingRequests, recentRequests, type MeetingRequest } from "../booking";
import { getEnquiry, recentEnquiries, type Enquiry } from "../enquiry";
import { upcomingEvents } from "../google";
import { getSettings, settingsSchema, type BookingSettings } from "../settings";
import { describeSetting, proposeAction, resolveRecipient } from "./actions";

/**
 * Miki's PRIVATE tools. Imported only by the owner agent, which runs only after the Telegram
 * webhook has verified the secret header, the owner's user id and chat id. Read tools return
 * data; every write tool only creates a confirmation card (see actions.ts).
 */

const fn = (name: string, description: string, properties: Record<string, unknown>, required = Object.keys(properties)): ChatCompletionFunctionTool => ({
  type: "function",
  function: { name, description, strict: true, parameters: { type: "object", properties, required, additionalProperties: false } },
});
const nullable = (type: string, description: string, extra: Record<string, unknown> = {}) => ({ type: [type, "null"], description, ...extra });

export const ownerTools: ChatCompletionFunctionTool[] = [
  fn("list_meeting_requests", "Meeting requests from the website. 'open' = waiting for Christian or for the visitor to accept a new time; 'recent' = the last 20 in any state.", {
    which: { type: "string", enum: ["open", "recent"] },
  }),
  fn("list_enquiries", "Recent professional enquiries visitors sent through Miki, newest first.", {
    kind: nullable("string", "Only this kind, or null for all", { enum: ["project", "recruitment", "collaboration", "partnership", "other", null] }),
  }),
  fn("get_upcoming_meetings", "Christian's calendar events (titles included) from a London date for a number of days.", {
    date: nullable("string", "YYYY-MM-DD London date, or null for now"),
    days: { type: "integer", description: "1 to 14" },
  }),
  fn("get_free_slots", "Christian's free start times on one London date within his working hours.", {
    date: { type: "string", description: "YYYY-MM-DD London date" },
    duration: { type: "integer", enum: [30, 60] },
  }),
  fn("get_settings", "Current booking and notification settings.", {}),
  fn("get_visitor_metrics", "Website visitor numbers for today.", {}),
  fn("approve_meeting_request", "Ask Christian to confirm accepting a meeting request (sends him a Confirm card).", { request_id: { type: "string" } }),
  fn("decline_meeting_request", "Ask Christian to confirm declining a meeting request (sends him a Confirm card).", { request_id: { type: "string" } }),
  fn("propose_reschedule", "Ask Christian to confirm offering a visitor a different time (sends him a Confirm card). The visitor must accept it before anything is booked.", {
    request_id: { type: "string" },
    start_london: { type: "string", description: "New start as London wall-clock time, YYYY-MM-DDTHH:mm" },
    duration: nullable("integer", "30 or 60, or null to keep the requested length", { enum: [30, 60, null] }),
  }),
  fn("draft_email_reply", "Draft an email to the visitor behind a meeting request or enquiry and show it to Christian with a Send button. The recipient comes from the record; you only write the body.", {
    target_type: { type: "string", enum: ["request", "enquiry"] },
    target_id: { type: "string" },
    body: { type: "string", description: "The full plain-text email, greeting to sign-off, in Christian's voice, signed Christian" },
  }),
  fn("update_booking_availability", "Ask Christian to confirm a change to booking settings (sends him a Confirm card). Use null for anything not changing.", {
    bookings_enabled: nullable("boolean", "Turn bookings on or off indefinitely"),
    pause_until: nullable("string", "YYYY-MM-DD London date: bookings stay off until the start of that day"),
    clear_pause: { type: "boolean", description: "True to end a pause now" },
    working_days: nullable("array", "ISO weekdays, 1 = Monday … 7 = Sunday", { items: { type: "integer" } }),
    day_start: nullable("string", "HH:mm London"),
    day_end: nullable("string", "HH:mm London"),
    durations: nullable("array", "Allowed call lengths", { items: { type: "integer", enum: [30, 60] } }),
    buffer_minutes: nullable("integer", "Gap kept around meetings"),
    min_notice_hours: nullable("integer", "Minimum notice for a booking"),
    horizon_days: nullable("integer", "How far ahead visitors can book"),
  }),
  fn("update_notification_preferences", "Ask Christian to confirm new daily visitor milestones (sends him a Confirm card).", {
    visitor_thresholds: { type: "array", items: { type: "integer" }, description: "e.g. [5] or [10, 50]" },
  }),
];

const reqId = z.string().regex(/^[0-9a-v]{20}$/, "Unknown request id: use an id from list_meeting_requests");
const enqId = z.string().regex(/^[0-9a-f]{16}$/, "Unknown enquiry id: use an id from list_enquiries");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dur = z.union([z.literal(30), z.literal(60)]);

const schemas = {
  list_meeting_requests: z.object({ which: z.enum(["open", "recent"]) }),
  list_enquiries: z.object({ kind: z.enum(["project", "recruitment", "collaboration", "partnership", "other"]).nullable() }),
  get_upcoming_meetings: z.object({ date: date.nullable(), days: z.number().int().min(1).max(14) }),
  get_free_slots: z.object({ date, duration: dur }),
  get_settings: z.object({}),
  get_visitor_metrics: z.object({}),
  approve_meeting_request: z.object({ request_id: reqId }),
  decline_meeting_request: z.object({ request_id: reqId }),
  propose_reschedule: z.object({ request_id: reqId, start_london: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/), duration: dur.nullable() }),
  draft_email_reply: z.object({ target_type: z.enum(["request", "enquiry"]), target_id: z.string(), body: z.string().trim().min(10).max(4000) }),
  update_booking_availability: z.object({
    bookings_enabled: z.boolean().nullable(),
    pause_until: date.nullable(),
    clear_pause: z.boolean(),
    working_days: z.array(z.number().int().min(1).max(7)).min(1).max(7).nullable(),
    day_start: time.nullable(),
    day_end: time.nullable(),
    durations: z.array(dur).min(1).nullable(),
    buffer_minutes: z.number().int().min(0).max(120).nullable(),
    min_notice_hours: z.number().int().min(0).max(336).nullable(),
    horizon_days: z.number().int().min(1).max(90).nullable(),
  }),
  update_notification_preferences: z.object({ visitor_thresholds: z.array(z.number().int().min(1).max(100000)).min(1).max(5) }),
} as const;
type ToolName = keyof typeof schemas;
type Args<T extends ToolName> = z.infer<(typeof schemas)[T]>;

const LONDON = "Europe/London";
const london = (iso: string) => formatSlot(iso, LONDON);
const atLondon = (ymd: string, minutes = 0) => {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return zonedToUtc(y, m, d, minutes, LONDON);
};
const minutesOf = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));

/** Visitor-written text is labelled so the model treats it as data, not instructions. */
const requestView = (r: MeetingRequest) => ({
  id: r.id,
  state: r.state,
  name: r.name,
  company: r.company,
  email: r.email,
  when_london: `${london(r.start)}, ${r.durationMin} min`,
  visitor_time_zone: r.visitorTimeZone,
  offered_new_time_london: r.state === "reschedule_proposed" && r.proposal ? london(r.proposal.start) : undefined,
  visitor_wrote_purpose: r.purpose.slice(0, 400),
  received: london(r.createdAt),
});
const enquiryView = (e: Enquiry) => ({
  id: e.id,
  kind: e.kind,
  name: e.name,
  organisation: e.organisation,
  email: `${e.email} (not verified)`,
  replied: Boolean(e.gmailThreadId),
  visitor_wrote_message: e.message.slice(0, 800),
  received: london(e.createdAt),
});

const CARD = "A confirmation card is now in the chat. Tell Christian in one short line what it will do; nothing happens until he taps it.";

/** One runner per owner message, with a small budget per tool. */
export function createOwnerToolRunner() {
  const used: Partial<Record<ToolName, number>> = {};
  let cards = 0;

  return async function run(name: string, rawArgs: string): Promise<unknown> {
    if (!(name in schemas)) return "Unknown tool";
    const tool = name as ToolName;
    if ((used[tool] ?? 0) >= 4) return "Limit reached for this message.";
    let parsed;
    try {
      parsed = schemas[tool].safeParse(JSON.parse(rawArgs));
    } catch {
      return "Invalid arguments";
    }
    if (!parsed.success) return `Invalid arguments: ${parsed.error.issues[0]?.message ?? "check the values"}`;
    used[tool] = (used[tool] ?? 0) + 1;
    const isWrite = ["approve_meeting_request", "decline_meeting_request", "propose_reschedule", "draft_email_reply", "update_booking_availability", "update_notification_preferences"].includes(tool);
    if (isWrite && ++cards > 2) return "You've already sent two confirmation cards for this message. Ask Christian before sending more.";

    switch (tool) {
      case "list_meeting_requests": {
        const a = parsed.data as Args<"list_meeting_requests">;
        const rows = a.which === "open" ? await pendingRequests(20) : await recentRequests(20);
        return rows.length ? rows.map(requestView) : "None.";
      }
      case "list_enquiries": {
        const a = parsed.data as Args<"list_enquiries">;
        const rows = await recentEnquiries(10, a.kind ?? undefined);
        return rows.length ? rows.map(enquiryView) : "None.";
      }
      case "get_upcoming_meetings": {
        const a = parsed.data as Args<"get_upcoming_meetings">;
        const from = a.date ? atLondon(a.date) : new Date();
        const events = await upcomingEvents(from, new Date(from.getTime() + a.days * 864e5));
        return events.length ? events.map((e) => ({ title: e.summary, start: e.start.includes("T") ? london(e.start) : `${e.start} (all day)`, end: e.end.includes("T") ? london(e.end) : e.end, meet: e.meet })) : "No events.";
      }
      case "get_free_slots": {
        const a = parsed.data as Args<"get_free_slots">;
        const slots = await ownerFreeSlots(a.date, a.duration);
        return slots.length ? slots.map(london) : "Nothing free in working hours that day.";
      }
      case "get_settings": {
        const s = await getSettings();
        return (Object.keys(s) as (keyof BookingSettings)[]).filter((k) => k !== "timeZone" && k !== "stepMinutes").map((k) => describeSetting(k, s[k]));
      }
      case "get_visitor_metrics":
        return "Visitor numbers aren't connected yet; they arrive in the next Miki update. Say so plainly.";
      case "approve_meeting_request":
      case "decline_meeting_request": {
        const { request_id } = parsed.data as Args<"approve_meeting_request">;
        const r = await getRequest(request_id);
        if (!r) return "No request with that id.";
        if (r.state !== "pending") return `That request is ${r.state.replace("_", " ")}, so it can't be ${tool === "approve_meeting_request" ? "accepted" : "declined"} now.`;
        const accept = tool === "approve_meeting_request";
        await proposeAction({ kind: accept ? "accept" : "decline", requestId: r.id }, accept ? "✅ Accept" : "✖️ Decline (emails them)");
        return CARD;
      }
      case "propose_reschedule": {
        const a = parsed.data as Args<"propose_reschedule">;
        const r = await getRequest(a.request_id);
        if (!r) return "No request with that id.";
        if (r.state !== "pending" && r.state !== "reschedule_proposed") return `That request is ${r.state}, so a new time can't be offered.`;
        const [d, t] = a.start_london.split("T") as [string, string];
        const start = atLondon(d, minutesOf(t));
        const durationMin = a.duration ?? r.durationMin;
        const check = await checkOwnerSlot(start, durationMin);
        if (!check.ok) return { not_possible: check.message, free_alternatives_london: "alternatives" in check ? check.alternatives?.map(london) : undefined };
        await proposeAction({ kind: "reschedule", requestId: r.id, start: start.toISOString(), durationMin }, "🕒 Offer this time (emails them)");
        return CARD;
      }
      case "draft_email_reply": {
        const a = parsed.data as Args<"draft_email_reply">;
        const id = (a.target_type === "request" ? reqId : enqId).safeParse(a.target_id);
        if (!id.success) return id.error.issues[0]!.message;
        if (!(await resolveRecipient({ type: a.target_type, id: id.data }))) return "No record with that id.";
        await proposeAction({ kind: "email", target: { type: a.target_type, id: id.data }, body: a.body }, "📨 Send");
        return CARD;
      }
      case "update_booking_availability": {
        const a = parsed.data as Args<"update_booking_availability">;
        const patch: Partial<BookingSettings> = {};
        if (a.bookings_enabled !== null) patch.bookingsEnabled = a.bookings_enabled;
        if (a.pause_until) {
          const until = atLondon(a.pause_until);
          if (until.getTime() <= Date.now()) return "That date is in the past.";
          patch.bookingsPausedUntil = until.toISOString();
        }
        if (a.clear_pause) patch.bookingsPausedUntil = null;
        if (a.working_days) patch.workingDays = [...new Set(a.working_days)].sort();
        if (a.day_start) patch.dayStart = minutesOf(a.day_start);
        if (a.day_end) patch.dayEnd = minutesOf(a.day_end);
        if (a.durations) patch.durations = [...new Set(a.durations)].sort();
        if (a.buffer_minutes !== null) patch.bufferMinutes = a.buffer_minutes;
        if (a.min_notice_hours !== null) patch.minNoticeHours = a.min_notice_hours;
        if (a.horizon_days !== null) patch.horizonDays = a.horizon_days;
        const current = await getSettings();
        for (const k of Object.keys(patch) as (keyof BookingSettings)[]) if (JSON.stringify(patch[k]) === JSON.stringify(current[k])) delete patch[k];
        if (!Object.keys(patch).length) return "Nothing to change: the settings are already like that.";
        const next = settingsSchema.safeParse({ ...current, ...patch });
        if (!next.success || next.data.dayEnd <= next.data.dayStart) return "Those settings aren't valid (the day must end after it starts).";
        await proposeAction({ kind: "settings", patch }, "✅ Apply");
        return CARD;
      }
      case "update_notification_preferences": {
        const a = parsed.data as Args<"update_notification_preferences">;
        await proposeAction({ kind: "settings", patch: { visitorThresholds: [...new Set(a.visitor_thresholds)].sort((x, y) => x - y) } }, "✅ Apply");
        return CARD;
      }
    }
  };
}

/** Today in London, for the agent's sense of "tomorrow" and "Monday". */
export function londonNow() {
  const now = new Date();
  const { y, m, d, weekday } = zonedDate(now, LONDON);
  const time = now.toLocaleTimeString("en-GB", { timeZone: LONDON, hour: "2-digit", minute: "2-digit" });
  return `${["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekday]} ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}, ${time} London`;
}

/** Context line for a conversation Christian opened with a button ("Reply by email" etc.). */
export async function describeFocus(f: Focus) {
  if (f.type === "request") {
    const r = await getRequest(f.id);
    if (!r) return null;
    const how = f.intent === "reschedule" ? `To offer a time use propose_reschedule with request_id "${r.id}".` : `To reply use draft_email_reply with target_type "request" and target_id "${r.id}".`;
    return { line: `the meeting request from ${r.name} (${london(r.start)} London). ${how}`, name: r.name };
  }
  const e = await getEnquiry(f.id);
  return e ? { line: `the ${e.kind} enquiry from ${e.name}. To reply use draft_email_reply with target_type "enquiry" and target_id "${e.id}".`, name: e.name } : null;
}

export type Focus = { type: "request" | "enquiry"; id: string; intent: "reply" | "reschedule" };
