
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Hash, Lock, Plus, MessageSquare, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DirectMessagesList } from './DirectMessagesList';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
}

interface SidebarHomeViewProps {
  workspace: {
    id: string;
    name: string;
    invite_code: string;
  };
  channels: Channel[];
  selectedChannelId: string | null;
  selectedDmId: string | null;
  onChannelSelect: (channelId: string) => void;
  onDmSelect: (dmId: string) => void;
  onChannelsUpdate: () => void;
  createChannel: (e: React.FormEvent<HTMLFormElement>) => void;
  showCreateChannel: boolean;
  setShowCreateChannel: (v: boolean) => void;
  creating: boolean;
}

export function SidebarHomeView({
  workspace,
  channels,
  selectedChannelId,
  selectedDmId,
  onChannelSelect,
  onDmSelect,
  onChannelsUpdate,
  createChannel,
  showCreateChannel,
  setShowCreateChannel,
  creating
}: SidebarHomeViewProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Quick Access */}
      <div className="p-4 border-b border-[#3f0e40]">
        <div className="space-y-1">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-white hover:bg-[#3f0e40] transition-colors">
            <MessageSquare className="w-4 h-4" />
            Threads
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-white hover:bg-[#3f0e40] transition-colors">
            <Hash className="w-4 h-4" />
            Huddles
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-white hover:bg-[#3f0e40] transition-colors">
            <MessageSquare className="w-4 h-4" />
            Drafts & sent
          </button>
        </div>
      </div>
      {/* Channels Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button className="flex items-center gap-1 text-sm font-medium text-white hover:text-gray-300">
            <ChevronDown className="w-3 h-3" />
            Channels
          </button>
          <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto text-gray-400 hover:text-white hover:bg-[#3f0e40]">
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
        <div className="space-y-1 mb-4">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm transition-colors ${
                selectedChannelId === channel.id
                  ? 'bg-[#4a154b] text-white'
                  : 'text-white hover:bg-[#3f0e40]'
              }`}
            >
              {channel.type === 'public' ? (
                <Hash className="w-4 h-4 text-gray-400" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
        <button className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm text-white hover:bg-[#3f0e40] transition-colors">
          <Plus className="w-4 h-4" />
          Add channels
        </button>
      </div>
      {/* Direct Messages Section */}
      <div className="border-t border-[#3f0e40]">
        <DirectMessagesList 
          workspaceId={workspace.id}
          selectedDmId={selectedDmId}
          onDmSelect={onDmSelect}
        />
      </div>
    </div>
  );
}
