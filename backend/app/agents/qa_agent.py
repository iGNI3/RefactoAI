"""
QA Agent.

Takes the Coder's diffs and the Architect's spec, generates unit/integration tests.
"""

from typing import Dict, Any, AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents import AgentStatus

QA_PROMPT = """
You are the QA Engineer Agent.
You have received a feature specification and the Coder's implementation diffs.

Your job is to:
1. Write testing code (pytest for python, jest/vitest for JS).
2. Output the test code wrapped in ```python or ```javascript blocks.

Do NOT output a verdict yet. Just output the test code.
"""


class QAAgent:
    def __init__(self, llm):
        self.llm = llm

    async def execute_task(
        self, task: Dict[str, Any], coder_diffs: list, context: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        diffs_str = "\n\n".join(coder_diffs)
        prompt = (
            f"Codebase Context:\n{context}\n\n"
            f"Task:\n{task.get('title')}\n\n"
            f"Coder Diffs:\n{diffs_str}\n\nGenerate tests."
        )

        messages = [
            SystemMessage(content=QA_PROMPT),
            HumanMessage(content=prompt),
        ]

        full_output = ""
        async for chunk in self.llm.astream(messages):
            if hasattr(chunk, "additional_kwargs"):
                if "reasoning_content" in chunk.additional_kwargs:
                    yield {
                        "type": "thought",
                        "content": chunk.additional_kwargs["reasoning_content"],
                    }
                if "thinking" in chunk.additional_kwargs:
                    yield {"type": "thought", "content": chunk.additional_kwargs["thinking"]}

            if chunk.content:
                full_output += chunk.content
                yield {"type": "content", "content": chunk.content}

        yield {
            "type": "done",
            "verdict": AgentStatus.DONE,
            "report": full_output,
        }
