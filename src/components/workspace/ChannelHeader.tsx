import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Hash, Users, Brain, FileText, Plus, Pin } from 'lucide-react';
import { useState } from 'react';
import { OrgBrainModal } from './OrgBrainModal';
import { MeetingNotesButton } from './MeetingNotesButton';
import { Message } from '@/types/message';

interface ChannelHeaderProps {
  channel: {
    id: string;
    name: string;
    type: 'public' | 'private';
  };
  memberCount: number;
  workspaceMembers: Array<{
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }>;
  messages: Message[];
  onShowPinnedMessages: () => void;
}

export function ChannelHeader({ channel, memberCount, workspaceMembers, messages, onShowPinnedMessages }: ChannelHeaderProps) {
  const [showOrgBrain, setShowOrgBrain] = useState(false);

  return (
    <div className="bg-slate-900/90 backdrop-blur-lg border-b border-slate-700/50 p-4">
      <div className="flex items-center justify-between">
        {/* Left side - Channel info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-white">
              <Hash className="w-5 h-5 text-slate-400" />
              <h1 className="text-xl font-semibold">{channel.name}</h1>
            </div>
          </div>
          
          {/* Divider */}
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>
          
          {/* Member count with avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {workspaceMembers.slice(0, 3).map((member, index) => (
                <Avatar key={member.id} className="w-6 h-6 border-2 border-slate-900 ring-2 ring-slate-700/50">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs font-medium">
                    {member.profiles.full_name?.[0]?.toUpperCase() || member.profiles.email[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {memberCount > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 ring-2 ring-slate-700/50 flex items-center justify-center">
                  <span className="text-xs text-slate-300 font-medium">+{memberCount - 3}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{memberCount} members</span>
            </div>
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-3">
          {/* Org Brain Button */}
          <Button
            variant="ghost"
            onClick={() => setShowOrgBrain(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20 hover:border-purple-400/40 rounded-full px-4 py-2 h-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="text-sm font-medium text-purple-200 group-hover:text-purple-100">Org Brain</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Button>

          {/* Pin Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowPinnedMessages}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors rounded-full"
            title="View pinned messages"
          >
            <Pin className="w-4 h-4" />
          </Button>

          {/* Meeting Notes Button */}
          <div className="group relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-400/40 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20">
            <MeetingNotesButton 
              messages={messages}
              className="flex items-center gap-2 px-4 py-2 h-auto text-emerald-200 hover:text-emerald-100 hover:bg-transparent"
            >
              <FileText className="w-4 h-4 text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium">Notes</span>
            </MeetingNotesButton>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>

      {/* Org Brain Modal */}
      <OrgBrainModal
        open={showOrgBrain}
        onClose={() => setShowOrgBrain(false)}
        channelId={channel.id}
      />
    </div>
  );
}
