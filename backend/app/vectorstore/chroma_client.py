"""
ChromaDB Persistence, Collection Maps, and Semantic Querying.

Manages vector storage of AST code chunks and performs cosine
similarity searches for semantic code retrieval.

Milestone 3
"""

import os
from typing import List, Dict, Any

import chromadb
from chromadb.utils import embedding_functions

from app.parser.ast_chunker import ASTCodeChunker


class ChromaCodeIndexer:
    """
    Manages vector storage and similarity searches in ChromaDB.
    Uses OpenAI's text-embedding-3-small model and HNSW cosine index.
    """

    def __init__(self, database_directory: str):
        self.database_directory = database_directory
        self.client = chromadb.PersistentClient(path=database_directory)
        self.embed_func = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.environ.get("OPENAI_API_KEY", "dummy-key"),
            model_name="text-embedding-3-small",
        )
        self.collection = self.client.get_or_create_collection(
            name="codebase_ast_collection",
            embedding_function=self.embed_func,
            metadata={"hnsw:space": "cosine"},
        )

    def index_target_file(
        self, file_absolute_path: str, workspace_root: str
    ) -> int:
        """
        Decomposes a source file using cAST and indexes the chunks in ChromaDB.
        Returns the number of chunks indexed.
        """
        with open(file_absolute_path, "r", encoding="utf-8") as f:
            raw_code = f.read()

        chunker = ASTCodeChunker()
        ast_segments = chunker.generate_syntax_chunks(raw_code)

        file_relative_path = os.path.relpath(file_absolute_path, workspace_root)

        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []

        for idx, segment in enumerate(ast_segments):
            documents.append(segment["content"])
            metadatas.append(
                {
                    "source_file": file_relative_path,
                    "node_type": segment["metadata"]["type"],
                    "start_line": segment["metadata"]["start_line"],
                    "end_line": segment["metadata"]["end_line"],
                }
            )
            ids.append(f"{file_relative_path}#chunk_{idx}")

        if documents:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
            )

        return len(documents)

    def index_all_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """
        Batch upsert for bulk indexing from CodebaseLoader output.
        Returns the number of chunks indexed.
        """
        if not chunks:
            return 0

        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []

        for idx, chunk in enumerate(chunks):
            source_file = chunk["metadata"].get("source_file", "unknown")
            documents.append(chunk["content"])
            metadatas.append(
                {
                    "source_file": source_file,
                    "node_type": chunk["metadata"]["type"],
                    "start_line": chunk["metadata"]["start_line"],
                    "end_line": chunk["metadata"]["end_line"],
                }
            )
            ids.append(f"{source_file}#chunk_{idx}")

        # ChromaDB batch upsert in manageable chunks
        batch_size = 5000
        for i in range(0, len(documents), batch_size):
            end = min(i + batch_size, len(documents))
            self.collection.upsert(
                ids=ids[i:end],
                documents=documents[i:end],
                metadatas=metadatas[i:end],
            )

        return len(documents)

    def semantic_code_search(
        self, query: str, max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves matching code chunks from the vector database using
        cosine similarity search.
        """
        query_results = self.collection.query(
            query_texts=[query],
            n_results=max_results,
        )

        matches: List[Dict[str, Any]] = []
        if (
            query_results
            and "documents" in query_results
            and query_results["documents"]
        ):
            docs = query_results["documents"][0]
            ids = query_results["ids"][0]
            metas = query_results["metadatas"][0]
            distances = (
                query_results["distances"][0]
                if "distances" in query_results
                else [0.0] * len(docs)
            )
            for idx in range(len(docs)):
                matches.append(
                    {
                        "id": ids[idx],
                        "content": docs[idx],
                        "metadata": metas[idx],
                        "distance": distances[idx],
                    }
                )
        return matches

    def get_collection_stats(self) -> Dict[str, Any]:
        """Returns live statistics from the ChromaDB collection."""
        try:
            count = self.collection.count()
            # Get unique source files from metadata
            unique_files: set = set()
            if count > 0:
                # Peek at all stored metadata to count unique files
                peek = self.collection.peek(limit=min(count, 10000))
                if peek and "metadatas" in peek and peek["metadatas"]:
                    for meta in peek["metadatas"]:
                        if meta and "source_file" in meta:
                            unique_files.add(meta["source_file"])
            return {
                "total_chunks": count,
                "indexed_files": len(unique_files),
            }
        except Exception:
            return {"total_chunks": 0, "indexed_files": 0}

    def get_all_nodes(self) -> List[Dict[str, Any]]:
        """Retrieves all indexed nodes to build an AST graph."""
        try:
            count = self.collection.count()
            if count == 0:
                return []
            
            # Limit to 1000 nodes for frontend performance
            result = self.collection.get(limit=min(count, 1000))
            nodes = []
            if result and "metadatas" in result and result["metadatas"]:
                for idx, meta in enumerate(result["metadatas"]):
                    nodes.append({
                        "id": result["ids"][idx],
                        "metadata": meta,
                    })
            return nodes
        except Exception:
            return []

    def clear_collection(self) -> None:
        """Deletes and re-creates the collection for re-indexing workflows."""
        self.client.delete_collection("codebase_ast_collection")
        self.collection = self.client.get_or_create_collection(
            name="codebase_ast_collection",
            embedding_function=self.embed_func,
            metadata={"hnsw:space": "cosine"},
        )
