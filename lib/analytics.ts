"use client";

import posthog from "posthog-js";

/**
 * Product analytics event contract.
 * Never send conversation content, form contents, or email addresses.
 */

type Events = {
  twin_question: { entry: "hero" | "assistant" | "ask" | "palette"; context: string; turn: number };
  twin_answered: { ms: number };
  twin_error: { code: string };
  twin_reset: Record<string, never>;
  case_study_view: { slug: string };
  contact_submitted: { reason: string };
  contact_failed: Record<string, never>;
  cv_download: Record<string, never>;
  palette_opened: Record<string, never>;
  palette_command: { kind: "navigate" | "project" | "site" | "contact" | "profile" | "palette" | "ask" };
  outbound_click: { target: string };
};

const configured = process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function track<E extends keyof Events>(event: E, props?: Events[E]) {
  if (!configured || typeof window === "undefined") return;
  posthog.capture(event, props);
}
