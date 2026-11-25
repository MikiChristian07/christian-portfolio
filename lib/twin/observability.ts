import "server-only";
import OpenAI from "openai";
import { OpenAI as PostHogOpenAI } from "@posthog/ai/openai";
import { PostHog } from "posthog-node";

/**
 * Twin cost and reliability analytics in PostHog ("LLM analytics").
 * Privacy mode is on at the client and on every call, so PostHog receives
 * only metadata: model, token counts, latency, cost, tool names, errors.
 * Never the system prompt, the visitor's messages or the twin's answers.
 * No distinct id is sent, so no person profile is ever created.
 * Off entirely unless NEXT_PUBLIC_POSTHOG_KEY is set.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function createTwinClients(apiKey: string) {
  const options = { apiKey, timeout: 45_000, maxRetries: 1 };
  if (!key) return { openai: new OpenAI(options), posthog: null, observed: false as const };
  const posthog = new PostHog(key, { host, privacyMode: true, flushAt: 20, flushInterval: 0, requestTimeout: 3_000, fetchRetryCount: 1 });
  return { openai: new PostHogOpenAI({ ...options, posthog }) as unknown as OpenAI, posthog, observed: true as const };
}

/** Extra create() params understood by the PostHog wrapper. Content stays private. */
export function monitoringParams(traceId: string, conversationId: string | undefined, context: string | undefined) {
  return {
    posthogTraceId: traceId,
    posthogPrivacyMode: true,
    posthogProperties: {
      ...(conversationId ? { $ai_session_id: conversationId } : {}),
      twin_context: context ?? "none",
    },
  };
}
