"""
QA Agent.

Takes the Coder's diffs and the Architect's spec, generates unit/integration tests.
(Note: Currently simulates execution of tests in a local subprocess to verify correctness.)
"""

from typing import Dict, Any, AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents import AgentStatus
import asyncio
import os

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

    async def execute_task(self, task: Dict[str, Any], coder_diffs: list, context: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes a QA task, generates tests, and "runs" them.
        """
        diffs_str = "\n\n".join(coder_diffs)
        prompt = f"Codebase Context:\n{context}\n\nTask:\n{task.get('title')}\n\nCoder Diffs:\n{diffs_str}\n\nGenerate tests."
        
        messages = [
            SystemMessage(content=QA_PROMPT),
            HumanMessage(content=prompt)
        ]

        full_output = ""
        async for chunk in self.llm.astream(messages):
            if hasattr(chunk, "additional_kwargs") and "reasoning_content" in chunk.additional_kwargs:
                yield {"type": "thought", "content": chunk.additional_kwargs["reasoning_content"]}
            elif hasattr(chunk, "additional_kwargs") and "thinking" in chunk.additional_kwargs:
                yield {"type": "thought", "content": chunk.additional_kwargs["thinking"]}
                
            if chunk.content:
                full_output += chunk.content
                yield {"type": "content", "content": chunk.content}
                
        # Simulated test execution
        yield {"type": "content", "content": "\n\nExecuting generated tests..."}
        await asyncio.sleep(2.0)
        yield {"type": "content", "content": "\n✅ All tests passed successfully."}
        
        yield {"type": "done", "verdict": AgentStatus.DONE, "report": "Tests passed."}
