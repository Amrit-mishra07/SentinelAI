"""Private scanner entry point; deploy only in the secret-free isolated container."""
import hmac
import os
from pathlib import Path, PurePosixPath
import sys
import tarfile
import tempfile
import threading

from fastapi import FastAPI, HTTPException, Request
from starlette.concurrency import run_in_threadpool

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "core" / "scanner-core"))
from orchestrator import ScannerOrchestrator

app = FastAPI(title="SentinelAI isolated scanner", docs_url=None, redoc_url=None, openapi_url=None)
MAX_BYTES = 64 * 1024**2
GATE = threading.Semaphore(1)


def extract_sources(archive, directory: Path) -> None:
    """Accept only regular source files; never extract tar paths or links blindly."""
    total, count, names = 0, 0, set()
    with tarfile.open(fileobj=archive, mode="r:") as bundle:
        for entry in bundle:
            path = PurePosixPath(entry.name)
            if (path.is_absolute() or any(part in {"", ".", "..", ".git", "node_modules"} for part in path.parts)
                    or "\\" in entry.name or not entry.isfile()
                    or path.suffix not in {".py", ".js", ".jsx", ".ts", ".tsx"} or path.as_posix() in names):
                raise ValueError("Source archive contains an unsafe or unsupported entry")
            names.add(path.as_posix())
            total += entry.size
            count += 1
            if total > MAX_BYTES or count > 10000 or len(entry.name) > 1024 or entry.size < 0:
                raise ValueError("Source archive exceeds the scanner service limits")
            target = directory.joinpath(*path.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            source = bundle.extractfile(entry)
            if source is None:
                raise ValueError("Source archive entry is unreadable")
            with source, target.open("wb") as output:
                remaining = entry.size
                while remaining:
                    chunk = source.read(min(65536, remaining))
                    if not chunk:
                        raise ValueError("Source archive is truncated")
                    output.write(chunk)
                    remaining -= len(chunk)


def analyze(archive) -> dict:
    if not GATE.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="Scanner capacity is busy; retry later")
    try:
        if os.getenv("SCANNER_SERVICE_PROCESS") != "1":
            raise HTTPException(status_code=503, detail="Scanner container mode is not configured")
        with tempfile.TemporaryDirectory(prefix="source_") as directory:
            path = Path(directory)
            try:
                extract_sources(archive, path)
            except (ValueError, tarfile.TarError, OSError) as error:
                raise HTTPException(status_code=422, detail="Invalid or oversized source archive") from error
            result = ScannerOrchestrator().scan(directory)
            for finding in result["vulnerabilities"]:
                candidate = Path(finding["file"])
                if not candidate.is_absolute():
                    candidate = path / candidate
                try:
                    finding["file"] = candidate.resolve().relative_to(path.resolve()).as_posix()
                except ValueError as error:
                    raise HTTPException(status_code=500, detail="Scanner returned an invalid source path") from error
            result["repository"] = "uploaded-snapshot"
            result["isolation"] = "private-container"
            return result
    finally:
        GATE.release()


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@app.post("/scan")
async def scan(request: Request) -> dict:
    secret = os.getenv("SCANNER_SERVICE_TOKEN", "")
    provided = request.headers.get("Authorization", "")
    if not secret or not hmac.compare_digest(provided, "Bearer " + secret):
        raise HTTPException(status_code=403, detail="Scanner authentication failed")
    size = 0
    with tempfile.TemporaryFile() as archive:
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BYTES:
                raise HTTPException(status_code=413, detail="Source archive exceeds 64 MiB")
            archive.write(chunk)
        archive.seek(0)
        return await run_in_threadpool(analyze, archive)
