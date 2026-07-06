"""
Planner Agent.

Responsible for Deep Planning Mode. Analyzes the user's prompt and codebase
context to generate a structured execution plan (Task DAG).
"""

import json
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from app.agents import ExecutionPlan, TaskNode, AgentRole

PLANNER_PROMPT = """
You are the Expert Architect & Planner Agent for an autonomous coding IDE.
Your job is to take a user's feature request and break it down into a parallel-executable
Directed Acyclic Graph (DAG) of tasks.

The roles available are:
- ARCHITECT: System design, data models, API specs
- CODER: Writing actual implementation code
- REVIEWER: Security, performance, and style review
- QA: Writing tests and verifying

Output a JSON object exactly matching this schema:
{
  "goal": "One sentence summary of the objective",
  "risks": ["Risk 1", "Risk 2"],
  "tasks": [
    {
      "id": "unique_string_id",
      "role": "coder", // must be architect, coder, reviewer, or qa
      "title": "Short title",
      "description": "Detailed instructions for the agent",
      "depends_on": ["id_of_another_task"] // empty list if can run immediately
    }
  ]
}
"""

class PlannerAgent:
    def __init__(self, llm):
        self.llm = llm

    async def generate_plan(self, prompt: str, context: str = "") -> ExecutionPlan:
        """
        Calls the LLM to generate an ExecutionPlan.
        """
        messages = [
            SystemMessage(content=PLANNER_PROMPT),
            HumanMessage(content=f"Codebase Context:\n{context}\n\nUser Request:\n{prompt}")
        ]

        # Use the LLM to generate a JSON response
        # Assuming the provided LLM is configured with `.with_structured_output`
        # or we just parse JSON from the raw text.
        response = await self.llm.ainvoke(messages)
        
        raw_text = response.content
        
        # Simple JSON extraction in case there's markdown wrappers
        json_str = raw_text
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
            
        try:
            parsed = json.loads(json_str.strip())
            
            # Convert raw dict tasks into TaskNode objects
            tasks = []
            for t in parsed.get("tasks", []):
                role_str = t.get("role", "coder").upper()
                role = AgentRole[role_str] if hasattr(AgentRole, role_str) else AgentRole.CODER
                
                tasks.append(
                    TaskNode(
                        id=t.get("id"),
                        role=role,
                        title=t.get("title", ""),
                        description=t.get("description", ""),
                        depends_on=t.get("depends_on", [])
                    ).__dict__  # store as dict for easier serialization
                )
                
            return ExecutionPlan(
                goal=parsed.get("goal", ""),
                tasks=tasks,
                risks=parsed.get("risks", []),
                raw_text=raw_text
            )
        except Exception as e:
            # Fallback if JSON parsing fails
            return ExecutionPlan(
                goal="Parse failed",
                tasks=[],
                risks=[],
                raw_text=raw_text
            )
