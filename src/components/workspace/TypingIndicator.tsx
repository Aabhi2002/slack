
import { useState, useEffect } from 'react';

interface TypingUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    if (typingUsers.length === 0) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [typingUsers.length]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      const user = typingUsers[0];
      const name = user.full_name || user.email;
      return `${name} is typing${dots}`;
    } else if (typingUsers.length === 2) {
      const names = typingUsers.map(u => u.full_name || u.email);
      return `${names[0]} and ${names[1]} are typing${dots}`;
    } else {
      const firstName = typingUsers[0].full_name || typingUsers[0].email;
      return `${firstName} and ${typingUsers.length - 1} others are typing${dots}`;
    }
  };

  return (
    <div className="px-6 py-2 text-sm text-slate-400 italic">
      {getTypingText()}
    </div>
  );
}
