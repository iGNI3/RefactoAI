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
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.orchestrator import UnifiedModelRouter
from app.core.patcher import SandboxedPatchPilot
from app.mcp.client_manager import MCPMultiServerManager
from app.parser.document_loader import CodebaseLoader
from app.vectorstore.chroma_client import ChromaCodeIndexer
from app.config.settings import settings


# ── Application ────────────────────────────────────────────────

app = FastAPI(
    title="Autonomous Refactoring Platform Backend",
    description=(
        "Orchestrates AST parsing, ChromaDB indices, multi-server MCP sessions, "
        "and multi-model routing loops."
    ),
    version="0.1.0",
)

# ── CORS — permissive for local development ────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global instances ───────────────────────────────────────────
router_engine = UnifiedModelRouter()
mcp_manager = MCPMultiServerManager()
code_indexer = ChromaCodeIndexer(database_directory=settings.CHROMA_DB_PATH)
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


from dotenv import set_key

class SettingsRequest(BaseModel):
    gemini_key: str | None = None
    openai_key: str | None = None
    anthropic_key: str | None = None
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


@app.on_event("startup")
async def startup_initialization_routine():
    """
    Startup sequence.
    """
    os.makedirs(settings.WORKSPACE_ROOT, exist_ok=True)
    await reboot_mcp_servers()


# ── Health Check ───────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Liveness probe — returns ok when the server is running."""
    return {"status": "ok"}


_startup_time = time.time()


@app.get("/api/stats")
async def get_platform_stats():
    """
    Returns live platform metrics from ChromaDB and MCP connections.
    Consumed by the frontend CarouselStats component.
    """
    chroma_stats = code_indexer.get_collection_stats()
    uptime_seconds = int(time.time() - _startup_time)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, secs = divmod(remainder, 60)

    mcp_count = len(mcp_manager.active_sessions) if hasattr(mcp_manager, "active_sessions") else 0

    return {
        "indexed_files": chroma_stats["indexed_files"],
        "total_chunks": chroma_stats["total_chunks"],
        "mcp_servers": mcp_count,
        "uptime": f"{hours}h {minutes}m {secs}s",
        "workspace": os.path.abspath(settings.WORKSPACE_ROOT),
    }


# ── REST Endpoints ─────────────────────────────────────────────

import tkinter as tk
from tkinter import filedialog
from fastapi.concurrency import run_in_threadpool

def _open_directory_dialog():
    try:
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
        "gemini_key": mask_key(os.getenv("GEMINI_API_KEY")),
        "openai_key": mask_key(os.getenv("OPENAI_API_KEY")),
        "anthropic_key": mask_key(os.getenv("ANTHROPIC_API_KEY")),
        "user_name": os.getenv("USER_NAME", ""),
        "user_email": os.getenv("USER_EMAIL", ""),
        "mcp_filesystem_enabled": os.getenv("MCP_FILESYSTEM_ENABLED", "true").lower() == "true",
        "mcp_custom_cmd": os.getenv("MCP_CUSTOM_CMD", ""),
    }

@app.post("/api/settings")
async def update_settings(request: SettingsRequest):
    """Updates the .env file with new settings and loads them into memory."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    
    # API Keys
    if request.gemini_key is not None and request.gemini_key.strip() and "..." not in request.gemini_key:
        set_key(env_path, "GEMINI_API_KEY", request.gemini_key.strip())
        os.environ["GEMINI_API_KEY"] = request.gemini_key.strip()
        
    if request.openai_key is not None and request.openai_key.strip() and "..." not in request.openai_key:
        set_key(env_path, "OPENAI_API_KEY", request.openai_key.strip())
        os.environ["OPENAI_API_KEY"] = request.openai_key.strip()
        
    if request.anthropic_key is not None and request.anthropic_key.strip() and "..." not in request.anthropic_key:
        set_key(env_path, "ANTHROPIC_API_KEY", request.anthropic_key.strip())
        os.environ["ANTHROPIC_API_KEY"] = request.anthropic_key.strip()

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
        import asyncio
        asyncio.create_task(reboot_mcp_servers())

    return {"status": "success", "message": "Settings updated successfully"}

@app.post("/api/index")
async def index_workspace(request: IndexRequest):
    """
    Indexes a workspace by discovering source files, parsing them
    with tree-sitter, and upserting chunks into ChromaDB.
    """
    workspace = os.path.abspath(request.workspace_path)
    if not os.path.isdir(workspace):
        return {"status": "error", "message": f"Directory not found: {workspace}"}

    loader = CodebaseLoader(workspace_root=workspace)
    chunks = loader.load_and_chunk_all()
    count = code_indexer.index_all_chunks(chunks)
    return {"status": "indexed", "chunks": count}


@app.post("/api/search")
async def search_codebase(request: SearchRequest):
    """
    Performs semantic search over indexed code chunks.
    """
    results = code_indexer.semantic_code_search(
        query=request.query,
        max_results=request.max_results,
    )
    return {"results": results}


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
    success, message = patch_pilot.apply_diff_patch(
        target_relative_path=request.file_path,
        unified_diff_content=request.diff,
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

            if use_swarm:
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
