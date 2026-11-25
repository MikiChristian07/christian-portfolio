"use client";

import { useEffect, useRef } from "react";
import { useTwin } from "./twin-provider";
import { Composer, Suggestions, Thread } from "./conversation";
import { Glyph } from "@/components/glyph";

/** /ask: the conversation at full width. A ?q= question (from the no-JS hero form or a shared link) is asked once. */
export function AskExperience({ initialQuestion }: { initialQuestion: string }) {
  const { send, messages, ready } = useTwin();
  const asked = useRef(false);

  useEffect(() => {
    if (!ready || asked.current || !initialQuestion) return;
    asked.current = true;
    // Don't re-ask on reload if it's already the latest question in this tab's conversation.
    const lastUser = messages.findLast((m) => m.role === "user");
    if (lastUser?.content !== initialQuestion) send(initialQuestion);
    window.history.replaceState(null, "", "/ask");
  }, [ready, initialQuestion, messages, send]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-5">
      <div className="flex-1 pt-14 pb-8">
        {messages.length === 0 ? (
          <div className="mb-10">
            <span className="text-accent">
              <Glyph id="twin" size={56} />
            </span>
            <h1 className="mt-6 font-display text-4xl">Ask Miki</h1>
            <p className="mt-4 max-w-[52ch] text-lg text-ink-muted">
              Miki is my personal AI assistant. It answers from my real record: roles, projects, how I work. When it doesn&apos;t
              know, it says so and passes the question to me.
            </p>
            <div className="mt-8">
              <Suggestions limit={6} />
            </div>
          </div>
        ) : (
          <h1 className="sr-only">Ask Miki</h1>
        )}
        <Thread />
      </div>
      <div className="sticky bottom-0 bg-ground pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Composer autoFocus={!initialQuestion} placeholder="Ask about my roles, projects or how I'd build yours" />
      </div>
    </div>
  );
}
