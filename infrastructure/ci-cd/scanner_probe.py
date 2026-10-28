"""Verify the production scanner boundary using only controlled fixture source."""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from orchestrator import ScannerOrchestrator

assert os.getuid() == 10001
assert all(not os.getenv(key) for key in ("DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY", "SMTP_PASSWORD", "GITHUB_CLIENT_SECRET"))
os.environ["SCANNER_SANDBOX"] = "container"
os.environ["SCANNER_SERVICE_PROCESS"] = "1"
with TemporaryDirectory() as directory:
    Path(directory, "probe.py").write_text("password = 'fixture_password'\neval(input())\n")
    Path(directory, "probe.js").write_text("eval(userInput);\n")
    result = ScannerOrchestrator().scan(directory)
    outcomes = {name: item["status"] for name, item in result["engines_results"].items()}
    print(json.dumps({"status": result["status"], "engines": outcomes, "findings": len(result["vulnerabilities"])}))
    assert result["status"] == "success", result.get("failures")
    assert all(value == "success" for value in outcomes.values())
    assert result["vulnerabilities"]
