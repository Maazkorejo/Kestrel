"""
Kestrel AI - Internal Settings & Extensions Router.
Manages IDE preferences, model provider selection, and marketplace extensions.
"""
import os
import asyncio
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

from backend.services.workspace import get_active_workspace
from backend.services.marketplace import (
    search_marketplace,
    install_extension,
    uninstall_extension
)

router = APIRouter(tags=["Internal - Settings"])


@router.get("/settings/current")
async def get_current_settings():
    """Returns active model and masked API credentials."""
    nebius_key = os.getenv("NEBIUS_API_KEY", "")
    tavily_key = os.getenv("TAVILY_API_KEY", "")
    masked_nebius = f"sk-...{nebius_key[-4:]}" if len(nebius_key) > 6 else ("Configured" if nebius_key else "")
    masked_tavily = f"tvly-...{tavily_key[-4:]}" if len(tavily_key) > 6 else ("Configured" if tavily_key else "")

    return {
        "model": os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning:free"),
        "nebius_key_masked": masked_nebius,
        "tavily_key_masked": masked_tavily,
        "llm_provider": os.getenv("LLM_PROVIDER", "nebius"),
        "ollama_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "ollama_model": os.getenv("OLLAMA_MODEL", "nemotron-mini"),
        "offline_mode": os.getenv("OFFLINE_MODE", "false").lower() == "true",
        "active_workspace": str(get_active_workspace())
    }


@router.post("/settings/save")
async def save_settings_endpoint(payload: Dict[str, Any]):
    """Updates runtime credentials and model configuration."""
    if "nebius_key" in payload and payload["nebius_key"].strip():
        os.environ["NEBIUS_API_KEY"] = payload["nebius_key"].strip()
    if "tavily_key" in payload and payload["tavily_key"].strip():
        os.environ["TAVILY_API_KEY"] = payload["tavily_key"].strip()
    if "model" in payload and payload["model"].strip():
        os.environ["NVIDIA_MODEL"] = payload["model"].strip()
    if "llm_provider" in payload and payload["llm_provider"].strip():
        os.environ["LLM_PROVIDER"] = payload["llm_provider"].strip().lower()
    if "ollama_url" in payload and payload["ollama_url"].strip():
        os.environ["OLLAMA_BASE_URL"] = payload["ollama_url"].strip()
    if "ollama_model" in payload and payload["ollama_model"].strip():
        os.environ["OLLAMA_MODEL"] = payload["ollama_model"].strip()
    if "offline_mode" in payload:
        os.environ["OFFLINE_MODE"] = "true" if payload["offline_mode"] else "false"

    return {"status": "ok", "message": "Settings updated successfully."}


@router.get("/extensions/search")
async def search_extensions_endpoint(q: str = ""):
    """Searches real VS Code extensions from Open VSX Registry / Curated Cyber Catalog."""
    return await asyncio.to_thread(search_marketplace, q)


@router.post("/extensions/install")
async def install_extension_endpoint(payload: Dict[str, Any]):
    """Installs an extension into the active IDE workspace."""
    ext_id = payload.get("id")
    if not ext_id:
        raise HTTPException(status_code=400, detail="Missing extension ID")
    return install_extension(ext_id, payload)


@router.post("/extensions/uninstall")
async def uninstall_extension_endpoint(payload: Dict[str, Any]):
    """Uninstalls an extension from the active IDE workspace."""
    ext_id = payload.get("id")
    if not ext_id:
        raise HTTPException(status_code=400, detail="Missing extension ID")
    return uninstall_extension(ext_id)
