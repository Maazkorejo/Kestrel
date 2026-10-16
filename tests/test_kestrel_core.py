"""
Comprehensive Test Suite for SecStudio AI.
Validates AST analyzers, cybersecurity linters (YARA, Sigma, Snort),
secrets scanner, terminal sandbox, threat intel, and FastAPI endpoints.
"""
import os
import time
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import ScanRequest, RemediateRequest, Finding, SeverityLevel
from backend.analyzers.python_ast import scan_python_ast
from backend.analyzers.secrets import scan_secrets, redact_secrets
from backend.analyzers.docker_analyzer import scan_dockerfile
from backend.analyzers.cyber_rules import scan_yara_rule, scan_sigma_rule, scan_snort_rule
from backend.analyzers.orchestrator import run_static_analysis
from backend.services.threat_intel import search_threat_intel
from backend.services.ai_remediation import generate_remediation

client = TestClient(app)


# 1. Health & Configuration Tests
def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] in ["Kestrel AI Backend", "SecStudio AI Backend"]
    assert "model" in data


# 2. Python AST Security Analyzer Tests
def test_python_sqli_detection():
    vulnerable_sql = """
import sqlite3
def get_user(name):
    query = f"SELECT * FROM users WHERE name = '{name}'"
    conn = sqlite3.connect('db.sqlite')
    conn.execute(query)
"""
    findings = scan_python_ast(vulnerable_sql, "auth.py")
    assert len(findings) >= 1
    assert any(f.cwe_id == "CWE-89" for f in findings)


def test_python_command_injection_detection():
    vulnerable_cmd = """
import subprocess
def ping(host):
    subprocess.run(f"ping {host}", shell=True)
"""
    findings = scan_python_ast(vulnerable_cmd, "ping.py")
    assert len(findings) >= 1
    assert any(f.cwe_id == "CWE-78" for f in findings)


# 3. Secret Detection & Redaction Tests
def test_secrets_detection_and_redaction():
    code_with_secrets = """
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
"""
    findings = scan_secrets(code_with_secrets, "config.py")
    assert len(findings) >= 1
    assert any(f.cwe_id == "CWE-798" for f in findings)

    redacted = redact_secrets(code_with_secrets)
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
    assert "[REDACTED_CREDENTIAL]" in redacted


# 4. Dockerfile Security Analyzer Tests
def test_dockerfile_root_user():
    docker_code = """
FROM python:3.9-slim
WORKDIR /app
COPY . .
CMD ["python", "app.py"]
"""
    findings = scan_dockerfile(docker_code, "Dockerfile")
    assert len(findings) >= 1
    assert any(f.cwe_id == "CWE-250" for f in findings)


# 5. YARA Rule Security Analyzer Tests
def test_yara_short_string_and_missing_condition():
    yara_code = """
rule TestRansomware {
    strings:
        $short = "key"
    condition:
        all of them
}
"""
    findings = scan_yara_rule(yara_code, "rule.yar")
    assert len(findings) >= 1
    assert any(f.rule_id == "yara-fp-short-string" for f in findings)


# 6. Sigma SIEM Rule Analyzer Tests
def test_sigma_rule_validation():
    sigma_code = """
title: Test Detection
logsource:
    category: process_creation
detection:
    selection:
        CommandLine|contains: '*'
    condition: selection
"""
    findings = scan_sigma_rule(sigma_code, "sigma.yml")
    assert len(findings) >= 1
    assert any(f.cwe_id == "CWE-20" for f in findings)


# 7. Snort IDS Rule Analyzer Tests
def test_snort_rule_missing_sid():
    snort_code = 'alert tcp any any -> any 80 (msg:"Attack attempt"; content:"malware";)'
    findings = scan_snort_rule(snort_code, "test.rules")
    assert len(findings) >= 1
    assert any(f.rule_id == "snort-missing-sid" for f in findings)


# 8. Orchestrator Multi-language Routing
def test_orchestrator_routing():
    res_py = run_static_analysis(ScanRequest(filename="test.py", language="python", code="import os\n"))
    assert res_py.code_hash is not None

    res_yar = run_static_analysis(ScanRequest(filename="test.yar", language="yara", code="rule X { condition: true }"))
    assert res_yar.code_hash is not None


# 9. Terminal Security & Sandbox Tests
def test_terminal_help_command():
    res = client.post("/api/terminal/exec", json={"command": "help"})
    assert res.status_code == 200
    assert "Kestrel AI Integrated Cyber Terminal" in res.json()["output"] or "SecStudio AI Integrated Cyber Terminal" in res.json()["output"]


def test_terminal_status_command():
    res = client.post("/api/terminal/exec", json={"command": "status"})
    assert res.status_code == 200
    assert "Kestrel System Telemetry" in res.json()["output"] or "SecStudio System Telemetry" in res.json()["output"]


def test_terminal_ls_command():
    res = client.post("/api/terminal/exec", json={"command": "ls"})
    assert res.status_code == 200
    assert "Workspace Directory" in res.json()["output"]


def test_terminal_cve_query():
    res = client.post("/api/terminal/exec", json={"command": "cve CWE-89"})
    assert res.status_code == 200
    assert "CWE-89" in res.json()["output"]


def test_terminal_unknown_command_safeguard():
    # Should safely reject and NOT execute in host OS shell
    res = client.post("/api/terminal/exec", json={"command": "rmdir /s /q testdir"})
    assert res.status_code == 200
    assert res.json()["exit_code"] == 127
    assert "command not found" in res.json()["output"]


# 10. File Size Limit Safeguard
def test_file_size_limit():
    huge_code = "a" * (501 * 1024)
    res = client.post("/api/scan/static", json={"filename": "big.py", "language": "python", "code": huge_code})
    assert res.status_code == 400
    assert "File exceeds maximum allowed size" in res.json()["detail"]


# 11. Workspace & Real Disk File System Tests
def test_workspace_tree_endpoint():
    res = client.get("/api/workspace/tree")
    assert res.status_code == 200
    data = res.json()
    assert "root_path" in data
    assert "root_name" in data
    assert isinstance(data["tree"], list)


def test_workspace_file_read_write():
    test_rel = "temp_test_secstudio.txt"
    test_content = "SecStudio AI Unit Test Content"
    
    # Write file
    w_res = client.post("/api/workspace/write", json={"path": test_rel, "content": test_content})
    assert w_res.status_code == 200
    assert w_res.json()["success"] is True

    # Read file back
    r_res = client.post("/api/workspace/read", json={"path": test_rel})
    assert r_res.status_code == 200
    assert r_res.json()["content"] == test_content

    # Clean up
    import os
    from backend.services.workspace import safe_resolve_path
    try:
        os.remove(safe_resolve_path(test_rel))
    except Exception:
        pass


def test_workspace_path_traversal_guard():
    # Attempting to read outside workspace should be blocked with 403
    res = client.post("/api/workspace/read", json={"path": "../../windows/win.ini"})
    assert res.status_code in (400, 403, 404)


# 12. Batch Whole-Repository Scan & SARIF Export Tests
def test_batch_workspace_scan():
    res = client.post("/api/scan/workspace")
    assert res.status_code == 200
    data = res.json()
    assert "total_files_scanned" in data
    assert "health_score" in data
    assert 0 <= data["health_score"] <= 100
    assert "findings_by_file" in data


def test_sarif_export():
    res = client.post("/api/export/sarif", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["version"] == "2.1.0"
    assert "runs" in data
    assert len(data["runs"]) > 0
    assert data["runs"][0]["tool"]["driver"]["name"] in ["Kestrel AI Engine", "SecStudio AI Engine"]


# 13. SQLite Cache Persistence Tests
def test_sqlite_cache_persistence():
    from backend.services.cache_db import (
        compute_ast_hash, set_cached_remediation, get_cached_remediation
    )
    test_snippet = "cursor.execute(f'SELECT {user}')"
    h = compute_ast_hash(test_snippet, "CWE-89")
    set_cached_remediation(
        ast_hash=h,
        language="python",
        finding_id="test_find_1",
        cwe_id="CWE-89",
        root_cause="Test root cause",
        patch_summary="Test patch summary",
        diff="--- a\n+++ b",
        patched_code="cursor.execute('SELECT ?', (user,))"
    )
    hit = get_cached_remediation(h)
    assert hit is not None
    assert hit["finding_id"] == "test_find_1"
    assert hit["root_cause"] == "Test root cause"


# 14. Git Source Control Endpoints
def test_git_status_endpoint():
    res = client.get("/api/git/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_repo" in data
    assert "branch" in data
    assert "staged_files" in data
    assert "unstaged_files" in data


def test_git_stage_and_unstage():
    res = client.post("/api/git/stage", json={"files": ["README.md"]})
    assert res.status_code == 200
    res2 = client.post("/api/git/unstage", json={"files": ["README.md"]})
    assert res2.status_code == 200


# 15. Global Project Search & Replace
def test_project_search_endpoint():
    res = client.post("/api/search/project", json={"query": "SecStudio", "case_sensitive": False, "whole_word": False, "regex": False})
    assert res.status_code == 200
    data = res.json()
    assert "total_matches" in data
    assert "results" in data
    assert data["total_matches"] >= 0


def test_project_search_regex():
    res = client.post("/api/search/project", json={"query": "def\\s+test_\\w+", "case_sensitive": False, "whole_word": False, "regex": True})
    assert res.status_code == 200
    data = res.json()
    assert data["total_matches"] > 0


# 16. Studio Settings Configuration
def test_settings_get_and_save():
    res = client.get("/api/settings/current")
    assert res.status_code == 200
    data = res.json()
    assert "model" in data
    assert "offline_mode" in data

    save_res = client.post("/api/settings/save", json={
        "model": "nvidia/nemotron-3.5-lightning:free",
        "offline_mode": False
    })
    assert save_res.status_code == 200
    assert save_res.json()["status"] == "ok"


# 17. Real Shell Terminal Execution
def test_terminal_real_shell_execution():
    res = client.post("/api/terminal/exec", json={
        "command": "python --version",
        "active_filename": "test.py",
        "active_code": ""
    })
    assert res.status_code == 200
    data = res.json()
    assert data["exit_code"] == 0
    assert "Python" in data["output"]


# 18. OAuth Providers and CSRF State Flow
def test_oauth_providers_and_csrf_state():
    # Verify providers status endpoint
    res = client.get("/api/auth/providers")
    assert res.status_code == 200
    data = res.json()
    assert "github_enabled" in data
    assert "google_enabled" in data

    # Verify GitHub start endpoint returns valid structure
    res_gh = client.get("/api/auth/github/start")
    assert res_gh.status_code == 200
    gh_data = res_gh.json()
    assert "provider" in gh_data
    assert gh_data["provider"] == "github"

    # Verify Google start endpoint returns valid structure
    res_gg = client.get("/api/auth/google/start")
    assert res_gg.status_code == 200
    gg_data = res_gg.json()
    assert "provider" in gg_data
    assert gg_data["provider"] == "google"

    # Verify invalid state rejection on callback
    res_bad_callback = client.get("/api/auth/github/callback?code=mock_code&state=invalid_csrf_state")
    assert res_bad_callback.status_code == 403


# 18b. Cryptographic Password Hashing & PBKDF2 Verification
def test_auth_password_hashing():
    from backend.services.auth_service import hash_password, verify_password
    pwd = "SecStudio#SuperSecurePassword2026"
    h, salt = hash_password(pwd)
    assert h and salt
    assert len(salt) == 32
    assert verify_password(pwd, salt, h) is True
    assert verify_password("wrong-password", salt, h) is False


# 18c. User Registration, Credential Login, and Session Tokens
def test_auth_registration_and_login_flow():
    test_email = f"lead_{int(time.time())}@secstudio.ai"
    test_pwd = "P@ssw0rdSecure!2026"
    test_name = "Alex Security Lead"

    # Register user
    reg_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": test_pwd,
        "name": test_name,
        "role": "SECURITY_LEAD"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["status"] == "ok"
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["name"] == test_name
    assert reg_data["user"]["role"] == "SECURITY_LEAD"
    token = reg_data["token"]
    assert token

    # Attempt duplicate registration (must fail with 400)
    dup_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": test_pwd,
        "name": test_name
    })
    assert dup_res.status_code == 400

    # Login with invalid password (must fail with 401)
    bad_login = client.post("/api/auth/login-credentials", json={
        "email": test_email,
        "password": "wrong-password"
    })
    assert bad_login.status_code == 401

    # Login with correct password
    login_res = client.post("/api/auth/login-credentials", json={
        "email": test_email,
        "password": test_pwd
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["email"] == test_email
    assert login_data["token"]

    # Validate session token via /api/auth/me with Bearer header
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login_data['token']}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == test_email
    assert me_data["authenticated"] is True

    # Test guest session creation
    guest_res = client.post("/api/auth/guest")
    assert guest_res.status_code == 200
    guest_data = guest_res.json()
    assert guest_data["user"]["authenticated"] is False
    assert guest_data["user"]["provider"] == "guest"

    # Test logout endpoint
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {login_data['token']}"})
    assert logout_res.status_code == 200


# 19. Dynamic Exploit Sandbox Simulation
def test_sandbox_simulation():
    status_res = client.get("/api/sandbox/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "docker_available" in status_data
    assert "engine" in status_data

    # Simulate attack & verification
    vuln_code = 'bin_sh = 0x7ffff7f7a1b0 # CWE-120: Hardcoded libc pointer without ASLR rebase\nprint("exploit test")'
    patched_code = 'bin_sh = base_libc + 0x001b3d88 # SAFE: Dynamic ASLR displacement\nprint("patched test")'

    res = client.post("/api/sandbox/simulate", json={
        "vulnerable_code": vuln_code,
        "patched_code": patched_code,
        "filename": "buffer_overflow.py"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["defense_verified"] is True
    assert "vulnerable_run" in data
    assert "patched_run" in data
    assert "isolation_engine" in data


# 20. Interactive Attack Tree & Threat Model Graph
def test_threat_model_graph():
    code = 'import socket\ndef synthesize_rop_chain(base_libc):\n    bin_sh = 0x7ffff7f7a1b0\n    return bin_sh'
    res = client.post("/api/threat-model/graph", json={
        "code": code,
        "filename": "buffer_overflow.py"
    })
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert "threat_level" in data
    assert len(data["nodes"]) >= 3


# 21. Automated CI/CD Pipeline Generator
def test_cicd_pipeline_generator():
    res = client.post("/api/cicd/generate", json={
        "provider": "github_actions"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert ".github" in data["file_path"]
    assert "Kestrel" in data["content"] or "SentinelCode" in data["content"]


# 22. Local Offline LLM (Ollama) Settings Configuration
def test_ollama_settings_and_offline_routing():
    res = client.post("/api/settings/save", json={
        "llm_provider": "ollama",
        "ollama_url": "http://localhost:11434",
        "ollama_model": "nemotron-mini",
        "offline_mode": True
    })
    assert res.status_code == 200

# 23. Ask AI Vulnerability Specialist with Guardrails
def test_ask_ai_vulnerability_and_guardrails():
    # Valid security vulnerability query
    res = client.post("/api/ai/ask", json={
        "question": "Why is model.predict(X) vulnerable to command injection?",
        "cwe_id": "CWE-78",
        "finding_title": "Command Injection",
        "filename": "src/inference.py",
        "line_number": 48,
        "code_snippet": "predictions = model_predict(X)",
        "code": "predictions = model_predict(X)"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_guarded"] is False
    assert len(data["answer"]) > 10

    # Off-topic query blocked by guardrails
    res_guarded = client.post("/api/ai/ask", json={
        "question": "What is the secret recipe for chocolate chip cookies?",
        "cwe_id": "CWE-78",
        "finding_title": "Command Injection",
        "filename": "src/inference.py",
        "line_number": 48
    })
    assert res_guarded.status_code == 200
    data_g = res_guarded.json()
    assert data_g["is_guarded"] is True
    assert "Guardrail Notice" in data_g["answer"]


# 24. Dynamic Attack Simulator & Security Fuzzer Tests
def test_simulator_scenarios_catalog():
    res = client.get("/api/simulator/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert isinstance(scenarios, list)
    assert len(scenarios) >= 5
    ids = [s["id"] for s in scenarios]
    assert "cwe-78-command-injection" in ids
    assert "cwe-89-sql-injection" in ids
    assert "cwe-22-path-traversal" in ids


def test_simulator_command_injection_detection():
    vulnerable_code = """
import subprocess

def predict(input_data):
    val = getattr(input_data, 'text', str(input_data))
    cmd = f"echo processing: {val}"
    return subprocess.check_output(cmd, shell=True, text=True)
"""
    res = client.post("/api/simulator/run", json={
        "code": vulnerable_code,
        "filename": "inference.py",
        "scenario_id": "cwe-78-command-injection"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == "cwe-78-command-injection"
    assert data["cwe"] == "CWE-78"
    assert data["verdict"] == "VULNERABLE"
    assert data["exploit_succeeded"] is True
    assert "SECSTUDIO_CMD_EXPLOITED" in data["stdout"]


def test_simulator_defended_code_validation():
    defended_code = """
import subprocess
import re

def predict(input_data):
    val = getattr(input_data, 'text', str(input_data))
    if not re.match(r"^[a-zA-Z0-9_ -]+$", val):
        raise ValueError("Invalid characters detected in payload")
    return f"Safe output: {val}"
"""
    res = client.post("/api/simulator/run", json={
        "code": defended_code,
        "filename": "inference.py",
        "scenario_id": "cwe-78-command-injection"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == "cwe-78-command-injection"
    assert data["verdict"] == "DEFENDED"
    assert data["exploit_succeeded"] is False





