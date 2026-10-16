# UI & UX Design Specification

## Project: Kestrel AI (AI-Native Cybersecurity IDE)
**Tagline:** Hunt flaws. Ship armor.

---

## 1. Visual Theme & Design Philosophy

Kestrel AI adopts a precision dark cyber aesthetic inspired by modern developer IDEs (VS Code, Cursor) and mission-critical SOC dashboards.

* **Primary Philosophy:** Clean, high-density, professional, and zero-distraction. The layout prioritizes code readability, instant diagnostic clarity, and zero-delay patch verification.
* **Color Palette:**
  * Background Canvas: Dark Zinc / Obsidian (`#09090b` to `#121214`)
  * Editor Surface: VS Code Dark+ / Monaco Canvas (`#1e1e1e`)
  * Borders & Dividers: Muted Slate (`#27272a`)
  * Primary Accent: Cyber Emerald & Electric Cyan (`#10b981` / `#06b6d4`)
  * Severity Critical / High: Crimson Red (`#ef4444`)
  * Severity Medium: Warning Amber (`#f59e0b`)
  * Severity Low / Informational: Sky Blue (`#38bdf8`)
* **Typography:**
  * UI Text: Inter or System Sans-Serif (`font-sans`)
  * Code & Editor: JetBrains Mono or Fira Code (`font-mono`)

---

## 2. Core Layout Structure (Three-Panel Studio)

```
+---------------------------------------------------------------------------------------------------------+
| TOP BAR: [Logo: Kestrel AI] | Workspace / Folder Picker | [Run Audit] [Exploit Sandbox] [User Profile] |
+-----------------------+---------------------------------------+-----------------------------------------+
| LEFT PANEL            | CENTER PANEL                          | RIGHT PANEL                             |
|                       |                                       |                                         |
| Explorer & Presets    | Monaco Code Editor                    | [Findings] [Remediation] [Sandbox]      |
|                       |                                       | [Threat Model] [CI/CD Pipeline]         |
| > Workspace Folder    | 1 | from flask import Flask, request  |                                         |
|   - app.py            | 2 |                                   | [Critical] CWE-89: SQL Injection        |
|   - db_query.py       | 3 | @app.route('/login')              | Line 14 | Score: 9.8 CVSS               |
|   - Dockerfile        | 4 | def login():                      | Tavily Live Intel: CVE-2023-XXXX        |
|   - api_keys.env      | 5 |   q = f"SELECT * FROM users"      |                                         |
|                       |   |   ~~~~~~~~~~~~~~~~~~~~~~~         | [Proposed AI Diff Patch]                |
| Presets:              |   |   (Red AST squiggly marker)       | - unsafe query string                   |
| - SQLi Benchmark      |                                       | + parameterized db cursor               |
| - Leaked Secret       |                                       | [Apply Patch to Disk] [Export]          |
| - Docker Root Check   |                                       | [Run Sandbox Exploit Verification]      |
+-----------------------+---------------------------------------+-----------------------------------------+
| BOTTOM STATUS BAR: Language: Python | Findings: 1 Crit, 2 High | Docker: Ready | Model: Nemotron-3.5    |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Component Details & Interactive Behavior

### 3.1 Top Navigation Bar
* **Branding:** "Kestrel AI" with a neon falcon/shield emblem and live version indicator.
* **Workspace & File Selector:** Native folder opening with desktop path navigation (Desktop, Downloads, custom drives) and direct file loading.
* **Action Buttons:**
  * **"Run Security Audit":** Triggers simultaneous AST scanning, Nemotron 3.5 deep reasoning, and Tavily threat intelligence fetching. Shows active spinner and progress metrics.
  * **"Exploit Sandbox":** Spins up an ephemeral Docker container to simulate proof-of-concept attacks safely.
  * **"Generate CI/CD":** Exports automated GitHub Actions / GitLab CI workflows.
* **Authentication & Profile:** Production-grade modal supporting Google OAuth, GitHub OAuth, and email/password sign-in with persistent local sessions.

### 3.2 Left Panel: Workspace Explorer & Presets
* **Filesystem Explorer:** Real-time tree view of opened project workspaces. Supports file selection, dynamic reload on external changes, and clear file state indicators.
* **Vulnerability Presets:** Quick-start scenarios for rapid evaluation:
  * Scenario A: SQL Injection & Unsanitized DB Queries (`app.py`).
  * Scenario B: Hardcoded JWT Secret & Leaked Cloud Credentials (`api_keys.env`).
  * Scenario C: Remote Code Execution via `os.system` / Unvalidated Input (`cmd_exec.py`).
  * Scenario D: Insecure Dockerfile running as Root with Outdated Packages (`Dockerfile`).

### 3.3 Center Panel: Monaco Code Editor
* Integrated `@monaco-editor/react` with full syntax highlighting for Python, JavaScript, TypeScript, Dockerfile, YAML, and SQL.
* **Diagnostic Markers:** Exact AST line pinpointing with red squiggly underlines. Hover tooltips display CWE title, severity rating, and recommended defensive rule.
* **Minimap & Line Numbers:** Smooth scrolling, code folding, and standard IDE ergonomics.
* **Real-time Synchronized Updates:** Applying an AI patch updates the in-memory editor buffer and immediately persists changes to the target file on disk.

### 3.4 Right Panel: Multi-Tab Intelligence & Defense Center

#### Tab 1: Findings & Live Threat Intelligence
* **Findings Accordion:** Expandable diagnostic cards featuring:
  * Severity Tag (Critical, High, Medium, Low).
  * Vulnerability Title and CWE identification (e.g. `CWE-89: Improper Neutralization of Special Elements used in an SQL Command`).
  * Exact Line Numbers and code snippet preview.
* **Live Threat Intelligence Feed:**
  * Real-time CVE advisories and mitigation bulletins fetched dynamically via Tavily API.
  * Publication dates, official CVSS scores, and direct hyperlinks to NVD or vendor bulletins.

#### Tab 2: AI Remediation & Diff Viewer
* **Root Cause Explanation:** Plain-English breakdown generated by NVIDIA Nemotron explaining the exploit mechanism and defensive architecture.
* **Interactive Diff Viewer:** Side-by-side or unified red/green diff view showing exact lines removed and secure replacements inserted.
* **Action Buttons:**
  * **"Apply Patch to Disk":** Writes changes directly to disk and updates Monaco editor in real time.
  * **"Copy Diff":** Copies unified Git diff format to clipboard.
  * **"Download Secure File":** Exports the remediated source file.

#### Tab 3: Docker Exploit Sandbox
* **Interactive Execution Console:** Spawns an isolated container sandbox to execute simulated proof-of-concept exploits.
* **Pre-Patch vs Post-Patch Verification:** Confirms vulnerability exploitability before remediation and validates that the patch neutralizes the exploit without breaking functionality.

#### Tab 4: Threat Model & Attack Tree
* **STRIDE Classification:** Automatic categorization across Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.
* **Mermaid Graph Visualization:** Visual attack tree mapping attack surfaces to vulnerable code blocks.

#### Tab 5: CI/CD Pipeline Generator
* **Automated Workflow Synthesis:** Generates ready-to-commit `.github/workflows/kestrel-guard.yml` or `.gitlab-ci.yml` configs.
* **Zero-Regression Checks:** Enforces AST linting and security gate thresholds on pull requests.

### 3.5 Bottom Status Bar
* Displays active workspace path, file encoding (UTF-8), detected language, finding counts sorted by severity, Docker daemon status, and active AI model identifier (`nvidia/nemotron-3.5-lightning:free`).
