"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useTwin } from "./twin-provider";
import dynamic from "next/dynamic";

// The markdown renderer is ~230 KB. It starts downloading when a question is
// sent (see TwinProvider.send), so it is ready before the answer arrives.
const TwinMarkdown = dynamic(() => import("./markdown").then((m) => m.TwinMarkdown), { ssr: false });
import { Glyph } from "@/components/glyph";
import { suggestedQuestions } from "@/content/twin";

/*
 * Shared conversation parts. Each entry point composes these differently:
 * the hero shows Thread under its own input, the assistant panel and /ask
 * stack Thread, Suggestions and Composer.
 */

export function Thread({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { messages, status, error, retry } = useTwin();
  const endRef = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [announcement, setAnnouncement] = useState("");
  const [prevStatus, setPrevStatus] = useState(status);

  // Announce once per finished answer, not on every streamed word (derived during render).
  if (prevStatus !== status) {
    setPrevStatus(status);
    if (prevStatus === "streaming" && status === "idle") setAnnouncement("Miki has answered.");
    else if (status === "error" && error) setAnnouncement(error.message);
  }

  // Follow the answer inside this thread's own scroll box only; never drag the page
  // (except on /ask, where the page is the scroll box). Stop once the latest
  // question reaches the top, so a long answer is read from its start.
  useEffect(() => {
    const end = endRef.current;
    if (!end) return;
    const behavior = reduce ? "auto" : "smooth";
    const questions = end.parentElement?.querySelectorAll<HTMLElement>("[data-role=user]");
    const lastQ = questions?.[questions.length - 1];
    let box: HTMLElement | null = end.parentElement;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (box) {
      const qTop = lastQ ? lastQ.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8 : Infinity;
      box.scrollTo({ top: Math.min(box.scrollHeight - box.clientHeight, qTop), behavior });
    } else if (window.location.pathname === "/ask") {
      const qTop = lastQ ? lastQ.getBoundingClientRect().top + window.scrollY - 80 : Infinity;
      const bottom = end.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 140;
      window.scrollTo({ top: Math.max(0, Math.min(bottom, qTop)), behavior });
    }
  }, [messages, status, reduce]);

  if (messages.length === 0 && !error) return null;
  const waiting = status === "streaming" && messages.at(-1)?.role === "assistant" && messages.at(-1)?.content === "";

  return (
    <div className={className}>
      <ol aria-label="Conversation with Miki, Christian's AI assistant" aria-busy={status === "streaming"} className={`flex flex-col ${compact ? "gap-5" : "gap-7"}`}>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <li key={i} data-role="user" className="self-end max-w-[85%] rounded-[10px] bg-ink/[0.07] px-4 py-2.5">
              <span className="sr-only">You: </span>
              {m.content}
            </li>
          ) : m.content ? (
            <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-3">
              <span aria-hidden="true" className="pt-0.5 text-accent">
                <Glyph id="twin" size={24} />
              </span>
              <div className="min-w-0 text-ink-muted [&_strong]:text-ink">
                <span className="sr-only">Miki: </span>
                <TwinMarkdown>{m.content}</TwinMarkdown>
              </div>
            </li>
          ) : null,
        )}
      </ol>
      {waiting ? <Thinking /> : null}
      {status === "error" && error ? (
        <div className="mt-5 rounded-[10px] border border-rule-strong px-4 py-3">
          <p className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{error.message}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {error.code !== "rate_limited" ? (
              <button type="button" onClick={retry} className="link press min-h-11 font-medium">
                Try again
              </button>
            ) : null}
            <Link href="/#contact" className="link min-h-11 inline-flex items-center">
              Use the contact form
            </Link>
          </div>
        </div>
      ) : null}
      <div ref={endRef} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function Thinking() {
  return (
    <p className="mt-5 grid grid-cols-[1.75rem_1fr] items-center gap-3 text-sm text-ink-muted">
      <span aria-hidden="true" className="text-accent">
        <svg viewBox="0 0 24 24" width="22" height="22" className="twin-thinking">
          <path d="M3 12c3-6 6-6 9 0s6 6 9 0" className="uli-line" />
        </svg>
      </span>
      Thinking
    </p>
  );
}

export function Suggestions({ limit = 4, onPick }: { limit?: number; onPick?: () => void }) {
  const { send, status, messages } = useTwin();
  if (messages.length > 0) return null;
  return (
    <ul aria-label="Suggested questions" className="flex flex-wrap gap-2">
      {suggestedQuestions.slice(0, limit).map((q) => (
        <li key={q}>
          <button
            type="button"
            disabled={status === "streaming"}
            onClick={() => {
              send(q);
              onPick?.();
            }}
            className="press min-h-10 rounded-lg border border-rule-strong px-3.5 py-2 text-left text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Composer({ autoFocus = false, placeholder = "Ask about my work" }: { autoFocus?: boolean; placeholder?: string }) {
  const { send, status, stop, reset, messages } = useTwin();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const streaming = status === "streaming";

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit() {
    if (!text.trim() || streaming) return;
    send(text);
    setText("");
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 rounded-[10px] border border-rule-strong bg-ground-raised p-2 focus-within:border-accent"
      >
        <label htmlFor={id} className="sr-only">
          Your question
        </label>
        <textarea
          ref={inputRef}
          id={id}
          rows={1}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-ink-muted"
        />
        {streaming ? (
          <button type="button" onClick={stop} className="press min-h-11 rounded-[7px] border border-rule-strong px-4 text-sm">
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!text.trim()} className="press min-h-11 rounded-[7px] bg-ink px-4 font-medium text-ground disabled:opacity-40">
            Ask
          </button>
        )}
      </form>
      <div className="mt-2 flex items-center justify-between gap-4 text-xs text-ink-muted">
        <p>Miki is my AI assistant: it answers from my real record and says when it doesn&apos;t know. If you share your email, it&apos;s sent to me so I can reply.</p>
        {messages.length > 0 ? (
          <button type="button" onClick={reset} className="link shrink-0 min-h-8">
            New conversation
          </button>
        ) : null}
      </div>
    </div>
  );
}
