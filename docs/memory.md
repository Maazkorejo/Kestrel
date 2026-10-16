# Project Context & Persistent Memory

## Project: Kestrel AI (AI-Native Cybersecurity IDE)
* **Tagline:** Hunt flaws. Ship armor.
* **Target:** Production AI-Native Cybersecurity Studio & Desktop IDE
* **Workspace Path:** `C:\Users\maazk\Desktop\Nvidia hackathon`
* **Repository:** `https://github.com/Maazkorejo/Kestrel.git`

---

## 1. Verified Infrastructure & Services Status

* **Model Provider:** OpenRouter API (`https://openrouter.ai/api/v1`)
* **Primary LLM:** `nvidia/nemotron-3.5-lightning:free` (Fast reasoning & code patch synthesis)
* **Advanced LLM:** `nvidia/nemotron-4-340b` (Deep threat modeling & STRIDE classification)
* **Intelligence Search:** Tavily Live Search API (Real-time CVE advisories, NVD bulletins, mitigation feeds)
* **Execution Sandbox:** Docker Engine API (Isolated containers with CPU/memory limits and network containment)
* **Test Suite:** 40/40 unit and integration tests passing (`pytest tests/`)
* **Local Python Environment:** `C:\Users\maazk\Desktop\Nvidia hackathon\venv\Scripts\python.exe`

---

## 2. Key Architecture Decisions & Constraints

* **Strict Defensive Focus:** Kestrel AI is purpose-built for defensive security auditing, root-cause explanation, real-time threat intelligence lookup, and automated remediation. Proof-of-concept exploits in the sandbox are strictly ephemeral, non-destructive, and executed inside contained throwaway Docker sandboxes.
* **Zero Hallucination Protocol:** Deterministic static analysis tools (Bandit AST, Tree-Sitter parsers, and custom regex scanners) identify vulnerabilities first. NVIDIA Nemotron is only invoked to reason about verified findings, synthesize patches, and structure threat model trees.
* **Modular API Separation:** The backend endpoints are cleanly decoupled into:
  * `backend/api/internal/`: Desktop file system access, terminal processes, and authentication.
  * `backend/api/external/`: Security auditing, Nemotron reasoning, Tavily intelligence, Docker sandbox execution, and CI/CD workflow synthesis.
* **Real-time Disk Synchronization:** When patches are applied from the Monaco UI, changes are immediately written to disk and verified against the local workspace.
* **No Em Dashes or En Dashes:** Coding standards and documentation strictly use hyphens `-` or colons/parentheses.

---

## 3. Directory Layout Blueprint

```
Nvidia hackathon/
├── docs/
│   ├── PRD.md              # Product requirements & user stories
│   ├── architecture.md     # System design & API specifications
│   ├── api_spec.md         # Full OpenAPI and REST contracts
│   ├── rules.md            # Coding standards & security rules
│   ├── design.md           # UI/UX design & Monaco editor specs
│   ├── tasks.md            # Phased task checklist
│   ├── memory.md           # Persistent context & status
│   ├── scenarios.md        # Benchmark vulnerability scenarios
│   ├── security.md         # Zero-retention & sandbox security model
│   └── demo_script.md      # 3-minute video recording walkthrough
├── backend/
│   ├── main.py             # FastAPI entrypoint
│   ├── config.py           # Settings and environment validation
│   ├── api/
│   │   ├── internal/       # Filesystem, terminal, OAuth routes
│   │   └── external/       # Audit, sandbox, threat intelligence, CI/CD routes
│   ├── analyzers/          # AST, Bandit, Regex, Dockerfile analyzers
│   ├── services/           # Tavily, Nemotron, Docker sandbox clients
│   └── models/             # Pydantic schemas and request/response models
├── frontend/               # React, Vite, Tailwind CSS, Monaco Editor
├── tests/                  # 40/40 automated test suite
├── desktop/                # Desktop launcher, icon, and packaging scripts
└── venv/                   # Python virtual environment
```

---

## 4. Current State & Milestones Completed

* **Audit & Refactor:** Legacy names (SentinelCode, SecStudio) fully replaced by Kestrel AI.
* **API Modernization:** Subfolder structure (`backend/api/internal` and `backend/api/external`) operational and imported via modular FastAPI routers.
* **Authentication:** Google OAuth, GitHub OAuth, and local credentials flow configured cleanly.
* **Verification:** Full test suite verified with 100 percent pass rate across analyzers, sandbox, threat models, and endpoints.
