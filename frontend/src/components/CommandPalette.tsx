import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (commandId: string) => void;
}

const ALL_COMMANDS = [
  { id: 'toggle-theme', label: 'Preferences: Toggle Color Theme' },
  { id: 'open-settings', label: 'Preferences: Open Settings (UI)' },
  { id: 'open-folder', label: 'File: Open Folder...' },
  { id: 'toggle-terminal', label: 'View: Toggle Terminal' },
  { id: 'reload-window', label: 'Developer: Reload Window' },
  { id: 'focus-swarm', label: 'AI: Focus Swarm Chat' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onCommand }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = ALL_COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        onCommand(filteredCommands[selectedIndex].id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[600px] h-fit max-h-[50vh] bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl flex flex-col font-sans overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-3 border-b border-[#333]">
          <span className="text-[#519aba]"><Command size={16} /></span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#cccccc] placeholder:text-white/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="p-3 text-[13px] text-white/40 text-center">No commands matching '{query}'</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div 
                key={cmd.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  onCommand(cmd.id);
                  onClose();
                }}
                className={`flex items-center px-4 py-2 cursor-pointer text-[13px] ${
                  idx === selectedIndex ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
              >
                {cmd.label}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
