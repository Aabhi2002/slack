
import { useMemo } from 'react';

interface MentionTextProps {
  content: string;
  workspaceMembers?: Array<{
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }>;
  channelName?: string;
}

export function MentionText({ content, workspaceMembers = [], channelName }: MentionTextProps) {
  const parsedContent = useMemo(() => {
    const parts = [];
    let lastIndex = 0;
    
    // Regular expression to match @username or @channel mentions
    const mentionRegex = /@(\w+|channel)/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
          key: `text-${lastIndex}`
        });
      }
      
      const mentionText = match[1];
      
      if (mentionText === 'channel') {
        // @channel mention
        parts.push({
          type: 'channel-mention',
          content: match[0],
          key: `mention-${match.index}`
        });
      } else {
        // Check if it's a valid user mention
        const mentionedUser = workspaceMembers.find(member => 
          member.profiles.full_name?.toLowerCase().includes(mentionText.toLowerCase()) ||
          member.profiles.email.toLowerCase().includes(mentionText.toLowerCase())
        );
        
        if (mentionedUser) {
          parts.push({
            type: 'user-mention',
            content: match[0],
            userId: mentionedUser.id,
            key: `mention-${match.index}`
          });
        } else {
          // Not a valid mention, treat as regular text
          parts.push({
            type: 'text',
            content: match[0],
            key: `text-${match.index}`
          });
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
        key: `text-${lastIndex}`
      });
    }
    
    return parts;
  }, [content, workspaceMembers]);

  return (
    <span>
      {parsedContent.map((part) => {
        switch (part.type) {
          case 'user-mention':
            return (
              <span
                key={part.key}
                className="bg-blue-600/20 text-blue-300 px-1 rounded font-medium"
              >
                {part.content}
              </span>
            );
          case 'channel-mention':
            return (
              <span
                key={part.key}
                className="bg-yellow-600/20 text-yellow-300 px-1 rounded font-medium"
              >
                {part.content}
              </span>
            );
          default:
            return <span key={part.key}>{part.content}</span>;
        }
      })}
    </span>
  );
}
