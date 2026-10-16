"""
Kestrel AI - External AI Patch Remediation & Streaming Router.
Generates defensive explanations, unified git diffs, and Server-Sent Events (SSE) telemetry.
"""
import json
import asyncio
from typing import Dict, Any, AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.models import (
    ScanRequest,
    RemediateRequest,
    RemediationResult
)
from backend.analyzers.orchestrator import run_static_analysis
from backend.services.threat_intel import search_threat_intel
from backend.services.ai_remediation import generate_remediation

router = APIRouter(tags=["External - Remediation"])


@router.post("/remediate", response_model=RemediationResult)
async def remediate_vulnerability(request: RemediateRequest):
    """Generates defensive explanation and unified git diff patch via Nemotron."""
    return generate_remediation(request)


@router.post("/scan/full")
async def scan_full(request: ScanRequest) -> Dict[str, Any]:
    """Orchestrates static scan, Tavily threat intelligence, and Nemotron patch generation."""
    # 1. Deterministic AST / Regex scan
    scan_result = run_static_analysis(request)

    threat_map = {}
    remediation_map = {}

    # If findings exist, enrich the top priority finding with Tavily + Nemotron
    if scan_result.findings:
        primary_finding = scan_result.findings[0]

        # 2. Live threat intelligence lookup via Tavily
        threat_intel = await asyncio.to_thread(
            search_threat_intel,
            primary_finding.cwe_id,
            primary_finding.title
        )
        threat_map[primary_finding.id] = threat_intel.records[0] if threat_intel.records else None

        # 3. AI patch synthesis via Nemotron
        remedy = await asyncio.to_thread(
            generate_remediation,
            RemediateRequest(
                filename=request.filename,
                language=request.language,
                code=request.code,
                finding=primary_finding,
                threat_intel=threat_map[primary_finding.id].model_dump() if threat_map[primary_finding.id] else None
            )
        )
        remediation_map[primary_finding.id] = remedy

    return {
        "scan": scan_result,
        "threat_intel": threat_map,
        "remediation": remediation_map
    }


@router.post("/scan/stream")
async def scan_stream(request: ScanRequest):
    """
    Server-Sent Events (SSE) progressive streaming endpoint.
    Emits findings at 200ms, Tavily threat records at 1.5s, and Nemotron patch when synthesized.
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        # Step 1: Deterministic scan
        scan_result = run_static_analysis(request)
        yield f"event: scan_complete\ndata: {json.dumps(scan_result.model_dump())}\n\n"
        await asyncio.sleep(0.1)

        if not scan_result.findings:
            yield "event: finished\ndata: {\"status\": \"clean\", \"message\": \"No security vulnerabilities detected.\"}\n\n"
            return

        primary_finding = scan_result.findings[0]
        yield f"event: primary_finding\ndata: {json.dumps(primary_finding.model_dump())}\n\n"
        await asyncio.sleep(0.1)

        # Step 2: Live threat intelligence (non-blocking thread)
        primary_threat = None
        try:
            threat_intel = await asyncio.to_thread(
                search_threat_intel,
                primary_finding.cwe_id,
                primary_finding.title
            )
            primary_threat = threat_intel.records[0] if threat_intel.records else None
            if primary_threat:
                yield f"event: threat_intel\ndata: {json.dumps(primary_threat.model_dump())}\n\n"
        except Exception as e:
            print(f"[!] Threat intel stream error: {e}")

        await asyncio.sleep(0.1)

        # Step 3: Nemotron reasoning and patch (non-blocking thread)
        yield "event: ai_thinking\ndata: {\"message\": \"NVIDIA Nemotron synthesizing defensive patch...\"}\n\n"
        try:
            remedy = await asyncio.to_thread(
                generate_remediation,
                RemediateRequest(
                    filename=request.filename,
                    language=request.language,
                    code=request.code,
                    finding=primary_finding,
                    threat_intel=primary_threat.model_dump() if primary_threat else None
                )
            )
            yield f"event: patch_ready\ndata: {json.dumps(remedy.model_dump())}\n\n"
        except Exception as e:
            print(f"[!] Remediation stream error: {e}")

        yield "event: finished\ndata: {\"status\": \"complete\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
