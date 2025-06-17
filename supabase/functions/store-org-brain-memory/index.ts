
import { serve } from "https://deno.land/std/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Expects JSON: { channel_id, user_id, is_pinned, source_type, source_id, content }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = await req.json();

  const {
    channel_id,
    user_id,
    is_pinned = false,
    source_type = "message",
    source_id,
    content
  } = body;

  // 1. Get embedding from OpenAI
  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: content,
      encoding_format: "float",
    }),
  });

  if (!embedRes.ok) {
    const err = await embedRes.text();
    return new Response(`Embedding failed: ${err}`, { status: 500 });
  }

  const embedData = await embedRes.json();
  const embedding = embedData.data?.[0]?.embedding;
  if (!embedding) {
    return new Response("No embedding returned by OpenAI", { status: 500 });
  }

  // 2. Store in org_brain_memory
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/org_brain_memory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify([{
      channel_id,
      user_id,
      is_pinned,
      source_type,
      source_id,
      content,
      embedding
    }])
  });

  if (!upsertRes.ok) {
    const msg = await upsertRes.text();
    return new Response(`Supabase insert failed: ${msg}`, { status: 500 });
  }

  return new Response("Embedded and stored.", { status: 200 });
});
