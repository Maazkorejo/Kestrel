"""
SecStudio AI - Git and Source Control Integration Service.
Provides native Git status parsing, file staging, committing, and remote sync.
"""
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List


def run_git_cmd(args: List[str], cwd: Path) -> subprocess.CompletedProcess:
    """Executes a git command with timeout and text output capture."""
    return subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=15
    )


def get_git_status(workspace_root: Path) -> Dict[str, Any]:
    """Parses git status to return current branch, staged, unstaged, and untracked files."""
    if not shutil.which("git"):
        return {"is_repo": False, "error": "Git not installed or not in PATH."}

    proc = run_git_cmd(["status", "--porcelain=v1", "-b"], workspace_root)
    if proc.returncode != 0:
        return {"is_repo": False, "branch": "none", "error": proc.stderr.strip()}

    lines = proc.stdout.splitlines()
    branch = "main"
    staged: List[Dict[str, str]] = []
    unstaged: List[Dict[str, str]] = []
    untracked: List[Dict[str, str]] = []

    if lines and lines[0].startswith("## "):
        header = lines[0][3:].strip()
        branch = header.split("...")[0].strip()

    for line in lines[1:]:
        if len(line) < 3:
            continue
        idx_stat = line[0]
        tree_stat = line[1]
        fpath = line[3:].strip().replace('"', '')

        if idx_stat in ("M", "A", "D", "R"):
            staged.append({"path": fpath, "file": fpath, "status": idx_stat})

        if tree_stat in ("M", "D"):
            unstaged.append({"path": fpath, "file": fpath, "status": tree_stat})
        elif idx_stat == "?" and tree_stat == "?":
            untracked.append({"path": fpath, "file": fpath, "status": "U"})

    staged_all = staged
    unstaged_all = unstaged + untracked

    return {
        "is_repo": True,
        "branch": branch,
        "staged": staged_all,
        "unstaged": unstaged_all,
        "untracked": untracked,
        "staged_files": staged_all,
        "unstaged_files": unstaged_all,
        "total_changes": len(staged_all) + len(unstaged_all)
    }


def stage_file(file_path: str, workspace_root: Path) -> Dict[str, Any]:
    """Stages specific file or all modified files."""
    args = ["add", file_path] if file_path else ["add", "-A"]
    res = run_git_cmd(args, workspace_root)
    return {"success": res.returncode == 0, "output": res.stdout or res.stderr}


def unstage_file(file_path: str, workspace_root: Path) -> Dict[str, Any]:
    """Removes a file from the Git index staging area."""
    res = run_git_cmd(["reset", "HEAD", "--", file_path], workspace_root)
    return {"success": res.returncode == 0, "output": res.stdout or res.stderr}


def commit_changes(message: str, workspace_root: Path) -> Dict[str, Any]:
    """Creates a commit with the specified message."""
    if not message.strip():
        return {"success": False, "error": "Commit message cannot be empty."}
    res = run_git_cmd(["commit", "-m", message], workspace_root)
    return {"success": res.returncode == 0, "output": res.stdout or res.stderr}


def push_changes(workspace_root: Path) -> Dict[str, Any]:
    """Pushes local commits to the upstream repository."""
    res = run_git_cmd(["push"], workspace_root)
    return {"success": res.returncode == 0, "output": res.stdout or res.stderr}


def pull_changes(workspace_root: Path) -> Dict[str, Any]:
    """Pulls latest commits from the upstream repository."""
    res = run_git_cmd(["pull"], workspace_root)
    return {"success": res.returncode == 0, "output": res.stdout or res.stderr}
