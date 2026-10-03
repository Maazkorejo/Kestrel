# Hackathon Pitch & Video Demonstration Script

## Project: SecStudio AI (AI-Native Cybersecurity IDE)
* **Target Video Length:** Exactly 3 minutes (180 seconds)
* **Competition:** Nebius x NVIDIA Global AI Hackathon

---

## 1. Hackathon Rubric Alignment Checklist

Before recording the demonstration video, verify that these four competition criteria are explicitly demonstrated:

1. **NVIDIA Technology Usage:**
   * Clearly state and show on screen that the AI reasoning and code remediation engine is powered by NVIDIA Nemotron (`nvidia/nemotron-3.5-lightning`).
2. **Real-Time Web Search Integration (Tavily):**
   * Demonstrate live CVE grounding where Tavily searches current vulnerability databases to fetch official security advisories in real time.
3. **Technical Innovation & Engineering Depth:**
   * Explain the zero-hallucination architecture: deterministic static analysis (Bandit, AST, regex) detects the exact line and CWE, Tavily fetches live ground truth, and Nemotron reasons through the fix.
4. **Usability & Developer Impact:**
   * Show the developer opening a file, viewing red diagnostic squiggles in Monaco Editor, reviewing the CVE risk, and applying the secure git diff patch with one click.

---

## 2. Second-by-Second Video Recording Script

### Scene 1: The Hook & The Problem (0:00 - 0:35)
* **Screen Visual:** Split screen showing a developer with 5 browser tabs open (StackOverflow, NVD database, VS Code terminal, and ChatGPT), looking overwhelmed.
* **Speaker Voiceover:**
  "Every developer uses an IDE like VS Code to write code, but when it comes to securing that code, the workflow completely breaks down. Developers have to run cryptic CLI scanners, manually search CVE databases across browser tabs, and copy-paste code into generic AI chatbots that frequently hallucinate fake vulnerabilities. 
  Meet SecStudio AI: the first AI-native cybersecurity IDE that brings deterministic security auditing, real-time threat intelligence, and verified automated patching into a single unified workspace."

### Scene 2: The Studio & Instant Scan (0:35 - 1:15)
* **Screen Visual:** Transition to SecStudio AI UI in dark mode. The presenter selects the "SQL Injection Authentication" sample. The Monaco Editor displays the vulnerable Flask code. The presenter clicks "Run Security Audit".
* **Speaker Voiceover:**
  "Here is our studio. In the center, we have the Monaco Editor, the same engine that powers VS Code. Let us load a Flask authentication service containing an unsanitized SQL query. 
  When we click 'Run Security Audit', our backend immediately runs deterministic AST scanners. Notice how line 23 instantly gets flagged with a native red diagnostic marker. There is zero AI hallucination here. Our deterministic engine found the exact CWE-89 flaw with zero false positives."

### Scene 3: Live Threat Grounding with Tavily (1:15 - 1:45)
* **Screen Visual:** The presenter clicks on the flagged finding in the right-hand panel. The card expands to reveal live threat intelligence retrieved via Tavily.
* **Speaker Voiceover:**
  "Next, look at the right inspector panel. SecStudio AI did not just highlight the error. It automatically invoked Tavily Search to query the National Vulnerability Database in real time. 
  Right here on screen, we see the official advisory, real-world attack vectors, and current CVSS severity score pulled live from authoritative sources."

### Scene 4: AI Reasoning & One-Click Patch with Nemotron (1:45 - 2:30)
* **Screen Visual:** The presenter switches to the "Remediation & Diff" tab. Nemotron generates the root-cause analysis and renders a side-by-side git diff showing the unsafe query replaced by a parameterized SQL query. The presenter clicks "Apply Patch". The Monaco Editor updates in real time, and the red marker disappears.
* **Speaker Voiceover:**
  "Now comes the true power of NVIDIA Nemotron. Powered by the open-source Nemotron 3.5 model, our reasoning engine synthesizes the deterministic AST finding with the live Tavily threat intelligence. 
  Nemotron breaks down the exact attack path and generates a production-ready unified git diff. It does not just suggest advice, it writes the exact secure code using parameterized SQL queries. 
  With a single click on 'Apply Patch', the code updates inside the Monaco Editor, and our security audit passes green."

### Scene 5: Scalability, Impact & Conclusion (2:30 - 3:00)
* **Screen Visual:** Quick graphic showing the async architecture (FastAPI, Redis task queue, edge-cached frontend), followed by the GitHub repository and project links.
* **Speaker Voiceover:**
  "SecStudio AI is built for scale with an asynchronous job queue, SHA-256 code caching, and a Bring-Your-Own-Key model that allows developers to audit their code safely and cost-effectively. 
  By uniting deterministic security tooling, real-time Tavily search, and NVIDIA Nemotron reasoning, SecStudio AI makes secure coding as natural as writing code itself. Thank you."

---

## 3. Recording Tips for High Polish

* Set screen resolution to 1920x1080 at 100 percent scaling.
* Use a high-quality microphone with noise suppression enabled.
* Rehearse the button clicks twice to match the voiceover timing smoothly without pauses or mouse wandering.
* Zoom in slightly (110 percent) in the browser so code and diff text remain crisp on mobile screens.
