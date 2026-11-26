import "server-only";
import { randomBytes } from "node:crypto";
import { allowNotification } from "./notify-limit";
import { audit, redis } from "./store";
import { esc, mikiMessage, sendToOwner, telegramConfigured, untrusted } from "./telegram";

/** Professional enquiries collected by Miki: stored 90 days, sent to Christian on Telegram. */
export type Enquiry = {
  id: string;
  createdAt: string;
  kind: "project" | "recruitment" | "collaboration" | "partnership" | "other";
  name: string;
  email: string;
  organisation: string | null;
  message: string;
  telegramMessageId: number | null;
};

const KINDS: Record<Enquiry["kind"], string> = {
  project: "Project",
  recruitment: "Recruitment",
  collaboration: "Collaboration",
  partnership: "Partnership",
  other: "Enquiry",
};

export async function saveEnquiry(e: Omit<Enquiry, "id" | "createdAt" | "telegramMessageId">) {
  const id = randomBytes(8).toString("hex");
  const enquiry: Enquiry = { ...e, id, createdAt: new Date().toISOString(), telegramMessageId: null };
  if (await allowNotification()) {
    enquiry.telegramMessageId = await sendToOwner(
      mikiMessage(`${KINDS[e.kind]} enquiry`, [
        "Details as the visitor typed them:",
        `Name: ${untrusted(e.name, 120)}`,
        `Email: ${untrusted(e.email, 200)} (not verified)`,
        e.organisation ? `Organisation: ${untrusted(e.organisation, 120)}` : "",
        "Message:",
        untrusted(e.message, 1500),
        "",
        `<i>Enquiry ${esc(id.slice(0, 6))}</i>`,
      ].filter(Boolean)),
    );
  }
  if (redis) await redis.set(`miki:enq:${id}`, enquiry, { ex: 90 * 24 * 3600 });
  await audit({ actor: "visitor", action: "enquiry.submit", subject: id, result: enquiry.telegramMessageId || !telegramConfigured ? "ok" : "error", detail: e.kind });
  return enquiry;
}
