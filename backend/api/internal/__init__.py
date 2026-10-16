"""
Kestrel AI - Internal API Router Aggregator.
Combines workspace, auth, git, search, terminal, settings, scanner, sandbox, and cicd routers.
"""
from fastapi import APIRouter

from .workspace import router as workspace_router
from .auth import router as auth_router
from .git import router as git_router
from .search import router as search_router
from .terminal import router as terminal_router
from .settings import router as settings_router
from .scanner import router as scanner_router
from .sandbox import router as sandbox_router
from .cicd import router as cicd_router

router = APIRouter()

router.include_router(workspace_router)
router.include_router(auth_router)
router.include_router(git_router)
router.include_router(search_router)
router.include_router(terminal_router)
router.include_router(settings_router)
router.include_router(scanner_router)
router.include_router(sandbox_router)
router.include_router(cicd_router)
