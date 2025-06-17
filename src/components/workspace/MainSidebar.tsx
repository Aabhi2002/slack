import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { DirectMessagesList } from './DirectMessagesList';
import { ActivityFeed } from './ActivityFeed';
import { SidebarHomeView } from './SidebarHomeView';
import { SidebarDmsView } from './SidebarDmsView';
import { 
  Hash, 
  Lock, 
  Plus, 
  Search,
  MessageSquare,
  UserPlus,
  ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MainSidebarProps {
  activeView: 'home' | 'dms' | 'activity';
  workspace: {
    id: string;
    name: string;
    invite_code: string;
  };
  channels: Array<{
    id: string;
    name: string;
    type: 'public' | 'private';
  }>;
  selectedChannelId: string | null;
  selectedDmId: string | null;
  onChannelSelect: (channelId: string) => void;
  onDmSelect: (dmId: string) => void;
  onChannelsUpdate: () => void;
}

export function MainSidebar({ 
  activeView,
  workspace, 
  channels, 
  selectedChannelId,
  selectedDmId,
  onChannelSelect, 
  onDmSelect,
  onChannelsUpdate 
}: MainSidebarProps) {
  const { user } = useAuth();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [creating, setCreating] = useState(false);

  const createChannel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as 'public' | 'private';

    try {
      const { error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspace.id,
          name: name.toLowerCase().replace(/\s+/g, '-'),
          description,
          type,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Channel created!",
        description: `#${name} has been created successfully.`
      });

      setShowCreateChannel(false);
      onChannelsUpdate();
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create channel",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-64 bg-[#350d36] text-white flex flex-col border-r border-[#4a154b]">
      {/* Workspace Header */}
      <div className="p-4 border-b border-[#4a154b]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <span className="text-[#350d36] font-bold text-sm">
              {workspace.name[0]?.toUpperCase()}
            </span>
          </div>
          <h1 className="font-bold text-lg truncate">{workspace.name}</h1>
        </div>
      </div>

      {/* Dynamic Content */}
      {activeView === 'home' && (
        <SidebarHomeView
          workspace={workspace}
          channels={channels}
          selectedChannelId={selectedChannelId}
          selectedDmId={selectedDmId}
          onChannelSelect={onChannelSelect}
          onDmSelect={onDmSelect}
          onChannelsUpdate={onChannelsUpdate}
          createChannel={createChannel}
          showCreateChannel={showCreateChannel}
          setShowCreateChannel={setShowCreateChannel}
          creating={creating}
        />
      )}
      {activeView === 'dms' && (
        <SidebarDmsView
          workspaceId={workspace.id}
          selectedDmId={selectedDmId}
          onDmSelect={onDmSelect}
        />
      )}
      {activeView === 'activity' && (
        <ActivityFeed
          workspaceId={workspace.id}
          onChannelSelect={onChannelSelect}
        />
      )}
    </div>
  );
}
