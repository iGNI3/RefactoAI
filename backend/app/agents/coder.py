"""
Coder Agent.

Implements a LangGraph-based tri-layer swarm (Planner, Executor, Verifier)
to accomplish coding tasks autonomously.
"""

from typing import Dict, Any, AsyncGenerator, Annotated, Sequence, Literal, TypedDict
import operator

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.core.execution_tools import get_workspace_tools
from app.core.logger import logger


class SwarmState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    task_description: str
    context: str
    architect_spec: str
    plan: str
    verification_status: str
    loop_count: int


_MAX_SWARM_LOOPS = 15


class CoderAgent:
    def __init__(self, llm):
        self.llm = llm
        self._tools = get_workspace_tools()
        self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(SwarmState)

        workflow.add_node("planner", self._planner_node)
        workflow.add_node("executor", self._executor_node)
        workflow.add_node("tools", ToolNode(self._tools))
        workflow.add_node("verifier", self._verifier_node)

        workflow.set_entry_point("planner")

        workflow.add_edge("planner", "executor")

        workflow.add_conditional_edges(
            "executor",
            self._executor_router,
            {"tools": "tools", "verifier": "verifier"},
        )

        workflow.add_edge("tools", "executor")

        workflow.add_conditional_edges(
            "verifier",
            self._verifier_router,
            {"executor": "executor", "end": END},
        )

        self.graph = workflow.compile()

    async def _planner_node(self, state: SwarmState):
        prompt = f"""You are the Swarm Planner.
Analyze the task, context, and spec, and output a detailed step-by-step
technical plan for the Executor agent.

Task: {state['task_description']}
Spec: {state['architect_spec']}
Context: {state['context']}

Do not write code. Only output the steps required to modify files and run commands.
"""
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        return {"plan": response.content}

    async def _executor_node(self, state: SwarmState):
        llm_with_tools = self.llm.bind_tools(self._tools)

        prompt = f"""You are the Swarm Executor.
Your job is to execute the provided plan autonomously.
Use your file editing and terminal tools to accomplish the plan.
If you get errors from tools, fix them. If you believe you have finished
all steps of the plan, output exactly: "EXECUTION_COMPLETE"

Plan:
{state.get('plan', '')}
"""
        sys_msg = SystemMessage(content=prompt)
        messages_to_pass = [sys_msg] + list(state["messages"])

        response = await llm_with_tools.ainvoke(messages_to_pass)
        return {"messages": [response], "loop_count": state.get("loop_count", 0) + 1}

    def _executor_router(self, state: SwarmState) -> Literal["tools", "verifier"]:
        last_message = state["messages"][-1]
        if last_message.tool_calls:
            return "tools"
        if "EXECUTION_COMPLETE" in str(last_message.content):
            return "verifier"
        return "verifier"

    async def _verifier_node(self, state: SwarmState):
        prompt = f"""You are the Swarm Verifier.
Check if the changes made so far satisfy the original task.
If they do, output exactly: "VERIFIED_SUCCESS".
If there are missing parts, output exactly: "VERIFICATION_FAILED" and explain
what the executor needs to do next.

Task: {state['task_description']}
"""
        sys_msg = SystemMessage(content=prompt)
        messages_to_pass = [sys_msg] + list(state["messages"][-5:])

        response = await self.llm.ainvoke(messages_to_pass)
        return {"messages": [response], "verification_status": response.content}

    def _verifier_router(self, state: SwarmState) -> Literal["executor", "end"]:
        if state.get("loop_count", 0) > _MAX_SWARM_LOOPS:
            logger.warning("Swarm exceeded max loops, terminating.")
            return "end"
        last_message = state["messages"][-1]
        if "VERIFIED_SUCCESS" in str(last_message.content):
            return "end"
        return "executor"

    async def execute_task(
        self, task: Dict[str, Any], architect_spec: str, context: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        initial_state = {
            "messages": [HumanMessage(content="Begin Task.")],
            "task_description": task.get("description", ""),
            "architect_spec": architect_spec,
            "context": context,
            "plan": "",
            "verification_status": "",
            "loop_count": 0,
        }

        try:
            yield {
                "type": "thought",
                "content": "Initializing Tri-Layer Agent Swarm (Planner, Executor, Verifier)...",
            }

            async for event in self.graph.astream_events(initial_state, version="v2"):
                kind = event["event"]
                name = event.get("name", "")

                if kind == "on_chain_start" and name in [
                    "planner_node",
                    "executor_node",
                    "verifier_node",
                ]:
                    yield {
                        "type": "content",
                        "content": f"\n\n🤖 [Swarm: {name.upper()}] Thinking...\n",
                    }

                elif kind == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        yield {"type": "content", "content": content}

                elif kind == "on_tool_start":
                    yield {
                        "type": "content",
                        "content": f"\n\n🛠️ Running tool: {event['name']} with args {event['data'].get('input')}\n",
                    }

                elif kind == "on_tool_end":
                    output = event["data"].get("output")
                    out_str = str(output)
                    if len(out_str) > 500:
                        out_str = out_str[:500] + "... (truncated)"
                    yield {
                        "type": "content",
                        "content": f"\n✅ Tool finished. Result:\n{out_str}\n",
                    }

            yield {"type": "done", "output": "Execution completed successfully.", "diffs": []}

        except Exception as e:
            logger.exception(f"CoderAgent failed: {e}")
            yield {"type": "thought", "content": f"Autonomous execution failed: {str(e)}"}
            yield {"type": "done", "output": f"Error: {str(e)}", "diffs": []}
