"""
LLM Dynamic Routing and Thinking Payload Parser.

Manages multi-provider model routing, handles provider-specific
payload validation, and manages extended thinking configurations.

Supports: Anthropic, OpenAI, DeepSeek, Google GenAI, Ollama.

Milestone 4
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


class UnifiedModelRouter:
    """
    Manages multi-provider model routing, handles provider-specific
    payload validation, and manages extended thinking configurations.
    """

    def __init__(self):
        self.openai_key = os.environ.get("OPENAI_API_KEY", "")
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self.deepseek_key = os.environ.get("DEEPSEEK_API_KEY", "")
        self.google_key = os.environ.get("GOOGLE_API_KEY", "")

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
            # Remove DeepSeek-specific reasoning fields from historical logs
            if "reasoning_content" in cleaned:
                del cleaned["reasoning_content"]

            # If the target is DeepSeek, ensure we only pass standard keys
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
                # Restore reasoning logs in metadata if present
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

        if provider == "anthropic":
            # Configure Claude thinking parameters
            extra_args: Dict[str, Any] = {}
            if thinking_budget > 0:
                extra_args["thinking"] = {
                    "type": "enabled",
                    "budget_tokens": thinking_budget,
                }
                # When extended thinking is active, temperature must equal 1.0
                llm = ChatAnthropic(
                    model=model_name,
                    anthropic_api_key=self.anthropic_key,
                    max_tokens=64000,
                    temperature=1.0,
                    extra_headers={"anthropic-beta": "output-128k-2025-02-19"},
                    **extra_args,
                )
            else:
                llm = ChatAnthropic(
                    model=model_name,
                    anthropic_api_key=self.anthropic_key,
                    temperature=0.0,
                )

            async for chunk in llm.astream(lc_history):
                # Intercept Claude's thinking blocks before final generation
                if (
                    hasattr(chunk, "additional_kwargs")
                    and "thinking" in chunk.additional_kwargs
                ):
                    think_data = chunk.additional_kwargs["thinking"]
                    yield {"type": "thought", "content": think_data}
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        elif provider == "deepseek":
            # Initialize ChatOpenAI pointing to DeepSeek's endpoint
            llm = ChatOpenAI(
                model=model_name,
                openai_api_key=self.deepseek_key,
                openai_api_base="https://api.deepseek.com",
                temperature=1.0 if "reasoner" in model_name else 0.0,
                max_tokens=64000,
            )

            async for chunk in llm.astream(lc_history):
                # Intercept DeepSeek's custom reasoning_content
                if (
                    hasattr(chunk, "additional_kwargs")
                    and "reasoning_content" in chunk.additional_kwargs
                ):
                    reasoning_chunk = chunk.additional_kwargs["reasoning_content"]
                    yield {"type": "thought", "content": reasoning_chunk}
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        elif provider == "openai":
            # Handle standard OpenAI models (e.g., GPT-4o, o3-mini)
            extra_args = {}
            if "o3-mini" in model_name:
                # o3-mini uses reasoning_effort to control thinking intensity
                extra_args["reasoning_effort"] = "medium"

            llm = ChatOpenAI(
                model=model_name,
                openai_api_key=self.openai_key,
                **extra_args,
            )

            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        elif provider == "google":
            # Support Google Gemini models
            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=self.google_key,
                temperature=0.0,
            )
            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        elif provider == "ollama":
            # Support localized Ollama instances for offline execution
            from langchain_community.chat_models import ChatOllama

            llm = ChatOllama(
                model=model_name,
                temperature=0.0,
            )
            async for chunk in llm.astream(lc_history):
                if chunk.content:
                    yield {"type": "content", "content": chunk.content}

        else:
            raise ValueError(f"Unknown model provider requested: '{provider}'")

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

        roles = [
            {"name": "UI_UX_DESIGNER", "prompt": "You are a master UI/UX Designer. Focus only on the design, layout, and user experience requirements of the user's request. Output only design specifications."},
            {"name": "FRONTEND_DEV", "prompt": "You are an expert Frontend Developer. Focus only on the React/UI implementation details of the user's request. Output only frontend code/logic."},
            {"name": "BACKEND_DEV", "prompt": "You are an expert Backend Developer. Focus only on the API, database, and system architecture of the user's request. Output only backend code/logic."}
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
            await asyncio.gather(*tasks)
            await queue.put(None)

        asyncio.create_task(wait_and_close())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
