import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { acceptRequest, declineRequest, formatSlot, getRequest, ownerAlternatives, pendingRequests } from "@/lib/miki/booking";
import { sign } from "@/lib/miki/crypto";
import { getEnquiry } from "@/lib/miki/enquiry";
import { googleConfigured, isConnected, upcomingEvents } from "@/lib/miki/google";
import { cancelAction, describeSetting, isNonce, runAction, storeAction } from "@/lib/miki/owner/actions";
import { clearConversation, runOwnerAgent, setFocus, toTelegramText } from "@/lib/miki/owner/agent";
import { getSettings, type BookingSettings } from "@/lib/miki/settings";
import { audit, redis } from "@/lib/miki/store";
import { esc, isOwner, mikiMessage, sendToOwner, tgApi, untrusted, type InlineButton } from "@/lib/miki/telegram";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Owner-only Telegram webhook. Order of checks: secret header → update dedupe → owner
 * user id AND chat id. Anything else is acknowledged (so Telegram stops retrying) and ignored.
 */
const update = z.object({
  update_id: z.number(),
  message: z.object({ message_id: z.number(), from: z.object({ id: z.number() }).optional(), chat: z.object({ id: z.number() }), text: z.string().max(4096).optional() }).optional(),
  callback_query: z
    .object({
      id: z.string(),
      from: z.object({ id: z.number() }),
      data: z.string().max(64).optional(),
      message: z.object({ message_id: z.number(), chat: z.object({ id: z.number() }) }).optional(),
    })
    .optional(),
});

function secretOk(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const given = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export async function POST(req: Request) {
  if (!secretOk(req)) return new Response("forbidden", { status: 403 });
  const parsed = update.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("ok");
  const u = parsed.data;
  if (redis && (await redis.set(`miki:tg:update:${u.update_id}`, 1, { nx: true, ex: 86400 })) !== "OK") return new Response("ok");

  const fromId = u.message?.from?.id ?? u.callback_query?.from.id;
  const chatId = u.message?.chat.id ?? u.callback_query?.message?.chat.id;
  if (!isOwner(fromId, chatId)) {
    await audit({ actor: "system", action: "telegram.rejected", result: "skipped", detail: `from ${fromId ?? "?"}` });
    return new Response("ok");
  }
  // Acknowledge now; do the work after the response (Telegram expects a quick 200).
  after(async () => {
    try {
      const origin = new URL(req.url).origin;
      if (u.callback_query) await onButton(u.callback_query, origin);
      else if (u.message?.text) await onMessage(u.message.text, u.message.chat.id, origin);
    } catch (err) {
      console.error("[miki] telegram handler", err instanceof Error ? err.message : err);
      await sendToOwner(mikiMessage("Something went wrong", ["That action failed. Nothing was changed twice; try again."]));
    }
  });
  return new Response("ok");
}


type Callback = NonNullable<z.infer<typeof update>["callback_query"]>;

const removeButtons = (chat?: number, messageId?: number) =>
  chat && messageId ? tgApi("editMessageReplyMarkup", { chat_id: chat, message_id: messageId, reply_markup: { inline_keyboard: [] } }) : null;

function resultLines(result: { ok: boolean; message: string; meetLink?: string; alternatives?: string[] }) {
  const lines = [result.ok ? `✅ ${esc(result.message)}` : `⚠️ ${esc(result.message)}`];
  if (result.ok && result.meetLink) lines.push(`Meet: ${untrusted(result.meetLink, 100)}`);
  if (!result.ok && result.alternatives?.length) {
    lines.push("Free alternatives (London):", ...result.alternatives.map((a) => `• ${esc(formatSlot(a, "Europe/London"))}`));
    lines.push("Tap Reschedule on the request, or tell me which one to offer.");
  }
  return lines;
}

async function onButton(cb: Callback, origin: string) {
  const [kind, id] = (cb.data ?? "").split(":");
  const chat = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  if (!id || !kind) return void (await tgApi("answerCallbackQuery", { callback_query_id: cb.id }));
  await tgApi("answerCallbackQuery", { callback_query_id: cb.id, text: kind === "no" ? "Cancelled" : "Working on it…" });

  // Request card: Accept / Decline act at once (the tap on the card is the confirmation).
  if (kind === "acc" || kind === "dec") {
    const result = kind === "acc" ? await acceptRequest(id) : await declineRequest(id);
    const req = await getRequest(id);
    if (result.ok) await removeButtons(chat, messageId);
    await sendToOwner(mikiMessage(req ? `Request from ${req.name}` : "Request", resultLines(result)));
    return;
  }

  // Confirmation cards from Miki: run or cancel the stored action, exactly once.
  if ((kind === "ok" || kind === "no") && isNonce(id)) {
    await removeButtons(chat, messageId);
    if (kind === "no") {
      await cancelAction(id);
      await audit({ actor: "owner", action: "action.cancel", result: "ok" });
      return void (await sendToOwner(mikiMessage("Cancelled", ["Nothing was sent or changed."])));
    }
    const result = await runAction(id, origin);
    await sendToOwner(mikiMessage(!result ? "Already handled" : result.ok ? "Done" : "Not done", result ? resultLines(result) : ["That card was already used or has expired."]));
    return;
  }

  if (kind === "res") {
    const req = await getRequest(id);
    if (!req) return void (await sendToOwner(mikiMessage("Request", ["Request not found (it may have expired)."])));
    if (req.state !== "pending" && req.state !== "reschedule_proposed") {
      return void (await sendToOwner(mikiMessage(`Request from ${req.name}`, [`This request is ${esc(req.state.replace("_", " "))}.`])));
    }
    await setFocus({ type: "request", id, intent: "reschedule" });
    const around = new Date(Math.max(new Date(req.start).getTime(), Date.now() + 24 * 3600_000));
    const alts = await ownerAlternatives(req.durationMin, around);
    // Each button is a stored action: tapping one is the explicit "offer this time".
    const buttons: InlineButton[][] = [];
    for (const a of alts) {
      const nonce = await storeAction({ kind: "reschedule", requestId: id, start: a, durationMin: req.durationMin });
      buttons.push([{ text: `Offer ${formatSlot(a, "Europe/London")} (emails them)`, callback_data: `ok:${nonce}` }]);
    }
    await sendToOwner(
      mikiMessage(`New time for ${req.name}`, [
        `They asked for ${esc(formatSlot(req.start, "Europe/London"))} London, ${req.durationMin} min.`,
        alts.length ? "Tap a free time to offer it, or tell me another (e.g. “Monday at 2pm”)." : "No free times in your working hours soon. Tell me a time to offer (e.g. “Monday at 6pm”).",
        "They get an email with a link to accept; it's booked only when they do.",
      ]),
      buttons.length ? buttons : undefined,
    );
    return;
  }

  if (kind === "rep" || kind === "rpe") {
    const type = kind === "rep" ? "request" : "enquiry";
    const rec = type === "request" ? await getRequest(id) : await getEnquiry(id);
    if (!rec) return void (await sendToOwner(mikiMessage("Reply", ["That conversation no longer exists."])));
    await setFocus({ type, id, intent: "reply" });
    await sendToOwner(
      mikiMessage(`Reply to ${rec.name}`, [`What should I tell ${untrusted(rec.name, 60)}? Write it in your own words and I'll draft the email for you to check before anything is sent.`]),
    );
  }
}

const HELP = [
  "Tell me what you need in plain English, for example:",
  "• Accept Alex's meeting",
  "• Ask Sarah if Monday at 11 works",
  "• What meetings do I have tomorrow?",
  "• Reply to the latest recruitment enquiry",
  "• Disable bookings until Monday",
  "I always show you a card to confirm before I email anyone or change anything.",
  "",
  "/pending: requests waiting for you",
  "/meetings: your next 7 days",
  "/settings: booking and notification settings",
  "/visitors: today's visitors",
  "/reset: start our conversation afresh",
  "/connect_google: connect or reconnect Google",
];

async function onMessage(text: string, chatId: number, origin: string) {
  const first = text.trim().split(/\s+/)[0]!.toLowerCase();
  const cmd = first.startsWith("/") ? first.replace(/@.*$/, "") : null;
  if (!cmd) {
    const reply = await runOwnerAgent(text, chatId);
    await sendToOwner(toTelegramText(reply));
    return;
  }
  if (cmd === "/start" || cmd === "/help") return void (await sendToOwner(mikiMessage("What I can do", HELP)));
  if (cmd === "/pending") {
    const rows = await pendingRequests(10);
    await sendToOwner(
      mikiMessage(
        "Pending requests",
        rows.length
          ? rows.map(
              (r) =>
                `• ${untrusted(r.name, 60)}: ${esc(formatSlot(r.start, "Europe/London"))}, ${r.durationMin} min` +
                (r.state === "reschedule_proposed" && r.proposal ? ` (you offered ${esc(formatSlot(r.proposal.start, "Europe/London"))}; waiting for them)` : ""),
            )
          : ["Nothing waiting for you."],
      ),
    );
    return;
  }
  if (cmd === "/meetings") {
    const events = await upcomingEvents(new Date(), new Date(Date.now() + 7 * 864e5)).catch(() => null);
    if (!events) return void (await sendToOwner(mikiMessage("Meetings", ["I couldn't reach Google Calendar. If this keeps happening, use /connect_google."])));
    await sendToOwner(
      mikiMessage(
        "Next 7 days",
        events.length
          ? events.map((e) => `• ${esc(e.start.includes("T") ? formatSlot(e.start, "Europe/London") : `${e.start} (all day)`)}: ${untrusted(e.summary, 80)}`)
          : ["Nothing in your calendar."],
      ),
    );
    return;
  }
  if (cmd === "/settings") {
    const s = await getSettings();
    const keys = (Object.keys(s) as (keyof BookingSettings)[]).filter((k) => k !== "timeZone" && k !== "stepMinutes");
    await sendToOwner(mikiMessage("Settings", [...keys.map((k) => `• ${esc(describeSetting(k, s[k]))}`), "", "Tell me what to change, e.g. “buffer 30 minutes”."]));
    return;
  }
  if (cmd === "/visitors") return void (await sendToOwner(mikiMessage("Visitors", ["Visitor numbers arrive in the next Miki update."])));
  if (cmd === "/reset" || cmd === "/cancel") {
    await clearConversation();
    return void (await sendToOwner(mikiMessage("Fresh start", ["I've cleared our conversation. Confirmation cards already sent still work."])));
  }
  if (cmd === "/connect_google") {
    if (!googleConfigured()) return void (await sendToOwner(mikiMessage("Google", ["Google OAuth isn't configured on this deployment yet."])));
    const link = `${origin}/api/google/oauth/start?t=${encodeURIComponent(sign("google-connect", {}, 15 * 60))}`;
    const connected = await isConnected();
    await audit({ actor: "owner", action: "google.connect.link", result: "ok" });
    await sendToOwner(
      mikiMessage("Connect Google", [connected ? "Google is already connected. Use this to reconnect:" : "Open this link to connect your Google account:", "Single use, expires in 15 minutes."]),
      [[{ text: "Connect Google", url: link }]],
    );
    return;
  }
  await sendToOwner(mikiMessage("Commands", HELP));
}
