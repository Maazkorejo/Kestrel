"""
Kestrel AI - External AI Reasoning & Guardrails Router.
Handles contextual vulnerability Q&A powered by NVIDIA Nemotron with guardrail enforcement.
"""
import asyncio
from fastapi import APIRouter

from backend.models import AskAiRequest, AskAiResponse
from backend.services.ai_remediation import ask_vulnerability_ai

router = APIRouter(prefix="/ai", tags=["External - AI"])


@router.post("/ask", response_model=AskAiResponse)
async def ask_ai_vulnerability_endpoint(request: AskAiRequest) -> AskAiResponse:
    """
    Answers user technical questions strictly scoped to the security vulnerability
    identified in the code, enforcing guardrail verification and root-cause analysis.
    """
    return await asyncio.to_thread(ask_vulnerability_ai, request)
