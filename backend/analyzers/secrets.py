"""
Deterministic Secret and Credential Scanner for SecStudio AI.
Identifies leaked API keys, tokens, and hardcoded passwords with line numbers.
Provides automatic secret masking for LLM privacy compliance.
"""
import re
from typing import List, Tuple
from ..models import Finding, SeverityLevel


SECRET_PATTERNS: List[Tuple[str, str, str, SeverityLevel, re.Pattern]] = [
    (
        "secret-aws-access-key",
        "Hardcoded AWS Access Key ID",
        "An active AWS Access Key ID was detected in plaintext. Hardcoded credentials risk account takeover.",
        "CWE-798",
        SeverityLevel.CRITICAL,
        re.compile(r"(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])|AKIA[0-9A-Z]{16}")
    ),
    (
        "secret-api-key-generic",
        "Hardcoded Service API Key",
        "An API key or authorization token was found hardcoded in source code.",
        "CWE-798",
        SeverityLevel.CRITICAL,
        re.compile(r"(sk-[a-zA-Z0-9_-]{20,}|key-[a-zA-Z0-9]{24,})")
    ),
    (
        "secret-jwt-token",
        "Hardcoded JSON Web Token (JWT)",
        "A JSON Web Token was identified in source code, potentially exposing administrative claims.",
        "CWE-798",
        SeverityLevel.HIGH,
        re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}")
    ),
    (
        "secret-db-connection-string",
        "Hardcoded Database Connection URI with Credentials",
        "Database URI containing embedded credentials was detected.",
        "CWE-798",
        SeverityLevel.CRITICAL,
        re.compile(r"(?:postgres|postgresql|mysql|mongodb|redis):\/\/[a-zA-Z0-9_\-\.]+:[^@\s]+@[a-zA-Z0-9_\-\.]+")
    ),
    (
        "secret-hardcoded-assignment",
        "Hardcoded Credential Assignment",
        "Direct assignment of sensitive variable with static literal string.",
        "CWE-798",
        SeverityLevel.HIGH,
        re.compile(r"(?:api_key|secret_key|private_key|auth_token|client_secret)\s*=\s*['\"][a-zA-Z0-9_\-\.]{8,}['\"]", re.IGNORECASE)
    ),
]


def scan_secrets(code: str, filename: str = "sample.py") -> List[Finding]:
    """Scans code line-by-line using deterministic high-entropy regex patterns."""
    findings: List[Finding] = []
    lines = code.splitlines()

    for rule_id, title, desc, cwe, severity, pattern in SECRET_PATTERNS:
        for idx, line in enumerate(lines, start=1):
            # Skip comments that might be documentation
            stripped = line.strip()
            if stripped.startswith("#") and "example" in stripped.lower():
                continue

            match = pattern.search(line)
            if match:
                snippet = line.strip()
                finding_id = f"sec_{idx}_{rule_id}"
                findings.append(
                    Finding(
                        id=finding_id,
                        rule_id=rule_id,
                        title=title,
                        description=desc,
                        cwe_id=cwe,
                        severity=severity,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=snippet,
                        scanner="secrets_regex"
                    )
                )

    return findings


def redact_secrets(code: str) -> str:
    """Masks discovered credentials with placeholder tokens prior to external LLM calls."""
    redacted = code
    for _, _, _, _, _, pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED_CREDENTIAL]", redacted)
    return redacted
