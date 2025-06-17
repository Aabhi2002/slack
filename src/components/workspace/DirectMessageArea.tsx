import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { PinnedMessages } from './PinnedMessages';
import { ThreadSidebar } from './ThreadSidebar';
import { toast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';
import { Message } from '@/types/message';

interface DirectMessage {
  id: string;
  user1_id: string;
  user2_id: string;
  user1: {
    full_name: string | null;
    email: string;
  };
  user2: {
    full_name: string | null;
    email: string;
  };
}

interface DirectMessageAreaProps {
  workspaceId: string;
  dmId: string | null;
}

export function DirectMessageArea({ workspaceId, dmId }: DirectMessageAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmInfo, setDmInfo] = useState<DirectMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const currentDmIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up existing channel first, regardless of dmId change
    if (channelRef.current) {
      console.log('Cleaning up existing DM channel:', currentDmIdRef.current);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Update the current DM ID
    currentDmIdRef.current = dmId;

    if (dmId) {
      fetchDmInfo();
      fetchMessages();
      
      // Small delay to ensure previous channel is fully cleaned up
      setTimeout(() => {
        setupDmSubscription();
      }, 200);
    } else {
      setMessages([]);
      setDmInfo(null);
    }

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up DM channel on unmount:', dmId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [dmId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupDmSubscription = () => {
    if (!dmId) return;

    // Create unique channel name with timestamp to avoid conflicts
    const channelName = `dm-messages-${dmId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Setting up new DM subscription:', channelName);
    
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `dm_id=eq.${dmId}`
        },
        async (payload) => {
          console.log('New DM message received:', payload.new);
          handleNewMessage(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('DM subscription status:', status, 'for:', channelName);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to DM channel:', dmId);
        }
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
        console.log('DM message already exists, skipping duplicate');
        return prevMessages;
      }

      const basicMessage: Message = {
        id: newMessage.id,
        content: newMessage.content,
        sender_id: newMessage.sender_id,
        created_at: newMessage.created_at,
        profiles: {
          full_name: '',
          email: ''
        },
        message_reactions: []
      };
      
      // Remove any optimistic messages that match this real message
      const filteredMessages = prevMessages.filter(msg => {
        if (msg.id.startsWith('optimistic-dm-')) {
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
        setMessages(prev => prev.map(msg => 
          msg.id === data.id ? data : msg
        ));
      }
    } catch (error) {
      console.error('Error fetching complete DM message data:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDmInfo = async () => {
    if (!dmId) return;
    
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          user1_id,
          user2_id,
          user1:profiles!direct_messages_user1_id_fkey(full_name, email),
          user2:profiles!direct_messages_user2_id_fkey(full_name, email)
        `)
        .eq('id', dmId)
        .single();

      if (error) throw error;
      setDmInfo(data);
    } catch (error: any) {
      console.error('Error fetching DM info:', error);
    }
  };

  const fetchMessages = async () => {
    if (!dmId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
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
        .eq('dm_id', dmId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
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
    if (!dmId || (!content.trim() && !attachment)) return;

    const optimisticId = `optimistic-dm-${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();

    try {
      // Create optimistic message with proper ID format
      const optimisticMessage: Message = {
        id: optimisticId,
        content: content.trim() || null,
        sender_id: user?.id || '',
        created_at: now,
        profiles: {
          full_name: user?.user_metadata?.full_name || user?.email || '',
          email: user?.email || ''
        },
        message_reactions: [],
        attachments: []
      };

      console.log('Adding optimistic DM message:', optimisticMessage);
      
      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to database
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content: content.trim() || null,
          dm_id: dmId,
          sender_id: user?.id
        })
        .select()
        .single();

      if (messageError) throw messageError;

      console.log('DM message saved to database:', messageData);

      if (attachment) {
        await uploadFile(attachment.file, messageData.id);
      }
    } catch (error: any) {
      console.error('Error sending DM message:', error);
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleUpdateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  };

  const handleThreadClick = (message: Message) => {
    setThreadMessage(message);
  };

  const handleCloseThread = () => {
    setThreadMessage(null);
  };

  if (!dmId) {
    return (
      <div className="flex-1 bg-slate-800 flex items-center justify-center">
        <div className="text-slate-400">Select a direct message to start chatting</div>
      </div>
    );
  }

  const otherUser = dmInfo ? (
    dmInfo.user1_id === user?.id ? dmInfo.user2 : dmInfo.user1
  ) : null;

  return (
    <div className="flex-1 bg-slate-800 flex">
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center px-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-slate-400" />
            <h2 className="text-white font-semibold text-lg">
              {otherUser ? (otherUser.full_name || otherUser.email) : 'Direct Message'}
            </h2>
          </div>
        </div>

        <PinnedMessages 
          channelId={dmId} 
          workspaceId={workspaceId} 
          isDM={true}
        />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-slate-400">Loading messages...</div>
            </div>
          ) : (
            <MessageList 
              messages={messages} 
              currentUserId={user?.id} 
              workspaceId={workspaceId}
              channelId={dmId}
              channelName={`DM with ${otherUser ? (otherUser.full_name || otherUser.email) : 'User'}`}
              onThreadClick={handleThreadClick}
              onUpdateMessage={handleUpdateMessage}
              isDM={true}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        <MessageInput 
          onSendMessage={sendMessage}
          workspaceMembers={[]}
          showChannelMention={false}
        />
      </div>

      {threadMessage && (
        <ThreadSidebar
          message={threadMessage}
          workspaceId={workspaceId}
          onClose={handleCloseThread}
          isDM={true}
        />
      )}
    </div>
  );
}
