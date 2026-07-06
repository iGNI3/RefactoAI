import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export const TerminalPanel: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: '#181818',
        foreground: '#cccccc',
        cursor: '#ffffff',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send keystrokes to the pseudo-terminal
    term.onData((data) => {
      electronAPI.writeTerminal(data);
    });

    // Receive data from the pseudo-terminal
    const cleanupTerminalData = electronAPI.onTerminalData((data: string) => {
      term.write(data);
    });

    // Start the terminal backend process
    electronAPI.startTerminal();

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (cleanupTerminalData) cleanupTerminalData();
      term.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#181818] border-t border-[#333333] flex flex-col">
      <div className="h-[30px] flex items-center px-4 border-b border-[#333333] shrink-0 bg-[#1e1e1e]">
        <span className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Terminal</span>
      </div>
      <div className="flex-1 p-2 overflow-hidden" ref={terminalRef}></div>
    </div>
  );
};
