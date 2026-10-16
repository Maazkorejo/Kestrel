"""
Kestrel AI - Internal Workspace & File System Router.
Provides tree discovery, file I/O, node creation, and zero-retention cache clearing.
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException

from backend.models import (
    WorkspaceOpenRequest, WorkspaceTreeResponse,
    FileReadRequest, FileReadResponse,
    FileWriteRequest, FileWriteResponse,
    FileCreateRequest
)
from backend.services.workspace import (
    get_active_workspace, set_active_workspace,
    get_workspace_tree, read_workspace_file,
    write_workspace_file, create_workspace_node
)
from backend.services.cache_db import get_audit_history, clear_cache

router = APIRouter(prefix="/workspace", tags=["Internal - Workspace"])


@router.post("/open", response_model=WorkspaceTreeResponse)
async def open_workspace_endpoint(req: WorkspaceOpenRequest):
    """Opens a directory on disk and returns its file tree."""
    try:
        set_active_workspace(req.folder_path)
        return get_workspace_tree()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tree", response_model=WorkspaceTreeResponse)
async def get_workspace_tree_endpoint():
    """Returns the file tree of the currently active workspace."""
    return get_workspace_tree()


@router.get("/system-directories")
async def get_system_directories():
    """Returns standard system directory paths for quick navigation."""
    home = Path.home()
    return {
        "home": str(home),
        "desktop": str(home / "Desktop"),
        "downloads": str(home / "Downloads"),
        "documents": str(home / "Documents"),
    }


@router.post("/read", response_model=FileReadResponse)
async def read_file_endpoint(req: FileReadRequest):
    """Reads a file from the active workspace on disk."""
    try:
        content, size, lang = read_workspace_file(req.path)
        return FileReadResponse(path=req.path, content=content, size=size, language=lang)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/write", response_model=FileWriteResponse)
async def write_file_endpoint(req: FileWriteRequest):
    """Saves changes to a file in the active workspace on disk."""
    try:
        bytes_written = write_workspace_file(req.path, req.content)
        return FileWriteResponse(
            success=True,
            path=req.path,
            bytes_written=bytes_written,
            message=f"Saved {bytes_written} bytes to {req.path}."
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create")
async def create_file_endpoint(req: FileCreateRequest):
    """Creates a new file or directory inside the active workspace."""
    try:
        created = create_workspace_node(req.path, is_dir=req.is_dir, content=req.content or "")
        return {"success": created, "path": req.path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
async def get_history_endpoint():
    """Retrieves telemetry audit history runs from local SQLite database."""
    return get_audit_history()


@router.post("/clear-cache")
async def clear_cache_endpoint():
    """Purges all AST remediation and threat cache entries for zero retention privacy."""
    clear_cache()
    return {"status": "ok", "message": "Zero-retention SQLite cache purged successfully."}
