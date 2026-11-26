import { z } from "zod";
import { sendVerificationCode } from "@/lib/miki/booking";
import { clientIp, errorResponse, json, readJson, sameOrigin } from "@/lib/miki/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });
  try {
    const { email } = z.object({ email: z.string().max(200) }).parse(await readJson(req));
    await sendVerificationCode(email, clientIp(req));
    return json(200, { ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
