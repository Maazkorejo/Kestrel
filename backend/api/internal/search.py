"""
Kestrel AI - Internal Project Search & Replace Router.
Provides fast multi-file regex, case-sensitive, and whole-word workspace grep and replace.
"""
import asyncio
from typing import Dict, Any
from fastapi import APIRouter

from backend.services.workspace import get_active_workspace
from backend.services.project_search import search_workspace, replace_in_workspace

router = APIRouter(prefix="/search", tags=["Internal - Search"])


@router.post("/project")
async def project_search_endpoint(payload: Dict[str, Any]):
    """Searches query across all text files in the workspace."""
    query = payload.get("query", "")
    is_regex = bool(payload.get("is_regex", payload.get("regex", False)))
    match_case = bool(payload.get("match_case", payload.get("case_sensitive", False)))
    match_whole_word = bool(payload.get("match_whole_word", payload.get("whole_word", False)))
    return await asyncio.to_thread(
        search_workspace,
        get_active_workspace(),
        query,
        is_regex,
        match_case,
        match_whole_word
    )


@router.post("/replace-all")
async def project_replace_endpoint(payload: Dict[str, Any]):
    """Replaces query with replacement across workspace files."""
    query = payload.get("query", "")
    replacement = payload.get("replacement", "")
    is_regex = bool(payload.get("is_regex", payload.get("regex", False)))
    match_case = bool(payload.get("match_case", payload.get("case_sensitive", False)))
    match_whole_word = bool(payload.get("match_whole_word", payload.get("whole_word", False)))
    return await asyncio.to_thread(
        replace_in_workspace,
        get_active_workspace(),
        query,
        replacement,
        is_regex,
        match_case,
        match_whole_word
    )
