# PLAN.md — Incremental Implementation Checkpoints

> **Source of truth**: [`SPECS.md`](file:///F:/CODE_SPACE/code_analyzer/SPECS.md)
> **Repository root**: `F:\CODE_SPACE\code_analyzer`

---

## Overview

This document decomposes the Autonomous Source Code Analysis & Refactoring Platform into **10 incremental milestones**. Each milestone is self-contained, testable in isolation, and builds upon the previous one. The architecture follows the monorepo layout defined in SPECS.md (`/backend` + `/frontend`).

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend framework | Python 3.11+, FastAPI, Uvicorn |
| LLM orchestration | LangChain (langchain-core, langchain-openai, langchain-anthropic, langchain-google-genai, langchain-community) |
| Code parsing | tree-sitter, tree-sitter-python (+ JS/TS/Java/Go grammars later) |
| Vector store | ChromaDB (PersistentClient, HNSW cosine, OpenAI embeddings) |
| MCP integration | mcp SDK, langchain-mcp-adapters (stdio, WebSocket, HTTP transports) |
| Patching | Unified diffs, subprocess `patch` utility, sandbox isolation |
| Frontend framework | React 18, TypeScript, Vite |
| Frontend styling | Tailwind CSS (beige theme tokens), custom Helvetica Now Display fonts |
| Real-time comms | WebSocket (native browser ↔ FastAPI) |

---

## Milestone 0 — Project Scaffolding & Dev Environment

**Goal**: Establish the monorepo skeleton, dependency files, and dev tooling so every subsequent milestone has a runnable foundation.

### Tasks

- [ ] Create the top-level directory structure:
  ```
  /backend
  │   /app
  │   │   /__init__.py
  │   │   /config/__init__.py
  │   │   /core/__init__.py
  │   │   /mcp/__init__.py
  │   │   /parser/__init__.py
  │   │   /vectorstore/__init__.py
  │   pyproject.toml
  │   requirements.txt
  /frontend
      (scaffolded via Vite in Milestone 7)
  ```
- [ ] Write `backend/pyproject.toml` with project metadata and `[project.scripts]` entry for `uvicorn`.
- [ ] Write `backend/requirements.txt` with pinned versions:
  - `fastapi`, `uvicorn[standard]`, `websockets`
  - `langchain-core`, `langchain-openai`, `langchain-anthropic`, `langchain-google-genai`, `langchain-community`
  - `tree-sitter`, `tree-sitter-python`
  - `chromadb`
  - `mcp`, `langchain-mcp-adapters`
  - `python-dotenv`
- [ ] Create `backend/app/config/settings.py` — Pydantic `BaseSettings` loading API keys from `.env`:
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY`
  - `WORKSPACE_ROOT` (default `./sandbox_workspace`)
  - `CHROMA_DB_PATH` (default `./chroma_db`)
  - `MAX_DIFF_LINES` (default `120`)
- [ ] Create `backend/.env.example` documenting all required environment variables.
- [ ] Add a minimal `backend/app/main.py` that returns `{"status": "ok"}` on `GET /health`.

### Verification

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/health   # → {"status": "ok"}
```

---

## Milestone 1 — cAST Parser: Tree-Sitter AST Chunking Engine

**Goal**: Implement the `ASTCodeChunker` class that parses Python source files into syntactically valid, size-bounded code chunks using tree-sitter.

### File: `backend/app/parser/ast_chunker.py`

### Tasks

- [ ] Initialize tree-sitter with the Python language binding (`tree_sitter_python.language()`).
- [ ] Implement `generate_syntax_chunks(source_code: str) -> List[dict]`:
  - Parse source bytes into an AST.
  - Call recursive `_decompose_node()` starting from `tree.root_node`.
  - Call `_merge_sibling_chunks()` to aggregate small adjacent nodes.
- [ ] Implement `_decompose_node(node, source_bytes, chunks)`:
  - If node text ≤ `target_chunk_size` (default 500 chars) and > 15 chars → capture as atomic chunk with metadata (`type`, `start_line`, `end_line`).
  - If node text > target → recurse into children.
  - Terminal leaf nodes exceeding limits are captured with `terminal_` prefix.
- [ ] Implement `_merge_sibling_chunks(chunks)`:
  - Greedy accumulation: combine sequential chunks while combined length ≤ `target_chunk_size`.
  - Update metadata (`end_line`, type → `"aggregated_nodes"`).
- [ ] Return chunk dicts: `{"content": str, "metadata": {"type": str, "start_line": int, "end_line": int}}`.

### Verification

```python
# backend/tests/test_ast_chunker.py
from app.parser.ast_chunker import ASTCodeChunker

chunker = ASTCodeChunker(target_chunk_size=500)
sample = '''
class Calculator:
    def add(self, a, b):
        return a + b
    def subtract(self, a, b):
        return a - b
'''
chunks = chunker.generate_syntax_chunks(sample)

assert len(chunks) > 0
for chunk in chunks:
    assert "content" in chunk
    assert "metadata" in chunk
    assert chunk["metadata"]["start_line"] >= 1
    assert len(chunk["content"]) > 15  # no trivial fragments
    # Verify syntactical completeness: no truncated code
    assert chunk["content"].strip() != ""
print(f"✓ Generated {len(chunks)} syntax-aware chunks")
```

**Target metric**: MET-03 — ≥99% syntax truncation avoidance.

---

## Milestone 2 — Document Loader: Filesystem Discovery & Batch Parsing

**Goal**: Walk a codebase directory, filter supported source files, and feed them through the cAST chunker.

### File: `backend/app/parser/document_loader.py`

### Tasks

- [ ] Implement `CodebaseLoader` class:
  - `__init__(self, workspace_root: str, extensions: List[str])` — default extensions: `.py`.
  - `discover_source_files() -> List[str]` — recursive `os.walk`, skip `__pycache__`, `.git`, `node_modules`, `venv`.
  - `load_and_chunk_all() -> List[dict]` — iterate discovered files, parse each with `ASTCodeChunker`, attach `source_file` relative path to metadata.
- [ ] Handle encoding errors gracefully (skip files that fail `utf-8` decode).
- [ ] Log discovery stats: files found, chunks produced, files skipped.

### Verification

```python
# Point at a small Python project (e.g., the backend/app itself)
from app.parser.document_loader import CodebaseLoader

loader = CodebaseLoader(workspace_root="./app", extensions=[".py"])
files = loader.discover_source_files()
assert len(files) >= 3  # at least __init__.py files + main.py
all_chunks = loader.load_and_chunk_all()
assert len(all_chunks) > 0
print(f"✓ Discovered {len(files)} files → {len(all_chunks)} chunks")
```

---

## Milestone 3 — ChromaDB Vector Store: Indexing & Semantic Search

**Goal**: Implement `ChromaCodeIndexer` to persist AST chunks as vectors and retrieve semantically similar code via cosine similarity.

### File: `backend/app/vectorstore/chroma_client.py`

### Tasks

- [ ] Implement `ChromaCodeIndexer.__init__(database_directory)`:
  - Create `chromadb.PersistentClient`.
  - Configure `OpenAIEmbeddingFunction` (model: `text-embedding-3-small`).
  - Create/get collection `"codebase_ast_collection"` with `{"hnsw:space": "cosine"}`.
- [ ] Implement `index_target_file(file_absolute_path, workspace_root)`:
  - Read file → parse with `ASTCodeChunker` → `collection.upsert()` with IDs `"{relative_path}#chunk_{idx}"`.
  - Metadata: `source_file`, `node_type`, `start_line`, `end_line`.
- [ ] Implement `index_all_chunks(chunks: List[dict])`:
  - Batch upsert for bulk indexing from `CodebaseLoader`.
- [ ] Implement `semantic_code_search(query, max_results=5) -> List[dict]`:
  - `collection.query(query_texts=[query], n_results=max_results)`.
  - Return list of `{"id", "content", "metadata", "distance"}`.
- [ ] Implement `clear_collection()` for re-indexing workflows.

### Verification

```python
from app.vectorstore.chroma_client import ChromaCodeIndexer

indexer = ChromaCodeIndexer(database_directory="./test_chroma_db")
# Index a sample file
indexer.index_target_file("./app/main.py", workspace_root="./app")

# Search
results = indexer.semantic_code_search("FastAPI health endpoint", max_results=3)
assert len(results) > 0
assert "content" in results[0]
print(f"✓ Top result distance: {results[0]['distance']:.4f}")
# Cleanup
indexer.clear_collection()
```

**Target metric**: MET-02 — <200ms index latency under 100K chunks.

---

## Milestone 4 — Multi-Model Router: Provider-Agnostic LLM Streaming

**Goal**: Implement the `UnifiedModelRouter` supporting Anthropic, OpenAI, DeepSeek, Google GenAI, and Ollama with provider-specific payload sanitization and extended thinking controls.

### File: `backend/app/core/orchestrator.py`

### Tasks

- [ ] Implement `UnifiedModelRouter.__init__()` — load API keys from environment.
- [ ] Implement `sanitize_history_for_provider(messages, provider)`:
  - Deep-copy messages.
  - Strip `reasoning_content` from all messages (prevents DeepSeek 400 errors).
  - For DeepSeek: also clean `additional_kwargs["reasoning_content"]`.
- [ ] Implement `parse_langchain_history(messages) -> List[BaseMessage]`:
  - Convert `{"role", "content"}` dicts → `SystemMessage`, `HumanMessage`, `AIMessage`.
  - Preserve `reasoning_content` in `AIMessage.additional_kwargs` when present.
- [ ] Implement `execute_stream(provider, model_name, messages, thinking_budget)`:
  - **Anthropic** path: Configure `ChatAnthropic` with thinking budget, `temperature=1.0` when thinking enabled, intercept thinking blocks from `additional_kwargs`.
  - **DeepSeek** path: Use `ChatOpenAI` with `openai_api_base="https://api.deepseek.com"`, intercept `reasoning_content`.
  - **OpenAI** path: Standard `ChatOpenAI`, support `reasoning_effort` for o3-mini.
  - **Google** path: `ChatGoogleGenerativeAI`.
  - **Ollama** path: `ChatOllama` for local models.
  - Yield `{"type": "thought"|"content", "content": str}` for all providers.
- [ ] Raise `ValueError` for unknown providers.

### Verification

```python
# Requires at least one valid API key in .env
from app.core.orchestrator import UnifiedModelRouter
import asyncio

router = UnifiedModelRouter()

# Test history sanitization
test_msgs = [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi", "reasoning_content": "internal thought"}
]
sanitized = router.sanitize_history_for_provider(test_msgs, "deepseek")
assert "reasoning_content" not in sanitized[1]

# Test LangChain parsing
lc_msgs = router.parse_langchain_history([{"role": "system", "content": "You are helpful"}])
assert lc_msgs[0].__class__.__name__ == "SystemMessage"

# (Optional) Live streaming test with a real key:
# async for chunk in router.execute_stream("openai", "gpt-4o", test_msgs, 0):
#     print(chunk)

print("✓ Router sanitization and parsing verified")
```

**Target metric**: MET-01 — <150ms routing overhead.

---

## Milestone 5 — MCP Multi-Server Connection Pool

**Goal**: Implement `MCPMultiServerManager` to register, connect, harvest tools, and execute tool calls across multiple MCP servers (stdio transport first).

### File: `backend/app/mcp/client_manager.py`

### Tasks

- [ ] Implement `MCPMultiServerManager.__init__()` — initialize `server_registry`, `active_sessions`, `consolidated_tools_list`.
- [ ] Implement `register_stdio_server(server_identifier, execution_command, execution_arguments)`:
  - Store `StdioServerParameters` in registry.
- [ ] Implement `initialize_all_connections()`:
  - For each registered server: open `stdio_client` transport → create `ClientSession` → `session.initialize()`.
  - Store in `active_sessions` dict.
  - Handle and log connection failures gracefully.
- [ ] Implement `harvest_registered_tools() -> List`:
  - For each active session: `load_mcp_tools(session)`.
  - Prefix tool names with `"{server_id}_"` to prevent conflicts.
- [ ] Implement `execute_pooled_tool(tool_identifier, execution_arguments)`:
  - Parse `"{server_prefix}_{tool_name}"` format.
  - Route to correct session → `session.call_tool()`.
- [ ] Implement `disconnect_all()` — graceful session teardown.

### Verification

```python
# Requires Node.js installed (for npx MCP servers)
from app.mcp.client_manager import MCPMultiServerManager
import asyncio

async def test_mcp():
    mgr = MCPMultiServerManager()
    mgr.register_stdio_server(
        "fs",
        "npx",
        ["-y", "@modelcontextprotocol/server-filesystem", "./sandbox_workspace"]
    )
    await mgr.initialize_all_connections()
    tools = await mgr.harvest_registered_tools()
    assert len(tools) > 0
    print(f"✓ Harvested {len(tools)} tools: {[t.name for t in tools]}")
    await mgr.disconnect_all()

asyncio.run(test_mcp())
```

---

## Milestone 6 — Sandboxed PatchPilot: Secure Diff Application & Self-Correction

**Goal**: Implement `SandboxedPatchPilot` with path boundary enforcement, diff line budgets, syntax validation, and test suite execution.

### File: `backend/app/core/patcher.py`

### Tasks

- [ ] Implement `SandboxedPatchPilot.__init__(workspace_directory, max_changed_lines_budget=120)`:
  - Resolve and create workspace root directory.
- [ ] Implement `verify_workspace_boundary(relative_file_path) -> str`:
  - Compute absolute path → assert it starts with `workspace_root`.
  - Raise `PermissionError` on path traversal attempts.
- [ ] Implement `calculate_changed_lines(unified_diff_raw) -> int`:
  - Count lines starting with `+` or `-` (excluding `+++`/`---` headers).
- [ ] Implement `apply_diff_patch(target_relative_path, unified_diff_content) -> Tuple[bool, str]`:
  - Verify boundary → check line budget → write temp `.patch` file → run `patch --forward` via `subprocess` → validate syntax → return `(success, message)`.
  - Handle `PermissionError`, `TimeoutExpired`, and general exceptions.
- [ ] Implement `validate_syntax(file_absolute_path) -> Tuple[bool, str]`:
  - For `.py` files: `compile(source, path, "exec")`.
  - Skip non-Python files with success message.
- [ ] Implement `run_workspace_verification_suite(test_trigger_command) -> Tuple[bool, str]`:
  - `subprocess.run(command, shell=True, cwd=workspace_root, timeout=30)`.

### Verification

```python
from app.core.patcher import SandboxedPatchPilot
import os

pilot = SandboxedPatchPilot("./test_sandbox", max_changed_lines_budget=120)

# 1. Path traversal block
try:
    pilot.verify_workspace_boundary("../../etc/passwd")
    assert False, "Should have raised PermissionError"
except PermissionError:
    print("✓ Path traversal blocked")

# 2. Line budget enforcement
big_diff = "\n".join([f"+line{i}" for i in range(200)])
count = pilot.calculate_changed_lines(big_diff)
assert count == 200
print(f"✓ Counted {count} changed lines")

# 3. Syntax validation
test_file = os.path.join(pilot.workspace_root, "valid.py")
with open(test_file, "w") as f:
    f.write("x = 1 + 2\n")
valid, msg = pilot.validate_syntax(test_file)
assert valid
print(f"✓ Syntax validation passed: {msg}")

# 4. Syntax error detection
bad_file = os.path.join(pilot.workspace_root, "broken.py")
with open(bad_file, "w") as f:
    f.write("def foo(\n")  # deliberate syntax error
valid, msg = pilot.validate_syntax(bad_file)
assert not valid
print(f"✓ Syntax error caught: {msg}")
```

**Target metrics**: MET-04 (100% isolation), MET-05 (≤3 correction turns).

---

## Milestone 7 — FastAPI WebSocket Gateway & REST Endpoints

**Goal**: Wire all backend modules into `main.py` with a WebSocket streaming endpoint, REST endpoints for indexing/search, and startup lifecycle hooks.

### File: `backend/app/main.py`

### Tasks

- [ ] Initialize global instances: `UnifiedModelRouter`, `MCPMultiServerManager`, `ChromaCodeIndexer`.
- [ ] `@app.on_event("startup")`:
  - Register default MCP servers (filesystem).
  - `initialize_all_connections()` + `harvest_registered_tools()`.
- [ ] `POST /api/index` — Accept `{"workspace_path": str}`, run `CodebaseLoader` + `ChromaCodeIndexer` batch indexing, return chunk count.
- [ ] `POST /api/search` — Accept `{"query": str, "max_results": int}`, return semantic search results.
- [ ] `WebSocket /ws/refactor-stream`:
  - Accept connection.
  - Receive JSON: `{provider, model, messages, thinking_budget}`.
  - Stream `execute_stream()` chunks back as JSON.
  - Send `{"type": "status", "content": "Execution cycle complete"}` on finish.
  - Handle `WebSocketDisconnect` and unexpected errors.
- [ ] `POST /api/patch` — Accept `{"file_path": str, "diff": str}`, apply via `SandboxedPatchPilot`, return result.
- [ ] Configure CORS middleware (`allow_origins=["*"]` for development).

### Verification

```bash
# Terminal 1: Start server
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2: Test REST endpoints
curl -X POST http://localhost:8000/api/index \
  -H "Content-Type: application/json" \
  -d '{"workspace_path": "./app"}'
# → {"status": "indexed", "chunks": N}

curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "health endpoint", "max_results": 3}'
# → {"results": [...]}

# Terminal 3: Test WebSocket (using websocat or Python)
python -c "
import asyncio, websockets, json
async def test():
    async with websockets.connect('ws://localhost:8000/ws/refactor-stream') as ws:
        await ws.send(json.dumps({
            'provider': 'openai', 'model': 'gpt-4o',
            'messages': [{'role': 'user', 'content': 'Say hello'}],
            'thinking_budget': 0
        }))
        async for msg in ws:
            print(json.loads(msg))
asyncio.run(test())
"
```

---

## Milestone 8 — Frontend Scaffolding: Vite + React + Tailwind + Beige Theme

**Goal**: Initialize the frontend project with Vite, configure Tailwind with the beige design system, load custom fonts, and create the application shell.

### Tasks

- [ ] Scaffold Vite + React + TypeScript project in `/frontend`:
  ```bash
  npx -y create-vite@latest ./frontend --template react-ts
  cd frontend && npm install
  npm install -D tailwindcss @tailwindcss/vite
  ```
- [ ] Configure `tailwind.config.js`:
  - Extend colors with beige palette: `beige-base: '#f5f5f0'`, `beige-dark: '#e6e6d8'`, `beige-contrast: '#121210'`, `beige-border: 'rgba(18,18,16,0.1)'`.
  - Extend `fontFamily` with `heading` and `body` referencing CSS variables.
- [ ] Configure `vite.config.ts` with proxy to backend (`/api` → `http://localhost:8000`, `/ws` → `ws://localhost:8000`).
- [ ] Write `frontend/src/index.css`:
  - Import Helvetica Now Display fonts from `db.onlinewebfonts.com`.
  - Define `:root` CSS variables (`--font-heading`, `--font-body`, color tokens).
  - Base `body` styles: beige background, contrast text, antialiased rendering.
  - Import tailwind directives.
- [ ] Write `frontend/src/App.tsx`:
  - Two-view layout: `HeroSection` (landing) → `ConsolePanel` (dashboard).
  - State toggle: `showDashboard` controlled by hero CTA clicks.
- [ ] Create empty component stubs:
  - `frontend/src/components/HeroSection.tsx`
  - `frontend/src/components/ConsolePanel.tsx`
  - `frontend/src/components/CodeWorkspace.tsx`
  - `frontend/src/components/CarouselStats.tsx`
  - `frontend/src/components/ModelSelector.tsx`
- [ ] Create `frontend/src/hooks/useTypewriter.ts` stub.

### Verification

```bash
cd frontend
npm run dev
# → Browser opens at http://localhost:5173
# → Page renders with beige (#f5f5f0) background
# → No console errors
# → Custom font loaded (inspect via DevTools → Network tab)
```

---

## Milestone 9 — Frontend: Interactive Hero Landing Page

**Goal**: Build the full-screen hero section with mouse-scrub video, animated navbar, typewriter prompt, and action pill buttons.

### Files

- `frontend/src/components/HeroSection.tsx`
- `frontend/src/hooks/useTypewriter.ts`

### Tasks

- [ ] Implement `useTypewriter(targetText, typingSpeedMs=38, startDelayMs=600)`:
  - Returns `{ displayedText: string, isDone: boolean }`.
  - Character-by-character interval after initial delay.
  - Cleanup on unmount.
- [ ] Implement `HeroSection` component:
  - **Background video**: Full-screen `<video>` element, fixed position, z-index 0.
    - Source: CloudFront URL from SPECS.md.
    - Attributes: `muted`, `playsInline`, `preload="auto"`, no autoplay.
    - Object-position: `70% center`.
  - **Mouse-scrub controller**:
    - Track `prevX` via `useRef`.
    - `mousemove` listener calculates delta → time offset with sensitivity 0.8.
    - Clamp to `[0, duration]`.
    - Anti-flood: gate on `isSeeking` ref, queue via `onSeeked` handler.
  - **Navbar** (fixed, z-index 10):
    - Logo: "Mainframe(R)" + asterisk "✳︎".
    - Desktop links: Labs, Studio, Openings, Shop (comma-separated).
    - Desktop CTA: "Get in touch" (underlined).
    - Mobile hamburger: 3-line toggle → X animation, full-screen overlay menu.
  - **Hero content** (z-index 1):
    - Blurred intro label: "Hey there, meet A.R.I.A" (blur 4px).
    - Typewriter welcome text with blinking cursor.
    - Action pill buttons: "Pitch us an idea", "Come work here", "Send a brief hello", "See how we operate" — white bg, rounded-full, hover invert.
    - Email pill: "Reach us: hello@mainframe.co" with copy-to-clipboard SVG icon.
    - Entry animation: fade+slide-up with 400ms delay.

### Verification

```
Manual browser checks (http://localhost:5173):
  ✓ Video fills viewport, does NOT autoplay
  ✓ Moving mouse left/right scrubs video smoothly (no jitter/flooding)
  ✓ Typewriter types out full sentence at ~38ms/char
  ✓ Blinking cursor disappears when typing completes
  ✓ Navbar links visible on desktop, hamburger on mobile (<768px)
  ✓ Hamburger opens/closes full-screen menu with rotation animation
  ✓ Pill buttons invert colors on hover
  ✓ Email pill copies to clipboard on click
  ✓ Blurred intro text is visible but not selectable
```

**Target metric**: MET-06 — Stable 60 FPS during video scrubbing.

---

## Milestone 10 — Frontend: Dashboard Cockpit, Metrics & Live Console

**Goal**: Build the execution dashboard with model selector, thinking budget controls, metrics carousel, real-time console log streaming, and WebSocket integration to the backend.

### Files

- `frontend/src/components/ConsolePanel.tsx`
- `frontend/src/components/CarouselStats.tsx`
- `frontend/src/components/ModelSelector.tsx`
- `frontend/src/components/CodeWorkspace.tsx`

### Tasks

- [ ] **CarouselStats** — Horizontal scrollable cards:
  - Metrics: Indexed Codebases ("48 Repositories"), Processed AST Nodes ("1,412,804"), Applied Patches ("4,912"), Avg Thinking Tokens ("12,410"), Connected MCP Servers ("8 Operational").
  - Card styling: `bg-beige-dark`, rounded-2xl, border, hover shadow.
  - Each card: title (uppercase, tracking-widest), value (28px, bold), trend line.
- [ ] **ModelSelector** — Provider + model picker:
  - Provider grid buttons: `anthropic`, `deepseek`, `openai`, `google`, `ollama`.
  - Active state: inverted colors (dark bg, light text).
  - Model dropdown: populated per provider.
    - Anthropic: `claude-3-7-sonnet`, `claude-3-5-sonnet`
    - DeepSeek: `deepseek-reasoner`, `deepseek-chat`
    - OpenAI: `gpt-4o`, `o3-mini`
    - Google: `gemini-2.5-pro`, `gemini-2.5-flash`
    - Ollama: `qwen2.5-coder-7b`, `llama3.3`
- [ ] **Extended Thinking Controls**:
  - Toggle checkbox (enable/disable).
  - Range slider: 1,024 → 128,000 tokens (step 1,024).
  - Live label: formatted token count.
- [ ] **Agent Request Textarea** + "Execute Agent Analysis" button.
- [ ] **Execution Stream Logs** panel:
  - Dark background (`#121210`), monospace font.
  - Green pulse dot indicating active status.
  - Auto-scroll to bottom on new entries.
  - Empty state: "Waiting for execution request instructions..."
- [ ] **WebSocket integration**:
  - On "Execute" click → open `ws://localhost:8000/ws/refactor-stream`.
  - Send `{provider, model, messages, thinking_budget}`.
  - Stream responses into console log panel.
  - Display `thought` chunks differently from `content` chunks (e.g., italic/dimmed for thoughts).
- [ ] **CodeWorkspace** (basic):
  - Side-by-side diff view placeholder.
  - Display patched file content when a patch response is received.
- [ ] Wire "See how we operate" pill button (from Hero) to scroll/transition into the dashboard view.

### Verification

```
Manual browser checks:
  ✓ Metrics carousel scrolls horizontally, cards styled with beige-dark
  ✓ Clicking a provider highlights it and updates the model dropdown
  ✓ Thinking toggle shows/hides the slider; slider updates label in real-time
  ✓ Typing a query and clicking Execute sends WebSocket message
  ✓ Console panel streams live responses (thinking + content)
  ✓ Console auto-scrolls to latest entry
  ✓ "See how we operate" transitions from Hero to Dashboard
  ✓ Responsive layout: single column on mobile, 3-col grid on desktop

Backend integration test:
  ✓ WebSocket round-trip with a real API key produces streamed output
  ✓ POST /api/search returns results after indexing
```

---

## Post-Milestone Roadmap (Future Work)

These items are **not** in scope for the initial 10 milestones but are documented for planning:

| Item | Description |
|---|---|
| Multi-language tree-sitter grammars | Add `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-java`, `tree-sitter-go` to the cAST chunker |
| Full PatchPilot agentic loop | Wire LLM → patch → validate → re-prompt correction cycle end-to-end with LangChain agent executor |
| MCP WebSocket/HTTP transports | Extend `MCPMultiServerManager` to support remote SSE and WebSocket MCP servers |
| Authentication & RBAC | Add API key auth or OAuth to the FastAPI gateway |
| Production deployment | Dockerize backend + frontend, add `docker-compose.yml`, configure Nginx reverse proxy |
| Thinking signature round-trip | Preserve and replay Claude thinking signatures across multi-turn conversations |
| CodeWorkspace diff viewer | Full side-by-side diff rendering with syntax highlighting |
| Persistent chat history | Store conversation threads in SQLite or PostgreSQL |
| `bg_scrub.mp4` local asset | Download and serve the background video from `/public` for offline use |

---

## Dependency Graph

```
M0 (Scaffold)
 ├── M1 (cAST Chunker)
 │    └── M2 (Document Loader)
 │         └── M3 (ChromaDB Indexer)
 ├── M4 (Model Router)
 ├── M5 (MCP Manager)
 ├── M6 (PatchPilot)
 │
 └── M7 (Backend Gateway) ← depends on M1–M6
      │
      M8 (Frontend Scaffold) ← independent of backend
       ├── M9 (Hero Section)
       └── M10 (Dashboard + WebSocket) ← depends on M7 running
```

Milestones M1–M6 can be developed **in parallel** once M0 is complete. M7 integrates them. M8–M9 can proceed **in parallel** with backend work. M10 requires both M7 and M8.

---

*Plan generated from [SPECS.md](file:///F:/CODE_SPACE/code_analyzer/SPECS.md) — 1,580 lines of architectural specification.*
