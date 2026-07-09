import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Check, X, FileEdit, Loader2 } from 'lucide-react';

interface DiffReviewPanelProps {
  diffs: string[];
  onApprove: () => void;
  onReject: () => void;
}

function extractFilePath(diff: string): string | null {
  const match = diff.match(/^\+\+\+ (?:b\/)?(.+)$/m);
  return match ? match[1].trim() : null;
}

async function loadOriginalContent(filePath: string): Promise<string> {
  try {
    const res = await fetch(filePath);
    if (res.ok) return await res.text();
  } catch {
    // file may not exist
  }
  return '';
}

export const DiffReviewPanel: React.FC<DiffReviewPanelProps> = ({ diffs, onApprove, onReject }) => {
  const [originalContents, setOriginalContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      const contents: Record<string, string> = {};
      for (const diff of diffs) {
        const path = extractFilePath(diff);
        if (path) {
          contents[path] = await loadOriginalContent(path);
        }
      }
      setOriginalContents(contents);
      setLoading(false);
    };
    loadFiles();
  }, [diffs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e] border-l border-[#333]">
        <Loader2 size={24} className="animate-spin text-white/50" />
      </div>
    );
  }

  const firstDiff = diffs[0] || '';
  const filePath = extractFilePath(firstDiff) || 'unknown';
  const original = originalContents[filePath] || '';

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333] text-white">
      <div className="p-4 border-b border-[#333] shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileEdit size={20} className="text-[#519aba]" />
          Review Changes
        </h2>
        <p className="text-sm text-white/60 mt-1">
          {diffs.length} file(s) changed. Review before applying.
        </p>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <DiffEditor
            height="100%"
            language="python"
            original={original || '# New file\n'}
            modified={firstDiff}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              renderSideBySide: true,
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
