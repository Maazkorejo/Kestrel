# Security Scenarios & Demo Presets Specification

## Project: SecStudio AI (AI-Native Cybersecurity IDE)

---

## 1. Overview
This document specifies the four core vulnerability presets bundled into SecStudio AI. These scenarios serve two purposes:
1. **Automated Integration Testing:** Validating that deterministic scanners, Tavily CVE lookups, and Nemotron patch generation operate end-to-end without regressions.
2. **Hackathon Demonstration:** Providing flawless, instant presets that demonstrate the IDE capabilities during the 3-minute video presentation.

---

## 2. Scenario 1: SQL Injection in Web Authentication (OWASP Top 10 A03)

### Target File: `auth_service.py`
### Language: Python

### Vulnerable Source Code:
```python
import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    # VULNERABLE: Direct string formatting into SQL query allows authentication bypass
    query = f"SELECT id, username, role FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({"status": "success", "user": dict(user)})
    return jsonify({"status": "unauthorized"}), 401
```

### Deterministic Finding Output:
* **Rule ID:** `bandit-B608-hardcoded-sql-expressions`
* **CWE ID:** `CWE-89: Improper Neutralization of Special Elements used in an SQL Command`
* **Severity:** `HIGH` / `CRITICAL`
* **Target Line:** Line 23 (`cursor.execute(query)`)

### Tavily Threat Intel Query:
* **Query:** `"CWE-89 SQL injection sqlite python parameterization mitigation"`
* **Expected Output:** Reference to parameterized query advisories, SQL injection bypass risks, and best practices using placeholder tuples.

### Verified Secure Patch:
```python
    # SECURE: Parameterized SQL query prevents injection attacks
    query = "SELECT id, username, role FROM users WHERE username = ? AND password = ?"
    cursor.execute(query, (username, password))
```

---

## 3. Scenario 2: Hardcoded API Credentials & Secret Leakage (OWASP Top 10 A07)

### Target File: `cloud_backup.py`
### Language: Python

### Vulnerable Source Code:
```python
import boto3
import os

# VULNERABLE: Hardcoded AWS credentials exposed directly in source control
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
S3_BUCKET_NAME = "production-user-backups"

def backup_file(local_path: str, remote_key: str):
    client = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name="us-east-1"
    )
    client.upload_file(local_path, S3_BUCKET_NAME, remote_key)
    print(f"Successfully backed up {local_path} to {remote_key}")
```

### Deterministic Finding Output:
* **Rule ID:** `secret-regex-aws-access-key`
* **CWE ID:** `CWE-798: Use of Hard-coded Credentials`
* **Severity:** `CRITICAL`
* **Target Lines:** Lines 5-6 (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

### Tavily Threat Intel Query:
* **Query:** `"CWE-798 hardcoded credentials AWS secrets management environment variables"`
* **Expected Output:** AWS security advisories detailing automated GitHub scrapers scanning for leaked AKIA keys within seconds, recommending IAM roles or environment variables.

### Verified Secure Patch:
```python
# SECURE: Credentials retrieved dynamically from environment variables or IAM instance profile
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "production-user-backups")

def backup_file(local_path: str, remote_key: str):
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        raise ValueError("Missing required AWS credentials in environment variables")
    client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
```

---

## 4. Scenario 3: Remote Command Execution via Subprocess (OWASP Top 10 A03)

### Target File: `network_diagnostics.py`
### Language: Python

### Vulnerable Source Code:
```python
import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/api/ping", methods=["GET"])
def ping_host():
    host = request.args.get("host", "127.0.0.1")

    # VULNERABLE: Invoking shell=True with untrusted user input allows command chaining (e.g., "127.0.0.1; cat /etc/passwd")
    cmd = f"ping -c 3 {host}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

    return jsonify({
        "command": cmd,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exit_code": result.returncode
    })
```

### Deterministic Finding Output:
* **Rule ID:** `bandit-B602-subprocess-popen-with-shell-equals-true`
* **CWE ID:** `CWE-78: Improper Neutralization of Special Elements used in an OS Command`
* **Severity:** `CRITICAL`
* **Target Line:** Line 12 (`subprocess.run(cmd, shell=True, ...)`)

### Tavily Threat Intel Query:
* **Query:** `"CWE-78 OS command injection python subprocess shell true remediation"`
* **Expected Output:** Documentation explaining shell argument injection and the requirement to pass arguments as a list with `shell=False` and strict host validation.

### Verified Secure Patch:
```python
    import ipaddress
    import re

    # SECURE: Validate input to prevent command chaining and pass command arguments as a list
    is_valid_domain = bool(re.match(r"^[a-zA-Z0-9\.\-]+$", host)) and not host.startswith("-")
    if not is_valid_domain:
        return jsonify({"error": "Invalid host parameter"}), 400

    cmd_args = ["ping", "-c", "3", host]
    result = subprocess.run(cmd_args, shell=False, capture_output=True, text=True, timeout=10)
```

---

## 5. Scenario 4: Insecure Container Configuration

### Target File: `Dockerfile`
### Language: Dockerfile

### Vulnerable Source Code:
```dockerfile
FROM python:3.9-slim

# VULNERABLE: Container runs as default root user with no non-root user isolation
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose internal debug port
EXPOSE 5000

CMD ["python", "app.py"]
```

### Deterministic Finding Output:
* **Rule ID:** `docker-security-running-as-root`
* **CWE ID:** `CWE-250: Execution with Unnecessary Privileges`
* **Severity:** `MEDIUM`
* **Target Lines:** Entire container configuration lacking `USER` declaration.

### Tavily Threat Intel Query:
* **Query:** `"Dockerfile non root user security best practice CWE-250"`
* **Expected Output:** CIS Docker Benchmark recommendations to create and switch to an unprivileged system user before running application services.

### Verified Secure Patch:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# SECURE: Create unprivileged application user and grant limited directory permissions
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 5000
CMD ["python", "app.py"]
```
