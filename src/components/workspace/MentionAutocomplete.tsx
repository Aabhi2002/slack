
import { useState, useEffect } from 'react';

interface MentionAutocompleteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mention: string) => void;
  searchText: string;
  workspaceMembers: Array<{
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }>;
  position: { top: number; left: number };
  showChannel?: boolean;
}

export function MentionAutocomplete({ 
  isOpen, 
  onClose, 
  onSelect, 
  searchText, 
  workspaceMembers,
  position,
  showChannel = true
}: MentionAutocompleteProps) {
  const [filteredMembers, setFilteredMembers] = useState(workspaceMembers);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!searchText) {
      setFilteredMembers(workspaceMembers);
      setSelectedIndex(0);
      return;
    }

    const filtered = workspaceMembers.filter(member => {
      const fullName = member.profiles.full_name?.toLowerCase() || '';
      const email = member.profiles.email.toLowerCase();
      const search = searchText.toLowerCase();
      
      return fullName.includes(search) || email.includes(search);
    });
    
    setFilteredMembers(filtered);
    setSelectedIndex(0);
  }, [searchText, workspaceMembers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = (showChannel ? 1 : 0) + filteredMembers.length;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          e.preventDefault();
          if (showChannel && selectedIndex === 0) {
            onSelect('@channel');
          } else {
            const memberIndex = showChannel ? selectedIndex - 1 : selectedIndex;
            if (filteredMembers[memberIndex]) {
              const member = filteredMembers[memberIndex];
              const displayName = member.profiles.full_name || member.profiles.email;
              onSelect(`@${displayName.replace(/\s+/g, '')}`);
            }
          }
          onClose();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredMembers, showChannel, onSelect, onClose]);

  if (!isOpen) return null;

  const totalItems = (showChannel ? 1 : 0) + filteredMembers.length;

  if (totalItems === 0) {
    return (
      <div 
        className="fixed z-50 w-72 bg-slate-800 border border-slate-600 rounded-md shadow-xl max-h-64 overflow-hidden"
        style={{ 
          top: position.top, 
          left: position.left 
        }}
      >
        <div className="p-4 text-center text-slate-400 text-sm">
          No members found
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 w-72 bg-slate-800 border border-slate-600 rounded-md shadow-xl max-h-64 overflow-hidden"
      style={{ 
        top: position.top, 
        left: position.left 
      }}
    >
      <div className="py-2">
        {showChannel && (
          <div
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              selectedIndex === 0 ? 'bg-blue-600' : 'hover:bg-slate-700'
            }`}
            onClick={() => {
              onSelect('@channel');
              onClose();
            }}
          >
            <div className="w-8 h-8 bg-yellow-600 rounded-md flex items-center justify-center text-sm font-bold text-white">
              #
            </div>
            <div className="flex flex-col">
              <span className="text-white font-medium">channel</span>
              <span className="text-xs text-slate-400">Notify everyone in this channel</span>
            </div>
          </div>
        )}
        
        {filteredMembers.map((member, index) => {
          const itemIndex = showChannel ? index + 1 : index;
          const isSelected = selectedIndex === itemIndex;
          
          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-600' : 'hover:bg-slate-700'
              }`}
              onClick={() => {
                const displayName = member.profiles.full_name || member.profiles.email;
                onSelect(`@${displayName.replace(/\s+/g, '')}`);
                onClose();
              }}
            >
              <div className="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center text-sm font-medium text-white">
                {(member.profiles.full_name?.[0] || member.profiles.email[0])?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-medium">
                  {member.profiles.full_name || member.profiles.email}
                </span>
                {member.profiles.full_name && (
                  <span className="text-xs text-slate-400">{member.profiles.email}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Navigation hint */}
      <div className="border-t border-slate-600 px-4 py-2 bg-slate-900">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to dismiss</span>
        </div>
      </div>
    </div>
  );
}
