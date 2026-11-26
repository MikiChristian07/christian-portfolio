import { publicAvailability } from "@/lib/miki/booking";
import { errorResponse, json, sameOrigin } from "@/lib/miki/http";

export const runtime = "nodejs";

/** Open start times (UTC ISO) for a call length. Free/busy only: never event details. */
export async function GET(req: Request) {
  if (!sameOrigin(req) && req.headers.get("sec-fetch-site") !== "same-origin") return json(403, { error: "forbidden" });
  const d = Number(new URL(req.url).searchParams.get("duration") ?? 30);
  if (d !== 30 && d !== 60) return json(400, { error: "invalid", message: "Call length must be 30 or 60 minutes." });
  try {
    return json(200, await publicAvailability(d));
  } catch (err) {
    return errorResponse(err);
  }
}
