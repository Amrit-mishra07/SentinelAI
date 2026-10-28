"""Send bounded source-only archives to the credential-free scanner container."""
import os
from pathlib import Path
import tarfile
import tempfile
import requests

SOURCE_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx"}
EXCLUDED = {".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__"}
MAX_ARCHIVE_BYTES = 64 * 1024**2


def scan_remote(repository: str) -> dict:
    root = Path(repository).resolve(strict=True)
    url = os.environ["SCANNER_SERVICE_URL"].rstrip("/")
    token = os.getenv("SCANNER_SERVICE_TOKEN", "")
    if not token:
        raise ValueError("Scanner service authentication is not configured")
    with tempfile.TemporaryFile() as archive:
        with tarfile.open(fileobj=archive, mode="w") as bundle:
            for directory, directories, files in os.walk(root, followlinks=False):
                directories[:] = [d for d in directories if d not in EXCLUDED and not Path(directory, d).is_symlink()]
                for name in files:
                    path = Path(directory, name)
                    if path.suffix not in SOURCE_EXTENSIONS or path.is_symlink():
                        continue
                    relative = path.relative_to(root).as_posix()
                    info = bundle.gettarinfo(str(path), arcname=relative)
                    if not info.isfile():
                        continue
                    with path.open("rb") as source:
                        bundle.addfile(info, source)
                    if archive.tell() > MAX_ARCHIVE_BYTES:
                        raise ValueError("Source archive exceeds the scanner service limit of 64 MiB")
        size = archive.tell()
        if size > MAX_ARCHIVE_BYTES:
            raise ValueError("Source archive exceeds the scanner service limit of 64 MiB")
        archive.seek(0)
        response = requests.post(url + "/scan", data=archive, headers={
            "Authorization": "Bearer " + token, "Content-Type": "application/x-tar",
            "Content-Length": str(size),
        }, timeout=(5, int(os.getenv("SCANNER_TIMEOUT_SECONDS", "300")) + 30), allow_redirects=False)
    if response.status_code != 200:
        raise RuntimeError(f"Isolated scanner service failed (HTTP {response.status_code})")
    result = response.json()
    if (not isinstance(result, dict) or result.get("status") not in {"success", "failed"}
            or not isinstance(result.get("engines_results"), dict)
            or not isinstance(result.get("vulnerabilities"), list)):
        raise RuntimeError("Isolated scanner service returned an invalid response")
    return result
