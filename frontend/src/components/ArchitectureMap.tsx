import React, { useEffect, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FileCode, FunctionSquare, Brackets } from "lucide-react";

interface ASTNode {
  id: string;
  metadata: {
    source_file: string;
    node_type: string;
    symbol_name?: string;
    symbol_type?: string;
  };
}

// Custom Node Component for Files
const FileNodeComponent = ({ data }: { data: any }) => {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg w-64 overflow-hidden">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="bg-[var(--color-base)] p-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <FileCode size={16} className="text-blue-500" />
        <span className="text-[12px] font-bold truncate">{data.filename}</span>
      </div>
      <div className="p-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
        {data.chunks.map((c: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[11px] opacity-70 bg-black/5 p-1 rounded">
            {c.symbol_type === "function_definition" || c.node_type === "function_definition" ? <FunctionSquare size={12} className="text-amber-500" /> : <Brackets size={12} />}
            <span className="truncate">{c.symbol_type || c.node_type}: {c.symbol_name || "unknown"}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  fileNode: FileNodeComponent,
};

export const ArchitectureMap: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch("/api/ast-nodes");
        const data = await res.json();
        
        // Group by file
        const fileMap = new Map<string, any[]>();
        data.nodes.forEach((n: ASTNode) => {
          const file = n.metadata.source_file;
          if (!fileMap.has(file)) fileMap.set(file, []);
          fileMap.get(file)?.push(n.metadata);
        });

        const newNodes: Node[] = [];
        let x = 50;
        let y = 50;
        let colCount = 0;

        fileMap.forEach((chunks, filename) => {
          newNodes.push({
            id: filename,
            type: "fileNode",
            position: { x, y },
            data: { filename, chunks },
          });

          x += 300;
          colCount++;
          if (colCount > 3) {
            colCount = 0;
            x = 50;
            y += 250;
          }
        });

        setNodes(newNodes);
      } catch (err) {
        console.error("Failed to fetch AST nodes:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNodes();
  }, [setNodes]);

  if (isLoading) {
    return <div className="h-[600px] flex items-center justify-center">Loading Architecture Map...</div>;
  }

  return (
    <div className="h-[600px] w-full border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-base)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#ccc" gap={16} />
        <Controls />
        <MiniMap zoomable pannable nodeColor="var(--color-contrast)" />
      </ReactFlow>
    </div>
  );
};
