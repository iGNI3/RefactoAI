"""
Planner Agent.

Analyzes the user's prompt and codebase context to generate
a structured execution plan (Task DAG).
"""

import json
import re
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from app.agents import ExecutionPlan, TaskNode, AgentRole
from app.core.logger import logger

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
      "role": "coder",
      "title": "Short title",
      "description": "Detailed instructions for the agent",
      "depends_on": ["id_of_another_task"]
    }
  ]
}

Respond ONLY with valid JSON. No markdown, no commentary.
"""


def _extract_json(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
        if match:
            return match.group(1).strip()
    return cleaned


def _parse_role(role_str: str) -> AgentRole:
    try:
        return AgentRole[role_str.upper()]
    except KeyError:
        return AgentRole.CODER


class PlannerAgent:
    def __init__(self, llm):
        self.llm = llm

    async def generate_plan(self, prompt: str, context: str = "") -> ExecutionPlan:
        messages = [
            SystemMessage(content=PLANNER_PROMPT),
            HumanMessage(content=f"Codebase Context:\n{context}\n\nUser Request:\n{prompt}"),
        ]

        response = await self.llm.ainvoke(messages)
        raw_text = response.content
        json_str = _extract_json(raw_text)

        try:
            parsed = json.loads(json_str)

            tasks = []
            for t in parsed.get("tasks", []):
                tasks.append(
                    TaskNode(
                        id=t.get("id"),
                        role=_parse_role(t.get("role", "coder")),
                        title=t.get("title", ""),
                        description=t.get("description", ""),
                        depends_on=t.get("depends_on", []),
                    ).__dict__
                )

            return ExecutionPlan(
                goal=parsed.get("goal", ""),
                tasks=tasks,
                risks=parsed.get("risks", []),
                raw_text=raw_text,
            )
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Plan parsing failed, retrying: {e}")
            return ExecutionPlan(
                goal="Parse failed",
                tasks=[],
                risks=[],
                raw_text=raw_text,
            )
