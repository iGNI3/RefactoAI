import os
import lancedb
import pyarrow as pa
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

# Using BAAI/bge-small-en-v1.5 as requested for better semantic code retrieval
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

class VectorStore:
    def __init__(self, db_path: str = "./lancedb_data"):
        self.db_path = db_path
        os.makedirs(self.db_path, exist_ok=True)
        self.db = lancedb.connect(self.db_path)
        
        print(f"[VectorStore] Loading Embedding Model: {EMBEDDING_MODEL_NAME}")
        self.model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        
        self.table_name = "codebase_index"
        
        # LanceDB schema using PyArrow
        self.schema = pa.schema([
            pa.field("id", pa.string()),
            pa.field("vector", pa.list_(pa.float32(), 384)), # BGE small uses 384 dim
            pa.field("text", pa.string()),
            pa.field("file_path", pa.string()),
            pa.field("symbol_name", pa.string()),
            pa.field("symbol_type", pa.string()),
            pa.field("language", pa.string())
        ])
        
        # Create table if it doesn't exist
        if self.table_name not in self.db.table_names():
            self.table = self.db.create_table(self.table_name, schema=self.schema)
        else:
            self.table = self.db.open_table(self.table_name)

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using BGE model with the standard 'instruction' format if needed.
        BGE recommends prefixing queries with instructions, but for documents we just encode."""
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

    def generate_query_embedding(self, query: str) -> List[float]:
        """BGE models perform better on retrieval when the query is prefixed."""
        query_prefix = "Represent this sentence for searching relevant passages: "
        # We'll use the prefix for queries to match BGE's training
        embedding = self.model.encode(query_prefix + query, normalize_embeddings=True)
        return embedding.tolist()

    def upsert_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Expects chunks like:
        {
            "id": "file.py::func_name",
            "text": "def func_name(): ...",
            "file_path": "file.py",
            "symbol_name": "func_name",
            "symbol_type": "function",
            "language": "python"
        }
        """
        if not chunks:
            return
            
        texts = [chunk["text"] for chunk in chunks]
        vectors = self.generate_embeddings(texts)
        
        data = []
        for i, chunk in enumerate(chunks):
            data.append({
                "id": chunk["id"],
                "vector": vectors[i],
                "text": chunk["text"],
                "file_path": chunk["file_path"],
                "symbol_name": chunk["symbol_name"],
                "symbol_type": chunk["symbol_type"],
                "language": chunk["language"]
            })
            
        self.table.add(data)
        print(f"[VectorStore] Upserted {len(data)} chunks into LanceDB.")

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        query_vector = self.generate_query_embedding(query)
        # We perform a vector search, then return the results
        results = self.table.search(query_vector).limit(limit).to_list()
        return results

    def clear(self):
        if self.table_name in self.db.table_names():
            self.db.drop_table(self.table_name)
        self.table = self.db.create_table(self.table_name, schema=self.schema)
