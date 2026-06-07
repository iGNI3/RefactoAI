"""
cAST Tree-Sitter Chunking Engine.

Parses source code into Abstract Syntax Trees using tree-sitter and
splits it recursively into syntactically valid, size-bounded code chunks.

This module solves the structural fragmentation problem found in naive
line-based text splitters by respecting AST node boundaries.

Milestone 1
"""

from typing import List, Dict, Any
import logging

try:
    from tree_sitter import Parser, Language, Node
    import tree_sitter_python
    TREE_SITTER_AVAILABLE = True
except Exception as e:
    logging.warning(f"tree_sitter not available, falling back to basic chunking: {e}")
    TREE_SITTER_AVAILABLE = False


class ASTCodeChunker:
    """
    Parses source code into an Abstract Syntax Tree (AST) using tree-sitter,
    and splits it recursively into syntactically valid code chunks.
    Falls back to basic line chunking if tree-sitter is unavailable.
    """

    def __init__(self, target_chunk_size: int = 500, overlap: int = 50):
        self.target_chunk_size = target_chunk_size
        self.overlap = overlap
        if TREE_SITTER_AVAILABLE:
            try:
                # Tree-sitter >= 0.22 uses Language(capsule)
                self.python_language = Language(tree_sitter_python.language())
            except Exception:
                # Fallback for older tree-sitter bindings
                self.python_language = Language(tree_sitter_python.language(), "python")
            self.parser = Parser()
            self.parser.language = self.python_language
        else:
            self.parser = None

    def generate_syntax_chunks(self, source_code: str) -> List[Dict[str, Any]]:
        """
        Parses raw code and splits it into structurally cohesive chunks.
        Returns a list of chunk dicts with 'content' and 'metadata' keys.
        """
        if not TREE_SITTER_AVAILABLE or not self.parser:
            return self._basic_chunk_fallback(source_code)

        source_bytes = bytes(source_code, "utf-8")
        tree = self.parser.parse(source_bytes)
        chunks: List[Dict[str, Any]] = []

        # Traverse the tree starting from the root node
        self._decompose_node(tree.root_node, source_bytes, chunks)
        return self._merge_sibling_chunks(chunks)

    def _basic_chunk_fallback(self, source_code: str) -> List[Dict[str, Any]]:
        """Basic line-based chunker for when tree-sitter is unavailable."""
        lines = source_code.split('\n')
        chunks = []
        current_chunk = []
        current_len = 0
        start_line = 1
        
        for i, line in enumerate(lines):
            line_len = len(line) + 1
            if current_len + line_len > self.target_chunk_size and current_chunk:
                chunks.append({
                    "content": '\n'.join(current_chunk),
                    "metadata": {
                        "type": "fallback_chunk",
                        "start_line": start_line,
                        "end_line": i
                    }
                })
                current_chunk = []
                current_len = 0
                start_line = i + 1
                
            current_chunk.append(line)
            current_len += line_len
            
        if current_chunk:
            chunks.append({
                "content": '\n'.join(current_chunk),
                "metadata": {
                    "type": "fallback_chunk",
                    "start_line": start_line,
                    "end_line": len(lines)
                }
            })
        return chunks

    def _decompose_node(
        self, node: Node, source_bytes: bytes, chunks: List[Dict[str, Any]]
    ) -> None:
        """
        Recursively splits nodes that exceed the target size limit.
        Atomic nodes within the budget are captured directly; oversized
        nodes recurse into children. Terminal leaves exceeding the limit
        are captured with a 'terminal_' prefix.
        """
        node_raw_content = source_bytes[node.start_byte : node.end_byte].decode(
            "utf-8", errors="ignore"
        )
        node_length = len(node_raw_content)

        # If the node fits within the target size, capture it as an atomic unit
        if node_length <= self.target_chunk_size:
            if node_length > 15:  # Skip trivial declarations or syntax markers
                chunks.append(
                    {
                        "content": node_raw_content,
                        "metadata": {
                            "type": node.type,
                            "start_line": node.start_point[0] + 1,
                            "end_line": node.end_point[0] + 1,
                        },
                    }
                )
        else:
            # If the node exceeds the size limit, split and process its children
            if len(node.children) > 0:
                for child in node.children:
                    self._decompose_node(child, source_bytes, chunks)
            else:
                # Capture terminal leaf nodes even if they exceed limits
                chunks.append(
                    {
                        "content": node_raw_content,
                        "metadata": {
                            "type": f"terminal_{node.type}",
                            "start_line": node.start_point[0] + 1,
                            "end_line": node.end_point[0] + 1,
                        },
                    }
                )

    def _merge_sibling_chunks(
        self, chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Aggregates small sibling chunks (e.g. variable assignments, simple returns)
        to maintain context while respecting target size limits.
        Uses greedy accumulation: combine sequential chunks while their combined
        length stays within the target_chunk_size budget.
        """
        merged_list: List[Dict[str, Any]] = []
        if not chunks:
            return merged_list

        current_accumulator = chunks[0]["content"]
        current_meta = dict(chunks[0]["metadata"])  # copy to avoid mutation

        for next_chunk in chunks[1:]:
            next_content = next_chunk["content"]
            next_meta = next_chunk["metadata"]

            # If combining sibling nodes does not exceed the size limit, merge them
            if len(current_accumulator) + len(next_content) <= self.target_chunk_size:
                current_accumulator += "\n" + next_content
                current_meta["end_line"] = next_meta["end_line"]
                current_meta["type"] = "aggregated_nodes"
            else:
                merged_list.append(
                    {"content": current_accumulator, "metadata": current_meta}
                )
                current_accumulator = next_content
                current_meta = dict(next_meta)

        # Append remaining accumulated nodes
        merged_list.append({"content": current_accumulator, "metadata": current_meta})
        return merged_list
