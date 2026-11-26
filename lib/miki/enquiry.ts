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
  /** Gmail thread of Christian's reply, once he has sent one. */
  gmailThreadId?: string;
};

const K = { enq: (id: string) => `miki:enq:${id}`, recent: "miki:enq:recent" };
const RETENTION = 90 * 24 * 3600;

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
      [[{ text: "✉️ Reply by email", callback_data: `rpe:${id}` }]],
    );
  }
  if (redis) {
    await redis.set(K.enq(id), enquiry, { ex: RETENTION });
    await redis.zadd(K.recent, { score: Date.now(), member: id });
    await redis.zremrangebyrank(K.recent, 0, -201);
  }
  await audit({ actor: "visitor", action: "enquiry.submit", subject: id, result: enquiry.telegramMessageId || !telegramConfigured ? "ok" : "error", detail: e.kind });
  return enquiry;
}

export async function getEnquiry(id: string) {
  if (!redis || !/^[0-9a-f]{16}$/.test(id)) return null;
  return redis.get<Enquiry>(K.enq(id));
}

/** Newest first, optionally one kind ("the latest recruitment enquiry"). */
export async function recentEnquiries(limitN = 10, kind?: Enquiry["kind"]) {
  if (!redis) return [];
  const ids = await redis.zrange<string[]>(K.recent, 0, 49, { rev: true });
  const rows = await Promise.all(ids.map((id) => getEnquiry(id)));
  return rows.filter((e): e is Enquiry => !!e && (!kind || e.kind === kind)).slice(0, limitN);
}

export async function attachEnquiryThread(id: string, threadId: string) {
  const e = await getEnquiry(id);
  if (!e || !redis || e.gmailThreadId === threadId) return;
  const ttl = await redis.ttl(K.enq(id));
  await redis.set(K.enq(id), { ...e, gmailThreadId: threadId }, { ex: ttl > 0 ? ttl : RETENTION });
}

export const enquiryLabel = (kind: Enquiry["kind"]) => KINDS[kind];
