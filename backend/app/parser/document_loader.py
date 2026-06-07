"""
Code Discovery and Filesystem Indexing Loader.

Walks a codebase directory, filters supported source files, and
feeds them through the cAST chunker for batch processing.

Milestone 2
"""

import os
import logging
from typing import List, Dict, Any

from app.parser.ast_chunker import ASTCodeChunker

logger = logging.getLogger(__name__)


class CodebaseLoader:
    """
    Discovers source files in a workspace and produces AST-aware chunks
    suitable for vector indexing.
    """

    # Directories to always skip during recursive discovery
    SKIP_DIRS = {
        "__pycache__", ".git", "node_modules", "venv", ".venv",
        ".tox", "dist", "build", ".mypy_cache", ".ruff_cache",
    }

    def __init__(self, workspace_root: str, extensions: List[str] | None = None):
        self.workspace_root = os.path.abspath(workspace_root)
        self.extensions = extensions or [".py"]
        self._chunker = ASTCodeChunker()

    def discover_source_files(self) -> List[str]:
        """
        Recursively walks the workspace and returns absolute paths to all
        files whose extensions match the configured list.
        """
        discovered: List[str] = []
        for dirpath, dirnames, filenames in os.walk(self.workspace_root):
            # Prune directories we never want to enter
            dirnames[:] = [d for d in dirnames if d not in self.SKIP_DIRS]
            for fname in filenames:
                if any(fname.endswith(ext) for ext in self.extensions):
                    discovered.append(os.path.join(dirpath, fname))

        logger.info(
            "Discovered %d source files in %s", len(discovered), self.workspace_root
        )
        return discovered

    def load_and_chunk_all(self) -> List[Dict[str, Any]]:
        """
        Iterates over discovered files, parses each with ASTCodeChunker, and
        attaches the relative ``source_file`` path to every chunk's metadata.

        Files that fail utf-8 decoding are logged and skipped.
        """
        files = self.discover_source_files()
        all_chunks: List[Dict[str, Any]] = []
        skipped = 0

        for file_path in files:
            try:
                with open(file_path, "r", encoding="utf-8") as fh:
                    source_code = fh.read()
            except (UnicodeDecodeError, OSError) as exc:
                logger.warning("Skipping %s: %s", file_path, exc)
                skipped += 1
                continue

            chunks = self._chunker.generate_syntax_chunks(source_code)
            rel_path = os.path.relpath(file_path, self.workspace_root)
            for chunk in chunks:
                chunk["metadata"]["source_file"] = rel_path
            all_chunks.extend(chunks)

        logger.info(
            "Loaded %d files → %d chunks (%d skipped)",
            len(files) - skipped,
            len(all_chunks),
            skipped,
        )
        return all_chunks
