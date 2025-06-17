
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { OrgBrainResultSection } from "./OrgBrainResultSection";
import { Loader2, CircleX, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type OrgBrainResult = {
  summary?: string;
  blockers?: string[];
  participants?: string[];
  decisions?: string[];
  [key: string]: any;
};

interface OrgBrainModalProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName?: string;
}

export function OrgBrainModal({
  open,
  onClose,
  channelId,
  channelName,
}: OrgBrainModalProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrgBrainResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { session } = useAuth();

  const SUPABASE_FUNCTION_URL =
    "https://ueqmdglrsrmbjojdyhhi.supabase.co/functions/v1/ask-org-brain";

  const askOrgBrain = async () => {
    if (!question.trim()) {
      toast({ title: "Please enter a question", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ question, channel_id: channelId }),
      });

      if (res.ok) {
        let data: any;
        try {
          data = await res.json();
        } catch (jsonErr) {
          toast({
            title: "AI Error",
            description: "Could not parse response",
            variant: "destructive",
          });
          console.error("Error parsing Org Brain response JSON:", jsonErr);
          setResult(null);
          return;
        }
        try {
          setResult(
            data.choices?.[0]?.message?.content
              ? JSON.parse(data.choices[0].message.content)
              : data
          );
        } catch (parseErr) {
          toast({
            title: "AI Error",
            description: "Could not parse model output",
            variant: "destructive",
          });
          console.error(
            "Error parsing model output in OrgBrain:",
            parseErr,
            data
          );
          setResult(null);
        }
      } else {
        let errText = "";
        try {
          errText = await res.text();
        } catch {}
        toast({
          title: "AI Error",
          description: errText || "Unknown error from function",
          variant: "destructive",
        });
        console.error("Org Brain function error:", res.status, errText);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: String(e?.message || e),
        variant: "destructive",
      });
      console.error("Error calling Org Brain:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion("");
    setLoading(false);
    setResult(null);
    setCopiedField(null);
    onClose();
  };

  // Copy raw value to clipboard
  const handleCopy = async (label: string, raw: any) => {
    try {
      await navigator.clipboard.writeText(
        typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)
      );
      setCopiedField(label);
      toast({ title: `${label} copied to clipboard!` });
      setTimeout(() => setCopiedField(null), 1600);
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Map fields to show in main area; others render as generic sections
  const mainFields = ["summary", "blockers", "participants", "decisions"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl w-full p-0 border-none bg-black shadow-xl rounded-2xl text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold px-10 pt-8 pb-2 flex flex-row items-center gap-2 text-white">
            <Search className="w-6 h-6 text-[#9a82ff]" />
            Ask Org Brain
            {channelName && (
              <span className="font-medium text-base ml-1 text-[#9da4af]">{`in #${channelName}`}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="px-10 pb-3 w-full">
          {/* Input area */}
          <div className="flex flex-row items-center w-full gap-3 mb-4">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7a91]">
                <Search className="w-5 h-5" />
              </span>
              <Input
                placeholder="What discussion is going on in #announcements?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={e =>
                  (e.key === "Enter" && !loading)
                    ? askOrgBrain()
                    : undefined
                }
                disabled={loading}
                className="pl-12 pr-4 h-12 bg-[#18181c] border border-[#2d2c3a] text-white placeholder:text-[#767D8D] font-normal text-base rounded-xl shadow-none focus:ring-2 focus:ring-[#9a82ff] focus:border-[#9a82ff] transition"
                autoFocus
                style={{
                  boxShadow: '0 2px 8px 0 rgba(95,91,240,0.10)'
                }}
              />
            </div>
            <Button
              onClick={askOrgBrain}
              disabled={loading}
              className="h-12 px-8 rounded-xl font-bold text-base bg-gradient-to-tr from-[#7c43ff] via-[#2b264d] to-[#0d0a19] hover:from-[#a084ee] hover:to-[#25244d] hover:shadow-lg text-white border border-[#36334b] shadow-md transition-all hover:scale-105"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-5 h-5 text-[#9a82ff]" />
                  Thinking...
                </>
              ) : (
                "Ask"
              )}
            </Button>
          </div>
        </div>
        <div className="relative w-full min-h-[120px] max-h-[400px] transition-all px-10 pb-10 pt-0">
          {/* Results */}
          {loading && (
            <div className="flex justify-center items-center min-h-[160px]">
              <Loader2 className="animate-spin text-[#9a82ff] w-8 h-8" />
            </div>
          )}
          {!loading && !result && (
            <div className="flex flex-col items-center justify-center text-center text-[#5a6170] min-h-[120px]">
              <Search className="w-12 h-12 mb-2 text-[#2b264d]" />
              <span className="text-lg">
                Ask a question to Org Brain about your channel's past discussions.
              </span>
            </div>
          )}
          {!loading && !!result && (
            <ScrollArea className="max-h-[340px] pr-2 -mr-2">
              <div className="flex flex-col gap-5 animate-fade-in">
                {mainFields.map((field) => (
                  <OrgBrainResultSection
                    key={field}
                    type={field}
                    value={result && result[field]}
                    onCopy={handleCopy}
                    isCopied={copiedField === (field[0].toUpperCase() + field.slice(1))}
                  />
                ))}
                {/* Render any additional result keys not in mainFields */}
                {Object.entries(result)
                  .filter(
                    ([key, value]) => !mainFields.includes(key) && value != null
                  )
                  .map(([key, value]) => (
                    <OrgBrainResultSection
                      key={key}
                      type={key}
                      value={value}
                      onCopy={handleCopy}
                      isCopied={copiedField === (key[0].toUpperCase() + key.slice(1))}
                    />
                  ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ... file is getting long, consider refactoring into smaller UI components!
