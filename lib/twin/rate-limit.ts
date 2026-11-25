import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Two limits, both in Upstash so they hold across serverless instances:
 * per visitor (IP) to stop one person hammering it, and a global daily cap
 * that bounds the OpenAI bill whatever happens.
 * Fails closed in production: if Upstash is unreachable, the twin pauses
 * rather than running unmetered.
 */
const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = configured ? Redis.fromEnv() : null;

const perVisitor = redis
  ? new Ratelimit({ redis, prefix: "twin:ip", limiter: Ratelimit.slidingWindow(20, "10 m"), analytics: false })
  : null;
const daily = redis
  ? new Ratelimit({
      redis,
      prefix: "twin:day",
      limiter: Ratelimit.fixedWindow(Number(process.env.TWIN_DAILY_LIMIT ?? 400), "1 d"),
      analytics: false,
    })
  : null;

export type LimitResult = { ok: true } | { ok: false; reason: "visitor" | "daily" | "unavailable" };

export async function checkLimits(ip: string): Promise<LimitResult> {
  if (!perVisitor || !daily) {
    if (process.env.NODE_ENV === "production") return { ok: false, reason: "unavailable" };
    return { ok: true }; // local development without Upstash
  }
  try {
    const visitor = await perVisitor.limit(ip);
    if (!visitor.success) return { ok: false, reason: "visitor" };
    const day = await daily.limit("all");
    if (!day.success) return { ok: false, reason: "daily" };
    return { ok: true };
  } catch (err) {
    console.error("[twin] rate limiter error", err);
    return { ok: false, reason: "unavailable" };
  }
}
