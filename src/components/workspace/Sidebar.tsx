
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { DirectMessagesList } from './DirectMessagesList';
import { 
  Hash, 
  Lock, 
  Plus, 
  Settings, 
  Users, 
  LogOut,
  Copy,
  ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
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

export function Sidebar({ 
  workspace, 
  channels, 
  selectedChannelId,
  selectedDmId,
  onChannelSelect, 
  onDmSelect,
  onChannelsUpdate 
}: SidebarProps) {
  const { user, signOut } = useAuth();
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

  const copyInviteCode = () => {
    navigator.clipboard.writeText(workspace.invite_code);
    toast({
      title: "Invite code copied!",
      description: "Share this code with others to invite them to your workspace."
    });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-purple-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-white hover:bg-purple-700">
              <span className="font-semibold truncate">{workspace.name}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700">
            <DropdownMenuItem 
              onClick={copyInviteCode}
              className="text-white hover:bg-slate-700"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy invite code
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-400 hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Channels Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Channels</span>
            <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-auto text-slate-300 hover:text-white hover:bg-purple-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Channel</DialogTitle>
                </DialogHeader>
                <form onSubmit={createChannel} className="space-y-4">
                  <div>
                    <Input
                      name="name"
                      placeholder="Channel name"
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <Input
                      name="description"
                      placeholder="Description (optional)"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-white">
                      <input type="radio" name="type" value="public" defaultChecked />
                      <Hash className="w-4 h-4" />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input type="radio" name="type" value="private" />
                      <Lock className="w-4 h-4" />
                      Private
                    </label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Channel'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-purple-700 text-white'
                    : 'text-slate-300 hover:bg-purple-700/50 hover:text-white'
                }`}
              >
                {channel.type === 'public' ? (
                  <Hash className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <DirectMessagesList 
          workspaceId={workspace.id}
          selectedDmId={selectedDmId}
          onDmSelect={onDmSelect}
        />
      </div>

      {/* User Info with Logout Button */}
      <div className="p-4 border-t border-purple-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.email}</div>
            <div className="text-xs text-slate-300">Online</div>
          </div>
        </div>
        <Button 
          onClick={handleLogout}
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-purple-700/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
