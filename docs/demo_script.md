# Hackathon Pitch & Video Demonstration Script

## Project: Kestrel AI (AI-Native Cybersecurity IDE & DevSecOps Engine)
* **Tagline:** Hunt flaws. Ship armor.
* **Target Video Length:** Exactly 3 minutes (180 seconds)
* **Competition Track:** Nebius x NVIDIA Global AI Hackathon (Coding & Agentic Engineering / Best Apps)

---

## 1. Hackathon Rubric Alignment Checklist

Verify that these four competition criteria are demonstrated during the video:

1. **NVIDIA Technology Usage:**
   - Clearly show on screen that the AI reasoning and defensive patch engine is powered by NVIDIA Nemotron (`nvidia/nemotron-3.5-lightning`).
2. **Real-Time Web Search Integration (Tavily):**
   - Demonstrate live CVE grounding where Tavily searches current vulnerability databases to fetch official security advisories in real time.
3. **Technical Innovation & Engineering Depth:**
   - Explain the zero-hallucination architecture: deterministic AST analysis detects the exact line and CWE, Tavily fetches live ground truth, and Nemotron reasons through the patch.
   - Show dynamic Docker exploit sandbox verification proving that the vulnerability was exploitable and that the patch neutralizes the attack.
4. **Usability & Developer Impact:**
   - Show the developer editing code in Monaco Editor, viewing red diagnostic markers, reviewing the CVE risk, and applying the secure git diff patch directly to disk with one click.

---

## 2. Second-by-Second Video Recording Script

### Scene 1: The Hook & The Problem (0:00 to 0:35)
* **Screen Visual:** Split screen showing a developer with multiple browser tabs open (StackOverflow, NVD database, terminal linters, generic AI chats), looking overwhelmed.
* **Speaker Voiceover:**
  "Every developer uses an IDE like VS Code to write code, but when it comes to securing that code, the workflow completely breaks down. Developers have to run disconnected CLI scanners, manually search CVE databases across browser tabs, and copy-paste code into generic AI chatbots that hallucinate fake vulnerabilities.
  Meet Kestrel AI: the first AI-native cybersecurity IDE that brings deterministic AST auditing, real-time threat intelligence, verified patch synthesis, and dynamic exploit sandboxing into a single unified workspace. Hunt flaws. Ship armor."

### Scene 2: The Studio & Instant AST Audit (0:35 to 1:15)
* **Screen Visual:** Transition to Kestrel AI desktop application in dark cyber mode. The presenter selects the SQL Injection preset. Monaco Editor displays the vulnerable Flask authentication code. The presenter triggers the security audit.
* **Speaker Voiceover:**
  "Here is Kestrel. In the center, we have the Monaco Editor, the same engine that powers VS Code. Let us open an authentication service with an unsanitized SQL query.
  When we run a security audit, our backend immediately parses the code into an Abstract Syntax Tree in volatile memory. Notice how line 23 instantly gets flagged with a native red diagnostic marker. Our deterministic engine found the exact CWE-89 flaw, classified its architectural role as a database SINK, and identified zero false positives."

### Scene 3: Live Threat Grounding with Tavily (1:15 to 1:45)
* **Screen Visual:** The presenter clicks on the finding in the right-hand Inspector panel. The card expands to reveal live threat intelligence retrieved via Tavily Search.
* **Speaker Voiceover:**
  "Next, look at the AI Inspector panel. Kestrel did not just highlight the error. It automatically invoked Tavily Search to query the National Vulnerability Database in real time.
  Right here on screen, we see the official advisory, real-world attack vectors, and current CVSS severity score pulled live from authoritative sources."

### Scene 4: AI Reasoning & One-Click Patch with Nemotron (1:45 to 2:15)
* **Screen Visual:** The presenter switches to the Remediation tab. Nemotron generates the root-cause analysis and renders a side-by-side git diff showing the unsafe query replaced by a parameterized SQL query. The presenter clicks 'Apply Patch'. The Monaco Editor updates in real time, writes the changes to disk, and the red marker disappears.
* **Speaker Voiceover:**
  "Now comes the true power of NVIDIA Nemotron. Powered by the open-source Nemotron 3.5 model, our reasoning engine synthesizes the deterministic AST finding with live Tavily threat intelligence.
  Nemotron breaks down the exact attack path and generates a production-ready unified git diff. It does not just suggest advice, it writes the exact secure code using parameterized SQL queries.
  With a single click on 'Apply Patch', the code updates inside the Monaco Editor, writes directly to disk, and our security audit passes green."

### Scene 5: Dynamic Sandbox Verification & CI/CD Pipeline (2:15 to 2:45)
* **Screen Visual:** The presenter opens the Exploit Sandbox modal, clicks 'Run Attack Simulation', and shows the command injection payload succeeding against vulnerable code, then failing safely against defended code. Then opens the CI/CD generator and generates a GitHub Actions workflow with SARIF export.
* **Speaker Voiceover:**
  "To prove the mitigation works, Kestrel features a built-in Docker Exploit Sandbox. We execute the simulated exploit payload, and we see it fail against our defended code.
  And with our CI/CD generator, developers can export standard SARIF 2.1.0 pipelines straight to GitHub Actions to block vulnerable code before it ever merges."

### Scene 6: Conclusion & Impact (2:45 to 3:00)
* **Screen Visual:** Overview of the complete architecture, test suite passing 37/37 tests, and links to the GitHub repository.
* **Speaker Voiceover:**
  "Kestrel AI is packaged as a high-performance desktop application, verified by 37 automated tests with zero data retention. By uniting deterministic AST tooling, real-time Tavily search, and NVIDIA Nemotron reasoning, Kestrel makes secure coding as natural as writing code itself. Hunt flaws. Ship armor. Thank you."
