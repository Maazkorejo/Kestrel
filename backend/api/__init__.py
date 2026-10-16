"""
Kestrel AI - API Root Package.
Exports modular internal and external FastAPI routers.
"""
from .internal import router as internal_router
from .external import router as external_router

__all__ = ["internal_router", "external_router"]
