
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MessageSquare, Pin, MoreHorizontal, Smile, Reply } from 'lucide-react';
import { MentionText } from './MentionText';
import { MessageAttachment } from './MessageAttachment';
import { ReadReceipts } from './ReadReceipts';
import { MessageReactions } from './MessageReactions';
import { EmojiPicker } from './EmojiPicker';
import { Message } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { useState } from 'react';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  onThreadClick?: (message: Message) => void;
  workspaceId?: string;
  channelName?: string;
  channelId?: string;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  isDM?: boolean;
}

function MessageItem({ message, currentUserId, onThreadClick, workspaceId, channelId, channelName, onUpdateMessage, isDM }: {
  message: Message;
  currentUserId?: string;
  onThreadClick?: (message: Message) => void;
  workspaceId?: string;
  channelId?: string;
  channelName?: string;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  isDM?: boolean;
}) {
  const { markAsRead } = useReadReceipts(message.id);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isOwnMessage = message.sender_id === currentUserId;
  
  // Mark message as read when it becomes visible
  const messageRef = useMessageVisibility({
    onVisible: () => {
      if (!isOwnMessage) {
        markAsRead();
      }
    }
  });

  const handlePinMessage = async () => {
    if (!workspaceId || !channelId || !currentUserId) return;

    try {
      if (message.is_pinned) {
        const { error } = await supabase
          .from('pinned_messages')
          .delete()
          .eq('message_id', message.id)
          .eq(isDM ? 'dm_id' : 'channel_id', channelId);

        if (error) throw error;
        
        // Immediately update the local state
        onUpdateMessage?.(message.id, { is_pinned: false });
        
        toast({
          title: "Success",
          description: "Message unpinned successfully"
        });
      } else {
        const insertData: any = {
          workspace_id: workspaceId,
          message_id: message.id,
          pinned_by_user_id: currentUserId
        };

        if (isDM) {
          insertData.dm_id = channelId;
        } else {
          insertData.channel_id = channelId;
        }

        const { error } = await supabase
          .from('pinned_messages')
          .insert(insertData);

        if (error) throw error;
        
        // Immediately update the local state
        onUpdateMessage?.(message.id, { is_pinned: true });
        
        toast({
          title: "Success",
          description: "Message pinned successfully"
        });
      }
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: `Failed to ${message.is_pinned ? 'unpin' : 'pin'} message`,
        variant: "destructive"
      });
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (!currentUserId) return;

    try {
      console.log('Adding emoji reaction:', emoji, 'to message:', message.id);
      
      // Check if user already reacted with this emoji
      const existingReaction = message.message_reactions?.find(
        reaction => reaction.emoji === emoji && reaction.user_id === currentUserId
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', message.id)
          .eq('user_id', currentUserId)
          .eq('emoji', emoji);

        if (error) throw error;
        console.log('Reaction removed successfully');
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: message.id,
            user_id: currentUserId,
            emoji: emoji
          });

        if (error) throw error;
        console.log('Reaction added successfully');
      }

      setShowEmojiPicker(false);
    } catch (error: any) {
      console.error('Error handling emoji reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive"
      });
    }
  };

  const handleReactionChange = () => {
    // This will trigger a refetch via the real-time subscription
    console.log('Reaction changed for message:', message.id);
  };

  // Function to render text with blue URLs
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div key={message.id} className="group hover:bg-gray-900" ref={messageRef}>
      <div className="flex items-start gap-2 px-5 py-2">
        {/* Avatar */}
        <div className="w-9 h-9 bg-purple-600 rounded flex items-center justify-center text-sm font-medium text-white flex-shrink-0 mt-0.5">
          {message.profiles.full_name?.[0]?.toUpperCase() || message.profiles.email[0]?.toUpperCase()}
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-bold text-white text-sm">
              {message.profiles.full_name || message.profiles.email}
            </span>
            <span className="text-xs text-gray-400 hover:underline cursor-pointer">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
            {message.is_pinned && (
              <Pin className="w-3 h-3 text-gray-400" />
            )}
          </div>
          
          {message.content && (
            <div className="text-white leading-relaxed text-sm">
              {renderTextWithLinks(message.content)}
            </div>
          )}
          
          {/* Display attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {message.attachments.map((attachment) => (
                <MessageAttachment
                  key={attachment.id}
                  attachment={attachment}
                />
              ))}
            </div>
          )}
          
          {/* Message Reactions */}
          <MessageReactions
            messageId={message.id}
            reactions={message.message_reactions || []}
            currentUserId={currentUserId}
            onReactionChange={handleReactionChange}
          />

          {/* Thread Reply Button, Emoji Button, and Pin Button - Always visible now */}
          <div className="flex items-center gap-1 mt-1 opacity-75 group-hover:opacity-100 transition-opacity">
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <Smile className="w-3 h-3 mr-1" />
              </Button>
            </EmojiPicker>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onThreadClick?.(message)}
              className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <Reply className="w-3 h-3 mr-1" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePinMessage}
              className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <Pin className="w-3 h-3 mr-1" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>

          {/* Thread Reply Count */}
          {message.reply_count && message.reply_count > 0 && (
            <button
              onClick={() => onThreadClick?.(message)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2 flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Read Receipts */}
          <ReadReceipts messageId={message.id} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, currentUserId, onThreadClick, workspaceId, channelName, channelId, onUpdateMessage, isDM }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400">No messages yet. Start the conversation!</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onThreadClick={onThreadClick}
          workspaceId={workspaceId}
          channelId={channelId}
          channelName={channelName}
          onUpdateMessage={onUpdateMessage}
          isDM={isDM}
        />
      ))}
    </div>
  );
}
