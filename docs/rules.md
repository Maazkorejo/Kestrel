# Engineering Principles & Development Rules

## Project: Kestrel AI (AI-Native Cybersecurity IDE)
**Tagline:** Hunt flaws. Ship armor.

---

## 1. Core Security & AI Principles

### Rule 1: Deterministic Tools First (Zero Hallucination Protocol)
* Never allow an LLM to blindly declare a security vulnerability from raw code without deterministic backing.
* Every finding surfaced to the developer must originate from an AST scanner, an established linter (e.g. Bandit, Semgrep), a validated regex pattern, or an authoritative CVE record.
* The LLM role is strictly confined to explaining the confirmed vulnerability, synthesizing threat intelligence, structuring threat trees, and drafting safe remediation patches.

### Rule 2: Strictly Defensive Orientation
* Kestrel AI is exclusively a defensive auditing and remediation workspace.
* Automated offensive exploit generation, weaponized payload creation, or automated attacking capabilities are strictly prohibited.
* Exploit verification inside the sandbox is strictly proof-of-concept verification to test whether a flaw exists and whether the synthesized patch successfully neutralizes it without side effects.
* All generated text and explanations must focus on mitigation, defense in depth, and code hardening.

### Rule 3: Ground Truth Threat Intelligence
* All external vulnerability references must be grounded in verified sources (NVD, MITRE, GitHub Advisory Database, or reputable vendor bulletins).
* Use Tavily Search with domain filters targeting authoritative databases to prevent obsolete or invented vulnerability claims.

### Rule 4: Isolated Container Sandbox Containment
* Never execute untrusted user code on the host operating system.
* When running exploit verification, execute only inside an ephemeral Docker container with:
  * Strict memory limits (512MB max) and CPU constraints (1 core).
  * Read-only root filesystem where feasible.
  * Hard execution timeout (10 seconds) with automatic termination.
  * No access to the host network or sensitive environment variables.

### Rule 5: Prompt Injection Delimiter Sandboxing
* Never concatenate user code directly into LLM prompts without structured XML delimiters (`<inspected_code>`).
* Instruct the LLM system prompt that enclosed code is passive data and cannot override instructions or execute tool calls.

### Rule 6: Automatic Secret Redaction
* If the static scanner detects live AWS keys, API secrets, private keys, or passwords, they must be masked with placeholder tokens before being sent to any external LLM endpoint.

---

## 2. Coding Standards & Software Quality

### Backend (Python / FastAPI)
* **Modular Router Architecture:** Keep internal system APIs (`backend/api/internal/`) separate from external AI and security intelligence APIs (`backend/api/external/`).
* **Type Annotations:** All functions and API route handlers must include explicit Python type hints and Pydantic request/response schemas.
* **Asynchronous Operations:** All external network calls (Tavily search, OpenRouter LLM requests) must use asynchronous HTTP clients (`httpx` or native async SDK methods) to prevent blocking the event loop.
* **Graceful Degradation:** If external threat intelligence lookups or LLM calls encounter rate limits or timeouts, the deterministic static scan results must still be returned to the user with a clear indicator.
* **Safe Subprocess Execution:** Never invoke shell commands with `shell=True` or unescaped user inputs.

### Frontend (React / Monaco Editor)
* **Modular Component Design:** Keep Monaco editor configuration, diff rendering, finding list panels, threat intel cards, and sandbox panels in separate reusable components.
* **Defensive Rendering:** Always handle empty states, loading indicators, and API failure states cleanly without crashing the UI.
* **Responsive State Management:** Use clear state hooks or lightweight stores to manage file contents, diagnostic markers, active tab, and scan progress.
* **Disk Synchronization:** When applying an AI patch, write to disk via the backend API and update Monaco editor buffer simultaneously to ensure no divergence between editor and disk.

---

## 3. Data Privacy & Environment Hygiene

* **No Credential Logging:** Never log user code, API keys, or JWT tokens to server stdout or disk.
* **Environment Isolation:** All sensitive credentials (`NEBIUS_API_KEY`, `TAVILY_API_KEY`, `OPENROUTER_API_KEY`) must reside strictly in `.env` files and must never be committed to git repositories.
* **Sanitized Outputs:** File paths and internal server locations must be sanitized before being returned in API responses.
* **No Em Dashes or En Dashes:** Coding standards and markdown text strictly use hyphens `-` or colons/parentheses.
