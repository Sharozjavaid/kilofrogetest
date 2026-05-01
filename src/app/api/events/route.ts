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
    events?: Array<{
      datetime_iso?: string;
      lat?: number;
      lng?: number;
      url?: string;
      title?: string;
      venue?: string;
    }>;
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

  // Validate every URL — replace broken/missing ones with a Google search
  // fallback so the user never lands on a dead page.
  if (parsed?.events?.length) {
    await Promise.all(
      parsed.events.map(async (ev) => {
        const fallback = buildSearchFallback(ev.title, ev.venue);
        if (!ev.url || !/^https?:\/\//i.test(ev.url)) {
          ev.url = fallback;
          return;
        }
        try {
          const ok = await urlResolves(ev.url);
          if (!ok) ev.url = fallback;
        } catch {
          ev.url = fallback;
        }
      })
    );
  }

  return Response.json({
    events: parsed,
    raw: parsed ? undefined : text,
    model: response.model,
    droppedPast,
    now: nowIso,
  });
}

function buildSearchFallback(title?: string, venue?: string): string {
  const q = [title, venue, "San Francisco"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

async function urlResolves(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  const headers = {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml",
  };
  try {
    // Try HEAD first (cheap), fall back to GET if HEAD is blocked.
    let res = await fetch(url, { method: "HEAD", redirect: "follow", headers, signal: ctrl.signal });
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      res = await fetch(url, { method: "GET", redirect: "follow", headers, signal: ctrl.signal });
    }
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
