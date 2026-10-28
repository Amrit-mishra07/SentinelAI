import json
from .base import BaseEngine, run_scanner, has_sources, CONFIG_DIR


class SemgrepEngine(BaseEngine):
    name = "semgrep"

    def run(self, repository: str) -> dict:
        if not has_sources(repository, (".py", ".js", ".jsx", ".ts", ".tsx")):
            return self.skipped()
        try:
            result = run_scanner(["semgrep", "scan", "--config", str(CONFIG_DIR / "semgrep.yaml"),
                                  "--metrics=off", "--disable-version-check", "--no-git-ignore",
                                  "--exclude", ".git", "--exclude", "node_modules", "--exclude", ".venv",
                                  "--json", repository], repository)
            if result.returncode not in (0, 1):
                raise RuntimeError(f"Semgrep exited {result.returncode}: {result.stderr[:1000]}")
            output = json.loads(result.stdout)
            if output.get("errors"):
                raise RuntimeError("Semgrep could not analyze one or more source files")
            findings = []
            for finding in output["results"]:
                extra = finding.get("extra", {})
                findings.append({"file": finding["path"], "line": finding.get("start", {}).get("line"),
                                 "issue": extra.get("message", "Security finding"), "severity":
                                 {"ERROR": "high", "WARNING": "medium", "INFO": "low"}.get(extra.get("severity"), "medium"),
                                 "rule_id": finding.get("check_id", "semgrep"), "engine": self.name})
            return {"engine": self.name, "status": "success", "vulnerabilities": findings,
                    "rule_pack": "sentinel-baseline-v1"}
        except Exception as error:
            return self.failure(error)
