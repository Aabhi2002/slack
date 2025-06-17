import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile } from 'lucide-react';
import { MentionAutocomplete } from './MentionAutocomplete';
import { FileUpload } from './FileUpload';
import { EmojiPicker } from './EmojiPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { MessageToneAnalysis } from './MessageToneAnalysis';
import { analyzeTone, ToneAnalysis } from '@/utils/analyzeTone';

interface MessageInputProps {
  onSendMessage: (content: string, attachment?: { file: File }) => void;
  workspaceMembers?: Array<{
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }>;
  showChannelMention?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function MessageInput({ 
  onSendMessage, 
  workspaceMembers = [], 
  showChannelMention = true,
  onTyping,
  onStopTyping
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
  const [toneLoading, setToneLoading] = useState(false);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMentions && textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentions]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Debounced tone analysis logic
  useEffect(() => {
    if (!message.trim()) {
      setToneAnalysis(null);
      setToneLoading(false);
      return;
    }
    setToneLoading(true);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = setTimeout(() => {
      setToneLoading(true);
      analyzeTone(message.trim()).then((res) => {
        setToneAnalysis(res);
        setToneLoading(false);
      }).catch(() => setToneLoading(false));
    }, 1200); // fires about 1.2s after typing stops

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && !selectedFile) return;
    
    // Stop typing when sending message
    onStopTyping?.();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    setUploading(true);
    
    try {
      if (selectedFile) {
        onSendMessage(message.trim(), { file: selectedFile });
      } else {
        onSendMessage(message.trim());
      }
      
      setMessage('');
      setSelectedFile(null);
      setShowMentions(false);
      setToneAnalysis(null);
      setToneLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setMessage(value);
    setCursorPosition(cursorPos);

    // Handle typing indicators
    if (value.trim() && onTyping) {
      onTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 3000);
    } else if (!value.trim() && onStopTyping) {
      onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          
          const lineHeight = 24;
          const charWidth = 8;
          const lines = textBeforeCursor.split('\n');
          const currentLine = lines.length - 1;
          const charInLine = lines[currentLine].length;
          
          setMentionPosition({
            top: rect.top - 250 + (currentLine * lineHeight),
            left: rect.left + (charInLine * charWidth)
          });
        }
        
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      
      // Set cursor position after the emoji
      setTimeout(() => {
        const newCursorPos = start + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  const handleMentionSelect = (mention: string) => {
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const newText = textBeforeCursor.slice(0, atIndex) + mention + ' ' + textAfterCursor;
      setMessage(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = atIndex + mention.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowMentions(false);
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-700 relative">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (use @ to mention)"
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 resize-none min-h-[44px] max-h-32"
            rows={1}
            disabled={uploading}
          />
          
          <div className="absolute bottom-2 right-2 flex gap-1">
            <FileUpload
              onFileSelect={setSelectedFile}
              onFileRemove={() => setSelectedFile(null)}
              selectedFile={selectedFile}
              disabled={uploading}
            />
            <EmojiPicker onEmojiSelect={handleEmojiSelect}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                disabled={uploading}
              >
                <Smile className="w-4 h-4" />
              </Button>
            </EmojiPicker>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={(!message.trim() && !selectedFile) || uploading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
      <MessageToneAnalysis data={toneAnalysis} loading={toneLoading} />
      <MentionAutocomplete
        isOpen={showMentions}
        onClose={() => setShowMentions(false)}
        onSelect={handleMentionSelect}
        searchText={mentionSearch}
        workspaceMembers={workspaceMembers}
        position={mentionPosition}
        showChannel={showChannelMention}
      />
    </div>
  );
}
