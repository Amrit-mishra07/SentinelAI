"""Exact, single-file patch application without running repository code."""

import ast
import hashlib
import re
from pathlib import Path, PurePosixPath


def safe_file_path(file_path: str) -> str:
    """Accept only a normalized repository-relative source path."""
    path = PurePosixPath(file_path)
    if (not file_path or "\\" in file_path or "\x00" in file_path
            or path.is_absolute() or any(part in {"..", ".git"} for part in path.parts)
            or str(path) != file_path or file_path.startswith("-")):
        raise ValueError("Patch path must be a normalized repository-relative file")
    return str(path)


def source_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def apply_unified_diff(source: str, diff: str, file_path: str) -> str:
    """Apply one diff only when every original line matches exactly.

    Reject file creation, deletion, renames, binary patches, fuzzy offsets
    and patches for multiple files.
    """
    safe_file_path(file_path)
    if len(source.encode("utf-8")) > 131072 or len(diff.encode("utf-8")) > 131072:
        raise ValueError("Source or patch exceeds the 128 KiB patch limit")
    rows = diff.splitlines(keepends=True)
    if rows and rows[0].startswith("diff --git "):
        rows.pop(0)
        if rows and rows[0].startswith("index "):
            rows.pop(0)
    if len(rows) < 3 or not rows[0].startswith("--- ") or not rows[1].startswith("+++ "):
        raise ValueError("Unified diff must include original and updated file headers")
    old_name = rows.pop(0)[4:].rstrip("\r\n").split("\t", 1)[0]
    new_name = rows.pop(0)[4:].rstrip("\r\n").split("\t", 1)[0]
    if old_name not in {file_path, f"a/{file_path}"} or new_name not in {file_path, f"b/{file_path}"}:
        raise ValueError("Patch headers do not match the finding file")
    original = source.splitlines(keepends=True)
    result: list[str] = []
    cursor = index = hunks = 0
    while index < len(rows):
        match = re.fullmatch(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@[^\r\n]*\r?\n?", rows[index])
        if not match:
            raise ValueError("Invalid or additional-file patch hunk")
        old_start, old_count, new_start, new_count = [
            int(value) if value is not None else 1 for value in match.groups()
        ]
        target = old_start - 1 if old_count else old_start
        if target < cursor or target > len(original):
            raise ValueError("Patch hunks overlap or reference an invalid line")
        result.extend(original[cursor:target])
        if new_start != (len(result) + 1 if new_count else len(result)):
            raise ValueError("Updated hunk location is inconsistent")
        old_lines: list[str] = []
        new_lines: list[str] = []
        index += 1
        previous_prefix = ""
        while index < len(rows) and not rows[index].startswith("@@ "):
            row = rows[index]
            if row.rstrip("\r\n") == "\\ No newline at end of file":
                if previous_prefix in {" ", "-"} and old_lines:
                    old_lines[-1] = old_lines[-1].rstrip("\r\n")
                if previous_prefix in {" ", "+"} and new_lines:
                    new_lines[-1] = new_lines[-1].rstrip("\r\n")
                previous_prefix = ""
            elif row and row[0] in {" ", "+", "-"}:
                previous_prefix = row[0]
                if row[0] in {" ", "-"}:
                    old_lines.append(row[1:])
                if row[0] in {" ", "+"}:
                    new_lines.append(row[1:])
            else:
                raise ValueError("Invalid unified diff body")
            index += 1
        if len(old_lines) != old_count or len(new_lines) != new_count:
            raise ValueError("Patch hunk length does not match its header")
        if original[target:target + old_count] != old_lines:
            raise ValueError("Patch context does not match the scanned source")
        result.extend(new_lines)
        cursor = target + old_count
        hunks += 1
    if not hunks:
        raise ValueError("Patch contains no hunks")
    result.extend(original[cursor:])
    content = "".join(result)
    if content == source:
        raise ValueError("Patch does not change the source")
    return content


def validate_source(content: str, file_path: str) -> dict:
    """Parse supported source without importing or executing it."""
    if PurePosixPath(safe_file_path(file_path)).suffix != ".py":
        raise ValueError(
            "Automated draft PRs currently require a Python file; review other patches manually"
        )
    try:
        ast.parse(content, filename=file_path)
    except (SyntaxError, ValueError, RecursionError) as exc:
        raise ValueError("Patched Python source failed syntax validation") from exc
    return {"status": "passed", "checks": ["exact_diff_context", "python_ast"]}


class PatchGenerator:
    def generate(self, vulnerability: dict, ai_analysis: dict) -> dict:
        return {
            "file": vulnerability.get("file"),
            "original_code": vulnerability.get("source_content", vulnerability.get("original_code", "")),
            "patched_code": ai_analysis.get("fix", ""),
            "explanation": ai_analysis.get("analysis", ""),
        }

    def apply_patch(self, file_path: str, patch: dict) -> bool:
        """Write only a validated complete diff; invalid patches leave the file intact."""
        try:
            target = Path(file_path)
            source = target.read_text(encoding="utf-8")
            relative_path = patch.get("file") or target.name
            content = apply_unified_diff(source, patch["patched_code"], relative_path)
            validate_source(content, relative_path)
            target.write_text(content, encoding="utf-8")
            return True
        except (OSError, KeyError, TypeError, ValueError):
            return False
