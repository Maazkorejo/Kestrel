"""
SecStudio AI - Embedded SQLite Cache & Persistence Layer.
Manages persistent AST remediation cache, Tavily threat intelligence TTL cache,
and workspace security telemetry history.
"""
import os
import sqlite3
import json
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List

# Store cache inside user's local application data directory
_CACHE_DIR = Path.home() / ".secstudio"
_CACHE_DIR.mkdir(parents=True, exist_ok=True)
_DB_PATH = _CACHE_DIR / "secstudio_cache.db"


def _get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initializes tables for AST cache, threat intel cache, and workspace audit history."""
    with _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ast_remediation_cache (
                ast_hash TEXT PRIMARY KEY,
                language TEXT,
                finding_id TEXT,
                cwe_id TEXT,
                root_cause TEXT,
                patch_summary TEXT,
                diff TEXT,
                patched_code TEXT,
                created_at REAL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS threat_intel_cache (
                query_key TEXT PRIMARY KEY,
                cve_id TEXT,
                title TEXT,
                summary TEXT,
                mitigation TEXT,
                source_url TEXT,
                expires_at REAL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS workspace_audit_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_path TEXT,
                timestamp REAL,
                total_files INTEGER,
                total_findings INTEGER,
                critical_count INTEGER,
                high_count INTEGER,
                health_score INTEGER,
                summary_json TEXT
            )
        """)
        conn.commit()


# Initialize on import
init_db()


def compute_ast_hash(code_snippet: str, cwe_id: str) -> str:
    """Computes a deterministic hash for a normalized code snippet and vulnerability type."""
    normalized = " ".join(code_snippet.split()) + "::" + cwe_id.strip().upper()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def get_cached_remediation(ast_hash: str) -> Optional[Dict[str, Any]]:
    """Retrieves cached defensive patch result if available."""
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM ast_remediation_cache WHERE ast_hash = ?",
                (ast_hash,)
            )
            row = cursor.fetchone()
            if row:
                return {
                    "finding_id": row["finding_id"],
                    "root_cause": row["root_cause"],
                    "exploit_scenario": "Realistic exploit prevented via cached defensive baseline.",
                    "patch_summary": row["patch_summary"],
                    "diff": row["diff"],
                    "patched_full_code": row["patched_code"],
                    "from_cache": True
                }
    except Exception as e:
        print(f"[!] Cache lookup error: {e}")
    return None


def set_cached_remediation(
    ast_hash: str,
    language: str,
    finding_id: str,
    cwe_id: str,
    root_cause: str,
    patch_summary: str,
    diff: str,
    patched_code: str
) -> None:
    """Persists a synthesized patch to the local cache."""
    try:
        with _get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO ast_remediation_cache 
                (ast_hash, language, finding_id, cwe_id, root_cause, patch_summary, diff, patched_code, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ast_hash, language, finding_id, cwe_id,
                root_cause, patch_summary, diff, patched_code, time.time()
            ))
            conn.commit()
    except Exception as e:
        print(f"[!] Cache write error: {e}")


def get_cached_threat_intel(query_key: str) -> Optional[Dict[str, Any]]:
    """Retrieves non-expired threat intelligence advisory from cache."""
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM threat_intel_cache WHERE query_key = ? AND expires_at > ?",
                (query_key.lower().strip(), time.time())
            )
            row = cursor.fetchone()
            if row:
                return {
                    "cve_id": row["cve_id"],
                    "title": row["title"],
                    "summary": row["summary"],
                    "mitigation": row["mitigation"],
                    "source_url": row["source_url"],
                    "from_cache": True
                }
    except Exception as e:
        print(f"[!] Threat cache lookup error: {e}")
    return None


def set_cached_threat_intel(
    query_key: str,
    cve_id: str,
    title: str,
    summary: str,
    mitigation: str,
    source_url: str,
    ttl_seconds: int = 86400  # 24 hours TTL
) -> None:
    """Persists a threat intel advisory with a 24-hour expiration timestamp."""
    try:
        expires_at = time.time() + ttl_seconds
        with _get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO threat_intel_cache
                (query_key, cve_id, title, summary, mitigation, source_url, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                query_key.lower().strip(), cve_id, title, summary, mitigation, source_url, expires_at
            ))
            conn.commit()
    except Exception as e:
        print(f"[!] Threat cache write error: {e}")


def record_workspace_audit(
    workspace_path: str,
    total_files: int,
    total_findings: int,
    critical_count: int,
    high_count: int,
    health_score: int,
    summary_data: Dict[str, Any]
) -> None:
    """Saves a workspace audit run to track historical health score posture."""
    try:
        with _get_connection() as conn:
            conn.execute("""
                INSERT INTO workspace_audit_history
                (workspace_path, timestamp, total_files, total_findings, critical_count, high_count, health_score, summary_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                workspace_path, time.time(), total_files, total_findings,
                critical_count, high_count, health_score, json.dumps(summary_data)
            ))
            conn.commit()
    except Exception as e:
        print(f"[!] Workspace audit history record error: {e}")


def get_audit_history(limit: int = 10) -> List[Dict[str, Any]]:
    """Fetches past scan runs for telemetry sparklines and trends."""
    results = []
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM workspace_audit_history ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            for row in cursor.fetchall():
                results.append({
                    "id": row["id"],
                    "workspace_path": row["workspace_path"],
                    "timestamp": row["timestamp"],
                    "total_files": row["total_files"],
                    "total_findings": row["total_findings"],
                    "critical_count": row["critical_count"],
                    "high_count": row["high_count"],
                    "health_score": row["health_score"]
                })
    except Exception as e:
        print(f"[!] Audit history fetch error: {e}")
    return results


def clear_cache() -> None:
    """Purges all caches for zero-retention / privacy mode."""
    with _get_connection() as conn:
        conn.execute("DELETE FROM ast_remediation_cache")
        conn.execute("DELETE FROM threat_intel_cache")
        conn.commit()
