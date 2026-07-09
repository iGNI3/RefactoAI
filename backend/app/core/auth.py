import os
import secrets
from fastapi import HTTPException, Request
from starlette.status import HTTP_401_UNAUTHORIZED


API_KEY_HEADER = "X-API-Key"


def _get_configured_key() -> str | None:
    key = os.environ.get("API_KEY", "").strip()
    return key if key else None


async def api_key_middleware(request: Request, call_next):
    configured = _get_configured_key()
    if configured:
        key = request.headers.get(API_KEY_HEADER, "")
        if not secrets.compare_digest(key, configured):
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API key",
            )
    return await call_next(request)
