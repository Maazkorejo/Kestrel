# Product Requirements Document (PRD)

## Project Name: Kestrel AI (AI-Native Cybersecurity IDE & DevSecOps Engine)
**Tagline:** Hunt flaws. Ship armor.

---

## 1. Executive Summary
Kestrel AI is an AI-native cybersecurity IDE combining deterministic vulnerability analysis, real-time threat intelligence grounding, and automated defensive patch synthesis into an integrated desktop and web workspace.

Rather than forcing developers and security teams to switch between command line tools, vulnerability databases, browser tabs, and generic chat windows, Kestrel provides an integrated studio where code is scanned by AST analyzers, verified against live CVE databases, explained with root-cause analysis, and remediated with one-click patches.

---

## 2. Problem Statement
Security tools in today's software engineering ecosystem suffer from severe fragmentation:
* **Tool Sprawl:** Developers write code in IDEs, run security linters in detached terminal CLI sessions, search CVE advisories manually across the web, and paste vulnerable snippets into generic LLM chats.
* **Context Loss:** When switching between different tools, developers lose context regarding line numbers, dependency trees, and project environment settings.
* **Hallucination Risk:** Generic conversational AI models frequently hallucinate non-existent vulnerabilities or miss subtle security flaws when analyzing raw code without deterministic tooling.
* **Remediation Friction:** Traditional static analysis tools tell developers what is broken, but they do not write safe, context-aware patches that can be reviewed and applied immediately.

---

## 3. Product Vision & Goals
* **Unified Developer Experience:** A VS Code-inspired environment powered by Monaco Editor with syntax highlighting, inline diagnostic markers, file exploration, debounced auto-save, and keyboard shortcuts.
* **Ground Truth Security:** Deterministic static analysis tools (AST parsers, YARA rules, Sigma SIEM validators, Snort IDS linters) identify exact vulnerabilities first, eliminating hallucinated findings.
* **Live Threat Grounding:** Direct integration with Tavily Search to retrieve real-time CVE advisories, CVSS scores, and official vendor security bulletins.
* **Actionable Remediation:** NVIDIA Nemotron reasoning models generate verified explanation narratives and clean unified diff patches that users can apply with a single click.
* **Dynamic Verification:** Isolated Docker containers and subprocess sandboxes allow developers to execute simulated exploit payloads against vulnerable code and verify mitigation efficacy.
* **DevSecOps Integration:** Automated generation of GitHub Actions and GitLab CI workflows with OASIS SARIF 2.1.0 exports for native GitHub Code Scanning.

---

## 4. Target Audience
* **Software Developers:** Engineers who need to audit their code and configurations before deploying to production.
* **DevSecOps Engineers:** Teams looking for automated security scanning with instant patch suggestions and CI/CD workflow generation.
* **Security Auditors & Researchers:** Practitioners learning vulnerability analysis through an interactive, visual IDE.
* **Enterprise Security Teams:** Organizations requiring a zero-retention privacy model where code is audited in volatile memory.

---

## 5. Core Feature Specifications

### 5.1 Interactive Code Editor
* Powered by Monaco Editor with syntax highlighting and theme customization.
* Support for Python, JavaScript/TypeScript, Dockerfile, YAML, and cyber rule formats.
* Inline diagnostic underlines (red for critical/high severity, amber for medium, blue for informational).
* Real-time file system synchronization: debounced auto-save and `Ctrl+S` direct disk write.
* Presets selector containing real-world vulnerable samples (SQL injection, hardcoded secrets, remote code execution, vulnerable package dependencies).

### 5.2 Deterministic Static Analysis Engine
* Executes local rule-based static analysis in volatile memory (Python AST, secrets regex, Dockerfile analyzer).
* AST Architectural Role classification assigning roles (`SINK`, `SOURCE`, `VALIDATION_GAP`, `TRIGGER_POINT`) to each finding.
* High-entropy secrets scanner identifying AWS keys, JWT tokens, and connection strings with automatic redaction.
* Specialized cybersecurity rule linters for YARA rules, Sigma SIEM rules, and Snort network IDS rules.

### 5.3 Live Threat Intelligence Grounding (Tavily Search)
* When a vulnerability is identified, the backend automatically queries the National Vulnerability Database (NVD) and CVE databases via Tavily.
* Returns verified CVE IDs, published dates, affected versions, and official mitigation guidelines.
* Includes offline Exploit-DB search fallback.

### 5.4 AI Reasoning & Patch Synthesis (NVIDIA Nemotron)
* Powered by `nvidia/nemotron-3.5-lightning` via OpenRouter or local Ollama.
* Performs root cause analysis explaining how an attacker could exploit the flaw.
* Generates a precise git unified diff patch that fixes the flaw without breaking application functionality.
* **Ask AI Specialist:** In-editor conversational assistant strictly scoped to security analysis with prompt injection guardrails.

### 5.5 Dynamic Exploit Sandbox & Attack Simulator
* Disposable Docker container and quarantined subprocess sandbox execution.
* Catalog of attack simulation scenarios (command injection, SQL injection, path traversal, insecure deserialization).
* Runs exploit payloads against code to verify vulnerability exploitability and validate defensive mitigations.

### 5.6 Interactive Threat Modeling & Attack Trees
* Reconstructs architectural data flows from sources through sanitizers into sinks.
* Visualizes attack paths as interactive SVG graphs.

### 5.7 Automated DevSecOps CI/CD Generator
* Generates automated GitHub Actions and GitLab CI workflows.
* Exports scan findings to OASIS SARIF 2.1.0 for GitHub Code Scanning integration.

### 5.8 Authentication Gateway & Account Manager
* OAuth 2.0 authorization flows for Google and GitHub with CSRF state protection.
* PBKDF2 password hashing and verification for local credential login.
* Offline Guest Mode and device-local multi-account switching.

### 5.9 Headless CLI Runner & Desktop Application
* Headless CLI runner (`kestrel_cli.py`) for automated CI/CD pipeline gating (`--fail-on HIGH`, `--sarif`, `--json`).
* Packaged Electron desktop app with standalone compiled backend (`kestrel-core.exe`) and NSIS installer (`Kestrel Setup 1.0.0.exe`).
