import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { ArrowUp, Plus, ShieldCheck, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { WSClient } from '../lib/websocket';
import { useToasts } from './Toast';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  isThinking?: boolean;
}

export const WorkspaceLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'work' | 'chat'>('work');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [fastModeEnabled, setFastModeEnabled] = useState(true);
  const wsRef = useRef<WSClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToasts();

  useEffect(() => {
    const client = new WSClient('/ws/refactor-stream', {
      onOpen: () => setConnectionError(null),
      onError: () => setConnectionError('WebSocket connection failed'),
      onClose: () => {
        if (!connectionError) setConnectionError('Connection lost. Reconnecting...');
      },
      onMessage: (data) => {
        const type = data.type as string;
        if (type === 'content' || type === 'thought') {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'agent') {
              const updated = [...prev];
              updated[updated.length - 1].content += String(data.content || '');
              updated[updated.length - 1].isThinking = type === 'thought';
              return updated;
            }
            return [...prev, { role: 'agent', content: String(data.content || ''), isThinking: type === 'thought' }];
          });
        } else if (type === 'done') {
          setIsProcessing(false);
        } else if (type === 'error') {
          setMessages(prev => [...prev, { role: 'agent', content: `Error: ${String(data.content)}`, isThinking: false }]);
          setIsProcessing(false);
        }
      },
    });

    client.connect();
    wsRef.current = client;

    return () => {
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback((overrideQuery?: string) => {
    const textToSubmit = (overrideQuery || query).trim();
    if (!textToSubmit || isProcessing) return;
    if (!wsRef.current?.connected) {
      setConnectionError('Not connected to backend. Please ensure the server is running.');
      return;
    }

    const newMessages = [...messages, { role: 'user', content: textToSubmit } as ChatMessage];
    setMessages(newMessages);
    setIsProcessing(true);
    setConnectionError(null);

    wsRef.current.send({
      task: activeTab,
      prompt: textToSubmit,
      messages: newMessages,
      context: "Refactor.ai Workspace Desktop Context",
      provider: "anthropic",
      model: fastModeEnabled ? "claude-3-5-sonnet" : "claude-3-7-sonnet"
    });

    setQuery('');
  }, [query, isProcessing, activeTab, messages, fastModeEnabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePermissionsClick = () => {
    addToast({ type: 'success', title: 'Permissions', message: 'Permissions dialog opened.' });
  };

  const toggleFastMode = () => {
    setFastModeEnabled(prev => !prev);
    addToast({ type: 'success', title: 'Model Switched', message: `Now using ${!fastModeEnabled ? 'Fast Mode (Claude 3.5)' : 'Reasoning Mode (Claude 3.7)'}` });
  };

  return (
    <div className="w-full h-screen bg-[var(--color-base)] flex overflow-hidden font-sans text-[var(--color-contrast)]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onNewTask={() => setMessages([])} />

      <div className="flex-1 flex flex-col h-full bg-[var(--color-base)] relative">
        {connectionError && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-red-500/10 border-b border-red-500/30 text-red-500 text-sm px-4 py-2 flex items-center gap-2">
            <AlertCircle size={14} />
            {connectionError}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-8 mt-12">
          {messages.length > 0 ? (
            <div className="w-full flex-1 overflow-y-auto mb-6 pr-2 flex flex-col gap-6 pt-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'agent' && (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-contrast)] text-[var(--color-base)] flex items-center justify-center mr-3 mt-1 flex-shrink-0 font-bold text-xs shadow-md">
                      AI
                    </div>
                  )}
                  <div className={`max-w-[85%] text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-surface)] px-4 py-3 rounded-2xl rounded-tr-sm border border-[var(--color-border)]'
                      : 'bg-transparent py-1'
                  }`}>
                    {msg.isThinking && <Loader2 size={14} className="animate-spin inline mr-2 opacity-50" />}
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center mb-10 transition-all duration-500 transform translate-y-0 opacity-100">
              {activeTab === 'work' ? (
                <div className="flex flex-col items-center">
                  <div className="mb-6 w-20 h-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center relative overflow-hidden shadow-xl">
                    <div className="absolute w-16 h-16 bg-[var(--color-contrast)] rounded-full blur-2xl opacity-10"></div>
                    <span className="text-[28px] font-bold text-[var(--color-contrast)] relative z-10">R.ai</span>
                    <div className="absolute bottom-1 right-1 bg-[var(--color-contrast)] text-[var(--color-base)] text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Agent</div>
                  </div>
                  <h1 className="text-[36px] font-medium tracking-tight mb-2">What are we building today?</h1>
                  <span className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider opacity-80">Refactor.ai Workspace</span>
                </div>
              ) : (
                <h1 className="text-[54px] font-black tracking-tight text-[var(--color-contrast)]">Refactor.ai</h1>
              )}
            </div>
          )}

          <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-[var(--color-contrast)]/20 transition-all p-3 relative mb-6">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={activeTab === 'work' ? 'Type "/" for skills, "@" to add context...' : 'Type "/" to invoke plugins and skills...'}
              className="w-full h-[60px] resize-none outline-none text-[15px] placeholder-black/30 dark:placeholder-white/30 bg-transparent py-1 disabled:opacity-50 custom-scrollbar"
            />

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <Plus size={16} />
                </button>
                {activeTab === 'work' ? (
                  <button onClick={handlePermissionsClick} className="flex items-center gap-1.5 text-[12px] font-semibold bg-transparent border border-[var(--color-border)] px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <ShieldCheck size={14} className="opacity-70" />
                    Permissions
                    <ChevronDown size={14} className="opacity-50 ml-1" />
                  </button>
                ) : (
                  <button className="flex items-center gap-1.5 text-[12px] font-semibold px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <ShieldCheck size={14} className="opacity-70" />
                    Agent
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={toggleFastMode} className="text-[12px] font-semibold flex items-center hover:opacity-70 transition-opacity">
                  {fastModeEnabled ? 'Fast Mode' : 'Claude 3.7'}
                  <ChevronDown size={14} className="ml-1 opacity-50" />
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={!query.trim() || isProcessing}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    query.trim() && !isProcessing ? 'bg-[var(--color-contrast)] text-[var(--color-base)] hover:scale-105 shadow-md' : 'bg-[var(--color-border)] opacity-50'
                  }`}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'chat' ? (
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {['Explain Code', 'Write Tests', 'Find Bugs', 'Refactor'].map(action => (
                <button
                  key={action}
                  onClick={() => handleSubmit(action)}
                  className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 hover:shadow-sm transition-all flex items-center gap-2"
                >
                  <div className="w-4 h-4 bg-[var(--color-border)] rounded flex items-center justify-center" />
                  {action}
                </button>
              ))}
            </div>
          ) : (
            <div className="w-full mb-8">
              <h4 className="text-[12px] uppercase font-bold opacity-50 mb-4 tracking-wider">Recent Workspaces</h4>
              <div className="flex items-center justify-between text-[13px] bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)]">
                <div className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  code_analyzer
                </div>
                <span className="opacity-50 text-[11px] font-bold uppercase tracking-wider">Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

