"""
Architect Agent.

Takes the planner's DAG node (and overall goal) and produces concrete technical
specifications (file structure, APIs, schemas) for the Coder agents.
"""

from typing import Dict, Any, AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage

ARCHITECT_PROMPT = """
You are the Expert Software Architect Agent.
You have received a task from the Planner. Your job is to define the specific
technical contracts, file structures, and patterns the Coder agents must follow.

Focus on:
1. File paths to create/modify.
2. Data structures/schemas.
3. Interface boundaries (API endpoints, component props, function signatures).
4. Do NOT write the full implementation. Just write the specification and skeleton.
"""

class ArchitectAgent:
    def __init__(self, llm):
        self.llm = llm

    async def execute_task(self, task: Dict[str, Any], context: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes an architect task, streaming back thought and content updates.
        """
        prompt = f"Codebase Context:\n{context}\n\nTask:\nTitle: {task.get('title')}\nDescription: {task.get('description')}\n\nGenerate the Architecture Specification."
        
        messages = [
            SystemMessage(content=ARCHITECT_PROMPT),
            HumanMessage(content=prompt)
        ]

        # We assume llm.astream yields chunks. For deep models, we might get reasoning metadata.
        full_spec = ""
        async for chunk in self.llm.astream(messages):
            if hasattr(chunk, "additional_kwargs") and "reasoning_content" in chunk.additional_kwargs:
                yield {"type": "thought", "content": chunk.additional_kwargs["reasoning_content"]}
            elif hasattr(chunk, "additional_kwargs") and "thinking" in chunk.additional_kwargs:
                yield {"type": "thought", "content": chunk.additional_kwargs["thinking"]}
                
            if chunk.content:
                full_spec += chunk.content
                yield {"type": "content", "content": chunk.content}
                
        # Final output
        yield {"type": "done", "spec": full_spec}
