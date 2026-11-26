import { NextResponse } from "next/server";
import { consumeNonce, verify } from "@/lib/miki/crypto";
import { exchangeCode } from "@/lib/miki/google";
import { audit } from "@/lib/miki/store";
import { mikiMessage, sendToOwner } from "@/lib/miki/telegram";

export const runtime = "nodejs";

function page(title: string, body: string, status = 200) {
  // A tiny standalone confirmation (not a site page), in the site's night palette.
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1424;color:#ede6d6;font:17px/1.6 system-ui,sans-serif">
<main style="max-width:34rem;padding:2rem"><h1 style="font-size:1.75rem;margin:0 0 .75rem">${title}</h1><p style="color:#ada79a;margin:0">${body}</p></main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Step 2: Google redirects here. The signed one-time `state` proves the flow began from Miki's link. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = verify(url.searchParams.get("state") ?? "", "google-state");
  if (!state || !(await consumeNonce(state.nonce, 3600))) {
    await audit({ actor: "system", action: "google.connect", result: "error", detail: "bad state" });
    return page("Link expired", "Start again from the link Miki sent you.", 403);
  }
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code) {
    await audit({ actor: "owner", action: "google.connect", result: "error", detail: error ?? "no code" });
    return page("Not connected", "Google access was not granted. You can try again from Miki's link.", 400);
  }
  try {
    const { missing } = await exchangeCode(url.origin, code);
    await audit({ actor: "owner", action: "google.connect", result: "ok", detail: missing.length ? `missing: ${missing.join(" ")}` : "all scopes" });
    await sendToOwner(
      mikiMessage("Google connected", [
        "Calendar, Meet and Gmail are connected.",
        missing.length ? `⚠️ Not granted: ${missing.map((s) => s.split("/").pop()).join(", ")}. Reconnect and tick every box.` : "All permissions granted.",
      ]),
    );
    return page("Google connected", missing.length ? "Connected, but some permissions were not granted. Check Telegram." : "Miki can now check your availability and book approved meetings. You can close this tab.");
  } catch (err) {
    await audit({ actor: "owner", action: "google.connect", result: "error", detail: err instanceof Error ? err.message : "unknown" });
    return page("Something went wrong", "The connection could not be completed. Ask Miki for a new link and try again.", 500);
  }
}
