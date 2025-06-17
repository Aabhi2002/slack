
import { supabase } from "@/integrations/supabase/client";

interface RawMessage {
  sender: string;
  content: string;
}

export interface MeetingNotesResult {
  key_points: string[];
  action_items: string[];
  stakeholders: string[];
  deadlines: string[];
  ui_message: string;
  error?: string;
}

export async function generateMeetingNotes(messages: RawMessage[]): Promise<MeetingNotesResult> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-meeting-notes", {
      body: { messages },
    });
    if (error) {
      return { key_points: [], action_items: [], stakeholders: [], deadlines: [], ui_message: "", error: error.message };
    }
    return data as MeetingNotesResult;
  } catch (e: any) {
    return {
      key_points: [],
      action_items: [],
      stakeholders: [],
      deadlines: [],
      ui_message: "",
      error: e.message || "Unknown error",
    };
  }
}
