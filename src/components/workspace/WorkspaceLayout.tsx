
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LeftSidebar } from './LeftSidebar';
import { ModernSidebar } from './ModernSidebar';
import { ChatArea } from './ChatArea';
import { DirectMessageArea } from './DirectMessageArea';
import { ActivityFeed } from './ActivityFeed';
import { ThreadSidebar } from './ThreadSidebar';
import { ChannelHeader } from './ChannelHeader';
import type { Message } from '@/types/message';

export function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'dms' | 'activity'>('home');
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('WorkspaceLayout rendering with:', {
    workspaceId,
    user: user?.id,
    workspace: workspace?.id,
    channelsCount: channels.length,
    selectedChannelId,
    activeView,
    loading
  });

  useEffect(() => {
    console.log('WorkspaceLayout useEffect triggered:', { workspaceId, userId: user?.id });
    if (workspaceId && user) {
      fetchWorkspace();
      fetchChannels();
      fetchWorkspaceMembers();
    }
  }, [workspaceId, user]);

  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages();
    }
  }, [selectedChannelId]);

  const fetchWorkspace = async () => {
    console.log('Fetching workspace:', workspaceId);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      console.log('Workspace fetch result:', { data, error });
      if (error) throw error;
      setWorkspace(data);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast({
        title: "Error",
        description: "Failed to load workspace",
        variant: "destructive"
      });
    }
  };

  const fetchChannels = async () => {
    console.log('Fetching channels for workspace:', workspaceId);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at');

      console.log('Channels fetch result:', { data, error });
      if (error) throw error;
      setChannels(data || []);
      
      if (data && data.length > 0 && !selectedChannelId) {
        console.log('Auto-selecting first channel:', data[0].id);
        setSelectedChannelId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      setWorkspaceMembers(data || []);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChannelId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles(full_name, email),
          message_reactions(
            emoji,
            user_id
          ),
          thread_replies(
            id,
            content,
            created_at,
            user_id,
            profiles(full_name, email)
          )
        `)
        .eq('channel_id', selectedChannelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedDmId(null);
    setActiveView('home');
    setThreadMessage(null);
  };

  const handleDmSelect = (dmId: string) => {
    setSelectedDmId(dmId);
    setSelectedChannelId(null);
    setActiveView('dms');
    setThreadMessage(null);
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  console.log('About to render UI with:', {
    loading,
    workspace: !!workspace,
    selectedChannel: !!selectedChannel,
    activeView
  });

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    console.log('Rendering workspace not found');
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Workspace not found</div>
      </div>
    );
  }

  console.log('Rendering main workspace layout');
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <LeftSidebar 
        activeView={activeView}
        onViewChange={setActiveView}
      />
      
      <ModernSidebar
        workspace={workspace}
        channels={channels}
        selectedChannelId={selectedChannelId}
        selectedDmId={selectedDmId}
        onChannelSelect={handleChannelSelect}
        onDmSelect={handleDmSelect}
        onChannelsUpdate={fetchChannels}
        workspaceMembers={workspaceMembers}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel && (
          <ChannelHeader
            channel={selectedChannel}
            memberCount={workspaceMembers.length}
            workspaceMembers={workspaceMembers}
            messages={messages}
          />
        )}
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeView === 'home' && selectedChannelId && (
              <ChatArea
                workspaceId={workspaceId!}
                channelId={selectedChannelId}
                channels={channels}
              />
            )}
            {activeView === 'dms' && selectedDmId && (
              <DirectMessageArea
                workspaceId={workspaceId!}
                dmId={selectedDmId}
              />
            )}
            {activeView === 'activity' && (
              <ActivityFeed
                workspaceId={workspaceId!}
                onChannelSelect={handleChannelSelect}
              />
            )}
          </div>
          
          {threadMessage && (
            <ThreadSidebar
              message={threadMessage}
              workspaceId={workspaceId!}
              onClose={() => setThreadMessage(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
