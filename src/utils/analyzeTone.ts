
import { supabase } from "@/integrations/supabase/client";

export interface ToneAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  tone_flags: string[];
  impact_level: "high" | "medium" | "low";
  impact: "high" | "medium" | "low"; // Add this property to match the frontend usage
  suggestions: string[];
  ui_display: string;
}

export async function analyzeTone(message: string): Promise<ToneAnalysis | null> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-message-tone', {
      body: { message },
    });

    if (error) {
      console.log("[analyzeTone] Supabase function error:", error);
      return null;
    }

    console.log("[analyzeTone] RESPONSE:", data);

    // Validate that required properties exist
    if (
      !data ||
      typeof data.sentiment !== "string" ||
      !Array.isArray(data.tone_flags) ||
      typeof data.impact_level !== "string" ||
      typeof data.ui_display !== "string" ||
      !Array.isArray(data.suggestions)
    ) {
      console.warn("[analyzeTone] Incomplete or malformed response:", data);
      return null;
    }

    // Map impact_level to impact for backward compatibility
    return {
      ...data,
      impact: data.impact_level
    } as ToneAnalysis;
  } catch (e) {
    console.error("[analyzeTone] FETCH ERROR:", e);
    return null;
  }
}
