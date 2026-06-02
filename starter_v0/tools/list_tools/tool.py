from __future__ import annotations

from pathlib import Path
from typing import Any
import yaml

from tools._shared import err


def get_registered_tools() -> dict[str, Any]:
    try:
        # Resolve the root directory
        base_dir = Path(__file__).resolve().parent.parent.parent
        tools_yaml_path = base_dir / "artifacts" / "tools.yaml"
        if not tools_yaml_path.exists():
            tools_yaml_path = Path("artifacts/tools.yaml")
        
        with open(tools_yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            
        return {
            "tool": "list_tools",
            "tools": data.get("tools", []),
            "status": "success"
        }
    except Exception as exc:
        return err("list_tools", exc)
