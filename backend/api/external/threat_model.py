"""
Kestrel AI - External Threat Modeling & Attack Tree Router.
Generates architectural source-sanitizer-sink attack trees using Nemotron.
"""
import asyncio
from typing import Dict, Any
from fastapi import APIRouter

from backend.services.threat_model_service import generate_threat_model_graph

router = APIRouter(prefix="/threat-model", tags=["External - Threat Model"])


@router.post("/graph")
async def threat_model_graph_endpoint(payload: Dict[str, Any]):
    """Reconstructs architectural data flows from sources through sanitizers into sinks."""
    code = payload.get("code", "")
    filename = payload.get("filename", "buffer_overflow.py")
    return await asyncio.to_thread(generate_threat_model_graph, code, filename)
