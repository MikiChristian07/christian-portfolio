import "server-only";

/**
 * Outbound Telegram messages to the owner (Christian) only.
 * Phase 1: notifications. Phase 3 adds the webhook, buttons and commands.
 */
// Placeholder values in .env files ("PASTE_…") count as not configured.
const real = (v: string | undefined) => (v && !v.startsWith("PASTE_") ? v : undefined);
const token = real(process.env.TELEGRAM_BOT_TOKEN);
const ownerChat = real(process.env.OWNER_TELEGRAM_CHAT_ID);
// Overridable only so tests can route through a recording proxy; defaults to Telegram.
const apiBase = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

export const telegramConfigured = Boolean(token && ownerChat);

/** Escape text for Telegram's HTML parse mode. Use on anything a visitor wrote. */
export function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Anything a visitor (or an incoming email) wrote. Escaped AND wrapped in <code>, because
 * Telegram auto-links bare URLs and emails in normal text: a visitor writing
 * "verify at https://evil.example" must not arrive as a tappable link from Miki.
 * Code spans are never auto-linked, are visibly marked as quoted input, and tap-to-copy.
 */
export function untrusted(text: string, max = 500) {
  const trimmed = text.length > max ? `${text.slice(0, max)}…` : text;
  return `<code>${esc(trimmed)}</code>`;
}

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };

/**
 * Send an HTML message to the owner's chat. Returns the Telegram message id,
 * or null when Telegram isn't configured or the call failed (logged).
 */
export async function sendToOwner(html: string, buttons?: InlineButton[][]): Promise<number | null> {
  if (!token || !ownerChat) return null;
  try {
    const res = await fetch(`${apiBase}/bot${token}/sendMessage`, {
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

/** Low-level Bot API call (owner chat operations: answer button taps, edit cards). */
export async function tgApi(method: string, payload: Record<string, unknown>) {
  if (!token) return null;
  try {
    const res = await fetch(`${apiBase}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; description?: string; result?: unknown } | null;
    if (!body?.ok) console.error(`[miki] Telegram ${method} failed`, body?.description);
    return body;
  } catch (err) {
    console.error(`[miki] Telegram ${method} error`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Owner identity, checked in code before anything else runs. */
export function isOwner(fromId: number | undefined, chatId: number | undefined) {
  const user = real(process.env.OWNER_TELEGRAM_USER_ID);
  return Boolean(user && ownerChat && String(fromId) === user && String(chatId) === ownerChat);
}
