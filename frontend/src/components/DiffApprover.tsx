import React, { useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Check, X, FileDiff } from "lucide-react";

interface DiffApproverProps {
  filePath: string;
  diffString: string;
  onApprove: (filePath: string, diff: string) => Promise<void>;
  onReject: () => void;
}

export const DiffApprover: React.FC<DiffApproverProps> = ({ filePath, diffString, onApprove, onReject }) => {
  const [isApplying, setIsApplying] = useState(false);

  const handleApprove = async () => {
    setIsApplying(true);
    await onApprove(filePath, diffString);
    setIsApplying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[var(--color-surface)] w-full max-w-5xl h-[80vh] rounded-3xl border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)] bg-[var(--color-base)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-inner">
              <FileDiff size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-[var(--color-contrast)] leading-none">
                Review Pending Changes
              </h2>
              <p className="text-[13px] opacity-60 mt-1 font-mono">{filePath}</p>
            </div>
          </div>
          <button 
            onClick={onReject}
            className="p-2 opacity-50 hover:opacity-100 hover:bg-black/5 rounded-full transition-all text-[var(--color-contrast)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Diff Content */}
        <div className="flex-1 bg-[#1e1e1e]">
          <Editor
            height="100%"
            language="diff"
            value={diffString}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 20, bottom: 20 }
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-base)] flex justify-end gap-3">
          <button
            onClick={onReject}
            className="px-6 py-2.5 rounded-lg text-[14px] font-bold opacity-70 hover:opacity-100 hover:bg-black/5 hover:text-red-500 transition-all text-[var(--color-contrast)] flex items-center gap-2"
          >
            <X size={16} /> Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isApplying}
            className="px-8 py-2.5 rounded-lg bg-emerald-500 text-white text-[14px] font-bold hover:bg-emerald-600 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Check size={16} />
            {isApplying ? "Applying..." : "Approve & Apply Patch"}
          </button>
        </div>

      </div>
    </div>
  );
};
