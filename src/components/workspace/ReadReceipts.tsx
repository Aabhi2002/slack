
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useReadReceipts } from '@/hooks/useReadReceipts';

interface ReadReceiptsProps {
  messageId: string;
  currentUserId?: string;
}

export function ReadReceipts({ messageId, currentUserId }: ReadReceiptsProps) {
  const { readReceipts } = useReadReceipts(messageId);

  // Filter out the current user from read receipts display
  const otherUsersReadReceipts = readReceipts.filter(receipt => receipt.user_id !== currentUserId);

  if (otherUsersReadReceipts.length === 0) return null;

  const displayedReceipts = otherUsersReadReceipts.slice(0, 3);
  const remainingCount = otherUsersReadReceipts.length - displayedReceipts.length;

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-xs text-slate-400">Seen by</span>
      <div className="flex -space-x-1">
        {displayedReceipts.map((receipt) => (
          <div
            key={receipt.user_id}
            className="relative"
            title={`${receipt.profiles.full_name || receipt.profiles.email} - ${formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}`}
          >
            <Avatar className="w-4 h-4 border border-slate-600">
              <AvatarImage src={receipt.profiles.avatar_url} />
              <AvatarFallback className="text-xs bg-purple-600 text-white">
                {(receipt.profiles.full_name?.[0] || receipt.profiles.email[0])?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        ))}
        {remainingCount > 0 && (
          <div 
            className="w-4 h-4 bg-slate-600 rounded-full flex items-center justify-center text-xs text-white border border-slate-500"
            title={`+${remainingCount} more`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}
