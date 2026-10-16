"""
Kestrel AI - External API Router Aggregator.
Combines AI specialist, patch remediation, threat intel, threat modeling, and OAuth routers.
"""
from fastapi import APIRouter

from .ai import router as ai_router
from .remediation import router as remediation_router
from .intel import router as intel_router
from .threat_model import router as threat_model_router
from .oauth import router as oauth_router

router = APIRouter()

router.include_router(ai_router)
router.include_router(remediation_router)
router.include_router(intel_router)
router.include_router(threat_model_router)
router.include_router(oauth_router)
