"""
Kestrel AI - Headless DevSecOps CLI Runner.
Enables command-line security auditing for GitHub Actions, GitLab CI, pre-commit hooks,
and local developer workflows with OASIS SARIF export and fail-on-severity exit codes.
"""
import sys
import os
import argparse
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.services.workspace import set_active_workspace
from backend.services.batch_scanner import scan_entire_workspace
from backend.services.sarif_exporter import export_to_sarif


def main():
    parser = argparse.ArgumentParser(
        prog="kestrel",
        description="Kestrel AI - Deterministic Cybersecurity & DevSecOps Audit Engine"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # Scan command
    scan_parser = subparsers.add_parser("scan", help="Scan a directory or project workspace")
    scan_parser.add_argument("path", nargs="?", default=".", help="Path to project directory or file (default: .)")
    scan_parser.add_argument("--fail-on", choices=["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEVER"], default="HIGH",
                             help="Exit with code 1 if vulnerabilities of this severity or higher are found (default: HIGH)")
    scan_parser.add_argument("--sarif", help="Path to write standard SARIF 2.1.0 output file (e.g., results.sarif)")
    scan_parser.add_argument("--json", help="Path to write raw JSON report")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "scan":
        target_path = Path(args.path).resolve()
        if not target_path.exists():
            print(f"[!] Error: Target path '{args.path}' does not exist.", file=sys.stderr)
            sys.exit(2)

        if target_path.is_file():
            set_active_workspace(str(target_path.parent))
        else:
            set_active_workspace(str(target_path))

        print("=" * 65)
        print("Kestrel AI - DevSecOps Whole-Repository Security Audit")
        print("=" * 65)
        print(f"Target:    {target_path}")
        print(f"Policy:    Fail on {args.fail_on}")
        print("Status:    Auditing AST, linters, and dependency manifests...\n")

        scan_result = scan_entire_workspace()

        print(f"Audit Summary:")
        print(f" - Scanned Files:         {scan_result.total_files_scanned}")
        print(f" - Security Health Score: {scan_result.health_score} / 100")
        print(f" - Total Findings:        {scan_result.total_findings}")
        print(f" - Critical:              {scan_result.severities.get('CRITICAL', 0)}")
        print(f" - High:                  {scan_result.severities.get('HIGH', 0)}")
        print(f" - Medium:                {scan_result.severities.get('MEDIUM', 0)}")
        print(f" - Low:                   {scan_result.severities.get('LOW', 0)}")
        print(f" - Duration:              {scan_result.scan_duration_ms} ms\n")

        if scan_result.dependency_vulnerabilities:
            print("Supply-Chain / Dependency Vulnerabilities:")
            for dv in scan_result.dependency_vulnerabilities:
                print(f" [!] {dv.package_name} ({dv.installed_version}) -> {dv.vulnerability_id}: {dv.title}")
            print()

        if scan_result.findings_by_file:
            print("Code Flaws by File:")
            for rel_file, f_list in scan_result.findings_by_file.items():
                print(f" [{rel_file}]")
                for f in f_list:
                    print(f"   Line {f.line_start}: [{f.severity.value}] {f.cwe_id} - {f.title}")
            print()
        else:
            print("[PASS] No static code vulnerabilities detected in scanned files.")

        # Write SARIF if requested
        if args.sarif:
            all_findings = []
            for f_list in scan_result.findings_by_file.values():
                all_findings.extend(f_list)
            sarif_data = export_to_sarif(all_findings, workspace_root=str(target_path))
            Path(args.sarif).write_text(json.dumps(sarif_data, indent=2), encoding="utf-8")
            print(f"[OK] Wrote SARIF report to: {args.sarif}")

        # Write JSON if requested
        if args.json:
            Path(args.json).write_text(json.dumps(scan_result.model_dump(), indent=2), encoding="utf-8")
            print(f"[✓] Wrote JSON report to: {args.json}")

        # Check exit code criteria
        fail_thresholds = {
            "CRITICAL": ["CRITICAL"],
            "HIGH": ["CRITICAL", "HIGH"],
            "MEDIUM": ["CRITICAL", "HIGH", "MEDIUM"],
            "LOW": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
            "NEVER": []
        }

        active_threshold = fail_thresholds.get(args.fail_on, ["CRITICAL", "HIGH"])
        violating_count = sum(scan_result.severities.get(lvl, 0) for lvl in active_threshold)

        if violating_count > 0:
            print(f"\n[FAIL] Security audit failed: {violating_count} issues found at or above {args.fail_on} threshold.")
            sys.exit(1)
        else:
            print("\n[SUCCESS] Security audit passed all threshold checks.")
            sys.exit(0)


if __name__ == "__main__":
    main()
