/**
 * Pure slot maths: no I/O, so it can be tested exactly. Given busy intervals (from Google
 * FreeBusy) and the booking settings, list bookable start times and suggest alternatives.
 * All instants are UTC Date objects; working hours are interpreted in the owner's zone,
 * so daylight-saving changes are handled by the zone conversion, not by fixed offsets.
 */

export type Interval = { start: Date; end: Date };

export type SlotRules = {
  timeZone: string;
  workingDays: number[];
  dayStart: number;
  dayEnd: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  stepMinutes: number;
};

const MIN = 60_000;

/** Offset (ms) of `timeZone` from UTC at a given instant. */
function zoneOffset(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant for a wall-clock time in `timeZone` (correct across DST changes). */
export function zonedToUtc(y: number, m: number, d: number, minutes: number, timeZone: string) {
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const first = guess - zoneOffset(new Date(guess), timeZone);
  // Re-evaluate at the corrected instant in case the guess straddled a transition.
  return new Date(guess - zoneOffset(new Date(first), timeZone));
}

/** Calendar date (y, m, d) and ISO weekday of an instant in `timeZone`. */
export function zonedDate(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), weekday };
}

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

/** True when [start, start+duration) is free, counting the buffer on both sides of busy blocks. */
export function isFree(start: Date, durationMin: number, busy: Interval[], bufferMin: number) {
  const slot = { start, end: new Date(start.getTime() + durationMin * MIN) };
  return !busy.some((b) =>
    overlaps(slot, { start: new Date(b.start.getTime() - bufferMin * MIN), end: new Date(b.end.getTime() + bufferMin * MIN) }),
  );
}

/** Every bookable start within the rules' window, in time order. */
export function availableSlots(rules: SlotRules, busy: Interval[], durationMin: number, now = new Date()): Date[] {
  const earliest = new Date(now.getTime() + rules.minNoticeHours * 60 * MIN);
  const latest = new Date(now.getTime() + rules.horizonDays * 24 * 60 * MIN);
  const slots: Date[] = [];
  // Walk calendar days in the owner's zone, from today to the horizon (+1 for zone edges).
  const start = zonedDate(now, rules.timeZone);
  for (let i = 0; i <= rules.horizonDays + 1; i++) {
    const noonUtc = new Date(Date.UTC(start.y, start.m - 1, start.d + i, 12));
    const day = zonedDate(noonUtc, rules.timeZone);
    if (!rules.workingDays.includes(day.weekday)) continue;
    for (let t = rules.dayStart; t + durationMin <= rules.dayEnd; t += rules.stepMinutes) {
      const s = zonedToUtc(day.y, day.m, day.d, t, rules.timeZone);
      if (s < earliest || s > latest) continue;
      if (isFree(s, durationMin, busy, rules.bufferMinutes)) slots.push(s);
    }
  }
  return slots;
}

/** Up to `count` free slots closest in time to the requested one (it is excluded). */
export function suggestAlternatives(rules: SlotRules, busy: Interval[], durationMin: number, requested: Date, count = 3, now = new Date()) {
  return availableSlots(rules, busy, durationMin, now)
    .filter((s) => s.getTime() !== requested.getTime())
    .sort((a, b) => Math.abs(a.getTime() - requested.getTime()) - Math.abs(b.getTime() - requested.getTime()))
    .slice(0, count)
    .sort((a, b) => a.getTime() - b.getTime());
}

/** Whether a specific start obeys the rules (working hours, notice, horizon, step) before busy-checking. */
export function withinRules(rules: SlotRules, start: Date, durationMin: number, now = new Date()) {
  const day = zonedDate(start, rules.timeZone);
  if (!rules.workingDays.includes(day.weekday)) return false;
  const dayStartUtc = zonedToUtc(day.y, day.m, day.d, rules.dayStart, rules.timeZone);
  const minutesIntoDay = (start.getTime() - dayStartUtc.getTime()) / MIN + rules.dayStart;
  if (minutesIntoDay < rules.dayStart || minutesIntoDay + durationMin > rules.dayEnd) return false;
  if ((minutesIntoDay - rules.dayStart) % rules.stepMinutes !== 0) return false;
  if (start.getTime() < now.getTime() + rules.minNoticeHours * 60 * MIN) return false;
  if (start.getTime() > now.getTime() + rules.horizonDays * 24 * 60 * MIN) return false;
  return true;
}
