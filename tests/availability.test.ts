import { test } from "node:test";
import assert from "node:assert/strict";
import { availableSlots, isFree, suggestAlternatives, withinRules, zonedToUtc, type SlotRules } from "../lib/miki/availability";

const rules: SlotRules = {
  timeZone: "Europe/London",
  workingDays: [1, 2, 3, 4, 5],
  dayStart: 600,
  dayEnd: 1020,
  bufferMinutes: 15,
  minNoticeHours: 24,
  horizonDays: 21,
  stepMinutes: 30,
};
const iso = (d: Date) => d.toISOString().slice(0, 16);
const londonTime = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

test("London wall-clock to UTC across both clock changes", () => {
  assert.equal(iso(zonedToUtc(2026, 1, 12, 600, "Europe/London")), "2026-01-12T10:00"); // GMT
  assert.equal(iso(zonedToUtc(2026, 3, 30, 600, "Europe/London")), "2026-03-30T09:00"); // BST began 29 Mar
  assert.equal(iso(zonedToUtc(2026, 10, 26, 600, "Europe/London")), "2026-10-26T10:00"); // GMT again from 25 Oct
});

test("slots respect working hours, weekends and the end of day", () => {
  const now = new Date("2026-01-09T09:00:00Z"); // Friday
  const slots = availableSlots(rules, [], 60, now);
  const days = new Set(slots.map((s) => s.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short" })));
  assert.ok(!days.has("Sat") && !days.has("Sun"), "no weekend slots");
  const times = slots.map(londonTime);
  assert.ok(times.every((t) => t >= "10:00" && t <= "16:00"), "60-min calls start 10:00–16:00");
  assert.ok(times.includes("16:00") && !times.includes("16:30"), "last 60-min start is 16:00");
});

test("minimum notice of 24 hours", () => {
  const now = new Date("2026-01-12T09:00:00Z"); // Monday 09:00 London
  const first = availableSlots(rules, [], 30, now)[0]!;
  assert.equal(iso(first), "2026-01-13T10:00"); // Tuesday 10:00, not Monday
});

test("buffers keep 15 minutes around busy time", () => {
  const busy = [{ start: new Date("2026-01-14T12:00:00Z"), end: new Date("2026-01-14T13:00:00Z") }];
  assert.equal(isFree(new Date("2026-01-14T10:00:00Z"), 60, busy, 15), true); // ends 11:00
  assert.equal(isFree(new Date("2026-01-14T11:00:00Z"), 60, busy, 15), false); // runs into 11:45 buffer
  assert.equal(isFree(new Date("2026-01-14T13:00:00Z"), 30, busy, 15), false); // inside 13:15 buffer
  assert.equal(isFree(new Date("2026-01-14T13:30:00Z"), 30, busy, 15), true);
});

test("alternatives are the 3 nearest free slots, in order", () => {
  const now = new Date("2026-01-12T09:00:00Z");
  const requested = new Date("2026-01-14T12:00:00Z");
  const busy = [{ start: requested, end: new Date("2026-01-14T13:00:00Z") }];
  const alts = suggestAlternatives(rules, busy, 30, requested, 3, now);
  assert.equal(alts.length, 3);
  assert.ok(alts.every((a) => isFree(a, 30, busy, 15)));
  // 11:00 is nearest (60 min); 10:30 and 13:30 tie at 90 min; the earlier slot 11:30 is excluded by the 11:45 buffer.
  assert.deepEqual(alts.map(iso), ["2026-01-14T10:30", "2026-01-14T11:00", "2026-01-14T13:30"]);
});

test("withinRules rejects off-grid, weekend, too-soon and too-far starts", () => {
  const now = new Date("2026-01-12T09:00:00Z");
  assert.equal(withinRules(rules, new Date("2026-01-14T10:00:00Z"), 30, now), true);
  assert.equal(withinRules(rules, new Date("2026-01-14T10:15:00Z"), 30, now), false); // off the 30-min grid
  assert.equal(withinRules(rules, new Date("2026-01-17T10:00:00Z"), 30, now), false); // Saturday
  assert.equal(withinRules(rules, new Date("2026-01-12T15:00:00Z"), 30, now), false); // under 24h notice
  assert.equal(withinRules(rules, new Date("2026-02-20T10:00:00Z"), 30, now), false); // beyond 21 days
  assert.equal(withinRules(rules, new Date("2026-01-14T16:30:00Z"), 60, now), false); // would end 17:30
});
