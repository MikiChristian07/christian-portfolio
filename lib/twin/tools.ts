import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import { mikiMessage, sendToOwner, telegramConfigured, untrusted } from "@/lib/miki/telegram";
import { allowNotification } from "@/lib/miki/notify-limit";
import { audit } from "@/lib/miki/store";
import { BookingError, checkVerificationCode, publicAvailability, sendVerificationCode, submitRequest, suggestTimes } from "@/lib/miki/booking";
import { saveEnquiry } from "@/lib/miki/enquiry";
import { searchKnowledge } from "@/lib/miki/knowledge-search";

/**
 * Miki's PUBLIC tools: the only tools the website agent can ever call.
 * Owner tools (approve, email, settings, metrics) live in lib/miki/owner and are never
 * imported here. Every argument comes from the model, so each is validated with zod,
 * and each conversation request has a small budget.
 */

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]): ChatCompletionFunctionTool => ({
  type: "function",
  function: { name, description, strict: true, parameters: { type: "object", properties, required, additionalProperties: false } },
});

const durationProp = { type: "integer", enum: [30, 60], description: "Call length in minutes" };
const tzProp = { type: "string", description: "The visitor's IANA time zone, e.g. Europe/London or America/New_York" };

export const tools: ChatCompletionFunctionTool[] = [
  fn("search_knowledge_base", "Look up verified facts about Christian's projects, roles, education, expertise and research, with the page link to cite.", { query: { type: "string" } }, ["query"]),
  fn(
    "get_public_availability",
    "List Christian's open call times. Returns only free start times, never details of his calendar. Times are formatted in the visitor's time zone.",
    { duration: durationProp, timezone: tzProp, date: { type: ["string", "null"], description: "Optional preferred date YYYY-MM-DD in the visitor's time zone, or null for the soonest" } },
    ["duration", "timezone", "date"],
  ),
  fn(
    "suggest_meeting_times",
    "Suggest up to three open times nearest to a time the visitor asked for.",
    { duration: durationProp, timezone: tzProp, preferred_start: { type: "string", description: "ISO 8601 date-time of the visitor's preferred start, with offset" } },
    ["duration", "timezone", "preferred_start"],
  ),
  fn(
    "submit_meeting_request",
    "Request a call with Christian. Only after reading every detail back to the visitor and getting an explicit yes. First call with code null: emails the visitor a 6-digit code. Second call with the code they give you: submits the request for Christian to approve.",
    {
      name: { type: "string" },
      email: { type: "string" },
      company: { type: ["string", "null"] },
      purpose: { type: "string" },
      start: { type: "string", description: "Exact ISO start time from get_public_availability" },
      duration: durationProp,
      timezone: tzProp,
      visitor_confirmed: { type: "boolean", description: "True only if the visitor explicitly confirmed these exact details" },
      code: { type: ["string", "null"], description: "The 6-digit code the visitor received by email, or null to send one" },
    },
    ["name", "email", "company", "purpose", "start", "duration", "timezone", "visitor_confirmed", "code"],
  ),
  fn(
    "submit_professional_enquiry",
    "Pass a professional enquiry (project, recruitment, collaboration, partnership) to Christian, after the visitor has given their own email and agreed to send it.",
    {
      kind: { type: "string", enum: ["project", "recruitment", "collaboration", "partnership", "other"] },
      name: { type: "string" },
      email: { type: "string" },
      organisation: { type: ["string", "null"] },
      message: { type: "string" },
    },
    ["kind", "name", "email", "organisation", "message"],
  ),
  fn("record_unknown_question", "Always use this tool to record any question that couldn't be answered as you didn't know the answer", { question: { type: "string" } }, ["question"]),
];

const tz = z.string().max(64).refine((t) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: t });
    return true;
  } catch {
    return false;
  }
});
const schemas = {
  search_knowledge_base: z.object({ query: z.string().min(1).max(200) }),
  get_public_availability: z.object({ duration: z.union([z.literal(30), z.literal(60)]), timezone: tz, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }),
  suggest_meeting_times: z.object({ duration: z.union([z.literal(30), z.literal(60)]), timezone: tz, preferred_start: z.iso.datetime({ offset: true }) }),
  submit_meeting_request: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(200),
    company: z.string().trim().max(120).nullable(),
    purpose: z.string().trim().min(3).max(1000),
    start: z.iso.datetime({ offset: true }),
    duration: z.union([z.literal(30), z.literal(60)]),
    timezone: tz,
    visitor_confirmed: z.boolean(),
    code: z.string().regex(/^\d{6}$/).nullable(),
  }),
  submit_professional_enquiry: z.object({
    kind: z.enum(["project", "recruitment", "collaboration", "partnership", "other"]),
    name: z.string().trim().min(1).max(120),
    email: z.email().max(200),
    organisation: z.string().trim().max(120).nullable(),
    message: z.string().trim().min(1).max(2000),
  }),
  record_unknown_question: z.object({ question: z.string().min(1).max(500) }),
} as const;

type ToolName = keyof typeof schemas;
const LIMITS: Record<ToolName, number> = {
  search_knowledge_base: 4,
  get_public_availability: 3,
  suggest_meeting_times: 2,
  submit_meeting_request: 2,
  submit_professional_enquiry: 1,
  record_unknown_question: 2,
};

const fmt = (iso: string, zone: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: zone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Legacy channel, kept only while Telegram isn't configured. */
async function pushover(message: string) {
  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;
  if (!token || !user) return false;
  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    body: new URLSearchParams({ token, user, message: message.slice(0, 1000) }),
    signal: AbortSignal.timeout(5000),
  });
  return res.ok;
}

/** Per-request tool runner. `ip` feeds the booking rate limits. */
export function createToolRunner(ctx: { ip: string }) {
  const used: Partial<Record<ToolName, number>> = {};

  return async function run(name: string, rawArgs: string): Promise<string> {
    if (!(name in schemas)) return "Unknown tool";
    const tool = name as ToolName;
    if ((used[tool] ?? 0) >= LIMITS[tool]) return "Limit reached for this conversation.";
    let args: unknown;
    try {
      args = JSON.parse(rawArgs);
    } catch {
      return "Invalid arguments";
    }
    const parsed = schemas[tool].safeParse(args);
    if (!parsed.success) return `Invalid arguments: ${parsed.error.issues[0]?.message ?? "check the values"}`;
    used[tool] = (used[tool] ?? 0) + 1;

    try {
      switch (tool) {
        case "search_knowledge_base": {
          const hits = searchKnowledge((parsed.data as z.infer<(typeof schemas)["search_knowledge_base"]>).query);
          return JSON.stringify(hits.length ? hits : "No matching facts. Say you don't know and record the question.");
        }
        case "get_public_availability": {
          const a = parsed.data as z.infer<(typeof schemas)["get_public_availability"]>;
          const { slots } = await publicAvailability(a.duration);
          const local = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: a.timezone });
          const pick = (a.date ? slots.filter((s) => local(s) >= a.date!) : slots).slice(0, 8);
          return JSON.stringify(
            pick.length
              ? { timezone: a.timezone, slots: pick.map((s) => ({ start: s, label: fmt(s, a.timezone) })) }
              : "No open times in the booking window. Suggest the contact form.",
          );
        }
        case "suggest_meeting_times": {
          const a = parsed.data as z.infer<(typeof schemas)["suggest_meeting_times"]>;
          const alts = await suggestTimes(a.duration, new Date(a.preferred_start));
          return JSON.stringify({ timezone: a.timezone, alternatives: alts.map((s) => ({ start: s, label: fmt(s, a.timezone) })) });
        }
        case "submit_meeting_request": {
          const a = parsed.data as z.infer<(typeof schemas)["submit_meeting_request"]>;
          if (!a.visitor_confirmed) return "Not sent. Read every detail back to the visitor and get an explicit yes first.";
          if (!a.code) {
            await sendVerificationCode(a.email, ctx.ip);
            return `A 6-digit code was emailed to ${a.email}. Ask the visitor for it, then call this tool again with the code.`;
          }
          const verifiedToken = await checkVerificationCode(a.email, a.code);
          const idempotencyKey = createHash("sha256").update(`${a.email.toLowerCase()}|${a.start}|${a.duration}`).digest("hex").slice(0, 40);
          const result = await submitRequest(
            {
              name: a.name,
              email: a.email,
              company: a.company,
              purpose: a.purpose,
              start: new Date(a.start).toISOString(),
              durationMin: a.duration,
              visitorTimeZone: a.timezone,
              verifiedToken,
              idempotencyKey,
              source: "miki",
            },
            ctx.ip,
          );
          if (result.status === "pending") {
            return "Submitted. It is a REQUEST: Christian approves it personally, and if he accepts, the visitor gets a calendar invitation with a Google Meet link by email. Do not say the meeting is booked.";
          }
          return JSON.stringify({ unavailable: true, alternatives: result.alternatives.map((s) => ({ start: s, label: fmt(s, a.timezone) })) });
        }
        case "submit_professional_enquiry": {
          const a = parsed.data as z.infer<(typeof schemas)["submit_professional_enquiry"]>;
          await saveEnquiry({ kind: a.kind, name: a.name, email: a.email.toLowerCase(), organisation: a.organisation, message: a.message });
          return "Passed to Christian. He replies personally by email.";
        }
        case "record_unknown_question": {
          const a = parsed.data as z.infer<(typeof schemas)["record_unknown_question"]>;
          if (!(await allowNotification())) {
            await audit({ actor: "visitor", action: "notify.unknown_question", result: "skipped", detail: "notification cap reached" });
            return "OK";
          }
          const sent = telegramConfigured
            ? (await sendToOwner(mikiMessage("Unanswered question", ["A visitor asked something I couldn't answer:", untrusted(a.question)]))) !== null
            : await pushover(`Recording ${a.question} asked that I couldn't answer`);
          await audit({ actor: "visitor", action: "notify.unknown_question", result: sent ? "ok" : "error", detail: telegramConfigured ? "telegram" : "pushover" });
          return "OK";
        }
      }
    } catch (err) {
      if (err instanceof BookingError) return `Could not complete: ${err.message}`;
      console.error(`[miki] tool ${tool} failed`, err instanceof Error ? err.message : err);
      return "That didn't work just now. Suggest the Book a call button or the contact form.";
    }
  };
}
