import os
import time
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from app.core.logger import logger

router = APIRouter(prefix="/api", tags=["code"])

_startup_time = time.time()


class IndexRequest(BaseModel):
    workspace_path: str


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


class PatchRequest(BaseModel):
    file_path: str
    diff: str


def _inject_deps():
    from app.main import router_engine, code_indexer, patch_pilot, mcp_manager
    return router_engine, code_indexer, patch_pilot, mcp_manager


@router.get("/providers")
async def get_available_providers():
    engine, _, _, _ = _inject_deps()
    return engine.get_available_providers()


@router.get("/stats")
async def get_platform_stats():
    _, indexer, _, mcp_manager = _inject_deps()
    try:
        count = len(indexer.vector_store.table.search().limit(10).to_list())
        total_chunks = len(indexer.vector_store.table.search().to_arrow()) if count > 0 else 0
    except Exception as e:
        logger.warning(f"Stats error: {e}")
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
        "workspace": os.path.abspath(str(os.environ.get("WORKSPACE_ROOT", "."))),
    }


def _open_directory_dialog():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        folder_path = filedialog.askdirectory()
        root.destroy()
        return folder_path or ""
    except Exception as e:
        logger.warning(f"Tkinter dialog failed: {e}")
        return ""


@router.get("/browse")
async def browse_directory():
    path = await run_in_threadpool(_open_directory_dialog)
    return {"path": path}


@router.post("/index")
async def index_workspace(request: IndexRequest):
    _, indexer, _, _ = _inject_deps()
    workspace = os.path.abspath(request.workspace_path)
    if not os.path.isdir(workspace):
        return {"status": "error", "message": f"Directory not found: {workspace}"}

    indexer.workspace_root = workspace
    indexer.loader.workspace_root = workspace

    await run_in_threadpool(indexer.clear_index)
    await run_in_threadpool(indexer.index_workspace)

    logger.info(f"Indexed workspace: {workspace}")
    return {"status": "indexed"}


@router.post("/search")
async def search_codebase(request: SearchRequest):
    _, indexer, _, _ = _inject_deps()
    try:
        raw_results = indexer.vector_store.search(query=request.query, limit=request.max_results)
        results = [
            {
                "id": r["id"],
                "content": r["text"],
                "metadata": {
                    "source_file": r["file_path"],
                    "node_type": r["symbol_type"],
                    "symbol_name": r["symbol_name"],
                    "language": r["language"],
                },
                "distance": r.get("_distance", 0.0),
            }
            for r in raw_results
        ]
        return {"results": results}
    except Exception as e:
        logger.error(f"Search error: {e}")
        return {"results": []}


@router.get("/ast-nodes")
async def get_ast_nodes():
    _, indexer, _, _ = _inject_deps()
    nodes = indexer.get_all_nodes()
    return {"nodes": nodes}


@router.post("/patch")
async def apply_patch(request: PatchRequest):
    _, _, patch_pilot, _ = _inject_deps()
    success, message = await run_in_threadpool(
        patch_pilot.apply_diff_patch, request.file_path, request.diff
    )
    logger.info(f"Patch applied to {request.file_path}: success={success}")
    return {"success": success, "message": message}

# UI Mock Endpoints

@router.get("/plugins")
async def get_plugins():
    return {"plugins": [
        {"id": "1", "name": "Code Linter", "status": "active"}, 
        {"id": "2", "name": "Security Scanner", "status": "inactive"}
    ]}

@router.get("/tasks")
async def get_scheduled_tasks():
    return {"tasks": [
        {"id": "1", "name": "Nightly Index Build", "schedule": "0 0 * * *", "status": "active"}
    ]}

@router.get("/bridge")
async def get_webbridge_status():
    return {"status": "connected", "latency": "24ms", "active_sessions": 1}

@router.get("/projects")
async def get_projects():
    return {"projects": [
        {"id": "p1", "name": "code_analyzer", "active_task": "UI Refactor", "status": "active"},
        {"id": "p2", "name": "jobhunter", "active_task": "Job Search Platform Not Working", "status": "paused"}
    ]}

@router.get("/chats")
async def get_chats():
    return {"chats": [
        {"id": "c1", "title": "Explain code.py routing", "date": "Today"},
        {"id": "c2", "title": "Refactor React components", "date": "Yesterday"}
    ]}
