
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { MeetingNotesResult } from "@/utils/generateMeetingNotes";

interface MeetingNotesModalProps {
  open: boolean;
  onClose: () => void;
  notes: MeetingNotesResult | null;
  loading: boolean;
  error?: string;
}

export function MeetingNotesModal({ open, onClose, notes, loading, error }: MeetingNotesModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    if (!notes) return;
    const text = [
      "Key Points:\n" + (notes.key_points || []).join("\n"),
      "Action Items:\n" + (notes.action_items || []).join("\n"),
      "Stakeholders:\n" + (notes.stakeholders || []).join(", "),
      "Deadlines:\n" + (notes.deadlines || []).join("\n"),
    ].join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Check if we have any actual content to display
  const hasContent = notes && (
    (notes.key_points && notes.key_points.length > 0) ||
    (notes.action_items && notes.action_items.length > 0) ||
    (notes.stakeholders && notes.stakeholders.length > 0) ||
    (notes.deadlines && notes.deadlines.length > 0)
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg bg-slate-900 border-slate-700 flex flex-col [&>button]:hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <SheetTitle className="text-white text-xl font-semibold">Meeting Notes</SheetTitle>
            <SheetDescription className="text-slate-400">
              A summary of your meeting with key points, action items, stakeholders, and deadlines.
            </SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col flex-1 min-h-0 pt-4">
          <ScrollArea className="flex-1 pr-4">
            {loading ? (
              <div className="text-slate-400 py-8 text-center">Generating notes...</div>
            ) : error ? (
              <div className="text-red-400 py-4">{error}</div>
            ) : hasContent ? (
              <div className="space-y-6">
                {notes.key_points && notes.key_points.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-3 text-white text-lg">Key Points</h4>
                    <ul className="list-disc ml-6 space-y-2">
                      {notes.key_points.map((p, i) => (
                        <li key={i} className="text-sm text-slate-300 leading-relaxed">{p}</li>
                      ))}
                    </ul>
                  </section>
                )}
                
                {notes.action_items && notes.action_items.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-3 text-white text-lg">Action Items</h4>
                    <ul className="list-disc ml-6 space-y-2">
                      {notes.action_items.map((ai, i) => (
                        <li key={i} className="text-sm text-slate-300 leading-relaxed">{ai}</li>
                      ))}
                    </ul>
                  </section>
                )}
                
                {notes.stakeholders && notes.stakeholders.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-3 text-white text-lg">Stakeholders</h4>
                    <div className="text-sm text-slate-300 bg-slate-800 p-3 rounded-lg">
                      {notes.stakeholders.join(", ")}
                    </div>
                  </section>
                )}
                
                {notes.deadlines && notes.deadlines.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-3 text-white text-lg">Deadlines</h4>
                    <ul className="list-disc ml-6 space-y-2">
                      {notes.deadlines.map((dl, i) => (
                        <li key={i} className="text-sm text-slate-300 leading-relaxed">{dl}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-slate-400 py-8 text-center">No notes to display.</div>
            )}
          </ScrollArea>
          
          {hasContent && (
            <div className="mt-6 pt-4 border-t border-slate-700 flex-shrink-0">
              <Button 
                onClick={handleCopyAll} 
                variant={copied ? "secondary" : "default"}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {copied ? "Copied!" : "Copy All Notes"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
