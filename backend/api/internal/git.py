"""
Kestrel AI - Internal Git Source Control Router.
Manages repository status, staging, committing, pushing, and pulling.
"""
import asyncio
from typing import Dict, Any
from fastapi import APIRouter

from backend.services.workspace import get_active_workspace
from backend.services.git_service import (
    get_git_status, stage_file, unstage_file,
    commit_changes, push_changes, pull_changes
)

router = APIRouter(prefix="/git", tags=["Internal - Git"])


@router.get("/status")
async def git_status_endpoint():
    """Returns working directory Git status: branch, staged, unstaged, untracked."""
    return await asyncio.to_thread(get_git_status, get_active_workspace())


@router.post("/stage")
async def git_stage_endpoint(payload: Dict[str, Any]):
    """Stages specific file or all files."""
    file_path = payload.get("path", "")
    return await asyncio.to_thread(stage_file, file_path, get_active_workspace())


@router.post("/unstage")
async def git_unstage_endpoint(payload: Dict[str, Any]):
    """Unstages specific file from Git index."""
    file_path = payload.get("path", "")
    return await asyncio.to_thread(unstage_file, file_path, get_active_workspace())


@router.post("/commit")
async def git_commit_endpoint(payload: Dict[str, Any]):
    """Creates a git commit with the provided message."""
    message = payload.get("message", "")
    return await asyncio.to_thread(commit_changes, message, get_active_workspace())


@router.post("/push")
async def git_push_endpoint():
    """Pushes commits to upstream repository."""
    return await asyncio.to_thread(push_changes, get_active_workspace())


@router.post("/pull")
async def git_pull_endpoint():
    """Pulls commits from upstream repository."""
    return await asyncio.to_thread(pull_changes, get_active_workspace())
