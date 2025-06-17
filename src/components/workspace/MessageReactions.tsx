
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useMessageReactions } from '@/hooks/useMessageReactions';

interface MessageReaction {
  emoji: string;
  user_id: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  currentUserId?: string;
  onReactionChange?: () => void;
}

export function MessageReactions({ 
  messageId, 
  reactions: initialReactions, 
  currentUserId, 
  onReactionChange 
}: MessageReactionsProps) {
  const { reactions } = useMessageReactions(messageId);
  
  // Use reactions from the hook if available, otherwise fall back to initial reactions
  const displayReactions = reactions.length > 0 ? reactions : initialReactions;

  const handleReactionClick = async (emoji: string) => {
    if (!currentUserId) return;

    try {
      console.log('Reaction clicked:', emoji, 'by user:', currentUserId);
      
      // Check if user already reacted with this emoji
      const existingReaction = displayReactions.find(
        reaction => reaction.emoji === emoji && reaction.user_id === currentUserId
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', currentUserId)
          .eq('emoji', emoji);

        if (error) throw error;
        console.log('Reaction removed');
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: currentUserId,
            emoji: emoji
          });

        if (error) throw error;
        console.log('Reaction added');
      }

      onReactionChange?.();
    } catch (error: any) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive"
      });
    }
  };

  // Group reactions by emoji and count them
  const groupedReactions = displayReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        count: 0,
        userIds: [],
        hasCurrentUser: false
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.user_id);
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, { count: number; userIds: string[]; hasCurrentUser: boolean }>);

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
            transition-colors border
            ${data.hasCurrentUser 
              ? 'bg-blue-600/20 border-blue-600/50 text-blue-400' 
              : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }
          `}
        >
          <span>{emoji}</span>
          <span>{data.count}</span>
        </button>
      ))}
    </div>
  );
}
