
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Pin, X } from 'lucide-react';
import { Message } from '@/types/message';

interface PinnedMessage extends Message {
  pinned_by: {
    full_name: string;
    email: string;
  };
  pinned_at: string;
}

interface PinnedMessagesModalProps {
  channelId: string;
  workspaceId: string;
  onClose: () => void;
  isDM?: boolean;
}

export function PinnedMessagesModal({ channelId, workspaceId, onClose, isDM = false }: PinnedMessagesModalProps) {
  const { user } = useAuth();
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPinnedMessages();
    
    // Subscribe to real-time updates for pinned messages
    const subscription = supabase
      .channel(`pinned_modal:${channelId}:${isDM ? 'dm' : 'channel'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: isDM ? `dm_id=eq.${channelId}` : `channel_id=eq.${channelId}`
        },
        () => {
          fetchPinnedMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, isDM]);

  const fetchPinnedMessages = async () => {
    setLoading(true);
    try {
      // First get the pinned message records
      const { data: pinnedData, error: pinnedError } = await supabase
        .from('pinned_messages')
        .select(`
          message_id,
          created_at,
          pinned_by_user_id
        `)
        .eq(isDM ? 'dm_id' : 'channel_id', channelId)
        .order('created_at', { ascending: false });

      if (pinnedError) throw pinnedError;
      
      if (!pinnedData || pinnedData.length === 0) {
        setPinnedMessages([]);
        return;
      }

      // Get the message IDs
      const messageIds = pinnedData.map(p => p.message_id);
      
      // Fetch the actual messages (removed reply_count from SELECT)
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          profiles (
            full_name,
            email
          ),
          message_reactions (
            emoji,
            user_id
          )
        `)
        .in('id', messageIds);

      if (messagesError) throw messagesError;

      // Get the pinned_by user profiles
      const pinnerIds = pinnedData.map(p => p.pinned_by_user_id);
      const { data: pinnersData, error: pinnersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', pinnerIds);

      if (pinnersError) throw pinnersError;

      // Combine the data
      const formattedMessages: PinnedMessage[] = messagesData?.map(message => {
        const pinnedRecord = pinnedData.find(p => p.message_id === message.id);
        const pinner = pinnersData?.find(p => p.id === pinnedRecord?.pinned_by_user_id);
        
        return {
          ...message,
          is_pinned: true,
          pinned_by: {
            full_name: pinner?.full_name || '',
            email: pinner?.email || ''
          },
          pinned_at: pinnedRecord?.created_at || ''
        };
      }) || [];
      
      setPinnedMessages(formattedMessages);
    } catch (error: any) {
      console.error('Error fetching pinned messages:', error);
      toast({
        title: "Error",
        description: "Failed to load pinned messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unpinMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('message_id', messageId)
        .eq(isDM ? 'dm_id' : 'channel_id', channelId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Message unpinned successfully"
      });
    } catch (error: any) {
      console.error('Error unpinning message:', error);
      toast({
        title: "Error", 
        description: "Failed to unpin message",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-white">
              Pinned Messages
            </h2>
            <span className="text-sm text-slate-400">
              ({pinnedMessages.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-slate-400 py-8">
              Loading pinned messages...
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              No pinned messages in this {isDM ? 'conversation' : 'channel'} yet.
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedMessages.map((message) => (
                <div key={message.id} className="group bg-slate-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                      {message.profiles.full_name?.[0]?.toUpperCase() || message.profiles.email[0]?.toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-semibold text-white">
                          {message.profiles.full_name || message.profiles.email}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="text-slate-100 leading-relaxed mb-3">
                        {message.content}
                      </div>
                      
                      <div className="text-xs text-slate-500 mb-2">
                        Pinned by {message.pinned_by.full_name || message.pinned_by.email} • {formatDistanceToNow(new Date(message.pinned_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unpinMessage(message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
