import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_openai import ChatOpenAI
from app.core.logger import logger
from app.agents.coder import CoderAgent

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/refactor-stream")
async def handle_refactor_websocket_stream(websocket: WebSocket):
    from app.main import router_engine, dag_engine

    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)

            provider = payload.get("provider", "anthropic")
            model_name = payload.get("model", "claude-3-7-sonnet")
            messages = payload.get("messages", [])
            thinking_budget = int(payload.get("thinking_budget", 16000))
            use_swarm = payload.get("use_swarm", False)
            command = payload.get("command", "chat")
            task_type = payload.get("task", "chat")
            prompt = payload.get("prompt", "")

            # If messages are not provided but a prompt is, wrap it
            if not messages and prompt:
                messages = [{"role": "user", "content": prompt}]

            if task_type == "work":
                llm = ChatOpenAI(model=model_name if model_name != "claude-3-7-sonnet" else "gpt-4o", max_tokens=2000)
                coder = CoderAgent(llm)
                context = payload.get("context", "")
                async for update in coder.execute_task(
                    {"description": prompt}, architect_spec="Follow instructions", context=context
                ):
                    await websocket.send_json(update)

            elif command == "plan":
                context = payload.get("context", "")
                async for update in dag_engine.run_planner(prompt, context):
                    await websocket.send_json(update)

            elif command == "execute_dag":
                plan_data = payload.get("plan_data", {})
                context = payload.get("context", "")
                async for update in dag_engine.execute_dag(plan_data, context):
                    await websocket.send_json(update)

            elif use_swarm:
                async for update in router_engine.execute_swarm_stream(
                    provider=provider,
                    model_name=model_name,
                    messages=messages,
                    thinking_budget=thinking_budget,
                ):
                    await websocket.send_json(update)
            else:
                async for update in router_engine.execute_stream(
                    provider=provider,
                    model_name=model_name,
                    messages=messages,
                    thinking_budget=thinking_budget,
                ):
                    await websocket.send_json(update)

            await websocket.send_json({"type": "status", "content": "Execution cycle complete"})
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "content": f"Platform crash: {str(e)}"})
        except Exception:
            pass
