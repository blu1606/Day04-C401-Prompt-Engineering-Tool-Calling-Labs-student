from __future__ import annotations

import os
import json
from datetime import datetime
from pathlib import Path

def list_transcripts(base_dir: Path) -> list[dict]:
    transcripts_dir = base_dir / "transcripts"
    if not transcripts_dir.exists():
        transcripts_dir.mkdir(parents=True, exist_ok=True)
        return []
        
    session_list = []
    for file in os.listdir(transcripts_dir):
        if not file.endswith(".json"):
            continue
            
        file_path = transcripts_dir / file
        try:
            stat = file_path.stat()
            mtime = int(stat.st_mtime * 1000) # milliseconds
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            try:
                parsed = json.loads(content)
            except Exception:
                parsed = {}
                
            turns = parsed.get("turns", [])
            last_turn = turns[-1] if turns else None
            raw_id = parsed.get("transcript_id", file.replace(".transcript.json", ""))
            
            title = "Chat Session"
            if raw_id.startswith("session-new-"):
                ts_str = raw_id.replace("session-new-", "")
                try:
                    ts = int(ts_str) / 1000.0  # Javascript milliseconds to Python seconds
                    dt = datetime.fromtimestamp(ts)
                    title = f"Chat {dt.strftime('%H:%M:%S')}"
                except Exception:
                    title = "New Chat"
            elif raw_id.startswith("session-"):
                title = raw_id.replace("session-", "Session ")
                
            last_msg = "No messages"
            if last_turn:
                last_msg = last_turn.get("assistant_text") or last_turn.get("user") or "No messages"
                
            session_list.append({
                "id": raw_id,
                "title": title,
                "lastMessage": last_msg,
                "timestamp": mtime,
                "messageCount": len(turns)
            })
        except Exception as e:
            # Skip invalid/unreadable files
            print(f"Error reading transcript file {file}: {e}")
            
    # Sort descending by timestamp
    session_list.sort(key=lambda x: x["timestamp"], reverse=True)
    return session_list

def get_transcript(base_dir: Path, session_id: str) -> dict | None:
    transcripts_dir = base_dir / "transcripts"
    file_path = transcripts_dir / f"{session_id}.transcript.json"
    if not file_path.exists():
        return None
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return json.loads(content)
    except Exception as e:
        print(f"Error reading transcript {session_id}: {e}")
        return None

def save_transcript(base_dir: Path, session_id: str, transcript_data: dict) -> bool:
    transcripts_dir = base_dir / "transcripts"
    if not transcripts_dir.exists():
        transcripts_dir.mkdir(parents=True, exist_ok=True)
        
    file_path = transcripts_dir / f"{session_id}.transcript.json"
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving transcript {session_id}: {e}")
        return False

def append_and_save_transcript(base_dir: Path, session_id: str, query: str, summary: str, steps: list[dict]) -> bool:
    existing = get_transcript(base_dir, session_id)
    
    if existing is None:
        existing = {
            "transcript_id": session_id,
            "version": "ui-dev",
            "provider": "ui-client",
            "model": "ui-agent",
            "created_at": datetime.now().isoformat(),
            "turns": []
        }
        
    turns = existing.get("turns", [])
    
    tool_events = []
    for s in (steps or []):
        if s.get("kind") == "tool":
            tool_events.append({
                "tool": s.get("toolName") or s.get("title"),
                "args": s.get("input") or {},
                "result": s.get("output") or {}
            })
            
    new_turn = {
        "turn_index": len(turns) + 1,
        "started_at": datetime.now().isoformat(),
        "user": query,
        "status": "answered",
        "assistant_text": summary,
        "tool_events": tool_events,
        "ended_at": datetime.now().isoformat()
    }
    
    turns.append(new_turn)
    existing["turns"] = turns
    existing["updated_at"] = datetime.now().isoformat()
    
    return save_transcript(base_dir, session_id, existing)

