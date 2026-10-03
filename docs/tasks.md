# Project Task Roadmap & Execution Plan

## Project: SecStudio AI (AI-Native Cybersecurity IDE)

---

## Phase 1: Foundation & Project Scaffolding
- [ ] Initialize frontend directory inside `Nvidia hackathon` using Vite + React + Tailwind CSS.
- [ ] Install essential frontend packages: `@monaco-editor/react`, `lucide-react`, and `diff`.
- [ ] Verify Python backend virtual environment and install required libraries: `fastapi`, `uvicorn`, `pydantic`, `bandit`, `tavily-python`, `httpx`.
- [ ] Configure unified project launcher script to boot both FastAPI backend and Vite frontend with one command.

---

## Phase 2: Deterministic Static Analysis Engine
- [ ] Create `backend/analyzers/` module.
- [ ] Build Python AST security scanner wrapping `bandit` to inspect Python code in memory without file system pollution.
- [ ] Build credential and secret scanner using high-entropy regex patterns (AWS keys, OpenAI/OpenRouter keys, JWT secrets, database connection strings).
- [ ] Create standardized `Finding` schema in Pydantic: `id`, `title`, `description`, `cwe_id`, `severity`, `line_start`, `line_end`, `code_snippet`.
- [ ] Expose endpoint `POST /api/scan/static` and verify response structure with unit tests.

---

## Phase 3: Live Threat Intelligence Integration (Tavily)
- [ ] Create `backend/services/threat_intel.py` wrapping the Tavily client.
- [ ] Implement smart search query generator that converts CWE IDs and library names into targeted CVE search queries.
- [ ] Filter search results to authoritative security domains (`nvd.nist.gov`, `cve.mitre.org`, `github.com/advisories`).
- [ ] Expose endpoint `POST /api/intel/cve` and verify real-time advisory fetching.

---

## Phase 4: AI Reasoning & Remediation Engine (Nemotron)
- [ ] Create `backend/services/ai_remediation.py` communicating with OpenRouter using `nvidia/nemotron-3.5-lightning:free`.
- [ ] Design a structured JSON prompt feeding the code snippet, deterministic finding, and Tavily threat records.
- [ ] Instruct Nemotron to output:
  - Technical root-cause summary.
  - Exploit mechanism explanation.
  - Clean replacement code snippet and unified git diff.
- [ ] Expose endpoint `POST /api/remediate` and test patch correctness.

---

## Phase 5: Modern Frontend & Monaco Editor Integration
- [ ] Build the three-panel layout matching the specification in `design.md`.
- [ ] Embed Monaco Editor with language switching (Python, JavaScript, Dockerfile).
- [ ] Connect the "Run Security Audit" button to the backend API.
- [ ] Map backend findings to Monaco editor markers (red squiggly underlines) and tooltips.
- [ ] Build the Findings panel displaying severity pill badges, CWE tags, and collapsible details.

---

## Phase 6: Interactive Diff & One-Click Patching
- [ ] Build the Remediation panel showing root-cause analysis and threat summaries.
- [ ] Integrate visual side-by-side or unified diff viewer highlighting additions and deletions.
- [ ] Implement "Apply Patch" button that updates Monaco Editor model state in real time.
- [ ] Implement "Reset Code" and "Export File" utilities.
- [ ] Implement Server-Sent Events (SSE) streaming endpoint `POST /api/scan/stream` and hook into React frontend for real-time progressive rendering.

---

## Phase 7: DevSecOps Webhook & Demo Package
- [ ] Build GitHub Webhook endpoint `POST /api/webhooks/github` with HMAC-SHA256 signature verification to enable automated PR scanning.
- [ ] Create 4 real-world test scenarios:
  - Sample 1: SQL Injection in Flask authentication route.
  - Sample 2: Hardcoded API credentials and JWT secret.
  - Sample 3: Remote command injection via unvalidated subprocess execution.
  - Sample 4: Insecure Dockerfile running root processes.
- [ ] Perform end-to-end rehearsal showing scan, live CVE lookup, and patch application in under 60 seconds.
- [ ] Draft compelling hackathon pitch script and record video walkthrough.
