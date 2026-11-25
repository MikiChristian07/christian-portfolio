"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TwinErrorCode, TwinEvent, TwinMessage } from "@/lib/twin/schema";
import { LIMITS } from "@/lib/twin/schema";
import { currentContextId } from "@/lib/twin/context";
import { track } from "@/lib/analytics";

/**
 * One conversation shared by the hero, the persistent assistant and /ask.
 * Kept in sessionStorage: it survives navigation and reloads in this tab,
 * and disappears when the tab closes. Nothing is stored server-side.
 */

export type Status = "idle" | "streaming" | "error";
type TwinError = { code: TwinErrorCode; message: string };

type TwinState = {
  messages: TwinMessage[];
  status: Status;
  error: TwinError | null;
  panelOpen: boolean;
  /** True once the saved conversation has been restored; send nothing before this. */
  ready: boolean;
};

type Entry = "hero" | "assistant" | "ask" | "palette";

type TwinActions = {
  send: (text: string, entry?: Entry) => void;
  retry: () => void;
  stop: () => void;
  reset: () => void;
  openPanel: (question?: string, entry?: Entry) => void;
  closePanel: () => void;
};

const TwinContext = createContext<(TwinState & TwinActions) | null>(null);

const STORAGE_KEY = "twin:conversation:v1";

type StoredConversation = { id: string; messages: TwinMessage[] };

function newConversationId() {
  return crypto.randomUUID();
}

function load(): StoredConversation {
  const id = newConversationId();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const messages = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && "messages" in parsed ? parsed.messages : [];
    if (!Array.isArray(messages)) return { id, messages: [] };
    return {
      id: parsed && typeof parsed === "object" && !Array.isArray(parsed) && "id" in parsed && typeof parsed.id === "string" ? parsed.id : id,
      messages: messages.filter(
        (m): m is TwinMessage =>
          !!m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
      ),
    };
  } catch {
    return { id, messages: [] };
  }
}

/** Keep the request inside the server's limits: drop the oldest turns first. */
function trimForRequest(messages: TwinMessage[]) {
  const out = messages.map((m) =>
    m.role === "assistant" ? { ...m, content: m.content.slice(0, LIMITS.maxAssistantChars) } : m,
  );
  while (out.length > LIMITS.maxMessages) out.shift();
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

export function TwinProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<TwinMessage[]>([]);
  const [conversationId, setConversationId] = useState(newConversationId);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<TwinError | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    // Restore after hydration so server and client first render match. sessionStorage
    // is an external, client-only store, so syncing it here is the intended exception.
    const conversation = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(conversation.messages);
    setConversationId(conversation.id);
    loaded.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!loaded.current || status === "streaming") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: conversationId, messages }));
    } catch {
      /* storage full or disabled: the conversation still works in memory */
    }
  }, [conversationId, messages, status]);

  const run = useCallback(async (history: TwinMessage[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("streaming");
    setError(null);
    setMessages([...history, { role: "assistant", content: "" }]);

    const started = performance.now();
    const fail = (e: TwinError) => {
      track("twin_error", { code: e.code });
      setError(e);
      setStatus("error");
      // Drop the empty assistant bubble; keep any partial answer so nothing visible vanishes.
      setMessages((m) => (m.at(-1)?.role === "assistant" && m.at(-1)?.content === "" ? m.slice(0, -1) : m));
    };

    const timer = setTimeout(() => controller.abort("timeout"), 60_000);
    try {
      const res = await fetch("/api/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: trimForRequest(history), context: currentContextId() }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as TwinEvent;
          if (event.t === "delta") {
            setMessages((m) => {
              const last = m.at(-1);
              if (last?.role !== "assistant") return m;
              return [...m.slice(0, -1), { role: "assistant", content: last.content + event.v }];
            });
          } else if (event.t === "error") {
            fail({ code: event.code, message: event.message });
            return;
          } else if (event.t === "done") {
            finished = true;
          }
        }
      }
      if (!finished) throw new Error("stream ended early");
      track("twin_answered", { ms: Math.round(performance.now() - started) });
      setStatus("idle");
    } catch (err) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") {
        setStatus("idle");
        return;
      }
      fail(
        controller.signal.reason === "timeout"
          ? { code: "timeout", message: "The twin took too long to answer. Try again." }
          : { code: "unavailable", message: "The twin couldn't be reached. Check your connection and try again." },
      );
      if (!(err instanceof Error)) console.error(err);
    } finally {
      clearTimeout(timer);
    }
  }, [conversationId]);

  const send = useCallback(
    (text: string, entry?: Entry) => {
      const content = text.trim().slice(0, LIMITS.maxUserChars);
      if (!content || status === "streaming") return;
      const where: Entry = entry ?? (panelOpen ? "assistant" : window.location.pathname === "/ask" ? "ask" : "hero");
      void import("./markdown"); // warm the renderer while the model thinks
      track("twin_question", { entry: where, context: currentContextId(), turn: messages.filter((m) => m.role === "user").length + 1 });
      void run([...messages, { role: "user", content }]);
    },
    [messages, run, status, panelOpen],
  );

  const retry = useCallback(() => {
    // Resend from the last user message, dropping any partial answer after it.
    const lastUser = messages.findLastIndex((m) => m.role === "user");
    if (lastUser === -1) return;
    void run(messages.slice(0, lastUser + 1));
  }, [messages, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    track("twin_reset", {});
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(newConversationId());
    setError(null);
    setStatus("idle");
  }, []);

  const openPanel = useCallback(
    (question?: string, entry: Entry = "assistant") => {
      setPanelOpen(true);
      if (question) send(question, entry);
    },
    [send],
  );
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const value = useMemo(
    () => ({ messages, status, error, panelOpen, ready, send, retry, stop, reset, openPanel, closePanel }),
    [messages, status, error, panelOpen, ready, send, retry, stop, reset, openPanel, closePanel],
  );

  return <TwinContext value={value}>{children}</TwinContext>;
}

export function useTwin() {
  const ctx = use(TwinContext);
  if (!ctx) throw new Error("useTwin must be used inside <TwinProvider>");
  return ctx;
}
