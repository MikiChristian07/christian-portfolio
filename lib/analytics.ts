"use client";

/**
 * Privacy-first product analytics (PostHog, EU region).
 * - Off entirely unless NEXT_PUBLIC_POSTHOG_KEY is set.
 * - Cookieless: no cookies, no local or session storage; PostHog hashes
 *   visitors server-side. No cookie banner needed.
 * - No autocapture, no session recording, no person profiles, no heatmaps.
 * - Never send conversation content, form contents or email addresses.
 *   Events carry only the small, fixed properties below.
 * - Loaded after the page is idle, so it never competes with first paint.
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

type PostHogLike = { capture: (event: string, props?: object) => void };

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let client: PostHogLike | null = null;
let loading: Promise<PostHogLike | null> | null = null;
const queue: [string, object | undefined][] = [];

function load() {
  if (!key || typeof window === "undefined") return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host,
      cookieless_mode: "always",
      person_profiles: "never",
      autocapture: false,
      rageclick: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_pageview: "history_change",
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      save_campaign_params: true,
      save_referrer: true,
      respect_dnt: true,
    });
    client = posthog;
    for (const [event, props] of queue.splice(0)) posthog.capture(event, props);
    return posthog;
  });
  return loading;
}

/** Start analytics once the browser is idle. Safe to call repeatedly. */
export function initAnalytics() {
  if (!key || typeof window === "undefined") return;
  const start = () => void load();
  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 2000);
}

export function track<E extends keyof Events>(event: E, props?: Events[E]) {
  if (!key || typeof window === "undefined") return;
  if (client) client.capture(event, props);
  else queue.push([event, props]);
}
