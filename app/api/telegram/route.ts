import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { acceptRequest, declineRequest, formatSlot, getRequest, pendingRequests } from "@/lib/miki/booking";
import { sign } from "@/lib/miki/crypto";
import { googleConfigured, isConnected } from "@/lib/miki/google";
import { audit, redis } from "@/lib/miki/store";
import { esc, isOwner, mikiMessage, sendToOwner, tgApi, untrusted } from "@/lib/miki/telegram";

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
      if (u.callback_query) await onButton(u.callback_query);
      else if (u.message?.text) await onCommand(u.message.text, new URL(req.url).origin);
    } catch (err) {
      console.error("[miki] telegram handler", err instanceof Error ? err.message : err);
      await sendToOwner(mikiMessage("Something went wrong", ["That action failed. Nothing was changed twice; try again."]));
    }
  });
  return new Response("ok");
}

type Callback = NonNullable<z.infer<typeof update>["callback_query"]>;

async function onButton(cb: Callback) {
  const [kind, id] = (cb.data ?? "").split(":");
  const chat = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  if (!id || !kind) return void (await tgApi("answerCallbackQuery", { callback_query_id: cb.id }));
  await tgApi("answerCallbackQuery", { callback_query_id: cb.id, text: "Working on it…" });

  if (kind === "acc" || kind === "dec") {
    const result = kind === "acc" ? await acceptRequest(id) : await declineRequest(id);
    const req = await getRequest(id);
    const lines = [result.ok ? `✅ ${esc(result.message)}` : `⚠️ ${esc(result.message)}`];
    if (result.ok && result.meetLink) lines.push(`Meet: ${esc(result.meetLink)}`);
    if (!result.ok && result.alternatives?.length) {
      lines.push("Free alternatives (London):", ...result.alternatives.map((a) => `• ${esc(formatSlot(a, "Europe/London"))}`));
      lines.push("Use Reschedule to offer one of these.");
    }
    // Remove the buttons once decided so the card can't be actioned twice.
    if (result.ok && chat && messageId) await tgApi("editMessageReplyMarkup", { chat_id: chat, message_id: messageId, reply_markup: { inline_keyboard: [] } });
    await sendToOwner(mikiMessage(req ? `Request from ${req.name}` : "Request", lines));
    return;
  }
  if (kind === "res" || kind === "rep") {
    await sendToOwner(mikiMessage("Coming next", ["Rescheduling and email replies arrive in the next Miki update. For now, Accept or Decline, or reply to them directly."]));
  }
}

async function onCommand(text: string, origin: string) {
  const cmd = text.trim().split(/\s+/)[0]!.toLowerCase().replace(/@.*$/, "");
  if (cmd === "/start" || cmd === "/help") {
    await sendToOwner(
      mikiMessage("Commands", [
        "/pending: meeting requests waiting for you",
        "/connect_google: connect or reconnect your Google Calendar and Gmail",
        "Tap Accept or Decline on any request card.",
        "Plain-English instructions come in the next update.",
      ]),
    );
    return;
  }
  if (cmd === "/pending") {
    const rows = await pendingRequests(10);
    await sendToOwner(
      mikiMessage(
        "Pending requests",
        rows.length
          ? rows.map((r) => `• ${untrusted(r.name, 60)}: ${esc(formatSlot(r.start, "Europe/London"))}, ${r.durationMin} min`)
          : ["Nothing waiting for you."],
      ),
    );
    return;
  }
  if (cmd === "/connect_google") {
    if (!googleConfigured()) return void (await sendToOwner(mikiMessage("Google", ["Google OAuth isn't configured on this deployment yet."])));
    const link = `${origin}/api/google/oauth/start?t=${encodeURIComponent(sign("google-connect", {}, 15 * 60))}`;
    const connected = await isConnected();
    await audit({ actor: "owner", action: "google.connect.link", result: "ok" });
    await sendToOwner(mikiMessage("Connect Google", [connected ? "Google is already connected. Use this to reconnect:" : "Open this link to connect your Google account:", "Single use, expires in 15 minutes."]), [
      [{ text: "Connect Google", url: link }],
    ]);
    return;
  }
  await sendToOwner(mikiMessage("Not yet", ["I understand /pending, /connect_google and /help for now. Plain-English instructions arrive in the next update."]));
}
