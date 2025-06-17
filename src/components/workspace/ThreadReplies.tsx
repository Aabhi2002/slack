import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ThreadReply } from '@/types/message';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ThreadRepliesProps {
  threadId: string;
  workspaceId: string;
}

export function ThreadReplies({ threadId, workspaceId }: ThreadRepliesProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestingReply, setSuggestingReply] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    fetchReplies();
    setupRealtimeSubscription();
  }, [threadId]);

  // Auto-scroll to bottom when new replies are added
  useEffect(() => {
    if (isNearBottom && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [replies, isNearBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 100; // pixels from bottom
    const isNearBottomNow = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    setIsNearBottom(isNearBottomNow);
  };

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('thread_replies')
        .select(`
          id,
          thread_id,
          workspace_id,
          sender_id,
          reply_text,
          created_at,
          updated_at,
          profiles (
            full_name,
            email
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error: any) {
      console.error('Error fetching thread replies:', error);
      toast({
        title: "Error",
        description: "Failed to load thread replies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`thread_replies_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thread_replies',
          filter: `thread_id=eq.${threadId}`
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSuggestReply = async () => {
    setSuggestingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-reply', {
        body: {
          threadId,
          workspaceId
        }
      });

      if (error) throw error;

      if (data.suggestedReply) {
        setNewReply(data.suggestedReply);
        toast({
          title: "Reply Suggested!",
          description: `AI found ${data.similarRepliesFound} similar discussions to help craft this reply.`,
        });
      }
    } catch (error: any) {
      console.error('Error getting reply suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to generate reply suggestion. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSuggestingReply(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('thread_replies')
        .insert({
          thread_id: threadId,
          workspace_id: workspaceId,
          sender_id: user.id,
          reply_text: newReply.trim()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Store the reply in memory for future AI suggestions
      if (data?.id) {
        supabase.functions.invoke('store-reply-memory', {
          body: {
            replyText: newReply.trim(),
            threadId,
            workspaceId,
            replyId: data.id
          }
        }).catch(error => {
          console.error('Error storing reply memory:', error);
        });
      }

      setNewReply('');
      setIsNearBottom(true); // Ensure we scroll to bottom after sending
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <div className="text-slate-400">Loading replies...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Replies List - Scrollable area that takes remaining space */}
      <div className="flex-1 min-h-0">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="h-full hide-scrollbar"
          onScrollCapture={handleScroll}
        >
          <div className="space-y-4 p-4">
            {replies.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No replies yet. Be the first to reply!
              </div>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                    {reply.profiles.full_name?.[0]?.toUpperCase() || reply.profiles.email[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-white text-sm truncate">
                        {reply.profiles.full_name || reply.profiles.email}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed break-words">
                      {reply.reply_text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Reply Input - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-slate-700 p-4 bg-slate-800">
        {/* AI Suggest Button */}
        <div className="mb-3">
          <Button
            onClick={handleSuggestReply}
            disabled={suggestingReply}
            variant="outline"
            size="sm"
            className="text-purple-400 border-purple-600 hover:bg-purple-600/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {suggestingReply ? 'Generating...' : 'Suggest Reply'}
          </Button>
        </div>
        
        <form onSubmit={handleSubmitReply} className="flex gap-2">
          <Textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Reply to thread..."
            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400 resize-none min-h-[40px] max-h-32"
            rows={2}
            disabled={submitting}
          />
          <Button
            type="submit"
            disabled={!newReply.trim() || submitting}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
