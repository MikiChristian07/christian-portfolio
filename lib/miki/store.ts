import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Miki's durable state, on the same Upstash Redis as the rate limiter.
 * Serverless functions keep nothing in memory between requests, so every
 * request, mapping, setting and approval lives here.
 */
const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
export const redis: Redis | null = configured ? Redis.fromEnv() : null;

export function requireRedis(): Redis {
  if (!redis) throw new Error("Upstash Redis is not configured");
  return redis;
}

export const keys = {
  audit: "miki:audit",
  settings: "miki:settings",
} as const;

const AUDIT_MAX = 5000;

export type AuditEntry = {
  /** Who acted: the owner (via Telegram), a visitor, or the system (jobs). */
  actor: "owner" | "visitor" | "system";
  /** What happened, e.g. "notify.contact", "meeting.approve". */
  action: string;
  /** The record it concerns, e.g. a request id. */
  subject?: string;
  result: "ok" | "error" | "skipped";
  detail?: string;
};

/**
 * Append to the audit log (newest first, capped). Never throws: an audit
 * failure must not break the action it records; it is logged instead.
 */
export async function audit(entry: AuditEntry) {
  if (!redis) return;
  try {
    const record = JSON.stringify({ at: new Date().toISOString(), ...entry, detail: entry.detail?.slice(0, 500) });
    await redis.pipeline().lpush(keys.audit, record).ltrim(keys.audit, 0, AUDIT_MAX - 1).exec();
  } catch (err) {
    console.error("[miki] audit write failed", err instanceof Error ? err.message : err);
  }
}

export async function recentAudit(limit = 20): Promise<(AuditEntry & { at: string })[]> {
  if (!redis) return [];
  const rows = await redis.lrange<string | (AuditEntry & { at: string })>(keys.audit, 0, limit - 1);
  // The REST client may already parse JSON values.
  return rows.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
