import json
from .base import BaseEngine, run_scanner, has_sources, CONFIG_DIR


class BanditEngine(BaseEngine):
    name = "bandit"

    def run(self, repository: str) -> dict:
        if not has_sources(repository, (".py",)):
            return self.skipped()
        try:
            result = run_scanner(["bandit", "-r", repository, "-c", str(CONFIG_DIR / "bandit.yaml"),
                                  "--ini", "/dev/null", "-f", "json"], repository)
            if result.returncode not in (0, 1):
                raise RuntimeError(f"Bandit exited {result.returncode}: {result.stderr[:1000]}")
            output = json.loads(result.stdout)
            if output.get("errors"):
                raise RuntimeError("Bandit could not analyze one or more source files")
            findings = [{"file": v["filename"], "line": v.get("line_number"), "issue": v["issue_text"],
                         "severity": v.get("issue_severity", "LOW").lower(), "engine": self.name,
                         "rule_id": v.get("test_id", "bandit"), "confidence": v.get("issue_confidence", "")}
                        for v in output["results"]]
            return {"engine": self.name, "status": "success", "vulnerabilities": findings}
        except Exception as error:
            return self.failure(error)
