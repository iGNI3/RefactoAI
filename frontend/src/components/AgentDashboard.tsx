import React, { useState, useEffect, useRef } from 'react';
import { Bot, Play, Square, Cpu } from 'lucide-react';
import { PlanApproval } from './PlanApproval';
import { DiffReviewPanel } from './DiffReviewPanel';

interface AgentDashboardProps {
  onBack: () => void;
}

interface AgentState {
  id: string;
  role: string;
  status: 'pending' | 'thinking' | 'working' | 'done' | 'error' | 'blocked';
  content: string;
  artifacts?: any;
  elapsed: number;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ onBack }) => {
  const [prompt, setPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Pipeline phases: 'idle' -> 'planning' -> 'approval' -> 'executing' -> 'review' -> 'done'
  const [phase, setPhase] = useState<'idle' | 'planning' | 'approval' | 'executing' | 'review' | 'done'>('idle');
  
  const [plan, setPlan] = useState<any>(null);
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [diffs, setDiffs] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const planRef = useRef(plan);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom of agent logs
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agents]);

  const startPipeline = () => {
    if (!prompt.trim() || isExecuting) return;
    
    setIsExecuting(true);
    setPhase('planning');
    setPlan(null);
    setAgents({});
    setDiffs([]);
    
    // In real app, we'd do a search to get context first, then connect WebSocket
    connectWebSocket("plan", { prompt, context: "" });
  };

  const connectWebSocket = (command: string, payload: any) => {
    if (wsRef.current) wsRef.current.close();
    
    const WS_BASE = window.location.protocol === "file:" ? "ws://127.0.0.1:8000" : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
    const ws = new WebSocket(`${WS_BASE}/ws/refactor-stream`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        command,
        ...payload
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "agent_update") {
        setAgents(prev => ({
          ...prev,
          [data.agent_id]: {
            id: data.agent_id,
            role: data.role,
            status: data.status,
            content: data.content || prev[data.agent_id]?.content || "",
            artifacts: data.artifacts || prev[data.agent_id]?.artifacts,
            elapsed: data.elapsed || 0
          }
        }));
        
        // Handle transitions based on agent state
        if (data.role === "planner" && data.status === "blocked") {
          setPlan(data.artifacts.plan);
          setPhase('approval');
        }
        
        if (data.role === "coder" && data.artifacts?.diffs) {
          setDiffs(prev => [...prev, ...data.artifacts.diffs]);
        }
      }
      
      if (data.type === "status" && data.content === "Execution cycle complete") {
        if (phaseRef.current === 'executing') {
          setPhase('review');
        }
      }
    };
    
    ws.onclose = () => {
      if (phaseRef.current === 'planning' && !planRef.current) {
        setIsExecuting(false);
        setPhase('idle');
      }
    };
  };

  const approvePlan = () => {
    setPhase('executing');
    connectWebSocket("execute_dag", { plan_data: plan, context: "" });
  };

  const rejectPlan = () => {
    setPhase('idle');
    setIsExecuting(false);
  };

  const approveDiffs = () => {
    setPhase('done');
    setIsExecuting(false);
    // Real app: Send patch request to backend
  };

  const rejectDiffs = () => {
    setPhase('idle');
    setIsExecuting(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'done': return 'border-green-500 bg-green-500/10 text-green-400';
      case 'working': 
      case 'thinking': return 'border-[#519aba] bg-[#519aba]/10 text-[#519aba] animate-pulse';
      case 'error': return 'border-red-500 bg-red-500/10 text-red-400';
      case 'blocked': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      default: return 'border-[#333] bg-[#252526] text-white/50';
    }
  };

  if (phase === 'approval' && plan) {
    return <PlanApproval plan={plan} onApprove={approvePlan} onReject={rejectPlan} />;
  }

  if (phase === 'review' && diffs.length > 0) {
    return <DiffReviewPanel diffs={diffs} onApprove={approveDiffs} onReject={rejectDiffs} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#181818] border-l border-[#333] text-white">
      <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#1e1e1e] shrink-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider flex items-center gap-2">
          <Cpu size={16} className="text-[#519aba]" />
          Agent Pipeline
        </h2>
        <button onClick={onBack} className="text-xs text-white/50 hover:text-white">Close</button>
      </div>

      {phase === 'idle' && (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center opacity-50">
          <Bot size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Project Architect Mode</h3>
          <p className="text-sm max-w-[250px]">
            Enter a prompt below to automatically generate an execution plan and spawn parallel agents.
          </p>
        </div>
      )}

      {(phase === 'planning' || phase === 'executing') && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Active Agents</h3>
          
          <div className="grid grid-cols-1 gap-3">
            {Object.values(agents).map(agent => (
              <div key={agent.id} className={`border rounded-md p-3 flex flex-col gap-2 ${getStatusColor(agent.status)}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider">{agent.role}</span>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded">{agent.status}</span>
                </div>
                <div className="text-xs opacity-80 line-clamp-3 font-mono break-all whitespace-pre-wrap mt-2">
                  {agent.content || "Waiting..."}
                </div>
              </div>
            ))}
          </div>
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-[#333] bg-[#1e1e1e] shrink-0">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isExecuting}
            placeholder={isExecuting ? "Pipeline running..." : "Describe the feature to build..."}
            className="w-full bg-[#252526] border border-[#333] rounded-md p-3 pr-10 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[#519aba] min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                startPipeline();
              }
            }}
          />
          <button 
            onClick={isExecuting ? () => {} : startPipeline}
            disabled={isExecuting || !prompt.trim()}
            className={`absolute right-3 bottom-3 p-1.5 rounded-md flex items-center justify-center transition-colors ${
              isExecuting ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-[#519aba] text-white hover:bg-[#60A8C9]'
            }`}
          >
            {isExecuting ? <Square size={16} className="animate-pulse" fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
};
