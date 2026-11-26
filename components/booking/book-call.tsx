"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

/**
 * Opening the booking dialog from anywhere (hero, contact, Cmd+K) without a shared
 * React context: triggers dispatch one window event, a single host listens.
 * The dialog's code loads only on first open.
 */
type From = "hero" | "contact" | "palette" | "miki";
const EVENT = "miki:book";

export const loadBookingDialog = () => import("./booking-dialog");
const BookingDialog = dynamic(loadBookingDialog, { ssr: false });

export function openBooking(from: From) {
  track("booking_opened", { from });
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Mounted once in the site chrome. */
export function BookingHost() {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  useEffect(() => {
    const onOpen = () => {
      setUsed(true);
      setOpen(true);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);
  return used ? <BookingDialog open={open} onClose={() => setOpen(false)} /> : null;
}

/**
 * A link that opens the dialog. Without JavaScript it is a plain link to the contact
 * section, so it still leads somewhere useful.
 */
export function BookCallLink({ from, className, children }: { from: From; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href="/#contact"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openBooking(from);
      }}
      onPointerEnter={() => void loadBookingDialog()}
      onFocus={() => void loadBookingDialog()}
    >
      {children}
    </Link>
  );
}
