"""
Deterministic Dockerfile Security Analyzer for SecStudio AI.
Identifies root execution, unpinned base images, and dangerous configurations.
"""
from typing import List
from ..models import Finding, SeverityLevel


def scan_dockerfile(content: str, filename: str = "Dockerfile") -> List[Finding]:
    findings: List[Finding] = []
    lines = content.splitlines()

    has_user_directive = False
    from_line_num = 1

    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split(maxsplit=1)
        instruction = parts[0].upper()
        args = parts[1] if len(parts) > 1 else ""

        if instruction == "FROM":
            from_line_num = idx
            if ":latest" in args or (":" not in args and "@" not in args):
                findings.append(
                    Finding(
                        id=f"docker_{idx}_unpinned_image",
                        rule_id="docker-unpinned-base-image",
                        title="Unpinned Base Image in FROM Instruction",
                        description="Using unpinned base images or :latest tag can introduce breaking changes or vulnerabilities unexpectedly.",
                        cwe_id="CWE-1104",
                        severity=SeverityLevel.LOW,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=line,
                        scanner="dockerfile"
                    )
                )

        elif instruction == "USER":
            if args.lower() not in ("root", "0"):
                has_user_directive = True

        elif instruction == "RUN":
            if "sudo" in args:
                findings.append(
                    Finding(
                        id=f"docker_{idx}_sudo_in_run",
                        rule_id="docker-sudo-in-run",
                        title="Avoid Using sudo in Container Build",
                        description="sudo in container instructions increases attack surface and may lead to unpredictable privilege elevation.",
                        cwe_id="CWE-250",
                        severity=SeverityLevel.MEDIUM,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=line,
                        scanner="dockerfile"
                    )
                )

    if not has_user_directive and len(lines) > 0:
        findings.append(
            Finding(
                id=f"docker_{from_line_num}_missing_user",
                rule_id="docker-security-running-as-root",
                title="Container Runs as Root by Default",
                description="Container does not declare a non-root USER. If compromised, an attacker gains root privileges inside the container.",
                cwe_id="CWE-250",
                severity=SeverityLevel.MEDIUM,
                line_start=from_line_num,
                line_end=len(lines),
                code_snippet=lines[from_line_num - 1].strip() if from_line_num <= len(lines) else "FROM ...",
                scanner="dockerfile"
            )
        )

    return findings
