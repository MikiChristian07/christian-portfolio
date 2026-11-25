"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTwin } from "./twin-provider";
import { Composer, Suggestions, Thread } from "./conversation";
import { Glyph } from "@/components/glyph";

/** The assistant's panel. Loaded on first open, with its animation library. */
export default function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { panelOpen, closePanel, messages } = useTwin();
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {panelOpen ? (
        <motion.div
                      key="panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="assistant-title"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px) scale(0.98)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px) scale(1)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px) scale(0.98)" }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          style={{ transformOrigin: "bottom right" }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[14px] border border-rule-strong bg-ground sm:inset-x-auto sm:right-6 sm:bottom-24 sm:max-h-[min(42rem,calc(100dvh-8rem))] sm:w-[26rem] sm:rounded-[14px]"
        >
          <header className="flex items-center gap-3 border-b border-rule px-5 py-3.5">
            <span className="text-accent">
              <Glyph id="twin" size={24} />
            </span>
            <h2 id="assistant-title" className="font-display text-lg">
              Ask Miki
            </h2>
            <Link href="/ask" onClick={closePanel} className="link ml-auto text-sm">
              Full screen
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="press min-h-11 min-w-11 text-sm text-ink-muted"
              aria-label="Close Miki"
            >
              Close
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            {messages.length === 0 ? (
              <p className="mb-5 text-ink-muted">
                Ask Miki about my roles, projects or how I&apos;d approach yours. It knows which page you&apos;re on.
              </p>
            ) : null}
            <Thread compact />
            <Suggestions limit={4} />
          </div>
          <div className="border-t border-rule px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Composer autoFocus />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
