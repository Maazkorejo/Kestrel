"""
Kestrel AI - Internal Extension Marketplace Router.
Provides endpoints for searching live Open VSX extensions, listing installed extensions,
and managing extension installations in the Kestrel IDE workspace.
"""
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException

from backend.services.marketplace import (
    search_marketplace,
    install_extension,
    uninstall_extension,
    get_installed_extensions
)

router = APIRouter(prefix="/extensions", tags=["Internal - Extensions"])


@router.get("/search")
async def search_extensions(
    q: str = Query("", description="Search term for extensions (e.g. python, rust, security)"),
    category: str = Query("", description="Category filter (e.g. Security, Languages, Linters, Themes)"),
    size: int = Query(30, ge=1, le=100, description="Max results to return")
) -> Dict[str, Any]:
    """Searches live Open VSX Registry and curated catalog for extensions."""
    items = await asyncio.to_thread(search_marketplace, query=q, category=category, size=size)
    return {"results": items, "total": len(items)}


@router.get("/installed")
async def list_installed_extensions() -> Dict[str, Any]:
    """Returns all installed extensions."""
    installed = await asyncio.to_thread(get_installed_extensions)
    return {"installed": installed, "total": len(installed)}


@router.post("/install")
async def install_ide_extension(payload: Dict[str, Any]):
    """Installs an extension into the Kestrel IDE workspace."""
    ext_id = payload.get("id")
    if not ext_id:
        raise HTTPException(status_code=400, detail="Missing extension ID")
    return await asyncio.to_thread(install_extension, ext_id=ext_id, metadata=payload)


@router.post("/uninstall")
async def uninstall_ide_extension(payload: Dict[str, Any]):
    """Uninstalls an extension from the Kestrel IDE workspace."""
    ext_id = payload.get("id")
    if not ext_id:
        raise HTTPException(status_code=400, detail="Missing extension ID")
    return await asyncio.to_thread(uninstall_extension, ext_id=ext_id)
