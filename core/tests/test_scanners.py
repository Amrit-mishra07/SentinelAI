"""Scanner regressions: controlled configs, real parsing, and failure semantics."""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
from unittest.mock import MagicMock, patch
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scanner-core"))
from repo_cloner import RepoCloner, validate_branch, validate_repository_url
from engines.bandit_engine import BanditEngine
from engines.eslint_engine import ESLintEngine
from engines.semgrep_engine import SemgrepEngine
from engines.base import run_scanner
from orchestrator import ScannerOrchestrator


def test_clone_failure_cleans_up():
    cloner = RepoCloner()
    with patch("repo_cloner.subprocess.Popen", return_value=MagicMock(returncode=128)):
        with pytest.raises(RuntimeError, match="Git clone failed"):
            cloner.clone("https://github.com/owner/repo")
    assert cloner.temp_dirs == []


def test_clone_timeout_kills_child_process_group():
    cloner = RepoCloner()
    process = MagicMock(pid=12345)
    process.wait.side_effect = [subprocess.TimeoutExpired("git", 1), 0]
    with patch("repo_cloner.subprocess.Popen", return_value=process), patch("repo_cloner.os.killpg") as terminate:
        with pytest.raises(RuntimeError, match="timed out"):
            cloner.clone("https://github.com/owner/repo")
    terminate.assert_called_once_with(12345, signal.SIGKILL)
    assert not cloner.temp_dirs


@pytest.mark.parametrize("url", ["file:///tmp/repo", "https://github.com.evil/x/y", "https://token@github.com/x/y", "https://github.com/x/y?token=x"])
def test_clone_rejects_untrusted_locations(url):
    with pytest.raises(ValueError):
        validate_repository_url(url)


@pytest.mark.parametrize("branch", ["--upload-pack=x", "../main", "main..x", "x.lock", "x y", "main:evil"])
def test_clone_rejects_unsafe_branch(branch):
    with pytest.raises(ValueError):
        validate_branch(branch)


def test_bandit_engine_preserves_rule_identity(tmp_path):
    (tmp_path / "vuln.py").write_text("password = 'secret'\n")
    output = {"results": [{"filename": str(tmp_path / "vuln.py"), "line_number": 1,
              "issue_text": "Hardcoded password", "issue_severity": "HIGH", "test_id": "B105"}]}
    with patch("engines.bandit_engine.run_scanner", return_value=subprocess.CompletedProcess([], 1, json.dumps(output), "")):
        result = BanditEngine().run(str(tmp_path))
    assert result["status"] == "success"
    assert result["vulnerabilities"][0]["rule_id"] == "B105"
    assert result["vulnerabilities"][0]["severity"] == "high"


def test_engine_process_failure_is_not_clean(tmp_path):
    (tmp_path / "vuln.py").write_text("eval(input())")
    with patch("engines.semgrep_engine.run_scanner", return_value=subprocess.CompletedProcess([], 2, "", "config error")):
        result = SemgrepEngine().run(str(tmp_path))
    assert result["status"] == "failed"
    assert result["error"]


def test_eslint_uses_only_controlled_config(tmp_path):
    (tmp_path / "vuln.js").write_text("eval(input)")
    with patch("engines.eslint_engine.run_scanner", return_value=subprocess.CompletedProcess([], 0, "[]", "")) as call:
        result = ESLintEngine().run(str(tmp_path))
    command = call.call_args.args[0]
    assert "--no-config-lookup" in command
    assert command[0] == "eslint"
    assert "npx" not in command
    assert result["status"] == "success"


def test_no_supported_files_is_not_a_clean_security_assessment(tmp_path):
    (tmp_path / "README.md").write_text("hello")
    result = ScannerOrchestrator().scan(str(tmp_path))
    assert result["status"] == "failed"
    assert all(v["status"] == "skipped" for v in result["engines_results"].values())


def test_required_engine_failure_is_preserved(tmp_path):
    engine = MagicMock(name="engine")
    engine.name = "bandit"
    engine.run.return_value = {"engine": "bandit", "status": "failed", "error": "timeout", "vulnerabilities": []}
    scanner = ScannerOrchestrator()
    scanner.engines = [engine]
    result = scanner.scan(str(tmp_path))
    assert result["status"] == "failed"
    assert result["engines_results"]["bandit"]["error"] == "timeout"


def test_sandbox_missing_fails_closed_without_starting_scanner(tmp_path, monkeypatch):
    monkeypatch.setenv("SCANNER_SANDBOX", "bwrap")
    with patch("engines.base.shutil.which", side_effect=lambda name: None if name == "bwrap" else "/bin/echo"):
        with patch("engines.base.subprocess.Popen") as execute:
            with pytest.raises(RuntimeError, match="sandbox unavailable"):
                run_scanner(["bandit"], str(tmp_path))
            execute.assert_not_called()


@pytest.mark.skipif(not shutil.which("bandit"), reason="Bandit is not installed")
def test_real_bandit_scans_controlled_fixture(tmp_path, monkeypatch):
    monkeypatch.setenv("SCANNER_SANDBOX", "process")
    (tmp_path / "vuln.py").write_text("password = 'a_secret_password'\n")
    result = BanditEngine().run(str(tmp_path))
    assert result["status"] == "success", result
    assert any(f["rule_id"] == "B105" for f in result["vulnerabilities"])


@pytest.mark.skipif(not shutil.which("semgrep"), reason="Semgrep is not installed")
def test_real_semgrep_offline_rules(tmp_path, monkeypatch):
    monkeypatch.setenv("SCANNER_SANDBOX", "process")
    (tmp_path / "vuln.py").write_text("eval(input())\n")
    result = SemgrepEngine().run(str(tmp_path))
    assert result["status"] == "success", result
    assert any(f["rule_id"].endswith("python-eval") for f in result["vulnerabilities"])
