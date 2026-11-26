import { submitRequest } from "@/lib/miki/booking";
import { clientIp, errorResponse, json, readJson, sameOrigin } from "@/lib/miki/http";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });
  try {
    const body = (await readJson(req)) as Record<string, unknown>;
    return json(200, await submitRequest({ ...body, source: "dialog" }, clientIp(req)));
  } catch (err) {
    return errorResponse(err);
  }
}
