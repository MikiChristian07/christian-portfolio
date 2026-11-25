import "server-only";
import { z } from "zod";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

/**
 * The Render twin's two tools, unchanged in purpose: both notify Christian
 * through Pushover. Arguments come from the model, so they are validated
 * before anything is sent, and each conversation gets a small budget.
 */

export const tools: ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "record_user_details",
      description:
        "Use this tool to record that a user is interested in being in touch and provided an email address, after they agreed to it being sent to Christian",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "The email address of this user" },
          name: { type: "string", description: "The user's name, if they provided it, otherwise an empty string" },
          notes: {
            type: "string",
            description: "Any additional info about the conversation that's worth recording to give context",
          },
        },
        required: ["email", "name", "notes"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_unknown_question",
      description: "Always use this tool to record any question that couldn't be answered as you didn't know the answer",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question that couldn't be answered" },
        },
        required: ["question"],
        additionalProperties: false,
      },
    },
  },
];

const userDetails = z.object({
  email: z.email().max(200),
  name: z.string().max(120),
  notes: z.string().max(1000),
});
const unknownQuestion = z.object({ question: z.string().min(1).max(500) });

async function push(message: string) {
  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;
  if (!token || !user) {
    console.warn("[twin] Pushover not configured; notification skipped");
    return;
  }
  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    body: new URLSearchParams({ token, user, message: message.slice(0, 1000) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) console.warn("[twin] Pushover returned", res.status);
}

/** Per-request budget: at most one contact record and two unknown questions per call. */
export function createToolRunner() {
  const used = { record_user_details: 0, record_unknown_question: 0 };
  const limits = { record_user_details: 1, record_unknown_question: 2 };

  return async function run(name: string, rawArgs: string): Promise<string> {
    if (name !== "record_user_details" && name !== "record_unknown_question") return "Unknown tool";
    if (used[name] >= limits[name]) return "Already recorded for this conversation.";
    let args: unknown;
    try {
      args = JSON.parse(rawArgs);
    } catch {
      return "Invalid arguments";
    }
    if (name === "record_user_details") {
      const parsed = userDetails.safeParse(args);
      if (!parsed.success) return "That doesn't look like a valid email address. Ask the user to check it.";
      used[name]++;
      const { email, name: who, notes } = parsed.data;
      await push(`Recording interest from ${who || "Name not provided"} with email ${email} and notes ${notes || "not provided"}`);
      return "OK";
    }
    const parsed = unknownQuestion.safeParse(args);
    if (!parsed.success) return "Invalid arguments";
    used[name]++;
    await push(`Recording ${parsed.data.question} asked that I couldn't answer`);
    return "OK";
  };
}
