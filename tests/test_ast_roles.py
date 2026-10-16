"""
Test AST Architectural Roles and Exploit-DB Terminal Command.
"""
import urllib.request
import json

def test_features():
    # 1. Test terminal edb command
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/terminal/exec",
        data=json.dumps({"command": "edb log4j"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print("EDB Terminal Output:")
        print(data["output"])

    # 2. Test AST static scan for architectural roles
    sample_code = """import sqlite3
def login(username, password):
    query = f"SELECT * FROM users WHERE u = '{username}'"
    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()
    cursor.execute(query)
"""
    req2 = urllib.request.Request(
        "http://127.0.0.1:8000/api/scan/static",
        data=json.dumps({"code": sample_code, "filename": "auth.py", "language": "python"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as res:
        scan_res = json.loads(res.read().decode())
        print(f"Scan findings count: {scan_res['total_findings']}")
        for f in scan_res["findings"]:
            print(f" -> [{f.get('architectural_role')}] Ln {f['line_start']}: {f['title']} (in func: {f.get('enclosing_function')})")

if __name__ == "__main__":
    test_features()
