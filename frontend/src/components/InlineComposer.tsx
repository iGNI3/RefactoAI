import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface InlineComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  position?: { top: number; left: number };
}

export const InlineComposer: React.FC<InlineComposerProps> = ({ isOpen, onClose, onSubmit, position }) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (prompt.trim()) {
        onSubmit(prompt);
        onClose();
      }
    }
  };

  const style = position 
    ? { top: position.top, left: position.left, transform: 'translate(-50%, -100%)', marginTop: '-10px' }
    : { top: '20%', left: '50%', transform: 'translate(-50%, 0)' };

  return (
    <div 
      className="absolute z-40 w-[500px] bg-[#1e1e1e] border border-[#519aba]/50 rounded-lg shadow-2xl flex flex-col font-sans overflow-hidden"
      style={style}
    >
      <div className="flex items-center gap-3 p-3">
        <span className="text-[#dcb67a] animate-pulse"><Sparkles size={16} /></span>
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Generate or edit code (e.g., 'Add error handling here')"
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#cccccc] placeholder:text-white/30"
        />
        <button 
          onClick={() => {
            if (prompt.trim()) {
              onSubmit(prompt);
              onClose();
            }
          }}
          className="text-white/50 hover:text-white transition-colors"
        >
          <ArrowRight size={16} />
        </button>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors ml-2">
          <X size={16} />
        </button>
      </div>
      <div className="bg-[#181818] px-3 py-1.5 border-t border-[#333] flex justify-between items-center text-[10px] text-white/40">
        <span>Inline AI Composer</span>
        <div className="flex gap-2">
          <span><kbd className="px-1 bg-[#333] rounded">Esc</kbd> to cancel</span>
          <span><kbd className="px-1 bg-[#333] rounded">Enter</kbd> to generate</span>
        </div>
      </div>
    </div>
  );
};
