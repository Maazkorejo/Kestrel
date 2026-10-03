# UI & UX Design Specification

## Project: SecStudio AI (AI-Native Cybersecurity IDE)

---

## 1. Visual Theme & Design Philosophy

SecStudio AI adopts an aesthetic inspired by professional developer tools like Visual Studio Code and modern dark mode security dashboards.

* **Primary Philosophy:** Clean, high-density, professional, and zero-distraction. The layout prioritizes code readability and instant diagnostic clarity over decorative fluff.
* **Color Palette:**
  * Background Canvas: Dark Zinc / Neutral (`#09090b` to `#18181b`)
  * Editor Surface: VS Code Dark Theme (`#1e1e1e`)
  * Borders & Dividers: Muted Slate (`#27272a`)
  * Primary Accent & Action: Cyber Cyan / Emerald (`#10b981` / `#06b6d4`)
  * Severity Critical / High: Crimson Red (`#ef4444`)
  * Severity Medium: Warning Amber (`#f59e0b`)
  * Severity Low / Informational: Sky Blue (`#38bdf8`)
* **Typography:**
  * UI Text: Inter or System Sans-Serif (`font-sans`)
  * Code & Editor: JetBrains Mono or Fira Code (`font-mono`)

---

## 2. Core Layout Structure (Three-Panel Studio)

```
+---------------------------------------------------------------------------------------+
|  TOP NAVIGATION BAR: Project Logo | Active File Name | [Run Security Audit] | Status   |
+-------------------+-----------------------------------+-------------------------------+
| LEFT PANEL        | CENTER PANEL                      | RIGHT PANEL                   |
|                   |                                   |                               |
| Files & Presets   | Monaco Code Editor                | Tab 1: Findings & Threat Intel|
|                   |                                   | Tab 2: AI Remediation & Diff  |
| - vuln_app.py     | 1 | from flask import Flask, req  |                               |
| - db_query.py     | 2 |                               | [Critical] SQL Injection      |
| - Dockerfile      | 3 | @app.route('/login')          | Line 14: CWE-89               |
| - api_keys.env    | 4 | def login():                  | NVD Advisory: CVE-2023-XXXX   |
|                   | 5 |   q = f"SELECT * FROM users"  |                               |
| [+ Upload File]   |   |   ~~~~~~~~~~~~~~~~~~~~~~~     | [Proposed AI Diff Patch]      |
|                   |   |   (Red squiggly marker)       | - unsafe query string         |
|                   |                                   | + parameterized cursor        |
|                   |                                   | [Apply Patch] [Export File]   |
+-------------------+-----------------------------------+-------------------------------+
| BOTTOM STATUS BAR: Language: Python | Findings: 2 High, 1 Med | Model: Nemotron-3.5-Free  |
+---------------------------------------------------------------------------------------+
```

---

## 3. Component Details & Interactive Behavior

### 3.1 Top Navigation Bar
* **Branding:** "SecStudio AI" with a glowing security shield icon.
* **Scan Trigger Button:** High-contrast button ("Run Security Audit") with an active spinning state during processing.
* **Preset Selector:** Dropdown menu allowing instant loading of realistic demo scenarios:
  * Scenario A: SQL Injection and Unsanitized DB Queries.
  * Scenario B: Hardcoded JWT Secret & Leaked Cloud Credentials.
  * Scenario C: Remote Code Execution via `os.system` / Unvalidated Input.
  * Scenario D: Insecure Dockerfile running as Root with Outdated Packages.

### 3.2 Center Panel: Monaco Code Editor
* Integrated `@monaco-editor/react` with full syntax highlighting for Python, JS, Dockerfile, and YAML.
* **Diagnostic Markers:** When vulnerabilities are detected, Monaco displays native red squiggly underlines on the exact source lines. Hovering over the line displays a tooltip with the CWE ID and severity.
* **Minimap & Line Numbers:** Provides full native editor ergonomics.

### 3.3 Right Panel: Inspector & Remediation
The right inspector contains two primary tabs:

#### Tab 1: Findings & Threat Intelligence
* **Findings Accordion:** Each vulnerability is displayed as an expandable card containing:
  * Severity Tag (Critical, High, Medium, Low).
  * Vulnerability Title and CWE identification (for example: `CWE-89: Improper Neutralization of Special Elements used in an SQL Command`).
  * Source Code Snippet highlighting the offending line.
* **Live Threat Intelligence Feed:**
  * Real-time metadata retrieved via Tavily.
  * Relevant CVE identifiers, publication dates, and summary from official security advisories.
  * Direct source link to NVD or vendor bulletins.

#### Tab 2: AI Remediation & Diff Viewer
* **Root Cause Explanation:** Clear, plain-English breakdown of why the vulnerability occurs and how an attacker could leverage it.
* **Side-by-Side Diff Viewer:** Visual red and green diff highlighting removed unsafe code and newly inserted secure code.
* **Action Buttons:**
  * **"Apply Patch":** Instantly injects the fixed code into the Monaco Editor.
  * **"Copy Diff":** Copies standard git diff format to clipboard.
  * **"Download Secure File":** Saves the patched file to the user disk.

### 3.4 Bottom Status Bar
* Displays current file encoding, programming language, total findings count, and active AI model identifier (`nvidia/nemotron-3.5-lightning:free`).
