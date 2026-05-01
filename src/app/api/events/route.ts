import OpenAI from "openai";
import { buildSystemPrompt, buildUserPrompt, type EventsRequest } from "./prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: EventsRequest;
  try {
    body = (await request.json()) as EventsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.onboarding?.length || !body?.dateRange) {
    return Response.json(
      { error: "Body must include `onboarding` (non-empty array) and `dateRange`." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey });

  const nowIso = new Date().toISOString();

  const response = await client.responses.create({
    model: "gpt-4.1",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: buildSystemPrompt(nowIso) },
      { role: "user", content: buildUserPrompt(body) },
    ],
  });

  const text = response.output_text ?? "";
  let parsed: {
    events?: Array<{ datetime_iso?: string; lat?: number; lng?: number }>;
  } | null = null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : null;
  } catch {
    parsed = null;
  }

  // Safety net: drop anything in the past or undated, even if the model slipped.
  let droppedPast = 0;
  if (parsed?.events && Array.isArray(parsed.events)) {
    const nowMs = Date.now();
    const before = parsed.events.length;
    parsed.events = parsed.events.filter((ev) => {
      if (!ev?.datetime_iso) return false;
      const cleaned = String(ev.datetime_iso).replace(/[\u2010-\u2015]/g, "-");
      const t = Date.parse(cleaned);
      if (!Number.isFinite(t) || t <= nowMs) return false;
      // Strip out-of-bounds lat/lng so the map doesn't render bogus pins.
      const { lat, lng } = ev;
      const inSf =
        typeof lat === "number" &&
        typeof lng === "number" &&
        lat >= 37.70 && lat <= 37.83 &&
        lng >= -122.52 && lng <= -122.35;
      if (!inSf) {
        ev.lat = undefined;
        ev.lng = undefined;
      }
      return true;
    });
    droppedPast = before - parsed.events.length;
  }

  return Response.json({
    events: parsed,
    raw: parsed ? undefined : text,
    model: response.model,
    droppedPast,
    now: nowIso,
  });
}
