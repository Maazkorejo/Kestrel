"""
SecStudio AI - Workspace & File System Persistence Service.
Manages disk-backed project workspaces, recursive directory tree discovery,
safe file reading and writing with directory traversal protections.
"""
import os
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from ..models import FileNode, WorkspaceTreeResponse

# Default to the project directory
_DEFAULT_WORKSPACE = Path(__file__).resolve().parent.parent.parent
_current_workspace: Path = _DEFAULT_WORKSPACE

# Directories and files to exclude from tree navigation
EXCLUDED_NAMES = {
    ".git", "node_modules", "venv", ".venv", "__pycache__",
    ".pytest_cache", ".idea", ".vscode", "dist", "build",
    ".env", ".DS_Store", "Thumbs.db"
}

# File extensions mapped to Monaco Editor language identifiers
EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".pyw": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".yar": "yara",
    ".yara": "yara",
    ".rules": "snort",
    ".dockerfile": "dockerfile",
    "dockerfile": "dockerfile",
    ".md": "markdown",
    ".html": "html",
    ".css": "css",
    ".sh": "shell",
    ".bash": "shell",
    ".bat": "bat",
    ".ps1": "powershell",
    ".sql": "sql",
    ".txt": "plaintext",
}


def get_active_workspace() -> Path:
    """Returns the currently active workspace root directory."""
    global _current_workspace
    return _current_workspace


def set_active_workspace(folder_path: str) -> Path:
    """Validates and sets the active workspace directory."""
    global _current_workspace
    target = Path(folder_path).resolve()
    if not target.exists():
        raise FileNotFoundError(f"Directory does not exist: {folder_path}")
    if not target.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {folder_path}")
    _current_workspace = target
    return _current_workspace


def detect_language(path: Path) -> str:
    """Determines the Monaco editor language identifier from file extension."""
    lower_name = path.name.lower()
    if lower_name == "dockerfile" or lower_name.startswith("dockerfile."):
        return "dockerfile"
    suffix = path.suffix.lower()
    return EXTENSION_LANGUAGE_MAP.get(suffix, "plaintext")


def _is_excluded(path: Path) -> bool:
    """Checks if a directory or file should be excluded from the IDE explorer."""
    if path.name in EXCLUDED_NAMES:
        return True
    if path.name.startswith(".") and path.name not in {".gitignore", ".env.example", ".dockerignore"}:
        return True
    if path.suffix in {".pyc", ".pyo", ".pyd"}:
        return True
    return False


def build_tree(current_dir: Path, workspace_root: Path, current_depth: int = 0, max_depth: int = 4) -> List[FileNode]:
    """Recursively builds the FileNode hierarchy for the active workspace."""
    if current_depth > max_depth or not current_dir.exists():
        return []

    nodes: List[FileNode] = []
    try:
        entries = sorted(list(current_dir.iterdir()), key=lambda p: (not p.is_dir(), p.name.lower()))
    except (PermissionError, OSError):
        return []

    for entry in entries:
        if _is_excluded(entry):
            continue

        rel_path = str(entry.relative_to(workspace_root)).replace("\\", "/")

        if entry.is_dir():
            child_nodes = build_tree(entry, workspace_root, current_depth + 1, max_depth)
            nodes.append(FileNode(
                name=entry.name,
                path=rel_path,
                is_dir=True,
                children=child_nodes
            ))
        else:
            try:
                size = entry.stat().st_size
            except OSError:
                size = 0

            nodes.append(FileNode(
                name=entry.name,
                path=rel_path,
                is_dir=False,
                size=size,
                extension=entry.suffix.lower()
            ))

    return nodes


def get_workspace_tree(max_depth: int = 4) -> WorkspaceTreeResponse:
    """Returns the complete workspace file tree."""
    root = get_active_workspace()
    tree = build_tree(root, root, current_depth=0, max_depth=max_depth)
    return WorkspaceTreeResponse(
        root_path=str(root),
        root_name=root.name,
        tree=tree
    )


def safe_resolve_path(rel_path: str) -> Path:
    """
    Resolves a path against the active workspace root or existing absolute file.
    Protects against directory traversal attacks.
    """
    p = Path(rel_path)
    if p.is_absolute() and p.exists() and p.is_file():
        return p.resolve()

    root = get_active_workspace().resolve()
    # Normalize path
    clean_rel = rel_path.lstrip("/\\")
    resolved = (root / clean_rel).resolve()

    # Guard against escaping workspace root
    try:
        resolved.relative_to(root)
    except ValueError:
        raise PermissionError(f"Access denied: Path '{rel_path}' is outside active workspace root.")

    return resolved


def read_workspace_file(rel_path: str) -> Tuple[str, int, str]:
    """
    Reads a file from the active workspace.
    Returns (content, byte_size, language).
    """
    target = safe_resolve_path(rel_path)
    if not target.exists():
        raise FileNotFoundError(f"File not found: {rel_path}")
    if target.is_dir():
        raise IsADirectoryError(f"Path is a directory, not a file: {rel_path}")

    size = target.stat().st_size
    if size > 2 * 1024 * 1024:  # 2MB limit for editor viewing
        raise ValueError(f"File is too large to open in editor ({size // 1024} KB > 2048 KB limit)")

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise IOError(f"Could not read file: {e}")

    lang = detect_language(target)
    return content, size, lang


def write_workspace_file(rel_path: str, content: str) -> int:
    """
    Writes content to a file in the active workspace.
    Returns bytes written.
    """
    target = safe_resolve_path(rel_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    encoded = content.encode("utf-8")
    target.write_bytes(encoded)
    return len(encoded)


def create_workspace_node(rel_path: str, is_dir: bool = False, content: str = "") -> bool:
    """Creates a new file or directory in the workspace."""
    target = safe_resolve_path(rel_path)
    if target.exists():
        return False

    if is_dir:
        target.mkdir(parents=True, exist_ok=True)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return True
