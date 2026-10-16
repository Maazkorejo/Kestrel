# Project Task Roadmap & Execution Plan

## Project: Kestrel AI (AI-Native Cybersecurity IDE)
**Tagline:** Hunt flaws. Ship armor.

---

## Phase 1: Foundation & Project Scaffolding
- [x] Initialize frontend directory inside workspace using Vite + React + Tailwind CSS.
- [x] Install essential frontend packages: `@monaco-editor/react`, `lucide-react`, and `diff`.
- [x] Verify Python backend virtual environment and install required libraries: `fastapi`, `uvicorn`, `pydantic`, `bandit`, `tavily-python`, `httpx`, `docker`.
- [x] Configure unified project launcher script to boot both FastAPI backend and Vite frontend with one command.

---

## Phase 2: Deterministic Static Analysis Engine
- [x] Create `backend/analyzers/` module.
- [x] Build Python AST security scanner wrapping `bandit` to inspect Python code in memory without file system pollution.
- [x] Build credential and secret scanner using high-entropy regex patterns (AWS keys, OpenAI/OpenRouter keys, JWT secrets, database connection strings).
- [x] Create standardized `Finding` schema in Pydantic: `id`, `title`, `description`, `cwe_id`, `severity`, `line_start`, `line_end`, `code_snippet`.
- [x] Expose endpoint `POST /api/external/scan/static` and verify response structure with unit tests.

---

## Phase 3: Live Threat Intelligence Integration (Tavily)
- [x] Create `backend/services/threat_intel.py` wrapping the Tavily client.
- [x] Implement smart search query generator that converts CWE IDs and library names into targeted CVE search queries.
- [x] Filter search results to authoritative security domains (`nvd.nist.gov`, `cve.mitre.org`, `github.com/advisories`).
- [x] Expose endpoint `POST /api/external/intel/cve` and verify real-time advisory fetching.

---

## Phase 4: AI Reasoning & Remediation Engine (Nemotron)
- [x] Create `backend/services/ai_remediation.py` communicating with OpenRouter using `nvidia/nemotron-3.5-lightning:free`.
- [x] Design a structured JSON prompt feeding the code snippet, deterministic finding, and Tavily threat records.
- [x] Instruct Nemotron to output:
  - Technical root-cause summary.
  - Exploit mechanism explanation.
  - Clean replacement code snippet and unified git diff.
- [x] Expose endpoint `POST /api/external/remediate` and test patch correctness.

---

## Phase 5: Modern Frontend & Monaco Editor Integration
- [x] Build the three-panel layout matching the specification in `design.md`.
- [x] Embed Monaco Editor with language switching (Python, JavaScript, Dockerfile).
- [x] Connect the "Run Security Audit" button to the backend API.
- [x] Map backend findings to Monaco editor markers (red squiggly underlines) and tooltips.
- [x] Build the Findings panel displaying severity pill badges, CWE tags, and collapsible details.

---

## Phase 6: Interactive Diff & One-Click Patching
- [x] Build the Remediation panel showing root-cause analysis and threat summaries.
- [x] Integrate visual side-by-side or unified diff viewer highlighting additions and deletions.
- [x] Implement "Apply Patch" button that updates Monaco Editor model state and writes directly to disk.
- [x] Implement "Reset Code" and "Export File" utilities.
- [x] Implement Server-Sent Events (SSE) streaming endpoint `POST /api/external/scan/stream` for real-time progressive audit output.

---

## Phase 7: DevSecOps Webhook & Benchmark Presets
- [x] Build GitHub Webhook endpoint `POST /api/external/webhooks/github` with HMAC-SHA256 signature verification to enable automated PR scanning.
- [x] Create 4 real-world test scenarios:
  - Sample 1: SQL Injection in Flask authentication route.
  - Sample 2: Hardcoded API credentials and JWT secret.
  - Sample 3: Remote command injection via unvalidated subprocess execution.
  - Sample 4: Insecure Dockerfile running root processes.
- [x] Perform end-to-end audit testing verifying scan, live CVE lookup, and patch application.

---

## Phase 8: Desktop Packaging & Full Filesystem Navigation
- [x] Implement native filesystem navigation API (`backend/api/internal/files.py`) allowing browsing of Desktop, Downloads, and custom directories.
- [x] Provide double-click desktop app launcher (`kestrel.exe` / launch shortcut) with automated background process management.
- [x] Clean up top menu redundancies to provide a streamlined, distraction-free IDE experience.
- [x] Implement real-time file persistence ensuring patches applied in Kestrel immediately reflect in external editors (VS Code).

---

## Phase 9: Containerized Exploit Sandbox & Threat Modeling
- [x] Build isolated Docker execution sandbox (`backend/services/docker_sandbox.py`) with memory, CPU, and network limits.
- [x] Add pre-patch and post-patch exploit verification to prove exploitability and validate patch integrity.
- [x] Build automated STRIDE threat modeling engine (`backend/services/threat_model.py`) synthesizing attack trees.
- [x] Build CI/CD workflow generator (`backend/services/cicd_generator.py`) outputting automated GitHub Actions security gates.

---

## Phase 10: Production Authentication & Modular API Architecture
- [x] Re-architect backend into `backend/api/internal/` and `backend/api/external/` sub-routers.
- [x] Implement production-ready OAuth and local credentials authentication flow (Google, GitHub, email/password).
- [x] Verify session persistence and secure token storage.

---

## Phase 11: Code Audit & Documentation Suite
- [x] Comprehensive code audit removing legacy SentinelCode/SecStudio references, unused imports, and redundant files.
- [x] Full automated test suite passing (40/40 tests).
- [x] Full documentation upgrade across `docs/` and all repository markdown files to Kestrel AI branding.
