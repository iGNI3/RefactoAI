"""
Agent Base Types and DAG Primitives.

Defines the foundational types for the multi-agent pipeline:
AgentRole, AgentStatus, TaskNode, and AgentUpdate.

Phase 6
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import uuid
import time


class AgentRole(str, Enum):
    PLANNER = "planner"
    ARCHITECT = "architect"
    CODER = "coder"
    REVIEWER = "reviewer"
    QA = "qa"


class AgentStatus(str, Enum):
    PENDING = "pending"
    THINKING = "thinking"
    WORKING = "working"
    DONE = "done"
    ERROR = "error"
    BLOCKED = "blocked"          # waiting for human approval
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class TaskNode:
    """A single node in the execution DAG."""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    role: AgentRole = AgentRole.CODER
    title: str = ""
    description: str = ""
    depends_on: List[str] = field(default_factory=list)
    status: AgentStatus = AgentStatus.PENDING
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    started_at: Optional[float] = None
    finished_at: Optional[float] = None

    @property
    def elapsed_seconds(self) -> float:
        if self.started_at is None:
            return 0.0
        end = self.finished_at or time.time()
        return round(end - self.started_at, 1)


@dataclass
class AgentUpdate:
    """Real-time update streamed to the frontend via WebSocket."""
    agent_id: str
    role: str
    status: str
    content: str = ""
    artifacts: Dict[str, Any] = field(default_factory=dict)
    elapsed: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "agent_update",
            "agent_id": self.agent_id,
            "role": self.role,
            "status": self.status,
            "content": self.content,
            "artifacts": self.artifacts,
            "elapsed": self.elapsed,
        }


@dataclass
class ExecutionPlan:
    """The Planner's output: a goal, task DAG, and risk assessment."""
    goal: str = ""
    tasks: List[Dict[str, Any]] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    raw_text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "plan",
            "goal": self.goal,
            "tasks": self.tasks,
            "risks": self.risks,
            "raw_text": self.raw_text,
        }
