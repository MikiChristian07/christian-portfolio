import { z } from "zod";
import { checkVerificationCode } from "@/lib/miki/booking";
import { errorResponse, json, readJson, sameOrigin } from "@/lib/miki/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });
  try {
    const { email, code } = z.object({ email: z.string().max(200), code: z.string().regex(/^\d{6}$/) }).parse(await readJson(req));
    return json(200, { verifiedToken: await checkVerificationCode(email, code) });
  } catch (err) {
    return errorResponse(err);
  }
}
