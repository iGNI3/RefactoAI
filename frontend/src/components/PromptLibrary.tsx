import React, { useState } from "react";
import { Sparkles, Bug, Wrench, ChevronDown, ChevronUp } from "lucide-react";

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({ onSelectPrompt }) => {
  const [isOpen, setIsOpen] = useState(false);

  const prompts = [
    {
      category: "Code Quality",
      icon: <Sparkles size={16} className="text-amber-500" />,
      items: [
        "Find all functions missing error handling and wrap them in try/catch blocks.",
        "Refactor this file to use React Hooks instead of Class Components.",
        "Add JSDoc or Python docstrings to all undocumented public functions.",
      ]
    },
    {
      category: "Debugging",
      icon: <Bug size={16} className="text-red-500" />,
      items: [
        "Identify potential memory leaks in the active file components.",
        "Find where this API endpoint is called and trace the data flow.",
        "Analyze the error logs and suggest a patch to fix the null reference.",
      ]
    },
    {
      category: "Architecture",
      icon: <Wrench size={16} className="text-blue-500" />,
      items: [
        "Create a detailed implementation plan for adding OAuth authentication.",
        "Explain the routing structure and database schema of this application.",
        "Refactor the monolithic logic into smaller, reusable services.",
      ]
    }
  ];

  return (
    <div className="flex flex-col mb-4 border border-black/10 rounded-xl overflow-hidden bg-white/50 dark:bg-black/20">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 w-full text-left hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="opacity-70" />
          <span className="text-[13px] font-bold uppercase tracking-wider opacity-80">Pre-built Prompts Library</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="opacity-50" /> : <ChevronDown size={16} className="opacity-50" />}
      </button>

      {isOpen && (
        <div className="p-2 border-t border-black/10 grid grid-cols-1 md:grid-cols-3 gap-2">
          {prompts.map((group, i) => (
            <div key={i} className="flex flex-col bg-[var(--color-base)] rounded-lg p-3 border border-black/5">
              <div className="flex items-center gap-2 mb-3 border-b border-black/5 pb-2">
                {group.icon}
                <span className="text-[12px] font-bold uppercase tracking-wider">{group.category}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((prompt, j) => (
                  <button
                    key={j}
                    onClick={() => {
                      onSelectPrompt(prompt);
                      setIsOpen(false);
                    }}
                    className="text-left text-[12px] opacity-70 hover:opacity-100 hover:text-[var(--color-contrast)] hover:bg-black/5 p-2 rounded transition-all h-[48px] overflow-y-auto leading-relaxed"
                    title={prompt}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
