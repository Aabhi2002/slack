
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThreadSidebar } from './ThreadSidebar';
import { PinnedMessagesModal } from './PinnedMessagesModal';
import { toast } from '@/hooks/use-toast';
import { Hash, Lock, Pin, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/message';
import { TypingIndicator } from './TypingIndicator';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { OrgBrainModal } from './OrgBrainModal';
import { MeetingNotesButton } from "./MeetingNotesButton";

interface ChatAreaProps {
  workspaceId: string;
  channelId: string | null;
  channels: Array<{
    id: string;
    name: string;
    type: 'public' | 'private';
  }>;
}

export function ChatArea({ workspaceId, channelId, channels }: ChatAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }>>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [showOrgBrain, setShowOrgBrain] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const currentChannelIdRef = useRef<string | null>(null);
  
  // Add typing indicator hook
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(channelId);

  const currentChannel = channels.find(c => c.id === channelId);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceMembers();
    }
  }, [workspaceId]);

  useEffect(() => {
    // If channelId hasn't changed, don't recreate the subscription
    if (currentChannelIdRef.current === channelId) {
      return;
    }

    // Clean up existing channel first
    if (channelRef.current) {
      console.log('Removing existing channel before creating new one:', currentChannelIdRef.current);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Update the current channel ID
    currentChannelIdRef.current = channelId;

    if (channelId) {
      fetchMessages();
      
      // Small delay to ensure previous channel is fully cleaned up
      setTimeout(() => {
        setupChannelSubscription();
      }, 100);
    } else {
      setMessages([]);
    }

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up channel on unmount:', channelId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId]);

  const setupChannelSubscription = () => {
    if (!channelId) return;

    const channelName = `chat-${channelId}-${Date.now()}`;
    console.log('Setting up new channel subscription:', channelName);
    
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          console.log('New message received:', payload.new);
          handleNewMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          console.log('Pinned messages changed, refetching...');
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log('Channel subscription status:', status, 'for:', channelName);
      });
  };

  const handleNewMessage = async (newMessage: any) => {
    setMessages(prevMessages => {
      // Check if this message already exists (including optimistic messages)
      const messageExists = prevMessages.some(msg => 
        msg.id === newMessage.id || 
        (msg.content === newMessage.content && 
         msg.sender_id === newMessage.sender_id &&
         Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000)
      );
      
      if (messageExists) {
        console.log('Message already exists, skipping duplicate');
        return prevMessages;
      }

      const basicMessage: Message = {
        id: newMessage.id,
        content: newMessage.content,
        sender_id: newMessage.sender_id,
        created_at: newMessage.created_at,
        is_pinned: false,
        profiles: {
          full_name: '',
          email: ''
        },
        message_reactions: [],
        attachments: []
      };
      
      // Remove any optimistic messages that match this real message
      const filteredMessages = prevMessages.filter(msg => {
        if (msg.id.startsWith('optimistic-')) {
          const isMatchingOptimistic = 
            msg.content === newMessage.content && 
            msg.sender_id === newMessage.sender_id &&
            Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 10000;
          return !isMatchingOptimistic;
        }
        return true;
      });
      
      const newMessages = [...filteredMessages, basicMessage];
      
      // Fetch complete message data in background
      fetchCompleteMessageData(newMessage.id);
      
      return newMessages;
    });
  };

  const fetchCompleteMessageData = async (messageId: string) => {
    try {
      const { data } = await supabase
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
          ),
          attachments (
            id,
            file_url,
            file_type,
            file_name,
            file_size
          )
        `)
        .eq('id', messageId)
        .single();

      if (data) {
        const { data: pinnedData } = await supabase
          .from('pinned_messages')
          .select('id')
          .eq('message_id', data.id)
          .eq('channel_id', channelId)
          .single();

        setMessages(prev => prev.map(msg => 
          msg.id === data.id 
            ? { ...data, is_pinned: !!pinnedData }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error fetching complete message data:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchWorkspaceMembers = async () => {
    if (!workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          profiles (
            full_name,
            email
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      
      const members = data?.map(member => ({
        id: member.user_id,
        profiles: member.profiles
      })) || [];
      
      setWorkspaceMembers(members);
      setMemberCount(members.length);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
    }
  };

  const fetchMessages = async () => {
    if (!channelId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          reply_count,
          profiles (
            full_name,
            email
          ),
          message_reactions (
            emoji,
            user_id
          ),
          attachments (
            id,
            file_url,
            file_type,
            file_name,
            file_size
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      const messageIds = data?.map(msg => msg.id) || [];
      const { data: pinnedData } = await supabase
        .from('pinned_messages')
        .select('message_id')
        .eq('channel_id', channelId)
        .in('message_id', messageIds);

      const pinnedMessageIds = new Set(pinnedData?.map(p => p.message_id) || []);
      
      const messagesWithPinStatus = data?.map(msg => ({
        ...msg,
        is_pinned: pinnedMessageIds.has(msg.id)
      })) || [];
      
      setMessages(messagesWithPinStatus);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, ...updates }
        : msg
    ));
  };

  const uploadFile = async (file: File, messageId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${messageId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      const { error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          workspace_id: workspaceId,
          message_id: messageId,
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user?.id
        });

      if (attachmentError) throw attachmentError;

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const sendMessage = async (content: string, attachment?: { file: File }) => {
    if (!channelId || (!content.trim() && !attachment)) return;

    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();

    try {
      // Create optimistic message with proper ID format
      const optimisticMessage: Message = {
        id: optimisticId,
        content: content.trim() || null,
        sender_id: user?.id || '',
        created_at: now,
        is_pinned: false,
        profiles: {
          full_name: user?.user_metadata?.full_name || user?.email || '',
          email: user?.email || ''
        },
        message_reactions: [],
        attachments: []
      };

      console.log('Adding optimistic message:', optimisticMessage);
      
      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to database
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content: content.trim() || null,
          channel_id: channelId,
          sender_id: user?.id
        })
        .select()
        .single();

      if (messageError) throw messageError;

      console.log('Message saved to database:', messageData);

      // Handle file attachment if present
      if (attachment) {
        await uploadFile(attachment.file, messageData.id);
      }

      // The real-time subscription will handle replacing the optimistic message
      // with the real one from the database
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleThreadClick = (message: Message) => {
    setSelectedThread(message);
  };

  const handleCloseThread = () => {
    setSelectedThread(null);
  };

  if (!channelId) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">Welcome to your workspace!</div>
          <div className="text-gray-500 text-sm">Select a channel from the sidebar to start messaging</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-black flex">
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header Bar */}
        <div className="h-12 bg-black border-b border-gray-700 flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {currentChannel?.type === 'public' ? (
                <Hash className="w-4 h-4 text-gray-400" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
              <h2 className="text-white font-semibold text-sm">
                {currentChannel?.name}
              </h2>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOrgBrain(true)}
              className="h-7 px-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 transition-colors"
              title="Ask Org Brain"
            >
              🤖
              <span className="ml-1 text-xs hidden sm:inline">Org Brai</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPinnedModal(true)}
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="View pinned messages"
            >
              <Pin className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Channel details"
            >
              <Info className="w-4 h-4" />
            </Button>
            {/* Meeting Notes Button */}
            <MeetingNotesButton messages={messages} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-black">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-400 text-sm">Loading messages...</div>
              </div>
            </div>
          ) : (
            <MessageList 
              messages={messages} 
              currentUserId={user?.id} 
              onThreadClick={handleThreadClick}
              workspaceId={workspaceId}
              channelName={currentChannel?.name}
              channelId={channelId}
              onUpdateMessage={handleUpdateMessage}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Add typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        <div className="border-t border-gray-700 bg-black">
          <MessageInput 
            onSendMessage={sendMessage}
            workspaceMembers={workspaceMembers}
            showChannelMention={true}
            onTyping={handleTyping}
            onStopTyping={stopTyping}
          />
        </div>
      </div>

      {selectedThread && (
        <ThreadSidebar
          message={selectedThread}
          workspaceId={workspaceId}
          onClose={handleCloseThread}
        />
      )}

      {showPinnedModal && (
        <PinnedMessagesModal
          channelId={channelId}
          workspaceId={workspaceId}
          onClose={() => setShowPinnedModal(false)}
        />
      )}

      {showOrgBrain && (
        <OrgBrainModal
          open={showOrgBrain}
          onClose={() => setShowOrgBrain(false)}
          channelId={channelId || ''}
          channelName={currentChannel?.name}
        />
      )}
    </div>
  );
}
