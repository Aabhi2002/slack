
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessageReaction {
  emoji: string;
  user_id: string;
}

export function useMessageReactions(messageId: string) {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const channelRef = useRef<any>(null);
  const currentMessageIdRef = useRef<string>('');
  const isSubscribingRef = useRef<boolean>(false);

  const fetchReactions = async () => {
    if (!messageId) return;

    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('emoji, user_id')
        .eq('message_id', messageId);

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  useEffect(() => {
    // If messageId hasn't changed and we're already subscribed, don't do anything
    if (currentMessageIdRef.current === messageId && channelRef.current) {
      return;
    }

    // Clean up existing channel first
    if (channelRef.current) {
      console.log('Removing existing reactions channel before creating new one');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Update the current message ID
    currentMessageIdRef.current = messageId;

    if (!messageId || isSubscribingRef.current) {
      setReactions([]);
      return;
    }

    // Only subscribe if message is a valid UUID
    if (!messageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('Skipping reactions subscription for non-UUID message:', messageId);
      return;
    }

    fetchReactions();

    // Small delay to ensure previous channel is fully cleaned up
    setTimeout(() => {
      setupReactionsSubscription();
    }, 100);

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up reactions channel on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [messageId]);

  const setupReactionsSubscription = () => {
    if (!messageId || isSubscribingRef.current) return;

    isSubscribingRef.current = true;
    
    // Create a truly unique channel name to avoid conflicts
    const channelName = `reactions-${messageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Setting up new reactions channel:', channelName);
    
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          console.log('Reactions changed for message:', messageId);
          fetchReactions();
        }
      )
      .subscribe((status) => {
        console.log('Reactions subscription status:', status, 'for message:', messageId);
        if (status === 'SUBSCRIBED') {
          isSubscribingRef.current = false;
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          isSubscribingRef.current = false;
        }
      });
  };

  return {
    reactions,
    refetchReactions: fetchReactions
  };
}
