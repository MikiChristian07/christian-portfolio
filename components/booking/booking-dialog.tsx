"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { Glyph } from "@/components/glyph";

/**
 * Book a call: pick a time → details → email code → confirm → sent.
 * Native <dialog> (modal): focus is trapped and Escape closes. Built only from existing
 * tokens and patterns (panel radius, hairlines, press, link, field styles).
 * Times are shown in the visitor's own time zone; the server works in UTC.
 */
type Step = "time" | "details" | "code" | "confirm" | "done";
type Slots = { durations: number[]; slots: string[] };

const visitorTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
const dayKey = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
const dayLabel = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
const timeLabel = (iso: string, tz: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
const fullLabel = (iso: string, tz: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(body.message ?? "Something went wrong. Please try again.");
  return body;
}

const field = "mt-2 block w-full rounded-[10px] border border-rule-strong bg-transparent px-4 py-3 outline-none focus:border-accent";

export default function BookingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tz] = useState(visitorTz);
  const [step, setStep] = useState<Step>("time");
  const [duration, setDuration] = useState<30 | 60>(30);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", email: "", company: "", purpose: "" });
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [idem, setIdem] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Focus the dialog itself (announced by its title), not the first button.
      d.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // Load open times when the dialog opens or the call length changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    call<Slots>(`/api/booking/slots?duration=${duration}`)
      .then((s) => {
        if (cancelled) return;
        setSlots(s);
        setLoadError(null);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [open, duration]);

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots?.slots ?? []) {
      const k = dayKey(s, tz);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots, tz]);
  const activeDay = day && days.some(([k]) => k === day) ? day : (days[0]?.[0] ?? null);
  const dayTimes = days.find(([k]) => k === activeDay)?.[1] ?? [];

  function reset() {
    setStep("time");
    setStart(null);
    setCode("");
    setToken(null);
    setError(null);
    setAlternatives([]);
    setIdem(crypto.randomUUID());
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await call("/api/booking/code", { method: "POST", body: JSON.stringify({ email: details.email }) });
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function checkCode() {
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ verifiedToken: string }>("/api/booking/verify", { method: "POST", body: JSON.stringify({ email: details.email, code }) });
      setToken(r.verifiedToken);
      setStep("confirm");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!start || !token) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ status: "pending" | "unavailable"; alternatives?: string[] }>("/api/booking/request", {
        method: "POST",
        body: JSON.stringify({
          name: details.name,
          email: details.email,
          company: details.company || null,
          purpose: details.purpose,
          start,
          durationMin: duration,
          visitorTimeZone: tz,
          verifiedToken: token,
          idempotencyKey: idem,
        }),
      });
      track("booking_submitted", { duration, result: r.status });
      if (r.status === "pending") setStep("done");
      else {
        setAlternatives(r.alternatives ?? []);
        setError("That time has just been taken. Here are the nearest free times:");
        setIdem(crypto.randomUUID());
      }
    } catch (e) {
      track("booking_submitted", { duration, result: "error" });
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const stepNumber = { time: 1, details: 2, code: 3, confirm: 4, done: 4 }[step];

  return (
    <dialog
      ref={ref}
      onClose={() => {
        onClose();
        if (step === "done") reset();
      }}
      aria-labelledby="booking-title"
      tabIndex={-1}
      className="m-auto outline-none w-[min(36rem,calc(100vw-1.5rem))] max-h-[min(44rem,calc(100dvh-2rem))] overflow-hidden rounded-[14px] border border-rule-strong bg-ground p-0 text-ink backdrop:bg-[rgb(6_9_18/0.55)]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-center gap-3 border-b border-rule px-5 py-3.5">
          <span className="text-accent">
            <Glyph id="twin" size={24} />
          </span>
          <h2 id="booking-title" className="font-display text-lg">
            Book a call with Christian
          </h2>
          {step !== "done" ? <span className="ml-auto hidden text-xs text-ink-muted tabular-nums sm:inline">Step {stepNumber} of 4</span> : null}
          <button type="button" onClick={() => ref.current?.close()} className="press ml-auto min-h-11 min-w-11 text-sm text-ink-muted sm:ml-0" aria-label="Close booking">
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
          {step === "time" ? (
            <div>
              <fieldset>
                <legend className="text-sm text-ink-muted">Call length</legend>
                <div className="mt-2 flex gap-2">
                  {([30, 60] as const)
                    .filter((d) => !slots || slots.durations.includes(d))
                    .map((d) => (
                      <label key={d} className="press cursor-pointer rounded-full border border-rule-strong px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-selected">
                        <input type="radio" name="duration" className="sr-only" checked={duration === d} onChange={() => { setDuration(d); setStart(null); }} />
                        {d} minutes
                      </label>
                    ))}
                </div>
              </fieldset>

              {loadError ? (
                <div className="mt-6 rounded-[10px] border border-rule-strong px-4 py-3">
                  <p>{loadError}</p>
                  <p className="mt-2 text-sm">
                    <Link href="/#contact" className="link" onClick={() => ref.current?.close()}>
                      Use the contact form
                    </Link>
                  </p>
                </div>
              ) : !slots ? (
                <p className="mt-6 text-ink-muted">Checking Christian&apos;s calendar…</p>
              ) : days.length === 0 ? (
                <p className="mt-6 text-ink-muted">No open times in the next few weeks. Please use the contact form instead.</p>
              ) : (
                <>
                  <p className="mt-6 text-sm text-ink-muted">Times shown in your time zone ({tz}).</p>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Day">
                    {days.map(([k, list]) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={k === activeDay}
                        onClick={() => { setDay(k); setStart(null); }}
                        className={`press shrink-0 rounded-[10px] border px-3 py-2 text-sm ${k === activeDay ? "border-accent bg-selected text-ink" : "border-rule-strong text-ink-muted"}`}
                      >
                        {dayLabel(list[0]!, tz)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time">
                    {dayTimes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={s === start}
                        onClick={() => setStart(s)}
                        className={`press min-h-11 rounded-[7px] border text-sm tabular-nums ${s === start ? "border-accent bg-selected text-ink" : "border-rule-strong text-ink-muted"}`}
                      >
                        {timeLabel(s, tz)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {step === "details" ? (
            <form
              id="booking-details"
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
              className="space-y-5"
            >
              <p className="text-ink-muted">{start ? `${fullLabel(start, tz)} · ${duration} minutes` : null}</p>
              <label className="block">
                <span className="text-sm">Your name</span>
                <input required maxLength={120} autoComplete="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} className={field} />
              </label>
              <label className="block">
                <span className="text-sm">Email</span>
                <input required type="email" maxLength={200} autoComplete="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} className={field} />
              </label>
              <label className="block">
                <span className="text-sm">
                  Company <span className="text-ink-muted">(optional)</span>
                </span>
                <input maxLength={120} autoComplete="organization" value={details.company} onChange={(e) => setDetails({ ...details, company: e.target.value })} className={field} />
              </label>
              <label className="block">
                <span className="text-sm">What would you like to talk about?</span>
                <textarea required minLength={3} maxLength={1000} rows={4} value={details.purpose} onChange={(e) => setDetails({ ...details, purpose: e.target.value })} className={field} />
              </label>
              <p className="text-xs text-ink-muted">
                Your details are used only to arrange this call and are kept for 90 days after it.{" "}
                <Link href="/privacy" className="link" target="_blank">
                  Privacy
                </Link>
              </p>
            </form>
          ) : null}

          {step === "code" ? (
            <form
              id="booking-code"
              onSubmit={(e) => {
                e.preventDefault();
                void checkCode();
              }}
            >
              <p>
                We&apos;ve emailed a 6-digit code to <span className="text-ink">{details.email}</span>. Enter it to confirm the address is
                yours.
              </p>
              <label className="mt-5 block">
                <span className="text-sm">Code</span>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${field} max-w-[12rem] text-xl tracking-[0.3em] tabular-nums`}
                />
              </label>
              <button type="button" onClick={() => void sendCode()} disabled={busy} className="link mt-3 min-h-8 text-sm">
                Send a new code
              </button>
            </form>
          ) : null}

          {step === "confirm" && start ? (
            <div>
              <p className="text-ink-muted">Please check, then send your request. Christian will confirm by email.</p>
              <dl className="mt-5 divide-y divide-rule border-y border-rule">
                {[
                  ["When", `${fullLabel(start, tz)} (${tz})`],
                  ["Length", `${duration} minutes, on Google Meet`],
                  ["Name", details.name],
                  ["Email", details.email],
                  ...(details.company ? [["Company", details.company]] : []),
                  ["About", details.purpose],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 py-3 text-sm">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {alternatives.length ? (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Free alternatives">
                  {alternatives.map((a) => (
                    <li key={a}>
                      <button
                        type="button"
                        onClick={() => { setStart(a); setAlternatives([]); setError(null); }}
                        className="press min-h-11 rounded-[7px] border border-rule-strong px-3 text-sm"
                      >
                        {fullLabel(a, tz)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === "done" ? (
            <div role="status">
              <p className="font-display text-2xl">Request sent.</p>
              <p className="mt-3 text-ink-muted">
                Christian will review it and reply by email. If he accepts, you&apos;ll get a calendar invitation with a Google Meet
                link.
              </p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-5 flex gap-2.5 text-sm">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center gap-3 border-t border-rule px-5 py-3">
          {step === "details" || step === "code" || step === "confirm" ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep(step === "details" ? "time" : step === "code" ? "details" : "details"); }}
              className="link min-h-11 text-sm"
            >
              Back
            </button>
          ) : null}
          <div className="ml-auto">
            {step === "time" ? (
              <button type="button" disabled={!start} onClick={() => setStep("details")} className="press min-h-11 rounded-[7px] bg-ink px-5 font-medium text-ground disabled:opacity-40">
                Continue
              </button>
            ) : step === "details" ? (
              <button type="submit" form="booking-details" disabled={busy} className="press min-h-11 rounded-[7px] bg-ink px-5 font-medium text-ground disabled:opacity-40">
                {busy ? "Sending code…" : "Email me a code"}
              </button>
            ) : step === "code" ? (
              <button type="submit" form="booking-code" disabled={busy || code.length !== 6} className="press min-h-11 rounded-[7px] bg-ink px-5 font-medium text-ground disabled:opacity-40">
                {busy ? "Checking…" : "Verify"}
              </button>
            ) : step === "confirm" ? (
              <button type="button" onClick={() => void submit()} disabled={busy} className="press min-h-11 rounded-[7px] bg-ink px-5 font-medium text-ground disabled:opacity-40">
                {busy ? "Sending…" : "Send request"}
              </button>
            ) : (
              <button type="button" onClick={() => ref.current?.close()} className="press min-h-11 rounded-[7px] bg-ink px-5 font-medium text-ground">
                Done
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
