import { z } from "zod";

/** Shared by the route (validation) and the client (types). */
export const LIMITS = {
  maxMessages: 24,
  maxUserChars: 1000,
  maxAssistantChars: 4000,
} as const;

const message = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().trim().min(1).max(LIMITS.maxUserChars) }),
  z.object({ role: z.literal("assistant"), content: z.string().max(LIMITS.maxAssistantChars) }),
]);

export const twinRequest = z.object({
  conversationId: z.uuid(),
  messages: z
    .array(message)
    .min(1)
    .max(LIMITS.maxMessages)
    .refine((m) => m.at(-1)?.role === "user", "The last message must be from the user"),
  context: z.string().max(80).optional(),
});

export type TwinRequest = z.infer<typeof twinRequest>;
export type TwinMessage = TwinRequest["messages"][number];

/** Newline-delimited JSON events streamed back to the client. */
export type TwinEvent = { t: "delta"; v: string } | { t: "done" } | { t: "error"; code: TwinErrorCode; message: string };
export type TwinErrorCode = "rate_limited" | "invalid" | "unavailable" | "timeout";
