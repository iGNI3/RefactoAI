import React from 'react';
import { Check, X, GitCommit, AlertTriangle } from 'lucide-react';

interface PlanApprovalProps {
  plan: {
    goal: string;
    tasks: any[];
    risks: string[];
  };
  onApprove: () => void;
  onReject: () => void;
}

export const PlanApproval: React.FC<PlanApprovalProps> = ({ plan, onApprove, onReject }) => {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333] text-white">
      <div className="p-4 border-b border-[#333] shrink-0">
        <h2 className="text-lg font-semibold text-[#519aba]">Implementation Plan</h2>
        <p className="text-sm text-white/60 mt-1">{plan.goal}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Risks Section */}
        {plan.risks && plan.risks.length > 0 && (
          <div className="bg-[#2d2d00] border border-[#ffcc00]/30 rounded-md p-3">
            <h3 className="text-[#ffcc00] font-medium flex items-center gap-2 mb-2 text-sm">
              <AlertTriangle size={16} /> Potential Risks
            </h3>
            <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
              {plan.risks.map((risk, i) => (
                <li key={i}>{risk}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Task DAG Visualizer */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-white/80">Execution Graph (DAG)</h3>
          <div className="space-y-3">
            {plan.tasks.map((task, i) => (
              <div key={task.id || i} className="bg-[#252526] border border-[#333] rounded p-3 relative ml-4">
                {/* Connecting line */}
                <div className="absolute left-[-16px] top-4 bottom-[-16px] w-[2px] bg-[#333]"></div>
                <div className="absolute left-[-20px] top-4 w-4 h-[2px] bg-[#333]"></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#333] text-[#519aba] mr-2 uppercase">
                      {task.role}
                    </span>
                    <span className="font-medium text-sm text-white/90">{task.title}</span>
                  </div>
                </div>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">{task.description}</p>
                
                {task.depends_on && task.depends_on.length > 0 && (
                  <div className="mt-2 text-xs text-white/40 flex items-center gap-1">
                    <GitCommit size={12} />
                    Depends on: {task.depends_on.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#333] shrink-0 flex gap-3">
        <button
          onClick={onReject}
          className="flex-1 py-2 px-4 rounded bg-[#333] text-white/80 hover:bg-[#444] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <X size={16} /> Reject
        </button>
        <button
          onClick={onApprove}
          className="flex-1 py-2 px-4 rounded bg-[#0e639c] text-white hover:bg-[#1177bb] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Check size={16} /> Approve & Execute
        </button>
      </div>
    </div>
  );
};
