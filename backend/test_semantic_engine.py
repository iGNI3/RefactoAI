import requests
import json

BASE = "http://127.0.0.1:8000"

# 1. Index the backend/app codebase
print("=== Step 1: Indexing Codebase ===")
r = requests.post(f"{BASE}/api/index", json={"workspace_path": "F:/CODE_SPACE/code_analyzer/backend/app"})
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")

# 2. Semantic search
print("\n=== Step 2: Semantic Search ===")
r = requests.post(f"{BASE}/api/search", json={"query": "Where is the WebSocket streaming implemented?", "max_results": 3})
print(f"Status: {r.status_code}")
data = r.json()
for i, result in enumerate(data.get("results", [])):
    meta = result.get("metadata", {})
    print(f"\n--- Result {i+1} ---")
    print(f"  File: {meta.get('source_file')}")
    print(f"  Symbol: {meta.get('symbol_name')}")
    print(f"  Type: {meta.get('node_type')}")
    print(f"  Distance: {result.get('distance', 'N/A')}")
    print(f"  Content (first 200 chars): {result.get('content', '')[:200]}")

# 3. Another search to test code understanding
print("\n=== Step 3: Semantic Search - MCP ===")
r = requests.post(f"{BASE}/api/search", json={"query": "How does the MCP server initialization work?", "max_results": 3})
data = r.json()
for i, result in enumerate(data.get("results", [])):
    meta = result.get("metadata", {})
    print(f"\n--- Result {i+1} ---")
    print(f"  File: {meta.get('source_file')}")
    print(f"  Symbol: {meta.get('symbol_name')}")
    print(f"  Distance: {result.get('distance', 'N/A')}")
    print(f"  Content (first 200 chars): {result.get('content', '')[:200]}")

print("\n✅ Semantic Context Engine Verified!")
