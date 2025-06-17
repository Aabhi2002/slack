
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  user_id: string;
  full_name: string;
  email: string;
}

export function useTypingIndicator(channelId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const channelRef = useRef<any>(null);
  const currentChannelIdRef = useRef<string | null>(null);
  const isSubscribingRef = useRef<boolean>(false);

  // Clear typing timeout
  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Start typing
  const startTyping = async () => {
    if (!channelId || !user || isTypingRef.current || !channelRef.current) return;

    isTypingRef.current = true;
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email,
          email: user.email,
          is_typing: true
        }
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  };

  // Stop typing
  const stopTyping = async () => {
    if (!channelId || !user || !isTypingRef.current || !channelRef.current) return;

    isTypingRef.current = false;
    clearTypingTimeout();
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email,
          email: user.email,
          is_typing: false
        }
      });
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  };

  // Handle typing with auto-stop after timeout
  const handleTyping = () => {
    startTyping();
    
    clearTypingTimeout();
    
    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  // Set up real-time subscription for typing indicators
  useEffect(() => {
    // If channelId hasn't changed and we're already subscribed, don't do anything
    if (currentChannelIdRef.current === channelId && channelRef.current) {
      return;
    }

    // Update the current channel ID
    currentChannelIdRef.current = channelId;

    if (!channelId || isSubscribingRef.current) {
      setTypingUsers([]);
      // Clean up existing channel
      if (channelRef.current) {
        console.log('Cleaning up typing channel for empty channelId');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Clean up existing channel before creating new one
    if (channelRef.current) {
      console.log('Removing existing typing channel before creating new one');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Small delay to ensure channel is fully removed
    const setupNewChannel = () => {
      if (isSubscribingRef.current) return;
      
      isSubscribingRef.current = true;
      
      // Create a truly unique channel name to avoid conflicts
      const channelName = `typing-${channelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Setting up new typing channel:', channelName);
      
      const channel = supabase.channel(channelName);
      channelRef.current = channel;
      
      channel
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { user_id, full_name, email, is_typing } = payload.payload;
          
          // Don't show our own typing indicator
          if (user_id === user?.id) return;
          
          setTypingUsers(prev => {
            if (is_typing) {
              // Add user to typing list if not already there
              const exists = prev.some(u => u.user_id === user_id);
              if (!exists) {
                return [...prev, { user_id, full_name, email }];
              }
              return prev;
            } else {
              // Remove user from typing list
              return prev.filter(u => u.user_id !== user_id);
            }
          });
          
          // Auto-remove typing indicator after 5 seconds
          if (is_typing) {
            setTimeout(() => {
              setTypingUsers(prev => prev.filter(u => u.user_id !== user_id));
            }, 5000);
          }
        })
        .subscribe((status) => {
          console.log('Typing subscription status:', status, 'for channel:', channelId);
          if (status === 'SUBSCRIBED') {
            isSubscribingRef.current = false;
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            isSubscribingRef.current = false;
          }
        });
    };

    // Set up new channel with a small delay
    setTimeout(setupNewChannel, 50);

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up typing channel on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [channelId, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTypingTimeout();
      if (isTypingRef.current) {
        stopTyping();
      }
    };
  }, []);

  return {
    typingUsers,
    handleTyping,
    stopTyping
  };
}
