import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Search } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface DirectMessage {
  id: string;
  user1_id: string;
  user2_id: string;
  other_user: User;
}

interface DirectMessagesListProps {
  workspaceId: string;
  selectedDmId: string | null;
  onDmSelect: (dmId: string) => void;
}

export function DirectMessagesList({ workspaceId, selectedDmId, onDmSelect }: DirectMessagesListProps) {
  const { user } = useAuth();
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    if (workspaceId && user) {
      fetchDirectMessages();
      fetchWorkspaceUsers();
    }
  }, [workspaceId, user]);

  const fetchDirectMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          user1_id,
          user2_id,
          user1:profiles!direct_messages_user1_id_fkey(id, email, full_name),
          user2:profiles!direct_messages_user2_id_fkey(id, email, full_name)
        `)
        .eq('workspace_id', workspaceId)
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (error) throw error;

      const dmsWithOtherUser = (data || []).map(dm => ({
        id: dm.id,
        user1_id: dm.user1_id,
        user2_id: dm.user2_id,
        other_user: dm.user1_id === user?.id ? dm.user2 : dm.user1
      }));

      setDirectMessages(dmsWithOtherUser);
    } catch (error: any) {
      console.error('Error fetching direct messages:', error);
    }
  };

  const fetchWorkspaceUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          profiles!workspace_members_user_id_fkey(
            id,
            email,
            full_name
          )
        `)
        .eq('workspace_id', workspaceId)
        .neq('user_id', user?.id);

      if (error) throw error;

      const users = (data || [])
        .map(member => member.profiles)
        .filter(Boolean);

      setWorkspaceUsers(users);
    } catch (error: any) {
      console.error('Error fetching workspace users:', error);
    }
  };

  const startDirectMessage = async (otherUserId: string) => {
    setLoading(true);
    try {
      // Check if DM already exists
      const { data: existingDm } = await supabase
        .from('direct_messages')
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user?.id})`)
        .single();

      if (existingDm) {
        onDmSelect(existingDm.id);
        return;
      }

      // Create new DM
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          workspace_id: workspaceId,
          user1_id: user?.id,
          user2_id: otherUserId
        })
        .select()
        .single();

      if (error) throw error;

      onDmSelect(data.id);
      await fetchDirectMessages();
    } catch (error: any) {
      console.error('Error starting direct message:', error);
      toast({
        title: "Error",
        description: "Failed to start direct message",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter direct messages by search input
  const filteredDirectMessages = search
    ? directMessages.filter(dm =>
        (dm.other_user.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (dm.other_user.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : directMessages;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">Direct Messages</span>
      </div>
      
      {/* Search bar with glassmorphism style */}
      <div className="relative mb-3 w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Find a DM"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/60 shadow-sm backdrop-blur-md focus:border-blue-400 transition outline-none"
          style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
        />
      </div>

      {/* Existing DMs */}
      <div className="space-y-1 mb-4">
        {filteredDirectMessages.length > 0 ? (
          filteredDirectMessages.map((dm) => (
            <button
              key={dm.id}
              onClick={() => onDmSelect(dm.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm transition-colors ${
                selectedDmId === dm.id
                  ? 'bg-purple-700 text-white'
                  : 'text-slate-300 hover:bg-purple-700/50 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="truncate">
                {dm.other_user.full_name || dm.other_user.email}
              </span>
            </button>
          ))
        ) : (
          <div className="text-xs text-slate-400 px-2 py-2">No direct messages found.</div>
        )}
      </div>

      {/* Available users to start DM with */}
      {workspaceUsers.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-2">Start new conversation</div>
          <div className="space-y-1">
            {workspaceUsers
              .filter(wsUser => !directMessages.some(dm => dm.other_user.id === wsUser.id))
              .map((wsUser) => (
                <button
                  key={wsUser.id}
                  onClick={() => startDirectMessage(wsUser.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm text-slate-400 hover:bg-purple-700/30 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span className="truncate">
                    {wsUser.full_name || wsUser.email}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
