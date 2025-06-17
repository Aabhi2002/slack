
import { X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/message';
import { ThreadReplies } from './ThreadReplies';
import { formatDistanceToNow } from 'date-fns';

interface ThreadSidebarProps {
  message: Message | null;
  workspaceId: string;
  onClose: () => void;
  isDM?: boolean;
}

export function ThreadSidebar({ message, workspaceId, onClose, isDM = false }: ThreadSidebarProps) {
  if (!message) return null;

  return (
    <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col h-full min-h-0">
      {/* Thread Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <h3 className="text-white font-semibold">Thread</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Original Message - Fixed */}
      <div className="flex-shrink-0 border-b border-slate-700 p-4 max-h-48 overflow-y-auto">
        <div className="flex gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
            {message.profiles.full_name?.[0]?.toUpperCase() || message.profiles.email[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-bold text-white text-sm truncate">
                {message.profiles.full_name || message.profiles.email}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </span>
            </div>
            {message.content && (
              <div className="text-white leading-relaxed text-sm break-words">
                {message.content}
              </div>
            )}
            {message.reply_count !== undefined && message.reply_count > 0 && (
              <div className="text-xs text-slate-400 mt-2">
                {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thread Replies - Flexible, takes remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ThreadReplies threadId={message.id} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
