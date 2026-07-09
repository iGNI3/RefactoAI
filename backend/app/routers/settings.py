import os
from fastapi import APIRouter
from dotenv import set_key
from pydantic import BaseModel
from app.core.logger import logger

router = APIRouter(prefix="/api", tags=["settings"])


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


def _mask_key(k: str | None) -> str:
    if not k:
        return ""
    k = str(k).strip()
    return f"{k[:4]}...{k[-4:]}" if len(k) > 8 else "***"


@router.get("/settings")
async def get_settings():
    return {
        "google_key": _mask_key(os.getenv("GOOGLE_API_KEY")),
        "openai_key": _mask_key(os.getenv("OPENAI_API_KEY")),
        "anthropic_key": _mask_key(os.getenv("ANTHROPIC_API_KEY")),
        "deepseek_key": _mask_key(os.getenv("DEEPSEEK_API_KEY")),
        "deepinfra_key": _mask_key(os.getenv("DEEPINFRA_API_KEY")),
        "openrouter_key": _mask_key(os.getenv("OPENROUTER_API_KEY")),
        "user_name": os.getenv("USER_NAME", ""),
        "user_email": os.getenv("USER_EMAIL", ""),
        "mcp_filesystem_enabled": os.getenv("MCP_FILESYSTEM_ENABLED", "true").lower() == "true",
        "mcp_custom_cmd": os.getenv("MCP_CUSTOM_CMD", ""),
    }


@router.post("/settings")
async def update_settings(request: SettingsRequest):
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")

    def _persist_key(field_val: str | None, env_name: str):
        if field_val and field_val.strip() and "..." not in field_val:
            set_key(env_path, env_name, field_val.strip())
            os.environ[env_name] = field_val.strip()

    _persist_key(request.google_key, "GOOGLE_API_KEY")
    _persist_key(request.openai_key, "OPENAI_API_KEY")
    _persist_key(request.anthropic_key, "ANTHROPIC_API_KEY")
    _persist_key(request.deepseek_key, "DEEPSEEK_API_KEY")
    _persist_key(request.deepinfra_key, "DEEPINFRA_API_KEY")
    _persist_key(request.openrouter_key, "OPENROUTER_API_KEY")

    if request.user_name is not None:
        set_key(env_path, "USER_NAME", request.user_name.strip())
        os.environ["USER_NAME"] = request.user_name.strip()

    if request.user_email is not None:
        set_key(env_path, "USER_EMAIL", request.user_email.strip())
        os.environ["USER_EMAIL"] = request.user_email.strip()

    mcp_changed = False
    if request.mcp_filesystem_enabled is not None:
        val = "true" if request.mcp_filesystem_enabled else "false"
        if os.environ.get("MCP_FILESYSTEM_ENABLED") != val:
            set_key(env_path, "MCP_FILESYSTEM_ENABLED", val)
            os.environ["MCP_FILESYSTEM_ENABLED"] = val
            mcp_changed = True

    if request.mcp_custom_cmd is not None:
        stripped = request.mcp_custom_cmd.strip()
        if os.environ.get("MCP_CUSTOM_CMD") != stripped:
            set_key(env_path, "MCP_CUSTOM_CMD", stripped)
            os.environ["MCP_CUSTOM_CMD"] = stripped
            mcp_changed = True

    if mcp_changed:
        from app.main import reboot_mcp_servers
        import asyncio
        asyncio.create_task(reboot_mcp_servers())

    logger.info("Settings updated")
    return {"status": "success", "message": "Settings updated successfully"}
