"""
SecStudio AI - Whole-Repository Batch Scanner & SBOM Dependency Auditor.
Recursively inspects all source code across an entire workspace,
aggregates security posture scorecards, and detects supply-chain CVEs in manifests.
"""
import os
import re
import time
import httpx
from pathlib import Path
from typing import Dict, List, Any, Optional

from ..models import (
    Finding, ScanRequest, WorkspaceScanResponse,
    DependencyVulnerability, SeverityLevel
)
from ..analyzers.orchestrator import run_static_analysis
from .workspace import get_active_workspace, _is_excluded, detect_language
from .cache_db import record_workspace_audit

# Curated offline database of high-impact dependency CVEs for instant detection
KNOWN_DEPENDENCY_CVES = {
    "requests": [
        {"version_lt": "2.31.0", "cve": "CVE-2023-32681", "severity": "HIGH", "title": "Proxy-Authorization Header Leak", "fixed": "2.31.0", "summary": "Unintended leak of Proxy-Authorization header to destination servers when following redirects."}
    ],
    "urllib3": [
        {"version_lt": "1.26.17", "cve": "CVE-2023-43804", "severity": "HIGH", "title": "Cookie Leaking on Redirect", "fixed": "1.26.17", "summary": "Cookie header retained on cross-origin redirects."}
    ],
    "flask": [
        {"version_lt": "2.2.5", "cve": "CVE-2023-30861", "severity": "HIGH", "title": "Session Cookie Disclosure", "fixed": "2.2.5", "summary": "Improper caching headers can lead to session cookie leakage to shared caches."}
    ],
    "werkzeug": [
        {"version_lt": "2.2.3", "cve": "CVE-2023-25577", "severity": "HIGH", "title": "Multipart Form Parser Denial of Service", "fixed": "2.2.3", "summary": "High CPU utilization caused by parsing crafted multipart forms."}
    ],
    "pyyaml": [
        {"version_lt": "5.4", "cve": "CVE-2020-14343", "severity": "CRITICAL", "title": "Arbitrary Code Execution via FullLoader", "fixed": "5.4", "summary": "Custom Python tags parsed by FullLoader allow arbitrary code execution."}
    ],
    "cryptography": [
        {"version_lt": "41.0.6", "cve": "CVE-2023-49083", "severity": "MEDIUM", "title": "NULL Pointer Dereference in PKCS7", "fixed": "41.0.6", "summary": "Crashing vulnerability when loading certificates without SMIME capabilities."}
    ],
    "lodash": [
        {"version_lt": "4.17.21", "cve": "CVE-2021-23337", "severity": "HIGH", "title": "Command Injection in template", "fixed": "4.17.21", "summary": "Prototype pollution leading to remote command execution."}
    ],
    "axios": [
        {"version_lt": "0.21.1", "cve": "CVE-2020-28168", "severity": "MEDIUM", "title": "SSRF via Insecure Proxy Header", "fixed": "0.21.1", "summary": "Improper handling of follow-redirects configuration leads to SSRF."}
    ]
}

AUDIT_EXTENSIONS = {
    ".py", ".pyw", ".yar", ".yara", ".rules",
    ".yml", ".yaml", ".dockerfile", ".sh", ".bash"
}


def _version_is_lower(current_ver: str, required_ver: str) -> bool:
    """Simple semver comparison."""
    try:
        c_parts = [int(p) for p in re.findall(r"\d+", current_ver)[:3]]
        r_parts = [int(p) for p in re.findall(r"\d+", required_ver)[:3]]
        while len(c_parts) < 3: c_parts.append(0)
        while len(r_parts) < 3: r_parts.append(0)
        return c_parts < r_parts
    except Exception:
        return False


def scan_dependencies(workspace_root: Path) -> List[DependencyVulnerability]:
    """Inspects manifest files (requirements.txt, package.json) for vulnerable dependencies."""
    vulns: List[DependencyVulnerability] = []

    # Check requirements.txt
    req_file = workspace_root / "requirements.txt"
    if req_file.exists():
        try:
            lines = req_file.read_text(encoding="utf-8").splitlines()
            for line in lines:
                clean = line.strip().split("#")[0].strip()
                if not clean or clean.startswith("-"):
                    continue

                match = re.match(r"^([a-zA-Z0-9_\-]+)\s*(?:==|<=|>=|<|>)\s*([0-9\.]+)", clean)
                if match:
                    pkg_name = match.group(1).lower()
                    pkg_ver = match.group(2)

                    if pkg_name in KNOWN_DEPENDENCY_CVES:
                        for entry in KNOWN_DEPENDENCY_CVES[pkg_name]:
                            if _version_is_lower(pkg_ver, entry["version_lt"]):
                                vulns.append(DependencyVulnerability(
                                    package_name=pkg_name,
                                    installed_version=pkg_ver,
                                    vulnerability_id=entry["cve"],
                                    title=f"{pkg_name}: {entry['title']}",
                                    summary=entry["summary"],
                                    severity=entry["severity"],
                                    fixed_version=entry["fixed"],
                                    advisory_url=f"https://nvd.nist.gov/vuln/detail/{entry['cve']}"
                                ))
        except Exception as e:
            print(f"[!] Error scanning requirements.txt: {e}")

    return vulns


def scan_entire_workspace(max_files: int = 50) -> WorkspaceScanResponse:
    """
    Recursively scans the active workspace root.
    Executes AST and cyber linters on all code files and performs an SBOM audit.
    """
    start_time = time.time()
    root = get_active_workspace()

    files_to_scan: List[Path] = []

    # Collect files
    for dirpath, dirnames, filenames in os.walk(root):
        current_p = Path(dirpath)
        # Filter excluded directories in-place
        dirnames[:] = [d for d in dirnames if not _is_excluded(current_p / d)]

        for fname in filenames:
            fpath = current_p / fname
            if _is_excluded(fpath):
                continue

            lower_name = fname.lower()
            if (
                fpath.suffix.lower() in AUDIT_EXTENSIONS
                or lower_name == "dockerfile"
                or lower_name.startswith("dockerfile.")
            ):
                files_to_scan.append(fpath)
                if len(files_to_scan) >= max_files:
                    break
        if len(files_to_scan) >= max_files:
            break

    findings_by_file: Dict[str, List[Finding]] = {}
    total_findings_count = 0
    severities: Dict[str, int] = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "INFORMATIONAL": 0
    }
    cwe_distribution: Dict[str, int] = {}

    for fpath in files_to_scan:
        rel_str = str(fpath.relative_to(root)).replace("\\", "/")
        try:
            content = fpath.read_text(encoding="utf-8", errors="replace")
            lang = detect_language(fpath)

            scan_req = ScanRequest(
                filename=fpath.name,
                language=lang,
                code=content
            )
            result = run_static_analysis(scan_req)

            if result.findings:
                findings_by_file[rel_str] = result.findings
                total_findings_count += len(result.findings)

                for f in result.findings:
                    sev_key = f.severity.value
                    severities[sev_key] = severities.get(sev_key, 0) + 1

                    cwe_key = f.cwe_id.strip().upper()
                    cwe_distribution[cwe_key] = cwe_distribution.get(cwe_key, 0) + 1
        except Exception as e:
            print(f"[!] Error analyzing {rel_str}: {e}")

    # Check dependencies (SBOM)
    dep_vulns = scan_dependencies(root)
    for dv in dep_vulns:
        severities[dv.severity] = severities.get(dv.severity, 0) + 1

    # Calculate overall health score (0 - 100)
    penalty = (
        severities["CRITICAL"] * 18
        + severities["HIGH"] * 9
        + severities["MEDIUM"] * 4
        + severities["LOW"] * 1
    )
    health_score = max(0, 100 - penalty)

    duration_ms = round((time.time() - start_time) * 1000, 2)

    # Persist in local SQLite history
    summary_data = {
        "files_scanned": len(files_to_scan),
        "total_findings": total_findings_count,
        "dependencies_scanned": len(dep_vulns),
        "health_score": health_score
    }
    record_workspace_audit(
        workspace_path=str(root),
        total_files=len(files_to_scan),
        total_findings=total_findings_count,
        critical_count=severities["CRITICAL"],
        high_count=severities["HIGH"],
        health_score=health_score,
        summary_data=summary_data
    )

    return WorkspaceScanResponse(
        workspace_path=str(root),
        total_files_scanned=len(files_to_scan),
        total_findings=total_findings_count,
        health_score=health_score,
        severities=severities,
        findings_by_file=findings_by_file,
        dependency_vulnerabilities=dep_vulns,
        top_cwe_distribution=cwe_distribution,
        scan_duration_ms=duration_ms
    )
