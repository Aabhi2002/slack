
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Message } from '@/types/message';

interface PinnedMessage extends Message {
  pinned_by: {
    full_name: string;
    email: string;
  };
  pinned_at: string;
}

interface PinnedMessagesProps {
  channelId: string;
  workspaceId: string;
  isDM?: boolean;
}

export function PinnedMessages({ channelId, workspaceId, isDM = false }: PinnedMessagesProps) {
  const { user } = useAuth();
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchPinnedMessages();
    
    // Clean up existing subscription first
    if (channelRef.current) {
      console.log('Cleaning up existing pinned messages subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Small delay to ensure previous channel is fully cleaned up
    const timer = setTimeout(() => {
      setupPinnedSubscription();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (channelRef.current) {
        console.log('Cleaning up pinned messages subscription on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, isDM]);

  const setupPinnedSubscription = () => {
    // Create unique channel name with timestamp to avoid conflicts
    const channelName = `pinned-${isDM ? 'dm' : 'channel'}-${channelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Setting up pinned messages subscription:', channelName);
    
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: isDM ? `dm_id=eq.${channelId}` : `channel_id=eq.${channelId}`
        },
        () => {
          console.log('Pinned messages changed, refetching...');
          fetchPinnedMessages();
        }
      )
      .subscribe((status) => {
        console.log('Pinned messages subscription status:', status, 'for:', channelName);
      });
  };

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

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-700 bg-slate-900">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-white">
            {pinnedMessages.length} Pinned Message{pinnedMessages.length === 1 ? '' : 's'}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </div>
      
      {!isCollapsed && (
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              Loading pinned messages...
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {pinnedMessages.map((message) => (
                <div key={message.id} className="group bg-slate-800 rounded p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                      {message.profiles.full_name?.[0]?.toUpperCase() || message.profiles.email[0]?.toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">
                          {message.profiles.full_name || message.profiles.email}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="text-slate-100 text-sm leading-relaxed mb-2">
                        {message.content}
                      </div>
                      
                      <div className="text-xs text-slate-500">
                        Pinned by {message.pinned_by.full_name || message.pinned_by.email} • {formatDistanceToNow(new Date(message.pinned_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unpinMessage(message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
