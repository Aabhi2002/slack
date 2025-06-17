
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥',
  '✅', '❌', '⚡', '💯', '🚀', '👀', '💪', '🤝', '💡', '⭐'
];

export function EmojiPicker({ onEmojiSelect, onClose, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    console.log('Emoji clicked:', emoji);
    onEmojiSelect(emoji);
    setOpen(false);
    onClose?.();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-white hover:bg-gray-700">
            <Smile className="w-3 h-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-gray-800 border-gray-600" align="start">
        <div className="grid grid-cols-5 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
