
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { messages } = await req.json();
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    if (!Array.isArray(messages) || messages.length === 0)
      return new Response(JSON.stringify({ error: "Missing messages" }), { status: 400, headers: corsHeaders });

    // Compose prompt, strictly following your requirement
    const prompt = `
You are an assistant summarizing channel discussions for meeting notes.
Given the following messages (in the format @alice: "text"), extract and return JSON with 4 sections:
- key_points: Important topics, decisions, or ideas discussed.
- action_items: Clear tasks assigned to specific people. Format: "@user will [do something]"
- stakeholders: List of all people who participated in the conversation (senders/mentions).
- deadlines: Any due dates, timelines, or urgent references.
Return a final UI display message as "✅ Notes generated: Key Points, Action Items, Stakeholders, and Deadlines ready to copy."
Output ONLY JSON.

Messages:
${messages.map(m => `@${m.sender}: "${m.content}"`).join("\n")}
    `.trim();

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a concise professional meeting note assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 700,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: "OpenAI error", status: aiRes.status }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const result = await aiRes.json();
    let output;
    try {
      output = typeof result.choices?.[0]?.message?.content === "string"
        ? JSON.parse(result.choices[0].message.content)
        : result.choices?.[0]?.message?.content ?? result;
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON parse error", details: e.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Ensure required fields present, else error
    if (!output.key_points || !output.action_items || !output.stakeholders || !output.deadlines) {
      return new Response(JSON.stringify({ error: "Incomplete AI output", data: output }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
