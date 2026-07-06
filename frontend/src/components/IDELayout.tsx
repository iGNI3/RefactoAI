import React, { useState } from 'react';
import { FileTree } from './FileTree';
import { CodeWorkspace } from './CodeWorkspace';
import { SwarmSidebar } from './SwarmSidebar';
import { AgentDashboard } from './AgentDashboard';
import { TerminalPanel } from './TerminalPanel';
import { ActivityBar } from './ActivityBar';
import { CommandPalette } from './CommandPalette';

interface IDELayoutProps {
  onBackToHero: () => void;
}

export const IDELayout: React.FC<IDELayoutProps> = ({ onBackToHero }) => {
  const [openFiles, setOpenFiles] = useState<{path: string, content: string}[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | undefined>(undefined);
  const [activeView, setActiveView] = useState('explorer');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P or Cmd+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const executeCommand = (commandId: string) => {
    switch (commandId) {
      case 'open-folder':
        if ((window as any).electronAPI) {
          (window as any).electronAPI.openFolder();
        }
        break;
      case 'focus-swarm':
        setActiveView('swarm');
        break;
      case 'reload-window':
        window.location.reload();
        break;
      case 'toggle-terminal':
        // we can implement a bottom panel toggler state later
        break;
      case 'toggle-theme':
        // implement dark/light theme later
        break;
    }
  };

  React.useEffect(() => {
    if ((window as any).electronAPI?.onWorkspaceChanged) {
      (window as any).electronAPI.onWorkspaceChanged((newPath: string) => {
        setWorkspacePath(newPath);
        setOpenFiles([]);
        setActiveFilePath(null);
      });
    }
  }, []);

  const handleFileSelect = (path: string, content: string) => {
    if (!openFiles.find(f => f.path === path)) {
      setOpenFiles([...openFiles, { path, content }]);
    }
    setActiveFilePath(path);
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newFiles = openFiles.filter(f => f.path !== path);
    setOpenFiles(newFiles);
    if (activeFilePath === path) {
      setActiveFilePath(newFiles.length > 0 ? newFiles[newFiles.length - 1].path : null);
    }
  };

  const activeFileContent = openFiles.find(f => f.path === activeFilePath)?.content;

  // We can pass the file content directly into CodeWorkspace's Editor.
  // CodeWorkspace currently expects "results" for semantic search. We'll need to adapt it 
  // or just pass the active file to a dedicated Monaco Editor instance.
  
  return (
    <div className="w-screen h-screen bg-[#1e1e1e] flex overflow-hidden text-[#cccccc] font-sans relative">
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onCommand={executeCommand} 
      />
      
      {/* Activity Bar */}
      <ActivityBar activeView={activeView} onViewChange={setActiveView} />

      {/* Left Sidebar: File Tree (250px) */}
      {activeView === 'explorer' && (
        <div className="w-[250px] min-w-[250px] h-full flex flex-col bg-[#181818] border-r border-[#333]">
          {/* IDE Header */}
          <div className="h-[40px] flex items-center px-4 shrink-0 gap-3">
            <button onClick={onBackToHero} className="text-[12px] text-white/50 hover:text-white transition-colors" title="Back to Hero">
              ←
            </button>
            <span className="text-[12px] font-bold text-white/80">Explorer</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree onFileSelect={handleFileSelect} workspacePath={workspacePath} />
          </div>
        </div>
      )}

      {/* Center Pane: Editor + Terminal */}
      <div className="flex-1 h-full flex flex-col bg-[#1e1e1e] border-r border-[#333]">
        {/* Top half: Editor Area */}
        <div className="flex-[7] flex flex-col min-h-0">
          {/* Tabs */}
          <div className="h-[40px] flex items-end bg-[#181818] border-b border-[#333] shrink-0 px-2 overflow-x-auto no-scrollbar">
            {openFiles.length > 0 ? (
              openFiles.map(file => {
                const isSelected = file.path === activeFilePath;
                return (
                  <div 
                    key={file.path}
                    onClick={() => setActiveFilePath(file.path)}
                    className={`px-4 py-2 text-[13px] flex items-center gap-2 cursor-pointer min-w-max border-t-2 ${
                      isSelected ? 'bg-[#1e1e1e] border-[#519aba] text-white' : 'bg-[#2d2d2d] border-transparent text-white/50 hover:bg-[#333]'
                    }`}
                  >
                    {file.path.split('\\').pop()?.split('/').pop()}
                    <button 
                      onClick={(e) => closeFile(e, file.path)}
                      className={`w-4 h-4 flex items-center justify-center rounded-sm hover:bg-white/10 ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                    >
                      ×
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-2 text-[13px] text-white/50 italic">No file open</div>
            )}
          </div>
          
          {/* Editor Content */}
          <div className="flex-1 relative">
            {activeFilePath && activeFileContent !== undefined ? (
              <div className="absolute inset-0">
                 <CodeWorkspace activeFileContent={activeFileContent} activeFilePath={activeFilePath} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-white/20">
                <span className="text-4xl font-bold">Refactor.ai</span>
                <span className="text-sm">Select a file from the explorer to open.</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom half: Terminal Area */}
        <div className="flex-[3] min-h-0">
          <TerminalPanel />
        </div>
      </div>

      {/* Right Sidebar: AI Swarm (350px) */}
      {activeView === 'swarm' && (
        <div className="w-[350px] min-w-[350px] h-full bg-[#181818] overflow-hidden">
           <SwarmSidebar />
        </div>
      )}

      {/* Right Sidebar: Agent Dashboard (400px) */}
      {activeView === 'agents' && (
        <div className="w-[400px] min-w-[400px] h-full bg-[#181818] overflow-hidden">
           <AgentDashboard onBack={() => setActiveView('explorer')} />
        </div>
      )}

    </div>
  );
};
