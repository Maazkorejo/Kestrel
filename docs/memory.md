# Project Context & Persistent Memory

## Project: SecStudio AI (AI-Native Cybersecurity IDE)
* **Date Initialized:** October 2, 2026
* **Target Competition:** Nebius x NVIDIA Global AI Hackathon
* **Workspace Path:** `C:\Users\maazk\Desktop\Nvidia hackathon`

---

## 1. Verified Infrastructure & Credentials Status

* **Model Provider:** OpenRouter API (`https://openrouter.ai/api/v1`)
* **Active LLM Model:** `nvidia/nemotron-3.5-lightning:free`
* **Status:** Verified working with valid test response.
* **Search Engine:** Tavily Search API
* **Status:** Verified working with live web search results.
* **Python Environment:** `C:\Users\maazk\Desktop\Nvidia hackathon\venv\Scripts\python.exe`
* **Local Test Script:** `test_connection.py` confirmed 100 percent operational.

---

## 2. Key Architecture Decisions & Constraints

* **Defensive Focus:** The platform is strictly designed for defensive security auditing, vulnerability explanation, threat intelligence lookup, and automated patching. No offensive exploit generation or attacking capabilities will be built.
* **Zero Hallucination Protocol:** Deterministic static analysis tools (Bandit, AST parsers, regex scanners) identify vulnerabilities first. The LLM is only utilized for reasoning, threat synthesis, and patch generation on verified findings.
* **Ground Truth Retrieval:** Tavily is used to pull real-time CVE advisories and official security bulletins from NVD and MITRE.
* **Editor Integration:** Monaco Editor is used as the core code editing component to provide authentic VS Code ergonomics in the browser.

---

## 3. Directory Layout Blueprint

```
Nvidia hackathon/
├── docs/
│   ├── PRD.md              # Product requirements & user stories
│   ├── architecture.md     # System design & API specifications
│   ├── rules.md            # Coding standards & security rules
│   ├── design.md           # UI/UX design & Monaco editor specs
│   ├── tasks.md            # Phased task checklist
│   └── memory.md           # Persistent context & status
├── backend/
│   ├── main.py             # FastAPI entrypoint
│   ├── analyzers/          # Deterministic static analysis engines
│   └── services/           # Tavily and Nemotron clients
├── frontend/               # Vite + React + Monaco Editor
├── venv/                   # Python virtual environment
├── .env                    # Secure local API keys
└── test_connection.py      # Connection test script
```

---

## 4. Current State & Next Steps

* **Current Status:** Documentation suite complete and aligned with hackathon criteria.
* **Immediate Next Action:** Initialize `backend/` and `frontend/` directories following `tasks.md` Phase 1.
