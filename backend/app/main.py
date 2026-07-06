"""
FastAPI Application Entry Point.

Configures WebSocket streaming, REST endpoints for indexing/search/patching,
and startup lifecycle hooks for MCP server initialization.

Milestone 7
"""

import os
import json
import asyncio
import time
from typing import Any

# Force load .env into os.environ before anything else imports it
from dotenv import load_dotenv, set_key
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.orchestrator import UnifiedModelRouter
from app.core.dag_orchestrator import DAGOrchestrator
from app.core.patcher import SandboxedPatchPilot
from app.mcp.client_manager import MCPMultiServerManager
from app.engine.indexer import CodebaseIndexer
from app.config.settings import settings


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup sequence."""
    os.makedirs(settings.WORKSPACE_ROOT, exist_ok=True)
    await reboot_mcp_servers()
    yield

# ── Application ────────────────────────────────────────────────

app = FastAPI(
    title="Autonomous Refactoring Platform Backend",
    description=(
        "Orchestrates AST parsing, LanceDB indices, multi-server MCP sessions, "
        "and multi-model routing loops."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — permissive for local development ────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global instances ───────────────────────────────────────────
router_engine = UnifiedModelRouter()
dag_engine = DAGOrchestrator()
mcp_manager = MCPMultiServerManager()
code_indexer = CodebaseIndexer(workspace_root=settings.WORKSPACE_ROOT)
patch_pilot = SandboxedPatchPilot(
    workspace_directory=settings.WORKSPACE_ROOT,
    max_changed_lines_budget=settings.MAX_DIFF_LINES,
)


# ── Request / Response Models ──────────────────────────────────

class IndexRequest(BaseModel):
    workspace_path: str


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


class PatchRequest(BaseModel):
    file_path: str
    diff: str



class SettingsRequest(BaseModel):
    google_key: str | None = None
    openai_key: str | None = None
    anthropic_key: str | None = None
    deepseek_key: str | None = None
    deepinfra_key: str | None = None
    openrouter_key: str | None = None
    user_name: str | None = None
    user_email: str | None = None
    mcp_filesystem_enabled: bool | None = None
    mcp_custom_cmd: str | None = None


# ── Startup & MCP Lifecycle ────────────────────────────────────

async def reboot_mcp_servers():
    """Disconnects existing MCP servers and re-registers them based on current config."""
    print("Rebooting MCP Connections based on active settings...")
    await mcp_manager.disconnect_all()
    mcp_manager.server_registry.clear()
    
    # Check settings
    fs_enabled = os.environ.get("MCP_FILESYSTEM_ENABLED", "true").lower() == "true"
    custom_cmd = os.environ.get("MCP_CUSTOM_CMD", "").strip()

    if fs_enabled:
        mcp_manager.register_stdio_server(
            server_identifier="filesystem_service",
            execution_command="npx",
            execution_arguments=[
                "-y",
                "@modelcontextprotocol/server-filesystem",
                os.path.abspath(settings.WORKSPACE_ROOT),
            ],
        )
        
    if custom_cmd:
        # Simple split by space for command vs args
        parts = custom_cmd.split(" ")
        mcp_manager.register_stdio_server(
            server_identifier="custom_service",
            execution_command=parts[0],
            execution_arguments=parts[1:] if len(parts) > 1 else [],
        )

    try:
        if mcp_manager.server_registry:
            await mcp_manager.initialize_all_connections()
            await mcp_manager.harvest_registered_tools()
            print("MCP connections active.")
        else:
            print("No MCP servers enabled in settings.")
    except Exception as err:
        print(f"MCP initialization error: {err}")





# ── Health Check ───────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Liveness probe — returns ok when the server is running."""
    return {"status": "ok"}


_startup_time = time.time()


@app.get("/api/providers")
async def get_available_providers():
    """Returns providers that have a valid API key configured, along with their models."""
    return router_engine.get_available_providers()


@app.get("/api/stats")
async def get_platform_stats():
    """
    Returns live platform metrics from LanceDB and MCP connections.
    """
    try:
        # Avoid crashing if table is empty
        count = len(code_indexer.vector_store.table.search().limit(10).to_list())
        # For full count, LanceDB v0.3 supports len(table) but let's just do a basic check
        total_chunks = len(code_indexer.vector_store.table.search().to_arrow()) if count > 0 else 0
    except Exception as e:
        print(f"Stats error: {e}")
        total_chunks = 0

    uptime_seconds = int(time.time() - _startup_time)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, secs = divmod(remainder, 60)

    mcp_count = len(mcp_manager.active_sessions) if hasattr(mcp_manager, "active_sessions") else 0

    return {
        "indexed_files": "auto",
        "total_chunks": total_chunks,
        "mcp_servers": mcp_count,
        "uptime": f"{hours}h {minutes}m {secs}s",
        "workspace": os.path.abspath(settings.WORKSPACE_ROOT),
    }

# ── REST Endpoints ─────────────────────────────────────────────

from fastapi.concurrency import run_in_threadpool

def _open_directory_dialog():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder_path = filedialog.askdirectory()
        root.destroy()
        return folder_path
    except Exception as e:
        print(f"Tkinter dialog failed: {e}")
        return ""

@app.get("/api/browse")
async def browse_directory():
    """Opens a native OS folder dialog and returns the selected absolute path."""
    path = await run_in_threadpool(_open_directory_dialog)
    return {"path": path or ""}

@app.get("/api/settings")
async def get_settings():
    """Retrieves current settings (API keys masked for security)"""
    def mask_key(k):
        return f"{k[:4]}...{k[-4:]}" if k and len(k) > 8 else ("" if not k else "***")
    
    return {
        "google_key": mask_key(os.getenv("GOOGLE_API_KEY")),
        "openai_key": mask_key(os.getenv("OPENAI_API_KEY")),
        "anthropic_key": mask_key(os.getenv("ANTHROPIC_API_KEY")),
        "deepseek_key": mask_key(os.getenv("DEEPSEEK_API_KEY")),
        "deepinfra_key": mask_key(os.getenv("DEEPINFRA_API_KEY")),
        "openrouter_key": mask_key(os.getenv("OPENROUTER_API_KEY")),
        "user_name": os.getenv("USER_NAME", ""),
        "user_email": os.getenv("USER_EMAIL", ""),
        "mcp_filesystem_enabled": os.getenv("MCP_FILESYSTEM_ENABLED", "true").lower() == "true",
        "mcp_custom_cmd": os.getenv("MCP_CUSTOM_CMD", ""),
    }

@app.post("/api/settings")
async def update_settings(request: SettingsRequest):
    """Updates the .env file with new settings and loads them into memory."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    
    # API Keys — helper to persist a key
    def _persist_key(field_val, env_name):
        if field_val is not None and field_val.strip() and "..." not in field_val:
            set_key(env_path, env_name, field_val.strip())
            os.environ[env_name] = field_val.strip()
    
    _persist_key(request.google_key, "GOOGLE_API_KEY")
    _persist_key(request.openai_key, "OPENAI_API_KEY")
    _persist_key(request.anthropic_key, "ANTHROPIC_API_KEY")
    _persist_key(request.deepseek_key, "DEEPSEEK_API_KEY")
    _persist_key(request.deepinfra_key, "DEEPINFRA_API_KEY")
    _persist_key(request.openrouter_key, "OPENROUTER_API_KEY")

    # Profile Settings
    if request.user_name is not None:
        set_key(env_path, "USER_NAME", request.user_name.strip())
        os.environ["USER_NAME"] = request.user_name.strip()
        
    if request.user_email is not None:
        set_key(env_path, "USER_EMAIL", request.user_email.strip())
        os.environ["USER_EMAIL"] = request.user_email.strip()

    # MCP Settings
    mcp_changed = False
    if request.mcp_filesystem_enabled is not None:
        val = "true" if request.mcp_filesystem_enabled else "false"
        if os.environ.get("MCP_FILESYSTEM_ENABLED") != val:
            set_key(env_path, "MCP_FILESYSTEM_ENABLED", val)
            os.environ["MCP_FILESYSTEM_ENABLED"] = val
            mcp_changed = True

    if request.mcp_custom_cmd is not None:
        if os.environ.get("MCP_CUSTOM_CMD") != request.mcp_custom_cmd.strip():
            set_key(env_path, "MCP_CUSTOM_CMD", request.mcp_custom_cmd.strip())
            os.environ["MCP_CUSTOM_CMD"] = request.mcp_custom_cmd.strip()
            mcp_changed = True

    # Active Control: Reboot MCP if config changed
    if mcp_changed:
        asyncio.create_task(reboot_mcp_servers())

    return {"status": "success", "message": "Settings updated successfully"}

@app.post("/api/index")
async def index_workspace(request: IndexRequest):
    """
    Indexes a workspace by discovering source files, parsing them
    with tree-sitter, and upserting chunks into LanceDB.
    """
    workspace = os.path.abspath(request.workspace_path)
    if not os.path.isdir(workspace):
        return {"status": "error", "message": f"Directory not found: {workspace}"}

    # Update indexer workspace root if changed
    code_indexer.workspace_root = workspace
    code_indexer.loader.workspace_root = workspace
    
    await run_in_threadpool(code_indexer.clear_index)
    await run_in_threadpool(code_indexer.index_workspace)
    
    return {"status": "indexed"}

@app.post("/api/search")
async def search_codebase(request: SearchRequest):
    """
    Performs semantic search over indexed code chunks using LanceDB.
    """
    try:
        raw_results = code_indexer.vector_store.search(
            query=request.query,
            limit=request.max_results,
        )
        
        # Format results for the frontend/agent
        results = []
        for r in raw_results:
            results.append({
                "id": r["id"],
                "content": r["text"],
                "metadata": {
                    "source_file": r["file_path"],
                    "node_type": r["symbol_type"],
                    "symbol_name": r["symbol_name"],
                    "language": r["language"]
                },
                "distance": r.get("_distance", 0.0)
            })
        return {"results": results}
    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}


@app.get("/api/ast-nodes")
async def get_ast_nodes():
    """Retrieves all indexed nodes to build an AST graph for the frontend visualizer."""
    nodes = code_indexer.get_all_nodes()
    return {"nodes": nodes}


@app.post("/api/patch")
async def apply_patch(request: PatchRequest):
    """
    Applies a unified diff patch to a file in the sandbox workspace.
    """
    success, message = await run_in_threadpool(
        patch_pilot.apply_diff_patch,
        request.file_path,
        request.diff,
    )
    return {"success": success, "message": message}


# ── WebSocket Streaming ────────────────────────────────────────

@app.websocket("/ws/refactor-stream")
async def handle_refactor_websocket_stream(websocket: WebSocket):
    """
    WebSocket endpoint that processes incoming user requests, manages
    agent execution states, and streams thinking logs and completions
    to the front end.
    """
    await websocket.accept()
    try:
        while True:
            # Receive configuration payload from the cockpit front end
            received_message_raw = await websocket.receive_text()
            payload = json.loads(received_message_raw)

            provider = payload.get("provider", "anthropic")
            model_name = payload.get("model", "claude-3-7-sonnet")
            messages = payload.get("messages", [])
            thinking_budget = int(payload.get("thinking_budget", 16000))

            use_swarm = payload.get("use_swarm", False)
            command = payload.get("command", "chat")

            if command == "plan":
                prompt = payload.get("prompt", "")
                context = payload.get("context", "")
                async for update in dag_engine.run_planner(prompt, context):
                    await websocket.send_json(update)
                    
            elif command == "execute_dag":
                plan_data = payload.get("plan_data", {})
                context = payload.get("context", "")
                async for update in dag_engine.execute_dag(plan_data, context):
                    await websocket.send_json(update)
                    
            elif use_swarm:
                async for update in router_engine.execute_swarm_stream(
                    provider=provider,
                    model_name=model_name,
                    messages=messages,
                    thinking_budget=thinking_budget,
                ):
                    await websocket.send_json(update)
            else:
                # Stream standard model completions
                async for update in router_engine.execute_stream(
                    provider=provider,
                    model_name=model_name,
                    messages=messages,
                    thinking_budget=thinking_budget,
                ):
                    await websocket.send_json(update)

            # Send completion notification
            await websocket.send_json(
                {"type": "status", "content": "Execution cycle complete"}
            )

    except WebSocketDisconnect:
        print("WebSocket client connection closed gracefully.")
    except Exception as runtime_err:
        try:
            await websocket.send_json(
                {"type": "error", "content": f"Platform crash: {str(runtime_err)}"}
            )
        except Exception:
            pass
