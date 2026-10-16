"""
Pydantic Data Models and API Schemas for Kestrel AI.
Strictly adheres to docs/api_spec.md.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"


class Finding(BaseModel):
    id: str = Field(..., description="Unique finding identifier")
    rule_id: str = Field(..., description="Identifier of the scanner rule that fired")
    title: str = Field(..., description="Short descriptive title of the vulnerability")
    description: str = Field(..., description="Detailed description of the security issue")
    cwe_id: str = Field(..., description="Common Weakness Enumeration ID (e.g. CWE-89)")
    severity: SeverityLevel = Field(..., description="Severity level")
    line_start: int = Field(..., description="1-indexed starting line number in source code")
    line_end: int = Field(..., description="1-indexed ending line number in source code")
    code_snippet: str = Field(..., description="The offending snippet of code")
    scanner: str = Field(..., description="Scanner name (e.g. bandit, secrets, ast)")
    architectural_role: Optional[str] = Field("SINK", description="AST architectural role: SINK, VALIDATION_GAP, SOURCE, TRIGGER_POINT")
    enclosing_function: Optional[str] = Field(None, description="Enclosing function or method name")


class ScanRequest(BaseModel):
    filename: str = Field("sample.py", description="Name of the file being scanned")
    language: str = Field("python", description="Programming language (python, dockerfile, yaml, etc.)")
    code: str = Field(..., description="Source code text to be audited")
    enabled_extensions: Optional[List[str]] = Field(None, description="List of active cybersecurity extension IDs")


class ScanResponse(BaseModel):
    code_hash: str = Field(..., description="SHA-256 checksum of the scanned code")
    total_findings: int = Field(..., description="Total count of findings detected")
    severities: Dict[str, int] = Field(default_factory=dict, description="Count per severity level")
    findings: List[Finding] = Field(default_factory=list, description="List of detected findings")


class ThreatRecord(BaseModel):
    cve_id: Optional[str] = Field(None, description="CVE identifier if applicable")
    title: str = Field(..., description="Title of the threat or security advisory")
    source_url: str = Field(..., description="Authoritative reference link (NVD, MITRE, GitHub)")
    published_date: Optional[str] = Field(None, description="Publication or advisory date")
    summary: str = Field(..., description="Executive summary of the vulnerability")
    cvss_score: Optional[float] = Field(None, description="CVSS base score if available")
    mitigation: Optional[str] = Field(None, description="Recommended defensive mitigation steps")


class ThreatIntelRequest(BaseModel):
    cwe_id: str = Field(..., description="CWE ID to query (e.g. CWE-89)")
    keyword: Optional[str] = Field("", description="Optional contextual keyword or library name")


class ThreatIntelResponse(BaseModel):
    query: str = Field(..., description="Constructed search query used for threat retrieval")
    records: List[ThreatRecord] = Field(default_factory=list, description="Authoritative threat records")


class RemediateRequest(BaseModel):
    filename: str = Field("sample.py", description="Target filename")
    language: str = Field("python", description="Target language")
    code: str = Field(..., description="Original full source code")
    finding: Finding = Field(..., description="The specific verified finding to be resolved")
    threat_intel: Optional[Dict[str, Any]] = Field(None, description="Optional threat intelligence context")


class RemediationResult(BaseModel):
    finding_id: str = Field(..., description="Associated finding ID")
    root_cause: str = Field(..., description="Plain-English explanation of why this flaw exists")
    exploit_scenario: str = Field(..., description="Realistic attack vector and impact scenario")
    patch_summary: str = Field(..., description="Summary of changes applied in the patch")
    diff: str = Field(..., description="Unified git diff representation of the patch")
    patched_full_code: str = Field(..., description="Complete source code with patch applied")


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "Kestrel AI Backend"
    model: str
    tavily_configured: bool
    openrouter_configured: bool


class TerminalRequest(BaseModel):
    command: str = Field(..., description="CLI command entered by user")
    active_filename: Optional[str] = "auth_service.py"
    active_code: Optional[str] = ""


class TerminalResponse(BaseModel):
    output: str
    exit_code: int = 0


# ==================== WORKSPACE & REAL FILE SYSTEM MODELS ====================

class FileNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: Optional[int] = None
    extension: Optional[str] = None
    children: Optional[List["FileNode"]] = None


class WorkspaceOpenRequest(BaseModel):
    folder_path: str = Field(..., description="Absolute path of the workspace directory to open")


class WorkspaceTreeResponse(BaseModel):
    root_path: str
    root_name: str
    tree: List[FileNode]


class FileReadRequest(BaseModel):
    path: str = Field(..., description="Relative path within the workspace")


class FileReadResponse(BaseModel):
    path: str
    content: str
    size: int
    language: str


class FileWriteRequest(BaseModel):
    path: str = Field(..., description="Relative path within the workspace")
    content: str = Field(..., description="File content to save to disk")


class FileWriteResponse(BaseModel):
    success: bool
    path: str
    bytes_written: int
    message: str


class FileCreateRequest(BaseModel):
    path: str
    is_dir: bool = False
    content: Optional[str] = ""


# ==================== BATCH SCAN & DEPENDENCY MODELS ====================

class DependencyVulnerability(BaseModel):
    package_name: str
    installed_version: str
    vulnerability_id: str
    title: str
    summary: str
    severity: str
    fixed_version: Optional[str] = None
    advisory_url: Optional[str] = None


class WorkspaceScanResponse(BaseModel):
    workspace_path: str
    total_files_scanned: int
    total_findings: int
    health_score: int
    severities: Dict[str, int]
    findings_by_file: Dict[str, List[Finding]]
    dependency_vulnerabilities: List[DependencyVulnerability] = Field(default_factory=list)
    top_cwe_distribution: Dict[str, int] = Field(default_factory=dict)
    scan_duration_ms: float = 0.0


class SarifExportRequest(BaseModel):
    findings: Optional[List[Finding]] = None
    workspace_path: Optional[str] = None


class AskAiRequest(BaseModel):
    question: str = Field(..., description="User question regarding the security vulnerability")
    code: Optional[str] = Field("", description="Active code snippet or file content being inspected")
    filename: Optional[str] = Field("inference.py", description="Target filename")
    finding_title: Optional[str] = Field("Command Injection", description="Vulnerability title")
    cwe_id: Optional[str] = Field("CWE-78", description="Common Weakness Enumeration ID")
    code_snippet: Optional[str] = Field("", description="Offending code snippet")
    line_number: Optional[int] = Field(None, description="Line number of the finding")


class AskAiResponse(BaseModel):
    answer: str = Field(..., description="Technical explanation or guardrail guidance")
    is_guarded: bool = Field(False, description="True if question was blocked by vulnerability scope guardrails")
    relevant_cwe: str = Field("CWE-78", description="Identified weakness category")
    suggested_fix: Optional[str] = Field(None, description="Suggested secure code replacement if applicable")


# ==================== DYNAMIC ATTACK SIMULATOR MODELS ====================

class AttackScenario(BaseModel):
    id: str = Field(..., description="Unique scenario ID")
    name: str = Field(..., description="Display name of the attack type")
    cwe: str = Field(..., description="Target CWE ID (e.g. CWE-78)")
    category: str = Field(..., description="Attack category")
    description: str = Field(..., description="Details of the attack mechanics")
    default_vector: str = Field(..., description="Default payload vector")
    alt_vectors: List[str] = Field(default_factory=list, description="Alternative test vectors")
    vulnerability_sink: str = Field(..., description="Execution sink targeted")
    indicator: str = Field(..., description="Verification indicator string")
    mitigation: Optional[str] = Field(None, description="Guidance to remediate the vulnerability")


class SimulatorRunRequest(BaseModel):
    code: str = Field(..., description="Target code to be dynamically evaluated")
    filename: Optional[str] = Field("inference.py", description="Target file name")
    scenario_id: str = Field("cwe-78-command-injection", description="Selected attack scenario ID")
    custom_vector: Optional[str] = Field(None, description="Custom developer payload input")
    function_name: Optional[str] = Field(None, description="Target function to execute")
    force_sandbox: Optional[str] = Field("auto", description="Isolation engine: 'docker', 'process', or 'auto'")


class SimulatorRunResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    cwe: str
    verdict: str = Field(..., description="'VULNERABLE' or 'DEFENDED'")
    isolated: bool = True
    isolation_engine: str
    target_function: str
    payload_injected: str
    sink_identified: Optional[str] = None
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    elapsed_ms: float = 0.0
    exploit_succeeded: bool = False
    message: str = ""
# ==================== AUTHENTICATION MODELS ====================

class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Plaintext password (minimum 6 characters)")
    name: Optional[str] = Field("", description="Full name or developer handle")
    role: Optional[str] = Field("DEVSECOPS", description="Security role")
    provider: Optional[str] = Field("credentials", description="Authentication provider (credentials, google, github)")


class LoginCredentialsRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Plaintext password")
    provider: Optional[str] = Field(None, description="Optional provider override")


class AuthResponse(BaseModel):
    status: str = "ok"
    user: Dict[str, Any]
    token: Optional[str] = None


