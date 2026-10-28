"""Shared scanner contract and bounded execution for untrusted checkouts."""
from abc import ABC, abstractmethod
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile

EXCLUDED = {".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__"}
CONFIG_DIR = Path(__file__).resolve().parents[1] / "configs"


def has_sources(repository: str, extensions: tuple[str, ...]) -> bool:
    for root, directories, files in os.walk(repository, followlinks=False):
        directories[:] = [d for d in directories if d not in EXCLUDED and not Path(root, d).is_symlink()]
        if any(f.endswith(extensions) and not Path(root, f).is_symlink() for f in files):
            return True
    return False


def run_scanner(command: list[str], repository: str) -> subprocess.CompletedProcess:
    """Fail closed unless sandboxed; process mode is for trusted local fixtures only."""
    repository = str(Path(repository).resolve(strict=True))
    executable = shutil.which(command[0])
    if not executable:
        raise RuntimeError(f"Scanner executable unavailable: {command[0]}")
    command = [executable, *command[1:]]
    environment = {
        "PATH": os.environ.get("SCANNER_PATH", "/usr/local/bin:/usr/bin:/bin"),
        "LANG": "C.UTF-8", "HOME": "/tmp", "PYTHONIOENCODING": "utf-8",
        "SEMGREP_SEND_METRICS": "off", "SEMGREP_ENABLE_VERSION_CHECK": "0",
    }
    mode = os.getenv("SCANNER_SANDBOX", "bwrap")
    if mode == "bwrap":
        sandbox = shutil.which("bwrap")
        if not sandbox:
            raise RuntimeError("Scanner sandbox unavailable; install bubblewrap (no scan was executed)")
        args = [sandbox, "--unshare-all", "--die-with-parent", "--new-session", "--cap-drop", "ALL"]
        for directory in ("/usr", "/bin", "/lib", "/lib64", "/opt/scanners"):
            if Path(directory).exists():
                args.extend(["--ro-bind", directory, directory])
        args.extend(["--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
                     "--ro-bind", repository, "/scan", "--ro-bind", str(CONFIG_DIR), "/config",
                     "--chdir", "/scan", "--clearenv"])
        for key, value in environment.items():
            args.extend(["--setenv", key, value])
        command = [c.replace(repository, "/scan").replace(str(CONFIG_DIR), "/config") for c in command]
        command = [*args, "--", *command]
    elif mode == "container":
        if os.getenv("SCANNER_SERVICE_PROCESS") != "1":
            raise RuntimeError("Container scanning is only enabled in the isolated scanner service")
    elif mode != "process":
        raise RuntimeError("Unknown SCANNER_SANDBOX mode")
    limiter = shutil.which("prlimit")
    if not limiter:
        raise RuntimeError("Scanner resource limiter unavailable; install util-linux")
    command = [limiter, "--as=3221225472", "--fsize=8388608", "--core=0", "--", *command]
    with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
        process = subprocess.Popen(command, cwd=repository, env=environment, stdout=stdout, stderr=stderr,
                                   start_new_session=True)
        try:
            process.wait(timeout=int(os.getenv("SCANNER_TIMEOUT_SECONDS", "300")))
        except subprocess.TimeoutExpired:
            # Kill the complete process group, including scanner child processes.
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            raise
        stdout.seek(0)
        stderr.seek(0)
        return subprocess.CompletedProcess(command, process.returncode,
                                           stdout.read(8 * 1024**2).decode("utf-8", errors="replace"),
                                           stderr.read(8192).decode("utf-8", errors="replace"))


class BaseEngine(ABC):
    name: str

    @abstractmethod
    def run(self, repository: str) -> dict:
        """Return status, findings and an actionable error when execution fails."""

    def failure(self, error: Exception | str) -> dict:
        return {"engine": self.name, "status": "failed", "vulnerabilities": [], "error": str(error)[:2000]}

    def skipped(self) -> dict:
        return {"engine": self.name, "status": "skipped", "vulnerabilities": []}
