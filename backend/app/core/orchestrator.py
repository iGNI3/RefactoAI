"""
LLM Dynamic Routing and Thinking Payload Parser.

Manages multi-provider model routing, handles provider-specific
payload validation, and manages extended thinking configurations.

Supports: Google, Anthropic, OpenAI, DeepSeek, DeepInfra, OpenRouter, Ollama.

Milestone 4 — Revised
"""

import os
import copy
from typing import List, Dict, Any, AsyncGenerator

from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    BaseMessage,
)
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic


# ── Provider ↔ Model Registry ──────────────────────────────────
# Maps each provider to its known models and the env-var key name.
PROVIDER_REGISTRY: Dict[str, Dict[str, Any]] = {
    "google": {
        "env_key": "GOOGLE_API_KEY",
        "models": [
            "gemini-2.5-pro",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
        ],
    },
    "anthropic": {
        "env_key": "ANTHROPIC_API_KEY",
        "models": [
            "claude-sonnet-4-20250514",
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-latest",
            "claude-3-5-haiku-latest",
        ],
    },
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "models": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4.1",
            "o3-mini",
        ],
    },
    "deepseek": {
        "env_key": "DEEPSEEK_API_KEY",
        "models": [
            "deepseek-chat",
            "deepseek-reasoner",
        ],
    },
    "deepinfra": {
        "env_key": "DEEPINFRA_API_KEY",
        "models": [
            "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
            "meta-llama/Meta-Llama-3.1-70B-Instruct",
            "Qwen/Qwen3-235B-A22B",
            "mistralai/Mistral-Small-24B-Instruct-2501",
        ],
    },
    "openrouter": {
        "env_key": "OPENROUTER_API_KEY",
        "models": [
            "anthropic/claude-sonnet-4",
            "google/gemini-2.5-pro",
            "openai/gpt-4o",
            "deepseek/deepseek-r1",
            "meta-llama/llama-4-maverick",
        ],
    },
    "ollama": {
        "env_key": None,
        "models": [
            "llama3",
            "codestral",
            "mistral",
            "phi3",
        ],
    },
}


def _get_key(env_key: str | None) -> str | None:
    """Returns the API key string if set and non-blank, else None."""
    if env_key is None:
        return None
    val = os.environ.get(env_key, "").strip()
    return val if val else None


class UnifiedModelRouter:
    """
    Manages multi-provider model routing, handles provider-specific
    payload validation, and manages extended thinking configurations.
    """

    def _key(self, provider: str) -> str | None:
        """Lookup the API key for a given provider, re-reading env each time."""
        info = PROVIDER_REGISTRY.get(provider)
        if not info:
            return None
        return _get_key(info["env_key"])

    def get_available_providers(self) -> Dict[str, Any]:
        """Returns providers that have a valid API key set, along with models."""
        available = {}
        for provider, info in PROVIDER_REGISTRY.items():
            if provider == "ollama":
                available[provider] = info["models"]
            elif _get_key(info["env_key"]):
                available[provider] = info["models"]
        return available

    def sanitize_history_for_provider(
        self, messages: List[Dict[str, Any]], provider: str
    ) -> List[Dict[str, Any]]:
        """
        Prepares the message history for API submission. Strips internal reasoning
        logs from DeepSeek history payloads to avoid HTTP 400 errors.
        """
        sanitized: List[Dict[str, Any]] = []
        for msg in messages:
            cleaned = copy.deepcopy(msg)
            if "reasoning_content" in cleaned:
                del cleaned["reasoning_content"]

            if provider == "deepseek":
                if "additional_kwargs" in cleaned:
                    cleaned["additional_kwargs"] = {
                        k: v
                        for k, v in cleaned["additional_kwargs"].items()
                        if k != "reasoning_content"
                    }
            sanitized.append(cleaned)
        return sanitized

    def parse_langchain_history(
        self, messages: List[Dict[str, Any]]
    ) -> List[BaseMessage]:
        """
        Converts generic JSON message schemas into typed LangChain message objects.
        """
        lc_messages: List[BaseMessage] = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                kwargs: Dict[str, Any] = {}
                if "reasoning_content" in msg:
                    kwargs["additional_kwargs"] = {
                        "reasoning_content": msg["reasoning_content"]
                    }
                lc_messages.append(AIMessage(content=content, **kwargs))
        return lc_messages

    async def execute_stream(
        self,
        provider: str,
        model_name: str,
        messages: List[Dict[str, Any]],
        thinking_budget: int = 4000,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Streams model completions and yields formatted updates for both
        internal thinking steps and final markdown responses.
        """
        sanitized_history = self.sanitize_history_for_provider(messages, provider)
        lc_history = self.parse_langchain_history(sanitized_history)

        api_key = self._key(provider)

        # ── Anthropic ──────────────────────────────────────────────
        if provider == "anthropic":
            if not api_key:
                yield {"type": "error", "content": "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your .env file."}
                return

            extra_args: Dict[str, Any] = {"api_key": api_key}
            if thinking_budget > 0:
                extra_args["thinking"] = {
                    "type": "enabled",
                    "budget_tokens": thinking_budget,
                }
                llm = ChatAnthropic(
                    model=model_name,
                    max_tokens=64000,
                    temperature=1.0,
                    extra_headers={"anthropic-beta": "output-128k-2025-02-19"},
                    **extra_args,
                )
            else:
                llm = ChatAnthropic(
                    model=model_name,
                    temperature=0.0,
                    **extra_args,
                )

            async for chunk in llm.astream(lc_history):
                if (
                    hasattr(chunk, "additional_kwargs")
                    and "thinking" in chunk.additional_kwargs
                ):
                    think_data = chunk.additional_kwargs["thinking"]
                    yield {"type": "thought", "content": think_data}
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        # ── Google Gemini ──────────────────────────────────────────
        elif provider == "google":
            if not api_key:
                yield {"type": "error", "content": "Google API key not configured. Add GOOGLE_API_KEY to your .env file."}
                return

            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=0.0,
            )
            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        # ── OpenAI ─────────────────────────────────────────────────
        elif provider == "openai":
            if not api_key:
                yield {"type": "error", "content": "OpenAI API key not configured. Add OPENAI_API_KEY to your .env file."}
                return

            extra_args = {"api_key": api_key}
            if "o3-mini" in model_name:
                extra_args["reasoning_effort"] = "medium"

            llm = ChatOpenAI(
                model=model_name,
                **extra_args,
            )

            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        # ── DeepSeek ───────────────────────────────────────────────
        elif provider == "deepseek":
            if not api_key:
                yield {"type": "error", "content": "DeepSeek API key not configured. Add DEEPSEEK_API_KEY to your .env file."}
                return

            llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url="https://api.deepseek.com",
                temperature=1.0 if "reasoner" in model_name else 0.0,
                max_tokens=64000,
            )

            async for chunk in llm.astream(lc_history):
                if (
                    hasattr(chunk, "additional_kwargs")
                    and "reasoning_content" in chunk.additional_kwargs
                ):
                    reasoning_chunk = chunk.additional_kwargs["reasoning_content"]
                    yield {"type": "thought", "content": reasoning_chunk}
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        # ── DeepInfra (OpenAI-compatible) ──────────────────────────
        elif provider == "deepinfra":
            if not api_key:
                yield {"type": "error", "content": "DeepInfra API key not configured. Add DEEPINFRA_API_KEY to your .env file."}
                return

            llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url="https://api.deepinfra.com/v1/openai",
                temperature=0.0,
            )

            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        # ── OpenRouter (OpenAI-compatible) ─────────────────────────
        elif provider == "openrouter":
            if not api_key:
                yield {"type": "error", "content": "OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env file."}
                return

            llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.0,
                default_headers={
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "RefactorAI",
                },
            )

            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        # ── Ollama (Local) ─────────────────────────────────────────
        elif provider == "ollama":
            from langchain_community.chat_models import ChatOllama

            llm = ChatOllama(
                model=model_name,
                temperature=0.0,
            )
            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        else:
            yield {"type": "error", "content": f"Unknown model provider: '{provider}'. Supported: google, anthropic, openai, deepseek, deepinfra, openrouter, ollama."}

    async def execute_swarm_stream(
        self,
        provider: str,
        model_name: str,
        messages: List[Dict[str, Any]],
        thinking_budget: int = 4000,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes a Multi-Agent Swarm by spawning parallel tasks for UI/UX,
        Frontend, and Backend roles. Multiplexes their output into a single stream.
        """
        import asyncio
        from app.core.prompts import UI_UX_SYSTEM_PROMPT

        roles = [
            {
                "name": "UI_UX_DESIGNER", 
                "prompt": f"{UI_UX_SYSTEM_PROMPT}\n\nTask: You are the UI/UX Designer. Focus only on the design, layout, and user experience requirements of the user's request. Output only design specifications."
            },
            {
                "name": "FRONTEND_DEV", 
                "prompt": f"{UI_UX_SYSTEM_PROMPT}\n\nTask: You are the Frontend Developer. Focus only on the React/UI implementation details of the user's request based on the design system. Output only frontend code/logic."
            },
            {
                "name": "BACKEND_DEV", 
                "prompt": "You are an expert Backend Developer. Focus only on the API, database, and system architecture of the user's request. Output only backend code/logic."
            },
            {
                "name": "DESIGN_DIRECTOR",
                "prompt": f"{UI_UX_SYSTEM_PROMPT}\n\nTask: You are the Design Director. Your ONLY job is to reject poor UI before it reaches the user. Review the UX/UI aspects of the user's request and strictly enforce the Design System Prompt. Output a UX Review Checklist and approval/rejection status."
            }
        ]

        queue = asyncio.Queue()

        async def run_agent(role_name: str, role_prompt: str):
            agent_msgs = [{"role": "system", "content": role_prompt}] + messages
            try:
                async for chunk in self.execute_stream(provider, model_name, agent_msgs, thinking_budget):
                    chunk["swarm_role"] = role_name
                    await queue.put(chunk)
            except Exception as e:
                await queue.put({"type": "error", "content": f"Failed: {str(e)}", "swarm_role": role_name})

        tasks = [asyncio.create_task(run_agent(r["name"], r["prompt"])) for r in roles]

        async def wait_and_close():
            await asyncio.gather(*tasks, return_exceptions=True)
            await queue.put(None)

        asyncio.create_task(wait_and_close())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
