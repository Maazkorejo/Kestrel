"""
Scan Orchestrator for SecStudio AI.
Routes code to deterministic analyzers based on language and compiles findings.
Computes SHA-256 code hash for caching.
"""
import hashlib
from typing import List, Dict
from ..models import ScanRequest, ScanResponse, Finding, SeverityLevel
from .python_ast import scan_python_ast
from .secrets import scan_secrets
from .docker_analyzer import scan_dockerfile
from .cyber_rules import scan_yara_rule, scan_sigma_rule, scan_snort_rule


SEVERITY_ORDER = {
    SeverityLevel.CRITICAL: 0,
    SeverityLevel.HIGH: 1,
    SeverityLevel.MEDIUM: 2,
    SeverityLevel.LOW: 3,
    SeverityLevel.INFORMATIONAL: 4,
}


def run_static_analysis(request: ScanRequest) -> ScanResponse:
    """Executes deterministic static analysis in memory without file system execution."""
    code_bytes = request.code.encode("utf-8")
    code_hash = hashlib.sha256(code_bytes).hexdigest()

    findings: List[Finding] = []
    lang = request.language.lower().strip()
    filename = request.filename.lower().strip()

    exts = set(request.enabled_extensions) if request.enabled_extensions is not None else None

    # 1. Universal secret and credential detection across all file types (TruffleHog extension)
    if exts is None or "ext_trufflehog" in exts:
        findings.extend(scan_secrets(request.code, request.filename))

    # 2. Language-specific AST and rule analysis
    if (lang in ("python", "py") or filename.endswith(".py")) and (exts is None or "ext_secstudio_core" in exts):
        findings.extend(scan_python_ast(request.code, request.filename))
    elif (lang in ("docker", "dockerfile") or "dockerfile" in filename) and (exts is None or "ext_trivy" in exts):
        findings.extend(scan_dockerfile(request.code, request.filename))
    elif (lang in ("yara", "yar") or filename.endswith(".yar") or filename.endswith(".yara")) and (exts is None or "ext_yara_linter" in exts):
        findings.extend(scan_yara_rule(request.code, request.filename))
    elif (lang in ("sigma",) or filename.endswith(".sigma") or (filename.endswith(".yml") and "sigma" in filename)) and (exts is None or "ext_sigma_siem" in exts):
        findings.extend(scan_sigma_rule(request.code, request.filename))
    elif (lang in ("snort", "suricata", "rules") or filename.endswith(".rules")) and (exts is None or "ext_snort_ids" in exts):
        findings.extend(scan_snort_rule(request.code, request.filename))

    # Sort findings by line number and severity
    findings.sort(key=lambda f: (SEVERITY_ORDER.get(f.severity, 5), f.line_start))

    # Tally severities
    counts: Dict[str, int] = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "INFORMATIONAL": 0
    }
    for f in findings:
        counts[f.severity.value] = counts.get(f.severity.value, 0) + 1

    return ScanResponse(
        code_hash=code_hash,
        total_findings=len(findings),
        severities=counts,
        findings=findings
    )
