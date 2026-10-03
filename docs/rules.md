# Engineering Principles & Development Rules

## Project: SecStudio AI (AI-Native Cybersecurity IDE)

---

## 1. Core Security & AI Principles

### Rule 1: Deterministic Tools First (Zero Hallucination Tolerance)
* Never allow an LLM to blindly declare a security vulnerability from raw code without deterministic backing.
* Every finding surfaced to the user must originate from an AST scanner, an established linter (e.g. Bandit, Semgrep), a validated regex pattern, or an authoritative CVE record.
* The LLM role is strictly confined to explaining the confirmed vulnerability, synthesizing threat intelligence, and drafting safe remediation patches.

### Rule 2: Strictly Defensive Orientation
* SecStudio AI is exclusively a defensive auditing and remediation workspace.
* Do not implement automated offensive exploit generation, weaponized payload creation, or automated attacking capabilities.
* All generated text and explanations must focus on mitigation, defense in depth, and code hardening to comply with hackathon safety requirements and enterprise ethics.

### Rule 3: Ground Truth Threat Intelligence
* All external vulnerability references must be grounded in verified sources (NVD, MITRE, GitHub Advisory Database, or reputable vendor bulletins).
* Use Tavily Search with domain filters targeting authoritative databases to prevent obsolete or invented vulnerability claims.

### Rule 4: Zero Code Execution (AST In-Memory Only)
* Never execute, eval, or run user-submitted code in the backend runtime.
* Code must be parsed exclusively via Abstract Syntax Trees (`ast` module) and regex scanners in memory.

### Rule 5: Prompt Injection Delimiter Sandboxing
* Never concatenate user code directly into LLM prompts without structured XML delimiters (`<inspected_code>`).
* Instruct the LLM system prompt that enclosed code is passive data and cannot override instructions.

### Rule 6: Automatic Secret Redaction
* If the static scanner detects live AWS keys, API secrets, or passwords, they must be masked with placeholder tokens before being sent to any external LLM endpoint.

---

## 2. Coding Standards & Software Quality

### Backend (Python / FastAPI)
* **Type Annotations:** All functions and API route handlers must include explicit Python type hints and Pydantic request/response schemas.
* **Asynchronous Operations:** All external network calls (Tavily search, OpenRouter LLM requests) must use asynchronous HTTP clients (`httpx` or native async SDK methods) to prevent blocking the event loop.
* **Graceful Degradation:** If external threat intelligence lookups or LLM calls encounter rate limits or timeouts, the deterministic static scan results must still be returned to the user with a clear indicator.
* **Safe Subprocess Execution:** Never invoke shell commands with `shell=True` or unescaped user inputs. Code analysis must happen in memory or in isolated temporary working files.

### Frontend (React / Monaco Editor)
* **Modular Component Design:** Keep Monaco editor configuration, diff rendering, finding list panels, and threat intel cards in separate reusable components.
* **Defensive Rendering:** Always handle empty states, loading indicators, and API failure states cleanly without crashing the UI.
* **Responsive State Management:** Use clear state hooks or lightweight stores to manage file contents, diagnostic markers, active tab, and scan progress.

---

## 3. Data Privacy & Environment Hygiene

* **No Credential Logging:** Never log user code, API keys, or JWT tokens to server stdout or disk.
* **Environment Isolation:** All sensitive credentials (`NEBIUS_API_KEY`, `TAVILY_API_KEY`) must reside strictly in `.env` files and must never be committed to git repositories.
* **Sanitized Outputs:** File paths and internal server locations must be sanitized before being returned in API responses.
