"""
Kestrel AI - Internal AST Security Scanner & Audit Router.
Provides in-memory static AST scanning, recursive whole-workspace audits, and SARIF 2.1.0 exports.
"""
import asyncio
from fastapi import APIRouter, HTTPException

from backend.models import (
    ScanRequest, ScanResponse,
    WorkspaceScanResponse,
    SarifExportRequest
)
from backend.analyzers.orchestrator import run_static_analysis
from backend.services.batch_scanner import scan_entire_workspace
from backend.services.sarif_exporter import export_to_sarif
from backend.services.workspace import get_active_workspace

router = APIRouter(tags=["Internal - Scanner"])


@router.post("/scan/static", response_model=ScanResponse)
async def scan_static(request: ScanRequest):
    """Executes deterministic static analysis (AST & Regex) in memory."""
    if len(request.code.encode("utf-8")) > 500 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 500 KB")
    return run_static_analysis(request)


@router.post("/scan/workspace", response_model=WorkspaceScanResponse)
async def scan_workspace_endpoint():
    """Recursively audits all files in the active workspace and detects dependency CVEs."""
    return await asyncio.to_thread(scan_entire_workspace)


@router.post("/export/sarif")
async def export_sarif_endpoint(req: SarifExportRequest):
    """Exports findings to OASIS SARIF 2.1.0 standard for GitHub Code Scanning."""
    findings = req.findings or []
    if not findings:
        ws_res = await asyncio.to_thread(scan_entire_workspace)
        for f_list in ws_res.findings_by_file.values():
            findings.extend(f_list)
    return export_to_sarif(findings, workspace_root=str(get_active_workspace()))
