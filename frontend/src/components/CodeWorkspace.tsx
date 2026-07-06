import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { InlineComposer } from "./InlineComposer";

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

interface CodeWorkspaceProps {
  results?: SearchResult[];
  activeFileContent?: string;
  activeFilePath?: string;
}

const getLanguage = (filename: string) => {
  if (filename.endsWith(".ts") || filename.endsWith(".tsx")) return "typescript";
  if (filename.endsWith(".js") || filename.endsWith(".jsx")) return "javascript";
  if (filename.endsWith(".py")) return "python";
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".css")) return "css";
  if (filename.endsWith(".html")) return "html";
  if (filename.endsWith(".md")) return "markdown";
  return "plaintext";
};

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({ results = [], activeFileContent, activeFilePath }) => {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsComposerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (activeFileContent !== undefined && activeFilePath !== undefined) {
    // IDE Mode: Render single file fullscreen
    return (
      <div className="relative w-full h-full bg-[#1e1e1e]">
        <InlineComposer 
          isOpen={isComposerOpen} 
          onClose={() => setIsComposerOpen(false)} 
          onSubmit={(prompt) => {
            console.log("Inline composer triggered for", activeFilePath, "with prompt:", prompt);
            // We would pipe this to our backend LLM here
          }}
        />
        <Editor
          height="100%"
          language={getLanguage(activeFilePath)}
          value={activeFileContent}
          theme="vs-dark"
          options={{
            readOnly: false,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: "on",
            wordWrap: "off",
            padding: { top: 16, bottom: 16 }
          }}
        />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-black/10 flex flex-col gap-4 mt-2">
        <h2
          className="text-[22px] font-semibold tracking-tight uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Code Workspace
        </h2>
        <div className="bg-[var(--color-base)] rounded-xl border border-black/5 p-8 min-h-[200px] flex items-center justify-center">
          <div className="text-center opacity-40">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <p className="text-[14px] font-medium uppercase tracking-wider">
              Code search results
            </p>
            <p className="text-[12px] mt-1 italic">
              Index a workspace, then use Search Mode to find code here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-black/10 flex flex-col gap-4 mt-2">
      <div className="flex justify-between items-center">
        <h2
          className="text-[22px] font-semibold tracking-tight uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Code Workspace
        </h2>
        <span className="text-[13px] opacity-50 font-medium">
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {results.map((result, idx) => (
          <div
            key={result.id}
            className="bg-[var(--color-base)] rounded-xl border border-black/5 overflow-hidden"
          >
            {/* File header */}
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-black/5 bg-black/[0.02]">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase bg-[var(--color-contrast)] text-white px-2 py-0.5 rounded">
                  #{idx + 1}
                </span>
                <span className="text-[13px] font-semibold tracking-tight">
                  {result.metadata.source_file}
                </span>
                <span className="text-[11px] opacity-40">
                  L{result.metadata.start_line}–{result.metadata.end_line}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase opacity-40 font-medium">
                  {result.metadata.node_type}
                </span>
                <span className="text-[11px] font-mono opacity-30">
                  d={result.distance.toFixed(4)}
                </span>
              </div>
            </div>

            {/* Code block */}
            <div className="h-[300px] w-full border-t border-black/5 bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={getLanguage(result.metadata.source_file)}
                value={result.content}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  padding: { top: 16, bottom: 16 }
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
