
// Edge Function: analyze-message-tone
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
    const { message } = await req.json();
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Compose prompt for structured analysis
    const prompt = `
Given the message below, return a JSON object with these fields:
- sentiment: "positive" | "neutral" | "negative"
- tone_flags: array of ["harsh", "vague", "passive", "aggressive", "unclear"], can be empty array if none
- impact_level: "high" | "medium" | "low"
- suggestions: 1–3 concrete, friendly suggestions for softening or clarifying the message
- ui_display: formatted as: "Tone & Impact: [emoji] [Sentiment], [emoji] [Impact]" according to this mapping: positive=🟢 Positive, neutral=⚪ Neutral, negative=🔴 Negative; high=📊 High, medium=📉 Medium, low=🧘 Low.

Input message: "${message}"
Respond ONLY with the JSON fields required, no explanations.
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
          { role: "system", content: "You are an assistant analyzing tone and clarity of workplace chat messages." },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.05,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: "OpenAI error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const result = await aiRes.json();
    const content = result.choices?.[0]?.message?.content || result;

    // If the returned content is a string (OpenAI wraps response in a string), parse it
    let output = {};
    try {
      output = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      output = content;
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
