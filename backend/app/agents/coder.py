"""
Coder Agent.

Takes the technical specification and writes the actual implementation code.
Outputs code as Unified Diffs to be presented for Human Approval.
"""

from typing import Dict, Any, AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage

CODER_PROMPT = """
You are the Expert Software Engineer Agent.
You have received a technical specification from the Architect.
Your job is to implement the code according to the specification.

Output your changes in Unified Diff format for each file you modify.
Wrap each diff in a code block like this:
```diff
--- a/path/to/file.py
+++ b/path/to/file.py
@@ -1,5 +1,5 @@
-old code
+new code
```
For new files, use `/dev/null` as the old file path.
DO NOT WRITE FULL FILES unless it's a completely new file. Use diffs to modify existing code.
"""

class CoderAgent:
    def __init__(self, llm):
        self.llm = llm

    async def execute_task(self, task: Dict[str, Any], architect_spec: str, context: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes a coding task, streaming back code diffs.
        """
        prompt = f"Codebase Context:\n{context}\n\nArchitect Specification:\n{architect_spec}\n\nTask:\nTitle: {task.get('title')}\nDescription: {task.get('description')}\n\nGenerate the implementation code diffs."
        
        messages = [
            SystemMessage(content=CODER_PROMPT),
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
                
        # Parse diffs from the output (naive approach for MVP)
        diffs = []
        in_diff = False
        current_diff = []
        for line in full_output.split('\n'):
            if line.startswith("```diff"):
                in_diff = True
            elif line.startswith("```") and in_diff:
                in_diff = False
                diffs.append("\n".join(current_diff))
                current_diff = []
            elif in_diff:
                current_diff.append(line)
                
        # Final output
        yield {"type": "done", "output": full_output, "diffs": diffs}
