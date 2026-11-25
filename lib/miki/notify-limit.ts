import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./store";

/**
 * Global cap on visitor-triggered alerts to Christian, so no one (or no bot rotating IPs)
 * can flood his Telegram. Per-IP limits already apply to the chat itself; this caps the
 * total. Fails open: if Redis is down, the chat's own fail-closed limiter already stops traffic.
 */
const limiter = redis
  ? new Ratelimit({ redis, prefix: "miki:notify", limiter: Ratelimit.slidingWindow(Number(process.env.MIKI_NOTIFY_PER_HOUR ?? 15), "1 h"), analytics: false })
  : null;

export async function allowNotification() {
  if (!limiter) return true;
  try {
    return (await limiter.limit("visitor-alerts")).success;
  } catch {
    return true;
  }
}
