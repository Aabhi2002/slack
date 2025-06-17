// Add deno/xhr to support fetch in Deno edge functions
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers for browser support
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight (OPTIONS) handler
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
  }

  const { question, channel_id } = body;
  if (!question || !channel_id) {
    return new Response("Missing question or channel_id", { status: 400, headers: corsHeaders });
  }

  try {
    // 1. Embed question
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: question,
        encoding_format: "float",
      }),
    });
    if (!embedRes.ok) {
      const err = await embedRes.text();
      return new Response(`Embedding failed: ${err}`, { status: 500, headers: corsHeaders });
    }
    const embedData = await embedRes.json();
    const embedding = embedData.data?.[0]?.embedding;
    if (!embedding) {
      return new Response("No embedding returned by OpenAI", { status: 500, headers: corsHeaders });
    }

    // 2. Search org_brain_memory via RPC
    const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_org_brain_memory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        target_channel_id: channel_id,
      }),
    });
    if (!searchRes.ok) {
      const err = await searchRes.text();
      return new Response(`Search failed: ${err}`, { status: 500, headers: corsHeaders });
    }
    const searchHits = await searchRes.json();

    // 3. Format context
    let contextBlock = `You are a helpful assistant inside a team communication tool.
Always answer in JSON format. Example: { "blockers": [], "participants": [], "notes": "..." }.

Here are recent discussions from this channel:
`;
    for (const row of searchHits) {
      contextBlock += `- "${row.content}" — @${row.user_id}\n`;
    }
    contextBlock += `\nUser question: "${question}"\n\nAnswer with: Blockers, Participants, and Notes.\n`;

    // 4. Send to GPT-4o and return JSON
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: contextBlock },
          { role: "user", content: question }
        ],
        response_format: { type: "json_object" },
        max_tokens: 512,
        temperature: 0.2
      }),
    });
    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return new Response(`GPT summary failed: ${err}`, { status: 500, headers: corsHeaders });
    }
    const summary = await openaiRes.json();
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(`Internal error: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});
