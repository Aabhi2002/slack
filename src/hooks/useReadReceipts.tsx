import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReadReceipt {
  user_id: string;
  read_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export function useReadReceipts(messageId: string) {
  const { user } = useAuth();
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const channelRef = useRef<any>(null);
  const currentMessageIdRef = useRef<string>('');
  const isSubscribingRef = useRef<boolean>(false);

  // Check if message ID is valid (UUID format) and not temporary
  const isValidMessageId = (id: string): boolean => {
    if (!id || typeof id !== 'string') {
      console.log('Invalid message ID type:', typeof id, id);
      return false;
    }
    
    // Skip optimistic/temporary messages
    if (id.startsWith('optimistic-') || id.startsWith('temp-') || id.includes('local-') || id.length < 30) {
      console.log('Skipping temporary message ID:', id);
      return false;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(id);
    
    if (!isValid) {
      console.log('Invalid UUID format for message ID:', id);
    }
    
    return isValid;
  };

  // Mark message as read
  const markAsRead = async () => {
    if (!user || !messageId) {
      console.log('No user or messageId, skipping markAsRead');
      return;
    }

    // Only mark valid UUID messages as read
    if (!isValidMessageId(messageId)) {
      console.log('Skipping read receipt for invalid message ID:', messageId);
      return;
    }

    try {
      console.log('Attempting to mark message as read:', messageId, 'for user:', user.id);

      // First check if the message exists
      const { data: messageExists, error: messageCheckError } = await supabase
        .from('messages')
        .select('id')
        .eq('id', messageId)
        .single();

      if (messageCheckError || !messageExists) {
        console.log('Message does not exist, skipping read receipt:', messageId);
        return;
      }

      // Upsert ONLY valid columns for message_reads table (no updated_at!)
      const { error } = await supabase
        .from('message_reads')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'message_id,user_id'
        });

      if (error) {
        console.error('Error marking message as read:', error);
      } else {
        console.log('Successfully marked message as read:', messageId);
      }
    } catch (error) {
      console.error('Caught error marking message as read:', error);
    }
  };

  // Fetch read receipts for the message
  const fetchReadReceipts = async () => {
    if (!messageId || !isValidMessageId(messageId)) {
      console.log('Invalid messageId for fetchReadReceipts:', messageId);
      setReadReceipts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('message_reads')
        .select(`
          user_id,
          read_at,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .order('read_at', { ascending: true });

      if (error) {
        console.error('Error fetching read receipts:', error);
        setReadReceipts([]);
        return;
      }
      
      setReadReceipts(data || []);
    } catch (error) {
      console.error('Caught error fetching read receipts:', error);
      setReadReceipts([]);
    }
  };

  useEffect(() => {
    // If messageId hasn't changed and we're already subscribed, don't do anything
    if (currentMessageIdRef.current === messageId && channelRef.current) {
      return;
    }

    // Clean up existing channel first
    if (channelRef.current) {
      console.log('Removing existing read receipts channel before creating new one');
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
      channelRef.current = null;
    }

    // Update the current message ID
    currentMessageIdRef.current = messageId;

    if (!messageId || isSubscribingRef.current) {
      setReadReceipts([]);
      return;
    }

    // Only fetch and subscribe for valid UUID messages
    if (!isValidMessageId(messageId)) {
      console.log('Skipping read receipts subscription for invalid message:', messageId);
      setReadReceipts([]);
      return;
    }

    fetchReadReceipts();

    // Small delay to ensure previous channel is fully cleaned up
    setTimeout(() => {
      setupReadReceiptsSubscription();
    }, 100);

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up read receipts channel on unmount');
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.error('Error removing channel on unmount:', error);
        }
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [messageId]);

  const setupReadReceiptsSubscription = () => {
    if (!messageId || isSubscribingRef.current) return;

    // Only subscribe if message is a valid UUID
    if (!isValidMessageId(messageId)) {
      console.log('Skipping read receipts subscription for invalid message:', messageId);
      return;
    }

    isSubscribingRef.current = true;
    
    // Create a truly unique channel name to avoid conflicts
    const channelName = `read-receipts-${messageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Setting up new read receipts channel:', channelName);
    
    try {
      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reads',
            filter: `message_id=eq.${messageId}`
          },
          () => {
            console.log('Read receipts changed for message:', messageId);
            fetchReadReceipts();
          }
        )
        .subscribe((status) => {
          console.log('Read receipts subscription status:', status, 'for message:', messageId);
          if (status === 'SUBSCRIBED') {
            isSubscribingRef.current = false;
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            isSubscribingRef.current = false;
            console.error('Channel error or closed for message:', messageId);
          }
        });
    } catch (error) {
      console.error('Error setting up read receipts subscription:', error);
      isSubscribingRef.current = false;
    }
  };

  return {
    readReceipts,
    markAsRead
  };
}
