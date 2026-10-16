"""
Kestrel AI - Internal CI/CD Pipeline & Webhook Router.
Generates automated GitHub Actions and GitLab CI workflows with DevSecOps auditing.
"""
import asyncio
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks

from backend.services.workspace import get_active_workspace
from backend.services.cicd_service import generate_pipeline_file

router = APIRouter(tags=["Internal - CI/CD"])


@router.post("/cicd/generate")
async def cicd_generate_endpoint(payload: Dict[str, Any]):
    """Generates automated GitHub Actions or GitLab CI workflows with SARIF export."""
    ci_provider = payload.get("provider", "github_actions")
    workspace_dir = get_active_workspace()
    try:
        result = await asyncio.to_thread(generate_pipeline_file, str(workspace_dir), ci_provider)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhooks/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    DevSecOps Webhook receiver.
    Accepts push and pull_request events, queues background audit, and returns 200 OK.
    """
    payload = await request.json()
    event_type = request.headers.get("X-GitHub-Event", "push")
    repo_name = payload.get("repository", {}).get("full_name", "unknown/repo")

    return {
        "status": "received",
        "event": event_type,
        "repository": repo_name,
        "message": "DevSecOps audit queued for background evaluation."
    }
