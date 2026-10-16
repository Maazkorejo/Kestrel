"""
SecStudio AI - Project-Wide Find & Replace Service.
Searches files on disk supporting regex, whole-word matching, and global replace.
"""
import os
import re
from pathlib import Path
from typing import Dict, List, Any

from .workspace import _is_excluded

TEXT_EXTENSIONS = {
    ".py", ".pyw", ".js", ".jsx", ".ts", ".tsx", ".json", ".md",
    ".yml", ".yaml", ".yar", ".yara", ".rules", ".html", ".css",
    ".txt", ".sh", ".bash", ".bat", ".ps1", ".sql", ".dockerfile", "dockerfile"
}


def search_workspace(
    workspace_root: Path,
    query: str,
    is_regex: bool = False,
    match_case: bool = False,
    match_whole_word: bool = False,
    max_matches: int = 200
) -> Dict[str, Any]:
    """Searches text files across the workspace for query matches."""
    if not query:
        return {"total_matches": 0, "file_count": 0, "results": {}}

    # Prepare regex pattern
    flags = 0 if match_case else re.IGNORECASE
    pattern_str = query
    if not is_regex:
        pattern_str = re.escape(query)
    if match_whole_word:
        pattern_str = r"\b" + pattern_str + r"\b"

    try:
        compiled_pattern = re.compile(pattern_str, flags)
    except re.error as e:
        return {"error": f"Invalid regex pattern: {e}", "total_matches": 0, "file_count": 0, "results": {}}

    results: Dict[str, List[Dict[str, Any]]] = {}
    total_matches = 0

    for dirpath, dirnames, filenames in os.walk(workspace_root):
        current_p = Path(dirpath)
        dirnames[:] = [d for d in dirnames if not _is_excluded(current_p / d)]

        for fname in filenames:
            fpath = current_p / fname
            if _is_excluded(fpath):
                continue

            suffix = fpath.suffix.lower()
            if suffix not in TEXT_EXTENSIONS and fname.lower() != "dockerfile":
                continue

            rel_str = str(fpath.relative_to(workspace_root)).replace("\\", "/")

            try:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
                lines = content.splitlines()
                file_matches = []

                for idx, line in enumerate(lines):
                    for match in compiled_pattern.finditer(line):
                        file_matches.append({
                            "line": idx + 1,
                            "line_text": line[:200],
                            "match": match.group(0),
                            "start": match.start(),
                            "end": match.end()
                        })
                        total_matches += 1
                        if total_matches >= max_matches:
                            break
                    if total_matches >= max_matches:
                        break

                if file_matches:
                    results[rel_str] = file_matches

            except Exception:
                continue

            if total_matches >= max_matches:
                break
        if total_matches >= max_matches:
            break

    results_list = [
        {
            "file": fpath,
            "matches": [
                {
                    "line_number": m["line"],
                    "line_content": m["line_text"],
                    "match_start": m["start"],
                    "match_end": m["end"],
                    **m
                }
                for m in mlist
            ]
        }
        for fpath, mlist in results.items()
    ]

    return {
        "query": query,
        "total_matches": total_matches,
        "file_count": len(results),
        "files_searched": len(results),
        "results": results_list,
        "results_dict": results
    }


def replace_in_workspace(
    workspace_root: Path,
    query: str,
    replacement: str,
    is_regex: bool = False,
    match_case: bool = False,
    match_whole_word: bool = False
) -> Dict[str, Any]:
    """Replaces all query occurrences across workspace files and saves to disk."""
    if not query:
        return {"files_modified": 0, "total_replacements": 0, "modified_files": []}

    flags = 0 if match_case else re.IGNORECASE
    pattern_str = query if is_regex else re.escape(query)
    if match_whole_word:
        pattern_str = r"\b" + pattern_str + r"\b"

    try:
        compiled_pattern = re.compile(pattern_str, flags)
    except re.error as e:
        return {"error": f"Invalid regex pattern: {e}", "files_modified": 0, "total_replacements": 0, "modified_files": []}

    files_modified = 0
    total_replacements = 0
    modified_files: List[str] = []

    for dirpath, dirnames, filenames in os.walk(workspace_root):
        current_p = Path(dirpath)
        dirnames[:] = [d for d in dirnames if not _is_excluded(current_p / d)]

        for fname in filenames:
            fpath = current_p / fname
            if _is_excluded(fpath):
                continue

            suffix = fpath.suffix.lower()
            if suffix not in TEXT_EXTENSIONS and fname.lower() != "dockerfile":
                continue

            rel_str = str(fpath.relative_to(workspace_root)).replace("\\", "/")

            try:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
                new_content, count = compiled_pattern.subn(replacement, content)
                if count > 0:
                    fpath.write_text(new_content, encoding="utf-8")
                    files_modified += 1
                    total_replacements += count
                    modified_files.append(rel_str)
            except Exception:
                continue

    return {
        "query": query,
        "replacement": replacement,
        "files_modified": files_modified,
        "total_replacements": total_replacements,
        "modified_files": modified_files
    }
