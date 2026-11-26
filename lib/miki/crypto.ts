import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { redis } from "./store";

/**
 * Secrets at rest and signed one-time links.
 * - encrypt/decrypt: AES-256-GCM with TOKEN_ENCRYPTION_KEY (32 bytes, base64), for OAuth tokens.
 * - sign/verify: HMAC-SHA256 with ACTION_SIGNING_SECRET, with expiry; `consume` makes a link single-use.
 */
function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)");
  return k;
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(sealed: string) {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised ciphertext");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

function hmac(data: string) {
  const secret = process.env.ACTION_SIGNING_SECRET;
  if (!secret) throw new Error("ACTION_SIGNING_SECRET is not set");
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** A signed, expiring token carrying a small JSON payload plus a random nonce. */
export function sign(purpose: string, payload: Record<string, unknown>, ttlSeconds: number) {
  const body = Buffer.from(
    JSON.stringify({ p: purpose, d: payload, n: randomBytes(12).toString("base64url"), e: Date.now() + ttlSeconds * 1000 }),
  ).toString("base64url");
  return `${body}.${hmac(body)}`;
}

/** Verify signature, purpose and expiry. Returns the payload and nonce, or null. */
export function verify<T extends Record<string, unknown>>(token: string, purpose: string): { data: T; nonce: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(hmac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { p: string; d: T; n: string; e: number };
    if (parsed.p !== purpose || Date.now() > parsed.e) return null;
    return { data: parsed.d, nonce: parsed.n };
  } catch {
    return null;
  }
}

/** Mark a nonce used. Returns false if it was already used (replay). */
export async function consumeNonce(nonce: string, ttlSeconds = 86400) {
  if (!redis) return true;
  return (await redis.set(`miki:nonce:${nonce}`, 1, { nx: true, ex: ttlSeconds })) === "OK";
}

/** Keyed hash for values we must compare but never store in plain form (codes, emails in keys). */
export function digest(value: string) {
  return hmac(`digest:${value}`);
}
