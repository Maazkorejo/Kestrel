"""
SecStudio AI - Database and Persistence Package.
Re-exports SQLite caching and telemetry functions.
"""
from ..services.cache_db import (
    init_db,
    compute_ast_hash,
    get_cached_remediation,
    set_cached_remediation,
    get_cached_threat_intel,
    set_cached_threat_intel,
    record_workspace_audit,
    get_audit_history,
    clear_cache
)

__all__ = [
    "init_db",
    "compute_ast_hash",
    "get_cached_remediation",
    "set_cached_remediation",
    "get_cached_threat_intel",
    "set_cached_threat_intel",
    "record_workspace_audit",
    "get_audit_history",
    "clear_cache"
]
