"use client";

import Link from "next/link";
import { useState } from "react";
import { suggestedQuestions } from "@/content/twin";
import { useTwin } from "./twin-provider";
import { Thread } from "./conversation";

/**
 * Homepage entry point. Without JavaScript it is a plain GET form to /ask;
 * with it, the answer streams in right here, in the same conversation the
 * assistant and /ask show.
 */
export function HeroAsk() {
  const { send, status, messages, openPanel } = useTwin();
  const [text, setText] = useState("");
  const streaming = status === "streaming";

  function ask(q: string) {
    if (!q.trim() || streaming) return;
    send(q);
    setText("");
  }

  return (
    <div>
      <form
        action="/ask"
        method="get"
        role="search"
        aria-label="Ask Christian's digital twin"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <label htmlFor="hero-q" className="sr-only">
          Ask my twin a question
        </label>
        <div className="flex items-center gap-3 rounded-[10px] border border-rule-strong bg-ink/[0.04] py-2 pr-2 pl-5 backdrop-blur-sm focus-within:border-accent">
          <input
            id="hero-q"
            name="q"
            maxLength={1000}
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask my twin a question"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-muted"
          />
          <button type="submit" disabled={streaming} className="press min-h-11 rounded-[7px] bg-ink px-5 font-medium text-ground disabled:opacity-60">
            Ask
          </button>
        </div>
      </form>

      {messages.length === 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Suggested questions">
          {suggestedQuestions.slice(0, 3).map((q) => (
            <li key={q}>
              <Link
                href={{ pathname: "/ask", query: { q } }}
                onClick={(e) => {
                  e.preventDefault();
                  ask(q);
                }}
                className="text-ink-muted underline decoration-rule-strong underline-offset-4 hover:text-ink"
              >
                {q}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {messages.length === 0 ? (
        <p className="mt-5 flex items-center gap-2.5 text-sm text-ink-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
          An AI twin of me. It answers from my real record and says when it doesn&apos;t know.
        </p>
      ) : (
        <div className="mt-6 border-t border-rule pt-6">
          {/* Show the latest exchange here; the full history lives in the panel and /ask. */}
          <div className="max-h-[22rem] overflow-y-auto overscroll-contain pr-2">
            <Thread compact />
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <button type="button" onClick={() => openPanel()} className="link min-h-8">
              Keep talking while you browse
            </button>
            <Link href="/ask" className="link min-h-8">
              Open full screen
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
