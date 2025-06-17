
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { 
  Hash, 
  Lock, 
  Plus, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut
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
import { Input } from '@/components/ui/input';

interface ModernSidebarProps {
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
  workspaceMembers: Array<{
    id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
}

interface DirectMessage {
  id: string;
  participants: Array<{
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }>;
  other_user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function ModernSidebar({ 
  workspace, 
  channels, 
  selectedChannelId,
  selectedDmId,
  onChannelSelect, 
  onDmSelect,
  onChannelsUpdate,
  workspaceMembers
}: ModernSidebarProps) {
  const { user, signOut } = useAuth();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [showDmDropdown, setShowDmDropdown] = useState(false);

  useEffect(() => {
    fetchDirectMessages();
  }, [workspace.id]);

  const fetchDirectMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          participants:direct_message_participants(
            user_id,
            profiles(full_name, email)
          )
        `)
        .eq('workspace_id', workspace.id);

      if (error) throw error;

      const dms = data?.map((dm: any) => ({
        id: dm.id,
        participants: dm.participants || [],
        other_user: dm.participants?.find((p: any) => p.user_id !== user?.id)?.profiles || {}
      })) || [];

      setDirectMessages(dms);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
    }
  };

  const startDirectMessage = async (otherUserId: string) => {
    try {
      // Check if DM already exists
      const { data: existingDm } = await supabase
        .from('direct_messages')
        .select('id')
        .eq('workspace_id', workspace.id)
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user?.id})`)
        .single();

      if (existingDm) {
        onDmSelect(existingDm.id);
        setShowDmDropdown(false);
        return;
      }

      // Create new DM
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          workspace_id: workspace.id,
          user1_id: user?.id,
          user2_id: otherUserId
        })
        .select()
        .single();

      if (error) throw error;

      onDmSelect(data.id);
      await fetchDirectMessages();
      setShowDmDropdown(false);
    } catch (error: any) {
      console.error('Error starting direct message:', error);
      toast({
        title: "Error",
        description: "Failed to start direct message",
        variant: "destructive"
      });
    }
  };

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
    <div className="w-72 bg-slate-950/80 backdrop-blur-xl border-r border-slate-700/30 text-white flex flex-col relative overflow-hidden">
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
      
      {/* Workspace Header */}
      <div className="relative p-4 border-b border-slate-700/40 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-white hover:bg-slate-800/50 backdrop-blur-sm rounded-xl transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {workspace.name[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="font-semibold truncate">{workspace.name}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-slate-900/95 backdrop-blur-sm border-slate-700">
            <DropdownMenuItem className="text-white hover:bg-slate-800">
              <Settings className="w-4 h-4 mr-2" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-400 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Area - Made scrollable */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Channels Section */}
        <div className="p-3">
          <button
            onClick={() => setChannelsExpanded(!channelsExpanded)}
            className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-800/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              {channelsExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              )}
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Channels
              </span>
            </div>
            <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded-md hover:bg-slate-700/50 group-hover:opacity-100 opacity-60 transition-all duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900/95 backdrop-blur-sm border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Channel</DialogTitle>
                </DialogHeader>
                <form onSubmit={createChannel} className="space-y-4">
                  <Input
                    name="name"
                    placeholder="Channel name"
                    required
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <Input
                    name="description"
                    placeholder="Description (optional)"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input type="radio" name="type" value="public" defaultChecked className="text-purple-500" />
                      <Hash className="w-4 h-4" />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input type="radio" name="type" value="private" className="text-purple-500" />
                      <Lock className="w-4 h-4" />
                      Private
                    </label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Channel'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </button>

          {channelsExpanded && (
            <div className="mt-2 space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 group ${
                    selectedChannelId === channel.id
                      ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  {channel.type === 'public' ? (
                    <Hash className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="p-3">
          <button
            onClick={() => setDmsExpanded(!dmsExpanded)}
            className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-800/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              {dmsExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              )}
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Direct Messages
              </span>
            </div>
            <DropdownMenu open={showDmDropdown} onOpenChange={setShowDmDropdown}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded-md hover:bg-slate-700/50 group-hover:opacity-100 opacity-60 transition-all duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-slate-900/95 backdrop-blur-sm border-slate-700 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-slate-400 mb-2">Start a conversation</div>
                  {workspaceMembers
                    .filter(member => member.profiles.id !== user?.id)
                    .filter(member => !directMessages.some(dm => dm.other_user.id === member.profiles.id))
                    .map((member) => (
                      <DropdownMenuItem 
                        key={member.profiles.id}
                        onClick={() => startDirectMessage(member.profiles.id)}
                        className="text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <Avatar className="w-6 h-6 mr-2">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                            {member.profiles.full_name?.[0]?.toUpperCase() || member.profiles.email?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {member.profiles.full_name || member.profiles.email}
                        </span>
                      </DropdownMenuItem>
                    ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </button>

          {dmsExpanded && (
            <div className="mt-2 space-y-1">
              {directMessages.map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => onDmSelect(dm.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 group ${
                    selectedDmId === dm.id
                      ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-white border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                      {dm.other_user.full_name?.[0]?.toUpperCase() || dm.other_user.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {dm.other_user.full_name || dm.other_user.email || 'Unknown User'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Section at Bottom */}
      <div className="relative p-4 border-t border-slate-700/40 bg-slate-950/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              {user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-white">{user?.email}</div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs text-slate-300">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
