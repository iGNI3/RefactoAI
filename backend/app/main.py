"""
FastAPI Application Entry Point.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logger import logger
from app.core.orchestrator import UnifiedModelRouter
from app.core.dag_orchestrator import DAGOrchestrator
from app.core.patcher import SandboxedPatchPilot
from app.mcp.client_manager import MCPMultiServerManager
from app.engine.indexer import CodebaseIndexer
from app.config.settings import settings

from app.routers import health, settings as settings_router, code, ws

router_engine = UnifiedModelRouter()
dag_engine = DAGOrchestrator()
mcp_manager = MCPMultiServerManager()
code_indexer = CodebaseIndexer(workspace_root=settings.WORKSPACE_ROOT)
patch_pilot = SandboxedPatchPilot(
    workspace_directory=settings.WORKSPACE_ROOT,
    max_changed_lines_budget=settings.MAX_DIFF_LINES,
)


async def reboot_mcp_servers():
    logger.info("Rebooting MCP connections...")
    await mcp_manager.disconnect_all()
    mcp_manager.server_registry.clear()

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
            logger.info("MCP connections active")
        else:
            logger.info("No MCP servers enabled")
    except Exception as e:
        logger.error(f"MCP initialization error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.WORKSPACE_ROOT, exist_ok=True)
    await reboot_mcp_servers()
    yield


app = FastAPI(
    title="Autonomous Refactoring Platform Backend",
    description="Orchestrates AST parsing, LanceDB indices, multi-server MCP sessions, and multi-model routing loops.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(settings_router.router)
app.include_router(code.router)
app.include_router(ws.router)
