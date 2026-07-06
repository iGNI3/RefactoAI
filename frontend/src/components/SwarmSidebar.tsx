import React, { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, Cpu, Sparkles, Activity, Loader2, AlertCircle } from "lucide-react";

// Model → Provider mapping built dynamically from backend
interface ProviderModels {
  [provider: string]: string[];
}

interface ModelOption {
  provider: string;
  model: string;
  label: string;
}

// Nice display names
const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  anthropic: "Anthropic",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  deepinfra: "DeepInfra",
  openrouter: "OpenRouter",
  ollama: "Ollama (Local)",
};

const MODEL_LABELS: Record<string, string> = {
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
  "claude-3-7-sonnet-20250219": "Claude 3.7 Sonnet",
  "claude-3-5-sonnet-latest": "Claude 3.5 Sonnet",
  "claude-3-5-haiku-latest": "Claude 3.5 Haiku",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "gpt-4.1": "GPT-4.1",
  "o3-mini": "o3-mini",
  "deepseek-chat": "DeepSeek Chat",
  "deepseek-reasoner": "DeepSeek Reasoner",
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct": "Llama 4 Maverick",
  "meta-llama/Meta-Llama-3.1-70B-Instruct": "Llama 3.1 70B",
  "Qwen/Qwen3-235B-A22B": "Qwen3 235B",
  "mistralai/Mistral-Small-24B-Instruct-2501": "Mistral Small 24B",
  "anthropic/claude-sonnet-4": "Claude Sonnet 4 (OR)",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro (OR)",
  "openai/gpt-4o": "GPT-4o (OR)",
  "deepseek/deepseek-r1": "DeepSeek R1 (OR)",
  "meta-llama/llama-4-maverick": "Llama 4 Maverick (OR)",
  "llama3": "Llama 3",
  "codestral": "Codestral",
  "mistral": "Mistral",
  "phi3": "Phi-3",
};

export const SwarmSidebar: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userQuery, setUserQuery] = useState("");
  const [activeConsoleLog, setActiveConsoleLog] = useState<{type: 'thought'|'content'|'status'|'error', text: string}[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
  const WS_BASE = window.location.protocol === "file:" ? "ws://127.0.0.1:8000" : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

  // Fetch available providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/providers`);
        const data: ProviderModels = await res.json();
        
        const options: ModelOption[] = [];
        for (const [provider, models] of Object.entries(data)) {
          for (const model of models) {
            options.push({
              provider,
              model,
              label: MODEL_LABELS[model] || model,
            });
          }
        }
        setAvailableModels(options);
        setSelectedIndex(0);
      } catch (e) {
        console.warn("Could not fetch providers", e);
        setAvailableModels([]);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConsoleLog]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const currentModel = availableModels[selectedIndex] || null;

  const triggerAgentExecution = async () => {
    if (!userQuery.trim() || isExecuting || !currentModel) return;
    setIsExecuting(true);
    
    setActiveConsoleLog(prev => [...prev, {type: 'status', text: `Searching codebase for context...`}]);

    // 1. Fetch semantic context from LanceDB
    let contextString = "";
    try {
      const searchRes = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery, max_results: 5 })
      });
      const data = await searchRes.json();
      if (data.results && data.results.length > 0) {
        contextString = "Here is relevant codebase context retrieved from vector search:\n";
        data.results.forEach((res: any, i: number) => {
          contextString += `\n--- Context ${i+1} (${res.metadata.source_file}) ---\n${res.content}\n`;
        });
      }
    } catch (e) {
      console.warn("Context search failed", e);
    }

    setActiveConsoleLog(prev => [...prev, {type: 'status', text: `Initiating Swarm with ${PROVIDER_LABELS[currentModel.provider] || currentModel.provider} / ${currentModel.label}...`}]);

    // 2. Prepare payload
    const finalPrompt = contextString ? `${userQuery}\n\n<context>\n${contextString}\n</context>` : userQuery;

    const wsUrl = `${WS_BASE}/ws/refactor-stream`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const payload = {
        provider: currentModel.provider,
        model: currentModel.model,
        messages: [{ role: "user", content: finalPrompt }],
        thinking_budget: 16000,
        use_swarm: true,
      };
      ws.send(JSON.stringify(payload));
      setUserQuery("");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setActiveConsoleLog(prev => [...prev, {
          type: data.type, 
          text: data.swarm_role ? `[${data.swarm_role}] ${data.content}` : data.content
        }]);
        if (data.type === "status" || data.type === "error") setIsExecuting(false);
      } catch {
        // Fallback
      }
    };

    ws.onerror = () => {
      setActiveConsoleLog(prev => [...prev, {type: 'error', text: "WebSocket Error. Is backend running?"}]);
      setIsExecuting(false);
    };

    ws.onclose = () => {
      setIsExecuting(false);
    };
  };

  // Group models by provider for the dropdown
  const groupedOptions = availableModels.reduce<Record<string, ModelOption[]>>((acc, opt) => {
    if (!acc[opt.provider]) acc[opt.provider] = [];
    acc[opt.provider].push(opt);
    return acc;
  }, {});

  return (
    <div className="w-full h-full bg-[#181818] flex flex-col font-sans text-[#cccccc] border-l border-[#333]">
      {/* Header */}
      <div className="h-[40px] px-4 border-b border-[#333] flex items-center justify-between shrink-0 bg-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#dcb67a]" />
          <span className="text-[12px] font-bold text-white/80 uppercase tracking-widest">Swarm UI</span>
        </div>
        {isExecuting && <Activity size={14} className="text-[#519aba] animate-pulse" />}
      </div>

      {/* Model Selector */}
      <div className="p-3 border-b border-[#333] bg-[#1e1e1e]/50 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Model</span>
          <div className="relative">
            {loadingProviders ? (
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <Loader2 size={12} className="animate-spin" /> Loading...
              </div>
            ) : availableModels.length === 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-red-400">
                <AlertCircle size={12} /> No API keys
              </div>
            ) : (
              <>
                <select 
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                  className="appearance-none bg-[#2d2d2d] border border-[#444] text-[11px] rounded px-2 py-1 pr-6 text-white cursor-pointer hover:border-[#555] transition-colors outline-none focus:border-[#519aba] max-w-[200px]"
                >
                  {Object.entries(groupedOptions).map(([provider, models]) => (
                    <optgroup key={provider} label={PROVIDER_LABELS[provider] || provider}>
                      {models.map((m) => {
                        const idx = availableModels.indexOf(m);
                        return (
                          <option key={idx} value={idx}>
                            {m.label}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
              </>
            )}
          </div>
        </div>
        {currentModel && (
          <div className="text-[10px] text-white/30 font-mono truncate">
            {PROVIDER_LABELS[currentModel.provider] || currentModel.provider} → {currentModel.model}
          </div>
        )}
      </div>

      {/* Execution Stream (Logs) */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
        {activeConsoleLog.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-3">
            <Cpu size={32} />
            <p className="text-[12px] max-w-[200px]">Swarm is idle. Ask the agents to analyze your codebase or write code.</p>
          </div>
        ) : (
          activeConsoleLog.map((log, idx) => (
            <div key={idx} className={`text-[12px] font-mono leading-relaxed ${
              log.type === 'thought' ? 'text-white/40 italic' : 
              log.type === 'error' ? 'text-red-400' :
              log.type === 'status' ? 'text-[#519aba] font-bold' :
              'text-white/90'
            }`}>
              {log.text}
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#333] bg-[#1e1e1e] shrink-0">
        <div className="relative group">
          
          {/* @ Context Mention Popup */}
          {userQuery.endsWith('@') && (
            <div className="absolute bottom-full left-0 mb-2 w-[250px] bg-[#2d2d2d] border border-[#519aba]/50 rounded-lg shadow-xl overflow-hidden z-50">
              <div className="px-3 py-1.5 bg-[#1e1e1e] border-b border-[#333] text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Include Context
              </div>
              <div className="flex flex-col py-1">
                <div className="px-3 py-2 hover:bg-[#37373d] cursor-pointer text-[12px] flex items-center gap-2">
                  <span className="text-white/40">File</span> 
                  <span className="text-white">App.tsx</span>
                </div>
                <div className="px-3 py-2 hover:bg-[#37373d] cursor-pointer text-[12px] flex items-center gap-2">
                  <span className="text-white/40">Folder</span> 
                  <span className="text-white">src/components/</span>
                </div>
                <div className="px-3 py-2 hover:bg-[#37373d] cursor-pointer text-[12px] flex items-center gap-2">
                  <span className="text-white/40">Docs</span> 
                  <span className="text-white">React Router v6</span>
                </div>
              </div>
            </div>
          )}

          <textarea
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                triggerAgentExecution();
              }
            }}
            placeholder={availableModels.length === 0 
              ? "Add API keys in Settings to get started..."
              : "Instruct the swarm... (e.g. Find error handling bugs)"
            }
            disabled={availableModels.length === 0}
            className="w-full bg-[#2d2d2d] border border-[#444] rounded-lg p-3 pr-10 text-[13px] text-white placeholder-white/30 resize-none outline-none focus:border-[#519aba] focus:ring-1 focus:ring-[#519aba]/50 transition-all min-h-[80px] disabled:opacity-40"
          />
          <button 
            onClick={triggerAgentExecution}
            disabled={!userQuery.trim() || isExecuting || availableModels.length === 0}
            className="absolute bottom-3 right-3 p-1.5 rounded-md bg-[#519aba] text-white hover:bg-[#62a5c4] disabled:opacity-50 disabled:bg-[#444] transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-center opacity-40">
          Press <kbd className="px-1 py-0.5 bg-[#333] rounded font-sans">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-[#333] rounded font-sans">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};
