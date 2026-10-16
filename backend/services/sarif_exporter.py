"""
SecStudio AI - SARIF 2.1.0 Exporter.
Converts AST findings and vulnerability reports into the OASIS SARIF standard
for native GitHub Code Scanning, GitLab SAST, and CI/CD integration.
"""
from typing import List, Dict, Any, Optional
from pathlib import Path

from ..models import Finding, SeverityLevel

SEVERITY_TO_SARIF_LEVEL = {
    "CRITICAL": "error",
    "HIGH": "error",
    "MEDIUM": "warning",
    "LOW": "note",
    "INFORMATIONAL": "note"
}


def export_to_sarif(findings: List[Finding], workspace_root: Optional[str] = None, default_filename: str = "workspace.py") -> Dict[str, Any]:
    """Generates an OASIS SARIF 2.1.0 JSON payload from findings."""
    rules_map: Dict[str, Dict[str, Any]] = {}
    results: List[Dict[str, Any]] = []

    for f in findings:
        # Register rule definition
        if f.rule_id not in rules_map:
            rules_map[f.rule_id] = {
                "id": f.rule_id,
                "name": f.title,
                "shortDescription": {"text": f.title},
                "fullDescription": {"text": f.description},
                "defaultConfiguration": {
                    "level": SEVERITY_TO_SARIF_LEVEL.get(f.severity.value, "warning")
                },
                "properties": {
                    "tags": ["security", f.cwe_id, f.scanner, f.architectural_role or "SINK"],
                    "cwe": [f.cwe_id]
                }
            }

        # Format result location
        uri = default_filename
        results.append({
            "ruleId": f.rule_id,
            "level": SEVERITY_TO_SARIF_LEVEL.get(f.severity.value, "warning"),
            "message": {
                "text": f"[{f.cwe_id}] {f.title}: {f.description}"
            },
            "locations": [
                {
                    "physicalLocation": {
                        "artifactLocation": {
                            "uri": uri,
                            "uriBaseId": "%SRCROOT%"
                        },
                        "region": {
                            "startLine": max(1, f.line_start),
                            "endLine": max(f.line_start, f.line_end),
                            "snippet": {
                                "text": f.code_snippet
                            }
                        }
                    }
                }
            ]
        })

    sarif_doc = {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "Kestrel AI Engine",
                        "organization": "Kestrel",
                        "semanticVersion": "1.0.0",
                        "informationUri": "https://github.com/Maazkorejo/Hackatgon-project",
                        "rules": list(rules_map.values())
                    }
                },
                "results": results
            }
        ]
    }

    return sarif_doc
