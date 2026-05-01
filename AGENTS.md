<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Event-curation prompt (heads-up for other agents)

The system + user prompt for the dynamic SF-events lookup lives in
`src/app/api/events/prompt.ts` and is consumed by the route handler at
`src/app/api/events/route.ts`. It was authored in conversation, not derived
from a doc — if you change the source list, vibe tag taxonomy, or output
JSON shape, update both the prompt and any frontend that parses the result.

Design notes:
- Single OpenAI Responses API call per request, with the `web_search` tool.
- No matching algorithm, no embeddings, no events DB. The onboarding Q&A
  array is the only persistent state and is passed verbatim into the prompt.
- Each result includes a `why_it_matches` field grounded in a specific
  onboarding answer — keep that field; the UI relies on it for explainability.
