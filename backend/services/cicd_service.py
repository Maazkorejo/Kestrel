"""
SecStudio AI - Automated CI/CD Pipeline Generator.
Generates production GitHub Actions and GitLab CI workflows
automating static AST analysis and SARIF 2.1.0 security auditing on pull requests.
"""
import os
from pathlib import Path
from typing import Dict, Any


GITHUB_WORKFLOW_TEMPLATE = """name: Kestrel Security Audit & SARIF Scan

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  security-audit:
    name: Kestrel SAST & SARIF Analysis
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Python Environment
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install Audit Dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

      - name: Execute Kestrel AST Security Scanner
        run: |
          python tests/run_tests.py

      - name: Upload Security Findings (SARIF 2.1.0)
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: kestrel-security-audit.sarif
          category: kestrel-sast
"""

GITLAB_CI_TEMPLATE = """# Kestrel Studio GitLab CI Pipeline
stages:
  - test
  - security-audit

kestrel_sast:
  stage: security-audit
  image: python:3.11-slim
  script:
    - pip install -r requirements.txt || true
    - python tests/run_tests.py
  artifacts:
    reports:
      sast: kestrel-security-audit.sarif
    paths:
      - kestrel-security-audit.sarif
    expire_in: 1 week
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
"""


def generate_pipeline_file(workspace_root: str, ci_provider: str = "github_actions") -> Dict[str, Any]:
    """
    Writes automated CI/CD pipeline configuration into the target workspace.
    """
    provider = ci_provider.lower().strip()
    root = Path(workspace_root)

    if provider in ["github", "github_actions", "actions"]:
        target_dir = root / ".github" / "workflows"
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / "kestrel-audit.yml"
        content = GITHUB_WORKFLOW_TEMPLATE
        rel_path = ".github/workflows/kestrel-audit.yml"
    elif provider in ["gitlab", "gitlab_ci"]:
        file_path = root / ".gitlab-ci.yml"
        content = GITLAB_CI_TEMPLATE
        rel_path = ".gitlab-ci.yml"
    else:
        raise ValueError(f"Unsupported CI provider: {ci_provider}")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "status": "ok",
        "provider": provider,
        "file_path": rel_path,
        "absolute_path": str(file_path),
        "content": content
    }
