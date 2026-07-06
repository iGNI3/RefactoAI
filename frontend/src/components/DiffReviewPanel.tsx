import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Check, X, FileEdit } from 'lucide-react';

interface DiffReviewPanelProps {
  diffs: string[];
  onApprove: () => void;
  onReject: () => void;
}

export const DiffReviewPanel: React.FC<DiffReviewPanelProps> = ({ diffs, onApprove, onReject }) => {
  // Simple naive parse of unified diff to get original and modified text for monaco
  // In a real app we'd fetch the original file from the backend and apply the patch to get the modified string.
  // For the UI placeholder, we will just show the raw diff string if we can't extract the old/new files easily.
  
  // As a fallback, we'll just show the raw diffs in a standard editor, but Monaco DiffEditor
  // requires original and modified string. Since the agent output is a unified diff,
  // we can use a standard monaco editor with language "diff" to get syntax highlighting for unified diffs.
  const diffString = diffs.join('\n\n');

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333] text-white">
      <div className="p-4 border-b border-[#333] shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileEdit size={20} className="text-[#519aba]" />
          Review Changes
        </h2>
        <p className="text-sm text-white/60 mt-1">
          The agents have completed their work. Please review the proposed changes before they are applied to your workspace.
        </p>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <DiffEditor
            height="100%"
            language="python"
            original={"# Original code will be loaded here\n# This feature requires full file sync"}
            modified={diffString}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              renderSideBySide: false, // inline diff view works better for unified diffs
            }}
          />
        </div>
      </div>

      <div className="p-4 border-t border-[#333] shrink-0 flex justify-end gap-3 bg-[#181818]">
        <button
          onClick={onReject}
          className="py-2 px-6 rounded bg-[#333] text-white hover:bg-[#444] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <X size={16} /> Reject Changes
        </button>
        <button
          onClick={onApprove}
          className="py-2 px-6 rounded bg-[#0e639c] text-white hover:bg-[#1177bb] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Check size={16} /> Approve & Apply
        </button>
      </div>
    </div>
  );
};
