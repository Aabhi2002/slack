import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Hash } from 'lucide-react';

interface ActivityFeedProps {
  workspaceId: string;
  onChannelSelect: (channelId: string) => void;
}

type Mention = {
  id: string;
  content: string;
  created_at: string;
  channel_name: string;
  channel_id: string;
  sender_name: string;
  sender_email: string;
};

export function ActivityFeed({ workspaceId, onChannelSelect }: ActivityFeedProps) {
  const [channelMentions, setChannelMentions] = useState<Mention[]>([]);

  useEffect(() => {
    fetchChannelMentions();
    // eslint-disable-next-line
  }, [workspaceId]);

  const fetchChannelMentions = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          channels!inner(name),
          profiles!inner(full_name, email)
        `)
        .eq('channels.workspace_id', workspaceId)
        .ilike('content', '%@channel%')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const mentions = data?.map((msg: any) => ({
        id: msg.id,
        content: msg.content || '',
        created_at: msg.created_at,
        channel_name: (msg.channels as any)?.name || '',
        channel_id: msg.channel_id || '',
        sender_name: (msg.profiles as any)?.full_name || 'Unknown',
        sender_email: (msg.profiles as any)?.email || ''
      })) || [];

      setChannelMentions(mentions);
    } catch (error) {
      console.error('Error fetching channel mentions:', error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-[#3f0e40]">
        <h2 className="text-lg font-semibold text-white mb-3">Activity</h2>
        <div className="flex gap-4 text-xs">
          <button className="text-white border-b-2 border-white pb-1">All</button>
          <button className="text-gray-400 hover:text-white">@ Mentions</button>
          <button className="text-gray-400 hover:text-white">Threads</button>
          <button className="text-gray-400 hover:text-white">Reactions</button>
        </div>
      </div>

      <div className="p-2">
        {channelMentions.length > 0 ? (
          <div className="space-y-1">
            {channelMentions.map((mention) => (
              <div 
                key={mention.id}
                className="flex items-start gap-3 p-3 hover:bg-[#3f0e40] rounded cursor-pointer"
                onClick={() => onChannelSelect(mention.channel_id)}
              >
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-sm font-medium text-white flex-shrink-0 mt-1">
                  {mention.sender_name[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm">@channel mention in</span>
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-blue-300 text-sm font-medium">
                      {mention.channel_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white text-sm font-medium">
                      {mention.sender_name}
                    </span>
                    <span className="text-yellow-400 text-sm">@channel</span>
                    <span className="text-gray-400 text-sm">
                      {mention.content.replace('@channel', '').trim().substring(0, 50)}
                      {mention.content.length > 50 ? '...' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(mention.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(mention.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">
            No @channel mentions found
          </div>
        )}
      </div>
    </div>
  );
}
