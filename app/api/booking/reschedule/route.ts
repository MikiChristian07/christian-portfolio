import { NextResponse } from "next/server";
import { confirmReschedule, formatSlot, viewReschedule } from "@/lib/miki/booking";
import { esc } from "@/lib/miki/telegram";
import { sameOrigin } from "@/lib/miki/http";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * The link in a reschedule email. GET only shows the offer with a Confirm button: email
 * security scanners open links automatically, so opening must never book anything.
 * The POST (same-origin form) books it.
 */
function page(title: string, body: string, status = 200, form?: string) {
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>${esc(title)}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1424;color:#ede6d6;font:17px/1.6 system-ui,sans-serif">
<main style="max-width:34rem;padding:2rem"><h1 style="font-size:1.75rem;margin:0 0 .75rem">${esc(title)}</h1><p style="color:#ada79a;margin:0 0 1.5rem">${body}</p>${form ?? ""}
<p style="margin:2rem 0 0;font-size:.9rem"><a href="/" style="color:#ede6d6">christianonovo.com</a></p></main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" } });
}

const tokenOf = (s: string | null) => (s && s.length < 2000 ? s : "");

export async function GET(req: Request) {
  const token = tokenOf(new URL(req.url).searchParams.get("t"));
  const view = await viewReschedule(token).catch(() => null);
  if (!view) return page("Something went wrong", "Please try again in a moment.", 500);
  if (!view.ok) return page("Link no longer valid", esc(view.message), 410);
  const when = `${formatSlot(view.start, view.req.visitorTimeZone)} (${view.req.visitorTimeZone}), ${view.durationMin} minutes`;
  if (view.done) return page("You're booked", `Your call with Christian is on ${esc(when)}. The invitation with the Google Meet link is in your inbox.`);
  const form = `<form method="post" action="/api/booking/reschedule"><input type="hidden" name="t" value="${esc(token).replace(/"/g, "&quot;")}">
<button type="submit" style="font:inherit;font-weight:600;padding:.75rem 1.25rem;border:0;background:#ede6d6;color:#0e1424;cursor:pointer">Confirm this time</button></form>`;
  return page(`New time for your call`, `Hi ${esc(view.req.name)}, Christian can do <strong style="color:#ede6d6">${esc(when)}</strong>. Confirm and you'll get a calendar invitation with a Google Meet link. If it doesn't suit you, reply to the email instead.`, 200, form);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return page("Not allowed", "Please use the link in your email.", 403);
  const form = await req.formData().catch(() => null);
  const token = tokenOf(typeof form?.get("t") === "string" ? (form.get("t") as string) : null);
  try {
    const result = await confirmReschedule(token);
    if (!result.ok) return page("Couldn't confirm", esc(result.message), 409);
    return page("You're booked", "Thank you. Google Calendar has sent you the invitation with the Google Meet link. See you then.");
  } catch (err) {
    console.error("[miki] reschedule confirm failed", err instanceof Error ? err.message : err);
    return page("Something went wrong", "Your time wasn't confirmed. Please try the link again in a few minutes, or reply to the email.", 500);
  }
}
