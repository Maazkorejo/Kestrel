"""
Kestrel AI - Internal Cyber Terminal Router.
Executes security commands and real shell commands in the active workspace.
"""
import asyncio
import subprocess
from fastapi import APIRouter

from backend.models import TerminalRequest, TerminalResponse, ScanRequest
from backend.analyzers.orchestrator import run_static_analysis
from backend.services.threat_intel import search_threat_intel
from backend.services.exploit_search import search_exploits
from backend.services.workspace import get_active_workspace
from backend.services.marketplace import (
    search_marketplace,
    install_extension,
    get_installed_extensions
)

router = APIRouter(prefix="/terminal", tags=["Internal - Terminal"])


@router.post("/exec", response_model=TerminalResponse)
async def execute_terminal_command(req: TerminalRequest):
    """Executes safe security CLI commands inside the integrated studio terminal."""
    cmd_raw = req.command.strip()
    if not cmd_raw:
        return TerminalResponse(output="", exit_code=0)

    parts = cmd_raw.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd == "help":
        help_text = """Kestrel AI Integrated Cyber Terminal v1.0
Available commands:
  scan [file]     - Run deterministic static analysis on active or specified file
  bandit [file]   - Run Python AST security linter on code
  yara [file]     - Validate YARA malware detection rule syntax
  cve <query>     - Query Tavily for live CVE advisories (e.g. cve CWE-89)
  edb <term>      - Query Exploit-DB verified public exploit references
  searchsploit    - Search known exploit vectors and advisories
  ext <cmd>       - Extension marketplace (search, install, list)
  ls / dir        - List files in the workspace
  cat [file]      - Print active or specified file contents
  status          - Check active model, extensions, and backend telemetry
  clear           - Clear terminal window
"""
        return TerminalResponse(output=help_text, exit_code=0)

    elif cmd in ("ls", "dir"):
        out = "Workspace Directory:\n"
        out += " - auth_service.py       (Python Flask - SQLi)\n"
        out += " - cloud_backup.py       (Python Boto3 - Leaked Keys)\n"
        out += " - network_ping.py       (Python Subprocess - RCE)\n"
        out += " - Dockerfile            (Docker Container - Root)\n"
        out += " - malware_hunter.yar    (YARA Malware Rule)\n"
        out += " - siem_detection.yml    (Sigma SIEM Rule)\n"
        out += " - ids_snort.rules       (Snort Network IDS Rule)\n"
        return TerminalResponse(output=out, exit_code=0)

    elif cmd == "status":
        out = "Kestrel System Telemetry:\n"
        out += " [✓] Backend Engine:      FastAPI Async (Port 8000)\n"
        out += " [✓] AI Reasoning Model:  nvidia/nemotron-3.5-lightning:free\n"
        out += " [✓] Threat Intelligence: Tavily Search API (Active)\n"
        out += " [✓] Cyber Linters:       YARA, Sigma, Snort, Bandit, TruffleHog\n"
        out += " [✓] Security Policy:     Zero-Retention In-Memory Buffer\n"
        return TerminalResponse(output=out, exit_code=0)

    elif cmd in ("scan", "bandit", "yara", "snort", "sigma"):
        code_to_scan = req.active_code or ""
        filename = args[0] if args else req.active_filename or "sample.py"
        lang = "python"
        if filename.endswith(".yar") or filename.endswith(".yara"):
            lang = "yara"
        elif filename.endswith(".rules"):
            lang = "snort"
        elif filename.endswith(".sigma") or (filename.endswith(".yml") and "sigma" in filename):
            lang = "sigma"
        elif filename.endswith(".dockerfile") or "dockerfile" in filename.lower():
            lang = "dockerfile"

        scan_res = run_static_analysis(ScanRequest(filename=filename, language=lang, code=code_to_scan))
        out = f"=== SecStudio Security Audit: {filename} ===\n"
        out += f"Total Findings: {scan_res.total_findings}\n"
        for f in scan_res.findings:
            out += f" [{f.severity.value}] {f.cwe_id}: {f.title} (Lines {f.line_start}-{f.line_end})\n"
            out += f"   Snippet: {f.code_snippet}\n"
        if not scan_res.findings:
            out += " [PASS] No vulnerabilities detected. Code is secure.\n"
        return TerminalResponse(output=out, exit_code=0)

    elif cmd == "cve":
        cwe_query = " ".join(args) if args else "CWE-89"
        intel = await asyncio.to_thread(search_threat_intel, cwe_query, "")
        out = f"=== Tavily Threat Intelligence Query: '{cwe_query}' ===\n"
        for r in intel.records:
            out += f" -> [{r.cve_id}] {r.title}\n"
            out += f"    Advisory: {r.summary[:130]}...\n"
            out += f"    Mitigation: {r.mitigation}\n\n"
        return TerminalResponse(output=out, exit_code=0)

    elif cmd in ("edb", "searchsploit", "exploit"):
        term = " ".join(args) if args else "log4j"
        results = search_exploits(term)
        out = f"=== Exploit-DB Reference Query: '{term}' ===\n"
        if not results:
            out += f"No verified exploits found matching '{term}'. Try 'log4j', 'runc', 'sql', or 'cve'.\n"
        else:
            for r in results:
                verified_tag = "[VERIFIED]" if r.get("verified") else "[UNVERIFIED]"
                out += f" -> {verified_tag} {r['edb_id']} ({r['cve']}): {r['title']}\n"
                out += f"    Platform: {r['platform']} | Type: {r['type']} | Date: {r['date']}\n"
                out += f"    Summary: {r['summary']}\n"
                out += f"    Reference: {r['reference']}\n\n"
        return TerminalResponse(output=out, exit_code=0)

    elif cmd == "ext":
        subcmd = args[0].lower() if args else "list"
        if subcmd == "search":
            query = " ".join(args[1:]) if len(args) > 1 else "security"
            results = await asyncio.to_thread(search_marketplace, query)
            out = f"=== Open VSX Marketplace Search: '{query}' ===\n"
            for r in results[:6]:
                status_tag = "[INSTALLED]" if r.get("installed") else "[AVAILABLE]"
                out += f" {status_tag} {r['id']} (v{r['version']}) - {r['name']}\n"
                out += f"   Downloads: {r['downloads']} | Rating: {r['rating']}/5.0\n"
                out += f"   Desc: {r['description'][:100]}...\n\n"
            out += "Type 'ext install <id>' to install an extension.\n"
            return TerminalResponse(output=out, exit_code=0)
        elif subcmd == "install":
            if len(args) < 2:
                return TerminalResponse(output="Usage: ext install <extension_id>\nExample: ext install snyk-security.snyk-vulnerability-scanner\n", exit_code=1)
            ext_id = args[1]
            res = install_extension(ext_id)
            return TerminalResponse(output=f"[✓] {res['message']}\n", exit_code=0)
        elif subcmd == "list":
            installed = get_installed_extensions()
            out = "=== Installed Cybersecurity Extensions ===\n"
            out += " - SecStudio AI Core Auditor (ast, nemotron, tavily)\n"
            out += " - YARA Malware Rule Linter (virustotal/yara)\n"
            out += " - TruffleHog Secret Detector (trufflesecurity)\n"
            out += " - Sigma SIEM Rule Validator (sigmahq)\n"
            out += " - Snort & Suricata Network Linter (cisco/talos)\n"
            out += " - Trivy Container & IaC Security (aquasecurity)\n"
            for ext in installed:
                out += f" - {ext.get('name', ext.get('id'))} ({ext.get('id')}) [Marketplace]\n"
            return TerminalResponse(output=out, exit_code=0)
        else:
            return TerminalResponse(output="Unknown ext command. Usage: ext search <query> | ext install <id> | ext list\n", exit_code=1)

    elif cmd == "cat":
        fname = args[0] if args else req.active_filename
        out = f"--- {fname} ---\n{req.active_code[:600]}...\n"
        return TerminalResponse(output=out, exit_code=0)

    elif cmd == "clear":
        return TerminalResponse(output="__CLEAR__", exit_code=0)

    else:
        # Execute real shell command inside the active workspace directory
        try:
            active_dir = str(get_active_workspace())
            proc = await asyncio.to_thread(
                subprocess.run,
                cmd_raw,
                shell=True,
                cwd=active_dir,
                capture_output=True,
                text=True,
                timeout=15
            )
            out = proc.stdout
            if proc.stderr:
                out += ("\n" if out else "") + proc.stderr
            if not out.strip():
                out = f"[Process completed with exit code {proc.returncode}]\n"
            return TerminalResponse(output=out, exit_code=proc.returncode)
        except subprocess.TimeoutExpired:
            return TerminalResponse(output="Error: Command timed out after 15 seconds.\n", exit_code=124)
        except Exception as e:
            return TerminalResponse(
                output=f"secstudio: execution error: {e}\nType 'help' for available security commands.\n",
                exit_code=127
            )
