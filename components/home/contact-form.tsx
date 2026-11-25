"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const reasons = ["A product to build", "A role to fill", "Research or collaboration", "Something else"] as const;

/**
 * Same EmailJS service as the previous site, with the template leftovers
 * (to_name "JavaScript Mastery", a stranger's to_email) removed. Delivery is
 * decided by the EmailJS template's own recipient setting.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const configured = Boolean(serviceId && templateId && publicKey);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("company_site")) return; // honeypot: bots fill hidden fields
    setStatus({ kind: "sending" });
    try {
      const emailjs = (await import("@emailjs/browser")).default;
      await emailjs.send(
        serviceId!,
        templateId!,
        // Field names match EmailJS's default "Contact Us" template:
        // From Name {{name}}, Reply To {{email}}, Subject "Contact: {{title}}".
        {
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          title: String(data.get("reason") ?? ""),
          message: String(data.get("message") ?? ""),
          time: new Date().toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" }),
        },
        { publicKey: publicKey! },
      );
      track("contact_submitted", { reason: String(data.get("reason") ?? "") });
      form.reset();
      setStatus({ kind: "sent" });
    } catch {
      track("contact_failed", {});
      setStatus({
        kind: "error",
        message: "Your message wasn't sent. Check your connection and try again, or email me directly.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="border-t border-rule-strong pt-6">
        <p className="font-display text-2xl">Message sent.</p>
        <p className="mt-2 text-ink-muted">I&apos;ll reply to the email you gave.</p>
      </div>
    );
  }

  const field = "mt-2 block w-full rounded-[10px] border border-rule-strong bg-transparent px-4 py-3 outline-none focus:border-accent";

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">Name</span>
          <input name="name" required autoComplete="name" maxLength={120} className={field} />
        </label>
        <label className="block">
          <span className="text-sm">Email</span>
          <input name="email" type="email" required autoComplete="email" maxLength={200} className={field} />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm">What is it about?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {reasons.map((r, i) => (
            <label key={r} className="press cursor-pointer rounded-full border border-rule-strong px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-selected">
              <input type="radio" name="reason" value={r} defaultChecked={i === 0} className="sr-only" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm">Message</span>
        <textarea name="message" required rows={5} maxLength={4000} className={field} />
      </label>
      <label className="hidden" aria-hidden="true">
        Leave this empty
        <input name="company_site" tabIndex={-1} autoComplete="off" />
      </label>
      {!configured ? (
        <p className="text-sm text-warn">The form isn&apos;t connected yet. Please use the email link for now.</p>
      ) : null}
      {status.kind === "error" ? (
        <p role="alert" className="text-sm text-accent">
          {status.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!configured || status.kind === "sending"}
        className="press min-h-12 rounded-[7px] bg-ink px-6 font-medium text-ground disabled:opacity-50"
      >
        {status.kind === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
