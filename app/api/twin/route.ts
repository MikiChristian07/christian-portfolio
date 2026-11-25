import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { twinRequest, type TwinEvent } from "@/lib/twin/schema";
import { systemPrompt } from "@/lib/twin/prompt";
import { createToolRunner, tools } from "@/lib/twin/tools";
import { checkLimits } from "@/lib/twin/rate-limit";
import { describeContext } from "@/lib/twin/context";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const MAX_TOOL_ROUNDS = 3;

const json = (status: number, body: TwinEvent) =>
  new Response(JSON.stringify(body) + "\n", { status, headers: { "Content-Type": "application/x-ndjson" } });

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: Request) {
  // Only this website may call the twin.
  if (!sameOrigin(req)) return json(403, { t: "error", code: "invalid", message: "Requests must come from this website." });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 64_000) return json(413, { t: "error", code: "invalid", message: "That conversation is too long. Start a new one." });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { t: "error", code: "invalid", message: "The request couldn't be read." });
  }
  const parsed = twinRequest.safeParse(body);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.code === "too_big");
    return json(400, {
      t: "error",
      code: "invalid",
      message: tooLong
        ? "That message is too long. Keep questions under 1,000 characters, or start a new conversation."
        : "That message couldn't be sent. Reload the page and try again.",
    });
  }

  const limit = await checkLimits(clientIp(req));
  if (!limit.ok) {
    const message =
      limit.reason === "visitor"
        ? "You've asked a lot of questions in a short time. Wait a few minutes, or use the contact form."
        : limit.reason === "daily"
          ? "The twin has reached today's limit. Everything it knows is on this page, or you can use the contact form."
          : "The twin is paused right now. Everything it knows is on this page, or you can use the contact form.";
    return json(limit.reason === "visitor" ? 429 : 503, { t: "error", code: limit.reason === "unavailable" ? "unavailable" : "rate_limited", message });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(503, { t: "error", code: "unavailable", message: "The twin isn't connected right now. Everything it knows is on this page." });
  }

  const openai = new OpenAI({ timeout: 45_000, maxRetries: 1 });
  const runTool = createToolRunner();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(describeContext(parsed.data.context)) },
    ...parsed.data.messages,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: TwinEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const completion = await openai.chat.completions.create(
            { model: MODEL, messages, tools, stream: true },
            { signal: req.signal },
          );
          const calls: { id: string; name: string; args: string }[] = [];
          let finish: string | null = null;
          for await (const chunk of completion) {
            const choice = chunk.choices[0];
            if (!choice) continue;
            if (choice.delta.content) send({ t: "delta", v: choice.delta.content });
            for (const tc of choice.delta.tool_calls ?? []) {
              const slot = (calls[tc.index] ??= { id: "", name: "", args: "" });
              if (tc.id) slot.id = tc.id;
              if (tc.function?.name) slot.name += tc.function.name;
              if (tc.function?.arguments) slot.args += tc.function.arguments;
            }
            if (choice.finish_reason) finish = choice.finish_reason;
          }
          if (finish !== "tool_calls" || calls.length === 0) break;
          if (round === MAX_TOOL_ROUNDS) break;
          messages.push({
            role: "assistant",
            tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })),
          });
          for (const c of calls) {
            messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(await runTool(c.name, c.args)) });
          }
        }
        send({ t: "done" });
      } catch (err) {
        if (req.signal.aborted) return;
        const timeout = err instanceof Error && /timed? ?out/i.test(err.message);
        console.error("[twin] completion failed", err instanceof Error ? err.message : err);
        send({
          t: "error",
          code: timeout ? "timeout" : "unavailable",
          message: timeout
            ? "The twin took too long to answer. Try again."
            : "The twin couldn't answer just now. Try again, or find the answer on this page.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by an aborted request */
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
