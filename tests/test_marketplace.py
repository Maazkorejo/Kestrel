"""
Test live Open VSX Marketplace API and Terminal integration.
"""
import urllib.request
import json

def test_marketplace():
    # 1. Search extensions
    url = "http://127.0.0.1:8000/api/extensions/search?q=snyk"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode())
    print(f"Marketplace query returned {len(data)} results:")
    for ext in data[:3]:
        print(" ->", ext["id"], "|", ext["name"], "| v" + ext["version"])

    # 2. Install extension
    req_data = json.dumps({"id": "snyk-security.snyk-vulnerability-scanner", "name": "Snyk Security"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/extensions/install", data=req_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        print("Install Result:", res.read().decode())

    # 3. Terminal ext list command
    req_cmd = urllib.request.Request(
        "http://127.0.0.1:8000/api/terminal/exec",
        data=json.dumps({"command": "ext list"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_cmd) as res:
        cmd_out = json.loads(res.read().decode())
    print("Terminal 'ext list' output:")
    print(cmd_out["output"])

if __name__ == "__main__":
    test_marketplace()
