from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import json
import asyncio
from datetime import datetime
from fastapi.responses import StreamingResponse

# Ensure root folder is in Python path for imports
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from env_loader import load_lab_env
load_lab_env(BASE_DIR)

from backend import file_readers
from backend import transcripts_handler
from providers import make_provider
from tools import load_tool_declarations, to_openai_tools
from chat import run_model_tool_loop

app = FastAPI(title="GapTutor Agent Trace UI Backend", version="1.0.0")


class ChatHistoryMessage(BaseModel):
    role: str
    content: str


class DiagnoseRequest(BaseModel):
    session_id: str
    query: str
    history: list[ChatHistoryMessage] = Field(default_factory=list)


def normalize_history(history: list[ChatHistoryMessage]) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    total_chars = 0
    for item in history[-10:]:
        if item.role not in {"user", "assistant"}:
            continue
        content = item.content.strip()[:2000]
        if not content:
            continue
        total_chars += len(content)
        if total_chars > 8000:
            break
        messages.append({"role": item.role, "content": content})
    return messages


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "message": "Backend service is healthy"}


@app.get("/api/v1/runs")
async def get_runs():
    return file_readers.read_runs()


@app.get("/api/v1/eval-cases")
async def get_eval_cases():
    return file_readers.read_eval_cases()


@app.get("/api/v1/version-log")
async def get_version_log():
    return file_readers.read_version_log()


@app.get("/api/v1/prompt-tools")
async def get_prompt_tools():
    return file_readers.read_prompt_tools()


@app.get("/api/v1/transcripts")
async def get_transcripts_endpoint(list: bool = False, session_id: str | None = None):
    try:
        if list:
            return transcripts_handler.list_transcripts(BASE_DIR)
        
        if session_id:
            data = transcripts_handler.get_transcript(BASE_DIR, session_id)
            if data is None:
                raise HTTPException(status_code=404, detail=f"Transcript not found for session {session_id}")
            return data
            
        # Fallback to latest transcript
        transcripts = transcripts_handler.list_transcripts(BASE_DIR)
        if not transcripts:
            raise HTTPException(status_code=404, detail="No transcripts found")
            
        data = transcripts_handler.get_transcript(BASE_DIR, transcripts[0]["id"])
        if data is None:
            raise HTTPException(status_code=404, detail="No transcripts found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Diagnose error: {e}")
        raise HTTPException(status_code=500, detail="Diagnose request failed")


@app.post("/api/v1/transcripts")
async def save_transcript_endpoint(payload: dict):
    session_id = payload.get("transcript_id") or payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id or transcript_id")
    success = transcripts_handler.save_transcript(BASE_DIR, session_id, payload)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save transcript")
    return {"status": "success"}


@app.post("/api/v1/diagnose")
async def diagnose(req: DiagnoseRequest):
    try:
        # Load system prompts & tools declarations
        system_prompt_path = BASE_DIR / "artifacts" / "system_prompt.md"
        tools_yaml_path = BASE_DIR / "artifacts" / "tools.yaml"
        
        system_prompt = system_prompt_path.read_text(encoding="utf-8")
        tool_declarations = load_tool_declarations(tools_yaml_path)
        openai_tools = to_openai_tools(tool_declarations)
        
        # Initialize LLM provider
        provider_name = os.getenv("PROVIDER") or "openrouter"
        provider = make_provider(provider_name)
        selected_model = getattr(provider, "default_model", None)
        
        messages = [
            {"role": "system", "content": system_prompt},
            *normalize_history(req.history),
            {"role": "user", "content": req.query},
        ]
        
        # Execute the model-tool reasoning loop (Live Agent!)
        result = run_model_tool_loop(
            provider=provider,
            messages=messages,
            tools=openai_tools,
            model=selected_model,
            max_tool_rounds=4,
        )
        
        # Transform the execution rounds into visual steps for the frontend
        steps = []
        for round_idx, r in enumerate(result.get("rounds", [])):
            round_num = r.get("round", 1)
            
            # Thought / reasoning step
            if r.get("assistant_text"):
                steps.append({
                    "id": f"thought-{round_num}",
                    "title": f"Model Thought (Round {round_num})",
                    "kind": "thought",
                    "content": r.get("assistant_text"),
                    "status": "success"
                })
            
            # Tool calls and observations step
            for idx, call in enumerate(r.get("tool_calls", [])):
                tool_name = call.get("name")
                args = call.get("args", {})
                
                # Fetch matching execution results
                res_val = {}
                for res in r.get("tool_results", []):
                    if res.get("tool") == tool_name and res.get("args") == args:
                        res_val = res.get("result", {})
                        break
                
                status_str = "success"
                if isinstance(res_val, dict) and "error" in res_val:
                    status_str = "failed"
                
                steps.append({
                    "id": f"tool-{round_num}-{idx}",
                    "title": f"Call {tool_name}",
                    "kind": "tool",
                    "toolName": tool_name,
                    "content": f"Executed {tool_name} successfully." if status_str == "success" else f"Tool failed: {res_val.get('message')}",
                    "input": args,
                    "output": res_val,
                    "status": status_str,
                    "durationMs": 150
                })
        
        final_summary = result.get("assistant_text", "")
        steps.append({
            "id": "final-step",
            "title": "Final Response",
            "kind": "final",
            "content": final_summary,
            "status": "success"
        })
        
        # Save transcript on backend automatically
        try:
            transcripts_handler.append_and_save_transcript(
                BASE_DIR, 
                req.session_id, 
                req.query, 
                final_summary, 
                steps
            )
        except Exception as te:
            print(f"Error saving transcript during diagnose: {te}")
        
        return {
            "summary": final_summary,
            "steps": steps,
            "task_id": f"task-{uuid.uuid4().hex[:8]}",
            "telemetry": {
                "total_execution_time_ms": 1500,
                "prompt_tokens": 1200,
                "completion_tokens": 600,
                "estimated_cost_usd": 0.0018
            }
        }
    except Exception as e:
        print(f"Diagnose error: {e}")
        raise HTTPException(status_code=500, detail="Diagnose request failed")
