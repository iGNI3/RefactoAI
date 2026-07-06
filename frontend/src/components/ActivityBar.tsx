import React from 'react';
import { Files, Search, GitBranch, TerminalSquare, Cpu, Settings, User } from 'lucide-react';

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange }) => {
  const topIcons = [
    { id: 'explorer', icon: Files, title: 'Explorer' },
    { id: 'search', icon: Search, title: 'Search' },
    { id: 'source-control', icon: GitBranch, title: 'Source Control' },
    { id: 'agents', icon: Cpu, title: 'Agent Dashboard' },
    { id: 'swarm', icon: Cpu, title: 'AI Swarm Chat' },
    { id: 'terminal', icon: TerminalSquare, title: 'Terminal' },
  ];

  const bottomIcons = [
    { id: 'accounts', icon: User, title: 'Accounts' },
    { id: 'settings', icon: Settings, title: 'Settings' },
  ];

  return (
    <div className="w-[48px] min-w-[48px] h-full bg-[#181818] border-r border-[#333] flex flex-col items-center py-2 justify-between shrink-0">
      <div className="flex flex-col items-center gap-4">
        {topIcons.map(({ id, icon: Icon, title }) => {
          const isActive = activeView === id;
          return (
            <div 
              key={id}
              title={title}
              onClick={() => onViewChange(id)}
              className={`relative p-2 cursor-pointer transition-colors ${
                isActive ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {isActive && (
                <div className="absolute left-[-2px] top-0 bottom-0 w-[2px] bg-[#519aba]" />
              )}
              <Icon strokeWidth={isActive ? 2 : 1.5} size={24} />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        {bottomIcons.map(({ id, icon: Icon, title }) => (
          <div 
            key={id}
            title={title}
            className="p-2 cursor-pointer text-white/40 hover:text-white/80 transition-colors"
          >
            <Icon strokeWidth={1.5} size={24} />
          </div>
        ))}
      </div>
    </div>
  );
};
