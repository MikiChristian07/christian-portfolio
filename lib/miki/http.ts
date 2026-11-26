import "server-only";
import { ZodError } from "zod";
import { BookingError } from "./booking";

/** Shared guards for Miki's public endpoints (same rules as /api/twin). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** Map known failures to plain messages; never leak internals. */
export function errorResponse(err: unknown) {
  if (err instanceof BookingError) {
    const status = { closed: 503, not_connected: 503, rate_limited: 429, invalid: 400, unverified: 400, outside_rules: 400, unavailable: 409 }[err.code];
    return json(status, { error: err.code, message: err.message });
  }
  if (err instanceof ZodError) return json(400, { error: "invalid", message: "Some details look wrong. Please check the form." });
  console.error("[miki] booking error", err instanceof Error ? err.message : err);
  return json(500, { error: "unavailable", message: "Booking is temporarily unavailable. Please use the contact form." });
}

export async function readJson(req: Request, maxBytes = 8_000) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new BookingError("invalid", "Request too large.");
  return req.json();
}
