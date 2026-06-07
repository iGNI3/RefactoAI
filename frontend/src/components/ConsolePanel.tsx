import React, { useState, useEffect, useRef } from "react";
import { FolderSearch } from "lucide-react";
import { CarouselStats } from "./CarouselStats";
import { ModelSelector } from "./ModelSelector";
import { CodeWorkspace } from "./CodeWorkspace";
import { PromptLibrary } from "./PromptLibrary";
import { DiffApprover } from "./DiffApprover";
import { ArchitectureMap } from "./ArchitectureMap";

interface ConsolePanelProps {
  onBackToHero: () => void;
}

interface SearchResult {
  id: string;
  content: string;
  metadata: {
    source_file: string;
    node_type: string;
    start_line: number;
    end_line: number;
  };
  distance: number;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ onBackToHero }) => {
  const [selectedProvider, setSelectedProvider] = useState("google");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");
  const [thinkingBudget, setThinkingBudget] = useState(16000);
  const [isThinkingActive, setIsThinkingActive] = useState(true);
  const [useSwarm, setUseSwarm] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [activeConsoleLog, setActiveConsoleLog] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<{ filePath: string; diff: string } | null>(null);
  const [activeView, setActiveView] = useState<"console" | "architecture">("console");
  
  const contentBufferRef = useRef("");

  // Indexing state
  const [workspacePath, setWorkspacePath] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // Search results for Code Workspace
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Active mode
  const [activeMode, setActiveMode] = useState<"agent" | "search">("agent");

  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll console to bottom on new entries
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConsoleLog]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addLog = (entry: string) => {
    setActiveConsoleLog((prev) => [...prev, entry]);
  };

  const ts = () => new Date().toLocaleTimeString();

  // ── Browse Directory ─────────────────────────────────────────
  const handleBrowse = async () => {
    try {
      const res = await fetch("/api/browse");
      const data = await res.json();
      if (data.path) {
        setWorkspacePath(data.path);
      }
    } catch (err) {
      addLog(`[${ts()}] ERR Browse failed: ${String(err)}`);
    }
  };

  // ── Index Workspace ──────────────────────────────────────────
  const triggerIndex = async () => {
    if (!workspacePath.trim()) return;

    setIsIndexing(true);
    addLog(`[${ts()}] Indexing workspace: "${workspacePath}"`);
    addLog(`[${ts()}] Discovering source files...`);

    try {
      const res = await fetch("/api/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_path: workspacePath }),
      });
      const data = await res.json();

      if (data.status === "indexed") {
        addLog(`[${ts()}] OK Indexed ${data.chunks} AST chunks successfully`);
        setStatsRefreshKey((k) => k + 1);
      } else {
        addLog(`[${ts()}] ERR ${data.message || "Indexing failed"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[${ts()}] ERR Network error: ${msg}`);
    } finally {
      setIsIndexing(false);
    }
  };

  // ── Search Codebase ──────────────────────────────────────────
  const triggerSearch = async () => {
    if (!userQuery.trim()) return;

    addLog(`[${ts()}] Searching: "${userQuery}"`);
    setIsExecuting(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery, max_results: 5 }),
      });
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        addLog(`[${ts()}] OK Found ${data.results.length} matching code chunks`);
        data.results.forEach((r: SearchResult, i: number) => {
          addLog(`[${ts()}]   ${i + 1}. ${r.metadata.source_file}:${r.metadata.start_line}-${r.metadata.end_line} (distance: ${r.distance.toFixed(4)})`);
        });
      } else {
        addLog(`[${ts()}] No results found. Try indexing a workspace first.`);
        setSearchResults([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[${ts()}] ERR Search failed: ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // ── Agent Execution (WebSocket) ──────────────────────────────
  const triggerAgentExecution = () => {
    if (!userQuery.trim()) return;

    addLog(`[${ts()}] Initiating agent: "${userQuery}"`);
    addLog(`[${ts()}] Provider: ${selectedProvider} | Model: ${selectedModel}`);
    if (isThinkingActive) {
      addLog(`[${ts()}] Thinking budget: ${thinkingBudget.toLocaleString()} tokens`);
    }

    setIsExecuting(true);
    setPendingPatch(null);
    contentBufferRef.current = "";

    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/refactor-stream`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog(`[${ts()}] WebSocket connected -- streaming...`);

      const payload = {
        provider: selectedProvider,
        model: selectedModel,
        messages: [{ role: "user", content: userQuery }],
        thinking_budget: isThinkingActive ? thinkingBudget : 0,
        use_swarm: useSwarm,
      };
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const prefix = data.swarm_role ? `[${data.swarm_role}] ` : "";
        
        if (data.type === "thought") {
          addLog(`[${ts()}] ${prefix}THINK ${data.content}`);
        } else if (data.type === "content") {
          addLog(`[${ts()}] ${prefix}> ${data.content}`);
          
          // Buffer content and detect diff blocks for the Approver UI
          contentBufferRef.current += data.content + "\n";
          const diffMatch = contentBufferRef.current.match(/```diff\n([\s\S]*?)```/);
          if (diffMatch && !pendingPatch) {
            const diffContent = diffMatch[1];
            const pathMatch = diffContent.match(/\+\+\+ (?:b\/)?(.*)/);
            const filePath = pathMatch ? pathMatch[1].trim() : "unknown_file";
            
            // Clear the buffer so we don't trigger on the same diff again
            contentBufferRef.current = contentBufferRef.current.replace(/```diff\n[\s\S]*?```/, "");
            
            setPendingPatch({ filePath, diff: diffContent });
            addLog(`[${ts()}] SYSTEM Intercepted diff patch for ${filePath}. Pending review.`);
          }

        } else if (data.type === "status") {
          addLog(`[${ts()}] OK ${data.content}`);
          setIsExecuting(false);
        } else if (data.type === "error") {
          addLog(`[${ts()}] ERR ${prefix}${data.content}`);
          setIsExecuting(false);
        }
      } catch {
        addLog(`[RX] ${event.data}`);
      }
    };

    ws.onerror = () => {
      addLog(`[${ts()}] ERR WebSocket error -- is the backend running on port 8000?`);
      setIsExecuting(false);
    };

    ws.onclose = () => {
      addLog(`[${ts()}] WebSocket connection closed.`);
      setIsExecuting(false);
    };

    setUserQuery("");
  };

  const handleExecute = () => {
    if (activeMode === "search") {
      triggerSearch();
    } else {
      triggerAgentExecution();
    }
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-base)] text-[var(--color-contrast)] p-6 sm:p-10 flex flex-col gap-8">
      {/* Header with back button */}
      <div className="flex justify-between items-center">
        <h1
          className="text-[28px] sm:text-[34px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Refactor.ai Dashboard
        </h1>
        <button
          id="btn-back-to-hero"
          onClick={onBackToHero}
          className="text-[14px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
        >
          &larr; Back to Home
        </button>
      </div>

      {/* Live Statistics Carousel */}
      <CarouselStats refreshKey={statsRefreshKey} />

      {/* Index Workspace Section */}
      <div className="bg-[var(--color-surface)] p-5 rounded-2xl border border-black/10 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full flex flex-col gap-1">
          <label className="text-[12px] uppercase opacity-60 font-bold">
            Workspace Path
          </label>
          <div className="relative">
            <input
              id="workspace-path-input"
              type="text"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") triggerIndex();
              }}
              placeholder="e.g. C:\Projects\my-app or ./sandbox_workspace"
              className="w-full py-2.5 pl-3 pr-12 rounded-lg border border-black/10 bg-[var(--color-base)] text-[14px] outline-none"
            />
            <button
              onClick={handleBrowse}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-60 hover:opacity-100 hover:bg-black/5 rounded-md transition-all"
              title="Browse folders"
            >
              <FolderSearch size={18} />
            </button>
          </div>
        </div>
        <button
          id="btn-index-workspace"
          onClick={triggerIndex}
          disabled={isIndexing || !workspacePath.trim()}
          className={`py-2.5 px-6 rounded-lg font-semibold text-[14px] uppercase transition-opacity whitespace-nowrap ${
            isIndexing || !workspacePath.trim()
              ? "bg-[var(--color-contrast)]/50 text-[var(--color-base)] cursor-not-allowed"
              : "bg-[var(--color-contrast)] text-[var(--color-base)] hover:opacity-90"
          }`}
        >
          {isIndexing ? "Indexing..." : "Index Codebase"}
        </button>
      </div>

      {/* Main Console and Control Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Control Dashboard */}
        <div className="bg-[#e6e6d8] p-6 rounded-2xl border border-black/10 flex flex-col gap-6">
          <h2
            className="text-[22px] font-semibold tracking-tight uppercase"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Execution Config
          </h2>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveMode("agent")}
              className={`flex-1 py-2 text-[13px] rounded-lg border font-medium uppercase transition-all ${
                activeMode === "agent"
                  ? "bg-[#121210] text-white border-transparent"
                  : "bg-[#f5f5f0] text-black border-black/10 hover:bg-black/5"
              }`}
            >
              Agent Mode
            </button>
            <button
              onClick={() => setActiveMode("search")}
              className={`flex-1 py-2 text-[13px] rounded-lg border font-medium uppercase transition-all ${
                activeMode === "search"
                  ? "bg-[#121210] text-white border-transparent"
                  : "bg-[#f5f5f0] text-black border-black/10 hover:bg-black/5"
              }`}
            >
              Search Mode
            </button>
          </div>

          {activeMode === "agent" && (
            <>
              <ModelSelector
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onProviderChange={setSelectedProvider}
                onModelChange={setSelectedModel}
                isThinkingActive={isThinkingActive}
                onThinkingToggle={setIsThinkingActive}
                thinkingBudget={thinkingBudget}
                onThinkingBudgetChange={setThinkingBudget}
              />

              <div className="flex items-center gap-4">
                <div className="flex items-center bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg p-1">
                  <button
                    onClick={() => setActiveView("console")}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-wider transition-colors ${
                      activeView === "console" ? "bg-[var(--color-contrast)] text-[var(--color-base)]" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    Console
                  </button>
                  <button
                    onClick={() => setActiveView("architecture")}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-wider transition-colors ${
                      activeView === "architecture" ? "bg-[var(--color-contrast)] text-[var(--color-base)]" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    Architecture Map
                  </button>
                </div>

                {/* Swarm Toggle */}
                <div className="flex justify-between items-center p-4 bg-[var(--color-base)] rounded-xl border border-black/5">
                  <label className="text-[12px] uppercase opacity-60 font-bold flex flex-col">
                    Multi-Agent Swarm
                    <span className="text-[10px] opacity-70 font-normal normal-case">Parallel UI, Frontend & Backend roles</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={useSwarm}
                    onChange={(e) => setUseSwarm(e.target.checked)}
                    className="w-5 h-5 accent-[var(--color-contrast)] cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          {/* Prompt Entry Area */}
          <div className="flex flex-col gap-2">
            {activeMode === "agent" && <PromptLibrary onSelectPrompt={setUserQuery} />}
            <label className="text-[12px] uppercase opacity-60 font-bold">
              {activeMode === "agent" ? "Agent Request" : "Semantic Search Query"}
            </label>
            <textarea
              id="agent-query-input"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleExecute();
                }
              }}
              placeholder={
                activeMode === "agent"
                  ? "e.g. Find functions with missing error handling and add try-catch blocks..."
                  : "e.g. database connection pool, authentication middleware..."
              }
              className="w-full h-32 p-3 rounded-lg border border-black/10 bg-[#f5f5f0] text-[14px] outline-none resize-none"
            />
            <button
              id="btn-execute-analysis"
              onClick={handleExecute}
              disabled={isExecuting || !userQuery.trim()}
              className={`w-full py-3 rounded-lg font-semibold uppercase transition-opacity ${
                isExecuting || !userQuery.trim()
                  ? "bg-[#121210]/50 text-[#f5f5f0] cursor-not-allowed"
                  : "bg-[#121210] text-[#f5f5f0] hover:opacity-90"
              }`}
            >
              {isExecuting
                ? "Executing..."
                : activeMode === "agent"
                ? "Execute Agent Analysis"
                : "Search Codebase"}
            </button>
          </div>
        </div>

        {activeView === "architecture" ? (
          <ArchitectureMap />
        ) : (
          <>
            {/* Right Execution and Log Console */}
            <div className="lg:col-span-2 bg-[#121210] text-[#f5f5f0] p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-[14px] tracking-wider uppercase opacity-80 font-bold">
                  Execution Stream Logs
                </span>
                <div className="flex items-center gap-2">
                  {activeConsoleLog.length > 0 && (
                    <button
                      onClick={() => setActiveConsoleLog([])}
                      className="text-[11px] uppercase tracking-wider opacity-40 hover:opacity-80 transition-opacity"
                    >
                      Clear
                    </button>
                  )}
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${
                      isExecuting || isIndexing ? "bg-emerald-500 animate-pulse" : "bg-white/20"
                    }`}
                  />
                </div>
              </div>

              {/* Real-time Streaming Output Container */}
              <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-[13px] flex flex-col gap-2 scrollbar-thin">
                {activeConsoleLog.length === 0 ? (
                  <span className="text-white/40 italic">
                    Waiting for execution request instructions...
                  </span>
                ) : (
                  activeConsoleLog.map((log, index) => (
                    <div
                      key={index}
                      className={`border-l-2 pl-3 py-1 ${
                        log.includes("THINK")
                          ? "border-amber-500/50 text-amber-200/80 italic"
                          : log.includes("ERR")
                          ? "border-red-500/50 text-red-300"
                          : log.includes("OK")
                          ? "border-emerald-500/50 text-emerald-300"
                          : log.includes("[FRONTEND_DEV]")
                          ? "border-blue-500/50 text-blue-200"
                          : log.includes("[BACKEND_DEV]")
                          ? "border-purple-500/50 text-purple-200"
                          : log.includes("[UI_UX_DESIGNER]")
                          ? "border-pink-500/50 text-pink-200"
                          : "border-white/20"
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Code Workspace */}
      <CodeWorkspace results={searchResults} />

      {/* Diff Approver Modal */}
      {pendingPatch && (
        <DiffApprover
          filePath={pendingPatch.filePath}
          diffString={pendingPatch.diff}
          onReject={() => {
            addLog(`[${ts()}] SYSTEM Patch rejected by user.`);
            setPendingPatch(null);
          }}
          onApprove={async (filePath, diff) => {
            addLog(`[${ts()}] SYSTEM Applying patch to ${filePath}...`);
            try {
              const res = await fetch("/api/patch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file_path: filePath, diff }),
              });
              const data = await res.json();
              if (data.success) {
                addLog(`[${ts()}] OK ${data.message}`);
              } else {
                addLog(`[${ts()}] ERR ${data.message}`);
              }
            } catch (err) {
              addLog(`[${ts()}] ERR Failed to send patch: ${String(err)}`);
            }
            setPendingPatch(null);
          }}
        />
      )}
    </div>
  );
};
