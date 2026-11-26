import { NextResponse } from "next/server";
import { consumeNonce, sign, verify } from "@/lib/miki/crypto";
import { authUrl, googleConfigured } from "@/lib/miki/google";
import { audit } from "@/lib/miki/store";

export const runtime = "nodejs";

/**
 * Step 1 of connecting Christian's Google account. Only reachable with a signed,
 * single-use, 15-minute link that Miki gives the owner (Telegram /connect_google).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const ok = verify(token, "google-connect");
  if (!ok || !(await consumeNonce(ok.nonce, 3600))) {
    await audit({ actor: "system", action: "google.connect.start", result: "error", detail: "invalid or reused link" });
    return new NextResponse("This link is invalid, expired or already used. Ask Miki for a new one.", { status: 403 });
  }
  if (!googleConfigured()) return new NextResponse("Google OAuth is not configured on this deployment.", { status: 503 });
  const state = sign("google-state", {}, 15 * 60);
  return NextResponse.redirect(authUrl(url.origin, state), 302);
}
