import "server-only";

/**
 * Outbound Telegram messages to the owner (Christian) only.
 * Phase 1: notifications. Phase 3 adds the webhook, buttons and commands.
 */
// Placeholder values in .env files ("PASTE_…") count as not configured.
const real = (v: string | undefined) => (v && !v.startsWith("PASTE_") ? v : undefined);
const token = real(process.env.TELEGRAM_BOT_TOKEN);
const ownerChat = real(process.env.OWNER_TELEGRAM_CHAT_ID);

export const telegramConfigured = Boolean(token && ownerChat);

/** Escape text for Telegram's HTML parse mode. Use on anything a visitor wrote. */
export function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };

/**
 * Send an HTML message to the owner's chat. Returns the Telegram message id,
 * or null when Telegram isn't configured or the call failed (logged).
 */
export async function sendToOwner(html: string, buttons?: InlineButton[][]): Promise<number | null> {
  if (!token || !ownerChat) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ownerChat,
        text: html.slice(0, 4000),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; result?: { message_id: number }; description?: string } | null;
    if (!res.ok || !body?.ok) {
      console.error("[miki] Telegram send failed", res.status, body?.description);
      return null;
    }
    return body.result?.message_id ?? null;
  } catch (err) {
    console.error("[miki] Telegram send error", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Every Miki notification shares this header so they're recognisable at a glance. */
export function mikiMessage(title: string, lines: string[]) {
  return [`<b>Miki — ${esc(title)}</b>`, "", ...lines].join("\n");
}
