"""Private scanner transport rejects archive traversal and never uploads credentials."""
import io
import importlib
from pathlib import Path
import sys
import tarfile
from unittest.mock import MagicMock, patch
import pytest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/aipcsr-worker"))
sys.path.insert(0, str(ROOT / "core/scanner-core"))
from scanner_service import extract_sources
from remote import scan_remote


def archive(entries):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w") as bundle:
        for name, content, kind in entries:
            info = tarfile.TarInfo(name)
            info.type = kind
            info.size = len(content)
            bundle.addfile(info, io.BytesIO(content))
    stream.seek(0)
    return stream


@pytest.mark.parametrize("name,kind", [
    ("../escape.py", tarfile.REGTYPE), ("/escape.py", tarfile.REGTYPE),
    (".git/config.py", tarfile.REGTYPE), ("link.py", tarfile.SYMTYPE),
    ("credentials.env", tarfile.REGTYPE), ("path\\escape.py", tarfile.REGTYPE),
])
def test_unsafe_archives_rejected(tmp_path, name, kind):
    with pytest.raises(ValueError):
        extract_sources(archive([(name, b"secret", kind)]), tmp_path)


def test_only_regular_supported_source_files_extracted(tmp_path):
    extract_sources(archive([("src/code.py", b"print('safe')", tarfile.REGTYPE)]), tmp_path)
    assert (tmp_path / "src/code.py").read_bytes() == b"print('safe')"


def test_remote_upload_excludes_credentials_and_symlinks(tmp_path, monkeypatch):
    monkeypatch.setenv("SCANNER_SERVICE_URL", "http://scanner:9000")
    monkeypatch.setenv("SCANNER_SERVICE_TOKEN", "private-scanner-token")
    (tmp_path / "source.py").write_text("print('safe')")
    (tmp_path / ".env").write_text("TOKEN=not-for-scanner")
    (tmp_path / "link.py").symlink_to(tmp_path / ".env")
    response = MagicMock(status_code=200)
    response.json.return_value = {"status": "success", "engines_results": {}, "vulnerabilities": []}
    def receive(url, **kwargs):
        assert url == "http://scanner:9000/scan"
        assert kwargs["allow_redirects"] is False
        assert kwargs["headers"]["Authorization"] == "Bearer private-scanner-token"
        with tarfile.open(fileobj=kwargs["data"], mode="r:") as bundle:
            assert bundle.getnames() == ["source.py"]
        return response
    with patch("remote.requests.post", side_effect=receive):
        assert scan_remote(str(tmp_path))["status"] == "success"


def test_remote_failure_never_becomes_clean_result(tmp_path, monkeypatch):
    monkeypatch.setenv("SCANNER_SERVICE_URL", "http://scanner:9000")
    monkeypatch.setenv("SCANNER_SERVICE_TOKEN", "private")
    with patch("remote.requests.post", return_value=MagicMock(status_code=503)):
        with pytest.raises(RuntimeError, match="HTTP 503"):
            scan_remote(str(tmp_path))
