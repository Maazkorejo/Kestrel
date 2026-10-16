"""
Test AI Remediation latency and response quality.
"""
import sys, os, time
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.ai_remediation import generate_remediation
from backend.models import RemediateRequest, Finding, SeverityLevel

sample_finding = Finding(
    id="test_sqli",
    rule_id="ast-sqli-fstring",
    title="SQL Injection via F-String Interpolation",
    description="Raw user input formatted directly into SQL query",
    cwe_id="CWE-89",
    severity=SeverityLevel.CRITICAL,
    line_start=15,
    line_end=15,
    code_snippet='query = f"SELECT * FROM users WHERE id = {user_id}"',
    scanner="python_ast"
)

req = RemediateRequest(
    filename="auth_service.py",
    language="python",
    code='import sqlite3\nquery = f"SELECT * FROM users WHERE id = {user_id}"\n',
    finding=sample_finding
)

t0 = time.time()
res = generate_remediation(req)
dt = time.time() - t0
print(f"Remediation completed in {dt:.2f}s")
print("Root cause:", res.root_cause[:80])
print("Has diff:", bool(res.diff))
print("Has patched full code:", bool(res.patched_full_code))
