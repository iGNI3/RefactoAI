import React, { useState, useEffect } from 'react';
import { Folder, File, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

interface FileTreeProps {
  onFileSelect: (path: string, content: string) => void;
  workspacePath?: string;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isOpen?: boolean;
  children?: FileNode[];
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, workspacePath = './' }) => {
  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const electronAPI = (window as any).electronAPI;

  const loadDirectory = async (dirPath: string): Promise<FileNode[]> => {
    if (!electronAPI) return [];
    try {
      const files = await electronAPI.readDir(dirPath);
      return files.map((f: any) => ({
        ...f,
        isOpen: false
      }));
    } catch (err) {
      console.error("Failed to load directory", err);
      return [];
    }
  };

  useEffect(() => {
    if (electronAPI) {
      loadDirectory(workspacePath).then(setRootNodes);
    }
  }, [workspacePath]);

  const toggleDirectory = async (node: FileNode, siblings: FileNode[], updateParent: (newNodes: FileNode[]) => void) => {
    if (!node.isDirectory) return;

    const updatedNode = { ...node, isOpen: !node.isOpen };
    
    // If opening for the first time, fetch children
    if (updatedNode.isOpen && !updatedNode.children) {
      updatedNode.children = await loadDirectory(node.path);
    }

    const newNodes = siblings.map(n => n.path === node.path ? updatedNode : n);
    updateParent(newNodes);
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) return;
    setActiveFile(node.path);
    
    if (electronAPI) {
      const content = await electronAPI.readFile(node.path);
      onFileSelect(node.path, content);
    }
  };

  const renderNodes = (nodes: FileNode[], updateParent: (n: FileNode[]) => void, depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div 
          onClick={() => {
            if (node.isDirectory) {
              toggleDirectory(node, nodes, updateParent);
            } else {
              handleFileClick(node);
            }
          }}
          className={`flex items-center gap-1.5 py-1 pr-3 cursor-pointer select-none text-[13px] ${
            activeFile === node.path ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e] text-[#cccccc]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {node.isDirectory ? (
            <>
              {node.isOpen ? <ChevronDown size={14} className="opacity-70" /> : <ChevronRight size={14} className="opacity-70" />}
              {node.isOpen ? <FolderOpen size={14} className="text-[#dcb67a]" /> : <Folder size={14} className="text-[#dcb67a]" />}
            </>
          ) : (
            <>
              <span className="w-[14px]"></span> {/* Indent spacer for files to align with folder icons */}
              <File size={14} className="text-[#519aba]" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.isDirectory && node.isOpen && node.children && (
          renderNodes(
            node.children, 
            (newChildren) => {
              const updatedNode = { ...node, children: newChildren };
              const newNodes = nodes.map(n => n.path === node.path ? updatedNode : n);
              updateParent(newNodes);
            },
            depth + 1
          )
        )}
      </div>
    ));
  };

  return (
    <div className="w-full h-full bg-[#181818] overflow-y-auto border-r border-[#333333] flex flex-col font-sans">
      <div className="p-3 text-[11px] uppercase font-bold tracking-wider text-white/50">
        Explorer
      </div>
      <div className="flex flex-col pb-4 h-full">
        {electronAPI ? (
          (!workspacePath || workspacePath === './') ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 text-center">
              <span className="text-[12px] text-white/50">You have not yet opened a folder.</span>
              <button 
                onClick={() => electronAPI.openFolder()}
                className="px-4 py-1.5 bg-[#519aba] hover:bg-[#62a5c4] text-white text-[12px] rounded transition-colors"
              >
                Open Folder
              </button>
            </div>
          ) : (
            renderNodes(rootNodes, setRootNodes)
          )
        ) : (
          <div className="p-4 text-xs text-white/50 text-center">
            File Explorer is only available in the Desktop App.
          </div>
        )}
      </div>
    </div>
  );
};
