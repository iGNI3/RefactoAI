"""
DAG Execution Orchestrator.

Manages the lifecycle and execution of the multi-agent DAG pipeline.
"""

import asyncio
from typing import Dict, Any, List, AsyncGenerator
import time

from app.agents import AgentRole, AgentStatus, AgentUpdate
from app.agents.planner import PlannerAgent
from app.agents.architect import ArchitectAgent
from app.agents.coder import CoderAgent
from app.agents.reviewer import ReviewerAgent
from app.agents.qa_agent import QAAgent
from app.core.model_router import SmartModelRouter

class DAGOrchestrator:
    def __init__(self):
        self.router = SmartModelRouter()
        
    async def run_planner(self, prompt: str, context: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Runs the planner and yields the plan for human approval."""
        llm = self.router.get_llm_for_role(AgentRole.PLANNER)
        planner = PlannerAgent(llm)
        
        # Yield status
        yield AgentUpdate(agent_id="planner_1", role=AgentRole.PLANNER, status=AgentStatus.THINKING).to_dict()
        
        plan = await planner.generate_plan(prompt, context)
        
        yield AgentUpdate(
            agent_id="planner_1", 
            role=AgentRole.PLANNER, 
            status=AgentStatus.BLOCKED, # Waiting for human
            content="Plan generated. Waiting for approval.",
            artifacts={"plan": plan.to_dict()}
        ).to_dict()

    async def execute_dag(self, plan_data: Dict[str, Any], context: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes an approved plan (DAG) dynamically.
        """
        tasks = plan_data.get("tasks", [])
        
        # Shared memory between agents
        shared_state = {
            "architect_spec": "",
            "coder_diffs": [],
            "reviewer_report": "",
            "qa_report": ""
        }
        
        queue = asyncio.Queue()
        completed = set()
        in_progress = set()
        
        async def run_node(task: Dict[str, Any]):
            task_id = task["id"]
            role_str = task.get("role", "coder").lower()
            role = AgentRole(role_str) if role_str in [r.value for r in AgentRole] else AgentRole.CODER
            
            await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.WORKING).to_dict())
            
            try:
                llm = self.router.get_llm_for_role(role)
                
                if role == AgentRole.ARCHITECT:
                    agent = ArchitectAgent(llm)
                    async for update in agent.execute_task(task, context):
                        if update["type"] == "done":
                            shared_state["architect_spec"] += update.get("spec", "")
                        else:
                            await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.WORKING, content=update["content"]).to_dict())
                            
                elif role == AgentRole.CODER:
                    agent = CoderAgent(llm)
                    async for update in agent.execute_task(task, shared_state["architect_spec"], context):
                        if update["type"] == "done":
                            shared_state["coder_diffs"].extend(update.get("diffs", []))
                            # Send diffs to frontend for approval review later
                            await queue.put(AgentUpdate(
                                agent_id=task_id, 
                                role=role.value, 
                                status=AgentStatus.DONE,
                                artifacts={"diffs": update.get("diffs", [])}
                            ).to_dict())
                        else:
                            await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.WORKING, content=update["content"]).to_dict())

                elif role == AgentRole.REVIEWER:
                    agent = ReviewerAgent(llm)
                    async for update in agent.execute_task(task, shared_state["coder_diffs"], context):
                        if update["type"] == "done":
                            shared_state["reviewer_report"] = update.get("report", "")
                        else:
                            await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.WORKING, content=update["content"]).to_dict())
                            
                elif role == AgentRole.QA:
                    agent = QAAgent(llm)
                    async for update in agent.execute_task(task, shared_state["coder_diffs"], context):
                        if update["type"] == "done":
                            shared_state["qa_report"] = update.get("report", "")
                        else:
                            await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.WORKING, content=update["content"]).to_dict())

                # Task Done
                await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.DONE).to_dict())
                
            except Exception as e:
                await queue.put(AgentUpdate(agent_id=task_id, role=role.value, status=AgentStatus.ERROR, content=f"Error: {str(e)}").to_dict())
                
            finally:
                completed.add(task_id)
                if task_id in in_progress:
                    in_progress.remove(task_id)

        # Naive DAG execution loop
        active_tasks = []
        
        async def orchestrator_loop():
            nonlocal active_tasks
            # Validate tasks to ensure no unreachable dependencies
            all_task_ids = {t["id"] for t in tasks}
            for t in tasks:
                t["depends_on"] = [d for d in t.get("depends_on", []) if d in all_task_ids]

            while len(completed) < len(tasks):
                progress_made = False
                for t in tasks:
                    t_id = t["id"]
                    if t_id in completed or t_id in in_progress:
                        continue
                        
                    # Check dependencies
                    deps = t.get("depends_on", [])
                    if all(d in completed for d in deps):
                        in_progress.add(t_id)
                        active_tasks.append(asyncio.create_task(run_node(t)))
                        progress_made = True
                        
                if not progress_made and not in_progress:
                    # Deadlock detected
                    for t in tasks:
                        if t["id"] not in completed:
                            await queue.put(AgentUpdate(agent_id=t["id"], role=AgentRole.CODER.value, status=AgentStatus.ERROR, content="Deadlock: Unresolvable dependencies.").to_dict())
                            completed.add(t["id"])
                    break
                        
                await asyncio.sleep(0.5)
                
            if active_tasks:
                await asyncio.gather(*active_tasks)
                
            await queue.put(None) # Sentinel to end stream

        # Start orchestrator
        asyncio.create_task(orchestrator_loop())
        
        # Stream from queue
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
