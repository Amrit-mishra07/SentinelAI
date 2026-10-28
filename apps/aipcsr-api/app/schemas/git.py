"""Validate repository locations and Git refs before they reach a worker."""

import re
from urllib.parse import urlsplit


def validate_branch(value: str) -> str:
    """Accept a branch name without Git's invalid or option-like ref syntax."""
    if not value or len(value) > 255 or value != value.strip():
        raise ValueError("Branch must be a non-empty Git branch name")
    if (value == "@" or value.startswith(("-", "/", "."))
            or value.endswith(("/", ".")) or ".." in value or "//" in value
            or "@{" in value or re.search(r"[\x00-\x20\x7f~^:?*\[\\]", value)
            or any(part.startswith(".") or part.endswith(".lock") for part in value.split("/"))):
        raise ValueError("Invalid Git branch name")
    return value


def normalize_github_url(value: str) -> str:
    """Only permit an HTTPS github.com owner/repository URL without credentials."""
    parsed = urlsplit(value.strip())
    if (parsed.scheme != "https" or parsed.netloc != "github.com"
            or parsed.query or parsed.fragment):
        raise ValueError("Use an HTTPS GitHub repository URL: https://github.com/owner/repo")
    parts = parsed.path.strip("/").split("/")
    if len(parts) != 2:
        raise ValueError("Repository URL must contain an owner and repository")
    owner, repository = parts
    if repository.endswith(".git"):
        repository = repository[:-4]
    if (not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", owner)
            or not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", repository)
            or repository in {".", ".."}):
        raise ValueError("Invalid GitHub owner or repository name")
    return f"https://github.com/{owner}/{repository}"
