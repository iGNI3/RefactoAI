"""
Dynamic environment configuration for the platform.

Loads all API keys and operational parameters from environment
variables (or a .env file) using pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration loaded from environment variables.
    Place a `.env` file in the backend/ directory for local development.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM Provider API Keys ──────────────────────────────────────
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    DEEPINFRA_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""

    # ── Workspace & Storage ────────────────────────────────────────
    WORKSPACE_ROOT: str = "./sandbox_workspace"
    CHROMA_DB_PATH: str = "./chroma_db"

    # ── PatchPilot Limits ──────────────────────────────────────────
    MAX_DIFF_LINES: int = 120

    # ── Server ─────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True


# Singleton instance — import this everywhere
settings = Settings()
