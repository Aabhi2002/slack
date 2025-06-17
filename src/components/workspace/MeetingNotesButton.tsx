
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MeetingNotesResult, generateMeetingNotes } from "@/utils/generateMeetingNotes";
import { MeetingNotesModal } from "./MeetingNotesModal";
import { Message } from "@/types/message";
import { cn } from "@/lib/utils";

interface MeetingNotesButtonProps {
  messages: Message[];
  onCollectSenders?: (uniqueSenders: string[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export function MeetingNotesButton({ 
  messages, 
  onCollectSenders, 
  className,
  children 
}: MeetingNotesButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState<MeetingNotesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleGenerateNotes = async () => {
    setModalOpen(true);
    setLoading(true);
    setError(undefined);

    // Prepare formatted messages with sender name and content only (skip system/blank)
    const formatted = messages
      .filter(m => m.profiles && m.content && m.content.trim())
      .map(m => ({
        sender: m.profiles.full_name || m.profiles.email || "User",
        content: m.content,
      }));

    console.log("Formatted messages for meeting notes:", formatted);

    // unique senders for further logic if needed
    if (onCollectSenders) {
      const senders = [...new Set(formatted.map(f => f.sender))];
      onCollectSenders(senders);
    }
    try {
      const result = await generateMeetingNotes(formatted);
      console.log("MeetingNotes result:", result);
      setNotes(result);
      setLoading(false);
      if (result.error) {
        console.error("MeetingNotes error:", result.error);
        setError(result.error);
      }
    } catch (e: any) {
      setLoading(false);
      setError(e.message || "Unknown error");
      console.error("Caught error in MeetingNotesButton:", e.message, e);
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn(
          "h-7 px-2 text-gray-400 hover:text-green-400 hover:bg-gray-800",
          className
        )}
        onClick={handleGenerateNotes}
        title="Generate Meeting Notes"
      >
        {children || (
          <>
            📝
            <span className="ml-1 text-xs hidden sm:inline">Notes</span>
          </>
        )}
      </Button>
      <MeetingNotesModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        notes={notes} 
        loading={loading} 
        error={error} 
      />
    </>
  );
}
