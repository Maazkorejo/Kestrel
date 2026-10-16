"""
Deterministic Cybersecurity Rule Analyzer for SecStudio AI.
Supports:
1. YARA Rules (.yar, .yara) - Threat hunting & malware signature analysis.
2. Sigma Detection Rules (.sigma, .yml) - SIEM detection engineering.
3. Snort / Suricata Rules (.rules) - Network intrusion detection systems.
"""
import re
from typing import List
from ..models import Finding, SeverityLevel


def scan_yara_rule(code: str, filename: str = "malware_detector.yar") -> List[Finding]:
    """Inspects YARA rules for common syntax bugs, weak conditions, and performance anti-patterns."""
    findings: List[Finding] = []
    lines = code.splitlines()

    has_rule_header = False
    has_condition = False
    has_strings = False

    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("//") or line.startswith("/*"):
            continue

        # Check for rule declaration
        if re.match(r"^rule\s+[A-Za-z0-9_]+", line):
            has_rule_header = True

        if line == "strings:":
            has_strings = True
        elif line == "condition:":
            has_condition = True

        # Anti-pattern: Overly short string patterns causing high false positive rates
        str_match = re.search(r"\$[a-zA-Z0-9_]+\s*=\s*\"([^\"]+)\"", line)
        if str_match:
            pattern_val = str_match.group(1)
            if len(pattern_val) < 4:
                findings.append(
                    Finding(
                        id=f"yara_{idx}_short_pattern",
                        rule_id="yara-fp-short-string",
                        title="YARA String Pattern Too Short",
                        description=f"String pattern '{pattern_val}' is under 4 bytes and will cause massive false-positive noise during endpoint scanning.",
                        cwe_id="CWE-20",
                        severity=SeverityLevel.HIGH,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=line,
                        scanner="yara_linter"
                    )
                )

        # Anti-pattern: Dangerous unconstrained condition
        if has_condition and "all of them" in line and not has_strings:
            findings.append(
                Finding(
                    id=f"yara_{idx}_invalid_condition",
                    rule_id="yara-condition-syntax",
                    title="Invalid YARA Condition Reference",
                    description="'all of them' used without defined strings block.",
                    cwe_id="CWE-754",
                    severity=SeverityLevel.CRITICAL,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line,
                    scanner="yara_linter"
                )
            )

    if not has_rule_header and len(lines) > 0:
        findings.append(
            Finding(
                id="yara_missing_rule_header",
                rule_id="yara-missing-header",
                title="Missing YARA Rule Declaration",
                description="YARA file must define at least one 'rule <RuleName> { ... }' block.",
                cwe_id="CWE-1007",
                severity=SeverityLevel.CRITICAL,
                line_start=1,
                line_end=1,
                code_snippet=lines[0] if lines else "",
                scanner="yara_linter"
            )
        )

    if not has_condition and len(lines) > 0:
        findings.append(
            Finding(
                id="yara_missing_condition",
                rule_id="yara-missing-condition",
                title="Missing Required 'condition:' Section",
                description="Every valid YARA rule requires a boolean condition section.",
                cwe_id="CWE-1007",
                severity=SeverityLevel.CRITICAL,
                line_start=len(lines),
                line_end=len(lines),
                code_snippet=lines[-1] if lines else "",
                scanner="yara_linter"
            )
        )

    return findings


def scan_sigma_rule(code: str, filename: str = "detection.yml") -> List[Finding]:
    """Inspects Sigma Detection Rules for missing fields, broad wildcards, and weak detection logic."""
    findings: List[Finding] = []
    lines = code.splitlines()

    has_title = False
    has_detection = False
    has_condition = False
    has_logsource = False

    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("title:"):
            has_title = True
        elif line.startswith("logsource:"):
            has_logsource = True
        elif line.startswith("detection:"):
            has_detection = True
        elif line.startswith("condition:"):
            has_condition = True

        # Anti-pattern: Overly broad wildcard in SIEM detection causing alert fatigue and high CPU
        if re.search(r"\|\s*(?:contains|startswith|endswith)\s*:\s*['\"][\*\?]['\"]", line) or line.endswith(": '*'") or line.endswith(":'*'"):
            findings.append(
                Finding(
                    id=f"sigma_{idx}_broad_wildcard",
                    rule_id="sigma-broad-wildcard",
                    title="Catastrophic Wildcard In SIEM Detection",
                    description="Using a single wildcard '*' in a string match condition causes full-table scans and immense SIEM alert noise.",
                    cwe_id="CWE-20",
                    severity=SeverityLevel.HIGH,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line,
                    scanner="sigma_linter"
                )
            )

        # Anti-pattern: Empty wildcard condition or premature condition
        if line == "condition: 1 of them" and not has_detection:
            findings.append(
                Finding(
                    id=f"sigma_{idx}_weak_condition",
                    rule_id="sigma-weak-condition",
                    title="Premature Condition in Sigma Rule",
                    description="Condition declared before detection criteria.",
                    cwe_id="CWE-697",
                    severity=SeverityLevel.HIGH,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line,
                    scanner="sigma_linter"
                )
            )

    if not has_logsource and len(lines) > 0:
        findings.append(
            Finding(
                id="sigma_missing_logsource",
                rule_id="sigma-missing-logsource",
                title="Missing Required 'logsource' Field",
                description="Sigma rules require a logsource block (category, product, service) to map to SIEM event streams.",
                cwe_id="CWE-1007",
                severity=SeverityLevel.HIGH,
                line_start=1,
                line_end=1,
                code_snippet=lines[0] if lines else "",
                scanner="sigma_linter"
            )
        )

    if not has_detection and len(lines) > 0:
        findings.append(
            Finding(
                id="sigma_missing_detection",
                rule_id="sigma-missing-detection",
                title="Missing Required 'detection' Field",
                description="Sigma rules require a 'detection:' block containing selection criteria and condition.",
                cwe_id="CWE-1007",
                severity=SeverityLevel.CRITICAL,
                line_start=1,
                line_end=1,
                code_snippet=lines[0] if lines else "",
                scanner="sigma_linter"
            )
        )

    return findings


def scan_snort_rule(code: str, filename: str = "ids.rules") -> List[Finding]:
    """Inspects Snort / Suricata Network Intrusion Detection Rules."""
    findings: List[Finding] = []
    lines = code.splitlines()

    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        # Snort rule must start with an action (alert, log, pass, drop, reject)
        valid_actions = ("alert", "log", "pass", "drop", "reject", "sdrop")
        parts = line.split()
        if parts and parts[0] not in valid_actions:
            findings.append(
                Finding(
                    id=f"snort_{idx}_invalid_action",
                    rule_id="snort-invalid-action",
                    title="Invalid Snort Rule Action",
                    description=f"Rule starts with invalid action '{parts[0]}'. Must be alert, drop, log, etc.",
                    cwe_id="CWE-20",
                    severity=SeverityLevel.CRITICAL,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line,
                    scanner="snort_linter"
                )
            )

        # Check for missing sid (Snort ID)
        if "sid:" not in line:
            findings.append(
                Finding(
                    id=f"snort_{idx}_missing_sid",
                    rule_id="snort-missing-sid",
                    title="Missing Snort Rule Identifier (sid)",
                    description="Every Snort rule must have a unique sid option (e.g. sid:1000001;).",
                    cwe_id="CWE-1007",
                    severity=SeverityLevel.HIGH,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line,
                    scanner="snort_linter"
                )
            )

    return findings
