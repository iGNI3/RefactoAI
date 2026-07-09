"""
LLM Dynamic Routing and Provider Abstraction.

Manages multi-provider model routing via a pluggable provider registry.
Supports: Google, Anthropic, OpenAI, DeepSeek, DeepInfra, OpenRouter, Ollama.
"""

import os
import copy
from typing import List, Dict, Any, AsyncGenerator, Protocol

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, BaseMessage


class LLMProvider(Protocol):
    env_key: str | None
    models: List[str]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs) -> Any:
        ...


class _AnthropicProvider:
    env_key = "ANTHROPIC_API_KEY"
    models = [
        "claude-sonnet-4-20250514",
        "claude-3-7-sonnet-20250219",
        "claude-3-5-sonnet-latest",
        "claude-3-5-haiku-latest",
    ]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_anthropic import ChatAnthropic

        extra_args: Dict[str, Any] = {"api_key": api_key}
        thinking_budget = kwargs.get("thinking_budget", 0)
        if thinking_budget > 0:
            extra_args["thinking"] = {"type": "enabled", "budget_tokens": thinking_budget}
            return ChatAnthropic(
                model=model_name,
                max_tokens=64000,
                temperature=1.0,
                extra_headers={"anthropic-beta": "output-128k-2025-02-19"},
                **extra_args,
            )
        return ChatAnthropic(model=model_name, temperature=0.0, **extra_args)


class _GoogleProvider:
    env_key = "GOOGLE_API_KEY"
    models = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=model_name, google_api_key=api_key, temperature=0.0
        )


class _OpenAIProvider:
    env_key = "OPENAI_API_KEY"
    models = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_openai import ChatOpenAI

        extra_args: Dict[str, Any] = {"api_key": api_key}
        if "o3-mini" in model_name:
            extra_args["reasoning_effort"] = "medium"
        return ChatOpenAI(model=model_name, **extra_args)


class _DeepSeekProvider:
    env_key = "DEEPSEEK_API_KEY"
    models = ["deepseek-chat", "deepseek-reasoner"]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://api.deepseek.com",
            temperature=1.0 if "reasoner" in model_name else 0.0,
            max_tokens=64000,
        )


class _DeepInfraProvider:
    env_key = "DEEPINFRA_API_KEY"
    models = [
        "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
        "meta-llama/Meta-Llama-3.1-70B-Instruct",
        "Qwen/Qwen3-235B-A22B",
        "mistralai/Mistral-Small-24B-Instruct-2501",
    ]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://api.deepinfra.com/v1/openai",
            temperature=0.0,
        )


class _OpenRouterProvider:
    env_key = "OPENROUTER_API_KEY"
    models = [
        "anthropic/claude-sonnet-4",
        "google/gemini-2.5-pro",
        "openai/gpt-4o",
        "deepseek/deepseek-r1",
        "meta-llama/llama-4-maverick",
    ]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.0,
            default_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "RefactorAI",
            },
        )


class _OllamaProvider:
    env_key = None
    models = ["llama3", "codestral", "mistral", "phi3"]

    def create_llm(self, model_name: str, api_key: str | None, **kwargs):
        from langchain_community.chat_models import ChatOllama

        return ChatOllama(model=model_name, temperature=0.0)


_PROVIDER_REGISTRY: Dict[str, Any] = {
    "google": _GoogleProvider(),
    "anthropic": _AnthropicProvider(),
    "openai": _OpenAIProvider(),
    "deepseek": _DeepSeekProvider(),
    "deepinfra": _DeepInfraProvider(),
    "openrouter": _OpenRouterProvider(),
    "ollama": _OllamaProvider(),
}


def _get_key(env_key: str | None) -> str | None:
    if env_key is None:
        return None
    val = os.environ.get(env_key, "").strip()
    return val if val else None


class UnifiedModelRouter:
    def _key(self, provider: str) -> str | None:
        prov = _PROVIDER_REGISTRY.get(provider)
        if not prov:
            return None
        return _get_key(prov.env_key)

    def get_available_providers(self) -> Dict[str, Any]:
        available = {}
        for name, prov in _PROVIDER_REGISTRY.items():
            if name == "ollama":
                available[name] = prov.models
            elif _get_key(prov.env_key):
                available[name] = prov.models
        return available

    def sanitize_history_for_provider(
        self, messages: List[Dict[str, Any]], provider: str
    ) -> List[Dict[str, Any]]:
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
        prov = _PROVIDER_REGISTRY.get(provider)
        if not prov:
            yield {
                "type": "error",
                "content": f"Unknown provider: '{provider}'. Supported: {', '.join(_PROVIDER_REGISTRY)}.",
            }
            return

        api_key = self._key(provider)
        if provider != "ollama" and not api_key:
            yield {
                "type": "error",
                "content": f"{provider.title()} API key not configured. Add {prov.env_key} to your .env file.",
            }
            return

        sanitized_history = self.sanitize_history_for_provider(messages, provider)
        lc_history = self.parse_langchain_history(sanitized_history)

        llm = prov.create_llm(model_name, api_key, thinking_budget=thinking_budget)

        async for chunk in llm.astream(lc_history):
            if hasattr(chunk, "additional_kwargs"):
                if "thinking" in chunk.additional_kwargs:
                    yield {"type": "thought", "content": chunk.additional_kwargs["thinking"]}
                if "reasoning_content" in chunk.additional_kwargs:
                    yield {
                        "type": "thought",
                        "content": chunk.additional_kwargs["reasoning_content"],
                    }
            if chunk.content:
                yield {"type": "content", "content": chunk.content}

    async def execute_swarm_stream(
        self,
        provider: str,
        model_name: str,
        messages: List[Dict[str, Any]],
        thinking_budget: int = 4000,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        import asyncio
        from app.core.prompts import UI_UX_SYSTEM_PROMPT

        roles = [
            {
                "name": "UI_UX_DESIGNER",
                "prompt": f"{UI_UX_SYSTEM_PROMPT}\n\nTask: You are the UI/UX Designer. Focus only on the design, layout, and user experience requirements.",
            },
            {
                "name": "FRONTEND_DEV",
                "prompt": f"{UI_UX_SYSTEM_PROMPT}\n\nTask: You are the Frontend Developer. Focus only on the React/UI implementation details.",
            },
            {
                "name": "BACKEND_DEV",
                "prompt": "You are an expert Backend Developer. Focus only on the API, database, and system architecture.",
            },
            {
                "name": "DESIGN_DIRECTOR",
                "prompt": f"{UI_UX_SYSTEM_PROMPT}\n\nTask: You are the Design Director. Review the UX/UI aspects and strictly enforce the Design System Prompt.",
            },
        ]

        queue: asyncio.Queue = asyncio.Queue()

        async def run_agent(role_name: str, role_prompt: str):
            agent_msgs = [{"role": "system", "content": role_prompt}] + messages
            try:
                async for chunk in self.execute_stream(
                    provider, model_name, agent_msgs, thinking_budget
                ):
                    chunk["swarm_role"] = role_name
                    await queue.put(chunk)
            except Exception as e:
                await queue.put(
                    {
                        "type": "error",
                        "content": f"Failed: {str(e)}",
                        "swarm_role": role_name,
                    }
                )

        tasks = [
            asyncio.create_task(run_agent(r["name"], r["prompt"])) for r in roles
        ]

        async def wait_and_close():
            await asyncio.gather(*tasks, return_exceptions=True)
            await queue.put(None)

        asyncio.create_task(wait_and_close())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
