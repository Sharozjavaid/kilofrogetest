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

  const response = await client.responses.create({
    model: "gpt-4.1",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(body) },
    ],
  });

  const text = response.output_text ?? "";
  let parsed: unknown = null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : null;
  } catch {
    parsed = null;
  }

  return Response.json({
    events: parsed,
    raw: parsed ? undefined : text,
    model: response.model,
  });
}
