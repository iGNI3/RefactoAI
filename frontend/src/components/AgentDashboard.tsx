import React, { useEffect, useReducer, useRef } from 'react';
import { Bot, Play, Square, Cpu, AlertCircle, Loader2 } from 'lucide-react';
import { PlanApproval } from './PlanApproval';
import { DiffReviewPanel } from './DiffReviewPanel';
import { toast } from './Toast';
import { api } from '../lib/api';
import { WSClient } from '../lib/websocket';

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

type AgentDashboardPhase = 'idle' | 'planning' | 'approval' | 'executing' | 'review' | 'done';

type ComponentState = {
  prompt: string;
  isExecuting: boolean;
  hasApiKeys: boolean | null;
  phase: AgentDashboardPhase;
  plan: any | null;
  agents: Record<string, AgentState>;
  diffs: string[];
  error: string | null;
};

type Action =
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_HAS_API_KEYS'; payload: boolean | null }
  | { type: 'START_PIPELINE' }
  | { type: 'APPROVE_PLAN' }
  | { type: 'REJECT_PLAN' }
  | { type: 'APPROVE_DIFFS_COMPLETE' }
  | { type: 'REJECT_DIFFS' }
  | { type: 'CANCEL_EXECUTION' }
  | { type: 'WEBSOCKET_ERROR'; payload: string }
  | { type: 'AGENT_UPDATE'; payload: AgentUpdateMessage }
  | { type: 'EXECUTION_COMPLETE' }
  | { type: 'PLANNING_FAILED' };

const initialState: ComponentState = {
  prompt: "",
  isExecuting: false,
  hasApiKeys: null,
  phase: 'idle',
  plan: null,
  agents: {},
  diffs: [],
  error: null,
};

function agentDashboardReducer(state: ComponentState, action: Action): ComponentState {
  switch (action.type) {
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    case 'SET_HAS_API_KEYS':
      return { ...state, hasApiKeys: action.payload };
    case 'START_PIPELINE':
      return {
        ...initialState,
        prompt: state.prompt,
        hasApiKeys: state.hasApiKeys,
        isExecuting: true,
        phase: 'planning',
      };
    case 'APPROVE_PLAN':
      return { ...state, phase: 'executing' };
    case 'REJECT_PLAN':
    case 'REJECT_DIFFS':
      return { ...state, phase: 'idle', isExecuting: false };
    case 'APPROVE_DIFFS_COMPLETE':
      return { ...state, phase: 'done', isExecuting: false };
    case 'CANCEL_EXECUTION':
      return { ...state, phase: 'idle', isExecuting: false, error: 'Execution cancelled by user' };
    case 'WEBSOCKET_ERROR':
      return { ...state, phase: 'idle', isExecuting: false, error: action.payload };
    case 'AGENT_UPDATE': {
      const data = action.payload;
      const newAgents = {
        ...state.agents,
        [data.agent_id]: {
          id: data.agent_id,
          role: data.role,
          status: data.status,
          content: String(data.content || state.agents[data.agent_id]?.content || ""),
          artifacts: data.artifacts || state.agents[data.agent_id]?.artifacts,
          elapsed: Number(data.elapsed || 0),
        },
      };

      const isPlannerUpdate = data.role === "planner" && data.status === "blocked";
      const newPlan = isPlannerUpdate ? (data.artifacts?.plan || null) : state.plan;
      const newPhase = isPlannerUpdate ? "approval" : state.phase;

      const newDiffs = data.role === "coder" && data.artifacts?.diffs
        ? [...state.diffs, ...data.artifacts.diffs]
        : state.diffs;

      return { ...state, agents: newAgents, phase: newPhase, plan: newPlan, diffs: newDiffs };
    }
    case 'EXECUTION_COMPLETE':
      return { ...state, phase: state.phase === 'executing' ? 'review' : state.phase };
    case 'PLANNING_FAILED':
      return { ...state, isExecuting: false, phase: 'idle' };
    default:
      return state;
  }
}

type AgentUpdateMessage = { type: 'agent_update'; agent_id: string; role: string; status: AgentState['status']; content?: string; artifacts?: any; elapsed?: number; };
type ErrorMessage = { type: 'error'; content: string; };
type StatusMessage = { type: 'status'; content: string; };
type WebSocketMessage = AgentUpdateMessage | ErrorMessage | StatusMessage;

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ onBack }) => {
  const [state, dispatch] = useReducer(agentDashboardReducer, initialState);
  const { prompt, isExecuting, hasApiKeys, phase, plan, agents, diffs, error } = state;

  const wsRef = useRef<WSClient | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const planRef = useRef(plan);

  useEffect(() => {
    api.getProviders()
      .then((data) => dispatch({ type: 'SET_HAS_API_KEYS', payload: Object.keys(data).length > 0 }))
      .catch(() => dispatch({ type: 'SET_HAS_API_KEYS', payload: false }));
  }, []);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { planRef.current = plan; }, [plan]);

  useEffect(() => {
    return () => wsRef.current?.disconnect();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agents]);

  const connectWebSocket = (command: string, payload: any) => {
    wsRef.current?.disconnect();

    const client = new WSClient("/ws/refactor-stream", {
      onOpen: () => {
        client.send({ command, ...payload });
      },
      onMessage: (message: any) => {
        if (typeof message !== 'object' || message === null || !message.type) {
          console.warn('Received malformed WebSocket message:', message);
          return;
        }

        const data = message as WebSocketMessage;

        switch (data.type) {
          case "agent_update":
            dispatch({ type: 'AGENT_UPDATE', payload: data });
            break;
          case "error":
            dispatch({ type: 'WEBSOCKET_ERROR', payload: data.content || "Unknown error" });
            break;
          case "status":
            if (data.content === "Execution cycle complete") {
              dispatch({ type: 'EXECUTION_COMPLETE' });
            }
            break;
          default:
            console.warn(`Unknown WebSocket message type: ${(data as any).type}`);
        }
      },
      onError: () => {
        dispatch({ type: 'WEBSOCKET_ERROR', payload: "WebSocket connection failed. Is the backend running?" });
      },
      onClose: () => {
        if (phaseRef.current === "planning" && !planRef.current) {
          dispatch({ type: 'PLANNING_FAILED' });
        }
      },
    });

    client.connect();
    wsRef.current = client;
  };

  const startPipeline = () => {
    if (!prompt.trim() || isExecuting) return;
    if (!hasApiKeys) {
      toast({ type: "error", title: "No API Keys", message: "Add an API key in Settings to use the Agent Pipeline." });
      return;
    }
    dispatch({ type: 'START_PIPELINE' });
    connectWebSocket("plan", { prompt, context: "" });
  };

  const cancelExecution = () => {
    wsRef.current?.disconnect();
    dispatch({ type: 'CANCEL_EXECUTION' });
  };

  const approvePlan = () => {
    dispatch({ type: 'APPROVE_PLAN' });
    connectWebSocket("execute_dag", { plan_data: plan, context: "" });
  };

  const rejectPlan = () => {
    dispatch({ type: 'REJECT_PLAN' });
  };

  const approveDiffs = async () => {
    let successCount = 0;
    for (const diff of diffs) {
      const pathMatch = diff.match(/\+\+\+ (?:b\/)?(.+)/);
      const filePath = pathMatch ? pathMatch[1].trim() : "unknown";
      try {
        const res = await api.applyPatch(filePath, diff);
        if (res.success) successCount++;
        else toast({ type: "error", title: `Patch failed: ${filePath}`, message: res.message });
      } catch (e) {
        console.error(`Failed to apply patch for ${filePath}:`, e);
        toast({ type: "error", title: "Error applying patch", message: `Could not apply patch for ${filePath}. See console for details.` });
      }
    }
    if (successCount > 0) {
      toast({ type: "success", title: `${successCount} patch(es) applied`, message: "Changes written to sandbox workspace." });
    }
    dispatch({ type: 'APPROVE_DIFFS_COMPLETE' });
  };

  const rejectDiffs = () => {
    dispatch({ type: 'REJECT_DIFFS' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "border-green-500 bg-green-500/10 text-green-400";
      case "working":
      case "thinking": return "border-[#519aba] bg-[#519aba]/10 text-[#519aba] animate-pulse";
      case "error": return "border-red-500 bg-red-500/10 text-red-400";
      case "blocked": return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
      default: return "border-[#333] bg-[#252526] text-white/50";
    }
  };

  if (phase === "approval" && plan) {
    return <PlanApproval plan={plan} onApprove={approvePlan} onReject={rejectPlan} />;
  }

  if (phase === "review" && diffs.length > 0) {
    return <DiffReviewPanel diffs={diffs} onApprove={approveDiffs} onReject={rejectDiffs} />;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-l border-[var(--color-border)] text-[var(--color-contrast)]">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-base)] shrink-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider flex items-center gap-2">
          <Cpu size={16} className="text-[#519aba]" />
          Agent Pipeline
        </h2>
        <button onClick={onBack} className="text-xs opacity-50 hover:opacity-100 transition-opacity">Close</button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {phase === "idle" && (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center opacity-50">
          <Bot size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Project Architect Mode</h3>
          <p className="text-sm max-w-[250px]">
            Enter a prompt below to automatically generate an execution plan and spawn parallel agents.
          </p>
        </div>
      )}

      {(phase === "planning" || phase === "executing") && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">Active Agents</h3>
          <div className="grid grid-cols-1 gap-3">
            {Object.values(agents).length === 0 && (
              <div className="flex items-center justify-center py-8 text-white/30">
                <Loader2 size={16} className="animate-spin mr-2" />
                Initializing agents...
              </div>
            )}
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

      {phase === "done" && (
        <div className="flex-1 flex items-center justify-center text-green-400 text-sm">
          Pipeline completed successfully
        </div>
      )}

      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-base)] shrink-0">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => dispatch({ type: 'SET_PROMPT', payload: e.target.value })}
            disabled={isExecuting}
            placeholder={isExecuting ? "Pipeline running..." : "Describe the feature to build..."}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-3 pr-10 text-sm text-[var(--color-contrast)] placeholder:opacity-40 resize-none focus:outline-none focus:border-[#519aba] min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isExecuting) cancelExecution();
                else startPipeline();
              }
            }}
          />
          <button
            onClick={isExecuting ? cancelExecution : startPipeline}
            disabled={!isExecuting && (!prompt.trim() || !hasApiKeys)}
            className={`absolute right-3 bottom-3 p-1.5 rounded-md flex items-center justify-center transition-colors ${isExecuting
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-[#519aba] text-white hover:bg-[#60A8C9] disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
          >
            {isExecuting ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
};
