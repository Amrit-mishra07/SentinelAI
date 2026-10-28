"""Noninteractive, branch-specific GitHub cloning with cleanup and bounded checkout size."""
import os
from pathlib import Path
import re
import signal
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit


def validate_repository_url(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "github.com" or parsed.query or parsed.fragment:
        raise ValueError("Only canonical HTTPS github.com repository URLs are supported")
    path = parsed.path.rstrip("/")
    if path.endswith(".git"):
        path = path[:-4]
    if not re.fullmatch(r"/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", path) or any(p in (".", "..") for p in path.split("/")[1:]):
        raise ValueError("Repository URL must identify a GitHub owner/repository")
    return "https://github.com" + path


def validate_branch(branch: str) -> str:
    if not branch or branch.startswith(("-", "/")) or len(branch) > 255 or re.search(r"[\s~^:?*\[\\\x00-\x1f]", branch):
        raise ValueError("Invalid Git branch")
    if any(p in ("", ".", "..") or p.startswith(".") or p.endswith((".lock", ".")) for p in branch.split("/")) or ".." in branch or "@{" in branch:
        raise ValueError("Invalid Git branch")
    return branch


class RepoCloner:
    def __init__(self):
        self.temp_dirs: list[str] = []

    def clone(self, repo_url: str, branch: str = "main", token: str | None = None) -> str:
        url = validate_repository_url(repo_url)
        validate_branch(branch)
        temp_dir = tempfile.mkdtemp(prefix="sentinel_scan_")
        self.temp_dirs.append(temp_dir)
        try:
            with tempfile.TemporaryDirectory(prefix="sentinel_git_") as auth_dir:
                env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": auth_dir,
                       "GIT_TERMINAL_PROMPT": "0", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
                       "LANG": "C.UTF-8"}
                if token:
                    askpass = Path(auth_dir, "askpass")
                    askpass.write_text('#!/bin/sh\ncase "$1" in *Username*) printf "%s" "x-access-token";; *) printf "%s" "$SENTINEL_GIT_TOKEN";; esac\n')
                    askpass.chmod(0o700)
                    env.update(GIT_ASKPASS=str(askpass), SENTINEL_GIT_TOKEN=token)
                command = (
                    ["git", "-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=never",
                     "-c", "protocol.ext.allow=never", "-c", "http.followRedirects=false",
                     "clone", "--depth", "1", "--single-branch", "--branch", branch,
                     "--no-recurse-submodules", "--", url, temp_dir]
                )
                with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
                    process = subprocess.Popen(command, stdout=stdout, stderr=stderr,
                                               env=env, start_new_session=True)
                    try:
                        process.wait(timeout=int(os.getenv("CLONE_TIMEOUT_SECONDS", "120")))
                    except subprocess.TimeoutExpired as error:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
                        raise RuntimeError("Git clone timed out; check network access and repository size") from error
                    if process.returncode != 0:
                        raise RuntimeError("Git clone failed; check repository access and branch")
            total = 0
            for root, directories, names in os.walk(temp_dir, followlinks=False):
                for name in directories[:]:
                    candidate = Path(root, name)
                    if candidate.is_symlink():
                        candidate.unlink()
                        directories.remove(name)
                for name in names:
                    candidate = Path(root, name)
                    if candidate.is_symlink():
                        candidate.unlink()
                    else:
                        total += candidate.stat().st_size
                if total > 500 * 1024**2:
                    raise RuntimeError("Repository checkout exceeds 500 MiB")
            return temp_dir
        except Exception:
            self.cleanup_dir(temp_dir)
            raise

    def commit_hash(self, directory: str) -> str:
        result = subprocess.run(["git", "-C", directory, "rev-parse", "HEAD"], check=True,
                                capture_output=True, text=True, timeout=10,
                                env={"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null"})
        sha = result.stdout.strip()
        if not re.fullmatch(r"[0-9a-f]{40}", sha):
            raise RuntimeError("Git returned an invalid commit SHA")
        return sha

    def cleanup_dir(self, directory: str) -> None:
        if directory in self.temp_dirs:
            shutil.rmtree(directory, ignore_errors=True)
            self.temp_dirs.remove(directory)

    def cleanup_all(self) -> None:
        for directory in self.temp_dirs[:]:
            self.cleanup_dir(directory)
