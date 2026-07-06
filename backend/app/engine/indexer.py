import logging
from typing import List, Dict, Any

from app.parser.document_loader import CodebaseLoader
from app.engine.vector_store import VectorStore

logger = logging.getLogger(__name__)

class CodebaseIndexer:
    def __init__(self, workspace_root: str, db_path: str = "./lancedb_data"):
        self.workspace_root = workspace_root
        self.loader = CodebaseLoader(workspace_root=self.workspace_root)
        self.vector_store = VectorStore(db_path=db_path)

    def index_workspace(self):
        """
        Loads the workspace, extracts AST chunks, and upserts them into LanceDB.
        """
        logger.info(f"Starting indexing for workspace: {self.workspace_root}")
        
        # 1. Load and chunk files
        raw_chunks = self.loader.load_and_chunk_all()
        
        if not raw_chunks:
            logger.warning("No valid chunks extracted from workspace.")
            return

        # 2. Transform raw chunks into LanceDB schema format
        lancedb_chunks = []
        for i, chunk in enumerate(raw_chunks):
            content = chunk.get("content", "")
            meta = chunk.get("metadata", {})
            
            source_file = meta.get("source_file", "unknown")
            node_type = meta.get("type", "unknown")
            start_line = meta.get("start_line", 0)
            
            # Create a unique ID for the chunk
            chunk_id = f"{source_file}::{start_line}::{i}"
            
            # We don't have explicit symbol names from tree-sitter yet, so we use type
            # For a production IDE, we would extract the function/class name.
            symbol_name = f"{node_type}_at_L{start_line}"
            
            # Determine language based on file extension
            language = "unknown"
            if source_file.endswith(".py"):
                language = "python"
            elif source_file.endswith((".ts", ".tsx")):
                language = "typescript"
            elif source_file.endswith((".js", ".jsx")):
                language = "javascript"

            lancedb_chunks.append({
                "id": chunk_id,
                "text": content,
                "file_path": source_file,
                "symbol_name": symbol_name,
                "symbol_type": node_type,
                "language": language
            })

        # 3. Upsert to LanceDB
        logger.info(f"Upserting {len(lancedb_chunks)} chunks to LanceDB...")
        # Since upsert_chunks does inference, we should do it in batches to avoid OOM
        BATCH_SIZE = 100
        for i in range(0, len(lancedb_chunks), BATCH_SIZE):
            batch = lancedb_chunks[i:i + BATCH_SIZE]
            self.vector_store.upsert_chunks(batch)
            
        logger.info("Indexing complete.")

    def clear_index(self):
        self.vector_store.clear()
        logger.info("Index cleared.")
