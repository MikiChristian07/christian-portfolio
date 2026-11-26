import "server-only";
import { z } from "zod";
import { keys, redis } from "./store";

/**
 * Booking and notification settings. Defaults approved in the V2 plan; Christian can change
 * them from Telegram. Stored as one JSON document in Redis and validated on every read.
 */
export const settingsSchema = z.object({
  timeZone: z.literal("Europe/London"),
  /** ISO weekday numbers: 1 = Monday … 7 = Sunday. */
  workingDays: z.array(z.number().int().min(1).max(7)).min(1),
  /** Minutes after midnight, owner's time zone. */
  dayStart: z.number().int().min(0).max(24 * 60),
  dayEnd: z.number().int().min(0).max(24 * 60),
  durations: z.array(z.union([z.literal(30), z.literal(60)])).min(1),
  bufferMinutes: z.number().int().min(0).max(120),
  minNoticeHours: z.number().int().min(0).max(24 * 14),
  horizonDays: z.number().int().min(1).max(90),
  /** Slot start granularity in minutes. */
  stepMinutes: z.number().int().min(15).max(60),
  bookingsEnabled: z.boolean(),
  /** ISO timestamp; bookings stay off until then. */
  bookingsPausedUntil: z.string().nullable(),
  visitorThresholds: z.array(z.number().int().min(1).max(100000)).min(1),
});

export type BookingSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: BookingSettings = {
  timeZone: "Europe/London",
  workingDays: [1, 2, 3, 4, 5],
  dayStart: 10 * 60,
  dayEnd: 17 * 60,
  durations: [30, 60],
  bufferMinutes: 15,
  minNoticeHours: 24,
  horizonDays: 21,
  stepMinutes: 30,
  bookingsEnabled: true,
  bookingsPausedUntil: null,
  visitorThresholds: [5],
};

export async function getSettings(): Promise<BookingSettings> {
  if (!redis) return defaultSettings;
  const raw = await redis.get<unknown>(keys.settings);
  const merged = { ...defaultSettings, ...(raw && typeof raw === "object" ? raw : {}) };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSettings;
}

export async function updateSettings(patch: Partial<BookingSettings>): Promise<BookingSettings> {
  const next = settingsSchema.parse({ ...(await getSettings()), ...patch });
  if (next.dayEnd <= next.dayStart) throw new Error("Working day must end after it starts");
  if (redis) await redis.set(keys.settings, next);
  return next;
}

export function bookingsOpen(s: BookingSettings, now = new Date()) {
  if (!s.bookingsEnabled) return false;
  if (s.bookingsPausedUntil && new Date(s.bookingsPausedUntil) > now) return false;
  return true;
}
