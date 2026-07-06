"""
Reviewer Agent.

Takes the Coder's output (diffs) and the original specification.
Performs a security, performance, and code quality review.
Returns an APPROVE or REJECT verdict with a detailed report.
"""

import json
from typing import Dict, Any, AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents import AgentStatus

REVIEWER_PROMPT = """
You are the Expert Code Reviewer Agent.
You have received code diffs from the Coder Agent, along with the original spec.

Your job is to review the code for:
1. Security vulnerabilities
2. Performance bottlenecks
3. Architectural violations
4. Best practices

You MUST output a JSON object at the very end of your response matching this schema:
```json
{
  "verdict": "APPROVE", // or "REJECT"
  "comments": "Summary of your findings"
}
```
You can think step by step before outputting the JSON.
"""

class ReviewerAgent:
    def __init__(self, llm):
        self.llm = llm

    async def execute_task(self, task: Dict[str, Any], coder_diffs: list, context: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes a code review task.
        """
        diffs_str = "\n\n".join(coder_diffs)
        prompt = f"Codebase Context:\n{context}\n\nTask:\n{task.get('title')}\n\nCoder Diffs to Review:\n{diffs_str}"
        
        messages = [
            SystemMessage(content=REVIEWER_PROMPT),
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
                
        # Parse verdict
        verdict = AgentStatus.REJECTED
        report = "Rejected due to unparsable output."
        
        try:
            if "```json" in full_output:
                json_str = full_output.split("```json")[-1].split("```")[0]
                parsed = json.loads(json_str.strip())
                v = parsed.get("verdict", "REJECT").upper()
                if v == "APPROVE":
                    verdict = AgentStatus.DONE
                report = parsed.get("comments", report)
        except Exception:
            pass
            
        yield {"type": "done", "verdict": verdict, "report": report}
